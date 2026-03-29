/**
 * Evolution System
 *
 * Tracks enemy faction evolution over time, unlocking progressively
 * stronger enemy unit types as the game progresses. Each tier introduces
 * a new threat that forces the player to adapt their strategy.
 *
 * Tier 0: Gator + Snake (base enemies)
 * Tier 1: Armored Gator (tanky melee)
 * Tier 2: Venom Snake (poison DoT)
 * Tier 3: Swamp Drake (fast flanker)
 * Tier 4: Siege Turtle (anti-building)
 * Tier 5: Alpha Predator (hero enemy with damage aura)
 *
 * Also includes the Threat Escalation System for long games:
 * - Mega-waves every 5 minutes after peace ends
 * - Nest spawning ramp (production multiplier increases over time)
 * - Random events (predator migration, nest fury, alpha appearance)
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS, entityKindName } from '@/config/entity-defs';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { triggerSpawnPop } from '@/rendering/animations';
import { EntityKind, Faction, UnitState } from '@/types';
import { spawnParticle } from '@/utils/particles';
import { findPlayerLodge, getEnemyNests } from './ai/helpers';

/** Minutes after peace ends at which each evolution tier triggers. */
const THRESHOLDS = [5, 10, 15, 25, 40];

/** Order in which enemy unit types unlock, one per tier. */
const EVOLUTION_ORDER: EntityKind[] = [
  EntityKind.ArmoredGator, // Tier 1: tanky melee
  EntityKind.VenomSnake, // Tier 2: poison DoT
  EntityKind.SwampDrake, // Tier 3: fast flanker
  EntityKind.SiegeTurtle, // Tier 4: anti-building
  EntityKind.AlphaPredator, // Tier 5: hero enemy
];

/**
 * Checks for tier-up evolution, processes poison ticks, and applies alpha aura.
 * Evolution runs every 600 frames; poison and aura run every 60 frames.
 */
export function evolutionSystem(world: GameWorld): void {
  // --- Evolution tier-up check (every 600 frames, 10 seconds) ---
  if (world.frameCount % 600 === 0 && world.frameCount >= world.peaceTimer) {
    const evo = world.enemyEvolution;
    const currentTier = evo.tier;
    const gameMinutes = (world.frameCount - world.peaceTimer) / 3600; // minutes since peace ended

    const scaledThreshold = THRESHOLDS[currentTier] * world.evolutionSpeedMod;
    if (currentTier < THRESHOLDS.length && gameMinutes >= scaledThreshold) {
      // Evolve!
      evo.tier++;
      evo.lastEvolutionFrame = world.frameCount;

      const newUnit = EVOLUTION_ORDER[currentTier];
      evo.unlockedUnits.push(newUnit);

      // Announce evolution
      const name = entityKindName(newUnit);
      world.floatingTexts.push({
        x: world.camX + world.viewWidth / 2,
        y: world.camY + 60,
        text: `WARNING: ${name} spotted!`,
        color: '#ef4444',
        life: 180,
      });
      world.shakeTimer = Math.max(world.shakeTimer, 10);
      audio.alert();
    }
  }

  // --- Poison tick: apply 2 damage per second (every 60 frames) ---
  if (world.frameCount % 60 === 0) {
    for (const [eid, remaining] of world.poisonTimers) {
      if (!hasComponent(world.ecs, eid, Health) || Health.current[eid] <= 0) {
        world.poisonTimers.delete(eid);
        continue;
      }

      Health.current[eid] -= 2;
      Health.flashTimer[eid] = 4;

      // Green poison particles
      if (hasComponent(world.ecs, eid, Position)) {
        for (let i = 0; i < 3; i++) {
          spawnParticle(
            world,
            Position.x[eid] + (Math.random() - 0.5) * 10,
            Position.y[eid] - 5,
            (Math.random() - 0.5) * 1,
            -Math.random() * 1.5,
            15,
            '#22c55e',
            2,
          );
        }
      }

      if (remaining <= 1) {
        world.poisonTimers.delete(eid);
      } else {
        world.poisonTimers.set(eid, remaining - 1);
      }
    }
  }

  // --- Venom Coating poison tick: 1 damage per second (every 60 frames) ---
  if (world.frameCount % 60 === 0) {
    for (const [eid, remaining] of world.venomCoatingTimers) {
      if (!hasComponent(world.ecs, eid, Health) || Health.current[eid] <= 0) {
        world.venomCoatingTimers.delete(eid);
        continue;
      }

      Health.current[eid] -= 1;
      Health.flashTimer[eid] = 4;

      // Purple-green poison particles (lighter than VenomSnake)
      if (hasComponent(world.ecs, eid, Position)) {
        for (let i = 0; i < 2; i++) {
          spawnParticle(
            world,
            Position.x[eid] + (Math.random() - 0.5) * 8,
            Position.y[eid] - 5,
            (Math.random() - 0.5) * 0.8,
            -Math.random() * 1,
            12,
            '#66ee66',
            2,
          );
        }
      }

      if (remaining <= 1) {
        world.venomCoatingTimers.delete(eid);
      } else {
        world.venomCoatingTimers.set(eid, remaining - 1);
      }
    }
  }

  // --- Alpha Predator damage aura: +20% damage to nearby enemies ---
  if (world.frameCount % 60 === 0) {
    const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Combat]);

    // Find all living Alpha Predators
    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if (FactionTag.faction[eid] !== Faction.Enemy) continue;
      if (Health.current[eid] <= 0) continue;
      if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.AlphaPredator) continue;
      if (hasComponent(world.ecs, eid, IsBuilding)) continue;
      if (hasComponent(world.ecs, eid, IsResource)) continue;

      const ax = Position.x[eid];
      const ay = Position.y[eid];
      const auraRadius = 200;

      // Buff all nearby enemy units
      const candidates = world.spatialHash ? world.spatialHash.query(ax, ay, auraRadius) : allUnits;
      for (let j = 0; j < candidates.length; j++) {
        const t = candidates[j];
        if (t === eid) continue;
        if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] !== Faction.Enemy)
          continue;
        if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
        if (!hasComponent(world.ecs, t, Combat)) continue;
        if (hasComponent(world.ecs, t, IsBuilding)) continue;
        if (hasComponent(world.ecs, t, IsResource)) continue;

        const dx = Position.x[t] - ax;
        const dy = Position.y[t] - ay;
        if (Math.sqrt(dx * dx + dy * dy) <= auraRadius) {
          // Mark as buffed until next check (expires in 60 frames)
          world.alphaDamageBuff.set(t, world.frameCount + 60);
        }
      }
    }

    // Clean up expired buffs
    for (const [eid, expiry] of world.alphaDamageBuff) {
      if (world.frameCount > expiry) {
        world.alphaDamageBuff.delete(eid);
      }
    }
  }

  // --- Threat escalation (long-game systems) ---
  threatEscalationSystem(world);
}

