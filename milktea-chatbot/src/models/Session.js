const redisClient = require('../config/redis');

class Session {
  static SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || 1800; // 30 minutes

  static getKey(userId) {
    return `session:${userId}`;
  }

  static async get(userId) {
    try {
      const key = this.getKey(userId);
      const data = await redisClient.get(key);
      if (!data) {
        return this.createEmpty(userId);
      }
      return JSON.parse(data);
    } catch (err) {
      console.error('Session get error:', err);
      return this.createEmpty(userId);
    }
  }

  static async set(userId, sessionData) {
    try {
      const key = this.getKey(userId);
      await redisClient.setEx(key, this.SESSION_TIMEOUT, JSON.stringify(sessionData));
      return true;
    } catch (err) {
      console.error('Session set error:', err);
      return false;
    }
  }

  static async delete(userId) {
    try {
      const key = this.getKey(userId);
      await redisClient.del(key);
      return true;
    } catch (err) {
      console.error('Session delete error:', err);
      return false;
    }
  }

  static async addToCart(userId, item) {
    const session = await this.get(userId);
    if (!session.cart) {
      session.cart = [];
    }
    session.cart.push({
      ...item,
      addedAt: new Date().toISOString()
    });
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

  static async setCustomerInfo(userId, customerInfo) {
    const session = await this.get(userId);
    session.customerInfo = customerInfo;
    await this.set(userId, session);
    return true;
  }

  static async getCustomerInfo(userId) {
    const session = await this.get(userId);
    return session.customerInfo || null;
  }

  static async addMessage(userId, role, content) {
    const session = await this.get(userId);
    if (!session.conversationHistory) {
      session.conversationHistory = [];
    }
    session.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
    // Keep only last 20 messages
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }
    await this.set(userId, session);
    return session.conversationHistory;
  }

  static async getConversationHistory(userId) {
    const session = await this.get(userId);
    return session.conversationHistory || [];
  }

  static createEmpty(userId) {
    return {
      userId,
      cart: [],
      customerInfo: null,
      conversationHistory: [],
      createdAt: new Date().toISOString()
    };
  }
}

module.exports = Session;
