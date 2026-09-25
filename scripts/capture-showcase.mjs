import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const base = process.env.FITLOG_URL ?? 'http://127.0.0.1:4173/'
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'Asia/Baghdad' })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.goto(base, { waitUntil: 'networkidle' })

const records = await page.evaluate(async () => {
  const request = indexedDB.open('fitlog-local', 1)
  const db = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const localKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const addDays = (date, amount) => { const result = new Date(date); result.setDate(result.getDate() + amount); return result }
  const today = new Date()
  const days = []
  const first = new Date(today.getFullYear(), 0, 1)
  for (let date = first; date <= today; date = addDays(date, 1)) {
    const weekday = date.getDay()
    const number = Math.round((date - first) / 86400000)
    let gym = [1, 3, 5].includes(weekday) && number % 13 !== 4 ? 'completed' : null
    let diet = number % 10 < 7 ? 'followed' : number % 10 === 7 ? 'cheat_meal' : null
    const currentWeekStart = addDays(today, -((weekday + 6) % 7))
    if (date >= currentWeekStart) {
      gym = [1, 3, 5].includes(weekday) ? 'completed' : null
      diet = weekday === 2 ? 'cheat_meal' : 'followed'
    }
    const monthsProgress = (date - first) / Math.max(1, today - first)
    const weightKg = number % 8 === 0 ? Number((86.4 - monthsProgress * 7.1 + Math.sin(number / 18) * 0.55).toFixed(1)) : undefined
    days.push({ date: localKey(date), gym, diet, ...(weightKg === undefined ? {} : { weightKg }), energy: 3 + number % 3, sleepHours: Number((6.5 + number % 5 * 0.35).toFixed(1)), waterLiters: 2.1 + number % 5 * 0.2, steps: 6500 + number % 6 * 850 })
  }
  const exercises = [
    { id: 'demo-bench', name: 'Bench press', weighted: true },
    { id: 'demo-row', name: 'Cable row', weighted: true },
    { id: 'demo-squat', name: 'Squat', weighted: true },
  ]
  const workout = (id, date, type, exercisesUsed, duration, quality) => ({ id, date: localKey(date), type, durationMinutes: duration, quality, notes: '', exercises: exercisesUsed })
  const workouts = [
    workout('demo-workout-1', addDays(today, -1), 'Push', [{ exerciseId: 'demo-bench', sets: [{ reps: 8, weightKg: 60 }, { reps: 8, weightKg: 62.5 }, { reps: 7, weightKg: 62.5 }] }], 52, 4),
    workout('demo-workout-2', addDays(today, -3), 'Pull', [{ exerciseId: 'demo-row', sets: [{ reps: 10, weightKg: 55 }, { reps: 10, weightKg: 57.5 }, { reps: 9, weightKg: 57.5 }] }], 48, 5),
    workout('demo-workout-3', addDays(today, -5), 'Legs', [{ exerciseId: 'demo-squat', sets: [{ reps: 8, weightKg: 75 }, { reps: 8, weightKg: 77.5 }, { reps: 7, weightKg: 77.5 }] }], 58, 4),
  ]
  const settings = { theme: 'dark', language: 'en', weightUnit: 'kg', lengthUnit: 'cm', weekStart: 1, targetWeightKg: 76, weeklyGymGoal: 4, monthlyGymGoal: 16, dietGoal: 85, heatmapMode: 'overall', heatmapYear: today.getFullYear(), optionalFields: { energy: true, sleep: true, water: true, steps: true, photo: true }, hiddenModules: [], workoutTypes: ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'] }
  const tx = db.transaction(['days', 'workouts', 'exercises', 'measurements', 'photos', 'photoBlobs', 'settings'], 'readwrite')
  for (const name of ['days', 'workouts', 'exercises', 'measurements', 'photos', 'photoBlobs']) tx.objectStore(name).clear()
  for (const item of days) tx.objectStore('days').put(item, item.date)
  for (const item of workouts) tx.objectStore('workouts').put(item, item.id)
  for (const item of exercises) tx.objectStore('exercises').put(item, item.id)
  tx.objectStore('settings').put(settings, 'main')
  await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error) })
  db.close()
  return { days: days.length, workouts: workouts.length }
})

await mkdir('docs/screenshots', { recursive: true })
await page.reload({ waitUntil: 'networkidle' })
await page.screenshot({ path: 'docs/screenshots/dashboard-dark.png' })
await page.getByRole('button', { name: 'Weight', exact: true }).first().click()
await page.getByRole('heading', { name: 'Weight progress' }).waitFor()
await page.waitForTimeout(350)
await page.screenshot({ path: 'docs/screenshots/weight-progress.png' })
await page.getByRole('button', { name: 'Calendar', exact: true }).first().click()
await page.getByRole('heading', { name: 'Calendar' }).waitFor()
await page.waitForTimeout(350)
await page.screenshot({ path: 'docs/screenshots/calendar.png' })
await page.getByRole('button', { name: 'Settings', exact: true }).first().click()
await page.getByRole('heading', { name: 'Settings' }).waitFor()
await page.waitForTimeout(350)
await page.screenshot({ path: 'docs/screenshots/settings.png' })
console.log(JSON.stringify({ records, screenshots: 4, errors }))
await context.close()
await browser.close()
if (errors.length) process.exitCode = 1
