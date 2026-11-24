import { STATIC } from '../lib/base.js'
import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Link, navigate, useLocation } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { Top, Field, Check, Note, Toggle, useTitle } from '../lib/ui.jsx'
import { useMe, homeFor } from '../lib/me.jsx'
import FakeMap from '../FakeMap.jsx'
import { beeUrl } from '../brand/index.js'
import { num } from '../theme.jsx'

// Entrada única do site. Um só endereço (/entrar) atende:
//   Entrar            criador que já tem mapa (link por e-mail, sem senha)
//   Quero meu mapa    candidatura de quem ainda não tem (/entrar?novo=1)
//   Explorador        quem não tem mapa e só guarda lugares dos mapas dos outros (/entrar?como=explorador)
// Os atalhos "Entrar" e "Quero meu mapa" do site abrem esta mesma página; o explorador chega pelo rodapé e pelo mapa de um criador.

export const IconCircle = ({ n, c, bg }) => <div className="sq" style={{ width: 64, height: 64, borderRadius: '50%', background: bg, display: 'grid', placeItems: 'center', flex: 'none' }}><Icon n={n} s={30} c={c} /></div>

const SIDE = {
  criador: { eb: 'Para criadores', h: 'Suas indicações num mapa com a sua cara.', li: ['Transforme suas indicações em um mapa público', 'Estúdio de estilo para deixar o mapa com a sua identidade', 'Painel para acompanhar o seu mapa'] },
  explorador: { eb: 'Para exploradores', h: 'Seus lugares salvos, todos juntos.', li: ['Salve lugares de qualquer mapa com um toque', 'Veja tudo em Meus salvos, em qualquer aparelho', 'Sem senha e sem painel. O criador não sabe quem salvou'] },
}

function Side({ kind }) {
  const S = SIDE[kind]
  return (
    <aside className="au-side" aria-label={S.eb}>
      <div className="au-vis">
        {kind === 'criador'
          ? <FakeMap h={220} tone="light" shape="drop" acc="#ff4b2b" n={8} sel={2} lab={false} />
          : <div className="au-bee"><img src={beeUrl('carinhosa', 2)} alt="" width="150" /></div>}
      </div>
      <span className="eb" style={{ color: 'var(--ink)' }}>{S.eb}</span>
      <h2 className="d s32">{S.h}</h2>
      <ul className="au-li">{S.li.map((t) => <li key={t}><i><Icon n="check" s={13} c="#fff" /></i>{t}</li>)}</ul>
    </aside>
  )
}

// Moldura das telas de entrada: barra do site, cartão com o conteúdo e, no computador, um painel com o que a pessoa ganha
export function AuthFrame({ kind = 'criador', children }) {
  return (
    <div className="page lp au">
      <Top active={-1} />
      <main className="w au-w">
        <section className="au-card">{children}</section>
        <Side kind={kind} />
      </main>
    </div>
  )
}

const OFF = { borderColor: 'transparent', background: 'transparent' }
const Tabs = ({ novo }) => (
  <Toggle>
    <Link className={'chip' + (!novo ? ' on' : '')} style={novo ? OFF : undefined} to="/entrar" aria-current={!novo ? 'page' : undefined}>Entrar</Link>
    <Link className={'chip' + (novo ? ' on' : '')} style={!novo ? OFF : undefined} to="/entrar?novo=1" aria-current={novo ? 'page' : undefined}>Quero meu mapa</Link>
  </Toggle>
)
const Alt = ({ children }) => <p className="au-alt sm mut">{children}</p>

