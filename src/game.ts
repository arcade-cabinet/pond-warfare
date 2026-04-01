/** Game Orchestrator – thin shell that delegates to focused sub-modules. */

import { audio } from '@/audio/audio-system';
import { EntityTypeTag } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { useAirdrop, usePondBlessing, useRallyCry, useTidalSurge } from '@/game/abilities';
import { type PanAnimHandle, resizeCanvases, smoothPanTo } from '@/game/camera';
import {
  applyCampaignMission,
  applyDifficultyModifiers,
  applyMapSeed,
  centerCameraOnLodge,
  createGameWorld,
  ensureLifecycleListeners,
  initCanvases,
  resetSession,
  setupAudio,
  setupColorBlind,
  setupDockResize,
  setupInput,
  spawnFireflies,
  spawnInitialEntities,
  startGameLoop,
  wireWebGLHandlers,
} from '@/game/game-init';
import {
  type DestroyRefs,
  destroyGame,
  handleEvacuationChoice as handleEvacChoice,
} from '@/game/game-lifecycle';
import type { GameLoopState } from '@/game/game-loop';
import { cycleSpeed as cycleSpeedFn } from '@/game/game-loop';
import { syncUIStore as syncUIStoreFn } from '@/game/game-ui-sync';
import type { KeyboardHandler } from '@/input/keyboard';
import type { PointerHandler } from '@/input/pointer';
import { PhysicsManager } from '@/physics/physics-world';
import { clampCamera } from '@/rendering/camera';
import type { FogRendererState } from '@/rendering/fog-renderer';
import { ReplayRecorder } from '@/replay';
import type { EntityKind, SpriteId } from '@/types';
import * as store from '@/ui/store';

export class Game {
  world: GameWorld;
  spriteCanvases: Map<SpriteId, HTMLCanvasElement> = new Map();
  recorder = new ReplayRecorder();
  physicsManager!: PhysicsManager;

  private container!: HTMLElement;
  private gameCanvas!: HTMLCanvasElement;
  private fogCanvas!: HTMLCanvasElement;
  private lightCanvas!: HTMLCanvasElement;
  private minimapCanvas!: HTMLCanvasElement;
  private minimapCamElement!: HTMLElement;
  private fogCtx!: CanvasRenderingContext2D;
  private lightCtx!: CanvasRenderingContext2D;
  private exploredCanvas!: HTMLCanvasElement;
  private exploredCtx!: CanvasRenderingContext2D;
  private fogState!: FogRendererState;
  private bgCanvas!: HTMLCanvasElement;
  private keyboard!: KeyboardHandler;
  private pointer!: PointerHandler;
  private panHandle: PanAnimHandle = { anim: null };
  private loopState: GameLoopState | null = null;
  private initializing = false; private running = false; private audioInitialized = false;
  private colorBlindUnsubscribe: (() => void) | null = null; private dockPanelUnsubscribe: (() => void) | null = null;
  private boundResize!: () => void;
  private boundContextLost: ((e: Event) => void) | null = null;
  private boundContextRestored: (() => void) | null = null;
  private boundVisibilityChange: (() => void) | null = null;
  private initAudioHandler: ((e: Event) => void) | null = null;

  constructor() {
    this.world = createGameWorld();
  }

