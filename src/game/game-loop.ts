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
import { GameError, logError } from '@/errors';
import { syncRosters } from '@/game/roster-sync';
import type { Governor } from '@/governor/governor';
import type { KeyboardHandler } from '@/input/keyboard';
import type { PointerHandler } from '@/input/pointer';
import type { LockstepSync } from '@/net/lockstep';
import type { PhysicsManager } from '@/physics/physics-world';
import { clampCamera } from '@/rendering/camera';
import type { FogRendererState } from '@/rendering/fog-renderer';
import type { ReplayRecorder } from '@/replay';
import { saveGame } from '@/save-system';
import { checkAchievements } from '@/systems/achievements';
import { type EntityKind, Faction } from '@/types';
import { pruneGameEvents } from '@/ui/game-events';
import * as store from '@/ui/store';
import { multiplayerStalled } from '@/ui/store-multiplayer';
import { triggerAutosave } from './autosave';
import { checkEvacuation, createCheckpoint } from './checkpoint';
import { beginSpectacle, tickSpectacle } from './game-end-spectacle';
import { type DrawState, draw } from './game-renderer';
import { syncPhysicsBodies } from './physics-sync';
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
  /** Real frame count since game-end was detected (for spectacle timing). */
  spectacleFrames: number;
  /** Whether spectacle has been initiated (prevents re-triggering). */
  spectacleStarted: boolean;
  /** Multiplayer lockstep synchronizer (null in single-player). */
  lockstep: LockstepSync | null;
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
    const w = state.world;
    const isPlaying = w.state === 'playing' && !w.paused;
    const isSpectacle = w.gameEndSpectacleActive && !w.paused;

    if (isPlaying) {
      if (state.lockstep) {
        state.lockstep.fillEmptyFrame();
        if (state.lockstep.isFrameReady()) {
          updateLogic(state);
          state.lockstep.advance();
          multiplayerStalled.value = false;
        } else {
          multiplayerStalled.value = state.lockstep.isStalled();
        }
      } else {
        for (let i = 0; i < w.gameSpeed && w.state === 'playing' && !w.paused; i++) {
          updateLogic(state);
        }
      }
    }

    if (isSpectacle) {
      if (!state.spectacleStarted) {
        state.spectacleStarted = true;
        state.spectacleFrames = 0;
        beginSpectacle(w);
      }
      state.spectacleFrames++;
      updateLogic(state);
      tickSpectacle(w, state.spectacleFrames);
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

  if (w.frameCount % 60 === 0) pruneGameEvents(w.frameCount, 480);

  if (w.frameCount % 90 === 0 && w.combatZones.length > 0) {
    const margin = 500;
    let closest = margin;
    for (const z of w.combatZones) {
      const dx = Math.max(0, w.camX - z.x, z.x - (w.camX + w.viewWidth));
      const dy = Math.max(0, w.camY - z.y, z.y - (w.camY + w.viewHeight));
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0 && dist < closest) closest = dist;
    }
    if (closest < margin) {
      audio.offscreenCombat(1 - closest / margin);
    }
  }

  if (
    store.autoSaveEnabled.value &&
    w.frameCount > 0 &&
    w.frameCount % 3600 === 0 &&
    w.state === 'playing'
  ) {
    void triggerAutosave(w);
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

  if (w.frameCount % 60 === 0 && w.state === 'playing') checkEvacuation(w);
  if (w.frameCount % 1800 === 0) {
    checkAchievements(w).catch((error) => {
      logError(new GameError('Achievement polling failed', 'game/game-loop', { cause: error }));
    });
  }
}
