/**
 * POC Reference: Entity.die() & Entity.draw() (pond_craft.html lines 1809-1926)
 *
 * Ported to: src/ecs/systems/health.ts (die), src/rendering/game-renderer.ts (drawEntity)
 *
 * die(): prevent double-die, remove from entities/selection, stats tracking,
 *   screen shake for buildings, 20 death particles, corpse/rubble creation,
 *   kill credit to first attacker found.
 *
 * draw(): shadow ellipse, selection brackets (cyan corners), sprite with
 *   facingLeft flip, damage flash tint (source-atop composite), construction
 *   reveal (partial drawImage + progress text), carried resource indicator
 *   with sparkle, health bar (green/yellow/red), veterancy stars.
 */

    die() {
        // FIX: Prevent double-die
        if (this._dead) return;
        this._dead = true;
        
        let i = GAME.entities.indexOf(this); if(i>-1) GAME.entities.splice(i,1);
        i = GAME.selection.indexOf(this); 
        if(i>-1) { GAME.selection.splice(i,1); this.selected = false; if(GAME.selection.length === 0 || this.selected) GAME.updateUI(); }
        
        // NEW: Stats tracking
        if (this.faction === 'player' && !this.isBuilding && !this.isResource) GAME.stats.unitsLost++;
        if (this.faction === 'enemy' && !this.isBuilding) GAME.stats.unitsKilled++;
        
        // NEW: Screen shake for building destruction
        if (this.isBuilding) GAME.triggerShake();
        
        for(let j=0; j<20; j++) GAME.particles.push({x:this.x, y:this.y, vx:(Math.random()-.5)*4, vy:(Math.random()-.5)*4+2, life:30, c: this.isBuilding?PALETTE.mudLight:PALETTE.clamMeat, s:4});
        
        // Battlefield Corpses/Ruins
        if (!this.isResource) {
            GAME.corpses.push({
                x: this.x, y: this.y,
                sprite: this.isBuilding ? GAME.sprites.rubble : GAME.sprites.bones,
                life: 1800, maxLife: 1800 
            });
        }
        
        // NEW: Credit kill to attacker (find who was targeting this)
        // This is approximate - credits the first attacker found
        for (let ent of GAME.entities) {
            if (ent.tEnt === this && ent.state === 'atk') {
                ent.kills++;
                break;
            }
        }
    }

    draw(c) {
        let dx = this.x - this.width/2, dy = this.y - this.height/2 + (this.yOff||0);
        
        // Shadow
        c.fillStyle = 'rgba(0, 0, 0, 0.4)';
        c.beginPath(); c.ellipse(this.x, this.y + this.height/2 - 2, this.radius, this.radius/2, 0, 0, Math.PI*2); c.fill();

        // Selection brackets
        if (this.selected) {
            let pad = 2; let bx = dx - pad, by = dy - pad; let bw = this.width + pad*2, bh = this.height + pad*2; let l = 6; 
            c.strokeStyle = '#38bdf8'; c.lineWidth = 2; c.beginPath();
            c.moveTo(bx, by+l); c.lineTo(bx, by); c.lineTo(bx+l, by); c.moveTo(bx+bw-l, by); c.lineTo(bx+bw, by); c.lineTo(bx+bw, by+l); 
            c.moveTo(bx, by+bh-l); c.lineTo(bx, by+bh); c.lineTo(bx+l, by+bh); c.moveTo(bx+bw-l, by+bh); c.lineTo(bx+bw, by+bh); c.lineTo(bx+bw, by+bh-l); 
            c.stroke();
        }

        c.save();
        if (this.facingLeft && !this.isBuilding) {
            c.translate(this.x, this.y); c.scale(-1, 1); c.translate(-this.x, -this.y);
        }

        // NEW: Damage flash tint
        if (this.flashTimer > 0) {
            c.globalAlpha = 0.7;
        }

        if (this.isBuilding && this.progress < 100) {
            c.globalAlpha = 0.5 + (this.progress/200);
            c.drawImage(this.sprite, 0, this.sprite.height*(1-this.progress/100), this.width, this.height*(this.progress/100), dx, dy + this.height*(1-this.progress/100), this.width, this.height*(this.progress/100));
            c.globalAlpha = 1.0; c.strokeStyle = '#b45309'; c.strokeRect(dx, dy, this.width, this.height); 
            
            // NEW: Construction progress percentage text
            c.font = "bold 10px 'Courier New'"; c.textAlign = 'center';
            c.fillStyle = '#fbbf24'; c.fillText(Math.floor(this.progress) + '%', this.x, dy - 4);
        } else {
            c.drawImage(this.sprite, dx, dy);
        }
        
        // NEW: Red tint overlay when taking damage
        if (this.flashTimer > 0) {
            c.globalCompositeOperation = 'source-atop';
            c.fillStyle = `rgba(255, 60, 60, ${this.flashTimer / 12})`;
            c.fillRect(dx, dy, this.width, this.height);
            c.globalCompositeOperation = 'source-over';
        }
        
        c.globalAlpha = 1.0;
        c.restore();
        
        if (this.heldRes) { 
            c.fillStyle = this.heldRes==='clams'?PALETTE.clamShell:PALETTE.reedBrown; 
            c.fillRect(this.x+5, this.y-20, 6, 6); 
            // NEW: Tiny sparkle on carried resource
            if (GAME.frameCount % 20 < 5) {
                c.fillStyle = '#fff'; c.fillRect(this.x+7, this.y-22, 2, 2);
            }
        }

        // Health bar
        if (this.selected || (this.hp < this.maxHp && !this.isResource)) {
            let bw = this.width*0.8, bh = 4;
            c.fillStyle = '#7f1d1d'; c.fillRect(this.x-bw/2, dy-8, bw, bh);
            let hpPct = this.hp / this.maxHp;
            c.fillStyle = hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#eab308' : '#ef4444';
            c.fillRect(this.x-bw/2, dy-8, bw*hpPct, bh);
        }
        
        // NEW: Veterancy stars (kill indicators)
        if (this.kills >= 3 && !this.isBuilding && !this.isResource) {
            let stars = Math.min(3, Math.floor(this.kills / 3));
            c.font = "8px 'Courier New'"; c.textAlign = 'center';
            c.fillStyle = '#fbbf24';
            c.fillText('★'.repeat(stars), this.x, dy - 12);
        }
    }
}

window.onload = () => GAME.init();
</script>
</body>
</html>
