/**
 * MultiplayerMenu — Host or Join co-op game screen.
 *
 * Host path: generate room code, wait for peer, configure settings, start.
 * Join path: enter room code, connect, see host settings, ready up.
 */

import { useCallback, useState } from 'preact/hooks';
import { disconnectMultiplayer, hostGame, joinGame } from '@/net/multiplayer-controller';
import { MenuButton } from '../menu-button';
import {
  multiplayerConnected,
  multiplayerHostSettings,
  multiplayerMenuOpen,
  multiplayerRoomCode,
  multiplayerView,
} from '../store-multiplayer';

type Mode = 'choose' | 'host' | 'join';

export function MultiplayerMenu() {
  const [mode, setMode] = useState<Mode>('choose');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleHost = useCallback(() => {
    hostGame();
    setMode('host');
  }, []);

  const handleJoin = useCallback(() => {
    setMode('join');
  }, []);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(multiplayerRoomCode.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, []);

  const handleJoinSubmit = useCallback(() => {
    if (joinCode.length !== 6) return;
    joinGame(joinCode.toUpperCase());
  }, [joinCode]);

  const handleStartGame = useCallback(() => {
    multiplayerView.value = 'lobby';
  }, []);

  const handleBack = useCallback(() => {
    if (mode === 'choose') {
      multiplayerMenuOpen.value = false;
    } else {
      disconnectMultiplayer();
      setMode('choose');
    }
  }, [mode]);

  const connected = multiplayerConnected.value;
  const roomCode = multiplayerRoomCode.value;
  const hostSettings = multiplayerHostSettings.value;

  return (
    <div class="modal-overlay" data-testid="multiplayer-menu">
      <div class="modal-scroll" style={{ maxWidth: '420px' }}>
        <h2
          class="font-heading text-xl tracking-wider uppercase text-center mb-4"
          style={{ color: 'var(--pw-accent)' }}
        >
          Co-op
        </h2>

        {mode === 'choose' && <ChooseMode onHost={handleHost} onJoin={handleJoin} />}

        {mode === 'host' && (
          <HostPanel
            roomCode={roomCode}
            connected={connected}
            copied={copied}
            onCopy={handleCopyCode}
            onStart={handleStartGame}
          />
        )}

        {mode === 'join' && (
          <JoinPanel
            joinCode={joinCode}
            connected={connected}
            hostSettings={hostSettings}
            onCodeChange={setJoinCode}
            onJoin={handleJoinSubmit}
            onReady={handleStartGame}
          />
        )}

        <div class="flex justify-center mt-4">
          <MenuButton label="Back" onClick={handleBack} />
        </div>
      </div>
    </div>
  );
}

function ChooseMode({ onHost, onJoin }: { onHost: () => void; onJoin: () => void }) {
  return (
    <div class="flex flex-col items-center gap-3">
      <MenuButton label="Host a Game" wide onClick={onHost} />
      <MenuButton label="Join a Game" wide onClick={onJoin} />
    </div>
  );
}

function HostPanel(props: {
  roomCode: string;
  connected: boolean;
  copied: boolean;
  onCopy: () => void;
  onStart: () => void;
}) {
  return (
    <div class="flex flex-col items-center gap-3">
      <p class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>
        Share this code with your partner:
      </p>
      <div
        class="font-heading text-3xl tracking-[0.3em] text-center px-4 py-2 rounded"
        style={{ color: 'var(--pw-accent-bright)', background: 'var(--pw-bg-elevated)' }}
        data-testid="room-code"
      >
        {props.roomCode}
      </div>
      <MenuButton label={props.copied ? 'Copied!' : 'Copy Code'} onClick={props.onCopy} />
      <p
        class="font-game text-xs"
        style={{ color: props.connected ? 'var(--pw-success)' : 'var(--pw-text-muted)' }}
        data-testid="host-status"
      >
        {props.connected ? 'Player connected!' : 'Waiting for player...'}
      </p>
      {props.connected && <MenuButton label="Start Game" wide onClick={props.onStart} />}
    </div>
  );
}

function JoinPanel(props: {
  joinCode: string;
  connected: boolean;
  hostSettings: import('@/net/types').HostSettings | null;
  onCodeChange: (code: string) => void;
  onJoin: () => void;
  onReady: () => void;
}) {
  return (
    <div class="flex flex-col items-center gap-3">
      <label
        htmlFor="room-code-input"
        class="font-game text-xs"
        style={{ color: 'var(--pw-text-secondary)' }}
      >
        Enter room code:
      </label>
      <input
        id="room-code-input"
        type="text"
        maxLength={6}
        value={props.joinCode}
        onInput={(e) => props.onCodeChange((e.target as HTMLInputElement).value.toUpperCase())}
        class="font-heading text-2xl tracking-[0.3em] text-center w-48 px-2 py-1 rounded border-0"
        style={{
          color: 'var(--pw-accent-bright)',
          background: 'var(--pw-bg-elevated)',
          outline: '1px solid var(--pw-border-accent)',
        }}
        placeholder="ABC123"
        data-testid="join-code-input"
      />
      {!props.connected && (
        <MenuButton label="Join" onClick={props.onJoin} disabled={props.joinCode.length !== 6} />
      )}
      {props.connected && (
        <>
          <p class="font-game text-xs" style={{ color: 'var(--pw-success)' }}>
            Connected!
          </p>
          {props.hostSettings && (
            <div class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>
              <p>Map: {props.hostSettings.scenario}</p>
              <p>Difficulty: {props.hostSettings.difficulty}</p>
            </div>
          )}
          <MenuButton label="Ready" wide onClick={props.onReady} />
        </>
      )}
    </div>
  );
}
