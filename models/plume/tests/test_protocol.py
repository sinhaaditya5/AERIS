"""MATHEMATICAL_TEST mechanics, never a claimed real-history dataset or fit."""

from dataclasses import asdict, replace
from datetime import timedelta
import json
import copy

import pytest

from models.plume import calibrate as engine, history, parameters, protocol
from models.plume.advect import PlumeParams
from models.plume.tests.test_calibrate import mathematical_match_inputs, mathematical_artifact_result
from models.plume.tests.test_plume import _START, mathematical_sources, mathematical_wind


def mathematical_parts():
    events, observations = mathematical_match_inputs()
    matches, _ = history.match_observations(events, observations, history.EligibilityConfig())
    for match in matches[:2]:
        shift = timedelta(days=21)
        event = replace(match.event, event_id="math_event_21", capture_id="math_capture_21",
                        source_event_time=match.event.source_event_time + shift,
                        forecast_start=match.event.forecast_start + shift)
        observation = replace(match.observation, id=match.observation.id + "_21",
                              period_start=match.observation.period_start + shift,
                              observed_at=match.observation.observed_at + shift,
                              available_at=match.observation.available_at + shift)
        background = replace(match.background, observation_ids=tuple(i + "_21" for i in match.background.observation_ids))
        matches.append(replace(match, event=event, observation=observation, background=background))
    return matches


def mathematical_protocol(config=None):
    config = config or engine.CalibrationConfig()
    return {"schema_version": 1, "id": "mathematical-mechanics-only",
            "model_version": parameters.MODEL_VERSION, "target": "station_pm25_increment_ugm3",
            "frozen_at": _START.isoformat(), "code_sha256": protocol.code_identity(),
            "search_definition": protocol.search_definition(config),
            "search_sha256": history.content_hash(protocol.search_definition(config)),
            **{k: "MATHEMATICAL_TEST only; no observational evidence"
               for k in ("scientific_question", "inclusion_rules", "exclusion_rules", "quality_review",
                         "attribution_review", "uncertainty_plan", "limitations", "reviewer")},
            "parameter_rationale": {k: "Abstract independent-coordinate equation, not physics" for k in config.axes},
            "station_policy": "SAME_STATIONS_NEW_EVENTS", "test_previously_used": False,
            "split": {"training": ["math_event_0", "math_event_7"], "validation": ["math_event_14"], "test": ["math_event_21"]},
            "acceptance": {"min_relative_rmse_improvement": 0.05, "max_mae_regression_ugm3": 0}}


def mathematical_manifest_events(matches):
    return list({m.event.capture_id: {
        "capture_id": m.event.capture_id, "event_id": m.event.event_id,
        "source_event_time": m.event.source_event_time.isoformat(),
        "forecast_start": m.event.forecast_start.isoformat(),
        "fixture_kind": "MATHEMATICAL_TEST",
    } for m in matches}.values())


def mathematical_experiment(monkeypatch, *, validation_failure=False):
    matches = mathematical_parts()
    targets = [3, 1.5, 3, 1.5, 3, 1.5, 3, 1.5]
    matches = [replace(m, observation=replace(m.observation, pm25_ugm3=m.background.value_ugm3 + targets[i]))
               for i, m in enumerate(matches)]
    planned = mathematical_protocol()
    parts = protocol.split_matches(matches, planned, history.EligibilityConfig(),
                                   manifest_events=mathematical_manifest_events(matches))
    indices = {m.observation.id: i % 4 for i, m in enumerate(matches)}
    calls = []
    def maker(rows):
        def predict(params):
            group = rows[0].event.event_id
            calls.append((group, params == PlumeParams()))
            if validation_failure and group == "math_event_14" and params != PlumeParams():
                return [1000] * len(rows)
            equation = [params.sigma0_m / 1000, params.k_m_sqrt_hour / 1000,
                        params.tau_hours / 12, params.concentration_scale_ug / 1e12]
            return [equation[indices[m.observation.id]] for m in rows]
        return predict
    monkeypatch.setattr(engine, "make_predictor", maker)
    return parts, planned, calls


