import { pool } from './config/db.js';
import { redisClient } from './utils/redisConnection.js';

// Close database connections after all tests
afterAll(async () => {
  try {
    if (pool) {
      await pool.end();
    }
  } catch (err) {
    console.error('Error closing database pool:', err);
  }

  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch (err) {
    console.error('Error closing Redis client:', err);
  }
});
