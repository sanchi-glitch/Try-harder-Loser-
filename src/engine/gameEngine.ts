import {
  getDeathStreakMilestone,
  pickDeathMessage,
  pickDeathStreakStickmanComment,
  pickEscalatingStickmanInsult,
  pickLevelEntryTaunt,
  pickMidRunMockery,
  type DeathStreakMilestone,
} from '../data/deathMessages';
import { getLevelById } from '../data/levels';
import type {
  CheckpointDef,
  DeathCause,
  DeathLocationSnapshot,
  ExitDef,
  FakeRewardDef,
  GameSettings,
  HazardDef,
  HudSnapshot,
  LevelDef,
  PlatformDef,
  SignDef,
} from '../types/game';
import { adaptiveDifficulty } from './adaptiveDifficulty';
import { audioManager } from './audio';
import { StickmanGhostTrail } from './stickmanGhostTrail';

// Logical viewport dimensions (16:9 landscape, crisp DPR scaling)
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;

// Player physics constants (verified against all 15 levels)
const PLAYER_W = 24;
const PLAYER_H = 44;
const GRAVITY = 1550;
const JUMP_VELOCITY = -580;
const BASE_MOVE_SPEED = 290;
const GROUND_ACCEL = 2600;
const GROUND_DECEL = 2800;
const AIR_ACCEL = 1850;
const AIR_DECEL = 900;
const COYOTE_TIME = 0.11;
const JUMP_BUFFER_TIME = 0.12;
const MAX_FALL_SPEED = 860;

interface RuntimePlatform {
  def: PlatformDef;
  x: number;
  y: number;
  w: number;
  h: number;
  prevX: number;
  prevY: number;
  active: boolean;
  // crumble state
  crumbleState: 'idle' | 'shaking' | 'gone';
  crumbleTimer: number;
  // fake_drop state
  dropState: 'idle' | 'shaking' | 'dropped';
  dropTimer: number;
  // reveal_wall state
  retracted: boolean;
  retractProgress: number;
  // invisible reveal glow
  touchGlow: number;
  // continuous oscillation phase for smooth dynamic speed scaling
  oscPhase: number;
}

interface RuntimeHazard {
  def: HazardDef;
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  // popup_spike
  popupState: 'hidden' | 'telegraph' | 'up' | 'retracting';
  popupTimer: number;
  popupExtend: number; // 0..1
  popupCycleTimer: number;
  // falling_block
  fallState: 'idle' | 'shaking' | 'falling' | 'landed' | 'rising';
  fallTimer: number;
  fallVy: number;
  // saw rotation & smooth dynamic oscillation phase
  angle: number;
  oscPhase: number;
}

interface RuntimeCheckpoint {
  def: CheckpointDef;
  x: number;
  y: number;
  activated: boolean;
  fakeTriggered: boolean;
  fakeTimer: number;
  tiltAngle: number;
  vy: number;
  vx: number;
}

interface RuntimeExit {
  def: ExitDef;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  moveIndex: number;
  moving: boolean;
  fakeTriggered: boolean;
  quipText: string | null;
  quipTimer: number;
  legCycle: number;
}

interface RuntimeReward {
  def: FakeRewardDef;
  collected: boolean;
  bobPhase: number;
}

interface RuntimeSign {
  def: SignDef;
  flipped: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  shape: 'square' | 'circle';
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onDeathRecorded: (levelId: number, totalLevelDeaths: number, levelDeathStreak: number) => void;
  onDeathScreenOpen?: (snapshot: DeathLocationSnapshot) => void;
  onTrickTriggered: (kind: 'trap' | 'fake_reward' | 'fourth_wall') => void;
  onLevelComplete: (stats: {
    levelId: number;
    elapsedMs: number;
    levelDeaths: number;
    jumpsUsed: number;
    tricksTriggeredInLevel: number;
  }) => void;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpBufferTimer: number;
  jumpReleased: boolean;
}

