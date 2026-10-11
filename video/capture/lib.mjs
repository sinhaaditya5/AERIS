// Capture harness: drives the real AERIS dashboard in Chrome and records
// 1920x1080 clips via Playwright's screencast (JPEG frames -> constant 30 fps H.264).
import { createRequire } from 'module'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { execFileSync } from 'child_process'
import path from 'path'

const require = createRequire('/Volumes/Aditya ssd/AERIS/web/package.json')
export const { chromium } = require('playwright')

export const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export const BASE = process.env.AERIS_URL || 'http://127.0.0.1:5173/'
export const RAW = path.resolve(import.meta.dirname, '../raw')
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const CURSOR_JS = `
(() => {
  if (window.__cursorInstalled) return; window.__cursorInstalled = true
  const mk = () => {
    const c = document.createElement('div'); c.id = '__cur'
    c.style.cssText = 'position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));transition:none'
    c.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.6 15 L11.6 21.4 L14.4 20.1 L11.4 13.8 L17.5 13.8 Z" fill="#fff" stroke="#1f1f23" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    const r = document.createElement('div'); r.id = '__rip'
    r.style.cssText = 'position:fixed;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #7a1f2b;z-index:2147483646;pointer-events:none;opacity:0;transform:scale(.3)'
    document.documentElement.append(r, c)
    addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)' }, true)
    addEventListener('mousedown', (e) => {
      r.style.transition = 'none'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; r.style.opacity = '.9'; r.style.transform = 'scale(.3)'
      requestAnimationFrame(() => requestAnimationFrame(() => { r.style.transition = 'all .45s ease-out'; r.style.opacity = '0'; r.style.transform = 'scale(1.2)' }))
    }, true)
  }
  if (document.documentElement) mk(); else addEventListener('DOMContentLoaded', mk)
})()`

export async function open() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: (process.env.SOFTGL ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--ignore-gpu-blocklist']).concat(['--hide-scrollbars']),
  })
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  await ctx.addInitScript(CURSOR_JS)
  const page = await ctx.newPage()
  page.setDefaultTimeout(8000)
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 160)))
  await page.goto(BASE)
  await page.getByText('Dashboard').first().waitFor()
  await sleep(2500)
  const cur = { x: 960, y: 600 }
  const api = {
    browser, page, cur,
    async move(x, y, ms = 700) {
      const n = Math.max(2, Math.round(ms / 16)), x0 = cur.x, y0 = cur.y
      for (let i = 1; i <= n; i++) {
        const t = ease(i / n)
        await page.mouse.move(x0 + (x - x0) * t, y0 + (y - y0) * t)
        await sleep(ms / n)
      }
      cur.x = x; cur.y = y
    },
    async center(loc) { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } },
    async clickOn(loc, ms = 700, hold = 350) {
      await loc.scrollIntoViewIfNeeded()
      const { x, y } = await api.center(loc)
      await api.move(x, y, ms); await sleep(120)
      await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(hold)
    },
    async hoverOn(loc, ms = 700, hold = 600) { const { x, y } = await api.center(loc); await api.move(x, y, ms); await sleep(hold) },
    async scrollBy(px, ms = 1400) {
      const n = Math.round(ms / 16); let done = 0
      for (let i = 1; i <= n; i++) { const target = px * ease(i / n); await page.mouse.wheel(0, target - done); done = target; await sleep(16) }
    },
    async dragMap(dx, dy, ms = 1200) {
      const x0 = cur.x, y0 = cur.y
      await page.mouse.down()
      const n = Math.round(ms / 16)
      for (let i = 1; i <= n; i++) { const t = ease(i / n); await page.mouse.move(x0 + dx * t, y0 + dy * t); await sleep(16) }
      await page.mouse.up(); cur.x = x0 + dx; cur.y = y0 + dy
    },
    async nav(name) { await api.clickOn(page.getByRole('button', { name }).first(), 600, 300) },
  }
  return api
}

/** Record whatever `fn` does into raw/<name>.mp4 (1920x1080, 30 fps, high quality). */
export async function record(api, name, fn) {
  const dir = path.join(RAW, `_frames_${name}`)
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true })
  const frames = []
  let n = 0
  const pending = []
  await api.page.screencast.start({
    size: { width: 1920, height: 1080 }, quality: 92, fps: 30,
    onFrame: ({ data, timestamp }) => { const f = path.join(dir, String(n++).padStart(6, '0') + '.jpg'); frames.push({ f, t: timestamp }); writeFileSync(f, data) },
  })
  await sleep(150)
  await api.page.mouse.move(api.cur.x + 3, api.cur.y + 3); await sleep(100); await api.page.mouse.move(api.cur.x, api.cur.y)
  await sleep(150)
  const w0 = Date.now()
  await fn(api)
  console.log('wall', (Date.now()-w0)/1000)
  await api.page.mouse.move(api.cur.x + 2, api.cur.y + 2); await sleep(120)
  const stopAt = Date.now()
  await api.page.screencast.stop()
  if (frames.length < 2) throw new Error('no frames captured')
  const lines = ["ffconcat version 1.0"]
  for (let i = 0; i < frames.length; i++) {
    const dur = i < frames.length - 1 ? Math.max(0.001, (frames[i + 1].t - frames[i].t) / 1000) : Math.max(0.1, (stopAt - frames[i].t) / 1000)
    lines.push(`file '${frames[i].f}'`, `duration ${dur.toFixed(4)}`)
  }
  lines.push(`file '${frames[frames.length - 1].f}'`)
  const list = path.join(dir, 'list.txt'); writeFileSync(list, lines.join('\n'))
  const out = path.join(RAW, `${name}.mp4`)
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-movflags', '+faststart', out])
  rmSync(dir, { recursive: true, force: true })
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString().trim()
  console.log(`recorded ${name}: ${frames.length} frames, ${Number(dur).toFixed(1)}s -> ${out}`)
}
