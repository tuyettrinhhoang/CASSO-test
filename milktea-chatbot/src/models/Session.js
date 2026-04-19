const redisClient = require('../config/redis');

class Session {
  static SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || 1800;

  static getKey(userId) { return `session:${userId}`; }

  static async get(userId) {
    try {
      const data = await redisClient.get(this.getKey(userId));
      return data ? JSON.parse(data) : this.createEmpty(userId);
    } catch (err) {
      console.error('Session.get error:', err);
      return this.createEmpty(userId);
    }
  }

  static async set(userId, sessionData) {
    try {
      await redisClient.setEx(this.getKey(userId), this.SESSION_TIMEOUT, JSON.stringify(sessionData));
      return true;
    } catch (err) {
      console.error('Session.set error:', err);
      return false;
    }
  }

  static async delete(userId) {
    try {
      await redisClient.del(this.getKey(userId));
      return true;
    } catch (err) {
      console.error('Session.delete error:', err);
      return false;
    }
  }

  // ── Cart ────────────────────────────────────────────────────────────────

  static async addToCart(userId, item) {
    const session = await this.get(userId);
    if (!session.cart) session.cart = [];
    session.cart.push({ ...item, cartIndex: session.cart.length, addedAt: new Date().toISOString() });
    await this.set(userId, session);
    return session.cart;
  }

  static async getCart(userId) {
    const session = await this.get(userId);
    return session.cart || [];
  }

  static async clearCart(userId) {
    const session = await this.get(userId);
    session.cart = [];
    await this.set(userId, session);
    return true;
  }

  /**
   * Remove a single cart item by 1-based position index.
   * Returns { removed, cart } or null if index invalid.
   */
  static async removeCartItem(userId, positionIndex) {
    const session = await this.get(userId);
    const cart = session.cart || [];
    const idx = positionIndex - 1; // convert to 0-based
    if (idx < 0 || idx >= cart.length) return null;
    const [removed] = cart.splice(idx, 1);
    session.cart = cart;
    await this.set(userId, session);
    return { removed, cart };
  }

  /**
   * Update quantity of a cart item by 1-based position.
   * Returns updated item or null.
   */
  static async updateCartItemQty(userId, positionIndex, newQty) {
    const session = await this.get(userId);
    const cart = session.cart || [];
    const idx = positionIndex - 1;
    if (idx < 0 || idx >= cart.length) return null;
    const item = cart[idx];
    // Recalculate total
    item.quantity = newQty;
    item.total = (item.base_price + item.topping_price) * newQty;
    cart[idx] = item;
    session.cart = cart;
    await this.set(userId, session);
    return item;
  }

  /**
   * Update size of a cart item by 1-based position.
   * Needs price_l / price_m from caller.
   */
  static async updateCartItemSize(userId, positionIndex, newSize, newBasePrice) {
    const session = await this.get(userId);
    const cart = session.cart || [];
    const idx = positionIndex - 1;
    if (idx < 0 || idx >= cart.length) return null;
    const item = cart[idx];
    item.size = newSize;
    item.base_price = newBasePrice;
    item.total = (item.base_price + item.topping_price) * item.quantity;
    cart[idx] = item;
    session.cart = cart;
    await this.set(userId, session);
    return item;
  }

  // ── Customer info ────────────────────────────────────────────────────────

  static async setCustomerInfo(userId, info) {
    const session = await this.get(userId);
    session.customerInfo = info;
    await this.set(userId, session);
    return true;
  }

  static async getCustomerInfo(userId) {
    const session = await this.get(userId);
    return session.customerInfo || null;
  }

  // ── Conversation history ─────────────────────────────────────────────────

  static async addMessage(userId, role, content) {
    const session = await this.get(userId);
    if (!session.conversationHistory) session.conversationHistory = [];
    session.conversationHistory.push({ role, content, timestamp: new Date().toISOString() });
    if (session.conversationHistory.length > 30) {
      session.conversationHistory = session.conversationHistory.slice(-30);
    }
    await this.set(userId, session);
    return session.conversationHistory;
  }

  static async getConversationHistory(userId) {
    const session = await this.get(userId);
    return session.conversationHistory || [];
  }

  // ── State flags ──────────────────────────────────────────────────────────

  /** Save arbitrary state key on session (e.g. pendingSize, awaitingConfirm) */
  static async setState(userId, key, value) {
    const session = await this.get(userId);
    if (!session.state) session.state = {};
    session.state[key] = value;
    await this.set(userId, session);
  }

  static async getState(userId, key) {
    const session = await this.get(userId);
    return session.state?.[key];
  }

  static async clearState(userId, key) {
    const session = await this.get(userId);
    if (session.state) delete session.state[key];
    await this.set(userId, session);
  }

  // ── Factory ──────────────────────────────────────────────────────────────

  static createEmpty(userId) {
    return {
      userId,
      cart: [],
      customerInfo: null,
      conversationHistory: [],
      state: {},
      lastConfirmedOrder: null,
      createdAt: new Date().toISOString(),
    };
  }
}

module.exports = Session;
