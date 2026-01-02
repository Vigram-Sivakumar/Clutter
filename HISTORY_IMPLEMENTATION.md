# Note History Implementation Guide

**Status:** 📋 Ready to Implement  
**Approach:** Apple Notes Architecture  
**Timeline:** 2-3 days

---

## 🎯 Philosophy: Immutable History + Latest Snapshot

**Apple Notes principle:**
> "Notes are never edited - they're replaced with new snapshots while preserving history."

**Benefits:**
- ✅ Undo/redo (unlimited!)
- ✅ Version comparison/diff
- ✅ Conflict resolution (for future sync)
- ✅ Recovery from accidental deletions
- ✅ Timeline view

---

## 📊 Database Schema

### 1. Add History Table

```sql
CREATE TABLE IF NOT EXISTS note_history (
    id TEXT PRIMARY KEY,                    -- unique history entry ID
    note_id TEXT NOT NULL,                  -- reference to parent note
    content TEXT NOT NULL,                  -- snapshot of content
    title TEXT NOT NULL,                    -- snapshot of title
    description TEXT NOT NULL,              -- snapshot of description
    tags TEXT NOT NULL,                     -- JSON array of tags at this point
    created_at INTEGER NOT NULL,            -- when this version was created (epoch ms)
    created_by TEXT DEFAULT 'user',         -- 'user', 'auto-save', 'sync', etc.
    
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_history_note ON note_history(note_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON note_history(note_id, created_at DESC);
```

### 2. Update Notes Table (Add INTEGER Timestamps)

Since history requires reliable time ordering, we need to migrate to INTEGER timestamps:

```sql
-- Add new columns
ALTER TABLE notes ADD COLUMN created_at_int INTEGER;
ALTER TABLE notes ADD COLUMN updated_at_int INTEGER;

-- Migrate existing data
UPDATE notes SET 
    created_at_int = CAST((strftime('%s', created_at) * 1000) AS INTEGER),
    updated_at_int = CAST((strftime('%s', updated_at) * 1000) AS INTEGER);

-- Eventually drop old columns (after thorough testing)
ALTER TABLE notes DROP COLUMN created_at;
ALTER TABLE notes DROP COLUMN updated_at;
```

---

## 🔄 History Creation Strategy

### When to Create History Snapshots:

**1. Automatic (Apple Notes approach):**
- ✅ Every N minutes of editing (e.g., every 5 minutes)
- ✅ When switching notes (save current state)
- ✅ Before bulk operations (tag changes, moves)
- ❌ NOT on every keystroke (too noisy!)

**2. Manual:**
- User explicitly saves a "checkpoint"
- Before major edits (optional UI button)

### Implementation:

```rust
// In database.rs
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteHistoryEntry {
    pub id: String,
    pub note_id: String,
    pub content: String,
    pub title: String,
    pub description: String,
    pub tags: String,  // JSON array
    pub created_at: i64,
    pub created_by: String,
}

/// Save a history snapshot of a note
#[tauri::command]
pub fn save_note_history(
    note: Note,
    created_by: Option<String>,
    state: State<DbConnection>
) -> Result<String, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    let history_id = format!("history-{}-{}", 
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis(),
        &note.id[5..15]  // Add note ID fragment for uniqueness
    );
    
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    
    let tags_json = serde_json::to_string(&note.tags).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO note_history 
        (id, note_id, content, title, description, tags, created_at, created_by)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (
            &history_id,
            &note.id,
            &note.content,
            &note.title,
            &note.description,
            &tags_json,
            now,
            created_by.unwrap_or_else(|| "user".to_string()),
        ),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(history_id)
}

/// Load history for a note (most recent first)
#[tauri::command]
pub fn load_note_history(
    note_id: String,
    limit: Option<i32>,
    state: State<DbConnection>
) -> Result<Vec<NoteHistoryEntry>, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    let limit_val = limit.unwrap_or(50);  // Default: last 50 versions
    
    let mut stmt = conn
        .prepare(
            "SELECT id, note_id, content, title, description, tags, created_at, created_by
             FROM note_history
             WHERE note_id = ?1
             ORDER BY created_at DESC
             LIMIT ?2"
        )
        .map_err(|e| e.to_string())?;
    
    let history: Vec<NoteHistoryEntry> = stmt
        .query_map([&note_id, &limit_val.to_string()], |row| {
            Ok(NoteHistoryEntry {
                id: row.get(0)?,
                note_id: row.get(1)?,
                content: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                tags: row.get(5)?,
                created_at: row.get(6)?,
                created_by: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<NoteHistoryEntry>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(history)
}

/// Restore a note from history
#[tauri::command]
pub fn restore_note_from_history(
    history_id: String,
    state: State<DbConnection>
) -> Result<Note, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    // Load the history entry
    let mut stmt = conn
        .prepare("SELECT note_id, content, title, description, tags FROM note_history WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    let (note_id, content, title, description, tags_json): (String, String, String, String, String) = 
        stmt.query_row([&history_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    
    // Parse tags
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
    
    // Load current note
    let mut note_stmt = conn
        .prepare("SELECT * FROM notes WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    // ... (build complete Note object with restored content)
    
    // Save current state to history before restoring (undo safety!)
    // ... call save_note_history
    
    // Update note with historical content
    // ... call save_note
    
    Ok(note)
}
```