// Link mágico (sem senha): criador ou explorador. Na demonstração não há e-mail nem servidor: entra direto.
function MagicForm({ leitor, voltar }) {
  const { reload } = useMe()
  const { search: qs } = useLocation()
  const [email, setEmail] = useState(() => { try { return (!leitor && sessionStorage.getItem('applied_email')) || '' } catch { return '' } })
  const [sent, setSent] = useState(null)
  const [err, setErr] = useState('')
  const [wait, setWait] = useState(0)
  const [igMsg, setIgMsg] = useState(false)
  useEffect(() => { if (wait <= 0) return; const h = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(h) }, [wait])
  // quando o link é aberto em outra aba, esta tela percebe o login
  useEffect(() => { if (!sent) return; const h = setInterval(() => reload(), 3500); return () => clearInterval(h) }, [sent, reload])
  // Em desenvolvimento o servidor aceita um login simulado (criador de teste). Em produção, o login real depende da Meta.
  const igLogin = async () => { try { await api('/auth/demo', { method: 'POST' }); await reload() } catch { setIgMsg(true) } }
  const send = async (e) => {
    e?.preventDefault(); setErr('')
    if (STATIC) { try { await api('/auth/demo-explorador', { method: 'POST', body: { email } }); await reload() } catch { setErr('Não foi possível entrar na demonstração.') } return }
    try { setSent(await api('/auth/request', { method: 'POST', body: leitor ? { email, next: 'viewer', back: voltar } : { email } })); setWait(30) } catch (x) { setErr(x.message === 'email_invalido' ? 'Digite um e-mail válido.' : 'Não foi possível enviar. Tente de novo.') }
  }

  if (sent) return (
    <>
      <IconCircle n="mail" c="#d93a1c" bg="var(--accs)" />
      <h1 className="d s44">Link enviado</h1>
      <p className="mut">Abra o e-mail enviado para <b>{email}</b> e toque no botão para entrar. O link expira em 15 minutos.</p>
      <div className="card soft col" style={{ gap: 6 }}><b className="sm">Não chegou?</b><span className="sm mut">Confira o spam ou peça outro link em 30 segundos.</span></div>
      {sent.devLink && <Note>Modo desenvolvimento: este ambiente não envia e-mails. Use o botão abaixo para abrir o link de acesso.</Note>}
      <div className="col" style={{ gap: 10 }}>
        {sent.devLink && <a className="btn blk" href={sent.devLink}>Abrir o link (modo desenvolvimento)</a>}
        <button type="button" className="btn ln blk" disabled={wait > 0} onClick={() => send()}>{wait > 0 ? `Reenviar link (${wait}s)` : 'Reenviar link'}</button>
        <button type="button" className="link sm au-again" onClick={() => setSent(null)}>Usar outro e-mail</button>
      </div>
    </>
  )

  // demonstração, criador: painel fictício, sem e-mail
  if (STATIC && !leitor) return (
    <>
      <Tabs novo={false} />
      <h1 className="d s44">Entrar</h1>
      <p className="mut">Esta é a demonstração. Entre como uma criadora fictícia já aprovada, com lugares de exemplo: dá para editar o mapa, o Estúdio e conferir as métricas. As mudanças ficam só nesta aba e nada é enviado.</p>
      <button type="button" className="btn blk" onClick={igLogin}>Entrar na demonstração</button>
      <Alt>Só quer salvar lugares? <Link className="link" to="/entrar?como=explorador">Entrar como explorador</Link></Alt>
    </>
  )

  return (
    <form onSubmit={send} className="col" style={{ gap: 18 }}>
      {!leitor && <Tabs novo={false} />}
      {leitor && <span className="eb">Explorador</span>}
      <h1 className="d s44">{leitor ? 'Entrar como explorador' : 'Entrar'}</h1>
      <p className="mut">{leitor
        ? `Guarde lugares de qualquer mapa e encontre tudo em Meus salvos, em qualquer aparelho. Sem senha e sem painel.${STATIC ? ' Na demonstração nada é enviado: o e-mail vale só nesta aba e os salvos ficam neste aparelho.' : ''}`
        : 'Acesse o seu painel e o Estúdio de estilo. Enviamos um link para o seu e-mail, sem senha.'}</p>
      {qs.get('erro') === 'link' && <Note>Este link expirou ou já foi usado. Peça outro.</Note>}
      <Field label="E-mail" id="m"><div className="in f"><input id="m" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" required /></div></Field>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn blk">{STATIC ? 'Entrar na demonstração' : 'Enviar link de acesso'}</button>
      {!STATIC && <span className="xs mut c">{leitor ? 'O link vale por 15 minutos e só funciona uma vez. Seus salvos são só seus: o criador não sabe quem salvou.' : 'O link vale por 15 minutos e só funciona uma vez.'}</span>}
      {!leitor && <>
        <div className="row"><div className="sep sp" /><span className="xs mut">ou</span><div className="sep sp" /></div>
        <button type="button" className="btn ln blk" onClick={igLogin}><Icon n="insta" s={18} />Entrar com Instagram</button>
        {igMsg && <Note>O login pelo Instagram depende da aprovação do app pela Meta e ainda não está ativo. Use o link por e-mail.</Note>}</>}
      {leitor
        ? <Alt>Tem um mapa? <Link className="link" to="/entrar">Entrar como criador</Link></Alt>
        : <Alt>Só quer salvar lugares? <Link className="link" to="/entrar?como=explorador">Entrar como explorador</Link></Alt>}
    </form>
  )
}

