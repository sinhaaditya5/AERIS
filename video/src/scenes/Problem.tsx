import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { BgMesh, Finish, WordReveal, Entrance, clamp, useExit } from "../components/Fx";
import fires from "../data/fires.json";

// deterministic skyline (stylised motion graphic - NOT footage)
const rnd = (i: number, s: number) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const Skyline: React.FC<{ seed: number; base: number; h: number; col: string; speed: number; blur: number }> = ({ seed, base, h, col, speed, blur }) => {
  const f = useCurrentFrame();
  const bs: React.ReactNode[] = []; let x = -80;
  for (let i = 0; x < 2200; i++) { const w = 60 + rnd(i, seed) * 120, bh = h * (0.3 + rnd(i, seed + 9) * 0.7); bs.push(<rect key={i} x={x} y={base - bh} width={w} height={bh + 400} fill={col} />); x += w + 4 + rnd(i, seed + 3) * 14; }
  return <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, transform: `translateX(${-f * speed}px)`, filter: `blur(${blur}px)` }}>{bs}</svg>;
};

const FireField: React.FC<{ start: number }> = ({ start }) => {
  const f = useCurrentFrame();
  const [x0, y0, x1, y1] = [73.5, 28.0, 77.5, 32.5];
  const bw = 520, bh = (bw * (y1 - y0)) / (x1 - x0) * 1.15;
  return (
    <div style={{ position: "absolute", right: 150, top: 190, width: bw, height: bh }}>
      <div style={{ position: "absolute", inset: 0, border: `1.5px solid ${theme.colors.line}`, borderRadius: 6, background: "rgba(255,255,255,0.45)", opacity: interpolate(f, [start - 12, start + 8], [0, 1], clamp) }} />
      {(fires.fires as { lat: number; lon: number }[]).map((p, i) => {
        const t = interpolate(f, [start + i * 0.18, start + i * 0.18 + 10], [0, 1], { easing: theme.ease.out, ...clamp });
        return <div key={i} style={{ position: "absolute", left: ((p.lon - x0) / (x1 - x0)) * bw, top: (1 - (p.lat - y0) / (y1 - y0)) * bh, width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5, borderRadius: "50%", background: theme.colors.hero, opacity: t * 0.85, transform: `scale(${t})` }} />;
      })}
      <div style={{ position: "absolute", left: 0, top: bh + 14, fontFamily: theme.fonts.body, fontSize: 16, color: theme.colors.grey, letterSpacing: "0.03em", opacity: interpolate(f, [start + 20, start + 40], [0, 1], clamp) }}>NASA FIRMS VIIRS detections, 7 Oct 2026 · Punjab · Haryana · Delhi NCR</div>
    </div>
  );
};

/** Mounts children from frame `at`, with a fade-out starting at `exitAt` (frames of the parent scene). */
const Seq: React.FC<{ at: number; exitAt: number; children: React.ReactNode }> = ({ at, exitAt, children }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const o = interpolate(f, [exitAt, exitAt + 10], [1, 0], clamp);
  return <div style={{ opacity: o }}>{children}</div>;
};

export const Problem: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = useExit(durationInFrames, 12);
  const drift = interpolate(f, [0, durationInFrames], [0, 1]);
  const clear = interpolate(f, [11 * fps, 14.5 * fps], [0, 1], { easing: theme.ease.inOut, ...clamp }); // haze thins as the data appears
  return (
    <AbsoluteFill style={{ opacity: 1 - exit, transform: `scale(${1 + exit * 0.06})` }}>
      <BgMesh />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #c9c4bd 0%, #dcd7d0 45%, #efece8 100%)", opacity: 1 - clear * 0.75 }} />
      <AbsoluteFill style={{ opacity: 1 - clear * 0.85 }}>
        <div style={{ position: "absolute", left: 1180, top: 120 + Math.sin(f / 70) * 10, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(122,31,43,0.30), rgba(122,31,43,0.08) 50%, transparent 70%)", filter: "blur(10px)" }} />
        <Skyline seed={3} base={880} h={420} col="#b4aea7" speed={0.12} blur={3} />
        <Skyline seed={7} base={930} h={380} col="#8f8a84" speed={0.25} blur={1.5} />
        <Skyline seed={11} base={1010} h={330} col="#5d5a58" speed={0.45} blur={0} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(220,215,208,0.0) 30%, rgba(220,215,208,0.55) 78%, rgba(220,215,208,0.85) 100%)" }} />
        {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: "absolute", left: -600 + ((f * (3 + i) + i * 700) % 3200), top: 1000 + i * 12, width: 220, height: 3, background: i % 2 ? "rgba(122,31,43,0.55)" : "rgba(255,240,220,0.7)", filter: "blur(2px)", borderRadius: 3 }} />)}
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 190, fontFamily: theme.fonts.display, color: theme.colors.ink, fontSize: 112, lineHeight: 1.04, letterSpacing: "-0.02em", width: 1100 }}>
        <WordReveal text="Pollution doesn't stop at the source." delay={8} per={4} exitAt={7.4 * fps} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 190, fontFamily: theme.fonts.display, color: theme.colors.ink, fontSize: 104, lineHeight: 1.04, letterSpacing: "-0.02em", width: 1100 }}>
        <Seq at={8.0 * fps} exitAt={10.8 * fps}><WordReveal text="Detection is only the beginning." delay={8.0 * fps} per={4} hl={["beginning"]} /></Seq>
      </div>
      <div style={{ position: "absolute", left: 120, top: 700, fontFamily: theme.fonts.body, fontSize: 40, fontWeight: 600, color: theme.colors.ink, lineHeight: 1.5 }}>
        {[["Where could it go?", 11.4], ["Who could be affected?", 13.8], ["What to do next?", 15.0]].map(([q, at]) => <Entrance key={q as string} delay={(at as number) * fps} y={20}><span style={{ borderLeft: `5px solid ${theme.colors.hero}`, paddingLeft: 18 }}>{q}</span></Entrance>)}
      </div>
      <FireField start={11.4 * fps} />
      <div style={{ position: "absolute", left: 120, bottom: 28, fontFamily: theme.fonts.body, fontSize: 14, color: theme.colors.grey, opacity: 1 - clear }}>Stylised motion graphic, not documentary footage · Real NASA FIRMS data enters at 0:11</div>
      <Finish />
    </AbsoluteFill>
  );
};
