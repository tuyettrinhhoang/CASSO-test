const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Order {
  static async create(orderData) {
    const {
      userId,
      items,
      totalAmount,
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod = 'COD',
      paymentStatus = 'pending'
    } = orderData;

    const orderId = uuidv4();
    const query = `
      INSERT INTO orders 
      (order_id, user_id, items, total_amount, customer_name, customer_phone, 
       customer_address, payment_method, payment_status, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `;

    const values = [
      orderId,
      userId,
      JSON.stringify(items),
      totalAmount,
      customerName,
      customerPhone,
      customerAddress,
      paymentMethod,
      paymentStatus,
      'pending'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getById(orderId) {
    const query = 'SELECT * FROM orders WHERE order_id = $1';
    const result = await pool.query(query, [orderId]);
    return result.rows[0];
  }

  static async getByUserId(userId, limit = 10) {
    const query = `
      SELECT * FROM orders 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  static async updateStatus(orderId, status) {
    const query = 'UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2 RETURNING *';
    const result = await pool.query(query, [status, orderId]);
    return result.rows[0];
  }

  static async updatePaymentStatus(orderId, paymentStatus) {
    const query = 'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE order_id = $2 RETURNING *';
    const result = await pool.query(query, [paymentStatus, orderId]);
    return result.rows[0];
  }

  static async getAllPending() {
    const query = `
      SELECT * FROM orders 
      WHERE status = 'pending' 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getTodayOrders() {
    const query = `
      SELECT * FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = Order;