export class PlatformerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;
  private settings: GameSettings;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private paused = false;
  private destroyed = false;

  private level!: LevelDef;
  private levelTime = 0; // seconds since level start
  private totalDeathsGlobal = 0;
  private levelDeaths = 0;
  private deathStreakByLevel = new Map<number, number>();
  private activeStreakMilestone: DeathStreakMilestone | null = null;
  private jumpsUsedInLevel = 0;
  private tricksInLevel = 0;

  // Player state
  private px = 0;
  private py = 0;
  private vx = 0;
  private vy = 0;
  private facing: 1 | -1 = 1;
  private onGround = false;
  private coyoteTimer = 0;
  private squashX = 1;
  private squashY = 1;
  private runCycle = 0;
  private blinkTimer = 2.4;
  private isBlinking = false;
  private state: 'alive' | 'dying' | 'death_screen' | 'respawning' | 'won' = 'alive';
  private stateTimer = 0;
  private respawnPop = 1;
  private respawnInvulnTimer = 0;
  private lastSafeGroundedPos = { x: 80, y: 370 };
  private savedDeathSnapshot: DeathLocationSnapshot | null = null;

  // Fourth-wall state
  private lookingAtPlayer = false;
  private fourthWallBubble: string | null = null;
  private fourthWallBubbleTimer = 0;
  private idleQuipCooldown = 0;
  private consecutiveQuickDeaths = 0;
  private midRunTauntStage: 0 | 1 | 2 = 0;

  // Checkpoint state
  private spawnX = 80;
  private spawnY = 370;
  private checkpointReached = false;
  private pendingFullStartReset = false;
  private revealedTriggers = new Set<string>();

  // Camera & juice
  private camX = 0;
  private shakeTime = 0;
  private shakeIntensity = 0;
  private hitstopTimer = 0;
  private deathFlashAlpha = 0;
  private worldTime = 0;

  // Entities
  private platforms: RuntimePlatform[] = [];
  private hazards: RuntimeHazard[] = [];
  private checkpoints: RuntimeCheckpoint[] = [];
  private exits: RuntimeExit[] = [];
  private rewards: RuntimeReward[] = [];
  private signs: RuntimeSign[] = [];
  private particles: Particle[] = [];
  private stickmanGhostTrail = new StickmanGhostTrail();

  // Input
  public input: InputState = {
    left: false,
    right: false,
    jumpHeld: false,
    jumpBufferTimer: 0,
    jumpReleased: false,
  };

  // HUD throttle
  private hudEmitAccum = 0;
  private currentDeathMessage: string | null = null;
  private deathMessageId = 0;
  private deathMessageTimer = 0;
  private prankBanner: string | null = null;
  private prankBannerId = 0;
  private prankBannerTimer = 0;
  private adaptiveHint: string | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    levelId: number,
    settings: GameSettings,
    totalDeathsGlobal: number,
    callbacks: EngineCallbacks,
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not initialize 2D canvas context');
    }
    this.ctx = context;
    this.settings = { ...settings };
    this.totalDeathsGlobal = totalDeathsGlobal;
    this.callbacks = callbacks;

    this.loadLevel(levelId);
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = { ...settings };
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.clearInputs();
    } else {
      this.lastTimestamp = performance.now();
    }
  }

  public clearInputs(): void {
    this.input.left = false;
    this.input.right = false;
    this.input.jumpHeld = false;
    this.input.jumpBufferTimer = 0;
    this.input.jumpReleased = false;
  }

  public pressJump(): void {
    this.input.jumpHeld = true;
    this.input.jumpBufferTimer = JUMP_BUFFER_TIME;
    this.input.jumpReleased = false;
  }

  public releaseJump(): void {
    if (this.input.jumpHeld) {
      this.input.jumpReleased = true;
    }
    this.input.jumpHeld = false;
  }

  public loadLevel(levelId: number): void {
    this.level = getLevelById(levelId);
    this.levelTime = 0;
    this.levelDeaths = 0;
    this.jumpsUsedInLevel = 0;
    this.tricksInLevel = 0;
    this.consecutiveQuickDeaths = 0;
    this.checkpointReached = false;
    this.pendingFullStartReset = false;
    this.activeStreakMilestone = null;
    this.revealedTriggers.clear();
    this.spawnX = this.level.spawn.x;
    this.spawnY = this.level.spawn.y;
    this.lastSafeGroundedPos = { x: this.level.spawn.x, y: this.level.spawn.y };
    this.savedDeathSnapshot = null;
    this.respawnInvulnTimer = 0;
    this.currentDeathMessage = null;
    this.deathMessageTimer = 0;
    this.prankBanner = null;
    this.prankBannerTimer = 0;
    const entryTaunt = pickLevelEntryTaunt(levelId);
    this.fourthWallBubble = entryTaunt;
    this.fourthWallBubbleTimer = entryTaunt ? 3.5 : 0;
    this.lookingAtPlayer = Boolean(entryTaunt);
    this.midRunTauntStage = 0;
    this.stickmanGhostTrail.clear();

    adaptiveDifficulty.startLevel(levelId);
    audioManager.setAtmosphereLevel(levelId, this.deathStreakByLevel.get(levelId) ?? 0);
    this.buildEntities(true);
    this.respawnPlayerInstant();
    this.emitHud();
  }

  public restartLevel(): void {
    this.loadLevel(this.level.id);
  }

  /**
   * Rewarded Ad Extra-Life Respawn:
   * Restores the player directly at the exact saved death location without
   * restarting the level or sending them back to the starting point, preserving
   * timer, progress, checkpoints, and world state.
   */
  public respawnAtSavedDeathLocation(): boolean {
    const snap = this.savedDeathSnapshot;
    if (!snap) return false;

    this.savedDeathSnapshot = null;
    this.pendingFullStartReset = false;
    this.clearInputs();

    // Restore any collapsed tile or landed falling block right at the respawn footprint
    // so the player is never trapped inside/above an empty void immediately upon respawn.
    for (const p of this.platforms) {
      const nearHoriz =
        snap.respawnX + PLAYER_W > p.def.x - 24 && snap.respawnX < p.def.x + p.def.w + 24;
      if (!nearHoriz) continue;
      if (p.def.kind === 'fake_drop' && p.dropState !== 'idle') {
        p.x = p.def.x;
        p.y = p.def.y;
        p.active = true;
        p.dropState = 'idle';
        p.dropTimer = 0;
      } else if (p.def.kind === 'crumble' && p.crumbleState !== 'idle') {
        p.active = true;
        p.crumbleState = 'idle';
        p.crumbleTimer = 0;
      }
    }
    for (const h of this.hazards) {
      if (h.def.kind === 'falling_block' && h.fallState !== 'idle') {
        const near =
          snap.respawnX + PLAYER_W > h.def.x - 28 && snap.respawnX < h.def.x + h.def.w + 28;
        if (near) {
          h.x = h.def.x;
          h.y = h.def.y;
          h.fallState = 'idle';
          h.fallVy = 0;
          h.fallTimer = 0;
        }
      }
    }

    this.px = snap.respawnX;
    this.py = snap.respawnY;
    this.vx = 0;
    this.vy = 0;
    this.facing = snap.facing;
    this.onGround = false;
    this.coyoteTimer = COYOTE_TIME;
    this.squashX = 1;
    this.squashY = 1;
    this.state = 'respawning';
    this.stateTimer = 0.18;
    this.respawnPop = 0.35;
    this.respawnInvulnTimer = 1.65;
    this.stickmanGhostTrail.clear();
    this.fourthWallBubble = "Back from the dead. Don't waste it.";
    this.fourthWallBubbleTimer = 2.4;
    this.lookingAtPlayer = true;

    this.camX = this.clampCameraX(this.px + PLAYER_W / 2 - VIEW_WIDTH * 0.42);
    this.spawnDust(this.px + PLAYER_W / 2, this.py + PLAYER_H / 2, 12, '#DC2626');
    this.spawnDust(this.px + PLAYER_W / 2, this.py + PLAYER_H / 2, 10, '#111111');
    this.emitHud();
    return true;
  }

  /**
   * Called when the player declines the Rewarded Ad on the Death Screen and
   * chooses RESTART LEVEL. Resets level state cleanly while preserving death
   * counters and death-streak mockery progression.
   */
  public confirmDeathRestart(): void {
    this.savedDeathSnapshot = null;
    this.pendingFullStartReset = false;
    this.clearInputs();
    this.checkpointReached = false;
    this.spawnX = this.level.spawn.x;
    this.spawnY = this.level.spawn.y;
    this.lastSafeGroundedPos = { x: this.level.spawn.x, y: this.level.spawn.y };
    this.revealedTriggers.clear();
    this.levelTime = 0;
    this.jumpsUsedInLevel = 0;
    this.respawnInvulnTimer = 0;
    this.buildEntities(true);
    this.respawnPlayerInstant();
    this.emitHud();
  }

  private buildEntities(fullReset: boolean): void {
    const snap = adaptiveDifficulty.getSnapshot(this.level.id);
    this.adaptiveHint = snap.activeModifierText;

    this.platforms = this.level.platforms.map((def) => {
      const condMet = this.checkAdaptiveCondition(def.adaptiveCondition, snap);
      const alreadyRetracted =
        !fullReset && def.kind === 'reveal_wall' && !!def.linkedTriggerId && this.revealedTriggers.has(def.linkedTriggerId);
      return {
        def,
        x: def.x,
        y: def.y,
        w: def.w,
        h: def.h,
        prevX: def.x,
        prevY: def.y,
        active: condMet && !alreadyRetracted,
        crumbleState: 'idle',
        crumbleTimer: 0,
        dropState: 'idle',
        dropTimer: 0,
        retracted: alreadyRetracted,
        retractProgress: alreadyRetracted ? 1 : 0,
        touchGlow: 0,
        oscPhase: def.phase ?? 0,
      };
    });

    this.hazards = this.level.hazards.map((def) => ({
      def,
      x: def.x,
      y: def.y,
      w: def.w,
      h: def.h,
      active: this.checkAdaptiveCondition(def.adaptiveCondition, snap),
      popupState: def.kind === 'popup_spike' ? 'hidden' : 'up',
      popupTimer: 0,
      popupExtend: def.kind === 'popup_spike' ? 0 : 1,
      popupCycleTimer: 0,
      fallState: 'idle',
      fallTimer: 0,
      fallVy: 0,
      angle: 0,
      oscPhase: def.phase ?? 0,
    }));

    // Levels 10-30: Spawn cluster-reactive patrol sweepers in hot death clusters at Tier 2+
    if (snap.isEscalationEligibleLevel && snap.clusterEscalationTier >= 2) {
      const maxBonusHazards = snap.clusterEscalationTier >= 3 ? 2 : 1;
      const realExits = this.level.exits.filter((e) => !e.fake);
      let spawned = 0;

      for (const cluster of snap.deathClusters) {
        if (spawned >= maxBonusHazards) break;
        if (cluster.count < 3) continue;

        // Clamp position inside playable corridor and strictly keep spawn & real exits safe
        const cx = Math.max(220, Math.min(this.level.worldWidth - 220, Math.round(cluster.x)));
        const cy = Math.max(150, Math.min(355, Math.round(cluster.y - 44)));

        const distFromSpawn = Math.hypot(cx - this.spawnX, cy - this.spawnY);
        const nearRealExit = realExits.some((e) => Math.hypot(cx - e.x, cy - (e.y - 40)) < 155);
        if (distFromSpawn < 175 || nearRealExit) continue;

        const moveX = snap.clusterEscalationTier >= 3 ? 95 : 75;
        const speed = 1.9 + spawned * 0.35;
        const clusterDef: HazardDef = {
          id: `cluster_sweeper_${spawned}_${Math.round(cx)}`,
          x: cx - 14,
          y: cy,
          w: 28,
          h: 28,
          kind: 'sweeper',
          moveX,
          moveY: 18,
          speed,
          phase: spawned * 1.6,
        };

        this.hazards.push({
          def: clusterDef,
          x: clusterDef.x,
          y: clusterDef.y,
          w: clusterDef.w,
          h: clusterDef.h,
          active: true,
          popupState: 'up',
          popupTimer: 0,
          popupExtend: 1,
          popupCycleTimer: 0,
          fallState: 'idle',
          fallTimer: 0,
          fallVy: 0,
          angle: 0,
          oscPhase: clusterDef.phase ?? 0,
        });
        spawned += 1;
      }
    }

    this.checkpoints = this.level.checkpoints.map((def) => {
      const keepActivated = !fullReset && !def.fake && this.checkpointReached;
      return {
        def,
        x: def.x,
        y: def.y,
        activated: keepActivated,
        fakeTriggered: false,
        fakeTimer: 0,
        tiltAngle: 0,
        vy: 0,
        vx: 0,
      };
    });

    this.exits = this.level.exits.map((def) => {
      const alreadyTriggered =
        !fullReset && !!def.fake && !!def.revealsTriggerId && this.revealedTriggers.has(def.revealsTriggerId);
      return {
        def,
        x: def.x,
        y: def.y,
        targetX: def.x,
        targetY: def.y,
        moveIndex: 0,
        moving: false,
        fakeTriggered: alreadyTriggered,
        quipText: null,
        quipTimer: 0,
        legCycle: 0,
      };
    });

    if (fullReset) {
      this.rewards = this.level.fakeRewards.map((def, i) => ({
        def,
        collected: false,
        bobPhase: i * 1.4,
      }));
      this.signs = this.level.signs.map((def) => ({
        def,
        flipped: false,
      }));
    }
  }

  private checkAdaptiveCondition(
    cond: PlatformDef['adaptiveCondition'] | HazardDef['adaptiveCondition'],
    snap: ReturnType<typeof adaptiveDifficulty.getSnapshot>,
  ): boolean {
    if (!cond) return true;
    if (cond === 'jump_spam') return snap.jumpSpamDetected;
    if (cond === 'rusher') return snap.rusherDetected;
    if (cond === 'camper') return snap.camperDetected;
    if (cond === 'repeat_fail') return snap.repeatFailZone !== null;
    return true;
  }

  private respawnPlayerInstant(): void {
    this.px = this.spawnX;
    this.py = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.coyoteTimer = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.state = 'respawning';
    this.stateTimer = 0.22;
    this.respawnPop = 0.2;
    this.midRunTauntStage = 0;
    this.stickmanGhostTrail.clear();
    this.camX = this.clampCameraX(this.px - VIEW_WIDTH * 0.35);
    this.spawnDust(this.px + PLAYER_W / 2, this.py + PLAYER_H / 2, 10, '#111111');
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      if (this.destroyed) return;
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      if (!this.paused) {
        this.update(dt);
      }
      this.render();
      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private update(dt: number): void {
    this.worldTime += dt;

    // Timers for banners & flashes
    if (this.deathFlashAlpha > 0) {
      this.deathFlashAlpha = Math.max(0, this.deathFlashAlpha - dt * 2.4);
    }
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
    }
    if (this.deathMessageTimer > 0) {
      this.deathMessageTimer -= dt;
      if (this.deathMessageTimer <= 0) {
        this.currentDeathMessage = null;
        this.emitHud();
      }
    }
    if (this.prankBannerTimer > 0) {
      this.prankBannerTimer -= dt;
      if (this.prankBannerTimer <= 0) {
        this.prankBanner = null;
        this.emitHud();
      }
    }
    if (this.fourthWallBubbleTimer > 0) {
      this.fourthWallBubbleTimer -= dt;
      if (this.fourthWallBubbleTimer <= 0) {
        this.fourthWallBubble = null;
      }
    }
    if (this.idleQuipCooldown > 0) {
      this.idleQuipCooldown -= dt;
    }

    // Hitstop freeze frame for juicy impact
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateParticles(dt * 0.25);
      this.updateGhostTrail(dt * 0.25, false);
      return;
    }

    // Freeze world simulation cleanly while the Death Screen is presented
    // so exact death position & gameplay state remain preserved for rewarded respawn.
    if (this.state === 'death_screen') {
      this.updateParticles(dt);
      this.updateGhostTrail(dt, false);
      return;
    }

    if (this.state !== 'won') {
      this.levelTime += dt;
    }
    if (this.respawnInvulnTimer > 0) {
      this.respawnInvulnTimer = Math.max(0, this.respawnInvulnTimer - dt);
    }

    this.updatePlatforms(dt);
    this.updateHazards(dt);
    this.updateCheckpoints(dt);
    this.updateExits(dt);
    this.updateRewards(dt);
    this.updateSigns();
    this.updateParticles(dt);

    if (this.state === 'respawning') {
      this.stateTimer -= dt;
      this.respawnPop = Math.min(1, 1 - this.stateTimer / 0.22);
      if (this.stateTimer <= 0) {
        this.state = 'alive';
        this.respawnPop = 1;
      }
    } else if (this.state === 'dying') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.callbacks.onDeathScreenOpen && this.savedDeathSnapshot) {
          this.state = 'death_screen';
          this.clearInputs();
          this.callbacks.onDeathScreenOpen(this.savedDeathSnapshot);
          return;
        }
        const fullReset = this.pendingFullStartReset;
        this.pendingFullStartReset = false;
        this.buildEntities(fullReset);
        this.respawnPlayerInstant();
      }
    } else if (this.state === 'alive') {
      this.updatePlayer(dt);
    }

    this.updateGhostTrail(dt, true);

    // Smooth camera tracking with slight look-ahead
    const lookAhead = this.facing * 65;
    const desiredCamX = this.clampCameraX(this.px + PLAYER_W / 2 + lookAhead - VIEW_WIDTH * 0.42);
    this.camX += (desiredCamX - this.camX) * Math.min(1, dt * 7.5);

    // Emit HUD at ~10Hz for smooth timer display without React overhead
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.1) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private clampCameraX(x: number): number {
    const maxCam = Math.max(0, this.level.worldWidth - VIEW_WIDTH);
    return Math.max(0, Math.min(maxCam, x));
  }

  private updatePlayer(dt: number): void {
    const sens = this.settings.controlSensitivity;
    const moveSpeed = BASE_MOVE_SPEED * (0.85 + sens * 0.15);
    const moveDir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);

    if (moveDir !== 0) {
      this.facing = moveDir > 0 ? 1 : -1;
      const accel = this.onGround ? GROUND_ACCEL * sens : AIR_ACCEL * sens;
      this.vx += moveDir * accel * dt;
      if (Math.abs(this.vx) > moveSpeed) {
        this.vx = Math.sign(this.vx) * moveSpeed;
      }
    } else {
      const decel = this.onGround ? GROUND_DECEL : AIR_DECEL;
      if (Math.abs(this.vx) <= decel * dt) {
        this.vx = 0;
      } else {
        this.vx -= Math.sign(this.vx) * decel * dt;
      }
    }

    // Adaptive behavior tracking & fourth-wall idle stare
    const isMoving = Math.abs(this.vx) > 25 || !this.onGround;
    adaptiveDifficulty.updateFrame(dt, isMoving);

    // Live mid-run stickman mockery as the player advances through cruel levels!
    if (this.level.id >= 10 && this.level.worldWidth > 900) {
      const progress = this.px / this.level.worldWidth;
      if (this.midRunTauntStage === 0 && progress >= 0.44 && !this.fourthWallBubble) {
        this.midRunTauntStage = 1;
        this.fourthWallBubble = pickMidRunMockery(this.level.id, 'mid');
        this.fourthWallBubbleTimer = 2.8;
        this.lookingAtPlayer = true;
      } else if (this.midRunTauntStage < 2 && progress >= 0.78 && !this.fourthWallBubble) {
        this.midRunTauntStage = 2;
        this.fourthWallBubble = pickMidRunMockery(this.level.id, 'late');
        this.fourthWallBubbleTimer = 3.0;
        this.lookingAtPlayer = true;
      }
    }

    if (this.onGround && Math.abs(this.vx) < 10) {
      const idleSec = adaptiveDifficulty.getContinuousIdleSeconds();
      if (idleSec > 2.6) {
        if (!this.lookingAtPlayer) {
          this.lookingAtPlayer = true;
          this.callbacks.onTrickTriggered('fourth_wall');
        }
        if (this.idleQuipCooldown <= 0 && !this.fourthWallBubble) {
          this.fourthWallBubble = pickEscalatingStickmanInsult('idle', this.level.id, this.levelDeaths);
          this.fourthWallBubbleTimer = 2.9;
          this.idleQuipCooldown = 5.6;
        }
      }
    } else if (this.fourthWallBubbleTimer <= 0) {
      this.lookingAtPlayer = false;
    }

    // Blinking
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      if (this.isBlinking) {
        this.isBlinking = false;
        this.blinkTimer = 2.2 + Math.random() * 2.5;
      } else {
        this.isBlinking = true;
        this.blinkTimer = 0.12;
      }
    }

    // Coyote time & jump buffer
    if (this.onGround) {
      this.coyoteTimer = COYOTE_TIME;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.input.jumpBufferTimer > 0) {
      this.input.jumpBufferTimer = Math.max(0, this.input.jumpBufferTimer - dt);
    }

    if (this.input.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = JUMP_VELOCITY;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.input.jumpBufferTimer = 0;
      this.squashX = 0.78;
      this.squashY = 1.24;
      this.jumpsUsedInLevel += 1;
      adaptiveDifficulty.recordJump();
      if (
        this.jumpsUsedInLevel > 0 &&
        this.jumpsUsedInLevel % 10 === 0 &&
        !this.fourthWallBubble &&
        adaptiveDifficulty.getSnapshot(this.level.id).jumpSpamDetected
      ) {
        this.fourthWallBubble = pickEscalatingStickmanInsult('jump_spam', this.level.id, this.levelDeaths);
        this.fourthWallBubbleTimer = 2.5;
      }
      audioManager.playJump();
      this.spawnDust(this.px + PLAYER_W / 2, this.py + PLAYER_H, 6, '#57534E');
    }

    // Variable jump height cut
    if (this.input.jumpReleased) {
      this.input.jumpReleased = false;
      if (this.vy < -200) {
        this.vy *= 0.52;
      }
    }

    // Gravity
    this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * dt);

    // Carry player if standing on a moving platform
    if (this.onGround) {
      for (const p of this.platforms) {
        if (!p.active || p.def.kind !== 'moving') continue;
        const onTop =
          Math.abs(this.py + PLAYER_H - p.prevY) <= 4 &&
          this.px + PLAYER_W > p.prevX + 1 &&
          this.px < p.prevX + p.w - 1;
        if (onTop) {
          this.px += p.x - p.prevX;
          this.py += p.y - p.prevY;
          break;
        }
      }
    }

    // Horizontal move & collide
    this.px += this.vx * dt;
    if (this.px < 0) {
      this.px = 0;
      this.vx = 0;
    }
    if (this.px + PLAYER_W > this.level.worldWidth) {
      this.px = this.level.worldWidth - PLAYER_W;
      this.vx = 0;
    }

    for (const p of this.platforms) {
      if (!p.active) continue;
      if (this.overlaps(this.px, this.py, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
        if (this.vx > 0) {
          this.px = p.x - PLAYER_W;
          this.vx = 0;
        } else if (this.vx < 0) {
          this.px = p.x + p.w;
          this.vx = 0;
        }
        if (p.def.kind === 'invisible') {
          p.touchGlow = 1.0;
        }
      }
    }

    // Vertical move & collide
    const wasOnGround = this.onGround;
    const prevVy = this.vy;
    this.onGround = false;
    this.py += this.vy * dt;

    for (const p of this.platforms) {
      if (!p.active) continue;
      if (this.overlaps(this.px, this.py, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
        if (this.vy >= 0) {
          // Landing-only fake breaking floor (e.g., Level 2 ragebait trap):
          // shatters immediately on touchdown with zero coyote-time escape.
          if (p.def.kind === 'fake_drop' && p.def.triggerOnLandingOnly && p.dropState === 'idle') {
            p.dropState = 'dropped';
            p.active = false;
            this.onGround = false;
            this.coyoteTimer = 0;
            this.vy = Math.max(prevVy * 0.45, 180);
            audioManager.playTrap();
            this.triggerShake(0.14, 4.5);
            this.recordTrick('trap');
            this.spawnDust(p.x + p.w * 0.22, p.y + 4, 7, '#111111');
            this.spawnDust(p.x + p.w * 0.5, p.y + 2, 6, '#DC2626');
            this.spawnDust(p.x + p.w * 0.78, p.y + 4, 7, '#111111');
            if (p.def.prankMessage) {
              this.showPrankBanner(p.def.prankMessage);
            }
            continue;
          }

          this.py = p.y - PLAYER_H;
          this.vy = 0;
          this.onGround = true;

          // Record last stable grounded footing for safe exact-edge pit recovery
          if (
            p.def.kind === 'solid' ||
            p.def.kind === 'moving' ||
            p.def.kind === 'invisible'
          ) {
            const safeX = Math.max(
              p.x + 2,
              Math.min(p.x + p.w - PLAYER_W - 2, this.px),
            );
            this.lastSafeGroundedPos = { x: safeX, y: p.y - PLAYER_H };
          }

          // Handle special platform interactions on landing/standing
          if (p.def.kind === 'crumble' && p.crumbleState === 'idle') {
            const local = adaptiveDifficulty.getLocalTrapModifiers(
              p.x + p.w / 2,
              p.y,
              this.level.id,
            );
            const cruelty = this.getLevelCrueltyProfile();
            const baseDelay = (p.def.crumbleDelay ?? 0.42) * cruelty.crumbleScale;
            p.crumbleState = 'shaking';
            p.crumbleTimer = Math.max(0.125, baseDelay / Math.min(1.42, local.frequencyMult));
            audioManager.playTrap();
            this.recordTrick('trap');
          } else if (p.def.kind === 'fake_drop' && p.dropState === 'idle') {
            const local = adaptiveDifficulty.getLocalTrapModifiers(
              p.x + p.w / 2,
              p.y,
              this.level.id,
            );
            const cruelty = this.getLevelCrueltyProfile();
            p.dropState = 'shaking';
            p.dropTimer = Math.max(0.025, (0.075 * cruelty.telegraphScale) / local.frequencyMult);
            audioManager.playTrap();
            this.recordTrick('trap');
            if (p.def.prankMessage) {
              this.showPrankBanner(p.def.prankMessage);
            }
          } else if (p.def.kind === 'bounce') {
            this.vy = -760;
            this.onGround = false;
            this.squashX = 0.72;
            this.squashY = 1.32;
            audioManager.playBounce();
            this.spawnDust(this.px + PLAYER_W / 2, p.y, 8, '#DC2626');
          } else if (p.def.kind === 'invisible') {
            p.touchGlow = 1.0;
          }
        } else if (this.vy < 0) {
          this.py = p.y + p.h;
          this.vy = 0;
          if (p.def.kind === 'invisible') {
            p.touchGlow = 1.0;
          }
        }
      }
    }

    // Landing juice
    if (!wasOnGround && this.onGround && prevVy > 180) {
      this.squashX = 1.24;
      this.squashY = 0.78;
      audioManager.playLand();
      this.spawnDust(this.px + PLAYER_W / 2, this.py + PLAYER_H, 5, '#78716C');
    }

    // Smoothly return squash/stretch to 1
    this.squashX += (1 - this.squashX) * Math.min(1, dt * 14);
    this.squashY += (1 - this.squashY) * Math.min(1, dt * 14);

    // Run cycle animation
    if (this.onGround && Math.abs(this.vx) > 20) {
      this.runCycle += dt * (Math.abs(this.vx) / 28);
    } else if (!this.onGround) {
      this.runCycle += dt * 3;
    }

    // Check pit death
    if (this.py > this.level.worldHeight + 60) {
      this.killPlayer('pit');
      return;
    }

    // Check hazard collisions (forgiving hitbox inset of 4px so near-misses feel fair!)
    // Brief invulnerability grace after rewarded extra-life respawn at exact death spot
    if (this.respawnInvulnTimer > 0) return;

    const hbX = this.px + 4;
    const hbY = this.py + 5;
    const hbW = PLAYER_W - 8;
    const hbH = PLAYER_H - 8;

    for (const h of this.hazards) {
      if (!h.active) continue;
      if (h.def.kind === 'popup_spike' && h.popupExtend < 0.45) continue;

      if (h.def.kind === 'saw' || h.def.kind === 'sweeper') {
        const cx = h.x + h.w / 2;
        const cy = h.y + h.h / 2;
        const r = h.w * 0.44;
        const closestX = Math.max(hbX, Math.min(cx, hbX + hbW));
        const closestY = Math.max(hbY, Math.min(cy, hbY + hbH));
        const dx = cx - closestX;
        const dy = cy - closestY;
        if (dx * dx + dy * dy < r * r) {
          this.killPlayer(h.def.kind);
          return;
        }
      } else if (h.def.kind === 'falling_block') {
        // Falling block only kills while actively falling onto player; once landed it's a jumpable block!
        if (h.fallState === 'falling') {
          if (this.overlaps(hbX, hbY, hbW, hbH, h.x + 2, h.y + 4, h.w - 4, h.h - 4)) {
            this.killPlayer('falling_block');
            return;
          }
        }
      } else {
        // Spikes / popup spikes
        const spikeY =
          h.def.kind === 'popup_spike' ? h.y + h.h * (1 - h.popupExtend) : h.y;
        const spikeH = h.def.kind === 'popup_spike' ? h.h * h.popupExtend : h.h;
        if (this.overlaps(hbX, hbY, hbW, hbH, h.x + 3, spikeY + 3, h.w - 6, Math.max(2, spikeH - 4))) {
          this.killPlayer(h.def.kind === 'popup_spike' ? 'popup_spike' : 'spike');
          return;
        }
      }
    }
  }

  /**
   * Per-level blown-up cruelty curve across all 100 levels.
   * Escalates relentlessly from Level 1 to Level 98, pushes Level 99 to razor-edge
   * near-impossibility, and cranks Level 100 to blistering peak-reflex brutality.
   */
  private getLevelCrueltyProfile(): {
    hazardSpeedScale: number;
    platformSpeedScale: number;
    crumbleScale: number;
    telegraphScale: number;
    dropSpeedScale: number;
    autoRearmPopups: boolean;
  } {
    const id = this.level.id;
    if (id >= 100) {
      return {
        hazardSpeedScale: 1.52,
        platformSpeedScale: 1.32,
        crumbleScale: 0.72,
        telegraphScale: 0.56,
        dropSpeedScale: 1.75,
        autoRearmPopups: true,
      };
    }
    if (id === 99) {
      return {
        hazardSpeedScale: 1.38,
        platformSpeedScale: 1.24,
        crumbleScale: 0.78,
        telegraphScale: 0.64,
        dropSpeedScale: 1.58,
        autoRearmPopups: true,
      };
    }
    const p = Math.min(1, Math.max(0, (id - 1) / 97));
    return {
      hazardSpeedScale: 1.12 + p * 0.24,
      platformSpeedScale: 1.05 + p * 0.18,
      crumbleScale: 0.90 - p * 0.14,
      telegraphScale: 0.88 - p * 0.24,
      dropSpeedScale: 1.15 + p * 0.42,
      autoRearmPopups: id >= 20,
    };
  }

  private updatePlatforms(dt: number): void {
    const playerCenterX = this.px + PLAYER_W / 2;
    const playerBottomY = this.py + PLAYER_H;
    const cruelty = this.getLevelCrueltyProfile();

    for (const p of this.platforms) {
      p.prevX = p.x;
      p.prevY = p.y;

      if (p.touchGlow > 0) {
        p.touchGlow = Math.max(0, p.touchGlow - dt * 1.4);
      }

      if (p.def.kind === 'moving' && p.active) {
        const local = adaptiveDifficulty.getLocalTrapModifiers(
          p.def.x + p.w / 2,
          p.def.y,
          this.level.id,
        );
        const platSpeedMult = Math.min(1.42, cruelty.platformSpeedScale + (local.speedMult - 1) * 0.55);
        const speed = (p.def.speed ?? 1.5) * platSpeedMult;
        p.oscPhase += dt * speed;
        const s = Math.sin(p.oscPhase);
        p.x = p.def.x + (p.def.moveX ?? 0) * s;
        p.y = p.def.y + (p.def.moveY ?? 0) * s;
      }

      if (p.def.kind === 'crumble') {
        if (p.crumbleState === 'shaking') {
          p.crumbleTimer -= dt;
          if (p.crumbleTimer <= 0) {
            const local = adaptiveDifficulty.getLocalTrapModifiers(
              p.x + p.w / 2,
              p.y,
              this.level.id,
            );
            p.crumbleState = 'gone';
            p.active = false;
            p.crumbleTimer = Math.max(1.0, (p.def.respawnDelay ?? 2.4) / local.frequencyMult);
            this.spawnDust(p.x + p.w / 2, p.y + p.h / 2, 12, '#111111');
          }
        } else if (p.crumbleState === 'gone') {
          p.crumbleTimer -= dt;
          if (p.crumbleTimer <= 0) {
            p.crumbleState = 'idle';
            p.active = true;
          }
        }
      }

      if (p.def.kind === 'fake_drop') {
        const local = adaptiveDifficulty.getLocalTrapModifiers(
          p.def.x + p.w / 2,
          p.def.y,
          this.level.id,
        );
        if (p.dropState === 'idle' && this.state === 'alive' && !p.def.triggerOnLandingOnly) {
          const dist = (p.def.triggerDist ?? 40) * (1 + (local.frequencyMult - 1) * 0.25);
          if (
            playerCenterX > p.x - dist * 0.4 &&
            playerCenterX < p.x + p.w + dist * 0.4 &&
            Math.abs(playerBottomY - p.y) < 35
          ) {
            p.dropState = 'shaking';
            p.dropTimer = Math.max(0.025, (0.075 * cruelty.telegraphScale) / local.frequencyMult);
            audioManager.playTrap();
            this.recordTrick('trap');
            if (p.def.prankMessage) {
              this.showPrankBanner(p.def.prankMessage);
            }
          }
        } else if (p.dropState === 'shaking') {
          p.dropTimer -= dt;
          if (p.dropTimer <= 0) {
            p.dropState = 'dropped';
          }
        } else if (p.dropState === 'dropped') {
          const targetY = p.def.y + (p.def.dropDistance ?? 220);
          p.y = Math.min(targetY, p.y + 660 * cruelty.dropSpeedScale * local.speedMult * dt);
          if (p.y >= targetY - 10) {
            p.active = false;
          }
        }
      }

      if (p.def.kind === 'reveal_wall' && p.retracted && p.retractProgress < 1) {
        p.retractProgress = Math.min(1, p.retractProgress + dt * 3.2);
        p.y = p.def.y - p.def.h * p.retractProgress;
        if (p.retractProgress >= 0.9) {
          p.active = false;
        }
      }
    }
  }

  private updateHazards(dt: number): void {
    const playerCenterX = this.px + PLAYER_W / 2;
    const snap = adaptiveDifficulty.getSnapshot(this.level.id);
    const cruelty = this.getLevelCrueltyProfile();

    for (const h of this.hazards) {
      if (!h.active) continue;

      const local = adaptiveDifficulty.getLocalTrapModifiers(
        h.def.x + h.w / 2,
        h.def.y + h.h / 2,
        this.level.id,
      );

      if (h.def.kind === 'saw' || h.def.kind === 'sweeper') {
        const speed = (h.def.speed ?? 2.0) * cruelty.hazardSpeedScale * local.speedMult;
        h.oscPhase += dt * speed;
        const s = Math.sin(h.oscPhase);
        h.x = h.def.x + (h.def.moveX ?? 0) * s;
        h.y = h.def.y + (h.def.moveY ?? 0) * s;
        h.angle += dt * (h.def.kind === 'saw' ? 9.5 : 5.2) * cruelty.hazardSpeedScale * local.speedMult;
      }

      if (h.def.kind === 'popup_spike') {
        if (h.popupState === 'hidden' && this.state === 'alive') {
          const trigX = h.def.triggerX ?? h.x;
          const trigR = (h.def.triggerRadius ?? 65) * (1 + (local.frequencyMult - 1) * 0.28);
          if (Math.abs(playerCenterX - trigX) < trigR && Math.abs(this.py + PLAYER_H - (h.y + h.h)) < 95) {
            h.popupState = 'telegraph';
            h.popupTimer = Math.max(
              0.065,
              ((h.def.telegraphTime ?? 0.22) * cruelty.telegraphScale) / local.frequencyMult,
            );
            audioManager.playTrap();
            this.recordTrick('trap');
          }
        } else if (h.popupState === 'telegraph') {
          h.popupTimer -= dt;
          h.popupExtend = 0.24;
          if (h.popupTimer <= 0) {
            h.popupState = 'up';
            h.popupCycleTimer = Math.max(0.65, (1.85 * cruelty.telegraphScale) / local.frequencyMult);
          }
        } else if (h.popupState === 'up') {
          h.popupExtend = Math.min(1, h.popupExtend + dt * 13 * cruelty.hazardSpeedScale * local.speedMult);
          // Re-arm pop-up spikes from Level 20+ or whenever death clustering escalates!
          if (
            (cruelty.autoRearmPopups || (snap.isEscalationEligibleLevel && snap.clusterEscalationTier >= 1)) &&
            h.popupExtend >= 1
          ) {
            h.popupCycleTimer -= dt;
            if (h.popupCycleTimer <= 0) {
              h.popupState = 'retracting';
            }
          }
        } else if (h.popupState === 'retracting') {
          h.popupExtend = Math.max(0, h.popupExtend - dt * 6.5 * local.frequencyMult);
          if (h.popupExtend <= 0) {
            h.popupState = 'hidden';
          }
        }
      }

      if (h.def.kind === 'falling_block') {
        if (h.fallState === 'idle' && this.state === 'alive') {
          const trigX = h.def.fallTriggerX ?? h.x - 45;
          const reachBonus = (local.frequencyMult - 1) * 24 + (this.level.id >= 50 ? 12 : 0);
          if (playerCenterX >= trigX - reachBonus && playerCenterX <= h.x + h.w + 45 + reachBonus) {
            h.fallState = 'shaking';
            h.fallTimer = Math.max(0.095, (0.26 * cruelty.telegraphScale) / local.frequencyMult);
            audioManager.playTrap();
            this.recordTrick('trap');
          }
        } else if (h.fallState === 'shaking') {
          h.fallTimer -= dt;
          if (h.fallTimer <= 0) {
            h.fallState = 'falling';
            h.fallVy = 110 * cruelty.hazardSpeedScale * local.speedMult;
          }
        } else if (h.fallState === 'falling') {
          h.fallVy += 2150 * cruelty.hazardSpeedScale * local.speedMult * dt;
          h.y += h.fallVy * dt;
          // Land on floor (find solid platform below)
          let floorY = 420;
          for (const p of this.platforms) {
            if (!p.active || p.def.kind !== 'solid') continue;
            if (h.x + h.w > p.x && h.x < p.x + p.w && p.y >= h.def.y) {
              floorY = Math.min(floorY, p.y);
            }
          }
          if (h.y + h.h >= floorY) {
            h.y = floorY - h.h;
            h.fallState = 'landed';
            h.fallTimer = Math.max(0.55, (1.75 * cruelty.telegraphScale) / local.frequencyMult);
            this.triggerShake(0.16, 6);
            audioManager.playLand();
            this.spawnDust(h.x + h.w / 2, floorY, 10, '#111111');
          }
        } else if (h.fallState === 'landed') {
          h.fallTimer -= dt;
          if (h.fallTimer <= 0) {
            h.fallState = 'rising';
          }
        } else if (h.fallState === 'rising') {
          h.y -= 200 * cruelty.hazardSpeedScale * local.speedMult * dt;
          if (h.y <= h.def.y) {
            h.y = h.def.y;
            h.fallState = 'idle';
          }
        }
      }
    }
  }

  private updateCheckpoints(dt: number): void {
    const playerCenterX = this.px + PLAYER_W / 2;
    const playerCenterY = this.py + PLAYER_H / 2;

    for (const cp of this.checkpoints) {
      if (cp.def.fake) {
        if (!cp.fakeTriggered && this.state === 'alive') {
          const dist = Math.hypot(playerCenterX - cp.x, playerCenterY - (cp.y - 26));
          if (dist < 78) {
            cp.fakeTriggered = true;
            audioManager.playTrap();
            this.recordTrick('trap');
            this.showPrankBanner(cp.def.fakeMessage ?? 'Fake checkpoint! Nice try.');
            if (cp.def.fakeBehavior === 'fly_up') {
              cp.vy = -340;
            } else if (cp.def.fakeBehavior === 'run_away') {
              cp.vx = 250;
            }
          }
        } else if (cp.fakeTriggered) {
          cp.fakeTimer += dt;
          if (cp.def.fakeBehavior === 'collapse') {
            cp.tiltAngle = Math.min(Math.PI / 2, cp.tiltAngle + dt * 5.2);
          } else if (cp.def.fakeBehavior === 'fly_up') {
            cp.y += cp.vy * dt;
            cp.vy -= 260 * dt;
          } else if (cp.def.fakeBehavior === 'run_away') {
            cp.x += cp.vx * dt;
          }
        }
      } else if (!cp.activated && this.state === 'alive') {
        const dist = Math.hypot(playerCenterX - cp.x, playerCenterY - (cp.y - 26));
        if (dist < 42) {
          cp.activated = true;
          this.checkpointReached = true;
          this.spawnX = cp.x - PLAYER_W / 2;
          this.spawnY = cp.y - PLAYER_H - 4;
          audioManager.playCheckpoint();
          this.spawnDust(cp.x, cp.y - 44, 14, '#DC2626');
          this.showPrankBanner('Checkpoint Saved (For Real This Time)');
          this.emitHud();
        }
      }
    }
  }

  private updateExits(dt: number): void {
    const playerCenterX = this.px + PLAYER_W / 2;
    const playerCenterY = this.py + PLAYER_H / 2;

    for (const ex of this.exits) {
      if (ex.quipTimer > 0) {
        ex.quipTimer -= dt;
        if (ex.quipTimer <= 0) ex.quipText = null;
      }

      // Move smoothly toward target if running away
      if (ex.moving) {
        const dx = ex.targetX - ex.x;
        const dy = ex.targetY - ex.y;
        const dist = Math.hypot(dx, dy);
        ex.legCycle += dt * 18;
        const step = 360 * dt;
        if (dist <= step) {
          ex.x = ex.targetX;
          ex.y = ex.targetY;
          ex.moving = false;
        } else {
          ex.x += (dx / dist) * step;
          ex.y += (dy / dist) * step;
        }
      }

      if (this.state !== 'alive') continue;

      const doorCenterX = ex.x;
      const doorCenterY = ex.y - 32;
      const dist = Math.hypot(playerCenterX - doorCenterX, playerCenterY - doorCenterY);

      // Moving goal check
      if (ex.def.moveTargets && ex.moveIndex < ex.def.moveTargets.length && !ex.moving) {
        const trigDist = ex.def.triggerDistance ?? 90;
        if (dist < trigDist) {
          const next = ex.def.moveTargets[ex.moveIndex];
          ex.targetX = next.x;
          ex.targetY = next.y;
          ex.moveIndex += 1;
          ex.moving = true;
          ex.quipText = next.quip ?? 'Nope!';
          ex.quipTimer = 2.0;
          audioManager.playTrap();
          this.recordTrick('trap');
          continue;
        }
      }

      // Touching exit doorway
      if (!ex.moving && Math.abs(playerCenterX - doorCenterX) < 28 && Math.abs(playerCenterY - doorCenterY) < 38) {
        if (ex.def.fake) {
          if (!ex.fakeTriggered) {
            ex.fakeTriggered = true;
            audioManager.playTrap();
            this.triggerShake(0.25, 7);
            this.recordTrick('trap');
            this.showPrankBanner(ex.def.fakeMessage ?? 'PLOT TWIST! THAT WAS A FAKE EXIT.');
            if (ex.def.revealsTriggerId) {
              this.revealedTriggers.add(ex.def.revealsTriggerId);
              for (const p of this.platforms) {
                if (p.def.kind === 'reveal_wall' && p.def.linkedTriggerId === ex.def.revealsTriggerId) {
                  p.retracted = true;
                  this.spawnDust(p.x + p.w / 2, p.y + p.h / 2, 18, '#111111');
                }
              }
            }
          }
        } else {
          // Real Victory! Clear this level's death streak.
          this.state = 'won';
          this.deathStreakByLevel.set(this.level.id, 0);
          this.activeStreakMilestone = null;
          audioManager.playLevelComplete();
          this.spawnDust(ex.x, ex.y - 30, 24, '#DC2626');
          this.spawnDust(ex.x, ex.y - 30, 16, '#111111');
          this.callbacks.onLevelComplete({
            levelId: this.level.id,
            elapsedMs: Math.round(this.levelTime * 1000),
            levelDeaths: this.levelDeaths,
            jumpsUsed: this.jumpsUsedInLevel,
            tricksTriggeredInLevel: this.tricksInLevel,
          });
        }
      }
    }
  }

  private updateRewards(dt: number): void {
    const playerCenterX = this.px + PLAYER_W / 2;
    const playerCenterY = this.py + PLAYER_H / 2;

    for (const r of this.rewards) {
      r.bobPhase += dt * 3.2;
      if (r.collected || this.state !== 'alive') continue;
      const dist = Math.hypot(playerCenterX - r.def.x, playerCenterY - r.def.y);
      if (dist < 32) {
        r.collected = true;
        audioManager.playTrap();
        this.recordTrick('fake_reward');
        this.showPrankBanner(r.def.prankMessage);
        this.spawnDust(r.def.x, r.def.y, 16, '#DC2626');
        this.spawnDust(r.def.x, r.def.y, 12, '#111111');
        if (r.def.triggersBounce) {
          this.vy = -420;
        }
      }
    }
  }

  private updateSigns(): void {
    const playerCenterX = this.px + PLAYER_W / 2;
    for (const s of this.signs) {
      if (s.def.flippedText && !s.flipped && playerCenterX > s.def.x + 55) {
        s.flipped = true;
      }
    }
  }

  private recordTrick(kind: 'trap' | 'fake_reward' | 'fourth_wall'): void {
    this.tricksInLevel += 1;
    this.callbacks.onTrickTriggered(kind);
    if ((kind === 'fake_reward' || kind === 'trap') && !this.fourthWallBubble && Math.random() < 0.82) {
      this.fourthWallBubble = pickEscalatingStickmanInsult('trap', this.level.id, this.levelDeaths);
      this.fourthWallBubbleTimer = 2.6;
      this.lookingAtPlayer = true;
    }
  }

  private showPrankBanner(text: string, duration = 2.6): void {
    this.prankBanner = text;
    this.prankBannerId += 1;
    this.prankBannerTimer = duration;
    this.emitHud();
  }

  /**
   * Escalating ragebait respawn policy:
   * - Levels 01-15: Normal checkpoints (lulls players into trusting saves).
   * - Levels 16-30: Checkpoints hold for 1 death, then revoke back to the level start.
   * - Levels 31-100: Every single death sends the player all the way back to the level's starting point.
   */
  private shouldResetToLevelStart(): boolean {
    if (this.level.id >= 31) return true;
    if (this.level.id >= 16 && this.levelDeaths >= 2) return true;
    return false;
  }

  private pickStartResetBanner(hadCheckpoint: boolean): string {
    if (hadCheckpoint) {
      if (this.level.id === 100) {
        return 'Zero checkpoints. Zero mercy. Back to 0px.';
      }
      if (this.level.id >= 90) {
        return 'Thought that checkpoint saved you? Back to the very start.';
      }
      if (this.level.id >= 60) {
        return 'Checkpoints are a lie at this difficulty. Start over from 0%.';
      }
      if (this.level.id >= 31) {
        return 'Checkpoint betrayed you. Back to the starting line!';
      }
      return 'Checkpoint expired. Enjoy walking from the start again.';
    }

    const banners = [
      'All that progress — gone. Back to the starting point.',
      'No checkpoint mercy here. Start from the beginning, loser.',
      'Died near the end? Welcome back to 0%.',
      'Back to the starting line. Try not to choke this time.',
    ];
    return banners[(this.levelDeaths + this.level.id) % banners.length];
  }

  private killPlayer(cause: DeathCause): void {
    if (this.state !== 'alive') return;
    this.state = 'dying';
    this.stateTimer = this.callbacks.onDeathScreenOpen ? 0.36 : 0.52;
    this.hitstopTimer = 0.055;
    this.deathFlashAlpha = 0.28;
    this.triggerShake(0.24, 9);

    const exactX = this.px;
    const exactY = this.py;

    this.levelDeaths += 1;
    this.totalDeathsGlobal += 1;
    this.consecutiveQuickDeaths += 1;

    // Track per-level death streak and trigger escalating stickman comments at 5, 10, and 20
    const nextLevelStreak = (this.deathStreakByLevel.get(this.level.id) ?? 0) + 1;
    this.deathStreakByLevel.set(this.level.id, nextLevelStreak);
    const streakMilestone = getDeathStreakMilestone(nextLevelStreak);
    const streakMockery = streakMilestone
      ? pickDeathStreakStickmanComment(streakMilestone, this.level.id)
      : null;
    this.activeStreakMilestone = streakMilestone;

    const resetToStart = this.shouldResetToLevelStart();
    const hadCheckpoint = this.checkpointReached;
    const distanceFromStart = Math.abs(this.px - this.level.spawn.x);

    // Only apply automatic start-reset immediately when no interactive Death Screen is attached;
    // when Death Screen is active, preserve checkpoints & state so Rewarded Extra Life can restore exact spot.
    if (resetToStart) {
      this.pendingFullStartReset = true;
      if (!this.callbacks.onDeathScreenOpen) {
        this.checkpointReached = false;
        this.spawnX = this.level.spawn.x;
        this.spawnY = this.level.spawn.y;
        this.revealedTriggers.clear();
      }
      if (!streakMockery && (hadCheckpoint || distanceFromStart > 320)) {
        this.showPrankBanner(this.pickStartResetBanner(hadCheckpoint));
      }
    }

    const repeatCount = adaptiveDifficulty.recordDeath(this.px, this.py, this.level.id, cause);
    const updatedSnap = adaptiveDifficulty.getSnapshot(this.level.id);
    this.adaptiveHint = updatedSnap.activeModifierText;
    this.currentDeathMessage = streakMockery
      ? streakMockery.taunt
      : pickDeathMessage(cause, repeatCount, this.level.id);
    this.deathMessageId += 1;
    this.deathMessageTimer = streakMilestone ? 4.4 : 3.2;

    // Save exact death position for rewarded extra-life respawn
    // (for pit falls off the bottom of the screen, anchor right at the exact edge where the player fell)
    const respawnX =
      cause === 'pit'
        ? this.lastSafeGroundedPos.x
        : Math.max(8, Math.min(this.level.worldWidth - PLAYER_W - 8, exactX));
    const respawnY =
      cause === 'pit'
        ? this.lastSafeGroundedPos.y
        : Math.max(36, Math.min(this.level.worldHeight - PLAYER_H - 18, exactY));

    this.savedDeathSnapshot = {
      levelId: this.level.id,
      cause,
      exactX,
      exactY,
      respawnX,
      respawnY,
      facing: this.facing,
      levelDeaths: this.levelDeaths,
      levelDeathStreak: nextLevelStreak,
      deathMessage: this.currentDeathMessage,
      streakMilestone,
    };

    if (streakMockery) {
      const bannerDuration =
        streakMilestone === 20 ? 5.2 : streakMilestone === 10 ? 4.5 : 3.8;
      this.showPrankBanner(streakMockery.banner, bannerDuration);
    }

    // Stickman roasts the player — 5 / 10 / 20 death streak milestones take priority
    this.fourthWallBubble = streakMockery
      ? streakMockery.bubble
      : resetToStart && hadCheckpoint
        ? this.level.id >= 60
          ? 'Checkpoint? Cute. Welcome back to the start.'
          : 'You really thought that flag saved you?'
        : pickEscalatingStickmanInsult('respawn', this.level.id, this.levelDeaths);
    this.fourthWallBubbleTimer = streakMilestone
      ? streakMilestone === 20
        ? 5.6
        : streakMilestone === 10
          ? 4.8
          : 4.2
      : this.level.id >= 96
        ? 3.4
        : 2.9;
    this.lookingAtPlayer = true;

    audioManager.playDeath();
    audioManager.setAtmosphereLevel(this.level.id, nextLevelStreak);
    this.spawnDust(this.px + PLAYER_W / 2, this.py + PLAYER_H / 2, 18, '#DC2626');
    this.spawnDust(this.px + PLAYER_W / 2, this.py + PLAYER_H / 2, 14, '#111111');

    this.callbacks.onDeathRecorded(this.level.id, this.levelDeaths, nextLevelStreak);
    this.emitHud();
  }

  private triggerShake(duration: number, intensity: number): void {
    this.shakeTime = Math.max(this.shakeTime, duration);
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  private spawnDust(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 160) this.particles.shift();
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 230;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: 3 + Math.random() * 4.5,
        color,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        gravity: 560,
        shape: Math.random() > 0.4 ? 'square' : 'circle',
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private overlaps(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number,
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate({
      levelId: this.level.id,
      chapter: this.level.chapter,
      levelInChapter: this.level.levelInChapter,
      levelName: this.level.name,
      chapterTitle: this.level.chapterTitle,
      elapsedMs: Math.round(this.levelTime * 1000),
      levelDeaths: this.levelDeaths,
      levelDeathStreak: this.deathStreakByLevel.get(this.level.id) ?? 0,
      deathStreakMilestone: this.activeStreakMilestone,
      totalDeaths: this.totalDeathsGlobal,
      checkpointReached: this.checkpointReached,
      deathMessage: this.currentDeathMessage,
      deathMessageId: this.deathMessageId,
      prankBanner: this.prankBanner,
      prankBannerId: this.prankBannerId,
      adaptiveHint: this.adaptiveHint,
    });
  }

  // =========================================================================
  // MINIMALIST INK-ON-WARM-PAPER RENDERER
  // =========================================================================
  private render(): void {
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = this.canvas.clientWidth || VIEW_WIDTH;
    const cssH = this.canvas.clientHeight || VIEW_HEIGHT;
    const targetW = Math.max(1, Math.round(cssW * dpr));
    const targetH = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Fill warm drafting-paper background
    ctx.fillStyle = '#F5F3EE';
    ctx.fillRect(0, 0, targetW, targetH);

    // Compute aspect-fit uniform scale centered nicely across any landscape screen
    const scaleX = targetW / VIEW_WIDTH;
    const scaleY = targetH / VIEW_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (targetW - VIEW_WIDTH * scale) * 0.5;
    const offsetY = (targetH - VIEW_HEIGHT * scale) * 0.5;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Subtle paper drafting grid (parallaxed with camera)
    this.drawBackgroundGrid(ctx);

    // Camera transform + shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      const mag = this.shakeIntensity * (this.shakeTime / 0.25);
      shakeX = (Math.random() * 2 - 1) * mag;
      shakeY = (Math.random() * 2 - 1) * mag;
    }

    ctx.save();
    ctx.translate(-Math.round(this.camX) + shakeX, shakeY);

    // Render order: Signs -> Adaptive Clue -> Checkpoints -> Exits -> Platforms -> Hazards -> Fake Rewards -> Player -> Particles
    this.drawSigns(ctx);
    this.drawAdaptiveClue(ctx);
    this.drawCheckpoints(ctx);
    this.drawExits(ctx);
    this.drawPlatforms(ctx);
    this.drawHazards(ctx);
    this.drawRewards(ctx);

    this.stickmanGhostTrail.render(ctx, this.level.id, PLAYER_W, PLAYER_H, {
      x: this.px,
      y: this.py,
      visible: this.state !== 'dying' && this.state !== 'death_screen',
    });

    if (this.state !== 'dying' && this.state !== 'death_screen') {
      this.drawStickman(ctx);
    }

    this.drawParticles(ctx);

    ctx.restore();

    // Subtle warm paper edge vignette for editorial sketchbook depth
    const vig = ctx.createRadialGradient(
      VIEW_WIDTH * 0.5,
      VIEW_HEIGHT * 0.48,
      VIEW_HEIGHT * 0.35,
      VIEW_WIDTH * 0.5,
      VIEW_HEIGHT * 0.5,
      VIEW_WIDTH * 0.72,
    );
    vig.addColorStop(0, 'rgba(245, 243, 238, 0)');
    vig.addColorStop(1, 'rgba(17, 17, 17, 0.08)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Crimson edge vignette flash on death
    if (this.deathFlashAlpha > 0) {
      ctx.fillStyle = `rgba(220, 38, 38, ${this.deathFlashAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }

    ctx.restore();
  }

  private drawBackgroundGrid(ctx: CanvasRenderingContext2D): void {
    const gridSize = 40;
    const startX = -((this.camX * 0.35) % gridSize);
    ctx.strokeStyle = 'rgba(17, 17, 17, 0.042)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x <= VIEW_WIDTH; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VIEW_HEIGHT);
    }
    for (let y = 0; y <= VIEW_HEIGHT; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_WIDTH, y);
    }
    ctx.stroke();

    // Soft floating atmospheric ink specks
    ctx.fillStyle = 'rgba(17, 17, 17, 0.12)';
    for (let i = 0; i < 14; i++) {
      const mx = ((i * 197 - this.camX * 0.22 + this.worldTime * (6 + (i % 4) * 2)) % (VIEW_WIDTH + 40) + VIEW_WIDTH + 40) % (VIEW_WIDTH + 40) - 20;
      const my = 65 + ((i * 83) % 340) + Math.sin(this.worldTime * 1.1 + i) * 10;
      ctx.beginPath();
      ctx.arc(mx, my, 1.3 + (i % 2) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle architectural drafting ticks in distant parallax
    ctx.fillStyle = 'rgba(17, 17, 17, 0.04)';
    const parallax = -(this.camX * 0.15) % 480;
    for (let i = -1; i < 4; i++) {
      const bx = parallax + i * 480 + 120;
      ctx.fillRect(bx, 180, 1.5, 240);
      ctx.fillRect(bx - 5, 180, 12, 1.5);
      ctx.fillRect(bx + 180, 240, 1.5, 180);
      ctx.fillRect(bx + 175, 240, 12, 1.5);
    }
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D): void {
    for (const p of this.platforms) {
      const isFallingDropTile =
        p.def.kind === 'fake_drop' &&
        p.dropState === 'dropped' &&
        p.y < p.def.y + (p.def.dropDistance ?? 220) - 6;
      if (!p.active && !isFallingDropTile && p.def.kind !== 'crumble' && p.def.kind !== 'invisible') continue;

      if (p.def.kind === 'crumble' && p.crumbleState === 'gone') {
        // Faint dashed ghost showing where platform will respawn
        ctx.save();
        ctx.strokeStyle = 'rgba(17, 17, 17, 0.18)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
        ctx.restore();
        continue;
      }

      if (p.def.kind === 'invisible') {
        const pulse = 0.14 + 0.12 * Math.sin(this.worldTime * 3.2 + p.x * 0.02);
        const alpha = Math.max(pulse, p.touchGlow * 0.85);
        ctx.save();
        ctx.strokeStyle = `rgba(17, 17, 17, ${alpha.toFixed(2)})`;
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
        if (p.touchGlow > 0.05) {
          ctx.fillStyle = `rgba(17, 17, 17, ${(p.touchGlow * 0.14).toFixed(2)})`;
          ctx.fillRect(p.x, p.y, p.w, p.h);
        }
        ctx.restore();
        continue;
      }

      ctx.save();
      let ox = 0;
      let oy = 0;
      if (
        (p.def.kind === 'crumble' && p.crumbleState === 'shaking') ||
        (p.def.kind === 'fake_drop' && p.dropState === 'shaking')
      ) {
        ox = (Math.random() * 2 - 1) * 3;
        oy = (Math.random() * 2 - 1) * 2;
      }

      // Draw moving platform track first
      if (p.def.kind === 'moving') {
        ctx.save();
        ctx.strokeStyle = 'rgba(17, 17, 17, 0.16)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.def.x - (p.def.moveX ?? 0) + p.w / 2, p.def.y - (p.def.moveY ?? 0) + p.h / 2);
        ctx.lineTo(p.def.x + (p.def.moveX ?? 0) + p.w / 2, p.def.y + (p.def.moveY ?? 0) + p.h / 2);
        ctx.stroke();
        ctx.restore();
      }

      if (p.def.kind === 'bounce') {
        // Spring bounce pad
        ctx.fillStyle = '#111111';
        ctx.fillRect(p.x, p.y + 8, p.w, p.h - 8);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(p.x + 3, p.y, p.w - 6, 8);
        ctx.restore();
        continue;
      }

      // Crisp architectural ink shadow behind platform
      ctx.fillStyle = 'rgba(17, 17, 17, 0.11)';
      ctx.fillRect(p.x + ox + 4, p.y + oy + 4, p.w, p.h);

      // Matte black ink platform
      ctx.fillStyle = '#111111';
      ctx.fillRect(p.x + ox, p.y + oy, p.w, p.h);

      // Subtle paper-sheen hairline along top walkable edge
      ctx.fillStyle = 'rgba(245, 243, 238, 0.22)';
      ctx.fillRect(p.x + ox, p.y + oy, p.w, 1.5);

      // Subtle architectural surface detail
      if (p.def.kind === 'crumble') {
        // Distinct fair crack lines telegraphing crumbling block
        ctx.strokeStyle = '#F5F3EE';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(p.x + ox + p.w * 0.25, p.y + oy);
        ctx.lineTo(p.x + ox + p.w * 0.32, p.y + oy + p.h * 0.55);
        ctx.lineTo(p.x + ox + p.w * 0.22, p.y + oy + p.h);
        ctx.moveTo(p.x + ox + p.w * 0.68, p.y + oy);
        ctx.lineTo(p.x + ox + p.w * 0.62, p.y + oy + p.h * 0.6);
        ctx.lineTo(p.x + ox + p.w * 0.74, p.y + oy + p.h);
        ctx.stroke();
      } else if (
        p.def.kind === 'fake_drop' &&
        p.def.triggerOnLandingOnly &&
        p.dropState === 'dropped'
      ) {
        // Sudden fracture lines revealed only once the hidden breaking tile snaps
        ctx.strokeStyle = '#F5F3EE';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(p.x + ox + p.w * 0.34, p.y + oy);
        ctx.lineTo(p.x + ox + p.w * 0.46, p.y + oy + 26);
        ctx.lineTo(p.x + ox + p.w * 0.38, p.y + oy + 58);
        ctx.moveTo(p.x + ox + p.w * 0.68, p.y + oy);
        ctx.lineTo(p.x + ox + p.w * 0.58, p.y + oy + 30);
        ctx.lineTo(p.x + ox + p.w * 0.72, p.y + oy + 62);
        ctx.stroke();
      } else if (
        (p.def.kind === 'fake_drop' && !p.def.hideSeam) ||
        (p.def.kind === 'solid' && p.def.fakeSeamDecoy)
      ) {
        // Subtle hairline seam at edges (fair observational clue — or cruel decoy!)
        ctx.strokeStyle = 'rgba(245, 243, 238, 0.32)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x + ox + 1, p.y + oy);
        ctx.lineTo(p.x + ox + 1, p.y + oy + 16);
        ctx.moveTo(p.x + ox + p.w - 1, p.y + oy);
        ctx.lineTo(p.x + ox + p.w - 1, p.y + oy + 16);
        ctx.stroke();
      } else if (p.def.kind === 'moving') {
        // Center grip ticks
        ctx.fillStyle = '#F5F3EE';
        ctx.fillRect(p.x + p.w / 2 - 12, p.y + p.h / 2 - 2, 24, 4);
      } else if (p.def.kind === 'reveal_wall') {
        // Subtle recessed door grooves
        ctx.strokeStyle = 'rgba(245, 243, 238, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x + 6, p.y + 8, p.w - 12, p.h - 16);
      }

      ctx.restore();
    }
  }

  private drawHazards(ctx: CanvasRenderingContext2D): void {
    for (const h of this.hazards) {
      if (!h.active) continue;

      if (h.def.kind === 'spike' || h.def.kind === 'popup_spike') {
        // Always draw subtle floor seam for popup spikes so observant players can spot them!
        if (h.def.kind === 'popup_spike') {
          ctx.fillStyle = '#DC2626';
          ctx.fillRect(h.x + 2, h.y + h.h - 2, h.w - 4, 2.5);
          if (h.popupExtend <= 0.02) continue;
        }

        const dir = h.def.dir ?? 'up';
        const spikeCount = Math.max(1, Math.round(h.w / 18));
        const sw = h.w / spikeCount;
        const sh = h.def.kind === 'popup_spike' ? h.h * h.popupExtend : h.h;

        ctx.fillStyle = '#DC2626';
        ctx.strokeStyle = '#991B1B';
        ctx.lineWidth = 1.2;

        for (let i = 0; i < spikeCount; i++) {
          const sx = h.x + i * sw;
          ctx.beginPath();
          if (dir === 'up') {
            const baseY = h.y + h.h;
            ctx.moveTo(sx + 1, baseY);
            ctx.lineTo(sx + sw / 2, baseY - sh);
            ctx.lineTo(sx + sw - 1, baseY);
          } else {
            ctx.moveTo(sx + 1, h.y);
            ctx.lineTo(sx + sw / 2, h.y + sh);
            ctx.lineTo(sx + sw - 1, h.y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (h.def.kind === 'saw' || h.def.kind === 'sweeper') {
        // Track line
        ctx.save();
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.2)';
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(h.def.x - (h.def.moveX ?? 0) + h.w / 2, h.def.y - (h.def.moveY ?? 0) + h.h / 2);
        ctx.lineTo(h.def.x + (h.def.moveX ?? 0) + h.w / 2, h.def.y + (h.def.moveY ?? 0) + h.h / 2);
        ctx.stroke();
        ctx.restore();

        const cx = h.x + h.w / 2;
        const cy = h.y + h.h / 2;
        const r = h.w / 2;
        const teeth = h.def.kind === 'saw' ? 10 : 6;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(h.angle);
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        for (let i = 0; i < teeth * 2; i++) {
          const a = (i * Math.PI) / teeth;
          const rad = i % 2 === 0 ? r : r * 0.7;
          const vx = Math.cos(a) * rad;
          const vy = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.fill();

        // Inner hub
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F5F3EE';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (h.def.kind === 'falling_block') {
        const shake = h.fallState === 'shaking' ? (Math.random() * 2 - 1) * 3.5 : 0;
        ctx.save();
        ctx.fillStyle = '#111111';
        ctx.fillRect(h.x + shake, h.y, h.w, h.h);
        // Crimson danger underside bar
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(h.x + shake + 3, h.y + h.h - 7, h.w - 6, 7);
        // Expressive angry eyes on the falling block!
        ctx.fillStyle = '#F5F3EE';
        ctx.fillRect(h.x + shake + 16, h.y + 18, 9, 6);
        ctx.fillRect(h.x + shake + h.w - 25, h.y + 18, 9, 6);
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(h.x + shake + 14, h.y + 14);
        ctx.lineTo(h.x + shake + 27, h.y + 18);
        ctx.moveTo(h.x + shake + h.w - 14, h.y + 14);
        ctx.lineTo(h.x + shake + h.w - 27, h.y + 18);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawCheckpoints(ctx: CanvasRenderingContext2D): void {
    for (const cp of this.checkpoints) {
      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate(cp.tiltAngle);

      // Pole
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -52);
      ctx.stroke();

      // Base cap
      ctx.fillStyle = '#111111';
      ctx.fillRect(-7, -4, 14, 4);

      // Flag pennant
      const wave = Math.sin(this.worldTime * 5 + cp.x) * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(28, -41 + wave);
      ctx.lineTo(0, -31);
      ctx.closePath();

      if (cp.activated) {
        ctx.fillStyle = '#111111';
        ctx.fill();
        // Crisp crimson checkmark dot inside activated flag
        ctx.fillStyle = '#F5F3EE';
        ctx.beginPath();
        ctx.arc(10, -40.5 + wave * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#F5F3EE';
        ctx.fill();
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // If fake checkpoint running away, draw tiny stick legs!
      if (cp.def.fake && cp.fakeTriggered && cp.def.fakeBehavior === 'run_away') {
        const swing = Math.sin(this.worldTime * 22) * 8;
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-swing, 10);
        ctx.moveTo(0, 0);
        ctx.lineTo(swing, 10);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawExits(ctx: CanvasRenderingContext2D): void {
    for (const ex of this.exits) {
      const doorW = 46;
      const doorH = 68;
      const dx = ex.x - doorW / 2;
      const dy = ex.y - doorH;

      ctx.save();

      // Running legs if moving goal!
      if (ex.moving) {
        const swing = Math.sin(ex.legCycle) * 10;
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex.x - 10, ex.y - 2);
        ctx.lineTo(ex.x - 10 + swing, ex.y + 10);
        ctx.moveTo(ex.x + 10, ex.y - 2);
        ctx.lineTo(ex.x + 10 - swing, ex.y + 10);
        ctx.stroke();
      }

      // Doorway frame
      ctx.fillStyle = ex.fakeTriggered ? '#D6D1C7' : '#111111';
      ctx.fillRect(dx, dy, doorW, doorH);

      // Inner doorway recess
      ctx.fillStyle = ex.fakeTriggered ? '#F5F3EE' : '#262626';
      ctx.fillRect(dx + 5, dy + 5, doorW - 10, doorH - 5);

      // Door handle
      if (!ex.fakeTriggered) {
        ctx.fillStyle = '#F5F3EE';
        ctx.beginPath();
        ctx.arc(dx + doorW - 12, dy + doorH * 0.56, 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Big crimson X stamped over fake exit once busted
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(dx + 10, dy + 14);
        ctx.lineTo(dx + doorW - 10, dy + doorH - 14);
        ctx.moveTo(dx + doorW - 10, dy + 14);
        ctx.lineTo(dx + 10, dy + doorH - 14);
        ctx.stroke();
      }

      // Crisp EXIT plaque above door
      ctx.fillStyle = '#111111';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ex.fakeTriggered ? 'NOPE' : 'EXIT', ex.x, dy - 7);

      // Cheeky speech bubble when moving exit scoots
      if (ex.quipText) {
        this.drawSpeechBubble(ctx, ex.x, dy - 22, ex.quipText);
      }

      ctx.restore();
    }
  }

  private drawSigns(ctx: CanvasRenderingContext2D): void {
    for (const s of this.signs) {
      const label = s.flipped && s.def.flippedText ? s.def.flippedText : s.def.text;
      ctx.save();
      ctx.font = '600 12px "DM Sans", sans-serif';
      const textW = ctx.measureText(label).width;
      const boardW = Math.max(66, textW + 22);
      const boardH = 28;
      const bx = s.def.x - boardW / 2;
      const by = s.def.y - 54;

      // Wooden ink post
      ctx.fillStyle = '#111111';
      ctx.fillRect(s.def.x - 2, by + boardH, 4, 26);

      // Signboard
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, boardW, boardH, 4);
      ctx.fill();
      ctx.stroke();

      // Label text
      ctx.fillStyle = '#111111';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, s.def.x, by + boardH / 2 + 0.5);

      ctx.restore();
    }
  }

  private drawAdaptiveClue(ctx: CanvasRenderingContext2D): void {
    const snap = adaptiveDifficulty.getSnapshot(this.level.id);

    // Subtle minimalist red ink death-cluster marks & hotspot ring in Levels 10-30
    if (snap.isEscalationEligibleLevel && snap.deathClusters.length > 0) {
      ctx.save();
      for (const cluster of snap.deathClusters) {
        if (cluster.count < 2) continue;
        const cx = cluster.x + PLAYER_W / 2;
        const cy = Math.min(this.level.worldHeight - 40, cluster.y + PLAYER_H / 2);

        // Faint dashed hotspot ring pulsing subtly with cluster heat
        const pulse = 1 + Math.sin(this.worldTime * (3 + cluster.intensity * 3)) * 0.06;
        const ringR = (28 + cluster.intensity * 18) * pulse;
        ctx.strokeStyle = `rgba(220, 38, 38, ${(0.16 + cluster.intensity * 0.22).toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();

        // Crisp ink "X" mark + cluster count label
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.52)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 5);
        ctx.lineTo(cx + 5, cy + 5);
        ctx.moveTo(cx + 5, cy - 5);
        ctx.lineTo(cx - 5, cy + 5);
        ctx.stroke();

        ctx.font = '700 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(220, 38, 38, 0.78)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`×${cluster.count}`, cx, cy - 14);
      }
      ctx.restore();
    }

    if (!snap.repeatFailZone || !this.level.adaptiveClue) return;
    const clue = this.level.adaptiveClue;

    ctx.save();
    ctx.font = '600 11px "JetBrains Mono", monospace';
    const w = ctx.measureText(clue.text).width + 20;
    const h = 24;
    const x = clue.x - w / 2;
    const y = clue.y - h / 2 + Math.sin(this.worldTime * 3.5) * 3;

    ctx.fillStyle = '#FEF2F2';
    ctx.strokeStyle = '#DC2626';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#DC2626';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(clue.text, clue.x, y + h / 2 + 0.5);
    ctx.restore();
  }

  private drawRewards(ctx: CanvasRenderingContext2D): void {
    for (const r of this.rewards) {
      if (r.collected) continue;
      const bob = Math.sin(r.bobPhase) * 4.5;
      const rx = r.def.x;
      const ry = r.def.y + bob;

      ctx.save();
      ctx.translate(rx, ry);

      // Subtle radiating shimmer ring
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 15 + Math.sin(r.bobPhase * 2) * 2, 0, Math.PI * 2);
      ctx.stroke();

      if (r.def.kind === 'coin') {
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#F5F3EE';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#F5F3EE';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
      } else {
        // Star / trophy icon
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const rad = i % 2 === 0 ? 12 : 5.5;
          const vx = Math.cos(a) * rad;
          const vy = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private updateGhostTrail(dt: number, allowEmit: boolean): void {
    this.stickmanGhostTrail.update(dt, {
      x: this.px,
      y: this.py,
      vx: this.vx,
      vy: this.vy,
      squashX: this.squashX,
      squashY: this.squashY,
      facing: this.facing,
      runCycle: this.runCycle,
      onGround: this.onGround,
      baseMoveSpeed: BASE_MOVE_SPEED,
      levelId: this.level.id,
      allowEmit: allowEmit && this.state === 'alive',
    });
  }

  private drawStickman(ctx: CanvasRenderingContext2D): void {
    const cx = this.px + PLAYER_W / 2;
    const bottomY = this.py + PLAYER_H;

    ctx.save();
    ctx.translate(cx, bottomY);
    if (this.respawnInvulnTimer > 0) {
      // Subtle crimson protection halo & rhythmic blink during post-extra-life grace window
      const pulse = 0.5 + 0.5 * Math.sin(this.worldTime * 22);
      ctx.save();
      ctx.strokeStyle = `rgba(220, 38, 38, ${(0.25 + pulse * 0.45).toFixed(2)})`;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, -22, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = pulse > 0.35 ? 1 : 0.45;
    }
    const popScale = this.state === 'respawning' ? 0.4 + 0.6 * this.respawnPop : 1;
    ctx.scale(this.squashX * popScale, this.squashY * popScale);

    const isRunning = this.onGround && Math.abs(this.vx) > 20;
    const isJumping = !this.onGround && this.vy < 0;
    const isFalling = !this.onGround && this.vy >= 0;

    // Slight forward lean while running
    const lean = isRunning ? (this.vx / BASE_MOVE_SPEED) * 0.14 : 0;
    ctx.rotate(lean);

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const hipY = -15;
    const shoulderY = -28;
    const headY = -36;

    // Legs
    let leftFootX = -5;
    let leftFootY = 0;
    let rightFootX = 5;
    let rightFootY = 0;

    if (isRunning) {
      const s = Math.sin(this.runCycle);
      leftFootX = s * 9;
      leftFootY = Math.min(0, -Math.cos(this.runCycle) * 4);
      rightFootX = -s * 9;
      rightFootY = Math.min(0, Math.cos(this.runCycle) * 4);
    } else if (isJumping) {
      leftFootX = -6 * this.facing;
      leftFootY = -5;
      rightFootX = 5 * this.facing;
      rightFootY = -2;
    } else if (isFalling) {
      leftFootX = -7;
      leftFootY = -3;
      rightFootX = 7;
      rightFootY = -6;
    }

    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(leftFootX, leftFootY);
    ctx.moveTo(0, hipY);
    ctx.lineTo(rightFootX, rightFootY);
    ctx.stroke();

    // Torso
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(0, shoulderY);
    ctx.stroke();

    // Arms
    let leftHandX = -7;
    let leftHandY = -18;
    let rightHandX = 7;
    let rightHandY = -18;

    if (isRunning) {
      const s = Math.sin(this.runCycle);
      leftHandX = -s * 8;
      leftHandY = -19;
      rightHandX = s * 8;
      rightHandY = -19;
    } else if (isJumping) {
      leftHandX = -9;
      leftHandY = -33;
      rightHandX = 9;
      rightHandY = -33;
    } else if (isFalling) {
      leftHandX = -11;
      leftHandY = -36;
      rightHandX = 11;
      rightHandY = -36;
    }

    ctx.beginPath();
    ctx.moveTo(0, shoulderY + 1);
    ctx.lineTo(leftHandX, leftHandY);
    ctx.moveTo(0, shoulderY + 1);
    ctx.lineTo(rightHandX, rightHandY);
    ctx.stroke();

    // Subtle ground contact shadow when grounded
    if (this.onGround) {
      ctx.fillStyle = 'rgba(17, 17, 17, 0.16)';
      ctx.beginPath();
      ctx.ellipse(0, 1, 10, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Round Stickman Head
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, headY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Expressive Eyes & Mouth!
    const isInsulting = Boolean(this.fourthWallBubble);
    const eyeOffsetX = this.lookingAtPlayer || isInsulting ? 0 : this.facing * 2.3;
    const eyeY = headY - 1;

    if (this.isBlinking) {
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(eyeOffsetX - 4.2, eyeY);
      ctx.lineTo(eyeOffsetX - 1.2, eyeY);
      ctx.moveTo(eyeOffsetX + 1.2, eyeY);
      ctx.lineTo(eyeOffsetX + 4.2, eyeY);
      ctx.stroke();
    } else {
      const eyeR = isFalling ? 2.1 : 1.6;
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(eyeOffsetX - 2.8, eyeY, eyeR, 0, Math.PI * 2);
      ctx.arc(eyeOffsetX + 2.8, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Annoyed / menacing eyebrows intensify as levels get crueler!
      if (this.lookingAtPlayer || isInsulting || this.levelDeaths >= 1 || this.level.id >= 40) {
        const isCruelEndgame = this.level.id >= 75;
        ctx.strokeStyle = isCruelEndgame && isInsulting ? '#DC2626' : '#111111';
        ctx.lineWidth = isCruelEndgame ? 1.85 : 1.6;
        const browTilt = this.level.id >= 60 ? 2.2 : 1.6;
        ctx.beginPath();
        ctx.moveTo(eyeOffsetX - 5.4, eyeY - 3.9 - (browTilt - 1.6) * 0.4);
        ctx.lineTo(eyeOffsetX - 1.0, eyeY - 2.3 + (browTilt - 1.6) * 0.4);
        ctx.moveTo(eyeOffsetX + 1.0, eyeY - 2.3 + (browTilt - 1.6) * 0.4);
        ctx.lineTo(eyeOffsetX + 5.4, eyeY - 3.9 - (browTilt - 1.6) * 0.4);
        ctx.stroke();
      }
    }

    // Expressive mouth (shocked O when falling fast, sarcastic smirk/flat line when roasting!)
    if (isFalling && this.vy > 320) {
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(eyeOffsetX, headY + 3.8, 2.0, 0, Math.PI * 2);
      ctx.fill();
    } else if (isInsulting || this.lookingAtPlayer) {
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(eyeOffsetX - 3.0, headY + 3.8);
      ctx.quadraticCurveTo(eyeOffsetX + 0.5, headY + 4.4, eyeOffsetX + 3.4, headY + 2.6);
      ctx.stroke();
    }

    ctx.restore();

    // Fourth-wall insult speech bubble above stickman
    if (this.fourthWallBubble) {
      this.drawSpeechBubble(ctx, cx, this.py - 16, this.fourthWallBubble, true);
    }
  }

  private drawSpeechBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    isInsult = false,
  ): void {
    ctx.save();
    ctx.font = '700 11.5px "DM Sans", sans-serif';
    const w = Math.max(54, ctx.measureText(text).width + 22);
    const h = 26;
    // Keep bubble inside visible camera horizontally so roasts never clip off-screen!
    const clampedX = Math.max(this.camX + w / 2 + 12, Math.min(this.camX + VIEW_WIDTH - w / 2 - 12, x));
    const bx = clampedX - w / 2;
    const by = Math.max(64, y - h);

    // Offset comic ink shadow
    ctx.fillStyle = isInsult ? 'rgba(220, 38, 38, 0.22)' : 'rgba(17, 17, 17, 0.14)';
    ctx.beginPath();
    ctx.roundRect(bx + 3, by + 3, w, h, 7);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = isInsult ? '#DC2626' : '#111111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 7);
    ctx.fill();
    ctx.stroke();

    // Pointer tail aimed toward stickman
    const tailX = Math.max(bx + 10, Math.min(bx + w - 10, x));
    ctx.beginPath();
    ctx.moveTo(tailX - 5, by + h - 1);
    ctx.lineTo(tailX, by + h + 6);
    ctx.lineTo(tailX + 5, by + h - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, clampedX, by + h / 2 + 0.5);
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }
}
