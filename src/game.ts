/**
 * Game Orchestrator
 *
 * Creates and manages the complete game lifecycle: canvas setup, world creation,
 * sprite generation, entity spawning, system execution, and rendering pipeline.
 * Faithful port of GAME.init() and GAME.loop() from pond_craft.html.
 */

import { WORLD_WIDTH, WORLD_HEIGHT, SPEED_LEVELS } from '@/constants';
import { EntityKind, Faction, SpriteId } from '@/types';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { spawnEntity } from '@/ecs/archetypes';
import { Selectable } from '@/ecs/components';

// Systems
import { movementSystem } from '@/ecs/systems/movement';
import { collisionSystem } from '@/ecs/systems/collision';
import { combatSystem } from '@/ecs/systems/combat';
import { projectileSystem } from '@/ecs/systems/projectile';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { buildingSystem } from '@/ecs/systems/building';
import { trainingSystem } from '@/ecs/systems/training';
import { aiSystem } from '@/ecs/systems/ai';
import { healthSystem } from '@/ecs/systems/health';
import { dayNightSystem } from '@/ecs/systems/day-night';
import { fogOfWarSystem } from '@/ecs/systems/fog-of-war';
import { cleanupSystem } from '@/ecs/systems/cleanup';

// Rendering
import { generateAllSprites } from '@/rendering/sprites';
import { buildBackground, buildFogTexture, buildExploredCanvas } from '@/rendering/background';
import { drawGame, type RenderFrameData, type SelectionRect, type PlacementPreview } from '@/rendering/game-renderer';
import { drawFog, type FogRendererState } from '@/rendering/fog-renderer';
import { drawLighting } from '@/rendering/light-renderer';
import { drawMinimap, updateMinimapViewport } from '@/rendering/minimap-renderer';
import { updateCamera, clampCamera, computeShakeOffset } from '@/rendering/camera';

// Input
import { KeyboardHandler } from '@/input/keyboard';
import { PointerHandler } from '@/input/pointer';

// Audio
import { audio } from '@/audio/audio-system';

// UI store
import { gameStore } from '@/ui/store';

export class Game {
  world: GameWorld;
  sprites: Record<number, HTMLCanvasElement> = {};

  // Canvases
  private gameCanvas!: HTMLCanvasElement;
  private fogCanvas!: HTMLCanvasElement;
  private lightCanvas!: HTMLCanvasElement;
  private minimapCanvas!: HTMLCanvasElement;
  private gameCtx!: CanvasRenderingContext2D;
  private fogCtx!: CanvasRenderingContext2D;
  private lightCtx!: CanvasRenderingContext2D;
  private minimapCtx!: CanvasRenderingContext2D;

  // Background
  private bgCanvas!: HTMLCanvasElement;
  private fogState!: FogRendererState;
  private exploredCanvas!: HTMLCanvasElement;
  private exploredCtx!: CanvasRenderingContext2D;

  // Input
  private keyboard!: KeyboardHandler;
  private pointer!: PointerHandler;

  // Game loop
  private lastTime = 0;
  private running = false;

  // Container element
  private container!: HTMLElement;

  constructor() {
    this.world = createGameWorld();
  }

