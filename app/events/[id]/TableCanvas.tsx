'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Table, TableShape } from '@/lib/types'

interface Props {
  eventId: string
  initialTables: Table[]
}

const SHAPES: { value: TableShape; label: string }[] = [
  { value: 'round', label: 'Round' },
  { value: 'rectangular', label: 'Rectangular' },
  { value: 'oval', label: 'Oval' },
]

function TableShape({ table }: { table: Table }) {
  const base = 'flex flex-col items-center justify-center bg-white border-2 border-gray-300 shadow-sm select-none'
  const shape =
    table.shape === 'round'
      ? `${base} rounded-full w-32 h-32`
      : table.shape === 'oval'
      ? `${base} rounded-[50%] w-40 h-28`
      : `${base} rounded-xl w-40 h-28`

  return (
    <div className={shape}>
      <span className="text-sm font-medium text-gray-800 text-center px-2 leading-tight">{table.name}</span>
      <span className="text-xs text-gray-400 mt-1">{table.capacity} seats</span>
    </div>
  )
}

export default function TableCanvas({ eventId, initialTables }: Props) {
  const [tables, setTables] = useState(initialTables)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [shape, setShape] = useState<TableShape>('round')
  const [capacity, setCapacity] = useState(8)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  function openAdd() {
    setAdding(true)
    setName(`Table ${tables.length + 1}`)
    setShape('round')
    setCapacity(8)
  }

  async function handleAdd() {
    if (!name.trim() || saving) return
    setSaving(true)
    const { data } = await supabase
      .from('tables')
      .insert({ event_id: eventId, name: name.trim(), shape, capacity })
      .select()
      .single()
    if (data) setTables(prev => [...prev, data as Table])
    setAdding(false)
    setSaving(false)
    router.refresh()
  }

  if (tables.length === 0 && !adding) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 border-r border-gray-200">
        <p className="text-sm text-gray-400">No tables yet</p>
        <button
          onClick={openAdd}
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Add first table
        </button>
        {adding && <AddTablePanel />}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-semibold text-gray-700">
          Tables
          {tables.length > 0 && <span className="ml-1.5 text-gray-400 font-normal">{tables.length}</span>}
        </span>
        <button
          onClick={openAdd}
          className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors font-medium"
        >
          + Add table
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="flex flex-wrap gap-8 content-start">
          {tables.map(t => (
            <TableShape key={t.id} table={t} />
          ))}
        </div>
      </div>

      {adding && (
        <div className="border-t border-gray-100 bg-white px-5 py-4 flex-shrink-0">
          <AddTablePanel />
        </div>
      )}
    </div>
  )

  function AddTablePanel() {
    return (
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Name</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') setAdding(false)
            }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-900 w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Shape</label>
          <div className="flex gap-1">
            {SHAPES.map(s => (
              <button
                key={s.value}
                onClick={() => setShape(s.value)}
                className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                  shape === s.value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Seats</label>
          <input
            type="number"
            min={1}
            max={30}
            value={capacity}
            onChange={e => setCapacity(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-900 w-20"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            disabled={!name.trim() || saving}
            className="text-xs bg-gray-900 text-white px-3 py-2 rounded-lg disabled:opacity-40"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
          <button
            onClick={() => setAdding(false)}
            className="text-xs text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }
}
