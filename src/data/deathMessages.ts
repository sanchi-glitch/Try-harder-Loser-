import { getDifficultyStage, type DifficultyStageId } from './difficultyStages';
import type { DeathCause } from '../types/game';

export type StickmanInsultCategory =
  | 'respawn'
  | 'trap'
  | 'idle'
  | 'jump_spam'
  | 'checkpoint'
  | 'repeat_mistake';

export type PersonalityAct = DifficultyStageId;

/**
 * Maps any level (1..100) to its exact 12-stage commentary personality.
 * The stickman is cruel and insulting right from Level 1, evolving in style:
 *  1 (1-10):   Mocking
 *  2 (11-20):  Sarcastic
 *  3 (21-30):  Insulting
 *  4 (31-40):  Brutal
 *  5 (41-50):  Cruel
 *  6 (51-60):  Ruthless
 *  7 (61-70):  Psychological Mockery
 *  8 (71-80):  Merciless
 *  9 (81-90):  Maximum Cruelty
 * 10 (91-98):  Final Descent
 * 11 (99):     The Ultimate Test
 * 12 (100):    The Last Level
 */
export function getPersonalityAct(levelId: number): PersonalityAct {
  return getDifficultyStage(levelId).id;
}

/**
 * Returns visual cruelty tier 1..6 based on the player's current level (1..100).
 * Used for speech-bubble styling, atmosphere intensity, and modal badges.
 */
export function getCrueltyTier(levelId: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (levelId >= 99) return 6;
  if (levelId >= 81) return 5;
  if (levelId >= 61) return 4;
  if (levelId >= 31) return 3;
  if (levelId >= 11) return 2;
  return 1;
}

// Non-repeating recent dialogue memory (prevents stale back-to-back lines)
const RECENT_HISTORY_LIMIT = 6;
const recentStickmanLines: string[] = [];

function rememberLine(line: string): string {
  recentStickmanLines.push(line);
  if (recentStickmanLines.length > RECENT_HISTORY_LIMIT) {
    recentStickmanLines.shift();
  }
  return line;
}

function pickFreshLine(pool: readonly string[]): string {
  if (pool.length === 0) return 'Try harder, Loser!';
  if (pool.length === 1) return rememberLine(pool[0]);
  const fresh = pool.filter((line) => !recentStickmanLines.includes(line));
  const source = fresh.length > 0 ? fresh : pool;
  const choice = source[Math.floor(Math.random() * source.length)];
  return rememberLine(choice);
}

export const GENERAL_DEATH_MESSAGES: string[] = [
  'Aww, already dead?',
  'Was that supposed to be a jump?',
  "You're struggling with THIS?",
  'You saw that coming and still walked into it?',
  'Impressive. Wrong, but impressive.',
  "Maybe the controls aren't the problem.",
  'You have the survival instincts of a potato.',
  'Another failure. How surprising.',
  'Even the spikes are getting bored.',
  "I've seen loading screens with better reflexes.",
  'Your brain really took a day off.',
  'That was painful to watch.',
  'The checkpoint has seen enough.',
  'At this point, failure is your personality.',
];

