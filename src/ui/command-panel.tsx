import { signal } from '@preact/signals';
import { entityKindName } from '@/config/entity-defs';
import { selectEntity as focusEntity, selectBuilding } from '@/game/panel-actions';
import { canDockPanels, screenClass } from '@/platform';
import { ActionPanel } from './action-panel';
import {
  activateAttackMove,
  cycleIdleGeneralist,
  deselect,
  haltSelection,
  openKeyboardRef,
  openSettings,
  quickLoad,
  quickSave,
  selectArmyUnits,
  toggleColorBlind,
} from './game-actions';
import { formatUnitTaskLabel } from './roster-types';
import { SelectionPanel } from './selection-panel';
import * as store from './store';

type PanelTab = 'map' | 'forces' | 'buildings' | 'act' | 'menu';

const activePanelTab = signal<PanelTab>('map');
const FORCE_ROLE_LABELS = {
  generalist: 'Generalist',
  combat: 'Combat',
  support: 'Support',
  recon: 'Recon',
  commander: 'Commander',
} as const;

interface CommandPanelProps {
  onClose: () => void;
}

function TabButton({ tab, label }: { tab: PanelTab; label: string }) {
  const active = activePanelTab.value === tab;
  return (
    <button
      type="button"
      class="flex-1 min-h-[40px] px-2 py-1 text-[11px] font-heading font-bold uppercase tracking-wide"
      style={{
        background: active ? 'var(--pw-glow-accent-20)' : 'transparent',
        borderBottom: active ? '2px solid var(--pw-accent)' : '2px solid transparent',
        color: active ? 'var(--pw-accent)' : 'var(--pw-text-secondary)',
      }}
      onClick={() => {
        activePanelTab.value = tab;
      }}
    >
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3
      class="font-heading text-xs uppercase tracking-[0.2em]"
      style={{ color: 'var(--pw-accent)' }}
    >
      {children}
    </h3>
  );
}

function MapTab() {
  return (
    <div class="flex flex-col gap-3 p-3 text-sm">
      <SectionTitle>Map</SectionTitle>
      <div class="grid grid-cols-2 gap-2">
        <div class="rounded px-3 py-2 hud-btn">
          <div class="font-heading text-[10px] uppercase">Fish</div>
          <div class="font-numbers text-lg">{store.fish.value}</div>
        </div>
        <div class="rounded px-3 py-2 hud-btn">
          <div class="font-heading text-[10px] uppercase">Rocks</div>
          <div class="font-numbers text-lg">{store.rocks.value}</div>
        </div>
        <div class="rounded px-3 py-2 hud-btn">
          <div class="font-heading text-[10px] uppercase">Logs</div>
          <div class="font-numbers text-lg">{store.logs.value}</div>
        </div>
        <div class="rounded px-3 py-2 hud-btn">
          <div class="font-heading text-[10px] uppercase">Food</div>
          <div class="font-numbers text-lg">{store.foodDisplay.value}</div>
        </div>
      </div>
      <div
        class="rounded px-3 py-2 text-xs"
        style={{
          background: 'var(--pw-surface-card-70)',
          border: '1px solid var(--pw-border)',
          color: 'var(--pw-text-secondary)',
        }}
      >
        <div class="font-heading text-[10px] uppercase" style={{ color: 'var(--pw-text-primary)' }}>
          Status
        </div>
        <div>{store.peaceStatusText.value}</div>
        <div>{store.gameTimeDisplay.value}</div>
        {store.waveCountdown.value > 0 && <div>Wave in {store.waveCountdown.value}s</div>}
      </div>
    </div>
  );
}

