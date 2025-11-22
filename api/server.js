// api/server.js
import http from "http";
import handler, { DEFAULT_HEADERS } from "./articles.js";

const server = http.createServer((req, res) => {
  const url = req.url ? new URL(req.url, "http://localhost") : null;
  const pathname = url ? url.pathname : "";

  if (pathname === "/api/articles") {
    // On délègue toutes les méthodes (GET, POST, OPTIONS) au handler
    handler(req, res);
    return;
  }

  // 404 pour toute autre route
  res.writeHead(404, {
    ...DEFAULT_HEADERS,
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify({ error: "Ressource non trouvée" }));
});

server.listen(3000, () => {
  console.log("API Santé Planète en ligne sur le port 3000");
});
