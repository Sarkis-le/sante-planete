// api/server.js
import http from "http";
import articlesHandler, { DEFAULT_HEADERS as H } from "./articles.js";
import storiesHandler from "./stories.js";
import episodesHandler from "./episodes.js";

const server = http.createServer((req, res) => {
  const url = req.url ? new URL(req.url, "http://localhost") : null;
  const pathname = url ? url.pathname : "";

  // --- API routing ---
  if (pathname.startsWith("/api/articles")) return articlesHandler(req, res);
  if (pathname.startsWith("/api/stories"))  return storiesHandler(req, res);
  if (pathname.startsWith("/api/episodes")) return episodesHandler(req, res);

  // 404
  res.writeHead(404, { ...H, "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Ressource non trouvée" }));
});

server.listen(3000, () => {
  console.log("API Santé Planète en ligne sur le port 3000");
});
