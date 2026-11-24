import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { audioManager } from '../engine/audio';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onInstalledOrOpened?: () => void;
}

export function PWAInstallButton({ onInstalledOrOpened }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          audioManager.playButtonClick();
          onInstalledOrOpened?.();
          void install();
        }}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border-2 border-[#DC2626] bg-[#FEF2F2] text-[#111111] hover:bg-[#DC2626] hover:text-[#F5F3EE] font-display font-bold text-sm transition-colors cursor-pointer"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            audioManager.playButtonClick();
            setShowIOSGuide(true);
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] text-[#111111] hover:border-[#111111] font-display font-bold text-sm transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0 text-[#DC2626]" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Install Try harder, Loser! on iOS"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowIOSGuide(false);
            }}
          >
            <div className="w-full max-w-sm rounded-xl bg-[#F5F3EE] border-2 border-[#111111] shadow-[6px_6px_0px_#111111] p-5 text-[#111111]">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#111111]/12">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/icons/icon-192x192.png"
                    alt="Try harder, Loser! icon"
                    className="w-9 h-9 rounded-lg border border-[#111111]/20"
                  />
                  <h3 className="font-display font-extrabold text-base">Install on iOS</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close iOS install instructions"
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#111111]/20 bg-[#FFFFFF] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-1.5 text-xs text-[#44403C] list-decimal list-inside">
                <li>
                  Tap the <strong>Share</strong> button in the Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> to launch fullscreen with the game icon.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-xs cursor-pointer hover:bg-[#DC2626] transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
