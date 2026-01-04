use rusqlite::{Connection, Result, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;
use chrono;

// Thread-safe database connection wrapper
pub struct DbConnection(pub Mutex<Option<Connection>>);

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub description: String,
    pub description_visible: bool,
    pub emoji: Option<String>,
    pub content: String,
    pub tags: Vec<String>,
    pub tags_visible: bool,
    pub is_favorite: bool,
    pub folder_id: Option<String>,
    pub daily_note_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub description: String,
    pub description_visible: bool,
    pub color: Option<String>,
    pub emoji: Option<String>,
    pub tags: Vec<String>,
    pub tags_visible: bool,
    pub is_favorite: bool,
    pub is_expanded: bool,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub name: String,
    pub description: String,
    pub description_visible: bool,
    pub is_favorite: bool,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

/// Initialize database at the specified path
#[tauri::command]
pub fn init_database(db_path: String, state: State<DbConnection>) -> Result<String, String> {
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    
    // Enable foreign key constraints (critical for referential integrity)
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| e.to_string())?;
    
    // Configure SQLite for optimal local-only performance (Apple Notes approach)
    // WAL mode: Fast writes, concurrent reads
    conn.query_row("PRAGMA journal_mode = WAL", [], |_| Ok(())).ok();
    // NORMAL synchronous: Balance between safety and speed (safe for local apps)
    conn.query_row("PRAGMA synchronous = NORMAL", [], |_| Ok(())).ok();
    // Suggested page cache size: ~8MB (2000 pages * 4KB)
    conn.query_row("PRAGMA cache_size = -8000", [], |_| Ok(())).ok();
    
    // Create notes table (IF NOT EXISTS - preserves data on restart)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            description_visible INTEGER NOT NULL,
            emoji TEXT,
            content TEXT NOT NULL,
            tags_visible INTEGER NOT NULL,
            is_favorite INTEGER NOT NULL,
            folder_id TEXT,
            daily_note_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    // Create folders table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            description TEXT NOT NULL,
            description_visible INTEGER NOT NULL,
            color TEXT,
            emoji TEXT,
            tags_visible INTEGER NOT NULL,
            is_favorite INTEGER NOT NULL,
            is_expanded INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT,
            FOREIGN KEY (parent_id) REFERENCES folders(id)
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    // Create tags table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tags (
            name TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            description_visible INTEGER NOT NULL,
            is_favorite INTEGER NOT NULL,
            color TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    // Add deleted_at column to existing tags table (migration)
    // This will fail silently if the column already exists
    let _ = conn.execute(
        "ALTER TABLE tags ADD COLUMN deleted_at TEXT",
        [],
    );
    
    // Create note_tags junction table (many-to-many)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS note_tags (
            note_id TEXT NOT NULL,
            tag_name TEXT NOT NULL,
            PRIMARY KEY (note_id, tag_name),
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_name) REFERENCES tags(name) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    // Create folder_tags junction table (many-to-many)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS folder_tags (
            folder_id TEXT NOT NULL,
            tag_name TEXT NOT NULL,
            PRIMARY KEY (folder_id, tag_name),
            FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_name) REFERENCES tags(name) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    // Create settings table for user preferences
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    // Create indexes for better performance (IF NOT EXISTS - safe for existing databases)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id)", [])
        .map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_notes_daily_date ON notes(daily_note_date)", [])
        .map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted_at)", [])
        .map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(is_favorite)", [])
        .map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at)", [])
        .map_err(|e| e.to_string())?;
    
    conn.execute("CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)", [])
        .map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_folders_deleted ON folders(deleted_at)", [])
        .map_err(|e| e.to_string())?;
    
    conn.execute("CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id)", [])
        .map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_name)", [])
        .map_err(|e| e.to_string())?;
    
    conn.execute("CREATE INDEX IF NOT EXISTS idx_folder_tags_folder ON folder_tags(folder_id)", [])
        .map_err(|e| e.to_string())?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_folder_tags_tag ON folder_tags(tag_name)", [])
        .map_err(|e| e.to_string())?;
    
    // Create FTS5 virtual table for full-text search (Apple Notes / Bear approach)
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
            note_id UNINDEXED,
            title,
            content,
            tokenize='unicode61'
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    // Triggers to keep FTS in sync with notes table
    // Insert trigger
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
            INSERT INTO notes_fts(note_id, title, content)
            VALUES (new.id, new.title, new.content);
        END",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    // Update trigger
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
            UPDATE notes_fts 
            SET title = new.title, content = new.content
            WHERE note_id = old.id;
        END",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    // Delete trigger
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
            DELETE FROM notes_fts WHERE note_id = old.id;
        END",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    // Store connection in state
    *state.0.lock().unwrap() = Some(conn);
    
    Ok(format!("Database initialized at: {}", db_path))
}

