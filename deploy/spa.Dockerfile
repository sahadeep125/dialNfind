# The provider portal or the admin console as a static site behind nginx. Build from the repository root;
# APP picks the app, and VITE_* values are compiled into the bundle, so they are build arguments.
#   docker build -f deploy/spa.Dockerfile --build-arg APP=provider \
#     --build-arg VITE_API_URL=https://api.dialnfind.com/api/v1 --build-arg VITE_WEB_URL=https://dialnfind.com \
#     -t dialnfind-provider .
#   docker build -f deploy/spa.Dockerfile --build-arg APP=super-admin \
#     --build-arg VITE_API_URL=https://api.dialnfind.com/api/v1 --build-arg VITE_WEB_URL=https://dialnfind.com \
#     -t dialnfind-admin .

FROM node:22-bookworm-slim AS build
RUN npm install -g pnpm@10.33.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
# Every workspace manifest, so the frozen lockfile matches; only the chosen app's dependencies are installed.
COPY server/package.json server/
COPY web/package.json web/
COPY provider/package.json provider/
COPY super-admin/package.json super-admin/
ARG APP
RUN test "$APP" = provider || test "$APP" = super-admin || (echo "Set --build-arg APP=provider or APP=super-admin" && exit 1)
RUN pnpm install --frozen-lockfile --filter "$APP..."
COPY $APP $APP

ARG VITE_API_URL
ARG VITE_WEB_URL
ARG VITE_MAP_TILE_URL
ARG VITE_MAP_ATTRIBUTION
# Provider portal only; leave empty to hide the Google and Apple buttons.
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_APPLE_SERVICES_ID
ARG VITE_APPLE_REDIRECT_URI
# Provider portal only: product analytics (PostHog project token); empty sends nothing. /ingest is proxied by nginx.
ARG VITE_POSTHOG_KEY
ARG VITE_POSTHOG_HOST=/ingest
ARG VITE_APP_ENV=production

ENV VITE_API_URL=$VITE_API_URL \
    VITE_WEB_URL=$VITE_WEB_URL \
    VITE_MAP_TILE_URL=$VITE_MAP_TILE_URL \
    VITE_MAP_ATTRIBUTION=$VITE_MAP_ATTRIBUTION \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_APPLE_SERVICES_ID=$VITE_APPLE_SERVICES_ID \
    VITE_APPLE_REDIRECT_URI=$VITE_APPLE_REDIRECT_URI \
    VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY \
    VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST \
    VITE_APP_ENV=$VITE_APP_ENV

RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL is required; the app would call localhost" && exit 1)
RUN pnpm --filter "$APP" build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
ARG APP
COPY deploy/spa-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/$APP/dist /usr/share/nginx/html
EXPOSE 8080
