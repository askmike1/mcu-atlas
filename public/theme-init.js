// Runs as a blocking <script src> (CSP forbids inline scripts) before the
// stylesheet paints, so a returning light-theme user never sees a flash of
// the default dark theme. Dark needs no attribute — it's index.css's base.
(function () {
  try {
    if (localStorage.getItem('mcu-atlas:theme') === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back to dark.
  }
})();
