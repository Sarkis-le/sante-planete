// api/stories.js
import { URL } from "url";
import { query } from "./db.js";
import { applyCors, sendJson, readJsonBody, segs, isNumericId } from "./utils.js";

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

    // legacy (si tu les avais)
    pages: row.pages || [],
    content: row.content || "",
  };
}

export default async function handler(req, res) {
  applyCors(res);

  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;
  const S = segs(pathname); // ["api","stories", ...]
  const key = S.length >= 3 ? decodeURIComponent(S[2]) : null;

  if (S[0] !== "api" || S[1] !== "stories") {
    return sendJson(res, 404, { error: "Ressource non trouvée" });
  }

  // ---------------------------
  // GET /api/stories (liste)
  // ---------------------------
  if (req.method === "GET" && S.length === 2) {
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

  // ---------------------------
  // GET /api/stories/:slugOrId (détail)
  // ---------------------------
  if (req.method === "GET" && S.length === 3) {
    try {
      const rows = isNumericId(key)
        ? await query("SELECT * FROM stories WHERE id=$1 LIMIT 1", [key])
        : await query("SELECT * FROM stories WHERE slug=$1 LIMIT 1", [key]);

      if (!rows.length) return sendJson(res, 404, { error: "Histoire introuvable" });
      return sendJson(res, 200, mapStoryRow(rows[0]));
    } catch (err) {
      console.error("GET /api/stories/:key error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // ---------------------------
  // GET /api/stories/:slugOrId/episodes
  // ---------------------------
  if (req.method === "GET" && S.length === 4 && S[3] === "episodes") {
    try {
      const storyRows = isNumericId(key)
        ? await query("SELECT id FROM stories WHERE id=$1 LIMIT 1", [key])
        : await query("SELECT id FROM stories WHERE slug=$1 LIMIT 1", [key]);

      if (!storyRows.length) return sendJson(res, 404, { error: "Histoire introuvable" });

      const storyId = storyRows[0].id;
const eps = await query(
  `SELECT id, story_id, title, slug, episode_number, summary, kind, image_url, created_at, updated_at
     FROM episodes
    WHERE story_id=$1
    ORDER BY episode_number ASC, created_at ASC`,
  [storyId]
);


      return sendJson(res, 200, eps);
    } catch (err) {
      console.error("GET /api/stories/:key/episodes error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // ---------------------------
  // POST /api/stories
  // ---------------------------
  if (req.method === "POST" && S.length === 2) {
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

  // ---------------------------
  // PUT /api/stories/:id (update)
  // (par sécurité: update uniquement sur id numérique)
  // ---------------------------
  if (req.method === "PUT" && S.length === 3) {
    if (!isNumericId(key)) {
      return sendJson(res, 400, { error: "Pour modifier, utilise l’id numérique (/api/stories/:id)." });
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

  // ---------------------------
  // DELETE /api/stories/:id
  // (on suppose FK ON DELETE CASCADE sur episodes.story_id)
  // ---------------------------
  if (req.method === "DELETE" && S.length === 3) {
    if (!isNumericId(key)) {
      return sendJson(res, 400, { error: "Pour supprimer, utilise l’id numérique (/api/stories/:id)." });
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

  return sendJson(res, 405, { error: "Méthode non autorisée / route non gérée" });
}
