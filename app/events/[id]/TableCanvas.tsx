'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDroppable, useDraggable, useDndContext } from '@dnd-kit/core'
import { supabase } from '@/lib/supabase'
import type { Guest, Table, TableShape } from '@/lib/types'
import type { SeatInfo } from './SeatingWorkspace'

interface Props {
  eventId: string
  tables: Table[]
  assignments: Map<string, SeatInfo>
  guests: Guest[]
  isDragging: boolean
  blockedTableId?: string | null
  onAddTable: (table: Table) => void
  onUpdateTable: (id: string, name: string, capacity: number, headSeats: number) => void
  onDeleteTable: (id: string) => void
  onScootTable: (id: string, direction: 'cw' | 'ccw') => void
}

const TITLE_PREFIXES = new Set(['dr.', 'mr.', 'mrs.', 'ms.', 'prof.', 'rev.', 'mx.', 'sir'])

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length > 1 && TITLE_PREFIXES.has(parts[0].toLowerCase())) {
    return `${parts[0]} ${parts[1]}`
  }
  return parts[0]
}

const SHAPES: { value: TableShape; label: string }[] = [
  { value: 'rectangular', label: 'Rectangle' },
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
]

function ShapeButton({ shape, onClick }: { shape: TableShape; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={SHAPES.find(s => s.value === shape)?.label}
      className="w-9 h-9 flex items-center justify-center bg-gray-100 border border-transparent rounded-lg hover:bg-white hover:border-gray-400 transition-colors"
    >
      <ShapePreview shape={shape} dark />
    </button>
  )
}

function ShapePreview({ shape, dark, accent }: { shape: TableShape; dark?: boolean; accent?: boolean }) {
  const fill = accent ? 'bg-indigo-500' : dark ? 'bg-gray-900' : 'bg-gray-300'
  if (shape === 'rectangular') return <div className={`${fill} rounded w-9 h-6`} />
  if (shape === 'round') return <div className={`${fill} rounded-full w-7 h-7`} />
  return <div className={`${fill} rounded-[50%] w-10 h-6`} />
}

// A single seat that is both a drop target and (if occupied) draggable
function DraggableSeat({
  tableId,
  seatIndex,
  guest,
  isExpanded,
  isHead = false,
}: {
  tableId: string
  seatIndex: number
  guest: Guest | null
  isExpanded: boolean
  isHead?: boolean
}) {
  const droppableId = `seat:${tableId}:${seatIndex}`
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: droppableId,
    disabled: !isExpanded,
  })
  const { setNodeRef: setDragRef, attributes, listeners, isDragging } = useDraggable({
    id: guest?.id ?? `empty-${droppableId}`,
    disabled: !guest || !isExpanded,
  })

  return (
    <div
      ref={(node) => { setDropRef(node); setDragRef(node) }}
      {...(guest ? { ...listeners, ...attributes } : {})}
      className={`w-8 h-8 ${isHead ? 'rounded-md' : 'rounded-full'} flex items-center justify-center text-[10px] leading-tight text-center overflow-hidden transition-all ${
        isDragging
          ? 'opacity-30 border-2 border-dashed border-gray-300'
          : isOver
          ? 'ring-2 ring-gray-900 ring-offset-1'
          : guest
          ? 'bg-gray-100 text-gray-700 font-medium cursor-grab active:cursor-grabbing'
          : isHead
          ? 'border-2 border-dashed border-gray-400'
          : 'border-2 border-dashed border-gray-300'
      }`}
      suppressHydrationWarning
    >
      {guest && !isDragging ? guest.name.split(' ')[0].slice(0, 7) : ''}
    </div>
  )
}

// Seats in a circle (round and oval tables)
function CircularSeats({ table, seatGuests, isExpanded }: { table: Table; seatGuests: (Guest | null)[]; isExpanded: boolean }) {
  const n = table.capacity
  const isOval = table.shape === 'oval'
  const R = Math.min(90, Math.max(48, n * 6))
  const Rx = isOval ? R * 1.35 : R
  const Ry = R
  const pad = 22
  const cx = Math.round(Rx + pad)
  const cy = Math.round(Ry + pad)
  const width = cx * 2
  const height = cy * 2

  return (
    <div className="relative flex-shrink-0" style={{ width, height }}>
      {Array.from({ length: n }, (_, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2
        const x = Math.round(cx + Rx * Math.cos(angle))
        const y = Math.round(cy + Ry * Math.sin(angle))
        return (
          <div key={i} style={{ position: 'absolute', left: x - 16, top: y - 16 }}>
            <DraggableSeat
              tableId={table.id}
              seatIndex={i}
              guest={seatGuests[i] ?? null}
              isExpanded={isExpanded}
            />
          </div>
        )
      })}
    </div>
  )
}

