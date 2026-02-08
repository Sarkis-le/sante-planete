// api/episodes.js
import { URL } from "url";
import { query } from "./db.js";
import { applyCors, sendJson, readJsonBody, segs, isNumericId } from "./utils.js";

function mapEpisodeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    storyId: row.story_id,
    title: row.title,
    slug: row.slug,
    episodeNumber: row.episode_number,
    summary: row.summary,
    kind: row.kind || "TEXTE",          // "BD" | "TEXTE"
    imageUrl: row.image_url ?? null,   // ✅ 1 image si BD
    content: row.content ?? "",        // HTML si TEXTE
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    storySlug: row.story_slug || null,
  };
}

function serverError(res, err, where = "") {
  console.error(where, err);
  // ✅ DEBUG TEMP : renvoie détail réel
  return sendJson(res, 500, {
    error: "Erreur serveur",
    where,
    code: err?.code || null,
    detail: err?.message || String(err),
  });
}

export default async function handler(req, res) {
  applyCors(res);

  // OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;
  const S = segs(pathname);

  if (S[0] !== "api" || S[1] !== "episodes") {
    return sendJson(res, 404, { error: "Ressource non trouvée" });
  }

  // /api/episodes/:id
  const id = S.length === 3 ? decodeURIComponent(S[2]) : null;

  // ===================== GET =====================
  if (req.method === "GET") {
    try {
      if (!id) {
        // Optionnel : liste brute (si l’admin en a besoin)
        const rows = await query(
          `SELECT e.*, s.slug AS story_slug
             FROM episodes e
             JOIN stories s ON s.id = e.story_id
            ORDER BY e.story_id DESC, e.episode_number ASC, e.id ASC`
        );
        return sendJson(res, 200, rows.map(mapEpisodeRow));
      }

      const rows = await query(
        `SELECT e.*, s.slug AS story_slug
           FROM episodes e
           JOIN stories s ON s.id = e.story_id
          WHERE e.id = $1
          LIMIT 1`,
        [id]
      );

      if (!rows.length) return sendJson(res, 404, { error: "Épisode introuvable" });
      return sendJson(res, 200, mapEpisodeRow(rows[0]));
    } catch (err) {
      return serverError(res, err, "GET /api/episodes");
    }
  }

  // ===================== POST =====================
  if (req.method === "POST" && !id) {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (err) {
      return sendJson(res, 400, { error: "Corps invalide" });
    }

    const {
      storyId,
      title,
      slug = null,
      episodeNumber = 1,
      summary = "",
      kind = "TEXTE",     // "BD" | "TEXTE"
      imageUrl = null,    // si BD
      content = "",       // si TEXTE
    } = body || {};

    if (!storyId || !title) {
      return sendJson(res, 400, { error: "storyId et title sont requis." });
    }

    const K = String(kind || "TEXTE").trim().toUpperCase();
    const img = imageUrl ? String(imageUrl).trim() : null;
    const txt = content ? String(content) : "";

    if (K === "BD") {
      if (!img) return sendJson(res, 400, { error: "Pour un épisode BD, imageUrl est requis." });
    } else if (K === "TEXTE") {
      if (!txt.trim()) return sendJson(res, 400, { error: "Pour un épisode texte, content est requis." });
    } else {
      return sendJson(res, 400, { error: "kind invalide. Utilise 'BD' ou 'TEXTE'." });
    }

    try {
      const rows = await query(
        `INSERT INTO episodes (story_id, title, slug, episode_number, summary, kind, image_url, content)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [storyId, title, slug, episodeNumber, summary, K, img, txt]
      );
      return sendJson(res, 201, mapEpisodeRow(rows[0]));
    } catch (err) {
      if (err?.code === "23505") {
        return sendJson(res, 400, { error: "Slug épisode déjà utilisé." });
      }
      return serverError(res, err, "POST /api/episodes");
    }
  }

  // ===================== PUT =====================
  if (req.method === "PUT" && id) {
    if (!isNumericId(String(id))) return sendJson(res, 400, { error: "Id épisode invalide." });

    let body = {};
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { error: "Corps invalide" });
    }

    const {
      storyId,
      title,
      slug = null,
      episodeNumber = 1,
      summary = "",
      kind = "TEXTE",
      imageUrl = null,
      content = "",
    } = body || {};

    if (!storyId || !title) {
      return sendJson(res, 400, { error: "storyId et title sont requis." });
    }

    const K = String(kind || "TEXTE").trim().toUpperCase();
    const img = imageUrl ? String(imageUrl).trim() : null;
    const txt = content ? String(content) : "";

    if (K === "BD") {
      if (!img) return sendJson(res, 400, { error: "Pour un épisode BD, imageUrl est requis." });
    } else if (K === "TEXTE") {
      if (!txt.trim()) return sendJson(res, 400, { error: "Pour un épisode texte, content est requis." });
    } else {
      return sendJson(res, 400, { error: "kind invalide. Utilise 'BD' ou 'TEXTE'." });
    }

    try {
      const rows = await query(
        `UPDATE episodes
            SET story_id=$1, title=$2, slug=$3, episode_number=$4, summary=$5,
                kind=$6, image_url=$7, content=$8, updated_at=NOW()
          WHERE id=$9
          RETURNING *`,
        [storyId, title, slug, episodeNumber, summary, K, img, txt, id]
      );

      if (!rows.length) return sendJson(res, 404, { error: "Épisode introuvable" });
      return sendJson(res, 200, mapEpisodeRow(rows[0]));
    } catch (err) {
      if (err?.code === "23505") {
        return sendJson(res, 400, { error: "Slug épisode déjà utilisé." });
      }
      return serverError(res, err, "PUT /api/episodes/:id");
    }
  }

  // ===================== DELETE =====================
  if (req.method === "DELETE" && id) {
    if (!isNumericId(String(id))) return sendJson(res, 400, { error: "Id épisode invalide." });
    try {
      const rows = await query("DELETE FROM episodes WHERE id=$1 RETURNING id", [id]);
      if (!rows.length) return sendJson(res, 404, { error: "Épisode introuvable" });
      return sendJson(res, 200, { success: true });
    } catch (err) {
      return serverError(res, err, "DELETE /api/episodes/:id");
    }
  }

  return sendJson(res, 405, { error: "Méthode non autorisée" });
}
