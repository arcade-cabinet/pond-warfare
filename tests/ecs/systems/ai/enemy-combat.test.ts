/**
 * Enemy Combat System Tests
 *
 * Validates attack decisions, target selection (weakest building),
 * retreat logic for damaged units, peace timer gating, and threshold
 * behavior.
 *
 * NOTE: bitECS SoA components are global typed arrays, so entities from
 * parallel test files can pollute queries. We mock audio to prevent
 * side-effects and use generous army sizes to be resilient.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { ENEMY_ATTACK_CHECK_INTERVAL, ENEMY_RETREAT_HP_PERCENT } from '@/constants';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { enemyCombatTick } from '@/ecs/systems/ai/enemy-combat';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

// Mock audio to prevent side-effects during tests
vi.mock('@/audio/audio-system', () => ({
  audio: {
    alert: vi.fn(),
    hit: vi.fn(),
    shoot: vi.fn(),
    selectUnit: vi.fn(),
  },
}));

// Mock rendering animations to prevent side-effects
vi.mock('@/rendering/animations', () => ({
  triggerSpawnPop: vi.fn(),
}));

// Mock particles to prevent side-effects
vi.mock('@/utils/particles', () => ({
  spawnDustBurst: vi.fn(),
}));

/** Create a completed enemy nest. */
function createEnemyNest(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);

  const def = ENTITY_DEFS[EntityKind.PredatorNest];
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = EntityKind.PredatorNest;
  Building.progress[eid] = 100;

  return eid;
}

/** Create an enemy combat unit. */
function createEnemyCombatUnit(
  world: GameWorld,
  kind: EntityKind,
  x: number,
  y: number,
  state: UnitState = UnitState.Idle,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Velocity);

  const def = ENTITY_DEFS[kind];
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = kind;
  UnitStateMachine.state[eid] = state;
  Velocity.speed[eid] = def.speed;

  return eid;
}

/** Create a player building (target for attacks). */
function createPlayerBuilding(
  world: GameWorld,
  kind: EntityKind,
  x: number,
  y: number,
  hp?: number,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);

  const def = ENTITY_DEFS[kind];
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp ?? def.hp;
  Health.max[eid] = def.hp;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Building.progress[eid] = 100;

  return eid;
}

