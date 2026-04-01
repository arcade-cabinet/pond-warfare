/**
 * Advisor State Management
 *
 * Persistence layer for advisor settings (enabled/disabled per role)
 * and permanently dismissed tips. Uses Capacitor Preferences via
 * savePreference/loadPreference from the platform module.
 */

import type { GameWorld } from '@/ecs/world';
import { loadPreference, savePreference } from '@/platform';

import type { AdvisorRole } from './types';

const SETTINGS_KEY = 'advisor-settings';
const DISMISSED_KEY = 'advisor-dismissed-tips';

/** Load per-advisor enabled/disabled toggles from persistent storage. */
export async function loadAdvisorSettings(): Promise<Record<AdvisorRole, boolean>> {
  const defaults: Record<AdvisorRole, boolean> = {
    economy: true,
    war: true,
    builder: true,
  };
  const raw = await loadPreference(SETTINGS_KEY);
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<AdvisorRole, boolean>>;
    return {
      economy: parsed.economy ?? true,
      war: parsed.war ?? true,
      builder: parsed.builder ?? true,
    };
  } catch {
    return defaults;
  }
}

/** Persist per-advisor enabled/disabled toggles. */
export async function saveAdvisorSettings(settings: Record<AdvisorRole, boolean>): Promise<void> {
  await savePreference(SETTINGS_KEY, JSON.stringify(settings));
}

/** Load the set of permanently dismissed tip IDs from persistent storage. */
export async function loadDismissedTips(): Promise<Set<string>> {
  const raw = await loadPreference(DISMISSED_KEY);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

/** Persist the set of permanently dismissed tip IDs. */
export async function saveDismissedTips(tips: Set<string>): Promise<void> {
  await savePreference(DISMISSED_KEY, JSON.stringify([...tips]));
}

/**
 * Initialize the advisor state on a GameWorld by loading persisted
 * settings and dismissed tips from storage.
 */
export async function initAdvisorState(world: GameWorld): Promise<void> {
  const [settings, dismissed] = await Promise.all([loadAdvisorSettings(), loadDismissedTips()]);
  world.advisorState.enabled = settings;
  world.advisorState.dismissedTips = dismissed;
}
