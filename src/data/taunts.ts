import { getCrueltyTier } from './deathMessages';

// Tier 1 (Lv 1-10): Smug & Sarcastic
const TAUNTS_TIER_1: readonly string[] = [
  'Try harder, Loser! Literally the title of the game.',
  'Interesting strategy. Completely wrong, idiot.',
  'The floor sends its regards.',
  'You trusted that? Adorable.',
  'Another attempt? I admire your misplaced confidence.',
  'I would explain what happened, but you were right there.',
  'Bold of you to assume the level wanted you alive.',
  'Gravity remains undefeated.',
  'Have you considered not touching the sharp red things?',
  'Plot twist: the level is actively against you.',
  'Good news: respawns are still free.',
  'You fell for the oldest trick in this room.',
  'Almost! (Not even remotely close, though.)',
  'The bright red triangles are not decorative.',
];

// Tier 2 (Lv 11-30): Condescending & Biting
const TAUNTS_TIER_2: readonly string[] = [
  'Try harder, Loser! Maybe open your eyes this time.',
  'Statistically speaking, you are learning at glacial speed.',
  'If at first you fail, repeat the exact same mistake like a pro.',
  'A masterclass in confidence without skill.',
  'Main-character ego, background-extra survival.',
  'Your muscle memory is actively sabotaging you.',
  'Nine out of ten stickmen refuse to be controlled by you.',
  'Confidence: 100%. Survival: 0%.',
  'Timing is everything. You have none.',
  'You brought a stickman to a buzzsaw fight.',
  'Your reflexes appear to be permanently buffering.',
  'That jump had hopes, dreams, and zero physics.',
];

// Tier 3 (Lv 31-60): Brutal Roasting
const TAUNTS_TIER_3: readonly string[] = [
  'Just close the tab, idiot. Save yourself the shame.',
  'Congratulations, you invented a brand-new way to embarrass yourself.',
  'Walking directly into danger: your signature move.',
  'Do not worry, nobody saw that. Except the entire game.',
  'If stubbornness were a skill, you wouldn’t be dying this much.',
  'The trap barely even had to try, idiot.',
  'Retry button is filing for overtime pay today.',
  'Every jump you make is a crime against basic timing.',
  'Your thumbs are begging you to play something easier.',
  'Zero timing. Zero awareness. 100% idiot.',
];

// Tier 4 (Lv 61-89): Ice-Cold Cruelty
const TAUNTS_TIER_4: readonly string[] = [
  'You are NEVER seeing Level 99, let alone 100, idiot.',
  'Every death proves this game was right to name itself after you.',
  'Still clicking retry? Delusion is a powerful drug.',
  'Pack it up. These levels are miles out of your league.',
  'Your stickman wishes literally anyone else had the controls.',
  'Give up already. Even the spikes are bored of you.',
  'All those deaths and your reflexes still haven’t arrived.',
  'Pure comedy. Keep feeding the death counter, idiot.',
  'The higher you climb, the funnier it is when you collapse.',
];

// Tier 5 (Lv 90-98): Gatekeeper Savagery
const TAUNTS_TIER_5: readonly string[] = [
  'THE 90s EAT PLAYERS LIKE YOU ALIVE, IDIOT.',
  'Hands shaking yet? Good. You don’t belong up here.',
  'One pixel off. Welcome to endgame suffering.',
  'Quit now and salvage whatever fragments of ego remain.',
  'Thought surviving 89 levels made you good? Laughable.',
  'Every blade here has your name carved on it, idiot.',
];

const TAUNTS_LEVEL_99: readonly string[] = [
  'LEVEL 99: ONE step from 100... and you STILL choked, idiot.',
  '99% of the way there and 100% humiliated.',
  'Almost does NOT unlock Level 100. Try harder, Loser!',
  'So close to greatness, yet somehow still kissing spikes.',
  'Level 99 is where ego goes to die. Again.',
];

const TAUNTS_LEVEL_100: readonly string[] = [
  'LEVEL 100: ZERO CHECKPOINTS. BACK TO PIXEL ONE, LOSER!',
  'Literally nobody crosses Level 100. Especially not you.',
  'Try harder, Loser! And again. Until the sun burns out.',
  'You really thought YOU were that rare moment? Back to start.',
  'Level 100 owns your soul. Close the game while you can.',
  'No mercy. No checkpoint. No chance. Try harder, Loser!',
  '0.0001% odds — and you just proved why.',
];

// Full combined export (65+ unique taunts)
export const DEATH_TAUNTS: readonly string[] = [
  ...TAUNTS_TIER_1,
  ...TAUNTS_TIER_2,
  ...TAUNTS_TIER_3,
  ...TAUNTS_TIER_4,
  ...TAUNTS_TIER_5,
  ...TAUNTS_LEVEL_99,
  ...TAUNTS_LEVEL_100,
];

function getPoolForLevel(levelId?: number): readonly string[] {
  if (!levelId) return DEATH_TAUNTS;
  if (levelId === 100) {
    return Math.random() < 0.85 ? TAUNTS_LEVEL_100 : TAUNTS_TIER_5;
  }
  if (levelId === 99) {
    return Math.random() < 0.82 ? TAUNTS_LEVEL_99 : TAUNTS_TIER_5;
  }
  const tier = getCrueltyTier(levelId);
  if (tier === 5) return TAUNTS_TIER_5;
  if (tier === 4) return TAUNTS_TIER_4;
  if (tier === 3) return TAUNTS_TIER_3;
  if (tier === 2) return TAUNTS_TIER_2;
  return TAUNTS_TIER_1;
}

export function getRandomDeathTaunt(previousTaunt?: string | null, levelId?: number): string {
  const pool = getPoolForLevel(levelId);
  if (pool.length === 0) {
    return 'Try harder, Loser!';
  }
  if (pool.length === 1) {
    return pool[0];
  }
  let candidate = pool[Math.floor(Math.random() * pool.length)];
  if (previousTaunt && candidate === previousTaunt) {
    const nextIdx =
      (pool.indexOf(candidate) + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    candidate = pool[nextIdx];
  }
  return candidate;
}
