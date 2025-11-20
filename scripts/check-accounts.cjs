#!/usr/bin/env node
const path = require('node:path');
const { config } = require('dotenv');
const { Pool } = require('pg');

config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: false
});

async function test() {
  const client = await pool.connect();
  try {
    const schema = process.env.POSTGRES_SCHEMA?.trim() || 'public';
    console.log(`Testing schema: "${schema}"`);
    
    await client.query(`SET search_path TO "${schema}"`);
    
    const result = await client.query('SELECT id, email, role FROM accounts LIMIT 3');
    console.log('Accounts found:', result.rowCount);
    console.log(result.rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

test();
