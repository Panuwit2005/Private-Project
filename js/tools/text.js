// Text tools: counter & case, wrong-keyboard fix (TH⇄EN), Thai baht text, diff, find & replace, line tools.

tool({
  id: "text", cat: "text", icon: I.text, name: "นับคำ & แปลงข้อความ",
  desc: "นับตัวอักษร คำ (รองรับภาษาไทย) บรรทัด แปลงตัวพิมพ์ใหญ่-เล็ก ลบช่องว่างซ้ำ",
  keywords: "word count character uppercase lowercase นับคำ ตัวอักษร",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" placeholder="พิมพ์หรือวางข้อความที่นี่…" style="font-family:var(--font-body);font-size:.95rem"></textarea>
      <div class="stats-row"><div><b id="c">0</b><span>ตัวอักษร</span></div><div><b id="cn">0</b><span>ไม่รวมช่องว่าง</span></div><div><b id="w">0</b><span>คำ</span></div><div><b id="l">0</b><span>บรรทัด</span></div><div><b id="rd">0</b><span>นาทีอ่าน</span></div></div>
      <div class="actions">
        <button class="btn btn-ghost btn-sm" data-a="up">ตัวพิมพ์ใหญ่</button><button class="btn btn-ghost btn-sm" data-a="low">ตัวพิมพ์เล็ก</button>
        <button class="btn btn-ghost btn-sm" data-a="title">Title Case</button><button class="btn btn-ghost btn-sm" data-a="trim">ลบช่องว่างซ้ำ</button>
        <button class="btn btn-ghost btn-sm" data-a="copy">คัดลอก</button></div></div>`);
    body.append(ui);
    const t = $("#t", ui);
    const seg = window.Intl?.Segmenter ? new Intl.Segmenter("th", { granularity: "word" }) : null;
    const update = () => {
      const v = t.value;
      const words = seg ? [...seg.segment(v)].filter(s => s.isWordLike).length : (v.trim().match(/\S+/g) || []).length;
      $("#c", ui).textContent = [...v].length;
      $("#cn", ui).textContent = [...v.replace(/\s/g, "")].length;
      $("#w", ui).textContent = words;
      $("#l", ui).textContent = v ? v.split("\n").length : 0;
      $("#rd", ui).textContent = Math.ceil(words / 200);
    };
    t.oninput = update;
    $$("[data-a]", ui).forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      if (a === "copy") return copy(t.value);
      t.value = a === "up" ? t.value.toUpperCase() : a === "low" ? t.value.toLowerCase()
        : a === "title" ? t.value.toLowerCase().replace(/\b\p{L}/gu, c => c.toUpperCase())
        : t.value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      update();
    });
  },
});

// Kedmanee layout: English key → Thai character (unshifted + shifted).
const KEY_EN = "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:\"ZXCVBNM<>?";
const KEY_TH = "_ๅ/-ภถุึคตจขชๆไำพะัีรนยบลฃฟหกดเ้่าสวงผปแอิืทมใฝ%+๑๒๓๔ู฿๕๖๗๘๙๐\"ฎฑธํ๊ณฯญฐ,ฅฤฆฏโฌ็๋ษศซ.()ฉฮฺ์?ฒฬฦ";
const EN2TH = Object.fromEntries([...KEY_EN].map((c, i) => [c, KEY_TH[i]]));
const TH2EN = Object.fromEntries([...KEY_TH].map((c, i) => [c, KEY_EN[i]]));

tool({
  id: "kb-fix", cat: "text", icon: I.replace, name: "แก้พิมพ์ผิดภาษา",
  desc: "ลืมเปลี่ยนภาษา? แปลง “l;ylfu” เป็น “สวัสดี” และกลับกัน ตามแป้นพิมพ์เกษมณี",
  keywords: "keyboard wrong language พิมพ์ผิดภาษา เปลี่ยนภาษา thai english kedmanee",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" style="font-family:var(--font-body);font-size:1rem" placeholder="วางข้อความที่พิมพ์ผิดภาษา เช่น l;ylfu">l;ylfu</textarea>
      <div class="actions"><button class="btn btn-gold btn-sm" data-d="auto">แปลงอัตโนมัติ</button><button class="btn btn-ghost btn-sm" data-d="th">EN → ไทย</button><button class="btn btn-ghost btn-sm" data-d="en">ไทย → EN</button></div>
      <div class="result" id="out"></div><div class="actions"><button class="btn btn-ghost btn-sm" id="cp">คัดลอกผลลัพธ์</button></div></div>`);
    body.append(ui);
    const t = $("#t", ui), out = $("#out", ui);
    const conv = (d) => {
      const v = t.value;
      if (d === "auto") d = /[฀-๿]/.test(v) ? "en" : "th";
      const map = d === "th" ? EN2TH : TH2EN;
      out.textContent = [...v].map(c => map[c] ?? c).join("");
    };
    $$("[data-d]", ui).forEach(b => b.onclick = () => conv(b.dataset.d));
    t.oninput = () => conv("auto");
    $("#cp", ui).onclick = () => copy(out.textContent);
    conv("auto");
  },
});

