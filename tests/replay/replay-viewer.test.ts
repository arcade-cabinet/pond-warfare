import { describe, expect, it } from 'vitest';
import type { ReplayData } from '@/replay/recorder';
import {
  createReplayViewerState,
  cycleReplaySpeed,
  formatReplayTime,
  getReplayProgress,
  REPLAY_SPEEDS,
  setReplaySpeed,
  skipToFrame,
  tickReplay,
  toggleReplayPause,
} from '@/replay/replay-viewer';

function createTestReplay(): ReplayData {
  return {
    version: 1,
    seed: 42,
    startedAt: '2026-01-01T00:00:00Z',
    commands: [
      { frame: 10, type: 'select', data: { ids: [1] } },
      { frame: 20, type: 'move', data: { x: 100, y: 200 } },
      { frame: 50, type: 'attack', data: { target: 2 } },
      { frame: 100, type: 'build', data: { kind: 'armory', x: 300, y: 300 } },
    ],
  };
}

describe('createReplayViewerState', () => {
  it('initializes with default values', () => {
    const state = createReplayViewerState(createTestReplay());
    expect(state.currentFrame).toBe(0);
    expect(state.paused).toBe(false);
    expect(state.speed).toBe(1);
    expect(state.commandIndex).toBe(0);
    expect(state.finished).toBe(false);
    // Total frames = last command frame + 600
    expect(state.totalFrames).toBe(700);
  });
});

describe('toggleReplayPause', () => {
  it('toggles pause state', () => {
    const state = createReplayViewerState(createTestReplay());
    expect(state.paused).toBe(false);
    toggleReplayPause(state);
    expect(state.paused).toBe(true);
    toggleReplayPause(state);
    expect(state.paused).toBe(false);
  });
});

describe('cycleReplaySpeed', () => {
  it('cycles through all speeds', () => {
    const state = createReplayViewerState(createTestReplay());
    expect(state.speed).toBe(1);
    cycleReplaySpeed(state);
    expect(state.speed).toBe(2);
    cycleReplaySpeed(state);
    expect(state.speed).toBe(4);
    cycleReplaySpeed(state);
    expect(state.speed).toBe(8);
    cycleReplaySpeed(state);
    expect(state.speed).toBe(1); // Wraps around
  });
});

describe('setReplaySpeed', () => {
  it('sets speed directly', () => {
    const state = createReplayViewerState(createTestReplay());
    setReplaySpeed(state, 4);
    expect(state.speed).toBe(4);
  });
});

describe('skipToFrame', () => {
  it('skips to a specific frame', () => {
    const state = createReplayViewerState(createTestReplay());
    skipToFrame(state, 50);
    expect(state.currentFrame).toBe(50);
    // Command index should be at the command with frame 50
    expect(state.commandIndex).toBe(2); // Commands 0, 1 are before frame 50
  });

  it('clamps to valid range', () => {
    const state = createReplayViewerState(createTestReplay());
    skipToFrame(state, -100);
    expect(state.currentFrame).toBe(0);

    skipToFrame(state, 999999);
    expect(state.currentFrame).toBe(state.totalFrames);
    expect(state.finished).toBe(true);
  });
});

describe('tickReplay', () => {
  it('returns empty when paused', () => {
    const state = createReplayViewerState(createTestReplay());
    state.paused = true;
    const cmds = tickReplay(state);
    expect(cmds).toHaveLength(0);
    expect(state.currentFrame).toBe(0);
  });

  it('returns commands at correct frames', () => {
    const state = createReplayViewerState(createTestReplay());

    // Tick to frame 10
    for (let i = 0; i < 10; i++) tickReplay(state);
    expect(state.currentFrame).toBe(10);

    // The command at frame 10 should have been returned
    // Let's verify by ticking exactly to frame 10
    const state2 = createReplayViewerState(createTestReplay());
    let foundSelect = false;
    for (let i = 0; i < 10; i++) {
      const cmds = tickReplay(state2);
      if (cmds.some((c) => c.type === 'select')) foundSelect = true;
    }
    expect(foundSelect).toBe(true);
  });

  it('advances multiple frames at higher speed', () => {
    const state = createReplayViewerState(createTestReplay());
    setReplaySpeed(state, 4);
    tickReplay(state);
    expect(state.currentFrame).toBe(4); // 4 frames per tick at 4x
  });

  it('marks finished when reaching end', () => {
    const state = createReplayViewerState(createTestReplay());
    skipToFrame(state, state.totalFrames - 1);
    state.finished = false;
    tickReplay(state);
    expect(state.finished).toBe(true);
  });
});

describe('getReplayProgress', () => {
  it('returns 0 at start', () => {
    const state = createReplayViewerState(createTestReplay());
    expect(getReplayProgress(state)).toBe(0);
  });

  it('returns 1 at end', () => {
    const state = createReplayViewerState(createTestReplay());
    state.currentFrame = state.totalFrames;
    expect(getReplayProgress(state)).toBe(1);
  });
});

describe('formatReplayTime', () => {
  it('formats zero as 00:00', () => {
    expect(formatReplayTime(0)).toBe('00:00');
  });

  it('formats 60 frames as 00:01', () => {
    expect(formatReplayTime(60)).toBe('00:01');
  });

  it('formats 3600 frames as 01:00', () => {
    expect(formatReplayTime(3600)).toBe('01:00');
  });

  it('formats 7260 frames as 02:01', () => {
    expect(formatReplayTime(7260)).toBe('02:01');
  });
});

describe('REPLAY_SPEEDS', () => {
  it('has 4 speed options', () => {
    expect(REPLAY_SPEEDS).toEqual([1, 2, 4, 8]);
  });
});
