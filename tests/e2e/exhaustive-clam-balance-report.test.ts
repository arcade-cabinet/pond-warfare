// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { buildClamTierOneVariants } from '@/balance/track-variants';
import { getSuspiciousRows } from './balance-report-sim';
import {
  buildPostMatchClamReportRows,
  CLAM_POSTMATCH_EVAL_FRAMES,
  CLAM_POSTMATCH_STAGE,
  CLAM_POSTMATCH_WARMUP_FRAMES,
} from './clam-postmatch-report-sim';

describe('exhaustive clam balance report', () => {
  it('profiles every Clam T1 track in a post-match purchase loop', () => {
    const rows = buildPostMatchClamReportRows(buildClamTierOneVariants());
    const suspicious = getSuspiciousRows(rows);

    console.log(
      `\nClam T1 post-match relief report (stage ${CLAM_POSTMATCH_STAGE}, warmup ${CLAM_POSTMATCH_WARMUP_FRAMES} frames, eval ${CLAM_POSTMATCH_EVAL_FRAMES} frames)`,
    );
    console.table(rows);
    if (suspicious.length > 0) {
      console.log('\nSuspicious low-impact Clam tracks');
      console.table(suspicious);
    }

    const fishGather = rows.find((row) => row.id === 'gathering_fish_gathering_t0');
    const nodeYield = rows.find((row) => row.id === 'economy_node_yield_t0');
    const clamBonus = rows.find((row) => row.id === 'economy_clam_bonus_t0');

    expect(rows).toHaveLength(buildClamTierOneVariants().length);
    expect(fishGather?.meta_mean_pct ?? 0).toBeGreaterThan(0);
    expect(nodeYield?.meta_mean_pct ?? 0).toBeGreaterThan(0);
    expect(clamBonus?.meta_mean_pct ?? 0).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Number.isFinite(row.power_mean_pct)).toBe(true);
      expect(Number.isFinite(row.economy_mean_pct)).toBe(true);
      expect(Number.isFinite(row.meta_min_pct)).toBe(true);
      expect(Number.isFinite(row.meta_mean_pct)).toBe(true);
      expect(Number.isFinite(row.meta_max_pct)).toBe(true);
    }
  }, 720_000);
});
