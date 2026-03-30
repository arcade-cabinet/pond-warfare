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
// Campaign
import { type CampaignState, campaignSystem, createCampaignState } from '@/campaign';
import { getMission } from '@/campaign/missions';
import { resetBarkState } from '@/config/barks';
import { getCommanderDef } from '@/config/commanders';
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
import { spawnEntity } from '@/ecs/archetypes';
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
import { healthSystem, takeDamage } from '@/ecs/systems/health';
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
import { isNative } from '@/platform';
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
import { loadGame as loadGameFromSave, saveGame } from '@/save-system';
import { saveGameToDb } from '@/storage';
import {
  checkAchievements,
  loadAchievements,
  resetAchievementMatchState,
} from '@/systems/achievements';
import {
  loadUnlocks,
  resetMatchUpdateGuard,
  updateProfileAndCheckUnlocks,
} from '@/systems/unlock-tracker';
import { EntityKind, Faction, type SpriteId, UnitState } from '@/types';
// UI store
import * as store from '@/ui/store';

/** Module-level flag: ensure lifecycle listeners are only added once. */
let lifecycleListenersInstalled = false;

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

  // FPS tracking
  private fpsFrameTimes: number[] = [];
  private fpsLastUpdate = 0;

  // Audio/music state tracking
  private audioInitialized = false;
  private audioInitPromise: Promise<void> | null = null;
  private initAudioHandler: ((e: Event) => void) | null = null;
  private wasPeaceful = true;
  private colorBlindUnsubscribe: (() => void) | null = null;
  private wasGameOver = false;

  // Checkpoint event tracking
  private lastKnownNestsDestroyed = 0;
  private lastKnownTechCount = 0;

  // Smooth camera pan animation (anime.js)
  private _panAnim: { pause: () => void } | null = null;

  // Bound resize handler for cleanup
  private boundResize!: () => void;

  // WebGL context loss recovery
  private webglContextLost = false;
  private boundContextLost: ((e: Event) => void) | null = null;
  private boundContextRestored: (() => void) | null = null;
  private boundVisibilityChange: (() => void) | null = null;

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
    resetMatchUpdateGuard();
    // Load earned achievements and unlocks from DB (async, fire-and-forget)
    loadAchievements().catch(() => {
      /* best-effort */
    });
    loadUnlocks().catch(() => {
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.world.viewWidth = w;
    this.world.viewHeight = h;
    this.fogCanvas.width = w * dpr;
    this.fogCanvas.height = h * dpr;
    this.fogCanvas.style.width = `${w}px`;
    this.fogCanvas.style.height = `${h}px`;
    this.lightCanvas.width = w * dpr;
    this.lightCanvas.height = h * dpr;
    this.lightCanvas.style.width = `${w}px`;
    this.lightCanvas.style.height = `${h}px`;
    this.fogCtx.scale(dpr, dpr);
    this.fogCtx.imageSmoothingEnabled = false;
    this.lightCtx.scale(dpr, dpr);

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
        if (name === 'selectUnit') this.playUnitSelectSound();
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
        if (name === 'selectUnit') this.playUnitSelectSound();
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

    // Apply campaign mission overrides if launching a campaign mission
    this.applyCampaignMission();

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

    // --- WebGL context loss recovery ---
    // PixiJS 8 internally calls preventDefault() and re-uploads textures on
    // restore, but we still need to pause game logic while the context is gone
    // and resume when the browser restores it.
    this.webglContextLost = false;
    this.boundContextLost = (e: Event) => {
      e.preventDefault(); // required — tells browser we want to restore
      this.webglContextLost = true;
      this.world.paused = true;
      store.paused.value = true;
      console.warn('[PondWarfare] WebGL context lost — pausing game');
    };
    this.boundContextRestored = () => {
      this.webglContextLost = false;
      this.world.paused = false;
      store.paused.value = false;
      console.info('[PondWarfare] WebGL context restored — resuming');
    };
    gameCanvas.addEventListener('webglcontextlost', this.boundContextLost);
    gameCanvas.addEventListener('webglcontextrestored', this.boundContextRestored);

    // Pause game when tab/app is backgrounded (mobile browsers kill GL contexts)
    this.boundVisibilityChange = () => {
      if (document.hidden && store.menuState.value === 'playing' && !this.world.paused) {
        this.world.paused = true;
        store.paused.value = true;
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityChange);

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

    // --- Pause / resume lifecycle listeners (added once) ---
    if (!lifecycleListenersInstalled) {
      lifecycleListenersInstalled = true;

      // Pause on browser visibility change (tab switch, screen off on mobile web)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && store.menuState.value === 'playing') {
          this.world.paused = true;
          store.paused.value = true;
        }
      });

      // Capacitor native: pause when app goes to background
      window.addEventListener('native-pause', () => {
        if (store.menuState.value === 'playing') {
          this.world.paused = true;
          store.paused.value = true;
        }
      });

      // Capacitor native: back button toggles pause during gameplay, exits on menu
      window.addEventListener('native-back', () => {
        if (store.menuState.value === 'playing') {
          this.world.paused = !this.world.paused;
          store.paused.value = this.world.paused;
        } else {
          // On menu screens, let the back button exit the app
          if (isNative) {
            import('@capacitor/app').then(({ App: A }) => A.exitApp());
          }
        }
      });
    }
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

    // ---- Commander modifiers ----
    const cmdId = store.selectedCommander.value;
    const cmdDef = getCommanderDef(cmdId);
    this.world.commanderId = cmdId;
    this.world.commanderModifiers = {
      auraDamageBonus: cmdDef.auraDamageBonus,
      auraSpeedBonus: cmdDef.auraSpeedBonus,
      auraHpBonus: cmdDef.auraHpBonus,
      passiveGatherBonus: cmdDef.passiveGatherBonus,
      passiveResearchSpeed: cmdDef.passiveResearchSpeed,
      passiveTowerAttackSpeed: cmdDef.passiveTowerAttackSpeed,
    };

    // ---- Airdrops safety net ----
    const airdropCounts: Record<string, number> = {
      easy: 3,
      normal: 2,
      hard: 1,
      nightmare: 0,
      ultraNightmare: 0,
    };
    this.world.airdropsRemaining = airdropCounts[diff] ?? 2;
    this.world.airdropCooldownUntil = 0;
    store.airdropsRemaining.value = this.world.airdropsRemaining;
    store.airdropCooldown.value = 0;

    // ---- Player faction & AI personality ----
    this.world.playerFaction = store.playerFaction.value;
    this.world.aiPersonality = store.aiPersonality.value;

    // ---- Checkpoint/evacuation reset ----
    this.world.checkpoints = [];
    this.world.lastCheckpointFrame = 0;
    this.world.evacuationTriggered = false;
    store.evacuationActive.value = false;
    store.checkpointCount.value = 0;
  }

  /**
   * Apply campaign mission overrides to the world if a campaign mission
   * is being launched. Must be called after applyDifficultyModifiers
   * and before spawnInitialEntities.
   */
  private applyCampaignMission(): void {
    const missionId = store.campaignMissionId.value;
    if (!missionId) {
      // Freeplay mode — no campaign state
      (this.world as GameWorld & { campaign?: CampaignState }).campaign = undefined;
      store.campaignObjectiveStatuses.value = {};
      return;
    }

    const mission = getMission(missionId);
    if (!mission) {
      store.campaignMissionId.value = '';
      return;
    }

    // Apply settings overrides from the mission definition
    const cfg = mission.settingsOverrides;
    if (cfg.scenario) this.world.scenarioOverride = cfg.scenario;
    if (cfg.enemyNests != null) this.world.nestCountOverride = cfg.enemyNests;
    if (cfg.enemyAggression) this.world.enemyAggressionLevel = cfg.enemyAggression;
    if (cfg.peaceMinutes != null) this.world.peaceTimer = cfg.peaceMinutes * 3600;
    if (cfg.fogOfWar) this.world.fogOfWarMode = cfg.fogOfWar;
    if (cfg.resourceDensity) {
      const densityMap: Record<string, number> = {
        sparse: 0.5,
        normal: 1.0,
        rich: 1.5,
        abundant: 2.0,
      };
      this.world.resourceDensityMod = densityMap[cfg.resourceDensity] ?? 1.0;
    }
    if (cfg.evolutionSpeed) {
      const evoMap: Record<string, number> = {
        slow: 1.5,
        normal: 1.0,
        fast: 0.5,
        instant: 0.1,
      };
      this.world.evolutionSpeedMod = evoMap[cfg.evolutionSpeed] ?? 1.0;
    }
    if (cfg.startingResourcesMult != null) {
      this.world.resources.clams = Math.round(
        this.world.resources.clams * cfg.startingResourcesMult,
      );
      this.world.resources.twigs = Math.round(
        this.world.resources.twigs * cfg.startingResourcesMult,
      );
      this.world.resTracker.lastClams = this.world.resources.clams;
      this.world.resTracker.lastTwigs = this.world.resources.twigs;
    }

    // Apply world-level overrides
    const wo = mission.worldOverrides;
    if (wo) {
      if (wo.evolutionSpeedMod != null) this.world.evolutionSpeedMod = wo.evolutionSpeedMod;
      if (wo.heroMode != null) this.world.heroMode = wo.heroMode;
      if (wo.fogOfWar) this.world.fogOfWarMode = wo.fogOfWar;
      if (wo.startingResourcesMult != null) {
        this.world.resources.clams = Math.round(
          this.world.resources.clams * wo.startingResourcesMult,
        );
        this.world.resources.twigs = Math.round(
          this.world.resources.twigs * wo.startingResourcesMult,
        );
        this.world.resTracker.lastClams = this.world.resources.clams;
        this.world.resTracker.lastTwigs = this.world.resources.twigs;
      }
      if (wo.fullTechTree) {
        // Unlock all tech
        for (const key of Object.keys(this.world.tech)) {
          (this.world.tech as Record<string, boolean>)[key] = true;
        }
      }
      if (wo.maxEnemyEvolution) {
        this.world.enemyEvolution.tier = 5;
      }
    }

    // Attach campaign state to the world
    const campaign = createCampaignState(mission);
    (this.world as GameWorld & { campaign?: CampaignState }).campaign = campaign;

    // Initialize objective statuses in the store
    const statuses: Record<string, boolean> = {};
    for (const obj of mission.objectives) {
      statuses[obj.id] = false;
    }
    store.campaignObjectiveStatuses.value = statuses;

    // Disable the normal tutorial for campaign missions (campaign has its own dialogues)
    this.world.isFirstGame = false;
  }

  resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const zoom = this.world.zoomLevel;
    this.world.viewWidth = w / zoom;
    this.world.viewHeight = h / zoom;
    // PixiJS manages the game canvas size (autoDensity handles DPR internally)
    resizePixiApp(w, h);
    this.fogCanvas.width = w * dpr;
    this.fogCanvas.height = h * dpr;
    this.fogCanvas.style.width = `${w}px`;
    this.fogCanvas.style.height = `${h}px`;
    this.lightCanvas.width = w * dpr;
    this.lightCanvas.height = h * dpr;
    this.lightCanvas.style.width = `${w}px`;
    this.lightCanvas.style.height = `${h}px`;
    // Setting canvas width/height resets the context transform, so re-apply DPR scale
    this.fogCtx.scale(dpr, dpr);
    this.fogCtx.imageSmoothingEnabled = false;
    this.lightCtx.scale(dpr, dpr);
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

    // FPS tracking: rolling average over 60 frames
    if (store.fpsCounterVisible.value) {
      this.fpsFrameTimes.push(dt);
      if (this.fpsFrameTimes.length > 60) this.fpsFrameTimes.shift();
      if (timestamp - this.fpsLastUpdate > 500) {
        const avg = this.fpsFrameTimes.reduce((a, b) => a + b, 0) / this.fpsFrameTimes.length;
        store.fpsDisplay.value = avg > 0 ? Math.round(1000 / avg) : 0;
        this.fpsLastUpdate = timestamp;
      }
    }

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

    // Performance: AI throttling when entity count is high
    const entityCount = spatialEnts.length;
    const throttleAI = entityCount > 300 && this.world.frameCount % 2 !== 0;

    // Run all ECS systems in order
    dayNightSystem(this.world);
    movementSystem(this.world);
    collisionSystem(this.world, this.physicsManager);
    gatheringSystem(this.world);
    buildingSystem(this.world);
    combatSystem(this.world);
    projectileSystem(this.world);
    trainingSystem(this.world);
    if (!throttleAI) aiSystem(this.world);
    evolutionSystem(this.world);
    if (!throttleAI) autoBuildSystem(this.world);
    autoTrainSystem(this.world);
    autoBehaviorSystem(this.world);
    healthSystem(this.world);
    tutorialSystem(this.world);
    campaignSystem(this.world);
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

    // Checkpoint system: auto-checkpoint every 5 minutes (18000 frames)
    if (
      this.world.frameCount > 0 &&
      this.world.frameCount % 18000 === 0 &&
      this.world.state === 'playing'
    ) {
      this.createCheckpoint();
    }

    // Checkpoint on nest destruction
    if (this.world.state === 'playing') {
      const currentNestsDestroyed = store.destroyedEnemyNests.value;
      if (currentNestsDestroyed > this.lastKnownNestsDestroyed) {
        this.lastKnownNestsDestroyed = currentNestsDestroyed;
        this.createCheckpoint();
      }

      // Checkpoint on tech research
      const techCount = Object.values(this.world.tech).filter(Boolean).length;
      if (techCount > this.lastKnownTechCount) {
        this.lastKnownTechCount = techCount;
        this.createCheckpoint();
      }
    }

    // Airdrop cooldown sync to store
    if (
      this.world.airdropCooldownUntil > 0 &&
      this.world.frameCount >= this.world.airdropCooldownUntil
    ) {
      this.world.airdropCooldownUntil = 0;
      store.airdropCooldown.value = 0;
    } else if (this.world.airdropCooldownUntil > this.world.frameCount) {
      store.airdropCooldown.value = Math.ceil(
        (this.world.airdropCooldownUntil - this.world.frameCount) / 60,
      );
    }

    // Evacuation check: every 60 frames, check if commander should evacuate
    if (this.world.frameCount % 60 === 0 && this.world.state === 'playing') {
      this.checkEvacuation();
    }

    // Check achievements every 30 seconds (1800 frames)
    if (this.world.frameCount % 1800 === 0) {
      checkAchievements(this.world).catch(() => {
        /* best-effort */
      });
    }
  }

  // ---- Checkpoint system ----

  /** Create a rolling checkpoint (max 5). */
  createCheckpoint(): void {
    const json = saveGame(this.world);
    this.world.checkpoints.push(json);
    if (this.world.checkpoints.length > 5) {
      this.world.checkpoints.shift();
    }
    this.world.lastCheckpointFrame = this.world.frameCount;
    store.checkpointCount.value = this.world.checkpoints.length;
    this.world.floatingTexts.push({
      x: this.world.camX + (this.world.viewWidth || 400) / 2,
      y: this.world.camY + 60,
      text: 'Checkpoint \u2713',
      color: '#4ade80',
      life: 60,
    });
  }

  /** Load the most recent checkpoint into the world. Returns false if none exist. */
  loadCheckpoint(): boolean {
    if (this.world.checkpoints.length === 0) return false;
    const latest = this.world.checkpoints[this.world.checkpoints.length - 1];
    const success = loadGameFromSave(this.world, latest);
    if (success) {
      this.world.evacuationTriggered = false;
      store.evacuationActive.value = false;
    }
    return success;
  }

  // ---- Airdrop system ----

  /** Use an airdrop: spawn resources and units at the Lodge position. */
  useAirdrop(): boolean {
    if (this.world.airdropsRemaining <= 0) return false;
    if (this.world.frameCount < this.world.airdropCooldownUntil) return false;

    // Find the player Lodge position
    const buildings = query(this.world.ecs, [
      Position,
      Health,
      IsBuilding,
      FactionTag,
      EntityTypeTag,
    ]);
    let lodgeX = 0;
    let lodgeY = 0;
    let foundLodge = false;
    for (let i = 0; i < buildings.length; i++) {
      const eid = buildings[i];
      if (
        EntityTypeTag.kind[eid] === EntityKind.Lodge &&
        FactionTag.faction[eid] === Faction.Player &&
        Health.current[eid] > 0
      ) {
        lodgeX = Position.x[eid];
        lodgeY = Position.y[eid];
        foundLodge = true;
        break;
      }
    }
    if (!foundLodge) return false;

    // Grant resources
    this.world.resources.clams += 200;
    this.world.resources.twigs += 100;

    // Spawn units near Lodge
    const offsets = [
      { x: -40, y: 60 },
      { x: 40, y: 60 },
      { x: 0, y: 80 },
    ];
    // 2 Brawlers
    spawnEntity(
      this.world,
      EntityKind.Brawler,
      lodgeX + offsets[0].x,
      lodgeY + offsets[0].y,
      Faction.Player,
    );
    spawnEntity(
      this.world,
      EntityKind.Brawler,
      lodgeX + offsets[1].x,
      lodgeY + offsets[1].y,
      Faction.Player,
    );
    // 1 Healer
    spawnEntity(
      this.world,
      EntityKind.Healer,
      lodgeX + offsets[2].x,
      lodgeY + offsets[2].y,
      Faction.Player,
    );

    // Decrement and set cooldown
    this.world.airdropsRemaining--;
    this.world.airdropCooldownUntil = this.world.frameCount + 600; // 10 seconds
    store.airdropsRemaining.value = this.world.airdropsRemaining;
    store.airdropCooldown.value = 10;

    // Visual feedback
    this.world.floatingTexts.push({
      x: lodgeX,
      y: lodgeY - 40,
      text: 'SUPPLIES INCOMING!',
      color: '#facc15',
      life: 120,
    });

    // Particle burst around the lodge
    for (let p = 0; p < 20; p++) {
      this.world.particles.push({
        x: lodgeX + (Math.random() - 0.5) * 60,
        y: lodgeY + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3 - 1,
        life: 40,
        color: '#facc15',
        size: 4,
      });
    }

    return true;
  }

  // ---- Unit-specific select sound ----

  /** Play a unit-type-specific selection sound based on the first selected entity. */
  private playUnitSelectSound(): void {
    if (this.world.selection.length === 0) {
      audio.selectUnit();
      return;
    }
    const eid = this.world.selection[0];
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    switch (kind) {
      case EntityKind.Brawler:
        audio.selectBrawler();
        break;
      case EntityKind.Sniper:
        audio.selectSniper();
        break;
      case EntityKind.Healer:
        audio.selectHealer();
        break;
      case EntityKind.Catapult:
        audio.selectCatapult();
        break;
      case EntityKind.Scout:
        audio.selectScout();
        break;
      case EntityKind.Commander:
        audio.selectCommander();
        break;
      case EntityKind.Gatherer:
        audio.selectGatherer();
        break;
      case EntityKind.Shieldbearer:
        audio.selectShieldbearer();
        break;
      default:
        audio.selectUnit();
        break;
    }
  }

  // ---- Active abilities (tech tree) ----

  /** Activate Rally Cry: +30% speed to all units for 10 seconds (600 frames). Cooldown 60s (3600 frames). */
  useRallyCry(): boolean {
    if (!this.world.tech.rallyCry) return false;
    if (this.world.frameCount < this.world.rallyCryCooldownUntil) return false;
    if (this.world.rallyCryExpiry > 0 && this.world.frameCount < this.world.rallyCryExpiry)
      return false;

    this.world.rallyCryExpiry = this.world.frameCount + 600; // 10 seconds
    this.world.rallyCryCooldownUntil = this.world.frameCount + 3600; // 60 seconds

    audio.upgrade();
    this.world.floatingTexts.push({
      x: this.world.camX + this.world.viewWidth / 2,
      y: this.world.camY + 60,
      text: 'RALLY CRY! +30% Speed',
      color: '#facc15',
      life: 120,
    });
    return true;
  }

  /** Activate Pond Blessing: heal all player units to full HP (one-time). */
  usePondBlessing(): boolean {
    if (!this.world.tech.pondBlessing || this.world.pondBlessingUsed) return false;

    const allUnits = query(this.world.ecs, [Position, Health, FactionTag]);
    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;
      Health.current[eid] = Health.max[eid];
      // Healing particle
      this.world.particles.push({
        x: Position.x[eid],
        y: Position.y[eid] - 10,
        vx: 0,
        vy: -1,
        life: 20,
        color: '#4ade80',
        size: 3,
      });
    }

    this.world.pondBlessingUsed = true;
    audio.heal();
    this.world.floatingTexts.push({
      x: this.world.camX + this.world.viewWidth / 2,
      y: this.world.camY + 60,
      text: 'POND BLESSING! All units healed!',
      color: '#4ade80',
      life: 120,
    });
    return true;
  }

  /** Activate Tidal Surge: deal 50 damage to all enemies on the map (one-time). */
  useTidalSurge(): boolean {
    if (!this.world.tech.tidalSurge || this.world.tidalSurgeUsed) return false;

    const allEnts = query(this.world.ecs, [Position, Health, FactionTag]);
    for (let i = 0; i < allEnts.length; i++) {
      const eid = allEnts[i];
      if (FactionTag.faction[eid] !== Faction.Enemy) continue;
      if (Health.current[eid] <= 0) continue;
      takeDamage(this.world, eid, 50, -1);
      // Blue surge particle
      this.world.particles.push({
        x: Position.x[eid],
        y: Position.y[eid],
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2,
        life: 25,
        color: '#38bdf8',
        size: 4,
      });
    }

    this.world.tidalSurgeUsed = true;
    this.world.shakeTimer = Math.max(this.world.shakeTimer, 10);
    audio.alert();
    this.world.floatingTexts.push({
      x: this.world.camX + this.world.viewWidth / 2,
      y: this.world.camY + 60,
      text: 'TIDAL SURGE! 50 damage to all enemies!',
      color: '#38bdf8',
      life: 120,
    });
    return true;
  }

  // ---- Evacuation system ----

  /** Check if the player qualifies for emergency evacuation. */
  private checkEvacuation(): void {
    if (this.world.evacuationTriggered) return;

    const allEnts = query(this.world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

    let lodgeHp = 0;
    let playerCombatUnits = 0;
    let playerGatherers = 0;
    let commanderAlive = false;

    for (let i = 0; i < allEnts.length; i++) {
      const eid = allEnts[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;

      const kind = EntityTypeTag.kind[eid] as EntityKind;
      if (kind === EntityKind.Lodge) {
        lodgeHp = Health.current[eid];
      } else if (kind === EntityKind.Commander) {
        commanderAlive = true;
      } else if (kind === EntityKind.Gatherer) {
        playerGatherers++;
      } else if (!ENTITY_DEFS[kind]?.isBuilding) {
        playerCombatUnits++;
      }
    }

    if (
      lodgeHp > 0 &&
      lodgeHp < 150 &&
      playerCombatUnits === 0 &&
      playerGatherers === 0 &&
      commanderAlive
    ) {
      this.world.evacuationTriggered = true;
      this.world.paused = true;
      store.paused.value = true;
      store.evacuationActive.value = true;
    }
  }

  /** Handle evacuation choice from the UI. */
  handleEvacuationChoice(choice: 'checkpoint' | 'restart' | 'quit'): void {
    this.world.evacuationTriggered = false;
    store.evacuationActive.value = false;
    this.world.paused = false;
    store.paused.value = false;

    if (choice === 'checkpoint') {
      this.loadCheckpoint();
    } else if (choice === 'restart') {
      // Re-init with same settings — must call init() to rebuild the world
      this.init(
        this.container,
        this.gameCanvas,
        this.fogCanvas,
        this.lightCanvas,
        this.minimapCanvas,
        this.minimapCamElement,
      ).catch(() => {
        /* fallback: reload page */
        window.location.reload();
      });
    } else {
      // Quit to menu
      store.menuState.value = 'main';
      store.gameState.value = 'playing'; // reset the game state signal
    }
  }

  /** Render one frame */
  private draw(): void {
    // Skip rendering entirely while the WebGL context is lost — no point
    // building render data when the GPU cannot draw anything.
    if (this.webglContextLost) return;

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

    // Game over: stop music (once), check achievements, and update player profile/unlocks
    if ((w.state === 'win' || w.state === 'lose') && this.audioInitialized && !this.wasGameOver) {
      audio.stopMusic();
      this.wasGameOver = true;
      checkAchievements(w).catch(() => {
        /* best-effort */
      });
      updateProfileAndCheckUnlocks(w).catch(() => {
        /* best-effort */
      });
    }

    // Selection info
    syncSelectionInfo(w, idleWorkers, armyUnits, maxFoodCap);

    // Action panel buttons and queue
    buildActionPanel(w, this.recorder);

    // Active ability signals sync
    store.rallyCryAvailable.value = w.tech.rallyCry;
    store.rallyCryActive.value = w.rallyCryExpiry > 0 && w.frameCount < w.rallyCryExpiry;
    store.rallyCryCooldown.value =
      w.rallyCryCooldownUntil > w.frameCount
        ? Math.ceil((w.rallyCryCooldownUntil - w.frameCount) / 60)
        : 0;
    store.pondBlessingAvailable.value = w.tech.pondBlessing && !w.pondBlessingUsed;
    store.tidalSurgeAvailable.value = w.tech.tidalSurge && !w.tidalSurgeUsed;

    // Campaign objective status sync
    const campaign = (w as GameWorld & { campaign?: CampaignState }).campaign;
    if (campaign?.mission) {
      const statuses: Record<string, boolean> = {};
      for (const [id, done] of campaign.objectiveStatus) {
        statuses[id] = done;
      }
      store.campaignObjectiveStatuses.value = statuses;
    }
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
    // Remove WebGL context loss and visibility handlers
    if (this.boundContextLost) {
      this.gameCanvas?.removeEventListener('webglcontextlost', this.boundContextLost);
      this.boundContextLost = null;
    }
    if (this.boundContextRestored) {
      this.gameCanvas?.removeEventListener('webglcontextrestored', this.boundContextRestored);
      this.boundContextRestored = null;
    }
    if (this.boundVisibilityChange) {
      document.removeEventListener('visibilitychange', this.boundVisibilityChange);
      this.boundVisibilityChange = null;
    }
    this.webglContextLost = false;
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
