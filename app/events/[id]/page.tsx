import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function EventWorkspace({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: event } = await supabase
    .from('events')
    .select('*, projects(id, name)')
    .eq('id', id)
    .single()

  if (!event) notFound()

  const project = event.projects as { id: string; name: string }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-semibold text-gray-900 tracking-tight">PlaceCard</Link>
            <span className="text-gray-300">/</span>
            <Link href={`/projects/${project.id}`} className="text-gray-500 hover:text-gray-700">{project.name}</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-medium">{event.name}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex items-center justify-center text-gray-400 border-r border-gray-200">
          <div className="text-center">
            <div className="text-5xl mb-3">⬜</div>
            <p className="text-sm">Tables will appear here</p>
            <p className="text-xs text-gray-300 mt-1">Coming in the next step</p>
          </div>
        </main>

        <aside className="w-72 bg-white flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Guests</h2>
          </div>
          <div className="flex-1 flex items-center justify-center text-gray-400 px-5">
            <div className="text-center">
              <p className="text-sm">No guests yet</p>
              <p className="text-xs text-gray-300 mt-1">Coming in the next step</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
