// api/articles.js
import { query } from "./db.js";

export const DEFAULT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

  // Sinon : on lit le flux brut (HTTP natif)
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

export default async function handler(req, res) {
  // CORS de base (sera re-posé par sendJson, ce n’est pas grave)
  applyCors(res);

  const url = req.url ? new URL(req.url, "http://localhost") : null;
  const pathname = url ? url.pathname : "";

  // Sécurise : ce handler ne gère que /api/articles
  if (pathname && pathname !== "/api/articles") {
    sendJson(res, 404, { error: "Ressource non trouvée" });
    return;
  }

  if (req.method === "OPTIONS") {
    // Pré-flight CORS
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET") {
    try {
      // On suppose que la table s’appelle bien "articles"
      // et qu’elle contient au moins : id, title, summary, content, category, slug, createdAt
      const rows = await query("SELECT * FROM articles ORDER BY id DESC");
      sendJson(res, 200, rows);
    } catch (err) {
      console.error("GET /api/articles error", err);
      sendJson(res, 500, { error: "Erreur serveur" });
    }
    return;
  }

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
    } = body || {};

    if (!title || !slug || !content) {
      sendJson(res, 400, {
        error: "Titre, slug et contenu sont requis.",
      });
      return;
    }

    try {
      const rows = await query(
        `INSERT INTO articles (title, summary, content, category, slug)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [title, summary, content, category, slug]
      );
      sendJson(res, 201, rows[0]);
    } catch (err) {
      console.error("POST /api/articles error", err);
      sendJson(res, 500, { error: "Erreur serveur" });
    }
    return;
  }

  // Méthode non gérée
  sendJson(res, 405, { error: "Méthode non autorisée" });
}
