import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Event } from '@/lib/types'

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

  const [{ data: project }, { data: events }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('events').select('*').eq('project_id', id).order('created_at'),
  ])

  if (!project) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-base font-semibold text-gray-900 tracking-tight">PlaceCard</Link>
          <Link
            href={`/projects/${id}/events/new`}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Add event
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-8 py-12">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">{project.name}</h1>

        {events && events.length > 0 ? (
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Events</h2>
            <div className="space-y-2">
              {(events as Event[]).map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block bg-white border border-gray-200 rounded-xl px-6 py-4 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium">{event.name}</span>
                    <span className="text-sm text-gray-400">{EVENT_TYPE_LABELS[event.event_type]}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-6">No events yet. Add your first one to get started.</p>
            <Link
              href={`/projects/${id}/events/new`}
              className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Add first event
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
