// Logo de marca em SVG, embutido no arquivo do mapa. Na tela ele é pintado de uma cor só (pelo formato),
// por isso o desenho precisa ter fundo transparente. Como só é usado como imagem, nenhum script dele roda.
export const LOGO_MAX = 40 * 1024
export async function fileToLogo(file) {
  const text = (await file.text()).trim()
  if (!/<svg[\s>]/i.test(text)) throw new Error('Envie o logo em SVG.')
  const bytes = new TextEncoder().encode(text)
  if (bytes.length > LOGO_MAX) throw new Error('O SVG passa de 40 KB. Peça uma versão simplificada.')
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return `data:image/svg+xml;base64,${btoa(bin)}`
}
