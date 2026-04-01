/**
 * Procedural Sprite Generator
 *
 * Generates all sprite types on offscreen canvases, then converts
 * to PixiJS Textures. Every pixel placement matches the original exactly.
 */

import { SpriteId } from '@/types';
import { registerSpriteTexture } from '../pixi-app';
import {
  drawArmory,
  drawBurrow,
  drawFishingHut,
  drawHerbalistHut,
  drawLodge,
  drawPredatorNest,
  drawScoutPost,
  drawTower,
  drawWall,
  drawWatchtower,
} from './buildings';
import { makeDrawCtx, require2DContext } from './draw-helpers';
import {
  drawAlphaPredator,
  drawArmoredGator,
  drawBossCroc,
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
  drawBrawler,
  drawCommander,
  drawGatherer,
  drawHealer,
  drawScout,
  drawShieldbearer,
  drawSniper,
  drawSwimmer,
  drawTrapper,
} from './units';

/** Names used internally to map to SpriteId enum values. */
const SPRITE_NAMES: { name: string; id: SpriteId }[] = [
  { name: 'gatherer', id: SpriteId.Gatherer },
  { name: 'brawler', id: SpriteId.Brawler },
  { name: 'sniper', id: SpriteId.Sniper },
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
  { name: 'healer', id: SpriteId.Healer },
  { name: 'watchtower', id: SpriteId.Watchtower },
  { name: 'boss_croc', id: SpriteId.BossCroc },
  { name: 'shieldbearer', id: SpriteId.Shieldbearer },
  { name: 'scout', id: SpriteId.Scout },
  { name: 'catapult', id: SpriteId.Catapult },
  { name: 'wall', id: SpriteId.Wall },
  { name: 'scout_post', id: SpriteId.ScoutPost },
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
  'scout_post',
  'siege_turtle',
  'alpha_predator',
  'fishing_hut',
  'herbalist_hut',
]);

/** Map sprite type names to their draw functions. */
const DRAW_FNS: Record<string, (d: ReturnType<typeof makeDrawCtx>) => void> = {
  gatherer: drawGatherer,
  brawler: drawBrawler,
  sniper: drawSniper,
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
  healer: drawHealer,
  watchtower: drawWatchtower,
  boss_croc: drawBossCroc,
  shieldbearer: drawShieldbearer,
  scout: drawScout,
  catapult: drawCatapult,
  wall: drawWall,
  scout_post: drawScoutPost,
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
