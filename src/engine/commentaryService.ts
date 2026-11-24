import {
  getCruelHintModalComment,
  getDeathStreakMilestone,
  pickContinuousStickmanComment,
  pickDeathMessage,
  pickDeathStreakStickmanComment,
  pickEscalatingStickmanInsult,
  pickLevelEntryTaunt,
  pickMidRunMockery,
  pickVictoryQuip,
  type DeathStreakMilestone,
} from '../data/deathMessages';
import { getDifficultyStage, type DifficultyStageMeta } from '../data/difficultyStages';
import { getRandomDeathTaunt } from '../data/taunts';
import type { DeathCause } from '../types/game';

/** Core game event categories explicitly mapped across all 100 levels. */
export type InsultEventCategory = 'death' | 'repeat_failure' | 'victory';

export type CommentaryTrigger =
  | 'level_entry'
  | 'death'
  | 'repeat_failure'
  | 'repeat_mistake'
  | 'trap'
  | 'fake_exit'
  | 'near_exit'
  | 'fake_reward'
  | 'checkpoint'
  | 'idle'
  | 'jump_spam'
  | 'mid_run'
  | 'late_run'
  | 'ambient'
  | 'victory';

export interface LevelRangeInsultCategory {
  id: number;
  label: string;
  minLevel: number;
  maxLevel: number;
  tone: string;
  insults: Record<InsultEventCategory, readonly string[]>;
}

export interface CommentaryContext {
  levelId: number;
  levelDeaths?: number;
  levelDeathStreak?: number;
  totalDeaths?: number;
  progressRatio?: number;
  repeatObstacleCount?: number;
  deathCause?: DeathCause;
  elapsedMs?: number;
  jumpsUsed?: number;
  quickDeaths?: number;
  /** Bypass global/category cooldowns (used for level entry, deaths, streak milestones, checkpoints, victory). */
  force?: boolean;
  /** Optional timestamp in ms (defaults to Date.now()) for deterministic timing & testing. */
  nowMs?: number;
}

export interface CommentaryRemark {
  text: string;
  durationSec: number;
  trigger: CommentaryTrigger;
  category: LevelRangeInsultCategory;
  stage: DifficultyStageMeta;
  streakMilestone: DeathStreakMilestone | null;
  banner?: string;
  bannerDurationSec?: number;
}

export interface DeathCommentaryBundle {
  bubble: string;
  bubbleDurationSec: number;
  deathMessage: string;
  deathMessageDurationSec: number;
  streakMilestone: DeathStreakMilestone | null;
  banner: string | null;
  bannerDurationSec: number;
  category: LevelRangeInsultCategory;
  stage: DifficultyStageMeta;
}

export interface HudDeathTauntResult {
  text: string;
  durationMs: number;
  streakMilestone: DeathStreakMilestone | null;
}

/**
 * Structured insult categories linked explicitly to level ranges (1–100)
 * and core gameplay events (death, repeat_failure, victory).
 * Cruel and sarcastic from Level 1, escalating relentlessly to Level 100.
 */
