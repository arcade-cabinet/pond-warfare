import * as storeV3 from '@/ui/store-v3';

export function getCurrentRunTrackTier(pathKey: string): number {
  const prefix = `${pathKey}_t`;
  let highestTier = 0;

  for (const nodeId of storeV3.currentRunPurchasedNodeIds.value) {
    if (!nodeId.startsWith(prefix)) continue;
    const match = /_t(\d+)$/.exec(nodeId);
    const tier = match ? Number.parseInt(match[1], 10) + 1 : 1;
    if (Number.isFinite(tier)) {
      highestTier = Math.max(highestTier, tier);
    }
  }

  return highestTier;
}

export function hasCurrentRunTrack(pathKey: string): boolean {
  return getCurrentRunTrackTier(pathKey) > 0;
}
