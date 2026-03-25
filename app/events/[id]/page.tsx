import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Guest, Table } from '@/lib/types'
import GuestList from './GuestList'
import TableCanvas from './TableCanvas'

export default async function EventWorkspace({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ data: event }, { data: eventGuests }, { data: tables }] = await Promise.all([
    supabase.from('events').select('*, projects(id, name)').eq('id', id).single(),
    supabase.from('event_guests').select('guests(*)').eq('event_id', id),
    supabase.from('tables').select('*').eq('event_id', id).order('created_at'),
  ])

  if (!event) notFound()

  const project = event.projects as { id: string; name: string }
  const guests = (eventGuests?.map((eg: { guests: unknown }) => eg.guests) ?? []) as Guest[]

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
        <TableCanvas eventId={id} initialTables={(tables ?? []) as Table[]} />
        <GuestList eventId={id} projectId={event.project_id} initialGuests={guests} />
      </div>
    </div>
  )
}
