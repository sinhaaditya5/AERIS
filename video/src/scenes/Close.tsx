import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, NAME } from "../theme";
import { BgMesh, Finish, WordReveal, Entrance, clamp } from "../components/Fx";
import { AppScene } from "../components/AppScene";
import { PROV } from "../data/format";

/** Rings + fire dot + dashed path, after docs/assets/logo.svg, recoloured to the video palette. */
export const Mark: React.FC<{ size: number; t: number }> = ({ size, t }) => {
  const s = size / 180;
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" style={{ filter: `drop-shadow(0 0 ${size * 0.12}px ${theme.colors.glow})` }}>
      <circle cx="90" cy="90" r="64" fill="none" stroke={theme.colors.ink} strokeWidth="8" strokeDasharray={402} strokeDashoffset={402 * (1 - interpolate(t, [0, 0.5], [0, 1], { easing: theme.ease.out, ...clamp }))} transform="rotate(-90 90 90)" />
      <circle cx="90" cy="90" r="40" fill="none" stroke={theme.colors.grey} strokeWidth="5" strokeDasharray={252} strokeDashoffset={252 * (1 - interpolate(t, [0.15, 0.65], [0, 1], { easing: theme.ease.out, ...clamp }))} transform="rotate(-90 90 90)" />
      <circle cx="90" cy="90" r={16 * interpolate(t, [0.4, 0.8], [0, 1], { easing: theme.ease.out, ...clamp })} fill={theme.colors.ink} />
      <path d="M138 64 Q112 80 96 90" stroke={theme.colors.hero} strokeWidth="3.5" fill="none" strokeDasharray="5 4" opacity={interpolate(t, [0.6, 0.9], [0, 1], clamp)} />
      <circle cx="132" cy="58" r={7.5 * interpolate(t, [0.55, 0.9], [0, 1], { easing: theme.ease.out, ...clamp })} fill={theme.colors.hero} />
    </svg>
  );
};

const EndCard: React.FC = () => {
  const f0 = useCurrentFrame();
  const f = f0 - Math.round(11.0 * 30);
  const { fps } = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill>
      <BgMesh />
      <OffthreadVideo src={staticFile("clips/source_map.mp4")} startFrom={30} muted style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, filter: "blur(6px) saturate(0.5)", opacity: 0.2 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(244,242,239,0.9) 30%, rgba(244,242,239,0.35) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: theme.fonts.body }}>
        <Mark size={190} t={t / 1.4} />
        <Entrance delay={8} style={{ fontFamily: theme.fonts.display, fontSize: 150, color: theme.colors.ink, letterSpacing: "0.04em", marginTop: 14, lineHeight: 1 }}>{NAME.short}</Entrance>
        <Entrance delay={18} style={{ fontSize: 28, fontWeight: 600, color: theme.colors.ink, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 18 }}>{NAME.full}</Entrance>
        <div style={{ width: interpolate(f, [26, 50], [0, 160], { easing: theme.ease.out, ...clamp }), height: 3, background: theme.colors.hero, margin: "26px 0" }} />
        <Entrance delay={32} style={{ fontFamily: theme.fonts.display, fontSize: 52, color: theme.colors.hero }}>{NAME.tagline}</Entrance>
      </div>
      <Finish />
    </AbsoluteFill>
  );
};

/** Closing: real dashboard under the last lines of narration, then the exact end card, then a gentle fade-out. */
const Line: React.FC<{ from: number; to: number; lines: { t: string; at: number; hl?: string[] }[] }> = ({ from, to, lines }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = interpolate(f, [from * fps, from * fps + 6, to * fps - 8, to * fps], [0, 1, 1, 0], clamp);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 120, right: 120, bottom: 170, display: "flex", justifyContent: "center", fontFamily: theme.fonts.display, fontSize: 60, lineHeight: 1.12, color: theme.colors.ink, textAlign: "center", opacity: o }}>
      <div style={{ background: "rgba(255,255,255,0.95)", padding: "20px 40px", borderRadius: 16, boxShadow: "0 24px 60px -18px rgba(38,38,43,0.5)", borderLeft: `6px solid ${theme.colors.hero}`, maxWidth: 1480 }}>
        {lines.map((l) => <WordReveal key={l.t} text={l.t} delay={l.at * fps} per={3} hl={l.hl} style={{ justifyContent: "center" }} />)}
      </div>
    </div>
  );
};

export const Close: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const split = 11.0 * fps;
  const end = interpolate(f, [split, split + 18], [0, 1], clamp);
  const fade = interpolate(f, [durationInFrames - 36, durationInFrames - 4], [0, 1], { easing: theme.ease.inOut, ...clamp });
  return (
    <AbsoluteFill>
      <AppScene stage="ACT" all durationInFrames={Math.round(split + 18)} prov={PROV} segs={[{ clip: "close_dash", from: 0.3, dur: 6.4 }, { clip: "close_dash", from: 0.3, dur: 6.4 }]} callouts={[]} />
      <Line from={0.4} to={3.3} lines={[{ t: "Environmental threats demand more than detection.", at: 0.5 }]} />
      <Line from={3.4} to={5.9} lines={[{ t: "They demand informed decisions.", at: 3.5, hl: ["informed"] }]} />
      <Line from={6.0} to={11.0} lines={[{ t: "AERIS doesn't just help identify environmental risks,", at: 6.0 }, { t: "it helps cities decide what to do next.", at: 8.9, hl: ["decide"] }]} />
      <AbsoluteFill style={{ opacity: end }}><EndCard /></AbsoluteFill>
      <AbsoluteFill style={{ background: theme.colors.bg, opacity: fade }} />
    </AbsoluteFill>
  );
};
