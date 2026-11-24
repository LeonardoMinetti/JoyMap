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
  // Roteiro com produtos (plano Criador em diante): a história leva ao que o criador usa em casa
  { id: 2, name: 'Cafés para ficar mais um pouco', note: 'Pinheiros, Vila Madalena e Paulista', placeIds: [2, 4, 12], stops: [
    { placeId: 2, when: 'Sábado · 9h40', title: 'Brunch sem pressa', text: 'A fila ainda está só no começo e a mesa grande do fundo está livre: é a que eu sempre peço. Começo pelo pão de fermentação longa com manteiga e um café coado que chega à mesa ainda soltando vapor. A ideia aqui não é correr, é abrir o dia devagar, de conversa em conversa. Esse café eu repito em casa com o moedor manual que deixei nos produtos, no fim do roteiro.', tip: 'Peça o pão quente com a manteiga da casa e reserve a mesa grande pelo Instagram.' },
    { placeId: 4, when: 'Sábado · 15h', title: 'O café para trabalhar', text: 'Depois do almoço o plano muda: notebook na bolsa e ninguém me chama. Aqui tem tomada em quase toda mesa, a luz da janela bate de lado, sem refletir na tela, e o latte não esfria na primeira meia hora. Foi nessa mesa que escrevi metade dos roteiros deste mapa.', tip: 'Sente perto da janela dos fundos: é onde ficam as tomadas e o silêncio.' },
    { placeId: 12, when: 'Sábado · 18h', title: 'Último café, na Paulista', text: 'A avenida acende enquanto a xícara esfria. Fecho o roteiro aqui, de pé no balcão, vendo o movimento da Paulista virar noite. Um expresso curto, sem açúcar, e a sensação de que o dia rendeu. Se quiser levar um pedaço disso para casa, deixei abaixo a caneca que uso e o guia de bolso que me acompanha.', tip: 'Vá perto das 18h: a luz da avenida nessa hora vale o café.' },
  ], products: [
    { title: 'Moedor manual de café', url: 'https://example.com/moedor-manual', price: 'R$ 189' },
    { title: 'Caneca de cerâmica esmaltada', url: 'https://example.com/caneca', price: 'R$ 79' },
    { title: 'Guia de bolso: cafés de São Paulo', url: 'https://example.com/guia-cafes-sp', price: 'R$ 39' },
  ] },
  // Roteiro patrocinado (plano Pro): marca fictícia, só para o exemplo
  { id: 3, name: 'Uma noite, quatro bairros', note: 'Bar, pizza, sobremesa e um último lanche', placeIds: [7, 9, 6, 10], sponsor: { brand: 'Cartão Aurora', logo: null }, stops: [
    { placeId: 7, when: 'Sexta · 19h', title: 'Começa no centro', text: 'Este roteiro foi feito em parceria com o Cartão Aurora, uma marca fictícia criada só para este exemplo. A noite começa quando os escritórios esvaziam e o bar enche aos poucos. Peço a primeira rodada no balcão e deixo o resto sem horário: é aqui que a noite escolhe para onde vai.', tip: 'Pague a primeira rodada no balcão para não perder a mesa.' },
    { placeId: 9, when: 'Sexta · 21h', title: 'Pizza que sai em dois minutos', text: 'O forno é a lenha, a massa é fina de borda alta e a primeira fatia some antes de a conversa recomeçar. Dividi com três amigos e ainda sobrou espaço para o resto da noite, que era o plano.', tip: 'Peça meio a meio: dá para provar dois sabores sem briga.' },
    { placeId: 6, when: 'Sexta · 23h', title: 'Sobremesa tarde, que vale mais', text: 'A vitrine ainda está cheia e a mousse de chocolate com sal é a que entra em todo roteiro meu. Comer doce depois da meia-noite tem outro sabor, e aqui ninguém olha o relógio.', tip: 'Os doces de vitrine acabam por volta de 23h30.' },
    { placeId: 10, when: 'Sábado · 1h', title: 'Fecha com uma tapioca', text: 'Final de noite honesto: tapioca na chapa, queijo coalho derretendo e a rua ainda acesa. Pago a conta, volto a pé até o carro e a noite termina do jeito que começou, sem pressa.', tip: 'Leve dinheiro trocado: a chapa é pequena e o caixa é simples.' },
  ] },
]
