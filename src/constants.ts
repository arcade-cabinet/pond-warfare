export const TILE_SIZE = 32;
export const MAP_WIDTH = 80;
export const MAP_HEIGHT = 80;
export const WORLD_WIDTH = MAP_WIDTH * TILE_SIZE;
export const WORLD_HEIGHT = MAP_HEIGHT * TILE_SIZE;

export const PEACE_TIMER_FRAMES = 10800;
export const DAY_FRAMES = 28800;
export const WAVE_INTERVAL = 1800;
export const MAX_WAVE_SIZE = 6;
export const WAVE_SCALE_INTERVAL = 7200;

export const GATHER_AMOUNT = 10;
export const GATHER_TIMER = 60;
export const BUILD_TIMER = 30;
export const REPAIR_TIMER = 40;
export const TRAIN_TIMER = 180;
export const ATTACK_COOLDOWN = 60;
export const TOWER_ATTACK_COOLDOWN = 50;

export const STARTING_CLAMS = 200;
export const STARTING_TWIGS = 50;

export const PALETTE = {
  otterBase: '#78350f',
  otterBelly: '#b45309',
  otterNose: '#000000',
  gatorBase: '#166534',
  gatorLight: '#22c55e',
  gatorEye: '#fef08a',
  snakeBase: '#65a30d',
  snakeStripe: '#facc15',
  waterDeep: '#0f2b32',
  waterMid: '#11525c',
  waterShallow: '#1e3a5f',
  mudDark: '#451a03',
  mudLight: '#713f12',
  wood: '#92400e',
  clamShell: '#cbd5e1',
  clamMeat: '#f87171',
  reedGreen: '#4ade80',
  reedBrown: '#92400e',
  stone: '#4b5563',
  stoneL: '#9ca3af',
  shadow: 'rgba(0,0,0,0.3)',
  black: '#000000',
} as const;

export type PaletteColor = (typeof PALETTE)[keyof typeof PALETTE];

export const TIME_STOPS = [
  { h: 0, c: [15, 20, 45] as const },
  { h: 5, c: [15, 20, 45] as const },
  { h: 6, c: [250, 140, 100] as const },
  { h: 8, c: [255, 255, 255] as const },
  { h: 18, c: [255, 255, 255] as const },
  { h: 19, c: [160, 90, 140] as const },
  { h: 20, c: [15, 20, 45] as const },
  { h: 24, c: [15, 20, 45] as const },
] as const;

export const SPEED_LEVELS = [1, 2, 3] as const;

export const MINIMAP_SIZE = 200;
export const FOG_TEXTURE_SIZE = 256;
export const EXPLORED_SCALE = 16;

export const UNIT_SIGHT_RADIUS = 150;
export const BUILDING_SIGHT_RADIUS = 250;

export const AGGRO_RADIUS_ENEMY = 250;
export const AGGRO_RADIUS_PLAYER = 200;
export const AUTO_GATHER_RADIUS = 120;
export const ALLY_ASSIST_RADIUS = 300;

export const COLLISION_PUSH_FORCE = 0.15;
export const WORLD_BOUNDS_MARGIN = 20;

export const PROJECTILE_SPEED = 8;
