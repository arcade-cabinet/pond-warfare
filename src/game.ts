/** Game Orchestrator -- thin shell that delegates to focused sub-modules. */
import type { GameWorld } from '@/ecs/world';
import { useAirdrop, usePondBlessing, useShadowSprint, useTidalSurge } from '@/game/abilities';
import { type PanAnimHandle, resizeCanvases, smoothPanTo } from '@/game/camera';
import { useCommanderAbility } from '@/game/commander-abilities';
import {
  applyDifficultyModifiers,
  applyMapSeed,
  computeInitialZoom,
  createGameWorld,
  resetSession,
  spawnVerticalWorld,
} from '@/game/game-init';
import {
  type DestroyRefs,
  destroyGame,
  handleEvacuationChoice as handleEvacChoice,
} from '@/game/game-lifecycle';
import { cycleSpeed as cycleSpeedFn, type GameLoopState } from '@/game/game-loop';
import { runGameSetup } from '@/game/game-setup';
import { syncUIStore as syncUIStoreFn } from '@/game/game-ui-sync';
import { playUnitSelectSound } from '@/game/unit-select-sound';
import type { Governor } from '@/governor/governor';
import type { KeyboardHandler } from '@/input/keyboard';
import type { PointerHandler } from '@/input/pointer';
import type { PhysicsManager } from '@/physics/physics-world';
import { clampCamera } from '@/rendering/camera';
import type { FogRendererState } from '@/rendering/fog-renderer';
import { ReplayRecorder } from '@/replay';
import type { SpriteId } from '@/types';

export class Game {
  world: GameWorld;
  spriteCanvases: Map<SpriteId, HTMLCanvasElement> = new Map();
  recorder = new ReplayRecorder();
  physicsManager!: PhysicsManager;
  governor: Governor | null = null;
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
  private initializing = false;
  private running = false;
  private audioInitialized = false;
  private colorBlindUnsubscribe: (() => void) | null = null;
  private dockPanelUnsubscribe: (() => void) | null = null;
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

    applyDifficultyModifiers(this.world);
    applyMapSeed(this.world);
    spawnVerticalWorld(this.world);

    // Initial zoom BEFORE resize (zoomLevel drives viewWidth/viewHeight)
    this.world.zoomLevel = computeInitialZoom(this.world.worldWidth, container.clientWidth);

    // Delegate the remaining setup pipeline to game-setup module
    const out = await runGameSetup({
      world: this.world,
      container,
      gameCanvas,
      fogCanvas,
      lightCanvas,
      minimapCanvas,
      minimapCamElement,
      recorder: this.recorder,
      panHandle: this.panHandle,
      audioInitialized: this.audioInitialized,
      initAudioHandler: this.initAudioHandler,
      syncUIStore: () => this.syncUIStore(),
      cycleSpeed: () => this.cycleSpeed(),
      playUnitSelectSound: () => this.playUnitSelectSound(),
      setZoom: (zoom) => this.setZoom(zoom),
      governor: this.governor,
    });

    this.fogCtx = out.fogCtx;
    this.lightCtx = out.lightCtx;
    this.bgCanvas = out.bgCanvas;
    this.fogState = out.fogState;
    this.exploredCanvas = out.exploredCanvas;
    this.exploredCtx = out.exploredCtx;
    this.spriteCanvases = out.spriteCanvases;
    this.keyboard = out.keyboard;
    this.pointer = out.pointer;
    this.physicsManager = out.physicsManager;
    this.loopState = out.loopState;
    this.colorBlindUnsubscribe = out.colorBlindUnsubscribe;
    this.dockPanelUnsubscribe = out.dockPanelUnsubscribe;
    this.boundResize = out.boundResize;
    this.boundContextLost = out.boundContextLost;
    this.boundContextRestored = out.boundContextRestored;
    this.boundVisibilityChange = out.boundVisibilityChange;
    this.audioInitialized = out.audioInitialized;
    this.initAudioHandler = out.initAudioHandler;

    this.running = true;
    this.initializing = false;
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
    return useShadowSprint(this.world);
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
  useCommanderAbility(): boolean {
    return useCommanderAbility(this.world);
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
    playUnitSelectSound(this.world);
  }
  /** Attach or detach the lockstep synchronizer on the active game loop. */
  setLockstep(ls: import('@/net/lockstep').LockstepSync | null): void {
    if (this.loopState) this.loopState.lockstep = ls;
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