// =========================================================================
// Threat Escalation System
// =========================================================================

/** Frames per 5-minute mega-wave interval (5 * 60 * 60 = 18000). */
const MEGA_WAVE_INTERVAL = 18000;

/** Frames per random event check (every 60 seconds). */
const RANDOM_EVENT_CHECK_INTERVAL = 3600;

/** Minimum frames between random events (~3 minutes). */
const RANDOM_EVENT_MIN_GAP = 10800;

/** Maximum frames between random events (~5 minutes). */
const RANDOM_EVENT_MAX_GAP = 18000;

/**
 * Threat escalation for long games. Runs inside evolutionSystem every 600 frames.
 *
 * - Mega-waves every 5 minutes (escalating intensity)
 * - Nest production ramp over time
 * - Random events every 3-5 minutes
 * - Swarm speed buff expiry
 */
function threatEscalationSystem(world: GameWorld): void {
  if (world.frameCount < world.peaceTimer) return;

  const evo = world.enemyEvolution;
  const framesSincePeace = world.frameCount - world.peaceTimer;

  // --- Nest production ramp ---
  // After 15 min (54000 frames): 2x, after 30 min: 3x, after 45 min: continuous
  if (framesSincePeace >= 162000) {
    // 45 min
    evo.nestProductionMultiplier = 5;
  } else if (framesSincePeace >= 108000) {
    // 30 min
    evo.nestProductionMultiplier = 3;
  } else if (framesSincePeace >= 54000) {
    // 15 min
    evo.nestProductionMultiplier = 2;
  } else {
    evo.nestProductionMultiplier = 1;
  }

  // --- Swarm speed buff expiry ---
  if (evo.swarmSpeedBuffExpiry > 0 && world.frameCount >= evo.swarmSpeedBuffExpiry) {
    evo.swarmSpeedBuffExpiry = 0;
  }

  // --- Mega-wave check (every 18000 frames = 5 min after peace) ---
  if (framesSincePeace >= MEGA_WAVE_INTERVAL) {
    const megaWaveNumber = Math.floor(framesSincePeace / MEGA_WAVE_INTERVAL);
    const expectedFrame = world.peaceTimer + megaWaveNumber * MEGA_WAVE_INTERVAL;

    // Trigger if we haven't fired this mega-wave yet
    if (evo.lastMegaWaveFrame < expectedFrame) {
      evo.lastMegaWaveFrame = world.frameCount;
      triggerMegaWave(world, megaWaveNumber);
    }
  }

  // --- Random events (check every 60s, fire every 3-5 min) ---
  if (world.frameCount % RANDOM_EVENT_CHECK_INTERVAL === 0 && framesSincePeace >= 10800) {
    const sinceLastEvent = world.frameCount - evo.lastRandomEventFrame;
    const gap =
      RANDOM_EVENT_MIN_GAP + Math.random() * (RANDOM_EVENT_MAX_GAP - RANDOM_EVENT_MIN_GAP);
    if (sinceLastEvent >= gap) {
      evo.lastRandomEventFrame = world.frameCount;
      triggerRandomEvent(world);
    }
  }
}

