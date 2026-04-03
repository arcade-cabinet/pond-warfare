/**
 * Specialist Auto-Deploy Tests (v3.0 — US11)
 *
 * Validates specialist auto-deploy from prestige state:
 * - Deploy count matches prestige rank
 * - Auto-behavior resolves correctly per specialist
 * - Generalists are stat-superior to specialists
 * - Spawn positions are near Lodge
 */

import { describe, expect, it } from 'vitest';
import { getAllPearlUpgradeEntries, getUnitDef } from '@/config/config-loader';
import { createPrestigeState, type PrestigeState } from '@/config/prestige-logic';
import {
  computeSpecialistDeployPlan,
  getSpecialistBehaviorDesc,
  getSpecialistSpawnPositions,
  isSpecialistUnit,
  validateGeneralistSuperior,
} from '@/ecs/systems/specialist-deploy';

// ── Deploy plan tests ─────────────────────────────────────────────

describe('Specialist deploy plan', () => {
  it('should return empty plan for new player (no prestige)', () => {
    const state = createPrestigeState();
    const plan = computeSpecialistDeployPlan(state);
    expect(plan.spawns).toHaveLength(0);
    expect(plan.totalCount).toBe(0);
    expect(plan.summary).toHaveLength(0);
  });

  it('should deploy fishers based on auto_deploy_fisher rank', () => {
    const state: PrestigeState = {
      rank: 1,
      pearls: 0,
      totalPearlsEarned: 10,
      upgradeRanks: { auto_deploy_fisher: 3 },
    };

    const plan = computeSpecialistDeployPlan(state);
    expect(plan.spawns).toHaveLength(1);

    const fisher = plan.spawns[0];
    expect(fisher.unitId).toBe('fisher');
    expect(fisher.count).toBe(3);
    expect(fisher.autoTarget).toBe('fish_node');
    expect(fisher.role).toBe('auto_gather_fish');
  });

  it('should deploy multiple specialist types', () => {
    const state: PrestigeState = {
      rank: 3,
      pearls: 0,
      totalPearlsEarned: 50,
      upgradeRanks: {
        auto_deploy_fisher: 5,
        auto_deploy_digger: 2,
        auto_deploy_guardian: 1,
      },
    };

    const plan = computeSpecialistDeployPlan(state);
    expect(plan.spawns).toHaveLength(3);
    expect(plan.totalCount).toBe(8); // 5 + 2 + 1

    const ids = plan.spawns.map((s) => s.unitId);
    expect(ids).toContain('fisher');
    expect(ids).toContain('digger');
    expect(ids).toContain('guardian');
  });

  it('should generate summary strings', () => {
    const state: PrestigeState = {
      rank: 2,
      pearls: 0,
      totalPearlsEarned: 20,
      upgradeRanks: {
        auto_deploy_fisher: 2,
        auto_deploy_logger: 1,
      },
    };

    const plan = computeSpecialistDeployPlan(state);
    expect(plan.summary).toContain('2x fisher');
    expect(plan.summary).toContain('1x logger');
  });

  it('should ignore non-deploy prestige upgrades', () => {
    const state: PrestigeState = {
      rank: 5,
      pearls: 0,
      totalPearlsEarned: 100,
      upgradeRanks: {
        gather_multiplier: 5,
        combat_multiplier: 3,
        auto_heal_behavior: 1,
      },
    };

    const plan = computeSpecialistDeployPlan(state);
    expect(plan.spawns).toHaveLength(0);
    expect(plan.totalCount).toBe(0);
  });

  it('should resolve correct auto-targets for all specialist types', () => {
    const allDeploy = getAllPearlUpgradeEntries().filter(
      (e) => e.def.effect.type === 'auto_deploy',
    );

    for (const { id } of allDeploy) {
      const state: PrestigeState = {
        rank: 1,
        pearls: 0,
        totalPearlsEarned: 10,
        upgradeRanks: { [id]: 1 },
      };

      const plan = computeSpecialistDeployPlan(state);
      expect(plan.spawns.length, `${id} should spawn`).toBe(1);
      expect(plan.spawns[0].autoTarget, `${id} autoTarget`).toBeTruthy();
      expect(plan.spawns[0].hp, `${id} hp`).toBeGreaterThan(0);
      expect(plan.spawns[0].speed, `${id} speed`).toBeGreaterThan(0);
    }
  });
});

// ── Specialist identification tests ───────────────────────────────

describe('Specialist identification', () => {
  it('should identify specialist units', () => {
    expect(isSpecialistUnit('fisher')).toBe(true);
    expect(isSpecialistUnit('digger')).toBe(true);
    expect(isSpecialistUnit('logger')).toBe(true);
    expect(isSpecialistUnit('guardian')).toBe(true);
    expect(isSpecialistUnit('hunter')).toBe(true);
    expect(isSpecialistUnit('ranger')).toBe(true);
    expect(isSpecialistUnit('shaman')).toBe(true);
    expect(isSpecialistUnit('lookout')).toBe(true);
    expect(isSpecialistUnit('sapper')).toBe(true);
    expect(isSpecialistUnit('saboteur')).toBe(true);
  });

  it('should NOT identify generalists as specialists', () => {
    expect(isSpecialistUnit('gatherer')).toBe(false);
    expect(isSpecialistUnit('fighter')).toBe(false);
    expect(isSpecialistUnit('medic')).toBe(false);
    expect(isSpecialistUnit('scout')).toBe(false);
  });

  it('should handle unknown unit IDs gracefully', () => {
    expect(isSpecialistUnit('nonexistent')).toBe(false);
    expect(isSpecialistUnit('')).toBe(false);
  });
});

