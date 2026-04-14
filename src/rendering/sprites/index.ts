/**
 * Procedural Sprite Generator
 *
 * Generates all sprite types on offscreen canvases, then converts
 * to PixiJS Textures. Every pixel placement matches the original exactly.
 */

import {
  LOOKOUT_SPRITE_ID,
  MEDIC_SPRITE_ID,
  MUDPAW_SPRITE_ID,
  SABOTEUR_SPRITE_ID,
  SAPPER_SPRITE_ID,
} from '@/game/live-unit-kinds';
import { SpriteId } from '@/types';
import { registerSpriteTexture } from '../pixi';
import {
  drawArmory,
  drawBurrow,
  drawFishingHut,
  drawHerbalistHut,
  drawLodge,
  drawLookoutPost,
  drawMarket,
  drawPredatorNest,
  drawTower,
  drawWall,
  drawWatchtower,
} from './buildings';
import { makeDrawCtx, require2DContext } from './draw-helpers';
import {
  drawAlphaPredator,
  drawArmoredGator,
  drawBossCroc,
  drawBurrowingWorm,
  drawFlyingHeron,
  drawGator,
  drawSiegeTurtle,
  drawSnake,
  drawSwampDrake,
  drawVenomSnake,
} from './enemies';
import {
  drawBones,
  drawCattail,
  drawClambed,
  drawFish,
  drawFrog,
  drawPearlBed,
  drawRubble,
  drawSharedSiegeChassis,
} from './resources';
import {
  drawCommander,
  drawLookout,
  drawMedic,
  drawMudpaw,
  drawReservedUnit28,
  drawReservedUnit29,
  drawReservedUnit33,
  drawSaboteur,
  drawSapper,
  drawShaman,
  drawSharedHeavyChassis,
} from './units';
import {
  drawReservedBuilding39,
  drawReservedBuilding42,
  drawReservedBuilding43,
  drawReservedUnit40,
  drawReservedUnit41,
} from './v2-entities';

/**
 * Names used internally to map to SpriteId enum values.
 *
 * These are local sprite-registry keys, not the canonical shared enum names.
 * Live roster units use canonical keys where possible. Reserved shared-chassis
 * ids reuse the same live sprite bodies through explicit `shared_*` keys.
 */
const SPRITE_NAMES: { name: string; id: SpriteId }[] = [
  { name: 'mudpaw', id: MUDPAW_SPRITE_ID },
  { name: 'shared_sapper_chassis', id: SpriteId.SharedSapperChassis },
  { name: 'shared_saboteur_chassis', id: SpriteId.SharedSaboteurChassis },
  { name: 'gator', id: SpriteId.Gator },
  { name: 'snake', id: SpriteId.Snake },
  { name: 'lodge', id: SpriteId.Lodge },
  { name: 'burrow', id: SpriteId.Burrow },
  { name: 'armory', id: SpriteId.Armory },
  { name: 'tower', id: SpriteId.Tower },
  { name: 'predator_nest', id: SpriteId.PredatorNest },
  { name: 'cattail', id: SpriteId.Cattail },
  { name: 'clambed', id: SpriteId.Clambed },
  { name: 'bones', id: SpriteId.Bones },
  { name: 'rubble', id: SpriteId.Rubble },
  { name: 'medic', id: MEDIC_SPRITE_ID },
  { name: 'watchtower', id: SpriteId.Watchtower },
  { name: 'boss_croc', id: SpriteId.BossCroc },
  { name: 'shared_heavy_chassis', id: SpriteId.SharedHeavyChassis },
  { name: 'lookout', id: LOOKOUT_SPRITE_ID },
  { name: 'shared_siege_chassis', id: SpriteId.SharedSiegeChassis },
  { name: 'wall', id: SpriteId.Wall },
  { name: 'lookout_post', id: SpriteId.LookoutPost },
  { name: 'armored_gator', id: SpriteId.ArmoredGator },
  { name: 'venom_snake', id: SpriteId.VenomSnake },
  { name: 'swamp_drake', id: SpriteId.SwampDrake },
  { name: 'siege_turtle', id: SpriteId.SiegeTurtle },
  { name: 'alpha_predator', id: SpriteId.AlphaPredator },
  { name: 'pearl_bed', id: SpriteId.PearlBed },
  { name: 'fishing_hut', id: SpriteId.FishingHut },
  { name: 'herbalist_hut', id: SpriteId.HerbalistHut },
  { name: 'reserved_unit_28', id: SpriteId.ReservedSprite28 },
  { name: 'reserved_unit_29', id: SpriteId.ReservedSprite29 },
  { name: 'commander', id: SpriteId.Commander },
  { name: 'frog', id: SpriteId.Frog },
  { name: 'fish', id: SpriteId.Fish },
  // v1.5.0
  { name: 'reserved_unit_33', id: SpriteId.ReservedSprite33 },
  { name: 'reserved_unit_34', id: SpriteId.ReservedSprite34 },
  { name: 'shaman', id: SpriteId.Shaman },
  { name: 'burrowing_worm', id: SpriteId.BurrowingWorm },
  { name: 'flying_heron', id: SpriteId.FlyingHeron },
  { name: 'market', id: SpriteId.Market },
  // v2.0.0
  { name: 'reserved_building_39', id: SpriteId.ReservedSprite39 },
  { name: 'reserved_unit_40', id: SpriteId.ReservedSprite40 },
  { name: 'reserved_unit_41', id: SpriteId.ReservedSprite41 },
  { name: 'reserved_building_42', id: SpriteId.ReservedSprite42 },
  { name: 'reserved_building_43', id: SpriteId.ReservedSprite43 },
  // v3.0.0
  { name: 'sapper', id: SAPPER_SPRITE_ID },
  { name: 'saboteur', id: SABOTEUR_SPRITE_ID },
];

