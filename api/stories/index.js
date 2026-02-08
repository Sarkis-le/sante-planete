// api/stories/index.js
import { query } from "../db.js";
import { applyCors, sendJson, readJsonBody } from "../utils.js";

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

  // GET /api/stories
  if (req.method === "GET") {
    try {
      const rows = await query(`
        SELECT s.*,
          (SELECT COUNT(*) FROM episodes e WHERE e.story_id = s.id) AS episodes_count
        FROM stories s
        ORDER BY s.created_at DESC, s.id DESC
      `);

      const out = rows.map((r) => ({
        ...mapStoryRow(r),
        episodesCount: Number(r.episodes_count || 0),
      }));

      return sendJson(res, 200, out);
    } catch (err) {
      console.error("GET /api/stories error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // POST /api/stories
  if (req.method === "POST") {
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
        `INSERT INTO stories (title, slug, category, summary, cover_url)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [title, slug, category, summary, coverUrl]
      );
      return sendJson(res, 201, mapStoryRow(rows[0]));
    } catch (err) {
      console.error("POST /api/stories error", err);
      if (err.code === "23505") return sendJson(res, 400, { error: "Ce slug est déjà utilisé." });
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  return sendJson(res, 405, { error: "Méthode non autorisée" });
}
