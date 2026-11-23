import type { DeathCause } from '../types/game';

export type StickmanInsultCategory = 'respawn' | 'trap' | 'idle' | 'jump_spam';

/**
 * Returns cruelty tier 1..6 based on the player's current level (1..100).
 * Every tier makes the stickman noticeably crueler, colder, and more mocking.
 */
export function getCrueltyTier(levelId: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (levelId >= 99) return 6;
  if (levelId >= 90) return 5;
  if (levelId >= 61) return 4;
  if (levelId >= 31) return 3;
  if (levelId >= 11) return 2;
  return 1;
}

export const GENERAL_DEATH_MESSAGES: string[] = [
  'Try harder, Loser! Literally the title of the game.',
  'Interesting strategy. Completely wrong, idiot.',
  'The floor sends its regards.',
  'You trusted that? Adorable.',
  'Another attempt? Delusion looks terrible on you.',
  'I would explain what happened, but you were right there.',
  'Bold of you to assume the level wanted you alive.',
  'Gravity remains undefeated.',
  'Statistically speaking, you are not learning at all.',
  'Have you considered not jumping into sharp red things?',
  'Skill issue? Yes. 100% pure skill issue.',
  'Plot twist: the level hates you personally.',
  'Good news: respawns are free. Bad news: your ego is bankrupt.',
  'If at first you fail, repeat the exact same mistake like a pro.',
  'A masterclass in stubbornness without talent.',
  'You fell for the oldest trick in this room.',
  'Almost! (Not even remotely close, idiot.)',
  'I blinked and you were already dead.',
  'The bright red triangles are not decorative.',
  'Trust is a currency you clearly cannot afford.',
  'Confidence: 100%. Survival instincts: 0%.',
  'Your muscle memory is actively sabotaging you.',
  'Nine out of ten stickmen refuse to be controlled by you.',
  'At least that humiliation was quick.',
];

export const CAUSE_DEATH_MESSAGES: Record<DeathCause, string[]> = {
  spike: [
    'Sharp observation, idiot. Very sharp.',
    'Point taken. Straight through your stickman.',
    'Red triangles: still lethal. Shocking, I know.',
    'You hugged the pointy furniture again.',
    'Note to self: spikes do not move out of pity.',
  ],
  popup_spike: [
    'Surprise! Did you even look at the floor seams?',
    'Peek-a-boo. Try harder, Loser!',
    'The floor was just waiting for someone gullible.',
    'Never trust a suspiciously quiet tile.',
    'Free acupuncture. Zero survival.',
  ],
  pit: [
    'The void says hello and asks why you live down here.',
    'Gravity just reminded you who is in charge.',
    'Down is rarely the direction of victory, genius.',
    'Look before you leap. Or after. Too late now.',
    'Nice dive. Ten out of ten for comedy.',
  ],
  saw: [
    'Spinning red blades are not escalators, idiot.',
    'Timing is everything. You have none.',
    'You brought a stickman to a buzzsaw fight.',
    'A fresh slice of pure humiliation.',
  ],
  falling_block: [
    'Heads up! Too slow, idiot.',
    'Ceiling inspection: catastrophically failed.',
    'That concrete block had a personal grudge.',
    'Never stand beneath shaking masonry.',
  ],
  sweeper: [
    'Standing still is a pathetic life choice.',
    'The game noticed you freezing in panic.',
    'Keep moving or keep dying, idiot.',
  ],
  fake_drop: [
    'The floor sends its regards.',
    'That tile had more commitment issues than you.',
    'You trusted the floor? In THIS game?!',
    'Floor.exe has stopped caring about you.',
  ],
};

export const REPEAT_SPOT_MESSAGES: string[] = [
  'Same spot, same death. Truly tragic.',
  'Doing the exact same jump expecting mercy, idiot?',
  'This specific pixel owns your soul now.',
  'Even the trap is embarrassed for you.',
  'Try harder, Loser! Maybe use your eyes this time.',
  'Three deaths in one spot? Iconic stupidity.',
];

// =========================================================================
// ESCALATING STICKMAN SPEECH-BUBBLE INSULTS (6 CRUELTY TIERS: LV 1 -> 100)
// =========================================================================

