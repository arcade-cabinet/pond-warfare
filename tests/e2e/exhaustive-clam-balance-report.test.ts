// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { buildClamTierOneVariants } from '@/balance/track-variants';
import {
  BALANCE_REPORT_CLAM_FRAMES,
  buildReportRows,
  getSuspiciousRows,
} from './balance-report-sim';

describe('exhaustive clam balance report', () => {
  it('profiles every Clam T1 track in isolation', () => {
    const rows = buildReportRows(buildClamTierOneVariants(), undefined, {
      frames: BALANCE_REPORT_CLAM_FRAMES,
    });
    const suspicious = getSuspiciousRows(rows);

    console.log(`\nClam T1 relief report (stage 6, ${BALANCE_REPORT_CLAM_FRAMES} frames)`);
    console.table(rows);
    if (suspicious.length > 0) {
      console.log('\nSuspicious low-impact Clam tracks');
      console.table(suspicious);
    }

    expect(rows).toHaveLength(buildClamTierOneVariants().length);
    expect(rows.some((row) => row.meta_max_pct > 0)).toBe(true);
    for (const row of rows) {
      expect(Number.isFinite(row.power_mean_pct)).toBe(true);
      expect(Number.isFinite(row.economy_mean_pct)).toBe(true);
      expect(Number.isFinite(row.meta_min_pct)).toBe(true);
      expect(Number.isFinite(row.meta_mean_pct)).toBe(true);
      expect(Number.isFinite(row.meta_max_pct)).toBe(true);
    }
  }, 120_000);
});
