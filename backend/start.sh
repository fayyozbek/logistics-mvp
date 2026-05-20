#!/bin/sh
# Render container startup script for the Logistix Laravel API.
# Render Free has no Shell access — migrations/seeders run here when enabled.
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  php artisan migrate --force
fi

if [ "$RUN_SEEDERS" = "true" ]; then
  php artisan db:seed --force
fi

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
