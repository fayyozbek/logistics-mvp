FROM php:8.4-cli-bookworm

# System libraries for PHP extensions (Laravel 13 + Symfony 8 + PostgreSQL)
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
        opcache \
        pcntl \
        pdo \
        pdo_pgsql \
        pgsql \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1

WORKDIR /var/www

# 1. Dependencies (vendor/autoload.php created here)
COPY composer.json composer.lock ./
RUN composer install \
        --no-dev \
        --no-scripts \
        --prefer-dist \
        --no-interaction \
        --optimize-autoloader

# 2. Application source
COPY . .

# 3. Optimise autoload after app classes are present; discover packages (no migrations/seeds).
# APP_KEY is not generated in the image — set it in Render environment variables.
RUN composer dump-autoload --optimize --no-interaction \
    && APP_KEY=base64:YnVpbGRPQkxZQVlLRVk= APP_ENV=production php artisan package:discover --ansi

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
