import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { useTagsStore, useFoldersStore, useNotesStore } from '@clutter/state';

// Expose dev helper functions to window for console access
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).clearAllTags = () => {
    const { clearAllTags } = useTagsStore.getState();
    clearAllTags();
    // Also clear localStorage for tags
    localStorage.removeItem('clutter-tags-storage');
    console.log('✅ All tags cleared!');
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).clearAllData = () => {
    // Clear all stores
    const { clearAllTags } = useTagsStore.getState();
    const { setFolders } = useFoldersStore.getState();
    const { setNotes } = useNotesStore.getState();
    
    clearAllTags();
    setFolders([]);
    setNotes([]);
    
    // Clear all localStorage
    localStorage.removeItem('clutter-tags-storage');
    localStorage.removeItem('clutter-folders-storage');
    localStorage.removeItem('clutter-notes-storage');
    localStorage.removeItem('clutter-ordering-storage');
    
    console.log('✅ All data cleared! Please refresh the page.');
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

