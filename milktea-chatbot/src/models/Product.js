const pool = require('../config/database');

class Product {
  static async getAll() {
    const query = 'SELECT * FROM products WHERE available = true ORDER BY category, item_id';
    const result = await pool.query(query);
    return result.rows;
  }

  static async getByCategory(category) {
    const query = 'SELECT * FROM products WHERE category = $1 AND available = true ORDER BY item_id';
    const result = await pool.query(query, [category]);
    return result.rows;
  }

  static async getById(itemId) {
    const query = 'SELECT * FROM products WHERE item_id = $1';
    const result = await pool.query(query, [itemId]);
    return result.rows[0];
  }

  static async search(keyword) {
    const query = `
      SELECT * FROM products 
      WHERE available = true 
      AND (LOWER(name) LIKE LOWER($1) OR LOWER(description) LIKE LOWER($1))
      ORDER BY category, item_id
    `;
    const result = await pool.query(query, [`%${keyword}%`]);
    return result.rows;
  }

  static getCategories() {
    return ['Trà Sữa', 'Trà Trái Cây', 'Cà Phê', 'Đá Xay', 'Topping'];
  }
}

module.exports = Product;
