import React from 'react'
import { useLocation, Redirect, Toaster } from './lib/router.jsx'
import { MeProvider, useMe } from './lib/me.jsx'
import { Loading, Guard } from './lib/ui.jsx'
import * as Site from './pages/Site.jsx'
import * as On from './pages/Onboarding.jsx'
import * as Build from './pages/Build.jsx'
import * as St from './pages/Studio.jsx'
import * as Pn from './pages/Panel.jsx'
import * as Net from './pages/Network.jsx'
import * as Ad from './pages/Admin.jsx'
import { Voo } from './pages/Voo.jsx'
import Public from './pub/Public.jsx'
import { STATIC } from './lib/base.js'
import { isCreatorPath, demoReset, demoLeave } from './lib/demoCreator.js'

const STATIC_OK = new Set(['/', '/planos', '/perguntas', '/exemplos', '/termos', '/indisponivel'])

const ST = (el) => <St.StudioRoute>{el}</St.StudioRoute>
const ROUTES = {
  '/': <Site.Landing />, '/voo': <Voo />, '/planos': <Site.Plans />, '/exemplos': <Site.Examples />, '/termos': <Site.Terms />, '/perguntas': <Site.Faq />, '/indisponivel': <Site.Unavailable />,
  '/candidatura': <On.Apply />, '/candidatura/enviada': <On.ApplyStatus sent />, '/candidatura/status': <On.ApplyStatus />, '/candidatura/aprovado': <On.Approved />, '/entrar': <On.Login />,
  '/conectar/instagram': <On.ConnectInstagram />, '/conectar/tiktok': <On.ConnectTikTok />, '/consentimentos': <On.Consents />, '/plano': <On.ChoosePlan />, '/pagamento': <On.Payment />, '/boas-vindas': <On.Welcome />,
  '/montando': <Build.Building />, '/previa': <Build.Preview />, '/revisar': <Build.Review />, '/adicionar': <Build.AddPlace />, '/sem-lugar': <Build.Unresolved />, '/unidades': <Build.Units />,
  '/publicar': <Build.Publish />, '/publicado': <Build.Published />, '/colar-posts': <Build.PastePosts />,
  '/painel': <Pn.Overview />, '/painel/buscas': <Pn.Searches />, '/painel/lugares': <Pn.PlacesPage />, '/painel/audiencia': <Redirect to="/painel" />, '/painel/atualizar': <Pn.UpdateMap />, '/painel/divulgar': <Pn.Promote />,
  '/painel/roteiros': <Pn.Roteiros />, '/painel/listas': <Redirect to="/painel/roteiros" />, '/painel/contas': <Pn.Accounts />, '/painel/privacidade': <Pn.Privacy />, '/painel/plano': <Pn.Billing />, '/painel/conta': <Pn.Account />,
  '/estudio': ST(<St.StudioHome />), '/estudio/modelos': ST(<St.StudioTemplates />), '/estudio/cores': ST(<St.StudioColors />), '/estudio/categorias': ST(<St.StudioCategories />), '/estudio/simbolos': <Redirect to="/estudio/pins" />,
  '/estudio/mapa': ST(<St.StudioMap />), '/estudio/pins': ST(<St.StudioPins />), '/estudio/layout': <Redirect to="/estudio" />, '/estudio/links': <Redirect to="/estudio" />, '/estudio/endereco': <Redirect to="/painel/divulgar" />,
  '/rede': <Net.NetworkMap />, '/rede/lugar': <Net.NetworkPlace />, '/restaurantes': <Net.Claim />, '/restaurante': <Net.RestaurantPanel />, '/restaurante/percepcao': <Net.Perception />,
  '/admin': <Ad.Applications />, '/admin/mapas': <Ad.MapReview />, '/admin/moderacao': <Ad.Moderation />, '/admin/metricas': <Ad.Metrics />,
}

// Páginas do site: entram com um fade curto (as telas do painel e do estúdio ficam como estão, para não perder estado)
const SITE = new Set(['/', '/planos', '/perguntas', '/exemplos', '/termos'])
function Routes() {
  const { path } = useLocation()
  const { me } = useMe()
  // domínio próprio: o servidor injeta o slug e a página do criador atende a raiz do domínio
  if (window.__SLUG__) return <Public slug={window.__SLUG__} />
  const pub = path.match(/^\/@([a-z0-9_-]+)(\/.*)?$/i)
  if (pub) return <Public slug={pub[1].toLowerCase()} />
  if (me === undefined) return <Loading />
  if (STATIC && !STATIC_OK.has(path) && !isCreatorPath(path) && path !== '/entrar') return ROUTES[path] || path.startsWith('/revisar/') ? <Site.StaticNotice /> : <Redirect to="/" />
  const ed = path.match(/^\/revisar\/(\d+)$/)
  if (ed) return <Build.EditPlace id={ed[1]} />
  const el = ROUTES[path]
  if (!el) return <Redirect to="/" />
  return SITE.has(path) ? <div key={path} className="rt">{el}</div> : el
}
// Versão estática: avisa que o painel é uma demonstração e deixa recomeçar ou sair
function DemoBar() {
  const { me } = useMe()
  const { path } = useLocation()
  const show = STATIC && !!me?.user && !path.startsWith('/@')
  // a faixa não ocupa espaço no fim da página (isso deixava o menu lateral curto): só ganha folga no conteúdo
  React.useEffect(() => { document.body.classList.toggle('has-demobar', show); return () => document.body.classList.remove('has-demobar') }, [show])
  if (!show) return null
  const go = (fn) => () => { fn(); location.assign(import.meta.env.BASE_URL) }
  return (
    <>
    <div role="status" className="demobar" style={{ position: 'fixed', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 60, maxWidth: 'calc(100vw - 24px)', background: '#171717', color: '#fff', borderRadius: 999, padding: '8px 10px 8px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, boxShadow: '0 10px 30px rgba(0,0,0,.25)' }}>
      <span><b>Demonstração.</b> Dados fictícios, salvos só nesta aba.</span>
      <button className="btn sm" style={{ background: '#fff', color: '#171717' }} onClick={go(() => { demoReset(); demoLeave() })}>Recomeçar</button>
      <button className="btn sm" style={{ background: '#3a3a3a', color: '#fff' }} onClick={go(demoLeave)}>Sair</button>
    </div>
    </>
  )
}
export default function App() { return <MeProvider><Routes /><DemoBar /><Toaster /></MeProvider> }
