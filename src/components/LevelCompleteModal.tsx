import { ArrowRight, Award, Grid, Home, RotateCcw, Trophy } from 'lucide-react';
import { useEffect } from 'react';
import { getCrueltyTier } from '../data/deathMessages';
import { getDifficultyStage } from '../data/difficultyStages';
import { getLevelCompleteTaunt, getPerformanceJab } from '../data/levelCompleteTaunts';
import { getLevelById } from '../data/levels';
import { audioManager } from '../engine/audio';
import { formatTimeMs } from '../engine/saveManager';
import type { LevelCompletePayload } from '../types/game';

export interface LevelCompleteModalProps {
  payload: LevelCompletePayload;
  isFinalLevel: boolean;
  totalDeathsGlobal?: number;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevels: () => void;
  onMainMenu: () => void;
}

const CRUELTY_LABELS: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: 'STICKMAN VERDICT · MOCKING',
  2: 'STICKMAN VERDICT · SARCASTIC',
  3: 'STICKMAN VERDICT · BRUTAL',
  4: 'STICKMAN VERDICT · RUTHLESS',
  5: 'STICKMAN VERDICT · MERCILESS',
  6: 'STICKMAN VERDICT · MAXIMUM CRUELTY',
};

export function LevelCompleteModal({
  payload,
  isFinalLevel,
  totalDeathsGlobal,
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
  const stage = getDifficultyStage(payload.levelId);
  const tier = getCrueltyTier(payload.levelId);
  const uniqueTaunt = getLevelCompleteTaunt(payload.levelId);
  const performanceJab = getPerformanceJab(payload.levelId, payload.levelDeaths);

  // Special Collector-Grade Rare Victory Screen for Level 100
  if (isFinalLevel) {
    return (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-[#07070A]/85 p-3 sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-label="Rare Victory — Level 100 Complete"
      >
        <div className="w-full max-w-2xl max-h-[92%] overflow-y-auto touch-pan-y rounded-xl bg-[#111111] border-2 border-[#DC2626] shadow-[6px_6px_0px_#DC2626] p-4 sm:p-6 text-[#F5F3EE]">
          <div className="grid grid-cols-12 gap-4 items-stretch">
            {/* Left Column: Headline, Speechless Stickman Verdict & Rare Achievement */}
            <div className="col-span-12 sm:col-span-7 flex flex-col justify-between sm:pr-4 sm:border-r sm:border-[#F5F3EE]/15">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono-tabular font-extrabold tracking-widest text-[#F59E0B] uppercase">
                  <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>RARE VICTORY · LEVEL 100 · ZERO CHECKPOINTS</span>
                </div>
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight leading-[1.08] text-[#F5F3EE] mt-1.5">
                  WAIT. YOU ACTUALLY BEAT THE GAME?
                </h2>

                <div className="mt-3 p-3 rounded-lg bg-[#1A1A1F] border-l-[3px] border-[#DC2626]">
                  <div className="text-[10px] font-mono-tabular font-bold tracking-wider text-[#DC2626]">
                    STICKMAN VERDICT · SPEECHLESS
                  </div>
                  <p className="text-xs sm:text-[13px] font-semibold mt-1 leading-snug text-[#F5F3EE]">
                    &ldquo;{uniqueTaunt}&rdquo;
                  </p>
                  {performanceJab && (
                    <p className="text-[11px] mt-1.5 leading-snug text-[#D6D1C7]">
                      {performanceJab}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-[#1A1710] border border-[#F59E0B]/45">
                <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular font-extrabold tracking-wider text-[#F59E0B] mb-0.5">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>RARE ACHIEVEMENT EARNED</span>
                </div>
                {payload.newlyUnlockedAchievements.length > 0 ? (
                  payload.newlyUnlockedAchievements.map((a) => (
                    <div key={a.id} className="text-xs font-semibold leading-snug text-[#F5F3EE]">
                      {a.title} —{' '}
                      <span className="font-normal text-[#D6D1C7]">{a.description}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-semibold leading-snug text-[#F5F3EE]">
                    WAIT. YOU ACTUALLY BEAT THE GAME? —{' '}
                    <span className="font-normal text-[#D6D1C7]">
                      Conquered Level 100: The Last Level with zero checkpoints and zero hints.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Final Telemetry + Actions */}
            <div className="col-span-12 sm:col-span-5 flex flex-col justify-between gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-[#1A1A1F] border border-[#F5F3EE]/12">
                  <div className="text-[10px] text-[#A8A29E]">Clear Time</div>
                  <div className="font-mono-tabular font-bold text-sm sm:text-base mt-0.5 text-[#F5F3EE]">
                    {formatTimeMs(payload.elapsedMs)}
                  </div>
                  {payload.isNewBestTime && (
                    <div className="text-[10px] font-bold text-[#F59E0B]">New Best!</div>
                  )}
                </div>
                <div className="p-2.5 rounded-lg bg-[#1A1A1F] border border-[#F5F3EE]/12">
                  <div className="text-[10px] text-[#A8A29E]">Lv.100 Deaths</div>
                  <div className="font-mono-tabular font-bold text-sm sm:text-base mt-0.5 text-[#DC2626]">
                    {payload.levelDeaths}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#1A1A1F] border border-[#F5F3EE]/12">
                  <div className="text-[10px] text-[#A8A29E]">Jumps</div>
                  <div className="font-mono-tabular font-bold text-sm sm:text-base mt-0.5 text-[#F5F3EE]">
                    {payload.jumpsUsed}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#1A1A1F] border border-[#F5F3EE]/12">
                  <div className="text-[10px] text-[#A8A29E]">Career Deaths</div>
                  <div className="font-mono-tabular font-bold text-sm sm:text-base mt-0.5 text-[#F5F3EE]">
                    {totalDeathsGlobal ?? payload.levelDeaths}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    onMainMenu();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#DC2626] text-[#F5F3EE] font-display font-bold text-sm hover:bg-[#EF4444] transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  Return to Home
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playButtonClick();
                      onReplay();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#F5F3EE]/25 bg-[#1A1A1F] text-[#F5F3EE] text-xs font-semibold hover:border-[#F5F3EE] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Replay 100
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playButtonClick();
                      onOpenLevels();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#F5F3EE]/25 bg-[#1A1A1F] text-[#F5F3EE] text-xs font-semibold hover:border-[#F5F3EE] cursor-pointer"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    Levels
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                LEVEL {String(level.id).padStart(2, '0')} CLEARED · {stage.name.toUpperCase()}
              </div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight leading-tight mt-1">
                {level.name}
              </h2>

              {/* Unique per-level escalating cruelty taunt card */}
              <div
                className={`mt-2.5 p-2.5 rounded-lg border-l-[3px] ${
                  tier >= 4
                    ? 'bg-[#FFFFFF] text-[#111111] border-[#DC2626]'
                    : 'bg-[#FFFFFF] text-[#111111] border-[#111111]'
                }`}
              >
                <div className="text-[9px] sm:text-[10px] font-mono-tabular font-bold tracking-wide text-[#DC2626]">
                  {CRUELTY_LABELS[tier]}
                </div>
                <p className="text-xs sm:text-[13px] font-semibold mt-1 leading-snug text-[#111111]">
                  &ldquo;{uniqueTaunt}&rdquo;
                </p>
                {performanceJab && (
                  <p className="text-[11px] mt-1 leading-snug text-[#57534E]">
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
              <button
                type="button"
                onClick={() => {
                  audioManager.playButtonClick();
                  onNextLevel();
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-sm shadow-[2px_2px_0px_#DC2626] hover:bg-[#DC2626] transition-colors cursor-pointer"
              >
                {payload.levelId === 99 ? 'Enter Level 100 (The Last Level)' : 'Next Level'}
                <ArrowRight className="w-4 h-4" />
              </button>

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
