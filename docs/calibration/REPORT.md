# AERIS scientific calibration session — 2026-10-11

**Overall status: `BLOCKED_INSUFFICIENT_VALIDATION_DATA`.**

No component has eligible independent validation targets. No scientific parameter
was fitted, no scientific accuracy or uncertainty interval was calculated, no
calibrated artifact was manufactured, and the production baseline remains intact.
The calibration pipeline was hardened and its numerical mechanics were exercised
using explicitly labelled mathematical tests. This is preparation for a reviewed
experiment, not independent atmospheric calibration or forecast skill.

## Repository and preservation

Initial branch: `feature/submission-readiness`. HEAD and local upstream ref:
`1088b9f7fe722038a39edc4213026be4dbf8e754`. Initial working tree and index were
clean. Local `origin/main` remains
`f9a1ff0408e97dd1f0d6b0a2cbb662a5e0400e5f`; the integration merge was not repeated.
[PR #27](https://github.com/sinhaaditya5/AERIS/pull/27) was read on this date and
remains an open draft showing HEAD `1088b9f` and 18 commits. No remote mutation or
CI execution was performed.

`stash@{0}` remains `dc269a1ecf4a487e8e3e2064fa18fee3e9e67062`.
`backup/submission-readiness-pre-teammate-merge` remains
`eb441e6323ddf340fbfafa1a1845afbfbe4fcdcc`. The fifteen readiness commits and
frontend commit `6944291` remain ancestors of HEAD. Existing recovery directories
`aeris-submission-recovery-kjtukbx2`, `aeris-submission-commits-jcy1dv60` and
`aeris-integration-hpk_szwj` remain in the Windows temporary directory, with their
existing file hashes preserved.

The local-only `docs/submission/COMMIT_PLAN.md` was **already absent at the initial
inspection**. This session did not recreate, delete, modify or stage it.

Preservation evidence checks all 374 initially tracked files and 59 ignored Lambda
staging/optional-surrogate files. Only the six intended tracked code/documentation
paths listed below changed. Captures, publication copies, historical audits,
source/transport equations and default values, optional ML dataset/pickle and
Lambda staging files are byte-for-byte preserved. The index hash, HEAD, branch,
stash and backup ref are unchanged. No files are staged or committed.

## Scientific targets and eligibility

The [frozen protocol](PROTOCOL.md) was written before any scientific fitting.
The [machine-readable inventory](ELIGIBILITY.json) records exact byte hashes,
canonical capture identities, raw counts, duplicate publication aliases,
timestamps, provenance, units and exclusion reasons. Its verified independent
event/target counts are zero; this does not imply there were zero actual fires.

| Component | Independently eligible events / targets | Disposition and missing evidence |
| --- | ---: | --- |
| Source event detection | 0 / 0 | Blocked. No independent event/non-event labels, detection-coverage catalogue, verified locations/timing or land-use labels |
| Plume transport | 0 / 0 | Blocked. No independently observed plume trajectories or verified source-to-receptor episode associations; archived wind timing is unverified |
| Receptor PM2.5 enhancement | 0 / 0 | Blocked. No repeated station series, verified averaging/availability intervals, pre-event background series, quality review and event-matched meteorology |
| Band-peak statistics / relative risk | 0 / 0 | Blocked. Station observations do not measure source-band grid/time maxima or validate relative-score scales |
| Population exposure / health outcomes | 0 / 0 | Blocked. Population reference and rankings are spatial proxies, not independently observed exposure or health outcomes |
| Optional ML atmospheric validation | 0 / 0 | Blocked. Existing teacher-generated labels support numerical approximation only; no observational training or retraining performed |

### Local dataset inventory

| Dataset path | Actual raw records | Independent calibration targets | Evidence and limitation |
| --- | ---: | ---: | --- |
| `data/live/aqi.json` | 60 stations; 59 finite nonnegative PM2.5 readings with aware end timestamps | 0 | OpenAQ; one reading per station, six distinct end timestamps, no period starts, availability times or quality flags. PM2.5 spans 1.1–235 µg/m³; Sep 30 18:58:57Z–Oct 7 08:00Z, 2026. One record lacks PM2.5/time. No pre-event background series. Provider license not recorded in the capture |
| `data/live/fires.json` | 227 detections | 0 | NASA FIRMS VIIRS NRT, three satellites; Oct 7 07:44–08:41Z. 226 nominal, one high confidence. MW FRP and K brightness are detector inputs, not measured emission mass or independent event labels. Capture license not recorded |
| `data/live/wind.json` | 323 grid points; 15,504 usable numerical hourly samples, 48 times | 0 | Open-Meteo GFS model forecasts; u/v m/s, PBLH m; stored Oct 6 18:30Z–Oct 8 17:30Z. Values are syntactically complete, but original time/availability lineage is not verified. Capture license not recorded |
| `data/live/sources.json` | 10 archived sources | 0 | Derived legacy detector output; original input/parameter binding unknown. Not independent labels. The unchanged current detector replay yields 22 candidates from the same 227 detections, not 22 independently confirmed events |
| `data/live/corridor.geojson` | 50 features: 40 bands and 10 centrelines | 0 | Archived legacy simulation with obsolete concentration/risk floors. Band maxima are not observed receptor concentrations |
| `data/live/ranked_sites.json` | 444 site rankings | 0 | Derived spatial exposure/ranking proxy, not measured station exposure or outcomes |
| `data/live/actions.json` | 8 actions | 0 | Derived stored advisories, not independently observed outcomes |
| `data/live/population.json` | 222,792 cells | 0 | WorldPop India 2020 1 km population reference; embedded CC BY 4.0 metadata. Does not supply atmospheric or health validation |
| `data/live/sites.geojson` | 3,132 OSM school/hospital features | 0 | Real reference locations, unknown capacities retained; OSM attribution present. No independently observed receptor exposure or outcomes |
| `data/live/india-boundary.geojson` | 1 boundary feature | 0 | Reference/display geometry; provenance/license not embedded; no target measurements |
| `.venv/task4-surrogate/dataset.json` | 1,400 scenarios, 11,200 simulated point labels | 0 | `BASELINE_SIMULATED`, seed 42, origin 30°N/75°E, reference time Jan 1, 2020. Train 1,000/8,000, validation 200/1,600, test 200/1,600 scenarios/points. All targets depend on the baseline teacher; none are observed concentrations |

Seven `web/public/data/` publication copies have the same parsed records as their
live counterparts and are not additional observations. Local Git history contains
one capture introduction (`55c869f`) for AQI, FIRMS and wind; archived source,
corridor and population revisions are predictions/references, not new independent
station histories. No `data/history/` or `data/historical/` manifest exists.
Mathematical values constructed in tests and ignored test-run copies do not add
observational events. Existing calibration report
`.venv/calibration-current-report.json` also records zero matches and no optimizer
execution. Existing ML evaluation reports concern simulated teacher labels.

The original wind producer at capture commit `55c869f` called
`datetime.fromisoformat(t_str).astimezone(timezone.utc)` without assigning UTC to
naive source times. Current ingestion correctly handles UTC requests, but that
does not retroactively verify or repair the old capture. The stored half-hour
timestamps are not shifted or relabelled. Raw provider responses and original
timezone context are required to resolve this lineage issue.

For AQI, the latest retained end time predates stored source/wind snapshot
generation times. Assigning later generated snapshots to those earlier readings would
also violate prospective chronology. Publication timestamps cannot substitute for
measurement periods or original input availability. Latest-station selection,
capped requests, satellite overpass coverage and the single regional capture
introduce unquantified selection biases. No spatial/temporal tolerance can supply
missing source attribution, averaging intervals or independent events.

The station contract interprets PM2.5 as µg/m³, but the original provider unit
metadata is not retained in this capture. Current OpenAQ selection matches sensor
parameter names without preserving source units. Independent unit verification is
also required for a calibration manifest; no unit conversion is invented here.
Fetchers record generation near request start, so generation alone does not prove
packet availability. The historical gate now requires separate verified fire,
source and wind availability timestamps before prediction.

## Parameters and unchanged baseline

Source defaults remain: 24-hour window, 7.5 km DBSCAN distance, minimum support 3,
nominal confidence threshold, noise dropped, FRP proxy scale 500 MW, confidence
count scale 10, and agricultural region `(73.8, 28.8, 77.2, 32.5)` with October/
November season proxy. Confidence weights remain 0.4 count / 0.3 high-share /
0.3 recency. These scores are not calibrated probabilities; source type is a
region/season proxy and FRP strength is not an emission rate.

Plume physical defaults remain `sigma0_m=2000`, `k_m_sqrt_hour=1000`,
`tau_hours=24`, `concentration_scale_ug=1e12`. All fifteen defaults, including
2,000 m grid cells, 5 µg/m³ extraction threshold, 50 µg/m³ risk scale and 200 m
PBLH floor, are recorded in the inventory and remain unchanged.

Transport uses hourly Euler advection, baseline wind interpolation and hourly
puff emissions. Spread remains `sigma_initial + k * sqrt(age_hours)` with the
existing source-radius floor; removal remains `exp(-age_hours/tau_hours)`.
Concentration remains a Gaussian sum scaled by normalized source strength,
decay and mixing depth. Observations do not identify this scale as emission mass.
The radius floor can make `sigma0_m` inactive; spread, removal and strength/scale
effects can be confounded. None of the four parameters is identifiable from the
available station snapshot. Numerical and concentration functions were compared
against HEAD using ASTs and remain unchanged; only the corridor CLI loader changed.

**Fitted parameters: none.** All physical calibration parameters remain assumed.
The existing 625-candidate factor-of-two search grid is unchanged and remains an
engineering prior, not a scientifically validated set of bounds.

## Implemented pipeline hardening

- Require a frozen, content-bound experiment plan, exact search/code/input
  definitions, reviewed parameter rationale and declared acceptance criteria.
- Require separately reviewed observation quality, averaging intervals and
  observation payload digests; independently reviewed event attribution and
  stable station coordinates. Legitimate zero readings remain valid.
  Require independently recorded packet availability, rather than assuming that
  fetch-start/generation timestamps establish availability.
- Require explicit training/validation/protected-test physical event IDs, at least
  two/one/one events, two stations per partition, and four/two/two targets. Reject
  repeated fire identities, shared background/target IDs, overlapping full
  48-hour forecast windows across every frozen capture, including unmatched
  captures, and declared station-holdout violations during fitting and saved-artifact
  acceptance. These are
  software minimums, not a power calculation or generalization guarantee.
- Evaluate unchanged baseline before fitting, fit training only, freeze the
  candidate, reject failed validation before candidate test evaluation, and
  enforce identical predeclared validation/test and event-level acceptance rules.
- Store per-target predictions and recompute saved aggregate/event/station metrics.
  Reject inconsistent paired targets, metrics, parameters, protocol, code or
  partitions. Saved artifacts retain the entire content-bound original input
  manifest, recheck its capture embargo and bind evaluated station identities.
- Export candidates only to explicit separate paths, prohibit calibration writes
  to runtime `params.json`, and mark candidates pending expert review. Runtime
  loading and corridor CLI artifact loading require a separate named, dated,
  content-bound development approval. Explicit parameter overrides retain their
  `EXPLICIT` provenance and cannot turn a candidate into a calibration artifact.

The existing pipeline/API/frontend continue exposing exact output/input provenance,
legacy disclosures, heuristic semantics and band-versus-receptor distinctions.
Existing end-to-end provenance and frontend regressions passed. No candidate was
integrated and no API/frontend schema or application behavior was changed.

## Baseline, held-out evaluation and uncertainty

Eligible matched events/stations/targets: **0 / 0 / 0**. Training, validation and
protected test cannot be formed from this capture. Scientific baseline/candidate
MAE, RMSE, bias, source classification metrics, event/subgroup performance and
uncertainty intervals are **unavailable**, not zero. Persistence or background-only
comparisons also require a time series not present here. No scientific optimizer
ran and no accepted, rejected-fitted or partially calibrated real candidate exists.

Mathematical optimizer/serialization/leakage/approval tests exercise software
mechanics only. Their artificial independent-coordinate equation and fixtures are
not emitted as atmospheric metrics or real historical manifests. No protected
observational test set was consulted or reused.

## Original preparation-session reproduction and validation

The results in this section describe the original preparation session. Newly
executed validation after closing the artifact gaps is recorded separately below.

All Python executions used `D:\AERIS\.venv\Scripts\python.exe`, **Python 3.14.3**,
Windows AMD64, with `-B -X utf8`. Node was **24.16.0**. No Python 3.12 execution,
remote CI, live feed, Linux ARM64 packaging or SAM/AWS deployment was verified.

Detailed logs, initial/preservation hashes, deterministic CLI reports and the
review diff are outside the repository at:
`C:\Users\LENOVO\AppData\Local\Temp\aeris-calibration-z4n0n_sl`.

Commands executed from `D:\AERIS` (the npm commands run from `web/`):

```powershell
$evidence = 'C:\Users\LENOVO\AppData\Local\Temp\aeris-calibration-z4n0n_sl'
.\.venv\Scripts\python.exe -B -X utf8 -m pytest models/plume/tests -q -p no:cacheprovider --basetemp "$evidence\verified-targeted-tmp"
.\.venv\Scripts\python.exe -B -X utf8 -m pytest -q -p no:cacheprovider --basetemp "$evidence\verified-full-tmp"
.\.venv\Scripts\python.exe -B -X utf8 -m models.plume.calibrate --report "$evidence\repository-result.json" --params-output "$evidence\candidate.json"
.\.venv\Scripts\python.exe -B -X utf8 -m models.plume.calibrate --report "$evidence\repository-result-second.json" --params-output "$evidence\candidate-second.json"
.\.venv\Scripts\python.exe -B -X utf8 -m scripts.publish_model_provenance --check
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
git diff --check
```

Use a fresh temporary directory for repeated tests; pytest controls only its
designated temporary test directory. These calibration commands never fetch data.

| Check | Exit | Actual result |
| --- | ---: | --- |
| Final targeted plume/calibration suite | 0 | 171 passed, 6.12 s |
| Final full Python suite (includes source, plume, ingestion, pipeline, API, ML trust and packaging regressions) | 0 | 811 passed, 2 warnings, 21.11 s |
| Full frontend Vitest | 0 | 206 passed across 16 files, 21.80 s |
| TypeScript app/node/browser checks via `npm.cmd run typecheck` | 0 | Passed |
| Frontend lint | 0 | Passed with 7 existing warnings |
| Static model provenance | 0 | Published companion verified; snapshots unchanged |
| Actual repository calibration, twice | 1 each | Expected `BLOCKED_NO_VALID_HISTORICAL_DATA`; byte-identical reports, optimizer false, fitted parameters null; no candidate/runtime parameter file |
| Scientific equations/defaults comparison | 0 | Source/transport unchanged; all non-CLI corridor functions unchanged |
| Git whitespace check | 0 | Passed; Windows LF/CRLF advisory for `calibrate.py` |

Earlier runs also passed: initial targeted 164 (10.80 s), full Python 804
(26.78 s), followed by targeted 170 (6.52 s) and full Python 810 (23.58 s) after
the availability checks. Final runs above include the additional report-only CLI
regression. Final review found an output-collision guard that dereferenced an absent
optional parameter destination; it was corrected and covered by that regression.
No executed test run failed. Final full
Python validation exercised all 171 plume/calibration tests. Python warnings: Requests dependency compatibility
(`urllib3 2.6.3`, `chardet 7.3.0`, `charset_normalizer 3.4.6`) and joblib physical
core discovery fallback (`WinError 2`). Lint warnings: four Fast Refresh exports,
two existing effect-state updates and one effect/ref cleanup. No warning was hidden
or converted into a scientific success claim. Browser/deployment environments
were not rerun for these backend calibration changes.

## Exact changed files and disposition

Modified tracked paths:

- `models/plume/calibrate.py`
- `models/plume/history.py`
- `models/plume/parameters.py`
- `models/plume/corridor.py` (artifact-loading CLI only)
- `models/plume/tests/test_calibrate.py` (existing isolated loader stub updated;
  independent new tests verify actual review enforcement)
- `models/plume/README.md`

New, unstaged paths:

- `models/plume/protocol.py`
- `models/plume/tests/test_protocol.py` (initially 55 new parameterized regression
  cases; 139 total after the gap-closure work below)
- `docs/calibration/PROTOCOL.md`
- `docs/calibration/ELIGIBILITY.json`
- `docs/calibration/REPORT.md`

No dependency, captured dataset, historical audit, ML artifact, Lambda staging,
frontend, ingestion or contributor application file was modified. New data-like
JSON is an evidence inventory, not fabricated measurements or a fitted artifact.

## Next evidence and review requirements

1. Source detection: independently verified positive/negative source episodes,
   observation coverage, timestamps/locations and reviewable event grouping. Only
   then consider spatial/time/support thresholds, false positives/misses and timing
   errors. Land-use, probability and emission targets each need their own evidence.
2. Transport/receptor concentration: repeated quality-reviewed station series with
   original intervals/units/availability, multiple independent source episodes,
   pre-event background measurements, reviewed source attribution and historical
   wind/PBLH availability with resolved UTC lineage. Four events/two stations is
   merely the implementation floor; representative independent episodes and a
   justified statistical design are needed for meaningful uncertainty/generalization.
3. Expert review: physically justified parameter bounds, sensitivity/identifiability
   decisions, subgroup and uncertainty protocol, and a genuinely untouched protected
   test set. Previous test inspection cannot be erased by setting a flag.
4. Separate evidence for continuous exposure, band statistics, risk probabilities
   and actual health outcomes. Concentration calibration cannot certify these targets.

The hardened tooling is suitable for **development code review and preparation**.
There is no candidate to accept or promote; AERIS remains an uncalibrated baseline
demonstration and is not suitable for operational exposure/health decisions on the
evidence available here. Content hashes and review flags establish consistency,
not provenance authentication or scientific truth. Future real-data end-to-end
fitting, uncertainty estimation and intended-runtime artifact loading remain
unverified. Final Git operations are left entirely to the owner.

## Artifact-validation gap closure — 2026-10-11

Overall status remains `BLOCKED_INSUFFICIENT_VALIDATION_DATA`: zero independently
eligible events/targets, no scientific fitting, no candidate and no available
scientific metrics. Protocol ID `aeris-independent-history-v1` and baseline HEAD
`1088b9f7fe722038a39edc4213026be4dbf8e754` remain unchanged.

The saved-artifact validator now checks actual station sets under
`DISJOINT_STATIONS`, binds observation/station identities to frozen inputs, and
requires partition metadata consistent with the frozen event split. Station reuse
under `SAME_STATIONS_NEW_EVENTS` still requires independent physical event IDs.
Every frozen capture's full 48-hour window is checked before matching/optimization
and again during artifact acceptance. Unmatched captures retain their declared
event membership and never supply eligible-target or independent-event counts.
Version-2 experiments must retain `history_inputs`, the complete original manifest
excluding `protocol`, with both input and reconstructed dataset digests verified.
Existing incomplete version-2 fixtures/artifacts fail closed; no real candidate
exists in this repository to migrate. Null, non-object, missing and malformed
nested protocol structures now raise clear `ValueError` exceptions at public
validation/loading entry points. Acceptance wording now distinguishes relative
aggregate RMSE improvement, event-level RMSE non-regression and the declared MAE
tolerance, with identical eligible targets for baseline/candidate comparisons.
Scientific acceptance thresholds and equations were not changed.

Added and executed 84 regression cases: valid and overlapping station assignments,
station reuse with event independence, inconsistent saved partitions, unmatched
capture embargo violations and valid windows, complete-manifest digest binding,
an isolated mathematical orchestration test proving embargo checks precede
matching/optimization, 18 malformed protocol structures through three public
entry points, four export/writer missing/null-protocol regressions, and six
acceptance-boundary cases. Fixtures remain explicitly
`MATHEMATICAL_TEST`; parser/provenance stubs in the orchestration test are isolated
software mechanics, not observational eligibility. The suites exercise mathematical
optimizer mechanics only; the actual repository CLI executes no optimizer.

All newly executed Python commands used `D:\AERIS\.venv\Scripts\python.exe`,
Python **3.14.3**, Windows AMD64, with `-B -X utf8` and bytecode/pytest cache writes disabled.
Exact commands and UTF-8 logs are retained in a fresh temporary evidence directory:

```powershell
$closureEvidence = 'C:\Users\LENOVO\AppData\Local\Temp\aeris-calibration-gaps-m1a3e2xo'
.\.venv\Scripts\python.exe -B -X utf8 -m pytest models/plume/tests -q -p no:cacheprovider --basetemp "$closureEvidence\final-plume-tmp"
.\.venv\Scripts\python.exe -B -X utf8 -m pytest -q -p no:cacheprovider --basetemp "$closureEvidence\final-python-full-tmp"
.\.venv\Scripts\python.exe -B -X utf8 -m models.plume.calibrate --report "$closureEvidence\final-blocked-1.json" --params-output "$closureEvidence\final-candidate-1.json"
.\.venv\Scripts\python.exe -B -X utf8 -m models.plume.calibrate --report "$closureEvidence\final-blocked-2.json" --params-output "$closureEvidence\final-candidate-2.json"
.\.venv\Scripts\python.exe -B -X utf8 -m scripts.publish_model_provenance --check
git diff --check
```

These are executed commands, not permission for scientific fitting. Use new
temporary directories for future reruns rather than reusing pytest's basetemp.

| Newly executed check | Exit | Actual result |
| --- | ---: | --- |
| Complete plume/calibration suite | 0 | 255 passed, 6.84 s |
| Full Python suite | 0 | 895 passed, 2 warnings, 20.37 s |
| Actual calibration CLI, twice | 1 each | Expected `BLOCKED_NO_VALID_HISTORICAL_DATA`, optimizer false, zero matches, null parameters/metrics; no candidate/runtime artifact |
| Reproducibility | 0 | Byte-identical blocked reports; SHA-256 `c2d489dcdda408d024751576240023522e8e5bc3802a804f67a92b4cdcd35bf1` |
| Static provenance | 0 | Published companion verified; snapshots unchanged |
| Git whitespace | 0 | Passed; existing LF/CRLF advisory for `calibrate.py` |

The first gap-closure runs also passed (251 plume tests in 6.67 s; 891 full-suite
tests, two warnings, in 19.73 s). Final review then found that the export builder
could raise `KeyError` for missing protocol metadata before reaching the artifact
validator. It now passes missing metadata through the same `ValueError` validation
path; the four new export/writer cases are included in the final reruns above.
All four actual repository CLI reports (initial and final pairs) are byte-identical.
No test run failed. Fresh basetemps and earlier logs were retained separately.

The full-suite warnings remain Requests dependency compatibility (`urllib3 2.6.3`,
`chardet 7.3.0`, `charset_normalizer 3.4.6`) and joblib physical-core discovery
fallback (`WinError 2`). Frontend, TypeScript and lint results above are prior-session
evidence and were not rerun during this backend-only closure. No Python 3.12,
remote CI, live-feed, Linux ARM64 packaging, SAM/AWS deployment or independent
scientific validation is newly claimed. Full-manifest retention increases future
artifact size; real-data artifact/runtime behavior remains unverified. Content
digests and operator assertions still do not authenticate scientific truth or
establish that a protected observational test set was never inspected.
