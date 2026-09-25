export type GymStatus = 'completed' | 'rest' | 'missed' | null
export type DietStatus = 'followed' | 'cheat_meal' | 'cheat_day' | 'missed' | null
export type PhotoCategory = 'Front' | 'Side' | 'Back' | 'Other'
export type MeasurementKey = 'waist' | 'chest' | 'shoulders' | 'arms' | 'thighs' | 'hips'

export interface DayLog {
  date: string
  gym: GymStatus
  diet: DietStatus
  weightKg?: number
  notes?: string
  energy?: number
  sleepHours?: number
  waterLiters?: number
  steps?: number
}

export interface Exercise { id: string; name: string; weighted: boolean; notes?: string }
export interface ExerciseSet { reps: number; weightKg?: number }
export interface ExerciseEntry { exerciseId: string; sets: ExerciseSet[] }
export interface Workout {
  id: string
  date: string
  type: string
  durationMinutes?: number
  quality?: number
  notes?: string
  exercises: ExerciseEntry[]
}
export interface Measurement {
  id: string
  date: string
  values: Partial<Record<MeasurementKey, number>>
  custom: Record<string, number>
  notes?: string
}
export interface PhotoMeta {
  id: string
  date: string
  category: PhotoCategory
  weightKg?: number
  bodyFat?: number
  notes?: string
  mimeType: string
}
export interface Settings {
  theme: 'dark' | 'light'
  language: 'en' | 'ar'
  weightUnit: 'kg' | 'lb'
  lengthUnit: 'cm' | 'in'
  weekStart: 0 | 1
  targetWeightKg?: number
  weeklyGymGoal: number
  monthlyGymGoal: number
  dietGoal: number
  heatmapMode: 'gym' | 'diet' | 'overall' | 'weight'
  heatmapYear: number
  optionalFields: { energy: boolean; sleep: boolean; water: boolean; steps: boolean; photo: boolean }
  hiddenModules: string[]
  workoutTypes: string[]
}
export interface AppData {
  days: DayLog[]
  workouts: Workout[]
  exercises: Exercise[]
  measurements: Measurement[]
  photos: PhotoMeta[]
  settings: Settings
}

export const defaultSettings: Settings = {
  theme: 'dark', language: 'en', weightUnit: 'kg', lengthUnit: 'cm', weekStart: 1,
  weeklyGymGoal: 4, monthlyGymGoal: 16, dietGoal: 85,
  heatmapMode: 'overall', heatmapYear: new Date().getFullYear(),
  optionalFields: { energy: true, sleep: true, water: true, steps: true, photo: true },
  hiddenModules: [],
  workoutTypes: ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'],
}
