#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/mvp-platform/logistics-mvp"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE="backend/.env"

cd "$APP_DIR"

echo "==> Fetch latest code"
git fetch origin main
git reset --hard origin/main

echo "==> Build backend image"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build app

echo "==> Start containers"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

echo "==> Run migrations"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app php artisan migrate --force

echo "==> Clear and cache Laravel config"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app php artisan optimize:clear
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app php artisan config:cache

echo "==> Cache routes"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app php artisan route:cache || \
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app php artisan route:clear

echo "==> Restart queue"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app php artisan queue:restart || true

echo "==> Health check"
curl -fsS http://localhost/api/health

echo "==> Deploy completed"
