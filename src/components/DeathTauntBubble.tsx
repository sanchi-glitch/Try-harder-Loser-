import { useEffect, useState } from 'react';
import { Skull } from 'lucide-react';
import {
  deathTauntService,
  type DeathTauntPopup,
} from '../services/deathTauntService';

interface DeathTauntBubbleProps {
  isFinale100?: boolean;
}

/**
 * Editorial comic pop-up speech bubble subscribing to deathTauntService.
 * Pops in immediately when the player dies with sarcastic, context-aware mocking
 * and auto-dismisses without ever blocking controls.
 */
export function DeathTauntBubble({ isFinale100 = false }: DeathTauntBubbleProps) {
  const [taunt, setTaunt] = useState<DeathTauntPopup | null>(() =>
    deathTauntService.getActiveTaunt(),
  );

  useEffect(() => {
    return deathTauntService.subscribe(setTaunt);
  }, []);

  if (!taunt) return null;

  const isBrutal = taunt.severity === 'brutal' || Boolean(taunt.streakMilestone);
  const isCruel = taunt.severity === 'cruel';

  const bubbleClasses = isFinale100
    ? 'bg-[#09090B] text-[#F5F3EE] border-[#EAB308] shadow-[4px_4px_0px_#DC2626]'
    : isBrutal
      ? 'bg-[#111111] text-[#F5F3EE] border-[#DC2626] shadow-[4px_4px_0px_#DC2626]'
      : isCruel
        ? 'bg-[#111111] text-[#F5F3EE] border-[#DC2626] shadow-[3px_3px_0px_rgba(220,38,38,0.45)]'
        : 'bg-[#FFFFFF] text-[#111111] border-[#111111] shadow-[3px_3px_0px_#DC2626]';

  const tailFill = isFinale100
    ? '#09090B'
    : isBrutal || isCruel
      ? '#111111'
      : '#FFFFFF';

  const tailStroke = isFinale100
    ? '#EAB308'
    : isBrutal || isCruel
      ? '#DC2626'
      : '#111111';

  const tagClasses = isFinale100
    ? 'text-[#EAB308]'
    : isBrutal || isCruel
      ? 'text-[#F87171]'
      : 'text-[#DC2626]';

  return (
    <div
      key={`death-taunt-bubble-${taunt.id}`}
      role="status"
      aria-live="polite"
      className="animate-commentary-mock relative max-w-[min(90vw,420px)] flex flex-col items-center"
    >
      <div
        className={`relative px-4 py-2.5 rounded-2xl border-2 text-center transition-colors ${bubbleClasses} ${
          isBrutal ? 'ring-2 ring-[#DC2626]/35' : ''
        }`}
      >
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <Skull className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
          <span
            className={`text-[10px] font-mono-tabular font-extrabold tracking-wider uppercase leading-none ${tagClasses}`}
          >
            {taunt.streakMilestone
              ? `${taunt.streakMilestone}-DEATH STREAK · ${taunt.tag}`
              : taunt.tag}
          </span>
        </div>

        <p className="text-xs sm:text-sm font-display font-bold leading-snug tracking-tight">
          &ldquo;{taunt.text}&rdquo;
        </p>
      </div>

      {/* Speech-bubble pointer tail directed down toward the playfield */}
      <svg
        width="20"
        height="11"
        viewBox="0 0 20 11"
        className="-mt-[2px] block shrink-0"
        aria-hidden="true"
      >
        <path
          d="M 2 0 L 10 9 L 18 0"
          fill={tailFill}
          stroke={tailStroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <line x1="3" y1="0" x2="17" y2="0" stroke={tailFill} strokeWidth="3" />
      </svg>
    </div>
  );
}
