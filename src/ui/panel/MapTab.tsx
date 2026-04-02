/**
 * MapTab — Minimap + resource counts + game status.
 *
 * Displayed inside the command panel. Shows the minimap canvas at the top,
 * then resource readouts (clams, twigs, pearls, food), peace/hunting status,
 * wave countdown, and game time.
 */

import { cycleSpeed, toggleMute, togglePause } from '../game-actions';
import { MinimapLegend } from '../hud/MinimapLegend';
import {
  clams,
  foodAtCap,
  foodDisplay,
  gameTimeDisplay,
  isPeaceful,
  lowClams,
  lowTwigs,
  muteLabel,
  paused,
  peaceStatusText,
  pearls,
  rateClams,
  rateTwigs,
  speedLabel,
  twigs,
  waveCountdown,
} from '../store';

export interface MapTabProps {
  minimapCanvasRef: preact.RefObject<HTMLCanvasElement>;
  minimapCamRef: preact.RefObject<HTMLDivElement>;
}

export function MapTab({ minimapCanvasRef, minimapCamRef }: MapTabProps) {
  const clamsRate = rateClams.value;
  const twigsRate = rateTwigs.value;

  return (
    <div class="flex flex-col gap-2 p-2">
      {/* Minimap */}
      <div
        class="relative w-full rounded overflow-hidden"
        style={{
          aspectRatio: '1',
          border: '2px solid var(--pw-border)',
          background: 'var(--pw-bg-deep)',
        }}
      >
        <canvas
          ref={minimapCanvasRef}
          id="minimap"
          width={200}
          height={200}
          class="w-full h-full block render-pixelated cursor-crosshair"
        />
        <div
          ref={minimapCamRef}
          id="minimap-cam"
          class="absolute border border-white pointer-events-none hidden box-border"
          style={{ left: 0, top: 0 }}
        />
        <div class="absolute bottom-1 left-1">
          <MinimapLegend />
        </div>
      </div>

      {/* Resources */}
      <div class="grid grid-cols-2 gap-x-3 gap-y-1">
        {/* Clams */}
        <div class="flex items-center gap-1">
          <div
            class="w-3 h-3 rounded-full"
            style={{ background: 'radial-gradient(circle at 35% 35%, var(--pw-clam), #b8a030)' }}
          />
          <span
            class="font-numbers font-bold text-xs"
            style={{ color: lowClams.value ? 'var(--pw-warning)' : 'var(--pw-clam)' }}
          >
            {clams}
          </span>
          {clamsRate !== 0 && (
            <span
              class="font-numbers text-[9px]"
              style={{ color: clamsRate >= 0 ? 'var(--pw-success)' : 'var(--pw-enemy-light)' }}
            >
              {clamsRate >= 0 ? `+${clamsRate}` : clamsRate}
            </span>
          )}
        </div>
        {/* Twigs */}
        <div class="flex items-center gap-1">
          <div
            class="w-3 h-3"
            style={{ background: 'linear-gradient(135deg, var(--pw-twig), #8a4820)' }}
          />
          <span
            class="font-numbers font-bold text-xs"
            style={{ color: lowTwigs.value ? 'var(--pw-warning)' : 'var(--pw-twig)' }}
          >
            {twigs}
          </span>
          {twigsRate !== 0 && (
            <span
              class="font-numbers text-[9px]"
              style={{ color: twigsRate >= 0 ? 'var(--pw-success)' : 'var(--pw-enemy-light)' }}
            >
              {twigsRate >= 0 ? `+${twigsRate}` : twigsRate}
            </span>
          )}
        </div>
        {/* Pearls */}
        {pearls.value > 0 && (
          <div class="flex items-center gap-1">
            <div
              class="w-3 h-3 rounded-full"
              style={{ background: 'radial-gradient(circle at 35% 35%, #e0e7ff, #a5b4fc)' }}
            />
            <span class="font-numbers font-bold text-xs" style={{ color: 'var(--pw-pearl)' }}>
              {pearls}
            </span>
          </div>
        )}
        {/* Food */}
        <div class="flex items-center gap-1">
          <div
            class="w-3 h-3 rounded-sm"
            style={{ background: 'radial-gradient(circle at 35% 35%, var(--pw-food), #a03030)' }}
          />
          <span
            class="font-numbers font-bold text-xs"
            style={{ color: foodAtCap.value ? 'var(--pw-enemy)' : 'var(--pw-food)' }}
          >
            {foodDisplay}
          </span>
        </div>
      </div>

      {/* Status row */}
      <div class="flex items-center justify-between">
        <div>
          <span
            class="font-heading text-xs"
            style={{ color: isPeaceful.value ? 'var(--pw-success)' : 'var(--pw-enemy-light)' }}
          >
            {peaceStatusText}
          </span>
          {!isPeaceful.value && waveCountdown.value > 0 && (
            <span
              class="ml-1 font-numbers text-[10px]"
              style={{
                color: waveCountdown.value < 10 ? 'var(--pw-enemy-light)' : 'var(--pw-warning)',
              }}
            >
              {waveCountdown.value}s
            </span>
          )}
        </div>
        <span class="font-heading text-xs font-bold" style={{ color: 'var(--pw-accent)' }}>
          {gameTimeDisplay}
        </span>
      </div>

      {/* Quick controls */}
      <div class="flex gap-1">
        <button
          type="button"
          class="hud-btn flex-1 py-1 rounded font-bold text-xs min-h-[44px]"
          style={{
            background: paused.value
              ? 'linear-gradient(180deg, var(--pw-twig), #8a4820)'
              : undefined,
          }}
          onClick={togglePause}
        >
          {paused.value ? '\u25B6' : '\u23F8'}
        </button>
        <button
          type="button"
          class="hud-btn flex-1 py-1 rounded font-bold text-xs font-numbers min-h-[44px]"
          style={{ color: 'var(--pw-accent)' }}
          onClick={cycleSpeed}
        >
          {speedLabel}
        </button>
        <button
          type="button"
          class="hud-btn flex-1 py-1 rounded text-xs min-h-[44px]"
          onClick={toggleMute}
        >
          {muteLabel}
        </button>
      </div>
    </div>
  );
}
