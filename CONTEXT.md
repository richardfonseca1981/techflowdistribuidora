# Contexto do Projeto — TechFlow Distribuidora (site de óleo automotivo/lubrificante)

> Este arquivo documenta o contexto de **negócio** e as **decisões técnicas** que não
> são óbvias só de ler o código. Objetivo: qualquer pessoa (inclusive uma versão
> futura de quem já trabalhou nisso) consegue retomar o projeto sem depender de
> memória ou de conversas antigas. Atualize sempre que uma decisão relevante de
> negócio ou arquitetura for tomada — não deixe isso desatualizar.

## Sobre o cliente

- Empresa do interior de São Paulo, cliente terceiro — não é projeto próprio do
  desenvolvedor, é um trabalho contratado.
- Mesmo cliente do sistema FluxioDesk (LZCL) e do projeto irmão "Cinzel e a
  Gema" (pedras preciosas) — projetos **distintos**, com repositórios
  separados. Este projeto (TechFlow) **não** faz parte do ecossistema
  FluxioApp — é avulso e independente dos outros produtos do desenvolvedor.
- Situação financeira delicada. O orçamento apertado influencia diretamente
  decisões de escopo, prazo e preço — quando em dúvida entre uma solução mais
  robusta/cara e uma mais simples/barata, o histórico é priorizar a simples,
  desde que não comprometa a operação básica da loja.
