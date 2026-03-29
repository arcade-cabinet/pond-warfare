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

export const ENEMY_STARTING_CLAMS = 500;
export const ENEMY_STARTING_TWIGS = 200;
export const ENEMY_GATHERER_SPAWN_INTERVAL = 900; // Faster early eco (was 1200)
export const ENEMY_GATHERER_COST = 50;
export const ENEMY_MAX_GATHERERS_PER_NEST = 4; // More gatherers for stronger eco
export const ENEMY_GATHERER_RADIUS = 500;

// Enemy AI building construction
export const ENEMY_BUILD_CHECK_INTERVAL = 1800; // Check every 30 seconds
export const ENEMY_TOWER_COST_CLAMS = 200;
export const ENEMY_TOWER_COST_TWIGS = 250;
export const ENEMY_BURROW_COST_CLAMS = 0;
export const ENEMY_BURROW_COST_TWIGS = 100;
export const ENEMY_NEST_COST_CLAMS = 400;
export const ENEMY_NEST_COST_TWIGS = 300;
export const ENEMY_BUILD_RADIUS = 200; // Max distance from nest to place building

// Enemy AI army training
export const ENEMY_TRAIN_CHECK_INTERVAL = 300; // Check every 5 seconds
export const ENEMY_GATOR_COST_CLAMS = 100;
export const ENEMY_GATOR_COST_TWIGS = 50;
export const ENEMY_SNAKE_COST_CLAMS = 80;
export const ENEMY_SNAKE_COST_TWIGS = 30;
export const ENEMY_TRAIN_TIME = 240; // Frames to train one unit

// Enemy AI attack decision-making
export const ENEMY_ATTACK_CHECK_INTERVAL = 600; // Check every 10 seconds
export const ENEMY_ARMY_ATTACK_THRESHOLD = 5; // Min army size to attack (early game)
export const ENEMY_RETREAT_HP_PERCENT = 0.2; // Retreat below 20% HP
export const ENEMY_SCOUT_INTERVAL = 3600; // Send scout every 60 seconds
export const ENEMY_RALLY_RADIUS = 150; // Rally point radius for grouping

// Enemy AI difficulty scaling over time
export const ENEMY_MID_GAME_FRAME = 18000; // 5 minutes (300s * 60fps)
export const ENEMY_LATE_GAME_FRAME = 36000; // 10 minutes (600s * 60fps)
export const ENEMY_LATE_TRAIN_INTERVAL = 180; // Faster training checks in late game
export const ENEMY_LATE_ATTACK_THRESHOLD = 3; // Attack with smaller armies late game
export const ENEMY_MAX_NESTS_LATE = 5; // Allow more expansion nests in late game
export const ENEMY_LATE_BUILD_INTERVAL = 1200; // Faster building checks in late game

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

export const CB_PALETTE = {
  playerColor: '#38bdf8', // Blue (unchanged, already good)
  enemyColor: '#f59e0b', // Amber instead of red
  healthHigh: '#38bdf8', // Blue instead of green
  healthMid: '#f59e0b', // Amber instead of yellow
  healthLow: '#ef4444', // Keep red (distinctive)
  gatherPositive: '#38bdf8', // Blue instead of green
  gatherNegative: '#ef4444', // Keep red
} as const;

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

export const SPEED_LEVELS = [1, 2, 3, 5, 10] as const;

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

// Veterancy system
export const VET_THRESHOLDS = [0, 3, 7, 15]; // kills needed for each rank
export const VET_HP_BONUS = [0, 0.1, 0.2, 0.35];
export const VET_DMG_BONUS = [0, 0.15, 0.25, 0.4];
export const VET_SPD_BONUS = [0, 0, 0.1, 0.15];
export const VET_RANK_NAMES = ['Recruit', 'Veteran', 'Elite', 'Hero'];
