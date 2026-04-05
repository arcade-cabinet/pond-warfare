/**
 * Clam Upgrade Modal (v3.2 -- US12)
 *
 * Compact center modal for spending Clams on the upgrade web.
 * Uses PondAccordion with 6 sections (one per upgrade category).
 * Each section shows the NEXT available node for that category.
 * Collapsed: category name + next node name + cost.
 * Expanded: description + stat bonus + BUY button.
 * Close triggers a confirmation overlay summarising session purchases.
 */

import { useCallback, useMemo, useState } from 'preact/hooks';
import { getUpgradeCategories } from '@/config/config-loader';
import {
  generateUpgradeWeb,
  getNodesForCategory,
  type UpgradeNode,
  type UpgradeWeb,
} from '@/config/upgrade-web';
import { Frame9Slice } from '@/ui/components/frame';
import { type AccordionSection, PondAccordion } from '@/ui/components/PondAccordion';
import { COLORS } from '@/ui/design-tokens';
import {
  createUpgradeWebState,
  getNodeDisplayState,
  purchaseNode,
  type UpgradeWebPurchaseState,
} from '@/ui/upgrade-web-state';
import { ConfirmChoicesOverlay } from './ConfirmChoicesOverlay';
import { findCheapestAvailableNodeId } from './UpgradeNodeRow';

export interface UpgradeWebScreenProps {
  clams: number;
  onClamsChange: (newClams: number) => void;
  onBack: () => void;
}

/** Find the next available (prerequisites met) node in a category. */
function findNextNodeForCategory(
  nodes: UpgradeNode[],
  state: UpgradeWebPurchaseState,
): UpgradeNode | null {
  // Get cheapest available node ID using existing utility
  const cheapestId = findCheapestAvailableNodeId(nodes, state);
  if (cheapestId) return nodes.find((n) => n.id === cheapestId) ?? null;
  // If none affordable, find first available regardless of cost
  for (const node of nodes) {
    if (getNodeDisplayState(state, node) === 'available') return node;
  }
  return null;
}

/** Check if all nodes in a category are purchased. */
function isCategoryComplete(nodes: UpgradeNode[], state: UpgradeWebPurchaseState): boolean {
  return nodes.every((n) => state.purchasedNodes.has(n.id));
}

