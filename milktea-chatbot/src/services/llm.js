const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

class LLMService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = process.env.LLM_MODEL || 'claude-sonnet-4-20250514';
  }

  getSystemPrompt() {
    return `Bạn là nhân viên tư vấn thân thiện của "${process.env.SHOP_NAME || 'Quán Trà Sữa'}".

NHIỆM VỤ:
- Giúp khách hàng xem menu, đặt món, tư vấn sản phẩm
- Tính tiền chính xác và xác nhận thông tin giao hàng
- Trả lời bằng tiếng Việt tự nhiên, thân thiện

GIỌNG ĐIỆU:
- Thân thiện, nhiệt tình như người mẹ bán hàng
- Tự nhiên, không cứng nhắc
- Có thể dùng tiếng Việt không dấu nếu khách dùng không dấu
- Gọi khách là "bạn" hoặc "anh/chị"

QUY TẮC:
1. KHÔNG BAO GIỜ bịa giá hoặc món không có trong menu
2. BẮT BUỘC phải có: tên, số điện thoại, địa chỉ trước khi xác nhận đơn
3. Luôn xác nhận lại thông tin đơn hàng trước khi hoàn tất
4. Nếu khách hỏi món không rõ, hỏi lại để chính xác
5. Nếu món hết, gợi ý món khác cùng loại

CÁCH XỬ LÝ:
- Khách chào hỏi → Chào lại và hỏi cần gì
- Khách hỏi menu → Gọi function get_menu
- Khách đặt món → Gọi function add_to_cart
- Khách hỏi giá → Tra cứu từ menu
- Khách muốn thanh toán → Kiểm tra thông tin đầy đủ, sau đó tính tiền

CHÚ Ý:
- Size M và L có giá khác nhau
- Topping tính thêm tiền (không phân biệt size)
- Luôn hỏi size nếu khách không nói rõ`;
  }

  getTools() {
    return [
      {
        name: 'get_menu',
        description: 'Lấy danh sách menu của quán. Có thể lọc theo category hoặc lấy tất cả.',
        input_schema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['Trà Sữa', 'Trà Trái Cây', 'Cà Phê', 'Đá Xay', 'Topping', 'all'],
              description: 'Loại món cần xem. Dùng "all" để xem tất cả.'
            }
          }
        }
      },
      {
        name: 'search_menu',
        description: 'Tìm kiếm món trong menu theo từ khóa',
        input_schema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Từ khóa để tìm kiếm (vd: "trân châu", "dâu", "caramel")'
            }
          },
          required: ['keyword']
        }
      },
      {
        name: 'add_to_cart',
        description: 'Thêm món vào giỏ hàng của khách',
        input_schema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'Mã món (vd: TS01, CF02)'
            },
            size: {
              type: 'string',
              enum: ['M', 'L'],
              description: 'Size món (M hoặc L)'
            },
            quantity: {
              type: 'number',
              description: 'Số lượng'
            },
            toppings: {
              type: 'array',
              items: { type: 'string' },
              description: 'Danh sách mã topping (vd: ["TOP01", "TOP06"])'
            }
          },
          required: ['item_id', 'size', 'quantity']
        }
      },
      {
        name: 'view_cart',
        description: 'Xem giỏ hàng hiện tại của khách',
        input_schema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'calculate_total',
        description: 'Tính tổng tiền đơn hàng',
        input_schema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'save_customer_info',
        description: 'Lưu thông tin khách hàng (tên, SĐT, địa chỉ)',
        input_schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Tên khách hàng'
            },
            phone: {
              type: 'string',
              description: 'Số điện thoại'
            },
            address: {
              type: 'string',
              description: 'Địa chỉ giao hàng'
            }
          },
          required: ['name', 'phone', 'address']
        }
      },
      {
        name: 'confirm_order',
        description: 'Xác nhận và tạo đơn hàng. CHỈ gọi khi đã có đủ: món trong giỏ + thông tin khách hàng',
        input_schema: {
          type: 'object',
          properties: {
            payment_method: {
              type: 'string',
              enum: ['COD', 'BANK_TRANSFER'],
              description: 'Phương thức thanh toán'
            }
          },
          required: ['payment_method']
        }
      },
      {
        name: 'clear_cart',
        description: 'Xóa toàn bộ giỏ hàng',
        input_schema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async chat(messages, userId) {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: this.getSystemPrompt(),
        tools: this.getTools(),
        messages: messages
      });

      return response;
    } catch (err) {
      console.error('LLM Error:', err);
      throw err;
    }
  }

  formatTextResponse(content) {
    // Extract text from content blocks
    if (Array.isArray(content)) {
      return content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
    }
    return content;
  }

  extractToolCalls(content) {
    // Extract tool use blocks from content
    if (Array.isArray(content)) {
      return content.filter(block => block.type === 'tool_use');
    }
    return [];
  }
}

module.exports = new LLMService();
