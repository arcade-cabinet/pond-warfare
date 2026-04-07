import type { UnitModelConfig } from './unit-model-types';

function assertNonEmptyString(value: unknown, context: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Unit model validation: expected non-empty string in ${context}`);
  }
}

function assertNonEmptyList(value: unknown, context: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Unit model validation: expected non-empty array in ${context}`);
  }
}

export function validateUnitModel(data: UnitModelConfig): void {
  assertNonEmptyList(data.manual_units, 'unit-model.manual_units');
  assertNonEmptyList(data.pearl_specialists, 'unit-model.pearl_specialists');
  assertNonEmptyList(data.obsolete_assumptions, 'unit-model.obsolete_assumptions');

  for (const [index, unit] of data.manual_units.entries()) {
    const ctx = `unit-model.manual_units[${index}]`;
    assertNonEmptyString(unit.id, `${ctx}.id`);
    assertNonEmptyString(unit.label, `${ctx}.label`);
    assertNonEmptyString(unit.role, `${ctx}.role`);
    assertNonEmptyString(unit.description, `${ctx}.description`);
    if (typeof unit.unlock_stage !== 'number' || unit.unlock_stage < 1 || unit.unlock_stage > 6) {
      throw new Error(`Unit model validation: expected unlock_stage 1-6 in ${ctx}.unlock_stage`);
    }
    assertNonEmptyList(unit.responsibilities, `${ctx}.responsibilities`);
    assertNonEmptyList(unit.clam_upgrade_axes, `${ctx}.clam_upgrade_axes`);
  }

  for (const [index, specialist] of data.pearl_specialists.entries()) {
    const ctx = `unit-model.pearl_specialists[${index}]`;
    assertNonEmptyString(specialist.id, `${ctx}.id`);
    assertNonEmptyString(specialist.label, `${ctx}.label`);
    assertNonEmptyString(specialist.domain, `${ctx}.domain`);
    assertNonEmptyString(specialist.behavior, `${ctx}.behavior`);
    if (specialist.assignment_shape !== 'radius') {
      throw new Error(`Unit model validation: expected radius assignment_shape in ${ctx}`);
    }
    assertNonEmptyList(specialist.pearl_upgrade_axes, `${ctx}.pearl_upgrade_axes`);
  }

  const control = data.specialist_control_model;
  if (!control) {
    throw new Error('Unit model validation: missing specialist_control_model');
  }
  if (control.unlock_source !== 'pearls') {
    throw new Error('Unit model validation: unlock_source must be pearls');
  }
  if (control.spawn_cost_source !== 'in_match_resources') {
    throw new Error('Unit model validation: spawn_cost_source must be in_match_resources');
  }
  if (control.assignment_mode !== 'terrain_radius') {
    throw new Error('Unit model validation: assignment_mode must be terrain_radius');
  }
  assertNonEmptyList(control.radius_behavior_rules, 'unit-model.specialist_control_model.radius_behavior_rules');
  assertNonEmptyList(control.upgrade_philosophy, 'unit-model.specialist_control_model.upgrade_philosophy');
  if (!control.radius_upgrade_is_core_path) {
    throw new Error('Unit model validation: radius_upgrade_is_core_path must be true');
  }

  const manualIds = new Set(data.manual_units.map((unit) => unit.id));
  const specialistIds = new Set(data.pearl_specialists.map((unit) => unit.id));
  if (manualIds.size !== data.manual_units.length) {
    throw new Error('Unit model validation: duplicate manual unit ids');
  }
  if (specialistIds.size !== data.pearl_specialists.length) {
    throw new Error('Unit model validation: duplicate specialist ids');
  }
}
