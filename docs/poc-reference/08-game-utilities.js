/**
 * POC Reference: Game Utility Functions (pond_craft.html lines 473-549)
 *
 * Ported to: src/input/selection.ts, src/rendering/background.ts, src/game.ts
 *
 * cycleSpeed, selectIdleWorker, selectArmy, addPing, triggerShake,
 * buildMap (procedural terrain), buildFogTexture (seamless noise pattern).
 */

    // NEW: Cycle game speed
    cycleSpeed() {
        let idx = this.speedLevels.indexOf(this.gameSpeed);
        this.gameSpeed = this.speedLevels[(idx + 1) % this.speedLevels.length];
        document.getElementById('speed-btn').textContent = this.gameSpeed + 'x';
        AudioSys.sfx.click();
    },

    // NEW: Select idle worker with cycling
    selectIdleWorker() {
        AudioSys.sfx.selectUnit();
        let idles = this.entities.filter(ent => ent.faction === 'player' && ent.type === 'gatherer' && ent.state === 'idle');
        if(idles.length > 0) {
            this.idleWorkerIdx = (this.idleWorkerIdx) % idles.length;
            this.selection.forEach(ent => ent.selected = false);
            this.selection = [idles[this.idleWorkerIdx]]; idles[this.idleWorkerIdx].selected = true;
            this.isTracking = true; this.updateUI();
            this.idleWorkerIdx++;
        }
    },

    // NEW: Select all army
    selectArmy() {
        AudioSys.sfx.selectUnit();
        let army = this.entities.filter(ent => ent.faction === 'player' && !ent.isBuilding && ent.type !== 'gatherer');
        if(army.length > 0) {
            this.selection.forEach(ent => ent.selected = false);
            this.selection = army; army.forEach(ent => ent.selected = true);
            this.isTracking = true; this.updateUI();
        }
    },

    addPing(x, y) {
        let nearby = this.minimapPings.some(p => Math.abs(p.x - x) < 300 && Math.abs(p.y - y) < 300);
        if (!nearby) {
            this.minimapPings.push({x, y, life: 180, maxLife: 180});
            AudioSys.sfx.ping();
        }
    },
    
    // NEW: Screen shake effect
    triggerShake() {
        this.shakeTimer = 10;
        this.container.classList.add('screen-shake');
        setTimeout(() => this.container.classList.remove('screen-shake'), 200);
    },

    buildMap() {
        this.bgCanvas = document.createElement('canvas'); this.bgCanvas.width = WORLD_WIDTH; this.bgCanvas.height = WORLD_HEIGHT;
        let ctx = this.bgCanvas.getContext('2d', { alpha: false });
        ctx.fillStyle = PALETTE.waterDeep; ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        for(let i=0; i<50000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? PALETTE.waterMid : '#0a1d22'; ctx.fillRect(Math.random()*WORLD_WIDTH, Math.random()*WORLD_HEIGHT, 4, 4);
        }
        for(let p=0; p<100; p++) {
            let px = Math.random()*WORLD_WIDTH, py = Math.random()*WORLD_HEIGHT, r = 50 + Math.random()*200;
            for(let i=0; i<r*15; i++) {
                let ang = Math.random()*Math.PI*2, dist = Math.random()*r;
                ctx.fillStyle = Math.random() > 0.4 ? PALETTE.waterShallow : PALETTE.mudDark;
                ctx.fillRect(px + Math.cos(ang)*dist, py + Math.sin(ang)*dist, 6, 6);
            }
        }
    },

    buildFogTexture() {
        let size = 256; this.fogBgCanvas = document.createElement('canvas'); this.fogBgCanvas.width = size; this.fogBgCanvas.height = size;
        let ctx = this.fogBgCanvas.getContext('2d'); ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,size,size);
        for(let i=0; i<150; i++) {
            let x = Math.random()*size, y = Math.random()*size, r = 15 + Math.random()*30, g = ctx.createRadialGradient(x,y,0, x,y,r);
            g.addColorStop(0, 'rgba(51, 65, 85, 0.5)'); g.addColorStop(1, 'rgba(51, 65, 85, 0)'); ctx.fillStyle = g;
            [[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]].forEach(offset => {
                ctx.beginPath(); ctx.arc(x + offset[0]*size, y + offset[1]*size, r, 0, Math.PI*2); ctx.fill();
            });
        }
        this.fogPattern = this.fogCtx.createPattern(this.fogBgCanvas, 'repeat');
    },

