import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, NotesContainer, RightClickContextMenuProvider } from '@clutter/ui';
import { useTagsStore } from '@clutter/shared';

function App() {
  // Initialize tags cache on app startup
  useEffect(() => {
    useTagsStore.getState().updateTagsCache();
  }, []);

  return (
    <ThemeProvider>
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
