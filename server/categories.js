// Catálogo de categorias do JoyMap, igual em todos os mapas. Um lugar tem uma categoria principal (cor e símbolo do pino)
// e até duas extras (`tags`), que também o fazem aparecer nos filtros. Ids antigos são mantidos.
const e = (name) => `lib:fluent3d:${name}`
const c = (id, name, group, color, icon) => ({ id, name, group, color, icon })

export const CATEGORIES = [
  // cozinhas
  c('arab', 'Árabe', 'Cozinhas', '#b45309', e('stuffed-flatbread')),
  c('arge', 'Argentino e parrilla', 'Cozinhas', '#9f1239', e('cut-of-meat')),
  c('braz', 'Brasileiro', 'Cozinhas', '#15803d', e('pot-of-food')),
  c('chin', 'Chinês', 'Cozinhas', '#c81e1e', e('dumpling')),
  c('kore', 'Coreano', 'Cozinhas', '#be123c', e('curry-rice')),
  c('fren', 'Francês', 'Cozinhas', '#1d4ed8', e('baguette-bread')),
  c('ital', 'Italiano', 'Cozinhas', '#166534', e('spaghetti')),
  c('japa', 'Japonês', 'Cozinhas', '#e11d48', e('sushi')),
  c('mexi', 'Mexicano', 'Cozinhas', '#c2410c', e('taco')),
  c('peru', 'Peruano e latino', 'Cozinhas', '#a21caf', e('fish')),
  c('thai', 'Tailandês e asiático', 'Cozinhas', '#7e22ce', e('steaming-bowl')),
  // comer
  c('rest', 'Restaurantes', 'Comer', '#ff4b2b', e('fork-and-knife-with-plate')),
  c('pizza', 'Pizza', 'Comer', '#dc2626', e('pizza')),
  c('burger', 'Hambúrguer', 'Comer', '#ea580c', e('hamburger')),
  c('snack', 'Lanches e hot dog', 'Comer', '#d97706', e('sandwich')),
  c('meat', 'Carnes e churrasco', 'Comer', '#991b1b', e('poultry-leg')),
  c('sea', 'Frutos do mar', 'Comer', '#0369a1', e('fried-shrimp')),
  c('veg', 'Vegano e saudável', 'Comer', '#4d7c0f', e('green-salad')),
  c('brunch', 'Brunch', 'Comer', '#ca8a04', e('pancakes')),
  c('petisco', 'Botecos e petiscos', 'Comer', '#92400e', e('french-fries')),
  // doces, cafés e padarias
  c('cafe', 'Cafés', 'Cafés e doces', '#a16207', e('hot-beverage')),
  c('bread', 'Padarias', 'Cafés e doces', '#f59e0b', e('croissant')),
  c('cake', 'Doces e sobremesas', 'Cafés e doces', '#ec4899', e('birthday-cake')),
  c('ice', 'Sorvetes', 'Cafés e doces', '#2aa6f5', e('soft-ice-cream')),
  // beber e noite
  c('bar', 'Bares', 'Beber e noite', '#7c3aed', e('cocktail-glass')),
  c('drink', 'Drinks', 'Beber e noite', '#6d28d9', e('cocktail-glass')),
  c('beer', 'Cerveja artesanal', 'Beber e noite', '#b45309', e('beer-mug')),
  c('wine', 'Vinhos', 'Beber e noite', '#881337', e('wine-glass')),
  c('party', 'Festas e música', 'Beber e noite', '#4338ca', e('party-popper')),
  // cultura e passeio
  c('tour', 'Passeios e experiências', 'Cultura e passeio', '#0e9f8e', e('ticket')),
  c('art', 'Arte e museus', 'Cultura e passeio', '#0f766e', e('artist-palette')),
  c('theater', 'Teatro e cinema', 'Cultura e passeio', '#334155', e('clapper-board')),
  c('books', 'Livrarias e bibliotecas', 'Cultura e passeio', '#1e40af', e('books')),
  c('park', 'Parques e praças', 'Cultura e passeio', '#16a34a', e('national-park')),
  c('travel', 'Hospedagem e viagem', 'Cultura e passeio', '#0891b2', e('hotel')),
  c('sport', 'Esportes e bem-estar', 'Cultura e passeio', '#0d9488', e('bicycle')),
  c('pet', 'Pet friendly', 'Cultura e passeio', '#9333ea', e('paw-prints')),
  // compras
  c('shop', 'Compras e moda', 'Compras', '#db2777', e('shopping-bags')),
  c('deco', 'Casa, decoração e plantas', 'Compras', '#65a30d', e('house-with-garden')),
  c('market', 'Feiras e mercados', 'Compras', '#059669', e('tomato')),
]
export const CATEGORY_IDS = CATEGORIES.map((x) => x.id)
// categoria principal e extras de um lugar
export const catsOf = (p) => [p.category, ...(Array.isArray(p.tags) ? p.tags : [])]
