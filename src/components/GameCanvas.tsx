import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Grid,
  Heart,
  Home,
  Menu,
  RotateCcw,
  Skull,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  getDeathStreakMilestone,
  pickDeathStreakStickmanComment,
  type DeathStreakMilestone,
} from '../data/deathMessages';
import { LEVELS } from '../data/levels';
import { getRandomDeathTaunt } from '../data/taunts';
import { audioManager } from '../engine/audio';
import { PlatformerEngine } from '../engine/gameEngine';
import { formatTimeMs } from '../engine/saveManager';
import type { DeathLocationSnapshot, GameSettings, HudSnapshot } from '../types/game';

interface GameCanvasProps {
  levelId: number;
  settings: GameSettings;
  totalDeathsGlobal: number;
  extraLives: number;
  paused: boolean;
  onPauseToggle: () => void;
  onGoHome: () => void;
  onOpenLevels: () => void;
  onToggleMute: () => void;
  onDeathRecorded: (levelId: number, levelDeaths: number) => void;
  onDeathScreenOpen: (snapshot: DeathLocationSnapshot) => void;
  onTrickTriggered: (kind: 'trap' | 'fake_reward' | 'fourth_wall') => void;
  onLevelComplete: (stats: {
    levelId: number;
    elapsedMs: number;
    levelDeaths: number;
    jumpsUsed: number;
    tricksTriggeredInLevel: number;
  }) => void;
  restartToken: number;
  deathAction: { id: number; type: 'respawn_exact' | 'restart_after_death' };
}

