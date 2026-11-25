import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Grid,
  Heart,
  Home,
  Lightbulb,
  Lock,
  Menu,
  Play,
  RotateCcw,
  Skull,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getDifficultyStage } from '../data/difficultyStages';
import { getPrimaryLevelHint, HINT_SYSTEM_MAX_LEVEL } from '../data/hintClues';
import { getLevelById, LEVELS } from '../data/levels';
import {
  SARCASTIC_HINT_MAX_LEVEL,
  SARCASTIC_HINT_MIN_OBSTACLE_DEATHS,
  SARCASTIC_LEVEL_HINTS,
} from '../data/sarcasticLevelHints';
import { adMobService } from '../engine/adMobService';
import { audioManager } from '../engine/audio';
import { commentaryService } from '../engine/commentaryService';
import {
  PlatformerEngine,
  type DangerVignetteRenderFrame,
  type DarknessRenderFrame,
} from '../engine/gameEngine';
import { formatTimeMs } from '../engine/saveManager';
import { deathTauntService } from '../services/deathTauntService';
import type {
  DeathLocationSnapshot,
  GameSettings,
  HudSnapshot,
  UsedLevelHint,
} from '../types/game';
import { DeathTauntBubble } from './DeathTauntBubble';

interface GameCanvasProps {
  levelId: number;
  settings: GameSettings;
  totalDeathsGlobal: number;
  extraLives: number;
  paused: boolean;
  onPauseToggle: () => void;
  onGoHome: () => void;
  onOpenLevels: () => void;
  onToggleMute: () => void;
  onDeathRecorded: (levelId: number, levelDeaths: number) => void;
  onDeathScreenOpen: (snapshot: DeathLocationSnapshot) => void;
  onTrickTriggered: (kind: 'trap' | 'fake_reward' | 'fourth_wall') => void;
  onLevelComplete: (stats: {
    levelId: number;
    elapsedMs: number;
    levelDeaths: number;
    jumpsUsed: number;
    tricksTriggeredInLevel: number;
  }) => void;
  onHintAdStateChange?: (active: boolean) => void;
  usedLevelHint?: UsedLevelHint | null;
  onHintUnlocked?: (levelId: number, hint: UsedLevelHint) => void;
  restartToken: number;
  deathAction: { id: number; type: 'respawn_exact' | 'restart_after_death' };
}

/** Duration (ms) the Hint button blinks to catch the player's eye when available (10 seconds). */
export const HINT_BUTTON_BLINK_MS = 10000;
/** Hints are strictly available for Levels 1–50 and disabled for all levels > 50. */
export const STRICT_HINT_MAX_LEVEL = Math.min(
  50,
  HINT_SYSTEM_MAX_LEVEL,
  SARCASTIC_HINT_MAX_LEVEL,
);

export interface HintDisplayState {
  /** Strictly true only for Levels 1–50; always false for levels > 50. */
  enabled: boolean;
  /** Whether the player has completed a rewarded ad for this level's hint. */
  hasWatchedRewardAd: boolean;
  /** True only when level <= 50 AND the player has watched the reward ad. */
  canShowLevelHint: boolean;
  /** The exact hint the player already unlocked for this level (available to re-view anytime). */
  takenHint: UsedLevelHint | null;
  /** Whether the top-bar Hint / View Hint button should be displayed. */
  showHeaderButton: boolean;
  /** Whether the floating bottom Hint / View Hint button should be displayed. */
  showFloatingButton: boolean;
  /** True during the 10-second blink window when an unclaimed hint is available. */
  shouldBlink: boolean;
  /** Effective display mode for hint controls. */
  mode: 'disabled' | 'watch_ad' | 'view_taken';
}

export interface ResolveHintDisplayParams {
  levelId: number;
  hudLevelId: number;
  paused: boolean;
  hasAvailableHint: boolean;
  hasObstacleHint: boolean;
  hasRepeatObstacleFail: boolean;
  savedHint: UsedLevelHint | null;
  isBlinking: boolean;
  isAdLoading: boolean;
}

/**
 * Pure `hintDisplay` state resolver:
 * - Strictly disables all hint functionality whenever levelId > 50 (or hudLevelId > 50).
 * - Requires a completed reward ad before allowing the level hint to be shown.
 * - Preserves access to re-view the exact hint the player has already taken for that level.
 * - Blinks the hint button for 10 seconds when an unclaimed hint becomes available.
 */
export function resolveHintDisplay(params: ResolveHintDisplayParams): HintDisplayState {
  const {
    levelId,
    hudLevelId,
    paused,
    hasAvailableHint,
    hasObstacleHint,
    hasRepeatObstacleFail,
    savedHint,
    isBlinking,
    isAdLoading,
  } = params;

  // Strict conditional check: disable ALL hint functionality for levels > 50
  if (
    levelId < 1 ||
    levelId > STRICT_HINT_MAX_LEVEL ||
    hudLevelId < 1 ||
    hudLevelId > STRICT_HINT_MAX_LEVEL
  ) {
    return {
      enabled: false,
      hasWatchedRewardAd: false,
      canShowLevelHint: false,
      takenHint: null,
      showHeaderButton: false,
      showFloatingButton: false,
      shouldBlink: false,
      mode: 'disabled',
    };
  }

  const hasWatchedRewardAd = Boolean(savedHint);
  const canShowLevelHint = hasWatchedRewardAd;
  const shouldBlink = !paused && !isAdLoading && !hasWatchedRewardAd && isBlinking;

  return {
    enabled: true,
    hasWatchedRewardAd,
    canShowLevelHint,
    takenHint: savedHint,
    showHeaderButton: hasWatchedRewardAd || hasAvailableHint,
    showFloatingButton: !paused && hasRepeatObstacleFail && hasObstacleHint,
    shouldBlink,
    mode: hasWatchedRewardAd ? 'view_taken' : 'watch_ad',
  };
}

/** Specific levels that activate the high-intensity radial-gradient darkness effect. */
export const HIGH_INTENSITY_DARKNESS_LEVEL_IDS: ReadonlySet<number> = new Set(
  LEVELS.filter((lvl) => typeof lvl.spotlightRadius === 'number' && lvl.spotlightRadius > 0).map(
    (lvl) => lvl.id,
  ),
);

/** Returns true when the given level uses the high-intensity darkness mask. */
export function isHighIntensityDarknessLevel(levelId: number): boolean {
  return HIGH_INTENSITY_DARKNESS_LEVEL_IDS.has(levelId);
}

/**
 * Darkness Mask Renderer (single-pass elliptical forward-biased radial gradient).
 *
 * Preserves 60fps performance by using a radial gradient fill directly on the main
 * 2D canvas context (zero offscreen canvases, zero per-pixel loops):
 * - Activates strictly on designated darkness levels.
 * - Biases light forward in the player's facing direction so the obstacle directly in
 *   front of the player is readable and understandable (more forgiving in early levels <= 35,
 *   tightening progressively on deep blackout levels 52+).
 * - When `lightBoostActive` is enabled (unlocked via Rewarded Ad), projects a wider
 *   forward light beam across obstacles ahead while keeping surrounding darkness intact.
 * - Faint crimson proximity rim warning when an unexpected hazard enters close range.
 */
