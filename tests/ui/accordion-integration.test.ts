/**
 * Accordion Integration Tests
 *
 * Validates that PondAccordion is properly integrated into the three
 * main UI surfaces: NewGameModal, CommandPanel, and SettingsPanel.
 * Tests section rendering, expand/collapse, summaries, and that
 * content is accessible within accordion sections.
 *
 * US13: Accordion uses CSS class-based animation (pond-accordion-content-open)
 * instead of inline display:block/none.
 */

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock platform signals before importing components
vi.mock('@/platform', async () => {
  const { signal } = await import('@preact/signals');
  return {
    inputMode: signal('pointer'),
    screenClass: signal('large'),
    canDockPanels: signal(true),
    loadPreference: vi.fn().mockResolvedValue(null),
    savePreference: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/game', () => ({ game: () => null }));
vi.mock('@/game/panel-actions', () => ({ selectEntity: vi.fn(), selectBuilding: vi.fn() }));
vi.mock('@/game/task-dispatch', () => ({ dispatchTaskOverride: vi.fn() }));
vi.mock('@/input/selection', () => ({ cancelTrain: vi.fn(), train: vi.fn() }));
vi.mock('@/rendering/animations', () => ({
  cleanupEntityAnimation: vi.fn(),
  triggerCommandPulse: vi.fn(),
}));
vi.mock('@/config/entity-defs', () => ({
  entityKindName: () => 'Unit',
  ENTITY_DEFS: {},
}));

import * as store from '@/ui/store';

const header = (k: string) =>
  document.querySelector(`[data-testid="accordion-header-${k}"]`) as HTMLElement;
const content = (k: string) =>
  document.querySelector(`[data-testid="accordion-content-${k}"]`) as HTMLElement;
const summaryEl = (k: string) =>
  document.querySelector(`[data-testid="accordion-summary-${k}"]`) as HTMLElement | null;

/** Check if an accordion section is visually open (has the open CSS class). */
function isOpen(key: string): boolean {
  return content(key).classList.contains('pond-accordion-content-open');
}

beforeEach(() => {
  store.unitRoster.value = [];
  store.buildingRoster.value = [];
  store.idleWorkerCount.value = 0;
  store.masterVolume.value = 80;
  store.musicVolume.value = 50;
  store.sfxVolume.value = 80;
  store.gameSpeed.value = 1;
  store.autoSaveEnabled.value = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// NewGameModal
// ---------------------------------------------------------------------------
describe('NewGameModal accordion integration', () => {
  async function renderNewGame() {
    const { NewGameModal } = await import('@/ui/new-game-modal');
    return render(h(NewGameModal, null));
  }

  it('renders all five accordion sections', async () => {
    await renderNewGame();
    for (const key of ['commander', 'map', 'economy', 'enemies', 'rules']) {
      expect(header(key)).toBeTruthy();
    }
  });

  it('commander section is open by default', async () => {
    await renderNewGame();
    expect(isOpen('commander')).toBe(true);
  });

  it('map section shows scenario + density summary when collapsed', async () => {
    await renderNewGame();
    const s = summaryEl('map');
    expect(s).toBeTruthy();
    expect(s?.textContent).toContain('Standard');
    expect(s?.textContent).toContain('density');
  });

  it('enemies section shows nest count summary', async () => {
    await renderNewGame();
    const s = summaryEl('enemies');
    expect(s).toBeTruthy();
    expect(s?.textContent).toContain('nests');
  });

  it('clicking a section header expands it', async () => {
    await renderNewGame();
    expect(isOpen('economy')).toBe(false);
    fireEvent.click(header('economy'));
    expect(isOpen('economy')).toBe(true);
  });

  it('presets row is visible outside accordion', async () => {
    await renderNewGame();
    const allText = document.body.textContent ?? '';
    expect(allText).toContain('Presets');
    // Preset buttons exist
    const presetBtns = document.querySelectorAll('.stone-node');
    expect(presetBtns.length).toBeGreaterThan(0);
  });

  it('START GAME button is visible outside accordion', async () => {
    await renderNewGame();
    const btn = document.querySelector('.animate-begin-glow');
    expect(btn?.textContent).toContain('START GAME');
  });
});

// ---------------------------------------------------------------------------
// CommandPanel
// ---------------------------------------------------------------------------
describe('CommandPanel accordion integration', () => {
  async function renderPanel() {
    const { CommandPanel } = await import('@/ui/panel/CommandPanel');
    const canvasRef = { current: document.createElement('canvas') };
    const camRef = { current: document.createElement('div') };
    return render(
      h(CommandPanel, { minimapCanvasRef: canvasRef as any, minimapCamRef: camRef as any }),
    );
  }

  it('renders all four accordion sections', async () => {
    await renderPanel();
    for (const key of ['map', 'forces', 'buildings', 'menu']) {
      expect(header(key)).toBeTruthy();
    }
  });

  it('minimap section is open by default', async () => {
    await renderPanel();
    expect(isOpen('map')).toBe(true);
  });

  it('forces summary shows "No units" when roster is empty', async () => {
    await renderPanel();
    const s = summaryEl('forces');
    expect(s).toBeTruthy();
    expect(s?.textContent).toContain('No units');
  });

  it('buildings summary shows no buildings when empty', async () => {
    await renderPanel();
    const s = summaryEl('buildings');
    expect(s).toBeTruthy();
    expect(s?.textContent).toContain('No buildings');
  });

  it('has war-panel class on panel container', async () => {
    await renderPanel();
    const panel = document.querySelector('.war-panel');
    expect(panel).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// SettingsPanel
// ---------------------------------------------------------------------------
describe('SettingsPanel accordion integration', () => {
  async function renderSettings() {
    const { SettingsPanel } = await import('@/ui/settings-panel');
    return render(
      h(SettingsPanel, {
        onMasterVolumeChange: vi.fn(),
        onMusicVolumeChange: vi.fn(),
        onSfxVolumeChange: vi.fn(),
        onSpeedSet: vi.fn(),
        onColorBlindToggle: vi.fn(),
        onAutoSaveToggle: vi.fn(),
        onClose: vi.fn(),
      }),
    );
  }

  it('renders all four accordion sections', async () => {
    await renderSettings();
    for (const key of ['audio', 'gameplay', 'accessibility', 'advisors']) {
      expect(header(key)).toBeTruthy();
    }
  });

  it('audio section is open by default', async () => {
    await renderSettings();
    expect(isOpen('audio')).toBe(true);
  });

  it('audio summary shows master volume percentage', async () => {
    await renderSettings();
    // Audio is defaultOpen so summary is hidden; collapse it first
    fireEvent.click(header('audio'));
    const s = summaryEl('audio');
    expect(s).toBeTruthy();
    expect(s?.textContent).toContain('Master 80%');
  });

  it('gameplay summary shows speed', async () => {
    await renderSettings();
    const s = summaryEl('gameplay');
    expect(s).toBeTruthy();
    expect(s?.textContent).toContain('Speed 1x');
  });

  it('has pond-panel-bg class on settings card', async () => {
    await renderSettings();
    const panel = document.querySelector('.pond-panel-bg');
    expect(panel).toBeTruthy();
  });

  it('clicking gameplay section expands and shows speed buttons', async () => {
    await renderSettings();
    fireEvent.click(header('gameplay'));
    expect(isOpen('gameplay')).toBe(true);
    const speedBtns = content('gameplay').querySelectorAll('.font-numbers');
    expect(speedBtns.length).toBeGreaterThanOrEqual(3);
  });
});
