'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { supabase } from '@/lib/supabase'
import type { Guest, Table, SeatAssignment, TableShape } from '@/lib/types'
import TableCanvas from './TableCanvas'
import GuestList from './GuestList'

export type SeatInfo = { tableId: string; seatNumber: number | null }

interface Props {
  eventId: string
  projectId: string
  guests: Guest[]
  tables: Table[]
  initialAssignments: SeatAssignment[]
  siblingEvents: { id: string; name: string }[]
}

// Returns all seats adjacent to `a` on the given table layout
function getAdjacents(a: number, capacity: number, headSeats: number, shape: TableShape): number[] {
  const total = capacity + headSeats
  const result: number[] = []
  for (let b = 0; b < total; b++) {
    if (b !== a && isAdjacent(a, b, capacity, headSeats, shape)) result.push(b)
  }
  return result
}

function isAdjacent(a: number, b: number, capacity: number, headSeats: number, shape: TableShape): boolean {
  if (shape === 'round' || shape === 'oval') {
    return Math.abs(a - b) === 1 || (a === 0 && b === capacity - 1) || (b === 0 && a === capacity - 1)
  }
  const half = Math.ceil(capacity / 2)
  // Left head (index = capacity): adjacent to seat 0 (top-left) and seat half (bottom-left)
  if (headSeats >= 1) {
    const lh = capacity
    if ((a === lh && (b === 0 || b === half)) || (b === lh && (a === 0 || a === half))) return true
  }
  // Right head (index = capacity+1): adjacent to seat half-1 (top-right) and seat capacity-1 (bottom-right)
  if (headSeats >= 2) {
    const rh = capacity + 1
    if ((a === rh && (b === half - 1 || b === capacity - 1)) || (b === rh && (a === half - 1 || a === capacity - 1))) return true
  }
  // Same-row adjacency
  return ((a < half && b < half) || (a >= half && b >= half)) && Math.abs(a - b) === 1
}

// Returns seat indices in clockwise perimeter order for rectangular tables with heads
function perimeterOrder(capacity: number, headSeats: number): number[] {
  const half = Math.ceil(capacity / 2)
  const order: number[] = []
  for (let i = 0; i < half; i++) order.push(i)             // top row →
  if (headSeats >= 2) order.push(capacity + 1)              // right head
  for (let i = capacity - 1; i >= half; i--) order.push(i) // bottom row ←
  if (headSeats >= 1) order.push(capacity)                   // left head
  return order
}

const POINTER_SENSOR_OPTIONS = { activationConstraint: { distance: 5 } }

function DragChip({ name }: { name: string }) {
  return (
    <div style={{
      background: 'white',
      border: '1.5px solid #111827',
      borderRadius: '6px',
      padding: '6px 14px',
      fontSize: '13px',
      fontWeight: 500,
      color: '#111827',
      whiteSpace: 'nowrap',
      cursor: 'grabbing',
      userSelect: 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    }}>
      {name}
    </div>
  )
}

function parseDrop(id: string) {
  const s = String(id)
  if (s === 'guest-list') return { type: 'guestList' as const }
  if (s.startsWith('seat:')) {
    const parts = s.split(':')
    return { type: 'seat' as const, tableId: parts[1], seatIndex: Number(parts[2]) }
  }
  return { type: 'table' as const, tableId: s }
}

