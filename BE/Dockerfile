FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

# Dùng APP_KEY tạm thời để artisan commands không bị lỗi "No application encryption key"
ENV APP_KEY="base64:3QmX+jV6ka56DK5g56XB8EHJEXgwGrD+bGS26jB4VYo="

RUN composer install --no-interaction --optimize-autoloader --no-dev \
    && php artisan package:discover --ansi

RUN mkdir -p database && touch database/database.sqlite

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Increase PHP upload limits for audio/document file uploads (default is 2MB which is too low)
RUN echo "upload_max_filesize = 100M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 100M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini

EXPOSE 8000

CMD ["sh", "-c", "php artisan config:clear && php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=8000"]