// Thai baht text (same conventions as Excel BAHTTEXT).
function bahtText(input) {
  const s = String(input).replace(/[,\s฿]/g, "");
  if (!/^\d*(\.\d*)?$/.test(s) || s === "" || s === ".") return null;
  let [ip, fp = ""] = s.split(".");
  let int = BigInt(ip || "0");
  let satang = Math.round(Number("0." + (fp || "0")) * 100);
  if (satang === 100) { int += 1n; satang = 0; }
  const N = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const P = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  const group = (n, higher) => {
    const d = String(n).split("").reverse(); let out = "";
    for (let p = d.length - 1; p >= 0; p--) {
      const x = +d[p]; if (!x) continue;
      if (p === 1) out += (x === 1 ? "" : x === 2 ? "ยี่" : N[x]) + "สิบ";
      else if (p === 0 && x === 1 && (n > 1 || higher)) out += "เอ็ด";
      else out += N[x] + P[p];
    }
    return out;
  };
  const read = (n, higher = false) => n >= 1000000n
    ? read(n / 1000000n) + "ล้าน" + group(Number(n % 1000000n), true)
    : group(Number(n), higher);
  const baht = int === 0n ? (satang ? "" : "ศูนย์บาท") : read(int) + "บาท";
  return baht + (satang ? group(satang, false) + "สตางค์" : "ถ้วน");
}

tool({
  id: "baht-text", cat: "text", icon: I.baht, name: "ตัวเลข → ตัวอักษรไทย (บาท)",
  desc: "แปลงจำนวนเงินเป็นคำอ่านภาษาไทย เช่น 1,250.50 → หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์ สำหรับใบเสร็จ/เช็ค",
  keywords: "baht text บาทถ้วน จำนวนเงิน ตัวหนังสือ เช็ค ใบเสร็จ bahttext",
  render(body) {
    const ui = h(`<div><div class="field"><label>จำนวนเงิน</label><input class="input" id="n" inputmode="decimal" value="1250.50" style="font-size:1.2rem"></div>
      <div class="result" id="out" style="font-size:1.15rem"></div>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="cp">คัดลอก</button></div></div>`);
    body.append(ui);
    const run = () => {
      const r = bahtText($("#n", ui).value);
      $("#out", ui).innerHTML = r ? `<b>${r}</b><br><small style="color:var(--color-text-muted)">${money(num($("#n", ui).value))} บาท</small>` : `<span style="color:var(--color-danger)">กรุณากรอกตัวเลข</span>`;
    };
    $("#n", ui).oninput = run; run();
    $("#cp", ui).onclick = () => copy(bahtText($("#n", ui).value) || "");
  },
});

