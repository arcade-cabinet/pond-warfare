export {
  AI_PERSONALITIES,
  type AIPersonality,
  type PersonalityConfig,
  RANDOM_SWITCH_INTERVAL,
  resolvePersonality,
} from './ai-personalities';
export { COMMANDERS, type CommanderDef, getCommanderDef } from './commanders';
export {
  calculatePearlReward,
  generateUpgradeCatalog,
  getAllEnemyIds,
  getAllUnitIds,
  getEnemyDef,
  getEnemyScaling,
  getEventsConfig,
  getEventsForLevel,
  getEventTiming,
  getFortDef,
  getFortificationsConfig,
  getLodgeConfig,
  getPearlUpgrade,
  getPrefixesConfig,
  getPrestigeConfig,
  getPrestigeThreshold,
  getRewardFormula,
  getTerrainConfig,
  getTerrainForLevel,
  getTierPrefix,
  getUnitDef,
  getUpgradesConfig,
} from './config-loader';
export {
  DAMAGE_MULTIPLIERS,
  ENTITY_DEFS,
  entityKindFromString,
  entityKindName,
  getDamageMultiplier,
  type UnitDef,
} from './entity-defs';
export {
  type FactionConfig,
  getAIFaction,
  getFactionConfig,
  OTTER_FACTION,
  type PlayableFaction,
  PREDATOR_FACTION,
} from './factions';
export {
  DEFAULT_KEYMAP,
  getKeymap,
  type KeyMap,
  loadKeymapFromStorage,
  saveKeymapToStorage,
  setKeymap,
} from './keymap';
