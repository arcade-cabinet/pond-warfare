/**
 * TopBar Resources -- Fish, Rocks, Logs, and food display.
 * Directional flash: green/gold on increase, red on decrease.
 * Food flashes green/red on population change, orange at cap.
 *
 * Font sizes: 14px on desktop (md:), 12px on mobile for readability.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  fish,
  food,
  foodAtCap,
  foodDisplay,
  lastFoodChange,
  lastResourceChange,
  logs,
  lowFish,
  lowLogs,
  maxFood,
  rateFish,
  rateLogs,
  rocks,
} from '../store';
import { waveNumber } from '../store-gameplay';

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
  const fishRate = rateFish.value;
  const logsRate = rateLogs.value;

  const currentFish = fish.value;
  const currentRocks = rocks.value;
  const currentLogs = logs.value;
  const currentFood = food.value;
  const currentMaxFood = maxFood.value;
  const currentWave = waveNumber.value;

  const resChange = lastResourceChange.value;
  const foodChange = lastFoodChange.value;

  const fishFlash = useDirectionalFlash(currentFish, 5, resChange.fish);
  const rocksFlash = useDirectionalFlash(currentRocks, 5, resChange.rocks);
  const logsFlash = useDirectionalFlash(currentLogs, 5, resChange.logs);

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
      {/* Fish */}
      <div
        role="status"
        aria-live="polite"
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
          <span class="font-game text-xs md:text-sm" style={{ color: 'var(--pw-text-secondary)' }}>
            Fish:{' '}
          </span>
        )}
        <span
          class={`font-numbers font-bold text-xs md:text-sm ${flashClass(fishFlash)} ${lowFish.value ? 'animate-pulse' : ''}`}
          style={{ color: lowFish.value ? 'var(--pw-warning)' : 'var(--pw-clam)' }}
        >
          {fish}
        </span>
        {lowFish.value && (
          <span
            class="font-bold animate-pulse text-xs md:text-sm"
            style={{ color: 'var(--pw-warning)' }}
            title="Low fish!"
          >
            !
          </span>
        )}
        {!compact && fishRate !== 0 && (
          <span
            class="text-[10px] md:text-xs font-numbers"
            style={{ color: fishRate >= 0 ? 'var(--pw-success)' : 'var(--pw-enemy-light)' }}
          >
            {fishRate >= 0 ? `+${fishRate}` : fishRate}
          </span>
        )}
      </div>

      {/* Rocks */}
      <div
        role="status"
        aria-live="polite"
        class="flex items-center space-x-1 md:space-x-2"
        aria-label={`Rocks: ${currentRocks}`}
      >
        <div
          class="w-3 h-3 md:w-4 md:h-4 rounded shadow-sm"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #9ca3af, #6b7280)',
            border: '1px solid #6b7280',
            boxShadow: `0 0 3px rgba(107,114,128,0.4)`,
          }}
        />
        {!compact && (
          <span class="font-game text-xs md:text-sm" style={{ color: 'var(--pw-text-secondary)' }}>
            Rocks:{' '}
          </span>
        )}
        <span
          class={`font-numbers font-bold text-xs md:text-sm ${flashClass(rocksFlash)}`}
          style={{ color: '#9ca3af' }}
        >
          {rocks}
        </span>
      </div>

      {/* Logs */}
      <div
        role="status"
        aria-live="polite"
        class="flex items-center space-x-1 md:space-x-2"
        aria-label={`Logs: ${currentLogs}`}
      >
        <div
          class="w-3 h-3 md:w-4 md:h-4 rounded shadow-sm"
          style={{
            background: 'linear-gradient(135deg, var(--pw-twig), #8B5E3C)',
            border: '1px solid var(--pw-otter)',
          }}
        />
        {!compact && (
          <span class="font-game text-xs md:text-sm" style={{ color: 'var(--pw-text-secondary)' }}>
            Logs:{' '}
          </span>
        )}
        <span
          class={`font-numbers font-bold text-xs md:text-sm ${flashClass(logsFlash)} ${lowLogs.value ? 'animate-pulse' : ''}`}
          style={{ color: lowLogs.value ? 'var(--pw-warning)' : 'var(--pw-twig)' }}
        >
          {logs}
        </span>
        {lowLogs.value && (
          <span
            class="font-bold animate-pulse text-xs md:text-sm"
            style={{ color: 'var(--pw-warning)' }}
            title="Low logs!"
          >
            !
          </span>
        )}
        {!compact && logsRate !== 0 && (
          <span
            class="text-[10px] md:text-xs font-numbers"
            style={{ color: logsRate >= 0 ? 'var(--pw-success)' : 'var(--pw-enemy-light)' }}
          >
            {logsRate >= 0 ? `+${logsRate}` : logsRate}
          </span>
        )}
      </div>

      {/* Food */}
      <div
        role="status"
        aria-live="polite"
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
          <span class="font-game text-xs md:text-sm" style={{ color: 'var(--pw-text-secondary)' }}>
            Food:{' '}
          </span>
        )}
        <span
          class={`font-numbers font-bold text-xs md:text-sm ${flashClass(foodFlash)}`}
          style={{ color: foodAtCap.value ? 'var(--pw-enemy)' : 'var(--pw-food)' }}
        >
          {foodDisplay}
        </span>
      </div>

      {/* Wave Indicator (Gap 6) */}
      {currentWave > 0 && (
        <div
          role="status"
          class="flex items-center space-x-1 md:space-x-2"
          aria-label={`Wave ${currentWave}`}
        >
          <span class="font-game text-xs md:text-sm" style={{ color: 'var(--pw-enemy-light)' }}>
            Wave {currentWave}
          </span>
        </div>
      )}
    </div>
  );
}