const RESPAWN_INSULTS_BY_TIER: Record<1 | 2 | 3 | 4 | 5 | 6, string[]> = {
  // Tier 1 (Lv 1-10): Smug teasing
  1: [
    'Try harder, Loser!',
    'Seriously?! On an early level?',
    'You call that a jump?',
    'Are your eyes even open?',
    'Bro, red means STOP.',
    'I saw that coming. You did not.',
    'Bold choice. Terrible outcome.',
    'Zero survival instincts.',
    'Let ME drive next time.',
    'Even a pigeon clears this.',
  ],
  // Tier 2 (Lv 11-30): Condescending & biting
  2: [
    'Try harder, Loser! Still embarrassing.',
    'My grandma clears this with her elbows.',
    'Your reflexes are running on dial-up.',
    'Revoking your gamer license right now.',
    'I am 6 ink lines and smarter than you.',
    'Please activate at least ONE brain cell.',
    'Your thumbs owe you a formal apology.',
    'Watching you play physically hurts me.',
    'Did your brain lag mid-jump again?',
    'Painful to watch. Truly painful.',
  ],
  // Tier 3 (Lv 31-60): Brutal roasting, zero respect
  3: [
    'Just close the tab, idiot.',
    'You are embarrassing BOTH of us right now.',
    'Even the spikes feel pity for you.',
    'Delete your reflexes and start over.',
    'Every jump is a crime against physics.',
    'Quit now while you still have dignity.',
    'Is your jump button broken or just you?',
    'You die faster than I can mock you.',
    'Certified clown performance, idiot.',
    'Not a single thought behind those clicks.',
  ],
  // Tier 4 (Lv 61-89): Ice-cold psychological cruelty
  4: [
    'You are NEVER seeing 99, let alone 100.',
    'Every death proves I was right about you.',
    'Delusion looks awful on you, idiot.',
    'This isn’t a game — it’s public humiliation.',
    'Even the saws are bored of slicing you.',
    'Your ego is shattered. Just like my bones.',
    'All these deaths and STILL zero skill.',
    'Stop torturing me with your garbage timing.',
    'You actually thought you were good? LMAO.',
    'Keep clicking retry. Watching you fold is art.',
  ],
  // Tier 5 (Lv 90-98): Ruthless gatekeeper savagery
  5: [
    '90s? You do NOT belong up here, idiot.',
    'Hands shaking yet? Hilarious.',
    'Turn back before 99 shatters your soul.',
    'One pixel off. Story of your miserable run.',
    'Cry harder. The traps laugh at you.',
    'You are not built for the endgame. Quit.',
    'Gatekept by basic timing. Pathetic.',
    'Every failure here is permanent shame.',
  ],
  // Tier 6 (Lv 99-100): Existential endgame mockery
  6: [
    'TRY HARDER, LOSER! UNTIL ETERNITY.',
    'Zero mercy. Zero dignity. Zero chance.',
    'Your fingers are begging you to quit.',
    'Peak humiliation achieved.',
  ],
};

const LEVEL_99_INSULTS: string[] = [
  '99! ONE level from 100 and you STILL choked, loser!',
  'Almost doesn’t unlock Level 100. Cry harder.',
  'You can SMELL Level 100 and still faceplanted!',
  'Stuck at 99% forever. Literally tragic.',
  '99 is where fake legends get exposed.',
  'So close... and yet STILL a loser.',
  'Even if you crawl past 99, 100 will erase you.',
];

const LEVEL_100_INSULTS: string[] = [
  'NOBODY crosses Level 100. Definitely not you.',
  'ZERO checkpoints! Enjoy walking from pixel 1, loser!',
  'Try harder, Loser! Try 1,000 times. Still impossible.',
  'You really thought YOU were that rare legend? HAHA!',
  'Level 100 isn’t a level — it’s a brick wall for idiots.',
  'Back to the very start! Suffer again!',
  'Close the game. Literally no human beats 100.',
  'Even with 10,000 tries you will never cross this.',
];

