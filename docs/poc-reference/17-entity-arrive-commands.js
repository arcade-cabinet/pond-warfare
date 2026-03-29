/**
 * POC Reference: Entity.arrive() & Commands (pond_craft.html lines 1774-1807)
 *
 * Ported to: src/ecs/systems/movement.ts (arrive logic)
 *
 * arrive(): state transitions on reaching target
 *   Move → Idle, AttackMove → Idle, GatherMove → Gathering(60),
 *   BuildMove → Building(30), RepairMove → Repairing(40),
 *   ReturnMove → deposit resources + resume or idle,
 *   AttackApproach → Attacking
 *
 * Commands: cmdMove, cmdGather, cmdBuild, cmdAtk, cmdReturn,
 *   cmdRepair, cmdAttackMove. Each sets tPos, state, and target entity.
 */

    arrive() {
        this.yOff = 0;
        if (this.state === 'move') { this.state = 'idle'; this.tPos = null; }
        else if (this.state === 'atk_move') { this.state = 'idle'; this.tPos = null; this.attackMoveTarget = null; }
        else if (this.state === 'g_move') { this.state = 'gath'; this.gTimer = 60; }
        else if (this.state === 'b_move') { this.state = 'build'; this.gTimer = 30; }
        else if (this.state === 'rep_move') { this.state = 'repair'; this.gTimer = 40; }
        else if (this.state === 'r_move') {
            if (this.heldRes) {
                let color = this.heldRes === 'clams' ? '#fde047' : '#f97316';
                let txt = `+10 ${this.heldRes.charAt(0).toUpperCase() + this.heldRes.slice(1)}`;
                GAME.floatingTexts.push({x: this.x, y: this.y - 20, t: txt, c: color, life: 60});
                
                GAME.resources[this.heldRes] += 10; this.heldRes = null;
                if (this.tEnt && this.tEnt.resAmount>0) { this.tPos={x:this.tEnt.x,y:this.tEnt.y}; this.state='g_move'; }
                else { this.state='idle'; this.tPos = null; }
            } else { this.state='idle'; this.tPos = null; }
        }
        else if (this.state === 'a_move') this.state = 'atk';
    }

    cmdMove(x, y) { this.tPos={x,y}; this.state='move'; this.tEnt=null; this.attackMoveTarget=null; }
    cmdGather(ent) { this.tEnt=ent; this.tPos={x:ent.x, y:ent.y}; this.state='g_move'; }
    cmdBuild(ent) { this.tEnt=ent; this.tPos={x:ent.x, y:ent.y}; this.state='b_move'; }
    cmdAtk(ent) { this.tEnt=ent; this.tPos={x:ent.x, y:ent.y}; this.state='a_move'; }
    cmdReturn(ent) { this.rEnt=ent; this.tPos={x:ent.x, y:ent.y}; this.state='r_move'; }
    // NEW: Repair command
    cmdRepair(ent) { this.tEnt=ent; this.tPos={x:ent.x, y:ent.y}; this.state='rep_move'; }
    // NEW: Attack-move command
    cmdAttackMove(x, y) { this.tPos={x,y}; this.state='atk_move'; this.tEnt=null; }
    
    part(color) { 
        if (this.tEnt) GAME.particles.push({x:this.tEnt.x+(Math.random()-.5)*20, y:this.tEnt.y-10, vx:0, vy:1, life:10, c:color, s:2}); 
    }
