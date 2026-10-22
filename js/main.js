// App shell: hash router (home hub, sections, tools, tool modal), shelves, search, PWA.
//
// Routes (every screen is linkable and the back button walks them in order):
//   #/                 home hub — global search, pinned/recent, section cards
//   #/tools            tools, grouped by category
//   #/tools/<cat>      one category
//   #/t/<tool>         a tool, opened over the current view
//   #/<section>        any section registered with section({...})
// Old links (#c/<cat>, #<tool>) are redirected.

const byId = (id) => TOOLS.find(t => t.id === id);
const countIn = (id) => TOOLS.filter(t => inCat(t, id)).length;
const grid = $("#grid"), filters = $("#filters"), q = $("#q"), hq = $("#hq");
let cat = "all", view = "home";
let pins = store.get("pins", []);
let recent = store.get("recent", []);

section({
  id: "tools", name: "เครื่องมือ", icon: I.tools, builtin: true,
  desc: "เครื่องมือช่วยงานครบทุกอย่าง แปลงไฟล์ รูปภาพ PDF เงิน เอกสาร เว็บ ความปลอดภัย และอีกมาก",
  stats: () => `${TOOLS.length} เครื่องมือ · ${CATS.length} หมวด`,
});

$("#toolCount").textContent = TOOLS.length;

// ---------- Navigation chrome ----------
const tabs = () => [{ id: "home", name: "หน้าแรก", icon: I.home, href: "#/" }, ...SECTIONS.map(s => ({ id: s.id, name: s.name, icon: s.icon, href: "#/" + s.id }))];
function renderNav() {
  const active = view === "section" ? currentSection : view;
  $("#navLinks").innerHTML = tabs().map(t => `<li><a href="${t.href}"${t.id === active ? ' aria-current="page"' : ""}>${t.name}</a></li>`).join("");
  // Bottom bar: top-level destinations only, max 5 (UX: bottom-nav-limit, bottom-nav-top-level)
  $("#tabbar").innerHTML = tabs().slice(0, 4).concat([{ id: "search", name: "ค้นหา", icon: I.search, href: "#/" }]).map(t =>
    `<a href="${t.href}" class="tab${t.id === active ? " active" : ""}"${t.id === active ? ' aria-current="page"' : ""}${t.id === "search" ? ' data-focus-search' : ""}><span class="tab-ic" aria-hidden="true">${t.icon}</span><span>${t.name}</span></a>`).join("");
}
$("#tabbar").addEventListener("click", e => {
  if (!e.target.closest("[data-focus-search]")) return;
  e.preventDefault();
  if (view !== "home") location.hash = "#/";
  requestAnimationFrame(() => { hq.focus(); hq.scrollIntoView({ block: "center" }); });
});

// ---------- Cards ----------
function card(t, i, showCat = true) {
  const pinned = pins.includes(t.id);
  return `<div class="tool-card glass" data-id="${t.id}" role="button" tabindex="0" style="animation-delay:${Math.min(i, 20) * 30}ms">
    <button class="star${pinned ? " on" : ""}" data-pin="${t.id}" aria-label="${pinned ? "เลิกปักหมุด" : "ปักหมุด"} ${esc(t.name)}">${I.star}</button>
    ${showCat ? `<span class="cat">${catById(t.cat).name}</span>` : ""}<span class="ic">${t.icon}</span>
    <h3>${t.name}${t.fresh ? ' <span class="badge-new">ใหม่</span>' : ""}</h3><p>${t.desc}</p><span class="go">เปิดเครื่องมือ →</span>
  </div>`;
}
const mini = (t) => `<button class="mini glass" data-id="${t.id}"><span class="ic">${t.icon}</span>${t.name}</button>`;
function catSection(c, list, collapsed) {
  const shown = collapsed ? list.slice(0, 6) : list;
  return `<section class="cat-section" aria-labelledby="h-${c.id}">
    <header class="cat-head"><span class="ic">${c.icon}</span><div><h2 id="h-${c.id}">${c.name} <small>${list.length} เครื่องมือ</small></h2><p>${c.desc}</p></div>
    ${collapsed && list.length > shown.length ? `<a class="btn btn-ghost btn-sm" href="#/tools/${c.id}">ดูทั้งหมด →</a>` : ""}</header>
    <div class="grid">${shown.map((t, i) => card(t, i, false)).join("")}</div></section>`;
}

