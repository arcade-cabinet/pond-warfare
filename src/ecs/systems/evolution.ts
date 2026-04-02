/**
 * Evolution System
 *
 * Orchestrator that delegates to focused sub-modules:
 * - Tier-up evolution checks
 * - Poison tick processing
 * - Alpha Predator damage aura
 * - Threat escalation (mega-waves, random events)
 */

import { audio } from '@/audio/audio-system';
import { entityKindName } from '@/config/entity-defs';
import type { GameWorld } from '@/ecs/world';
import { EntityKind } from '@/types';
import { processAlphaAura } from './evolution/alpha-aura';
import { heronSpawnerSystem } from './evolution/heron-spawner';
import { processPoisonTicks, processVenomCoatingTicks } from './evolution/poison';
import { threatEscalationSystem } from './evolution/threat-escalation';
import { wormSpawnerSystem } from './evolution/worm-spawner';

/** Minutes after peace ends at which each evolution tier triggers. */
const THRESHOLDS = [5, 10, 15, 25, 40];

/** Order in which enemy unit types unlock, one per tier. */
const EVOLUTION_ORDER: EntityKind[] = [
  EntityKind.ArmoredGator,
  EntityKind.VenomSnake,
  EntityKind.SwampDrake,
  EntityKind.SiegeTurtle,
  EntityKind.AlphaPredator,
];

/**
 * Checks for tier-up evolution, processes poison ticks, applies alpha aura,
 * and runs threat escalation. Called once per logic frame.
 */
export function evolutionSystem(world: GameWorld): void {
  // Evolution tier-up check (every 600 frames, 10 seconds)
  if (world.frameCount % 600 === 0 && world.frameCount >= world.peaceTimer) {
    const evo = world.enemyEvolution;
    const gameMinutes = (world.frameCount - world.peaceTimer) / 3600;
    const scaledThreshold = THRESHOLDS[evo.tier] * world.evolutionSpeedMod;

    if (evo.tier < THRESHOLDS.length && gameMinutes >= scaledThreshold) {
      const newUnit = EVOLUTION_ORDER[evo.tier];
      evo.tier++;
      evo.lastEvolutionFrame = world.frameCount;
      evo.unlockedUnits.push(newUnit);

      const name = entityKindName(newUnit);
      world.floatingTexts.push({
        x: world.camX + world.viewWidth / 2,
        y: world.camY + 60,
        text: `WARNING: ${name} spotted!`,
        color: '#ef4444',
        life: 180,
      });
      world.shakeTimer = Math.max(world.shakeTimer, 10);
      audio.alert();
    }
  }

  // Poison and aura (every 60 frames)
  if (world.frameCount % 60 === 0) {
    processPoisonTicks(world);
    processVenomCoatingTicks(world);
    processAlphaAura(world);
  }

  // Threat escalation (long-game systems)
  threatEscalationSystem(world);

  // v1.5 spawners: Burrowing Worms and Flying Herons
  wormSpawnerSystem(world);
  heronSpawnerSystem(world);
}
