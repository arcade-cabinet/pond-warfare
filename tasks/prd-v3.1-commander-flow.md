# PRD: v3.1 — Commander System, Match Flow, Prestige Loadout

## Overview

Complete the v3 game loop: Commanders as battlefield units, match end via Commander kill, ephemeral Clam upgrades between matches, Pearl loadout builder with select-one-of-N, starting tier prestige unlock, and enemy Commanders as bosses.

---

## Match Flow (Final)

```
TAP "PLAY"
  → SQLite loads save (OPFS/Android). Continue or new game seamlessly.
  → Match starts. Your Commander + units spawn at Lodge (panel 5).
  → Gather fish/rocks/logs. Train units. Fortify. Fight.
  → Enemy waves arrive. Enemy Commander appears (stage 2+).
  → Match ends when:
      • Enemy Commander killed → INSTANT WIN
      • Your Commander killed → INSTANT LOSS
      • Enemy Lodge destroyed + all enemies dead → WIN
      • Your Lodge destroyed + all your units dead → LOSS
      • Lodge alive but all units dead → KEEP PLAYING (train more)
  → Rewards screen: Clams earned
  → Clam upgrade screen: spend Clams on ephemeral web (240+ nodes)
  → Play next match (upgrades apply)
  → When progression slows → RANK UP pulses
  → Rank Up: earn Pearls, Clam upgrades RESET, run restarts
  → Pearl upgrades persist forever (loadout builder)
```

---

## User Stories

### US1: Commander as Battlefield Unit

**As a** player, **I want** my Commander to be a unit on the map that I must protect, **so that** there's a constant high-stakes element to every match.

**Acceptance Criteria:**
- [ ] Commander spawns next to Lodge at match start
- [ ] Commander is a special entity with HP, damage, speed, aura
- [ ] Commander stats and abilities read from commanders section in units.json (or new commanders.json)
- [ ] Commander aura applies to nearby friendly units (damage boost, speed, heal — depends on commander type)
- [ ] Commander active ability fires on tap (radial action or auto-symbol)
- [ ] Commander has unique pixel art sprite (distinct from regular units)
- [ ] Commander HP bar visible, larger than regular units
- [ ] If Commander HP reaches 0 → instant game over (loss)
- [ ] Commander cannot be retrained if killed (one per match)
- [ ] Default Commander: Marshal (free, unlocked at start)

### US2: Enemy Commander (Boss)

**As a** player facing escalating challenges, **I want** enemy Commanders that get harder with progression, **so that** each stage introduces a new boss threat.

**Acceptance Criteria:**
- [ ] No enemy Commander at stage 1 (wave-survival only)
- [ ] Stage 2-3: Basic enemy Commander spawns near enemy Lodge (low HP, simple attack, small aura)
- [ ] Stage 4-5: Mid-tier enemy Commander (more HP, abilities, guards)
- [ ] Stage 6: Full boss Commander (multiple abilities, heavily guarded, large aura)
- [ ] Enemy Commander stats scale with progression level from JSON config
- [ ] Killing enemy Commander → instant win
- [ ] Enemy Commander has visible HP bar, distinct sprite
- [ ] Enemy Commander uses abilities periodically (from config)

### US3: Commander Death = Instant Win/Lose

**As a** player, **I want** Commander assassination to be a viable strategy, **so that** there are multiple paths to victory.

**Acceptance Criteria:**
- [ ] Game-over system checks Commander HP every frame
- [ ] Your Commander death → instant loss, skip to rewards screen
- [ ] Enemy Commander death → instant win, skip to rewards screen
- [ ] Death triggers dramatic visual (screen flash, slow-mo, floating text "COMMANDER FALLEN")
- [ ] Both Commanders dying same frame → draw (player wins tiebreak)
- [ ] Lodge destruction does NOT end the game — only cuts off training

### US4: Clam Upgrade Screen After Each Match

**As a** player between matches, **I want** to spend my earned Clams on upgrades, **so that** each match makes me stronger for the next.

**Acceptance Criteria:**
- [ ] After rewards screen → Clam upgrade screen appears (the 240-node procedural web)
- [ ] Player spends Clams on nodes (same UI as current UpgradeWebScreen)
- [ ] Upgrades are EPHEMERAL — persist across matches within a run, reset on prestige
- [ ] "Continue" button on upgrade screen → starts next match with upgrades applied
- [ ] Upgrade screen NOT accessible from main menu (only between matches)
- [ ] On first match of a run, upgrade screen is skipped (no Clams to spend)
- [ ] Highlight cheapest affordable node (existing feature)

### US5: Pearl Upgrade Screen = Loadout Builder

**As a** prestige player, **I want** the Pearl screen to be a loadout builder where I configure permanent upgrades and select my Commander, **so that** I can customize my strategy between prestiges.

**Acceptance Criteria:**
- [ ] Accessible from main menu "UPGRADES" button
- [ ] Shows Pearl balance at top
- [ ] Sections:
  - **Commander Select** (select-one-of-N): unlocked commanders shown as pixel art portraits, tap to activate. Shows passive + active ability description. Only one active at a time.
  - **Auto-Deploy** (permanent, stackable): sliders for Fisher/Digger/Logger/Guardian/etc. count per rank
  - **Multipliers** (permanent, stackable): gathering speed, damage, HP, Clam earnings
  - **Starting Tier** (permanent, stackable): sets minimum tier for Clam upgrades after prestige (Basic → Enhanced → Super → ... → Colossal → etc.)
  - **Cosmetics** (select-one-of-N): outfits, effects — future
