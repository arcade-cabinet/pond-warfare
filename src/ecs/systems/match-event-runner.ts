/**
 * Match Event Runner (v3.0 -- US16)
 *
 * Runtime system that fires events during a match using the config-driven
 * event selector. Reads from configs/events.json via event-selector.ts.
 *
 * Events fire based on PRNG seed + time elapsed + progression level.
 * Events appear as on-screen alerts with direction indicator.
 * Multiple events can overlap (boss + storm).
 * Event pool expands with progression level.
 *
 * v3 Gap 6: Increments world.waveNumber on wave/swarm/siege events
 * so the HUD wave indicator stays current.
 *
 * v3 T7/T25: Role-based spawning delegated to wave-spawner.ts.
 */

import { audio } from '@/audio/audio-system';
import type { EventEntry } from '@/config/config-loader';
import type { EventTemplate } from '@/config/v3-types';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  getFirstEventDelayFrames,
  getMaxConcurrentEvents,
  selectEvent,
  shouldFireEvent,
} from '@/ecs/systems/event-selector';
import {
  getLastSpawnCenter,
  resetSpawnedRoles,
  spawnEventEnemies,
} from '@/ecs/systems/wave-spawner';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import { pushGameEvent } from '@/ui/game-events';
import { eventAlert } from '@/ui/store-v3';

// Re-export enemy behavior role tracking for external consumers.
export { clearEnemyUnitRole, getEnemyBehaviorRole } from '@/ecs/systems/wave-spawner';

/** CHECK_INTERVAL: how often to poll for new events (every 2 seconds). */
const CHECK_INTERVAL = 120;

/** Event types that count as waves for the wave indicator. */
const WAVE_EVENT_TYPES = new Set(['wave', 'swarm', 'siege']);

// ── Active Event Tracking ────────────────────────────────────────

export interface ActiveMatchEvent {
  id: string;
  template: EventTemplate;
  startFrame: number;
  expiryFrame: number;
  processed: boolean;
}

/** Module-level state */
let lastEventFrame = 0;
let matchStartFrame = 0;
const activeMatchEvents: ActiveMatchEvent[] = [];
let eventsCompleted = 0;

/** Reset for new match. */
export function resetMatchEventRunner(): void {
  lastEventFrame = 0;
  matchStartFrame = 0;
  activeMatchEvents.length = 0;
  eventsCompleted = 0;
  resetSpawnedRoles();
}

/** Get count of completed events (for rewards). */
export function getEventsCompletedCount(): number {
  return eventsCompleted;
}

/** Get currently active match events (for UI display and testing). */
export function getActiveMatchEvents(): readonly ActiveMatchEvent[] {
  return activeMatchEvents;
}

// ── Main System Tick ─────────────────────────────────────────────

/**
 * Main event runner tick -- call every frame.
 *
 * @param world - Game world state
 * @param progressionLevel - Player's progression level
 */
export function matchEventRunnerSystem(world: GameWorld, progressionLevel: number): void {
  if (world.state !== 'playing') return;

  if (world.frameCount < world.peaceTimer) return;

  if (matchStartFrame === 0) {
    matchStartFrame = world.frameCount;
    lastEventFrame = world.frameCount;
  }

  tickActiveMatchEvents(world);

  if (world.frameCount % CHECK_INTERVAL !== 0) return;

  const firstDelay = getFirstEventDelayFrames();
  if (world.frameCount - matchStartFrame < firstDelay) return;

  const framesSinceLastEvent = world.frameCount - lastEventFrame;
  const seed = world.mapSeed + world.frameCount;
  if (!shouldFireEvent(framesSinceLastEvent, seed)) return;

  const maxConcurrent = getMaxConcurrentEvents();
  if (activeMatchEvents.length >= maxConcurrent) return;

  const event = selectEvent(progressionLevel, seed);
  if (!event) return;

  fireMatchEvent(world, event);
  lastEventFrame = world.frameCount;
}

// ── Event Firing ─────────────────────────────────────────────────

function fireMatchEvent(world: GameWorld, event: EventEntry): void {
  const durationFrames = event.template.duration_seconds * 60;

  const active: ActiveMatchEvent = {
    id: event.id,
    template: event.template,
    startFrame: world.frameCount,
    expiryFrame: world.frameCount + durationFrames,
    processed: false,
  };

  activeMatchEvents.push(active);

  // v3 Gap 6: increment wave number for wave-type events
  if (WAVE_EVENT_TYPES.has(event.template.type)) {
    world.waveNumber++;
  }

  // Spawn before announce so getLastSpawnCenter() has data for the alert
  spawnEventEnemies(world, event.template);
  announceEvent(world, event.template);
  applyEventEffects(world, event.template);
}

