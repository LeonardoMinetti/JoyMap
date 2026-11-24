import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Link, Redirect, navigate } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { Logo, Hd, Stage, Step, Note, Field, Switch, Toggle, Guard, Loading, useTitle } from '../lib/ui.jsx'
import { useMe, homeFor } from '../lib/me.jsx'
import MotionMap from '../MotionMap.jsx'
import { AuthFrame, IconCircle } from './Auth.jsx'
import { num } from '../theme.jsx'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const First = (name) => String(name || '').split(' ')[0]

// Candidatura recebida / em análise / lista de espera / não aprovada (B3 e variantes)
export function ApplyStatus({ sent }) {
  useTitle('Candidatura')
  const { me } = useMe()
  const [min, setMin] = useState(null)
  useEffect(() => { api('/config').then((c) => setMin(c.minFollowers)).catch(() => {}) }, [])
  if (me === undefined) return <Loading />
  const c = me.creator
  if (!sent && !c) return <Redirect to="/entrar?criar=1" />
  if (c && c.status === 'approved') return <Redirect to={homeFor(me)} />
  const status = sent ? 'pending' : c.status
  let email = ''
  try { email = sessionStorage.getItem('applied_email') || '' } catch { /* ok */ }
  const handle = c?.handle
  const T = {
    pending: { icon: 'clock', c: '#93370d', bg: 'var(--suns)', h: 'Candidatura recebida', p: `Estamos analisando o perfil${handle ? ` @${handle}` : ''}. Conferimos o número de seguidores e se você é o titular. Quando for aprovado, entre com o e-mail da candidatura.` },
    waitlist: { icon: 'clock', c: '#93370d', bg: 'var(--suns)', h: 'Ainda não chegou a sua vez', p: `Por enquanto atendemos perfis com no mínimo ${min == null ? '…' : num(min)} seguidores. Você entrou na lista de espera e avisamos quando o critério mudar.` },
    rejected: { icon: 'close', c: '#b42318', bg: 'var(--bads)', h: 'Candidatura não aprovada', p: 'Por enquanto não conseguimos atender este perfil. Obrigado pelo interesse.' },
  }[status] || {}
  return (
    <AuthFrame kind="criador">
      <IconCircle n={T.icon} c={T.c} bg={T.bg} />
      <h1 className="d s44">{T.h}</h1>
      <p className="mut">{status === 'pending' && email ? <>Estamos analisando o perfil. Conferimos o número de seguidores e se você é o titular. Quando for aprovado, entre com <b>{email}</b>.</> : T.p}</p>
      {c && <div className="card soft col" style={{ gap: 6 }}><div className="row jb"><span className="sm">Seu perfil</span><b>@{c.handle}</b></div><div className="row jb"><span className="sm">Seguidores</span><b>{c.followers ? num(c.followers) : 'em conferência'}</b></div><div className="row jb"><span className="sm">Mínimo atual</span><b>{min == null ? '…' : num(min)}</b></div></div>}
      <Note>Seu e-mail fica guardado só para este aviso e é apagado se você pedir.</Note>
      <div className="col" style={{ gap: 10 }}><Link className="btn blk" to="/exemplos">Ver mapas de exemplo</Link>{!sent && <Link className="btn ln blk" to="/">Voltar ao início</Link>}{sent && <Link className="btn ln blk" to="/entrar?como=criador">Já fui aprovado: entrar</Link>}</div>
    </AuthFrame>
  )
}

// B2 · Perfil aprovado
export function Approved() {
  useTitle('Perfil aprovado')
  const { me, reload } = useMe()
  const c = me?.creator
  return (
    <Guard need="approved"><Stage>
      <div className="hd"><Logo size={22} dot={16} /></div>
      <div className="bd" style={{ justifyContent: 'center' }}>
        <IconCircle n="check" c="#067647" bg="var(--oks)" />
        <h1 className="d s44">Perfil aprovado</h1>
        <p className="mut">@{c?.handle} atende ao critério de {num(me?.minFollowers)} seguidores. Faltam {c?.accounts ? 'dois' : 'três'} passos para o seu mapa.</p>
        <div className="card col" style={{ gap: 14 }}>
          {[['Criar seu acesso', 'E-mail, sem senha', true], ['Conectar suas contas', 'Instagram e, se quiser, TikTok'], ['Escolher o plano', '30 dias de teste']].map(([t, d, done], i) => (
            <div key={t} className="row"><span className="av" style={{ width: 32, height: 32, fontSize: 16, ...(i > 0 ? { background: 'var(--soft)', color: 'var(--mut)' } : {}), ...(done ? { background: 'var(--oks)', color: 'var(--ok)' } : {}) }}>{done ? <Icon n="check" s={16} c="#067647" /> : i + 1}</span><div className="sp"><b>{t}</b><div className="xs mut">{d}</div></div></div>))}
        </div></div>
      <div className="ft"><button className="btn blk" onClick={async () => { await api('/creator/onboarding', { method: 'PUT', body: { step: 'instagram' } }); await reload(); navigate('/conectar/instagram') }}>Continuar</button></div>
    </Stage></Guard>
  )
}

