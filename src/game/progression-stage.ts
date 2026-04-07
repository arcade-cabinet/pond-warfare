/**
 * Normalize progression into a playable panel stage.
 *
 * Fresh runs persist `progressionLevel = 0`, but the panel-map design starts
 * new players at stage 1 with the lodge panel unlocked.
 */
export function getPlayableProgressionStage(progressionLevel: number): number {
  if (!Number.isFinite(progressionLevel)) return 1;
  return Math.max(1, Math.trunc(progressionLevel));
}
