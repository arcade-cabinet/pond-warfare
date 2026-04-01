/**
 * TopBar Resources — Clams, twigs, pearls, and food display.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  clams,
  foodAtCap,
  foodDisplay,
  lowClams,
  lowTwigs,
  pearls,
  rateClams,
  rateTwigs,
  twigs,
} from '../store';

export function TopBarResources({ compact }: { compact: boolean }) {
  const clamsRate = rateClams.value;
  const twigsRate = rateTwigs.value;

  const prevClams = useRef(clams.value);
  const prevTwigs = useRef(twigs.value);
  const [clamsFlash, setClamsFlash] = useState(false);
  const [twigsFlash, setTwigsFlash] = useState(false);

  const currentClams = clams.value;
  const currentTwigs = twigs.value;

  useEffect(() => {
    if (Math.abs(currentClams - prevClams.current) >= 20) {
      setClamsFlash(true);
      const timer = setTimeout(() => setClamsFlash(false), 400);
      prevClams.current = currentClams;
      return () => clearTimeout(timer);
    }
    prevClams.current = currentClams;
  }, [currentClams]);

  useEffect(() => {
    if (Math.abs(currentTwigs - prevTwigs.current) >= 20) {
      setTwigsFlash(true);
      const timer = setTimeout(() => setTwigsFlash(false), 400);
      prevTwigs.current = currentTwigs;
      return () => clearTimeout(timer);
    }
    prevTwigs.current = currentTwigs;
  }, [currentTwigs]);

  return (
    <div class="flex space-x-3 md:space-x-6">
      {/* Clams */}
      <div class="flex items-center space-x-1 md:space-x-2">
        <div
          class="w-3 h-3 md:w-4 md:h-4 rounded-full shadow-sm"
          style={{
            background: 'radial-gradient(circle at 35% 35%, var(--pw-clam), #b8a030)',
            border: '1px solid var(--pw-otter-light)',
            boxShadow: '0 0 4px rgba(240, 208, 96, 0.3)',
          }}
        />
        {!compact && (
          <span class="font-game" style={{ color: 'var(--pw-text-secondary)' }}>
            Clams:{' '}
          </span>
        )}
        <span
          class={`font-numbers font-bold ${clamsFlash ? 'animate-resource-flash' : ''} ${lowClams.value ? 'animate-pulse' : ''}`}
          style={{ color: lowClams.value ? 'var(--pw-warning)' : 'var(--pw-clam)' }}
        >
          {clams}
        </span>
        {lowClams.value && (
          <span
            class="font-bold animate-pulse"
            style={{ color: 'var(--pw-warning)' }}
            title="Low clams!"
          >
            !
          </span>
        )}
        {!compact && clamsRate !== 0 && (
          <span
            class="text-[10px] font-numbers"
            style={{ color: clamsRate >= 0 ? 'var(--pw-success)' : 'var(--pw-enemy-light)' }}
          >
            {clamsRate >= 0 ? `+${clamsRate}` : clamsRate}
          </span>
        )}
      </div>

      {/* Twigs */}
      <div class="flex items-center space-x-1 md:space-x-2">
        <div
          class="w-3 h-3 md:w-4 md:h-4 shadow-sm"
          style={{
            background: 'linear-gradient(135deg, var(--pw-twig), #8a4820)',
            border: '1px solid var(--pw-otter)',
          }}
        />
        {!compact && (
          <span class="font-game" style={{ color: 'var(--pw-text-secondary)' }}>
            Twigs:{' '}
          </span>
        )}
        <span
          class={`font-numbers font-bold ${twigsFlash ? 'animate-resource-flash' : ''} ${lowTwigs.value ? 'animate-pulse' : ''}`}
          style={{ color: lowTwigs.value ? 'var(--pw-warning)' : 'var(--pw-twig)' }}
        >
          {twigs}
        </span>
        {lowTwigs.value && (
          <span
            class="font-bold animate-pulse"
            style={{ color: 'var(--pw-warning)' }}
            title="Low twigs!"
          >
            !
          </span>
        )}
        {!compact && twigsRate !== 0 && (
          <span
            class="text-[10px] font-numbers"
            style={{ color: twigsRate >= 0 ? 'var(--pw-success)' : 'var(--pw-enemy-light)' }}
          >
            {twigsRate >= 0 ? `+${twigsRate}` : twigsRate}
          </span>
        )}
      </div>

      {/* Pearls */}
      {pearls.value > 0 && (
        <div class="flex items-center space-x-1 md:space-x-2">
          <div
            class="w-3 h-3 md:w-4 md:h-4 rounded-full shadow-sm"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #e0e7ff, #a5b4fc)',
              border: '1px solid #a5b4fc',
              boxShadow: '0 0 4px rgba(165, 180, 252, 0.4)',
            }}
          />
          {!compact && (
            <span class="font-game" style={{ color: 'var(--pw-text-secondary)' }}>
              Pearls:{' '}
            </span>
          )}
          <span class="font-numbers font-bold" style={{ color: '#a5b4fc' }}>
            {pearls}
          </span>
        </div>
      )}

      {/* Food */}
      <div class="flex items-center space-x-1 md:space-x-2">
        <div
          class="w-3 h-3 md:w-4 md:h-4 rounded-sm shadow-sm"
          style={{
            background: 'radial-gradient(circle at 35% 35%, var(--pw-food), #a03030)',
            border: '1px solid var(--pw-enemy-light)',
          }}
        />
        {!compact && (
          <span class="font-game" style={{ color: 'var(--pw-text-secondary)' }}>
            Food:{' '}
          </span>
        )}
        <span
          class="font-numbers font-bold"
          style={{ color: foodAtCap.value ? 'var(--pw-enemy)' : 'var(--pw-food)' }}
        >
          {foodDisplay}
        </span>
      </div>
    </div>
  );
}
