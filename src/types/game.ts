export type GameScreen = 'TITLE' | 'PLAYING' | 'LEVEL_SELECT';

export type ModalType =
  | 'NONE'
  | 'PAUSE'
  | 'DEATH'
  | 'SETTINGS'
  | 'STATS'
  | 'ACHIEVEMENTS'
  | 'LEVEL_COMPLETE'
  | 'GAME_COMPLETE';

export type TouchControlsMode = 'auto' | 'always' | 'hidden';

export interface GameSettings {
  musicVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  muted: boolean;
  vibration: boolean;
  touchControls: TouchControlsMode;
  controlSensitivity: number; // 0.7 to 1.4
  unlockAllLevels: boolean;
}

export interface UsedLevelHint {
  obstacleKey: string;
  sarcasticHint: string;
  clueText: string;
  adaptiveText: string | null;
}

export interface LevelProgress {
  completed: boolean;
  bestTimeMs: number | null;
  deaths: number;
  zeroJumpCompleted: boolean;
  zeroDeathCompleted: boolean;
  usedHint?: UsedLevelHint | null;
}

export interface SaveData {
  version: number;
  currentLevelId: number;
  highestUnlockedLevelId: number;
  totalDeaths: number;
  totalPlaytimeSeconds: number;
  tricksTriggered: number;
  fakeRewardsGrabbed: number;
  fourthWallTriggered: boolean;
  levels: Record<number, LevelProgress>;
  unlockedAchievements: string[];
  settings: GameSettings;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  quip: string;
}

export type PlatformKind =
  | 'solid'
  | 'crumble'
  | 'moving'
  | 'invisible'
  | 'fake_drop'
  | 'reveal_wall'
  | 'bounce'
  | 'conveyor'
  | 'ice'
  | 'shrink'
  | 'phantom_solid'
  | 'proximity_shift'
  | 'elevator'
  | 'phase_blink'
  | 'fake_unstable'
  | 'look_away'
  | 'follow_player';

export interface PlatformDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlatformKind;
  // For moving / elevator platforms
  moveX?: number;
  moveY?: number;
  speed?: number;
  phase?: number;
  /** Moving platform stays frozen until the player first lands on it. */
  moveOnStand?: boolean;
  // For follow_player platforms (tracks or evades player X within bounds)
  followMinX?: number;
  followMaxX?: number;
  followSpeed?: number;
  followMode?: 'match' | 'evade';
  // For crumble platforms
  crumbleDelay?: number; // seconds before vanish (default 0.42)
  respawnDelay?: number; // seconds before return (default 2.6)
  // For fake_drop platforms (drops when player gets close or steps)
  triggerDist?: number;
  dropDistance?: number;
  fakeSeamDecoy?: boolean; // solid platform visually marked with fake_drop seams (never breaks)
  hideSeam?: boolean; // fake_drop disguised as normal solid floor with no seam cue
  triggerOnLandingOnly?: boolean; // fake_drop triggers strictly when player lands on it
  prankMessage?: string; // optional prank banner when triggered
  // For reveal_wall: disappears when a fake_exit or trigger fires
  linkedTriggerId?: string;
  // Zero-spoiler hidden track: completely absent until triggerId fires
  revealOnTriggerId?: string;
  // Optional: vanishes when triggerId fires
  hideOnTriggerId?: string;
  // For conveyor platforms (+ right, - left)
  conveyorSpeed?: number;
  disguised?: boolean;
  // For shrink platforms (pixels/sec removed from total width once stepped on)
  shrinkRate?: number;
  minWidth?: number;
  // For proximity_shift platforms (slides away or rises when player approaches)
  shiftX?: number;
  shiftY?: number;
  shiftSpeed?: number;
  // For bounce pads (custom vertical/horizontal launch velocity)
  bounceVy?: number;
  bounceVx?: number;
  // For phase_blink disappearing paths (cycles solid <-> intangible with visual flicker telegraph)
  blinkOnTime?: number; // seconds solid (default 1.55)
  blinkOffTime?: number; // seconds gone (default 1.05)
  blinkPhase?: number; // initial cycle offset in seconds
  // Optional adaptive tag: only active if adaptive condition met
  adaptiveCondition?: 'jump_spam' | 'rusher' | 'camper' | 'repeat_fail';
  // For invisible platforms: subtle clue style
  clueText?: string;
}

