// app/admin/new/page.tsx
"use client";

import { useState } from "react";

export default function NewArticlePage() {
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"login" | "form">("login");
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "",
    published: false
  });
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = () => {
    if (!password) {
      setMessage("Veuillez saisir le mot de passe admin.");
      return;
    }
    setMessage(null);
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Envoi en cours...");

    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, password })
    });

    if (res.ok) {
      setMessage("Article créé avec succès ✅");
      setForm({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        category: "",
        published: false
      });
    } else if (res.status === 401) {
      setMessage("Mot de passe incorrect ❌");
      setStep("login");
    } else {
      setMessage("Erreur lors de la création de l'article ❌");
    }
  };

  if (step === "login") {
    return (
      <div className="sp-container sp-page">
        <div className="sp-card" style={{ maxWidth: 480, margin: "0 auto" }}>
          <h1 className="sp-admin-title" style={{ fontSize: "1.4rem" }}>
            Connexion admin
          </h1>
          <p
            style={{
              fontSize: "0.8rem",
              color: "#9ca3af",
              marginTop: "0.4rem",
              marginBottom: "0.9rem"
            }}
          >
            Entrez le mot de passe administrateur de Santé Planète pour
            accéder au formulaire de création d&apos;article.
          </p>
          <div className="sp-form">
            <div>
              <label className="sp-label">Mot de passe admin</label>
              <input
                type="password"
                className="sp-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="button" className="sp-button" onClick={handleLogin}>
              Continuer
            </button>
            {message && (
              <p className="sp-message" style={{ color: "#fca5a5" }}>
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-container sp-page">
      <div className="sp-card">
        <h1 className="sp-admin-title" style={{ fontSize: "1.4rem" }}>
          Nouvel article – Santé Planète
        </h1>
        <p
          style={{
            fontSize: "0.8rem",
            color: "#9ca3af",
            marginTop: "0.3rem",
            marginBottom: "1rem"
          }}
        >
          Rédigez un article informatif, clair et neutre. N&apos;oubliez pas
          que les contenus ne doivent pas se substituer à un avis médical
          professionnel.
        </p>

        <form className="sp-form" onSubmit={handleSubmit}>
          <div>
            <label className="sp-label">Titre</label>
            <input
              className="sp-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Ex. : 5 gestes simples pour protéger votre cœur"
            />
          </div>

          <div>
            <label className="sp-label">Slug (URL)</label>
            <input
              className="sp-input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
              placeholder="ex : proteger-votre-coeur"
            />
          </div>

          <div>
            <label className="sp-label">Résumé (facultatif)</label>
            <input
              className="sp-input"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Petit résumé qui apparaîtra sur la page d'accueil"
            />
          </div>

          <div>
            <label className="sp-label">Catégorie (facultatif)</label>
            <input
              className="sp-input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Ex. : santé, nutrition, sommeil, activité physique..."
            />
          </div>

          <div>
            <label className="sp-label">Contenu de l&apos;article</label>
            <textarea
              className="sp-textarea"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
              placeholder={
                "Rédigez ici le texte de votre article.\n\nVous pouvez sauter des lignes pour séparer les paragraphes."
              }
            />
          </div>

          <label className="sp-checkbox-row">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) =>
                setForm({ ...form, published: e.target.checked })
              }
            />
            Publier immédiatement sur Santé Planète
          </label>

          <button type="submit" className="sp-button">
            Enregistrer l&apos;article
          </button>

          {message && (
            <p className="sp-message" aria-live="polite">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