  async init(
    container: HTMLElement,
    gameCanvas: HTMLCanvasElement,
    fogCanvas: HTMLCanvasElement,
    lightCanvas: HTMLCanvasElement,
    minimapCanvas: HTMLCanvasElement,
    minimapCamElement: HTMLElement,
  ): Promise<void> {
    if (this.initializing) return;
    this.initializing = true;
    if (this.running) this.destroy();

    this.world = createGameWorld();
    resetSession(this.world);

    this.container = container;
    this.gameCanvas = gameCanvas;
    this.fogCanvas = fogCanvas;
    this.lightCanvas = lightCanvas;
    this.minimapCanvas = minimapCanvas;
    this.minimapCamElement = minimapCamElement;

    // Canvas and rendering pipeline
    const minimapCtx = minimapCanvas.getContext('2d', { alpha: false });
    const refs = await initCanvases(this.world, container, gameCanvas, fogCanvas, lightCanvas);
    this.fogCtx = refs.fogCtx;
    this.lightCtx = refs.lightCtx;
    this.bgCanvas = refs.bgCanvas;
    this.fogState = refs.fogState;
    this.exploredCanvas = refs.exploredCanvas;
    this.exploredCtx = refs.exploredCtx;
    this.spriteCanvases = refs.spriteCanvases;

    // Resize and listeners
    this.resize();
    this.boundResize = () => this.resize();
    window.addEventListener('resize', this.boundResize);
    this.dockPanelUnsubscribe = setupDockResize(() => this.resize());

    // Input
    const input = setupInput(
      this.world,
      container,
      gameCanvas,
      minimapCanvas,
      this.recorder,
      () => this.syncUIStore(),
      () => this.cycleSpeed(),
      () => this.playUnitSelectSound(),
    );
    this.keyboard = input.keyboard;
    this.pointer = input.pointer;
    this.pointer.onZoomChange = (zoom) => this.setZoom(zoom);

    // Physics, difficulty, world setup
    this.physicsManager = new PhysicsManager();
    applyDifficultyModifiers(this.world);
    applyMapSeed(this.world);
    applyCampaignMission(this.world);
    spawnInitialEntities(this.world);

    if (this.world.fogOfWarMode === 'revealed') {
      this.exploredCtx.fillStyle = '#ffffff';
      this.exploredCtx.fillRect(0, 0, this.exploredCanvas.width, this.exploredCanvas.height);
    }

    centerCameraOnLodge(this.world);
    spawnFireflies(this.world);
    this.syncUIStore();
    this.colorBlindUnsubscribe = setupColorBlind();

    // Visibility pause handler
    this.boundVisibilityChange = () => {
      if (document.hidden && store.menuState.value === 'playing' && !this.world.paused) {
        this.world.paused = true;
        store.paused.value = true;
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    const audioRefs = {
      audioInitialized: this.audioInitialized,
      audioInitPromise: null as Promise<void> | null,
      initAudioHandler: this.initAudioHandler,
      loopState: null as GameLoopState | null,
    };
    setupAudio(audioRefs);
    this.audioInitialized = audioRefs.audioInitialized;
    this.initAudioHandler = audioRefs.initAudioHandler;

    this.recorder.start();
    this.running = true;
    this.initializing = false;

    // Start game loop
    this.loopState = startGameLoop({
      world: this.world,
      spriteCanvases: this.spriteCanvases,
      pointer: this.pointer,
      keyboard: this.keyboard,
      fogState: this.fogState,
      fogCtx: this.fogCtx,
      fogCanvas: this.fogCanvas,
      lightCtx: this.lightCtx,
      lightCanvas: this.lightCanvas,
      minimapCtx: minimapCtx!,
      minimapCamElement: this.minimapCamElement,
      exploredCanvas: this.exploredCanvas,
      bgCanvas: this.bgCanvas,
      physicsManager: this.physicsManager,
      container: this.container,
      recorder: this.recorder,
      audioInitialized: this.audioInitialized,
      syncUIStore: () => this.syncUIStore(),
    });

    // WebGL context recovery wired to loop state
    const webgl = wireWebGLHandlers(gameCanvas, this.world, this.loopState);
    this.boundContextLost = webgl.contextLost;
    this.boundContextRestored = webgl.contextRestored;

    ensureLifecycleListeners(this.world);
  }

  resize(): void {
    resizeCanvases(
      this.world,
      this.container,
      this.fogCanvas,
      this.lightCanvas,
      this.fogCtx,
      this.lightCtx,
    );
  }

  setZoom(level: number): void {
    this.world.zoomLevel = Math.max(0.5, Math.min(2.0, level));
    this.resize();
    clampCamera(this.world);
  }

  cycleSpeed(): void {
    if (this.loopState) cycleSpeedFn(this.loopState);
  }

  smoothPanTo(x: number, y: number): void {
    smoothPanTo(this.world, x, y, this.panHandle);
  }

  syncUIStore(): void {
    syncUIStoreFn({
      world: this.world,
      audioInitialized: this.loopState?.audioInitialized ?? this.audioInitialized,
      wasPeaceful: this.loopState?.wasPeaceful ?? true,
      wasGameOver: this.loopState?.wasGameOver ?? false,
      recorder: this.recorder,
      exploredCtx: this.exploredCtx ?? null,
    });
  }

  useRallyCry(): boolean {
    return useRallyCry(this.world);
  }
  usePondBlessing(): boolean {
    return usePondBlessing(this.world);
  }
  useTidalSurge(): boolean {
    return useTidalSurge(this.world);
  }
  useAirdrop(): boolean {
    return useAirdrop(this.world);
  }

  handleEvacuationChoice(choice: 'checkpoint' | 'restart' | 'quit'): void {
    handleEvacChoice(this.world, choice, () =>
      this.init(
        this.container,
        this.gameCanvas,
        this.fogCanvas,
        this.lightCanvas,
        this.minimapCanvas,
        this.minimapCamElement,
      ),
    );
  }

  private playUnitSelectSound(): void {
    if (this.world.selection.length === 0) {
      audio.selectUnit();
      return;
    }
    const kind = EntityTypeTag.kind[this.world.selection[0]] as EntityKind;
    audio.playSelectionVoice(kind, this.world.playerFaction);
  }

  getSprite(id: SpriteId): HTMLCanvasElement | undefined {
    return this.spriteCanvases.get(id);
  }

  destroy(): void {
    this.running = false;
    const refs: DestroyRefs = {
      loopState: this.loopState,
      panHandle: this.panHandle,
      colorBlindUnsubscribe: this.colorBlindUnsubscribe,
      dockPanelUnsubscribe: this.dockPanelUnsubscribe,
      boundResize: this.boundResize,
      boundContextLost: this.boundContextLost,
      boundContextRestored: this.boundContextRestored,
      boundVisibilityChange: this.boundVisibilityChange,
      initAudioHandler: this.initAudioHandler,
      gameCanvas: this.gameCanvas,
      keyboard: this.keyboard,
      pointer: this.pointer,
      physicsManager: this.physicsManager,
    };
    destroyGame(refs);
    this.colorBlindUnsubscribe = this.dockPanelUnsubscribe = this.boundContextLost = null;
    this.boundContextRestored = this.boundVisibilityChange = this.initAudioHandler = null;
    this.loopState = null;
    this.initializing = false;
  }
}
/** Singleton game instance */
export const game = new Game();
