-- Add head_seats to tables: number of seats at the ends of a rectangular table.
-- Defaults to 0 (existing behavior unchanged). UI support comes in a future issue.
ALTER TABLE tables
  ADD COLUMN head_seats smallint NOT NULL DEFAULT 0
    CHECK (head_seats >= 0 AND head_seats <= 4);