const LARGE_TYPES = new Set([
  'lodge',
  'burrow',
  'armory',
  'tower',
  'predator_nest',
  'rubble',
  'watchtower',
  'boss_croc',
  'shared_siege_chassis',
  'wall',
  'lookout_post',
  'siege_turtle',
  'alpha_predator',
  'fishing_hut',
  'herbalist_hut',
  'market',
  // v2.0.0 large sprites
  'reserved_building_39',
  'reserved_unit_40',
  'reserved_building_42',
  'reserved_building_43',
  // Resource nodes (large for visibility)
  'clambed',
]);

/** Map sprite type names to their draw functions. */
const DRAW_FNS: Record<string, (d: ReturnType<typeof makeDrawCtx>) => void> = {
  mudpaw: drawMudpaw,
  shared_sapper_chassis: drawSapper,
  shared_saboteur_chassis: drawSaboteur,
  gator: drawGator,
  snake: drawSnake,
  lodge: drawLodge,
  burrow: drawBurrow,
  armory: drawArmory,
  tower: drawTower,
  predator_nest: drawPredatorNest,
  cattail: drawCattail,
  clambed: drawClambed,
  bones: drawBones,
  rubble: drawRubble,
  medic: drawMedic,
  watchtower: drawWatchtower,
  boss_croc: drawBossCroc,
  shared_heavy_chassis: drawSharedHeavyChassis,
  lookout: drawLookout,
  shared_siege_chassis: drawSharedSiegeChassis,
  wall: drawWall,
  lookout_post: drawLookoutPost,
  armored_gator: drawArmoredGator,
  venom_snake: drawVenomSnake,
  swamp_drake: drawSwampDrake,
  siege_turtle: drawSiegeTurtle,
  alpha_predator: drawAlphaPredator,
  pearl_bed: drawPearlBed,
  fishing_hut: drawFishingHut,
  herbalist_hut: drawHerbalistHut,
  reserved_unit_28: drawReservedUnit28,
  reserved_unit_29: drawReservedUnit29,
  commander: drawCommander,
  frog: drawFrog,
  fish: drawFish,
  // v1.5.0
  reserved_unit_33: drawReservedUnit33,
  reserved_unit_34: drawMudpaw,
  shaman: drawShaman,
  burrowing_worm: drawBurrowingWorm,
  flying_heron: drawFlyingHeron,
  market: drawMarket,
  // v2.0.0
  reserved_building_39: drawReservedBuilding39,
  reserved_unit_40: drawReservedUnit40,
  reserved_unit_41: drawReservedUnit41,
  reserved_building_42: drawReservedBuilding42,
  reserved_building_43: drawReservedBuilding43,
  // v3.0.0
  sapper: drawSapper,
  saboteur: drawSaboteur,
};

/**
 * Generate a single sprite canvas at native pixel-art resolution,
 * then scale it up with nearest-neighbour filtering.
 */
function generateSpriteCanvas(type: string): HTMLCanvasElement {
  const size = LARGE_TYPES.has(type) ? 32 : 16;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = require2DContext(c);
  const d = makeDrawCtx(ctx);

  const drawFn = DRAW_FNS[type];
  if (!drawFn) throw new Error(`Unhandled sprite type: ${type}`);
  drawFn(d);

  // Scale up with nearest-neighbour (no smoothing)
  const scale = LARGE_TYPES.has(type) ? 3 : 2.5;
  const sCanvas = document.createElement('canvas');
  sCanvas.width = size * scale;
  sCanvas.height = size * scale;
  const sCtx = require2DContext(sCanvas);
  sCtx.imageSmoothingEnabled = false;
  sCtx.drawImage(c, 0, 0, size * scale, size * scale);

  return sCanvas;
}

/**
 * Generate all sprite types and return a Map<SpriteId, HTMLCanvasElement>
 * for Canvas2D usage.
 */
export function generateAllSprites(): {
  canvases: Map<SpriteId, HTMLCanvasElement>;
} {
  const canvases = new Map<SpriteId, HTMLCanvasElement>();

  for (const { name, id } of SPRITE_NAMES) {
    const canvas = generateSpriteCanvas(name);
    canvases.set(id, canvas);
    registerSpriteTexture(id, canvas);
  }

  return { canvases };
}

/** Derived from LARGE_TYPES + SPRITE_NAMES so both registries stay in sync. */
const LARGE_SPRITE_IDS = new Set<SpriteId>(
  SPRITE_NAMES.filter(({ name }) => LARGE_TYPES.has(name)).map(({ id }) => id),
);

/** Convenience: get the sprite canvas dimensions for a given SpriteId. */
export function getSpriteSize(id: SpriteId): { width: number; height: number } {
  const isLarge = LARGE_SPRITE_IDS.has(id);
  const baseSize = isLarge ? 32 : 16;
  const scale = isLarge ? 3 : 2.5;
  return { width: baseSize * scale, height: baseSize * scale };
}
