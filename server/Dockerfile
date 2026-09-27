# DialNFind API. Build from the repository root (the pnpm lockfile lives there):
#   docker build -f server/Dockerfile -t dialnfind-api .
# Before starting a new version, run the release step once (migrations, then the idempotent bootstrap):
#   docker run --rm --env-file server/.env dialnfind-api pnpm release
# Uploads live in /app/uploads; mount a persistent volume there (docs/DEPLOY.md).

FROM node:22-bookworm-slim AS base
# openssl for Prisma's query engine, ca-certificates for SMTP, Razorpay and RevenueCat over TLS.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.33.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
# Every workspace manifest, so the frozen lockfile matches; only the server's dependencies are installed.
COPY server/package.json server/
COPY web/package.json web/
COPY provider/package.json provider/
COPY super-admin/package.json super-admin/

FROM base AS build
RUN pnpm install --frozen-lockfile --filter server...
COPY server server
RUN pnpm --filter server exec prisma generate && pnpm --filter server build

FROM base AS runtime
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod --filter server...
COPY server/prisma server/prisma
RUN pnpm --filter server exec prisma generate
COPY --from=build /app/server/dist server/dist
RUN mkdir -p /app/uploads/public /app/uploads/private && chown -R node:node /app/uploads
USER node
WORKDIR /app/server
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
