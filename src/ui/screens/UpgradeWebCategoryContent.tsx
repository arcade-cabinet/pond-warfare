import type { UpgradeNode } from '@/config/upgrade-web';
import { COLORS } from '@/ui/design-tokens';
import type { DiamondDisplayInfo } from '@/ui/upgrade-web-state';

export interface UpgradeWebCategoryContentProps {
  nextNode: UpgradeNode | null;
  complete: boolean;
  diamondInfos: DiamondDisplayInfo[];
  clams: number;
  onPurchaseNode: (id: string) => void;
  onPurchaseDiamond: (id: string) => void;
}

export function UpgradeWebCategoryContent({
  nextNode,
  complete,
  diamondInfos,
  clams,
  onPurchaseNode,
  onPurchaseDiamond,
}: UpgradeWebCategoryContentProps) {
  const hasMilestones = diamondInfos.length > 0;

  return (
    <div class="py-2 px-1 flex flex-col gap-3">
      {nextNode ? (
        <LinearUpgradeCard nextNode={nextNode} clams={clams} onPurchase={onPurchaseNode} />
      ) : (
        <div class="py-1 text-center">
          <span class="font-heading text-sm" style={{ color: complete ? COLORS.mossGreen : COLORS.sepiaText }}>
            {complete ? 'Linear upgrades complete' : 'No linear upgrades available yet'}
          </span>
        </div>
      )}

      {hasMilestones && (
        <div class="flex flex-col gap-2">
          <div class="font-heading text-xs uppercase" style={{ color: COLORS.grittyGold }}>
            Milestones
          </div>
          {diamondInfos.map((diamond) => (
            <DiamondUpgradeRow
              key={diamond.id}
              diamond={diamond}
              clams={clams}
              onPurchase={onPurchaseDiamond}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LinearUpgradeCard({
  nextNode,
  clams,
  onPurchase,
}: {
  nextNode: UpgradeNode;
  clams: number;
  onPurchase: (id: string) => void;
}) {
  const canAfford = clams >= nextNode.cost;

  return (
    <div class="flex flex-col gap-2">
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

function DiamondUpgradeRow({
  diamond,
  clams,
  onPurchase,
}: {
  diamond: DiamondDisplayInfo;
  clams: number;
  onPurchase: (id: string) => void;
}) {
  const purchased = diamond.state === 'purchased';
  const available = diamond.state === 'available';
  const canAfford = clams >= diamond.cost;
  const canBuy = available && canAfford;
  const prereqText = diamond.prerequisites
    .map((prereq) => `${prereq.path} ${prereq.currentTier}/${prereq.requiredTier}`)
    .join(' • ');

  return (
    <div
      class="rounded px-2 py-2 flex flex-col gap-2"
      style={{
        border: `1px solid ${available ? COLORS.grittyGold : COLORS.weatheredSteel}`,
        background: available ? 'rgba(197,160,89,0.08)' : 'rgba(20,20,20,0.35)',
      }}
    >
      <div>
        <div class="font-heading text-sm" style={{ color: purchased ? COLORS.mossGreen : COLORS.sepiaText }}>
          {diamond.label}
        </div>
        <div class="font-game text-xs mt-1" style={{ color: COLORS.weatheredSteel }}>
          {diamond.effectDescription}
        </div>
        {!purchased && (
          <div class="font-game text-[11px] mt-1" style={{ color: COLORS.weatheredSteel }}>
            {diamond.prerequisitesMet ? 'Prerequisites met' : prereqText}
          </div>
        )}
      </div>
      <button
        type="button"
        class="rts-btn w-full py-2 font-heading text-sm"
        style={{
          color: purchased ? COLORS.mossGreen : canBuy ? COLORS.grittyGold : COLORS.weatheredSteel,
          borderColor: purchased ? COLORS.mossGreen : canBuy ? COLORS.grittyGold : COLORS.weatheredSteel,
          opacity: purchased || canBuy ? 1 : 0.6,
          cursor: canBuy ? 'pointer' : 'not-allowed',
          minHeight: '44px',
        }}
        onClick={() => canBuy && onPurchase(diamond.id)}
        disabled={!canBuy}
        aria-label={
          canBuy
            ? `Buy ${diamond.label} for ${diamond.cost} Clams`
            : purchased
              ? `${diamond.label} purchased`
              : `${diamond.label} locked`
        }
      >
        {purchased ? 'Purchased' : canBuy ? `Unlock -- ${diamond.cost}C` : `${diamond.cost}C (locked)`}
      </button>
    </div>
  );
}
