// api/articles.js
const { query } = require("./db");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (e) {
        reject(e);
      }
    });
  });
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET") {
    // Liste des articles publiés
    try {
      const rows = await query(
        'SELECT id, slug, title, summary, category, content, "createdAt", published FROM "Article" WHERE published = true ORDER BY "createdAt" DESC'
      );
      res.statusCode = 200;
      res.end(JSON.stringify(rows));
    } catch (err) {
      console.error("GET /api/articles error", err);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Erreur lors du chargement des articles" }));
    }
    return;
  }

  if (req.method === "POST") {
    // Création d'un article
    try {
      const body = await parseJsonBody(req);

      const {
        adminPassword,
        title,
        slug,
        summary,
        category,
        content,
        published
      } = body || {};

      if (!adminPassword || adminPassword !== ADMIN_PASSWORD) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "Mot de passe administrateur invalide" }));
        return;
      }

      if (!title || !slug || !content) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            error: "Titre, slug et contenu sont obligatoires"
          })
        );
        return;
      }

      await query(
        `INSERT INTO "Article" (title, slug, summary, category, content, "createdAt", published)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
        [title, slug, summary || null, category || null, content, !!published]
      );

      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error("POST /api/articles error", err);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Erreur lors de la création de l'article" }));
    }
    return;
  }

  // Méthode non gérée
  res.statusCode = 405;
  res.end(JSON.stringify({ error: "Méthode non autorisée" }));
};