export type SpikeDirection = 'up' | 'down' | 'left' | 'right';

export type HazardKind =
  | 'spike'
  | 'popup_spike'
  | 'saw'
  | 'falling_block'
  | 'sweeper'
  | 'sliding_spike'
  | 'retract_spike'
  | 'chaser';

export interface HazardDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: HazardKind;
  dir?: SpikeDirection;
  // For popup_spike / sliding_spike / retract_spike / chaser
  triggerX?: number;
  triggerRadius?: number;
  telegraphTime?: number; // fair warning before popping fully
  // For sliding_spike
  slideX?: number;
  slideSpeed?: number;
  // For chaser (relentless pursuing saw activated at triggerX)
  chaseSpeed?: number;
  chaseMaxX?: number;
  // For saw / sweeper
  moveX?: number;
  moveY?: number;
  speed?: number;
  phase?: number;
  // For falling_block
  fallTriggerX?: number;
  // Zero-spoiler hidden track visibility
  revealOnTriggerId?: string;
  hideOnTriggerId?: string;
  // Optional adaptive condition
  adaptiveCondition?: 'jump_spam' | 'rusher' | 'camper';
}

export interface CheckpointDef {
  id: string;
  x: number;
  y: number; // ground y where pole sits
  fake?: boolean;
  fakeBehavior?: 'run_away' | 'collapse' | 'fly_up';
  fakeMessage?: string;
  /** Optional trigger fired when a REAL checkpoint is activated (checkpoint ambush/room shift!). */
  triggersId?: string;
  triggerBanner?: string;
  revealOnTriggerId?: string;
  hideOnTriggerId?: string;
}

export interface SignDef {
  id: string;
  x: number;
  y: number; // bottom y
  text: string;
  subtext?: string;
  arrow?: 'left' | 'right' | 'up' | 'down';
  flippedText?: string; // changes text after player passes or dies!
  adaptiveOnly?: 'repeat_fail' | 'jump_spam' | 'rusher';
  revealOnTriggerId?: string;
  hideOnTriggerId?: string;
}

export interface FakeRewardDef {
  id: string;
  x: number;
  y: number;
  kind: 'star' | 'coin' | 'trophy';
  prankMessage: string;
  triggersBounce?: boolean;
  revealOnTriggerId?: string;
  hideOnTriggerId?: string;
}

export interface ExitDef {
  id: string;
  x: number;
  y: number; // ground y where door sits
  fake?: boolean;
  fakeMessage?: string;
  revealsTriggerId?: string;
  // Sudden betrayal behavior when player approaches a fake or treacherous exit
  fakeBehavior?: 'vanish' | 'sprint_away' | 'teleport_shift' | 'become_wall' | 'elevate_trap';
  // Trigger betrayal before player even reaches doorway (default: touch range; e.g. 68px = one step away)
  approachTriggerDist?: number;
  // Destination for teleport_shift, sprint_away, or elevate_trap exits
  shiftTo?: { x: number; y: number };
  // Moving goal waypoints (targets the door scoots to when approached; can also unlock a hidden track!)
  moveTargets?: Array<{ x: number; y: number; quip?: string; revealsTriggerId?: string }>;
  triggerDistance?: number;
  /** Timed survival lock: exit remains sealed until elapsed level time reaches this many seconds. */
  lockedUntilSeconds?: number;
  /** Retreating exit: slides backward away from the player until pinned at retreatMaxX. */
  retreatSpeed?: number;
  retreatMaxX?: number;
  retreatTriggerDist?: number;
  // Zero-spoiler hidden track visibility
  revealOnTriggerId?: string;
  hideOnTriggerId?: string;
}

export interface CameraLockDef {
  triggerId: string;
  maxX: number;
  minX?: number;
}

export interface WindZoneDef {
  minX: number;
  maxX: number;
  forceX: number; // horizontal acceleration (+ right tailwind, - left headwind)
  revealOnTriggerId?: string;
}

export interface ReverseControlZoneDef {
  minX: number;
  maxX: number;
  revealOnTriggerId?: string;
}

