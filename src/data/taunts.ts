import { getPersonalityAct, type PersonalityAct } from './deathMessages';

// Stage 1 (Lv 1-10): The Beginning — Mocking (Cruel right from Level 1)
const TAUNTS_STAGE_1: readonly string[] = [
  'Aww, already dead?',
  'Was that supposed to be a jump?',
  "You're struggling with THIS?",
  'You trusted the floor. Adorable.',
  'Gravity barely had to show up.',
  'That jump had zero physics and negative grace.',
  'The bright red triangles are not decorative.',
];

// Stage 2 (Lv 11-20): The Trap — Sarcastic
const TAUNTS_STAGE_2: readonly string[] = [
  'You saw that coming and still walked into it?',
  'Impressive. Wrong, but impressive.',
  "Maybe the controls aren't the problem.",
  'Bold choice. Predictably awful outcome.',
  'You really obeyed a sign in THIS game?',
  'Good news: respawns are free. Bad news: your timing.',
];

// Stage 3 (Lv 21-30): The Deception — Insulting
const TAUNTS_STAGE_3: readonly string[] = [
  'You have the survival instincts of a potato.',
  'Another failure. How surprising.',
  'Even the spikes are getting bored.',
  'Your muscle memory is actively sabotaging you.',
  'Same habit, same trap, same funeral.',
  'The level is reading you like a picture book.',
];

// Stage 4 (Lv 31-40): The Betrayal — Brutal
const TAUNTS_STAGE_4: readonly string[] = [
  "I've seen loading screens with better reflexes.",
  'Your brain really took a day off.',
  'That was painful to watch.',
  'Confidence: 100%. Survival: 0%.',
  'Every betrayal lands because you never learn.',
  'Try harder, Loser! Open your eyes this time.',
];

// Stage 5 (Lv 41-50): The Frustration — Cruel
const TAUNTS_STAGE_5: readonly string[] = [
  'The checkpoint has seen enough.',
  'You keep proving me right.',
  'At this point, failure is your personality.',
  'Halfway to 100 and already crumbling.',
  'Retry button is filing for overtime pay today.',
  'Hints disappear forever after Level 50. Good luck.',
];

// Stage 6 (Lv 51-60): The Torture — Ruthless
const TAUNTS_STAGE_6: readonly string[] = [
  'I genuinely expected nothing, yet you disappointed me.',
  'Are you playing or conducting an experiment in failure?',
  'Your last attempt was somehow better. Barely.',
  'Zero hints left. Just you and your terrible timing.',
  'You die faster than the traps can reset.',
  'Close the tab before your thumbs file a complaint.',
];

// Stage 7 (Lv 61-70): Psychological Warfare — Psychological Mockery
const TAUNTS_STAGE_7: readonly string[] = [
  "You know what's coming. You still won't survive it.",
  'I can practically hear your confidence disappearing.',
  'Go ahead. Make the same mistake again.',
  'Second-guessing every pixel yet? Good.',
  'Your own mind is doing half the trap’s work.',
  'Go on. Trust the next platform too.',
];

// Stage 8 (Lv 71-80): The Nightmare — Merciless
const TAUNTS_STAGE_8: readonly string[] = [
  "You've made it this far. What a waste of progress.",
  'I almost respect your persistence. Almost.',
  'Your suffering is becoming predictable.',
  'Every death proves this game named itself accurately.',
  'This isn’t a platformer anymore — it’s a humiliation loop.',
];

// Stage 9 (Lv 81-90): The Impossible — Maximum Cruelty
const TAUNTS_STAGE_9: readonly string[] = [
  'Eighty levels and this is still your performance?',
  'Perhaps the exit is avoiding you.',
  'I would wish you luck, but that seems pointless.',
  'You are NEVER seeing Level 99 playing like that.',
  'Keep clicking retry. Watching your pride dissolve is art.',
];

// Stage 10 (Lv 91-98): The Final Descent — Final Descent
const TAUNTS_STAGE_10: readonly string[] = [
  'So close to the end. Would be a shame to fall.',
  "You've survived 90 levels just to do THAT?",
  "Your determination is admirable. Your skills aren't.",
  'Hands shaking yet? You do not belong up here.',
  'One pixel off. Welcome to the Final Descent.',
];

// Stage 11 (Lv 99): The Ultimate Test
const TAUNTS_LEVEL_99: readonly string[] = [
  'Oh, look. The almost-final level. How unfortunate.',
  "You didn't really think this would be easy?",
  'One more level. Try not to embarrass yourself.',
  '99% of the way there and 100% humiliated.',
  'Almost does NOT unlock Level 100.',
];

// Stage 12 (Lv 100): The Last Level
const TAUNTS_LEVEL_100: readonly string[] = [
  'You actually made it here?',
  "I wouldn't get comfortable.",
  "If you win this, I'll have nothing left to insult.",
  'LEVEL 100: ZERO CHECKPOINTS. ZERO HINTS. BACK TO PIXEL ONE.',
  'Almost nobody beats Level 100. Prove me wrong.',
];

const TAUNTS_BY_ACT: Record<PersonalityAct, readonly string[]> = {
  1: TAUNTS_STAGE_1,
  2: TAUNTS_STAGE_2,
  3: TAUNTS_STAGE_3,
  4: TAUNTS_STAGE_4,
  5: TAUNTS_STAGE_5,
  6: TAUNTS_STAGE_6,
  7: TAUNTS_STAGE_7,
  8: TAUNTS_STAGE_8,
  9: TAUNTS_STAGE_9,
  10: TAUNTS_STAGE_10,
  11: TAUNTS_LEVEL_99,
  12: TAUNTS_LEVEL_100,
};

export const DEATH_TAUNTS: readonly string[] = [
  ...TAUNTS_STAGE_1,
  ...TAUNTS_STAGE_2,
  ...TAUNTS_STAGE_3,
  ...TAUNTS_STAGE_4,
  ...TAUNTS_STAGE_5,
  ...TAUNTS_STAGE_6,
  ...TAUNTS_STAGE_7,
  ...TAUNTS_STAGE_8,
  ...TAUNTS_STAGE_9,
  ...TAUNTS_STAGE_10,
  ...TAUNTS_LEVEL_99,
  ...TAUNTS_LEVEL_100,
];

function getPoolForLevel(levelId?: number): readonly string[] {
  if (!levelId) return DEATH_TAUNTS;
  return TAUNTS_BY_ACT[getPersonalityAct(levelId)] ?? TAUNTS_STAGE_1;
}

export function getRandomDeathTaunt(previousTaunt?: string | null, levelId?: number): string {
  const pool = getPoolForLevel(levelId);
  if (pool.length === 0) return 'Try harder, Loser!';
  if (pool.length === 1) return pool[0];
  let candidate = pool[Math.floor(Math.random() * pool.length)];
  if (previousTaunt && candidate === previousTaunt) {
    const nextIdx =
      (pool.indexOf(candidate) + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    candidate = pool[nextIdx];
  }
  return candidate;
}