export function renderHighIntensityDarknessMask(
  ctx: CanvasRenderingContext2D,
  frame: DarknessRenderFrame,
): void {
  const {
    levelId,
    playerScreenX,
    playerScreenY,
    facing,
    baseRadius,
    viewWidth,
    viewHeight,
    worldTime,
    flashAlpha,
    nearestHazardDistance,
    proximityRevealRadius,
    lightBoostActive,
  } = frame;

  if (!isHighIntensityDarknessLevel(levelId) || baseRadius <= 0) {
    return;
  }

  const isEarlyDark = levelId <= 35;
  const isDeepBlackout = levelId >= 52;
  const depthTighten = isDeepBlackout ? 0.94 : 1.0;

  // Subtle organic torch breathing + controlled micro-flicker
  const breathing = 1 + Math.sin(worldTime * 3.4) * 0.02 + Math.sin(worldTime * 9.7) * 0.008;
  const microPulse = flashAlpha > 0.04 ? Math.min(0.11, flashAlpha * 0.36) : 0;
  const boostMult = lightBoostActive ? 1.56 : 1.0;
  const effectiveRadius = Math.max(
    74,
    baseRadius * depthTighten * boostMult * (breathing + microPulse),
  );

  // Shift light center forward in facing direction so upcoming obstacles in front of the player
  // come clearly into view while darkness still wraps around the outer perimeter & behind.
  const forwardOffset = lightBoostActive
    ? isEarlyDark
      ? 86
      : 76
    : isEarlyDark
      ? 42
      : 30;
  const cx = playerScreenX + facing * forwardOffset;
  const cy = playerScreenY - 2;

  // Slightly stretch horizontally to illuminate obstacles ahead while preserving vertical/outer darkness
  const beamScaleX = lightBoostActive ? 1.28 : isEarlyDark ? 1.18 : 1.12;
  const beamScaleY = lightBoostActive ? 0.98 : isEarlyDark ? 1.02 : 0.98;

  const innerClearRadius = Math.max(
    22,
    effectiveRadius * (lightBoostActive ? 0.46 : isEarlyDark ? 0.36 : 0.26),
  );
  const outerBlackoutRadius = Math.max(
    innerClearRadius + 36,
    effectiveRadius * (lightBoostActive ? 1.16 : isEarlyDark ? 1.14 : 1.08),
  );

  // Outer perimeter stays clearly dark even with the forward light boost active
  const outerAlpha = lightBoostActive
    ? Math.max(0.88, (isEarlyDark ? 0.9 : 0.945) - microPulse * 0.08)
    : Math.max(0.93, (isDeepBlackout ? 0.992 : isEarlyDark ? 0.948 : 0.982) - microPulse * 0.1);
  const nearEdgeAlpha = lightBoostActive
    ? Math.max(0.74, (isEarlyDark ? 0.78 : 0.855) - microPulse * 0.1)
    : Math.max(0.84, (isDeepBlackout ? 0.962 : isEarlyDark ? 0.875 : 0.94) - microPulse * 0.12);
  const midFalloffAlpha = lightBoostActive
    ? Math.max(0.28, (isEarlyDark ? 0.32 : 0.38) - microPulse * 0.12)
    : Math.max(0.54, (isDeepBlackout ? 0.79 : isEarlyDark ? 0.62 : 0.74) - microPulse * 0.15);

  ctx.save();

  // Primary forward-biased elliptical radial darkness mask
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(beamScaleX, beamScaleY);

  const maskGrad = ctx.createRadialGradient(
    0,
    0,
    innerClearRadius,
    0,
    0,
    outerBlackoutRadius,
  );
  maskGrad.addColorStop(0, 'rgba(2, 2, 4, 0.00)');
  maskGrad.addColorStop(0.32, lightBoostActive ? 'rgba(2, 2, 4, 0.06)' : 'rgba(2, 2, 4, 0.14)');
  maskGrad.addColorStop(0.6, `rgba(2, 2, 4, ${midFalloffAlpha.toFixed(3)})`);
  maskGrad.addColorStop(0.84, `rgba(1, 1, 3, ${nearEdgeAlpha.toFixed(3)})`);
  maskGrad.addColorStop(1, `rgba(1, 1, 3, ${outerAlpha.toFixed(3)})`);

  ctx.fillStyle = maskGrad;
  ctx.fillRect(
    -cx / beamScaleX - 4,
    -cy / beamScaleY - 4,
    viewWidth / beamScaleX + 8,
    viewHeight / beamScaleY + 8,
  );

  // Subtle warm lantern wash inside the forward beam when Rewarded Light Boost is active
  if (lightBoostActive) {
    const warmGrad = ctx.createRadialGradient(
      0,
      0,
      innerClearRadius * 0.25,
      0,
      0,
      outerBlackoutRadius * 0.88,
    );
    warmGrad.addColorStop(0, 'rgba(254, 243, 199, 0.065)');
    warmGrad.addColorStop(0.65, 'rgba(251, 191, 36, 0.035)');
    warmGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = warmGrad;
    ctx.fillRect(
      -cx / beamScaleX - 4,
      -cy / beamScaleY - 4,
      viewWidth / beamScaleX + 8,
      viewHeight / beamScaleY + 8,
    );
  }
  ctx.restore();

  // Subtle close-proximity crimson danger rim when an unexpected obstacle enters right beside the player
  if (
    Number.isFinite(nearestHazardDistance) &&
    nearestHazardDistance < proximityRevealRadius
  ) {
    const dangerIntensity = Math.max(
      0,
      Math.min(1, 1 - nearestHazardDistance / Math.max(1, proximityRevealRadius)),
    );
    const glintAlpha = dangerIntensity * dangerIntensity * (lightBoostActive ? 0.15 : 0.22);
    if (glintAlpha > 0.015) {
      const dangerGrad = ctx.createRadialGradient(
        playerScreenX + facing * 16,
        cy,
        effectiveRadius * 0.45,
        playerScreenX + facing * 16,
        cy,
        outerBlackoutRadius * 1.04,
      );
      dangerGrad.addColorStop(0, 'rgba(220, 38, 38, 0)');
      dangerGrad.addColorStop(0.68, `rgba(220, 38, 38, ${glintAlpha.toFixed(3)})`);
      dangerGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = dangerGrad;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }
  }

  ctx.restore();
}

/**
 * Dynamic Crimson Screen-Edge Vignette Renderer (60fps single-pass canvas overlay).
 *
 * Subtle psychological pressure cue rendered across the true full viewport edges:
 * - Keeps the central ~66%+ playfield completely clear (alpha = 0) so obstacle readability is never hindered.
 * - Gently deepens around the perimeter as the player approaches traps or high-difficulty obstacles.
 * - Intensifies briefly via `pulseBoost` whenever a trap triggers or a lethal hazard passes close.
 * - Respects `prefersReducedMotion` by disabling heartbeat oscillation.
 */
export function renderDangerVignette(
  ctx: CanvasRenderingContext2D,
  frame: DangerVignetteRenderFrame,
): void {
  const { width, height, intensity, pulseBoost, worldTime, isDarkLevel, prefersReducedMotion } =
    frame;

  const clampedIntensity = Math.max(0, Math.min(1, intensity));
  const clampedPulse = Math.max(0, Math.min(1, pulseBoost));
  if (width <= 0 || height <= 0 || (clampedIntensity <= 0.012 && clampedPulse <= 0.012)) {
    return;
  }

  // Organic subtle heartbeat modulation when motion is allowed
  const heartbeat = prefersReducedMotion
    ? 1
    : 0.93 + 0.07 * Math.sin(worldTime * 6.8) + 0.035 * Math.sin(worldTime * 13.6);

  // Subtle base edge tint with brief crisp intensification during trap surges
  const maxSteadyAlpha = isDarkLevel ? 0.3 : 0.23;
  const maxPulseAlpha = isDarkLevel ? 0.13 : 0.11;
  const outerAlpha = Math.min(
    isDarkLevel ? 0.4 : 0.33,
    (clampedIntensity * maxSteadyAlpha + clampedPulse * maxPulseAlpha) * heartbeat,
  );
  if (outerAlpha <= 0.008) return;

  const midAlpha = outerAlpha * 0.42;
  // Keep central playfield wide open; tighten slightly only on brief trap surges
  const innerClearStop = Math.max(
    0.5,
    0.68 - clampedIntensity * 0.11 - clampedPulse * 0.06,
  );

  ctx.save();
  ctx.translate(width * 0.5, height * 0.5);
  ctx.scale(width * 0.5, height * 0.5);

  const grad = ctx.createRadialGradient(0, 0, innerClearStop, 0, 0, 1.42);
  grad.addColorStop(0, 'rgba(220, 38, 38, 0)');
  grad.addColorStop(0.55, `rgba(220, 38, 38, ${midAlpha.toFixed(3)})`);
  grad.addColorStop(1, `rgba(153, 27, 27, ${outerAlpha.toFixed(3)})`);

  ctx.fillStyle = grad;
  ctx.fillRect(-1.02, -1.02, 2.04, 2.04);
  ctx.restore();

  // Brief subtle crimson edge sheen when a trap activates or hazard passes right beside the player
  if (clampedPulse > 0.08) {
    const rimAlpha = Math.min(0.24, clampedPulse * (isDarkLevel ? 0.24 : 0.18));
    const edgeThickness = Math.max(10, Math.min(width, height) * 0.045);

    ctx.save();
    const topGrad = ctx.createLinearGradient(0, 0, 0, edgeThickness);
    topGrad.addColorStop(0, `rgba(220, 38, 38, ${rimAlpha.toFixed(3)})`);
    topGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, edgeThickness);

    const bottomGrad = ctx.createLinearGradient(0, height, 0, height - edgeThickness);
    bottomGrad.addColorStop(0, `rgba(220, 38, 38, ${rimAlpha.toFixed(3)})`);
    bottomGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, height - edgeThickness, width, edgeThickness);

    const leftGrad = ctx.createLinearGradient(0, 0, edgeThickness, 0);
    leftGrad.addColorStop(0, `rgba(220, 38, 38, ${rimAlpha.toFixed(3)})`);
    leftGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, edgeThickness, height);

    const rightGrad = ctx.createLinearGradient(width, 0, width - edgeThickness, 0);
    rightGrad.addColorStop(0, `rgba(220, 38, 38, ${rimAlpha.toFixed(3)})`);
    rightGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(width - edgeThickness, 0, edgeThickness, height);
    ctx.restore();
  }
}

export interface SelectSarcasticHintOptions {
  lastHint?: string | null;
  obstacleIndex?: number;
}

/**
 * Selects a level-specific sarcastic, mocking hint for Levels 1–50.
 * Returns null for levels above 50 or when hint data is unavailable,
 * and avoids repeating the most recently displayed hint consecutively.
 */
export function selectSarcasticLevelHint(
  levelId: number,
  options?: SelectSarcasticHintOptions,
): string | null {
  if (
    !Number.isInteger(levelId) ||
    levelId < 1 ||
    levelId > SARCASTIC_HINT_MAX_LEVEL
  ) {
    return null;
  }

  const levelHints = SARCASTIC_LEVEL_HINTS[levelId];
  if (!Array.isArray(levelHints) || levelHints.length === 0) {
    return null;
  }

  const lastHint = options?.lastHint ?? null;
  const rawIndex = options?.obstacleIndex;

  if (typeof rawIndex === 'number' && Number.isFinite(rawIndex) && rawIndex >= 0) {
    const preferred = levelHints[Math.floor(rawIndex) % levelHints.length];
    if (preferred && preferred !== lastHint) {
      return preferred;
    }
  }

  const nonRepeating = levelHints.filter((hint) => hint !== lastHint);
  const pool = nonRepeating.length > 0 ? nonRepeating : levelHints;
  const pickIndex = Math.floor(Math.random() * pool.length);
  return pool[pickIndex] ?? null;
}

export interface GetHintModalProps {
  isOpen: boolean;
  levelId: number;
  levelNumPadded: string;
  levelName: string;
  sarcasticHint: string;
  clueText: string;
  adaptiveNote: string | null;
  deathsOnObstacle: number;
  isUnlocked: boolean;
  isReviewingSavedHint?: boolean;
  isAdLoading: boolean;
  adNotice: string | null;
  onWatchAd: () => void;
  onClose: () => void;
}

