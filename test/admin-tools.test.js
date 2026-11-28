import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SETTINGS,
  buildExportPayload,
  clearPrefixedKeys,
  collectStorageData,
  formatBytes,
  recordsToCsv,
  settingsWithDefaults,
  storageUsage,
  validateImportPayload,
} from '../src/adminTools.js'

function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed))
  return {
    get length() { return map.size },
    key: (i) => [...map.keys()][i],
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  }
}

test('settingsWithDefaults merges and clamps user settings', () => {
  assert.deepEqual(settingsWithDefaults(null), DEFAULT_SETTINGS)
  assert.deepEqual(settingsWithDefaults('garbage'), DEFAULT_SETTINGS)
  assert.deepEqual(settingsWithDefaults({}), DEFAULT_SETTINGS)
  assert.deepEqual(settingsWithDefaults({ speechRate: 0.1, reduceMotion: true }), { speechRate: 0.5, reduceMotion: true })
  assert.deepEqual(settingsWithDefaults({ speechRate: 9 }), { speechRate: 2, reduceMotion: false })
})

test('collectStorageData only picks up electralab keys and parses JSON', () => {
  const storage = fakeStorage({
    'electralab-progress': '{"records":[{"correct":true}]}',
    'electralab-ollama-model': 'qwen2.5:3b',
    'other-app-key': 'skip me',
  })
  const data = collectStorageData(storage)
  assert.deepEqual(data['electralab-progress'], { records: [{ correct: true }] })
  assert.equal(data['electralab-ollama-model'], 'qwen2.5:3b')
  assert.ok(!('other-app-key' in data))
})

test('export payloads validate back in and reject foreign files', () => {
  const payload = buildExportPayload({ 'electralab-progress': { records: [] } }, { records: 0 })
  const result = validateImportPayload(payload)
  assert.equal(result.ok, true)
  assert.deepEqual(result.data, { 'electralab-progress': { records: [] } })

  assert.equal(validateImportPayload(null).ok, false)
  assert.equal(validateImportPayload('text').ok, false)
  assert.equal(validateImportPayload({ app: 'calculust', data: {} }).ok, false)
  assert.equal(validateImportPayload({ app: 'electra-lab-wrong', data: { 'electralab-progress': {} } }).ok, false)
  assert.equal(validateImportPayload({ app: 'electralab' }).ok, false)
  assert.equal(validateImportPayload({ app: 'electralab', data: { 'foreign-key': 1 } }).ok, false)
})

test('import validation strips non-electralab keys', () => {
  const payload = {
    app: 'electralab',
    data: { 'electralab-settings': { speechRate: 1.5 }, 'evil-key': 'rm -rf' },
  }
  const result = validateImportPayload(payload)
  assert.equal(result.ok, true)
  assert.deepEqual(result.data, { 'electralab-settings': { speechRate: 1.5 } })
})

test('recordsToCsv escapes quotes and lists every record', () => {
  const csv = recordsToCsv([
    { timestamp: '2026-01-01T00:00:00Z', skill: "Ohm's Law", field: '', source: 'practice', correct: true, problem: 'A "tricky" one' },
    { timestamp: '2026-01-02T00:00:00Z', skill: 'Diode Equation', field: 'Semiconductor Devices', source: 'applied', correct: false, problem: 'Find I' },
  ])
  const lines = csv.split('\n')
  assert.equal(lines[0], 'timestamp,skill,field,source,correct,problem')
  assert.equal(lines.length, 3)
  assert.match(lines[1], /"A ""tricky"" one"/)
  assert.match(lines[2], /Semiconductor Devices/)
})

test('storageUsage reports sizes sorted descending without the prefix', () => {
  const storage = fakeStorage({
    'electralab-big': 'x'.repeat(1000),
    'electralab-small': 'x'.repeat(10),
    'unrelated': 'x'.repeat(5000),
  })
  const usage = storageUsage(storage)
  assert.deepEqual(usage.map((row) => row.key), ['big', 'small'])
  assert.equal(formatBytes(usage[0].bytes), '2.0 KB')
  assert.equal(formatBytes(20), '20 B')
  assert.equal(formatBytes(3 * 1024 * 1024), '3.00 MB')
})

test('clearPrefixedKeys removes only electralab keys', () => {
  const storage = fakeStorage({
    'electralab-a': '1',
    'electralab-b': '2',
    'keep-me': '3',
  })
  const removed = clearPrefixedKeys(storage)
  assert.deepEqual(removed.sort(), ['electralab-a', 'electralab-b'])
  assert.equal(storage.length, 1)
  assert.equal(storage.getItem('keep-me'), '3')
})
