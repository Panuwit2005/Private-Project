// Home screen: shelves (pinned / recent), category filters, search, tool modal, PWA install.

const grid = $("#grid"), filters = $("#filters"), q = $("#q"), shelves = $("#shelves");
let cat = "ทั้งหมด";
let pins = store.get("pins", []);
let recent = store.get("recent", []);
const byId = (id) => TOOLS.find(t => t.id === id);

$("#toolCount").textContent = TOOLS.length;

filters.innerHTML = ["ทั้งหมด", ...CATS].map(c => `<button class="chip${c === cat ? " active" : ""}">${c}</button>`).join("");
filters.addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  cat = b.textContent; $$(".chip", filters).forEach(x => x.classList.toggle("active", x === b)); renderGrid();
});

function card(t, i) {
  const pinned = pins.includes(t.id);
  return `<div class="tool-card glass" data-id="${t.id}" role="button" tabindex="0" style="animation-delay:${Math.min(i, 20) * 30}ms">
    <button class="star${pinned ? " on" : ""}" data-pin="${t.id}" aria-label="${pinned ? "เลิกปักหมุด" : "ปักหมุด"}">${I.star}</button>
    <span class="cat">${t.cat}</span><span class="ic">${t.icon}</span>
    <h3>${t.name}</h3><p>${t.desc}</p><span class="go">เปิดเครื่องมือ →</span>
  </div>`;
}
function mini(t) { return `<button class="mini glass" data-id="${t.id}"><span class="ic">${t.icon}</span>${t.name}</button>`; }

function renderShelves() {
  const p = pins.map(byId).filter(Boolean), r = recent.map(byId).filter(Boolean).slice(0, 8);
  shelves.innerHTML =
    (p.length ? `<div class="shelf"><h2><span class="gold">★</span> ปักหมุด</h2><div class="mini-row">${p.map(mini).join("")}</div></div>` : "") +
    (r.length ? `<div class="shelf"><h2>ใช้ล่าสุด <small>เก็บไว้ในเครื่องนี้เท่านั้น</small></h2><div class="mini-row">${r.map(mini).join("")}</div></div>` : "");
}
function renderGrid() {
  const term = q.value.trim().toLowerCase();
  const list = TOOLS.filter(t => (cat === "ทั้งหมด" || t.cat === cat) &&
    (!term || (t.name + t.desc + (t.keywords || "") + t.cat).toLowerCase().includes(term)));
  $("#count").textContent = `${list.length} เครื่องมือ`;
  grid.innerHTML = list.length ? list.map(card).join("") : `<div class="empty">ไม่พบเครื่องมือที่ตรงกับ “${esc(q.value)}”</div>`;
}
q.addEventListener("input", renderGrid);
renderShelves(); renderGrid();

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
  history.replaceState(null, "", location.pathname + location.search);
  renderShelves();
  lastFocus?.focus();
}
$$("[data-close]", modal).forEach(el => el.onclick = closeTool);
addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("open")) closeTool(); });
if (location.hash && byId(location.hash.slice(1))) openTool(location.hash.slice(1));

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
