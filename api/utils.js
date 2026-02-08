// api/utils.js
export const DEFAULT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

export function applyCors(res) {
  for (const [k, v] of Object.entries(DEFAULT_HEADERS)) res.setHeader(k, v);
}

export function sendJson(res, status, payload) {
  applyCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export async function readJsonBody(req) {
  // si déjà parsé
  if (req.body !== undefined) {
    if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};
    if (typeof req.body === "object") return req.body ?? {};
  }

  // lecture brute
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export function segs(pathname) {
  return pathname.split("/").filter(Boolean);
}

export function isNumericId(x) {
  return typeof x === "string" && /^[0-9]+$/.test(x);
}
