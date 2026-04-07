/**
 * spawnVerticalWorld — v3 panel-based map generation + entity spawning.
 *
 * Creates PanelGrid from viewport, generates biome terrain per panel,
 * fills locked panels with ThornWall, spawns Lodge/units/resources/enemies.
 */

import { isAutoBehaviorUnlocked } from '@/config/prestige-logic';
import { Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { PanelGrid } from '@/game/panel-grid';
import { initializeSpecialistProgression } from '@/game/specialist-blueprints';
import {
  applyVerticalMapToWorld,
  buildVerticalTerrain,
  generateVerticalMapLayout,
} from '@/game/vertical-map';
import * as storeV3 from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';

/**
 * Generate and apply the v3 panel-based map, spawning all entities.
 */
export function spawnVerticalWorld(world: GameWorld, unlockStage = 1): void {
  const rng = new SeededRandom(world.mapSeed);

  const vpW = world.viewWidth || 960;
  const vpH = world.viewHeight || 540;

  const panelGrid = new PanelGrid(vpW, vpH, unlockStage);

  if (unlockStage >= 3) {
    const coinFlipStage3 = rng.next() < 0.5;
    const coinFlipStage5 = rng.next() < 0.5;
    panelGrid.computeUnlockedPanelsWithRng(unlockStage, coinFlipStage3, coinFlipStage5);
  }

  world.panelGrid = panelGrid;

  const prestigeState = storeV3.prestigeState.value;
  const hasRareResourceAccess = isAutoBehaviorUnlocked(prestigeState, 'rare_resource_access');
  const layout = generateVerticalMapLayout(panelGrid, rng, { hasRareResourceAccess });

  const terrain = buildVerticalTerrain(layout, rng);
  applyVerticalMapToWorld(world, layout, terrain);

  const dims = panelGrid.getWorldDimensions();
  world.worldWidth = dims.width;
  world.worldHeight = dims.height;

  const lodgeEid = spawnVerticalEntities(world, layout, rng);
  initializeSpecialistProgression(world, prestigeState);

  const lodge = world.selection[0];
  const textX = lodge != null ? Position.x[lodge] : layout.lodgeX;
  const textY = lodge != null ? Position.y[lodge] - 80 : layout.lodgeY - 80;
  world.floatingTexts.push({
    x: textX,
    y: textY,
    text: 'MAP: Panel Grid',
    color: '#38bdf8',
    life: 180,
  });
}