// Line-level diff via LCS.
function lineDiff(a, b) {
  const A = a.split("\n"), B = b.split("\n"), n = A.length, m = B.length;
  if (n * m > 4e6) throw new Error("ข้อความยาวเกินไปสำหรับการเปรียบเทียบ");
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push([" ", A[i]]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push(["-", A[i++]]);
    else out.push(["+", B[j++]]);
  }
  while (i < n) out.push(["-", A[i++]]);
  while (j < m) out.push(["+", B[j++]]);
  return out;
}

tool({
  id: "diff", cat: "text", icon: I.diff, name: "เปรียบเทียบข้อความ",
  desc: "หาความแตกต่างระหว่างข้อความ 2 ชุดทีละบรรทัด ไฮไลต์ส่วนที่เพิ่มและลบ",
  keywords: "diff compare เปรียบเทียบ ความแตกต่าง text",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>ต้นฉบับ</label><textarea class="input" id="a" style="min-height:130px">แอปเปิ้ล\nกล้วย\nส้ม</textarea></div><div class="field"><label>ฉบับแก้ไข</label><textarea class="input" id="b" style="min-height:130px">แอปเปิ้ล\nมะม่วง\nส้ม\nองุ่น</textarea></div></div>
      <div class="actions"><button class="btn btn-gold btn-sm" id="go">เปรียบเทียบ</button></div><div class="status" id="st"></div><div class="diff" id="out"></div></div>`);
    body.append(ui);
    const run = () => {
      try {
        const d = lineDiff($("#a", ui).value, $("#b", ui).value);
        const add = d.filter(x => x[0] === "+").length, del = d.filter(x => x[0] === "-").length;
        setStatus($("#st", ui), add + del ? `+${add} บรรทัด · −${del} บรรทัด` : "ข้อความเหมือนกันทุกบรรทัด ✓");
        $("#out", ui).innerHTML = d.map(([k, l]) => `<div class="${k === "+" ? "add" : k === "-" ? "del" : ""}">${k} ${esc(l) || "&nbsp;"}</div>`).join("");
      } catch (e) { setStatus($("#st", ui), e.message, true); }
    };
    $("#go", ui).onclick = run; run();
  },
});

tool({
  id: "find-replace", cat: "text", icon: I.replace, name: "ค้นหา & แทนที่",
  desc: "ค้นหาและแทนที่ข้อความทั้งหมดในคลิกเดียว รองรับ Regex และไม่สนตัวพิมพ์เล็ก-ใหญ่",
  keywords: "find replace ค้นหา แทนที่ regex",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" style="font-family:var(--font-body)" placeholder="ข้อความต้นฉบับ"></textarea>
      <div class="row"><div class="field"><label>ค้นหา</label><input class="input" id="f"></div><div class="field"><label>แทนที่ด้วย</label><input class="input" id="r"></div></div>
      <div class="actions"><label class="check"><input type="checkbox" id="re"> Regex</label><label class="check"><input type="checkbox" id="ci" checked> ไม่สนตัวพิมพ์เล็ก-ใหญ่</label></div>
      <div class="actions"><button class="btn btn-gold btn-sm" id="go">แทนที่ทั้งหมด</button><button class="btn btn-ghost btn-sm" id="cp">คัดลอก</button></div><div class="status" id="st"></div></div>`);
    body.append(ui);
    const st = $("#st", ui);
    const pattern = () => {
      const f = $("#f", ui).value; if (!f) return null;
      return new RegExp($("#re", ui).checked ? f : f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g" + ($("#ci", ui).checked ? "i" : "") + "u");
    };
    $("#f", ui).oninput = () => { try { const p = pattern(); setStatus(st, p ? `พบ ${($("#t", ui).value.match(p) || []).length} ตำแหน่ง` : ""); } catch (e) { setStatus(st, e.message, true); } };
    $("#go", ui).onclick = () => {
      try { const p = pattern(); if (!p) return; const n = ($("#t", ui).value.match(p) || []).length; $("#t", ui).value = $("#t", ui).value.replace(p, $("#r", ui).value); setStatus(st, `แทนที่แล้ว ${n} ตำแหน่ง`); }
      catch (e) { setStatus(st, e.message, true); }
    };
    $("#cp", ui).onclick = () => copy($("#t", ui).value);
  },
});

