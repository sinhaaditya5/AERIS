import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** fade + rise + scale; `exitAt` (frames, local) triggers a faster exit. */
export const Entrance: React.FC<{ delay?: number; exitAt?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay = 0, exitAt, y = 36, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring.smooth });
  const ex = exitAt === undefined ? 0 : interpolate(frame, [exitAt, exitAt + 10], [0, 1], { easing: theme.ease.in, ...clamp });
  return (
    <div style={{ opacity: p * (1 - ex), transform: `translateY(${interpolate(p, [0, 1], [y, 0]) - ex * 24}px) scale(${interpolate(p, [0, 1], [0.96, 1])})`, ...style }}>{children}</div>
  );
};

export const WordReveal: React.FC<{ text: string; delay?: number; per?: number; style?: React.CSSProperties; hl?: string[]; exitAt?: number }> = ({ text, delay = 0, per = 3, style, hl = [], exitAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ex = exitAt === undefined ? 0 : interpolate(frame, [exitAt, exitAt + 10], [0, 1], { easing: theme.ease.in, ...clamp });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: 26, rowGap: 6, opacity: 1 - ex, ...style }}>
      {text.split(" ").map((w, i) => {
        const p = spring({ frame: frame - delay - i * per, fps, config: theme.spring.snappy });
        const on = hl.includes(w.replace(/[?.,]/g, ""));
        return (
          <span key={i} style={{ display: "inline-block", opacity: p, color: on ? theme.colors.hero : undefined, transform: `translateY(${interpolate(p, [0, 1], [34, 0])}px)` }}>{w}</span>
        );
      })}
    </div>
  );
};

/** Soft drifting background mesh (never a flat fill). */
export const BgMesh: React.FC<{ tint?: string }> = ({ tint = theme.colors.hero }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <div style={{ position: "absolute", width: 1300, height: 1300, borderRadius: "50%", top: -600, left: -300 + Math.sin(f / 55) * 60, filter: "blur(70px)", background: `radial-gradient(circle, ${tint}18, transparent 62%)` }} />
      <div style={{ position: "absolute", width: 1000, height: 1000, borderRadius: "50%", bottom: -520, right: -200 - Math.cos(f / 70) * 50, filter: "blur(80px)", background: "radial-gradient(circle, #9a9aa222, transparent 65%)" }} />
    </AbsoluteFill>
  );
};

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
/** Grade + grain + vignette: the top three layers of every scene. */
export const Finish: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(38,38,43,0.05), transparent 25%, transparent 78%, rgba(38,38,43,0.08))" }} />
      <AbsoluteFill style={{ backgroundImage: NOISE, backgroundSize: "220px", backgroundPosition: `${(f * 7) % 220}px ${(f * 13) % 220}px`, opacity: 0.035, mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 62%, rgba(38,38,43,0.12) 100%)" }} />
    </AbsoluteFill>
  );
};

export const useExit = (durationInFrames: number, frames = 10) => {
  const f = useCurrentFrame();
  return interpolate(f, [durationInFrames - frames, durationInFrames - 1], [0, 1], { easing: theme.ease.in, ...clamp });
};
export { clamp };
