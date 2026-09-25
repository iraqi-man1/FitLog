import JSZip from 'jszip'
import { defaultSettings, type AppData, type DayLog, type Exercise, type Measurement, type PhotoMeta, type Settings, type Workout } from './types'
import { readLegacyData } from './legacy'

const migrationKey = 'fitlog-mysql-migrated-v1'
let migrationPromise: Promise<void> | null = null
const apiEndpoint = new URL('api/index.php', new URL(import.meta.env.BASE_URL, window.location.href))
const apiUrl = (path: string) => {
  if (import.meta.env.DEV) return path
  const url = new URL(apiEndpoint)
  url.searchParams.set('route', path.replace(/^\/api\//, ''))
  return url.href
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), { cache: 'no-store', ...init })
  if (!response.ok) {
    let message = `Local database request failed (${response.status}).`
    try { message = (await response.json() as { error?: string }).error || message } catch { /* keep status message */ }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

async function makeArchive(data: AppData, blobs: Map<string, Blob>) {
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify({ format: 'fitlog', version: 1, exportedAt: new Date().toISOString(), includesPhotos: true }))
  zip.file('data.json', JSON.stringify(data))
  for (const photo of data.photos) {
    const blob = blobs.get(photo.id)
    if (!blob) throw new Error(`Missing local image for ${photo.date}`)
    zip.file(`photos/${photo.id}`, blob)
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } })
}

async function uploadData(path: string, data: AppData, blobs: Map<string, Blob>) {
  if (import.meta.env.DEV) {
    const archive = await makeArchive(data, blobs)
    await request(path, { method: 'POST', headers: { 'content-type': 'application/zip' }, body: archive })
    return
  }
  const photos: Record<string, string> = {}
  for (const photo of data.photos) {
    const blob = blobs.get(photo.id)
    if (!blob) throw new Error(`Missing local image for ${photo.date}`)
    photos[photo.id] = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = () => reject(reader.error || new Error('Could not read the photo.'))
      reader.readAsDataURL(blob)
    })
  }
  await request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data, photos }) })
}

async function performLegacyMigration() {
  const status = await request<{ empty: boolean }>('/api/status')
  if (status.empty) {
    const legacy = await readLegacyData()
    const hasRecords = legacy.data.days.length + legacy.data.workouts.length + legacy.data.exercises.length + legacy.data.measurements.length + legacy.data.photos.length > 0
      || JSON.stringify(legacy.data.settings) !== JSON.stringify(defaultSettings)
    if (hasRecords) {
      await uploadData('/api/import-legacy', legacy.data, legacy.blobs)
    }
  }
  try { localStorage.setItem(migrationKey, '1') } catch { /* MySQL remains the source of truth if storage is unavailable */ }
}

async function ensureLegacyMigration() {
  let done = false
  try { done = localStorage.getItem(migrationKey) === '1' } catch { /* continue with a one-time status check */ }
  if (done) return
  migrationPromise ??= performLegacyMigration()
  await migrationPromise
}

export const repository = {
  async load(): Promise<AppData> {
    await ensureLegacyMigration()
    return request<AppData>('/api/data')
  },
  async storageInfo(): Promise<{ databasePath: string; photosPath: string }> {
    return request('/api/status')
  },
  async putDay(value: DayLog) { await request('/api/days', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) }) },
  async putWorkout(value: Workout) { await request('/api/workouts', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) }) },
  async deleteWorkout(id: string) { await request(`/api/workouts/${encodeURIComponent(id)}`, { method: 'DELETE' }) },
  async putExercise(value: Exercise) { await request('/api/exercises', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) }) },
  async putMeasurement(value: Measurement) { await request('/api/measurements', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) }) },
  async deleteMeasurement(id: string) { await request(`/api/measurements/${encodeURIComponent(id)}`, { method: 'DELETE' }) },
  async putPhoto(meta: PhotoMeta, blob: Blob) {
    await request(`/api/photos/${encodeURIComponent(meta.id)}`, { method: 'PUT', headers: { 'content-type': meta.mimeType, 'x-photo-meta': encodeURIComponent(JSON.stringify(meta)) }, body: blob })
  },
  async getPhotoBlob(id: string) {
    const response = await fetch(apiUrl(`/api/photos/${encodeURIComponent(id)}/blob`), { cache: 'no-store' })
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error(`Could not read photo (${response.status}).`)
    return response.blob()
  },
  async deletePhoto(id: string) { await request(`/api/photos/${encodeURIComponent(id)}`, { method: 'DELETE' }) },
  async putSettings(value: Settings) { await request('/api/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) }) },
  async replaceAll(data: AppData, blobs: Map<string, Blob>) {
    await uploadData('/api/replace', data, blobs)
  },
}
