/**
 * Unlocks Panel
 *
 * Displays all unlockable content organized by category. Unlocked items
 * show with a gold/purple border and full description; locked items appear
 * dimmed with their requirement text. Progress indicators show how close
 * the player is to earning each unlock.
 *
 * Accessible from the main menu via the "Unlocks" button.
 */

import { useEffect, useState } from 'preact/hooks';
import { UNLOCK_CATEGORIES, UNLOCKS, type UnlockCategory } from '@/config/unlocks';
import type { PlayerProfile } from '@/storage/database';
import { getCachedProfile, getUnlockedIds, loadUnlocks } from '@/systems/unlock-tracker';
import { unlocksOpen } from './store';

/** Build a human-readable progress string for a locked unlock. */
function progressText(def: (typeof UNLOCKS)[number], profile: PlayerProfile): string {
  switch (def.id) {
    case 'scenario_island':
      return `Wins: ${profile.total_wins}/1`;
    case 'preset_sandbox':
      return `Games: ${profile.total_games}/3`;
    case 'unit_catapult':
      return `Buildings: ${profile.total_buildings_built}/10`;
    case 'unit_swimmer':
      return `Kills: ${profile.total_kills}/50`;
    case 'unit_trapper':
      return `Wins: ${profile.total_wins}/3`;
    case 'unit_shieldbearer':
      return `Heroes: ${profile.hero_units_earned}/1`;
    case 'mod_hero_mode':
      return `Commander wins: ${profile.wins_commander_alive}/1`;
    case 'mod_fast_evolution':
      return `Survival: ${Math.floor(profile.longest_survival_seconds / 60)}m/45m`;
    case 'preset_survival':
      return `Survival: ${Math.floor(profile.longest_survival_seconds / 60)}m/30m`;
    case 'cosmetic_gold_cape':
      return `Wins: ${profile.total_wins}/10`;
    case 'cosmetic_red_banner':
      return `Kills: ${profile.total_kills}/200`;
    default:
      return def.requirement;
  }
}

export function UnlocksPanel() {
  const [unlockedSet, setUnlockedSet] = useState<ReadonlySet<string>>(new Set());
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [activeCategory, setActiveCategory] = useState<UnlockCategory | 'all'>('all');

  useEffect(() => {
    loadUnlocks()
      .then(() => {
        setUnlockedSet(new Set(getUnlockedIds()));
        setProfile(getCachedProfile());
      })
      .catch(() => {
        setUnlockedSet(new Set(getUnlockedIds()));
        setProfile(getCachedProfile());
      });
  }, []);

  if (!unlocksOpen.value) return null;

  const p = profile ?? {
    total_wins: 0,
    total_losses: 0,
    total_kills: 0,
    total_games: 0,
    total_playtime_seconds: 0,
    highest_difficulty_won: '',
    longest_survival_seconds: 0,
    fastest_win_seconds: 0,
    total_buildings_built: 0,
    hero_units_earned: 0,
    wins_commander_alive: 0,
  };

  const filteredUnlocks =
    activeCategory === 'all' ? UNLOCKS : UNLOCKS.filter((u) => u.category === activeCategory);

  const totalUnlocked = UNLOCKS.filter((u) => unlockedSet.has(u.id)).length;

  return (
    <div
      class="absolute inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          unlocksOpen.value = false;
        }
      }}
    >
      <div
        class="relative w-[90vw] max-w-[720px] max-h-[85vh] overflow-y-auto rounded-lg p-6"
        style={{
          background: 'linear-gradient(135deg, #1a2332 0%, #0f1923 100%)',
          border: '1px solid rgba(167, 139, 250, 0.3)',
          boxShadow: '0 0 30px rgba(167, 139, 250, 0.1)',
        }}
      >
        {/* Header */}
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="font-heading text-xl tracking-wider uppercase" style={{ color: '#a78bfa' }}>
              Unlocks
            </h2>
            <p class="font-game text-xs mt-1" style={{ color: 'var(--pw-text-muted)' }}>
              {totalUnlocked} / {UNLOCKS.length} unlocked
            </p>
          </div>
          <button
            type="button"
            class="font-heading text-lg px-3 py-1 rounded"
            style={{ color: 'var(--pw-text-muted)' }}
            onClick={() => {
              unlocksOpen.value = false;
            }}
          >
            X
          </button>
        </div>

        {/* Profile summary */}
        {profile && (
          <div
            class="rounded-lg p-3 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <StatBadge label="Wins" value={p.total_wins} />
            <StatBadge label="Games" value={p.total_games} />
            <StatBadge label="Kills" value={p.total_kills} />
            <StatBadge label="Playtime" value={`${Math.floor(p.total_playtime_seconds / 60)}m`} />
          </div>
        )}

        {/* Category tabs */}
        <div class="flex flex-wrap gap-1.5 mb-4">
          <CategoryTab
            label="All"
            active={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
          />
          {UNLOCK_CATEGORIES.map((cat) => (
            <CategoryTab
              key={cat.key}
              label={cat.label}
              active={activeCategory === cat.key}
              onClick={() => setActiveCategory(cat.key)}
            />
          ))}
        </div>

        {/* Unlock grid */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredUnlocks.map((unlock) => {
            const earned = unlockedSet.has(unlock.id);
            return (
              <div
                key={unlock.id}
                class="rounded-lg p-3 transition-all"
                style={{
                  background: earned ? 'rgba(167, 139, 250, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: earned
                    ? '1px solid rgba(167, 139, 250, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  opacity: earned ? 1 : 0.6,
                }}
              >
                <div class="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: '13px' }}>{earned ? '\u2605' : '\uD83D\uDD12'}</span>
                  <span
                    class="font-heading text-sm tracking-wide"
                    style={{ color: earned ? '#a78bfa' : 'var(--pw-text-muted)' }}
                  >
                    {unlock.name}
                  </span>
                  <span
                    class="font-game text-[9px] px-1.5 py-0.5 rounded ml-auto"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--pw-text-muted)',
                    }}
                  >
                    {unlock.category}
                  </span>
                </div>
                <p
                  class="font-game text-xs pl-5"
                  style={{
                    color: earned ? 'var(--pw-text-secondary)' : 'var(--pw-text-muted)',
                  }}
                >
                  {earned ? unlock.description : unlock.requirement}
                </p>
                {!earned && profile && (
                  <p
                    class="font-numbers text-[10px] pl-5 mt-1"
                    style={{ color: 'rgba(167, 139, 250, 0.6)' }}
                  >
                    {progressText(unlock, p)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div class="flex flex-col items-center">
      <span class="font-numbers text-sm" style={{ color: '#a78bfa' }}>
        {value}
      </span>
      <span class="font-game text-[9px]" style={{ color: 'var(--pw-text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class="font-game text-[10px] px-2.5 py-1 rounded cursor-pointer transition-all"
      style={{
        background: active ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255, 255, 255, 0.04)',
        border: active
          ? '1px solid rgba(167, 139, 250, 0.5)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        color: active ? '#a78bfa' : 'var(--pw-text-muted)',
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
