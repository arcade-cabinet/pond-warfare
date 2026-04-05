import { describe, expect, it } from 'vitest';
import { createGameWorld } from '@/ecs/world';
import { computeChecksum } from '@/net/checksum';
import { LockstepSync } from '@/net/lockstep';

describe('LockstepSync', () => {
  it('is not frame-ready without both inputs', () => {
    const sync = new LockstepSync('host', 3);
    expect(sync.isFrameReady()).toBe(false);
  });

  it('becomes frame-ready when both local and remote inputs arrive', () => {
    const sync = new LockstepSync('host', 0);
    sync.queueLocal([]);
    sync.receiveRemote(0, []);
    expect(sync.isFrameReady()).toBe(true);
  });

  it('returns commands in deterministic order: host first, guest second', () => {
    const sync = new LockstepSync('host', 0);
    const hostCmd = [{ type: 'move', data: { x: 10 } }];
    const guestCmd = [{ type: 'attack', data: { target: 5 } }];

    sync.queueLocal(hostCmd);
    sync.receiveRemote(0, guestCmd);

    const cmds = sync.getFrameCommands();
    expect(cmds).not.toBeNull();
    expect(cmds?.host).toEqual(hostCmd);
    expect(cmds?.guest).toEqual(guestCmd);
  });

  it('swaps host/guest when playerId is guest', () => {
    const sync = new LockstepSync('guest', 0);
    const localCmd = [{ type: 'move', data: { x: 10 } }];
    const remoteCmd = [{ type: 'build', data: { kind: 'lodge' } }];

    sync.queueLocal(localCmd);
    sync.receiveRemote(0, remoteCmd);

    const cmds = sync.getFrameCommands();
    expect(cmds).not.toBeNull();
    // Remote is host, local is guest
    expect(cmds?.host).toEqual(remoteCmd);
    expect(cmds?.guest).toEqual(localCmd);
  });

  it('buffers commands with input delay', () => {
    const sync = new LockstepSync('host', 3);
    const cmd = [{ type: 'move', data: { x: 1 } }];
    sync.queueLocal(cmd);

    // Frame 0 is not ready — local commands went to frame 3
    expect(sync.isFrameReady()).toBe(false);

    // Provide remote for frame 0 — still not ready (no local for frame 0)
    sync.receiveRemote(0, []);
    expect(sync.isFrameReady()).toBe(false);
  });

  it('advances frame counter after execution', () => {
    const sync = new LockstepSync('host', 0);
    expect(sync.frame).toBe(0);

    sync.queueLocal([]);
    sync.receiveRemote(0, []);
    expect(sync.isFrameReady()).toBe(true);

    sync.advance();
    expect(sync.frame).toBe(1);
    expect(sync.isFrameReady()).toBe(false);
  });

  it('returns null from getFrameCommands when not ready', () => {
    const sync = new LockstepSync('host', 0);
    expect(sync.getFrameCommands()).toBeNull();
  });

  it('fillEmptyFrame sends empty commands for the target frame', () => {
    const sync = new LockstepSync('host', 2);
    sync.fillEmptyFrame();
    // Empty commands queued at frame 0 + 2 = frame 2
    sync.receiveRemote(2, []);
    // Advance to frame 2
    sync.receiveRemote(0, []);
    // Frame 0: no local — fillEmptyFrame only queues at currentFrame + inputDelay
    expect(sync.isFrameReady()).toBe(false);
  });

  it('reset clears all state', () => {
    const sync = new LockstepSync('host', 0);
    sync.queueLocal([]);
    sync.receiveRemote(0, []);
    sync.advance();
    expect(sync.frame).toBe(1);

    sync.reset();
    expect(sync.frame).toBe(0);
    expect(sync.isFrameReady()).toBe(false);
  });

  it('purgeStale removes old buffer entries', () => {
    const sync = new LockstepSync('host', 0);
    sync.queueLocal([]);
    sync.receiveRemote(0, []);
    sync.advance();
    // Frame 0 entries should be gone after advance, purge removes any stragglers
    sync.purgeStale();
    expect(sync.remoteBufferSize).toBe(0);
  });
});

describe('computeChecksum', () => {
  it('produces consistent hashes for same state', () => {
    const world = createGameWorld();
    world.frameCount = 100;
    world.resources.fish = 50;
    world.resources.logs = 30;
    world.enemyResources.fish = 20;
    world.enemyResources.logs = 10;

    const hash1 = computeChecksum(world);
    const hash2 = computeChecksum(world);
    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('number');
    expect(hash1).toBeGreaterThan(0);
  });

  it('produces different hashes for different state', () => {
    const world1 = createGameWorld();
    world1.frameCount = 100;
    world1.resources.fish = 50;

    const world2 = createGameWorld();
    world2.frameCount = 100;
    world2.resources.fish = 51;

    expect(computeChecksum(world1)).not.toBe(computeChecksum(world2));
  });
});
