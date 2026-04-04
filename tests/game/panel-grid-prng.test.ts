/**
 * Tests: 50/50 PRNG Panel Unlock (T26)
 *
 * Validates that computeUnlockedPanelsWithRng at stages 3 and 5
 * produces different panel outcomes based on coin-flip booleans,
 * and that both outcomes are reachable for each stage.
 */

import { describe, expect, it } from 'vitest';
import { PanelGrid } from '@/game/panel-grid';

const VP_W = 960;
const VP_H = 540;

describe('50/50 PRNG panel unlock — stage 3', () => {
  it('coinFlipStage3=false picks panel 1 (first of [1,3])', () => {
    const grid = new PanelGrid(VP_W, VP_H, 3);
    grid.computeUnlockedPanelsWithRng(3, false, false);
    const active = grid.getActivePanels();

    expect(active).toContain(1);
    expect(active).not.toContain(3);
    expect(active).toContain(5);
    expect(active).toContain(2);
    expect(active).toHaveLength(3);
  });

  it('coinFlipStage3=true picks panel 3 (second of [1,3])', () => {
    const grid = new PanelGrid(VP_W, VP_H, 3);
    grid.computeUnlockedPanelsWithRng(3, true, false);
    const active = grid.getActivePanels();

    expect(active).toContain(3);
    expect(active).not.toContain(1);
    expect(active).toContain(5);
    expect(active).toContain(2);
    expect(active).toHaveLength(3);
  });

  it('both outcomes (panel 1 and panel 3) are reachable at stage 3', () => {
    const gridA = new PanelGrid(VP_W, VP_H, 3);
    gridA.computeUnlockedPanelsWithRng(3, false, false);

    const gridB = new PanelGrid(VP_W, VP_H, 3);
    gridB.computeUnlockedPanelsWithRng(3, true, false);

    const activesA = gridA.getActivePanels();
    const activesB = gridB.getActivePanels();

    expect(activesA).toContain(1);
    expect(activesA).not.toContain(3);
    expect(activesB).toContain(3);
    expect(activesB).not.toContain(1);
  });
});

describe('50/50 PRNG panel unlock — stage 5', () => {
  it('coinFlipStage5=false picks panel 4 (first of [4,6])', () => {
    const grid = new PanelGrid(VP_W, VP_H, 5);
    grid.computeUnlockedPanelsWithRng(5, false, false);
    const active = grid.getActivePanels();

    expect(active).toContain(4);
    expect(active).not.toContain(6);
    // At stage 5, stage 4 adds remaining of [1,3], so both 1 and 3 present
    expect(active).toContain(1);
    expect(active).toContain(3);
    expect(active).toContain(2);
    expect(active).toContain(5);
    expect(active).toHaveLength(5);
  });

  it('coinFlipStage5=true picks panel 6 (second of [4,6])', () => {
    const grid = new PanelGrid(VP_W, VP_H, 5);
    grid.computeUnlockedPanelsWithRng(5, false, true);
    const active = grid.getActivePanels();

    expect(active).toContain(6);
    expect(active).not.toContain(4);
    expect(active).toContain(1);
    expect(active).toContain(3);
    expect(active).toContain(2);
    expect(active).toContain(5);
    expect(active).toHaveLength(5);
  });

  it('both outcomes (panel 4 and panel 6) are reachable at stage 5', () => {
    const gridA = new PanelGrid(VP_W, VP_H, 5);
    gridA.computeUnlockedPanelsWithRng(5, false, false);

    const gridB = new PanelGrid(VP_W, VP_H, 5);
    gridB.computeUnlockedPanelsWithRng(5, false, true);

    expect(gridA.getActivePanels()).toContain(4);
    expect(gridA.getActivePanels()).not.toContain(6);
    expect(gridB.getActivePanels()).toContain(6);
    expect(gridB.getActivePanels()).not.toContain(4);
  });
});

describe('PRNG stage 3 + stage 5 combined', () => {
  it('coin flips at stage 3 carry forward to stage 5 correctly', () => {
    // Stage 3 picked panel 3, Stage 5 picked panel 6
    const grid = new PanelGrid(VP_W, VP_H, 5);
    grid.computeUnlockedPanelsWithRng(5, true, true);
    const active = grid.getActivePanels();

    // Stage 3 flip=true -> panel 3. Stage 4 adds remaining [1,3] not yet unlocked -> panel 1
    // Stage 5 flip=true -> panel 6
    expect(active).toContain(3); // from stage 3 flip
    expect(active).toContain(1); // from stage 4 remaining
    expect(active).toContain(6); // from stage 5 flip
    expect(active).not.toContain(4);
    expect(active).toHaveLength(5);
  });
});
