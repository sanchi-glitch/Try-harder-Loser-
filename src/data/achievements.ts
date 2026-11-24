import type { AchievementDef } from '../types/game';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Die for the very first time.',
    quip: 'Welcome to the club. Population: you.',
  },
  {
    id: 'trust_nobody',
    title: 'Trust Nobody',
    description: 'Trigger 5 psychological tricks or traps.',
    quip: 'Paranoia is just pattern recognition.',
  },
  {
    id: 'persistent',
    title: 'Persistent',
    description: 'Accumulate 25 total deaths.',
    quip: 'Stubbornness is an underrated superpower.',
  },
  {
    id: 'unimpressed',
    title: 'Unimpressed',
    description: 'Complete any level without jumping once.',
    quip: 'Gravity did not even get invited.',
  },
  {
    id: 'survivor',
    title: 'Survivor',
    description: 'Complete an entire chapter of 5 levels.',
    quip: 'Against all architectural odds.',
  },
  {
    id: 'flawless',
    title: 'Flawless Victory',
    description: 'Complete any level with zero deaths.',
    quip: 'Suspiciously clean. Are you reading the source code?',
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Beat any level in under 7 seconds.',
    quip: 'The traps barely finished loading.',
  },
  {
    id: 'gullible',
    title: 'Certified Gullible',
    description: 'Collect 3 fake rewards.',
    quip: 'If it sparkles, you will touch it.',
  },
  {
    id: 'staring_contest',
    title: 'Are You Still There?',
    description: 'Let your stickman break the fourth wall and stare at you.',
    quip: 'Yes, it knows you are watching.',
  },
  {
    id: 'ultimate_test',
    title: 'The Ultimate Test',
    description: 'Survive Level 99: The Ultimate Test with zero hints.',
    quip: 'One door left between you and absolute legend.',
  },
  {
    id: 'impossible',
    title: 'WAIT. YOU ACTUALLY BEAT THE GAME?',
    description: 'Conquer Level 100: The Last Level with zero checkpoints and zero hints.',
    quip: 'The stickman has officially run out of insults. Rare Victory achieved.',
  },
];

export function getAchievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
