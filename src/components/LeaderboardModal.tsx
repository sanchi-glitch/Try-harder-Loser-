import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Edit3,
  Flame,
  LogIn,
  LogOut,
  Skull,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { getLevelById, LEVELS } from '../data/levels';
import { audioManager } from '../engine/audio';
import {
  PLAYER_NAME_MAX_LENGTH,
  submitLevelClearTime,
  subscribeToLevelLeaderboard,
  validatePlayerNameInput,
  type LeaderboardEntryRecord,
} from '../engine/leaderboardService';
import { formatTimeMs, getLevelProgress } from '../engine/saveManager';
import { isQuotaExceededError } from '../firebase';
import type { SaveData } from '../types/game';

interface LeaderboardModalProps {
  save: SaveData;
  initialLevelId?: number;
  onClose: () => void;
}

interface HardestPreset {
  levelId: number;
  tag: string;
  accent?: boolean;
}

const HARDEST_PRESETS: HardestPreset[] = [
  { levelId: 100, tag: 'IMPOSSIBLE', accent: true },
  { levelId: 99, tag: 'ALMOST', accent: true },
  { levelId: 95, tag: 'CH.19' },
  { levelId: 90, tag: 'CH.18' },
  { levelId: 75, tag: 'CH.15' },
  { levelId: 50, tag: 'CH.10' },
  { levelId: 30, tag: 'CH.06' },
  { levelId: 10, tag: 'CH.02' },
];

