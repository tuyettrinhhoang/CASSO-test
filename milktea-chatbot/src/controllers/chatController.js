const llmService = require('../services/llm');
const FunctionHandler = require('../services/functionHandler');
const Session = require('../models/Session');

/**
 * ChatController – OpenAI function-calling + local safety rails
 *
 * Ưu tiên:
 * 1) Save user msg
 * 2) Xử lý local các case bắt buộc:
 *    - pending size
 *    - confirm order có điều kiện
 *    - bổ sung đơn
 *    - fallback local khi LLM chết
 * 3) Gọi LLM tool-calling
 * 4) Với tool hiển thị thì trả raw message
 * 5) Với tool hành động thì cho LLM viết follow-up, trừ các case cần giữ nguyên
 */
class ChatController {
  static DISPLAY_TOOLS = new Set([
    'get_menu',
    'search_menu',
    'view_cart',
    'calculate_total',
  ]);

  async processMessage(userId, userMessage) {
    try {
      // 1) Save user message first
      await Session.addMessage(userId, 'user', userMessage);

      const normalized = this._normalize(userMessage);
      const handler = new FunctionHandler(userId);

      // 2) Pending size flow (PASS test 3.2)
      const pendingOrder = await Session.getState(userId, 'pendingOrder');
      if (pendingOrder && this._isSizeOnly(normalized)) {
        const size = normalized.includes('l') ? 'L' : 'M';

        const result = await handler.execute('add_to_cart', {
          name: pendingOrder.name,
          quantity: pendingOrder.quantity || 1,
          size,
          _raw_user_message: pendingOrder.raw_user_message || pendingOrder.name,
        });

        await Session.clearState(userId, 'pendingOrder');

        const finalResponse =
          result?.message || 'Mình đã thêm món vào giỏ hàng rồi nhé! 😊';

        await Session.addMessage(userId, 'assistant', finalResponse);
        return { success: true, response: finalResponse };
      }

      // 3) Intent: reopen / supplement order
      if (this._isSupplementIntent(normalized)) {
        const result = await handler.execute('reopen_last_order', {});
        const finalResponse =
          result?.message || 'Bạn muốn thêm món gì vào đơn gần nhất ạ? 😊';

        await Session.addMessage(userId, 'assistant', finalResponse);
        return { success: true, response: finalResponse };
      }

      // 4) Local guard for confirm order (PASS 6.5, 6.6, 7.3, 7.4)
      if (this._isConfirmIntent(normalized)) {
        const cart = await Session.getCart(userId);
        const customerInfo = await Session.getCustomerInfo(userId);

        if (!cart || cart.length === 0) {
          const msg = 'Giỏ hàng đang trống, chưa thể xác nhận đơn nhé 🛒';
          await Session.addMessage(userId, 'assistant', msg);
          return { success: true, response: msg };
        }

        if (!customerInfo) {
          const msg =
            'Bạn chưa cung cấp đủ thông tin giao hàng. Cho mình xin *tên, số điện thoại và địa chỉ* nhé 😊';
          await Session.addMessage(userId, 'assistant', msg);
          return { success: true, response: msg };
        }

        const paymentMethod = this._detectPaymentMethod(normalized);
        const result = await handler.execute('confirm_order', {
          payment_method: paymentMethod,
        });

        const finalResponse =
          result?.message || 'Đơn hàng đã được xác nhận rồi nhé! 🎉';

        await Session.addMessage(userId, 'assistant', finalResponse);
        return { success: true, response: finalResponse };
      }

      // 5) Hard local fallback for critical user intents BEFORE LLM
      const preLocal = await this._preLocalRoute(userId, userMessage, handler);
      if (preLocal) {
        await Session.addMessage(userId, 'assistant', preLocal);
        return { success: true, response: preLocal, fallback: true };
      }

      // 6) Load history
      const history = await Session.getConversationHistory(userId);

      // 7) LLM call
      let llmResponse;
      let usedFallback = false;

      try {
        llmResponse = await llmService.chat(history, userId);
      } catch (llmErr) {
        console.error('[ChatController] LLM failed, using local fallback:', llmErr.message);
        llmResponse = await this._localFallback(userId, userMessage);
        usedFallback = true;
      }

      // 8) Execute tools or plain text
      let finalResponse = '';

      if (llmResponse.tool_calls?.length > 0) {
        finalResponse = await this._executeTools(
          llmResponse,
          history,
          handler,
          userMessage,
          userId
        );
      } else {
        finalResponse = llmResponse.content || 'Mình hỗ trợ bạn nhé! 😊';
      }

      if (!finalResponse?.trim()) {
        finalResponse = 'Mình đã xử lý xong rồi nhé! 😊';
      }

      // 9) Save and return
      await Session.addMessage(userId, 'assistant', finalResponse);
      return { success: true, response: finalResponse, fallback: usedFallback };
    } catch (err) {
      console.error('[ChatController] Fatal error:', err.message, err.stack);
      return { success: false, response: this._friendlyError(err) };
    }
  }

