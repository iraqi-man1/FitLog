import { openDB, type DBSchema } from 'idb'
import { defaultSettings, type AppData, type DayLog, type Exercise, type Measurement, type PhotoMeta, type Settings, type Workout } from './types'

interface LegacyFitDB extends DBSchema {
  days: { key: string; value: DayLog }
  workouts: { key: string; value: Workout }
  exercises: { key: string; value: Exercise }
  measurements: { key: string; value: Measurement }
  photos: { key: string; value: PhotoMeta }
  photoBlobs: { key: string; value: Blob }
  settings: { key: string; value: Settings }
}

export async function readLegacyData(): Promise<{ data: AppData; blobs: Map<string, Blob> }> {
  if (indexedDB.databases) {
    const databases = await indexedDB.databases()
    if (!databases.some(item => item.name === 'fitlog-local')) return { data: { days: [], workouts: [], exercises: [], measurements: [], photos: [], settings: defaultSettings }, blobs: new Map() }
  }
  const db = await openDB<LegacyFitDB>('fitlog-local', 1, {
    upgrade(database) {
      for (const name of ['days', 'workouts', 'exercises', 'measurements', 'photos', 'photoBlobs', 'settings'] as const) {
        if (!database.objectStoreNames.contains(name)) database.createObjectStore(name)
      }
    },
  })
  const [days, workouts, exercises, measurements, photos, stored] = await Promise.all([
    db.getAll('days'), db.getAll('workouts'), db.getAll('exercises'), db.getAll('measurements'), db.getAll('photos'), db.get('settings', 'main'),
  ])
  const blobs = new Map<string, Blob>()
  for (const photo of photos) {
    const blob = await db.get('photoBlobs', photo.id)
    if (blob) blobs.set(photo.id, blob)
  }
  db.close()
  return { data: { days, workouts, exercises, measurements, photos: photos.filter(photo => blobs.has(photo.id)), settings: { ...defaultSettings, ...stored, optionalFields: { ...defaultSettings.optionalFields, ...stored?.optionalFields } } }, blobs }
}