---

## 🧹 History Cleanup Strategy

### Retention Policy (Apple Notes approach):

**Keep:**
- All history from last 30 days
- 1 snapshot per day for days 31-90
- 1 snapshot per week for 91-365 days
- 1 snapshot per month for 1+ years

**Implementation:**

```rust
/// Cleanup old history entries (called periodically, e.g., on app launch)
#[tauri::command]
pub fn cleanup_old_history(state: State<DbConnection>) -> Result<String, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    
    let day_ms = 24 * 60 * 60 * 1000i64;
    
    // Keep all history from last 30 days
    let thirty_days_ago = now - (30 * day_ms);
    
    // Keep 1/day for 31-90 days (delete others)
    let ninety_days_ago = now - (90 * day_ms);
    
    // Keep 1/week for 91-365 days
    let year_ago = now - (365 * day_ms);
    
    // Delete history older than 1 year (or implement monthly retention)
    conn.execute(
        "DELETE FROM note_history WHERE created_at < ?1",
        [year_ago],
    )
    .map_err(|e| e.to_string())?;
    
    // TODO: Implement daily/weekly sampling for 31-365 days
    
    Ok("History cleanup complete".to_string())
}
```

---

## 💾 Auto-Save Integration

### Modify useAutoSave Hook:

```typescript
// In useAutoSave.ts
import { saveNoteToDatabase, saveNoteHistoryToDatabase } from '../lib/database';

export function useAutoSave(isEnabled: boolean = true) {
  const lastHistorySaveRef = useRef<Map<string, number>>(new Map());
  const HISTORY_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  // Existing auto-save logic...
  
  useEffect(() => {
    if (!isEnabled) return;
    
    saveTimeoutRef.current = setTimeout(async () => {
      for (const note of changedNotes) {
        try {
          // Save to database
          await saveNoteToDatabase(note);
          lastSavedContentRef.current.set(note.id, note.content);
          
          // Check if we should save history
          const lastHistorySave = lastHistorySaveRef.current.get(note.id) || 0;
          const now = Date.now();
          
          if (now - lastHistorySave > HISTORY_INTERVAL) {
            // Save history snapshot
            await saveNoteHistoryToDatabase(note, 'auto-save');
            lastHistorySaveRef.current.set(note.id, now);
          }
        } catch (error) {
          console.error(`❌ Auto-save failed for ${note.id}:`, error);
        }
      }
    }, 2000);
    
    // Cleanup...
  }, [notes, currentNoteId, isEnabled]);
  
  // Save history when switching notes (important!)
  useEffect(() => {
    if (!isEnabled || !currentNote) return;
    
    const previousNoteId = /* track previous note somehow */;
    if (previousNoteId && previousNoteId !== currentNoteId) {
      const previousNote = notes.find(n => n.id === previousNoteId);
      if (previousNote) {
        // Save history before switching
        saveNoteHistoryToDatabase(previousNote, 'note-switch');
      }
    }
  }, [currentNoteId]);
}
```

