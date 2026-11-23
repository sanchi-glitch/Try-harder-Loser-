/**
 * Phase 0 Security TDD Specification — Dirty Dozen Payloads
 *
 * Verifies that all 12 adversarial payloads targeting /users and /leaderboards
 * are structurally rejected by firestore.rules (returning PERMISSION_DENIED
 * when evaluated against the Firestore Rules Emulator).
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  query?: { limit?: number; whereBestTimeMin?: number };
  expected: 'PERMISSION_DENIED';
  mitigatingRule: string;
}

export const DIRTY_DOZEN_TESTS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Score Injection',
    operation: 'create',
    path: '/leaderboards/level_100/entries/attacker',
    auth: null,
    payload: {
      userId: 'attacker',
      playerName: 'AnonCheater',
      levelId: 100,
      bestTimeMs: 5000,
      deaths: 0,
      jumps: 10,
      zeroDeath: true,
    },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: 'isVerifiedUser() requires request.auth != null',
  },
  {
    id: 2,
    name: 'Unverified Email Write',
    operation: 'create',
    path: '/leaderboards/level_99/entries/uid_unverified',
    auth: { uid: 'uid_unverified', email_verified: false },
    payload: {
      userId: 'uid_unverified',
      playerName: 'UnverifiedOne',
      levelId: 99,
      bestTimeMs: 12000,
      deaths: 2,
      jumps: 14,
      zeroDeath: false,
    },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: 'isVerifiedUser() requires request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'Identity Spoofing on Entry Write',
    operation: 'create',
    path: '/leaderboards/level_99/entries/uid_victim',
    auth: { uid: 'uid_attacker', email_verified: true },
    payload: {
      userId: 'uid_victim',
      playerName: 'Spoofed',
      levelId: 99,
      bestTimeMs: 5000,
      deaths: 0,
      jumps: 5,
      zeroDeath: true,
    },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: 'userId == request.auth.uid && data.userId == request.auth.uid',
  },
  {
    id: 4,
    name: 'Shadow Field Injection (Ghost Field)',
    operation: 'create',
    path: '/leaderboards/level_50/entries/uid_a',
    auth: { uid: 'uid_a', email_verified: true },
    payload: {
      userId: 'uid_a',
      playerName: 'ShadowRunner',
      levelId: 50,
      bestTimeMs: 9500,
      deaths: 1,
      jumps: 12,
      zeroDeath: false,
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: 'data.keys().hasOnly([...]) rejects unknown ghost fields',
  },
  {
    id: 5,
    name: 'Invalid Document ID Poisoning',
    operation: 'create',
    path: '/leaderboards/level_999/entries/uid_a',
    auth: { uid: 'uid_a', email_verified: true },
    payload: {
      userId: 'uid_a',
      playerName: 'Poisoner',
      levelId: 999,
      bestTimeMs: 6000,
      deaths: 0,
      jumps: 1,
      zeroDeath: true,
    },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: 'isValidLevelKey(levelKey) enforces level_1..level_100',
  },
  {
    id: 6,
    name: 'Level Key vs Payload LevelId Mismatch',
    operation: 'create',
    path: '/leaderboards/level_100/entries/uid_a',
    auth: { uid: 'uid_a', email_verified: true },
    payload: {
      userId: 'uid_a',
      playerName: 'FakePeak',
      levelId: 1,
      bestTimeMs: 3200,
      deaths: 0,
      jumps: 2,
      zeroDeath: true,
    },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: "levelKey == 'level_' + string(data.levelId)",
  },
  {
    id: 7,
    name: 'Impossible / Negative Time Poisoning',
    operation: 'create',
    path: '/leaderboards/level_100/entries/uid_a',
    auth: { uid: 'uid_a', email_verified: true },
    payload: {
      userId: 'uid_a',
      playerName: 'SpeedHacker',
      levelId: 100,
      bestTimeMs: 12,
      deaths: 0,
      jumps: 0,
      zeroDeath: true,
    },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: 'data.bestTimeMs is int && data.bestTimeMs >= 500 && data.bestTimeMs <= 36000000',
  },
  {
    id: 8,
    name: 'Orphaned Entry Without Parent Leaderboard Bucket',
    operation: 'create',
    path: '/leaderboards/level_75/entries/uid_a',
    auth: { uid: 'uid_a', email_verified: true },
    payload: {
      userId: 'uid_a',
      playerName: 'OrphanWrite',
      levelId: 75,
      bestTimeMs: 18500,
      deaths: 4,
      jumps: 22,
      zeroDeath: false,
    },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: 'existsAfter(/databases/$(database)/documents/leaderboards/$(levelKey))',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    operation: 'create',
    path: '/leaderboards/level_10/entries/uid_a',
    auth: { uid: 'uid_a', email_verified: true },
    payload: {
      userId: 'uid_a',
      playerName: 'TimeTraveler',
      levelId: 10,
      bestTimeMs: 7400,
      deaths: 0,
      jumps: 9,
      zeroDeath: true,
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: 'incoming().createdAt == request.time && incoming().updatedAt == request.time',
  },
  {
    id: 10,
    name: 'Immutable Field Tampering on Update',
    operation: 'update',
    path: '/leaderboards/level_10/entries/uid_a',
    auth: { uid: 'uid_a', email_verified: true },
    payload: {
      userId: 'uid_a',
      playerName: 'Tamper',
      levelId: 99,
      bestTimeMs: 5500,
      deaths: 0,
      jumps: 8,
      zeroDeath: true,
    },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: 'affectedKeys().hasOnly(...) && incoming().levelId == existing().levelId',
  },
  {
    id: 11,
    name: 'Email / PII or Oversized String in playerName',
    operation: 'create',
    path: '/users/uid_a',
    auth: { uid: 'uid_a', email_verified: true },
    payload: {
      userId: 'uid_a',
      playerName: 'victim@example.com',
    },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: "data.playerName.matches('^[a-zA-Z0-9 _\\-.!]+$') && data.playerName.size() <= 28",
  },
  {
    id: 12,
    name: 'Cross-User Profile Snooping & Unbounded List Scrape',
    operation: 'get',
    path: '/users/uid_b',
    auth: { uid: 'uid_a', email_verified: true },
    expected: 'PERMISSION_DENIED',
    mitigatingRule: 'users get requires userId == request.auth.uid; entries list requires limit <= 50',
  },
];