def mathematical_document(monkeypatch):
    parts, planned, _ = mathematical_experiment(monkeypatch)
    result = engine.empty_report({"evidence_kind": "MATHEMATICAL_TEST"})
    search = engine._fit_partitions(parts, engine.CalibrationConfig(), planned, result)
    # Begin with the explicitly mathematical v1 serialization fixture, then check
    # the new v2 mechanics. No REAL_CAPTURED_HISTORY flag is constructed here.
    document = engine.parameter_document(mathematical_artifact_result(), mathematical_test=True)
    document.update(schema_version=2, parameters=asdict(search.selected),
                    metrics=result["metrics"], evaluation=result["evaluation"], group_metrics=result["group_metrics"],
                    protocol=planned, protocol_sha256=history.content_hash(planned), code_sha256=protocol.code_identity(),
                    candidate_parameters_sha256=result["candidate_parameters_sha256"],
                    candidate_frozen_before_test=True, reviewer_status="PENDING_EXPERT_REVIEW", runtime_approved=False,
                    split={"training_events": planned["split"]["training"],
                           "validation_events": planned["split"]["validation"], "holdout_events": planned["split"]["test"]})
    rows = [m for part in parts.values() for m in part]
    document["history_inputs"] = {
        "evidence_kind": "MATHEMATICAL_TEST",
        "events": mathematical_manifest_events(rows),
        "observations": [{"id": m.observation.id, "station_id": m.observation.station_id,
                          "fixture_kind": "MATHEMATICAL_TEST"} for m in rows],
    }
    document["dataset"].update(events=4, observations=8)
    rebind_mathematical_document(document)
    return document


def rebind_mathematical_document(document):
    """Consistency-test fixtures only; never construct or approve real candidates."""
    assert document["evidence_kind"] == "MATHEMATICAL_TEST"
    inputs, plan = document["history_inputs"], document["protocol"]
    plan["history_inputs_sha256"] = history.content_hash(inputs)
    document["protocol_sha256"] = history.content_hash(plan)
    document["dataset"]["content_sha256"] = history.content_hash({**inputs, "protocol": plan})


def test_frozen_protocol_reproduces_config_and_rejects_changed_search():
    config = engine.CalibrationConfig()
    plan = mathematical_protocol(config)
    assert protocol.validate_protocol(plan, config, _START + timedelta(days=30)) == plan
    plan["search_definition"]["sensitivity_absolute_ugm3"] = 99
    with pytest.raises(ValueError, match="changed after freezing"):
        protocol.validate_protocol(plan, config, _START + timedelta(days=30))


@pytest.mark.parametrize("mutation", ["absent", "test_reused", "unknown_test", "code", "date", "acceptance", "rationale", "overlap"])
def test_invalid_frozen_protocol(mutation):
    plan = mathematical_protocol()
    if mutation == "absent": plan = None
    elif mutation == "test_reused": plan["test_previously_used"] = True
    elif mutation == "unknown_test": plan.pop("test_previously_used")
    elif mutation == "code": plan["code_sha256"] = {}
    elif mutation == "date": plan["frozen_at"] = (_START + timedelta(days=31)).isoformat()
    elif mutation == "acceptance": plan["acceptance"]["min_relative_rmse_improvement"] = float("nan")
    elif mutation == "rationale": plan["parameter_rationale"] = {}
    else: plan["split"]["test"] = plan["split"]["validation"]
    with pytest.raises(ValueError):
        protocol.validate_protocol(plan, engine.CalibrationConfig(), _START + timedelta(days=30))