/// Save or update a note
#[tauri::command]
pub fn save_note(note: Note, state: State<DbConnection>) -> Result<String, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    // 🔍 DEBUG: Log content length to catch empty saves
    println!(
        "💾 Saving note {} | title: {} | content length: {}",
        &note.id[..20],  // First 20 chars of ID
        if note.title.len() > 30 { &note.title[..30] } else { &note.title },
        note.content.len()
    );
    
    // 🛡️ GUARD: Only prevent PURE boot state (null, empty string, etc.)
    // Allow structured empty content (intentional deletions)
    let is_pure_boot_state = note.content.is_empty() 
        || note.content == r#""""# 
        || note.content == "{}";
    
    if is_pure_boot_state {
        // Check if note exists in DB with content
        let existing_content_len: Option<usize> = conn
            .query_row(
                "SELECT LENGTH(content) FROM notes WHERE id = ?1",
                [&note.id],
                |row| row.get(0)
            )
            .ok();
        
        // Only block if overwriting existing content with pure boot state
        if let Some(existing_len) = existing_content_len {
            if existing_len > 200 {
                return Err(format!(
                    "🚨 BLOCKED: Attempted to overwrite note '{}' ({} chars) with pure boot state",
                    note.title, existing_len
                ));
            }
        }
    }
    
    // ✅ UPSERT: Use INSERT ... ON CONFLICT instead of INSERT OR REPLACE
    // This preserves row identity and is safer
    conn.execute(
        "INSERT INTO notes 
        (id, title, description, description_visible, emoji, content, tags_visible, is_favorite, 
         folder_id, daily_note_date, created_at, updated_at, deleted_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            description_visible = excluded.description_visible,
            emoji = excluded.emoji,
            content = excluded.content,
            tags_visible = excluded.tags_visible,
            is_favorite = excluded.is_favorite,
            folder_id = excluded.folder_id,
            daily_note_date = excluded.daily_note_date,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at",
        (
            &note.id,
            &note.title,
            &note.description,
            note.description_visible as i32,
            &note.emoji,
            &note.content,
            note.tags_visible as i32,
            note.is_favorite as i32,
            &note.folder_id,
            &note.daily_note_date,
            &note.created_at,
            &note.updated_at,
            &note.deleted_at,
        ),
    )
    .map_err(|e| e.to_string())?;
    
    // Ensure all tags exist in tags table (idempotent upsert)
    // This prevents FK violations when inserting into note_tags
    for tag in &note.tags {
        conn.execute(
            "INSERT INTO tags (name, description, description_visible, is_favorite, color, created_at, updated_at)
             VALUES (?1, '', 1, 0, NULL, ?2, ?2)
             ON CONFLICT(name) DO NOTHING",
            (tag, &note.updated_at),
        )
        .map_err(|e| e.to_string())?;
    }
    
    // Delete existing tag relationships
    conn.execute(
        "DELETE FROM note_tags WHERE note_id = ?1",
        [&note.id],
    )
    .map_err(|e| e.to_string())?;
    
    // Insert new tag relationships
    for tag in &note.tags {
        conn.execute(
            "INSERT INTO note_tags (note_id, tag_name) VALUES (?1, ?2)",
            (&note.id, tag),
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(format!("Note saved: {}", note.id))
}

/// Load a single note by ID
#[tauri::command]
pub fn load_note(note_id: String, state: State<DbConnection>) -> Result<Note, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    // Load note
    let mut note = conn
        .query_row(
            "SELECT id, title, description, description_visible, emoji, content, tags_visible, 
             is_favorite, folder_id, daily_note_date, created_at, updated_at, deleted_at 
             FROM notes WHERE id = ?1",
            [&note_id],
            |row| {
                Ok(Note {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    description_visible: row.get::<_, i32>(3)? != 0,
                    emoji: row.get(4)?,
                    content: row.get(5)?,
                    tags: Vec::new(), // Will be populated below
                    tags_visible: row.get::<_, i32>(6)? != 0,
                    is_favorite: row.get::<_, i32>(7)? != 0,
                    folder_id: row.get(8)?,
                    daily_note_date: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                    deleted_at: row.get(12)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;
    
    // Load tags
    let mut stmt = conn
        .prepare("SELECT tag_name FROM note_tags WHERE note_id = ?1")
        .map_err(|e| e.to_string())?;
    
    let tags = stmt
        .query_map([&note_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<String>>>()
        .map_err(|e| e.to_string())?;
    
    note.tags = tags;
    
    Ok(note)
}

/// Load all notes
#[tauri::command]
pub fn load_all_notes(state: State<DbConnection>) -> Result<Vec<Note>, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    // No checkpoint needed! Same connection automatically sees WAL writes
    // Load all notes (including deleted ones - filtering happens in frontend)
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, description_visible, emoji, content, tags_visible, 
             is_favorite, folder_id, daily_note_date, created_at, updated_at, deleted_at 
             FROM notes 
             ORDER BY updated_at DESC"
        )
        .map_err(|e| e.to_string())?;
    
    let mut notes: Vec<Note> = stmt
        .query_map([], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                description_visible: row.get::<_, i32>(3)? != 0,
                emoji: row.get(4)?,
                content: row.get(5)?,
                tags: Vec::new(), // Will be populated below
                tags_visible: row.get::<_, i32>(6)? != 0,
                is_favorite: row.get::<_, i32>(7)? != 0,
                folder_id: row.get(8)?,
                daily_note_date: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                deleted_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<Note>>>()
        .map_err(|e| e.to_string())?;
    
    // Load ALL tags in ONE query (Apple Notes approach - no N+1!)
    let mut tag_stmt = conn
        .prepare("SELECT note_id, tag_name FROM note_tags")
        .map_err(|e| e.to_string())?;
    
    let tag_rows = tag_stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    
    // Group tags by note_id in memory (fast HashMap lookup)
    let mut tags_by_note: HashMap<String, Vec<String>> = HashMap::new();
    for result in tag_rows {
        let (note_id, tag) = result.map_err(|e| e.to_string())?;
        tags_by_note.entry(note_id).or_insert_with(Vec::new).push(tag);
    }
    
    // Assign tags to notes (O(1) lookup per note)
    for note in &mut notes {
        note.tags = tags_by_note.remove(&note.id).unwrap_or_default();
    }
    
    Ok(notes)
}

/// Search notes using FTS5 (full-text search)
/// Returns ranked results matching the query
#[tauri::command]
pub fn search_notes(query: String, state: State<DbConnection>) -> Result<Vec<Note>, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    // FTS5 ranked search - returns notes ordered by relevance
    let mut stmt = conn
        .prepare(
            "SELECT notes.id, notes.title, notes.description, notes.description_visible, 
                    notes.emoji, notes.content, notes.tags_visible, notes.is_favorite, 
                    notes.folder_id, notes.daily_note_date, notes.created_at, notes.updated_at, 
                    notes.deleted_at
             FROM notes
             JOIN notes_fts ON notes.id = notes_fts.note_id
             WHERE notes_fts MATCH ?1 AND notes.deleted_at IS NULL
             ORDER BY rank
             LIMIT 50"
        )
        .map_err(|e| e.to_string())?;
    
    let mut notes: Vec<Note> = stmt
        .query_map([&query], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                description_visible: row.get::<_, i32>(3)? != 0,
                emoji: row.get(4)?,
                content: row.get(5)?,
                tags: Vec::new(), // Will be populated below
                tags_visible: row.get::<_, i32>(6)? != 0,
                is_favorite: row.get::<_, i32>(7)? != 0,
                folder_id: row.get(8)?,
                daily_note_date: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                deleted_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<Note>>>()
        .map_err(|e| e.to_string())?;
    
    // Load tags for search results (batch load)
    if !notes.is_empty() {
        let note_ids: Vec<String> = notes.iter().map(|n| n.id.clone()).collect();
        let placeholders = note_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let query_str = format!("SELECT note_id, tag_name FROM note_tags WHERE note_id IN ({})", placeholders);
        
        let mut tag_stmt = conn.prepare(&query_str).map_err(|e| e.to_string())?;
        let tag_rows = tag_stmt
            .query_map(rusqlite::params_from_iter(note_ids.iter()), |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;
        
        let mut tags_by_note: HashMap<String, Vec<String>> = HashMap::new();
        for result in tag_rows {
            let (note_id, tag) = result.map_err(|e| e.to_string())?;
            tags_by_note.entry(note_id).or_insert_with(Vec::new).push(tag);
        }
        
        for note in &mut notes {
            note.tags = tags_by_note.remove(&note.id).unwrap_or_default();
        }
    }
    
    Ok(notes)
}

/// Save or update a folder
#[tauri::command]
pub fn save_folder(folder: Folder, state: State<DbConnection>) -> Result<String, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    println!(
        "💾 Saving folder {} | name: {}",
        &folder.id[..20.min(folder.id.len())],
        folder.name
    );
    
    // Upsert folder
    conn.execute(
        "INSERT INTO folders 
        (id, name, parent_id, description, description_visible, color, emoji, 
         tags_visible, is_favorite, is_expanded, created_at, updated_at, deleted_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            parent_id = excluded.parent_id,
            description = excluded.description,
            description_visible = excluded.description_visible,
            color = excluded.color,
            emoji = excluded.emoji,
            tags_visible = excluded.tags_visible,
            is_favorite = excluded.is_favorite,
            is_expanded = excluded.is_expanded,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at",
        (
            &folder.id,
            &folder.name,
            &folder.parent_id,
            &folder.description,
            folder.description_visible as i32,
            &folder.color,
            &folder.emoji,
            folder.tags_visible as i32,
            folder.is_favorite as i32,
            folder.is_expanded as i32,
            &folder.created_at,
            &folder.updated_at,
            &folder.deleted_at,
        ),
    )
    .map_err(|e| e.to_string())?;
    
    // Ensure all tags exist (prevent FK violations)
    for tag in &folder.tags {
        conn.execute(
            "INSERT INTO tags (name, description, description_visible, is_favorite, color, created_at, updated_at)
             VALUES (?1, '', 1, 0, NULL, ?2, ?2)
             ON CONFLICT(name) DO NOTHING",
            (tag, &folder.updated_at),
        )
        .map_err(|e| e.to_string())?;
    }
    
    // Delete existing tag relationships
    conn.execute(
        "DELETE FROM folder_tags WHERE folder_id = ?1",
        [&folder.id],
    )
    .map_err(|e| e.to_string())?;
    
    // Insert new tag relationships
    for tag in &folder.tags {
        conn.execute(
            "INSERT INTO folder_tags (folder_id, tag_name) VALUES (?1, ?2)",
            (&folder.id, tag),
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(format!("Folder saved: {}", folder.id))
}

/// Load all folders
#[tauri::command]
pub fn load_all_folders(state: State<DbConnection>) -> Result<Vec<Folder>, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    // Load all folders (including deleted ones - filtering happens in frontend)
    let mut stmt = conn
        .prepare(
            "SELECT id, name, parent_id, description, description_visible, color, emoji, 
             tags_visible, is_favorite, is_expanded, created_at, updated_at, deleted_at 
             FROM folders"
        )
        .map_err(|e| e.to_string())?;
    
    let mut folders: Vec<Folder> = stmt
        .query_map([], |row| {
            Ok(Folder {
                id: row.get(0)?,
                name: row.get(1)?,
                parent_id: row.get(2)?,
                description: row.get(3)?,
                description_visible: row.get::<_, i32>(4)? != 0,
                color: row.get(5)?,
                emoji: row.get(6)?,
                tags: Vec::new(), // Populated below
                tags_visible: row.get::<_, i32>(7)? != 0,
                is_favorite: row.get::<_, i32>(8)? != 0,
                is_expanded: row.get::<_, i32>(9)? != 0,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                deleted_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<Folder>>>()
        .map_err(|e| e.to_string())?;
    
    // Load all tags in one query (Apple Notes approach - no N+1)
    let mut tag_stmt = conn
        .prepare("SELECT folder_id, tag_name FROM folder_tags")
        .map_err(|e| e.to_string())?;
    
    let tag_rows = tag_stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    
    let mut tags_by_folder: HashMap<String, Vec<String>> = HashMap::new();
    for result in tag_rows {
        let (folder_id, tag) = result.map_err(|e| e.to_string())?;
        tags_by_folder.entry(folder_id).or_insert_with(Vec::new).push(tag);
    }
    
    for folder in &mut folders {
        folder.tags = tags_by_folder.remove(&folder.id).unwrap_or_default();
    }
    
    Ok(folders)
}

/// Save or update tag metadata
#[tauri::command]
pub fn save_tag(tag: Tag, state: State<DbConnection>) -> Result<String, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    println!("💾 Saving tag metadata: {}", tag.name);
    
    conn.execute(
        "INSERT INTO tags (name, description, description_visible, is_favorite, color, created_at, updated_at, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(name) DO UPDATE SET
            description = excluded.description,
            description_visible = excluded.description_visible,
            is_favorite = excluded.is_favorite,
            color = excluded.color,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at",
        (
            &tag.name,
            &tag.description,
            tag.description_visible as i32,
            tag.is_favorite as i32,
            &tag.color,
            &tag.created_at,
            &tag.updated_at,
            &tag.deleted_at,
        ),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(format!("Tag saved: {}", tag.name))
}

/// Load all tag metadata
#[tauri::command]
pub fn load_all_tags(state: State<DbConnection>) -> Result<Vec<Tag>, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    let mut stmt = conn
        .prepare(
            "SELECT name, description, description_visible, is_favorite, color, created_at, updated_at, deleted_at 
             FROM tags"
        )
        .map_err(|e| e.to_string())?;
    
    let tags: Vec<Tag> = stmt
        .query_map([], |row| {
            Ok(Tag {
                name: row.get(0)?,
                description: row.get(1)?,
                description_visible: row.get::<_, i32>(2)? != 0,
                is_favorite: row.get::<_, i32>(3)? != 0,
                color: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<Tag>>>()
        .map_err(|e| e.to_string())?;
    
    Ok(tags)
}

/// Delete a tag from the database
/// Note: Junction tables (note_tags, folder_tags) will cascade delete automatically
#[tauri::command]
pub fn delete_tag(tag_name: String, state: State<DbConnection>) -> Result<String, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    // Delete from tags table (junction tables cascade automatically via ON DELETE CASCADE)
    conn.execute(
        "DELETE FROM tags WHERE name = ?1",
        [&tag_name],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(format!("Tag '{}' deleted", tag_name))
}

/// Permanently delete a note from the database
/// This removes the note record and all associated junction table entries
#[tauri::command]
pub fn delete_note_permanently(note_id: String, state: State<DbConnection>) -> Result<String, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    // Delete from notes table (junction table note_tags will cascade delete automatically)
    conn.execute(
        "DELETE FROM notes WHERE id = ?1",
        [&note_id],
    )
    .map_err(|e| e.to_string())?;
    
    println!("🗑️ Permanently deleted note: {}", note_id);
    Ok(format!("Note '{}' permanently deleted", note_id))
}

/// Permanently delete a folder from the database
/// This removes the folder record and all associated junction table entries
#[tauri::command]
pub fn delete_folder_permanently(folder_id: String, state: State<DbConnection>) -> Result<String, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    // Delete from folders table (junction table folder_tags will cascade delete automatically)
    conn.execute(
        "DELETE FROM folders WHERE id = ?1",
        [&folder_id],
    )
    .map_err(|e| e.to_string())?;
    
    println!("🗑️ Permanently deleted folder: {}", folder_id);
    Ok(format!("Folder '{}' permanently deleted", folder_id))
}

/// Cleanup database on app shutdown (optional but recommended)
/// Checkpoints WAL to main database to keep files tidy
#[tauri::command]
pub fn cleanup_database(state: State<DbConnection>) -> Result<String, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    // Checkpoint WAL to merge pending writes into main database
    // PASSIVE mode: Non-blocking, best effort
    conn.query_row("PRAGMA wal_checkpoint(PASSIVE)", [], |_| Ok(())).ok();
    
    Ok("Database cleanup complete".to_string())
}

/// Save a single UI state key-value pair
#[tauri::command]
pub fn save_ui_state(key: String, value: String, state: State<DbConnection>) -> Result<String, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    let now = chrono::Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO settings (key, value, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at",
        (&key, &value, &now),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(format!("UI state saved: {}", key))
}

/// Load a single UI state value by key
#[tauri::command]
pub fn load_ui_state(key: String, state: State<DbConnection>) -> Result<Option<String>, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    let value = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [&key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    
    Ok(value)
}

/// Load all UI state settings (keys starting with 'ui.')
#[tauri::command]
pub fn load_all_ui_state(state: State<DbConnection>) -> Result<HashMap<String, String>, String> {
    let conn_guard = state.0.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Database not initialized")?;
    
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings WHERE key LIKE 'ui.%'")
        .map_err(|e| e.to_string())?;
    
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    
    let mut settings = HashMap::new();
    for result in rows {
        let (key, value) = result.map_err(|e| e.to_string())?;
        settings.insert(key, value);
    }
    
    Ok(settings)
}

