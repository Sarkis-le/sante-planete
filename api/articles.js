// api/articles.js
import { query } from "./db.js";

export const DEFAULT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

function applyCors(res) {
  Object.entries(DEFAULT_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

function sendJson(res, status, payload) {
  applyCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export async function readJsonBody(req) {
  // Si un middleware a déjà parsé le body
  if (req.body !== undefined) {
    if (typeof req.body === "string") {
      return req.body ? JSON.parse(req.body) : {};
    }
    return req.body;
  }

  // Sinon : on lit le flux brut
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", reject);
  });
}

/**
 * Récupère éventuellement l'id dans /api/articles/:id
 * Compatible avec :
 *   - id numérique (1, 2, 3…)
 *   - id uuid (d0f0b8e4-1234-5678-9abc-abcdef012345)
 */
function getArticleIdFromPath(pathname) {
  // /api/articles  ou /api/articles/<id> (tout ce qui n'est pas un /)
  const match = pathname.match(/^\/api\/articles\/?([^/]+)?$/);
  if (!match || !match[1]) return null;
  return match[1]; // on laisse tel quel (string) → ok pour uuid ou int
}

/**
 * Normalise une ligne retournée par Postgres en objet article
 * pour le front (toujours imageUrl côté JS).
 */
function mapArticleRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: row.content,
    category: row.category,
    imageUrl: row.imageUrl || row.image_url || row.imageurl || null,
  };
}

export default async function handler(req, res) {
  applyCors(res);

  const url = req.url ? new URL(req.url, "http://localhost") : null;
  const pathname = url ? url.pathname : "";

  // On accepte /api/articles et /api/articles/:id
  if (!pathname.startsWith("/api/articles")) {
    sendJson(res, 404, { error: "Ressource non trouvée" });
    return;
  }

  const articleId = getArticleIdFromPath(pathname);

  if (req.method === "OPTIONS") {
    // Pré-flight CORS
    res.statusCode = 204;
    res.end();
    return;
  }

  // --- GET ---
  if (req.method === "GET") {
    try {
      if (articleId != null) {
        const rows = await query("SELECT * FROM articles WHERE id = $1", [
          articleId,
        ]);
        if (!rows.length) {
          sendJson(res, 404, { error: "Article introuvable" });
          return;
        }
        const article = mapArticleRow(rows[0]);
        sendJson(res, 200, article);
      } else {
        const rows = await query(
          'SELECT * FROM articles ORDER BY id DESC'
        );
        const articles = rows.map(mapArticleRow);
        sendJson(res, 200, articles);
      }
    } catch (err) {
      console.error("GET /api/articles error", err);
      sendJson(res, 500, { error: "Erreur serveur" });
    }
    return;
  }

  // --- POST (création) ---
  if (req.method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (err) {
      console.error("POST /api/articles body parse error", err);
      sendJson(res, 400, { error: "Corps de requête invalide" });
      return;
    }

    const {
      title,
      slug,
      content,
      summary = "",
      category = "",
      imageUrl = "",
    } = body || {};

    if (!title || !slug || !content) {
      sendJson(res, 400, {
        error: "Titre, slug et contenu sont requis.",
      });
      return;
    }

    try {
      const rows = await query(
        `INSERT INTO articles (title, summary, content, category, slug, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, summary, content, category, slug, imageUrl]
      );

      const article = mapArticleRow(rows[0]);
      sendJson(res, 201, article);
    } catch (err) {
      console.error("POST /api/articles error", err);
      if (err.code === "23505") {
        // slug unique
        sendJson(res, 400, { error: "Ce slug est déjà utilisé." });
      } else {
        sendJson(res, 500, { error: "Erreur serveur" });
      }
    }
    return;
  }

  // A partir d'ici, il faut un id
  if (articleId == null) {
    sendJson(res, 400, {
      error: "Identifiant d’article manquant dans l’URL.",
    });
    return;
  }

  // --- PUT (mise à jour) ---
  if (req.method === "PUT") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (err) {
      console.error("PUT /api/articles body parse error", err);
      sendJson(res, 400, { error: "Corps de requête invalide" });
      return;
    }

    const {
      title,
      slug,
      content,
      summary = "",
      category = "",
      imageUrl = "",
    } = body || {};

    if (!title || !slug || !content) {
      sendJson(res, 400, {
        error: "Titre, slug et contenu sont requis.",
      });
      return;
    }

    try {
      const rows = await query(
        `UPDATE articles
         SET title      = $1,
             summary    = $2,
             content    = $3,
             category   = $4,
             slug       = $5,
             image_url  = $6
         WHERE id = $7
         RETURNING *`,
        [title, summary, content, category, slug, imageUrl, articleId]
      );

      if (!rows.length) {
        sendJson(res, 404, { error: "Article introuvable" });
        return;
      }

      const article = mapArticleRow(rows[0]);
      sendJson(res, 200, article);
    } catch (err) {
      console.error("PUT /api/articles error", err);
      if (err.code === "23505") {
        sendJson(res, 400, { error: "Ce slug est déjà utilisé." });
      } else {
        sendJson(res, 500, { error: "Erreur serveur" });
      }
    }
    return;
  }

  // --- DELETE ---
  if (req.method === "DELETE") {
    try {
      const rows = await query(
        "DELETE FROM articles WHERE id = $1 RETURNING id",
        [articleId]
      );
      if (!rows.length) {
        sendJson(res, 404, { error: "Article introuvable" });
        return;
      }
      sendJson(res, 200, { success: true });
    } catch (err) {
      console.error("DELETE /api/articles error", err);
      sendJson(res, 500, { error: "Erreur serveur" });
    }
    return;
  }

  // Méthode non gérée
  sendJson(res, 405, { error: "Méthode non autorisée" });
}
