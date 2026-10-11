import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { BgMesh, Finish, Entrance, WordReveal, clamp, useExit } from "../components/Fx";

type Col = { n: string; title: string; chips: string[]; note: string };
// Only services present in infra/template.yaml and the repo's agent/pipeline code.
const COLS: Col[] = [
  { n: "01", title: "Ingestion", chips: ["NASA FIRMS", "OpenAQ", "Open-Meteo", "EventBridge + Lambda"], note: "Scheduled fetchers pull real feeds" },
  { n: "02", title: "Validation + storage", chips: ["Secrets Manager", "SQS dead-letter", "Amazon S3"], note: "A failed fetch never overwrites good data" },
  { n: "03", title: "Geospatial analysis", chips: ["Step Functions", "Lambda: detect", "Lambda: corridor"], note: "Fire sources → wind-driven corridors" },
  { n: "04", title: "Exposure estimation", chips: ["OpenStreetMap sites", "WorldPop population", "Lambda: rank"], note: "Estimates, not confirmed exposure" },
  { n: "05", title: "Prioritization + plan", chips: ["Ranked sites", "Strands + Bedrock", "Rules fallback"], note: "Advisory actions for human review" },
  { n: "06", title: "Application", chips: ["API Gateway", "CloudFront", "CloudWatch + SNS"], note: "Dashboard delivers the results" },
];
// local seconds at which the narration reaches each stage
const AT = [3.0, 5.0, 6.9, 8.6, 10.1, 11.8];
const COLW = 268, GAP = 26, X0 = 96;

export const Tech: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = useExit(durationInFrames, 12);
    return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <BgMesh />
      <div style={{ position: "absolute", left: 96, top: 72, fontFamily: theme.fonts.display, fontSize: 70, color: theme.colors.ink, letterSpacing: "-0.02em" }}>
        <WordReveal text="One continuous pipeline." delay={4} per={4} hl={["pipeline"]} />
      </div>
      <div style={{ position: "absolute", left: 96, top: 170, fontFamily: theme.fonts.body, fontSize: 20, color: theme.colors.grey }}>Components as defined in the repository's SAM template (ap-south-1). Optional, undeployed components are not shown.</div>
      {/* flow line */}
      <div style={{ position: "absolute", left: X0 + COLW / 2, top: 395, width: (COLW + GAP) * 5, height: 3, background: theme.colors.line }} />
      <div style={{ position: "absolute", left: X0 + COLW / 2, top: 395, height: 3, background: theme.colors.hero, width: interpolate(f, [fps * AT[0], fps * AT[5]], [0, (COLW + GAP) * 5], { easing: theme.ease.inOut, ...clamp }) }} />
      {/* traveling packet */}
      <div style={{ position: "absolute", top: 388, left: X0 + COLW / 2 + interpolate(f, [fps * AT[0], fps * AT[5]], [0, (COLW + GAP) * 5], { easing: theme.ease.inOut, ...clamp }) - 8, width: 16, height: 16, borderRadius: "50%", background: theme.colors.hero, boxShadow: `0 0 24px ${theme.colors.glow}`, opacity: f > fps * AT[0] ? 1 : 0 }} />
      {COLS.map((c, i) => {
        const d = fps * AT[i] - 6;
        const p = spring({ frame: f - d, fps, config: theme.spring.smooth });
        return (
          <div key={c.n} style={{ position: "absolute", left: X0 + i * (COLW + GAP), top: 340, width: COLW, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [34, 0])}px)`, fontFamily: theme.fonts.body }}>
            <div style={{ width: 118, height: 118, margin: "0 auto", borderRadius: "50%", background: "#fff", border: `2px solid ${i === 4 ? theme.colors.hero : theme.colors.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.fonts.display, fontSize: 50, color: i === 4 ? theme.colors.hero : theme.colors.ink, boxShadow: "0 18px 40px -16px rgba(38,38,43,0.35)", marginTop: -59 + 59 }}>{c.n}</div>
            <div style={{ textAlign: "center", fontSize: 24, fontWeight: 700, color: theme.colors.ink, marginTop: 22 }}>{c.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 18 }}>
              {c.chips.map((ch, j) => {
                const q = spring({ frame: f - d - 8 - j * 4, fps, config: theme.spring.snappy });
                return <div key={ch} style={{ opacity: q, transform: `translateX(${interpolate(q, [0, 1], [-16, 0])}px)`, padding: "10px 14px", background: "#fff", borderRadius: 10, border: `1px solid ${theme.colors.line}`, fontSize: 18, fontWeight: 500, color: theme.colors.ink, textAlign: "center" }}>{ch}</div>;
              })}
            </div>
            <div style={{ marginTop: 16, fontSize: 16, lineHeight: 1.35, color: theme.colors.grey, textAlign: "center" }}>{c.note}</div>
          </div>
        );
      })}
      <Entrance delay={fps * 14.4} style={{ position: "absolute", left: 96, bottom: 150, fontFamily: theme.fonts.body, fontSize: 22, color: theme.colors.ink, maxWidth: 1500, lineHeight: 1.4 }}>
        Environmental data in, <b>decision-ready intelligence</b> out. Raw data stays separate from modelled output, and old results are flagged <b>stale</b> rather than refreshed with invented values.
      </Entrance>
      <Finish />
    </AbsoluteFill>
  );
};
