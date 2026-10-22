// Security & privacy tools — everything runs on WebCrypto in this tab: password strength check,
// passphrase text encryption (AES-GCM + PBKDF2), HMAC signing, and photo EXIF/GPS viewer & remover.

const b64 = {
  from: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))),
  to: (s) => Uint8Array.from(atob(s.replace(/\s+/g, "")), c => c.charCodeAt(0)),
};
const hexOf = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

// ---------- Password strength ----------
const COMMON_PW = "123456 123456789 12345678 password qwerty 111111 123123 abc123 1234567 password1 12345 iloveyou 000000 qwerty123 1q2w3e4r admin 654321 555555 lovely 7777777 welcome 888888 princess dragon 123qwe sunshine 666666 football monkey letmein 1qaz2wsx baseball master shadow superman asdfgh asdfghjkl zxcvbnm passw0rd trustno1 michael 112233 159753 147258 987654321 hello123 freedom whatever qazwsx ninja mustang".split(" ");
const SEQS = ["abcdefghijklmnopqrstuvwxyz", "qwertyuiopasdfghjklzxcvbnm", "01234567890", "1qaz2wsx3edc4rfv"];

function pwAnalyse(pw) {
  const notes = [];
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^\w\s฀-๿]/.test(pw) || /_/.test(pw)) pool += 33;
  if (/[฀-๿]/.test(pw)) pool += 70;
  if (/\s/.test(pw)) pool += 1;
  const len = [...pw].length;
  let bits = len * Math.log2(Math.max(pool, 1));
  const low = pw.toLowerCase();
  const leet = low.replace(/[@4]/g, "a").replace(/3/g, "e").replace(/[1!]/g, "i").replace(/0/g, "o").replace(/[$5]/g, "s").replace(/7/g, "t");
  if (COMMON_PW.includes(low) || COMMON_PW.includes(leet)) { bits = Math.min(bits, 4); notes.push("เป็นรหัสผ่านยอดนิยมที่ถูกเดาเป็นอันดับต้น ๆ"); }
  else if (COMMON_PW.some(c => c.length >= 5 && leet.includes(c))) { bits *= .55; notes.push("มีคำยอดนิยมอยู่ข้างใน เช่น password, qwerty"); }
  if (/(.)\1{2,}/.test(pw)) { bits *= .8; notes.push("มีตัวอักษรซ้ำติดกันหลายตัว"); }
  let seq = 0;
  for (const s of SEQS) for (let i = 0; i + 4 <= low.length; i++) { const p = low.slice(i, i + 4); if (s.includes(p) || [...s].reverse().join("").includes(p)) seq++; }
  if (seq) { bits *= Math.max(.5, 1 - seq * .1); notes.push("มีลำดับที่เดาง่าย เช่น abcd, 1234, qwer"); }
  if (/(19|20)\d{2}|25\d{2}/.test(pw)) { bits -= 6; notes.push("มีปี ค.ศ./พ.ศ. ซึ่งมักเดาจากวันเกิด"); }
  if (/^0[689]\d{8}$/.test(pw)) { bits = Math.min(bits, 20); notes.push("ดูเหมือนเบอร์โทรศัพท์"); }
  if (len < 8) notes.push("สั้นเกินไป — ควรยาวอย่างน้อย 12 ตัว");
  if (pool <= 26 && len < 16) notes.push("ผสมตัวพิมพ์ใหญ่ ตัวเลข หรือสัญลักษณ์เพิ่ม");
  bits = Math.max(0, bits);
  // Offline attack against a fast hash: ~1e10 guesses/second; average = half the space.
  const secs = Math.pow(2, bits) / 2 / 1e10;
  const level = bits < 28 ? 0 : bits < 45 ? 1 : bits < 65 ? 2 : bits < 90 ? 3 : 4;
  return { bits, secs, level, notes, pool, len };
}
function humanTime(s) {
  if (s < 1) return "ทันที";
  const U = [["ปี", 31557600], ["วัน", 86400], ["ชั่วโมง", 3600], ["นาที", 60], ["วินาที", 1]];
  if (s > 31557600 * 1e6) return "มากกว่าล้านปี";
  for (const [n, v] of U) if (s >= v) { const x = s / v; return (x >= 100 ? Math.round(x).toLocaleString("th-TH") : x.toFixed(x < 10 ? 1 : 0)) + " " + n; }
}

