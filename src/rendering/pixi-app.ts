/**
 * PixiJS Application Manager - Re-export barrel
 *
 * This file re-exports from the pixi/ sub-modules to maintain backward
 * compatibility with existing imports from '@/rendering/pixi-app'.
 */

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
} from './pixi/index';