function ForcesTab() {
  const roster = store.unitRoster.value;
  return (
    <div class="flex flex-col gap-3 p-3">
      <SectionTitle>Forces</SectionTitle>
      {roster.length === 0 && (
        <p class="text-xs italic" style={{ color: 'var(--pw-text-muted)' }}>
          No units
        </p>
      )}
      {roster.map((group) => (
        <div
          key={group.role}
          class="rounded p-2"
          style={{ background: 'var(--pw-surface-card-70)', border: '1px solid var(--pw-border)' }}
        >
          <div class="mb-2 flex items-center justify-between text-xs">
            <span class="font-heading uppercase" style={{ color: 'var(--pw-text-primary)' }}>
              {FORCE_ROLE_LABELS[group.role]}
            </span>
            <span style={{ color: 'var(--pw-text-muted)' }}>
              {group.units.length} total, {group.idleCount} idle
            </span>
          </div>
          <div class="flex flex-col gap-1">
            {group.units.map((unit) => (
              <button
                type="button"
                key={unit.eid}
                class="rounded px-2 py-1 text-left text-xs hud-btn"
                onClick={() => focusEntity(unit.eid)}
              >
                <span class="font-heading">{unit.label ?? entityKindName(unit.kind)}</span>
                <span style={{ color: 'var(--pw-text-muted)' }}>
                  {' '}
                  • {formatUnitTaskLabel(unit.task)} • {unit.hp}/{unit.maxHp}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BuildingsTab() {
  const buildings = store.buildingRoster.value;
  return (
    <div class="flex flex-col gap-3 p-3">
      <SectionTitle>Buildings</SectionTitle>
      {buildings.length === 0 && (
        <p class="text-xs italic" style={{ color: 'var(--pw-text-muted)' }}>
          No buildings
        </p>
      )}
      {buildings.map((building) => (
        <button
          type="button"
          key={building.eid}
          class="rounded p-2 text-left hud-btn"
          onClick={() => selectBuilding(building.eid)}
        >
          <div class="font-heading text-xs">{entityKindName(building.kind)}</div>
          <div class="text-[11px]" style={{ color: 'var(--pw-text-muted)' }}>
            HP {building.hp}/{building.maxHp}
          </div>
          {building.queueItems.length > 0 && (
            <div class="text-[11px]" style={{ color: 'var(--pw-accent)' }}>
              Queue: {building.queueItems.join(', ')}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function ActTab() {
  return (
    <div class="flex h-full min-h-0 flex-col">
      <SelectionPanel
        onDeselect={deselect}
        onIdleGeneralistClick={cycleIdleGeneralist}
        onArmyClick={selectArmyUnits}
        onAttackMoveClick={activateAttackMove}
        onHaltClick={haltSelection}
      />
      <ActionPanel />
    </div>
  );
}

function MenuTab() {
  return (
    <div class="grid grid-cols-2 gap-2 p-3">
      <button type="button" class="rts-btn min-h-[44px]" onClick={() => quickSave()}>
        Save
      </button>
      <button
        type="button"
        class="rts-btn min-h-[44px]"
        disabled={!store.hasSaveGame.value}
        onClick={() => quickLoad()}
      >
        Load
      </button>
      <button type="button" class="rts-btn min-h-[44px]" onClick={() => openSettings()}>
        Settings
      </button>
      <button type="button" class="rts-btn min-h-[44px]" onClick={() => toggleColorBlind()}>
        Color Blind {store.colorBlindMode.value ? 'On' : 'Off'}
      </button>
      <button
        type="button"
        class="rts-btn min-h-[44px] col-span-2"
        onClick={() => openKeyboardRef()}
      >
        Shortcuts
      </button>
    </div>
  );
}

export function CommandPanel({ onClose }: CommandPanelProps) {
  if (!store.mobilePanelOpen.value) return null;

  const width = screenClass.value === 'compact' ? 'min(88vw, 360px)' : '320px';

  return (
    <>
      <div
        class="absolute inset-0"
        style={{ zIndex: '35', background: 'rgba(0, 0, 0, 0.4)' }}
        onClick={() => onClose()}
      />
      <aside
        id="command-panel"
        class="absolute right-0 bottom-0 flex flex-col overflow-hidden"
        style={{
          top: '40px',
          width,
          zIndex: '36',
          background: 'var(--pw-surface-panel-dark)',
          borderLeft: '1px solid var(--pw-border-accent)',
          boxShadow: '-12px 0 32px var(--pw-shadow-heavy)',
        }}
      >
        <div
          class="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: '1px solid var(--pw-border)' }}
        >
          <div>
            <div class="font-heading text-xs uppercase tracking-[0.2em]">Command Panel</div>
            <div class="text-[11px]" style={{ color: 'var(--pw-text-muted)' }}>
              {canDockPanels.value ? 'Desktop controls' : 'Tap controls'}
            </div>
          </div>
          <button type="button" class="hud-btn min-h-[36px] px-3" onClick={() => onClose()}>
            Close
          </button>
        </div>
        <div class="flex" style={{ borderBottom: '1px solid var(--pw-border)' }}>
          <TabButton tab="map" label="Map" />
          <TabButton tab="forces" label="Forces" />
          <TabButton tab="buildings" label="Buildings" />
          <TabButton tab="act" label="Act" />
          <TabButton tab="menu" label="Menu" />
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          {activePanelTab.value === 'map' && <MapTab />}
          {activePanelTab.value === 'forces' && <ForcesTab />}
          {activePanelTab.value === 'buildings' && <BuildingsTab />}
          {activePanelTab.value === 'act' && <ActTab />}
          {activePanelTab.value === 'menu' && <MenuTab />}
        </div>
      </aside>
    </>
  );
}
