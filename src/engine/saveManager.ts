import { ACHIEVEMENTS } from '../data/achievements';
import type { AchievementDef, GameSettings, LevelProgress, SaveData } from '../types/game';

const STORAGE_KEY = 'you_just_lost_save_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.35,
  sfxVolume: 0.75,
  muted: false,
  vibration: true,
  touchControls: 'auto',
  controlSensitivity: 1.0,
  unlockAllLevels: false,
};

export function createDefaultSaveData(): SaveData {
  return {
    version: 1,
    currentLevelId: 1,
    highestUnlockedLevelId: 1,
    totalDeaths: 0,
    totalPlaytimeSeconds: 0,
    tricksTriggered: 0,
    fakeRewardsGrabbed: 0,
    fourthWallTriggered: false,
    levels: {},
    unlockedAchievements: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSaveData();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const base = createDefaultSaveData();
    return {
      ...base,
      ...parsed,
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
      },
      levels: parsed.levels && typeof parsed.levels === 'object' ? parsed.levels : {},
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],
    };
  } catch {
    return createDefaultSaveData();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota or private-mode errors safely
  }
}

export function resetSaveData(preserveSettings = true): SaveData {
  const current = loadSaveData();
  const fresh = createDefaultSaveData();
  if (preserveSettings) {
    fresh.settings = { ...current.settings, unlockAllLevels: false };
  }
  persistSaveData(fresh);
  return fresh;
}

export function getLevelProgress(save: SaveData, levelId: number): LevelProgress {
  return (
    save.levels[levelId] ?? {
      completed: false,
      bestTimeMs: null,
      deaths: 0,
      zeroJumpCompleted: false,
      zeroDeathCompleted: false,
      usedHint: null,
    }
  );
}

export function evaluateAchievements(save: SaveData): AchievementDef[] {
  const newlyUnlocked: AchievementDef[] = [];
  const has = (id: string) => save.unlockedAchievements.includes(id);

  const unlock = (id: string) => {
    if (!has(id)) {
      save.unlockedAchievements.push(id);
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) newlyUnlocked.push(def);
    }
  };

  if (save.totalDeaths >= 1) unlock('first_blood');
  if (save.tricksTriggered >= 5) unlock('trust_nobody');
  if (save.totalDeaths >= 25) unlock('persistent');
  if (save.fakeRewardsGrabbed >= 3) unlock('gullible');
  if (save.fourthWallTriggered) unlock('staring_contest');

  const allLevels = Object.values(save.levels);
  if (allLevels.some((l) => l.zeroJumpCompleted)) unlock('unimpressed');
  if (allLevels.some((l) => l.zeroDeathCompleted)) unlock('flawless');
  if (allLevels.some((l) => l.bestTimeMs !== null && l.bestTimeMs < 7000)) unlock('speed_demon');

  // Check if any full chapter (5 levels) is completed across all 20 chapters
  for (let ch = 0; ch < 20; ch++) {
    let allFive = true;
    for (let offset = 1; offset <= 5; offset++) {
      if (!save.levels[ch * 5 + offset]?.completed) {
        allFive = false;
        break;
      }
    }
    if (allFive) {
      unlock('survivor');
      break;
    }
  }

  if (save.levels[99]?.completed) {
    unlock('ultimate_test');
  }

  if (save.levels[100]?.completed) {
    unlock('impossible');
  }

  return newlyUnlocked;
}

export function formatTimeMs(ms: number): string {
  const totalSec = ms / 1000;
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  const tenths = Math.floor((ms % 1000) / 100);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${secs}.${tenths}s`;
}

export function formatPlaytime(totalSeconds: number): string {
  const s = Math.floor(totalSeconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
