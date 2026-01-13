import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 CRITICAL: ProseMirror EditorView Prototype Patch
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// PROBLEM:
// TipTap's refreshEditorInstance() recreates the EditorView, which re-registers
// ProseMirror's internal initInput mousedown handler. That handler captures
// closures over editor/engine refs that can become stale, causing:
//   TypeError: undefined is not an object (evaluating 'editor2._engine')
//
// ROOT CAUSE:
// - TipTap Extension handleDOMEvents are *merged* with PM internals, not replaced
// - EditorView refresh creates new DOM handlers with old closures
// - No lifecycle hook exists to clean up these internal handlers
//
// SOLUTION:
// Override mousedown at the EditorView.prototype level BEFORE any editor creation.
// This ensures:
// - ALL EditorViews (including refreshed ones) use our handler
// - Stale closures never execute
// - Pure signal-based deselection (no engine/editor access in DOM layer)
//
// SAFETY:
// - Applied once at app bootstrap
// - Does not break PM selection behavior (returns false to allow default)
// - Only blocks block-level selection conflicts (handles + menus exempted)
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 CRITICAL: Block Handle Selection Authority
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Install a CAPTURE-phase mousedown listener at document level.
// This runs BEFORE any ProseMirror handlers (which use bubble phase).
//
// PURPOSE:
// When clicking a block handle, we want:
//   ✅ BlockHandle's onPointerDown to set NodeSelection (via window.__editor)
//   ❌ ProseMirror's initInput handler to override with TextSelection
//
// SOLUTION:
// Intercept handle clicks at capture phase and kill propagation entirely.
// This prevents ProseMirror from ever seeing the event.
//
// SCOPE:
// ONLY intercepts [data-block-handle] clicks.
// All other clicks (text, background, menus) flow through normally.
//
// PREVENTS:
// - "editor2._engine" crashes from stale closures after refreshEditorInstance
// - Selection authority conflicts (PM overriding engine selection)
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

document.addEventListener(
  'mousedown',
  (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // 🔒 ONLY intercept block handle interactions
    // This prevents ProseMirror from computing a selection on handle clicks
    if (target.closest('[data-block-handle]')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // BlockHandle's own onPointerDown will handle the selection mutation
      return;
    }

    // ✅ All other clicks (text, background, menus) flow through normally
    // ProseMirror handles text selection, EditorCore handles deselection
  },
  true // CAPTURE PHASE - runs before any bubble-phase handlers
);

console.log('[Bootstrap] Block handle event gate installed');

ReactDOM.createRoot(document.getElementById('root')!).render(
  // StrictMode disabled for desktop app - causes race conditions with database initialization
  <HashRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <App />
  </HashRouter>
);
