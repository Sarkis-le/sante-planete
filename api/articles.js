diff --git a/api/articles.js b/api/articles.js
index 95c4da2fedd04834dc098fc021a101af467053d3..289b3a08e6a94cd2554467f4fae1af84a80ef35d 100644
--- a/api/articles.js
+++ b/api/articles.js
@@ -1,91 +1,114 @@
-// api/articles.js
-const { query } = require("./db");
+import { query } from "./db.js";
 
-const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
+export const DEFAULT_HEADERS = {
+  "Access-Control-Allow-Origin": "*",
+  "Access-Control-Allow-Headers": "Content-Type",
+  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
+};
+
+function applyCors(res) {
+  Object.entries(DEFAULT_HEADERS).forEach(([key, value]) => {
+    res.setHeader(key, value);
+  });
+}
+
+function sendJson(res, status, payload) {
+  applyCors(res);
+  res.statusCode = status;
+  res.setHeader("Content-Type", "application/json");
+  res.end(JSON.stringify(payload));
+}
+
+export async function readJsonBody(req) {
+  if (req.body !== undefined) {
+    if (typeof req.body === "string") {
+      return req.body ? JSON.parse(req.body) : {};
+    }
+    return req.body;
+  }
 
-async function parseJsonBody(req) {
   return new Promise((resolve, reject) => {
-    let body = "";
+    let data = "";
+
     req.on("data", (chunk) => {
-      body += chunk.toString();
+      data += chunk;
     });
+
     req.on("end", () => {
       try {
-        resolve(JSON.parse(body || "{}"));
-      } catch (e) {
-        reject(e);
+        resolve(data ? JSON.parse(data) : {});
+      } catch (err) {
+        reject(err);
       }
     });
+
+    req.on("error", reject);
   });
 }
 
-module.exports = async (req, res) => {
-  res.setHeader("Content-Type", "application/json");
+export default async function handler(req, res) {
+  applyCors(res);
+
+  const pathname = req.url ? new URL(req.url, "http://localhost").pathname : "";
+  if (pathname && pathname !== "/api/articles") {
+    sendJson(res, 404, { error: "Ressource non trouvée" });
+    return;
+  }
+
+  if (req.method === "OPTIONS") {
+    res.statusCode = 204;
+    res.end();
+    return;
+  }
 
   if (req.method === "GET") {
-    // Liste des articles publiés
     try {
-      const rows = await query(
-        'SELECT id, slug, title, summary, category, content, "createdAt", published FROM "Article" WHERE published = true ORDER BY "createdAt" DESC'
-      );
-      res.statusCode = 200;
-      res.end(JSON.stringify(rows));
+      const rows = await query("SELECT * FROM articles ORDER BY id DESC");
+      sendJson(res, 200, rows);
     } catch (err) {
-      console.error("GET /api/articles error", err);
-      res.statusCode = 500;
-      res.end(JSON.stringify({ error: "Erreur lors du chargement des articles" }));
+      console.error(err);
+      sendJson(res, 500, { error: "Erreur serveur" });
     }
     return;
   }
 
   if (req.method === "POST") {
-    // Création d'un article
+    let body;
     try {
-      const body = await parseJsonBody(req);
-
-      const {
-        adminPassword,
-        title,
-        slug,
-        summary,
-        category,
-        content,
-        published
-      } = body || {};
-
-      if (!adminPassword || adminPassword !== ADMIN_PASSWORD) {
-        res.statusCode = 401;
-        res.end(JSON.stringify({ error: "Mot de passe administrateur invalide" }));
-        return;
-      }
+      body = await readJsonBody(req);
+    } catch (err) {
+      sendJson(res, 400, { error: "Corps de requête invalide" });
+      return;
+    }
 
-      if (!title || !slug || !content) {
-        res.statusCode = 400;
-        res.end(
-          JSON.stringify({
-            error: "Titre, slug et contenu sont obligatoires"
-          })
-        );
-        return;
-      }
+    const {
+      title,
+      slug,
+      content,
+      summary = "",
+      category = "",
+    } = body || {};
 
-      await query(
-        `INSERT INTO "Article" (title, slug, summary, category, content, "createdAt", published)
-         VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
-        [title, slug, summary || null, category || null, content, !!published]
-      );
+    if (!title || !slug || !content) {
+      sendJson(res, 400, {
+        error: "Titre, slug et contenu sont requis.",
+      });
+      return;
+    }
 
-      res.statusCode = 200;
-      res.end(JSON.stringify({ ok: true }));
+    try {
+      const rows = await query(
+        `INSERT INTO articles (title, summary, content, category, slug)
+         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
+        [title, summary, content, category, slug]
+      );
+      sendJson(res, 201, rows[0]);
     } catch (err) {
-      console.error("POST /api/articles error", err);
-      res.statusCode = 500;
-      res.end(JSON.stringify({ error: "Erreur lors de la création de l'article" }));
+      console.error(err);
+      sendJson(res, 500, { error: "Erreur serveur" });
     }
     return;
   }
 
-  // Méthode non gérée
-  res.statusCode = 405;
-  res.end(JSON.stringify({ error: "Méthode non autorisée" }));
-};
+  sendJson(res, 405, { error: "Méthode non autorisée" });
+}
