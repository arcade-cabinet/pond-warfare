/**
 * Lodge Visual Evolution Renderer (v3.0 — US6)
 *
 * Reads current upgrade state + prestige rank to render Lodge wings,
 * prestige glow, and HP bar. Wings attach visually based on
 * lodge.json definitions.
 *
 * Called by the entity renderer when drawing the player's Lodge.
 */

import { getLodgeConfig } from '@/config/config-loader';

// ── Types ─────────────────────────────────────────────────────────

/** Current Lodge visual state (passed in from game world / store). */
export interface LodgeVisualState {
  /** Which wings are unlocked (wing ID -> true). */
  unlockedWings: Record<string, boolean>;
  /** Current prestige rank (0 = no prestige). */
  prestigeRank: number;
  /** Current Lodge HP (0 to maxHp). */
  currentHp: number;
  /** Maximum Lodge HP. */
  maxHp: number;
}

/** A wing attachment position relative to Lodge center. */
export interface WingPlacement {
  wingId: string;
  label: string;
  /** X offset from Lodge center (pixels). */
  offsetX: number;
  /** Y offset from Lodge center (pixels). */
  offsetY: number;
  /** Wing width in pixels. */
  width: number;
  /** Wing height in pixels. */
  height: number;
}

/** Prestige glow configuration by rank range. */
export interface PrestigeGlow {
  color: string;
  radius: number;
  alpha: number;
}

// ── Wing Placement Definitions ────────────────────────────────────

const WING_PLACEMENTS: Record<string, Omit<WingPlacement, 'wingId' | 'label'>> = {
  dock: { offsetX: -40, offsetY: 8, width: 24, height: 16 },
  barracks: { offsetX: 40, offsetY: 8, width: 24, height: 16 },
  watchtower: { offsetX: 0, offsetY: -32, width: 16, height: 20 },
  healing_pool: { offsetX: 0, offsetY: 24, width: 20, height: 12 },
};

// ── Prestige Glow Tiers ──────────────────────────────────────────

const PRESTIGE_GLOWS: { minRank: number; glow: PrestigeGlow }[] = [
  { minRank: 10, glow: { color: '#fbbf24', radius: 24, alpha: 0.5 } },
  { minRank: 7, glow: { color: '#f59e0b', radius: 20, alpha: 0.4 } },
  { minRank: 5, glow: { color: '#d97706', radius: 16, alpha: 0.35 } },
  { minRank: 3, glow: { color: '#b45309', radius: 12, alpha: 0.3 } },
  { minRank: 1, glow: { color: '#92400e', radius: 8, alpha: 0.2 } },
];

// ── Color Constants ──────────────────────────────────────────────

const HP_GREEN = '#4ade80';
const HP_YELLOW = '#facc15';
const HP_RED = '#ef4444';

// ── Public API ───────────────────────────────────────────────────

/**
 * Get all wing placements that should render for the current state.
 */
export function getActiveWings(state: LodgeVisualState): WingPlacement[] {
  const config = getLodgeConfig();
  const result: WingPlacement[] = [];

  for (const [wingId, wingDef] of Object.entries(config.wings)) {
    if (!state.unlockedWings[wingId]) continue;
    const placement = WING_PLACEMENTS[wingId];
    if (!placement) continue;

    result.push({
      wingId,
      label: wingDef.description,
      ...placement,
    });
  }

  return result;
}

/**
 * Get the prestige glow effect for the current rank.
 * Returns null if rank is 0 (no prestige).
 */
export function getPrestigeGlow(rank: number): PrestigeGlow | null {
  if (rank <= 0) return null;

  for (const tier of PRESTIGE_GLOWS) {
    if (rank >= tier.minRank) return tier.glow;
  }

  return null;
}

/**
 * Calculate Lodge HP bar values.
 */
export function getLodgeHpBar(state: LodgeVisualState): {
  percent: number;
  color: string;
  label: string;
} {
  const percent = state.maxHp > 0 ? state.currentHp / state.maxHp : 0;
  const clampedPct = Math.max(0, Math.min(1, percent));

  let color: string;
  if (clampedPct > 0.6) {
    color = HP_GREEN;
  } else if (clampedPct > 0.3) {
    color = HP_YELLOW;
  } else {
    color = HP_RED;
  }

  return {
    percent: clampedPct,
    color,
    label: `${Math.ceil(state.currentHp)} / ${state.maxHp}`,
  };
}

/**
 * Determine the number of fort slots available at this progression level.
 */
export function getFortSlotCount(progressionLevel: number): number {
  const config = getLodgeConfig();
  const tiers = [...config.fort_slots_per_level].sort((a, b) => b.min_level - a.min_level);

  for (const tier of tiers) {
    if (progressionLevel >= tier.min_level) return tier.slots;
  }

  return config.fort_slots_per_level[0]?.slots ?? 4;
}

/**
 * Generate fort slot positions in concentric rings around the Lodge.
 * Returns positions as {x, y} offsets from Lodge center.
 */
export function generateFortSlotPositions(
  slotCount: number,
): { x: number; y: number; ring: number }[] {
  const positions: { x: number; y: number; ring: number }[] = [];
  const innerRingRadius = 48;
  const outerRingRadius = 80;

  // Inner ring: first 4-8 slots
  const innerCount = Math.min(slotCount, 8);
  for (let i = 0; i < innerCount; i++) {
    const angle = (i / innerCount) * Math.PI * 2 - Math.PI / 2;
    positions.push({
      x: Math.round(Math.cos(angle) * innerRingRadius),
      y: Math.round(Math.sin(angle) * innerRingRadius),
      ring: 0,
    });
  }

  // Outer ring: remaining slots
  const outerCount = slotCount - innerCount;
  for (let i = 0; i < outerCount; i++) {
    const angle = (i / outerCount) * Math.PI * 2 - Math.PI / 2;
    positions.push({
      x: Math.round(Math.cos(angle) * outerRingRadius),
      y: Math.round(Math.sin(angle) * outerRingRadius),
      ring: 1,
    });
  }

  return positions;
}

/**
 * Check if the given wing ID is valid per lodge.json config.
 */
export function isValidWing(wingId: string): boolean {
  const config = getLodgeConfig();
  return wingId in config.wings;
}

/**
 * Get Lodge base HP from config.
 */
export function getLodgeBaseHp(): number {
  return getLodgeConfig().base_hp;
}