tool({
  id: "pw-strength", cat: "security", persist: false, fresh: true, icon: I.key, name: "ตรวจความแข็งแรงรหัสผ่าน",
  desc: "พิมพ์รหัสผ่านเพื่อดูว่าแฮกเกอร์ใช้เวลาเดานานแค่ไหน พร้อมจุดอ่อนที่ควรแก้ — ไม่มีการส่งข้อมูลออกนอกเครื่อง",
  keywords: "password strength checker รหัสผ่าน แข็งแรง ปลอดภัย crack time entropy",
  render(body) {
    const ui = h(`<div><div class="field"><label for="p">รหัสผ่าน</label><div class="row" style="margin-top:0;flex-wrap:nowrap"><input class="input" id="p" type="password" autocomplete="off" spellcheck="false" placeholder="พิมพ์รหัสผ่านที่ต้องการตรวจ"><button class="btn btn-ghost btn-sm" id="eye" type="button" aria-pressed="false" style="flex:none">แสดง</button></div></div>
      <div class="meter" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="stats-row" id="st"></div><ul class="note-list" id="notes"></ul>
      <p class="hint">ประเมินจากการเดาแบบออฟไลน์ ~10,000 ล้านครั้ง/วินาที · เคล็ดลับ: ใช้วลียาว ๆ หลายคำ และไม่ใช้รหัสซ้ำกับเว็บอื่น</p></div>`);
    body.append(ui);
    const inp = $("#p", ui), LV = ["อ่อนมาก", "อ่อน", "พอใช้", "แข็งแรง", "แข็งแรงมาก"];
    $("#eye", ui).onclick = (e) => { const show = inp.type === "password"; inp.type = show ? "text" : "password"; e.currentTarget.textContent = show ? "ซ่อน" : "แสดง"; e.currentTarget.setAttribute("aria-pressed", show); };
    inp.oninput = () => {
      const pw = inp.value, bars = $$(".meter i", ui);
      if (!pw) { bars.forEach(b => b.className = ""); $("#st", ui).innerHTML = ""; $("#notes", ui).innerHTML = `<li class="empty-hint" style="list-style:none"><b>ยังไม่มีรหัสผ่าน</b>พิมพ์ด้านบนเพื่อเริ่มตรวจ</li>`; return; }
      const r = pwAnalyse(pw);
      bars.forEach((b, i) => b.className = i <= r.level ? "on l" + r.level : "");
      $("#st", ui).innerHTML = `<div><b>${LV[r.level]}</b><span>ระดับ</span></div><div><b>${humanTime(r.secs)}</b><span>เวลาเดาโดยเฉลี่ย</span></div><div><b>${Math.round(r.bits)}</b><span>bits</span></div><div><b>${r.len}</b><span>ตัวอักษร</span></div>`;
      $("#notes", ui).innerHTML = (r.notes.length ? r.notes : ["ไม่พบจุดอ่อนที่ชัดเจน ✓"]).map(n => `<li>${esc(n)}</li>`).join("");
    };
    inp.oninput(); inp.focus();
  },
});

// ---------- Text encryption ----------
// Format: "LUM1." + base64(salt[16] | iv[12] | ciphertext+tag). PBKDF2-SHA256, 250k iterations → AES-256-GCM.
const ENC_PREFIX = "LUM1.", ENC_ITER = 250000;
async function deriveKey(pass, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ENC_ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptText(text, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deriveKey(pass, salt), new TextEncoder().encode(text));
  const all = new Uint8Array(28 + ct.byteLength); all.set(salt); all.set(iv, 16); all.set(new Uint8Array(ct), 28);
  return ENC_PREFIX + b64.from(all);
}
async function decryptText(data, pass) {
  const raw = b64.to(data.trim().replace(ENC_PREFIX, ""));
  if (raw.length < 29) throw new Error("bad");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(16, 28) }, await deriveKey(pass, raw.slice(0, 16)), raw.slice(28));
  return new TextDecoder().decode(pt);
}