// =========================================================================
// Mega-Wave Logic
// =========================================================================

/**
 * Trigger a mega-wave based on the wave number (how many 5-min intervals
 * have elapsed since peace ended).
 *
 * Wave 1 (10 min): "Predator Assault" - 2x normal wave from ALL nests
 * Wave 2 (20 min): "Swarm" - 3x wave + all enemies get +10% speed for 60s
 * Wave 3 (30 min): "Siege" - includes SiegeTurtles targeting the Lodge
 * Wave 4+ (45 min+): "Alpha Strike" - AlphaPredator leads massive attack
 */
function triggerMegaWave(world: GameWorld, waveNumber: number): void {
  const nests = getEnemyNests(world);
  if (nests.length === 0) return;

  const lodgeEid = findPlayerLodge(world);

  let waveName: string;
  let spawnMultiplier: number;
  let includesSiege = false;
  let includesAlpha = false;
  let swarmSpeedBuff = false;

  if (waveNumber >= 9) {
    // 45+ min: Alpha Strike
    waveName = 'ALPHA STRIKE';
    spawnMultiplier = 4;
    includesAlpha = true;
    includesSiege = true;
  } else if (waveNumber >= 6) {
    // 30+ min: Siege
    waveName = 'SIEGE';
    spawnMultiplier = 3;
    includesSiege = true;
  } else if (waveNumber >= 4) {
    // 20+ min: Swarm
    waveName = 'SWARM';
    spawnMultiplier = 3;
    swarmSpeedBuff = true;
  } else {
    // 10+ min: Predator Assault
    waveName = 'PREDATOR ASSAULT';
    spawnMultiplier = 2;
  }

  // Announce
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 40,
    text: `MEGA-WAVE: ${waveName}!`,
    color: '#ef4444',
    life: 240,
  });
  world.shakeTimer = Math.max(world.shakeTimer, 20);
  audio.alert();

  // Spawn units from all nests
  let championsToMark = 2; // Mark up to 2 champions per mega-wave
  for (const nestEid of nests) {
    const nx = Position.x[nestEid];
    const ny = Position.y[nestEid];

    for (let i = 0; i < spawnMultiplier; i++) {
      // Pick from unlocked units
      const unitKind = pickRandomUnlocked(world.enemyEvolution.unlockedUnits);
      const sx = nx + (Math.random() - 0.5) * 80;
      const sy = ny + 30 + Math.random() * 20;

      const eid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
      if (eid < 0) continue;

      triggerSpawnPop(eid);
      spawnDustParticles(world, sx, sy);

      // Mark as champion (Part 4)
      if (championsToMark > 0 && i === 0) {
        markAsChampion(world, eid);
        championsToMark--;
      }

      // Send toward lodge or weakest building
      if (lodgeEid !== -1) {
        sendToTarget(world, eid, lodgeEid);
      }
    }

    // Siege wave: also spawn SiegeTurtles
    if (includesSiege && world.enemyEvolution.unlockedUnits.includes(EntityKind.SiegeTurtle)) {
      const sx = nx + (Math.random() - 0.5) * 60;
      const sy = ny + 30;
      const siegeEid = spawnEntity(world, EntityKind.SiegeTurtle, sx, sy, Faction.Enemy);
      if (siegeEid >= 0) {
        triggerSpawnPop(siegeEid);
        spawnDustParticles(world, sx, sy);
        if (lodgeEid !== -1) {
          sendToTarget(world, siegeEid, lodgeEid);
        }
      }
    }

    // Alpha Strike: spawn AlphaPredator from the first nest
    if (
      includesAlpha &&
      nestEid === nests[0] &&
      world.enemyEvolution.unlockedUnits.includes(EntityKind.AlphaPredator)
    ) {
      const sx = nx + (Math.random() - 0.5) * 60;
      const sy = ny + 30;
      const alphaEid = spawnEntity(world, EntityKind.AlphaPredator, sx, sy, Faction.Enemy);
      if (alphaEid >= 0) {
        triggerSpawnPop(alphaEid);
        spawnDustParticles(world, sx, sy);
        if (lodgeEid !== -1) {
          sendToTarget(world, alphaEid, lodgeEid);
        }
        world.floatingTexts.push({
          x: sx,
          y: sy - 40,
          text: 'ALPHA PREDATOR!',
          color: '#ef4444',
          life: 120,
        });
        world.minimapPings.push({ x: sx, y: sy, life: 180, maxLife: 180 });
      }
    }
  }

  // Swarm speed buff: apply +10% speed to all current enemy units for 60 seconds
  if (swarmSpeedBuff) {
    world.enemyEvolution.swarmSpeedBuffExpiry = world.frameCount + 3600;
    const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Velocity]);
    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if (FactionTag.faction[eid] !== Faction.Enemy) continue;
      if (hasComponent(world.ecs, eid, IsBuilding)) continue;
      if (hasComponent(world.ecs, eid, IsResource)) continue;
      if (Health.current[eid] <= 0) continue;
      Velocity.speed[eid] *= 1.1;
    }
  }
}

