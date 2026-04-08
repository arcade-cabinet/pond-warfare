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
  drawMarket,
  drawPredatorNest,
  drawLookoutPost,
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
  drawCatapult,
  drawCattail,
  drawClambed,
  drawFish,
  drawFrog,
  drawPearlBed,
  drawRubble,
} from './resources';
import {
  drawCommander,
  drawDiver,
  drawEngineer,
  drawLookout,
  drawMedic,
  drawMudpaw,
  drawSaboteur,
  drawSapper,
  drawShaman,
  drawShieldbearer,
  drawSwimmer,
  drawTrapper,
} from './units';
import { drawBerserker, drawDock, drawOtterWarship, drawShrine, drawWallGate } from './v2-entities';

/**
 * Names used internally to map to SpriteId enum values.
 *
 * These are local sprite-registry keys, not the canonical shared enum names.
 * Live roster units use canonical keys where possible. Reserved compatibility
 * ids reuse the same live sprite bodies through explicit `compat_*` keys.
 */
const SPRITE_NAMES: { name: string; id: SpriteId }[] = [
  { name: 'mudpaw', id: MUDPAW_SPRITE_ID },
  { name: 'compat_sapper_chassis', id: SpriteId.CompatSapperChassis },
  { name: 'compat_saboteur_chassis', id: SpriteId.CompatSaboteurChassis },
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
  { name: 'shieldbearer', id: SpriteId.Shieldbearer },
  { name: 'lookout', id: LOOKOUT_SPRITE_ID },
  { name: 'catapult', id: SpriteId.Catapult },
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
  { name: 'swimmer', id: SpriteId.Swimmer },
  { name: 'trapper', id: SpriteId.Trapper },
  { name: 'commander', id: SpriteId.Commander },
  { name: 'frog', id: SpriteId.Frog },
  { name: 'fish', id: SpriteId.Fish },
  // v1.5.0
  { name: 'diver', id: SpriteId.Diver },
  { name: 'engineer', id: SpriteId.Engineer },
  { name: 'shaman', id: SpriteId.Shaman },
  { name: 'burrowing_worm', id: SpriteId.BurrowingWorm },
  { name: 'flying_heron', id: SpriteId.FlyingHeron },
  { name: 'market', id: SpriteId.Market },
  // v2.0.0
  { name: 'dock', id: SpriteId.Dock },
  { name: 'otter_warship', id: SpriteId.OtterWarship },
  { name: 'berserker', id: SpriteId.Berserker },
  { name: 'wall_gate', id: SpriteId.WallGate },
  { name: 'shrine', id: SpriteId.Shrine },
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
  'catapult',
  'wall',
  'lookout_post',
  'siege_turtle',
  'alpha_predator',
  'fishing_hut',
  'herbalist_hut',
  'market',
  // v2.0.0 large sprites
  'dock',
  'otter_warship',
  'wall_gate',
  'shrine',
  // Resource nodes (large for visibility)
  'clambed',
]);

/** Map sprite type names to their draw functions. */
const DRAW_FNS: Record<string, (d: ReturnType<typeof makeDrawCtx>) => void> = {
  mudpaw: drawMudpaw,
  compat_sapper_chassis: drawSapper,
  compat_saboteur_chassis: drawSaboteur,
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
  shieldbearer: drawShieldbearer,
  lookout: drawLookout,
  catapult: drawCatapult,
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
  swimmer: drawSwimmer,
  trapper: drawTrapper,
  commander: drawCommander,
  frog: drawFrog,
  fish: drawFish,
  // v1.5.0
  diver: drawDiver,
  engineer: drawEngineer,
  shaman: drawShaman,
  burrowing_worm: drawBurrowingWorm,
  flying_heron: drawFlyingHeron,
  market: drawMarket,
  // v2.0.0
  dock: drawDock,
  otter_warship: drawOtterWarship,
  berserker: drawBerserker,
  wall_gate: drawWallGate,
  shrine: drawShrine,
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
