// Assistive features that span the whole site:
//  • Smart Paste — look at pasted text, guess what it is and offer the right tool (often with the answer inline).
//  • Backup & restore — every lumiere:* key in localStorage exported to / imported from one JSON file.

// ---------- Smart Paste ----------
// Each detector returns suggestions: { tool, title, preview?, prefill? } where prefill is
// { pre: [selectors to click first], fields: { id: value }, post: [selectors to click after] }.
const isAsciiTypo = (s) => {
  if (!/^[\x20-\x7e]{3,}$/.test(s) || !/[a-z]/i.test(s)) return false;
  const words = s.trim().split(/\s+/);
  // Thai typed on an English layout uses ; ' [ ] , . / inside words and rarely forms vowel-bearing words.
  const odd = words.filter(w => /[a-z][;'\[\],.\/\\]|[;'\[\]\\][a-z]/i.test(w) || (w.length >= 4 && !/[aeiouy]/i.test(w))).length;
  return odd / words.length >= .5;
};
function detect(raw) {
  const s = raw.trim(), out = [];
  if (!s) return out;
  const one = !/\n/.test(s), digits = s.replace(/[\s-]/g, "");
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]*$/.test(s)) out.push({ tool: "jwt", title: "ถอดรหัส JWT", prefill: { fields: { t: s } } });
  if (/^[\[{]/.test(s)) { try { JSON.parse(s); out.push({ tool: "json", title: "จัดรูปแบบ JSON", prefill: { fields: { t: s }, post: ['[data-a="pretty"]'] } }, { tool: "data-convert", title: "แปลง JSON เป็น YAML / CSV / Excel" }); } catch {} }
  if (one && /(?:youtube\.com\/(?:watch|shorts|live|embed)|youtu\.be\/)/i.test(s)) out.push({ tool: "yt-thumb", title: "ดูภาพปกคลิป YouTube", prefill: { fields: { u: s }, post: ["#go"] } });
  if (one && /^https?:\/\/\S+$/i.test(s)) out.push({ tool: "qr", title: "ทำลิงก์นี้เป็น QR Code", prefill: { fields: { t: s } } }, { tool: "url-enc", title: "แยกส่วนประกอบ / ถอดรหัสลิงก์", prefill: { fields: { t: s } } });
  if (one && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s)) out.push({ tool: "link-maker", title: "สร้างลิงก์ส่งอีเมลถึงที่อยู่นี้", prefill: { pre: ['[data-t="mail"]'], fields: { a: s } } });
  if (/^0[689]\d{8}$/.test(digits) || /^0[2-7]\d{7}$/.test(digits)) {
    if (/^0[689]/.test(digits)) out.push({ tool: "promptpay", title: "สร้าง QR พร้อมเพย์จากเบอร์นี้", prefill: { fields: { ppid: digits } } }, { tool: "link-maker", title: "เปิดแชต WhatsApp กับเบอร์นี้", prefill: { pre: ['[data-t="wa"]'], fields: { a: digits } } });
    out.push({ tool: "link-maker", title: "สร้างลิงก์โทรออก", prefill: { pre: ['[data-t="tel"]'], fields: { a: digits } } });
  }
  if (/^\d{13}$/.test(digits)) out.push({ tool: "promptpay", title: "สร้าง QR พร้อมเพย์จากเลขนี้", preview: thaiIdValid(digits) ? "เลข 13 หลักนี้ผ่านการตรวจสอบหลักสุดท้าย ✓" : "เลข 13 หลักนี้ไม่ผ่านการตรวจสอบหลักสุดท้าย ⚠", prefill: { fields: { ppid: digits } } });
  if (/^#?[0-9a-f]{6}$/i.test(s) && /[a-f]/i.test(s) || /^#[0-9a-f]{6}$/i.test(s)) out.push({ tool: "color", title: "ดูค่าสีและพาเลต", prefill: { fields: { hex: s.startsWith("#") ? s : "#" + s } } });
  if (/^\d{10}(\d{3})?$/.test(s) && +s.slice(0, 10) > 9e8 && +s.slice(0, 10) < 25e8 && !(s.length === 13 && thaiIdValid(s))) out.push({ tool: "timestamp", title: "แปลง Unix timestamp", preview: new Date(s.length > 11 ? +s : s * 1000).toLocaleString("th-TH", { dateStyle: "full", timeStyle: "medium" }), prefill: { fields: { ts: s } } });
  const dm = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/) || s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dm) {
    let [y, m, d] = s.includes("-") && dm[1].length === 4 ? [+dm[1], +dm[2], +dm[3]] : [+dm[3], +dm[2], +dm[1]];
    if (y > 2400) y -= 543;
    const iso = `${y}-${pad(m)}-${pad(d)}`, dt = new Date(iso + "T00:00");
    if (!isNaN(dt)) out.push({ tool: "thai-date", title: "แสดงเป็นวันที่ภาษาไทย", preview: dt.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), prefill: { fields: { d: iso } } }, { tool: "date-calc", title: "นับวันจากวันนี้", prefill: { fields: { a: iso } } });
  }
  if (!out.length && one && /^[\d\s.,()+\-*/×÷^%√]+$/.test(s) && /\d\s*[-+*/×÷^%]\s*[\d(√]/.test(s)) { try { const v = evaluate(s); if (Number.isFinite(v)) out.push({ tool: "calculator", title: "ผลลัพธ์", preview: `${s} = ${nice(v)}`, copy: String(+v.toPrecision(12)) }); } catch {} }
  else if (/^[฿$]?\s*\d{1,3}(,\d{3})*(\.\d+)?\s*(บาท)?$|^[฿$]?\s*\d+(\.\d+)?\s*(บาท)?$/.test(s) && !out.length) {
    const n = s.replace(/[^\d.]/g, "");
    out.push({ tool: "baht-text", title: "อ่านเป็นตัวอักษรไทย", preview: bahtText(n), copy: bahtText(n), prefill: { fields: { n } } }, { tool: "vat", title: "คิด VAT 7% / หัก ณ ที่จ่าย", prefill: { fields: { a: n } } }, { tool: "promptpay", title: "สร้าง QR พร้อมเพย์ยอดนี้", prefill: { fields: { ppamt: n } } });
  }
  if (/\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(s)) out.push({ tool: "subtitles", title: "แก้ไข / เลื่อนเวลาซับไตเติลนี้", prefill: { pre: ['[data-m="edit"]'], fields: { in: s } } });
  if (one && s.length >= 16 && s.length % 4 === 0 && /^[A-Za-z0-9+/]+=*$/.test(s) && !/^\d+$/.test(s)) {
    try { const t = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(s), c => c.charCodeAt(0))); if (/^[\P{C}\s]+$/u.test(t)) out.push({ tool: "base64", title: "ถอดรหัส Base64", preview: t.slice(0, 120), copy: t }); } catch {}
  }
  if (!out.length && !/:\/\/|@|^www\./i.test(s) && isAsciiTypo(s)) { const th = [...s].map(c => EN2TH[c] ?? c).join(""); out.push({ tool: "kb-fix", title: "ลืมเปลี่ยนภาษา? แปลงเป็นภาษาไทย", preview: th, copy: th, prefill: { fields: { t: s } } }); }
  if (!out.length && (s.length >= 25 || /\n/.test(s) || /[฀-๿]{6,}/.test(s))) {
    out.push({ tool: "text", title: "นับคำและตัวอักษร", preview: `${wordCount(s).toLocaleString()} คำ · ${[...s].length.toLocaleString()} ตัวอักษร`, prefill: { fields: { t: s } } }, { tool: "caption-check", title: "เช็กความยาวแคปชันแต่ละแพลตฟอร์ม", prefill: { fields: { t: s } } }, { tool: "tts", title: "ให้เครื่องอ่านออกเสียง", prefill: { fields: { t: s } } });
    if (/^[\x20-\x7e\n]+$/.test(s)) out.push({ tool: "fancy-text", title: "ทำเป็นตัวอักษรแฟนซี", prefill: { fields: { t: s.slice(0, 200) } } });
  }
  return out.filter(x => byId(x.tool));
}
const SMART_KIND = (list) => {
  const t = list[0]?.tool;
  return { jwt: "โทเคน JWT", json: "ข้อมูล JSON", "yt-thumb": "ลิงก์ YouTube", qr: "ลิงก์เว็บ", "link-maker": "เบอร์โทรหรืออีเมล", promptpay: "เบอร์โทร / เลข 13 หลัก", color: "รหัสสี", timestamp: "Unix timestamp", calculator: "สมการ", "baht-text": "จำนวนเงิน", "thai-date": "วันที่", subtitles: "ซับไตเติล", base64: "ข้อความ Base64", "kb-fix": "ข้อความที่พิมพ์ผิดภาษา", text: "ข้อความ" }[t] || "ข้อมูล";
};
// Renders suggestions into `el`. Returns true if anything was shown.
function renderSmart(el, text) {
  const list = detect(text);
  if (!list.length) { el.innerHTML = ""; el.hidden = true; return false; }
  el.hidden = false;
  el.innerHTML = `<div class="smart-head"><span class="ic" aria-hidden="true">${I.bolt}</span><div><b>ดูเหมือนเป็น${SMART_KIND(list)}</b><small>เลือกสิ่งที่อยากทำต่อ</small></div></div>
    <ul class="smart-list">${list.map((x, i) => { const t = byId(x.tool); return `<li><button class="smart-item" data-s="${i}"><span class="ic" aria-hidden="true">${t.icon}</span><span class="smart-text"><b>${esc(x.title)}</b>${x.preview ? `<span class="smart-preview">${esc(x.preview)}</span>` : `<small>${esc(t.name)}</small>`}</span><span class="go" aria-hidden="true">→</span></button>${x.copy ? `<button class="btn btn-ghost btn-sm smart-copy" data-c="${i}" aria-label="คัดลอกผลลัพธ์">คัดลอก</button>` : ""}</li>`; }).join("")}</ul>`;
  el.onclick = e => {
    const c = e.target.closest("[data-c]"); if (c) return copy(list[+c.dataset.c].copy);
    const b = e.target.closest("[data-s]"); if (b) { const x = list[+b.dataset.s]; openTool(x.tool, x.prefill); }
  };
  return true;
}
async function readClipboard() {
  try { return await navigator.clipboard.readText(); }
  catch { toast("เบราว์เซอร์ไม่อนุญาตให้อ่านคลิปบอร์ด — กดค้างที่ช่องแล้วเลือก “วาง” แทน"); return null; }
}

