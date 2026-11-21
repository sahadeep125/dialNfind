#!/usr/bin/env bash

# =======================================================
# KaajVa Automated Deployment Script for Mac Host
# =======================================================

set -e

# Usage:
#   ./deploy.sh           Deploy or update. Keeps all data: only new migrations run, and bootstrap only adds
#                         what is missing (super admin, categories, provider listings not imported before).
#   ./deploy.sh --fresh   Fresh install. DELETES THE DATABASE first (asks you to type its name), then deploys:
#                         one super admin from BOOTSTRAP_ADMIN_* in .env, the default categories and every
#                         provider in server/prisma/data/providers-*.json. Uploaded files in ./uploads are kept.
FRESH=0
for arg in "$@"; do
    case "$arg" in
        --fresh) FRESH=1 ;;
        -h|--help) sed -n '9,14p' "$0"; exit 0 ;;
        *) echo "Unknown option: $arg (use --fresh or --help)"; exit 1 ;;
    esac
done

echo "🚀 Starting KaajVa deployment..."

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

# 1c. Fresh install: wipe the database volume after an explicit confirmation.
if [ "$FRESH" = 1 ]; then
    admin_email="$(env_value BOOTSTRAP_ADMIN_EMAIL)"
    admin_password="$(env_value BOOTSTRAP_ADMIN_PASSWORD)"
    if [ -z "$admin_email" ] || [ "${#admin_password}" -lt 10 ] || [ "$admin_password" = "replace_with_a_long_password" ]; then
        echo "❌ --fresh needs BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (10+ characters) in .env for the new super admin."
        exit 1
    fi
    db_name="$(env_value POSTGRES_DB)"
    db_name="${db_name:-dialnfind}"
    project="$(grep -E '^name:' docker-compose.yml | head -n 1 | awk '{print $2}' || true)"
    project="${project:-dialnfind}"
    volume="${project}_postgres_data"
    echo ""
    echo "⚠️  FRESH INSTALL: this permanently deletes the database '$db_name' (Docker volume $volume):"
    echo "   every user, listing, review, lead, payment record and setting. Files in ./uploads are kept."
    echo "   Afterwards the only account is the super admin $admin_email."
    read -r -p "   Type the database name ($db_name) to continue: " answer
    if [ "$answer" != "$db_name" ]; then
        echo "Cancelled; nothing was changed."
        exit 1
    fi
    echo "🧹 Stopping containers and deleting the database volume..."
    docker compose down
    docker volume rm "$volume" 2>/dev/null || echo "   (volume $volume did not exist)"
fi

# 2. Create uploads directory on host for file storage
echo "📁 Ensuring uploads directory exists..."
# uploads/private holds ID proofs and business documents, so only the API's user may read it.
mkdir -p uploads/public uploads/private
if [ "$(uname)" = "Linux" ]; then
    # The API runs as the image's `node` user (uid 1000), which must own the folder to write to it.
    SUDO=""
    [ "$(id -u)" != 0 ] && SUDO="sudo"
    $SUDO chown -R 1000:1000 uploads
    $SUDO chmod -R u=rwX,g=rX,o= uploads
else
    # Docker Desktop (macOS) lets containers use bind-mounted files as the signed-in user, so that user keeps them.
    chmod -R u=rwX,g=rX,o= uploads
fi

# 2b. The apps publish 4000, 3000, 5173 and 5174 on this machine. Stop early, naming the program, when something
# other than Docker already listens there (often `pnpm dev`), instead of failing halfway with "address already in use".
if command -v lsof >/dev/null 2>&1; then
    PORT_ERRORS=0
    for port in 4000 3000 5173 5174; do
        holders="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR>1 && $1 !~ /^(com\.docke|docker|vpnkit|Docker)/ {print $1" (pid "$2")"}' | sort -u | paste -sd, -)"
        if [ -n "$holders" ]; then
            echo "❌ Port $port is already used by $holders. Stop it (for a dev server: Ctrl+C in its terminal, or kill <pid>)."
            PORT_ERRORS=1
        fi
    done
    [ "$PORT_ERRORS" = 1 ] && exit 1
fi

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

# 5. Run Database Migrations & Release Bootstrap. On a fresh database this creates the super admin
# (BOOTSTRAP_ADMIN_* in .env), the default categories and every provider in server/prisma/data/providers-*.json;
# later deploys only add new source records, never re-adding listings that were edited or deleted.
echo "⚡ Running database migrations, bootstrap and provider import..."
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

# 6c. The website is built before the API container runs, so pages built then hold empty fallback data until
# their cache time runs out. Expire every shared cache tag now so the next visit renders real data.
REVALIDATE_SECRET_VALUE="$(env_value REVALIDATE_SECRET)"
if [ -n "$REVALIDATE_SECRET_VALUE" ] && [ "$REVALIDATE_SECRET_VALUE" != "replace_with_random_hex" ]; then
    echo "🔄 Refreshing the website's cached pages..."
    for _ in $(seq 1 30); do
        curl -s -o /dev/null http://127.0.0.1:3000/robots.txt && break
        sleep 2
    done
    if curl -sf -X POST http://127.0.0.1:3000/api/revalidate \
        -H "x-revalidate-secret: $REVALIDATE_SECRET_VALUE" -H "content-type: application/json" \
        -d '{"tags":["providers","categories","app-config","plans","stats","reviews","sitemap"]}' >/dev/null; then
        curl -s -o /dev/null http://127.0.0.1:3000/ || true
        echo "✅ Website cache refreshed"
    else
        echo "⚠️  Could not refresh the website cache; pages show real data once their cache runs out (up to an hour)."
    fi
else
    echo "⚠️  REVALIDATE_SECRET is not set in .env: after this deploy, Home and other pages may show empty rows for up to"
    echo "   an hour, and edits are slow to appear. Set it (openssl rand -hex 32) and deploy again."
fi

# 6d. Sign-up codes and password resets need working email.
if [ "$(env_value SMTP_PASS)" = "your-app-password" ] || [ -z "$(env_value SMTP_PASS)" ]; then
    echo "⚠️  SMTP_PASS in .env is not set to the Gmail app password, so the API will not start in production."
fi

# 7. Print Container Status
echo ""
echo "======================================================="
echo "🎉 KaajVa services are running successfully!"
echo "======================================================="
echo "Local endpoints ready for Cloudflare Tunnel (on 127.0.0.1 only; BIND_ADDRESS in .env changes that):"
echo "  🌐 Website (Next.js):        http://localhost:3000"
echo "  ⚙️  API Server (Express):     http://localhost:4000"
echo "  💼 Provider Portal (React):  http://localhost:5173"
echo "  👑 Admin Console (React):    http://localhost:5174"
echo "  🐘 PostgreSQL DB (PostGIS):  internal only; shell: docker compose exec db psql -U \"$(env_value POSTGRES_USER)\" \"$(env_value POSTGRES_DB)\""
echo ""
echo "📂 Uploaded files will be stored directly on host at: $(pwd)/uploads"
echo "======================================================="
docker compose ps
