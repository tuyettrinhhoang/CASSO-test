const Product = require('../models/Product');
const Session = require('../models/Session');
const Order = require('../models/Order');

class FunctionHandler {
  constructor(userId) { this.userId = userId; }

  // ── Text utils ─────────────────────────────────────────────────────────

  norm(str) {
    if (!str) return '';
    return str.toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  stripOrderWords(raw) {
    if (!raw) return '';
    return raw.toString()
      .replace(/\b(size|sz)\s*[ml]\b/gi, ' ')
      .replace(/\bsize\s*(m|l)\b/gi, ' ')
      .replace(/\b\d+\b/g, ' ')
      .replace(/\b(them|thêm)\b.*$/gi, ' ')
      .replace(/\b(cho minh|cho mình|minh|mình|lay|lấy|mua|dat|đặt|giu?p|giúp|nha|nhe|nhé|mot|một|va|và)\b/gi, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  // ── Product lookup ─────────────────────────────────────────────────────

  async findProduct(name, { includeToppings = false } = {}) {
    if (!name) return null;
    let all = await Product.getAll();
    if (!includeToppings) all = all.filter(p => p.category !== 'Topping');

    const needle = this.norm(name);
    if (!needle) return null;

    // 1. exact
    let hit = all.find(p => this.norm(p.name) === needle);
    if (hit) return hit;

    // 2. containment
    hit = all.find(p => {
      const pn = this.norm(p.name);
      return pn.includes(needle) || needle.includes(pn);
    });
    if (hit) return hit;

    // 3. token scoring
    const tokens = needle.split(/\s+/).filter(Boolean);
    const scored = all.map(p => {
      const pn = this.norm(p.name);
      const pt = pn.split(/\s+/).filter(Boolean);
      let s = 0;
      for (const t of tokens) {
        if (pt.includes(t)) s += 2;
        else if (pn.includes(t)) s += 1;
      }
      return { p, s };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);

    return scored[0]?.p || null;
  }

  async findToppings(text) {
    if (!text) return [];
    const all = await Product.getAll();
    const tops = all.filter(p => p.category === 'Topping');
    const n = this.norm(text);

    const aliases = {
      'tran chau den': 'Trân Châu Đen', 'tran chau': 'Trân Châu Đen', 'tc den': 'Trân Châu Đen',
      'tran chau trang': 'Trân Châu Trắng', 'tc trang': 'Trân Châu Trắng',
      'thach ca chua': 'Thạch Cà Chua', 'thach xanh': 'Thạch Xanh', 'thach': 'Thạch Xanh',
      'kem tuoi': 'Kem Tươi', 'kem': 'Kem Tươi',
      'nuoc cot dua': 'Nước Cốt Dừa', 'dua': 'Nước Cốt Dừa',
      'bot tra xanh': 'Bột Trà Xanh', 'matcha bot': 'Bột Trà Xanh',
      'gelee khoai mon': 'Gelée Khoai Môn',
    };

    const matched = new Map();

    // direct name match
    for (const t of tops) {
      if (n.includes(this.norm(t.name))) matched.set(t.item_id, t);
    }
    // alias match
    for (const [alias, tName] of Object.entries(aliases)) {
      if (n.includes(alias)) {
        const found = tops.find(t => t.name === tName);
        if (found) matched.set(found.item_id, found);
      }
    }
    return Array.from(matched.values());
  }

  // ── Dispatcher ─────────────────────────────────────────────────────────

  async execute(fn, args = {}) {
    try {
      switch (fn) {
        case 'get_menu':           return await this.getMenu(args);
        case 'search_menu':        return await this.searchMenu(args);
        case 'add_to_cart':        return await this.addToCart(args);
        case 'view_cart':          return await this.viewCart();
        case 'calculate_total':    return await this.calculateTotal();
        case 'update_cart_item':   return await this.updateCartItem(args);
        case 'remove_cart_item':   return await this.removeCartItem(args);
        case 'clear_cart':         return await this.clearCart();
        case 'save_customer_info': return await this.saveCustomerInfo(args);
        case 'confirm_order':      return await this.confirmOrder(args);
        case 'reopen_last_order':  return await this.reopenLastOrder();
        case 'cancel_pending_order': return await this.cancelPendingOrder(args);
        default: return { success: false, error: `Unknown function: ${fn}` };
      }
    } catch (err) {
      console.error(`[FN] ${fn} error:`, err);
      return { success: false, error: err.message };
    }
  }

  // ── Implementations ────────────────────────────────────────────────────

  async getMenu(args) {
    const { category = 'all' } = args;
    const products = category === 'all' ? await Product.getAll() : await Product.getByCategory(category);
    if (!products?.length) return { success: false, message: 'Hiện chưa có món trong menu.' };

    const grouped = {};
    products.forEach(p => { (grouped[p.category] = grouped[p.category] || []).push(p); });

    let text = category === 'all' ? '🧋 *MENU QUÁN TRÀ SỮA MẸ* 🧋\n\n' : `🧋 *${category.toUpperCase()}* 🧋\n\n`;
    for (const cat in grouped) {
      text += `📂 *${cat}*\n`;
      grouped[cat].forEach(item => {
        const pm = this.money(item.price_m);
        const pl = item.price_l ? this.money(item.price_l) : null;
        text += pl ? `• ${item.name} | M: ${pm} | L: ${pl}\n` : `• ${item.name} | ${pm}\n`;
      });
      text += '\n';
    }
    return { success: true, message: text };
  }

  async searchMenu(args) {
    const { keyword } = args;
    if (!keyword?.trim()) return { success: false, message: 'Bạn muốn tìm món gì ạ?' };

    const all = await Product.getAll();
    const kn = this.norm(keyword);
    const found = all.filter(p =>
      this.norm(p.name).includes(kn) ||
      this.norm(p.description || '').includes(kn) ||
      this.norm(p.category || '').includes(kn)
    );

    if (!found.length) return { success: false, message: `Không tìm thấy món nào với từ khóa "${keyword}" 😅` };

    let text = `🔍 Tìm thấy ${found.length} món:\n\n`;
    found.forEach(p => {
      const pm = this.money(p.price_m);
      const pl = p.price_l ? this.money(p.price_l) : null;
      text += pl ? `• ${p.name} | M: ${pm} | L: ${pl}\n` : `• ${p.name} | ${pm}\n`;
      if (p.description) text += `  _${p.description}_\n`;
    });
    return { success: true, results: found, message: text };
  }

  async addToCart(args) {
    const { item_id, name, size, quantity = 1, toppings = [], _raw_user_message = '' } = args;

    // Validate size
    const sz = (size || '').toUpperCase();
    if (!['M', 'L'].includes(sz)) {
      return { success: false, needs_size: true, message: 'Bạn muốn size M hay L ạ? 😊' };
    }

    const qty = Math.max(1, Math.round(Number(quantity) || 1));

    // Find product
    let product = null;
    if (item_id) product = await Product.getById(item_id);
    if (!product && name) product = await this.findProduct(this.stripOrderWords(name));
    if (!product && name) product = await this.findProduct(name);
    if (!product && _raw_user_message) product = await this.findProduct(this.stripOrderWords(_raw_user_message));

    if (!product) {
      return { success: false, message: `Xin lỗi, mình không tìm thấy món "${name || item_id || ''}". Bạn thử xem menu nhé!` };
    }
    if (!product.available) {
      return { success: false, message: `Món ${product.name} đang hết hàng rồi ạ 😢 Bạn chọn món khác nhé!` };
    }
    if (sz === 'L' && !product.price_l) {
      return { success: false, message: `Món ${product.name} chỉ có size M thôi nhé!` };
    }

    // Resolve toppings
    const toppingMap = new Map();
    const detected = await this.findToppings(_raw_user_message || name || '');
    for (const t of detected) toppingMap.set(t.item_id, { id: t.item_id, name: t.name, price: t.price_m });

    for (const tin of toppings) {
      let t = await Product.getById(tin) || await this.findProduct(tin, { includeToppings: true });
      if (t?.category === 'Topping') toppingMap.set(t.item_id, { id: t.item_id, name: t.name, price: t.price_m });
    }
    const validToppings = Array.from(toppingMap.values());

    // Calculate
    const basePrice = sz === 'L' ? product.price_l : product.price_m;
    const toppingPrice = validToppings.reduce((s, t) => s + t.price, 0);
    const unitTotal = basePrice + toppingPrice;
    const itemTotal = unitTotal * qty;

    const cartItem = {
      item_id: product.item_id,
      name: product.name,
      category: product.category,
      size: sz,
      quantity: qty,
      base_price: basePrice,
      toppings: validToppings,
      topping_price: toppingPrice,
      total: itemTotal,
    };

    await Session.addToCart(this.userId, cartItem);

    // Get updated cart total
    const cart = await Session.getCart(this.userId);
    const cartTotal = cart.reduce((s, i) => s + i.total, 0);

    // Build rich response
    const toppingText = validToppings.length > 0
      ? `\n   + Topping: ${validToppings.map(t => `${t.name} (${this.money(t.price)})`).join(', ')}`
      : '';
    const priceBreakdown = validToppings.length > 0
      ? `${this.money(basePrice)} + topping ${this.money(toppingPrice)} = ${this.money(unitTotal)}/món`
      : `${this.money(basePrice)}/món`;

    const msg =
      `✅ Đã thêm vào giỏ:\n` +
      `• ${product.name} size ${sz} x${qty}${toppingText}\n` +
      `💰 ${priceBreakdown}${qty > 1 ? ` → ${qty} món = ${this.money(itemTotal)}` : ''}\n` +
      `🛒 Tổng giỏ hiện tại: *${this.money(cartTotal)}*\n\n` +
      `Bạn muốn đặt thêm gì không, hay chốt đơn luôn? 😊`;

    return { success: true, item: cartItem, cart_total: cartTotal, message: msg };
  }

  async viewCart() {
    const cart = await Session.getCart(this.userId);
    if (!cart?.length) return { success: true, cart: [], message: 'Giỏ hàng đang trống 🛒\nBạn muốn đặt món gì không?' };

    const total = cart.reduce((s, i) => s + i.total, 0);
    let text = '🛒 *GIỎ HÀNG CỦA BẠN*\n\n';
    cart.forEach((item, idx) => {
      text += `${idx + 1}. ${item.name} - Size ${item.size} x${item.quantity}\n`;
      if (item.toppings?.length) text += `   + ${item.toppings.map(t => t.name).join(', ')}\n`;
      text += `   = ${this.money(item.total)}\n\n`;
    });
    text += `━━━━━━━━━━\n💰 Tổng: *${this.money(total)}*\n\n`;
    text += `_(Nhắn "xóa món 1" để xóa từng món, hoặc "chốt đơn" để đặt)_`;

    return { success: true, cart, total, message: text };
  }

  async calculateTotal() {
    const cart = await Session.getCart(this.userId);
    if (!cart?.length) return { success: false, message: 'Giỏ hàng đang trống 🛒' };

    const subtotal = cart.reduce((s, i) => s + i.total, 0);
    let text = '🧾 *TỔNG TIỀN*\n\n';
    cart.forEach((item, idx) => {
      text += `${idx + 1}. ${item.name} size ${item.size} x${item.quantity} = ${this.money(item.total)}\n`;
    });
    text += `━━━━━━━━━━\n💰 Tổng cộng: *${this.money(subtotal)}*\n(Phí ship: Miễn phí)`;

    return { success: true, subtotal, message: text };
  }

  async updateCartItem(args) {
    const { position, new_size, new_quantity } = args;
    const cart = await Session.getCart(this.userId);

    if (!position || position < 1 || position > cart.length) {
      return { success: false, message: `Vị trí không hợp lệ. Giỏ hàng có ${cart.length} món.` };
    }

    const item = cart[position - 1];

    if (new_size) {
      const sz = new_size.toUpperCase();
      const product = await Product.getById(item.item_id);
      if (sz === 'L' && !product?.price_l) {
        return { success: false, message: `Món ${item.name} không có size L.` };
      }
      const newBasePrice = sz === 'L' ? product.price_l : product.price_m;
      await Session.updateCartItemSize(this.userId, position, sz, newBasePrice);
    }

    if (new_quantity) {
      await Session.updateCartItemQty(this.userId, position, Math.max(1, new_quantity));
    }

    const updatedCart = await Session.getCart(this.userId);
    const updatedItem = updatedCart[position - 1];
    const total = updatedCart.reduce((s, i) => s + i.total, 0);

    return {
      success: true,
      message: `✅ Đã cập nhật món ${position}: ${updatedItem.name} size ${updatedItem.size} x${updatedItem.quantity} = ${this.money(updatedItem.total)}\n💰 Tổng mới: *${this.money(total)}*`,
    };
  }

  async removeCartItem(args) {
    const { position } = args;
    const cart = await Session.getCart(this.userId);

    if (!position || position < 1 || position > cart.length) {
      return { success: false, message: `Vị trí không hợp lệ. Giỏ có ${cart.length} món.` };
    }

    const result = await Session.removeCartItem(this.userId, position);
    if (!result) return { success: false, message: 'Không thể xóa món này.' };

    const newTotal = result.cart.reduce((s, i) => s + i.total, 0);
    const emptyMsg = result.cart.length === 0 ? '\nGiỏ hàng đã trống.' : `\n💰 Tổng còn lại: *${this.money(newTotal)}*`;

    return {
      success: true,
      message: `✅ Đã xóa: ${result.removed.name} size ${result.removed.size}${emptyMsg}`,
    };
  }

  async clearCart() {
    await Session.clearCart(this.userId);
    return { success: true, message: '🗑️ Đã xóa toàn bộ giỏ hàng.' };
  }

  async saveCustomerInfo(args) {
    const { name, phone, address } = args;

    if (!name?.trim() || name.trim().length < 2) {
      return { success: false, message: 'Tên không hợp lệ. Bạn cho mình biết tên đầy đủ nhé!' };
    }
    const cleanPhone = (phone || '').replace(/[\s\-\.]/g, '');
    if (!/^0[0-9]{9}$/.test(cleanPhone)) {
      return { success: false, message: 'SĐT không hợp lệ. Vui lòng nhập đúng 10 số, bắt đầu bằng 0 (vd: 0912345678).' };
    }
    if (!address?.trim() || address.trim().length < 8) {
      return { success: false, message: 'Địa chỉ quá ngắn. Bạn nhập rõ hơn nhé (số nhà, đường, quận)!' };
    }

    const info = { name: name.trim(), phone: cleanPhone, address: address.trim() };
    await Session.setCustomerInfo(this.userId, info);

    // Build order summary for confirmation
    const cart = await Session.getCart(this.userId);
    const total = cart.reduce((s, i) => s + i.total, 0);

    let summary = `✅ Đã lưu thông tin:\n👤 ${info.name} | 📞 ${info.phone}\n📍 ${info.address}\n\n`;
    summary += `📋 *XÁC NHẬN ĐƠN HÀNG*\n`;
    cart.forEach((item, idx) => {
      summary += `${idx + 1}. ${item.name} size ${item.size} x${item.quantity}`;
      if (item.toppings?.length) summary += ` + ${item.toppings.map(t => t.name).join(', ')}`;
      summary += ` = ${this.money(item.total)}\n`;
    });
    summary += `━━━━━━━━━━\n💰 Tổng: *${this.money(total)}*\n\n`;
    summary += `Bạn muốn thanh toán thế nào?\n💵 COD (tiền mặt khi nhận)\n🏦 Chuyển khoản`;

    return { success: true, customerInfo: info, message: summary };
  }

  async confirmOrder(args) {
    const { payment_method = 'COD' } = args;

    const cart = await Session.getCart(this.userId);
    if (!cart?.length) return { success: false, message: 'Giỏ hàng trống. Bạn muốn đặt món gì không?' };

    const customerInfo = await Session.getCustomerInfo(this.userId);
    if (!customerInfo) {
      return {
        success: false,
        needs_customer_info: true,
        message: 'Bạn chưa để lại thông tin giao hàng. Cho mình biết *tên, số điện thoại và địa chỉ* nhé!',
      };
    }

    const total = cart.reduce((s, i) => s + i.total, 0);
    const order = await Order.create({
      userId: this.userId,
      items: cart,
      totalAmount: total,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      customerAddress: customerInfo.address,
      paymentMethod: payment_method,
      paymentStatus: payment_method === 'COD' ? 'pending' : 'awaiting',
    });

    // Persist last confirmed order for supplement
    const session = await Session.get(this.userId);
    session.lastConfirmedOrder = {
      order_id: order.order_id,
      items: [...cart],
      totalAmount: total,
      customerInfo,
      paymentMethod: payment_method,
      createdAt: new Date().toISOString(),
    };
    await Session.set(this.userId, session);
    await Session.clearCart(this.userId);

    const shortId = order.order_id.substring(0, 8).toUpperCase();
    const payText = payment_method === 'COD' ? 'Tiền mặt khi nhận hàng 💵' : 'Chuyển khoản ngân hàng 🏦';

    let msg = `🎉 *ĐƠN HÀNG #${shortId} ĐÃ ĐƯỢC TẠO!*\n\n`;
    cart.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.name} size ${item.size} x${item.quantity}`;
      if (item.toppings?.length) msg += ` + ${item.toppings.map(t => t.name).join(', ')}`;
      msg += ` = ${this.money(item.total)}\n`;
    });
    msg += `━━━━━━━━━━\n💰 Tổng: *${this.money(total)}*\n`;
    msg += `💳 Thanh toán: ${payText}\n`;
    msg += `👤 ${customerInfo.name} | 📞 ${customerInfo.phone}\n`;
    msg += `📍 ${customerInfo.address}\n\n`;
    msg += `Quán sẽ chuẩn bị và giao trong thời gian sớm nhất! 🧋\n`;
    msg += `_(Nhắn "đặt bổ sung" nếu muốn thêm món vào đơn này)_`;

    return { success: true, order: { order_id: order.order_id, total, payment_method, customer: customerInfo, items: cart }, message: msg };
  }

  async reopenLastOrder() {
    const session = await Session.get(this.userId);
    const last = session.lastConfirmedOrder;

    if (!last) return { success: false, message: 'Không tìm thấy đơn hàng gần nhất.' };

    const currentCart = await Session.getCart(this.userId);
    if (currentCart.length > 0) {
      return {
        success: false,
        message: `Bạn đang có ${currentCart.length} món trong giỏ. Nhắn "xóa giỏ hàng" nếu muốn tạo đơn mới, hoặc tiếp tục đặt thêm rồi chốt.`,
      };
    }

    return {
      success: true,
      last_order: last,
      message: `📦 Đơn gần nhất #${last.order_id.substring(0,8).toUpperCase()} đã được chốt rồi.\n\nNếu bạn muốn đặt bổ sung, mình sẽ tạo đơn mới với cùng thông tin giao hàng nhé!\nBạn muốn thêm món gì? 😊`,
    };
  }

  async cancelPendingOrder(args) {
    const cart = await Session.getCart(this.userId);
    if (!cart?.length) return { success: true, message: 'Giỏ hàng đã trống rồi ạ.' };

    await Session.clearCart(this.userId);
    await Session.clearState(this.userId, 'awaitingConfirm');

    return {
      success: true,
      message: `✅ Đã hủy đơn hàng. Giỏ hàng đã được xóa.\nBạn muốn đặt lại hay cần mình tư vấn gì không? 😊`,
    };
  }

  // ── Formatter ──────────────────────────────────────────────────────────

  money(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }
}

module.exports = FunctionHandler;