// ---------- Home hub ----------
function renderShelves() {
  const p = pins.map(byId).filter(Boolean), r = recent.map(byId).filter(Boolean).slice(0, 8);
  $("#shelves").innerHTML =
    (p.length ? `<div class="shelf"><h2><span class="gold">★</span> ปักหมุด</h2><div class="mini-row">${p.map(mini).join("")}</div></div>` : "") +
    (r.length ? `<div class="shelf"><h2>ใช้ล่าสุด <small>เก็บไว้ในเครื่องนี้เท่านั้น</small></h2><div class="mini-row">${r.map(mini).join("")}</div></div>` : "");
}
function renderSections() {
  $("#sectionCards").innerHTML = SECTIONS.map(s => `<a class="section-card glass" href="#/${s.id}">
      <span class="ic" aria-hidden="true">${s.icon}</span><div class="section-text"><h3>${s.name}</h3><p>${s.desc}</p>${s.stats ? `<small>${s.stats()}</small>` : ""}</div><span class="go" aria-hidden="true">→</span></a>
    ${s.id === "tools" ? `<div class="cat-quick" aria-label="ทางลัดหมวดเครื่องมือ">${CATS.map(c => `<a class="chip" href="#/tools/${c.id}"><span class="chip-ic" aria-hidden="true">${c.icon}</span>${c.name}</a>`).join("")}</div>` : ""}`).join("");
  const fresh = TOOLS.filter(t => t.fresh);
  $("#newWrap").hidden = !fresh.length;
  $("#newTools").innerHTML = fresh.map(mini).join("");
}
const matches = (t, term) => (t.name + t.desc + (t.keywords || "") + catById(t.cat).name).toLowerCase().includes(term);
function renderHomeResults() {
  const raw = hq.value, term = raw.trim().toLowerCase(), el = $("#homeResults");
  if (!term) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="smart glass" id="homeSmart" hidden></div><div id="homeList"></div>`;
  const smart = renderSmart($("#homeSmart"), raw), list = TOOLS.filter(t => matches(t, term));
  // A name match is what the user typed for; paste suggestions follow it instead of pushing it down.
  if (list.length) el.append($("#homeSmart"));
  $("#homeList").innerHTML = list.length
    ? `<div class="results-head"><h2 class="home-h">เครื่องมือที่ตรงกัน <small>${list.length}</small></h2>${list.length > 9 ? `<a class="btn btn-ghost btn-sm" href="#/tools" data-carry>ดูทั้งหมด →</a>` : ""}</div><div class="grid">${list.slice(0, 9).map((t, i) => card(t, i)).join("")}</div>`
    : smart ? "" : `<div class="empty-hint"><b>ไม่พบ “${esc(raw.trim().slice(0, 40))}”</b><span>ลองคำอื่น เช่น “รูป”, “PDF”, “เงิน” หรือวางข้อมูลที่อยากจัดการ</span></div>`;
}
hq.addEventListener("input", renderHomeResults);
$("#homeResults").addEventListener("click", e => { if (e.target.closest("[data-carry]")) q.value = hq.value; });

// Backup reminder: shown when the user has their own records and hasn't backed up in 14 days.
function renderBanner() {
  const el = $("#banner"), last = store.get("meta:lastBackup", 0), snooze = store.get("meta:snooze", 0), d = daysSince(last);
  if (!hasRecords() || (d !== null && d < 14) || Date.now() < snooze) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="banner glass" role="region" aria-label="เตือนสำรองข้อมูล"><span class="ic" aria-hidden="true">${I.key}</span><div><b>${d === null ? "ยังไม่เคยสำรองข้อมูล" : `สำรองข้อมูลล่าสุด ${d} วันที่แล้ว`}</b><span>ข้อมูลของคุณอยู่ในเครื่องนี้เท่านั้น ถ้าล้าง Safari ข้อมูลจะหาย</span></div><div class="banner-acts"><button class="btn btn-gold btn-sm" data-id="backup">สำรองตอนนี้</button><button class="btn btn-ghost btn-sm" id="snooze">ไว้ทีหลัง</button></div></div>`;
  $("#snooze").onclick = () => { store.set("meta:snooze", Date.now() + 7 * 864e5); renderBanner(); };
}

