'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import type { Guest, RelationshipType } from '@/lib/types'

interface Props {
  eventId: string
  projectId: string
  initialGuests: Guest[]
}

function detectName(row: Record<string, string>): string {
  const keys = Object.keys(row)
  const firstKey = keys.find(k => /^first[\s_]?name$/i.test(k))
  const lastKey = keys.find(k => /^last[\s_]?name$/i.test(k))
  if (firstKey && lastKey) return `${row[firstKey]} ${row[lastKey]}`.trim()
  const nameKey = keys.find(k => /^(full[\s_]?)?name$/i.test(k))
  if (nameKey) return row[nameKey].trim()
  return Object.values(row)[0]?.trim() ?? ''
}

function detectRelationship(row: Record<string, string>): RelationshipType {
  const typeKey = Object.keys(row).find(k => /^(guest[\s_]?type|type|relationship)$/i.test(k))
  if (typeKey) {
    const val = row[typeKey].toLowerCase()
    if (val.includes('plus') || val.includes('+1')) return 'plus_one'
    if (val.includes('child') || val.includes('kid')) return 'child'
  }
  const guestOfKey = Object.keys(row).find(k => /^guest[\s_]?of$/i.test(k))
  if (guestOfKey && row[guestOfKey]?.trim()) return 'plus_one'
  return 'primary'
}

function detectHostName(row: Record<string, string>): string {
  const guestOfKey = Object.keys(row).find(k => /^guest[\s_]?of$/i.test(k))
  return guestOfKey ? (row[guestOfKey] ?? '').trim() : ''
}

