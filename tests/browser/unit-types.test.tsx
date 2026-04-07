/**
 * Browser roster tests
 *
 * Verifies the current player-facing roster rather than the removed
 * Gatherer/Brawler/Sniper-era split. This suite focuses on the canonical
 * manual roster plus Pearl specialists and checks a few live behaviors in the
 * browser-driven runtime.
 */

import { addComponent, addEntity, hasComponent, query } from 'bitecs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Building,
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  Selectable,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { spawnEntity } from '@/ecs/archetypes';
import { game } from '@/game';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { getEntityDisplayName } from '@/game/unit-display';
import { getSpecialistAssignment } from '@/game/specialist-assignment';
import { spawnSpecialistUnit } from '@/game/init-entities/specialist-spawn';
import '@/styles/main.css';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';
import { mountCurrentGame } from './helpers/mount-current-game';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFrames(frameCount: number) {
  const start = game.world.frameCount;
  while (game.world.frameCount - start < frameCount) {
    await delay(16);
  }
}

function getLiveEntities(kind?: EntityKind, faction = Faction.Player): number[] {
  return Array.from(query(game.world.ecs, [Position, Health, FactionTag, EntityTypeTag])).filter(
    (eid) =>
      FactionTag.faction[eid] === faction &&
      Health.current[eid] > 0 &&
      (kind == null || EntityTypeTag.kind[eid] === kind),
  );
}

function getPlayerLodge(): number {
  const lodge = getLiveEntities(EntityKind.Lodge, Faction.Player)[0];
  if (lodge == null) {
    throw new Error('Player Lodge not found');
  }
  return lodge;
}

function spawnTestUnit(
  kind: EntityKind,
  faction: Faction,
  x: number,
  y: number,
  target?: number,
): number {
  const eid = addEntity(game.world.ecs);
  const def = ENTITY_DEFS[kind];

  addComponent(game.world.ecs, eid, Position);
  addComponent(game.world.ecs, eid, Velocity);
  addComponent(game.world.ecs, eid, UnitStateMachine);
  addComponent(game.world.ecs, eid, Sprite);
  addComponent(game.world.ecs, eid, Collider);
  addComponent(game.world.ecs, eid, Health);
  addComponent(game.world.ecs, eid, Combat);
  addComponent(game.world.ecs, eid, EntityTypeTag);
  addComponent(game.world.ecs, eid, FactionTag);
  addComponent(game.world.ecs, eid, Carrying);
  addComponent(game.world.ecs, eid, Selectable);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.speed[eid] = def.speed;
  Velocity.speedDebuffTimer[eid] = 0;
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;
  Health.flashTimer[eid] = 0;
  Collider.radius[eid] = 10;
  EntityTypeTag.kind[eid] = kind;
  FactionTag.faction[eid] = faction;
  Combat.damage[eid] = def.damage;
  Combat.attackRange[eid] = def.attackRange;
  Combat.attackCooldown[eid] = 0;
  Combat.kills[eid] = 0;
  Carrying.resourceType[eid] = ResourceType.None;
  Carrying.resourceAmount[eid] = 0;
  Selectable.selected[eid] = 0;

  Sprite.textureId[eid] = kind;
  Sprite.width[eid] = def.spriteSize * def.spriteScale;
  Sprite.height[eid] = def.spriteSize * def.spriteScale;
  Sprite.facingLeft[eid] = 0;
  Sprite.yOffset[eid] = 0;

  UnitStateMachine.state[eid] = target == null ? UnitState.Idle : UnitState.AttackMove;
  UnitStateMachine.targetEntity[eid] = target ?? -1;
  UnitStateMachine.targetX[eid] = target == null ? x : Position.x[target];
  UnitStateMachine.targetY[eid] = target == null ? y : Position.y[target];
  UnitStateMachine.returnEntity[eid] = -1;
  UnitStateMachine.gatherTimer[eid] = 0;
  UnitStateMachine.hasAttackMoveTarget[eid] = 0;

  return eid;
}

