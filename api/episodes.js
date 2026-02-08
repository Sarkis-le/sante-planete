// api/episodes.js
import { URL } from "url";
import { query } from "./db.js";
import { applyCors, sendJson, readJsonBody, segs, isNumericId } from "./utils.js";

function mapEpisodeRow(row) {
  if (!row) return null;

  // On renvoie camelCase + snake_case pour éviter de casser le front existant
  return {
    id: row.id,

    storyId: row.story_id,
    story_id: row.story_id,

    title: row.title,
    slug: row.slug,

    episodeNumber: row.episode_number,
    episode_number: row.episode_number,

    summary: row.summary,

    kind: row.kind ?? "TEXTE",

    imageUrl: row.image_url ?? null,
    image_url: row.image_url ?? null,

    content: row.content ?? "",
    content_html: row.content ?? "",

    createdAt: row.created_at ?? null,
    created_at: row.created_at ?? null,

    updatedAt: row.updated_at ?? null,
    updated_at: row.updated_at ?? null,

    storySlug: row.story_slug ?? null,
    story_slug: row.story_slug ?? null,
  };
}

export default async function handler(req, res) {
  applyCors(res);

  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;
  const S = segs(pathname);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (S[0] !== "api" || S[1] !== "episodes") {
    return sendJson(res, 404, { error: "Ressource non trouvée" });
  }

  // =========================
  // ✅ GET /api/episodes?storyId=123  OU  ?storySlug=xxx  OU liste brute
  // =========================
  if (req.method === "GET" && S.length === 2) {
    const storyId = url.searchParams.get("storyId");
    const storySlug = url.searchParams.get("storySlug");

    try {
      // liste par storyId
      if (storyId) {
        if (!isNumericId(storyId)) {
          return sendJson(res, 400, { error: "storyId invalide" });
        }

        const rows = await query(
          `SELECT e.*, s.slug AS story_slug
             FROM episodes e
             JOIN stories s ON s.id = e.story_id
            WHERE e.story_id = $1
            ORDER BY e.episode_number ASC, e.created_at ASC`,
          [storyId]
        );

        return sendJson(res, 200, rows.map(mapEpisodeRow));
      }

      // liste par storySlug
      if (storySlug) {
        const srows = await query("SELECT id FROM stories WHERE slug=$1 LIMIT 1", [storySlug]);
        if (!srows.length) return sendJson(res, 404, { error: "Histoire introuvable" });

        const rows = await query(
          `SELECT e.*, s.slug AS story_slug
             FROM episodes e
             JOIN stories s ON s.id = e.story_id
            WHERE e.story_id = $1
            ORDER BY e.episode_number ASC, e.created_at ASC`,
          [srows[0].id]
        );

        return sendJson(res, 200, rows.map(mapEpisodeRow));
      }

      // (optionnel) liste globale
      const rows = await query(
        `SELECT e.*, s.slug AS story_slug
           FROM episodes e
           JOIN stories s ON s.id = e.story_id
          ORDER BY e.created_at DESC
          LIMIT 200`
      );
      return sendJson(res, 200, rows.map(mapEpisodeRow));
    } catch (err) {
      console.error("GET /api/episodes (list) error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // =========================
  // ✅ GET /api/episodes/:id
  // =========================
  if (req.method === "GET" && S.length === 3) {
    const id = decodeURIComponent(S[2]);
    try {
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
      console.error("GET /api/episodes/:id error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // =========================
  // ✅ POST /api/episodes
  // =========================
  if (req.method === "POST" && S.length === 2) {
    let body = {};
    try { body = await readJsonBody(req); }
    catch { return sendJson(res, 400, { error: "Corps invalide" }); }

    const {
      storyId,
      title,
      slug = null,
      episodeNumber = 1,
      summary = "",
      kind = "TEXTE",      // "BD" | "TEXTE"
      imageUrl = "",       // 1 image si BD
      content = "",        // texte HTML si TEXTE
    } = body || {};

    if (!storyId || !title) {
      return sendJson(res, 400, { error: "storyId et title sont requis." });
    }

    const K = (kind || "TEXTE").toString().trim().toUpperCase();

    if (K === "BD") {
      if (!imageUrl) return sendJson(res, 400, { error: "Pour un épisode BD, imageUrl est requis." });
    } else if (K === "TEXTE") {
      if (!content || !content.toString().trim()) {
        return sendJson(res, 400, { error: "Pour un épisode texte, content est requis." });
      }
    } else {
      return sendJson(res, 400, { error: "kind invalide. Utilise 'BD' ou 'TEXTE'." });
    }

    try {
      const rows = await query(
        `INSERT INTO episodes (story_id, title, slug, episode_number, summary, kind, image_url, content)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          storyId,
          title,
          slug,
          episodeNumber,
          summary,
          K,
          imageUrl || null,
          content || "",
        ]
      );
      return sendJson(res, 201, mapEpisodeRow(rows[0]));
    } catch (err) {
      console.error("POST /api/episodes error", err);
      if (err.code === "23505") return sendJson(res, 400, { error: "Slug épisode déjà utilisé." });
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // =========================
  // ✅ PUT /api/episodes/:id
  // =========================
  if (req.method === "PUT" && S.length === 3) {
    const id = decodeURIComponent(S[2]);
    if (!isNumericId(id)) return sendJson(res, 400, { error: "Id épisode invalide." });

    let body = {};
    try { body = await readJsonBody(req); }
    catch { return sendJson(res, 400, { error: "Corps invalide" }); }

    const {
      storyId,
      title,
      slug = null,
      episodeNumber = 1,
      summary = "",
      kind = "TEXTE",
      imageUrl = "",
      content = "",
    } = body || {};

    if (!storyId || !title) {
      return sendJson(res, 400, { error: "storyId et title sont requis." });
    }

    const K = (kind || "TEXTE").toString().trim().toUpperCase();

    if (K === "BD") {
      if (!imageUrl) return sendJson(res, 400, { error: "Pour un épisode BD, imageUrl est requis." });
    } else if (K === "TEXTE") {
      if (!content || !content.toString().trim()) {
        return sendJson(res, 400, { error: "Pour un épisode texte, content est requis." });
      }
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
        [
          storyId,
          title,
          slug,
          episodeNumber,
          summary,
          K,
          imageUrl || null,
          content || "",
          id,
        ]
      );

      if (!rows.length) return sendJson(res, 404, { error: "Épisode introuvable" });
      return sendJson(res, 200, mapEpisodeRow(rows[0]));
    } catch (err) {
      console.error("PUT /api/episodes/:id error", err);
      if (err.code === "23505") return sendJson(res, 400, { error: "Slug épisode déjà utilisé." });
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // =========================
  // ✅ DELETE /api/episodes/:id
  // =========================
  if (req.method === "DELETE" && S.length === 3) {
    const id = decodeURIComponent(S[2]);
    if (!isNumericId(id)) return sendJson(res, 400, { error: "Id épisode invalide." });

    try {
      const rows = await query("DELETE FROM episodes WHERE id=$1 RETURNING id", [id]);
      if (!rows.length) return sendJson(res, 404, { error: "Épisode introuvable" });
      return sendJson(res, 200, { success: true });
    } catch (err) {
      console.error("DELETE /api/episodes/:id error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  return sendJson(res, 405, { error: "Méthode non autorisée" });
}
