// Curadoria da base: as alterações ficam separadas do arquivo original, para dar para desfazer e exportar.
export const EDITABLE = ['nome', 'endereco', 'bairro', 'cidade', 'instagram', 'lat', 'lon', 'situacao']

export const pending = (p) => {
  const out = []
  if (p.situacao === 'conferido' || p.situacao === 'excluido') return out
  if (p.revisar) out.push(p.revisar)
  if (p.lat === '' || p.lat == null) out.push('sem ponto')
  else if (/vizinho|aproximado|a confirmar/.test(p.ponto || '')) out.push('ponto a confirmar')
  if (/confirmar/.test(p.instagram_origem || '')) out.push('Instagram a confirmar')
  return out
}

export const merge = (places, edits) => {
  const ids = new Set(places.map((p) => p.id))
  const added = Object.entries(edits).filter(([id]) => !ids.has(id)).map(([id, e]) => ({ id, fontes: 'curadoria', ...e }))
  return [...places, ...added].map((p) => (edits[p.id] ? { ...p, ...edits[p.id], editado: true } : p))
}

export const instagramHandle = (v) => {
  const m = String(v || '').trim().match(/^(?:https?:\/\/(?:www\.)?instagram\.com\/|@)?([A-Za-z0-9_.]{2,30})\/?(?:\?.*)?$/)
  return m ? '@' + m[1].toLowerCase() : ''
}

const cell = (v) => { let s = String(v ?? ''); if (/^[=+\t\r]|^-(?!\d)/.test(s)) s = "'" + s; return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
export const CSV_FIELDS = ['nome', 'endereco', 'bairro', 'cidade', 'instagram', 'lat', 'lon', 'ponto', 'situacao', 'horario_quarta', 'horario_semana', 'pagamento', 'fontes']
export const toCsv = (list) => '﻿' + [CSV_FIELDS.join(','), ...list.map((p) => CSV_FIELDS.map((k) => cell(p[k])).join(','))].join('\r\n')
