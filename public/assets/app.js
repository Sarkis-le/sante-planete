async function injectPartial(targetSelector, url) {
  const el = document.querySelector(targetSelector);
  if (!el) return;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error("Partial introuvable: " + url);
  el.innerHTML = await res.text();
}

function wireMobileNav() {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const closeMenuBtn  = document.getElementById("closeMenuBtn");
  const mainNav       = document.getElementById("mainNav");

  if (!mobileMenuBtn || !closeMenuBtn || !mainNav) return;

  mobileMenuBtn.addEventListener("click", () => mainNav.classList.add("active"));
  closeMenuBtn.addEventListener("click",  () => mainNav.classList.remove("active"));
  document.querySelectorAll("nav a").forEach(a => {
    a.addEventListener("click", () => mainNav.classList.remove("active"));
  });
}

function setActiveNav(key) {
  document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
  const link = document.querySelector(`nav a[data-nav="${key}"]`);
  if (link) link.classList.add("active");
}

function stripHtml(raw) {
  if (!raw) return "";
  return raw.replace(/<[^>]+>/g, " ");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });
}

function estimateReadingTime(text) {
  const clean = stripHtml(text || "");
  if (!clean.trim()) return "1 min de lecture";
  const words = clean.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return minutes + " min de lecture";
}

window.SP = { stripHtml, formatDate, estimateReadingTime, setActiveNav };

document.addEventListener("DOMContentLoaded", async () => {
  // slots
  // chaque page doit avoir:
  // <div id="siteHeader"></div> ... <div id="siteFooter"></div>
  await injectPartial("#siteHeader", "/assets/partials/header.html");
  await injectPartial("#siteFooter", "/assets/partials/footer.html");

  wireMobileNav();
});