const ACT_DEATH_MESSAGES: Record<PersonalityAct, readonly string[]> = {
  // 1-10: Mocking (cruel right from Level 1)
  1: [
    'Aww, already dead?',
    'Was that supposed to be a jump?',
    "You're struggling with THIS?",
    'Gravity barely tried and still won.',
    'You trusted the floor? Adorable.',
    'That looked painful. Mostly for me watching.',
    'Nice attempt. Completely terrible, though.',
    'Red spikes are sharp. Shocking news, apparently.',
  ],
  // 11-20: Sarcastic
  2: [
    'You saw that coming and still walked into it?',
    'Impressive. Wrong, but impressive.',
    "Maybe the controls aren't the problem.",
    'Bold choice. Predictably awful outcome.',
    'You read the sign and obeyed? Cute.',
    'The trap barely moved and still caught you.',
    'Good news: respawns are free. Bad news: your timing.',
    'Interesting strategy. Completely suicidal, of course.',
  ],
  // 21-30: Insulting
  3: [
    'You have the survival instincts of a potato.',
    'Another failure. How surprising.',
    'Even the spikes are getting bored.',
    'Your thumbs are actively sabotaging you.',
    'Same mistake, brand-new funeral.',
    'The level is reading you like a picture book.',
    'I am six ink lines and smarter than you.',
    'Zero awareness. Pure stubbornness.',
  ],
  // 31-40: Brutal
  4: [
    "I've seen loading screens with better reflexes.",
    'Your brain really took a day off.',
    'That was painful to watch.',
    'That jump was a crime against basic physics.',
    'Even the moving platforms are avoiding you.',
    'Confidence: 100%. Execution: 0%.',
    'Watching you attempt this is free comedy.',
    'Every betrayal lands because you never learn.',
  ],
  // 41-50: Cruel
  5: [
    'The checkpoint has seen enough.',
    'You keep proving me right.',
    'At this point, failure is your personality.',
    'Your stickman is embarrassed to be seen with you.',
    'Halfway to 100 and already falling apart.',
    'Hints disappear after Level 50. Good luck with THAT.',
    'You are not fighting the level — you are feeding it.',
    'Quit now while your ego is still lukewarm.',
  ],
  // 51-60: Ruthless
  6: [
    'I genuinely expected nothing, yet you disappointed me.',
    'Are you playing or conducting an experiment in failure?',
    'Your last attempt was somehow better. Barely.',
    'No hints left. Just you and your awful instincts.',
    'You die faster than the traps can even reset.',
    'Delete your reflexes and try starting from scratch.',
    'Pure stubbornness. Zero precision.',
  ],
  // 61-70: Psychological Mockery
  7: [
    "You know what's coming. You still won't survive it.",
    'I can practically hear your confidence disappearing.',
    'Go ahead. Make the same mistake again.',
    'Second-guessing every pixel yet? Good.',
    'You hesitated for half a second — and threw the whole run.',
    'Your own brain is doing half my job for me.',
    'Trust the next platform. I dare you.',
  ],
  // 71-80: Merciless
  8: [
    "You've made it this far. What a waste of progress.",
    'I almost respect your persistence. Almost.',
    'Your suffering is becoming predictable.',
    'Every death confirms why this game is named after you.',
    'Close the tab before your thumbs file a complaint.',
    'The nightmare owns your schedule now.',
  ],
  // 81-90: Maximum Cruelty
  9: [
    'Eighty levels and this is still your performance?',
    'Perhaps the exit is avoiding you.',
    'I would wish you luck, but that seems pointless.',
    'You are NEVER surviving the 90s playing like that.',
    'Keep hitting retry. Watching your pride dissolve is art.',
    'Even the buzzsaws look tired of slicing you.',
  ],
  // 91-98: Final Descent
  10: [
    'So close to the end. Would be a shame to fall.',
    "You've survived 90 levels just to do THAT?",
    "Your determination is admirable. Your skills aren't.",
    'Hands shaking yet? You do not belong up here.',
    'One pixel off. Welcome to the Final Descent.',
    'Turn back before Level 99 finishes what is left of your pride.',
  ],
  // 99: The Ultimate Test
  11: [
    'Oh, look. The almost-final level. How unfortunate.',
    "You didn't really think this would be easy?",
    'One more level. Try not to embarrass yourself.',
    '99% of the way there and 100% choking.',
    'Almost does NOT unlock Level 100.',
  ],
  // 100: The Last Level
  12: [
    'You actually made it here?',
    "I wouldn't get comfortable.",
    "If you win this, I'll have nothing left to insult.",
    'Zero checkpoints. Zero hints. Back to pixel one.',
    'Almost nobody beats Level 100. Definitely not like that.',
  ],
};

export const CAUSE_DEATH_MESSAGES: Record<DeathCause, readonly string[]> = {
  spike: [
    'Sharp observation. Very sharp.',
    'Even the spikes are getting bored.',
    'Red triangles: still lethal. Shocking, I know.',
    'You hugged the pointy furniture again.',
  ],
  popup_spike: [
    'You saw that coming and still walked into it?',
    'Never trust a suspiciously quiet floor.',
    'The floor was just waiting for someone predictable.',
    'Free acupuncture. Zero survival.',
  ],
  pit: [
    'Was that supposed to be a jump?',
    'The void asks why you visit so often.',
    'Gravity remains undefeated.',
    'Nice dive. Ten out of ten for comedy.',
  ],
  saw: [
    'Spinning red blades are not escalators.',
    "I've seen loading screens with better reflexes.",
    'You brought a stickman to a buzzsaw fight.',
    'A fresh slice of pure humiliation.',
  ],
  falling_block: [
    'Heads up! Too slow.',
    'Ceiling inspection: catastrophically failed.',
    'Your brain really took a day off under that block.',
    'Never camp beneath angry masonry.',
  ],
  sweeper: [
    'Standing still is a risky life choice here.',
    'The game noticed you freezing in panic.',
    'Keep moving or keep respawning.',
  ],
  fake_drop: [
    'You trusted the floor. Adorable.',
    'That tile had more commitment issues than you.',
    'The floor sends its regards.',
    'Floor.exe has stopped caring about you.',
  ],
};

// =========================================================================
// CONTEXTUAL STICKMAN SPEECH-BUBBLE INSULTS (ALL 12 STAGES)
// =========================================================================

