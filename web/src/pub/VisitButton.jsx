import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { navigate, toast } from '../lib/router.jsx'
import { useMe } from '../lib/me.jsx'
import { PENDING } from '../pages/Voo.jsx'

// "Já fui": registra a visita (vale XP no voo da wagli). Sem login, leva para entrar e volta depois.
export default function VisitButton({ slug, placeId }) {
  const { me } = useMe()
  const [on, setOn] = useState(false)
  useEffect(() => {
    setOn(false)
    if (me?.user) api(`/voo/visited/${slug}`).then((d) => setOn(d.ids.includes(placeId))).catch(() => {})
  }, [me, slug, placeId])
  const click = async () => {
    if (!me?.user) { try { localStorage.setItem(PENDING, JSON.stringify({ slug, placeId })) } catch { /* ok */ } navigate('/voo'); return }
    try {
      if (on) { await api('/voo/visits', { method: 'DELETE', body: { slug, placeId } }); setOn(false); toast('Visita removida') } else {
        const r = await api('/voo/visits', { method: 'POST', body: { slug, placeId } }); setOn(true)
        toast(r.leveledUp ? `Subiu de nível: ${r.levelName}!` : `+${r.gained} XP`)
      }
    } catch (e) { toast(e.message === 'limite_diario' ? 'Limite de 10 visitas por dia.' : 'Não foi possível registrar.') }
  }
  return <button className="pb sm sec" aria-pressed={on} onClick={click}>{on ? 'Visitado ✓' : 'Já fui'}</button>
}
