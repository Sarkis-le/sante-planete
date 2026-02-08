import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs"; // important sur Vercel

const sql = neon(process.env.DATABASE_URL);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const rows = await sql`
        SELECT id, title, slug, category, summary, cover_url, pages, content, created_at, updated_at
        FROM stories
        WHERE id = ${Number(id)}
        LIMIT 1
      `;
      return json(rows[0] ?? null);
    }

    const rows = await sql`
      SELECT id, title, slug, category, summary, cover_url, pages, content, created_at, updated_at
      FROM stories
      ORDER BY created_at DESC
    `;
    return json(rows);
  } catch (e) {
    console.error(e);
    return json({ error: "API stories GET failed" }, 500);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const title = (body.title || "").trim();
    const slug = (body.slug || "").trim();
    const category = (body.category || "Histoire").trim();
    const summary = body.summary ?? null;
    const coverUrl = body.coverUrl ?? null;
    const pages = Array.isArray(body.pages) ? body.pages : [];
    const content = body.content ?? null;

    if (!title || !slug) return json({ error: "title et slug requis" }, 400);

    const rows = await sql`
      INSERT INTO stories (title, slug, category, summary, cover_url, pages, content)
      VALUES (${title}, ${slug}, ${category}, ${summary}, ${coverUrl}, ${JSON.stringify(pages)}::jsonb, ${content})
      RETURNING id
    `;
    return json({ ok: true, id: rows[0]?.id }, 201);
  } catch (e) {
    console.error(e);
    // slug unique -> conflit
    return json({ error: "API stories POST failed (slug déjà utilisé ?)" }, 500);
  }
}

export async function PUT(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return json({ error: "id requis" }, 400);

    const body = await req.json();

    const title = (body.title || "").trim();
    const slug = (body.slug || "").trim();
    const category = (body.category || "Histoire").trim();
    const summary = body.summary ?? null;
    const coverUrl = body.coverUrl ?? null;
    const pages = Array.isArray(body.pages) ? body.pages : [];
    const content = body.content ?? null;

    if (!title || !slug) return json({ error: "title et slug requis" }, 400);

    await sql`
      UPDATE stories
      SET title=${title},
          slug=${slug},
          category=${category},
          summary=${summary},
          cover_url=${coverUrl},
          pages=${JSON.stringify(pages)}::jsonb,
          content=${content},
          updated_at=NOW()
      WHERE id=${id}
    `;

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "API stories PUT failed" }, 500);
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return json({ error: "id requis" }, 400);

    await sql`DELETE FROM stories WHERE id=${id}`;
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "API stories DELETE failed" }, 500);
  }
}
