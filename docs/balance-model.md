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
| clam_gather_t1 | -4.56 | 4.57 | 12.51 |
| clam_yield_t1 | 1.30 | 6.90 | 13.25 |
| clam_clam_bonus_t1 | 0.62 | 6.35 | 12.65 |
| pearl_clam_earnings_rank_1 | 1.09 | 3.57 | 8.34 |
| pearl_gather_rank_2 | 1.36 | 3.62 | 7.70 |
| pearl_auto_deploy_fisher | 0.58 | 3.08 | 7.84 |
| pearl_starting_tier_1 | 1.94 | 4.40 | 8.53 |

These sampled Pearl rows now compare against a rank-matched Pearl baseline, so
the shifts represent the upgrade itself instead of accidentally including the
rank-1 prestige reward multiplier.

The diagnostic now also includes the controller/runtime fixes for gather
override persistence, specialist governor lockout, prestige population
accounting, the combat counter-scaling fix, governor attack-party reuse, safer
governor attack pacing, bottom-row-only rare resource placement, deterministic
match-event bonus-node placement, transient training-queue reset on fresh world
creation, and a shared mocked `game.world` reference across the balance harness
files. Those fixes removed multiple false negatives from the progression
reports.

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

The Pearl broad scan now reports two horizons:

- opening window: 1200 frames, which is useful for early pacing and auto-deploy impact
- long-run window: 2400 frames, which is needed for combat and repair/heal tracks that do not fully express before the first army exists

Current isolated readout:

- Clam T1:
  - `economy_node_yield_t0` is strongest at about `6.06%` `meta_mean_pct`
  - the three basic gather tracks cluster just behind at about `6.03%`
  - most remaining Clam T1 rows cluster around `5.34%`, which means the harness now reads them as clearly positive even if it still does not separate categories cleanly in this short window
  - the Clam broad scan now shows a small but real `economy_mean_pct` signal (`1.21%`) instead of the previous flat zero
- Pearl rank 1:
  - opening window, 1200 frames:
    - `auto_deploy_fisher` is strongly positive at about `8.98%` `meta_mean_pct`
    - `auto_deploy_digger` is about `5.76%`, `auto_deploy_logger` about `6.34%`, and the remaining auto-deploy specialists cluster around `3.33%` to `4.01%`
    - several non-deploy Pearl tracks still read negative here: `combat_multiplier`, `hp_multiplier`, `auto_heal_behavior`, and `gather_multiplier` are all about `-2.81%`, while `auto_repair_behavior` is about `-2.78%`
    - this opening scan is now explicitly treated as an early-expression diagnostic, not the only truth for Pearl balance
  - long-run window, 2400 frames:
    - `auto_deploy_fisher` stays strong at about `6.82%` `meta_mean_pct`, with `auto_deploy_digger` about `6.06%` and `auto_deploy_logger` about `5.23%`
    - `combat_multiplier` flips positive at about `0.86%`
    - `starting_tier` is slightly positive at about `0.53%`
    - `clam_earnings_multiplier` is slightly positive on combined meta at about `0.35%`, with `2.63%` `economy_mean_pct`
    - `rare_resource_access` is effectively neutral-to-slightly-positive at about `0.33%`
    - the remaining low-expression long-run rows are now `hp_multiplier` and `auto_heal_behavior` at `0%`, plus `gather_multiplier` at about `-0.27%`

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

- Cheap first-rank Clam tracks are currently landing around **4.5% to 7% sampled mean relief** in the smaller report, and around **5.3% to 6.1%** in the isolated Clam broad scan.
- Early sampled Pearl tracks are now directionally positive across the selected rows and the isolated broad Pearl scan, but they still land below the strongest Clam pressure-relief rows unless they auto-deploy real specialists.
- Under forced early combat pressure, all four tested Pearl combat/repair tracks are now positive, with `combat_multiplier`, `hp_multiplier`, and `auto_heal_behavior` showing the strongest gains.
- The negative minimums mean the current balance is still not stable enough to guarantee every upgrade helps under every seed/governor path.
- Basic Clam gather/yield/clam-bonus tracks are confirmed as positive again after the gather-override persistence fix and fresh-world training-queue reset.
- The isolated broad scans are now trustworthy enough to use as a release-budget input, but they still show two real limitations: many Clam categories remain tightly clustered, and some Pearl tracks are only near-neutral in the short 1200-frame window even when targeted diagnostics show clear local value.
- The targeted governor trace now makes the 1200-frame limitation explicit: the sampled stage-6 run averages only about `1.2` ready combat units at arbitration time, and `attack` never has a nonzero scoring window in that opening slice. That means the short Pearl scan was under-reading several tracks simply because the governor had not built an army yet.
- The new dual-window Pearl report fixes most of that under-read. `combat_multiplier` is no longer negative once the run is allowed to breathe to 2400 frames, while `rare_resource_access` becomes roughly neutral and `clam_earnings_multiplier` remains correctly economy-led.
- The rare-resource prestige path is no longer a map-generation trap. Its opening-window wobble now looks like ordinary governor valuation noise rather than a fundamentally harmful spawn pattern.
- The controller split still makes the attack path the next highest-signal controller problem. The train path is cleaner after the prestige population fix, but attack still fails to cash in its orders over the longer governor run, and `hp_multiplier` / `auto_heal_behavior` still need a scenario that actually stresses their intended value after the army exists.

## How To Use This

Short-term tuning heuristic:

- Baseline no-upgrade stage test must stay green.
- A cheap first-step Clam track should probably land around low-single-digit to mid-single-digit mean relief.
- A meaningful Pearl purchase should land above a single basic Clam purchase.
- If a track shows negative minimum relief too often, either the effect is too narrow or the governor/measurement window is missing its value.

## Next Steps

1. Investigate the remaining attack-controller conversion gap, since the governor still spends most of the sampled stage-6 run on train/defend and still does not convert later army strength into enough kills.
2. Add a long-run or role-targeted expression harness for `hp_multiplier` and `auto_heal_behavior`, since the 2400-frame broad scan still leaves those rows flat even though the immediate-pressure harness shows they work.
3. Improve the sampled and controller gather slices so `gather_multiplier` is measured in a window that is less dominated by travel time.
4. Add multi-match simulations so the logarithmic run-pressure model is measured against actual match progression, not just single-match snapshots.
5. Tie the measured mean relief bands to payout formulas so Clam rewards and Pearl rank-up rewards can be budgeted intentionally.
