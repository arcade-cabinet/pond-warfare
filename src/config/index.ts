export {
  ENTITY_DEFS,
  DAMAGE_MULTIPLIERS,
  getDamageMultiplier,
  entityKindFromString,
  entityKindName,
  type UnitDef,
} from './entity-defs';
export {
  TECH_UPGRADES,
  canResearch,
  createInitialTechState,
  type TechId,
  type TechState,
  type TechUpgrade,
} from './tech-tree';
export {
  DEFAULT_KEYMAP,
  getKeymap,
  setKeymap,
  loadKeymapFromStorage,
  saveKeymapToStorage,
  type KeyMap,
} from './keymap';
