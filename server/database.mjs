import mysql from 'mysql2/promise'

export const defaultSettings = {
  theme: 'dark', language: 'en', weightUnit: 'kg', lengthUnit: 'cm', weekStart: 1,
  weeklyGymGoal: 4, monthlyGymGoal: 16, dietGoal: 85,
  heatmapMode: 'overall', heatmapYear: new Date().getFullYear(),
  optionalFields: { energy: true, sleep: true, water: true, steps: true, photo: true },
  hiddenModules: [], workoutTypes: ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'],
}

export async function createDatabase() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fitlog',
    waitForConnections: true,
    connectionLimit: 5,
    dateStrings: true,
    charset: 'utf8mb4',
  })
  await pool.query('SELECT 1')

  async function inTransaction(fn) {
    const connection = await pool.getConnection()
    try { await connection.beginTransaction(); const result = await fn(connection); await connection.commit(); return result }
    catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
  const run = async (sql, values = [], connection = pool) => connection.execute(sql, values)
  const writeDay = (value, c) => run(`INSERT INTO days(date,gym,diet,weight_kg,notes,energy,sleep_hours,water_liters,steps) VALUES(?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE gym=VALUES(gym),diet=VALUES(diet),weight_kg=VALUES(weight_kg),notes=VALUES(notes),energy=VALUES(energy),sleep_hours=VALUES(sleep_hours),water_liters=VALUES(water_liters),steps=VALUES(steps)`,
  [value.date, value.gym ?? null, value.diet ?? null, value.weightKg ?? null, value.notes ?? null, value.energy ?? null, value.sleepHours ?? null, value.waterLiters ?? null, value.steps ?? null], c)
  const writeExercise = (value, c) => run('INSERT INTO exercises(id,name,weighted,notes) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),weighted=VALUES(weighted),notes=VALUES(notes)', [value.id, value.name, value.weighted ? 1 : 0, value.notes ?? null], c)
  const writeMeasurement = (value, c) => run('INSERT INTO measurements(id,date,values_json,custom_json,notes) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE date=VALUES(date),values_json=VALUES(values_json),custom_json=VALUES(custom_json),notes=VALUES(notes)', [value.id, value.date, JSON.stringify(value.values), JSON.stringify(value.custom), value.notes ?? null], c)
  const writePhoto = (meta, fileName, c) => run('INSERT INTO photos(id,date,category,weight_kg,body_fat,notes,mime_type,file_name) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE date=VALUES(date),category=VALUES(category),weight_kg=VALUES(weight_kg),body_fat=VALUES(body_fat),notes=VALUES(notes),mime_type=VALUES(mime_type),file_name=VALUES(file_name)', [meta.id, meta.date, meta.category, meta.weightKg ?? null, meta.bodyFat ?? null, meta.notes ?? null, meta.mimeType, fileName], c)
  async function writeWorkout(value, c) {
    await run('INSERT INTO workouts(id,date,type,duration_minutes,quality,notes) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE date=VALUES(date),type=VALUES(type),duration_minutes=VALUES(duration_minutes),quality=VALUES(quality),notes=VALUES(notes)', [value.id, value.date, value.type, value.durationMinutes ?? null, value.quality ?? null, value.notes ?? null], c)
    await run('DELETE FROM workout_exercises WHERE workout_id=?', [value.id], c)
    for (const [position, entry] of value.exercises.entries()) {
      await run('INSERT INTO workout_exercises(workout_id,exercise_id,position) VALUES(?,?,?)', [value.id, entry.exerciseId, position], c)
      for (const [index, set] of entry.sets.entries()) await run('INSERT INTO workout_sets(workout_id,exercise_position,set_number,reps,weight_kg) VALUES(?,?,?,?,?)', [value.id, position, index + 1, set.reps, set.weightKg ?? null], c)
    }
  }
  async function load() {
    const [days] = await pool.query('SELECT * FROM days ORDER BY date')
    const [exerciseRows] = await pool.query('SELECT * FROM exercises ORDER BY name')
    const exercises = exerciseRows.map(row => ({ id: row.id, name: row.name, weighted: !!row.weighted, ...(row.notes == null ? {} : { notes: row.notes }) }))
    const exerciseIds = new Set(exercises.map(item => item.id))
    const [workoutRows] = await pool.query('SELECT * FROM workouts ORDER BY date')
    const workouts = []
    for (const row of workoutRows) {
      const [entries] = await pool.execute('SELECT * FROM workout_exercises WHERE workout_id=? ORDER BY position', [row.id])
      const workoutExercises = []
      for (const entry of entries) {
        if (!exerciseIds.has(entry.exercise_id)) continue
        const [sets] = await pool.execute('SELECT * FROM workout_sets WHERE workout_id=? AND exercise_position=? ORDER BY set_number', [row.id, entry.position])
        workoutExercises.push({ exerciseId: entry.exercise_id, sets: sets.map(set => ({ reps: set.reps, ...(set.weight_kg == null ? {} : { weightKg: Number(set.weight_kg) }) })) })
      }
      workouts.push({ id: row.id, date: row.date, type: row.type, ...(row.duration_minutes == null ? {} : { durationMinutes: row.duration_minutes }), ...(row.quality == null ? {} : { quality: row.quality }), ...(row.notes == null ? {} : { notes: row.notes }), exercises: workoutExercises })
    }
    const [measurementRows] = await pool.query('SELECT * FROM measurements ORDER BY date')
    const measurements = measurementRows.map(row => ({ id: row.id, date: row.date, values: row.values_json, custom: row.custom_json, ...(row.notes == null ? {} : { notes: row.notes }) }))
    const [photos] = await pool.query('SELECT id,date,category,weight_kg,body_fat,notes,mime_type AS mimeType FROM photos ORDER BY date')
    const [settingsRows] = await pool.query('SELECT data_json FROM settings WHERE id=1')
    const settings = settingsRows[0]?.data_json ?? defaultSettings
    return {
      days: days.map(row => ({ date: row.date, gym: row.gym, diet: row.diet, ...(row.weight_kg == null ? {} : { weightKg: Number(row.weight_kg) }), ...(row.notes == null ? {} : { notes: row.notes }), ...(row.energy == null ? {} : { energy: Number(row.energy) }), ...(row.sleep_hours == null ? {} : { sleepHours: Number(row.sleep_hours) }), ...(row.water_liters == null ? {} : { waterLiters: Number(row.water_liters) }), ...(row.steps == null ? {} : { steps: row.steps }) })),
      workouts, exercises, measurements,
      photos: photos.map(row => ({ ...row, ...(row.weight_kg == null ? {} : { weightKg: Number(row.weight_kg) }), ...(row.body_fat == null ? {} : { bodyFat: Number(row.body_fat) }), mimeType: row.mimeType })),
      settings,
    }
  }
  async function saveSettings(value, c = pool) { await run('INSERT INTO settings(id,data_json) VALUES(1,?) ON DUPLICATE KEY UPDATE data_json=VALUES(data_json)', [JSON.stringify(value)], c) }
  async function replaceAll(data, photoFiles) {
    await inTransaction(async c => {
      for (const table of ['workout_sets', 'workout_exercises', 'workouts', 'days', 'exercises', 'measurements', 'photos', 'settings']) await c.query(`DELETE FROM ${table}`)
      for (const exercise of data.exercises) await writeExercise(exercise, c)
      for (const day of data.days) await writeDay(day, c)
      for (const workout of data.workouts) await writeWorkout(workout, c)
      for (const measurement of data.measurements) await writeMeasurement(measurement, c)
      for (const photo of data.photos) await writePhoto(photo, photoFiles.get(photo.id), c)
      await saveSettings(data.settings, c)
    })
  }
  return {
    load,
    isEmpty: async () => { const [rows] = await pool.query('SELECT (SELECT COUNT(*) FROM days)+(SELECT COUNT(*) FROM workouts)+(SELECT COUNT(*) FROM exercises)+(SELECT COUNT(*) FROM measurements)+(SELECT COUNT(*) FROM photos) AS total'); return Number(rows[0].total) === 0 },
    saveDay: value => inTransaction(c => writeDay(value, c)),
    saveExercise: value => inTransaction(c => writeExercise(value, c)),
    saveWorkout: value => inTransaction(c => writeWorkout(value, c)),
    deleteWorkout: async id => { const [result] = await pool.execute('DELETE FROM workouts WHERE id=?', [id]); return { changes: result.affectedRows } },
    saveMeasurement: value => inTransaction(c => writeMeasurement(value, c)),
    deleteMeasurement: async id => { const [result] = await pool.execute('DELETE FROM measurements WHERE id=?', [id]); return { changes: result.affectedRows } },
    savePhoto: (meta, fileName) => inTransaction(c => writePhoto(meta, fileName, c)),
    deletePhoto: async id => { const [result] = await pool.execute('DELETE FROM photos WHERE id=?', [id]); return { changes: result.affectedRows } },
    photoFile: async id => { const [rows] = await pool.execute('SELECT file_name FROM photos WHERE id=?', [id]); return rows[0]?.file_name },
    photoFiles: async () => { const [rows] = await pool.query('SELECT file_name FROM photos'); return rows.map(row => row.file_name) },
    saveSettings,
    replaceAll,
    close: () => pool.end(),
  }
}
