import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// /admin only exists in `npm run dev` — there's no server in the deployed
// static build for it to talk to, so it's not reachable in production.
const isAdminRoute = import.meta.env.DEV && window.location.pathname.replace(/\/+$/, '').endsWith('/admin')

async function render() {
  const Root = isAdminRoute ? (await import('./admin/AdminPage.tsx')).default : App
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  )
}

render()

// Static-asset caching only (see public/sw.js) — safe to register from any
// route since it's scoped to the app's own base path.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
