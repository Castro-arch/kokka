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
- **Next.js (App Router)** em `apps/web`: páginas + Route Handlers como API. Sem NestJS.
- **Postgres + Drizzle ORM** em `packages/db` (schema, migrations, client)
- **Redis**: filas BullMQ e pub/sub do realtime
- **BullMQ** em `apps/worker`: processamento de mídia, ZIP, ciclo de vida
- **Cloudflare R2** (API S3, `@aws-sdk/client-s3`) para todas as mídias
- **Better Auth** para login do cliente (email + senha). Sem cadastro público.
- **Uppy** (`@uppy/aws-s3` multipart) para upload resumível direto ao R2
- **sharp** (imagens) e **ffmpeg** (vídeos) no worker
- **Tailwind CSS** na interface
- Pacotes de apoio aprovados: **server-only** (web: impede importar código de servidor no cliente) e **globals** (globais do Node na config do ESLint)
- Deploy: **Docker Compose** na VPS via **Coolify** (serviços: web, worker, postgres, redis)

## Perfis de acesso

| Perfil | Como entra | Pode |
|---|---|---|
| Convidado | QR → `/e/{slug}`, sem login | Ver galeria, enviar/gravar foto e vídeo (só com evento ativo), baixar original |
| Cliente (admin) | Login em `/admin` | Criar/editar eventos, personalizar, telão, ocultar/apagar mídia, encerrar, baixar ZIP |

Proteção sempre **no servidor** (middleware + checagem nos Route Handlers), nunca só escondendo botão.

## Ciclo de vida do evento

`draft` → `active` → `closed` → `expired`

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

## Plano

1. **Base**: monorepo, commitlint + husky + lint-staged + Changesets, Docker Compose local (postgres, redis), schema + migrations, `.env.example`, Dockerfiles de web e worker, healthcheck, CI no GitHub Actions (lint, typecheck, testes, validação de commits)
2. **Admin**: login (Better Auth, seed do usuário), CRUD de eventos, personalização, geração do QR e arte para impressão
3. **Convidado**: galeria `/e/{slug}`, upload multipart ao R2 com Uppy, registro da mídia, SSE
4. **Worker**: fila de processamento (thumb, HEIC→JPEG, MP4 720p), status e eventos realtime
5. **Telão + gestão**: modo telão, ocultar/apagar com efeito imediato
6. **Ciclo de vida**: encerrar, aviso de 24h, expiração e limpeza do R2, ZIP por streaming, backup diário do Postgres para o R2
7. **Qualidade**: testes em aparelhos reais, teste de carga (~150 uploads simultâneos), monitoramento, evento piloto

## Fora da v1

HLS adaptativo, moderação com aprovação prévia, exportação para Google Drive, multi-tenant.
