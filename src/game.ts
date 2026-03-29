/**
 * Game Orchestrator
 *
 * Creates and manages the complete game lifecycle: canvas setup, world creation,
 * sprite generation, entity spawning, system execution, and rendering pipeline.
 * Faithful port of GAME.init() and GAME.loop() from pond_craft.html.
 */

import { query } from 'bitecs';
// Audio
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS, entityKindFromString, entityKindName } from '@/config/entity-defs';
import {
  DAY_FRAMES,
  SPEED_LEVELS,
  TILE_SIZE,
  TRAIN_TIMER,
  WAVE_INTERVAL,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsProjectile,
  Position,
  ProjectileData,
  Selectable,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import { aiSystem } from '@/ecs/systems/ai';
import { buildingSystem } from '@/ecs/systems/building';
import { cleanupSystem } from '@/ecs/systems/cleanup';
import { collisionSystem } from '@/ecs/systems/collision';
import { combatSystem } from '@/ecs/systems/combat';
import { dayNightSystem } from '@/ecs/systems/day-night';
import { fogOfWarSystem, initFogOfWar } from '@/ecs/systems/fog-of-war';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { healthSystem } from '@/ecs/systems/health';
// Systems
import { movementSystem } from '@/ecs/systems/movement';
import { projectileSystem } from '@/ecs/systems/projectile';
import { trainingSystem } from '@/ecs/systems/training';
import { createGameWorld, type GameWorld } from '@/ecs/world';
// Input
import { type KeyboardCallbacks, KeyboardHandler } from '@/input/keyboard';
import { type PointerCallbacks, PointerHandler } from '@/input/pointer';
// Selection utilities
import {
  canPlaceBuilding,
  getEntityAt,
  hasPlayerUnitsSelected,
  issueContextCommand,
  placeBuilding,
  selectArmy,
  selectIdleWorker,
} from '@/input/selection';
import { buildBackground, buildExploredCanvas, buildFogTexture } from '@/rendering/background';
import { clampCamera, computeShakeOffset } from '@/rendering/camera';
import { drawFog, type FogRendererState } from '@/rendering/fog-renderer';
import {
  drawGame,
  type PlacementPreview,
  type RenderFrameData,
  type SelectionRect,
} from '@/rendering/game-renderer';
import { drawLighting } from '@/rendering/light-renderer';
import { drawMinimap, updateMinimapViewport } from '@/rendering/minimap-renderer';
import type { ProjectileRenderData } from '@/rendering/particles';
// Rendering
import { generateAllSprites } from '@/rendering/sprites';
import { EntityKind, Faction, type SpriteId, UnitState } from '@/types';
// UI store
import * as store from '@/ui/store';

export class Game {
  world: GameWorld;
  spriteCanvases: Map<SpriteId, HTMLCanvasElement> = new Map();

  // Canvases
  private gameCanvas!: HTMLCanvasElement;
  private fogCanvas!: HTMLCanvasElement;
  private lightCanvas!: HTMLCanvasElement;
  private minimapCanvas!: HTMLCanvasElement;
  private minimapCamElement!: HTMLElement;
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
  private accumulator = 0;
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
    minimapCamElement: HTMLElement,
  ): void {
    this.container = container;
    this.gameCanvas = gameCanvas;
    this.fogCanvas = fogCanvas;
    this.lightCanvas = lightCanvas;
    this.minimapCanvas = minimapCanvas;
    this.minimapCamElement = minimapCamElement;

    const gameCtx = gameCanvas.getContext('2d', { alpha: false });
    const fogCtx = fogCanvas.getContext('2d');
    const lightCtx = lightCanvas.getContext('2d');
    const minimapCtx = minimapCanvas.getContext('2d', { alpha: false });
    if (!gameCtx || !fogCtx || !lightCtx || !minimapCtx) {
      throw new Error('Failed to acquire 2D rendering context from canvas');
    }
    this.gameCtx = gameCtx;
    this.fogCtx = fogCtx;
    this.lightCtx = lightCtx;
    this.minimapCtx = minimapCtx;

    // Generate sprites
    const { canvases } = generateAllSprites();
    this.spriteCanvases = canvases;

    // Generate background
    this.bgCanvas = buildBackground();

    // Fog texture
    const { fogPattern } = buildFogTexture(this.fogCtx);
    this.fogState = {
      fogCtx: this.fogCtx,
      fogPattern: fogPattern!,
    };

    // Explored fog canvas
    const explored = buildExploredCanvas();
    this.exploredCanvas = explored.exploredCanvas;
    this.exploredCtx = explored.exploredCtx;

    // Initialize fog-of-war system with explored context
    initFogOfWar(this.exploredCtx);

    // Resize
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Input
    const keyboardCallbacks: KeyboardCallbacks = {
      onToggleMute: () => {
        audio.toggleMute();
        store.muted.value = audio.muted;
      },
      onCycleSpeed: () => this.cycleSpeed(),
      onSelectIdleWorker: () => {
        selectIdleWorker(this.world);
        this.syncUIStore();
      },
      onSelectArmy: () => {
        selectArmy(this.world);
        this.syncUIStore();
      },
      onUpdateUI: () => this.syncUIStore(),
      onPlaySound: (name) => {
        if (name === 'selectUnit') audio.selectUnit();
        else if (name === 'selectBuild') audio.selectBuild();
        else audio.click();
      },
      hasPlayerUnitsSelected: () => hasPlayerUnitsSelected(this.world),
      getPlayerBuildings: () => {
        const ents = Array.from(
          query(this.world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]),
        );
        return ents.filter(
          (eid) => FactionTag.faction[eid] === Faction.Player && Health.current[eid] > 0,
        );
      },
      onHalt: () => {
        // Halt all selected units
        for (const eid of this.world.selection) {
          if (
            FactionTag.faction[eid] === Faction.Player &&
            !ENTITY_DEFS[EntityTypeTag.kind[eid] as EntityKind]?.isBuilding
          ) {
            // Set to idle
            UnitStateMachine.state[eid] = UnitState.Idle;
            UnitStateMachine.targetEntity[eid] = -1;
          }
        }
      },
      onAttackMoveMode: () => {
        this.world.attackMoveMode = true;
      },
      onActionHotkey: (_index: number) => {
        // Action hotkeys handled by UI layer
      },
    };
    this.keyboard = new KeyboardHandler(this.world, keyboardCallbacks);

    const pointerCallbacks: PointerCallbacks = {
      getEntityAt: (wx, wy) => getEntityAt(this.world, wx, wy),
      hasPlayerUnitsSelected: () => hasPlayerUnitsSelected(this.world),
      issueContextCommand: (target) => {
        issueContextCommand(
          this.world,
          target,
          this.pointer.mouse.worldX,
          this.pointer.mouse.worldY,
        );
      },
      onUpdateUI: () => this.syncUIStore(),
      onPlaceBuilding: () => {
        placeBuilding(this.world, this.pointer.mouse.worldX, this.pointer.mouse.worldY);
        this.syncUIStore();
      },
      onPlaySound: (name) => {
        if (name === 'selectUnit') audio.selectUnit();
        else if (name === 'selectBuild') audio.selectBuild();
        else audio.click();
      },
      isPlayerUnit: (eid) =>
        FactionTag.faction[eid] === Faction.Player &&
        !ENTITY_DEFS[EntityTypeTag.kind[eid] as EntityKind]?.isBuilding,
      isPlayerBuilding: (eid) =>
        FactionTag.faction[eid] === Faction.Player &&
        !!ENTITY_DEFS[EntityTypeTag.kind[eid] as EntityKind]?.isBuilding,
      isEnemyFaction: (eid) => FactionTag.faction[eid] === Faction.Enemy,
      isBuildingEntity: (eid) => !!ENTITY_DEFS[EntityTypeTag.kind[eid] as EntityKind]?.isBuilding,
      getEntityKind: (eid) => EntityTypeTag.kind[eid],
      isEntityOnScreen: (eid) => {
        const ex = Position.x[eid];
        const ey = Position.y[eid];
        return (
          ex >= this.world.camX &&
          ex <= this.world.camX + this.world.viewWidth &&
          ey >= this.world.camY &&
          ey <= this.world.camY + this.world.viewHeight
        );
      },
      getAllPlayerUnitsOfKind: (kind) => {
        const ents = Array.from(
          query(this.world.ecs, [Position, Health, FactionTag, EntityTypeTag]),
        );
        return ents.filter(
          (eid) =>
            FactionTag.faction[eid] === Faction.Player &&
            EntityTypeTag.kind[eid] === kind &&
            Health.current[eid] > 0,
        );
      },
      selectEntity: (eid) => {
        Selectable.selected[eid] = 1;
      },
      deselectEntity: (eid) => {
        Selectable.selected[eid] = 0;
      },
      deselectAll: () => {
        for (const eid of this.world.selection) {
          Selectable.selected[eid] = 0;
        }
      },
    };
    this.pointer = new PointerHandler(
      this.world,
      this.container,
      this.gameCanvas,
      pointerCallbacks,
    );
    this.pointer.attachMinimap(this.minimapCanvas);
    this.pointer.setShiftGetter(() => !!this.keyboard.keys.shift);

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

    // Update UI store
    this.syncUIStore();

    // Start game loop
    this.lastTime = performance.now();
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

  /** Cycle game speed (1x -> 2x -> 3x -> 1x) */
  cycleSpeed(): void {
    const idx = SPEED_LEVELS.indexOf(this.world.gameSpeed as 1 | 2 | 3);
    this.world.gameSpeed = SPEED_LEVELS[(idx + 1) % SPEED_LEVELS.length];
    store.gameSpeed.value = this.world.gameSpeed;
    audio.click();
  }

  /** Main game loop using a fixed timestep accumulator. */
  private loop(timestamp: number): void {
    if (!this.running) return;

    const FIXED_DT = 1000 / 60;
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // Cap accumulated time to prevent spiral of death
    this.accumulator += Math.min(dt, 200);

    while (this.accumulator >= FIXED_DT) {
      if (this.world.state === 'playing' && !this.world.paused) {
        for (let i = 0; i < this.world.gameSpeed; i++) {
          this.updateLogic();
        }
      }
      this.accumulator -= FIXED_DT;
    }

    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  /** Run one frame of game logic */
  private updateLogic(): void {
    this.world.frameCount++;

    // Camera panning from keyboard/edge
    this.keyboard.updatePan(
      this.pointer.mouse.in,
      this.pointer.mouse.x,
      this.pointer.mouse.y,
      this.pointer.mouse.isDown,
    );
    clampCamera(this.world);

    // Run all ECS systems in order
    dayNightSystem(this.world);
    movementSystem(this.world);
    collisionSystem(this.world);
    gatheringSystem(this.world);
    buildingSystem(this.world);
    combatSystem(this.world);
    projectileSystem(this.world);
    trainingSystem(this.world);
    aiSystem(this.world);
    healthSystem(this.world);
    fogOfWarSystem(this.world);
    cleanupSystem(this.world);

    // Apply camera velocity and friction
    this.world.camX += this.world.camVelX;
    this.world.camY += this.world.camVelY;
    this.world.camVelX *= 0.85;
    this.world.camVelY *= 0.85;

    // Sync UI store periodically
    if (this.world.frameCount % 30 === 0) {
      this.syncUIStore();
    }
  }

  /** Render one frame */
  private draw(): void {
    const shake = computeShakeOffset(this.world);

    // Build sorted entity list for rendering
    const allEnts = Array.from(
      query(this.world.ecs, [Position, Health, FactionTag, EntityTypeTag]),
    );
    const liveEnts = allEnts.filter((eid) => Health.current[eid] > 0);
    const sortedEids = liveEnts.sort((a, b) => Position.y[a] - Position.y[b]);

    // Player entities for fog
    const playerEids = allEnts.filter(
      (eid) => FactionTag.faction[eid] === Faction.Player && Health.current[eid] > 0,
    );

    // Build render data
    const dragRect = this.pointer.getDragRect();
    const selectionRect: SelectionRect | null = dragRect
      ? { startX: dragRect.minX, startY: dragRect.minY, endX: dragRect.maxX, endY: dragRect.maxY }
      : null;
    const placement: PlacementPreview | null = this.getPlacementPreview();

    // Query ECS for active projectile entities
    const projEids = Array.from(query(this.world.ecs, [Position, ProjectileData, IsProjectile]));
    const projectiles: ProjectileRenderData[] = projEids.map((eid) => ({
      x: Position.x[eid],
      y: Position.y[eid],
      trail: [] as { x: number; y: number; life: number }[],
    }));

    const renderData: RenderFrameData = {
      sortedEids,
      corpses: this.world.corpses,
      groundPings: this.world.groundPings,
      projectiles,
      frameCount: this.world.frameCount,
      shake,
      selectionRect,
      placement,
      isDragging: this.pointer.mouse.isDown,
    };

    // Main game layer
    drawGame(this.gameCtx, this.world, this.bgCanvas, this.spriteCanvases, renderData);

    // Fog of war
    drawFog(this.fogState, this.world, playerEids, shake.offsetX, shake.offsetY);

    // Dynamic lighting
    drawLighting(
      this.lightCtx,
      this.world,
      liveEnts,
      this.world.fireflies,
      shake.offsetX,
      shake.offsetY,
    );

    // Minimap
    drawMinimap(
      this.minimapCtx,
      this.world,
      liveEnts,
      this.exploredCanvas,
      this.world.minimapPings ?? [],
    );
    updateMinimapViewport(this.minimapCamElement, this.world);
  }

  private getPlacementPreview(): PlacementPreview | null {
    if (!this.world.placingBuilding) return null;
    const mx = this.pointer.mouse.worldX;
    const my = this.pointer.mouse.worldY;
    const bx = Math.round(mx / TILE_SIZE) * TILE_SIZE;
    const by = Math.round(my / TILE_SIZE) * TILE_SIZE;
    const type = this.world.placingBuilding;
    const kind = entityKindFromString(type);
    const def = kind !== undefined ? ENTITY_DEFS[kind] : undefined;
    const spriteW = def ? def.spriteSize * def.spriteScale : 64;
    const spriteH = def ? def.spriteSize * def.spriteScale : 64;
    return {
      buildingType: type,
      worldX: bx,
      worldY: by,
      canPlace: canPlaceBuilding(this.world, bx, by, spriteW, spriteH),
    };
  }

  /** Sync game world state to reactive UI store */
  syncUIStore(): void {
    const w = this.world;
    store.clams.value = w.resources.clams;
    store.twigs.value = w.resources.twigs;
    store.food.value = w.resources.food;
    store.maxFood.value = w.resources.maxFood;
    store.rateClams.value = w.resTracker.rateClams;
    store.rateTwigs.value = w.resTracker.rateTwigs;
    store.gameSpeed.value = w.gameSpeed;
    store.gameState.value = w.state;
    store.muted.value = audio.muted;
    store.paused.value = w.paused;
    store.attackMoveActive.value = w.attackMoveMode;
    store.lowClams.value = w.resources.clams < 50;
    store.lowTwigs.value = w.resources.twigs < 50;

    // Game over stats
    if (w.state === 'win' || w.state === 'lose') {
      store.goTitle.value = w.state === 'win' ? 'Victory' : 'Defeat';
      store.goTitleColor.value = w.state === 'win' ? 'text-amber-400' : 'text-red-500';
      store.goDesc.value =
        w.state === 'win' ? 'All predator nests destroyed!' : 'Your lodge was destroyed!';

      const days = Math.floor(w.frameCount / DAY_FRAMES);
      const remainFrames = w.frameCount % DAY_FRAMES;
      const hours = Math.floor((remainFrames / DAY_FRAMES) * 24);
      store.goTimeSurvived.value = `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
      store.goFrameCount.value = w.frameCount;

      const statLines = [
        `Time: ${store.goTimeSurvived.value}`,
        `Kills: ${w.stats.unitsKilled}`,
        `Losses: ${w.stats.unitsLost}`,
        `Resources gathered: ${w.stats.resourcesGathered}`,
        `Buildings built: ${w.stats.buildingsBuilt}`,
        `Peak army: ${w.stats.peakArmy}`,
      ];
      store.goStatLines.value = statLines;
      store.goStatsText.value = statLines.join(' | ');

      // Performance rating: 1-3 stars
      const daysSurvived = Math.max(1, days);
      const killRatio = w.stats.unitsLost > 0 ? w.stats.unitsKilled / w.stats.unitsLost : 10;
      let stars = 1;
      if (w.state === 'win') {
        stars = 2;
        if (daysSurvived <= 10 && killRatio >= 2) stars = 3;
        else if (daysSurvived <= 20 || killRatio >= 1.5) stars = 2;
      } else {
        if (daysSurvived >= 10 && killRatio >= 1) stars = 2;
        if (daysSurvived >= 20 && killRatio >= 2) stars = 3;
      }
      store.goRating.value = stars;
    }

    // Wave countdown timer
    if (w.frameCount >= w.peaceTimer) {
      const framesSinceLastWave = w.frameCount % WAVE_INTERVAL;
      const framesUntilNext = WAVE_INTERVAL - framesSinceLastWave;
      store.waveCountdown.value = Math.ceil(framesUntilNext / 60);
    } else {
      store.waveCountdown.value = -1;
    }

    // Global production queue
    const trainingBuildings = query(w.ecs, [
      Position,
      TrainingQueue,
      Building,
      FactionTag,
      IsBuilding,
      Health,
    ]);
    const prodQueue: store.QueueItem[] = [];
    for (let i = 0; i < trainingBuildings.length; i++) {
      const eid = trainingBuildings[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;
      const slots = trainingQueueSlots.get(eid) ?? [];
      if (slots.length === 0) continue;
      const unitKind = slots[0] as EntityKind;
      const progress = Math.max(
        0,
        Math.min(100, ((TRAIN_TIMER - TrainingQueue.timer[eid]) / TRAIN_TIMER) * 100),
      );
      prodQueue.push({
        buildingKind: EntityTypeTag.kind[eid],
        unitLabel: entityKindName(unitKind),
        progress,
      });
    }
    store.globalProductionQueue.value = prodQueue;
  }

  /** Get sprite canvas by SpriteId */
  getSprite(id: SpriteId): HTMLCanvasElement | undefined {
    return this.spriteCanvases.get(id);
  }

  destroy(): void {
    this.running = false;
    this.keyboard.destroy();
    this.pointer.destroy();
  }
}

/** Singleton game instance */
export const game = new Game();
