/**
 * Action Panel — Market Buttons
 *
 * Trade buttons shown when a completed Market building is selected.
 * Each trade has a 30-second cooldown (1800 frames at 60fps).
 */

import { audio } from '@/audio/audio-system';
import { Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { ActionButtonDef } from '@/ui/action-panel';

/** Cooldown per Market entity (eid -> last trade frame). */
const marketCooldowns = new Map<number, number>();

/** Cooldown duration in frames (30 seconds at 60fps). */
export const MARKET_COOLDOWN_FRAMES = 1800;

export interface MarketTrade {
  title: string;
  hotkey: string;
  sellResource: 'clams' | 'twigs' | 'pearls';
  sellAmount: number;
  buyResource: 'clams' | 'twigs' | 'pearls';
  buyAmount: number;
}

export const MARKET_TRADES: MarketTrade[] = [
  {
    title: 'Sell 100T → 60C',
    hotkey: 'Q',
    sellResource: 'twigs',
    sellAmount: 100,
    buyResource: 'clams',
    buyAmount: 60,
  },
  {
    title: 'Sell 100C → 60T',
    hotkey: 'W',
    sellResource: 'clams',
    sellAmount: 100,
    buyResource: 'twigs',
    buyAmount: 60,
  },
  {
    title: 'Sell 50P → 100C',
    hotkey: 'E',
    sellResource: 'pearls',
    sellAmount: 50,
    buyResource: 'clams',
    buyAmount: 100,
  },
];

/** Check whether a Market entity is on cooldown. */
export function isMarketOnCooldown(eid: number, frameCount: number): boolean {
  const lastTrade = marketCooldowns.get(eid);
  if (lastTrade === undefined) return false;
  return frameCount - lastTrade < MARKET_COOLDOWN_FRAMES;
}

/** Get remaining cooldown seconds for a Market entity. */
export function marketCooldownSeconds(eid: number, frameCount: number): number {
  const lastTrade = marketCooldowns.get(eid);
  if (lastTrade === undefined) return 0;
  const remaining = MARKET_COOLDOWN_FRAMES - (frameCount - lastTrade);
  return remaining > 0 ? Math.ceil(remaining / 60) : 0;
}

/** Execute a trade on a Market entity. Returns true if successful. */
export function executeTrade(w: GameWorld, marketEid: number, trade: MarketTrade): boolean {
  if (isMarketOnCooldown(marketEid, w.frameCount)) return false;
  if (w.resources[trade.sellResource] < trade.sellAmount) return false;

  w.resources[trade.sellResource] -= trade.sellAmount;
  w.resources[trade.buyResource] += trade.buyAmount;
  marketCooldowns.set(marketEid, w.frameCount);
  return true;
}

/** Reset all Market cooldowns (for game restart). */
export function resetMarketCooldowns(): void {
  marketCooldowns.clear();
}

export function buildMarketButtons(w: GameWorld, marketEid: number): ActionButtonDef[] {
  const onCooldown = isMarketOnCooldown(marketEid, w.frameCount);
  const cdSec = marketCooldownSeconds(marketEid, w.frameCount);
  const cdLabel = onCooldown ? ` (${cdSec}s)` : '';

  return MARKET_TRADES.map((trade) => {
    const canAfford = w.resources[trade.sellResource] >= trade.sellAmount;
    return {
      title: trade.title + cdLabel,
      cost: `${trade.sellAmount} ${trade.sellResource}`,
      hotkey: trade.hotkey,
      affordable: canAfford && !onCooldown,
      description: `Trade ${trade.sellAmount} ${trade.sellResource} for ${trade.buyAmount} ${trade.buyResource}. 30s cooldown.`,
      category: 'tech' as const,
      costBreakdown: { [trade.sellResource]: trade.sellAmount },
      onClick: () => {
        if (executeTrade(w, marketEid, trade)) {
          audio.trade(Position.x[marketEid]);
          const mx = Position.x[marketEid];
          const my = Position.y[marketEid];
          for (let i = 0; i < 6; i++) {
            w.particles.push({
              x: mx,
              y: my - 10,
              vx: (w.gameRng.next() - 0.5) * 3,
              vy: -w.gameRng.next() * 2 - 1,
              life: 40,
              color: '#ffd700',
              size: 3,
            });
          }
        }
      },
    };
  });
}
