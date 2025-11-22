// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Santé Planète – Conseils santé & infos du monde",
  description:
    "Santé Planète propose des contenus d'information générale sur la santé et le bien-être dans le monde. Ces contenus ne remplacent pas un avis médical professionnel."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="sp-body">
        <header className="sp-header">
          <div className="sp-header-inner">
            <a href="/" className="sp-logo">
              <div className="sp-logo-badge">SP</div>
              <div className="sp-logo-text">
                <span className="sp-logo-name">Santé Planète</span>
                <span className="sp-logo-sub">
                  Conseils santé & infos du monde
                </span>
              </div>
            </a>
            <nav className="sp-nav">
              <a href="/">Accueil</a>
              <a href="/admin">Admin</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="sp-footer">
          Les informations publiées sur Santé Planète sont fournies à titre
          purement informatif et ne constituent en aucun cas un avis médical,
          un diagnostic ni une prescription. En cas de problème de santé,
          consultez un professionnel de santé qualifié.
        </footer>
      </body>
    </html>
  );
}