function announceEvent(world: GameWorld, template: EventTemplate): void {
  const colorMap: Record<string, string> = {
    wave: '#ef4444',
    boss: '#dc2626',
    storm: '#94a3b8',
    resource_surge: '#f59e0b',
    escort: '#38bdf8',
    siege: '#f97316',
    sabotage: '#a855f7',
    swarm: '#ef4444',
  };

  const color = colorMap[template.type] ?? '#ffffff';
  const wavePrefix = WAVE_EVENT_TYPES.has(template.type) ? `Wave ${world.waveNumber}: ` : '';

  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: `${wavePrefix}${template.description}`,
    color,
    life: 240,
  });

  pushGameEvent(`${wavePrefix}${template.description}`, color, world.frameCount);
  audio.alert();

  // T24/T27: Push on-screen alert with direction + spawn position
  const spawnCenter = getLastSpawnCenter();
  const direction = computeSpawnDirection(world, spawnCenter);
  const alertText = `${wavePrefix}${template.description}`.toUpperCase();
  eventAlert.value = {
    text: `${alertText} -- FROM ${direction.toUpperCase()}`,
    direction,
    spawnX: spawnCenter?.x ?? world.camX + world.viewWidth / 2,
    spawnY: spawnCenter?.y ?? 40,
    frame: world.frameCount,
  };
}

/** Determine compass direction of spawn relative to Lodge / map center. */
function computeSpawnDirection(
  world: GameWorld,
  spawn: { x: number; y: number } | null,
): 'north' | 'east' | 'west' | 'south' {
  if (!spawn) return 'north';

  // Use Lodge position as reference (center of panel 5)
  let refX = world.worldWidth / 2;
  let refY = world.worldHeight / 2;
  if (world.panelGrid) {
    const lodgePos = world.panelGrid.getLodgePosition();
    refX = lodgePos.x;
    refY = lodgePos.y;
  }

  const dx = spawn.x - refX;
  const dy = spawn.y - refY;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'east' : 'west';
  }
  return dy > 0 ? 'south' : 'north';
}

// ── Event Effects ────────────────────────────────────────────────

function applyEventEffects(world: GameWorld, template: EventTemplate): void {
  if (!template.effects) return;

  const mapW = world.worldWidth || WORLD_WIDTH;
  const mapH = world.worldHeight || WORLD_HEIGHT;

  if (template.effects.bonus_nodes != null) {
    const nodeCount = template.effects.bonus_nodes;
    for (let i = 0; i < nodeCount; i++) {
      const { x, y } = getBonusNodeSpawnPosition(world, mapW, mapH);
      spawnEntity(world, EntityKind.Clambed, x, y, Faction.Neutral);
    }
  }
}

export function getBonusNodeSpawnPosition(
  world: GameWorld,
  mapW: number,
  mapH: number,
): { x: number; y: number } {
  return {
    x: mapW * 0.2 + world.gameRng.next() * mapW * 0.6,
    y: mapH * 0.3 + world.gameRng.next() * mapH * 0.4,
  };
}

// ── Active Event Tick ────────────────────────────────────────────

function tickActiveMatchEvents(world: GameWorld): void {
  for (let i = activeMatchEvents.length - 1; i >= 0; i--) {
    const ev = activeMatchEvents[i];
    if (world.frameCount >= ev.expiryFrame) {
      eventsCompleted++;
      activeMatchEvents.splice(i, 1);
    }
  }
}

// ── Query Helpers ────────────────────────────────────────────────

/** Check if a storm event is currently active. */
export function isStormActive(): boolean {
  return activeMatchEvents.some((e) => e.template.type === 'storm');
}

/** Get the speed penalty from any active storm (1.0 = no penalty). */
export function getStormSpeedPenalty(): number {
  for (const ev of activeMatchEvents) {
    if (ev.template.type === 'storm' && ev.template.effects?.speed_penalty != null) {
      return ev.template.effects.speed_penalty;
    }
  }
  return 1.0;
}

/** Get the visibility reduction from any active storm (1.0 = full). */
export function getStormVisibilityReduction(): number {
  for (const ev of activeMatchEvents) {
    if (ev.template.type === 'storm' && ev.template.effects?.visibility_reduction != null) {
      return ev.template.effects.visibility_reduction;
    }
  }
  return 1.0;
}
