'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import type { Guest, RelationshipType } from '@/lib/types'

import type { SeatInfo } from './SeatingWorkspace'

interface Props {
  eventId: string
  projectId: string
  initialGuests: Guest[]
  assignments: Map<string, SeatInfo>
  highlightedGuestIds: Set<string>
  tables: import('@/lib/types').Table[]
  siblingEvents: { id: string; name: string }[]
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


function DraggableSearchRow({ guest, deps, tableName, assignments, tableNameById }: {
  guest: Guest
  deps: Guest[]
  tableName: string | null | undefined
  assignments: Map<string, SeatInfo>
  tableNameById: Map<string, string>
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id })
  return (
    <li ref={setNodeRef} style={{ opacity: isDragging ? 0.3 : 1 }}>
      <div
        {...listeners}
        {...attributes}
        className="px-5 py-2.5 border-b border-gray-50 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-gray-50"
      >
        <span className="text-sm text-gray-800 flex-1">{guest.name}</span>
        {tableName ? (
          <span className="text-[10px] bg-indigo-50 text-indigo-600 rounded px-1.5 py-0.5 font-medium whitespace-nowrap">{tableName}</span>
        ) : (
          <span className="text-[10px] bg-gray-100 text-gray-400 rounded px-1.5 py-0.5 font-medium">Unassigned</span>
        )}
      </div>
      {deps.map(dep => {
        const depInfo = assignments.get(dep.id)
        const depTable = depInfo?.tableId ? tableNameById.get(depInfo.tableId) : null
        return <DraggableSearchDep key={dep.id} dep={dep} tableName={depTable ?? null} />
      })}
    </li>
  )
}

function DraggableSearchDep({ dep, tableName }: { dep: Guest; tableName: string | null }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dep.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="pl-8 pr-5 py-2 border-b border-gray-50 flex items-center gap-2 bg-gray-50 cursor-grab active:cursor-grabbing"
    >
      <span className="text-xs text-gray-400 mr-0.5">↳</span>
      <span className="text-sm text-gray-600 flex-1">{dep.name}</span>
      {tableName ? (
        <span className="text-[10px] bg-indigo-50 text-indigo-600 rounded px-1.5 py-0.5 font-medium whitespace-nowrap">{tableName}</span>
      ) : (
        <span className="text-[10px] bg-gray-100 text-gray-400 rounded px-1.5 py-0.5 font-medium">Unassigned</span>
      )}
    </div>
  )
}

function DraggableDepRow({ dep }: { dep: Guest }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dep.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="pl-8 pr-5 py-2 border-b border-gray-50 flex items-center gap-2 bg-gray-50 cursor-grab active:cursor-grabbing"
    >
      <span className="text-xs text-gray-400 mr-0.5">↳</span>
      <span className="text-sm text-gray-600">{dep.name}</span>
      {dep.relationship_type === 'child' && (
        <span className="text-xs text-gray-400">child</span>
      )}
      {dep.needs_consideration && (
        <span className="ml-auto text-xs text-amber-500">⚑</span>
      )}
    </div>
  )
}

function DraggableGuestRow({ guest, deps, isHighlighted }: { guest: Guest; deps: Guest[]; isHighlighted: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id })
  return (
    <li ref={setNodeRef} style={{ opacity: isDragging ? 0.3 : 1 }}>
      <div
        {...listeners}
        {...attributes}
        suppressHydrationWarning
        className={`px-5 py-2.5 border-b border-gray-50 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors duration-1000 ${
          isHighlighted ? 'bg-amber-100' : ''
        }`}
      >
        <span className="text-sm text-gray-800">{guest.name}</span>
        {guest.needs_consideration && (
          <span className="ml-auto text-xs text-amber-500">⚑</span>
        )}
      </div>
      {deps.map(dep => (
        <DraggableDepRow key={dep.id} dep={dep} />
      ))}
    </li>
  )
}

