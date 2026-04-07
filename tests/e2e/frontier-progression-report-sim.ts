import {
  getDifficultyShiftPercent,
  getMetaProgressionScore,
  getPowerScore,
  getRewardScore,
  summarizeShiftPercents,
} from '@/balance/progression-model';
import { type DiamondNode, generateUpgradeWeb } from '@/config/upgrade-web';
import { getCurrentRunPanelStage } from '@/ui/current-run-diamond-effects';
import {
  createUpgradeWebState,
  purchaseDiamondNode,
  purchaseNode,
  type UpgradeWebPurchaseState,
} from '@/ui/upgrade-web-state';
import { type MatchRunResult, runFrontierMatch } from './frontier-progression-runtime';

export const FRONTIER_REPORT_SEEDS = [11, 42, 77];
export const FRONTIER_WARMUP_FRAMES = 1800;
export const FRONTIER_EVAL_FRAMES = 1800;
const MAX_FRONTIER_MATCHES = 200;

interface FrontierSeedResult {
  activePanels: number;
  cumulativeCost: number;
  matchesStep: number;
  matchesTotal: number;
  power: number;
  reward: number;
  stage: number;
  state: string;
  stepCost: number;
  meta: number;
}

export interface FrontierProgressionRow {
  id: string;
  label: string;
  from_stage: number;
  to_stage: number;
  step_cost: number;
  cumulative_cost: number;
  matches_step_mean: number;
  matches_total_mean: number;
  power_mean_pct: number;
  economy_mean_pct: number;
  meta_mean_pct: number;
  survival_rate_pct: number;
}

function buildFrontierPlan(web: ReturnType<typeof generateUpgradeWeb>, diamond: DiamondNode): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const nodeId of diamond.prerequisiteNodeIds) {
    addNodeChain(web, nodeId, seen, ordered);
  }
  return ordered;
}

function addNodeChain(
  web: ReturnType<typeof generateUpgradeWeb>,
  nodeId: string,
  seen: Set<string>,
  ordered: string[],
): void {
  if (seen.has(nodeId)) return;
  const node = web.nodeMap.get(nodeId);
  if (!node) return;
  if (node.prerequisite) {
    addNodeChain(web, node.prerequisite, seen, ordered);
  }
  seen.add(nodeId);
  ordered.push(nodeId);
}

function buyAffordableFrontierStep(
  web: ReturnType<typeof generateUpgradeWeb>,
  state: UpgradeWebPurchaseState,
  nodePlan: string[],
  diamondId: string,
): number {
  const nextNodeId = nodePlan.find((nodeId) => !state.purchasedNodes.has(nodeId));
  if (nextNodeId) {
    const result = purchaseNode(state, web, nextNodeId);
    return result.success ? web.nodeMap.get(nextNodeId)?.cost ?? 0 : 0;
  }
  if (!state.purchasedDiamonds.has(diamondId)) {
    const result = purchaseDiamondNode(state, web, diamondId);
    return result.success ? web.diamondMap.get(diamondId)?.cost ?? 0 : 0;
  }
  return 0;
}

function runFrontierProgression(seed: number): Map<string, FrontierSeedResult> {
  const web = generateUpgradeWeb();
  const diamonds = web.diamondNodes
    .filter(
      (diamond): diamond is DiamondNode & { effect: { type: 'unlock_panel_stage'; stage: number } } =>
        diamond.effect.type === 'unlock_panel_stage' && Number.isFinite(diamond.effect.stage),
    )
    .sort((a, b) => (a.effect.stage ?? 0) - (b.effect.stage ?? 0));
  const state = createUpgradeWebState(0);
  const results = new Map<string, FrontierSeedResult>();
  let matchesTotal = 0;
  let clamsSpentTotal = 0;

  for (const diamond of diamonds) {
    const nodePlan = buildFrontierPlan(web, diamond);
    const matchesBefore = matchesTotal;
    const clamsSpentBefore = clamsSpentTotal;
    while (!state.purchasedDiamonds.has(diamond.id)) {
      if (matchesTotal - matchesBefore >= MAX_FRONTIER_MATCHES) {
        throw new Error(`Unable to unlock ${diamond.id} within ${MAX_FRONTIER_MATCHES} matches`);
      }
      const warmup = runFrontierMatch(seed, state, FRONTIER_WARMUP_FRAMES);
      matchesTotal += 1;
      state.clams += warmup.earnedClams;
      for (;;) {
        const spent = buyAffordableFrontierStep(web, state, nodePlan, diamond.id);
        if (spent <= 0) break;
        clamsSpentTotal += spent;
      }
    }

    const evaluation = runFrontierMatch(seed, state, FRONTIER_EVAL_FRAMES);
    results.set(diamond.id, {
      activePanels: evaluation.activePanels,
      cumulativeCost: clamsSpentTotal,
      matchesStep: matchesTotal - matchesBefore,
      matchesTotal,
      power: getPowerScore(evaluation.snapshot),
      reward: getRewardScore(evaluation.snapshot),
      stage: getCurrentRunPanelStage(Array.from(state.purchasedDiamonds)),
      state: evaluation.state,
      stepCost: clamsSpentTotal - clamsSpentBefore,
      meta: getMetaProgressionScore(evaluation.snapshot),
    });
  }

  return results;
}

