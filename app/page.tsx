import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Project } from '@/lib/types'
import ClearTestingButton from './ClearTestingButton'

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
            PlaceCard
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
          <div className="flex flex-col items-center justify-center text-center" style={{ paddingTop: '6rem', paddingBottom: '6rem' }}>
            {/* Table setting photo */}
            <div className="mb-10 overflow-hidden rounded-2xl" style={{ width: 280, height: 210, boxShadow: '0 8px 32px rgba(61,53,48,0.10)' }}>
              <img
                src="/table-setting.jpg"
                alt="Elegant table setting"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }}
              />
            </div>

            {/* Headline */}
            <h1
              className="mb-3"
              style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: '2.75rem',
                fontWeight: 400,
                color: '#3d3530',
                letterSpacing: '0.05em',
                lineHeight: 1.15,
              }}
            >
              PlaceCard
            </h1>

            {/* Tagline */}
            <p
              className="mb-10 italic"
              style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: '1.15rem',
                color: '#8a7f74',
                letterSpacing: '0.02em',
              }}
            >
              Every seat, thoughtfully placed.
            </p>

            {/* CTA */}
            <Link
              href="/projects/new"
              className="inline-block px-8 py-3 rounded-lg transition-opacity font-medium tracking-wide text-sm"
              style={{ backgroundColor: '#c9a96e', color: 'white', letterSpacing: '0.06em' }}
            >
              Start planning
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