export default function GuestList({ eventId, projectId, initialGuests, assignments, highlightedGuestIds, tables, siblingEvents }: Props) {
  const [adding, setAdding] = useState(false)
  const [addMode, setAddMode] = useState<'single' | 'couple'>('couple')
  const [newName, setNewName] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importCount, setImportCount] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copying, setCopying] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleCopyFromEvent(sourceEventId: string) {
    setCopying(true)
    const { data: sourceLinks } = await supabase
      .from('event_guests')
      .select('guest_id')
      .eq('event_id', sourceEventId)

    if (!sourceLinks?.length) { setCopying(false); return }

    const { data: currentLinks } = await supabase
      .from('event_guests')
      .select('guest_id')
      .eq('event_id', eventId)

    const alreadyHere = new Set((currentLinks ?? []).map(r => r.guest_id as string))
    const toAdd = sourceLinks.map(r => r.guest_id as string).filter(id => !alreadyHere.has(id))

    if (toAdd.length) {
      await supabase.from('event_guests').insert(
        toAdd.map(guestId => ({ event_id: eventId, guest_id: guestId }))
      )
    }

    setCopying(false)
    router.refresh()
  }
  const router = useRouter()

  const tableNameById = new Map(tables.map(t => [t.id, t.name]))

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
      const { data: primary } = await supabase
        .from('guests')
        .insert({ project_id: projectId, name: newName.trim(), relationship_type: 'primary' })
        .select('id')
        .single()
      if (primary) {
        await supabase.from('event_guests').insert({ event_id: eventId, guest_id: primary.id })
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

        type ParsedGuest = { name: string; relationship_type: RelationshipType; primaryName: string }
        const parsed: ParsedGuest[] = []

        for (const row of rows) {
          const primaryName = detectName(row)
          if (!primaryName) continue

          parsed.push({ name: primaryName, relationship_type: 'primary', primaryName: '' })

          const partnerFirst = row['Partner First Name']?.trim()
          const partnerLast = row['Partner Last Name']?.trim()
          if (partnerFirst) {
            parsed.push({
              name: `${partnerFirst} ${partnerLast ?? ''}`.trim(),
              relationship_type: 'plus_one',
              primaryName,
            })
          }

          for (let i = 1; i <= 5; i++) {
            const childFirst = row[`Child ${i} First Name`]?.trim()
            const childLast = row[`Child ${i} Last Name`]?.trim()
            if (childFirst) {
              parsed.push({
                name: `${childFirst} ${childLast ?? ''}`.trim(),
                relationship_type: 'child',
                primaryName,
              })
            }
          }
        }

        // Fetch all guests in this project (name → id)
        const { data: projectGuests } = await supabase
          .from('guests')
          .select('id, name')
          .eq('project_id', projectId)

        const projectNameToId = new Map(
          (projectGuests ?? []).map(g => [g.name.toLowerCase().trim(), g.id])
        )

        // Fetch guests already linked to THIS event
        const { data: currentEventLinks } = await supabase
          .from('event_guests')
          .select('guest_id')
          .eq('event_id', eventId)

        const alreadyInEvent = new Set((currentEventLinks ?? []).map(r => r.guest_id as string))

        // Split parsed guests:
        // - brand new (not in project at all) → insert into guests + event_guests
        // - exists in project but not this event → just insert into event_guests
        // - already in this event → skip
        const toCreateNew: ParsedGuest[] = []
        const toAddToEvent: string[] = []

        for (const g of parsed) {
          const existingId = projectNameToId.get(g.name.toLowerCase().trim())
          if (existingId) {
            if (!alreadyInEvent.has(existingId)) toAddToEvent.push(existingId)
          } else {
            toCreateNew.push(g)
          }
        }

        // Insert brand-new guests into the guests table
        let inserted: { id: string; name: string }[] = []
        if (toCreateNew.length) {
          const { data } = await supabase
            .from('guests')
            .insert(toCreateNew.map(g => ({
              project_id: projectId,
              name: g.name,
              relationship_type: g.relationship_type,
            })))
            .select('id, name')
          inserted = data ?? []
        }

        if (!inserted && !toAddToEvent.length) { setImporting(false); return }

        // Full name→id map for host_id linking
        const allNameToId = new Map([
          ...projectNameToId,
          ...inserted.map(g => [g.name.toLowerCase().trim(), g.id] as [string, string]),
        ])

        // Set host_id on newly created dependents
        for (let i = 0; i < toCreateNew.length; i++) {
          const g = toCreateNew[i]
          if (!g.primaryName) continue
          const hostId = allNameToId.get(g.primaryName.toLowerCase().trim())
          const guestId = inserted[i]?.id
          if (hostId && guestId) {
            await supabase.from('guests').update({ host_id: hostId }).eq('id', guestId)
          }
        }

        // Add event_guests rows for all guests being added to this event
        const eventLinks = [
          ...inserted.map(g => ({ event_id: eventId, guest_id: g.id })),
          ...toAddToEvent.map(id => ({ event_id: eventId, guest_id: id })),
        ]

        if (eventLinks.length) {
          await supabase.from('event_guests').insert(eventLinks)
        }

        setImportCount(eventLinks.length)
        setImporting(false)
        router.refresh()
      },
    })
  }

  // Build dependents map
  const dependents = new Map<string, Guest[]>()
  const primaries: Guest[] = []
  for (const g of initialGuests) {
    if (g.host_id) {
      const arr = dependents.get(g.host_id) ?? []
      arr.push(g)
      dependents.set(g.host_id, arr)
    } else {
      primaries.push(g)
    }
  }
  primaries.sort((a, b) => a.name.localeCompare(b.name))

  const unassigned = primaries.filter(g => !assignments.has(g.id))
  const assignedCount = primaries.length - unassigned.length

  const query = searchQuery.trim().toLowerCase()
  const searchResults = query
    ? primaries.filter(g => {
        if (g.name.toLowerCase().includes(query)) return true
        return (dependents.get(g.id) ?? []).some(d => d.name.toLowerCase().includes(query))
      })
    : []

  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({ id: 'guest-list' })

  return (
    <aside ref={setDropRef} className={`w-72 bg-white flex flex-col flex-shrink-0 transition-colors duration-200 ${isDropOver ? 'bg-blue-50' : ''}`}>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Guests
          {unassigned.length > 0 && (
            <span className="ml-1.5 text-gray-400 font-normal">{unassigned.length} unassigned</span>
          )}
          {assignedCount > 0 && unassigned.length === 0 && (
            <span className="ml-1.5 text-green-500 font-normal">all seated</span>
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
            className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors font-medium"
          >
            + Add
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

      {/* Search — always present, underline style */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" className="flex-shrink-0">
          <circle cx="6" cy="6" r="4" />
          <line x1="9.5" y1="9.5" x2="13" y2="13" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); (e.target as HTMLInputElement).blur() } }}
          placeholder="Search"
          className="flex-1 text-sm bg-transparent border-0 border-b border-gray-200 focus:border-gray-400 outline-none pb-0.5 placeholder-gray-300 text-gray-700 transition-colors"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-gray-300 hover:text-gray-500 text-base leading-none flex-shrink-0">×</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search results */}
        {query && (
          <ul>
            {searchResults.length === 0 ? (
              <li className="px-5 py-4 text-sm text-gray-400">No guests match "{searchQuery}"</li>
            ) : searchResults.map(guest => {
              const info = assignments.get(guest.id)
              const tableName = info?.tableId ? tableNameById.get(info.tableId) : null
              const deps = dependents.get(guest.id) ?? []
              return (
                <DraggableSearchRow
                  key={guest.id}
                  guest={guest}
                  deps={deps}
                  tableName={tableName}
                  assignments={assignments}
                  tableNameById={tableNameById}
                />
              )
            })}
          </ul>
        )}

        {adding && !query && (
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
          <div className={`px-5 py-3 text-sm border-b border-gray-50 ${importCount === 0 ? 'text-gray-400' : 'text-green-600'}`}>
            {importCount === 0 ? 'All guests already in this event.' : `✓ Added ${importCount} guest${importCount === 1 ? '' : 's'} to this event`}
          </div>
        )}

        {!query && (unassigned.length === 0 && !adding && !importing ? (
          primaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-6 py-8">
              <p className="text-sm text-gray-400">No guests yet</p>
              <p className="text-xs text-gray-300 mt-1">Add guests manually or import a CSV</p>
              {siblingEvents.length > 0 && (
                <div className="mt-5 flex flex-col gap-2 w-full">
                  <p className="text-xs text-gray-400 mb-1">Or copy a list from another event:</p>
                  {copying ? (
                    <p className="text-xs text-gray-400">Copying…</p>
                  ) : siblingEvents.map(e => (
                    <button
                      key={e.id}
                      onClick={() => handleCopyFromEvent(e.id)}
                      className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-lg px-3 py-2 transition-colors text-left"
                    >
                      Use list from <span className="font-medium">{e.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <p className="text-sm text-gray-500">Everyone is seated</p>
            </div>
          )
        ) : (
          <ul>
            {unassigned.map(host => (
              <DraggableGuestRow
                key={host.id}
                guest={host}
                deps={dependents.get(host.id) ?? []}
                isHighlighted={highlightedGuestIds.has(host.id)}
              />
            ))}
          </ul>
        ))}
      </div>
    </aside>
  )
}
