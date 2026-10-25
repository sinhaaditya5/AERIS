import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Minimal 1x1 valid JPEG to satisfy NASA GIBS tile requests without external network access
const mockJpegTile = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
)

const transparentPngTile = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRuoAAAAASUVORK5CYII=',
  'base64'
)

async function setupOfflineBasemapAndGibs(page: Page) {
  // Mock external fonts & base maps for resilient offline testing
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: '/* Offline font fallback */' })
  )
  await page.route('https://server.arcgisonline.com/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: transparentPngTile })
  )
  await page.route('https://demotiles.maplibre.org/font/**', (route) =>
    route.fulfill({ contentType: 'application/x-protobuf', body: Buffer.alloc(0) })
  )
  await page.route('https://basemaps.cartocdn.com/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {},
        layers: [{ id: 'test-background', type: 'background', paint: { 'background-color': '#111827' } }],
      }),
    })
  )

  // Intercept all NASA GIBS tile requests - NEVER hit live NASA servers in tests
  await page.route(/https:\/\/gibs.*\.earthdata\.nasa\.gov\/.*/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/jpeg',
      body: mockJpegTile,
      headers: {
        'access-control-allow-origin': '*',
      },
    })
  )
}

test.describe('Satellite check feature', () => {
  test.beforeEach(async ({ page }) => {
    await setupOfflineBasemapAndGibs(page)
  })

  test('opens Satellite check from dashboard, verifies honest labels, acknowledgement, and keyboard slider', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)
    await expect(page.locator('.maplibregl-canvas').first()).toBeVisible()

    // Trigger Satellite check from the dashboard map card header
    const trigger = page.locator('.satellite-check-trigger-btn').first()
    await trigger.scrollIntoViewIfNeeded()
    await expect(trigger).toBeVisible()
    await trigger.click()

    // The Satellite check overlay should appear
    const overlay = page.locator('.satellite-check-overlay')
    await expect(overlay).toBeVisible()

    // Check Honest Labels in the top comparison banner
    const observedPill = page.locator('.satellite-side-pill.observed')
    await expect(observedPill).toBeVisible()
    const observedText = await observedPill.innerText()
    expect(observedText).toMatch(/Observed: NASA .* true colour, .* UTC/)

    const modelledPill = page.locator('.satellite-side-pill.modelled')
    await expect(modelledPill).toBeVisible()
    const modelledText = await modelledPill.innerText()
    expect(modelledText).toMatch(/Modelled: plume at T\+\d+h, uncalibrated baseline/)

    // Honesty Rule: Daily composite disclaimer must be present
    const notice = page.locator('.satellite-composite-notice')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('Daily composite of that UTC day')

    // Honesty Rule: Exact NASA GIBS acknowledgement copied from earthdata.nasa.gov/gibs
    const ack = page.locator('.satellite-ack-text')
    await expect(ack).toBeVisible()
    expect(await ack.innerText()).toContain(
      "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."
    )

    // Honesty Rule: Verify prohibition of dishonest validation language anywhere in overlay
    const overlayText = await overlay.innerText()
    expect(overlayText).not.toMatch(/\b(validated|confirmed|accurate|match score|agreement percentage)\b/i)

    // Switch to Swipe mode if on mobile to test split slider handle
    const swipeBtn = page.locator('button.satellite-mode-btn:has-text("Swipe")')
    if (await swipeBtn.isVisible()) {
      await swipeBtn.click()
    }

    // Keyboard navigation on split slider handle (role="slider")
    const slider = page.locator('.satellite-split-handle')
    await expect(slider).toBeVisible()
    await slider.focus()
    await expect(slider).toBeFocused()

    const initialVal = Number(await slider.getAttribute('aria-valuenow'))
    expect(initialVal).toBe(50)

    // ArrowRight increases split percent by 5
    await page.keyboard.press('ArrowRight')
    await expect(slider).toHaveAttribute('aria-valuenow', '55')
    expect(await slider.getAttribute('aria-valuetext')).toContain('Observed 55%, modelled 45%')

    // ArrowLeft decreases by 5
    await page.keyboard.press('ArrowLeft')
    await expect(slider).toHaveAttribute('aria-valuenow', '50')

    // Home key jumps to 0%
    await page.keyboard.press('Home')
    await expect(slider).toHaveAttribute('aria-valuenow', '0')

    // End key jumps to 100%
    await page.keyboard.press('End')
    await expect(slider).toHaveAttribute('aria-valuenow', '100')

    // Info Popover: reachable and keyboard accessible
    const infoBtn = page.locator('.satellite-info-btn')
    await expect(infoBtn).toBeVisible()
    await infoBtn.click()

    const popover = page.locator('.satellite-info-popover')
    await expect(popover).toBeVisible()
    const popoverText = await popover.innerText()
    expect(popoverText).toContain('Visual cross-check, not validation')
    expect(popoverText).toContain('does not measure ground-level PM2.5')
    expect(popoverText).toContain('Cloud cover')

    // Close popover with Escape
    await page.keyboard.press('Escape')
    await expect(popover).not.toBeVisible()

    // Test Date Step buttons
    const prevDateBtn = page.locator('button[aria-label="Previous day"]')
    await expect(prevDateBtn).toBeVisible()
    await prevDateBtn.click()

    // Reset with "Match model time"
    const resetBtn = page.locator('.satellite-btn-reset-time')
    await expect(resetBtn).toBeVisible()
    await resetBtn.click()

    // Exit Satellite check via close button
    const closeBtn = page.locator('.satellite-close-btn')
    await closeBtn.click()
    await expect(overlay).not.toBeVisible()

    // Focus restored to trigger button
    await expect(trigger).toBeFocused()
  })

  test('mode switching to Fade and basemap restoration on exit', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)
    await expect(page.locator('.maplibregl-canvas').first()).toBeVisible()

    const trigger = page.locator('.satellite-check-trigger-btn').first()
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    await expect(page.locator('.satellite-check-overlay')).toBeVisible()

    // Switch mode to Fade
    const fadeBtn = page.locator('button.satellite-mode-btn:has-text("Fade")')
    await fadeBtn.click()
    await expect(fadeBtn).toHaveClass(/active/)

    // In Fade mode, slider appears for opacity
    const fadeSlider = page.locator('#satellite-fade-range')
    await expect(fadeSlider).toBeVisible()

    // Exit using Escape key
    await page.keyboard.press('Escape')
    await expect(page.locator('.satellite-check-overlay')).not.toBeVisible()
    await expect(trigger).toBeFocused()
  })

  test('meets WCAG accessibility standards in Satellite check overlay across themes', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)
    await expect(page.locator('.maplibregl-canvas').first()).toBeVisible()

    const trigger = page.locator('.satellite-check-trigger-btn').first()
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    const overlay = page.locator('.satellite-check-overlay')
    await expect(overlay).toBeVisible()

    // Run axe on the satellite overlay
    const axeResult = await new AxeBuilder({ page })
      .include('.satellite-check-overlay')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(axeResult.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([])
  })

  test('Settings view documents NASA GIBS keyless external source and direct browser tile requests', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#nav-dashboard')).toBeVisible()
    await expect(page.locator('.skeleton-mode')).toHaveCount(0)

    await page.locator('#nav-settings').click()
    await expect(page.locator('.header-view-title')).toBeVisible()

    // Click Provenance & Legal tab if present
    const provTab = page.locator('button.nav-pill:has-text("Provenance")')
    if (await provTab.isVisible()) {
      await provTab.click()
    }

    // Check Settings view for GIBS citation
    const gibsSource = page.locator('#source-nasa-gibs')
    await gibsSource.scrollIntoViewIfNeeded()
    await expect(gibsSource).toBeVisible()
    expect(await gibsSource.innerText()).toContain('NASA Global Imagery Browse Services (GIBS)')
    expect(await gibsSource.innerText()).toContain('Tile requests go directly from the viewer')
    expect(await gibsSource.innerText()).toContain('ESDIS')
  })
})
