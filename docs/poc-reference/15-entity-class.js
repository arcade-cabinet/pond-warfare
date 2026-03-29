/**
 * POC Reference: Entity Class - Constructor & takeDamage (pond_craft.html lines 1505-1571)
 *
 * Ported to: src/ecs/archetypes.ts (spawnEntity), src/ecs/components.ts,
 *            src/ecs/systems/health.ts (takeDamage)
 *
 * Constructor: type, position, faction, sprite assignment, size/radius calc,
 *   HP by type, speed/damage/range by type, resource amounts,
 *   building progress (1% for new player buildings), tech bonus application.
 *
 * takeDamage: HP reduction, flash timer, particles, floating text,
 *   minimap ping for player, retaliation, ally assist (300 range).
 */

class Entity {
    constructor(type, x, y, faction) {
        this.type = type; this.x = x; this.y = y; this.faction = faction; this.sprite = GAME.sprites[type];
        this.width = this.sprite.width; this.height = this.sprite.height; this.radius = this.width/2.5;
        this.selected = false; this.state = 'idle'; this.facingLeft = false;
        
        this.isBuilding = ['lodge', 'burrow', 'armory', 'tower', 'predator_nest'].includes(type);
        this.isResource = ['cattail', 'clambed'].includes(type);
        this.rallyPos = null;
        
        this.hp = this.maxHp = type==='lodge'?1500 : type==='predator_nest'?1000 : type==='tower'?500 : type==='burrow'?300 : type==='armory'?600 : type==='gatherer'?30 : type==='sniper'?40 : 60;
        
        // NEW: Tower gets dmg property
        this.dmg = 0;
        if (!this.isBuilding && !this.isResource) {
            this.speed = type==='gatherer'? 2.0 : type==='snake'? 2.0 : type==='sniper'? 1.6 : 1.8;
            this.dmg = type==='gatherer'? 2 : type==='sniper'? 8 : type==='snake'? 4 : 6;
            this.atkRange = type==='sniper' ? 180 : 40; 
            this.atkCD = 0;
        }
        if (type === 'tower') { this.atkRange = 200; this.atkCD = 0; this.dmg = 10; }
        if (this.isResource) this.resAmount = type==='cattail' ? 1000 : 25000;
        
        this.progress = 100;
        if (this.isBuilding && faction === 'player' && type !== 'lodge') { this.progress = 1; this.hp = 1; }

        // NEW: Kill tracking
        this.kills = 0;
        
        // NEW: Flash timer for damage feedback
        this.flashTimer = 0;
        
        // NEW: Attack-move state
        this.attackMoveTarget = null;

        if (faction === 'player') {
            if (!this.isBuilding && GAME.tech.sharpSticks && this.dmg) this.dmg += 2;
            if (this.isBuilding && GAME.tech.sturdyMud) { this.maxHp += 300; this.hp += 300; }
            if (!this.isBuilding && !this.isResource && GAME.tech.swiftPaws) this.speed += 0.4;
            if (type === 'sniper' && GAME.tech.eagleEye) this.atkRange += 50;
        }
        
        GAME.entities.push(this);
    }

    takeDamage(amount, attacker) {
        if (this.hp <= 0) return; this.hp -= amount; AudioSys.sfx.hit();
        this.flashTimer = 8; // NEW: Damage flash
        for(let i=0;i<5;i++) GAME.particles.push({x:this.x, y:this.y-10, vx:(Math.random()-.5)*2, vy:Math.random()*2, life:15, c: this.isBuilding?PALETTE.mudLight:PALETTE.clamMeat, s:3});
        
        GAME.floatingTexts.push({x: this.x + (Math.random()*10-5), y: this.y - this.height/2 - 5, t: `-${amount}`, c: '#ef4444', life: 40});

        if (this.hp > 0 && attacker) {
            if (this.faction === 'player' && attacker.faction === 'enemy') GAME.addPing(this.x, this.y);
            // FIX: Don't interrupt building (b_move/build) to attack
            if (!this.isBuilding && ['idle', 'gath', 'g_move', 'r_move', 'move'].includes(this.state) && this.dmg) this.cmdAtk(attacker);
            GAME.entities.forEach(e => {
                if (e !== this && e.faction === this.faction && !e.isBuilding && e.hp > 0 && e.dmg) {
                    if (['idle', 'move'].includes(e.state)) { 
                        let dist = Math.sqrt((e.x - this.x)**2 + (e.y - this.y)**2);
                        if (dist < 300) e.cmdAtk(attacker); 
                    }
                }
            });
        }
        if (this.hp <= 0) this.die();
    }
