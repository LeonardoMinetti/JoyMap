# wagli — MVP

Plataforma para criadores montarem um mapa dos lugares que indicam, com **personalização visual alta**, para usar na bio.
O front implementa as **68 telas do protótipo** (fluxos e UI), ligadas a um backend real. Onde uma tela depende de credencial,
contrato ou dado que ainda não existe, ela aparece igual ao protótipo, mas **diz a verdade** (veja "O que ainda não é real").

## Mapa de telas → rotas

| Grupo | Telas | Rotas |
|---|---|---|
| A · Site | A1 Início, A2 Planos, A3 Exemplos, A4 Termos, A5 FAQ, A6 Indisponível | `/`, `/planos`, `/exemplos`, `/termos`, `/perguntas`, `/indisponivel` |
| B · Entrada | B1 Candidatura, B2 Aprovado, B3 Espera, B4 Entrar, B5 Link enviado, B6 Instagram, B7 TikTok, B8 Consentimentos, B9 Plano, B10 Pagamento, B11 Boas-vindas | `/candidatura`, `/candidatura/{enviada,status,aprovado}`, `/entrar`, `/conectar/{instagram,tiktok}`, `/consentimentos`, `/plano`, `/pagamento`, `/boas-vindas` |
| C · Montagem | C1 Montando, C2 Prévia, C3 Revisar, C4 Editar, C5 Adicionar, C6 Sem lugar, C7 Unidades, C8 Publicar, C9 Publicado (+ `colar-posts`) | `/montando`, `/previa`, `/revisar`, `/revisar/:id`, `/adicionar`, `/sem-lugar`, `/unidades`, `/publicar`, `/publicado`, `/colar-posts` |
| D · Estúdio | D1–D10 | `/estudio`, `/estudio/{modelos,cores,categorias,simbolos,mapa,pins,layout,links,endereco}` |
| E · Mapa público | E1–E12 (celular e computador) | `/@slug`, `/@slug/{mapa,lista,lugar/:id,roteiros,salvos,incorporar}`; filtros, vídeo, compartilhar e denúncia são painéis |
| F · Painel | F1–F11 | `/painel`, `/painel/{buscas,lugares,audiencia,atualizar,divulgar,listas,contas,privacidade,plano,conta}` |
| G/H · Rede e restaurantes | G1–G2, H1–H3 | `/rede`, `/rede/lugar`, `/restaurantes`, `/restaurante`, `/restaurante/percepcao` |
| I · Admin | I1–I4 | `/admin`, `/admin/{mapas,moderacao,metricas}` |

## O que funciona (testado)
- **Fluxo completo**: candidatura pública → análise (admin informa seguidores e confirma o titular) → aprovação → login por link mágico → onboarding → montagem → revisão → publicação.
- **Montagem a partir de posts**: o criador cola link + legenda; extração por regras (lugar, endereço, categoria, publi), localização no OpenStreetMap (Nominatim, 1 req/s, rejeita município errado), busca de lugar por nome, mesclar duplicatas, unidades de rede, posts sem lugar. Progresso de C1 é calculado dos dados reais.
- **Estúdio** com prévia ao vivo (é a própria página pública num celular): cores, fonte, cantos, contraste (WCAG), tom do mapa, rótulos, ponto inicial, formato/tamanho/borda do pin, agrupamento, pin selecionado, categorias com símbolo e cor, **envio de SVG próprio** (só `path`, até 50 KB, revisado pela equipe), layout por blocos (arrastar/ligar), capa, roteiros, links, modelos, endereço, **domínio próprio com verificação de CNAME**, QR em PNG/SVG.
- **Mapa público**: filtros, busca, "perto de mim" (localização só no aparelho), salvos (no aparelho), roteiros, ficha, vídeo (player oficial TikTok), compartilhar, denúncia, mapa incorporável, versão de computador.
- **Painel**: métricas agregadas (amostra mínima de 5 sessões para percentuais), buscas sem resultado como oportunidade, pedidos de indicação, imagens para stories em PNG (geradas no navegador), consentimentos com histórico, exportação JSON/CSV, pausar e excluir conta.
- **Rede e restaurantes**: só entra quem consentiu; reivindicação aprovada pela equipe; painel com contagens agregadas.
- **Admin**: fila de candidaturas (critério ajustável), revisão de mapas, moderação com ações (ocultar lugar, pausar mapa, avisar criador), revisão de símbolos e reivindicações, métricas do funil.

## O que ainda não é real (a tela existe, a função depende de algo externo)
- **Conectar Instagram/TikTok**: exige app aprovado pela plataforma. Os botões tentam conectar e, sem credenciais, avisam e deixam seguir; a entrada de posts é manual (colar).
- **Pagamento**: nenhum dado de cartão é pedido nem guardado; o teste de 30 dias começa sem cobrança. Preços aparecem como `[preço]`.
- **Percepção de confiança (H3)**: não coletamos comentários, então o estado é "dados insuficientes".
- **Cidades da audiência (F4)**: exigiria localizar por IP, que não guardamos.
- **E-mail em produção** (Resend, não testado), **login com Instagram**, **verificação por Google Business**, **imagem de compartilhamento** (só título/descrição), **fotos de lugares** (espaço reservado), **salvos sincronizados**.
- Base de mapa: tiles vetoriais gratuitos do OpenFreeMap (dados OpenStreetMap) usando os estilos nativos Positron, Bright, Liberty, Fiord e Dark, sem chave. O OpenFreeMap deve ter uso/doação revisados antes de tráfego real; textos legais são placeholders para revisão jurídica.

