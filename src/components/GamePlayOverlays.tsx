import { Award, Grid, Home, Play, RotateCcw, Settings } from 'lucide-react';
import { audioManager } from '../engine/audio';
import type { AchievementDef } from '../types/game';

export { LevelCompleteModal } from './LevelCompleteModal';

interface PauseModalProps {
  levelLabel: string;
  levelName: string;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenLevels: () => void;
  onMainMenu: () => void;
}

export function PauseModal({
  levelLabel,
  levelName,
  onResume,
  onRestart,
  onOpenSettings,
  onOpenLevels,
  onMainMenu,
}: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#111111]/60 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
    >
      <div className="w-full max-w-xl max-h-[92%] overflow-y-auto touch-pan-y rounded-xl bg-[#F5F3EE] border-2 border-[#111111] shadow-[6px_6px_0px_#111111] p-4 sm:p-6 text-[#111111]">
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {/* Left horizontal column: Level status & primary Resume CTA */}
          <div className="col-span-5 flex flex-col justify-between pr-3 border-r border-[#111111]/12">
            <div>
              <div className="text-[11px] font-mono-tabular font-semibold text-[#DC2626] uppercase">
                PAUSED · {levelLabel}
              </div>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight leading-tight mt-1">
                {levelName}
              </h2>
              <p className="text-xs text-[#57534E] mt-1.5">
                Take a deep breath. The spikes will wait.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                audioManager.playButtonClick();
                onResume();
              }}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-sm shadow-[2px_2px_0px_#DC2626] hover:bg-[#DC2626] transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Resume
            </button>
          </div>

          {/* Right horizontal column: 2x2 action grid */}
          <div className="col-span-7 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                audioManager.playButtonClick();
                onRestart();
              }}
              className="flex flex-col items-start justify-between p-3 rounded-lg border-2 border-[#111111] bg-[#FFFFFF] text-[#111111] font-semibold text-xs sm:text-sm hover:bg-[#111111] hover:text-[#F5F3EE] transition-colors cursor-pointer text-left"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="mt-3 font-display font-bold">Restart Level</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioManager.playButtonClick();
                onOpenSettings();
              }}
              className="flex flex-col items-start justify-between p-3 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] text-[#111111] font-semibold text-xs sm:text-sm hover:border-[#111111] transition-colors cursor-pointer text-left"
            >
              <Settings className="w-4 h-4" />
              <span className="mt-3 font-display font-bold">Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioManager.playButtonClick();
                onOpenLevels();
              }}
              className="flex flex-col items-start justify-between p-3 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] text-[#111111] font-semibold text-xs sm:text-sm hover:border-[#111111] transition-colors cursor-pointer text-left"
            >
              <Grid className="w-4 h-4" />
              <span className="mt-3 font-display font-bold">Levels</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioManager.playButtonClick();
                onMainMenu();
              }}
              className="flex flex-col items-start justify-between p-3 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] text-[#111111] font-semibold text-xs sm:text-sm hover:border-[#111111] transition-colors cursor-pointer text-left"
            >
              <Home className="w-4 h-4" />
              <span className="mt-3 font-display font-bold">Home Screen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AchievementToastProps {
  achievement: AchievementDef | null;
}

export function AchievementToast({ achievement }: AchievementToastProps) {
  if (!achievement) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#111111] text-[#F5F3EE] border border-[#DC2626]">
        <Award className="w-4 h-4 text-[#DC2626] shrink-0" />
        <div className="text-xs">
          <span className="font-display font-bold">{achievement.title}</span>
          <span className="text-[#D6D1C7]"> · {achievement.description}</span>
        </div>
      </div>
    </div>
  );
}
