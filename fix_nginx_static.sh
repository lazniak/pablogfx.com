#!/bin/bash

# Quick fix script to update nginx config for static files

DOMAIN="pablogfx.com"
NGINX_CONF_FILE="/etc/nginx/sites-enabled/${DOMAIN}"

if [ ! -f "$NGINX_CONF_FILE" ]; then
    echo "Nginx config not found: $NGINX_CONF_FILE"
    exit 1
fi

# Backup
cp "$NGINX_CONF_FILE" "${NGINX_CONF_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Check if static files location already exists
if grep -q "location.*background\.mp4" "$NGINX_CONF_FILE"; then
    echo "Static files location already configured"
    exit 0
fi

# Add static files location before proxy_pass
# Find the location / block and add static files before it
sed -i '/location \/ {/,/^    }/{
    /location \/ {/i\
    # Serve static files from public directory directly\
    location ~* ^\/(background\.mp4|background\.json|.*\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|css|js|mp4|mov|avi|webm))$ {\
        root /var/www/pablogfx.com/public;\
        try_files $uri =404;\
        expires 30d;\
        add_header Cache-Control "public, immutable";\
        access_log off;\
        sendfile on;\
        tcp_nopush on;\
        tcp_nodelay on;\
    }\
\
}' "$NGINX_CONF_FILE"

# Test and reload
if nginx -t; then
    systemctl reload nginx
    echo "Nginx config updated and reloaded"
else
    echo "Nginx config test failed. Restoring backup..."
    cp "${NGINX_CONF_FILE}.backup."* "$NGINX_CONF_FILE" 2>/dev/null || true
    exit 1
fi

