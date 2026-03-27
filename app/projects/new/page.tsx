'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Choice = 'single' | 'multi' | null

interface TileProps {
  type: 'single' | 'multi'
  title: string
  description: string
  selected: boolean
  name: string
  loading: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onSelect: () => void
  onNameChange: (v: string) => void
  onEscape: () => void
  onSubmit: (e: React.FormEvent) => void
}

function Tile({ type, title, description, selected, name, loading, inputRef, onSelect, onNameChange, onEscape, onSubmit }: TileProps) {
  return (
    <div
      onClick={() => !selected && onSelect()}
      className={`bg-white border rounded-2xl p-8 text-left transition-colors ${
        selected
          ? 'border-gray-900 ring-1 ring-gray-900 cursor-default'
          : 'border-gray-200 hover:border-gray-400 cursor-pointer'
      }`}
    >
      <div className="text-lg font-semibold text-gray-900 mb-1">{title}</div>
      <div className="text-sm text-gray-500">{description}</div>

      {selected && (
        <form onSubmit={onSubmit} className="mt-6" onClick={e => e.stopPropagation()}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {type === 'multi' ? 'Name your series' : 'Name your event'}
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => onNameChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') onEscape() }}
              placeholder={type === 'multi' ? "e.g. Mickey & Sarah's Wedding" : "e.g. Sarah's Dinner Party"}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 text-sm"
            />
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? '…' : 'Go →'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function NewProject() {
  const [choice, setChoice] = useState<Choice>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (choice) {
      setName('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [choice])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || loading) return
    setLoading(true)

    if (choice === 'single') {
      const { data: project } = await supabase
        .from('projects')
        .insert({ name: name.trim(), type: 'single' })
        .select('id')
        .single()
      if (!project) { setLoading(false); return }
      const { data: event } = await supabase
        .from('events')
        .insert({ project_id: project.id, name: name.trim(), event_type: 'wedding' })
        .select('id')
        .single()
      if (event) router.push(`/events/${event.id}`)
    } else {
      const { data } = await supabase
        .from('projects')
        .insert({ name: name.trim(), type: 'multi' })
        .select('id')
        .single()
      if (data) router.push(`/projects/${data.id}`)
    }
  }

  function handleEscape() {
    setChoice(null)
    setName('')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-8 py-4">
          <Link href="/" className="text-base font-semibold text-gray-900 tracking-tight">PlaceCard</Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-8">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">What are you planning?</h1>
          <p className="text-sm text-gray-500 text-center mb-10">Choose the type that fits your occasion.</p>

          <div className="grid grid-cols-2 gap-4">
            <Tile
              type="multi"
              title="Series of events"
              description="A wedding weekend, conference, or series of related events"
              selected={choice === 'multi'}
              name={name}
              loading={loading}
              inputRef={inputRef}
              onSelect={() => setChoice('multi')}
              onNameChange={setName}
              onEscape={handleEscape}
              onSubmit={handleSubmit}
            />
            <Tile
              type="single"
              title="Single event"
              description="A dinner party, gala, or one-time gathering"
              selected={choice === 'single'}
              name={name}
              loading={loading}
              inputRef={inputRef}
              onSelect={() => setChoice('single')}
              onNameChange={setName}
              onEscape={handleEscape}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