def test_three_part_event_split_and_declared_station_scope():
    matches = mathematical_parts(); plan = mathematical_protocol()
    parts = protocol.split_matches(matches, plan, history.EligibilityConfig(),
                                   manifest_events=mathematical_manifest_events(matches))
    assert [len(parts[p]) for p in protocol.PARTITIONS] == [4, 2, 2]
    plan["station_policy"] = "DISJOINT_STATIONS"
    with pytest.raises(ValueError, match="SPLIT_STATION_OVERLAP"):
        protocol.split_matches(matches, plan, history.EligibilityConfig(),
                               manifest_events=mathematical_manifest_events(matches))


@pytest.mark.parametrize("mutation,message", [("forecast", "OVERLAPPING_FORECAST_WINDOWS"),
                                              ("background", "SPLIT_OBSERVATION_OVERLAP"),
                                              ("fire", "SAME_FIRE_DIFFERENT_EVENTS"),
                                              ("event_missing", "SPLIT_EVENT_MISMATCH")])
def test_episode_leakage_is_rejected(mutation, message):
    matches = mathematical_parts()
    if mutation == "forecast":
        capture = matches[0].event.capture_id
        matches = [replace(m, event=replace(m.event, forecast_start=_START + timedelta(days=13)))
                   if m.event.capture_id == capture else m for m in matches]
    elif mutation == "background": matches[-1] = replace(matches[-1], background=matches[0].background)
    elif mutation == "fire":
        for i in (0, -1): matches[i] = replace(matches[i], event=replace(matches[i].event, fire_keys=frozenset({"math-shared-fire"})))
    else: matches = matches[:-2]
    with pytest.raises(ValueError, match=message):
        protocol.split_matches(matches, mathematical_protocol(), history.EligibilityConfig(),
                               manifest_events=mathematical_manifest_events(matches))


def test_station_relocation_does_not_silently_form_same_station_history():
    events, obs = mathematical_match_inputs()
    obs[0] = replace(obs[0], lat=31)
    with pytest.raises(ValueError, match="INCONSISTENT_STATION_COORDINATES"):
        history.check_history_population(events, obs, history.EligibilityConfig(), _START + timedelta(days=30))


@pytest.mark.parametrize("stamp", [None, "2020-01-01T01:00:00", "invalid", "2019-12-31T23:59:00Z"])
def test_input_availability_is_not_inferred_from_fetch_start(stamp):
    with pytest.raises(ValueError):
        history.input_available_at({"available_at": stamp}, _START, "math-input")


def test_late_packet_availability_prevents_prospective_prediction():
    available = history.input_available_at({"available_at": (_START + timedelta(hours=1)).isoformat()},
                                          _START, "math-input")
    with pytest.raises(ValueError, match="FUTURE_SOURCE_OR_WIND"):
        history.check_chronology(available, _START, _START, _START + timedelta(minutes=30))


def test_valid_recorded_packet_availability_is_preserved():
    stamp = _START + timedelta(minutes=2)
    assert history.input_available_at({"available_at": stamp.isoformat()}, _START, "math-input") == stamp


@pytest.mark.parametrize("field,value", [("observed_at", "2020-01-01T01:00:00"), ("available_at", "invalid"),
                                         ("period_start", "2020-01-01T02:00:00Z"), ("lat", 91), ("lon", -181),
                                         ("pm25_ugm3", float("nan")), ("pm25_ugm3", -1), ("unit", "ppm"),
                                         ("quality_verified", False), ("averaging_period_verified", None)])
def test_observation_invalid_time_coordinates_units_quality(field, value):
    row = mathematical_observation_row(); row[field] = value
    with pytest.raises(ValueError): history.parse_observation(row)


def mathematical_observation_row():
    return {"id": "math-zero", "station_id": "math-station", "lat": 30, "lon": 75,
            "period_start": "2020-01-01T01:00:00Z", "observed_at": "2020-01-01T01:00:00Z",
            "available_at": "2020-01-01T01:00:00Z", "unit": "ug/m3", "pm25_ugm3": 0,
            "observational": True, "quality_verified": True, "averaging_period_verified": True,
            "provenance": {"kind": "MATHEMATICAL_TEST"}}


