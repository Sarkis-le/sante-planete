diff --git a/api/db.js b/api/db.js
index c9e33b2ffb1d9774d1d97e6b1a829a9881e54134..f5f2dcd66ed1db4406667fd55dc2a27ae9f911b7 100644
--- a/api/db.js
+++ b/api/db.js
@@ -1,18 +1,22 @@
-// api/db.js
-const { Client } = require("pg");
+import { Pool } from "pg";
 
 const connectionString = process.env.DATABASE_URL;
 
-async function query(text, params) {
+let pool;
+
+function getPool() {
   if (!connectionString) {
     throw new Error("DATABASE_URL manquant");
   }
 
-  const client = new Client({ connectionString });
-  await client.connect();
-  const res = await client.query(text, params);
-  await client.end();
-  return res.rows;
+  if (!pool) {
+    pool = new Pool({ connectionString });
+  }
+
+  return pool;
 }
 
-module.exports = { query };
+export async function query(text, params) {
+  const res = await getPool().query(text, params);
+  return res.rows;
+}
