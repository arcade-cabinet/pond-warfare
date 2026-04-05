/**
 * Multiplayer Lobby Screen
 *
 * Full-screen overlay shown when multiplayerMenuOpen signal is true.
 * Provides: room code input, host/join buttons, ready state,
 * commander select, match mode toggle, and start game button.
 *
 * All interactions are tap targets with 44px minimum touch size.
 * Uses existing PeerConnection and multiplayer-controller.
 */

import { useCallback, useState } from 'preact/hooks';
import {
  disconnectMultiplayer,
  hostGame,
  joinGame,
  sendReady,
  sendSettings,
  startMultiplayerGame,
} from '@/net/multiplayer-controller';
import type { MatchMode } from '@/net/types';
import { COLORS } from '@/ui/design-tokens';
import * as mp from '@/ui/store-multiplayer';
import { LobbyConnectedView } from './LobbyConnectedView';

const BTN_STYLE = {
  minHeight: '44px',
  minWidth: '44px',
  padding: '10px 20px',
  cursor: 'pointer',
  border: `2px solid ${COLORS.grittyGold}`,
  background: 'rgba(197,160,89,0.15)',
  color: COLORS.sepiaText,
  borderRadius: '6px',
  fontSize: '14px',
  fontFamily: 'var(--font-heading)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const BTN_DISABLED_STYLE = { ...BTN_STYLE, opacity: 0.4, cursor: 'not-allowed' };

export function MultiplayerLobby() {
  const [joinCode, setJoinCode] = useState('');
  const isOpen = mp.multiplayerMenuOpen.value;
  const view = mp.multiplayerView.value;
  const isHost = mp.multiplayerIsHost.value;
  const connected = mp.multiplayerConnected.value;
  const roomCode = mp.multiplayerRoomCode.value;
  const players = mp.multiplayerLobbyPlayers.value;
  const allReady = mp.multiplayerAllReady.value;
  const matchMode = mp.multiplayerMatchMode.value;
  const hostSettings = mp.multiplayerHostSettings.value;

  const handleClose = useCallback(() => {
    disconnectMultiplayer();
    mp.multiplayerMenuOpen.value = false;
    mp.multiplayerView.value = 'menu';
  }, []);

  const handleHost = useCallback(() => {
    hostGame();
    mp.multiplayerView.value = 'lobby';
  }, []);

  const handleJoin = useCallback(() => {
    if (joinCode.length >= 4) {
      joinGame(joinCode.toUpperCase());
      mp.multiplayerView.value = 'lobby';
    }
  }, [joinCode]);

  const handleReady = useCallback(() => {
    sendReady();
    const selfPlayer = players.find((p) => p.isHost === isHost);
    if (selfPlayer) {
      mp.multiplayerLobbyPlayers.value = players.map((p) =>
        p.id === selfPlayer.id ? { ...p, ready: true } : p,
      );
    }
  }, [players, isHost]);

  const handleModeToggle = useCallback(() => {
    const newMode: MatchMode = matchMode === 'coop' ? 'adversarial' : 'coop';
    mp.multiplayerMatchMode.value = newMode;
  }, [matchMode]);

  const handleStart = useCallback(() => {
    const mode = mp.multiplayerMatchMode.value;
    sendSettings(mode);
    startMultiplayerGame(mode);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(10,10,10,0.92)' }}
    >
      <div
        class="relative w-full max-w-md mx-4 p-6 rounded-lg overflow-y-auto"
        style={{
          maxHeight: '90dvh',
          background: 'rgba(30,30,20,0.95)',
          border: `2px solid ${COLORS.grittyGold}`,
        }}
      >
        {/* Header */}
        <div class="flex items-center justify-between mb-4">
          <h1
            class="font-heading text-xl uppercase tracking-wider"
            style={{ color: COLORS.grittyGold }}
          >
            Multiplayer
          </h1>
          <button
            type="button"
            class="font-heading text-lg"
            style={{ ...BTN_STYLE, padding: '4px 12px', minWidth: 'auto' }}
            onClick={handleClose}
            aria-label="Close multiplayer menu"
          >
            X
          </button>
        </div>

        {/* Menu view: Host or Join */}
        {view === 'menu' && !connected && (
          <div class="flex flex-col gap-4">
            <button type="button" style={BTN_STYLE} onClick={handleHost}>
              Host Game
            </button>
            <div class="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onInput={(e) => setJoinCode((e.target as HTMLInputElement).value)}
                placeholder="Room code"
                maxLength={6}
                class="flex-1 font-game text-sm px-3 rounded"
                style={{
                  minHeight: '44px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${COLORS.weatheredSteel}`,
                  color: COLORS.sepiaText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              />
              <button
                type="button"
                style={joinCode.length >= 4 ? BTN_STYLE : BTN_DISABLED_STYLE}
                onClick={handleJoin}
                disabled={joinCode.length < 4}
              >
                Join
              </button>
            </div>
          </div>
        )}

        {/* Waiting for peer -- show "Connecting..." until connection is established */}
        {view === 'lobby' && !connected && (
          <div class="flex flex-col items-center gap-3">
            <p class="font-game text-sm" style={{ color: COLORS.weatheredSteel }}>
              {roomCode ? 'Waiting for opponent...' : 'Connecting...'}
            </p>
            {roomCode && (
              <>
                <div
                  class="font-numbers text-3xl tracking-[0.3em] text-center py-3 px-6 rounded"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${COLORS.grittyGold}`,
                    color: COLORS.grittyGold,
                  }}
                >
                  {roomCode}
                </div>
                <p class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
                  Share this code with your opponent
                </p>
              </>
            )}
          </div>
        )}

        {/* Lobby view: both players connected */}
        {connected && (
          <LobbyConnectedView
            roomCode={roomCode}
            players={players}
            isHost={isHost}
            allReady={allReady}
            matchMode={matchMode}
            hostSettings={hostSettings}
            onReady={handleReady}
            onModeToggle={handleModeToggle}
            onStart={handleStart}
            btnStyle={BTN_STYLE}
            btnDisabledStyle={BTN_DISABLED_STYLE}
          />
        )}
      </div>
    </div>
  );
}
