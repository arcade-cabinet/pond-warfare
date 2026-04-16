# PRD: Production Completion Roadmap

## Overview

Pond Warfare shipped `v1.3.0` on 2026-04-14 with a green release gate, tracked browser audit captures, and a pixel-diff visual regression workflow. This document is the canonical task for **all remaining product work** required to move from "released and stable" to "production-complete."

Current baseline:
- release branch debt: cleared
- open pull requests: `0`
- remote branches outside `main`: `0`
- required core gate: `pnpm verify:release`

This roadmap intentionally reuses the existing ECS/runtime/event stack. Remaining work should extend the current game, not introduce parallel gameplay engines.

## Delivery Rules

- Branch from `main`.
- Keep one active production PR at a time unless work is truly independent.
- Squash merge every production PR to `main`.
- Every wave must land with:
  - automated coverage
  - explicit manual acceptance criteria
  - updated release/signoff documentation
- `pnpm verify:release` remains mandatory for every merge to `main`.

## Wave 1: Single-Player Production Hardening

### Scope

Close the remaining high-signal issues already called out in current state docs:
- narrow-screen modal layout
- Upgrade Web overflow on narrow landscape tablets
- radial menu placement near screen edges
- tower-upgrade application delay
- audio cold-start lag / pre-warm behavior
- Yuka overshoot tolerance
- corpse and particle throttling under high-death bursts

### Deliverables

1. **Responsive UI hardening**
   - fix narrow-width menu, rewards, rank-up, settings, and upgrade-web layouts
   - eliminate known edge clipping/overflow on small phones and narrow tablets
   - make radial menu positioning safe near every screen edge

2. **Gameplay/runtime hardening**
   - apply tower-damage upgrades without delayed live effect
   - pre-warm audio so first-match and first-selection SFX are not late
   - reduce or remove Yuka arrival overshoot that delays gather completion
   - throttle corpse/particle burst behavior without visual collapse in large fights

3. **Manual signoff expansion**
   - add a low-end Android profiling section to release signoff
   - record FPS and memory observations for at least one lower-end Android device

### Required Proof

- browser layout tests for:
  - main menu
  - rewards
  - rank-up modal
  - settings
  - upgrade web
- deterministic regression for tower-upgrade application timing
- audio initialization contract test for pre-warm behavior
- ECS/render stress test for high-death particle bursts
- release-signoff template updated with low-end Android profiling requirements

### Exit Criteria

- no remaining single-player issues in `docs/STATE.md` under UI polish / known issues without either:
  - a shipped fix, or
  - explicit post-production backlog labeling

## Wave 2: Multiplayer Production Surface

### Scope

Promote the existing `src/net/` foundation into a real product surface instead of leaving it as a technical draft.

### Deliverables

1. **Menu and session UX**
   - room creation flow
   - room join flow
   - session metadata visible in the shell
   - explicit unsupported-platform/build messaging where needed

2. **Session lifecycle UI**
   - connecting
   - connected
   - reconnecting
   - disconnected
   - failed / unsupported

3. **Desync and recovery tooling**
   - replay/checksum visibility for diagnosis
   - reconnect / fail-closed behavior
   - stable multiplayer session state in `store-multiplayer.ts`

4. **Authoritative runtime contract**
   - deterministic lockstep remains the source of truth
   - multiplayer continues to use the same core ECS/runtime as single-player

### Required Proof

- create / join / leave happy path
- disconnect / reconnect / fail-closed behavior
- checksum/desync reporting path
- deterministic replay sync round-trip on a sample match
- browser-level multiplayer shell tests where practical

### Exit Criteria

- multiplayer can be started, observed, and diagnosed entirely from product UI without developer-only steps

## Wave 3: Custom Game Modifiers

### Scope

Add one bounded replayability layer before campaign/cosmetics by introducing deterministic pre-match modifiers.

### Deliverables

1. **Modifier selection**
   - selectable from the menu shell before match start
   - persistent modifier state in metagame storage

2. **Modifier schema**
   - canonical config source in `configs/`
   - deterministic runtime application

3. **Result/report integration**
   - match results include active modifiers
   - rewards/history/leaderboard payloads record modifier sets

### Required Proof

- modifier enable / disable flow from the shell
- deterministic runtime effect tests
- result payload verification with modifier metadata
- explicit proof that unmodified baseline play is unchanged

### Exit Criteria

- modifiers are a visible, supported product surface rather than hidden debug state

## Wave 4: Campaign

### Scope

Implement campaign as scripted mission wrappers over the current defend-the-Lodge runtime.

### Deliverables

1. **Mission framework**
   - mission definition/config surface
   - objective state and progression tracking
   - event/template reuse instead of a second mission engine

2. **Progression persistence**
   - campaign progress model
   - failure / retry loop
   - save / resume behavior

3. **Player-facing shell**
   - campaign entry flow
   - mission select/progression surface
   - clear success/failure transitions

### Required Proof

- first-mission smoke coverage
- objective-state progression tests
- retry/resume coverage
- release-signoff campaign smoke section

### Exit Criteria

- at least one complete campaign path can be entered, failed, resumed, retried, and completed from normal UI

## Wave 5: Cosmetics / Store

### Scope

Complete cosmetics as a persistent product surface and, if present, keep any store cosmetic-only.

### Deliverables

1. **Ownership and equip model**
   - canonical cosmetic inventory persistence
   - equipped-state persistence

2. **Visible product surfaces**
   - cosmetics visible in menu
   - cosmetics visible in-match where appropriate
   - cosmetics visible in rewards/progression surfaces

3. **Store policy**
   - cosmetic-only store behavior
   - no competitive or runtime balance effects from purchases

### Required Proof

- ownership/equip persistence tests
- rewards/unlock payload tests for cosmetic grants
- UI coverage for equip/display flows
- explicit verification that cosmetics do not change gameplay stats

### Exit Criteria

- cosmetics are coherent across unlock, inventory, equip, and presentation surfaces

## Cross-Cutting Production Gates

### Automated Gates

Keep `pnpm verify:release` as the core required gate and add/maintain a second production gate for:
- visual regression snapshots
- multiplayer deterministic session checks
- modifier-aware match-result verification
- campaign mission smoke coverage

### Manual Acceptance

The release/signoff path must include all of:
- single-player touch/device smoke
- low-end Android profiling notes
- multiplayer two-client smoke
- modifier run smoke
- campaign first-mission and retry/resume smoke

### Documentation Sync

The following docs must stay aligned with the current shipped truth:
- `docs/STATE.md`
- `docs/outstanding-work.md`
- `docs/release-checklist.md`
- `docs/release-signoff-template.md`
- current in-repo release signoff record(s)

## Production-Complete Exit Criteria

Production completion is reached only when all of the following are true:
- `main` is green on all automated gates
- there are no open release or production PRs
- release artifact docs reflect the current shipped build
- manual signoff exists for web, Android, multiplayer, modifiers, and campaign surfaces
- remaining items in `docs/STATE.md` are either closed or explicitly moved to a post-production backlog

## Out of Scope

- replacing the existing ECS/runtime/event architecture
- adding pay-to-win or balance-changing store effects
- widening platform scope beyond current web + Android production targets
