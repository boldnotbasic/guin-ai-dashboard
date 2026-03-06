-- Make project_id nullable in project_tasks to allow tasks without a project (No Client)
ALTER TABLE project_tasks 
  ALTER COLUMN project_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL
-- First drop the existing constraint
ALTER TABLE project_tasks 
  DROP CONSTRAINT IF EXISTS project_tasks_project_id_fkey;

-- Add it back with ON DELETE CASCADE but allowing NULL
ALTER TABLE project_tasks 
  ADD CONSTRAINT project_tasks_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;

-- Add task_type column if it doesn't exist (for task vs social post distinction)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_tasks' AND column_name = 'task_type'
  ) THEN
    ALTER TABLE project_tasks ADD COLUMN task_type TEXT DEFAULT 'task';
  END IF;
END $$;
