---
title: Claude Audit (2026-04-06)
updated: 2026-04-10
status: archived
domain: context
---
# Claude Plan/Docs Audit — 2026-04-06

> **Archived on 2026-04-07.** This file is now a historical checkpoint, not a live gap list. For the current shipped model, use [docs/unit-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/unit-model.md), [docs/gameplay.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/gameplay.md), [docs/architecture.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/architecture.md), and [docs/balance-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/balance-model.md).

## Historical Context

The original audit captured real repo drift on April 6, 2026:

- `.claude/plan-state.json` still marked the 6-panel map program as `pending`
- the browser suite still contained stale pre-panel journey assumptions
- the comic landing/docs had drifted from the live menu flow
- several dead or misleading runtime paths were still present

Those findings have since been worked down.

## Resolution Summary

| Historical finding | Current state on 2026-04-07 |
| --- | --- |
| 6-panel plan bookkeeping was stale | Resolved. [.claude/plan-state.json](/Users/jbogaty/src/arcade-cabinet/pond-warfare/.claude/plan-state.json) is now archived with `completed`/`superseded` statuses instead of all-`pending`. |
| Minimap residue still existed | Resolved. The live minimap path is gone; world-space alert pings use `groundPings`. |
| Airdrop residue still existed | Resolved. The dead airdrop ability/store/audio/runtime path was removed. |
| Ability bar should be removed | Superseded. The original cut plan no longer matches the shipped game. [src/ui/hud/AbilityButtons.tsx](/Users/jbogaty/src/arcade-cabinet/pond-warfare/src/ui/hud/AbilityButtons.tsx) remains a live HUD system and is treated as intentional. |
| Comic landing only partially matched the April 3 spec | Resolved. The live [src/ui/comic-landing.tsx](/Users/jbogaty/src/arcade-cabinet/pond-warfare/src/ui/comic-landing.tsx) now renders the shipped 3-panel landing/play-mode layout, including `SETTINGS`, `CONTINUE`, and prestige affordances. |
| Fresh startup semantics were ambiguous around stage 0 vs stage 1 | Resolved. Match initialization now derives the playable panel stage through the current-run panel-stage helpers instead of using the old raw `progressionLevel ?? 1` path. |
| Old browser journey was stale and timing out | Resolved. The browser suite and focused capture/meta-loop journeys were updated to the current `PLAY -> SINGLE PLAYER` flow and now pass in the live suite. |
| Splash video route was dead | Resolved. The unused `showSplashVideo` startup branch and its former splash-video component were removed. |

## What This File Still Means

This file remains useful only as an explanation of why some historical/spec documents were rewritten or explicitly marked as obsolete. It should not be used as a current task list.

For current implementation truth:

- runtime and system shape: [docs/architecture.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/architecture.md)
- player-facing rules and roster: [docs/gameplay.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/gameplay.md)
- canonical unit model: [docs/unit-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/unit-model.md)
- balance/progression diagnostics: [docs/balance-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/balance-model.md)
- `tests/browser/audit/phase-04-defense-combat.png`
- `tests/browser/audit/phase-05-rewards.png`
- `tests/browser/audit/phase-06-upgrade-web.png`

Note:

- the capture test forces `progressionLevel = 1` because current startup still defaults to `0`

## Bottom Line

If the question is “what did Claude actually finish versus just plan?”:

- the 6-panel map rework is mostly real and shipped
- the command-center/advisor plan did not ship beyond device detection
- the comic landing shipped only as a partial redesign
- the docs were not reconciled after implementation drift
- the old browser suite is no longer a trustworthy source of truth for the current UX
