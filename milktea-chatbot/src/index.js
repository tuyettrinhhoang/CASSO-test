require('dotenv').config();
const express = require('express');
const telegramBot = require('./services/telegram');
const migrate = require('./utils/migrate');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Milk Tea Chatbot'
  });
});

// Simple status page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Milk Tea Chatbot</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #2E75B6; }
          .status { 
            color: #28a745; 
            font-weight: bold;
          }
          .info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🧋 Milk Tea Chatbot</h1>
          <p class="status">✅ System is running</p>
          
          <div class="info">
            <h3>Telegram Bot</h3>
            <p>Bot đang hoạt động và sẵn sàng nhận đơn hàng!</p>
            <p>Tìm bot trên Telegram và bắt đầu trò chuyện.</p>
          </div>

          <div class="info">
            <h3>Features</h3>
            <ul>
              <li>Tự động tư vấn và nhận đơn hàng</li>
              <li>Tính tiền chính xác</li>
              <li>Xử lý tiếng Việt tự nhiên</li>
              <li>Lưu trữ đơn hàng</li>
            </ul>
          </div>

          <div class="info">
            <h3>Tech Stack</h3>
            <p>LLM: Claude Sonnet 4 | Platform: Telegram | DB: PostgreSQL + Redis</p>
          </div>
        </div>
      </body>
    </html>
  `);
});

// PayOS webhook endpoint (placeholder)
app.post('/webhook/payos', async (req, res) => {
  try {
    console.log('PayOS webhook received:', req.body);
    // TODO: Implement PayOS webhook verification and processing
    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Start server
async function start() {
  try {
    // Run database migration
    console.log('Running database migration...');
    await migrate();

    // Start Telegram bot
    console.log('Starting Telegram bot...');
    await telegramBot.start();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log('\n🤖 Bot is ready to receive orders!\n');
    });

    // Graceful shutdown
    process.once('SIGINT', () => {
      console.log('\nShutting down gracefully...');
      telegramBot.stop();
      process.exit(0);
    });

    process.once('SIGTERM', () => {
      console.log('\nShutting down gracefully...');
      telegramBot.stop();
      process.exit(0);
    });

  } catch (err) {
    console.error('Failed to start application:', err);
    process.exit(1);
  }
}

// Start the application
start();
