const files = import.meta.glob('./bee-*.svg', { eager: true, query: '?url', import: 'default' })
export { default as logoUrl } from './logo.svg'
// Abelha da wagli: personalidade (brincalhona...carinhosa) e nível (1 a 4).
export const beeUrl = (personality, level) => files[`./bee-${personality}-${level}.svg`] || files['./bee-brincalhona-1.svg']