const RESPAWN_INSULTS_BY_ACT: Record<PersonalityAct, readonly string[]> = {
  1: [
    'Aww, already dead?',
    'Was that supposed to be a jump?',
    "You're struggling with THIS?",
    'You trusted THAT floor?',
    'Gravity: 1. You: 0.',
    'Try opening your eyes this time.',
  ],
  2: [
    'You saw that coming and still walked into it?',
    'Impressive. Wrong, but impressive.',
    "Maybe the controls aren't the problem.",
    'Bold strategy. Horrible execution.',
    'That trap wasn’t even subtle.',
    'Let ME drive next time.',
  ],
  3: [
    'You have the survival instincts of a potato.',
    'Another failure. How surprising.',
    'Even the spikes are getting bored.',
    'Did your brain lag mid-jump?',
    'I am six ink lines and smarter than you.',
    'Same mistake, fresh embarrassment.',
  ],
  4: [
    "I've seen loading screens with better reflexes.",
    'Your brain really took a day off.',
    'That was painful to watch.',
    'Watching you play hurts my eyes.',
    'Every jump is a cry for help.',
    'Try harder, Loser!',
  ],
  5: [
    'The checkpoint has seen enough.',
    'You keep proving me right.',
    'At this point, failure is your personality.',
    'Certified clown performance.',
    'Your thumbs owe you an apology.',
    'Still clicking retry? Fascinating.',
  ],
  6: [
    'I genuinely expected nothing, yet you disappointed me.',
    'Are you playing or conducting an experiment in failure?',
    'Your last attempt was somehow better. Barely.',
    'No hints left. Good luck.',
    'Just close the tab, loser.',
    'Pure stubbornness, zero skill.',
  ],
  7: [
    "You know what's coming. You still won't survive it.",
    'I can practically hear your confidence disappearing.',
    'Go ahead. Make the same mistake again.',
    'Trust the next ledge. I dare you.',
    'Hesitated again. Saw it immediately.',
    'Your own brain is beating you now.',
  ],
  8: [
    "You've made it this far. What a waste of progress.",
    'I almost respect your persistence. Almost.',
    'Your suffering is becoming predictable.',
    'This is no longer a game — it’s a loop.',
    'Even the blades are bored of you.',
    'Keep folding. It’s hilarious.',
  ],
  9: [
    'Eighty levels and this is still your performance?',
    'Perhaps the exit is avoiding you.',
    'I would wish you luck, but that seems pointless.',
    'You do NOT belong in the 80s.',
    'Delusion looks terrible on you.',
    'Pack it up already.',
  ],
  10: [
    'So close to the end. Would be a shame to fall.',
    "You've survived 90 levels just to do THAT?",
    "Your determination is admirable. Your skills aren't.",
    'Hands shaking yet? Hilarious.',
    'One pixel off. Again.',
    'Turn back before 99 breaks you.',
  ],
  11: [
    'Oh, look. The almost-final level. How unfortunate.',
    "You didn't really think this would be easy?",
    'One more level. Try not to embarrass yourself.',
    '99% there and STILL choking.',
    'Almost doesn’t unlock 100.',
  ],
  12: [
    'You actually made it here?',
    "I wouldn't get comfortable.",
    "If you win this, I'll have nothing left to insult.",
    'Zero checkpoints. Back to pixel one.',
    'Nobody beats 100. Especially not you.',
  ],
};

const CHECKPOINT_INSULTS_BY_ACT: Record<PersonalityAct, readonly string[]> = {
  1: ['Saved! You’ll still find a way to fall.', 'A checkpoint? Already tired?', 'Don’t celebrate too early.'],
  2: ['Safe for two seconds. Enjoy it.', 'Even this flag doubts you.', 'Checkpoint reached. Next trap ready.'],
  3: ['Great, now I get to watch you fail from HERE.', 'You really needed a save point for that?', 'The flag is judging you too.'],
  4: ['That checkpoint is about to work overtime.', 'You’re going to see this pole twenty times.', 'Saved your progress. Can’t save your reflexes.'],
  5: ['The checkpoint has seen enough.', 'Hope you like this spot — you live here now.', 'Welcome to your new respawn home.'],
  6: ['No hints, barely a checkpoint. Good luck.', 'Save point logged. Humiliation scheduled.', 'At least you won’t have to redo THAT ugly jump.'],
  7: ['Sure that checkpoint is even going to save you?', 'You reached the flag. Now watch your confidence vanish.', 'Comfort is the first trap here.'],
  8: ['Halfway through the nightmare. Don’t choke.', 'I almost respect you reaching this flag. Almost.', 'Your new favorite respawn spot.'],
  9: ['Eighty levels deep and clinging to a flag.', 'This checkpoint is witnessing pure suffering.', 'Don’t get comfortable. The real trap is ahead.'],
  10: ['So close to the end. Would be a shame to fall.', 'Checkpoint saved. Your nerves? Not so much.', 'Surviving 90 levels just to camp here?'],
  11: ['You earned this checkpoint on 99. Now try not to choke.', 'Halfway through The Ultimate Test. Don’t blink.', 'One more stretch to 100. Try not to embarrass yourself.'],
  12: ['Checkpoints? On Level 100? Keep dreaming.'],
};

