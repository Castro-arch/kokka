# syntax=docker/dockerfile:1.7
# Build context: repository root (docker build -f apps/worker/Dockerfile .)
# The worker runs TypeScript sources directly via Node's type stripping (Node >= 22.18), so there is
# no compile step. Workspace packages must stay outside node_modules for that to work, which is why
# this image copies the workspace layout instead of using `pnpm deploy`.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    HUSKY=0
RUN corepack enable
WORKDIR /app

FROM base AS deps
# Download dependencies from the lockfile alone so this layer survives source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --prod
COPY packages ./packages
COPY apps/worker ./apps/worker
# The cache mount is not saved with the layer cache: on a fresh CI runner the fetch layer can be
# CACHED while the store is empty, so install may still download instead of running --offline.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prefer-offline --frozen-lockfile --prod --filter "@kokka/worker..."

FROM node:22-alpine AS runtime
# ffmpeg transcodes videos; libheif-tools brings heif-dec (libheif + libde265) for iPhone HEIC
# photos, which the prebuilt sharp cannot decode. The build fails here if either is missing.
RUN apk add --no-cache ffmpeg libheif-tools \
    && ffmpeg -hide_banner -version > /dev/null \
    && heif-dec --version
ENV NODE_ENV=production \
    WORKER_HEALTH_PORT=3001
WORKDIR /app
COPY --from=deps --chown=node:node /app ./
WORKDIR /app/apps/worker
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3001/health > /dev/null || exit 1
CMD ["node", "src/index.ts"]
