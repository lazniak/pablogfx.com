#!/bin/bash

# Fix 502 Bad Gateway error
# Run on server: bash fix_502_gateway.sh

set -e

APP_DIR="/var/www/pablogfx.com"
APP_NAME="pablogfx.com"
PORT=3663

echo "=== Diagnosing 502 Bad Gateway ==="
echo ""

# 1. Check if PM2 is installed
echo "1. Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "✗ PM2 not found! Installing..."
    npm install -g pm2
else
    echo "✓ PM2 is installed"
fi

# 2. Check PM2 status
echo ""
echo "2. Checking PM2 process status..."
pm2 status

# 3. Check if process is running
echo ""
echo "3. Checking if $APP_NAME is running..."
if pm2 list | grep -q "$APP_NAME"; then
    STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.status" 2>/dev/null || echo "unknown")
    echo "  Process exists, status: $STATUS"
    
    if [ "$STATUS" != "online" ]; then
        echo "  ✗ Process is not online! Restarting..."
        pm2 restart "$APP_NAME" || pm2 delete "$APP_NAME" && pm2 start npm --name "$APP_NAME" -- start
    else
        echo "  ✓ Process is online"
    fi
else
    echo "  ✗ Process not found! Starting..."
    cd "$APP_DIR"
    if [ -f ".env" ]; then
        pm2 start npm --name "$APP_NAME" -- start --env production
    else
        pm2 start npm --name "$APP_NAME" -- start
    fi
    pm2 save
fi

# 4. Check if port is listening
echo ""
echo "4. Checking if port $PORT is listening..."
if netstat -tuln 2>/dev/null | grep -q ":$PORT " || ss -tuln 2>/dev/null | grep -q ":$PORT "; then
    echo "  ✓ Port $PORT is listening"
else
    echo "  ✗ Port $PORT is NOT listening!"
    echo "  Checking logs..."
    pm2 logs "$APP_NAME" --lines 20 --nostream
    echo ""
    echo "  Attempting to restart..."
    pm2 restart "$APP_NAME"
    sleep 3
    if netstat -tuln 2>/dev/null | grep -q ":$PORT " || ss -tuln 2>/dev/null | grep -q ":$PORT "; then
        echo "  ✓ Port $PORT is now listening"
    else
        echo "  ✗ Still not listening. Check logs:"
        echo "    pm2 logs $APP_NAME"
    fi
fi

# 5. Test local connection
echo ""
echo "5. Testing local connection to port $PORT..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" | grep -q "200\|301\|302"; then
    echo "  ✓ Application responds on localhost:$PORT"
else
    echo "  ✗ Application does not respond on localhost:$PORT"
    echo "  Recent logs:"
    pm2 logs "$APP_NAME" --lines 30 --nostream
fi

# 6. Check nginx connection
echo ""
echo "6. Testing nginx proxy connection..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" | grep -q "200\|301\|302"; then
    echo "  ✓ Nginx should be able to connect"
else
    echo "  ✗ Nginx cannot connect - application not responding"
fi

# 7. Check nginx config
echo ""
echo "7. Checking nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "test is successful"; then
    echo "  ✓ Nginx configuration is valid"
    echo "  Reloading nginx..."
    sudo systemctl reload nginx
else
    echo "  ✗ Nginx configuration has errors:"
    sudo nginx -t
fi

# 8. Check if .next directory exists
echo ""
echo "8. Checking build files..."
if [ -d "$APP_DIR/.next" ]; then
    echo "  ✓ .next directory exists"
else
    echo "  ✗ .next directory not found! Building..."
    cd "$APP_DIR"
    npm run build
fi

# 9. Final status
echo ""
echo "=== Final Status ==="
pm2 status "$APP_NAME"
echo ""
echo "Test the application:"
echo "  curl -I http://localhost:$PORT"
echo ""
echo "Check logs:"
echo "  pm2 logs $APP_NAME"
echo ""
echo "If still 502, check:"
echo "  1. pm2 logs $APP_NAME --lines 50"
echo "  2. sudo tail -f /var/log/nginx/error.log"
echo "  3. Check if port $PORT is correct in package.json"

