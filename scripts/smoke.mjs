import { chromium } from 'playwright'

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.goto(process.env.FITLOG_URL ?? 'http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.screenshot({ path: 'dashboard-smoke.png', fullPage: true })
await page.getByRole('button', { name: 'Log Today' }).first().click()
await page.getByRole('button', { name: 'Gym completed' }).click()
await page.getByRole('button', { name: 'Diet followed' }).click()
await page.getByRole('button', { name: 'Save day' }).click()
await page.reload({ waitUntil: 'networkidle' })
if (!(await page.getByText('Gym completed').count())) throw new Error('Saved day did not persist')
await page.getByRole('button', { name: 'Weight', exact: true }).first().click()
await page.getByRole('button', { name: 'Add weight' }).click()
await page.getByRole('dialog').getByRole('spinbutton').fill('80.5')
await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
await page.reload({ waitUntil: 'networkidle' })
if (!(await page.getByText('80.5 kg').count())) throw new Error('Weight did not persist')
console.log(JSON.stringify({ title: await page.title(), errors, currentUrl: page.url(), weightVisible: await page.getByText('80.5 kg').count() }))
await browser.close()
if (errors.length) process.exitCode = 1
