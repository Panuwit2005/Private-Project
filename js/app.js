// Lumière Tools — shared helpers, icons and tool registry.
// Each file in js/tools/ calls tool({...}) to register itself; js/main.js renders the UI.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtSize = (b) => b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(2) + " MB";
const baseName = (n) => n.replace(/\.[^.]+$/, "");
const tick = () => new Promise(r => setTimeout(r, 0));
const pad = (n, l = 2) => String(n).padStart(l, "0");
const num = (v) => { const n = parseFloat(String(v).replace(/,/g, "")); return isNaN(n) ? 0 : n; };
const money = (n, d = 2) => n.toLocaleString("th-TH", { minimumFractionDigits: d, maximumFractionDigits: d });

// localStorage wrapper that never throws (private mode, blocked storage)
const store = {
  get(k, def) { try { const v = localStorage.getItem("lumiere:" + k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem("lumiere:" + k, JSON.stringify(v)); } catch {} },
};

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 3500); // 3–5 s, long enough to read
}
function download(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  toast("บันทึก " + name);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("คัดลอกแล้ว ✓"); }
  catch {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("คัดลอกแล้ว ✓"); } catch { toast("คัดลอกไม่สำเร็จ"); }
    ta.remove();
  }
}

// Libraries live in /vendor so the site works offline and needs no CDN.
const LIB = {
  lame: "vendor/lame.min.js",
  jspdf: "vendor/jspdf.umd.min.js",
  qr: "vendor/qrcode.js",
  pdflib: "vendor/pdf-lib.min.js",
  jsqr: "vendor/jsQR.js",
  marked: "vendor/marked.min.js",
  pdfjs: "vendor/pdf.min.js",
  jszip: "vendor/jszip.min.js",
  xlsx: "vendor/xlsx.full.min.js",
  mammoth: "vendor/mammoth.browser.min.js",
  gifenc: "vendor/gifenc.js",
  heic: "vendor/heic2any.min.js",
  yaml: "vendor/js-yaml.min.js",
  html2canvas: "vendor/html2canvas.min.js",
  supabase: "vendor/supabase.min.js",
};
const loaded = {};
function loadScript(src) {
  return loaded[src] ||= new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src; s.onload = res;
    s.onerror = () => { delete loaded[src]; rej(new Error("โหลดไลบรารีไม่สำเร็จ")); };
    document.head.appendChild(s);
  });
}

// Supabase (cloud database + login). The publishable key is safe in the browser;
// access is controlled by Row Level Security policies on each table.
// Never put the secret / service_role key here.
const SUPABASE_URL = "https://tqffjnpqousdfeoetrus.supabase.co";
const SUPABASE_KEY = "sb_publishable_9AH1AZV0yW0AADVoyXtEAw_eoM6JJEW";
let sbClient;
async function cloud() {
  if (sbClient) return sbClient;
  await loadScript(LIB.supabase);
  return sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: "pkce" } }); // PKCE returns ?code=, leaving the hash router alone
}

function dropZone({ accept, multiple = false, title, hint }, onFiles) {
  const el = h(`<label class="drop">
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"/></svg>
    <b>${title}</b><small>${hint}</small>
    <input type="file" accept="${accept}" ${multiple ? "multiple" : ""} />
  </label>`);
  const input = $("input", el);
  input.addEventListener("change", () => { if (input.files.length) onFiles([...input.files]); input.value = ""; });
  ["dragenter", "dragover"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.remove("over"); }));
  el.addEventListener("drop", e => { const f = [...e.dataTransfer.files]; if (f.length) onFiles(multiple ? f : [f[0]]); });
  return el;
}
function loadImage(file) {
  return new Promise((res, rej) => {
    const img = new Image(); img.onload = () => res(img);
    img.onerror = () => rej(new Error("เปิดไฟล์ภาพไม่ได้: " + file.name));
    img.src = URL.createObjectURL(file);
  });
}
const canvasBlob = (c, type = "image/png", q = .92) => new Promise(r => c.toBlob(r, type, q));
function setStatus(el, msg, err = false) { el.className = "status" + (err ? " err" : ""); el.textContent = msg; }

