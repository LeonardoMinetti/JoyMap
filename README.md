# JoyMap

**JoyMap** é uma plataforma para quem indica lugares (criadores de conteúdo) transformarem essas indicações num **mapa público, com a sua identidade**, para usar na bio. Quem segue explora o mapa e salva lugares. Restaurantes veem quem os indica.

- **Demonstração (sem servidor, dados fictícios):** https://leonardominetti.github.io/JoyMap/
- **Página de vendas para restaurantes:** https://leonardominetti.github.io/JoyMap/para-restaurantes
- Código: Vite + React (`web/`), servidor Hono + SQLite (`server/`), testes `node --test` (`tests/`).

> **Estado do projeto:** MVP/protótipo funcional. O servidor existe e é testado, mas ainda **não está hospedado**. A demonstração publicada roda só no navegador. Pagamento, conexão oficial com Instagram/TikTok e login com Google estão descritos abaixo como "ainda não reais".

---

## 1. Quem usa: três tipos de conta

| Tipo | Quem é | O que tem | Planos |
|---|---|---|---|
| **Criador** | Quem indica lugares e quer um mapa próprio | Mapa público, painel, Estúdio de estilo, roteiros, métricas | Grátis, Criador, Pro |
| **Explorador** | Quem segue mapas e só quer guardar lugares | Espaço com 3 abas: **Salvos**, **Criadores**, **Conta** (sem painel) | Grátis (único) |
| **Restaurante** | Dono ou responsável por um lugar | Painel próprio: indicações recebidas, percepção de confiança, reivindicar lugar, conta | Ainda sem planos definidos |

Além deles existe o **administrador** (equipe JoyMap), que não aparece como botão em nenhum lugar do site: só entra pelo endereço `/admin` ou ao entrar com o e-mail definido em `ADMIN_EMAIL`.

**Entrada:** `/entrar` pergunta o tipo de conta e leva ao login correspondente. Cada tipo tem *Entrar* e *Criar conta*, por **link no e-mail (sem senha)**. Google e Instagram (criadores) estão prontos na tela e ligam quando o servidor tiver as credenciais. "Quero meu mapa" abre direto a criação de conta de criador.

---

## 2. Dinâmicas (como o produto funciona)

### 2.1 Criador
1. **Pede o mapa** (criar conta): informa @ do Instagram, e-mail, TikTok (opcional) e aceita os Termos.
2. **A equipe analisa**: confere seguidores e se a pessoa é a titular do perfil. Pode aprovar, pôr na lista de espera ou recusar.
3. **Aprovado**, entra pelo link no e-mail e faz o onboarding: conectar contas, escolhas de privacidade e plano.
4. **Monta o mapa** a partir das indicações: cola link e legenda dos posts (ou adiciona lugares). O sistema extrai nome, endereço, categoria e se é publicidade, localiza no mapa e pede revisão do que tem baixa confiança.
5. **Personaliza** no Estúdio de estilo (cores, fonte, cantos, tom do mapa, pins, categorias, símbolos), vendo a prévia ao vivo.
6. **Publica** em `/@slug` e divulga (link na bio, QR, imagens para stories). Acompanha métricas no painel.
7. **Roteiros**: monta trilhas de paradas com texto. Podem ser **vendidos** (com produtos e pré-visualização gratuita) ou **patrocinados** por uma marca.

### 2.2 Explorador
Abre o mapa de um criador, filtra (categoria, bairro, cidade, "abertos agora", perto de mim), vê Novidades, fichas e roteiros e **salva lugares** com o coração. Sem conta, os salvos ficam no aparelho; com conta, ficam no servidor e aparecem em **Meus salvos** de todos os mapas. O criador **não sabe quem salvou**. Há também o recurso "Já fui", que dá XP à abelha do usuário (seção 5).

### 2.3 Restaurante
Cria conta, **reivindica um lugar** (busca nos mapas dos criadores e informa um contato), a equipe confere que a pessoa é responsável e libera o painel. O painel mostra **quais criadores indicaram** o lugar (só os que consentiram em compartilhar dados agregados), quantas indicações têm publicidade declarada e a **percepção de confiança**. Reivindicar dá o direito de corrigir os dados do lugar e ver contagens agregadas, **nunca poder sobre o que os criadores publicam**.

### 2.4 Administração (equipe)
Fila de candidaturas (com critério de seguidores ajustável), revisão de mapas (lugares com baixa confiança), moderação (denúncias, símbolos enviados, reivindicações de restaurantes), **Rede** (mapa geral dos criadores que aceitaram participar) e métricas do negócio. O layout segue o do painel do criador, no desktop e no celular.

---

## 3. Modelo de negócio

> Os preços ainda estão **em validação**. Na página de planos aparecem como "previstos" e **nenhuma cobrança está ativa**: nenhum dado de cartão é pedido nem guardado, e o teste de 30 dias começa sem pagamento.

