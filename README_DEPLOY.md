# Deployment Guide for pablogfx.com

## Prerequisites

1. **DNS Configuration**: Make sure your domain `pablogfx.com` and `www.pablogfx.com` point to your VPS IP address
2. **SSH Access**: You need root or sudo access to the VPS
3. **Repository Cloned**: The repository should be cloned to `/var/www/pablogfx.com`

## Quick Deployment

1. **Connect to your VPS via SSH:**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Navigate to the application directory:**
   ```bash
   cd /var/www/pablogfx.com
   ```

3. **Pull the latest changes:**
   ```bash
   git pull origin main
   ```

4. **Run the deployment script:**
   ```bash
   sudo bash deploy.sh
   ```

## What the Script Does

The deployment script (`deploy.sh`) will:

1. ✅ Check if the application directory exists
2. ✅ Create nginx configuration for `pablogfx.com` and `www.pablogfx.com`
3. ✅ Enable the site in nginx
4. ✅ Test nginx configuration
5. ✅ Install/configure SSL certificate using Let's Encrypt (certbot)
6. ✅ Install PM2 (if not installed) for process management
7. ✅ Install npm dependencies
8. ✅ Build the Next.js application
9. ✅ Start the application with PM2
10. ✅ Reload nginx

## Manual Steps (if needed)

### If DNS is not ready yet:

You can still run the script, but skip SSL certificate generation. The script will create the nginx config and you can add SSL later:

```bash
# After DNS is configured, run:
sudo certbot --nginx -d pablogfx.com -d www.pablogfx.com
```

### Check Application Status

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs pablogfx.com

# Restart application
pm2 restart pablogfx.com
```

### Check Nginx Status

```bash
# Check nginx status
sudo systemctl status nginx

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### SSL Certificate Renewal

SSL certificates are automatically renewed by certbot. You can also manually renew:

```bash
sudo certbot renew
```

## Troubleshooting

### Port 3663 already in use

If port 3663 is already in use, you can either:
1. Change the port in `package.json` and update nginx config
2. Stop the conflicting service

### Nginx configuration conflicts

The script creates a backup of existing configs. If there are issues:
- Check `/etc/nginx/sites-available/pablogfx.com.backup.*` for backups
- Review nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### Application not starting

Check PM2 logs:
```bash
pm2 logs pablogfx.com --lines 50
```

### Environment Variables

If you need to set environment variables (like `GEMINI_API_KEY`), create a `.env` file in the app directory:

```bash
cd /var/www/pablogfx.com
nano .env
```

Add your variables:
```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3-pro-preview
```

Then restart PM2:
```bash
pm2 restart pablogfx.com
```

## Security Notes

- The script only modifies nginx configuration for `pablogfx.com`
- Existing sites are not affected
- SSL certificates are automatically configured
- Security headers are included in the nginx config

## Updating the Application

To update the application after making changes:

```bash
cd /var/www/pablogfx.com
git pull origin main
npm install
npm run build
pm2 restart pablogfx.com
```

