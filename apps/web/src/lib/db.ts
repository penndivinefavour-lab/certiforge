// CertiForge Database Client (raw PostgreSQL queries)
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://certiforge:***@localhost:5432/certiforge';

const client = new Client({ connectionString: DATABASE_URL });

async function connect(): Promise<boolean> {
  try {
    await client.connect();
    console.log('Database connected');
    return true;
  } catch (error) {
    console.error('Database connection error:', (error as Error).message);
    return false;
  }
}

async function disconnect(): Promise<void> {
  await client.end();
}

async function query(text: string, params?: any[]): Promise<any[]> {
  await connect();
  const result = await client.query(text, params);
  return result.rows;
}

async function queryOne(text: string, params?: any[]): Promise<any | null> {
  await connect();
  const result = await client.query(text, params);
  return result.rows[0] || null;
}

async function execute(text: string, params?: any[]): Promise<void> {
  await connect();
  await client.query(text, params);
}

export { connect, disconnect, query, queryOne, execute, client };

// Re-export for backward compatibility
export const prisma = {
  query,
  queryOne,
  execute,
};
