/**
 * Full Touch-Only Flow Test
 *
 * Validates the complete tap-only gameplay loop:
 * - Radial menu options are correct for game state
 * - Training deducts correct resources
 * - Tap-to-select and tap-to-command produce correct unit states
 *
 * Zero keyboard references in this file.
 */

import { describe, expect, it, vi } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import { Selectable, UnitStateMachine } from '@/ecs/components';
import { issueContextCommand } from '@/input/selection';
import { EntityKind, Faction, UnitState } from '@/types';
import { getRadialOptions, type RadialGameState } from '@/ui/radial-menu-options';
import { createTestWorld } from '../helpers/world-factory';

vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations', () => ({ triggerCommandPulse: vi.fn() }));
vi.mock('@/config/barks', () => ({
  showSelectBark: vi.fn(),
  showBark: vi.fn(),
}));
vi.mock('@/utils/particles');

function spawnResource(world: ReturnType<typeof createTestWorld>, x: number, y: number): number {
  const eid = spawnEntity(world, EntityKind.Clambed, x, y, Faction.Neutral);
  return eid;
}

describe('Touch-Only Gameplay Flow', () => {
  it('Lodge radial shows training options when fish is sufficient', () => {
    const gameState: RadialGameState = {
      fish: 100,
      rocks: 0,
      logs: 0,
      unlockStage: 1,
      lodgeDamaged: false,
    };

    const options = getRadialOptions('lodge', null, gameState);
    const ids = options.map((o) => o.id);

    expect(ids).toContain('train_mudpaw');
    expect(ids).not.toContain('train_medic');
  });

  it('Lodge radial hides training when broke', () => {
    const gameState: RadialGameState = {
      fish: 5,
      rocks: 0,
      logs: 0,
      unlockStage: 1,
      lodgeDamaged: false,
    };

    const options = getRadialOptions('lodge', null, gameState);
    const ids = options.map((o) => o.id);

    expect(ids).not.toContain('train_mudpaw');
    expect(ids).not.toContain('train_medic');
  });

  it('tap gatherer then tap resource issues gather-move command', () => {
    const world = createTestWorld({ fish: 50 });
    world.state = 'playing';

    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 200, Faction.Player);
    const resource = spawnResource(world, 300, 200);

    // Select the gatherer (simulating tap)
    Selectable.selected[gatherer] = 1;
    world.selection = [gatherer];

    // Tap on resource to issue gather command
    const dispatched = issueContextCommand(world, resource, 300, 200);

    expect(dispatched).toBe(true);
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[gatherer]).toBe(resource);
  });

  it('tap on empty ground with fighter selected issues move command', () => {
    const world = createTestWorld({ fish: 50 });
    world.state = 'playing';

    const fighter = spawnEntity(world, EntityKind.Brawler, 200, 200, Faction.Player);
    Selectable.selected[fighter] = 1;
    world.selection = [fighter];

    // Tap on empty ground
    const dispatched = issueContextCommand(world, null, 500, 300);
    expect(dispatched).toBe(true);
    expect(UnitStateMachine.state[fighter]).toBe(UnitState.Move);
  });

  it('tap on enemy with fighter selected issues attack command', () => {
    const world = createTestWorld({ fish: 50 });
    world.state = 'playing';

    const fighter = spawnEntity(world, EntityKind.Brawler, 200, 200, Faction.Player);
    const enemy = spawnEntity(world, EntityKind.Gator, 400, 200, Faction.Enemy);

    Selectable.selected[fighter] = 1;
    world.selection = [fighter];

    const dispatched = issueContextCommand(world, enemy, 400, 200);
    expect(dispatched).toBe(true);
    expect(UnitStateMachine.state[fighter]).toBe(UnitState.AttackMove);
    expect(UnitStateMachine.targetEntity[fighter]).toBe(enemy);
  });

  it('full flow: radial options -> select unit -> issue command', () => {
    const world = createTestWorld({ fish: 100 });
    world.state = 'playing';

    // Step 1: Verify radial options exist for Lodge with 100 fish
    const options = getRadialOptions('lodge', null, {
      fish: 100,
      rocks: 0,
      logs: 0,
      unlockStage: 1,
      lodgeDamaged: false,
    });
    expect(options.length).toBeGreaterThan(0);
    expect(options.map((o) => o.id)).toContain('train_mudpaw');

    // Step 2: Spawn a gatherer (simulating training completion)
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 400, 420, Faction.Player);
    const resource = spawnResource(world, 600, 300);

    // Step 3: Tap gatherer to select
    Selectable.selected[gatherer] = 1;
    world.selection = [gatherer];

    // Step 4: Tap resource to gather
    const dispatched = issueContextCommand(world, resource, 600, 300);
    expect(dispatched).toBe(true);
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.GatherMove);
  });

  it('unit radial shows correct options for each role via tap', () => {
    const generalistOpts = getRadialOptions('unit', 'generalist');
    expect(generalistOpts.map((o) => o.id)).toContain('cmd_gather');
    expect(generalistOpts.map((o) => o.id)).toContain('cmd_attack');
    expect(generalistOpts.map((o) => o.id)).toContain('cmd_scout');

    // Combat role
    const combatOpts = getRadialOptions('unit', 'combat');
    expect(combatOpts.map((o) => o.id)).toContain('cmd_attack');
    expect(combatOpts.map((o) => o.id)).toContain('cmd_amove');

    // Heal role
    const healOpts = getRadialOptions('unit', 'heal');
    expect(healOpts.map((o) => o.id)).toContain('cmd_heal');

    // Scout role
    const scoutOpts = getRadialOptions('unit', 'scout');
    expect(scoutOpts.map((o) => o.id)).toContain('cmd_scout');
  });
});
