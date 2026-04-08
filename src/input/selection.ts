/**
 * Selection Utilities - Re-export barrel
 *
 * Maintains backward compatibility with imports from '@/input/selection'.
 */

export { issueContextCommand } from './selection/commands';
export { selectArmy, selectIdleGeneralist } from './selection/group-select';
export {
  cancelTrain,
  canPlaceBuilding,
  getEntityAt,
  getResourceAt,
  hasPlayerUnitsSelected,
  placeBuilding,
  train,
} from './selection/queries';
