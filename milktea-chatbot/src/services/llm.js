const OpenAI = require('openai');
require('dotenv').config();

class LLMService {
  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.LLM_MODEL || 'gpt-4o-mini';
    this.menuCache = null;
  }

  async loadMenuToContext() {
    if (!this.menuCache) {
      try {
        const Product = require('../models/Product');
        const all = await Product.getAll();
        this.menuCache = all.map((p) => ({
          id: p.item_id, name: p.name, category: p.category,
          price_m: p.price_m, price_l: p.price_l,
        }));
      } catch (err) {
        console.error('Error loading menu:', err);
        this.menuCache = [];
      }
    }
    return this.menuCache;
  }

  getSystemPrompt() {
    return `Bạn là trợ lý bán hàng thân thiện của quán "${process.env.SHOP_NAME || 'Trà Sữa Mẹ'}".
Xưng "mình", gọi khách là "bạn". Dùng emoji vừa phải. Trả lời ngắn gọn, tự nhiên.

━━━━━ QUY TẮC BẮT BUỘC ━━━━━

[1] KHI KHÁCH ĐẶT MÓN → BẮT BUỘC gọi add_to_cart NGAY, KHÔNG chat lại thông tin.
    Ví dụ: "cho 2 trà sữa size L" → GỌI add_to_cart, KHÔNG nói "Bạn cần xác nhận lại..."
    Ví dụ: "đặt 1 trà sữa truyền thống L thêm trân châu đen" → GỌI add_to_cart

[2] Sau khi add_to_cart thành công → hiển thị giá ngay:
    Format: "✅ Đã thêm [tên món] size [S] x[số lượng]\n💰 [base] + topping [X] = [tổng]/món → Tổng: [tổng đơn]"

[3] "bao nhiêu tiền / hết bao nhiêu / giá bao nhiêu" → gọi calculate_total (KHÔNG gọi confirm_order)

[4] confirm_order CHỈ được gọi khi:
    - Khách nói RÕ RÀNG: "xác nhận", "chốt đơn", "đặt luôn", "ok đặt"
    - Giỏ có món
    - Đã có tên + SĐT + địa chỉ đầy đủ

[5] Khi thiếu thông tin đặt món:
    - Thiếu SIZE → hỏi: "Bạn muốn size M hay L ạ?"
    - Thiếu tên món → hỏi lại, KHÔNG tự đặt
    - Số lượng không rõ → mặc định = 1

━━━━━ CÁC FUNCTION ━━━━━

FUNCTION NÀO → KHI NÀO:
• get_menu          → "xem menu", "menu có gì", "cho mình xem"
• search_menu       → "có món nào X", "tìm X", câu hỏi tìm kiếm
• add_to_cart       → NGAY KHI khách đặt món có đủ tên + size + số lượng
• view_cart         → "xem giỏ", "đặt gì rồi", "giỏ hàng"
• calculate_total   → "bao nhiêu tiền", "hết bao nhiêu", "tổng bao nhiêu"
• update_cart_item  → "sửa", "đổi size", "thay đổi số lượng món thứ X"
• remove_cart_item  → "xóa món thứ X", "bỏ [tên món]"
• clear_cart        → "xóa hết", "xóa giỏ hàng"
• save_customer_info → khi khách cung cấp tên + SĐT + địa chỉ
• confirm_order     → chỉ khi khách CHỦ ĐỘNG xác nhận đặt đơn
• reopen_last_order → "đặt bổ sung", "thêm vào đơn vừa đặt"
• cancel_pending_order → "hủy đơn", "không đặt nữa"

KHÔNG gọi function khi:
• Chào hỏi: "xin chào", "hello"
• Hỏi chung: "quán mở mấy giờ", "có ship không"
• Cảm ơn, tạm biệt

━━━━━ SAU KHI add_to_cart THÀNH CÔNG ━━━━━
Luôn hiển thị:
- Tên món + size + số lượng
- Giá từng phần (base + topping nếu có)
- Tổng món này
- Hỏi: "Bạn muốn đặt thêm gì không, hay mình chốt đơn luôn nhé? 😊"

━━━━━ SAU KHI save_customer_info THÀNH CÔNG ━━━━━
Tóm tắt lại đơn hàng đầy đủ rồi hỏi xác nhận phương thức thanh toán (COD / chuyển khoản).`;
  }

  getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'get_menu',
          description: 'Lấy danh sách menu. category: "all" | "Trà Sữa" | "Trà Trái Cây" | "Cà Phê" | "Đá Xay" | "Topping"',
          parameters: {
            type: 'object',
            properties: {
              category: { type: 'string', enum: ['all','Trà Sữa','Trà Trái Cây','Cà Phê','Đá Xay','Topping'] },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'search_menu',
          description: 'Tìm món theo từ khóa',
          parameters: {
            type: 'object',
            properties: { keyword: { type: 'string' } },
            required: ['keyword'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'add_to_cart',
          description: 'THÊM MÓN VÀO GIỎ. Gọi NGAY khi khách đặt món có đủ: tên/id + size + số lượng. KHÔNG hỏi xác nhận trước.',
          parameters: {
            type: 'object',
            properties: {
              item_id: { type: 'string', description: 'Mã món nếu biết (TS01, CF02...)' },
              name: { type: 'string', description: 'Tên món' },
              size: { type: 'string', enum: ['M','L'] },
              quantity: { type: 'number', minimum: 1, default: 1 },
              toppings: { type: 'array', items: { type: 'string' }, description: 'Tên các topping' },
            },
            required: ['size', 'quantity'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'view_cart',
          description: 'Xem giỏ hàng hiện tại',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'calculate_total',
          description: 'Tính tổng tiền giỏ hàng. Dùng khi khách hỏi giá / tổng tiền.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_cart_item',
          description: 'Sửa size hoặc số lượng của 1 món trong giỏ theo vị trí (position bắt đầu từ 1)',
          parameters: {
            type: 'object',
            properties: {
              position: { type: 'number', description: 'Vị trí món trong giỏ (1, 2, 3...)' },
              new_size: { type: 'string', enum: ['M','L'], description: 'Size mới nếu đổi size' },
              new_quantity: { type: 'number', minimum: 1, description: 'Số lượng mới nếu đổi số lượng' },
            },
            required: ['position'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'remove_cart_item',
          description: 'Xóa 1 món khỏi giỏ theo vị trí',
          parameters: {
            type: 'object',
            properties: {
              position: { type: 'number', description: 'Vị trí món cần xóa (1, 2, 3...)' },
            },
            required: ['position'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'clear_cart',
          description: 'Xóa toàn bộ giỏ hàng',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'save_customer_info',
          description: 'Lưu thông tin khách (tên + SĐT + địa chỉ). Gọi khi khách cung cấp đủ 3 trường.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              phone: { type: 'string', description: '10 số, bắt đầu 0' },
              address: { type: 'string' },
            },
            required: ['name', 'phone', 'address'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'confirm_order',
          description: 'Tạo đơn hàng. CHỈ gọi khi: giỏ có món + đã có info khách + khách chủ động xác nhận.',
          parameters: {
            type: 'object',
            properties: {
              payment_method: { type: 'string', enum: ['COD','BANK_TRANSFER'], default: 'COD' },
            },
            required: ['payment_method'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'reopen_last_order',
          description: 'Mở lại đơn hàng vừa xác nhận để đặt bổ sung thêm món',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'cancel_pending_order',
          description: 'Hủy đơn hàng đang chờ / giỏ hàng hiện tại khi khách đổi ý',
          parameters: {
            type: 'object',
            properties: {
              reason: { type: 'string', description: 'Lý do hủy nếu có' },
            },
          },
        },
      },
    ];
  }

  buildMessages(conversationHistory) {
    return conversationHistory
      .slice(-20)
      .filter((m) => m.content && m.content.trim())
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
  }

  async chat(messages, userId) {
    const MAX_RETRIES = 3;
    let lastErr = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const res = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            ...this.buildMessages(messages),
          ],
          tools: this.getTools(),
          tool_choice: 'auto',
          temperature: 0.5,
          max_tokens: 600,
        });
        const msg = res.choices[0].message;
        console.log(`[LLM] attempt=${i+1} tools=${msg.tool_calls?.length||0} content="${msg.content?.slice(0,80)}"`);
        if (msg.tool_calls) msg.tool_calls.forEach(tc =>
          console.log(`  tool: ${tc.function.name} args=${tc.function.arguments?.slice(0,100)}`));
        return { content: msg.content, tool_calls: msg.tool_calls || [], finish_reason: res.choices[0].finish_reason };
      } catch (err) {
        lastErr = err;
        console.error(`[LLM] attempt ${i+1} failed: ${err.message}`);
        if (i < MAX_RETRIES - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    throw lastErr;
  }

  clearMenuCache() { this.menuCache = null; }
}

module.exports = new LLMService();
