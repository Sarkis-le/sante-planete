// /assets/stories.js
// ✅ Compatible avec le design "Facebook" de stories.html

let STORIES = [];
let S_TEXT = "";
let S_CAT = ""; // ✅ "" = Toutes (par défaut)

// -------- utils ----------
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

function safeText(v){
  return String(v ?? "").replace(/[<>&]/g, s => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[s]));
}

function normalizeKind(v){
  const raw = String(v ?? "").trim();
  const low = raw.toLowerCase();
  if (low === "bd") return "BD";
  if (low === "histoire") return "Histoire";
  if (low === "episode" || low === "épisode") return "Épisode";
  if (low === "texte") return "Histoire";
  return raw || "Histoire";
}

function pickCover(story){
  return story.coverUrl || story.cover_url || story.imageUrl || story.image_url || "";
}

function pickSummary(story){
  return story.summary || story.description || story.excerpt || "";
}

function pickKind(story){
  return normalizeKind(story.category || story.kind || "");
}

function initialsFromTitle(title="H"){
  const t = String(title || "").trim();
  return (t[0] || "H").toUpperCase();
}

function linkToStory(story){
  if (story.slug) return `/story.html?slug=${encodeURIComponent(story.slug)}`;
  if (story.id != null) return `/story.html?id=${encodeURIComponent(story.id)}`;
  return "/stories.html";
}

// -------- chips active ----------
function setActiveChip(kind){
  const k = normalizeKind(kind || "");
  $all(".filter-chip").forEach(btn => {
    const btnKind = normalizeKind(btn.getAttribute("data-kind") || "");
    const active = (k === "" && btnKind === "") || (k !== "" && btnKind === k);
    btn.classList.toggle("is-active", !!active);
  });
}

// -------- filtering ----------
function storyMatches(st){
  const text = (S_TEXT || "").trim().toLowerCase();
  const cat = (S_CAT || "").trim(); // "" => toutes

  if (text){
    const hay = ((st.title||"") + " " + (pickSummary(st)||"")).toLowerCase();
    if (!hay.includes(text)) return false;
  }

  if (cat){
    // filtre strict sur catégorie normalisée
    return normalizeKind(pickKind(st)) === normalizeKind(cat);
  }

  return true;
}

// -------- render (Facebook style) ----------
function storyCardHTML(st){
  const title = safeText(st.title || "Sans titre");
  const kind  = pickKind(st);
  const cover = pickCover(st);
  const link  = linkToStory(st);
  const summary = safeText((pickSummary(st) || "Découvre cette histoire sur Santé Planète.").slice(0, 220));

  return `
    <article class="story-post">
      <header class="story-post__head">
        <div class="story-post__avatar" aria-hidden="true">${initialsFromTitle(title)}</div>
        <div class="story-post__meta">
          <h3 class="story-post__title" title="${title}">${title}</h3>
          <div class="story-post__sub">
            <span class="story-pill">${safeText(kind)}</span>
            <span class="story-pill">Santé Planète</span>
          </div>
        </div>
      </header>

      <a class="story-media" href="${link}" aria-label="Ouvrir ${title}">
        ${cover ? `<img src="${cover}" alt="${title}" loading="lazy">`
                : `<div class="story-media__fallback">📚</div>`}
        <div class="story-media__overlay"></div>
        <div class="story-media__title">${title}</div>
      </a>

      <div class="story-post__body">
        <p class="story-post__summary">${summary}</p>
      </div>

      <div class="story-actions">
        <a class="story-btn" href="${link}">📖 Lire</a>
        <button class="story-btn" type="button" data-share="${safeText(st.slug || st.id || "")}">🔗 Partager</button>
      </div>
    </article>
  `;
}

function renderStories(){
  const container = $("#storiesGrid");
  if (!container) return;

  const list = (STORIES || []).filter(storyMatches);

  if(!list.length){
    container.innerHTML = '<div class="empty-state">Aucune histoire ne correspond à votre recherche.</div>';
    return;
  }

  container.innerHTML = list.map(storyCardHTML).join("");

  // bind share buttons
  $all('button[data-share]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const idOrSlug = btn.getAttribute("data-share") || "";
      const url = String(idOrSlug).includes("-")
        ? `${location.origin}/story.html?slug=${encodeURIComponent(idOrSlug)}`
        : `${location.origin}/story.html?id=${encodeURIComponent(idOrSlug)}`;

      try{
        if (navigator.share) {
          await navigator.share({ title: "Santé Planète", url });
        } else {
          await navigator.clipboard.writeText(url);
          alert("Lien copié !");
        }
      } catch(e){
        console.error(e);
        alert("Impossible de partager pour le moment.");
      }
    });
  });
}

// -------- load ----------
async function loadStoriesPage(){
  try { SP.setActiveNav("stories"); } catch(_) {}

  // ✅ état initial : toutes + chip toutes
  S_CAT = "";
  S_TEXT = "";
  setActiveChip("");

  const container = $("#storiesGrid");
  if (container) container.innerHTML = '<div class="empty-state">Chargement…</div>';

  try{
    const res = await fetch("/api/stories");
    if(!res.ok) throw new Error("API stories KO");
    const data = await res.json();

    STORIES = (Array.isArray(data) ? data : []).map(s => ({
      ...s,
      createdAt: s.createdAt ?? s.created_at ?? null,
      coverUrl:  s.coverUrl  ?? s.cover_url  ?? null,
      episodesCount: s.episodesCount ?? s.episodes_count ?? null
    }));

    renderStories();
  }catch(e){
    console.error(e);
    if (container) container.innerHTML = '<div class="empty-state error-state">Erreur lors du chargement des histoires.</div>';
  }
}

// -------- handlers exposed (called by HTML) ----------
function onStorySearch(v){
  S_TEXT = v || "";
  renderStories();
}
function onStoryFilter(cat){
  S_CAT = cat || "";          // ✅ "" = toutes
  setActiveChip(S_CAT);       // ✅ met à jour visuellement
  renderStories();
}
function onStoryClear(){
  S_TEXT = "";
  S_CAT = "";
  const input = $("#storySearch");
  if (input) input.value = "";
  setActiveChip("");
  renderStories();
}

window.StoriesPage = { loadStoriesPage, onStorySearch, onStoryFilter, onStoryClear };
