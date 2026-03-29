/**
 * Game Orchestrator
 *
 * Manages the complete game lifecycle: canvas setup, world creation,
 * sprite generation, entity spawning, system execution, and rendering pipeline.
 */

import { animate } from 'animejs';
import { hasComponent, query } from 'bitecs';
// Audio
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS, entityKindFromString, entityKindName } from '@/config/entity-defs';
import { canResearch, TECH_UPGRADES } from '@/config/tech-tree';
import {
  DAY_FRAMES,
  SPEED_LEVELS,
  TILE_SIZE,
  TRAIN_TIMER,
  VET_RANK_NAMES,
  WAVE_INTERVAL,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsProjectile,
  IsResource,
  Position,
  ProjectileData,
  Selectable,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
  Veterancy,
} from '@/ecs/components';
import { aiSystem } from '@/ecs/systems/ai';
import { autoBehaviorSystem } from '@/ecs/systems/auto-behavior';
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
import { veterancySystem } from '@/ecs/systems/veterancy';
import { createGameWorld, type GameWorld } from '@/ecs/world';
// Input
import { type KeyboardCallbacks, KeyboardHandler } from '@/input/keyboard';
import { type PointerCallbacks, PointerHandler } from '@/input/pointer';
// Selection utilities
import {
  cancelTrain,
  canPlaceBuilding,
  getEntityAt,
  hasPlayerUnitsSelected,
  issueContextCommand,
  placeBuilding,
  selectArmy,
  selectIdleWorker,
  train,
} from '@/input/selection';
import { PhysicsManager } from '@/physics/physics-world';
import { cleanupEntityAnimation, triggerCommandPulse } from '@/rendering/animations';
import { buildBackground, buildExploredCanvas, buildFogTexture } from '@/rendering/background';
import { clampCamera, computeShakeOffset } from '@/rendering/camera';
import { drawFog, type FogRendererState } from '@/rendering/fog-renderer';
import { drawLighting } from '@/rendering/light-renderer';
import { drawMinimap, updateMinimapViewport } from '@/rendering/minimap-renderer';
import type { ProjectileRenderData } from '@/rendering/particles';
import { updateProjectileTrails } from '@/rendering/particles';
import {
  destroyPixiApp,
  initPixiApp,
  type PixiRenderFrameData,
  type PlacementPreview,
  renderPixiFrame,
  resizePixiApp,
  setBackground,
  setColorBlindMode,
} from '@/rendering/pixi-app';
// Rendering
import { generateAllSprites } from '@/rendering/sprites';
import { EntityKind, Faction, type SpriteId, UnitState } from '@/types';
import {
  type ActionButtonDef,
  actionButtons,
  type QueueItemDef,
  queueItems,
} from '@/ui/action-panel';
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

  // Physics
  physicsManager!: PhysicsManager;

  // Track entity count to detect newly spawned entities for physics body creation
  private lastKnownEntities: Set<number> = new Set();

  // Game loop
  private lastTime = 0;
  private accumulator = 0;
  private running = false;

  // Audio/music state tracking
  private audioInitialized = false;
  private wasPeaceful = true;
  private wasGameOver = false;

  // Smooth camera pan animation (anime.js)
  private _panAnim: { pause: () => void } | null = null;

  // Bound resize handler for cleanup
  private boundResize!: () => void;

  // Container element
  private container!: HTMLElement;

  constructor() {
    this.world = createGameWorld();
  }

  /**
   * Initialize the game with DOM elements.
   * Call after Preact has rendered the app and canvases exist in the DOM.
   */
  async init(
    container: HTMLElement,
    gameCanvas: HTMLCanvasElement,
    fogCanvas: HTMLCanvasElement,
    lightCanvas: HTMLCanvasElement,
    minimapCanvas: HTMLCanvasElement,
    minimapCamElement: HTMLElement,
  ): Promise<void> {
    this.container = container;
    this.gameCanvas = gameCanvas;
    this.fogCanvas = fogCanvas;
    this.lightCanvas = lightCanvas;
    this.minimapCanvas = minimapCanvas;
    this.minimapCamElement = minimapCamElement;

    const fogCtx = fogCanvas.getContext('2d');
    const lightCtx = lightCanvas.getContext('2d');
    const minimapCtx = minimapCanvas.getContext('2d', { alpha: false });
    if (!fogCtx || !lightCtx || !minimapCtx) {
      throw new Error('Failed to acquire 2D rendering context from canvas');
    }
    this.fogCtx = fogCtx;
    this.lightCtx = lightCtx;
    this.minimapCtx = minimapCtx;

    // Generate sprites (also registers PixiJS textures via registerSpriteTexture)
    const { canvases } = generateAllSprites();
    this.spriteCanvases = canvases;

    // Generate background
    this.bgCanvas = buildBackground();

    // Resize canvases before PixiJS init so viewWidth/viewHeight are set
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.world.viewWidth = w;
    this.world.viewHeight = h;
    this.fogCanvas.width = w;
    this.fogCanvas.height = h;
    this.lightCanvas.width = w;
    this.lightCanvas.height = h;
    this.fogCtx.imageSmoothingEnabled = false;

    // Initialise PixiJS application on the main game canvas
    await initPixiApp(gameCanvas, w, h);
    setBackground(this.bgCanvas);

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
    this.boundResize = () => this.resize();
    window.addEventListener('resize', this.boundResize);

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
            UnitStateMachine.hasAttackMoveTarget[eid] = 0;
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
        // Trigger command pulse animation for selected units
        for (const eid of this.world.selection) {
          triggerCommandPulse(eid);
        }
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

    // Initialize physics
    this.physicsManager = new PhysicsManager();

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

    // Sync color blind mode signal to renderer module-level flag
    store.colorBlindMode.subscribe((enabled) => {
      setColorBlindMode(enabled);
    });

    // Initialize audio on first user interaction (AudioContext policy)
    const initAudioOnce = async () => {
      if (this.audioInitialized) return;
      this.audioInitialized = true;
      await audio.init();
      audio.startAmbient();
      audio.startMusic(true);
      document.removeEventListener('pointerdown', initAudioOnce);
      document.removeEventListener('keydown', initAudioOnce);
    };
    document.addEventListener('pointerdown', initAudioOnce, { once: false });
    document.addEventListener('keydown', initAudioOnce, { once: false });

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

    // Scattered resources (sparse — resources are scarce)
    for (let i = 0; i < 80; i++) {
      spawnEntity(
        this.world,
        EntityKind.Cattail,
        Math.random() * WORLD_WIDTH,
        Math.random() * WORLD_HEIGHT,
        Faction.Neutral,
      );
    }
    for (let i = 0; i < 4; i++) {
      spawnEntity(
        this.world,
        EntityKind.Clambed,
        Math.random() * WORLD_WIDTH,
        Math.random() * WORLD_HEIGHT,
        Faction.Neutral,
      );
    }

    // Rich center cluster — contested middle area
    for (let i = 0; i < 15; i++) {
      spawnEntity(
        this.world,
        EntityKind.Cattail,
        sx + (Math.random() - 0.5) * 400,
        sy + (Math.random() - 0.5) * 400,
        Faction.Neutral,
      );
    }
    for (let i = 0; i < 5; i++) {
      spawnEntity(
        this.world,
        EntityKind.Clambed,
        sx + (Math.random() - 0.5) * 300,
        sy + (Math.random() - 0.5) * 300,
        Faction.Neutral,
      );
    }

    // Randomized enemy nest positions along map edges
    // Pick 2-3 nests from candidate edge positions, ensuring minimum distance from player and each other
    const edgeCandidates = [
      { x: 600, y: 600 },
      { x: WORLD_WIDTH - 600, y: 600 },
      { x: 600, y: WORLD_HEIGHT - 600 },
      { x: WORLD_WIDTH - 600, y: WORLD_HEIGHT - 600 },
      { x: WORLD_WIDTH / 2, y: 500 },
      { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 500 },
      { x: 500, y: WORLD_HEIGHT / 2 },
      { x: WORLD_WIDTH - 500, y: WORLD_HEIGHT / 2 },
    ];
    // Shuffle candidates
    for (let i = edgeCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [edgeCandidates[i], edgeCandidates[j]] = [edgeCandidates[j], edgeCandidates[i]];
    }
    // Pick 2-3 nests with minimum spacing
    const nestCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
    const campLocs: { x: number; y: number }[] = [];
    const minNestDist = 800;
    for (const cand of edgeCandidates) {
      if (campLocs.length >= nestCount) break;
      // Must be far enough from player start
      const dpx = cand.x - sx;
      const dpy = cand.y - sy;
      if (Math.sqrt(dpx * dpx + dpy * dpy) < 600) continue;
      // Must be far enough from other nests
      let tooClose = false;
      for (const existing of campLocs) {
        const dx = cand.x - existing.x;
        const dy = cand.y - existing.y;
        if (Math.sqrt(dx * dx + dy * dy) < minNestDist) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) campLocs.push(cand);
    }

    // Contested resource hotspots — midpoints between player and each enemy camp
    for (const camp of campLocs) {
      const mx = (sx + camp.x) / 2;
      const my = (sy + camp.y) / 2;
      for (let i = 0; i < 6; i++) {
        spawnEntity(
          this.world,
          EntityKind.Cattail,
          mx + (Math.random() - 0.5) * 250,
          my + (Math.random() - 0.5) * 250,
          Faction.Neutral,
        );
      }
      spawnEntity(
        this.world,
        EntityKind.Clambed,
        mx + (Math.random() - 0.5) * 200,
        my + (Math.random() - 0.5) * 200,
        Faction.Neutral,
      );
    }

    // Enemy camps at randomized positions
    for (const loc of campLocs) {
      // Cluster near each camp: 8 cattails + 1 clambed within 200px
      for (let i = 0; i < 8; i++) {
        spawnEntity(
          this.world,
          EntityKind.Cattail,
          loc.x + (Math.random() - 0.5) * 400,
          loc.y + (Math.random() - 0.5) * 400,
          Faction.Neutral,
        );
      }
      spawnEntity(
        this.world,
        EntityKind.Clambed,
        loc.x + (Math.random() - 0.5) * 400,
        loc.y + (Math.random() - 0.5) * 400,
        Faction.Neutral,
      );

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
    // PixiJS manages the game canvas size
    resizePixiApp(w, h);
    this.fogCanvas.width = w;
    this.fogCanvas.height = h;
    this.lightCanvas.width = w;
    this.lightCanvas.height = h;
    this.fogCtx.imageSmoothingEnabled = false;
  }

  /** Cycle game speed (1x -> 2x -> 3x -> 1x) */
  cycleSpeed(): void {
    const idx = SPEED_LEVELS.indexOf(this.world.gameSpeed as 1 | 2 | 3);
    this.world.gameSpeed = SPEED_LEVELS[(idx + 1) % SPEED_LEVELS.length];
    store.gameSpeed.value = this.world.gameSpeed;
    audio.click();
  }

  /**
   * Smooth camera pan to a world position using anime.js.
   * Used for minimap clicks and control group recall.
   */
  smoothPanTo(x: number, y: number): void {
    if (this._panAnim) this._panAnim.pause();
    this.world.isTracking = false;

    const target = {
      camX: this.world.camX,
      camY: this.world.camY,
    };
    this._panAnim = animate(target, {
      camX: x - this.world.viewWidth / 2,
      camY: y - this.world.viewHeight / 2,
      duration: 400,
      ease: 'outQuad',
      onUpdate: () => {
        this.world.camX = target.camX;
        this.world.camY = target.camY;
      },
      onComplete: () => {
        this._panAnim = null;
      },
    });
  }

  /**
   * Sync physics bodies with ECS entities.
   * Creates bodies for new entities, removes bodies for dead/removed ones.
   */
  private syncPhysicsBodies(): void {
    const allEnts = query(this.world.ecs, [Position, Collider, Health]);
    const currentEntities = new Set<number>();

    for (let i = 0; i < allEnts.length; i++) {
      const eid = allEnts[i];
      currentEntities.add(eid);

      if (Health.current[eid] <= 0) {
        // Entity is dead - remove physics body and animation state
        if (this.physicsManager.hasBody(eid)) {
          this.physicsManager.removeBody(eid);
          cleanupEntityAnimation(eid);
        }
        continue;
      }

      // Create body for new entities
      if (!this.physicsManager.hasBody(eid)) {
        this.physicsManager.createBody(this.world.ecs, eid);
      }
    }

    // Remove bodies for entities that no longer exist in ECS
    for (const eid of this.lastKnownEntities) {
      if (!currentEntities.has(eid)) {
        this.physicsManager.removeBody(eid);
        cleanupEntityAnimation(eid);
      }
    }

    this.lastKnownEntities = currentEntities;
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
    const manualPan = this.keyboard.updatePan(
      this.pointer.mouse.in,
      this.pointer.mouse.x,
      this.pointer.mouse.y,
      this.pointer.mouse.isDown,
    );

    // Camera tracking: smoothly lerp toward selection center (POC lines 1170-1177)
    if (this.world.isTracking && this.world.selection.length > 0 && !manualPan) {
      let cx = 0;
      let cy = 0;
      let validCount = 0;
      for (const eid of this.world.selection) {
        if (Health.current[eid] > 0) {
          cx += Position.x[eid];
          cy += Position.y[eid];
          validCount++;
        }
      }
      if (validCount > 0) {
        cx /= validCount;
        cy /= validCount;
        this.world.camX += (cx - this.world.viewWidth / 2 - this.world.camX) * 0.1;
        this.world.camY += (cy - this.world.viewHeight / 2 - this.world.camY) * 0.1;
      } else {
        this.world.isTracking = false;
      }
    }

    clampCamera(this.world);

    // Update Yuka AI steering (1/60s fixed step)
    this.world.yukaManager.update(1 / 60, this.world.ecs);

    // Sync physics bodies: create for new entities, remove for dead ones
    this.syncPhysicsBodies();

    // Run all ECS systems in order
    dayNightSystem(this.world);
    movementSystem(this.world);
    collisionSystem(this.world, this.physicsManager);
    gatheringSystem(this.world);
    buildingSystem(this.world);
    combatSystem(this.world);
    projectileSystem(this.world);
    trainingSystem(this.world);
    aiSystem(this.world);
    autoBehaviorSystem(this.world);
    healthSystem(this.world);
    veterancySystem(this.world);
    fogOfWarSystem(this.world);
    cleanupSystem(this.world);

    // Consume pending drag-select rectangle from pointer handler
    const pendingDrag = this.pointer.consumeDragRect();
    if (pendingDrag) {
      const dragEnts = query(this.world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
      for (let i = 0; i < dragEnts.length; i++) {
        const eid = dragEnts[i];
        if (FactionTag.faction[eid] !== Faction.Player) continue;
        if (Health.current[eid] <= 0) continue;
        if (ENTITY_DEFS[EntityTypeTag.kind[eid] as EntityKind]?.isBuilding) continue;
        const ex = Position.x[eid];
        const ey = Position.y[eid];
        if (
          ex >= pendingDrag.minX &&
          ex <= pendingDrag.maxX &&
          ey >= pendingDrag.minY &&
          ey <= pendingDrag.maxY
        ) {
          if (!this.world.selection.includes(eid)) {
            this.world.selection.push(eid);
            Selectable.selected[eid] = 1;
          }
        }
      }
      if (this.world.selection.length > 0) {
        this.world.isTracking = true;
      }
      this.syncUIStore();
    }

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
    const selectionRect = dragRect
      ? { startX: dragRect.minX, startY: dragRect.minY, endX: dragRect.maxX, endY: dragRect.maxY }
      : null;
    const placement = this.getPlacementPreview();

    // Query ECS for active projectile entities
    const projEids = Array.from(query(this.world.ecs, [Position, ProjectileData, IsProjectile]));
    const projectiles: ProjectileRenderData[] = projEids.map((eid) => ({
      x: Position.x[eid],
      y: Position.y[eid],
      trail: [] as { x: number; y: number; life: number }[],
    }));

    // Update projectile trails (mutation step, done once per frame)
    updateProjectileTrails(projectiles);

    const renderData: PixiRenderFrameData = {
      sortedEids,
      corpses: this.world.corpses,
      groundPings: this.world.groundPings,
      projectiles,
      particles: this.world.particles,
      floatingTexts: this.world.floatingTexts,
      frameCount: this.world.frameCount,
      shake,
      selectionRect,
      placement,
      isDragging: this.pointer.mouse.isDown,
    };

    // Main game layer (PixiJS)
    renderPixiFrame(this.world, this.spriteCanvases, renderData);

    // Fog of war (Canvas2D overlay)
    drawFog(this.fogState, this.world, playerEids, shake.offsetX, shake.offsetY);

    // Dynamic lighting (Canvas2D overlay)
    drawLighting(
      this.lightCtx,
      this.world,
      liveEnts,
      this.world.fireflies,
      shake.offsetX,
      shake.offsetY,
    );

    // Minimap (Canvas2D)
    drawMinimap(
      this.minimapCtx,
      this.world,
      liveEnts,
      this.exploredCanvas,
      this.world.minimapPings ?? [],
      playerEids,
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
    let def: (typeof ENTITY_DEFS)[EntityKind] | undefined;
    try {
      def = ENTITY_DEFS[entityKindFromString(type)];
    } catch {
      def = undefined;
    }
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
    // food and maxFood are calculated below from entity counts
    store.rateClams.value = w.resTracker.rateClams;
    store.rateTwigs.value = w.resTracker.rateTwigs;
    store.gameSpeed.value = w.gameSpeed;
    store.gameState.value = w.state;
    store.muted.value = audio.muted;
    store.paused.value = w.paused;
    store.attackMoveActive.value = w.attackMoveMode;
    store.hasPlayerUnits.value = hasPlayerUnitsSelected(this.world);

    // Sync auto-behavior toggles from UI store into game world
    w.autoBehaviors.gather = store.autoGatherEnabled.value;
    w.autoBehaviors.defend = store.autoDefendEnabled.value;
    w.autoBehaviors.attack = store.autoAttackEnabled.value;
    w.autoBehaviors.scout = store.autoScoutEnabled.value;

    store.lowClams.value = w.resources.clams < 50;
    store.lowTwigs.value = w.resources.twigs < 50;

    // --- Control group counts ---
    const groupCounts: Record<number, number> = {};
    for (const [gnum, eids] of Object.entries(w.ctrlGroups)) {
      const alive = eids.filter((eid) => Health.current[eid] > 0);
      if (alive.length > 0) {
        groupCounts[Number(gnum)] = alive.length;
      }
    }
    store.ctrlGroupCounts.value = groupCounts;

    // --- Food population system (POC lines 1261-1270) ---
    // Count current population (all player non-building non-resource entities)
    // and max food capacity (sum of foodProvided from completed lodges/burrows)
    const allEntsForFood = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);
    let curFood = 0;
    let maxFoodCap = 0;
    let idleWorkers = 0;
    let armyUnits = 0;

    for (let i = 0; i < allEntsForFood.length; i++) {
      const eid = allEntsForFood[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;

      const kind = EntityTypeTag.kind[eid] as EntityKind;

      if (hasComponent(w.ecs, eid, IsBuilding)) {
        // Completed buildings with foodProvided contribute to max food
        if (Building.progress[eid] >= 100) {
          const def = ENTITY_DEFS[kind];
          if (def.foodProvided) {
            maxFoodCap += def.foodProvided;
          }
        }
      } else if (!hasComponent(w.ecs, eid, IsResource)) {
        // Non-building, non-resource player entities count as population
        curFood++;
        if (kind === EntityKind.Gatherer) {
          if (UnitStateMachine.state[eid] === UnitState.Idle) {
            idleWorkers++;
          }
        } else {
          armyUnits++;
        }
      }
    }

    w.resources.food = curFood;
    w.resources.maxFood = maxFoodCap;
    store.food.value = curFood;
    store.maxFood.value = maxFoodCap;
    store.idleWorkerCount.value = idleWorkers;
    store.armyCount.value = armyUnits;

    // Track peak army
    if (armyUnits > w.stats.peakArmy) {
      w.stats.peakArmy = armyUnits;
    }

    // --- Peace timer display ---
    const peaceful = w.frameCount < w.peaceTimer;
    store.isPeaceful.value = peaceful;
    if (peaceful) {
      store.peaceCountdown.value = Math.ceil((w.peaceTimer - w.frameCount) / 60);
    }

    // --- Music transitions on peace/hunting change ---
    if (this.audioInitialized) {
      if (this.wasPeaceful && !peaceful) {
        // Peace just ended: switch to hunting music
        audio.startMusic(false);
      }
      this.wasPeaceful = peaceful;

      // Update ambient sounds with current darkness
      audio.updateAmbient(w.ambientDarkness);
    }

    // --- Time display ---
    const totalMinutes = w.timeOfDay;
    const displayHours = Math.floor(totalMinutes / 60) % 24;
    const displayMinutes = Math.floor(totalMinutes) % 60;
    const day = Math.floor(w.frameCount / DAY_FRAMES) + 1;
    store.gameDay.value = day;
    store.gameTimeDisplay.value = `Day ${day} - ${String(displayHours).padStart(2, '0')}:${String(displayMinutes).padStart(2, '0')}`;

    // Game over stats
    if (w.state === 'win' || w.state === 'lose') {
      // Stop music on game over (once)
      if (this.audioInitialized && !this.wasGameOver) {
        audio.stopMusic();
        this.wasGameOver = true;
      }
      store.goTitle.value = w.state === 'win' ? 'Victory' : 'Defeat';
      store.goTitleColor.value = w.state === 'win' ? 'text-amber-400' : 'text-red-500';
      store.goDesc.value =
        w.state === 'win' ? 'All predator nests destroyed!' : 'All lodges destroyed!';

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
        entityId: eid,
      });
    }
    store.globalProductionQueue.value = prodQueue;

    // --- Selection info sync ---
    if (w.selection.length === 0) {
      // No selection: show global Command Center
      store.selectionCount.value = 0;
      store.selectionName.value = 'Command Center';
      store.selectionNameColor.value = 'text-sky-400';
      store.selectionShowHpBar.value = false;
      store.selectionIsMulti.value = false;
      store.selectionStatsHtml.value = `Idle: ${idleWorkers} | Army: ${armyUnits} | Pop: ${curFood}/${maxFoodCap}`;
      store.selectionDesc.value = '';
      store.selectionSpriteData.value = null;
      store.selectionKills.value = 0;
    } else if (w.selection.length === 1) {
      const selEid = w.selection[0];
      const kind = EntityTypeTag.kind[selEid] as EntityKind;
      const faction = FactionTag.faction[selEid] as Faction;
      store.selectionCount.value = 1;
      store.selectionName.value = entityKindName(kind);
      store.selectionIsMulti.value = false;
      store.selectionNameColor.value =
        faction === Faction.Player
          ? 'text-green-400'
          : faction === Faction.Enemy
            ? 'text-red-400'
            : 'text-slate-400';
      store.selectionHp.value = Health.current[selEid];
      store.selectionMaxHp.value = Health.max[selEid];
      store.selectionShowHpBar.value = !hasComponent(w.ecs, selEid, IsResource);
      store.selectionKills.value = hasComponent(w.ecs, selEid, Combat) ? Combat.kills[selEid] : 0;
      // Build stats string (show actual values which may include vet bonuses)
      const def = ENTITY_DEFS[kind];
      const statParts: string[] = [];
      statParts.push(`HP: ${Health.current[selEid]}/${Health.max[selEid]}`);
      if (hasComponent(w.ecs, selEid, Combat) && Combat.damage[selEid] > 0)
        statParts.push(`Dmg: ${Combat.damage[selEid]}`);
      if (hasComponent(w.ecs, selEid, Combat) && Combat.attackRange[selEid] > 0)
        statParts.push(`Range: ${Combat.attackRange[selEid]}`);
      if (def.speed > 0 && !def.isBuilding && hasComponent(w.ecs, selEid, Velocity))
        statParts.push(`Spd: ${Velocity.speed[selEid].toFixed(1)}`);
      // Show veterancy rank if unit has it
      if (hasComponent(w.ecs, selEid, Veterancy)) {
        const vetRank = Veterancy.rank[selEid];
        if (vetRank > 0) {
          statParts.push(`Rank: ${VET_RANK_NAMES[vetRank]}`);
        }
      }
      store.selectionStatsHtml.value = statParts.join(' | ');
      // Describe current state
      const state = UnitStateMachine.state[selEid] as UnitState;
      const stateNames: Record<number, string> = {
        [UnitState.Idle]: 'Idle',
        [UnitState.Move]: 'Moving',
        [UnitState.GatherMove]: 'Moving to gather',
        [UnitState.Gathering]: 'Gathering',
        [UnitState.ReturnMove]: 'Returning resources',
        [UnitState.BuildMove]: 'Moving to build',
        [UnitState.Building]: 'Building',
        [UnitState.RepairMove]: 'Moving to repair',
        [UnitState.Repairing]: 'Repairing',
        [UnitState.AttackMove]: 'Attack-moving',
        [UnitState.Attacking]: 'Attacking',
        [UnitState.AttackMovePatrol]: 'Patrolling',
      };
      store.selectionDesc.value = stateNames[state] ?? '';
      store.selectionSpriteData.value = null;
    } else {
      // Multiple selected
      store.selectionIsMulti.value = true;
      store.selectionCount.value = w.selection.length;
      store.selectionName.value = `${w.selection.length} Units`;
      store.selectionNameColor.value = 'text-green-400';
      store.selectionShowHpBar.value = false;
      store.selectionSpriteData.value = null;
      // Build composition string
      const kindCounts = new Map<EntityKind, number>();
      for (const eid of w.selection) {
        const k = EntityTypeTag.kind[eid] as EntityKind;
        kindCounts.set(k, (kindCounts.get(k) ?? 0) + 1);
      }
      const compParts: string[] = [];
      for (const [k, count] of kindCounts) {
        compParts.push(`${count} ${entityKindName(k)}`);
      }
      store.selectionComposition.value = compParts.join(', ');
      store.selectionStatsHtml.value = '';
      store.selectionDesc.value = '';
      store.selectionKills.value = 0;
    }

    // --- Action panel buttons (context-sensitive) ---
    const btns: ActionButtonDef[] = [];
    const qItems: QueueItemDef[] = [];

    if (w.selection.length === 0) {
      // Global Command Center: find first completed player Lodge and show its actions
      const allBuildings = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
      let lodgeEid = -1;
      for (let i = 0; i < allBuildings.length; i++) {
        const eid = allBuildings[i];
        if (
          FactionTag.faction[eid] === Faction.Player &&
          EntityTypeTag.kind[eid] === EntityKind.Lodge &&
          Health.current[eid] > 0 &&
          Building.progress[eid] >= 100
        ) {
          lodgeEid = eid;
          break;
        }
      }
      if (lodgeEid >= 0) {
        const gDef = ENTITY_DEFS[EntityKind.Gatherer];
        btns.push({
          title: 'Gatherer',
          cost: `${gDef.clamCost}C ${gDef.foodCost}F`,
          hotkey: 'Q',
          affordable:
            w.resources.clams >= (gDef.clamCost ?? 0) &&
            w.resources.food + (gDef.foodCost ?? 1) <= w.resources.maxFood,
          description: 'Worker unit',
          onClick: () => {
            train(
              w,
              lodgeEid,
              EntityKind.Gatherer,
              gDef.clamCost ?? 0,
              gDef.twigCost ?? 0,
              gDef.foodCost ?? 1,
            );
          },
        });
        const smTech = TECH_UPGRADES.sturdyMud;
        btns.push({
          title: smTech.name,
          cost: `${smTech.clamCost}C ${smTech.twigCost}T`,
          hotkey: 'W',
          affordable:
            canResearch('sturdyMud', w.tech) &&
            w.resources.clams >= smTech.clamCost &&
            w.resources.twigs >= smTech.twigCost,
          description: smTech.description,
          onClick: () => {
            if (
              canResearch('sturdyMud', w.tech) &&
              w.resources.clams >= smTech.clamCost &&
              w.resources.twigs >= smTech.twigCost
            ) {
              w.resources.clams -= smTech.clamCost;
              w.resources.twigs -= smTech.twigCost;
              w.tech.sturdyMud = true;
            }
          },
        });
        const spTech = TECH_UPGRADES.swiftPaws;
        btns.push({
          title: spTech.name,
          cost: `${spTech.clamCost}C ${spTech.twigCost}T`,
          hotkey: 'E',
          affordable:
            canResearch('swiftPaws', w.tech) &&
            w.resources.clams >= spTech.clamCost &&
            w.resources.twigs >= spTech.twigCost,
          description: spTech.description,
          onClick: () => {
            if (
              canResearch('swiftPaws', w.tech) &&
              w.resources.clams >= spTech.clamCost &&
              w.resources.twigs >= spTech.twigCost
            ) {
              w.resources.clams -= spTech.clamCost;
              w.resources.twigs -= spTech.twigCost;
              w.tech.swiftPaws = true;
            }
          },
        });
        const scoutDef = ENTITY_DEFS[EntityKind.Scout];
        btns.push({
          title: 'Scout',
          cost: `${scoutDef.clamCost}C ${scoutDef.foodCost}F`,
          hotkey: 'R',
          affordable:
            w.resources.clams >= (scoutDef.clamCost ?? 0) &&
            w.resources.food + (scoutDef.foodCost ?? 1) <= w.resources.maxFood,
          description: 'Fast recon, wide vision',
          onClick: () => {
            train(
              w,
              lodgeEid,
              EntityKind.Scout,
              scoutDef.clamCost ?? 0,
              scoutDef.twigCost ?? 0,
              scoutDef.foodCost ?? 1,
            );
          },
        });
        btns.push({
          title: 'Tech Tree',
          cost: '',
          hotkey: 'T',
          affordable: true,
          description: 'View full tech tree',
          onClick: () => {
            store.techTreeOpen.value = true;
          },
        });

        // Show Lodge training queue in global view
        const lodgeSlots = trainingQueueSlots.get(lodgeEid) ?? [];
        for (let qi = 0; qi < lodgeSlots.length; qi++) {
          const unitKind = lodgeSlots[qi] as EntityKind;
          const progress =
            qi === 0
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    ((TRAIN_TIMER - TrainingQueue.timer[lodgeEid]) / TRAIN_TIMER) * 100,
                  ),
                )
              : 0;
          const idx = qi;
          qItems.push({
            label: entityKindName(unitKind).charAt(0),
            progressPct: progress,
            onCancel: () => {
              cancelTrain(w, lodgeEid, idx);
            },
          });
        }
      }
    } else if (w.selection.length === 1) {
      const selEid = w.selection[0];
      const selKind = EntityTypeTag.kind[selEid] as EntityKind;
      const selFaction = FactionTag.faction[selEid] as Faction;

      if (selFaction === Faction.Player) {
        // Gatherer selected: build buttons
        if (selKind === EntityKind.Gatherer) {
          const lodgeDef = ENTITY_DEFS[EntityKind.Lodge];
          btns.push({
            title: 'Lodge',
            cost: `${lodgeDef.clamCost}C ${lodgeDef.twigCost}T`,
            hotkey: 'Q',
            affordable:
              w.resources.clams >= (lodgeDef.clamCost ?? 0) &&
              w.resources.twigs >= (lodgeDef.twigCost ?? 0),
            description: 'Expansion (+4 food cap, drop-off)',
            onClick: () => {
              w.placingBuilding = 'lodge';
            },
          });
          const burrowDef = ENTITY_DEFS[EntityKind.Burrow];
          btns.push({
            title: 'Burrow',
            cost: `${burrowDef.twigCost}T`,
            hotkey: 'W',
            affordable: w.resources.twigs >= (burrowDef.twigCost ?? 0),
            description: 'Housing (+4 food cap)',
            onClick: () => {
              w.placingBuilding = 'burrow';
            },
          });
          const armoryDef = ENTITY_DEFS[EntityKind.Armory];
          btns.push({
            title: 'Armory',
            cost: `${armoryDef.clamCost}C ${armoryDef.twigCost}T`,
            hotkey: 'E',
            affordable:
              w.resources.clams >= (armoryDef.clamCost ?? 0) &&
              w.resources.twigs >= (armoryDef.twigCost ?? 0),
            description: 'Train combat units',
            onClick: () => {
              w.placingBuilding = 'armory';
            },
          });
          const towerDef = ENTITY_DEFS[EntityKind.Tower];
          btns.push({
            title: 'Tower',
            cost: `${towerDef.clamCost}C ${towerDef.twigCost}T`,
            hotkey: 'R',
            affordable:
              w.resources.clams >= (towerDef.clamCost ?? 0) &&
              w.resources.twigs >= (towerDef.twigCost ?? 0),
            description: 'Defensive tower',
            onClick: () => {
              w.placingBuilding = 'tower';
            },
          });
          if (w.tech.eagleEye) {
            const wtDef = ENTITY_DEFS[EntityKind.Watchtower];
            btns.push({
              title: 'Watchtower',
              cost: `${wtDef.clamCost}C ${wtDef.twigCost}T`,
              hotkey: 'T',
              affordable:
                w.resources.clams >= (wtDef.clamCost ?? 0) &&
                w.resources.twigs >= (wtDef.twigCost ?? 0),
              description: 'Long-range tower',
              onClick: () => {
                w.placingBuilding = 'watchtower';
              },
            });
          }
          const wallDef = ENTITY_DEFS[EntityKind.Wall];
          btns.push({
            title: 'Wall',
            cost: `${wallDef.twigCost}T`,
            hotkey: 'Y',
            affordable: w.resources.twigs >= (wallDef.twigCost ?? 0),
            description: 'Defensive barrier',
            onClick: () => {
              w.placingBuilding = 'wall';
            },
          });
          if (w.tech.cartography) {
            const spDef = ENTITY_DEFS[EntityKind.ScoutPost];
            btns.push({
              title: 'Scout Post',
              cost: `${spDef.clamCost}C ${spDef.twigCost}T`,
              hotkey: 'U',
              affordable:
                w.resources.clams >= (spDef.clamCost ?? 0) &&
                w.resources.twigs >= (spDef.twigCost ?? 0),
              description: 'Reveals large area',
              onClick: () => {
                w.placingBuilding = 'scout_post';
              },
            });
          }
        }

        // Lodge selected: train gatherer + techs
        if (selKind === EntityKind.Lodge) {
          const gDef = ENTITY_DEFS[EntityKind.Gatherer];
          btns.push({
            title: 'Gatherer',
            cost: `${gDef.clamCost}C ${gDef.foodCost}F`,
            hotkey: 'Q',
            affordable:
              w.resources.clams >= (gDef.clamCost ?? 0) &&
              w.resources.food + (gDef.foodCost ?? 1) <= w.resources.maxFood,
            description: 'Worker unit',
            onClick: () => {
              train(
                w,
                selEid,
                EntityKind.Gatherer,
                gDef.clamCost ?? 0,
                gDef.twigCost ?? 0,
                gDef.foodCost ?? 1,
              );
            },
          });
          const smTech = TECH_UPGRADES.sturdyMud;
          btns.push({
            title: smTech.name,
            cost: `${smTech.clamCost}C ${smTech.twigCost}T`,
            hotkey: 'W',
            affordable:
              canResearch('sturdyMud', w.tech) &&
              w.resources.clams >= smTech.clamCost &&
              w.resources.twigs >= smTech.twigCost,
            description: smTech.description,
            onClick: () => {
              if (
                canResearch('sturdyMud', w.tech) &&
                w.resources.clams >= smTech.clamCost &&
                w.resources.twigs >= smTech.twigCost
              ) {
                w.resources.clams -= smTech.clamCost;
                w.resources.twigs -= smTech.twigCost;
                w.tech.sturdyMud = true;
              }
            },
          });
          const spTech = TECH_UPGRADES.swiftPaws;
          btns.push({
            title: spTech.name,
            cost: `${spTech.clamCost}C ${spTech.twigCost}T`,
            hotkey: 'E',
            affordable:
              canResearch('swiftPaws', w.tech) &&
              w.resources.clams >= spTech.clamCost &&
              w.resources.twigs >= spTech.twigCost,
            description: spTech.description,
            onClick: () => {
              if (
                canResearch('swiftPaws', w.tech) &&
                w.resources.clams >= spTech.clamCost &&
                w.resources.twigs >= spTech.twigCost
              ) {
                w.resources.clams -= spTech.clamCost;
                w.resources.twigs -= spTech.twigCost;
                w.tech.swiftPaws = true;
              }
            },
          });
          const scoutDef = ENTITY_DEFS[EntityKind.Scout];
          btns.push({
            title: 'Scout',
            cost: `${scoutDef.clamCost}C ${scoutDef.foodCost}F`,
            hotkey: 'R',
            affordable:
              w.resources.clams >= (scoutDef.clamCost ?? 0) &&
              w.resources.food + (scoutDef.foodCost ?? 1) <= w.resources.maxFood,
            description: 'Fast recon, wide vision',
            onClick: () => {
              train(
                w,
                selEid,
                EntityKind.Scout,
                scoutDef.clamCost ?? 0,
                scoutDef.twigCost ?? 0,
                scoutDef.foodCost ?? 1,
              );
            },
          });
          const cartoTech = TECH_UPGRADES.cartography;
          btns.push({
            title: cartoTech.name,
            cost: `${cartoTech.clamCost}C ${cartoTech.twigCost}T`,
            hotkey: 'Y',
            affordable:
              canResearch('cartography', w.tech) &&
              w.resources.clams >= cartoTech.clamCost &&
              w.resources.twigs >= cartoTech.twigCost,
            description: cartoTech.description,
            onClick: () => {
              if (
                canResearch('cartography', w.tech) &&
                w.resources.clams >= cartoTech.clamCost &&
                w.resources.twigs >= cartoTech.twigCost
              ) {
                w.resources.clams -= cartoTech.clamCost;
                w.resources.twigs -= cartoTech.twigCost;
                w.tech.cartography = true;
              }
            },
          });
          const thTech = TECH_UPGRADES.tidalHarvest;
          btns.push({
            title: thTech.name,
            cost: `${thTech.clamCost}C ${thTech.twigCost}T`,
            hotkey: 'U',
            affordable:
              canResearch('tidalHarvest', w.tech) &&
              w.resources.clams >= thTech.clamCost &&
              w.resources.twigs >= thTech.twigCost,
            description: thTech.description,
            onClick: () => {
              if (
                canResearch('tidalHarvest', w.tech) &&
                w.resources.clams >= thTech.clamCost &&
                w.resources.twigs >= thTech.twigCost
              ) {
                w.resources.clams -= thTech.clamCost;
                w.resources.twigs -= thTech.twigCost;
                w.tech.tidalHarvest = true;
              }
            },
          });
          btns.push({
            title: 'Tech Tree',
            cost: '',
            hotkey: 'T',
            affordable: true,
            description: 'View full tech tree',
            onClick: () => {
              store.techTreeOpen.value = true;
            },
          });
        }

        // Armory selected: train brawler/sniper/healer + techs
        if (selKind === EntityKind.Armory) {
          const bDef = ENTITY_DEFS[EntityKind.Brawler];
          btns.push({
            title: 'Brawler',
            cost: `${bDef.clamCost}C ${bDef.twigCost}T ${bDef.foodCost}F`,
            hotkey: 'Q',
            affordable:
              w.resources.clams >= (bDef.clamCost ?? 0) &&
              w.resources.twigs >= (bDef.twigCost ?? 0) &&
              w.resources.food + (bDef.foodCost ?? 1) <= w.resources.maxFood,
            description: 'Melee fighter',
            onClick: () => {
              train(
                w,
                selEid,
                EntityKind.Brawler,
                bDef.clamCost ?? 0,
                bDef.twigCost ?? 0,
                bDef.foodCost ?? 1,
              );
            },
          });
          const sDef = ENTITY_DEFS[EntityKind.Sniper];
          btns.push({
            title: 'Sniper',
            cost: `${sDef.clamCost}C ${sDef.twigCost}T ${sDef.foodCost}F`,
            hotkey: 'W',
            affordable:
              w.resources.clams >= (sDef.clamCost ?? 0) &&
              w.resources.twigs >= (sDef.twigCost ?? 0) &&
              w.resources.food + (sDef.foodCost ?? 1) <= w.resources.maxFood,
            description: 'Ranged attacker',
            onClick: () => {
              train(
                w,
                selEid,
                EntityKind.Sniper,
                sDef.clamCost ?? 0,
                sDef.twigCost ?? 0,
                sDef.foodCost ?? 1,
              );
            },
          });
          const hDef = ENTITY_DEFS[EntityKind.Healer];
          btns.push({
            title: 'Healer',
            cost: `${hDef.clamCost}C ${hDef.twigCost}T ${hDef.foodCost}F`,
            hotkey: 'E',
            affordable:
              w.resources.clams >= (hDef.clamCost ?? 0) &&
              w.resources.twigs >= (hDef.twigCost ?? 0) &&
              w.resources.food + (hDef.foodCost ?? 1) <= w.resources.maxFood,
            description: 'Heals nearby friendlies',
            onClick: () => {
              train(
                w,
                selEid,
                EntityKind.Healer,
                hDef.clamCost ?? 0,
                hDef.twigCost ?? 0,
                hDef.foodCost ?? 1,
              );
            },
          });
          const ssTech = TECH_UPGRADES.sharpSticks;
          btns.push({
            title: ssTech.name,
            cost: `${ssTech.clamCost}C ${ssTech.twigCost}T`,
            hotkey: 'R',
            affordable:
              canResearch('sharpSticks', w.tech) &&
              w.resources.clams >= ssTech.clamCost &&
              w.resources.twigs >= ssTech.twigCost,
            description: ssTech.description,
            onClick: () => {
              if (
                canResearch('sharpSticks', w.tech) &&
                w.resources.clams >= ssTech.clamCost &&
                w.resources.twigs >= ssTech.twigCost
              ) {
                w.resources.clams -= ssTech.clamCost;
                w.resources.twigs -= ssTech.twigCost;
                w.tech.sharpSticks = true;
              }
            },
          });
          const eeTech = TECH_UPGRADES.eagleEye;
          btns.push({
            title: eeTech.name,
            cost: `${eeTech.clamCost}C ${eeTech.twigCost}T`,
            hotkey: 'T',
            affordable:
              canResearch('eagleEye', w.tech) &&
              w.resources.clams >= eeTech.clamCost &&
              w.resources.twigs >= eeTech.twigCost,
            description: eeTech.description,
            onClick: () => {
              if (
                canResearch('eagleEye', w.tech) &&
                w.resources.clams >= eeTech.clamCost &&
                w.resources.twigs >= eeTech.twigCost
              ) {
                w.resources.clams -= eeTech.clamCost;
                w.resources.twigs -= eeTech.twigCost;
                w.tech.eagleEye = true;
              }
            },
          });
          const hsTech = TECH_UPGRADES.hardenedShells;
          btns.push({
            title: hsTech.name,
            cost: `${hsTech.clamCost}C ${hsTech.twigCost}T`,
            hotkey: 'Y',
            affordable:
              canResearch('hardenedShells', w.tech) &&
              w.resources.clams >= hsTech.clamCost &&
              w.resources.twigs >= hsTech.twigCost,
            description: hsTech.description,
            onClick: () => {
              if (
                canResearch('hardenedShells', w.tech) &&
                w.resources.clams >= hsTech.clamCost &&
                w.resources.twigs >= hsTech.twigCost
              ) {
                w.resources.clams -= hsTech.clamCost;
                w.resources.twigs -= hsTech.twigCost;
                w.tech.hardenedShells = true;
              }
            },
          });
          if (w.tech.ironShell) {
            const sbDef = ENTITY_DEFS[EntityKind.Shieldbearer];
            btns.push({
              title: 'Shieldbearer',
              cost: `${sbDef.clamCost}C ${sbDef.twigCost}T ${sbDef.foodCost}F`,
              hotkey: 'U',
              affordable:
                w.resources.clams >= (sbDef.clamCost ?? 0) &&
                w.resources.twigs >= (sbDef.twigCost ?? 0) &&
                w.resources.food + (sbDef.foodCost ?? 1) <= w.resources.maxFood,
              description: 'Tank unit with shield',
              onClick: () => {
                train(
                  w,
                  selEid,
                  EntityKind.Shieldbearer,
                  sbDef.clamCost ?? 0,
                  sbDef.twigCost ?? 0,
                  sbDef.foodCost ?? 1,
                );
              },
            });
          }
          if (w.tech.siegeWorks) {
            const catDef = ENTITY_DEFS[EntityKind.Catapult];
            btns.push({
              title: 'Catapult',
              cost: `${catDef.clamCost}C ${catDef.twigCost}T ${catDef.foodCost}F`,
              hotkey: 'I',
              affordable:
                w.resources.clams >= (catDef.clamCost ?? 0) &&
                w.resources.twigs >= (catDef.twigCost ?? 0) &&
                w.resources.food + (catDef.foodCost ?? 1) <= w.resources.maxFood,
              description: 'Siege AoE, long range',
              onClick: () => {
                train(
                  w,
                  selEid,
                  EntityKind.Catapult,
                  catDef.clamCost ?? 0,
                  catDef.twigCost ?? 0,
                  catDef.foodCost ?? 1,
                );
              },
            });
          }
          const isTech = TECH_UPGRADES.ironShell;
          btns.push({
            title: isTech.name,
            cost: `${isTech.clamCost}C ${isTech.twigCost}T`,
            hotkey: 'Z',
            affordable:
              canResearch('ironShell', w.tech) &&
              w.resources.clams >= isTech.clamCost &&
              w.resources.twigs >= isTech.twigCost,
            description: isTech.description,
            onClick: () => {
              if (
                canResearch('ironShell', w.tech) &&
                w.resources.clams >= isTech.clamCost &&
                w.resources.twigs >= isTech.twigCost
              ) {
                w.resources.clams -= isTech.clamCost;
                w.resources.twigs -= isTech.twigCost;
                w.tech.ironShell = true;
              }
            },
          });
          const swTech = TECH_UPGRADES.siegeWorks;
          btns.push({
            title: swTech.name,
            cost: `${swTech.clamCost}C ${swTech.twigCost}T`,
            hotkey: 'X',
            affordable:
              canResearch('siegeWorks', w.tech) &&
              w.resources.clams >= swTech.clamCost &&
              w.resources.twigs >= swTech.twigCost,
            description: swTech.description,
            onClick: () => {
              if (
                canResearch('siegeWorks', w.tech) &&
                w.resources.clams >= swTech.clamCost &&
                w.resources.twigs >= swTech.twigCost
              ) {
                w.resources.clams -= swTech.clamCost;
                w.resources.twigs -= swTech.twigCost;
                w.tech.siegeWorks = true;
              }
            },
          });
          const brTech = TECH_UPGRADES.battleRoar;
          btns.push({
            title: brTech.name,
            cost: `${brTech.clamCost}C ${brTech.twigCost}T`,
            hotkey: 'C',
            affordable:
              canResearch('battleRoar', w.tech) &&
              w.resources.clams >= brTech.clamCost &&
              w.resources.twigs >= brTech.twigCost,
            description: brTech.description,
            onClick: () => {
              if (
                canResearch('battleRoar', w.tech) &&
                w.resources.clams >= brTech.clamCost &&
                w.resources.twigs >= brTech.twigCost
              ) {
                w.resources.clams -= brTech.clamCost;
                w.resources.twigs -= brTech.twigCost;
                w.tech.battleRoar = true;
              }
            },
          });

          // Training queue display for armory
          const slots = trainingQueueSlots.get(selEid) ?? [];
          for (let qi = 0; qi < slots.length; qi++) {
            const unitKind = slots[qi] as EntityKind;
            const progress =
              qi === 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      ((TRAIN_TIMER - TrainingQueue.timer[selEid]) / TRAIN_TIMER) * 100,
                    ),
                  )
                : 0;
            const idx = qi;
            qItems.push({
              label: entityKindName(unitKind).charAt(0),
              progressPct: progress,
              onCancel: () => {
                cancelTrain(w, selEid, idx);
              },
            });
          }
        }

        // Lodge/Burrow training queue display
        if (selKind === EntityKind.Lodge || selKind === EntityKind.Burrow) {
          const slots = trainingQueueSlots.get(selEid) ?? [];
          for (let qi = 0; qi < slots.length; qi++) {
            const unitKind = slots[qi] as EntityKind;
            const progress =
              qi === 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      ((TRAIN_TIMER - TrainingQueue.timer[selEid]) / TRAIN_TIMER) * 100,
                    ),
                  )
                : 0;
            const idx = qi;
            qItems.push({
              label: entityKindName(unitKind).charAt(0),
              progressPct: progress,
              onCancel: () => {
                cancelTrain(w, selEid, idx);
              },
            });
          }
        }
      }
    }

    actionButtons.value = btns;
    queueItems.value = qItems;
  }

  /** Get sprite canvas by SpriteId */
  getSprite(id: SpriteId): HTMLCanvasElement | undefined {
    return this.spriteCanvases.get(id);
  }

  destroy(): void {
    this.running = false;
    window.removeEventListener('resize', this.boundResize);
    this.keyboard.destroy();
    this.pointer.destroy();
    this.physicsManager.destroy();
    destroyPixiApp();
  }
}

/** Singleton game instance */
export const game = new Game();
