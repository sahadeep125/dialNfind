# DialNFind website. Build from the repository root (the pnpm lockfile lives there). NEXT_PUBLIC_* values
# are compiled into the pages, so they are build arguments; everything else (API_URL, CLIENT_IP_HEADER,
# ANDROID_SHA256_CERT_FINGERPRINTS, ...) is read at runtime from the container environment.
#   docker build -f web/Dockerfile -t dialnfind-web \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://dialnfind.com \
#     --build-arg NEXT_PUBLIC_IMAGE_ORIGINS=https://api.dialnfind.com \
#     --build-arg NEXT_PUBLIC_PROVIDER_APP_URL=https://business.dialnfind.com .

FROM node:22-bookworm-slim AS build
RUN npm install -g pnpm@10.33.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
# Every workspace manifest, so the frozen lockfile matches; only the website's dependencies are installed.
COPY server/package.json server/
COPY web/package.json web/
COPY provider/package.json provider/
COPY super-admin/package.json super-admin/
RUN pnpm install --frozen-lockfile --filter web...
COPY web web

ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_IMAGE_ORIGINS
ARG NEXT_PUBLIC_PROVIDER_APP_URL
ARG NEXT_PUBLIC_MAP_TILE_URL
ARG NEXT_PUBLIC_MAP_ATTRIBUTION
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_APPLE_SERVICES_ID
ARG NEXT_PUBLIC_APPLE_REDIRECT_URI
ARG NEXT_PUBLIC_APP_STORE_URL
ARG NEXT_PUBLIC_PLAY_STORE_URL
ARG NEXT_PUBLIC_OFFICE_ADDRESS
ARG NEXT_PUBLIC_OFFICE_REGION
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_APP_ENV=production
# Product analytics (PostHog project token); empty sends nothing. The /ingest proxy target is fixed at build time.
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG POSTHOG_INGEST_HOST=https://us.i.posthog.com
# Pages that are prerendered call the API during the build, so it must be reachable from the builder.
ARG API_URL

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_IMAGE_ORIGINS=$NEXT_PUBLIC_IMAGE_ORIGINS \
    NEXT_PUBLIC_PROVIDER_APP_URL=$NEXT_PUBLIC_PROVIDER_APP_URL \
    NEXT_PUBLIC_MAP_TILE_URL=$NEXT_PUBLIC_MAP_TILE_URL \
    NEXT_PUBLIC_MAP_ATTRIBUTION=$NEXT_PUBLIC_MAP_ATTRIBUTION \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_PUBLIC_APPLE_SERVICES_ID=$NEXT_PUBLIC_APPLE_SERVICES_ID \
    NEXT_PUBLIC_APPLE_REDIRECT_URI=$NEXT_PUBLIC_APPLE_REDIRECT_URI \
    NEXT_PUBLIC_APP_STORE_URL=$NEXT_PUBLIC_APP_STORE_URL \
    NEXT_PUBLIC_PLAY_STORE_URL=$NEXT_PUBLIC_PLAY_STORE_URL \
    NEXT_PUBLIC_OFFICE_ADDRESS=$NEXT_PUBLIC_OFFICE_ADDRESS \
    NEXT_PUBLIC_OFFICE_REGION=$NEXT_PUBLIC_OFFICE_REGION \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    POSTHOG_INGEST_HOST=$POSTHOG_INGEST_HOST \
    API_URL=$API_URL \
    NEXT_OUTPUT_STANDALONE=1 \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter web build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# The standalone server does not serve public/ or .next/static on its own; they go next to it.
COPY --from=build --chown=node:node /app/web/.next/standalone ./
COPY --from=build --chown=node:node /app/web/.next/static ./web/.next/static
COPY --from=build --chown=node:node /app/web/public ./web/public
USER node
EXPOSE 3000
CMD ["node", "web/server.js"]
