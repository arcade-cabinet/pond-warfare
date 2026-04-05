/**
 * Random In-Game Events System
 *
 * Periodic random events that add variety to each game. Events fire every
 * 3-5 minutes (seeded from map seed for determinism). Each event lasts
 * 30-60 seconds and affects gameplay meaningfully but not game-breakingly.
 *
 * Event pool:
 * - Resource Surge: a random resource node doubles its remaining amount
 * - Migrating Fish: neutral fish spawn and wander
 * - Predator Frenzy: all enemies get +20% speed for 30 seconds
 * - Healing Spring: temporary healing zone heals nearby units
 * - Fog Bank: fog of war closes in by 30% for 60 seconds
 * - Supply Drop: fish + logs appear at a random explored location
 * - Earthquake: all buildings take 10% damage, screen shake
 * - Blessing of the Pond: all player units get +10% speed for 60 seconds
 */

import { query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { createWeatherRng } from '@/config/weather';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import { pushGameEvent } from '@/ui/game-events';

/** Minimum frames between game events (~3 minutes at 60fps). */
const EVENT_MIN_GAP = 10800;
/** Maximum frames between game events (~5 minutes). */
const EVENT_MAX_GAP = 18000;
/** How often to check if an event should fire (every 60 frames). */
const CHECK_INTERVAL = 60;

export type GameEventType =
  | 'resourceSurge'
  | 'migratingFish'
  | 'predatorFrenzy'
  | 'healingSpring'
  | 'fogBank'
  | 'supplyDrop'
  | 'earthquake'
  | 'blessingOfThePond';

const EVENT_POOL: GameEventType[] = [
  'resourceSurge',
  'migratingFish',
  'predatorFrenzy',
  'healingSpring',
  'fogBank',
  'supplyDrop',
  'earthquake',
  'blessingOfThePond',
];

/** Active timed effects from random events. */
export interface ActiveGameEvent {
  type: GameEventType;
  expiryFrame: number;
  /** For healing spring: zone center. */
  x?: number;
  y?: number;
}

/** Module-level state for the random events system. */
let lastEventFrame = 0;
let nextEventGap = EVENT_MIN_GAP;
const activeEvents: ActiveGameEvent[] = [];
/** Tracks original speeds for frenzy/blessing restoration. */
const speedBuffEntities = new Map<number, number>();

/** Reset event state (call when starting a new game). */
export function resetRandomEvents(): void {
  lastEventFrame = 0;
  nextEventGap = EVENT_MIN_GAP;
  activeEvents.length = 0;
  speedBuffEntities.clear();
}

/** Get active events (for testing). */
export function getActiveEvents(): readonly ActiveGameEvent[] {
  return activeEvents;
}

/** Main system tick — call every frame from systems runner. */
export function randomEventsSystem(world: GameWorld): void {
  if (world.state !== 'playing') return;
  if (world.frameCount < world.peaceTimer) return;

  // Process active event effects
  tickActiveEvents(world);

  // Check for new event
  if (world.frameCount % CHECK_INTERVAL !== 0) return;
  const sinceLastEvent = world.frameCount - lastEventFrame;
  if (sinceLastEvent < nextEventGap) return;

  // Fire event
  lastEventFrame = world.frameCount;
  const rng = createWeatherRng(world.mapSeed + world.frameCount);
  nextEventGap = EVENT_MIN_GAP + Math.floor(rng() * (EVENT_MAX_GAP - EVENT_MIN_GAP));
  const eventIdx = Math.floor(rng() * EVENT_POOL.length);
  executeEvent(world, EVENT_POOL[eventIdx], rng);
}

/** Pick a random event using seeded RNG (exported for testing). */
export function pickEvent(seed: number, frame: number): GameEventType {
  const rng = createWeatherRng(seed + frame);
  // consume one value for gap calculation (matches runtime)
  rng();
  return EVENT_POOL[Math.floor(rng() * EVENT_POOL.length)];
}

function executeEvent(world: GameWorld, type: GameEventType, rng: () => number): void {
  switch (type) {
    case 'resourceSurge':
      doResourceSurge(world, rng);
      break;
    case 'migratingFish':
      doMigratingFish(world, rng);
      break;
    case 'predatorFrenzy':
      doPredatorFrenzy(world);
      break;
    case 'healingSpring':
      doHealingSpring(world, rng);
      break;
    case 'fogBank':
      doFogBank(world);
      break;
    case 'supplyDrop':
      doSupplyDrop(world, rng);
      break;
    case 'earthquake':
      doEarthquake(world);
      break;
    case 'blessingOfThePond':
      doBlessingOfThePond(world);
      break;
  }
}

function announce(world: GameWorld, text: string, color: string): void {
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text,
    color,
    life: 180,
  });
  pushGameEvent(text, color, world.frameCount);
  audio.alert();
}

function doResourceSurge(world: GameWorld, rng: () => number): void {
  const resources = query(world.ecs, [IsResource, Resource, Health, Position]);
  const alive = resources.filter((eid) => Health.current[eid] > 0 && Resource.amount[eid] > 0);
  if (alive.length === 0) return;
  const target = alive[Math.floor(rng() * alive.length)];
  Resource.amount[target] *= 2;
  announce(world, 'The pond reveals hidden riches!', '#f59e0b');
  world.minimapPings.push({
    x: Position.x[target],
    y: Position.y[target],
    life: 180,
    maxLife: 180,
  });
}

