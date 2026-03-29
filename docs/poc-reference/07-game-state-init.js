/**
 * POC Reference: GAME Object State & Init (pond_craft.html lines 346-471)
 *
 * Ported to: src/ecs/world.ts (GameWorld), src/game.ts (Game class)
 *
 * Global game state: entities, particles, projectiles, camera, selection,
 * resources, tech tree, stats tracking, control groups, fireflies.
 * Init spawns lodge, 3 gatherers, resources, 3 enemy camps.
 */

const GAME = {
    container: document.getElementById('game-container'), canvas: document.getElementById('game-canvas'),
    fogCanvas: document.getElementById('fog-canvas'), lightCanvas: document.getElementById('light-canvas'),
    ctx: null, fogCtx: null, lightCtx: null, minimap: document.getElementById('minimap'), minimapCtx: null,
    sprites: {}, bgCanvas: null, fogBgCanvas: null, fogPattern: null,
    entities: [], particles: [], projectiles: [], floatingTexts: [], fireflies: [],
    minimapPings: [], groundPings: [], corpses: [],
    
    tech: { sharpSticks: false, sturdyMud: false, swiftPaws: false, eagleEye: false },
    resources: { clams: 200, twigs: 50, food: 0, maxFood: 0 },
    
    // NEW: Resource income tracking
    resTracker: { clams: 0, twigs: 0, lastClams: 200, lastTwigs: 50, rateClams: 0, rateTwigs: 0 },
    
    // NEW: Stats tracking
    stats: { unitsKilled: 0, unitsLost: 0, resourcesGathered: 0, buildingsBuilt: 0, peakArmy: 0 },
    
    camX: 0, camY: 0, width: 0, height: 0,
    mouse: { x: 0, y: 0, worldX: 0, worldY: 0, isDown: false, startX: 0, startY: 0, in: false },
    activePointers: new Map(), lastPanCenter: null, keys: {}, selection: [], placingBuilding: null,
    
    lastTime: 0, frameCount: 0, timeOfDay: 8 * 60,
    state: 'playing', peaceTimer: 10800, ambientDarkness: 0,
    isTracking: false,
    
    // NEW: Control groups (1-9)
    ctrlGroups: {},
    
    // NEW: Game speed
    gameSpeed: 1, speedLevels: [1, 2, 3],
    
    // NEW: Attack-move mode
    attackMoveMode: false,
    
    // NEW: Last click time for double-click detection
    lastClickTime: 0, lastClickEntity: null,
    
    // NEW: Screen shake
    shakeTimer: 0,
    
    // NEW: Explored fog (permanent reveal of explored areas)
    exploredCanvas: null, exploredCtx: null,
    
    // NEW: idle worker cycling index
    idleWorkerIdx: 0,
    
    init() {
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.fogCtx = this.fogCanvas.getContext('2d');
        this.lightCtx = this.lightCanvas.getContext('2d');
        this.minimapCtx = this.minimap.getContext('2d', { alpha: false });
        
        const types = ['gatherer', 'brawler', 'gator', 'snake', 'sniper', 'cattail', 'clambed', 'lodge', 'burrow', 'armory', 'tower', 'predator_nest', 'bones', 'rubble'];
        types.forEach(t => this.sprites[t] = SpriteGen.generate(t));
        
        // NEW: Explored fog canvas
        this.exploredCanvas = document.createElement('canvas');
        this.exploredCanvas.width = Math.ceil(WORLD_WIDTH / 16);
        this.exploredCanvas.height = Math.ceil(WORLD_HEIGHT / 16);
        this.exploredCtx = this.exploredCanvas.getContext('2d');
        this.exploredCtx.fillStyle = '#000';
        this.exploredCtx.fillRect(0, 0, this.exploredCanvas.width, this.exploredCanvas.height);
        
        this.buildMap(); this.buildFogTexture(); this.setupInput();
        
        document.getElementById('portrait-canvas').addEventListener('pointerdown', (e) => {
            e.stopPropagation(); if(this.selection.length > 0) this.isTracking = true;
        });

        document.getElementById('idle-worker-btn').addEventListener('pointerdown', (e) => {
            e.stopPropagation(); this.selectIdleWorker();
        });

        document.getElementById('select-army-btn').addEventListener('pointerdown', (e) => {
            e.stopPropagation(); this.selectArmy();
        });
        
        // NEW: Sound & Speed buttons
        document.getElementById('mute-btn').addEventListener('pointerdown', (e) => {
            e.stopPropagation(); AudioSys.toggleMute();
        });
        document.getElementById('speed-btn').addEventListener('pointerdown', (e) => {
            e.stopPropagation(); this.cycleSpeed();
        });
        document.getElementById('restart-btn').addEventListener('pointerdown', (e) => {
            e.stopPropagation(); location.reload();
        });
        
        let sx = WORLD_WIDTH/2, sy = WORLD_HEIGHT/2;
        let lodge = new Entity('lodge', sx, sy, 'player');
        
        new Entity('gatherer', sx - 40, sy + 40, 'player');
        new Entity('gatherer', sx + 40, sy + 40, 'player');
        new Entity('gatherer', sx, sy + 50, 'player');
        
        new Entity('clambed', sx - 120, sy - 40, 'neutral');
        for(let i=0; i<6; i++) new Entity('cattail', sx + 100 + Math.random()*60, sy - 60 + Math.random()*80, 'neutral');
        
        for(let i=0; i<300; i++) new Entity('cattail', Math.random()*WORLD_WIDTH, Math.random()*WORLD_HEIGHT, 'neutral');
        for(let i=0; i<15; i++) new Entity('clambed', Math.random()*WORLD_WIDTH, Math.random()*WORLD_HEIGHT, 'neutral');
        
        const campLocs = [{x: 800, y: 800}, {x: WORLD_WIDTH-800, y: 800}, {x: WORLD_WIDTH/2, y: WORLD_HEIGHT-800}];
        campLocs.forEach(loc => {
            new Entity('predator_nest', loc.x, loc.y, 'enemy');
            for(let j=0; j<2; j++) new Entity('gator', loc.x + (Math.random()-.5)*150, loc.y + (Math.random()-.5)*150, 'enemy');
            for(let j=0; j<2; j++) new Entity('snake', loc.x + (Math.random()-.5)*150, loc.y + (Math.random()-.5)*150, 'enemy');
        });

        this.camX = sx - this.width/2 - 200; 
        this.camY = sy - this.height/2 + 100;
        
        this.selection = [lodge]; lodge.selected = true;
        this.isTracking = true; this.updateUI();

        setTimeout(() => {
            let overlay = document.getElementById('intro-overlay');
            overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 2000);
        }, 1500);

        this.fireflies = Array.from({length: 150}, () => ({
            x: Math.random() * WORLD_WIDTH, y: Math.random() * WORLD_HEIGHT,
            vx: (Math.random() - 0.5), vy: (Math.random() - 0.5) * 0.5 - 0.2, phase: Math.random() * Math.PI * 2
        }));

        requestAnimationFrame((t) => this.loop(t));
    },
