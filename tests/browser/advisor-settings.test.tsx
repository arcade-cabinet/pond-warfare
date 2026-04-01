/**
 * Browser Advisor Settings Tests
 *
 * Validates that toggling advisor roles on/off in settings correctly
 * controls whether the advisor system fires tips for that role.
 *
 * Runs in browser mode via vitest + Playwright.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  advisorSystem,
  currentAdvisorTip,
  resetAdvisorSession,
} from '@/advisors/advisor-system';
import { ADVISOR_EVAL_INTERVAL } from '@/config/advisor-config';
import { UnitStateMachine } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { spawnEntity } from '@/ecs/archetypes';
import { EntityKind, Faction, UnitState } from '@/types';

/** Create a world with idle gatherers so economy tips can fire. */
function worldWithIdleGatherers(): GameWorld {
  const world = createGameWorld();
  const g1 = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
  const g2 = spawnEntity(world, EntityKind.Gatherer, 120, 100, Faction.Player);
  UnitStateMachine.state[g1] = UnitState.Idle;
  UnitStateMachine.state[g2] = UnitState.Idle;
  // Frame > 300 so idle_gatherers tip condition passes
  world.frameCount = ADVISOR_EVAL_INTERVAL * 6;
  return world;
}

describe('Advisor settings toggles', () => {
  beforeEach(() => {
    resetAdvisorSession();
  });

  it('economy tips fire when economy advisor is enabled', () => {
    const world = worldWithIdleGatherers();
    world.advisorState.enabled = { economy: true, war: true, builder: true };

    advisorSystem(world);

    expect(currentAdvisorTip.value).not.toBeNull();
    expect(currentAdvisorTip.value?.advisor).toBe('economy');
  });

  it('economy tips are skipped when economy advisor is disabled', () => {
    const world = worldWithIdleGatherers();
    world.advisorState.enabled = { economy: false, war: true, builder: true };

    advisorSystem(world);

    // No economy tip should fire — only economy conditions are met
    const tip = currentAdvisorTip.value;
    if (tip) {
      expect(tip.advisor).not.toBe('economy');
    }
  });

  it('re-enabling economy advisor allows tips to fire again', () => {
    const world = worldWithIdleGatherers();

    // Disable economy — no economy tips
    world.advisorState.enabled = { economy: false, war: true, builder: true };
    advisorSystem(world);
    const tipWhileDisabled = currentAdvisorTip.value;
    if (tipWhileDisabled) {
      expect(tipWhileDisabled.advisor).not.toBe('economy');
    }

    // Re-enable economy — tip should now fire
    resetAdvisorSession();
    world.advisorState.enabled = { economy: true, war: true, builder: true };
    world.frameCount = ADVISOR_EVAL_INTERVAL * 7;
    advisorSystem(world);

    expect(currentAdvisorTip.value).not.toBeNull();
    expect(currentAdvisorTip.value?.advisor).toBe('economy');
  });

  it('disabling all advisors prevents any tips from firing', () => {
    const world = worldWithIdleGatherers();
    world.advisorState.enabled = { economy: false, war: false, builder: false };

    advisorSystem(world);

    expect(currentAdvisorTip.value).toBeNull();
  });
});
