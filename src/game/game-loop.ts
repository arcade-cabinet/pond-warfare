/**
 * Game Loop – fixed-timestep loop, update logic, physics sync, speed.
 */

import { query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { SPEED_LEVELS } from '@/constants';
import {
  Collider,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Selectable,
} from '@/ecs/components';
import { syncRosters } from '@/game/roster-sync';
import type { Governor } from '@/governor/governor';
import type { KeyboardHandler } from '@/input/keyboard';
import type { PointerHandler } from '@/input/pointer';
import type { PhysicsManager } from '@/physics/physics-world';
import { cleanupEntityAnimation } from '@/rendering/animations';
import { clampCamera } from '@/rendering/camera';
import type { FogRendererState } from '@/rendering/fog-renderer';
import type { ReplayRecorder } from '@/replay';
import { saveGame } from '@/save-system';
import { saveGameToDb } from '@/storage';
import { checkAchievements } from '@/systems/achievements';
import { type EntityKind, Faction } from '@/types';
import * as store from '@/ui/store';
import { checkEvacuation, createCheckpoint } from './checkpoint';
import { type DrawState, draw } from './game-renderer';
import { runSystems } from './systems-runner';

/** Mutable state needed by the game loop. */
export interface GameLoopState extends DrawState {
  running: boolean;
  lastTime: number;
  accumulator: number;
  rafId: number | null;
  fpsFrameTimes: number[];
  fpsLastUpdate: number;
  lastKnownNestsDestroyed: number;
  lastKnownTechCount: number;
  audioInitialized: boolean;
  wasPeaceful: boolean;
  wasGameOver: boolean;
  physicsManager: PhysicsManager;
  lastKnownEntities: Set<number>;
  fogCanvas: HTMLCanvasElement;
  lightCanvas: HTMLCanvasElement;
  container: HTMLElement;
  fogCtx: CanvasRenderingContext2D;
  fogState: FogRendererState;
  keyboard: KeyboardHandler;
  pointer: PointerHandler;
  recorder: ReplayRecorder;
  syncUIStore: () => void;
  governor: Governor | null;
}

/** Cycle game speed (1x -> 2x -> 3x -> 1x). */
export function cycleSpeed(state: GameLoopState): void {
  const w = state.world;
  const idx = SPEED_LEVELS.indexOf(w.gameSpeed as 1 | 2 | 3);
  w.gameSpeed = SPEED_LEVELS[(idx + 1) % SPEED_LEVELS.length];
  store.gameSpeed.value = w.gameSpeed;
  audio.click();
  state.recorder.record(w.frameCount, 'speed', { gameSpeed: w.gameSpeed });
}

/** Main game loop using a fixed timestep accumulator. */
export function gameLoop(state: GameLoopState, timestamp: number): void {
  if (!state.running) return;

  const FIXED_DT = 1000 / 60;
  const dt = timestamp - state.lastTime;
  state.lastTime = timestamp;

  if (store.fpsCounterVisible.value) {
    state.fpsFrameTimes.push(dt);
    if (state.fpsFrameTimes.length > 60) state.fpsFrameTimes.shift();
    if (timestamp - state.fpsLastUpdate > 500) {
      const avg = state.fpsFrameTimes.reduce((a, b) => a + b, 0) / state.fpsFrameTimes.length;
      store.fpsDisplay.value = avg > 0 ? Math.round(1000 / avg) : 0;
      state.fpsLastUpdate = timestamp;
    }
  }

  state.accumulator += Math.min(dt, 200);
  while (state.accumulator >= FIXED_DT) {
    if (state.world.state === 'playing' && !state.world.paused) {
      for (
        let i = 0;
        i < state.world.gameSpeed && state.world.state === 'playing' && !state.world.paused;
        i++
      ) {
        updateLogic(state);
      }
    }
    state.accumulator -= FIXED_DT;
  }

  draw(state);
  state.rafId = requestAnimationFrame((t) => gameLoop(state, t));
}

function updateLogic(state: GameLoopState): void {
  const w = state.world;
  w.frameCount++;

  const manualPan = state.keyboard.updatePan(
    state.pointer.mouse.in,
    state.pointer.mouse.x,
    state.pointer.mouse.y,
    state.pointer.mouse.isDown,
  );

  if (w.isTracking && w.selection.length > 0 && !manualPan) {
    let cx = 0,
      cy = 0,
      n = 0;
    for (const eid of w.selection) {
      if (Health.current[eid] > 0) {
        cx += Position.x[eid];
        cy += Position.y[eid];
        n++;
      }
    }
    if (n > 0) {
      cx /= n;
      cy /= n;
      w.camX += (cx - w.viewWidth / 2 - w.camX) * 0.1;
      w.camY += (cy - w.viewHeight / 2 - w.camY) * 0.1;
    } else {
      w.isTracking = false;
    }
  }

  if (w.yukaManager.shouldRefreshObstacles()) {
    const blds = query(w.ecs, [Position, Health, IsBuilding, Collider]);
    const obs: Array<{ x: number; y: number; radius: number }> = [];
    for (let i = 0; i < blds.length; i++) {
      const b = blds[i];
      if (Health.current[b] > 0)
        obs.push({ x: Position.x[b], y: Position.y[b], radius: Collider.radius[b] });
    }
    w.yukaManager.setObstacles(obs);
  }

  w.yukaManager.update(1 / 60, w.ecs);
  syncPhysicsBodies(state);

  w.spatialHash.clear();
  const spatialEnts = query(w.ecs, [Position, Health]);
  for (let i = 0; i < spatialEnts.length; i++) {
    const eid = spatialEnts[i];
    if (Health.current[eid] > 0) w.spatialHash.insert(eid, Position.x[eid], Position.y[eid]);
  }

  const throttleAI = spatialEnts.length > 300 && w.frameCount % 2 !== 0;
  runSystems(w, state.physicsManager, throttleAI);
  if (state.governor?.enabled) state.governor.tick();

  const pendingDrag = state.pointer.consumeDragRect();
  if (pendingDrag) {
    const dragEnts = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);
    for (let i = 0; i < dragEnts.length; i++) {
      const eid = dragEnts[i];
      if (FactionTag.faction[eid] !== Faction.Player || Health.current[eid] <= 0) continue;
      if (ENTITY_DEFS[EntityTypeTag.kind[eid] as EntityKind]?.isBuilding) continue;
      const ex = Position.x[eid],
        ey = Position.y[eid];
      if (
        ex >= pendingDrag.minX &&
        ex <= pendingDrag.maxX &&
        ey >= pendingDrag.minY &&
        ey <= pendingDrag.maxY &&
        !w.selection.includes(eid)
      ) {
        w.selection.push(eid);
        Selectable.selected[eid] = 1;
      }
    }
    if (w.selection.length > 0) w.isTracking = true;
    state.syncUIStore();
  }

  w.camX += w.camVelX;
  w.camY += w.camVelY;
  w.camVelX *= 0.85;
  w.camVelY *= 0.85;
  clampCamera(w);

  if (w.frameCount % 30 === 0) {
    state.syncUIStore();
    syncRosters(w);
  }

  if (
    store.autoSaveEnabled.value &&
    w.frameCount > 0 &&
    w.frameCount % 3600 === 0 &&
    w.state === 'playing'
  ) {
    const json = saveGame(w);
    saveGameToDb(
      'autosave',
      store.selectedDifficulty.value ?? 'normal',
      store.goMapSeed.value ?? 0,
      json,
      false,
    )
      .then(() => {
        store.hasSaveGame.value = true;
      })
      .catch(() => {});
    w.floatingTexts.push({
      x: w.camX + (w.viewWidth || 400) / 2,
      y: w.camY + 60,
      text: 'Auto-saved',
      color: '#4ade80',
      life: 60,
    });
  }

  if (w.frameCount > 0 && w.frameCount % 18000 === 0 && w.state === 'playing') createCheckpoint(w);
  if (w.state === 'playing') {
    const nests = store.destroyedEnemyNests.value;
    if (nests > state.lastKnownNestsDestroyed) {
      state.lastKnownNestsDestroyed = nests;
      createCheckpoint(w);
    }
    const tc = Object.values(w.tech).filter(Boolean).length;
    if (tc > state.lastKnownTechCount) {
      state.lastKnownTechCount = tc;
      createCheckpoint(w);
    }
  }

  if (w.airdropCooldownUntil > 0 && w.frameCount >= w.airdropCooldownUntil) {
    w.airdropCooldownUntil = 0;
    store.airdropCooldown.value = 0;
  } else if (w.airdropCooldownUntil > w.frameCount) {
    store.airdropCooldown.value = Math.ceil((w.airdropCooldownUntil - w.frameCount) / 60);
  }

  if (w.frameCount % 60 === 0 && w.state === 'playing') checkEvacuation(w);
  if (w.frameCount % 1800 === 0) checkAchievements(w).catch(() => {});
}

function syncPhysicsBodies(state: GameLoopState): void {
  const allEnts = query(state.world.ecs, [Position, Collider, Health]);
  const current = new Set<number>();
  for (let i = 0; i < allEnts.length; i++) {
    const eid = allEnts[i];
    current.add(eid);
    if (Health.current[eid] <= 0) {
      if (state.physicsManager.hasBody(eid)) {
        state.physicsManager.removeBody(eid);
        cleanupEntityAnimation(eid);
      }
      continue;
    }
    if (!state.physicsManager.hasBody(eid)) state.physicsManager.createBody(state.world.ecs, eid);
  }
  for (const eid of state.lastKnownEntities) {
    if (!current.has(eid)) {
      state.physicsManager.removeBody(eid);
      cleanupEntityAnimation(eid);
    }
  }
  state.lastKnownEntities = current;
}
