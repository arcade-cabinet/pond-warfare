/**
 * Lobby Connected View -- shown when both players are in the lobby.
 *
 * Displays player list, match mode toggle, commander select, and ready/start buttons.
 * All tap targets are 44px minimum.
 */

import { useCallback } from 'preact/hooks';
import { COMMANDERS } from '@/config/commanders';
import type { HostSettings, LobbyPlayer, MatchMode } from '@/net/types';
import { LobbyCommanderCard } from '@/ui/components/LobbyCommanderCard';
import { COLORS } from '@/ui/design-tokens';
import { selectedCommander } from '@/ui/store';

export interface LobbyConnectedViewProps {
  roomCode: string;
  players: LobbyPlayer[];
  isHost: boolean;
  allReady: boolean;
  matchMode: MatchMode;
  hostSettings: HostSettings | null;
  onReady: () => void;
  onModeToggle: () => void;
  onStart: () => void;
  btnStyle: Record<string, string | number>;
  btnDisabledStyle: Record<string, string | number>;
}

export function LobbyConnectedView({
  roomCode,
  players,
  isHost,
  allReady,
  matchMode,
  hostSettings,
  onReady,
  onModeToggle,
  onStart,
  btnStyle,
  btnDisabledStyle,
}: LobbyConnectedViewProps) {
  const handleCommanderSelect = useCallback((cmdId: string) => {
    selectedCommander.value = cmdId;
  }, []);

  return (
    <div class="flex flex-col gap-4">
      {/* Room code display */}
      <div class="text-center">
        <span class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
          Room:
        </span>{' '}
        <span class="font-numbers text-sm tracking-wider" style={{ color: COLORS.grittyGold }}>
          {roomCode}
        </span>
      </div>

      {/* Player list */}
      <div class="flex flex-col gap-2">
        {players.map((p) => (
          <div
            key={p.id}
            class="flex items-center justify-between px-3 py-2 rounded"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${p.ready ? COLORS.mossGreen : COLORS.weatheredSteel}`,
              minHeight: '44px',
            }}
          >
            <span class="font-game text-sm" style={{ color: COLORS.sepiaText }}>
              {p.name} {p.isHost ? '(Host)' : ''}
            </span>
            <span
              class="font-game text-xs"
              style={{ color: p.ready ? COLORS.mossGreen : COLORS.weatheredSteel }}
            >
              {p.ready ? 'Ready' : 'Waiting'}
            </span>
          </div>
        ))}
      </div>

      {/* Match mode toggle (host only) */}
      {isHost && (
        <div class="flex flex-col gap-2">
          <span
            class="font-heading text-xs uppercase tracking-wider"
            style={{ color: COLORS.grittyGold }}
          >
            Match Mode
          </span>
          <button type="button" style={btnStyle} onClick={onModeToggle}>
            {matchMode === 'coop' ? 'Co-op (Shared)' : 'Adversarial (PvP)'}
          </button>
          <span class="font-game text-[10px]" style={{ color: COLORS.weatheredSteel }}>
            {matchMode === 'coop'
              ? 'Work together against enemy waves'
              : 'Lodge vs Lodge -- destroy your opponent'}
          </span>
        </div>
      )}

      {/* Guest sees host's match mode */}
      {!isHost && hostSettings?.matchMode && (
        <div class="text-center">
          <span class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
            Mode:
          </span>{' '}
          <span class="font-game text-sm" style={{ color: COLORS.grittyGold }}>
            {hostSettings.matchMode === 'coop' ? 'Co-op' : 'Adversarial'}
          </span>
        </div>
      )}

      {/* Commander select -- show all commanders */}
      <div>
        <span
          class="font-heading text-xs uppercase tracking-wider"
          style={{ color: COLORS.grittyGold }}
        >
          Commander
        </span>
        <div class="flex gap-2 overflow-x-auto mt-2 pb-2">
          {COMMANDERS.map((def) => (
            <LobbyCommanderCard
              key={def.id}
              id={def.id}
              name={def.title}
              isSelected={selectedCommander.value === def.id}
              onTap={() => handleCommanderSelect(def.id)}
            />
          ))}
        </div>
      </div>

      {/* Ready / Start buttons */}
      <div class="flex gap-3">
        <button type="button" style={btnStyle} onClick={onReady} class="flex-1">
          Ready
        </button>
        {isHost && (
          <button
            type="button"
            style={allReady ? btnStyle : btnDisabledStyle}
            onClick={onStart}
            disabled={!allReady}
            class="flex-1"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}
