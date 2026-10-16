# Kokka — contexto do projeto

**Kokka** é um sistema web para os eventos de **um único cliente** (festas, casamentos). Mascote e logo: um quokka sorrindo. Convidado lê o QR Code da mesa, cai na galeria do evento e envia/grava fotos e vídeos. O cliente (dono do sistema) gerencia os eventos, opera o telão em loop e baixa tudo depois.

Idioma do produto e do código voltado ao usuário: **português (pt-BR)**. Nomes de código, tabelas e variáveis: inglês.

## Regras de trabalho

- Trabalhe **um passo do plano por vez** (seção "Plano"). Não adiante passos.
- Commits e versionamento seguem a seção "Git e versionamento" à risca.
- Antes de codar um passo, apresente um plano curto e espere aprovação.
- Ao final de cada passo: rode lint, typecheck e testes, e diga como validar manualmente.
- Não adicione dependências fora da stack abaixo sem perguntar.
- Nunca commitar `.env`; manter `.env.example` atualizado.

## Git e versionamento

### Commits — Conventional Commits 1.0
Formato: `<type>(<scope>): <subject>`, **em inglês**, modo imperativo.

- **types**: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `style`, `revert`
- **scopes**: `web`, `worker`, `db`, `shared`, `infra`, `deps`, `ci`, `repo`
- Subject: minúsculo, sem ponto final, até 72 caracteres
- Corpo (opcional): explica o **porquê**, não o quê; linhas de até 100 caracteres
- Rodapé: `BREAKING CHANGE: ...` para quebra de compatibilidade; `Refs: #12` para issues
- **Commits atômicos**: uma mudança lógica por commit, que compila e passa nos testes sozinha
- Nunca misturar refactor com feature no mesmo commit

Exemplos:
```
feat(db): add events and media tables
fix(web): reject uploads after event is closed
build(infra): add worker dockerfile with ffmpeg
```

### Enforcement
- **commitlint** (`@commitlint/config-conventional`) com os scopes acima
- **husky**: `commit-msg` roda o commitlint; `pre-commit` roda **lint-staged** (eslint + prettier nos arquivos alterados)
- **pre-push**: typecheck + testes

### Branches (trunk-based)
- `main` sempre deployável e protegida: exige PR, CI verde (lint, typecheck, testes, commitlint), histórico linear e bloqueia force push. **Não exige aprovação de outra pessoa** (projeto solo).
- Fluxo: Claude abre o PR com `gh pr create`, espera o CI e **para**; o José revisa e faz o merge (rebase and merge). Claude só faz merge se o José pedir explicitamente naquele PR.
- Exceção — PRs de release: o PR gerado por `pnpm version-packages` (só versão, `CHANGELOG.md` e changesets consumidos) Claude pode mergear (rebase and merge) assim que o CI passar, e em seguida criar e enviar a tag (`pnpm release:tag` + `git push origin vX.Y.Z`). Qualquer PR com outra mudança continua exigindo pedido explícito.
- Trabalho em branches curtas: `feat/<scope>-<descricao>`, `fix/...`, `chore/...`
- Merge via PR com **rebase and merge** (squash desativado): cada commit atômico chega ao `main` como está, então todos precisam passar no commitlint. O título do PR não vira commit.
- Rebase em vez de merge para atualizar a branch

### Versionamento — SemVer
- **Changesets** (`@changesets/cli`) gerencia versões e CHANGELOG do monorepo
- Toda mudança visível ao usuário ou à API inclui um changeset (`pnpm changeset`)
- Releases geram tag `vX.Y.Z` e entrada no `CHANGELOG.md`
- Pré-1.0: `0.MINOR.PATCH`; quebra sobe o MINOR
- **Marcos**: cada passo do plano concluído = um release MINOR (passo 1 → `v0.1.0`, passo 2 → `v0.2.0`…); primeiro evento real em produção → `v1.0.0`

## Stack (decidida — não trocar)

- **Monorepo pnpm** (repositório `kokka`, pacotes com escopo `@kokka/*`): `apps/web`, `apps/worker`, `packages/db`, `packages/shared`
- **Node 22 LTS**, TypeScript estrito
- **Next.js (App Router)** em `apps/web`. Sem NestJS.
  - **Server Actions** para as mutações do admin (criar/editar evento, tema, status)
  - **Route Handlers** para arquivos (upload da capa, PNGs gerados, downloads), SSE e todas as rotas do convidado
