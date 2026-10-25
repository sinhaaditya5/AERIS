import { test, expect } from '@playwright/test'
import * as path from 'node:path'

test.describe('Capture Satellite Check Screenshots in Map Explorer', () => {
  test('capture Map Explorer 1280x720 desktop dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)

    // Navigate to Map Explorer
    await page.locator('#nav-map').click()
    await expect(page.locator('.maplibregl-canvas').first()).toBeVisible()

    // Ensure dark/forest theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'forest')
      localStorage.setItem('aeris_theme', 'forest')
    })

    const trigger = page.locator('.satellite-check-trigger-btn').first()
    await trigger.click()
    await expect(page.locator('.satellite-check-overlay')).toBeVisible()

    await page.waitForTimeout(2000)

    const outputPath = path.resolve('..', 'artifacts', 'satellite_check_explorer_desktop_dark.png')
    await page.screenshot({ path: outputPath, fullPage: false })
  })

  test('capture Map Explorer 390px mobile dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)

    await page.locator('#nav-map').click()
    await expect(page.locator('.maplibregl-canvas').first()).toBeVisible()

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'forest')
      localStorage.setItem('aeris_theme', 'forest')
    })

    const trigger = page.locator('.satellite-check-trigger-btn').first()
    await trigger.click()
    await expect(page.locator('.satellite-check-overlay')).toBeVisible()

    await page.waitForTimeout(2000)

    const outputPath = path.resolve('..', 'artifacts', 'satellite_check_explorer_mobile_dark.png')
    await page.screenshot({ path: outputPath, fullPage: false })
  })
})
