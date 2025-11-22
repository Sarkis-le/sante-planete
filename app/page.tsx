// app/page.tsx
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const articles = await prisma.article.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 12
  });

  return (
    <div className="sp-container sp-page">
      <section>
        <h1 className="sp-hero-title">
          Bienvenue sur <span>Santé Planète</span>
        </h1>
        <p className="sp-hero-subtitle">
          Des conseils santé et des informations générales venues du monde
          entier, pour vous aider à mieux comprendre votre bien-être au
          quotidien. Les contenus sont purement informatifs et ne remplacent
          jamais l&apos;avis d&apos;un médecin.
        </p>
        <div className="sp-disclaimer">
          <strong>Important :</strong> en cas de symptôme, de doute ou
          d&apos;urgence médicale, consultez immédiatement un professionnel de
          santé ou les services d&apos;urgence de votre pays.
        </div>
      </section>

      <section className="sp-article-list">
        {articles.length === 0 ? (
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Aucun article publié pour le moment. Connectez-vous à l&apos;espace
            admin pour créer vos premiers contenus.
          </p>
        ) : (
          articles.map((a) => (
            <article key={a.id} className="sp-article-card">
              <a
                href={`/articles/${a.slug}`}
                className="sp-article-card-title"
              >
                {a.title}
              </a>
              <div className="sp-article-meta">
                {a.category ? `Catégorie : ${a.category} · ` : ""}
                Publié le{" "}
                {a.createdAt.toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                })}
              </div>
              {a.excerpt && (
                <p className="sp-article-excerpt">{a.excerpt}</p>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
