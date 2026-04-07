# Balance Model

## Purpose

Pond Warfare needs a balance model that can answer three questions:

1. What is the baseline pressure curve of a no-upgrade run?
2. How much does each Clam track reduce effective difficulty?
3. How much does each Pearl track reduce effective difficulty?

The goal is not perfect prediction. The goal is a repeatable approximation we can use to tune:

- Clam rewards per match
- Pearl rewards per rank-up
- Upgrade costs
- Upgrade effect sizes

## Core Rules

- The baseline game must be technically playable through the first exposure to all six panel stages without spending Clams or Pearls.
- Clams are a current-run pressure-relief layer.
- Pearls are the permanent prestige acceleration layer.
- Pearl auto-deploy specialists are permanent helper units and should not consume the same food cap the baseline run uses for ordinary production.
- If a building or response is required to clear a pane, it belongs in baseline pane progression, not behind Clams.

## Current Model

Implemented in [progression-model.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/src/balance/progression-model.ts).

### 1. Baseline Pressure

Baseline pressure is modeled as:

`stage_pressure * match_pressure`

Where:

- `stage_pressure = 1 + (panelStage - 1) * 0.4`
- `match_pressure = 1 + log2(matchNumber) * 0.55`

This gives:

- discrete pressure jumps when the map expands to a new pane
- a logarithmic difficulty rise across successive matches in the same run

### 2. Observed Power Score

A governor-run scenario is converted into a normalized player-power score from:

- resources gathered
- units trained
- kills
- living player units
- remaining Lodge HP ratio

Large raw counts are compressed with logarithms so one metric does not dominate the result.

There is also now a scenario-specific sustain score for developed defensive
holds. That score weights:

- enemy kills
- surviving player unit count
- retained player-unit HP ratio
- remaining Lodge HP ratio

This is intentionally narrower than the general power score. It exists for
Pearl tracks like `hp_multiplier`, `auto_heal_behavior`, and
`auto_repair_behavior`, whose value is easy to under-read if the scenario ends
before a real defending army is already established.

### 3. Observed Economy Score

The model separately tracks post-match Clam output from the same run:

- match reward Clams from the current snapshot
- including prestige rank and earnings multipliers

This catches progression tracks that accelerate the metagame without obviously
changing the first match's battlefield state.

### 4. Meta Progression Score

The combined progression score is:

`power_score + economy_score`

This gives us three lenses for every upgrade track:

- observed in-match power
- observed post-match economy
- combined meta progression

### 5. Difficulty Shift

For any upgrade variant:

`difficulty_shift_pct = (variant_performance - baseline_performance) / baseline_performance`

Positive values mean the upgrade reduced effective difficulty.

The exhaustive report also records a `budget_pct` when the config directly
defines a percentage multiplier. That is not an observed result. It is a raw
stat budget from the upgrade definition. When `budget_pct` is positive but the
observed power/economy shift is near zero, that indicates either:

- the runtime consumer is still missing
- the governor path does not exploit the upgrade
- the measurement window is too short or too coarse

## Current Diagnostic Snapshot

From [balance-track-shifts.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/balance-track-shifts.test.ts), stage 6, 1800 frames, seeds `11/42/77`:

| Track | Min % | Mean % | Max % |
|------|------:|-------:|------:|
| clam_gather_t1 | 0.00 | 0.90 | 2.70 |
| clam_yield_t1 | 0.17 | 1.08 | 2.78 |
| clam_clam_bonus_t1 | 0.00 | 0.78 | 2.33 |
| pearl_clam_earnings_rank_1 | 0.39 | 0.43 | 0.46 |
| pearl_gather_rank_2 | 0.25 | 0.75 | 1.28 |
| pearl_auto_deploy_fisher | 0.00 | 0.83 | 1.77 |
| pearl_starting_tier_1 | 0.90 | 1.27 | 1.79 |

These sampled Pearl rows now compare against a rank-matched Pearl baseline, so
the shifts represent the upgrade itself instead of accidentally including the
rank-1 prestige reward multiplier.

