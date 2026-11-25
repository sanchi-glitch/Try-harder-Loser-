import { getCrueltyTier, type DeathStreakMilestone } from '../data/deathMessages';
import { HINT_SYSTEM_MAX_LEVEL, resolveObstacleHintForHud } from '../data/hintClues';
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
  SwitchDef,
} from '../types/game';
import { adaptiveDifficulty } from './adaptiveDifficulty';
import { audioManager } from './audio';
import { commentaryService } from './commentaryService';
import { StickmanGhostTrail } from './stickmanGhostTrail';
import type { DeathTauntContext } from '../services/deathTauntService';

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
  revealed: boolean;
  revealAnim: number; // 0..1 pop-in animation when hidden track materializes
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
  // shrink platform state
  shrinkActive: boolean;
  shrinkRespawnTimer: number;
  // proximity_shift state
  shiftTriggered: boolean;
  // elevator state
  elevatorActive: boolean;
  elevatorIdleTimer: number;
  // phantom_solid & disguised conveyor state
  phantomRevealed: boolean;
  conveyorRevealed: boolean;
  // phase_blink disappearing path state
  blinkTimer: number;
  blinkWarning: boolean;
  blinkOffProgress: number; // 0..1 refill indicator while intangible
  // moveOnStand activation
  moveActivated: boolean;
  // fake_unstable bluff state
  fakeUnstableShaking: boolean;
  fakeUnstableTimer: number;
  // look_away visibility state
  lookAwayVisible: boolean;
  // pit_stretch state (disguised floor eaten by adjacent pit on landing)
  stretchActive: boolean;
  stretchDelayTimer: number;
  stretchedAmount: number;
  stretchDustTimer: number;
}

interface RuntimeHazard {
  def: HazardDef;
  x: number;
  y: number;
  w: number;
  h: number;
  active: boolean;
  revealed: boolean;
  revealAnim: number;
  // popup_spike / retract_spike
  popupState: 'hidden' | 'telegraph' | 'up' | 'retracting';
  popupTimer: number;
  popupExtend: number; // 0..1
  popupCycleTimer: number;
  retractTriggered: boolean;
  // sliding_spike
  slideTriggered: boolean;
  // chaser saw
  chaserActive: boolean;
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
  revealed: boolean;
  revealAnim: number;
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
  vanished: boolean;
  revealed: boolean;
  revealAnim: number;
  quipText: string | null;
  quipTimer: number;
  quipAge: number;
  legCycle: number;
  becameWall: boolean;
  elevatedReal: boolean;
  nearExitTaunted: boolean;
  lockedNoticeCooldown: number;
}

interface RuntimeReward {
  def: FakeRewardDef;
  collected: boolean;
  revealed: boolean;
  revealAnim: number;
  bobPhase: number;
}

interface RuntimeSign {
  def: SignDef;
  flipped: boolean;
  revealed: boolean;
  revealAnim: number;
}

interface RuntimeSwitch {
  def: SwitchDef;
  pressed: boolean;
  pressAnim: number; // 0..1 depression depth
  revealed: boolean;
  revealAnim: number;
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

export interface DarknessRenderFrame {
  levelId: number;
  playerScreenX: number;
  playerScreenY: number;
  facing: 1 | -1;
  baseRadius: number;
  viewWidth: number;
  viewHeight: number;
  worldTime: number;
  flashAlpha: number;
  nearestHazardDistance: number;
  proximityRevealRadius: number;
  lightBoostActive: boolean;
}

export interface DangerVignetteRenderFrame {
  width: number;
  height: number;
  intensity: number; // smoothed 0..1 overall proximity + trap pressure
  pulseBoost: number; // brief 0..1 surge when a trap triggers or high-difficulty obstacle passes close
  worldTime: number;
  isDarkLevel: boolean;
  prefersReducedMotion: boolean;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onDeathRecorded: (
    levelId: number,
    totalLevelDeaths: number,
    levelDeathStreak: number,
    context?: DeathTauntContext,
  ) => void;
  onDeathScreenOpen?: (snapshot: DeathLocationSnapshot) => void;
  onTrickTriggered: (kind: 'trap' | 'fake_reward' | 'fourth_wall') => void;
  onRenderDarknessMask?: (ctx: CanvasRenderingContext2D, frame: DarknessRenderFrame) => void;
  onRenderDangerVignette?: (ctx: CanvasRenderingContext2D, frame: DangerVignetteRenderFrame) => void;
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
  private standingPlatformKind: PlatformDef['kind'] | null = null;
  private standingConveyorSpeed = 0;
  private inReverseControlZone = false;
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
  private safeGroundedTrail: Array<{ x: number; y: number; gravDir: 1 | -1 }> = [];
  private savedDeathSnapshot: DeathLocationSnapshot | null = null;

  // Fourth-wall state (cooldowns & freshness managed centrally by commentaryService)
  private lookingAtPlayer = false;
  private fourthWallBubble: string | null = null;
  private fourthWallBubbleTimer = 0;
  private fourthWallBubbleAge = 0;
  private readonly prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private autonomousCommentTimer = 10.5;
  private consecutiveQuickDeaths = 0;
  private midRunTauntStage: 0 | 1 | 2 = 0;

  // Checkpoint state
  private spawnX = 80;
  private spawnY = 370;
  private checkpointReached = false;
  private pendingFullStartReset = false;
  private revealedTriggers = new Set<string>();
  private runawaySurpriseGates: Array<{
    triggerId: string;
    exitId: string;
    hostPlatId?: string;
    platformCutoffX: number;
    obstacleCutoffX: number;
    lockMaxX: number;
    requiredParentTrigger?: string;
  }> = [];
  private entitySurpriseTrigger = new WeakMap<object, string>();
  private dynamicGravityScale: number | null = null;
  private checkpointGravityScale: number | null = null;

  // Darkness lights-out controlled flash & rewarded forward-light boost state
  private darknessFlashAlpha = 0;
  private darknessFlashTimer = 2.8;
  private darknessLightBoost = false;

  // Camera & juice
  private camX = 0;
  private cameraShiftBias = 0;
  private checkpointCameraShiftBias = 0;
  private shakeTime = 0;
  private shakeIntensity = 0;
  private hitstopTimer = 0;
  private deathFlashAlpha = 0;
  private dangerVignetteIntensity = 0;
  private dangerPulseBoost = 0;
  private dangerPulseCooldown = 0;
  private worldTime = 0;

  // Entities
  private platforms: RuntimePlatform[] = [];
  private hazards: RuntimeHazard[] = [];
  private checkpoints: RuntimeCheckpoint[] = [];
  private exits: RuntimeExit[] = [];
  private rewards: RuntimeReward[] = [];
  private signs: RuntimeSign[] = [];
  private switches: RuntimeSwitch[] = [];
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

  public loadLevel(levelId: number, isRestart = false): void {
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
    this.dynamicGravityScale = null;
    this.checkpointGravityScale = null;
    this.cameraShiftBias = 0;
    this.checkpointCameraShiftBias = 0;
    this.darknessFlashAlpha = this.level.spotlightRadius ? 0.55 : 0;
    this.darknessFlashTimer = this.level.darknessFlashInterval ?? 4.8;
    this.dangerVignetteIntensity = 0;
    this.dangerPulseBoost = 0;
    this.dangerPulseCooldown = 0;
    if (!isRestart) {
      this.darknessLightBoost = false;
    }
    this.spawnX = this.level.spawn.x;
    this.spawnY = this.level.spawn.y;
    this.lastSafeGroundedPos = { x: this.level.spawn.x, y: this.level.spawn.y };
    this.safeGroundedTrail = [
      {
        x: this.level.spawn.x,
        y: this.level.spawn.y,
        gravDir: (this.level.gravityScale ?? 1) < 0 ? -1 : 1,
      },
    ];
    this.savedDeathSnapshot = null;
    this.respawnInvulnTimer = 0;
    this.currentDeathMessage = null;
    this.deathMessageTimer = 0;
    this.prankBanner = null;
    this.prankBannerTimer = 0;

    commentaryService.resetForLevel(levelId, isRestart);
    const entryRemark = commentaryService.requestRemark('level_entry', {
      levelId,
      levelDeaths: 0,
      totalDeaths: this.totalDeathsGlobal,
      force: true,
      nowMs: this.worldTime * 1000,
    });
    this.setFourthWallBubble(entryRemark?.text ?? null, entryRemark?.durationSec ?? 0);
    this.autonomousCommentTimer = commentaryService.getNextAmbientDelaySeconds(levelId, 0);
    this.lookingAtPlayer = true;
    this.midRunTauntStage = 0;
    this.stickmanGhostTrail.clear();

    adaptiveDifficulty.startLevel(levelId);
    audioManager.setAtmosphereLevel(levelId, this.deathStreakByLevel.get(levelId) ?? 0);
    this.buildEntities(true);
    this.respawnPlayerInstant();
    if (this.isFinale100Theme() && !isRestart) {
      this.showPrankBanner('LEVEL 100 · ZERO CHECKPOINTS · 0.1% CLEAR RATE', 3.4);
    }
    this.emitHud();
  }

  private isFinale100Theme(): boolean {
    return this.level.visualTheme === 'finale_100' || this.level.id === 100;
  }

  public restartLevel(): void {
    this.loadLevel(this.level.id, true);
  }

  public setDarknessLightBoost(active: boolean): void {
    this.darknessLightBoost = Boolean(active);
  }

  /**
   * Rewarded Ad Extra-Life Respawn:
   * Restores the player onto a verified safe surface a short distance away from
   * the obstacle where they died (never directly on top of spikes or traps),
   * while preserving timer, progress, checkpoints, and world state.
   */
  public respawnAtSavedDeathLocation(): boolean {
    const snap = this.savedDeathSnapshot;
    if (!snap) return false;

    this.savedDeathSnapshot = null;
    this.pendingFullStartReset = false;
    this.clearInputs();

    // Restore any collapsed/shifted tile or triggered trap near BOTH the safe respawn
    // footprint and the lethal obstacle ahead so the player gets a clean, fair retry.
    for (const p of this.platforms) {
      const nearRespawn =
        snap.respawnX + PLAYER_W > p.def.x - 36 && snap.respawnX < p.def.x + p.def.w + 36;
      const nearDeath =
        snap.exactX + PLAYER_W > p.def.x - 44 && snap.exactX < p.def.x + p.def.w + 44;
      if (!nearRespawn && !nearDeath) continue;
      if (p.def.kind === 'fake_drop' && p.dropState !== 'idle') {
        p.x = p.def.x;
        p.y = p.def.y;
        p.active = p.revealed;
        p.dropState = 'idle';
        p.dropTimer = 0;
      } else if (p.def.kind === 'crumble' && p.crumbleState !== 'idle') {
        p.active = p.revealed;
        p.crumbleState = 'idle';
        p.crumbleTimer = 0;
      } else if (p.def.kind === 'shrink' && (p.shrinkActive || !p.active)) {
        p.x = p.def.x;
        p.w = p.def.w;
        p.active = p.revealed;
        p.shrinkActive = false;
        p.shrinkRespawnTimer = 0;
      } else if (p.def.kind === 'phase_blink' && p.revealed) {
        p.active = true;
        p.blinkTimer = 0;
        p.blinkWarning = false;
        p.blinkOffProgress = 0;
      } else if (p.def.kind === 'proximity_shift' && p.shiftTriggered) {
        p.x = p.def.x;
        p.y = p.def.y;
        p.shiftTriggered = false;
      } else if (p.def.kind === 'elevator' && p.elevatorActive) {
        p.x = p.def.x;
        p.y = p.def.y;
        p.elevatorActive = false;
        p.elevatorIdleTimer = 0;
      } else if (p.def.kind === 'pit_stretch' && (p.stretchActive || p.stretchedAmount > 0 || !p.active)) {
        p.x = p.def.x;
        p.w = p.def.w;
        p.active = p.revealed;
        p.stretchActive = false;
        p.stretchDelayTimer = 0;
        p.stretchedAmount = 0;
        p.stretchDustTimer = 0;
      }
    }
    for (const h of this.hazards) {
      const nearZone =
        (snap.respawnX + PLAYER_W > h.def.x - 64 && snap.respawnX < h.def.x + h.def.w + 64) ||
        (snap.exactX + PLAYER_W > h.def.x - 64 && snap.exactX < h.def.x + h.def.w + 64);

      if (h.def.kind === 'falling_block' && h.fallState !== 'idle' && nearZone) {
        h.x = h.def.x;
        h.y = h.def.y;
        h.fallState = 'idle';
        h.fallVy = 0;
        h.fallTimer = 0;
      } else if (h.def.kind === 'chaser' && h.chaserActive) {
        h.x = Math.min(h.x, Math.max(h.def.x, snap.respawnX - 240));
      } else if (h.def.kind === 'sliding_spike' && h.slideTriggered && nearZone) {
        h.x = h.def.x;
        h.slideTriggered = false;
      } else if (h.def.kind === 'popup_spike' && h.popupState !== 'hidden' && nearZone) {
        h.popupState = 'hidden';
        h.popupTimer = 0;
        h.popupExtend = 0;
        h.popupCycleTimer = 0;
      } else if (h.def.kind === 'retract_spike' && h.retractTriggered && nearZone) {
        h.retractTriggered = false;
        h.popupExtend = 1;
      }
    }

    // Re-validate against restored platforms/hazards so respawn never overlaps an obstacle
    const safeSpot = this.computeSafeRespawnSpot(snap.exactX, snap.exactY, snap.cause, {
      x: snap.respawnX,
      y: snap.respawnY,
    });

    this.px = safeSpot.x;
    this.py = safeSpot.y;
    this.lastSafeGroundedPos = { x: safeSpot.x, y: safeSpot.y };
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
    this.dangerVignetteIntensity = 0;
    this.dangerPulseBoost = 0;
    this.dangerPulseCooldown = 0;
    commentaryService.resetUnbrokenStretch();
    this.stickmanGhostTrail.clear();
    this.setFourthWallBubble("Back from the dead. Don't waste it.", 2.4);
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
    const keepCheckpoint = this.checkpointReached && !this.pendingFullStartReset;
    this.savedDeathSnapshot = null;
    this.pendingFullStartReset = false;
    this.clearInputs();
    if (!keepCheckpoint) {
      this.checkpointReached = false;
      this.spawnX = this.level.spawn.x;
      this.spawnY = this.level.spawn.y;
      this.lastSafeGroundedPos = { x: this.level.spawn.x, y: this.level.spawn.y };
      this.safeGroundedTrail = [
        {
          x: this.level.spawn.x,
          y: this.level.spawn.y,
          gravDir: (this.level.gravityScale ?? 1) < 0 ? -1 : 1,
        },
      ];
      this.revealedTriggers.clear();
      this.dynamicGravityScale = null;
      this.checkpointGravityScale = null;
      this.cameraShiftBias = 0;
      this.checkpointCameraShiftBias = 0;
      this.levelTime = 0;
      this.jumpsUsedInLevel = 0;
    } else {
      this.lastSafeGroundedPos = { x: this.spawnX, y: this.spawnY };
      this.dynamicGravityScale = this.checkpointGravityScale;
      this.cameraShiftBias = this.checkpointCameraShiftBias;
      this.safeGroundedTrail = [
        {
          x: this.spawnX,
          y: this.spawnY,
          gravDir: (this.dynamicGravityScale ?? this.level.gravityScale ?? 1) < 0 ? -1 : 1,
        },
      ];
    }
    this.darknessFlashAlpha = this.level.spotlightRadius ? 0.45 : 0;
    this.darknessFlashTimer = this.level.darknessFlashInterval ?? 4.8;
    this.dangerVignetteIntensity = 0;
    this.dangerPulseBoost = 0;
    this.dangerPulseCooldown = 0;
    this.respawnInvulnTimer = 0;
    this.buildEntities(!keepCheckpoint);
    this.respawnPlayerInstant();
    this.emitHud();
  }

