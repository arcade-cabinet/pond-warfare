// @vitest-environment jsdom
/**
 * Commander Accordion Tests
 *
 * Validates the PondAccordion-based commander selection in PearlUpgradeScreen:
 * - Shows unlocked commanders as accordion sections
 * - Shows next unlockable commander if player can afford it
 * - SELECTED badge on current commander
 * - Expanded content: portrait, description, ability, SELECT button
 * - Tapping SELECT deselects previous and selects new
 * - Selected commander's button shows "Selected" (disabled)
 * - Locked commanders show UNLOCK button with pearl cost
 */

import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { COMMANDER_ABILITIES, COMMANDERS } from '@/config/commanders';
import type { PlayerProfile } from '@/storage/database';
import { CommanderAccordionContent } from '@/ui/screens/CommanderAccordionContent';

const DEFAULT_PROFILE: PlayerProfile = {
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
  total_pearls: 0,
  wins_zero_losses: 0,
  total_xp: 0,
  player_level: 0,
};

describe('CommanderAccordionContent', () => {
  const marshal = COMMANDERS[0]; // Always unlocked (unlock: null)
  const sage = COMMANDERS[1]; // Unlock: Win 3 games
  const marshalAbility = COMMANDER_ABILITIES.marshal;

  it('should render commander name, aura description, and ability info', () => {
    const { getByText } = render(
      <CommanderAccordionContent
        def={marshal}
        ability={marshalAbility}
        isSelected={false}
        isUnlocked={true}
        pearlCost={0}
        canAfford={true}
        onSelect={vi.fn()}
      />,
    );

    expect(getByText('The Marshal')).toBeTruthy();
    expect(getByText('+15% damage to nearby units')).toBeTruthy();
    expect(getByText('Charge!')).toBeTruthy();
    expect(getByText('Selected units gain 2x speed for 5 seconds.')).toBeTruthy();
  });

  it('should show SELECT button for unlocked non-selected commander', () => {
    const { getByRole } = render(
      <CommanderAccordionContent
        def={marshal}
        ability={marshalAbility}
        isSelected={false}
        isUnlocked={true}
        pearlCost={0}
        canAfford={true}
        onSelect={vi.fn()}
      />,
    );

    const btn = getByRole('button', { name: /select otter marshal/i }) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent?.toLowerCase()).toContain('select');
    expect(btn.disabled).toBe(false);
  });

  it('should show "Selected" (disabled) for the currently selected commander', () => {
    const { getByRole } = render(
      <CommanderAccordionContent
        def={marshal}
        ability={marshalAbility}
        isSelected={true}
        isUnlocked={true}
        pearlCost={0}
        canAfford={true}
        onSelect={vi.fn()}
      />,
    );

    const btn = getByRole('button', { name: /is selected/i }) as HTMLButtonElement;
    expect(btn.textContent?.toLowerCase()).toContain('selected');
    expect(btn.disabled).toBe(true);
  });

  it('should call onSelect when SELECT is tapped for an unlocked commander', () => {
    const onSelect = vi.fn();
    const { getByRole } = render(
      <CommanderAccordionContent
        def={marshal}
        ability={marshalAbility}
        isSelected={false}
        isUnlocked={true}
        pearlCost={0}
        canAfford={true}
        onSelect={onSelect}
      />,
    );

    getByRole('button', { name: /select otter marshal/i }).click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should show UNLOCK button with pearl cost for locked affordable commander', () => {
    const { getByRole } = render(
      <CommanderAccordionContent
        def={sage}
        ability={COMMANDER_ABILITIES.sage}
        isSelected={false}
        isUnlocked={false}
        pearlCost={25}
        canAfford={true}
        onSelect={vi.fn()}
      />,
    );

    const btn = getByRole('button', { name: /unlock otter sage for 25 pearls/i }) as HTMLButtonElement;
    expect(btn.textContent).toContain('25P');
    expect(btn.disabled).toBe(false);
  });

  it('should disable UNLOCK button when player cannot afford', () => {
    const { getByRole } = render(
      <CommanderAccordionContent
        def={sage}
        ability={COMMANDER_ABILITIES.sage}
        isSelected={false}
        isUnlocked={false}
        pearlCost={25}
        canAfford={false}
        onSelect={vi.fn()}
      />,
    );

    const btn = getByRole('button', { name: /unlock otter sage for 25 pearls/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('should not show passive description when it is "None"', () => {
    const { queryByText } = render(
      <CommanderAccordionContent
        def={marshal}
        ability={marshalAbility}
        isSelected={false}
        isUnlocked={true}
        pearlCost={0}
        canAfford={true}
        onSelect={vi.fn()}
      />,
    );

    // Marshal's passiveDesc is "None" -- should not appear
    expect(queryByText('None')).toBeNull();
  });

  it('should show passive description when it is not "None"', () => {
    const { getByText } = render(
      <CommanderAccordionContent
        def={sage}
        ability={COMMANDER_ABILITIES.sage}
        isSelected={false}
        isUnlocked={true}
        pearlCost={0}
        canAfford={true}
        onSelect={vi.fn()}
      />,
    );

    expect(getByText('Mudpaws +10% gather rate')).toBeTruthy();
    expect(getByText('+25% gather rate to nearby workers')).toBeTruthy();
  });

  it('should apply grayscale filter to portrait when locked', () => {
    const { container } = render(
      <CommanderAccordionContent
        def={sage}
        ability={COMMANDER_ABILITIES.sage}
        isSelected={false}
        isUnlocked={false}
        pearlCost={25}
        canAfford={false}
        onSelect={vi.fn()}
      />,
    );

    const portraitWrapper = container.querySelector('[style*="grayscale"]');
    expect(portraitWrapper).toBeTruthy();
  });
});

describe('Commander accordion section builder logic', () => {
  // Test the filtering logic: only unlocked + next unlockable
  it('should include all unlocked commanders', () => {
    // Marshal is always unlocked (unlock: null)
    // With 0 wins, only marshal is unlocked
    const unlocked = COMMANDERS.filter((c) => c.unlock === null || c.unlock.check(DEFAULT_PROFILE));
    expect(unlocked.length).toBe(1);
    expect(unlocked[0].id).toBe('marshal');
  });

  it('should identify next unlockable commander when player has enough pearls', () => {
    const profileWith3Wins = { ...DEFAULT_PROFILE, total_wins: 3 };
    // Sage requires 3 wins -- now unlocked
    const unlocked = COMMANDERS.filter(
      (c) => c.unlock === null || c.unlock.check(profileWith3Wins),
    );
    expect(unlocked.some((c) => c.id === 'sage')).toBe(true);
  });

  it('should have 7 commanders total', () => {
    expect(COMMANDERS.length).toBe(7);
  });

  it('should have abilities for all commanders', () => {
    for (const c of COMMANDERS) {
      expect(COMMANDER_ABILITIES[c.id]).toBeDefined();
    }
  });
});
