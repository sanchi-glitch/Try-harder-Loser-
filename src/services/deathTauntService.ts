import type { DeathStreakMilestone } from '../data/deathMessages';
import type { DeathCause } from '../types/game';

export type TauntSeverity = 'sarcastic' | 'mocking' | 'cruel' | 'brutal';

export interface DeathTauntContext {
  levelId: number;
  cause: DeathCause;
  levelDeaths: number;
  deathStreak: number;
  totalDeaths: number;
  quickDeaths: number;
  elapsedMs: number;
  progressRatio: number;
  repeatObstacleCount: number;
  streakMilestone?: DeathStreakMilestone | null;
}

export interface DeathTauntPopup {
  id: number;
  text: string;
  tag: string;
  severity: TauntSeverity;
  durationMs: number;
  cause: DeathCause;
  deathStreak: number;
  streakMilestone: DeathStreakMilestone | null;
}

type DeathTauntListener = (taunt: DeathTauntPopup | null) => void;

const REPEAT_SPOT_TAUNTS: readonly string[] = [
  'Again? Seriously?',
  'Same trap. Same brain. Same embarrassing result.',
  'You literally know where it is and still jumped into it.',
  'It has not moved an inch. How are you still hitting it?',
  'Doing the exact same thing and expecting skill to appear?',
  'Did you expect that obstacle to apologize and let you pass?',
  'Memory span of a goldfish, reflexes of a brick.',
  'That spot owns rent-free real estate in your skull now.',
];

const INSTANT_FAIL_TAUNTS: readonly string[] = [
  'Is your screen off?',
  'Speedrunning embarrassment?',
  'That lasted less than a blink. Truly pathetic.',
  'Are you playing with your elbows?',
  'Your fingers and your brain are clearly not on speaking terms.',
  'New world record for dying immediately.',
  'Did you sneeze, or was that your actual gameplay?',
  'Blink twice if you forgot which button jumps.',
];

const NEAR_EXIT_CHOKE_TAUNTS: readonly string[] = [
  'You could literally smell the exit and still choked.',
  'So close, yet somehow still a complete disaster.',
  'The exit door is laughing at you right now.',
  'Choking at the finish line — your signature move.',
  'Almost does not count, loser.',
  'All that effort just to faceplant two feet from freedom.',
  'Heartbreaking. Mostly hilarious, actually.',
];

const CAUSE_TAUNTS: Record<DeathCause, readonly string[]> = {
  spike: [
    'Pointy red triangles mean death. Write it down.',
    'You practically gift-wrapped yourself for those spikes.',
    'Even the spikes are embarrassed for you right now.',
    'Red, sharp, obvious — and you still hugged it.',
  ],
  popup_spike: [
    'Surprise! Not that you would have dodged it anyway.',
    'Bet you did not see that coming. Neither did your reflexes.',
    'Floor spikes: 1. Your trust issues: infinite.',
    'Jumped too late? Shocking. Truly shocking.',
  ],
  pit: [
    'Gravity: 100. Your reflexes: 0.',
    'Falling into nothing is really your passion, huh?',
    'Is your jump button broken, or just your timing?',
    'The void called. It says stop visiting so much.',
  ],
  fake_drop: [
    'You trusted the floor? Adorable.',
    'Solid ground is a privilege, not a right.',
    'Watching you fall through air never gets old.',
    'Floor disappeared and took your dignity with it.',
  ],
  saw: [
    'It is a giant spinning blade. Maybe do not hug it?',
    'You ran straight into a spinning saw. Bold strategy.',
    'Outsmarted by a circle going back and forth.',
    'Sliced clean in half. Again? Seriously?',
  ],
  falling_block: [
    'Look up? No? Okay, pancake it is.',
    'Flattened like your win rate.',
    'Gravity dropped a brick and you caught it with your face.',
    'Crushed. At least you are consistent.',
  ],
  sweeper: [
    'A tiny patrol hazard just ruined your whole run.',
    'Zero spatial awareness. Pure chaos.',
    'You walked straight into its path like an NPC.',
    'Outrun by a grumpy red hazard. Tragic.',
  ],
};