const REPEAT_MISTAKE_BY_ACT: Record<PersonalityAct, readonly string[]> = {
  1: ['Same spot again? Really?', "You're struggling with THIS?", 'That exact gap owns you now.'],
  2: ['You saw that coming and still walked into it?', 'Same trap, same jump, same result.', "Maybe the controls aren't the problem."],
  3: ['Another failure. How surprising.', 'You have the survival instincts of a potato.', 'This specific pixel owns your soul.'],
  4: ['That was painful to watch.', 'Your brain really took a day off.', "I've seen loading screens with better reflexes."],
  5: ['You keep proving me right.', 'At this point, failure is your personality.', 'The checkpoint has seen enough.'],
  6: ['Are you playing or conducting an experiment in failure?', 'I genuinely expected nothing, yet you disappointed me.', 'Same mistake? No hints are coming to save you.'],
  7: ['Go ahead. Make the same mistake again.', "You know what's coming. You still won't survive it.", 'I can practically hear your confidence disappearing.'],
  8: ['Your suffering is becoming predictable.', 'Same spot again. Truly tragic.', "You've made it this far. What a waste of progress."],
  9: ['Eighty levels and STILL dying to the same spot?', 'I would wish you luck, but that seems pointless.', 'Perhaps the exit is avoiding you.'],
  10: ["You've survived 90 levels just to repeat THAT mistake?", "Your determination is admirable. Your skills aren't.", 'So close to the end. Would be a shame to fall.'],
  11: ["You didn't really think this would be easy?", 'One more level. Try not to embarrass yourself.', 'Choking on the exact same pixel of 99? Brutal.'],
  12: ["I wouldn't get comfortable.", 'Back to pixel one. Again.', 'Rare to complete. Very common to fail right there.'],
};

const TRAP_INSULTS_BY_ACT: Record<PersonalityAct, readonly string[]> = {
  1: ['Haha, gotcha!', 'You really walked right into that?', 'Trusted the floor? Adorable.'],
  2: ['You saw that coming and still walked into it?', 'Impressive. Wrong, but impressive.', 'Fell for it immediately.'],
  3: ['You have the survival instincts of a potato.', 'Hook, line, and sinker.', 'Every single bait works on you.'],
  4: ['Your brain really took a day off.', 'That was painful to watch.', 'Walked straight into it. Classic.'],
  5: ['You keep proving me right.', 'Still falling for traps on Level 40+?', 'Pure gullibility.'],
  6: ['I genuinely expected nothing, yet you disappointed me.', 'No hints, no mercy, no survival.', 'Hooked again. Ruthless.'],
  7: ["You know what's coming. You still won't survive it.", 'Trust issues kicking in yet?', 'Go ahead. Trust the next one too.'],
  8: ['Your suffering is becoming predictable.', 'Every trap here has your name on it.', 'Fell for it in the 70s. Embarrassing.'],
  9: ['Eighty levels and still falling for THAT?', 'Perhaps the exit is avoiding you.', 'I would wish you luck, but that seems pointless.'],
  10: ["You've survived 90 levels just to do THAT?", 'Final Descent takes no prisoners.', 'So close. So gullible.'],
  11: ["You didn't really think this would be easy?", 'Level 99 does not forgive trust.', 'Oh, look. Another trap got you.'],
  12: ["I wouldn't get comfortable.", 'Welcome to Level 100. Trust nothing.', 'Everything in this room is lying to you.'],
};

const IDLE_INSULTS_BY_ACT: Record<PersonalityAct, readonly string[]> = {
  1: ['Hello? Jump button broken?', 'Scared of a tiny gap?', 'The exit isn’t coming to you.'],
  2: ["Maybe the controls aren't the problem.", 'Planning your next mistake?', 'Standing still won’t clear the level.'],
  3: ['Even the spikes are getting bored.', 'Did your controller disconnect or just your brain?', 'Take your time. I love waiting.'],
  4: ["I've seen loading screens with better reflexes.", 'Your brain really took a day off.', 'Staring at the trap won’t disarm it.'],
  5: ['The checkpoint has seen enough.', 'Freezing up already? Typical.', 'At this point, hesitation is your personality.'],
  6: ['Are you playing or conducting an experiment in failure?', 'No hints are going to appear. Move.', 'Staring won’t help after Level 50.'],
  7: ['I can practically hear your confidence disappearing.', 'Afraid of the next step? You should be.', 'Go ahead. Make the same mistake again.'],
  8: ['I almost respect your caution. Almost.', 'Your suffering is becoming predictable.', 'Still paralyzed in the 70s?'],
  9: ['Perhaps the exit is avoiding you.', 'I would wish you luck, but that seems pointless.', 'Move, or close the tab.'],
  10: ['Hands shaking too hard to move?', 'So close to the end. Move already.', "Your determination is admirable. Your skills aren't."],
  11: ['One more level. Try not to embarrass yourself.', 'Staring at Level 99 won’t beat it.', "You didn't really think this would be easy?"],
  12: ["I wouldn't get comfortable.", 'Level 100 waits for nobody.', "If you win this, I'll have nothing left to insult."],
};

