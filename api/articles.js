// api/articles.js
const { Pool } = require("pg");

// Connexion à Neon via la variable d'environnement DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = async (req, res) => {
  // Autoriser seulement GET et POST
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    if (req.method === "GET") {
      // Récupérer les articles (adapter au besoin le nom de la table)
      const result = await pool.query(
        `SELECT "id", "title", "slug", "summary", "category", "content", "createdAt"
         FROM "Article"
         ORDER BY "createdAt" DESC
         LIMIT 50`
      );

      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
      const { title, slug, summary, category, content } = req.body || {};

      if (!title || !slug || !content) {
        return res
          .status(400)
          .json({ error: "Titre, slug et contenu sont obligatoires." });
      }

      // ⚠️ AUCUN MOT DE PASSE ICI : tout le monde peut publier.
      const insert = await pool.query(
        `INSERT INTO "Article" ("title", "slug", "summary", "category", "content")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING "id", "title", "slug", "summary", "category", "content", "createdAt"`,
        [title, slug, summary || null, category || null, content]
      );

      return res.status(201).json(insert.rows[0]);
    }
  } catch (err) {
    console.error("Erreur API /api/articles:", err);
    return res
      .status(500)
      .json({ error: "Erreur serveur lors du traitement de l’article." });
  }
};
