import type { AppData, DayLog, Workout } from '../data/types'
import { addDays, dateKey, monthKey, parseDate, todayKey } from './utils'

export const sortedDays = (days: DayLog[]) => [...days].sort((a, b) => a.date.localeCompare(b.date))
export const weights = (days: DayLog[]) => sortedDays(days).filter(d => typeof d.weightKg === 'number').map(d => ({ date: d.date, kg: d.weightKg! }))
export const streak = (days: DayLog[], predicate: (d: DayLog) => boolean, today = todayKey()) => {
  const set = new Set(days.filter(predicate).map(d => d.date))
  let longest = 0, run = 0
  const all = sortedDays(days)
  if (all.length) {
    for (let date = all[0].date; date <= today; date = addDays(date, 1)) {
      run = set.has(date) ? run + 1 : 0
      longest = Math.max(longest, run)
    }
  }
  let cursor = set.has(today) ? today : addDays(today, -1)
  let current = 0
  while (set.has(cursor)) { current++; cursor = addDays(cursor, -1) }
  return { current, longest }
}
export const gymStreak = (days: DayLog[]) => streak(days, d => d.gym === 'completed')
export const dietStreak = (days: DayLog[]) => streak(days, d => d.diet === 'followed')
export const consistencyStreak = (days: DayLog[]) => streak(days, d => d.gym === 'completed' && d.diet === 'followed')
export const adherence = (days: DayLog[]) => { const tracked = days.filter(d => d.diet !== null); return tracked.length ? Math.round(100 * tracked.filter(d => d.diet === 'followed').length / tracked.length) : 0 }
export const consistency = (days: DayLog[]) => { const tracked = days.filter(d => d.gym !== null || d.diet !== null); return tracked.length ? Math.round(100 * tracked.filter(d => d.gym === 'completed' && d.diet === 'followed').length / tracked.length) : 0 }
export const gymCount = (days: DayLog[], start: string, end: string) => days.filter(d => d.date >= start && d.date <= end && d.gym === 'completed').length
export const weekStartKey = (key: string, firstDay: 0 | 1) => { const d = parseDate(key); const offset = (d.getDay() - firstDay + 7) % 7; d.setDate(d.getDate() - offset); return dateKey(d) }
export const monthStartKey = (key: string) => `${key.slice(0, 7)}-01`
export const monthEndKey = (key: string) => { const d = parseDate(monthStartKey(key)); d.setMonth(d.getMonth() + 1); d.setDate(0); return dateKey(d) }
export const weightChangeSince = (days: DayLog[], backDays: number, now = todayKey()) => {
  const all = weights(days).filter(w => w.date <= now)
  if (all.length < 2) return null
  const start = addDays(now, -backDays)
  const reference = [...all].reverse().find(w => w.date <= start) ?? all.find(w => w.date >= start)
  return reference && reference.date !== all.at(-1)!.date ? all.at(-1)!.kg - reference.kg : null
}
export const totalVolume = (workout: Workout) => workout.exercises.reduce((sum, entry) => sum + entry.sets.reduce((s, set) => s + set.reps * (set.weightKg ?? 0), 0), 0)

export interface PeriodSummary { gym: number; diet: number; averageWeight: number | null; weightChange: number | null; volume: number; days: number }
export const periodSummary = (data: AppData, start: string, end: string): PeriodSummary => {
  const days = data.days.filter(d => d.date >= start && d.date <= end)
  const w = weights(days)
  return { gym: days.filter(d => d.gym === 'completed').length, diet: adherence(days), averageWeight: w.length ? w.reduce((s, x) => s + x.kg, 0) / w.length : null,
    weightChange: w.length > 1 ? w.at(-1)!.kg - w[0].kg : null,
    volume: data.workouts.filter(x => x.date >= start && x.date <= end).reduce((s, x) => s + totalVolume(x), 0), days: days.length }
}

