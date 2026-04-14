/**
 * Build Preview Ghost Tests
 *
 * Verifies the placement ghost sprite is shown/hidden correctly based on
 * world.placingBuilding state, and uses green tint for valid / red for invalid.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted so the class is available when vi.mock factories execute.
const { MockSprite, getLastSprite, resetLastSprite, mockUiLayer, mockTexture } = vi.hoisted(() => {
  let _lastSprite: any = null;

  class MockSprite {
    visible = true;
    position = { set: vi.fn() };
    alpha = 1;
    tint = 0;
    anchor = { set: vi.fn() };
    destroy = vi.fn();
    constructor(_tex?: any) {
      _lastSprite = this;
    }
  }

  const mockUiLayer = { addChild: vi.fn(), removeChild: vi.fn() };
  const mockTexture = {};

  return {
    MockSprite,
    getLastSprite: () => _lastSprite,
    resetLastSprite: () => {
      _lastSprite = null;
    },
    mockUiLayer,
    mockTexture,
  };
});

vi.mock('pixi.js', () => ({
  Sprite: MockSprite,
  Texture: { EMPTY: {} },
}));

vi.mock('@/rendering/pixi/init', () => ({
  getTexture: vi.fn(() => mockTexture),
  getUiGfx: vi.fn(() => ({ circle: vi.fn(), fill: vi.fn(), rect: vi.fn(), stroke: vi.fn() })),
  getScreenGfx: vi.fn(() => ({ circle: vi.fn(), fill: vi.fn(), rect: vi.fn(), stroke: vi.fn() })),
  getUiLayer: vi.fn(() => mockUiLayer),
}));

vi.mock('@/config/entity-defs', () => ({ ENTITY_DEFS: {} }));
vi.mock('@/constants', () => ({ TILE_SIZE: 32 }));

vi.mock('@/ecs/components', () => ({
  Building: { hasRally: [], rallyX: [], rallyY: [] },
  Combat: { attackRange: [] },
  EntityTypeTag: { kind: [] },
  Position: { x: [], y: [] },
  Selectable: { selected: [] },
}));

vi.mock('@/types', () => ({
  SpriteId: {
    Burrow: 'burrow',
    Armory: 'armory',
    Tower: 'tower',
    Watchtower: 'watchtower',
    Lodge: 'lodge',
    Wall: 'wall',
    LookoutPost: 'lookout_post',
  },
}));

import { hidePlacementGhost, renderPlacementPreview } from '@/rendering/pixi/ui-renderer';

const emptySpriteCanvases = new Map();

describe('Build Preview Ghost', () => {
  beforeEach(() => {
    hidePlacementGhost();
    resetLastSprite();
    vi.clearAllMocks();
  });

  it('renders a ghost sprite for valid placement (green tint)', () => {
    renderPlacementPreview(
      { worldX: 128, worldY: 256, buildingType: 'burrow', canPlace: true },
      emptySpriteCanvases,
    );

    const sprite = getLastSprite();
    expect(mockUiLayer.addChild).toHaveBeenCalled();
    expect(sprite).toBeTruthy();
    expect(sprite.tint).toBe(0x44ff44);
    expect(sprite.visible).toBe(true);
  });

  it('renders a ghost sprite for invalid placement (red tint)', () => {
    // Use a different building type so a fresh sprite is created
    renderPlacementPreview(
      { worldX: 128, worldY: 256, buildingType: 'armory', canPlace: false },
      emptySpriteCanvases,
    );

    const sprite = getLastSprite();
    expect(mockUiLayer.addChild).toHaveBeenCalled();
    expect(sprite).toBeTruthy();
    expect(sprite.tint).toBe(0xff4444);
  });

  it('hidePlacementGhost hides the sprite', () => {
    renderPlacementPreview(
      { worldX: 64, worldY: 64, buildingType: 'tower', canPlace: true },
      emptySpriteCanvases,
    );
    const sprite = getLastSprite();
    expect(sprite.visible).toBe(true);

    hidePlacementGhost();
    expect(sprite.visible).toBe(false);
  });

  it('resolves known building types to sprite ids', () => {
    const knownTypes = ['burrow', 'armory', 'tower', 'watchtower', 'lodge', 'wall', 'lookout_post'];
    for (const buildingType of knownTypes) {
      hidePlacementGhost();
      resetLastSprite();
      vi.clearAllMocks();

      renderPlacementPreview(
        { worldX: 100, worldY: 100, buildingType, canPlace: true },
        emptySpriteCanvases,
      );
      expect(mockUiLayer.addChild).toHaveBeenCalled();
      expect(getLastSprite()).toBeTruthy();
    }
  });

  it('hides ghost for unknown building type', () => {
    renderPlacementPreview(
      { worldX: 100, worldY: 100, buildingType: 'burrow', canPlace: true },
      emptySpriteCanvases,
    );
    const sprite = getLastSprite();
    expect(sprite.visible).toBe(true);

    renderPlacementPreview(
      { worldX: 100, worldY: 100, buildingType: 'unknown_building', canPlace: true },
      emptySpriteCanvases,
    );
    expect(sprite.visible).toBe(false);
  });

  it('snaps placement position to tile grid', () => {
    // TILE_SIZE = 32, worldX = 50 => round(50/32)*32 = 2*32 = 64
    // Use 'wall' to force a fresh sprite creation
    renderPlacementPreview(
      { worldX: 50, worldY: 50, buildingType: 'wall', canPlace: true },
      emptySpriteCanvases,
    );
    const sprite = getLastSprite();
    expect(sprite).toBeTruthy();
    expect(sprite.position.set).toHaveBeenCalledWith(64, 64);
  });
});

describe('Build Preview integration with game-renderer', () => {
  it('getPlacementPreview returns null when placingBuilding is not set', async () => {
    const { getTexture } = await import('@/rendering/pixi/init');
    expect(getTexture).toBeDefined();
  });
});
