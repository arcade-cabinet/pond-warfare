/**
 * Network Types Tests
 *
 * Validates that new types (MatchMode, TouchCommand) are correctly typed
 * and adversarial messages are included in NetMessage union.
 */

import { describe, expect, it } from 'vitest';
import type { MatchMode, NetMessage, TouchCommand, TouchCommandType } from '@/net/types';

describe('net/types', () => {
  describe('MatchMode', () => {
    it('accepts coop', () => {
      const mode: MatchMode = 'coop';
      expect(mode).toBe('coop');
    });

    it('accepts adversarial', () => {
      const mode: MatchMode = 'adversarial';
      expect(mode).toBe('adversarial');
    });
  });

  describe('TouchCommandType', () => {
    it('accepts tap-position', () => {
      const t: TouchCommandType = 'tap-position';
      expect(t).toBe('tap-position');
    });

    it('accepts tap-entity', () => {
      const t: TouchCommandType = 'tap-entity';
      expect(t).toBe('tap-entity');
    });

    it('accepts radial-select', () => {
      const t: TouchCommandType = 'radial-select';
      expect(t).toBe('radial-select');
    });
  });

  describe('TouchCommand', () => {
    it('creates a tap-position command', () => {
      const cmd: TouchCommand = {
        touchType: 'tap-position',
        x: 100,
        y: 200,
      };
      expect(cmd.touchType).toBe('tap-position');
      expect(cmd.x).toBe(100);
      expect(cmd.y).toBe(200);
    });

    it('creates a tap-entity command', () => {
      const cmd: TouchCommand = {
        touchType: 'tap-entity',
        entityId: 42,
      };
      expect(cmd.touchType).toBe('tap-entity');
      expect(cmd.entityId).toBe(42);
    });

    it('creates a radial-select command', () => {
      const cmd: TouchCommand = {
        touchType: 'radial-select',
        radialOptionId: 'cmd_attack',
      };
      expect(cmd.touchType).toBe('radial-select');
      expect(cmd.radialOptionId).toBe('cmd_attack');
    });
  });

  describe('NetMessage adversarial variants', () => {
    it('adversarial-lodge-destroyed is a valid NetMessage', () => {
      const msg: NetMessage = { type: 'adversarial-lodge-destroyed' };
      expect(msg.type).toBe('adversarial-lodge-destroyed');
    });

    it('adversarial-commander-destroyed is a valid NetMessage', () => {
      const msg: NetMessage = { type: 'adversarial-commander-destroyed' };
      expect(msg.type).toBe('adversarial-commander-destroyed');
    });

    it('settings message includes matchMode', () => {
      const msg: NetMessage = {
        type: 'settings',
        seed: 12345,
        difficulty: 'normal',
        scenario: 'standard',
        commander: 'marshal',
        matchMode: 'adversarial',
      };
      expect(msg.type).toBe('settings');
      if (msg.type === 'settings') {
        expect(msg.matchMode).toBe('adversarial');
      }
    });
  });
});