tool({
  id: "smart-paste", cat: "daily", also: ["text"], icon: I.bolt, name: "วางอะไรก็ได้ (Smart Paste)",
  desc: "วางลิงก์ เบอร์โทร ตัวเลข วันที่ JSON หรือข้อความที่พิมพ์ผิดภาษา แล้วเว็บเดาให้ว่าควรใช้เครื่องมือไหน พร้อมคำตอบทันที",
  keywords: "smart paste วาง คลิปบอร์ด clipboard อัตโนมัติ เดา ตรวจจับ",
  persist: false,
  render(body) {
    const ui = h(`<div><div class="field"><label for="sp">วางหรือพิมพ์อะไรก็ได้</label><textarea class="input" id="sp" style="font-family:var(--font-body);font-size:1rem;min-height:110px" placeholder="เช่น ลิงก์ YouTube, 0812345678, 1250.50, 22/10/2569, l;ylfu, {&quot;a&quot;:1}"></textarea></div>
      <div class="actions"><button class="btn btn-gold" id="paste">วางจากคลิปบอร์ด</button><button class="btn btn-ghost" id="clr">ล้าง</button></div>
      <div class="smart" id="out" hidden aria-live="polite"></div>
      <div class="empty-hint" id="empty"><b>ลองวางสิ่งเหล่านี้</b><span>ลิงก์เว็บหรือ YouTube · เบอร์มือถือ · เลขบัตร 13 หลัก · จำนวนเงิน · วันที่ · สมการ เช่น 1500*12 · ข้อความที่ลืมเปลี่ยนภาษา · JSON · รหัสสี</span></div></div>`);
    body.append(ui);
    const run = () => { const any = renderSmart($("#out", ui), $("#sp", ui).value); $("#empty", ui).hidden = any; };
    $("#sp", ui).oninput = run;
    $("#paste", ui).onclick = async () => { const t = await readClipboard(); if (t != null) { $("#sp", ui).value = t; run(); } };
    $("#clr", ui).onclick = () => { $("#sp", ui).value = ""; run(); $("#sp", ui).focus(); };
    setTimeout(() => $("#sp", ui).focus(), 80);
  },
});

