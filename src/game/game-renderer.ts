/**
 * Game Renderer -- per-frame draw calls for PixiJS, fog, lighting.
 *
 * Minimap removed in v3 (viewport IS the map).
 */

import { query } from 'bitecs';
import { ENTITY_DEFS, entityKindFromString } from '@/config/entity-defs';
import { TILE_SIZE } from '@/constants';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsProjectile,
  Position,
  ProjectileData,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { PointerHandler } from '@/input/pointer';
import { canPlaceBuilding } from '@/input/selection/queries';
import { computeShakeOffset } from '@/rendering/camera';
import { drawFog, type FogRendererState } from '@/rendering/fog-renderer';
import { drawLighting } from '@/rendering/light-renderer';
import type { ProjectileRenderData } from '@/rendering/particles';
import { updateProjectileTrails } from '@/rendering/particles';
import { type PixiRenderFrameData, type PlacementPreview, renderPixiFrame } from '@/rendering/pixi';
import { type EntityKind, Faction, type SpriteId } from '@/types';
import { getCurrentRunPanelStage } from '@/ui/current-run-diamond-effects';
import * as storeV3 from '@/ui/store-v3';

export interface DrawState {
  world: GameWorld;
  webglContextLost: boolean;
  spriteCanvases: Map<SpriteId, HTMLCanvasElement>;
  pointer: PointerHandler;
  fogState: FogRendererState;
  lightCtx: CanvasRenderingContext2D;
  exploredCanvas: HTMLCanvasElement;
  bgCanvas: HTMLCanvasElement;
}

/** Render one frame. */
export function draw(state: DrawState): void {
  if (state.webglContextLost) return;

  const w = state.world;
  const shake = computeShakeOffset(w);

  const allEnts = Array.from(query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]));
  const liveEnts = allEnts.filter((eid) => Health.current[eid] > 0);
  const sortedEids = liveEnts.sort((a, b) => Position.y[a] - Position.y[b]);

  const dragRect = state.pointer.getDragRect();
  const selectionRect = dragRect
    ? { startX: dragRect.minX, startY: dragRect.minY, endX: dragRect.maxX, endY: dragRect.maxY }
    : null;
  const placement = getPlacementPreview(w, state.pointer);

  const projEids = Array.from(query(w.ecs, [Position, ProjectileData, IsProjectile]));
  const projectiles: ProjectileRenderData[] = projEids.map((eid) => ({
    x: Position.x[eid],
    y: Position.y[eid],
    trail: [] as { x: number; y: number; life: number }[],
  }));
  updateProjectileTrails(projectiles);
  const panelStage = getCurrentRunPanelStage(storeV3.currentRunPurchasedDiamondIds.value);

  const renderData: PixiRenderFrameData = {
    sortedEids,
    corpses: w.corpses,
    groundPings: w.groundPings,
    projectiles,
    particles: w.particles,
    floatingTexts: w.floatingTexts,
    frameCount: w.frameCount,
    shake,
    selectionRect,
    placement,
    isDragging: state.pointer.mouse.isDown,
    progressionLevel: panelStage,
  };

  renderPixiFrame(w, state.spriteCanvases, renderData);

  const playerEids = allEnts.filter(
    (eid) => FactionTag.faction[eid] === Faction.Player && Health.current[eid] > 0,
  );

  drawFog(state.fogState, w, playerEids, shake.offsetX, shake.offsetY);

  drawLighting(state.lightCtx, w, liveEnts, w.fireflies, shake.offsetX, shake.offsetY);
}

function getPlacementPreview(world: GameWorld, pointer: PointerHandler): PlacementPreview | null {
  if (!world.placingBuilding) return null;
  const mx = pointer.mouse.worldX;
  const my = pointer.mouse.worldY;
  const bx = Math.round(mx / TILE_SIZE) * TILE_SIZE;
  const by = Math.round(my / TILE_SIZE) * TILE_SIZE;
  const type = world.placingBuilding;
  let def: (typeof ENTITY_DEFS)[EntityKind] | undefined;
  try {
    def = ENTITY_DEFS[entityKindFromString(type)];
  } catch {
    def = undefined;
  }
  const spriteW = def ? def.spriteSize * def.spriteScale : 64;
  const spriteH = def ? def.spriteSize * def.spriteScale : 64;
  return {
    buildingType: type,
    worldX: bx,
    worldY: by,
    canPlace: canPlaceBuilding(world, bx, by, spriteW, spriteH),
  };
}
