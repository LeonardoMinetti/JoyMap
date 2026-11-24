// Paradas de um roteiro: cada uma pode apontar para um lugar do mapa e contar um pedaço da história (texto, quando, dica).
// Sem lugar, a parada é só um capítulo de texto.
const str = (v, n) => String(v ?? '').replace(/\s+\n/g, '\n').trim().slice(0, n)
export function cleanStops(input, own) {
  const out = []
  for (const s of (Array.isArray(input) ? input : []).slice(0, 30)) {
    const placeId = own.has(Number(s?.placeId)) ? Number(s.placeId) : null
    const st = { placeId, title: str(s?.title, 60), when: str(s?.when, 30), text: str(s?.text, 600), tip: str(s?.tip, 160) }
    if (placeId || st.title || st.text) out.push(st)
  }
  return out
}
