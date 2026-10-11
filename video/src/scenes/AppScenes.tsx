import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { AppScene } from "../components/AppScene";
import { BgMesh, Entrance, clamp } from "../components/Fx";
import { Chain, RankPanel, Ribbon } from "../components/Overlays";
import { Mark } from "./Close";
import { theme, NAME } from "../theme";
import { m, n0, mil, day, dm, PROV } from "../data/format";

// All scene-local times below are seconds from the scene start; they were cut against the supplied voiceover transcript.
type P = { durationInFrames: number };
const S = m.source, X = m.expose, SN = m.snapshot, W = m.move.wind_first_sample;

/** AERIS title reveal, then the real dashboard, the four real signal families, then the five-stage workflow ribbon. */
const TitleCard: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const o = interpolate(t, [4.6, 5.6], [1, 0], clamp);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <BgMesh />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 90 }}>
        <Mark size={170} t={t / 1.2} />
        <Entrance delay={10} style={{ fontFamily: theme.fonts.display, fontSize: 140, color: theme.colors.ink, letterSpacing: "0.04em", lineHeight: 1, marginTop: 10 }}>{NAME.short}</Entrance>
        <Entrance delay={34} style={{ fontFamily: theme.fonts.body, fontSize: 28, fontWeight: 600, color: theme.colors.ink, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 16 }}>{NAME.full}</Entrance>
      </div>
    </AbsoluteFill>
  );
};

const SignalChips: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const chips: [string, number][] = [["Satellite fire detections", 9.3], ["Air-quality observations", 11.4], ["Weather & wind", 12.9], ["Critical public facilities", 14.4]];
  const out = interpolate(t, [18.6, 19.4], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 850, display: "flex", justifyContent: "center", gap: 16, opacity: out, fontFamily: theme.fonts.body }}>
      {chips.map(([c, at]) => {
        const p = interpolate(t, [at, at + 0.5], [0, 1], { easing: theme.ease.out, ...clamp });
        return <div key={c} style={{ opacity: p, transform: `translateY(${(1 - p) * 18}px)`, padding: "12px 24px", borderRadius: 999, background: "rgba(255,255,255,0.97)", border: `2px solid ${theme.colors.hero}`, color: theme.colors.ink, fontSize: 22, fontWeight: 700, boxShadow: "0 14px 34px -14px rgba(38,38,43,0.5)" }}>{c}</div>;
      })}
    </div>
  );
};

export const Intro: React.FC<P> = ({ durationInFrames }) => (
  <AppScene durationInFrames={durationInFrames} prov={PROV}
    segs={[0, 1, 2, 3, 4].map(() => ({ clip: "close_dash", from: 0.3, dur: 6.4 }))}
    zooms={[{ t: 8.6, s: 1, ox: 1100, oy: 140 }, { t: 9.8, s: 1.5, ox: 1100, oy: 140 }, { t: 17.4, s: 1.5, ox: 1100, oy: 140 }, { t: 18.8, s: 1, ox: 960, oy: 540 }]}
    overlay={<><TitleCard /><SignalChips /><Ribbon at={[20.0, 21.2, 22.4, 23.6, 24.8]} y={780} hideAt={27.0} /></>}
    callouts={[
      { at: 6.0, dur: 3.2, x: 1230, y: 640, w: 520, label: "Environmental risk analysis", sub: "A decision-support system: fire, air-quality, weather and facility data in one analytical view." },
    ]} />
);