export const LEVEL_RANGE_INSULT_CATEGORIES: readonly LevelRangeInsultCategory[] = [
  {
    id: 1,
    label: 'The Beginning (1–10)',
    minLevel: 1,
    maxLevel: 10,
    tone: 'Mocking',
    insults: {
      death: [
        'Aww, already dead on the tutorial floors?',
        'Was that supposed to be a jump or a polite surrender?',
        "You're struggling with THIS? Wait until Level 11.",
        'Gravity barely woke up and still cooked you.',
        'You really trusted that floor? Adorable.',
      ],
      repeat_failure: [
        'Same exact gap again? Really?',
        'Three tries on a beginner trap. Inspiring.',
        'That one spike owns the deed to your ego now.',
        'Maybe try jumping slightly BEFORE falling into the void.',
      ],
      victory: [
        'Pure beginner luck. Enjoy it while it lasts.',
        'Cleared! Even a blindfolded pigeon could manage that.',
        'Congrats, you survived the warm-up. Barely.',
      ],
    },
  },
  {
    id: 2,
    label: 'The Trap (11–20)',
    minLevel: 11,
    maxLevel: 20,
    tone: 'Sarcastic',
    insults: {
      death: [
        'You saw that coming and still walked straight into it?',
        'Impressive. Completely wrong, but impressive.',
        "Maybe the controls aren't the problem here.",
        'The trap barely moved and still caught you flat-footed.',
        'Bold plan: face-plant into danger at full speed.',
      ],
      repeat_failure: [
        'Same trap, same jump, exact same funeral.',
        'You keep testing if that spike turned friendly. It didn’t.',
        'Are you memorizing the trap or marrying it?',
        'Fool me once, shame on the trap. Fool you four times? Yikes.',
      ],
      victory: [
        'Ugly clear, zero grace, somehow still counts.',
        'You stumbled across the finish line by pure panic.',
        'Survived The Trap. Don’t worry, worse lies ahead.',
      ],
    },
  },
  {
    id: 3,
    label: 'The Deception (21–30)',
    minLevel: 21,
    maxLevel: 30,
    tone: 'Insulting',
    insults: {
      death: [
        'You have the survival instincts of a boiled potato.',
        'Another failure. Truly shocking development.',
        'Even the spikes are getting bored of poking you.',
        'I am six ink lines and visibly smarter than you.',
        'Your thumbs are actively conspiring against your brain.',
      ],
      repeat_failure: [
        'This single pixel owns your entire afternoon.',
        'How many funerals does one obstacle need?',
        'Doing the exact same jump expecting a miracle. Classic.',
        'Your muscle memory is exclusively memorizing failure.',
      ],
      victory: [
        'Even the traps felt embarrassed and let you pass.',
        'Don’t celebrate — that clear was an accidental miracle.',
        'You beat the deception, mostly by stumbling sideways.',
      ],
    },
  },
  {
    id: 4,
    label: 'The Betrayal (31–40)',
    minLevel: 31,
    maxLevel: 40,
    tone: 'Brutal',
    insults: {
      death: [
        "I've seen loading screens with faster reflexes.",
        'Your brain officially clocked out mid-jump.',
        'That attempt was genuinely painful to witness.',
        'Confidence: 100%. Timing: legally nonexistent.',
        'Every betrayal works because you refuse to adapt.',
      ],
      repeat_failure: [
        'Watching you fail this same spot is free stand-up comedy.',
        'The level is reading you like a toddler picture book.',
        'Same mistake again. Your reflexes filed for retirement.',
        'You’re not stuck on a hard trap — you’re stuck on yourself.',
      ],
      victory: [
        'Took you long enough. My ink almost dried waiting.',
        'Fluke clear. The next betrayal will humble you instantly.',
        'You survived, though calling that "skill" is generous.',
      ],
    },
  },
  {
    id: 5,
    label: 'The Frustration (41–50)',
    minLevel: 41,
    maxLevel: 50,
    tone: 'Cruel',
    insults: {
      death: [
        'The checkpoint has seen enough of your tragedy.',
        'You keep proving my lowest expectations right.',
        'At this point, failure is your whole personality.',
        'Halfway to 100 and already crumbling like dry toast.',
        'Remember: hints disappear forever after Level 50.',
      ],
      repeat_failure: [
        'That obstacle should start charging you monthly rent.',
        'Your stickman is embarrassed to share a screen with you.',
        'Still dying right there? Hints won’t save you after 50.',
        'Pure stubbornness, zero adjustment, identical splat.',
      ],
      victory: [
        'The checkpoint is finally free from seeing your face.',
        'Cleared — and somehow still deeply unconvincing.',
        'Enjoy that win before hints vanish forever past 50.',
      ],
    },
  },
  {
    id: 6,
    label: 'The Torture (51–60)',
    minLevel: 51,
    maxLevel: 60,
    tone: 'Ruthless',
    insults: {
      death: [
        'I expected nothing and you still underdelivered.',
        'No hints left. Just you and your terrible instincts.',
        'Are you playing a platformer or farming deaths?',
        'Your previous attempt was somehow less embarrassing. Barely.',
        'You die faster than the traps can even reset.',
      ],
      repeat_failure: [
        'No hint button is coming to rescue you here. Figure it out.',
        'Conducting a scientific study in repeating one mistake?',
        'Same jump, same death, zero hints, zero mercy.',
        'Delete your muscle memory and try again from scratch.',
      ],
      victory: [
        'No hints and you still stumbled across? Pure fluke.',
        'Barely cleaner than your last twelve disasters.',
        'One torture room down. Forty more waiting to break you.',
      ],
    },
  },
  {
    id: 7,
    label: 'Psychological Warfare (61–70)',
    minLevel: 61,
    maxLevel: 70,
    tone: 'Psychological Mockery',
    insults: {
      death: [
        "You know what's coming and you still can't survive it.",
        'I can practically hear your confidence evaporating.',
        'Second-guessing every pixel yet? Good.',
        'You hesitated for half a frame and threw the entire run.',
        'Your own paranoia is doing half my job for me.',
      ],
      repeat_failure: [
        'Go ahead. Make the exact same mistake one more time.',
        'Overthinking it now, aren’t you? I can tell.',
        'You know the trick, you fear the trick, you die to the trick.',
        'Trust the next platform. I dare you.',
      ],
      victory: [
        'Survived the mind games. For about five seconds.',
        'Go ahead, feel proud. The next level feeds on confidence.',
        'Your nerves barely survived that room.',
      ],
    },
  },
  {
    id: 8,
    label: 'The Nightmare (71–80)',
    minLevel: 71,
    maxLevel: 80,
    tone: 'Merciless',
    insults: {
      death: [
        "You've made it this far just to play like THAT?",
        'I almost respect your persistence. Almost.',
        'Your suffering has become completely predictable.',
        'Close the tab before your thumbs file a formal complaint.',
        'Every death proves why this game is named after you.',
      ],
      repeat_failure: [
        'This isn’t gameplay anymore — it’s a humiliation loop.',
        'Same spot in the 70s. Truly tragic dedication.',
        'Even the buzzsaws look bored of slicing you here.',
        'What a magnificent waste of seventy levels of progress.',
      ],
      victory: [
        'One nightmare escaped. Worse ones already loaded.',
        'I almost respected that clear. Almost.',
        'You dragged yourself across the line by pure spite.',
      ],
    },
  },
  {
    id: 9,
    label: 'The Impossible (81–90)',
    minLevel: 81,
    maxLevel: 90,
    tone: 'Maximum Cruelty',
    insults: {
      death: [
        'Eighty levels in and this is still your execution?',
        'Perhaps the exit door is actively avoiding you.',
        'I would wish you luck, but that feels mathematically pointless.',
        'You are NEVER surviving the 90s moving like that.',
        'Watching your pride dissolve pixel by pixel is pure art.',
      ],
      repeat_failure: [
        'Eighty levels deep and still donating lives to one tile?',
        'Pack it up. This obstacle clearly outranks you.',
        'Delusion looks terrible on you this late in the game.',
        'Keep clicking retry — the fail counter loves your loyalty.',
      ],
      victory: [
        'The exit couldn’t outrun your stubbornness forever.',
        'Still alive past Level 80? Deeply concerning persistence.',
        'Cleared The Impossible, somehow without looking competent.',
      ],
    },
  },
  {
    id: 10,
    label: 'The Final Descent (91–98)',
    minLevel: 91,
    maxLevel: 98,
    tone: 'Final Descent',
    insults: {
      death: [
        'So close to the end. Would be a shame to fall.',
        "You've survived 90 levels just to choke on THAT?",
        "Your determination is admirable. Your reflexes aren't.",
        'Hands shaking yet? You do not belong up here.',
        'One pixel off. Welcome to The Final Descent.',
      ],
      repeat_failure: [
        'Survived 90 levels just to camp permanently on this jump?',
        'Every repeat death brings your morale closer to zero.',
        'Turn back before Level 99 finishes what is left of your ego.',
        'So close to 99, yet stuck in a loop like a beginner.',
      ],
      victory: [
        'Final Descent survived... by the thickness of a single pixel.',
        'One step closer to Level 99. Your nerves won’t survive it.',
        'Unbelievable. Still messy, but somehow still breathing.',
      ],
    },
  },
  {
    id: 11,
    label: 'The Ultimate Test (99)',
    minLevel: 99,
    maxLevel: 99,
    tone: 'The Ultimate Test',
    insults: {
      death: [
        'Oh, look. Level 99. How deeply unfortunate for you.',
        "You didn't really think The Ultimate Test would be kind?",
        'One more level after this. Try not to embarrass yourself.',
        '99% of the way there and 100% choking.',
        'Almost does NOT unlock Level 100.',
      ],
      repeat_failure: [
        'Choking on the exact same pixel of Level 99? Brutal.',
        'Level 100 is right behind this door, and you still can’t pass.',
        'The Ultimate Test is grading you an F-minus on repeat.',
      ],
      victory: [
        'You actually beat Level 99?! Fine. Enter Level 100 and suffer.',
        'Okay, I admit nothing. Now go lose on Level 100.',
      ],
    },
  },
  {
    id: 12,
    label: 'The Last Level (100)',
    minLevel: 100,
    maxLevel: 100,
    tone: 'The Last Level',
    insults: {
      death: [
        'Zero checkpoints. Zero hints. Back to pixel one.',
        "I wouldn't get comfortable on Level 100.",
        'Almost nobody beats Level 100. Definitely not like that.',
        'You made it all the way here just to meet pixel one again.',
      ],
      repeat_failure: [
        'Rare to complete. Extremely common to die right there.',
        'Back to pixel one. Again. Level 100 takes no prisoners.',
        'Every reset on 100 erases everything. Delicious.',
      ],
      victory: [
        "WAIT. YOU ACTUALLY BEAT LEVEL 100? I have nothing left to insult.",
        'Impossible. You cleared the entire game. Fine — you win, legend.',
      ],
    },
  },
];

