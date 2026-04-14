---
title: Playtest Personas (Historical)
updated: 2026-04-10
status: stale
domain: quality
---

# Paper Playtest — Persona Walkthroughs

> **Note:** This file predates the canonical `Mudpaw` plus trainable Pearl specialist model. References to `Gatherer`, `Fighter`, free match-start specialist auto-deploy, or the old "deleted ability bar" discussion should be read as historical terminology unless explicitly updated below. See [docs/unit-model.md](unit-model.md).

## Persona 1: "Casual Carly" — Phone, bus commute, 5 min sessions

**Device**: iPhone 14, portrait → forced landscape (667×375 viewport)
**Attention**: Low. Taps quickly, doesn't read tooltips.
**Goal**: Kill time, feel powerful.

### Session 1 (First launch):
1. Sees comic panels. "Cute characters." Taps PLAY immediately.
2. Panel 5 fills screen. Lodge at bottom. 4 tiny units near it.
3. Doesn't know what to do. Taps a unit. Nothing obvious happens (no radial — pointer events may not trigger on first tap).
4. **PROBLEM**: No onboarding. No tutorial. First-time player is lost.
5. Eventually taps Lodge by accident. If radial works: sees "Train Mudpaw" but doesn't know why.
6. Enemies arrive from top. Units auto-engage (if aggressive stance). Carly watches.
7. Match ends — win or lose in 2-3 minutes.
8. Rewards screen: "+18 Clams". Taps PLAY AGAIN.

**Issues found**:
- No onboarding/tutorial for first-time players
- Radial menu may not trigger on touch (simulated pointer events didn't work in DevTools)
- No indication of what to DO ("gather resources", "defend Lodge")
- Auto-aggressive units may play the game for her at stage 1

### Session 5 (returning):
1. Has earned some Clams. Taps UPGRADES.
2. Sees upgrade web. 240 nodes. Overwhelmed. "What do I buy?"
3. **PROBLEM**: No recommended path or "Buy Next" suggestion.
4. Buys random Basic Fish Gathering. Goes back. Taps PLAY.
5. Game feels slightly better (5% gather boost). Barely noticeable.

**Issues found**:
- Upgrade web has no guidance for new players
- +5% per upgrade is imperceptible — first purchases should feel impactful

---

## Persona 2: "Hardcore Henry" — Tablet, 20 min sessions, ex-StarCraft

**Device**: iPad Air, landscape (1194×834 viewport)
**Attention**: High. Reads everything. Wants depth.
**Goal**: Master the meta, optimize builds, push prestige.

### Session 1:
1. Reads comic panels. Appreciates the art. Taps UPGRADES first to study the web.
2. Analyzes categories, costs, diamond nodes. Plans a build order.
3. "I need Frontier Expansion I to unlock panel 2 for logs."
4. Taps PLAY. Immediately drag-selects all units. Right-clicks resource.
5. Mudpaw goes to fish node. "Where's the attack-move?"
6. **PROBLEM**: A-Move button was removed with ability bar. No way to attack-move on tablet without keyboard.
7. Taps Lodge for radial. "Train Mudpaw" — queues 3. Good.
8. Manages economy. Waves arrive. Handles them.
9. Wins. Rewards: +45 Clams. Goes to upgrade web. Buys efficiently.

**Issues found**:
- No attack-move command accessible via tap (keyboard A was the shortcut, button was in the deleted ability bar)
- No way to set rally points via tap (Shift+right-click is keyboard-only)
- Missing in-game commands that were on the old HUD buttons

### Session 10 (mid-game):
1. Has Frontier Expansion I. Panel 2 unlocked.
2. Zooms out to see both panels. Good.
3. Sends a Mudpaw into panel 2 to scout ahead. Fog reveals muddy forest + log groves.
4. Sends Mudpaw to collect logs. "Now I can repair."
5. Enemies from panel 2 top. Two-front pressure.
6. "I need the radial to issue attack commands faster."
7. **PROBLEM**: Radial menu auto-dismisses in 3 seconds — too fast for planning.

**Issues found**:
- Radial dismiss timer too aggressive for strategic play
- No "command queue" (shift-click to queue orders)

---

## Persona 3: "Prestige Pete" — Phone, idle/clicker veteran, 100+ hours

**Device**: Android phone, landscape (800×360 viewport)
**Attention**: Medium. Wants to see numbers go up.
**Goal**: Prestige as many times as possible. Unlock and field autonomous specialists.

### Session 50 (prestige rank 3):
1. Has unlocked Fisher, Digger, and Guard blueprints, with several radius/cap ranks.
2. Taps PLAY. Match starts. Pete still needs to spend in-match resources to field specialists.
3. Pete trains a Fisher and a Digger, then assigns each to a terrain radius near the Lodge economy lanes.
4. Pete trains a Guard and assigns it to a defensive radius while manually directing Mudpaws and combat units.
5. Wave 3 arrives. Specialists operate inside their assigned zones while Pete focuses on fort placement and manual reactions.
6. **PROBLEM**: Fort slot placement requires tapping empty slots near Lodge, but at 800×360 viewport, slots may be too small to tap accurately.

### Session 100 (prestige rank 5):
1. Has Frontier Expansion III (4 panels).
2. Enemies from 3 directions. Pete zooms out to see all.
3. At 800×360, zoomed out to show 4 panels = each panel is 200×180 pixels. Units are 8px dots.
4. **PROBLEM**: At max zoom-out, everything is too small on phone to interact with.
5. Pete needs to zoom in to tap, zoom out to assess. Constant zoom dance.

**Issues found**:
- Fort slots need generous tap targets (44px+) at all zoom levels
- Max zoom-out on small phones makes units untappable
- Need a "zoom to action" shortcut (tap notification → zoom to threat)

---

## Persona 4: "Accessibility Alex" — Screen reader + keyboard only

**Device**: Desktop with screen reader (NVDA/VoiceOver)
**Attention**: High, but relies on audio cues and ARIA labels.

### Session 1:
1. Comic landing: reads "Pond Warfare. Ready for battle? Play button."
2. **WORKS**: ComicPanel has aria-labels, buttons have proper roles.
3. Tabs to PLAY. Presses Enter. Game starts.
4. **PROBLEM**: Game canvas is completely inaccessible to screen reader.
5. PixiJS renders on canvas — no DOM elements for units/buildings.
6. Screen reader says nothing about game state.

**Issues found**:
- In-game experience is 100% inaccessible to screen readers
- This is expected for a canvas-based RTS, but:
  - Resource counts in TopBar SHOULD be aria-live (are they?)
  - Wave announcements should be aria-live
  - Game over should be announced

---

## Summary: Critical Gaps Found

| Issue | Personas Affected | Priority |
|-------|------------------|----------|
| No onboarding / first-time tutorial | Casual Carly | CRITICAL |
| Radial menu may not trigger on real touch | All mobile | CRITICAL |
| No attack-move command via tap | Hardcore Henry | HIGH |
| No rally point via tap | Hardcore Henry | HIGH |
| Upgrade web has no guidance | Casual Carly | HIGH |
| +5% per upgrade is imperceptible | Casual Carly | MEDIUM |
| Radial auto-dismiss too fast (3s) | Hardcore Henry | MEDIUM |
| Fort slots too small at some zoom levels | Prestige Pete | MEDIUM |
| Max zoom-out makes units untappable on phones | Prestige Pete | MEDIUM |
| No zoom-to-action shortcut | Prestige Pete | LOW |
| Canvas inaccessible to screen readers | Accessibility Alex | LOW (expected) |
| No command queue (shift-click) | Hardcore Henry | LOW |
