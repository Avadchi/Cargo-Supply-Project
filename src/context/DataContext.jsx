import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { TABLE_NAMES } from '../lib/constants'
import { buildDemoData } from '../lib/demoData'
import {
  IDENTITY_COLUMNS,
  foldPincodeIntoAddress,
  isLegacyShipmentError,
  isPincodeTooLongError,
  normalizeRow,
  normalizeRows,
  stripIdentity,
  toDbPayload,
  toLegacyShipment,
} from '../lib/schema'

const DataContext = createContext(null)
const DEMO_KEY = 'kargo.demo.workspace.v3'

const emptyData = () =>
  TABLE_NAMES.reduce((acc, table) => {
    acc[table] = []
    return acc
  }, {})

function readDemoStore() {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.__seededAt) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeDemoStore(data) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify({ __seededAt: new Date().toISOString(), data }))
  } catch {
    // Storage can be unavailable in private browsing; in-memory data still works.
  }
}

function matchRow(row, match) {
  return Object.entries(match).every(([key, value]) => String(row[key]) === String(value))
}

export function DataProvider({ children }) {
  const [db, setDb] = useState(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState(isSupabaseConfigured ? 'supabase' : 'demo')

  const loadDemo = useCallback((fresh = false) => {
    const stored = fresh ? null : readDemoStore()
    const data = stored || buildDemoData()
    if (!stored) writeDemoStore(data)
    setDb({ ...emptyData(), ...data })
    setMode('demo')
    setError(null)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (!isSupabaseConfigured) {
      loadDemo()
      setLoading(false)
      return
    }

    try {
      const results = await Promise.all(
        TABLE_NAMES.map(async (table) => {
          const { data, error: queryError } = await supabase.from(table).select('*')
          if (queryError) throw new Error(`${table}: ${queryError.message}`)
          return [table, normalizeRows(table, data)]
        }),
      )
      const next = Object.fromEntries(results)
      setDb({ ...emptyData(), ...next })
      setMode('supabase')
    } catch (err) {
      setError(err.message || 'Could not connect to Supabase.')
    } finally {
      setLoading(false)
    }
  }, [loadDemo])

  useEffect(() => {
    load()
  }, [load])

  const persistLocal = useCallback((updater) => {
    setDb((previous) => {
      const next = updater(previous)
      writeDemoStore(next)
      return next
    })
  }, [])

  const create = useCallback(
    async (table, input) => {
      const rows = Array.isArray(input) ? input : [input]
      if (mode === 'demo' || !isSupabaseConfigured) {
        const idColumn = IDENTITY_COLUMNS[table]
        let nextIdValue = (db[table] || []).reduce(
          (max, row) => Math.max(max, Number(row[idColumn]) || 0),
          0,
        )
        const prepared = rows.map((row) => {
          if (!idColumn || row[idColumn] != null) return row
          nextIdValue += 1
          return { ...row, [idColumn]: nextIdValue }
        })
        persistLocal((previous) => ({
          ...previous,
          [table]: [...(previous[table] || []), ...prepared],
        }))
        return prepared
      }

      const payload = rows.map((row) => stripIdentity(table, toDbPayload(table, row)))
      let response = await supabase.from(table).insert(payload).select()

      if (response.error && isPincodeTooLongError(response.error) && ['supplier', 'customer'].includes(table)) {
        response = await supabase.from(table).insert(foldPincodeIntoAddress(payload)).select()
      } else if (response.error && isLegacyShipmentError(response.error) && table === 'shipment') {
        response = await supabase.from(table).insert(toLegacyShipment(payload)).select()
      }

      if (response.error) throw new Error(response.error.message)
      const inserted = normalizeRows(table, response.data || payload)
      setDb((previous) => ({
        ...previous,
        [table]: [...(previous[table] || []), ...inserted],
      }))
      return inserted
    },
    [mode, persistLocal, db],
  )

  const update = useCallback(
    async (table, match, patch) => {
      if (mode === 'demo' || !isSupabaseConfigured) {
        persistLocal((previous) => ({
          ...previous,
          [table]: (previous[table] || []).map((row) => (matchRow(row, match) ? { ...row, ...patch } : row)),
        }))
        return
      }

      const payload = toDbPayload(table, patch)
      let response = await supabase.from(table).update(payload).match(match).select()

      if (response.error && isPincodeTooLongError(response.error) && ['supplier', 'customer'].includes(table)) {
        const legacy = { ...payload }
        const pincode = legacy.pincode
        delete legacy.pincode
        if (pincode && legacy.street_city_state) legacy.street_city_state = `${legacy.street_city_state} - ${pincode}`
        response = await supabase.from(table).update(legacy).match(match).select()
      } else if (response.error && isLegacyShipmentError(response.error) && table === 'shipment') {
        const legacy = { ...payload }
        const dated = legacy.ship_date || legacy.delivery_date
        delete legacy.ship_date
        delete legacy.delivery_date
        if (dated !== undefined) legacy.ship_date_delivery_date = dated
        response = await supabase.from(table).update(legacy).match(match).select()
      }

      if (response.error) throw new Error(response.error.message)
      const updated = normalizeRow(table, response.data?.[0])
      setDb((previous) => ({
        ...previous,
        [table]: (previous[table] || []).map((row) =>
          matchRow(row, match) ? { ...row, ...patch, ...(updated || {}) } : row,
        ),
      }))
    },
    [mode, persistLocal],
  )

  const remove = useCallback(
    async (table, match) => {
      if (mode === 'demo' || !isSupabaseConfigured) {
        persistLocal((previous) => ({
          ...previous,
          [table]: (previous[table] || []).filter((row) => !matchRow(row, match)),
        }))
        return
      }

      const { error: deleteError } = await supabase.from(table).delete().match(match)
      if (deleteError) throw new Error(deleteError.message)
      setDb((previous) => ({
        ...previous,
        [table]: (previous[table] || []).filter((row) => !matchRow(row, match)),
      }))
    },
    [mode, persistLocal],
  )

  const nextId = useCallback(
    (table, column) => {
      const rows = db[table] || []
      const max = rows.reduce((current, row) => Math.max(current, Number(row[column]) || 0), 0)
      return max + 1
    },
    [db],
  )

  const resetDemo = useCallback(() => {
    localStorage.removeItem(DEMO_KEY)
    loadDemo(true)
  }, [loadDemo])

  const value = useMemo(
    () => ({
      db,
      loading,
      error,
      mode,
      isSupabaseConfigured,
      create,
      update,
      remove,
      nextId,
      refresh: load,
      loadDemo,
      resetDemo,
    }),
    [db, loading, error, mode, create, update, remove, nextId, load, loadDemo, resetDemo],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside a DataProvider')
  return context
}
