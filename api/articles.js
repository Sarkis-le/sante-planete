// api/articles.js
import { query } from "./db.js";

export const DEFAULT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

function applyCors(res) {
  Object.entries(DEFAULT_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

function sendJson(res, status, payload) {
  applyCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  applyCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
}

// lecture manuelle du body JSON si besoin (selon Vercel / Node)
async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        const parsed = JSON.parse(data);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  const { method, url } = req;
  const fullUrl = new URL(url, "http://localhost"); // base fictive
  const searchParams = fullUrl.searchParams;

  if (method === "OPTIONS") {
    applyCors(res);
    res.statusCode = 200;
    return res.end();
  }

  try {
    // ----------- GET : liste ou un article -----------
    if (method === "GET") {
      const id = searchParams.get("id");
      const slug = searchParams.get("slug");

      if (id) {
        const result = await query(
          "SELECT * FROM articles WHERE id = $1 ORDER BY created_at DESC;",
          [id]
        );
        if (!result.rows.length) {
          return sendJson(res, 404, { error: "Article introuvable" });
        }
        return sendJson(res, 200, result.rows[0]);
      }

      if (slug) {
        const result = await query(
          "SELECT * FROM articles WHERE slug = $1 LIMIT 1;",
          [slug]
        );
        if (!result.rows.length) {
          return sendJson(res, 404, { error: "Article introuvable" });
        }
        return sendJson(res, 200, result.rows[0]);
      }

      const result = await query(
        "SELECT * FROM articles ORDER BY created_at DESC;"
      );
      return sendJson(res, 200, result.rows);
    }

    // On lit le body JSON pour POST / PUT / DELETE
    const body = await readJsonBody(req);

    // ----------- POST : création -----------
    if (method === "POST") {
      const {
        title,
        slug,
        category,
        summary,
        content,
        imageUrl, // envoyé par le front
      } = body;

      if (!title || !slug) {
        return sendJson(res, 400, {
          error: "Le titre et le slug sont obligatoires.",
        });
      }

      const result = await query(
        `
        INSERT INTO articles (title, slug, category, summary, content, image_url, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *;
        `,
        [
          title,
          slug,
          category || null,
          summary || "",
          content || "",
          imageUrl || null,
        ]
      );

      return sendJson(res, 201, result.rows[0]);
    }

    // ----------- PUT : édition -----------
    if (method === "PUT") {
      // id peut venir du body ou de la query string
      const idFromBody = body.id;
      const idFromQuery = searchParams.get("id");
      const id = idFromBody || idFromQuery;

      if (!id) {
        return sendJson(res, 400, {
          error: "ID manquant pour la mise à jour de l’article.",
        });
      }

      const {
        title,
        slug,
        category,
        summary,
        content,
        imageUrl, // toujours mappé sur image_url en BDD
      } = body;

      const result = await query(
        `
        UPDATE articles
        SET
          title = COALESCE($1, title),
          slug = COALESCE($2, slug),
          category = COALESCE($3, category),
          summary = COALESCE($4, summary),
          content = COALESCE($5, content),
          image_url = COALESCE($6, image_url),
          updated_at = NOW()
        WHERE id = $7
        RETURNING *;
        `,
        [
          title ?? null,
          slug ?? null,
          category ?? null,
          summary ?? null,
          content ?? null,
          imageUrl ?? null,
          id,
        ]
      );

      if (!result.rows.length) {
        return sendJson(res, 404, { error: "Article introuvable." });
      }

      return sendJson(res, 200, result.rows[0]);
    }

    // ----------- DELETE : suppression -----------
    if (method === "DELETE") {
      const idFromBody = body.id;
      const idFromQuery = searchParams.get("id");
      const id = idFromBody || idFromQuery;

      if (!id) {
        return sendJson(res, 400, {
          error: "ID manquant pour la suppression de l’article.",
        });
      }

      const result = await query(
        "DELETE FROM articles WHERE id = $1 RETURNING id;",
        [id]
      );

      if (!result.rows.length) {
        return sendJson(res, 404, { error: "Article introuvable ou déjà supprimé." });
      }

      return sendJson(res, 200, { success: true, id: result.rows[0].id });
    }

    // ----------- Méthode non gérée -----------
    return sendJson(res, 405, { error: "Méthode non autorisée." });
  } catch (err) {
    console.error("Erreur API /api/articles:", err);
    return sendJson(res, 500, {
      error: "Erreur interne du serveur",
      details: err.message,
    });
  }
}
