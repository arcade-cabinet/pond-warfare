/** Advisor Flow -- tip evaluation, dismiss, cooldown enforcement. */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  advisorSystem,
  currentAdvisorTip,
  dismissCurrentTip,
  resetAdvisorSession,
} from '@/advisors/advisor-system';
import { ADVISOR_EVAL_INTERVAL } from '@/config/advisor-config';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { spawnEntity } from '@/ecs/archetypes';
import { UnitStateMachine } from '@/ecs/components';
import { EntityKind, Faction, UnitState } from '@/types';

describe('Advisor flow', () => {
  let world: GameWorld;

  beforeEach(() => {
    resetAdvisorSession();
    world = createGameWorld();
    world.advisorState.enabled = { economy: true, war: true, builder: true };
  });

  it('advisor tip fires when conditions are met', () => {
    // Create idle gatherers to trigger the idle_gatherers tip
    const g1 = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    const g2 = spawnEntity(world, EntityKind.Gatherer, 120, 100, Faction.Player);
    UnitStateMachine.state[g1] = UnitState.Idle;
    UnitStateMachine.state[g2] = UnitState.Idle;

    // Advance to frame that satisfies condition (frameCount > 300)
    // and aligns with ADVISOR_EVAL_INTERVAL
    world.frameCount = ADVISOR_EVAL_INTERVAL * 6; // 360

    advisorSystem(world);

    expect(currentAdvisorTip.value).not.toBeNull();
    expect(currentAdvisorTip.value?.advisor).toBe('economy');
  });

  it('dismissing tip clears the toast', () => {
    const g = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[g] = UnitState.Idle;
    world.frameCount = ADVISOR_EVAL_INTERVAL * 6;

    advisorSystem(world);
    expect(currentAdvisorTip.value).not.toBeNull();

    dismissCurrentTip();
    expect(currentAdvisorTip.value).toBeNull();
  });

  it('cooldown prevents immediate re-showing of dismissed tip', () => {
    const g = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[g] = UnitState.Idle;
    world.frameCount = ADVISOR_EVAL_INTERVAL * 6;

    advisorSystem(world);
    const tipId = currentAdvisorTip.value?.id;
    expect(tipId).toBeTruthy();

    dismissCurrentTip();

    // Run again at the next eval interval -- should not re-show same tip
    world.frameCount += ADVISOR_EVAL_INTERVAL;
    advisorSystem(world);

    // Either null or a different tip (not the same one due to cooldown)
    if (currentAdvisorTip.value) {
      expect(currentAdvisorTip.value.id).not.toBe(tipId);
    }
  });

  it('no tip fires when all advisors are disabled', () => {
    world.advisorState.enabled = { economy: false, war: false, builder: false };

    const g = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[g] = UnitState.Idle;
    world.frameCount = ADVISOR_EVAL_INTERVAL * 6;

    advisorSystem(world);
    expect(currentAdvisorTip.value).toBeNull();
  });

  it('does not push new tip while one is already visible', () => {
    const g = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[g] = UnitState.Idle;
    world.frameCount = ADVISOR_EVAL_INTERVAL * 6;

    advisorSystem(world);
    const firstTip = currentAdvisorTip.value;
    expect(firstTip).not.toBeNull();

    // Advance to next eval but don't dismiss
    world.frameCount += ADVISOR_EVAL_INTERVAL;
    advisorSystem(world);

    // Same tip should still be showing
    expect(currentAdvisorTip.value).toBe(firstTip);
  });
});
