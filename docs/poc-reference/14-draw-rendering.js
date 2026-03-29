/**
 * POC Reference: Draw / Rendering Pipeline (pond_craft.html lines 1329-1503)
 *
 * Ported to: src/rendering/game-renderer.ts, src/rendering/fog-renderer.ts,
 *            src/rendering/light-renderer.ts, src/rendering/minimap-renderer.ts,
 *            src/rendering/particles.ts
 *
 * Rendering order:
 * 1. Black clear + screen shake offset
 * 2. Background canvas (buildMap result)
 * 3. Corpses/ruins with fade opacity
 * 4. Y-sorted entities (Entity.draw)
 * 5. Ground pings (expanding dual rings)
 * 6. Particles (alpha fade)
 * 7. Projectiles (trail + body)
 * 8. Rally point lines + animated flag
 * 9. Range rings (towers/snipers, dashed)
 * 10. Floating text (outline stroke)
 * 11. Selection rectangle (green, corner dots)
 * 12. Building placement preview (ghost + validity color)
 * -- then restore --
 * 13. Fog of war (pattern drift, radial gradient cutouts)
 * 14. Dynamic lighting (building glow, fireflies)
 * 15. Minimap (entity dots, explored tint, pings, camera rect)
 */

    draw() {
        let c = this.ctx; c.fillStyle = '#000'; c.fillRect(0, 0, this.width, this.height);
        
        c.save(); 
        
        // NEW: Screen shake offset
        let shakeX = 0, shakeY = 0;
        if (this.shakeTimer > 0) {
            shakeX = (Math.random() - 0.5) * this.shakeTimer;
            shakeY = (Math.random() - 0.5) * this.shakeTimer;
        }
        c.translate(-Math.floor(this.camX) + shakeX, -Math.floor(this.camY) + shakeY);
        c.drawImage(this.bgCanvas, 0, 0);

        // Draw Corpses & Ruins
        for (let cp of this.corpses) {
            if (cp.x + 100 > this.camX && cp.x - 100 < this.camX + this.width && cp.y + 100 > this.camY && cp.y - 100 < this.camY + this.height) {
                c.globalAlpha = Math.min(1, cp.life / 60) * 0.7;
                c.drawImage(cp.sprite, cp.x - cp.sprite.width/2, cp.y - cp.sprite.height/2 + (cp.sprite === this.sprites.bones ? 4 : 0));
                c.globalAlpha = 1.0;
            }
        }
        
        let sorted = [...this.entities].sort((a,b) => a.y - b.y);
        for (let e of sorted) {
            if (e.x + 100 > this.camX && e.x - 100 < this.camX + this.width && e.y + 100 > this.camY && e.y - 100 < this.camY + this.height) e.draw(c);
        }

        for (let p of this.groundPings) {
            let progress = 1 - (p.life / p.maxLife);
            c.strokeStyle = `rgba(${p.c}, ${1 - progress})`; c.lineWidth = 2;
            c.beginPath(); c.arc(p.x, p.y, progress * 15, 0, Math.PI * 2); c.stroke();
            // NEW: Second ring for more visible ping
            c.beginPath(); c.arc(p.x, p.y, progress * 8, 0, Math.PI * 2); c.stroke();
        }

        for (let p of this.particles) { 
            c.globalAlpha = Math.min(1, p.life / 10);
            c.fillStyle = p.c; c.fillRect(p.x, p.y, p.s, p.s); 
        }
        c.globalAlpha = 1.0;
        for (let p of this.projectiles) p.draw(c);

        // Rally point display
        if (this.selection.length === 1 && this.selection[0].isBuilding && this.selection[0].rallyPos) {
            let b = this.selection[0], rp = b.rallyPos; c.strokeStyle = '#38bdf8'; c.lineWidth = 2; c.setLineDash([5, 5]);
            c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(rp.x, rp.y); c.stroke();
            c.setLineDash([]); c.fillStyle = '#38bdf8'; c.beginPath(); c.arc(rp.x, rp.y, 4, 0, Math.PI*2); c.fill();
            // NEW: Animated rally flag
            let flagBob = Math.sin(this.frameCount * 0.1) * 2;
            c.fillStyle = '#38bdf8'; 
            c.fillRect(rp.x, rp.y - 14 + flagBob, 8, 6);
            c.fillRect(rp.x, rp.y - 14, 1, 14);
        }
        
        // NEW: Tower/sniper range ring when selected
        for (let sel of this.selection) {
            if (sel.atkRange > 60 && sel.selected) {
                c.strokeStyle = 'rgba(239, 68, 68, 0.25)'; c.lineWidth = 1; c.setLineDash([4, 4]);
                c.beginPath(); c.arc(sel.x, sel.y, sel.atkRange, 0, Math.PI * 2); c.stroke();
                c.setLineDash([]);
            }
        }

        c.font = "bold 14px 'Courier New'"; c.textAlign = "center";
        for (let f of this.floatingTexts) {
            c.fillStyle = f.c; c.globalAlpha = Math.min(1, f.life / 30); c.fillText(f.t, f.x, f.y);
            c.lineWidth = 1; c.strokeStyle = '#000'; c.strokeText(f.t, f.x, f.y);
        }
        c.globalAlpha = 1.0;

        if (this.mouse.isDown && !this.placingBuilding) {
            c.strokeStyle = '#22c55e'; c.lineWidth = 1;
            let x = Math.min(this.mouse.startX, this.mouse.worldX), y = Math.min(this.mouse.startY, this.mouse.worldY);
            let w = Math.abs(this.mouse.worldX - this.mouse.startX), h = Math.abs(this.mouse.worldY - this.mouse.startY);
            c.strokeRect(x, y, w, h); c.fillStyle = 'rgba(34, 197, 94, 0.15)'; c.fillRect(x, y, w, h);
            // NEW: Corner dots on selection rectangle
            c.fillStyle = '#22c55e';
            [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([px,py]) => {
                c.beginPath(); c.arc(px, py, 3, 0, Math.PI*2); c.fill();
            });
        }

        if (this.placingBuilding) {
            let bx = Math.round(this.mouse.worldX/TILE_SIZE)*TILE_SIZE, by = Math.round(this.mouse.worldY/TILE_SIZE)*TILE_SIZE;
            let spr = this.sprites[this.placingBuilding];
            let ok = this.canPlaceBuilding(bx, by, this.placingBuilding);
            let canAfford = (this.placingBuilding==='burrow' && this.resources.twigs>=100) || 
                     (this.placingBuilding==='armory' && this.resources.clams>=250 && this.resources.twigs>=150) ||
                     (this.placingBuilding==='tower' && this.resources.clams>=200 && this.resources.twigs>=250);
            ok = ok && canAfford;
            c.globalAlpha = 0.5; c.drawImage(spr, bx - spr.width/2, by - spr.height/2);
            c.fillStyle = ok ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.5)';
            c.fillRect(bx - spr.width/2, by - spr.height/2, spr.width, spr.height); c.globalAlpha = 1.0;
            
            // NEW: Show placement text
            c.font = "bold 11px 'Courier New'"; c.textAlign = "center";
            c.fillStyle = ok ? '#22c55e' : '#ef4444';
            c.fillText(ok ? 'Click to place (Esc cancel)' : (canAfford ? 'Blocked!' : 'Not enough resources'), bx, by - spr.height/2 - 8);
        }
        c.restore();

        // Fog of War
        let fc = this.fogCtx; fc.clearRect(0,0,this.width, this.height);
        fc.globalCompositeOperation = 'source-over'; fc.save();
        let driftX = -(this.camX * 0.2 + this.frameCount * 0.1) % 256, driftY = -(this.camY * 0.2 + this.frameCount * 0.05) % 256;
        fc.translate(driftX, driftY); fc.fillStyle = this.fogPattern;
        fc.fillRect(-256, -256, this.width + 512, this.height + 512); fc.restore();

        fc.globalCompositeOperation = 'destination-out';
        for (let e of this.entities) {
            if (e.faction === 'player' && e.x + 400 > this.camX && e.x - 400 < this.camX + this.width && e.y + 400 > this.camY && e.y - 400 < this.camY + this.height) {
                let sx = e.x - this.camX + shakeX, sy = e.y - this.camY + shakeY, rad = e.isBuilding ? 250 : 150;
                let grad = fc.createRadialGradient(sx, sy, rad*0.2, sx, sy, rad);
                grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.6, 'rgba(0,0,0,0.8)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
                fc.fillStyle = grad; fc.beginPath(); fc.arc(sx, sy, rad, 0, Math.PI*2); fc.fill();
            }
        }
        fc.globalCompositeOperation = 'source-over';

        // Lighting
        let lc = this.lightCtx; lc.clearRect(0,0,this.width, this.height);
        if (this.ambientDarkness > 0.05) {
            lc.save(); lc.translate(-Math.floor(this.camX) + shakeX, -Math.floor(this.camY) + shakeY);
            for (let e of this.entities) {
                if (e.x + 200 > this.camX && e.x - 200 < this.camX + this.width && e.y + 200 > this.camY && e.y - 200 < this.camY + this.height) {
                    let rad = 0, rgb = '';
                    if (e.type === 'lodge' && e.progress >= 100) { rad = 150; rgb = '251, 191, 36'; }
                    else if (e.type === 'tower' && e.progress >= 100) { rad = 120; rgb = '251, 191, 36'; }
                    else if (e.type === 'predator_nest') { rad = 100; rgb = '239, 68, 68'; }
                    else if (e.faction === 'player' && !e.isBuilding) { rad = 60; rgb = '253, 230, 138'; }

                    if (rad > 0) {
                        let lGrad = lc.createRadialGradient(e.x, e.y, rad*0.1, e.x, e.y, rad);
                        let pulse = 0.8 + Math.sin(this.frameCount * 0.05 + e.x) * 0.1;
                        lGrad.addColorStop(0, `rgba(${rgb}, ${this.ambientDarkness * pulse})`); lGrad.addColorStop(1, `rgba(${rgb}, 0)`);
                        lc.fillStyle = lGrad; lc.beginPath(); lc.arc(e.x, e.y, rad, 0, Math.PI*2); lc.fill();
                    }
                }
            }
            for (let f of this.fireflies) {
                if (f.x > this.camX && f.x < this.camX + this.width && f.y > this.camY && f.y < this.camY + this.height) {
                    let alpha = (Math.sin(f.phase) * 0.5 + 0.5) * this.ambientDarkness;
                    lc.beginPath(); lc.arc(f.x, f.y, 2, 0, Math.PI*2); lc.fillStyle = `rgba(163, 230, 53, ${alpha})`; lc.fill();
                    lc.beginPath(); lc.arc(f.x, f.y, 6, 0, Math.PI*2); lc.fillStyle = `rgba(163, 230, 53, ${alpha * 0.3})`; lc.fill();
                }
            }
            lc.restore();
        }

        // Minimap
        let mc = this.minimapCtx; mc.fillStyle = PALETTE.waterDeep; mc.fillRect(0, 0, 200, 200); let sx = 200/WORLD_WIDTH, sy = 200/WORLD_HEIGHT;
        
        // NEW: Draw explored areas on minimap with subtle tint
        mc.globalAlpha = 0.15;
        mc.drawImage(this.exploredCanvas, 0, 0, 200, 200);
        mc.globalAlpha = 1;
        
        for (let e of this.entities) {
            if(e.type==='cattail') mc.fillStyle = PALETTE.reedGreen; else if(e.type==='clambed') mc.fillStyle = PALETTE.clamShell;
            else if(e.faction==='player') mc.fillStyle = '#38bdf8'; else if(e.type==='predator_nest') mc.fillStyle = '#7f1d1d';
            else if(e.faction==='enemy') mc.fillStyle = '#ef4444'; else mc.fillStyle = '#fff';
            let s = e.isBuilding ? 4 : 2; mc.fillRect(e.x*sx - s/2, e.y*sy - s/2, s, s);
        }
        
        for (let p of this.minimapPings) {
            let alpha = p.life / p.maxLife; let radius = 4 + (Math.sin(p.life * 0.2) * 2); 
            mc.strokeStyle = `rgba(239, 68, 68, ${alpha})`; mc.lineWidth = 1.5;
            mc.strokeRect((p.x * sx) - radius, (p.y * sy) - radius, radius * 2, radius * 2);
        }

        let mCam = document.getElementById('minimap-cam'); mCam.classList.remove('hidden');
        mCam.style.left = `${this.camX * sx}px`; mCam.style.top = `${this.camY * sy}px`; mCam.style.width = `${this.width * sx}px`; mCam.style.height = `${this.height * sy}px`;
    }
};
