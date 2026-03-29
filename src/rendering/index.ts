// Animations
export {
  entityScales,
  triggerCommandPulse,
  triggerBuildingComplete,
  cleanupEntityAnimation,
  animateGameOverStats,
  animateIntroTitle,
  animateIntroSubtitle,
  type EntityScale,
} from './animations';

// Background & fog texture generation
export { buildBackground, buildFogTexture, buildExploredCanvas } from './background';

// Camera
export { clampCamera, computeShakeOffset, type CameraShake } from './camera';

// Fog of war renderer
export { drawFog, type FogRendererState } from './fog-renderer';

// Dynamic lighting
export { drawLighting } from './light-renderer';

// Minimap
export { drawMinimap, updateMinimapViewport } from './minimap-renderer';

// Particles & projectiles
export {
  drawParticles,
  updateProjectileTrails,
  drawProjectile,
  drawProjectiles,
  drawFloatingTexts,
  type ProjectileRenderData,
} from './particles';

// PixiJS app manager
export {
  setColorBlindMode,
  type PlacementPreview,
  registerSpriteTexture,
  getTexture,
  initPixiApp,
  resizePixiApp,
  setBackground,
  destroyPixiApp,
  type PixiRenderFrameData,
  renderPixiFrame,
} from './pixi-app';

// Sprites
export { generateAllSprites, getSpriteSize } from './sprites';
