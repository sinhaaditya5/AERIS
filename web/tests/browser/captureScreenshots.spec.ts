import { test, expect } from '@playwright/test'
import * as path from 'node:path'
import * as fs from 'node:fs'

const brainArtifactDir = '/Users/sabasaeed/.gemini/antigravity-ide/brain/9726d72e-8dd3-4a5f-973b-c172f54f83b8'

function saveScreenshot(sourcePath: string, filename: string) {
  const destPath = path.join(brainArtifactDir, filename)
  try {
    fs.copyFileSync(sourcePath, destPath)
  } catch {
    // optional
  }
}

test.describe('Capture Satellite Check Screenshots in Dashboard and Map Explorer', () => {
  // 1. Dashboard Desktop Dark
  test('capture Dashboard 1280x720 desktop dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)
    await page.evaluate(() => {
      const settings = {
        theme: 'night-watch',
        accent: 'forest',
        textSize: 'default',
        density: 'comfortable',
        reduceMotion: false,
        colorBlindSafe: false,
        matchBasemap: true,
      }
      localStorage.setItem('aeris_theme_settings_v1', JSON.stringify(settings))
      document.documentElement.setAttribute('data-theme', 'night-watch')
    })
    const trigger = page.locator('.satellite-check-trigger-btn').first()
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    await expect(page.locator('.satellite-check-overlay')).toBeVisible()
    await page.waitForTimeout(3000)
    const outputPath = path.resolve('..', 'artifacts', 'satellite_check_desktop_dark.png')
    await page.screenshot({ path: outputPath, fullPage: false })
    saveScreenshot(outputPath, 'satellite_check_desktop_dark.png')
  })

  // 2. Dashboard Desktop Light
  test('capture Dashboard 1280x720 desktop light theme', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)
    await page.evaluate(() => {
      const settings = {
        theme: 'field-daylight',
        accent: 'forest',
        textSize: 'default',
        density: 'comfortable',
        reduceMotion: false,
        colorBlindSafe: false,
        matchBasemap: true,
      }
      localStorage.setItem('aeris_theme_settings_v1', JSON.stringify(settings))
      document.documentElement.setAttribute('data-theme', 'field-daylight')
    })
    const trigger = page.locator('.satellite-check-trigger-btn').first()
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    await expect(page.locator('.satellite-check-overlay')).toBeVisible()
    await page.waitForTimeout(3000)
    const outputPath = path.resolve('..', 'artifacts', 'satellite_check_desktop_light.png')
    await page.screenshot({ path: outputPath, fullPage: false })
    saveScreenshot(outputPath, 'satellite_check_desktop_light.png')
  })

  // 3. Dashboard Mobile Dark
  test('capture Dashboard 390px mobile dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)
    await page.evaluate(() => {
      const settings = {
        theme: 'night-watch',
        accent: 'forest',
        textSize: 'default',
        density: 'comfortable',
        reduceMotion: false,
        colorBlindSafe: false,
        matchBasemap: true,
      }
      localStorage.setItem('aeris_theme_settings_v1', JSON.stringify(settings))
      document.documentElement.setAttribute('data-theme', 'night-watch')
    })
    const trigger = page.locator('.satellite-check-trigger-btn').first()
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    await expect(page.locator('.satellite-check-overlay')).toBeVisible()
    await page.waitForTimeout(3000)
    const outputPath = path.resolve('..', 'artifacts', 'satellite_check_mobile_dark.png')
    await page.screenshot({ path: outputPath, fullPage: false })
    saveScreenshot(outputPath, 'satellite_check_mobile_dark.png')
  })

  // 4. Dashboard Mobile Light
  test('capture Dashboard 390px mobile light theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)
    await page.evaluate(() => {
      const settings = {
        theme: 'field-daylight',
        accent: 'forest',
        textSize: 'default',
        density: 'comfortable',
        reduceMotion: false,
        colorBlindSafe: false,
        matchBasemap: true,
      }
      localStorage.setItem('aeris_theme_settings_v1', JSON.stringify(settings))
      document.documentElement.setAttribute('data-theme', 'field-daylight')
    })
    const trigger = page.locator('.satellite-check-trigger-btn').first()
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    await expect(page.locator('.satellite-check-overlay')).toBeVisible()
    await page.waitForTimeout(3000)
    const outputPath = path.resolve('..', 'artifacts', 'satellite_check_mobile_light.png')
    await page.screenshot({ path: outputPath, fullPage: false })
    saveScreenshot(outputPath, 'satellite_check_mobile_light.png')
  })

  // 5. Map Explorer Desktop Dark
  test('capture Map Explorer 1280x720 desktop dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)
    await page.evaluate(() => {
      const settings = {
        theme: 'night-watch',
        accent: 'forest',
        textSize: 'default',
        density: 'comfortable',
        reduceMotion: false,
        colorBlindSafe: false,
        matchBasemap: true,
      }
      localStorage.setItem('aeris_theme_settings_v1', JSON.stringify(settings))
      document.documentElement.setAttribute('data-theme', 'night-watch')
    })
    await page.locator('#nav-map').click()
    await expect(page.locator('.maplibregl-canvas').first()).toBeVisible()
    const trigger = page.locator('.satellite-check-trigger-btn').first()
    await trigger.click()
    await expect(page.locator('.satellite-check-overlay')).toBeVisible()
    await page.waitForTimeout(3000)
    const outputPath = path.resolve('..', 'artifacts', 'satellite_check_explorer_desktop_dark.png')
    await page.screenshot({ path: outputPath, fullPage: false })
    saveScreenshot(outputPath, 'satellite_check_explorer_desktop_dark.png')
  })

  // 6. Map Explorer Mobile Dark
  test('capture Map Explorer 390px mobile dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)
    await page.evaluate(() => {
      const settings = {
        theme: 'night-watch',
        accent: 'forest',
        textSize: 'default',
        density: 'comfortable',
        reduceMotion: false,
        colorBlindSafe: false,
        matchBasemap: true,
      }
      localStorage.setItem('aeris_theme_settings_v1', JSON.stringify(settings))
      document.documentElement.setAttribute('data-theme', 'night-watch')
    })
    await page.locator('#nav-map').click()
    await expect(page.locator('.maplibregl-canvas').first()).toBeVisible()
    const trigger = page.locator('.satellite-check-trigger-btn').first()
    await trigger.click()
    await expect(page.locator('.satellite-check-overlay')).toBeVisible()
    await page.waitForTimeout(3000)
    const outputPath = path.resolve('..', 'artifacts', 'satellite_check_explorer_mobile_dark.png')
    await page.screenshot({ path: outputPath, fullPage: false })
    saveScreenshot(outputPath, 'satellite_check_explorer_mobile_dark.png')
  })
})
