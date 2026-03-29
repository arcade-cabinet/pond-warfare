// Animations
export {
  animateGameOverStats,
  animateIntroSubtitle,
  animateIntroTitle,
  cleanupEntityAnimation,
  type EntityScale,
  entityScales,
  triggerBuildingComplete,
  triggerCommandPulse,
} from './animations';

// Background & fog texture generation
export { buildBackground, buildExploredCanvas, buildFogTexture } from './background';

// Camera
export { type CameraShake, clampCamera, computeShakeOffset } from './camera';

// Fog of war renderer
export { drawFog, type FogRendererState } from './fog-renderer';

// Dynamic lighting
export { drawLighting } from './light-renderer';

// Minimap
export { drawMinimap, updateMinimapViewport } from './minimap-renderer';

// Particles & projectiles
export {
  drawFloatingTexts,
  drawParticles,
  drawProjectile,
  drawProjectiles,
  type ProjectileRenderData,
  updateProjectileTrails,
} from './particles';

// PixiJS app manager
export {
  destroyPixiApp,
  getTexture,
  initPixiApp,
  type PixiRenderFrameData,
  type PlacementPreview,
  registerSpriteTexture,
  renderPixiFrame,
  resizePixiApp,
  setBackground,
  setColorBlindMode,
} from './pixi-app';

// Sprites
export { generateAllSprites, getSpriteSize } from './sprites';