tool({
  id: "lines", cat: "text", icon: I.list, name: "จัดการรายการ (บรรทัด)",
  desc: "เรียงลำดับ ลบบรรทัดซ้ำ ลบบรรทัดว่าง สลับ สุ่ม ใส่เลขลำดับ ให้รายการยาว ๆ",
  keywords: "sort lines dedupe unique shuffle เรียง ลบซ้ำ รายการ",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" style="font-family:var(--font-body)">ส้ม\nกล้วย\nแอปเปิ้ล\nกล้วย\n\nมะม่วง</textarea>
      <div class="actions">
        <button class="btn btn-ghost btn-sm" data-a="az">เรียง ก-ฮ / A-Z</button><button class="btn btn-ghost btn-sm" data-a="za">เรียงย้อนกลับ</button>
        <button class="btn btn-ghost btn-sm" data-a="dedupe">ลบบรรทัดซ้ำ</button><button class="btn btn-ghost btn-sm" data-a="empty">ลบบรรทัดว่าง</button>
        <button class="btn btn-ghost btn-sm" data-a="rev">กลับลำดับ</button><button class="btn btn-ghost btn-sm" data-a="shuffle">สุ่มลำดับ</button>
        <button class="btn btn-ghost btn-sm" data-a="number">ใส่เลขลำดับ</button><button class="btn btn-ghost btn-sm" data-a="trim">ตัดช่องว่างหัวท้าย</button>
        <button class="btn btn-ghost btn-sm" data-a="join">รวมเป็นบรรทัดเดียว (,)</button><button class="btn btn-gold btn-sm" data-a="copy">คัดลอก</button></div>
      <div class="status" id="st"></div></div>`);
    body.append(ui);
    const t = $("#t", ui), coll = new Intl.Collator("th", { numeric: true });
    $$("[data-a]", ui).forEach(b => b.onclick = () => {
      let L = t.value.split("\n"); const a = b.dataset.a;
      if (a === "copy") return copy(t.value);
      if (a === "az") L.sort(coll.compare);
      if (a === "za") L.sort((x, y) => coll.compare(y, x));
      if (a === "dedupe") L = [...new Set(L)];
      if (a === "empty") L = L.filter(l => l.trim());
      if (a === "rev") L.reverse();
      if (a === "shuffle") for (let i = L.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [L[i], L[j]] = [L[j], L[i]]; }
      if (a === "number") L = L.map((l, i) => `${i + 1}. ${l}`);
      if (a === "trim") L = L.map(l => l.trim());
      if (a === "join") L = [L.filter(l => l.trim()).join(", ")];
      t.value = L.join("\n"); setStatus($("#st", ui), `${L.length} บรรทัด`);
    });
  },
});

// Unicode "font" styles for social captions. Only A–Z, a–z, 0–9 change; Thai stays as-is.
const FANCY = (() => {
  const cp = String.fromCodePoint;
  const range = (A, a, d, ex = {}) => (ch) => {
    if (ex[ch]) return ex[ch];
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90 && A) return cp(A + c - 65);
    if (c >= 97 && c <= 122 && a) return cp(a + c - 97);
    if (c >= 48 && c <= 57 && d) return cp(d + c - 48);
    return ch;
  };
  const comb = (mark) => (ch) => /\s/.test(ch) ? ch : ch + mark;
  return [
    ["ตัวหนา", range(0x1D400, 0x1D41A, 0x1D7CE)],
    ["ตัวเอียง", range(0x1D434, 0x1D44E, 0, { h: "ℎ" })],
    ["หนาเอียง", range(0x1D468, 0x1D482, 0)],
    ["ไม่มีเชิง หนา", range(0x1D5D4, 0x1D5EE, 0x1D7EC)],
    ["พิมพ์ดีด", range(0x1D670, 0x1D68A, 0x1D7F6)],
    ["เส้นคู่", range(0x1D538, 0x1D552, 0x1D7D8, { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" })],
    ["ตัวเขียน", range(0x1D4D0, 0x1D4EA, 0)],
    ["วงกลม", range(0x24B6, 0x24D0, 0, { 0: "⓪", ...Object.fromEntries([..."123456789"].map((d, i) => [d, cp(0x2460 + i)])) })],
    ["เต็มความกว้าง", (ch) => ch === " " ? "　" : ch.charCodeAt(0) >= 33 && ch.charCodeAt(0) <= 126 ? cp(ch.charCodeAt(0) + 0xFEE0) : ch],
    ["ขีดฆ่า", comb("̶")],
    ["ขีดเส้นใต้", comb("̲")],
  ];
})();

tool({
  id: "fancy-text", cat: "text", also: ["creator"], icon: I.text, name: "ตัวอักษรแฟนซี (แคปชัน/ไบโอ)",
  desc: "แปลงข้อความอังกฤษเป็นตัวหนา ตัวเอียง ตัวเขียน วงกลม ขีดฆ่า ฯลฯ ใช้ได้ใน IG, TikTok, Facebook, X โดยไม่ต้องลงฟอนต์",
  keywords: "fancy font bold italic unicode ฟอนต์ ตัวหนา แคปชัน ไบโอ bio instagram",
  render(body) {
    const ui = h(`<div><input class="input" id="t" value="Lumiere Tools 2026" style="font-size:1.05rem"><div class="out" id="out"></div>
      <p class="hint">ใช้ได้กับตัวอักษรภาษาอังกฤษและตัวเลข · โปรแกรมอ่านหน้าจออาจอ่านตัวอักษรแฟนซีไม่ได้ จึงไม่ควรใช้กับข้อความสำคัญ</p></div>`);
    body.append(ui);
    const run = () => { const v = $("#t", ui).value; $("#out", ui).innerHTML = FANCY.map(([n, f], i) => `<div class="file-item"><div class="meta"><small>${n}</small><b style="white-space:normal;font-size:1.1rem">${esc([...v].map(f).join(""))}</b></div><button class="btn btn-ghost btn-sm" data-i="${i}">คัดลอก</button></div>`).join(""); };
    $("#out", ui).onclick = e => { const b = e.target.closest("[data-i]"); if (b) copy([...$("#t", ui).value].map(FANCY[+b.dataset.i][1]).join("")); };
    $("#t", ui).oninput = run; run();
  },
});

tool({
  id: "symbols", cat: "text", icon: I.hashtag, name: "สัญลักษณ์พิเศษ",
  desc: "แตะเพื่อคัดลอกสัญลักษณ์ที่พิมพ์ยากบนมือถือ เช่น ✓ ★ ฿ ° ± → ๑ ๒ ๓ © ™ 「」",
  keywords: "symbol special character สัญลักษณ์ เครื่องหมาย ติ๊กถูก ดาว ลูกศร องศา บาท",
  render(body) {
    const G = [["เครื่องหมาย", "✓ ✔ ✗ ✘ ★ ☆ ♥ ❤ ● ○ ◉ ■ □ ◆ ◇ ▲ △ ▼ ▽ • · … ※ ¶ § † ‡"], ["ลูกศร", "→ ← ↑ ↓ ↔ ↕ ⇒ ⇐ ⇔ ➜ ➤ ↗ ↘ ↩ ↪ ⟶"], ["เงิน & คณิต", "฿ $ € £ ¥ ₩ ₹ ¢ ± × ÷ ≠ ≈ ≤ ≥ ∞ √ ∑ π ° % ‰ ½ ⅓ ¼ ¾ ² ³ ¹"], ["ไทย", "๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ๙ ๐ ฯ ๆ ฯลฯ ๏ ๚ ๛ ฿"], ["วงเล็บ & อัญประกาศ", "「 」 『 』 【 】 《 》 〈 〉 “ ” ‘ ’ « » ‹ ›"], ["อื่น ๆ", "© ® ™ № ℃ ℉ ☎ ✉ ✂ ✎ ☀ ☁ ☂ ☕ ♪ ♫ ⚡ ⌛ ⏰ ♻ ⚠ ✈ ⚽"]];
    const ui = h(`<div>${G.map(([n, s]) => `<h3 style="font-size:.95rem;margin:16px 0 8px;color:var(--color-text-muted)">${n}</h3><div class="actions" style="margin:0;gap:6px">${s.split(" ").map(c => `<button class="btn btn-ghost btn-sm" data-c="${c}" style="min-width:44px;font-size:1.1rem;padding:0 10px">${c}</button>`).join("")}</div>`).join("")}
      <div class="field" style="margin-top:18px"><label>ที่คัดลอกไว้ (แตะสัญลักษณ์เพื่อเพิ่ม)</label><input class="input" id="tray"></div><div class="actions"><button class="btn btn-gold btn-sm" id="cp">คัดลอกทั้งหมด</button><button class="btn btn-ghost btn-sm" id="clr">ล้าง</button></div></div>`);
    body.append(ui);
    ui.onclick = e => { const b = e.target.closest("[data-c]"); if (b) { copy(b.dataset.c); $("#tray", ui).value += b.dataset.c; } };
    $("#cp", ui).onclick = () => copy($("#tray", ui).value);
    $("#clr", ui).onclick = () => $("#tray", ui).value = "";
  },
});

tool({
  id: "caption-check", cat: "creator", also: ["text"], icon: I.captions, name: "เช็กความยาวแคปชัน",
  desc: "นับตัวอักษรเทียบลิมิตของแต่ละแพลตฟอร์ม (X, IG, TikTok, YouTube) และดูว่าคนจะเห็นข้อความแรกแค่ไหนก่อนกด “เพิ่มเติม”",
  keywords: "caption limit character count แคปชัน จำนวนตัวอักษร twitter x instagram tiktok youtube title",
  render(body) {
    const L = [["X (Twitter) โพสต์", 280], ["YouTube ชื่อคลิป", 100], ["Instagram แคปชัน", 2200], ["TikTok แคปชัน", 4000], ["YouTube คำอธิบาย", 5000]];
    const ui = h(`<div><textarea class="input" id="t" style="font-family:var(--font-body);font-size:1rem" placeholder="วางแคปชันที่นี่…"></textarea>
      <div class="stat-grid" id="st"></div><div class="bars" id="bars"></div>
      <h3 style="margin-top:20px;font-size:1rem">ตัวอย่างที่เห็นก่อนกด “เพิ่มเติม” (~125 ตัวอักษร)</h3><div class="result" id="pv" style="white-space:pre-wrap"></div>
      <p class="hint">นับแบบตัวอักษรที่ตาเห็น ลิมิตจริงอาจต่างเล็กน้อย เช่น X นับลิงก์เป็น 23 ตัวอักษร และลิมิตของแพลตฟอร์มเปลี่ยนได้</p></div>`);
    body.append(ui);
    const seg = window.Intl?.Segmenter ? new Intl.Segmenter("th", { granularity: "grapheme" }) : null;
    const run = () => {
      const v = $("#t", ui).value, n = seg ? [...seg.segment(v)].length : [...v].length, tags = (v.match(/#[^\s#]+/g) || []).length;
      $("#st", ui).innerHTML = [["ตัวอักษร", n.toLocaleString()], ["คำ", wordCount(v).toLocaleString()], ["แฮชแท็ก", tags], ["บรรทัด", v ? v.split("\n").length : 0]].map(([k, x]) => `<div class="stat"><span>${k}</span><b>${x}</b></div>`).join("");
      $("#bars", ui).innerHTML = L.map(([k, lim]) => `<div class="bar-row"><span>${k}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, n / lim * 100)}%;${n > lim ? "background:var(--color-danger)" : ""}"></div></div><b>${n > lim ? "เกิน " + (n - lim) : "เหลือ " + (lim - n)}</b></div>`).join("");
      const g = seg ? [...seg.segment(v)].map(s => s.segment) : [...v];
      $("#pv", ui).textContent = g.length > 125 ? g.slice(0, 125).join("") + "… เพิ่มเติม" : v || "—";
    };
    $("#t", ui).oninput = run; run();
  },
});

