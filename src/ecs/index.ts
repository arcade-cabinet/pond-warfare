// Components
export {
  Position,
  Velocity,
  Sprite,
  Health,
  Combat,
  UnitStateMachine,
  FactionTag,
  EntityTypeTag,
  Resource,
  Carrying,
  Building,
  TrainingQueue,
  trainingQueueSlots,
  Collider,
  Selectable,
  Veterancy,
  TowerAI,
  IsBuilding,
  IsResource,
  Dead,
  IsProjectile,
  ProjectileData,
} from './components';

// Archetypes
export { spawnEntity } from './archetypes';

// World
export { createGameWorld, type GameWorld } from './world';
