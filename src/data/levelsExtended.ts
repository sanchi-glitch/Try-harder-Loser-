import type { LevelDef } from '../types/game';
import { LEVELS_31_TO_65 } from './levels31to65';
import { LEVELS_66_TO_100 } from './levels66to100';

export const EXTENDED_CHAPTERS = [
  { id: 7, title: 'The Betrayal', subtitle: 'Medium–Hard. Bluff bridges, watching eyes, bricked doors, and 3-door lies.' },
  { id: 8, title: 'The Betrayal II', subtitle: 'Ceiling gravity flips, shy ledges, timed locks, and camera shifts.' },
  { id: 9, title: 'The Frustration', subtitle: 'Hard. Switch-order puzzles, halfway fake exits, and icy ceilings.' },
  { id: 10, title: 'The Frustration II', subtitle: 'Halfway gauntlet. Rising blade exits, crosswinds, and the final hint.' },
  { id: 11, title: 'The Torture', subtitle: 'Very Hard. Zero hints from here on. Survive on your own.' },
  { id: 12, title: 'The Torture II', subtitle: 'Mirror-brain eye bridges, closing vaults, heavy leaps, and 4-door roulette.' },
  { id: 13, title: 'Psychological Warfare', subtitle: 'Extreme. Disappearing exit floors, camera whiplash, and ceiling chasers.' },
  { id: 14, title: 'Psychological Warfare II', subtitle: 'Pitch-black roulette, haunted lifts, and checkpoint-triggered storms.' },
  { id: 15, title: 'The Nightmare', subtitle: 'Very Extreme. Multi-mechanic chaos, shifting stones, and locked arenas.' },
  { id: 16, title: 'The Nightmare II', subtitle: 'Quarter-second blinks, double ceilings, blind camera shifts, and twin hidden acts.' },
  { id: 17, title: 'The Impossible', subtitle: 'Brutal. 3-switch trap houses, tracking ferries, and 15-second crucibles.' },
  { id: 18, title: 'The Impossible II', subtitle: 'Inverted storms, blind chasers, heavy steel, and the triple-betrayal gate.' },
  { id: 19, title: 'The Final Descent', subtitle: 'Nearly Unbearable. Five ruthless gatekeepers guard the peak.' },
  { id: 20, title: 'The Final Descent · Peak', subtitle: '96–98 break your nerve. 99 is The Ultimate Test. 100 is The Last Level.' },
] as const;

export const EXTENDED_LEVELS: LevelDef[] = [
  ...LEVELS_31_TO_65,
  ...LEVELS_66_TO_100,
];