export function buildFrontierProgressionRows(): FrontierProgressionRow[] {
  const web = generateUpgradeWeb();
  const diamonds = web.diamondNodes
    .filter(
      (diamond): diamond is DiamondNode & { effect: { type: 'unlock_panel_stage'; stage: number } } =>
        diamond.effect.type === 'unlock_panel_stage' && Number.isFinite(diamond.effect.stage),
    )
    .sort((a, b) => (a.effect.stage ?? 0) - (b.effect.stage ?? 0));
  const seedResults = new Map(FRONTIER_REPORT_SEEDS.map((seed) => [seed, runFrontierProgression(seed)]));
  const baselineCache = new Map<string, MatchRunResult>();

  return diamonds.map((diamond) => {
    const toStage = diamond.effect.stage;
    const fromStage = Math.max(1, toStage - 1);
    const bySeed = FRONTIER_REPORT_SEEDS.map((seed) => seedResults.get(seed)?.get(diamond.id)).filter(
      (result): result is FrontierSeedResult => result != null,
    );
    const powerShifts = FRONTIER_REPORT_SEEDS.map((seed) => {
      const result = seedResults.get(seed)?.get(diamond.id);
      const cacheKey = `${seed}:${toStage}`;
      let baseline = baselineCache.get(cacheKey);
      if (!baseline) {
        baseline = runFrontierMatch(seed, createUpgradeWebState(0), FRONTIER_EVAL_FRAMES, {
          forcedStage: toStage,
        });
        baselineCache.set(cacheKey, baseline);
      }
      return getDifficultyShiftPercent(getPowerScore(baseline.snapshot), result?.power ?? 0);
    });
    const rewardShifts = FRONTIER_REPORT_SEEDS.map((seed) => {
      const result = seedResults.get(seed)?.get(diamond.id);
      const baseline = baselineCache.get(`${seed}:${toStage}`)!;
      return getDifficultyShiftPercent(getRewardScore(baseline.snapshot), result?.reward ?? 0);
    });
    const metaShifts = FRONTIER_REPORT_SEEDS.map((seed) => {
      const result = seedResults.get(seed)?.get(diamond.id);
      const baseline = baselineCache.get(`${seed}:${toStage}`)!;
      return getDifficultyShiftPercent(getMetaProgressionScore(baseline.snapshot), result?.meta ?? 0);
    });
    const powerSummary = summarizeShiftPercents(powerShifts);
    const rewardSummary = summarizeShiftPercents(rewardShifts);
    const metaSummary = summarizeShiftPercents(metaShifts);
    const survivalRate = bySeed.filter((result) => result.state !== 'lose').length / FRONTIER_REPORT_SEEDS.length;
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

    return {
      id: diamond.id,
      label: diamond.label,
      from_stage: fromStage,
      to_stage: toStage,
      step_cost: Math.round(mean(bySeed.map((result) => result.stepCost))),
      cumulative_cost: Math.round(mean(bySeed.map((result) => result.cumulativeCost))),
      matches_step_mean: Number(mean(bySeed.map((result) => result.matchesStep)).toFixed(2)),
      matches_total_mean: Number(mean(bySeed.map((result) => result.matchesTotal)).toFixed(2)),
      power_mean_pct: Number(powerSummary.mean.toFixed(2)),
      economy_mean_pct: Number(rewardSummary.mean.toFixed(2)),
      meta_mean_pct: Number(metaSummary.mean.toFixed(2)),
      survival_rate_pct: Number((survivalRate * 100).toFixed(2)),
    };
  });
}