const JUMP_SPAM_INSULTS_BY_ACT: Record<PersonalityAct, readonly string[]> = {
  1: ['Was that supposed to be a jump?', 'Calm down, kangaroo.', 'Spamming jump won’t save you.'],
  2: ['Impressive. Wrong, but impressive.', 'Button-mashing is not a strategy.', 'Maybe try aiming one of those jumps.'],
  3: ['Even the spikes are getting bored of your hopping.', 'Panic-jumping already?', 'You jump like a startled toaster.'],
  4: ['Your brain really took a day off.', 'That was painful to watch.', 'Every panic hop makes this funnier.'],
  5: ['You keep proving me right.', 'Your thumb has zero impulse control.', 'Panic-mashing on Level 40+. Classic.'],
  6: ['Are you playing or conducting an experiment in failure?', 'No hints, just pure panic hopping.', 'Stop mashing and start thinking.'],
  7: ['I can practically hear your confidence disappearing.', 'Panic jumps feed the traps.', "You know what's coming. Jumping wildly won't help."],
  8: ['Your suffering is becoming predictable.', 'Still button-mashing in the 70s?', 'Zero composure. Pure chaos.'],
  9: ['Eighty levels and still panic-hopping?', 'I would wish you luck, but that seems pointless.', 'Pure button-mashing terror.'],
  10: ['Hands shaking on the jump key?', "You've survived 90 levels just to mash?", "Your determination is admirable. Your skills aren't."],
  11: ['Panic-hopping on Level 99? Good luck.', 'One more level. Try not to embarrass yourself.'],
  12: ["I wouldn't get comfortable.", 'One panic jump on 100 and it’s back to pixel one.'],
};

// Measured ambient commentary (used sparingly on a long cooldown so it never feels spammy)
const CONTINUOUS_COMMENTARY_BY_ACT: Record<PersonalityAct, readonly string[]> = {
  1: [
    "You're struggling with THIS?",
    'Was that supposed to be a jump?',
    'Don’t trust the floor. Or do — it’s funnier.',
    'Watch your step. Actually, don’t.',
  ],
  2: [
    "Maybe the controls aren't the problem.",
    'Impressive. Wrong, but impressive.',
    'Go on, trust that platform.',
    'I’m already preparing my next insult.',
  ],
  3: [
    'You have the survival instincts of a potato.',
    'Even the spikes are getting bored.',
    'Let’s see how you ruin this run.',
    'Every move you make is deeply questionable.',
  ],
  4: [
    "I've seen loading screens with better reflexes.",
    'Your brain really took a day off.',
    'This is going to end badly. I can tell.',
    'Zero rhythm. Pure comedy.',
  ],
  5: [
    'The checkpoint has seen enough.',
    'You keep proving me right.',
    'At this point, failure is your personality.',
    'Hints vanish after 50. Savor them now.',
  ],
  6: [
    'I genuinely expected nothing, yet you disappointed me.',
    'Your last attempt was somehow better. Barely.',
    'No hints left. Just pure suffering.',
    'Watching this requires real patience.',
  ],
  7: [
    "You know what's coming. You still won't survive it.",
    'I can practically hear your confidence disappearing.',
    'Go ahead. Make the same mistake again.',
    'Every pixel ahead is lying to you.',
  ],
  8: [
    "You've made it this far. What a waste of progress.",
    'I almost respect your persistence. Almost.',
    'Your suffering is becoming predictable.',
    'Still refusing to close the tab, huh?',
  ],
  9: [
    'Eighty levels and this is still your performance?',
    'Perhaps the exit is avoiding you.',
    'I would wish you luck, but that seems pointless.',
    'You are way out of your depth here.',
  ],
  10: [
    'So close to the end. Would be a shame to fall.',
    "You've survived 90 levels just to do THAT?",
    "Your determination is admirable. Your skills aren't.",
    'One tiny slip and it all collapses.',
  ],
  11: [
    'Oh, look. The almost-final level. How unfortunate.',
    "You didn't really think this would be easy?",
    'One more level. Try not to embarrass yourself.',
  ],
  12: [
    'You actually made it here?',
    "I wouldn't get comfortable.",
    "If you win this, I'll have nothing left to insult.",
  ],
};

