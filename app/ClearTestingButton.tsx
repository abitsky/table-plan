'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ClearTestingButton() {
  const [clearing, setClearing] = useState(false)
  const router = useRouter()

  async function handleClear() {
    const ok = window.confirm('Delete ALL projects, events, guests, and tables? This cannot be undone.')
    if (!ok) return
    setClearing(true)

    // Delete in dependency order so foreign keys don't complain
    await supabase.from('seat_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('event_guests').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tables').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('guests').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    setClearing(false)
    router.push('/')
  }

  return (
    <button
      onClick={handleClear}
      disabled={clearing}
      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
    >
      {clearing ? 'Clearing...' : 'Clear for testing'}
    </button>
  )
}
