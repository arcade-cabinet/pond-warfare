/**
 * Campaign Briefing Component Tests
 *
 * Validates the inter-mission briefing screen renders correctly,
 * shows objectives, recommended branch, and dispatches callbacks.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/preact';
import { CampaignBriefing } from '@/ui/campaign-briefing';
import type { MissionDef } from '@/campaign/mission-types';

function makeMission(overrides: Partial<MissionDef> = {}): MissionDef {
  return {
    id: 'test-mission',
    number: 1,
    title: 'Test Mission',
    subtitle: 'A test subtitle',
    briefing: 'Test briefing text',
    objectives: [
      { id: 'obj-1', type: 'build', label: 'Build an Armory', entityKind: 7, count: 1 },
      { id: 'obj-2', type: 'train', label: 'Train 3 Brawlers', entityKind: 1, count: 3 },
    ],
    dialogues: [],
    settingsOverrides: {},
    ...overrides,
  };
}

describe('CampaignBriefing', () => {
  afterEach(() => cleanup());

  it('renders mission title and subtitle', () => {
    const onBegin = vi.fn();
    const onBack = vi.fn();
    const { getByText } = render(
      <CampaignBriefing mission={makeMission()} onBegin={onBegin} onBack={onBack} />,
    );

    expect(getByText('Test Mission')).toBeTruthy();
    expect(getByText('A test subtitle')).toBeTruthy();
  });

  it('renders mission number', () => {
    const onBegin = vi.fn();
    const onBack = vi.fn();
    const { getByText } = render(
      <CampaignBriefing
        mission={makeMission({ number: 3 })}
        onBegin={onBegin}
        onBack={onBack}
      />,
    );

    expect(getByText('MISSION 3')).toBeTruthy();
  });

  it('renders all objectives', () => {
    const onBegin = vi.fn();
    const onBack = vi.fn();
    const { getByText } = render(
      <CampaignBriefing mission={makeMission()} onBegin={onBegin} onBack={onBack} />,
    );

    expect(getByText('Build an Armory')).toBeTruthy();
    expect(getByText('Train 3 Brawlers')).toBeTruthy();
  });

  it('shows recommended branch when set', () => {
    const onBegin = vi.fn();
    const onBack = vi.fn();
    const { getByTestId } = render(
      <CampaignBriefing
        mission={makeMission({ recommendedBranch: 'warfare' })}
        onBegin={onBegin}
        onBack={onBack}
      />,
    );

    const branchEl = getByTestId('recommended-branch');
    expect(branchEl.textContent).toContain('Warfare (Offense)');
  });

  it('hides recommended branch when not set', () => {
    const onBegin = vi.fn();
    const onBack = vi.fn();
    const { queryByTestId } = render(
      <CampaignBriefing mission={makeMission()} onBegin={onBegin} onBack={onBack} />,
    );

    expect(queryByTestId('recommended-branch')).toBeNull();
  });

  it('calls onBegin when Begin Mission is clicked', () => {
    const onBegin = vi.fn();
    const onBack = vi.fn();
    const { getByText } = render(
      <CampaignBriefing mission={makeMission()} onBegin={onBegin} onBack={onBack} />,
    );

    fireEvent.click(getByText('Begin Mission'));
    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when Back is clicked', () => {
    const onBegin = vi.fn();
    const onBack = vi.fn();
    const { getByText } = render(
      <CampaignBriefing mission={makeMission()} onBegin={onBegin} onBack={onBack} />,
    );

    fireEvent.click(getByText('Back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('has correct data-testid on root element', () => {
    const onBegin = vi.fn();
    const onBack = vi.fn();
    const { getByTestId } = render(
      <CampaignBriefing mission={makeMission()} onBegin={onBegin} onBack={onBack} />,
    );

    expect(getByTestId('campaign-briefing')).toBeTruthy();
  });
});
