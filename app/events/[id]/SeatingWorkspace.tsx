'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  rectIntersection,
} from '@dnd-kit/core'
import { supabase } from '@/lib/supabase'
import type { Guest, Table, SeatAssignment } from '@/lib/types'
import TableCanvas from './TableCanvas'
import GuestList from './GuestList'

interface Props {
  eventId: string
  projectId: string
  guests: Guest[]
  tables: Table[]
  initialAssignments: SeatAssignment[]
}

export default function SeatingWorkspace({
  eventId,
  projectId,
  guests,
  tables,
  initialAssignments,
}: Props) {
  const [assignments, setAssignments] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>()
    for (const a of initialAssignments) {
      if (a.table_id) map.set(a.guest_id, a.table_id)
    }
    return map
  })
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // Build dependents index: hostId -> list of dependents
  const dependentsByHost = new Map<string, Guest[]>()
  for (const g of guests) {
    if (g.host_id) {
      const arr = dependentsByHost.get(g.host_id) ?? []
      arr.push(g)
      dependentsByHost.set(g.host_id, arr)
    }
  }

  function handleDragStart({ active }: DragStartEvent) {
    setDraggingId(String(active.id))
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null)
    if (!over) return

    const primaryId = String(active.id)
    const tableId = String(over.id)
    const deps = dependentsByHost.get(primaryId) ?? []
    const guestIds = [primaryId, ...deps.map(d => d.id)]

    // Optimistic update — move instantly in UI
    setAssignments(prev => {
      const next = new Map(prev)
      for (const id of guestIds) next.set(id, tableId)
      return next
    })

    // Write to Supabase in background
    supabase
      .from('seat_assignments')
      .upsert(
        guestIds.map(guestId => ({ event_id: eventId, guest_id: guestId, table_id: tableId })),
        { onConflict: 'event_id,guest_id' }
      )
  }

  const draggingGuest = draggingId ? guests.find(g => g.id === draggingId) ?? null : null

  return (
    <DndContext
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <TableCanvas
        eventId={eventId}
        initialTables={tables}
        assignments={assignments}
        guests={guests}
      />
      <GuestList
        eventId={eventId}
        projectId={projectId}
        initialGuests={guests}
        assignments={assignments}
      />
      <DragOverlay dropAnimation={null}>
        {draggingGuest ? (
          <div className="bg-white border-2 border-gray-900 rounded-lg px-3 py-2 shadow-xl text-sm font-medium text-gray-800 cursor-grabbing">
            {draggingGuest.name}
            {(dependentsByHost.get(draggingGuest.id) ?? []).length > 0 && (
              <span className="ml-1.5 text-gray-400 text-xs">
                +{(dependentsByHost.get(draggingGuest.id) ?? []).length}
              </span>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
