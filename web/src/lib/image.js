// Reduz a foto no navegador antes de enviar: lado maior de 900 px, JPEG. Devolve { mime, data (base64), url }.
export async function resizeImage(file, max = 900) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('formato')
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const cv = document.createElement('canvas')
  cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k)
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height)
  const url = cv.toDataURL('image/jpeg', 0.82)
  return { mime: 'image/jpeg', data: url.split(',')[1], url }
}
