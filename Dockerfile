# syntax=docker/dockerfile:1.7
#
# RoleUp: one Dockerfile, two images.
#
#   docker build --target web     -t roleup-web .       # website + public API + admin
#   docker build --target workers -t roleup-workers .   # migrate / seed / crawl / ... jobs
#
# Secrets (DATABASE_URL, ADMIN_TOKEN, ...) are passed at runtime, never baked into an image.
# The build itself needs no database. See docker-compose.yml for a full local stack.

ARG NODE_VERSION=24-alpine

# ---------------------------------------------------------------------------------------------
# base: Node + pinned pnpm (via corepack, downloaded once at build time)
# ---------------------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME=/pnpm \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.34.9 --activate
WORKDIR /app

# ---------------------------------------------------------------------------------------------
# deps: install only what the web build needs (the Expo app is skipped). Manifests are copied
# first so this layer is cached until a package.json or the lockfile changes.
# ---------------------------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY workers/package.json workers/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile \
      --filter roleup \
      --filter "@roleup/web..."

# ---------------------------------------------------------------------------------------------
# build: Next.js standalone server
# ---------------------------------------------------------------------------------------------
FROM deps AS build
COPY . .
# Inlined into the client bundle at build time, so it is a build arg (not a secret).
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_CONTACT_EMAIL=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_OUTPUT=standalone \
    NODE_ENV=production
RUN pnpm --filter @roleup/web build \
 && mkdir -p apps/web/public

# ---------------------------------------------------------------------------------------------
# web: minimal runtime (~standalone server + static assets), runs as a non-root user
# ---------------------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS web
RUN apk add --no-cache libc6-compat \
 && addgroup -S -g 1001 nodejs \
 && adduser -S -u 1001 -G nodejs nextjs
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]

# ---------------------------------------------------------------------------------------------
# workers-deps / workers: TypeScript jobs run with tsx, without the web app's dependencies.
#   Usage: docker run roleup-workers <task>
#   tasks: setup (migrate + seed), migrate, seed, crawl, sync-yc, track-funding, detect-ats,
#          verify-seed, daily (sync-yc + track-funding + detect-ats), all
# ---------------------------------------------------------------------------------------------
FROM base AS workers-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY workers/package.json workers/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@roleup/workers..."

FROM workers-deps AS workers
ENV NODE_ENV=production
COPY packages ./packages
COPY workers ./workers
COPY data ./data
COPY docker/workers-entrypoint.sh /usr/local/bin/roleup-worker
# Files stay root-owned and read-only for the unprivileged runtime user.
RUN chmod +x /usr/local/bin/roleup-worker
USER node
ENTRYPOINT ["roleup-worker"]
CMD ["crawl"]
