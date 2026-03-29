/**
 * Procedural Sprite Generator
 *
 * Generates all 14 sprite types on offscreen canvases, then converts
 * to PixiJS Textures. Every pixel placement matches the original exactly.
 */

import { PALETTE } from '@/constants';
import { SpriteId } from '@/types';
import { registerSpriteTexture } from './pixi-app';

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

/**
 * Generate a single sprite canvas at native pixel-art resolution,
 * then scale it up with nearest-neighbour filtering.
 * Returns the scaled HTMLCanvasElement (same as original SpriteGen.generate).
 */
function generateSpriteCanvas(type: string): HTMLCanvasElement {
  const size = LARGE_TYPES.has(type) ? 32 : 16;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  const p = (x: number, y: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  };

  const rect = (x: number, y: number, w: number, h: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const circle = (cx: number, cy: number, r: number, color: string): void => {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) p(cx + x, cy + y, color);
      }
    }
  };

  // Derived colors for sprite detail enhancements
  const OTTER_OUTLINE = '#4a2000'; // Darker than otterBase (#78350f)
  const OTTER_NOSE_HIGHLIGHT = '#a0703a'; // Lighter nose highlight for 3D feel
  const GATOR_SCALE_HIGHLIGHT = '#34d399'; // Lighter green for scale highlights
  const DOORWAY_GLOW = '#d97706'; // Warm amber for building entrance glow
  const FLAME_ORANGE = '#f97316'; // Flame pixel
  const FLAME_YELLOW = '#facc15'; // Flame tip

  if (type === 'gatherer' || type === 'brawler' || type === 'sniper') {
    // Shadow under feet
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(5, 14, 6, 1);
    // Dark outline around body for definition
    rect(4, 3, 1, 10, OTTER_OUTLINE);
    rect(12, 3, 1, 10, OTTER_OUTLINE);
    rect(5, 1, 6, 1, OTTER_OUTLINE);
    rect(5, 12, 1, 2, OTTER_OUTLINE);
    rect(11, 12, 1, 2, OTTER_OUTLINE);
    // Otter base body
    rect(5, 4, 6, 8, PALETTE.otterBase);
    rect(6, 5, 4, 6, PALETTE.otterBelly);
    rect(5, 2, 6, 4, PALETTE.otterBase);
    // Face
    p(6, 3, PALETTE.black);
    p(9, 3, PALETTE.black);
    p(7, 4, PALETTE.otterNose);
    p(8, 4, PALETTE.otterNose);
    // Nose highlight for 3D feel
    p(8, 4, OTTER_NOSE_HIGHLIGHT);
    // Arms
    rect(4, 5, 1, 4, PALETTE.otterBase);
    rect(11, 5, 1, 4, PALETTE.otterBase);
    // Legs & tail
    rect(5, 12, 2, 2, PALETTE.otterBase);
    rect(9, 12, 2, 2, PALETTE.otterBase);
    rect(11, 10, 3, 2, PALETTE.otterBase);
    // Type-specific items
    if (type === 'gatherer') {
      rect(3, 5, 2, 2, PALETTE.clamShell);
    }
    if (type === 'brawler') {
      rect(12, 4, 2, 7, PALETTE.reedBrown);
      rect(6, 1, 4, 2, PALETTE.clamShell);
    }
    if (type === 'sniper') {
      rect(13, 4, 1, 8, PALETTE.reedBrown);
      rect(12, 4, 1, 1, PALETTE.stoneL);
      rect(12, 11, 1, 1, PALETTE.stoneL);
    }
  } else if (type === 'gator') {
    rect(3, 10, 10, 4, PALETTE.gatorBase);
    for (let i = 3; i < 12; i += 2) p(i, 9, PALETTE.gatorLight);
    // Scale highlight pattern
    p(5, 11, GATOR_SCALE_HIGHLIGHT);
    p(8, 10, GATOR_SCALE_HIGHLIGHT);
    p(11, 11, GATOR_SCALE_HIGHLIGHT);
    rect(13, 11, 3, 2, PALETTE.gatorBase);
    rect(0, 11, 4, 3, PALETTE.gatorLight);
    p(3, 10, PALETTE.gatorEye);
    // Teeth detail (white pixels at mouth)
    p(0, 13, '#ffffff');
    p(1, 13, '#ffffff');
    rect(3, 14, 2, 1, PALETTE.gatorLight);
    rect(9, 14, 2, 1, PALETTE.gatorLight);
  } else if (type === 'snake') {
    rect(4, 12, 8, 2, PALETTE.snakeBase);
    rect(2, 10, 4, 2, PALETTE.snakeBase);
    rect(10, 10, 4, 2, PALETTE.snakeBase);
    rect(12, 8, 2, 2, PALETTE.snakeBase);
    p(13, 8, PALETTE.black);
    p(14, 9, PALETTE.clamMeat);
    // Teeth detail
    p(14, 10, '#ffffff');
    // Scale highlights
    p(6, 11, GATOR_SCALE_HIGHLIGHT);
    p(10, 11, GATOR_SCALE_HIGHLIGHT);
    p(5, 12, PALETTE.snakeStripe);
    p(7, 12, PALETTE.snakeStripe);
    p(9, 12, PALETTE.snakeStripe);
  } else if (type === 'cattail') {
    rect(7, 4, 2, 10, PALETTE.reedGreen);
    rect(6, 2, 4, 6, PALETTE.reedBrown);
    p(7, 1, PALETTE.otterBase);
    p(8, 1, PALETTE.otterBase);
    p(8, 12, PALETTE.reedGreen);
    p(9, 11, PALETTE.reedGreen);
  } else if (type === 'clambed') {
    circle(8, 10, 6, PALETTE.waterShallow);
    rect(5, 9, 2, 2, PALETTE.clamShell);
    p(6, 9, PALETTE.stone);
    rect(9, 11, 3, 2, PALETTE.clamShell);
    p(10, 11, PALETTE.stone);
    rect(7, 13, 2, 2, PALETTE.clamShell);
  } else if (type === 'bones') {
    rect(6, 6, 4, 4, '#cbd5e1');
    p(7, 7, '#000');
    p(8, 7, '#000');
    rect(7, 10, 2, 4, '#cbd5e1');
    rect(5, 11, 6, 1, '#cbd5e1');
    rect(6, 13, 4, 1, '#cbd5e1');
  } else if (type === 'rubble') {
    for (let i = 0; i < 40; i++) {
      const rx = Math.round(4 + Math.random() * 24);
      const ry = Math.round(16 + Math.random() * 12);
      const width = Math.max(1, Math.round(Math.random() * 4 + 1));
      const height = Math.max(1, Math.round(Math.random() * 2 + 1));
      rect(rx, ry, width, height, Math.random() > 0.5 ? PALETTE.mudDark : PALETTE.wood);
    }
  } else if (type === 'tower') {
    rect(8, 16, 16, 14, PALETTE.mudLight);
    for (let i = 0; i < 30; i++)
      p(8 + Math.random() * 16, 16 + Math.random() * 14, PALETTE.mudDark);
    // Wood grain texture
    for (let i = 0; i < 15; i++) p(9 + Math.random() * 14, 17 + Math.random() * 12, '#5c2d0a');
    rect(6, 8, 20, 8, PALETTE.mudDark);
    rect(10, 4, 12, 4, PALETTE.reedGreen);
    rect(14, 22, 4, 8, PALETTE.black);
    // Doorway glow
    p(15, 23, DOORWAY_GLOW);
    p(16, 23, DOORWAY_GLOW);
    rect(14, 12, 4, 2, PALETTE.black);
    // Flame at top
    p(15, 5, FLAME_ORANGE);
    p(16, 5, FLAME_ORANGE);
    p(15, 4, FLAME_YELLOW);
  } else if (type === 'predator_nest') {
    circle(16, 16, 12, PALETTE.mudDark);
    circle(16, 18, 8, PALETTE.black);
    rect(6, 10, 2, 16, PALETTE.gatorBase);
    rect(24, 12, 2, 14, PALETTE.gatorBase);
    rect(10, 6, 2, 12, PALETTE.gatorBase);
    p(14, 16, PALETTE.gatorEye);
    p(18, 16, PALETTE.gatorEye);
  } else if (type === 'lodge') {
    circle(16, 20, 14, PALETTE.mudDark);
    for (let i = 0; i < 80; i++)
      p(4 + Math.random() * 24, 8 + Math.random() * 24, PALETTE.mudLight);
    for (let i = 0; i < 40; i++)
      rect(4 + Math.random() * 22, 10 + Math.random() * 18, 6, 2, PALETTE.otterBase);
    // Wood grain texture (random darker pixels within brown areas)
    for (let i = 0; i < 25; i++) p(6 + Math.random() * 20, 10 + Math.random() * 18, '#5c2d0a');
    rect(12, 22, 8, 8, PALETTE.black);
    // Doorway glow effect
    p(15, 23, DOORWAY_GLOW);
    p(16, 23, DOORWAY_GLOW);
    p(15, 24, DOORWAY_GLOW);
    p(16, 24, DOORWAY_GLOW);
  } else if (type === 'burrow') {
    circle(16, 24, 8, PALETTE.mudDark);
    for (let i = 0; i < 20; i++)
      p(8 + Math.random() * 16, 16 + Math.random() * 8, PALETTE.mudLight);
    // Wood grain texture
    for (let i = 0; i < 10; i++) p(10 + Math.random() * 12, 18 + Math.random() * 6, '#5c2d0a');
    rect(14, 24, 4, 6, PALETTE.black);
    // Doorway glow effect
    p(15, 25, DOORWAY_GLOW);
    p(16, 25, DOORWAY_GLOW);
  } else if (type === 'healer') {
    // Shadow under feet
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(5, 14, 6, 1);
    // Dark outline
    rect(4, 3, 1, 10, OTTER_OUTLINE);
    rect(12, 3, 1, 10, OTTER_OUTLINE);
    rect(5, 1, 6, 1, OTTER_OUTLINE);
    // Otter body (same as gatherer base)
    rect(5, 4, 6, 8, PALETTE.otterBase);
    rect(6, 5, 4, 6, PALETTE.otterBelly);
    rect(5, 2, 6, 4, PALETTE.otterBase);
    p(6, 3, PALETTE.black);
    p(9, 3, PALETTE.black);
    p(7, 4, PALETTE.otterNose);
    p(8, 4, PALETTE.otterNose);
    // Nose highlight
    p(8, 4, OTTER_NOSE_HIGHLIGHT);
    rect(4, 5, 1, 4, PALETTE.otterBase);
    rect(11, 5, 1, 4, PALETTE.otterBase);
    rect(5, 12, 2, 2, PALETTE.otterBase);
    rect(9, 12, 2, 2, PALETTE.otterBase);
    rect(11, 10, 3, 2, PALETTE.otterBase);
    // Green cross (healer mark)
    rect(7, 6, 2, 5, '#22c55e');
    rect(6, 8, 4, 1, '#22c55e');
  } else if (type === 'watchtower') {
    rect(6, 12, 20, 18, PALETTE.stone);
    for (let i = 0; i < 40; i++) p(6 + Math.random() * 20, 12 + Math.random() * 18, PALETTE.stoneL);
    // Wood grain texture in stone areas
    for (let i = 0; i < 15; i++) p(8 + Math.random() * 16, 14 + Math.random() * 14, '#374151');
    rect(4, 6, 24, 6, PALETTE.stone);
    rect(8, 2, 16, 4, '#64748b');
    rect(12, 22, 8, 10, PALETTE.black);
    // Doorway glow
    p(15, 23, DOORWAY_GLOW);
    p(16, 23, DOORWAY_GLOW);
    // Flame at top
    p(15, 4, FLAME_ORANGE);
    p(16, 4, FLAME_ORANGE);
    p(15, 3, FLAME_YELLOW);
    // Flag
    rect(22, 0, 1, 8, PALETTE.otterBase);
    rect(23, 0, 6, 4, '#ef4444');
  } else if (type === 'boss_croc') {
    // Large body
    rect(4, 14, 24, 8, PALETTE.gatorBase);
    for (let i = 4; i < 28; i += 2) p(i, 13, PALETTE.gatorLight);
    // Scale highlight pattern
    p(8, 16, GATOR_SCALE_HIGHLIGHT);
    p(14, 15, GATOR_SCALE_HIGHLIGHT);
    p(20, 16, GATOR_SCALE_HIGHLIGHT);
    p(24, 15, GATOR_SCALE_HIGHLIGHT);
    rect(0, 16, 8, 6, PALETTE.gatorLight); // Head
    // Glowing red eyes (bright red instead of gatorEye)
    p(2, 15, '#ff0000');
    p(5, 15, '#ff0000');
    // Eye glow (slightly larger highlight)
    p(2, 14, '#cc0000');
    p(5, 14, '#cc0000');
    // Teeth detail
    p(0, 21, '#ffffff');
    p(1, 21, '#ffffff');
    p(6, 21, '#ffffff');
    p(7, 21, '#ffffff');
    rect(26, 16, 6, 4, PALETTE.gatorBase); // Tail
    // Armor plates
    for (let i = 8; i < 24; i += 4) {
      rect(i, 12, 3, 2, PALETTE.stone);
    }
    rect(4, 22, 4, 2, PALETTE.gatorLight);
    rect(20, 22, 4, 2, PALETTE.gatorLight);
  } else if (type === 'armory') {
    rect(4, 12, 24, 16, PALETTE.waterMid);
    rect(2, 10, 28, 4, PALETTE.mudDark);
    rect(2, 10, 4, 20, PALETTE.mudDark);
    rect(26, 10, 4, 20, PALETTE.mudDark);
    rect(2, 26, 28, 4, PALETTE.mudDark);
    for (let i = 0; i < 30; i++) {
      p(2 + Math.random() * 28, 10 + Math.random() * 4, PALETTE.otterBase);
      p(2 + Math.random() * 28, 26 + Math.random() * 4, PALETTE.otterBase);
    }
    // Wood grain texture on frame
    for (let i = 0; i < 20; i++) p(3 + Math.random() * 26, 10 + Math.random() * 20, '#5c2d0a');
    rect(12, 24, 8, 8, PALETTE.waterShallow);
    // Doorway glow
    p(15, 25, DOORWAY_GLOW);
    p(16, 25, DOORWAY_GLOW);
    rect(22, 4, 4, 8, PALETTE.stoneL);
    p(23, 4, PALETTE.black);
    p(24, 4, PALETTE.black);
  } else if (type === 'shieldbearer') {
    // Shadow under feet
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(5, 14, 6, 1);
    // Dark outline
    rect(4, 3, 1, 10, OTTER_OUTLINE);
    rect(12, 3, 1, 10, OTTER_OUTLINE);
    rect(5, 1, 6, 1, OTTER_OUTLINE);
    // Otter body base (same as gatherer)
    rect(5, 4, 6, 8, PALETTE.otterBase);
    rect(6, 5, 4, 6, PALETTE.otterBelly);
    rect(5, 2, 6, 4, PALETTE.otterBase);
    p(6, 3, PALETTE.black);
    p(9, 3, PALETTE.black);
    p(7, 4, PALETTE.otterNose);
    p(8, 4, PALETTE.otterNose);
    // Nose highlight
    p(8, 4, OTTER_NOSE_HIGHLIGHT);
    rect(4, 5, 1, 4, PALETTE.otterBase);
    rect(11, 5, 1, 4, PALETTE.otterBase);
    rect(5, 12, 2, 2, PALETTE.otterBase);
    rect(9, 12, 2, 2, PALETTE.otterBase);
    rect(11, 10, 3, 2, PALETTE.otterBase);
    // Large clamshell shield in front
    rect(2, 5, 4, 6, PALETTE.clamShell);
    rect(1, 6, 1, 4, PALETTE.stoneL);
    p(3, 7, PALETTE.stone);
    p(3, 9, PALETTE.stone);
  } else if (type === 'scout') {
    // Shadow under feet
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(5, 14, 6, 1);
    // Dark outline
    rect(4, 5, 1, 8, OTTER_OUTLINE);
    rect(12, 5, 1, 8, OTTER_OUTLINE);
    rect(5, 3, 6, 1, OTTER_OUTLINE);
    // Smaller crouching otter body
    rect(5, 6, 6, 6, PALETTE.otterBase);
    rect(6, 7, 4, 4, PALETTE.otterBelly);
    rect(5, 4, 6, 4, PALETTE.otterBase);
    p(6, 5, PALETTE.black);
    p(9, 5, PALETTE.black);
    p(7, 6, PALETTE.otterNose);
    p(8, 6, PALETTE.otterNose);
    // Nose highlight
    p(8, 6, OTTER_NOSE_HIGHLIGHT);
    // Goggles (cyan pixels)
    p(5, 5, '#06b6d4');
    p(10, 5, '#06b6d4');
    rect(4, 7, 1, 3, PALETTE.otterBase);
    rect(11, 7, 1, 3, PALETTE.otterBase);
    rect(5, 12, 2, 2, PALETTE.otterBase);
    rect(9, 12, 2, 2, PALETTE.otterBase);
    rect(11, 10, 3, 1, PALETTE.otterBase);
  } else if (type === 'catapult') {
    // Wooden frame
    rect(4, 20, 24, 4, PALETTE.reedBrown);
    rect(6, 14, 4, 10, PALETTE.reedBrown);
    rect(22, 14, 4, 10, PALETTE.reedBrown);
    // Bowl/basket on top
    rect(8, 10, 10, 4, PALETTE.mudDark);
    rect(10, 8, 6, 2, PALETTE.mudDark);
    // Arm
    rect(14, 4, 2, 10, PALETTE.reedBrown);
    // Wheels
    circle(8, 26, 3, PALETTE.stoneL);
    circle(24, 26, 3, PALETTE.stoneL);
    p(8, 26, PALETTE.stone);
    p(24, 26, PALETTE.stone);
    // Small otter operator
    rect(16, 18, 4, 4, PALETTE.otterBase);
    rect(16, 16, 4, 2, PALETTE.otterBase);
    p(17, 17, PALETTE.black);
    p(19, 17, PALETTE.black);
  } else if (type === 'wall') {
    // Horizontal mud/stick barrier
    rect(2, 12, 28, 8, PALETTE.mudDark);
    rect(4, 10, 24, 2, PALETTE.mudLight);
    rect(4, 20, 24, 2, PALETTE.mudLight);
    // Stick texture
    for (let i = 0; i < 6; i++) {
      rect(4 + i * 4, 12, 2, 8, PALETTE.otterBase);
    }
    // Top ridge
    rect(6, 8, 20, 2, PALETTE.reedBrown);
  } else if (type === 'scout_post') {
    // Tall vertical pole
    rect(14, 4, 4, 24, PALETTE.reedBrown);
    // Platform at top
    rect(10, 4, 12, 3, PALETTE.mudLight);
    rect(8, 2, 16, 2, PALETTE.mudDark);
    // Flag (sky blue)
    rect(24, 0, 1, 8, PALETTE.reedBrown);
    rect(25, 0, 6, 4, '#38bdf8');
    // Base stakes
    rect(10, 26, 4, 4, PALETTE.mudDark);
    rect(18, 26, 4, 4, PALETTE.mudDark);
    rect(6, 28, 20, 2, PALETTE.mudLight);
  } else if (type === 'armored_gator') {
    // Bulkier body - wider and darker than regular gator
    rect(2, 9, 12, 5, '#0f4a28'); // Darker green base
    rect(14, 10, 2, 3, '#0f4a28'); // Thick tail
    rect(0, 10, 4, 4, PALETTE.gatorLight); // Head
    p(1, 9, PALETTE.gatorEye);
    // Teeth
    p(0, 13, '#ffffff');
    p(1, 13, '#ffffff');
    rect(2, 14, 3, 1, PALETTE.gatorLight);
    rect(10, 14, 3, 1, PALETTE.gatorLight);
    // Heavy armor plates - larger and brighter to read at scale
    rect(3, 7, 3, 3, PALETTE.stoneL); // Front plate
    rect(7, 7, 3, 3, PALETTE.stoneL); // Mid plate
    rect(11, 8, 3, 2, PALETTE.stoneL); // Back plate
    // Plate detail (rivet dots)
    p(4, 8, '#d4d4d8');
    p(8, 8, '#d4d4d8');
    p(12, 9, '#d4d4d8');
    // Dark plate edges for depth
    rect(3, 10, 3, 1, PALETTE.stone);
    rect(7, 10, 3, 1, PALETTE.stone);
    rect(11, 10, 3, 1, PALETTE.stone);
  } else if (type === 'venom_snake') {
    // Purple/magenta snake body
    const venomBase = '#a855f7';
    const venomStripe = '#7c3aed';
    rect(4, 12, 8, 2, venomBase);
    rect(2, 10, 4, 2, venomBase);
    rect(10, 10, 4, 2, venomBase);
    rect(12, 8, 2, 2, venomBase);
    p(13, 8, PALETTE.black); // Eye
    p(14, 9, '#f87171'); // Red tongue
    // Teeth detail
    p(14, 10, '#ffffff');
    // Dripping venom fangs (green pixels at mouth)
    p(14, 11, '#22c55e');
    p(15, 10, '#22c55e');
    // Stripe pattern
    p(5, 12, venomStripe);
    p(7, 12, venomStripe);
    p(9, 12, venomStripe);
    // Scale highlights
    p(6, 11, '#c084fc');
    p(10, 11, '#c084fc');
  } else if (type === 'swamp_drake') {
    // Lizard body - centered higher to make room for large wings
    rect(4, 8, 8, 4, PALETTE.gatorBase);
    rect(12, 9, 3, 2, PALETTE.gatorBase); // Tail
    rect(1, 9, 3, 3, PALETTE.gatorLight); // Head
    p(2, 8, '#ff0000'); // Red eye
    p(2, 9, '#ff4444'); // Eye glow
    // Legs
    rect(5, 12, 2, 2, PALETTE.gatorLight);
    rect(10, 12, 2, 2, PALETTE.gatorLight);
    // LARGE wings - clearly visible bat-like shape
    // Left wing
    rect(3, 3, 2, 5, '#2d6a4f'); // Wing bone
    rect(1, 4, 4, 4, '#40916c'); // Wing membrane
    p(0, 5, '#40916c');
    p(0, 6, '#40916c');
    p(1, 3, '#52b788'); // Wing tip highlight
    // Right wing
    rect(11, 3, 2, 5, '#2d6a4f'); // Wing bone
    rect(11, 4, 4, 4, '#40916c'); // Wing membrane
    p(15, 5, '#40916c');
    p(15, 6, '#40916c');
    p(14, 3, '#52b788'); // Wing tip highlight
    // Wing connecting to body
    rect(5, 7, 6, 1, '#2d6a4f');
  } else if (type === 'siege_turtle') {
    // Massive shell - clear circular shape with hexagonal pattern
    circle(16, 16, 12, '#3d2b1f'); // Dark shell base
    circle(16, 16, 10, PALETTE.stone); // Stone shell
    // Hexagonal shell plates (clear pattern at 32x32)
    rect(12, 10, 4, 4, '#64748b');
    rect(17, 10, 4, 4, '#64748b');
    rect(10, 15, 4, 4, '#64748b');
    rect(15, 15, 4, 4, '#64748b');
    rect(20, 15, 4, 4, '#64748b');
    rect(12, 20, 4, 4, '#64748b');
    rect(17, 20, 4, 4, '#64748b');
    // Shell plate highlights
    p(14, 12, PALETTE.stoneL);
    p(19, 12, PALETTE.stoneL);
    p(17, 17, PALETTE.stoneL);
    // Stubby legs (clearly visible)
    rect(7, 22, 4, 4, PALETTE.gatorLight);
    rect(21, 22, 4, 4, PALETTE.gatorLight);
    rect(7, 8, 4, 4, PALETTE.gatorLight);
    rect(21, 8, 4, 4, PALETTE.gatorLight);
    // Head extending forward with battering ram
    rect(0, 13, 10, 6, PALETTE.gatorBase);
    rect(1, 14, 2, 2, PALETTE.gatorLight); // Snout
    p(3, 13, PALETTE.gatorEye); // Eye
    // Battering ram (iron-tipped log)
    rect(0, 15, 3, 2, '#78350f');
    p(0, 15, PALETTE.stoneL); // Iron tip
    p(0, 16, PALETTE.stoneL);
  } else if (type === 'alpha_predator') {
    // Massive gator body (larger than BossCroc)
    rect(2, 14, 28, 10, PALETTE.gatorBase);
    for (let i = 2; i < 30; i += 2) p(i, 13, PALETTE.gatorLight);
    // Scale highlights
    p(8, 16, '#34d399');
    p(14, 15, '#34d399');
    p(20, 16, '#34d399');
    p(26, 15, '#34d399');
    // Head
    rect(0, 16, 6, 8, PALETTE.gatorLight);
    // Glowing bright red eyes
    p(1, 15, '#ff0000');
    p(4, 15, '#ff0000');
    // Eye glow effect
    p(1, 14, '#ff4444');
    p(4, 14, '#ff4444');
    // Teeth
    p(0, 23, '#ffffff');
    p(1, 23, '#ffffff');
    p(4, 23, '#ffffff');
    p(5, 23, '#ffffff');
    // Tail
    rect(28, 16, 4, 4, PALETTE.gatorBase);
    // Armor plates (heavier than BossCroc)
    for (let i = 6; i < 26; i += 4) {
      rect(i, 12, 3, 2, PALETTE.stone);
      rect(i, 10, 3, 1, PALETTE.stoneL);
    }
    // Crown of bone spikes (white pixels on head)
    p(1, 12, '#ffffff');
    p(3, 11, '#ffffff');
    p(5, 12, '#ffffff');
    p(2, 10, '#e2e8f0');
    p(4, 10, '#e2e8f0');
    // Legs
    rect(6, 24, 4, 2, PALETTE.gatorLight);
    rect(22, 24, 4, 2, PALETTE.gatorLight);
  } else if (type === 'pearl_bed') {
    // Shallow water with iridescent pearls
    circle(8, 10, 6, PALETTE.waterShallow);
    // Pearl clusters (white/pink)
    circle(6, 8, 2, '#e2e8f0');
    p(6, 8, '#fce7f3');
    circle(10, 11, 2, '#e2e8f0');
    p(10, 11, '#fce7f3');
    circle(7, 12, 1, '#e2e8f0');
    p(7, 12, '#fce7f3');
    // Shell bed around base
    rect(4, 13, 3, 1, PALETTE.clamShell);
    rect(9, 13, 3, 1, PALETTE.clamShell);
  } else if (type === 'fishing_hut') {
    // Stilted hut over water
    rect(8, 14, 16, 12, PALETTE.reedBrown);
    rect(6, 12, 20, 2, PALETTE.mudDark);
    // Stilts into water
    rect(10, 26, 2, 6, PALETTE.reedBrown);
    rect(20, 26, 2, 6, PALETTE.reedBrown);
    // Water below
    rect(6, 28, 20, 4, PALETTE.waterShallow);
    // Roof
    rect(6, 8, 20, 4, PALETTE.mudLight);
    // Doorway
    rect(14, 18, 4, 8, PALETTE.black);
    p(15, 19, DOORWAY_GLOW);
    p(16, 19, DOORWAY_GLOW);
    // Fish on rack
    rect(22, 14, 2, 4, PALETTE.waterMid);
  } else if (type === 'herbalist_hut') {
    // Small round hut with green roof
    circle(16, 20, 10, PALETTE.mudDark);
    for (let i = 0; i < 30; i++)
      p(8 + Math.random() * 16, 12 + Math.random() * 16, PALETTE.mudLight);
    // Green leaf roof
    rect(8, 8, 16, 6, PALETTE.reedGreen);
    rect(6, 10, 20, 4, PALETTE.reedGreen);
    // Leaf highlights
    for (let i = 0; i < 8; i++) p(8 + Math.random() * 14, 8 + Math.random() * 6, '#86efac');
    // Doorway
    rect(13, 22, 6, 8, PALETTE.black);
    p(15, 23, DOORWAY_GLOW);
    p(16, 23, DOORWAY_GLOW);
    // Herb bundles hanging (green dots near door)
    p(10, 16, '#22c55e');
    p(22, 16, '#22c55e');
    p(11, 18, '#4ade80');
    p(21, 18, '#4ade80');
  } else if (type === 'swimmer') {
    // Otter in swimming pose - horizontal body with water highlights
    // Shadow under body
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(3, 12, 10, 1);
    // Water splash highlights around body
    p(2, 10, '#38bdf8');
    p(13, 10, '#38bdf8');
    p(1, 8, '#38bdf8');
    p(14, 8, '#38bdf8');
    p(3, 12, '#38bdf8');
    p(12, 12, '#38bdf8');
    // Horizontal otter body (swimming pose)
    rect(4, 7, 8, 4, PALETTE.otterBase);
    rect(5, 8, 6, 2, PALETTE.otterBelly);
    // Head (front)
    rect(11, 6, 3, 4, PALETTE.otterBase);
    p(12, 6, PALETTE.black); // Eye
    p(13, 7, PALETTE.otterNose); // Nose
    // Flippers out
    rect(5, 5, 2, 2, PALETTE.otterBase); // Top flipper
    rect(5, 11, 2, 2, PALETTE.otterBase); // Bottom flipper
    rect(9, 5, 2, 2, PALETTE.otterBase); // Top flipper
    rect(9, 11, 2, 2, PALETTE.otterBase); // Bottom flipper
    // Tail
    rect(2, 8, 2, 2, PALETTE.otterBase);
    rect(1, 9, 1, 1, PALETTE.otterBase);
  } else if (type === 'trapper') {
    // Otter with a net/rope item
    // Shadow under feet
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(5, 14, 6, 1);
    // Dark outline
    rect(4, 3, 1, 10, OTTER_OUTLINE);
    rect(12, 3, 1, 10, OTTER_OUTLINE);
    rect(5, 1, 6, 1, OTTER_OUTLINE);
    // Otter body base (same as gatherer)
    rect(5, 4, 6, 8, PALETTE.otterBase);
    rect(6, 5, 4, 6, PALETTE.otterBelly);
    rect(5, 2, 6, 4, PALETTE.otterBase);
    p(6, 3, PALETTE.black);
    p(9, 3, PALETTE.black);
    p(7, 4, PALETTE.otterNose);
    p(8, 4, PALETTE.otterNose);
    // Nose highlight
    p(8, 4, OTTER_NOSE_HIGHLIGHT);
    rect(4, 5, 1, 4, PALETTE.otterBase);
    rect(11, 5, 1, 4, PALETTE.otterBase);
    rect(5, 12, 2, 2, PALETTE.otterBase);
    rect(9, 12, 2, 2, PALETTE.otterBase);
    rect(11, 10, 3, 2, PALETTE.otterBase);
    // Rope/net item in hands (amber colored)
    rect(2, 5, 3, 1, '#f59e0b');
    rect(1, 6, 1, 3, '#f59e0b');
    rect(4, 6, 1, 3, '#f59e0b');
    rect(2, 8, 3, 1, '#f59e0b');
    // Net cross-hatch pattern
    p(2, 6, '#d97706');
    p(3, 7, '#d97706');
    p(2, 8, '#d97706');
  }

  // Scale up with nearest-neighbour (no smoothing)
  const scale = LARGE_TYPES.has(type) ? 3 : 2.5;
  const sCanvas = document.createElement('canvas');
  sCanvas.width = size * scale;
  sCanvas.height = size * scale;
  const sCtx = sCanvas.getContext('2d')!;
  sCtx.imageSmoothingEnabled = false;
  sCtx.drawImage(c, 0, 0, size * scale, size * scale);

  return sCanvas;
}