tool({
  id: "thai-date", cat: "text", also: ["calc"], icon: I.calendar, name: "วันที่ภาษาไทย & แปลง พ.ศ.",
  desc: "แปลงวันที่เป็นข้อความไทยหลายรูปแบบ (วันพฤหัสบดีที่ ๒๒ ตุลาคม พ.ศ. ๒๕๖๙) และแปลงปี พ.ศ. ⇄ ค.ศ. พร้อมปีนักษัตร",
  keywords: "thai date พ.ศ. ค.ศ. วันที่ไทย เลขไทย ปีนักษัตร แปลงปี",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>วันที่</label><input class="input" type="date" id="d" value="${new Date().toISOString().slice(0, 10)}"></div></div><div class="out" id="out"></div>
      <h3 style="margin-top:20px;font-size:1rem">แปลงปี</h3><div class="row" style="margin-top:6px"><div class="field"><label>พ.ศ.</label><input class="input" type="number" id="be"></div><div class="field"><label>ค.ศ.</label><input class="input" type="number" id="ad"></div></div><div class="status" id="zd"></div></div>`);
    body.append(ui);
    const Z = ["ชวด (หนู)", "ฉลู (วัว)", "ขาล (เสือ)", "เถาะ (กระต่าย)", "มะโรง (งูใหญ่)", "มะเส็ง (งูเล็ก)", "มะเมีย (ม้า)", "มะแม (แพะ)", "วอก (ลิง)", "ระกา (ไก่)", "จอ (หมา)", "กุน (หมู)"];
    const zod = (ad) => Z[((ad - 4) % 12 + 12) % 12];
    const run = () => {
      const d = new Date($("#d", ui).value + "T00:00"); if (isNaN(d)) return;
      const f = (loc, o) => d.toLocaleDateString(loc, o);
      const rows = [["เต็ม", f("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })], ["เต็ม เลขไทย", f("th-TH-u-nu-thai", { weekday: "long", day: "numeric", month: "long", year: "numeric" })], ["มาตรฐานเอกสาร", f("th-TH", { day: "numeric", month: "long", year: "numeric" })], ["ย่อ", f("th-TH", { day: "numeric", month: "short", year: "2-digit" })], ["ตัวเลข พ.ศ.", f("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" })], ["อังกฤษ", f("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })], ["ISO", $("#d", ui).value]];
      $("#out", ui).innerHTML = rows.map(([k, v]) => `<div class="file-item"><div class="meta"><small>${k}</small><b style="white-space:normal">${esc(v)}</b></div><button class="btn btn-ghost btn-sm" data-c="${esc(v)}">คัดลอก</button></div>`).join("");
    };
    $("#out", ui).onclick = e => { const b = e.target.closest("[data-c]"); if (b) copy(b.dataset.c); };
    $("#d", ui).oninput = run;
    $("#be", ui).oninput = e => { const v = +e.target.value; if (v) { $("#ad", ui).value = v - 543; setStatus($("#zd", ui), "ปีนักษัตร: " + zod(v - 543)); } };
    $("#ad", ui).oninput = e => { const v = +e.target.value; if (v) { $("#be", ui).value = v + 543; setStatus($("#zd", ui), "ปีนักษัตร: " + zod(v)); } };
    const y = new Date().getFullYear(); $("#ad", ui).value = y; $("#ad", ui).oninput({ target: $("#ad", ui) });
    run();
  },
});

tool({
  id: "link-maker", cat: "text", also: ["daily", "creator"], icon: I.link, name: "สร้างลิงก์ LINE / WhatsApp / โทร / อีเมล",
  desc: "สร้างลิงก์กดแล้วเปิดแชต LINE, WhatsApp, โทรออก, SMS, อีเมล หรือแผนที่ พร้อมข้อความที่พิมพ์ไว้ และทำเป็น QR ได้",
  keywords: "line link whatsapp wa.me tel sms mailto google maps ลิงก์ ไลน์ โทร qr",
  render(body) {
    const ui = h(`<div><div class="tabs" id="tp"><button class="chip active" data-t="line">LINE</button><button class="chip" data-t="wa">WhatsApp</button><button class="chip" data-t="tel">โทร</button><button class="chip" data-t="sms">SMS</button><button class="chip" data-t="mail">อีเมล</button><button class="chip" data-t="map">แผนที่</button></div>
      <div class="field"><label id="l1">LINE ID (ไม่ต้องใส่ @ สำหรับบัญชีส่วนตัว) — เว้นว่างถ้าจะแชร์ข้อความ</label><input class="input" id="a"></div>
      <div class="field" style="margin-top:12px" id="f2"><label id="l2">ข้อความ</label><textarea class="input" id="b" style="font-family:var(--font-body);min-height:80px">สวัสดีครับ</textarea></div>
      <div class="result" id="out" style="word-break:break-all"></div>
      <div class="actions"><button class="btn btn-gold btn-sm" id="cp">คัดลอกลิงก์</button><a class="btn btn-ghost btn-sm" id="open" target="_blank" rel="noopener">ทดลองเปิด ↗</a><button class="btn btn-ghost btn-sm" id="qr">ทำเป็น QR</button></div><div class="qr-box" id="qbox" hidden></div></div>`);
    body.append(ui);
    let t = "line", link = "";
    const L = { line: ["LINE ID (บัญชีส่วนตัว) — เว้นว่างถ้าจะแชร์ข้อความ", "ข้อความที่จะแชร์"], wa: ["เบอร์โทร (เช่น 0812345678)", "ข้อความเริ่มต้น"], tel: ["เบอร์โทร", ""], sms: ["เบอร์โทร", "ข้อความ"], mail: ["อีเมลผู้รับ", "หัวเรื่อง | เนื้อหา (คั่นด้วย |)"], map: ["ชื่อสถานที่หรือที่อยู่", ""] };
    const intl = (p) => { p = p.replace(/[^\d+]/g, ""); return p.startsWith("+") ? p.slice(1) : p.startsWith("0") ? "66" + p.slice(1) : p; };
    const run = () => {
      const a = $("#a", ui).value.trim(), b = $("#b", ui).value, e = encodeURIComponent;
      link = t === "line" ? (a ? `https://line.me/R/ti/p/~${e(a.replace(/^@/, ""))}` : `https://line.me/R/msg/text/?${e(b)}`)
        : t === "wa" ? `https://wa.me/${intl(a)}${b ? "?text=" + e(b) : ""}`
        : t === "tel" ? `tel:${a.replace(/[^\d+]/g, "")}`
        : t === "sms" ? `sms:${a.replace(/[^\d+]/g, "")}${b ? "?&body=" + e(b) : ""}`
        : t === "mail" ? (() => { const [s, ...m] = b.split("|"); return `mailto:${a}?subject=${e(s.trim())}&body=${e(m.join("|").trim())}`; })()
        : `https://www.google.com/maps/search/?api=1&query=${e(a)}`;
      $("#out", ui).textContent = link; $("#open", ui).href = link; $("#qbox", ui).hidden = true;
    };
    $("#tp", ui).onclick = e => { const b = e.target.closest("[data-t]"); if (!b) return; t = b.dataset.t; $$("#tp .chip", ui).forEach(x => x.classList.toggle("active", x === b)); $("#l1", ui).textContent = L[t][0]; $("#l2", ui).textContent = L[t][1]; $("#f2", ui).hidden = !L[t][1]; run(); };
    $$("input, textarea", ui).forEach(i => i.oninput = run);
    $("#cp", ui).onclick = () => copy(link);
    $("#qr", ui).onclick = async () => {
      await loadScript(LIB.qr); const q = qrcode(0, "M"); q.addData(unescape(encodeURIComponent(link))); q.make();
      $("#qbox", ui).innerHTML = q.createImgTag(6, 12); $("#qbox", ui).hidden = false;
    };
    run();
  },
});
