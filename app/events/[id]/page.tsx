import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Guest, Table, SeatAssignment } from '@/lib/types'
import SeatingWorkspace from './SeatingWorkspace'

export default async function EventWorkspace({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ data: event }, { data: eventGuests }, { data: tables }, { data: seatAssignments }] =
    await Promise.all([
      supabase.from('events').select('*, projects(id, name)').eq('id', id).single(),
      supabase.from('event_guests').select('guests(*)').eq('event_id', id),
      supabase.from('tables').select('*').eq('event_id', id).order('created_at'),
      supabase.from('seat_assignments').select('*').eq('event_id', id),
    ])

  if (!event) notFound()

  const project = event.projects as { id: string; name: string }
  const guests = (eventGuests?.map((eg: { guests: unknown }) => eg.guests) ?? []) as Guest[]

  // Fetch sibling events that have at least one guest (for PLA-41 copy feature)
  const { data: siblingEventsRaw } = await supabase
    .from('events')
    .select('id, name')
    .eq('project_id', event.project_id)
    .neq('id', id)
    .order('created_at')

  const siblingsWithGuests = await Promise.all(
    (siblingEventsRaw ?? []).map(async (e) => {
      const { count } = await supabase
        .from('event_guests')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', e.id)
      return (count ?? 0) > 0 ? e : null
    })
  )
  const siblingEvents = siblingsWithGuests.filter(Boolean) as { id: string; name: string }[]

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-3 flex items-center gap-2 text-sm">
          <Link href="/" className="font-semibold text-gray-900 tracking-tight">PlaceCard</Link>
          <span className="text-gray-300">/</span>
          <Link href={`/projects/${project.id}`} className="text-gray-500 hover:text-gray-700">{project.name}</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-medium">{event.name}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SeatingWorkspace
          eventId={id}
          projectId={event.project_id}
          guests={guests}
          tables={(tables ?? []) as Table[]}
          initialAssignments={(seatAssignments ?? []) as SeatAssignment[]}
          siblingEvents={siblingEvents}
        />
      </div>
    </div>
  )
}
