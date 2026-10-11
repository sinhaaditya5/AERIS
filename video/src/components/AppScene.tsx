import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, FPS } from "../theme";
import { BgMesh, Finish, Entrance, clamp, useExit } from "./Fx";

export type Seg = { clip: string; from: number; dur: number; rate?: number };
export type Zoom = { t: number; s: number; ox: number; oy: number };
export type Callout = { at: number; dur: number; x: number; y: number; w?: number; label: string; value?: string | ((p: number) => string); sub?: string; big?: boolean };
export type Stage = "SOURCE" | "MOVE" | "EXPOSE" | "PRIORITIZE" | "ACT";

const CARD = { x: 124, y: 14, w: 1672, h: 940, k: 1672 / 1920 };
export const STAGES: Stage[] = ["SOURCE", "MOVE", "EXPOSE", "PRIORITIZE", "ACT"];

export const StageRail: React.FC<{ active: Stage; all?: boolean }> = ({ active, all }) => (
  <div style={{ position: "absolute", left: 124, bottom: 8, display: "flex", alignItems: "center", gap: 10, fontFamily: theme.fonts.body }}>
    {STAGES.map((s, i) => (
      <React.Fragment key={s}>
        <div style={{ padding: "6px 14px", borderRadius: 999, fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", background: s === active || all ? theme.colors.hero : "transparent", color: s === active || all ? "#fff" : theme.colors.grey, border: `1.5px solid ${s === active || all ? theme.colors.hero : theme.colors.line}` }}>{s}</div>
        {i < STAGES.length - 1 && <div style={{ width: 22, height: 2, background: theme.colors.line }} />}
      </React.Fragment>
    ))}
  </div>
);

export const ProvBug: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", right: 124, bottom: 16, fontFamily: theme.fonts.body, fontSize: 15, color: theme.colors.grey, letterSpacing: "0.02em", textAlign: "right" }}>{text}</div>
);

const Footage: React.FC<{ seg: Seg; len: number }> = ({ seg, len }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, len - 8, len], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <OffthreadVideo src={staticFile(`clips/${seg.clip}.mp4`)} startFrom={Math.round(seg.from * FPS)} playbackRate={seg.rate ?? 1} muted style={{ width: 1920, height: 1080 }} />
    </AbsoluteFill>
  );
};

const CalloutCard: React.FC<{ c: Callout }> = ({ c }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = c.at * fps, end = (c.at + c.dur) * fps;
  if (f < start - 2 || f > end + 12) return null;
  const p = spring({ frame: f - start, fps, config: theme.spring.smooth });
  const cp = interpolate(f - start, [0, 40], [0, 1], { easing: theme.ease.out, ...clamp }); // count-up progress
  const ex = interpolate(f, [end, end + 10], [0, 1], { easing: theme.ease.in, ...clamp });
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w ?? 440, opacity: p * (1 - ex), transform: `translateY(${interpolate(p, [0, 1], [26, 0]) - ex * 18}px) scale(${interpolate(p, [0, 1], [0.95, 1])})`, background: "rgba(255,255,255,0.97)", borderRadius: 14, borderLeft: `6px solid ${theme.colors.hero}`, padding: "16px 22px 18px", boxShadow: "0 24px 60px -18px rgba(38,38,43,0.45), 0 2px 8px rgba(38,38,43,0.12)", fontFamily: theme.fonts.body }}>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", color: theme.colors.hero, textTransform: "uppercase" }}>{c.label}</div>
      {c.value && <div style={{ fontFamily: theme.fonts.display, fontSize: c.big ? 76 : 52, lineHeight: 1.05, color: theme.colors.ink, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{typeof c.value === "function" ? c.value(cp) : c.value}</div>}
      {c.sub && <div style={{ fontSize: 19, lineHeight: 1.35, color: theme.colors.grey, marginTop: 6 }}>{c.sub}</div>}
    </div>
  );
};

export const AppScene: React.FC<{ stage?: Stage; all?: boolean; overlay?: React.ReactNode; segs: Seg[]; zooms?: Zoom[]; callouts?: Callout[]; prov: string; durationInFrames: number }> = ({ stage, all, overlay, segs, zooms = [], callouts = [], prov, durationInFrames }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  

  const exit = useExit(durationInFrames, 10);
  // camera: eased interpolation between zoom keyframes
  const ks = [{ t: 0, s: 1, ox: 960, oy: 540 }, ...zooms];
  let z = ks[0];
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1];
    if (f >= a.t * fps && f <= b.t * fps) {
      const p = theme.ease.inOut((f - a.t * fps) / Math.max(1, (b.t - a.t) * fps));
      z = { t: f, s: a.s + (b.s - a.s) * p, ox: a.ox + (b.ox - a.ox) * p, oy: a.oy + (b.oy - a.oy) * p };
      break;
    }
    if (f > b.t * fps) z = b;
  }
  const intro = spring({ frame: f, fps, config: theme.spring.smooth });
  let off = 0;
  const seq = segs.map((s) => { const len = Math.round(s.dur * fps); const from = off; off += len - 8; return { s, from, len }; });
  return (
    <AbsoluteFill>
      <BgMesh />
      <div style={{ position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: 18, overflow: "hidden", background: "#fff", opacity: intro * (1 - exit), transform: `translateY(${interpolate(intro, [0, 1], [30, 0]) - exit * 16}px) scale(${interpolate(intro, [0, 1], [0.97, 1])})`, boxShadow: "0 40px 90px -30px rgba(38,38,43,0.55), 0 0 0 1px rgba(38,38,43,0.08)" }}>
        <div style={{ width: 1920, height: 1080, transformOrigin: "0 0", transform: `scale(${CARD.k})` }}>
          <div style={{ width: 1920, height: 1080, transformOrigin: `${z.ox}px ${z.oy}px`, transform: `scale(${z.s})`, position: "relative" }}>
            {seq.map(({ s, from, len }, i) => (
              <Sequence key={i} from={from} durationInFrames={len}><Footage seg={s} len={len} /></Sequence>
            ))}
          </div>
        </div>
      </div>
      <div style={{ opacity: 1 - exit }}>
        {stage && <StageRail active={stage} all={all} />}
        <ProvBug text={prov} />
        {overlay}
        {callouts.map((c, i) => <CalloutCard key={i} c={c} />)}
      </div>
      <Finish />
    </AbsoluteFill>
  );
};


export { Entrance };
