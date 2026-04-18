const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Starting database migration...');

    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        item_id VARCHAR(10) PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price_m INTEGER NOT NULL,
        price_l INTEGER NOT NULL,
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Products table created');

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        items JSONB NOT NULL,
        total_amount INTEGER NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_address TEXT NOT NULL,
        payment_method VARCHAR(20) DEFAULT 'COD',
        payment_status VARCHAR(20) DEFAULT 'pending',
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Orders table created');

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    `);
    console.log('✓ Indexes created');

    // Import menu data from CSV
    const csvPath = path.join(__dirname, '../../data/menu.csv');
    if (fs.existsSync(csvPath)) {
      const csvData = fs.readFileSync(csvPath, 'utf8');
      const lines = csvData.split('\n').slice(1); // Skip header

      for (const line of lines) {
        if (!line.trim()) continue;

        const parts = line.split(',');
        if (parts.length < 6) continue;

        const [category, itemId, name, description, priceM, priceL, available] = parts;

        await client.query(`
          INSERT INTO products (item_id, category, name, description, price_m, price_l, available)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (item_id) DO UPDATE SET
            category = EXCLUDED.category,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price_m = EXCLUDED.price_m,
            price_l = EXCLUDED.price_l,
            available = EXCLUDED.available,
            updated_at = CURRENT_TIMESTAMP
        `, [
          itemId.trim(),
          category.trim(),
          name.trim(),
          description.trim(),
          parseInt(priceM),
          parseInt(priceL),
          available.trim() === 'true'
        ]);
      }
      console.log('✓ Menu data imported');
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrate;
