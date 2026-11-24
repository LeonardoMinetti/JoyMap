// Dados de demonstração (fictícios): nomes inventados em bairros reais de São Paulo.
// Usados no mapa público /@demo e nas vitrines da landing. Não são recomendações nem clientes reais.
export const DEMO_SLUG = 'demo'
export const DEMO_PLACES = [
  { id: 1, name: 'Izakaya Exemplo', category: 'rest', neighborhood: 'Liberdade', lat: -23.5588, lon: -46.6354 },
  { id: 2, name: 'Brunch Exemplo', category: 'cafe', neighborhood: 'Pinheiros', lat: -23.5667, lon: -46.6917 },
  { id: 3, name: 'Cantina Exemplo', category: 'rest', neighborhood: 'Bela Vista', lat: -23.5578, lon: -46.6475 },
  { id: 4, name: 'Café Exemplo', category: 'cafe', neighborhood: 'Vila Madalena', lat: -23.5546, lon: -46.6911 },
  { id: 5, name: 'Burger Exemplo', category: 'burger', neighborhood: 'Itaim Bibi', lat: -23.5841, lon: -46.6788 },
  { id: 6, name: 'Doceria Exemplo', category: 'cake', neighborhood: 'Jardins', lat: -23.57, lon: -46.662 },
  { id: 7, name: 'Bar Exemplo', category: 'bar', neighborhood: 'Centro', lat: -23.5505, lon: -46.6333 },
  { id: 8, name: 'Padaria Exemplo', category: 'bread', neighborhood: 'Mooca', lat: -23.5604, lon: -46.5988 },
  { id: 9, name: 'Pizza Exemplo', category: 'pizza', neighborhood: 'Moema', lat: -23.5995, lon: -46.6665 },
  { id: 10, name: 'Tapioca Exemplo', category: 'rest', neighborhood: 'Santa Cecília', lat: -23.537, lon: -46.649 },
  { id: 11, name: 'Ramen Exemplo', category: 'rest', neighborhood: 'Liberdade', lat: -23.5615, lon: -46.6339 },
  { id: 12, name: 'Cafeteria Exemplo', category: 'cafe', neighborhood: 'Paulista', lat: -23.5614, lon: -46.6559 },
]
const PHOTO = { 1: 'sushi', 2: 'brunch', 3: 'massa', 4: 'latte', 5: 'burger', 6: 'bolo', 7: 'drink', 8: 'croissant', 9: 'pizza', 10: 'petisco', 11: 'ramen', 12: 'espresso' }
export const demoPlaces = () => DEMO_PLACES.map((p) => ({
  ...p, photo: `${(typeof globalThis !== 'undefined' && globalThis.__WAGLI_BASE__) || ''}/photos/${PHOTO[p.id]}.jpg`, address: 'Endereço ilustrativo (demonstração)', municipality: 'São Paulo', geoQuality: 'approx', postUrl: null, postedOn: null, ad: false, tiktokId: null,
}))
// Três identidades de demonstração (comida de rua, cafeterias e alta gastronomia).
const cat = (id, name, color, icon) => ({ id, name, color, icon })
// Criadores de demonstração (fictícios): dois casais e um criador solo. Cada um usa um MODELO do estúdio (tpl) e personaliza só o que o painel permite: nome, foto de perfil, bio e cor principal.
export const DEMO_IDENTITIES = [
  { key: 'rua', tpl: 'solar', avatar: 'bia-caio', pool: ['bia-caio-b', 'tacos', 'rua', 'burger2', 'pastel', 'rua2', 'coxinha', 'sorvete', 'tacos2', 'petisco', 'pizza2', 'coxinha2', 'drink2', 'burger', 'crumble', 'feijoada', 'acai'],
    hl: ['Boteco', 'Rua', 'Doces', 'Roteiros', 'Nós'],
    name: 'Bia & Caio', handle: 'biaecaio.come.demo', tagline: 'Casal que come (muito) em São Paulo. Rua, boteco e balcão, sempre a dois.', bio: ['Casal que come muito em São Paulo', 'Rua, boteco e balcão, sempre a dois', 'Parcerias: chama no direct'] },
  { key: 'cafe', tpl: 'doce', avatar: 'duda-lu', pool: ['duda-lu-b', 'latte', 'croissant', 'bolo', 'espresso', 'matcha', 'doce', 'brunch', 'confeitaria', 'paodequeijo', 'cafe', 'croissant2', 'panqueca', 'crumble', 'sorvete'],
    hl: ['Cafés', 'Brunch', 'Doces', 'Nós', 'Dicas'],
    name: 'Duda & Lu', handle: 'dudaelu.cafe.demo', tagline: 'Casal de cafeterias e confeitarias. Um café, uma sobremesa, duas colheres.', bio: ['Casal de cafeterias e confeitarias', 'Um café, uma sobremesa, duas colheres', 'Pauta nova todo fim de semana'] },
  { key: 'noir', tpl: 'noite', avatar: 'rafa', pool: ['rafa-b', 'ostras2', 'carne2', 'vieira', 'sobremesa', 'vinho', 'ostras', 'carne', 'drink', 'massa', 'salada', 'sushi2', 'drink2', 'confeitaria'],
    hl: ['Menus', 'Adegas', 'Omakase', 'Solo', 'Notas'],
    name: 'Rafa à Mesa', handle: 'rafaamesa.demo', tagline: 'Jantar sozinho também é programa. Alta gastronomia, poucas casas e muito critério.', bio: ['Jantar sozinho também é programa', 'Alta gastronomia em São Paulo', 'Reservas e notas de degustação'] },
]
// Grade de perfil realista: repete a seleção do criador em variações (espelhada e com outro enquadramento).
export const profileGrid = (pool, n = 36) => Array.from({ length: n }, (_, i) => { const k = pool[(i * 5 + Math.floor(i / pool.length)) % pool.length]; const v = Math.floor(i / pool.length) % 3; return v === 0 ? k : `${k}:${v === 1 ? 'f' : 'z'}` })
// Seleção ampla e variada para perfis genéricos
export const MIXED_POOL = ['pizza', 'sushi', 'burger', 'bolo', 'tacos', 'croissant', 'drink', 'ramen', 'sorvete', 'latte', 'massa', 'carne', 'salada', 'brunch', 'espresso', 'ostras', 'coxinha', 'panqueca', 'vinho', 'feijoada']

