const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'homefinder_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: '+03:00',
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database [homefinder_db]');
    connection.release();
  } catch (error) {
    console.error('MySQL connection error:', error.message);
  }
})();

module.exports = pool;
