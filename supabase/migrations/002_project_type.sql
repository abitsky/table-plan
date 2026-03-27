-- Add type column to projects
-- Existing projects (like Mickey's wedding) default to 'multi'
ALTER TABLE projects
  ADD COLUMN type text NOT NULL DEFAULT 'multi'
    CHECK (type IN ('single', 'multi'));
