/**
 * POC Reference: Game Loop & Update Logic (pond_craft.html lines 1135-1327)
 *
 * Ported to: src/game.ts (loop, updateLogic), and all 12 ECS systems
 *
 * loop: requestAnimationFrame, dt > 1000/60, gameSpeed multiplier.
 * updateLogic: frameCount++, time of day, fireflies, camera pan,
 *   entity updates (backward iteration), projectiles, particles,
 *   floating texts, pings, corpses, explored fog, screen shake,
 *   peace timer, wave spawning, healing, win/lose check,
 *   UI updates (every 30 frames), resource income (every 120 frames),
 *   ctrl group cleanup.
 */

    loop(timestamp) {
        let dt = timestamp - this.lastTime;
        if (dt > 1000/60) {
            if (this.state === 'playing') {
                for (let i = 0; i < this.gameSpeed; i++) this.updateLogic();
            }
            this.draw(); this.lastTime = timestamp;
        }
        requestAnimationFrame((t) => this.loop(t));
    },

    updateLogic() {
        this.frameCount++;
        
        this.timeOfDay += 0.05; if (this.timeOfDay >= 24*60) this.timeOfDay = 0;
        let hrs = Math.floor(this.timeOfDay/60), mins = Math.floor(this.timeOfDay%60);
        document.getElementById('clock-display').textContent = `Day ${Math.floor(this.frameCount/28800)+1} - ${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}`;
        document.getElementById('day-night-overlay').style.backgroundColor = this.getLerpedColor(this.timeOfDay / 60);

        this.fireflies.forEach(f => {
            f.x += f.vx; f.y += f.vy; f.phase += 0.05; f.vx += (Math.random() - 0.5) * 0.1;
            if (f.vx > 1) f.vx = 1; if (f.vx < -1) f.vx = -1;
            let margin = 200;
            if (f.x < this.camX - margin) f.x = this.camX + this.width + margin; if (f.x > this.camX + this.width + margin) f.x = this.camX - margin;
            if (f.y < this.camY - margin) f.y = this.camY + this.height + margin; if (f.y > this.camY + this.height + margin) f.y = this.camY - margin;
        });

        let s = 12, e = 20, manualPan = false;
        if (this.keys['w'] || this.keys['arrowup'] || (this.mouse.in && this.mouse.y < e && !this.mouse.isDown)) { this.camY -= s; manualPan = true; }
        if (this.keys['s'] || this.keys['arrowdown'] || (this.mouse.in && this.mouse.y > this.height-e && !this.mouse.isDown)) { this.camY += s; manualPan = true; }
        // FIX: Don't pan left when pressing 'a' for attack-move (only pan with arrow keys and screen edge)
        if (this.keys['arrowleft'] || (this.mouse.in && this.mouse.x < e && !this.mouse.isDown)) { this.camX -= s; manualPan = true; }
        if (this.keys['d'] || this.keys['arrowright'] || (this.mouse.in && this.mouse.x > this.width-e && !this.mouse.isDown)) { this.camX += s; manualPan = true; }
        if (manualPan) this.isTracking = false;

        if (this.isTracking && this.selection.length > 0) {
            let cx = 0, cy = 0, validCount = 0;
            for (let u of this.selection) if (u.hp > 0) { cx += u.x; cy += u.y; validCount++; }
            if (validCount > 0) {
                cx /= validCount; cy /= validCount;
                this.camX += ((cx - this.width / 2) - this.camX) * 0.1;
                this.camY += ((cy - this.height / 2) - this.camY) * 0.1;
            } else this.isTracking = false;
        }

        this.camX = Math.max(0, Math.min(WORLD_WIDTH - this.width, this.camX)); 
        this.camY = Math.max(0, Math.min(WORLD_HEIGHT - this.height, this.camY));

        // FIX: Iterate backwards to safely handle entity removal during update
        for (let i = this.entities.length - 1; i >= 0; i--) {
            if (this.entities[i]) this.entities[i].update();
        }
        for (let i = this.projectiles.length - 1; i >= 0; i--) if (this.projectiles[i].update()) this.projectiles.splice(i, 1);
        for (let i = this.particles.length - 1; i >= 0; i--) { let p = this.particles[i]; p.life--; p.y -= p.vy; p.x += p.vx; if (p.life <= 0) this.particles.splice(i, 1); }
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) { let f = this.floatingTexts[i]; f.life--; f.y -= 0.5; if (f.life <= 0) this.floatingTexts.splice(i, 1); }
        for (let i = this.minimapPings.length - 1; i >= 0; i--) { this.minimapPings[i].life--; if (this.minimapPings[i].life <= 0) this.minimapPings.splice(i, 1); }
        for (let i = this.groundPings.length - 1; i >= 0; i--) { this.groundPings[i].life--; if (this.groundPings[i].life <= 0) this.groundPings.splice(i, 1); }
        for (let i = this.corpses.length - 1; i >= 0; i--) { this.corpses[i].life--; if (this.corpses[i].life <= 0) this.corpses.splice(i, 1); }

        // NEW: Update explored fog
        if (this.frameCount % 10 === 0) {
            for (let ent of this.entities) {
                if (ent.faction === 'player') {
                    let rad = ent.isBuilding ? 16 : 10;
                    let ex = Math.floor(ent.x / 16), ey = Math.floor(ent.y / 16);
                    this.exploredCtx.fillStyle = 'rgba(255,255,255,0.15)';
                    this.exploredCtx.beginPath();
                    this.exploredCtx.arc(ex, ey, rad, 0, Math.PI*2);
                    this.exploredCtx.fill();
                }
            }
        }

        // Screen shake timer
        if (this.shakeTimer > 0) this.shakeTimer--;

        let statusEl = document.getElementById('status-display');
        let isPeaceful = this.frameCount < this.peaceTimer;
        
        if (isPeaceful) {
            statusEl.textContent = `Peaceful (${Math.ceil((this.peaceTimer - this.frameCount)/60)}s)`;
            statusEl.className = 'text-green-400 font-bold uppercase tracking-widest hidden sm:block';
        } else {
            statusEl.textContent = 'Hunting!';
            statusEl.className = 'text-red-500 font-bold uppercase tracking-widest animate-pulse hidden sm:block';
            if (this.frameCount % 1800 === 0) { 
                let nests = this.entities.filter(e => e.type === 'predator_nest');
                let th = this.entities.find(e => e.type === 'lodge' && e.faction === 'player');
                if (nests.length > 0 && th) {
                    AudioSys.sfx.alert();
                    let waveSize = Math.min(6, 1 + Math.floor((this.frameCount - this.peaceTimer) / 7200)); 
                    nests.forEach(nest => {
                        for(let i=0; i<waveSize; i++) {
                            let type = Math.random() > 0.5 ? 'gator' : 'snake';
                            let o = new Entity(type, nest.x + (Math.random()-.5)*60, nest.y + 30 + (Math.random()-.5)*30, 'enemy');
                            o.cmdAtk(th);
                        }
                    });
                }
            }
        }

        // NEW: Player units heal slowly out of combat (every 5 seconds, +1 HP)
        if (this.frameCount % 300 === 0) {
            this.entities.forEach(ent => {
                if (ent.faction === 'player' && !ent.isBuilding && !ent.isResource && ent.hp < ent.maxHp && ent.hp > 0) {
                    if (ent.state === 'idle' || ent.state === 'move' || ent.state === 'gath' || ent.state === 'g_move' || ent.state === 'r_move') {
                        ent.hp = Math.min(ent.maxHp, ent.hp + 1);
                    }
                }
            });
        }

        if (this.frameCount % 60 === 0) {
            let playerTH = this.entities.some(e => e.type === 'lodge' && e.faction === 'player');
            let nestsLeft = this.entities.some(e => e.type === 'predator_nest');
            if (!playerTH) this.setGameOver('lose'); else if (!nestsLeft) this.setGameOver('win');
        }

        // FIX: Only update queue fill bar, NOT full UI rebuild (was causing infinite loop)
        if (this.frameCount % 3 === 0 && this.selection.length === 1 && this.selection[0].isBuilding && this.selection[0].q && this.selection[0].q.length > 0) {
            let fillEl = document.getElementById('q-fill-active');
            if (fillEl) fillEl.style.height = `${(1 - this.selection[0].qTimer/180)*100}%`;
        }

        if (this.frameCount % 30 === 0) {
            let maxF = 0, curF = 0, idleCount = 0, armyCount = 0;
            this.entities.forEach(e => {
                if (e.faction === 'player') {
                    if (e.type==='lodge' && e.progress>=100) maxF += 4;
                    if (e.type==='burrow' && e.progress>=100) maxF += 4;
                    if (!e.isBuilding && !e.isResource) { curF++; if (e.type !== 'gatherer') armyCount++; }
                    if (e.type === 'gatherer' && e.state === 'idle') idleCount++;
                }
            });
            this.resources.food = curF; this.resources.maxFood = maxF;
            document.getElementById('res-clams').textContent = this.resources.clams;
            document.getElementById('res-twigs').textContent = this.resources.twigs;
            let fEl = document.getElementById('res-food'); fEl.textContent = `${curF}/${maxF}`;
            fEl.className = curF >= maxF ? 'text-red-500 font-bold' : 'text-red-400 font-bold';
            
            // NEW: Track army peak
            if (armyCount > this.stats.peakArmy) this.stats.peakArmy = armyCount;
            
            let idleBtn = document.getElementById('idle-worker-btn');
            if (idleCount > 0) { idleBtn.classList.remove('hidden'); document.getElementById('idle-worker-count').textContent = `${idleCount} Idle`;
            } else idleBtn.classList.add('hidden');

            let armyBtn = document.getElementById('select-army-btn');
            if (armyCount > 0) { armyBtn.classList.remove('hidden'); document.getElementById('army-count').textContent = `${armyCount}`;
            } else armyBtn.classList.add('hidden');
            
            // FIX: Only update HP bar for single selection, NOT full UI rebuild
            if (this.selection.length === 1) {
                let sel = this.selection[0];
                let hpFill = document.getElementById('sel-hp-fill');
                if (hpFill) {
                    hpFill.style.width = `${Math.max(0, (sel.hp/sel.maxHp)*100)}%`;
                    let hpPct = sel.hp / sel.maxHp;
                    hpFill.style.background = hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#eab308' : '#ef4444';
                }
                let descEl = document.getElementById('sel-desc');
                if (descEl && !sel.isResource) {
                    let statusText = sel.progress < 100 ? `Building ${Math.floor(sel.progress)}%` : sel.state;
                    if (sel.heldRes) statusText += ` (carrying ${sel.heldRes})`;
                    if (sel.isBuilding && sel.q && sel.q.length > 0) statusText = `Training (${sel.q.length} queued)`;
                    descEl.textContent = `Status: ${statusText}`;
                }
            }
            
            // NEW: Resource income rate tracking
            if (this.frameCount % 120 === 0) {
                this.resTracker.rateClams = this.resources.clams - this.resTracker.lastClams;
                this.resTracker.rateTwigs = this.resources.twigs - this.resTracker.lastTwigs;
                this.resTracker.lastClams = this.resources.clams;
                this.resTracker.lastTwigs = this.resources.twigs;
                let clamRate = document.getElementById('res-clams-rate');
                let twigRate = document.getElementById('res-twigs-rate');
                if (clamRate) {
                    let r = this.resTracker.rateClams;
                    clamRate.textContent = r >= 0 ? `+${r}` : `${r}`;
                    clamRate.className = `text-[10px] hidden md:inline ${r >= 0 ? 'text-green-400' : 'text-red-400'}`;
                }
                if (twigRate) {
                    let r = this.resTracker.rateTwigs;
                    twigRate.textContent = r >= 0 ? `+${r}` : `${r}`;
                    twigRate.className = `text-[10px] hidden md:inline ${r >= 0 ? 'text-green-400' : 'text-red-400'}`;
                }
            }
            
            this.updateCtrlGroupUI();
        }
    },
