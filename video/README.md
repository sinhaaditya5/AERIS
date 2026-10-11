# AERIS demo video

3:47 1920×1080 demo built with Remotion over real screen captures of the dashboard, timed to the supplied voiceover (`public/audio/voiceover.wav`).

```bash
cd video && npm install
python3 scripts/verify_metrics.py          # snapshots -> src/data/metrics.json
python3 scripts/gen_data.py                # transcript -> subtitles, ranked_sites -> top_sites, speech windows
../.venv/bin/python scripts/synth_audio.py # music + SFX (needs numpy)
../.venv/bin/python scripts/duck_music.py  # duck music under the voiceover
# start the app first: ../start.sh --dev --port 5173
node capture/scenes.mjs                    # re-record clips into raw/ (copy to public/clips/)
npx remotion studio src/index.ts           # preview
npm run render                             # -> out/aeris-demo.mp4
```

Docs: [NARRATION.md](NARRATION.md) · [CAPTURE_CHECKLIST.md](CAPTURE_CHECKLIST.md) · [VERIFICATION.md](VERIFICATION.md)
