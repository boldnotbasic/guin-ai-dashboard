-- Add notes column to project_tasks table for rich text content
-- Migration: add_task_notes
-- Date: 2026-07-09

-- Add notes column (TEXT type to store HTML content from Quill editor)
ALTER TABLE project_tasks 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_project_tasks_notes ON project_tasks(project_id) WHERE notes IS NOT NULL;

-- Comment
COMMENT ON COLUMN project_tasks.notes IS 'Rich text HTML content from Quill editor for task notes';
