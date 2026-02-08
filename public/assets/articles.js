let ARTICLES = [];
let FILTER_TEXT = "";
let FILTER_CATEGORY = null;

async function loadArticlesPage(){
  SP.setActiveNav("articles");
  const container = document.getElementById("articlesGrid");
  try{
    const res = await fetch("/api/articles");
    if(!res.ok) throw new Error("API articles KO");
    const data = await res.json();
    ARTICLES = Array.isArray(data) ? data : [];
    renderArticles();
  }catch(e){
    container.innerHTML = '<div class="empty-state error-state">Erreur lors du chargement des articles.</div>';
  }
}

function matches(art){
  const text = (FILTER_TEXT || "").toLowerCase();
  const cat  = FILTER_CATEGORY;

  if(text){
    const hay = ((art.title||"") + " " + (art.summary || art.content || "")).toLowerCase();
    if(!hay.includes(text)) return false;
  }
  if(cat){
    const aCat = (art.category || "").toLowerCase();
    if(!aCat.includes(cat.toLowerCase())) return false;
  }
  return true;
}

function renderArticles(){
  const container = document.getElementById("articlesGrid");
  const list = (ARTICLES || []).filter(matches);

  if(!list.length){
    container.innerHTML = '<div class="empty-state">Aucun article ne correspond à votre recherche.</div>';
    return;
  }
  container.innerHTML = "";

  for(const art of list){
    const clean = SP.stripHtml(art.summary || art.content || "");
    const card = document.createElement("article");
    card.className = "card";

    if(art.imageUrl){
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = art.imageUrl;
      img.alt = art.title || "Illustration";
      img.loading = "lazy";
      card.appendChild(img);
    }else{
      const ph = document.createElement("div");
      ph.className = "thumb";
      card.appendChild(ph);
    }

    const meta = document.createElement("div");
    meta.className = "meta";
    const b = document.createElement("span"); b.className = "badge"; b.textContent = art.category || "Santé";
    const r = document.createElement("span");
    r.textContent = (SP.formatDate(art.createdAt) || "") + " • " + SP.estimateReadingTime(art.content || art.summary || "");
    meta.appendChild(b); meta.appendChild(r);

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = art.title || "Sans titre";

    const ex = document.createElement("div");
    ex.className = "excerpt";
    ex.textContent = clean.slice(0,180) + (clean.length>180 ? "…" : "");

    const a = document.createElement("a");
    a.href = "/article.html?slug=" + encodeURIComponent(art.slug || "");
    a.textContent = "Lire l’article";

    card.appendChild(meta);
    card.appendChild(t);
    card.appendChild(ex);
    card.appendChild(a);
    container.appendChild(card);
  }
}

function onSearch(v){ FILTER_TEXT = v || ""; renderArticles(); }
function onFilter(cat){ FILTER_CATEGORY = cat; renderArticles(); }
function onClear(){ FILTER_CATEGORY = null; renderArticles(); }

window.ArticlesPage = { loadArticlesPage, onSearch, onFilter, onClear };
