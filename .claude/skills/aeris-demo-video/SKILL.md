---
name: aeris-demo-video
description: Re-cut or re-render the AERIS product demo video (video/ Remotion project) against a new voiceover. Use when the narration audio, scene timing, subtitles or on-screen metrics of the demo change.
---

# AERIS demo video (project-only)

Project: `video/` (Remotion, 1920×1080 @30 fps). Never fabricate data: every number on screen must come from `video/src/data/metrics.json` (built by `scripts/verify_metrics.py` from `data/live/`) or `top_sites.json`; update `video/VERIFICATION.md` when a claim changes.

1. Put the voiceover at `video/public/audio/voiceover.wav` (do not edit, trim or regenerate it).
2. Transcribe: create a venv outside the repo, `pip install faster-whisper`, decode with ffmpeg to 16 kHz f32 and pass the numpy array (the `av` decoder is broken on Python 3.14); `scripts/transcribe_vo.py` shows the call. Save to `src/data/transcript.json`.
3. `python3 scripts/gen_data.py` → subtitles, speech windows, top sites.
4. Re-time `SCENES` in `src/theme.ts` to the pauses in the transcript, then adjust per-scene local times in `src/scenes/*.tsx` (callouts, zooms, `segs` = which real clip/portion is shown). Clips live in `public/clips/` (see CAPTURE_CHECKLIST.md); if a needed screen is missing, re-record with `node capture/scenes.mjs`, do not mock it.
5. Music: `../.venv/bin/python scripts/synth_audio.py` then `scripts/duck_music.py` (set the length/fade constants to the new duration).
6. Check stills (`npx remotion still src/index.ts AerisDemo out.png --frame=N`) at every scene change, then `npm run render`.
7. QC: duration = voiceover + tail, 1920×1080/30 fps, subtitles never over key UI, final spoken line complete before the fade.

Labelling rules: model output = "Model estimate", observed feeds = "Observed", the 7.1M–14.5M range = "threshold sensitivity range, not a confidence interval", actions are advisory, no alerts/evacuations implied.
