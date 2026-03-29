/**
 * Cleanup System
 *
 * Ported from updateLogic() lines 1188-1192 (particle/text/corpse/ping decay) and
 * Entity.update() lines 1579-1584 (building ambient particles) of the original HTML game.
 *
 * Responsibilities:
 * - Decay and remove expired particles (life--, apply velocity, remove when life <= 0)
 * - Decay and remove expired floating texts (life--, move upward, remove when life <= 0)
 * - Decay and remove expired corpses (life--, remove when life <= 0)
 * - Decay and remove expired minimap pings (life--, remove when life <= 0)
 * - Decay and remove expired ground pings (life--, remove when life <= 0)
 * - Building ambient particles: armory smoke (every 5 frames), lodge water bubbles (every 30 frames)
 */

import { query, hasComponent } from 'bitecs';
import type { GameWorld } from '@/ecs/world';
import {
  Position,
  Health,
  EntityTypeTag,
  IsBuilding,
  Building,
  FactionTag,
} from '@/ecs/components';
import { EntityKind } from '@/types';


export function cleanupSystem(world: GameWorld): void {
  // --- Building ambient particles (lines 1579-1584) ---
  // Only for completed buildings
  const buildings = query(world.ecs, [Position, Health, IsBuilding, EntityTypeTag, Building]);
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (Health.current[eid] <= 0) continue;
    if (Building.progress[eid] < 100) continue;

    const kind = EntityTypeTag.kind[eid] as EntityKind;

    // Armory smoke (original: if (this.type === 'armory' && GAME.frameCount % 5 === 0))
    if (kind === EntityKind.Armory && world.frameCount % 5 === 0) {
      world.particles.push({
        x: Position.x[eid] + 8,
        y: Position.y[eid] - 12,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 0.5,
        life: 60,
        color: 'rgba(156, 163, 175, 0.4)',
        size: Math.random() * 3 + 2,
      });
    }

    // Lodge water bubbles (original: if (this.type === 'lodge' && GAME.frameCount % 30 === 0))
    if (kind === EntityKind.Lodge && world.frameCount % 30 === 0) {
      world.particles.push({
        x: Position.x[eid] + (Math.random() - 0.5) * 20,
        y: Position.y[eid] + 10 + Math.random() * 10,
        vx: 0,
        vy: -0.2,
        life: 30,
        color: 'rgba(56, 189, 248, 0.5)',
        size: 2,
      });
    }
  }

  // --- Particle decay (line 1188) ---
  // Original: for (let i = this.particles.length - 1; i >= 0; i--) { let p = this.particles[i]; p.life--; p.y -= p.vy; p.x += p.vx; if (p.life <= 0) this.particles.splice(i, 1); }
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const p = world.particles[i];
    p.life--;
    // Original uses p.y -= p.vy (subtracts vy from y, so positive vy moves up)
    p.y -= p.vy;
    p.x += p.vx;
    if (p.life <= 0) {
      world.particles.splice(i, 1);
    }
  }

  // --- Floating text decay (line 1189) ---
  // Original: for (let i = this.floatingTexts.length - 1; i >= 0; i--) { let f = this.floatingTexts[i]; f.life--; f.y -= 0.5; if (f.life <= 0) this.floatingTexts.splice(i, 1); }
  for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
    const f = world.floatingTexts[i];
    f.life--;
    f.y -= 0.5;
    if (f.life <= 0) {
      world.floatingTexts.splice(i, 1);
    }
  }

  // --- Minimap ping decay (line 1190) ---
  // Original: for (let i = this.minimapPings.length - 1; i >= 0; i--) { this.minimapPings[i].life--; if (this.minimapPings[i].life <= 0) this.minimapPings.splice(i, 1); }
  for (let i = world.minimapPings.length - 1; i >= 0; i--) {
    world.minimapPings[i].life--;
    if (world.minimapPings[i].life <= 0) {
      world.minimapPings.splice(i, 1);
    }
  }

  // --- Ground ping decay (line 1191) ---
  // Original: for (let i = this.groundPings.length - 1; i >= 0; i--) { this.groundPings[i].life--; if (this.groundPings[i].life <= 0) this.groundPings.splice(i, 1); }
  for (let i = world.groundPings.length - 1; i >= 0; i--) {
    world.groundPings[i].life--;
    if (world.groundPings[i].life <= 0) {
      world.groundPings.splice(i, 1);
    }
  }

  // --- Corpse decay (line 1192) ---
  // Original: for (let i = this.corpses.length - 1; i >= 0; i--) { this.corpses[i].life--; if (this.corpses[i].life <= 0) this.corpses.splice(i, 1); }
  for (let i = world.corpses.length - 1; i >= 0; i--) {
    world.corpses[i].life--;
    if (world.corpses[i].life <= 0) {
      world.corpses.splice(i, 1);
    }
  }
}
