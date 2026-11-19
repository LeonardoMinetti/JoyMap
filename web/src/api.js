export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data })
  return data
}

let sid
export function track(slug, type, extra = {}) {
  try {
    sid = sid || sessionStorage.getItem('sid') || Math.random().toString(36).slice(2, 14)
    sessionStorage.setItem('sid', sid)
  } catch { sid = sid || Math.random().toString(36).slice(2, 14) }
  fetch('/api/e', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, type, sid, ...extra }), keepalive: true }).catch(() => {})
}
