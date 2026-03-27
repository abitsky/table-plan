import { supabase } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Event } from '@/lib/types'
import ClearTestingButton from '@/app/ClearTestingButton'

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding',
  dinner_party: 'Dinner Party',
  charity_gala: 'Charity Gala',
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ data: project }, { data: events }, { count: totalGuests }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('events').select('*').eq('project_id', id).order('created_at'),
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('project_id', id),
  ])

  if (!project) notFound()

  // Single-event projects skip the dashboard and go straight to the workspace
  if (project.type === 'single' && events && events.length > 0) {
    redirect(`/events/${events[0].id}`)
  }

  // Fetch seated counts per event (guests with a table assigned)
  const eventIds = (events ?? []).map(e => e.id)
  const { data: seatedRows } = eventIds.length
    ? await supabase
        .from('seat_assignments')
        .select('event_id')
        .in('event_id', eventIds)
        .not('table_id', 'is', null)
    : { data: [] }

  const seatedByEvent: Record<string, number> = {}
  for (const row of seatedRows ?? []) {
    seatedByEvent[row.event_id] = (seatedByEvent[row.event_id] ?? 0) + 1
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-base font-semibold text-gray-900 tracking-tight">PlaceCard</Link>
          <ClearTestingButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
          {events && events.length > 0 && (
            <Link
              href={`/projects/${id}/events/new`}
              className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              + Add event
            </Link>
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Events in this series</h2>
          {events && events.length > 0 ? (
            <div className="space-y-2">
              {(events as Event[]).map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block bg-white border border-gray-200 rounded-xl px-6 py-4 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium">{event.name}</span>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {seatedByEvent[event.id] ?? 0} / {totalGuests ?? 0} seated
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-400 mb-4">No events yet. Add your first one to get started.</p>
              <div className="relative">
                <div className="space-y-2 opacity-30 pointer-events-none select-none">
                  {[
                    "Rehearsal Dinner at Nino's Pizza",
                    'Wedding at The Plaza',
                    "Brunch at Mimi's",
                  ].map((name) => (
                    <div key={name} className="bg-white border border-gray-200 rounded-xl px-6 py-4">
                      <span className="text-gray-900 font-medium">{name}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Link
                    href={`/projects/${id}/events/new`}
                    className="bg-gray-900 text-white text-base px-8 py-4 rounded-xl hover:bg-gray-700 transition-colors shadow-lg font-medium"
                  >
                    + Add event
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
