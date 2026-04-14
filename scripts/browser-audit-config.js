import { join, resolve } from 'node:path';

export const repoRoot = resolve(import.meta.dirname, '..');

export const expectedCaptures = [
  'landing-01-main.png',
  'landing-02-settings.png',
  'landing-03-play-mode.png',
  'phase-01-match-start.png',
  'phase-02-economy-gathering.png',
  'phase-03-event-alert.png',
  'phase-04-defense-combat.png',
  'phase-05-rewards.png',
  'phase-06-upgrade-web.png',
];

export const maxDiffPixelsByCapture = {
  'landing-01-main.png': 30,
  'landing-02-settings.png': 100,
  'landing-03-play-mode.png': 100,
  'phase-01-match-start.png': 2000,
  'phase-02-economy-gathering.png': 2500,
  'phase-03-event-alert.png': 2500,
  'phase-04-defense-combat.png': 3500,
  'phase-05-rewards.png': 15,
  'phase-06-upgrade-web.png': 100,
};

export const baselineAuditDir = join(repoRoot, 'tests', 'browser', 'audit');
export const defaultCurrentAuditDir = join(
  repoRoot,
  'tests',
  'browser',
  'screenshots',
  'audit-current',
);
export const defaultDiffAuditDir = join(
  repoRoot,
  'tests',
  'browser',
  'screenshots',
  'audit-diff',
);
