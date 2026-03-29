/**
 * POC Reference: Entity.update() (pond_craft.html lines 1573-1771)
 *
 * Ported to: All 12 ECS systems in src/ecs/systems/
 *
 * Systems extracted from this method:
 * - Building ambient particles (cleanup.ts) [1578-1584]
 * - Tower auto-attack (combat.ts) [1587-1596]
 * - Idle auto-aggro (combat.ts) [1598-1603]
 * - Attack-move scanning (combat.ts) [1606-1618]
 * - Attack-move resume (combat.ts) [1621-1625]
 * - Idle gatherer auto-gather (gathering.ts) [1627-1639]
 * - Movement + arrival (movement.ts) [1641-1658]
 * - Gathering state machine (gathering.ts) [1661-1683]
 * - Building construction (building.ts) [1685-1693]
 * - Repair state (building.ts) [1695-1710]
 * - Attack state (combat.ts) [1711-1725]
 * - Collision separation (collision.ts) [1727-1740]
 * - Training queue (training.ts) [1743-1754]
 * - Nest defense reinforcement (ai.ts) [1757-1771]
 */

    update() {
        if (this.hp <= 0 && !this.isResource) { this.die(); return; }
        if (this.atkCD > 0) this.atkCD--;
        if (this.flashTimer > 0) this.flashTimer--;

        if (this.isBuilding && this.progress >= 100) {
            if (this.type === 'armory' && GAME.frameCount % 5 === 0) {
                GAME.particles.push({x: this.x + 8, y: this.y - 12, vx: (Math.random()-0.5)*0.5, vy: -0.5 - Math.random()*0.5, life: 60, c: 'rgba(156, 163, 175, 0.4)', s: Math.random()*3+2});
            }
            if (this.type === 'lodge' && GAME.frameCount % 30 === 0) {
                GAME.particles.push({x: this.x + (Math.random()-.5)*20, y: this.y + 10 + Math.random()*10, vx: 0, vy: -0.2, life: 30, c: 'rgba(56, 189, 248, 0.5)', s: 2});
            }
        }

        if (this.type === 'tower' && this.progress >= 100 && this.atkCD <= 0) {
            let targets = GAME.entities.filter(e => e.faction !== this.faction && e.hp > 0 && !e.isResource);
            let closest = null, minDist = this.atkRange;
            for(let t of targets) { let d = Math.sqrt((t.x-this.x)**2 + (t.y-this.y)**2); if (d < minDist) { minDist = d; closest = t; } }
            if (closest) {
                AudioSys.sfx.shoot();
                GAME.projectiles.push(new Projectile(this.x, this.y-20, closest.x, closest.y, closest, this.dmg, this));
                this.atkCD = 50;
            }
        }

        if (this.state === 'idle' && this.dmg && !this.isBuilding && GAME.frameCount % 30 === 0) {
            let aggroRad = this.faction === 'enemy' ? 250 : 200;
            let targets = GAME.entities.filter(e => e.faction !== this.faction && e.hp > 0 && !e.isResource && e.faction !== 'neutral');
            let closeTarget = targets.find(t => Math.sqrt((t.x - this.x)**2 + (t.y - this.y)**2) < aggroRad);
            if (closeTarget) this.cmdAtk(closeTarget);
        }
        
        // NEW: Attack-move scan - units moving to a location will attack enemies they pass by
        if (this.state === 'atk_move' && this.tPos && GAME.frameCount % 15 === 0) {
            let scanRad = this.atkRange > 60 ? this.atkRange : 150;
            let targets = GAME.entities.filter(e => e.faction !== this.faction && e.hp > 0 && !e.isResource && e.faction !== 'neutral');
            let closeTarget = null, minDist = scanRad;
            for (let t of targets) {
                let d = Math.sqrt((t.x - this.x)**2 + (t.y - this.y)**2);
                if (d < minDist) { minDist = d; closeTarget = t; }
            }
            if (closeTarget) {
                this.attackMoveTarget = this.tPos;
                this.cmdAtk(closeTarget);
            }
        }
        
        // NEW: After killing target from attack-move, resume moving
        if (this.state === 'idle' && this.attackMoveTarget) {
            let tp = this.attackMoveTarget;
            this.attackMoveTarget = null;
            this.cmdAttackMove(tp.x, tp.y);
        }

        // NEW: Idle gatherers near resources auto-gather (soft assist)
        if (this.state === 'idle' && this.type === 'gatherer' && this.faction === 'player' && GAME.frameCount % 90 === 0) {
            // Only auto-gather if not holding resources
            if (!this.heldRes) {
                let nearRes = GAME.entities.filter(e => e.isResource && e.resAmount > 0);
                let closest = null, minDist = 120; // Short range auto-gather
                for (let r of nearRes) {
                    let d = Math.sqrt((r.x - this.x)**2 + (r.y - this.y)**2);
                    if (d < minDist) { minDist = d; closest = r; }
                }
                if (closest) this.cmdGather(closest);
            }
        }

        if (!this.isBuilding && !this.isResource) {
            if (['move', 'g_move', 'r_move', 'a_move', 'b_move', 'atk_move', 'rep_move'].includes(this.state) && this.tPos) {
                let dx = this.tPos.x - this.x, dy = this.tPos.y - this.y, dist = Math.sqrt(dx*dx + dy*dy);
                if (dx !== 0) this.facingLeft = dx < 0; 
                
                let targetRad = 0;
                if (this.state === 'g_move' && this.tEnt) targetRad = this.tEnt.radius;
                if (this.state === 'r_move' && this.rEnt) targetRad = this.rEnt.radius;
                if (this.state === 'b_move' && this.tEnt) targetRad = this.tEnt.radius;
                if (this.state === 'rep_move' && this.tEnt) targetRad = this.tEnt.radius;

                let arriveDist = this.speed;
                if (['g_move', 'r_move', 'b_move', 'rep_move'].includes(this.state)) arriveDist = this.radius + targetRad + 15;
                if (this.state === 'a_move') arriveDist = this.atkRange;
                if (this.state === 'atk_move') arriveDist = this.speed;
                
                if (dist <= arriveDist) this.arrive();
                else { this.x += (dx/dist)*this.speed; this.y += (dy/dist)*this.speed; this.yOff = Math.sin(GAME.frameCount*(this.type==='snake'?0.6:0.3))*3; }
            }
            
            if (this.state === 'gath') {
                if (!this.tEnt || this.tEnt.resAmount <= 0) { 
                    // FIX: Try to find another nearby resource of same type
                    if (this.tEnt) {
                        let resType = this.tEnt.type;
                        let nearby = GAME.entities.filter(e => e.type === resType && e.resAmount > 0);
                        let closest = null, minDist = 300;
                        for (let r of nearby) {
                            let d = Math.sqrt((r.x - this.x)**2 + (r.y - this.y)**2);
                            if (d < minDist) { minDist = d; closest = r; }
                        }
                        if (closest) { this.cmdGather(closest); return; }
                    }
                    this.state = 'idle'; return; 
                }
                if (GAME.frameCount % 30 === 0) { AudioSys.sfx[this.tEnt.type==='cattail'?'chop':'mine'](); this.part(this.tEnt.type==='cattail'?PALETTE.reedBrown:PALETTE.clamMeat); }
                if (--this.gTimer <= 0) {
                    this.heldRes = this.tEnt.type==='cattail'?'twigs':'clams';
                    this.tEnt.resAmount -= 10; if(this.tEnt.resAmount<=0) this.tEnt.die();
                    GAME.stats.resourcesGathered += 10;
                    let h = GAME.entities.find(e=>e.type==='lodge' && e.faction==='player');
                    if (h) { this.rEnt = h; this.tPos={x:h.x,y:h.y}; this.state='r_move'; } else { this.state='idle'; }
                }
            }
            if (this.state === 'build') {
                if (!this.tEnt || this.tEnt.hp >= this.tEnt.maxHp) { this.state = 'idle'; return; }
                if (GAME.frameCount % 20 === 0) { AudioSys.sfx.build(); this.part(PALETTE.mudLight); }
                if (--this.gTimer <= 0) {
                    this.tEnt.hp += 10; this.tEnt.progress = (this.tEnt.hp/this.tEnt.maxHp)*100;
                    if (this.tEnt.hp >= this.tEnt.maxHp) { this.tEnt.hp=this.tEnt.maxHp; this.tEnt.progress=100; this.state='idle'; }
                    this.gTimer = 30; 
                }
            }
            // NEW: Repair state
            if (this.state === 'repair') {
                if (!this.tEnt || this.tEnt.hp >= this.tEnt.maxHp) { this.state = 'idle'; return; }
                if (GAME.frameCount % 20 === 0) { AudioSys.sfx.build(); this.part('#22c55e'); }
                if (--this.gTimer <= 0) {
                    // Repair costs 1 twig per 5 HP
                    if (GAME.resources.twigs >= 1) {
                        GAME.resources.twigs -= 1;
                        this.tEnt.hp = Math.min(this.tEnt.maxHp, this.tEnt.hp + 5);
                        if (this.tEnt.hp >= this.tEnt.maxHp) { this.state = 'idle'; }
                    } else {
                        GAME.floatingTexts.push({x: this.x, y: this.y - 20, t: "No twigs!", c: '#ef4444', life: 40});
                        this.state = 'idle';
                    }
                    this.gTimer = 40;
                }
            }
            if (this.state === 'atk') {
                if (!this.tEnt || this.tEnt.hp <= 0) { this.state = 'idle'; return; }
                let dx = this.tEnt.x - this.x, dy = this.tEnt.y - this.y; this.facingLeft = dx < 0;
                if (Math.sqrt(dx*dx + dy*dy) <= this.atkRange) {
                    if (this.atkCD <= 0) {
                        if (this.type === 'sniper') {
                            AudioSys.sfx.shoot();
                            GAME.projectiles.push(new Projectile(this.x, this.y-10, this.tEnt.x, this.tEnt.y, this.tEnt, this.dmg, this));
                        } else {
                            this.tEnt.takeDamage(this.dmg, this);
                        }
                        this.atkCD = 60;
                    }
                } else { this.tPos={x:this.tEnt.x,y:this.tEnt.y}; this.state='a_move'; }
            }

            // Collision separation
            for (let o of GAME.entities) {
                if (o===this || o.isBuilding || o.isResource) continue;
                let dx = this.x - o.x, dy = this.y - o.y, distSq = dx*dx + dy*dy, md = this.radius+o.radius;
                if (distSq < md*md && distSq>0) {
                    let actualDist = Math.sqrt(distSq);
                    let f = (md - actualDist)*0.15; // Slightly stronger push
                    this.x += (dx/actualDist)*f; this.y += (dy/actualDist)*f;
                }
            }
            
            // NEW: Keep units in world bounds
            this.x = Math.max(20, Math.min(WORLD_WIDTH - 20, this.x));
            this.y = Math.max(20, Math.min(WORLD_HEIGHT - 20, this.y));
        }

        if (this.isBuilding && this.faction === 'player' && this.q && this.q.length > 0) {
            if (--this.qTimer <= 0) {
                let t = this.q.shift(), sx = this.x + (Math.random()>.5?1:-1)*30, sy = this.y + this.height/2 + 20;
                let newEnt = new Entity(t, sx, sy, 'player');
                if (this.rallyPos) newEnt.cmdMove(this.rallyPos.x, this.rallyPos.y); 
                if (this.q.length > 0) this.qTimer = 180;
                if (this.selected) GAME.updateUI();
                
                // NEW: Training complete notification particle burst
                for(let j=0; j<8; j++) GAME.particles.push({x: sx, y: sy, vx:(Math.random()-.5)*3, vy:Math.random()*2, life:20, c:'#38bdf8', s:3});
            }
        }
        
        // NEW: Enemy nests spawn reinforcements when attacked
        if (this.type === 'predator_nest' && this.hp < this.maxHp * 0.5 && GAME.frameCount % 600 === 0) {
            let nearbyDefenders = GAME.entities.filter(e => e.faction === 'enemy' && !e.isBuilding && Math.sqrt((e.x-this.x)**2+(e.y-this.y)**2) < 300);
            if (nearbyDefenders.length < 4) {
                let type = Math.random() > 0.5 ? 'gator' : 'snake';
                let defender = new Entity(type, this.x + (Math.random()-.5)*60, this.y + 30, 'enemy');
                // Find nearest player unit to attack
                let targets = GAME.entities.filter(e => e.faction === 'player' && e.hp > 0);
                let closest = null, minDist = 400;
                for (let t of targets) { 
                    let d = Math.sqrt((t.x-this.x)**2+(t.y-this.y)**2); 
                    if (d < minDist) { minDist = d; closest = t; }
                }
                if (closest) defender.cmdAtk(closest);
            }
        }