const STREAK_TIER_3_TAUNTS: readonly string[] = [
  'Again? Seriously?',
  'Is your screen off?',
  'Three-plus deaths here. Try plugging your brain in.',
  'At this point I am just watching a car crash in slow motion.',
  'You are making this level look way harder than it is.',
];

const STREAK_TIER_6_TAUNTS: readonly string[] = [
  'Honestly, uninstalling is a valid strategy.',
  'Even a pigeon pecking the screen would have cleared this by now.',
  'Are you losing on purpose, or is this your actual peak?',
  'Your ego must be on life support right now.',
  'Maybe hand the phone to literally anyone else.',
];

const STREAK_TIER_10_TAUNTS: readonly string[] = [
  'Double-digit deaths on ONE level. Legendary incompetence.',
  'I would offer a tutorial, but you would die in that too.',
  'Ten-plus funerals. The level is not unfair, you are just tragic.',
  'Your thumbs owe you a formal written apology.',
  'At this rate the spikes are going to file for overtime.',
];

const FINALE_100_TAUNTS: readonly string[] = [
  'Level 100 does not negotiate with tourists.',
  '0.1% clear rate. Thank you for strengthening the 99.9%.',
  'Zero checkpoints. Back to pixel one, loser.',
  'You really thought you were built for the final level?',
  'Again? Seriously? Level 100 just chewed you up.',
];

const GENERAL_CRUEL_MOCKING_TAUNTS: readonly string[] = [
  'Again? Seriously?',
  'Is your screen off?',
  'Was that a jump or a cry for help?',
  'Skill issue. Catastrophic skill issue.',
  'Try using your eyes next time.',
  'I have seen better coordination from a dropped toaster.',
  'That was not even a hard trap. You just panicked.',
  'Keep dying like that and the game will beat itself out of pity.',
  'Bold of you to play a precision platformer with zero precision.',
  'You have the survival instincts of a wet napkin.',
];

const HISTORY_LIMIT = 12;

export class DeathTauntService {
  private listeners = new Set<DeathTauntListener>();
  private activeTaunt: DeathTauntPopup | null = null;
  private recentLines: string[] = [];
  private nextId = 1;
  private dismissTimer: number | null = null;

