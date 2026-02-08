// api/db.js
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL manquant");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // ✅ Neon/Vercel
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

export async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}
