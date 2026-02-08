// api/episodes.js
import { query } from "./db.js";

export const DEFAULT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

function applyCors(res) {
  Object.entries(DEFAULT_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

function sendJson(res, status, payload) {
  applyCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function segs(pathname) {
  return pathname.split("/").filter(Boolean);
}

function mapEpisodeRow(row) {
  return {
    id: row.id,
    storyId: row.story_id,
    title: row.title,
    slug: row.slug,
    episodeNumber: row.episode_number,
    summary: row.summary,
    content: row.content,
    pages: row.pages || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    storySlug: row.story_slug || null,
  };
}

export default async function handler(req, res) {
  applyCors(res);

  const url = req.url ? new URL(req.url, "http://localhost") : null;
  const pathname = url ? url.pathname : "";
  const S = segs(pathname);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (S[0] !== "api" || S[1] !== "episodes") {
    return sendJson(res, 404, { error: "Ressource non trouvée" });
  }

  // GET /api/episodes/:id
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

  // POST /api/episodes  (création épisode)
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
      content = "",
      pages = [],
    } = body || {};

    if (!storyId || !title) {
      return sendJson(res, 400, { error: "storyId et title sont requis." });
    }

    try {
      const rows = await query(
        `INSERT INTO episodes (story_id, title, slug, episode_number, summary, content, pages)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [storyId, title, slug, episodeNumber, summary, content, JSON.stringify(pages || [])]
      );
      return sendJson(res, 201, mapEpisodeRow(rows[0]));
    } catch (err) {
      console.error("POST /api/episodes error", err);
      if (err.code === "23505") return sendJson(res, 400, { error: "Slug épisode déjà utilisé." });
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  return sendJson(res, 405, { error: "Méthode non autorisée" });
}