def test_zero_preservation_and_payload_binding_with_isolated_provenance_stub(monkeypatch):
    row = mathematical_observation_row(); received = []
    def stub(metadata, name, payload):
        received.append(payload); return metadata
    monkeypatch.setattr(history, "provenance", stub)
    assert history.parse_observation(row).pm25_ugm3 == 0
    assert received == [{k: v for k, v in row.items() if k != "provenance"}]


def test_mathematical_observations_are_not_eligible():
    with pytest.raises(ValueError, match="real captured provenance"):
        history.parse_observation(mathematical_observation_row())


def test_baseline_precedes_fit_and_validation_precedes_candidate_test(monkeypatch):
    parts, plan, calls = mathematical_experiment(monkeypatch)
    report = engine.empty_report({"evidence_kind": "MATHEMATICAL_TEST"})
    engine._fit_partitions(parts, engine.CalibrationConfig(), plan, report)
    assert calls[:3] == [("math_event_0", True), ("math_event_14", True), ("math_event_21", True)]
    assert calls[-2:] == [("math_event_14", False), ("math_event_21", False)]
    assert report["candidate_frozen_before_test"] and not report["runtime_approved"]
    assert report["reviewer_status"] == "PENDING_EXPERT_REVIEW"


def test_validation_rejection_never_evaluates_test_candidate(monkeypatch):
    parts, plan, calls = mathematical_experiment(monkeypatch, validation_failure=True)
    report = engine.empty_report({"evidence_kind": "MATHEMATICAL_TEST"})
    with pytest.raises(ValueError, match="NO_VALIDATION_ACCEPTANCE"):
        engine._fit_partitions(parts, engine.CalibrationConfig(), plan, report)
    assert ("math_event_21", False) not in calls
    assert report["metrics"]["calibrated_holdout"] is None


def test_v2_mathematical_metrics_reproduce_but_are_not_deployable(monkeypatch):
    document = mathematical_document(monkeypatch)
    before = parameters.deterministic_json(document)
    parameters.validate_document(document, allow_mathematical_test=True)
    assert parameters.deterministic_json(document) == before
    with pytest.raises(ValueError, match="not deployable"):
        parameters.validate_document(document)


@pytest.mark.parametrize("mutation", ["metric", "prediction", "target", "group", "candidate_hash", "code", "protocol", "approval"])
def test_saved_evaluation_tampering_is_rejected(monkeypatch, mutation):
    document = mathematical_document(monkeypatch)
    if mutation == "metric": document["metrics"]["calibrated_validation"]["bias"] = 1
    elif mutation == "prediction": document["evaluation"]["calibrated_holdout"][0]["predicted_delta_ugm3"] = 100
    elif mutation == "target": document["evaluation"]["calibrated_validation"][0]["observation_id"] = "different"
    elif mutation == "group": document["group_metrics"]["baseline"]["events"] = {}
    elif mutation == "candidate_hash": document["candidate_parameters_sha256"] = "0" * 64
    elif mutation == "code": document["code_sha256"] = {}
    elif mutation == "protocol": document["protocol_sha256"] = "0" * 64
    else: document["runtime_approved"] = True
    with pytest.raises(ValueError): parameters.validate_document(document, allow_mathematical_test=True)


@pytest.mark.parametrize("value", [None, True, 1, "approved", {}, {"status": True}])
def test_invalid_runtime_approval_never_grants_trust(value):
    with pytest.raises(ValueError, match="not runtime approved"):
        parameters.validate_runtime_approval({"runtime_approval": value})


def test_review_binds_candidate_and_rejects_later_edits():
    document = {"fixture_kind": "MATHEMATICAL_TEST", "calibration_timestamp": _START.isoformat()}
    document["runtime_approval"] = {"status": "APPROVED_FOR_DEVELOPMENT_EVALUATION", "reviewer": "unit-test-only",
                                    "reviewed_at": _START.isoformat(), "candidate_sha256": parameters.candidate_digest(document)}
    parameters.validate_runtime_approval(document)
    document["fixture_kind"] = "edited-numerical-fixture"
    with pytest.raises(ValueError, match="does not bind"): parameters.validate_runtime_approval(document)


