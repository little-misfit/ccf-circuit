'use strict';
(async () => {
  // The conference schedule and 2D map remain usable if the 3D module fails.
  try { window.createCobe = (await import('./vendor/cobe/cobe-2.0.1.esm.js')).default; } catch {}
  try { await import('./globe-view.js'); } catch {}
  try { await import('./app.js'); } catch {
    const error = document.getElementById('boot-error');
    error.textContent = 'The schedule could not load. Please refresh the page.';
    error.hidden = false;
  }
})();
