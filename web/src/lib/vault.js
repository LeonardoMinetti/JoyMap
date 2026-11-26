// Cofre da base de lugares: o arquivo publicado é cifrado (AES-256-GCM, chave derivada da senha por PBKDF2).
// O mesmo código roda no script que cifra (Node) e no navegador que abre.
export const ITER = 600000
const enc = new TextEncoder()
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s) }
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())

async function keyFrom(password, salt, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function seal(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = await pipe(enc.encode(JSON.stringify(data)), new CompressionStream('gzip'))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFrom(password, salt, ITER), plain)
  return { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(cipher)) }
}

// senha errada ou arquivo alterado: lança erro
export async function open(box, password) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, await keyFrom(password, unb64(box.salt), box.iter), unb64(box.data))
  return JSON.parse(new TextDecoder().decode(await pipe(new Uint8Array(plain), new DecompressionStream('gzip'))))
}