**Receita prevista**
1. **Assinatura do criador** (Criador e Pro), mensal ou anual.
2. **Comissão sobre roteiros vendidos**: **8%** no plano Criador e **5%** no Pro.
3. **Roteiros patrocinados** (Pro): marcas pagam para aparecer num roteiro, com logo e identificação clara de parceria.
4. **Restaurantes**: página de vendas própria e painel próprio; modelo de planos ainda a definir.

**Planos do criador**

| | **Grátis** | **Criador** | **Pro** |
|---|---|---|---|
| Lugares no mapa | até **20** | ilimitado | ilimitado |
| Aparência | tema **Solar** com cor principal preta (Estúdio bloqueado) | Estúdio completo | Estúdio completo |
| Roteiros | não | sim | sim |
| Vender roteiros e produtos | não | sim, comissão 8% | sim, comissão 5% |
| Roteiro patrocinado | não | não | sim |
| Painel de métricas (buscas, cliques, público) | só visitas totais | completo | completo |
| Categorias próprias | não | não | sim (até 15 no total) |
| Domínio próprio | não | não | sim |
| Remover a marca JoyMap do mapa | não | não | sim |
| Atualização automática e histórico completo | não | sim | sim |

**Explorador** é gratuito. **Restaurante** ainda não tem planos.

---

## 4. Regras de negócio

**Acesso e análise**
- Critério de entrada do criador: mínimo de seguidores (`MIN_FOLLOWERS`, padrão 10.000, ajustável no admin). O número é informado pela equipe, **que também confirma o titular do perfil** antes de aprovar. Aprovar exige critério atendido e titular confirmado.
- O pedido registra o aceite dos Termos e da Política de Privacidade, com data e versão.
- Login sempre por link de uso único, válido por **15 minutos**. A volta pós-login só aceita páginas do próprio site (um mapa ou os salvos).
- O administrador é quem entra com `ADMIN_EMAIL`.

**Planos (aplicados no servidor, não só na tela)**
- Cada ação confere o plano; sem permissão, a API responde 403 `{ error: 'plano', need }` e a tela diz "disponível a partir do plano X". A fonte única é `server/plans.js`.
- Quem passa do limite de lugares (ex.: ao descer de plano) **mantém o que tem, mas não adiciona novos**; no Grátis, para adicionar outro é preciso excluir um.
- No Grátis o tema é forçado (Solar, cor `#171717`).

**Roteiros, produtos e patrocínio** (`server/offers.js`)
- Preço do roteiro: de **R$ 5 a R$ 500**. Sem pagamento ativo, o preço fica oculto e nada é bloqueado.
- Quando vendido, qualquer seguidor vê as **2 primeiras paradas** gratuitamente; o resto fica travado até a compra.
- **Produto** exige título, link (http/https) e **foto** (data URI png/jpeg/webp até 120k caracteres ou foto do próprio mapa). Máximo de 6 produtos.
- **Patrocínio** exige nome da marca e **logo em SVG vazado**, validado (rejeita script, imagem embutida, `foreignObject`, eventos `on*`, links externos e `url()`).
- Texto do roteiro: até 240 caracteres.

**Lugares e mapa**
- Localização pelo OpenStreetMap (Nominatim, 1 req/s), rejeitando município errado. Lugares com baixa confiança ou sem lugar entram na revisão.
- Horários: 7 dias (domingo primeiro), fuso America/Sao_Paulo, com virada de madrugada. "Abertos agora" só considera lugares com horário informado.
- O mapa público é sempre enquadrado em todos os lugares. Publicidade declarada é identificada como "publi".

**Privacidade (LGPD)**
- Métricas agregadas, sem IP e sem identificar pessoas; percentuais só com **amostra mínima de 5 sessões**. "Perto de mim" usa a localização só no aparelho.
- Consentimentos do criador (aparecer na rede, dados agregados para restaurantes, divulgação) são **opcionais e revogáveis**, com histórico. Só hospedar o mapa é obrigatório.
- O criador **não vê quem salvou** um lugar. O explorador só vê os próprios salvos.

**Rede e restaurantes**
- Só entra na Rede (mapa geral) quem consentiu. O restaurante só vê dados agregados de criadores que consentiram.
- A reivindicação é aprovada pela equipe. **Percepção de confiança**: hoje não coletamos comentários, então o estado é "dados insuficientes"; mínimo de 10 comentários analisados para qualquer alerta, e publicidade declarada nunca conta como problema.

**Moderação**
- Denúncias agrupadas por lugar/mapa, com prazo de resposta (premissa interna de 5 dias) e ações: corrigir dado, ocultar lugar, pausar mapa, avisar criador, arquivar.

---

## 5. Gamificação (abelha)

24 abelhas (4 níveis × 6 personalidades). Níveis: **Primeiro voo** (0–99 XP), **Exploradora** (100–299), **Polinizadora** (300–699), **Guardiã** (700+). Hoje só há uma forma de ganhar XP: marcar **"Já fui"** em um lugar (+10 XP, até 10 por dia, declarado pelo usuário). A personalidade é só expressão e não muda o nível.

---

## 6. Demonstração publicada (GitHub Pages)