- **Postgres + Drizzle ORM** em `packages/db` (schema, migrations, client)
- **Redis**: filas BullMQ e pub/sub do realtime
- **BullMQ** em `apps/worker`: processamento de mídia, ZIP, ciclo de vida
- **Storage S3** (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) para todas as mídias: **Cloudflare R2** em produção, **SeaweedFS** (gateway S3) no Docker Compose local, com o bucket criado por um container de init com `aws-cli`; sem Docker, um bucket R2 só de desenvolvimento (`.env.example`). Cliente e URLs assinadas em `@kokka/shared/storage` (usado por web e worker); cada app valida o próprio env e passa a config.
- **Better Auth** para login do cliente (email + senha). Sem cadastro público.
- **Uppy** (`@uppy/aws-s3` multipart) para upload resumível direto ao R2
- **sharp** (imagens) e **ffmpeg** (vídeos) no worker; sharp também no web, só para a capa do evento
- **qrcode** para o QR do evento; **next/og** para a arte de impressão (fontes TTF em `apps/web/assets/fonts/`, com a licença OFL de cada uma)
- **Tailwind CSS** na interface
- Pacotes de apoio aprovados: **server-only** (web: impede importar código de servidor no cliente) e **globals** (globais do Node na config do ESLint)
- Deploy: **Docker Compose** na VPS via **Coolify** (serviços: web, worker, postgres, redis)

## Perfis de acesso

| Perfil | Como entra | Pode |
|---|---|---|
| Convidado | QR → `/e/{slug}`, sem login | Ver galeria, enviar/gravar foto e vídeo (só com evento ativo), baixar original |
| Cliente (admin) | Login em `/admin` | Criar/editar eventos, personalizar, telão, ocultar/apagar mídia, encerrar, baixar ZIP |

Proteção sempre **no servidor** (middleware + checagem em cada página, Server Action e Route Handler), nunca só escondendo botão.

## Ciclo de vida do evento

`draft` → `active` → `closed` → `expired`

- Transições **só para frente**. O admin faz `draft → active → closed`; `expired` só pelo job.
- **active**: convidados enviam e veem; telão disponível.
- **closed**: envio bloqueado; galeria e download liberados. `expires_at = closed_at + 5 dias`.
- Aviso na galeria 24h antes de expirar.
- **expired**: job apaga todos os objetos do R2 e os registros de mídia; página mostra que o evento acabou.
- Encerramento manual pelo admin ou automático em `ends_at`.

## Modelo de dados (inicial)

- **events**: `id`, `slug` (único, curto), `name`, `subtitle`, `starts_at`, `ends_at`, `status`, `closed_at`, `expires_at`, `theme` (jsonb: `primaryColor`, `font`, `coverKey`), `created_at`
- **media**: `id`, `event_id`, `kind` (`image`|`video`), `status` (`uploading`|`processing`|`ready`|`failed`|`hidden`), `original_key`, `original_mime`, `size_bytes`, `width`, `height`, `duration_ms`, `thumb_key`, `display_key`, `device_id`, `created_at`
- **exports**: `id`, `event_id`, `status` (`pending`|`processing`|`ready`|`failed`), `key`, `size_bytes`, `created_at`
- Tabelas do Better Auth geradas pela própria lib.

Índices: `media(event_id, created_at desc)`, `events(slug)`, `exports(event_id)`.

## Mídia

- O **original nunca é alterado nem comprimido**. Chave: `events/{eventId}/original/{mediaId}.{ext}`
- Derivados: `thumb/{mediaId}.webp` (galeria) e `display/{mediaId}.jpg|mp4`
  - Imagem: thumb 480px + display JPEG (converte HEIC)
  - Vídeo: poster/thumb + MP4 H.264/AAC 720p, `faststart`
  - **HEIC no worker (passo 4)**: o binário pré-compilado do sharp não decodifica HEIC (HEVC). A imagem do worker precisa de libvips com **libheif + decodificador HEVC** (ex.: libde265).
- Capa do evento (`events/{eventId}/cover/{coverId}.webp`): upload pelo admin, aceita JPEG/PNG/WebP e recusa HEIC; o web aplica a orientação EXIF, remove os metadados e gera WebP de até 1600px.
- Bucket privado; acesso só por **URL assinada** com expiração.
- Limites: vídeo até 3 min / 1 GB; rate limit por `device_id` (cookie) + IP no Redis.

## Realtime

SSE em `/api/e/{slug}/stream`. Worker publica no Redis (`event:{id}`) quando uma mídia fica `ready`, `hidden` ou é apagada; o Route Handler repassa aos clientes.

## Telão (`/admin/eventos/{id}/telao`)

- Tela cheia, loop: foto N segundos (configurável), vídeo até o fim, mudo
- Mídia nova entra logo após o item atual
- Pré-carrega o próximo item; se a rede cair, segue rodando o que já tem
- Wake Lock API; controles de pausar/pular/ocultar
- Sem mídia: tela de abertura com nome do evento + QR

## Performance (convidado)

- Galeria renderizada no servidor, só thumbnails, lazy loading, paginação por cursor
- Pouco JS na rota do convidado; testar em Safari iOS antigo e Android de entrada

## Referência visual

Os mockups em [`docs/design/`](docs/design/) (estilo Duolingo; convidado em `screens/`, admin em [`admin/`](docs/design/admin/) com o [`SPEC.md`](docs/design/admin/SPEC.md)) são a **referência visual da interface**, implementada no passo 3.5. Não são código de produção. O sistema visual (fonte Nunito, botões 3D, cores, ícones SVG) está no [`docs/design/README.md`](docs/design/README.md); as "ideias novas" listadas lá (meta da festa, conquistas, checklist do rascunho) precisam ser decididas antes de implementar.

