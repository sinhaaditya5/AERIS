import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { FPS, SCENES, TOTAL_SECONDS } from "./theme";
import { Problem } from "./scenes/Problem";
import { Intro, Source, Move, Expose, Prioritize, Act } from "./scenes/AppScenes";
import { Tech } from "./scenes/Tech";
import { Close } from "./scenes/Close";
import { Subtitles } from "./components/Overlays";

const fr = (s: number) => Math.round(s * FPS);
export const TOTAL = fr(TOTAL_SECONDS);

const SC: [keyof typeof SCENES, React.FC<{ durationInFrames: number }>][] = [
  ["problem", Problem], ["intro", Intro], ["source", Source], ["move", Move], ["expose", Expose], ["prioritize", Prioritize], ["act", Act], ["tech", Tech], ["close", Close],
];

export const AerisDemo: React.FC = () => (
  <AbsoluteFill style={{ background: "#F4F2EF" }}>
    {SC.map(([k, C]) => <Sequence key={k} from={fr(SCENES[k].from)} durationInFrames={fr(SCENES[k].dur)}><C durationInFrames={fr(SCENES[k].dur)} /></Sequence>)}
    <Subtitles />

    {/* Master timeline: the supplied voiceover, unmodified, from frame 0. */}
    <Audio src={staticFile("audio/voiceover.wav")} volume={1} />
    <Audio src={staticFile("audio/music_ducked.wav")} volume={1} />
    {/* Quiet SFX: a soft whoosh at each scene change, ticks on the two headline numbers, one chime on the end card. */}
    {Object.values(SCENES).slice(1).map((s) => <Sequence key={s.from} from={fr(s.from) - 4}><Audio src={staticFile("audio/sfx/whoosh.wav")} volume={0.18} /></Sequence>)}
    <Sequence from={fr(SCENES.expose.from + 13.6)}><Audio src={staticFile("audio/sfx/tick.wav")} volume={0.3} /></Sequence>
    <Sequence from={fr(SCENES.expose.from + 17.2)}><Audio src={staticFile("audio/sfx/tick.wav")} volume={0.3} /></Sequence>
    <Sequence from={fr(SCENES.close.from + 11.7)}><Audio src={staticFile("audio/sfx/chime.wav")} volume={0.3} /></Sequence>
  </AbsoluteFill>
);