// Candidatura: quem ainda não tem mapa pede o seu
function ApplyForm({ me }) {
  const [minF, setMin] = useState(null)
  const [f, setF] = useState({ handle: '', email: me?.user?.email || '', tiktok: '', acceptTerms: true })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [demoDone, setDemoDone] = useState(false)
  const { reload } = useMe()
  useEffect(() => { api('/config').then((c) => setMin(c.minFollowers)).catch(() => {}) }, [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (STATIC) { setDemoDone(true); return }
    setBusy(true)
    try {
      await api('/apply', { method: 'POST', body: f })
      try { sessionStorage.setItem('applied_email', f.email.trim().toLowerCase()) } catch { /* ok */ }
      navigate('/candidatura/enviada')
    } catch (x) {
      setErr({ email_invalido: 'Digite um e-mail válido.', handle_invalido: 'Use só letras, números, ponto e sublinhado no @.', tiktok_invalido: 'O @ do TikTok parece inválido.', aceite_obrigatorio: 'É preciso aceitar os Termos e a Política de Privacidade.', ja_existe: 'Já existe uma candidatura com este e-mail.', handle_em_uso: 'Este @ já tem uma candidatura.' }[x.message] || 'Não foi possível enviar. Tente de novo.')
    } finally { setBusy(false) }
  }
  if (demoDone) return (
    <>
      <IconCircle n="clock" c="#93370d" bg="var(--suns)" />
      <h1 className="d s44">Candidatura recebida</h1>
      <p className="mut">Na demonstração nada foi enviado. Com a plataforma no ar, conferimos o perfil e avisamos por e-mail quando for aprovado.</p>
      <div className="col" style={{ gap: 10 }}>
        <button type="button" className="btn blk" onClick={async () => { await api('/auth/demo', { method: 'POST' }); await reload() }}>Entrar na demonstração</button>
        <Link className="btn ln blk" to="/@demo">Ver o mapa de exemplo</Link>
      </div>
    </>
  )
  return (
    <form onSubmit={submit} className="col" style={{ gap: 18 }}>
      <Tabs novo />
      <h1 className="d s44">Peça o seu mapa</h1>
      <p className="mut">Analisamos cada perfil.{minF != null && <> Mínimo de {num(minF)} seguidores.</>} Sem senha e sem cobrança nesta etapa.</p>
      <Field label="Seu @ no Instagram" id="a"><div className="in"><span className="mut">@</span><input id="a" value={f.handle} onChange={set('handle')} placeholder="seuperfil" autoComplete="off" required /></div></Field>
      <Field label="E-mail" id="e"><div className="in"><input id="e" type="email" value={f.email} onChange={set('email')} placeholder="voce@email.com" autoComplete="email" required /></div></Field>
      <Field label="@ no TikTok (opcional)" id="t"><div className="in"><input id="t" value={f.tiktok} onChange={set('tiktok')} placeholder="@seuperfil" autoComplete="off" /></div></Field>
      <Check on={f.acceptTerms} onChange={(v) => setF({ ...f, acceptTerms: v })}>Sou o titular ou represento este perfil e aceito os <b><Link to="/termos" target="_blank">Termos</Link></b> e a <b><Link to="/termos" target="_blank">Política de Privacidade</Link></b>.</Check>
      {err && <p className="err" role="alert">{err} {err.includes('Já existe') && <Link className="link" to="/entrar">Entrar</Link>}</p>}
      <button className="btn blk" disabled={busy}>Enviar candidatura</button>
      <Alt>Só quer salvar lugares? <Link className="link" to="/entrar?como=explorador">Entrar como explorador</Link></Alt>
    </form>
  )
}

export function Login() {
  const { me } = useMe()
  const { search: qs } = useLocation() // reage à troca de ?novo= / ?como= sem recarregar
  const como = qs.get('como')
  const explorador = como === 'explorador' || como === 'usuario' || qs.get('leitor') === '1'
  const novo = !explorador && qs.get('novo') === '1'
  // volta só para um mapa (/@criador...) ou para a lista de salvos
  const voltar = /^\/(@[a-z0-9_-]{1,40}(\/[a-z0-9\/_-]*)?|salvos)$/i.test(qs.get('voltar') || '') ? qs.get('voltar') : '/salvos'
  useTitle(explorador ? 'Entrar como explorador' : novo ? 'Peça seu mapa' : 'Entrar')
  useEffect(() => {
    if (!me?.user) return
    const home = homeFor(me)
    if (me.creator || home.startsWith('/restaurante')) navigate(home, { replace: true }) // criador: painel ou etapa em andamento
    else if (explorador) navigate(voltar, { replace: true }) // explorador: volta para onde estava
    else if (!novo) navigate(me.user.role === 'viewer' ? '/entrar?novo=1' : home, { replace: true }) // logado sem mapa: só falta pedir o seu
  }, [me, explorador, novo, voltar])
  return (
    <AuthFrame kind={explorador ? 'explorador' : 'criador'}>
      {novo ? <ApplyForm me={me} /> : <MagicForm key={explorador ? 'e' : 'c'} leitor={explorador} voltar={voltar} />}
    </AuthFrame>
  )
}
