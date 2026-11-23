import { Check, ChevronLeft, ChevronRight, Home, Lock, Play, Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAPTERS, LEVELS } from '../data/levels';
import { audioManager } from '../engine/audio';
import { formatTimeMs, getLevelProgress } from '../engine/saveManager';
import type { SaveData } from '../types/game';

interface LevelSelectProps {
  save: SaveData;
  modalOpen?: boolean;
  onSelectLevel: (levelId: number) => void;
  onOpenLeaderboards?: (levelId: number) => void;
  onBack: () => void;
}

const isViewportRotated = (): boolean => {
  if (typeof window === 'undefined') return false;
  const vw = window.visualViewport?.width ?? window.innerWidth;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  return vh > vw;
};

const getRelativeOffsetLeft = (container: HTMLElement, child: HTMLElement): number => {
  let left = 0;
  let node: HTMLElement | null = child;
  while (node && node !== container) {
    left += node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return left;
};

const centerElementInRail = (
  container: HTMLElement | null,
  child: HTMLElement | null,
  instant = false,
) => {
  if (!container || !child) return;
  const childLeft = getRelativeOffsetLeft(container, child);
  const targetLeft = childLeft - container.clientWidth / 2 + child.offsetWidth / 2;
  const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
  const clamped = Math.max(0, Math.min(maxScroll, targetLeft));
  container.scrollTo({ left: clamped, behavior: instant ? 'auto' : 'smooth' });
};

export function LevelSelect({
  save,
  modalOpen = false,
  onSelectLevel,
  onOpenLeaderboards,
  onBack,
}: LevelSelectProps) {
  const totalLevels = LEVELS.length;
  const initialLevelId = Math.min(totalLevels, Math.max(1, save.currentLevelId || 1));

  const [focusedLevelId, setFocusedLevelId] = useState<number>(initialLevelId);
  const [lockedNotice, setLockedNotice] = useState<{
    levelId: number;
    requiredLevelId: number;
    pulse: number;
  } | null>(null);
  const [trackWidth, setTrackWidth] = useState<number>(360);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  const chapterRailRef = useRef<HTMLDivElement | null>(null);
  const levelStripRef = useRef<HTMLDivElement | null>(null);
  const chapterBtnRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const levelCardRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const cursorTrackRef = useRef<HTMLDivElement | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const suppressChapterClickRef = useRef<boolean>(false);
  const suppressLevelClickRef = useRef<boolean>(false);
  const hasCenteredInitialRef = useRef<boolean>(false);

  const selectedChapter = Math.min(
    CHAPTERS.length,
    Math.max(1, Math.ceil(focusedLevelId / 5)),
  );
  const chapterMeta = CHAPTERS.find((c) => c.id === selectedChapter) ?? CHAPTERS[0];
  const chapterLevels = LEVELS.filter((l) => l.chapter === selectedChapter);
  const focusedLevel = LEVELS.find((l) => l.id === focusedLevelId) ?? LEVELS[0];

  const isLevelUnlocked = useCallback(
    (levelId: number): boolean => {
      if (save.settings.unlockAllLevels) return true;
      if (levelId <= 1) return true;
      return (
        levelId <= save.highestUnlockedLevelId &&
        Boolean(save.levels[levelId - 1]?.completed)
      );
    },
    [save.highestUnlockedLevelId, save.levels, save.settings.unlockAllLevels],
  );

  const highestReachableLevel = save.settings.unlockAllLevels
    ? totalLevels
    : Math.min(totalLevels, Math.max(1, save.highestUnlockedLevelId));

  const completedTotal = Object.values(save.levels).filter((l) => l.completed).length;
  const focusedUnlocked = isLevelUnlocked(focusedLevelId);

  const triggerLockedNotice = useCallback((levelId: number) => {
    const requiredLevelId = Math.max(1, levelId - 1);
    audioManager.unlockAudio();
    audioManager.playTrap();
    setLockedNotice((prev) => ({
      levelId,
      requiredLevelId,
      pulse: (prev?.pulse ?? 0) + 1,
    }));
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setLockedNotice(null);
      noticeTimerRef.current = null;
    }, 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const moveCursorToLevel = useCallback(
    (nextLevelId: number, playTick = true) => {
      const clamped = Math.min(totalLevels, Math.max(1, nextLevelId));
      setFocusedLevelId((prev) => {
        if (prev !== clamped && playTick) {
          audioManager.playButtonClick();
        }
        return clamped;
      });
    },
    [totalLevels],
  );

  const jumpToChapter = useCallback((chapterId: number) => {
    const clampedChapter = Math.min(CHAPTERS.length, Math.max(1, chapterId));
    const firstLevelInChapter = (clampedChapter - 1) * 5 + 1;
    audioManager.playButtonClick();
    setFocusedLevelId(firstLevelInChapter);
  }, []);

  const attemptOpenLevel = useCallback(
    (levelId: number) => {
      setFocusedLevelId(levelId);
      if (!isLevelUnlocked(levelId)) {
        triggerLockedNotice(levelId);
        return;
      }
      audioManager.unlockAudio();
      audioManager.playButtonClick();
      onSelectLevel(levelId);
    },
    [isLevelUnlocked, onSelectLevel, triggerLockedNotice],
  );

  // Auto-center active chapter button & focused level card when cursor moves
  useEffect(() => {
    const instant = !hasCenteredInitialRef.current;
    hasCenteredInitialRef.current = true;
    const rafId = window.requestAnimationFrame(() => {
      centerElementInRail(
        chapterRailRef.current,
        chapterBtnRefs.current[selectedChapter],
        instant,
      );
      centerElementInRail(
        levelStripRef.current,
        levelCardRefs.current[focusedLevelId],
        instant,
      );
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [focusedLevelId, selectedChapter]);

  // Measure cursor track local width safely inside rotated/native stages
  useEffect(() => {
    const el = cursorTrackRef.current;
    if (!el) return;
    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setTrackWidth(el.clientWidth);
      }
    };
    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateWidth);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Keyboard navigation across all 100 levels & 20 chapters
  useEffect(() => {
    if (modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        moveCursorToLevel(focusedLevelId + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        moveCursorToLevel(focusedLevelId - 1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        moveCursorToLevel(focusedLevelId + 5);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        moveCursorToLevel(focusedLevelId - 5);
      } else if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target as HTMLElement | null;
        if (target && target.tagName === 'BUTTON') return;
        e.preventDefault();
        attemptOpenLevel(focusedLevelId);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        audioManager.playButtonClick();
        onBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [attemptOpenLevel, focusedLevelId, modalOpen, moveCursorToLevel, onBack]);

  // Rotated-aware horizontal drag-to-scroll for chapter rail & level cards strip
  const startRailDrag = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      railEl: HTMLDivElement | null,
      suppressClickRef: React.MutableRefObject<boolean>,
    ) => {
      if (!railEl) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      const rotated = isViewportRotated();
      const startAxis = rotated ? e.clientY : e.clientX;
      const startScrollLeft = railEl.scrollLeft;
      const pointerId = e.pointerId;
      let dragged = false;

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const currentAxis = rotated ? moveEvent.clientY : moveEvent.clientX;
        const delta = currentAxis - startAxis;
        if (!dragged && Math.abs(delta) > 7) {
          dragged = true;
          suppressClickRef.current = true;
        }
        if (dragged) {
          railEl.scrollLeft = startScrollLeft - delta;
        }
      };

      const finishDrag = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', finishDrag);
        if (dragged) {
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 40);
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
    },
    [],
  );

  // Rotated-aware 1–100 cursor track scrubber
  const updateLevelFromTrackPointer = useCallback(
    (clientX: number, clientY: number, playTick = false) => {
      const el = cursorTrackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const rotated = isViewportRotated();
      const rawRatio = rotated
        ? (clientY - rect.top) / Math.max(1, rect.height)
        : (clientX - rect.left) / Math.max(1, rect.width);
      const clampedRatio = Math.max(0, Math.min(1, rawRatio));
      const levelId = Math.min(
        totalLevels,
        Math.max(1, Math.round(clampedRatio * (totalLevels - 1)) + 1),
      );
      moveCursorToLevel(levelId, playTick);
    },
    [moveCursorToLevel, totalLevels],
  );

  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const pointerId = e.pointerId;
      setIsScrubbing(true);
      updateLevelFromTrackPointer(e.clientX, e.clientY, true);

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        updateLevelFromTrackPointer(moveEvent.clientX, moveEvent.clientY, false);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) return;
        setIsScrubbing(false);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [updateLevelFromTrackPointer],
  );

  const handleRailWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>, railEl: HTMLDivElement | null) => {
      if (!railEl) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta !== 0) {
        railEl.scrollLeft += delta;
      }
    },
    [],
  );

  // SVG cursor track geometry (zero inline styles, crisp at any width)
  const trackPad = 14;
  const usableTrackWidth = Math.max(40, trackWidth - trackPad * 2);
  const levelToX = (levelId: number) =>
    trackPad + ((levelId - 1) / Math.max(1, totalLevels - 1)) * usableTrackWidth;
  const cursorX = levelToX(focusedLevelId);
  const unlockedEndX = levelToX(highestReachableLevel);

  return (
    <div className="w-full h-full bg-[#F5F3EE] text-[#111111] flex flex-col overflow-hidden">
      {/* Compact horizontal top bar */}
      <header className="flex items-center justify-between gap-3 safe-px sm:px-8 py-2 sm:py-2.5 border-b border-[#111111]/12 shrink-0">
        <button
          type="button"
          onClick={() => {
            audioManager.playButtonClick();
            onBack();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] text-xs sm:text-sm font-semibold text-[#111111] hover:border-[#111111] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Home className="w-4 h-4" />
          Home
        </button>

        <h1 className="font-display font-extrabold text-base sm:text-xl tracking-tight whitespace-nowrap">
          Levels 01–{totalLevels}
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenLeaderboards && (
            <button
              type="button"
              onClick={() => {
                audioManager.playButtonClick();
                onOpenLeaderboards(focusedLevelId);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] text-[11px] sm:text-xs font-semibold text-[#111111] hover:border-[#DC2626] hover:text-[#DC2626] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>Rankings</span>
            </button>
          )}
          <div className="text-[11px] sm:text-sm font-mono-tabular text-[#57534E] whitespace-nowrap">
            {completedTotal}/{totalLevels} Cleared · {save.totalDeaths} Deaths
          </div>
        </div>
      </header>

      {/* Horizontal chapter selector rail with left/right arrows + rotated-aware touch drag */}
      <div className="safe-px sm:px-8 pt-2 pb-1 shrink-0 flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous chapter"
          disabled={selectedChapter <= 1}
          onClick={() => jumpToChapter(selectedChapter - 1)}
          className="w-8 h-10 rounded-lg border border-[#111111]/20 bg-[#FFFFFF] flex items-center justify-center text-[#111111] hover:border-[#111111] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={chapterRailRef}
          onPointerDown={(e) =>
            startRailDrag(e, chapterRailRef.current, suppressChapterClickRef)
          }
          onWheel={(e) => handleRailWheel(e, chapterRailRef.current)}
          onClickCapture={(e) => {
            if (suppressChapterClickRef.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className="relative flex-1 min-w-0 overflow-x-auto touch-none cursor-grab active:cursor-grabbing py-0.5"
        >
          <div className="flex items-center gap-2 min-w-max pr-2">
            {CHAPTERS.map((ch) => {
              const chLevels = LEVELS.filter((l) => l.chapter === ch.id);
              const chDone = chLevels.filter((l) => save.levels[l.id]?.completed).length;
              const chUnlocked = chLevels.some((l) => isLevelUnlocked(l.id));
              const active = selectedChapter === ch.id;

              return (
                <button
                  key={ch.id}
                  ref={(el) => {
                    chapterBtnRefs.current[ch.id] = el;
                  }}
                  type="button"
                  onClick={() => jumpToChapter(ch.id)}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg text-left transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#111111] text-[#F5F3EE] border-[#111111] shadow-[2px_2px_0px_#DC2626]'
                      : 'bg-[#FFFFFF] text-[#111111] border-[#111111]/15 hover:border-[#111111]/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono-tabular opacity-75">
                    <span>Ch.{ch.id}</span>
                    <span>·</span>
                    <span>
                      {chDone}/{chLevels.length}
                    </span>
                    {!chUnlocked && <Lock className="w-3 h-3" />}
                  </div>
                  <div className="font-display font-bold text-xs sm:text-sm mt-0.5">
                    {ch.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Next chapter"
          disabled={selectedChapter >= CHAPTERS.length}
          onClick={() => jumpToChapter(selectedChapter + 1)}
          className="w-8 h-10 rounded-lg border border-[#111111]/20 bg-[#FFFFFF] flex items-center justify-center text-[#111111] hover:border-[#111111] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Pure Horizontal 5-Level Panorama Band (rotated-aware swipe on mobile, 5-up grid on desktop) */}
      <main className="flex-1 min-h-0 flex flex-col justify-center safe-px sm:px-8 py-1.5 sm:py-2">
        <div className="w-full max-w-7xl mx-auto flex flex-col h-full justify-center">
          <div className="mb-1.5 sm:mb-2.5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <h2 className="font-display font-extrabold text-sm sm:text-xl tracking-tight truncate">
                Chapter {chapterMeta.id}: {chapterMeta.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#57534E] truncate hidden sm:block">
                {chapterMeta.subtitle}
              </p>
            </div>

            {lockedNotice ? (
              <div
                key={lockedNotice.pulse}
                className="animate-taunt-slam inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#DC2626] text-[#F5F3EE] text-[11px] sm:text-xs font-mono-tabular font-semibold whitespace-nowrap shrink-0"
              >
                <Lock className="w-3 h-3" />
                <span>
                  Lv {String(lockedNotice.levelId).padStart(2, '0')} locked · Beat Lv{' '}
                  {String(lockedNotice.requiredLevelId).padStart(2, '0')} first
                </span>
              </div>
            ) : (
              <p className="text-[11px] sm:text-xs text-[#57534E] truncate sm:hidden">
                {chapterMeta.subtitle}
              </p>
            )}
          </div>

          <div
            ref={levelStripRef}
            onPointerDown={(e) =>
              startRailDrag(e, levelStripRef.current, suppressLevelClickRef)
            }
            onWheel={(e) => handleRailWheel(e, levelStripRef.current)}
            onClickCapture={(e) => {
              if (suppressLevelClickRef.current) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className="relative flex @5xl:grid @5xl:grid-cols-5 gap-3 overflow-x-auto @5xl:overflow-visible touch-none cursor-grab active:cursor-grabbing py-1.5 px-0.5 items-stretch"
          >
            {chapterLevels.map((lvl) => {
              const unlocked = isLevelUnlocked(lvl.id);
              const isFocused = lvl.id === focusedLevelId;
              const isShaking =
                lockedNotice !== null && lockedNotice.levelId === lvl.id;
              const prog = getLevelProgress(save, lvl.id);
              const numLabel = String(lvl.id).padStart(2, '0');
              const prevLabel = String(Math.max(1, lvl.id - 1)).padStart(2, '0');
              const isLevel100 = lvl.id === 100;
              const isLevel99 = lvl.id === 99;

              return (
                <button
                  key={`${lvl.id}-${isShaking ? lockedNotice?.pulse : 0}`}
                  ref={(el) => {
                    levelCardRefs.current[lvl.id] = el;
                  }}
                  type="button"
                  aria-current={isFocused ? 'true' : undefined}
                  onClick={() => attemptOpenLevel(lvl.id)}
                  className={`relative group shrink-0 w-[205px] sm:w-[230px] @5xl:w-auto text-left p-3 sm:p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between min-h-[150px] sm:min-h-[182px] cursor-pointer ${
                    isShaking ? 'animate-trap-shake ' : ''
                  }${
                    unlocked
                      ? isLevel100
                        ? `bg-[#111111] text-[#F5F3EE] border-[#DC2626] ${
                            isFocused
                              ? 'shadow-[4px_4px_0px_#DC2626] -translate-y-0.5 ring-2 ring-[#DC2626] ring-offset-2 ring-offset-[#F5F3EE]'
                              : 'shadow-[3px_3px_0px_#DC2626] hover:-translate-y-0.5'
                          }`
                        : isLevel99
                          ? `bg-[#FFFFFF] border-[#DC2626] ${
                              isFocused
                                ? 'shadow-[4px_4px_0px_#DC2626] -translate-y-0.5 ring-2 ring-[#DC2626] ring-offset-2 ring-offset-[#F5F3EE]'
                                : 'shadow-[3px_3px_0px_rgba(220,38,38,0.28)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#DC2626]'
                            }`
                          : `bg-[#FFFFFF] ${
                              isFocused
                                ? 'border-[#DC2626] shadow-[4px_4px_0px_#DC2626] -translate-y-0.5 ring-2 ring-[#DC2626]/30'
                                : 'border-[#111111] shadow-[3px_3px_0px_rgba(17,17,17,0.12)] hover:-translate-y-0.5 hover:border-[#DC2626] hover:shadow-[4px_4px_0px_#DC2626]'
                            }`
                      : isFocused
                        ? isLevel100
                          ? 'bg-[#1D1B19] text-[#EAE6DD] border-[#DC2626] shadow-[4px_4px_0px_#DC2626] -translate-y-0.5'
                          : 'bg-[#F0ECE2] text-[#292524] border-[#DC2626] shadow-[4px_4px_0px_rgba(220,38,38,0.35)] -translate-y-0.5'
                        : isLevel100
                          ? 'bg-[#262320]/90 text-[#A8A29E] border-[#DC2626]/40 hover:border-[#DC2626]/80'
                          : 'bg-[#EAE6DD]/75 border-[#111111]/15 text-[#78716C] hover:border-[#111111]/45'
                  }`}
                >
                  {/* Active cursor marker tab */}
                  {isFocused && (
                    <span className="absolute -top-2.5 left-3 px-1.5 py-0.5 rounded bg-[#DC2626] text-[#F5F3EE] text-[9px] font-mono-tabular font-bold uppercase tracking-wider leading-none shadow-sm">
                      ▼
                    </span>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`font-display font-extrabold text-2xl sm:text-3xl leading-none font-mono-tabular ${
                            isLevel100
                              ? 'text-[#DC2626]'
                              : unlocked
                                ? isFocused
                                  ? 'text-[#DC2626]'
                                  : 'text-[#111111] group-hover:text-[#DC2626]'
                                : isFocused
                                  ? 'text-[#111111]'
                                  : 'text-[#78716C]'
                          }`}
                        >
                          {numLabel}
                        </span>
                        <span
                          className={`text-[10px] sm:text-xs font-mono-tabular ${
                            isLevel100 ? 'text-[#D6D1C7]' : 'text-[#57534E]'
                          }`}
                        >
                          {lvl.chapter}-{lvl.levelInChapter}
                        </span>
                      </div>

                      {prog.completed ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono-tabular font-semibold ${
                            isLevel100 ? 'text-[#F5F3EE]' : 'text-[#111111]'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 text-[#DC2626]" />
                          {isLevel100 ? 'PEAK' : 'Clear'}
                        </span>
                      ) : !unlocked ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono-tabular font-semibold ${
                            isLevel100
                              ? 'text-[#DC2626]'
                              : isFocused
                                ? 'text-[#DC2626]'
                                : 'text-[#78716C]'
                          }`}
                        >
                          <Lock className="w-3 h-3" />
                          {isLevel100 ? 'IMPOSSIBLE' : isLevel99 ? 'ALMOST' : 'Locked'}
                        </span>
                      ) : isLevel100 ? (
                        <span className="text-[10px] font-mono-tabular font-bold text-[#DC2626]">
                          IMPOSSIBLE
                        </span>
                      ) : isLevel99 ? (
                        <span className="text-[10px] font-mono-tabular font-bold text-[#DC2626]">
                          ALMOST
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono-tabular text-[#57534E]">
                          Ready
                        </span>
                      )}
                    </div>

                    <h3
                      className={`font-display font-bold text-sm sm:text-base leading-snug mt-1.5 transition-colors ${
                        isLevel100
                          ? 'text-[#F5F3EE]'
                          : unlocked
                            ? 'text-[#111111] group-hover:text-[#DC2626]'
                            : isFocused
                              ? 'text-[#111111]'
                              : 'text-[#57534E]'
                      }`}
                    >
                      {lvl.name}
                    </h3>
                    <p
                      className={`text-[11px] sm:text-xs mt-1 leading-snug line-clamp-2 ${
                        isLevel100 ? 'text-[#D6D1C7]' : 'text-[#57534E]'
                      }`}
                    >
                      {lvl.subtitle}
                    </p>
                  </div>

                  <div
                    className={`pt-2 mt-2 border-t flex items-center justify-between gap-2 text-[11px] font-mono-tabular ${
                      isLevel100 ? 'border-[#F5F3EE]/15' : 'border-[#111111]/10'
                    }`}
                  >
                    <div
                      className={`truncate ${
                        isLevel100 ? 'text-[#D6D1C7]' : 'text-[#57534E]'
                      }`}
                    >
                      {prog.bestTimeMs !== null ? (
                        <span>{formatTimeMs(prog.bestTimeMs)}</span>
                      ) : (
                        <span>No clear</span>
                      )}
                      <span> · </span>
                      <span>{prog.deaths}d</span>
                    </div>

                    {unlocked ? (
                      <span
                        className={`inline-flex items-center gap-1 font-sans font-bold shrink-0 ${
                          isLevel100
                            ? 'text-[#DC2626] group-hover:text-[#F5F3EE]'
                            : 'text-[#111111] group-hover:text-[#DC2626]'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Play
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 font-mono-tabular text-[10px] shrink-0 ${
                          isFocused ? 'text-[#DC2626] font-semibold' : 'text-[#78716C]'
                        }`}
                      >
                        Beat {prevLabel}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Bottom movable Level Cursor Navigator (drag or tap 01–100, works rotated & native) */}
      <footer className="safe-px sm:px-8 safe-pb pt-1.5 border-t border-[#111111]/12 bg-[#ECE8DF]/85 shrink-0">
        <div className="w-full max-w-7xl mx-auto flex items-center gap-2 sm:gap-3">
          {/* Step cursor -1 */}
          <button
            type="button"
            aria-label="Move cursor to previous level"
            disabled={focusedLevelId <= 1}
            onClick={() => moveCursorToLevel(focusedLevelId - 1)}
            className="w-9 h-9 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] flex items-center justify-center text-[#111111] hover:border-[#111111] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Interactive 01-100 SVG cursor scrubber */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-between text-[10px] font-mono-tabular text-[#57534E] px-1">
              <span>01</span>
              <span className="font-semibold text-[#111111] truncate px-2">
                Cursor: Lv {String(focusedLevelId).padStart(2, '0')} / {totalLevels} ·{' '}
                {focusedLevel.name}
              </span>
              <span>{totalLevels}</span>
            </div>

            <div
              ref={cursorTrackRef}
              role="slider"
              aria-label="Browse all 100 levels"
              aria-valuemin={1}
              aria-valuemax={totalLevels}
              aria-valuenow={focusedLevelId}
              tabIndex={0}
              onPointerDown={handleTrackPointerDown}
              className="relative w-full h-7 touch-none cursor-ew-resize select-none"
            >
              <svg
                width="100%"
                height="28"
                viewBox={`0 0 ${trackWidth} 28`}
                className="block overflow-visible"
              >
                {/* Base full 1-100 rail */}
                <rect
                  x={trackPad}
                  y={11}
                  width={usableTrackWidth}
                  height={6}
                  rx={3}
                  fill="#D6D1C7"
                />

                {/* Unlocked progression bar */}
                <rect
                  x={trackPad}
                  y={11}
                  width={Math.max(4, unlockedEndX - trackPad)}
                  height={6}
                  rx={3}
                  fill="#111111"
                />

                {/* Chapter tick marks (every 5 levels) */}
                {CHAPTERS.map((ch) => {
                  const tickLvl = (ch.id - 1) * 5 + 1;
                  const tx = levelToX(tickLvl);
                  return (
                    <line
                      key={ch.id}
                      x1={tx}
                      y1={8}
                      x2={tx}
                      y2={20}
                      stroke={tickLvl <= highestReachableLevel ? '#111111' : '#A8A29E'}
                      strokeWidth={1}
                      opacity={0.5}
                    />
                  );
                })}

                {/* Unlocked frontier marker */}
                <circle
                  cx={unlockedEndX}
                  cy={14}
                  r={4}
                  fill="#111111"
                  stroke="#F5F3EE"
                  strokeWidth={1.5}
                />

                {/* Movable Crimson Cursor Handle */}
                <g transform={`translate(${cursorX}, 14)`}>
                  <rect
                    x={isScrubbing ? -14 : -12}
                    y={isScrubbing ? -11 : -10}
                    width={isScrubbing ? 28 : 24}
                    height={isScrubbing ? 22 : 20}
                    rx={6}
                    fill={focusedUnlocked ? '#111111' : '#DC2626'}
                    stroke="#F5F3EE"
                    strokeWidth={2}
                  />
                  <text
                    x={0}
                    y={3.5}
                    textAnchor="middle"
                    fill="#F5F3EE"
                    fontSize={9}
                    fontWeight={700}
                    fontFamily="var(--font-mono)"
                  >
                    {String(focusedLevelId).padStart(2, '0')}
                  </text>
                </g>
              </svg>
            </div>
          </div>

          {/* Step cursor +1 */}
          <button
            type="button"
            aria-label="Move cursor to next level"
            disabled={focusedLevelId >= totalLevels}
            onClick={() => moveCursorToLevel(focusedLevelId + 1)}
            className="w-9 h-9 rounded-lg border border-[#111111]/25 bg-[#FFFFFF] flex items-center justify-center text-[#111111] hover:border-[#111111] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Open focused level (strictly blocked if locked) */}
          <button
            type="button"
            onClick={() => attemptOpenLevel(focusedLevelId)}
            className={`h-9 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              focusedUnlocked
                ? 'bg-[#111111] text-[#F5F3EE] border-2 border-[#111111] shadow-[2px_2px_0px_#DC2626] hover:bg-[#DC2626] hover:border-[#DC2626]'
                : 'bg-[#E5E0D6] text-[#78716C] border border-[#111111]/20 hover:border-[#DC2626]/60'
            }`}
          >
            {focusedUnlocked ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play {String(focusedLevelId).padStart(2, '0')}</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>Beat {String(Math.max(1, focusedLevelId - 1)).padStart(2, '0')}</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
