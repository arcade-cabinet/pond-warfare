export type TechId =
  | 'sturdyMud'
  | 'swiftPaws'
  | 'sharpSticks'
  | 'eagleEye'
  | 'hardenedShells'
  | 'ironShell'
  | 'siegeWorks'
  | 'cartography'
  | 'tidalHarvest'
  | 'battleRoar'
  | 'herbalMedicine'
  | 'aquaticTraining'
  | 'deepDiving'
  | 'cunningTraps'
  | 'camouflage'
  // Lodge branch additions
  | 'fortifiedWalls'
  | 'tradeRoutes'
  | 'rallyCry'
  | 'pondBlessing'
  // Armory branch additions
  | 'piercingShot'
  | 'warDrums'
  | 'venomCoating'
  | 'siegeEngineering'
  // Nature branch additions
  | 'rootNetwork'
  | 'tidalSurge';

export interface TechUpgrade {
  id: TechId;
  name: string;
  description: string;
  clamCost: number;
  twigCost: number;
  pearlCost?: number;
  requires?: TechId;
}

export const TECH_UPGRADES = {
  sturdyMud: {
    id: 'sturdyMud',
    name: 'Sturdy Mud',
    description: '+300 HP to all buildings',
    clamCost: 200,
    twigCost: 300,
  },
  swiftPaws: {
    id: 'swiftPaws',
    name: 'Swift Paws',
    description: '+0.4 speed to all units',
    clamCost: 300,
    twigCost: 250,
    requires: 'sturdyMud',
  },
  sharpSticks: {
    id: 'sharpSticks',
    name: 'Sharp Sticks',
    description: '+2 damage to all combat units',
    clamCost: 300,
    twigCost: 200,
  },
  eagleEye: {
    id: 'eagleEye',
    name: 'Eagle Eye',
    description: '+50 range to snipers',
    clamCost: 400,
    twigCost: 300,
    requires: 'sharpSticks',
  },
  hardenedShells: {
    id: 'hardenedShells',
    name: 'Hardened Shells',
    description: '+5 HP regen for all units',
    clamCost: 500,
    twigCost: 400,
    pearlCost: 30,
    requires: 'eagleEye',
  },
  ironShell: {
    id: 'ironShell',
    name: 'Iron Shell',
    description: 'Unlocks Shieldbearer unit',
    clamCost: 300,
    twigCost: 200,
    requires: 'sharpSticks',
  },
  siegeWorks: {
    id: 'siegeWorks',
    name: 'Siege Works',
    description: 'Unlocks Catapult unit',
    clamCost: 400,
    twigCost: 350,
    pearlCost: 50,
    requires: 'eagleEye',
  },
  cartography: {
    id: 'cartography',
    name: 'Cartography',
    description: 'Unlocks Scout Post. +25% fog reveal.',
    clamCost: 150,
    twigCost: 100,
  },
  tidalHarvest: {
    id: 'tidalHarvest',
    name: 'Tidal Harvest',
    description: 'Gatherers collect +50% resources',
    clamCost: 200,
    twigCost: 150,
  },
  battleRoar: {
    id: 'battleRoar',
    name: 'Battle Roar',
    description: '+10% attack speed for all units',
    clamCost: 350,
    twigCost: 250,
    requires: 'sharpSticks',
  },
  herbalMedicine: {
    id: 'herbalMedicine',
    name: 'Herbal Medicine',
    description: 'Ancient pond remedies heal nearby wounded',
    clamCost: 100,
    twigCost: 80,
  },
  aquaticTraining: {
    id: 'aquaticTraining',
    name: 'Aquatic Training',
    description: 'Train otters for amphibious warfare',
    clamCost: 150,
    twigCost: 100,
    requires: 'herbalMedicine',
  },
  deepDiving: {
    id: 'deepDiving',
    name: 'Deep Diving',
    description: 'Dive deeper for precious pearls (+30%)',
    clamCost: 200,
    twigCost: 150,
    requires: 'aquaticTraining',
  },
  cunningTraps: {
    id: 'cunningTraps',
    name: 'Cunning Traps',
    description: 'Ingenious snares slow enemy advances',
    clamCost: 200,
    twigCost: 150,
    requires: 'sharpSticks',
  },
  camouflage: {
    id: 'camouflage',
    name: 'Camouflage',
    description: 'Blend into the reeds and strike unseen',
    clamCost: 300,
    twigCost: 200,
    requires: 'cunningTraps',
  },
  // Lodge branch additions
  fortifiedWalls: {
    id: 'fortifiedWalls',
    name: 'Fortified Walls',
    description: 'Wall HP +100, walls slow nearby enemies',
    clamCost: 150,
    twigCost: 100,
    requires: 'sturdyMud',
  },
  tradeRoutes: {
    id: 'tradeRoutes',
    name: 'Trade Routes',
    description: '+6 clams/5sec passive income per Lodge',
    clamCost: 200,
    twigCost: 150,
    requires: 'cartography',
  },
  rallyCry: {
    id: 'rallyCry',
    name: 'Rally Cry',
    description: 'Activate: all units +30% speed for 10s',
    clamCost: 250,
    twigCost: 200,
    requires: 'swiftPaws',
  },
  pondBlessing: {
    id: 'pondBlessing',
    name: 'Pond Blessing',
    description: 'One-time: heal all units to full HP',
    clamCost: 300,
    twigCost: 200,
    pearlCost: 20,
    requires: 'herbalMedicine',
  },
  // Armory branch additions
  piercingShot: {
    id: 'piercingShot',
    name: 'Piercing Shot',
    description: 'Snipers ignore 50% of damage reduction',
    clamCost: 200,
    twigCost: 150,
    requires: 'eagleEye',
  },
  warDrums: {
    id: 'warDrums',
    name: 'War Drums',
    description: '+15% damage within 200px of Armory',
    clamCost: 250,
    twigCost: 200,
    requires: 'battleRoar',
  },
  venomCoating: {
    id: 'venomCoating',
    name: 'Venom Coating',
    description: 'Melee attacks apply 1 dmg/sec poison 3s',
    clamCost: 200,
    twigCost: 150,
    requires: 'cunningTraps',
  },
  siegeEngineering: {
    id: 'siegeEngineering',
    name: 'Siege Engineering',
    description: 'Catapults fire 25% faster',
    clamCost: 300,
    twigCost: 250,
    requires: 'siegeWorks',
  },
  // Nature branch additions
  rootNetwork: {
    id: 'rootNetwork',
    name: 'Root Network',
    description: 'Buildings share vision radius',
    clamCost: 200,
    twigCost: 150,
    pearlCost: 15,
    requires: 'deepDiving',
  },
  tidalSurge: {
    id: 'tidalSurge',
    name: 'Tidal Surge',
    description: 'One-time: deal 50 damage to all enemies',
    clamCost: 400,
    twigCost: 300,
    pearlCost: 40,
    requires: 'deepDiving',
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
