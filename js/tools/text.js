// Text tools: counter & case, wrong-keyboard fix (TH⇄EN), Thai baht text, diff, find & replace, line tools.

tool({
  id: "text", cat: "ข้อความ", icon: I.text, name: "นับคำ & แปลงข้อความ",
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
  id: "kb-fix", cat: "ข้อความ", icon: I.replace, name: "แก้พิมพ์ผิดภาษา",
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
  id: "baht-text", cat: "ข้อความ", icon: I.baht, name: "ตัวเลข → ตัวอักษรไทย (บาท)",
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
  id: "diff", cat: "ข้อความ", icon: I.diff, name: "เปรียบเทียบข้อความ",
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
  id: "find-replace", cat: "ข้อความ", icon: I.replace, name: "ค้นหา & แทนที่",
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
  id: "lines", cat: "ข้อความ", icon: I.list, name: "จัดการรายการ (บรรทัด)",
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
