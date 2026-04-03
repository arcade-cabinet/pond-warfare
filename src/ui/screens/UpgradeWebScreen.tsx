/**
 * Upgrade Web Screen (v3.0 -- US12)
 *
 * Full-screen overlay accessible from main menu for spending Clams
 * on the procedural upgrade web (240+ nodes across 6 categories).
 *
 * Categories: Gathering, Combat, Defense, Utility, Economy, Siege.
 * Each category has ~4 subcategory paths with 10 tiers each.
 * Diamond nodes at bottom connect multiple paths for special unlocks.
 *
 * Design bible: Frame9Slice wrapper, font-heading headers,
 * rts-btn buttons, design token colors.
 */

import { useCallback, useMemo, useState } from 'preact/hooks';
import { getUpgradeCategories } from '@/config/config-loader';
import {
  type DiamondNode,
  generateUpgradeWeb,
  getDiamondsForCategory,
  getNodesForPath,
  type UpgradeWeb,
} from '@/config/upgrade-web';
import { Frame9Slice } from '@/ui/components/frame';
import { COLORS } from '@/ui/design-tokens';
import {
  createUpgradeWebState,
  getDiamondDisplayInfo,
  getNodeDisplayState,
  purchaseDiamondNode,
  purchaseNode,
  type UpgradeWebPurchaseState,
} from '@/ui/upgrade-web-state';
import { stateColor, UpgradeNodeRow } from './UpgradeNodeRow';

export interface UpgradeWebScreenProps {
  clams: number;
  onClamsChange: (newClams: number) => void;
  onBack: () => void;
}

export function UpgradeWebScreen({ clams, onClamsChange, onBack }: UpgradeWebScreenProps) {
  const web = useMemo<UpgradeWeb>(() => generateUpgradeWeb(), []);
  const categories = useMemo(() => getUpgradeCategories(), []);
  const categoryKeys = useMemo(() => Object.keys(categories), [categories]);
  const [activeCat, setActiveCat] = useState(categoryKeys[0] ?? 'gathering');
  const [purchaseState, setPurchaseState] = useState<UpgradeWebPurchaseState>(() =>
    createUpgradeWebState(clams),
  );

  const subcategories = useMemo(() => {
    const cat = categories[activeCat];
    return cat ? Object.entries(cat.subcategories) : [];
  }, [categories, activeCat]);

  const diamonds = useMemo<DiamondNode[]>(
    () => getDiamondsForCategory(web, activeCat),
    [web, activeCat],
  );

  const handlePurchaseNode = useCallback(
    (nodeId: string) => {
      const result = purchaseNode(purchaseState, web, nodeId);
      if (result.success && result.newClams !== undefined) {
        setPurchaseState({ ...purchaseState });
        onClamsChange(result.newClams);
      }
    },
    [purchaseState, web, onClamsChange],
  );

  const handlePurchaseDiamond = useCallback(
    (diamondId: string) => {
      const result = purchaseDiamondNode(purchaseState, web, diamondId);
      if (result.success && result.newClams !== undefined) {
        setPurchaseState({ ...purchaseState });
        onClamsChange(result.newClams);
      }
    },
    [purchaseState, web, onClamsChange],
  );

  return (
    <div
      class="absolute inset-0 flex flex-col z-40 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, rgba(197,160,89,0.05), rgba(0,0,0,0.95) 70%)',
      }}
    >
      {/* Header */}
      <div class="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          type="button"
          class="rts-btn px-3 py-2 font-heading text-sm"
          style={{
            color: COLORS.weatheredSteel,
            borderColor: COLORS.weatheredSteel,
            minHeight: '44px',
            fontSize: '0.85rem',
          }}
          onClick={onBack}
        >
          Back
        </button>
        <h1
          class="font-heading text-xl tracking-wider uppercase"
          style={{ color: COLORS.grittyGold }}
        >
          Upgrades
        </h1>
        <div
          class="font-numbers text-lg font-bold px-3 py-1 rounded"
          style={{ color: 'var(--pw-clam)', background: 'rgba(197,160,89,0.1)' }}
        >
          {purchaseState.clams}C
        </div>
      </div>

      {/* Category tabs */}
      <div class="flex gap-1 px-4 pb-2 shrink-0 overflow-x-auto">
        {categoryKeys.map((key) => {
          const isActive = activeCat === key;
          return (
            <button
              key={key}
              type="button"
              class={`rts-btn flex-1 py-2 font-heading text-xs whitespace-nowrap ${isActive ? 'active' : ''}`}
              style={{ minHeight: '40px', fontSize: '0.7rem', minWidth: '70px' }}
              onClick={() => setActiveCat(key)}
            >
              {categories[key].label}
            </button>
          );
        })}
      </div>

      {/* Subcategory paths + diamond nodes */}
      <div class="flex-1 overflow-y-auto px-4 pb-4">
        <Frame9Slice title={categories[activeCat]?.label ?? 'Upgrades'}>
          <div class="px-2 py-2 flex flex-col gap-3">
            {subcategories.map(([subKey, subDef]) => {
              const nodes = getNodesForPath(web, activeCat, subKey);
              return (
                <div key={subKey}>
                  <h3
                    class="font-heading text-xs uppercase tracking-wider mb-1 px-1"
                    style={{ color: COLORS.grittyGold }}
                  >
                    {subDef.label}
                  </h3>
                  {nodes.map((node) => (
                    <UpgradeNodeRow
                      key={node.id}
                      node={node}
                      state={getNodeDisplayState(purchaseState, node)}
                      onPurchase={handlePurchaseNode}
                    />
                  ))}
                </div>
              );
            })}

            {/* Diamond nodes */}
            {diamonds.length > 0 && (
              <div class="mt-2 pt-2" style={{ borderTop: '1px solid rgba(197,160,89,0.2)' }}>
                <h3
                  class="font-heading text-xs uppercase tracking-wider mb-1 px-1"
                  style={{ color: 'var(--pw-pearl, #c4b5fd)' }}
                >
                  Diamond Nodes
                </h3>
                {diamonds.map((d) => {
                  const info = getDiamondDisplayInfo(purchaseState, d);
                  return (
                    <div
                      key={d.id}
                      class="flex items-center gap-2 py-1.5 px-2 rounded"
                      style={{
                        background:
                          info.state === 'purchased' ? 'rgba(90,107,58,0.08)' : 'transparent',
                        opacity: info.state === 'locked' ? 0.4 : 1,
                      }}
                    >
                      <div class="flex-1 min-w-0">
                        <span
                          class="font-heading text-xs"
                          style={{ color: stateColor(info.state) }}
                        >
                          {info.label}
                        </span>
                        <div class="font-game text-[10px]" style={{ color: COLORS.weatheredSteel }}>
                          {info.effectDescription}
                        </div>
                      </div>
                      {info.state !== 'purchased' && (
                        <button
                          type="button"
                          class="rts-btn px-2 py-1 font-heading text-[10px] shrink-0"
                          style={{
                            color:
                              info.state === 'available'
                                ? COLORS.grittyGold
                                : COLORS.weatheredSteel,
                            minWidth: '50px',
                            minHeight: '36px',
                          }}
                          onClick={() => handlePurchaseDiamond(d.id)}
                          disabled={info.state !== 'available'}
                        >
                          {d.cost}C
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
