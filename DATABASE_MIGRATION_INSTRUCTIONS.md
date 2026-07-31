# Database Migration: Add Notes Column to Tasks

## Migration File
`database/migrations/add_task_notes.sql`

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the contents of `database/migrations/add_task_notes.sql`
5. Paste and run the SQL

### Option 2: Via Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Manual SQL
Run this SQL in your Supabase SQL editor:

```sql
-- Add notes column to project_tasks table for rich text content
ALTER TABLE project_tasks 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_project_tasks_notes ON project_tasks(project_id) WHERE notes IS NOT NULL;

-- Comment
COMMENT ON COLUMN project_tasks.notes IS 'Rich text HTML content from Quill editor for task notes';
```

## What Changed
- Added `notes` TEXT column to `project_tasks` table
- This column stores rich HTML content from the Quill editor
- Supports bold, italic, underline, links, and lists

## Testing
After migration:
1. Open a project in the Projecten section
2. Click on a task or create a new one
3. You should see a "Notes" rich text editor
4. Add formatted text with bold, links, etc.
5. Save and verify the notes appear in the task card
