---
title: Outstanding Work
updated: 2026-04-16
status: current
domain: planning
---

# Outstanding Work

This is the canonical inventory of remaining product work after branch and PR triage on 2026-04-16.

## Branch / PR State

- Open pull requests: `0`
- Mergeable non-`main` remote branches: `0`
- Remaining remote branch outside `main`: `feat/v3.1-commander-flow`

## Stale Branch Disposition

`feat/v3.1-commander-flow` is not an active merge candidate.

Why:
- it diverged before the current production release line landed
- it conflicts with `main` across core configs, runtime, UI, and tests
- it contains pre-release structural experiments, not a reviewable incremental delta
- it has no open PR or active review surface

Action:
- do not merge it wholesale
- if commander ideas are still wanted later, rebuild them from fresh branches off `main`
- once this cleanup lands, delete the stale remote branch so `main` is the only active production branch

## Canonical Remaining Product Work

### 1. Single-Player Hardening

- narrow-screen modal layout
- Upgrade Web overflow on narrow landscape tablets
- radial menu placement near screen edges
- tower-upgrade application delay
- audio cold-start lag / pre-warm behavior
- Yuka overshoot tolerance
- corpse and particle throttling under high-death bursts

Required proof:
- browser layout coverage for menu, rewards, rank-up, settings, and Upgrade Web on narrow widths
- deterministic regression for tower-upgrade timing
- audio initialization contract coverage
- ECS/render stress coverage for high-death bursts

### 2. Multiplayer Production Surface

- room creation and join UX
- connection lifecycle UI
- reconnect / disconnect recovery
- replay / checksum visibility for desync diagnosis
- explicit unsupported-platform/build handling where needed

Required proof:
- create/join/leave happy path
- disconnect/reconnect/fail-closed behavior
- checksum/desync reporting path
- deterministic replay sync round-trip

### 3. Custom Modifiers

- pre-match modifier selection from the menu shell
- deterministic runtime behavior changes
- rewards/history/leaderboard payloads record active modifiers

### 4. Campaign

- mission wrappers over the current defend-the-Lodge runtime
- objective state, persistence, retry, and resume behavior
- scripted progression using the existing event/template stack

### 5. Cosmetics / Store

- canonical ownership and equip-state persistence
- visible cosmetic surfaces in menu, match, and rewards
- cosmetic-only store policy, no competitive stat effects

## Execution Rule

Until the roadmap above is complete:
- branch from `main`
- keep exactly one active production PR at a time unless parallel work is truly independent
- squash merge to `main`
- delete stale feature branches after integration
