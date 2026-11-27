// Regras puras da extração de lugares (sem rede): junção de repetidos, decisão de revisão e CSV.
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const GENERIC = new Set(['bar', 'cafe', 'padaria', 'cozinha', 'confeitaria', 'restaurante', 'boteco', 'chocolates', 'e'])
const key = (nome) => { const w = norm(nome).split(' '); const core = w.filter((x) => !GENERIC.has(x)); return (core.length ? core : w).join('') }
// mesmo nome na mesma cidade é um lugar só; fica a menção que traz mais informação
export function dedupe(list) {
  const out = new Map()
  const score = (p) => (p.rua ? 2 : 0) + (p.numero ? 1 : 0) + (p.bairro ? 1 : 0)
  for (const p of list) {
    const k = `${key(p.nome)}|${norm(p.cidade)}`
    const old = out.get(k)
    if (!old) out.set(k, p)
    else if (score(p) > score(old)) out.set(k, { ...p, publi: p.publi || old.publi })
    else old.publi = old.publi || p.publi
  }
  return [...out.values()]
}

// Só entra direto o que o próprio criador informou (rua na legenda) e o mapa localizou na cidade certa.
// A "certeza" que a IA declara não é usada: nos testes ela veio alta também nos erros.
export function decide(p) {
  if (!p.rua) return { status: 'sem-endereco', motivo: 'nenhum endereço encontrado' }
  if (p.lat == null) return { status: 'revisar', motivo: 'endereço não localizado no mapa' }
  if (p.origem === 'legenda') return { status: 'ok', motivo: 'endereço da legenda' }
  const bairro = p.bairroLegenda && norm(p.bairro) !== norm(p.bairroLegenda) ? `; a legenda fala em ${p.bairroLegenda} e a busca em ${p.bairro || '?'}` : ''
  return { status: 'revisar', motivo: `endereço achado por busca${bairro}` }
}

export const COLS = ['aprovar', 'status', 'motivo', 'nome', 'categoria', 'rua', 'numero', 'bairro', 'cidade', 'lat', 'lon', 'publi', 'post', 'fonte']
// célula que começa como fórmula é neutralizada: o texto vem de legendas e da web e vai abrir numa planilha
const cell = (v) => { let s = String(v ?? ''); if (/^[=+@\t\r]|^-(?![\d.])/.test(s)) s = `'${s}`; return /[",;\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s }
export const toCsv = (rows) => [COLS.join(','), ...rows.map((r) => COLS.map((c) => cell(r[c])).join(','))].join('\n') + '\n'
export function fromCsv(text) {
  const sep = text.split('\n', 1)[0].includes(';') ? ';' : ',' // planilhas em português salvam com ;
  const rows = [[]]
  let cur = '', q = false
  const t = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) { if (c === '"' && t[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else if (c === '"') q = true
    else if (c === sep) { rows.at(-1).push(cur); cur = '' }
    else if (c === '\n') { rows.at(-1).push(cur); cur = ''; rows.push([]) }
    else cur += c
  }
  if (cur || rows.at(-1).length) rows.at(-1).push(cur)
  const [head, ...body] = rows.filter((r) => r.length > 1)
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').replace(/^'(?=[=+@-])/, '')])))
}

import { CATEGORY_IDS } from '../../server/categories.js'
export const CATEGORIES = CATEGORY_IDS
export const toPlace = (r, id) => ({
  id, name: r.nome, category: CATEGORIES.includes(r.categoria) ? r.categoria : 'rest', neighborhood: r.bairro || null,
  lat: Number(r.lat), lon: Number(r.lon), photo: null, address: [r.rua, r.numero].filter(Boolean).join(', '), municipality: r.cidade,
  hours: null, geoQuality: 'approx', postUrl: /^https:\/\//.test(r.post) ? r.post : null, postedOn: null, ad: /^(true|sim|s)$/i.test(String(r.publi)), tiktokId: null,
})
// junta os aprovados a um mapa existente, sem repetir nome na mesma cidade
export function apply(map, rows) {
  const have = new Set(map.places.map((p) => `${norm(p.name)}|${norm(p.municipality)}`))
  let id = Math.max(0, ...map.places.map((p) => p.id))
  const added = rows.filter((r) => /^(s|sim)$/i.test(r.aprovar.trim()) && r.lat && r.lon && !have.has(`${norm(r.nome)}|${norm(r.cidade)}`)).map((r) => toPlace(r, ++id))
  return { map: { ...map, places: [...map.places, ...added] }, added }
}
