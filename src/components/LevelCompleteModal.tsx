import { ArrowRight, Grid, Home, RotateCcw, Trophy } from 'lucide-react';
import { useEffect } from 'react';
import { getCrueltyTier } from '../data/deathMessages';
import { getLevelCompleteTaunt, getPerformanceJab } from '../data/levelCompleteTaunts';
import { getLevelById } from '../data/levels';
import { audioManager } from '../engine/audio';
import { formatTimeMs } from '../engine/saveManager';
import type { LevelCompletePayload } from '../types/game';

export type LeaderboardSyncStatus =
  | 'idle'
  | 'syncing'
  | 'submitted'
  | 'existing_faster'
  | 'unauthenticated'
  | 'error';

export interface LevelCompleteModalProps {
  payload: LevelCompletePayload;
  isFinalLevel: boolean;
  leaderboardSyncStatus?: LeaderboardSyncStatus;
  onOpenLeaderboards?: () => void;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevels: () => void;
  onMainMenu: () => void;
}

const CRUELTY_LABELS: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: 'STICKMAN VERDICT · SMUG',
  2: 'STICKMAN VERDICT · CONDESCENDING',
  3: 'STICKMAN VERDICT · BRUTAL',
  4: 'STICKMAN VERDICT · ICE COLD',
  5: 'STICKMAN VERDICT · MERCILESS',
  6: 'STICKMAN VERDICT · PURE SAVAGERY',
};

export function LevelCompleteModal({
  payload,
  isFinalLevel,
  leaderboardSyncStatus = 'idle',
  onOpenLeaderboards,
  onNextLevel,
  onReplay,
  onOpenLevels,
  onMainMenu,
}: LevelCompleteModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        audioManager.playButtonClick();
        if (isFinalLevel) onMainMenu();
        else onNextLevel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFinalLevel, onMainMenu, onNextLevel]);

  const level = getLevelById(payload.levelId);
  const tier = getCrueltyTier(payload.levelId);
  const uniqueTaunt = getLevelCompleteTaunt(payload.levelId);
  const performanceJab = getPerformanceJab(payload.levelId, payload.levelDeaths);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#111111]/65 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Level Complete"
    >
      <div className="w-full max-w-2xl max-h-[92%] overflow-y-auto touch-pan-y rounded-xl bg-[#F5F3EE] border-2 border-[#111111] shadow-[6px_6px_0px_#111111] p-4 sm:p-6 text-[#111111]">
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {/* Left horizontal column: Victory headline, unique escalating level taunt & achievements */}
          <div className="col-span-6 flex flex-col justify-between pr-3 border-r border-[#111111]/12">
            <div>
              <div className="text-[11px] font-mono-tabular text-[#DC2626] font-bold">
                {isFinalLevel
                  ? 'RARE MOMENT · LEVEL 100 CONQUERED'
                  : `LEVEL ${String(level.id).padStart(2, '0')} CLEARED`}
              </div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight leading-tight mt-1">
                {isFinalLevel ? 'ABSOLUTE PEAK ACHIEVED.' : level.name}
              </h2>

              {/* Unique per-level escalating cruelty taunt card */}
              <div
                className={`mt-2.5 p-2.5 rounded-lg border-l-[3px] ${
                  isFinalLevel
                    ? 'bg-[#111111] text-[#F5F3EE] border-[#DC2626]'
                    : tier >= 4
                      ? 'bg-[#FFFFFF] text-[#111111] border-[#DC2626]'
                      : 'bg-[#FFFFFF] text-[#111111] border-[#111111]'
                }`}
              >
                <div className="text-[9px] sm:text-[10px] font-mono-tabular font-bold tracking-wide text-[#DC2626]">
                  {isFinalLevel ? 'STICKMAN VERDICT · SPEECHLESS' : CRUELTY_LABELS[tier]}
                </div>
                <p
                  className={`text-xs sm:text-[13px] font-semibold mt-1 leading-snug ${
                    isFinalLevel ? 'text-[#F5F3EE]' : 'text-[#111111]'
                  }`}
                >
                  &ldquo;{uniqueTaunt}&rdquo;
                </p>
                {performanceJab && (
                  <p
                    className={`text-[11px] mt-1 leading-snug ${
                      isFinalLevel ? 'text-[#D6D1C7]' : 'text-[#57534E]'
                    }`}
                  >
                    {performanceJab}
                  </p>
                )}
              </div>
            </div>

            {payload.newlyUnlockedAchievements.length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-[#FFFFFF] border border-[#111111]/15">
                <div className="text-[10px] font-mono-tabular font-bold text-[#DC2626] mb-0.5">
                  ACHIEVEMENT UNLOCKED
                </div>
                {payload.newlyUnlockedAchievements.map((a) => (
                  <div key={a.id} className="text-xs font-semibold leading-snug">
                    {a.title} — <span className="font-normal text-[#57534E]">{a.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right horizontal column: Metrics row + actions */}
          <div className="col-span-6 flex flex-col justify-between gap-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#111111]/12">
                <div className="text-[10px] text-[#57534E]">Time</div>
                <div className="font-mono-tabular font-bold text-sm sm:text-base mt-0.5">
                  {formatTimeMs(payload.elapsedMs)}
                </div>
                {payload.isNewBestTime && (
                  <div className="text-[10px] font-bold text-[#DC2626]">Best!</div>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#111111]/12">
                <div className="text-[10px] text-[#57534E]">Deaths</div>
                <div className="font-mono-tabular font-bold text-sm sm:text-base mt-0.5">
                  {payload.levelDeaths}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#111111]/12">
                <div className="text-[10px] text-[#57534E]">Jumps</div>
                <div className="font-mono-tabular font-bold text-sm sm:text-base mt-0.5">
                  {payload.jumpsUsed}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {!isFinalLevel ? (
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    onNextLevel();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-sm shadow-[2px_2px_0px_#DC2626] hover:bg-[#DC2626] transition-colors cursor-pointer"
                >
                  {payload.levelId === 99 ? 'Enter Level 100 (Good Luck)' : 'Next Level'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    onMainMenu();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-sm hover:bg-[#DC2626] transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  Return to Home
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    onReplay();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] text-xs font-semibold hover:border-[#111111] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Replay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    onOpenLevels();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] text-xs font-semibold hover:border-[#111111] cursor-pointer"
                >
                  <Grid className="w-3.5 h-3.5" />
                  Levels
                </button>
              </div>

              {onOpenLeaderboards && (
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    onOpenLeaderboards();
                  }}
                  className="w-full inline-flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-[#DC2626]/45 bg-[#FFFFFF] text-xs font-semibold text-[#111111] hover:border-[#DC2626] transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span>Global Leaderboard</span>
                  </span>
                  <span className="text-[10px] font-mono-tabular text-[#57534E]">
                    {leaderboardSyncStatus === 'syncing'
                      ? 'Syncing...'
                      : leaderboardSyncStatus === 'submitted'
                        ? 'Synced!'
                        : leaderboardSyncStatus === 'existing_faster'
                          ? 'PB Kept'
                          : leaderboardSyncStatus === 'unauthenticated'
                            ? 'Sign in to rank'
                            : 'Compare'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
