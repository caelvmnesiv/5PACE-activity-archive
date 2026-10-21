const DATA_URL = "data/activities.json";

const statusLabels = {
  open: "OPEN",
  upcoming: "UPCOMING",
  closed: "CLOSED",
  archived: "ARCHIVE",
  draft: "DRAFT"
};

const categoryLabels = {
  "monthly": "MONTHLY ACTIVITY",
  "free-activity": "FREECTIVITIE5",
  "collaboration": "COLLABORATION",
  "special-event": "SPECIAL EVENT",
  "editorial": "EDITORIAL"
};

const grid = document.querySelector("#activity-grid");
const searchInput = document.querySelector("#search-input");
const categoryFilter = document.querySelector("#category-filter");
const statusFilter = document.querySelector("#status-filter");
const sortFilter = document.querySelector("#sort-filter");
const resultsLabel = document.querySelector("#results-label");
const emptyState = document.querySelector("#empty-state");
const resetButton = document.querySelector("#reset-filters");
const emptyReset = document.querySelector("#empty-reset");

let activities = [];

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "NOT SET";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date).toUpperCase();
}

function statusClass(status) {
  return `status-${statusLabels[status] ? status : "draft"}`;
}

function coverClass(activity) {
  const known = ["cover-mystery", "cover-music", "cover-free"];
  return known.includes(activity.cover_style) ? activity.cover_style : "cover-mystery";
}

function categoryLabel(category) {
  return categoryLabels[category] || String(category || "UNCATEGORIZED").replaceAll("-", " ").toUpperCase();
}

function cardTemplate(activity) {
  const tags = (activity.tags || []).slice(0, 3).map(tag =>
    `<span class="tag">${escapeHTML(tag)}</span>`).join("");
  const code = activity.id || "NO-CODE";
  const title = activity.title || "Untitled activity";
  const summary = activity.summary || "No summary provided yet.";
  const status = statusLabels[activity.status] || "DRAFT";
  const dateLabel = activity.deadline ? `DUE ${formatDate(activity.deadline)}` : "NO DEADLINE SET";
  return `
    <article class="activity-card">
      <div class="card-cover ${coverClass(activity)}">
        <div class="cover-label"><span>${escapeHTML(code)}</span><span>${escapeHTML(categoryLabel(activity.category))}</span></div>
        <div class="cover-art">
          <div class="cover-big">${escapeHTML(activity.cover_title || title)}</div>
          <div class="cover-code">5PACE / 506</div>
        </div>
      </div>
      <div class="card-content">
        <div class="card-meta">
          <span>${escapeHTML(formatDate(activity.published))}</span>
          <span class="status-pill ${statusClass(activity.status)}">${escapeHTML(status)}</span>
        </div>
        <h3>${escapeHTML(title)}</h3>
        <p class="card-summary">${escapeHTML(summary)}</p>
        <div class="tag-row">${tags || `<span class="tag">${escapeHTML(categoryLabel(activity.category))}</span>`}</div>
        <div class="card-footer">
          <span>${escapeHTML(dateLabel)}</span>
          <a class="card-link" href="activity.html?id=${encodeURIComponent(code)}">OPEN FILE ↗</a>
        </div>
      </div>
    </article>`;
}

function fillCategories() {
  const categories = [...new Set(activities.map(item => item.category).filter(Boolean))].sort();
  categoryFilter.innerHTML = `<option value="all">ALL CATEGORIES</option>` +
    categories.map(category => `<option value="${escapeHTML(category)}">${escapeHTML(categoryLabel(category))}</option>`).join("");
}

function sortActivities(items) {
  const sorted = [...items];
  switch (sortFilter.value) {
    case "oldest":
      sorted.sort((a, b) => (a.published || "").localeCompare(b.published || ""));
      break;
    case "title":
      sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "deadline":
      sorted.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
      break;
    default:
      sorted.sort((a, b) => (b.published || "").localeCompare(a.published || ""));
  }
  return sorted;
}

function render() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const category = categoryFilter.value;
  const status = statusFilter.value;
  const filtered = activities.filter(activity => {
    const searchable = [
      activity.id, activity.title, activity.summary, activity.category,
      ...(activity.tags || []), activity.instructions, activity.requirements
    ].join(" ").toLocaleLowerCase();
    return (!query || searchable.includes(query)) &&
      (category === "all" || activity.category === category) &&
      (status === "all" || activity.status === status);
  });
  const sorted = sortActivities(filtered);
  grid.innerHTML = sorted.map(cardTemplate).join("");
  grid.hidden = sorted.length === 0;
  emptyState.hidden = sorted.length !== 0;
  resultsLabel.textContent = `${String(sorted.length).padStart(2, "0")} FILE${sorted.length === 1 ? "" : "S"} FOUND`;
}

function resetFilters() {
  searchInput.value = "";
  categoryFilter.value = "all";
  statusFilter.value = "all";
  sortFilter.value = "newest";
  render();
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    activities = Array.isArray(data.activities) ? data.activities : [];
    document.querySelector("#total-count").textContent = String(activities.length).padStart(2, "0");
    document.querySelector("#open-count").textContent = String(activities.filter(item => item.status === "open").length).padStart(2, "0");
    fillCategories();
    render();
  } catch (error) {
    grid.innerHTML = `<div class="loading-card">ARCHIVE UNAVAILABLE<br><br>No se pudo cargar data/activities.json. Abre la web mediante GitHub Pages o un servidor local, y comprueba que el archivo exista.</div>`;
    resultsLabel.textContent = "CONNECTION ERROR";
    console.error(error);
  }
}

searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", render);
statusFilter.addEventListener("change", render);
sortFilter.addEventListener("change", render);
resetButton.addEventListener("click", resetFilters);
emptyReset.addEventListener("click", resetFilters);
document.addEventListener("keydown", event => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

init();