export function GameCanvas({
  levelId,
  settings,
  totalDeathsGlobal,
  extraLives,
  paused,
  onPauseToggle,
  onGoHome,
  onOpenLevels,
  onToggleMute,
  onDeathRecorded,
  onDeathScreenOpen,
  onTrickTriggered,
  onLevelComplete,
  restartToken,
  deathAction,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PlatformerEngine | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Track visual active states of touch buttons without re-rendering canvas loop
  const [touchState, setTouchState] = useState({ left: false, right: false, jump: false });
  const touchActiveRef = useRef({ left: false, right: false, jump: false });

  // Latest callbacks in refs so engine never restarts when React state updates
  const callbacksRef = useRef({
    onDeathRecorded,
    onDeathScreenOpen,
    onTrickTriggered,
    onLevelComplete,
  });
  callbacksRef.current = {
    onDeathRecorded,
    onDeathScreenOpen,
    onTrickTriggered,
    onLevelComplete,
  };

  const [hud, setHud] = useState<HudSnapshot>({
    levelId,
    chapter: 1,
    levelInChapter: 1,
    levelName: '',
    chapterTitle: '',
    elapsedMs: 0,
    levelDeaths: 0,
    levelDeathStreak: 0,
    deathStreakMilestone: null,
    totalDeaths: totalDeathsGlobal,
    checkpointReached: false,
    deathMessage: null,
    deathMessageId: 0,
    prankBanner: null,
    prankBannerId: 0,
    adaptiveHint: null,
  });

  const [activeTaunt, setActiveTaunt] = useState<{
    id: number;
    text: string;
    streakMilestone: DeathStreakMilestone | null;
  } | null>(null);
  const lastTauntRef = useRef<string | null>(null);
  const tauntTimerRef = useRef<number | null>(null);

  // Screen shake & impact flash refs/state (never unmounts canvas)
  const shakeStageRef = useRef<HTMLDivElement | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const [impactFlashId, setImpactFlashId] = useState<number>(0);
  const [deathPulseId, setDeathPulseId] = useState<number>(0);

  const triggerScreenShake = (kind: 'death' | 'trap') => {
    const stage = shakeStageRef.current;
    if (stage) {
      stage.classList.remove('animate-rage-shake', 'animate-trap-shake');
      // Force reflow so rapid consecutive hits restart the shake cleanly
      void stage.offsetWidth;
      const cls = kind === 'death' ? 'animate-rage-shake' : 'animate-trap-shake';
      stage.classList.add(cls);

      if (shakeTimerRef.current !== null) {
        window.clearTimeout(shakeTimerRef.current);
      }
      shakeTimerRef.current = window.setTimeout(
        () => {
          stage.classList.remove('animate-rage-shake', 'animate-trap-shake');
          shakeTimerRef.current = null;
        },
        kind === 'death' ? 440 : 240,
      );
    }

    if (kind === 'death') {
      setImpactFlashId((id) => id + 1);
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = window.setTimeout(() => {
        setImpactFlashId(0);
        flashTimerRef.current = null;
      }, 400);
    }
  };

  const clearActiveTaunt = () => {
    if (tauntTimerRef.current !== null) {
      window.clearTimeout(tauntTimerRef.current);
      tauntTimerRef.current = null;
    }
    setActiveTaunt(null);
  };

  // Detect touch capability once on mount
  useEffect(() => {
    const hasTouch =
      'ontouchstart' in window ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
      window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(hasTouch);
  }, []);

  // Mount isolated 60fps canvas engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new PlatformerEngine(canvas, levelId, settings, totalDeathsGlobal, {
      onHudUpdate: (snap) => setHud(snap),
      onDeathRecorded: (lid, ld, streak) => {
        triggerScreenShake('death');
        setDeathPulseId((id) => id + 1);
        const milestone = getDeathStreakMilestone(streak);
        const nextTaunt = milestone
          ? pickDeathStreakStickmanComment(milestone, lid).taunt
          : getRandomDeathTaunt(lastTauntRef.current, lid);
        lastTauntRef.current = nextTaunt;
        setActiveTaunt((prev) => ({
          id: (prev?.id ?? 0) + 1,
          text: nextTaunt,
          streakMilestone: milestone,
        }));
        if (tauntTimerRef.current !== null) {
          window.clearTimeout(tauntTimerRef.current);
        }
        const tauntDuration =
          milestone === 20 ? 5200 : milestone === 10 ? 4600 : milestone === 5 ? 4200 : 3200;
        tauntTimerRef.current = window.setTimeout(() => {
          setActiveTaunt(null);
          tauntTimerRef.current = null;
        }, tauntDuration);
        callbacksRef.current.onDeathRecorded(lid, ld);
      },
      onDeathScreenOpen: (snapshot) => {
        callbacksRef.current.onDeathScreenOpen(snapshot);
      },
      onTrickTriggered: (k) => {
        if (k === 'trap') {
          triggerScreenShake('trap');
        }
        callbacksRef.current.onTrickTriggered(k);
      },
      onLevelComplete: (stats) => callbacksRef.current.onLevelComplete(stats),
    });

    engineRef.current = engine;
    engine.start();

    return () => {
      if (tauntTimerRef.current !== null) {
        window.clearTimeout(tauntTimerRef.current);
        tauntTimerRef.current = null;
      }
      if (shakeTimerRef.current !== null) {
        window.clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = null;
      }
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
      engine.destroy();
      engineRef.current = null;
    };
    // Intentionally mounted once per active gameplay session; level/settings/pause synced via effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync level changes
  const prevLevelRef = useRef(levelId);
  useEffect(() => {
    if (prevLevelRef.current !== levelId) {
      prevLevelRef.current = levelId;
      clearActiveTaunt();
      engineRef.current?.loadLevel(levelId);
    }
  }, [levelId]);

  // Sync explicit restarts
  const prevRestartRef = useRef(restartToken);
  useEffect(() => {
    if (prevRestartRef.current !== restartToken) {
      prevRestartRef.current = restartToken;
      clearActiveTaunt();
      engineRef.current?.restartLevel();
    }
  }, [restartToken]);

  // Sync Death Screen resolution (Rewarded Exact-Spot Respawn vs. Normal Restart)
  const prevDeathActionRef = useRef(deathAction.id);
  useEffect(() => {
    if (prevDeathActionRef.current !== deathAction.id) {
      prevDeathActionRef.current = deathAction.id;
      clearActiveTaunt();
      if (deathAction.type === 'respawn_exact') {
        engineRef.current?.respawnAtSavedDeathLocation();
      } else {
        engineRef.current?.confirmDeathRestart();
      }
    }
  }, [deathAction]);

  // Sync settings
  useEffect(() => {
    engineRef.current?.updateSettings(settings);
  }, [settings]);

  // Sync pause state
  useEffect(() => {
    engineRef.current?.setPaused(paused);
    if (paused) {
      touchActiveRef.current = { left: false, right: false, jump: false };
      setTouchState({ left: false, right: false, jump: false });
    }
  }, [paused]);

  // Keyboard bindings & window blur protection
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onPauseToggle();
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onToggleMute();
        return;
      }

      if (paused) return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        audioManager.playButtonClick();
        engine.restartLevel();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        audioManager.unlockAudio();
        engine.input.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        audioManager.unlockAudio();
        engine.input.right = true;
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        audioManager.unlockAudio();
        if (!e.repeat) {
          engine.pressJump();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        engine.input.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        engine.input.right = false;
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        engine.releaseJump();
      }
    };

    const onBlur = () => {
      engineRef.current?.clearInputs();
      touchActiveRef.current = { left: false, right: false, jump: false };
      setTouchState({ left: false, right: false, jump: false });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [paused, onPauseToggle, onToggleMute]);

  const showTouchControls =
    settings.touchControls === 'always' || (settings.touchControls === 'auto' && isTouchDevice);

  const setLeft = (active: boolean) => {
    audioManager.unlockAudio();
    if (active && !touchActiveRef.current.left) {
      audioManager.vibrateTouchControl('left');
    }
    touchActiveRef.current.left = active;
    if (engineRef.current) engineRef.current.input.left = active;
    setTouchState((prev) => (prev.left === active ? prev : { ...prev, left: active }));
  };

  const setRight = (active: boolean) => {
    audioManager.unlockAudio();
    if (active && !touchActiveRef.current.right) {
      audioManager.vibrateTouchControl('right');
    }
    touchActiveRef.current.right = active;
    if (engineRef.current) engineRef.current.input.right = active;
    setTouchState((prev) => (prev.right === active ? prev : { ...prev, right: active }));
  };

  const setJump = (active: boolean) => {
    audioManager.unlockAudio();
    if (active && !touchActiveRef.current.jump) {
      audioManager.vibrateTouchControl('jump');
    }
    touchActiveRef.current.jump = active;
    if (engineRef.current) {
      if (active) engineRef.current.pressJump();
      else engineRef.current.releaseJump();
    }
    setTouchState((prev) => (prev.jump === active ? prev : { ...prev, jump: active }));
  };

  const levelNumPadded = String(hud.levelId).padStart(2, '0');

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#F5F3EE] select-none">
      {/* Shakeable Viewport Stage (canvas + HUD jolt together on hazard impact/death) */}
      <div ref={shakeStageRef} className="relative w-full h-full">
        {/* Isolated 60fps Canvas Viewport */}
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Low-Occlusion Top HUD Overlay (pointer-events: none wrapper, zero backdrop-filter) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 safe-px sm:px-6 pt-2 sm:pt-3.5">
        {/* Top-left prominent Level Number & quiet tabular telemetry */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col leading-none pr-3 border-r border-[#111111]/20">
            <span className="text-[10px] font-mono-tabular font-semibold text-[#57534E]">
              LEVEL
            </span>
            <div className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-[#111111] font-mono-tabular mt-0.5">
              {levelNumPadded}
              <span className="text-xs sm:text-sm font-medium text-[#78716C]">
                /{LEVELS.length}
              </span>
            </div>
          </div>

          <div className="flex flex-col pt-0.5">
            <div className="text-xs sm:text-sm font-display font-bold text-[#111111] tracking-tight">
              {hud.levelName}
              <span className="hidden sm:inline font-sans font-normal text-[#57534E]">
                {' '}
                · Ch.{hud.chapter} {hud.chapterTitle}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono-tabular text-[#44403C] mt-0.5">
              <span>{formatTimeMs(hud.elapsedMs)}</span>
              <span aria-hidden="true">·</span>
              <span className={hud.levelDeaths > 0 ? 'text-[#DC2626] font-semibold' : ''}>
                {hud.levelDeaths} {hud.levelDeaths === 1 ? 'Death' : 'Deaths'}
              </span>
              {hud.checkpointReached && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#111111] font-semibold">Saved</span>
                </>
              )}
            </div>
            {hud.adaptiveHint && (
              <div className="text-[10px] sm:text-[11px] font-mono-tabular text-[#DC2626] mt-0.5">
                {hud.adaptiveHint}
              </div>
            )}
          </div>
        </div>

        {/* Top-right direct Home, Levels, Restart, Mute, and Menu buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              onGoHome();
            }}
            aria-label="Go to Home Screen"
            title="Home"
            className="h-10 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg border border-[#111111]/25 bg-[#F5F3EE] text-[#111111] text-xs font-semibold hover:border-[#111111] active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              onOpenLevels();
            }}
            aria-label="Choose Level"
            title="Levels"
            className="h-10 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg border border-[#111111]/25 bg-[#F5F3EE] text-[#111111] text-xs font-semibold hover:border-[#111111] active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Grid className="w-4 h-4" />
            <span className="hidden md:inline">Levels</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.unlockAudio();
              onToggleMute();
            }}
            aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
            title="Mute (M)"
            className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#111111]/25 bg-[#F5F3EE] text-[#111111] hover:border-[#111111] active:scale-95 transition-all cursor-pointer shrink-0"
          >
            {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              engineRef.current?.restartLevel();
            }}
            aria-label="Restart level"
            title="Restart (R)"
            className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#111111]/25 bg-[#F5F3EE] text-[#111111] hover:border-[#111111] active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              onPauseToggle();
            }}
            aria-label="Open Game Menu"
            title="Menu (Esc)"
            className="h-10 inline-flex items-center gap-1.5 px-3 rounded-lg border-2 border-[#111111] bg-[#111111] text-[#F5F3EE] text-xs font-display font-bold hover:bg-[#DC2626] hover:border-[#DC2626] active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </div>
      </div>

        {/* Persistent Corner Death Counter (constant reminder of total & level fails during active play) */}
        {!paused && (
          <div className="pointer-events-none absolute right-0 top-[54px] sm:top-[60px] z-20 safe-px sm:px-6 flex justify-end">
            <div
              key={`death-counter-${deathPulseId}`}
              aria-label={`Total failures: ${totalDeathsGlobal}, Level failures: ${hud.levelDeaths}`}
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border bg-[#F5F3EE]/95 font-mono-tabular transition-colors ${
                deathPulseId > 0 ? 'animate-taunt-slam ' : ''
              }${
                totalDeathsGlobal > 0
                  ? 'border-[#DC2626]/55 shadow-[2px_2px_0px_rgba(220,38,38,0.2)]'
                  : 'border-[#111111]/20 shadow-[2px_2px_0px_rgba(17,17,17,0.1)]'
              }`}
            >
              <Skull
                className={`w-3.5 h-3.5 shrink-0 ${
                  totalDeathsGlobal > 0 ? 'text-[#DC2626]' : 'text-[#57534E]'
                }`}
              />
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#57534E]">
                  Fails
                </span>
                <span
                  className={`text-sm sm:text-base font-extrabold ${
                    totalDeathsGlobal > 0 ? 'text-[#DC2626]' : 'text-[#111111]'
                  }`}
                >
                  {totalDeathsGlobal}
                </span>
              </div>
              <span
                aria-hidden="true"
                className="h-3 w-px bg-[#111111]/15"
              />
              <div className="flex items-baseline gap-1 leading-none text-[10px] sm:text-[11px] text-[#57534E]">
                <span>Lv</span>
                <span
                  className={`font-bold ${
                    hud.levelDeaths > 0 ? 'text-[#111111]' : 'text-[#57534E]'
                  }`}
                >
                  {hud.levelDeaths}
                </span>
              </div>
              {hud.levelDeathStreak >= 5 && (
                <>
                  <span aria-hidden="true" className="h-3 w-px bg-[#111111]/15" />
                  <span className="text-[10px] font-bold text-[#DC2626] leading-none">
                    {hud.levelDeathStreak}x
                  </span>
                </>
              )}
              {extraLives > 0 && (
                <>
                  <span aria-hidden="true" className="h-3 w-px bg-[#111111]/15" />
                  <span
                    title="Extra lives ready for exact-location respawn"
                    className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold text-[#DC2626] leading-none"
                  >
                    <Heart className="w-3 h-3 fill-[#DC2626] text-[#DC2626]" />
                    {extraLives}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sarcastic Death Taunt & Prank Banner (non-blocking top-center strip) */}
        <div className="pointer-events-none absolute inset-x-0 top-16 sm:top-14 z-20 flex flex-col items-center gap-2 px-4">
          {activeTaunt && (
            <div
              key={`taunt-${activeTaunt.id}`}
              className={`animate-taunt-slam max-w-md text-center px-4 py-2 rounded-lg bg-[#111111] text-[#F5F3EE] border-2 border-[#DC2626] shadow-[3px_3px_0px_rgba(220,38,38,0.35)] text-xs sm:text-sm font-medium ${
                activeTaunt.streakMilestone ? 'ring-2 ring-[#DC2626]/40' : ''
              }`}
            >
              {activeTaunt.streakMilestone && (
                <div className="text-[10px] font-mono-tabular font-extrabold tracking-wider text-[#DC2626] uppercase mb-0.5">
                  {activeTaunt.streakMilestone}-DEATH STREAK · STICKMAN ROAST
                </div>
              )}
              &ldquo;{activeTaunt.text}&rdquo;
            </div>
          )}
          {hud.prankBanner && (
            <div
              key={`prank-${hud.prankBannerId}`}
              className="max-w-md text-center px-3.5 py-1 rounded-lg bg-[#FFFFFF] text-[#DC2626] border-2 border-[#111111] shadow-[3px_3px_0px_rgba(17,17,17,0.2)] text-[11px] sm:text-xs font-mono-tabular font-bold"
            >
              {hud.prankBanner}
            </div>
          )}
        </div>

        {/* Mobile Landscape Touch Controls (Medium-large ergonomic thumb targets, high-contrast, multi-touch safe) */}
        {showTouchControls && !paused && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between safe-px sm:px-8 pb-3.5 sm:pb-6">
            {/* Left (Backward) & Right (Forward) directional buttons */}
            <div className="pointer-events-auto flex items-center gap-3.5 sm:gap-4">
              <button
                type="button"
                aria-label="Move Left"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setLeft(true);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  setLeft(false);
                }}
                onPointerCancel={() => setLeft(false)}
                onLostPointerCapture={() => setLeft(false)}
                className={`touch-none h-[74px] w-[74px] sm:h-[82px] sm:w-[82px] rounded-2xl border-[2.5px] flex flex-col items-center justify-center transition-all ${
                  touchState.left
                    ? 'bg-[#111111] text-[#F5F3EE] border-[#111111] translate-y-0.5 scale-95 shadow-none'
                    : 'bg-[#FFFFFF]/95 text-[#111111] border-[#111111] shadow-[0_3px_0_rgba(17,17,17,0.85)]'
                }`}
              >
                <ArrowLeft className="w-8 h-8 stroke-[2.5]" />
                <span className="text-[10px] font-mono-tabular font-bold leading-none mt-0.5 tracking-wide">
                  BACK
                </span>
              </button>

              <button
                type="button"
                aria-label="Move Right"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setRight(true);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  setRight(false);
                }}
                onPointerCancel={() => setRight(false)}
                onLostPointerCapture={() => setRight(false)}
                className={`touch-none h-[74px] w-[74px] sm:h-[82px] sm:w-[82px] rounded-2xl border-[2.5px] flex flex-col items-center justify-center transition-all ${
                  touchState.right
                    ? 'bg-[#111111] text-[#F5F3EE] border-[#111111] translate-y-0.5 scale-95 shadow-none'
                    : 'bg-[#FFFFFF]/95 text-[#111111] border-[#111111] shadow-[0_3px_0_rgba(17,17,17,0.85)]'
                }`}
              >
                <ArrowRight className="w-8 h-8 stroke-[2.5]" />
                <span className="text-[10px] font-mono-tabular font-bold leading-none mt-0.5 tracking-wide">
                  GO
                </span>
              </button>
            </div>

            {/* Jump button (supports holding for variable jump height) */}
            <div className="pointer-events-auto">
              <button
                type="button"
                aria-label="Jump"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setJump(true);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  setJump(false);
                }}
                onPointerCancel={() => setJump(false)}
                onLostPointerCapture={() => setJump(false)}
                className={`touch-none h-[82px] w-[82px] sm:h-[90px] sm:w-[90px] rounded-full border-[2.5px] flex flex-col items-center justify-center transition-all ${
                  touchState.jump
                    ? 'bg-[#DC2626] text-white border-[#DC2626] translate-y-0.5 scale-95 shadow-none'
                    : 'bg-[#111111]/95 text-[#F5F3EE] border-[#FFFFFF]/90 ring-2 ring-[#111111] shadow-[0_3px_0_#DC2626]'
                }`}
              >
                <ArrowUp className="w-8 h-8 stroke-[2.6]" />
                <span className="text-[11px] font-mono-tabular font-bold leading-none mt-0.5 tracking-wide">
                  JUMP
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Crimson Edge Impact Flash on Hazard Hit / Death */}
      {impactFlashId > 0 && (
        <div
          key={`impact-${impactFlashId}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 animate-impact-flash shadow-[inset_0_0_56px_12px_rgba(220,38,38,0.55)] border-[3px] border-[#DC2626]/70"
        />
      )}
    </div>
  );
}