export interface JourneyEvent { id: string; date: string; title: string; detail?: string; kind: 'gym' | 'weight' | 'photo' | 'record' | 'goal' | 'streak' }
export const journeyEvents = (data: AppData): JourneyEvent[] => {
  const events: JourneyEvent[] = []
  const gymDays = sortedDays(data.days).filter(d => d.gym === 'completed')
  gymDays.forEach((d, i) => { if ([0, 9, 29, 49, 99, 199].includes(i)) events.push({ id: `gym-${i}`, date: d.date, title: i === 0 ? 'First gym day' : `${i + 1} gym sessions`, kind: 'gym' }) })
  let low = Infinity, high = -Infinity
  const weightPoints = weights(data.days)
  const startWeight = weightPoints[0]?.kg
  for (const point of weightPoints) {
    if (point.kg < low) { if (low !== Infinity) events.push({ id: `low-${point.date}`, date: point.date, title: 'New lowest weight', detail: `${point.kg.toFixed(1)} kg`, kind: 'weight' }); low = point.kg }
    if (point.kg > high) { if (high !== -Infinity) events.push({ id: `high-${point.date}`, date: point.date, title: 'New highest weight', detail: `${point.kg.toFixed(1)} kg`, kind: 'weight' }); high = point.kg }
    if (data.settings.targetWeightKg && startWeight !== undefined && (data.settings.targetWeightKg >= startWeight ? point.kg >= data.settings.targetWeightKg : point.kg <= data.settings.targetWeightKg) && !events.some(e => e.id === 'target')) events.push({ id: 'target', date: point.date, title: 'Target weight reached', detail: `${point.kg.toFixed(1)} kg`, kind: 'goal' })
  }
  for (const photo of data.photos) events.push({ id: `photo-${photo.id}`, date: photo.date, title: `${photo.category} progress photo`, kind: 'photo' })
  const best = new Map<string, number>()
  for (const workout of [...data.workouts].sort((a, b) => a.date.localeCompare(b.date))) for (const entry of workout.exercises) {
    const exercise = data.exercises.find(e => e.id === entry.exerciseId)
    if (!exercise?.weighted) continue
    const max = Math.max(0, ...entry.sets.map(s => s.weightKg ?? 0))
    if (max > (best.get(entry.exerciseId) ?? 0)) { if (best.has(entry.exerciseId)) events.push({ id: `pr-${workout.id}-${entry.exerciseId}`, date: workout.date, title: `${exercise.name} personal record`, detail: `${max} kg`, kind: 'record' }); best.set(entry.exerciseId, max) }
  }
  let run = 0, previous = ''
  const streakMilestones = new Set([3, 7, 14, 30, 60, 100, 365])
  for (const day of gymDays) { run = addDays(previous, 1) === day.date ? run + 1 : 1; if (streakMilestones.has(run)) events.push({ id: `streak-${day.date}`, date: day.date, title: `${run}-day gym streak`, kind: 'streak' }); previous = day.date }
  run = 0; previous = ''
  for (const day of sortedDays(data.days).filter(d => d.gym === 'completed' && d.diet === 'followed')) { run = addDays(previous, 1) === day.date ? run + 1 : 1; if (streakMilestones.has(run)) events.push({ id: `consistency-${day.date}`, date: day.date, title: `${run}-day consistency streak`, kind: 'streak' }); previous = day.date }
  const weeklyCounts = new Map<string, number>(), monthlyCounts = new Map<string, number>()
  for (const day of gymDays) {
    const week = weekStartKey(day.date, data.settings.weekStart), month = monthKey(day.date)
    const weekly = (weeklyCounts.get(week) ?? 0) + 1, monthly = (monthlyCounts.get(month) ?? 0) + 1
    weeklyCounts.set(week, weekly); monthlyCounts.set(month, monthly)
    if (weekly === data.settings.weeklyGymGoal && !events.some(e => e.id === 'weekly-goal')) events.push({ id: 'weekly-goal', date: day.date, title: 'Weekly gym goal reached', kind: 'goal' })
    if (monthly === data.settings.monthlyGymGoal && !events.some(e => e.id === 'monthly-goal')) events.push({ id: 'monthly-goal', date: day.date, title: 'Monthly gym goal reached', kind: 'goal' })
  }
  const months = [...new Set(data.days.map(d => monthKey(d.date)))].sort()
  for (const month of months) {
    const period = data.days.filter(d => monthKey(d.date) === month)
    if (monthEndKey(`${month}-01`) <= todayKey() && period.filter(d => d.diet !== null).length >= 10 && adherence(period) >= data.settings.dietGoal && !events.some(e => e.id === 'diet-month')) events.push({ id: 'diet-month', date: monthEndKey(`${month}-01`), title: 'First month at diet goal', detail: `${adherence(period)}% adherence`, kind: 'goal' })
  }
  return events.sort((a, b) => b.date.localeCompare(a.date))
}

export const monthConsistency = (days: DayLog[]) => [...new Set(days.map(d => monthKey(d.date)))].map(month => ({ month, value: consistency(days.filter(d => monthKey(d.date) === month)) }))
