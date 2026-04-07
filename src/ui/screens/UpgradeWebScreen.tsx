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
  getDiamondsForCategory,
  getNodesForCategory,
  type UpgradeNode,
  type UpgradeWeb,
} from '@/config/upgrade-web';
import { Frame9Slice } from '@/ui/components/frame';
import { type AccordionSection, PondAccordion } from '@/ui/components/PondAccordion';
import {
  buildCurrentRunUpgradeState,
  snapshotCurrentRunUpgradeState,
  type CurrentRunUpgradeSnapshot,
} from '@/ui/current-run-upgrades';
import { COLORS } from '@/ui/design-tokens';
import {
  getDiamondDisplayInfo,
  getNodeDisplayState,
  purchaseDiamondNode,
  purchaseNode,
  type UpgradeWebPurchaseState,
} from '@/ui/upgrade-web-state';
import { ConfirmChoicesOverlay } from './ConfirmChoicesOverlay';
import { UpgradeWebCategoryContent } from './UpgradeWebCategoryContent';
import { findCheapestAvailableNodeId } from './UpgradeNodeRow';

export interface UpgradeWebScreenProps {
  clams: number;
  onClamsChange?: (newClams: number) => void;
  purchasedNodeIds?: string[];
  purchasedDiamondIds?: string[];
  startingTierRank?: number;
  onUpgradeStateChange?: (snapshot: CurrentRunUpgradeSnapshot, newClams: number) => void;
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

export function UpgradeWebScreen({
  clams,
  onClamsChange,
  purchasedNodeIds = [],
  purchasedDiamondIds = [],
  startingTierRank = 0,
  onUpgradeStateChange,
  onBack,
}: UpgradeWebScreenProps) {
  const web = useMemo<UpgradeWeb>(() => generateUpgradeWeb(), []);
  const categories = useMemo(() => getUpgradeCategories(), []);
  const categoryKeys = useMemo(() => Object.keys(categories), [categories]);
  const initialState = useMemo(
    () =>
      buildCurrentRunUpgradeState({
        clams,
        purchasedNodeIds,
        purchasedDiamondIds,
        startingTierRank,
      }),
    [clams, purchasedNodeIds, purchasedDiamondIds, startingTierRank],
  );
  const [purchaseState, setPurchaseState] = useState<UpgradeWebPurchaseState>(() => initialState.state);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const categoryData = useMemo(() => {
    return categoryKeys.map((catKey) => {
      const nodes = getNodesForCategory(web, catKey);
      const diamonds = getDiamondsForCategory(web, catKey).filter(
        (diamond) => diamond.effect.type !== 'lodge_wing',
      );
      const diamondInfos = diamonds.map((diamond) => getDiamondDisplayInfo(purchaseState, diamond));
      const nextNode = findNextNodeForCategory(nodes, purchaseState);
      const availableDiamond = diamondInfos.find((diamond) => diamond.state === 'available') ?? null;
      const complete =
        isCategoryComplete(nodes, purchaseState) &&
        diamonds.every((diamond) => purchaseState.purchasedDiamonds.has(diamond.id));
      return {
        catKey,
        label: categories[catKey].label,
        nextNode,
        complete,
        diamondInfos,
        availableDiamond,
      };
    });
  }, [categoryKeys, categories, web, purchaseState]);

  const accordionSections: AccordionSection[] = useMemo(() => {
    return categoryData.map((cat) => {
      let summary: string;
      if (cat.complete) {
        summary = 'Complete';
      } else if (cat.nextNode) {
        summary = `${cat.nextNode.name} -- ${cat.nextNode.cost}C`;
      } else if (cat.availableDiamond) {
        summary = `${cat.availableDiamond.label} -- ${cat.availableDiamond.cost}C`;
      } else if (cat.diamondInfos.length > 0) {
        summary = 'Milestones';
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
        onClamsChange?.(result.newClams);
        onUpgradeStateChange?.(
          snapshotCurrentRunUpgradeState(purchaseState, initialState.prestigeFilledNodes),
          result.newClams,
        );
      }
    },
    [initialState.prestigeFilledNodes, onClamsChange, onUpgradeStateChange, purchaseState, web],
  );

  const handlePurchaseDiamond = useCallback(
    (diamondId: string) => {
      const diamond = web.diamondMap.get(diamondId);
      const result = purchaseDiamondNode(purchaseState, web, diamondId);
      if (result.success && result.newClams !== undefined) {
        setPurchases((prev) => [...prev, diamond?.label ?? diamondId]);
        setPurchaseState({ ...purchaseState });
        onClamsChange?.(result.newClams);
        onUpgradeStateChange?.(
          snapshotCurrentRunUpgradeState(purchaseState, initialState.prestigeFilledNodes),
          result.newClams,
        );
      }
    },
    [initialState.prestigeFilledNodes, onClamsChange, onUpgradeStateChange, purchaseState, web],
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
                <UpgradeWebCategoryContent
                  key={cat.catKey}
                  nextNode={cat.nextNode}
                  complete={cat.complete}
                  diamondInfos={cat.diamondInfos}
                  clams={purchaseState.clams}
                  onPurchaseNode={handlePurchaseNode}
                  onPurchaseDiamond={handlePurchaseDiamond}
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
