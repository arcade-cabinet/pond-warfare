/**
 * New Game — Tab content panels
 *
 * Four tab panels for configuring new game settings:
 * Map, Economy, Enemies, and Rules.
 */

import { OptionRow, SliderRow, type TabContentProps, ToggleRow } from './controls';

export function MapTab({ settings, onUpdate }: TabContentProps) {
  return (
    <div>
      <OptionRow
        label="Scenario"
        options={['standard', 'island', 'contested', 'labyrinth', 'river', 'peninsula'] as const}
        value={settings.scenario}
        onChange={(v) => onUpdate({ scenario: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
      <OptionRow
        label="Resource Density"
        options={['sparse', 'normal', 'rich', 'abundant'] as const}
        value={settings.resourceDensity}
        onChange={(v) => onUpdate({ resourceDensity: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
    </div>
  );
}

export function EconomyTab({ settings, onUpdate }: TabContentProps) {
  return (
    <div>
      <SliderRow
        label="Starting Resources"
        min={0.5}
        max={2.0}
        step={0.25}
        value={settings.startingResourcesMult}
        onChange={(v) => onUpdate({ startingResourcesMult: v })}
        renderValue={(v) => `${Math.round(v * 100)}%`}
      />
      <OptionRow
        label="Gather Speed"
        options={['slow', 'normal', 'fast'] as const}
        value={settings.gatherSpeed}
        onChange={(v) => onUpdate({ gatherSpeed: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
      <OptionRow
        label="Starting Units"
        options={[3, 4, 6, 8] as const}
        value={settings.startingUnits}
        onChange={(v) => onUpdate({ startingUnits: v })}
      />
    </div>
  );
}

export function EnemiesTab({ settings, onUpdate }: TabContentProps) {
  return (
    <div>
      <SliderRow
        label="Enemy Nests"
        min={0}
        max={5}
        step={1}
        value={settings.enemyNests}
        onChange={(v) => onUpdate({ enemyNests: v })}
      />
      <OptionRow
        label="Enemy Economy"
        options={['weak', 'normal', 'strong', 'overwhelming'] as const}
        value={settings.enemyEconomy}
        onChange={(v) => onUpdate({ enemyEconomy: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
      <OptionRow
        label="Enemy Aggression"
        options={['passive', 'normal', 'aggressive', 'relentless'] as const}
        value={settings.enemyAggression}
        onChange={(v) => onUpdate({ enemyAggression: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
      <OptionRow
        label="Evolution Speed"
        options={['slow', 'normal', 'fast', 'instant'] as const}
        value={settings.evolutionSpeed}
        onChange={(v) => onUpdate({ evolutionSpeed: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
    </div>
  );
}

export function RulesTab({ settings, onUpdate }: TabContentProps) {
  return (
    <div>
      <OptionRow
        label="Peace Timer"
        options={[0, 1, 2, 4, 8] as const}
        value={settings.peaceMinutes}
        onChange={(v) => onUpdate({ peaceMinutes: v })}
        renderLabel={(v) => (v === 0 ? 'None' : `${v}m`)}
      />
      <ToggleRow
        label="Permadeath"
        value={settings.permadeath}
        onChange={(v) => onUpdate({ permadeath: v })}
        description="+50% resources, +25% XP, but death is permanent"
      />
      <OptionRow
        label="Fog of War"
        options={['full', 'explored', 'revealed'] as const}
        value={settings.fogOfWar}
        onChange={(v) => onUpdate({ fogOfWar: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
      <ToggleRow
        label="Hero Mode"
        value={settings.heroMode}
        onChange={(v) => onUpdate({ heroMode: v })}
        description="Commander has boosted stats and abilities"
      />
    </div>
  );
}
