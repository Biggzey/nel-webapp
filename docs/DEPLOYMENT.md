# Deployment Guide

This guide covers deploying the Nel WebApp to a production environment.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v16 or higher)
- Domain name (for production use)
- SSL certificate
- Production server (e.g., AWS EC2, DigitalOcean Droplet)

## Production Build

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create production environment file:
   ```bash
   cp .env.example .env.production
   ```
   Update `.env.production` with production values.

3. Build the application:
   ```bash
   npm run build
   ```

## Server Setup

### Option 1: Traditional Server (e.g., AWS EC2)

1. Update system packages:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. Install PostgreSQL:
   ```bash
   sudo apt install postgresql postgresql-contrib
   ```

4. Configure PostgreSQL:
   ```sql
   CREATE DATABASE nel_webapp;
   CREATE USER nel_app_user WITH PASSWORD 'your_production_password';
   GRANT ALL PRIVILEGES ON DATABASE nel_webapp TO nel_app_user;
   ```

5. Set up SSL with Let's Encrypt:
   ```bash
   sudo apt install certbot
   sudo certbot certonly --standalone -d your-domain.com
   ```

### Option 2: Docker Deployment

1. Build Docker image:
   ```bash
   docker build -t nel-webapp .
   ```

2. Run containers:
   ```bash
   docker-compose up -d
   ```

## Application Deployment

1. Clone repository:
   ```bash
   git clone <repository-url>
   cd nel-webapp
   ```

2. Install dependencies:
   ```bash
   npm install --production
   ```

3. Set up environment:
   - Configure `.env.production`
   - Set up SSL certificates
   - Configure database connection

4. Initialize database:
   ```bash
   npx prisma db push
   ```

5. Start application:
   ```bash
   npm run prod
   ```

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Process Management

### Using PM2

1. Install PM2:
   ```bash
   npm install -g pm2
   ```

2. Start application:
   ```bash
   pm2 start npm --name "nel-webapp" -- run prod
   ```

3. Configure startup:
   ```bash
   pm2 startup
   pm2 save
   ```

## Monitoring Setup

1. Start Prometheus:
   ```bash
   docker-compose up -d prometheus
   ```

2. Start Grafana:
   ```bash
   docker-compose up -d grafana
   ```

## Backup Configuration

1. Set up automated backups:
   ```bash
   # Add to crontab
   0 0 * * * /path/to/backup-script.sh
   ```

2. Configure backup retention:
   - Keep daily backups for 7 days
   - Keep weekly backups for 4 weeks
   - Keep monthly backups for 3 months

## Security Checklist

- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Database passwords secure
- [ ] Environment variables set
- [ ] Rate limiting enabled
- [ ] Monitoring configured
- [ ] Backup system tested
- [ ] Error logging setup
- [ ] Security headers enabled

## Troubleshooting

### Common Issues

1. Application not starting:
   - Check logs: `pm2 logs nel-webapp`
   - Verify environment variables
   - Check port availability

2. Database connection issues:
   - Verify PostgreSQL running
   - Check connection string
   - Verify database user permissions

3. SSL certificate problems:
   - Check certificate paths
   - Verify certificate validity
   - Check Nginx configuration

## Maintenance

1. Regular updates:
   ```bash
   git pull
   npm install
   npm run build
   pm2 restart nel-webapp
   ```

2. Database maintenance:
   ```bash
   # Vacuum database
   psql -U nel_app_user -d nel_webapp -c "VACUUM ANALYZE;"
   ```

3. Log rotation:
   - Configure logrotate
   - Monitor disk space
   - Archive old logs 