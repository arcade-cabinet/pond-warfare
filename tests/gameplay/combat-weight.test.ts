/**
 * Combat Weight & Impact Tests
 *
 * Validates: target recoil, differentiated projectile sounds,
 * death spectacle, and kill streak escalation audio.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  ProjectileData,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { spawnProjectile } from '@/ecs/systems/projectile';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import type { SpecialistAssignment } from '@/game/specialist-assignment';
import { EntityKind, Faction, UnitState } from '@/types';

// Mock audio to track calls
vi.mock('@/audio/audio-system', () => ({
  audio: {
    hit: vi.fn(),
    shoot: vi.fn(),
    sniperShoot: vi.fn(),
    sniperHit: vi.fn(),
    catapultShoot: vi.fn(),
    catapultImpact: vi.fn(),
    towerShoot: vi.fn(),
    towerHit: vi.fn(),
    deathUnit: vi.fn(),
    deathBuilding: vi.fn(),
    deathMelee: vi.fn(),
    deathRanged: vi.fn(),
    tripleKill: vi.fn(),
    rampage: vi.fn(),
    unstoppable: vi.fn(),
    combatStinger: vi.fn(),
    playSelectionVoice: vi.fn(),
    playCommandVoice: vi.fn(),
    alert: vi.fn(),
    ping: vi.fn(),
  },
}));

// Mock animations
vi.mock('@/rendering/animations', () => ({
  triggerHitRecoil: vi.fn(),
  triggerAttackLunge: vi.fn(),
  triggerCommandPulse: vi.fn(),
  triggerSpawnPop: vi.fn(),
  cleanupEntityAnimation: vi.fn(),
}));

function createUnit(
  world: GameWorld,
  kind: EntityKind,
  faction: Faction,
  hp = 100,
  x = 100,
  y = 100,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, UnitStateMachine);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp;
  Health.max[eid] = hp;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  Combat.damage[eid] = 10;
  Combat.attackRange[eid] = 50;
  Sprite.width[eid] = 32;
  Sprite.height[eid] = 32;
  Velocity.speed[eid] = 2;
  UnitStateMachine.state[eid] = UnitState.Idle;

  return eid;
}

describe('Combat weight – projectile sourceKind', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
  });

  it('spawnProjectile stores sourceKind on the projectile entity', () => {
    const target = createUnit(world, EntityKind.Brawler, Faction.Enemy);
    const proj = spawnProjectile(world, 0, 0, 100, 100, target, 10, -1, 1.0, EntityKind.Sniper);
    expect(ProjectileData.sourceKind[proj]).toBe(EntityKind.Sniper);
  });

  it('spawnProjectile defaults sourceKind to -1 when not specified', () => {
    const target = createUnit(world, EntityKind.Brawler, Faction.Enemy);
    const proj = spawnProjectile(world, 0, 0, 100, 100, target, 10, -1);
    expect(ProjectileData.sourceKind[proj]).toBe(-1);
  });

  it('catapult projectile stores EntityKind.Catapult as sourceKind', () => {
    const target = createUnit(world, EntityKind.Brawler, Faction.Enemy);
    const proj = spawnProjectile(world, 0, 0, 100, 100, target, 10, -1, 1.0, EntityKind.Catapult);
    expect(ProjectileData.sourceKind[proj]).toBe(EntityKind.Catapult);
  });

  it('tower projectile stores EntityKind.Tower as sourceKind', () => {
    const target = createUnit(world, EntityKind.Brawler, Faction.Enemy);
    const proj = spawnProjectile(world, 0, 0, 100, 100, target, 10, -1, 1.0, EntityKind.Tower);
    expect(ProjectileData.sourceKind[proj]).toBe(EntityKind.Tower);
  });
});

describe('Combat weight – target recoil on hit', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
    vi.clearAllMocks();
  });

  it('triggerHitRecoil is called when a non-building unit takes damage', async () => {
    const { triggerHitRecoil } = await import('@/rendering/animations');
    const { takeDamage } = await import('@/ecs/systems/health/take-damage');

    const attacker = createUnit(world, EntityKind.Brawler, Faction.Enemy, 100, 80, 100);
    const target = createUnit(world, EntityKind.Brawler, Faction.Player, 100, 120, 100);

    takeDamage(world, target, 10, attacker);

    expect(triggerHitRecoil).toHaveBeenCalledWith(target, 80, 100, 120, 100);
  });

  it('triggerHitRecoil is NOT called on buildings', async () => {
    const { triggerHitRecoil } = await import('@/rendering/animations');
    const { takeDamage } = await import('@/ecs/systems/health/take-damage');

    const attacker = createUnit(world, EntityKind.Brawler, Faction.Enemy, 100, 80, 100);
    const building = createUnit(world, EntityKind.Tower, Faction.Player, 200, 120, 100);
    addComponent(world.ecs, building, IsBuilding);

    (triggerHitRecoil as ReturnType<typeof vi.fn>).mockClear();
    takeDamage(world, building, 10, attacker);

    expect(triggerHitRecoil).not.toHaveBeenCalled();
  });
});

describe('Combat weight – differentiated death sounds', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
    vi.clearAllMocks();
  });

  it('melee unit death plays deathMelee', async () => {
    const { audio } = await import('@/audio/audio-system');
    const { processDeath } = await import('@/ecs/systems/health/death');

    const eid = createUnit(world, EntityKind.Brawler, Faction.Player, 1);
    Health.current[eid] = 0;
    processDeath(world, eid);

    expect(audio.deathMelee).toHaveBeenCalled();
    expect(audio.deathRanged).not.toHaveBeenCalled();
  });

  it('ranged unit death plays deathRanged', async () => {
    const { audio } = await import('@/audio/audio-system');
    const { processDeath } = await import('@/ecs/systems/health/death');

    const eid = createUnit(world, EntityKind.Sniper, Faction.Player, 1);
    Health.current[eid] = 0;
    processDeath(world, eid);

    expect(audio.deathRanged).toHaveBeenCalled();
    expect(audio.deathMelee).not.toHaveBeenCalled();
  });

  it('building death plays deathBuilding and shakes screen', async () => {
    const { audio } = await import('@/audio/audio-system');
    const { processDeath } = await import('@/ecs/systems/health/death');

    const eid = createUnit(world, EntityKind.Tower, Faction.Player, 1);
    addComponent(world.ecs, eid, IsBuilding);
    Health.current[eid] = 0;
    processDeath(world, eid);

    expect(audio.deathBuilding).toHaveBeenCalled();
    expect(world.shakeTimer).toBeGreaterThanOrEqual(20);
  });

  it('death spawns unit name floating text for non-building units', async () => {
    const { processDeath } = await import('@/ecs/systems/health/death');

    const eid = createUnit(world, EntityKind.Brawler, Faction.Enemy, 1);
    Health.current[eid] = 0;
    const textsBefore = world.floatingTexts.length;
    processDeath(world, eid);

    const deathTexts = world.floatingTexts.slice(textsBefore);
    const nameText = deathTexts.find((t) => t.color === '#ef4444' && !t.text.startsWith('-'));
    expect(nameText).toBeDefined();
  });

  it('death text uses the specialist assignment label when present', async () => {
    const { processDeath } = await import('@/ecs/systems/health/death');

    const eid = createUnit(world, EntityKind.Sapper, Faction.Player, 1);
    const assignment: SpecialistAssignment = {
      runtimeId: 'guard',
      canonicalId: 'guard',
      label: 'Guard',
      mode: 'single_zone',
      operatingRadius: 140,
      centerX: 100,
      centerY: 100,
      anchorX: 100,
      anchorY: 100,
      anchorRadius: 0,
      engagementRadius: 0,
      engagementX: 100,
      engagementY: 100,
      projectionRange: 0,
    };
    world.specialistAssignments.set(eid, assignment);
    Health.current[eid] = 0;

    const textsBefore = world.floatingTexts.length;
    processDeath(world, eid);

    const deathTexts = world.floatingTexts.slice(textsBefore);
    expect(deathTexts.some((t) => t.text === 'Guard')).toBe(true);
  });
});

describe('Combat weight – kill streak escalation audio', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 100;
    vi.clearAllMocks();
  });

  it('3-kill streak plays tripleKill audio', async () => {
    const { audio } = await import('@/audio/audio-system');
    const { processDeath } = await import('@/ecs/systems/health/death');

    // Create attacker (player)
    const attacker = createUnit(world, EntityKind.Brawler, Faction.Player, 100, 200, 200);

    // Kill 3 enemies in quick succession
    for (let i = 0; i < 3; i++) {
      const enemy = createUnit(world, EntityKind.Gator, Faction.Enemy, 1, 100, 100 + i * 10);
      Health.current[enemy] = 0;
      world.frameCount = 100 + i;
      processDeath(world, enemy, attacker);
    }

    expect(audio.tripleKill).toHaveBeenCalled();
  });

  it('5-kill streak plays rampage audio', async () => {
    const { audio } = await import('@/audio/audio-system');
    const { processDeath } = await import('@/ecs/systems/health/death');

    const attacker = createUnit(world, EntityKind.Brawler, Faction.Player, 100, 200, 200);

    for (let i = 0; i < 5; i++) {
      const enemy = createUnit(world, EntityKind.Gator, Faction.Enemy, 1, 100, 100 + i * 10);
      Health.current[enemy] = 0;
      world.frameCount = 100 + i;
      processDeath(world, enemy, attacker);
    }

    expect(audio.rampage).toHaveBeenCalled();
  });

  it('10-kill streak plays unstoppable audio and shows floating text', async () => {
    const { audio } = await import('@/audio/audio-system');
    const { processDeath } = await import('@/ecs/systems/health/death');

    const attacker = createUnit(world, EntityKind.Brawler, Faction.Player, 100, 200, 200);

    for (let i = 0; i < 10; i++) {
      const enemy = createUnit(world, EntityKind.Gator, Faction.Enemy, 1, 100, 100 + i * 10);
      Health.current[enemy] = 0;
      world.frameCount = 100 + i;
      processDeath(world, enemy, attacker);
    }

    expect(audio.unstoppable).toHaveBeenCalled();
    const unstoppableText = world.floatingTexts.find((t) => t.text === 'UNSTOPPABLE!');
    expect(unstoppableText).toBeDefined();
    expect(unstoppableText?.color).toBe('#f97316');
  });
});
