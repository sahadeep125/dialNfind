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
docker compose run --rm server pnpm release

# 6. Build and start all services
echo "📦 Building and starting all application services..."
docker compose up --build -d

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