/** Per-category minimum cooldowns (ms) so no single trigger feels spammy. */
const CATEGORY_COOLDOWN_MS: Record<CommentaryTrigger, number> = {
  level_entry: 0,
  death: 1600,
  repeat_failure: 1800,
  repeat_mistake: 1800,
  trap: 4200,
  fake_exit: 1500,
  near_exit: 5500,
  fake_reward: 3800,
  checkpoint: 4500,
  idle: 9500,
  jump_spam: 6800,
  mid_run: 6500,
  late_run: 6000,
  ambient: 10500,
  victory: 0,
};

/** Global spacing (ms) between non-forced stickman remarks. */
const GLOBAL_COOLDOWN_MS: Record<CommentaryTrigger, number> = {
  level_entry: 3600,
  death: 3600,
  repeat_failure: 3800,
  repeat_mistake: 3800,
  trap: 4500,
  fake_exit: 3400,
  near_exit: 4200,
  fake_reward: 4200,
  checkpoint: 4800,
  idle: 5500,
  jump_spam: 5000,
  mid_run: 5800,
  late_run: 5500,
  ambient: 6500,
  victory: 3000,
};

const RECENT_HISTORY_LIMIT = 16;
/** Per-line cooldown (ms) preventing the same insult from reappearing too soon. */
const LINE_REPEAT_COOLDOWN_MS = 45000;