def test_loader_requires_review_even_when_validator_stub_succeeds(tmp_path, monkeypatch):
    path = tmp_path / "candidate.json"; path.write_text('{"fixture_kind":"MATHEMATICAL_TEST"}', encoding="utf-8")
    monkeypatch.setattr(parameters, "validate_document", lambda d: PlumeParams())
    with pytest.raises(ValueError, match="not runtime approved"): parameters.load_parameters(path=path)
    assert parameters.load_parameters({}).provenance == "EXPLICIT"


def test_candidate_writer_cannot_overwrite_runtime_path(tmp_path, monkeypatch):
    path = tmp_path / "runtime.json"; path.write_text("preserved baseline", encoding="utf-8")
    monkeypatch.setattr(engine, "PARAMETER_FILE", path)
    with pytest.raises(ValueError, match="cannot overwrite runtime"):
        engine.write_parameters(mathematical_artifact_result(), path, mathematical_test=True)
    assert path.read_text(encoding="utf-8") == "preserved baseline"


def test_report_only_cli_records_honest_block_without_parameter_destination(tmp_path, capsys):
    path = tmp_path / "eligibility.json"
    before = parameters.PARAMETER_FILE.read_bytes() if parameters.PARAMETER_FILE.exists() else None
    with pytest.raises(SystemExit) as exc:
        engine.main(["--report", str(path)])
    assert exc.value.code == 1
    document = json.loads(path.read_text(encoding="utf-8"))
    assert document["status"] == engine.BLOCKED and not document["optimizer_executed"]
    assert document == json.loads(capsys.readouterr().out)
    after = parameters.PARAMETER_FILE.read_bytes() if parameters.PARAMETER_FILE.exists() else None
    assert after == before


def test_corridor_cli_cannot_bypass_candidate_review(tmp_path, monkeypatch):
    from models.plume import corridor
    for name, data in (("sources.json", mathematical_sources()), ("wind.json", mathematical_wind()),
                       ("candidate.json", {"schema_version": 1, "fixture_kind": "MATHEMATICAL_TEST"})):
        (tmp_path / name).write_text(json.dumps(data), encoding="utf-8")
    monkeypatch.setenv("AERIS_DATA_DIR", str(tmp_path))
    monkeypatch.setattr(parameters, "validate_document", lambda d: PlumeParams())
    monkeypatch.setattr(corridor, "predict_corridor", lambda *a, **kw: pytest.fail("review precedes prediction"))
    with pytest.raises(SystemExit) as exc:
        corridor.main(["--live", "--params", str(tmp_path / "candidate.json")])
    assert exc.value.code == 1 and not (tmp_path / "corridor.geojson").exists()


def assign_mathematical_stations(document, *, overlap=None):
    """Rename both frozen fixture identities and evaluations consistently."""
    stations = {}
    for part, event_ids in document["protocol"]["split"].items():
        prefix = overlap[0] if overlap and part == overlap[1] else part
        for rows in document["evaluation"].values():
            for row in rows:
                if row["event_id"] in event_ids:
                    stations[row["observation_id"]] = f"{prefix}-{row['station_id']}"
        # Each observation occurs in a baseline/candidate pair; use original names.
    for rows in document["evaluation"].values():
        for row in rows:
            row["station_id"] = stations[row["observation_id"]]
    for row in document["history_inputs"]["observations"]:
        row["station_id"] = stations[row["id"]]
    for label, rows in document["evaluation"].items():
        grouped = {}
        for row in rows:
            grouped.setdefault(row["station_id"], []).append(row)
        document["group_metrics"][label]["stations"] = {
            station: engine.error_metrics([r["predicted_delta_ugm3"] for r in values],
                                          [r["observed_delta_ugm3"] for r in values])
            for station, values in grouped.items()
        }
    document["dataset"]["stations"] = len(set(stations.values()))
    document["protocol"]["station_policy"] = "DISJOINT_STATIONS"
    rebind_mathematical_document(document)


