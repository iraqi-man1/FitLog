import JSZip from 'jszip'
import type { AppData, DayLog, Exercise, Measurement, PhotoMeta, Settings, Workout } from './types'
import { repository } from './repository'
import { dateKey } from '../lib/utils'

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const validDate = (s: unknown): s is string => { if (typeof s !== 'string' || !datePattern.test(s)) return false; const [y, m, d] = s.split('-').map(Number); return dateKey(new Date(y, m - 1, d)) === s }
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const finiteOptional = (v: unknown) => v === undefined || (typeof v === 'number' && Number.isFinite(v))
const positiveOptional = (v: unknown) => v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= 0)
const textOptional = (v: unknown) => v === undefined || typeof v === 'string'
const isDay = (v: unknown): v is DayLog => object(v) && validDate(v.date) && [null, 'completed', 'rest', 'missed'].includes(v.gym as null) && [null, 'followed', 'cheat_meal', 'cheat_day', 'missed'].includes(v.diet as null) && finiteOptional(v.weightKg) && finiteOptional(v.energy) && finiteOptional(v.sleepHours) && finiteOptional(v.waterLiters) && finiteOptional(v.steps)
const isWorkout = (v: unknown): v is Workout => object(v) && typeof v.id === 'string' && v.id.length > 0 && validDate(v.date) && typeof v.type === 'string' && v.type.length > 0 && positiveOptional(v.durationMinutes) && positiveOptional(v.quality) && textOptional(v.notes) && Array.isArray(v.exercises) && v.exercises.every((e: unknown) => object(e) && typeof e.exerciseId === 'string' && Array.isArray(e.sets) && e.sets.every((s: unknown) => object(s) && typeof s.reps === 'number' && Number.isFinite(s.reps) && s.reps > 0 && positiveOptional(s.weightKg)))
const isExercise = (v: unknown): v is Exercise => object(v) && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.weighted === 'boolean'
const isMeasurement = (v: unknown): v is Measurement => object(v) && typeof v.id === 'string' && validDate(v.date) && object(v.values) && Object.values(v.values).every(finiteOptional) && object(v.custom) && Object.values(v.custom).every(x => typeof x === 'number' && Number.isFinite(x))
const isPhoto = (v: unknown): v is PhotoMeta => object(v) && typeof v.id === 'string' && v.id.length > 0 && validDate(v.date) && ['Front', 'Side', 'Back', 'Other'].includes(v.category as string) && ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(v.mimeType as string) && finiteOptional(v.weightKg) && finiteOptional(v.bodyFat) && textOptional(v.notes)
const isSettings = (v: unknown): v is Settings => object(v) && ['dark', 'light'].includes(v.theme as string) && ['en', 'ar'].includes(v.language as string) && ['kg', 'lb'].includes(v.weightUnit as string) && ['cm', 'in'].includes(v.lengthUnit as string) && [0, 1].includes(v.weekStart as number) && positiveOptional(v.targetWeightKg) && Number.isInteger(v.weeklyGymGoal) && Number(v.weeklyGymGoal) >= 1 && Number(v.weeklyGymGoal) <= 7 && Number.isInteger(v.monthlyGymGoal) && Number(v.monthlyGymGoal) >= 1 && Number(v.monthlyGymGoal) <= 31 && typeof v.dietGoal === 'number' && v.dietGoal >= 1 && v.dietGoal <= 100 && ['gym', 'diet', 'overall', 'weight'].includes(v.heatmapMode as string) && Number.isInteger(v.heatmapYear) && object(v.optionalFields) && ['energy', 'sleep', 'water', 'steps', 'photo'].every(k => typeof (v.optionalFields as Record<string, unknown>)[k] === 'boolean') && Array.isArray(v.hiddenModules) && v.hiddenModules.every((x: unknown) => typeof x === 'string') && Array.isArray(v.workoutTypes) && v.workoutTypes.every((x: unknown) => typeof x === 'string')
const unique = (items: string[]) => new Set(items).size === items.length
export const validateData = (v: unknown): v is AppData => {
  if (!object(v) || !Array.isArray(v.days) || !v.days.every(isDay) || !Array.isArray(v.workouts) || !v.workouts.every(isWorkout) || !Array.isArray(v.exercises) || !v.exercises.every(isExercise) || !Array.isArray(v.measurements) || !v.measurements.every(isMeasurement) || !Array.isArray(v.photos) || !v.photos.every(isPhoto) || !isSettings(v.settings)) return false
  if (!unique(v.days.map(d => d.date)) || !unique(v.workouts.map(w => w.id)) || !unique(v.exercises.map(e => e.id)) || !unique(v.measurements.map(m => m.id)) || !unique(v.photos.map(p => p.id))) return false
  const exercises = new Set(v.exercises.map(e => e.id))
  return v.workouts.every(w => w.exercises.every(e => exercises.has(e.exerciseId)))
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
export async function exportBackup(data: AppData, includePhotos: boolean) {
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify({ format: 'fitlog', version: 1, exportedAt: new Date().toISOString(), includesPhotos: includePhotos }))
  zip.file('data.json', JSON.stringify({ ...data, photos: includePhotos ? data.photos : [] }))
  if (includePhotos) for (const photo of data.photos) {
    const blob = await repository.getPhotoBlob(photo.id)
    if (!blob) throw new Error(`Missing local image for ${photo.date}`)
    zip.file(`photos/${photo.id}`, blob)
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } })
  download(blob, `fitlog-backup-${new Date().toISOString().slice(0, 10)}.fitlog.zip`)
}
export async function parseBackup(file: File): Promise<{ data: AppData; blobs: Map<string, Blob> }> {
  const zip = await JSZip.loadAsync(file)
  const manifest = zip.file('manifest.json')
  const dataFile = zip.file('data.json')
  if (!manifest || !dataFile) throw new Error('This is not a FitLog backup.')
  const info: unknown = JSON.parse(await manifest.async('text'))
  if (!object(info) || info.format !== 'fitlog' || info.version !== 1) throw new Error('Unsupported backup version.')
  const data: unknown = JSON.parse(await dataFile.async('text'))
  if (!validateData(data)) throw new Error('Backup data is invalid.')
  const blobs = new Map<string, Blob>()
  for (const photo of data.photos) {
    const entry = zip.file(`photos/${photo.id}`)
    if (!entry) throw new Error(`Missing photo file for ${photo.date}.`)
    const image = await entry.async('blob')
    if (image.size === 0) throw new Error(`Empty photo file for ${photo.date}.`)
    blobs.set(photo.id, new Blob([image], { type: photo.mimeType }))
  }
  return { data, blobs }
}
const csvCell = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`
const csv = (rows: unknown[][]) => new Blob([rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
export function exportCsv(data: AppData, kind: 'weight' | 'attendance' | 'measurements' | 'workouts') {
  let rows: unknown[][]
  if (kind === 'weight') rows = [['date', 'weight_kg'], ...data.days.filter(d => d.weightKg !== undefined).sort((a, b) => a.date.localeCompare(b.date)).map(d => [d.date, d.weightKg])]
  else if (kind === 'attendance') rows = [['date', 'gym', 'diet', 'notes'], ...data.days.map(d => [d.date, d.gym, d.diet, d.notes])]
  else if (kind === 'measurements') rows = [['date', 'waist_cm', 'chest_cm', 'shoulders_cm', 'arms_cm', 'thighs_cm', 'hips_cm', 'custom_json', 'notes'], ...data.measurements.map(m => [m.date, m.values.waist, m.values.chest, m.values.shoulders, m.values.arms, m.values.thighs, m.values.hips, JSON.stringify(m.custom), m.notes])]
  else rows = [['date', 'type', 'duration_minutes', 'quality', 'exercise', 'sets', 'reps', 'weight_kg', 'volume_kg', 'notes'], ...data.workouts.flatMap(w => w.exercises.length ? w.exercises.flatMap(entry => entry.sets.map((set, i) => [w.date, w.type, w.durationMinutes, w.quality, data.exercises.find(e => e.id === entry.exerciseId)?.name, i + 1, set.reps, set.weightKg, set.reps * (set.weightKg ?? 0), w.notes])) : [[w.date, w.type, w.durationMinutes, w.quality, '', '', '', '', '', w.notes]])]
  download(csv(rows), `fitlog-${kind}-${new Date().toISOString().slice(0, 10)}.csv`)
}