- [ ] Select-one-of-N items show checkmark on active selection
- [ ] Permanent items show rank bar and purchase button
- [ ] All styled with Frame9Slice vine borders and design tokens

### US6: Starting Tier Pearl Upgrade

**As a** prestige veteran, **I want** to skip the early Clam grind, **so that** each prestige feels like meaningful progress.

**Acceptance Criteria:**
- [ ] New Pearl upgrade category in prestige.json: "starting_tier"
- [ ] Each rank unlocks a higher starting tier: rank 1 = Enhanced, rank 2 = Super, ..., rank 8 = Mythic
- [ ] Cost scales: 20, 40, 80, 160, 320, 640, 1280, 2560 Pearls
- [ ] On prestige reset: Clam web auto-fills all nodes up to the starting tier (free)
- [ ] The auto-filled nodes don't cost Clams — they're the prestige reward
- [ ] Visual: nodes below starting tier show as "PRESTIGE" locked state (gold, not purchasable, already active)

### US7: PLAY Button Loads Save Seamlessly

**As a** player, **I want** to tap PLAY and immediately be in my game, **so that** there's zero friction between launching and playing.

**Acceptance Criteria:**
- [ ] PLAY taps → check SQLite for existing save
- [ ] If save exists: load world state, resume where player left off (same match, same units, same position)
- [ ] If no save: create new world, start fresh match
- [ ] No modal, no choice, no "Continue vs New Game"
- [ ] Save happens automatically: after each match, on app backgrounding, on match pause
- [ ] World state serializable to SQLite: entity positions, HP, resources, wave progress, Commander state
- [ ] Loading screen while deserializing (if needed)

### US8: Rank Up = Prestige = New Run

**As a** player whose progression has stalled, **I want** Rank Up to restart my run with Pearl rewards, **so that** I always have a reason to keep playing.

**Acceptance Criteria:**
- [ ] RANK UP button appears on post-match rewards screen when progression_level > threshold
- [ ] Tap RANK UP → confirmation showing: Pearls to earn, what resets, what persists
- [ ] On confirm: rank increments, Pearls awarded, Clam upgrades reset, current_run SQLite cleared
- [ ] Starting tier auto-fills Clam web to prestige tier
- [ ] Specialist auto-deploy applies from Pearl upgrades
- [ ] Selected Commander persists from Pearl loadout
- [ ] Next match starts fresh but with all Pearl power active
- [ ] Rank Up IS the "new game" — there is no other way to restart

### US9: Menu Screen Simplification

**As a** player, **I want** the menu to be three buttons, **so that** I'm never confused about what to do.

**Acceptance Criteria:**
- [ ] **PLAY** — loads save and goes straight to game
- [ ] **UPGRADES** — Pearl loadout builder (US5). Only accessible when rank > 0 or when Pearls > 0.
- [ ] **SETTINGS** — audio, accessibility, controls
- [ ] No Clam upgrade web on menu (it's between matches)
- [ ] Comic panel layout with SVG heroes and speech bubbles (existing)
- [ ] Version text at bottom

### US10: Commander Pixel Art Portraits

**As a** player browsing commanders, **I want** each commander to have distinct pixel art, **so that** they feel like unique characters worth unlocking.

**Acceptance Criteria:**
- [ ] 7 commander portraits in pixel art style matching existing unit sprites
- [ ] Marshal: armored otter with sword
- [ ] Sage: robed otter with staff and book
- [ ] Warden: heavy otter with shield and tower insignia
- [ ] Tidekeeper: swimming otter with wave motif
- [ ] Shadowfang: dark-cloaked otter with glowing eyes
- [ ] Ironpaw: bulky otter with metal gauntlets
- [ ] Stormcaller: otter with lightning crackling
- [ ] Portraits render in Pearl loadout screen and in-game HUD
- [ ] On the battlefield, Commander sprite is 2x normal unit size for visibility
- [ ] Pixel art created procedurally or as SVG (like existing SpriteOtter/Croc/Snake)

---

## Implementation Notes

- Commander entity: new EntityKind.Commander + SpriteId.Commander in types.ts
- Commander component: new ECS component tracking which commander type, cooldowns, aura radius
- Game-over check: add Commander HP check alongside Lodge HP check in health system
- Clam upgrade screen: move UpgradeWebScreen from menu rendering to post-match rendering in app.tsx
- Pearl loadout: rewrite PearlUpgradeScreen with select-one-of-N sections
- Starting tier: new prestige.json category, auto-fill logic in upgrade-web-state.ts
- Save/load: world state serialization to SQLite (entity snapshot system)
- Enemy Commander: new enemy entity type, AI behaviors, scaling from enemies.json

## Testing

- Commander spawns at match start, dies = instant game over
- Enemy Commander kill = instant win
- Clam upgrades persist across matches, reset on prestige
- Starting tier auto-fills correct nodes
- Pearl loadout selection persists
- PLAY seamlessly loads/creates save
- Rank Up resets Clam state, preserves Pearl state
- Commander portraits render at all sizes
- E2E: full match → rewards → Clam upgrade → next match → prestige flow

## Success Criteria

| Metric | Target |
|--------|--------|
| Win conditions | 2 (Commander kill, extermination after Lodge) |
| Lose conditions | 2 (Commander death, extermination after Lodge) |
| Commander types | 7 (1 free, 6 Pearl-unlocked) |
| Pearl upgrade categories | 5 (Commander, Auto-Deploy, Multipliers, Starting Tier, Cosmetics) |
| Clam upgrade persistence | Ephemeral per-run, reset on prestige |
| Tap PLAY to in-match | < 2 seconds (continue) or < 4 seconds (new) |
| Starting tier range | Basic through Mythic (8 ranks) |
