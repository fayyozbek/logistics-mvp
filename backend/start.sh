#!/bin/sh
# Render container startup script for the Logistix Laravel API.
# Runs on every container boot.
set -e

# Apply pending migrations.
# Safe to run repeatedly — does nothing if the schema is already current.
# Does NOT run migrate:fresh or db:seed automatically.
php artisan migrate --force

# Start the built-in PHP server.
# Render provides $PORT; default to 8000 for local `docker run` testing.
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
