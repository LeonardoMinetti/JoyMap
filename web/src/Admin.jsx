import React, { useEffect, useState } from 'react'
import { api } from './api.js'
import { Logo } from './App.jsx'

export default function Admin() {
  const [d, setD] = useState(null)
  const [reports, setReports] = useState([])
  const load = () => { api('/admin/creators').then(setD); api('/admin/reports').then((r) => setReports(r.reports)) }
  useEffect(load, [])
  const decide = async (id, status) => { await api(`/admin/creators/${id}/decision`, { method: 'POST', body: { status } }); load() }
  if (!d) return <p className="pad">Carregando…</p>
  return (
    <div className="adm">
      <div className="row jb"><Logo /><a className="btn ln sm" href="#/painel">Voltar ao painel</a></div>
      <h1 className="d s44">Fila de candidaturas</h1>
      <p className="mut sm">Critério atual: no mínimo {d.minFollowers.toLocaleString('pt-BR')} seguidores (informado pelo criador; conferir o perfil antes de aprovar).</p>
      <div className="card"><table className="tbl"><thead><tr><th>Perfil</th><th>E-mail</th><th>Seguidores</th><th>Status</th><th>Lugares</th><th></th></tr></thead><tbody>
        {d.creators.map((c) => (
          <tr key={c.id}><td><b>@{c.handle}</b></td><td>{c.email}</td><td>{c.followers.toLocaleString('pt-BR')}</td><td><span className={'tag ' + (c.status === 'approved' ? 'ok' : c.status === 'rejected' ? 'bd2' : 'wn')}>{c.status}</span></td><td>{c.places}</td>
            <td><div className="row">{c.status !== 'approved' && <button className="btn sm" onClick={() => decide(c.id, 'approved')}>Aprovar</button>}{c.status !== 'rejected' && <button className="btn ln sm" onClick={() => decide(c.id, 'rejected')}>Recusar</button>}{c.status !== 'waitlist' && <button className="btn sec sm" onClick={() => decide(c.id, 'waitlist')}>Lista de espera</button>}</div></td></tr>))}
        {d.creators.length === 0 && <tr><td colSpan="6" className="mut">Nenhuma candidatura ainda.</td></tr>}
      </tbody></table></div>
      <h2 className="d s32" style={{ marginTop: 28 }}>Denúncias</h2>
      <div className="card"><table className="tbl"><thead><tr><th>Lugar</th><th>Motivo</th><th>Detalhes</th><th>Data</th></tr></thead><tbody>
        {reports.map((r) => <tr key={r.id}><td>{r.place_name || 'mapa inteiro'}</td><td>{r.reason}</td><td>{r.details}</td><td>{r.created_at}</td></tr>)}
        {reports.length === 0 && <tr><td colSpan="4" className="mut">Sem denúncias.</td></tr>}
      </tbody></table></div>
    </div>
  )
}
