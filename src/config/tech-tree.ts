export type TechId = 'sturdyMud' | 'swiftPaws' | 'sharpSticks' | 'eagleEye';

export interface TechUpgrade {
  id: TechId;
  name: string;
  description: string;
  clamCost: number;
  twigCost: number;
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
    clamCost: 250,
    twigCost: 200,
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