export default function GuestList({ eventId, projectId, initialGuests }: Props) {
  const [adding, setAdding] = useState(false)
  const [addMode, setAddMode] = useState<'single' | 'couple'>('couple')
  const [newName, setNewName] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importCount, setImportCount] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openAdd() {
    setAdding(true)
    setAddMode('couple')
    setNewName('')
    setPartnerName('')
    setImportCount(null)
  }

  function cancelAdd() {
    setAdding(false)
    setNewName('')
    setPartnerName('')
  }

  async function handleAddGuest() {
    if (!newName.trim() || saving) return
    setSaving(true)

    if (addMode === 'single') {
      const { data: guest } = await supabase
        .from('guests')
        .insert({ project_id: projectId, name: newName.trim(), relationship_type: 'primary' })
        .select('id')
        .single()
      if (guest) {
        await supabase.from('event_guests').insert({ event_id: eventId, guest_id: guest.id })
      }
    } else {
      // Insert primary guest first
      const { data: primary } = await supabase
        .from('guests')
        .insert({ project_id: projectId, name: newName.trim(), relationship_type: 'primary' })
        .select('id')
        .single()
      if (primary) {
        await supabase.from('event_guests').insert({ event_id: eventId, guest_id: primary.id })
        // Insert partner linked to primary
        if (partnerName.trim()) {
          const { data: partner } = await supabase
            .from('guests')
            .insert({ project_id: projectId, name: partnerName.trim(), relationship_type: 'plus_one', host_id: primary.id })
            .select('id')
            .single()
          if (partner) {
            await supabase.from('event_guests').insert({ event_id: eventId, guest_id: partner.id })
          }
        }
      }
    }

    setNewName('')
    setPartnerName('')
    setAdding(false)
    setSaving(false)
    router.refresh()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportCount(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        if (!rows.length) { setImporting(false); return }

        const parsed = rows
          .map(row => ({
            name: detectName(row),
            relationship_type: detectRelationship(row),
            hostName: detectHostName(row),
          }))
          .filter(g => g.name.length > 0)

        const { data: inserted } = await supabase
          .from('guests')
          .insert(parsed.map(g => ({
            project_id: projectId,
            name: g.name,
            relationship_type: g.relationship_type,
          })))
          .select('id, name')

        if (!inserted) { setImporting(false); return }

        // Link plus-ones to their hosts
        const nameToId = new Map(inserted.map(g => [g.name.toLowerCase(), g.id]))
        const updates = parsed
          .map((g, i) => ({ hostName: g.hostName, guestId: inserted[i]?.id }))
          .filter(u => u.hostName && u.guestId)
        for (const u of updates) {
          const hostId = nameToId.get(u.hostName.toLowerCase())
          if (hostId) {
            await supabase.from('guests').update({ host_id: hostId }).eq('id', u.guestId)
          }
        }

        // Link all guests to this event
        await supabase
          .from('event_guests')
          .insert(inserted.map(g => ({ event_id: eventId, guest_id: g.id })))

        setImportCount(inserted.length)
        setImporting(false)
        router.refresh()
      },
    })
  }

  const guests = initialGuests

  return (
    <aside className="w-72 bg-white flex flex-col flex-shrink-0">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Guests
          {guests.length > 0 && (
            <span className="ml-1.5 text-gray-400 font-normal">{guests.length}</span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import CSV"
            className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors font-medium"
          >
            Import CSV
          </button>
          <button
            onClick={openAdd}
            title="Add guest"
            className="text-lg leading-none text-gray-400 hover:text-gray-900 w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
          >
            +
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {adding && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex gap-1 mb-3 bg-gray-200 rounded-lg p-0.5">
              <button
                onClick={() => setAddMode('single')}
                className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${addMode === 'single' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Single
              </button>
              <button
                onClick={() => setAddMode('couple')}
                className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${addMode === 'couple' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                Couple
              </button>
            </div>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddGuest()
                if (e.key === 'Escape') cancelAdd()
              }}
              placeholder={addMode === 'couple' ? 'Person 1' : 'Guest name'}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-900 placeholder-gray-400"
            />
            {addMode === 'couple' && (
              <input
                type="text"
                value={partnerName}
                onChange={e => setPartnerName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddGuest()
                  if (e.key === 'Escape') cancelAdd()
                }}
                placeholder="Person 2"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mt-2 focus:outline-none focus:border-gray-900 placeholder-gray-400"
              />
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddGuest}
                disabled={!newName.trim() || saving}
                className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg disabled:opacity-40"
              >
                {saving ? 'Adding…' : 'Add'}
              </button>
              <button
                onClick={cancelAdd}
                className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {importing && (
          <div className="px-5 py-3 text-sm text-gray-400 border-b border-gray-50">
            Importing…
          </div>
        )}

        {importCount !== null && !importing && (
          <div className="px-5 py-3 text-sm text-green-600 border-b border-gray-50">
            ✓ Imported {importCount} guests
          </div>
        )}

        {guests.length === 0 && !adding && !importing ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-6">
            <p className="text-sm text-gray-400">No guests yet</p>
            <p className="text-xs text-gray-300 mt-1">Add guests manually or import a CSV</p>
          </div>
        ) : (
          <ul>
            {(() => {
              const dependents = new Map<string, Guest[]>()
              const primaries: Guest[] = []
              for (const g of guests) {
                if (g.host_id) {
                  const arr = dependents.get(g.host_id) ?? []
                  arr.push(g)
                  dependents.set(g.host_id, arr)
                } else {
                  primaries.push(g)
                }
              }
              primaries.sort((a, b) => a.name.localeCompare(b.name))
              return primaries.map(host => (
                <li key={host.id}>
                  <div className="px-5 py-2.5 border-b border-gray-50 flex items-center gap-2">
                    <span className="text-sm text-gray-800">{host.name}</span>
                    {host.needs_consideration && (
                      <span className="ml-auto text-xs text-amber-500">⚑</span>
                    )}
                  </div>
                  {(dependents.get(host.id) ?? []).map(dep => (
                    <div
                      key={dep.id}
                      className="pl-8 pr-5 py-2 border-b border-gray-50 flex items-center gap-2 bg-gray-50"
                    >
                      <span className="text-xs text-gray-400 mr-0.5">↳</span>
                      <span className="text-sm text-gray-600">{dep.name}</span>
                      <span className="text-xs text-gray-400">
                        {dep.relationship_type === 'child' ? 'child' : '+1'}
                      </span>
                      {dep.needs_consideration && (
                        <span className="ml-auto text-xs text-amber-500">⚑</span>
                      )}
                    </div>
                  ))}
                </li>
              ))
            })()}
          </ul>
        )}
      </div>
    </aside>
  )
}
