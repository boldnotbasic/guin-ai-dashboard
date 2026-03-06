-- Add task_type column to project_tasks table
-- Values: 'task' (default) or 'social_post'
ALTER TABLE project_tasks
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'task' CHECK (task_type IN ('task', 'social_post'));