export default function SeatingWorkspace({
  eventId,
  projectId,
  guests,
  tables: initialTables,
  initialAssignments,
  siblingEvents,
}: Props) {
  // Lifted table state so handleDragEnd can access capacity/shape
  const [tables, setTables] = useState(initialTables)

  const [assignments, setAssignments] = useState<Map<string, SeatInfo>>(() => {
    const map = new Map<string, SeatInfo>()
    const needsSeat: { guestId: string; tableId: string }[] = []
    for (const a of initialAssignments) {
      if (a.table_id) {
        if (a.seat_number != null) {
          map.set(a.guest_id, { tableId: a.table_id, seatNumber: a.seat_number })
        } else {
          needsSeat.push({ guestId: a.guest_id, tableId: a.table_id })
        }
      }
    }
    // Auto-assign seat numbers for any rows that don't have them yet
    const byTable = new Map<string, string[]>()
    for (const { guestId, tableId } of needsSeat) {
      const arr = byTable.get(tableId) ?? []
      arr.push(guestId)
      byTable.set(tableId, arr)
    }
    for (const [tableId, guestIds] of byTable) {
      const taken = new Set<number>()
      for (const [, info] of map) {
        if (info.tableId === tableId && info.seatNumber != null) taken.add(info.seatNumber)
      }
      let next = 0
      for (const guestId of guestIds) {
        while (taken.has(next)) next++
        map.set(guestId, { tableId, seatNumber: next })
        taken.add(next)
        next++
      }
    }
    return map
  })

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [highlightedGuestIds, setHighlightedGuestIds] = useState<Set<string>>(new Set())
  const [blockedTableId, setBlockedTableId] = useState<string | null>(null)

  // Require 5px movement before drag starts (prevents accidental drags when clicking)
  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_SENSOR_OPTIONS)
  )

  // Index: hostId -> dependents (memoized to avoid recreating on every render)
  const dependentsByHost = useMemo(() => {
    const map = new Map<string, Guest[]>()
    for (const g of guests) {
      if (g.host_id) {
        const arr = map.get(g.host_id) ?? []
        arr.push(g)
        map.set(g.host_id, arr)
      }
    }
    return map
  }, [guests])

  // Reverse index: dependentId -> primaryId
  const primaryOf = useMemo(() => {
    const map = new Map<string, string>()
    for (const g of guests) {
      if (g.host_id) map.set(g.id, g.host_id)
    }
    return map
  }, [guests])

  // --- Helpers ---

  function getTableSeats(tableId: string, m: Map<string, SeatInfo>): Map<number, string> {
    const seats = new Map<number, string>()
    for (const [guestId, info] of m) {
      if (info.tableId === tableId && info.seatNumber != null) {
        seats.set(info.seatNumber, guestId)
      }
    }
    return seats
  }

  function findEmptySeat(tableId: string, capacity: number, m: Map<string, SeatInfo>): number | null {
    const seats = getTableSeats(tableId, m)
    for (let i = 0; i < capacity; i++) {
      if (!seats.has(i)) return i
    }
    return null
  }

  function findNearestEmpty(tableId: string, fromIdx: number, capacity: number, m: Map<string, SeatInfo>): number | null {
    const seats = getTableSeats(tableId, m)
    for (let dist = 1; dist < capacity; dist++) {
      for (const offset of [dist, -dist]) {
        const idx = ((fromIdx + offset) % capacity + capacity) % capacity
        if (!seats.has(idx)) return idx
      }
    }
    return null
  }

  function findAdjacentPair(tableId: string, capacity: number, headSeats: number, shape: TableShape, preferred: number, m: Map<string, SeatInfo>): [number, number] | null {
    const total = capacity + headSeats
    const seats = getTableSeats(tableId, m)
    for (let offset = 0; offset < total; offset++) {
      const a = (preferred + offset) % total
      if (seats.has(a)) continue
      for (const b of getAdjacents(a, capacity, headSeats, shape)) {
        if (!seats.has(b)) return [a, b]
      }
    }
    return null
  }

  function getAdjacentSeat(seat: number, capacity: number, headSeats: number, shape: TableShape): number {
    const adjacents = getAdjacents(seat, capacity, headSeats, shape)
    return adjacents[0] ?? seat
  }

  function findCoupleSeats(
    tableId: string,
    capacity: number,
    headSeats: number,
    shape: TableShape,
    m: Map<string, SeatInfo>
  ): { pair: [number, number]; moves: { guestId: string; toSeat: number }[] } | null {
    const total = capacity + headSeats
    const seats = getTableSeats(tableId, m)

    // Fast path: already-adjacent empty pair
    const quick = findAdjacentPair(tableId, capacity, headSeats, shape, 0, m)
    if (quick) return { pair: quick, moves: [] }

    // Collect all empty seats (including head seats)
    const empty: number[] = []
    for (let i = 0; i < total; i++) {
      if (!seats.has(i)) empty.push(i)
    }
    if (empty.length < 2) return null

    if (shape === 'round' || shape === 'oval') {
      // For every pair of empty seats, find the shorter arc between them and slide it.
      // Pick the pair/direction that requires the fewest moves.
      let best: { pair: [number, number]; moves: { guestId: string; toSeat: number }[] } | null = null
      let bestLen = Infinity

      for (let i = 0; i < empty.length; i++) {
        for (let j = i + 1; j < empty.length; j++) {
          const E1 = empty[i], E2 = empty[j]
          const arcALen = E2 - E1 - 1            // guests between E1→E2 clockwise
          const arcBLen = capacity - E2 - 1 + E1 // guests between E2→E1 clockwise (wrapping)

          if (arcALen <= arcBLen && arcALen < bestLen) {
            // Slide arc A: seats E1+1..E2-1 each shift to seat-1. Empty pair becomes (E2-1, E2).
            const moves: { guestId: string; toSeat: number }[] = []
            for (let s = E1 + 1; s <= E2 - 1; s++) {
              const gId = seats.get(s)
              if (gId) moves.push({ guestId: gId, toSeat: s - 1 })
            }
            best = { pair: [E2 - 1, E2], moves }
            bestLen = arcALen
          } else if (arcBLen < arcALen && arcBLen < bestLen) {
            // Slide arc B: seats E2+1..(wrapping)..E1-1 each shift to seat+1. Empty pair becomes (E2, E2+1).
            const moves: { guestId: string; toSeat: number }[] = []
            for (let k = 0; k < arcBLen; k++) {
              const s = (E2 + 1 + k) % capacity
              const gId = seats.get(s)
              if (gId) moves.push({ guestId: gId, toSeat: (s + 1) % capacity })
            }
            best = { pair: [E2, (E2 + 1) % capacity], moves }
            bestLen = arcBLen
          }
        }
      }
      return best
    }

    // Rectangular: two independent rows + optional head seats
    const half = Math.ceil(capacity / 2)
    const row0Empty = empty.filter(s => s < half)
    const row1Empty = empty.filter(s => s >= half && s < capacity)

    if (row0Empty.length >= 2) {
      const [E1, E2] = [row0Empty[0], row0Empty[1]]
      const moves: { guestId: string; toSeat: number }[] = []
      for (let s = E1 + 1; s <= E2 - 1; s++) {
        const gId = seats.get(s)
        if (gId) moves.push({ guestId: gId, toSeat: s - 1 })
      }
      return { pair: [E2 - 1, E2], moves }
    }

    if (row1Empty.length >= 2) {
      const [E1, E2] = [row1Empty[0], row1Empty[1]]
      const moves: { guestId: string; toSeat: number }[] = []
      for (let s = E1 + 1; s <= E2 - 1; s++) {
        const gId = seats.get(s)
        if (gId) moves.push({ guestId: gId, toSeat: s - 1 })
      }
      return { pair: [E2 - 1, E2], moves }
    }

    // Last resort: find a single guest adjacent to any empty seat and move them
    for (const emptyS of empty) {
      for (const adjSeat of getAdjacents(emptyS, capacity, headSeats, shape)) {
        if (!seats.has(adjSeat)) continue
        const gId = seats.get(adjSeat)!
        const gPrimary = primaryOf.get(gId) ?? gId
        if ((dependentsByHost.get(gPrimary) ?? []).length > 0 || primaryOf.has(gId)) continue
        const otherEmpty = empty.find(s => s !== emptyS)
        if (otherEmpty == null) continue
        return { pair: [adjSeat, emptyS], moves: [{ guestId: gId, toSeat: otherEmpty }] }
      }
    }

    return null
  }

  function highlightGuests(ids: string[]) {
    if (!ids.length) return
    setHighlightedGuestIds(prev => {
      const s = new Set(prev)
      for (const id of ids) s.add(id)
      return s
    })
    setTimeout(() => {
      setHighlightedGuestIds(prev => {
        const s = new Set(prev)
        for (const id of ids) s.delete(id)
        return s
      })
    }, 2000)
  }

  function persistUpserts(updates: { guestId: string; tableId: string; seatNumber: number }[]) {
    if (!updates.length) return
    supabase.from('seat_assignments').upsert(
      updates.map(u => ({ event_id: eventId, guest_id: u.guestId, table_id: u.tableId, seat_number: u.seatNumber })),
      { onConflict: 'event_id,guest_id' }
    ).then(() => {})
  }

  function persistDeletes(ids: string[]) {
    if (!ids.length) return
    supabase.from('seat_assignments').delete().eq('event_id', eventId).in('guest_id', ids).then(() => {})
  }

  // --- Drag handlers ---

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setDraggingId(String(active.id))
  }, [])

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null)
    if (!over) return

    const guestId = String(active.id)
    const primaryId = primaryOf.get(guestId) ?? guestId
    const deps = dependentsByHost.get(primaryId) ?? []
    const groupIds = [primaryId, ...deps.map(d => d.id)]
    const isCouple = deps.length > 0
    const drop = parseDrop(String(over.id))

    // --- UNASSIGN ---
    if (drop.type === 'guestList') {
      if (!assignments.has(primaryId)) return
      const next = new Map(assignments)
      for (const id of groupIds) next.delete(id)
      setAssignments(next)
      persistDeletes(groupIds)
      return
    }

    const targetTableId = drop.tableId
    const table = tables.find(t => t.id === targetTableId)
    if (!table) return

    // Mutable copy; remove dragged guests from current seats
    const next = new Map(assignments)
    const prevAssignment = assignments.get(primaryId)
    for (const id of groupIds) next.delete(id)

    const upserts: { guestId: string; tableId: string; seatNumber: number }[] = []
    const deletes: string[] = []
    const highlights: string[] = []

    // --- Determine target seat(s) ---
    let primarySeat: number
    let depSeat: number | undefined

    const tableHeadSeats = table.head_seats ?? 0
    const tableTotal = table.capacity + tableHeadSeats

    if (drop.type === 'table') {
      // Auto-assign to first empty seats
      if (isCouple) {
        const result = findCoupleSeats(targetTableId, table.capacity, tableHeadSeats, table.shape, next)
        if (!result) {
          // If rectangular table has ≥2 empty seats but can't make them adjacent,
          // nudge the user to add a head seat.
          if (table.shape === 'rectangular') {
            const tableSeats = getTableSeats(targetTableId, next)
            const emptyCount = tableTotal - tableSeats.size
            if (emptyCount >= 2) {
              setBlockedTableId(targetTableId)
              setTimeout(() => setBlockedTableId(prev => prev === targetTableId ? null : prev), 3000)
            }
          }
          highlightGuests(groupIds)
          return
        }
        primarySeat = result.pair[0]
        depSeat = result.pair[1]
        for (const { guestId: rId, toSeat } of result.moves) {
          next.set(rId, { tableId: targetTableId, seatNumber: toSeat })
          upserts.push({ guestId: rId, tableId: targetTableId, seatNumber: toSeat })
        }
      } else {
        const seat = findEmptySeat(targetTableId, tableTotal, next)
        if (seat == null) return
        primarySeat = seat
      }
    } else {
      // Specific seat drop
      primarySeat = drop.seatIndex
      if (isCouple) {
        depSeat = getAdjacentSeat(primarySeat, table.capacity, tableHeadSeats, table.shape)
      }
    }

    const claimedSeats = [primarySeat]
    if (depSeat != null) claimedSeats.push(depSeat)

    // --- Collect occupants at claimed seats ---
    const tableSeats = getTableSeats(targetTableId, next)
    const displaced: { id: string; fromSeat: number }[] = []
    for (const seat of claimedSeats) {
      const occId = tableSeats.get(seat)
      if (occId && !groupIds.includes(occId)) {
        displaced.push({ id: occId, fromSeat: seat })
      }
    }

    // Remove all displaced guests (and their groups) from next
    const processedGroups = new Set<string>()
    for (const { id } of displaced) {
      const occPrimary = primaryOf.get(id) ?? id
      if (processedGroups.has(occPrimary)) continue
      processedGroups.add(occPrimary)
      const occDeps = dependentsByHost.get(occPrimary) ?? []
      for (const gid of [occPrimary, ...occDeps.map(d => d.id)]) next.delete(gid)
    }

    // Place dragged group at target seats
    next.set(primaryId, { tableId: targetTableId, seatNumber: primarySeat })
    upserts.push({ guestId: primaryId, tableId: targetTableId, seatNumber: primarySeat })
    if (isCouple && deps[0] && depSeat != null) {
      next.set(deps[0].id, { tableId: targetTableId, seatNumber: depSeat })
      upserts.push({ guestId: deps[0].id, tableId: targetTableId, seatNumber: depSeat })
    }
    // Seat remaining dependents (3+ person groups like families)
    for (let i = 1; i < deps.length; i++) {
      const seat = findEmptySeat(targetTableId, tableTotal, next)
      if (seat == null) break
      next.set(deps[i].id, { tableId: targetTableId, seatNumber: seat })
      upserts.push({ guestId: deps[i].id, tableId: targetTableId, seatNumber: seat })
    }

    // --- Handle displaced occupants ---
    processedGroups.clear()
    for (const { id, fromSeat } of displaced) {
      const occPrimary = primaryOf.get(id) ?? id
      if (processedGroups.has(occPrimary)) continue
      processedGroups.add(occPrimary)
      const occDeps = dependentsByHost.get(occPrimary) ?? []
      const occGroup = [occPrimary, ...occDeps.map(d => d.id)]

      // Swap: two singles on the same table
      if (!isCouple && occGroup.length === 1 && prevAssignment?.tableId === targetTableId && prevAssignment.seatNumber != null) {
        next.set(id, { tableId: targetTableId, seatNumber: prevAssignment.seatNumber })
        upserts.push({ guestId: id, tableId: targetTableId, seatNumber: prevAssignment.seatNumber })
        continue
      }

      // Try to find new seats at the same table
      if (occGroup.length > 1) {
        const coupleResult = findCoupleSeats(targetTableId, table.capacity, tableHeadSeats, table.shape, next)
        if (coupleResult) {
          for (const { guestId: rId, toSeat } of coupleResult.moves) {
            next.set(rId, { tableId: targetTableId, seatNumber: toSeat })
            upserts.push({ guestId: rId, tableId: targetTableId, seatNumber: toSeat })
          }
          next.set(occPrimary, { tableId: targetTableId, seatNumber: coupleResult.pair[0] })
          upserts.push({ guestId: occPrimary, tableId: targetTableId, seatNumber: coupleResult.pair[0] })
          if (occDeps[0]) {
            next.set(occDeps[0].id, { tableId: targetTableId, seatNumber: coupleResult.pair[1] })
            upserts.push({ guestId: occDeps[0].id, tableId: targetTableId, seatNumber: coupleResult.pair[1] })
          }
        } else {
          for (const gid of occGroup) { deletes.push(gid); highlights.push(gid) }
        }
      } else {
        const newSeat = findNearestEmpty(targetTableId, fromSeat, tableTotal, next)
        if (newSeat != null) {
          next.set(id, { tableId: targetTableId, seatNumber: newSeat })
          upserts.push({ guestId: id, tableId: targetTableId, seatNumber: newSeat })
        } else {
          deletes.push(id)
          highlights.push(id)
        }
      }
    }

    setAssignments(next)
    persistUpserts(upserts)
    persistDeletes(deletes)
    highlightGuests(highlights)
  }

  // --- Table management callbacks (lifted from TableCanvas) ---
  const handleAddTable = useCallback((table: Table) => {
    setTables(prev => [...prev, table])
  }, [])
  const handleUpdateTable = useCallback((id: string, name: string, capacity: number, headSeats: number) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, name, capacity, head_seats: headSeats } : t))
    // Rescue any guests whose seat index is now out of range (e.g. head seats reduced)
    setAssignments(prev => {
      const newTotal = capacity + headSeats
      const orphaned: string[] = []
      for (const [guestId, info] of prev) {
        if (info.tableId === id && info.seatNumber != null && info.seatNumber >= newTotal) {
          orphaned.push(guestId)
        }
      }
      if (!orphaned.length) return prev
      const next = new Map(prev)
      const taken = new Set<number>()
      for (const [, i2] of prev) {
        if (i2.tableId === id && i2.seatNumber != null && i2.seatNumber < newTotal) taken.add(i2.seatNumber)
      }
      const upserts: { guestId: string; tableId: string; seatNumber: number }[] = []
      const evicted: string[] = []
      for (const guestId of orphaned) {
        let empty: number | null = null
        for (let s = 0; s < newTotal; s++) {
          if (!taken.has(s)) { empty = s; break }
        }
        if (empty != null) {
          next.set(guestId, { tableId: id, seatNumber: empty })
          taken.add(empty)
          upserts.push({ guestId, tableId: id, seatNumber: empty })
        } else {
          next.delete(guestId)
          evicted.push(guestId)
        }
      }
      if (upserts.length) {
        supabase.from('seat_assignments').upsert(
          upserts.map(u => ({ event_id: eventId, guest_id: u.guestId, table_id: u.tableId, seat_number: u.seatNumber })),
          { onConflict: 'event_id,guest_id' }
        ).then(() => {})
      }
      if (evicted.length) {
        supabase.from('seat_assignments').delete().eq('event_id', eventId).in('guest_id', evicted).then(() => {})
      }
      return next
    })
  }, [eventId])
  const handleDeleteTable = useCallback((id: string) => {
    setTables(prev => prev.filter(t => t.id !== id))
    // Also clear assignments for that table
    setAssignments(prev => {
      const next = new Map(prev)
      for (const [guestId, info] of prev) {
        if (info.tableId === id) next.delete(guestId)
      }
      return next
    })
  }, [])

  const handleScootTable = useCallback((id: string, direction: 'cw' | 'ccw') => {
    const table = tables.find(t => t.id === id)
    if (!table) return
    const headSeats = table.head_seats ?? 0
    const next = new Map(assignments)
    const upserts: { guestId: string; tableId: string; seatNumber: number }[] = []

    if (headSeats === 0) {
      // Original modular rotation
      for (const [guestId, info] of assignments) {
        if (info.tableId !== id || info.seatNumber == null) continue
        const newSeat = direction === 'cw'
          ? (info.seatNumber + 1) % table.capacity
          : (info.seatNumber - 1 + table.capacity) % table.capacity
        next.set(guestId, { ...info, seatNumber: newSeat })
        upserts.push({ guestId, tableId: id, seatNumber: newSeat })
      }
    } else {
      // Perimeter order rotation
      const order = perimeterOrder(table.capacity, headSeats)
      const total = order.length
      const posOf = new Map<number, number>()
      order.forEach((s, i) => posOf.set(s, i))
      for (const [guestId, info] of assignments) {
        if (info.tableId !== id || info.seatNumber == null) continue
        const pos = posOf.get(info.seatNumber)
        if (pos == null) continue
        const newPos = direction === 'cw'
          ? (pos + 1) % total
          : (pos - 1 + total) % total
        const newSeat = order[newPos]
        next.set(guestId, { ...info, seatNumber: newSeat })
        upserts.push({ guestId, tableId: id, seatNumber: newSeat })
      }
    }

    setAssignments(next)
    persistUpserts(upserts)
  }, [tables, assignments])

  // Keep a ref to handleDragEnd so DndContext always receives a stable callback.
  // Without this, DndContext (React.memo) re-renders on every parent render,
  // cascading into an infinite update loop through dnd-kit's internal effects.
  const dragEndRef = useRef(handleDragEnd)
  dragEndRef.current = handleDragEnd
  const stableDragEnd = useCallback((event: DragEndEvent) => dragEndRef.current(event), [])

  const draggingPrimaryId = draggingId ? (primaryOf.get(draggingId) ?? draggingId) : null
  const draggingPrimary = draggingPrimaryId ? guests.find(g => g.id === draggingPrimaryId) ?? null : null
  const draggingDeps = draggingPrimaryId ? (dependentsByHost.get(draggingPrimaryId) ?? []) : []

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={stableDragEnd}
    >
      <TableCanvas
        eventId={eventId}
        tables={tables}
        assignments={assignments}
        guests={guests}
        isDragging={draggingId !== null}
        blockedTableId={blockedTableId}
        onAddTable={handleAddTable}
        onUpdateTable={(id, name, capacity, headSeats) => handleUpdateTable(id, name, capacity, headSeats)}
        onDeleteTable={handleDeleteTable}
        onScootTable={handleScootTable}
      />
      <GuestList
        eventId={eventId}
        projectId={projectId}
        initialGuests={guests}
        assignments={assignments}
        highlightedGuestIds={highlightedGuestIds}
        tables={tables}
        siblingEvents={siblingEvents}
      />
      <DragOverlay dropAnimation={null}>
        {draggingPrimary ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <DragChip name={draggingPrimary.name} />
            {draggingDeps.length > 0 && (
              <DragChip name={draggingDeps[0].name} />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