const TRAP_INSULTS_BY_TIER: Record<1 | 2 | 3 | 4 | 5 | 6, string[]> = {
  1: [
    'You fell for THAT?!',
    'Gullible as advertised.',
    'Read the room, genius.',
    'Hahaha, classic you.',
  ],
  2: [
    'Never seen someone so easily fooled.',
    'Did you really trust a sign, idiot?',
    'Hook, line, and complete idiot.',
    'You walk into traps like it is your job.',
  ],
  3: [
    'Still falling for bait this deep?!',
    'Brain empty. Pure vibes. Pure death.',
    'We barely even hid that trap, idiot.',
    'You never learn. Not even once.',
  ],
  4: [
    '60+ levels in and STILL trusting floors?!',
    'Your trust issues clearly failed you.',
    'A sleepy pigeon would have dodged that.',
    'Humiliating. Truly humiliating.',
  ],
  5: [
    'THE 90s AND YOU FELL FOR A BAIT?!',
    'Pathetic. Back to the abyss, idiot.',
    'No mercy for gullible clowns.',
    'You literally begged for that betrayal.',
  ],
  6: [
    'BAITED AT THE FINISH LINE?! PATHETIC!',
    'You trusted THAT on Level 99/100?! IDIOT!',
    'Hope crushed in 0.1 seconds. Beautiful.',
    'Hahaha! Try harder, Loser!',
  ],
};

const IDLE_INSULTS_BY_TIER: Record<1 | 2 | 3 | 4 | 5 | 6, string[]> = {
  1: [
    'Hello? Brain buffering?',
    'Are we going, or...?',
    'Scared of a few pixels?',
    'Fingers still working?',
  ],
  2: [
    'Staring will not move the spikes, idiot.',
    'Take your time. I am only ink.',
    'Waiting for a miracle? Keep waiting.',
    'Afraid to press jump already?',
  ],
  3: [
    'Frozen in fear? Adorable.',
    'Thinking this hard just to die in 2s.',
    'Move, idiot. The sweeper is hungry.',
    'Regretting clicking Play yet?',
  ],
  4: [
    'Hands trembling? Just press Quit.',
    'Planning another tragic failure?',
    'Cowardice will not get you to 100.',
    'All that thinking just to choke anyway.',
  ],
  5: [
    'Terrified of the 90s, idiot?',
    'Standing still is the longest you’ll live.',
    'Take a breath. Your death is 2s away.',
    'Quit staring and go get humiliated.',
  ],
  6: [
    'Scared to move on the final boss, idiot?',
    'Staring at the impossible won’t beat it.',
    'Go on. Take one step and die already.',
    'Sweating yet? You should be.',
  ],
};

const JUMP_SPAM_INSULTS_BY_TIER: Record<1 | 2 | 3 | 4 | 5 | 6, string[]> = {
  1: ['Easy on jump, kangaroo.', 'Walking exists, you know.'],
  2: ['Panic hopping already, idiot?', 'Bouncing will not save you.'],
  3: ['Stop mashing jump like a headless chicken.', 'Spamming jump = spamming death.'],
  4: ['Pure panic. Zero control. Classic idiot.', 'Your thumb is mashing in pure fear.'],
  5: ['Mashing jump in the 90s?! Instant funeral.', 'Control yourself or stay dead, idiot.'],
  6: ['PANIC MASHING ON 99/100?! GOODBYE!', 'Zero composure. Instant death, idiot.'],
};

const MID_RUN_MOCKERY_BY_TIER: Record<1 | 2 | 3 | 4 | 5 | 6, string[]> = {
  1: ['Watch your step...', 'Don’t get cocky yet.'],
  2: ['Oh look, still alive. Won’t last.', 'Try not to choke right here, idiot.'],
  3: ['Halfway there — prime time to choke!', 'Sweating yet? The cruel part starts now.'],
  4: ['You’re actually surviving? Fixing that soon.', 'Don’t blink, idiot. One mistake = done.'],
  5: ['Nice progress. Shame you’re about to choke.', 'Hands shaking? Look ahead, idiot!'],
  6: ['Still alive?! Impossible — watch this trap!', 'DO NOT CHOKE NOW, IDIOT!'],
};

// Keep legacy exports for compatibility
export const STICKMAN_RESPAWN_INSULTS: string[] = RESPAWN_INSULTS_BY_TIER[1];
export const STICKMAN_TRAP_INSULTS: string[] = TRAP_INSULTS_BY_TIER[1];
export const STICKMAN_IDLE_INSULTS: string[] = IDLE_INSULTS_BY_TIER[1];
export const STICKMAN_JUMP_SPAM_INSULTS: string[] = JUMP_SPAM_INSULTS_BY_TIER[1];

