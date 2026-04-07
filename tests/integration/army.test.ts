/**
 * Army Integration Tests
 *
 * Tests canonical field-unit training, combat, and veterancy. Operates
 * directly on ECS systems — no UI, no DOM.
 */

import { addComponent } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Combat,
  Health,
  Position,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { trainingSystem } from '@/ecs/systems/training';
import { rankFromKills, veterancySystem } from '@/ecs/systems/veterancy';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { MEDIC_KIND, MUDPAW_KIND, SAPPER_KIND, SABOTEUR_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, UnitState } from '@/types';
import { getPlayerArmyUnits, getPlayerEntities } from '../helpers/ecs-queries';

describe('Army Integration', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
    world.resources.rocks = 50;
  });

  it('lodge trains Mudpaws, Medics, and Sappers', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 400, 400, Faction.Player);
    Building.progress[lodge] = 100;
    Health.current[lodge] = Health.max[lodge];

    addComponent(world.ecs, lodge, TrainingQueue);
    TrainingQueue.count[lodge] = 3;
    TrainingQueue.timer[lodge] = 1;
    trainingQueueSlots.set(lodge, [MUDPAW_KIND, MEDIC_KIND, SAPPER_KIND]);
    trainingSystem(world);

    TrainingQueue.timer[lodge] = 1;
    trainingSystem(world);

    TrainingQueue.timer[lodge] = 1;
    trainingSystem(world);

    const fieldUnits = getPlayerArmyUnits(world);
    expect(fieldUnits.length).toBe(3);
    expect(getPlayerEntities(world, MUDPAW_KIND).length).toBe(1);
    expect(getPlayerEntities(world, MEDIC_KIND).length).toBe(1);
    expect(getPlayerEntities(world, SAPPER_KIND).length).toBe(1);
  });

  it('Mudpaw attacks enemy and deals damage', () => {
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    const gator = spawnEntity(world, EntityKind.Gator, 120, 100, Faction.Enemy);

    UnitStateMachine.state[mudpaw] = UnitState.Attacking;
    UnitStateMachine.targetEntity[mudpaw] = gator;
    Combat.attackCooldown[mudpaw] = 0;

    const hpBefore = Health.current[gator];
    combatSystem(world);

    expect(Health.current[gator]).toBeLessThan(hpBefore);
  });

  it('Saboteur attacks enemy and deals damage', () => {
    const saboteur = spawnEntity(world, SABOTEUR_KIND, 100, 100, Faction.Player);
    const snake = spawnEntity(world, EntityKind.Snake, 120, 100, Faction.Enemy);

    UnitStateMachine.state[saboteur] = UnitState.Attacking;
    UnitStateMachine.targetEntity[saboteur] = snake;
    Combat.attackCooldown[saboteur] = 0;

    const hpBefore = Health.current[snake];
    combatSystem(world);

    expect(Health.current[snake]).toBeLessThan(hpBefore);
  });

  it('veterancy rank increases with kills', () => {
    expect(rankFromKills(0)).toBe(0);
    expect(rankFromKills(3)).toBe(1);
    expect(rankFromKills(7)).toBe(2);
    expect(rankFromKills(15)).toBe(3);
  });

  it('veteran Mudpaw gets stat bonuses', () => {
    world.frameCount = 60;
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    const baseHp = Health.max[mudpaw];
    const baseDmg = Combat.damage[mudpaw];

    Combat.kills[mudpaw] = 3;
    veterancySystem(world);

    expect(Health.max[mudpaw]).toBeGreaterThan(baseHp);
    expect(Combat.damage[mudpaw]).toBe(baseDmg);
  });

  it('lodge can field late-panel manual siege units when rocks are available', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 400, 400, Faction.Player);
    Building.progress[lodge] = 100;
    Health.current[lodge] = Health.max[lodge];

    addComponent(world.ecs, lodge, TrainingQueue);
    TrainingQueue.count[lodge] = 2;
    TrainingQueue.timer[lodge] = 1;
    trainingQueueSlots.set(lodge, [SAPPER_KIND, SABOTEUR_KIND]);

    trainingSystem(world);
    TrainingQueue.timer[lodge] = 1;
    trainingSystem(world);

    expect(getPlayerEntities(world, SAPPER_KIND)).toHaveLength(1);
    expect(getPlayerEntities(world, SABOTEUR_KIND)).toHaveLength(1);
  });

  it('field-unit helper includes Mudpaws and manual specialists', () => {
    spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    spawnEntity(world, MEDIC_KIND, 200, 100, Faction.Player);
    spawnEntity(world, SAPPER_KIND, 300, 100, Faction.Player);

    const fieldUnits = getPlayerArmyUnits(world);
    expect(fieldUnits.length).toBe(3);
  });
});