const MID_RUN_MOCKERY_BY_ACT: Record<PersonalityAct, readonly string[]> = {
  1: ['Almost there! Time to trip on nothing.', 'Wait — you’re actually still alive?'],
  2: ['Don’t get proud yet. The ending bites.', 'Watch you choke right before the door.'],
  3: ['Another failure incoming in 3... 2...', 'Careful — you usually fold right around here.'],
  4: ['That was surprisingly decent. Ruins my bet.', 'Choke incoming. I can feel it.'],
  5: ['Almost to the door — prove me right and fall.', 'You keep proving me right at the finish line.'],
  6: ['Your last attempt died right around here.', 'No hints left. Don’t blink now.'],
  7: ['I can practically hear your confidence disappearing.', 'Sure that exit ahead is real?'],
  8: ['I almost respect your persistence. Almost.', 'What a waste of progress this choke will be.'],
  9: ['Perhaps the exit is avoiding you.', 'Eighty levels deep — perfect time to slip.'],
  10: ['So close to the end. Would be a shame to fall.', 'Hands shaking yet? The door is right there.'],
  11: ['Almost at Level 100. Try not to embarrass yourself.', "You didn't really think this would be easy?"],
  12: ["I wouldn't get comfortable.", "If you win this, I'll have nothing left to insult."],
};

const VICTORY_QUIPS_BY_ACT: Record<PersonalityAct, readonly string[]> = {
  1: ['Pure luck. Next room will humble you.', 'Cleared? Even a pigeon could do that.'],
  2: ['Impressive. Ugly, but somehow alive.', 'Survived by pure panic.'],
  3: ['Even the spikes felt bad and let you pass.', 'Don’t celebrate — you barely scraped through.'],
  4: ['Took you long enough. Painful to watch.', 'Fluke clear. Next stage will fix that ego.'],
  5: ['The checkpoint is finally free from you.', 'Cleared, and somehow still unconvincing.'],
  6: ['Barely better than your last attempt.', 'No hints and you still stumbled across? Lucky.'],
  7: ['Survived the mind games. For now.', 'Go ahead, feel confident. The next stage loves that.'],
  8: ['I almost respect your persistence. Almost.', 'One nightmare down. Worse ones waiting.'],
  9: ['The exit couldn’t outrun you forever, I guess.', 'Still alive past 80? Concerning stubbornness.'],
  10: ['Final Descent survived... barely.', 'Closer to 99. Your nerves won’t hold.'],
  11: ['You beat Level 99?! Fine. Enter Level 100 and suffer.'],
  12: ['WAIT. YOU ACTUALLY BEAT THE GAME? I have nothing left to insult.'],
};

const HOME_INSULTS_BY_ACT: Record<PersonalityAct, readonly string[]> = {
  1: ['Aww, already scared of Level 1?', 'Click Play. Let’s watch you trip.', "You're struggling with THIS?"],
  2: ["Maybe the controls aren't the problem.", 'Ready to walk straight into another trap?', 'Impressive. Wrong, but impressive.'],
  3: ['You have the survival instincts of a potato.', 'Even the spikes miss bullying you.', 'Another failure awaits.'],
  4: ["I've seen loading screens with better reflexes.", 'Ready to embarrass yourself in the 30s?', 'Your brain back from its day off?'],
  5: ['The checkpoint has seen enough.', 'At this point, failure is your personality.', 'You keep proving me right.'],
  6: ['No hints left past 50. Good luck.', 'I genuinely expected nothing, yet here you are.', 'Conducting another experiment in failure?'],
  7: ['I can practically hear your confidence disappearing.', "You know what's coming. You still won't survive it.", 'Go ahead. Press Play.'],
  8: ["You've made it this far. What a waste of progress.", 'I almost respect your persistence. Almost.', 'Your suffering awaits.'],
  9: ['Eighty levels and still coming back?', 'Perhaps the exit is avoiding you.', 'I would wish you luck, but that seems pointless.'],
  10: ['So close to the end. Would be a shame to fall.', "Your determination is admirable. Your skills aren't.", 'The Final Descent is waiting.'],
  11: ['Oh, look. Level 99. How unfortunate.', "You didn't really think this would be easy?", 'One more level. Try not to embarrass yourself.'],
  12: ['You actually made it to Level 100?', "I wouldn't get comfortable.", "If you win this, I'll have nothing left to insult."],
};

export function getHomeStickmanInsults(levelId: number): readonly string[] {
  return HOME_INSULTS_BY_ACT[getPersonalityAct(levelId)] ?? HOME_INSULTS_BY_ACT[1];
}

