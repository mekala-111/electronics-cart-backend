# Multi-stage production API image (build from monorepo root)
# docker build -f backend/docker/Dockerfile -t ec-api:prod .
FROM node:22-bookworm-slim AS deps
WORKDIR /app/backend
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY backend/package.json backend/pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY database/schema.prisma ./database/schema.prisma
COPY backend ./backend
WORKDIR /app/backend
RUN pnpm exec prisma generate --schema ../database/schema.prisma \
  && pnpm run build \
  && pnpm prune --prod

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PROCESS_ROLE=api \
    DISABLE_WORKERS=true
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init curl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nestjs \
  && useradd --system --uid 1001 --gid nestjs nestjs
COPY --from=build --chown=nestjs:nestjs /app/backend/dist ./dist
COPY --from=build --chown=nestjs:nestjs /app/backend/node_modules ./node_modules
COPY --from=build --chown=nestjs:nestjs /app/backend/package.json ./package.json
COPY --from=build --chown=nestjs:nestjs /app/backend/templates ./templates
COPY --from=build --chown=nestjs:nestjs /app/database/node_modules ./database_prisma_modules
ENV NODE_PATH=/app/node_modules:/app/database_prisma_modules
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health/live || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--max-old-space-size=1024", "dist/main.js"]
