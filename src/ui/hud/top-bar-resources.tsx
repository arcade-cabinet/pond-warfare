/**
 * TopBar Resources — Fish, rocks, pearls, and food display.
 * Directional flash: green/gold on increase, red on decrease.
 * Food flashes green/red on population change, orange at cap.
 *
 * v3 resource rename: Clams -> Fish, Twigs -> Rocks.
 * Internal signals still use `clams`/`twigs` for backward compat.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  clams,
  food,
  foodAtCap,
  foodDisplay,
  lastFoodChange,
  lastResourceChange,
  lowClams,
  lowTwigs,
  maxFood,
  pearls,
  rateClams,
  rateTwigs,
  twigs,
} from '../store';

type FlashDir = '' | 'up' | 'down' | 'cap';

function useDirectionalFlash(
  currentValue: number,
  threshold: number,
  deltaFromSignal?: number,
): FlashDir {
  const prev = useRef(currentValue);
  const [flash, setFlash] = useState<FlashDir>('');

  useEffect(() => {
    const delta = deltaFromSignal ?? currentValue - prev.current;
    if (Math.abs(delta) >= threshold) {
      setFlash(delta > 0 ? 'up' : 'down');
      const timer = setTimeout(() => setFlash(''), 400);
      prev.current = currentValue;
      return () => clearTimeout(timer);
    }
    prev.current = currentValue;
  }, [currentValue, deltaFromSignal, threshold]);

  return flash;
}

function flashClass(dir: FlashDir): string {
  if (dir === 'up') return 'animate-resource-flash-up';
  if (dir === 'down') return 'animate-resource-flash-down';
  if (dir === 'cap') return 'animate-food-flash-cap';
  return '';
}

export function TopBarResources({ compact }: { compact: boolean }) {
  const fishRate = rateClams.value;
  const rocksRate = rateTwigs.value;

  const currentFish = clams.value;
  const currentRocks = twigs.value;
  const currentPearls = pearls.value;
  const currentFood = food.value;
  const currentMaxFood = maxFood.value;

  const resChange = lastResourceChange.value;
  const foodChange = lastFoodChange.value;

  const fishFlash = useDirectionalFlash(currentFish, 5, resChange.clams);
  const rocksFlash = useDirectionalFlash(currentRocks, 5, resChange.twigs);
  const pearlsFlash = useDirectionalFlash(currentPearls, 5, resChange.pearls);

  // Food flash: directional + cap override
  const foodDir = useDirectionalFlash(currentFood, 1, foodChange.delta);
  const prevAtCap = useRef(foodAtCap.value);
  const [foodFlash, setFoodFlash] = useState<FlashDir>('');

  useEffect(() => {
    if (foodAtCap.value && !prevAtCap.current) {
      setFoodFlash('cap');
      const timer = setTimeout(() => setFoodFlash(''), 400);
      prevAtCap.current = foodAtCap.value;
      return () => clearTimeout(timer);
    }
    prevAtCap.current = foodAtCap.value;
    if (foodDir) setFoodFlash(foodDir);
    else setFoodFlash('');
  }, [foodDir, currentFood, currentMaxFood]);

  return (
    <div class="flex space-x-3 md:space-x-6">
      {/* Fish (formerly Clams) */}
      <div
        role="status"
        class="flex items-center space-x-1 md:space-x-2"
        aria-label={`Fish: ${currentFish}`}
      >
        <div
          class="w-3 h-3 md:w-4 md:h-4 rounded-full shadow-sm"
          style={{
            background: 'radial-gradient(circle at 35% 35%, var(--pw-clam), #4a90b0)',
            border: '1px solid var(--pw-otter-light)',
            boxShadow: `0 0 4px var(--pw-victory-glow-30)`,
          }}
        />
        {!compact && (
          <span class="font-game" style={{ color: 'var(--pw-text-secondary)' }}>
            Fish:{' '}
          </span>
        )}
        <span
          class={`font-numbers font-bold ${flashClass(fishFlash)} ${lowClams.value ? 'animate-pulse' : ''}`}
          style={{ color: lowClams.value ? 'var(--pw-warning)' : 'var(--pw-clam)' }}
        >
          {clams}
        </span>
        {lowClams.value && (
          <span
            class="font-bold animate-pulse"
            style={{ color: 'var(--pw-warning)' }}
            title="Low fish!"
          >
            !
          </span>
        )}
        {!compact && fishRate !== 0 && (
          <span
            class="text-[10px] font-numbers"
            style={{ color: fishRate >= 0 ? 'var(--pw-success)' : 'var(--pw-enemy-light)' }}
          >
            {fishRate >= 0 ? `+${fishRate}` : fishRate}
          </span>
        )}
      </div>

      {/* Rocks (formerly Twigs) */}
      <div
        role="status"
        class="flex items-center space-x-1 md:space-x-2"
        aria-label={`Rocks: ${currentRocks}`}
      >
        <div
          class="w-3 h-3 md:w-4 md:h-4 shadow-sm"
          style={{
            background: 'linear-gradient(135deg, var(--pw-twig), #6b7280)',
            border: '1px solid var(--pw-otter)',
          }}
        />
        {!compact && (
          <span class="font-game" style={{ color: 'var(--pw-text-secondary)' }}>
            Rocks:{' '}
          </span>
        )}
        <span
          class={`font-numbers font-bold ${flashClass(rocksFlash)} ${lowTwigs.value ? 'animate-pulse' : ''}`}
          style={{ color: lowTwigs.value ? 'var(--pw-warning)' : 'var(--pw-twig)' }}
        >
          {twigs}
        </span>
        {lowTwigs.value && (
          <span
            class="font-bold animate-pulse"
            style={{ color: 'var(--pw-warning)' }}
            title="Low rocks!"
          >
            !
          </span>
        )}
        {!compact && rocksRate !== 0 && (
          <span
            class="text-[10px] font-numbers"
            style={{ color: rocksRate >= 0 ? 'var(--pw-success)' : 'var(--pw-enemy-light)' }}
          >
            {rocksRate >= 0 ? `+${rocksRate}` : rocksRate}
          </span>
        )}
      </div>

      {/* Pearls */}
      {currentPearls > 0 && (
        <div
          role="status"
          class="flex items-center space-x-1 md:space-x-2"
          aria-label={`Pearls: ${currentPearls}`}
        >
          <div
            class="w-3 h-3 md:w-4 md:h-4 rounded-full shadow-sm"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #e0e7ff, #a5b4fc)',
              border: '1px solid #a5b4fc',
              boxShadow: `0 0 4px var(--pw-pearl-glow-40)`,
            }}
          />
          {!compact && (
            <span class="font-game" style={{ color: 'var(--pw-text-secondary)' }}>
              Pearls:{' '}
            </span>
          )}
          <span
            class={`font-numbers font-bold ${flashClass(pearlsFlash)}`}
            style={{ color: 'var(--pw-pearl)' }}
          >
            {pearls}
          </span>
        </div>
      )}

      {/* Food */}
      <div
        role="status"
        class="flex items-center space-x-1 md:space-x-2"
        aria-label={`Food: ${currentFood} / ${currentMaxFood}`}
      >
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
          class={`font-numbers font-bold ${flashClass(foodFlash)}`}
          style={{ color: foodAtCap.value ? 'var(--pw-enemy)' : 'var(--pw-food)' }}
        >
          {foodDisplay}
        </span>
      </div>
    </div>
  );
}
