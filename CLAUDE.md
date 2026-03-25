@AGENTS.md

# CLAUDE.md — PlaceCard

Instructions for Claude when working on this project. Read this before touching any code.

---

## What We Are Building

PlaceCard is a desktop-first web app for planning event seating. The core experience: create a project, import a guest list, set up tables, drag guests into seats, share with a collaborator, export as PDF.

The full PRD is in `placecard-prd.md`. Read it before making any product or feature decisions.

---

## The Product Philosophy

- **Ease of use is the product.** The benchmark is Canva. Any schmuck should be able to plan a thoughtful seating chart without instructions.
- **Simple beats clever.** Do not over-engineer. Do not add features that were not asked for. Do not add comments, error states, or abstractions for hypothetical future needs.
- **Calm design.** This product is used during a stressful time in people's lives. Every interaction should reduce anxiety, not add to it.
- **Desktop-first.** Do not optimize for mobile in v1. Build for a real screen.

---

## What We Are NOT Building in V1

- No AI-powered seating suggestions
- No seating rules engine or auto-assign
- No attendee-facing social features
- No mobile optimization
- No integrations with Zola, The Knot, or other wedding platforms (CSV import only)

Do not add any of these unless explicitly asked.

---

## Key User

Mickey is planning his wedding. He knows his guests but not all of his fiancee's guests. He has a racist uncle who needs careful placement. He has a real 62-person wedding to plan. He is the first real test of this product.

---

## Core Data Concepts

- **Project:** A container for one or more related events (e.g. a wedding that includes a rehearsal dinner and a reception)
- **Event:** A single sit-down occasion within a project, with its own table layout and guest subset
- **Guest:** A person attending an event, with attributes: name, side, relationship type, role tag, "needs consideration" flag, and optional partner/couple link
- **Table:** A seating surface with a name/number, shape, and capacity
- **Collaborator:** A user invited to edit a project, requires a free account, capped at 3 per project

---

## Business Logic to Always Respect

1. Coupled guests are always assigned to the same table
2. A "plus one" or "guest" is automatically paired with their named host
3. A project shares a guest pool across events by default, but each event can use a subset
4. Collaborator access is free. Payment is only triggered when a user creates their own new event
5. Tables cannot be overfilled beyond their set capacity
6. An unassigned guest holding area is always visible until every guest is seated
7. Event type (Wedding, Dinner Party, Charity/Gala) is selected at creation and determines available side labels and role tags
8. CSV importer should recognize Zola export format and auto-link partners and children

---

## Pricing (TBD)

Pricing model is not yet decided. Do not hardcode any prices. Do not build a paywall until explicitly instructed. When payment logic is needed, flag it as a placeholder.

---

## Tech Stack (Locked)

See `tech-stack.md` for full rationale. Summary:

| Layer | Tool |
|-------|------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Drag and Drop | dnd-kit |
| Database + Auth | Supabase |
| State | Zustand |
| CSV Parsing | PapaParse |
| PDF Export | react-pdf (not yet installed) |
| Hosting | Vercel (not yet connected) |

**Auth is deferred.** Not built until the core drag-and-drop experience is validated. Code is scaffolded to make adding it easy later. Nothing gated behind login in the prototype.

---

## Tone and Naming

- The product is called **PlaceCard** (one word, title case)
- Do not use wedding-specific language in generic UI. "Host" not "bride." "Guests" not "wedding guests." "Event" not "wedding."
- The exception is inside wedding-specific event type flows, where wedding vocabulary is appropriate

---

## Environment

- **GitHub:** https://github.com/abitsky/table-plan
- **Supabase URL:** https://zdnjlkcrtudvfywbdcao.supabase.co
- **Supabase key format:** `sb_publishable_...` (new Supabase key format — not the old JWT format)
- **Local dev:** runs on `localhost:3001` (`npm run dev`)
- **Vercel:** not yet connected (planned after first UI is working)
- **Node version:** v25.6.1

---

## Linear Project Setup (PlaceCard)

Workspace: https://linear.app/placecard-dev

### Labels
| Label | When to use |
|-------|-------------|
| Feature | New thing being built |
| Bug | Something broken that needs fixing |
| Chore | Maintenance, cleanup, config — not user-facing |

### Workflow Statuses
Backlog → Todo → In Progress → Done

