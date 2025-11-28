#!/bin/bash

# Script to check existing nginx configurations and services

echo "=== Checking existing nginx sites ==="
echo ""
echo "Available sites:"
ls -la /etc/nginx/sites-available/
echo ""
echo "Enabled sites:"
ls -la /etc/nginx/sites-enabled/
echo ""
echo "=== Current pablogfx.com config ==="
if [ -f /etc/nginx/sites-enabled/pablogfx.com ]; then
    cat /etc/nginx/sites-enabled/pablogfx.com
else
    echo "No pablogfx.com config found"
fi
echo ""
echo "=== Testing nginx configuration ==="
nginx -t
echo ""
echo "=== Checking if certbot certificates exist ==="
ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "No certificates found"
echo ""
echo "=== Checking running services on port 3663 ==="
netstat -tulpn | grep 3663 || echo "Nothing running on port 3663"
echo ""
echo "=== Checking PM2 processes ==="
pm2 list 2>/dev/null || echo "PM2 not installed or no processes"