// =========================================================================
// Random Events
// =========================================================================

/**
 * Trigger a random threat event:
 * - "Predator Migration": 3-5 enemies spawn from a random map edge
 * - "Nest Fury": a random nest doubles production for 2 minutes (handled via timer)
 * - "Alpha Appearance": AlphaPredator spawns from fog, patrols toward player base
 */
function triggerRandomEvent(world: GameWorld): void {
  const roll = Math.random();
  const lodgeEid = findPlayerLodge(world);

  if (roll < 0.45) {
    // --- Predator Migration ---
    const count = 3 + Math.floor(Math.random() * 3); // 3-5
    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left

    world.floatingTexts.push({
      x: world.camX + world.viewWidth / 2,
      y: world.camY + 60,
      text: 'Predator Migration!',
      color: '#f59e0b',
      life: 180,
    });
    world.shakeTimer = Math.max(world.shakeTimer, 8);
    audio.alert();

    for (let i = 0; i < count; i++) {
      let sx: number, sy: number;
      switch (edge) {
        case 0: // top
          sx = 100 + Math.random() * (WORLD_WIDTH - 200);
          sy = 50;
          break;
        case 1: // right
          sx = WORLD_WIDTH - 50;
          sy = 100 + Math.random() * (WORLD_HEIGHT - 200);
          break;
        case 2: // bottom
          sx = 100 + Math.random() * (WORLD_WIDTH - 200);
          sy = WORLD_HEIGHT - 50;
          break;
        default: // left
          sx = 50;
          sy = 100 + Math.random() * (WORLD_HEIGHT - 200);
          break;
      }

      const unitKind = pickRandomUnlocked(world.enemyEvolution.unlockedUnits);
      const eid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
      if (eid < 0) continue;

      triggerSpawnPop(eid);

      // Head toward lodge or center
      if (lodgeEid !== -1) {
        sendToTarget(world, eid, lodgeEid);
      } else {
        const tx = WORLD_WIDTH / 2 + (Math.random() - 0.5) * 400;
        const ty = WORLD_HEIGHT / 2 + (Math.random() - 0.5) * 400;
        sendToPosition(world, eid, tx, ty);
      }
    }
  } else if (roll < 0.8) {
    // --- Nest Fury ---
    const nests = getEnemyNests(world);
    if (nests.length === 0) return;

    const targetNest = nests[Math.floor(Math.random() * nests.length)];
    const nx = Position.x[targetNest];
    const ny = Position.y[targetNest];

    world.floatingTexts.push({
      x: nx,
      y: ny - 40,
      text: 'Nest Fury!',
      color: '#f59e0b',
      life: 180,
    });
    world.minimapPings.push({ x: nx, y: ny, life: 180, maxLife: 180 });
    audio.alert();

    // Immediately spawn a burst of units (simulating fury)
    const burstCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < burstCount; i++) {
      const unitKind = pickRandomUnlocked(world.enemyEvolution.unlockedUnits);
      const sx = nx + (Math.random() - 0.5) * 60;
      const sy = ny + 30 + Math.random() * 20;
      const eid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
      if (eid < 0) continue;
      triggerSpawnPop(eid);
      spawnDustParticles(world, sx, sy);
    }
  } else {
    // --- Alpha Appearance ---
    if (!world.enemyEvolution.unlockedUnits.includes(EntityKind.AlphaPredator)) {
      // Fall back to predator migration if alpha not unlocked
      triggerRandomEvent(world);
      return;
    }

    // Spawn from a random map edge
    const edge = Math.floor(Math.random() * 4);
    let sx: number, sy: number;
    switch (edge) {
      case 0:
        sx = 100 + Math.random() * (WORLD_WIDTH - 200);
        sy = 50;
        break;
      case 1:
        sx = WORLD_WIDTH - 50;
        sy = 100 + Math.random() * (WORLD_HEIGHT - 200);
        break;
      case 2:
        sx = 100 + Math.random() * (WORLD_WIDTH - 200);
        sy = WORLD_HEIGHT - 50;
        break;
      default:
        sx = 50;
        sy = 100 + Math.random() * (WORLD_HEIGHT - 200);
        break;
    }

    const eid = spawnEntity(world, EntityKind.AlphaPredator, sx, sy, Faction.Enemy);
    if (eid < 0) return;

    triggerSpawnPop(eid);

    world.floatingTexts.push({
      x: world.camX + world.viewWidth / 2,
      y: world.camY + 60,
      text: 'Alpha Predator Spotted!',
      color: '#ef4444',
      life: 180,
    });
    world.shakeTimer = Math.max(world.shakeTimer, 12);
    world.minimapPings.push({ x: sx, y: sy, life: 180, maxLife: 180 });
    audio.alert();

    // Patrol toward lodge
    if (lodgeEid !== -1) {
      sendToTarget(world, eid, lodgeEid);
    }
  }
}

