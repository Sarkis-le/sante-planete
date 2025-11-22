// lib/db.ts
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant");
  }

  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query<T>(text, params);
  await client.end();
  return res.rows;
}
