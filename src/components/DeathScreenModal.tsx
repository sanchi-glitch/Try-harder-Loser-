import { Heart, Home, Loader2, Play, RotateCcw, Skull, Tv } from 'lucide-react';
import { MAX_REWARDED_ADS_PER_DEATH } from '../engine/adMobService';
import { audioManager } from '../engine/audio';
import type { DeathLocationSnapshot } from '../types/game';

interface DeathScreenModalProps {
  snapshot: DeathLocationSnapshot;
  levelLabel: string;
  levelName: string;
  extraLives: number;
  adsWatchedThisDeath: number;
  adLoading: boolean;
  adStatusMessage: string | null;
  onWatchRewardedAd: () => void;
  onRespawnWithExtraLife: () => void;
  onRestartLevel: () => void;
  onReturnToMenu: () => void;
}

const SARCASTIC_SUBLINES = [
  'Skill issue. Want another chance?',
  'Gravity and spikes remain undefeated. Need a lifeline?',
  'That was painful to watch. Want to pretend it never happened?',
  'Even the stickman is judging you. Take an extra life?',
];

export function DeathScreenModal({
  snapshot,
  levelLabel,
  levelName,
  extraLives,
  adsWatchedThisDeath,
  adLoading,
  adStatusMessage,
  onWatchRewardedAd,
  onRespawnWithExtraLife,
  onRestartLevel,
  onReturnToMenu,
}: DeathScreenModalProps) {
  const remainingAds = Math.max(0, MAX_REWARDED_ADS_PER_DEATH - adsWatchedThisDeath);
  const canWatchMoreAds = remainingAds > 0 && !adLoading;
  const subline =
    SARCASTIC_SUBLINES[(snapshot.levelDeaths + snapshot.levelId) % SARCASTIC_SUBLINES.length];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#111111]/65 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="You Died"
    >
      <div className="w-full max-w-2xl max-h-[94%] overflow-y-auto touch-pan-y rounded-xl bg-[#F5F3EE] border-2 border-[#111111] shadow-[6px_6px_0px_#111111] p-4 sm:p-6 text-[#111111]">
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {/* Left column: Sarcastic death roast & live Extra Life counter */}
          <div className="col-span-5 flex flex-col justify-between pr-3 border-r border-[#111111]/12">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono-tabular font-bold text-[#DC2626] uppercase tracking-wide">
                <Skull className="w-3.5 h-3.5 shrink-0" />
                <span>{levelLabel}</span>
              </div>

              <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight leading-none text-[#111111] mt-1.5">
                HAHA! YOU DIED.
              </h2>

              <p className="text-xs sm:text-sm font-semibold text-[#DC2626] mt-1.5 leading-snug">
                {subline}
              </p>

              <p className="text-[11px] sm:text-xs text-[#57534E] mt-2 leading-snug italic">
                &ldquo;{snapshot.deathMessage}&rdquo;
              </p>
            </div>

            {/* Extra-Life Bank & Death Telemetry */}
            <div className="mt-4 pt-3 border-t border-[#111111]/12 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-tabular">
                <span className="text-[#57534E] font-semibold">EXTRA LIVES</span>
                <span
                  className={`inline-flex items-center gap-1 font-extrabold ${
                    extraLives > 0 ? 'text-[#DC2626]' : 'text-[#111111]'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${extraLives > 0 ? 'fill-[#DC2626] text-[#DC2626]' : 'text-[#57534E]'}`}
                  />
                  {extraLives}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#57534E]">
                <span>ADS THIS DEATH</span>
                <span className="font-bold text-[#111111]">
                  {adsWatchedThisDeath}/{MAX_REWARDED_ADS_PER_DEATH}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#57534E]">
                <span>LEVEL FAILS</span>
                <span className="font-bold text-[#111111]">
                  {snapshot.levelDeaths}
                  {snapshot.levelDeathStreak >= 5 ? ` · ${snapshot.levelDeathStreak}x streak` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Right column: Voluntary Rewarded Ad, Exact Respawn, Restart, Return to Menu */}
          <div className="col-span-7 flex flex-col justify-between gap-2.5">
            <div className="space-y-2.5">
              {/* Primary Respawn CTA appears immediately once >= 1 Extra Life is earned */}
              {extraLives > 0 && (
                <button
                  type="button"
                  disabled={adLoading}
                  onClick={() => {
                    audioManager.playButtonClick();
                    onRespawnWithExtraLife();
                  }}
                  className="w-full inline-flex items-center justify-between gap-2 py-2.5 px-3.5 rounded-lg bg-[#DC2626] text-[#FFFFFF] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] hover:bg-[#B91C1C] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2 font-display font-extrabold text-xs sm:text-sm tracking-tight">
                    <Play className="w-4 h-4 fill-current shrink-0" />
                    RESPAWN AT DEATH SPOT
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-mono-tabular font-bold bg-[#111111]/25 px-2 py-0.5 rounded">
                    USE 1 LIFE ({extraLives})
                  </span>
                </button>
              )}

              {/* Voluntary Rewarded Ad button (1 ad = +1 extra life, up to 3 separately per death) */}
              <button
                type="button"
                disabled={!canWatchMoreAds}
                onClick={() => {
                  audioManager.playButtonClick();
                  onWatchRewardedAd();
                }}
                className={`w-full flex items-center justify-between gap-2 py-2.5 px-3.5 rounded-lg border-2 font-display font-bold text-xs sm:text-sm transition-all ${
                  canWatchMoreAds
                    ? 'bg-[#111111] text-[#F5F3EE] border-[#111111] shadow-[3px_3px_0px_#DC2626] hover:bg-[#DC2626] hover:shadow-[3px_3px_0px_#111111] active:translate-y-0.5 cursor-pointer'
                    : 'bg-[#E7E3D8] text-[#78716C] border-[#111111]/20 cursor-not-allowed'
                }`}
              >
                <span className="inline-flex items-center gap-2 text-left">
                  {adLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <Tv className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {adLoading
                      ? 'LOADING REWARDED AD...'
                      : remainingAds > 0
                        ? 'WATCH AD — GET EXTRA LIFE'
                        : 'MAX EXTRA LIVES CLAIMED (3/3)'}
                  </span>
                </span>
                {remainingAds > 0 && !adLoading && (
                  <span className="text-[10px] font-mono-tabular font-bold text-[#F5F3EE]/85 shrink-0">
                    +1 LIFE ({remainingAds} left)
                  </span>
                )}
              </button>

              <p className="text-[10px] sm:text-[11px] text-[#57534E] leading-snug">
                Respawns right where you died on <span className="font-semibold text-[#111111]">{levelName}</span>. Watch up to 3 ads separately (+1 life each), or decline and restart.
              </p>

              {adStatusMessage && (
                <div
                  role="status"
                  className="px-2.5 py-1.5 rounded-md bg-[#FFFFFF] border border-[#111111]/25 text-[11px] font-mono-tabular font-semibold text-[#111111]"
                >
                  {adStatusMessage}
                </div>
              )}
            </div>

            {/* Secondary action row: RESTART LEVEL & RETURN TO MENU */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={adLoading}
                onClick={() => {
                  audioManager.playButtonClick();
                  onRestartLevel();
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border-2 border-[#111111] bg-[#FFFFFF] text-[#111111] font-display font-bold text-xs sm:text-sm hover:bg-[#111111] hover:text-[#F5F3EE] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                RESTART LEVEL
              </button>

              <button
                type="button"
                disabled={adLoading}
                onClick={() => {
                  audioManager.playButtonClick();
                  onReturnToMenu();
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-[#111111]/30 bg-[#FFFFFF] text-[#111111] font-display font-bold text-xs sm:text-sm hover:border-[#111111] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Home className="w-3.5 h-3.5 shrink-0" />
                RETURN TO MENU
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
