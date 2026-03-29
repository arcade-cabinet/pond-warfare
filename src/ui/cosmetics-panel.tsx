/**
 * Cosmetics Panel
 *
 * Full-screen modal overlay for selecting active cosmetics.
 * Shows all cosmetic items grouped by category with unlock status
 * and allows the player to activate/deactivate cosmetics.
 * Stores selections in the SQLite settings table.
 */

import { useCallback, useEffect, useState } from 'preact/hooks';
import { COSMETICS, type CosmeticDef } from '@/config/cosmetics';
import { getPlayerProfile, getSetting, type PlayerProfile, setSetting } from '@/storage';
import { cosmeticsOpen } from './store';

/** Key prefix for cosmetic activation in the settings table. */
const COSMETIC_ACTIVE_PREFIX = 'cosmetic_active_';

export function CosmeticsPanel() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getPlayerProfile();
        const active = new Set<string>();
        for (const c of COSMETICS) {
          const val = await getSetting(`${COSMETIC_ACTIVE_PREFIX}${c.id}`, '');
          if (val === 'true') active.add(c.id);
        }
        if (!cancelled) {
          setProfile(p);
          setActiveIds(active);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = useCallback(
    async (cosmetic: CosmeticDef) => {
      const isActive = activeIds.has(cosmetic.id);
      const newActive = new Set(activeIds);

      if (isActive) {
        // Deactivate
        newActive.delete(cosmetic.id);
        await setSetting(`${COSMETIC_ACTIVE_PREFIX}${cosmetic.id}`, '');
      } else {
        // Deactivate any other cosmetic targeting the same entity kind
        for (const other of COSMETICS) {
          if (other.targetKind === cosmetic.targetKind && other.id !== cosmetic.id) {
            newActive.delete(other.id);
            await setSetting(`${COSMETIC_ACTIVE_PREFIX}${other.id}`, '');
          }
        }
        // Activate this one
        newActive.add(cosmetic.id);
        await setSetting(`${COSMETIC_ACTIVE_PREFIX}${cosmetic.id}`, 'true');
      }

      setActiveIds(newActive);
    },
    [activeIds],
  );

  const handleClose = () => {
    cosmeticsOpen.value = false;
  };

  const unitSkins = COSMETICS.filter((c) => c.category === 'unit_skin');
  const buildingThemes = COSMETICS.filter((c) => c.category === 'building_theme');

  return (
    <div
      class="absolute inset-0 z-[60] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Backdrop */}
      <div class="absolute inset-0" style={{ background: 'rgba(12, 26, 31, 0.85)' }} />

      {/* Panel card */}
      <div
        class="relative rounded-lg shadow-2xl w-[440px] max-w-[95vw] max-h-[90vh] overflow-y-auto overscroll-contain p-5 md:p-6 font-game text-sm z-10 parchment-panel"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        {/* Header */}
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-title text-xl tracking-wide" style={{ color: 'var(--pw-accent)' }}>
            Cosmetics
          </h2>
          <button
            type="button"
            class="hud-btn text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded"
            onClick={handleClose}
            title="Close"
          >
            {'\u2715'}
          </button>
        </div>

        {loading || !profile ? (
          <div class="text-center py-8 font-game text-sm" style={{ color: 'var(--pw-text-muted)' }}>
            Loading...
          </div>
        ) : (
          <>
            {/* Unit Skins */}
            <div class="mb-4">
              <div class="section-header mb-2">Unit Skins</div>
              <div class="space-y-2">
                {unitSkins.map((c) => (
                  <CosmeticRow
                    key={c.id}
                    cosmetic={c}
                    profile={profile}
                    active={activeIds.has(c.id)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>

            {/* Building Themes */}
            <div>
              <div class="section-header mb-2">Building Themes</div>
              <div class="space-y-2">
                {buildingThemes.map((c) => (
                  <CosmeticRow
                    key={c.id}
                    cosmetic={c}
                    profile={profile}
                    active={activeIds.has(c.id)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CosmeticRow({
  cosmetic,
  profile,
  active,
  onToggle,
}: {
  cosmetic: CosmeticDef;
  profile: PlayerProfile;
  active: boolean;
  onToggle: (c: CosmeticDef) => void;
}) {
  const unlocked = cosmetic.unlock.check(profile);

  return (
    <div
      class="flex items-center gap-3 rounded-lg px-3 py-2"
      style={{
        background: active ? 'rgba(64, 200, 208, 0.1)' : 'rgba(20, 30, 35, 0.6)',
        border: active ? '1px solid var(--pw-accent-dim)' : '1px solid var(--pw-border)',
        opacity: unlocked ? 1 : 0.5,
      }}
    >
      <div class="flex-1 min-w-0">
        <div
          class="font-heading font-bold text-xs tracking-wide"
          style={{ color: unlocked ? 'var(--pw-text-primary)' : 'var(--pw-text-muted)' }}
        >
          {cosmetic.name}
        </div>
        <div class="font-game text-[10px]" style={{ color: 'var(--pw-text-muted)' }}>
          {unlocked ? cosmetic.description : cosmetic.unlock.requirement}
        </div>
      </div>

      {unlocked ? (
        <button
          type="button"
          class={`px-3 py-1 rounded font-game text-[10px] font-bold tracking-wider min-w-[60px] min-h-[44px] cursor-pointer ${
            active ? 'toggle-track-active' : 'hud-btn'
          }`}
          style={{
            color: active ? 'var(--pw-accent-bright)' : 'var(--pw-text-muted)',
            borderColor: active ? 'var(--pw-accent)' : undefined,
          }}
          onClick={() => onToggle(cosmetic)}
        >
          {active ? 'ACTIVE' : 'EQUIP'}
        </button>
      ) : (
        <span class="font-game text-[10px] px-2" style={{ color: 'var(--pw-text-muted)' }}>
          LOCKED
        </span>
      )}
    </div>
  );
}
