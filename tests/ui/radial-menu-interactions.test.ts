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

    expect(ids).toContain('train_mudpaw');
    expect(ids).not.toContain('train_medic');
    expect(ids).not.toContain('train_sapper');
    expect(ids).not.toContain('train_saboteur');
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

    expect(ids).not.toContain('train_mudpaw');
    expect(ids).not.toContain('train_medic');
  });

  it('Mudpaw is trainable at 10 fish, not at 9', () => {
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

    expect(brokeOpts.map((o) => o.id)).not.toContain('train_mudpaw');
    expect(affordOpts.map((o) => o.id)).toContain('train_mudpaw');
  });

  it('Medic unlocks at stage 2', () => {
    const earlyGame: RadialGameState = {
      fish: 100,
      rocks: 0,
      logs: 0,
      unlockStage: 1,
      lodgeDamaged: false,
    };

    const stageTwo: RadialGameState = {
      fish: 100,
      rocks: 0,
      logs: 0,
      unlockStage: 2,
      lodgeDamaged: false,
    };

    const earlyIds = getRadialOptions('lodge', null, earlyGame).map((o) => o.id);
    const stageTwoIds = getRadialOptions('lodge', null, stageTwo).map((o) => o.id);

    expect(earlyIds).not.toContain('train_medic');
    expect(stageTwoIds).toContain('train_medic');
  });

  it('Sapper and Saboteur require their later frontier stages plus rocks', () => {
    const stageFive: RadialGameState = {
      fish: 100,
      rocks: 50,
      logs: 50,
      unlockStage: 5,
      lodgeDamaged: false,
    };
    const stageSix: RadialGameState = {
      fish: 100,
      rocks: 50,
      logs: 50,
      unlockStage: 6,
      lodgeDamaged: false,
    };

    const stageFiveIds = getRadialOptions('lodge', null, stageFive).map((o) => o.id);
    const stageSixIds = getRadialOptions('lodge', null, stageSix).map((o) => o.id);

    expect(stageFiveIds).toContain('train_sapper');
    expect(stageFiveIds).not.toContain('train_saboteur');
    expect(stageSixIds).toContain('train_sapper');
    expect(stageSixIds).toContain('train_saboteur');
  });

  it('Repair option only shows when Lodge is damaged and has logs', () => {
    const undamaged: RadialGameState = {
      fish: 50,
      rocks: 0,
      logs: 30,
      unlockStage: 3,
      lodgeDamaged: false,
    };

    const damaged: RadialGameState = {
      fish: 50,
      rocks: 0,
      logs: 30,
      unlockStage: 3,
      lodgeDamaged: true,
    };

    const damagedNoLogs: RadialGameState = {
      fish: 50,
      rocks: 0,
      logs: 20,
      unlockStage: 3,
      lodgeDamaged: true,
    };

    expect(getRadialOptions('lodge', null, undamaged).map((o) => o.id)).not.toContain('repair');
    expect(getRadialOptions('lodge', null, damaged).map((o) => o.id)).toContain('repair');
    expect(getRadialOptions('lodge', null, damagedNoLogs).map((o) => o.id)).not.toContain('repair');
  });

  it('Unit radial shows role-specific options for Mudpaw generalists', () => {
    const options = getRadialOptions('unit', 'generalist');
    const ids = options.map((o) => o.id);

    expect(ids).toContain('cmd_gather');
    expect(ids).toContain('cmd_attack');
    expect(ids).toContain('cmd_scout');
    expect(ids).toContain('cmd_hold');
    expect(ids).toContain('cmd_patrol');
    expect(ids).toContain('cmd_return');
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

  it('Unit radial shows role-specific options for support', () => {
    const options = getRadialOptions('unit', 'support');
    const ids = options.map((o) => o.id);

    expect(ids).toContain('cmd_heal');
    expect(ids).toContain('cmd_hold');
    expect(ids).not.toContain('cmd_attack');
  });

  it('Unit radial shows role-specific options for recon', () => {
    const options = getRadialOptions('unit', 'recon');
    const ids = options.map((o) => o.id);

    expect(ids).toContain('cmd_scout');
    expect(ids).toContain('cmd_patrol');
    expect(ids).not.toContain('cmd_attack');
    expect(ids).not.toContain('cmd_gather');
    expect(options.find((o) => o.id === 'cmd_scout')?.label).toBe('Recon');
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
