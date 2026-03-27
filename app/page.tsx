import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Project } from '@/lib/types'
import ClearTestingButton from './ClearTestingButton'

export default async function Dashboard() {
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  // Single-event user with exactly one project: go straight to their workspace
  if (projects && projects.length === 1 && projects[0].type === 'single') {
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('project_id', projects[0].id)
      .limit(1)
      .single()
    if (event) redirect(`/events/${event.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-8 py-4 flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900 tracking-tight">PlaceCard</span>
          <ClearTestingButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-8 py-16">
        {projects && projects.length > 0 ? (
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Your plans</h2>
            <div className="space-y-2">
              {(projects as Project[]).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block bg-white border border-gray-200 rounded-xl px-6 py-4 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-medium">{project.name}</span>
                    <span className="text-xs text-gray-400">
                      {project.type === 'single' ? 'Single event' : 'Multiple events'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to PlaceCard</h2>
            <p className="text-gray-500 mb-8">Plan your seating chart in minutes.</p>
            <Link
              href="/projects/new"
              className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Start planning
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
