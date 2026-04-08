import { describe, expect, it } from 'vitest';
import { createGameWorld } from '@/ecs/world';
import { loadGame, saveGame } from '@/save-system';
import type { SaveData } from '@/save-types';

function makeBaseSave(): SaveData {
  return {
    version: 3,
    resources: { fish: 10, logs: 20, rocks: 3, food: 1, maxFood: 8 },
    enemyResources: { fish: 5, logs: 7 },
    autoBehaviors: {},
    tech: {},
    stats: {
      unitsKilled: 0,
      unitsLost: 0,
      unitsTrained: 0,
      resourcesGathered: 0,
      buildingsBuilt: 0,
      buildingsLost: 0,
      peakArmy: 0,
      pearlsEarned: 0,
      totalFishEarned: 0,
    },
    frameCount: 0,
    timeOfDay: 0,
    gameSpeed: 1,
    peaceTimer: 0,
    entities: [],
  };
}

describe('save-system auto-behavior compatibility', () => {
  it('serializes the canonical per-role automation keys', () => {
    const world = createGameWorld();
    world.autoBehaviors.generalist = true;
    world.autoBehaviors.combat = true;
    world.autoBehaviors.support = true;
    world.autoBehaviors.recon = true;

    const data = JSON.parse(saveGame(world)) as SaveData;

    expect(data.autoBehaviors).toEqual({
      generalist: true,
      combat: true,
      support: true,
      recon: true,
    });
  });

  it('loads legacy gatherer/healer/scout save keys into the canonical runtime shape', () => {
    const world = createGameWorld();
    const legacySave: SaveData = {
      ...makeBaseSave(),
      autoBehaviors: {
        gatherer: true,
        combat: true,
        healer: true,
        scout: true,
      },
    };

    expect(loadGame(world, JSON.stringify(legacySave))).toBe(true);
    expect(world.autoBehaviors.generalist).toBe(true);
    expect(world.autoBehaviors.combat).toBe(true);
    expect(world.autoBehaviors.support).toBe(true);
    expect(world.autoBehaviors.recon).toBe(true);
  });
});