// Passos de onboarding (exigem criador aprovado)
const next = async (reload, step, to) => { await api('/creator/onboarding', { method: 'PUT', body: { step } }); await reload(); navigate(to) }
const PERM = ({ children }) => <div className="row"><Icon n="check" s={18} c="#067647" /><span className="sm">{children}</span></div>
const NEVER = ({ children }) => <div className="row"><Icon n="close" s={18} c="#b42318" /><span className="sm">{children}</span></div>

function ConnectScreen({ network, step, title, intro, reads, nevers, note, back, onSkipTo, skipLabel, extraTag }) {
  const { me, reload } = useMe()
  const [msg, setMsg] = useState(false)
  const ready = me?.creator?.meta?.[network === 'instagram' ? 'instagramReady' : 'tiktokReady']
  const connect = async () => {
    try { await api(`/creator/connect/${network}`, { method: 'POST' }) } catch (x) { if (x.status === 501) setMsg(true) }
  }
  const skip = async () => { await api('/creator/accounts', { method: 'PUT', body: { network, state: 'skipped' } }); await next(reload, onSkipTo.step, onSkipTo.to) }
  const label = network === 'instagram' ? 'Instagram' : 'TikTok'
  useTitle(`Conectar ${label}`)
  return (
    <Guard need="approved"><Stage>
      <Hd back={back} title="Conectar contas" right={<span className="xs mut" style={{ fontFamily: 'Archivo' }}>{step} de 4</span>} />
      <div className="bd">
        <Step n={step} of={4} />
        {extraTag}
        <h1 className="d s44">{title}</h1>
        <p className="mut sm">{intro}</p>
        <div className="card col" style={{ gap: 10 }}><span className="eb">O que vamos ler</span>{reads.map((r) => <PERM key={r}>{r}</PERM>)}</div>
        {nevers && <div className="card soft col" style={{ gap: 10 }}><span className="eb">O que nunca lemos</span>{nevers.map((r) => <NEVER key={r}>{r}</NEVER>)}</div>}
        <Note>{note}</Note>
        {msg && <Note style={{ background: 'var(--accs)', color: 'var(--accd)' }}>A conexão oficial com o {label} depende da aprovação do nosso app pela plataforma e ainda não está ativa{ready ? '' : ' neste ambiente'}. Você pode seguir e adicionar os posts colando o link e a legenda de cada um.</Note>}
      </div>
      <div className="ft">
        <button className="btn blk" onClick={connect}><Icon n={network === 'instagram' ? 'insta' : 'tiktok'} s={18} c="#fff" />Conectar com {label}</button>
        {msg || network === 'tiktok' ? <button className="btn ln blk" onClick={skip}>{msg ? 'Continuar sem conectar' : skipLabel}</button> : null}
      </div>
    </Stage></Guard>
  )
}
// B6
export const ConnectInstagram = () => (
  <ConnectScreen network="instagram" step={1} back="/candidatura/aprovado" title="Conecte seu Instagram" intro="Você será levado ao login oficial do Instagram. Não pedimos sua senha."
    reads={['Legendas e links dos seus posts', 'Nome, foto e @ do perfil']} nevers={['Mensagens diretas e Stories', 'Lista de seguidores e curtidas']}
    note="A conta precisa ser profissional (criador ou empresa). Você pode revogar o acesso quando quiser, em Contas conectadas." onSkipTo={{ step: 'tiktok', to: '/conectar/tiktok' }} />
)
// B7
export function ConnectTikTok() {
  const { me } = useMe()
  const ig = me?.creator?.accounts?.instagram
  return <ConnectScreen network="tiktok" step={2} back="/conectar/instagram" title="Quer incluir o TikTok?" intro="Opcional. Seus vídeos de indicação entram no mapa junto com os posts do Instagram."
    reads={['Lista dos seus vídeos, título e link', 'Nome e foto do perfil']} note="Comentários não são lidos. Você pode conectar o TikTok depois, em Contas conectadas." skipLabel="Pular por agora"
    onSkipTo={{ step: 'consents', to: '/consentimentos' }} extraTag={<div className="row"><span className={'tag ' + (ig === 'connected' ? 'ok' : 'wn')}>{ig === 'connected' ? 'Instagram conectado' : 'Instagram: conectar depois'}</span></div>} />
}