export const STICKMAN_HOME_INSULTS: string[] = [
  'Try harder, Loser! You’re just bad.',
  '100 cruel levels. You won’t survive 10.',
  'Level 100 is literally impossible. Dare you.',
  'Go on, click Play. Humiliate yourself.',
  'Bet you die on Level 1, idiot.',
  '99 almost breaks you. 100 ends you.',
  'If you cross 100, history is made. (You won’t.)',
];

export const FOURTH_WALL_IDLE_QUIPS = STICKMAN_IDLE_INSULTS;
export const FOURTH_WALL_DEATH_QUIPS = STICKMAN_RESPAWN_INSULTS;

const VICTORY_QUIPS_BY_TIER: Record<1 | 2 | 3 | 4 | 5 | 6, string[]> = {
  1: [
    'Beginner luck. Next room will humble you.',
    'Fine. Take the win. Do not get cocky, idiot.',
    'You survived? Must be a glitch.',
  ],
  2: [
    'Suspiciously competent. Fixing that next level.',
    'Congrats, you cleared the baby part. Barely.',
    'Enjoy that win. The cruelty ramps hard now.',
  ],
  3: [
    'How did YOU survive that?! Pure accident.',
    'Okay, mildly annoying. Next stage is way meaner.',
    'You only beat that by stubborn panic clicking.',
  ],
  4: [
    'Still refusing to quit? Respectfully, stop.',
    'Every level closer to 99 makes your downfall funnier.',
    'Fluke run. Try surviving the next nightmare, idiot.',
  ],
  5: [
    'NO WAY you cleared a 90s gatekeeper?!',
    'Stop smiling. Level 99 & 100 are waiting to crush you.',
    'Actually terrifying... still betting you choke next.',
  ],
  6: [
    'UNREAL... You actually survived that?!',
    'Okay, my jaw is on the floor.',
  ],
};

export const VICTORY_QUIPS: string[] = VICTORY_QUIPS_BY_TIER[1];

let lastMessageIndex = -1;
let lastInsultText = '';

export function pickStickmanInsult(pool: string[]): string {
  if (pool.length === 0) return 'Try harder, Loser!';
  let idx = Math.floor(Math.random() * pool.length);
  if (pool[idx] === lastInsultText && pool.length > 1) {
    idx = (idx + 1) % pool.length;
  }
  lastInsultText = pool[idx];
  return pool[idx];
}

/**
 * Picks a stickman speech-bubble roast whose cruelty escalates relentlessly across Levels 1..100,
 * getting extra vicious on high death streaks and Levels 99 & 100.
 */
export function pickEscalatingStickmanInsult(
  category: StickmanInsultCategory,
  levelId: number,
  levelDeaths = 0,
): string {
  const tier = getCrueltyTier(levelId);

  if (category === 'respawn') {
    if (levelId === 100 && Math.random() < 0.85) {
      return pickStickmanInsult(LEVEL_100_INSULTS);
    }
    if (levelId === 99 && Math.random() < 0.82) {
      return pickStickmanInsult(LEVEL_99_INSULTS);
    }
    if (levelDeaths >= 8 && Math.random() < 0.45) {
      const harshness =
        levelId >= 60
          ? [
              `${levelDeaths} deaths here?! Quit already, idiot.`,
              `Death #${levelDeaths}. Zero talent detected.`,
              `${levelDeaths} straight chokes. Truly pathetic.`,
              `Still dying at #${levelDeaths}? Close the tab.`,
            ]
          : [
              `${levelDeaths} deaths here?! Try harder, Loser!`,
              `Death #${levelDeaths}. Still zero improvement.`,
              `${levelDeaths} tries and counting. Embarrassing.`,
              `Maybe try a coloring book instead, idiot.`,
            ];
      return pickStickmanInsult(harshness);
    }
    return pickStickmanInsult(RESPAWN_INSULTS_BY_TIER[tier]);
  }

  if (category === 'trap') {
    return pickStickmanInsult(TRAP_INSULTS_BY_TIER[tier]);
  }
  if (category === 'idle') {
    return pickStickmanInsult(IDLE_INSULTS_BY_TIER[tier]);
  }
  return pickStickmanInsult(JUMP_SPAM_INSULTS_BY_TIER[tier]);
}

