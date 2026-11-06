import { test, expect } from '@playwright/test'

test('measure baseline performance, CLS and FPS', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/')
  await expect(page.locator('#nav-dashboard')).toBeVisible()
  await expect(page.locator('.skeleton-mode')).toHaveCount(0)

  // Measure Cumulative Layout Shift
  const cls = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let clsValue = 0
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
      })
      observer.observe({ type: 'layout-shift', buffered: true })
      setTimeout(() => {
        observer.disconnect()
        resolve(clsValue)
      }, 1500)
    })
  })

  // Measure map interaction FPS
  const fps = await page.evaluate(async () => {
    const canvas = document.querySelector('.maplibregl-canvas')
    if (!canvas) return null
    let frameCount = 0
    let running = true
    const start = performance.now()
    function loop() {
      frameCount++
      if (running) requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)

    // Simulate panning / dragging on canvas
    const box = canvas.getBoundingClientRect()
    const dispatch = (type: string, x: number, y: number) => {
      canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }))
    }
    dispatch('mousedown', box.left + box.width / 2, box.top + box.height / 2)
    for (let i = 0; i < 30; i++) {
      dispatch('mousemove', box.left + box.width / 2 + (i * 2), box.top + box.height / 2 + (i * 2))
      await new Promise(r => setTimeout(r, 16))
    }
    dispatch('mouseup', box.left + box.width / 2 + 60, box.top + box.height / 2 + 60)

    running = false
    const duration = (performance.now() - start) / 1000
    return Math.round(frameCount / duration)
  })

  console.log(`BASELINE_PERF: CLS=${cls.toFixed(4)}, MapFPS=${fps}`)
})

