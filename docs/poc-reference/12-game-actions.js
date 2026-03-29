/**
 * POC Reference: Game Actions (pond_craft.html lines 1066-1133)
 *
 * Ported to: src/input/selection.ts (placeBuilding, train, cancelTrain),
 *            src/game.ts (setGameOver), src/ecs/systems/day-night.ts (getLerpedColor)
 *
 * placeBuilding: snap to grid, cost deduction, assign builders.
 * train: cost check, queue push, timer init.
 * cancelTrain: refund costs, queue splice.
 * setGameOver: victory/defeat banner, stats display.
 * getLerpedColor: TIME_STOPS RGB interpolation for day/night.
 */

    placeBuilding() {
        let type = this.placingBuilding, cg = 0, cw = 0;
        if(type==='burrow') cw=100; if(type==='armory'){cg=250; cw=150;} if(type==='tower'){cg=200; cw=250;}
        
        let bx = Math.round(this.mouse.worldX/TILE_SIZE)*TILE_SIZE, by = Math.round(this.mouse.worldY/TILE_SIZE)*TILE_SIZE;
        
        // FIX: Check placement validity
        if (!this.canPlaceBuilding(bx, by, type)) {
            AudioSys.sfx.error();
            this.floatingTexts.push({x: bx, y: by - 30, t: "Can't build here!", c: '#ef4444', life: 60});
            return;
        }
        
        if (this.resources.clams >= cg && this.resources.twigs >= cw) {
            this.resources.clams -= cg; this.resources.twigs -= cw;
            let b = new Entity(type, bx, by, 'player');
            this.stats.buildingsBuilt++;
            this.selection.forEach(u => { if(u.type === 'gatherer') u.cmdBuild(b); });
            this.placingBuilding = null; this.updateUI();
        }
    },

    train(b, type, cg, cw, cf) {
        if (this.resources.clams >= cg && this.resources.twigs >= cw && this.resources.food < this.resources.maxFood) {
            this.resources.clams -= cg; this.resources.twigs -= cw; this.resources.food += cf; 
            b.q = b.q || []; b.q.push(type); if (!b.qTimer || b.q.length === 1) b.qTimer = 180;
            this.updateUI();
        }
    },

    cancelTrain(b, index) {
        let type = b.q.splice(index, 1)[0];
        let cg = 0, cw = 0, cf = 1;
        if(type === 'gatherer') { cg=50; cw=0; }
        if(type === 'brawler') { cg=100; cw=50; }
        if(type === 'sniper') { cg=80; cw=80; }
        this.resources.clams += cg; this.resources.twigs += cw; this.resources.food -= cf;
        if (index === 0 && b.q.length > 0) b.qTimer = 180; 
        if (b.q.length === 0) b.qTimer = 0;
        this.updateUI();
    },

    setGameOver(result) {
        if (this.state !== 'playing') return;
        this.state = result;
        const banner = document.getElementById('game-over-banner'), title = document.getElementById('go-title'), desc = document.getElementById('go-desc');
        const statsEl = document.getElementById('go-stats');
        banner.classList.remove('hidden');
        
        // NEW: Stats display
        let day = Math.floor(this.frameCount/28800)+1;
        statsEl.textContent = `Day ${day} | Kills: ${this.stats.unitsKilled} | Lost: ${this.stats.unitsLost} | Gathered: ${this.stats.resourcesGathered} | Buildings: ${this.stats.buildingsBuilt}`;
        
        if (result === 'win') {
            AudioSys.sfx.win(); title.textContent = 'Victory'; title.className = 'text-4xl md:text-6xl font-black text-amber-400 mb-4 tracking-widest uppercase shadow-lg'; desc.textContent = 'The Pond is Safe!';
        } else {
            AudioSys.sfx.lose(); title.textContent = 'Defeat'; title.className = 'text-4xl md:text-6xl font-black text-red-600 mb-4 tracking-widest uppercase shadow-lg'; desc.textContent = 'Your Lodge was destroyed.';
        }
    },

    getLerpedColor(timeInHours) {
        let i = 0; while (i < TIME_STOPS.length - 1 && TIME_STOPS[i+1].h <= timeInHours) i++;
        let start = TIME_STOPS[i], end = TIME_STOPS[i+1] || TIME_STOPS[i];
        if (start === end) return `rgb(${start.c[0]}, ${start.c[1]}, ${start.c[2]})`;
        let t = (timeInHours - start.h) / (end.h - start.h);
        let r = Math.round(start.c[0] + (end.c[0] - start.c[0]) * t), g = Math.round(start.c[1] + (end.c[1] - start.c[1]) * t), b = Math.round(start.c[2] + (end.c[2] - start.c[2]) * t);
        this.ambientDarkness = 1.0 - (r / 255); return `rgb(${r}, ${g}, ${b})`;
    },
