// api/stories/[key].js
import { query } from "../db.js";
import { applyCors, sendJson, readJsonBody, isNumericId } from "../utils.js";

function mapStoryRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    summary: row.summary,
    coverUrl: row.cover_url ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") return sendJson(res, 204, null);

  const { key } = req.query; // Vercel fournit req.query sur les routes dynamiques

  // GET /api/stories/:key (slug ou id)
  if (req.method === "GET") {
    try {
      const rows = isNumericId(String(key))
        ? await query("SELECT * FROM stories WHERE id=$1 LIMIT 1", [key])
        : await query("SELECT * FROM stories WHERE slug=$1 LIMIT 1", [key]);

      if (!rows.length) return sendJson(res, 404, { error: "Histoire introuvable" });
      return sendJson(res, 200, mapStoryRow(rows[0]));
    } catch (err) {
      console.error("GET /api/stories/:key error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // PUT /api/stories/:id
  if (req.method === "PUT") {
    if (!isNumericId(String(key))) {
      return sendJson(res, 400, { error: "Pour modifier, utilise l’id numérique." });
    }

    let body = {};
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { error: "Corps de requête invalide" });
    }

    const { title, slug, category = "", summary = "", coverUrl = "" } = body || {};
    if (!title || !slug) return sendJson(res, 400, { error: "Titre et slug sont requis." });

    try {
      const rows = await query(
        `UPDATE stories
            SET title=$1, slug=$2, category=$3, summary=$4, cover_url=$5, updated_at=NOW()
          WHERE id=$6
          RETURNING *`,
        [title, slug, category, summary, coverUrl, key]
      );

      if (!rows.length) return sendJson(res, 404, { error: "Histoire introuvable" });
      return sendJson(res, 200, mapStoryRow(rows[0]));
    } catch (err) {
      console.error("PUT /api/stories error", err);
      if (err.code === "23505") return sendJson(res, 400, { error: "Ce slug est déjà utilisé." });
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // DELETE /api/stories/:id
  if (req.method === "DELETE") {
    if (!isNumericId(String(key))) {
      return sendJson(res, 400, { error: "Pour supprimer, utilise l’id numérique." });
    }
    try {
      const rows = await query("DELETE FROM stories WHERE id=$1 RETURNING id", [key]);
      if (!rows.length) return sendJson(res, 404, { error: "Histoire introuvable" });
      return sendJson(res, 200, { success: true });
    } catch (err) {
      console.error("DELETE /api/stories error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  return sendJson(res, 405, { error: "Méthode non autorisée" });
}
