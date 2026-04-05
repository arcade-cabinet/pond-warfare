/**
 * Save System Types -- Serialization interfaces for save/load.
 */

export interface SavedEntity {
  kind: number;
  faction: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  attackRange: number;
  kills: number;
  progress: number;
  resourceType: number;
  resourceAmount: number;
  carryingType: number;
  isBuilding: boolean;
  isResource: boolean;
}

export interface SaveData {
  version: 2;
  resources: {
    fish: number;
    logs: number;
    rocks: number;
    food: number;
    maxFood: number;
  };
  enemyResources: { fish: number; logs: number };
  autoBehaviors: {
    gatherer: boolean;
    combat: boolean;
    healer: boolean;
    scout: boolean;
  };
  tech: Record<string, boolean>;
  stats: {
    unitsKilled: number;
    unitsLost: number;
    unitsTrained: number;
    resourcesGathered: number;
    buildingsBuilt: number;
    buildingsLost: number;
    peakArmy: number;
    pearlsEarned: number;
    totalFishEarned: number;
  };
  frameCount: number;
  timeOfDay: number;
  gameSpeed: number;
  peaceTimer: number;
  entities: SavedEntity[];
  enemyEvolution?: {
    tier: number;
    unlockedUnits: number[];
    lastEvolutionFrame: number;
  };
  poisonTimers?: [number, number][];
}