  /**
   * Initialize the game with DOM elements.
   * Call after Preact has rendered the app and canvases exist in the DOM.
   */
  init(
    container: HTMLElement,
    gameCanvas: HTMLCanvasElement,
    fogCanvas: HTMLCanvasElement,
    lightCanvas: HTMLCanvasElement,
    minimapCanvas: HTMLCanvasElement,
  ): void {
    this.container = container;
    this.gameCanvas = gameCanvas;
    this.fogCanvas = fogCanvas;
    this.lightCanvas = lightCanvas;
    this.minimapCanvas = minimapCanvas;

    this.gameCtx = gameCanvas.getContext('2d', { alpha: false })!;
    this.fogCtx = fogCanvas.getContext('2d')!;
    this.lightCtx = lightCanvas.getContext('2d')!;
    this.minimapCtx = minimapCanvas.getContext('2d', { alpha: false })!;

    // Generate sprites
    const { sprites } = generateAllSprites();
    this.sprites = sprites;

    // Generate background
    this.bgCanvas = buildBackground();

    // Fog texture
    const { fogBgCanvas, fogPattern } = buildFogTexture(this.fogCtx);
    this.fogState = {
      fogBgCanvas,
      fogPattern: fogPattern!,
      exploredCanvas: null as any,
      exploredCtx: null as any,
    };

    // Explored fog canvas
    const explored = buildExploredCanvas();
    this.exploredCanvas = explored.canvas;
    this.exploredCtx = explored.ctx;
    this.fogState.exploredCanvas = this.exploredCanvas;
    this.fogState.exploredCtx = this.exploredCtx;

    // Resize
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Input
    this.keyboard = new KeyboardHandler(this.world, this);
    this.pointer = new PointerHandler(this.world, this, container, this.minimapCanvas);

    // Spawn initial entities
    this.spawnInitialEntities();

    // Camera to center on lodge
    const sx = WORLD_WIDTH / 2;
    const sy = WORLD_HEIGHT / 2;
    this.world.camX = sx - this.world.viewWidth / 2 - 200;
    this.world.camY = sy - this.world.viewHeight / 2 + 100;

    // Select lodge
    const lodge = this.world.selection[0];
    if (lodge != null) {
      Selectable.selected[lodge] = 1;
      this.world.isTracking = true;
    }

    // Fireflies
    this.world.fireflies = Array.from({ length: 150 }, () => ({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      vx: Math.random() - 0.5,
      vy: (Math.random() - 0.5) * 0.5 - 0.2,
      phase: Math.random() * Math.PI * 2,
    }));

    // Intro overlay fade
    gameStore.showIntro.value = true;
    setTimeout(() => {
      gameStore.showIntro.value = false;
    }, 1500);

    // Update UI store
    this.syncUIStore();

    // Start game loop
    this.running = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  private spawnInitialEntities(): void {
    const sx = WORLD_WIDTH / 2;
    const sy = WORLD_HEIGHT / 2;

    // Player lodge
    const lodgeEid = spawnEntity(this.world, EntityKind.Lodge, sx, sy, Faction.Player);
    this.world.selection = [lodgeEid];

    // 3 starting gatherers
    spawnEntity(this.world, EntityKind.Gatherer, sx - 40, sy + 40, Faction.Player);
    spawnEntity(this.world, EntityKind.Gatherer, sx + 40, sy + 40, Faction.Player);
    spawnEntity(this.world, EntityKind.Gatherer, sx, sy + 50, Faction.Player);

    // Nearby resources
    spawnEntity(this.world, EntityKind.Clambed, sx - 120, sy - 40, Faction.Neutral);
    for (let i = 0; i < 6; i++) {
      spawnEntity(
        this.world,
        EntityKind.Cattail,
        sx + 100 + Math.random() * 60,
        sy - 60 + Math.random() * 80,
        Faction.Neutral,
      );
    }

    // Scattered resources
    for (let i = 0; i < 300; i++) {
      spawnEntity(
        this.world,
        EntityKind.Cattail,
        Math.random() * WORLD_WIDTH,
        Math.random() * WORLD_HEIGHT,
        Faction.Neutral,
      );
    }
    for (let i = 0; i < 15; i++) {
      spawnEntity(
        this.world,
        EntityKind.Clambed,
        Math.random() * WORLD_WIDTH,
        Math.random() * WORLD_HEIGHT,
        Faction.Neutral,
      );
    }

    // Enemy camps
    const campLocs = [
      { x: 800, y: 800 },
      { x: WORLD_WIDTH - 800, y: 800 },
      { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 800 },
    ];
    for (const loc of campLocs) {
      spawnEntity(this.world, EntityKind.PredatorNest, loc.x, loc.y, Faction.Enemy);
      for (let j = 0; j < 2; j++) {
        spawnEntity(
          this.world,
          EntityKind.Gator,
          loc.x + (Math.random() - 0.5) * 150,
          loc.y + (Math.random() - 0.5) * 150,
          Faction.Enemy,
        );
        spawnEntity(
          this.world,
          EntityKind.Snake,
          loc.x + (Math.random() - 0.5) * 150,
          loc.y + (Math.random() - 0.5) * 150,
          Faction.Enemy,
        );
      }
    }
  }

  resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.world.viewWidth = w;
    this.world.viewHeight = h;
    this.gameCanvas.width = w;
    this.gameCanvas.height = h;
    this.fogCanvas.width = w;
    this.fogCanvas.height = h;
    this.lightCanvas.width = w;
    this.lightCanvas.height = h;
    this.gameCtx.imageSmoothingEnabled = false;
    this.fogCtx.imageSmoothingEnabled = false;
  }

