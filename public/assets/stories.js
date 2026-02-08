let STORIES = [];
let S_TEXT = "";
let S_CAT = null;

async function loadStoriesPage(){
  SP.setActiveNav("stories");
  const container = document.getElementById("storiesGrid");

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
    container.innerHTML = '<div class="empty-state error-state">Erreur lors du chargement des histoires.</div>';
  }
}

function storyMatches(st){
  const text = (S_TEXT || "").toLowerCase();
  const cat = S_CAT;

  if(text){
    const hay = ((st.title||"") + " " + (st.summary||"")).toLowerCase();
    if(!hay.includes(text)) return false;
  }
  if(cat){
    const sc = (st.category||"").toLowerCase();
    if(!sc.includes(cat.toLowerCase())) return false;
  }
  return true;
}

function renderStories(){
  const container = document.getElementById("storiesGrid");
  const list = (STORIES || []).filter(storyMatches);

  if(!list.length){
    container.innerHTML = '<div class="empty-state">Aucune histoire ne correspond à votre recherche.</div>';
    return;
  }
  container.innerHTML = "";

  for(const st of list){
    const card = document.createElement("article");
    card.className = "card";

    if(st.coverUrl){
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = st.coverUrl;
      img.alt = st.title || "Couverture";
      img.loading = "lazy";
      card.appendChild(img);
    }else{
      const ph = document.createElement("div");
      ph.className = "thumb";
      card.appendChild(ph);
    }

    const meta = document.createElement("div");
    meta.className = "meta";
    const b = document.createElement("span"); b.className="badge"; b.textContent = st.category || "Histoire";
    const r = document.createElement("span");
    const date = SP.formatDate(st.createdAt);
    const count = (st.episodesCount != null) ? ` • ${st.episodesCount} épisode(s)` : "";
    r.textContent = (date || "") + count;
    meta.appendChild(b); meta.appendChild(r);

    const t = document.createElement("div");
    t.className = "title";
    t.textContent = st.title || "Sans titre";

    const ex = document.createElement("div");
    ex.className = "excerpt";
    ex.textContent = (st.summary || "Cliquez pour voir les épisodes.").slice(0,190);

    const a = document.createElement("a");
    a.href = "/story.html?slug=" + encodeURIComponent(st.slug || "");
    a.textContent = "Voir les épisodes";

    card.appendChild(meta);
    card.appendChild(t);
    card.appendChild(ex);
    card.appendChild(a);

    container.appendChild(card);
  }
}

function onStorySearch(v){ S_TEXT = v || ""; renderStories(); }
function onStoryFilter(cat){ S_CAT = cat; renderStories(); }
function onStoryClear(){ S_CAT = null; renderStories(); }

window.StoriesPage = { loadStoriesPage, onStorySearch, onStoryFilter, onStoryClear };