export function LeaderboardModal({
  save,
  initialLevelId,
  onClose,
}: LeaderboardModalProps) {
  const {
    user,
    authReady,
    playerName,
    signingIn,
    authError,
    signInWithGoogle,
    signOutUser,
    savePlayerName,
  } = useFirebase();

  const defaultLevel =
    initialLevelId && initialLevelId >= 1 && initialLevelId <= LEVELS.length
      ? initialLevelId
      : 100;

  const [selectedLevelId, setSelectedLevelId] = useState<number>(defaultLevel);
  const [entries, setEntries] = useState<LeaderboardEntryRecord[]>([]);
  const [loadingEntries, setLoadingEntries] = useState<boolean>(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  const [syncingScore, setSyncingScore] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [editingName, setEditingName] = useState<boolean>(false);
  const [draftName, setDraftName] = useState<string>(playerName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState<boolean>(false);

  useEffect(() => {
    setDraftName(playerName);
  }, [playerName]);

  // Escape closes modal (unless editing name input)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (editingName) {
          setEditingName(false);
          setNameError(null);
        } else {
          audioManager.playButtonClick();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingName, onClose]);

  // Attach real-time Firestore listener ONLY when auth is ready and user is authenticated
  useEffect(() => {
    if (!authReady || !user) {
      setEntries([]);
      setLoadingEntries(false);
      setBoardError(null);
      return;
    }

    setLoadingEntries(true);
    setBoardError(null);
    setSyncMessage(null);

    const unsubscribe = subscribeToLevelLeaderboard(
      selectedLevelId,
      (nextEntries) => {
        setEntries(nextEntries);
        setLoadingEntries(false);
      },
      (err) => {
        setLoadingEntries(false);
        if (isQuotaExceededError(err)) {
          setBoardError(
            'Daily Firestore free-tier quota reached. Leaderboard quota resets tomorrow.',
          );
        } else {
          setBoardError('Could not load global rankings right now. Try again shortly.');
        }
      },
    );

    return () => unsubscribe();
  }, [authReady, user, selectedLevelId]);

  const levelDef = getLevelById(selectedLevelId);
  const localProg = getLevelProgress(save, selectedLevelId);
  const myEntryIndex = user ? entries.findIndex((e) => e.userId === user.uid) : -1;
  const myEntry = myEntryIndex >= 0 ? entries[myEntryIndex] : null;

  const canSyncLocalBest =
    Boolean(user?.emailVerified) &&
    localProg.completed &&
    localProg.bestTimeMs !== null &&
    (myEntry === null || localProg.bestTimeMs < myEntry.bestTimeMs);

  const handleSyncLocalBest = async () => {
    if (!user || !localProg.completed || localProg.bestTimeMs === null) return;
    setSyncingScore(true);
    setSyncMessage(null);
    try {
      const result = await submitLevelClearTime({
        levelId: selectedLevelId,
        elapsedMs: localProg.bestTimeMs,
        deaths: localProg.zeroDeathCompleted ? 0 : localProg.deaths,
        jumps: 0,
        playerName,
      });
      if (result.status === 'submitted') {
        setSyncMessage(`Synced ${formatTimeMs(result.bestTimeMs ?? localProg.bestTimeMs)}!`);
      } else if (result.status === 'existing_faster') {
        setSyncMessage('Your global record is already faster.');
      }
    } catch (err) {
      if (isQuotaExceededError(err)) {
        setSyncMessage('Daily Firestore quota reached — resets tomorrow.');
      } else {
        setSyncMessage('Could not sync score right now.');
      }
    } finally {
      setSyncingScore(false);
    }
  };

  const handleSaveName = async () => {
    const errMsg = validatePlayerNameInput(draftName);
    if (errMsg) {
      setNameError(errMsg);
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await savePlayerName(draftName);
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to save handle.');
    } finally {
      setSavingName(false);
    }
  };

  const isImpossible = selectedLevelId === 100;
  const isAlmost = selectedLevelId === 99;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/65 p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Global Leaderboards"
    >
      <div className="w-full max-w-4xl h-[92%] max-h-[520px] flex flex-col rounded-xl bg-[#F5F3EE] border-2 border-[#111111] shadow-[6px_6px_0px_#111111] text-[#111111] overflow-hidden">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#111111]/12 bg-[#ECE8DF]/75 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#111111] text-[#F5F3EE] flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-[#DC2626]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-extrabold text-base sm:text-lg leading-tight truncate">
                Global Leaderboards
              </h2>
              <p className="text-[10px] sm:text-[11px] text-[#57534E] truncate">
                Fastest verified clear times on the hardest levels
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              audioManager.playButtonClick();
              onClose();
            }}
            aria-label="Close Global Leaderboards"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#111111]/25 bg-[#FFFFFF] hover:border-[#111111] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pure Horizontal 2-Column Body */}
        <div className="flex-1 min-h-0 grid grid-cols-12 overflow-hidden">
          {/* Left Column (5 cols): Hardest Levels Quick-Select & 01–100 Stepper */}
          <aside className="col-span-5 sm:col-span-4 border-r border-[#111111]/12 bg-[#ECE8DF]/45 p-3 flex flex-col justify-between gap-2.5 overflow-y-auto touch-pan-y">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#DC2626]">
                  <Flame className="w-3 h-3" />
                  Hardest Levels
                </span>
                <span className="text-[10px] font-mono-tabular text-[#57534E]">
                  01–{LEVELS.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {HARDEST_PRESETS.map((preset) => {
                  const active = selectedLevelId === preset.levelId;
                  return (
                    <button
                      key={preset.levelId}
                      type="button"
                      onClick={() => {
                        audioManager.playButtonClick();
                        setSelectedLevelId(preset.levelId);
                      }}
                      className={`px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-[#111111] text-[#F5F3EE] border-[#111111] shadow-[2px_2px_0px_#DC2626]'
                          : preset.accent
                            ? 'bg-[#FFFFFF] text-[#111111] border-[#DC2626]/45 hover:border-[#DC2626]'
                            : 'bg-[#FFFFFF] text-[#111111] border-[#111111]/15 hover:border-[#111111]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono-tabular font-extrabold text-xs">
                          Lv {String(preset.levelId).padStart(2, '0')}
                        </span>
                        <span
                          className={`text-[9px] font-mono-tabular font-bold ${
                            active
                              ? 'text-[#DC2626]'
                              : preset.accent
                                ? 'text-[#DC2626]'
                                : 'text-[#57534E]'
                          }`}
                        >
                          {preset.tag}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Any-Level 01–100 Stepper */}
              <div className="mt-2.5 pt-2.5 border-t border-[#111111]/10">
                <div className="text-[10px] font-mono-tabular text-[#57534E] mb-1">
                  Browse Any Level
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous level leaderboard"
                    disabled={selectedLevelId <= 1}
                    onClick={() => {
                      audioManager.playButtonClick();
                      setSelectedLevelId((id) => Math.max(1, id - 1));
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#111111]/20 bg-[#FFFFFF] hover:border-[#111111] disabled:opacity-35 cursor-pointer shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 h-8 rounded-lg border border-[#111111]/20 bg-[#FFFFFF] flex items-center justify-center font-mono-tabular font-bold text-xs">
                    Level {String(selectedLevelId).padStart(2, '0')} / {LEVELS.length}
                  </div>
                  <button
                    type="button"
                    aria-label="Next level leaderboard"
                    disabled={selectedLevelId >= LEVELS.length}
                    onClick={() => {
                      audioManager.playButtonClick();
                      setSelectedLevelId((id) => Math.min(LEVELS.length, id + 1));
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#111111]/20 bg-[#FFFFFF] hover:border-[#111111] disabled:opacity-35 cursor-pointer shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Local Best Summary + One-Click Sync */}
            <div className="p-2.5 rounded-lg bg-[#FFFFFF] border border-[#111111]/15">
              <div className="text-[10px] font-mono-tabular text-[#57534E] uppercase">
                Your Local Best (Lv {String(selectedLevelId).padStart(2, '0')})
              </div>
              {localProg.completed && localProg.bestTimeMs !== null ? (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono-tabular font-extrabold text-sm text-[#111111]">
                    {formatTimeMs(localProg.bestTimeMs)}
                  </span>
                  <span className="text-[10px] font-mono-tabular text-[#57534E]">
                    {localProg.deaths}d total
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-[#78716C]">Not cleared yet.</div>
              )}

              {canSyncLocalBest && (
                <button
                  type="button"
                  disabled={syncingScore}
                  onClick={handleSyncLocalBest}
                  className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md bg-[#111111] text-[#F5F3EE] text-[11px] font-bold hover:bg-[#DC2626] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  {syncingScore ? 'Syncing...' : 'Post Best Time'}
                </button>
              )}

              {syncMessage && (
                <div className="mt-1.5 text-[10px] font-mono-tabular text-[#DC2626] font-semibold">
                  {syncMessage}
                </div>
              )}
            </div>
          </aside>

          {/* Right Column (7 cols): Auth Gate OR Live Global Rankings */}
          <section className="col-span-7 sm:col-span-8 flex flex-col min-h-0 p-3 sm:p-4 overflow-hidden">
            {/* Selected Level Title Bar */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#111111]/12 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono-tabular font-extrabold text-xs text-[#DC2626]">
                    LV {String(selectedLevelId).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-mono-tabular text-[#57534E]">
                    · Ch.{levelDef.chapter} {levelDef.chapterTitle}
                  </span>
                  {isImpossible && (
                    <span className="px-1.5 py-0.5 rounded bg-[#111111] text-[#DC2626] text-[9px] font-mono-tabular font-bold">
                      LITERALLY IMPOSSIBLE
                    </span>
                  )}
                  {isAlmost && (
                    <span className="px-1.5 py-0.5 rounded bg-[#DC2626]/12 text-[#DC2626] text-[9px] font-mono-tabular font-bold">
                      ALMOST IMPOSSIBLE
                    </span>
                  )}
                </div>
                <h3 className="font-display font-extrabold text-sm sm:text-base truncate mt-0.5">
                  {levelDef.name}
                </h3>
              </div>

              {user && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {!editingName ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftName(playerName);
                          setNameError(null);
                          setEditingName(true);
                        }}
                        title="Edit public leaderboard handle"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#111111]/20 bg-[#FFFFFF] text-[11px] font-mono-tabular font-semibold hover:border-[#111111] cursor-pointer max-w-[140px]"
                      >
                        <span className="truncate">{playerName}</span>
                        <Edit3 className="w-3 h-3 shrink-0 text-[#57534E]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playButtonClick();
                          void signOutUser();
                        }}
                        title="Sign out"
                        aria-label="Sign out"
                        className="h-7 w-7 flex items-center justify-center rounded-md border border-[#111111]/20 bg-[#FFFFFF] text-[#57534E] hover:text-[#DC2626] hover:border-[#DC2626] cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={draftName}
                        maxLength={PLAYER_NAME_MAX_LENGTH}
                        onChange={(e) => {
                          setDraftName(e.target.value);
                          setNameError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleSaveName();
                          }
                        }}
                        aria-label="Public leaderboard handle"
                        className="h-7 w-32 px-2 rounded-md border border-[#111111] bg-[#FFFFFF] text-xs font-mono-tabular focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={savingName}
                        onClick={() => void handleSaveName()}
                        aria-label="Save handle"
                        className="h-7 px-2 rounded-md bg-[#111111] text-[#F5F3EE] text-[11px] font-bold hover:bg-[#DC2626] cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {nameError && (
              <div className="mt-1.5 text-[10px] font-mono-tabular text-[#DC2626] shrink-0">
                {nameError}
              </div>
            )}

            {/* Main Content Area */}
            {!authReady ? (
              <div className="flex-1 flex items-center justify-center text-xs font-mono-tabular text-[#57534E]">
                Connecting to global leaderboards...
              </div>
            ) : !user ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#F5F3EE] flex items-center justify-center mb-2.5 shadow-[3px_3px_0px_#DC2626]">
                  <Crown className="w-5 h-5 text-[#DC2626]" />
                </div>
                <h4 className="font-display font-extrabold text-base sm:text-lg">
                  Prove You Actually Beat It.
                </h4>
                <p className="text-xs text-[#57534E] max-w-sm mt-1">
                  Sign in with Google to view live global fastest times and submit your personal
                  records for Levels 01–100.
                </p>
                {authError && (
                  <p className="mt-2 text-[11px] font-mono-tabular text-[#DC2626] max-w-sm">
                    {authError}
                  </p>
                )}
                <button
                  type="button"
                  disabled={signingIn}
                  onClick={() => {
                    audioManager.playButtonClick();
                    void signInWithGoogle();
                  }}
                  className="mt-3.5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#111111] text-[#F5F3EE] font-display font-bold text-xs sm:text-sm shadow-[3px_3px_0px_#DC2626] hover:bg-[#DC2626] hover:shadow-[3px_3px_0px_#111111] disabled:opacity-50 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  {signingIn ? 'Opening Google Sign-In...' : 'Sign in with Google'}
                </button>
              </div>
            ) : boardError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <p className="text-xs font-mono-tabular text-[#DC2626] max-w-sm">{boardError}</p>
              </div>
            ) : loadingEntries ? (
              <div className="flex-1 flex items-center justify-center text-xs font-mono-tabular text-[#57534E]">
                Loading fastest runs for Level {String(selectedLevelId).padStart(2, '0')}...
              </div>
            ) : entries.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <Skull className="w-7 h-7 text-[#DC2626] mb-2" />
                <div className="font-display font-bold text-sm sm:text-base">
                  {isImpossible
                    ? 'Zero verified clears on Level 100.'
                    : `No global records on Level ${String(selectedLevelId).padStart(2, '0')} yet.`}
                </div>
                <p className="text-xs text-[#57534E] mt-1 max-w-sm">
                  {isImpossible
                    ? 'Nobody has crossed the impossible gauntlet yet. Beat Level 100 to claim #1 in history.'
                    : 'Beat this level while signed in — or click Post Best Time if you already cleared it.'}
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col mt-2">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-2.5 py-1 text-[10px] font-mono-tabular font-bold uppercase text-[#57534E] border-b border-[#111111]/10 shrink-0">
                  <div className="col-span-2">Rank</div>
                  <div className="col-span-5">Runner</div>
                  <div className="col-span-3 text-right">Time</div>
                  <div className="col-span-2 text-right">Deaths</div>
                </div>

                {/* Scrollable Rows */}
                <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y divide-y divide-[#111111]/8">
                  {entries.map((entry, idx) => {
                    const rank = idx + 1;
                    const isMe = entry.userId === user.uid;
                    return (
                      <div
                        key={entry.userId}
                        className={`grid grid-cols-12 gap-2 items-center px-2.5 py-1.5 text-xs font-mono-tabular ${
                          isMe ? 'bg-[#DC2626]/10 font-bold' : ''
                        }`}
                      >
                        <div className="col-span-2 flex items-center gap-1">
                          <span
                            className={`inline-flex items-center justify-center min-w-[24px] px-1 py-0.5 rounded text-[11px] font-extrabold ${
                              rank === 1
                                ? 'bg-[#111111] text-[#F5F3EE]'
                                : rank === 2
                                  ? 'bg-[#DC2626] text-[#F5F3EE]'
                                  : rank === 3
                                    ? 'bg-[#D6D1C7] text-[#111111]'
                                    : 'text-[#57534E]'
                            }`}
                          >
                            #{rank}
                          </span>
                        </div>
                        <div className="col-span-5 flex items-center gap-1.5 min-w-0 font-sans">
                          <span className="truncate font-semibold text-[#111111]">
                            {entry.playerName}
                          </span>
                          {isMe && (
                            <span className="px-1 py-0.5 rounded bg-[#111111] text-[#F5F3EE] text-[9px] font-mono-tabular font-bold shrink-0">
                              YOU
                            </span>
                          )}
                          {entry.zeroDeath && (
                            <span className="hidden sm:inline px-1 py-0.5 rounded bg-[#DC2626]/12 text-[#DC2626] text-[9px] font-mono-tabular font-bold shrink-0">
                              0D
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 text-right font-extrabold text-[#111111]">
                          {formatTimeMs(entry.bestTimeMs)}
                        </div>
                        <div className="col-span-2 text-right text-[11px] text-[#57534E]">
                          {entry.deaths}d
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Personal Standing Footer */}
                <div className="pt-2 mt-1 border-t border-[#111111]/12 flex items-center justify-between text-[11px] font-mono-tabular text-[#57534E] shrink-0">
                  {myEntry ? (
                    <span>
                      Your Global Rank:{' '}
                      <strong className="text-[#111111]">#{myEntryIndex + 1}</strong> ·{' '}
                      <strong className="text-[#DC2626]">{formatTimeMs(myEntry.bestTimeMs)}</strong>
                    </span>
                  ) : (
                    <span>Not ranked in top 25 on Lv {String(selectedLevelId).padStart(2, '0')} yet.</span>
                  )}
                  <span>Top {entries.length}</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
