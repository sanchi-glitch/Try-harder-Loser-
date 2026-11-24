import { ChevronRight, Crown, Globe } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { LEVELS } from '../data/levels';
import { audioManager } from '../engine/audio';
import {
  FINAL_LEVEL_ID,
  subscribeToWorldRank,
  type WorldRankSummary,
} from '../engine/leaderboardService';
import { isQuotaExceededError } from '../firebase';
import type { SaveData } from '../types/game';

interface WorldRankIndicatorProps {
  save: SaveData;
  onOpenLeaderboards: () => void;
}

export function WorldRankIndicator({
  save,
  onOpenLeaderboards,
}: WorldRankIndicatorProps) {
  const { user, authReady } = useFirebase();

  const [summary, setSummary] = useState<WorldRankSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorType, setErrorType] = useState<'quota' | 'offline' | null>(null);

  // Attach real-time Firestore listener ONLY when auth is ready and user is signed in
  useEffect(() => {
    if (!authReady || !user) {
      setSummary(null);
      setLoading(false);
      setErrorType(null);
      return;
    }

    setLoading(true);
    setErrorType(null);

    const unsubscribe = subscribeToWorldRank(
      user.uid,
      (nextSummary) => {
        setSummary(nextSummary);
        setLoading(false);
        setErrorType(null);
      },
      (err) => {
        setLoading(false);
        setErrorType(isQuotaExceededError(err) ? 'quota' : 'offline');
      },
    );

    return () => unsubscribe();
  }, [authReady, user]);

  const totalLevels = LEVELS.length;
  const completedCount = Object.values(save.levels).filter((l) => l.completed).length;
  const completedGameLocally = Boolean(save.levels[FINAL_LEVEL_ID]?.completed);

  const isChampion = Boolean(user && summary && summary.userRank === 1);

  let rankBadgeText = 'SIGN IN';
  let rankBadgeClass = 'bg-[#111111]/8 text-[#111111]';
  let finishersCountText: string | null = null;
  let finishersLabelText = 'Sign in to view global finishers';
  let comparisonText = completedGameLocally
    ? `You: ${completedCount}/${totalLevels} · Claim World Rank`
    : `You: ${completedCount}/${totalLevels}`;

  if (!authReady) {
    rankBadgeText = '...';
    rankBadgeClass = 'bg-[#111111]/8 text-[#57534E]';
    finishersLabelText = 'Checking global finishers...';
  } else if (user) {
    if (loading && !summary) {
      rankBadgeText = '...';
      rankBadgeClass = 'bg-[#111111]/8 text-[#57534E]';
      finishersLabelText = 'Loading global finishers...';
    } else if (errorType && !summary) {
      rankBadgeText = 'OFFLINE';
      rankBadgeClass = 'bg-[#111111]/8 text-[#57534E]';
      finishersLabelText =
        errorType === 'quota' ? 'Daily rank quota reached' : 'Rankings unavailable';
    } else if (summary) {
      const plus = summary.hasMoreFinishers ? '+' : '';
      finishersCountText = `${summary.totalFinishers}${plus}`;
      finishersLabelText =
        summary.totalFinishers === 1 && !summary.hasMoreFinishers
          ? 'player finished'
          : 'players finished';

      if (summary.userRank === 1) {
        rankBadgeText = '#1';
        rankBadgeClass = 'bg-[#DC2626] text-[#F5F3EE]';
        if (summary.totalFinishers === 1 && !summary.hasMoreFinishers) {
          comparisonText = 'You: Sole champion';
        } else {
          const beaten = summary.totalFinishers - 1;
          comparisonText = `You beat ${beaten}${plus} ${beaten === 1 && !summary.hasMoreFinishers ? 'other' : 'others'}`;
        }
      } else if (summary.userRank !== null) {
        rankBadgeText = `#${summary.userRank}`;
        rankBadgeClass = 'bg-[#111111] text-[#F5F3EE]';
        const ahead = summary.userRank - 1;
        comparisonText = `You: Finished · ${ahead} ahead of you`;
      } else if (summary.userVerifiedFinisher) {
        rankBadgeText = '#50+';
        rankBadgeClass = 'bg-[#111111] text-[#F5F3EE]';
        comparisonText = 'You: Finished · 50+ ahead';
      } else if (completedGameLocally) {
        rankBadgeText = 'UNSYNCED';
        rankBadgeClass = 'bg-[#DC2626]/12 text-[#DC2626]';
        comparisonText = `You: ${completedCount}/${totalLevels} · Tap to post clear`;
      } else {
        rankBadgeText = 'UNRANKED';
        rankBadgeClass = 'bg-[#111111]/8 text-[#57534E]';
        comparisonText =
          summary.totalFinishers === 0
            ? `You: ${completedCount}/${totalLevels} · Claim #1`
            : `You: ${completedCount}/${totalLevels} · ${summary.totalFinishers}${plus} ahead of you`;
      }
    }
  }

  const ariaLabel = finishersCountText
    ? `World Rank ${rankBadgeText}. ${finishersCountText} ${finishersLabelText}. ${comparisonText}. Open global leaderboards.`
    : `World Rank ${rankBadgeText}. ${finishersLabelText}. ${comparisonText}. Open global leaderboards.`;

  return (
    <button
      type="button"
      onClick={() => {
        audioManager.unlockAudio();
        audioManager.playButtonClick();
        onOpenLeaderboards();
      }}
      aria-label={ariaLabel}
      className="group inline-flex flex-wrap sm:flex-nowrap items-center justify-center gap-x-2 sm:gap-x-3 gap-y-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 mb-2 sm:mb-3 rounded-lg border-2 border-[#111111] bg-[#FFFFFF]/95 text-[#111111] shadow-[2px_2px_0px_#111111] hover:border-[#DC2626] hover:shadow-[2px_2px_0px_#DC2626] active:translate-y-0.5 transition-all cursor-pointer max-w-full"
    >
      {/* Segment 1: World Rank Label & Standing */}
      <span className="inline-flex items-center gap-1.5 shrink-0">
        {isChampion ? (
          <Crown className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
        ) : (
          <Globe className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
        )}
        <span className="text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#57534E]">
          World Rank
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono-tabular font-extrabold leading-none ${rankBadgeClass}`}
        >
          {rankBadgeText}
        </span>
      </span>

      <span className="hidden sm:inline-block h-3.5 w-px bg-[#111111]/15 shrink-0" aria-hidden="true" />

      {/* Segment 2: Global Players Who Completed the Game */}
      <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-mono-tabular text-[#111111] whitespace-nowrap">
        {finishersCountText !== null ? (
          <>
            <strong className="font-extrabold text-[#111111]">{finishersCountText}</strong>
            <span className="text-[#57534E]">{finishersLabelText}</span>
          </>
        ) : (
          <span className="text-[#57534E]">{finishersLabelText}</span>
        )}
      </span>

      <span className="hidden sm:inline-block h-3.5 w-px bg-[#111111]/15 shrink-0" aria-hidden="true" />

      {/* Segment 3: Direct User Comparison */}
      <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-mono-tabular font-semibold text-[#111111] whitespace-nowrap">
        <span>{comparisonText}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#57534E] group-hover:text-[#DC2626] group-hover:translate-x-0.5 transition-all shrink-0" />
      </span>
    </button>
  );
}
