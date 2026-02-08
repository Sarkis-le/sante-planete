// api/server.js
import http from "http";
import { URL } from "url";

import articlesHandler from "./articles.js";
import storiesHandler from "./stories.js";
import episodesHandler from "./episodes.js";
import { DEFAULT_HEADERS } from "./utils.js";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, DEFAULT_HEADERS);
    return res.end();
  }

  try {
    if (pathname.startsWith("/api/articles")) return articlesHandler(req, res);
    if (pathname.startsWith("/api/stories")) return storiesHandler(req, res);
    if (pathname.startsWith("/api/episodes")) return episodesHandler(req, res);

    res.writeHead(404, { ...DEFAULT_HEADERS, "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Ressource non trouvée" }));
  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.writeHead(500, { ...DEFAULT_HEADERS, "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Erreur serveur interne" }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ API Santé Planète en ligne sur http://localhost:${PORT}`);
});