// ---------- Backup & restore ----------
const KEY_LABEL = {
  notes: "โน้ต", todo: "รายการสิ่งที่ต้องทำ", portfolio: "พอร์ตหุ้น", rebalance: "สัดส่วนพอร์ต (Rebalance)", "content-plan": "แผนคอนเทนต์", hashtags: "คลังแฮชแท็ก",
  habits: "ติดตามนิสัย", countdown: "วันสำคัญ", links: "ลิงก์ส่วนตัว", trip: "หารค่าทริป", "invoice-items": "รายการในใบเสร็จ", tally: "ตัวนับ", wheel: "วงล้อสุ่ม",
  gpa: "เกรด", electric: "เครื่องใช้ไฟฟ้า", "electric-rate": "ค่าไฟต่อหน่วย", rates: "อัตราแลกเปลี่ยน", holidays: "วันหยุด", prompter: "สคริปต์เทเลพรอมป์เตอร์", md: "Markdown",
  "calc-hist": "ประวัติเครื่องคิดเลข", teams: "รายชื่อแบ่งทีม", pins: "เครื่องมือที่ปักหมุด", recent: "ใช้ล่าสุด",
};
const labelOf = (k) => k.startsWith("inputs:") ? "ค่าที่จำไว้" : k.startsWith("docno:") ? "เลขที่เอกสาร" : KEY_LABEL[k] || k;
function allData() {
  const data = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("lumiere:") && !k.startsWith("lumiere:meta:")) data[k.slice(8)] = localStorage.getItem(k); } } catch {}
  return data;
}
// Keys that hold the user's own records (not UI state) — used for the reminder banner.
const hasRecords = (d = allData()) => Object.keys(d).some(k => k in KEY_LABEL && !["pins", "recent", "calc-hist", "electric-rate"].includes(k));
function summarize(data) {
  const groups = {};
  for (const [k, raw] of Object.entries(data)) {
    let n = 1; try { const v = JSON.parse(raw); n = Array.isArray(v) ? v.length : v && typeof v === "object" ? (v.items?.length ?? Object.keys(v).length) : 1; } catch {}
    const l = labelOf(k); groups[l] = (groups[l] || 0) + n;
  }
  return Object.entries(groups).sort((a, b) => b[1] - a[1]);
}
function exportBackup() {
  const data = allData(), stamp = new Date();
  const file = { app: "lumiere-tools", version: 1, exportedAt: stamp.toISOString(), data };
  download(new Blob([JSON.stringify(file, null, 1)], { type: "application/json" }), `lumiere-backup-${stamp.toISOString().slice(0, 10)}.json`);
  store.set("meta:lastBackup", stamp.getTime());
  return Object.keys(data).length;
}
const daysSince = (t) => t ? Math.floor((Date.now() - t) / 864e5) : null;