// B8 · Consentimentos
export function Consents() {
  useTitle('Suas escolhas')
  const { me, reload } = useMe()
  const [c, setC] = useState({ network: false, aggregatesForRestaurants: false, marketing: false })
  const rows = [['network', 'Aparecer no mapa geral', 'Seu mapa entra na descoberta com outros criadores. Revogável.'], ['aggregatesForRestaurants', 'Dados agregados para restaurantes', 'Contagens de indicações, sem dados de pessoas.'], ['marketing', 'Divulgação e cases', 'Usar o seu mapa como exemplo no site.']]
  const save = async () => { await api('/creator/consents', { method: 'PUT', body: c }); await next(reload, 'plan', '/plano') }
  return (
    <Guard need="approved"><Stage>
      <Hd back="/conectar/tiktok" title="Suas escolhas" right={<span className="xs mut" style={{ fontFamily: 'Archivo' }}>3 de 4</span>} />
      <div className="bd" style={{ gap: 12 }}>
        <Step n={3} of={4} />
        <h1 className="d s32">Você decide cada uso dos seus dados</h1>
        <div className="card soft row"><div className="sp"><b className="sm">Hospedar e exibir o meu mapa</b><div className="xs mut">Necessário para o serviço funcionar</div></div><Switch on disabled label="Hospedar e exibir o meu mapa" /></div>
        {rows.map(([k, t, d]) => <div key={k} className="card row"><div className="sp"><b className="sm">{t}</b><div className="xs mut">{d}</div></div><Switch on={c[k]} onChange={(v) => setC({ ...c, [k]: v })} label={t} /></div>)}
        <Note>Você pode mudar tudo depois em Privacidade. Nada além do primeiro item é obrigatório.</Note>
      </div>
      <div className="ft"><button className="btn blk" onClick={save}>Salvar e continuar</button></div>
    </Stage></Guard>
  )
}

// B9 · Escolher plano
export function ChoosePlan() {
  useTitle('Escolha o plano')
  const { me, reload } = useMe()
  const [billing, setBilling] = useState(me?.creator?.plan?.billing || 'monthly')
  const go = async () => { await api('/creator/billing', { method: 'PUT', body: { billing } }); await next(reload, 'payment', '/pagamento') }
  return (
    <Guard need="approved"><Stage>
      <Hd back="/consentimentos" title="Escolha o plano" right={<span className="xs mut" style={{ fontFamily: 'Archivo' }}>4 de 4</span>} />
      <div className="bd">
        <Step n={4} of={4} />
        <h1 className="d s44">30 dias para testar</h1>
        <p className="mut sm">Nada é cobrado agora. Você confirma antes do primeiro pagamento.</p>
        <Toggle><button className={'chip' + (billing === 'monthly' ? ' on' : '')} style={billing !== 'monthly' ? { borderColor: 'transparent', background: 'transparent' } : undefined} onClick={() => setBilling('monthly')}>Mensal</button><button className={'chip' + (billing === 'annual' ? ' on' : '')} style={billing !== 'annual' ? { borderColor: 'transparent', background: 'transparent' } : undefined} onClick={() => setBilling('annual')}>Anual</button></Toggle>
        <div className="card sel col" style={{ gap: 8, background: 'var(--accs)' }}><div className="row jb"><b className="d s26">Criador</b><span className="tag" style={{ background: 'var(--ink)', color: '#fff' }}>Selecionado</span></div><div className="d s32">R$ [preço]<span className="s16">/{billing === 'annual' ? 'ano' : 'mês'}</span></div><span className="sm">Mapa completo, estúdio de estilo, painel e endereço próprio.</span></div>
        <div className="card col" style={{ gap: 8 }}><div className="row jb"><b className="d s26">Teste</b><span className="tag">30 dias</span></div><span className="sm mut">Posts recentes, tema padrão do JoyMap e marca JoyMap.</span></div>
        <Note>Valores e limites dos planos estão em definição.</Note>
      </div>
      <div className="ft"><button className="btn blk" onClick={go}>Continuar</button></div>
    </Stage></Guard>
  )
}

