// api/stories.js
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
  if (req.body !== undefined) {
    if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};
    if (typeof req.body === "object") return req.body;
  }
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
  return pathname.split("/").filter(Boolean); // ["api","stories",...]
}

function isNumericId(x) {
  return typeof x === "string" && /^[0-9]+$/.test(x);
}

function mapStoryRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    summary: row.summary,
    coverUrl: row.cover_url || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    // legacy fields (ok de les garder)
    pages: row.pages || [],
    content: row.content || "",
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

      const out = rows.map(r => ({
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
    const key = decodeURIComponent(S[2]);
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
  // GET /api/stories/:slugOrId/episodes (liste épisodes)
  // ---------------------------
  if (req.method === "GET" && S.length === 4 && S[3] === "episodes") {
    const key = decodeURIComponent(S[2]);

    try {
      const storyRows = isNumericId(key)
        ? await query("SELECT id, slug FROM stories WHERE id=$1 LIMIT 1", [key])
        : await query("SELECT id, slug FROM stories WHERE slug=$1 LIMIT 1", [key]);

      if (!storyRows.length) return sendJson(res, 404, { error: "Histoire introuvable" });

      const storyId = storyRows[0].id;

      const eps = await query(
        `SELECT id, story_id, title, slug, episode_number, summary, created_at
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
  // POST /api/stories (création)
  // ---------------------------
  if (req.method === "POST" && S.length === 2) {
    let body = {};
    try { body = await readJsonBody(req); }
    catch { return sendJson(res, 400, { error: "Corps de requête invalide" }); }

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

  return sendJson(res, 405, { error: "Méthode non autorisée / route non gérée" });
}
