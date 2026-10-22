// Home screen: shelves (pinned / recent), category filters, search, tool modal, PWA install.

const grid = $("#grid"), filters = $("#filters"), q = $("#q"), shelves = $("#shelves");
let cat = "all";
let pins = store.get("pins", []);
let recent = store.get("recent", []);
const byId = (id) => TOOLS.find(t => t.id === id);
const countIn = (id) => TOOLS.filter(t => inCat(t, id)).length;

$("#toolCount").textContent = TOOLS.length;

filters.innerHTML = [{ id: "all", name: "ทั้งหมด" }, ...CATS].map(c =>
  `<button class="chip${c.id === cat ? " active" : ""}" data-cat="${c.id}">${c.icon ? `<span class="chip-ic" aria-hidden="true">${c.icon}</span>` : ""}${c.name}<span class="chip-n">${c.id === "all" ? TOOLS.length : countIn(c.id)}</span></button>`).join("");
function setCat(id, scroll) {
  cat = catById(id) ? id : "all";
  $$(".chip", filters).forEach(x => x.classList.toggle("active", x.dataset.cat === cat));
  if (!modal.classList.contains("open")) history.replaceState(null, "", cat === "all" ? location.pathname + location.search : "#c/" + cat);
  renderGrid();
  if (scroll) $("#tools").scrollIntoView({ behavior: "smooth" });
}
filters.addEventListener("click", e => { const b = e.target.closest(".chip"); if (b) setCat(b.dataset.cat); });

function card(t, i, showCat = true) {
  const pinned = pins.includes(t.id);
  return `<div class="tool-card glass" data-id="${t.id}" role="button" tabindex="0" style="animation-delay:${Math.min(i, 20) * 30}ms">
    <button class="star${pinned ? " on" : ""}" data-pin="${t.id}" aria-label="${pinned ? "เลิกปักหมุด" : "ปักหมุด"}">${I.star}</button>
    ${showCat ? `<span class="cat">${catById(t.cat).name}</span>` : ""}<span class="ic">${t.icon}</span>
    <h3>${t.name}</h3><p>${t.desc}</p><span class="go">เปิดเครื่องมือ →</span>
  </div>`;
}
function mini(t) { return `<button class="mini glass" data-id="${t.id}"><span class="ic">${t.icon}</span>${t.name}</button>`; }
function section(c, list, collapsed) {
  const shown = collapsed ? list.slice(0, 6) : list;
  return `<section class="cat-section" aria-labelledby="h-${c.id}">
    <header class="cat-head"><span class="ic">${c.icon}</span><div><h2 id="h-${c.id}">${c.name} <small>${list.length} เครื่องมือ</small></h2><p>${c.desc}</p></div>
    ${collapsed && list.length > shown.length ? `<button class="btn btn-ghost btn-sm" data-open-cat="${c.id}">ดูทั้งหมด →</button>` : ""}</header>
    <div class="grid">${shown.map((t, i) => card(t, i, false)).join("")}</div></section>`;
}

function renderShelves() {
  const p = pins.map(byId).filter(Boolean), r = recent.map(byId).filter(Boolean).slice(0, 8);
  shelves.innerHTML =
    (p.length ? `<div class="shelf"><h2><span class="gold">★</span> ปักหมุด</h2><div class="mini-row">${p.map(mini).join("")}</div></div>` : "") +
    (r.length ? `<div class="shelf"><h2>ใช้ล่าสุด <small>เก็บไว้ในเครื่องนี้เท่านั้น</small></h2><div class="mini-row">${r.map(mini).join("")}</div></div>` : "");
}
function renderGrid() {
  const term = q.value.trim().toLowerCase();
  if (term) { // flat search results across every category
    const list = TOOLS.filter(t => (cat === "all" || inCat(t, cat)) &&
      (t.name + t.desc + (t.keywords || "") + catById(t.cat).name).toLowerCase().includes(term));
    $("#count").textContent = `พบ ${list.length} เครื่องมือ`;
    grid.innerHTML = list.length ? `<div class="grid">${list.map((t, i) => card(t, i)).join("")}</div>` : `<div class="empty">ไม่พบเครื่องมือที่ตรงกับ “${esc(q.value)}”</div>`;
    return;
  }
  if (cat === "all") {
    $("#count").textContent = `${TOOLS.length} เครื่องมือ ใน ${CATS.length} หมวด`;
    grid.innerHTML = CATS.map(c => section(c, TOOLS.filter(t => inCat(t, c.id)), true)).join("");
  } else {
    const c = catById(cat);
    $("#count").textContent = "";
    grid.innerHTML = section(c, TOOLS.filter(t => inCat(t, c.id)), false);
  }
}
q.addEventListener("input", renderGrid);
grid.addEventListener("click", e => { const b = e.target.closest("[data-open-cat]"); if (b) setCat(b.dataset.openCat, true); });
renderShelves();