// B10 · Pagamento (cobrança ainda não está ativa: nenhum dado de cartão é pedido nem guardado)
export function Payment() {
  useTitle('Pagamento')
  const { me, reload } = useMe()
  const [m, setM] = useState('card')
  const end = new Date(Date.now() + 30 * 86400000).toLocaleDateString('pt-BR')
  const go = async () => { await api('/creator/trial', { method: 'POST', body: { billing: me.creator.plan.billing } }); await reload(); navigate('/boas-vindas') }
  const off = (id, ph) => <div className="in ph" id={id} style={{ opacity: 0.6 }}>{ph}</div>
  return (
    <Guard need="approved"><Stage>
      <Hd back="/plano" title="Pagamento" />
      <div className="bd" style={{ gap: 14 }}>
        <div className="card soft col" style={{ gap: 4 }}><div className="row jb"><b>Plano Criador · {me?.creator?.plan?.billing === 'annual' ? 'anual' : 'mensal'}</b><b>R$ [preço]</b></div><span className="sm mut">Teste grátis até {end}. Primeira cobrança só depois da sua confirmação.</span></div>
        <div className="row"><button className={'chip' + (m === 'card' ? ' on' : '')} onClick={() => setM('card')}><Icon n="card" s={16} c={m === 'card' ? '#fff' : '#171717'} />Cartão</button><button className={'chip' + (m === 'pix' ? ' on' : '')} onClick={() => setM('pix')}>Pix</button></div>
        {m === 'card' ? <>
          <Field label="Número do cartão" id="c1">{off('c1', '0000 0000 0000 0000')}</Field>
          <div className="g2"><Field label="Validade" id="c2">{off('c2', 'MM/AA')}</Field><Field label="Código" id="c3">{off('c3', '123')}</Field></div>
          <Field label="Nome no cartão" id="c4">{off('c4', 'Como está no cartão')}</Field>
        </> : <div className="card soft"><span className="sm">O Pix será gerado no fim do teste, quando a cobrança for confirmada por você.</span></div>}
        <Note>A cobrança ainda não está ativa: o teste grátis começa sem cartão e nenhum dado de pagamento é pedido ou guardado agora.</Note>
        <div className="row sm mut"><Icon n="lock" s={16} c="#6b6b6b" />Quando ativa, o pagamento será processado por um provedor externo.</div>
      </div>
      <div className="ft"><button className="btn blk" onClick={go}>Iniciar teste grátis</button><span className="xs mut c">Cancele quando quiser, em Plano e cobrança.</span></div>
    </Stage></Guard>
  )
}

// B11 · Boas-vindas
export function Welcome() {
  useTitle('Boas-vindas')
  const { me, reload } = useMe()
  const c = me?.creator
  const connected = c && (c.accounts.instagram === 'connected' || c.accounts.tiktok === 'connected')
  const go = async () => { await api('/creator/onboarding', { method: 'PUT', body: { step: 'done' } }); await reload(); navigate('/montando') }
  return (
    <Guard need="approved"><Stage>
      <div style={{ height: 260, background: 'var(--accs)', overflow: 'hidden' }}><MotionMap h={260} tone="mint" pal="candy" shape="circle" n={12} /></div>
      <div className="bd" style={{ gap: 14 }}>
        <h1 className="d s56">Tudo pronto, {First(c?.displayName)}</h1>
        <p className="mut">Seu teste de 30 dias começou. Agora a gente monta o mapa com os seus posts.</p>
        <div className="card col" style={{ gap: 10 }}>
          <div className="row"><Icon n={connected ? 'check' : 'clock'} s={18} c={connected ? '#067647' : '#6b6b6b'} /><span className="sm">{connected ? 'Contas conectadas' : 'Contas: conecte depois (por enquanto você cola os posts)'}</span></div>
          <div className="row"><Icon n="check" s={18} c="#067647" /><span className="sm">Escolhas de privacidade salvas</span></div>
          <div className="row"><Icon n="clock" s={18} c="#6b6b6b" /><span className="sm">Montagem do mapa: leva alguns minutos</span></div>
        </div>
      </div>
      <div className="ft"><button className="btn blk" onClick={go}>Montar meu mapa</button></div>
    </Stage></Guard>
  )
}