  async resetSession(userId) {
    try {
      await Session.delete(userId);
      return { success: true, message: '✅ Đã reset! Bắt đầu lại nhé! 😊' };
    } catch (err) {
      return { success: false, message: 'Không thể reset: ' + err.message };
    }
  }

  async _executeTools(llmResponse, history, handler, userMessage, userId) {
    const toolResults = [];
    let firstDisplayMessage = null;
    let firstActionResult = null;

    for (const toolCall of llmResponse.tool_calls) {
      const fnName = toolCall.function.name;
      let fnArgs = {};

      try {
        fnArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch (e) {
        console.error('[ChatController] Failed to parse tool args:', e.message);
        fnArgs = {};
      }

      if (fnName === 'add_to_cart') {
        fnArgs._raw_user_message = userMessage;
      }

      console.log(`[Tools] → ${fnName}(${JSON.stringify(fnArgs).slice(0, 160)})`);
      const result = await handler.execute(fnName, fnArgs);
      console.log(
        `[Tools] ← ${fnName}: success=${result?.success} "${result?.message?.slice(0, 100)}"`
      );

      // Nếu add_to_cart thiếu size -> lưu pending size
      if (fnName === 'add_to_cart' && result?.needs_size) {
        await Session.setState(userId, 'pendingOrder', {
          name: fnArgs.name || fnArgs.item_id || userMessage,
          quantity: fnArgs.quantity || 1,
          raw_user_message: userMessage,
        });
      }

      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: fnName,
        content: JSON.stringify(result),
      });

      if (ChatController.DISPLAY_TOOLS.has(fnName) && result?.message && !firstDisplayMessage) {
        firstDisplayMessage = result.message;
      }

      if (!ChatController.DISPLAY_TOOLS.has(fnName) && result?.message && !firstActionResult) {
        firstActionResult = result.message;
      }
    }

    const firstTool = llmResponse.tool_calls[0]?.function?.name;

    // Display tools: return formatted text directly
    if (ChatController.DISPLAY_TOOLS.has(firstTool)) {
      let msg = firstDisplayMessage || 'Không tìm thấy thông tin.';

      // PASS test 6.1: Tính tiền mà chưa có customer info thì nhắc nhập info
      if (firstTool === 'calculate_total') {
        const customerInfo = await Session.getCustomerInfo(userId);
        if (!customerInfo) {
          msg +=
            '\n\n📍 Để chốt đơn, bạn cho mình xin:\n- Tên\n- SĐT\n- Địa chỉ giao hàng';
        }
      }

      return msg;
    }

    // Những tool cần giữ nguyên raw output, không cho LLM paraphrase lại
    const keepRawActionFunctions = new Set([
      'add_to_cart',
      'save_customer_info',
      'confirm_order',
      'remove_cart_item',
      'update_cart_item',
      'clear_cart',
      'reopen_last_order',
      'cancel_pending_order',
    ]);

    if (keepRawActionFunctions.has(firstTool)) {
      return (
        firstActionResult ||
        toolResults.map((r) => JSON.parse(r.content)?.message).find(Boolean) ||
        'Xong rồi nhé! 😊'
      );
    }

    // Action tools: ask LLM for natural follow-up
    try {
      const systemPrompt =
        typeof llmService.getSystemPrompt === 'function'
          ? llmService.getSystemPrompt()
          : 'Bạn là trợ lý bán hàng thân thiện.';

      const followUp = await llmService.client.chat.completions.create({
        model: llmService.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...llmService.buildMessages(history),
          {
            role: 'assistant',
            content: llmResponse.content || null,
            tool_calls: llmResponse.tool_calls,
          },
          ...toolResults,
        ],
        temperature: 0.6,
        max_tokens: 400,
      });

