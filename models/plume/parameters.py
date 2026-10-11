"""Local, fail-closed parameter artifacts; no network or implicit calibration."""

from __future__ import annotations

import json
import hashlib
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from models.plume.advect import PlumeParams, number, parse_time

MODEL_VERSION = "lagrangian-puff-v1"
PARAMETER_FILE = Path(__file__).with_name("params.json")
UNITS = {"sigma0_m": "m", "k_m_sqrt_hour": "m/sqrt(hour)",
         "tau_hours": "hour", "concentration_scale_ug": "ug/nominal-puff-strength"}
REAL_EVIDENCE = "REAL_CAPTURED_HISTORY"


def deterministic_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + "\n"


def atomic_json(path: Path, value: Any) -> None:
    """Serialize completely before touching an existing result."""
    body = deterministic_json(value)
    path = Path(path)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n",
                                         dir=path.parent, delete=False,
                                         prefix=path.name + ".", suffix=".tmp") as handle:
            temporary = Path(handle.name)
            handle.write(body)
            handle.flush()
            os.fsync(handle.fileno())
        temporary.replace(path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def validate_document(document: Any, *, allow_mathematical_test: bool = False) -> PlumeParams:
    if not isinstance(document, dict):
        raise ValueError("Parameter artifact must be an object")
    if document.get("schema_version") not in (1, 2) or document.get("model_version") != MODEL_VERSION:
        raise ValueError("Unsupported parameter schema/model version")
    if document["schema_version"] == 2:
        from models.plume.protocol import validate_protocol_structure
        validate_protocol_structure(document.get("protocol"))
    if document.get("status") not in ("CALIBRATED", "PARTIALLY_CALIBRATED"):
        raise ValueError("Parameter artifact does not describe successful calibration")
    evidence = document.get("evidence_kind")
    if evidence != REAL_EVIDENCE and not (allow_mathematical_test and evidence == "MATHEMATICAL_TEST"):
        raise ValueError("Parameters require real captured history; mathematical artifacts are not deployable")
    if evidence == REAL_EVIDENCE and document["schema_version"] != 2:
        raise ValueError("Legacy candidate lacks frozen validation/test protocol; new reviewed experiment required")
    if document.get("units") != UNITS:
        raise ValueError("Parameter units do not match this model")
    parse_time(document.get("calibration_timestamp"), "calibration_timestamp")
    dataset = document.get("dataset")
    if not isinstance(dataset, dict) or not dataset.get("provenance"):
        raise ValueError("Missing calibration dataset provenance")
    for field in ("events", "stations", "observations"):
        count = dataset.get(field)
        if not isinstance(count, int) or isinstance(count, bool) or count <= 0:
            raise ValueError(f"Missing positive dataset count: {field}")
    start = parse_time(dataset.get("time_from"), "dataset.time_from")
    end = parse_time(dataset.get("time_to"), "dataset.time_to")
    if start > end:
        raise ValueError("Invalid calibration time range")
    if parse_time(document["calibration_timestamp"], "calibration_timestamp") < end:
        raise ValueError("Calibration timestamp predates calibration targets")
    if document.get("objective") != "training_rmse_ugm3":
        raise ValueError("Unknown calibration objective")
    statuses = document.get("parameter_status", {})
    if set(statuses) != set(UNITS) or not any(v == "CALIBRATED" for v in statuses.values()):
        raise ValueError("No identified calibrated parameter")
    if any(v not in ("CALIBRATED", "ASSUMED") for v in statuses.values()):
        raise ValueError("Invalid parameter status")
    expected_status = "CALIBRATED" if all(v == "CALIBRATED" for v in statuses.values()) else "PARTIALLY_CALIBRATED"
    if document["status"] != expected_status:
        raise ValueError("Calibration status disagrees with individual parameter statuses")
    if not isinstance(document.get("identifiability"), dict) or set(document["identifiability"]) != set(UNITS):
        raise ValueError("Missing identifiability diagnostics")
    try:
        if set(document["parameters"]) != set(PlumeParams.__dataclass_fields__):
            raise ValueError("Artifact must record every physical and numerical parameter")
        parameters = PlumeParams(**document["parameters"])
    except (KeyError, TypeError) as exc:
        raise ValueError("Invalid parameter values") from exc
    baseline = PlumeParams()
    for name, status in statuses.items():
        if status == "ASSUMED" and getattr(parameters, name) != getattr(baseline, name):
            raise ValueError(f"Assumed parameter {name} must retain baseline")
        diagnostic = document["identifiability"][name]
        if not isinstance(diagnostic, dict):
            raise ValueError("Invalid identifiability record")
        if status == "CALIBRATED" and (diagnostic.get("weakly_identified") is not False or diagnostic.get("at_boundary") is not False):
            raise ValueError("Unsupported parameter cannot be labelled calibrated")
    for name in set(PlumeParams.__dataclass_fields__) - set(UNITS):
        if getattr(parameters, name) != getattr(baseline, name):
            raise ValueError("This model version calibrates only the four declared physical parameters")
    metrics = document.get("metrics", {})
    for partition in ("baseline", "calibrated", "baseline_holdout", "calibrated_holdout"):
        values = metrics.get(partition)
        if not isinstance(values, dict):
            raise ValueError("Protected holdout metrics are required for automatic adoption")
        for name in ("rmse", "mae", "bias"):
            value = number(values.get(name), f"{partition}.{name}")
            if name != "bias" and value < 0:
                raise ValueError("Error metrics cannot be negative")
    if metrics["calibrated"]["rmse"] >= metrics["baseline"]["rmse"]:
        raise ValueError("Calibration did not improve training RMSE")
    if metrics["calibrated_holdout"]["rmse"] >= metrics["baseline_holdout"]["rmse"]:
        raise ValueError("Calibration did not improve protected holdout RMSE")
    checks = document.get("leakage_checks", {})
    if any(checks.get(n) != "PASS" for n in ("source_availability", "background_independence", "event_split_disjoint")) or checks.get("holdout_used_for_selection") is not False:
        raise ValueError("Missing successful leakage protection")
    split = document.get("split", {})
    if not isinstance(split, dict):
        raise ValueError("Saved partition metadata must be an object")
    train, held = split.get("training_events"), split.get("holdout_events")
    if (not isinstance(train, list) or not isinstance(held, list)
            or any(not isinstance(i, str) or not i.strip() for i in train + held)
            or len(train) < 2 or not held or set(train) & set(held)):
        raise ValueError("Missing disjoint protected event split")
    validation = split.get("validation_events", [])
    if document["schema_version"] == 2:
        if (not isinstance(validation, list) or not validation
                or any(not isinstance(i, str) or not i.strip() for i in validation)
                or set(validation) & (set(train) | set(held))):
            raise ValueError("Missing disjoint validation event split")
    if len(set(train)) != len(train) or len(set(held)) != len(held) or len(set(validation)) != len(validation) or dataset["events"] != len(train) + len(held) + len(validation):
        raise ValueError("Dataset event count disagrees with protected split")
    counts = []
    partitions = [("baseline", "calibrated", 4), ("baseline_holdout", "calibrated_holdout", 2)]
    if document["schema_version"] == 2:
        partitions.append(("baseline_validation", "calibrated_validation", 2))
    for a, b, minimum in partitions:
        count = metrics[a].get("observations")
        if not isinstance(count, int) or isinstance(count, bool) or count < minimum or metrics[b].get("observations") != count:
            raise ValueError("Metrics require identical eligible targets and sufficient observations")
        counts.append(count)
    if dataset["stations"] < 2 or dataset["observations"] != sum(counts):
        raise ValueError("Dataset counts disagree with evaluation records")
    if document["schema_version"] == 2:
        validate_saved_evaluation(document, parameters)
    deterministic_json(document)
    return parameters


def validate_saved_evaluation(document: dict[str, Any], parameters: PlumeParams) -> None:
    """Recompute serialized metrics; reject altered targets, splits, settings or code."""
    from models.plume.calibrate import Axis, CalibrationConfig, error_metrics
    from models.plume.history import EligibilityConfig, content_hash, identity
    from models.plume.protocol import (
        acceptance_check, code_identity, validate_manifest_windows, validate_protocol,
        validate_protocol_structure, validate_split_ids, validate_station_policy,
    )

    if not isinstance(document, dict):
        raise ValueError("Parameter artifact must be an object")
    protocol = validate_protocol_structure(document.get("protocol"))
    definition = protocol["search_definition"]
    try:
        config = CalibrationConfig(
            axes={k: Axis(v["lower"], v["upper"], tuple(v["values"])) for k, v in definition["axes"].items()},
            eligibility=EligibilityConfig(**definition["eligibility"]),
            **{k: definition[k] for k in ("max_candidates", "sensitivity_relative_tolerance", "sensitivity_absolute_ugm3")})
    except (KeyError, TypeError, AttributeError) as exc:
        raise ValueError("Missing frozen search definition") from exc
    validate_protocol(protocol, config, parse_time(document["calibration_timestamp"], "calibration_timestamp"))
    if document.get("protocol_sha256") != content_hash(protocol) or document.get("code_sha256") != code_identity():
        raise ValueError("Candidate protocol/code digest mismatch")
    if document.get("candidate_frozen_before_test") is not True or document.get("candidate_parameters_sha256") != content_hash(document["parameters"]):
        raise ValueError("Candidate parameters changed after freezing")
    if document.get("reviewer_status") != "PENDING_EXPERT_REVIEW" or document.get("runtime_approved") is not False:
        raise ValueError("Fitting cannot confer runtime approval")
    digest = document["dataset"].get("content_sha256")
    if not isinstance(digest, str) or len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest):
        raise ValueError("Missing dataset content digest")
    inputs = document.get("history_inputs")
    if not isinstance(inputs, dict) or "protocol" in inputs:
        raise ValueError("FROZEN_MANIFEST_REQUIRED: original inputs excluding protocol are required")
    if (content_hash(inputs) != protocol.get("history_inputs_sha256")
            or content_hash({**inputs, "protocol": protocol}) != digest):
        raise ValueError("Frozen historical input digest mismatch")
    events, observations = inputs.get("events"), inputs.get("observations")
    if (not isinstance(events, list) or len(events) > config.eligibility.max_events
            or not isinstance(observations, list) or len(observations) > config.eligibility.max_observations):
        raise ValueError("Invalid or oversized frozen manifest")
    validate_manifest_windows(events, protocol)
    observed_stations = {}
    for row in observations:
        if not isinstance(row, dict):
            raise ValueError("Frozen observation must be an object")
        observation_id = identity(row.get("id"), "observation.id")
        if observation_id in observed_stations:
            raise ValueError("Duplicate frozen observation ID")
        observed_stations[observation_id] = identity(row.get("station_id"), "station_id")
    for name, axis in config.axes.items():
        if getattr(parameters, name) not in axis.values:
            raise ValueError("Candidate parameter is outside frozen grid")
    expected_split = {"training_events": protocol["split"]["training"],
                      "validation_events": protocol["split"]["validation"],
                      "holdout_events": protocol["split"]["test"]}
    split = document.get("split")
    if not isinstance(split, dict) or set(split) != set(expected_split):
        raise ValueError("Saved partition metadata must contain exactly the three event partitions")
    validate_split_ids({part: split[key] for part, key in
                        (("training", "training_events"), ("validation", "validation_events"), ("test", "holdout_events"))})
    if any(set(split[k]) != set(v) for k, v in expected_split.items()):
        raise ValueError("Candidate split differs from protocol")
    all_ids: set[str] = set()
    all_stations: set[str] = set()
    partition_stations = {}
    for part, baseline, candidate, split_key in (("training", "baseline", "calibrated", "training_events"),
                                               ("validation", "baseline_validation", "calibrated_validation", "validation_events"),
                                               ("test", "baseline_holdout", "calibrated_holdout", "holdout_events")):
        paired = []
        for label in (baseline, candidate):
            rows = document.get("evaluation", {}).get(label)
            if not isinstance(rows, list) or not rows:
                raise ValueError("Missing per-target evaluation records")
            try:
                ids = [r["observation_id"] for r in rows]
                if any(not isinstance(i, str) or not i.strip() for i in ids) or len(set(ids)) != len(ids):
                    raise ValueError("Duplicate/invalid evaluation observation IDs")
                if any(observed_stations.get(r["observation_id"]) != identity(r["station_id"], "evaluation.station_id")
                       for r in rows):
                    raise ValueError("Evaluation station/observation differs from frozen inputs")
                if {r["event_id"] for r in rows} != set(document["split"][split_key]):
                    raise ValueError("Evaluation events disagree with split")
                if len({r["station_id"] for r in rows}) < config.eligibility.min_stations:
                    raise ValueError("Insufficient evaluation stations")
                if any(number(r["predicted_delta_ugm3"], "prediction") < 0 for r in rows):
                    raise ValueError("Model increments cannot be negative")
                recomputed = error_metrics([r["predicted_delta_ugm3"] for r in rows],
                                           [r["observed_delta_ugm3"] for r in rows])
                if recomputed != document["metrics"][label]:
                    raise ValueError("Saved metrics do not reproduce from saved predictions")
                paired.append([(r["observation_id"], r["event_id"], r["station_id"], r["observed_delta_ugm3"]) for r in rows])
                for field, key in (("event_id", "events"), ("station_id", "stations")):
                    grouped = {}
                    for row in rows:
                        grouped.setdefault(row[field], []).append(row)
                    metrics = {i: error_metrics([r["predicted_delta_ugm3"] for r in rs],
                                               [r["observed_delta_ugm3"] for r in rs]) for i, rs in grouped.items()}
                    if metrics != document["group_metrics"][label][key]:
                        raise ValueError("Saved subgroup metrics do not reproduce")
            except (KeyError, TypeError, AttributeError) as exc:
                raise ValueError("Malformed saved evaluation") from exc
        if paired[0] != paired[1] or all_ids.intersection(ids):
            raise ValueError("Evaluation target mismatch or observation leakage")
        all_ids.update(ids)
        all_stations.update(r["station_id"] for r in rows)
        partition_stations[part] = {r["station_id"] for r in rows}
        if baseline != "baseline" and not acceptance_check(document["metrics"][baseline], document["metrics"][candidate],
                                                           document["group_metrics"][baseline]["events"],
                                                           document["group_metrics"][candidate]["events"], protocol):
            raise ValueError("Candidate fails frozen acceptance criteria")
    if len(all_stations) != document["dataset"]["stations"]:
        raise ValueError("Dataset station count disagrees with evaluation")
    validate_station_policy(partition_stations, protocol["station_policy"])


