/** Advisor Tips Tests -- validates condition functions with mock GameWorld. */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADVISOR_TIPS } from '@/advisors/tips';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Resource,
  UnitStateMachine,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

function tip(id: string) {
  const found = ADVISOR_TIPS.find((t) => t.id === id);
  if (!found) throw new Error(`Tip "${id}" not found`);
  return found;
}

function addUnit(w: GameWorld, kind: EntityKind, state: UnitState) {
  const eid = addEntity(w.ecs);
  for (const c of [Health, FactionTag, EntityTypeTag, UnitStateMachine])
    addComponent(w.ecs, eid, c);
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  UnitStateMachine.state[eid] = state;
}

function addBuilding(w: GameWorld, kind: EntityKind, hp = 200) {
  const eid = addEntity(w.ecs);
  for (const c of [Health, FactionTag, EntityTypeTag, IsBuilding, Building])
    addComponent(w.ecs, eid, c);
  Health.current[eid] = hp;
  Health.max[eid] = 200;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Building.progress[eid] = 100;
}

function addEnemy(w: GameWorld, kind: EntityKind) {
  const eid = addEntity(w.ecs);
  for (const c of [Health, FactionTag, EntityTypeTag]) addComponent(w.ecs, eid, c);
  Health.current[eid] = 50;
  Health.max[eid] = 50;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = kind;
}

describe('Advisor Tips', () => {
  let w: GameWorld;
  beforeEach(() => {
    w = createGameWorld();
  });

  it('idle_gatherers: fires when idle + frame > 300, not before or when busy', () => {
    addUnit(w, EntityKind.Gatherer, UnitState.Idle);
    w.frameCount = 100;
    expect(tip('idle_gatherers').condition(w)).toBe(false);
    w.frameCount = 301;
    expect(tip('idle_gatherers').condition(w)).toBe(true);
  });

  it('pop_cap: fires at cap, not below or at zero maxFood', () => {
    w.resources.food = 10;
    w.resources.maxFood = 16;
    expect(tip('pop_cap').condition(w)).toBe(false);
    w.resources.food = 16;
    expect(tip('pop_cap').condition(w)).toBe(true);
    w.resources.food = 0;
    w.resources.maxFood = 0;
    expect(tip('pop_cap').condition(w)).toBe(false);
  });

  it('lodge_under_attack: fires when HP below max, not at full', () => {
    addBuilding(w, EntityKind.Lodge, 150);
    expect(tip('lodge_under_attack').condition(w)).toBe(true);
  });

  it('peace_ending: fires < 1800 frames before end, not otherwise', () => {
    w.peaceTimer = 7200;
    w.frameCount = 1000;
    expect(tip('peace_ending').condition(w)).toBe(false);
    w.frameCount = 6000;
    expect(tip('peace_ending').condition(w)).toBe(true);
    w.frameCount = 8000;
    expect(tip('peace_ending').condition(w)).toBe(false);
  });

  it('low_clams: fires when total deposits < 200', () => {
    const eid = addEntity(w.ecs);
    for (const c of [Health, IsResource, Resource]) addComponent(w.ecs, eid, c);
    Health.current[eid] = 100;
    Resource.resourceType[eid] = 1;
    Resource.amount[eid] = 150;
    w.frameCount = 700;
    expect(tip('low_clams').condition(w)).toBe(true);
  });

  it('no_armory: fires after frame 1200, not when armory exists', () => {
    w.frameCount = 1500;
    expect(tip('no_armory').condition(w)).toBe(true);
    addBuilding(w, EntityKind.Armory);
    expect(tip('no_armory').condition(w)).toBe(false);
  });

  it('army_weak: fires when enemies >> player, not when balanced', () => {
    for (let i = 0; i < 8; i++) addEnemy(w, EntityKind.Gator);
    addUnit(w, EntityKind.Brawler, UnitState.Idle);
    expect(tip('army_weak').condition(w)).toBe(true);
  });

  it('army_weak silent when balanced', () => {
    for (let i = 0; i < 3; i++) addEnemy(w, EntityKind.Gator);
    for (let i = 0; i < 3; i++) addUnit(w, EntityKind.Brawler, UnitState.Idle);
    expect(tip('army_weak').condition(w)).toBe(false);
  });

  it.each([
    'idle_gatherers_intro',
    'no_armory',
    'peace_ending',
    'research_available',
  ])('%s is oncePerGame', (id) => {
    expect(tip(id).oncePerGame).toBe(true);
  });

  it('repeatable tips lack oncePerGame flag', () => {
    expect(tip('idle_gatherers').oncePerGame).toBeUndefined();
  });

  it('all IDs unique, valid roles, positive cooldown/priority', () => {
    const ids = ADVISOR_TIPS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of ADVISOR_TIPS) {
      expect(['economy', 'war', 'builder']).toContain(t.advisor);
      expect(t.cooldown).toBeGreaterThan(0);
      expect(t.priority).toBeGreaterThan(0);
    }
  });
});
