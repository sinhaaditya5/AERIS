// Single source of truth: colors, easings, springs, fonts, naming.
import { Easing } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadSans } from "@remotion/google-fonts/Inter";

const serif = loadSerif();
const sans = loadSans("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

export const FPS = 30;
export const W = 1920;
export const H = 1080;

export const theme = {
  colors: {
    bg: "#F4F2EF", bgAlt: "#E9E6E2", card: "#FFFFFF",
    ink: "#26262B", grey: "#6E6E76", greyLight: "#B9B7B4", line: "#D8D5D1",
    hero: "#7A1F2B", heroSoft: "#7A1F2B1F", glow: "rgba(122,31,43,0.35)",
  },
  fonts: { display: serif.fontFamily, body: sans.fontFamily },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    bouncy: { damping: 11, stiffness: 170, mass: 0.7 },
  },
} as const;

export const NAME = {
  short: "AERIS",
  full: "AI Environmental Risk & Intervention System",
  tagline: "From Pollution Source to Protective Action.",
};

/** Scene layout in seconds, cut on the pauses of the supplied voiceover (223.48 s) + a 3.5 s end-card tail. */
export const SCENES = {
  problem: { from: 0, dur: 16.9 },
  intro: { from: 16.9, dur: 27.8 },
  source: { from: 44.7, dur: 25.9 },
  move: { from: 70.6, dur: 27 },
  expose: { from: 97.6, dur: 33.9 },
  prioritize: { from: 131.5, dur: 29.9 },
  act: { from: 161.4, dur: 27.8 },
  tech: { from: 189.2, dur: 18.3 },
  close: { from: 207.5, dur: 20 },
} as const;
export const VO_SECONDS = 223.48;
export const TOTAL_SECONDS = 227.5;