// Performance-aware cruel pools that layer on top of level-range dialogue
const FLAWLESS_RUN_MOCKERY: readonly string[] = [
  'Zero deaths so far? Relax, the trap ahead will fix that.',
  'Suspiciously clean run. You definitely looked up a guide.',
  'No deaths yet? Don’t worry, you always choke near the exit.',
  'Playing carefully? Cute. Let’s see how long that lasts.',
  'Still zero fails? The level hasn’t even started trying yet.',
];

const QUICK_DEATH_MOCKERY: readonly string[] = [
  'Back already? That run lasted three seconds.',
  'Speedrunning straight into the respawn screen. Bold.',
  'You didn’t even warm up the floor before dying.',
  'New personal record for failing immediately.',
  'Respawn, sprint, die. Truly inspiring loop.',
];

const LATE_CHOKE_MOCKERY: readonly string[] = [
  'Died right at the finish line? Pure art.',
  'So close to the exit, yet still completely hopeless.',
  'All that progress just to fold in the final stretch.',
  'The door literally waved goodbye as you fell.',
  'Choking at 80% is your signature move.',
];

const CHRONIC_REPEAT_MOCKERY: readonly string[] = [
  "At this point, I'm just watching.",
  'Same exact spot AGAIN? Are you trying to befriend that trap?',
  'Einstein had a quote about doing the same thing over and over.',
  'That obstacle is charging you rent at this point.',
  'Have you considered literally any other timing?',
  'Five-star loyalty to the exact same mistake.',
];

const FAKE_EXIT_MOCKERY: readonly string[] = [
  'You really believed that? Adorable.',
  'Finally! Oh, wait...',
  'Thought the level was over? Cute.',
  'The door saw you coming and filed a restraining order.',
  'One step from victory — and reality just changed its mind.',
  'Never trust a doorway in this game, genius.',
];

const NEAR_EXIT_MOCKERY: readonly string[] = [
  'Finally! Oh, wait...',
  "Don't celebrate yet. You haven't touched it.",
  'Sure that door is actually real?',
  'One jump away from either victory or total humiliation.',
];

const PIT_MISS_MOCKERY: readonly string[] = [
  'Gravity wins again. Congratulations.',
  'You jumped over nothing and landed in everything.',
  'The void sends its warmest regards.',
  'Nice leap. Completely missed the actual platform, though.',
];

const SURVIVED_SECTION_MOCKERY: readonly string[] = [
  "Don't get excited. You're still terrible.",
  'Congrats on surviving one jump. The worse part is next.',
  'Barely made it. My expectations remain underground.',
];

const VICTORY_SNARK_EXTRAS: readonly string[] = [
  "Lucky. Don't let it get to your head.",
  'Pure accident. Next level will erase that smile.',
];

const FAKE_REWARD_MOCKERY: readonly string[] = [
  'Ooh, shiny bait! And you fell for it instantly.',
  'You really thought this game would give you a free reward?',
  'Greed: 1. Survival instincts: 0.',
  'Nothing in this game is free, genius.',
  'Saw something glowing and switched your brain right off.',
];

const HIGH_TOTAL_DEATH_MOCKERY: readonly string[] = [
  'Your total fail counter is practically a phone number now.',
  'Hundreds of deaths and still refusing to learn.',
  'At this rate, the death counter is going to overflow.',
  'Most players quit fifty deaths ago. Not sure if I respect or pity you.',
];

function clampLevelId(levelId: number): number {
  if (!Number.isFinite(levelId)) return 1;
  return Math.max(1, Math.min(100, Math.floor(levelId)));
}

function normalizeTriggerKey(trigger: CommentaryTrigger): CommentaryTrigger {
  return trigger === 'repeat_mistake' ? 'repeat_failure' : trigger;
}

/**
 * Resolves the insult category definition for any level 1–100.
 */
export function getLevelRangeInsultCategory(levelId: number): LevelRangeInsultCategory {
  const clamped = clampLevelId(levelId);
  return (
    LEVEL_RANGE_INSULT_CATEGORIES.find(
      (cat) => clamped >= cat.minLevel && clamped <= cat.maxLevel,
    ) ?? LEVEL_RANGE_INSULT_CATEGORIES[0]
  );
}

/**
 * Centralized Stickman Commentary Service (Levels 1–100).
 *
 * Manages sarcastic, context-aware stickman insults with:
 * - Explicit insult categories linked to level ranges (1–100) and game events
 *   (death, repeat_failure, victory, plus traps, checkpoints, idle, jump-spam, ambient)
 * - Global cooldown, per-category cooldown, and per-line cooldown + history buffer
 *   to guarantee variety and prevent repetitive or spammy dialogue.
 */
