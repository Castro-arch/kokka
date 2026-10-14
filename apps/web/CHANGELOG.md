# @kokka/web

## 0.3.0

### Minor Changes

- 36e1c08: Convidado (passo 3): galeria do evento em `/e/{slug}` no tema do evento, com paginação e download
  do original; envio de fotos e vídeos pelo celular (tirar foto, gravar vídeo ou escolher da galeria)
  direto ao storage em partes, com progresso, retomada e limites (fotos até 50 MB, vídeos até 1 GB e
  3 minutos, rate limit por aparelho e IP); cada envio fica em processamento para o worker do passo 4;
  a galeria se atualiza ao vivo (SSE). Ícones do app e paleta vermelha da marca Kokka no admin.

### Patch Changes

- Updated dependencies [36e1c08]
  - @kokka/db@0.3.0
  - @kokka/shared@0.3.0

## 0.2.0

### Minor Changes

- 05af4da: Painel do organizador (passo 2): login com Better Auth (admin criado por seed, sem cadastro
  público), criação e edição de eventos, status só para frente (rascunho → ativo → encerrado, com
  expiração em 5 dias), personalização de cor e fonte, foto de capa (JPEG/PNG/WebP, sem metadados),
  QR Code do evento e arte A6 para impressão em PNG 300 dpi. Storage S3 compartilhado (R2 em
  produção, SeaweedFS local).

### Patch Changes

- Updated dependencies [05af4da]
  - @kokka/db@0.2.0
  - @kokka/shared@0.2.0

## 0.1.0

### Minor Changes

- 7380345: Base do projeto (passo 1): monorepo pnpm, schema inicial de eventos, mídias e exportações,
  healthchecks do web (`/api/health`) e do worker (`/health`), Dockerfiles e CI.

### Patch Changes

- Updated dependencies [7380345]
  - @kokka/db@0.1.0
  - @kokka/shared@0.1.0
