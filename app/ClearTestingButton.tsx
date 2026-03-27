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

    // Guests and projects are the two root tables — everything else cascades from them
    const { error: gErr } = await supabase.from('guests').delete().gte('created_at', '1970-01-01')
    const { error: pErr } = await supabase.from('projects').delete().gte('created_at', '1970-01-01')

    if (gErr || pErr) {
      window.alert(`Clear failed: ${(gErr || pErr)?.message}`)
      setClearing(false)
      return
    }

    setClearing(false)
    window.location.href = '/'
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