def test_saved_artifact_accepts_actual_disjoint_station_assignments(monkeypatch):
    document = mathematical_document(monkeypatch)
    assign_mathematical_stations(document)
    assert document["dataset"]["stations"] == 6
    parameters.validate_document(document, allow_mathematical_test=True)


@pytest.mark.parametrize("pair", [("training", "validation"), ("training", "test"), ("validation", "test")])
def test_saved_artifact_rejects_each_station_holdout_overlap(monkeypatch, pair):
    document = mathematical_document(monkeypatch)
    assign_mathematical_stations(document, overlap=pair)
    with pytest.raises(ValueError, match="SPLIT_STATION_OVERLAP"):
        parameters.validate_document(document, allow_mathematical_test=True)


def test_saved_station_reuse_does_not_authorize_event_reuse(monkeypatch):
    document = mathematical_document(monkeypatch)
    assert document["protocol"]["station_policy"] == "SAME_STATIONS_NEW_EVENTS"
    parameters.validate_document(document, allow_mathematical_test=True)
    document["split"]["holdout_events"] = document["split"]["training_events"][:1]
    with pytest.raises(ValueError, match="disjoint"):
        parameters.validate_document(document, allow_mathematical_test=True)


@pytest.mark.parametrize("mutation", ["extra_partition", "missing_partition", "invalid_ids", "different_event", "station_identity"])
def test_saved_partition_metadata_must_agree_with_frozen_inputs(monkeypatch, mutation):
    document = mathematical_document(monkeypatch)
    if mutation == "extra_partition": document["split"]["unreviewed"] = []
    elif mutation == "missing_partition": document["split"].pop("validation_events")
    elif mutation == "invalid_ids": document["split"]["validation_events"] = [{}]
    elif mutation == "different_event": document["split"]["validation_events"] = ["undeclared-math-event"]
    else:
        for label in ("baseline_validation", "calibrated_validation"):
            document["evaluation"][label][0]["station_id"] = "unbound-math-station"
    with pytest.raises(ValueError): parameters.validate_document(document, allow_mathematical_test=True)


def unmatched_mathematical_capture(records, forecast=None, source_time=None):
    extra = copy.deepcopy(next(r for r in records if r["event_id"] == "math_event_7"))
    extra["capture_id"] = "math-unmatched-capture"
    extra["forecast_start"] = (forecast or (_START + timedelta(days=7, hours=1))).isoformat()
    if source_time is not None: extra["source_event_time"] = source_time.isoformat()
    return extra


@pytest.mark.parametrize("violation", ["late_forecast", "early_episode", "equal_boundary"])
def test_full_manifest_embargo_rejects_unmatched_captures(violation):
    matches = mathematical_parts(); records = mathematical_manifest_events(matches)
    extra = unmatched_mathematical_capture(records)
    if violation == "late_forecast": extra["forecast_start"] = (_START + timedelta(days=13)).isoformat()
    elif violation == "early_episode":
        extra = copy.deepcopy(next(r for r in records if r["event_id"] == "math_event_14"))
        extra["capture_id"] = "math-unmatched-validation"
        extra["source_event_time"] = (_START + timedelta(days=8)).isoformat()
    else:
        validation_start = next(m.event.source_event_time for m in matches if m.event.event_id == "math_event_14")
        extra["forecast_start"] = (validation_start - timedelta(hours=48)).isoformat()
    with pytest.raises(ValueError, match="OVERLAPPING_FORECAST_WINDOWS"):
        protocol.split_matches(matches, mathematical_protocol(), history.EligibilityConfig(),
                               manifest_events=records + [extra])