The broad score now also credits retained in-match stockpile and surviving
mobile-army HP instead of only raw gathered count, trained count, kills, unit
count, and Lodge HP. That makes the Pearl long-run scan more honest for
durability and economy-buffer tracks.

The diagnostic now also includes the controller/runtime fixes for gather
override persistence, specialist governor lockout, prestige population
accounting, the combat counter-scaling fix, governor attack-party reuse, safer
governor attack pacing, bottom-row-only rare resource placement, deterministic
match-event bonus-node placement, transient training-queue reset on fresh world
creation, deterministic seeded weather in `createTestWorld()`, and a shared
mocked `game.world` reference across the balance harness files. Those fixes
removed multiple false negatives from the progression reports.

## Exhaustive Broad Reports

The old combined exhaustive report turned out to be order-sensitive: running
Pearl rows before Clam rows or vice versa materially changed the output. The
root causes were test/runtime state leaking across runs, especially a stale
global training queue map and per-file `@/game` mocks that did not share the
same mocked `game.world` reference.

The broad scan is now split into isolated files so each currency layer runs in
a fresh worker process:

- [exhaustive-clam-balance-report.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/exhaustive-clam-balance-report.test.ts)
- [exhaustive-pearl-balance-report.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/exhaustive-pearl-balance-report.test.ts)

The Pearl broad scan still reports two horizons:

- opening window: 1200 frames, which is useful for early pacing and auto-deploy impact
- long-run window: 2400 frames, which is needed for combat and repair/heal tracks that do not fully express before the first army exists

Current isolated readout:

- Clam T1:
  - the old frame-zero exhaustive scan has now been replaced by a post-match purchase loop
  - the Clam broad report now does: warmup match to earn real Clams, buy one T1 node between matches, then score the next match
  - in that real between-match loop, the first current-run relief rows are directionally correct:
    - `economy_node_yield_t0` lands around `0.26%` `meta_mean_pct`
    - the three basic gather rows land around `0.25%`
    - `economy_clam_bonus_t0` lands around `0.15%` with about `1.26%` `economy_mean_pct`
  - most other T1 rows are currently flat in this harness instead of falsely negative, which is a better read but still tells us many categories are not expressing enough value in the immediate next-match window
  - current interpretation: this is a better release-budget input for first-step Clam purchases than the old frame-zero scan, but it still is not the final pane-transition harness for Frontier Expansion purchases
- Pearl rank 1:
  - opening window, 1200 frames:
    - the opening slice is still not a release-budget signal; it is a fast early-expression check
    - after the governor bootstrap fix, the opening trace now reaches an attack window instead of flatlining
    - `combat_multiplier`, `hp_multiplier`, `auto_heal_behavior`, and `gather_multiplier` still read strongly negative here because the first 1200 frames are dominated by early setup and the first defend cycle
  - long-run window, 2400 frames:
    - `auto_deploy_fisher` is now strongest at about `6.42%` `meta_mean_pct`
    - `auto_deploy_digger` is about `3.33%`, `auto_deploy_guardian` about `2.25%`, and `auto_deploy_hunter` about `1.30%`
    - `rare_resource_access` is positive at about `1.20%`
    - `hp_multiplier` is positive at about `0.68%`
    - `combat_multiplier` is positive at about `0.50%`
    - `clam_earnings_multiplier` remains economy-led, with about `2.65%` `economy_mean_pct` and about `0.51%` `meta_mean_pct`
    - the only still-negative long-run Pearl row in the broad scan is now `gather_multiplier` at about `-0.01%`; `hp_multiplier` and `combat_multiplier` remain under budget, but they are no longer directionally negative

## Combat-Pressure Diagnostic

From [pearl-combat-pressure-diagnostics.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/pearl-combat-pressure-diagnostics.test.ts), stage 3 immediate-pressure scenario, seeds `11/42/77`:

| Track | Min % | Mean % | Max % |
|------|------:|-------:|------:|
| combat_multiplier | 0.35 | 0.35 | 0.35 |
| hp_multiplier | 2.05 | 2.05 | 2.05 |
| auto_heal_behavior | 3.11 | 3.11 | 3.11 |
| auto_repair_behavior | 3.18 | 3.18 | 3.18 |

