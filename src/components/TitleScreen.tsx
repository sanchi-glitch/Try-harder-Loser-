import { useEffect, useRef, useState } from 'react';
import {
  Award,
  BarChart3,
  Grid,
  HelpCircle,
  Maximize2,
  Menu,
  Play,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { getCrueltyTier, getHomeStickmanInsults } from '../data/deathMessages';
import { CHAPTERS, getLevelById, LEVELS } from '../data/levels';
import { audioManager } from '../engine/audio';
import type { SaveData } from '../types/game';
import { HomeBannerAdSlot } from './AdMobOverlays';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  save: SaveData;
  modalOpen: boolean;
  onPlay: () => void;
  onContinue: () => void;
  onOpenLevels: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  onOpenAchievements: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({
  save,
  modalOpen,
  onPlay,
  onContinue,
  onOpenLevels,
  onOpenSettings,
  onOpenStats,
  onOpenAchievements,
  onToggleMute,
}: TitleScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);

  const hasProgress = save.highestUnlockedLevelId > 1 || save.totalDeaths > 0;
  const currentLevel = getLevelById(save.currentLevelId);

  // Keyboard Enter / Space starts immediately when no modal or menu drawer is open
  useEffect(() => {
    if (modalOpen || menuDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        audioManager.unlockAudio();
        audioManager.playButtonClick();
        if (hasProgress) onContinue();
        else onPlay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, menuDrawerOpen, hasProgress, onContinue, onPlay]);

  // Live aesthetic ink-on-paper stickman diorama with live roasting speech bubbles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let t = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth || 960;
      const cssH = canvas.clientHeight || 540;
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#F5F3EE';
      ctx.fillRect(0, 0, w, h);

      const scale = Math.min(w / 960, h / 540);
      const ox = (w - 960 * scale) * 0.5;
      const oy = (h - 540 * scale) * 0.5;
      const viewMinX = -ox / scale;
      const viewMaxX = (w - ox) / scale;
      const viewMinY = -oy / scale;
      const viewMaxY = (h - oy) / scale;
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);

      // Subtle architectural drafting grid extending seamlessly edge to edge
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.042)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      const drift = (t * 12) % gridSize;
      const firstX = Math.floor((viewMinX + drift) / gridSize) * gridSize - drift;
      const firstY = Math.floor(viewMinY / gridSize) * gridSize;
      ctx.beginPath();
      for (let x = firstX; x <= viewMaxX + gridSize; x += gridSize) {
        ctx.moveTo(x, viewMinY);
        ctx.lineTo(x, viewMaxY);
      }
      for (let y = firstY; y <= viewMaxY + gridSize; y += gridSize) {
        ctx.moveTo(viewMinX, y);
        ctx.lineTo(viewMaxX, y);
      }
      ctx.stroke();

      // Delicate floating ink dust motes across full visible width
      const spanW = Math.max(980, viewMaxX - viewMinX + 20);
      const moteCount = Math.max(12, Math.round((spanW / 980) * 12));
      ctx.fillStyle = 'rgba(17, 17, 17, 0.12)';
      for (let i = 0; i < moteCount; i++) {
        const mx =
          ((((i * 173 + t * (8 + (i % 3) * 3)) % spanW) + spanW) % spanW) + viewMinX - 10;
        const my = 50 + ((i * 71) % 340) + Math.sin(t * 1.2 + i) * 8;
        ctx.beginPath();
        ctx.arc(mx, my, 1.3 + (i % 2) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Floor silhouette along lower horizon with offset ink drop-shadow
      const floorY = 448;
      ctx.fillStyle = 'rgba(17, 17, 17, 0.1)';
      ctx.fillRect(4, floorY + 4, 536, 120);
      ctx.fillRect(644, floorY + 4, 340, 120);

      ctx.fillStyle = '#111111';
      ctx.fillRect(0, floorY, 536, 120);
      ctx.fillRect(640, floorY, 340, 120);

      // Cheeky floating crumble ledge over gap (slightly thicker visual height)
      const crumbleBob = Math.sin(t * 2.2) * 2.5;
      const crumbleH = 26;
      ctx.fillStyle = 'rgba(17, 17, 17, 0.1)';
      ctx.fillRect(560, floorY + crumbleBob + 4, 64, crumbleH);
      ctx.fillStyle = '#111111';
      ctx.fillRect(556, floorY + crumbleBob, 64, crumbleH);
      ctx.strokeStyle = '#F5F3EE';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(580, floorY + crumbleBob);
      ctx.lineTo(588, floorY + crumbleBob + crumbleH * 0.55);
      ctx.lineTo(576, floorY + crumbleBob + crumbleH);
      ctx.stroke();

      // Sneaky pop-up spike — completely hidden until it springs up
      const cycle = t % 8.4;
      const spikeUp = cycle > 2.6 && cycle < 4.1 ? Math.min(1, (cycle - 2.6) * 5) : 0;
      if (spikeUp > 0.05) {
        ctx.fillStyle = '#DC2626';
        const sh = 22 * spikeUp;
        for (let i = 0; i < 3; i++) {
          const sx = 722 + i * 14;
          ctx.beginPath();
          ctx.moveTo(sx + 1, floorY);
          ctx.lineTo(sx + 7, floorY - sh);
          ctx.lineTo(sx + 13, floorY);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Playful exit door on the right that scoots back when approached
      const doorX = cycle > 4.6 && cycle < 6.8 ? 882 : 830;
      ctx.fillStyle = 'rgba(17, 17, 17, 0.12)';
      ctx.fillRect(doorX - 16, floorY - 60, 40, 64);
      ctx.fillStyle = '#111111';
      ctx.fillRect(doorX - 20, floorY - 64, 40, 64);
      ctx.fillStyle = '#262626';
      ctx.fillRect(doorX - 15, floorY - 59, 30, 59);
      ctx.fillStyle = '#F5F3EE';
      ctx.beginPath();
      ctx.arc(doorX + 9, floorY - 28, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', doorX, floorY - 70);

      // Animated stickman strolling, jumping gap, and openly insulting the player!
      let sx = 195;
      let sy = floorY;
      let facing: 1 | -1 = 1;
      let staring = false;
      let running = false;

      if (cycle < 2.4) {
        sx = 195;
        staring = true;
      } else if (cycle < 4.9) {
        const p = (cycle - 2.4) / 2.5;
        sx = 195 + p * 560;
        running = true;
        if (sx > 512 && sx < 656) {
          const jp = (sx - 512) / 144;
          sy = floorY - Math.sin(jp * Math.PI) * 80;
        }
      } else if (cycle < 6.4) {
        sx = 755;
        staring = true;
      } else {
        const p = (cycle - 6.4) / 2.0;
        sx = 755 - p * 560;
        facing = -1;
        running = true;
        if (sx > 512 && sx < 656) {
          const jp = (sx - 512) / 144;
          sy = floorY - Math.sin(jp * Math.PI) * 80;
        }
      }

      // Stickman shadow + figure
      ctx.save();
      ctx.translate(sx, sy);
      if (sy >= floorY - 1) {
        ctx.fillStyle = 'rgba(17, 17, 17, 0.15)';
        ctx.beginPath();
        ctx.ellipse(0, 1, 10, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      const swing = running ? Math.sin(t * 14) * 8 : 0;
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(-5 + swing, 0);
      ctx.moveTo(0, -15);
      ctx.lineTo(5 - swing, 0);
      ctx.moveTo(0, -15);
      ctx.lineTo(0, -28);
      ctx.moveTo(0, -27);
      ctx.lineTo(-7 - swing * 0.8, -18);
      ctx.moveTo(0, -27);
      ctx.lineTo(7 + swing * 0.8, -18);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -36, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const ex = staring ? 0 : facing * 2.2;
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(ex - 2.7, -36.8, 1.55, 0, Math.PI * 2);
      ctx.arc(ex + 2.7, -36.8, 1.55, 0, Math.PI * 2);
      ctx.fill();

      // Smug brows & smirk when insulting the user on Home Screen
      if (staring) {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5.0, -40.5);
        ctx.lineTo(-1.0, -39.0);
        ctx.moveTo(1.0, -39.0);
        ctx.lineTo(5.0, -40.5);
        ctx.moveTo(-2.8, -32.2);
        ctx.quadraticCurveTo(0.4, -31.5, 3.3, -33.4);
        ctx.stroke();
      }
      ctx.restore();

      // Continuous autonomous stickman insult speech bubble right on the Home Screen (no tap needed, scales crueler with level!)
      const activeProgressLevel = Math.max(save.currentLevelId, save.highestUnlockedLevelId);
      const homeInsults = getHomeStickmanInsults(activeProgressLevel);
      const isCruelDarkHome = getCrueltyTier(activeProgressLevel) >= 4;
      const showHomeBubble = (t % 4.6) < 3.85;
      if (showHomeBubble) {
        const insultIdx = Math.floor(t / 4.6) % homeInsults.length;
        const text = homeInsults[insultIdx];
        ctx.save();
        ctx.font = '700 11.5px "DM Sans", sans-serif';
        const bw = Math.max(96, ctx.measureText(text).width + 24);
        const bh = 27;
        const clampedX = Math.max(bw / 2 + 16, Math.min(960 - bw / 2 - 16, sx));
        const bx = clampedX - bw / 2;
        const by = sy - 86;

        ctx.fillStyle = isCruelDarkHome ? 'rgba(220, 38, 38, 0.34)' : 'rgba(220, 38, 38, 0.2)';
        ctx.beginPath();
        ctx.roundRect(bx + 3, by + 3, bw, bh, 7);
        ctx.fill();

        ctx.fillStyle = isCruelDarkHome ? '#111111' : '#FFFFFF';
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 7);
        ctx.fill();
        ctx.stroke();

        const tailX = Math.max(bx + 12, Math.min(bx + bw - 12, sx));
        ctx.beginPath();
        ctx.moveTo(tailX - 5, by + bh - 1);
        ctx.lineTo(tailX, by + bh + 6);
        ctx.lineTo(tailX + 5, by + bh - 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isCruelDarkHome ? '#F5F3EE' : '#111111';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, clampedX, by + bh / 2 + 0.5);
        ctx.restore();
      }

      // Little lying sign on left
      ctx.fillStyle = '#111111';
      ctx.fillRect(88, floorY - 26, 3, 26);
      ctx.fillStyle = 'rgba(17, 17, 17, 0.1)';
      ctx.beginPath();
      ctx.roundRect(43, floorY - 49, 98, 26, 4);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(40, floorY - 52, 98, 26, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#111111';
      ctx.font = '600 11px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Totally Fair.', 89, floorY - 35);

      // Soft warm sketchbook vignette seamlessly spanning entire visible background
      const fullW = viewMaxX - viewMinX;
      const fullH = viewMaxY - viewMinY;
      const vigCenterX = (viewMinX + viewMaxX) * 0.5;
      const vigCenterY = (viewMinY + viewMaxY) * 0.48;
      const vigOuterRadius = Math.hypot(fullW * 0.54, fullH * 0.54);
      const vig = ctx.createRadialGradient(
        vigCenterX,
        vigCenterY,
        Math.min(fullW, fullH) * 0.34,
        vigCenterX,
        (viewMinY + viewMaxY) * 0.5,
        vigOuterRadius,
      );
      vig.addColorStop(0, 'rgba(245, 243, 238, 0)');
      vig.addColorStop(1, 'rgba(17, 17, 17, 0.09)');
      ctx.fillStyle = vig;
      ctx.fillRect(viewMinX, viewMinY, fullW, fullH);

      ctx.restore();
      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, [save.currentLevelId, save.highestUnlockedLevelId]);

  const completedCount = Object.values(save.levels).filter((l) => l.completed).length;

  const toggleLandscapeFullscreen = async () => {
    audioManager.unlockAudio();
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

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#F5F3EE] select-none flex flex-col">
      {/* Live-world minimalist stickman canvas backdrop */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* Clean horizontal top bar on Home Screen */}
      <header className="relative z-20 shrink-0 flex items-center justify-between gap-3 safe-px sm:px-8 pt-2 sm:pt-3.5">
        <div className="text-[11px] sm:text-xs font-mono-tabular text-[#57534E] whitespace-nowrap">
          {LEVELS.length} Levels · {CHAPTERS.length} Chapters · {save.totalDeaths} Deaths
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleLandscapeFullscreen}
            aria-label="Toggle Horizontal Fullscreen"
            title="Fullscreen Landscape"
            className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg border border-[#111111]/25 bg-[#F5F3EE] text-[#111111] hover:border-[#111111] transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.unlockAudio();
              onToggleMute();
            }}
            aria-label={save.settings.muted ? 'Unmute audio' : 'Mute audio'}
            className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg border border-[#111111]/25 bg-[#F5F3EE] text-[#111111] hover:border-[#111111] transition-colors cursor-pointer"
          >
            {save.settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.unlockAudio();
              audioManager.playButtonClick();
              setMenuDrawerOpen(true);
            }}
            className="h-9 sm:h-10 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 rounded-lg border-2 border-[#111111] bg-[#FFFFFF] text-[#111111] font-display font-bold text-xs sm:text-sm hover:bg-[#111111] hover:text-[#F5F3EE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Menu className="w-4 h-4" />
            Menu
          </button>
        </div>
      </header>

      {/* Main Horizontal Home Stage — centered cleanly above the control hint & Home-only Banner */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center safe-px pb-1 sm:pb-3">
        <div className="max-w-3xl w-full flex flex-col items-center text-center">
          {/* Bespoke inline SVG Title Lockup */}
          <svg
            viewBox="0 0 680 114"
            className="w-full max-w-[300px] sm:max-w-[450px] lg:max-w-[560px] h-auto mb-0.5 sm:mb-1.5"
            role="img"
            aria-label="Try harder, Loser!"
          >
            <polygon points="36,26 46,6 56,26" fill="#DC2626" />
            <text
              x="343"
              y="76"
              textAnchor="middle"
              fill="rgba(17,17,17,0.12)"
              style={{
                fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: '60px',
                letterSpacing: '-0.035em',
              }}
            >
              Try harder, Loser!
            </text>
            <text
              x="340"
              y="73"
              textAnchor="middle"
              fill="#111111"
              style={{
                fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
                fontWeight: 800,
                fontSize: '60px',
                letterSpacing: '-0.035em',
              }}
            >
              Try harder, Loser!
            </text>
            <path
              d="M 64 92 Q 340 81 616 94"
              fill="none"
              stroke="#DC2626"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
          </svg>

          <p className="text-[11px] sm:text-sm text-[#44403C] font-medium mb-2.5 sm:mb-4 max-w-xl text-balance">
            100 levels. Zero mercy. Don&apos;t blame the game. You&apos;re just bad.
          </p>

          {/* Primary Single-Row Horizontal Action Strip: Play, Levels, Game Options */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3.5">
            {hasProgress ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    audioManager.unlockAudio();
                    audioManager.playButtonClick();
                    onContinue();
                  }}
                  className="inline-flex items-center gap-2 px-5 sm:px-7 py-2 sm:py-3 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-xs sm:text-base tracking-tight shadow-[3px_3px_0px_#DC2626] hover:bg-[#DC2626] hover:shadow-[3px_3px_0px_#111111] active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  Continue · Lv {String(currentLevel.id).padStart(2, '0')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audioManager.unlockAudio();
                    audioManager.playButtonClick();
                    onPlay();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-3 rounded-lg border-2 border-[#111111] bg-[#FFFFFF] text-[#111111] font-semibold text-xs sm:text-sm hover:bg-[#111111] hover:text-[#F5F3EE] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  New Run
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  audioManager.unlockAudio();
                  audioManager.playButtonClick();
                  onPlay();
                }}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-2 sm:py-3 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-xs sm:text-base tracking-tight shadow-[3px_3px_0px_#DC2626] hover:bg-[#DC2626] hover:shadow-[3px_3px_0px_#111111] active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                Play Game
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                audioManager.unlockAudio();
                audioManager.playButtonClick();
                onOpenLevels();
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-3 rounded-lg border-2 border-[#111111] bg-[#FFFFFF] text-[#111111] font-display font-bold text-xs sm:text-sm hover:bg-[#111111] hover:text-[#F5F3EE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Levels ({completedCount}/{LEVELS.length})
            </button>

            <button
              type="button"
              onClick={() => {
                audioManager.unlockAudio();
                audioManager.playButtonClick();
                setMenuDrawerOpen(true);
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-[#111111]/30 bg-[#F5F3EE]/95 text-[#111111] font-semibold text-xs sm:text-sm hover:border-[#111111] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Game Options
            </button>
          </div>

          {/* Quiet direct horizontal secondary row */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-0.5 text-[11px] sm:text-sm font-semibold text-[#111111]">
            <button
              type="button"
              onClick={() => {
                audioManager.unlockAudio();
                audioManager.playButtonClick();
                onOpenAchievements();
              }}
              className="inline-flex items-center gap-1.5 py-1 hover:text-[#DC2626] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Award className="w-3.5 h-3.5" />
              Achievements ({save.unlockedAchievements.length}/10)
            </button>
            <span className="text-[#111111]/25" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={() => {
                audioManager.unlockAudio();
                audioManager.playButtonClick();
                onOpenStats();
              }}
              className="inline-flex items-center gap-1.5 py-1 hover:text-[#DC2626] transition-colors cursor-pointer whitespace-nowrap"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Statistics
            </button>
            <span className="text-[#111111]/25" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={() => {
                audioManager.unlockAudio();
                audioManager.playButtonClick();
                onOpenSettings();
              }}
              className="inline-flex items-center gap-1.5 py-1 hover:text-[#DC2626] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Home Dock: Control hint + Home-Screen-Only AdMob Banner (zero overlap with controls) */}
      <div className="relative z-20 shrink-0 flex flex-col items-center">
        <div className="text-center pointer-events-none safe-px pb-1">
          <p className="text-[10px] sm:text-[11px] font-mono-tabular text-[#57534E]">
            Horizontal Mode · A / D Move · Space Jump · R Restart · Esc Menu
          </p>
        </div>
        <HomeBannerAdSlot visible={!modalOpen && !menuDrawerOpen} />
      </div>

      {/* Wide Horizontal 2-Column Game Menu Modal (fits cleanly on short landscape phone screens) */}
      {menuDrawerOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#111111]/60 p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Game Menu"
        >
          <div className="w-full max-w-2xl max-h-[92%] overflow-y-auto touch-pan-y rounded-xl bg-[#F5F3EE] border-2 border-[#111111] shadow-[6px_6px_0px_#111111] p-4 sm:p-5 text-[#111111]">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#111111]/12">
              <div className="flex items-center gap-3">
                <img
                  src="/icons/icon-192x192.png"
                  alt="Try harder, Loser! app icon"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#111111]/20 shadow-[2px_2px_0px_rgba(17,17,17,0.12)] shrink-0"
                />
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                  <h2 className="font-display font-extrabold text-lg sm:text-2xl tracking-tight leading-none">
                    Game Menu
                  </h2>
                  <p className="text-[11px] sm:text-xs text-[#57534E]">
                    All modes, levels &amp; horizontal options
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioManager.playButtonClick();
                  setMenuDrawerOpen(false);
                }}
                aria-label="Close menu"
                className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg border border-[#111111]/25 hover:border-[#111111] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-12 gap-3.5 py-3.5 items-stretch">
              {/* Left horizontal column: Hero Start/Continue & Fullscreen */}
              <div className="col-span-5 flex flex-col justify-between gap-2.5 p-3.5 rounded-lg bg-[#FFFFFF] border border-[#111111]/15">
                <div>
                  <div className="text-[10px] font-mono-tabular font-bold text-[#DC2626] uppercase">
                    {hasProgress ? `NEXT UP · LV ${String(currentLevel.id).padStart(2, '0')}` : 'READY TO SUFFER'}
                  </div>
                  <div className="font-display font-bold text-sm sm:text-base leading-snug mt-0.5">
                    {hasProgress ? currentLevel.name : 'Level 01 · Trust Issues'}
                  </div>
                  <p className="text-[11px] text-[#57534E] mt-1 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 shrink-0" />
                    <span>Trust signs at your own risk.</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playButtonClick();
                      setMenuDrawerOpen(false);
                      if (hasProgress) onContinue();
                      else onPlay();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-xs sm:text-sm hover:bg-[#DC2626] transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {hasProgress ? `Continue Lv ${String(currentLevel.id).padStart(2, '0')}` : 'Start Level 01'}
                  </button>

                  <button
                    type="button"
                    onClick={toggleLandscapeFullscreen}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-[#111111]/25 bg-[#F5F3EE] text-[11px] font-semibold text-[#111111] hover:border-[#111111] cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Fullscreen Landscape
                  </button>

                  <PWAInstallButton onInstalledOrOpened={() => setMenuDrawerOpen(false)} />
                </div>
              </div>

              {/* Right horizontal column: 2x2 navigation grid */}
              <div className="col-span-7 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    setMenuDrawerOpen(false);
                    onOpenLevels();
                  }}
                  className="flex flex-col items-start justify-between p-3 rounded-lg border-2 border-[#111111] bg-[#FFFFFF] hover:bg-[#111111] hover:text-[#F5F3EE] transition-colors cursor-pointer text-left"
                >
                  <Grid className="w-4 h-4" />
                  <div className="mt-2">
                    <div className="font-display font-bold text-xs sm:text-sm">Levels</div>
                    <div className="text-[11px] font-mono-tabular opacity-75">
                      {completedCount}/{LEVELS.length} cleared
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    setMenuDrawerOpen(false);
                    onOpenSettings();
                  }}
                  className="flex flex-col items-start justify-between p-3 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] hover:border-[#111111] transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4" />
                  <div className="mt-2">
                    <div className="font-display font-bold text-xs sm:text-sm">Settings</div>
                    <div className="text-[11px] text-[#57534E]">Audio, touch &amp; unlocks</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    setMenuDrawerOpen(false);
                    onOpenAchievements();
                  }}
                  className="flex flex-col items-start justify-between p-3 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] hover:border-[#111111] transition-colors cursor-pointer text-left"
                >
                  <Award className="w-4 h-4" />
                  <div className="mt-2">
                    <div className="font-display font-bold text-xs sm:text-sm">Achievements</div>
                    <div className="text-[11px] font-mono-tabular text-[#57534E]">
                      {save.unlockedAchievements.length}/10 unlocked
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButtonClick();
                    setMenuDrawerOpen(false);
                    onOpenStats();
                  }}
                  className="flex flex-col items-start justify-between p-3 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] hover:border-[#111111] transition-colors cursor-pointer text-left"
                >
                  <BarChart3 className="w-4 h-4" />
                  <div className="mt-2">
                    <div className="font-display font-bold text-xs sm:text-sm">Statistics</div>
                    <div className="text-[11px] font-mono-tabular text-[#57534E]">
                      {save.totalDeaths} total deaths
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
