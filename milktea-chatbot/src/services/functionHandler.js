const Product = require('../models/Product');
const Session = require('../models/Session');
const Order = require('../models/Order');

class FunctionHandler {
  constructor(userId) {
    this.userId = userId;
  }

  async execute(functionName, args) {
    try {
      switch (functionName) {
        case 'get_menu':
          return await this.getMenu(args);
        case 'search_menu':
          return await this.searchMenu(args);
        case 'add_to_cart':
          return await this.addToCart(args);
        case 'view_cart':
          return await this.viewCart();
        case 'calculate_total':
          return await this.calculateTotal();
        case 'save_customer_info':
          return await this.saveCustomerInfo(args);
        case 'confirm_order':
          return await this.confirmOrder(args);
        case 'clear_cart':
          return await this.clearCart();
        default:
          return { error: `Unknown function: ${functionName}` };
      }
    } catch (err) {
      console.error(`Function ${functionName} error:`, err);
      return { error: err.message };
    }
  }

  async getMenu(args) {
    const { category = 'all' } = args;
    
    let products;
    if (category === 'all') {
      products = await Product.getAll();
    } else {
      products = await Product.getByCategory(category);
    }

    // Group by category for better display
    const grouped = {};
    products.forEach(p => {
      if (!grouped[p.category]) {
        grouped[p.category] = [];
      }
      grouped[p.category].push({
        id: p.item_id,
        name: p.name,
        description: p.description,
        price_m: p.price_m,
        price_l: p.price_l
      });
    });

    return {
      success: true,
      menu: grouped,
      message: category === 'all' 
        ? 'Đây là menu đầy đủ của quán' 
        : `Đây là menu ${category}`
    };
  }

  async searchMenu(args) {
    const { keyword } = args;
    const products = await Product.search(keyword);

    if (products.length === 0) {
      return {
        success: false,
        message: `Không tìm thấy món nào với từ khóa "${keyword}"`
      };
    }

    return {
      success: true,
      results: products.map(p => ({
        id: p.item_id,
        name: p.name,
        description: p.description,
        category: p.category,
        price_m: p.price_m,
        price_l: p.price_l
      })),
      message: `Tìm thấy ${products.length} món`
    };
  }

  async addToCart(args) {
    const { item_id, size, quantity, toppings = [] } = args;

    // Validate product exists
    const product = await Product.getById(item_id);
    if (!product) {
      return {
        success: false,
        message: `Món ${item_id} không tồn tại trong menu`
      };
    }

    if (!product.available) {
      return {
        success: false,
        message: `Món ${product.name} hiện đang hết hàng`
      };
    }

    // Validate toppings
    const validToppings = [];
    for (const toppingId of toppings) {
      const topping = await Product.getById(toppingId);
      if (!topping || topping.category !== 'Topping') {
        return {
          success: false,
          message: `Topping ${toppingId} không hợp lệ`
        };
      }
      validToppings.push({
        id: topping.item_id,
        name: topping.name,
        price: topping.price_m
      });
    }

    // Calculate price
    const basePrice = size === 'L' ? product.price_l : product.price_m;
    const toppingPrice = validToppings.reduce((sum, t) => sum + t.price, 0);
    const itemTotal = (basePrice + toppingPrice) * quantity;

    // Add to cart
    const cartItem = {
      item_id: product.item_id,
      name: product.name,
      category: product.category,
      size,
      quantity,
      base_price: basePrice,
      toppings: validToppings,
      topping_price: toppingPrice,
      total: itemTotal
    };

    await Session.addToCart(this.userId, cartItem);

    return {
      success: true,
      item: cartItem,
      message: `Đã thêm ${quantity} ${product.name} size ${size} vào giỏ hàng`
    };
  }

  async viewCart() {
    const cart = await Session.getCart(this.userId);

    if (cart.length === 0) {
      return {
        success: true,
        cart: [],
        message: 'Giỏ hàng đang trống'
      };
    }

    const total = cart.reduce((sum, item) => sum + item.total, 0);

    return {
      success: true,
      cart: cart.map((item, index) => ({
        index: index + 1,
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        toppings: item.toppings.map(t => t.name),
        total: item.total
      })),
      total,
      message: `Có ${cart.length} món trong giỏ hàng`
    };
  }

  async calculateTotal() {
    const cart = await Session.getCart(this.userId);

    if (cart.length === 0) {
      return {
        success: false,
        message: 'Giỏ hàng đang trống'
      };
    }

    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const shipping = 0; // Free shipping
    const total = subtotal + shipping;

    return {
      success: true,
      breakdown: {
        subtotal,
        shipping,
        total
      },
      formatted: {
        subtotal: this.formatMoney(subtotal),
        shipping: this.formatMoney(shipping),
        total: this.formatMoney(total)
      },
      message: `Tổng cộng: ${this.formatMoney(total)}`
    };
  }

  async saveCustomerInfo(args) {
    const { name, phone, address } = args;

    // Basic validation
    if (!name || name.trim().length < 2) {
      return {
        success: false,
        message: 'Tên khách hàng không hợp lệ'
      };
    }

    if (!phone || !/^[0-9]{10}$/.test(phone.replace(/\s/g, ''))) {
      return {
        success: false,
        message: 'Số điện thoại không hợp lệ (cần 10 chữ số)'
      };
    }

    if (!address || address.trim().length < 10) {
      return {
        success: false,
        message: 'Địa chỉ quá ngắn, vui lòng nhập chi tiết hơn'
      };
    }

    await Session.setCustomerInfo(this.userId, {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim()
    });

    return {
      success: true,
      customerInfo: { name, phone, address },
      message: 'Đã lưu thông tin khách hàng'
    };
  }

  async confirmOrder(args) {
    const { payment_method = 'COD' } = args;

    // Check cart
    const cart = await Session.getCart(this.userId);
    if (cart.length === 0) {
      return {
        success: false,
        message: 'Giỏ hàng đang trống, không thể tạo đơn'
      };
    }

    // Check customer info
    const customerInfo = await Session.getCustomerInfo(this.userId);
    if (!customerInfo) {
      return {
        success: false,
        message: 'Chưa có thông tin khách hàng. Vui lòng cung cấp tên, SĐT và địa chỉ giao hàng.'
      };
    }

    // Calculate total
    const total = cart.reduce((sum, item) => sum + item.total, 0);

    // Create order
    const order = await Order.create({
      userId: this.userId,
      items: cart,
      totalAmount: total,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      customerAddress: customerInfo.address,
      paymentMethod: payment_method,
      paymentStatus: payment_method === 'COD' ? 'pending' : 'awaiting'
    });

    // Clear cart after successful order
    await Session.clearCart(this.userId);

    return {
      success: true,
      order: {
        order_id: order.order_id,
        total: total,
        formatted_total: this.formatMoney(total),
        payment_method,
        customer: customerInfo,
        items: cart
      },
      message: `Đơn hàng ${order.order_id.substring(0, 8)} đã được tạo thành công!`
    };
  }

  async clearCart() {
    await Session.clearCart(this.userId);
    return {
      success: true,
      message: 'Đã xóa toàn bộ giỏ hàng'
    };
  }

  formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }
}

module.exports = FunctionHandler;
