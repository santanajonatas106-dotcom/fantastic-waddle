const { Pool } = require('pg');
const config = require('../config');

if (!config.databaseUrl) {
  console.warn('DATABASE_URL não configurada. Recursos de banco ficarão indisponíveis.');
}

const pool = new Pool({
  connectionString: config.databaseUrl || undefined,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

module.exports = pool;