// =========================================================================
// Champion marking (Part 4)
// =========================================================================

/**
 * Mark an entity as a champion variant:
 * +50% HP, +25% damage, tracked in world.championEnemies.
 */
function markAsChampion(world: GameWorld, eid: number): void {
  world.championEnemies.add(eid);

  // Boost HP by 50%
  const hpBoost = Math.round(Health.max[eid] * 0.5);
  Health.max[eid] += hpBoost;
  Health.current[eid] += hpBoost;

  // Boost damage by 25%
  if (hasComponent(world.ecs, eid, Combat)) {
    Combat.damage[eid] = Math.round(Combat.damage[eid] * 1.25);
  }

  // Visual feedback
  world.floatingTexts.push({
    x: Position.x[eid],
    y: Position.y[eid] - 30,
    text: 'CHAMPION!',
    color: '#a855f7',
    life: 90,
  });
}

// =========================================================================
// Helpers
// =========================================================================

/** Pick a random unit kind from the unlocked list. */
function pickRandomUnlocked(unlockedUnits: EntityKind[]): EntityKind {
  return unlockedUnits[Math.floor(Math.random() * unlockedUnits.length)];
}

/** Send an entity to attack-move toward a target entity. */
function sendToTarget(world: GameWorld, eid: number, targetEid: number): void {
  UnitStateMachine.targetEntity[eid] = targetEid;
  UnitStateMachine.targetX[eid] = Position.x[targetEid];
  UnitStateMachine.targetY[eid] = Position.y[targetEid];
  UnitStateMachine.state[eid] = UnitState.AttackMove;

  const kind = EntityTypeTag.kind[eid] as EntityKind;
  const speed = Velocity.speed[eid] || ENTITY_DEFS[kind]?.speed || 1.5;
  world.yukaManager.addEnemy(
    eid,
    Position.x[eid],
    Position.y[eid],
    speed,
    Position.x[targetEid],
    Position.y[targetEid],
  );
}

/** Send an entity to attack-move toward a world position. */
function sendToPosition(world: GameWorld, eid: number, tx: number, ty: number): void {
  UnitStateMachine.targetX[eid] = tx;
  UnitStateMachine.targetY[eid] = ty;
  UnitStateMachine.state[eid] = UnitState.AttackMovePatrol;
  UnitStateMachine.hasAttackMoveTarget[eid] = 1;
  UnitStateMachine.attackMoveTargetX[eid] = tx;
  UnitStateMachine.attackMoveTargetY[eid] = ty;

  const kind = EntityTypeTag.kind[eid] as EntityKind;
  const speed = Velocity.speed[eid] || ENTITY_DEFS[kind]?.speed || 1.5;
  world.yukaManager.addEnemy(eid, Position.x[eid], Position.y[eid], speed, tx, ty);
}

/** Spawn dust particles around a spawn point. */
function spawnDustParticles(world: GameWorld, sx: number, sy: number): void {
  for (let j = 0; j < 6; j++) {
    const angle = (j / 6) * Math.PI * 2;
    world.particles.push({
      x: sx,
      y: sy + 8,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 0.5 + 0.5,
      life: 15,
      color: '#a8a29e',
      size: 2,
    });
  }
}