/**
 * Live mid-run mockery triggered when crossing halfway or nearing the finish on cruel levels.
 */
export function pickMidRunMockery(levelId: number, stage: 'mid' | 'late'): string {
  if (levelId === 100) {
    return stage === 'mid'
      ? 'Halfway on 100?! Don’t worry, you’re about to choke!'
      : 'WAIT — STOP!! NOBODY IS ALLOWED TO CROSS 100!!';
  }
  if (levelId === 99) {
    return stage === 'mid'
      ? 'Halfway on 99... don’t choke now, idiot!'
      : 'Level 100 is RIGHT THERE — choke incoming!';
  }
  const tier = getCrueltyTier(levelId);
  return pickStickmanInsult(MID_RUN_MOCKERY_BY_TIER[tier]);
}

/**
 * Opening taunt spoken by the stickman right when entering levels — gets crueler as you climb.
 */
export function pickLevelEntryTaunt(levelId: number): string | null {
  if (levelId === 100) {
    return 'LEVEL 100. ZERO CHECKPOINTS. LITERALLY IMPOSSIBLE, IDIOT.';
  }
  if (levelId === 99) {
    return 'Level 99. Almost at 100... time to choke, idiot.';
  }
  if (levelId >= 96) {
    return `Level ${levelId}. Chapter 20 eats idiots alive.`;
  }
  if (levelId >= 90) {
    return `Level ${levelId}. Final 10. Your ego ends here.`;
  }
  if (levelId >= 70 && levelId % 5 === 0) {
    return `Level ${levelId}. Still delusional enough to keep going?`;
  }
  if (levelId >= 40 && levelId % 5 === 0) {
    return `Level ${levelId}. Ready to get humiliated again?`;
  }
  if (levelId >= 15 && levelId % 5 === 0) {
    return `Level ${levelId}. Try harder, Loser!`;
  }
  return null;
}

export function pickDeathMessage(cause: DeathCause, repeatCount: number, levelId = 1): string {
  if (levelId === 100 && Math.random() < 0.6) {
    return LEVEL_100_INSULTS[Math.floor(Math.random() * LEVEL_100_INSULTS.length)];
  }
  if (levelId === 99 && Math.random() < 0.55) {
    return LEVEL_99_INSULTS[Math.floor(Math.random() * LEVEL_99_INSULTS.length)];
  }
  if (repeatCount >= 3 && Math.random() < 0.65) {
    return REPEAT_SPOT_MESSAGES[Math.floor(Math.random() * REPEAT_SPOT_MESSAGES.length)];
  }
  const causePool = CAUSE_DEATH_MESSAGES[cause] ?? [];
  if (causePool.length > 0 && Math.random() < 0.52) {
    return causePool[Math.floor(Math.random() * causePool.length)];
  }
  let idx = Math.floor(Math.random() * GENERAL_DEATH_MESSAGES.length);
  if (idx === lastMessageIndex) {
    idx = (idx + 1) % GENERAL_DEATH_MESSAGES.length;
  }
  lastMessageIndex = idx;
  return GENERAL_DEATH_MESSAGES[idx];
}

export function pickVictoryQuip(deathsInLevel: number, levelId = 1): string {
  if (levelId === 99) {
    return 'You ACTUALLY survived Level 99?! Insane... Now meet Level 100, idiot. Literally nobody has ever crossed it.';
  }
  if (deathsInLevel === 0) {
    return levelId >= 50
      ? 'Zero deaths on THIS monster?! Are you even human?!'
      : 'Zero deaths? Either you have psychic powers or pure dumb luck.';
  }
  if (deathsInLevel >= 15) {
    return `${deathsInLevel} deaths just for THAT. Sheer stubborn idiocy — honestly, terrifying.`;
  }
  const tier = getCrueltyTier(levelId);
  const pool = VICTORY_QUIPS_BY_TIER[tier];
  return pool[Math.floor(Math.random() * pool.length)];
}

export type DeathStreakMilestone = 5 | 10 | 20;

export function getDeathStreakMilestone(streak: number): DeathStreakMilestone | null {
  if (streak === 5 || streak === 10 || streak === 20) {
    return streak;
  }
  return null;
}

export interface DeathStreakMockery {
  milestone: DeathStreakMilestone;
  bubble: string;
  taunt: string;
  banner: string;
}

