export interface BalanceSnapshot {
  resourcesGathered: number;
  unitsTrained: number;
  kills: number;
  playerUnits: number;
  lodgeHpRatio: number;
  matchClamsEarned?: number;
}

export interface ShiftSummary {
  min: number;
  mean: number;
  max: number;
}

const STAGE_PRESSURE_STEP = 0.4;
const MATCH_PRESSURE_STEP = 0.55;
const REWARD_SCORE_WEIGHT = 0.15;

/**
 * Baseline pressure model for a no-upgrade run.
 *
 * Panel stages add discrete complexity, while successive matches in the same
 * run increase pressure on a logarithmic curve.
 */
export function getBaselinePressureScore(panelStage: number, matchNumber: number): number {
  const safeStage = Math.max(1, Math.trunc(panelStage));
  const safeMatch = Math.max(1, Math.trunc(matchNumber));
  const stagePressure = 1 + (safeStage - 1) * STAGE_PRESSURE_STEP;
  const matchPressure = 1 + Math.log2(safeMatch) * MATCH_PRESSURE_STEP;
  return stagePressure * matchPressure;
}

/**
 * Convert a simulation snapshot into a rough "player power" score.
 *
 * This deliberately compresses large raw counts with logarithms so no single
 * metric dominates the result.
 */
export function getPowerScore(snapshot: BalanceSnapshot): number {
  const resources = Math.log2(snapshot.resourcesGathered + 1) * 0.35;
  const training = Math.log2(snapshot.unitsTrained + 1) * 0.2;
  const kills = Math.log2(snapshot.kills + 1) * 0.15;
  const army = Math.log2(snapshot.playerUnits + 1) * 0.1;
  const lodge = clamp(snapshot.lodgeHpRatio, 0, 1) * 0.2;
  return resources + training + kills + army + lodge;
}

/**
 * Scenario-specific score for immediate-pressure defense diagnostics.
 *
 * This intentionally weights Lodge survival and army retention more heavily
 * than economy, since the scenario is trying to answer whether a defensive
 * upgrade helps the player hold the line under sudden pressure.
 */
export function getCombatPressureScore(snapshot: BalanceSnapshot): number {
  const resources = Math.log2(snapshot.resourcesGathered + 1) * 0.05;
  const training = Math.log2(snapshot.unitsTrained + 1) * 0.1;
  const kills = Math.log2(snapshot.kills + 1) * 0.2;
  const army = Math.log2(snapshot.playerUnits + 1) * 0.2;
  const lodge = clamp(snapshot.lodgeHpRatio, 0, 1) * 0.45;
  return resources + training + kills + army + lodge;
}

/**
 * Convert post-match Clam earnings into a compressed economy score.
 *
 * This lets diagnostics separate direct in-match power from meta-economy
 * acceleration such as Clam-earning bonuses.
 */
export function getRewardScore(snapshot: BalanceSnapshot): number {
  const matchClamsEarned = Math.max(0, snapshot.matchClamsEarned ?? 0);
  return Math.log2(matchClamsEarned + 1) * REWARD_SCORE_WEIGHT;
}

/**
 * Combined progression score used for meta-loop diagnostics.
 *
 * This is intentionally a sum of in-match power and post-match economy so the
 * report can surface upgrades that help pacing even if they do not materially
 * change the first match's battlefield state.
 */
export function getMetaProgressionScore(snapshot: BalanceSnapshot): number {
  return getPowerScore(snapshot) + getRewardScore(snapshot);
}

/**
 * Backward-compatible alias for older diagnostics that only measured in-match
 * power.
 */
export function getPerformanceScore(snapshot: BalanceSnapshot): number {
  return getPowerScore(snapshot);
}

/**
 * Positive values mean the variant reduces effective difficulty relative to
 * the baseline run.
 */
export function getDifficultyShiftPercent(
  baselinePerformance: number,
  variantPerformance: number,
): number {
  if (baselinePerformance <= 0) return 0;
  return ((variantPerformance - baselinePerformance) / baselinePerformance) * 100;
}

export function summarizeShiftPercents(samples: number[]): ShiftSummary {
  if (samples.length === 0) {
    return { min: 0, mean: 0, max: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    min: sorted[0],
    mean: total / sorted.length,
    max: sorted[sorted.length - 1],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
