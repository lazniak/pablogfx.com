#!/bin/bash

# Script to check SSL certificate configuration

DOMAIN="pablogfx.com"

echo "=== Checking SSL certificates ==="
echo ""
if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    echo "Certificate directory exists: /etc/letsencrypt/live/${DOMAIN}"
    echo ""
    echo "Certificate files:"
    ls -la /etc/letsencrypt/live/${DOMAIN}/
    echo ""
    echo "Certificate info:"
    openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem -text -noout | grep -A 2 "Subject Alternative Name" || openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem -text -noout | grep "Subject:"
    echo ""
else
    echo "No certificate found for ${DOMAIN}"
fi

echo ""
echo "=== Checking nginx configuration ==="
if [ -f "/etc/nginx/sites-enabled/${DOMAIN}" ]; then
    echo "Nginx config for ${DOMAIN}:"
    cat /etc/nginx/sites-enabled/${DOMAIN}
else
    echo "No nginx config found for ${DOMAIN}"
fi

echo ""
echo "=== Testing SSL connection ==="
echo "Testing pablogfx.com (without www):"
echo | openssl s_client -connect pablogfx.com:443 -servername pablogfx.com 2>/dev/null | grep -E "subject=|issuer=|Verify return code" || echo "Connection failed"
echo ""
echo "Testing www.pablogfx.com (with www):"
echo | openssl s_client -connect www.pablogfx.com:443 -servername www.pablogfx.com 2>/dev/null | grep -E "subject=|issuer=|Verify return code" || echo "Connection failed"

echo ""
echo "=== Checking DNS ==="
echo "pablogfx.com resolves to:"
dig +short pablogfx.com || nslookup pablogfx.com | grep "Address:"
echo ""
echo "www.pablogfx.com resolves to:"
dig +short www.pablogfx.com || nslookup www.pablogfx.com | grep "Address:"

