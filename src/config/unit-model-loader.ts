import unitModelJson from '../../configs/unit-model.json';

import type {
  UnitModelConfig,
  UnitModelControlModel,
  UnitModelManualUnit,
  UnitModelSpecialist,
} from './unit-model-types';
import { validateUnitModel } from './unit-model-validator';

const unitModel = unitModelJson as UnitModelConfig;

validateUnitModel(unitModel);

export { validateUnitModel } from './unit-model-validator';
export type { UnitModelConfig, UnitModelControlModel, UnitModelManualUnit, UnitModelSpecialist };

export function getUnitModelConfig(): UnitModelConfig {
  return unitModel;
}

export function getManualUnitModel(): UnitModelManualUnit[] {
  return unitModel.manual_units;
}

export function getPearlSpecialistModel(): UnitModelSpecialist[] {
  return unitModel.pearl_specialists;
}

export function getSpecialistControlModel(): UnitModelControlModel {
  return unitModel.specialist_control_model;
}
