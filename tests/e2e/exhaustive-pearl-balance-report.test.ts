// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { buildPearlRankOneVariants } from '@/balance/track-variants';
import { createPrestigeState } from '@/config/prestige-logic';
import {
  BALANCE_REPORT_LONG_RUN_FRAMES,
  BALANCE_REPORT_OPENING_FRAMES,
  buildReportRows,
  getSuspiciousRows,
} from './balance-report-sim';

describe('exhaustive pearl balance report', () => {
  it('profiles every Pearl rank-1 upgrade in isolation across opening and long-run windows', () => {
    const baseline = {
      kind: 'pearl',
      id: 'baseline_rank_1',
      label: 'Rank 1 Baseline',
      cost: 0,
      prestigeState: {
        ...createPrestigeState(),
        rank: 1,
      },
    } as const;
    const variants = buildPearlRankOneVariants();
    const openingRows = buildReportRows(variants, baseline, {
      frames: BALANCE_REPORT_OPENING_FRAMES,
    });
    const longRunRows = buildReportRows(variants, baseline, {
      frames: BALANCE_REPORT_LONG_RUN_FRAMES,
    });
    const openingSuspicious = getSuspiciousRows(openingRows);
    const longRunSuspicious = getSuspiciousRows(longRunRows);

    console.log(`\nPearl rank-1 relief report (stage 6, ${BALANCE_REPORT_OPENING_FRAMES} frames)`);
    console.table(openingRows);
    if (openingSuspicious.length > 0) {
      console.log('\nSuspicious low-impact Pearl tracks (opening window)');
      console.table(openingSuspicious);
    }
    console.log(`\nPearl rank-1 relief report (stage 6, ${BALANCE_REPORT_LONG_RUN_FRAMES} frames)`);
    console.table(longRunRows);
    if (longRunSuspicious.length > 0) {
      console.log('\nSuspicious low-impact Pearl tracks (long-run window)');
      console.table(longRunSuspicious);
    }

    expect(openingRows).toHaveLength(variants.length);
    expect(longRunRows).toHaveLength(variants.length);
    for (const row of [...openingRows, ...longRunRows]) {
      expect(Number.isFinite(row.power_mean_pct)).toBe(true);
      expect(Number.isFinite(row.economy_mean_pct)).toBe(true);
      expect(Number.isFinite(row.meta_min_pct)).toBe(true);
      expect(Number.isFinite(row.meta_mean_pct)).toBe(true);
      expect(Number.isFinite(row.meta_max_pct)).toBe(true);
    }
  }, 240_000);
});
