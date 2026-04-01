/**
 * Advisor Pressure Integration Tests
 *
 * Validates that real tip conditions from tips.ts fire correctly
 * against realistic GameWorld states. Uses actual ADVISOR_TIPS (no mocks).
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADVISOR_TIPS } from '@/advisors/tips';
import type { AdvisorTip } from '@/advisors/types';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  UnitStateMachine,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

function tip(id: string): AdvisorTip {
  const found = ADVISOR_TIPS.find((t) => t.id === id);
  if (!found) throw new Error(`Tip "${id}" not found`);
  return found;
}

function addIdleGatherer(w: GameWorld): void {
  const eid = addEntity(w.ecs);
  for (const c of [Health, FactionTag, EntityTypeTag, UnitStateMachine])
    addComponent(w.ecs, eid, c);
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Gatherer;
  UnitStateMachine.state[eid] = UnitState.Idle;
}

function addEnemy(w: GameWorld, kind: EntityKind): void {
  const eid = addEntity(w.ecs);
  for (const c of [Health, FactionTag, EntityTypeTag]) addComponent(w.ecs, eid, c);
  Health.current[eid] = 50;
  Health.max[eid] = 50;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = kind;
}

function addBuilding(w: GameWorld, kind: EntityKind): void {
  const eid = addEntity(w.ecs);
  for (const c of [Health, FactionTag, EntityTypeTag, IsBuilding, Building])
    addComponent(w.ecs, eid, c);
  Health.current[eid] = 200;
  Health.max[eid] = 200;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Building.progress[eid] = 100;
}

describe('Advisor Pressure', () => {
  let w: GameWorld;

  beforeEach(() => {
    w = createGameWorld();
  });

  it('economy advisor fires for idle gatherers', () => {
    addIdleGatherer(w);
    addIdleGatherer(w);
    w.frameCount = 400;

    expect(tip('idle_gatherers').condition(w)).toBe(true);
    expect(tip('idle_gatherers').advisor).toBe('economy');
  });

  it('economy advisor fires at population cap', () => {
    w.resources.food = 16;
    w.resources.maxFood = 16;

    expect(tip('pop_cap').condition(w)).toBe(true);
    expect(tip('pop_cap').advisor).toBe('economy');
    expect(tip('pop_cap').priority).toBe(100);
  });

  it('war advisor fires when enemies present and no armory', () => {
    addEnemy(w, EntityKind.Gator);

    expect(tip('no_armory').condition(w)).toBe(true);
    expect(tip('no_armory').advisor).toBe('war');
  });

  it('war advisor silent when armory exists', () => {
    addEnemy(w, EntityKind.Gator);
    addBuilding(w, EntityKind.Armory);

    expect(tip('no_armory').condition(w)).toBe(false);
  });

  it('builder advisor fires for available research', () => {
    addBuilding(w, EntityKind.Lodge);
    w.frameCount = 1000;

    expect(tip('research_available').condition(w)).toBe(true);
    expect(tip('research_available').advisor).toBe('builder');
  });

  it('builder advisor silent after tech researched', () => {
    addBuilding(w, EntityKind.Lodge);
    w.frameCount = 1000;
    w.tech.sturdyMud = true;

    expect(tip('research_available').condition(w)).toBe(false);
  });
});