function doMigratingFish(world: GameWorld, rng: () => number): void {
  const count = 5 + Math.floor(rng() * 4); // 5-8
  for (let i = 0; i < count; i++) {
    const x = 200 + rng() * (WORLD_WIDTH - 400);
    const y = 200 + rng() * (WORLD_HEIGHT - 400);
    spawnEntity(world, EntityKind.Fish, x, y, Faction.Neutral);
  }
  announce(world, 'A school of fish appears!', '#38bdf8');
}

function doPredatorFrenzy(world: GameWorld): void {
  const enemies = query(world.ecs, [Velocity, FactionTag, Health]);
  for (const eid of enemies) {
    if (FactionTag.faction[eid] !== Faction.Enemy || Health.current[eid] <= 0) continue;
    if (!speedBuffEntities.has(eid)) {
      speedBuffEntities.set(eid, Velocity.speed[eid]);
      Velocity.speed[eid] *= 1.2;
    }
  }
  activeEvents.push({ type: 'predatorFrenzy', expiryFrame: world.frameCount + 1800 });
  announce(world, 'The predators are agitated!', '#ef4444');
}

function doHealingSpring(world: GameWorld, rng: () => number): void {
  const x = 200 + rng() * (WORLD_WIDTH - 400);
  const y = 200 + rng() * (WORLD_HEIGHT - 400);
  activeEvents.push({ type: 'healingSpring', expiryFrame: world.frameCount + 1800, x, y });
  announce(world, 'A healing spring bubbles up!', '#4ade80');
  world.minimapPings.push({ x, y, life: 180, maxLife: 180 });
}

function doFogBank(world: GameWorld): void {
  activeEvents.push({ type: 'fogBank', expiryFrame: world.frameCount + 3600 });
  announce(world, 'A thick fog rolls in...', '#94a3b8');
}

function doSupplyDrop(world: GameWorld, rng: () => number): void {
  world.resources.fish += 100;
  world.resources.logs += 50;
  const x = world.camX + rng() * world.viewWidth;
  const y = world.camY + rng() * world.viewHeight;
  announce(world, 'Supplies wash ashore!', '#a78bfa');
  world.minimapPings.push({ x, y, life: 180, maxLife: 180 });
}

function doEarthquake(world: GameWorld): void {
  const buildings = query(world.ecs, [IsBuilding, Health, Position]);
  for (const eid of buildings) {
    if (Health.current[eid] <= 0) continue;
    const dmg = Math.max(1, Math.floor(Health.max[eid] * 0.1));
    Health.current[eid] = Math.max(1, Health.current[eid] - dmg);
    Health.flashTimer[eid] = 6;
  }
  world.shakeTimer = Math.max(world.shakeTimer, 120);
  announce(world, 'The ground trembles!', '#f97316');
}

function doBlessingOfThePond(world: GameWorld): void {
  const units = query(world.ecs, [Velocity, FactionTag, Health]);
  for (const eid of units) {
    if (FactionTag.faction[eid] !== Faction.Player || Health.current[eid] <= 0) continue;
    if (!speedBuffEntities.has(eid)) {
      speedBuffEntities.set(eid, Velocity.speed[eid]);
      Velocity.speed[eid] *= 1.1;
    }
  }
  activeEvents.push({ type: 'blessingOfThePond', expiryFrame: world.frameCount + 3600 });
  announce(world, 'The pond spirits bless your forces!', '#a78bfa');
}

/** Tick active events — apply ongoing effects and expire finished ones. */
function tickActiveEvents(world: GameWorld): void {
  for (let i = activeEvents.length - 1; i >= 0; i--) {
    const ev = activeEvents[i];

    // Healing spring: heal units within 100px every 300 frames (5 seconds)
    if (ev.type === 'healingSpring' && ev.x != null && ev.y != null) {
      if (world.frameCount % 300 === 0) {
        const allUnits = query(world.ecs, [Position, Health, FactionTag]);
        for (const eid of allUnits) {
          if (Health.current[eid] <= 0) continue;
          const dx = Position.x[eid] - ev.x;
          const dy = Position.y[eid] - ev.y;
          if (dx * dx + dy * dy <= 10000) {
            Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + 3);
          }
        }
      }
    }

    // Expire event
    if (world.frameCount >= ev.expiryFrame) {
      if (ev.type === 'predatorFrenzy' || ev.type === 'blessingOfThePond') {
        restoreSpeedBuffs();
      }
      activeEvents.splice(i, 1);
    }
  }
}

function restoreSpeedBuffs(): void {
  for (const [eid, origSpeed] of speedBuffEntities) {
    if (Health.current[eid] > 0) {
      Velocity.speed[eid] = origSpeed;
    }
  }
  speedBuffEntities.clear();
}

/** Check if a fog bank event is currently active. */
export function isFogBankActive(): boolean {
  return activeEvents.some((e) => e.type === 'fogBank');
}
