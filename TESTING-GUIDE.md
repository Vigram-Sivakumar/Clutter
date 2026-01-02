# Testing Guide - System Hardening

## Quick Test Script (5 minutes)

Run through these scenarios to verify the hardening works correctly:

---

### Test 1: Folder Cascade Delete ✓

**Setup:**
1. Create a folder "Work"
2. Create a child folder "Work/Projects"  
3. Create a note in "Work" called "Meeting Notes"
4. Create a note in "Work/Projects" called "TODO"

**Test:**
1. Delete the "Work" folder
2. Check console logs - should see:
   ```
   🗑️ Deleting folder "work-123" with 1 descendants
   🗑️ Cascading delete to 2 notes
   ✅ Saved 2 folder deletions
   ```
3. Go to Trash - should see both folders and both notes

**Restore Test:**
1. Restore the "Work" folder from Trash
2. Check console logs - should see:
   ```
   ♻️ Restoring folder "work-123" with 1 descendants
   ♻️ Cascading restore to 2 notes
   ✅ Saved 2 folder restores
   ```
3. Verify hierarchy restored: Work → Projects (with both notes)

---

### Test 2: Hydration Guard ✓

**Setup:**
1. Create a few notes and folders
2. Close the app

**Test:**
1. Open the app
2. Watch console during boot - should see:
   ```
   🔄 Hydration state: HYDRATING
   🔧 Database initialized: true
   📂 Loaded X notes, Y folders, Z tags
   🔄 Hydration state: COMPLETE
   ✅ Database integrity verified - no issues found
   ```

**Dev Mode Test (if you're in dev):**
1. Try adding a breakpoint in the hydration code
2. Try to manually trigger a save during hydration
3. Should crash with helpful error message

---

### Test 3: Persistence After Reload ✓

**Test Folders:**
1. Create a folder "Test Folder" with emoji 🧪
2. Reload the app
3. Verify folder persists with emoji

**Test Tags:**
1. Create a tag, set it as favorite, choose a color
2. Reload the app
3. Verify tag metadata persists (color + favorite)

**Test Notes:**
1. Create a note in a folder with some content
2. Reload the app
3. Verify note is in correct folder with content intact

---

### Test 4: FK Error Handling (Optional) ✓

**This should NOT happen in normal use, but if it does:**

1. Watch console for this pattern:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚨 FOREIGN KEY CONSTRAINT VIOLATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

2. Check if recovery worked:
   ```
   🔧 Attempting recovery: ...
   ✅ Note saved with folder_id cleared
   📊 Recovery successful - note moved to root folder
   ```

3. If this happens, investigate why (data migration issue, etc.)

---

## Expected Console Output (Normal Boot)

```
🔄 Hydration state: HYDRATING
🔧 Database initialized: true
📂 Loaded 10 notes, 3 folders, 5 tags
🔄 Hydration state: COMPLETE
✅ Database integrity verified - no issues found
```

---

## Expected Console Output (Cascade Delete)

```
🗑️ Deleting folder "work-123" with 2 descendants
🗑️ Cascading delete to 4 notes
✅ Saved 3 folder deletions
```

---

## Expected Console Output (Cascade Restore)

```
♻️ Restoring folder "work-123" with 2 descendants
♻️ Cascading restore to 4 notes
✅ Saved 3 folder restores
```

---

## What Should NEVER Happen ❌

1. **FK Errors in normal operations**
   - If you see FK errors, something is wrong
   - Check the telemetry output for details
   - Recovery should kick in automatically

2. **Orphaned folders after delete**
   - Child folders should always be deleted with parent
   - Notes should always be deleted with their folder

3. **Lost data after reload**
   - Everything should persist: folders, tags, notes, metadata
   - If data disappears, check hydration order

4. **Saves during hydration**
   - In dev mode, should crash immediately
   - In prod mode, should log warning and skip

---

## Debugging Tips

### If folders disappear after reload:
1. Check console for hydration logs
2. Verify `loadAllFoldersFromDatabase()` is called
3. Check if `saveFolderHandler` is set

### If tags lose metadata (color, favorite):
1. Check console for hydration logs
2. Verify `loadAllTagsFromDatabase()` is called
3. Check if `saveTagHandler` is set

### If cascade delete doesn't work:
1. Check console logs during delete
2. Should see "Deleting folder X with Y descendants"
3. Should see "Cascading delete to Z notes"
4. Verify all items appear in Trash

### If you see FK errors:
1. Read the full telemetry output
2. Check which entity is problematic
3. Verify hydration order (Tags → Folders → Notes)
4. Check if recovery succeeded

---

## Performance Expectations

- **Boot time:** < 500ms for typical database (100-1000 notes)
- **Cascade delete:** < 100ms for folder with 10 children + 50 notes
- **Persistence:** Immediate for metadata, debounced (500ms) for content
- **Integrity check:** < 200ms in dev mode

---

## Success Criteria ✅

Your system is working correctly if:
- ✅ All data persists after reload
- ✅ Folder cascades delete/restore children and notes
- ✅ No FK errors in console during normal operations
- ✅ Hydration completes before any saves
- ✅ Console logs are clean and informative

---

## When to Report Issues

Report an issue if you see:
- ❌ FK errors during normal operations (not during migration)
- ❌ Data loss after reload
- ❌ Orphaned folders or notes after delete
- ❌ Crash during normal operations (not during dev-mode guard violations)
- ❌ Performance degradation (boot > 2s, cascade delete > 500ms)

---

Happy testing! 🧪

