// Records the scripted tour of the real dashboard, one clip per storyboard scene.
// Usage: node scenes.mjs [clipName ...]   (no args = all clips)
import { open, record, sleep } from './lib.mjs'

const view = (name, settle = 7000) => async (a) => { await a.nav(name); await sleep(settle) }
const clips = {
  // SOURCE ---------------------------------------------------------------
  prep_source_map: view('Map Explorer'),
  async source_map(a) {
    const p = a.page
    await sleep(2500)                                          // full airshed: fire clusters, plume bands, AQI stations
    await a.clickOn(p.locator('.maplibregl-marker[title*="104 fires"]').first(), 1100, 300)
    await sleep(3800)                                          // Source Cluster inspector: FRP, detections, heuristic confidence
    await a.clickOn(p.getByLabel('Close inspector'), 700, 400)
    const st = p.locator('.maplibregl-marker[title*="NPPMCL-BALLOKI"]').first()
    await a.clickOn(st, 1200, 300); await sleep(3800)          // AQI station inspector (observed value + timestamp)
    await a.clickOn(p.getByLabel('Close inspector'), 700, 600)
  },
  prep_source_table: view('Fire Sources', 2500),
  async source_table(a) {
    const p = a.page
    await sleep(1800)
    await a.hoverOn(p.getByText('src_004').first(), 900, 1200)
    await a.scrollBy(380, 1600); await sleep(1800)
  },
  // MOVE -----------------------------------------------------------------
  prep_move_map: view('Map Explorer'),
  async move_map(a) {
    const p = a.page
    await sleep(1200)
    await a.clickOn(p.locator('.map-floating-hud').getByText('Corridor').first(), 900, 3200)
    for (const h of ['Start', '+4h', '+8h', '+24h']) {
      await a.clickOn(p.locator('.map-floating-hud').getByRole('button', { name: h, exact: true }), 800, 1900)
    }
    await sleep(800)
  },
  prep_move_wind: view('Wind & Weather', 3500),
  prep_move_dash: view('Dashboard', 6500),
  async move_dash(a) {
    const p = a.page
    await sleep(1200)
    await a.clickOn(p.getByRole('button', { name: '+4h', exact: true }).first(), 800, 2200)
    await a.clickOn(p.getByRole('button', { name: '+8h', exact: true }).first(), 700, 2200)
    await a.hoverOn(p.getByText('Wind from SW').first(), 900, 2800)
  },
  async move_wind(a) {
    await sleep(2000)
    await a.scrollBy(420, 1800); await sleep(2800)
  },
  // EXPOSE ---------------------------------------------------------------
  prep_expose_map: view('Map Explorer'),
  async expose_map(a) {
    const p = a.page
    await sleep(800)
    await a.clickOn(p.getByPlaceholder(/Place, facility/), 800, 200)
    await p.keyboard.type('Akash', { delay: 90 }); await sleep(500); await p.keyboard.press('Enter')
    await sleep(5200)                                          // fly to Akash Hospital, Ballabgarh inside the 0-2 h band
    await a.move(1000, 560, 900)
    for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 260); await sleep(450) }   // pull back to see the corridor over NCR
    await sleep(3500)
  },
  prep_expose_table: view('Population Risk', 3000),
  async expose_table(a) {
    const p = a.page
    await sleep(1800)
    await a.hoverOn(p.getByText('Threshold sensitivity range').first(), 900, 1800)
    await a.scrollBy(560, 1800); await sleep(2400)
  },
  // ACT ------------------------------------------------------------------
  prep_act_modal: view('Dashboard', 6500),
  async act_modal(a) {
    const p = a.page
    await sleep(1500)
    await a.clickOn(p.getByText('View All Recommendations'), 1000, 1800)
    await sleep(3200)
    await a.scrollBy(300, 1400); await sleep(2200)
    await a.clickOn(p.getByRole('tab', { name: /Authority/ }).or(p.getByText(/Authority Recommendations/)).first(), 800, 3800)
  },
  prep_act_page: view('Protective Actions', 3000),
  async act_page(a) {
    await sleep(2000)
    await a.scrollBy(520, 2000); await sleep(3000)
  },
  // CLOSE ----------------------------------------------------------------
  prep_close_dash: view('Dashboard', 6500),
  async close_dash(a) {
    await sleep(6000)
  },
}

const want = process.argv.slice(2)
const a = await open()
for (const [name, fn] of Object.entries(clips)) {
  if (name.startsWith('prep_') || (want.length && !want.includes(name))) continue
  await a.page.goto(process.env.AERIS_URL || 'http://127.0.0.1:5173/'); await sleep(2500)
  await clips['prep_' + name](a)
  await record(a, name, fn)
}
await a.browser.close()