export class CommentaryService {
  private recentHistory: string[] = [];
  private lastLineUsedAt = new Map<string, number>();
  private lastGlobalRemarkAt = -Infinity;
  private activeGlobalCooldownMs = 0;
  private lastTriggerAt = new Map<CommentaryTrigger, number>();
  private lastHudTaunt: string | null = null;
  private currentLevelId = 1;
  private restartsOnCurrentLevel = 0;

  /** Returns the level-range insult category (1–100) for the given level. */
  public getLevelRangeCategory(levelId: number): LevelRangeInsultCategory {
    return getLevelRangeInsultCategory(levelId);
  }

  /**
   * Resets global/category cooldowns when loading or restarting a level.
   * Keeps recent line memory & per-line cooldowns intact so retries stay varied.
   */
  public resetForLevel(levelId: number, isRestart = false): void {
    const normalized = clampLevelId(levelId);
    if (isRestart && normalized === this.currentLevelId) {
      this.restartsOnCurrentLevel += 1;
    } else {
      this.currentLevelId = normalized;
      this.restartsOnCurrentLevel = 0;
    }
    this.lastGlobalRemarkAt = -Infinity;
    this.activeGlobalCooldownMs = 0;
    this.lastTriggerAt.clear();
  }

  /** Clears all cooldowns and dialogue memory (primarily for tests or fresh sessions). */
  public resetAll(): void {
    this.recentHistory = [];
    this.lastLineUsedAt.clear();
    this.lastGlobalRemarkAt = -Infinity;
    this.activeGlobalCooldownMs = 0;
    this.lastTriggerAt.clear();
    this.lastHudTaunt = null;
    this.currentLevelId = 1;
    this.restartsOnCurrentLevel = 0;
  }

  /** Returns remaining cooldown in ms (0 if ready) for a non-forced trigger. */
  public getRemainingCooldownMs(trigger: CommentaryTrigger, nowMs = Date.now()): number {
    const key = normalizeTriggerKey(trigger);
    let remaining = 0;

    if (this.lastGlobalRemarkAt !== -Infinity && nowMs >= this.lastGlobalRemarkAt) {
      const globalLeft = this.activeGlobalCooldownMs - (nowMs - this.lastGlobalRemarkAt);
      if (globalLeft > remaining) remaining = globalLeft;
    }

    const lastForCategory = this.lastTriggerAt.get(key);
    if (lastForCategory !== undefined && nowMs >= lastForCategory) {
      const categoryWait = CATEGORY_COOLDOWN_MS[key] ?? 4000;
      const catLeft = categoryWait - (nowMs - lastForCategory);
      if (catLeft > remaining) remaining = catLeft;
    }

    return Math.max(0, remaining);
  }

  /** Returns whether a non-forced trigger is allowed by both global & per-category cooldowns. */
  public canTrigger(trigger: CommentaryTrigger, nowMs = Date.now()): boolean {
    return this.getRemainingCooldownMs(trigger, nowMs) === 0;
  }

  /**
   * Returns a balanced interval (in seconds) before the next ambient stickman comment.
   * Keeps remarks present without ever becoming noisy or repetitive.
   */
  public getNextAmbientDelaySeconds(levelId: number, levelDeaths = 0): number {
    const clamped = clampLevelId(levelId);
    const stageFactor = clamped >= 81 ? 0.9 : clamped >= 51 ? 0.95 : 1.0;
    const struggleBoost = levelDeaths >= 6 ? -1.0 : 0;
    const base = Math.max(8.5, (10.8 + struggleBoost) * stageFactor);
    return base + Math.random() * 4.2;
  }

  /**
   * High-level helper for core game events (`death`, `repeat_failure`, `victory`).
   * Enforces cooldowns (unless `ctx.force` is true) and selects varied level-range insults.
   */
  public getInsultForEvent(
    event: InsultEventCategory,
    ctx: CommentaryContext,
  ): CommentaryRemark | null {
    return this.requestRemark(event, ctx);
  }

  /**
   * Requests a context-aware sarcastic remark for any gameplay event.
   * Returns `null` when suppressed by active cooldowns (unless `ctx.force` is true).
   */
  public requestRemark(
    trigger: CommentaryTrigger,
    ctx: CommentaryContext,
  ): CommentaryRemark | null {
    const nowMs = ctx.nowMs ?? Date.now();
    const levelId = clampLevelId(ctx.levelId);
    const stage = getDifficultyStage(levelId);
    const category = getLevelRangeInsultCategory(levelId);
    const normalizedTrigger = normalizeTriggerKey(trigger);

    if (!ctx.force && !this.canTrigger(normalizedTrigger, nowMs)) {
      return null;
    }

    const text = this.selectFreshRemark(
      normalizedTrigger,
      { ...ctx, levelId, nowMs },
      category,
      stage,
    );
    const durationSec = this.computeBubbleDuration(normalizedTrigger, levelId, text);

    this.recordEmission(normalizedTrigger, text, nowMs);

    return {
      text,
      durationSec,
      trigger: normalizedTrigger,
      category,
      stage,
      streakMilestone: null,
    };
  }