describe('enemyCombatTick', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.peaceTimer = 0;
    world.difficulty = 'normal';
  });

  describe('peace timer gating', () => {
    it('should not attack during peace period', () => {
      world.peaceTimer = ENEMY_ATTACK_CHECK_INTERVAL + 100;
      world.frameCount = ENEMY_ATTACK_CHECK_INTERVAL;

      createEnemyNest(world, 1000, 1000);
      createPlayerBuilding(world, EntityKind.Lodge, 200, 200);

      const units: number[] = [];
      for (let i = 0; i < 15; i++) {
        units.push(createEnemyCombatUnit(world, EntityKind.Gator, 1000 + i * 10, 1000));
      }

      enemyCombatTick(world);

      // All units should remain idle
      const attackingCount = units.filter(
        (eid) => UnitStateMachine.state[eid] === UnitState.AttackMove,
      ).length;
      expect(attackingCount).toBe(0);
    });
  });

  describe('attack decisions', () => {
    it('should attack when army exceeds threshold', () => {
      world.frameCount = ENEMY_ATTACK_CHECK_INTERVAL;

      createEnemyNest(world, 1000, 1000);
      createPlayerBuilding(world, EntityKind.Lodge, 200, 200);

      // Create well above threshold idle units
      const units: number[] = [];
      for (let i = 0; i < 15; i++) {
        units.push(createEnemyCombatUnit(world, EntityKind.Gator, 1000 + i * 10, 1000));
      }

      enemyCombatTick(world);

      const attackingCount = units.filter(
        (eid) => UnitStateMachine.state[eid] === UnitState.AttackMove,
      ).length;
      expect(attackingCount).toBeGreaterThan(0);
    });

    it('should not attack when army is below threshold', () => {
      world.frameCount = ENEMY_ATTACK_CHECK_INTERVAL;

      createEnemyNest(world, 1000, 1000);
      createPlayerBuilding(world, EntityKind.Lodge, 200, 200);

      // Create only 1 unit -- below any attack threshold
      const unit = createEnemyCombatUnit(world, EntityKind.Gator, 1000, 1000);

      enemyCombatTick(world);

      expect(UnitStateMachine.state[unit]).toBe(UnitState.Idle);
    });

    it('should not attack when no player buildings exist', () => {
      world.frameCount = ENEMY_ATTACK_CHECK_INTERVAL;

      createEnemyNest(world, 1000, 1000);
      // No player buildings

      const units: number[] = [];
      for (let i = 0; i < 15; i++) {
        units.push(createEnemyCombatUnit(world, EntityKind.Gator, 1000 + i * 10, 1000));
      }

      enemyCombatTick(world);

      // All units should remain idle since there is no target
      const attackingCount = units.filter(
        (eid) => UnitStateMachine.state[eid] === UnitState.AttackMove,
      ).length;
      expect(attackingCount).toBe(0);
    });

    it('should only send idle units to attack', () => {
      world.frameCount = ENEMY_ATTACK_CHECK_INTERVAL;

      createEnemyNest(world, 1000, 1000);
      createPlayerBuilding(world, EntityKind.Lodge, 200, 200);

      // Create some idle and some already-attacking units
      const idleUnits: number[] = [];
      for (let i = 0; i < 10; i++) {
        idleUnits.push(createEnemyCombatUnit(world, EntityKind.Gator, 1000 + i * 10, 1000));
      }
      const attackingUnit = createEnemyCombatUnit(
        world,
        EntityKind.Gator,
        1000,
        1050,
        UnitState.Attacking,
      );

      enemyCombatTick(world);

      // The already-attacking unit should stay in its current state
      // (the combat system might change it, but enemyCombatTick only mobilizes idle units)
      expect(UnitStateMachine.state[attackingUnit]).toBe(UnitState.Attacking);
    });
  });

  describe('target weakest building', () => {
    it('should target the weakest player building', () => {
      world.frameCount = ENEMY_ATTACK_CHECK_INTERVAL;

      createEnemyNest(world, 1000, 1000);

      // Create two buildings: one full HP, one damaged
      createPlayerBuilding(world, EntityKind.Lodge, 200, 200); // Full HP
      const weakBuilding = createPlayerBuilding(world, EntityKind.Tower, 400, 400, 10); // Low HP

      const units: number[] = [];
      for (let i = 0; i < 15; i++) {
        units.push(createEnemyCombatUnit(world, EntityKind.Gator, 1000 + i * 10, 1000));
      }

      enemyCombatTick(world);

      // At least one attacking unit should be targeting the weak building
      const attackingUnits = units.filter(
        (eid) => UnitStateMachine.state[eid] === UnitState.AttackMove,
      );
      expect(attackingUnits.length).toBeGreaterThan(0);

      // All attacking units should target the same entity (weakest building)
      const targetEntity = UnitStateMachine.targetEntity[attackingUnits[0]];
      expect(targetEntity).toBe(weakBuilding);
    });
  });

  describe('retreat logic', () => {
    it('should retreat units below HP threshold', () => {
      // Retreat logic runs every 60 frames
      world.frameCount = 60;

      createEnemyNest(world, 1000, 1000);

      const damagedUnit = createEnemyCombatUnit(
        world,
        EntityKind.Gator,
        200,
        200,
        UnitState.Attacking,
      );
      const maxHp = Health.max[damagedUnit];
      Health.current[damagedUnit] = Math.floor(maxHp * (ENEMY_RETREAT_HP_PERCENT - 0.01));

      enemyCombatTick(world);

      expect(UnitStateMachine.state[damagedUnit]).toBe(UnitState.Move);
    });

    it('should not retreat units above HP threshold', () => {
      world.frameCount = 60;

      createEnemyNest(world, 1000, 1000);

      const healthyUnit = createEnemyCombatUnit(
        world,
        EntityKind.Gator,
        200,
        200,
        UnitState.Attacking,
      );
      // Keep at full HP (well above 20%)

      enemyCombatTick(world);

      // Should stay in Attacking state, not retreat
      expect(UnitStateMachine.state[healthyUnit]).toBe(UnitState.Attacking);
    });

    it('should retreat to nearest nest', () => {
      world.frameCount = 60;

      // Two nests at different distances
      const nearNest = createEnemyNest(world, 300, 300);
      createEnemyNest(world, 2000, 2000); // Far nest

      const damagedUnit = createEnemyCombatUnit(
        world,
        EntityKind.Gator,
        200,
        200,
        UnitState.AttackMove,
      );
      const maxHp = Health.max[damagedUnit];
      Health.current[damagedUnit] = Math.floor(maxHp * (ENEMY_RETREAT_HP_PERCENT - 0.05));

      enemyCombatTick(world);

      // Should retreat toward the near nest
      expect(UnitStateMachine.state[damagedUnit]).toBe(UnitState.Move);
      expect(UnitStateMachine.targetX[damagedUnit]).toBe(Position.x[nearNest]);
      expect(UnitStateMachine.targetY[damagedUnit]).toBe(Position.y[nearNest]);
    });

    it('should not retreat idle units even if damaged', () => {
      world.frameCount = 60;

      createEnemyNest(world, 1000, 1000);

      const idleDamaged = createEnemyCombatUnit(world, EntityKind.Gator, 200, 200, UnitState.Idle);
      const maxHp = Health.max[idleDamaged];
      Health.current[idleDamaged] = Math.floor(maxHp * 0.1);

      enemyCombatTick(world);

      // Idle units should not trigger retreat (only Attacking/AttackMove)
      expect(UnitStateMachine.state[idleDamaged]).toBe(UnitState.Idle);
    });

    it('should not retreat when no nests exist', () => {
      world.frameCount = 60;

      // No nests created
      const damagedUnit = createEnemyCombatUnit(
        world,
        EntityKind.Gator,
        200,
        200,
        UnitState.Attacking,
      );
      const _maxHp = Health.max[damagedUnit];
      Health.current[damagedUnit] = 1;

      enemyCombatTick(world);

      // No nest to retreat to -- should stay in current state
      expect(UnitStateMachine.state[damagedUnit]).toBe(UnitState.Attacking);
    });
  });

  describe('attack interval', () => {
    it('should not check for attacks off-interval', () => {
      world.frameCount = ENEMY_ATTACK_CHECK_INTERVAL + 1;

      createEnemyNest(world, 1000, 1000);
      createPlayerBuilding(world, EntityKind.Lodge, 200, 200);

      const units: number[] = [];
      for (let i = 0; i < 15; i++) {
        units.push(createEnemyCombatUnit(world, EntityKind.Gator, 1000 + i * 10, 1000));
      }

      enemyCombatTick(world);

      // Attack decision only runs on exact interval -- units should stay idle
      // (retreat may still run on frame 601 if 601 % 60 === 1, which it does not)
      const attackingCount = units.filter(
        (eid) => UnitStateMachine.state[eid] === UnitState.AttackMove,
      ).length;
      expect(attackingCount).toBe(0);
    });
  });

  describe('difficulty scaling', () => {
    it('should have lower attack threshold on hard difficulty', () => {
      world.difficulty = 'hard';
      world.frameCount = ENEMY_ATTACK_CHECK_INTERVAL;

      createEnemyNest(world, 1000, 1000);
      createPlayerBuilding(world, EntityKind.Lodge, 200, 200);

      // On hard, baseThreshold is 3 and min idle to send is Math.min(5,3)=3
      // Create 5 idle units (enough for hard but not enough for normal=5)
      const units: number[] = [];
      for (let i = 0; i < 5; i++) {
        units.push(createEnemyCombatUnit(world, EntityKind.Gator, 1000 + i * 10, 1000));
      }

      enemyCombatTick(world);

      const attackingCount = units.filter(
        (eid) => UnitStateMachine.state[eid] === UnitState.AttackMove,
      ).length;
      expect(attackingCount).toBeGreaterThan(0);
    });

    it('should have higher attack threshold on easy difficulty', () => {
      world.difficulty = 'easy';
      world.frameCount = ENEMY_ATTACK_CHECK_INTERVAL;

      createEnemyNest(world, 1000, 1000);
      createPlayerBuilding(world, EntityKind.Lodge, 200, 200);

      // On easy, baseThreshold is 8. Create only 4 units.
      const units: number[] = [];
      for (let i = 0; i < 4; i++) {
        units.push(createEnemyCombatUnit(world, EntityKind.Gator, 1000 + i * 10, 1000));
      }

      enemyCombatTick(world);

      // Below easy threshold: should not attack
      const attackingCount = units.filter(
        (eid) => UnitStateMachine.state[eid] === UnitState.AttackMove,
      ).length;
      expect(attackingCount).toBe(0);
    });
  });

  describe('wave announcement', () => {
    it('should add floating text and ground ping when attacking', () => {
      world.frameCount = ENEMY_ATTACK_CHECK_INTERVAL;

      createEnemyNest(world, 1000, 1000);
      createPlayerBuilding(world, EntityKind.Lodge, 200, 200);

      for (let i = 0; i < 15; i++) {
        createEnemyCombatUnit(world, EntityKind.Gator, 1000 + i * 10, 1000);
      }

      const textsBefore = world.floatingTexts.length;
      const pingsBefore = world.groundPings.length;

      enemyCombatTick(world);

      expect(world.floatingTexts.length).toBeGreaterThan(textsBefore);
      expect(world.groundPings.length).toBeGreaterThan(pingsBefore);
    });
  });
});