- Vende óleo automotivo/lubrificante e também óleo bruto. O mix exato de
  produtos ainda não está totalmente fechado do lado do cliente — por isso o
  cadastro de produto foi desenhado para ser flexível (ver
  [Decisões de arquitetura](#decisões-de-arquitetura)) em vez de assumir
  campos fixos por tipo de óleo.
- Marca definitiva: **TechFlow Distribuidora**.
- Domínio: **techflowdistribuidora.com.br** (no ar, Vercel + Registro.br).
- Repositório: https://github.com/richardfonseca1981/techflowdistribuidora
- WhatsApp de contato: **(14) 98809-5356** — mesmo número usado no FluxioDesk
  (`VITE_WHATSAPP_NUMBER=5514988095356` no `.env` do frontend).

## Modelo comercial

- Pagamento único à vista: **R$ 2.000** pelo projeto completo (fases 1 e 2
  combinadas, conforme escopo descrito abaixo).
- Preço deliberadamente abaixo da faixa de mercado — um escopo equivalente
  ficaria tipicamente em **R$ 7.000–20.000+**. A decisão de cobrar menos leva
  em conta a situação financeira do cliente e o fato de que o Claude Code
  viabiliza uma velocidade de desenvolvimento que reduz o custo real de
  entregar esse escopo.
- Não há, até o momento em que este arquivo foi escrito (2026-09-21), nenhum
  modelo híbrido com entrada + mensalidade de manutenção. Se isso mudar,
  atualizar esta seção com os valores acordados.

## Stack técnica

- **Backend**: Node.js + Express + TypeScript + Prisma **5.22.0** (pinado
  exato, sem `^`, confirmado em `backend/package.json`) + PostgreSQL.
- **Frontend**: React **18.3.1** + Vite + TypeScript + Tailwind CSS
  **3.4.13** (config padrão via `tailwind.config.js` — **não** é Tailwind v4
  nem usa valores de tema centralizados; cores de marca são aplicadas como
  valores arbitrários hardcoded, ex: `bg-[#1B3A6B]`) + React Router.
- **Monorepo**: npm workspaces (`backend` + `frontend`, um único `npm
  install` na raiz).
- **Imagens**: Cloudflare R2, upload via URL assinada (S3-compatible, SDK
  `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`). Escolhido em vez
  de Cloudinary deliberadamente por causa de custo de banda/egress — R2 não
  cobra egress, o que importa dado o orçamento do cliente.
- **Auth**: JWT (`jsonwebtoken` + `bcryptjs`), sem sessão de cliente final
  ainda — só login de admin.
- **Testes**: Vitest + Supertest no backend, rodando contra um banco de
  testes separado (`TEST_DATABASE_URL`). 21 testes de integração passando
  (9 específicos de tratamento de imagem via IA, ver seção abaixo).
- **Deploy**: **Vercel (frontend)** já em produção, servindo a landing
  estática no domínio definitivo. **Railway (backend + Postgres)** ainda
  **não** está em produção — a landing atual não depende disso, pois é
  100% estática e não faz nenhuma chamada de API (ver
  [Identidade visual e landing](#identidade-visual-e-landing)).

## Decisões de arquitetura

- **Modelo de `Product` flexível**: em vez de colunas fixas por tipo de óleo,
  o produto tem um campo `attributes` (`Json`, default `{}`) para os campos
  técnicos variáveis (viscosidade, grau API, origem, densidade etc.), e a
  `Category` tem um `attributeSchema` (`Json`, default `[]`) que descreve
  quais campos são esperados para produtos daquela categoria — algo como
  `[{"key": "viscosity", "label": "Viscosidade", "type": "text"}, ...]`.
  Esse schema é **leve e não imposto pelo banco**: o backend não rejeita
  atributos fora dele. Consequência prática: uma categoria nova de óleo é
  uma linha em `Category`, não uma migration.
- **Estoque opcional**: `Product.trackStock` (boolean, default `false`) +
  `stockQty` (`Int?`, nulo quando `trackStock` é falso). A ausência de
  controle de estoque é uma escolha explícita do modelo, não um dado
  faltando.
- **`ProductImage.key`**: guarda a chave do objeto no bucket R2 (além da
  `url` pública), necessário para permitir excluir a imagem do bucket depois.
- **Upload de imagem via URL assinada**: o backend nunca recebe o arquivo em
  si. Fluxo: `POST /api/products/:id/images/presign` → frontend faz `PUT`
  direto pro R2 → `POST /api/products/:id/images` confirma e cria o registro
  `ProductImage`. Exige CORS liberado no bucket e um domínio público
  (`R2_PUBLIC_URL`) configurado.
- **Painel admin sem link público**: não há menu/link visível no site
  apontando pro painel — a única proteção de acesso é a autenticação JWT nas
  rotas de API e no frontend (`ProtectedRoute.tsx` + middleware `auth.ts`).
  "Invisível" não significa "inacessível por URL direta"; a segurança real
  vem do JWT, não da obscuridade da rota.
- **IDs**: `cuid()` em todas as tabelas.

## Checkout — sem pagamento no site

- Decisão de escopo confirmada: o site **não** terá checkout/pagamento
  próprio. Ao finalizar um pedido, o cliente final deve ser encaminhado para
  o setor de Vendas do **FluxioDesk** (via WhatsApp).
- Decisão técnica futura: integração direta via API (o backend do site
  chamaria um endpoint do FluxioDesk para criar um ticket já atribuído a
  Vendas), mas isso só deve ser implementado depois que o FluxioDesk sair do
  modo mock (está aguardando credenciais de um serviço de terceiro — Chakra).
- Dentro do FluxioDesk, o atendimento deve ficar **separado por marca** (um
  chat/setor próprio para TechFlow e outro para Cinzel e a Gema), mas
  atendido pelos mesmos agentes humanos.
- Enquanto essa integração não existe, o site usa apenas link direto
  `wa.me` (botão flutuante + itens de navegação), sem passar por nenhum
  backend — condizente com a decisão de landing 100% estática.

## Tratamento de foto sob demanda (implementado)

O admin escreve em texto o que quer fazer com uma foto já cadastrada (ex:
"deixa mais nítida e corta quadrado") no `ImageManager` do painel. Nada roda
automaticamente — só quando esse texto é submetido explicitamente.

- **Modelo**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) via
  `@anthropic-ai/sdk` (`backend/src/lib/anthropic.ts`).
- O texto do admin **nunca é executado diretamente**. É enviado ao Claude com
  `tool_choice` forçado (tool use/function calling, garante resposta
  estruturada em JSON, nunca texto livre), que responde escolhendo entre uma
  lista **fechada** de operações: `resize`, `crop`, `brightness`, `contrast`,
  `sharpen`, `rotate`, `compress`, `convertFormat`. Se o pedido não mapear
  claramente para essas operações, o modelo responde `unclear: true` + uma
  sugestão de reformulação — nunca inventa algo fora da lista.
- O backend **revalida a resposta da IA de novo** antes de executar qualquer
  coisa, via Zod (`backend/src/schemas/imageEdit.schema.ts`,
  `interpretResultSchema`). Qualquer coisa fora dos ranges validados é
  rejeitada por inteiro (400), sem execução parcial.
- Execução real via **Sharp** (`backend/src/lib/imageProcessor.ts`,
  `applyOperations`), numa ordem canônica fixa (rotate → crop → resize →
  brightness/contrast → sharpen → format/quality), independente da ordem
  devolvida pela IA — determinístico.
- **Preview antes de salvar**: o resultado processado vai para o R2 como um
  objeto separado (`ProductImageEdit`, status `PENDING`/`CONFIRMED`/
  `DISCARDED`) e só substitui a imagem em produção quando o admin confirma
  explicitamente (`POST .../edit/:editId/confirm`).
- **Desfazer**: undo de **1 nível** — `ProductImage.previousUrl`/
  `previousKey` guardam a versão anterior à última confirmação;
  `POST .../revert` alterna entre a atual e a anterior. Não é um histórico
  completo de versões — decisão deliberada para não superdimensionar o
  escopo dado o orçamento do cliente.
- Sem `ANTHROPIC_API_KEY` configurada, a rota `.../edit` responde 503 (mesmo
  padrão de degradação graciosa usado no upload do R2 sem credenciais).
- **Custo estimado**: poucos centavos a poucos reais por mês — só a
  interpretação do texto do admin passa pela API da Anthropic (Claude
  Haiku), o processamento em si (Sharp) é local e sem custo de API.
- **21 testes de integração passando** (`backend/tests/*.test.ts`), sendo
  **9 específicos de tratamento de imagem** (`imageEdit.test.ts`).
- **Fora de escopo** para este projeto: remoção de fundo e
  upscaling/geração de detalhe via IA generativa — essas funcionalidades
  existem no projeto irmão "Cinzel e a Gema" (pedras preciosas), não aqui.

## Identidade visual e landing

- Sites de referência para **estrutura e forma** (não conteúdo/texto):
  extronlubrificantes.com.br e lubrioil.com.br (mesmo template, marcas
  irmãs da Ultrax).
- Ordem das seções da landing (`frontend/src/pages/Landing.tsx`): Header
  (fundo branco/claro, separado visualmente do Hero) → Hero em layout
  split-screen (bloco de cor de marca + imagem/placeholder de produto,
  título grande em caixa alta, CTA) → botão WhatsApp flutuante circular fixo
  (`WhatsAppFloatingButton.tsx`, não fica dentro do header) → grid de
  produtos em destaque (placeholders) → banner de confiança institucional →
  FAQ técnica extensa em accordion (12 perguntas, conteúdo original) →
  "Quem somos nós" (texto curto) → seção de certificação/desempenho
  (placeholder do selo ANP, sem afirmar certificação obtida) → galeria →
  blog (cards "em breve") → footer.
- Dois modais: **"Fale Conosco"** (formulário sem submit funcional ainda —
  mostra fallback com CTA para WhatsApp; comentário no código marca que
  precisa ser conectado a um serviço de e-mail/backend no futuro) e
  **"Política de Qualidade"** (texto institucional estático).
- **Paleta de cores**: exclusiva deste projeto, mas é a **mesma usada no
  FluxioDesk**, mantida deliberadamente para dar consistência visual ao
  ecossistema de atendimento do cliente (TechFlow + Cinzel e a Gema
  conversam com os mesmos agentes via FluxioDesk). Valores principais: azul
  de marca `#1B3A6B` (hover `#152D54`), azul institucional `#15305A`, texto
  principal `#1A1A1A`, texto secundário `#64748B`, texto terciário/
  placeholder `#94A3B8`, borda padrão `#E2E8F0`, fundo geral `#F8FAFC`,
  fundo alternativo `#F1F5F9`, fundo destaque suave `#EFF6FF`, verde
  WhatsApp `#25D366` (só no widget flutuante, cor universal da marca
  WhatsApp — não faz parte da paleta institucional). **Não reaproveitar essa
  paleta no projeto de pedras preciosas**, que tem paleta própria a definir.
- Site continua **100% estático/independente do backend** — sem fetch, sem
  chamada de API. Todo o conteúdo de produtos/FAQ/blog é placeholder
  explícito em `frontend/src/components/landing/data.ts`, documentado no
  próprio arquivo como provisório até o catálogo real existir.

## Custo de infraestrutura estimado

- **Cloudflare R2**: ~R$ 0/mês esperado — catálogo estimado bem abaixo dos
  10 GB grátis, e sem custo de banda/egress.
- **Tratamento de imagem**: poucos centavos a poucos reais por mês (só a
  chamada à API da Anthropic via Claude Haiku 4.5; processamento em si é
  local via Sharp, sem custo).
- **Vercel + Railway**: dentro da faixa padrão já usada em outros projetos
  do desenvolvedor.

## Fases do projeto

- **Fase 1 (concluída)**: fundações — monorepo, schema Prisma (`AdminUser`,
  `Category`, `Product`, `ProductImage`), CRUD de produtos e categorias,
  autenticação de admin via JWT, painel admin básico (login, lista,
  formulário com campos dinâmicos por categoria, upload/reordenação de
  fotos via R2), testes de integração (Vitest + Supertest),
  `docker-compose.yml` para Postgres local.
- **Fase 1.5 (concluída)**: tratamento de foto sob demanda via IA (ver seção
  acima).
- **Fase 1.7 (concluída)**: landing institucional publicada no domínio
  definitivo (techflowdistribuidora.com.br via Vercel), com identidade
  visual completa seguindo os sites de referência (estrutura, paleta de
  cores da marca, modais, botão flutuante do WhatsApp).
- **Fase 2 (planejada, não iniciada)**: backend em produção (Railway),
  catálogo real conectado à vitrine pública, integração WhatsApp →
  FluxioDesk via API (ver [Checkout](#checkout--sem-pagamento-no-site)),
  carrinho/finalização de pedido, cálculo de frete, emissão de NF-e,
  cadastro/login de cliente final, exibição de timestamps em BRT nas telas
  voltadas ao cliente.

## Padrões técnicos reaproveitados de outros projetos do desenvolvedor

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
- O `README.md` ainda descreve o deploy como "não configurado" — desatualizado
  em relação ao frontend, que já está em produção na Vercel. Atualizar o
  README na próxima alteração relevante de infraestrutura.

## Credenciais de desenvolvimento (seed)

- Admin: `admin@site-vendas-oleo.com` / senha `admin123` (sobrescrevível via
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). **Trocar em produção.**
- Duas categorias de exemplo (Óleo Bruto, Lubrificante Automotivo), cada
  uma com `attributeSchema` diferente, e um produto de exemplo em cada.

Detalhes de setup local (Docker, variáveis de ambiente, comandos de
migration/seed/teste) estão no [README.md](./README.md) — este arquivo foca
no *porquê*, não no *como rodar*.
