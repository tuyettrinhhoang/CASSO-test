# 🚀 Deployment Guide - Production Setup

## Prerequisites

- Server with Linux (Ubuntu 20.04+ recommended)
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt free option)
- Telegram Bot Token
- Anthropic API Key

---

## Option 1: Docker Deployment (Recommended)

### Step 1: Server Setup

```bash
# SSH into your server
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Clone Repository

```bash
# Clone your repository
git clone https://github.com/your-username/milktea-chatbot.git
cd milktea-chatbot

# Or upload files via SCP
scp -r milktea-chatbot/ user@server-ip:/home/user/
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Critical variables to set:**
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
DB_PASSWORD=strong_password_here
SHOP_OWNER_TELEGRAM_ID=123456789
```

### Step 4: Deploy

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### Step 5: Verify Deployment

```bash
# Health check
curl http://localhost:3000/health

# Should return: {"status":"ok","timestamp":"...","service":"Milk Tea Chatbot"}
```

### Step 6: Setup Nginx Reverse Proxy (Optional)

```bash
# Install Nginx
sudo apt install nginx -y

# Create config
sudo nano /etc/nginx/sites-available/milktea-bot
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/milktea-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

---

## Option 2: Manual Deployment (Without Docker)

### Step 1: Install Dependencies

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Redis
sudo apt install redis-server -y

# Start services
sudo systemctl start postgresql
sudo systemctl start redis-server
sudo systemctl enable postgresql
sudo systemctl enable redis-server
```

### Step 2: Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE milktea_db;
CREATE USER milktea_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE milktea_db TO milktea_user;
\q
```

### Step 3: Application Setup

```bash
# Clone repository
git clone https://github.com/your-username/milktea-chatbot.git
cd milktea-chatbot

# Install dependencies
npm install --production

# Configure environment
cp .env.example .env
nano .env
```

Update `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=milktea_db
DB_USER=milktea_user
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
# ... other configs
```

### Step 4: Run Migration

```bash
npm run migrate
```

### Step 5: Setup PM2 for Process Management

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application
pm2 start src/index.js --name milktea-chatbot

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions from the command output

# Verify
pm2 status
```

### Step 6: Monitor

```bash
# View logs
pm2 logs milktea-chatbot

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart milktea-chatbot
```

---

## Option 3: Cloud Platform Deployment

### A. Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Add Redis
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set TELEGRAM_BOT_TOKEN=your_token
heroku config:set ANTHROPIC_API_KEY=your_key
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Run migration
heroku run npm run migrate

# View logs
heroku logs --tail
```

### B. Railway.app

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add PostgreSQL and Redis from "New" menu
5. Add environment variables in Settings
6. Deploy automatically on git push

### C. Render.com

1. Go to https://render.com
2. Create "New Web Service"
3. Connect GitHub repository
4. Add PostgreSQL and Redis instances
5. Set environment variables
6. Deploy

### D. DigitalOcean App Platform

```bash
# Install doctl
snap install doctl

# Authenticate
doctl auth init

# Create app
doctl apps create --spec app.yaml
```

Create `app.yaml`:
```yaml
name: milktea-chatbot
services:
  - name: web
    github:
      repo: your-username/milktea-chatbot
      branch: main
    build_command: npm install
    run_command: npm start
    envs:
      - key: TELEGRAM_BOT_TOKEN
        value: ${TELEGRAM_BOT_TOKEN}
      - key: ANTHROPIC_API_KEY
        value: ${ANTHROPIC_API_KEY}
databases:
  - name: db
    engine: PG
    version: "14"
  - name: redis
    engine: REDIS
    version: "6"
```

---

## Post-Deployment Checklist

- [ ] Health check endpoint responds: `curl https://your-domain.com/health`
- [ ] Bot responds on Telegram
- [ ] Database connection working
- [ ] Redis connection working
- [ ] Menu loaded correctly
- [ ] Can create orders
- [ ] Owner notifications working
- [ ] Logs are being collected
- [ ] Monitoring setup (optional: Grafana, Sentry)
- [ ] Backup strategy configured
- [ ] SSL certificate valid
- [ ] Domain DNS pointing correctly

---

## Monitoring & Maintenance

### Daily Checks

```bash
# Check application status
pm2 status
# or
docker-compose ps

# Check disk space
df -h

# Check memory
free -h

# Recent errors in logs
pm2 logs milktea-chatbot --lines 50 --err
```

### Weekly Tasks

- Review error logs
- Check database size growth
- Verify backup system working
- Review performance metrics

### Monthly Tasks

- Update dependencies: `npm update`
- Rotate logs if they're too large
- Review and optimize database queries
- Check SSL certificate expiration

---

## Backup Strategy

### Database Backup (Automated)

```bash
# Create backup script
nano /home/user/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/user/backups"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec milktea-postgres pg_dump -U postgres milktea_db > $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /home/user/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/user/backup-db.sh
```

---

## Troubleshooting Production Issues

### Bot Not Responding

```bash
# Check if container is running
docker-compose ps

# Check logs for errors
docker-compose logs app --tail 100

# Restart services
docker-compose restart app
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Restart if needed
docker-compose restart app

# Consider upgrading server resources
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection from app
docker-compose exec app psql -h postgres -U postgres -d milktea_db

# Restart database
docker-compose restart postgres
```

### Rate Limiting Issues

If too many requests:
```bash
# Check Redis keys
docker-compose exec redis redis-cli
> KEYS *
> GET session:USER_ID
```

---

## Scaling Considerations

### Horizontal Scaling

For high traffic, use load balancer:

```nginx
upstream milktea_backend {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    location / {
        proxy_pass http://milktea_backend;
    }
}
```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX idx_products_category_available ON products(category, available);

-- Vacuum regularly
VACUUM ANALYZE orders;
VACUUM ANALYZE products;
```

---

## Security Best Practices

1. **Never commit `.env` file**
2. **Use strong passwords** (min 20 characters)
3. **Restrict database access** to localhost only
4. **Enable firewall:**
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```
5. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
6. **Rotate API keys** every 90 days
7. **Monitor logs** for suspicious activity
8. **Use HTTPS only** (no HTTP)

---

## Cost Optimization

### Reduce LLM Costs

1. Use Claude Haiku instead of Sonnet (10x cheaper)
2. Cache common responses (menu, prices)
3. Implement response templates for simple queries
4. Set max_tokens appropriately

### Reduce Infrastructure Costs

1. Use ARM-based instances (cheaper)
2. Setup auto-scaling (scale down during low traffic)
3. Use managed services for DB/Redis (less maintenance)
4. Optimize Docker images (multi-stage builds)

---

## Support & Documentation

- **GitHub Issues:** Report bugs and feature requests
- **Email:** hr@cas.so
- **Logs Location:** 
  - Docker: `docker-compose logs`
  - PM2: `~/.pm2/logs/`
- **Database Backups:** `/home/user/backups/`

---

**Deployment Guide Version:** 1.0
**Last Updated:** 2026-04-17
**For:** Casso Company Limited Entry Test
