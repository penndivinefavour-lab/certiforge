// CertiForge Database Client (raw PostgreSQL queries)
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://certiforge:certiforge123@localhost:5432/certiforge';

const client = new Client({ connectionString: DATABASE_URL });

async function connect() {
  try {
    await client.connect();
    console.log('Database connected');
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    return false;
  }
}

async function disconnect() {
  await client.end();
}

async function query(text, params) {
  await connect();
  const result = await client.query(text, params);
  return result.rows;
}

async function queryOne(text, params) {
  await connect();
  const result = await client.query(text, params);
  return result.rows[0] || null;
}

async function execute(text, params) {
  await connect();
  await client.query(text, params);
}

module.exports = { connect, disconnect, query, queryOne, execute, client };
