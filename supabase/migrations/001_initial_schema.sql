-- PlaceCard initial schema
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================================
-- PROJECTS
-- Top-level container (e.g. "Mickey & Sarah's Wedding")
-- ============================================================
CREATE TABLE projects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- EVENTS
-- A single sit-down occasion within a project
-- (e.g. "Rehearsal Dinner", "Reception")
-- ============================================================
CREATE TABLE events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  event_type  text NOT NULL CHECK (event_type IN ('wedding', 'dinner_party', 'charity_gala')),
  event_date  date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX events_project_id_idx ON events(project_id);

-- ============================================================
-- GUESTS
-- The guest pool for a project — shared across all events
-- ============================================================
CREATE TABLE guests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  side                 text,                    -- e.g. "bride's side", "groom's side"
  relationship_type    text NOT NULL DEFAULT 'primary'
                         CHECK (relationship_type IN ('primary', 'plus_one', 'child')),
  role_tag             text,                    -- e.g. "Best Man", "Officiant"
  needs_consideration  boolean NOT NULL DEFAULT false,
  partner_id           uuid REFERENCES guests(id) ON DELETE SET NULL,
  host_id              uuid REFERENCES guests(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX guests_project_id_idx ON guests(project_id);
CREATE INDEX guests_partner_id_idx ON guests(partner_id);
CREATE INDEX guests_host_id_idx    ON guests(host_id);

-- ============================================================
-- EVENT_GUESTS
-- Which guests are attending which specific event
-- (a subset of the project's guest pool)
-- ============================================================
CREATE TABLE event_guests (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id  uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id  uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  UNIQUE (event_id, guest_id)
);

CREATE INDEX event_guests_event_id_idx ON event_guests(event_id);
CREATE INDEX event_guests_guest_id_idx ON event_guests(guest_id);

-- ============================================================
-- TABLES
-- Physical seating surfaces at a specific event
-- ============================================================
CREATE TABLE tables (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       text NOT NULL,
  shape      text NOT NULL DEFAULT 'round'
               CHECK (shape IN ('round', 'rectangular', 'oval')),
  capacity   integer NOT NULL CHECK (capacity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tables_event_id_idx ON tables(event_id);

-- ============================================================
-- SEAT_ASSIGNMENTS
-- Who sits at which table, per event
-- table_id = NULL means the guest is in the unassigned pile
-- ============================================================
CREATE TABLE seat_assignments (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id  uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id  uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  table_id  uuid REFERENCES tables(id) ON DELETE SET NULL,
  UNIQUE (event_id, guest_id)
);

CREATE INDEX seat_assignments_event_id_idx ON seat_assignments(event_id);
CREATE INDEX seat_assignments_guest_id_idx ON seat_assignments(guest_id);
CREATE INDEX seat_assignments_table_id_idx ON seat_assignments(table_id);
