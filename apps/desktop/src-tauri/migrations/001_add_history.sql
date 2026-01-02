-- Migration: Add Note History Support
-- Run this migration when implementing history feature
-- Date: TBD (when implementing)

-- Step 1: Add INTEGER timestamp columns to notes table
ALTER TABLE notes ADD COLUMN created_at_int INTEGER;
ALTER TABLE notes ADD COLUMN updated_at_int INTEGER;

-- Step 2: Migrate existing string timestamps to integers (epoch milliseconds)
UPDATE notes SET 
    created_at_int = CAST((strftime('%s', created_at) * 1000) AS INTEGER),
    updated_at_int = CAST((strftime('%s', updated_at) * 1000) AS INTEGER)
WHERE created_at IS NOT NULL AND updated_at IS NOT NULL;

-- Step 3: Create note_history table
CREATE TABLE IF NOT EXISTS note_history (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    content TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tags TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    created_by TEXT DEFAULT 'user',
    
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- Step 4: Create indexes for fast history queries
CREATE INDEX IF NOT EXISTS idx_history_note ON note_history(note_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON note_history(note_id, created_at DESC);

-- Step 5: Create initial history snapshots from current notes
-- This preserves current state as "version 1" for all existing notes
INSERT INTO note_history (id, note_id, content, title, description, tags, created_at, created_by)
SELECT 
    'history-init-' || id,
    id,
    content,
    title,
    description,
    '[]',  -- Empty tags array for initial snapshot
    COALESCE(created_at_int, CAST((strftime('%s', 'now') * 1000) AS INTEGER)),
    'migration'
FROM notes
WHERE deleted_at IS NULL;

-- Note: After thorough testing (1-2 weeks), you can drop old string columns:
-- ALTER TABLE notes DROP COLUMN created_at;
-- ALTER TABLE notes DROP COLUMN updated_at;
-- Then rename the new columns:
-- ALTER TABLE notes RENAME COLUMN created_at_int TO created_at;
-- ALTER TABLE notes RENAME COLUMN updated_at_int TO updated_at;

