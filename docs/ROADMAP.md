# Pond Warfare -- Feature Roadmap

Current state: v3.0 -- Mobile-first single-mode RTS with prestige loop. 1663 tests.

---

## COMPLETED MILESTONES

### v1.0 - v2.0 (Historical)

Feature set from original multi-mode architecture. Many systems (campaigns, puzzles,
survival mode, co-op multiplayer, 25-tech tree, 7 commanders, 5 game modes) have been
superseded by the v3 rearchitecture. See git history for details.

### v3.0 -- Complete Rearchitecture (DONE)

Total rearchitecture from multi-mode 4X-hybrid to single-mode mobile-first RTS with
prestige loop.

- **One game mode**: Defend the Lodge (replaces Skirmish, Campaign, Survival, Puzzles, Co-op)
- **JSON config system**: 10 config files drive all game balance (units, enemies, events, upgrades, prestige, terrain, fortifications, lodge, rewards, prefixes)
- **Vertical map**: Lodge at bottom, enemies from top, resources in middle; map scales with progression level
- **Upgrade web**: 240+ procedural nodes from 6 categories x 4 subcategories x 10 tiers, plus diamond nodes for Lodge wings and specialist unlocks
- **Prestige system**: Rank up to reset Clam upgrades and earn Pearls for permanent auto-deploy, auto-behavior, and multiplier upgrades
- **Simplified units**: 4 generalists (Gatherer, Fighter, Medic, Scout) + 10 specialists (auto-deployed via prestige)
- **6 enemy types**: Raider, Fighter, Healer, Scout, Sapper, Saboteur with per-level scaling
- **Match events**: JSON-driven waves, bosses, sabotage, escorts, storms replacing old wave/evolution system
- **Fortification system**: Walls and towers from JSON config with progression-based slot counts
- **Lodge visual evolution**: Wings unlock via upgrade web diamond nodes, prestige glow
- **Post-match rewards**: Clam earnings from kills, events, survival time, prestige multiplier
- **New resource model**: Fish/Rocks/Logs (in-match), Clams/Pearls (metagame)
- **v3 UI screens**: UpgradeWebScreen, PearlUpgradeScreen, RewardsScreen, RankUpModal
- **Simplified main menu**: PLAY, Upgrades, Prestige, Settings

---

## FUTURE MILESTONES

### v3.1 -- Content Expansion

1. **More event types** -- new event templates in events.json (defense holdouts, resource race, VIP escort variants)
2. **More upgrade diamond nodes** -- additional cross-category unlocks
3. **Specialist balance pass** -- tune auto-deploy counts and specialist stats
4. **Map variety** -- additional terrain painting patterns, biome variations

### v3.2 -- Polish & Accessibility

1. **Tutorial overlay** -- guided first-match experience
2. **Screen reader support** -- aria-live regions for game events
3. **Colorblind modes** -- deuteranopia, protanopia, tritanopia presets
4. **Achievement system update** -- achievements aligned with v3 game mode
5. **Statistics dashboard** -- lifetime stats, progression charts

### v3.3 -- Social Features

1. **Leaderboards** -- global/friends progression rankings
2. **Daily challenges** -- rotating challenge objectives with bonus Clam rewards
3. **Replay sharing** -- export/import match replays
4. **Profile showcase** -- prestige rank display, achievement badges

---

## INFRASTRUCTURE (Ongoing)

### CI/CD
- Auto-merge release workflow (release-please + CI gate)
- Android debug APK artifact on each release
- GitHub Pages deploy verification

### Performance
- Frame budget monitoring (16ms target at 60fps)
- Memory profiling for long sessions
- Asset loading optimization

### Testing
- Maintain 1600+ tests across unit, integration, browser, and gameplay categories
- Browser screenshot regression tests
- bitECS test isolation (mock audio/rendering in parallel tests)
