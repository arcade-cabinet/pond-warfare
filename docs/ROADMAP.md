# Pond Warfare — Feature Roadmap

Current state: v1.3.0 — 962 tests, 9/10 polish rating.
Strong foundation: 5 tech branches, 7 commanders, 6 scenarios, terrain system, advisor system, classic RTS game feel.

---

## HORIZONTAL EXPANSION (Breadth — more things to do)

### H1. More Unit Types
The game has 8 player unit types. Classic RTS games have 12-15. Ideas:
- **Otter Diver** — stealth unit that can hide underwater (only on Water/Shallows tiles), ambush enemies
- **Otter Engineer** — faster building construction, can repair buildings, can build temporary bridges over Water tiles
- **Otter Shaman** — area heal over time (aura), requires Nature branch Deep Diving tech
- **Otter Berserker** — high damage but loses HP over time (rage mechanic), unlocked via Shadow branch
- **Otter Siege Tower** — slow mobile structure that provides high-ground range bonus to units nearby

### H2. More Enemy Types
Currently 6 enemy types (Gator, Snake, Armored Gator, Venom Snake, Swamp Drake, Siege Turtle, Alpha Predator). Add:
- **Burrowing Worm** — appears from underground, bypasses walls, anti-gathering (attacks resource nodes)
- **Flying Heron** — ignores terrain, fast, weak, scouts for the enemy AI
- **River Croc** — only spawns on Water tiles, fast in water, slow on land
- **Swamp Witch** — ranged AoE debuff (slows player units in area), rare late-game

### H3. More Buildings
- **Watchtower** — already exists but add: upgradeable to Lighthouse (reveals larger fog area)
- **Market** — passive income building, trades excess twigs for clams (or vice versa)
- **Dock** — trains water units (Diver, Swimmer), must be placed on Shallows
- **Shrine** — one-time use activated buildings that cast powerful abilities (earthquake, flood, heal wave)
- **Wall Gate** — allows friendly units through walls but blocks enemies

### H4. More Map Scenarios
6 exist. Add:
- **Archipelago** — multiple small islands connected by shallow bridges, water combat matters
- **Ravine** — deep canyon with high ground on both sides, bridge chokepoints
- **Swamp** — mostly Mud/Shallows terrain, movement is slow everywhere, favors defensive play
- **Volcano** — periodic eruptions damage random areas, forces constant relocation
- **Frozen Pond** — water tiles are passable (frozen), but thaw periodically making them impassable

### H5. Game Modes
Currently: Skirmish + Campaign. Add:
- **Survival Mode** — endless waves with increasing difficulty, leaderboard for longest survival time
- **Rush Mode** — start with Armory built, 30-second peace, pure combat
- **Eco Challenge** — score based on resources gathered, no combat, pure economy optimization
- **King of the Hill** — hold a central point for cumulative time, enemies try to take it
- **Puzzle Missions** — fixed starting units, specific objectives, no building (tactical puzzles)

### H6. Cosmetic Depth
11 cosmetics exist. Add per-branch visual themes:
- **Lodge theme**: Units get leaf/vine decorations
- **Nature theme**: Units glow with healing aura particles
- **Warfare theme**: Units get battle scars and weapon particles
- **Fortification theme**: Units get shield/armor visual overlay
- **Shadow theme**: Units get dark mist trail

### H7. Commander Abilities (Active)
Commanders currently have passive auras. Add 1 active ability per commander with cooldown:
- **Marshal**: "Charge!" — selected units move 2x speed for 5s (90s cooldown)
- **Sage**: "Eureka!" — instantly complete current research (180s cooldown)
- **Warden**: "Fortify!" — all buildings invulnerable for 10s (120s cooldown)
- **Tidekeeper**: "Tidal Wave" — push all enemies away from Lodge (90s cooldown)
- **Shadowfang**: "Vanish" — all units invisible for 8s (120s cooldown)
- **Ironpaw**: "Iron Will" — all units immune to damage for 5s (150s cooldown)
- **Stormcaller**: "Thunder Strike" — massive AoE damage at target location (120s cooldown)

---

## VERTICAL EXPANSION (Depth — making existing things richer)

### V1. Visual Polish
- **Sprite animations** — currently static pixel art. Add 2-3 frame walk cycles, attack swings, idle fidgets
- **Water rendering** — animated water tiles with ripple shader (use the Water Ripples PNG assets)
- **Day/night lighting** — exists but could be richer: firefly particles at night, warm sunrise/sunset colors
- **Weather effects** — rain (slows movement on grass, fills shallows), fog (reduces vision), wind (affects projectile trajectories)
- **Building construction animation** — scaffolding stages instead of instant appear with progress bar
- **Tech research visual** — spinning scroll or glowing runes at the Lodge during research

