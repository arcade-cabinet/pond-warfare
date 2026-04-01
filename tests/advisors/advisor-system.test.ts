/**
 * Advisor System Tests
 *
 * Validates tip evaluation, cooldowns, dismissals, priority ordering,
 * oncePerGame semantics, and per-advisor enable toggles.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  advisorSystem,
  currentAdvisorTip,
  dismissCurrentTip,
  permanentlyDismissTip,
  resetAdvisorSession,
} from '@/advisors/advisor-system';
import type { AdvisorTip } from '@/advisors/types';
import { ADVISOR_EVAL_INTERVAL } from '@/config/advisor-config';
import { createGameWorld, type GameWorld } from '@/ecs/world';

// Mock the tips module so we can inject controlled tips
vi.mock('@/advisors/tips', () => ({ ADVISOR_TIPS: [] as AdvisorTip[] }));
// Mock persistence to avoid Capacitor calls
vi.mock('@/advisors/advisor-state', () => ({
  saveDismissedTips: vi.fn().mockResolvedValue(undefined),
}));

// Access the mutable mock so we can push tips per-test
import { ADVISOR_TIPS } from '@/advisors/tips';

function makeTip(overrides: Partial<AdvisorTip> = {}): AdvisorTip {
  return {
    id: 'test_tip',
    advisor: 'economy',
    message: 'Test tip',
    condition: () => true,
    cooldown: 600,
    priority: 50,
    ...overrides,
  };
}

function setTips(tips: AdvisorTip[]): void {
  (ADVISOR_TIPS as AdvisorTip[]).length = 0;
  for (const t of tips) (ADVISOR_TIPS as AdvisorTip[]).push(t);
}

describe('Advisor System', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    resetAdvisorSession();
    setTips([]);
  });

  it('fires tip when condition is met at eval interval', () => {
    setTips([makeTip({ id: 'fire_test' })]);
    world.frameCount = ADVISOR_EVAL_INTERVAL;

    advisorSystem(world);

    expect(currentAdvisorTip.value).not.toBeNull();
    expect(currentAdvisorTip.value?.id).toBe('fire_test');
  });

  it('does not fire between eval intervals', () => {
    setTips([makeTip()]);
    world.frameCount = ADVISOR_EVAL_INTERVAL + 1;

    advisorSystem(world);

    expect(currentAdvisorTip.value).toBeNull();
  });

  it('does not fire when condition returns false', () => {
    setTips([makeTip({ condition: () => false })]);
    world.frameCount = ADVISOR_EVAL_INTERVAL;

    advisorSystem(world);

    expect(currentAdvisorTip.value).toBeNull();
  });

  it('does not fire when advisor role is disabled', () => {
    setTips([makeTip({ advisor: 'war' })]);
    world.advisorState.enabled.war = false;
    world.frameCount = ADVISOR_EVAL_INTERVAL;

    advisorSystem(world);

    expect(currentAdvisorTip.value).toBeNull();
  });

  it('does not push new tip while one is displayed', () => {
    const tipA = makeTip({ id: 'a', priority: 50 });
    const tipB = makeTip({ id: 'b', priority: 100 });
    setTips([tipA, tipB]);

    world.frameCount = ADVISOR_EVAL_INTERVAL;
    advisorSystem(world);
    expect(currentAdvisorTip.value?.id).toBe('b');

    // Advance to next eval without dismissing
    world.frameCount = ADVISOR_EVAL_INTERVAL * 2;
    advisorSystem(world);
    // Still showing the first tip
    expect(currentAdvisorTip.value?.id).toBe('b');
  });

  it('respects cooldown after dismissal', () => {
    const tip = makeTip({ id: 'cooldown_test', cooldown: 600 });
    setTips([tip]);

    // Show the tip
    world.frameCount = ADVISOR_EVAL_INTERVAL;
    advisorSystem(world);
    expect(currentAdvisorTip.value).not.toBeNull();

    // Dismiss it
    dismissCurrentTip();
    expect(currentAdvisorTip.value).toBeNull();

    // Try again within cooldown
    world.frameCount = ADVISOR_EVAL_INTERVAL * 2;
    advisorSystem(world);
    expect(currentAdvisorTip.value).toBeNull();

    // After cooldown expires
    world.frameCount = ADVISOR_EVAL_INTERVAL + 600 + ADVISOR_EVAL_INTERVAL;
    // Align to interval
    world.frameCount =
      Math.ceil((ADVISOR_EVAL_INTERVAL + 600) / ADVISOR_EVAL_INTERVAL) * ADVISOR_EVAL_INTERVAL;
    advisorSystem(world);
    expect(currentAdvisorTip.value).not.toBeNull();
  });

  it('permanently dismissed tips never fire again', () => {
    setTips([makeTip({ id: 'perm_dismiss' })]);

    world.frameCount = ADVISOR_EVAL_INTERVAL;
    advisorSystem(world);
    expect(currentAdvisorTip.value).not.toBeNull();

    permanentlyDismissTip();
    expect(currentAdvisorTip.value).toBeNull();

    // Far in the future, past any cooldown
    world.frameCount = 999999;
    // Align to eval interval
    world.frameCount = Math.ceil(world.frameCount / ADVISOR_EVAL_INTERVAL) * ADVISOR_EVAL_INTERVAL;
    advisorSystem(world);
    expect(currentAdvisorTip.value).toBeNull();
  });

  it('oncePerGame tips only fire once per session', () => {
    setTips([makeTip({ id: 'once_test', oncePerGame: true, cooldown: 1 })]);

    // First time
    world.frameCount = ADVISOR_EVAL_INTERVAL;
    advisorSystem(world);
    expect(currentAdvisorTip.value).not.toBeNull();

    dismissCurrentTip();

    // Second time -- should not fire despite cooldown being very short
    world.frameCount = ADVISOR_EVAL_INTERVAL * 3;
    advisorSystem(world);
    expect(currentAdvisorTip.value).toBeNull();
  });

  it('higher priority tip wins over lower', () => {
    setTips([
      makeTip({ id: 'low', priority: 10 }),
      makeTip({ id: 'high', priority: 99 }),
      makeTip({ id: 'mid', priority: 50 }),
    ]);

    world.frameCount = ADVISOR_EVAL_INTERVAL;
    advisorSystem(world);

    expect(currentAdvisorTip.value?.id).toBe('high');
  });

  it('auto-dismisses after ADVISOR_TOAST_DURATION frames', () => {
    setTips([makeTip({ id: 'auto_dismiss' })]);

    world.frameCount = ADVISOR_EVAL_INTERVAL;
    advisorSystem(world);
    expect(currentAdvisorTip.value).not.toBeNull();

    // Advance past toast duration (900 frames at default)
    world.frameCount = ADVISOR_EVAL_INTERVAL + 901;
    advisorSystem(world);
    expect(currentAdvisorTip.value).toBeNull();
  });
});
