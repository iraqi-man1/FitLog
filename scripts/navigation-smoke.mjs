import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = [], failed = []
page.on('pageerror', error => errors.push(error.stack ?? error.message))
page.on('requestfailed', request => failed.push(`${request.url()}: ${request.failure()?.errorText}`))
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
for (const name of ['Progress Photos', 'Settings']) {
  await page.getByRole('button', { name, exact: true }).first().click()
  assert.equal(new URL(page.url()).hash, name === 'Progress Photos' ? '#photos' : '#settings')
  await page.getByRole('heading', { name, exact: true }).first().waitFor()
}
await page.getByRole('button', { name: 'العربية' }).click()
await page.locator('nav button').filter({ hasText: 'صور التقدم' }).click()
await page.getByRole('heading', { name: 'صور التقدم' }).first().waitFor()
await page.setViewportSize({ width: 390, height: 844 })
await page.getByRole('button', { name: 'Open navigation' }).click()
await page.locator('aside nav button').filter({ hasText: 'الإعدادات' }).last().click()
await page.getByRole('heading', { name: 'الإعدادات' }).first().waitFor()
assert.equal(await page.locator('html').getAttribute('dir'), 'rtl')
assert.deepEqual(errors, [])
assert.deepEqual(failed, [])
console.log('Desktop and mobile navigation to Photos and Settings passed in English and Arabic.')
await browser.close()