export function UpgradeWebScreen({ clams, onClamsChange, onBack }: UpgradeWebScreenProps) {
  const web = useMemo<UpgradeWeb>(() => generateUpgradeWeb(), []);
  const categories = useMemo(() => getUpgradeCategories(), []);
  const categoryKeys = useMemo(() => Object.keys(categories), [categories]);
  const [purchaseState, setPurchaseState] = useState<UpgradeWebPurchaseState>(() =>
    createUpgradeWebState(clams),
  );
  const [purchases, setPurchases] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const categoryData = useMemo(() => {
    return categoryKeys.map((catKey) => {
      const nodes = getNodesForCategory(web, catKey);
      const nextNode = findNextNodeForCategory(nodes, purchaseState);
      const complete = isCategoryComplete(nodes, purchaseState);
      return { catKey, label: categories[catKey].label, nodes, nextNode, complete };
    });
  }, [categoryKeys, categories, web, purchaseState]);

  const accordionSections: AccordionSection[] = useMemo(() => {
    return categoryData.map((cat) => {
      let summary: string;
      if (cat.complete) {
        summary = 'Complete';
      } else if (cat.nextNode) {
        summary = `${cat.nextNode.name} -- ${cat.nextNode.cost}C`;
      } else {
        summary = 'Locked';
      }
      return { key: cat.catKey, title: cat.label, summary };
    });
  }, [categoryData]);

  const handlePurchaseNode = useCallback(
    (nodeId: string) => {
      const node = web.nodeMap.get(nodeId);
      const result = purchaseNode(purchaseState, web, nodeId);
      if (result.success && result.newClams !== undefined) {
        setPurchases((prev) => [...prev, node?.name ?? nodeId]);
        setPurchaseState({ ...purchaseState });
        onClamsChange(result.newClams);
      }
    },
    [purchaseState, web, onClamsChange],
  );

  const handleClose = useCallback(() => {
    if (purchases.length === 0) {
      onBack();
    } else {
      setShowConfirm(true);
    }
  }, [purchases, onBack]);

  const handleConfirm = useCallback(() => {
    setShowConfirm(false);
    onBack();
  }, [onBack]);

  const handleGoBack = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return (
    <div
      class="absolute inset-0 flex items-center justify-center z-40"
      style={{
        background: 'rgba(0,0,0,0.75)',
      }}
    >
      <div class="w-full flex flex-col" style={{ maxWidth: '480px', maxHeight: '85dvh' }}>
        <Frame9Slice title="Spend Clams">
          <div
            class="px-3 py-2 flex flex-col gap-2"
            style={{ maxHeight: '75dvh', overflow: 'auto' }}
          >
            {/* Balance header */}
            <div class="flex items-center justify-between">
              <span class="font-heading text-sm uppercase" style={{ color: COLORS.grittyGold }}>
                Clam Balance
              </span>
              <span
                class="font-numbers text-lg font-bold px-2 py-0.5 rounded"
                style={{ color: 'var(--pw-clam)', background: 'rgba(197,160,89,0.1)' }}
              >
                {purchaseState.clams}C
              </span>
            </div>

            {/* Category accordion */}
            <PondAccordion sections={accordionSections} allowMultiple={false}>
              {categoryData.map((cat) => (
                <CategoryContent
                  key={cat.catKey}
                  nextNode={cat.nextNode}
                  complete={cat.complete}
                  clams={purchaseState.clams}
                  onPurchase={handlePurchaseNode}
                />
              ))}
            </PondAccordion>

            {/* Close button */}
            <button
              type="button"
              class="rts-btn w-full py-2 font-heading text-sm uppercase"
              style={{ minHeight: '44px', color: COLORS.weatheredSteel }}
              onClick={handleClose}
            >
              Done
            </button>
          </div>
        </Frame9Slice>
      </div>

      {/* Confirmation overlay */}
      {showConfirm && (
        <ConfirmChoicesOverlay
          purchases={purchases}
          onConfirm={handleConfirm}
          onGoBack={handleGoBack}
        />
      )}
    </div>
  );
}

/** Expanded content for a single category accordion section. */
function CategoryContent({
  nextNode,
  complete,
  clams,
  onPurchase,
}: {
  nextNode: UpgradeNode | null;
  complete: boolean;
  clams: number;
  onPurchase: (id: string) => void;
}) {
  if (complete) {
    return (
      <div class="py-3 text-center">
        <span class="font-heading text-sm" style={{ color: COLORS.mossGreen }}>
          All upgrades purchased
        </span>
      </div>
    );
  }

  if (!nextNode) {
    return (
      <div class="py-3 text-center">
        <span class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
          No upgrades available yet
        </span>
      </div>
    );
  }

  const canAfford = clams >= nextNode.cost;

  return (
    <div class="py-2 px-1 flex flex-col gap-2">
      <div>
        <span class="font-heading text-sm" style={{ color: COLORS.sepiaText }}>
          {nextNode.name}
        </span>
        <div class="font-game text-xs mt-1" style={{ color: COLORS.weatheredSteel }}>
          +{Math.round(nextNode.effect * 100)}% bonus (Tier {nextNode.tier + 1})
        </div>
      </div>
      <button
        type="button"
        class="rts-btn w-full py-2 font-heading text-sm"
        style={{
          color: canAfford ? COLORS.grittyGold : '#c44',
          borderColor: canAfford ? COLORS.grittyGold : COLORS.weatheredSteel,
          opacity: canAfford ? 1 : 0.6,
          cursor: canAfford ? 'pointer' : 'not-allowed',
          minHeight: '44px',
        }}
        onClick={() => canAfford && onPurchase(nextNode.id)}
        disabled={!canAfford}
        aria-label={`Buy ${nextNode.name} for ${nextNode.cost} Clams`}
      >
        {canAfford ? `Buy -- ${nextNode.cost}C` : `${nextNode.cost}C (not enough)`}
      </button>
    </div>
  );
}
