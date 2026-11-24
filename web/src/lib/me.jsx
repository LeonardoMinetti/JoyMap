import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api.js'

const Ctx = createContext({ me: undefined, reload: async () => {} })
export const useMe = () => useContext(Ctx)
export function MeProvider({ children }) {
  const [me, setMe] = useState(undefined)
  const reload = useCallback(() => api('/me').then((d) => { setMe(d); return d }).catch(() => { const d = { user: null, creator: null, claims: [], notices: [] }; setMe(d); return d }), [])
  useEffect(() => { reload() }, [reload])
  return <Ctx.Provider value={{ me, reload }}>{children}</Ctx.Provider>
}

export const STEP_PATH = { start: '/candidatura/aprovado', instagram: '/conectar/instagram', tiktok: '/conectar/tiktok', consents: '/consentimentos', plan: '/plano', payment: '/pagamento', welcome: '/boas-vindas' }
// Para onde o criador deve ir ao entrar: depende da análise e da etapa do onboarding.
export function homeFor(me) {
  const c = me?.creator
  try { if (me?.user && sessionStorage.getItem('claim_draft')) return '/restaurantes' } catch { /* ok */ }
  if (!c && me?.user?.role === 'viewer') return '/salvos'
  if (!c) return me?.claims?.length ? '/restaurante' : '/candidatura'
  if (c.status !== 'approved') return '/candidatura/status'
  if (c.onboarding !== 'done') return STEP_PATH[c.onboarding] || '/painel'
  return '/painel'
}
