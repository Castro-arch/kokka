# @kokka/shared

## 0.2.0

### Minor Changes

- 05af4da: Painel do organizador (passo 2): login com Better Auth (admin criado por seed, sem cadastro
  público), criação e edição de eventos, status só para frente (rascunho → ativo → encerrado, com
  expiração em 5 dias), personalização de cor e fonte, foto de capa (JPEG/PNG/WebP, sem metadados),
  QR Code do evento e arte A6 para impressão em PNG 300 dpi. Storage S3 compartilhado (R2 em
  produção, SeaweedFS local).

## 0.1.0

### Minor Changes

- 7380345: Base do projeto (passo 1): monorepo pnpm, schema inicial de eventos, mídias e exportações,
  healthchecks do web (`/api/health`) e do worker (`/health`), Dockerfiles e CI.