  /** Cycle game speed (1x → 2x → 3x → 1x) */
  cycleSpeed(): void {
    const idx = SPEED_LEVELS.indexOf(this.world.gameSpeed as 1 | 2 | 3);
    this.world.gameSpeed = SPEED_LEVELS[(idx + 1) % SPEED_LEVELS.length];
    gameStore.gameSpeed.value = this.world.gameSpeed;
    audio.click();
  }

  /** Main game loop */
  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = timestamp - this.lastTime;
    if (dt > 1000 / 60) {
      if (this.world.state === 'playing') {
        for (let i = 0; i < this.world.gameSpeed; i++) {
          this.updateLogic();
        }
      }
      this.draw();
      this.lastTime = timestamp;
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  /** Run one frame of game logic */
  private updateLogic(): void {
    this.world.frameCount++;

    // Run all ECS systems in order
    dayNightSystem(this.world);
    updateCamera(this.world);
    clampCamera(this.world);
    movementSystem(this.world);
    collisionSystem(this.world);
    gatheringSystem(this.world);
    buildingSystem(this.world);
    combatSystem(this.world);
    projectileSystem(this.world);
    trainingSystem(this.world);
    aiSystem(this.world);
    healthSystem(this.world);
    fogOfWarSystem(this.world, this.exploredCtx);
    cleanupSystem(this.world);

    // Sync UI store periodically
    if (this.world.frameCount % 30 === 0) {
      this.syncUIStore();
    }
  }

  /** Render one frame */
  private draw(): void {
    const shake = computeShakeOffset(this.world);

    // Build render data
    const selectionRect: SelectionRect | null = this.pointer.getSelectionRect();
    const placement: PlacementPreview | null = this.getPlacementPreview();

    const renderData: RenderFrameData = {
      world: this.world,
      sprites: this.sprites,
      bgCanvas: this.bgCanvas,
      selectionRect,
      placement,
      shakeX: shake.x,
      shakeY: shake.y,
    };

    // Main game layer
    drawGame(this.gameCtx, renderData);

    // Fog of war
    drawFog(this.fogCtx, this.world, this.fogState, shake.x, shake.y);

    // Dynamic lighting
    drawLighting(this.lightCtx, this.world, shake.x, shake.y);

    // Minimap
    drawMinimap(this.minimapCtx, this.world, this.sprites, this.exploredCanvas);
    updateMinimapViewport(this.world);
  }

  private getPlacementPreview(): PlacementPreview | null {
    if (!this.world.placingBuilding) return null;
    const { TILE_SIZE } = require('@/constants');
    const mx = this.pointer.state.worldX;
    const my = this.pointer.state.worldY;
    const bx = Math.round(mx / TILE_SIZE) * TILE_SIZE;
    const by = Math.round(my / TILE_SIZE) * TILE_SIZE;
    return {
      type: this.world.placingBuilding,
      x: bx,
      y: by,
      valid: true, // Validation checked in selection.ts
    };
  }

  /** Sync game world state to reactive UI store */
  syncUIStore(): void {
    const w = this.world;
    gameStore.clams.value = w.resources.clams;
    gameStore.twigs.value = w.resources.twigs;
    gameStore.food.value = w.resources.food;
    gameStore.maxFood.value = w.resources.maxFood;
    gameStore.rateClams.value = w.resTracker.rateClams;
    gameStore.rateTwigs.value = w.resTracker.rateTwigs;
    gameStore.gameSpeed.value = w.gameSpeed;
    gameStore.frameCount.value = w.frameCount;
    gameStore.timeOfDay.value = w.timeOfDay;
    gameStore.gameState.value = w.state;
    gameStore.selection.value = [...w.selection];
    gameStore.muted.value = audio.muted;
  }

  /** Get sprite canvas by SpriteId */
  getSprite(id: SpriteId): HTMLCanvasElement {
    return this.sprites[id];
  }

  destroy(): void {
    this.running = false;
    this.keyboard.destroy();
    this.pointer.destroy();
  }
}

/** Singleton game instance */
export const game = new Game();
