#!/bin/bash

# Fix script for Next.js static files 404 errors
# Run on server: bash fix_static_files.sh

set -e

DOMAIN="pablogfx.com"
APP_DIR="/var/www/${DOMAIN}"
NGINX_CONF="/etc/nginx/sites-enabled/${DOMAIN}"

echo "=== Fixing Next.js static files ==="

# 1. Pull latest config
cd "$APP_DIR"
echo "1. Pulling latest configuration..."
git pull origin main

# 2. Copy nginx config
echo "2. Updating Nginx configuration..."
sudo cp nginx_pablogfx_com.conf "$NGINX_CONF"

# 3. Check if .next directory exists
echo "3. Checking .next directory..."
if [ ! -d "$APP_DIR/.next" ]; then
    echo "ERROR: .next directory not found! Need to rebuild."
    echo "Running: npm run build"
    npm run build
fi

# 4. Check static files
echo "4. Checking static files..."
if [ ! -d "$APP_DIR/.next/static" ]; then
    echo "ERROR: .next/static directory not found! Need to rebuild."
    npm run build
fi

# 5. Fix permissions
echo "5. Fixing permissions..."
sudo chown -R www-data:www-data "$APP_DIR/.next"
sudo chmod -R 755 "$APP_DIR/.next"

# 6. Test nginx config
echo "6. Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✓ Nginx configuration is valid"
else
    echo "✗ Nginx configuration test failed!"
    exit 1
fi

# 7. Reload nginx
echo "7. Reloading Nginx..."
sudo systemctl reload nginx

# 8. Test a static file
echo "8. Testing static file access..."
STATIC_FILE=$(find "$APP_DIR/.next/static" -name "*.js" -type f | head -1)
if [ -n "$STATIC_FILE" ]; then
    REL_PATH=$(echo "$STATIC_FILE" | sed "s|$APP_DIR/.next/static/||")
    echo "Testing: /_next/static/$REL_PATH"
    curl -I "https://${DOMAIN}/_next/static/$REL_PATH" 2>/dev/null | head -1
else
    echo "WARNING: No static files found. May need to rebuild."
fi

echo ""
echo "=== Done ==="
echo "If files still return 404, try:"
echo "  1. npm run build"
echo "  2. pm2 restart all"
echo "  3. Check browser cache (Ctrl+Shift+R)"