## Rodar
```bash
npm install
npm test            # 10 testes (extração, geocodificação, tema/SVG, fluxo completo, rede/restaurantes, símbolos/domínio)
npm run dev         # build + servidor em http://localhost:4300
```
Para ser admin: `ADMIN_EMAIL=seu@email npm run dev` e entre com esse e-mail (menu lateral → Administração, ou `/admin`).
Variáveis: `MIN_FOLLOWERS`, `BASE_URL`, `RESEND_API_KEY`, `MAIL_FROM`, `DB_PATH`, `META_APP_ID/SECRET`, `TIKTOK_CLIENT_KEY/SECRET` (ver `.env.example`). Requer Node ≥ 22.5 (`node:sqlite`).
Bancos criados antes desta versão são migrados sozinhos (colunas novas); criadores já aprovados são marcados como "onboarding concluído".

## Bibliotecas de símbolos

Estúdio > Símbolos oferece quatro estilos: Básicos (próprios), 3D (Fluent Emoji, MIT), Emoji (Noto, Apache-2.0) e Contorno (Lucide, ISC), além dos SVGs enviados pelo criador. O id do símbolo é `lib:<estilo>:<nome>`. Os subconjuntos curados (cerca de 125 emojis e 73 ícones de contorno) ficam em `web/src/iconlib/*.json`, carregados sob demanda, e são gerados por `node scripts/build-iconlib.mjs` a partir dos pacotes `@iconify-json/*` (devDependencies). Para incluir um ícone, adicione-o em `web/src/iconcat.js` e rode o script. Avisos de licença: `web/public/licencas-simbolos.txt`.

## Identidade wagli e gamificação

- Marca: amarelo `#FFC400`, creme `#FDF1E3`, preto `#171713`, Inter. O logotipo e as 24 abelhas (4 níveis × 6 personalidades) vêm do Figma e ficam em `web/src/brand/` sem alteração (só foram removidos os fundos do export). O logotipo é preto: use sobre amarelo ou creme.
- Níveis em `web/src/levels.js` (compartilhado com o servidor): Primeiro voo 0–99 XP, Exploradora 100–299, Polinizadora 300–699, Guardiã 700+.
- Hoje só existe uma forma de ganhar XP: "Já fui" em um lugar do mapa (+10 XP, até 10 por dia, marcação declarada pelo usuário). As missões e contribuições validadas da proposta ainda não foram implementadas. API em `server/routes/voo.js`; tela em `/voo`.

## Landing (evolução estratégica)

A home (`web/src/pages/Site.jsx`) compõe as seções de `web/src/landing/`: `hero` (Content to Map), `story` (problema e feed × mapa), `flow` (como funciona e Da bio à mesa), `showcase` (galeria de identidades e personalização), `insights`, `trust` (confiança, monetização, planos, FAQ e CTA final). `motion.jsx` centraliza a lógica de movimento (cena visível, `prefers-reduced-motion`, pausa global) e `landing.css` as durações/curvas (`--t-fast`, `--t-base`, `--t-slow`, `--ease`).

- `/@demo` é um mapa público de demonstração (dados fictícios de `web/src/demoData.js`), aberto sem cadastro e sem gerar métricas.
- Dados do Insights e das vitrines são ilustrativos e estão identificados como tal na página. O mapa geral (`/rede`) saiu da landing e fica no rodapé.

### Mockups realistas da landing

Os mockups usam o próprio app: `landing/pubpreview.jsx` renderiza o `Home` público real (e o `NoResult`) com dados de `demoData.js`, na escala do celular (`landing/device.jsx`), e `landing/social.jsx` traz perfis, posts e reels genéricos (sem marcas). As 42 fotos de comida ficam em `web/public/photos` (Wikimedia Commons, licenças abertas; créditos em `/creditos-fotos.txt`).

O ponto inicial do mapa deixou de ser configurável: o servidor sempre enquadra todos os lugares (`start: 'all'`). Os modelos prontos agora são Solar, Noite, Maré, Doce e Mono.

### Mapa individual no celular (padrão Viver SP)

`web/src/pub/MapSheet.jsx`: o mapa ocupa a tela toda, com barra do criador no topo, chips flutuantes (ao meu redor e categorias), folha inferior arrastável (peek, meia e cheia) com a lista, cartão flutuante ao tocar em um pin (os demais pins esmaecem) e abas Início, Bairros, Categorias, Roteiros e Perfil (como no Viver SP: Bairros, Categorias e Roteiros abrem painéis que sobem da base e filtram o mapa e a lista; Perfil traz bio, links, compartilhar e salvos; o link `/@slug?p=bairros|categorias|roteiros|perfil` abre direto o painel). No computador continua a lista ao lado do mapa. A mesma tela aparece na prévia do Estúdio e nos mockups da landing.

A landing foi enxugada (sem as seções Problema, Da bio à mesa e Personalização) e as perguntas frequentes ficam em `/perguntas`.