def test_valid_unmatched_capture_does_not_supply_independent_counts():
    matches = mathematical_parts(); records = mathematical_manifest_events(matches)
    parts = protocol.split_matches(matches, mathematical_protocol(), history.EligibilityConfig(),
                                   manifest_events=records + [unmatched_mathematical_capture(records)])
    assert [len(parts[p]) for p in protocol.PARTITIONS] == [4, 2, 2]
    assert {m.event.capture_id for rows in parts.values() for m in rows} == {r["capture_id"] for r in records}


@pytest.mark.parametrize("overlap", [False, True])
def test_saved_artifact_rechecks_unmatched_capture_windows(monkeypatch, overlap):
    document = mathematical_document(monkeypatch)
    events = document["history_inputs"]["events"]
    events.append(unmatched_mathematical_capture(events, _START + timedelta(days=13) if overlap else None))
    rebind_mathematical_document(document)
    if overlap:
        with pytest.raises(ValueError, match="OVERLAPPING_FORECAST_WINDOWS"):
            parameters.validate_document(document, allow_mathematical_test=True)
    else:
        parameters.validate_document(document, allow_mathematical_test=True)
        assert document["dataset"]["events"] == 4 and len(events) == 5


@pytest.mark.parametrize("mutation", ["missing_inputs", "removed_capture", "altered_window"])
def test_saved_artifact_requires_entire_content_bound_manifest(monkeypatch, mutation):
    document = mathematical_document(monkeypatch)
    if mutation == "missing_inputs": document.pop("history_inputs")
    elif mutation == "removed_capture": document["history_inputs"]["events"].pop()
    else: document["history_inputs"]["events"][0]["forecast_start"] = (_START + timedelta(hours=1)).isoformat()
    with pytest.raises(ValueError, match="FROZEN_MANIFEST_REQUIRED|input digest mismatch"):
        parameters.validate_document(document, allow_mathematical_test=True)


def test_calibration_entrypoint_checks_unmatched_windows_before_matching_or_optimization(monkeypatch):
    # Explicit parser/provenance stubs isolate orchestration; no real-evidence flag
    # or observationally eligible fixture is constructed, and no optimizer runs.
    matches = mathematical_parts()
    events = {m.event.capture_id: m.event for m in matches}
    raw_events = mathematical_manifest_events(matches)
    extra = unmatched_mathematical_capture(raw_events, _START + timedelta(days=13))
    original = next(e for e in events.values() if e.event_id == extra["event_id"])
    events[extra["capture_id"]] = replace(original,
                                         capture_id=extra["capture_id"], forecast_start=_START + timedelta(days=13))
    raw_events.append(extra)
    _, observations = mathematical_match_inputs()
    observations += [m.observation for m in matches if m.event.event_id == "math_event_21"]
    by_id = {o.id: o for o in observations}
    inputs = {"schema_version": 1, "evidence_kind": "MATHEMATICAL_TEST",
              "provenance": {"kind": "MATHEMATICAL_TEST"}, "calibration_timestamp": (_START + timedelta(days=30)).isoformat(),
              "events": raw_events, "observations": [{"id": o.id} for o in observations]}
    plan = mathematical_protocol(); plan["history_inputs_sha256"] = history.content_hash(inputs)
    monkeypatch.setattr(engine, "REAL_EVIDENCE", "MATHEMATICAL_TEST")
    monkeypatch.setattr(engine, "provenance", lambda metadata, name: metadata)
    monkeypatch.setattr(engine, "parse_event", lambda row: events[row["capture_id"]])
    monkeypatch.setattr(engine, "parse_observation", lambda row: by_id[row["id"]])
    monkeypatch.setattr(engine, "match_observations", lambda *a, **kw: pytest.fail("embargo must precede matching"))
    monkeypatch.setattr(engine, "grid_search", lambda *a, **kw: pytest.fail("optimizer must not run"))
    result = engine.calibrate({**inputs, "protocol": plan})
    assert result.status == engine.BLOCKED and "OVERLAPPING_FORECAST_WINDOWS" in result.report["reason"]
    assert not result.report["optimizer_executed"] and result.report["fitted_parameters"] is None