tool({
  id: "text-encrypt", cat: "security", also: ["text"], persist: false, fresh: true, icon: I.key, name: "เข้ารหัส / ถอดรหัสข้อความ",
  desc: "ล็อกข้อความด้วยรหัสผ่าน (AES-256-GCM) ส่งผ่านแชตได้ปลอดภัย คนรับต้องรู้รหัสจึงอ่านได้",
  keywords: "encrypt decrypt aes เข้ารหัส ถอดรหัส ข้อความลับ secret message password",
  render(body) {
    const ui = h(`<div><div class="tabs" role="tablist"><button class="chip active" data-m="e" role="tab" aria-selected="true">เข้ารหัส</button><button class="chip" data-m="d" role="tab" aria-selected="false">ถอดรหัส</button></div>
      <div class="field"><label for="src" id="srcL">ข้อความ</label><textarea class="input" id="src" style="min-height:120px;font-family:var(--font-body)" placeholder="พิมพ์ข้อความลับ…"></textarea></div>
      <div class="field" style="margin-top:12px"><label for="pw">รหัสผ่าน</label><input class="input" id="pw" type="password" autocomplete="new-password" aria-describedby="pwN"><small class="field-msg" id="pwN">ส่งรหัสผ่านให้คนรับคนละช่องทางกับข้อความ</small></div>
      <div class="actions"><button class="btn btn-gold" id="go">เข้ารหัส</button></div>
      <div class="field" id="outW" hidden><label for="out" id="outL">ผลลัพธ์</label><textarea class="input" id="out" readonly style="min-height:110px"></textarea><div class="actions"><button class="btn btn-ghost btn-sm" id="cp">คัดลอก</button><button class="btn btn-ghost btn-sm" id="sh" hidden>แชร์</button></div></div></div>`);
    body.append(ui);
    let mode = "e";
    const setMode = (m) => {
      mode = m;
      $$("[data-m]", ui).forEach(b => { b.classList.toggle("active", b.dataset.m === m); b.setAttribute("aria-selected", b.dataset.m === m); });
      $("#srcL", ui).textContent = m === "e" ? "ข้อความ" : "ข้อความที่เข้ารหัสแล้ว (ขึ้นต้นด้วย LUM1.)";
      $("#src", ui).placeholder = m === "e" ? "พิมพ์ข้อความลับ…" : "LUM1.…";
      $("#go", ui).textContent = m === "e" ? "เข้ารหัส" : "ถอดรหัส";
      $("#outW", ui).hidden = true;
    };
    $$("[data-m]", ui).forEach(b => b.onclick = () => setMode(b.dataset.m));
    $("#src", ui).addEventListener("input", () => { if (mode === "e" && $("#src", ui).value.trim().startsWith(ENC_PREFIX)) setMode("d"); });
    $("#go", ui).onclick = async () => {
      const src = $("#src", ui).value, pw = $("#pw", ui).value, msg = $("#pwN", ui);
      msg.className = "field-msg";
      if (!src.trim()) { $("#src", ui).focus(); toast("ใส่ข้อความก่อน"); return; }
      if (!pw) { msg.className = "field-msg err"; msg.textContent = "ต้องใส่รหัสผ่าน"; $("#pw", ui).focus(); return; }
      $("#go", ui).disabled = true;
      try {
        const out = mode === "e" ? await encryptText(src, pw) : await decryptText(src, pw);
        $("#out", ui).value = out; $("#outL", ui).textContent = mode === "e" ? "ข้อความที่เข้ารหัสแล้ว" : "ข้อความต้นฉบับ"; $("#outW", ui).hidden = false;
        $("#sh", ui).hidden = !(mode === "e" && navigator.share);
        msg.textContent = mode === "e" ? (pw.length < 8 ? "รหัสผ่านสั้น — ควรยาว 8 ตัวขึ้นไป" : "ส่งรหัสผ่านให้คนรับคนละช่องทางกับข้อความ") : "ถอดรหัสสำเร็จ ✓";
        if (mode === "e" && pw.length < 8) msg.className = "field-msg warn";
      } catch {
        msg.className = "field-msg err"; msg.textContent = "ถอดรหัสไม่ได้ — รหัสผ่านผิด หรือข้อความไม่ครบ"; $("#outW", ui).hidden = true;
      } finally { $("#go", ui).disabled = false; }
    };
    $("#cp", ui).onclick = () => copy($("#out", ui).value);
    $("#sh", ui).onclick = () => navigator.share({ text: $("#out", ui).value }).catch(() => {});
  },
});

