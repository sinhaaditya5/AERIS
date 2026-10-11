import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { clamp } from "./Fx";
import subtitles from "../data/subtitles.json";
import topSites from "../data/top_sites.json";

/** Global subtitles from the voiceover transcript (absolute timeline; call inside the root composition). */
export const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const s = (subtitles as { start: number; end: number; text: string }[]).find((x) => t >= x.start && t <= x.end);
  if (!s) return null;
  const o = interpolate(t, [s.start, s.start + 0.12, s.end - 0.12, s.end], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 58, display: "flex", justifyContent: "center", opacity: o, pointerEvents: "none", fontFamily: theme.fonts.body }}>
      <div style={{ maxWidth: 1560, padding: "9px 26px 11px", borderRadius: 12, background: "rgba(30,30,34,0.82)", color: "#fff", fontSize: 32, fontWeight: 500, lineHeight: 1.25, textAlign: "center", letterSpacing: "0.005em", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{s.text}</div>
    </div>
  );
};

const Plate: React.FC<{ children: React.ReactNode; style: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: "absolute", background: "rgba(255,255,255,0.96)", borderRadius: 16, boxShadow: "0 24px 60px -18px rgba(38,38,43,0.45), 0 2px 8px rgba(38,38,43,0.12)", fontFamily: theme.fonts.body, ...style }}>{children}</div>
);

/** SOURCE → MOVE → EXPOSE → PRIORITIZE → ACT, lit stage by stage at `at` (scene-local seconds). */
export const Ribbon: React.FC<{ at: number[]; y: number; hideAt?: number }> = ({ at, y, hideAt }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const names = ["SOURCE", "MOVE", "EXPOSE", "PRIORITIZE", "ACT"];
  const vis = interpolate(t, [at[0] - 0.4, at[0]], [0, 1], clamp) * (hideAt ? interpolate(t, [hideAt, hideAt + 0.5], [1, 0], clamp) : 1);
  if (vis <= 0) return null;
  return (
    <Plate style={{ left: 330, width: 1260, top: y, opacity: vis, transform: `translateY(${(1 - vis) * 20}px)`, padding: "22px 34px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {names.map((n, i) => {
        const p = interpolate(t, [at[i], at[i] + 0.5], [0, 1], { easing: theme.ease.out, ...clamp });
        const line = i > 0 ? interpolate(t, [at[i] - 0.35, at[i]], [0, 1], clamp) : 0;
        return (
          <React.Fragment key={n}>
            {i > 0 && <div style={{ flex: 1, height: 3, margin: "0 12px", background: theme.colors.line, position: "relative" }}><div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${line * 100}%`, background: theme.colors.hero }} /></div>}
            <div style={{ padding: "10px 22px", borderRadius: 999, fontSize: 22, fontWeight: 700, letterSpacing: "0.14em", background: p > 0.5 ? theme.colors.hero : "transparent", color: p > 0.5 ? "#fff" : theme.colors.grey, border: `2px solid ${p > 0.5 ? theme.colors.hero : theme.colors.line}`, transform: `scale(${1 + 0.06 * Math.sin(Math.PI * p)})` }}>{n}</div>
          </React.Fragment>
        );
      })}
    </Plate>
  );
};

/** SOURCE → POTENTIAL RISK → EXPOSED POPULATION → PRIORITIZED SITES, with the nature of each output labelled. */
export const Chain: React.FC<{ at: number[]; y: number; hideAt: number }> = ({ at, y, hideAt }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const items = [["SOURCE", "Observed fires"], ["POTENTIAL RISK", "Model estimate"], ["EXPOSED POPULATION", "Estimate"], ["PRIORITIZED SITES", "Heuristic ranking"]];
  const vis = interpolate(t, [at[0] - 0.3, at[0]], [0, 1], clamp) * interpolate(t, [hideAt, hideAt + 0.5], [1, 0], clamp);
  if (vis <= 0) return null;
  return (
    <Plate style={{ left: 250, width: 1420, top: y, opacity: vis, transform: `translateY(${(1 - vis) * 20}px)`, padding: "18px 30px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      {items.map(([n, l], i) => {
        const p = interpolate(t, [at[i], at[i] + 0.5], [0, 1], { easing: theme.ease.out, ...clamp });
        return (
          <React.Fragment key={n}>
            {i > 0 && <div style={{ flex: 1, height: 3, marginTop: 21, background: theme.colors.line, position: "relative" }}><div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${interpolate(t, [at[i] - 0.4, at[i]], [0, 1], clamp) * 100}%`, background: theme.colors.hero }} /></div>}
            <div style={{ textAlign: "center", margin: "0 10px" }}>
              <div style={{ padding: "9px 18px", borderRadius: 999, fontSize: 19, fontWeight: 700, letterSpacing: "0.1em", background: p > 0.5 ? theme.colors.hero : "transparent", color: p > 0.5 ? "#fff" : theme.colors.grey, border: `2px solid ${p > 0.5 ? theme.colors.hero : theme.colors.line}` }}>{n}</div>
              <div style={{ marginTop: 8, fontSize: 16, color: theme.colors.grey, opacity: p }}>{l}</div>
            </div>
          </React.Fragment>
        );
      })}
    </Plate>
  );
};

/** Top-5 of the real ranked_sites.json, revealed one by one; the first record gets a focus frame. */
export const RankPanel: React.FC<{ at: number; dur: number; x: number; y: number }> = ({ at, dur, x, y }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  if (t < at - 0.2 || t > at + dur + 0.6) return null;
  const vis = interpolate(t, [at, at + 0.5, at + dur, at + dur + 0.5], [0, 1, 1, 0], clamp);
  return (
    <Plate style={{ left: x, top: y, width: 600, opacity: vis, transform: `translateY(${(1 - vis) * 22}px)`, padding: "18px 22px 20px", borderLeft: `6px solid ${theme.colors.hero}` }}>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", color: theme.colors.hero, textTransform: "uppercase" }}>Ranked facilities · top 5 of 444 · heuristic</div>
      {(topSites as { rank: number; name: string; type: string; eta_hours: number }[]).map((s, i) => {
        const p = spring({ frame: f - (at + 0.5 + i * 0.85) * fps, fps, config: theme.spring.smooth });
        return (
          <div key={s.rank} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, padding: "9px 12px", borderRadius: 10, opacity: p, transform: `translateX(${(1 - p) * -24}px)`, outline: i === 0 ? `2.5px solid ${theme.colors.hero}` : "none", background: i === 0 ? theme.colors.heroSoft : "#F7F6F4" }}>
            <div style={{ fontFamily: theme.fonts.display, fontSize: 34, width: 44, color: theme.colors.ink }}>#{s.rank}</div>
            <div style={{ flex: 1, fontSize: 21, fontWeight: 600, color: theme.colors.ink }}>{s.name}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.colors.grey, textAlign: "right", textTransform: "capitalize" }}>{s.type}<br />ETA {s.eta_hours.toFixed(1)} h</div>
          </div>
        );
      })}
    </Plate>
  );
};
