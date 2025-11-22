// api/db.js
const { Client } = require("pg");

const connectionString = process.env.DATABASE_URL;

async function query(text, params) {
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant");
  }

  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query(text, params);
  await client.end();
  return res.rows;
}

module.exports = { query };
