import m from "./metrics.json";
export const n0 = (v: number) => Math.round(v).toLocaleString("en-US");
export const mil = (v: number) => (v / 1e6).toFixed(1) + "M";
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const day = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const dm = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
const gens = Object.entries(m.snapshot).filter(([k]) => k.endsWith("generated_at")).map(([, v]) => v as string).sort();
/** e.g. "7–9 Oct 2026": span of the snapshot files' generated_at stamps */
export const snapSpan = `${new Date(gens[0]).getUTCDate()}–${day(gens[gens.length - 1])}`;
export const PROV = `Real pipeline snapshots · ${snapSpan} · not a live feed`;
export { m };
