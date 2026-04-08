# Release Checklist

Use this before cutting a public build.

## Automated Preflight

Run the full scripted release verification from the repo root:

```bash
pnpm verify:release
```

This covers:
- TypeScript compilation
- Full Vitest suite
- Core browser regression slices
- Production web build
- Android packaging sync build
- Dependency audit

## Manual Smoke

Run these on at least one real touch device and one desktop browser build:

1. Install and launch the latest build from a clean state.
2. Confirm the main menu loads with the current icon set and no missing art.
3. Start a fresh match and verify the onboarding coach advances through:
   - training from the Lodge
   - commanding a Mudpaw
   - surviving the first pressure spike
4. Play through a full loss or win and confirm:
   - rewards screen opens
   - Clams are awarded
   - rank-up flow works when eligible
   - Upgrade Web and Pearl screen can both be opened from the menu after the match
5. Start another match and confirm progression carries forward:
   - purchased Clam upgrades apply
   - purchased Pearl upgrades apply
   - specialist blueprint behavior still works
6. Verify touch controls:
   - single tap select
   - tap command
   - pinch zoom
   - drag pan
   - action panel and radial actions remain usable without keyboard input
7. Verify audio:
   - SFX play
   - mute toggle works
   - app resumes cleanly after backgrounding without broken audio state
8. Verify persistence:
   - quit from menu
   - relaunch
   - settings and metagame progress persist
9. Run a 15-20 minute session and check for:
   - visible hitching
   - stalled AI
   - broken event sequencing
   - UI overlays failing to close or reopen
10. On Android, confirm install, launch, background/resume, rotation lock behavior, and a second launch after a full process kill.

## Release Notes Inputs

Capture these before shipping:
- Git commit SHA
- `pnpm verify:release` result
- Android build date/time
- Device/browser smoke matrix used for signoff
