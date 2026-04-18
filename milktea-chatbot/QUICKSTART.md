# 🚀 Quick Start Guide - 5 Minutes to Running Bot

## Prerequisites
- Node.js 18+ installed
- PostgreSQL running (or use Docker)
- Redis running (or use Docker)
- Telegram account

---

## Option 1: Docker (Easiest - RECOMMENDED)

### Step 1: Get Telegram Bot Token
1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot`
4. Follow instructions
5. Copy your bot token (looks like: `123456:ABC-DEF1234ghIkl...`)

### Step 2: Get Anthropic API Key
1. Go to https://console.anthropic.com/
2. Create account / Log in
3. Go to API Keys
4. Create new key
5. Copy the key (starts with `sk-ant-...`)

### Step 3: Setup Environment
```bash
cd milktea-chatbot
cp .env.example .env
nano .env
```

**Edit these lines in .env:**
```env
TELEGRAM_BOT_TOKEN=your_actual_token_here
ANTHROPIC_API_KEY=your_actual_key_here
DB_PASSWORD=choose_a_strong_password
```

### Step 4: Start Everything
```bash
docker-compose up -d
```

### Step 5: Check Status
```bash
# See if everything is running
docker-compose ps

# View logs
docker-compose logs -f app
```

### Step 6: Test Your Bot
1. Open Telegram
2. Search for your bot name
3. Click START
4. Type: "Xin chào"
5. Type: "Cho mình xem menu"

🎉 **DONE! Your bot is working!**

---

## Option 2: Manual Setup (Without Docker)

### Step 1: Install Dependencies
```bash
# Install Node.js 18 (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Redis
sudo apt install redis-server -y

# Start services
sudo systemctl start postgresql redis-server
```

### Step 2: Setup Database
```bash
# Create database
sudo -u postgres createdb milktea_db

# Create user
sudo -u postgres psql -c "CREATE USER milktea WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE milktea_db TO milktea;"
```

### Step 3: Configure Project
```bash
cd milktea-chatbot
npm install
cp .env.example .env
nano .env
```

**Edit .env:**
```env
TELEGRAM_BOT_TOKEN=your_token
ANTHROPIC_API_KEY=your_key
DB_HOST=localhost
DB_NAME=milktea_db
DB_USER=milktea
DB_PASSWORD=your_password
REDIS_HOST=localhost
```

### Step 4: Run Migration
```bash
npm run migrate
```

### Step 5: Start Bot
```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

### Step 6: Test
Open Telegram and test your bot!

---

## Troubleshooting

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection manually
psql -h localhost -U milktea -d milktea_db
```

### "Cannot connect to Redis"
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

### "Bot not responding"
```bash
# Check logs
docker-compose logs app
# or
npm start

# Verify bot token
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

### "LLM API Error"
```bash
# Check if API key is valid
# Go to https://console.anthropic.com/
# Verify key has credits
```

---

## Testing the Bot

### Test Conversation Flow:
```
You: Xin chào
Bot: [Greets you]

You: Cho mình xem menu
Bot: [Shows menu]

You: Đặt 2 trà sữa trân châu đen size L
Bot: [Adds to cart, confirms]

You: Xem giỏ hàng
Bot: [Shows cart with total]

You: Tính tiền
Bot: [Asks for customer info]

You: Tên: Test User, SĐT: 0912345678, Địa chỉ: 123 Test Street
Bot: [Saves info]

You: Xác nhận đơn, COD
Bot: [Creates order, shows order ID]
```

---

## Useful Commands

### Docker
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f app

# Enter container
docker-compose exec app sh

# Check database
docker-compose exec postgres psql -U postgres -d milktea_db
```

### Manual
```bash
# Start with PM2
pm2 start src/index.js --name milktea-bot

# View logs
pm2 logs milktea-bot

# Restart
pm2 restart milktea-bot

# Stop
pm2 stop milktea-bot
```

---

## Next Steps

1. **Customize System Prompt**
   - Edit `src/services/llm.js`
   - Change shop name, personality

2. **Add More Products**
   - Edit `data/menu.csv`
   - Run: `npm run migrate`

3. **Setup Notifications**
   - Get your Telegram user ID: https://t.me/userinfobot
   - Add to .env: `SHOP_OWNER_TELEGRAM_ID=your_id`

4. **Deploy to Production**
   - See DEPLOYMENT.md for cloud options
   - Heroku, Railway, DigitalOcean

---

## Support

- 📖 Full Documentation: See README.md
- 🚀 Deployment Guide: See DEPLOYMENT.md
- 🧪 Test Scenarios: See tests/TEST_SCENARIOS.md
- 📧 Questions: Create GitHub issue

---

**Happy Coding! 🧋**
