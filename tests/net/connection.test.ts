import { describe, expect, it, vi } from 'vitest';
import {
  deserializeCommand,
  deserializeCommands,
  serializeCommand,
  serializeCommands,
} from '@/net/command-serializer';
import { generateRoomCode } from '@/net/connection';
import type { ReplayCommand } from '@/replay/recorder';

describe('generateRoomCode', () => {
  it('produces a 6-character string', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it('contains only allowed characters (no I/O/0/1)', () => {
    const allowed = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    for (let i = 0; i < 50; i++) {
      expect(generateRoomCode()).toMatch(allowed);
    }
  });

  it('generates unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) codes.add(generateRoomCode());
    // With 32^6 possibilities, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });

  it('uses crypto.getRandomValues when available', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    generateRoomCode();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('falls back to Math.random when getRandomValues is unavailable', () => {
    const original = globalThis.crypto.getRandomValues;
    // Temporarily remove getRandomValues to trigger fallback
    Object.defineProperty(globalThis.crypto, 'getRandomValues', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const mathSpy = vi.spyOn(Math, 'random');

    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(mathSpy).toHaveBeenCalled();

    mathSpy.mockRestore();
    Object.defineProperty(globalThis.crypto, 'getRandomValues', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});

describe('command-serializer', () => {
  it('round-trips a ReplayCommand', () => {
    const cmd: ReplayCommand = { frame: 42, type: 'move', data: { x: 10, y: 20 } };
    const serialized = serializeCommand(cmd);
    expect(serialized.type).toBe('move');
    expect(serialized.data).toEqual({ x: 10, y: 20 });

    const deserialized = deserializeCommand(serialized, 42);
    expect(deserialized).toEqual(cmd);
  });

  it('filters out invalid command types', () => {
    const bad = { type: 'hack', data: {} };
    expect(deserializeCommand(bad, 0)).toBeNull();
  });

  it('serializes multiple commands', () => {
    const cmds: ReplayCommand[] = [
      { frame: 1, type: 'select', data: { ids: [1] } },
      { frame: 1, type: 'move', data: { x: 5, y: 5 } },
    ];
    const serialized = serializeCommands(cmds);
    expect(serialized).toHaveLength(2);

    const deserialized = deserializeCommands(serialized, 1);
    expect(deserialized).toEqual(cmds);
  });

  it('preserves all valid command types', () => {
    const types = ['select', 'move', 'attack', 'build', 'train', 'stop', 'research', 'rally'];
    for (const t of types) {
      const cmd = { type: t, data: {} };
      expect(deserializeCommand(cmd, 0)).not.toBeNull();
    }
  });
});
