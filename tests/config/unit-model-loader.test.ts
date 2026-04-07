import { describe, expect, it } from 'vitest';

import {
  getManualUnitModel,
  getPearlSpecialistModel,
  getSpecialistControlModel,
  getUnitModelConfig,
  validateUnitModel,
} from '@/config/unit-model-loader';
import type { UnitModelConfig } from '@/config/unit-model-types';

describe('unit-model config', () => {
  it('defines the canonical manual roster', () => {
    expect(getManualUnitModel()).toEqual([
      expect.objectContaining({ id: 'mudpaw', unlock_stage: 1 }),
      expect.objectContaining({ id: 'medic', unlock_stage: 2 }),
      expect.objectContaining({ id: 'sapper', unlock_stage: 5 }),
      expect.objectContaining({ id: 'saboteur', unlock_stage: 6 }),
    ]);
  });

  it('defines the canonical Pearl specialist roster', () => {
    const ids = getPearlSpecialistModel().map((entry) => entry.id);
    expect(ids).toEqual([
      'fisher',
      'logger',
      'digger',
      'guard',
      'ranger',
      'bombardier',
      'shaman',
      'lookout',
    ]);
  });

  it('documents radius-based specialist autonomy as the core control model', () => {
    const control = getSpecialistControlModel();
    expect(control.assignment_mode).toBe('terrain_radius');
    expect(control.player_can_assign_single_target).toBe(false);
    expect(control.radius_upgrade_is_core_path).toBe(true);
    expect(control.radius_behavior_rules.some((rule) => rule.includes('radius'))).toBe(true);
    expect(
      control.radius_behavior_rules.some((rule) => rule.includes('searches for role-valid work')),
    ).toBe(true);
  });

  it('flags the legacy split-baseline and free auto-deploy model as obsolete', () => {
    const obsolete = getUnitModelConfig().obsolete_assumptions;
    expect(obsolete).toContain('free match-start auto-deploy as the primary Pearl specialist model');
    expect(obsolete).toContain('separate baseline manual Gatherer Fighter and Scout units');
  });

  it('rejects malformed control models', () => {
    const invalid = {
      ...getUnitModelConfig(),
      specialist_control_model: {
        ...getSpecialistControlModel(),
        assignment_mode: 'single_target',
      },
    } as unknown as UnitModelConfig;

    expect(() => validateUnitModel(invalid)).toThrow('assignment_mode');
  });
});
