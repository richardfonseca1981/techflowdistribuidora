# Contexto do Projeto — Loja de Óleo Automotivo/Lubrificante

> Este arquivo documenta o contexto de **negócio** e as **decisões técnicas** que não
> são óbvias só de ler o código. Objetivo: qualquer pessoa (inclusive uma versão
> futura de quem já trabalhou nisso) consegue retomar o projeto sem depender de
> memória ou de conversas antigas. Atualize sempre que uma decisão relevante de
> negócio ou arquitetura for tomada — não deixe isso desatualizar.

## Sobre o cliente

- Empresa do interior de São Paulo, cliente terceiro — não é projeto próprio do
  desenvolvedor, é um trabalho contratado.
- Situação financeira delicada. O orçamento apertado influencia diretamente
  decisões de escopo, prazo e preço — quando em dúvida entre uma solução mais
  robusta/cara e uma mais simples/barata, o histórico é priorizar a simples,
  desde que não comprometa a operação básica da loja.
- Vende óleo automotivo/lubrificante e também óleo bruto. O mix exato de
  produtos ainda não está totalmente fechado do lado do cliente — por isso o
  cadastro de produto foi desenhado para ser flexível (ver
  [Modelo de dados — produto flexível](#modelo-de-dados--produto-flexível)) em
  vez de assumir campos fixos por tipo de óleo.
- Este projeto **não** faz parte do ecossistema FluxioApp — é avulso e
  independente dos outros produtos do desenvolvedor.

## Modelo comercial acordado

- Pagamento único à vista: **R$ 2.000** pelo projeto completo (fases 1 e 2
  combinadas, conforme escopo descrito abaixo).
- Não foi fechado, até o momento em que este arquivo foi escrito
  (2026-08-08), nenhum modelo híbrido com entrada + mensalidade de
  manutenção. Se isso mudar, atualizar esta seção com os valores acordados.
- Preço deliberadamente abaixo da faixa de mercado — um escopo equivalente
  ficaria tipicamente em **R$ 7.000–20.000+**. A decisão de cobrar menos leva
  em conta a situação financeira do cliente e o fato de que o Claude Code
  viabiliza uma velocidade de desenvolvimento que reduz o custo real de
  entregar esse escopo.

## Stack técnica

- **Backend**: Node.js + Express + TypeScript + Prisma **5.22.0** (pinado,
  não usar `^`) + PostgreSQL.
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + React Router.
- **Monorepo**: npm workspaces (`backend` + `frontend`, um único `npm
  install` na raiz).
- **Imagens**: Cloudflare R2, upload via URL assinada (S3-compatible, SDK
  `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`). Escolhido em vez de
  Cloudinary deliberadamente por causa de custo de banda/egress — R2 não
  cobra egress, o que importa dado o orçamento do cliente.
- **Auth**: JWT (`jsonwebtoken` + `bcryptjs`), sem sessão de cliente final
  ainda — só login de admin.
- **Testes**: Vitest + Supertest no backend, rodando contra um banco de
  testes separado (`TEST_DATABASE_URL`).
- **Deploy alvo** (ainda não configurado): Railway (backend + Postgres) +
  Vercel (frontend).

## Decisões de arquitetura importantes

- **Modelo de `Product` flexível**: em vez de colunas fixas por tipo de óleo,
  o produto tem um campo `attributes` (`Json`, default `{}`) para os campos
  técnicos variáveis (viscosidade, grau API, origem, densidade etc.), e a
  `Category` tem um `attributeSchema` (`Json`, default `[]`) que descreve
  quais campos são esperados para produtos daquela categoria — algo como
  `[{"key": "viscosity", "label": "Viscosidade", "type": "text"}, ...]`.
  Esse schema é **leve e não imposto pelo banco**: o backend não rejeita
  atributos fora dele. Serve só para o admin saber quais campos
  mostrar/pedir ao cadastrar um produto. Consequência prática: uma categoria
  nova de óleo é uma linha em `Category`, não uma migration.
- **Estoque opcional**: `Product.trackStock` (boolean, default `false`) +
  `stockQty` (`Int?`, nulo quando `trackStock` é falso). A ausência de
  controle de estoque é uma escolha explícita do modelo, não um dado
  faltando — o cliente pode não querer controlar estoque para todos os
  produtos.
- **`ProductImage.key`**: guarda a chave do objeto no bucket R2 (além da
  `url` pública), necessário para permitir excluir a imagem do bucket depois
  — sem isso não daria pra apagar o objeto, só o registro no banco.
- **Upload de imagem via URL assinada**: o backend nunca recebe o arquivo em
  si. Fluxo: `POST /api/products/:id/images/presign` → frontend faz `PUT`
  direto pro R2 → `POST /api/products/:id/images` confirma e cria o registro
  `ProductImage` com a próxima `position` disponível. Exige CORS liberado no
  bucket para a origem do frontend e um domínio público (`R2_PUBLIC_URL`)
  configurado.
- **Painel admin sem link público**: não há menu/link visível no site
  apontando pro painel — a única proteção de acesso, porém, é a
  autenticação JWT nas rotas de API e no frontend (`ProtectedRoute.tsx` +
  middleware `auth.ts`). "Invisível" não significa "inacessível por URL
  direta"; a segurança real vem do JWT, não da obscuridade da rota.
- **IDs**: `cuid()` em todas as tabelas.

## Tratamento de foto (sob demanda, nunca automático) — implementado

O admin escreve em texto o que quer fazer com uma foto já cadastrada (ex:
"deixa mais nítida e corta quadrado") no `ImageManager` do painel. Nada roda
automaticamente — só quando esse texto é submetido explicitamente.

- **Modelo**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) via
  `@anthropic-ai/sdk` (`backend/src/lib/anthropic.ts`). Suficiente para
  classificação + extração de parâmetros dentro de uma lista fechada — não
  exige modelo mais caro, mantém custo por chamada em frações de centavo.
- O texto do admin **nunca é executado diretamente**. É enviado ao Claude com
  `tool_choice` forçado (garante resposta estruturada, nunca texto livre),
  que responde escolhendo entre uma lista **fechada** de operações: `resize`,
  `crop`, `brightness`, `contrast`, `sharpen`, `rotate`, `compress`,
  `convertFormat`. Se o pedido não mapear claramente para essas operações, o
  modelo responde `unclear: true` + uma sugestão de reformulação — nunca
  inventa algo fora da lista.
- O backend **revalida a resposta da IA de novo** antes de executar qualquer
  coisa, via Zod (`backend/src/schemas/imageEdit.schema.ts`,
  `interpretResultSchema`): tipo de operação precisa estar na lista fechada,
  valores numéricos dentro dos ranges (brightness/contrast -100..100,
  sharpen leve/médio/forte, rotate 90/180/270, compress 1..100, resize/crop
  8..6000px por dimensão). Qualquer coisa fora disso é rejeitada por
  inteiro (400), sem execução parcial.
- Execução real via **Sharp** (`backend/src/lib/imageProcessor.ts`,
  `applyOperations`), numa ordem canônica fixa (rotate → crop → resize →
  brightness/contrast → sharpen → format/quality), independente da ordem
  devolvida pela IA — determinístico.
- **Preview antes de salvar**: o resultado processado é enviado ao R2 como
  um objeto separado (`ProductImageEdit`, status `PENDING`) e só substitui a
  imagem em produção quando o admin confirma explicitamente
  (`POST .../edit/:editId/confirm`). Descartar (`.../discard`) apaga o
  preview sem tocar na imagem atual.
- **Desfazer**: undo de **1 nível** — `ProductImage.previousUrl`/
  `previousKey` guardam a versão anterior à última confirmação;
  `POST .../revert` alterna entre a atual e a anterior (chamar de novo
  desfaz o revert). Não é um histórico completo de versões — decisão
  deliberada para não superdimensionar o escopo dado o orçamento do cliente.
- Rotas: `POST /api/products/:id/images/:imageId/edit`,
  `.../edit/:editId/confirm`, `.../edit/:editId/discard`,
  `.../revert` (todas em `backend/src/routes/upload.routes.ts`).
- Sem `ANTHROPIC_API_KEY` configurada, a rota `.../edit` responde 503 (mesmo
  padrão de degradação graciosa usado no upload do R2 sem credenciais).
- **Fora de escopo** para este projeto: remoção de fundo e
  upscaling/geração de detalhe via IA generativa — essas funcionalidades
  existem no projeto irmão de pedras preciosas, não aqui.

## Custo de infraestrutura estimado

- **Cloudflare R2**: ~R$ 0/mês esperado — catálogo estimado bem abaixo dos
  10 GB grátis, e sem custo de banda/egress (essa é a razão de ter escolhido
  R2 em vez de Cloudinary).
- **Tratamento de imagem**: ~R$ 0/mês — processamento local via Sharp, sem
  API paga envolvida na execução (só a interpretação do texto do admin passa
  pela API da Anthropic via Claude Haiku 4.5, que tem custo marginal por
  chamada — frações de centavo — não por imagem processada).
- **Railway + Vercel**: dentro da faixa padrão já usada em outros projetos
  do desenvolvedor; ainda não configurado nesta fase.

## Fases do projeto

- **Fase 1 (concluída)**: fundações — monorepo, schema Prisma
  (`AdminUser`, `Category`, `Product`, `ProductImage`), CRUD de produtos e
  categorias, autenticação de admin via JWT, painel admin básico (login,
  lista, formulário com campos dinâmicos por categoria, upload/reordenação
  de fotos via R2), tratamento de foto sob demanda via IA (ver seção
  acima), testes de integração (Vitest + Supertest), `docker-compose.yml`
  para Postgres local.
- **Fase 2 (planejada, não iniciada)**: vitrine pública (listagem e página
  de produto para cliente final), carrinho de compras, checkout +
  integração com gateway de pagamento, cálculo de frete, emissão de NF-e,
  cadastro/login de cliente final, exibição de timestamps em BRT nas telas
  voltadas ao cliente, deploy real em Railway + Vercel.

Este projeto reaproveita padrões técnicos de outros sistemas do
desenvolvedor (Pedro Games, FluxioRota, FluxioDesk):

- Prisma sempre pinado numa versão exata (`5.22.0`), nunca `^`.
- Nunca `prisma db push` em produção — sempre `migrate dev` (dev) /
  `migrate deploy` (produção).
- Nunca commitar `.env` (só `.env.example`).
- Timestamps sempre em UTC no banco; conversão para horário de Brasília
  (BRT) é responsabilidade do frontend na exibição — ainda não implementada,
  fica para quando existirem telas voltadas ao cliente final (fase 2).

## Problemas conhecidos

- `npm audit` aponta uma vulnerabilidade moderada em `react-router-dom`
  (open redirect) sem correção disponível ainda dentro da faixa `^6.x`
  usada aqui. Não afeta o painel admin (uso interno, sem redirects vindos
  de input de usuário), mas vale revisar ao atualizar dependências.

## Credenciais de desenvolvimento (seed)

- Admin: `admin@site-vendas-oleo.com` / senha `admin123` (sobrescrevível via
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). **Trocar em produção.**
- Duas categorias de exemplo (Óleo Bruto, Lubrificante Automotivo), cada
  uma com `attributeSchema` diferente, e um produto de exemplo em cada.

Detalhes de setup local (Docker, variáveis de ambiente, comandos de
migration/seed/teste) estão no [README.md](./README.md) — este arquivo foca
no *porquê*, não no *como rodar*.
