#!/usr/bin/env python3
"""Bake voiceover ducking + fades into public/audio/music_ducked.wav, using the real speech segments (src/data/speech.json)."""
import json, wave, numpy as np
from pathlib import Path
R = Path(__file__).resolve().parents[1]; SR = 44100; END = 227.0
w = wave.open(str(R / "public/audio/music.wav")); x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(float).reshape(-1, 2) / 32767; w.close()
t = np.arange(len(x)) / SR
env = np.full(len(x), 0.30)                     # bed level in pauses
for a, b in json.load(open(R / "src/data/speech.json")):
    env = np.where((t >= a - 0.25) & (t <= b + 0.35), 0.11, env)   # duck under speech
k = int(0.5 * SR); env = np.convolve(env, np.ones(k) / k, "same")  # smooth attack/release
env *= np.interp(t, [0, 3, 205, 210, 222, END], [0, 1, 1, 1.35, 1.1, 0.0])
y = np.clip(x * env[:, None], -1, 1)
with wave.open(str(R / "public/audio/music_ducked.wav"), "wb") as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((y * 32767).astype("<i2").tobytes())
print("ok")
