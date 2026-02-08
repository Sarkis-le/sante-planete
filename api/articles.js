// api/articles.js
import { URL } from "url";
import { query } from "./db.js";
import { applyCors, sendJson, readJsonBody, segs } from "./utils.js";

function mapArticleRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: row.content,
    category: row.category,
    imageUrl: row.image_url ?? row.imageUrl ?? row.imageurl ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export default async function handler(req, res) {
  applyCors(res);

  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;
  const S = segs(pathname); // ["api","articles", maybe ":id"]

  if (S[0] !== "api" || S[1] !== "articles") {
    return sendJson(res, 404, { error: "Ressource non trouvée" });
  }

  // /api/articles/:id
  const id = S.length === 3 ? decodeURIComponent(S[2]) : null;

  // -------- GET --------
  if (req.method === "GET") {
    try {
      if (id) {
        const rows = await query("SELECT * FROM articles WHERE id = $1 LIMIT 1", [id]);
        if (!rows.length) return sendJson(res, 404, { error: "Article introuvable" });
        return sendJson(res, 200, mapArticleRow(rows[0]));
      }

      const rows = await query("SELECT * FROM articles ORDER BY id DESC");
      return sendJson(res, 200, rows.map(mapArticleRow));
    } catch (err) {
      console.error("GET /api/articles error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // -------- POST --------
  if (req.method === "POST" && !id) {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (e) {
      console.error("POST /api/articles body parse error", e);
      return sendJson(res, 400, { error: "Corps de requête invalide" });
    }

    const { title, slug, content, summary = "", category = "", imageUrl = "" } = body || {};
    if (!title || !slug || !content) {
      return sendJson(res, 400, { error: "Titre, slug et contenu sont requis." });
    }

    try {
      const rows = await query(
        `INSERT INTO articles (title, summary, content, category, slug, image_url)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [title, summary, content, category, slug, imageUrl]
      );
      return sendJson(res, 201, mapArticleRow(rows[0]));
    } catch (err) {
      console.error("POST /api/articles error", err);
      if (err.code === "23505") return sendJson(res, 400, { error: "Ce slug est déjà utilisé." });
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // À partir d’ici (PUT/DELETE) => id obligatoire
  if (!id) {
    return sendJson(res, 400, { error: "Identifiant manquant dans l’URL (/api/articles/:id)." });
  }

  // -------- PUT --------
  if (req.method === "PUT") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (e) {
      console.error("PUT /api/articles body parse error", e);
      return sendJson(res, 400, { error: "Corps de requête invalide" });
    }

    const { title, slug, content, summary = "", category = "", imageUrl = "" } = body || {};
    if (!title || !slug || !content) {
      return sendJson(res, 400, { error: "Titre, slug et contenu sont requis." });
    }

    try {
      const rows = await query(
        `UPDATE articles
           SET title=$1, summary=$2, content=$3, category=$4, slug=$5, image_url=$6, updated_at=NOW()
         WHERE id=$7
         RETURNING *`,
        [title, summary, content, category, slug, imageUrl, id]
      );

      if (!rows.length) return sendJson(res, 404, { error: "Article introuvable" });
      return sendJson(res, 200, mapArticleRow(rows[0]));
    } catch (err) {
      console.error("PUT /api/articles error", err);
      if (err.code === "23505") return sendJson(res, 400, { error: "Ce slug est déjà utilisé." });
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // -------- DELETE --------
  if (req.method === "DELETE") {
    try {
      const rows = await query("DELETE FROM articles WHERE id=$1 RETURNING id", [id]);
      if (!rows.length) return sendJson(res, 404, { error: "Article introuvable" });
      return sendJson(res, 200, { success: true });
    } catch (err) {
      console.error("DELETE /api/articles error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  return sendJson(res, 405, { error: "Méthode non autorisée" });
}
