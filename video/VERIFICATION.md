# Final verification checklist

Method (unchanged for the 3:43 re-edit; only timing, captions and the PRIORITIZE/intro scenes are new): numbers come from `scripts/verify_metrics.py` (reads `data/live/*` and checks `web/public/data/*` is byte-identical; output `src/data/metrics.json`, integrity problems: **none**). On-screen footage is the real dashboard, unedited apart from framing (crop/zoom) and speed (0.65–1.0×).

## Metrics

| Shown in video | Value | Verified against |
|---|---|---|
| Ranked sites | **444** (230 schools, 214 hospitals) | `ranked_sites.json` (444 rows), README "One real run", dashboard KPI |
| People exposed (estimate) | **7,132,123** | `ranked_sites.json → exposed_population.estimate`; dashboard "7,132,123 Individuals" |
| Threshold Sensitivity Range | **7,132,123 – 14,488,106** (shown as 7.1M – 14.5M) | same block; method text states "threshold sensitivity range, not a statistical confidence interval" |
| Detections / candidate sources | **215** clustered detections → **10** sources (227 raw rows in `fires.json`; 12 are not in any cluster) | `sources.json` sums to 215; dashboard "215 Detections" |
| Largest candidate | `src_004`, **104 fires, 675.5 MW**, confidence 0.75, stubble burning | `sources.json`; inspector in app |
| Total FRP | **1,278 MW** (1,278.2) | sum of `sources.json` |
| AQI stations | **59** of 60 with a value; archived obs 30 Sep–7 Oct 2026; mean **179** | `aqi.json` (OpenAQ) |
| Wind sample | **SW 214°, 10.2 km/h** at 28°N 73.5°E, 2026-10-06T18:30Z | `wind.json` first point (2.84 m/s) |
| Wind grid | 323 points × 48 h | `wind.json` |
| Punjab corridors → ranked sites | **0** (all 444 inside `src_001`'s corridor; `src_001` = 2 detections, 9.1 MW, industrial-fire heuristic) | independent point-in-polygon test in `verify_metrics.py` (not just the pipeline's `source_id`) |
| Actions | **8** facility + **3** authority; generator **rules**; #1 Akash Hospital, Ballabgarh, 0.5 h | `actions.json` |

## Claims and their support

- **Real fire hotspots, three satellites**: `fires.json` source `VIIRS_NOAA21_NRT+VIIRS_NOAA20_NRT+VIIRS_SNPP_NRT`.
- **Corridor is a model, not an observation**: stated in VO and callout; README "Known limitations" (not WRF-Chem, uncalibrated).
- **No precise atmospheric simulation claimed**: described as "simplified physics baseline".
- **Population range label**: "Threshold sensitivity range", never "confidence interval".
- **Observed vs modelled**: callouts are tagged *Observed* (FIRMS, OpenAQ, Open-Meteo) or *Model estimate*.
- **Actions are advisory**: "AERIS sends no alerts and executes nothing", matching the in-app banner "no alerts are sent / does not … confirm real-world completion". No delivery, municipal action or pollution reduction is claimed.
- **Stale data disclosed**: the app's own banner (3.6 days stale) is visible in the footage; a persistent "Real pipeline snapshots · 7–9 Oct 2026 · not a live feed" line is on every app scene. Nothing is described as live.
- **AWS services shown** (all in `infra/template.yaml` or the agent code): EventBridge Scheduler (`ScheduleV2`), Lambda (10 functions), Secrets Manager, SQS dead-letter queue, S3, Step Functions, Amazon Bedrock via the Strands agent (with rules fallback; fallback produced this capture's plan), API Gateway, CloudFront, CloudWatch + SNS (alarm emails).
- **Deliberately not shown as implemented**: **DynamoDB** (not in the stack), **SageMaker** (only an optional, undeployed surrogate under `infra/sagemaker/`), Sentinel-5P, SMS/WhatsApp alerts, intervention simulation.
- **Intervention simulation omitted**: the dashboard's "What If We Act?" uses assumed 35%/55% multipliers ("not measured effectiveness"), not a working simulation, so it is not demonstrated. The VO/callout mention it only to say the bars are assumed.
- **Opening**: a stylised motion graphic (labelled on screen), not documentary footage, and no AI-generated imagery presented as real. Licensed street/skyline footage can replace the skyline layer in `src/scenes/Problem.tsx`.
- **Secrets/PII**: none on screen. The app is a local read-only session; no keys or `.env` content is rendered; URL bar not recorded.

## Known caveats (for the presenter)

1. **Name mismatch in the repo.** You asked for "AI Environmental Risk & Intervention System" (used in `start.sh`, `docs/demo-script.md` and in this video). The README and the browser tab title say "Air Exposure & Risk Intelligence System", and the app sidebar says "Environmental Risk AI". Pick one; the video's name/tagline live in `src/theme.ts → NAME`.
2. **Stage name.** The app and README call stage 2 *Plume*; the video uses your *MOVE* label.
3. **The headline scenario is not "Punjab smoke reaches Delhi".** In this snapshot the biggest fire source is Punjab, but every ranked site sits in the corridor of a small Faridabad-area cluster, and the model's corridor-wide ΔPM2.5 is a constant +15 µg/m³ floor (audit B1), so site risk scores are all "Low". The video says what the data shows and calls the figures uncalibrated.
4. `docs/demo-script.md` is out of date (571K/257K, 55%, 104-fire/676 MW-as-Delhi story). Do not reuse it.
5. The modal's summary paragraph ("approaches NCR in ~0.5 hours … 215 fires") is flagged as misreported in `docs/audit/data-authenticity.md` (F6); the video crops it out.
6. The voiceover is a synthetic TTS voice; swap in a human recording if desired.

## Re-edit against the supplied voiceover (11 Oct 2026)

- **Audio**: `voiceover.wav` is placed at frame 0 at volume 1, not trimmed, re-timed or re-generated; video length = 223.48 s voiceover + 3.5 s tail. Music (in-house synthesis, `scripts/synth_audio.py`, no third-party audio) is ducked to ~11% under speech using the real speech segments and fades out by the end.
- **Subtitles**: 74 phrase-level cues from the Whisper transcript; only change is "Eris" → "AERIS" (the voice's pronunciation of the product name).
- **New figures on screen**: none. 444, 7.1M–14.5M (7,132,123), 215, 59, 675.5 MW, 1,278 MW, SW 214° · 10.2 km/h, 8 + 3 actions, 0 alerts all come from `metrics.json` (see table above). The top-5 ranking panel is read from `ranked_sites.json` (names, types, ETA).
- **Narration says "other relevant facilities"**; the data holds only schools and hospitals, so only those are shown.
- **Narration says "ranks 444 sites… in this scenario"**; the video adds that all 444 fall in the corridor of src_001 (not the Punjab source) only through the existing "Punjab corridors · 0 ranked sites" callout.
- **Chain labels** (PRIORITIZE scene): SOURCE = observed fires, POTENTIAL RISK = model estimate, EXPOSED POPULATION = estimate, PRIORITIZED SITES = heuristic ranking.
- **Architecture**: stage names follow the narration; chips are only services present in `infra/template.yaml` / agent code. DynamoDB, SageMaker, Sentinel-5P and alert delivery are not shown.
- **No checkmarks** are drawn anywhere: the app's checklist shows 0 items marked.
- **Opening/intro**: stylised graphic (labelled), no AI-generated footage.
