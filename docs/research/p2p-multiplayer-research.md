# P2P Cooperative Multiplayer Research

**Date:** 2026-04-02
**Status:** Research complete, Phase 1 (determinism) in progress

## Recommended Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Signaling | Trystero (Nostr strategy) | Zero servers, decentralized, free forever |
| Transport | WebRTC DataChannel | Direct P2P, low latency, encrypted, works in Capacitor |
| NAT traversal | Google STUN + Metered.ca TURN (free 20GB/mo) | Covers 100% NAT types including mobile CGNAT |
| Networking model | Deterministic lockstep | Perfect for RTS, minimal bandwidth, leverages replay infra |
| Drift detection | Periodic state checksum (every 5s) | Safety net for floating-point drift |

## Why This Stack

- **Zero server maintenance** — #1 requirement
- **Works on Android phones** — WebRTC in Capacitor WebView, no plugins needed
- **2-player co-op** — room code sharing, not matchmaking
- **100-200ms latency acceptable** — RTS commands, not FPS twitch
- **~2 KB/s bandwidth** — only player commands sent, not game state

## Connection Flow

1. Player A creates game → gets 6-char room code (e.g., "OTTER7")
2. Player B enters room code
3. Trystero exchanges SDP via Nostr relays (2-5 seconds)
4. WebRTC DataChannel opens (direct P2P, encrypted)
5. Settings negotiation (map seed, difficulty, factions)
6. Identical GameWorld created on both clients
7. Lockstep begins

## Determinism Requirements

### What Must Be Deterministic
- All ECS systems (movement, combat, gathering, AI, evolution, etc.)
- Seeded RNG for all gameplay randomness
- Fixed-timestep game loop (60fps)
- Command application order

### What Can Diverge (Cosmetic Only)
- Particle effects, death particles
- Audio pitch jitter
- UI animations, rendering effects
- Camera position (independent per player)

### Current State
- SeededRandom exists in `src/utils/random.ts` (Mulberry32)
- Map generation already uses seeded RNG
- Weather + random events use seeded RNG
- ~180 `Math.random()` calls in gameplay code need replacement
- Fixed-timestep loop exists in `src/game/game-loop.ts`
- ReplayRecorder captures commands with frame numbers

### Dual-Layer PRNG Design
1. **mapRng** — seeded from `mapSeed`, used during init only
2. **gameRng** — seeded from `mapSeed + 0x9E3779B9`, used for all runtime gameplay randomness

## Implementation Phases

| Phase | Effort | Ships Independently? |
|-------|--------|---------------------|
| 1. Determinism (PRNG replacement) | 2-3 days | Yes — improves replay accuracy |
| 2. Network layer (Trystero + lockstep) | 3-4 days | Needs Phase 1 |
| 3. Multiplayer UI (lobby, HUD, disconnect) | 2-3 days | Needs Phase 2 |
| 4. Co-op mechanics (shared faction control) | 2-3 days | Needs Phase 3 |

## Alternatives Evaluated

| Approach | Verdict |
|----------|---------|
| PeerJS | Relies on PeerJS cloud server — adds dependency |
| P2PCF (Cloudflare Workers) | Excellent but requires CF account |
| Firebase Realtime | Adds cloud dependency, quota limits |
| Supabase Realtime | Per-message billing, only ~9 hrs/month free |
| Manual SDP (clipboard/QR) | Bad UX for mobile |
| Android Nearby Connections | Android-only, no PWA, secondary use case |
| NetPlayJS | Designed for action games with rollback, overkill for RTS |

## Co-op Design

Both players control the same faction:
- Shared units, resources, tech tree
- Either player can command any unit
- Either player can build/train/research
- Independent cameras
- No fog-of-war difference (cooperative, not competitive)

## Sources

- Trystero: github.com/dmotz/trystero
- Deterministic Lockstep: gafferongames.com/post/deterministic_lockstep
- JS Determinism: developers.rune.ai/blog/making-js-deterministic-for-fun-and-glory
- QWBP SDP Compression: magarcia.io/air-gapped-webrtc-breaking-the-qr-limit
- Metered.ca Free TURN: metered.ca/tools/openrelay
- Cloudflare TURN: developers.cloudflare.com/realtime/turn
