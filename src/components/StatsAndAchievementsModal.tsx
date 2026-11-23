import { Check, Lock, X } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';
import { LEVELS } from '../data/levels';
import { adaptiveSystem } from '../engine/adaptiveSystem';
import { audioManager } from '../engine/audio';
import { formatPlaytime, formatTimeMs } from '../engine/saveManager';
import type { SaveData } from '../types/game';

interface StatsModalProps {
  save: SaveData;
  onClose: () => void;
}

export function StatsModal({ save, onClose }: StatsModalProps) {
  const completedEntries = Object.entries(save.levels).filter(([, p]) => p.completed);
  const levelsCompleted = completedEntries.length;

  // Fastest completion across all completed levels
  let fastest: { levelLabel: string; ms: number } | null = null;
  for (const [idStr, p] of completedEntries) {
    if (p.bestTimeMs !== null && (!fastest || p.bestTimeMs < fastest.ms)) {
      const lvl = LEVELS.find((l) => l.id === Number(idStr));
      fastest = {
        levelLabel: lvl ? `${lvl.chapter}-${lvl.levelInChapter} ${lvl.name}` : `Level ${idStr}`,
        ms: p.bestTimeMs,
      };
    }
  }

  // Most failed level
  let mostFailed: { levelLabel: string; deaths: number } | null = null;
  for (const [idStr, p] of Object.entries(save.levels)) {
    if (p.deaths > 0 && (!mostFailed || p.deaths > mostFailed.deaths)) {
      const lvl = LEVELS.find((l) => l.id === Number(idStr));
      mostFailed = {
        levelLabel: lvl ? `${lvl.chapter}-${lvl.levelInChapter} ${lvl.name}` : `Level ${idStr}`,
        deaths: p.deaths,
      };
    }
  }

  const adaptive = adaptiveSystem.getSnapshot();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Statistics"
    >
      <div className="w-full max-w-3xl max-h-[92%] overflow-y-auto touch-pan-y rounded-xl bg-[#F5F3EE] border-2 border-[#111111] shadow-[6px_6px_0px_#111111] p-4 sm:p-6 text-[#111111]">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#111111]/12">
          <h2 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight">
            Statistics
          </h2>
          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              onClose();
            }}
            aria-label="Close statistics"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#111111]/20 hover:border-[#111111] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4-column horizontal KPI row */}
        <div className="grid grid-cols-4 gap-3 py-4">
          <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#111111]/12">
            <div className="text-[11px] font-medium text-[#57534E]">Total Deaths</div>
            <div className="font-mono-tabular font-bold text-2xl sm:text-3xl mt-1 text-[#DC2626]">
              {save.totalDeaths}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#111111]/12">
            <div className="text-[11px] font-medium text-[#57534E]">Levels Cleared</div>
            <div className="font-mono-tabular font-bold text-2xl sm:text-3xl mt-1">
              {levelsCompleted}
              <span className="text-xs sm:text-sm text-[#78716C] font-normal">
                /{LEVELS.length}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#111111]/12">
            <div className="text-[11px] font-medium text-[#57534E]">Playtime</div>
            <div className="font-mono-tabular font-bold text-xl sm:text-2xl mt-1">
              {formatPlaytime(save.totalPlaytimeSeconds)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#FFFFFF] border border-[#111111]/12">
            <div className="text-[11px] font-medium text-[#57534E]">Tricks Triggered</div>
            <div className="font-mono-tabular font-bold text-xl sm:text-2xl mt-1">
              {save.tricksTriggered}
            </div>
          </div>
        </div>

        {/* 3-column horizontal summary bar */}
        <div className="grid grid-cols-3 gap-3 border-t border-[#111111]/12 pt-3.5 text-xs">
          <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#111111]/10">
            <div className="text-[#57534E] text-[11px]">Fastest Clear</div>
            <div className="font-mono-tabular font-semibold mt-0.5 truncate">
              {fastest ? `${formatTimeMs(fastest.ms)} · ${fastest.levelLabel}` : 'None yet'}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#111111]/10">
            <div className="text-[#57534E] text-[11px]">Most Failed</div>
            <div className="font-mono-tabular font-semibold mt-0.5 truncate">
              {mostFailed ? `${mostFailed.levelLabel} (${mostFailed.deaths}d)` : 'None yet'}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#111111]/10">
            <div className="text-[#57534E] text-[11px]">Detected Playstyle</div>
            <div className="font-semibold mt-0.5 truncate">{adaptive.playstyleLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AchievementsModalProps {
  save: SaveData;
  onClose: () => void;
}

export function AchievementsModal({ save, onClose }: AchievementsModalProps) {
  const unlockedSet = new Set(save.unlockedAchievements);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Achievements"
    >
      <div className="w-full max-w-4xl max-h-[92%] flex flex-col rounded-xl bg-[#F5F3EE] border-2 border-[#111111] shadow-[6px_6px_0px_#111111] p-4 sm:p-6 text-[#111111]">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#111111]/12 shrink-0">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight">
              Achievements
            </h2>
            <p className="text-xs font-mono-tabular text-[#57534E]">
              {unlockedSet.size} of {ACHIEVEMENTS.length} unlocked
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              onClose();
            }}
            aria-label="Close achievements"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#111111]/20 hover:border-[#111111] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-column horizontal achievement grid */}
        <div className="overflow-y-auto touch-pan-y grid grid-cols-2 gap-2.5 pt-3 pr-1">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = unlockedSet.has(ach.id);
            return (
              <div
                key={ach.id}
                className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                  unlocked
                    ? 'bg-[#FFFFFF] border-[#111111]/25 opacity-100'
                    : 'bg-[#EAE6DD]/60 border-[#111111]/10 opacity-65'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm leading-snug">{ach.title}</div>
                  <p className="text-[11px] text-[#44403C] mt-0.5 leading-snug">
                    {ach.description}
                  </p>
                  {unlocked && (
                    <p className="text-[11px] italic text-[#DC2626] mt-1">&ldquo;{ach.quip}&rdquo;</p>
                  )}
                </div>
                <div className="shrink-0 mt-0.5">
                  {unlocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono-tabular font-bold text-[#111111]">
                      <Check className="w-3.5 h-3.5 text-[#DC2626]" />
                      Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-[#78716C]">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