export const Source: React.FC<P> = ({ durationInFrames }) => (
  <AppScene stage="SOURCE" durationInFrames={durationInFrames} prov={PROV}
    segs={[
      { clip: "source_map", from: 1.0, dur: 5.5 },
      { clip: "source_map", from: 14.0, dur: 5.3 },
      { clip: "move_dash", from: 1.0, dur: 5.5 },
      { clip: "source_map", from: 5.5, dur: 7.0 },
      { clip: "source_table", from: 0.8, dur: 5.0, rate: 0.8 },
    ]}
    zooms={[
      { t: 5.6, s: 1, ox: 1920, oy: 150 }, { t: 6.6, s: 1.75, ox: 1920, oy: 150 }, { t: 9.8, s: 1.75, ox: 1920, oy: 150 }, { t: 10.6, s: 1, ox: 560, oy: 330 },
      { t: 11.3, s: 1, ox: 560, oy: 330 }, { t: 12.3, s: 1.5, ox: 560, oy: 330 }, { t: 14.8, s: 1.5, ox: 560, oy: 330 }, { t: 15.6, s: 1, ox: 1920, oy: 150 },
      { t: 16.2, s: 1, ox: 1920, oy: 150 }, { t: 17.0, s: 1.75, ox: 1920, oy: 150 }, { t: 20.2, s: 1.75, ox: 1920, oy: 150 }, { t: 21.0, s: 1, ox: 960, oy: 540 },
    ]}
    callouts={[
      { at: 3.0, dur: 3.4, x: 1230, y: 600, w: 540, label: "Observed · NASA FIRMS", value: (p) => `${Math.round(S.clustered_detections * p)}`, sub: `VIIRS fire detections (SNPP, NOAA-20, NOAA-21), grouped into ${S.clusters} candidate sources. Captured ${day(SN.fires_generated_at)}.` },
      { at: 7.2, dur: 3.0, x: 330, y: 640, w: 560, label: "Observed · OpenAQ stations", value: `${S.aqi_stations_with_value} stations`, sub: `Archived AQI readings, ${dm(SN.aqi_observed_first)}–${day(SN.aqi_observed_last)}, each with its own timestamp.` },
      { at: 10.9, dur: 4.2, x: 1130, y: 650, w: 640, label: "Observed input · Open-Meteo GFS", value: `SW ${W.dir_from_deg}° · ${W.speed_kmh} km/h`, sub: `First point of a ${m.move.wind_sample_points}-point × 48 h forecast grid, captured ${day(SN.wind_generated_at)}. The app marks it stale.` },
      { at: 16.8, dur: 3.6, x: 330, y: 640, w: 560, label: `Largest candidate · ${S.top_id}`, value: `${S.top_frp_mw} MW`, sub: `${S.top_fires} detections in Punjab. Type and 75% confidence are uncalibrated heuristics.` },
      { at: 22.3, dur: 3.4, x: 1190, y: 690, w: 560, label: "Fire radiative power", value: `${n0(S.total_frp_mw)} MW`, sub: `Total across ${S.clusters} candidates. Fire power, not pollutant concentration.` },
    ]} />
);

export const Move: React.FC<P> = ({ durationInFrames }) => (
  <AppScene stage="MOVE" durationInFrames={durationInFrames} prov={PROV}
    segs={[
      { clip: "move_map", from: 1.5, dur: 4.4 },
      { clip: "move_dash", from: 1.0, dur: 4.3 },
      { clip: "move_map", from: 7.0, dur: 20.2, rate: 0.8 },
    ]}
    zooms={[
      { t: 4.5, s: 1, ox: 560, oy: 330 }, { t: 5.5, s: 1.5, ox: 560, oy: 330 }, { t: 7.6, s: 1.5, ox: 560, oy: 330 }, { t: 8.4, s: 1, ox: 900, oy: 450 },
      { t: 12.0, s: 1, ox: 900, oy: 450 }, { t: 13.4, s: 1.3, ox: 900, oy: 450 }, { t: 23.0, s: 1.3, ox: 900, oy: 450 }, { t: 25.0, s: 1, ox: 960, oy: 540 },
    ]}
    callouts={[
      { at: 4.2, dur: 3.6, x: 1130, y: 650, w: 640, label: "Observed input · Open-Meteo GFS", value: `SW ${W.dir_from_deg}° · ${W.speed_kmh} km/h`, sub: "Wind forecast sample used to carry each source into a corridor." },
      { at: 8.6, dur: 6.6, x: 1230, y: 640, w: 560, label: "Model estimate · not observed", value: "4 time bands", sub: "0–2 h, 2–4 h, 4–8 h and 8–24 h potential corridors. A simplified physics baseline, uncalibrated." },
      { at: 16.2, dur: 4.8, x: 1230, y: 700, w: 560, label: "Decision-support estimate", sub: "A focused starting point for assessment, not a guarantee of where pollution will travel." },
      { at: 21.8, dur: 5.0, x: 330, y: 640, w: 600, label: "Punjab corridors", value: `${X.sites_inside_punjab_corridors} ranked sites`, sub: "In this snapshot no ranked school or hospital lies inside any corridor from the Punjab sources (point-in-polygon check)." },
    ]} />
);

