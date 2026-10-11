#!/usr/bin/env python3
"""Synthesize the soundtrack + SFX kit (no downloads, deterministic). Needs numpy."""
import numpy as np, wave
from pathlib import Path
SR = 44100
OUT = Path(__file__).resolve().parents[1] / "public/audio"
rng = np.random.default_rng(7)

def write(name, x):
    x = np.clip(x, -1, 1)
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())

def t_(d): return np.arange(int(d * SR)) / SR
def env(x, a, r):
    n = len(x); e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) ** 2; e[n - nr:] = np.linspace(1, 0, nr) ** 2; return x * e
def lp(x, k):  # one-pole lowpass via cumulative smoothing
    y = np.empty_like(x); a = 1 - np.exp(-2 * np.pi * k / SR); s = 0.0
    for i, v in enumerate(x): s += a * (v - s); y[i] = s
    return y

# ---- music: 227 s. Tension (A minor, low drone + slow pulse) -> release (A major) at 207 s
D = 227; t = t_(D)
def f2(n): return 440 * 2 ** ((n - 69) / 12)
def pad(notes, vol, det=0.0015):
    s = np.zeros_like(t)
    for n in notes:
        for dt in (-det, 0, det):
            s += np.sin(2 * np.pi * f2(n) * (1 + dt) * t + rng.uniform(0, 6))
    return s / (3 * len(notes)) * vol
minor = pad([33, 40, 45, 48], 1.0); major = pad([33, 40, 45, 49, 52], 1.0)
x_fade = np.clip((t - 203) / 8, 0, 1)                     # crossfade minor -> major 203-211 s
bed = minor * (1 - x_fade) + major * x_fade
swell = 0.35 + 0.65 * np.clip(t / 190, 0, 1) ** 1.5       # builds toward the ACT scene
bed *= swell * (1 + 0.18 * np.sin(2 * np.pi * t / 9))
# pulse: soft low thump on every second, louder as tension builds, fades with resolution
pulse = np.zeros_like(t)
for k in range(8, 205):
    i = int(k * SR); L = int(0.45 * SR)
    th = np.sin(2 * np.pi * 52 * t_(0.45)[:L]) * np.exp(-t_(0.45)[:L] * 9)
    pulse[i:i + L] += th * (0.10 + 0.45 * min(1, k / 175))
# high shimmer tones appear only after resolution
shim = (np.sin(2 * np.pi * f2(81) * t) + np.sin(2 * np.pi * f2(88) * t) * 0.7) * np.clip((t - 207) / 4, 0, 1) * 0.03 * (1 + 0.4 * np.sin(2 * np.pi * t * 0.5))
mono = bed * 0.32 + pulse * 0.5 + shim
mono = env(mono, 3, 5)
L = mono * (1 + 0.04 * np.sin(2 * np.pi * t / 11)); R = mono * (1 - 0.04 * np.sin(2 * np.pi * t / 11))
write("music.wav", np.stack([L, R], 1) * 0.9)

# ---- sfx
def whoosh(d=0.9):
    n = rng.standard_normal(int(d * SR)); tt = t_(d)
    y = np.zeros_like(n); 
    for k in (300, 900, 2400):
        y += np.convolve(n, np.ones(max(1, SR // (k * 2))) / max(1, SR // (k * 2)), "same") * (k / 900)
    y *= np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2
    return y / np.abs(y).max() * 0.5
def tick(): tt = t_(0.25); return np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 40) * 0.5
def hit():
    tt = t_(1.2); return (np.sin(2 * np.pi * (55 + 40 * np.exp(-tt * 12)) * tt) * np.exp(-tt * 3.5) * 0.9)
def chime():
    tt = t_(2.4); return sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * (1.4 + i)) for i, f in enumerate([f2(81), f2(88), f2(93)])) * 0.22
for nm, y in [("whoosh", whoosh()), ("tick", tick()), ("hit", hit()), ("chime", chime())]:
    write(f"sfx/{nm}.wav", np.stack([y, y], 1))
print("ok")
