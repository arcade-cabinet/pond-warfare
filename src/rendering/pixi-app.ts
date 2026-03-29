/**
 * PixiJS Application Manager - Re-export barrel
 *
 * This file re-exports from the pixi/ sub-modules to maintain backward
 * compatibility with existing imports from '@/rendering/pixi-app'.
 */

export {
  destroyPixiApp,
  initPixiApp,
  type PixiRenderFrameData,
  type PlacementPreview,
  registerSpriteTexture,
  getTexture,
  renderPixiFrame,
  resizePixiApp,
  setBackground,
  setColorBlindMode,
} from './pixi/index';
