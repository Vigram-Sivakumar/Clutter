import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, NotesContainer, RightClickContextMenuProvider, ConfirmationDialog, FormDialog } from '@clutter/ui';
import { useTagsStore, useNotesStore } from '@clutter/state';

function App() {
  const updateDailyNoteTitles = useNotesStore(state => state.updateDailyNoteTitles);
  
  // Initialize tags cache and update daily note titles on app startup
  useEffect(() => {
    useTagsStore.getState().updateTagsCache();
    
    // Update daily note titles (Today/Yesterday/Tomorrow)
    updateDailyNoteTitles();
  }, [updateDailyNoteTitles]);
  
  // Update daily note titles every hour (catches date changes like midnight)
  useEffect(() => {
    // Run every hour (3600000 ms)
    const interval = setInterval(() => {
      console.log('⏰ Hourly check: Updating daily note titles...');
      updateDailyNoteTitles();
    }, 3600000);
    
    return () => clearInterval(interval);
  }, [updateDailyNoteTitles]);

  return (
    <ThemeProvider>
      <ConfirmationDialog />
      <FormDialog />
      <RightClickContextMenuProvider>
        <Routes>
          <Route
            path="/"
            element={<NotesContainer />}
          />
        </Routes>
      </RightClickContextMenuProvider>
    </ThemeProvider>
  );
}

export default App;