tool({
  id: "backup", cat: "daily", also: ["dev"], icon: I.pages, name: "สำรอง & กู้คืนข้อมูล",
  desc: "รวมโน้ต พอร์ตหุ้น นิสัย ทริป ใบเสร็จ และค่าที่ตั้งไว้ทั้งหมดเป็นไฟล์เดียว เก็บไว้หรือย้ายไปเครื่องใหม่ได้",
  keywords: "backup restore export import สำรองข้อมูล กู้คืน ย้ายเครื่อง ส่งออก นำเข้า",
  persist: false,
  render(body) {
    const ui = h(`<div>
      <div class="callout"><span class="ic" aria-hidden="true">${I.key}</span><div><b>ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์ของเครื่องนี้เท่านั้น</b><span>ถ้าล้างข้อมูล Safari เปลี่ยนเครื่อง หรือลบแอป ข้อมูลจะหาย สำรองเป็นไฟล์เก็บไว้ใน Files / iCloud / Google Drive</span></div></div>
      <section class="step"><h3><span class="step-n">1</span>สำรองข้อมูล</h3><div id="what"></div><div class="status" id="last"></div>
        <div class="actions"><button class="btn btn-gold" id="exp">ดาวน์โหลดไฟล์สำรอง</button></div></section>
      <section class="step"><h3><span class="step-n">2</span>กู้คืนจากไฟล์</h3><div id="drop"></div><div id="preview"></div></section>
      <div class="status" id="st" role="status"></div></div>`);
    body.append(ui);
    const drawWhat = () => {
      const s = summarize(allData()), d = daysSince(store.get("meta:lastBackup", 0));
      $("#what", ui).innerHTML = s.length ? `<ul class="data-list">${s.map(([l, n]) => `<li><span>${esc(l)}</span><b>${n.toLocaleString()}</b></li>`).join("")}</ul>` : `<div class="empty-hint"><b>ยังไม่มีข้อมูลที่ต้องสำรอง</b><span>เมื่อคุณจดโน้ต บันทึกพอร์ต หรือใช้เครื่องมืออื่น ๆ ข้อมูลจะแสดงที่นี่</span></div>`;
      setStatus($("#last", ui), d === null ? "ยังไม่เคยสำรองข้อมูล" : d === 0 ? "สำรองล่าสุด: วันนี้" : `สำรองล่าสุด: ${d} วันที่แล้ว`, d === null || d > 14);
      $("#exp", ui).disabled = !s.length;
    };
    $("#exp", ui).onclick = () => { const n = exportBackup(); setStatus($("#st", ui), `บันทึกไฟล์สำรองแล้ว ✓ (${n} รายการ) — เก็บไฟล์ไว้ในที่ปลอดภัย`); drawWhat(); };
    $("#drop", ui).append(dropZone({ accept: ".json,application/json", title: "เลือกไฟล์สำรอง (.json)", hint: "ไฟล์ที่ได้จากปุ่มดาวน์โหลดด้านบน" }, async ([f]) => {
      const pv = $("#preview", ui); pv.innerHTML = "";
      let file;
      try { file = JSON.parse(await f.text()); if (file.app !== "lumiere-tools" || typeof file.data !== "object") throw 0; }
      catch { setStatus($("#st", ui), "ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Lumière Tools", true); return; }
      const incoming = file.data, current = allData(), clash = Object.keys(incoming).filter(k => k in current && current[k] !== incoming[k]);
      pv.innerHTML = `<div class="restore-card"><b>ไฟล์สำรองวันที่ ${new Date(file.exportedAt).toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" })}</b>
        <ul class="data-list">${summarize(incoming).map(([l, n]) => `<li><span>${esc(l)}</span><b>${n.toLocaleString()}</b></li>`).join("")}</ul>
        ${clash.length ? `<p class="hint">มี ${clash.length} รายการที่ซ้ำกับข้อมูลในเครื่องตอนนี้</p>` : ""}
        <div class="actions"><button class="btn btn-gold" data-mode="replace">แทนที่ข้อมูลทั้งหมด</button><button class="btn btn-ghost" data-mode="merge">เพิ่มเฉพาะที่ยังไม่มี</button></div></div>`;
      pv.onclick = e => {
        const b = e.target.closest("[data-mode]"); if (!b) return;
        const replace = b.dataset.mode === "replace";
        if (!confirm(replace ? "แทนที่ข้อมูลทั้งหมดในเครื่องนี้ด้วยข้อมูลจากไฟล์? (ย้อนกลับได้ทันทีหลังกู้คืน)" : "เพิ่มข้อมูลจากไฟล์เฉพาะส่วนที่ยังไม่มีในเครื่องนี้?")) return;
        try {
          localStorage.setItem("lumiere-undo", JSON.stringify(current)); // one-step undo, outside the lumiere: namespace
          if (replace) Object.keys(current).forEach(k => localStorage.removeItem("lumiere:" + k));
          for (const [k, v] of Object.entries(incoming)) if (replace || !(k in current)) localStorage.setItem("lumiere:" + k, v);
        } catch (err) { setStatus($("#st", ui), "กู้คืนไม่สำเร็จ: " + err.message, true); return; }
        pv.innerHTML = `<div class="restore-card ok"><b>กู้คืนข้อมูลแล้ว ✓</b><span>ข้อมูลใหม่จะแสดงเมื่อเปิดเครื่องมือแต่ละตัว</span><div class="actions"><button class="btn btn-ghost" id="undo">ย้อนกลับเป็นข้อมูลก่อนกู้คืน</button><button class="btn btn-gold" id="reload">รีเฟรชหน้าเว็บ</button></div></div>`;
        $("#undo", pv).onclick = () => {
          const prev = JSON.parse(localStorage.getItem("lumiere-undo") || "{}");
          Object.keys(allData()).forEach(k => localStorage.removeItem("lumiere:" + k));
          for (const [k, v] of Object.entries(prev)) localStorage.setItem("lumiere:" + k, v);
          localStorage.removeItem("lumiere-undo"); pv.innerHTML = ""; drawWhat(); setStatus($("#st", ui), "ย้อนกลับเป็นข้อมูลเดิมแล้ว ✓");
        };
        $("#reload", pv).onclick = () => location.reload();
        drawWhat(); toast("กู้คืนข้อมูลแล้ว");
      };
    }));
    drawWhat();
  },
});
