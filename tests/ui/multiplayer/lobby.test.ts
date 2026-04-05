// @vitest-environment jsdom
/**
 * Multiplayer Lobby Store Tests
 *
 * Validates adversarial signals, match mode toggle, and store defaults.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import * as mp from '@/ui/store-multiplayer';

describe('store-multiplayer', () => {
  beforeEach(() => {
    // Reset all signals to defaults
    mp.multiplayerMode.value = false;
    mp.multiplayerConnected.value = false;
    mp.multiplayerMenuOpen.value = false;
    mp.multiplayerMatchMode.value = 'coop';
    mp.adversarialOpponentLodgeDestroyed.value = false;
    mp.adversarialOpponentCommanderDestroyed.value = false;
    mp.multiplayerLobbyPlayers.value = [];
  });

  describe('match mode signal', () => {
    it('defaults to coop', () => {
      expect(mp.multiplayerMatchMode.value).toBe('coop');
    });

    it('can be toggled to adversarial', () => {
      mp.multiplayerMatchMode.value = 'adversarial';
      expect(mp.multiplayerMatchMode.value).toBe('adversarial');
    });

    it('can be toggled back to coop', () => {
      mp.multiplayerMatchMode.value = 'adversarial';
      mp.multiplayerMatchMode.value = 'coop';
      expect(mp.multiplayerMatchMode.value).toBe('coop');
    });
  });

  describe('adversarial signals', () => {
    it('adversarialOpponentLodgeDestroyed defaults to false', () => {
      expect(mp.adversarialOpponentLodgeDestroyed.value).toBe(false);
    });

    it('adversarialOpponentCommanderDestroyed defaults to false', () => {
      expect(mp.adversarialOpponentCommanderDestroyed.value).toBe(false);
    });

    it('can set opponent Lodge destroyed', () => {
      mp.adversarialOpponentLodgeDestroyed.value = true;
      expect(mp.adversarialOpponentLodgeDestroyed.value).toBe(true);
    });

    it('can set opponent Commander destroyed', () => {
      mp.adversarialOpponentCommanderDestroyed.value = true;
      expect(mp.adversarialOpponentCommanderDestroyed.value).toBe(true);
    });
  });

  describe('allReady computed', () => {
    it('returns false when no players', () => {
      expect(mp.multiplayerAllReady.value).toBe(false);
    });

    it('returns false when only one player ready', () => {
      mp.multiplayerLobbyPlayers.value = [
        { id: 'a', name: 'Host', commander: '', ready: true, isHost: true },
        { id: 'b', name: 'Guest', commander: '', ready: false, isHost: false },
      ];
      expect(mp.multiplayerAllReady.value).toBe(false);
    });

    it('returns true when both players ready', () => {
      mp.multiplayerLobbyPlayers.value = [
        { id: 'a', name: 'Host', commander: '', ready: true, isHost: true },
        { id: 'b', name: 'Guest', commander: '', ready: true, isHost: false },
      ];
      expect(mp.multiplayerAllReady.value).toBe(true);
    });
  });
});
