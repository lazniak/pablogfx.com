#!/bin/bash

# Quick fix for nginx static files - update existing config

DOMAIN="pablogfx.com"
NGINX_CONF="/etc/nginx/sites-enabled/${DOMAIN}"

if [ ! -f "$NGINX_CONF" ]; then
    echo "Config not found: $NGINX_CONF"
    exit 1
fi

# Backup
cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

# Check if already fixed
if grep -q "location = /background.mp4" "$NGINX_CONF"; then
    echo "Config already has background.mp4 location"
    exit 0
fi

# Create temp file with fix
TMPFILE=$(mktemp)

# Read config and add static files locations before location /
awk '
    /^[[:space:]]*location \/ \{/ {
        # Insert static files locations before location /
        print "    # Serve background.mp4 directly from public directory"
        print "    location = /background.mp4 {"
        print "        root /var/www/pablogfx.com/public;"
        print "        expires 30d;"
        print "        add_header Cache-Control \"public, immutable\";"
        print "        access_log off;"
        print "        sendfile on;"
        print "        tcp_nopush on;"
        print "        tcp_nodelay on;"
        print "    }"
        print ""
        print "    # Serve background.json directly from public directory"
        print "    location = /background.json {"
        print "        root /var/www/pablogfx.com/public;"
        print "        expires 30d;"
        print "        add_header Cache-Control \"public, immutable\";"
        print "        access_log off;"
        print "    }"
        print ""
    }
    { print }
' "$NGINX_CONF" > "$TMPFILE"

mv "$TMPFILE" "$NGINX_CONF"

# Test and reload
if nginx -t; then
    systemctl reload nginx
    echo "Nginx config updated and reloaded successfully"
    echo "Test: curl -I https://pablogfx.com/background.mp4"
else
    echo "Nginx test failed. Restoring backup..."
    cp "${NGINX_CONF}.backup."* "$NGINX_CONF" 2>/dev/null || true
    exit 1
fi

