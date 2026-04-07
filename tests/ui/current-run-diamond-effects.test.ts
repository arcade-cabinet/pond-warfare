import { describe, expect, it } from 'vitest';
import {
  getCurrentRunPanelStage,
  resolveCurrentRunDiamondEffects,
} from '@/ui/current-run-diamond-effects';

describe('current-run diamond effects', () => {
  it('defaults to panel stage 1 for a fresh run', () => {
    expect(getCurrentRunPanelStage([])).toBe(1);
  });

  it('promotes the panel stage from purchased frontier diamonds', () => {
    expect(getCurrentRunPanelStage(['frontier_expansion_1'])).toBe(2);
    expect(getCurrentRunPanelStage(['frontier_expansion_1', 'frontier_expansion_3'])).toBe(4);
    expect(
      getCurrentRunPanelStage([
        'frontier_expansion_1',
        'frontier_expansion_2',
        'frontier_expansion_3',
        'frontier_expansion_4',
        'frontier_expansion_5',
      ]),
    ).toBe(6);
  });

  it('ignores stale or unrelated diamonds when computing panel stage', () => {
    const effects = resolveCurrentRunDiamondEffects([
      'dock_wing',
      'economy_master',
      'unknown_diamond',
      'frontier_expansion_2',
    ]);

    expect(effects.panelStage).toBe(3);
  });
});