  /**
   * Produces the full death commentary bundle (stickman speech bubble, death banner text,
   * and streak milestone escalation) while updating cooldowns and variety memory.
   */
  public getDeathCommentary(ctx: CommentaryContext): DeathCommentaryBundle {
    const nowMs = ctx.nowMs ?? Date.now();
    const levelId = clampLevelId(ctx.levelId);
    const stage = getDifficultyStage(levelId);
    const category = getLevelRangeInsultCategory(levelId);
    const levelDeaths = ctx.levelDeaths ?? 1;
    const levelDeathStreak = ctx.levelDeathStreak ?? levelDeaths;
    const repeatCount = ctx.repeatObstacleCount ?? 0;
    const progress = ctx.progressRatio ?? 0;
    const cause: DeathCause = ctx.deathCause ?? 'spike';

    const streakMilestone = getDeathStreakMilestone(levelDeathStreak);
    if (streakMilestone) {
      const streak = pickDeathStreakStickmanComment(streakMilestone, levelId);
      const bubble = this.rememberLine(streak.bubble, nowMs);
      const bubbleDurationSec =
        streakMilestone === 20 ? 5.4 : streakMilestone === 10 ? 4.6 : 4.0;
      const bannerDurationSec =
        streakMilestone === 20 ? 5.2 : streakMilestone === 10 ? 4.5 : 3.8;

      this.recordEmission('death', bubble, nowMs);

      return {
        bubble,
        bubbleDurationSec,
        deathMessage: streak.taunt,
        deathMessageDurationSec: 4.4,
        streakMilestone,
        banner: streak.banner,
        bannerDurationSec,
        category,
        stage,
      };
    }

    const trigger: CommentaryTrigger = repeatCount >= 2 ? 'repeat_failure' : 'death';
    const bubble = this.selectFreshRemark(
      trigger,
      {
        ...ctx,
        levelId,
        levelDeaths,
        levelDeathStreak,
        repeatObstacleCount: repeatCount,
        progressRatio: progress,
        deathCause: cause,
        nowMs,
      },
      category,
      stage,
    );

    let deathMessage = pickDeathMessage(cause, repeatCount, levelId, levelDeaths, progress);
    if (deathMessage === bubble) {
      deathMessage = this.pickNonRepeating(
        () => pickDeathMessage(cause, repeatCount, levelId, levelDeaths, progress),
        nowMs,
        [bubble],
      );
    }

    this.recordEmission(trigger, bubble, nowMs);

    return {
      bubble,
      bubbleDurationSec: 3.1,
      deathMessage,
      deathMessageDurationSec: 3.2,
      streakMilestone: null,
      banner: null,
      bannerDurationSec: 0,
      category,
      stage,
    };
  }

  /**
   * Produces a context-aware victory remark linked to level range and death count.
   */
  public getVictoryCommentary(ctx: CommentaryContext): CommentaryRemark {
    const remark = this.requestRemark('victory', { ...ctx, force: true });
    if (remark) return remark;
    const levelId = clampLevelId(ctx.levelId);
    const category = getLevelRangeInsultCategory(levelId);
    const stage = getDifficultyStage(levelId);
    const fallback = category.insults.victory[0] ?? 'Cleared. Somehow.';
    return {
      text: fallback,
      durationSec: 3.2,
      trigger: 'victory',
      category,
      stage,
      streakMilestone: null,
    };
  }

  /**
   * Selects the top-HUD sarcastic death toast shown in GameCanvas after each failure.
   */
  public getHudDeathTaunt(levelId: number, levelDeathStreak: number): HudDeathTauntResult {
    const clamped = clampLevelId(levelId);
    const milestone = getDeathStreakMilestone(levelDeathStreak);

    if (milestone) {
      const streak = pickDeathStreakStickmanComment(milestone, clamped);
      this.lastHudTaunt = streak.taunt;
      const durationMs = milestone === 20 ? 5200 : milestone === 10 ? 4600 : 4200;
      return {
        text: streak.taunt,
        durationMs,
        streakMilestone: milestone,
      };
    }

    const text = getRandomDeathTaunt(this.lastHudTaunt, clamped);
    this.lastHudTaunt = text;
    return {
      text,
      durationMs: 3200,
      streakMilestone: null,
    };
  }

  /**
   * Returns the cruel stickman remark shown inside the locked 'Get Hint' modal (Levels 1–50).
   */
  public getHintModalRemark(levelId: number, deathsOnObstacle: number): string {
    return getCruelHintModalComment(clampLevelId(levelId), deathsOnObstacle);
  }

