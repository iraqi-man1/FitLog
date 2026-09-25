import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { repository } from './repository'
import { defaultSettings, type AppData, type DayLog, type Exercise, type Measurement, type PhotoMeta, type Settings, type Workout } from './types'

type AppContextValue = {
  data: AppData; ready: boolean; error: string | null
  saveDay: (value: DayLog) => Promise<void>
  saveWorkout: (value: Workout) => Promise<void>
  deleteWorkout: (id: string) => Promise<void>
  saveExercise: (value: Exercise) => Promise<void>
  saveMeasurement: (value: Measurement) => Promise<void>
  deleteMeasurement: (id: string) => Promise<void>
  savePhoto: (meta: PhotoMeta, blob: Blob) => Promise<void>
  deletePhoto: (id: string) => Promise<void>
  saveSettings: (value: Settings) => Promise<void>
  reload: () => Promise<void>
}
const Context = createContext<AppContextValue | null>(null)
const emptyData: AppData = { days: [], workouts: [], exercises: [], measurements: [], photos: [], settings: defaultSettings }
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reload = async () => { try { setData(await repository.load()); setError(null); setReady(true) } catch (e) { setError(e instanceof Error ? e.message : 'Could not read local storage'); setReady(true) } }
  useEffect(() => { void reload() }, [])
  const commit = async (write: () => Promise<void>) => { try { await write(); await reload() } catch (e) { setError(e instanceof Error ? e.message : 'Could not save locally'); throw e } }
  return <Context.Provider value={{ data, ready, error, reload,
    saveDay: value => commit(() => repository.putDay(value)),
    saveWorkout: value => commit(() => repository.putWorkout(value)),
    deleteWorkout: id => commit(() => repository.deleteWorkout(id)),
    saveExercise: value => commit(() => repository.putExercise(value)),
    saveMeasurement: value => commit(() => repository.putMeasurement(value)),
    deleteMeasurement: id => commit(() => repository.deleteMeasurement(id)),
    savePhoto: (meta, blob) => commit(() => repository.putPhoto(meta, blob)),
    deletePhoto: id => commit(() => repository.deletePhoto(id)),
    saveSettings: value => commit(() => repository.putSettings(value)),
  }}>{children}</Context.Provider>
}
export function useApp() { const value = useContext(Context); if (!value) throw new Error('AppProvider missing'); return value }
