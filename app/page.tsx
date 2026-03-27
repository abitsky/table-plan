import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Project } from '@/lib/types'
import ClearTestingButton from './ClearTestingButton'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  const hasProjects = projects && projects.length > 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf8f5' }}>
      <header style={{ backgroundColor: '#faf8f5', borderBottom: '1px solid #e8e0d4' }}>
        <div className="mx-auto max-w-4xl px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-cormorant)', color: '#3d3530', letterSpacing: '0.15em' }}
          >
            PLACECARD
          </Link>
          <ClearTestingButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-8 py-16">
        {hasProjects ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium uppercase tracking-wide" style={{ color: '#8a7f74' }}>Your plans</h2>
              <Link
                href="/projects/new"
                className="text-sm px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#3d3530', color: '#faf8f5' }}
              >
                + New plan
              </Link>
            </div>
            <div className="space-y-2">
              {(projects as Project[]).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-xl px-6 py-4 transition-colors"
                  style={{ backgroundColor: 'white', border: '1px solid #e8e0d4' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: '#3d3530' }}>{project.name}</span>
                    <span className="text-xs" style={{ color: '#8a7f74' }}>
                      {project.type === 'single' ? 'Single event' : 'Multiple events'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2
              className="mb-2"
              style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: '2rem',
                fontWeight: 400,
                color: '#3d3530',
                letterSpacing: '0.05em',
              }}
            >
              Welcome to PlaceCard
            </h2>
            <p className="mb-8" style={{ color: '#8a7f74' }}>Plan your seating chart in minutes.</p>
            <Link
              href="/projects/new"
              className="inline-block px-8 py-3 rounded-lg font-medium text-sm transition-opacity"
              style={{ backgroundColor: '#3d3530', color: '#faf8f5' }}
            >
              Start planning
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
