#!/bin/bash

# Quick fix for 502 Bad Gateway - just restart everything
# Run on server: bash quick_fix_502.sh

APP_DIR="/var/www/pablogfx.com"
APP_NAME="pablogfx.com"

echo "=== Quick Fix for 502 Bad Gateway ==="

cd "$APP_DIR"

# 1. Pull latest
echo "1. Pulling latest changes..."
git pull origin main

# 2. Install dependencies
echo "2. Installing dependencies..."
npm install

# 3. Build
echo "3. Building application..."
npm run build

# 4. Restart PM2
echo "4. Restarting PM2 process..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start npm --name "$APP_NAME" -- start
pm2 save

# 5. Wait a bit
echo "5. Waiting for application to start..."
sleep 5

# 6. Check status
echo "6. Checking status..."
pm2 status "$APP_NAME"

# 7. Test connection
echo "7. Testing connection..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3663" | grep -q "200\|301\|302"; then
    echo "✓ Application is responding!"
else
    echo "✗ Application not responding. Check logs:"
    pm2 logs "$APP_NAME" --lines 20
fi

# 8. Reload nginx
echo "8. Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "=== Done ==="
echo "Check: pm2 logs $APP_NAME"

