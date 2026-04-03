export type TechBranch = 'lodge' | 'nature' | 'warfare' | 'fortifications' | 'shadow';

export type TechId =
  // Lodge (Economy & Expansion)
  | 'cartography'
  | 'tidalHarvest'
  | 'tradeRoutes'
  | 'deepDiving'
  | 'rootNetwork'
  // Nature (Support & Healing)
  | 'herbalMedicine'
  | 'aquaticTraining'
  | 'pondBlessing'
  | 'tidalSurge'
  | 'regeneration'
  // Warfare (Offense & Damage)
  | 'sharpSticks'
  | 'eagleEye'
  | 'battleRoar'
  | 'piercingShot'
  | 'warDrums'
  // Fortifications (Defense & Siege)
  | 'sturdyMud'
  | 'ironShell'
  | 'fortifiedWalls'
  | 'siegeWorks'
  | 'hardenedShells'
  // Shadow (Subterfuge & Control)
  | 'swiftPaws'
  | 'cunningTraps'
  | 'rallyCry'
  | 'camouflage'
  | 'venomCoating';

export interface TechUpgrade {
  id: TechId;
  name: string;
  description: string;
  clamCost: number;
  twigCost: number;
  pearlCost?: number;
  requires?: TechId;
  branch: TechBranch;
}

