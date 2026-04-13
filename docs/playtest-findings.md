---
title: Playtest Findings (Historical)
updated: 2026-04-10
status: stale
domain: quality
---
> **NOTE (v3)**: These findings are from v1/v2 playtests. Some terminology is obsolete. References to `Gatherer`, `Brawler`, or other older unit names should be translated through the current unit model in [docs/unit-model.md](/Users/jbogaty/src/arcade-cabinet/pond-warfare/docs/unit-model.md). Treat the quoted tutorial prompts and build-order examples below as historical player feedback, not as the live UI or current opening flow.

# Playtest Findings - 5 Player Personas

## Critical Issues (fix immediately)

### 1. No Tutorial / Onboarding

- **Affected:** Sarah (casual), Pat (accessibility) - 60% of potential players
- **Fix:** Add guided first-game experience with tooltip prompts:
  - "Click a Gatherer to select it" → "Right-click a resource to gather"
  - "Build an Armory before enemies arrive" at 1:00
  - "Train Brawlers to defend your Lodge" at 1:30
- **Priority:** P0

### 2. Objective Display Missing
- **Affected:** All personas, especially Pat and Sarah
- **Fix:** Persistent objective bar: "GOAL: Destroy 2 Enemy Nests (0/2)"
- Show nest markers on minimap (red pulsing dots)
- **Priority:** P0

### 3. Accessibility Settings
- **Affected:** Pat (elderly), anyone with vision/motor impairments
- **Fix:** Settings panel additions:
  - Font size slider (small/medium/large/extra-large)
  - Screen shake toggle (on/off)
  - UI scale slider (1x/1.5x/2x)
  - Reduce visual noise toggle
- **Priority:** P0

### 4. Easy Mode Peace Timer
- **Affected:** Sarah, Yuki, Pat
- **Current:** 2 minutes (7200 frames) on all difficulties
- **Fix:** Easy=4 min, Normal=2 min, Hard=1 min (already set for hard/nightmare)
- Easy mode should give enough time for auto-behaviors to ramp
- **Priority:** P1

### 5. Early Game Twig Bottleneck
- **Affected:** Marcus (build order), Sarah (can't build Armory)
- **Current:** Starting 100T, Armory costs 120T, Cattail gives 15T/trip
- **Fix options:**
  - Increase starting Twigs to 150
  - OR reduce Armory twig cost to 80T
  - OR increase Cattail gather rate for Twigs
- **Priority:** P1

## Persona-Specific Findings

### Sarah (Casual Mobile) - Drop-off risk: VERY HIGH
- Needs: Tutorial, larger peace timer, reduced first wave
- Fun at: T=0:30 (first gather), T=5:30 (first Brawler)
- Quits at: T=2:30 (enemies kill gatherers, no military)

### Marcus (RTS Veteran) - Drop-off risk: LOW
- Needs: Damage multiplier tooltips, build order display
- Optimal strategy: Rush Armory → 10 Brawlers → attack T=4:45
- Wins at: T=11:30 with Brawler+Sniper mixed army
- Issue: Twig bottleneck delays Armory by 30-60 seconds

### Yuki (Idle Fan) - Drop-off risk: MEDIUM
- Needs: Smarter auto-behaviors, idle mode difficulty
- Auto-defend fails at T=2:00 (no Armory yet)
- Stalemate at T=5:00-20:00 (boring)
- Suggestion: Auto-tech research, pre-peace unit training

### Jake (Speedrunner) - Drop-off risk: NONE
- Optimal speedrun: 11:30 (Normal difficulty)
- Strategy: Rush Armory → mass Brawler → Sniper mid-game → focus nests
- Needs: In-game timer, leaderboards, challenge modes

### Pat (Accessibility) - Drop-off risk: VERY HIGH
- Cannot read UI text (12-14px too small)
- Touch targets acceptable (44px min) but sprite selection is hard (40px)
- Screen shake is disorienting
- Has no idea what the objective is
- Auto-mode is her lifeline but isn't sufficient alone