- Telas novas do admin usam os componentes de `apps/web/src/components/admin/` (Button, Card, Field, StatusChip, SegmentedControl, Switch…), não as classes `.btn-*`/`.block-card` (que ficam só para o convidado).
- Funções sem backend aparecem visíveis e inertes, marcadas "Em breve" pelo primitivo de `soon.tsx` (selo, ou um aviso único na tela com `hideBadge`/`describedBy`).
- Conferência visual: `pnpm --filter @kokka/web design:shots [telas] [--mobile]` semeia o banco `kokka_shots`, tira os shots e compara com os PNGs em `docs/design/admin/impl/compare/`.

## Marca

Cores da interface do Kokka (admin, telas do sistema). Logos e ícone em `.github/assets/` (README) e, a partir do passo 3, os ícones do app em `apps/web/src/app/` (convenção do Next).

| Cor | Uso | Contraste com branco |
|---|---|---|
| `#FC123A` (vermelho da marca, medido no logo) | Logo, destaques, anel de foco | 3,97:1 |
| `#D90F32` | Botões com texto branco | 5,17:1 |
| `#BE0E2E` | Hover/ativo desses botões | 6,38:1 |

- **`#FC123A` não serve para texto pequeno**: fica abaixo do AA (4,5:1) tanto com branco por cima quanto como texto sobre fundo branco. Em texto, só em tamanho grande (≥ 24 px, ou ≥ 18,66 px em negrito), onde o mínimo é 3:1. Para elementos que não são texto (foco, ícones, bordas), 3:1 basta.
- Texto branco em fundo vermelho usa sempre `#D90F32`/`#BE0E2E`, nunca o `#FC123A`.
- O **tema padrão dos eventos continua terracota** (`#c2703d`, `DEFAULT_THEME` em `@kokka/shared`); o vermelho é da marca Kokka, não dos eventos do cliente.
- Tokens em `apps/web/src/app/globals.css`: `brand` (`#FC123A`), `brand-strong` (`#D90F32`) e `brand-dark` (`#BE0E2E`); `.btn-primary` usa os dois últimos.
- A borda inferior mais escura dos blocos usa o sufixo `-edge` em todas as famílias (`brand-edge` `#9E0A24`, `sun-edge`, `ok-edge`); o hover é `brand-dark`.

## Plano

1. **Base**: monorepo, commitlint + husky + lint-staged + Changesets, Docker Compose local (postgres, redis), schema + migrations, `.env.example`, Dockerfiles de web e worker, healthcheck, CI no GitHub Actions (lint, typecheck, testes, validação de commits)
2. **Admin**: login (Better Auth, seed do usuário), CRUD de eventos, personalização, geração do QR e arte para impressão
3. **Convidado**: galeria `/e/{slug}`, upload multipart ao R2 com Uppy, registro da mídia, SSE

3.5. **Redesign** — ✅ **concluído em `v0.4.0`**. Visual de [`docs/design/`](docs/design/) no convidado (cabeçalho com mascote, botões grandes, progresso, "Enviados por você", tela de sucesso, galeria em mosaico, navegação inferior) e no admin conforme [`docs/design/admin/SPEC.md`](docs/design/admin/SPEC.md) (lateral escura; telas Eventos, Evento com abas, Mídias, Telão, Configurações; login e novo evento). Sem meta da festa, conquistas nem checklist do rascunho; sem mudar regras de upload, API ou banco.
   - Ficaram desenhados como "Em breve", para os passos abaixo: controles do Telão, tela cheia e ajustes (passo 5); Ocultar/Apagar em Mídias (passo 5); Baixar tudo (ZIP) e download de várias mídias (passo 6). Os "Padrões para novos eventos" (Configurações) ainda não têm passo: decidir antes de implementar.

4. **Worker**: fila de processamento (thumb, HEIC→JPEG, MP4 720p), status e eventos realtime
5. **Telão + gestão**: modo telão, ocultar/apagar com efeito imediato (ligar os controles já desenhados no Telão e em Mídias)
6. **Ciclo de vida**: encerrar, aviso de 24h, expiração e limpeza do R2, ZIP por streaming (ligar "Baixar tudo" e o download em lote), backup diário do Postgres para o R2
7. **Qualidade**: testes em aparelhos reais, teste de carga (~150 uploads simultâneos), monitoramento, evento piloto
   - **Pendente do passo 3, obrigatório antes do primeiro evento**: teste do envio em celular real (iPhone e Android), que foi pulado no passo 3. Cobrir: câmera ("Tirar foto" e "Gravar vídeo"), vídeo grande (perto de 1 GB / 3 min, várias partes e retomada), HEIC e MOV de iPhone, e se o iOS converte HEIC para JPEG ao escolher da galeria.

## Fora da v1

HLS adaptativo, moderação com aprovação prévia, exportação para Google Drive, multi-tenant.