export const Expose: React.FC<P> = ({ durationInFrames }) => (
  <AppScene stage="EXPOSE" durationInFrames={durationInFrames} prov={PROV}
    segs={[
      { clip: "expose_map", from: 2.5, dur: 14.5, rate: 0.85 },
      { clip: "expose_table", from: 0.8, dur: 10.5, rate: 0.4 },
      { clip: "expose_table", from: 0.8, dur: 10.5, rate: 0.4 },
    ]}
    zooms={[{ t: 16.5, s: 1, ox: 600, oy: 300 }, { t: 17.8, s: 1.35, ox: 600, oy: 300 }, { t: 32.0, s: 1.35, ox: 600, oy: 300 }, { t: 33.5, s: 1, ox: 960, oy: 540 }]}
    callouts={[
      { at: 6.6, dur: 6.0, x: 1210, y: 90, w: 560, label: "Real receptors · OpenStreetMap", sub: "Schools and hospitals, combined with WorldPop 2020 population cells inside the modelled corridor." },
      { at: 13.6, dur: 3.4, x: 1210, y: 90, w: 560, label: "Ranked for assessment", value: (p) => `${Math.round(X.sites_ranked * p)} sites`, sub: `${X.schools} schools and ${X.hospitals} hospitals. The map draws the first 12; the table holds all of them.` },
      { at: 17.2, dur: 8.4, x: 1130, y: 560, w: 640, label: "Estimated exposure · threshold sensitivity range", value: (p) => `${mil(X.exposed_low * p)} – ${mil(X.exposed_high * p)}`, sub: `Estimate ${n0(X.exposed_estimate)} people (WorldPop 2020, corridor bands with risk ≥ 0.30). Range from moving the threshold to 0.45 and 0.15.`, big: true },
      { at: 26.0, dur: 7.4, x: 1130, y: 620, w: 640, label: "Not a confidence interval", sub: "A sensitivity range over heuristic thresholds. It is not a statistical confidence interval, nor a count of confirmed exposures." },
    ]} />
);

export const Prioritize: React.FC<P> = ({ durationInFrames }) => (
  <AppScene stage="PRIORITIZE" durationInFrames={durationInFrames} prov={PROV}
    segs={[
      { clip: "expose_map", from: 8.0, dur: 11.5, rate: 0.7 },
      { clip: "expose_table", from: 3.0, dur: 12.5, rate: 0.6 },
      { clip: "expose_table", from: 7.0, dur: 7.5, rate: 0.5 },
    ]}
    overlay={<><RankPanel at={4.2} dur={6.8} x={1150} y={90} /><Chain at={[11.8, 13.6, 15.4, 17.2]} y={760} hideAt={19.0} /></>}
    callouts={[
      { at: 19.4, dur: 5.0, x: 1190, y: 560, w: 560, label: "Evidence behind each priority", sub: "Every row carries facility type, plume arrival ETA, modelled ΔPM2.5 and a composite risk score, all modelled and uncalibrated." },
      { at: 24.8, dur: 5.0, x: 1190, y: 600, w: 560, label: "Advisory ranking", sub: "Heuristic scores for triage. A ranking is not confirmed impact." },
    ]} />
);

export const Act: React.FC<P> = ({ durationInFrames }) => (
  <AppScene stage="ACT" durationInFrames={durationInFrames} prov={PROV}
    segs={[
      { clip: "act_page", from: 1.2, dur: 12.5, rate: 0.65 },
      { clip: "act_modal", from: 3.0, dur: 17.5, rate: 0.9 },
    ]}
    zooms={[{ t: 15.6, s: 1, ox: 960, oy: 700 }, { t: 16.8, s: 1.35, ox: 960, oy: 700 }, { t: 24.0, s: 1.35, ox: 960, oy: 700 }, { t: 25.2, s: 1, ox: 960, oy: 540 }]}
    callouts={[
      { at: 3.4, dur: 6.6, x: 1190, y: 560, w: 560, label: "Protection & response checklist", sub: "Authority and facility recommendations that require human review. The page does not send alerts or confirm real-world completion." },
      { at: 14.0, dur: 5.2, x: 1430, y: 360, w: 360, label: "Prioritised actions", value: `${m.act.facility_actions} + ${m.act.authority_actions}`, sub: "facility actions + authority recommendations" },
      { at: 19.8, dur: 7.6, x: 1430, y: 520, w: 360, label: `Plan generator: ${m.act.generator}`, value: "0 alerts sent", sub: "Advisory only. AERIS dispatches nothing." },
    ]} />
);