@pytest.mark.parametrize("entrypoint", ["document", "saved_evaluation", "loader"])
@pytest.mark.parametrize("mutation", ["missing", "null", "list", "text", "number", "bool", "schema_bool",
                                      "definition_null", "definition_list", "axes_null", "axes_list", "axis_null",
                                      "values_null", "eligibility_null", "split_null", "split_list",
                                      "split_ids_nested", "acceptance_null"])
def test_malformed_protocols_raise_clear_value_errors_at_public_entrypoints(monkeypatch, tmp_path, entrypoint, mutation):
    document = mathematical_document(monkeypatch)
    plan = document["protocol"]
    if mutation == "missing": document.pop("protocol")
    elif mutation in ("null", "list", "text", "number", "bool"):
        document["protocol"] = {"null": None, "list": [], "text": "bad", "number": 1, "bool": True}[mutation]
    elif mutation == "schema_bool": plan["schema_version"] = True
    elif mutation == "definition_null": plan["search_definition"] = None
    elif mutation == "definition_list": plan["search_definition"] = []
    elif mutation == "axes_null": plan["search_definition"]["axes"] = None
    elif mutation == "axes_list": plan["search_definition"]["axes"] = []
    elif mutation == "axis_null": plan["search_definition"]["axes"]["tau_hours"] = None
    elif mutation == "values_null": plan["search_definition"]["axes"]["tau_hours"]["values"] = None
    elif mutation == "eligibility_null": plan["search_definition"]["eligibility"] = None
    elif mutation == "split_null": plan["split"] = None
    elif mutation == "split_list": plan["split"] = []
    elif mutation == "split_ids_nested": plan["split"]["training"] = [{}, {}]
    else: plan["acceptance"] = None
    with pytest.raises(ValueError, match="protocol|PROTOCOL|FROZEN_SPLIT|event_id"):
        if entrypoint == "document": parameters.validate_document(document, allow_mathematical_test=True)
        elif entrypoint == "saved_evaluation":
            parameters.validate_saved_evaluation(document, PlumeParams(**document["parameters"]))
        else:
            path = tmp_path / "malformed-mathematical-fixture.json"
            path.write_text(json.dumps(document), encoding="utf-8")
            parameters.load_parameters(path=path)


@pytest.mark.parametrize("candidate_rmse,candidate_mae,event_rmse,event_mae,accepted", [
    (9, 5.5, 10, 5.5, True), (9.01, 5, 10, 5, False),
    (10, 5, 10, 5, False), (8, 5.51, 10, 5, False),
    (8, 5, 10.01, 5, False), (8, 5, 10, 5.51, False),
])
def test_acceptance_separates_relative_improvement_rmse_nonregression_and_mae_tolerance(
        candidate_rmse, candidate_mae, event_rmse, event_mae, accepted):
    plan = mathematical_protocol()
    plan["acceptance"] = {"min_relative_rmse_improvement": 0.1, "max_mae_regression_ugm3": 0.5}
    baseline = {"rmse": 10, "mae": 5}
    candidate = {"rmse": candidate_rmse, "mae": candidate_mae}
    assert protocol.acceptance_check(baseline, candidate, {"math-event": baseline},
                                     {"math-event": {"rmse": event_rmse, "mae": event_mae}}, plan) is accepted


@pytest.mark.parametrize("entrypoint", ["export_document", "writer"])
@pytest.mark.parametrize("missing", [True, False])
def test_export_entrypoints_reject_missing_or_null_protocol_before_writing(tmp_path, entrypoint, missing):
    result = mathematical_artifact_result()  # explicitly mathematical serialization fixture
    if not missing: result.report["protocol"] = None
    path = tmp_path / "must-not-create-candidate.json"
    with pytest.raises(ValueError, match="MISSING_FROZEN_PROTOCOL"):
        if entrypoint == "export_document": engine.parameter_document(result)
        else: engine.write_parameters(result, path)
    assert not path.exists()
