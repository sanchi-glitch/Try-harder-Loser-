/**
 * Google AdMob Integration Service for TRY HARDER, LOSER!
 *
 * Production Ad Unit IDs (preserved verbatim for Android release builds):
 *  - Interstitial (Level Transitions): ca-app-pub-3222322101838657/4863634111
 *  - Rewarded (Death Extra Life):      ca-app-pub-3222322101838657/8910690332
 *  - Banner (Home Screen Only):        ca-app-pub-3222322101838657/2181630451
 *
 * During development (`import.meta.env.DEV`), Google's official Android test
 * ad unit IDs are used automatically so production ads are never clicked in testing.
 *
 * Supports:
 *  1. Official Android Google Mobile Ads SDK via native WebView bridge (`window.AndroidAdMob`)
 *  2. Official Capacitor AdMob plugin (`window.Capacitor.Plugins.AdMob`)
 *  3. Dev-only interactive Google Test Ad harness in browser preview
 *
 * Note: Never invent an AdMob App ID here. The Android Manifest meta-data
 * (`com.google.android.gms.ads.APPLICATION_ID`) must use the publisher's real App ID.
 */

export const ADMOB_PRODUCTION_AD_UNITS = {
  interstitial: 'ca-app-pub-3222322101838657/4863634111',
  rewarded: 'ca-app-pub-3222322101838657/8910690332',
  banner: 'ca-app-pub-3222322101838657/2181630451',
} as const;

export const ADMOB_TEST_AD_UNITS = {
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  banner: 'ca-app-pub-3940256099942544/6300978111',
} as const;

export const MAX_REWARDED_ADS_PER_DEATH = 3;

export type AdUnitFormat = 'interstitial' | 'rewarded' | 'banner';

export interface InterstitialResult {
  shown: boolean;
  reason: 'shown' | 'unavailable' | 'cooldown' | 'offline' | 'busy' | 'error';
}

export interface RewardedAdResult {
  rewarded: boolean;
  reason: 'rewarded' | 'dismissed_early' | 'unavailable' | 'offline' | 'busy' | 'error';
}

export interface DevTestAdSession {
  format: 'interstitial' | 'rewarded';
  activeAdUnitId: string;
  productionAdUnitId: string;
  onComplete: (earnedReward: boolean) => void;
}

export interface AdMobUiState {
  isTestMode: boolean;
  hasNativeSdk: boolean;
  bannerVisible: boolean;
  bannerLoaded: boolean;
  interstitialReady: boolean;
  rewardedReady: boolean;
  activeDevAd: DevTestAdSession | null;
}

interface NativeAndroidAdMobBridge {
  initialize?: (isTesting: boolean) => void;
  preloadInterstitial?: (adUnitId: string) => void;
  showInterstitial?: (adUnitId: string) => void;
  preloadRewarded?: (adUnitId: string) => void;
  showRewarded?: (adUnitId: string) => void;
  showBanner?: (adUnitId: string, position: 'bottom') => void;
  hideBanner?: () => void;
}

interface CapacitorAdMobPlugin {
  initialize?: (options?: { initializeForTesting?: boolean }) => Promise<void>;
  prepareInterstitial?: (options: { adId: string; isTesting?: boolean }) => Promise<void>;
  showInterstitial?: () => Promise<void>;
  prepareRewardVideoAd?: (options: { adId: string; isTesting?: boolean }) => Promise<void>;
  showRewardVideoAd?: () => Promise<{ type?: string; amount?: number } | void>;
  showBanner?: (options: {
    adId: string;
    adSize?: string;
    position?: string;
    margin?: number;
    isTesting?: boolean;
  }) => Promise<void>;
  hideBanner?: () => Promise<void>;
  removeBanner?: () => Promise<void>;
  addListener?: (
    eventName: string,
    listenerFunc: (info: Record<string, unknown>) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
}

declare global {
  interface Window {
    AndroidAdMob?: NativeAndroidAdMobBridge;
    Capacitor?: {
      Plugins?: {
        AdMob?: CapacitorAdMobPlugin;
      };
    };
    __onAdMobEvent?: (event: string, payload?: Record<string, unknown>) => void;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);
    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

class AdMobService {
  private readonly isTestMode = Boolean(import.meta.env.DEV);
  private initialized = false;
  private isShowingFullscreenAd = false;

  // Interstitial state & anti-spam guards
  private interstitialLoaded = false;
  private interstitialLoading = false;
  private lastInterstitialShownAt = 0;
  private lastInterstitialCompletedLevelId: number | null = null;
  private readonly interstitialMinGapMs = 15_000;

  // Rewarded state
  private rewardedLoaded = false;
  private rewardedLoading = false;

  // Banner state (Home Screen ONLY)
  private bannerVisible = false;
  private bannerLoaded = false;

  // Pending native Android JS bridge callbacks
  private pendingInterstitialResolve: ((result: InterstitialResult) => void) | null = null;
  private pendingRewardedResolve: ((result: RewardedAdResult) => void) | null = null;
  private nativeRewardEarnedFlag = false;

  // Dev browser test overlay session
  private activeDevAd: DevTestAdSession | null = null;
  private listeners = new Set<(state: AdMobUiState) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.__onAdMobEvent = (event, payload) => {
        this.handleNativeBridgeEvent(event, payload);
      };
    }
  }

