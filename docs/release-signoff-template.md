---
title: Release Signoff Template
updated: 2026-04-14
status: current
domain: ops
---
# Release Signoff Template

Copy this into the release PR, release issue, or internal signoff note before shipping.

## Release Identity

- Version:
- Git commit SHA:
- Release date/time (local):
- Android build date/time:

## Automated Verification

- `pnpm verify:release`:
- Full Vitest result:
- Browser smoke result:
- `pnpm build`:
- `pnpm build:android`:
- `pnpm audit --json`:

## Browser Audit

- Browser audit manifest:
- Browser audit generation timestamp:
- Visual review completed by:

## Device / Browser Smoke Matrix

| Surface | Device / Browser | OS / Version | Result | Notes |
| --- | --- | --- | --- | --- |
| Web |  |  |  |  |
| Web |  |  |  |  |
| Android |  |  |  |  |

## Manual Smoke Checklist

- Fresh install / clean launch verified
- Main menu icon/art verified
- Onboarding coach progression verified
- Full match end-to-end verified
- Progression carry-forward verified
- Touch controls verified
- Audio / mute / resume verified
- Persistence across relaunch verified
- 15-20 minute session verified
- Android process-kill relaunch verified

## Signoff

- Release owner:
- QA signoff:
- Notes / exceptions:
