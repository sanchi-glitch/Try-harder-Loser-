import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { getLevelById } from '../data/levels';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

// Verbatim schema constraints synchronized with firebase-blueprint.json & firestore.rules
export const PLAYER_NAME_MIN_LENGTH = 2;
export const PLAYER_NAME_MAX_LENGTH = 28;
export const PLAYER_NAME_PATTERN = /^[a-zA-Z0-9 _\-.!]+$/;
export const LEVEL_NAME_MAX_LENGTH = 80;
export const MIN_CLEAR_TIME_MS = 500;
export const MAX_CLEAR_TIME_MS = 36_000_000;
export const MAX_STAT_COUNT = 100_000;
export const LEADERBOARD_QUERY_LIMIT = 25;

export interface LeaderboardEntryRecord {
  userId: string;
  playerName: string;
  levelId: number;
  bestTimeMs: number;
  deaths: number;
  jumps: number;
  zeroDeath: boolean;
  updatedAtMs: number | null;
}

export interface SubmitScoreResult {
  status: 'submitted' | 'existing_faster' | 'unauthenticated' | 'invalid';
  bestTimeMs?: number;
}

export function getLevelBucketKey(levelId: number): string {
  const clamped = Math.min(100, Math.max(1, Math.round(levelId)));
  return `level_${clamped}`;
}

/**
 * Sanitizes a user handle so it strictly matches firebase-blueprint.json
 * (2..28 chars, /^[a-zA-Z0-9 _\-.!]+$/) and never leaks an email address.
 */
export function sanitizePlayerName(raw: string | null | undefined, uid: string): string {
  const fallback = `Stickman-${uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'Runner'}`;
  if (!raw) return fallback;

  // Strip domain part if input looks like an email address to preserve PII isolation
  const beforeAt = raw.includes('@') ? raw.split('@')[0] : raw;
  const cleaned = beforeAt
    .replace(/[^a-zA-Z0-9 _\-.!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PLAYER_NAME_MAX_LENGTH);

  if (cleaned.length < PLAYER_NAME_MIN_LENGTH || !PLAYER_NAME_PATTERN.test(cleaned)) {
    return fallback;
  }
  return cleaned;
}

export function validatePlayerNameInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < PLAYER_NAME_MIN_LENGTH) {
    return `Handle must be at least ${PLAYER_NAME_MIN_LENGTH} characters.`;
  }
  if (trimmed.length > PLAYER_NAME_MAX_LENGTH) {
    return `Handle must be at most ${PLAYER_NAME_MAX_LENGTH} characters.`;
  }
  if (trimmed.includes('@') || !PLAYER_NAME_PATTERN.test(trimmed)) {
    return 'Use only letters, numbers, spaces, _, -, ., or ! (no emails).';
  }
  return null;
}

export async function loadOrCreateUserHandle(user: User): Promise<string> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const existingName = snap.data().playerName;
      if (typeof existingName === 'string' && PLAYER_NAME_PATTERN.test(existingName)) {
        return existingName;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const defaultHandle = sanitizePlayerName(user.displayName, user.uid);
  if (!user.emailVerified) {
    return defaultHandle;
  }

  try {
    await setDoc(ref, {
      userId: user.uid,
      playerName: defaultHandle,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return defaultHandle;
}

export async function updateUserHandle(user: User, nextNameRaw: string): Promise<string> {
  const validationError = validatePlayerNameInput(nextNameRaw);
  if (validationError) {
    throw new Error(validationError);
  }
  const cleanName = nextNameRaw.trim().slice(0, PLAYER_NAME_MAX_LENGTH);
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        playerName: cleanName,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId: user.uid,
        playerName: cleanName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return cleanName;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function submitLevelClearTime(params: {
  levelId: number;
  elapsedMs: number;
  deaths: number;
  jumps: number;
  playerName: string;
}): Promise<SubmitScoreResult> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return { status: 'unauthenticated' };
  }

  const levelId = Math.round(params.levelId);
  if (levelId < 1 || levelId > 100) {
    return { status: 'invalid' };
  }

  const bestTimeMs = Math.min(
    MAX_CLEAR_TIME_MS,
    Math.max(MIN_CLEAR_TIME_MS, Math.round(params.elapsedMs)),
  );
  const deaths = Math.min(MAX_STAT_COUNT, Math.max(0, Math.round(params.deaths)));
  const jumps = Math.min(MAX_STAT_COUNT, Math.max(0, Math.round(params.jumps)));
  const zeroDeath = deaths === 0;
  const safePlayerName = sanitizePlayerName(params.playerName || user.displayName, user.uid);
  const levelDef = getLevelById(levelId);
  const safeLevelName = levelDef.name.trim().slice(0, LEVEL_NAME_MAX_LENGTH) || `Level ${levelId}`;

  const levelKey = getLevelBucketKey(levelId);
  const bucketPath = `leaderboards/${levelKey}`;
  const entryPath = `leaderboards/${levelKey}/entries/${user.uid}`;
  const bucketRef = doc(db, 'leaderboards', levelKey);
  const entryRef = doc(db, 'leaderboards', levelKey, 'entries', user.uid);

  let bucketExists = false;
  let existingEntryBestMs: number | null = null;

  try {
    const [bucketSnap, entrySnap] = await Promise.all([getDoc(bucketRef), getDoc(entryRef)]);
    bucketExists = bucketSnap.exists();
    if (entrySnap.exists()) {
      const prevBest = entrySnap.data().bestTimeMs;
      if (typeof prevBest === 'number') {
        existingEntryBestMs = prevBest;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, entryPath);
  }

  if (existingEntryBestMs !== null && existingEntryBestMs < bestTimeMs) {
    return { status: 'existing_faster', bestTimeMs: existingEntryBestMs };
  }

  try {
    const batch = writeBatch(db);

    if (!bucketExists) {
      batch.set(bucketRef, {
        levelId,
        levelName: safeLevelName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(bucketRef, {
        updatedAt: serverTimestamp(),
      });
    }

    if (existingEntryBestMs === null) {
      batch.set(entryRef, {
        userId: user.uid,
        playerName: safePlayerName,
        levelId,
        bestTimeMs,
        deaths,
        jumps,
        zeroDeath,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(entryRef, {
        playerName: safePlayerName,
        bestTimeMs,
        deaths,
        jumps,
        zeroDeath,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return { status: 'submitted', bestTimeMs };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${bucketPath} & ${entryPath}`);
  }
}

export function subscribeToLevelLeaderboard(
  levelId: number,
  onEntries: (entries: LeaderboardEntryRecord[]) => void,
  onError: (err: Error) => void,
): () => void {
  const levelKey = getLevelBucketKey(levelId);
  const path = `leaderboards/${levelKey}/entries`;
  const entriesRef = collection(db, 'leaderboards', levelKey, 'entries');
  const q = query(
    entriesRef,
    where('bestTimeMs', '>=', MIN_CLEAR_TIME_MS),
    orderBy('bestTimeMs', 'asc'),
    limit(LEADERBOARD_QUERY_LIMIT),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: LeaderboardEntryRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const ts = d.updatedAt as Timestamp | undefined;
        return {
          userId: String(d.userId ?? docSnap.id),
          playerName: String(d.playerName ?? 'Runner'),
          levelId: Number(d.levelId ?? levelId),
          bestTimeMs: Number(d.bestTimeMs ?? 0),
          deaths: Number(d.deaths ?? 0),
          jumps: Number(d.jumps ?? 0),
          zeroDeath: Boolean(d.zeroDeath),
          updatedAtMs: ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null,
        };
      });
      onEntries(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}
