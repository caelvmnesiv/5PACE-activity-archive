const DATA_URL = "data/activities.json";
const grid = document.querySelector("#activity-grid");
const searchInput = document.querySelector("#search-input");
const categoryFilter = document.querySelector("#category-filter");
const resultsLabel = document.querySelector("#results-label");
const emptyState = document.querySelector("#empty-state");
const resetButton = document.querySelector("#reset-filters");
const emptyReset = document.querySelector("#empty-reset");
let activities = [];

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function cardTemplate(item, index) {
  const link = /^https:\/\//i.test(item.facebook_url || "") ? item.facebook_url : "";
  return `<article class="activity-card">
    <div class="card-index"><span>5PACE / ACTIVITY</span><span>${String(index + 1).padStart(2,"0")} — 09</span></div>
    <div class="card-content">
      <p class="card-type">${escapeHTML(item.category || "ACTIVITY")}</p>
      <h3>${escapeHTML(item.title || "Untitled activity")}</h3>
      <a class="card-link" href="${escapeHTML(link || "#")}" ${link ? 'target="_blank" rel="noopener noreferrer"' : 'aria-disabled="true"'}>${link ? "OPEN FACEBOOK POST ↗" : "LINK NOT AVAILABLE"}</a>
    </div>
  </article>`;
}
function fillCategories() {
  const cats = [...new Set(activities.map(a => a.category).filter(Boolean))].sort();
  categoryFilter.innerHTML = '<option value="all">ALL TYPES</option>' + cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c.toUpperCase())}</option>`).join("");
}
function render() {
  const q = searchInput.value.trim().toLocaleLowerCase();
  const cat = categoryFilter.value;
  const filtered = activities.filter(a => (!q || `${a.title} ${a.category} ${a.id}`.toLocaleLowerCase().includes(q)) && (cat === "all" || a.category === cat));
  grid.innerHTML = filtered.map(a => cardTemplate(a, activities.indexOf(a))).join("");
  grid.hidden = !filtered.length;
  emptyState.hidden = !!filtered.length;
  resultsLabel.textContent = `${String(filtered.length).padStart(2,"0")} ACTIVITIES FOUND`;
}
function reset() { searchInput.value = ""; categoryFilter.value = "all"; render(); }
async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Unable to load activity data");
    const data = await response.json();
    activities = Array.isArray(data.activities) ? data.activities : [];
    document.querySelector("#total-count").textContent = String(activities.length).padStart(2,"0");
    document.querySelector("#open-count").textContent = String(activities.filter(a => a.facebook_url).length).padStart(2,"0");
    fillCategories(); render();
  } catch (e) {
    grid.innerHTML = '<div class="loading-card">ARCHIVE UNAVAILABLE — CHECK data/activities.json</div>';
    resultsLabel.textContent = "CONNECTION ERROR";
    console.error(e);
  }
}
searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", render);
resetButton.addEventListener("click", reset);
emptyReset.addEventListener("click", reset);
document.addEventListener("keydown", e => {
  if (e.key === "/" && !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)) { e.preventDefault(); searchInput.focus(); }
});
init();
