export type GameScreen = 'TITLE' | 'PLAYING' | 'LEVEL_SELECT';

export type ModalType =
  | 'NONE'
  | 'PAUSE'
  | 'DEATH'
  | 'SETTINGS'
  | 'STATS'
  | 'ACHIEVEMENTS'
  | 'LEADERBOARDS'
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

export interface LevelProgress {
  completed: boolean;
  bestTimeMs: number | null;
  deaths: number;
  zeroJumpCompleted: boolean;
  zeroDeathCompleted: boolean;
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
  | 'bounce';

export interface PlatformDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlatformKind;
  // For moving platforms
  moveX?: number;
  moveY?: number;
  speed?: number;
  phase?: number;
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
  // Optional adaptive tag: only active if adaptive condition met
  adaptiveCondition?: 'jump_spam' | 'rusher' | 'camper' | 'repeat_fail';
  // For invisible platforms: subtle clue style
  clueText?: string;
}

export type SpikeDirection = 'up' | 'down' | 'left' | 'right';

export type HazardKind = 'spike' | 'popup_spike' | 'saw' | 'falling_block' | 'sweeper';

export interface HazardDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: HazardKind;
  dir?: SpikeDirection;
  // For popup_spike
  triggerX?: number;
  triggerRadius?: number;
  telegraphTime?: number; // fair warning before popping fully
  // For saw / sweeper
  moveX?: number;
  moveY?: number;
  speed?: number;
  phase?: number;
  // For falling_block
  fallTriggerX?: number;
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
}

export interface FakeRewardDef {
  id: string;
  x: number;
  y: number;
  kind: 'star' | 'coin' | 'trophy';
  prankMessage: string;
  triggersBounce?: boolean;
}

export interface ExitDef {
  id: string;
  x: number;
  y: number; // ground y where door sits
  fake?: boolean;
  fakeMessage?: string;
  revealsTriggerId?: string;
  // Moving goal waypoints (relative or absolute targets the door scoots to when approached)
  moveTargets?: Array<{ x: number; y: number; quip?: string }>;
  triggerDistance?: number;
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
  worldWidth: number;
  worldHeight: number;
  spawn: { x: number; y: number };
  platforms: PlatformDef[];
  hazards: HazardDef[];
  checkpoints: CheckpointDef[];
  signs: SignDef[];
  fakeRewards: FakeRewardDef[];
  exits: ExitDef[];
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