### V2. AI Depth
- **AI personalities actually feel different** — turtle should visibly build walls, rush should attack early, economic should expand
- **AI scouting** — enemy sends scouts that player can kill for intel denial
- **AI adapts to player** — if player goes all melee, AI builds more ranged; if player turtles, AI builds siege
- **AI alliances** — in multi-enemy scenarios, enemy nests can coordinate attacks
- **AI taunts** — enemy commander sends bark messages ("Your pond is mine!")

### V3. Economy Depth
- **Resource trading** — excess twigs → clams at a Market building (exchange rate varies)
- **Supply lines** — gatherers path through dangerous territory, can be raided
- **Resource scarcity escalation** — nodes deplete faster in late game, forcing expansion
- **Pearl economy** — make pearls more central (currently gated behind Deep Diving which is late)
- **Economic victory** — accumulate N total resources as an alternative win condition

### V4. Combat Depth
- **Elevation advantage** — already exists via HighGround (+25% range). Add: +10% damage from high ground, -10% damage attacking uphill
- **Flanking bonus** — units attacking from behind deal +25% damage
- **Morale system** — units near the Commander fight harder, units far away or outnumbered fight worse
- **Retreat mechanic** — units below 25% HP auto-retreat to nearest friendly building (can be overridden)
- **Siege mechanics** — walls need to be breached before attacking buildings behind them

### V5. Campaign Depth
- **Branching missions** — after Mission 3, choose Mission 4A (offense path) or 4B (defense path)
- **Campaign difficulty** — separate from skirmish difficulty, auto-scales based on player performance
- **Story cinematics** — brief illustrated scenes between missions explaining the pond conflict
- **Mission rewards** — completing missions unlocks specific commanders/cosmetics/scenarios
- **New Game+** — replay campaign with all unlocks, harder enemies, new objectives

### V6. Multiplayer Preparation
Not implementing multiplayer yet, but design for it:
- **Replay system** — record all inputs, allow playback (already partially exists via ReplayRecorder)
- **Observer mode** — watch a replay with full map vision
- **Ghost units** — review your own game with "what if" alternate commands
- **Shared saves** — export/import save files for challenge sharing

### V7. Accessibility Expansion
- **Colorblind modes** — exists but verify all game information is conveyed without color
- **Screen reader** — announce game events via aria-live regions
- **One-handed mode** — all actions possible via touch-only (no keyboard required)
- **Speed control** — 0.5x speed option for players who need more time
- **Tutorial skip** — advisors can be disabled, but add "skip to late game" debug option

---

## INFRASTRUCTURE (CI/CD + Mobile)

### I1. Maestro Mobile Testing
- Set up Maestro flows for automated mobile UI testing
- Test flows: new game → start → play 60s → verify HUD renders
- Test flows: accordion navigation, settings persistence, commander selection
- Run on Android emulator in CI

### I2. Auto-Merge Release Workflow
- Fix the auto-merge workflow (currently skipped — was broken in PR #12)
- Release-please creates PR → CI passes → auto-merge → deploy
- Dependabot PRs auto-merge after CI

### I3. Android Debug APK Builds
- Capacitor Android build in CI
- Debug APK artifact attached to each release
- Signed release APK for Play Store (future)
- Test on real device via Maestro + adb

### I4. GitHub Pages Deploy Verification
- After CD deploys, run a smoke test against the live URL
- Verify PWA service worker updates correctly
- Cache-bust verification (old SW releases new assets)

---

## PRIORITY RANKING

### Next Sprint (v1.4.0) — Visual + Variety + Mobile
1. **I2+I3: Auto-merge workflow + Android debug APK** (unblocks mobile testing and releases)
2. **I1: Maestro mobile testing** (verify the game works on real devices)
3. **V1: Sprite walk cycles** (biggest visual impact — units feel alive instead of sliding)
4. **H4: 2-3 new map scenarios** (Archipelago, Ravine, Swamp — uses terrain system)
5. **H5: Survival Mode** (huge replayability boost, uses existing wave system)
6. **V2: AI personality differentiation** (make the 5 personalities feel meaningfully different)
7. **H7: Commander active abilities** (each commander becomes a strategic choice, not just passives)

### Following Sprint (v1.5.0) — Depth
6. **V4: Flanking + elevation damage bonuses** (combat becomes more tactical)
7. **H1: 2-3 new player units** (Diver, Engineer, Shaman)
8. **V3: Resource trading via Market** (economy gets a new dimension)
9. **H2: 2 new enemy types** (Burrowing Worm, Flying Heron)
10. **V5: Campaign branching** (replay value for campaign)

### Future (v2.0.0) — Expansion
11. **V1: Weather effects** (changes gameplay each match)
12. **H3: Dock + water units** (opens water combat as a strategic layer)
13. **V6: Replay system** (competitive foundation)
14. **H5: Puzzle Missions** (different gameplay mode entirely)
15. **H6: Branch-themed cosmetics** (visual reward for tech specialization)
