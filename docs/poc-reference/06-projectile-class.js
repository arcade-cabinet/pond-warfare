/**
 * POC Reference: Projectile Class (pond_craft.html lines 313-344)
 *
 * Ported to: src/ecs/systems/projectile.ts + src/ecs/components.ts (ProjectileData)
 *
 * Homing projectiles for sniper units and towers. Trail particle rendering.
 * Speed: 8px/frame. Deals damage on arrival.
 */

class Projectile {
    constructor(x, y, tx, ty, targetEnt, dmg, owner) {
        this.x = x; this.y = y; this.tx = tx; this.ty = ty; 
        this.target = targetEnt; this.dmg = dmg; this.owner = owner; this.speed = 8;
        this.trail = [];
    }
    update() {
        if (this.target && this.target.hp > 0) { this.tx = this.target.x; this.ty = this.target.y; }
        let dx = this.tx - this.x, dy = this.ty - this.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < this.speed) {
            if (this.target && this.target.hp > 0) this.target.takeDamage(this.dmg, this.owner);
            return true; 
        }
        this.trail.push({x: this.x, y: this.y, life: 8});
        this.x += (dx/dist)*this.speed; this.y += (dy/dist)*this.speed;
        return false;
    }
    draw(c) {
        // Draw trail
        for (let i = this.trail.length - 1; i >= 0; i--) {
            let t = this.trail[i];
            t.life--;
            if (t.life <= 0) { this.trail.splice(i, 1); continue; }
            let alpha = t.life / 8;
            c.fillStyle = `rgba(156, 163, 175, ${alpha * 0.6})`; 
            c.fillRect(t.x-1, t.y-1, 2, 2);
        }
        c.fillStyle = PALETTE.stone; c.fillRect(this.x-2, this.y-2, 4, 4); 
        c.fillStyle = '#fff'; c.fillRect(this.x-1, this.y-1, 2, 2);
    }
}