function spawnCompleteBuilding(kind: EntityKind, faction: Faction, x: number, y: number): number {
  const eid = spawnEntity(game.world, kind, x, y, faction);
  if (hasComponent(game.world.ecs, eid, Building)) {
    Building.progress[eid] = 100;
    Health.current[eid] = Health.max[eid];
  }
  return eid;
}

let spawnOffset = 0;
function nextPos(): { x: number; y: number } {
  spawnOffset += 320;
  return { x: 240 + (spawnOffset % 1800), y: 320 + Math.floor(spawnOffset / 1800) * 240 };
}

describe('Browser roster tests', () => {
  beforeAll(async () => {
    await mountCurrentGame();
    await delay(1000);
    game.world.gameSpeed = 3;
    game.world.tech.sharpSticks = false;
    game.world.tech.swiftPaws = false;
    game.world.tech.eagleEye = false;
  }, 30_000);

  afterAll(() => {
    game.destroy();
  });

  describe('manual roster', () => {
    it('Mudpaw can gather from fish nodes and return with resources', async () => {
      const pos = nextPos();
      const mudpaw = spawnTestUnit(EntityKind.Gatherer, Faction.Player, pos.x, pos.y);
      const fishNode = spawnEntity(game.world, EntityKind.Clambed, pos.x + 60, pos.y, Faction.Neutral);

      expect(getEntityDisplayName(game.world, mudpaw)).toBe('Mudpaw');

      UnitStateMachine.targetEntity[mudpaw] = fishNode;
      UnitStateMachine.targetX[mudpaw] = Position.x[fishNode];
      UnitStateMachine.targetY[mudpaw] = Position.y[fishNode];
      UnitStateMachine.state[mudpaw] = UnitState.GatherMove;

      await waitFrames(120);

      expect([
        UnitState.GatherMove,
        UnitState.Gathering,
        UnitState.ReturnMove,
        UnitState.Idle,
      ]).toContain(UnitStateMachine.state[mudpaw]);
    });

    it('Mudpaw can enter BuildMove for incomplete structures', () => {
      const pos = nextPos();
      const mudpaw = spawnTestUnit(EntityKind.Gatherer, Faction.Player, pos.x, pos.y);
      const burrow = spawnCompleteBuilding(EntityKind.Burrow, Faction.Player, pos.x + 80, pos.y);

      Building.progress[burrow] = 10;
      Health.current[burrow] = 30;

      UnitStateMachine.targetEntity[mudpaw] = burrow;
      UnitStateMachine.targetX[mudpaw] = Position.x[burrow];
      UnitStateMachine.targetY[mudpaw] = Position.y[burrow];
      UnitStateMachine.state[mudpaw] = UnitState.BuildMove;

      expect(UnitStateMachine.state[mudpaw]).toBe(UnitState.BuildMove);
    });

    it('Medic heals nearby wounded allies in the live runtime', async () => {
      const pos = nextPos();
      const mudpaw = spawnTestUnit(EntityKind.Gatherer, Faction.Player, pos.x, pos.y);
      const medic = spawnTestUnit(EntityKind.Healer, Faction.Player, pos.x + 20, pos.y + 10);

      Health.current[mudpaw] = 10;
      expect(getEntityDisplayName(game.world, medic)).toBe('Medic');

      await waitFrames(180);

      expect(Health.current[mudpaw]).toBeGreaterThan(10);
    });

    it('Sapper occupies the heavy manual roster slot with live stats', () => {
      const pos = nextPos();
      const sapper = spawnTestUnit(EntityKind.Sapper, Faction.Player, pos.x, pos.y);
      const mudpaw = spawnTestUnit(EntityKind.Gatherer, Faction.Player, pos.x + 40, pos.y);

      expect(getEntityDisplayName(game.world, sapper)).toBe('Sapper');
      expect(Health.current[sapper]).toBe(ENTITY_DEFS[EntityKind.Sapper].hp);
      expect(Combat.damage[sapper]).toBe(ENTITY_DEFS[EntityKind.Sapper].damage);
      expect(Combat.damage[sapper]).toBeGreaterThan(Combat.damage[mudpaw]);
      expect(Velocity.speed[sapper]).toBe(ENTITY_DEFS[EntityKind.Sapper].speed);
    });

    it('Saboteur stays on the canonical manual roster with its live stats', () => {
      const pos = nextPos();
      const saboteur = spawnTestUnit(EntityKind.Saboteur, Faction.Player, pos.x, pos.y);

      expect(getEntityDisplayName(game.world, saboteur)).toBe('Saboteur');
      expect(Health.current[saboteur]).toBe(ENTITY_DEFS[EntityKind.Saboteur].hp);
      expect(Velocity.speed[saboteur]).toBe(ENTITY_DEFS[EntityKind.Saboteur].speed);
      expect(Combat.damage[saboteur]).toBeGreaterThan(0);
    });
  });

  describe('Pearl specialists', () => {
    it('Fisher spawns as a labeled single-zone specialist', () => {
      const lodge = getPlayerLodge();
      const lodgeX = Position.x[lodge];
      const lodgeY = Position.y[lodge];
      const fisher = spawnSpecialistUnit(game.world, 'fisher', lodge, lodgeX - 120, lodgeY + 40, 'blueprint');

      expect(fisher).not.toBeNull();
      expect(getEntityDisplayName(game.world, fisher!)).toBe('Fisher');

      const assignment = getSpecialistAssignment(game.world, fisher!);
      expect(assignment).toMatchObject({
        label: 'Fisher',
        mode: 'single_zone',
        canonicalId: 'fisher',
      });
      expect((assignment?.operatingRadius ?? 0)).toBeGreaterThan(0);
    });

    it('Guard spawns as the autonomous infantry specialist', () => {
      const lodge = getPlayerLodge();
      const lodgeX = Position.x[lodge];
      const lodgeY = Position.y[lodge];
      const guard = spawnSpecialistUnit(game.world, 'guard', lodge, lodgeX + 120, lodgeY + 30, 'blueprint');

      expect(guard).not.toBeNull();
      expect(getEntityDisplayName(game.world, guard!)).toBe('Guard');
      expect(getSpecialistAssignment(game.world, guard!)?.mode).toBe('single_zone');
    });

    it('Ranger and Bombardier use dual-zone assignment profiles', () => {
      const lodge = getPlayerLodge();
      const lodgeX = Position.x[lodge];
      const lodgeY = Position.y[lodge];
      const ranger = spawnSpecialistUnit(game.world, 'ranger', lodge, lodgeX - 160, lodgeY + 50, 'blueprint');
      const bombardier = spawnSpecialistUnit(
        game.world,
        'bombardier',
        lodge,
        lodgeX + 160,
        lodgeY + 50,
        'blueprint',
      );

      const rangerAssignment = getSpecialistAssignment(game.world, ranger!);
      const bombardierAssignment = getSpecialistAssignment(game.world, bombardier!);

      expect(rangerAssignment?.mode).toBe('dual_zone');
      expect(rangerAssignment?.projectionRange).toBeGreaterThan(0);
      expect(bombardierAssignment?.mode).toBe('dual_zone');
      expect(bombardierAssignment?.projectionRange).toBeGreaterThan(0);
    });

    it('Shaman remains a labeled support specialist with healing stats', () => {
      const lodge = getPlayerLodge();
      const lodgeX = Position.x[lodge];
      const lodgeY = Position.y[lodge];
      const shaman = spawnSpecialistUnit(game.world, 'shaman', lodge, lodgeX, lodgeY + 70, 'blueprint');

      expect(shaman).not.toBeNull();
      expect(getEntityDisplayName(game.world, shaman!)).toBe('Shaman');
      expect(getSpecialistAssignment(game.world, shaman!)?.mode).toBe('single_zone');
      expect(Combat.damage[shaman!]).toBe(0);
    });
  });
});