// Seats in two rows (rectangular tables), with optional head seats at left/right ends
function LinearSeats({ table, seatGuests, isExpanded }: { table: Table; seatGuests: (Guest | null)[]; isExpanded: boolean }) {
  const n = table.capacity
  const half = Math.ceil(n / 2)
  const heads = table.head_seats ?? 0

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      {/* Left head seat */}
      {heads >= 1 && (
        <DraggableSeat
          tableId={table.id}
          seatIndex={n}
          guest={seatGuests[n] ?? null}
          isExpanded={isExpanded}
          isHead
        />
      )}
      {/* Side seats: two rows */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex gap-1 justify-center">
          {Array.from({ length: half }, (_, i) => (
            <DraggableSeat
              key={i}
              tableId={table.id}
              seatIndex={i}
              guest={seatGuests[i] ?? null}
              isExpanded={isExpanded}
            />
          ))}
        </div>
        {n - half > 0 && (
          <div className="flex gap-1 justify-center">
            {Array.from({ length: n - half }, (_, i) => (
              <DraggableSeat
                key={half + i}
                tableId={table.id}
                seatIndex={half + i}
                guest={seatGuests[half + i] ?? null}
                isExpanded={isExpanded}
              />
            ))}
          </div>
        )}
      </div>
      {/* Right head seat */}
      {heads >= 2 && (
        <DraggableSeat
          tableId={table.id}
          seatIndex={n + 1}
          guest={seatGuests[n + 1] ?? null}
          isExpanded={isExpanded}
          isHead
        />
      )}
    </div>
  )
}

