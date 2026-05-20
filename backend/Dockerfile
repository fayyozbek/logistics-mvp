FROM php:8.3-cli-bookworm

# System libraries for PHP extensions (Laravel 13 + PostgreSQL)
RUN apt-get update && apt-get install -y --no-install-recommends \
        unzip \
        git \
        curl \
        libpq-dev \
        libzip-dev \
        libicu-dev \
        libonig-dev \
        libxml2-dev \
    && docker-php-ext-configure intl \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        mbstring \
        pcntl \
        pdo \
        pdo_pgsql \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1

WORKDIR /var/www

# Dependency layer (cached unless composer.json / composer.lock change)
COPY composer.json composer.lock ./
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist

# Application source
COPY . .

# Optimise autoloader and discover packages (no migrations/seeds at build time).
# Minimal .env only for artisan bootstrap during package:discover.
RUN printf "APP_KEY=\nDB_CONNECTION=sqlite\n" > .env \
    && php artisan key:generate --force \
    && composer dump-autoload --optimize \
    && php artisan package:discover --ansi \
    && rm -f .env

RUN mkdir -p \
        storage/logs \
        storage/framework/sessions \
        storage/framework/views \
        storage/framework/cache/data \
        bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
