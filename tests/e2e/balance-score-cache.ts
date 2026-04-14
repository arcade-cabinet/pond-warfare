import {
  type BalanceSnapshot,
  getMetaProgressionScore,
  getPowerScore,
  getRewardScore,
} from '@/balance/progression-model';

export interface SnapshotScores {
  power: number;
  reward: number;
  meta: number;
}

export function createSnapshotScoreCache<TVariant>(
  runVariant: (seed: number, variant: TVariant) => BalanceSnapshot,
): (seed: number, variant: TVariant) => SnapshotScores {
  const cache = new Map<string, SnapshotScores>();

  return (seed: number, variant: TVariant) => {
    const key = `${seed}:${JSON.stringify(variant ?? null)}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const snapshot = runVariant(seed, variant);
    const scores = {
      power: getPowerScore(snapshot),
      reward: getRewardScore(snapshot),
      meta: getMetaProgressionScore(snapshot),
    };
    cache.set(key, scores);
    return scores;
  };
}
