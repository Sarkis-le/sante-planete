// app/admin/page.tsx
import { prisma } from "@/lib/prisma";

export default async function AdminHome() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="sp-container sp-page">
      <div className="sp-admin-header">
        <div>
          <h1 className="sp-admin-title">Administration des articles</h1>
          <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.2rem" }}>
            Zone privée de Santé Planète. Ne partagez pas l&apos;accès admin.
          </p>
        </div>
        <a href="/admin/new" className="sp-admin-btn">
          ➕ Nouvel article
        </a>
      </div>

      {articles.length === 0 ? (
        <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
          Aucun article enregistré pour le moment.
        </p>
      ) : (
        <div className="sp-admin-list">
          {articles.map((a) => (
            <div key={a.id} className="sp-admin-item">
              <div>
                <div>
                  {a.title}{" "}
                  {!a.published && (
                    <span className="sp-badge-draft">(brouillon)</span>
                  )}
                </div>
                <div className="sp-admin-slug">/articles/{a.slug}</div>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                {a.createdAt.toLocaleDateString("fr-FR")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
