/**
 * Selection Utilities - Re-export barrel
 *
 * Maintains backward compatibility with imports from '@/input/selection'.
 */

export { issueContextCommand } from './selection/commands';
export { selectArmy, selectIdleWorker } from './selection/group-select';
export {
  cancelTrain,
  canPlaceBuilding,
  getEntityAt,
  hasPlayerUnitsSelected,
  placeBuilding,
  train,
} from './selection/queries';