// ---------- HMAC ----------
tool({
  id: "hmac", cat: "security", also: ["dev"], persist: false, fresh: true, icon: I.hash, name: "HMAC Generator",
  desc: "สร้างลายเซ็น HMAC (SHA-1/256/384/512) เป็น hex หรือ Base64 สำหรับทดสอบ webhook และ API",
  keywords: "hmac sha256 signature webhook api secret key ลายเซ็น",
  render(body) {
    const ui = h(`<div><div class="field"><label for="msg">ข้อความ</label><textarea class="input" id="msg" style="min-height:90px"></textarea></div>
      <div class="row" style="align-items:flex-start"><div class="field"><label for="key">Secret key</label><input class="input" id="key" autocomplete="off" spellcheck="false"></div><div class="field" style="max-width:170px"><label for="alg">อัลกอริทึม</label><select class="input" id="alg"><option>SHA-256</option><option>SHA-384</option><option>SHA-512</option><option>SHA-1</option></select></div></div>
      <div class="kv" id="kv" style="margin-top:16px"></div></div>`);
    body.append(ui);
    const run = async () => {
      const key = $("#key", ui).value, msg = $("#msg", ui).value;
      if (!key) { $("#kv", ui).innerHTML = `<div class="empty-hint" style="grid-column:1/-1"><b>ยังไม่มี secret key</b>ใส่ key เพื่อสร้างลายเซ็น</div>`; return; }
      const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: $("#alg", ui).value }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
      const rows = [["Hex", hexOf(sig)], ["Base64", b64.from(sig)]];
      $("#kv", ui).innerHTML = rows.map(([n, v]) => `<span>${n}</span><code style="word-break:break-all;font-size:.85rem">${v}</code><button class="btn btn-ghost btn-sm" data-v="${v}">คัดลอก</button>`).join("");
      $$("[data-v]", ui).forEach(b => b.onclick = () => copy(b.dataset.v));
    };
    $$("input,textarea,select", ui).forEach(e => e.oninput = run);
    run();
  },
});

// ---------- EXIF viewer & remover ----------
const EXIF_TAGS = { 0x010F: "ยี่ห้อกล้อง", 0x0110: "รุ่น", 0x0131: "ซอฟต์แวร์", 0x0132: "แก้ไขล่าสุด", 0x0112: "การหมุน", 0x013B: "ผู้สร้าง", 0x8298: "ลิขสิทธิ์",
  0x9003: "วันที่ถ่าย", 0x829A: "ความเร็วชัตเตอร์", 0x829D: "รูรับแสง", 0x8827: "ISO", 0x920A: "ทางยาวโฟกัส", 0xA434: "เลนส์", 0xA002: "กว้าง", 0xA003: "สูง" };

