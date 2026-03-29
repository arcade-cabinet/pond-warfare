/**
 * Game Orchestrator
 *
 * Manages the complete game lifecycle: canvas setup, world creation,
 * sprite generation, entity spawning, system execution, and rendering pipeline.
 */

import { animate } from 'animejs';
import { query } from 'bitecs';
// Audio
import { audio } from '@/audio/audio-system';
import { resetBarkState } from '@/config/barks';
import { ENTITY_DEFS, entityKindFromString } from '@/config/entity-defs';
import {
  ENEMY_STARTING_CLAMS,
  ENEMY_STARTING_TWIGS,
  SPEED_LEVELS,
  STARTING_CLAMS,
  STARTING_TWIGS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '@/constants';
import {
  Collider,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsProjectile,
  Position,
  ProjectileData,
  Selectable,
  UnitStateMachine,
} from '@/ecs/components';
import { aiSystem } from '@/ecs/systems/ai';
import { autoBehaviorSystem } from '@/ecs/systems/auto-behavior';
import { autoBuildSystem } from '@/ecs/systems/auto-build';
import { autoTrainSystem } from '@/ecs/systems/auto-train';
import { buildingSystem } from '@/ecs/systems/building';
import { cleanupSystem } from '@/ecs/systems/cleanup';
import { collisionSystem } from '@/ecs/systems/collision';
import { combatSystem } from '@/ecs/systems/combat';
import { dayNightSystem } from '@/ecs/systems/day-night';
import { evolutionSystem } from '@/ecs/systems/evolution';
import { fogOfWarSystem, initFogOfWar } from '@/ecs/systems/fog-of-war';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { healthSystem } from '@/ecs/systems/health';
// Systems
import { movementSystem } from '@/ecs/systems/movement';
import { projectileSystem } from '@/ecs/systems/projectile';
import { trainingSystem } from '@/ecs/systems/training';
import { tutorialSystem } from '@/ecs/systems/tutorial';
import { veterancySystem } from '@/ecs/systems/veterancy';
import { createGameWorld, type GameWorld } from '@/ecs/world';
// Extracted sub-modules
import { buildActionPanel } from '@/game/action-panel-builder';
import { spawnInitialEntities } from '@/game/init-entities';
import { syncPopulationAndTimers } from '@/game/population-sync';
import { syncSelectionInfo } from '@/game/selection-sync';
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
import { ReplayRecorder } from '@/replay';
import { saveGame } from '@/save-system';
import { saveGameToDb } from '@/storage';
import {
  checkAchievements,
  loadAchievements,
  resetAchievementMatchState,
} from '@/systems/achievements';
import { type EntityKind, Faction, type SpriteId, UnitState } from '@/types';
// UI store
import * as store from '@/ui/store';

export class Game {
  world: GameWorld;
  spriteCanvases: Map<SpriteId, HTMLCanvasElement> = new Map();
  recorder = new ReplayRecorder();

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
  private initializing = false;
  private rafId: number | null = null;

  // Audio/music state tracking
  private audioInitialized = false;
  private audioInitPromise: Promise<void> | null = null;
  private initAudioHandler: ((e: Event) => void) | null = null;
  private wasPeaceful = true;
  private colorBlindUnsubscribe: (() => void) | null = null;
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
    // Prevent overlapping async init calls
    if (this.initializing) return;
    this.initializing = true;

    // Tear down any previous session to prevent duplicate loops/listeners
    if (this.running) {
      this.destroy();
    }

    // Reset the world so re-initialisation (e.g. restarting the game) starts
    // from a clean slate instead of accumulating stale ECS state.
    this.world = createGameWorld();
    // Reset bark and achievement tracking state for the new session
    resetBarkState();
    resetAchievementMatchState();
    // Load earned achievements from DB (async, fire-and-forget)
    loadAchievements().catch(() => {
      /* best-effort */
    });
    // Reset match-scoped audio/game flags for clean session
    this.wasPeaceful = true;
    this.wasGameOver = false;

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
        this.recorder.record(this.world.frameCount, 'stop', {
          selection: [...this.world.selection],
        });
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
        const wx = this.pointer.mouse.worldX;
        const wy = this.pointer.mouse.worldY;
        issueContextCommand(this.world, target, wx, wy);

        // Record for replay: determine command type from target
        const cmdType =
          target != null && FactionTag.faction[target] === Faction.Enemy
            ? ('attack' as const)
            : ('move' as const);
        this.recorder.record(this.world.frameCount, cmdType, {
          target,
          worldX: wx,
          worldY: wy,
          selection: [...this.world.selection],
        });
      },
      onUpdateUI: () => this.syncUIStore(),
      onPlaceBuilding: () => {
        const buildType = this.world.placingBuilding;
        const wx = this.pointer.mouse.worldX;
        const wy = this.pointer.mouse.worldY;
        placeBuilding(this.world, wx, wy);
        this.recorder.record(this.world.frameCount, 'build', {
          buildingType: buildType,
          worldX: wx,
          worldY: wy,
        });
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
      getEntityPosition: (eid) => ({ x: Position.x[eid], y: Position.y[eid] }),
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
    this.pointer.onZoomChange = (zoom) => this.setZoom(zoom);

    // Initialize physics
    this.physicsManager = new PhysicsManager();

    // Apply difficulty settings from UI selection
    this.applyDifficultyModifiers();

    // Apply custom map seed if provided
    const seedStr = store.customMapSeed.value;
    if (seedStr && seedStr.length > 0) {
      const parsed = Number(seedStr);
      if (Number.isFinite(parsed) && parsed > 0) {
        this.world.mapSeed = Math.floor(parsed);
      } else {
        // Hash string seed to a number
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
          hash = (hash * 31 + seedStr.charCodeAt(i)) & 0x7fffffff;
        }
        this.world.mapSeed = hash || 1;
      }
    }

    // Spawn initial entities
    spawnInitialEntities(this.world);

    // If fog of war is 'revealed', fill the entire explored canvas white
    if (this.world.fogOfWarMode === 'revealed') {
      this.exploredCtx.fillStyle = '#ffffff';
      this.exploredCtx.fillRect(0, 0, this.exploredCanvas.width, this.exploredCanvas.height);
    }

    // Camera to center on lodge (position varies per seed)
    const lodge = this.world.selection[0];
    if (lodge != null) {
      const lx = Position.x[lodge];
      const ly = Position.y[lodge];
      this.world.camX = lx - this.world.viewWidth / 2;
      this.world.camY = ly - this.world.viewHeight / 2;
      Selectable.selected[lodge] = 1;
      this.world.isTracking = true;
    } else {
      // Fallback: center of map
      this.world.camX = WORLD_WIDTH / 2 - this.world.viewWidth / 2;
      this.world.camY = WORLD_HEIGHT / 2 - this.world.viewHeight / 2;
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
    this.colorBlindUnsubscribe = store.colorBlindMode.subscribe((enabled) => {
      setColorBlindMode(enabled);
    });

    // Initialize audio on first user interaction (AudioContext policy)
    if (this.audioInitialized) {
      // Already initialized from a previous session - just restart music
      audio.startAmbient();
      audio.startMusic(true);
    } else {
      this.initAudioHandler = async () => {
        if (this.audioInitialized || this.audioInitPromise) return;
        const handler = this.initAudioHandler;
        this.audioInitPromise = audio.init();
        try {
          await this.audioInitPromise;
          if (this.initAudioHandler !== handler) return; // stale after destroy/re-init
          audio.startAmbient();
          audio.startMusic(true);
          this.audioInitialized = true;
        } catch (_err) {
          return;
        } finally {
          this.audioInitPromise = null;
        }
        if (this.initAudioHandler) {
          document.removeEventListener('pointerdown', this.initAudioHandler);
          document.removeEventListener('keydown', this.initAudioHandler);
          this.initAudioHandler = null;
        }
      };
      document.addEventListener('pointerdown', this.initAudioHandler);
      document.addEventListener('keydown', this.initAudioHandler);
    }

    // Start replay recording
    this.recorder.start();

    // Start game loop
    this.lastTime = performance.now();
    this.running = true;
    this.initializing = false;
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  /** Apply difficulty modifiers to world state before entities are spawned */
  private applyDifficultyModifiers(): void {
    const diff = store.selectedDifficulty.value;
    const cfg = store.customGameSettings.value;
    this.world.difficulty = diff;

    // Permadeath (from custom settings or ultra nightmare)
    const permadeath = cfg.permadeath || diff === 'ultraNightmare';
    this.world.permadeath = permadeath;
    this.world.rewardsModifier = permadeath ? 1.5 : 1.0;

    // ---- Peace timer: peaceMinutes * 3600 frames ----
    this.world.peaceTimer = cfg.peaceMinutes * 3600;

    // ---- Starting resources: multiply by startingResourcesMult ----
    const baseClams = STARTING_CLAMS;
    const baseTwigs = STARTING_TWIGS;
    this.world.resources.clams = Math.round(baseClams * cfg.startingResourcesMult);
    this.world.resources.twigs = Math.round(baseTwigs * cfg.startingResourcesMult);
    this.world.resTracker.lastClams = this.world.resources.clams;
    this.world.resTracker.lastTwigs = this.world.resources.twigs;

    // ---- Enemy resources: scale by enemyEconomy ----
    const enemyEcoMult: Record<string, number> = {
      weak: 0.5,
      normal: 1.0,
      strong: 2.0,
      overwhelming: 3.0,
    };
    const ecoMod = enemyEcoMult[cfg.enemyEconomy] ?? 1.0;
    this.world.enemyResources.clams = Math.round(ENEMY_STARTING_CLAMS * ecoMod);
    this.world.enemyResources.twigs = Math.round(ENEMY_STARTING_TWIGS * ecoMod);
    this.world.enemyEconomyMod = ecoMod;

    // ---- Nest count ----
    this.world.nestCountOverride = cfg.enemyNests;

    // ---- Scenario ----
    this.world.scenarioOverride = cfg.scenario;

    // ---- Gather speed modifier ----
    const gatherSpeedMap: Record<string, number> = {
      slow: 1.5,
      normal: 1.0,
      fast: 0.6,
    };
    this.world.gatherSpeedMod = gatherSpeedMap[cfg.gatherSpeed] ?? 1.0;

    // ---- Evolution speed modifier ----
    const evoSpeedMap: Record<string, number> = {
      slow: 1.5,
      normal: 1.0,
      fast: 0.5,
      instant: 0.1,
    };
    this.world.evolutionSpeedMod = evoSpeedMap[cfg.evolutionSpeed] ?? 1.0;

    // ---- Fog of war mode ----
    this.world.fogOfWarMode = cfg.fogOfWar;

    // ---- Hero mode ----
    this.world.heroMode = cfg.heroMode;

    // ---- Starting units count ----
    this.world.startingUnitCount = cfg.startingUnits;

    // ---- Resource density modifier ----
    const densityMap: Record<string, number> = {
      sparse: 0.5,
      normal: 1.0,
      rich: 1.5,
      abundant: 2.0,
    };
    this.world.resourceDensityMod = densityMap[cfg.resourceDensity] ?? 1.0;

    // ---- Enemy aggression ----
    this.world.enemyAggressionLevel = cfg.enemyAggression;
  }

  resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const zoom = this.world.zoomLevel;
    this.world.viewWidth = w / zoom;
    this.world.viewHeight = h / zoom;
    // PixiJS manages the game canvas size
    resizePixiApp(w, h);
    this.fogCanvas.width = w;
    this.fogCanvas.height = h;
    this.lightCanvas.width = w;
    this.lightCanvas.height = h;
    this.fogCtx.imageSmoothingEnabled = false;
  }

  /** Apply a new zoom level, clamped between 0.5 and 2.0. */
  setZoom(level: number): void {
    this.world.zoomLevel = Math.max(0.5, Math.min(2.0, level));
    this.resize();
    clampCamera(this.world);
  }

  /** Cycle game speed (1x -> 2x -> 3x -> 1x) */
  cycleSpeed(): void {
    const idx = SPEED_LEVELS.indexOf(this.world.gameSpeed as 1 | 2 | 3);
    this.world.gameSpeed = SPEED_LEVELS[(idx + 1) % SPEED_LEVELS.length];
    store.gameSpeed.value = this.world.gameSpeed;
    audio.click();
    this.recorder.record(this.world.frameCount, 'speed', {
      gameSpeed: this.world.gameSpeed,
    });
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
        clampCamera(this.world);
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
        for (
          let i = 0;
          i < this.world.gameSpeed && this.world.state === 'playing' && !this.world.paused;
          i++
        ) {
          this.updateLogic();
        }
      }
      this.accumulator -= FIXED_DT;
    }

    this.draw();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
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

    // Periodically refresh obstacle list for Yuka steering (buildings)
    if (this.world.yukaManager.shouldRefreshObstacles()) {
      const buildings = query(this.world.ecs, [Position, Health, IsBuilding, Collider]);
      const obstacleList: Array<{ x: number; y: number; radius: number }> = [];
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        if (Health.current[b] <= 0) continue;
        obstacleList.push({
          x: Position.x[b],
          y: Position.y[b],
          radius: Collider.radius[b],
        });
      }
      this.world.yukaManager.setObstacles(obstacleList);
    }

    // Update Yuka AI steering (1/60s fixed step)
    this.world.yukaManager.update(1 / 60, this.world.ecs);

    // Sync physics bodies: create for new entities, remove for dead ones
    this.syncPhysicsBodies();

    // Rebuild spatial hash for this frame's proximity queries
    this.world.spatialHash.clear();
    const spatialEnts = query(this.world.ecs, [Position, Health]);
    for (let i = 0; i < spatialEnts.length; i++) {
      const eid = spatialEnts[i];
      if (Health.current[eid] > 0) {
        this.world.spatialHash.insert(eid, Position.x[eid], Position.y[eid]);
      }
    }

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
    evolutionSystem(this.world);
    autoBuildSystem(this.world);
    autoTrainSystem(this.world);
    autoBehaviorSystem(this.world);
    healthSystem(this.world);
    tutorialSystem(this.world);
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
    clampCamera(this.world);

    // Sync UI store periodically
    if (this.world.frameCount % 30 === 0) {
      this.syncUIStore();
    }

    // Auto-save every 60 seconds (3600 frames at 60fps) when enabled
    if (
      store.autoSaveEnabled.value &&
      this.world.frameCount > 0 &&
      this.world.frameCount % 3600 === 0 &&
      this.world.state === 'playing'
    ) {
      const json = saveGame(this.world);
      const difficulty = store.selectedDifficulty.value ?? 'normal';
      const seed = store.goMapSeed.value ?? 0;
      saveGameToDb('autosave', difficulty, seed, json, false)
        .then(() => {
          store.hasSaveGame.value = true;
        })
        .catch(() => {
          /* best-effort auto-save */
        });
      this.world.floatingTexts.push({
        x: this.world.camX + (this.world.viewWidth || 400) / 2,
        y: this.world.camY + 60,
        text: 'Auto-saved',
        color: '#4ade80',
        life: 60,
      });
    }

    // Check achievements every 30 seconds (1800 frames)
    if (this.world.frameCount % 1800 === 0) {
      checkAchievements(this.world).catch(() => {
        /* best-effort */
      });
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
      this.bgCanvas,
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

    // Population, timers, game-over stats, resource tracking
    const { idleWorkers, armyUnits, maxFoodCap } = syncPopulationAndTimers(
      w,
      this.exploredCtx ?? null,
    );

    // Muted state (needs audio singleton reference)
    store.muted.value = audio.muted;
    store.hasPlayerUnits.value = hasPlayerUnitsSelected(this.world);

    // --- Music transitions on peace/hunting change ---
    const peaceful = w.frameCount < w.peaceTimer;
    if (this.audioInitialized) {
      if (this.wasPeaceful && !peaceful) {
        // Peace just ended: switch to hunting music
        audio.startMusic(false);
      }
      this.wasPeaceful = peaceful;

      // Update ambient sounds with current darkness
      audio.updateAmbient(w.ambientDarkness);
    }

    // Game over: stop music (once) and check achievements
    if ((w.state === 'win' || w.state === 'lose') && this.audioInitialized && !this.wasGameOver) {
      audio.stopMusic();
      this.wasGameOver = true;
      checkAchievements(w).catch(() => {
        /* best-effort */
      });
    }

    // Selection info
    syncSelectionInfo(w, idleWorkers, armyUnits, maxFoodCap);

    // Action panel buttons and queue
    buildActionPanel(w, this.recorder);
  }

  /** Get sprite canvas by SpriteId */
  getSprite(id: SpriteId): HTMLCanvasElement | undefined {
    return this.spriteCanvases.get(id);
  }

  destroy(): void {
    this.running = false;
    this.audioInitPromise = null;
    // Cancel pending RAF to prevent stale callbacks
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    // Stop camera pan animation
    this._panAnim?.pause();
    this._panAnim = null;
    // Unsubscribe color blind mode listener
    this.colorBlindUnsubscribe?.();
    this.colorBlindUnsubscribe = null;
    window.removeEventListener('resize', this.boundResize);
    if (this.initAudioHandler) {
      document.removeEventListener('pointerdown', this.initAudioHandler);
      document.removeEventListener('keydown', this.initAudioHandler);
      this.initAudioHandler = null;
    }
    this.keyboard?.destroy();
    this.pointer?.destroy();
    this.physicsManager?.destroy();
    destroyPixiApp();
    this.initializing = false;
  }
}

/** Singleton game instance */
export const game = new Game();