---

## 🎨 UI Features to Build

### 1. History Timeline View

```typescript
// NoteHistoryTimeline.tsx
interface HistoryTimelineProps {
  noteId: string;
}

export function NoteHistoryTimeline({ noteId }: HistoryTimelineProps) {
  const [history, setHistory] = useState<NoteHistoryEntry[]>([]);
  
  useEffect(() => {
    loadNoteHistory(noteId, 50).then(setHistory);
  }, [noteId]);
  
  return (
    <div>
      {history.map(entry => (
        <div key={entry.id}>
          <time>{new Date(entry.created_at).toLocaleString()}</time>
          <button onClick={() => restoreFromHistory(entry.id)}>
            Restore
          </button>
          <button onClick={() => showDiff(entry)}>
            Compare
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 2. Undo/Redo (Simple Version)

```typescript
// Use history as undo stack
function undo() {
  const history = await loadNoteHistory(currentNote.id, 2);
  if (history.length >= 2) {
    await restoreFromHistory(history[1].id); // Restore previous version
  }
}
```

### 3. Version Diff View

Use a library like `diff-match-patch` or `react-diff-viewer`:

```typescript
import ReactDiffViewer from 'react-diff-viewer';

function showDiff(historyEntry: NoteHistoryEntry, currentNote: Note) {
  return (
    <ReactDiffViewer
      oldValue={historyEntry.content}
      newValue={currentNote.content}
      splitView={true}
    />
  );
}
```

---

## 🚀 Implementation Checklist

### Day 1: Database & Core Logic
- [ ] Add `note_history` table
- [ ] Migrate to INTEGER timestamps
- [ ] Implement `save_note_history` command
- [ ] Implement `load_note_history` command
- [ ] Implement `restore_note_from_history` command
- [ ] Add TypeScript wrappers
- [ ] Test with manual saves

### Day 2: Auto-Save Integration
- [ ] Modify `useAutoSave` to save history every 5 minutes
- [ ] Save history on note switch
- [ ] Save history before bulk operations
- [ ] Test auto-save history creation

### Day 3: UI & Polish
- [ ] Build history timeline component
- [ ] Add "Restore" functionality
- [ ] Add diff viewer
- [ ] Add undo button (optional)
- [ ] Implement history cleanup
- [ ] Test edge cases (concurrent edits, etc.)

---

## ⚠️ Important Considerations

### 1. Performance
- ✅ History is queried on-demand (not loaded with notes)
- ✅ Limit default to 50 versions
- ✅ Index on `note_id` + `created_at` for fast queries

### 2. Storage
- At 1KB per version, 10,000 versions = 10MB (negligible)
- Cleanup keeps DB size manageable
- WAL mode handles writes efficiently

### 3. Conflicts (for future sync)
- History provides "last write wins" data
- Timestamp ordering resolves conflicts
- Can build CRDT on top if needed

---

## 📚 References

**Apple Notes approach:**
- Immutable snapshots
- Automatic versioning
- No user-facing "version numbers"
- Silent cleanup of old versions

**Bear approach:**
- Similar to Apple Notes
- History accessible via UI
- Diff view between versions

**Notion approach:**
- More granular (block-level history)
- More complex, not needed for v1

---

## 🎯 Success Criteria

After implementation, you should have:
- ✅ Automatic history every 5 minutes
- ✅ History saved on note switch
- ✅ 50+ versions per note (if active)
- ✅ Restore working perfectly
- ✅ No performance degradation
- ✅ Undo button (basic version)

**Result:** Your app will now have **unlimited undo** and **version history** - matching Apple Notes and Bear!

---

**Ready to implement?** Start with Day 1 (database changes), test thoroughly, then move to Day 2 (auto-save) and Day 3 (UI).

Good luck! 🚀