def candidate_digest(document: dict[str, Any]) -> str:
    payload = {k: v for k, v in document.items() if k != "runtime_approval"}
    return hashlib.sha256(deterministic_json(payload).encode("utf-8")).hexdigest()


def validate_runtime_approval(document: dict[str, Any]) -> None:
    """Trusted operator review record, never inferred from optimization or a client flag."""
    approval = document.get("runtime_approval")
    if not isinstance(approval, dict) or approval.get("status") != "APPROVED_FOR_DEVELOPMENT_EVALUATION":
        raise ValueError("Candidate is not runtime approved; separate expert/operator review required")
    if not isinstance(approval.get("reviewer"), str) or not approval["reviewer"].strip():
        raise ValueError("Runtime approval requires a named reviewer")
    reviewed = parse_time(approval.get("reviewed_at"), "runtime_approval.reviewed_at")
    if reviewed < parse_time(document.get("calibration_timestamp"), "calibration_timestamp"):
        raise ValueError("Runtime approval predates candidate calibration")
    if approval.get("candidate_sha256") != candidate_digest(document):
        raise ValueError("Runtime approval does not bind this candidate")


@dataclass(frozen=True)
class LoadedParameters:
    params: PlumeParams
    provenance: str
    metadata: dict[str, Any] | None = None


def load_parameters(explicit: PlumeParams | dict[str, Any] | None = None,
                    *, path: Path | None = None) -> LoadedParameters:
    """Explicit values bypass the file; partial explicit dicts use baseline defaults."""
    if explicit is not None:
        if isinstance(explicit, PlumeParams):
            return LoadedParameters(explicit, "EXPLICIT")
        if not isinstance(explicit, dict):
            raise ValueError("Explicit parameters must be PlumeParams or a dict")
        try:
            return LoadedParameters(PlumeParams(**explicit), "EXPLICIT")
        except TypeError as exc:
            raise ValueError(f"Invalid explicit parameters: {exc}") from exc
    location = PARAMETER_FILE if path is None else Path(path)
    if not location.exists():
        return LoadedParameters(PlumeParams(), "BASELINE")
    document = json.loads(location.read_text(encoding="utf-8"))
    params = validate_document(document)
    validate_runtime_approval(document)
    return LoadedParameters(params, "CALIBRATED", document)
