'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { EventType } from '@/lib/types'

const EVENT_TYPES: { value: EventType; label: string; description: string }[] = [
  { value: 'wedding', label: 'Wedding', description: 'Ceremony, reception, or rehearsal dinner' },
  { value: 'dinner_party', label: 'Dinner Party', description: 'Private or semi-formal dinner' },
  { value: 'charity_gala', label: 'Charity / Gala', description: 'Fundraiser or formal event' },
]

export default function NewEvent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = use(params)
  const [name, setName] = useState('')
  const [eventType, setEventType] = useState<EventType>('wedding')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || loading) return
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .insert({ project_id: projectId, name: name.trim(), event_type: eventType })
      .select('id')
      .single()
    if (data) router.push(`/events/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-8 py-4">
          <Link href={`/projects/${projectId}`} className="text-base font-semibold text-gray-900 tracking-tight">PlaceCard</Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 w-full max-w-md">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Add an event</h1>
          <p className="text-sm text-gray-500 mb-8">Give it a name and tell us what kind of event it is.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Saturday Reception"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 text-base"
              />
            </div>

            <div className="space-y-2">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEventType(type.value)}
                  className={`w-full text-left border rounded-xl px-4 py-3 transition-colors ${
                    eventType === type.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      eventType === type.value ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
                    }`} />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating…' : 'Create event →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
