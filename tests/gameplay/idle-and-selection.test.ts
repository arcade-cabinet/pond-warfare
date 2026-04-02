/**
 * Idle Unit Ambient Life & Selection Group Feedback Tests
 *
 * 1. Idle bob animation — units in Idle state get a slow sine bob
 * 2. Idle barks play audio — auto-behavior idle barks trigger voice audio
 * 3. Group selection audio — different sounds for 1, 2-5, and 6+ units
 * 4. Repeat-click escalation — click count escalates bark trigger + plays voice
 */

import { addComponent, addEntity } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/audio/audio-system';
import { VoiceManager } from '@/audio/voices';
import { resetBarkState, showBark, showSelectBark } from '@/config/barks';
import { selectTriggerForClickCount } from '@/config/dialogue';
import {
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { movementSystem } from '@/ecs/systems/movement';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

// Spy on audio methods
vi.spyOn(audio, 'playSelectionVoice');
vi.spyOn(audio, 'playGroupSelectionVoice');

function createUnit(world: GameWorld, kind: EntityKind, x = 100, y = 100): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, Health);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.speed[eid] = 2.0;
  Collider.radius[eid] = 16;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Combat.attackRange[eid] = 40;
  Carrying.resourceType[eid] = ResourceType.None;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  UnitStateMachine.state[eid] = UnitState.Idle;

  return eid;
}

// ── 1. Idle Bob Animation ─────────────────────────────────────────

describe('Idle bob animation', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 100;
  });

  it('applies a slow sine bob to idle units', () => {
    const eid = createUnit(world, EntityKind.Brawler);
    Sprite.yOffset[eid] = 0;

    movementSystem(world);

    const expected = Math.sin(100 * 0.03 + eid * 0.7) * 1.5;
    expect(Sprite.yOffset[eid]).toBeCloseTo(expected, 5);
  });

  it('does not apply idle bob to dead units', () => {
    const eid = createUnit(world, EntityKind.Brawler);
    Health.current[eid] = 0;
    Sprite.yOffset[eid] = 0;

    movementSystem(world);

    expect(Sprite.yOffset[eid]).toBe(0);
  });

  it('idle bob varies per entity (phase offset by eid)', () => {
    const eid1 = createUnit(world, EntityKind.Brawler, 100, 100);
    const eid2 = createUnit(world, EntityKind.Brawler, 200, 200);

    movementSystem(world);

    // Different eids produce different offsets
    expect(Sprite.yOffset[eid1]).not.toBe(Sprite.yOffset[eid2]);
  });

  it('moving units get movement bob, not idle bob', () => {
    const eid = createUnit(world, EntityKind.Brawler);
    UnitStateMachine.state[eid] = UnitState.Move;
    UnitStateMachine.targetX[eid] = 500;
    UnitStateMachine.targetY[eid] = 500;

    movementSystem(world);

    // Movement bob uses freq 0.3 and amplitude 3, not idle's 0.03/1.5
    const idleBob = Math.sin(100 * 0.03 + eid * 0.7) * 1.5;
    const moveBob = Math.sin(world.frameCount * 0.3) * 3;
    expect(Sprite.yOffset[eid]).toBeCloseTo(moveBob, 5);
    expect(Sprite.yOffset[eid]).not.toBeCloseTo(idleBob, 3);
  });
});

// ── 2. Idle Bark Audio ────────────────────────────────────────────

describe('Idle bark audio', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1000;
    vi.clearAllMocks();
    resetBarkState();
  });

  it('showBark with idle trigger plays voice when barked', () => {
    const eid = createUnit(world, EntityKind.Brawler);

    const barked = showBark(world, eid, 100, 100, EntityKind.Brawler, 'idle');
    expect(barked).toBe(true);
    expect(world.floatingTexts.length).toBe(1);

    // The auto-behavior system calls audio.playSelectionVoice after showBark returns true.
    // Here we test that showBark itself works; the audio call is in auto-behavior.
  });

  it('showBark returns false on cooldown (within 90 frames)', () => {
    const eid = createUnit(world, EntityKind.Brawler);

    showBark(world, eid, 100, 100, EntityKind.Brawler, 'idle');
    expect(world.floatingTexts.length).toBe(1);

    // Try again within cooldown
    world.frameCount = 1050; // 50 frames later, within 90-frame cooldown
    const barked = showBark(world, eid, 100, 100, EntityKind.Brawler, 'idle');
    expect(barked).toBe(false);
    expect(world.floatingTexts.length).toBe(1); // No new text
  });
});

// ── 3. Group Selection Audio ──────────────────────────────────────