/**
 * 'Get Hint' Modal Component (Levels 1–50):
 * Presents the selected sarcastic mocking hint gated behind a rewarded ad.
 * Once unlocked for a level, the player can re-open and view their used hint
 * for that particular level anytime without watching another ad.
 */
export function GetHintModal({
  isOpen,
  levelId,
  levelNumPadded,
  levelName,
  sarcasticHint,
  clueText,
  adaptiveNote,
  deathsOnObstacle,
  isUnlocked,
  isReviewingSavedHint = false,
  isAdLoading,
  adNotice,
  onWatchAd,
  onClose,
}: GetHintModalProps) {
  if (!isOpen || levelId < 1 || levelId > STRICT_HINT_MAX_LEVEL) return null;

  const isHighCrueltyLevel = levelId >= 21;
  const unlockedLabel = isReviewingSavedHint
    ? 'Used Hint · Already Unlocked'
    : levelId >= 31
      ? 'Brutal Sarcastic Hint Unlocked'
      : levelId >= 21
        ? 'Cruel Sarcastic Hint Unlocked'
        : 'Sarcastic Hint Unlocked';

  const normalizedSarcastic = sarcasticHint.trim();
  const normalizedClue = clueText.trim();
  const normalizedAdaptive = adaptiveNote?.trim() ?? '';

  const showObstacleClue =
    normalizedClue.length > 0 && normalizedClue !== normalizedSarcastic;
  const showAdaptiveNote =
    normalizedAdaptive.length > 0 &&
    normalizedAdaptive !== normalizedSarcastic &&
    normalizedAdaptive !== normalizedClue;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#111111]/65 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="get-hint-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isAdLoading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md max-h-[92%] overflow-y-auto touch-pan-y rounded-xl bg-[#F5F3EE] border-2 border-[#111111] shadow-[6px_6px_0px_#111111] p-4 sm:p-5 text-[#111111]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#111111]/12">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono-tabular font-bold text-[#DC2626] uppercase">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>
                {isReviewingSavedHint ? 'SAVED HINT' : 'GET HINT'} · LEVEL {levelNumPadded}
              </span>
            </div>
            <h2
              id="get-hint-modal-title"
              className="font-display font-extrabold text-lg sm:text-xl tracking-tight leading-tight mt-0.5"
            >
              {levelName}
            </h2>
          </div>
          <button
            type="button"
            disabled={isAdLoading}
            onClick={onClose}
            aria-label="Close Get Hint modal"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#111111]/20 bg-[#FFFFFF] text-[#111111] hover:border-[#111111] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isUnlocked ? (
          /* Locked State: Rewarded Ad Gate */
          <div className="pt-3.5 space-y-3.5">
            <p className="text-xs sm:text-sm text-[#44403C] leading-relaxed">
              {commentaryService.getHintModalRemark(levelId, deathsOnObstacle)}
            </p>

            <div className="rounded-lg border border-dashed border-[#111111]/35 bg-[#FFFFFF]/85 px-3.5 py-3 flex items-center justify-between gap-2.5 text-[#57534E]">
              <div className="flex items-center gap-2.5 min-w-0">
                <Lock className="w-4 h-4 text-[#DC2626] shrink-0" />
                <span className="text-[11px] font-mono-tabular leading-snug">
                  SARCASTIC HINT LOCKED · Watch a rewarded ad to unlock
                </span>
              </div>
              {deathsOnObstacle > 0 && (
                <span className="shrink-0 text-[10px] font-mono-tabular font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#DC2626]/30 px-1.5 py-0.5 rounded">
                  {deathsOnObstacle}×
                </span>
              )}
            </div>

            {adNotice && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-[#DC2626]/40 bg-[#FEF2F2] px-3 py-2 text-[11px] font-mono-tabular font-semibold text-[#DC2626]"
              >
                {adNotice}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isAdLoading}
                onClick={onWatchAd}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-xs sm:text-sm shadow-[2px_2px_0px_#DC2626] hover:bg-[#DC2626] transition-colors ${
                  isAdLoading ? 'opacity-65 cursor-wait' : 'cursor-pointer'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isAdLoading ? 'Loading Rewarded Ad...' : 'Watch Ad to Unlock Hint'}
              </button>

              <button
                type="button"
                disabled={isAdLoading}
                onClick={onClose}
                className="py-2.5 px-4 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] text-[#111111] font-display font-bold text-xs sm:text-sm hover:border-[#111111] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Never Mind
              </button>
            </div>
          </div>
        ) : (
          /* Unlocked State: Selected Sarcastic Mocking Hint Revealed */
          <div className="pt-3.5 space-y-3.5">
            <div
              className={`rounded-lg border-2 p-3.5 space-y-2.5 ${
                isHighCrueltyLevel
                  ? 'border-[#DC2626] bg-[#111111] text-[#F5F3EE] shadow-[3px_3px_0px_rgba(220,38,38,0.4)]'
                  : 'border-[#111111] bg-[#FFFFFF] text-[#111111] shadow-[3px_3px_0px_rgba(220,38,38,0.25)]'
              }`}
            >
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#DC2626]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{unlockedLabel}</span>
              </div>

              <p
                className={`text-sm sm:text-[15px] font-display font-bold leading-snug ${
                  isHighCrueltyLevel ? 'text-[#F5F3EE]' : 'text-[#111111]'
                }`}
              >
                &ldquo;{normalizedSarcastic}&rdquo;
              </p>

              {showObstacleClue && (
                <div
                  className={`pt-2.5 border-t text-xs font-mono-tabular leading-relaxed ${
                    isHighCrueltyLevel
                      ? 'border-[#F5F3EE]/15 text-[#D6D3D1]'
                      : 'border-[#111111]/12 text-[#44403C]'
                  }`}
                >
                  <span
                    className={`font-bold ${
                      isHighCrueltyLevel ? 'text-[#F5F3EE]' : 'text-[#111111]'
                    }`}
                  >
                    Obstacle Clue:{' '}
                  </span>
                  {normalizedClue}
                </div>
              )}

              {showAdaptiveNote && (
                <div
                  className={`pt-2 border-t text-[11px] font-mono-tabular ${
                    isHighCrueltyLevel
                      ? 'border-[#F5F3EE]/12 text-[#A8A29E]'
                      : 'border-[#111111]/10 text-[#57534E]'
                  }`}
                >
                  <span
                    className={`font-bold ${
                      isHighCrueltyLevel ? 'text-[#F5F3EE]' : 'text-[#111111]'
                    }`}
                  >
                    Adaptive Note:{' '}
                  </span>
                  {normalizedAdaptive}
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#57534E]">
              Saved for Level {levelNumPadded}. You can tap &ldquo;View Hint&rdquo; anytime on this
              level to read it again.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-xs sm:text-sm shadow-[2px_2px_0px_#DC2626] hover:bg-[#DC2626] transition-colors cursor-pointer"
            >
              Got It — Back to Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface LightBoostModalProps {
  isOpen: boolean;
  levelNumPadded: string;
  levelName: string;
  isBoostActive: boolean;
  isAdLoading: boolean;
  adNotice: string | null;
  onWatchAd: () => void;
  onClose: () => void;
}

function LightBoostModal({
  isOpen,
  levelNumPadded,
  levelName,
  isBoostActive,
  isAdLoading,
  adNotice,
  onWatchAd,
  onClose,
}: LightBoostModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020204]/78 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="light-boost-modal-title"
    >
      <div className="w-full max-w-md max-h-[92%] overflow-y-auto touch-pan-y rounded-xl bg-[#F5F3EE] border-2 border-[#111111] shadow-[6px_6px_0px_#F59E0B] p-4 sm:p-5 text-[#111111]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#111111]/12">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-9 w-9 rounded-lg bg-[#111111] text-[#FBBF24] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#F59E0B]">
              <Sun className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2
                id="light-boost-modal-title"
                className="font-display font-extrabold text-base sm:text-lg leading-tight tracking-tight"
              >
                {isBoostActive ? 'Forward Light Active' : 'Illuminate Ahead'}
              </h2>
              <p className="text-[11px] font-mono-tabular text-[#57534E] truncate">
                Level {levelNumPadded} · {levelName}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isAdLoading}
            onClick={onClose}
            aria-label="Close Illuminate Ahead modal"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#111111]/20 bg-[#FFFFFF] text-[#111111] hover:border-[#111111] disabled:opacity-40 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isBoostActive ? (
          <div className="pt-3.5 space-y-3">
            <div className="p-3 rounded-lg bg-[#111111] text-[#F5F3EE] border border-[#F59E0B]/40 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#FBBF24]">
                <Sun className="w-3.5 h-3.5" />
                <span>Forward Beam · Surrounding Darkness Remains</span>
              </div>
              <p className="text-xs sm:text-sm text-[#F5F3EE] leading-snug">
                Watch a short rewarded ad to reduce darkness in front of you so upcoming traps and
                platforms come clearly into light, while keeping darkness around the edges.
              </p>
              <p className="text-[11px] text-[#D6D1C7]">
                Stays active across retries until you finish Level {levelNumPadded}.
              </p>
            </div>

            {adNotice && (
              <div className="px-3 py-2 rounded-lg bg-[#FEF2F2] border border-[#DC2626]/40 text-[11px] font-mono-tabular font-semibold text-[#DC2626]">
                {adNotice}
              </div>
            )}

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                disabled={isAdLoading}
                onClick={onWatchAd}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-xs sm:text-sm shadow-[3px_3px_0px_#F59E0B] hover:bg-[#D97706] hover:text-[#111111] hover:shadow-[3px_3px_0px_#111111] disabled:opacity-55 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>{isAdLoading ? 'Loading Rewarded Ad...' : 'Watch Ad · Light Ahead'}</span>
              </button>

              <button
                type="button"
                disabled={isAdLoading}
                onClick={onClose}
                className="py-2.5 px-3.5 rounded-lg border-2 border-[#111111]/25 bg-[#FFFFFF] text-[#111111] font-semibold text-xs sm:text-sm hover:border-[#111111] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
              >
                Keep It Dark
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-3.5 space-y-3">
            <div className="p-3.5 rounded-lg bg-[#FFFFFF] border-2 border-[#F59E0B] shadow-[3px_3px_0px_rgba(245,158,11,0.28)] space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono-tabular font-extrabold uppercase tracking-wider text-[#B45309]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Forward Light Active · Level {levelNumPadded}</span>
              </div>
              <p className="text-xs sm:text-sm text-[#111111] leading-snug">
                Obstacles in front of you are now illuminated while darkness remains around you.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-xs sm:text-sm shadow-[2px_2px_0px_#F59E0B] hover:bg-[#D97706] hover:text-[#111111] transition-colors cursor-pointer"
            >
              Back to Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function GameCanvas({
  levelId,
  settings,
  totalDeathsGlobal,
  extraLives,
  paused,
  onPauseToggle,
  onGoHome,
  onOpenLevels,
  onToggleMute,
  onDeathRecorded,
  onDeathScreenOpen,
  onTrickTriggered,
  onLevelComplete,
  onHintAdStateChange,
  usedLevelHint,
  onHintUnlocked,
  restartToken,
  deathAction,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PlatformerEngine | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Track visual active states of touch buttons without re-rendering canvas loop
  const [touchState, setTouchState] = useState({ left: false, right: false, jump: false });
  const touchActiveRef = useRef({ left: false, right: false, jump: false });

  // Latest callbacks in refs so engine never restarts when React state updates
  const callbacksRef = useRef({
    onDeathRecorded,
    onDeathScreenOpen,
    onTrickTriggered,
    onLevelComplete,
  });
  callbacksRef.current = {
    onDeathRecorded,
    onDeathScreenOpen,
    onTrickTriggered,
    onLevelComplete,
  };

  const [hud, setHud] = useState<HudSnapshot>({
    levelId,
    chapter: 1,
    levelInChapter: 1,
    levelName: '',
    chapterTitle: '',
    elapsedMs: 0,
    levelDeaths: 0,
    levelDeathStreak: 0,
    deathStreakMilestone: null,
    totalDeaths: totalDeathsGlobal,
    checkpointReached: false,
    deathMessage: null,
    deathMessageId: 0,
    prankBanner: null,
    prankBannerId: 0,
    adaptiveHint: null,
    obstacleHint: null,
  });

  // Levels 1–50 Rewarded-Ad-Gated 'Get Hint' Modal State
  // Hints unlock strictly after verified rewarded ad completion; once taken for a level,
  // the player can re-open and view their used hint for that level anytime without another ad.
  const [localUsedHintsByLevel, setLocalUsedHintsByLevel] = useState<
    Record<number, UsedLevelHint>
  >({});
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [isReviewingSavedHint, setIsReviewingSavedHint] = useState(false);
  const [activeHintModalTarget, setActiveHintModalTarget] = useState<{
    levelId: number;
    obstacleKey: string;
    sarcasticHint: string;
    clueText: string;
    adaptiveText: string | null;
    deathsOnObstacle: number;
  } | null>(null);
  const [hintAdLoading, setHintAdLoading] = useState(false);
  const [hintAdNotice, setHintAdNotice] = useState<string | null>(null);
  const [hintNotifyBurstId, setHintNotifyBurstId] = useState(0);
  const [isHintButtonBlinking, setIsHintButtonBlinking] = useState(false);
  const blinkedHintKeysRef = useRef<Set<string>>(new Set());
  const hintNoticeTimerRef = useRef<number | null>(null);
  const hintBlinkTimerRef = useRef<number | null>(null);
  const hintBlinkRemainingMsRef = useRef<number>(0);
  const hintBlinkStartedAtRef = useRef<number | null>(null);
  const hintBlinkActiveKeyRef = useRef<string | null>(null);
  const lastSarcasticTextRef = useRef<string | null>(null);

  // Rewarded-Ad-Gated Forward Light Boost state (Darkness Levels only)
  const [darknessLightBoostByLevel, setDarknessLightBoostByLevel] = useState<
    Record<number, boolean>
  >({});
  const [lightBoostModalOpen, setLightBoostModalOpen] = useState(false);
  const [lightBoostAdLoading, setLightBoostAdLoading] = useState(false);
  const [lightBoostAdNotice, setLightBoostAdNotice] = useState<string | null>(null);
  const lightBoostNoticeTimerRef = useRef<number | null>(null);

  // Sync persisted per-level hint prop into local cache (and clear if progress was reset)
  useEffect(() => {
    if (usedLevelHint === undefined) return;
    setLocalUsedHintsByLevel((prev) => {
      if (usedLevelHint === null) {
        if (!(levelId in prev)) return prev;
        const next = { ...prev };
        delete next[levelId];
        return next;
      }
      if (prev[levelId] === usedLevelHint) return prev;
      return { ...prev, [levelId]: usedLevelHint };
    });
  }, [levelId, usedLevelHint]);

  const stopHintButtonBlink = (resetRemaining = true) => {
    if (hintBlinkTimerRef.current !== null) {
      window.clearTimeout(hintBlinkTimerRef.current);
      hintBlinkTimerRef.current = null;
    }
    if (!resetRemaining && hintBlinkStartedAtRef.current !== null) {
      const elapsed = Date.now() - hintBlinkStartedAtRef.current;
      hintBlinkRemainingMsRef.current = Math.max(0, hintBlinkRemainingMsRef.current - elapsed);
    } else if (resetRemaining) {
      hintBlinkRemainingMsRef.current = 0;
      hintBlinkActiveKeyRef.current = null;
    }
    hintBlinkStartedAtRef.current = null;
    setIsHintButtonBlinking(false);
  };

  const isLevelWithinHintCap =
    levelId >= 1 &&
    levelId <= STRICT_HINT_MAX_LEVEL &&
    hud.levelId >= 1 &&
    hud.levelId <= STRICT_HINT_MAX_LEVEL;
  const currentLevelDef = getLevelById(hud.levelId);
  const fallbackPrimaryHint = isLevelWithinHintCap ? getPrimaryLevelHint(currentLevelDef) : null;
  const effectiveHint = isLevelWithinHintCap ? (hud.obstacleHint ?? fallbackPrimaryHint) : null;

  const savedHintForCurrentLevel: UsedLevelHint | null = isLevelWithinHintCap
    ? (hud.levelId === levelId && usedLevelHint !== undefined
        ? (usedLevelHint ?? localUsedHintsByLevel[hud.levelId] ?? null)
        : (localUsedHintsByLevel[hud.levelId] ?? null))
    : null;

  const hasRepeatObstacleFail = Boolean(
    isLevelWithinHintCap &&
      hud.obstacleHint &&
      (hud.obstacleHint.isRepeatObstacleFail ||
        hud.obstacleHint.deathsOnObstacle >= SARCASTIC_HINT_MIN_OBSTACLE_DEATHS),
  );

  // Unified `hintDisplay` state: checks reward ad unlock, 10s blink window, taken-hint re-view,
  // and strictly disables all hint functionality for levels > 50.
  const hintDisplay = resolveHintDisplay({
    levelId,
    hudLevelId: hud.levelId,
    paused,
    hasAvailableHint: Boolean(effectiveHint),
    hasObstacleHint: Boolean(hud.obstacleHint),
    hasRepeatObstacleFail,
    savedHint: savedHintForCurrentLevel,
    isBlinking: isHintButtonBlinking,
    isAdLoading: hintAdLoading,
  });

  const eligibleLockedHintKey =
    hintDisplay.enabled &&
    hasRepeatObstacleFail &&
    hud.obstacleHint &&
    !hintDisplay.hasWatchedRewardAd
      ? hud.obstacleHint.obstacleKey
      : null;

  // Strictly disable all hint UI & timers whenever level > 50
  useEffect(() => {
    if (!hintDisplay.enabled) {
      stopHintButtonBlink(true);
      setHintModalOpen(false);
      setActiveHintModalTarget(null);
      setHintAdNotice(null);
    }
  }, [hintDisplay.enabled]);

  // Blink the Hint button for exactly 10 seconds of active gameplay when an obstacle hint becomes
  // available (Levels 1–50 only), pausing/resuming cleanly across Death Screen or Pause overlays.
  // Hints NEVER pop out automatically — the player must tap the button and complete a rewarded ad.
  useEffect(() => {
    if (!eligibleLockedHintKey || !hintDisplay.enabled) {
      stopHintButtonBlink(true);
      return;
    }

    if (paused) {
      stopHintButtonBlink(false);
      return;
    }

    // First time this obstacle hint becomes available: arm a fresh 10-second blink window
    if (!blinkedHintKeysRef.current.has(eligibleLockedHintKey)) {
      blinkedHintKeysRef.current.add(eligibleLockedHintKey);
      hintBlinkActiveKeyRef.current = eligibleLockedHintKey;
      hintBlinkRemainingMsRef.current = HINT_BUTTON_BLINK_MS;
      setHintNotifyBurstId((n) => n + 1);
    }

    // Only blink if this key still has remaining time in its 10-second window
    if (
      hintBlinkActiveKeyRef.current === eligibleLockedHintKey &&
      hintBlinkRemainingMsRef.current > 0
    ) {
      const remainingMs = hintBlinkRemainingMsRef.current;
      hintBlinkStartedAtRef.current = Date.now();
      setIsHintButtonBlinking(true);
      if (hintBlinkTimerRef.current !== null) {
        window.clearTimeout(hintBlinkTimerRef.current);
      }
      hintBlinkTimerRef.current = window.setTimeout(() => {
        hintBlinkTimerRef.current = null;
        hintBlinkStartedAtRef.current = null;
        hintBlinkRemainingMsRef.current = 0;
        setIsHintButtonBlinking(false);
      }, remainingMs);
    }
  }, [eligibleLockedHintKey, hintDisplay.enabled, paused]);

  const isLightBoostActiveForLevel = Boolean(darknessLightBoostByLevel[hud.levelId]);

  // Keep game paused and audio ducked while Get Hint / Light Boost modal or Rewarded Ad is active
  useEffect(() => {
    onHintAdStateChange?.(
      hintModalOpen || hintAdLoading || lightBoostModalOpen || lightBoostAdLoading,
    );
  }, [
    hintModalOpen,
    hintAdLoading,
    lightBoostModalOpen,
    lightBoostAdLoading,
    onHintAdStateChange,
  ]);

  // Sync darkness forward-light boost status with the running canvas engine
  useEffect(() => {
    engineRef.current?.setDarknessLightBoost(isLightBoostActiveForLevel);
  }, [isLightBoostActiveForLevel, hud.levelId]);

  const showHintNotice = (msg: string) => {
    setHintAdNotice(msg);
    if (hintNoticeTimerRef.current !== null) {
      window.clearTimeout(hintNoticeTimerRef.current);
    }
    hintNoticeTimerRef.current = window.setTimeout(() => {
      setHintAdNotice(null);
      hintNoticeTimerRef.current = null;
    }, 3600);
  };

  const handleOpenHintModal = () => {
    if (!hintDisplay.enabled || hintAdLoading) return;
    if (!hintDisplay.takenHint && !effectiveHint) return;
    stopHintButtonBlink();
    audioManager.unlockAudio();
    audioManager.playButtonClick();
    engineRef.current?.clearInputs();
    touchActiveRef.current = { left: false, right: false, jump: false };
    setTouchState({ left: false, right: false, jump: false });

    // If the player has already watched the reward ad and taken the hint for this level,
    // allow viewing their exact taken hint immediately without another ad.
    if (hintDisplay.canShowLevelHint && hintDisplay.takenHint) {
      setIsReviewingSavedHint(true);
      setActiveHintModalTarget({
        levelId: hud.levelId,
        obstacleKey: hintDisplay.takenHint.obstacleKey,
        sarcasticHint: hintDisplay.takenHint.sarcasticHint,
        clueText: hintDisplay.takenHint.clueText,
        adaptiveText: hintDisplay.takenHint.adaptiveText,
        deathsOnObstacle: effectiveHint?.deathsOnObstacle ?? hud.levelDeaths,
      });
      setHintAdNotice(null);
      setHintModalOpen(true);
      return;
    }

    if (!effectiveHint) return;
    setIsReviewingSavedHint(false);
    const selectedSarcasticHint =
      selectSarcasticLevelHint(hud.levelId, {
        lastHint: lastSarcasticTextRef.current,
        obstacleIndex: effectiveHint.obstacleIndex,
      }) ?? effectiveHint.clueText;
    lastSarcasticTextRef.current = selectedSarcasticHint;

    const adaptiveText = hud.adaptiveHint ?? currentLevelDef.adaptiveClue?.text ?? null;
    setActiveHintModalTarget({
      levelId: hud.levelId,
      obstacleKey: effectiveHint.obstacleKey,
      sarcasticHint: selectedSarcasticHint,
      clueText: effectiveHint.clueText,
      adaptiveText,
      deathsOnObstacle: effectiveHint.deathsOnObstacle,
    });
    setHintAdNotice(null);
    setHintModalOpen(true);
  };

  const handleCloseHintModal = () => {
    if (hintAdLoading) return;
    audioManager.playButtonClick();
    setHintModalOpen(false);
    setHintAdNotice(null);
  };

  const handleWatchHintAd = async () => {
    if (!hintDisplay.enabled || !activeHintModalTarget || hintAdLoading) return;
    const targetLevelId = activeHintModalTarget.levelId;
    if (targetLevelId > STRICT_HINT_MAX_LEVEL || localUsedHintsByLevel[targetLevelId]) return;

    audioManager.unlockAudio();
    audioManager.playButtonClick();
    setHintAdLoading(true);
    setHintAdNotice(null);

    try {
      const result = await adMobService.showRewardedHintAd();
      if (result.rewarded) {
        const unlockedHint: UsedLevelHint = {
          obstacleKey: activeHintModalTarget.obstacleKey,
          sarcasticHint: activeHintModalTarget.sarcasticHint,
          clueText: activeHintModalTarget.clueText,
          adaptiveText: activeHintModalTarget.adaptiveText,
        };
        setLocalUsedHintsByLevel((prev) => ({
          ...prev,
          [targetLevelId]: unlockedHint,
        }));
        onHintUnlocked?.(targetLevelId, unlockedHint);
      } else if (result.reason === 'dismissed_early') {
        showHintNotice('Ad skipped early — no hint for quitters.');
      } else if (result.reason === 'offline') {
        showHintNotice('Offline — ad unavailable, no hint unlocked.');
      } else {
        showHintNotice('No rewarded ad ready right now. Try again shortly.');
      }
    } catch {
      showHintNotice('Ad failed to load — no hint granted.');
    } finally {
      setHintAdLoading(false);
    }
  };

  const showLightBoostNotice = (msg: string) => {
    setLightBoostAdNotice(msg);
    if (lightBoostNoticeTimerRef.current !== null) {
      window.clearTimeout(lightBoostNoticeTimerRef.current);
    }
    lightBoostNoticeTimerRef.current = window.setTimeout(() => {
      setLightBoostAdNotice(null);
      lightBoostNoticeTimerRef.current = null;
    }, 3600);
  };

  const handleOpenLightBoostModal = () => {
    if (!isHighIntensityDarknessLevel(hud.levelId) || lightBoostAdLoading) return;
    audioManager.unlockAudio();
    audioManager.playButtonClick();
    engineRef.current?.clearInputs();
    touchActiveRef.current = { left: false, right: false, jump: false };
    setTouchState({ left: false, right: false, jump: false });
    setLightBoostAdNotice(null);
    setLightBoostModalOpen(true);
  };

  const handleCloseLightBoostModal = () => {
    if (lightBoostAdLoading) return;
    audioManager.playButtonClick();
    setLightBoostModalOpen(false);
    setLightBoostAdNotice(null);
  };

  const handleWatchLightBoostAd = async () => {
    const targetLevelId = hud.levelId;
    if (
      !isHighIntensityDarknessLevel(targetLevelId) ||
      lightBoostAdLoading ||
      darknessLightBoostByLevel[targetLevelId]
    ) {
      return;
    }

    audioManager.unlockAudio();
    audioManager.playButtonClick();
    setLightBoostAdLoading(true);
    setLightBoostAdNotice(null);

    try {
      const result = await adMobService.showRewardedLightBoostAd();
      if (result.rewarded) {
        setDarknessLightBoostByLevel((prev) => ({
          ...prev,
          [targetLevelId]: true,
        }));
        engineRef.current?.setDarknessLightBoost(true);
        audioManager.playCheckpoint();
        setLightBoostModalOpen(false);
      } else if (result.reason === 'dismissed_early') {
        showLightBoostNotice('Ad skipped early — darkness remains unchanged.');
      } else if (result.reason === 'offline') {
        showLightBoostNotice('Offline — ad unavailable, light boost not unlocked.');
      } else {
        showLightBoostNotice('No rewarded ad ready right now. Try again shortly.');
      }
    } catch {
      showLightBoostNotice('Ad failed to load — darkness remains unchanged.');
    } finally {
      setLightBoostAdLoading(false);
    }
  };

  // Screen shake & impact flash refs/state (never unmounts canvas)
  const shakeStageRef = useRef<HTMLDivElement | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const [impactFlashId, setImpactFlashId] = useState<number>(0);
  const [deathPulseId, setDeathPulseId] = useState<number>(0);

  const triggerScreenShake = (kind: 'death' | 'trap') => {
    const stage = shakeStageRef.current;
    if (stage) {
      stage.classList.remove('animate-rage-shake', 'animate-trap-shake');
      // Force reflow so rapid consecutive hits restart the shake cleanly
      void stage.offsetWidth;
      const cls = kind === 'death' ? 'animate-rage-shake' : 'animate-trap-shake';
      stage.classList.add(cls);

      if (shakeTimerRef.current !== null) {
        window.clearTimeout(shakeTimerRef.current);
      }
      shakeTimerRef.current = window.setTimeout(
        () => {
          stage.classList.remove('animate-rage-shake', 'animate-trap-shake');
          shakeTimerRef.current = null;
        },
        kind === 'death' ? 440 : 240,
      );
    }

    if (kind === 'death') {
      setImpactFlashId((id) => id + 1);
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = window.setTimeout(() => {
        setImpactFlashId(0);
        flashTimerRef.current = null;
      }, 400);
    }
  };

  const clearActiveTaunt = () => {
    deathTauntService.dismiss();
  };

  // Detect touch capability once on mount
  useEffect(() => {
    const hasTouch =
      'ontouchstart' in window ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
      window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(hasTouch);
  }, []);

  // Mount isolated 60fps canvas engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new PlatformerEngine(canvas, levelId, settings, totalDeathsGlobal, {
      onHudUpdate: (snap) => setHud(snap),
      onDeathRecorded: (lid, ld, streak, deathContext) => {
        triggerScreenShake('death');
        setDeathPulseId((id) => id + 1);
        deathTauntService.triggerDeathTaunt(
          deathContext ?? {
            levelId: lid,
            cause: 'pit',
            levelDeaths: ld,
            deathStreak: streak,
            totalDeaths: totalDeathsGlobal + 1,
            quickDeaths: 0,
            elapsedMs: 3000,
            progressRatio: 0,
            repeatObstacleCount: 0,
          },
        );
        callbacksRef.current.onDeathRecorded(lid, ld);
      },
      onDeathScreenOpen: (snapshot) => {
        callbacksRef.current.onDeathScreenOpen(snapshot);
      },
      onTrickTriggered: (k) => {
        if (k === 'trap') {
          triggerScreenShake('trap');
        }
        callbacksRef.current.onTrickTriggered(k);
      },
      onRenderDarknessMask: renderHighIntensityDarknessMask,
      onRenderDangerVignette: renderDangerVignette,
      onLevelComplete: (stats) => callbacksRef.current.onLevelComplete(stats),
    });

    engineRef.current = engine;
    engine.start();

    return () => {
      deathTauntService.dismiss();
      if (shakeTimerRef.current !== null) {
        window.clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = null;
      }
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
      if (hintNoticeTimerRef.current !== null) {
        window.clearTimeout(hintNoticeTimerRef.current);
        hintNoticeTimerRef.current = null;
      }
      if (hintBlinkTimerRef.current !== null) {
        window.clearTimeout(hintBlinkTimerRef.current);
        hintBlinkTimerRef.current = null;
      }
      if (lightBoostNoticeTimerRef.current !== null) {
        window.clearTimeout(lightBoostNoticeTimerRef.current);
        lightBoostNoticeTimerRef.current = null;
      }
      onHintAdStateChange?.(false);
      engine.destroy();
      engineRef.current = null;
    };
    // Intentionally mounted once per active gameplay session; level/settings/pause synced via effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync level changes
  const prevLevelRef = useRef(levelId);
  useEffect(() => {
    if (prevLevelRef.current !== levelId) {
      prevLevelRef.current = levelId;
      clearActiveTaunt();
      stopHintButtonBlink();
      blinkedHintKeysRef.current.clear();
      lastSarcasticTextRef.current = null;
      setHintModalOpen(false);
      setActiveHintModalTarget(null);
      setHintAdNotice(null);
      setLightBoostModalOpen(false);
      setLightBoostAdNotice(null);
      engineRef.current?.loadLevel(levelId);
    }
  }, [levelId]);

  // Sync explicit restarts
  const prevRestartRef = useRef(restartToken);
  useEffect(() => {
    if (prevRestartRef.current !== restartToken) {
      prevRestartRef.current = restartToken;
      clearActiveTaunt();
      stopHintButtonBlink();
      blinkedHintKeysRef.current.clear();
      setHintModalOpen(false);
      engineRef.current?.restartLevel();
    }
  }, [restartToken]);

  // Sync Death Screen resolution (Rewarded Exact-Spot Respawn vs. Normal Restart)
  const prevDeathActionRef = useRef(deathAction.id);
  useEffect(() => {
    if (prevDeathActionRef.current !== deathAction.id) {
      prevDeathActionRef.current = deathAction.id;
      clearActiveTaunt();
      if (deathAction.type === 'respawn_exact') {
        engineRef.current?.respawnAtSavedDeathLocation();
      } else {
        engineRef.current?.confirmDeathRestart();
      }
    }
  }, [deathAction]);

  // Sync settings
  useEffect(() => {
    engineRef.current?.updateSettings(settings);
  }, [settings]);

  // Sync pause state
  useEffect(() => {
    engineRef.current?.setPaused(paused);
    if (paused) {
      touchActiveRef.current = { left: false, right: false, jump: false };
      setTouchState({ left: false, right: false, jump: false });
    }
  }, [paused]);

  // Keyboard bindings & window blur protection
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine || hintAdLoading || lightBoostAdLoading) return;

      if (lightBoostModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleCloseLightBoostModal();
        }
        return;
      }

      if (hintModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleCloseHintModal();
        }
        return;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onPauseToggle();
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onToggleMute();
        return;
      }

      if (paused) return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        audioManager.playButtonClick();
        engine.restartLevel();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        audioManager.unlockAudio();
        engine.input.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        audioManager.unlockAudio();
        engine.input.right = true;
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        audioManager.unlockAudio();
        if (!e.repeat) {
          engine.pressJump();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        engine.input.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        engine.input.right = false;
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        engine.releaseJump();
      }
    };

    const onBlur = () => {
      engineRef.current?.clearInputs();
      touchActiveRef.current = { left: false, right: false, jump: false };
      setTouchState({ left: false, right: false, jump: false });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    paused,
    hintModalOpen,
    hintAdLoading,
    lightBoostModalOpen,
    lightBoostAdLoading,
    onPauseToggle,
    onToggleMute,
  ]);

  const showTouchControls =
    settings.touchControls === 'always' || (settings.touchControls === 'auto' && isTouchDevice);

  const setLeft = (active: boolean) => {
    audioManager.unlockAudio();
    if (active && !touchActiveRef.current.left) {
      audioManager.vibrateTouchControl('left');
    }
    touchActiveRef.current.left = active;
    if (engineRef.current) engineRef.current.input.left = active;
    setTouchState((prev) => (prev.left === active ? prev : { ...prev, left: active }));
  };

  const setRight = (active: boolean) => {
    audioManager.unlockAudio();
    if (active && !touchActiveRef.current.right) {
      audioManager.vibrateTouchControl('right');
    }
    touchActiveRef.current.right = active;
    if (engineRef.current) engineRef.current.input.right = active;
    setTouchState((prev) => (prev.right === active ? prev : { ...prev, right: active }));
  };

  const setJump = (active: boolean) => {
    audioManager.unlockAudio();
    if (active && !touchActiveRef.current.jump) {
      audioManager.vibrateTouchControl('jump');
    }
    touchActiveRef.current.jump = active;
    if (engineRef.current) {
      if (active) engineRef.current.pressJump();
      else engineRef.current.releaseJump();
    }
    setTouchState((prev) => (prev.jump === active ? prev : { ...prev, jump: active }));
  };

  const levelNumPadded = String(hud.levelId).padStart(2, '0');
  const isDarkLevel = isHighIntensityDarknessLevel(hud.levelId);
  const isFinale100 = hud.levelId === 100;
  const isDarkUi = isDarkLevel || isFinale100;
  const difficultyStage = getDifficultyStage(hud.levelId);

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none ${
        isDarkLevel ? 'bg-[#020204]' : isFinale100 ? 'bg-[#1A1617]' : 'bg-[#F5F3EE]'
      }`}
    >
      {/* Shakeable Viewport Stage (canvas + HUD jolt together on hazard impact/death) */}
      <div ref={shakeStageRef} className="relative w-full h-full">
        {/* Isolated 60fps Canvas Viewport */}
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Low-Occlusion Top HUD Overlay (pointer-events: none wrapper, zero backdrop-filter) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 safe-px sm:px-6 pt-2 sm:pt-3.5">
        {/* Top-left prominent Level Number & quiet tabular telemetry */}
        <div className="flex items-start gap-3">
          <div
            className={`flex flex-col leading-none pr-3 border-r ${
              isFinale100
                ? 'border-[#DC2626]/55'
                : isDarkUi
                  ? 'border-[#F5F3EE]/25'
                  : 'border-[#111111]/20'
            }`}
          >
            <span
              className={`text-[10px] font-mono-tabular font-semibold tracking-wider ${
                isFinale100
                  ? 'text-[#DC2626]'
                  : isDarkUi
                    ? 'text-[#A8A29E]'
                    : 'text-[#57534E]'
              }`}
            >
              {isFinale100 ? 'FINAL' : 'LEVEL'}
            </span>
            <div
              className={`font-display font-extrabold text-2xl sm:text-3xl tracking-tight font-mono-tabular mt-0.5 ${
                isFinale100
                  ? 'text-[#EAB308]'
                  : isDarkUi
                    ? 'text-[#F5F3EE]'
                    : 'text-[#111111]'
              }`}
            >
              {levelNumPadded}
              <span
                className={`text-xs sm:text-sm font-medium ${
                  isDarkUi ? 'text-[#A8A29E]' : 'text-[#78716C]'
                }`}
              >
                /{LEVELS.length}
              </span>
            </div>
          </div>

          <div className="flex flex-col pt-0.5">
            <div
              className={`text-xs sm:text-sm font-display font-bold tracking-tight ${
                isDarkUi ? 'text-[#F5F3EE]' : 'text-[#111111]'
              }`}
            >
              {hud.levelName}
              <span
                className={`hidden sm:inline font-sans font-normal ${
                  isFinale100
                    ? 'text-[#DC2626] font-mono-tabular font-semibold'
                    : isDarkUi
                      ? 'text-[#A8A29E]'
                      : 'text-[#57534E]'
                }`}
              >
                {' '}
                · {isFinale100 ? 'ZERO CHECKPOINTS' : difficultyStage.name}
              </span>
            </div>
            <div
              className={`flex items-center gap-2 text-[11px] sm:text-xs font-mono-tabular mt-0.5 ${
                isDarkUi ? 'text-[#D6D1C7]' : 'text-[#44403C]'
              }`}
            >
              <span>{formatTimeMs(hud.elapsedMs)}</span>
              <span aria-hidden="true">·</span>
              <span className={hud.levelDeaths > 0 ? 'text-[#DC2626] font-semibold' : ''}>
                {hud.levelDeaths} {hud.levelDeaths === 1 ? 'Death' : 'Deaths'}
              </span>
              {isFinale100 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#EAB308] font-semibold">NO HINTS</span>
                </>
              )}
              {hud.checkpointReached && !isFinale100 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-semibold ${
                      isDarkUi ? 'text-[#F5F3EE]' : 'text-[#111111]'
                    }`}
                  >
                    Saved
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top-right direct Home, Levels, Restart, Mute, and Menu buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              onGoHome();
            }}
            aria-label="Go to Home Screen"
            title="Home"
            className={`h-10 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isFinale100
                ? 'border-[#DC2626]/45 bg-[#0E0C0D] text-[#F5F3EE] hover:border-[#EAB308]'
                : 'border-[#111111]/25 bg-[#F5F3EE] text-[#111111] hover:border-[#111111]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              onOpenLevels();
            }}
            aria-label="Choose Level"
            title="Levels"
            className={`h-10 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isFinale100
                ? 'border-[#DC2626]/45 bg-[#0E0C0D] text-[#F5F3EE] hover:border-[#EAB308]'
                : 'border-[#111111]/25 bg-[#F5F3EE] text-[#111111] hover:border-[#111111]'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span className="hidden md:inline">Levels</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.unlockAudio();
              onToggleMute();
            }}
            aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
            title="Mute (M)"
            className={`h-10 w-10 flex items-center justify-center rounded-lg border active:scale-95 transition-all cursor-pointer shrink-0 ${
              isFinale100
                ? 'border-[#DC2626]/45 bg-[#0E0C0D] text-[#F5F3EE] hover:border-[#EAB308]'
                : 'border-[#111111]/25 bg-[#F5F3EE] text-[#111111] hover:border-[#111111]'
            }`}
          >
            {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              engineRef.current?.restartLevel();
            }}
            aria-label="Restart level"
            title="Restart (R)"
            className={`h-10 w-10 flex items-center justify-center rounded-lg border active:scale-95 transition-all cursor-pointer shrink-0 ${
              isFinale100
                ? 'border-[#DC2626]/45 bg-[#0E0C0D] text-[#F5F3EE] hover:border-[#EAB308]'
                : 'border-[#111111]/25 bg-[#F5F3EE] text-[#111111] hover:border-[#111111]'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {isDarkLevel && (
            <button
              type="button"
              disabled={lightBoostAdLoading}
              onClick={handleOpenLightBoostModal}
              aria-label={
                isLightBoostActiveForLevel
                  ? 'Forward light boost active for this dark level'
                  : 'Watch rewarded ad to illuminate obstacles ahead in the darkness'
              }
              title={
                isLightBoostActiveForLevel
                  ? 'Forward Light Active'
                  : 'Light Ahead (Watch Ad)'
              }
              className={`h-10 relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                lightBoostAdLoading
                  ? 'border-[#F59E0B]/40 bg-[#18181B] text-[#FDE68A] opacity-65 cursor-wait'
                  : isLightBoostActiveForLevel
                    ? 'border-[#F59E0B] bg-[#FEF3C7] text-[#92400E] shadow-[2px_2px_0px_rgba(245,158,11,0.4)] cursor-pointer'
                    : 'border-[#F59E0B]/80 bg-[#18181B] text-[#FEF3C7] hover:bg-[#F59E0B] hover:text-[#111111] shadow-[2px_2px_0px_rgba(245,158,11,0.35)] cursor-pointer'
              }`}
            >
              <span className="relative inline-flex items-center justify-center shrink-0">
                <Sun
                  className={`w-4 h-4 ${
                    isLightBoostActiveForLevel ? 'text-[#D97706]' : 'text-[#FBBF24]'
                  }`}
                />
                {!isLightBoostActiveForLevel && hud.levelDeaths >= 1 && !lightBoostAdLoading && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FBBF24] opacity-80" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#F59E0B]" />
                  </span>
                )}
              </span>
              <span className="hidden sm:inline">
                {isLightBoostActiveForLevel ? 'Lit' : 'Light'}
              </span>
            </button>
          )}

          {hintDisplay.showHeaderButton && !isFinale100 && (
            <button
              type="button"
              disabled={hintAdLoading}
              onClick={handleOpenHintModal}
              aria-label={
                hintDisplay.canShowLevelHint
                  ? 'View the hint you already unlocked for this level'
                  : 'Get Hint (watch rewarded ad to unlock)'
              }
              title={hintDisplay.canShowLevelHint ? 'View Hint' : 'Get Hint (Ad)'}
              className={`h-10 relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                hintAdLoading
                  ? 'border-[#111111]/20 bg-[#EAE6DC] text-[#78716C] opacity-65 cursor-wait'
                  : hintDisplay.shouldBlink
                    ? 'border-[#DC2626]/70 bg-[#F5F3EE] text-[#111111] hover:border-[#DC2626] hover:text-[#DC2626] cursor-pointer animate-hint-available'
                    : hasRepeatObstacleFail && !hintDisplay.canShowLevelHint
                      ? 'border-[#DC2626]/55 bg-[#F5F3EE] text-[#111111] hover:border-[#DC2626] hover:text-[#DC2626] cursor-pointer'
                      : 'border-[#111111]/30 bg-[#F5F3EE] text-[#111111] hover:border-[#DC2626] hover:text-[#DC2626] cursor-pointer'
              }`}
            >
              <span className="relative inline-flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-[#DC2626]" />
                {hintDisplay.shouldBlink && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DC2626] opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#DC2626]" />
                  </span>
                )}
              </span>
              <span className="hidden sm:inline">Hint</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              onPauseToggle();
            }}
            aria-label="Open Game Menu"
            title="Menu (Esc)"
            className={`h-10 inline-flex items-center gap-1.5 px-3 rounded-lg border-2 text-xs font-display font-bold active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isFinale100
                ? 'border-[#DC2626] bg-[#DC2626] text-[#F5F3EE] hover:bg-[#EAB308] hover:border-[#EAB308] hover:text-[#09090B]'
                : 'border-[#111111] bg-[#111111] text-[#F5F3EE] hover:bg-[#DC2626] hover:border-[#DC2626]'
            }`}
          >
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </div>
      </div>

        {/* Persistent Corner Death Counter (constant reminder of total & level fails during active play) */}
        {!paused && (
          <div className="pointer-events-none absolute right-0 top-[54px] sm:top-[60px] z-20 safe-px sm:px-6 flex justify-end">
            <div
              key={`death-counter-${deathPulseId}`}
              aria-label={`Total failures: ${totalDeathsGlobal}, Level failures: ${hud.levelDeaths}`}
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border font-mono-tabular transition-colors ${
                deathPulseId > 0 ? 'animate-taunt-slam ' : ''
              }${
                isFinale100
                  ? 'bg-[#0E0C0D]/95 border-[#DC2626]/70 shadow-[2px_2px_0px_rgba(220,38,38,0.35)]'
                  : totalDeathsGlobal > 0
                    ? 'bg-[#F5F3EE]/95 border-[#DC2626]/55 shadow-[2px_2px_0px_rgba(220,38,38,0.2)]'
                    : 'bg-[#F5F3EE]/95 border-[#111111]/20 shadow-[2px_2px_0px_rgba(17,17,17,0.1)]'
              }`}
            >
              <Skull
                className={`w-3.5 h-3.5 shrink-0 ${
                  totalDeathsGlobal > 0 || isFinale100 ? 'text-[#DC2626]' : 'text-[#57534E]'
                }`}
              />
              <div className="flex items-baseline gap-1.5 leading-none">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    isFinale100 ? 'text-[#A8A29E]' : 'text-[#57534E]'
                  }`}
                >
                  Fails
                </span>
                <span
                  className={`text-sm sm:text-base font-extrabold ${
                    totalDeathsGlobal > 0
                      ? 'text-[#DC2626]'
                      : isFinale100
                        ? 'text-[#F5F3EE]'
                        : 'text-[#111111]'
                  }`}
                >
                  {totalDeathsGlobal}
                </span>
              </div>
              <span
                aria-hidden="true"
                className={`h-3 w-px ${isFinale100 ? 'bg-[#F5F3EE]/20' : 'bg-[#111111]/15'}`}
              />
              <div
                className={`flex items-baseline gap-1 leading-none text-[10px] sm:text-[11px] ${
                  isFinale100 ? 'text-[#A8A29E]' : 'text-[#57534E]'
                }`}
              >
                <span>Lv</span>
                <span
                  className={`font-bold ${
                    hud.levelDeaths > 0
                      ? isFinale100
                        ? 'text-[#EAB308]'
                        : 'text-[#111111]'
                      : isFinale100
                        ? 'text-[#D6D3D1]'
                        : 'text-[#57534E]'
                  }`}
                >
                  {hud.levelDeaths}
                </span>
              </div>
              {hud.levelDeathStreak >= 5 && (
                <>
                  <span
                    aria-hidden="true"
                    className={`h-3 w-px ${isFinale100 ? 'bg-[#F5F3EE]/20' : 'bg-[#111111]/15'}`}
                  />
                  <span className="text-[10px] font-bold text-[#DC2626] leading-none">
                    {hud.levelDeathStreak}x
                  </span>
                </>
              )}
              {extraLives > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className={`h-3 w-px ${isFinale100 ? 'bg-[#F5F3EE]/20' : 'bg-[#111111]/15'}`}
                  />
                  <span
                    title="Extra lives ready for exact-location respawn"
                    className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold text-[#DC2626] leading-none"
                  >
                    <Heart className="w-3 h-3 fill-[#DC2626] text-[#DC2626]" />
                    {extraLives}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Context-Aware Sarcastic Death Taunt Pop-Up Bubble & Prank Banner */}
        <div className="pointer-events-none absolute inset-x-0 top-14 sm:top-14 z-30 flex flex-col items-center gap-1.5 px-4">
          <DeathTauntBubble isFinale100={isFinale100} />
          {hud.prankBanner && (
            <div
              key={`prank-${hud.prankBannerId}`}
              className="animate-commentary-mock max-w-md text-center px-3.5 py-1 rounded-lg bg-[#FFFFFF] text-[#DC2626] border-2 border-[#111111] shadow-[3px_3px_0px_rgba(17,17,17,0.2)] text-[11px] sm:text-xs font-mono-tabular font-bold"
            >
              {hud.prankBanner}
            </div>
          )}
        </div>

        {/* Floating 'Ask for Hint' / 'View Hint' HUD Button driven by `hintDisplay` (strictly Levels 1–50; blinks for 10s when locked, never auto-shows hint text) */}
        {hintDisplay.showFloatingButton &&
          hud.obstacleHint && (() => {
            const activeHint = hud.obstacleHint;

            return (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 sm:bottom-4 z-[21] flex flex-col items-center gap-1.5 px-3">
                {!hintDisplay.canShowLevelHint ? (
                  <button
                    key={`hint-btn-${activeHint.obstacleKey}-${hintNotifyBurstId}`}
                    type="button"
                    disabled={hintAdLoading}
                    onClick={handleOpenHintModal}
                    aria-label="Ask for Hint — open Get Hint modal and watch a rewarded ad to unlock the hint"
                    className={`pointer-events-auto relative inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 rounded-xl border-2 bg-[#F5F3EE]/96 text-[#111111] hover:border-[#DC2626] hover:bg-[#FFFFFF] active:scale-[0.98] transition-colors cursor-pointer shadow-[0_4px_14px_rgba(17,17,17,0.16),2px_2px_0px_rgba(220,38,38,0.28)] ${
                      showTouchControls ? 'max-w-[min(320px,46vw)]' : 'max-w-md'
                    } ${
                      hintAdLoading
                        ? 'border-[#DC2626]/55 opacity-65 cursor-wait'
                        : hintDisplay.shouldBlink
                          ? 'border-[#DC2626]/80 animate-hint-available'
                          : 'border-[#DC2626]/60'
                    }`}
                  >
                    {hintDisplay.shouldBlink && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-xl border-2 border-[#DC2626]/60 animate-hint-sonar"
                      />
                    )}
                    <span className="relative inline-flex items-center justify-center shrink-0">
                      <Lightbulb className="w-3.5 h-3.5 text-[#DC2626]" />
                      {hintDisplay.shouldBlink && (
                        <span
                          aria-hidden="true"
                          className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5"
                        >
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DC2626] opacity-80" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#DC2626]" />
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-mono-tabular font-extrabold text-[#111111] whitespace-nowrap">
                      Ask for Hint
                    </span>
                    <span aria-hidden="true" className="text-[#A8A29E]">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono-tabular font-semibold text-[#DC2626] whitespace-nowrap">
                      <Play className="w-2.5 h-2.5 fill-[#DC2626] text-[#DC2626]" />
                      <span>Watch Ad ({activeHint.deathsOnObstacle}×)</span>
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={hintAdLoading}
                    onClick={handleOpenHintModal}
                    aria-label="Hint — view the hint you already unlocked for this level"
                    className={`pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-[#111111]/35 bg-[#F5F3EE]/96 text-[#111111] hover:border-[#DC2626] hover:text-[#DC2626] active:scale-[0.98] transition-colors cursor-pointer shadow-[0_3px_10px_rgba(17,17,17,0.12),2px_2px_0px_rgba(17,17,17,0.16)] ${
                      showTouchControls ? 'max-w-[min(320px,46vw)]' : 'max-w-md'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-mono-tabular font-extrabold whitespace-nowrap">
                      Hint
                    </span>
                    <span aria-hidden="true" className="text-[#A8A29E]">
                      ·
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-mono-tabular font-semibold text-[#57534E] whitespace-nowrap">
                      Unlocked
                    </span>
                  </button>
                )}
              </div>
            );
          })()}

        {/* Mobile Landscape Touch Controls (Medium-large ergonomic thumb targets, high-contrast, multi-touch safe) */}
        {showTouchControls && !paused && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between safe-px sm:px-8 pb-3.5 sm:pb-6">
            {/* Left (Backward) & Right (Forward) directional buttons */}
            <div className="pointer-events-auto flex items-center gap-3.5 sm:gap-4">
              <button
                type="button"
                aria-label="Move Left"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setLeft(true);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  setLeft(false);
                }}
                onPointerCancel={() => setLeft(false)}
                onLostPointerCapture={() => setLeft(false)}
                className={`touch-none h-[74px] w-[74px] sm:h-[82px] sm:w-[82px] rounded-2xl border-[2.5px] flex flex-col items-center justify-center transition-all ${
                  touchState.left
                    ? 'bg-[#111111] text-[#F5F3EE] border-[#111111] translate-y-0.5 scale-95 shadow-none'
                    : 'bg-[#FFFFFF]/95 text-[#111111] border-[#111111] shadow-[0_3px_0_rgba(17,17,17,0.85)]'
                }`}
              >
                <ArrowLeft className="w-8 h-8 stroke-[2.5]" />
                <span className="text-[10px] font-mono-tabular font-bold leading-none mt-0.5 tracking-wide">
                  BACK
                </span>
              </button>

              <button
                type="button"
                aria-label="Move Right"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setRight(true);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  setRight(false);
                }}
                onPointerCancel={() => setRight(false)}
                onLostPointerCapture={() => setRight(false)}
                className={`touch-none h-[74px] w-[74px] sm:h-[82px] sm:w-[82px] rounded-2xl border-[2.5px] flex flex-col items-center justify-center transition-all ${
                  touchState.right
                    ? 'bg-[#111111] text-[#F5F3EE] border-[#111111] translate-y-0.5 scale-95 shadow-none'
                    : 'bg-[#FFFFFF]/95 text-[#111111] border-[#111111] shadow-[0_3px_0_rgba(17,17,17,0.85)]'
                }`}
              >
                <ArrowRight className="w-8 h-8 stroke-[2.5]" />
                <span className="text-[10px] font-mono-tabular font-bold leading-none mt-0.5 tracking-wide">
                  GO
                </span>
              </button>
            </div>

            {/* Jump button (supports holding for variable jump height) */}
            <div className="pointer-events-auto">
              <button
                type="button"
                aria-label="Jump"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setJump(true);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  setJump(false);
                }}
                onPointerCancel={() => setJump(false)}
                onLostPointerCapture={() => setJump(false)}
                className={`touch-none h-[82px] w-[82px] sm:h-[90px] sm:w-[90px] rounded-full border-[2.5px] flex flex-col items-center justify-center transition-all ${
                  touchState.jump
                    ? 'bg-[#DC2626] text-white border-[#DC2626] translate-y-0.5 scale-95 shadow-none'
                    : 'bg-[#111111]/95 text-[#F5F3EE] border-[#FFFFFF]/90 ring-2 ring-[#111111] shadow-[0_3px_0_#DC2626]'
                }`}
              >
                <ArrowUp className="w-8 h-8 stroke-[2.6]" />
                <span className="text-[11px] font-mono-tabular font-bold leading-none mt-0.5 tracking-wide">
                  JUMP
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 'Get Hint' Modal Component driven by `hintDisplay` (Strictly Levels 1–50: Rewarded Ad unlocks hint, and already-taken hints can be re-viewed anytime on that level) */}
      {hintDisplay.enabled && activeHintModalTarget && (
        <GetHintModal
          isOpen={hintModalOpen}
          levelId={hud.levelId}
          levelNumPadded={levelNumPadded}
          levelName={hud.levelName}
          sarcasticHint={activeHintModalTarget.sarcasticHint}
          clueText={activeHintModalTarget.clueText}
          adaptiveNote={hud.adaptiveHint ?? activeHintModalTarget.adaptiveText}
          deathsOnObstacle={activeHintModalTarget.deathsOnObstacle}
          isUnlocked={
            hintDisplay.canShowLevelHint ||
            Boolean(localUsedHintsByLevel[activeHintModalTarget.levelId])
          }
          isReviewingSavedHint={isReviewingSavedHint}
          isAdLoading={hintAdLoading}
          adNotice={hintAdNotice}
          onWatchAd={() => void handleWatchHintAd()}
          onClose={handleCloseHintModal}
        />
      )}

      {/* Rewarded-Ad-Gated 'Illuminate Ahead' Modal (Darkness Levels Only) */}
      {isDarkLevel && (
        <LightBoostModal
          isOpen={lightBoostModalOpen}
          levelNumPadded={levelNumPadded}
          levelName={hud.levelName}
          isBoostActive={isLightBoostActiveForLevel}
          isAdLoading={lightBoostAdLoading}
          adNotice={lightBoostAdNotice}
          onWatchAd={() => void handleWatchLightBoostAd()}
          onClose={handleCloseLightBoostModal}
        />
      )}

      {/* Crimson Edge Impact Flash on Hazard Hit / Death */}
      {impactFlashId > 0 && (
        <div
          key={`impact-${impactFlashId}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 animate-impact-flash shadow-[inset_0_0_56px_12px_rgba(220,38,38,0.55)] border-[3px] border-[#DC2626]/70"
        />
      )}
    </div>
  );
}