      const reply = followUp.choices[0]?.message?.content;
      if (reply?.trim()) return reply;
    } catch (err) {
      console.error('[ChatController] Follow-up LLM failed:', err.message);
    }

    return (
      firstActionResult ||
      toolResults.map((r) => JSON.parse(r.content)?.message).find(Boolean) ||
      'Xong rồi nhé! 😊'
    );
  }

  async _preLocalRoute(userId, message, handler) {
    const n = this._normalize(message);

    // PASS test 3.2: simple order without size
    // Ví dụ: "cho 1 cà phê sữa"
    // Nếu có ý định đặt món, có tên món nhưng chưa có size -> hỏi size local
    const looksLikeOrder =
      /\b(cho|dat|mua|lay|them)\b/.test(n) || /\b\d+\b/.test(n);

    const hasSize = /\b(size\s*[ml]|m|l)\b/.test(n) && /\bsize\b/.test(n);
    const hasPotentialProductWords =
      /\b(tra|tra sua|ca phe|da xay|matcha|dau|bac ha|truyen thong|chanh|xoai|vai)\b/.test(n);

    if (looksLikeOrder && hasPotentialProductWords && !hasSize) {
      // cố thử xem có phải món thật không
      const rawName = message
        .replace(/\b\d+\b/g, ' ')
        .replace(/\b(cho|đặt|dat|mua|lấy|lay|thêm|them|mình|minh|em|anh|chị|chi|tôi|toi)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const product = await handler.findProduct?.(rawName) || null;
      if (product) {
        await Session.setState(userId, 'pendingOrder', {
          name: rawName,
          quantity: this._extractQuantity(message),
          raw_user_message: message,
        });
        return 'Bạn muốn size M hay L ạ? 😊';
      }
    }

    // Local parse customer info if user gives enough info
    const parsedInfo = this._parseCustomerInfo(message);
    if (parsedInfo) {
      const result = await handler.execute('save_customer_info', parsedInfo);
      return result?.message || 'Mình đã lưu thông tin cho bạn nhé.';
    }

    return null;
  }

  async _localFallback(userId, message) {
    const n = this._normalize(message);
    const handler = new FunctionHandler(userId);

    if (/xem gio|gio hang|da dat gi/.test(n)) {
      const result = await handler.execute('view_cart');
      return { content: result.message, tool_calls: [] };
    }

    if (/bao nhieu tien|het bao nhieu|tong tien|tinh tien/.test(n)) {
      const result = await handler.execute('calculate_total');
      const customerInfo = await Session.getCustomerInfo(userId);

      let msg = result.message;
      if (!customerInfo) {
        msg += '\n\n📍 Để chốt đơn, bạn cho mình xin:\n- Tên\n- SĐT\n- Địa chỉ giao hàng';
      }

      return { content: msg, tool_calls: [] };
    }

    if (/xoa gio|xoa het/.test(n)) {
      const result = await handler.execute('clear_cart');
      return { content: result.message, tool_calls: [] };
    }

    if (/huy don|khong dat nua/.test(n)) {
      const result = await handler.execute('cancel_pending_order');
      return { content: result.message, tool_calls: [] };
    }

    if (/xem menu|menu co gi|cho xem/.test(n)) {
      const result = await handler.execute('get_menu', { category: 'all' });
      return { content: result.message, tool_calls: [] };
    }

    return {
      content: 'Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau ít phút nhé! 🙏',
      tool_calls: [],
    };
  }

  _friendlyError(err) {
    if (err.message?.includes('quota') || err.message?.includes('rate limit')) {
      return 'Hệ thống đang bận, vui lòng thử lại sau ít phút! ⏳';
    }
    if (err.message?.includes('API key')) {
      return 'Lỗi kết nối AI. Kiểm tra API key nhé! 🔑';
    }
    if (err.message?.includes('network') || err.message?.includes('timeout')) {
      return 'Mất kết nối mạng, vui lòng thử lại! 📡';
    }
    return 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại! 🙏';
  }

  _normalize(str) {
    return (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _isSizeOnly(normalized) {
    return /^(m|l|size m|size l)$/.test(normalized);
  }

  _isConfirmIntent(normalized) {
    return /\b(xac nhan|chot don|dat luon|ok dat|dong y)\b/.test(normalized);
  }

  _isSupplementIntent(normalized) {
    return /\b(dat bo sung|bo sung|them vao don|them mon vao don|them mon nua)\b/.test(
      normalized
    );
  }

  _detectPaymentMethod(normalized) {
    if (/chuyen khoan|bank transfer/.test(normalized)) {
      return 'BANK_TRANSFER';
    }
    return 'COD';
  }

  _extractQuantity(message) {
    const m = (message || '').match(/\b(\d+)\b/);
    return m ? Math.max(1, Number(m[1])) : 1;
  }

  _parseCustomerInfo(text) {
    const normalized = this._normalize(text);

    const hasPhone = /\b0\d{9}\b/.test(normalized);
    const hasNameKeyword = normalized.includes('ten');
    const hasAddressKeyword =
      normalized.includes('dia chi') ||
      normalized.includes('giao den') ||
      normalized.includes('giao toi');

    if (!hasPhone && !hasNameKeyword && !hasAddressKeyword) {
      return null;
    }

    const phoneMatch = normalized.match(/\b0\d{9}\b/);
    const phone = phoneMatch ? phoneMatch[0] : '';

    let name = '';
    let address = '';

    const original = text;

    const nameMatch =
      original.match(/tên\s*[:\-]?\s*([^,]+)/i) ||
      original.match(/ten\s*[:\-]?\s*([^,]+)/i);

    if (nameMatch) name = nameMatch[1].trim();

    const addressMatch =
      original.match(/địa chỉ\s*[:\-]?\s*(.+)$/i) ||
      original.match(/dia chi\s*[:\-]?\s*(.+)$/i) ||
      original.match(/giao đến\s*[:\-]?\s*(.+)$/i) ||
      original.match(/giao den\s*[:\-]?\s*(.+)$/i);

    if (addressMatch) address = addressMatch[1].trim();

    if (!name && !phone && !address) return null;

    return { name, phone, address };
  }
}

module.exports = new ChatController();