  private selectFreshRemark(
    trigger: CommentaryTrigger,
    ctx: CommentaryContext & { levelId: number; nowMs: number },
    category: LevelRangeInsultCategory,
    stage: DifficultyStageMeta,
  ): string {
    const {
      levelId,
      nowMs,
      levelDeaths = 0,
      totalDeaths = 0,
      progressRatio = 0,
      repeatObstacleCount = 0,
      elapsedMs = 0,
      quickDeaths = 0,
    } = ctx;

    // 1. Level Entry (aware of restarts & milestone thresholds)
    if (trigger === 'level_entry') {
      if (this.restartsOnCurrentLevel >= 2 && levelId !== 99 && levelId !== 100) {
        return this.pickFromPool(
          [
            `Restart #${this.restartsOnCurrentLevel + 1} on Level ${levelId}. Still hoping for a miracle?`,
            `Hitting restart won’t upgrade your reflexes on Level ${levelId}.`,
            `Fresh start, exact same player. This should be hilarious.`,
          ],
          nowMs,
        );
      }
      return this.rememberLine(pickLevelEntryTaunt(levelId), nowMs);
    }

    // 2. Victory (combines level-range victory insults + performance-specific victory quips)
    if (trigger === 'victory') {
      if (levelId >= 99) {
        return this.pickFromPool(category.insults.victory, nowMs);
      }
      if (levelDeaths === 0 || levelDeaths >= 15) {
        return this.rememberLine(pickVictoryQuip(levelDeaths, levelId), nowMs);
      }
      if (Math.random() < 0.25) {
        return this.pickFromPool(VICTORY_SNARK_EXTRAS, nowMs);
      }
      if (Math.random() < 0.65) {
        return this.pickFromPool(category.insults.victory, nowMs);
      }
      return this.pickNonRepeating(() => pickVictoryQuip(levelDeaths, levelId), nowMs);
    }

    // 2b. Fake Exit betrayal & approaching exit doorway
    if (trigger === 'fake_exit') {
      return this.pickFromPool(FAKE_EXIT_MOCKERY, nowMs);
    }
    if (trigger === 'near_exit') {
      return this.pickFromPool(NEAR_EXIT_MOCKERY, nowMs);
    }

    // 3. Fake Reward bait
    if (trigger === 'fake_reward') {
      if (Math.random() < 0.7) {
        return this.pickFromPool(FAKE_REWARD_MOCKERY, nowMs);
      }
      return this.pickNonRepeating(
        () => pickEscalatingStickmanInsult('trap', levelId, levelDeaths),
        nowMs,
      );
    }

    // 4. Repeat Failure on the same obstacle (blends level-range repeat_failure pool + chronic mockery)
    if (trigger === 'repeat_failure' || trigger === 'repeat_mistake') {
      if (repeatObstacleCount >= 3 && levelId < 99 && Math.random() < 0.45) {
        return this.pickFromPool(CHRONIC_REPEAT_MOCKERY, nowMs);
      }
      if (Math.random() < 0.6) {
        return this.pickFromPool(category.insults.repeat_failure, nowMs);
      }
      return this.pickNonRepeating(
        () => pickEscalatingStickmanInsult('repeat_mistake', levelId, levelDeaths),
        nowMs,
      );
    }

    // 5. General Death (blends pit-miss mockery, level-range death pool + performance-aware late choke / quick death)
    if (trigger === 'death') {
      if (ctx.deathCause === 'pit' && levelId < 99 && Math.random() < 0.42) {
        return this.pickFromPool(PIT_MISS_MOCKERY, nowMs);
      }
      if (progressRatio >= 0.74 && levelId < 99 && Math.random() < 0.36) {
        return this.pickFromPool(LATE_CHOKE_MOCKERY, nowMs);
      }
      if (
        (elapsedMs > 0 && elapsedMs < 4500 && levelDeaths >= 2) ||
        (quickDeaths >= 3 && Math.random() < 0.34)
      ) {
        if (levelId < 99 && Math.random() < 0.42) {
          return this.pickFromPool(QUICK_DEATH_MOCKERY, nowMs);
        }
      }
      if (totalDeaths >= 75 && levelId < 99 && Math.random() < 0.14) {
        return this.pickFromPool(HIGH_TOTAL_DEATH_MOCKERY, nowMs);
      }
      if (Math.random() < 0.58) {
        return this.pickFromPool(category.insults.death, nowMs);
      }
      return this.pickNonRepeating(
        () => pickEscalatingStickmanInsult('respawn', levelId, levelDeaths),
        nowMs,
      );
    }

    // 6. Mid-run / Late-run performance awareness
    if (trigger === 'mid_run' || trigger === 'late_run') {
      if (levelDeaths === 0 && levelId < 99 && Math.random() < 0.45) {
        return this.pickFromPool(FLAWLESS_RUN_MOCKERY, nowMs);
      }
      if (levelId < 99 && Math.random() < 0.3) {
        return this.pickFromPool(SURVIVED_SECTION_MOCKERY, nowMs);
      }
      return this.pickNonRepeating(
        () => pickMidRunMockery(levelId, trigger === 'late_run' ? 'late' : 'mid'),
        nowMs,
      );
    }

    // 7. Checkpoint, Trap, Idle, Jump Spam
    if (trigger === 'checkpoint') {
      if (levelId < 99 && Math.random() < 0.32) {
        return this.pickFromPool(SURVIVED_SECTION_MOCKERY, nowMs);
      }
      return this.pickNonRepeating(
        () => pickEscalatingStickmanInsult('checkpoint', levelId, levelDeaths),
        nowMs,
      );
    }
    if (trigger === 'trap') {
      return this.pickNonRepeating(
        () => pickEscalatingStickmanInsult('trap', levelId, levelDeaths),
        nowMs,
      );
    }
    if (trigger === 'idle') {
      return this.pickNonRepeating(
        () => pickEscalatingStickmanInsult('idle', levelId, levelDeaths),
        nowMs,
      );
    }
    if (trigger === 'jump_spam') {
      return this.pickNonRepeating(
        () => pickEscalatingStickmanInsult('jump_spam', levelId, levelDeaths),
        nowMs,
      );
    }

    // 8. Ambient commentary (performance & stage aware)
    if (levelDeaths === 0 && progressRatio >= 0.35 && levelId < 99 && Math.random() < 0.28) {
      return this.pickFromPool(FLAWLESS_RUN_MOCKERY, nowMs);
    }
    if (totalDeaths >= 100 && stage.id >= 4 && levelId < 99 && Math.random() < 0.15) {
      return this.pickFromPool(HIGH_TOTAL_DEATH_MOCKERY, nowMs);
    }
    return this.pickNonRepeating(
      () => pickContinuousStickmanComment(levelId, levelDeaths, progressRatio),
      nowMs,
    );
  }

