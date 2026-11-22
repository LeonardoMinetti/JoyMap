// Gera os subconjuntos curados das bibliotecas de símbolos a partir dos pacotes @iconify-json (devDependencies).
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { LIBS, EXTRA_EMOJI } from '../web/src/iconcat.js'
const require = createRequire(import.meta.url)
const pk = { fluent3d: '@iconify-json/fluent-emoji', noto: '@iconify-json/noto', lucide: '@iconify-json/lucide' }
for (const [set, meta] of Object.entries(LIBS)) {
  const data = require(`${pk[set]}/icons.json`)
  const out = {}, missing = []
  const names = [...meta.cat.map((c) => c[0]), ...(set === 'fluent3d' ? EXTRA_EMOJI : [])]
  for (const name of names) {
    let ic = data.icons[name]
    const al = data.aliases?.[name]
    if (!ic && al && data.icons[al.parent] && !al.hFlip && !al.vFlip && !al.rotate) ic = data.icons[al.parent]
    if (ic && !ic.width && !ic.height) out[name] = ic.body
    else if (ic) missing.push(name + '(size)')
    else missing.push(name)
  }
  writeFileSync(new URL(`../web/src/iconlib/${set}.json`, import.meta.url), JSON.stringify(out))
  console.log(set, Object.keys(out).length, 'ícones', missing.length ? 'faltando: ' + missing.join(', ') : '')
}
