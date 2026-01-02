// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;

use database::DbConnection;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .manage(DbConnection(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            database::init_database,
            database::save_note,
            database::load_note,
            database::load_all_notes,
            database::search_notes,
            database::save_folder,
            database::load_all_folders,
            database::save_tag,
            database::load_all_tags,
            database::delete_tag,
            database::cleanup_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

