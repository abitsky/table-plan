'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDroppable } from '@dnd-kit/core'
import { supabase } from '@/lib/supabase'
import type { Guest, Table, TableShape } from '@/lib/types'

interface Props {
  eventId: string
  initialTables: Table[]
  assignments: Map<string, string>
  guests: Guest[]
}

const SHAPES: { value: TableShape; label: string }[] = [
  { value: 'rectangular', label: 'Rectangle' },
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
]

function ShapeIcon({ shape, selected }: { shape: TableShape; selected?: boolean }) {
  const base = `border-2 transition-colors ${selected ? 'border-gray-900 bg-gray-900' : 'border-gray-300 bg-white group-hover:border-gray-600'}`
  if (shape === 'rectangular') return <div className={`${base} rounded-md w-10 h-7`} />
  if (shape === 'round') return <div className={`${base} rounded-full w-8 h-8`} />
  return <div className={`${base} rounded-[50%] w-12 h-7`} />
}

function DroppableTableCard({ table, assignedGuests }: { table: Table; assignedGuests: Guest[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id })
  const overCapacity = assignedGuests.length > table.capacity

  const borderColor = overCapacity
    ? 'border-red-400'
    : isOver
    ? 'border-gray-500'
    : 'border-gray-200'
  const bgColor = overCapacity ? 'bg-red-50' : isOver ? 'bg-gray-50' : 'bg-white'

  const base = `flex flex-col items-center justify-center border-2 shadow-sm select-none transition-colors ${borderColor} ${bgColor}`
  const shapeClass =
    table.shape === 'round'
      ? `${base} rounded-full w-36 h-36`
      : table.shape === 'oval'
      ? `${base} rounded-[50%] w-48 h-36`
      : `${base} rounded-xl w-48 h-36`

  // Show only primary guests (not dependents) as name chips
  const primaryGuests = assignedGuests.filter(g => !g.host_id)
  const chips = primaryGuests.slice(0, 3)
  const extraCount = primaryGuests.length - chips.length

  return (
    <div ref={setNodeRef} className={shapeClass}>
      <span className="text-sm font-medium text-gray-800 text-center px-3 leading-tight">
        {table.name}
      </span>
      <span className={`text-xs mt-0.5 ${overCapacity ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
        {assignedGuests.length}/{table.capacity}
      </span>
      {chips.length > 0 && (
        <div className="mt-1.5 flex flex-wrap justify-center gap-0.5 px-2 max-w-full">
          {chips.map(g => (
            <span
              key={g.id}
              className="text-[10px] text-gray-500 bg-gray-100 rounded px-1 leading-5 truncate max-w-[52px]"
            >
              {g.name.split(' ')[0]}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="text-[10px] text-gray-400 leading-5">+{extraCount}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function TableCanvas({ eventId, initialTables, assignments, guests }: Props) {
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

  function pickShape(s: TableShape) {
    setShape(s)
    setStep('details')
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
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-semibold text-gray-700">
          Tables
          {tables.length > 0 && <span className="ml-1.5 text-gray-400 font-normal">{tables.length}</span>}
        </span>
        <div className="relative">
          {step === 'idle' && (
            <button
              onClick={openAdd}
              className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors font-medium"
            >
              + Add table
            </button>
          )}
          {step === 'shape' && (
            <>
              <button onClick={cancel} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
                Cancel
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
                {SHAPES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => pickShape(s.value)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <ShapeIcon shape={s.value} />
                    <span className="text-sm text-gray-700">{s.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 'details' && (
            <button onClick={cancel} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Step 2: details */}
      {step === 'details' && shape && (
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <button onClick={() => setStep('shape')} className="group flex flex-col items-center gap-1.5 flex-shrink-0">
            <ShapeIcon shape={shape} selected />
            <span className="text-xs text-gray-400 group-hover:text-gray-600">Change</span>
          </button>
          <div className="w-px h-10 bg-gray-200 flex-shrink-0" />
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') cancel()
            }}
            placeholder="Table name"
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-900 w-32"
          />
          <input
            type="number"
            min={1}
            max={30}
            value={capacity}
            onChange={e => setCapacity(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-900 w-20"
          />
          <span className="text-xs text-gray-400 flex-shrink-0">seats</span>
          <button
            onClick={handleAdd}
            disabled={!name.trim() || saving}
            className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-auto relative">
        {tables.length > 0 && (
          <div className="p-8 flex flex-wrap gap-8 content-start">
            {tables.map(t => {
              const assignedGuests = guests.filter(g => assignments.get(g.id) === t.id)
              return (
                <DroppableTableCard key={t.id} table={t} assignedGuests={assignedGuests} />
              )
            })}
          </div>
        )}
        {showEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {/* Ghost floor plan */}
            <div className="absolute inset-0 pointer-events-none select-none opacity-[0.09]">
              <div className="absolute bg-gray-900 rounded-xl" style={{ width: 280, height: 52, top: '8%', left: '50%', transform: 'translateX(-50%)' }} />
              <div className="absolute bg-gray-900 rounded-full" style={{ width: 96, height: 96, top: '24%', left: '18%' }} />
              <div className="absolute bg-gray-900 rounded-full" style={{ width: 96, height: 96, top: '24%', left: '44%', transform: 'translateX(-50%)' }} />
              <div className="absolute bg-gray-900 rounded-full" style={{ width: 96, height: 96, top: '24%', right: '18%' }} />
              <div className="absolute bg-gray-900 rounded-full" style={{ width: 96, height: 96, top: '46%', left: '12%' }} />
              <div className="absolute bg-gray-900 rounded-full" style={{ width: 96, height: 96, top: '46%', left: '44%', transform: 'translateX(-50%)' }} />
              <div className="absolute bg-gray-900 rounded-full" style={{ width: 96, height: 96, top: '46%', right: '12%' }} />
              <div className="absolute bg-gray-900 rounded-full" style={{ width: 96, height: 96, top: '68%', left: '22%' }} />
              <div className="absolute bg-gray-900 rounded-xl" style={{ width: 140, height: 80, top: '68%', left: '44%', transform: 'translateX(-50%)' }} />
              <div className="absolute bg-gray-900 rounded-full" style={{ width: 96, height: 96, top: '68%', right: '22%' }} />
            </div>
            <p className="text-sm text-gray-400 relative z-10">No tables yet</p>
            <button
              onClick={openAdd}
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors relative z-10"
            >
              Add first table
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
