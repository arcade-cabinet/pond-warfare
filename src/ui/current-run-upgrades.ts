import { generateUpgradeWeb } from '@/config/upgrade-web';
import {
  autoFillToStartingTier,
  createUpgradeWebState,
  type UpgradeWebPurchaseState,
} from '@/ui/upgrade-web-state';

export interface CurrentRunUpgradeSnapshot {
  nodes: string[];
  diamonds: string[];
}

export interface CurrentRunUpgradeStateBundle {
  state: UpgradeWebPurchaseState;
  prestigeFilledNodes: Set<string>;
}

export function createEmptyCurrentRunUpgradeSnapshot(): CurrentRunUpgradeSnapshot {
  return { nodes: [], diamonds: [] };
}

export function parseCurrentRunUpgradeSnapshot(raw: string | null | undefined): CurrentRunUpgradeSnapshot {
  if (!raw) return createEmptyCurrentRunUpgradeSnapshot();

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { nodes: filterIds(parsed), diamonds: [] };
    }
    if (parsed && typeof parsed === 'object') {
      return {
        nodes: filterIds((parsed as { nodes?: unknown }).nodes),
        diamonds: filterIds((parsed as { diamonds?: unknown }).diamonds),
      };
    }
  } catch {
    // Invalid persisted payloads fall back to an empty run.
  }

  return createEmptyCurrentRunUpgradeSnapshot();
}

export function serializeCurrentRunUpgradeSnapshot(snapshot: CurrentRunUpgradeSnapshot): string {
  return JSON.stringify({
    nodes: uniqueIds(snapshot.nodes),
    diamonds: uniqueIds(snapshot.diamonds),
  });
}

export function snapshotCurrentRunUpgradeState(
  state: UpgradeWebPurchaseState,
  prestigeFilledNodes: ReadonlySet<string>,
): CurrentRunUpgradeSnapshot {
  const nodes = Array.from(state.purchasedNodes).filter((id) => !prestigeFilledNodes.has(id));
  return {
    nodes: uniqueIds(nodes),
    diamonds: uniqueIds(Array.from(state.purchasedDiamonds)),
  };
}

export function buildCurrentRunUpgradeState(options: {
  clams: number;
  purchasedNodeIds: string[];
  purchasedDiamondIds: string[];
  startingTierRank: number;
}): CurrentRunUpgradeStateBundle {
  const web = generateUpgradeWeb();
  const state = createUpgradeWebState(options.clams);
  const prestigeFilledNodes = autoFillToStartingTier(state, web, options.startingTierRank);

  for (const nodeId of uniqueIds(options.purchasedNodeIds)) {
    const node = web.nodeMap.get(nodeId);
    if (!node) continue;
    state.purchasedNodes.add(nodeId);
    const pathKey = `${node.category}_${node.subcategory}`;
    const tierLevel = node.tier + 1;
    const current = state.highestTiers.get(pathKey) ?? 0;
    if (tierLevel > current) state.highestTiers.set(pathKey, tierLevel);
  }

  for (const diamondId of uniqueIds(options.purchasedDiamondIds)) {
    if (web.diamondMap.has(diamondId)) {
      state.purchasedDiamonds.add(diamondId);
    }
  }

  return { state, prestigeFilledNodes };
}

function filterIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueIds(value.filter((entry): entry is string => typeof entry === 'string'));
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}
