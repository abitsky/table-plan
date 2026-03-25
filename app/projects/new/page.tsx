'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function NewProject() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || loading) return
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .insert({ name: name.trim() })
      .select('id')
      .single()
    if (data) router.push(`/projects/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-8 py-4">
          <Link href="/" className="text-base font-semibold text-gray-900 tracking-tight">PlaceCard</Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 w-full max-w-md">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">New project</h1>
          <p className="text-sm text-gray-500 mb-8">A project holds all events for one occasion.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mickey & Sarah's Wedding"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 text-base"
            />
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating…' : 'Create project →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