  /**
   * Returns true if placing the player hitbox at (x, y) keeps a comfortable buffer
   * away from spikes, popup traps, sliding blades, falling blocks, saws, sweepers,
   * and fake-drop trapdoors.
   */
  private isSpotClearOfHazards(
    x: number,
    y: number,
    gravDir: 1 | -1,
    marginX: number,
    marginY: number,
  ): boolean {
    const pxCenter = x + PLAYER_W / 2;

    // Never respawn directly on top of a fake_drop trapdoor
    for (const p of this.platforms) {
      if (!p.revealed || p.def.kind !== 'fake_drop') continue;
      const onFakeDropX = x + PLAYER_W > p.def.x - 8 && x < p.def.x + p.def.w + 8;
      const surfaceY = gravDir > 0 ? p.def.y - PLAYER_H : p.def.y + p.def.h;
      if (onFakeDropX && Math.abs(y - surfaceY) < 28) {
        return false;
      }
    }

    for (const h of this.hazards) {
      if (!h.revealed) continue;
      const kind = h.def.kind;

      if (kind === 'spike' || kind === 'retract_spike') {
        if (
          this.overlaps(
            x - marginX,
            y - marginY,
            PLAYER_W + marginX * 2,
            PLAYER_H + marginY * 2,
            h.x,
            h.y,
            h.w,
            h.h,
          )
        ) {
          return false;
        }
      } else if (kind === 'popup_spike') {
        if (
          this.overlaps(
            x - marginX,
            y - marginY,
            PLAYER_W + marginX * 2,
            PLAYER_H + marginY * 2,
            h.def.x,
            h.def.y,
            h.def.w,
            h.def.h,
          )
        ) {
          return false;
        }
        // Also stay clear of the dormant popup trigger zone so it doesn't erupt immediately
        const trigX = h.def.triggerX ?? h.def.x + h.def.w / 2;
        const trigR = (h.def.triggerRadius ?? 68) + 14;
        const verticallyNear =
          y + PLAYER_H >= h.def.y - 44 && y <= h.def.y + h.def.h + 44;
        if (verticallyNear && Math.abs(pxCenter - trigX) < trigR) {
          return false;
        }
      } else if (kind === 'sliding_spike') {
        const slideX = h.def.slideX ?? -68;
        const minX = Math.min(h.def.x, h.def.x + slideX);
        const maxX = Math.max(h.def.x + h.def.w, h.def.x + slideX + h.def.w);
        if (
          this.overlaps(
            x - marginX,
            y - marginY,
            PLAYER_W + marginX * 2,
            PLAYER_H + marginY * 2,
            minX,
            h.def.y,
            maxX - minX,
            h.def.h,
          )
        ) {
          return false;
        }
      } else if (kind === 'falling_block') {
        // Avoid both current block position and its vertical drop column underneath
        const colY = gravDir > 0 ? h.def.y : 0;
        const colH =
          gravDir > 0
            ? Math.max(h.def.h, this.level.worldHeight - h.def.y)
            : h.def.y + h.def.h;
        if (
          this.overlaps(
            x - marginX * 0.75,
            y - marginY,
            PLAYER_W + marginX * 1.5,
            PLAYER_H + marginY * 2,
            h.def.x,
            colY,
            h.def.w,
            colH,
          ) ||
          this.overlaps(
            x - marginX,
            y - marginY,
            PLAYER_W + marginX * 2,
            PLAYER_H + marginY * 2,
            h.x,
            h.y,
            h.w,
            h.h,
          )
        ) {
          return false;
        }
      } else if (kind === 'saw' || kind === 'sweeper' || kind === 'chaser') {
        if (!h.active) continue;
        if (
          this.overlaps(
            x - marginX,
            y - marginY,
            PLAYER_W + marginX * 2,
            PLAYER_H + marginY * 2,
            h.x,
            h.y,
            h.w,
            h.h,
          )
        ) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Finds a valid supporting platform surface at horizontal coordinate `x` near `refY`,
   * ensuring the player stands cleanly on the platform without clipping into ceilings or walls.
   */
  private findSafePlatformSurfaceAtX(
    x: number,
    refY: number,
    gravDir: 1 | -1,
    allowTransient: boolean,
  ): number | null {
    if (x < 8 || x > this.level.worldWidth - PLAYER_W - 8) return null;

    let bestY: number | null = null;
    let bestDist = Infinity;

    for (const p of this.platforms) {
      if (!p.revealed) continue;
      const k = p.def.kind;
      if (
        k === 'fake_drop' ||
        k === 'phantom_solid' ||
        k === 'bounce' ||
        k === 'elevator' ||
        k === 'proximity_shift'
      ) {
        continue;
      }
      const isTransient =
        k === 'crumble' || k === 'shrink' || k === 'phase_blink' || k === 'look_away';
      if (isTransient && !allowTransient) continue;
      if (!p.active && !isTransient) continue;

      const edgePad = isTransient ? 0 : 2;
      const platX = isTransient ? p.def.x : p.x;
      const platW = isTransient ? p.def.w : p.w;
      const platY = isTransient ? p.def.y : p.y;
      const platH = isTransient ? p.def.h : p.h;

      if (x < platX + edgePad || x + PLAYER_W > platX + platW - edgePad) continue;

      const candY = gravDir > 0 ? platY - PLAYER_H : platY + platH;
      if (candY < 20 || candY > this.level.worldHeight - PLAYER_H - 12) continue;

      // Ensure player body does not collide with any other solid platform or bricked wall
      let blocked = false;
      for (const other of this.platforms) {
        if (other === p || !other.revealed || !other.active) continue;
        if (other.def.kind === 'phantom_solid') continue;
        if (
          this.overlaps(
            x + 1,
            candY + 1,
            PLAYER_W - 2,
            PLAYER_H - 2,
            other.x,
            other.y,
            other.w,
            other.h,
          )
        ) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        for (const ex of this.exits) {
          if (!ex.revealed || !ex.becameWall) continue;
          if (this.overlaps(x, candY, PLAYER_W, PLAYER_H, ex.x - 23, ex.y - 68, 46, 68)) {
            blocked = true;
            break;
          }
        }
      }
      if (blocked) continue;

      const distY = Math.abs(candY - refY);
      if (distY < bestDist) {
        bestDist = distY;
        bestY = candY;
      }
    }

    return bestDist <= 190 ? bestY : null;
  }

  /**
   * Solves for a safe respawn spot a short distance away from the lethal obstacle
   * where the player died (never directly over spikes, traps, or voids, and never
   * teleporting forward past an unbeaten obstacle).
   */
  private computeSafeRespawnSpot(
    deathX: number,
    deathY: number,
    cause: DeathCause,
    preferredSpot?: { x: number; y: number },
  ): { x: number; y: number } {
    const gravDir: 1 | -1 = (this.dynamicGravityScale ?? this.level.gravityScale ?? 1) < 0 ? -1 : 1;

    // If a previously computed safe spot is still valid and comfortably clear of hazards, keep it
    if (preferredSpot) {
      const distFromDeath = Math.hypot(preferredSpot.x - deathX, preferredSpot.y - deathY);
      const surfY = this.findSafePlatformSurfaceAtX(preferredSpot.x, preferredSpot.y, gravDir, true);
      if (
        surfY !== null &&
        (cause === 'pit' || distFromDeath >= 40) &&
        this.isSpotClearOfHazards(preferredSpot.x, surfY, gravDir, 36, 14)
      ) {
        return { x: preferredSpot.x, y: surfY };
      }
    }

    // Step back toward the direction the player came from (default left = -1)
    const backDir: 1 | -1 =
      this.facing === -1 && this.lastSafeGroundedPos.x > deathX + 28 ? 1 : -1;

    // Pass 1: Nearest stable safe surface 54..350px behind the lethal obstacle
    for (let offset = 54; offset <= 350; offset += 14) {
      const candX = Math.max(
        8,
        Math.min(this.level.worldWidth - PLAYER_W - 8, deathX + backDir * offset),
      );
      const candY = this.findSafePlatformSurfaceAtX(candX, deathY, gravDir, false);
      if (candY !== null && this.isSpotClearOfHazards(candX, candY, gravDir, 44, 16)) {
        return { x: candX, y: candY };
      }
    }

    // Pass 2: Most recent verified safe breadcrumb from the player's own grounded trail
    for (let i = this.safeGroundedTrail.length - 1; i >= 0; i--) {
      const pt = this.safeGroundedTrail[i];
      if (pt.gravDir !== gravDir) continue;
      if (cause !== 'pit' && Math.hypot(pt.x - deathX, pt.y - deathY) < 42) continue;
      const surfY = this.findSafePlatformSurfaceAtX(pt.x, pt.y, gravDir, false);
      if (surfY !== null && this.isSpotClearOfHazards(pt.x, surfY, gravDir, 38, 14)) {
        return { x: pt.x, y: surfY };
      }
    }

    // Pass 3: Relaxed scan (44..460px behind) allowing restored transient ledges (skyways)
    for (let offset = 44; offset <= 460; offset += 14) {
      const candX = Math.max(
        8,
        Math.min(this.level.worldWidth - PLAYER_W - 8, deathX + backDir * offset),
      );
      const candY = this.findSafePlatformSurfaceAtX(candX, deathY, gravDir, true);
      if (candY !== null && this.isSpotClearOfHazards(candX, candY, gravDir, 30, 12)) {
        return { x: candX, y: candY };
      }
    }

    // Pass 4: Relaxed breadcrumb trail check
    for (let i = this.safeGroundedTrail.length - 1; i >= 0; i--) {
      const pt = this.safeGroundedTrail[i];
      if (pt.gravDir !== gravDir) continue;
      const surfY = this.findSafePlatformSurfaceAtX(pt.x, pt.y, gravDir, true);
      if (surfY !== null && this.isSpotClearOfHazards(pt.x, surfY, gravDir, 22, 10)) {
        return { x: pt.x, y: surfY };
      }
    }

    // Pass 5: Safe fallback to lastSafeGroundedPos or active checkpoint/level spawn
    const lastSurfY = this.findSafePlatformSurfaceAtX(
      this.lastSafeGroundedPos.x,
      this.lastSafeGroundedPos.y,
      gravDir,
      true,
    );
    if (
      lastSurfY !== null &&
      this.isSpotClearOfHazards(this.lastSafeGroundedPos.x, lastSurfY, gravDir, 20, 8)
    ) {
      return { x: this.lastSafeGroundedPos.x, y: lastSurfY };
    }

    return { x: this.spawnX, y: this.spawnY };
  }

  private isEntityVisibleByTriggers(
    revealOnTriggerId?: string,
    hideOnTriggerId?: string,
  ): boolean {
    if (revealOnTriggerId && !this.revealedTriggers.has(revealOnTriggerId)) {
      return false;
    }
    if (hideOnTriggerId && this.revealedTriggers.has(hideOnTriggerId)) {
      return false;
    }
    return true;
  }

  private isEntityUnlockedByTriggers(
    entity: object,
    revealOnTriggerId?: string,
    hideOnTriggerId?: string,
  ): boolean {
    if (!this.isEntityVisibleByTriggers(revealOnTriggerId, hideOnTriggerId)) {
      return false;
    }
    const surpriseTriggerId = this.entitySurpriseTrigger.get(entity);
    if (surpriseTriggerId && !this.revealedTriggers.has(surpriseTriggerId)) {
      return false;
    }
    return true;
  }

  private getEffectiveWorldBounds(): { minX: number; maxX: number } {
    let minX = 0;
    let maxX = this.level.worldWidth;
    const locks = this.level.cameraLocks;
    if (locks && locks.length > 0) {
      for (const lock of locks) {
        if (!this.revealedTriggers.has(lock.triggerId)) {
          maxX = Math.min(maxX, lock.maxX);
          if (lock.minX !== undefined) {
            minX = Math.max(minX, lock.minX);
          }
        }
      }
    }
    for (const gate of this.runawaySurpriseGates) {
      if (gate.requiredParentTrigger && !this.revealedTriggers.has(gate.requiredParentTrigger)) {
        continue;
      }
      if (!this.revealedTriggers.has(gate.triggerId)) {
        maxX = Math.min(maxX, gate.lockMaxX);
      }
    }
    return { minX, maxX: Math.max(minX + VIEW_WIDTH, maxX) };
  }

  private rebuildRunawaySurpriseGates(fullReset: boolean): void {
    this.runawaySurpriseGates = [];
    this.entitySurpriseTrigger = new WeakMap<object, string>();

    for (const exDef of this.level.exits) {
      if (exDef.fake) continue;

      const doorTriggerIds: string[] = [];

      if (exDef.moveTargets && exDef.moveTargets.length > 0) {
        for (let i = 0; i < exDef.moveTargets.length; i++) {
          const prevX = i === 0 ? exDef.x : exDef.moveTargets[i - 1].x;
          const prevY = i === 0 ? exDef.y : exDef.moveTargets[i - 1].y;
          const next = exDef.moveTargets[i];
          const triggerId = next.revealsTriggerId ?? `__runaway_${exDef.id}_${i}`;
          doorTriggerIds.push(triggerId);

          if (next.x <= prevX + 20) continue;

          const hostPlat = this.level.platforms.find(
            (p) => p.x <= prevX && p.x + p.w >= prevX && Math.abs(p.y - prevY) <= 24,
          );
          const platformCutoffX = hostPlat ? hostPlat.x + hostPlat.w - 4 : prevX + 48;
          const obstacleCutoffX = prevX + 28;
          const lockMaxX = hostPlat ? Math.min(hostPlat.x + hostPlat.w, prevX + 120) : prevX + 110;

          this.runawaySurpriseGates.push({
            triggerId,
            exitId: exDef.id,
            hostPlatId: hostPlat?.id,
            platformCutoffX,
            obstacleCutoffX,
            lockMaxX,
            requiredParentTrigger: exDef.revealOnTriggerId,
          });
        }
      } else if (
        exDef.retreatSpeed &&
        exDef.retreatMaxX !== undefined &&
        exDef.retreatMaxX > exDef.x + 20
      ) {
        const triggerId = `__retreat_${exDef.id}`;
        doorTriggerIds.push(triggerId);

        const hostPlat = this.level.platforms.find(
          (p) => p.x <= exDef.x && p.x + p.w >= exDef.x && Math.abs(p.y - exDef.y) <= 24,
        );
        const platformCutoffX = hostPlat ? hostPlat.x + hostPlat.w - 4 : exDef.x + 48;
        const obstacleCutoffX = exDef.x + 28;
        const lockMaxX = hostPlat ? Math.min(hostPlat.x + hostPlat.w, exDef.x + 120) : exDef.x + 110;

        this.runawaySurpriseGates.push({
          triggerId,
          exitId: exDef.id,
          hostPlatId: hostPlat?.id,
          platformCutoffX,
          obstacleCutoffX,
          lockMaxX,
          requiredParentTrigger: exDef.revealOnTriggerId,
        });
      }

      // Whenever the runaway door resets back to its starting spot on checkpoint respawn,
      // re-hide its surprise obstacles & track so they never spoil the ambush on retries!
      if (!fullReset && doorTriggerIds.length > 0 && this.spawnX <= exDef.x + 40) {
        for (const tid of doorTriggerIds) {
          this.revealedTriggers.delete(tid);
        }
      }
    }
  }

  private applyRunawaySurpriseGates(): void {
    if (this.runawaySurpriseGates.length === 0) return;

    const findGateForPlatform = (p: RuntimePlatform) => {
      let matched: (typeof this.runawaySurpriseGates)[number] | null = null;
      for (const gate of this.runawaySurpriseGates) {
        if (p.def.id === gate.hostPlatId) continue;
        const beyondHost = p.def.x >= gate.platformCutoffX;
        const elevatedAfterDoor = p.def.x > gate.obstacleCutoffX && p.def.h < 60;
        if (beyondHost || elevatedAfterDoor) {
          if (!matched || gate.obstacleCutoffX >= matched.obstacleCutoffX) {
            matched = gate;
          }
        }
      }
      return matched;
    };

    const findGateForX = (x: number) => {
      let matched: (typeof this.runawaySurpriseGates)[number] | null = null;
      for (const gate of this.runawaySurpriseGates) {
        if (x > gate.obstacleCutoffX) {
          if (!matched || gate.obstacleCutoffX >= matched.obstacleCutoffX) {
            matched = gate;
          }
        }
      }
      return matched;
    };

    for (const p of this.platforms) {
      const gate = findGateForPlatform(p);
      if (gate) {
        this.entitySurpriseTrigger.set(p, gate.triggerId);
        if (!this.revealedTriggers.has(gate.triggerId)) {
          p.revealed = false;
          p.active = false;
          p.revealAnim = 0;
        }
      }
    }

    for (const h of this.hazards) {
      const gate = findGateForX(h.def.x);
      if (gate) {
        this.entitySurpriseTrigger.set(h, gate.triggerId);
        if (!this.revealedTriggers.has(gate.triggerId)) {
          h.revealed = false;
          h.active = false;
          h.revealAnim = 0;
        }
      }
    }

    for (const cp of this.checkpoints) {
      const gate = findGateForX(cp.def.x);
      if (gate) {
        this.entitySurpriseTrigger.set(cp, gate.triggerId);
        if (!this.revealedTriggers.has(gate.triggerId)) {
          cp.revealed = false;
          cp.revealAnim = 0;
        }
      }
    }

    for (const s of this.signs) {
      const gate = findGateForX(s.def.x);
      if (gate) {
        this.entitySurpriseTrigger.set(s, gate.triggerId);
        if (!this.revealedTriggers.has(gate.triggerId)) {
          s.revealed = false;
          s.revealAnim = 0;
        }
      }
    }

    for (const r of this.rewards) {
      const gate = findGateForX(r.def.x);
      if (gate) {
        this.entitySurpriseTrigger.set(r, gate.triggerId);
        if (!this.revealedTriggers.has(gate.triggerId)) {
          r.revealed = false;
          r.revealAnim = 0;
        }
      }
    }

    for (const sw of this.switches) {
      const gate = findGateForX(sw.def.x);
      if (gate) {
        this.entitySurpriseTrigger.set(sw, gate.triggerId);
        if (!this.revealedTriggers.has(gate.triggerId)) {
          sw.revealed = false;
          sw.revealAnim = 0;
        }
      }
    }
  }

  private unlockHiddenTrackTrigger(triggerId: string): boolean {
    if (this.revealedTriggers.has(triggerId)) return false;
    this.revealedTriggers.add(triggerId);

    const snap = adaptiveDifficulty.getSnapshot(this.level.id);
    let revealedAny = false;

    for (const p of this.platforms) {
      if (p.def.kind === 'reveal_wall' && p.def.linkedTriggerId === triggerId) {
        p.retracted = true;
        revealedAny = true;
        this.spawnDust(p.x + p.w / 2, p.y + p.h / 2, 18, '#111111');
      }
      if (
        (p.def.revealOnTriggerId === triggerId || this.entitySurpriseTrigger.get(p) === triggerId) &&
        this.isEntityUnlockedByTriggers(p, p.def.revealOnTriggerId, p.def.hideOnTriggerId)
      ) {
        const condMet = this.checkAdaptiveCondition(p.def.adaptiveCondition, snap);
        p.revealed = true;
        p.revealAnim = 0.01;
        p.active = condMet;
        revealedAny = true;
        this.spawnDust(p.x + p.w / 2, p.y + Math.min(20, p.h / 2), 8, '#111111');
      }
      if (p.def.hideOnTriggerId === triggerId) {
        p.revealed = false;
        p.active = false;
        this.spawnDust(p.x + p.w / 2, p.y + Math.min(20, p.h / 2), 10, '#DC2626');
      }
    }

    for (const h of this.hazards) {
      if (
        (h.def.revealOnTriggerId === triggerId || this.entitySurpriseTrigger.get(h) === triggerId) &&
        this.isEntityUnlockedByTriggers(h, h.def.revealOnTriggerId, h.def.hideOnTriggerId)
      ) {
        const condMet = this.checkAdaptiveCondition(h.def.adaptiveCondition, snap);
        h.revealed = true;
        h.revealAnim = 0.01;
        h.active = condMet;
        revealedAny = true;
        this.spawnDust(h.x + h.w / 2, h.y + h.h / 2, 7, '#DC2626');
      }
      if (h.def.hideOnTriggerId === triggerId) {
        h.revealed = false;
        h.active = false;
      }
    }

    for (const cp of this.checkpoints) {
      if (
        (cp.def.revealOnTriggerId === triggerId || this.entitySurpriseTrigger.get(cp) === triggerId) &&
        this.isEntityUnlockedByTriggers(cp, cp.def.revealOnTriggerId, cp.def.hideOnTriggerId)
      ) {
        cp.revealed = true;
        cp.revealAnim = 0.01;
        revealedAny = true;
      }
      if (cp.def.hideOnTriggerId === triggerId) {
        cp.revealed = false;
      }
    }

    for (const s of this.signs) {
      if (
        (s.def.revealOnTriggerId === triggerId || this.entitySurpriseTrigger.get(s) === triggerId) &&
        this.isEntityUnlockedByTriggers(s, s.def.revealOnTriggerId, s.def.hideOnTriggerId)
      ) {
        s.revealed = true;
        s.revealAnim = 0.01;
        revealedAny = true;
      }
      if (s.def.hideOnTriggerId === triggerId) {
        s.revealed = false;
      }
    }

    for (const r of this.rewards) {
      if (
        (r.def.revealOnTriggerId === triggerId || this.entitySurpriseTrigger.get(r) === triggerId) &&
        this.isEntityUnlockedByTriggers(r, r.def.revealOnTriggerId, r.def.hideOnTriggerId)
      ) {
        r.revealed = true;
        r.revealAnim = 0.01;
        revealedAny = true;
      }
      if (r.def.hideOnTriggerId === triggerId) {
        r.revealed = false;
      }
    }

    for (const ex of this.exits) {
      if (ex.def.revealOnTriggerId === triggerId) {
        ex.revealed = true;
        ex.revealAnim = 0.01;
        revealedAny = true;
        this.spawnDust(ex.x, ex.y - 34, 14, '#DC2626');
      }
      if (ex.def.hideOnTriggerId === triggerId) {
        ex.revealed = false;
      }
    }

    for (const sw of this.switches) {
      if (
        (sw.def.revealOnTriggerId === triggerId || this.entitySurpriseTrigger.get(sw) === triggerId) &&
        this.isEntityUnlockedByTriggers(sw, sw.def.revealOnTriggerId, sw.def.hideOnTriggerId)
      ) {
        sw.revealed = true;
        sw.revealAnim = 0.01;
        revealedAny = true;
      }
      if (sw.def.hideOnTriggerId === triggerId) {
        sw.revealed = false;
      }
    }

    this.deathFlashAlpha = Math.max(this.deathFlashAlpha, 0.14);
    if (this.level.spotlightRadius) {
      this.darknessFlashAlpha = Math.max(this.darknessFlashAlpha, 0.78);
    }
    this.triggerShake(0.28, 8.5);
    return revealedAny;
  }

  private buildEntities(fullReset: boolean): void {
    this.rebuildRunawaySurpriseGates(fullReset);
    const snap = adaptiveDifficulty.getSnapshot(this.level.id);
    this.adaptiveHint = this.level.id <= HINT_SYSTEM_MAX_LEVEL ? snap.activeModifierText : null;

    this.platforms = this.level.platforms.map((def) => {
      const condMet = this.checkAdaptiveCondition(def.adaptiveCondition, snap);
      const revealed = this.isEntityVisibleByTriggers(def.revealOnTriggerId, def.hideOnTriggerId);
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
        active: revealed && condMet && !alreadyRetracted,
        revealed,
        revealAnim: revealed ? 1 : 0,
        crumbleState: 'idle',
        crumbleTimer: 0,
        dropState: 'idle',
        dropTimer: 0,
        retracted: alreadyRetracted,
        retractProgress: alreadyRetracted ? 1 : 0,
        touchGlow: 0,
        oscPhase: def.phase ?? 0,
        shrinkActive: false,
        shrinkRespawnTimer: 0,
        shiftTriggered: false,
        elevatorActive: false,
        elevatorIdleTimer: 0,
        phantomRevealed: false,
        conveyorRevealed: !def.disguised,
        blinkTimer: def.blinkPhase ?? 0,
        blinkWarning: false,
        blinkOffProgress: 0,
        moveActivated: !def.moveOnStand,
        fakeUnstableShaking: false,
        fakeUnstableTimer: 0,
        lookAwayVisible: true,
        stretchActive: false,
        stretchDelayTimer: 0,
        stretchedAmount: 0,
        stretchDustTimer: 0,
      };
    });

    this.hazards = this.level.hazards.map((def) => {
      const revealed = this.isEntityVisibleByTriggers(def.revealOnTriggerId, def.hideOnTriggerId);
      const condMet = this.checkAdaptiveCondition(def.adaptiveCondition, snap);
      return {
        def,
        x: def.x,
        y: def.y,
        w: def.w,
        h: def.h,
        active: revealed && condMet,
        revealed,
        revealAnim: revealed ? 1 : 0,
        popupState: def.kind === 'popup_spike' ? 'hidden' : 'up',
        popupTimer: 0,
        popupExtend: def.kind === 'popup_spike' ? 0 : 1,
        popupCycleTimer: 0,
        retractTriggered: false,
        slideTriggered: false,
        chaserActive: false,
        fallState: 'idle',
        fallTimer: 0,
        fallVy: 0,
        angle: 0,
        oscPhase: def.phase ?? 0,
      };
    });

    // Levels 10-30: Spawn cluster-reactive patrol sweepers in hot death clusters at Tier 2+
    if (snap.isEscalationEligibleLevel && snap.clusterEscalationTier >= 2) {
      const maxBonusHazards = snap.clusterEscalationTier >= 3 ? 2 : 1;
      const realExits = this.level.exits.filter((e) => !e.fake);
      let spawned = 0;

      for (const cluster of snap.deathClusters) {
        if (spawned >= maxBonusHazards) break;
        if (cluster.count < 3) continue;

        const bounds = this.getEffectiveWorldBounds();
        const cx = Math.max(bounds.minX + 220, Math.min(bounds.maxX - 220, Math.round(cluster.x)));
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
          revealed: true,
          revealAnim: 1,
          popupState: 'up',
          popupTimer: 0,
          popupExtend: 1,
          popupCycleTimer: 0,
          retractTriggered: false,
          slideTriggered: false,
          chaserActive: false,
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
      const revealed = this.isEntityVisibleByTriggers(def.revealOnTriggerId, def.hideOnTriggerId);
      return {
        def,
        x: def.x,
        y: def.y,
        activated: keepActivated,
        revealed,
        revealAnim: revealed ? 1 : 0,
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
      const revealed = this.isEntityVisibleByTriggers(def.revealOnTriggerId, def.hideOnTriggerId);
      const alreadyVanished = alreadyTriggered && def.fakeBehavior === 'vanish';
      return {
        def,
        x: alreadyTriggered && def.fakeBehavior === 'teleport_shift' && def.shiftTo ? def.shiftTo.x : def.x,
        y: alreadyTriggered && def.fakeBehavior === 'teleport_shift' && def.shiftTo ? def.shiftTo.y : def.y,
        targetX: def.x,
        targetY: def.y,
        moveIndex: 0,
        moving: false,
        fakeTriggered: alreadyTriggered,
        vanished: alreadyVanished,
        revealed,
        revealAnim: revealed ? 1 : 0,
        quipText: null,
        quipTimer: 0,
        quipAge: 0,
        legCycle: 0,
        becameWall: alreadyTriggered && def.fakeBehavior === 'become_wall',
        elevatedReal: alreadyTriggered && def.fakeBehavior === 'elevate_trap',
        nearExitTaunted: false,
        lockedNoticeCooldown: 0,
      };
    });

    if (fullReset) {
      this.rewards = this.level.fakeRewards.map((def, i) => {
        const revealed = this.isEntityVisibleByTriggers(def.revealOnTriggerId, def.hideOnTriggerId);
        return {
          def,
          collected: false,
          revealed,
          revealAnim: revealed ? 1 : 0,
          bobPhase: i * 1.4,
        };
      });
      this.signs = this.level.signs.map((def) => {
        const revealed = this.isEntityVisibleByTriggers(def.revealOnTriggerId, def.hideOnTriggerId);
        return {
          def,
          flipped: false,
          revealed,
          revealAnim: revealed ? 1 : 0,
        };
      });
      this.switches = (this.level.switches ?? []).map((def) => {
        const revealed = this.isEntityVisibleByTriggers(def.revealOnTriggerId, def.hideOnTriggerId);
        const alreadyPressed = this.revealedTriggers.has(def.triggersId);
        return {
          def,
          pressed: alreadyPressed,
          pressAnim: alreadyPressed ? 1 : 0,
          revealed,
          revealAnim: revealed ? 1 : 0,
        };
      });
    } else {
      for (const r of this.rewards) {
        r.revealed = this.isEntityVisibleByTriggers(r.def.revealOnTriggerId, r.def.hideOnTriggerId);
      }
      for (const s of this.signs) {
        s.revealed = this.isEntityVisibleByTriggers(s.def.revealOnTriggerId, s.def.hideOnTriggerId);
      }
      for (const sw of this.switches) {
        sw.revealed = this.isEntityVisibleByTriggers(sw.def.revealOnTriggerId, sw.def.hideOnTriggerId);
        // Reset gravity-flip and camera-shift switches on checkpoint respawn so the player can re-trigger them cleanly
        if (sw.def.gravityOverride !== undefined || sw.def.cameraShiftX !== undefined) {
          sw.pressed = false;
          sw.pressAnim = 0;
        }
      }
    }

    // Apply zero-spoiler runaway-door gates across all platforms, hazards, signs, rewards & switches
    this.applyRunawaySurpriseGates();
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
    this.dangerVignetteIntensity = 0;
    this.dangerPulseBoost = 0;
    this.dangerPulseCooldown = 0;
    this.midRunTauntStage = 0;
    commentaryService.resetUnbrokenStretch();
    this.autonomousCommentTimer = commentaryService.getNextAmbientDelaySeconds(
      this.level.id,
      this.levelDeaths,
    );
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
      this.fourthWallBubbleAge += dt;
      if (this.fourthWallBubbleTimer <= 0) {
        this.fourthWallBubble = null;
        this.fourthWallBubbleAge = 0;
      }
    }

    // Subtle dying-flashlight micro-flicker for high-intensity darkness levels (ambient stays near zero)
    if (this.level.spotlightRadius) {
      if (this.darknessFlashAlpha > 0) {
        this.darknessFlashAlpha = Math.max(0, this.darknessFlashAlpha - dt * 3.1);
      }
      if (this.state === 'alive') {
        this.darknessFlashTimer -= dt;
        if (this.darknessFlashTimer <= 0) {
          this.darknessFlashAlpha = 0.28;
          const baseInterval = this.level.darknessFlashInterval ?? 5.6;
          this.darknessFlashTimer = baseInterval + (Math.random() * 1.8 - 0.5);
        }
      }
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
      this.updateDangerVignette(dt);
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
    this.updateSwitches(dt);
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
        if (fullReset) {
          this.dynamicGravityScale = null;
          this.checkpointGravityScale = null;
          this.cameraShiftBias = 0;
          this.checkpointCameraShiftBias = 0;
        } else {
          this.dynamicGravityScale = this.checkpointGravityScale;
          this.cameraShiftBias = this.checkpointCameraShiftBias;
        }
        this.buildEntities(fullReset);
        this.respawnPlayerInstant();
      }
    } else if (this.state === 'alive') {
      this.updatePlayer(dt);
    }

    this.updateDangerVignette(dt);
    this.updateGhostTrail(dt, true);

    // Smooth camera tracking with slight look-ahead + optional switch-triggered camera bias
    // (always clamped so the player remains comfortably visible — never hiding essential gameplay!)
    const lookAhead = this.facing * 65 + this.cameraShiftBias;
    const rawCamX = this.px + PLAYER_W / 2 + lookAhead - VIEW_WIDTH * 0.42;
    const minSafeCam = this.px + PLAYER_W - (VIEW_WIDTH - 96);
    const maxSafeCam = this.px - 96;
    const playerSafeCamX = Math.max(minSafeCam, Math.min(maxSafeCam, rawCamX));
    const desiredCamX = this.clampCameraX(playerSafeCamX);
    this.camX += (desiredCamX - this.camX) * Math.min(1, dt * 7.5);

    // Emit HUD at ~10Hz for smooth timer display without React overhead
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.1) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private clampCameraX(x: number): number {
    const bounds = this.getEffectiveWorldBounds();
    const minCam = bounds.minX;
    const maxCam = Math.max(minCam, bounds.maxX - VIEW_WIDTH);
    return Math.max(minCam, Math.min(maxCam, x));
  }

  private updatePlayer(dt: number): void {
    const sens = this.settings.controlSensitivity;
    const moveSpeed = BASE_MOVE_SPEED * (0.85 + sens * 0.15);
    const playerCenterX = this.px + PLAYER_W / 2;

    // Silent inverted-controls zones (psychological curveball!)
    let isReversed = false;
    if (this.level.reverseControlZones) {
      for (const rz of this.level.reverseControlZones) {
        if (rz.revealOnTriggerId && !this.revealedTriggers.has(rz.revealOnTriggerId)) continue;
        if (playerCenterX >= rz.minX && playerCenterX <= rz.maxX) {
          isReversed = true;
          break;
        }
      }
    }
    this.inReverseControlZone = isReversed;

    let moveDir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    if (isReversed) {
      moveDir = -moveDir;
    }

    const onIce = this.onGround && this.standingPlatformKind === 'ice';

    if (moveDir !== 0) {
      this.facing = moveDir > 0 ? 1 : -1;
      const accel = this.onGround
        ? GROUND_ACCEL * sens * (onIce ? 0.34 : 1)
        : AIR_ACCEL * sens;
      this.vx += moveDir * accel * dt;
      if (Math.abs(this.vx) > moveSpeed) {
        this.vx = Math.sign(this.vx) * moveSpeed;
      }
    } else {
      const decel = this.onGround
        ? GROUND_DECEL * (onIce ? 0.12 : 1)
        : AIR_DECEL;
      if (Math.abs(this.vx) <= decel * dt) {
        this.vx = 0;
      } else {
        this.vx -= Math.sign(this.vx) * decel * dt;
      }
    }

    // Wind gust zones (headwind / tailwind push)
    if (this.level.windZones) {
      for (const wz of this.level.windZones) {
        if (wz.revealOnTriggerId && !this.revealedTriggers.has(wz.revealOnTriggerId)) continue;
        if (playerCenterX >= wz.minX && playerCenterX <= wz.maxX) {
          this.vx += wz.forceX * dt;
          const maxWindSpeed = moveSpeed * 1.28;
          if (Math.abs(this.vx) > maxWindSpeed) {
            this.vx = Math.sign(this.vx) * maxWindSpeed;
          }
          break;
        }
      }
    }

    // Adaptive behavior tracking & fourth-wall idle stare
    const isMoving = Math.abs(this.vx) > 25 || !this.onGround;
    adaptiveDifficulty.updateFrame(dt, isMoving);

    // Context-aware stickman commentary orchestrated via commentaryService (with cooldowns)
    const progress = this.level.worldWidth > 0 ? this.px / this.level.worldWidth : 0;
    const nowMs = this.worldTime * 1000;

    if (this.level.worldWidth > 900 && !this.fourthWallBubble) {
      if (this.midRunTauntStage < 2 && progress >= 0.78) {
        const remark = commentaryService.requestRemark('late_run', {
          levelId: this.level.id,
          levelDeaths: this.levelDeaths,
          totalDeaths: this.totalDeathsGlobal,
          progressRatio: progress,
          elapsedMs: Math.round(this.levelTime * 1000),
          nowMs,
        });
        if (remark) {
          this.midRunTauntStage = 2;
          this.setFourthWallBubble(remark.text, remark.durationSec);
          this.autonomousCommentTimer = commentaryService.getNextAmbientDelaySeconds(
            this.level.id,
            this.levelDeaths,
          );
          this.lookingAtPlayer = true;
        }
      } else if (this.midRunTauntStage === 0 && progress >= 0.48 && this.level.id >= 11) {
        const remark = commentaryService.requestRemark('mid_run', {
          levelId: this.level.id,
          levelDeaths: this.levelDeaths,
          totalDeaths: this.totalDeathsGlobal,
          progressRatio: progress,
          elapsedMs: Math.round(this.levelTime * 1000),
          nowMs,
        });
        if (remark) {
          this.midRunTauntStage = 1;
          this.setFourthWallBubble(remark.text, remark.durationSec);
          this.autonomousCommentTimer = commentaryService.getNextAmbientDelaySeconds(
            this.level.id,
            this.levelDeaths,
          );
          this.lookingAtPlayer = true;
        }
      }
    }

    if (this.onGround && Math.abs(this.vx) < 10) {
      const idleSec = adaptiveDifficulty.getContinuousIdleSeconds();
      if (idleSec > 4.0) {
        if (!this.lookingAtPlayer) {
          this.lookingAtPlayer = true;
          this.callbacks.onTrickTriggered('fourth_wall');
        }
        if (!this.fourthWallBubble) {
          const remark = commentaryService.requestRemark('idle', {
            levelId: this.level.id,
            levelDeaths: this.levelDeaths,
            totalDeaths: this.totalDeathsGlobal,
            progressRatio: progress,
            nowMs,
          });
          if (remark) {
            this.setFourthWallBubble(remark.text, remark.durationSec);
            this.autonomousCommentTimer = commentaryService.getNextAmbientDelaySeconds(
              this.level.id,
              this.levelDeaths,
            );
          }
        }
      }
    }

    // Random interjection timer for long, unbroken stretches of gameplay (non-level-specific insults)
    const interjectionRemark = commentaryService.tickRandomInterjection(
      dt,
      {
        levelId: this.level.id,
        levelDeaths: this.levelDeaths,
        totalDeaths: this.totalDeathsGlobal,
        progressRatio: progress,
        elapsedMs: Math.round(this.levelTime * 1000),
        nowMs,
      },
      !this.fourthWallBubble,
    );
    if (interjectionRemark) {
      this.setFourthWallBubble(interjectionRemark.text, interjectionRemark.durationSec);
      this.lookingAtPlayer = true;
      this.autonomousCommentTimer = commentaryService.getNextAmbientDelaySeconds(
        this.level.id,
        this.levelDeaths,
      );
    }

    // Measured ambient muttering on a generous cooldown (never continuous spam)
    if (!this.fourthWallBubble) {
      this.autonomousCommentTimer -= dt;
      if (this.autonomousCommentTimer <= 0) {
        const remark = commentaryService.requestRemark('ambient', {
          levelId: this.level.id,
          levelDeaths: this.levelDeaths,
          totalDeaths: this.totalDeathsGlobal,
          progressRatio: progress,
          elapsedMs: Math.round(this.levelTime * 1000),
          nowMs,
        });
        if (remark) {
          this.setFourthWallBubble(remark.text, remark.durationSec);
          this.lookingAtPlayer = true;
        }
        this.autonomousCommentTimer = commentaryService.getNextAmbientDelaySeconds(
          this.level.id,
          this.levelDeaths,
        );
      } else if (this.fourthWallBubbleTimer <= 0 && Math.abs(this.vx) > 10) {
        this.lookingAtPlayer = false;
      }
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

    // Active gravity scale & vertical direction (supports true ceiling-is-floor inversion when < 0!)
    const gravScale = this.dynamicGravityScale ?? this.level.gravityScale ?? 1;
    const gravDir: 1 | -1 = gravScale < 0 ? -1 : 1;

    if (this.input.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = JUMP_VELOCITY * gravDir;
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
        const remark = commentaryService.requestRemark('jump_spam', {
          levelId: this.level.id,
          levelDeaths: this.levelDeaths,
          jumpsUsed: this.jumpsUsedInLevel,
          nowMs: this.worldTime * 1000,
        });
        if (remark) {
          this.setFourthWallBubble(remark.text, remark.durationSec);
        }
      }
      audioManager.playJump();
      this.spawnDust(this.px + PLAYER_W / 2, gravDir > 0 ? this.py + PLAYER_H : this.py, 6, '#57534E');
    }

    // Variable jump height cut
    if (this.input.jumpReleased) {
      this.input.jumpReleased = false;
      if ((gravDir > 0 && this.vy < -200) || (gravDir < 0 && this.vy > 200)) {
        this.vy *= 0.52;
      }
    }

    // Gravity integration (supports low-gravity, heavy-gravity, and full negative ceiling-is-floor!)
    if (gravDir > 0) {
      this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * gravScale * dt);
    } else {
      this.vy = Math.max(-MAX_FALL_SPEED, this.vy + GRAVITY * gravScale * dt);
    }

    // Carry player if standing on a moving, elevator, proximity_shift, follow_player, or conveyor platform
    if (this.onGround) {
      if (this.standingPlatformKind === 'conveyor' && this.standingConveyorSpeed !== 0) {
        this.px += this.standingConveyorSpeed * dt;
      }
      for (const p of this.platforms) {
        if (
          !p.active ||
          (p.def.kind !== 'moving' &&
            p.def.kind !== 'elevator' &&
            p.def.kind !== 'proximity_shift' &&
            p.def.kind !== 'follow_player')
        ) {
          continue;
        }
        const footContact =
          gravDir > 0
            ? Math.abs(this.py + PLAYER_H - p.prevY) <= 5
            : Math.abs(this.py - (p.prevY + p.h)) <= 5;
        const onTop =
          footContact &&
          this.px + PLAYER_W > p.prevX + 1 &&
          this.px < p.prevX + p.w - 1;
        if (onTop) {
          this.px += p.x - p.prevX;
          this.py += p.y - p.prevY;
          break;
        }
      }
    }

    // Horizontal move & collide (strictly clamped to unlocked world bounds — zero-spoiler wall!)
    const worldBounds = this.getEffectiveWorldBounds();
    this.px += this.vx * dt;
    if (this.px < worldBounds.minX) {
      this.px = worldBounds.minX;
      this.vx = 0;
    }
    if (this.px + PLAYER_W > worldBounds.maxX) {
      this.px = worldBounds.maxX - PLAYER_W;
      this.vx = 0;
    }

    for (const p of this.platforms) {
      if (!p.active) continue;
      if (p.def.kind === 'phantom_solid') {
        if (this.overlaps(this.px, this.py, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
          if (!p.phantomRevealed) {
            p.phantomRevealed = true;
            audioManager.playTrap();
            this.recordTrick('trap');
            if (p.def.prankMessage) {
              this.showPrankBanner(p.def.prankMessage);
            }
          }
        }
        continue;
      }
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

    // Solid fake-wall collision for doors that turned into solid brick walls (`become_wall`)
    for (const ex of this.exits) {
      if (!ex.revealed || !ex.becameWall) continue;
      const wx = ex.x - 23;
      const wy = ex.y - 68;
      if (this.overlaps(this.px, this.py, PLAYER_W, PLAYER_H, wx, wy, 46, 68)) {
        if (this.vx > 0) {
          this.px = wx - PLAYER_W;
          this.vx = 0;
        } else if (this.vx < 0) {
          this.px = wx + 46;
          this.vx = 0;
        }
      }
    }

    // Vertical move & collide
    const wasOnGround = this.onGround;
    const prevVy = this.vy;
    this.onGround = false;
    this.standingPlatformKind = null;
    this.standingConveyorSpeed = 0;
    this.py += this.vy * dt;

    for (const p of this.platforms) {
      if (!p.active) continue;
      if (p.def.kind === 'phantom_solid') {
        if (this.overlaps(this.px, this.py, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
          if (!p.phantomRevealed) {
            p.phantomRevealed = true;
            audioManager.playTrap();
            this.recordTrick('trap');
            if (p.def.prankMessage) {
              this.showPrankBanner(p.def.prankMessage);
            }
          }
        }
        continue;
      }
      if (this.overlaps(this.px, this.py, PLAYER_W, PLAYER_H, p.x, p.y, p.w, p.h)) {
        const isLanding = gravDir > 0 ? this.vy >= 0 : this.vy <= 0;
        if (isLanding) {
          // Landing-only fake breaking floor (e.g., Level 2 ragebait trap):
          // shatters immediately on touchdown with zero coyote-time escape.
          if (p.def.kind === 'fake_drop' && p.def.triggerOnLandingOnly && p.dropState === 'idle') {
            p.dropState = 'dropped';
            p.active = false;
            this.onGround = false;
            this.coyoteTimer = 0;
            this.vy = gravDir > 0 ? Math.max(prevVy * 0.45, 180) : Math.min(prevVy * 0.45, -180);
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

          this.py = gravDir > 0 ? p.y - PLAYER_H : p.y + p.h;
          this.vy = 0;
          this.onGround = true;
          this.standingPlatformKind = p.def.kind;
          if (p.def.kind === 'conveyor') {
            this.standingConveyorSpeed = p.def.conveyorSpeed ?? 130;
            if (!p.conveyorRevealed) {
              p.conveyorRevealed = true;
              audioManager.playTrap();
              this.recordTrick('trap');
            }
          }

          // Record genuinely hazard-free grounded footing for safe respawn placement
          if (
            p.def.kind === 'solid' ||
            p.def.kind === 'moving' ||
            p.def.kind === 'invisible' ||
            p.def.kind === 'ice' ||
            p.def.kind === 'conveyor' ||
            p.def.kind === 'fake_unstable' ||
            p.def.kind === 'follow_player'
          ) {
            const safeX = Math.max(
              p.x + 2,
              Math.min(p.x + p.w - PLAYER_W - 2, this.px),
            );
            const safeY = gravDir > 0 ? p.y - PLAYER_H : p.y + p.h;
            if (this.isSpotClearOfHazards(safeX, safeY, gravDir, 30, 12)) {
              this.lastSafeGroundedPos = { x: safeX, y: safeY };
              const prev = this.safeGroundedTrail[this.safeGroundedTrail.length - 1];
              if (
                !prev ||
                prev.gravDir !== gravDir ||
                Math.hypot(safeX - prev.x, safeY - prev.y) >= 26
              ) {
                this.safeGroundedTrail.push({ x: safeX, y: safeY, gravDir });
                if (this.safeGroundedTrail.length > 32) {
                  this.safeGroundedTrail.shift();
                }
              }
            }
          }

          // Handle special platform interactions on landing/standing
          if (p.def.kind === 'moving' && p.def.moveOnStand && !p.moveActivated) {
            p.moveActivated = true;
            audioManager.playTrap();
            this.recordTrick('trap');
            if (p.def.prankMessage) {
              this.showPrankBanner(p.def.prankMessage);
            }
          } else if (p.def.kind === 'fake_unstable') {
            if (!p.fakeUnstableShaking) {
              p.fakeUnstableShaking = true;
              audioManager.playTrap();
              this.recordTrick('trap');
              if (p.def.prankMessage) {
                this.showPrankBanner(p.def.prankMessage);
              }
            }
            p.fakeUnstableTimer = 0.65;
          } else if (p.def.kind === 'crumble' && p.crumbleState === 'idle') {
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
          } else if (p.def.kind === 'shrink' && !p.shrinkActive) {
            p.shrinkActive = true;
            audioManager.playTrap();
            this.recordTrick('trap');
          } else if (p.def.kind === 'pit_stretch' && !p.stretchActive) {
            p.stretchActive = true;
            p.stretchDelayTimer = p.def.stretchDelay ?? 0.04;
            audioManager.playTrap();
            this.triggerShake(0.11, 3.0);
            this.recordTrick('trap');
            if (p.def.prankMessage) {
              this.showPrankBanner(p.def.prankMessage);
            }
          } else if (p.def.kind === 'elevator') {
            if (!p.elevatorActive) {
              p.elevatorActive = true;
              audioManager.playTrap();
              this.recordTrick('trap');
            }
            p.elevatorIdleTimer = 0;
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
            this.vy = (p.def.bounceVy ?? -760) * gravDir;
            if (p.def.bounceVx !== undefined) {
              this.vx = p.def.bounceVx;
            }
            this.onGround = false;
            this.squashX = 0.72;
            this.squashY = 1.32;
            audioManager.playBounce();
            this.spawnDust(this.px + PLAYER_W / 2, gravDir > 0 ? p.y : p.y + p.h, 8, '#DC2626');
          } else if (p.def.kind === 'invisible') {
            p.touchGlow = 1.0;
          }
        } else {
          this.py = gravDir > 0 ? p.y + p.h : p.y - PLAYER_H;
          this.vy = 0;
          if (p.def.kind === 'invisible') {
            p.touchGlow = 1.0;
          }
        }
      }
    }

    // Vertical collision against solid bricked-up `become_wall` doors (so player can even jump over them if needed!)
    for (const ex of this.exits) {
      if (!ex.revealed || !ex.becameWall) continue;
      const wx = ex.x - 23;
      const wy = ex.y - 68;
      if (this.overlaps(this.px, this.py, PLAYER_W, PLAYER_H, wx, wy, 46, 68)) {
        const isLanding = gravDir > 0 ? this.vy >= 0 : this.vy <= 0;
        if (isLanding) {
          this.py = gravDir > 0 ? wy - PLAYER_H : wy + 68;
          this.vy = 0;
          this.onGround = true;
        } else {
          this.py = gravDir > 0 ? wy + 68 : wy - PLAYER_H;
          this.vy = 0;
        }
      }
    }

    // Landing juice
    if (!wasOnGround && this.onGround && Math.abs(prevVy) > 180) {
      this.squashX = 1.24;
      this.squashY = 0.78;
      audioManager.playLand();
      this.spawnDust(this.px + PLAYER_W / 2, gravDir > 0 ? this.py + PLAYER_H : this.py, 5, '#78716C');
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

    // Check pit death (bottom fall OR falling off top sky when gravity is inverted!)
    if (this.py > this.level.worldHeight + 60 || (gravDir < 0 && this.py + PLAYER_H < -60)) {
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
      if (!h.active || !h.revealed) continue;
      if ((h.def.kind === 'popup_spike' || h.def.kind === 'retract_spike') && h.popupExtend < 0.45) {
        continue;
      }

      if (h.def.kind === 'saw' || h.def.kind === 'sweeper' || h.def.kind === 'chaser') {
        const cx = h.x + h.w / 2;
        const cy = h.y + h.h / 2;
        const r = h.w * 0.44;
        const closestX = Math.max(hbX, Math.min(cx, hbX + hbW));
        const closestY = Math.max(hbY, Math.min(cy, hbY + hbH));
        const dx = cx - closestX;
        const dy = cy - closestY;
        if (dx * dx + dy * dy < r * r) {
          this.killPlayer(h.def.kind === 'chaser' ? 'saw' : h.def.kind);
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
        // Spikes / popup spikes / sliding spikes / retract spikes
        const isExtendedSpike = h.def.kind === 'popup_spike' || h.def.kind === 'retract_spike';
        const spikeY = isExtendedSpike ? h.y + h.h * (1 - h.popupExtend) : h.y;
        const spikeH = isExtendedSpike ? h.h * h.popupExtend : h.h;
        if (this.overlaps(hbX, hbY, hbW, hbH, h.x + 3, spikeY + 3, h.w - 6, Math.max(2, spikeH - 4))) {
          this.killPlayer(h.def.kind === 'popup_spike' ? 'popup_spike' : 'spike');
          return;
        }
      }
    }
  }

  /**
   * Complexity-first difficulty profile:
   * Difficulty scales primarily through level architecture, multi-phase mechanics,
   * timing precision, and environmental traps rather than artificial speed inflation.
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
        hazardSpeedScale: 1.14,
        platformSpeedScale: 1.08,
        crumbleScale: 0.86,
        telegraphScale: 0.74,
        dropSpeedScale: 1.28,
        autoRearmPopups: true,
      };
    }
    if (id === 99) {
      return {
        hazardSpeedScale: 1.12,
        platformSpeedScale: 1.06,
        crumbleScale: 0.88,
        telegraphScale: 0.78,
        dropSpeedScale: 1.24,
        autoRearmPopups: true,
      };
    }
    const p = Math.min(1, Math.max(0, (id - 1) / 97));
    return {
      hazardSpeedScale: 1.0 + p * 0.12,
      platformSpeedScale: 1.0 + p * 0.06,
      crumbleScale: 0.98 - p * 0.1,
      telegraphScale: 0.96 - p * 0.18,
      dropSpeedScale: 1.05 + p * 0.2,
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

      if (!p.revealed) continue;
      if (p.revealAnim < 1) {
        p.revealAnim = Math.min(1, p.revealAnim + dt * 4.8);
      }

      if (p.touchGlow > 0) {
        p.touchGlow = Math.max(0, p.touchGlow - dt * 1.4);
      }

      if (p.def.kind === 'moving' && p.active) {
        if (!p.def.moveOnStand || p.moveActivated) {
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
      }

      if (p.def.kind === 'fake_unstable') {
        if (p.fakeUnstableTimer > 0) {
          p.fakeUnstableTimer = Math.max(0, p.fakeUnstableTimer - dt);
        }
      }

      if (p.def.kind === 'look_away') {
        const platCenterX = p.x + p.w / 2;
        const standingDirectlyOver =
          this.px + PLAYER_W > p.x + 2 &&
          this.px < p.x + p.w - 2 &&
          Math.abs(playerBottomY - p.y) <= 24;
        const facingToward =
          (playerCenterX <= platCenterX && this.facing === 1) ||
          (playerCenterX >= platCenterX && this.facing === -1);
        const visibleNow = standingDirectlyOver || facingToward;
        p.lookAwayVisible = visibleNow;
        p.active = visibleNow;
      }

      if (p.def.kind === 'follow_player' && p.active && this.state === 'alive') {
        const minX = p.def.followMinX ?? p.def.x - 110;
        const maxX = p.def.followMaxX ?? p.def.x + 110;
        const followSpd = p.def.followSpeed ?? 165;
        const mode = p.def.followMode ?? 'match';
        let targetX = p.x;
        if (mode === 'match') {
          targetX = Math.max(minX, Math.min(maxX, playerCenterX - p.w / 2));
        } else {
          // Evade mode: subtly scoots away from player's airborne landing target within fair bounds
          const distX = playerCenterX - (p.x + p.w / 2);
          if (!this.onGround && Math.abs(distX) < 130) {
            targetX = distX >= 0 ? minX : maxX;
          } else {
            targetX = p.def.x;
          }
        }
        const dx = targetX - p.x;
        const step = followSpd * dt;
        p.x = Math.abs(dx) <= step ? targetX : p.x + Math.sign(dx) * step;
      }

      if (p.def.kind === 'shrink') {
        if (p.shrinkActive && p.active) {
          const shrinkRate = (p.def.shrinkRate ?? 92) * (1 / Math.max(0.75, cruelty.crumbleScale));
          const delta = shrinkRate * dt;
          p.w -= delta;
          p.x += delta * 0.5;
          if (p.w <= (p.def.minWidth ?? 8)) {
            p.w = 0;
            p.active = false;
            p.shrinkActive = false;
            p.shrinkRespawnTimer = p.def.respawnDelay ?? 2.1;
            this.spawnDust(p.def.x + p.def.w / 2, p.y + p.h / 2, 10, '#111111');
          }
        } else if (!p.active && p.shrinkRespawnTimer > 0) {
          p.shrinkRespawnTimer -= dt;
          if (p.shrinkRespawnTimer <= 0) {
            p.x = p.def.x;
            p.w = p.def.w;
            p.active = true;
          }
        }
      }

      if (p.def.kind === 'pit_stretch' && p.active) {
        if (
          !p.stretchActive &&
          this.state === 'alive' &&
          p.def.stretchTriggerX !== undefined &&
          playerCenterX >= p.def.stretchTriggerX &&
          Math.abs(playerBottomY - p.y) < 110
        ) {
          p.stretchActive = true;
          p.stretchDelayTimer = p.def.stretchDelay ?? 0.04;
          audioManager.playTrap();
          this.triggerShake(0.11, 3.0);
          this.recordTrick('trap');
          if (p.def.prankMessage) {
            this.showPrankBanner(p.def.prankMessage);
          }
        }
        if (p.stretchActive) {
          if (p.stretchDelayTimer > 0) {
            p.stretchDelayTimer = Math.max(0, p.stretchDelayTimer - dt);
          } else {
            const maxStretch = Math.min(p.def.w, p.def.maxStretch ?? p.def.w);
            const remaining = Math.max(0, maxStretch - p.stretchedAmount);
            if (remaining > 0.5) {
              const rawSpeed = (p.def.stretchSpeed ?? 210) * Math.min(1.14, cruelty.platformSpeedScale);
              const cappedSpeed = Math.min(268, rawSpeed); // Always outrunnable vs BASE_MOVE_SPEED (290)
              const delta = Math.min(remaining, cappedSpeed * dt);
              const edge = p.def.stretchEdge ?? 'left';
              if (edge === 'left') {
                p.x += delta;
                p.w = Math.max(0, p.w - delta);
              } else {
                p.w = Math.max(0, p.w - delta);
              }
              p.stretchedAmount += delta;
              p.stretchDustTimer -= dt;
              if (p.stretchDustTimer <= 0) {
                p.stretchDustTimer = 0.045;
                const edgeX = edge === 'left' ? p.x : p.x + p.w;
                this.spawnDust(edgeX, p.y + 4, 3, '#111111');
              }
              if (p.w <= 4) {
                p.w = 0;
                p.active = false;
              }
            }
          }
        }
      }

      if (p.def.kind === 'phase_blink') {
        const onTime = p.def.blinkOnTime ?? 1.55;
        const offTime = p.def.blinkOffTime ?? 1.0;
        const period = Math.max(0.4, onTime + offTime);
        p.blinkTimer = (p.blinkTimer + dt) % period;
        const isSolidPhase = p.blinkTimer < onTime;
        p.active = isSolidPhase;
        p.blinkWarning = isSolidPhase && p.blinkTimer >= Math.max(0, onTime - 0.36);
        p.blinkOffProgress = isSolidPhase
          ? 1
          : Math.min(1, Math.max(0, (p.blinkTimer - onTime) / Math.max(0.1, offTime)));
      }

      if (p.def.kind === 'proximity_shift' && p.active) {
        const targetX = p.def.x + (p.def.shiftX ?? 75);
        const targetY = p.def.y + (p.def.shiftY ?? 0);
        if (!p.shiftTriggered && this.state === 'alive') {
          const dist = Math.hypot(
            playerCenterX - (p.x + p.w / 2),
            playerBottomY - p.y,
          );
          if (dist < (p.def.triggerDist ?? 135)) {
            p.shiftTriggered = true;
            audioManager.playTrap();
            this.recordTrick('trap');
            if (p.def.prankMessage) {
              this.showPrankBanner(p.def.prankMessage);
            }
          }
        } else if (p.shiftTriggered) {
          const dx = targetX - p.x;
          const dy = targetY - p.y;
          const d = Math.hypot(dx, dy);
          const step = (p.def.shiftSpeed ?? 340) * dt;
          if (d <= step) {
            p.x = targetX;
            p.y = targetY;
          } else {
            p.x += (dx / d) * step;
            p.y += (dy / d) * step;
          }
        }
      }

      if (p.def.kind === 'elevator' && p.active) {
        const targetY = p.def.y + (p.def.moveY ?? -155);
        const speed = p.def.speed ?? 130;
        if (p.elevatorActive) {
          const dy = targetY - p.y;
          const step = speed * dt;
          if (Math.abs(dy) <= step) {
            p.y = targetY;
          } else {
            p.y += Math.sign(dy) * step;
          }
          p.elevatorIdleTimer += dt;
          if (p.elevatorIdleTimer > 2.4) {
            p.elevatorActive = false;
          }
        } else if (Math.abs(p.y - p.def.y) > 1) {
          const dy = p.def.y - p.y;
          const step = speed * 0.8 * dt;
          p.y = Math.abs(dy) <= step ? p.def.y : p.y + Math.sign(dy) * step;
        }
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
      if (!h.active || !h.revealed) continue;
      if (h.revealAnim < 1) {
        h.revealAnim = Math.min(1, h.revealAnim + dt * 5.2);
      }

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

      if (h.def.kind === 'chaser') {
        h.angle += dt * 11 * cruelty.hazardSpeedScale;
        if (!h.chaserActive && this.state === 'alive') {
          const trigX = h.def.triggerX ?? h.def.x + 150;
          if (playerCenterX >= trigX) {
            h.chaserActive = true;
            audioManager.playTrap();
            this.recordTrick('trap');
            this.showPrankBanner('RUN! IT JUST WOKE UP!');
          }
        } else if (h.chaserActive && this.state === 'alive') {
          const bounds = this.getEffectiveWorldBounds();
          const maxX = h.def.chaseMaxX ?? bounds.maxX - 180;
          const speed = (h.def.chaseSpeed ?? 205) * Math.min(1.22, cruelty.hazardSpeedScale);
          if (h.x < maxX) {
            h.x = Math.min(maxX, h.x + speed * dt);
          }
        }
      }

      if (h.def.kind === 'sliding_spike') {
        if (!h.slideTriggered && this.state === 'alive') {
          const trigX = h.def.triggerX ?? h.def.x - 45;
          const trigR = h.def.triggerRadius ?? 115;
          if (Math.abs(playerCenterX - trigX) < trigR) {
            h.slideTriggered = true;
            audioManager.playTrap();
            this.recordTrick('trap');
          }
        } else if (h.slideTriggered) {
          const targetX = h.def.x + (h.def.slideX ?? 88);
          const dx = targetX - h.x;
          const step = (h.def.slideSpeed ?? 330) * dt;
          h.x = Math.abs(dx) <= step ? targetX : h.x + Math.sign(dx) * step;
        }
      }

      if (h.def.kind === 'retract_spike') {
        if (!h.retractTriggered && this.state === 'alive') {
          const trigX = h.def.triggerX ?? h.x + h.w / 2;
          const trigR = h.def.triggerRadius ?? 76;
          if (Math.abs(playerCenterX - trigX) < trigR) {
            h.retractTriggered = true;
            audioManager.playTrap();
            this.recordTrick('trap');
          }
        } else if (h.retractTriggered && h.popupExtend > 0) {
          h.popupExtend = Math.max(0, h.popupExtend - dt * 9.5);
        }
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
          let floorY = 420;
          for (const p of this.platforms) {
            if (!p.active || (p.def.kind !== 'solid' && p.def.kind !== 'ice' && p.def.kind !== 'conveyor')) continue;
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
      if (!cp.revealed) continue;
      if (cp.revealAnim < 1) {
        cp.revealAnim = Math.min(1, cp.revealAnim + dt * 5);
      }
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
          this.checkpointGravityScale = this.dynamicGravityScale;
          this.checkpointCameraShiftBias = this.cameraShiftBias;
          audioManager.playCheckpoint();
          this.spawnDust(cp.x, cp.y - 44, 14, '#DC2626');
          if (cp.def.triggersId) {
            this.unlockHiddenTrackTrigger(cp.def.triggersId);
            this.recordTrick('trap');
            this.showPrankBanner(
              cp.def.triggerBanner ?? 'CHECKPOINT SAVED — AND SOMETHING JUST WOKE UP!',
              3.0,
            );
          } else {
            this.showPrankBanner('Checkpoint Saved (For Real This Time)');
          }
          const cpRemark = commentaryService.requestRemark('checkpoint', {
            levelId: this.level.id,
            levelDeaths: this.levelDeaths,
            totalDeaths: this.totalDeathsGlobal,
            force: true,
            nowMs: this.worldTime * 1000,
          });
          if (cpRemark) {
            this.setFourthWallBubble(cpRemark.text, cpRemark.durationSec);
          }
          this.autonomousCommentTimer = commentaryService.getNextAmbientDelaySeconds(
            this.level.id,
            this.levelDeaths,
          );
          this.lookingAtPlayer = true;
          this.emitHud();
        }
      }
    }
  }

  private updateExits(dt: number): void {
    const playerCenterX = this.px + PLAYER_W / 2;
    const playerCenterY = this.py + PLAYER_H / 2;

    for (const ex of this.exits) {
      if (!ex.revealed || ex.vanished) continue;
      if (ex.revealAnim < 1) {
        ex.revealAnim = Math.min(1, ex.revealAnim + dt * 5.2);
      }

      if (ex.quipTimer > 0) {
        ex.quipTimer -= dt;
        ex.quipAge += dt;
        if (ex.quipTimer <= 0) {
          ex.quipText = null;
          ex.quipAge = 0;
        }
      }

      if (ex.lockedNoticeCooldown > 0) {
        ex.lockedNoticeCooldown = Math.max(0, ex.lockedNoticeCooldown - dt);
      }

      // Move smoothly toward target if running away or elevating
      if (ex.moving) {
        const dx = ex.targetX - ex.x;
        const dy = ex.targetY - ex.y;
        const dist = Math.hypot(dx, dy);
        ex.legCycle += dt * 18;
        const step = 410 * dt;
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

      // Situational commentary when approaching an exit doorway ("Finally! Oh, wait...")
      if (!ex.nearExitTaunted && !ex.becameWall && dist < 165) {
        ex.nearExitTaunted = true;
        if (!this.fourthWallBubble) {
          const nearRemark = commentaryService.requestRemark('near_exit', {
            levelId: this.level.id,
            levelDeaths: this.levelDeaths,
            totalDeaths: this.totalDeathsGlobal,
            nowMs: this.worldTime * 1000,
          });
          if (nearRemark) {
            this.setFourthWallBubble(nearRemark.text, nearRemark.durationSec);
            this.lookingAtPlayer = true;
          }
        }
      }

      // Continuous backpedaling / retreating exit (slides away when player approaches until cornered at retreatMaxX!)
      if (
        !ex.moving &&
        !ex.becameWall &&
        ex.def.retreatSpeed &&
        ex.def.retreatMaxX !== undefined &&
        ex.x < ex.def.retreatMaxX
      ) {
        const trigR = ex.def.retreatTriggerDist ?? 135;
        if (dist < trigR && playerCenterX < ex.x + 8) {
          const retreatTriggerId = `__retreat_${ex.def.id}`;
          if (!this.revealedTriggers.has(retreatTriggerId)) {
            const revealedSurprise = this.unlockHiddenTrackTrigger(retreatTriggerId);
            if (revealedSurprise) {
              audioManager.playTrap();
              this.recordTrick('trap');
              this.showPrankBanner(
                ex.def.fakeMessage ?? 'DOOR RETREATING — SURPRISE OBSTACLES UNLEASHED!',
                2.6,
              );
            }
          }
          ex.x = Math.min(ex.def.retreatMaxX, ex.x + ex.def.retreatSpeed * dt);
          ex.legCycle += dt * 18;
          if (!ex.quipText) {
            this.setExitQuip(ex, 'Too slow!', 1.6);
          }
        }
      }

      // Moving goal check (always unlocks hidden surprise obstacles/track the instant the door flees!)
      if (ex.def.moveTargets && ex.moveIndex < ex.def.moveTargets.length && !ex.moving) {
        const trigDist = ex.def.triggerDistance ?? 90;
        if (dist < trigDist) {
          const stepIndex = ex.moveIndex;
          const next = ex.def.moveTargets[stepIndex];
          ex.targetX = next.x;
          ex.targetY = next.y;
          ex.moveIndex += 1;
          ex.moving = true;
          this.setExitQuip(ex, next.quip ?? 'Nope!', 2.4);
          audioManager.playTrap();
          this.recordTrick('trap');
          const stepTriggerId = next.revealsTriggerId ?? `__runaway_${ex.def.id}_${stepIndex}`;
          const revealedSurprise = this.unlockHiddenTrackTrigger(stepTriggerId);
          if (next.revealsTriggerId || revealedSurprise) {
            this.showPrankBanner(
              ex.def.fakeMessage ?? 'THOUGHT YOU WON? THE REAL TRACK JUST STARTED.',
              3.2,
            );
          }
          continue;
        }
      }

      // Sudden approach betrayal for zero-spoiler fake exits (triggers 1 step before touching the door!)
      if (ex.def.fake && !ex.fakeTriggered && ex.def.approachTriggerDist) {
        if (dist < ex.def.approachTriggerDist) {
          this.triggerFakeExitBetrayal(ex);
          continue;
        }
      }

      // Touching exit doorway
      if (
        !ex.moving &&
        !ex.becameWall &&
        Math.abs(playerCenterX - doorCenterX) < 28 &&
        Math.abs(playerCenterY - doorCenterY) < 38
      ) {
        const isStillFake = Boolean(ex.def.fake) && !ex.elevatedReal;
        if (isStillFake) {
          if (!ex.fakeTriggered) {
            this.triggerFakeExitBetrayal(ex);
          }
        } else if (ex.def.lockedUntilSeconds && this.levelTime < ex.def.lockedUntilSeconds) {
          const rem = Math.max(0.1, ex.def.lockedUntilSeconds - this.levelTime);
          this.vx = playerCenterX < doorCenterX ? -180 : 180;
          if (ex.lockedNoticeCooldown <= 0) {
            ex.lockedNoticeCooldown = 0.85;
            audioManager.playTrap();
            this.showPrankBanner(`EXIT LOCKED — SURVIVE ${rem.toFixed(1)}s MORE!`, 1.4);
          }
        } else {
          // Real Victory! Clear this level's death streak and emit sarcastic victory remark.
          this.state = 'won';
          this.deathStreakByLevel.set(this.level.id, 0);
          this.activeStreakMilestone = null;
          const victoryRemark = commentaryService.getVictoryCommentary({
            levelId: this.level.id,
            levelDeaths: this.levelDeaths,
            totalDeaths: this.totalDeathsGlobal,
            elapsedMs: Math.round(this.levelTime * 1000),
            nowMs: this.worldTime * 1000,
          });
          this.setFourthWallBubble(victoryRemark.text, victoryRemark.durationSec);
          this.lookingAtPlayer = true;
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

  private triggerFakeExitBetrayal(ex: RuntimeExit): void {
    ex.fakeTriggered = true;
    audioManager.playTrap();
    this.recordTrick('trap');
    this.showPrankBanner(
      ex.def.fakeMessage ?? 'NOT SO FAST! THE REAL LEVEL JUST STARTED.',
      3.1,
    );

    const fakeExitRemark = commentaryService.requestRemark('fake_exit', {
      levelId: this.level.id,
      levelDeaths: this.levelDeaths,
      totalDeaths: this.totalDeathsGlobal,
      force: true,
      nowMs: this.worldTime * 1000,
    });
    if (fakeExitRemark) {
      this.setFourthWallBubble(fakeExitRemark.text, fakeExitRemark.durationSec);
      this.lookingAtPlayer = true;
    }

    const behavior = ex.def.fakeBehavior ?? 'vanish';
    if (behavior === 'vanish') {
      this.spawnDust(ex.x, ex.y - 34, 22, '#DC2626');
      this.spawnDust(ex.x, ex.y - 34, 18, '#111111');
      ex.vanished = true;
    } else if (behavior === 'become_wall') {
      ex.becameWall = true;
      this.setExitQuip(ex, 'Solid brick now!', 2.4);
      this.spawnDust(ex.x, ex.y - 34, 20, '#111111');
      this.triggerShake(0.24, 7);
    } else if (behavior === 'elevate_trap' && ex.def.shiftTo) {
      ex.targetX = ex.def.shiftTo.x;
      ex.targetY = ex.def.shiftTo.y;
      ex.moving = true;
      ex.elevatedReal = true;
      this.setExitQuip(ex, 'Jump for it!', 2.6);
      this.spawnDust(ex.x, ex.y - 34, 18, '#DC2626');
      this.triggerShake(0.22, 6);
    } else if (behavior === 'teleport_shift' && ex.def.shiftTo) {
      this.spawnDust(ex.x, ex.y - 34, 18, '#DC2626');
      ex.x = ex.def.shiftTo.x;
      ex.y = ex.def.shiftTo.y;
      this.setExitQuip(ex, 'Missed me!', 2.2);
      this.spawnDust(ex.x, ex.y - 34, 18, '#111111');
    } else if (behavior === 'sprint_away' && ex.def.shiftTo) {
      ex.targetX = ex.def.shiftTo.x;
      ex.targetY = ex.def.shiftTo.y;
      ex.moving = true;
      this.setExitQuip(ex, 'Catch me!', 2.4);
    } else {
      this.triggerShake(0.25, 7);
    }

    if (ex.def.revealsTriggerId) {
      this.unlockHiddenTrackTrigger(ex.def.revealsTriggerId);
    } else {
      this.triggerShake(0.25, 7);
    }
  }

  private updateRewards(dt: number): void {
    const playerCenterX = this.px + PLAYER_W / 2;
    const playerCenterY = this.py + PLAYER_H / 2;

    for (const r of this.rewards) {
      if (!r.revealed) continue;
      if (r.revealAnim < 1) {
        r.revealAnim = Math.min(1, r.revealAnim + dt * 5);
      }
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
      if (!s.revealed) continue;
      if (s.revealAnim < 1) {
        s.revealAnim = Math.min(1, s.revealAnim + 0.08);
      }
      if (s.def.flippedText && !s.flipped && playerCenterX > s.def.x + 55) {
        s.flipped = true;
      }
    }
  }

  private updateSwitches(dt: number): void {
    const playerBottomY = this.py + PLAYER_H;
    for (const sw of this.switches) {
      if (!sw.revealed) continue;
      if (sw.revealAnim < 1) {
        sw.revealAnim = Math.min(1, sw.revealAnim + dt * 5);
      }
      if (sw.pressed && sw.pressAnim < 1) {
        sw.pressAnim = Math.min(1, sw.pressAnim + dt * 9);
      }
      if (sw.pressed || this.state !== 'alive') continue;

      const w = sw.def.w ?? 38;
      const hitX = this.px + PLAYER_W > sw.def.x + 2 && this.px < sw.def.x + w - 2;
      const hitY = playerBottomY >= sw.def.y - 14 && this.py <= sw.def.y + 12;
      if (hitX && hitY) {
        sw.pressed = true;
        sw.pressAnim = 0.2;
        if (sw.def.gravityOverride !== undefined) {
          this.dynamicGravityScale = sw.def.gravityOverride;
        }
        if (sw.def.cameraShiftX !== undefined) {
          this.cameraShiftBias = sw.def.cameraShiftX;
        }
        this.unlockHiddenTrackTrigger(sw.def.triggersId);
        if (sw.def.betrayal) {
          audioManager.playTrap();
          this.recordTrick('trap');
        } else {
          audioManager.playCheckpoint();
        }
        if (sw.def.prankMessage) {
          this.showPrankBanner(sw.def.prankMessage, 3.0);
        }
        this.spawnDust(sw.def.x + w / 2, sw.def.y - 4, 12, sw.def.betrayal ? '#DC2626' : '#111111');
      }
    }
  }

  private recordTrick(kind: 'trap' | 'fake_reward' | 'fourth_wall'): void {
    this.tricksInLevel += 1;
    if (kind === 'trap') {
      this.triggerDangerPulse(0.68);
    }
    this.callbacks.onTrickTriggered(kind);
    if ((kind === 'fake_reward' || kind === 'trap') && !this.fourthWallBubble) {
      const trigger = kind === 'fake_reward' ? 'fake_reward' : 'trap';
      const remark = commentaryService.requestRemark(trigger, {
        levelId: this.level.id,
        levelDeaths: this.levelDeaths,
        totalDeaths: this.totalDeathsGlobal,
        nowMs: this.worldTime * 1000,
      });
      if (remark) {
        this.setFourthWallBubble(remark.text, remark.durationSec);
        this.lookingAtPlayer = true;
      }
    }
  }

  private triggerDangerPulse(strength: number): void {
    if (this.dangerPulseCooldown > 0) return;
    const clamped = Math.max(0, Math.min(1, strength));
    if (clamped <= this.dangerPulseBoost * 0.82) return;
    this.dangerPulseBoost = Math.max(this.dangerPulseBoost, clamped);
    this.dangerPulseCooldown = 0.36;
  }

  /**
   * Evaluates psychological proximity tension (0..1) from nearby traps, active
   * high-difficulty obstacles, unstable trap platforms, and hostile zones.
   */
  private computeDangerPressure(): number {
    const pcx = this.px + PLAYER_W * 0.5;
    const pcy = this.py + PLAYER_H * 0.5;
    let peakPressure = 0;

    for (const h of this.hazards) {
      if (!h.active || !h.revealed) continue;
      const closestX = Math.max(h.x, Math.min(pcx, h.x + h.w));
      const closestY = Math.max(h.y, Math.min(pcy, h.y + h.h));
      const dist = Math.hypot(pcx - closestX, pcy - closestY);

      let radius = 0;
      let weight = 0;
      let isHighDifficulty = false;

      switch (h.def.kind) {
        case 'chaser':
          if (h.chaserActive) {
            radius = 235;
            weight = 1.0;
            isHighDifficulty = true;
          } else {
            const triggerX = h.def.triggerX ?? h.x;
            const dTrig = Math.abs(pcx - triggerX);
            if (dTrig < 90) {
              peakPressure = Math.max(peakPressure, (1 - dTrig / 90) * 0.34);
            }
            continue;
          }
          break;
        case 'saw':
        case 'sweeper':
          radius = 168;
          weight = 0.94;
          isHighDifficulty = true;
          break;
        case 'falling_block':
          if (h.fallState === 'shaking' || h.fallState === 'falling') {
            radius = 178;
            weight = 0.96;
            isHighDifficulty = true;
          } else if (h.fallState === 'idle') {
            const triggerX = h.def.fallTriggerX ?? h.x + h.w * 0.5;
            const dxTrig = Math.abs(pcx - triggerX);
            if (dxTrig < 92 && pcy >= h.y - 24) {
              const p = 1 - dxTrig / 92;
              peakPressure = Math.max(peakPressure, p * p * 0.44);
            }
            continue;
          } else {
            continue;
          }
          break;
        case 'popup_spike':
          if (h.popupState === 'telegraph' || h.popupState === 'up') {
            radius = 152;
            weight = 0.92;
            isHighDifficulty = true;
          } else {
            continue;
          }
          break;
        case 'sliding_spike':
          if (h.slideTriggered) {
            radius = 156;
            weight = 0.92;
            isHighDifficulty = true;
          } else {
            const trigX = h.def.triggerX ?? h.x + h.w * 0.5;
            const dTrig = Math.abs(pcx - trigX);
            if (dTrig < 88 && Math.abs(pcy - (h.y + h.h * 0.5)) < 120) {
              const p = 1 - dTrig / 88;
              peakPressure = Math.max(peakPressure, p * p * 0.42);
            }
            continue;
          }
          break;
        case 'retract_spike':
          if (h.popupExtend <= 0.05) continue;
          radius = 112;
          weight = 0.66;
          break;
        case 'spike':
          radius = 112;
          weight = 0.68;
          break;
      }

      if (radius > 0 && dist < radius) {
        const prox = 1 - dist / radius;
        const pressure = Math.pow(prox, 1.45) * weight;
        if (pressure > peakPressure) {
          peakPressure = pressure;
        }
        // Brief pulse surge when narrowly passing a high-difficulty obstacle
        if (isHighDifficulty && dist < 60 && this.respawnInvulnTimer <= 0) {
          this.triggerDangerPulse(0.54);
        }
      }
    }

    // High-difficulty trap platforms near the player
    for (const p of this.platforms) {
      if (!p.revealed || !p.active) continue;
      const closestX = Math.max(p.x, Math.min(pcx, p.x + p.w));
      const closestY = Math.max(p.y, Math.min(pcy, p.y + p.h));
      const dist = Math.hypot(pcx - closestX, pcy - closestY);
      if (dist > 115) continue;

      let platPressure = 0;
      switch (p.def.kind) {
        case 'crumble':
          if (p.crumbleState === 'shaking') {
            platPressure = 0.68;
          } else if (dist < 72) {
            platPressure = (1 - dist / 72) * 0.36;
          }
          break;
        case 'fake_drop':
          if (p.dropState === 'shaking' || p.dropState === 'dropped') {
            platPressure = 0.78;
          }
          break;
        case 'pit_stretch':
          if (p.stretchActive) {
            const edgeX = (p.def.stretchEdge ?? 'left') === 'left' ? p.x : p.x + p.w;
            const edgeDist = Math.abs(pcx - edgeX);
            platPressure = Math.max(0.55, Math.min(0.92, 1 - edgeDist / 170));
            if (edgeDist < 62 && this.respawnInvulnTimer <= 0) {
              this.triggerDangerPulse(0.58);
            }
          }
          break;
        case 'shrink':
          if (p.shrinkActive) {
            platPressure = 0.64;
          } else if (dist < 72) {
            platPressure = (1 - dist / 72) * 0.34;
          }
          break;
        case 'phase_blink':
          if (p.blinkWarning && dist < 110) {
            platPressure = (1 - dist / 110) * 0.76;
            if (dist < 48 && this.respawnInvulnTimer <= 0) {
              this.triggerDangerPulse(0.46);
            }
          } else if (dist < 72) {
            platPressure = (1 - dist / 72) * 0.34;
          }
          break;
        case 'look_away':
          if (dist < 88) {
            platPressure = (1 - dist / 88) * 0.5;
          }
          break;
        case 'proximity_shift':
          if (p.shiftTriggered && dist < 108) {
            platPressure = (1 - dist / 108) * 0.56;
          }
          break;
        case 'follow_player':
          if (p.def.followMode === 'evade' && dist < 96) {
            platPressure = (1 - dist / 96) * 0.52;
          }
          break;
        case 'elevator':
          if (p.elevatorActive && dist < 88) {
            platPressure = (1 - dist / 88) * 0.38;
          }
          break;
      }

      if (platPressure > peakPressure) {
        peakPressure = platPressure;
      }
    }

    // Subtle psychological modifiers for disorienting zones & late-game gauntlet intensity
    if (this.inReverseControlZone) {
      peakPressure = Math.max(peakPressure, 0.24) + 0.12;
    }
    const gravScale = this.dynamicGravityScale ?? this.level.gravityScale ?? 1;
    if (gravScale < 0 && peakPressure > 0.05) {
      peakPressure += 0.09;
    }
    if (this.level.windZones && peakPressure > 0.05) {
      for (const wz of this.level.windZones) {
        if (wz.revealOnTriggerId && !this.revealedTriggers.has(wz.revealOnTriggerId)) continue;
        if (pcx >= wz.minX && pcx <= wz.maxX) {
          peakPressure += 0.07;
          break;
        }
      }
    }
    if (this.level.id >= 71 && peakPressure > 0.04) {
      peakPressure += this.level.id >= 95 ? 0.1 : 0.05;
    }

    return Math.max(0, Math.min(1, peakPressure));
  }

  private updateDangerVignette(dt: number): void {
    if (this.dangerPulseCooldown > 0) {
      this.dangerPulseCooldown = Math.max(0, this.dangerPulseCooldown - dt);
    }

    if (this.state !== 'alive') {
      this.dangerPulseBoost *= Math.exp(-dt * 5.2);
      if (this.dangerPulseBoost < 0.004) this.dangerPulseBoost = 0;
      this.dangerVignetteIntensity *= Math.exp(-dt * 4.8);
      if (this.dangerVignetteIntensity < 0.004) this.dangerVignetteIntensity = 0;
      return;
    }

    this.dangerPulseBoost *= Math.exp(-dt * 4.2);
    if (this.dangerPulseBoost < 0.004) this.dangerPulseBoost = 0;

    const proximityPressure = this.computeDangerPressure();
    const target = Math.min(1, proximityPressure + this.dangerPulseBoost * 0.56);

    const rate = target > this.dangerVignetteIntensity ? 10.5 : 3.6;
    const blend = 1 - Math.exp(-dt * rate);
    this.dangerVignetteIntensity += (target - this.dangerVignetteIntensity) * blend;
    if (this.dangerVignetteIntensity < 0.004 && target === 0) {
      this.dangerVignetteIntensity = 0;
    }
  }

  private setFourthWallBubble(text: string | null, durationSec: number): void {
    this.fourthWallBubble = text;
    this.fourthWallBubbleTimer = text ? durationSec : 0;
    this.fourthWallBubbleAge = 0;
  }

  private setExitQuip(ex: RuntimeExit, text: string, durationSec: number): void {
    ex.quipText = text;
    ex.quipTimer = durationSec;
    ex.quipAge = 0;
  }

  private showPrankBanner(text: string, duration = 2.6): void {
    this.prankBanner = text;
    this.prankBannerId += 1;
    this.prankBannerTimer = duration;
    this.emitHud();
  }

  /**
   * Preserves real checkpoints fairly across Levels 1–99 (while fake checkpoints still betray),
   * whereas Level 100 has zero real checkpoints and always resets to pixel 1.
   */
  private shouldResetToLevelStart(): boolean {
    return this.level.id >= 100;
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

    // Track per-level death streak and generate context-aware commentary via commentaryService
    const nextLevelStreak = (this.deathStreakByLevel.get(this.level.id) ?? 0) + 1;
    this.deathStreakByLevel.set(this.level.id, nextLevelStreak);

    const repeatCount = adaptiveDifficulty.recordDeath(this.px, this.py, this.level.id, cause);
    const updatedSnap = adaptiveDifficulty.getSnapshot(this.level.id);
    this.adaptiveHint = this.level.id <= HINT_SYSTEM_MAX_LEVEL ? updatedSnap.activeModifierText : null;
    const bounds = this.getEffectiveWorldBounds();
    const progress = Math.max(0, Math.min(1, this.px / Math.max(1, bounds.maxX)));

    const deathBundle = commentaryService.getDeathCommentary({
      levelId: this.level.id,
      levelDeaths: this.levelDeaths,
      levelDeathStreak: nextLevelStreak,
      totalDeaths: this.totalDeathsGlobal,
      progressRatio: progress,
      repeatObstacleCount: repeatCount,
      deathCause: cause,
      elapsedMs: Math.round(this.levelTime * 1000),
      quickDeaths: this.consecutiveQuickDeaths,
      force: true,
      nowMs: this.worldTime * 1000,
    });
    const streakMilestone = deathBundle.streakMilestone;
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
      if (!deathBundle.banner && (hadCheckpoint || distanceFromStart > 320)) {
        this.showPrankBanner(this.pickStartResetBanner(hadCheckpoint));
      }
    }

    this.currentDeathMessage = deathBundle.deathMessage;
    this.deathMessageId += 1;
    this.deathMessageTimer = deathBundle.deathMessageDurationSec;

    // Compute a safe respawn spot a short distance away from the lethal obstacle
    // (never directly over spikes, popup traps, sliding blades, or fake trapdoors).
    const safeSpot = this.computeSafeRespawnSpot(exactX, exactY, cause);
    const respawnX = safeSpot.x;
    const respawnY = safeSpot.y;

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

    if (deathBundle.banner) {
      this.showPrankBanner(deathBundle.banner, deathBundle.bannerDurationSec);
    }

    this.setFourthWallBubble(deathBundle.bubble, deathBundle.bubbleDurationSec);
    this.autonomousCommentTimer = commentaryService.getNextAmbientDelaySeconds(
      this.level.id,
      this.levelDeaths,
    );
    this.lookingAtPlayer = true;

    audioManager.playDeath();
    audioManager.setAtmosphereLevel(this.level.id, nextLevelStreak);
    this.spawnDust(this.px + PLAYER_W / 2, this.py + PLAYER_H / 2, 18, '#DC2626');
    this.spawnDust(this.px + PLAYER_W / 2, this.py + PLAYER_H / 2, 14, '#111111');

    this.callbacks.onDeathRecorded(this.level.id, this.levelDeaths, nextLevelStreak, {
      levelId: this.level.id,
      cause,
      levelDeaths: this.levelDeaths,
      deathStreak: nextLevelStreak,
      totalDeaths: this.totalDeathsGlobal,
      quickDeaths: this.consecutiveQuickDeaths,
      elapsedMs: Math.round(this.levelTime * 1000),
      progressRatio: progress,
      repeatObstacleCount: repeatCount,
      streakMilestone,
    });
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
    const levelStreak = this.deathStreakByLevel.get(this.level.id) ?? 0;
    const hintsAllowed = this.level.id >= 1 && this.level.id <= HINT_SYSTEM_MAX_LEVEL;
    const resolvedHint = hintsAllowed
      ? resolveObstacleHintForHud(
          this.level,
          this.px + PLAYER_W / 2,
          (lid, minX, maxX, causes) => adaptiveDifficulty.getZoneDeathCount(lid, minX, maxX, causes),
          adaptiveDifficulty.getDeathClusters(this.level.id),
          Math.max(this.levelDeaths, levelStreak),
        )
      : null;

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
      adaptiveHint: hintsAllowed ? this.adaptiveHint : null,
      obstacleHint:
        hintsAllowed && resolvedHint
          ? {
              obstacleKey: resolvedHint.obstacleKey,
              deathsOnObstacle: resolvedHint.deathsOnObstacle,
              isRepeatObstacleFail: resolvedHint.isRepeatObstacleFail,
              obstacleIndex: resolvedHint.obstacleIndex,
              clueText: resolvedHint.clueText,
              centerX: resolvedHint.centerX,
            }
          : null,
    });
  }

  // =========================================================================
  // MINIMALIST INK-ON-WARM-PAPER (AND PITCH-BLACK LIGHTS-OUT) RENDERER
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

    const isDarkLevel = Boolean(this.level.spotlightRadius);
    const isFinale100 = this.isFinale100Theme();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Fill warm drafting-paper background, obsidian charcoal on Level 100, or pitch black in darkness levels
    ctx.fillStyle = isDarkLevel ? '#020204' : isFinale100 ? '#1A1617' : '#F5F3EE';
    ctx.fillRect(0, 0, targetW, targetH);

    // Compute aspect-fit uniform scale centered nicely across any landscape screen
    const scaleX = targetW / VIEW_WIDTH;
    const scaleY = targetH / VIEW_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (targetW - VIEW_WIDTH * scale) * 0.5;
    const offsetY = (targetH - VIEW_HEIGHT * scale) * 0.5;
    const viewMinX = -offsetX / scale;
    const viewMaxX = (targetW - offsetX) / scale;
    const viewMinY = -offsetY / scale;
    const viewMaxY = (targetH - offsetY) / scale;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Subtle paper drafting grid seamlessly covering entire visible background edge to edge
    this.drawBackgroundGrid(ctx, viewMinX, viewMaxX, viewMinY, viewMaxY);

    // Camera transform + shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      const mag = this.shakeIntensity * (this.shakeTime / 0.25);
      shakeX = (Math.random() * 2 - 1) * mag;
      shakeY = (Math.random() * 2 - 1) * mag;
    }

    // Uplift the rendered playfield slightly so the black floor & stickman sit cleanly above mobile touch buttons
    const worldUpliftY = 52;

    ctx.save();
    ctx.translate(-Math.round(this.camX) + shakeX, -worldUpliftY + shakeY);

    // Render order: Wind -> Signs -> Adaptive Clue -> Checkpoints -> Exits -> Platforms -> Hazards -> Fake Rewards -> Player -> Particles
    this.drawWindZones(ctx);
    this.drawSigns(ctx);
    this.drawAdaptiveClue(ctx);
    this.drawCheckpoints(ctx);
    this.drawSwitches(ctx);
    this.drawExits(ctx);
    this.drawPlatforms(ctx, viewMaxY + worldUpliftY);
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

    // High-intensity darkness radial gradient mask (delegated to GameCanvas renderer when provided)
    if (this.level.spotlightRadius) {
      const tightRadius = this.getHighIntensityViewRadius();
      const proximityRevealRadius = tightRadius * (this.darknessLightBoost ? 1.85 : this.level.id <= 35 ? 1.52 : 1.36);
      const darknessFrame: DarknessRenderFrame = {
        levelId: this.level.id,
        playerScreenX: this.px + PLAYER_W / 2 - Math.round(this.camX) + shakeX,
        playerScreenY: this.py + PLAYER_H / 2 - 4 - worldUpliftY + shakeY,
        facing: this.facing,
        baseRadius: tightRadius,
        viewWidth: VIEW_WIDTH,
        viewHeight: VIEW_HEIGHT,
        worldTime: this.worldTime,
        flashAlpha: this.darknessFlashAlpha,
        nearestHazardDistance: this.computeNearestHazardDistance(),
        proximityRevealRadius,
        lightBoostActive: this.darknessLightBoost,
      };
      if (this.callbacks.onRenderDarknessMask) {
        this.callbacks.onRenderDarknessMask(ctx, darknessFrame);
      } else {
        this.drawSpotlightOverlay(ctx, tightRadius, worldUpliftY);
      }
    }

    // Level 100 Obsidian Arena framing: subtle crimson architectural corner ticks + act escalation rim
    if (isFinale100 && !isDarkLevel) {
      const unlockedActs =
        1 +
        (this.revealedTriggers.has('peak_100_a') ? 1 : 0) +
        (this.revealedTriggers.has('peak_100_b') ? 1 : 0) +
        (this.revealedTriggers.has('peak_100_c') ? 1 : 0);
      const rimAlpha = 0.14 + (unlockedActs - 1) * 0.045;
      ctx.save();
      const vGrad = ctx.createRadialGradient(
        VIEW_WIDTH * 0.5,
        VIEW_HEIGHT * 0.5,
        VIEW_WIDTH * 0.28,
        VIEW_WIDTH * 0.5,
        VIEW_HEIGHT * 0.5,
        VIEW_WIDTH * 0.68,
      );
      vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vGrad.addColorStop(1, `rgba(127, 29, 29, ${rimAlpha.toFixed(3)})`);
      ctx.fillStyle = vGrad;
      ctx.fillRect(viewMinX, viewMinY, viewMaxX - viewMinX, viewMaxY - viewMinY);

      // Subtle architectural crimson corner crosshairs
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.36)';
      ctx.lineWidth = 1.5;
      const m = 14;
      const b = 18;
      ctx.beginPath();
      ctx.moveTo(m, m + b);
      ctx.lineTo(m, m);
      ctx.lineTo(m + b, m);
      ctx.moveTo(VIEW_WIDTH - m - b, m);
      ctx.lineTo(VIEW_WIDTH - m, m);
      ctx.lineTo(VIEW_WIDTH - m, m + b);
      ctx.moveTo(m, VIEW_HEIGHT - m - b);
      ctx.lineTo(m, VIEW_HEIGHT - m);
      ctx.lineTo(m + b, VIEW_HEIGHT - m);
      ctx.moveTo(VIEW_WIDTH - m - b, VIEW_HEIGHT - m);
      ctx.lineTo(VIEW_WIDTH - m, VIEW_HEIGHT - m);
      ctx.lineTo(VIEW_WIDTH - m, VIEW_HEIGHT - m - b);
      ctx.stroke();
      ctx.restore();
    }

    // Subtle reversed-controls indicator badge on world border (non-intrusive glitch line)
    if (this.inReverseControlZone && this.state === 'alive') {
      ctx.save();
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.35)';
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(4, 4, VIEW_WIDTH - 8, VIEW_HEIGHT - 8);
      ctx.restore();
    }