// ---------- Tools view ----------
filters.innerHTML = [{ id: "all", name: "ทั้งหมด" }, ...CATS].map(c =>
  `<a class="chip" href="${c.id === "all" ? "#/tools" : "#/tools/" + c.id}" data-cat="${c.id}">${c.icon ? `<span class="chip-ic" aria-hidden="true">${c.icon}</span>` : ""}${c.name}<span class="chip-n">${c.id === "all" ? TOOLS.length : countIn(c.id)}</span></a>`).join("");
function renderTools() {
  const c = catById(cat);
  $$(".chip", filters).forEach(x => { const on = x.dataset.cat === cat; x.classList.toggle("active", on); on ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current"); });
  $("#crumbs").innerHTML = `<a href="#/">หน้าแรก</a><span aria-hidden="true">›</span>${c ? `<a href="#/tools">เครื่องมือ</a><span aria-hidden="true">›</span><span aria-current="page">${c.name}</span>` : `<span aria-current="page">เครื่องมือ</span>`}`;
  $("#toolsTitle").textContent = c ? c.name : "เครื่องมือ";
  $("#toolsSub").textContent = c ? c.desc : `${TOOLS.length} เครื่องมือ ใน ${CATS.length} หมวด — ทำงานในเครื่องของคุณทั้งหมด`;
  document.title = (c ? c.name + " · " : "เครื่องมือ · ") + "Lumière";
  renderGrid();
}
function renderGrid() {
  const term = q.value.trim().toLowerCase();
  // Smart Paste: if the search box holds something recognisable (a link, number, date…), suggest tools for it.
  const smart = $("#smart"), smartShown = term ? renderSmart(smart, q.value) : (smart.hidden = true, false);
  if (term) {
    const list = TOOLS.filter(t => (cat === "all" || inCat(t, cat)) && matches(t, term));
    $("#count").textContent = list.length ? `พบ ${list.length} เครื่องมือ` : "";
    grid.innerHTML = list.length ? `<div class="grid">${list.map((t, i) => card(t, i)).join("")}</div>` : smartShown ? "" : `<div class="empty-hint"><b>ไม่พบเครื่องมือที่ตรงกับ “${esc(q.value.slice(0, 40))}”</b><span>ลองคำอื่น เช่น “รูป”, “PDF”, “เงิน” หรือวางข้อมูลที่อยากจัดการลงในช่องนี้</span></div>`;
    return;
  }
  $("#count").textContent = "";
  grid.innerHTML = cat === "all" ? CATS.map(c => catSection(c, TOOLS.filter(t => inCat(t, c.id)), true)).join("") : catSection(catById(cat), TOOLS.filter(t => inCat(t, cat)), false);
}
q.addEventListener("input", renderGrid);

$$("[data-paste]").forEach(b => b.onclick = async () => {
  const t = await readClipboard(); if (t == null) return;
  const inp = $("#" + b.dataset.paste); inp.value = t; inp.dispatchEvent(new Event("input"));
});

// Pins and card activation work everywhere (home, tools, results).
document.addEventListener("click", e => {
  const pin = e.target.closest("[data-pin]");
  if (pin) {
    e.stopPropagation();
    const id = pin.dataset.pin;
    pins = pins.includes(id) ? pins.filter(x => x !== id) : [...pins, id];
    store.set("pins", pins); renderShelves(); view === "tools" ? renderGrid() : renderHomeResults();
    toast(pins.includes(id) ? "ปักหมุดแล้ว ★" : "เลิกปักหมุดแล้ว");
    return;
  }
  const c = e.target.closest("[data-id]");
  if (c && !c.closest("#panelBody")) openTool(c.dataset.id);
});
document.addEventListener("keydown", e => { const c = e.target.closest?.(".tool-card"); if (c && (e.key === "Enter" || e.key === " ") && e.target === c) { e.preventDefault(); openTool(c.dataset.id); } });
document.addEventListener("pointermove", e => {
  const c = e.target.closest?.(".tool-card"); if (!c) return;
  const r = c.getBoundingClientRect(); c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px");
});

// ---------- Router ----------
let currentSection = null;
const scrollMemo = {};
function showView(v) {
  scrollMemo[view] = scrollY;
  $$(".view").forEach(el => el.hidden = el.dataset.view !== v);
  const changed = v !== view; view = v; renderNav();
  return changed;
}
function route() {
  let h = location.hash.slice(1);
  // Legacy links
  if (h.startsWith("c/")) return history.replaceState(null, "", "#/tools/" + h.slice(2)), route();
  if (h && !h.startsWith("/") && byId(h)) return history.replaceState(null, "", "#/t/" + h), route();
  const parts = h.replace(/^\//, "").split("/").filter(Boolean);
  if (parts[0] === "t" && byId(parts[1])) {
    if (!$(".view:not([hidden])")) { cat = "all"; showView("tools"); renderTools(); }
    if (!modal.classList.contains("open") || currentTool?.id !== parts[1]) showTool(parts[1]);
    return;
  }
  if (modal.classList.contains("open")) hideTool();
  if (parts[0] === "tools") {
    const changed = showView("tools"), prevCat = cat;
    cat = catById(parts[1]) ? parts[1] : "all";
    renderTools();
    if (changed || prevCat !== cat) scrollTo(0, cat === "all" ? 0 : ($("#tools").offsetTop - 20));
    return;
  }
  const sec = SECTIONS.find(s => s.id === parts[0] && !s.builtin);
  if (sec) {
    currentSection = sec.id; showView("section");
    const el = $("#view-section"); el.innerHTML = ""; sec.render?.(el); document.title = sec.name + " · Lumière";
    scrollTo(0, 0); return;
  }
  const changed = showView("home");
  document.title = "Lumière";
  renderShelves(); renderBanner(); renderSections(); renderHomeResults();
  if (changed) scrollTo(0, scrollMemo.home || 0);
}
addEventListener("hashchange", route);

// ---------- Tool modal ----------
const modal = $("#modal");
let lastFocus, cleanup, pendingPrefill, openedByPush = false;
// Public entry point. Navigates to #/t/<id> so the back button closes the tool.
// prefill: { pre: [selectors clicked first], fields: { id: value }, post: [selectors clicked after] }
function openTool(id, prefill) {
  if (!byId(id)) return;
  pendingPrefill = prefill;
  if (location.hash === "#/t/" + id) { showTool(id); return; }
  if (modal.classList.contains("open")) { history.replaceState(null, "", "#/t/" + id); showTool(id); return; }
  openedByPush = true; location.hash = "#/t/" + id;
}
function showTool(id) {
  const t = byId(id);
  if (modal.classList.contains("open")) runCleanup(); else lastFocus = document.activeElement;
  $("#panelIcon").innerHTML = `<span class="ic">${t.icon}</span>`;
  $("#panelTitle").textContent = t.name; $("#panelDesc").textContent = t.desc;
  const body = $("#panelBody"); body.innerHTML = "";
  currentTool = t;
  try { cleanup = t.render(body); restoreFields(t, body); if (pendingPrefill) applyPrefill(body, pendingPrefill); }
  catch (err) { body.innerHTML = `<div class="status err">เกิดข้อผิดพลาด: ${esc(err.message)}</div>`; }
  pendingPrefill = null;
  $("#panelFoot").hidden = t.persist === false;
  modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("lock");
  document.title = t.name + " · Lumière";
  recent = [id, ...recent.filter(x => x !== id)].slice(0, 12); store.set("recent", recent);
  setTimeout(() => $(".close", modal).focus(), 50);
}
function hideTool() {
  runCleanup();
  modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); document.body.classList.remove("lock");
  $("#panelBody").innerHTML = ""; currentTool = null;
  renderShelves(); renderBanner(); if (view === "home") renderSections();
  lastFocus?.focus?.();
}
// Close = go back if we pushed the tool route ourselves; otherwise (deep link) replace with the view behind it.
function closeTool() {
  if (openedByPush) { openedByPush = false; history.back(); return; }
  history.replaceState(null, "", view === "tools" ? (cat === "all" ? "#/tools" : "#/tools/" + cat) : "#/");
  hideTool();
}
$$("[data-close]", modal).forEach(el => el.onclick = closeTool);
addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("open")) closeTool(); });
function applyPrefill(body, { pre = [], fields = {}, post = [] }) {
  pre.forEach(sel => $(sel, body)?.click());
  for (const [id, v] of Object.entries(fields)) {
    const el = body.querySelector("#" + CSS.escape(id)); if (!el) continue;
    el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  post.forEach(sel => $(sel, body)?.click());
}

// ---------- Remember inputs per tool ----------
// Every field with an id is saved per tool and restored on the next open. Tools whose fields may
// hold secrets or depend on "now" opt out with persist: false.
let currentTool, saveTimer;
const fieldsOf = (body) => $$("input[id], select[id], textarea[id]", body).filter(el => el.type !== "file" && !el.readOnly);
function restoreFields(t, body) {
  const saved = t.persist === false ? null : store.get("inputs:" + t.id, null);
  if (!saved) return;
  for (const el of fieldsOf(body)) {
    if (!(el.id in saved)) continue;
    if (el.type === "checkbox" || el.type === "radio") el.checked = saved[el.id]; else el.value = saved[el.id];
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
function saveFields() {
  const t = currentTool; if (!t || t.persist === false || !modal.classList.contains("open")) return;
  const data = {};
  for (const el of fieldsOf($("#panelBody"))) data[el.id] = el.type === "checkbox" || el.type === "radio" ? el.checked : el.value;
  store.set("inputs:" + t.id, data);
}
["input", "change"].forEach(ev => $("#panelBody").addEventListener(ev, () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveFields, 300); }));
$("#resetInputs").onclick = () => {
  const t = currentTool; if (!t) return;
  try { localStorage.removeItem("lumiere:inputs:" + t.id); } catch {}
  clearTimeout(saveTimer); showTool(t.id); toast("ล้างค่าที่จำไว้แล้ว");
};

// ---------- Responsive tables ----------
// Copy each column header onto its cells so narrow screens can show rows as labelled cards.
new MutationObserver(() => {
  for (const tbl of $$("#panelBody .data-table")) {
    const heads = $$("thead th", tbl).map(th => th.textContent.trim());
    for (const tr of $$("tbody tr, tfoot tr", tbl)) [...tr.children].forEach((td, i) => { if (heads[i] && td.dataset.label !== heads[i]) td.dataset.label = heads[i]; });
  }
}).observe($("#panelBody"), { childList: true, subtree: true });

function runCleanup() { if (typeof cleanup === "function") { try { cleanup(); } catch {} } cleanup = null; }

route();

// ---------- PWA ----------
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
let installEvt;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("#installBtn").classList.add("show"); });
$("#installBtn").onclick = async () => {
  if (!installEvt) return;
  installEvt.prompt(); await installEvt.userChoice; installEvt = null;
  $("#installBtn").classList.remove("show");
};
