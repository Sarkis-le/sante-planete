// app/articles/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface Props {
  params: { slug: string };
}

export default async function ArticlePage({ params }: Props) {
  const article = await prisma.article.findUnique({
    where: { slug: params.slug }
  });

  if (!article || !article.published) {
    notFound();
  }

  const lines = article.content.split("\n");

  return (
    <div className="sp-container sp-page">
      <article>
        <h1 className="sp-article-page-title">{article.title}</h1>
        <div className="sp-article-page-meta">
          {article.category && `Catégorie : ${article.category} · `}
          Publié le{" "}
          {article.createdAt.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          })}
        </div>
        <div className="sp-article-content">
          {lines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