    // Subtle warm paper edge vignette across full visible canvas (no rectangular box boundary)
    const fullW = viewMaxX - viewMinX;
    const fullH = viewMaxY - viewMinY;
    const vigCenterX = (viewMinX + viewMaxX) * 0.5;
    const vigCenterY = (viewMinY + viewMaxY) * 0.48;
    const vigOuterRadius = Math.hypot(fullW * 0.52, fullH * 0.52);
    const vig = ctx.createRadialGradient(
      vigCenterX,
      vigCenterY,
      Math.min(fullW, fullH) * 0.35,
      vigCenterX,
      (viewMinY + viewMaxY) * 0.5,
      vigOuterRadius,
    );
    vig.addColorStop(0, 'rgba(245, 243, 238, 0)');
    vig.addColorStop(1, 'rgba(17, 17, 17, 0.08)');
    ctx.fillStyle = vig;
    ctx.fillRect(viewMinX, viewMinY, fullW, fullH);

    // Crimson edge vignette flash on death
    if (this.deathFlashAlpha > 0) {
      ctx.fillStyle = `rgba(220, 38, 38, ${this.deathFlashAlpha.toFixed(3)})`;
      ctx.fillRect(viewMinX, viewMinY, fullW, fullH);
    }

    ctx.restore();

    // Dynamic full-screen-edge danger vignette (delegated to GameCanvas renderer for 60fps zero-react-overhead polish)
    if (
      this.callbacks.onRenderDangerVignette &&
      (this.dangerVignetteIntensity > 0.012 || this.dangerPulseBoost > 0.012)
    ) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.callbacks.onRenderDangerVignette(ctx, {
        width: targetW,
        height: targetH,
        intensity: this.dangerVignetteIntensity,
        pulseBoost: this.dangerPulseBoost,
        worldTime: this.worldTime,
        isDarkLevel,
        prefersReducedMotion: this.prefersReducedMotion,
      });
      ctx.restore();
    }
  }

  private drawWindZones(ctx: CanvasRenderingContext2D): void {
    const zones = this.level.windZones;
    if (!zones || zones.length === 0) return;

    ctx.save();
    ctx.strokeStyle = this.isFinale100Theme()
      ? 'rgba(245, 243, 238, 0.28)'
      : 'rgba(17, 17, 17, 0.17)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    for (const wz of zones) {
      if (wz.revealOnTriggerId && !this.revealedTriggers.has(wz.revealOnTriggerId)) continue;
      const span = Math.max(80, wz.maxX - wz.minX);
      const dir = Math.sign(wz.forceX) || 1;
      const streakCount = Math.min(20, Math.max(6, Math.floor(span / 45)));
      const speed = 170 + Math.abs(wz.forceX) * 0.35;

      for (let i = 0; i < streakCount; i++) {
        const rawOffset = (this.worldTime * speed + i * 73) % span;
        const sx = dir > 0 ? wz.minX + rawOffset : wz.maxX - rawOffset;
        const sy = 90 + ((i * 67) % 310);
        const len = 24 + (i % 3) * 11;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + dir * len, sy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * Computes a balanced player view radius for darkness levels:
   * - Early dark levels (<= 35) stay generous enough that upcoming obstacles ahead are clear.
   * - Mid (36..65) and late (66..100) dark levels tighten progressively while preserving forward readability.
   */
  private getHighIntensityViewRadius(): number {
    const raw = this.level.spotlightRadius ?? 116;
    if (this.level.id <= 35) {
      return Math.max(118, Math.min(138, Math.round(raw * 1.06)));
    }
    if (this.level.id <= 65) {
      return Math.max(96, Math.min(114, Math.round(raw * 0.96)));
    }
    return Math.max(84, Math.min(98, Math.round(raw * 0.92)));
  }

  /**
   * Returns 0..1 visibility alpha for an obstacle in darkness levels.
   * Probes both around the player AND forward in the player's facing direction so
   * obstacles directly ahead come into clear view before impact (expanded further
   * when the rewarded forward-light boost is active).
   */
  private getObstacleProximityAlpha(
    x: number,
    y: number,
    w: number,
    h: number,
    radiusScale = 1,
  ): number {
    if (!this.level.spotlightRadius) return 1;
    const isEarlyDark = this.level.id <= 35;
    const baseRadius = this.getHighIntensityViewRadius();
    const forwardReach = this.darknessLightBoost ? 104 : isEarlyDark ? 62 : 44;
    const revealRadius =
      baseRadius *
      (this.darknessLightBoost ? 1.88 : isEarlyDark ? 1.54 : 1.38) *
      radiusScale;

    const pcx = this.px + PLAYER_W * 0.5;
    const pcy = this.py + PLAYER_H * 0.5;
    const fcx = pcx + this.facing * forwardReach;

    // Distance to player center
    const closestPX = Math.max(x, Math.min(pcx, x + w));
    const closestPY = Math.max(y, Math.min(pcy, y + h));
    const distPlayerSq = (pcx - closestPX) ** 2 + (pcy - closestPY) ** 2;

    // Distance to forward sightline probe (stretched slightly horizontally along facing direction)
    const closestFX = Math.max(x, Math.min(fcx, x + w));
    const closestFY = Math.max(y, Math.min(pcy, y + h));
    const fdx = (fcx - closestFX) * (this.darknessLightBoost ? 0.78 : 0.88);
    const fdy = pcy - closestFY;
    const distForwardSq = fdx * fdx + fdy * fdy;

    const distSq = Math.min(distPlayerSq, distForwardSq);
    if (distSq >= revealRadius * revealRadius) {
      return 0;
    }
    const dist = Math.sqrt(distSq);
    const fullRevealRadius = revealRadius * (this.darknessLightBoost ? 0.7 : 0.62);
    if (dist <= fullRevealRadius) return 1;
    const t = 1 - (dist - fullRevealRadius) / Math.max(1, revealRadius - fullRevealRadius);
    return t * t;
  }

  private computeNearestHazardDistance(): number {
    const pcx = this.px + PLAYER_W * 0.5;
    const pcy = this.py + PLAYER_H * 0.5;
    let minDistSq = Infinity;
    for (const h of this.hazards) {
      if (!h.active || !h.revealed) continue;
      if (
        (h.def.kind === 'popup_spike' || h.def.kind === 'retract_spike') &&
        h.popupExtend <= 0.02
      ) {
        continue;
      }
      const closestX = Math.max(h.x, Math.min(pcx, h.x + h.w));
      const closestY = Math.max(h.y, Math.min(pcy, h.y + h.h));
      const dx = pcx - closestX;
      const dy = pcy - closestY;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) minDistSq = dSq;
    }
    return minDistSq === Infinity ? Infinity : Math.sqrt(minDistSq);
  }

  private drawSpotlightOverlay(
    ctx: CanvasRenderingContext2D,
    radius: number,
    worldUpliftY = 0,
  ): void {
    const forwardShift = this.darknessLightBoost ? 78 : this.level.id <= 35 ? 42 : 30;
    const effRadius = this.darknessLightBoost ? radius * 1.55 : radius;
    const sx = this.px + PLAYER_W / 2 - Math.round(this.camX) + this.facing * forwardShift;
    const sy = this.py + PLAYER_H / 2 - 4 - worldUpliftY;

    const grad = ctx.createRadialGradient(sx, sy, effRadius * 0.34, sx, sy, effRadius * 1.15);
    grad.addColorStop(0, 'rgba(2, 2, 4, 0.00)');
    grad.addColorStop(0.45, this.darknessLightBoost ? 'rgba(2, 2, 4, 0.16)' : 'rgba(2, 2, 4, 0.28)');
    grad.addColorStop(0.74, this.darknessLightBoost ? 'rgba(2, 2, 4, 0.64)' : 'rgba(2, 2, 4, 0.78)');
    grad.addColorStop(1, this.darknessLightBoost ? 'rgba(1, 1, 3, 0.935)' : 'rgba(1, 1, 3, 0.975)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  private drawBackgroundGrid(
    ctx: CanvasRenderingContext2D,
    viewMinX = 0,
    viewMaxX = VIEW_WIDTH,
    viewMinY = 0,
    viewMaxY = VIEW_HEIGHT,
  ): void {
    const isDark = Boolean(this.level.spotlightRadius);
    const isFinale100 = this.isFinale100Theme();
    const gridSize = 40;
    const phaseX = ((-this.camX * 0.35) % gridSize + gridSize) % gridSize;
    const firstX = Math.floor((viewMinX - phaseX) / gridSize) * gridSize + phaseX;
    const firstY = Math.floor(viewMinY / gridSize) * gridSize;

    ctx.strokeStyle = isDark
      ? 'rgba(245, 243, 238, 0.01)'
      : isFinale100
        ? 'rgba(220, 38, 38, 0.11)'
        : 'rgba(17, 17, 17, 0.042)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = firstX; x <= viewMaxX + gridSize; x += gridSize) {
      ctx.moveTo(x, viewMinY);
      ctx.lineTo(x, viewMaxY);
    }
    for (let y = firstY; y <= viewMaxY + gridSize; y += gridSize) {
      ctx.moveTo(viewMinX, y);
      ctx.lineTo(viewMaxX, y);
    }
    ctx.stroke();

    if (isFinale100 && !isDark) {
      // Bold major crimson blueprint intersections every 200px
      const majorSize = 200;
      const majorPhaseX = ((-this.camX * 0.35) % majorSize + majorSize) % majorSize;
      const firstMajorX = Math.floor((viewMinX - majorPhaseX) / majorSize) * majorSize + majorPhaseX;
      const firstMajorY = Math.floor(viewMinY / majorSize) * majorSize;
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.19)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = firstMajorX; x <= viewMaxX + majorSize; x += majorSize) {
        ctx.moveTo(x, viewMinY);
        ctx.lineTo(x, viewMaxY);
      }
      for (let y = firstMajorY; y <= viewMaxY + majorSize; y += majorSize) {
        ctx.moveTo(viewMinX, y);
        ctx.lineTo(viewMaxX, y);
      }
      ctx.stroke();

      // Monumental faint parallax "100" architectural watermark + Act numeral
      const actIndex =
        1 +
        (this.revealedTriggers.has('peak_100_a') ? 1 : 0) +
        (this.revealedTriggers.has('peak_100_b') ? 1 : 0) +
        (this.revealedTriggers.has('peak_100_c') ? 1 : 0);
      const actRoman = ['I', 'II', 'III', 'IV'][Math.min(3, actIndex - 1)];
      const wmSpan = 960;
      const wmPhase = ((-this.camX * 0.12) % wmSpan + wmSpan) % wmSpan;
      const firstWm = Math.floor((viewMinX - wmPhase) / wmSpan) * wmSpan + wmPhase - wmSpan;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let wx = firstWm; wx <= viewMaxX + wmSpan; wx += wmSpan) {
        const cx = wx + wmSpan * 0.5;
        ctx.fillStyle = 'rgba(220, 38, 38, 0.075)';
        ctx.font = '800 210px "Space Grotesk", "DM Sans", sans-serif';
        ctx.fillText('100', cx, 245);
        ctx.fillStyle = 'rgba(245, 243, 238, 0.08)';
        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.fillText(`ACT ${actRoman} / IV  ·  ZERO CHECKPOINTS`, cx, 342);
      }
      ctx.restore();
    }

    // Soft floating atmospheric specks (crimson embers + ash on Level 100)
    const spanW = Math.max(VIEW_WIDTH + 40, viewMaxX - viewMinX + 40);
    const speckCount = Math.max(isFinale100 ? 22 : 14, Math.round((spanW / (VIEW_WIDTH + 40)) * (isFinale100 ? 22 : 14)));
    for (let i = 0; i < speckCount; i++) {
      const mx =
        ((((i * 197 - this.camX * 0.22 + this.worldTime * (6 + (i % 4) * 2)) % spanW) + spanW) %
          spanW) +
        viewMinX -
        20;
      const riseDrift = isFinale100 ? -(this.worldTime * (12 + (i % 3) * 5)) : 0;
      const rawY = 65 + ((i * 83) % 340) + riseDrift;
      const my = isFinale100
        ? (((rawY % 390) + 390) % 390) + 25
        : rawY + Math.sin(this.worldTime * 1.1 + i) * 10;
      ctx.fillStyle = isDark
        ? 'rgba(245, 243, 238, 0.02)'
        : isFinale100
          ? i % 3 === 0
            ? 'rgba(239, 68, 68, 0.42)'
            : 'rgba(245, 243, 238, 0.16)'
          : 'rgba(17, 17, 17, 0.12)';
      ctx.beginPath();
      ctx.arc(mx, my, 1.3 + (i % 2) * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle architectural drafting ticks in distant parallax across entire visible width
    ctx.fillStyle = isDark
      ? 'rgba(245, 243, 238, 0.008)'
      : isFinale100
        ? 'rgba(220, 38, 38, 0.14)'
        : 'rgba(17, 17, 17, 0.04)';
    const tickSpacing = 480;
    const tickPhase = ((-this.camX * 0.15) % tickSpacing + tickSpacing) % tickSpacing;
    const firstTick =
      Math.floor((viewMinX - tickPhase) / tickSpacing) * tickSpacing + tickPhase - tickSpacing;
    for (let bx = firstTick; bx <= viewMaxX + tickSpacing; bx += tickSpacing) {
      const ax = bx + 120;
      ctx.fillRect(ax, 180, 1.5, 240);
      ctx.fillRect(ax - 5, 180, 12, 1.5);
      ctx.fillRect(ax + 180, 240, 1.5, 180);
      ctx.fillRect(ax + 175, 240, 12, 1.5);
    }
  }

  /**
   * Computes visual-only downward platform thickness so thin runnable platforms
   * read clearly without altering collision hitboxes, top landing surfaces, or jump clearances.
   */
  private getVisualPlatformHeight(p: RuntimePlatform): number {
    const baseH = p.h;
    if (baseH > 44 || p.def.kind === 'reveal_wall') {
      return baseH;
    }
    // Preserve exact height if a downward-pointing ceiling spike sits directly beneath this platform
    for (const h of this.hazards) {
      if (
        h.def.dir === 'down' &&
        h.x < p.x + p.w &&
        h.x + h.w > p.x &&
        Math.abs(h.y - (p.y + baseH)) <= 10
      ) {
        return baseH;
      }
    }
    return baseH + 8;
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D, bottomWorldY = VIEW_HEIGHT + 80): void {
    for (const p of this.platforms) {
      if (!p.revealed) continue;
      const isFallingDropTile =
        p.def.kind === 'fake_drop' &&
        p.dropState === 'dropped' &&
        p.y < p.def.y + (p.def.dropDistance ?? 220) - 6;
      if (
        !p.active &&
        !isFallingDropTile &&
        p.def.kind !== 'crumble' &&
        p.def.kind !== 'invisible' &&
        p.def.kind !== 'shrink' &&
        p.def.kind !== 'phase_blink' &&
        p.def.kind !== 'look_away'
      ) {
        continue;
      }

      const visualH = this.getVisualPlatformHeight(p);

      const isFinale100 = this.isFinale100Theme();
      const ghostStroke = isFinale100 ? 'rgba(245, 243, 238, 0.34)' : 'rgba(17, 17, 17, 0.24)';

      if (p.def.kind === 'look_away' && !p.active) {
        // Disappeared while player looked away — subtle dashed eye ghost
        ctx.save();
        ctx.strokeStyle = ghostStroke;
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1.6;
        ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, visualH - 2);
        const cx = p.x + p.w / 2;
        const cy = p.y + visualH / 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy);
        ctx.lineTo(cx + 7, cy);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (p.def.kind === 'phase_blink' && !p.active) {
        // Fair ghost outline + refill progress bar so disappearing path timing is crisp & readable
        ctx.save();
        ctx.strokeStyle = ghostStroke;
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1.6;
        ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, visualH - 2);
        const fillW = Math.max(0, (p.w - 6) * p.blinkOffProgress);
        ctx.fillStyle = isFinale100 ? 'rgba(239, 68, 68, 0.55)' : 'rgba(220, 38, 38, 0.28)';
        ctx.fillRect(p.x + 3, p.y + visualH - 4, fillW, 2.5);
        ctx.restore();
        continue;
      }

      if ((p.def.kind === 'crumble' && p.crumbleState === 'gone') || (p.def.kind === 'shrink' && !p.active)) {
        // Faint dashed ghost showing where platform will respawn
        const ghostH = p.def.h <= 44 ? p.def.h + 8 : p.def.h;
        ctx.save();
        ctx.strokeStyle = isFinale100 ? 'rgba(245, 243, 238, 0.24)' : 'rgba(17, 17, 17, 0.18)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.def.x + 1, p.def.y + 1, p.def.w - 2, ghostH - 2);
        ctx.restore();
        continue;
      }

      const popRise = p.revealAnim < 1 ? (1 - p.revealAnim) * (1 - p.revealAnim) * 26 : 0;

      if (p.def.kind === 'invisible') {
        const pulse = (isFinale100 ? 0.24 : 0.14) + 0.12 * Math.sin(this.worldTime * 3.2 + p.x * 0.02);
        const alpha = Math.max(pulse, p.touchGlow * 0.85) * p.revealAnim;
        ctx.save();
        ctx.strokeStyle = isFinale100
          ? `rgba(245, 243, 238, ${alpha.toFixed(2)})`
          : `rgba(17, 17, 17, ${alpha.toFixed(2)})`;
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x + 1, p.y + popRise + 1, p.w - 2, visualH - 2);
        if (p.touchGlow > 0.05) {
          ctx.fillStyle = isFinale100
            ? `rgba(220, 38, 38, ${(p.touchGlow * 0.22).toFixed(2)})`
            : `rgba(17, 17, 17, ${(p.touchGlow * 0.14).toFixed(2)})`;
          ctx.fillRect(p.x, p.y + popRise, p.w, visualH);
        }
        ctx.restore();
        continue;
      }

      if (p.def.kind === 'phantom_solid' && p.phantomRevealed) {
        ctx.save();
        ctx.fillStyle = isFinale100 ? 'rgba(220, 38, 38, 0.14)' : 'rgba(17, 17, 17, 0.12)';
        ctx.fillRect(p.x, p.y + popRise, p.w, visualH);
        ctx.strokeStyle = isFinale100 ? 'rgba(245, 243, 238, 0.42)' : 'rgba(17, 17, 17, 0.35)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1.6;
        ctx.strokeRect(p.x + 1, p.y + popRise + 1, p.w - 2, visualH - 2);
        ctx.restore();
        continue;
      }

      // In high-intensity darkness levels, deceptive/unexpected dynamic platforms only appear on close proximity
      const isUnexpectedPlatform =
        p.def.kind !== 'solid' && p.def.kind !== 'ice' && p.def.kind !== 'reveal_wall';
      const darkProxAlpha =
        this.level.spotlightRadius && isUnexpectedPlatform
          ? this.getObstacleProximityAlpha(p.x, p.y, p.w, p.h, 1.14)
          : 1;
      if (darkProxAlpha <= 0.01) {
        continue;
      }

      ctx.save();
      const baseAlpha = p.revealAnim < 1 ? Math.max(0.15, p.revealAnim) : 1;
      if (baseAlpha * darkProxAlpha < 0.999) {
        ctx.globalAlpha = baseAlpha * darkProxAlpha;
      }

      let ox = 0;
      let oy = popRise;
      if (
        (p.def.kind === 'crumble' && p.crumbleState === 'shaking') ||
        (p.def.kind === 'fake_drop' && p.dropState === 'shaking') ||
        (p.def.kind === 'shrink' && p.shrinkActive) ||
        (p.def.kind === 'fake_unstable' && p.fakeUnstableTimer > 0)
      ) {
        const amp = p.def.kind === 'fake_unstable' ? 3.8 : 3;
        ox = (Math.random() * 2 - 1) * amp;
        oy += (Math.random() * 2 - 1) * 2.2;
      }

      // Draw moving platform track first
      if (p.def.kind === 'moving') {
        ctx.save();
        ctx.strokeStyle = isFinale100 ? 'rgba(220, 38, 38, 0.34)' : 'rgba(17, 17, 17, 0.16)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.def.x - (p.def.moveX ?? 0) + p.w / 2, p.def.y - (p.def.moveY ?? 0) + visualH / 2);
        ctx.lineTo(p.def.x + (p.def.moveX ?? 0) + p.w / 2, p.def.y + (p.def.moveY ?? 0) + visualH / 2);
        ctx.stroke();
        ctx.restore();
      }

      if (p.def.kind === 'bounce') {
        ctx.fillStyle = isFinale100 ? '#050507' : '#111111';
        ctx.fillRect(p.x, p.y + oy + 8, p.w, visualH - 8);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(p.x + 3, p.y + oy, p.w - 6, 8);
        ctx.restore();
        continue;
      }

      const isDarkPlat = Boolean(this.level.spotlightRadius);
      const isGroundSlab =
        p.def.h >= 60 &&
        p.def.kind !== 'moving' &&
        p.def.kind !== 'crumble' &&
        p.def.kind !== 'shrink' &&
        p.def.kind !== 'phase_blink' &&
        !(p.def.kind === 'fake_drop' && p.dropState === 'dropped');

      // Slight horizontal bleed on stationary ground slab edges prevents anti-aliased sub-pixel
      // vertical white cracks between adjacent matte-black floor tiles at fractional camera scroll.
      let padLeft = 0;
      let padRight = 0;
      if (isGroundSlab) {
        if (p.def.kind === 'pit_stretch' && p.stretchActive) {
          if ((p.def.stretchEdge ?? 'left') === 'left') {
            padRight = 0.6;
          } else {
            padLeft = 0.6;
          }
        } else {
          padLeft = 0.6;
          padRight = 0.6;
        }
      }

      // Crisp architectural shadow behind elevated platforms (skip on ground slabs so shadows never cast seams across floors)
      if (!isGroundSlab) {
        ctx.fillStyle = isDarkPlat
          ? 'rgba(0, 0, 0, 0.45)'
          : isFinale100
            ? 'rgba(220, 38, 38, 0.22)'
            : 'rgba(17, 17, 17, 0.11)';
        ctx.fillRect(p.x + ox + 4, p.y + oy + 4, p.w, visualH);
      }

      // Visually hide any extended runaway-door floor beyond the exit until the door actually flees
      let renderedW = p.w;
      for (const gate of this.runawaySurpriseGates) {
        if (
          gate.hostPlatId === p.def.id &&
          (!gate.requiredParentTrigger || this.revealedTriggers.has(gate.requiredParentTrigger)) &&
          !this.revealedTriggers.has(gate.triggerId)
        ) {
          renderedW = Math.min(renderedW, Math.max(40, gate.lockMaxX - p.x));
        }
      }

      // Extend bottom-anchored ground slabs seamlessly past the bottom of the uplifted viewport
      const extendsToBottom =
        isGroundSlab && p.def.y + p.def.h >= this.level.worldHeight - 20;
      const renderedH = extendsToBottom
        ? Math.max(visualH, Math.ceil(bottomWorldY + 60 - (p.y + oy)))
        : visualH;

      // Pure matte black ink platform (obsidian pitch-black on Level 100, dark slate in Lights-Out mode)
      ctx.fillStyle = isDarkPlat ? '#1C1C22' : isFinale100 ? '#050507' : '#111111';
      ctx.fillRect(p.x + ox - padLeft, p.y + oy, renderedW + padLeft + padRight, renderedH);

      // Subtle crimson contour on elevated floating blocks ONLY in Level 100 (ground floors remain 100% pure solid black)
      if (isFinale100 && !isGroundSlab) {
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(p.x + ox + 0.6, p.y + oy + 0.6, renderedW - 1.2, visualH - 1.2);
      }

      // Subtle walkable-edge hairline ONLY in Lights-Out darkness levels (floors stay pure solid black)
      if (isDarkPlat) {
        ctx.fillStyle = 'rgba(245, 243, 238, 0.34)';
        ctx.fillRect(p.x + ox, p.y + oy, renderedW, 1.5);
      }

      // Surface details per platform mechanic
      if (p.def.kind === 'ice') {
        // Glossy pale-cyan editorial ink glaze signifying slippery ice
        ctx.fillStyle = '#DCEFF2';
        ctx.fillRect(p.x + ox, p.y + oy, p.w, 6);
        ctx.strokeStyle = 'rgba(17, 17, 17, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let ix = p.x + 14; ix < p.x + p.w - 10; ix += 28) {
          ctx.moveTo(ix, p.y + oy + 1);
          ctx.lineTo(ix - 6, p.y + oy + 6);
        }
        ctx.stroke();
      } else if (p.def.kind === 'conveyor' && p.conveyorRevealed) {
        // Animated directional chevron belt along top strip
        const dir = Math.sign(p.def.conveyorSpeed ?? 120) || 1;
        const spacing = 22;
        const shift = ((this.worldTime * Math.abs(p.def.conveyorSpeed ?? 120) * 0.45) % spacing) * dir;
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let cx = p.x - spacing; cx < p.x + p.w + spacing; cx += spacing) {
          const px = cx + shift;
          if (px < p.x + 6 || px > p.x + p.w - 6) continue;
          ctx.moveTo(px - dir * 4, p.y + oy + 3);
          ctx.lineTo(px + dir * 2, p.y + oy + 7);
          ctx.lineTo(px - dir * 4, p.y + oy + 11);
        }
        ctx.stroke();
      } else if (p.def.kind === 'shrink') {
        ctx.strokeStyle = p.shrinkActive ? '#DC2626' : '#F5F3EE';
        ctx.lineWidth = 1.6;
        const cy = p.y + oy + Math.min(13, visualH / 2);
        if (p.w > 24) {
          ctx.beginPath();
          ctx.moveTo(p.x + ox + 8, cy - 4);
          ctx.lineTo(p.x + ox + 13, cy);
          ctx.lineTo(p.x + ox + 8, cy + 4);
          ctx.moveTo(p.x + ox + p.w - 8, cy - 4);
          ctx.lineTo(p.x + ox + p.w - 13, cy);
          ctx.lineTo(p.x + ox + p.w - 8, cy + 4);
          ctx.stroke();
        }
      } else if (p.def.kind === 'elevator') {
        const up = (p.def.moveY ?? -150) < 0;
        const cx = p.x + ox + p.w / 2;
        const cy = p.y + oy + visualH / 2;
        ctx.strokeStyle = p.elevatorActive ? '#DC2626' : '#F5F3EE';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy + (up ? 3 : -3));
        ctx.lineTo(cx, cy + (up ? -3 : 3));
        ctx.lineTo(cx + 6, cy + (up ? 3 : -3));
        ctx.stroke();
      } else if (p.def.kind === 'phase_blink') {
        // Phase-blink timing ticks — pulses crimson right before vanishing
        const blinkPulse = p.blinkWarning && Math.floor(this.worldTime * 18) % 2 === 0;
        ctx.fillStyle = blinkPulse ? '#DC2626' : '#F5F3EE';
        const dotCount = Math.max(2, Math.floor(p.w / 26));
        for (let i = 0; i < dotCount; i++) {
          const dx = p.x + ox + ((i + 0.5) / dotCount) * p.w;
          ctx.fillRect(dx - 3, p.y + oy + visualH / 2 - 1.5, 6, 3);
        }
        if (p.blinkWarning) {
          ctx.strokeStyle = '#DC2626';
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x + ox + 1, p.y + oy + 1, p.w - 2, visualH - 2);
        }
      } else if (p.def.kind === 'crumble') {
        ctx.strokeStyle = '#F5F3EE';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(p.x + ox + p.w * 0.25, p.y + oy);
        ctx.lineTo(p.x + ox + p.w * 0.32, p.y + oy + visualH * 0.55);
        ctx.lineTo(p.x + ox + p.w * 0.22, p.y + oy + visualH);
        ctx.moveTo(p.x + ox + p.w * 0.68, p.y + oy);
        ctx.lineTo(p.x + ox + p.w * 0.62, p.y + oy + visualH * 0.6);
        ctx.lineTo(p.x + ox + p.w * 0.74, p.y + oy + visualH);
        ctx.stroke();
      } else if (
        p.def.kind === 'fake_drop' &&
        p.def.triggerOnLandingOnly &&
        p.dropState === 'dropped'
      ) {
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
      } else if (p.def.kind === 'fake_unstable') {
        // Bluff cracks & warning red hairline — looks terrified, never breaks!
        ctx.strokeStyle = p.fakeUnstableTimer > 0 ? '#DC2626' : '#F5F3EE';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(p.x + ox + p.w * 0.22, p.y + oy);
        ctx.lineTo(p.x + ox + p.w * 0.34, p.y + oy + visualH * 0.55);
        ctx.lineTo(p.x + ox + p.w * 0.2, p.y + oy + visualH);
        ctx.moveTo(p.x + ox + p.w * 0.72, p.y + oy);
        ctx.lineTo(p.x + ox + p.w * 0.62, p.y + oy + visualH * 0.6);
        ctx.lineTo(p.x + ox + p.w * 0.78, p.y + oy + visualH);
        ctx.stroke();
      } else if (p.def.kind === 'look_away') {
        // Minimalist watching-eye glyph (stays solid only while player faces it!)
        const cx = p.x + ox + p.w / 2;
        const cy = p.y + oy + visualH / 2;
        ctx.strokeStyle = '#F5F3EE';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 8, 4.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.def.kind === 'follow_player') {
        const cx = p.x + ox + p.w / 2;
        const cy = p.y + oy + visualH / 2;
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy);
        ctx.lineTo(cx - 5, cy - 3);
        ctx.moveTo(cx - 10, cy);
        ctx.lineTo(cx - 5, cy + 3);
        ctx.moveTo(cx + 10, cy);
        ctx.lineTo(cx + 5, cy - 3);
        ctx.moveTo(cx + 10, cy);
        ctx.lineTo(cx + 5, cy + 3);
        ctx.stroke();
      } else if (p.def.kind === 'moving') {
        ctx.fillStyle = p.def.moveOnStand && !p.moveActivated ? '#DC2626' : '#F5F3EE';
        ctx.fillRect(p.x + p.w / 2 - 12, p.y + oy + visualH / 2 - 2, 24, 4);
      } else if (p.def.kind === 'reveal_wall') {
        ctx.strokeStyle = 'rgba(245, 243, 238, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x + 6, p.y + oy + 8, p.w - 12, visualH - 16);
      }

      ctx.restore();
    }
  }

  private drawHazards(ctx: CanvasRenderingContext2D): void {
    const isDarkLevel = Boolean(this.level.spotlightRadius);
    for (const h of this.hazards) {
      if (!h.active || !h.revealed) continue;

      const proxAlpha = isDarkLevel
        ? this.getObstacleProximityAlpha(h.x, h.y, h.w, h.h, 1.0)
        : 1;
      if (proxAlpha <= 0.01) continue;

      ctx.save();
      if (proxAlpha < 0.999) {
        ctx.globalAlpha = proxAlpha;
      }

      if (
        h.def.kind === 'spike' ||
        h.def.kind === 'popup_spike' ||
        h.def.kind === 'sliding_spike' ||
        h.def.kind === 'retract_spike'
      ) {
        if (h.def.kind === 'popup_spike') {
          if (h.popupExtend <= 0.02) {
            ctx.restore();
            continue;
          }
        }
        if (h.def.kind === 'retract_spike' && h.popupExtend <= 0.02) {
          ctx.restore();
          continue;
        }

        const dir = h.def.dir ?? 'up';
        const spikeCount = Math.max(1, Math.round(h.w / 18));
        const sw = h.w / spikeCount;
        const isExt = h.def.kind === 'popup_spike' || h.def.kind === 'retract_spike';
        const sh = isExt ? h.h * h.popupExtend : h.h;

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
      } else if (h.def.kind === 'saw' || h.def.kind === 'sweeper' || h.def.kind === 'chaser') {
        if (h.def.kind !== 'chaser' && !isDarkLevel) {
          ctx.save();
          ctx.strokeStyle = 'rgba(220, 38, 38, 0.2)';
          ctx.setLineDash([4, 5]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(h.def.x - (h.def.moveX ?? 0) + h.w / 2, h.def.y - (h.def.moveY ?? 0) + h.h / 2);
          ctx.lineTo(h.def.x + (h.def.moveX ?? 0) + h.w / 2, h.def.y + (h.def.moveY ?? 0) + h.h / 2);
          ctx.stroke();
          ctx.restore();
        }

        const cx = h.x + h.w / 2;
        const cy = h.y + h.h / 2;
        const r = h.w / 2;
        const teeth = h.def.kind === 'chaser' ? 12 : h.def.kind === 'saw' ? 10 : 6;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(h.angle);
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        for (let i = 0; i < teeth * 2; i++) {
          const a = (i * Math.PI) / teeth;
          const rad = i % 2 === 0 ? r : r * 0.72;
          const vx = Math.cos(a) * rad;
          const vy = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F5F3EE';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (h.def.kind === 'falling_block') {
        const shake = h.fallState === 'shaking' ? (Math.random() * 2 - 1) * 3.5 : 0;
        ctx.save();
        ctx.fillStyle = '#111111';
        ctx.fillRect(h.x + shake, h.y, h.w, h.h);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(h.x + shake + 3, h.y + h.h - 7, h.w - 6, 7);
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

      ctx.restore();
    }
  }

  private drawCheckpoints(ctx: CanvasRenderingContext2D): void {
    const isDark = Boolean(this.level.spotlightRadius) || this.isFinale100Theme();
    const poleInk = isDark ? '#D6D3D1' : '#111111';
    for (const cp of this.checkpoints) {
      if (!cp.revealed) continue;
      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate(cp.tiltAngle);

      // Pole
      ctx.strokeStyle = poleInk;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -52);
      ctx.stroke();

      // Base cap
      ctx.fillStyle = poleInk;
      ctx.fillRect(-7, -4, 14, 4);

      // Flag pennant
      const wave = Math.sin(this.worldTime * 5 + cp.x) * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(28, -41 + wave);
      ctx.lineTo(0, -31);
      ctx.closePath();

      if (cp.activated) {
        ctx.fillStyle = isDark ? '#DC2626' : '#111111';
        ctx.fill();
        ctx.fillStyle = '#F5F3EE';
        ctx.beginPath();
        ctx.arc(10, -40.5 + wave * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = isDark ? '#27272E' : '#F5F3EE';
        ctx.fill();
        ctx.strokeStyle = poleInk;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // If fake checkpoint running away, draw tiny stick legs!
      if (cp.def.fake && cp.fakeTriggered && cp.def.fakeBehavior === 'run_away') {
        const swing = Math.sin(this.worldTime * 22) * 8;
        ctx.strokeStyle = poleInk;
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
    const isDark = Boolean(this.level.spotlightRadius);
    const isFinale100 = this.isFinale100Theme();
    for (const ex of this.exits) {
      if (!ex.revealed || ex.vanished) continue;
      const doorW = 46;
      const doorH = 68;
      const popRise = ex.revealAnim < 1 ? (1 - ex.revealAnim) * (1 - ex.revealAnim) * 22 : 0;
      const dx = ex.x - doorW / 2;
      const dy = ex.y - doorH + popRise;
      const isGildedFinal = isFinale100 && !ex.def.fake;

      ctx.save();
      if (ex.revealAnim < 1) {
        ctx.globalAlpha = Math.max(0.2, ex.revealAnim);
      }

      // Pulsing golden aura behind the true Level 100 finale gate
      if (isGildedFinal && !ex.becameWall) {
        const pulse = 0.5 + 0.5 * Math.sin(this.worldTime * 4.2);
        const halo = ctx.createRadialGradient(
          ex.x,
          dy + doorH * 0.5,
          10,
          ex.x,
          dy + doorH * 0.5,
          56 + pulse * 14,
        );
        halo.addColorStop(0, `rgba(234, 179, 8, ${0.32 + pulse * 0.14})`);
        halo.addColorStop(0.55, `rgba(220, 38, 38, ${0.14 + pulse * 0.06})`);
        halo.addColorStop(1, 'rgba(234, 179, 8, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(ex.x - 74, dy - 38, 148, doorH + 76);
      }

      // Running legs if moving or retreating!
      const isRetreating = Boolean(
        ex.def.retreatSpeed && ex.def.retreatMaxX !== undefined && ex.x < ex.def.retreatMaxX && ex.legCycle > 0,
      );
      if (ex.moving || isRetreating) {
        const swing = Math.sin(ex.legCycle) * 10;
        ctx.strokeStyle = isGildedFinal ? '#EAB308' : isFinale100 ? '#F5F3EE' : isDark ? '#D6D3D1' : '#111111';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex.x - 10, ex.y - 2);
        ctx.lineTo(ex.x - 10 + swing, ex.y + 10);
        ctx.moveTo(ex.x + 10, ex.y - 2);
        ctx.lineTo(ex.x + 10 - swing, ex.y + 10);
        ctx.stroke();
      }

      const isBustedFake = ex.fakeTriggered && !ex.elevatedReal;
      const isTimedLocked = Boolean(
        !isBustedFake && !ex.becameWall && ex.def.lockedUntilSeconds && this.levelTime < ex.def.lockedUntilSeconds,
      );

      if (ex.becameWall) {
        // Doorway betrayed the player and bricked itself into a solid wall!
        ctx.fillStyle = isFinale100 ? '#09090B' : '#111111';
        ctx.fillRect(dx, dy, doorW, doorH);
        ctx.strokeStyle = isFinale100 ? '#DC2626' : '#F5F3EE';
        ctx.lineWidth = 1.4;
        if (isFinale100) {
          ctx.strokeRect(dx + 0.75, dy + 0.75, doorW - 1.5, doorH - 1.5);
        }
        for (let row = 0; row < 4; row++) {
          const ry = dy + 14 + row * 14;
          ctx.beginPath();
          ctx.moveTo(dx + 3, ry);
          ctx.lineTo(dx + doorW - 3, ry);
          ctx.stroke();
        }
        ctx.fillStyle = '#DC2626';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WALL', ex.x, dy - 7);
      } else {
        // Doorway frame
        ctx.fillStyle = isBustedFake
          ? isFinale100
            ? '#272022'
            : '#D6D1C7'
          : isFinale100
            ? '#09090B'
            : isDark
              ? '#2F2F38'
              : '#111111';
        ctx.fillRect(dx, dy, doorW, doorH);
        if (isGildedFinal && !isBustedFake) {
          ctx.strokeStyle = '#EAB308';
          ctx.lineWidth = 2;
          ctx.strokeRect(dx + 1, dy + 1, doorW - 2, doorH - 2);
        } else if (isFinale100 && !isBustedFake) {
          ctx.strokeStyle = 'rgba(220, 38, 38, 0.72)';
          ctx.lineWidth = 1.6;
          ctx.strokeRect(dx + 0.8, dy + 0.8, doorW - 1.6, doorH - 1.6);
        } else if (isDark && !isBustedFake) {
          ctx.strokeStyle = 'rgba(245, 243, 238, 0.42)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(dx + 0.75, dy + 0.75, doorW - 1.5, doorH - 1.5);
        }

        // Inner doorway recess
        ctx.fillStyle = isBustedFake
          ? isFinale100
            ? '#1A1617'
            : '#F5F3EE'
          : isGildedFinal
            ? '#1C1608'
            : isFinale100
              ? '#181416'
              : isDark
                ? '#121217'
                : '#262626';
        ctx.fillRect(dx + 5, dy + 5, doorW - 10, doorH - 5);

        // Door handle or lock bars
        if (isTimedLocked) {
          ctx.strokeStyle = '#DC2626';
          ctx.lineWidth = 2.6;
          for (let bar = 1; bar <= 3; bar++) {
            const bx = dx + (doorW / 4) * bar;
            ctx.beginPath();
            ctx.moveTo(bx, dy + 6);
            ctx.lineTo(bx, dy + doorH - 2);
            ctx.stroke();
          }
        } else if (!isBustedFake) {
          ctx.fillStyle = isGildedFinal ? '#EAB308' : '#F5F3EE';
          ctx.beginPath();
          ctx.arc(dx + doorW - 12, dy + doorH * 0.56, isGildedFinal ? 3.8 : 3.2, 0, Math.PI * 2);
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

        // Crisp EXIT / FINAL EXIT / LOCKED countdown plaque above door
        const remLock = ex.def.lockedUntilSeconds ? Math.max(0, ex.def.lockedUntilSeconds - this.levelTime) : 0;
        ctx.fillStyle = isTimedLocked
          ? '#DC2626'
          : isGildedFinal && !isBustedFake
            ? '#EAB308'
            : isFinale100
              ? '#F5F3EE'
              : isDark
                ? '#D6D3D1'
                : '#111111';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          isBustedFake
            ? 'NOPE'
            : isTimedLocked
              ? `LOCK ${remLock.toFixed(1)}s`
              : isGildedFinal
                ? 'FINAL EXIT'
                : 'EXIT',
          ex.x,
          dy - 7,
        );
      }

      // Cheeky speech bubble when moving exit scoots
      if (ex.quipText) {
        this.drawSpeechBubble(ctx, ex.x, dy - 22, ex.quipText, false, ex.quipAge);
      }

      ctx.restore();
    }
  }

  private drawSigns(ctx: CanvasRenderingContext2D): void {
    for (const s of this.signs) {
      if (!s.revealed) continue;
      const label = s.flipped && s.def.flippedText ? s.def.flippedText : s.def.text;
      ctx.save();
      ctx.font = '600 12px "DM Sans", sans-serif';
      const textW = ctx.measureText(label).width;
      const boardW = Math.max(66, textW + 22);
      const boardH = 28;
      const bx = s.def.x - boardW / 2;
      const by = s.def.y - 54;

      const isFinale100 = this.isFinale100Theme();

      // Wooden ink post
      ctx.fillStyle = isFinale100 ? '#DC2626' : '#111111';
      ctx.fillRect(s.def.x - 2, by + boardH, 4, 26);

      // Signboard
      ctx.fillStyle = isFinale100 ? '#0E0B0C' : '#FFFFFF';
      ctx.strokeStyle = isFinale100 ? '#DC2626' : '#111111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, boardW, boardH, 4);
      ctx.fill();
      ctx.stroke();

      // Label text
      ctx.fillStyle = isFinale100 ? '#F5F3EE' : '#111111';
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

    // STRICT RULE: Levels 1–50 hints are gated behind Rewarded Ad HUD prompts,
    // and Levels 51–100 have ZERO hints, ZERO automatic clues, and ZERO world-space prompts.
    return;
  }

  private drawRewards(ctx: CanvasRenderingContext2D): void {
    const isDarkLevel = Boolean(this.level.spotlightRadius);
    for (const r of this.rewards) {
      if (r.collected || !r.revealed) continue;
      const proxAlpha = isDarkLevel
        ? this.getObstacleProximityAlpha(r.def.x - 14, r.def.y - 14, 28, 28, 1.1)
        : 1;
      if (proxAlpha <= 0.01) continue;

      const bob = Math.sin(r.bobPhase) * 4.5;
      const rx = r.def.x;
      const ry = r.def.y + bob;

      ctx.save();
      if (proxAlpha < 0.999) {
        ctx.globalAlpha = proxAlpha;
      }
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

  private drawSwitches(ctx: CanvasRenderingContext2D): void {
    for (const sw of this.switches) {
      if (!sw.revealed) continue;
      const w = sw.def.w ?? 38;
      const baseH = 5;
      const capH = Math.max(2, Math.round(7 * (1 - sw.pressAnim * 0.72)));
      const x = sw.def.x;
      const y = sw.def.y;

      const isCeilingMounted =
        y < 210 &&
        this.platforms.some(
          (p) =>
            p.active &&
            x + w > p.x - 10 &&
            x < p.x + p.w + 10 &&
            p.y + p.h <= y + 4 &&
            p.y + p.h >= y - 20,
        );

      ctx.save();
      if (sw.revealAnim < 1) {
        ctx.globalAlpha = Math.max(0.2, sw.revealAnim);
      }

      if (isCeilingMounted) {
        // Base plate bolted to the underside of the ceiling, cap protruding downward
        ctx.fillStyle = '#111111';
        ctx.fillRect(x, y - baseH, w, baseH);

        ctx.fillStyle = sw.pressed ? '#57534E' : '#DC2626';
        ctx.fillRect(x + 4, y, w - 8, capH);

        if (!sw.pressed) {
          ctx.fillStyle = 'rgba(245, 243, 238, 0.45)';
          ctx.fillRect(x + 6, y + capH - 2.5, w - 12, 1.5);
        }

        if (sw.def.label && !sw.pressed) {
          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.fillStyle = this.isFinale100Theme() ? '#F5F3EE' : '#57534E';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(sw.def.label, x + w / 2, y + capH + 4);
        }
      } else {
        // Base plate bolted to the floor
        ctx.fillStyle = '#111111';
        ctx.fillRect(x, y - baseH, w, baseH);

        // Pressure cap (crimson unpressed, flat charcoal once clicked)
        ctx.fillStyle = sw.pressed ? '#57534E' : '#DC2626';
        ctx.fillRect(x + 4, y - baseH - capH, w - 8, capH);

        // Subtle architectural highlight on cap
        if (!sw.pressed) {
          ctx.fillStyle = 'rgba(245, 243, 238, 0.45)';
          ctx.fillRect(x + 6, y - baseH - capH + 1, w - 12, 1.5);
        }

        // Optional micro-label above switch
        if (sw.def.label && !sw.pressed) {
          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.fillStyle = this.isFinale100Theme() ? '#F5F3EE' : '#57534E';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(sw.def.label, x + w / 2, y - baseH - capH - 4);
        }
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
    const activeGrav = this.dynamicGravityScale ?? this.level.gravityScale ?? 1;
    const isInvertedGrav = activeGrav < 0;
    const anchorY = isInvertedGrav ? this.py : this.py + PLAYER_H;

    ctx.save();
    ctx.translate(cx, anchorY);
    if (isInvertedGrav) {
      ctx.scale(1, -1);
    }
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
    const isJumping = !this.onGround && (isInvertedGrav ? this.vy > 0 : this.vy < 0);
    const isFalling = !this.onGround && (isInvertedGrav ? this.vy <= 0 : this.vy >= 0);

    // Slight forward lean while running
    const lean = isRunning ? (this.vx / BASE_MOVE_SPEED) * 0.14 : 0;
    ctx.rotate(lean);

    const isDark = Boolean(this.level.spotlightRadius) || this.isFinale100Theme();
    const inkStroke = isDark ? '#F5F3EE' : '#111111';
    const headFill = isDark ? '#141418' : '#FFFFFF';

    ctx.strokeStyle = inkStroke;
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
      ctx.fillStyle = isDark ? 'rgba(245, 243, 238, 0.14)' : 'rgba(17, 17, 17, 0.16)';
      ctx.beginPath();
      ctx.ellipse(0, 1, 10, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Round Stickman Head
    ctx.fillStyle = headFill;
    ctx.strokeStyle = inkStroke;
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
      ctx.strokeStyle = inkStroke;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(eyeOffsetX - 4.2, eyeY);
      ctx.lineTo(eyeOffsetX - 1.2, eyeY);
      ctx.moveTo(eyeOffsetX + 1.2, eyeY);
      ctx.lineTo(eyeOffsetX + 4.2, eyeY);
      ctx.stroke();
    } else {
      const eyeR = isFalling ? 2.1 : 1.6;
      ctx.fillStyle = inkStroke;
      ctx.beginPath();
      ctx.arc(eyeOffsetX - 2.8, eyeY, eyeR, 0, Math.PI * 2);
      ctx.arc(eyeOffsetX + 2.8, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Annoyed / menacing eyebrows (already mean from Level 1!)
      if (this.lookingAtPlayer || isInsulting || this.levelDeaths >= 1 || this.level.id >= 1) {
        const isCruelEndgame = this.level.id >= 71;
        ctx.strokeStyle = isCruelEndgame && isInsulting ? '#DC2626' : inkStroke;
        ctx.lineWidth = isCruelEndgame ? 1.85 : 1.6;
        const browTilt = this.level.id >= 51 ? 2.2 : 1.7;
        ctx.beginPath();
        ctx.moveTo(eyeOffsetX - 5.4, eyeY - 3.9 - (browTilt - 1.6) * 0.4);
        ctx.lineTo(eyeOffsetX - 1.0, eyeY - 2.3 + (browTilt - 1.6) * 0.4);
        ctx.moveTo(eyeOffsetX + 1.0, eyeY - 2.3 + (browTilt - 1.6) * 0.4);
        ctx.lineTo(eyeOffsetX + 5.4, eyeY - 3.9 - (browTilt - 1.6) * 0.4);
        ctx.stroke();
      }
    }

    // Expressive mouth (shocked O when falling fast, sarcastic smirk when roasting!)
    if (isFalling && this.vy > 320) {
      ctx.fillStyle = inkStroke;
      ctx.beginPath();
      ctx.arc(eyeOffsetX, headY + 3.8, 2.0, 0, Math.PI * 2);
      ctx.fill();
    } else if (isInsulting || this.lookingAtPlayer) {
      ctx.strokeStyle = inkStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(eyeOffsetX - 3.0, headY + 3.8);
      ctx.quadraticCurveTo(eyeOffsetX + 0.5, headY + 4.4, eyeOffsetX + 3.4, headY + 2.6);
      ctx.stroke();
    }

    ctx.restore();

    // Fourth-wall insult speech bubble above stickman
    if (this.fourthWallBubble) {
      this.drawSpeechBubble(
        ctx,
        cx,
        this.py - 16,
        this.fourthWallBubble,
        true,
        this.fourthWallBubbleAge,
      );
    }
  }

  private drawSpeechBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    isInsult = false,
    ageSec = 1,
  ): void {
    const tier = getCrueltyTier(this.level.id);
    const isCruelDarkBubble = isInsult && tier >= 4;

    ctx.save();
    ctx.font = '700 11.5px "DM Sans", sans-serif';
    const w = Math.max(54, ctx.measureText(text).width + 22);
    const h = 26;
    // Keep bubble inside visible camera horizontally so roasts never clip off-screen!
    const clampedX = Math.max(this.camX + w / 2 + 12, Math.min(this.camX + VIEW_WIDTH - w / 2 - 12, x));
    const bx = clampedX - w / 2;
    const by = Math.max(64, y - h);
    const tailX = Math.max(bx + 10, Math.min(bx + w - 10, x));

    // Subtle attention-grabbing pulse + damped mocking shake upon appearance
    let scale = 1;
    let shakeX = 0;
    let shakeY = 0;
    let tiltRad = 0;
    let pulseRingAlpha = 0;
    let pulseRingExpand = 0;

    if (!this.prefersReducedMotion && ageSec >= 0 && ageSec < 0.65) {
      const popDuration = 0.24;
      if (ageSec < popDuration) {
        const p = ageSec / popDuration;
        // Crisp elastic overshoot (0.86 -> 1.075 -> 1.0)
        scale = 0.86 + 0.14 * p + Math.sin(p * Math.PI) * 0.085;
      } else {
        // Gentle secondary attention pulse (0.24s..0.60s)
        const p2 = Math.min(1, (ageSec - popDuration) / 0.36);
        scale = 1 + Math.sin(p2 * Math.PI) * (isInsult ? 0.042 : 0.028);
      }

      // Damped horizontal micro-shake + slight sarcastic tilt during first 0.48s
      const shakeWindow = 0.48;
      if (ageSec < shakeWindow) {
        const decay = Math.pow(1 - ageSec / shakeWindow, 1.65);
        const amp = isInsult ? 2.8 : 1.9;
        shakeX = Math.sin(ageSec * 44) * amp * decay;
        shakeY = Math.cos(ageSec * 30) * (amp * 0.28) * decay;
        tiltRad = Math.sin(ageSec * 36) * (isInsult ? 0.028 : 0.018) * decay;
      }

      // Subtle expanding crimson highlight pulse on insult bubble entrance
      const ringWindow = 0.46;
      if (isInsult && ageSec < ringWindow) {
        const rp = ageSec / ringWindow;
        pulseRingAlpha = (1 - rp) * 0.48;
        pulseRingExpand = rp * 6.5;
      }
    }

    // Pivot cleanly around the speech tail anchor so the bubble pulses/shakes from the stickman
    const pivotX = tailX;
    const pivotY = by + h;
    if (scale !== 1 || shakeX !== 0 || shakeY !== 0 || tiltRad !== 0) {
      ctx.translate(pivotX + shakeX, pivotY + shakeY);
      if (tiltRad !== 0) ctx.rotate(tiltRad);
      if (scale !== 1) ctx.scale(scale, scale);
      ctx.translate(-pivotX, -pivotY);
    }

    if (pulseRingAlpha > 0.01) {
      ctx.save();
      ctx.strokeStyle = `rgba(220, 38, 38, ${pulseRingAlpha.toFixed(3)})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(
        bx - pulseRingExpand,
        by - pulseRingExpand * 0.7,
        w + pulseRingExpand * 2,
        h + pulseRingExpand * 1.4,
        7 + pulseRingExpand * 0.45,
      );
      ctx.stroke();
      ctx.restore();
    }

    // Offset comic ink shadow (intensifies with cruelty tier)
    ctx.fillStyle = isCruelDarkBubble
      ? 'rgba(220, 38, 38, 0.36)'
      : isInsult
        ? 'rgba(220, 38, 38, 0.22)'
        : 'rgba(17, 17, 17, 0.14)';
    ctx.beginPath();
    ctx.roundRect(bx + 3, by + 3, w, h, 7);
    ctx.fill();

    ctx.fillStyle = isCruelDarkBubble ? '#111111' : '#FFFFFF';
    ctx.strokeStyle = isInsult ? '#DC2626' : '#111111';
    ctx.lineWidth = isCruelDarkBubble ? 2.2 : 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 7);
    ctx.fill();
    ctx.stroke();

    // Pointer tail aimed toward stickman
    ctx.beginPath();
    ctx.moveTo(tailX - 5, by + h - 1);
    ctx.lineTo(tailX, by + h + 6);
    ctx.lineTo(tailX + 5, by + h - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isCruelDarkBubble ? '#F5F3EE' : '#111111';
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
