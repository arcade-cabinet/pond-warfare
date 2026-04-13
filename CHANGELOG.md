---
title: Changelog
updated: 2026-04-10
status: current
domain: context
---

# Changelog

## [1.3.0](https://github.com/arcade-cabinet/pond-warfare/compare/v1.2.0...v1.3.0) (2026-04-13)


### Features

* accordion UI with pond assets + tech tree expanded to 5 branches ([#25](https://github.com/arcade-cabinet/pond-warfare/issues/25)) ([dccf788](https://github.com/arcade-cabinet/pond-warfare/commit/dccf7880858cd7c979677e10dcad85cdcfe16f28))
* addiction loop — daily challenges, XP, match history, random events, unlock progression ([#40](https://github.com/arcade-cabinet/pond-warfare/issues/40)) ([4f00d9d](https://github.com/arcade-cabinet/pond-warfare/commit/4f00d9d51f3bbdd9cee8b6e9d68ee283e3b37790))
* brand identity redesign + splash video — Pond WARFARE aesthetic ([#48](https://github.com/arcade-cabinet/pond-warfare/issues/48)) ([f151306](https://github.com/arcade-cabinet/pond-warfare/commit/f1513065545873b78c8008b870ccb173a703908b))
* complete game polish — commander/tech verify, post-game, tests, CSS ([#32](https://github.com/arcade-cabinet/pond-warfare/issues/32)) ([bd2e8c2](https://github.com/arcade-cabinet/pond-warfare/commit/bd2e8c2ab14ee19c0e2ee812d9f544e28180b2e5))
* deterministic dual-layer PRNG — zero Math.random() in gameplay ([#41](https://github.com/arcade-cabinet/pond-warfare/issues/41)) ([4aaa469](https://github.com/arcade-cabinet/pond-warfare/commit/4aaa469cfead503e91a360974c510a9493dcaf3e))
* device-aware responsive design, advisor system, command center UI, swipeable navigation ([#21](https://github.com/arcade-cabinet/pond-warfare/issues/21)) ([1793b21](https://github.com/arcade-cabinet/pond-warfare/commit/1793b210edf7c3663ebb5b0c3aaea0529f234fb2))
* full 90s RTS crunch polish — combat, personality, economy, info, spectacle ([#31](https://github.com/arcade-cabinet/pond-warfare/issues/31)) ([66f2692](https://github.com/arcade-cabinet/pond-warfare/commit/66f26928750b270d2ef9220659a8a3139834b974))
* game feel, terrain, campaign, audio, difficulty — 8-agent swarm ([#30](https://github.com/arcade-cabinet/pond-warfare/issues/30)) ([e9eeada](https://github.com/arcade-cabinet/pond-warfare/commit/e9eeada116fbc77698dc35ea42a8960524506200))
* governor decomposition, diagnostic reporting, balance milestones ([#28](https://github.com/arcade-cabinet/pond-warfare/issues/28)) ([582a323](https://github.com/arcade-cabinet/pond-warfare/commit/582a3232d78c8ed90e3aba813ec23fbc626d815d))
* more content — 10 puzzles, 40 achievements, campaign briefings ([#44](https://github.com/arcade-cabinet/pond-warfare/issues/44)) ([5c40ad3](https://github.com/arcade-cabinet/pond-warfare/commit/5c40ad368d0338f97f710d112a0896095305abae))
* P2P co-op multiplayer — Trystero + WebRTC + deterministic lockstep ([#42](https://github.com/arcade-cabinet/pond-warfare/issues/42)) ([5947b66](https://github.com/arcade-cabinet/pond-warfare/commit/5947b660098f3d7ca1864133fbfb4c9bfd73ca17))
* player experience polish — tooltips, hotkeys, build preview, Quick Play, audio cues ([#39](https://github.com/arcade-cabinet/pond-warfare/issues/39)) ([353474e](https://github.com/arcade-cabinet/pond-warfare/commit/353474ebc464fe7950ab2f0238de993f29335a2e))
* Pond Warfare v3.0 — mobile-first RTS with 6-panel map, prestige, procedural upgrades ([239f0bb](https://github.com/arcade-cabinet/pond-warfare/commit/239f0bb499f207b9a43dac319ff2155f9daf9bd6))
* quality overhaul — fix broken features, responsive, visual consistency ([#46](https://github.com/arcade-cabinet/pond-warfare/issues/46)) ([709f5b3](https://github.com/arcade-cabinet/pond-warfare/commit/709f5b392576e34af7a2fe2110e93cd8ee844fb8))
* v1.4.0 — sprite animation, 3 maps, survival mode, AI, commander abilities, mobile CI ([#34](https://github.com/arcade-cabinet/pond-warfare/issues/34)) ([32a96a3](https://github.com/arcade-cabinet/pond-warfare/commit/32a96a3f355abc7ee7882f1e124e9aac78085d7a))
* v1.5.0 — tactical combat, new units/enemies, market, campaign branching, water animation ([#35](https://github.com/arcade-cabinet/pond-warfare/issues/35)) ([c2e994e](https://github.com/arcade-cabinet/pond-warfare/commit/c2e994e118ea2909da1a008cfd9a7fa8f7887e45))
* v2.0.0 — weather, naval, replay, puzzles, cosmetics, berserker, gates, shrines ([#37](https://github.com/arcade-cabinet/pond-warfare/issues/37)) ([4c81302](https://github.com/arcade-cabinet/pond-warfare/commit/4c81302a7ad636cc3eab29a20af5c9901a08dd79))
* v3 complete — multiplayer, fortifications, spawn patterns, procedural assets, streamlined upgrades ([#50](https://github.com/arcade-cabinet/pond-warfare/issues/50)) ([0c9328d](https://github.com/arcade-cabinet/pond-warfare/commit/0c9328d9f8b19be1aa9e5e6477b36fc8ec00ae0b))
* wire P2P multiplayer UI to network layer ([#43](https://github.com/arcade-cabinet/pond-warfare/issues/43)) ([8b05ed7](https://github.com/arcade-cabinet/pond-warfare/commit/8b05ed769dd4704b8ee05f7acc3ea4a9e65f0fb1))
* Yuka governor + integration tests, repurpose old E2E ([#29](https://github.com/arcade-cabinet/pond-warfare/issues/29)) ([7712077](https://github.com/arcade-cabinet/pond-warfare/commit/771207718597964e7ea591f74a4da40bfa9a6606))


### Bug Fixes

* dead code cleanup, Ironpaw aura, achievements, unlocks ([#27](https://github.com/arcade-cabinet/pond-warfare/issues/27)) ([9273670](https://github.com/arcade-cabinet/pond-warfare/commit/9273670a91e9bcc1760da3d73564ce6062d8134e))
* deploy SW kill switch to purge stale v2 PWA cache ([#52](https://github.com/arcade-cabinet/pond-warfare/issues/52)) ([4bcf6ad](https://github.com/arcade-cabinet/pond-warfare/commit/4bcf6ad7926037dd1cca77e27e4b1a5b9b1ceb55))
* revert broken SwipeableTabView, use PondTabButton with Button.png assets ([#24](https://github.com/arcade-cabinet/pond-warfare/issues/24)) ([8d2e06c](https://github.com/arcade-cabinet/pond-warfare/commit/8d2e06c26a5a5322c950254b86f5e55a09990ede))
* terrain perf + visual brightness ([#54](https://github.com/arcade-cabinet/pond-warfare/issues/54)) ([4518f39](https://github.com/arcade-cabinet/pond-warfare/commit/4518f39200555612ad15c1f8797036c79301a6c1))
* visual polish — terrain, auras, fog, HUD, gather loop ([#53](https://github.com/arcade-cabinet/pond-warfare/issues/53)) ([794e079](https://github.com/arcade-cabinet/pond-warfare/commit/794e0798be1c0313f79d610dc44e0dc742269297))


### Performance Improvements

* terrain downscale+upscale — 4x faster, no freeze ([#55](https://github.com/arcade-cabinet/pond-warfare/issues/55)) ([461bda0](https://github.com/arcade-cabinet/pond-warfare/commit/461bda01b339281295d1f6d003afc5a4b3963148))

## [1.3.0](https://github.com/arcade-cabinet/pond-warfare/compare/v1.2.0...v1.3.0) (2026-04-10)


### Features

* accordion UI with pond assets + tech tree expanded to 5 branches ([#25](https://github.com/arcade-cabinet/pond-warfare/issues/25)) ([dccf788](https://github.com/arcade-cabinet/pond-warfare/commit/dccf7880858cd7c979677e10dcad85cdcfe16f28))
* addiction loop — daily challenges, XP, match history, random events, unlock progression ([#40](https://github.com/arcade-cabinet/pond-warfare/issues/40)) ([4f00d9d](https://github.com/arcade-cabinet/pond-warfare/commit/4f00d9d51f3bbdd9cee8b6e9d68ee283e3b37790))
* brand identity redesign + splash video — Pond WARFARE aesthetic ([#48](https://github.com/arcade-cabinet/pond-warfare/issues/48)) ([f151306](https://github.com/arcade-cabinet/pond-warfare/commit/f1513065545873b78c8008b870ccb173a703908b))
* complete game polish — commander/tech verify, post-game, tests, CSS ([#32](https://github.com/arcade-cabinet/pond-warfare/issues/32)) ([bd2e8c2](https://github.com/arcade-cabinet/pond-warfare/commit/bd2e8c2ab14ee19c0e2ee812d9f544e28180b2e5))
* deterministic dual-layer PRNG — zero Math.random() in gameplay ([#41](https://github.com/arcade-cabinet/pond-warfare/issues/41)) ([4aaa469](https://github.com/arcade-cabinet/pond-warfare/commit/4aaa469cfead503e91a360974c510a9493dcaf3e))
* device-aware responsive design, advisor system, command center UI, swipeable navigation ([#21](https://github.com/arcade-cabinet/pond-warfare/issues/21)) ([1793b21](https://github.com/arcade-cabinet/pond-warfare/commit/1793b210edf7c3663ebb5b0c3aaea0529f234fb2))
* full 90s RTS crunch polish — combat, personality, economy, info, spectacle ([#31](https://github.com/arcade-cabinet/pond-warfare/issues/31)) ([66f2692](https://github.com/arcade-cabinet/pond-warfare/commit/66f26928750b270d2ef9220659a8a3139834b974))
* game feel, terrain, campaign, audio, difficulty — 8-agent swarm ([#30](https://github.com/arcade-cabinet/pond-warfare/issues/30)) ([e9eeada](https://github.com/arcade-cabinet/pond-warfare/commit/e9eeada116fbc77698dc35ea42a8960524506200))
* governor decomposition, diagnostic reporting, balance milestones ([#28](https://github.com/arcade-cabinet/pond-warfare/issues/28)) ([582a323](https://github.com/arcade-cabinet/pond-warfare/commit/582a3232d78c8ed90e3aba813ec23fbc626d815d))
* more content — 10 puzzles, 40 achievements, campaign briefings ([#44](https://github.com/arcade-cabinet/pond-warfare/issues/44)) ([5c40ad3](https://github.com/arcade-cabinet/pond-warfare/commit/5c40ad368d0338f97f710d112a0896095305abae))
* P2P co-op multiplayer — Trystero + WebRTC + deterministic lockstep ([#42](https://github.com/arcade-cabinet/pond-warfare/issues/42)) ([5947b66](https://github.com/arcade-cabinet/pond-warfare/commit/5947b660098f3d7ca1864133fbfb4c9bfd73ca17))
* player experience polish — tooltips, hotkeys, build preview, Quick Play, audio cues ([#39](https://github.com/arcade-cabinet/pond-warfare/issues/39)) ([353474e](https://github.com/arcade-cabinet/pond-warfare/commit/353474ebc464fe7950ab2f0238de993f29335a2e))
* Pond Warfare v3.0 — mobile-first RTS with 6-panel map, prestige, procedural upgrades ([239f0bb](https://github.com/arcade-cabinet/pond-warfare/commit/239f0bb499f207b9a43dac319ff2155f9daf9bd6))
* quality overhaul — fix broken features, responsive, visual consistency ([#46](https://github.com/arcade-cabinet/pond-warfare/issues/46)) ([709f5b3](https://github.com/arcade-cabinet/pond-warfare/commit/709f5b392576e34af7a2fe2110e93cd8ee844fb8))
* v1.4.0 — sprite animation, 3 maps, survival mode, AI, commander abilities, mobile CI ([#34](https://github.com/arcade-cabinet/pond-warfare/issues/34)) ([32a96a3](https://github.com/arcade-cabinet/pond-warfare/commit/32a96a3f355abc7ee7882f1e124e9aac78085d7a))
* v1.5.0 — tactical combat, new units/enemies, market, campaign branching, water animation ([#35](https://github.com/arcade-cabinet/pond-warfare/issues/35)) ([c2e994e](https://github.com/arcade-cabinet/pond-warfare/commit/c2e994e118ea2909da1a008cfd9a7fa8f7887e45))
* v2.0.0 — weather, naval, replay, puzzles, cosmetics, berserker, gates, shrines ([#37](https://github.com/arcade-cabinet/pond-warfare/issues/37)) ([4c81302](https://github.com/arcade-cabinet/pond-warfare/commit/4c81302a7ad636cc3eab29a20af5c9901a08dd79))
* v3 complete — multiplayer, fortifications, spawn patterns, procedural assets, streamlined upgrades ([#50](https://github.com/arcade-cabinet/pond-warfare/issues/50)) ([0c9328d](https://github.com/arcade-cabinet/pond-warfare/commit/0c9328d9f8b19be1aa9e5e6477b36fc8ec00ae0b))
* wire P2P multiplayer UI to network layer ([#43](https://github.com/arcade-cabinet/pond-warfare/issues/43)) ([8b05ed7](https://github.com/arcade-cabinet/pond-warfare/commit/8b05ed769dd4704b8ee05f7acc3ea4a9e65f0fb1))
* Yuka governor + integration tests, repurpose old E2E ([#29](https://github.com/arcade-cabinet/pond-warfare/issues/29)) ([7712077](https://github.com/arcade-cabinet/pond-warfare/commit/771207718597964e7ea591f74a4da40bfa9a6606))


### Bug Fixes

* dead code cleanup, Ironpaw aura, achievements, unlocks ([#27](https://github.com/arcade-cabinet/pond-warfare/issues/27)) ([9273670](https://github.com/arcade-cabinet/pond-warfare/commit/9273670a91e9bcc1760da3d73564ce6062d8134e))
* deploy SW kill switch to purge stale v2 PWA cache ([#52](https://github.com/arcade-cabinet/pond-warfare/issues/52)) ([4bcf6ad](https://github.com/arcade-cabinet/pond-warfare/commit/4bcf6ad7926037dd1cca77e27e4b1a5b9b1ceb55))
* revert broken SwipeableTabView, use PondTabButton with Button.png assets ([#24](https://github.com/arcade-cabinet/pond-warfare/issues/24)) ([8d2e06c](https://github.com/arcade-cabinet/pond-warfare/commit/8d2e06c26a5a5322c950254b86f5e55a09990ede))
* terrain perf + visual brightness ([#54](https://github.com/arcade-cabinet/pond-warfare/issues/54)) ([4518f39](https://github.com/arcade-cabinet/pond-warfare/commit/4518f39200555612ad15c1f8797036c79301a6c1))
* visual polish — terrain, auras, fog, HUD, gather loop ([#53](https://github.com/arcade-cabinet/pond-warfare/issues/53)) ([794e079](https://github.com/arcade-cabinet/pond-warfare/commit/794e0798be1c0313f79d610dc44e0dc742269297))


### Performance Improvements

* terrain downscale+upscale — 4x faster, no freeze ([#55](https://github.com/arcade-cabinet/pond-warfare/issues/55)) ([461bda0](https://github.com/arcade-cabinet/pond-warfare/commit/461bda01b339281295d1f6d003afc5a4b3963148))

## [1.2.0](https://github.com/arcade-cabinet/pond-warfare/compare/v1.1.0...v1.2.0) (2026-03-30)


### Features

* code quality enforcement + movement integration tests ([#16](https://github.com/arcade-cabinet/pond-warfare/issues/16)) ([64498e3](https://github.com/arcade-cabinet/pond-warfare/commit/64498e3c548c1b12645270125ed6469c82375d32))
* comprehensive browser tests, Yuka speed fix, code quality enforcement ([#17](https://github.com/arcade-cabinet/pond-warfare/issues/17)) ([9c59fcc](https://github.com/arcade-cabinet/pond-warfare/commit/9c59fcc3fa8ccb601716f6a0a892fd19a7d9db6b))


### Bug Fixes

* add UI art assets for pond landing page ([#13](https://github.com/arcade-cabinet/pond-warfare/issues/13)) ([e97289b](https://github.com/arcade-cabinet/pond-warfare/commit/e97289b3ccfe4fc93abb1e0425f11875c462de95))

## [1.1.0](https://github.com/arcade-cabinet/pond-warfare/compare/v1.0.0...v1.1.0) (2026-03-30)


### Features

* unified slide-out panel UI, diegetic pond landing page, Yuka otter ([#10](https://github.com/arcade-cabinet/pond-warfare/issues/10)) ([fa73450](https://github.com/arcade-cabinet/pond-warfare/commit/fa73450282449799f619bf19875f178ab65b2d87))

## 1.0.0 (2026-03-29)


### Features

* capacitor-sqlite, game menu, error handling, permadeath ([87d3d75](https://github.com/arcade-cabinet/pond-warfare/commit/87d3d754d348cd983e869fefe7201211612427ac))
* fullscreen landing page, cross-platform support, and review fixes ([#9](https://github.com/arcade-cabinet/pond-warfare/issues/9)) ([cb77f1e](https://github.com/arcade-cabinet/pond-warfare/commit/cb77f1ed27d463049d68427072618ed3da92f79c))
* Pond Warfare v1.0 - complete design bible ([dafbe31](https://github.com/arcade-cabinet/pond-warfare/commit/dafbe31b3d72545f7cd49a98c973ce05393e1014))


### Bug Fixes

* add base path for GitHub Pages deployment ([#3](https://github.com/arcade-cabinet/pond-warfare/issues/3)) ([cc4e70d](https://github.com/arcade-cabinet/pond-warfare/commit/cc4e70d2062437f1de58547a7e132a66f6135f88))
* jeep-sqlite wasm path for GitHub Pages ([#6](https://github.com/arcade-cabinet/pond-warfare/issues/6)) ([856146f](https://github.com/arcade-cabinet/pond-warfare/commit/856146f15ee18758981427934239b5228a41df95))
* use sql.js@1.11.0 wasm matching jeep-sqlite@2.8.0 bundled version ([#7](https://github.com/arcade-cabinet/pond-warfare/issues/7)) ([a95c8c8](https://github.com/arcade-cabinet/pond-warfare/commit/a95c8c8451ed507da8acc38ba6231224c7bbe7b1))
