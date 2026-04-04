/**
 * Wave-Survival Win Condition Tests
 *
 * Validates that:
 * - Stage 1 (no nests) uses wave-survival mode
 * - Game does NOT end instantly when no nests exist
 * - WIN triggers when waveNumber >= waveSurvivalTarget
 * - LOSE triggers when Lodge HP reaches 0
 * - Normal mode (nests exist) still uses nest-destruction win condition
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { healthSystem } from '@/ecs/systems/health';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

// Mock audio to avoid Tone.js initialization
vi.mock('@/audio/audio-system', () => ({
  audio: {
    win: vi.fn(),
    lose: vi.fn(),
    alert: vi.fn(),
    click: vi.fn(),
    deathBuilding: vi.fn(),
    deathRanged: vi.fn(),
    deathMelee: vi.fn(),
    tripleKill: vi.fn(),
    rampage: vi.fn(),
    unstoppable: vi.fn(),
    killFeedback: vi.fn(),
  },
}));

function createBuilding(
  world: GameWorld,
  kind: EntityKind,
  hp: number,
  faction: Faction,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, Carrying);

  Position.x[eid] = 200;
  Position.y[eid] = 200;
  Health.current[eid] = hp;
  Health.max[eid] = hp;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  UnitStateMachine.state[eid] = UnitState.Idle;
  Velocity.speed[eid] = 0;
  Collider.radius[eid] = 30;
  Combat.damage[eid] = 0;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

describe('wave-survival win condition', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    // Set frame count to a multiple of 60 so the win/lose check runs
    world.frameCount = 60;
  });

  describe('wave-survival mode (stage 1, no nests)', () => {
    beforeEach(() => {
      world.waveSurvivalMode = true;
      world.waveSurvivalTarget = 5;
      // Past peace timer so waves can be checked
      world.peaceTimer = 0;
    });

    it('should NOT trigger instant victory when no enemy nests exist', () => {
      createBuilding(world, EntityKind.Lodge, 500, Faction.Player);

      // No enemy nests in the world
      world.waveNumber = 0;

      healthSystem(world);

      expect(world.state).toBe('playing');
    });

    it('should remain playing when waves survived < target', () => {
      createBuilding(world, EntityKind.Lodge, 500, Faction.Player);
      world.waveNumber = 3; // less than target of 5

      healthSystem(world);

      expect(world.state).toBe('playing');
    });

    it('should trigger WIN when waves survived >= target', () => {
      createBuilding(world, EntityKind.Lodge, 500, Faction.Player);
      world.waveNumber = 5; // equals target

      healthSystem(world);

      expect(world.state).toBe('win');
    });

    it('should trigger WIN when waves exceed target', () => {
      createBuilding(world, EntityKind.Lodge, 500, Faction.Player);
      world.waveNumber = 7; // exceeds target

      healthSystem(world);

      expect(world.state).toBe('win');
    });

    it('should trigger LOSE when Lodge is destroyed', () => {
      createBuilding(world, EntityKind.Lodge, 0, Faction.Player);
      world.waveNumber = 2;

      healthSystem(world);

      expect(world.state).toBe('lose');
    });

    it('should NOT check wave victory during peace timer', () => {
      createBuilding(world, EntityKind.Lodge, 500, Faction.Player);
      world.peaceTimer = 999; // still in peace period
      world.waveNumber = 10; // enough waves

      healthSystem(world);

      expect(world.state).toBe('playing');
    });
  });

  describe('normal mode (nests exist)', () => {
    beforeEach(() => {
      world.waveSurvivalMode = false;
    });

    it('should trigger WIN when all enemy nests destroyed', () => {
      createBuilding(world, EntityKind.Lodge, 500, Faction.Player);
      // No PredatorNest alive -> should trigger win

      healthSystem(world);

      expect(world.state).toBe('win');
    });

    it('should keep playing when enemy nests still alive', () => {
      createBuilding(world, EntityKind.Lodge, 500, Faction.Player);
      createBuilding(world, EntityKind.PredatorNest, 200, Faction.Enemy);

      healthSystem(world);

      expect(world.state).toBe('playing');
    });

    it('should trigger LOSE when Lodge destroyed', () => {
      createBuilding(world, EntityKind.Lodge, 0, Faction.Player);
      createBuilding(world, EntityKind.PredatorNest, 200, Faction.Enemy);

      healthSystem(world);

      expect(world.state).toBe('lose');
    });
  });
});
