/* 5PACE — authenticated activity board + admin console */
const SUPABASE_URL = "https://qnoadrwubfaoekmsgjui.supabase.co";
const SUPABASE_KEY = "sb_publishable_lZymPwVHECpwTvKQPGmG_w_lUFNSU5P";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (s) => document.querySelector(s);
let currentUser = null;
let isAdmin = false;
let activities = [];
let editingId = null;

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function setMessage(selector, message, error = false) {
  const el = $(selector); if (!el) return;
  el.textContent = message; el.classList.toggle("is-error", error);
}
function safeUrl(value) {
  try { const u = new URL(value); return u.protocol === "https:" ? u.href : ""; }
  catch { return ""; }
}
function normalize(row) {
  return {...row, content: row.content && typeof row.content === "object" ? row.content : {}};
}
function card(row, index) {
  const url = safeUrl(row.content.facebook_url || "");
  return `<article class="activity-card">
    <div class="card-index"><span>5PACE / ACTIVITY</span><span>${String(index + 1).padStart(2,"0")}</span></div>
    <div class="card-content">
      <p class="card-type">${esc(row.category || "ACTIVITY")} · ${esc(row.status).toUpperCase()}</p>
      <h3>${esc(row.title)}</h3>
      <div class="card-actions">
        ${url ? `<a class="card-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">OPEN FACEBOOK POST ↗</a>` : '<span class="muted-small">LINK NOT AVAILABLE</span>'}
        ${isAdmin ? `<div class="admin-card-actions"><button type="button" data-edit="${esc(row.id)}">EDIT</button><button type="button" data-delete="${esc(row.id)}">DELETE</button></div>` : ""}
      </div>
    </div>
  </article>`;
}
function render() {
  const q = ($("#search-input")?.value || "").trim().toLocaleLowerCase();
  const cat = $("#category-filter")?.value || "all";
  const visible = activities.filter(a =>
    (isAdmin || a.status !== "draft") &&
    (!q || `${a.title} ${a.category || ""}`.toLocaleLowerCase().includes(q)) &&
    (cat === "all" || a.category === cat)
  );
  $("#activity-grid").innerHTML = visible.map(card).join("");
  $("#activity-grid").hidden = visible.length === 0;
  $("#empty-state").hidden = visible.length !== 0;
  $("#results-label").textContent = `${String(visible.length).padStart(2,"0")} ACTIVITIES FOUND`;
  $("#total-count").textContent = String(visible.length).padStart(2,"0");
  $("#open-count").textContent = String(visible.filter(a => safeUrl(a.content.facebook_url)).length).padStart(2,"0");
}
function fillCategories() {
  const selected = $("#category-filter").value || "all";
  const cats = [...new Set(activities.map(a => a.category).filter(Boolean))].sort();
  $("#category-filter").innerHTML = '<option value="all">ALL TYPES</option>' +
    cats.map(c => `<option value="${esc(c)}">${esc(c.toUpperCase())}</option>`).join("");
  $("#category-filter").value = cats.includes(selected) ? selected : "all";
}
function setAuthUI() {
  $("#auth-panel").hidden = !!currentUser;
  $("#account-bar").hidden = !currentUser;
  $("#account-email").textContent = currentUser?.email || "";
  $("#admin-panel").hidden = !isAdmin;
  $("#auth-open").hidden = !!currentUser;
  $("#admin-indicator").textContent = isAdmin ? "ADMINISTRATOR ACCESS" : (currentUser ? "APPROVED MEMBER ACCESS" : "MEMBERS ONLY");
}
async function loadActivities() {
  $("#activity-grid").innerHTML = '<div class="loading-card">CONNECTING TO SECURE DATABASE...</div>';
  const { data, error } = await db.from("activities")
    .select("id,title,slug,category,content,status,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (error) {
    $("#activity-grid").innerHTML = "";
    $("#activity-grid").hidden = true;
    $("#empty-state").hidden = false;
    $("#empty-state h3").textContent = "Activity board unavailable.";
    $("#empty-state p").textContent = currentUser
      ? "No se pudo consultar la base de datos. Comprueba las políticas de Supabase."
      : "Inicia sesión con una cuenta aprobada para consultar las actividades.";
    setMessage("#results-label", "DATABASE ACCESS RESTRICTED", true);
    activities = []; return;
  }
  activities = (data || []).map(normalize);
  fillCategories(); render();
}
async function refreshSession() {
  const { data } = await db.auth.getSession();
  currentUser = data.session?.user || null;
  isAdmin = false;
  if (currentUser) {
    const { data: adminResult, error } = await db.rpc("is_admin");
    if (!error) isAdmin = adminResult === true;
  }
  setAuthUI();
  await loadActivities();
}
function resetForm() {
  editingId = null;
  $("#activity-form").reset();
  $("#activity-form-title").textContent = "NEW ACTIVITY";
  $("#activity-save").textContent = "SAVE AS DRAFT";
  $("#activity-status").value = "draft";
}
function editActivity(id) {
  const row = activities.find(a => a.id === id); if (!row) return;
  editingId = id;
  $("#activity-title").value = row.title || "";
  $("#activity-category").value = row.category || "Office’ prompts";
  $("#activity-url").value = row.content.facebook_url || "";
  $("#activity-status").value = row.status || "draft";
  $("#activity-form-title").textContent = "EDIT ACTIVITY";
  $("#activity-save").textContent = "SAVE CHANGES";
  $("#activity-form").scrollIntoView({behavior:"smooth",block:"center"});
}
async function saveActivity(event) {
  event.preventDefault();
  if (!isAdmin) return setMessage("#admin-message", "Administrator permissions required.", true);
  const title = $("#activity-title").value.trim();
  const category = $("#activity-category").value.trim();
  const rawUrl = $("#activity-url").value.trim();
  const facebook_url = rawUrl ? safeUrl(rawUrl) : "";
  if (!title || !category || (rawUrl && !facebook_url)) {
    return setMessage("#admin-message", "Completa el título y la categoría; el enlace debe ser HTTPS.", true);
  }
  const payload = {
    title, category,
    slug: title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
    content: {facebook_url},
    status: $("#activity-status").value,
    updated_at: new Date().toISOString()
  };
  const result = editingId
    ? await db.from("activities").update(payload).eq("id", editingId)
    : await db.from("activities").insert(payload);
  if (result.error) return setMessage("#admin-message", result.error.message, true);
  setMessage("#admin-message", editingId ? "Activity updated." : "Activity created.");
  resetForm(); await loadActivities();
}
async function deleteActivity(id) {
  if (!isAdmin || !confirm("¿Eliminar esta actividad de forma permanente?")) return;
  const { error } = await db.from("activities").delete().eq("id", id);
  if (error) return setMessage("#admin-message", error.message, true);
  setMessage("#admin-message", "Activity deleted."); await loadActivities();
}
$("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  setMessage("#auth-message", "Verificando acceso...");
  const { error } = await db.auth.signInWithPassword({
    email: $("#login-email").value.trim(),
    password: $("#login-password").value
  });
  if (error) return setMessage("#auth-message", error.message, true);
  $("#login-form").reset(); $("#auth-panel").hidden = true;
  await refreshSession();
});
$("#logout-button").addEventListener("click", async () => {
  await db.auth.signOut(); currentUser = null; isAdmin = false; setAuthUI(); await loadActivities();
});
$("#auth-open").addEventListener("click", () => { $("#auth-panel").hidden = !$("#auth-panel").hidden; });
$("#activity-form").addEventListener("submit", saveActivity);
$("#activity-cancel").addEventListener("click", resetForm);
$("#activity-grid").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit]");
  const del = event.target.closest("[data-delete]");
  if (edit && isAdmin) editActivity(edit.dataset.edit);
  if (del && isAdmin) deleteActivity(del.dataset.delete);
});
$("#search-input").addEventListener("input", render);
$("#category-filter").addEventListener("change", render);
$("#reset-filters").addEventListener("click", () => { $("#search-input").value = ""; $("#category-filter").value = "all"; render(); });
$("#empty-reset").addEventListener("click", () => { $("#search-input").value = ""; $("#category-filter").value = "all"; render(); });
db.auth.onAuthStateChange(() => { refreshSession(); });
refreshSession();
