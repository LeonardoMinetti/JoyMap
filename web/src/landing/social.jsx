import React from 'react'
import { Icon } from '../lib/icons.jsx'
import { withBase } from '../lib/base.js'

// Mockups de rede social (genéricos, sem marcas) com fotos reais de bancos livres. Os perfis e números são ilustrativos.
export const ph = (k) => withBase(`/photos/${k}.jpg`)
const Heart = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-9.1C1.1 8.7 3 5 6.6 5c2 0 3.5 1.1 5.4 3.2C13.9 6.1 15.4 5 17.4 5 21 5 22.9 8.7 21.3 11.9 19 16.4 12 21 12 21z" /></svg>
const Chat = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
const Send = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 3 11 14M22 3l-7 19-4-8-8-4 19-7z" /></svg>
const Mark = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>

export function Avatar({ k, s = 32, name = '' }) {
  return <span className="sp-av" style={{ width: s, height: s }}><img src={ph(k)} alt="" loading="lazy" decoding="async" /></span>
}

// Reel (vertical) ou post (quadrado), com a interface típica de rede social
export function PostCard({ photo, user, avatar, caption, age = '', kind = 'post', likes = '1.248', w = 130, className = '', style }) {
  if (kind === 'reel') {
    return (
      <div className={`pc reel ${className}`} style={{ width: w, ...style }}>
        <img className="pc-img" src={ph(photo)} alt="" loading="lazy" decoding="async" />
        <span className="pc-top">Reels</span>
        <span className="pc-side"><i><Heart s={17} /><em>{likes}</em></i><i><Chat s={17} /><em>96</em></i><i><Send s={17} /></i></span>
        <span className="pc-bot"><b><Avatar k={avatar || photo} s={20} />{user}</b><em>{caption}</em></span>
      </div>
    )
  }
  return (
    <div className={`pc post ${className}`} style={{ width: w, ...style }}>
      <span className="pc-hd"><Avatar k={avatar || photo} s={22} /><b>{user}</b>{age && <em>{age}</em>}</span>
      <img className="pc-img" src={ph(photo)} alt="" loading="lazy" decoding="async" />
      <span className="pc-ac"><Heart s={15} /><Chat s={15} /><Send s={15} /><i /><Mark s={15} /></span>
      <span className="pc-cap"><b>{user}</b> {caption}</span>
    </div>
  )
}

// Perfil de rede social (tela de 390 px) com stories em destaque, abas e uma grade longa de publicações
const Grid3 = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>
const Reel = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M3 9h18M9 3l3 6M15 3l3 6M10 13l5 3-5 3z" /></svg>
const Tag = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 3.5-6 8-6s8 2 8 6" /></svg>
const cell = (g) => { const [k, v] = String(g).split(':'); return { k, cls: v === 'f' ? 'f' : v === 'z' ? 'z' : '' } }
export function SocialProfile({ name, handle, bio, avatar, grid, link = 'Meu mapa de lugares', tap = false, counts = ['128', '84,2 mil', '312'], lines, highlights = ['Cardápio', 'Bairros', 'Reels', 'Dicas', 'Eventos'] }) {
  const L = lines && lines.length ? lines : [bio]
  return (
    <div className="sp-pf">
      <div className="sp-top"><b>{handle}</b><span><Icon n="plus" s={20} c="currentColor" /><Icon n="menu" s={20} c="currentColor" /></span></div>
      <div className="sp-head"><Avatar k={avatar} s={84} /><div className="sp-n">{[['publicações', counts[0]], ['seguidores', counts[1]], ['seguindo', counts[2]]].map(([l, v]) => <span key={l}><b>{v}</b>{l}</span>)}</div></div>
      <div className="sp-bio"><b>{name}</b>{L.map((t, i) => <p key={i}>{t}</p>)}<span className={'sp-link' + (tap ? ' tap' : '')}><Icon n="link" s={15} c="currentColor" />{link}</span></div>
      <div className="sp-btns"><span>Seguindo</span><span>Mensagem</span></div>
      <div className="sp-hl">{highlights.map((h, i) => <span key={h}><i><img src={ph(grid[(i * 3 + 1) % grid.length].split(':')[0])} alt="" loading="lazy" decoding="async" /></i>{h}</span>)}</div>
      <div className="sp-tabs"><span className="on"><Grid3 /></span><span><Reel /></span><span><Tag /></span></div>
      <div className="sp-grid">{grid.map((g, i) => { const c = cell(g); return <img key={i} className={c.cls} src={ph(c.k)} alt="" loading="lazy" decoding="async" /> })}</div>
    </div>
  )
}

// Feed vertical de publicações (tela de 390 px)
export function SocialFeed({ items, bare }) {
  return (
    <div className="sp-feed">
      {!bare && <div className="sp-top"><b>Publicações</b></div>}
      {items.map((it, i) => <PostCard key={i} {...it} kind="post" w={390} className="big" />)}
    </div>
  )
}