function parseExif(buf) {
  const d = new DataView(buf), out = { tags: {}, gps: null, orientation: 1 };
  if (d.getUint16(0) !== 0xFFD8) return out;
  let p = 2;
  while (p + 4 < d.byteLength) {
    const m = d.getUint16(p), len = d.getUint16(p + 2);
    if (m === 0xFFDA || (m & 0xFF00) !== 0xFF00) break;
    if (m === 0xFFE1 && d.getUint32(p + 4) === 0x45786966) { readTiff(d, p + 10, out); break; }
    p += 2 + len;
  }
  return out;
}
function readTiff(d, t, out) {
  const le = d.getUint16(t) === 0x4949;
  const u16 = (o) => d.getUint16(t + o, le), u32 = (o) => d.getUint32(t + o, le), s32 = (o) => d.getInt32(t + o, le);
  const SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  const val = (e) => {
    const type = u16(e + 2), n = u32(e + 4), size = (SZ[type] || 1) * n, at = size > 4 ? u32(e + 8) : e + 8;
    if (t + at + size > d.byteLength) return null;
    const one = (i) => type === 3 ? u16(at + i * 2) : type === 4 ? u32(at + i * 4) : type === 9 ? s32(at + i * 4)
      : type === 5 ? u32(at + i * 8) / (u32(at + i * 8 + 4) || 1) : type === 10 ? s32(at + i * 8) / (s32(at + i * 8 + 4) || 1) : d.getUint8(t + at + i);
    if (type === 2) { let s = ""; for (let i = 0; i < n; i++) { const c = d.getUint8(t + at + i); if (!c) break; s += String.fromCharCode(c); } return s.trim(); }
    if (type === 7) return null;
    return n === 1 ? one(0) : Array.from({ length: Math.min(n, 8) }, (_, i) => one(i));
  };
  const ifd = (off, fn) => { if (!off || t + off + 2 > d.byteLength) return; const n = u16(off); for (let i = 0; i < n; i++) { const e = off + 2 + i * 12; if (t + e + 12 > d.byteLength) return; fn(u16(e), e); } };
  let exifOff = 0, gpsOff = 0;
  const take = (tag, e) => {
    if (tag === 0x8769) exifOff = u32(e + 8); else if (tag === 0x8825) gpsOff = u32(e + 8);
    else if (EXIF_TAGS[tag]) { const v = val(e); if (v !== null && v !== "") out.tags[tag] = v; }
  };
  ifd(u32(4), take); ifd(exifOff, take);
  if (out.tags[0x0112]) out.orientation = out.tags[0x0112];
  const g = {}; ifd(gpsOff, (tag, e) => { g[tag] = val(e); });
  const dms = (a) => Array.isArray(a) && a.length >= 3 ? a[0] + a[1] / 60 + a[2] / 3600 : null;
  const lat = dms(g[2]), lon = dms(g[4]);
  if (lat !== null && lon !== null && (lat || lon)) out.gps = { lat: g[1] === "S" ? -lat : lat, lon: g[3] === "W" ? -lon : lon, alt: typeof g[6] === "number" ? g[6] : null };
}
function fmtExif(tag, v) {
  if (tag === 0x829A) return v >= 1 ? v + " วินาที" : "1/" + Math.round(1 / v) + " วินาที";
  if (tag === 0x829D) return "f/" + (+v).toFixed(1);
  if (tag === 0x920A) return (+v).toFixed(0) + " mm";
  if (tag === 0x0112) return ["", "ปกติ", "กลับซ้ายขวา", "หมุน 180°", "กลับบนล่าง", "", "หมุน 90°", "", "หมุน 270°"][v] || v;
  return Array.isArray(v) ? v.join(", ") : String(v);
}
// Lossless: drop APP1 (EXIF/XMP), APP13 (IPTC) and COM segments; image data is copied untouched.
function stripJpeg(buf) {
  const d = new DataView(buf), parts = [new Uint8Array(buf, 0, 2)];
  let p = 2;
  while (p + 4 <= d.byteLength) {
    const m = d.getUint16(p);
    if (m === 0xFFDA || (m & 0xFF00) !== 0xFF00) { parts.push(new Uint8Array(buf, p)); break; }
    const len = d.getUint16(p + 2);
    if (m !== 0xFFE1 && m !== 0xFFED && m !== 0xFFFE) parts.push(new Uint8Array(buf, p, 2 + len));
    p += 2 + len;
  }
  return new Blob(parts, { type: "image/jpeg" });
}
function stripPng(buf) {
  const d = new DataView(buf), parts = [new Uint8Array(buf, 0, 8)], drop = ["eXIf", "tEXt", "iTXt", "zTXt", "tIME"];
  let p = 8;
  while (p + 12 <= d.byteLength) {
    const len = d.getUint32(p), type = String.fromCharCode(...new Uint8Array(buf, p + 4, 4));
    if (!drop.includes(type)) parts.push(new Uint8Array(buf, p, 12 + len));
    p += 12 + len;
    if (type === "IEND") break;
  }
  return new Blob(parts, { type: "image/png" });
}
async function stripMeta(file, info) {
  const buf = await file.arrayBuffer();
  const isJpg = new DataView(buf).getUint16(0) === 0xFFD8, isPng = new DataView(buf).getUint32(0) === 0x89504E47;
  // A rotated phone photo depends on the orientation tag; re-encode so it stays upright without it.
  if (isJpg && info.orientation === 1) return stripJpeg(buf);
  if (isPng) return stripPng(buf);
  const img = await loadImage(file), c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d").drawImage(img, 0, 0);
  URL.revokeObjectURL(img.src);
  return canvasBlob(c, file.type === "image/webp" ? "image/webp" : "image/jpeg", .95);
}

