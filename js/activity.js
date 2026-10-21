const DATA_URL = "data/activities.json";
const statusLabels = { open: "OPEN", upcoming: "UPCOMING", closed: "CLOSED", archived: "ARCHIVE", draft: "DRAFT" };
const categoryLabels = {
  monthly: "MONTHLY ACTIVITY", "free-activity": "FREECTIVITIE5",
  collaboration: "COLLABORATION", "special-event": "SPECIAL EVENT", editorial: "EDITORIAL"
};

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}
function categoryLabel(category) {
  return categoryLabels[category] || String(category || "Uncategorized").replaceAll("-", " ").toUpperCase();
}
function paragraph(text) {
  return escapeHTML(text || "Pendiente de completar.").replace(/\n/g, "<br>");
}
function list(items) {
  if (!Array.isArray(items) || items.length === 0) return "<p>Pendiente de completar.</p>";
  return `<ul>${items.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`;
}
function statusClass(status) {
  return `status-${statusLabels[status] ? status : "draft"}`;
}
function safeExternalLink(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch (_) {}
  return "";
}
function renderActivity(activity) {
  const status = statusLabels[activity.status] || "DRAFT";
  const facebookUrl = safeExternalLink(activity.facebook_url || "");
  const reward = activity.reward === null || activity.reward === undefined || activity.reward === "" ? "Not specified" : String(activity.reward);
  const coverStyle = ["cover-mystery", "cover-music", "cover-free"].includes(activity.cover_style) ? activity.cover_style : "cover-mystery";
  const coverImage = safeExternalLink(activity.cover_image || "");
  document.title = `${activity.title || "Activity file"} — 5PACE®`;
  document.querySelector("#activity-detail").innerHTML = `
    <section class="detail-hero">
      <div class="detail-hero-copy">
        <p class="eyebrow">${escapeHTML(activity.id || "NO-CODE")} / ${escapeHTML(categoryLabel(activity.category))}</p>
        <span class="status-pill ${statusClass(activity.status)}">${escapeHTML(status)}</span>
        <h1>${escapeHTML(activity.title || "Untitled activity")}<span class="accent">.</span></h1>
        <p class="detail-summary">${paragraph(activity.summary)}</p>
        <div class="tag-row">${(activity.tags || []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div>
        ${activity.demo ? `<div class="demo-note"><strong>DEMO FILE / ARCHIVE SETUP</strong><br>Esta ficha es un ejemplo de estructura. Reemplaza los campos de muestra por las instrucciones aprobadas antes de compartirla con los participantes.</div>` : ""}
      </div>
      <div class="detail-cover ${coverStyle}">
        ${coverImage ? `<img src="${escapeHTML(coverImage)}" alt="" onerror="this.remove()">` : ""}
        <div class="detail-cover-title">${escapeHTML(activity.cover_title || activity.title || "5PACE")}</div>
      </div>
    </section>
    <section class="detail-stats">
      <div class="detail-stat"><div class="detail-meta-label">PUBLISHED</div><div class="detail-meta-value">${escapeHTML(formatDate(activity.published))}</div></div>
      <div class="detail-stat"><div class="detail-meta-label">DEADLINE</div><div class="detail-meta-value">${escapeHTML(formatDate(activity.deadline))}</div></div>
      <div class="detail-stat"><div class="detail-meta-label">REWARD</div><div class="detail-meta-value">${escapeHTML(reward)}${activity.reward !== null && activity.reward !== undefined && activity.reward !== "" ? " points / units (edit label as needed)" : ""}</div></div>
    </section>
    <section class="detail-layout">
      <article class="instruction-panel">
        <p class="eyebrow">FILE CONTENTS / INSTRUCTIONS</p>
        <h2>Read before you begin<span class="accent">.</span></h2>
        <div class="instruction-section"><h3>01 — Overview</h3><p>${paragraph(activity.overview || activity.summary)}</p></div>
        <div class="instruction-section"><h3>02 — Instructions</h3><p>${paragraph(activity.instructions)}</p></div>
        <div class="instruction-section"><h3>03 — Requirements</h3>${list(activity.requirements_list)}</div>
        <div class="instruction-section"><h3>04 — How to participate</h3>${list(activity.how_to_participate)}</div>
        <div class="instruction-section"><h3>05 — Delivery / submission</h3><p>${paragraph(activity.submission)}</p></div>
        <div class="instruction-section"><h3>06 — Notes</h3><p>${paragraph(activity.notes)}</p></div>
      </article>
      <aside>
        <div class="sidebar-panel">
          <p class="eyebrow">QUICK ACCESS</p>
          <h3>Activity file</h3>
          <div class="sidebar-row"><div class="detail-meta-label">FILE CODE</div><div class="detail-meta-value">${escapeHTML(activity.id || "—")}</div></div>
          <div class="sidebar-row"><div class="detail-meta-label">CATEGORY</div><div class="detail-meta-value">${escapeHTML(categoryLabel(activity.category))}</div></div>
          <div class="sidebar-row"><div class="detail-meta-label">RESERVATION CODE</div><div class="detail-meta-value">${escapeHTML(activity.reservation_code || "Not required / not set")}</div></div>
          <div class="sidebar-row"><div class="detail-meta-label">LAST UPDATED</div><div class="detail-meta-value">${escapeHTML(formatDate(activity.updated))}</div></div>
          ${facebookUrl ? `<a class="button" style="width:100%;margin-top:16px" href="${escapeHTML(facebookUrl)}" target="_blank" rel="noopener noreferrer">OPEN FACEBOOK POST ↗</a>` : `<span class="button" aria-disabled="true" style="width:100%;margin-top:16px">FACEBOOK LINK NOT SET</span><p class="muted-small">La administración debe añadir el enlace a la publicación oficial.</p>`}
        </div>
        <div class="sidebar-panel">
          <h3>Need a reminder?</h3>
          <p class="muted-small">Guarda el enlace de esta ficha o vuelve al archivo para consultar otras actividades. Verifica siempre el estado y la fecha límite antes de participar.</p>
          <a class="button button-secondary" style="width:100%" href="index.html">BACK TO ARCHIVE ←</a>
        </div>
      </aside>
    </section>`;
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const container = document.querySelector("#activity-detail");
  const notFound = document.querySelector("#not-found");
  if (!id) {
    container.hidden = true;
    notFound.hidden = false;
    return;
  }
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const activity = (data.activities || []).find(item => item.id === id);
    if (!activity) {
      container.hidden = true;
      notFound.hidden = false;
      return;
    }
    renderActivity(activity);
  } catch (error) {
    container.innerHTML = `<div class="not-found"><p class="eyebrow">CONNECTION ERROR</p><h1>Unable to load this file<span class="accent">.</span></h1><p>Comprueba que data/activities.json esté publicado y vuelve a intentarlo.</p></div>`;
    console.error(error);
  }
}
init();
