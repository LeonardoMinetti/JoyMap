# MAPA SP — MVP

Plataforma para criadores montarem um mapa dos lugares que indicam, com **personalização visual alta**, para usar na bio.
Implementa o protótipo de telas (68 telas) no que é possível construir hoje, sem credenciais de plataformas.

## O que funciona (testado)
- Acesso por **link mágico** (sem senha, uso único, 15 min). Em dev o link aparece na tela; em produção sai por e-mail (Resend, **não testado**).
- **Candidatura** com critério de seguidores: abaixo do mínimo → lista de espera; atende → fila de aprovação no admin.
- **Criar mapa a partir de posts**: o criador cola link + legenda; o sistema extrai lugar, endereço, categoria e marca de publi (regras portadas da PoC), localiza no OpenStreetMap (Nominatim, 1 req/s, rejeita município errado) e o criador **revisa** (confirmar, corrigir, remover, marcar publi).
- **Estúdio de estilo** com prévia ao vivo: cor, fundo/texto, fonte, cantos, estilo de mapa (claro, escuro, papel, menta, maré), formato do pin, categorias com **nome, cor e símbolo**, bio, links.
- **Página pública** `/@slug`: filtros por categoria, busca, ficha do lugar, rota, vídeo oficial (player TikTok) e post, compartilhar com QR, denúncia.
- **Analytics próprio** (sessões, buscas incl. sem resultado, lugares abertos, rotas), agregado, termos higienizados.
- **Consentimentos em camadas** (rede e restaurantes desligados por padrão), admin de candidaturas e denúncias.

## O que NÃO está feito (depende de credenciais, contrato ou decisão)
- Importar posts por **API do Instagram/TikTok** (exige app aprovado pela plataforma; hoje o criador cola os posts).
- **Pagamento** (plano e cobrança são só tela no protótipo).
- E-mail em produção, domínio próprio, envio de SVG próprio, fotos de lugares, mapa geral em rede, painel de restaurantes.
- Tons de mapa Menta/Maré são sutis (a base cinza da Esri tem pouco contraste) e a base gratuita da Esri precisa de contrato antes de tráfego real.
- Nome sugerido do lugar vem do @ ("Pizzariamammaconcetta"); o criador corrige na revisão.

## Rodar
```bash
npm install
npm test            # 7 testes (extração, geocodificação, fluxo completo da API)
npm run dev         # build + servidor em http://localhost:4300
```
Entre com qualquer e-mail; para virar admin use `ADMIN_EMAIL=seu@email npm run dev`. Requer Node ≥ 22.5 (usa `node:sqlite`).
