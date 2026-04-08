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
  triggerSpawnPop,
} from './animations';

// Background & fog texture generation
export { buildBackground, buildExploredCanvas, buildFogTexture } from './background';

// Camera
export { type CameraShake, clampCamera, computeShakeOffset } from './camera';

// Fog of war renderer
export { drawFog, type FogRendererState } from './fog-renderer';

// Dynamic lighting
export { drawLighting } from './light-renderer';

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
  clearRecoloredTextureCache,
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
} from './pixi';

// Sprite recoloring system
export {
  clearRecolorCache,
  getRecoloredSprite,
  type RecolorPreset,
  recolorSprite,
  veterancyPreset,
} from './recolor';

// Sprites
export { generateAllSprites, getSpriteSize } from './sprites/index';
