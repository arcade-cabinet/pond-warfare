/**
 * UpgradeNodeRow -- Single node row in the upgrade web subcategory path.
 *
 * Shows node name, effect, tier, and a purchase button (if not yet owned).
 * Design bible: rts-btn, font-heading, design token colors.
 */

import type { UpgradeNode } from '@/config/upgrade-web';
import { COLORS } from '@/ui/design-tokens';
import {
  getNodeDisplayState,
  type NodeDisplayState,
  type UpgradeWebPurchaseState,
} from '@/ui/upgrade-web-state';

export interface UpgradeNodeRowProps {
  node: { id: string; name: string; cost: number; effect: number; tier: number };
  state: NodeDisplayState;
  onPurchase: (id: string) => void;
  /** Whether this is the cheapest affordable node in the active category. */
  isCheapest?: boolean;
}

/** Find the cheapest available (can afford) node ID among a list of nodes. */
export function findCheapestAvailableNodeId(
  nodes: UpgradeNode[],
  state: UpgradeWebPurchaseState,
): string | null {
  let cheapest: { id: string; cost: number } | null = null;
  for (const node of nodes) {
    if (getNodeDisplayState(state, node) !== 'available') continue;
    if (node.cost > state.clams) continue;
    if (!cheapest || node.cost < cheapest.cost) {
      cheapest = { id: node.id, cost: node.cost };
    }
  }
  return cheapest?.id ?? null;
}

/** Color per node display state. */
export function stateColor(state: NodeDisplayState): string {
  if (state === 'purchased') return COLORS.mossGreen;
  if (state === 'available') return COLORS.grittyGold;
  return COLORS.weatheredSteel;
}

export function UpgradeNodeRow({
  node,
  state: displayState,
  onPurchase,
  isCheapest,
}: UpgradeNodeRowProps) {
  const isPurchased = displayState === 'purchased';
  const isAvailable = displayState === 'available';

  return (
    <div
      class={`flex items-center gap-2 py-1.5 px-2 rounded${isCheapest ? ' upgrade-node-affordable-pulse' : ''}`}
      style={{
        background: isPurchased
          ? 'rgba(90,107,58,0.08)'
          : isAvailable
            ? 'rgba(197,160,89,0.06)'
            : 'transparent',
        opacity: displayState === 'locked' ? 0.4 : 1,
      }}
    >
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="font-heading text-xs truncate" style={{ color: stateColor(displayState) }}>
            {node.name}
          </span>
          {isPurchased && (
            <span class="font-game text-[9px]" style={{ color: COLORS.mossGreen }}>
              OWNED
            </span>
          )}
        </div>
        <span class="font-game text-[10px]" style={{ color: COLORS.weatheredSteel }}>
          +{Math.round(node.effect * 100)}% (Tier {node.tier + 1})
        </span>
      </div>
      {!isPurchased && (
        <button
          type="button"
          class="rts-btn px-2 py-1 font-heading text-[10px] shrink-0"
          style={{
            color: isAvailable ? COLORS.grittyGold : COLORS.weatheredSteel,
            borderColor: isAvailable ? COLORS.grittyGold : COLORS.weatheredSteel,
            opacity: isAvailable ? 1 : 0.4,
            cursor: isAvailable ? 'pointer' : 'not-allowed',
            minWidth: '50px',
            minHeight: '36px',
          }}
          onClick={() => onPurchase(node.id)}
          disabled={!isAvailable}
          aria-label={`Buy ${node.name} for ${node.cost} Clams`}
        >
          {node.cost}C
        </button>
      )}
    </div>
  );
}
