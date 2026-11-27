// Regras puras do fluxo de seleção (sem rede): triagem por código, junção de repetidos, base primeiro e situação de cada lugar.
import { norm } from './lugares.js'

const GENERIC = new Set('bar cafe padaria cozinha confeitaria restaurante boteco chocolates pizzaria pizza hamburgueria burger burguer bakery shop o a os as e de da do das dos'.split(' '))
export const core = (nome) => { const w = norm(String(nome).split(' (')[0]).split(' ').filter(Boolean); const c = w.filter((x) => !GENERIC.has(x)); return (c.length ? c : w).join('') }
const flat = (s) => norm(s).replace(/ /g, '')

// passo 2: endereço escrito e @ citados, sem IA
const END = /(?<![\p{L}])(?:Rua|R\.|Avenida|Av\.?|Alameda|Al\.|Travessa|Praça|Estrada|Rodovia)\s+[^\n,|•]{3,60}?[,\s]\s*(?:n[ºo°.]\s*)?\d{1,5}(?!\d)/giu
export const triage = (caption) => ({
  enderecos: [...String(caption).matchAll(END)].map((m) => m[0].trim()),
  arrobas: [...new Set([...String(caption).matchAll(/(?<![\w.])@([A-Za-z0-9_][A-Za-z0-9_.]{1,29})/g)].map((m) => '@' + m[1].toLowerCase().replace(/\.+$/, '')))],
})

// o @ é do lugar quando o nome aparece nele (ou o contrário)
export function handleFor(nome, arrobas) {
  const k = core(nome)
  const hits = arrobas.filter((a) => { const h = flat(a.slice(1).replace(/[._]/g, '')); return k.length >= 4 && (h.includes(k) || (h.length >= 5 && flat(nome).includes(h))) })
  return hits.length === 1 ? hits[0] : ''
}

export const numberOf = (endereco) => String(endereco || '').match(/(?:^|[\s,])(\d{1,2}\.\d{3}|\d{1,5})(?!\d)/)?.[1]?.replace('.', '') || ''
const streetOf = (endereco) => norm(String(endereco || '').split(',')[0]).split(' ').filter((w) => w && !['rua', 'r', 'avenida', 'av', 'alameda', 'al', 'praca', 'dr', 'doutor', 'prof', 'professor'].includes(w)).join(' ')
export const sameAddress = (a, b) => !!numberOf(a) && numberOf(a) === numberOf(b) && streetOf(a) === streetOf(b)

const CAT = [['pizza', /pizz/], ['burger', /burg|hambur/], ['snack', /lanche|hot ?dog|sanduic/], ['japa', /sushi|zushi|temaki|japa|izakaya|lamen|ramen/], ['kore', /corean|korea/], ['chin', /chines|dim ?sum/], ['ital', /osteria|trattoria|cantina|forneria|cucina/], ['mexi', /taco|taqueria|mexic/], ['bread', /padaria|paes|panific/], ['ice', /gelat|sorvet|heladeria/], ['cake', /doce|confeit|bolo|cake|chocolat|sweet|patisserie/], ['cafe', /cafe|coffee|bakery/], ['brunch', /brunch/], ['beer', /cervej|brewing|chopp/], ['bar', /\bbar\b|boteco|botequim|pub/], ['park', /parque|praca/], ['theater', /theatro|teatro|cinema/], ['art', /museu|galeria/], ['market', /feir|mercad|hortifruti/], ['shop', /shopping|outlet|loja|center/], ['sport', /academia|studio|club/]]
export const guessCategory = (nome) => CAT.find(([, re]) => re.test(norm(nome)))?.[0] || 'rest'

// passos 2 e 3 juntos: de menções por post para uma lista de lugares sem repetição
export function gather(posts, handle) {
  const out = new Map()
  for (const p of posts) {
    const t = triage(p.caption)
    const arrobas = t.arrobas.filter((a) => a !== '@' + handle.toLowerCase())
    for (const l of p.lugares) {
      const cidade = l.cidade || 'São Paulo'
      let rua = l.rua || ''
      // a triagem completa o que a IA não copiou, só quando não há dúvida de quem é o endereço
      if (!rua && p.lugares.length === 1 && t.enderecos.length === 1) rua = t.enderecos[0]
      const arroba = handleFor(l.nome, arrobas)
      const key = `${core(l.nome)}|${norm(cidade)}`
      const noTexto = flat(p.caption.replace(/@[\w.]+/g, ' ')).includes(core(l.nome))
      const cur = out.get(key) || { chave: key, nome: l.nome, cidade, endereco: '', bairro: '', arroba: '', publi: false, posts: [], nomeEscrito: false }
      if (!cur.endereco && rua) cur.endereco = rua
      else if (rua && numberOf(rua) && numberOf(cur.endereco) && numberOf(rua) !== numberOf(cur.endereco)) cur.divergente = true
      cur.bairro ||= l.bairro || ''
      cur.arroba ||= arroba
      cur.publi ||= !!(l.publi || p.publi)
      cur.nomeEscrito ||= noTexto
      if (!cur.posts.some((x) => x.url === p.url)) cur.posts.push({ url: p.url, data: p.data })
      out.set(key, cur)
    }
  }
  // grafias diferentes do mesmo lugar: mesmo endereço e mesmo começo de nome
  const list = []
  for (const p of out.values()) {
    const twin = list.find((x) => norm(x.cidade) === norm(p.cidade) && sameAddress(x.endereco, p.endereco) && core(x.nome).slice(0, 4) === core(p.nome).slice(0, 4))
    if (!twin) { list.push(p); continue }
    twin.posts.push(...p.posts.filter((a) => !twin.posts.some((b) => b.url === a.url)))
    twin.arroba ||= p.arroba
    twin.publi ||= p.publi
    twin.nomeEscrito ||= p.nomeEscrito
  }
  return list
}

// passo 4: base primeiro, pelo @ e depois pelo nome
export function findInBase(place, base) {
  const inCity = base.filter((b) => b.situacao !== 'excluido' && norm(b.cidade) === norm(place.cidade))
  if (place.arroba) { const hit = inCity.filter((b) => b.instagram === place.arroba); if (hit.length === 1) return { hit: hit[0], por: '@' } }
  const named = inCity.filter((b) => core(b.nome) === core(place.nome))
  if (!named.length) return null
  const exact = named.find((b) => sameAddress(b.endereco, place.endereco))
  return { hit: exact || named[0], por: 'nome', varias: !exact && named.length > 1 }
}
export const findInMap = (place, mapPlaces) => mapPlaces.find((m) => core(m.name) === core(place.nome) || sameAddress(m.address, place.endereco) && core(m.name).slice(0, 4) === core(place.nome).slice(0, 4))
