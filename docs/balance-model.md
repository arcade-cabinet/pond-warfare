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
| clam_gather_t1 | -0.87 | 4.49 | 14.34 |
| clam_yield_t1 | -0.47 | 5.16 | 15.25 |
| clam_clam_bonus_t1 | -0.87 | 4.59 | 14.63 |
| pearl_clam_earnings_rank_1 | 0.27 | 2.39 | 6.60 |
| pearl_gather_rank_2 | -0.98 | 3.07 | 7.15 |
| pearl_auto_deploy_fisher | 0.00 | 2.10 | 6.31 |
| pearl_starting_tier_1 | -0.31 | 3.90 | 8.01 |

These sampled Pearl rows now compare against a rank-matched Pearl baseline, so
the shifts represent the upgrade itself instead of accidentally including the
rank-1 prestige reward multiplier.

## Exhaustive First-Rank Report

From [exhaustive-balance-report.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/exhaustive-balance-report.test.ts), stage 6, 1200 frames, seeds `11/42/77`:

- The report now separates `power_mean_pct`, `economy_mean_pct`, and `meta_mean_pct`, plus `meta_min_pct` and `meta_max_pct`.
- Clam T1 tracks still cluster tightly on observed in-match power, which is a strong sign that many categories remain runtime-flat or measurement-flat in this window.
- Direct multiplier tracks now also carry a `budget_pct`, so we can explicitly compare configured stat budget against observed relief.
- If `budget_pct` is non-zero but both observed power and observed economy are near zero, that track is not being expressed strongly enough in live play or diagnostics.

Current corrected readout:

- Clam T1:
  - `economy_node_yield_t0` is currently strongest at about `13.33%` `meta_mean_pct`
  - most other Clam T1 tracks still collapse into a narrow `11.78%` to `12.55%` band
  - `economy_mean_pct` is still `0` across the sampled Clam T1 set, which means the first-rank Clam report is mostly observing battlefield effects, not reward pacing
- Pearl rank 1:
  - `auto_deploy_fisher`, `auto_deploy_digger`, and `auto_deploy_logger` are the clearest positive Pearl effects at roughly `1.82%` `meta_mean_pct`
  - `clam_earnings_multiplier` now correctly shows as economy-only value with about `3.22%` `economy_mean_pct` and `0.40%` `meta_mean_pct`
  - `combat_multiplier` and `hp_multiplier` still show `budget_pct` but `0` observed effect in this window
- `gather_multiplier`, `rare_resource_access`, and the non-worker auto-deploy set are still neutral-to-negative in this stage-6 governor scenario

## Combat-Pressure Diagnostic

From [pearl-combat-pressure-diagnostics.test.ts](/Users/jbogaty/src/arcade-cabinet/pond-warfare/tests/e2e/pearl-combat-pressure-diagnostics.test.ts), stage 3 immediate-pressure scenario, seeds `11/42/77`:

| Track | Min % | Mean % | Max % |
|------|------:|-------:|------:|
| combat_multiplier | -56.90 | -32.91 | 13.54 |
| hp_multiplier | -56.08 | -28.80 | 20.00 |
| auto_heal_behavior | -52.27 | -27.33 | 22.25 |
| auto_repair_behavior | -52.14 | -29.11 | 13.88 |

This is not a tuning success. It is a diagnostic finding:

- those Pearl tracks do not currently improve the governor-controlled outcome under forced early pressure
- either the scenario is exposing a bad interaction, or these upgrades are not being applied in a way that the live combat loop can leverage
- this moves the problem from "balance values might be low" to "the runtime/governor expression path needs investigation"

## Interpretation

- Cheap first-rank Clam tracks are currently landing around roughly **4.5% to 5.2% sampled mean relief** in the smaller report.
- Early Pearl tracks are currently much smaller, mostly around **2% to 4% sampled mean relief**, with several still flat or negative.
- Under forced early combat pressure, several Pearl combat/repair tracks are actually negative on average, which is a higher-priority issue than fine-grained number tuning.
- The small negative minimums mean the current balance is not yet stable enough to guarantee every upgrade always helps under every seed/governor path.
- `starting_tier_1` and `clam_earnings_rank_1` are both materially positive in the sampled report, but not dominant.
- Basic Clam gather/yield/clam-bonus tracks are already large enough to materially affect pacing.
- The exhaustive report shows a second issue beyond raw tuning: several upgrade tracks are still indistinguishable or inert, which points to missing runtime consumers, insufficiently sensitive diagnostics, or both.

## How To Use This

Short-term tuning heuristic:

- Baseline no-upgrade stage test must stay green.
- A cheap first-step Clam track should probably land around low-single-digit to mid-single-digit mean relief.
- A meaningful Pearl purchase should land above a single basic Clam purchase.
- If a track shows negative minimum relief too often, either the effect is too narrow or the governor/measurement window is missing its value.

## Next Steps

1. Expand the diagnostics from sampled tracks to every Clam subcategory and every Pearl upgrade.
2. Add multi-match simulations so the logarithmic run-pressure model is measured against actual match progression, not just single-match snapshots.
3. Wire missing runtime consumers for the inert Pearl and flat Clam tracks before attempting fine-grained economy tuning.
4. Tie the measured mean relief bands to payout formulas so Clam rewards and Pearl rank-up rewards can be budgeted intentionally.
