# 🧋 Milk Tea Chatbot - AI-Powered Order Management System

An intelligent chatbot for milk tea shops using Large Language Models (LLM) to automate order taking, customer consultation, and payment processing on Telegram.

## 🌟 Features

- **Natural Language Understanding**: Processes Vietnamese (with/without diacritics) naturally
- **Smart Order Management**: Automatically validates orders, calculates prices, manages cart
- **Multi-turn Conversations**: Maintains context across conversation
- **Function Calling**: LLM intelligently calls backend functions to perform actions
- **Real-time Notifications**: Alerts shop owner when new orders arrive
- **Session Management**: Redis-based session storage with automatic timeout
- **Database Persistence**: PostgreSQL for storing orders and products

## 🏗️ Architecture

```
┌─────────────┐
│  Telegram   │
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         Telegram Bot (Telegraf)     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Chat Controller                │
│  - Message Processing               │
│  - Conversation Management          │
└──────────┬─────────────┬────────────┘
           │             │
           ▼             ▼
    ┌───────────┐  ┌──────────────┐
    │ LLM Service│  │   Function   │
    │  (Claude)  │  │   Handler    │
    └───────────┘  └──────┬───────┘
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐  ┌──────────┐
    │  Session │   │ Products │  │  Orders  │
    │  (Redis) │   │  (PG)    │  │  (PG)    │
    └──────────┘   └──────────┘  └──────────┘
```

## 📋 Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 6.x
- Telegram Bot Token (from @BotFather)
- Anthropic API Key (for Claude)

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd milktea-chatbot
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
# Required
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ANTHROPIC_API_KEY=your_anthropic_api_key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=milktea_db
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Database Setup

```bash
# Create database
createdb milktea_db

# Run migration (creates tables and imports menu)
npm run migrate
```

### 4. Start the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### 5. Test the Bot

1. Open Telegram and search for your bot
2. Start a conversation with `/start`
3. Try: "Cho mình xem menu"
4. Try: "Đặt 2 trà sữa trân châu đen size L"

## 📁 Project Structure

```
milktea-chatbot/
├── src/
│   ├── config/           # Database & Redis configuration
│   │   ├── database.js
│   │   └── redis.js
│   ├── models/           # Data models
│   │   ├── Product.js
│   │   ├── Order.js
│   │   └── Session.js
│   ├── services/         # Business logic services
│   │   ├── llm.js        # LLM integration
│   │   ├── functionHandler.js  # Function calling handler
│   │   └── telegram.js   # Telegram bot service
│   ├── controllers/      # Request handlers
│   │   └── chatController.js
│   ├── utils/            # Utilities
│   │   └── migrate.js    # Database migration
│   └── index.js          # Application entry point
├── data/
│   └── menu.csv          # Product catalog
├── tests/                # Test files
├── package.json
├── .env.example
└── README.md
```

## 🔧 Configuration

### LLM Provider

The system currently uses Anthropic Claude, but can be configured for OpenAI:

```env
# For Anthropic (default)
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=your_key

# For OpenAI (alternative)
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
OPENAI_API_KEY=your_key
```

### Session Timeout

```env
SESSION_TIMEOUT=1800  # 30 minutes in seconds
```

### Shop Information

```env
SHOP_NAME=Quán Trà Sữa Mẹ
SHOP_ADDRESS=Số 11 đường D9, Khu Đô Thị Thiên An Nguyên
SHOP_PHONE=0123456789
SHOP_OWNER_TELEGRAM_ID=your_telegram_user_id  # For notifications
```

## 🧪 Testing

### Manual Testing Scenarios

1. **View Menu**
   - "Xem menu"
   - "Menu có gì?"
   - "Cho xem đồ uống"

2. **Order Items**
   - "Cho 2 trà sữa trân châu đen size L"
   - "Thêm 1 cà phê sữa M"
   - "Đặt trà sữa khoai môn không topping"

3. **Modify Order**
   - "Xem giỏ hàng"
   - "Xóa giỏ hàng"

4. **Checkout**
   - "Tính tiền"
   - Provide: name, phone, address
   - "Xác nhận đơn"

### Bot Commands

- `/start` - Start conversation
- `/help` - Show help
- `/menu` - Quick menu view
- `/cart` - View current cart
- `/reset` - Clear session and start over

## 🚢 Deployment

### Docker Deployment (Recommended)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: milktea_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Deploy:

```bash
docker-compose up -d
```

### Cloud Platforms

#### Heroku

```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini
heroku config:set TELEGRAM_BOT_TOKEN=xxx
heroku config:set ANTHROPIC_API_KEY=xxx
git push heroku main
```

#### AWS/GCP/Azure

Use the Docker container with your preferred cloud provider's container service (ECS, Cloud Run, Container Instances).

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### View Logs

```bash
# Docker
docker-compose logs -f app

# PM2
pm2 logs milktea-chatbot
```

### Database Queries

```sql
-- Recent orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- Orders by status
SELECT status, COUNT(*) FROM orders GROUP BY status;

-- Today's revenue
SELECT SUM(total_amount) FROM orders 
WHERE DATE(created_at) = CURRENT_DATE;
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` to version control
2. **Database**: Use strong passwords and restrict network access
3. **API Keys**: Rotate regularly and use different keys for dev/prod
4. **Rate Limiting**: Implemented at 10 messages/minute/user
5. **Input Validation**: All user inputs are validated before database operations

## 💰 Cost Estimation (100 orders/day)

| Service | Monthly Cost |
|---------|--------------|
| Anthropic API (Claude Sonnet) | ~$90 |
| AWS t3.small | $15 |
| PostgreSQL RDS db.t3.micro | $16 |
| Redis Cache | Included |
| **Total** | **~$131** |

*Can be reduced to ~$45/month using Claude Haiku*

## 🐛 Troubleshooting

### Bot not responding

1. Check if bot is running: `curl localhost:3000/health`
2. Verify Telegram token: Test in Telegram
3. Check logs for errors

### Database connection failed

1. Verify PostgreSQL is running
2. Check credentials in `.env`
3. Ensure database exists: `psql -l`

### Redis connection failed

1. Check if Redis is running: `redis-cli ping`
2. Verify Redis host/port in `.env`

### LLM timeout

1. Check API key validity
2. Verify network connectivity
3. Check Anthropic service status

## 📝 License

MIT License - See LICENSE file for details

## 👥 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 📧 Support

For issues and questions:
- Create a GitHub issue
- Email: hr@cas.so

---

**Built for Casso Company Limited - Entry Test 2026**

Intern Software Engineer Application
