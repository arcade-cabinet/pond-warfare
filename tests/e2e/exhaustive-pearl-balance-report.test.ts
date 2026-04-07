// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { buildPearlRankOneVariants } from '@/balance/track-variants';
import { createPrestigeState } from '@/config/prestige-logic';
import { buildReportRows, getSuspiciousRows } from './balance-report-sim';

describe('exhaustive pearl balance report', () => {
  it('profiles every Pearl rank-1 upgrade in isolation', () => {
    const rows = buildReportRows(buildPearlRankOneVariants(), {
      kind: 'pearl',
      id: 'baseline_rank_1',
      label: 'Rank 1 Baseline',
      cost: 0,
      prestigeState: {
        ...createPrestigeState(),
        rank: 1,
      },
    });
    const suspicious = getSuspiciousRows(rows);

    console.log('\nPearl rank-1 relief report (stage 6, 1200 frames)');
    console.table(rows);
    if (suspicious.length > 0) {
      console.log('\nSuspicious low-impact Pearl tracks');
      console.table(suspicious);
    }

    expect(rows).toHaveLength(buildPearlRankOneVariants().length);
    for (const row of rows) {
      expect(Number.isFinite(row.power_mean_pct)).toBe(true);
      expect(Number.isFinite(row.economy_mean_pct)).toBe(true);
      expect(Number.isFinite(row.meta_min_pct)).toBe(true);
      expect(Number.isFinite(row.meta_mean_pct)).toBe(true);
      expect(Number.isFinite(row.meta_max_pct)).toBe(true);
    }
  }, 120_000);
});