  public subscribe(listener: DeathTauntListener): () => void {
    this.listeners.add(listener);
    listener(this.activeTaunt);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getActiveTaunt(): DeathTauntPopup | null {
    return this.activeTaunt;
  }

  public dismiss(): void {
    if (this.dismissTimer !== null) {
      window.clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    if (this.activeTaunt !== null) {
      this.activeTaunt = null;
      this.notify();
    }
  }

  public triggerDeathTaunt(ctx: DeathTauntContext): DeathTauntPopup {
    const selected = this.selectContextualTaunt(ctx);
    const durationMs = this.computeDurationMs(selected.severity, ctx);

    const popup: DeathTauntPopup = {
      id: this.nextId++,
      text: selected.text,
      tag: selected.tag,
      severity: selected.severity,
      durationMs,
      cause: ctx.cause,
      deathStreak: ctx.deathStreak,
      streakMilestone: ctx.streakMilestone ?? null,
    };

    this.activeTaunt = popup;
    this.notify();

    if (this.dismissTimer !== null) {
      window.clearTimeout(this.dismissTimer);
    }
    this.dismissTimer = window.setTimeout(() => {
      this.dismissTimer = null;
      if (this.activeTaunt?.id === popup.id) {
        this.activeTaunt = null;
        this.notify();
      }
    }, durationMs);

    return popup;
  }

  private selectContextualTaunt(ctx: DeathTauntContext): {
    text: string;
    tag: string;
    severity: TauntSeverity;
  } {
    const isFinale = ctx.levelId >= 99;
    const isNearExit = ctx.progressRatio >= 0.74;
    const isRepeatSpot = ctx.repeatObstacleCount >= 2;
    const isInstantFail = ctx.elapsedMs < 2400 || ctx.quickDeaths >= 2;

    // 1. Level 99–100 brutal finale taunts
    if (isFinale && (ctx.deathStreak >= 2 || Math.random() < 0.65)) {
      return {
        text: this.pickFresh(FINALE_100_TAUNTS),
        tag: ctx.levelId === 100 ? 'LEVEL 100 · NO MERCY' : 'FINAL DESCENT',
        severity: 'brutal',
      };
    }

    // 2. Severe death streaks (10+, 6+, 3+)
    if (ctx.deathStreak >= 10) {
      return {
        text: this.pickFresh(STREAK_TIER_10_TAUNTS),
        tag: `${ctx.deathStreak}x FAIL STREAK`,
        severity: 'brutal',
      };
    }
    if (ctx.deathStreak >= 6 && Math.random() < 0.72) {
      return {
        text: this.pickFresh(STREAK_TIER_6_TAUNTS),
        tag: `${ctx.deathStreak}x CRUEL STREAK`,
        severity: 'cruel',
      };
    }

    // 3. Choking right next to the exit
    if (isNearExit && Math.random() < 0.78) {
      return {
        text: this.pickFresh(NEAR_EXIT_CHOKE_TAUNTS),
        tag: 'CHOKED AT EXIT',
        severity: ctx.deathStreak >= 4 ? 'brutal' : 'cruel',
      };
    }

    // 4. Dying in the exact same spot repeatedly
    if (isRepeatSpot && Math.random() < 0.78) {
      return {
        text: this.pickFresh(REPEAT_SPOT_TAUNTS),
        tag: 'AGAIN?!',
        severity: ctx.repeatObstacleCount >= 4 ? 'brutal' : 'cruel',
      };
    }

    // 5. Dying almost instantly after spawning
    if (isInstantFail && Math.random() < 0.72) {
      return {
        text: this.pickFresh(INSTANT_FAIL_TAUNTS),
        tag: 'SCREEN OFF?',
        severity: 'mocking',
      };
    }

    // 6. Mid streak (3–5 deaths in a row)
    if (ctx.deathStreak >= 3 && Math.random() < 0.55) {
      return {
        text: this.pickFresh(STREAK_TIER_3_TAUNTS),
        tag: `${ctx.deathStreak}x STREAK`,
        severity: 'cruel',
      };
    }

    // 7. Cause-specific sarcasm vs general cruel mocking
    const causePool = CAUSE_TAUNTS[ctx.cause];
    if (causePool && causePool.length > 0 && Math.random() < 0.62) {
      return {
        text: this.pickFresh(causePool),
        tag: this.formatCauseTag(ctx.cause),
        severity: ctx.levelId >= 40 ? 'cruel' : 'mocking',
      };
    }

    return {
      text: this.pickFresh(GENERAL_CRUEL_MOCKING_TAUNTS),
      tag: ctx.deathStreak >= 2 ? 'AGAIN?!' : 'SKILL ISSUE',
      severity: ctx.levelId >= 50 ? 'cruel' : 'sarcastic',
    };
  }

  private formatCauseTag(cause: DeathCause): string {
    switch (cause) {
      case 'popup_spike':
        return 'SURPRISE SPIKE';
      case 'spike':
        return 'POINTY OBSTACLE';
      case 'pit':
        return 'GRAVITY WINS';
      case 'fake_drop':
        return 'TRUST ISSUES';
      case 'saw':
        return 'BLADE HUGGER';
      case 'falling_block':
        return 'PANCAKED';
      case 'sweeper':
        return 'ZERO AWARENESS';
      default:
        return 'ROASTED';
    }
  }

  private computeDurationMs(severity: TauntSeverity, ctx: DeathTauntContext): number {
    if (ctx.streakMilestone) return 4400;
    if (severity === 'brutal') return 4100;
    if (severity === 'cruel') return 3600;
    return 3200;
  }

  private pickFresh(pool: readonly string[]): string {
    if (pool.length === 0) return 'Again? Seriously?';
    const fresh = pool.filter((line) => !this.recentLines.includes(line));
    const candidates = fresh.length > 0 ? fresh : pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    this.recentLines.push(chosen);
    if (this.recentLines.length > HISTORY_LIMIT) {
      this.recentLines.shift();
    }
    return chosen;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.activeTaunt);
    }
  }
}

export const deathTauntService = new DeathTauntService();
