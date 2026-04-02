/**
 * Systems Runner – executes the ECS system chain in order each frame.
 */

import { advisorSystem } from '@/advisors/advisor-system';
import { campaignSystem } from '@/campaign';
import { aiSystem } from '@/ecs/systems/ai';
import { autoBehaviorSystem } from '@/ecs/systems/auto-behavior';
import { autoBuildSystem } from '@/ecs/systems/auto-build';
import { autoRetreatSystem } from '@/ecs/systems/auto-retreat';
import { autoTrainSystem } from '@/ecs/systems/auto-train';
import { berserkerSystem } from '@/ecs/systems/berserker';
import { branchCosmeticsSystem } from '@/ecs/systems/branch-cosmetics';
import { buildingSystem } from '@/ecs/systems/building';
import { cleanupSystem } from '@/ecs/systems/cleanup';
import { collisionSystem } from '@/ecs/systems/collision';
import { combatSystem } from '@/ecs/systems/combat';
import { commanderPassivesSystem } from '@/ecs/systems/commander-passives';
import { dayNightSystem } from '@/ecs/systems/day-night';
import { diverStealthSystem } from '@/ecs/systems/diver-stealth';
import { engineerSystem } from '@/ecs/systems/engineer';
import { evolutionSystem } from '@/ecs/systems/evolution';
import { fogOfWarSystem } from '@/ecs/systems/fog-of-war';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { healthSystem } from '@/ecs/systems/health';
import { moraleSystem } from '@/ecs/systems/morale';
import { movementSystem } from '@/ecs/systems/movement';
import { projectileSystem } from '@/ecs/systems/projectile';
import { randomEventsSystem } from '@/ecs/systems/random-events';
import { shamanHealSystem } from '@/ecs/systems/shaman-heal';
import { trainingSystem } from '@/ecs/systems/training';
import { veterancySystem } from '@/ecs/systems/veterancy';
import { wallGateSystem } from '@/ecs/systems/wall-gate';
import { weatherSystem } from '@/ecs/systems/weather';
import type { GameWorld } from '@/ecs/world';
import type { PhysicsManager } from '@/physics/physics-world';

/** Run all ECS systems in the correct order for one logic frame. */
export function runSystems(
  world: GameWorld,
  physicsManager: PhysicsManager,
  throttleAI: boolean,
): void {
  weatherSystem(world);
  dayNightSystem(world);
  diverStealthSystem(world);
  movementSystem(world);
  collisionSystem(world, physicsManager);
  gatheringSystem(world);
  buildingSystem(world);
  engineerSystem(world);
  combatSystem(world);
  commanderPassivesSystem(world);
  berserkerSystem(world);
  projectileSystem(world);
  trainingSystem(world);
  if (!throttleAI) aiSystem(world);
  evolutionSystem(world);
  if (!throttleAI) autoBuildSystem(world);
  autoTrainSystem(world);
  autoBehaviorSystem(world);
  healthSystem(world);
  moraleSystem(world);
  autoRetreatSystem(world);
  shamanHealSystem(world);
  wallGateSystem(world);
  advisorSystem(world);
  campaignSystem(world);
  veterancySystem(world);
  fogOfWarSystem(world);
  branchCosmeticsSystem(world);
  randomEventsSystem(world);
  cleanupSystem(world);
}
