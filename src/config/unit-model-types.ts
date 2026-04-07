export interface UnitModelManualUnit {
  id: string;
  label: string;
  unlock_stage: number;
  role: string;
  description: string;
  responsibilities: string[];
  clam_upgrade_axes: string[];
}

export interface UnitModelSpecialist {
  id: string;
  label: string;
  domain: string;
  assignment_shape: 'radius';
  behavior: string;
  pearl_upgrade_axes: string[];
}

export interface UnitModelControlModel {
  unlock_source: 'pearls';
  spawn_cost_source: 'in_match_resources';
  assignment_mode: 'terrain_radius';
  player_can_reposition: boolean;
  player_can_assign_single_target: boolean;
  player_can_override_temporarily: boolean;
  radius_upgrade_is_core_path: boolean;
  radius_behavior_rules: string[];
  upgrade_philosophy: string[];
}

export interface UnitModelConfig {
  manual_units: UnitModelManualUnit[];
  pearl_specialists: UnitModelSpecialist[];
  specialist_control_model: UnitModelControlModel;
  obsolete_assumptions: string[];
}
