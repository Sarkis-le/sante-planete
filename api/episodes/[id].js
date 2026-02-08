// api/episodes/[id].js
import { query } from "../db.js";
import { applyCors, sendJson, isNumericId } from "../utils.js";

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") return sendJson(res, 204, null);

  const { id } = req.query;

  if (req.method !== "GET") return sendJson(res, 405, { error: "Méthode non autorisée" });
  if (!isNumericId(String(id))) return sendJson(res, 400, { error: "ID invalide" });

  try {
    const rows = await query(
      `SELECT e.*,
              s.slug AS story_slug
         FROM episodes e
         JOIN stories s ON s.id = e.story_id
        WHERE e.id=$1
        LIMIT 1`,
      [id]
    );

    if (!rows.length) return sendJson(res, 404, { error: "Épisode introuvable" });

    const r = rows[0];
    return sendJson(res, 200, {
      id: r.id,
      storyId: r.story_id,
      storySlug: r.story_slug,
      title: r.title,
      slug: r.slug,
      episodeNumber: r.episode_number,
      summary: r.summary,
      kind: r.kind ?? "TEXTE",
      imageUrl: r.image_url ?? null,
      content: r.content_html ?? r.content ?? "",
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    });
  } catch (err) {
    console.error("GET /api/episodes/:id error", err);
    return sendJson(res, 500, { error: "Erreur serveur" });
  }
}
