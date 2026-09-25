import { chromium } from 'playwright'
import JSZip from 'jszip'
import { readFile } from 'node:fs/promises'

const base = process.env.FITLOG_URL ?? 'http://127.0.0.1:4173/'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const errors = [], remoteRequests = []
page.on('pageerror', e => errors.push(e.message))
page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) remoteRequests.push(r.url()) })
await page.goto(base, { waitUntil: 'networkidle' })

await page.getByRole('button', { name: 'Workouts', exact: true }).first().click()
await page.getByRole('button', { name: 'New workout' }).first().click()
await page.getByRole('dialog').getByLabel('Duration · min').fill('45')
await page.getByRole('dialog').getByLabel('Quality · 1–5').fill('4')
await page.getByRole('dialog').getByPlaceholder('Exercise name').fill('Squat')
await page.getByRole('dialog').getByRole('button', { name: '', exact: true }).count()
await page.getByRole('dialog').locator('button').filter({ has: page.locator('svg.lucide-plus') }).last().click()
await page.getByRole('dialog').getByLabel('Weight lifted').fill('70')
await page.getByRole('dialog').getByRole('button', { name: 'Save workout' }).click()
await page.reload({ waitUntil: 'networkidle' })
if (!(await page.getByText('Squat').count())) { await page.getByText('Push').first().click(); if (!(await page.getByText('Squat').count())) throw new Error('Workout exercise did not persist') }

await page.getByRole('button', { name: 'Measurements', exact: true }).first().click()
await page.getByRole('button', { name: 'New measurement' }).first().click()
await page.getByRole('dialog').getByLabel('Waist · cm').fill('82.5')
await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
if (!(await page.getByText('82.5 cm').count())) throw new Error('Measurement did not save')

await page.getByRole('button', { name: 'Progress Photos', exact: true }).first().click()
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/eZkAAAAASUVORK5CYII=', 'base64')
for (let i = 0; i < 2; i++) {
  await page.getByRole('button', { name: 'Upload photo' }).first().click()
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: `test-${i}.png`, mimeType: 'image/png', buffer: png })
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
}
await page.locator('button:has(img[alt*="progress on"])').nth(0).click()
await page.locator('div.border-line > button:has(img[alt*="progress on"])').first().click()
await page.getByRole('button', { name: 'Slider' }).click()
await page.locator('img[alt="Before"]').waitFor({ state: 'attached', timeout: 5000 })
await page.getByRole('button', { name: 'Log Today' }).first().click()
await page.getByRole('dialog').getByText('Also recorded this day').waitFor()
await page.getByRole('dialog').getByText('Squat').waitFor()
await page.getByRole('dialog').locator('img').first().waitFor()
await page.keyboard.press('Escape')

await page.getByRole('button', { name: 'Settings', exact: true }).first().click()
const downloadPromise = page.waitForEvent('download')
await page.getByRole('button', { name: 'Export Backup' }).click()
const download = await downloadPromise
const backupPath = await download.path()
if (!backupPath) throw new Error('Backup did not download')
const invalidZip = await JSZip.loadAsync(await readFile(backupPath))
const invalidData = JSON.parse(await invalidZip.file('data.json').async('text'))
invalidData.days.push(invalidData.days[0])
invalidZip.file('data.json', JSON.stringify(invalidData))
await page.locator('input[type=file]').setInputFiles({ name: 'invalid.fitlog.zip', mimeType: 'application/zip', buffer: await invalidZip.generateAsync({ type: 'nodebuffer' }) })
await page.getByText('Backup data is invalid.').waitFor({ state: 'visible', timeout: 5000 })
await page.locator('input[type=file]').setInputFiles(backupPath)
await page.getByRole('dialog').getByRole('button', { name: 'Replace local data' }).click()
await page.getByRole('button', { name: 'Light' }).click()
await page.getByRole('button', { name: 'العربية' }).click()
await page.screenshot({ path: 'arabic-light-smoke.png', fullPage: true })
if (await page.locator('html').getAttribute('dir') !== 'rtl') throw new Error('RTL did not apply')
await page.setViewportSize({ width: 390, height: 844 })
await page.screenshot({ path: 'mobile-smoke.png', fullPage: true })
console.log(JSON.stringify({ errors, remoteRequests, backup: download.suggestedFilename(), rtl: await page.locator('html').getAttribute('dir') }))
await browser.close()
if (errors.length || remoteRequests.length) process.exitCode = 1
