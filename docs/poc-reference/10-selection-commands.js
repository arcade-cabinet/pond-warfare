/**
 * POC Reference: Selection & Command Logic (pond_craft.html lines 788-868)
 *
 * Ported to: src/input/selection.ts
 *
 * resize, moveCamMinimap, getEntityAt (y-sort priority),
 * hasPlayerUnitsSelected, issueContextCommand (formation diamond pattern),
 * canPlaceBuilding (overlap + bounds check).
 */


    resize() {
        this.width = this.container.clientWidth; this.height = this.container.clientHeight;
        this.canvas.width = this.width; this.canvas.height = this.height; this.fogCanvas.width = this.width; this.fogCanvas.height = this.height;
        this.lightCanvas.width = this.width; this.lightCanvas.height = this.height;
        this.ctx.imageSmoothingEnabled = false; this.fogCtx.imageSmoothingEnabled = false;
    },

    moveCamMinimap(e, offset) {
        let rect = this.minimap.getBoundingClientRect(), xPercent = (e.clientX - rect.left) / rect.width, yPercent = (e.clientY - rect.top) / rect.height;
        this.camX = Math.max(0, Math.min(WORLD_WIDTH - this.width, xPercent * WORLD_WIDTH - offset.x));
        this.camY = Math.max(0, Math.min(WORLD_HEIGHT - this.height, yPercent * WORLD_HEIGHT - offset.y));
    },

    getEntityAt(x, y) {
        // FIX: Sort by y descending so top-most (closest to camera) units are picked first
        let sorted = [...this.entities].sort((a,b) => {
            // Prioritize non-resource clickable entities
            if (a.isResource !== b.isResource) return a.isResource ? 1 : -1;
            return b.y - a.y;
        });
        for(let e of sorted) if (Math.abs(e.x - x) < Math.max(25, e.radius+15) && Math.abs(e.y - y) < Math.max(25, e.height/2+15)) return e;
        return null;
    },
    
    hasPlayerUnitsSelected() { return this.selection.length > 0 && this.selection.some(e => e.faction === 'player' && !e.isBuilding); },

    issueContextCommand(target) {
        if (this.placingBuilding) { this.placingBuilding = null; return; }
        if (this.selection.length === 1 && this.selection[0].isBuilding && this.selection[0].faction === 'player') { AudioSys.sfx.click(); this.selection[0].rallyPos = { x: this.mouse.worldX, y: this.mouse.worldY }; return; }
        if (this.selection.length === 0) return;
        
        AudioSys.sfx.click();

        if (!target) {
            this.groundPings.push({x: this.mouse.worldX, y: this.mouse.worldY, life: 20, maxLife: 20, c: '34, 197, 94'}); 
        } else if (target.faction === 'enemy') {
            this.groundPings.push({x: target.x, y: target.y, life: 20, maxLife: 20, c: '239, 68, 68'}); 
        } else if (target.isResource) {
            this.groundPings.push({x: target.x, y: target.y, life: 20, maxLife: 20, c: '250, 204, 21'}); 
        }

        this.selection.forEach((unit, idx) => {
            if (unit.faction !== 'player' || unit.isBuilding) return;
            if (target) {
                if (target.faction === 'enemy') unit.cmdAtk(target);
                else if (target.isResource && unit.type === 'gatherer') unit.cmdGather(target);
                else if (target.faction === 'player' && target.isBuilding && target.progress < 100 && unit.type === 'gatherer') unit.cmdBuild(target);
                else if (target.type === 'lodge' && unit.type === 'gatherer' && unit.heldRes) unit.cmdReturn(target);
                // NEW: Right-click own completed building to garrison/repair
                else if (target.faction === 'player' && target.isBuilding && target.progress >= 100 && target.hp < target.maxHp && unit.type === 'gatherer') unit.cmdRepair(target);
                else unit.cmdMove(this.mouse.worldX + (Math.random()-.5)*20, this.mouse.worldY + (Math.random()-.5)*20);
            } else {
                // NEW: Better formation - diamond pattern
                let count = this.selection.filter(u => u.faction === 'player' && !u.isBuilding).length;
                let cols = Math.ceil(Math.sqrt(count));
                let row = Math.floor(idx / cols), col = idx % cols;
                let offsetX = (col - (cols-1)/2) * 35;
                let offsetY = (row - Math.floor(count/cols)/2) * 35;
                unit.cmdMove(this.mouse.worldX + offsetX, this.mouse.worldY + offsetY);
            }
        });
    },
    
    // NEW: Check building placement validity
    canPlaceBuilding(bx, by, type) {
        let spr = this.sprites[type];
        let hw = spr.width / 2, hh = spr.height / 2;
        
        // Check against existing buildings
        for (let e of this.entities) {
            if (!e.isBuilding) continue;
            let ehw = e.width / 2, ehh = e.height / 2;
            if (Math.abs(bx - e.x) < hw + ehw - 10 && Math.abs(by - e.y) < hh + ehh - 10) return false;
        }
        
        // Check world bounds
        if (bx - hw < 0 || bx + hw > WORLD_WIDTH || by - hh < 0 || by + hh > WORLD_HEIGHT) return false;
        
        return true;
    },
