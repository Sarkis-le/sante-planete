// api/stories/[key]/episodes.js
import { query } from "../../db.js";
import { applyCors, sendJson, isNumericId } from "../../utils.js";

function mapEpisodeLite(row) {
  return {
    id: row.id,
    storyId: row.story_id,
    title: row.title,
    slug: row.slug,
    episodeNumber: row.episode_number,
    summary: row.summary,
    kind: row.kind ?? "TEXTE",
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") return sendJson(res, 204, null);

  const { key } = req.query;

  if (req.method !== "GET") return sendJson(res, 405, { error: "Méthode non autorisée" });

  try {
    const storyRows = isNumericId(String(key))
      ? await query("SELECT id, slug FROM stories WHERE id=$1 LIMIT 1", [key])
      : await query("SELECT id, slug FROM stories WHERE slug=$1 LIMIT 1", [key]);

    if (!storyRows.length) return sendJson(res, 404, { error: "Histoire introuvable" });

    const storyId = storyRows[0].id;

    const epsRows = await query(
      `SELECT id, story_id, title, slug, episode_number, summary, kind, image_url, created_at, updated_at
         FROM episodes
        WHERE story_id=$1
        ORDER BY episode_number ASC, created_at ASC`,
      [storyId]
    );

    const out = epsRows.map((r) => ({
      ...mapEpisodeLite(r),
      storySlug: storyRows[0].slug,
    }));

    return sendJson(res, 200, out);
  } catch (err) {
    console.error("GET /api/stories/:key/episodes error", err);
    return sendJson(res, 500, { error: "Erreur serveur" });
  }
}