// ── Spawn position tests ──────────────────────────────────────────

describe('Specialist spawn positions', () => {
  it('should generate correct number of positions', () => {
    expect(getSpecialistSpawnPositions(500, 900, 3)).toHaveLength(3);
    expect(getSpecialistSpawnPositions(500, 900, 8)).toHaveLength(8);
  });

  it('positions should be near Lodge', () => {
    const positions = getSpecialistSpawnPositions(500, 900, 5);
    for (const pos of positions) {
      const dx = pos.x - 500;
      const dy = pos.y - 900;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeCloseTo(60, 0); // radius is 60
    }
  });

  it('positions should be below Lodge (in the safe zone)', () => {
    const positions = getSpecialistSpawnPositions(500, 900, 5);
    for (const pos of positions) {
      expect(pos.y).toBeGreaterThanOrEqual(900); // below Lodge
    }
  });

  it('should handle single specialist', () => {
    const positions = getSpecialistSpawnPositions(500, 900, 1);
    expect(positions).toHaveLength(1);
    expect(positions[0].x).toBeCloseTo(500, 0);
    expect(positions[0].y).toBeCloseTo(960, 0);
  });

  it('should handle zero specialists', () => {
    expect(getSpecialistSpawnPositions(500, 900, 0)).toHaveLength(0);
  });
});

// ── Generalist superiority tests ──────────────────────────────────

describe('Generalist stat superiority', () => {
  it('gatherer should have >= HP than fisher', () => {
    const result = validateGeneralistSuperior('gatherer', 'fisher');
    expect(result.valid).toBe(true);

    const hpComp = result.comparison.find((c) => c.stat === 'hp');
    expect(hpComp).toBeDefined();
    expect(hpComp!.generalist).toBeGreaterThanOrEqual(hpComp!.specialist);
  });

  it('fighter should have >= HP than hunter', () => {
    const result = validateGeneralistSuperior('fighter', 'hunter');
    expect(result.valid).toBe(true);
  });

  it('medic should have >= HP than shaman', () => {
    const result = validateGeneralistSuperior('medic', 'shaman');
    expect(result.valid).toBe(true);
  });

  it('scout should have >= HP than lookout', () => {
    const result = validateGeneralistSuperior('scout', 'lookout');
    expect(result.valid).toBe(true);
  });
});

// ── Behavior descriptions ─────────────────────────────────────────

describe('Specialist behavior descriptions', () => {
  const specialists = [
    'fisher',
    'digger',
    'logger',
    'guardian',
    'hunter',
    'ranger',
    'shaman',
    'lookout',
    'sapper',
    'saboteur',
  ];

  for (const id of specialists) {
    it(`should describe ${id} behavior`, () => {
      const desc = getSpecialistBehaviorDesc(id);
      expect(desc).toBeTruthy();
      expect(desc).not.toBe('Unknown specialist behavior');
    });
  }

  it('should return fallback for unknown unit', () => {
    expect(getSpecialistBehaviorDesc('nonexistent')).toBe('Unknown specialist behavior');
  });
});

// ── Config completeness tests ─────────────────────────────────────

describe('Specialist config completeness', () => {
  it('all 10 specialists defined in units.json', () => {
    const expectedSpecialists = [
      'fisher',
      'digger',
      'logger',
      'guardian',
      'hunter',
      'ranger',
      'shaman',
      'lookout',
      'sapper',
      'saboteur',
    ];

    for (const id of expectedSpecialists) {
      const def = getUnitDef(id);
      expect(def, `${id} should exist`).toBeDefined();
      expect('autoTarget' in def, `${id} should have autoTarget`).toBe(true);
    }
  });

  it('all 4 generalists defined in units.json', () => {
    const generalists = ['gatherer', 'fighter', 'medic', 'scout'];
    for (const id of generalists) {
      const def = getUnitDef(id);
      expect(def, `${id} should exist`).toBeDefined();
      expect('trainTime' in def, `${id} should have trainTime`).toBe(true);
    }
  });

  it('all auto-deploy Pearl upgrades reference valid specialist IDs', () => {
    const deployUpgrades = getAllPearlUpgradeEntries().filter(
      (e) => e.def.effect.type === 'auto_deploy',
    );

    for (const { id, def } of deployUpgrades) {
      if (def.effect.type !== 'auto_deploy') continue;
      const unitId = def.effect.unit;
      expect(isSpecialistUnit(unitId), `${id} -> ${unitId} should be specialist`).toBe(true);
    }
  });
});