/**
 * Cruel modal roast displayed inside the 'Get Hint' popup (Levels 1–50 ONLY).
 */
export function getCruelHintModalComment(levelId: number, deathsOnObstacle: number): string {
  const act = getPersonalityAct(levelId);
  if (act >= 5) {
    return deathsOnObstacle >= 5
      ? `${deathsOnObstacle} deaths on the same obstacle. The checkpoint has seen enough. Watch an ad for a sarcastic hint before hints disappear after Level 50.`
      : 'At this point, failure is your personality. Watch a rewarded ad to unlock a sarcastic hint (last stretch before hints vanish forever after Level 50).';
  }
  if (act === 4) {
    return deathsOnObstacle >= 5
      ? `${deathsOnObstacle} fails here? I've seen loading screens with better reflexes. Watch an ad to unlock a mocking hint.`
      : 'Your brain really took a day off on this jump. Watch a rewarded ad to unlock a sarcastic clue.';
  }
  if (act === 3) {
    return deathsOnObstacle >= 5
      ? `${deathsOnObstacle} deaths in one spot — even the spikes are getting bored. Watch an ad for a mocking clue.`
      : 'You have the survival instincts of a potato. Watch a rewarded ad for a sarcastic hint.';
  }
  if (act === 2) {
    return deathsOnObstacle >= 4
      ? `${deathsOnObstacle} fails already. Maybe the controls aren't the problem. Watch a rewarded ad for a hint.`
      : 'You saw that coming and still walked into it? Watch an ad to unlock a sarcastic hint.';
  }
  return deathsOnObstacle >= 3
    ? `Aww, already died ${deathsOnObstacle} times here? Watch a rewarded ad to unlock a sarcastic hint.`
    : "You're struggling with THIS? Watch a rewarded ad to unlock a sarcastic hint.";
}

export function pickEscalatingStickmanInsult(
  category: StickmanInsultCategory,
  levelId: number,
  levelDeaths = 0,
): string {
  const act = getPersonalityAct(levelId);

  if (category === 'checkpoint') {
    return pickFreshLine(CHECKPOINT_INSULTS_BY_ACT[act]);
  }
  if (category === 'repeat_mistake') {
    return pickFreshLine(REPEAT_MISTAKE_BY_ACT[act]);
  }
  if (category === 'trap') {
    return pickFreshLine(TRAP_INSULTS_BY_ACT[act]);
  }
  if (category === 'idle') {
    return pickFreshLine(IDLE_INSULTS_BY_ACT[act]);
  }
  if (category === 'jump_spam') {
    return pickFreshLine(JUMP_SPAM_INSULTS_BY_ACT[act]);
  }

  // Respawn reaction (cruel from Level 1, contextual to death count & stage)
  if (levelDeaths === 1 && act === 1) {
    return pickFreshLine(['Aww, already dead?', 'Was that supposed to be a jump?', "You're struggling with THIS?"]);
  }
  if (levelDeaths >= 6 && Math.random() < 0.42) {
    return pickFreshLine(REPEAT_MISTAKE_BY_ACT[act]);
  }
  return pickFreshLine(RESPAWN_INSULTS_BY_ACT[act]);
}

export function pickContinuousStickmanComment(
  levelId: number,
  levelDeaths = 0,
  progress = 0,
): string {
  const act = getPersonalityAct(levelId);
  if (progress >= 0.7 && Math.random() < 0.4) {
    return pickMidRunMockery(levelId, 'late');
  }
  if (levelDeaths >= 5 && Math.random() < 0.35) {
    return pickFreshLine(REPEAT_MISTAKE_BY_ACT[act]);
  }
  return pickFreshLine(CONTINUOUS_COMMENTARY_BY_ACT[act]);
}

export function pickMidRunMockery(levelId: number, stage: 'mid' | 'late'): string {
  if (levelId === 100) {
    return stage === 'mid'
      ? "I wouldn't get comfortable."
      : "If you win this, I'll have nothing left to insult.";
  }
  if (levelId === 99) {
    return stage === 'mid'
      ? "You didn't really think this would be easy?"
      : 'One more level. Try not to embarrass yourself.';
  }
  const act = getPersonalityAct(levelId);
  return pickFreshLine(MID_RUN_MOCKERY_BY_ACT[act]);
}

