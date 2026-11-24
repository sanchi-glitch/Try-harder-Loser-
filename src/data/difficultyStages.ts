export type DifficultyStageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface DifficultyStageMeta {
  id: DifficultyStageId;
  minLevel: number;
  maxLevel: number;
  name: string;
  difficulty: string;
  commentaryStyle: string;
}

/**
 * The 10 Difficulty Stages + Level 99 (The Ultimate Test) + Level 100 (The Last Level).
 * Single source of truth used across Level Select, HUD, Commentary, and Level Progression.
 */
export const DIFFICULTY_STAGES: readonly DifficultyStageMeta[] = [
  {
    id: 1,
    minLevel: 1,
    maxLevel: 10,
    name: 'The Beginning',
    difficulty: 'Easy, deceptive',
    commentaryStyle: 'Mocking',
  },
  {
    id: 2,
    minLevel: 11,
    maxLevel: 20,
    name: 'The Trap',
    difficulty: 'Easy–Medium',
    commentaryStyle: 'Sarcastic',
  },
  {
    id: 3,
    minLevel: 21,
    maxLevel: 30,
    name: 'The Deception',
    difficulty: 'Medium',
    commentaryStyle: 'Insulting',
  },
  {
    id: 4,
    minLevel: 31,
    maxLevel: 40,
    name: 'The Betrayal',
    difficulty: 'Medium–Hard',
    commentaryStyle: 'Brutal',
  },
  {
    id: 5,
    minLevel: 41,
    maxLevel: 50,
    name: 'The Frustration',
    difficulty: 'Hard',
    commentaryStyle: 'Cruel',
  },
  {
    id: 6,
    minLevel: 51,
    maxLevel: 60,
    name: 'The Torture',
    difficulty: 'Very Hard',
    commentaryStyle: 'Ruthless',
  },
  {
    id: 7,
    minLevel: 61,
    maxLevel: 70,
    name: 'Psychological Warfare',
    difficulty: 'Extreme',
    commentaryStyle: 'Psychological Mockery',
  },
  {
    id: 8,
    minLevel: 71,
    maxLevel: 80,
    name: 'The Nightmare',
    difficulty: 'Very Extreme',
    commentaryStyle: 'Merciless',
  },
  {
    id: 9,
    minLevel: 81,
    maxLevel: 90,
    name: 'The Impossible',
    difficulty: 'Brutal',
    commentaryStyle: 'Maximum Cruelty',
  },
  {
    id: 10,
    minLevel: 91,
    maxLevel: 98,
    name: 'The Final Descent',
    difficulty: 'Nearly Unbearable',
    commentaryStyle: 'Final Descent',
  },
  {
    id: 11,
    minLevel: 99,
    maxLevel: 99,
    name: 'The Ultimate Test',
    difficulty: 'Extremely Difficult',
    commentaryStyle: 'Level 99',
  },
  {
    id: 12,
    minLevel: 100,
    maxLevel: 100,
    name: 'The Last Level',
    difficulty: 'Rare to Complete',
    commentaryStyle: 'Level 100',
  },
] as const;

export function getDifficultyStage(levelId: number): DifficultyStageMeta {
  const clamped = Math.max(1, Math.min(100, Math.floor(levelId || 1)));
  return (
    DIFFICULTY_STAGES.find((s) => clamped >= s.minLevel && clamped <= s.maxLevel) ??
    DIFFICULTY_STAGES[0]
  );
}