export const TECH_UPGRADES = {
  // ── Lodge (Economy & Expansion) ──────────────────────────────────
  cartography: {
    id: 'cartography',
    name: 'Cartography',
    description: 'Unlocks Scout Post. +25% fog reveal.',
    clamCost: 100,
    twigCost: 50,
    branch: 'lodge',
  },
  tidalHarvest: {
    id: 'tidalHarvest',
    name: 'Tidal Harvest',
    description: 'Gatherers collect +25% resources',
    clamCost: 100,
    twigCost: 75,
    branch: 'lodge',
  },
  tradeRoutes: {
    id: 'tradeRoutes',
    name: 'Trade Routes',
    description: '+2 clams/sec passive income per Market',
    clamCost: 200,
    twigCost: 150,
    requires: 'cartography',
    branch: 'lodge',
  },
  deepDiving: {
    id: 'deepDiving',
    name: 'Deep Diving',
    description: 'Unlocks pearl gathering',
    clamCost: 150,
    twigCost: 100,
    requires: 'tidalHarvest',
    branch: 'lodge',
  },
  rootNetwork: {
    id: 'rootNetwork',
    name: 'Root Network',
    description: 'Gatherers auto-path to richest resource node',
    clamCost: 200,
    twigCost: 200,
    requires: 'deepDiving',
    branch: 'lodge',
  },

  // ── Nature (Support & Healing) ───────────────────────────────────
  herbalMedicine: {
    id: 'herbalMedicine',
    name: 'Herbal Medicine',
    description: 'Unlocks Herbalist Hut, Healer unit',
    clamCost: 100,
    twigCost: 75,
    branch: 'nature',
  },
  aquaticTraining: {
    id: 'aquaticTraining',
    name: 'Aquatic Training',
    description: 'Unlocks Swimmer unit',
    clamCost: 150,
    twigCost: 100,
    requires: 'herbalMedicine',
    branch: 'nature',
  },
  pondBlessing: {
    id: 'pondBlessing',
    name: 'Pond Blessing',
    description: 'Active: heal all units 20% HP (120s cooldown)',
    clamCost: 200,
    twigCost: 150,
    pearlCost: 20,
    requires: 'herbalMedicine',
    branch: 'nature',
  },
  tidalSurge: {
    id: 'tidalSurge',
    name: 'Tidal Surge',
    description: 'Active: push enemies back + slow',
    clamCost: 300,
    twigCost: 200,
    pearlCost: 40,
    requires: 'deepDiving',
    branch: 'nature',
  },
  regeneration: {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'All units regen 1 HP/5s when out of combat 5s',
    clamCost: 250,
    twigCost: 200,
    requires: 'aquaticTraining',
    branch: 'nature',
  },

  // ── Warfare (Offense & Damage) ───────────────────────────────────
  sharpSticks: {
    id: 'sharpSticks',
    name: 'Sharp Sticks',
    description: 'All melee +15% damage',
    clamCost: 100,
    twigCost: 50,
    branch: 'warfare',
  },
  eagleEye: {
    id: 'eagleEye',
    name: 'Eagle Eye',
    description: 'All ranged +20% range',
    clamCost: 200,
    twigCost: 150,
    requires: 'sharpSticks',
    branch: 'warfare',
  },
  battleRoar: {
    id: 'battleRoar',
    name: 'Battle Roar',
    description: 'Units deal +10% damage near Commander',
    clamCost: 150,
    twigCost: 100,
    requires: 'sharpSticks',
    branch: 'warfare',
  },
  piercingShot: {
    id: 'piercingShot',
    name: 'Piercing Shot',
    description: 'Ranged attacks ignore 30% armor',
    clamCost: 300,
    twigCost: 200,
    requires: 'eagleEye',
    branch: 'warfare',
  },
  warDrums: {
    id: 'warDrums',
    name: 'War Drums',
    description: '+15% melee damage aura near any building (300px)',
    clamCost: 350,
    twigCost: 250,
    requires: 'battleRoar',
    branch: 'warfare',
  },

  // ── Fortifications (Defense & Siege) ─────────────────────────────
  sturdyMud: {
    id: 'sturdyMud',
    name: 'Sturdy Mud',
    description: 'All buildings +30% HP',
    clamCost: 100,
    twigCost: 75,
    branch: 'fortifications',
  },
  ironShell: {
    id: 'ironShell',
    name: 'Iron Shell',
    description: 'Unlocks Shieldbearer unit',
    clamCost: 200,
    twigCost: 150,
    requires: 'sharpSticks',
    branch: 'fortifications',
  },
  fortifiedWalls: {
    id: 'fortifiedWalls',
    name: 'Fortified Walls',
    description: 'Wall HP +100, walls slow enemies',
    clamCost: 250,
    twigCost: 200,
    requires: 'sturdyMud',
    branch: 'fortifications',
  },
  siegeWorks: {
    id: 'siegeWorks',
    name: 'Siege Works',
    description: 'Unlocks Catapult unit',
    clamCost: 300,
    twigCost: 250,
    pearlCost: 50,
    requires: 'eagleEye',
    branch: 'fortifications',
  },
  hardenedShells: {
    id: 'hardenedShells',
    name: 'Hardened Shells',
    description: 'All units +15% damage resistance',
    clamCost: 400,
    twigCost: 300,
    pearlCost: 50,
    requires: 'eagleEye',
    branch: 'fortifications',
  },

  // ── Shadow (Subterfuge & Control) ────────────────────────────────
  swiftPaws: {
    id: 'swiftPaws',
    name: 'Shadow Sprint',
    description: 'Permanent +15% speed. Active: +40% for 8s (60s cd)',
    clamCost: 100,
    twigCost: 50,
    branch: 'shadow',
  },
  cunningTraps: {
    id: 'cunningTraps',
    name: 'Cunning Traps',
    description: 'Unlocks Trapper unit',
    clamCost: 150,
    twigCost: 100,
    requires: 'swiftPaws',
    branch: 'shadow',
  },
  rallyCry: {
    id: 'rallyCry',
    name: 'Shadow Marks',
    description: 'Trapped enemies take +25% damage from all sources',
    clamCost: 250,
    twigCost: 200,
    requires: 'swiftPaws',
    branch: 'shadow',
  },
  camouflage: {
    id: 'camouflage',
    name: 'Camouflage',
    description: 'Trappers invisible when still',
    clamCost: 200,
    twigCost: 150,
    requires: 'cunningTraps',
    branch: 'shadow',
  },
  venomCoating: {
    id: 'venomCoating',
    name: 'Venom Coating',
    description: 'All melee apply 2 dmg/s poison 5s (10 total)',
    clamCost: 300,
    twigCost: 200,
    requires: 'cunningTraps',
    branch: 'shadow',
  },
} as const satisfies Record<TechId, TechUpgrade>;

export type TechState = Record<TechId, boolean>;

export function createInitialTechState(): TechState {
  const state = {} as TechState;
  for (const key of Object.keys(TECH_UPGRADES) as TechId[]) {
    state[key] = false;
  }
  return state;
}

export function canResearch(techId: TechId, techState: TechState): boolean {
  if (techState[techId]) return false;
  const upgrade = TECH_UPGRADES[techId];
  if ('requires' in upgrade && upgrade.requires && !techState[upgrade.requires]) return false;
  return true;
}
