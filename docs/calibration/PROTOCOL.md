# Independent scientific calibration protocol — 2026-10-11

Protocol ID: `aeris-independent-history-v1`. Frozen before any scientific fitting
in this session, against baseline commit `1088b9f7fe722038a39edc4213026be4dbf8e754`.
No independent calibration targets or valid partitions were found. **No fit is
authorized by the current local data.** This document specifies the gates for a
future reviewed experiment; it supplies neither observations nor parameter bounds
validated by independent physical evidence.

## Separate questions and evidence requirements

| Component | Target | Required independent evidence | Current decision |
| --- | --- | --- | --- |
| Source detection | Verified event detection, location and timing | Reviewed event catalogue including non-events, event IDs, satellite coverage and independent labels | Blocked: FIRMS detections are detector inputs, not independent labels |
| Transport | Location/timing of an independently observed plume | Linked independent plume/receptor observations and contemporaneous, correctly timed wind/PBLH inputs | Blocked: no verified event-to-receptor links or independent transport targets |
| Receptor concentration | Station PM2.5 enhancement above a documented background, µg/m³ | Repeated quality-reviewed station observations, known averaging/availability times, pre-event backgrounds, linked source episodes and matching wind | Blocked: latest readings alone cannot identify enhancements |
| Band statistics / relative risk / health | Separately defined spatial/time statistic or outcome | Independent evidence measuring the same statistic or health outcome | Blocked: station readings do not validate band maxima or health probabilities |
| Optional ML | Numerical approximation to physics, separately from atmospheric skill | Observational evidence for scientific validation; existing simulated labels only support numerical tests | No new training or scientific calibration |

## Inclusion, exclusion and matching

Require finite, nonnegative PM2.5 in `ug/m3`, WGS84 coordinates, timezone-aware
period endpoints and availability times, verified averaging periods and quality,
and content-bound source provenance. Zero is a legitimate measurement. Missing,
nonfinite, ambiguous-time or model-generated measurements are not zeros. Invalid
records block the experiment rather than being silently removed.

Require reproducible frozen detector inputs, independently reviewed physical
event grouping, and source/wind availability strictly before prediction. Do not
infer packet availability from a fetch-start/generation time; require separately
recorded aware availability timestamps for fire/source/wind inputs. Do not
shift the existing wind timestamps, infer observation averaging intervals or
rename ranked source IDs into independent events. Source attribution needs
independent evidence; baseline geometry is only an association policy.

Preserve existing matching rules: hourly endpoints 1–48 hours after forecast
start; at least three same-station, same-location, equal-duration pre-event
background readings within 24 hours; baseline transport of at least 1 km,
direction cosine ≥0.5 and distance within two baseline sigmas. Matching is frozen
without inspecting target concentrations. Report rejected and ambiguous cases.
These engineering thresholds are not validated attribution or sample-size rules.

## Independence and protected evaluation

Before optimization, a local manifest must contain a frozen protocol with explicit
training, validation and protected-test **physical event IDs**. At least two
training events, one validation event and one test event are required by the
software gate. Each partition needs two stations and respectively at least four,
two and two matched targets. These are minimum software gates, not sufficient
evidence of generalization or statistical power.

Repeated event captures remain together. All source/background/target IDs must be
disjoint across partitions. Before matching or optimization, validate every capture
in the frozen manifest, including unmatched captures: all 48-hour forecast windows
in an earlier partition must finish strictly before any source episode in a later
partition starts. Captures belong only to their predeclared physical event's
partition; unmatched captures do not supply independent events or eligible targets.
Reject overlapping measurement periods, relabelled duplicate fire identities
and inconsistent station coordinates. The
protocol must specify either `SAME_STATIONS_NEW_EVENTS` (no claim of station
generalization) or `DISJOINT_STATIONS`; enforce the latter both when constructing
splits and when accepting saved experiments/artifacts, using actual evaluated
station identities rather than the policy string alone.

Evaluate the unchanged baseline first. Fit supported parameters on training only.
Validation accepts or rejects the frozen training candidate; it cannot retune
using test targets. Freeze candidate parameters before calculating candidate test
metrics. No retries or grid expansion based on test performance. A new experiment
using previously inspected test data needs a new independent protected test set.

## Parameters, objectives and acceptance

Keep all equations and defaults unchanged. Possible future fitting axes are
`sigma0_m`, `k_m_sqrt_hour`, `tau_hours`, and `concentration_scale_ug`. The existing
factor-of-two grids are engineering priors, not scientifically established bounds.
A future protocol must bind the exact search configuration and record a reviewed
physical rationale for every varied axis. Fix unsupported or confounded parameters
to baseline; inactive source-radius floors, spread/scale confounding and short
transport ages require particular attention. No current evidence supports fitting
any of them. FRP strength is not measured emission mass.

Training objective: receptor-enhancement RMSE; report MAE and signed
prediction-minus-observation bias. Compare baseline and candidate on exactly the
same eligible observation IDs, event/station assignments and observed increments
within each partition. Require strictly lower training RMSE. Before fitting,
predeclare `min_relative_rmse_improvement` in (0,1) and nonnegative
`max_mae_regression_ugm3`; neither is selected using validation/test performance.
For both validation and protected test, candidate aggregate RMSE must be at most
`baseline RMSE * (1 - min_relative_rmse_improvement)` and strictly below baseline
RMSE. Aggregate MAE may exceed baseline MAE only by the declared MAE tolerance.
For every event in those two partitions, candidate RMSE must not exceed its
baseline RMSE (no RMSE regression tolerance), while event MAE may exceed baseline
MAE only by `max_mae_regression_ugm3`. No acceptance threshold is changed here.
Report station/event metrics and sample shares. Engineering grid sensitivity is
not a confidence interval. Event-level uncertainty or a justified power calculation
requires enough independent episodes; neither can be calculated from this capture.
Compare persistence/background-only baselines only when independent time series
make them meaningful. Do not report source precision/recall, Brier score or health
metrics without suitable targets.

## Artifacts and runtime separation

Record exact dataset/content and model-code hashes, protocol ID/hash, baseline and
candidate parameters/units, splits, per-target predictions, reproducible metrics,
identifiability, acceptance and reviewer status. Saved version-2 experiments retain
`history_inputs`, the entire original manifest excluding `protocol`. Validate its
digest against `protocol.history_inputs_sha256` and the reconstructed full-manifest
digest against `dataset.content_sha256`. Recheck every capture's embargo and bind
evaluation observation/station identities to these frozen inputs on artifact
acceptance. Missing or malformed protocol/input structures fail with `ValueError`.
Successful fitting produces a **candidate pending expert review**, not runtime
approval. Candidate export must
use an explicit separate path and cannot overwrite `models/plume/params.json`.
Runtime loading requires a separate content-bound, named and dated approval for
development evaluation. That local approval is a trusted operator assertion, not
authentication, scientific certification or permission for operational health use.

For this session: independent events/targets = 0; baseline and held-out scientific
metrics = unavailable; parameters fitted = none; baseline remains in use.
