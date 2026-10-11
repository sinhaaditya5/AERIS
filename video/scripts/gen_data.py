#!/usr/bin/env python3
"""transcript.json (faster-whisper, word timestamps) -> src/data/subtitles.json; ranked_sites.json -> src/data/top_sites.json."""
import json, re
from pathlib import Path
R = Path(__file__).resolve().parents[1]
tr = json.load(open(R / "src/data/transcript.json"))
fix = lambda s: re.sub(r"\bEris\b", "AERIS", s)
subs = []
for i, s in enumerate(tr):
    nxt = tr[i + 1]["start"] if i + 1 < len(tr) else s["end"] + 1
    subs.append({"start": round(max(0, s["start"] - 0.05), 2), "end": round(min(s["end"] + 0.25, nxt - 0.02 if nxt - s["end"] < 0.3 else s["end"] + 0.25), 2), "text": fix(s["text"])})
json.dump(subs, open(R / "src/data/subtitles.json", "w"), indent=1)
d = json.load(open(R / "../data/live/ranked_sites.json"))
top = [{k: s[k] for k in ("rank", "name", "type", "eta_hours")} for s in sorted(d["sites"], key=lambda s: s["rank"])[:5]]
json.dump(top, open(R / "src/data/top_sites.json", "w"), indent=1)
json.dump([[round(s["start"], 2), round(s["end"], 2)] for s in tr], open(R / "src/data/speech.json", "w"))
print(len(subs), "subtitles;", top[0])
