FROM php:8.3-cli

# System packages and PHP extensions required by Laravel + Postgres
RUN apt-get update && apt-get install -y \
        unzip \
        git \
        curl \
        libpq-dev \
        libzip-dev \
    && docker-php-ext-install pdo pdo_pgsql zip pcntl \
    && rm -rf /var/lib/apt/lists/*

# Install Composer from the official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# ── Dependency layer (cached unless composer.json / composer.lock changes) ──
COPY composer.json composer.lock ./
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --no-interaction

# ── Application source ────────────────────────────────────────────────────
COPY . .

# Optimise autoloader and discover packages.
# A minimal .env (SQLite, no external DB) is needed only for the artisan
# bootstrap that package:discover triggers — it is removed afterwards.
RUN printf "APP_KEY=\nDB_CONNECTION=sqlite\n" > .env \
    && php artisan key:generate \
    && composer dump-autoload --optimize --no-interaction \
    && php artisan package:discover --ansi \
    && rm .env

# Ensure Laravel's writable directories exist with correct permissions
RUN mkdir -p \
        storage/logs \
        storage/framework/sessions \
        storage/framework/views \
        storage/framework/cache/data \
        bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 8000

# start.sh runs migrate then starts the PHP server (see start.sh)
CMD ["sh", "start.sh"]
