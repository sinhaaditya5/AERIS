"""Frozen local experiment plans and leakage checks; no observations are invented."""

from __future__ import annotations

import hashlib
from dataclasses import asdict
from datetime import timedelta
from pathlib import Path
from typing import Any

from models.plume.advect import number, parse_time
from models.plume.history import Match, EligibilityConfig, content_hash, identity
from models.plume.parameters import MODEL_VERSION

PARTITIONS = ("training", "validation", "test")


def code_identity() -> dict[str, str]:
    """Bind scientific and experiment code, without using a mutable Git label."""
    directory = Path(__file__).parent
    paths = [directory / name for name in
             ("advect.py", "corridor.py", "history.py", "calibrate.py", "parameters.py", "protocol.py")]
    paths.append(directory.parent / "source_detection/cluster.py")
    return {p.relative_to(directory.parent).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in paths}


def search_definition(config: Any) -> dict[str, Any]:
    return {"axes": {k: asdict(v) for k, v in config.axes.items()},
            "max_candidates": config.max_candidates,
            "sensitivity_relative_tolerance": config.sensitivity_relative_tolerance,
            "sensitivity_absolute_ugm3": config.sensitivity_absolute_ugm3,
            "eligibility": asdict(config.eligibility)}


def validate_protocol_structure(value: Any) -> dict[str, Any]:
    """Reject malformed public protocol inputs before accessing nested structures."""
    if (not isinstance(value, dict) or type(value.get("schema_version")) is not int
            or value["schema_version"] != 1):
        raise ValueError("MISSING_FROZEN_PROTOCOL: a reviewed plan must precede fitting")
    definition = value.get("search_definition")
    if not isinstance(definition, dict):
        raise ValueError("protocol.search_definition must be an object")
    axes = definition.get("axes")
    if (not isinstance(axes, dict) or not axes
            or any(not isinstance(axis, dict) or not isinstance(axis.get("values"), (list, tuple))
                   for axis in axes.values())):
        raise ValueError("protocol.search_definition.axes must contain parameter-grid objects")
    if not isinstance(definition.get("eligibility"), dict):
        raise ValueError("protocol.search_definition.eligibility must be an object")
    if not isinstance(value.get("acceptance"), dict):
        raise ValueError("protocol.acceptance must be an object")
    validate_split_ids(value.get("split"))
    return value


def validate_protocol(value: Any, config: Any, calibration_time: Any) -> dict[str, Any]:
    value = validate_protocol_structure(value)
    identity(value.get("id"), "protocol.id")
    if value.get("model_version") != MODEL_VERSION or value.get("target") != "station_pm25_increment_ugm3":
        raise ValueError("Protocol target/model does not match receptor enhancement calibration")
    if parse_time(value.get("frozen_at"), "protocol.frozen_at") > calibration_time:
        raise ValueError("Protocol was frozen after the calibration reference")
    if value.get("code_sha256") != code_identity():
        raise ValueError("Protocol code binding does not match this experiment")
    if (value.get("search_sha256") != content_hash(search_definition(config))
            or content_hash(value.get("search_definition")) != value["search_sha256"]):
        raise ValueError("Protocol search/eligibility settings changed after freezing")
    for name in ("scientific_question", "inclusion_rules", "exclusion_rules", "quality_review",
                 "attribution_review", "uncertainty_plan", "limitations", "reviewer"):
        identity(value.get(name), f"protocol.{name}")
    rationale = value.get("parameter_rationale")
    if not isinstance(rationale, dict) or set(rationale) != set(config.axes):
        raise ValueError("Reviewed rationale is required for every fixed/varied parameter")
    for name in config.axes:
        identity(rationale[name], f"protocol.parameter_rationale.{name}")
    if value.get("station_policy") not in ("SAME_STATIONS_NEW_EVENTS", "DISJOINT_STATIONS"):
        raise ValueError("Protocol must state its station generalization policy")
    if value.get("test_previously_used") is not False:
        raise ValueError("A previously inspected/unknown test set is not protected")
    acceptance = value.get("acceptance")
    if not isinstance(acceptance, dict):
        raise ValueError("Predeclared acceptance criteria are required")
    if not 0 < number(acceptance.get("min_relative_rmse_improvement"), "minimum improvement") < 1:
        raise ValueError("Minimum relative improvement must be in (0,1)")
    if number(acceptance.get("max_mae_regression_ugm3"), "MAE regression tolerance") < 0:
        raise ValueError("MAE regression tolerance must be nonnegative")
    validate_split_ids(value.get("split"))
    # A hash/flag checks consistency, not the truth or independence of asserted evidence.
    return dict(value)


def validate_split_ids(value: Any) -> dict[str, list[str]]:
    if not isinstance(value, dict) or set(value) != set(PARTITIONS):
        raise ValueError("FROZEN_SPLIT_REQUIRED: training, validation and protected test IDs required")
    seen: set[str] = set()
    for part in PARTITIONS:
        ids = value[part]
        if not isinstance(ids, list) or len(ids) < (2 if part == "training" else 1):
            raise ValueError("INSUFFICIENT_EVENTS: need two training, one validation and one test event")
        for event_id in ids:
            identity(event_id, f"{part}.event_id")
        if len(set(ids)) != len(ids) or seen.intersection(ids):
            raise ValueError("SPLIT_EVENT_OVERLAP: event IDs must be unique across partitions")
        seen.update(ids)
    return value


