import { openDB, type DBSchema } from 'idb'
import { defaultSettings, type AppData, type DayLog, type Exercise, type Measurement, type PhotoMeta, type Settings, type Workout } from './types'

interface FitDB extends DBSchema {
  days: { key: string; value: DayLog }
  workouts: { key: string; value: Workout }
  exercises: { key: string; value: Exercise }
  measurements: { key: string; value: Measurement }
  photos: { key: string; value: PhotoMeta }
  photoBlobs: { key: string; value: Blob }
  settings: { key: string; value: Settings }
}

const database = openDB<FitDB>('fitlog-local', 1, {
  upgrade(db) {
    for (const name of ['days', 'workouts', 'exercises', 'measurements', 'photos', 'photoBlobs', 'settings'] as const) {
      if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
    }
  },
})

export const repository = {
  async load(): Promise<AppData> {
    const db = await database
    const [days, workouts, exercises, measurements, photos, stored] = await Promise.all([
      db.getAll('days'), db.getAll('workouts'), db.getAll('exercises'), db.getAll('measurements'), db.getAll('photos'), db.get('settings', 'main'),
    ])
    return { days, workouts, exercises, measurements, photos, settings: { ...defaultSettings, ...stored, optionalFields: { ...defaultSettings.optionalFields, ...stored?.optionalFields } } }
  },
  async putDay(value: DayLog) { await (await database).put('days', value, value.date) },
  async putWorkout(value: Workout) { await (await database).put('workouts', value, value.id) },
  async deleteWorkout(id: string) { await (await database).delete('workouts', id) },
  async putExercise(value: Exercise) { await (await database).put('exercises', value, value.id) },
  async putMeasurement(value: Measurement) { await (await database).put('measurements', value, value.id) },
  async deleteMeasurement(id: string) { await (await database).delete('measurements', id) },
  async putPhoto(meta: PhotoMeta, blob: Blob) {
    const db = await database
    const tx = db.transaction(['photos', 'photoBlobs'], 'readwrite')
    await Promise.all([tx.objectStore('photos').put(meta, meta.id), tx.objectStore('photoBlobs').put(blob, meta.id)])
    await tx.done
  },
  async getPhotoBlob(id: string) { return (await database).get('photoBlobs', id) },
  async deletePhoto(id: string) {
    const tx = (await database).transaction(['photos', 'photoBlobs'], 'readwrite')
    await Promise.all([tx.objectStore('photos').delete(id), tx.objectStore('photoBlobs').delete(id)])
    await tx.done
  },
  async putSettings(value: Settings) { await (await database).put('settings', value, 'main') },
  async replaceAll(data: AppData, blobs: Map<string, Blob>) {
    const db = await database
    const tx = db.transaction(['days', 'workouts', 'exercises', 'measurements', 'photos', 'photoBlobs', 'settings'], 'readwrite')
    await Promise.all((['days', 'workouts', 'exercises', 'measurements', 'photos', 'photoBlobs', 'settings'] as const).map(name => tx.objectStore(name).clear()))
    for (const day of data.days) await tx.objectStore('days').put(day, day.date)
    for (const workout of data.workouts) await tx.objectStore('workouts').put(workout, workout.id)
    for (const exercise of data.exercises) await tx.objectStore('exercises').put(exercise, exercise.id)
    for (const measurement of data.measurements) await tx.objectStore('measurements').put(measurement, measurement.id)
    for (const photo of data.photos) await tx.objectStore('photos').put(photo, photo.id)
    for (const [id, blob] of blobs) await tx.objectStore('photoBlobs').put(blob, id)
    await tx.objectStore('settings').put(data.settings, 'main')
    await tx.done
  },
}
