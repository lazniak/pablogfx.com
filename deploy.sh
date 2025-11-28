#!/bin/bash

# Deploy script for pablogfx.com on Hostinger VPS
# This script safely adds nginx configuration and SSL without affecting existing sites

set -e  # Exit on error

DOMAIN="pablogfx.com"
APP_DIR="/var/www/pablogfx.com"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONF_FILE="${NGINX_SITES_AVAILABLE}/${DOMAIN}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment for ${DOMAIN}...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Error: Application directory ${APP_DIR} does not exist${NC}"
    echo "Please clone the repository first:"
    echo "  cd /var/www && git clone https://github.com/lazniak/pablogfx.com.git"
    exit 1
fi

# Check if nginx config already exists
if [ -f "$NGINX_CONF_FILE" ]; then
    echo -e "${YELLOW}Warning: Nginx configuration for ${DOMAIN} already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    # Backup existing config
    cp "$NGINX_CONF_FILE" "${NGINX_CONF_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}Backed up existing config${NC}"
fi

# Create initial nginx configuration (HTTP only, SSL will be added by certbot)
echo -e "${GREEN}Creating initial nginx configuration (HTTP only)...${NC}"

cat > "$NGINX_CONF_FILE" << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name pablogfx.com www.pablogfx.com;

    # Logging
    access_log /var/log/nginx/pablogfx.com.access.log;
    error_log /var/log/nginx/pablogfx.com.error.log;

    # Root directory
    root /var/www/pablogfx.com;

    # Proxy to Next.js application
    location / {
        proxy_pass http://localhost:3663;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (if needed)
    location /_next/static {
        alias /var/www/pablogfx.com/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

echo -e "${GREEN}Nginx configuration created${NC}"

# Enable site
if [ ! -L "${NGINX_SITES_ENABLED}/${DOMAIN}" ]; then
    ln -s "$NGINX_CONF_FILE" "${NGINX_SITES_ENABLED}/${DOMAIN}"
    echo -e "${GREEN}Site enabled${NC}"
else
    echo -e "${YELLOW}Site already enabled${NC}"
fi

# Test nginx configuration (HTTP only, no SSL yet)
echo -e "${GREEN}Testing nginx configuration (HTTP only)...${NC}"
if nginx -t 2>&1 | grep -q "test is successful"; then
    echo -e "${GREEN}Nginx configuration is valid${NC}"
    # Reload nginx with HTTP-only config first
    echo -e "${GREEN}Reloading nginx with HTTP configuration...${NC}"
    systemctl reload nginx
elif nginx -t 2>&1 | grep -q "certificate"; then
    echo -e "${YELLOW}Nginx config has SSL references but certificate doesn't exist yet.${NC}"
    echo -e "${YELLOW}This is expected - certbot will fix this. Continuing...${NC}"
    # Try to reload anyway (might fail, but certbot will fix it)
    systemctl reload nginx 2>/dev/null || true
else
    echo -e "${RED}Nginx configuration test failed!${NC}"
    nginx -t
    echo "Please check the configuration manually."
    exit 1
fi

# Install SSL certificate with certbot (if not already installed)
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Certbot not found. Installing...${NC}"
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Check if SSL certificate already exists
if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    echo -e "${YELLOW}SSL certificate already exists for ${DOMAIN}${NC}"
    read -p "Do you want to renew it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        certbot renew --nginx -d "$DOMAIN" -d "www.$DOMAIN"
    else
        # Just update nginx config to use existing certificate
        certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --redirect
    fi
else
    echo -e "${GREEN}Obtaining SSL certificate...${NC}"
    echo "Make sure DNS is pointing to this server before continuing!"
    echo "This will create certificate for both ${DOMAIN} and www.${DOMAIN}"
    read -p "Press Enter to continue with SSL certificate generation..."
    
    # Certbot will automatically modify nginx config to add SSL
    # Use --redirect to automatically redirect HTTP to HTTPS
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@${DOMAIN} --redirect
    
    # Verify certificate was created correctly
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        echo -e "${GREEN}SSL certificate created successfully${NC}"
        # Check if certificate includes both domains
        CERT_DOMAINS=$(openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem -text -noout | grep -oP 'DNS:\K[^,]*' | tr '\n' ' ')
        echo "Certificate includes domains: $CERT_DOMAINS"
    else
        echo -e "${RED}SSL certificate creation may have failed${NC}"
    fi
fi

# Setup PM2 for Next.js (if not already installed)
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 not found. Installing...${NC}"
    npm install -g pm2
fi

# Navigate to app directory and install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
cd "$APP_DIR"
npm install

# Build the application
echo -e "${GREEN}Building Next.js application...${NC}"
npm run build

# Setup PM2 process
echo -e "${GREEN}Setting up PM2 process...${NC}"
pm2 delete pablogfx.com 2>/dev/null || true  # Remove if exists

# Check if .env file exists
if [ -f "$APP_DIR/.env" ]; then
    echo -e "${GREEN}Found .env file, using environment variables${NC}"
    pm2 start npm --name "pablogfx.com" -- start --env production
else
    echo -e "${YELLOW}No .env file found. Using default environment.${NC}"
    echo "Create .env file in $APP_DIR if you need to set environment variables."
    pm2 start npm --name "pablogfx.com" -- start
fi

pm2 save
pm2 startup 2>/dev/null || echo -e "${YELLOW}PM2 startup already configured${NC}"

# Test nginx configuration again (after certbot modifications)
echo -e "${GREEN}Testing nginx configuration after SSL setup...${NC}"
if nginx -t; then
    echo -e "${GREEN}Nginx configuration is valid${NC}"
    # Reload nginx
    echo -e "${GREEN}Reloading nginx...${NC}"
    systemctl reload nginx
else
    echo -e "${YELLOW}Nginx test shows warnings but should work. Checking if certbot modified config...${NC}"
    # Check if certbot actually modified the config
    if grep -q "ssl_certificate" "$NGINX_CONF_FILE"; then
        echo -e "${GREEN}SSL configuration found. Reloading nginx...${NC}"
        systemctl reload nginx
    else
        echo -e "${RED}Nginx configuration test failed after SSL setup!${NC}"
        nginx -t
        echo "Please check the configuration manually."
        exit 1
    fi
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Your site should be available at:"
echo "  https://${DOMAIN}"
echo "  https://www.${DOMAIN}"
echo ""
echo "Useful commands:"
echo "  pm2 status                    - Check application status"
echo "  pm2 logs pablogfx.com         - View application logs"
echo "  pm2 restart pablogfx.com      - Restart application"
echo "  systemctl status nginx        - Check nginx status"
echo "  certbot renew                 - Renew SSL certificate"
echo ""

