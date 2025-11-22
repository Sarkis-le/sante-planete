diff --git a/api/server.js b/api/server.js
index e6f0f3a95a268afd75babb4f2db674bad341927c..e5b79156cdef307f9e70784740c53ee8c224290c 100644
--- a/api/server.js
+++ b/api/server.js
@@ -1,37 +1,21 @@
-import express from "express";
-import cors from "cors";
-import { pool } from "./db.js";
+import http from "http";
+import handler, { DEFAULT_HEADERS } from "./articles.js";
 
-const app = express();
-app.use(express.json());
-app.use(cors());
+const server = http.createServer((req, res) => {
+  const pathname = req.url ? new URL(req.url, "http://localhost").pathname : "";
 
-app.get("/api/articles", async (req, res) => {
-  try {
-    const { rows } = await pool.query("SELECT * FROM articles ORDER BY id DESC");
-    res.json(rows);
-  } catch (e) {
-    res.status(500).json({ error: "Erreur serveur" });
+  if (pathname === "/api/articles") {
+    handler(req, res);
+    return;
   }
-});
-
-app.post("/api/articles", async (req, res) => {
-  try {
-    const { title, summary, content, category, slug } = req.body;
 
-    const { rows } = await pool.query(
-      `INSERT INTO articles (title, summary, content, category, slug)
-       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
-      [title, summary, content, category, slug]
-    );
-
-    res.json(rows[0]);
-  } catch (e) {
-    console.error(e);
-    res.status(500).json({ error: "Erreur serveur" });
-  }
+  res.writeHead(404, {
+    ...DEFAULT_HEADERS,
+    "Content-Type": "application/json",
+  });
+  res.end(JSON.stringify({ error: "Ressource non trouvée" }));
 });
 
-app.listen(3000, () => {
+server.listen(3000, () => {
   console.log("API Santé Planète en ligne sur port 3000");
 });
