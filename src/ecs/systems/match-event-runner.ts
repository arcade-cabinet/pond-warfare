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
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import { pushGameEvent } from '@/ui/game-events';

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

  announceEvent(world, event.template);
  spawnEventEnemies(world, event.template);
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

  // Include wave number in announcement for wave events
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
}

// ── Enemy Spawning ───────────────────────────────────────────────

function spawnEventEnemies(world: GameWorld, template: EventTemplate): void {
  const composition = template.enemy_composition;
  if (!composition || Object.keys(composition).length === 0) return;

  // Use world dimensions (vertical map) instead of constants
  const mapW = world.worldWidth || WORLD_WIDTH;

  for (const [_enemyType, count] of Object.entries(composition)) {
    for (let i = 0; i < count; i++) {
      const x = mapW * 0.2 + Math.random() * mapW * 0.6;
      const y = 20 + Math.random() * 40;
      spawnEntity(world, EntityKind.Brawler, x, y, Faction.Enemy);
    }
  }

  if (template.boss) {
    const bossX = mapW * 0.5;
    const bossY = 30;
    spawnEntity(world, EntityKind.Brawler, bossX, bossY, Faction.Enemy);
  }
}

// ── Event Effects ────────────────────────────────────────────────

function applyEventEffects(world: GameWorld, template: EventTemplate): void {
  if (!template.effects) return;

  const mapW = world.worldWidth || WORLD_WIDTH;
  const mapH = world.worldHeight || WORLD_HEIGHT;

  if (template.effects.bonus_nodes != null) {
    const nodeCount = template.effects.bonus_nodes;
    for (let i = 0; i < nodeCount; i++) {
      const x = mapW * 0.2 + Math.random() * mapW * 0.6;
      const y = mapH * 0.3 + Math.random() * mapH * 0.4;
      spawnEntity(world, EntityKind.Clambed, x, y, Faction.Neutral);
    }
  }
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