Roda 100% no navegador, com dados fictícios; o que se altera fica só na aba. O acesso por e-mail na demonstração é restrito ao e-mail do dono. Endereços úteis (base `https://leonardominetti.github.io/JoyMap`):

| Endereço | O que mostra |
|---|---|
| `/`, `/planos`, `/perguntas`, `/exemplos`, `/termos` | Site |
| `/para-restaurantes` | Página de vendas para restaurantes |
| `/@demo` | Mapa público de exemplo (desktop e celular) |
| `/entrar` | Escolha do tipo de conta (e `?como=criador|explorador|restaurante`, `&criar=1`) |
| `/painel-teste-usuario` | Painel do criador |
| `/painel-teste-explorador` | Salvos, Criadores e Conta |
| `/painel-teste-restaurante` | Painel do restaurante |
| `/painel-teste-admin` | Administração |

---

## 7. O que ainda não é real

- **Hospedagem do servidor** e banco em produção (o SQLite precisa de disco persistente ou de um banco gerenciado).
- **Cadastro real por e-mail em produção** (Resend, não testado) e **login com Google** (a tela e o contrato existem; falta a rota `/api/auth/google` e `GOOGLE_CLIENT_ID`).
- **Conexão com Instagram/TikTok**: exige app aprovado pela plataforma; hoje a entrada de posts é manual.
- **Pagamento e cobrança** (planos, comissão de roteiros, patrocínio): não implementados.
- **Planos de restaurante**, avaliações do Google (Perfil de Empresa) e coleta de comentários.
- **Hospedagem de fotos** de lugares e imagem de compartilhamento.
- Base de mapa: tiles gratuitos do OpenFreeMap (dados OpenStreetMap); rever uso/doação antes de tráfego real.

---

## 8. Rodar localmente

```bash
npm install
npm test          # testes do servidor (extração, planos, ofertas, horários, contas, rede)
npm run dev       # build + servidor em http://localhost:4300
bash scripts/build-pages.sh   # gera a versão estática da demonstração em pages-dist/
```

Requer Node ≥ 22.5 (`node:sqlite`). Para ser admin: `ADMIN_EMAIL=seu@email npm run dev` e entre com esse e-mail. Em desenvolvimento o link de acesso aparece na tela, sem enviar e-mail.

Variáveis (ver `.env.example`): `PORT`, `BASE_URL`, `MIN_FOLLOWERS`, `ADMIN_EMAIL`, `RESEND_API_KEY`, `MAIL_FROM`, `DB_PATH`, `GOOGLE_CLIENT_ID`, `META_APP_ID/SECRET`, `TIKTOK_CLIENT_KEY/SECRET`.

## 9. Estrutura

```
server/        API (Hono + node:sqlite): auth, criador, público, viewer, admin, voo
  plans.js     planos e permissões (fonte única)   offers.js  roteiros pagos, produtos e patrocínio
  hours.js     horários                            theme.js   tema e SVG seguros
web/src/
  pages/       Auth (entrar/criar conta), Panel, Studio, Build, Saved (explorador), Admin, Network (rede e restaurante), Site
  pub/         mapa público (MapSheet no celular, Desk no desktop)
  landing/     página inicial e de restaurantes (mockups usam o app real)
  lib/         roteador, painel genérico (RolePanel), sessão e dados da demonstração
tests/         testes do servidor
```

## 10. Identidade

Amarelo `#FFC400`, preto `#171713`, creme e Inter. O logotipo e as abelhas vêm do Figma e ficam em `web/src/brand/` sem alteração. Símbolos do Estúdio: Básicos (próprios), 3D (Fluent Emoji, MIT), Emoji (Noto, Apache-2.0) e Contorno (Lucide, ISC), além de SVGs enviados pelo criador.

## 11. Deploys: nome e categoria

Este repositório (**JoyMap**) é o único do projeto: código, servidor, testes e a demonstração. A demonstração é publicada no GitHub Pages por um workflow (`.github/workflows/deploy.yml`) que, a cada push na `main`, roda os testes, gera a versão estática e publica.

Todo deploy é **nomeado e categorizado**:

```bash
scripts/deploy.sh <categoria> "<nome do deploy>"
# ex.: scripts/deploy.sh login "Escolha do tipo de conta"
```

O commit fica `[categoria] nome`, recebe a tag `deploy/<categoria>/NNN-slug`, entra em [`DEPLOYS.md`](DEPLOYS.md) e aparece com esse nome na aba Actions.

| Categoria | Para quê |
|---|---|
| `site` | Página inicial, planos, perguntas, rodapé |
| `login` | Entrar, criar conta, escolha do tipo de conta |
| `criador` | Painel e Estúdio do criador |
| `explorador` | Espaço do explorador (Salvos, Criadores, Conta) |
| `restaurante` | Painel e página de vendas para restaurantes |
| `admin` | Administração e Rede |
| `mapa` | Mapa público (desktop e celular) |
| `conteudo` | Textos, nomes, imagens |
| `ajuste` | Correções e acabamentos |
| `docs` | README e documentação |