  private computeBubbleDuration(
    trigger: CommentaryTrigger,
    levelId: number,
    text: string,
  ): number {
    if (trigger === 'level_entry') {
      return levelId >= 99 ? 3.4 : 3.0;
    }
    if (trigger === 'victory') return 3.2;
    if (trigger === 'jump_spam') return 2.5;
    if (trigger === 'trap' || trigger === 'fake_reward') return 2.7;
    if (text.length > 52) return 3.3;
    return 2.9;
  }

  private isLineOnCooldown(line: string, nowMs: number): boolean {
    const lastAt = this.lastLineUsedAt.get(line);
    if (lastAt !== undefined && nowMs >= lastAt && nowMs - lastAt < LINE_REPEAT_COOLDOWN_MS) {
      return true;
    }
    return this.recentHistory.includes(line);
  }

  private pickFromPool(pool: readonly string[], nowMs: number): string {
    const offCooldown = pool.filter((line) => !this.isLineOnCooldown(line, nowMs));
    if (offCooldown.length > 0) {
      const chosen = offCooldown[Math.floor(Math.random() * offCooldown.length)] ?? pool[0] ?? 'Try harder, Loser!';
      return this.rememberLine(chosen, nowMs);
    }

    const notRecent = pool.filter((line) => !this.recentHistory.includes(line));
    if (notRecent.length > 0) {
      const chosen = notRecent[Math.floor(Math.random() * notRecent.length)] ?? pool[0] ?? 'Try harder, Loser!';
      return this.rememberLine(chosen, nowMs);
    }

    // All lines in this pool were used recently: rotate via least-recently-used while avoiding immediate back-to-back repeats
    const lastLine = this.recentHistory[this.recentHistory.length - 1];
    const candidates =
      pool.length > 1 ? pool.filter((line) => line !== lastLine) : pool;
    const lruSorted = [...candidates].sort(
      (a, b) => (this.lastLineUsedAt.get(a) ?? -Infinity) - (this.lastLineUsedAt.get(b) ?? -Infinity),
    );
    const chosen = lruSorted[0] ?? pool[0] ?? 'Try harder, Loser!';
    return this.rememberLine(chosen, nowMs);
  }

  private pickNonRepeating(
    picker: () => string,
    nowMs: number,
    extraAvoid: readonly string[] = [],
  ): string {
    let candidate = picker();
    for (let attempt = 0; attempt < 8; attempt++) {
      if (
        !this.isLineOnCooldown(candidate, nowMs) &&
        !extraAvoid.includes(candidate)
      ) {
        break;
      }
      candidate = picker();
    }
    return this.rememberLine(candidate, nowMs);
  }

  private rememberLine(line: string, nowMs: number): string {
    this.lastLineUsedAt.set(line, nowMs);
    this.recentHistory.push(line);
    if (this.recentHistory.length > RECENT_HISTORY_LIMIT) {
      this.recentHistory.shift();
    }
    return line;
  }

  private recordEmission(
    trigger: CommentaryTrigger,
    text: string,
    nowMs: number,
  ): void {
    const key = normalizeTriggerKey(trigger);
    if (this.recentHistory[this.recentHistory.length - 1] !== text) {
      this.rememberLine(text, nowMs);
    } else {
      this.lastLineUsedAt.set(text, nowMs);
    }
    this.lastGlobalRemarkAt = nowMs;
    this.activeGlobalCooldownMs = GLOBAL_COOLDOWN_MS[key] ?? 4500;
    this.lastTriggerAt.set(key, nowMs);
  }
}

export const commentaryService = new CommentaryService();
