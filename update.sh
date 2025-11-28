#!/bin/bash

# Update script for pablogfx.com on Hostinger VPS
# Run this script to pull latest changes and restart the application

set -e  # Exit on error

APP_DIR="/var/www/pablogfx.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Updating pablogfx.com...${NC}"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}Running without sudo - some commands may require sudo${NC}"
    SUDO=""
else
    SUDO=""
fi

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Error: Application directory ${APP_DIR} does not exist${NC}"
    exit 1
fi

# Navigate to app directory
cd "$APP_DIR"

# Pull latest changes from git
echo -e "${GREEN}Pulling latest changes from git...${NC}"
git pull origin main

# Install/update dependencies
echo -e "${GREEN}Installing/updating dependencies...${NC}"
npm install

# Build the application
echo -e "${GREEN}Building Next.js application...${NC}"
npm run build

# Restart PM2 process
echo -e "${GREEN}Restarting application...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart pablogfx.com || pm2 start npm --name "pablogfx.com" -- start
    pm2 save
else
    echo -e "${YELLOW}PM2 not found. Please restart the application manually.${NC}"
fi

# Reload nginx (if config changed)
echo -e "${GREEN}Reloading nginx...${NC}"
if command -v nginx &> /dev/null; then
    if nginx -t; then
        systemctl reload nginx
        echo -e "${GREEN}Nginx reloaded${NC}"
    else
        echo -e "${RED}Nginx configuration test failed!${NC}"
        nginx -t
    fi
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Update completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Application should be running at:"
echo "  https://pablogfx.com"
echo "  https://www.pablogfx.com"
echo ""
echo "Check status:"
echo "  pm2 status"
echo "  pm2 logs pablogfx.com"
echo ""

