#!/usr/bin/env bash

# =======================================================
# DialNFind Automated Deployment Script for Mac Host
# =======================================================

set -e

echo "🚀 Starting DialNFind deployment..."

# 1. Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found! Copying .env.production.example to .env..."
    cp .env.production.example .env
    echo "👉 Please edit .env file to update your domain names and passwords before continuing if needed."
fi

# 1b. Check the public URLs. They are compiled into the web, provider and admin bundles, so a wrong
# value here is only fixed by editing .env and deploying again.
env_value() {
    grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'"
}
echo "🔗 Public URLs from .env:"
URL_ERRORS=0
for key in WEB_URL PUBLIC_URL PROVIDER_URL ADMIN_URL; do
    value="$(env_value "$key")"
    echo "   $key=$value"
    host="$(echo "$value" | sed -E 's#^[a-z]+://##; s#[/:].*$##')"
    labels="$(echo "$host" | awk -F. '{print NF}')"
    # Cloudflare's free certificate covers *.example.com but not *.sub.example.com.
    if [[ "$value" == https://* ]] && [ "$labels" -gt 3 ] && [ "${ALLOW_DEEP_SUBDOMAINS:-}" != "1" ]; then
        echo "   ❌ $host is a sub-subdomain; Cloudflare's free SSL does not cover it (use a name like api-app.example.com)."
        URL_ERRORS=1
    fi
done
if [[ "$(env_value PUBLIC_URL)" == */api/v1* ]]; then
    echo "   ❌ PUBLIC_URL must not end in /api/v1; it is added automatically."
    URL_ERRORS=1
fi
if [ "$URL_ERRORS" = 1 ]; then
    echo "Fix the URLs in .env and run ./deploy.sh again (set ALLOW_DEEP_SUBDOMAINS=1 if you have an Advanced Certificate)."
    exit 1
fi

# 2. Create uploads directory on host for file storage
echo "📁 Ensuring uploads directory exists..."
mkdir -p uploads/public uploads/private
chmod -R 777 uploads

# 3. Start Database container
echo "🐘 Starting PostgreSQL + PostGIS database..."
docker compose up -d db

# 4. Wait for Database health check
echo "⏳ Waiting for database to be ready..."
until [ "$(docker inspect -f '{{.State.Health.Status}}' dialnfind-db 2>/dev/null)" == "healthy" ]; do
    sleep 2
    echo -n "."
done
echo ""
echo "✅ Database is ready!"

# 5. Run Database Migrations & Release Bootstrap
echo "⚡ Running database migrations and initial bootstrap..."
docker compose run --build --rm server pnpm release

# 6. Build and start all services
echo "📦 Building and starting all application services..."
docker compose up --build -d

# 6b. Confirm the provider portal was built against the API URL in .env.
EXPECTED_API="$(env_value PUBLIC_URL)/api/v1"
if docker exec dialnfind-provider sh -c "grep -rqF '$EXPECTED_API' /usr/share/nginx/html/assets"; then
    echo "✅ Provider portal calls $EXPECTED_API"
else
    echo "⚠️  Provider portal bundle does not contain $EXPECTED_API; rebuilding frontends without cache..."
    docker compose build --no-cache provider super-admin web
    docker compose up -d
fi

# 7. Print Container Status
echo ""
echo "======================================================="
echo "🎉 DialNFind services are running successfully!"
echo "======================================================="
echo "Local endpoints ready for Cloudflare Tunnel:"
echo "  🌐 Website (Next.js):        http://localhost:3000"
echo "  ⚙️  API Server (Express):     http://localhost:4000"
echo "  💼 Provider Portal (React):  http://localhost:5173"
echo "  👑 Admin Console (React):    http://localhost:5174"
echo "  🐘 PostgreSQL DB (PostGIS):  localhost:5432"
echo ""
echo "📂 Uploaded files will be stored directly on host at: $(pwd)/uploads"
echo "======================================================="
docker compose ps