document.addEventListener("click", e => {
  const pin = e.target.closest("[data-pin]");
  if (pin) {
    e.stopPropagation();
    const id = pin.dataset.pin;
    pins = pins.includes(id) ? pins.filter(x => x !== id) : [...pins, id];
    store.set("pins", pins); renderShelves(); renderGrid();
    toast(pins.includes(id) ? "ปักหมุดแล้ว ★" : "เลิกปักหมุดแล้ว");
    return;
  }
  const c = e.target.closest("[data-id]");
  if (c && !c.closest("#panelBody")) openTool(c.dataset.id);
});
grid.addEventListener("keydown", e => { const c = e.target.closest(".tool-card"); if (c && (e.key === "Enter" || e.key === " ") && e.target === c) { e.preventDefault(); openTool(c.dataset.id); } });
grid.addEventListener("pointermove", e => {
  const c = e.target.closest(".tool-card"); if (!c) return;
  const r = c.getBoundingClientRect(); c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px");
});

// ---------- Modal ----------
const modal = $("#modal");
let lastFocus, cleanup;
function openTool(id) {
  const t = byId(id); if (!t) return;
  if (modal.classList.contains("open")) runCleanup();
  lastFocus = document.activeElement;
  $("#panelIcon").innerHTML = `<span class="ic">${t.icon}</span>`;
  $("#panelTitle").textContent = t.name; $("#panelDesc").textContent = t.desc;
  const body = $("#panelBody"); body.innerHTML = "";
  try { cleanup = t.render(body); }
  catch (err) { body.innerHTML = `<div class="status err">เกิดข้อผิดพลาด: ${esc(err.message)}</div>`; }
  modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("lock");
  history.replaceState(null, "", "#" + id);
  recent = [id, ...recent.filter(x => x !== id)].slice(0, 12); store.set("recent", recent);
  setTimeout(() => $(".close", modal).focus(), 50);
}
function runCleanup() { if (typeof cleanup === "function") { try { cleanup(); } catch {} } cleanup = null; }
function closeTool() {
  runCleanup();
  modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); document.body.classList.remove("lock");
  $("#panelBody").innerHTML = "";
  history.replaceState(null, "", cat === "all" ? location.pathname + location.search : "#c/" + cat);
  renderShelves();
  lastFocus?.focus();
}
$$("[data-close]", modal).forEach(el => el.onclick = closeTool);
addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("open")) closeTool(); });
const route = location.hash.slice(1);
if (route.startsWith("c/")) setCat(route.slice(2)); else renderGrid();
if (byId(route)) openTool(route);
addEventListener("hashchange", () => {
  const r = location.hash.slice(1);
  if (r.startsWith("c/")) { if (modal.classList.contains("open")) closeTool(); setCat(r.slice(2)); }
  else if (byId(r) && !modal.classList.contains("open")) openTool(r);
});

// ---------- PWA ----------
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
let installEvt;
addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); installEvt = e;
  $("#installBtn").classList.add("show"); $("#startBtn").style.display = "none";
});
$("#installBtn").onclick = async () => {
  if (!installEvt) return;
  installEvt.prompt(); await installEvt.userChoice; installEvt = null;
  $("#installBtn").classList.remove("show"); $("#startBtn").style.display = "";
};