// ---------- Icons (24px stroke paths) ----------
const icon = (d) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  image: icon('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  resize: icon('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
  crop: icon('<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/>'),
  stamp: icon('<path d="M5 22h14M19 15H5l1-4h12zM9 11V7a3 3 0 1 1 6 0v4"/>'),
  drop: icon('<path d="M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0z"/>'),
  music: icon('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  scissors: icon('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>'),
  mic: icon('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>'),
  monitor: icon('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  speaker: icon('<path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
  ear: icon('<path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"/>'),
  play: icon('<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>'),
  film: icon('<rect x="2" y="2" width="20" height="20" rx="2.5"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>'),
  pdf: icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>'),
  merge: icon('<path d="m8 6 4-4 4 4M12 2v10.3a4 4 0 0 1-1.2 2.8L4 22M20 22l-5-5"/>'),
  split: icon('<path d="M16 3h5v5M8 3H3v5M12 22v-8.3a4 4 0 0 0-1.2-2.8L3 3M21 3l-7.8 7.8"/>'),
  md: icon('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 15V9l3 3 3-3v6M17 9v6M15 13l2 2 2-2"/>'),
  table: icon('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>'),
  text: icon('<path d="M4 7V4h16v3M9 20h6M12 4v16"/>'),
  diff: icon('<path d="M12 3v14M5 10h14M5 21h14"/>'),
  replace: icon('<path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/>'),
  list: icon('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  baht: icon('<path d="M8 4v16M8 4h5a3.5 3.5 0 0 1 0 7H8h6a4 4 0 0 1 0 8H8M11 2v20"/>'),
  code: icon('<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>'),
  binary: icon('<rect x="3" y="4" width="6" height="7" rx="2"/><rect x="15" y="13" width="6" height="7" rx="2"/><path d="M15 4h3v7M3 13h3v7M6 20H3M18 11h-3"/>'),
  link: icon('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  hash: icon('<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>'),
  id: icon('<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/>'),
  clock: icon('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  regex: icon('<path d="M17 3v10M12.7 5.5l8.6 5M12.7 10.5l8.6-5"/><rect x="3" y="15" width="6" height="6" rx="1"/>'),
  key: icon('<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"/>'),
  calc: icon('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>'),
  percent: icon('<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>'),
  receipt: icon('<path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  bank: icon('<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-7 10 7z"/>'),
  heart: icon('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>'),
  cake: icon('<path d="M20 21V12a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9M4 16s1.5-1 4-1 3 2 4 2 2.5-2 4-2 4 1 4 1M2 21h20M12 10V7M12 4h.01"/>'),
  user: icon('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  users: icon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
  ruler: icon('<path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4zM7.5 10.5l2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/>'),
  note: icon('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  check: icon('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
  timer: icon('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>'),
  globe: icon('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>'),
  dice: icon('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>'),
  wheel: icon('<circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1"/>'),
  tally: icon('<path d="M4 4v16M9 4v16M14 4v16M19 4v16M2 18 21 6"/>'),
  qr: icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>'),
  scan: icon('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>'),
  palette: icon('<path d="M12 22a10 10 0 1 1 10-10c0 3-2.5 4-4.5 4H15a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16.5" cy="10.5" r="1"/>'),
  calendar: icon('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  home: icon('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  tools: icon('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
  search: icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  sparkle: icon('<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>'),
  convert: icon('<path d="M4 7h13l-3-3M20 17H7l3 3"/><rect x="2" y="10" width="6" height="4" rx="1"/><rect x="16" y="10" width="6" height="4" rx="1"/>'),
  clapper: icon('<path d="M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8H4z"/><path d="m4 11-.9-3.5a2 2 0 0 1 1.4-2.4l11.6-3a2 2 0 0 1 2.4 1.4L19.4 7 4 11zM6.2 6.2l3.1 3.9M12.4 4.6l3.1 3.9"/>'),
  trend: icon('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/><path d="M15 7h5v5"/>'),
  scroll: icon('<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M10 8h6M10 12h6"/>'),
  captions: icon('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M7 15h4M15 15h2M7 11h2M13 11h4"/>'),
  thumb: icon('<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M6 14l3-3 2 2 4-4 3 3"/><path d="M8 21h8"/>'),
  ratio: icon('<rect x="3" y="6" width="18" height="12" rx="2"/><rect x="9" y="3" width="6" height="18" rx="1.5"/>'),
  hashtag: icon('<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>'),
  board: icon('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h6M9 13h6M15 7h6"/>'),
  pie: icon('<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>'),
  avg: icon('<path d="M3 17l6-6 4 4 8-8"/><path d="M3 21h18"/><circle cx="9" cy="11" r="1.5"/><circle cx="13" cy="15" r="1.5"/>'),
  coins: icon('<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18"/><path d="M7 6h1v4M16.7 13.9l.7.7-2.8 2.8"/>'),
  target: icon('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  scale: icon('<path d="M12 3v18M7 21h10M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0zM5 7h14M12 3l-7 4M12 3l7 4"/>'),
  growth: icon('<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>'),
  gem: icon('<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l4 12 4-12-3-6M2 9h20"/>'),
  sign: icon('<path d="M20 19H4M15.5 4.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>'),
  grid: icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  bolt: icon('<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>'),
  fuel: icon('<path d="M3 22h12M4 9h10M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.8a2 2 0 0 0-.6-1.4L18 5"/>'),
  school: icon('<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>'),
  team: icon('<circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 21v-1a6 6 0 0 1 12 0v1M15 21v-1a4 4 0 0 1 6-3.5"/>'),
  base: icon('<path d="M4 7h3v10H4M17 7h3v10h-3M10 17l4-10"/>'),
  pages: icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M10 17h4"/>'),
  star: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z"/></svg>',
};

// ---------- Registry ----------
// Categories in display order. To add a category: add an entry here, create js/tools/<id>.js,
// list that file in index.html and sw.js, then register tools with cat: "<id>".
const CATS = [
  { id: "convert", name: "แปลงไฟล์", icon: I.convert, desc: "แปลงนามสกุลไฟล์ทุกชนิด รูป HEIC เสียง วิดีโอ PDF Excel Word ZIP และ GIF" },
  { id: "money", name: "เงิน & เอกสารธุรกิจ", icon: I.receipt, desc: "QR พร้อมเพย์ หารค่าทริป ใบเสร็จ ใบแจ้งหนี้ และใบเสนอราคา" },
  { id: "creator", name: "ช่วยทำคลิป", icon: I.clapper, desc: "สคริปต์ เทเลพรอมป์เตอร์ ซับไตเติล ภาพปก และวางแผนคอนเทนต์" },
  { id: "invest", name: "พอร์ตหุ้น & ลงทุน", icon: I.trend, desc: "ติดตามพอร์ต ถัวเฉลี่ย ปันผล ค่าธรรมเนียม และขนาดสถานะ" },
  { id: "image", name: "รูปภาพ", icon: I.image, desc: "แปลง บีบอัด ครอป ลายน้ำ และจัดการรูปภาพ" },
  { id: "media", name: "เสียง & วิดีโอ", icon: I.music, desc: "แปลงเสียง ตัดเสียง อัดเสียง/หน้าจอ และเสียงพูด" },
  { id: "docs", name: "PDF & เอกสาร", icon: I.pdf, desc: "สร้าง รวม แยก และแก้ไข PDF รวมถึงเอกสารอื่น ๆ" },
  { id: "text", name: "ข้อความ", icon: I.text, desc: "นับคำ แก้พิมพ์ผิดภาษา คำอ่านบาท และจัดการข้อความ" },
  { id: "calc", name: "คำนวณ", icon: I.calc, desc: "เงิน ภาษี สุขภาพ วันที่ หน่วย และเครื่องคิดเลข" },
  { id: "daily", name: "ประจำวัน", icon: I.check, desc: "โน้ต งาน ตั้งเวลา สุ่ม QR และเครื่องมือใช้ทุกวัน" },
  { id: "dev", name: "นักพัฒนา", icon: I.code, desc: "JSON, Base64, Hash, Regex และเครื่องมือโปรแกรมเมอร์" },
];
CATS.push(
  { id: "security", name: "ความปลอดภัย & ส่วนตัว", icon: I.key, desc: "รหัสผ่าน เข้ารหัสข้อความ ลบตำแหน่ง GPS ในรูป และปิดบังข้อมูลก่อนส่ง" },
  { id: "web", name: "เว็บ & SEO", icon: I.globe, desc: "meta tag, OGP, robots.txt, sitemap, IP/CIDR, โดเมนภาษาไทย และรหัสสถานะ HTTP" },
  { id: "fun", name: "เกม & สนุก", icon: I.dice, desc: "สุ่ม จับฉลาก วงล้อ ทดสอบความเร็วพิมพ์ และเวลาตอบสนอง" },
);
const catById = (id) => CATS.find(c => c.id === id);

// ---------- Sections ----------
// Top level of the site. "tools" is built in; a future section (movies, football, embeds…) registers
// itself with section({ id, name, icon, desc, stats?(), render(el) }) and gets a home card, a nav tab
// and the route #/<id> automatically.
const SECTIONS = [];
function section(def) { SECTIONS.push(def); }
const TOOLS = [];
// def: { id, cat, also?: [extra category ids], icon, name, desc, keywords, render(body) }
// render(body) builds the UI; it may return a cleanup function called when the tool closes.
function tool(def) { TOOLS.push(def); }
const inCat = (t, id) => t.cat === id || (t.also || []).includes(id);