export function pickLevelEntryTaunt(levelId: number): string {
  if (levelId === 100) {
    return 'You actually made it here?';
  }
  if (levelId === 99) {
    return 'Oh, look. The almost-final level. How unfortunate.';
  }
  const stage = getDifficultyStage(levelId);
  if (levelId === 51) {
    return 'Level 51. Hints are gone forever. Good luck.';
  }
  if (levelId === 18) {
    return 'Lights out. Hope your memory works better than your jumps.';
  }
  const act = stage.id;
  if (act === 1) return levelId === 1 ? "You're struggling with THIS already? Let's see." : `Level ${levelId}. Try not to embarrass yourself.`;
  if (act === 2) return `Level ${levelId}. Maybe the controls aren't the problem.`;
  if (act === 3) return `Level ${levelId}. Even the spikes are ready for you.`;
  if (act === 4) return `Level ${levelId}. Let's see if your brain showed up today.`;
  if (act === 5) return `Level ${levelId}. The checkpoint is already tired of you.`;
  if (act === 6) return `Level ${levelId}. Zero hints. Pure Ruthlessness.`;
  if (act === 7) return `Level ${levelId}. I can already hear your confidence slipping.`;
  if (act === 8) return `Level ${levelId}. Welcome to The Nightmare.`;
  if (act === 9) return `Level ${levelId}. Eighty-plus levels and zero mercy.`;
  return `Level ${levelId}. So close to the end. Would be a shame to fall.`;
}

export function pickDeathMessage(
  cause: DeathCause,
  repeatCount: number,
  levelId = 1,
  levelDeaths = 1,
  progress = 0,
): string {
  const act = getPersonalityAct(levelId);

  if (levelId === 100) {
    return pickFreshLine(ACT_DEATH_MESSAGES[12]);
  }
  if (levelId === 99) {
    return pickFreshLine(ACT_DEATH_MESSAGES[11]);
  }
  if (act === 1 && levelDeaths === 1) {
    return pickFreshLine(['Aww, already dead?', 'Was that supposed to be a jump?', "You're struggling with THIS?"]);
  }
  if (progress >= 0.74 && Math.random() < 0.5) {
    return pickFreshLine(MID_RUN_MOCKERY_BY_ACT[act]);
  }
  if (repeatCount >= 2 && Math.random() < 0.58) {
    return pickFreshLine(REPEAT_MISTAKE_BY_ACT[act]);
  }
  const causePool = CAUSE_DEATH_MESSAGES[cause] ?? [];
  if (causePool.length > 0 && Math.random() < 0.34) {
    return pickFreshLine(causePool);
  }
  return pickFreshLine(ACT_DEATH_MESSAGES[act] ?? GENERAL_DEATH_MESSAGES);
}

export function pickVictoryQuip(deathsInLevel: number, levelId = 1): string {
  if (levelId === 100) {
    return 'WAIT. YOU ACTUALLY BEAT THE GAME?';
  }
  if (levelId === 99) {
    return 'You survived Level 99?! Fine. Welcome to The Last Level.';
  }
  if (deathsInLevel === 0) {
    return levelId >= 51
      ? 'Zero deaths with zero hints? Suspicious.'
      : 'Zero deaths? Pure luck. Next stage fixes that.';
  }
  if (deathsInLevel >= 15) {
    return `${deathsInLevel} deaths just for THAT. Stubbornness isn’t talent.`;
  }
  return pickFreshLine(VICTORY_QUIPS_BY_ACT[getPersonalityAct(levelId)]);
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

export function pickDeathStreakStickmanComment(
  milestone: DeathStreakMilestone,
  levelId: number,
): DeathStreakMockery {
  const lvLabel = String(levelId).padStart(2, '0');
  const act = getPersonalityAct(levelId);
  const stage = getDifficultyStage(levelId);

  if (milestone === 5) {
    const bubble = pickFreshLine(REPEAT_MISTAKE_BY_ACT[act]);
    const taunt =
      act >= 11
        ? `5 straight deaths on Level ${lvLabel}. You didn't really think this would be easy?`
        : `5 straight deaths on Level ${lvLabel}. ${pickFreshLine(ACT_DEATH_MESSAGES[act])}`;
    return {
      milestone: 5,
      bubble,
      taunt,
      banner: `5x DEATH STREAK · ${stage.name.toUpperCase()}`,
    };
  }

  if (milestone === 10) {
    const bubble = pickFreshLine(RESPAWN_INSULTS_BY_ACT[act]);
    const taunt = `10 straight failures on Level ${lvLabel}. ${pickFreshLine(ACT_DEATH_MESSAGES[act])}`;
    return {
      milestone: 10,
      bubble,
      taunt,
      banner: `10x DEATH STREAK · DOUBLE-DIGIT FAILURE`,
    };
  }

  const bubble = pickFreshLine(ACT_DEATH_MESSAGES[act]);
  const taunt = `20 straight deaths on Level ${lvLabel}. At this point, failure is your personality.`;
  return {
    milestone: 20,
    bubble,
    taunt,
    banner: `20x DEATH STREAK · PURE STUBBORNNESS`,
  };
}