### Cycles
- 1-week cycles, named by date range (e.g. "Mar 30 – Apr 5")
- No priority levels — use ordering instead
- No sub-issues

### Current Cycle: Mar 30 – Apr 5
| Issue | Label | Title |
|-------|-------|-------|
| PLA-5 | Chore | Initialize Next.js app with TypeScript, Tailwind, and dnd-kit |
| PLA-6 | Chore | Set up Supabase schema — projects, events, guests, tables |
| PLA-7 | Chore | Deploy skeleton app to Vercel |
| PLA-8 | Feature | Project and event creation flow — name, event type |
| PLA-9 | Feature | Guest list: add guests manually, view unassigned list |
| PLA-10 | Feature | Table setup: add tables with name, shape, and capacity |
| PLA-11 | Feature | Drag-and-drop seating canvas — guests as draggables, tables as drop targets |

---

## Session Notes

### Session 1 — Mar 24, 2026
- Linear configured: labels (Feature/Bug/Chore), 1-week cycles enabled, first cycle created (Mar 30–Apr 5), 7 issues created (PLA-5 through PLA-11)
- PLA-5 complete: Next.js 16 scaffolded, all packages installed, Supabase client created at `lib/supabase.ts`, pushed to GitHub
- App runs on localhost:3001 with zero errors
- Vercel not yet connected — decision to build locally first, add Vercel when first UI is ready to share
- PLA-6 complete: Supabase schema created — 6 tables live in DB, TypeScript types at `lib/types.ts`, migration file at `supabase/migrations/001_initial_schema.sql`
- 3 backlog issues created for deferred auth work: PLA-12 (users table), PLA-13 (collaborators table), PLA-14 (RLS policies)
- PLA-8 complete: Full creation flow live — dashboard (`/`), create project (`/projects/new`), project page (`/projects/[id]`), create event (`/projects/[id]/events/new`), event workspace skeleton (`/events/[id]`)
- Note: `params` is a Promise in Next.js 16 — always `await params` in server components, use `use(params)` in client components
- PLA-9 complete: Guest list live — manual add (Single/Couple toggle), CSV import (Zola format detection), plus-ones grouped under host with ↳ indent, A-Z sort. Files: `app/events/[id]/GuestList.tsx`, `app/events/[id]/page.tsx`. Sample CSV at `sample-guests.csv`.
- PLA-10 complete: Table setup live — visual two-step add flow (shape dropdown → name/seats inline form), tables render as shapes in canvas, ghost floor plan background in empty state. File: `app/events/[id]/TableCanvas.tsx`.
- Next up: PLA-11 — Drag-and-drop seating canvas

### PLA-11 Plan (start here next session)

**The UX philosophy:** Tables are buckets, not seating charts. Phase 1 is fast grouping — drag couples/groups to tables in rapid bursts. Seat-by-seat arrangement is Phase 2 (future).

**Architecture:**
- Need a new client component `SeatingWorkspace.tsx` that wraps both `TableCanvas` and `GuestList` inside a single dnd-kit `DndContext`
- `page.tsx` (server) fetches everything (event, guests, tables, seat_assignments) and passes to `SeatingWorkspace`
- `SeatingWorkspace` owns drag state and seat assignment state
- On drop: update local state immediately (optimistic), write to Supabase in background

**What to build:**
1. `SeatingWorkspace.tsx` — client wrapper with `DndContext`, owns `seatAssignments` state (Map<guestId, tableId>)
2. Make guest list items `Draggable` — the drag unit is the primary guest + all their dependents (host_id links)
3. Make table cards `Droppable` — full shape is the hit target, generous drop zone
4. On drop: move primary guest + their plus-ones/children together atomically
5. Guest list shows ONLY unassigned guests (disappears instantly on drop — optimistic)
6. Table cards show seated guests as compact name chips inside the shape + "N/capacity" count
7. Capacity soft-enforced: dropping over capacity turns table red, but doesn't block the drop
8. `seat_assignments` table in Supabase: `{ event_id, guest_id, table_id }` — upsert on drop

**Key decisions already made:**
- Optimistic UI (instant local update, silent async DB write)
- Couple = atomic drag unit (primary + dependents move together)
- No individual seat positions within tables yet
- Soft capacity warning (red highlight), not a hard block
- dnd-kit is already installed (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)
