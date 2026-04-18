const { Telegraf } = require('telegraf');
const chatController = require('../controllers/chatController');
require('dotenv').config();

class TelegramBot {
  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.setupHandlers();
  }

  setupHandlers() {
    // Start command
    this.bot.start((ctx) => {
      const welcomeMessage = `Xin chào! 👋

Mình là bot tư vấn của ${process.env.SHOP_NAME || 'Quán Trà Sữa'}.

🧋 Bạn muốn:
• Xem menu
• Đặt món
• Hỏi về món nào đó

Cứ nhắn thoải mái nhé! 😊`;

      ctx.reply(welcomeMessage);
    });

    // Help command
    this.bot.help((ctx) => {
      const helpMessage = `📖 Hướng dẫn sử dụng:

1️⃣ Xem menu: "Cho mình xem menu" hoặc "Menu có gì?"
2️⃣ Đặt món: "Cho mình 2 trà sữa trân châu size L"
3️⃣ Xem giỏ: "Xem giỏ hàng"
4️⃣ Thanh toán: "Tính tiền" hoặc "Thanh toán"

💡 Tips:
- Nói tự nhiên như nhắn tin bình thường
- Có thể gõ có dấu hoặc không dấu đều được
- Bot sẽ hỏi lại nếu thiếu thông tin

Lệnh hữu ích:
/menu - Xem menu nhanh
/cart - Xem giỏ hàng
/reset - Bắt đầu lại từ đầu`;

      ctx.reply(helpMessage);
    });

    // Menu command
    this.bot.command('menu', async (ctx) => {
      const userId = ctx.from.id.toString();
      const response = await chatController.processMessage(userId, 'Cho tôi xem menu đầy đủ');
      ctx.reply(response.response);
    });

    // Cart command
    this.bot.command('cart', async (ctx) => {
      const userId = ctx.from.id.toString();
      const response = await chatController.processMessage(userId, 'Xem giỏ hàng của tôi');
      ctx.reply(response.response);
    });

    // Reset command
    this.bot.command('reset', async (ctx) => {
      const userId = ctx.from.id.toString();
      await chatController.resetSession(userId);
      ctx.reply('✅ Đã reset! Bắt đầu lại từ đầu nhé.\n\nBạn cần gì ạ? 😊');
    });

    // Handle all text messages
    this.bot.on('text', async (ctx) => {
      const userId = ctx.from.id.toString();
      const userMessage = ctx.message.text;

      // Skip if it's a command (already handled above)
      if (userMessage.startsWith('/')) {
        return;
      }

      try {
        // Show typing indicator
        await ctx.sendChatAction('typing');

        // Process message
        const result = await chatController.processMessage(userId, userMessage);

        // Send response
        await ctx.reply(result.response);

      } catch (err) {
        console.error('Error handling message:', err);
        ctx.reply('Xin lỗi, có lỗi xảy ra. Vui lòng thử lại! 🙏');
      }
    });

    // Error handler
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
      ctx.reply('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau! 🙏');
    });
  }

  async start() {
    try {
      await this.bot.launch();
      console.log('✅ Telegram bot started successfully!');
      console.log(`Bot username: @${this.bot.botInfo.username}`);
    } catch (err) {
      console.error('Failed to start Telegram bot:', err);
      throw err;
    }
  }

  stop() {
    this.bot.stop('SIGINT');
    console.log('Telegram bot stopped');
  }

  async sendMessageToOwner(message) {
    try {
      const ownerId = process.env.SHOP_OWNER_TELEGRAM_ID;
      if (ownerId) {
        await this.bot.telegram.sendMessage(ownerId, message);
      }
    } catch (err) {
      console.error('Error sending message to owner:', err);
    }
  }

  async notifyNewOrder(order) {
    const message = `🔔 ĐơN HÀNG MỚI #${order.order_id.substring(0, 8)}

👤 Khách: ${order.customer_name}
📞 SĐT: ${order.customer_phone}
📍 Địa chỉ: ${order.customer_address}

🧋 Món đặt:
${JSON.parse(order.items).map((item, i) => 
  `${i+1}. ${item.name} (${item.size}) x${item.quantity}${
    item.toppings.length > 0 ? '\n   + ' + item.toppings.map(t => t.name).join(', ') : ''
  }`
).join('\n')}

💰 Tổng: ${this.formatMoney(order.total_amount)}
💳 Thanh toán: ${order.payment_method === 'COD' ? 'Tiền mặt' : 'Chuyển khoản'}

⏰ ${new Date(order.created_at).toLocaleString('vi-VN')}`;

    await this.sendMessageToOwner(message);
  }

  formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }
}

module.exports = new TelegramBot();