This is not a tuning success. It is a diagnostic finding:

- `combat_multiplier`, `hp_multiplier`, and `auto_heal_behavior` are now all clearly positive under pressure
- `auto_repair_behavior` remains positive and now edges out the direct damage track in this specific setup
- this still confirms the direct combat runtime and local defensive expression are working better than the blended stage-6 exhaustive report suggests, even though the gains are now more modest under the safer governor pacing
- the remaining negative blended full-run rows now point more strongly at governor pathing and long-window decision policy than at missing damage/heal consumers

## Sustain Diagnostic

From [pearl-sustain-diagnostics.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/pearl-sustain-diagnostics.test.ts), a developed home-defense hold with a pre-existing wounded army and repeated enemy assault waves:

This harness is intentionally not a release-budget baseline. It is an
expression harness that answers a narrower question: once the player already
has a damaged defending army near the Lodge, do the sustain-oriented Pearl
tracks actually help?

Current reading:

- `auto_repair_behavior` and `auto_heal_behavior` are clearly real and strongly expressed in the scenario they are meant to help. Sample runs regularly show them beating baseline by wide margins once the hold turns into a war of attrition.
- `combat_multiplier` is only modestly positive on mean and can swing a lot across seeds, which makes sense for a sustain scenario that is not primarily about raw DPS
- `hp_multiplier` is still only near-neutral to low-single-digit positive here, which means it now registers as real durability but still does not dominate the sustain picture
- this closes the biggest remaining ambiguity from the broad Pearl scan: `hp_multiplier` and `auto_heal_behavior` are not missing runtime consumers, they are just poorly represented by the opening-window and general long-run reports

## Controller Diagnostics

From [controller-balance-diagnostics.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/controller-balance-diagnostics.test.ts):

This harness now uses fixed seeds per controller slice and actually deploys the
Pearl specialists in the micro-worlds that claim to measure them. The old
variant-per-seed setup was overstating some rows and the old attack micro slice
was incorrectly reporting `auto_deploy_hunter` without spawning a hunter.

- Gather controller:
  - `gather_multiplier` now cleanly shows up as a higher `gatherSpeedMod`, but the fixed-seed short window is still travel-bound enough that raw gathered output stays flat in that slice
  - `auto_deploy_digger` and `auto_deploy_logger` do increase rock/log collection when the gather controller is forced to care about those tracks
  - `rare_resource_access` now adds rare nodes only in the bottom-row panels, which keeps the runtime consumer active without luring gatherers into the hostile top row
- Build controller:
  - the new controller slice exposed a real bug: wing-building placement offsets were too small, so the build controller could repeatedly fail to place Armory wings near the Lodge
  - after fixing [build-goal.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/src/governor/goals/build-goal.ts), the build controller now reaches Armory within a few controller cycles instead of stalling indefinitely
- Train controller:
  - the prestige population fix removed a real false-negative path: `auto_deploy_fisher` no longer steals a training slot by consuming baseline food
  - short-window training throughput is still bottlenecked by queue timing and building cadence more than raw fish income
- Defend controller:
  - `auto_repair_behavior`, `hp_multiplier`, and `auto_heal_behavior` all improve raw Lodge survival in the defend-only slice
  - that means the strongly negative blended pressure scores are not purely missing runtime effects; they are interactions inside the full governor loop
- Attack controller:
  - the attack controller now issues shared-target attack orders instead of splitting units across the line by default
  - the governor now waits for a safer attack army size in full play, avoids launching just before a wave, and avoids launching off a damaged Lodge
  - regular attack parties are now reassignable back into defense instead of getting stranded behind their old governor-issued attack overrides, while prestige-locked specialists stay on their fixed roles
  - it still converts that into only trivial or zero kills in the short skirmish slice, which makes the attack path a concrete remaining gap rather than a scoring artifact

## Interpretation

