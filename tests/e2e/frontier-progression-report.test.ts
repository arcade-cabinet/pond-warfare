// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  buildFrontierProgressionRows,
  FRONTIER_EVAL_FRAMES,
  FRONTIER_REPORT_SEEDS,
  FRONTIER_WARMUP_FRAMES,
} from './frontier-progression-report-sim';

describe('frontier progression report', () => {
  it('profiles the real pane-transition Clam path across the prestige run', () => {
    const rows = buildFrontierProgressionRows();

    console.log(
      `\nFrontier Expansion report (${FRONTIER_REPORT_SEEDS.join('/')}, warmup ${FRONTIER_WARMUP_FRAMES} frames, eval ${FRONTIER_EVAL_FRAMES} frames)`,
    );
    console.table(rows);

    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.to_stage)).toEqual([2, 3, 4, 5, 6]);
    for (const row of rows) {
      expect(row.survival_rate_pct).toBe(100);
      expect(row.matches_step_mean).toBeGreaterThan(0);
      expect(row.matches_total_mean).toBeGreaterThanOrEqual(row.matches_step_mean);
      expect(row.cumulative_cost).toBeGreaterThanOrEqual(row.step_cost);
      expect(Number.isFinite(row.power_mean_pct)).toBe(true);
      expect(Number.isFinite(row.economy_mean_pct)).toBe(true);
      expect(Number.isFinite(row.meta_mean_pct)).toBe(true);
    }
    expect(Math.min(...rows.map((row) => row.meta_mean_pct))).toBeGreaterThan(-1);
    expect(Math.max(...rows.map((row) => row.meta_mean_pct))).toBeGreaterThan(0);
    expect(rows[4]?.matches_total_mean ?? Number.POSITIVE_INFINITY).toBeLessThan(60);
    expect(rows[4]?.cumulative_cost ?? 0).toBeGreaterThan(rows[0]?.cumulative_cost ?? 0);
  }, 720_000);
});