def validate_manifest_windows(events: Any, protocol: dict[str, Any]) -> None:
    """Embargo every frozen capture, including captures without matched targets.

    Partition membership comes only from predeclared physical event IDs. Captures
    never supply additional independent-event or matched-observation counts.
    """
    split = validate_split_ids(protocol.get("split"))
    if not isinstance(events, list) or not events:
        raise ValueError("FROZEN_MANIFEST_REQUIRED: complete event captures are required")
    owner = {event_id: part for part, ids in split.items() for event_id in ids}
    windows: dict[str, list[tuple[Any, Any]]] = {part: [] for part in PARTITIONS}
    captures, seen_events = set(), set()
    for row in events:
        if not isinstance(row, dict):
            raise ValueError("Frozen event capture must be an object")
        capture_id = identity(row.get("capture_id"), "capture_id")
        event_id = identity(row.get("event_id"), "event_id")
        if capture_id in captures:
            raise ValueError("DUPLICATE_CAPTURE_ID")
        if event_id not in owner:
            raise ValueError("SPLIT_EVENT_MISMATCH: undeclared frozen event")
        start = parse_time(row.get("source_event_time"), "event.source_event_time")
        forecast = parse_time(row.get("forecast_start"), "event.forecast_start")
        if start >= forecast:
            raise ValueError("Source episode must precede its forecast window")
        captures.add(capture_id)
        seen_events.add(event_id)
        windows[owner[event_id]].append((start, forecast + timedelta(hours=48)))
    if seen_events != set(owner):
        raise ValueError("SPLIT_EVENT_MISMATCH: every declared event must occur in frozen inputs")
    for i, earlier in enumerate(PARTITIONS):
        for later in PARTITIONS[i + 1:]:
            if max(end for _, end in windows[earlier]) >= min(start for start, _ in windows[later]):
                raise ValueError("OVERLAPPING_FORECAST_WINDOWS: full frozen-manifest embargo required")


def validate_station_policy(stations: dict[str, set[str]], policy: str) -> None:
    if policy not in ("SAME_STATIONS_NEW_EVENTS", "DISJOINT_STATIONS"):
        raise ValueError("Protocol must state its station generalization policy")
    if policy == "DISJOINT_STATIONS":
        for i, earlier in enumerate(PARTITIONS):
            for later in PARTITIONS[i + 1:]:
                if stations[earlier] & stations[later]:
                    raise ValueError("SPLIT_STATION_OVERLAP: declared station holdout violated")


def split_matches(matches: list[Match], protocol: dict[str, Any],
                  config: EligibilityConfig, *, manifest_events: list[dict[str, Any]]) -> dict[str, list[Match]]:
    """Split eligible targets after checking the entire frozen capture manifest."""
    split = validate_split_ids(protocol.get("split"))
    validate_manifest_windows(manifest_events, protocol)
    planned = {i for ids in split.values() for i in ids}
    if {m.event.event_id for m in matches} != planned:
        raise ValueError("SPLIT_EVENT_MISMATCH: every predeclared event must have eligible targets")
    parts = {p: [m for m in matches if m.event.event_id in split[p]] for p in PARTITIONS}
    declared = {row["capture_id"]: row for row in manifest_events}
    used, stations, fires = {}, {}, {}
    for part, rows in parts.items():
        minimum = config.min_training_observations if part == "training" else config.min_holdout_observations
        if len(rows) < minimum or len({m.observation.station_id for m in rows}) < config.min_stations:
            raise ValueError(f"INSUFFICIENT_OBSERVATIONS_OR_STATIONS in {part}")
        used[part] = {i for m in rows for i in (m.observation.id, *m.background.observation_ids)}
        stations[part] = {m.observation.station_id for m in rows}
        fires[part] = {i for m in rows for i in m.event.fire_keys}
        for match in rows:
            row = declared.get(match.event.capture_id)
            if (row is None or row["event_id"] != match.event.event_id
                    or parse_time(row["source_event_time"], "source_event_time") != match.event.source_event_time
                    or parse_time(row["forecast_start"], "forecast_start") != match.event.forecast_start):
                raise ValueError("MATCH_CAPTURE_MISMATCH: matched capture differs from frozen manifest")
    for i, earlier in enumerate(PARTITIONS):
        for later in PARTITIONS[i + 1:]:
            if used[earlier] & used[later]:
                raise ValueError("SPLIT_OBSERVATION_OVERLAP: targets/backgrounds cross partitions")
            if fires[earlier] & fires[later]:
                raise ValueError("SAME_FIRE_DIFFERENT_EVENTS: fire identity crosses partitions")
    validate_station_policy(stations, protocol["station_policy"])
    return parts


def acceptance_check(baseline: dict[str, Any], candidate: dict[str, Any],
                     groups: dict[str, Any], candidate_groups: dict[str, Any],
                     protocol: dict[str, Any]) -> bool:
    """Apply the same frozen rule on validation and test; never reselect parameters."""
    rule = protocol["acceptance"]
    if candidate["rmse"] > baseline["rmse"] * (1 - rule["min_relative_rmse_improvement"]):
        return False
    if candidate["rmse"] >= baseline["rmse"]:
        return False
    tolerance = rule["max_mae_regression_ugm3"]
    if candidate["mae"] > baseline["mae"] + tolerance:
        return False
    return all(candidate_groups[event]["rmse"] <= values["rmse"]
               and candidate_groups[event]["mae"] <= values["mae"] + tolerance
               for event, values in groups.items())


def evaluation_rows(matches: list[Match], predictions: list[float]) -> list[dict[str, Any]]:
    if len(matches) != len(predictions):
        raise ValueError("Evaluation vectors disagree")
    return [{"observation_id": m.observation.id, "event_id": m.event.event_id,
             "station_id": m.observation.station_id,
             "observed_delta_ugm3": m.observed_delta,
             "predicted_delta_ugm3": number(p, "prediction")}
            for m, p in zip(matches, predictions)]
