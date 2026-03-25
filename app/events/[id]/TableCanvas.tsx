'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Table, TableShape } from '@/lib/types'

interface Props {
  eventId: string
  initialTables: Table[]
}

function TableVisual({ shape, selected, onClick, dim }: {
  shape: TableShape
  selected?: boolean
  onClick?: () => void
  dim?: boolean
}) {
  const ring = selected ? 'border-gray-900' : 'border-gray-300 hover:border-gray-500'
  const bg = selected ? 'bg-gray-900' : 'bg-white'
  const base = `border-2 transition-all cursor-pointer ${ring} ${bg} ${dim ? 'opacity-40' : ''}`
  if (shape === 'round') return <div onClick={onClick} className={`${base} rounded-full w-20 h-20`} />
  if (shape === 'oval') return <div onClick={onClick} className={`${base} rounded-[50%] w-28 h-20`} />
  return <div onClick={onClick} className={`${base} rounded-xl w-28 h-20`} />
}

function TableCard({ table }: { table: Table }) {
  const base = 'flex flex-col items-center justify-center bg-white border-2 border-gray-200 shadow-sm select-none'
  const shape =
    table.shape === 'round'
      ? `${base} rounded-full w-32 h-32`
      : table.shape === 'oval'
      ? `${base} rounded-[50%] w-44 h-32`
      : `${base} rounded-xl w-44 h-32`
  return (
    <div className={shape}>
      <span className="text-sm font-medium text-gray-800 text-center px-3 leading-tight">{table.name}</span>
      <span className="text-xs text-gray-400 mt-1">{table.capacity} seats</span>
    </div>
  )
}

export default function TableCanvas({ eventId, initialTables }: Props) {
  const [tables, setTables] = useState(initialTables)
  const [step, setStep] = useState<'idle' | 'shape' | 'details'>('idle')
  const [shape, setShape] = useState<TableShape | null>(null)
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState(8)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (step === 'details') nameRef.current?.focus()
  }, [step])

  function openAdd() {
    setStep('shape')
    setShape(null)
    setName(`Table ${tables.length + 1}`)
    setCapacity(8)
  }

  function cancel() {
    setStep('idle')
    setShape(null)
  }

  async function handleAdd() {
    if (!shape || !name.trim() || saving) return
    setSaving(true)
    const { data } = await supabase
      .from('tables')
      .insert({ event_id: eventId, name: name.trim(), shape, capacity })
      .select()
      .single()
    if (data) setTables(prev => [...prev, data as Table])
    setStep('idle')
    setShape(null)
    setSaving(false)
    router.refresh()
  }

  const showEmpty = tables.length === 0 && step === 'idle'

  return (
    <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
      {/* Header — only show once tables exist */}
      {tables.length > 0 && (
        <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700">
            Tables
            <span className="ml-1.5 text-gray-400 font-normal">{tables.length}</span>
          </span>
          {step === 'idle' && (
            <button
              onClick={openAdd}
              className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors font-medium"
            >
              + Add table
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto relative">
        {/* Existing tables */}
        {tables.length > 0 && (
          <div className="p-8 flex flex-wrap gap-8 content-start">
            {tables.map(t => <TableCard key={t.id} table={t} />)}
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-gray-400">No tables yet</p>
            <button
              onClick={openAdd}
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Add first table
            </button>
          </div>
        )}

        {/* Step 1: Shape picker */}
        {step === 'shape' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-96">
              <h3 className="text-sm font-semibold text-gray-800 mb-6">What shape is this table?</h3>
              <div className="flex items-end justify-center gap-8 mb-8">
                {(['round', 'rectangular', 'oval'] as TableShape[]).map(s => (
                  <div key={s} className="flex flex-col items-center gap-3">
                    <TableVisual
                      shape={s}
                      selected={shape === s}
                      onClick={() => { setShape(s); setStep('details') }}
                    />
                    <span className="text-xs text-gray-500 capitalize">{s}</span>
                  </div>
                ))}
              </div>
              <button onClick={cancel} className="text-xs text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Name + capacity */}
        {step === 'details' && shape && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-80">
              <div className="flex justify-center mb-6">
                <TableVisual shape={shape} selected />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Table name</label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAdd()
                      if (e.key === 'Escape') cancel()
                    }}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Number of seats</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={capacity}
                    onChange={e => setCapacity(Number(e.target.value))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleAdd}
                  disabled={!name.trim() || saving}
                  className="flex-1 text-sm bg-gray-900 text-white py-2 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  {saving ? 'Adding…' : 'Add table'}
                </button>
                <button
                  onClick={() => setStep('shape')}
                  className="text-sm text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