function DroppableTableCard({
  table,
  seatGuests,
  assignedCount,
  isSelected,
  isBlocked,
  onSelect,
  onDeselect,
  onUpdate,
  onDelete,
  onScoot,
  isDragging,
}: {
  table: Table
  seatGuests: (Guest | null)[]
  assignedCount: number
  isSelected: boolean
  isBlocked: boolean
  onSelect: () => void
  onDeselect: () => void
  onUpdate: (name: string, capacity: number, headSeats: number) => void
  onDelete: () => void
  onScoot: (direction: 'cw' | 'ccw') => void
  isDragging: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id })
  const { over } = useDndContext()
  // Also treat the table as hovered when a seat within it is the drop target.
  // Without this, expanding the table (which mounts seat droppables) causes
  // collision detection to switch to a seat, collapsing the table, which
  // unmounts seats, switching back to the table — an infinite loop.
  const isOverSeat = over?.id != null && String(over.id).startsWith(`seat:${table.id}:`)
  const isHovered = isOver || isOverSeat

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(table.name)
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [capacityValue, setCapacityValue] = useState(table.capacity)
  const [headSeatsValue, setHeadSeatsValue] = useState(table.head_seats ?? 0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const totalCapacity = capacityValue + headSeatsValue
  const overCapacity = assignedCount > totalCapacity

  const borderColor = overCapacity
    ? 'border-red-400'
    : isSelected || isHovered
    ? 'border-gray-600'
    : 'border-gray-200'
  const bgColor = overCapacity ? 'bg-red-50' : isSelected || isHovered ? 'bg-gray-50' : 'bg-white'
  const base = `flex flex-col items-center border-2 shadow-sm select-none transition-all duration-200 ${borderColor} ${bgColor}`

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (isDragging) return
    if (isSelected) onDeselect()
    else onSelect()
  }

  function saveName() {
    const trimmed = nameValue.trim()
    if (!trimmed) { setNameValue(table.name); setEditingName(false); return }
    setEditingName(false)
    onUpdate(trimmed, capacityValue, headSeatsValue)
  }

  function saveCapacity() {
    const val = Math.max(1, Math.min(30, capacityValue))
    setCapacityValue(val)
    setEditingCapacity(false)
    onUpdate(nameValue.trim() || table.name, val, headSeatsValue)
  }

  const isExpanded = isSelected || isHovered

  // Expanded view
  if (isExpanded) {
    const shapeClass =
      table.shape === 'round'
        ? `${base} relative rounded-full p-4 cursor-pointer`
        : table.shape === 'oval'
        ? `${base} relative rounded-[50%] p-4 cursor-pointer`
        : `${base} relative rounded-xl p-4 cursor-pointer`

    return (
      <div ref={setNodeRef} className={shapeClass} onClick={handleClick}>
        {/* Blocked overlay */}
        <div className={`absolute inset-0 rounded-xl flex items-center justify-center z-10 pointer-events-none transition-opacity duration-300 ${isBlocked ? 'opacity-100 bg-amber-50/90' : 'opacity-0'}`}>
          <div className="px-3 py-2 text-center max-w-[160px]">
            <p className="text-xs font-semibold text-amber-800 leading-tight">Can't seat couple side-by-side.</p>
            <p className="text-[10px] text-amber-700 mt-1 leading-tight">Add a head seat to connect the two open spots.</p>
          </div>
        </div>

        {/* Deselect button — top-right corner */}
        {isSelected && (
          <button
            onClick={e => { e.stopPropagation(); onDeselect() }}
            className="absolute top-2 right-2 text-gray-300 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        )}

        {/* Name row */}
        <div className="flex items-center gap-1.5 mb-0.5 w-full" onClick={e => e.stopPropagation()}>
          {isSelected && editingName ? (
            <input
              autoFocus
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') { setNameValue(table.name); setEditingName(false) }
              }}
              className="text-sm font-semibold text-center border-b border-gray-400 bg-transparent outline-none w-full"
            />
          ) : (
            <span
              className={`text-sm font-semibold text-gray-800 text-center leading-tight break-words w-full ${isSelected ? 'hover:text-gray-500 cursor-text' : ''}`}
              onClick={isSelected ? () => setEditingName(true) : undefined}
            >
              {nameValue}
            </span>
          )}
        </div>

        {/* Seat count */}
        <div className="mb-2" onClick={e => e.stopPropagation()}>
          {isSelected && editingCapacity ? (
            <input
              autoFocus
              type="number"
              min={1}
              max={30}
              value={capacityValue}
              onChange={e => setCapacityValue(Number(e.target.value))}
              onBlur={saveCapacity}
              onKeyDown={e => {
                if (e.key === 'Enter') saveCapacity()
                if (e.key === 'Escape') { setCapacityValue(table.capacity); setEditingCapacity(false) }
              }}
              className="text-xs text-center border-b border-gray-400 bg-transparent outline-none w-10"
            />
          ) : (
            <span
              className={`text-xs ${overCapacity ? 'text-red-500 font-semibold' : 'text-gray-400'} ${isSelected ? 'hover:text-gray-600 cursor-pointer' : ''}`}
              onClick={isSelected ? () => setEditingCapacity(true) : undefined}
            >
              {assignedCount}/{totalCapacity}
            </span>
          )}
        </div>

        {/* Seat layout */}
        {table.shape === 'rectangular' ? (
          <LinearSeats table={{ ...table, capacity: capacityValue }} seatGuests={seatGuests} isExpanded={true} />
        ) : (
          <CircularSeats table={{ ...table, capacity: capacityValue }} seatGuests={seatGuests} isExpanded={true} />
        )}

        {/* Head seats stepper — only for rectangular tables when selected */}
        {isSelected && table.shape === 'rectangular' && (
          <div className="mt-2 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Heads</span>
            <button
              onClick={() => {
                const v = Math.max(0, headSeatsValue - 1)
                setHeadSeatsValue(v)
                onUpdate(nameValue.trim() || table.name, capacityValue, v)
              }}
              className="w-5 h-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >−</button>
            <span className="text-xs tabular-nums w-3 text-center text-gray-600">{headSeatsValue}</span>
            <button
              onClick={() => {
                const v = Math.min(2, headSeatsValue + 1)
                setHeadSeatsValue(v)
                onUpdate(nameValue.trim() || table.name, capacityValue, v)
              }}
              className="w-5 h-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >+</button>
          </div>
        )}

        {/* Scoot controls */}
        {isSelected && (
          <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onScoot('ccw')}
              disabled={isDragging}
              className="text-base text-gray-300 hover:text-gray-600 transition-colors disabled:opacity-30"
              title="Rotate seats counter-clockwise"
            >↺</button>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Scoot</span>
            <button
              onClick={() => onScoot('cw')}
              disabled={isDragging}
              className="text-base text-gray-300 hover:text-gray-600 transition-colors disabled:opacity-30"
              title="Rotate seats clockwise"
            >↻</button>
          </div>
        )}

        {/* Delete controls */}
        {isSelected && (
          <div className="mt-3" onClick={e => e.stopPropagation()}>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Delete table?</span>
                <button onClick={onDelete} className="text-xs text-red-500 font-medium hover:text-red-700">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">
                Delete table
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Compact view
  const shapeClass =
    table.shape === 'round'
      ? `${base} relative rounded-3xl w-48 min-h-[10rem] py-4 cursor-pointer`
      : table.shape === 'oval'
      ? `${base} relative rounded-[50%] w-64 min-h-[10rem] py-4 cursor-pointer`
      : `${base} relative rounded-xl w-60 min-h-[10rem] py-3 cursor-pointer`

  const assignedNames = seatGuests.filter(Boolean).map(g => shortName(g!.name))

  return (
    <div ref={setNodeRef} className={shapeClass} onClick={handleClick}>
      {/* Blocked overlay */}
      <div className={`absolute inset-0 rounded-[inherit] flex items-center justify-center z-10 pointer-events-none transition-opacity duration-300 ${isBlocked ? 'opacity-100 bg-amber-50/90' : 'opacity-0'}`}>
        <div className="px-3 py-2 text-center max-w-[160px]">
          <p className="text-xs font-semibold text-amber-800 leading-tight">Can't seat couple side-by-side.</p>
          <p className="text-[10px] text-amber-700 mt-1 leading-tight">Add a head seat to connect the two open spots.</p>
        </div>
      </div>
      <span className="text-sm font-medium text-gray-800 text-center px-3 leading-tight">
        {nameValue}
      </span>
      <span className={`text-xs mt-0.5 ${overCapacity ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
        {assignedCount}/{totalCapacity}
      </span>
      {assignedNames.length > 0 && (
        <div className="mt-1.5 flex flex-wrap justify-center gap-0.5 px-2 max-w-full">
          {assignedNames.map((name, i) => (
            <span key={i} className="text-[10px] text-gray-500 bg-gray-100 rounded px-1 leading-5">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TableCanvas({ eventId, tables, assignments, guests, isDragging, blockedTableId, onAddTable, onUpdateTable, onDeleteTable, onScootTable }: Props) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [step, setStep] = useState<'shapes' | 'details'>('shapes')
  const [shape, setShape] = useState<TableShape | null>(null)
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState(10)
  const [headSeats, setHeadSeats] = useState(0)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (step === 'details') nameRef.current?.focus()
  }, [step])

  function pickShape(s: TableShape) {
    setShape(s)
    setName(`Table ${tables.length + 1}`)
    setCapacity(10)
    setHeadSeats(0)
    setStep('details')
  }

  function cancel() {
    setStep('shapes')
    setShape(null)
    setHeadSeats(0)
  }

  async function handleAdd() {
    if (!shape || !name.trim() || saving) return
    setSaving(true)
    const { data } = await supabase
      .from('tables')
      .insert({ event_id: eventId, name: name.trim(), shape, capacity, head_seats: headSeats })
      .select()
      .single()
    if (data) onAddTable(data as Table)
    setStep('shapes')
    setShape(null)
    setSaving(false)
    router.refresh()
  }

  async function handleUpdateTable(id: string, newName: string, newCapacity: number, newHeadSeats: number) {
    onUpdateTable(id, newName, newCapacity, newHeadSeats)
    await supabase.from('tables').update({ name: newName, capacity: newCapacity, head_seats: newHeadSeats }).eq('id', id)
  }

  async function handleDeleteTable(id: string) {
    setSelectedTableId(null)
    onDeleteTable(id)
    await supabase.from('tables').delete().eq('id', id)
    await supabase.from('seat_assignments').delete().eq('table_id', id)
    router.refresh()
  }

  // Build seat-indexed guest arrays for each table (includes head seat indices)
  function getSeatGuests(tableId: string, total: number): (Guest | null)[] {
    const arr: (Guest | null)[] = new Array(total).fill(null)
    for (const [guestId, info] of assignments) {
      if (info.tableId === tableId && info.seatNumber != null && info.seatNumber < total) {
        const guest = guests.find(g => g.id === guestId)
        if (guest) arr[info.seatNumber] = guest
      }
    }
    return arr
  }

  return (
    <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center flex-shrink-0">
        <span className="text-sm font-semibold text-gray-700">
          Tables
          {tables.length > 0 && <span className="ml-1.5 text-gray-400 font-normal">{tables.length}</span>}
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto relative" onClick={() => setSelectedTableId(null)}>
        {tables.length > 0 && (
          <div className="p-8 flex flex-wrap gap-8 content-start">
            {tables.map(t => {
              const total = t.capacity + (t.head_seats ?? 0)
              const seatGuests = getSeatGuests(t.id, total)
              const assignedCount = seatGuests.filter(Boolean).length
              return (
                <DroppableTableCard
                  key={t.id}
                  table={t}
                  seatGuests={seatGuests}
                  assignedCount={assignedCount}
                  isSelected={selectedTableId === t.id}
                  isBlocked={blockedTableId === t.id}
                  onSelect={() => setSelectedTableId(t.id)}
                  onDeselect={() => setSelectedTableId(null)}
                  onUpdate={(n, c, h) => handleUpdateTable(t.id, n, c, h)}
                  onDelete={() => handleDeleteTable(t.id)}
                  onScoot={(d) => onScootTable(t.id, d)}
                  isDragging={isDragging}
                />
              )
            })}
          </div>
        )}
        {tables.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
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
            <p className="text-sm text-gray-400 relative z-10">Pick a shape below to add your first table</p>
          </div>
        )}
      </div>

      {/* Editing bar */}
      <div className="px-4 py-3 flex-shrink-0">
        {step === 'shapes' && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Add table</span>
            {SHAPES.map(s => (
              <ShapeButton key={s.value} shape={s.value} onClick={() => pickShape(s.value)} />
            ))}
          </div>
        )}

        {step === 'details' && shape && (
          <div className="flex items-center gap-2">
            <button onClick={cancel} className="flex items-center gap-1.5 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors" title="Back to shape picker">
              <span className="text-sm">←</span>
              <ShapePreview shape={shape} accent />
            </button>
            <div className="w-px h-8 bg-gray-200 flex-shrink-0 mx-1" />
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
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-900 w-28 flex-shrink-0"
            />
            <div className="w-px h-8 bg-gray-200 flex-shrink-0 mx-1" />
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setCapacity(c => Math.max(1, c - 1))}
                className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
              >−</button>
              <div className="flex items-center border border-gray-300 rounded px-2 py-1 focus-within:border-gray-900 bg-white gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={capacity}
                  onChange={e => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val)) setCapacity(Math.max(1, Math.min(30, val)))
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') cancel()
                  }}
                  className="text-sm text-center bg-transparent outline-none w-6 tabular-nums"
                />
                <span className="text-xs text-gray-400 select-none">seats</span>
              </div>
              <button
                onClick={() => setCapacity(c => Math.min(30, c + 1))}
                className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
              >+</button>
            </div>
            {shape === 'rectangular' && (
              <>
                <div className="w-px h-8 bg-gray-200 flex-shrink-0 mx-1" />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setHeadSeats(h => Math.max(0, h - 1))}
                    className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
                  >−</button>
                  <div className="flex items-center border border-gray-300 rounded px-2 py-1 bg-white gap-1">
                    <span className="text-sm text-center tabular-nums w-4">{headSeats}</span>
                    <span className="text-xs text-gray-400 select-none">heads</span>
                  </div>
                  <button
                    onClick={() => setHeadSeats(h => Math.min(2, h + 1))}
                    className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
                  >+</button>
                </div>
              </>
            )}
            <button
              onClick={handleAdd}
              disabled={!name.trim() || saving}
              className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors flex-shrink-0"
            >
              {saving ? 'Adding...' : 'Add'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
