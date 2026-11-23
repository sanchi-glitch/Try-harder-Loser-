import { CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  adMobService,
  type AdMobUiState,
  type DevTestAdSession,
} from '../engine/adMobService';

interface HomeBannerAdSlotProps {
  visible: boolean;
}

/**
 * Home-screen-only bottom AdMob Banner dock.
 * - Mounted exclusively on TitleScreen when no modal is open.
 * - Automatically hides native Android AdMob banner on unmount or when `visible` becomes false.
 * - Reserves responsive bottom space so it never overlaps Play, Levels, Settings, or other controls.
 */
export function HomeBannerAdSlot({ visible }: HomeBannerAdSlotProps) {
  const [adState, setAdState] = useState<AdMobUiState>(() => adMobService.getUiState());

  useEffect(() => adMobService.subscribe(setAdState), []);

  useEffect(() => {
    if (visible) {
      adMobService.showHomeBanner();
    } else {
      adMobService.hideHomeBanner();
    }
    return () => {
      adMobService.hideHomeBanner();
    };
  }, [visible]);

  if (!visible) return null;

  // On native Android SDK, reserve clean non-overlapping bottom space for the native AdView banner
  if (adState.hasNativeSdk) {
    return (
      <div
        aria-label="Advertisement Space"
        className="w-full h-[54px] shrink-0 pointer-events-none"
      />
    );
  }

  // In development web preview (no native Android SDK), show Google's official Test Banner container
  if (adState.isTestMode && adState.bannerVisible && adState.bannerLoaded) {
    return (
      <div className="w-full shrink-0 flex items-center justify-center px-3 py-1 bg-[#EAE6DC]/95 border-t border-[#111111]/15">
        <div className="w-full max-w-[468px] h-[50px] rounded-md bg-[#FFFFFF] border border-[#111111]/25 px-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-[#111111] text-[#F5F3EE] text-[9px] font-mono-tabular font-bold tracking-wider shrink-0">
              TEST AD
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-display font-bold text-[#111111] truncate">
                Google AdMob Adaptive Banner
              </div>
              <div className="text-[9px] font-mono-tabular text-[#57534E] truncate">
                Home Screen Only · Prod Unit: {adMobService.getProductionAdUnitId('banner')}
              </div>
            </div>
          </div>
          <span className="text-[9px] font-mono-tabular font-semibold text-[#57534E] shrink-0">
            320×50
          </span>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Development-only interactive Google Test Ad harness (web preview without native Android SDK).
 * Verifies Interstitial level transitions and strict Rewarded Ad completion gating
 * without ever clicking production ads. Never renders in production web builds.
 */
export function AdMobTestOverlay() {
  const [adState, setAdState] = useState<AdMobUiState>(() => adMobService.getUiState());

  useEffect(() => adMobService.subscribe(setAdState), []);

  const session = adState.activeDevAd;
  if (!adState.isTestMode || !session) return null;

  return <DevTestAdDialog key={`${session.format}-${session.activeAdUnitId}`} session={session} />;
}

function DevTestAdDialog({ session }: { session: DevTestAdSession }) {
  const totalSeconds = session.format === 'rewarded' ? 5 : 3;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const completed = secondsLeft <= 0;

  useEffect(() => {
    setSecondsLeft(totalSeconds);
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [session, totalSeconds]);

  const isRewarded = session.format === 'rewarded';
  const isHintReward = isRewarded && session.purpose === 'hint';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#111111]/92 p-4 text-[#F5F3EE]"
      role="dialog"
      aria-modal="true"
      aria-label={isRewarded ? 'Google Test Rewarded Ad' : 'Google Test Interstitial Ad'}
    >
      <div className="w-full max-w-lg rounded-xl bg-[#1A1917] border-2 border-[#F5F3EE]/30 p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F5F3EE]/15">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#DC2626] text-white text-[10px] font-mono-tabular font-bold">
              GOOGLE TEST AD
            </span>
            <span className="text-xs font-mono-tabular text-[#D6D1C7] uppercase">
              {isHintReward
                ? 'Rewarded Video · Hint'
                : isRewarded
                  ? 'Rewarded Video'
                  : 'Interstitial'}
            </span>
          </div>

          {!isRewarded ? (
            <button
              type="button"
              disabled={!completed}
              onClick={() => session.onComplete(false)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono-tabular font-bold transition-colors ${
                completed
                  ? 'bg-[#F5F3EE] text-[#111111] hover:bg-[#DC2626] hover:text-white cursor-pointer'
                  : 'bg-[#F5F3EE]/15 text-[#F5F3EE]/60 cursor-not-allowed'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              {completed ? 'Close Ad' : `Close in ${secondsLeft}s`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => session.onComplete(completed)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono-tabular font-bold transition-colors cursor-pointer ${
                completed
                  ? 'bg-[#22C55E] text-[#111111] hover:bg-[#16A34A] hover:text-white'
                  : 'bg-[#F5F3EE]/15 text-[#F5F3EE] hover:bg-[#DC2626]'
              }`}
            >
              {completed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isHintReward ? 'Unlock Cryptic Hint' : 'Claim +1 Extra Life'}
                </>
              ) : (
                <>
                  <X className="w-3.5 h-3.5" />
                  Skip Early (No Reward)
                </>
              )}
            </button>
          )}
        </div>

        <div className="py-5 text-center space-y-2.5">
          <div className="font-display font-extrabold text-xl tracking-tight">
            {isRewarded
              ? completed
                ? isHintReward
                  ? 'Reward Earned: Cryptic Hint Unlocked'
                  : 'Reward Earned: +1 Extra Life'
                : `Watching Rewarded Test Ad (${secondsLeft}s)...`
              : completed
                ? 'Level Transition Interstitial Complete'
                : `Interstitial Test Ad (${secondsLeft}s)...`}
          </div>
          <p className="text-xs text-[#D6D1C7] max-w-md mx-auto leading-relaxed">
            {isHintReward
              ? 'Verifies Google AdMob rewarded callback gating: skipping early reveals nothing; completing unlocks this obstacle’s cryptic clue.'
              : isRewarded
                ? 'Verifies Google AdMob rewarded callback gating: skipping early grants 0 lives; completing grants exactly 1 extra life.'
                : 'Shown naturally after completing a level and before starting the next level.'}
          </p>

          <div className="mt-3 p-3 rounded-lg bg-[#111111] border border-[#F5F3EE]/12 text-left font-mono-tabular text-[10px] text-[#D6D1C7] space-y-1">
            <div>
              <span className="text-[#A8A29E]">DEV TEST UNIT: </span>
              <span className="text-[#F5F3EE]">{session.activeAdUnitId}</span>
            </div>
            <div>
              <span className="text-[#A8A29E]">PROD UNIT:     </span>
              <span className="text-[#F5F3EE]">{session.productionAdUnitId}</span>
            </div>
          </div>

          {isRewarded && !completed && (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-[#F59E0B] pt-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                {isHintReward
                  ? 'Closing now skips the ad and reveals NO hint.'
                  : 'Closing now skips the ad and awards NO extra life.'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