- Cheap first-rank Clam tracks are currently landing around **0.8% to 1.1% sampled mean relief** in the smaller stage-6 report.
- The post-match Clam broad scan now agrees directionally with the sampled Clam rows: basic gather, node-yield, and clam-bonus T1 purchases are positive once they are measured as real between-match purchases instead of frame-zero injections.
- The remaining Clam broad-report gap is narrower now: many non-gather T1 rows are still flat in the very next match, which means they either need a different expression harness or stronger gameplay impact.
- Early sampled Pearl tracks are directionally positive across the selected rows, and the long-run broad Pearl scan is now mostly positive as well, but the non-specialist Pearl rows still land below the strongest specialist auto-deploys.
- Under forced early combat pressure, all four tested Pearl combat/repair tracks are now positive, with `combat_multiplier`, `hp_multiplier`, and `auto_heal_behavior` showing the strongest gains.
- The negative minimums mean the current balance is still not stable enough to guarantee every upgrade helps under every seed/governor path.
- Basic Clam gather/yield/clam-bonus tracks are confirmed as positive again after the gather-override persistence fix and fresh-world training-queue reset.
- The Pearl broad scan is now trustworthy enough to use as one release-budget input, and the Clam scan is no longer directionally wrong now that it uses a post-match purchase loop. The remaining missing Clam lens is Frontier Expansion and pane-transition purchases, not basic T1 current-run relief.
- The targeted governor trace is now healthier: the stage-6 opening window reaches an attack scoring window at about `14s`, the opening slice averages about `2.2` ready combat units instead of `1.2`, and the 2400-frame trace averages about `3.1` ready combat units. That means the short Pearl scan is no longer dominated by a pure gatherer bootstrap stall.
- The dual-window Pearl report moved materially after the score-model fix as well as the governor/bootstrap fixes. The 2400-frame scan is now mostly positive: `auto_deploy_fisher` lands around `6.42% meta_mean_pct`, `auto_deploy_digger` around `3.33%`, `rare_resource_access` around `1.20%`, `hp_multiplier` around `0.68%`, and `combat_multiplier` around `0.50%`.
- The new sustain harness closes the other side of that gap. `auto_heal_behavior` and `auto_repair_behavior` now have a dedicated post-army scenario where they express strongly, and `hp_multiplier` reads as small-but-positive instead of looking inert.
- The rare-resource prestige path is no longer a map-generation trap. Its opening-window wobble now looks like ordinary governor valuation noise rather than a fundamentally harmful spawn pattern.
- The suspicious long-run Pearl set is much narrower now: `gather_multiplier` is the only row still slightly negative, while `combat_multiplier` and `hp_multiplier` are now positive but still reading under budget.
- The controller split still makes the attack path the next highest-signal controller problem. The train path is cleaner after the stage-aware gatherer target and baseline Lodge-generalist alignment, but attack still fails to cash in its later army strength as well as it should over the longer governor run.

## How To Use This

Short-term tuning heuristic:

- Baseline no-upgrade stage test must stay green.
- A cheap first-step Clam track should probably land around low-single-digit to mid-single-digit mean relief.
- A meaningful Pearl purchase should land above a single basic Clam purchase.
- If a track shows negative minimum relief too often, either the effect is too narrow or the governor/measurement window is missing its value.

## Next Steps

1. Add the missing Frontier Expansion pane-transition harness, so Clam diamonds are measured on the actual `one-panel -> two-panel -> ... -> six-panel` progression path instead of only on basic post-match T1 purchases.
2. Investigate the remaining attack-controller conversion gap, since the governor now reaches attack windows earlier but still does not convert later army strength into enough kills.
3. Improve the sampled and controller gather slices so `gather_multiplier` is measured in a window that is less dominated by travel time.
4. Bridge the sustain harness back into the broader Pearl budgeting view for `hp_multiplier`, since it is locally real but still under budget in the long-run broad scan.
5. Add multi-match simulations so the logarithmic run-pressure model is measured against actual match progression, not just single-match snapshots.
6. Tie the measured mean relief bands to payout formulas so Clam rewards and Pearl rank-up rewards can be budgeted intentionally.
