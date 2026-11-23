import { Maximize2, Minimize2, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { audioManager } from '../engine/audio';
import type { GameSettings, TouchControlsMode } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  onUpdateSettings,
  onResetProgress,
  onClose,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    syncFs();
    document.addEventListener('fullscreenchange', syncFs);
    return () => document.removeEventListener('fullscreenchange', syncFs);
  }, []);

  const toggleFullscreen = async () => {
    audioManager.playButtonClick();
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen?.();
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (lockType: string) => Promise<void>;
        };
        await orientation?.lock?.('landscape');
      } catch {
        // Ignore if unsupported
      }
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const patch = (partial: Partial<GameSettings>) => {
    onUpdateSettings({ ...settings, ...partial });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="w-full max-w-3xl max-h-[92%] overflow-y-auto touch-pan-y rounded-xl bg-[#F5F3EE] border-2 border-[#111111] shadow-[6px_6px_0px_#111111] p-4 sm:p-6 text-[#111111]">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#111111]/12">
          <h2 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight">
            Settings
          </h2>
          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              onClose();
            }}
            aria-label="Close settings"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#111111]/20 hover:border-[#111111] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wide Horizontal 2-Column Settings Deck */}
        <div className="grid grid-cols-12 gap-5 pt-4">
          {/* Left column: Sliders & Touch Controls */}
          <div className="col-span-6 space-y-3.5 pr-4 border-r border-[#111111]/12">
            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-1.5">
                <label htmlFor="music-vol">Music Volume</label>
                <span className="font-mono-tabular text-xs text-[#57534E]">
                  {settings.muted ? 'Muted' : `${Math.round(settings.musicVolume * 100)}%`}
                </span>
              </div>
              <input
                id="music-vol"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.musicVolume}
                onChange={(e) => patch({ musicVolume: Number(e.target.value), muted: false })}
                className="w-full ink-slider"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-1.5">
                <label htmlFor="sfx-vol">Sound Effects</label>
                <span className="font-mono-tabular text-xs text-[#57534E]">
                  {settings.muted ? 'Muted' : `${Math.round(settings.sfxVolume * 100)}%`}
                </span>
              </div>
              <input
                id="sfx-vol"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfxVolume}
                onChange={(e) => {
                  patch({ sfxVolume: Number(e.target.value), muted: false });
                }}
                onPointerUp={() => audioManager.playButtonClick()}
                className="w-full ink-slider"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-1.5">
                <label htmlFor="ctrl-sens">Control Sensitivity</label>
                <span className="font-mono-tabular text-xs text-[#57534E]">
                  {Math.round(settings.controlSensitivity * 100)}%
                </span>
              </div>
              <input
                id="ctrl-sens"
                type="range"
                min={0.7}
                max={1.4}
                step={0.05}
                value={settings.controlSensitivity}
                onChange={(e) => patch({ controlSensitivity: Number(e.target.value) })}
                className="w-full ink-slider"
              />
            </div>

            <div className="pt-1">
              <div className="text-xs sm:text-sm font-semibold mb-1.5">
                On-Screen Touch Controls
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['auto', 'always', 'hidden'] as TouchControlsMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      audioManager.playButtonClick();
                      patch({ touchControls: mode });
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-semibold border transition-colors cursor-pointer capitalize ${
                      settings.touchControls === mode
                        ? 'bg-[#111111] text-[#F5F3EE] border-[#111111]'
                        : 'bg-[#FFFFFF] text-[#111111] border-[#111111]/20 hover:border-[#111111]'
                    }`}
                  >
                    {mode === 'always' ? 'Always On' : mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Toggles & Save Reset */}
          <div className="col-span-6 flex flex-col justify-between gap-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs sm:text-sm font-semibold">Mute All Audio</div>
                  <div className="text-[11px] text-[#57534E]">Silence music &amp; SFX</div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ muted: !settings.muted })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors shrink-0 ${
                    settings.muted
                      ? 'bg-[#DC2626] text-white border-[#DC2626]'
                      : 'bg-[#FFFFFF] text-[#111111] border-[#111111]/25'
                  }`}
                >
                  {settings.muted ? 'Muted' : 'Active'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs sm:text-sm font-semibold">Haptic Vibration</div>
                  <div className="text-[11px] text-[#57534E]">Vibrate on controls, traps &amp; death</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVibration = !settings.vibration;
                    audioManager.playButtonClick();
                    patch({ vibration: nextVibration });
                    if (nextVibration && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                      try {
                        navigator.vibrate(10);
                      } catch {
                        // Ignore unsupported environments
                      }
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors shrink-0 ${
                    settings.vibration
                      ? 'bg-[#111111] text-[#F5F3EE] border-[#111111]'
                      : 'bg-[#FFFFFF] text-[#111111] border-[#111111]/25'
                  }`}
                >
                  {settings.vibration ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs sm:text-sm font-semibold">Fullscreen Landscape</div>
                  <div className="text-[11px] text-[#57534E]">Expand &amp; lock horizontal</div>
                </div>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#111111]/25 bg-[#FFFFFF] hover:border-[#111111] cursor-pointer shrink-0"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                  {isFullscreen ? 'Exit' : 'Enter'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs sm:text-sm font-semibold">Unlock All 100 Levels</div>
                  <div className="text-[11px] text-[#57534E]">Jump straight to 99 or 100 (good luck)</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    patch({ unlockAllLevels: !settings.unlockAllLevels });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors shrink-0 ${
                    settings.unlockAllLevels
                      ? 'bg-[#111111] text-[#F5F3EE] border-[#111111]'
                      : 'bg-[#FFFFFF] text-[#111111] border-[#111111]/25'
                  }`}
                >
                  {settings.unlockAllLevels ? 'Unlocked' : 'Normal'}
                </button>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#111111]/12">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    setConfirmReset(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset All Save Progress
                </button>
              ) : (
                <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#DC2626] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#991B1B]">
                    Erase all progress?
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-2.5 py-1 rounded text-[11px] font-semibold border border-[#111111]/20 bg-[#FFFFFF] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playButtonClick();
                        onResetProgress();
                        setConfirmReset(false);
                      }}
                      className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#DC2626] text-white cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