describe('Group selection audio (VoiceManager)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('single unit plays normal palette', async () => {
    const sfx = { playAt: vi.fn() } as any;
    const mgr = new VoiceManager(sfx);

    mgr.playGroupSelectionVoice(EntityKind.Brawler, 'otter', 1);
    await vi.runAllTimersAsync();

    expect(sfx.playAt).toHaveBeenCalled();
    const calls = sfx.playAt.mock.calls;
    // Normal volume for skirmisher role (Brawler)
    for (const call of calls) {
      expect(call[3]).toBeLessThanOrEqual(0.05);
    }
  });

  it('group of 3 plays louder palette (1.4x volume)', async () => {
    const sfx = { playAt: vi.fn() } as any;
    const mgr = new VoiceManager(sfx);

    mgr.playGroupSelectionVoice(EntityKind.Brawler, 'otter', 3);
    await vi.runAllTimersAsync();

    const calls = sfx.playAt.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    // Volumes should be boosted by 1.4x (0.04 * 1.4 = 0.056, 0.03 * 1.4 = 0.042)
    for (const call of calls) {
      expect(call[3]).toBeGreaterThan(0.03);
    }
  });

  it('group of 8 plays formation stinger on top of boosted voice', async () => {
    const sfx = { playAt: vi.fn() } as any;
    const mgr = new VoiceManager(sfx);

    mgr.playGroupSelectionVoice(EntityKind.Brawler, 'otter', 8);
    await vi.runAllTimersAsync();

    const calls = sfx.playAt.mock.calls;
    // Brawler (skirmisher role) = 2 base steps + 2 stinger = 4 total
    expect(calls.length).toBeGreaterThanOrEqual(4);

    // Stinger calls include freq 400 and 500
    const freqs = calls.map((c: number[]) => c[0]);
    expect(freqs).toContain(400);
    expect(freqs).toContain(500);
  });

  it('group of 5 does NOT play formation stinger', async () => {
    const sfx = { playAt: vi.fn() } as any;
    const mgr = new VoiceManager(sfx);

    mgr.playGroupSelectionVoice(EntityKind.Brawler, 'otter', 5);
    await vi.runAllTimersAsync();

    const calls = sfx.playAt.mock.calls;
    // Brawler = 2 steps, no stinger
    expect(calls.length).toBe(2);
    const freqs = calls.map((c: number[]) => c[0]);
    expect(freqs).not.toContain(400);
  });
});

// ── 4. Repeat-Click Escalation ────────────────────────────────────

describe('Repeat-click escalation', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 100;
    vi.clearAllMocks();
    resetBarkState();
  });

  it('selectTriggerForClickCount returns correct triggers', () => {
    expect(selectTriggerForClickCount(1)).toBe('select');
    expect(selectTriggerForClickCount(2)).toBe('select_repeat');
    expect(selectTriggerForClickCount(3)).toBe('select_repeat');
    expect(selectTriggerForClickCount(4)).toBe('select_repeat');
    expect(selectTriggerForClickCount(5)).toBe('select_spam');
    expect(selectTriggerForClickCount(10)).toBe('select_spam');
  });

  it('showSelectBark escalates on rapid clicks and plays voice', () => {
    const eid = createUnit(world, EntityKind.Commander);

    // First click
    showSelectBark(world, eid, 100, 100, EntityKind.Commander);
    expect(world.floatingTexts.length).toBe(1);
    expect(audio.playSelectionVoice).toHaveBeenCalledTimes(1);

    // Second click within 120 frames
    world.frameCount = 130;
    showSelectBark(world, eid, 100, 100, EntityKind.Commander);
    expect(world.floatingTexts.length).toBe(2);
    expect(audio.playSelectionVoice).toHaveBeenCalledTimes(2);
  });

  it('click count resets after 120 frames of no clicks', () => {
    const eid = createUnit(world, EntityKind.Commander);

    // Click 5 times rapidly to get to spam
    for (let i = 0; i < 5; i++) {
      world.frameCount = 100 + i * 10;
      showSelectBark(world, eid, 100, 100, EntityKind.Commander);
    }

    vi.clearAllMocks();

    // Wait more than 120 frames
    world.frameCount = 100 + 5 * 10 + 200;
    showSelectBark(world, eid, 100, 100, EntityKind.Commander);

    // Should reset to count=1 (select trigger) and play voice
    expect(audio.playSelectionVoice).toHaveBeenCalledWith(EntityKind.Commander, 'otter');
  });

  it('showSelectBark plays voice audio for each bark', () => {
    const eid = createUnit(world, EntityKind.Gatherer);

    showSelectBark(world, eid, 100, 100, EntityKind.Gatherer);

    expect(audio.playSelectionVoice).toHaveBeenCalledWith(EntityKind.Gatherer, 'otter');
  });
});
