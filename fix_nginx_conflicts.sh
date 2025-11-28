#!/bin/bash

# Script to fix nginx conflicts by moving backup files

echo "Moving backup files from sites-enabled to sites-available..."

# Move backup files
sudo mv /etc/nginx/sites-enabled/pablogfx.com.backup.* /etc/nginx/sites-available/ 2>/dev/null || true

echo "Backup files moved."
echo ""
echo "Current files in sites-enabled:"
ls -la /etc/nginx/sites-enabled/ | grep pablogfx

echo ""
echo "Testing nginx configuration..."
sudo nginx -t

