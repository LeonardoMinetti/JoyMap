// Reduz o logo enviado para no máximo 240 px e devolve em PNG embutido (vai dentro do arquivo do mapa).
export async function fileToLogo(file) {
  const img = await createImageBitmap(file)
  const k = Math.min(1, 240 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * k))
  canvas.height = Math.max(1, Math.round(img.height * k))
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}
