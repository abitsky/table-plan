export type EventType = 'wedding' | 'dinner_party' | 'charity_gala'
export type RelationshipType = 'primary' | 'plus_one' | 'child'
export type TableShape = 'round' | 'rectangular' | 'oval'

export interface Project {
  id: string
  name: string
  created_at: string
}

export interface Event {
  id: string
  project_id: string
  name: string
  event_type: EventType
  event_date: string | null
  created_at: string
}

export interface Guest {
  id: string
  project_id: string
  name: string
  side: string | null
  relationship_type: RelationshipType
  role_tag: string | null
  needs_consideration: boolean
  partner_id: string | null
  host_id: string | null
  created_at: string
}

export interface EventGuest {
  id: string
  event_id: string
  guest_id: string
}

export interface Table {
  id: string
  event_id: string
  name: string
  shape: TableShape
  capacity: number
  created_at: string
}

export interface SeatAssignment {
  id: string
  event_id: string
  guest_id: string
  table_id: string | null
}