export interface SwitchDef {
  id: string;
  x: number;
  y: number; // ground y where pressure plate sits
  w?: number;
  label?: string; // optional cheeky label printed beside plate
  triggersId: string; // triggerId fired when stepped on (reveals/hides platforms, hazards, exits, zones)
  prankMessage?: string;
  betrayal?: boolean; // marks switch as a deceptive/trap switch for trick tracking & mockery
  gravityOverride?: number; // optional mid-level gravity scale change on step (negative = ceiling-is-floor!)
  /** Optional sudden camera framing shift (pixels) without hiding gameplay info. */
  cameraShiftX?: number;
  revealOnTriggerId?: string;
  hideOnTriggerId?: string;
}

export interface ObstacleTutorialHint {
  id: string;
  minX: number;
  maxX: number;
  x: number;
  y: number;
  text: string;
  minDeaths?: number; // deaths required on this specific obstacle before revealing (default: 2)
  causes?: DeathCause[];
}

export interface LevelDef {
  id: number;
  chapter: number;
  chapterTitle: string;
  levelInChapter: number;
  name: string;
  subtitle: string;
  /** Distinct primary task/objective unique to this level. */
  objective?: string;
  worldWidth: number;
  worldHeight: number;
  spawn: { x: number; y: number };
  platforms: PlatformDef[];
  hazards: HazardDef[];
  checkpoints: CheckpointDef[];
  signs: SignDef[];
  fakeRewards: FakeRewardDef[];
  switches?: SwitchDef[];
  exits: ExitDef[];
  // Zero-spoiler camera & world locks until a fake exit triggers a hidden track reveal
  cameraLocks?: CameraLockDef[];
  // Optional per-level physics & psychological world modifiers
  gravityScale?: number;
  windZones?: WindZoneDef[];
  reverseControlZones?: ReverseControlZoneDef[];
  spotlightRadius?: number;
  darknessFlashInterval?: number;
  // Optional subtle per-obstacle tutorial hints (Levels 1-5, revealed only after repeat obstacle deaths)
  tutorialHints?: ObstacleTutorialHint[];
  // Optional hint shown if adaptive detects repeated failures
  adaptiveClue?: {
    x: number;
    y: number;
    text: string;
    arrow?: 'left' | 'right' | 'up' | 'down';
  };
}

export type DeathCause =
  | 'spike'
  | 'popup_spike'
  | 'saw'
  | 'falling_block'
  | 'pit'
  | 'sweeper'
  | 'fake_drop';

export interface DeathCluster {
  x: number;
  y: number;
  count: number;
  recentCount: number;
  radius: number;
  intensity: number; // 0..1 normalized hotspot heat
  dominantCause?: DeathCause;
}

export interface AdaptiveSnapshot {
  playstyleLabel: string;
  jumpSpamDetected: boolean;
  rusherDetected: boolean;
  camperDetected: boolean;
  repeatFailZone: { x: number; y: number; count: number } | null;
  deathClusters: DeathCluster[];
  maxClusterCount: number;
  clusterEscalationTier: 0 | 1 | 2 | 3;
  trapSpeedMultiplier: number;
  trapFrequencyMultiplier: number;
  isEscalationEligibleLevel: boolean;
  activeModifierText: string | null;
}

export interface HudObstacleHintState {
  obstacleKey: string;
  deathsOnObstacle: number;
  isRepeatObstacleFail: boolean;
  obstacleIndex: number;
  clueText: string;
  centerX: number;
}

export interface HudSnapshot {
  levelId: number;
  chapter: number;
  levelInChapter: number;
  levelName: string;
  chapterTitle: string;
  elapsedMs: number;
  levelDeaths: number;
  levelDeathStreak: number;
  deathStreakMilestone: 5 | 10 | 20 | null;
  totalDeaths: number;
  checkpointReached: boolean;
  deathMessage: string | null;
  deathMessageId: number;
  prankBanner: string | null;
  prankBannerId: number;
  adaptiveHint: string | null;
  obstacleHint: HudObstacleHintState | null;
}

export interface LevelCompletePayload {
  levelId: number;
  elapsedMs: number;
  levelDeaths: number;
  jumpsUsed: number;
  tricksTriggeredInLevel: number;
  isNewBestTime: boolean;
  newlyUnlockedAchievements: AchievementDef[];
}

export interface DeathLocationSnapshot {
  levelId: number;
  cause: DeathCause;
  exactX: number;
  exactY: number;
  respawnX: number;
  respawnY: number;
  facing: 1 | -1;
  levelDeaths: number;
  levelDeathStreak: number;
  deathMessage: string;
  streakMilestone: 5 | 10 | 20 | null;
}
