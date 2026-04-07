/**
 * Specialist Blueprint Snapshot Tests (v3.0 — US11)
 *
 * Validates the legacy specialist snapshot helper from prestige state:
 * - Field cap matches prestige rank
 * - Area-autonomy metadata resolves correctly per specialist
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

  it('should resolve fishers based on blueprint_fisher rank', () => {
    const state: PrestigeState = {
      rank: 1,
      pearls: 0,
      totalPearlsEarned: 10,
      upgradeRanks: { blueprint_fisher: 3 },
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
        blueprint_fisher: 5,
        blueprint_digger: 2,
        blueprint_guard: 1,
      },
    };

    const plan = computeSpecialistDeployPlan(state);
    expect(plan.spawns).toHaveLength(3);
    expect(plan.totalCount).toBe(8); // 5 + 2 + 1

    const ids = plan.spawns.map((s) => s.unitId);
    expect(ids).toContain('fisher');
    expect(ids).toContain('digger');
    expect(ids).toContain('guard');
  });

  it('should generate summary strings', () => {
    const state: PrestigeState = {
      rank: 2,
      pearls: 0,
      totalPearlsEarned: 20,
      upgradeRanks: {
        blueprint_fisher: 2,
        blueprint_logger: 1,
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
      (e) => e.def.effect.type === 'specialist_blueprint',
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
    expect(isSpecialistUnit('guard')).toBe(true);
    expect(isSpecialistUnit('ranger')).toBe(true);
    expect(isSpecialistUnit('shaman')).toBe(true);
    expect(isSpecialistUnit('lookout')).toBe(true);
    expect(isSpecialistUnit('bombardier')).toBe(true);
  });

  it('should NOT identify generalists as specialists', () => {
    expect(isSpecialistUnit('mudpaw')).toBe(false);
    expect(isSpecialistUnit('medic')).toBe(false);
    expect(isSpecialistUnit('sapper')).toBe(false);
    expect(isSpecialistUnit('saboteur')).toBe(false);
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
  it('mudpaw should have >= HP than fisher', () => {
    const result = validateGeneralistSuperior('mudpaw', 'fisher');
    expect(result.valid).toBe(true);

    const hpComp = result.comparison.find((c) => c.stat === 'hp');
    expect(hpComp).toBeDefined();
    expect(hpComp?.generalist ?? 0).toBeGreaterThanOrEqual(hpComp?.specialist ?? 0);
  });

  it('sapper should have >= HP than bombardier', () => {
    const result = validateGeneralistSuperior('sapper', 'bombardier');
    expect(result.valid).toBe(true);
  });

  it('medic should have >= HP than shaman', () => {
    const result = validateGeneralistSuperior('medic', 'shaman');
    expect(result.valid).toBe(true);
  });

  it('mudpaw should have >= HP than lookout', () => {
    const result = validateGeneralistSuperior('mudpaw', 'lookout');
    expect(result.valid).toBe(true);
  });
});

// ── Behavior descriptions ─────────────────────────────────────────

describe('Specialist behavior descriptions', () => {
  const specialists = [
    'fisher',
    'digger',
    'logger',
    'guard',
    'ranger',
    'shaman',
    'lookout',
    'bombardier',
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
  it('all 8 Pearl specialists defined in units.json', () => {
    const expectedSpecialists = [
      'fisher',
      'digger',
      'logger',
      'guard',
      'ranger',
      'shaman',
      'lookout',
      'bombardier',
    ];

    for (const id of expectedSpecialists) {
      const def = getUnitDef(id);
      expect(def, `${id} should exist`).toBeDefined();
      expect('autoTarget' in def, `${id} should have autoTarget`).toBe(true);
    }
  });

  it('the canonical manual roster is defined in units.json', () => {
    const generalists = ['mudpaw', 'medic', 'sapper', 'saboteur'];
    for (const id of generalists) {
      const def = getUnitDef(id);
      expect(def, `${id} should exist`).toBeDefined();
      expect('trainTime' in def, `${id} should have trainTime`).toBe(true);
    }
  });

  it('all specialist blueprint Pearl upgrades reference valid specialist IDs', () => {
    const deployUpgrades = getAllPearlUpgradeEntries().filter(
      (e) => e.def.effect.type === 'specialist_blueprint',
    );

    for (const { id, def } of deployUpgrades) {
      if (def.effect.type !== 'specialist_blueprint') continue;
      const unitId = def.effect.unit;
      expect(isSpecialistUnit(unitId), `${id} -> ${unitId} should be specialist`).toBe(true);
    }
  });
});