  public getAdUnitId(format: AdUnitFormat): string {
    return this.isTestMode
      ? ADMOB_TEST_AD_UNITS[format]
      : ADMOB_PRODUCTION_AD_UNITS[format];
  }

  public getProductionAdUnitId(format: AdUnitFormat): string {
    return ADMOB_PRODUCTION_AD_UNITS[format];
  }

  private getAndroidBridge(): NativeAndroidAdMobBridge | null {
    if (typeof window === 'undefined') return null;
    return window.AndroidAdMob ?? null;
  }

  private getCapacitorAdMob(): CapacitorAdMobPlugin | null {
    if (typeof window === 'undefined') return null;
    return window.Capacitor?.Plugins?.AdMob ?? null;
  }

  public hasNativeSdk(): boolean {
    return Boolean(this.getAndroidBridge() || this.getCapacitorAdMob());
  }

  private isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
  }

  public getUiState(): AdMobUiState {
    return {
      isTestMode: this.isTestMode,
      hasNativeSdk: this.hasNativeSdk(),
      bannerVisible: this.bannerVisible,
      bannerLoaded: this.bannerLoaded,
      interstitialReady: this.interstitialLoaded,
      rewardedReady: this.rewardedLoaded,
      activeDevAd: this.activeDevAd,
    };
  }

  public subscribe(listener: (state: AdMobUiState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getUiState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitState(): void {
    const snap = this.getUiState();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  /**
   * Initializes the official Google Mobile Ads SDK asynchronously (once)
   * and begins preloading interstitial + rewarded inventory in the background.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const androidBridge = this.getAndroidBridge();
    const capAdMob = this.getCapacitorAdMob();

    try {
      if (androidBridge?.initialize) {
        androidBridge.initialize(this.isTestMode);
      } else if (capAdMob?.initialize) {
        await withTimeout(
          capAdMob.initialize({ initializeForTesting: this.isTestMode }),
          2500,
          undefined,
        );
      }
    } catch {
      // Never block gameplay if AdMob initialization fails
    }

    // Asynchronously preload interstitial & rewarded ads without blocking main thread
    void this.preloadInterstitial();
    void this.preloadRewarded();
  }

  private handleNativeBridgeEvent(event: string, payload?: Record<string, unknown>): void {
    switch (event) {
      case 'interstitial_loaded':
        this.interstitialLoaded = true;
        this.interstitialLoading = false;
        this.emitState();
        break;
      case 'interstitial_failed':
        this.interstitialLoaded = false;
        this.interstitialLoading = false;
        if (this.pendingInterstitialResolve) {
          const resolve = this.pendingInterstitialResolve;
          this.pendingInterstitialResolve = null;
          this.isShowingFullscreenAd = false;
          resolve({ shown: false, reason: 'unavailable' });
        }
        this.emitState();
        break;
      case 'interstitial_closed':
        this.interstitialLoaded = false;
        this.isShowingFullscreenAd = false;
        this.lastInterstitialShownAt = Date.now();
        if (this.pendingInterstitialResolve) {
          const resolve = this.pendingInterstitialResolve;
          this.pendingInterstitialResolve = null;
          resolve({ shown: true, reason: 'shown' });
        }
        this.emitState();
        // Preload the next interstitial right away
        void this.preloadInterstitial();
        break;

      case 'rewarded_loaded':
        this.rewardedLoaded = true;
        this.rewardedLoading = false;
        this.emitState();
        break;
      case 'rewarded_failed':
        this.rewardedLoaded = false;
        this.rewardedLoading = false;
        this.nativeRewardEarnedFlag = false;
        if (this.pendingRewardedResolve) {
          const resolve = this.pendingRewardedResolve;
          this.pendingRewardedResolve = null;
          this.isShowingFullscreenAd = false;
          resolve({ rewarded: false, reason: 'unavailable' });
        }
        this.emitState();
        break;
      case 'rewarded_earned':
        // Official AdMob onUserEarnedReward callback confirmed
        if (!payload || payload.amount === undefined || Number(payload.amount) > 0) {
          this.nativeRewardEarnedFlag = true;
        }
        break;
      case 'rewarded_closed': {
        const earned = this.nativeRewardEarnedFlag;
        this.nativeRewardEarnedFlag = false;
        this.rewardedLoaded = false;
        this.isShowingFullscreenAd = false;
        if (this.pendingRewardedResolve) {
          const resolve = this.pendingRewardedResolve;
          this.pendingRewardedResolve = null;
          resolve({
            rewarded: earned,
            reason: earned ? 'rewarded' : 'dismissed_early',
          });
        }
        this.emitState();
        // Preload next rewarded ad in case user watches a 2nd or 3rd ad voluntarily
        void this.preloadRewarded();
        break;
      }

      case 'banner_loaded':
        this.bannerLoaded = true;
        this.emitState();
        break;
      case 'banner_failed':
        this.bannerLoaded = false;
        this.emitState();
        break;
      default:
        break;
    }
  }

  // =========================================================================
  // 1. INTERSTITIAL AD — Level Transitions Only
  // =========================================================================

  public async preloadInterstitial(): Promise<void> {
    if (this.interstitialLoaded || this.interstitialLoading || !this.isOnline()) return;
    this.interstitialLoading = true;
    const adUnitId = this.getAdUnitId('interstitial');

    try {
      const androidBridge = this.getAndroidBridge();
      const capAdMob = this.getCapacitorAdMob();

      if (androidBridge?.preloadInterstitial) {
        androidBridge.preloadInterstitial(adUnitId);
        // Native bridge notifies via __onAdMobEvent('interstitial_loaded')
        window.setTimeout(() => {
          this.interstitialLoading = false;
        }, 6000);
        return;
      }

      if (capAdMob?.prepareInterstitial) {
        await withTimeout(
          capAdMob.prepareInterstitial({ adId: adUnitId, isTesting: this.isTestMode }),
          5000,
          undefined,
        );
        this.interstitialLoaded = true;
        this.interstitialLoading = false;
        this.emitState();
        return;
      }

      if (this.isTestMode) {
        // Dev preview readiness (uses Google official test unit ID)
        this.interstitialLoaded = true;
      }
    } catch {
      this.interstitialLoaded = false;
    } finally {
      if (!this.getAndroidBridge()?.preloadInterstitial) {
        this.interstitialLoading = false;
        this.emitState();
      }
    }
  }

  /**
   * Displays an interstitial ad strictly during level-to-next-level transitions.
   * Never blocks indefinitely, never displays on same-level restarts, and
   * avoids consecutive/duplicate ads.
   */
  public async showLevelTransitionInterstitial(
    completedLevelId: number,
    nextLevelId: number,
  ): Promise<InterstitialResult> {
    // Never show when restarting/replaying the same level
    if (nextLevelId <= completedLevelId) {
      return { shown: false, reason: 'cooldown' };
    }
    // Avoid consecutive duplicate displays for the same transition or within cooldown
    const now = Date.now();
    if (
      this.lastInterstitialCompletedLevelId === completedLevelId ||
      (this.lastInterstitialShownAt > 0 && now - this.lastInterstitialShownAt < this.interstitialMinGapMs)
    ) {
      return { shown: false, reason: 'cooldown' };
    }
    if (this.isShowingFullscreenAd) {
      return { shown: false, reason: 'busy' };
    }
    if (!this.isOnline()) {
      return { shown: false, reason: 'offline' };
    }

    // Ensure Home banner is hidden before any fullscreen ad
    this.hideHomeBanner();

    const androidBridge = this.getAndroidBridge();
    const capAdMob = this.getCapacitorAdMob();
    const adUnitId = this.getAdUnitId('interstitial');

    // Path A: Native Android WebView Google Mobile Ads SDK bridge
    if (androidBridge?.showInterstitial) {
      if (!this.interstitialLoaded) {
        void this.preloadInterstitial();
        return { shown: false, reason: 'unavailable' };
      }
      this.isShowingFullscreenAd = true;
      this.lastInterstitialCompletedLevelId = completedLevelId;
      return withTimeout(
        new Promise<InterstitialResult>((resolve) => {
          this.pendingInterstitialResolve = resolve;
          try {
            androidBridge.showInterstitial?.(adUnitId);
          } catch {
            this.pendingInterstitialResolve = null;
            this.isShowingFullscreenAd = false;
            resolve({ shown: false, reason: 'error' });
          }
        }),
        45_000,
        { shown: false, reason: 'unavailable' },
      );
    }

    // Path B: Official Capacitor AdMob plugin (Android Mobile Ads SDK)
    if (capAdMob?.showInterstitial) {
      if (!this.interstitialLoaded) {
        await withTimeout(this.preloadInterstitial(), 1800, undefined);
      }
      if (!this.interstitialLoaded) {
        return { shown: false, reason: 'unavailable' };
      }
      this.isShowingFullscreenAd = true;
      this.lastInterstitialCompletedLevelId = completedLevelId;
      try {
        await withTimeout(capAdMob.showInterstitial(), 45_000, undefined);
        this.interstitialLoaded = false;
        this.lastInterstitialShownAt = Date.now();
        void this.preloadInterstitial();
        return { shown: true, reason: 'shown' };
      } catch {
        this.interstitialLoaded = false;
        void this.preloadInterstitial();
        return { shown: false, reason: 'error' };
      } finally {
        this.isShowingFullscreenAd = false;
        this.emitState();
      }
    }

    // Path C: Browser Dev Preview Test Harness (official Google test ID only)
    if (this.isTestMode) {
      this.isShowingFullscreenAd = true;
      this.lastInterstitialCompletedLevelId = completedLevelId;
      return new Promise<InterstitialResult>((resolve) => {
        this.activeDevAd = {
          format: 'interstitial',
          activeAdUnitId: adUnitId,
          productionAdUnitId: ADMOB_PRODUCTION_AD_UNITS.interstitial,
          onComplete: () => {
            this.activeDevAd = null;
            this.isShowingFullscreenAd = false;
            this.lastInterstitialShownAt = Date.now();
            this.interstitialLoaded = true;
            this.emitState();
            resolve({ shown: true, reason: 'shown' });
          },
        };
        this.emitState();
      });
    }

    // Production web build without native Android SDK: continue seamlessly
    return { shown: false, reason: 'unavailable' };
  }

  // =========================================================================
  // 2. REWARDED AD — Voluntary Death Respawn / Extra Life (1 per ad, up to 3)
  // =========================================================================

  public async preloadRewarded(): Promise<void> {
    if (this.rewardedLoaded || this.rewardedLoading || !this.isOnline()) return;
    this.rewardedLoading = true;
    const adUnitId = this.getAdUnitId('rewarded');

    try {
      const androidBridge = this.getAndroidBridge();
      const capAdMob = this.getCapacitorAdMob();

      if (androidBridge?.preloadRewarded) {
        androidBridge.preloadRewarded(adUnitId);
        window.setTimeout(() => {
          this.rewardedLoading = false;
        }, 6000);
        return;
      }

      if (capAdMob?.prepareRewardVideoAd) {
        await withTimeout(
          capAdMob.prepareRewardVideoAd({ adId: adUnitId, isTesting: this.isTestMode }),
          5000,
          undefined,
        );
        this.rewardedLoaded = true;
        this.rewardedLoading = false;
        this.emitState();
        return;
      }

      if (this.isTestMode) {
        this.rewardedLoaded = true;
      }
    } catch {
      this.rewardedLoaded = false;
    } finally {
      if (!this.getAndroidBridge()?.preloadRewarded) {
        this.rewardedLoading = false;
        this.emitState();
      }
    }
  }

  /**
   * Voluntarily shows ONE rewarded advertisement.
   * Grants reward (`rewarded: true`) ONLY when Google AdMob confirms full completion.
   * Skipping early, closing before reward callback, or load failure returns `rewarded: false`.
   */
  public async showRewardedExtraLifeAd(): Promise<RewardedAdResult> {
    if (this.isShowingFullscreenAd) {
      return { rewarded: false, reason: 'busy' };
    }
    if (!this.isOnline()) {
      return { rewarded: false, reason: 'offline' };
    }

    // Ensure Home banner is never shown during death screen / rewarded ad
    this.hideHomeBanner();

    const androidBridge = this.getAndroidBridge();
    const capAdMob = this.getCapacitorAdMob();
    const adUnitId = this.getAdUnitId('rewarded');

    // Path A: Native Android WebView Google Mobile Ads SDK bridge
    if (androidBridge?.showRewarded) {
      this.isShowingFullscreenAd = true;
      this.nativeRewardEarnedFlag = false;
      return withTimeout(
        new Promise<RewardedAdResult>((resolve) => {
          this.pendingRewardedResolve = resolve;
          try {
            androidBridge.showRewarded?.(adUnitId);
          } catch {
            this.pendingRewardedResolve = null;
            this.isShowingFullscreenAd = false;
            resolve({ rewarded: false, reason: 'error' });
          }
        }),
        65_000,
        { rewarded: false, reason: 'unavailable' },
      );
    }

    // Path B: Official Capacitor AdMob plugin (Android Mobile Ads SDK)
    if (capAdMob?.showRewardVideoAd) {
      if (!this.rewardedLoaded) {
        await withTimeout(this.preloadRewarded(), 3500, undefined);
      }
      if (!this.rewardedLoaded) {
        return { rewarded: false, reason: 'unavailable' };
      }

      this.isShowingFullscreenAd = true;
      try {
        const rewardItem = await withTimeout(capAdMob.showRewardVideoAd(), 65_000, undefined);
        const earned = Boolean(rewardItem && (rewardItem.amount === undefined || rewardItem.amount > 0));
        this.rewardedLoaded = false;
        void this.preloadRewarded();
        return {
          rewarded: earned,
          reason: earned ? 'rewarded' : 'dismissed_early',
        };
      } catch {
        this.rewardedLoaded = false;
        void this.preloadRewarded();
        return { rewarded: false, reason: 'error' };
      } finally {
        this.isShowingFullscreenAd = false;
        this.emitState();
      }
    }

    // Path C: Browser Dev Preview Test Harness (official Google test ID only)
    if (this.isTestMode) {
      this.isShowingFullscreenAd = true;
      return new Promise<RewardedAdResult>((resolve) => {
        this.activeDevAd = {
          format: 'rewarded',
          activeAdUnitId: adUnitId,
          productionAdUnitId: ADMOB_PRODUCTION_AD_UNITS.rewarded,
          onComplete: (earnedReward: boolean) => {
            this.activeDevAd = null;
            this.isShowingFullscreenAd = false;
            this.rewardedLoaded = true;
            this.emitState();
            resolve({
              rewarded: earnedReward,
              reason: earnedReward ? 'rewarded' : 'dismissed_early',
            });
          },
        };
        this.emitState();
      });
    }

    // Production web build without native Android SDK: never grant unverified reward
    return { rewarded: false, reason: 'unavailable' };
  }

  // =========================================================================
  // 3. BANNER AD — Home Screen Bottom Only
  // =========================================================================

  public showHomeBanner(): void {
    if (this.bannerVisible) return;
    if (!this.isOnline()) {
      this.bannerVisible = false;
      this.bannerLoaded = false;
      this.emitState();
      return;
    }

    this.bannerVisible = true;
    const adUnitId = this.getAdUnitId('banner');
    const androidBridge = this.getAndroidBridge();
    const capAdMob = this.getCapacitorAdMob();

    try {
      if (androidBridge?.showBanner) {
        androidBridge.showBanner(adUnitId, 'bottom');
      } else if (capAdMob?.showBanner) {
        void capAdMob
          .showBanner({
            adId: adUnitId,
            adSize: 'ADAPTIVE_BANNER',
            position: 'BOTTOM_CENTER',
            margin: 0,
            isTesting: this.isTestMode,
          })
          .then(() => {
            if (this.bannerVisible) {
              this.bannerLoaded = true;
              this.emitState();
            }
          })
          .catch(() => {
            this.bannerLoaded = false;
            this.emitState();
          });
      } else if (this.isTestMode) {
        this.bannerLoaded = true;
      }
    } catch {
      this.bannerLoaded = false;
    }

    this.emitState();
  }

  public hideHomeBanner(): void {
    if (!this.bannerVisible && !this.bannerLoaded) return;
    this.bannerVisible = false;
    this.bannerLoaded = false;

    const androidBridge = this.getAndroidBridge();
    const capAdMob = this.getCapacitorAdMob();

    try {
      if (androidBridge?.hideBanner) {
        androidBridge.hideBanner();
      } else if (capAdMob?.removeBanner) {
        void capAdMob.removeBanner().catch(() => {});
      } else if (capAdMob?.hideBanner) {
        void capAdMob.hideBanner().catch(() => {});
      }
    } catch {
      // Ignore cleanup errors
    }

    this.emitState();
  }
}

export const adMobService = new AdMobService();
