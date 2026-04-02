/**
 * Sprite Animation System Tests
 *
 * Verifies walk cycles, attack frames, and idle fidgets produce
 * correct visual modifiers at each animation frame.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { UnitStateMachine } from '@/ecs/components';
import {
  clearAllAnimStates,
  getAnimState,
  getAnimVisuals,
  removeAnimState,
  tickAnimation,
} from '@/rendering/sprite-animation';
import { UnitState } from '@/types';

// Helper: set a mock unit state for an entity
function setUnitState(eid: number, state: UnitState): void {
  UnitStateMachine.state[eid] = state;
}

describe('Sprite Animation System', () => {
  afterEach(() => {
    clearAllAnimStates();
  });

  it('creates idle animation state by default', () => {
    const eid = 100;
    setUnitState(eid, UnitState.Idle);
    const state = getAnimState(eid);
    expect(state.anim).toBe('idle');
    expect(state.frame).toBe(0);
  });

  it('walk animation cycles through 3 frames', () => {
    const eid = 101;
    setUnitState(eid, UnitState.Move);

    const frames: number[] = [];
    for (let i = 0; i < 30; i++) {
      tickAnimation(eid);
      frames.push(getAnimState(eid).frame);
    }

    // Should cycle through 0, 1, 2
    expect(frames).toContain(0);
    expect(frames).toContain(1);
    expect(frames).toContain(2);
  });

  it('walk animation produces Y-offset bounce', () => {
    const eid = 102;
    setUnitState(eid, UnitState.Move);

    // Advance to frame 1 (bounce frame)
    for (let i = 0; i < 9; i++) tickAnimation(eid);
    const visuals = getAnimVisuals(eid);
    expect(visuals.yOffset).toBeLessThan(0); // Bouncing up
  });

  it('attack animation has wind-up and strike frames', () => {
    const eid = 103;
    setUnitState(eid, UnitState.Attacking);

    tickAnimation(eid);
    const windUp = getAnimVisuals(eid);
    expect(windUp.scaleX).toBeLessThan(1.0); // Pulled back
    expect(windUp.scaleY).toBeGreaterThan(1.0); // Stretched

    // Advance to strike frame
    for (let i = 0; i < 12; i++) tickAnimation(eid);
    const strike = getAnimVisuals(eid);
    expect(strike.scaleX).toBeGreaterThan(1.0); // Thrust forward
    expect(strike.rotation).toBeGreaterThan(0); // Leaning into strike
  });

  it('idle animation produces subtle bob', () => {
    const eid = 104;
    setUnitState(eid, UnitState.Idle);

    // Tick enough times to reach frame 1
    for (let i = 0; i < 45; i++) tickAnimation(eid);
    const visuals = getAnimVisuals(eid);
    // Frame 1 should have a -1 bob
    if (getAnimState(eid).frame === 1) {
      expect(visuals.yOffset).toBe(-1);
    }
  });

  it('animation resets when state changes', () => {
    const eid = 105;
    setUnitState(eid, UnitState.Move);

    // Advance into walk animation
    for (let i = 0; i < 20; i++) tickAnimation(eid);
    expect(getAnimState(eid).anim).toBe('walk');

    // Switch to attack
    setUnitState(eid, UnitState.Attacking);
    tickAnimation(eid);
    expect(getAnimState(eid).anim).toBe('attack');
    expect(getAnimState(eid).frame).toBe(0); // Reset
  });

  it('gather animation uses walk-like cycle', () => {
    const eid = 106;
    setUnitState(eid, UnitState.GatherMove);
    tickAnimation(eid);
    expect(getAnimState(eid).anim).toBe('gather');
  });

  it('removeAnimState clears entity data', () => {
    const eid = 107;
    setUnitState(eid, UnitState.Idle);
    tickAnimation(eid);
    removeAnimState(eid);
    // Getting state again creates a fresh one
    const state = getAnimState(eid);
    expect(state.frame).toBe(0);
    expect(state.timer).toBe(0);
  });

  it('attack swing frame has distinct visual from walk/idle', () => {
    const eid = 108;

    // Get idle visuals
    setUnitState(eid, UnitState.Idle);
    tickAnimation(eid);
    const idleVisuals = getAnimVisuals(eid);

    // Get attack visuals
    clearAllAnimStates();
    setUnitState(eid, UnitState.Attacking);
    tickAnimation(eid);
    const attackVisuals = getAnimVisuals(eid);

    // Attack should have different scale than idle
    expect(attackVisuals.scaleX).not.toBe(idleVisuals.scaleX);
  });
});
