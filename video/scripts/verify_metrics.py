#!/usr/bin/env python3
"""Derive every number shown in the AERIS demo video from the real snapshots.

Reads the same files the dashboard reads (data/live/ and web/public/data/),
cross-checks that the two copies agree, and writes src/data/metrics.json.
The Remotion project imports that file; no figure is typed by hand.
"""
import json, sys, hashlib
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIVE, WEB = ROOT / "data/live", ROOT / "web/public/data"
OUT = Path(__file__).resolve().parents[1] / "src/data/metrics.json"

def load(name, base=LIVE):
    return json.loads((base / name).read_text())

problems = []
for f in ["sources.json", "ranked_sites.json", "actions.json", "aqi.json", "corridor.geojson", "wind.json"]:
    a, b = LIVE / f, WEB / f
    if not b.exists() or hashlib.md5(a.read_bytes()).hexdigest() != hashlib.md5(b.read_bytes()).hexdigest():
        problems.append(f"{f}: data/live and web/public/data differ or missing")

src, rank, act = load("sources.json"), load("ranked_sites.json"), load("actions.json")
aqi, cor, wind, fires = load("aqi.json"), load("corridor.geojson"), load("wind.json"), load("fires.json")

S = src["sources"]
total_frp = sum(s["total_frp_mw"] for s in S)
top = max(S, key=lambda s: s["total_frp_mw"])
sites = rank["sites"]
ex = rank["exposed_population"]
vals = [s["aqi"] for s in aqi["stations"] if s.get("aqi") is not None]
obs = sorted(s["observed_at"] for s in aqi["stations"] if s.get("observed_at"))
site_sources = Counter(s["source_id"] for s in sites)
site_src = next(s for s in S if s["id"] == site_sources.most_common(1)[0][0])
by_type = Counter(s["type"] for s in sites)
bands = Counter(s["eta_hours"] for s in sites)
cor_polys = [f for f in cor["features"] if f["geometry"]["type"] == "Polygon"]

def _inside(pt, ring):
    x, y = pt; ins = False; j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: ins = not ins
        j = i
    return ins
# which ranked sites fall inside which source's corridor polygons (independent of the pipeline's own attribution)
inside_by_src = {}
for f in cor_polys:
    ring = f["geometry"]["coordinates"][0]; sid = f["properties"]["source_id"]
    inside_by_src.setdefault(sid, set()).update(s["site_id"] for s in sites if _inside((s["lon"], s["lat"]), ring))

m = {
    "snapshot": {
        "fires_generated_at": fires["generated_at"], "fires_source": fires["source"],
        "sources_generated_at": src["generated_at"],
        "aqi_generated_at": aqi["generated_at"], "aqi_observed_first": obs[0], "aqi_observed_last": obs[-1],
        "wind_generated_at": wind["generated_at"], "wind_source": wind["source"],
        "corridor_generated_at": cor["generated_at"], "corridor_forecast_start": cor["forecast_start"],
        "ranked_generated_at": rank["generated_at"], "actions_generated_at": act["generated_at"],
    },
    "source": {
        "viirs_detections_raw_file": len(fires["fires"]),
        "clustered_detections": sum(s["fire_count"] for s in S),
        "clusters": len(S), "total_frp_mw": round(total_frp, 1),
        "top_id": top["id"], "top_type": top["type"], "top_frp_mw": top["total_frp_mw"], "top_fires": top["fire_count"],
        "top_lat": top["lat"], "top_lon": top["lon"], "top_frp_share_pct": round(100 * top["total_frp_mw"] / total_frp),
        "satellites": sorted({f["satellite"] for f in fires["fires"]}),
        "aqi_stations": len(aqi["stations"]), "aqi_stations_with_value": len(vals),
        "aqi_mean": round(sum(vals) / len(vals)), "aqi_provider": sorted({s["source"] for s in aqi["stations"]}),
    },
    "move": {
        "corridor_polygons": len(cor_polys), "bands_hours": ["0-2", "2-4", "4-8", "8-24"],
        "wind_sample_points": len(wind["points"]),
        "wind_first_sample": {"lat": wind["points"][0]["lat"], "lon": wind["points"][0]["lon"], "t": wind["points"][0]["hours"][0]["t"], "speed_kmh": round(wind["points"][0]["hours"][0]["speed_ms"] * 3.6, 1), "dir_from_deg": wind["points"][0]["hours"][0]["dir_from_deg"]},
    },
    "expose": {
        "sites_ranked": len(sites), "schools": by_type["school"], "hospitals": by_type["hospital"],
        "exposed_estimate": ex["estimate"], "exposed_low": ex["low"], "exposed_high": ex["high"],
        "exposure_method": ex["method"],
        "sites_attributed_to": dict(site_sources),
        "ranked_source": {"id": site_src["id"], "type": site_src["type"], "frp_mw": site_src["total_frp_mw"], "fires": site_src["fire_count"]},
        "top_site": sites[0]["name"], "top_site_id": sites[0]["site_id"], "top_site_type": sites[0]["type"],
        "sites_inside_corridor_by_source": {k: len(v) for k, v in sorted(inside_by_src.items())},
        "sites_inside_punjab_corridors": len(set().union(*[v for k, v in inside_by_src.items() if k != site_src["id"]] or [set()])),
        "sites_by_eta_hours": {str(k): v for k, v in sorted(bands.items())},
    },
    "act": {
        "facility_actions": len(act["actions"]), "authority_actions": len(act["authority_actions"]),
        "generator": act["generator"], "first_action": act["actions"][0], "authority": [a["who"] for a in act["authority_actions"]],
    },
    "integrity": {"problems": problems},
}
OUT.write_text(json.dumps(m, indent=2))
print(json.dumps(m, indent=2))
if problems:
    print("\nWARNING:", *problems, sep="\n  ", file=sys.stderr)
