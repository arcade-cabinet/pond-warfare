export interface TechUpgrade {
  id: string;
  name: string;
  description: string;
  clamCost: number;
  twigCost: number;
  requires?: string;
}

export const TECH_UPGRADES: Record<string, TechUpgrade> = {
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
};

export type TechId = keyof typeof TECH_UPGRADES;

export type TechState = Record<TechId, boolean>;

export function createInitialTechState(): TechState {
  return {
    sturdyMud: false,
    swiftPaws: false,
    sharpSticks: false,
    eagleEye: false,
  };
}

export function canResearch(techId: TechId, techState: TechState): boolean {
  if (techState[techId]) return false;
  const upgrade = TECH_UPGRADES[techId];
  if (upgrade.requires && !techState[upgrade.requires]) return false;
  return true;
}
