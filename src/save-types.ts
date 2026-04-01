/**
 * Save System Types – Serialization interfaces for save/load.
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
  resources: { clams: number; twigs: number; pearls?: number; food: number; maxFood: number };
  enemyResources: { clams: number; twigs: number };
  autoBehaviors: {
    // New per-role format (v3+)
    gatherer?: boolean;
    combat?: boolean;
    healer?: boolean;
    scout?: boolean;
    // Legacy per-action format (v2, migrated on load)
    gather?: boolean;
    defend?: boolean;
    attack?: boolean;
    build?: boolean;
    heal?: boolean;
  };
  tech: Record<string, boolean>;
  stats: {
    unitsKilled: number;
    unitsLost: number;
    resourcesGathered: number;
    buildingsBuilt: number;
    buildingsLost?: number;
    peakArmy: number;
    pearlsEarned?: number;
    totalClamsEarned?: number;
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
