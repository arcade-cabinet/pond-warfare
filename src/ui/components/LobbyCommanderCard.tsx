/**
 * Lobby Commander Card -- simplified commander portrait for multiplayer lobby.
 *
 * Tap target with 44px minimum touch size.
 */

import { CommanderPortrait } from '@/ui/components/sprites/commanders/CommanderPortrait';
import { COLORS } from '@/ui/design-tokens';

export interface LobbyCommanderCardProps {
  id: string;
  name: string;
  isSelected: boolean;
  onTap: () => void;
}

export function LobbyCommanderCard({ id, name, isSelected, onTap }: LobbyCommanderCardProps) {
  return (
    <button
      type="button"
      class="flex flex-col items-center gap-1 p-2 rounded"
      style={{
        border: `2px solid ${isSelected ? COLORS.grittyGold : COLORS.weatheredSteel}`,
        background: isSelected ? 'rgba(197,160,89,0.15)' : 'rgba(255,255,255,0.03)',
        minWidth: '70px',
        minHeight: '44px',
        cursor: 'pointer',
      }}
      onClick={onTap}
      aria-label={`Select ${name}`}
    >
      <CommanderPortrait commanderType={id} size={48} />
      <span class="font-heading text-[9px]" style={{ color: COLORS.sepiaText }}>
        {name}
      </span>
    </button>
  );
}
