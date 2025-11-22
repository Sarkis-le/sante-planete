// app/api/admin/articles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    title,
    slug,
    excerpt,
    content,
    category,
    published,
    password
  } = body ?? {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!title || !slug || !content) {
    return NextResponse.json(
      { error: "Champs obligatoires manquants" },
      { status: 400 }
    );
  }

  try {
    await prisma.article.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        category,
        published: !!published
      }
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erreur base de données" },
      { status: 500 }
    );
  }
}