// Roteiros de demonstração (listas de lugares fictícios)
export const DEMO_ROUTES = [
  { id: 1, name: 'Liberdade a pé', note: 'Izakaya e ramen em poucas quadras', placeIds: [1, 11], stops: [
    { placeId: 1, when: 'Dia 1 · almoço', title: 'Começa pelo izakaya', text: 'Chegue cedo: a casa é pequena e a fila cresce depois das 12h30. Peça os espetinhos para dividir e deixe o sushi para o fim.', tip: 'Sem reserva, vá na abertura.' },
    { placeId: null, when: 'Dia 1 · começo da tarde', title: 'Uma volta pelo bairro', text: 'Sobrou tempo antes do próximo destino? Caminhe pelas ruas ao redor, entre nas lojinhas e deixe a digestão ajudar.', tip: '' },
    { placeId: 11, when: 'Dia 1 · fim da tarde', title: 'Fecha com um ramen', text: 'A poucas quadras dali, o caldo é o forte da casa. Dá para comer em dez minutos ou ficar uma hora conversando.', tip: 'Peça o ovo extra.' },
  ] },
  { id: 2, name: 'Cafés para ficar mais um pouco', note: 'Pinheiros, Vila Madalena e Paulista', placeIds: [2, 4, 12], stops: [
    { placeId: 2, when: 'Manhã', title: 'Brunch sem pressa', text: 'Para quem gosta de começar o dia devagar: mesa grande, pão quente e café coado.', tip: 'Fim de semana enche, chegue antes das 10h.' },
    { placeId: 4, when: 'Meio da tarde', title: 'O café para trabalhar', text: 'Tomadas, luz boa e um latte que não esfria na primeira meia hora.', tip: '' },
    { placeId: 12, when: 'Fim do dia', title: 'Último café, na Paulista', text: 'Para fechar o roteiro com uma xícara e a avenida acendendo lá fora.', tip: '' },
  ] },
  { id: 3, name: 'Noite no centro', note: 'Bar, pizza e sobremesa', placeIds: [7, 9, 6, 10] },
]
