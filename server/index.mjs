import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import JSZip from 'jszip'
import { createDatabase } from './database.mjs'

const host = '127.0.0.1'
const port = Number(process.env.PORT || 4173)
const projectRoot = resolve(import.meta.dirname, '..')
const distDir = join(projectRoot, 'dist')
const dataDir = resolve(process.env.FITLOG_DATA_DIR || join(projectRoot, 'data'))
const photoDir = join(dataDir, 'photos')
const db = await createDatabase().catch(error => {
  console.error(`Could not connect to XAMPP MySQL (${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'fitlog'}). Start MySQL in XAMPP and import database/fitlog.sql.`, error.message)
  process.exit(1)
})
const maxJsonBytes = 8 * 1024 * 1024
const maxPhotoBytes = 80 * 1024 * 1024
const maxBackupBytes = 256 * 1024 * 1024
const mimeExtensions = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/gif', 'gif']])
const allowedOrigins = new Set([`http://${host}:${port}`, `http://localhost:${port}`, 'http://127.0.0.1:5173'])

await mkdir(photoDir, { recursive: true })

const send = (res, status, value) => {
  const body = Buffer.from(JSON.stringify(value))
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length, 'cache-control': 'no-store' })
  res.end(body)
}
const fail = (status, message) => Object.assign(new Error(message), { status })
async function readBody(req, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw fail(413, 'Request is too large.')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
async function readJson(req) {
  const body = await readBody(req, maxJsonBytes)
  try { return JSON.parse(body.toString('utf8')) }
  catch { throw fail(400, 'Invalid JSON.') }
}
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`))
function validAppData(data) {
  if (!data || typeof data !== 'object' || !['days', 'workouts', 'exercises', 'measurements', 'photos'].every(key => Array.isArray(data[key])) || !data.settings || typeof data.settings !== 'object') return false
  if (!data.days.every(day => validDate(day.date) && [null, 'completed', 'rest', 'missed'].includes(day.gym) && [null, 'followed', 'cheat_meal', 'cheat_day', 'missed'].includes(day.diet))) return false
  if (!data.exercises.every(item => typeof item.id === 'string' && item.id && typeof item.name === 'string' && typeof item.weighted === 'boolean')) return false
  const exerciseIds = new Set(data.exercises.map(item => item.id))
  if (!data.workouts.every(item => typeof item.id === 'string' && item.id && validDate(item.date) && typeof item.type === 'string' && Array.isArray(item.exercises) && item.exercises.every(entry => exerciseIds.has(entry.exerciseId) && Array.isArray(entry.sets)))) return false
  if (!data.measurements.every(item => typeof item.id === 'string' && validDate(item.date) && item.values && typeof item.values === 'object' && item.custom && typeof item.custom === 'object')) return false
  if (!data.photos.every(item => typeof item.id === 'string' && item.id && validDate(item.date) && ['Front', 'Side', 'Back', 'Other'].includes(item.category) && mimeExtensions.has(item.mimeType))) return false
  for (const [array, key] of [[data.days, 'date'], [data.workouts, 'id'], [data.exercises, 'id'], [data.measurements, 'id'], [data.photos, 'id']]) if (new Set(array.map(item => item[key])).size !== array.length) return false
  const settings = data.settings
  return ['dark', 'light'].includes(settings.theme) && ['en', 'ar'].includes(settings.language) && ['kg', 'lb'].includes(settings.weightUnit) && ['cm', 'in'].includes(settings.lengthUnit) && Array.isArray(settings.workoutTypes)
}
function serveStatic(pathname, res) {
  let requested
  try { requested = decodeURIComponent(pathname) } catch { throw fail(400, 'Invalid path.') }
  const target = resolve(distDir, `.${requested === '/' ? '/index.html' : requested}`)
  if (target !== distDir && !target.startsWith(`${distDir}${sep}`)) throw fail(403, 'Forbidden.')
  createReadStream(target).on('error', error => {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') {
      if (pathname.includes('.')) send(res, 404, { error: 'Not found.' })
      else createReadStream(join(distDir, 'index.html')).pipe(res)
    } else if (!res.headersSent) send(res, 500, { error: 'Could not read application files.' })
  }).on('open', () => {
    const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }
    res.setHeader('content-type', contentTypes[extname(target)] || 'application/octet-stream')
    res.setHeader('cache-control', extname(target) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable')
  }).pipe(res)
}

async function importZip(body) {
  let zip
  try { zip = await JSZip.loadAsync(body, { checkCRC32: true }) } catch { throw fail(400, 'Backup archive is invalid.') }
  const manifestFile = zip.file('manifest.json'), dataFile = zip.file('data.json')
  if (!manifestFile || !dataFile) throw fail(400, 'This is not a FitLog backup.')
  let manifest, data
  try { [manifest, data] = await Promise.all([manifestFile.async('json'), dataFile.async('json')]) }
  catch { throw fail(400, 'Backup data could not be read.') }
  if (manifest?.format !== 'fitlog' || manifest?.version !== 1 || !validAppData(data)) throw fail(400, 'Backup data is invalid.')
  const photoFiles = new Map(), written = []
  for (const photo of data.photos) {
    const entry = zip.file(`photos/${photo.id}`)
    if (!entry) throw fail(400, `Missing photo file for ${photo.date}.`)
    const bytes = await entry.async('nodebuffer')
    if (!bytes.length || bytes.length > maxPhotoBytes) throw fail(400, `Photo file for ${photo.date} is empty or too large.`)
    const fileName = `${randomUUID()}.${mimeExtensions.get(photo.mimeType)}`
    const target = join(photoDir, fileName)
    await writeFile(target, bytes, { flag: 'wx' })
    written.push(target)
    photoFiles.set(photo.id, fileName)
  }
  return { data, photoFiles, written }
}

async function replaceFromZip(req, onlyIfEmpty) {
  const body = await readBody(req, maxBackupBytes)
  const imported = await importZip(body)
  if (onlyIfEmpty && !await db.isEmpty()) {
    await Promise.all(imported.written.map(path => rm(path, { force: true })))
    throw fail(409, 'The local SQLite database already contains data.')
  }
  const oldFiles = (await db.photoFiles()).map(name => join(photoDir, name))
  try { await db.replaceAll(imported.data, imported.photoFiles) }
  catch (error) {
    await Promise.all(imported.written.map(path => rm(path, { force: true })))
    throw error
  }
  const keep = new Set(imported.photoFiles.values())
  await Promise.all(oldFiles.filter(path => !keep.has(path.split(sep).at(-1))).map(path => rm(path, { force: true })))
  return { imported: true, days: imported.data.days.length, photos: imported.data.photos.length }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`)
    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers.origin && !allowedOrigins.has(req.headers.origin)) throw fail(403, 'Requests must come from FitLog on this computer.')
      if (req.method === 'GET' && url.pathname === '/api/status') return send(res, 200, { ok: true, empty: await db.isEmpty(), databasePath: `${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'fitlog'}`, photosPath: photoDir })
      if (req.method === 'GET' && url.pathname === '/api/data') return send(res, 200, await db.load())
      if (req.method === 'PUT' && url.pathname === '/api/days') return send(res, 200, { saved: await db.saveDay(await readJson(req)) })
      if (req.method === 'PUT' && url.pathname === '/api/workouts') return send(res, 200, { saved: await db.saveWorkout(await readJson(req)) })
      if (req.method === 'DELETE' && url.pathname.startsWith('/api/workouts/')) return send(res, 200, { deleted: (await db.deleteWorkout(decodeURIComponent(url.pathname.slice('/api/workouts/'.length)))).changes > 0 })
      if (req.method === 'PUT' && url.pathname === '/api/exercises') return send(res, 200, { saved: await db.saveExercise(await readJson(req)) })
      if (req.method === 'PUT' && url.pathname === '/api/measurements') return send(res, 200, { saved: await db.saveMeasurement(await readJson(req)) })
      if (req.method === 'DELETE' && url.pathname.startsWith('/api/measurements/')) return send(res, 200, { deleted: (await db.deleteMeasurement(decodeURIComponent(url.pathname.slice('/api/measurements/'.length)))).changes > 0 })
      if (req.method === 'PUT' && url.pathname === '/api/settings') return send(res, 200, { saved: await db.saveSettings(await readJson(req)) })
      if (url.pathname.startsWith('/api/photos/')) {
        const segments = url.pathname.split('/').filter(Boolean)
        const id = decodeURIComponent(segments[2] || '')
        if (segments[3] === 'blob' && req.method === 'GET') {
          const fileName = await db.photoFile(id)
          if (!fileName) throw fail(404, 'Photo not found.')
          const photoPath = join(photoDir, fileName)
          const bytes = await readFile(photoPath).catch(() => null)
          if (!bytes) throw fail(404, 'Photo file not found.')
          res.writeHead(200, { 'content-type': `image/${extname(fileName).slice(1) === 'jpg' ? 'jpeg' : extname(fileName).slice(1)}`, 'content-length': bytes.length, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
          return res.end(bytes)
        }
        if (segments.length === 3 && req.method === 'PUT') {
          let meta
          try { meta = JSON.parse(decodeURIComponent(req.headers['x-photo-meta'] || '')) } catch { throw fail(400, 'Photo details are invalid.') }
          const mimeType = req.headers['content-type']?.split(';')[0]
          if (!meta || meta.id !== id || !validDate(meta.date) || !mimeExtensions.has(mimeType) || meta.mimeType !== mimeType) throw fail(400, 'Photo details are invalid.')
          const bytes = await readBody(req, maxPhotoBytes)
          if (!bytes.length) throw fail(400, 'Photo file is empty.')
          const fileName = `${randomUUID()}.${mimeExtensions.get(mimeType)}`
          const photoPath = join(photoDir, fileName)
          await writeFile(photoPath, bytes, { flag: 'wx' })
          const old = await db.photoFile(id)
          try { await db.savePhoto(meta, fileName) } catch (error) { await rm(photoPath, { force: true }); throw error }
          if (old) await rm(join(photoDir, old), { force: true })
          return send(res, 200, { saved: true })
        }
        if (segments.length === 3 && req.method === 'DELETE') {
          const old = await db.photoFile(id)
          const result = await db.deletePhoto(id)
          if (old) await rm(join(photoDir, old), { force: true })
          return send(res, 200, { deleted: result.changes > 0 })
        }
      }
      if (req.method === 'POST' && url.pathname === '/api/replace') return send(res, 200, await replaceFromZip(req, false))
      if (req.method === 'POST' && url.pathname === '/api/import-legacy') return send(res, 200, await replaceFromZip(req, true))
      return send(res, 404, { error: 'API route not found.' })
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' })
    serveStatic(url.pathname, res)
  } catch (error) {
    if (res.headersSent) return res.destroy()
    send(res, error.status || 500, { error: error.message || 'Unexpected local server error.' })
  }
})

server.listen(port, host, () => {
  console.log(`FitLog is running at http://${host}:${port}/`)
  console.log(`XAMPP MySQL: ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'fitlog'}`)
  console.log(`Local photos: ${photoDir}`)
})
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Close the other FitLog window first.` : error)
  void db.close()
  process.exitCode = 1
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await db.close(); process.exit(0) }))
