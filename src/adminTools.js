// Administration helpers — storage enumeration, export/import payloads,
// CSV conversion, and settings merging. Pure functions for testability.

export const STORAGE_PREFIX = 'electralab-'
export const SETTINGS_KEY = 'electralab-settings'
export const APP_VERSION = '1.0.0'

export const DEFAULT_SETTINGS = {
  speechRate: 1,
  reduceMotion: false,
}

export function settingsWithDefaults(value) {
  const parsed = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const rate = Number(parsed.speechRate)
  return {
    speechRate: Number.isFinite(rate) ? Math.min(2, Math.max(0.5, rate)) : DEFAULT_SETTINGS.speechRate,
    reduceMotion: Boolean(parsed.reduceMotion),
  }
}

// storage is anything with .length, .key(i), .getItem(key) — localStorage or a test double.
export function collectStorageData(storage, prefix = STORAGE_PREFIX) {
  const data = {}
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (typeof key !== 'string' || !key.startsWith(prefix)) continue
    const raw = storage.getItem(key)
    try {
      data[key] = JSON.parse(raw)
    } catch {
      data[key] = raw
    }
  }
  return data
}

export function buildExportPayload(data, meta = {}) {
  return {
    app: 'electralab',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    meta,
    data,
  }
}

export function validateImportPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: 'The file is not a JSON object.' }
  }
  if (payload.app !== 'electralab') {
    return { ok: false, error: 'This file was not exported from ElectraLab.' }
  }
  if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    return { ok: false, error: 'The file has no data section.' }
  }
  const data = {}
  for (const [key, value] of Object.entries(payload.data)) {
    if (key.startsWith(STORAGE_PREFIX)) data[key] = value
  }
  if (!Object.keys(data).length) {
    return { ok: false, error: 'The file contains no ElectraLab data keys.' }
  }
  return { ok: true, data, exportedAt: payload.exportedAt || null }
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function recordsToCsv(records) {
  const header = 'timestamp,skill,field,source,correct,problem'
  const rows = records.map((record) => [
    record.timestamp,
    record.skill,
    record.field || '',
    record.source || '',
    record.correct ? 'true' : 'false',
    record.problem,
  ].map(csvCell).join(','))
  return [header, ...rows].join('\n')
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function storageUsage(storage, prefix = STORAGE_PREFIX) {
  const rows = []
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (typeof key !== 'string' || !key.startsWith(prefix)) continue
    const raw = storage.getItem(key) || ''
    rows.push({ key: key.slice(prefix.length), bytes: raw.length * 2 })
  }
  return rows.sort((a, b) => b.bytes - a.bytes)
}

export function clearPrefixedKeys(storage, prefix = STORAGE_PREFIX) {
  const removed = []
  for (let i = storage.length - 1; i >= 0; i -= 1) {
    const key = storage.key(i)
    if (typeof key === 'string' && key.startsWith(prefix)) {
      storage.removeItem(key)
      removed.push(key)
    }
  }
  return removed
}
