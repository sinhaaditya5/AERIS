import { test, expect } from '@playwright/test'
import * as path from 'node:path'
import * as fs from 'node:fs'

const brainArtifactDir = '/Users/sabasaeed/.gemini/antigravity/brain/daf50f32-d355-481c-b2bf-1cfcebb531a7'
const repoAfterDir = path.resolve('..', 'artifacts', 'after')

fs.mkdirSync(brainArtifactDir, { recursive: true })
fs.mkdirSync(repoAfterDir, { recursive: true })

function saveScreenshot(sourcePath: string, filename: string) {
  const destPath = path.join(brainArtifactDir, filename)
  try {
    fs.copyFileSync(sourcePath, destPath)
  } catch (err) {
    console.error('Error copying to brain artifact dir:', err)
  }
}

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '390x844', width: 390, height: 844 },
]

test.describe('Capture Polish Dashboard After-Screenshots', () => {
  for (const vp of VIEWPORTS) {
    test(`capture dashboard after at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')
      await expect(page.locator('#nav-dashboard')).toBeVisible()
      await expect(page.locator('.skeleton-mode')).toHaveCount(0)
      // wait for map and styles to stabilize
      await page.waitForTimeout(2000)

      const filename = `dashboard_after_${vp.name}.png`
      const outPath = path.join(repoAfterDir, filename)
      await page.screenshot({ path: outPath, fullPage: false })
      saveScreenshot(outPath, filename)

      // Also capture full-page to inspect below-the-fold cards
      const fullFilename = `dashboard_after_${vp.name}_full.png`
      const fullOutPath = path.join(repoAfterDir, fullFilename)
      await page.screenshot({ path: fullOutPath, fullPage: true })
      saveScreenshot(fullOutPath, fullFilename)
    })
  }
})

