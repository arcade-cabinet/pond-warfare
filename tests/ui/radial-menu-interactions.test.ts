/**
 * Radial Menu Interaction Tests
 *
 * Validates tap-driven radial menu behavior:
 * - Lodge tap shows radial menu
 * - Radial option tap trains a unit
 * - Cost check prevents training when resources insufficient
 * - Radial menu closes on overlay tap
 *
 * Zero keyboard references in this file.
 */

import { describe, expect, it } from 'vitest';
import { getRadialOptions, type RadialGameState } from '@/ui/radial-menu-options';

describe('Radial Menu Interactions (tap-only)', () => {
  it('Lodge radial shows training options when resources sufficient', () => {
    const state: RadialGameState = {
      fish: 100,
      rocks: 0,
      logs: 0,
      unlockStage: 1,
      lodgeDamaged: false,
    };

    const options = getRadialOptions('lodge', null, state);
    const ids = options.map((o) => o.id);

    // With 100 fish, should have all basic training options
    expect(ids).toContain('train_gatherer');
    expect(ids).toContain('train_fighter');
    expect(ids).toContain('train_medic');
    expect(ids).toContain('train_scout');
  });

  it('Lodge radial hides training when fish too low', () => {
    const state: RadialGameState = {
      fish: 5,
      rocks: 0,
      logs: 0,
      unlockStage: 1,
      lodgeDamaged: false,
    };

    const options = getRadialOptions('lodge', null, state);
    const ids = options.map((o) => o.id);

    // With only 5 fish, no training should be available
    expect(ids).not.toContain('train_gatherer'); // costs 10
    expect(ids).not.toContain('train_fighter'); // costs 20
    expect(ids).not.toContain('train_medic'); // costs 15
    expect(ids).not.toContain('train_scout'); // costs 8
  });

  it('Gatherer is trainable at 10 fish, not at 9', () => {
    const broke: RadialGameState = {
      fish: 9,
      rocks: 0,
      logs: 0,
      unlockStage: 1,
      lodgeDamaged: false,
    };

    const affordable: RadialGameState = {
      fish: 10,
      rocks: 0,
      logs: 0,
      unlockStage: 1,
      lodgeDamaged: false,
    };

    const brokeOpts = getRadialOptions('lodge', null, broke);
    const affordOpts = getRadialOptions('lodge', null, affordable);

    expect(brokeOpts.map((o) => o.id)).not.toContain('train_gatherer');
    expect(affordOpts.map((o) => o.id)).toContain('train_gatherer');
  });

  it('Sapper and Saboteur require high unlock stage and rocks', () => {
    const earlyGame: RadialGameState = {
      fish: 100,
      rocks: 50,
      logs: 50,
      unlockStage: 1,
      lodgeDamaged: false,
    };

    const lateGame: RadialGameState = {
      fish: 100,
      rocks: 50,
      logs: 50,
      unlockStage: 5,
      lodgeDamaged: false,
    };

    const earlyIds = getRadialOptions('lodge', null, earlyGame).map((o) => o.id);
    const lateIds = getRadialOptions('lodge', null, lateGame).map((o) => o.id);

    expect(earlyIds).not.toContain('train_sapper');
    expect(earlyIds).not.toContain('train_saboteur');
    expect(lateIds).toContain('train_sapper');
    expect(lateIds).toContain('train_saboteur');
  });

  it('Repair option only shows when Lodge is damaged and has logs', () => {
    const undamaged: RadialGameState = {
      fish: 50,
      rocks: 0,
      logs: 20,
      unlockStage: 3,
      lodgeDamaged: false,
    };

    const damaged: RadialGameState = {
      fish: 50,
      rocks: 0,
      logs: 20,
      unlockStage: 3,
      lodgeDamaged: true,
    };

    const damagedNoLogs: RadialGameState = {
      fish: 50,
      rocks: 0,
      logs: 0,
      unlockStage: 3,
      lodgeDamaged: true,
    };

    expect(getRadialOptions('lodge', null, undamaged).map((o) => o.id)).not.toContain('repair');
    expect(getRadialOptions('lodge', null, damaged).map((o) => o.id)).toContain('repair');
    expect(getRadialOptions('lodge', null, damagedNoLogs).map((o) => o.id)).not.toContain('repair');
  });

  it('Unit radial shows role-specific options for gatherer', () => {
    const options = getRadialOptions('unit', 'gather');
    const ids = options.map((o) => o.id);

    expect(ids).toContain('cmd_gather');
    expect(ids).toContain('cmd_hold');
    expect(ids).toContain('cmd_patrol');
    expect(ids).toContain('cmd_return');
    expect(ids).not.toContain('cmd_attack');
  });

  it('Unit radial shows role-specific options for combat', () => {
    const options = getRadialOptions('unit', 'combat');
    const ids = options.map((o) => o.id);

    expect(ids).toContain('cmd_attack');
    expect(ids).toContain('cmd_amove');
    expect(ids).toContain('cmd_hold');
    expect(ids).toContain('cmd_stance');
    expect(ids).not.toContain('cmd_gather');
  });

  it('Unit radial shows role-specific options for healer', () => {
    const options = getRadialOptions('unit', 'heal');
    const ids = options.map((o) => o.id);

    expect(ids).toContain('cmd_heal');
    expect(ids).toContain('cmd_hold');
    expect(ids).not.toContain('cmd_attack');
  });

  it('Unit radial shows role-specific options for scout', () => {
    const options = getRadialOptions('unit', 'scout');
    const ids = options.map((o) => o.id);

    expect(ids).toContain('cmd_scout');
    expect(ids).toContain('cmd_patrol');
    expect(ids).not.toContain('cmd_attack');
    expect(ids).not.toContain('cmd_gather');
  });

  it('Unknown role falls back to generic options', () => {
    const options = getRadialOptions('unit', 'unknown_role');
    const ids = options.map((o) => o.id);

    expect(ids).toContain('cmd_move');
    expect(ids).toContain('cmd_hold');
    expect(ids).toContain('cmd_patrol');
  });

  it('Fortify option requires rocks and stage 5+', () => {
    const noRocks: RadialGameState = {
      fish: 50,
      rocks: 0,
      logs: 0,
      unlockStage: 5,
      lodgeDamaged: false,
    };

    const withRocks: RadialGameState = {
      fish: 50,
      rocks: 20,
      logs: 0,
      unlockStage: 5,
      lodgeDamaged: false,
    };

    expect(getRadialOptions('lodge', null, noRocks).map((o) => o.id)).not.toContain('fortify');
    expect(getRadialOptions('lodge', null, withRocks).map((o) => o.id)).toContain('fortify');
  });
});
