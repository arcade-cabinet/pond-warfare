# Pond Warfare -- Feature Roadmap

Current state: v2.0.0+ -- 1327 tests, 40 achievements, 10 puzzles, 5 game modes, P2P co-op multiplayer.

---

## COMPLETED MILESTONES

### v1.4.0 -- Visual + Variety + Mobile (DONE)

- Sprite walk cycles and idle animations
- 3 new map scenarios (Archipelago, Ravine, Swamp -- 9 total)
- Survival Mode (endless waves, score-based)
- AI personality differentiation (5 personalities feel meaningfully different)
- Commander active abilities (7 unique abilities with cooldowns)
- Maestro mobile testing + Android CI
- Auto-merge workflow + Android debug APK

### v1.5.0 -- Depth (DONE)

- Flanking + elevation damage bonuses (positional combat)
- Morale system + auto-retreat mechanic
- 4 new player units: Diver, Engineer, Shaman, Berserker
- Market building (resource trading)
- 2 new enemy types: Burrowing Worm, Flying Heron
- Campaign branching after Mission 3 (path A/B)

### v2.0.0 -- Expansion (DONE)

- Weather system (4 types: Clear, Rain, Fog, Wind)
- Naval combat: Dock building, Otter Warship
- Replay system (record + playback with speed control)
- 10 puzzle missions (was 5, added 5 advanced puzzles)
- Branch-themed cosmetics (Lodge, Nature, Warfare, Fortifications, Shadow visual themes)
- Berserker rage mechanic (damage scales with low HP)
- Wall Gate building (allies pass, enemies blocked)
- Shrine building (one-time powerful ability)
- P2P co-op multiplayer (Trystero/WebRTC, deterministic lockstep)
- Campaign briefing screen with recommended tech branches
- Daily challenges (15 rotating objectives with XP rewards)
- XP/level system (performance-based progression)
- Match history (last 50 games stored in SQLite)
- 8 random in-game event types (seeded for determinism)
- 40 achievements (was 26)
- Unlock progression display + next-unlock hint
- Deterministic dual-layer PRNG (zero Math.random in gameplay)
- Idle unit indicators, ctrl group badges
- Minimap legend
- Tooltips, hotkeys, build placement preview
- Quick Play, loading screen
- Full audio cues for weather, shrine, berserker, diver, warship, etc.

---

## FUTURE MILESTONES

### v2.1.0 -- Community Tools

1. **Map Editor** -- visual map creation tool, export/import map files, share community maps
2. **Mod Support** -- config-driven entity/tech/commander definitions, JSON mod loading
3. **More Campaign Missions** -- missions 6-8, new branch paths, story continuation
4. **Custom Challenge Creator** -- players create and share daily-style challenges
5. **Spectator Mode** -- watch co-op games in real-time with full map vision

### v2.2.0 -- Competitive Multiplayer

1. **1v1 Versus Mode** -- competitive PvP with mirrored starts, ranked ladder
2. **Matchmaking via Trystero** -- lobby browser, skill-based matching, ELO rating
3. **Tournament Mode** -- bracket-style elimination tournaments (2-8 players)
4. **Replay Sharing** -- export replays as shareable files, community replay browser
5. **Anti-cheat Checksums** -- enhanced desync detection, deterministic validation

### v2.3.0 -- Polish & Accessibility

1. **Screen Reader Support** -- aria-live regions for all game events
2. **Advanced Colorblind Modes** -- deuteranopia, protanopia, tritanopia presets
3. **Speed Control** -- 0.5x game speed option for accessibility
4. **Tutorial Overhaul** -- interactive guided tutorial replacing advisor tips
5. **Achievement Showcase** -- profile page with achievement display + statistics

### v3.0.0 -- Second Playable Faction (Predators)

1. **Full Predator Faction** -- complete unit roster mirroring Otter capabilities
2. **Predator Tech Tree** -- 25 Predator-specific technologies across 5 branches
3. **Predator Commanders** -- 7 Predator commanders with unique abilities
4. **Predator Campaign** -- 5-mission story from the Predator perspective
5. **Faction-Specific Buildings** -- Predator architecture with unique mechanics
6. **Cross-Faction Balance** -- asymmetric balance testing, counter relationships

---

## INFRASTRUCTURE (Ongoing)

### CI/CD
- Auto-merge release workflow (release-please + CI gate + auto-merge)
- Android debug APK artifact on each release
- GitHub Pages deploy verification with PWA smoke test
- Maestro mobile testing on Android emulator in CI

### Performance
- Frame budget monitoring (16ms target at 60fps)
- Memory profiling for long sessions (survival mode)
- Asset loading optimization (lazy sprite generation)

### Testing
- Maintain 1300+ tests across unit, integration, browser, and gameplay categories
- Browser screenshot regression tests
- Multiplayer desync regression tests