tool({
  id: "exif", cat: "security", also: ["image"], fresh: true, icon: I.scan, name: "ดู & ลบข้อมูลตำแหน่งในรูป (EXIF/GPS)",
  desc: "รูปจากมือถือมักแอบเก็บพิกัด GPS วันเวลา และรุ่นกล้อง ตรวจดูแล้วลบออกก่อนโพสต์หรือส่งให้คนอื่น",
  keywords: "exif gps location metadata ลบตำแหน่ง พิกัด รูป privacy ความเป็นส่วนตัว remove strip",
  render(body) {
    const list = h(`<div class="out"></div>`), acts = h(`<div class="actions" hidden><button class="btn btn-gold" id="all">ลบข้อมูลทั้งหมดแล้วดาวน์โหลด</button></div>`), st = h(`<div class="status" aria-live="polite"></div>`);
    let items = [];
    body.append(dropZone({ accept: "image/jpeg,image/png,image/webp", multiple: true, title: "เลือกรูป (JPG, PNG, WebP)", hint: "เลือกได้หลายรูป · ไม่มีการอัปโหลด" }, async (files) => {
      items = [];
      for (const f of files) items.push({ file: f, info: parseExif(await f.arrayBuffer()) });
      draw();
    }), list, acts, st);
    const draw = () => {
      acts.hidden = !items.length;
      const gpsN = items.filter(i => i.info.gps).length;
      setStatus(st, items.length ? (gpsN ? `⚠ พบพิกัด GPS ใน ${gpsN} รูป — คนที่ได้รูปไปจะรู้ตำแหน่งที่ถ่าย` : "ไม่พบพิกัด GPS ✓") : "", gpsN > 0);
      list.innerHTML = items.map((it, k) => {
        const t = it.info.tags, keys = Object.keys(t);
        const g = it.info.gps;
        return `<div class="glass" style="padding:14px;border-radius:var(--radius-lg)"><div class="file-item" style="border:0;padding:0;background:none"><img src="${URL.createObjectURL(it.file)}" alt=""><div class="meta"><b>${esc(it.file.name)}</b><small>${fmtSize(it.file.size)} · ${keys.length + (g ? 1 : 0)} รายการข้อมูลแฝง</small></div><button class="btn btn-ghost btn-sm" data-one="${k}">ลบแล้วโหลด</button></div>
          ${g ? `<div class="callout" style="margin-top:12px"><span class="ic" aria-hidden="true">${I.globe}</span><div><b>พิกัด GPS: ${g.lat.toFixed(6)}, ${g.lon.toFixed(6)}</b><span>${g.alt !== null ? `ความสูง ${g.alt.toFixed(0)} ม. · ` : ""}คนที่ได้รูปนี้รู้ได้ว่าถ่ายที่ไหน</span><a href="https://www.google.com/maps?q=${g.lat},${g.lon}" target="_blank" rel="noopener" style="color:var(--color-accent);text-decoration:underline;justify-self:start">ดูตำแหน่งบนแผนที่</a></div></div>` : ""}
          ${keys.length ? `<div class="kv" style="margin-top:12px">${keys.map(x => `<span>${EXIF_TAGS[x]}</span><code style="text-align:right">${esc(fmtExif(+x, t[x]))}</code><span></span>`).join("")}</div>` : `<p class="hint">ไม่พบข้อมูล EXIF</p>`}</div>`;
      }).join("");
      $$("[data-one]", list).forEach(b => b.onclick = async () => { const it = items[+b.dataset.one]; download(await stripMeta(it.file, it.info), it.file.name.replace(/(\.[^.]+)?$/, "-clean$1")); toast("ลบข้อมูลแฝงแล้ว ✓"); });
    };
    $("#all", acts).onclick = async () => {
      setStatus(st, "กำลังลบข้อมูล…");
      const out = [];
      for (const it of items) out.push({ blob: await stripMeta(it.file, it.info), name: it.file.name.replace(/(\.[^.]+)?$/, "-clean$1") });
      if (out.length === 1) download(out[0].blob, out[0].name);
      else download(await zipBlob(out), "photos-clean.zip");
      setStatus(st, `ลบข้อมูลแฝงจาก ${out.length} รูปแล้ว ✓ ไฟล์ใหม่ไม่มีพิกัดหรือข้อมูลกล้อง`);
    };
  },
});