/**
 * Generate all 14 sprite types and return a Map<SpriteId, HTMLCanvasElement>
 * for Canvas2D usage.
 */
export function generateAllSprites(): {
  canvases: Map<SpriteId, HTMLCanvasElement>;
} {
  const canvases = new Map<SpriteId, HTMLCanvasElement>();

  for (const { name, id } of SPRITE_NAMES) {
    const canvas = generateSpriteCanvas(name);
    canvases.set(id, canvas);
    // Register as a PixiJS Texture for the main game renderer
    registerSpriteTexture(id, canvas);
  }

  return { canvases };
}

/** Convenience: get the sprite canvas dimensions for a given SpriteId. */
const LARGE_SPRITE_IDS = new Set<SpriteId>([
  SpriteId.Lodge,
  SpriteId.Burrow,
  SpriteId.Armory,
  SpriteId.Tower,
  SpriteId.PredatorNest,
  SpriteId.Rubble,
  SpriteId.Watchtower,
  SpriteId.BossCroc,
  SpriteId.Catapult,
  SpriteId.Wall,
  SpriteId.ScoutPost,
  SpriteId.SiegeTurtle,
  SpriteId.AlphaPredator,
  SpriteId.FishingHut,
  SpriteId.HerbalistHut,
]);

export function getSpriteSize(id: SpriteId): { width: number; height: number } {
  const isLarge = LARGE_SPRITE_IDS.has(id);
  const baseSize = isLarge ? 32 : 16;
  const scale = isLarge ? 3 : 2.5;
  return { width: baseSize * scale, height: baseSize * scale };
}