/**
 * Returns increasingly disparaging, milestone-specific stickman mockery
 * whenever the player hits an exact 5, 10, or 20 death streak on a single level.
 */
export function pickDeathStreakStickmanComment(
  milestone: DeathStreakMilestone,
  levelId: number,
): DeathStreakMockery {
  const lvLabel = String(levelId).padStart(2, '0');
  const isEndgame = levelId >= 99;

  if (milestone === 5) {
    const bubbles = isEndgame
      ? [
          `5 straight deaths on Lv ${lvLabel}?! Warm-up over, loser.`,
          `5x death streak! Already crumbling on Lv ${lvLabel}?`,
          `Five fails in a row. Your hands are shaking already.`,
        ]
      : [
          `5 deaths in a row on Lv ${lvLabel}?! Are you even trying, Loser?`,
          `Five straight chokes. Have you tried opening your eyes?`,
          `5x death streak! Even the spikes are getting bored of you.`,
          `Five fails straight. My ink dries faster than you learn.`,
        ];
    const taunts = [
      `5 straight deaths on Level ${lvLabel}. At this point, the traps don't even need to try.`,
      `Five deaths in a row — your muscle memory is actively fighting against you, loser.`,
      `5-death streak! Have you considered jumping OVER the bright red spikes?`,
    ];
    return {
      milestone: 5,
      bubble: pickStickmanInsult(bubbles),
      taunt: taunts[levelId % taunts.length],
      banner: `5x DEATH STREAK ON LV ${lvLabel} · EMBARRASSING`,
    };
  }

  if (milestone === 10) {
    const bubbles = isEndgame
      ? [
          `10 STRAIGHT DEATHS ON LV ${lvLabel}?! Just surrender, idiot.`,
          `Double-digit fails here. You are NOT built for Lv ${lvLabel}.`,
          `10x streak! Watching you fold at the finish line is pure comedy.`,
        ]
      : [
          `10 STRAIGHT DEATHS?! Delete your hands and start over, idiot.`,
          `Double-digit fails on Lv ${lvLabel}. Certified clown behavior.`,
          `10x death streak! The spikes aren't even moving, loser.`,
          `Ten in a row. Watching you play is a crime against stickmen.`,
        ];
    const taunts = [
      `10 deaths in a row on Level ${lvLabel}. Statistically, a blindfolded pigeon would have accidentally cleared this by now.`,
      `Double-digit death streak! Every single attempt is somehow worse than the last, idiot.`,
      `10 straight failures on Level ${lvLabel}. Your ego is writing checks your thumbs cannot cash.`,
    ];
    return {
      milestone: 10,
      bubble: pickStickmanInsult(bubbles),
      taunt: taunts[levelId % taunts.length],
      banner: `10x DEATH STREAK ON LV ${lvLabel} · DOUBLE-DIGIT HUMILIATION`,
    };
  }

  // 20-Death Streak: Nuclear existential disrespect
  const bubbles = isEndgame
    ? [
        `20 STRAIGHT DEATHS ON LV ${lvLabel}?! CLOSE THE TAB, LOSER.`,
        `TWENTY FAILS IN A ROW! Give up — you will NEVER cross this.`,
        `20x streak on Lv ${lvLabel}. Pure, unfiltered delusion.`,
      ]
    : [
        `20 DEATHS IN A ROW?! Close the game and salvage your dignity.`,
        `TWENTY straight fails on Lv ${lvLabel}! Actually hopeless, Loser.`,
        `20x death streak. I am 6 lines of ink begging you to quit.`,
        `20 consecutive deaths! You are just feeding the traps now, idiot.`,
      ];
  const taunts = [
    `20 straight deaths on Level ${lvLabel}. Not a single neuron fired in twenty consecutive attempts. Just quit.`,
    `TWENTY-DEATH STREAK! At this point, you're not playing Try harder, Loser! — you ARE the punchline.`,
    `20 failures in a row on Level ${lvLabel}. Please step away from the controls before the stickman files a restraining order.`,
  ];
  return {
    milestone: 20,
    bubble: pickStickmanInsult(bubbles),
    taunt: taunts[levelId % taunts.length],
    banner: `20x DEATH STREAK ON LV ${lvLabel} · PURE DELUSION`,
  };
}

