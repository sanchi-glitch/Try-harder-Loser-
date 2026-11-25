import { useCallback, useEffect, useRef, useState } from 'react';
import { AdMobTestOverlay } from './components/AdMobOverlays';
import { DeathScreenModal } from './components/DeathScreenModal';
import { GameCanvas } from './components/GameCanvas';
import { AchievementToast, LevelCompleteModal, PauseModal } from './components/GamePlayOverlays';
import { LevelSelect } from './components/LevelSelect';
import { SettingsModal } from './components/SettingsModal';
import { AchievementsModal, StatsModal } from './components/StatsAndAchievementsModal';
import { TitleScreen } from './components/TitleScreen';
import { getDifficultyStage } from './data/difficultyStages';
import { getLevelById, LEVELS } from './data/levels';
import { adMobService, MAX_REWARDED_ADS_PER_DEATH } from './engine/adMobService';
import { audioManager } from './engine/audio';
import {
  evaluateAchievements,
  getLevelProgress,
  loadSaveData,
  persistSaveData,
  resetSaveData,
} from './engine/saveManager';
import type {
  AchievementDef,
  DeathLocationSnapshot,
  GameScreen,
  GameSettings,
  LevelCompletePayload,
  ModalType,
  SaveData,
  UsedLevelHint,
} from './types/game';

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const saveRef = useRef<SaveData>(save);
  saveRef.current = save;

  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [activeModal, setActiveModal] = useState<ModalType>('NONE');
  const [activeLevelId, setActiveLevelId] = useState<number>(() => save.currentLevelId || 1);
  const [restartToken, setRestartToken] = useState(0);
  const [levelCompletePayload, setLevelCompletePayload] = useState<LevelCompletePayload | null>(null);
  const [toastAchievement, setToastAchievement] = useState<AchievementDef | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Google AdMob Rewarded Extra-Life & Death Screen state
  const [deathSnapshot, setDeathSnapshot] = useState<DeathLocationSnapshot | null>(null);
  const [extraLives, setExtraLives] = useState(0);
  const [adsWatchedThisDeath, setAdsWatchedThisDeath] = useState(0);
  const [rewardedAdLoading, setRewardedAdLoading] = useState(false);
  const [rewardedAdStatus, setRewardedAdStatus] = useState<string | null>(null);
  const [deathAction, setDeathAction] = useState<{
    id: number;
    type: 'respawn_exact' | 'restart_after_death';
  }>({ id: 0, type: 'restart_after_death' });
  const [hintAdActive, setHintAdActive] = useState(false);
  const levelTransitionAdBusyRef = useRef(false);

  // Smooth fade-out / fade-in level transition state
  const [levelTransition, setLevelTransition] = useState<{
    phase: 'idle' | 'fading-out' | 'holding' | 'fading-in';
    targetLevelId: number;
  }>({ phase: 'idle', targetLevelId: save.currentLevelId || 1 });
  const transitionTimersRef = useRef<number[]>([]);

  const clearTransitionTimers = useCallback(() => {
    for (const id of transitionTimersRef.current) {
      window.clearTimeout(id);
    }
    transitionTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearTransitionTimers();
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [clearTransitionTimers]);

  const commitSave = useCallback((next: SaveData) => {
    saveRef.current = next;
    persistSaveData(next);
    setSave(next);
  }, []);

  // Sync audio manager with settings
  useEffect(() => {
    audioManager.updateSettings(save.settings);
  }, [save.settings]);

  // Initialize Google AdMob SDK once asynchronously and preload ads
  useEffect(() => {
    void adMobService.initialize();
  }, []);

  // Guarantee Banner Ad is hidden everywhere outside the Home Screen
  useEffect(() => {
    if (screen !== 'TITLE' || activeModal !== 'NONE') {
      adMobService.hideHomeBanner();
    }
  }, [screen, activeModal]);

  // Start subtle background music & dynamic level-scaled atmosphere during active gameplay
  useEffect(() => {
    audioManager.setAtmosphereLevel(activeLevelId);

    if (screen === 'PLAYING') {
      const ducked = activeModal !== 'NONE' || hintAdActive;
      audioManager.setAtmosphereDucked(ducked);
      if (!ducked) {
        audioManager.startMusic();
      }
    } else if (screen === 'TITLE' || screen === 'LEVEL_SELECT') {
      audioManager.setAtmosphereDucked(false);
      audioManager.stopMusic();
    }
  }, [screen, activeModal, activeLevelId, hintAdActive]);

  // Track persistent playtime every 5 seconds while playing
  useEffect(() => {
    if (screen !== 'PLAYING' || activeModal !== 'NONE' || hintAdActive) return;
    const id = window.setInterval(() => {
      const prev = saveRef.current;
      commitSave({
        ...prev,
        totalPlaytimeSeconds: prev.totalPlaytimeSeconds + 5,
      });
    }, 5000);
    return () => window.clearInterval(id);
  }, [screen, activeModal, hintAdActive, commitSave]);

  const showAchievementToast = useCallback((achievements: AchievementDef[]) => {
    if (achievements.length === 0) return;
    const first = achievements[0];
    setToastAchievement(first);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastAchievement(null);
      toastTimerRef.current = null;
    }, 3400);
  }, []);

  const updateSaveAndEvaluate = useCallback(
    (updater: (draft: SaveData) => void) => {
      const prev = saveRef.current;
      const draft: SaveData = {
        ...prev,
        levels: { ...prev.levels },
        unlockedAchievements: [...prev.unlockedAchievements],
        settings: { ...prev.settings },
      };
      updater(draft);
      const unlockedNow = evaluateAchievements(draft);
      commitSave(draft);
      if (unlockedNow.length > 0) {
        showAchievementToast(unlockedNow);
      }
      return unlockedNow;
    },
    [commitSave, showAchievementToast],
  );

  const handleUpdateSettings = useCallback(
    (nextSettings: GameSettings) => {
      commitSave({ ...saveRef.current, settings: nextSettings });
    },
    [commitSave],
  );

  const handleToggleMute = useCallback(() => {
    const prev = saveRef.current;
    commitSave({
      ...prev,
      settings: { ...prev.settings, muted: !prev.settings.muted },
    });
  }, [commitSave]);

  const handleResetProgress = useCallback(() => {
    const fresh = resetSaveData(true);
    saveRef.current = fresh;
    setSave(fresh);
    setActiveLevelId(1);
    setLevelCompletePayload(null);
    if (screen === 'PLAYING') {
      setRestartToken((n) => n + 1);
    }
  }, [screen]);

  const startLevel = useCallback(
    (levelId: number, forceRestart = false) => {
      clearTransitionTimers();
      adMobService.hideHomeBanner();

      const applyLevelSwap = () => {
        setActiveLevelId(levelId);
        if (forceRestart) {
          setRestartToken((n) => n + 1);
        }
        setExtraLives(0);
        setAdsWatchedThisDeath(0);
        setDeathSnapshot(null);
        setRewardedAdStatus(null);
        setLevelCompletePayload(null);
        setActiveModal('NONE');
        setScreen('PLAYING');
        commitSave({ ...saveRef.current, currentLevelId: levelId });
        void adMobService.preloadInterstitial();
        void adMobService.preloadRewarded();
      };

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        applyLevelSwap();
        setLevelTransition({ phase: 'idle', targetLevelId: levelId });
        return;
      }

      // Phase 1: Smooth fade-out curtain over current screen/level (200ms)
      setLevelTransition({ phase: 'fading-out', targetLevelId: levelId });

      const tSwap = window.setTimeout(() => {
        // Phase 2: Swap level cleanly behind opaque curtain & hold briefly for title readability
        applyLevelSwap();
        setLevelTransition({ phase: 'holding', targetLevelId: levelId });
      }, 200);

      const tFadeIn = window.setTimeout(() => {
        // Phase 3: Smooth fade-in revealing new level
        setLevelTransition({ phase: 'fading-in', targetLevelId: levelId });
      }, 390);

      const tDone = window.setTimeout(() => {
        setLevelTransition({ phase: 'idle', targetLevelId: levelId });
      }, 610);

      transitionTimersRef.current = [tSwap, tFadeIn, tDone];
    },
    [clearTransitionTimers, commitSave],
  );

  // Natural level-to-next-level transition with non-blocking Interstitial Ad
  const handleNextLevelWithInterstitial = useCallback(
    async (completedLevelId: number) => {
      if (levelTransitionAdBusyRef.current) return;
      levelTransitionAdBusyRef.current = true;
      const nextLevelId = Math.min(LEVELS.length, completedLevelId + 1);

      try {
        await adMobService.showLevelTransitionInterstitial(completedLevelId, nextLevelId);
      } catch {
        // Always continue loading the next level even if an ad fails or is unavailable
      } finally {
        levelTransitionAdBusyRef.current = false;
        startLevel(nextLevelId);
      }
    },
    [startLevel],
  );

  const handleDeathRecorded = useCallback(
    (levelId: number) => {
      updateSaveAndEvaluate((draft) => {
        draft.totalDeaths += 1;
        const lp = { ...getLevelProgress(draft, levelId) };
        lp.deaths += 1;
        draft.levels[levelId] = lp;
      });
    },
    [updateSaveAndEvaluate],
  );

  const handleHintUnlocked = useCallback(
    (levelId: number, hint: UsedLevelHint) => {
      updateSaveAndEvaluate((draft) => {
        const lp = { ...getLevelProgress(draft, levelId) };
        lp.usedHint = hint;
        draft.levels[levelId] = lp;
      });
    },
    [updateSaveAndEvaluate],
  );

  const handleDeathScreenOpen = useCallback((snapshot: DeathLocationSnapshot) => {
    adMobService.hideHomeBanner();
    setDeathSnapshot(snapshot);
    setAdsWatchedThisDeath(0);
    setRewardedAdLoading(false);
    setRewardedAdStatus(null);
    setActiveModal('DEATH');
    void adMobService.preloadRewarded();
  }, []);

  const handleWatchRewardedAd = useCallback(async () => {
    if (rewardedAdLoading || adsWatchedThisDeath >= MAX_REWARDED_ADS_PER_DEATH) return;

    setRewardedAdLoading(true);
    setRewardedAdStatus(null);

    try {
      const result = await adMobService.showRewardedExtraLifeAd();
      if (result.rewarded) {
        // Grant exactly ONE extra life ONLY after Google AdMob confirms completion
        setExtraLives((prev) => prev + 1);
        setAdsWatchedThisDeath((prev) => Math.min(MAX_REWARDED_ADS_PER_DEATH, prev + 1));
        setRewardedAdStatus(
          '+1 Extra Life earned! Respawn on safe ground just before the obstacle or watch another ad.',
        );
      } else if (result.reason === 'dismissed_early') {
        setRewardedAdStatus('Ad skipped before completion — no extra life granted.');
      } else if (result.reason === 'offline') {
        setRewardedAdStatus('Offline — ad unavailable. You can restart the level anytime.');
      } else {
        setRewardedAdStatus('No rewarded ad available right now — restart the level normally.');
      }
    } catch {
      setRewardedAdStatus('Ad failed to load — no extra life granted.');
    } finally {
      setRewardedAdLoading(false);
    }
  }, [adsWatchedThisDeath, rewardedAdLoading]);

  const handleRespawnWithExtraLife = useCallback(() => {
    if (extraLives <= 0 || rewardedAdLoading) return;
    setExtraLives((prev) => Math.max(0, prev - 1));
    setDeathSnapshot(null);
    setRewardedAdStatus(null);
    setActiveModal('NONE');
    setDeathAction((prev) => ({ id: prev.id + 1, type: 'respawn_exact' }));
  }, [extraLives, rewardedAdLoading]);

  const handleRestartFromDeathScreen = useCallback(() => {
    if (rewardedAdLoading) return;
    setExtraLives(0);
    setAdsWatchedThisDeath(0);
    setDeathSnapshot(null);
    setRewardedAdStatus(null);
    setActiveModal('NONE');
    setDeathAction((prev) => ({ id: prev.id + 1, type: 'restart_after_death' }));
  }, [rewardedAdLoading]);

  const handleReturnToMenuFromDeath = useCallback(() => {
    if (rewardedAdLoading) return;
    setExtraLives(0);
    setAdsWatchedThisDeath(0);
    setDeathSnapshot(null);
    setRewardedAdStatus(null);
    setActiveModal('NONE');
    setScreen('TITLE');
  }, [rewardedAdLoading]);

  const handleTrickTriggered = useCallback(
    (kind: 'trap' | 'fake_reward' | 'fourth_wall') => {
      updateSaveAndEvaluate((draft) => {
        draft.tricksTriggered += 1;
        if (kind === 'fake_reward') draft.fakeRewardsGrabbed += 1;
        if (kind === 'fourth_wall') draft.fourthWallTriggered = true;
      });
    },
    [updateSaveAndEvaluate],
  );

  const handleLevelComplete = useCallback(
    (stats: {
      levelId: number;
      elapsedMs: number;
      levelDeaths: number;
      jumpsUsed: number;
      tricksTriggeredInLevel: number;
    }) => {
      let isNewBestTime = false;
      const prev = saveRef.current;
      const draft: SaveData = {
        ...prev,
        levels: { ...prev.levels },
        unlockedAchievements: [...prev.unlockedAchievements],
        settings: { ...prev.settings },
      };

      const lp = { ...getLevelProgress(draft, stats.levelId) };
      lp.completed = true;
      if (lp.bestTimeMs === null || stats.elapsedMs < lp.bestTimeMs) {
        lp.bestTimeMs = stats.elapsedMs;
        isNewBestTime = true;
      }
      if (stats.jumpsUsed === 0) lp.zeroJumpCompleted = true;
      if (stats.levelDeaths === 0) lp.zeroDeathCompleted = true;

      draft.levels[stats.levelId] = lp;
      const nextUnlocked = Math.min(LEVELS.length, stats.levelId + 1);
      if (nextUnlocked > draft.highestUnlockedLevelId) {
        draft.highestUnlockedLevelId = nextUnlocked;
      }
      draft.currentLevelId = nextUnlocked;

      const unlockedNow = evaluateAchievements(draft);
      commitSave(draft);

      setLevelCompletePayload({
        ...stats,
        isNewBestTime,
        newlyUnlockedAchievements: unlockedNow,
      });
      setDeathSnapshot(null);
      setActiveModal('LEVEL_COMPLETE');
      void adMobService.preloadInterstitial();
    },
    [commitSave],
  );

  const handlePauseToggle = useCallback(() => {
    if (levelTransition.phase === 'fading-out' || levelTransition.phase === 'holding') return;
    setActiveModal((prev) => {
      if (prev === 'NONE') return 'PAUSE';
      if (prev === 'PAUSE') return 'NONE';
      if (prev === 'SETTINGS' && screen === 'PLAYING') return 'PAUSE';
      return prev;
    });
  }, [levelTransition.phase, screen]);

  // Natural horizontal stage: when the phone viewport is upright (portrait), rotate the entire
  // game stage 90deg into true landscape dimensions (100dvh x 100dvw) with zero blocking prompt.
  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false,
  );

  useEffect(() => {
    const checkOrientation = () => {
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setIsPortrait(vh > vw);
    };
    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        const orientation = window.screen.orientation as ScreenOrientation & {
          lock?: (lockType: string) => Promise<void>;
        };
        orientation?.lock?.('landscape').catch(() => {});
      }
      checkOrientation();
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    window.visualViewport?.addEventListener('resize', checkOrientation);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.visualViewport?.removeEventListener('resize', checkOrientation);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const currentLevelDef = getLevelById(activeLevelId);
  const transitionLevelDef = getLevelById(levelTransition.targetLevelId);
  const transitionStage = getDifficultyStage(transitionLevelDef.id);
  const isTransitionOpaque =
    levelTransition.phase === 'fading-out' || levelTransition.phase === 'holding';
  const isEnginePaused = activeModal !== 'NONE' || isTransitionOpaque || hintAdActive;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#F5F3EE] text-[#111111]">
      <div
        className={`@container bg-[#F5F3EE] text-[#111111] ${
          isPortrait ? 'landscape-stage-rotated' : 'landscape-stage-native'
        }`}
      >
      {screen === 'TITLE' && (
        <TitleScreen
          save={save}
          modalOpen={activeModal !== 'NONE'}
          onPlay={() => startLevel(1)}
          onContinue={() => startLevel(save.currentLevelId || 1)}
          onOpenLevels={() => {
            setActiveModal('NONE');
            setScreen('LEVEL_SELECT');
          }}
          onOpenSettings={() => setActiveModal('SETTINGS')}
          onOpenStats={() => setActiveModal('STATS')}
          onOpenAchievements={() => setActiveModal('ACHIEVEMENTS')}
          onToggleMute={handleToggleMute}
        />
      )}

      {screen === 'LEVEL_SELECT' && (
        <LevelSelect
          save={save}
          modalOpen={activeModal !== 'NONE'}
          onSelectLevel={(lid) => startLevel(lid)}
          onBack={() => setScreen('TITLE')}
        />
      )}

      {screen === 'PLAYING' && (
        <GameCanvas
          levelId={activeLevelId}
          settings={save.settings}
          totalDeathsGlobal={save.totalDeaths}
          extraLives={extraLives}
          paused={isEnginePaused}
          onPauseToggle={handlePauseToggle}
          onGoHome={() => {
            setExtraLives(0);
            setDeathSnapshot(null);
            setActiveModal('NONE');
            setLevelCompletePayload(null);
            setScreen('TITLE');
          }}
          onOpenLevels={() => {
            setExtraLives(0);
            setDeathSnapshot(null);
            setActiveModal('NONE');
            setLevelCompletePayload(null);
            setScreen('LEVEL_SELECT');
          }}
          onToggleMute={handleToggleMute}
          onDeathRecorded={handleDeathRecorded}
          onDeathScreenOpen={handleDeathScreenOpen}
          onTrickTriggered={handleTrickTriggered}
          onLevelComplete={handleLevelComplete}
          onHintAdStateChange={setHintAdActive}
          usedLevelHint={getLevelProgress(save, activeLevelId).usedHint ?? null}
          onHintUnlocked={handleHintUnlocked}
          restartToken={restartToken}
          deathAction={deathAction}
        />
      )}

      {/* Modals */}
      {activeModal === 'PAUSE' && screen === 'PLAYING' && (
        <PauseModal
          levelLabel={`Level ${String(currentLevelDef.id).padStart(2, '0')} · Chapter ${currentLevelDef.chapter}`}
          levelName={currentLevelDef.name}
          onResume={() => setActiveModal('NONE')}
          onRestart={() => {
            setExtraLives(0);
            setDeathSnapshot(null);
            setActiveModal('NONE');
            setRestartToken((n) => n + 1);
          }}
          onOpenSettings={() => setActiveModal('SETTINGS')}
          onOpenLevels={() => {
            setExtraLives(0);
            setDeathSnapshot(null);
            setActiveModal('NONE');
            setScreen('LEVEL_SELECT');
          }}
          onMainMenu={() => {
            setExtraLives(0);
            setDeathSnapshot(null);
            setActiveModal('NONE');
            setScreen('TITLE');
          }}
        />
      )}

      {activeModal === 'DEATH' && deathSnapshot && screen === 'PLAYING' && (
        <DeathScreenModal
          snapshot={deathSnapshot}
          levelLabel={`Level ${String(currentLevelDef.id).padStart(2, '0')} · Chapter ${currentLevelDef.chapter}`}
          levelName={currentLevelDef.name}
          extraLives={extraLives}
          adsWatchedThisDeath={adsWatchedThisDeath}
          adLoading={rewardedAdLoading}
          adStatusMessage={rewardedAdStatus}
          onWatchRewardedAd={() => void handleWatchRewardedAd()}
          onRespawnWithExtraLife={handleRespawnWithExtraLife}
          onRestartLevel={handleRestartFromDeathScreen}
          onReturnToMenu={handleReturnToMenuFromDeath}
        />
      )}

      {activeModal === 'LEVEL_COMPLETE' && levelCompletePayload && (
        <LevelCompleteModal
          payload={levelCompletePayload}
          isFinalLevel={levelCompletePayload.levelId >= LEVELS.length}
          totalDeathsGlobal={save.totalDeaths}
          onNextLevel={() => void handleNextLevelWithInterstitial(levelCompletePayload.levelId)}
          onReplay={() => startLevel(levelCompletePayload.levelId, true)}
          onOpenLevels={() => {
            setActiveModal('NONE');
            setLevelCompletePayload(null);
            setScreen('LEVEL_SELECT');
          }}
          onMainMenu={() => {
            setActiveModal('NONE');
            setLevelCompletePayload(null);
            setScreen('TITLE');
          }}
        />
      )}

      {activeModal === 'SETTINGS' && (
        <SettingsModal
          settings={save.settings}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
          onClose={() => setActiveModal(screen === 'PLAYING' ? 'PAUSE' : 'NONE')}
        />
      )}

      {activeModal === 'STATS' && (
        <StatsModal save={save} onClose={() => setActiveModal('NONE')} />
      )}

      {activeModal === 'ACHIEVEMENTS' && (
        <AchievementsModal save={save} onClose={() => setActiveModal('NONE')} />
      )}

      <AchievementToast achievement={toastAchievement} />
      <AdMobTestOverlay />

      {/* Smooth Fade-Out / Fade-In Level Transition Curtain */}
      <div
        aria-hidden={levelTransition.phase === 'idle'}
        className={`fixed inset-0 z-[60] flex items-center justify-center bg-[#111111] text-[#F5F3EE] transition-opacity duration-200 ease-out ${
          isTransitionOpaque ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`text-center px-6 transition-transform duration-200 ease-out ${
            isTransitionOpaque ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
          }`}
        >
          <div className="text-xs font-mono-tabular tracking-wide text-[#DC2626] font-bold">
            LEVEL {String(transitionLevelDef.id).padStart(2, '0')} · {transitionStage.name} ({transitionStage.difficulty})
          </div>
          <div className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mt-1">
            {transitionLevelDef.name}
          </div>
          <div className="text-xs sm:text-sm text-[#D6D1C7] mt-1.5 max-w-sm mx-auto">
            {transitionLevelDef.subtitle}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
