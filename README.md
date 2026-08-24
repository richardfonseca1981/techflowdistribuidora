# Site Vendas Óleo — Fundações

E-commerce para venda de óleo bruto e lubrificante automotivo. Esta é a **fase 1**:
as fundações do projeto (banco de dados, API, autenticação de admin e painel
administrativo básico). Não há loja pública, carrinho ou checkout ainda —
veja [O que falta para a próxima fase](#o-que-falta-para-a-próxima-fase).

## Stack

- **Backend**: Node.js + Express + TypeScript + Prisma 5.22.0 + PostgreSQL
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Imagens**: Cloudflare R2 (upload via URL assinada, compatível com S3)
- **IA**: Claude Haiku 4.5 (Anthropic API) para interpretar instruções de
  edição de foto sob demanda; execução via Sharp
- **Testes**: Vitest + Supertest (backend)
- **Deploy alvo** (não configurado nesta fase): Railway (backend/DB) + Vercel (frontend)

## Estrutura

```
/backend    Express + Prisma + TypeScript (API REST)
/frontend   Vite + React + TypeScript + Tailwind (painel admin)
```

Monorepo com **npm workspaces** — um único `npm install` na raiz instala as
dependências de ambos os pacotes.

## Pré-requisitos

- Node.js 20+
- PostgreSQL 14+ (local ou via Docker)
- Uma conta Cloudflare R2 (opcional nesta fase — só necessário para testar
  upload de imagens; o resto do sistema funciona sem isso)

## Setup local

### 1. Instalar dependências

```bash
npm install
```

### 2. Subir um PostgreSQL local

Um `docker-compose.yml` na raiz sobe um Postgres dedicado ao projeto na porta
`5434` (escolhida para não colidir com um Postgres que já esteja rodando na
5432):

```bash
docker compose up -d db
```

Se preferir usar um Postgres já instalado na máquina, basta ajustar
`DATABASE_URL` no `.env` do backend de acordo.

### 3. Configurar variáveis de ambiente

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edite `backend/.env`:
- `DATABASE_URL` — já vem apontando para o Postgres do `docker-compose.yml`
  (porta 5434). Ajuste se estiver usando outro Postgres.
- `TEST_DATABASE_URL` — banco separado usado pelos testes de integração
  (veja [Testes](#testes)).
- `JWT_SECRET` — troque por um valor aleatório forte.
- `R2_*` — credenciais do Cloudflare R2 (opcional para rodar localmente sem
  testar upload de imagens; as rotas de upload retornam erro 503 se ausentes).
- `ANTHROPIC_API_KEY` — chave da API da Anthropic, usada só para interpretar
  instruções de edição de foto sob demanda no painel admin (opcional para
  rodar localmente sem testar essa funcionalidade; a rota de edição retorna
  erro 503 se ausente).

### 4. Criar o banco de testes (uma vez)

```bash
docker exec site-vendas-oleo-db psql -U postgres -c "CREATE DATABASE site_vendas_oleo_test;"
```

### 5. Rodar a migration inicial

```bash
npm run prisma:migrate
```

Isso aplica a migration `init` (todas as tabelas: `AdminUser`, `Category`,
`Product`, `ProductImage`) no banco apontado por `DATABASE_URL`.

### 6. Popular dados de exemplo (seed)

```bash
npm run prisma:seed
```

Cria:
- Um admin: `admin@site-vendas-oleo.com` / senha `admin123` (troque em
  produção — pode ser sobrescrito via `SEED_ADMIN_EMAIL` /
  `SEED_ADMIN_PASSWORD`)
- Duas categorias de exemplo (Óleo Bruto, Lubrificante Automotivo), cada uma
  com um `attributeSchema` diferente
- Um produto de exemplo em cada categoria

### 7. Rodar os projetos

Em dois terminais:

```bash
npm run dev:backend    # API em http://localhost:3333
npm run dev:frontend   # painel admin em http://localhost:5173
```

Acesse `http://localhost:5173`, faça login com o admin do seed e explore a
lista/formulário de produtos.

## Testes

```bash
npm run test:backend
```

Os testes de integração rodam contra `TEST_DATABASE_URL` (ou `DATABASE_URL`
se aquele não estiver definido) e limpam as tabelas antes de cada teste —
**nunca aponte `TEST_DATABASE_URL` para um banco com dados reais**. Lembre de
aplicar as migrations nesse banco também:

```bash
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

(ou, de dentro de `backend/`, defina `DATABASE_URL` no shell antes de rodar
`npx prisma migrate deploy`.)

Cobertura atual: criação/listagem/edição/desativação de produtos, login de
admin, e o fluxo de atributos flexíveis (categorias diferentes aceitando
campos técnicos diferentes sem qualquer migration).

## Modelo de dados — produto flexível

O ponto central desta fase: `Product` precisa suportar tipos de óleo muito
diferentes (bruto, lubrificante automotivo, e o que mais surgir) sem exigir
uma migration a cada novo tipo.

- `Product.attributes` (`Json`) guarda os campos técnicos variáveis
  (viscosidade, grau API, origem, densidade etc.) — livre por produto.
- `Category.attributeSchema` (`Json`) é um "esquema leve", não imposto pelo
  banco: `[{"key": "viscosity", "label": "Viscosidade", "type": "text"}, ...]`.
  O admin usa isso só para saber quais campos mostrar/pedir ao cadastrar um
  produto daquela categoria — o backend **não** rejeita atributos fora desse
  esquema, então adicionar um campo novo é só editar a categoria, sem deploy.
- Uma nova categoria de óleo = uma linha em `Category`, não uma migration.
- Estoque é opcional via `trackStock` (boolean) + `stockQty` (nullable) — a
  ausência de controle de estoque é uma escolha explícita, não um dado
  faltando.

## Cloudflare R2 — upload de imagens

O fluxo é por **URL assinada**: o backend nunca recebe o arquivo.

1. Frontend pede uma URL assinada: `POST /api/products/:id/images/presign`
2. Frontend faz `PUT` do arquivo direto para o R2 usando essa URL
3. Frontend confirma o upload: `POST /api/products/:id/images` (cria o
   registro `ProductImage` com a próxima posição disponível)

Para isso funcionar, o bucket R2 precisa de uma política de CORS liberando
`PUT` a partir da origem do frontend (`http://localhost:5173` em dev), e o
bucket precisa de um domínio público (customizado ou `*.r2.dev`) configurado
em `R2_PUBLIC_URL`.

## Tratamento de foto sob demanda (IA)

Nunca automático — só roda quando o admin submete um texto explícito no
`ImageManager` de uma foto já cadastrada (ex: "deixa mais nítida e corta
quadrado").

1. `POST /api/products/:id/images/:imageId/edit` — o texto do admin é
   enviado ao Claude Haiku 4.5 (`ANTHROPIC_API_KEY`) com `tool_choice`
   forçado e uma lista **fechada** de operações (`resize`, `crop`,
   `brightness`, `contrast`, `sharpen`, `rotate`, `compress`,
   `convertFormat`). Se o pedido não for claro, a resposta é
   `{unclear: true, suggestion}` e nada é alterado. Se for claro, o backend
   revalida a resposta via Zod (lista fechada + ranges numéricos — nunca
   confia na IA cegamente), aplica as operações com Sharp e sobe o
   resultado ao R2 como um preview separado (`ProductImageEdit`, status
   `PENDING`) — a imagem em produção não é tocada.
2. `POST .../edit/:editId/confirm` — só agora o preview vira a imagem
   oficial do produto; a versão anterior fica salva em
   `ProductImage.previousUrl`/`previousKey` (undo de 1 nível).
3. `POST .../edit/:editId/discard` — descarta o preview sem alterar a
   imagem atual.
4. `POST .../revert` — alterna entre a versão atual e a anterior (chamar de
   novo desfaz o revert).

Sem `ANTHROPIC_API_KEY` configurada, `POST .../edit` responde 503, no mesmo
padrão do presign do R2 sem credenciais.

## Regras do projeto

- **Nunca** `prisma db push` em produção — sempre `prisma migrate dev` (dev) /
  `prisma migrate deploy` (produção).
- **Nunca** commitar `.env` (só `.env.example`).
- Timestamps sempre em UTC no banco; a conversão para horário de Brasília
  (BRT) é responsabilidade do frontend na exibição — ainda não implementada
  nesta fase (ver abaixo).
- Prisma sempre na versão `5.22.0`.

## O que foi construído nesta fase

- Monorepo (`npm workspaces`) com backend e frontend
- Schema Prisma com `Product`, `Category`, `ProductImage`, `AdminUser` —
  modelo de atributos flexível via JSON, sem necessidade de migration por
  tipo de óleo
- Autenticação de admin via JWT (`POST /api/auth/login`)
- CRUD de produtos: criar, listar (com filtro por categoria e status),
  buscar por id, editar, desativar/reativar
- CRUD leve de categorias (criar, listar, editar `attributeSchema`)
- Upload de imagens via URL assinada do R2, com reordenação (`position`) e
  exclusão
- Tratamento de foto sob demanda via IA: instrução em texto → Claude Haiku
  4.5 decide operações de uma lista fechada → backend revalida → Sharp
  aplica → preview → confirmação explícita; undo de 1 nível (ver seção
  abaixo)
- Painel admin (React): login, lista de produtos, formulário de
  criação/edição com campos dinâmicos por categoria, upload/reordenação de
  fotos, edição de foto assistida por IA
- Testes de integração (Vitest + Supertest) cobrindo produtos, auth e o
  fluxo de atributos flexíveis
- `docker-compose.yml` para subir um Postgres local dedicado ao projeto

## O que falta para a próxima fase

- Vitrine pública (loja) — listagem e página de produto voltadas ao cliente
  final
- Carrinho de compras
- Checkout e integração com gateway de pagamento
- Cálculo de frete
- Emissão de nota fiscal (NF-e)
- Cadastro e login de cliente final (hoje só existe login de admin)
- Exibição de timestamps em horário de Brasília no frontend (hoje a API
  retorna UTC cru; a conversão para BRT na exibição fica para quando houver
  telas voltadas ao cliente final)
- Deploy real em Railway (backend/DB) e Vercel (frontend) — infraestrutura
  ainda não configurada, só prevista no design

## Problemas conhecidos

- `npm audit` aponta uma vulnerabilidade moderada em `react-router-dom`
  (open redirect, CVE recente) sem correção disponível ainda dentro da faixa
  `^6.x` usada aqui. Não afeta o painel admin (uso interno, sem redirects
  vindos de input de usuário), mas vale revisar ao atualizar dependências.
