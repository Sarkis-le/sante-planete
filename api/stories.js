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

function getIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/stories\/?([^/]+)?$/);
  if (!match || !match[1]) return null;
  return match[1];
}

function mapStoryRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    summary: row.summary,
    coverUrl: row.cover_url || row.coverUrl || null,
    pages: row.pages || [],          // json/jsonb côté PG
    content: row.content || "",      // html éventuel
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export default async function handler(req, res) {
  applyCors(res);

  const url = req.url ? new URL(req.url, "http://localhost") : null;
  const pathname = url ? url.pathname : "";

  // IMPORTANT: Vercel doit router sur ce fichier. Ce guard est OK.
  if (!pathname.startsWith("/api/stories")) {
    sendJson(res, 404, { error: "Ressource non trouvée" });
    return;
  }

  const pathId  = getIdFromPath(pathname);
  const queryId = url ? url.searchParams.get("id") : null;

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  // GET (liste / détail)
  if (req.method === "GET") {
    const storyId = pathId || queryId;

    try {
      if (storyId != null) {
        const rows = await query("SELECT * FROM stories WHERE id = $1", [storyId]);
        if (!rows.length) return sendJson(res, 404, { error: "Histoire introuvable" });
        return sendJson(res, 200, mapStoryRow(rows[0]));
      }

      const rows = await query("SELECT * FROM stories ORDER BY created_at DESC, id DESC");
      return sendJson(res, 200, rows.map(mapStoryRow));
    } catch (err) {
      console.error("GET /api/stories error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // Body pour POST/PUT/DELETE
  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (err) {
    console.error(`${req.method} /api/stories body parse error`, err);
    return sendJson(res, 400, { error: "Corps de requête invalide" });
  }

  const bodyId = body && (body.id || body.storyId || null);
  const idForWrite = pathId || queryId || bodyId;

  // POST
  if (req.method === "POST") {
    const {
      title,
      slug,
      category = "",
      summary = "",
      coverUrl = "",
      pages = [],
      content = "",
    } = body || {};

    if (!title || !slug) {
      return sendJson(res, 400, { error: "Titre et slug sont requis." });
    }

    try {
      const rows = await query(
        `INSERT INTO stories (title, slug, category, summary, cover_url, pages, content)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [title, slug, category, summary, coverUrl, JSON.stringify(pages || []), content]
      );
      return sendJson(res, 201, mapStoryRow(rows[0]));
    } catch (err) {
      console.error("POST /api/stories error", err);
      if (err.code === "23505") return sendJson(res, 400, { error: "Ce slug est déjà utilisé." });
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // PUT/DELETE → besoin id
  if (idForWrite == null) {
    return sendJson(res, 400, { error: "Identifiant manquant (URL, ?id= ou body.id)." });
  }

  // PUT
  if (req.method === "PUT") {
    const {
      title,
      slug,
      category = "",
      summary = "",
      coverUrl = "",
      pages = [],
      content = "",
    } = body || {};

    if (!title || !slug) {
      return sendJson(res, 400, { error: "Titre et slug sont requis." });
    }

    try {
      const rows = await query(
        `UPDATE stories
         SET title=$1, slug=$2, category=$3, summary=$4, cover_url=$5, pages=$6, content=$7, updated_at=NOW()
         WHERE id=$8
         RETURNING *`,
        [title, slug, category, summary, coverUrl, JSON.stringify(pages || []), content, idForWrite]
      );
      if (!rows.length) return sendJson(res, 404, { error: "Histoire introuvable" });
      return sendJson(res, 200, mapStoryRow(rows[0]));
    } catch (err) {
      console.error("PUT /api/stories error", err);
      if (err.code === "23505") return sendJson(res, 400, { error: "Ce slug est déjà utilisé." });
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  // DELETE
  if (req.method === "DELETE") {
    try {
      const rows = await query("DELETE FROM stories WHERE id=$1 RETURNING id", [idForWrite]);
      if (!rows.length) return sendJson(res, 404, { error: "Histoire introuvable" });
      return sendJson(res, 200, { success: true });
    } catch (err) {
      console.error("DELETE /api/stories error", err);
      return sendJson(res, 500, { error: "Erreur serveur" });
    }
  }

  return sendJson(res, 405, { error: "Méthode non autorisée" });
}
