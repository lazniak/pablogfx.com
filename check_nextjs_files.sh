#!/bin/bash

# Script to check Next.js build files

APP_DIR="/var/www/pablogfx.com"

echo "=== Checking Next.js build directory ==="
echo ""
if [ -d "$APP_DIR/.next" ]; then
    echo "✓ .next directory exists"
    echo ""
    echo "Contents of .next:"
    ls -la "$APP_DIR/.next/" | head -20
    echo ""
    if [ -d "$APP_DIR/.next/static" ]; then
        echo "✓ .next/static directory exists"
        echo ""
        echo "Contents of .next/static:"
        ls -la "$APP_DIR/.next/static/" | head -20
        echo ""
        if [ -d "$APP_DIR/.next/static/chunks" ]; then
            echo "✓ .next/static/chunks directory exists"
            echo ""
            echo "Sample files in chunks:"
            ls -la "$APP_DIR/.next/static/chunks/" | head -10
        else
            echo "✗ .next/static/chunks directory NOT found"
        fi
    else
        echo "✗ .next/static directory NOT found"
    fi
else
    echo "✗ .next directory NOT found - need to run 'npm run build'"
fi

echo ""
echo "=== Testing file access ==="
if [ -f "$APP_DIR/.next/static/chunks/webpack-91b2d14d0f678b80.js" ]; then
    echo "✓ File exists: webpack-91b2d14d0f678b80.js"
    ls -lh "$APP_DIR/.next/static/chunks/webpack-91b2d14d0f678b80.js"
else
    echo "✗ File NOT found: webpack-91b2d14d0f678b80.js"
    echo "Looking for webpack files:"
    find "$APP_DIR/.next/static" -name "*webpack*" 2>/dev/null | head -5
fi

