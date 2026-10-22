// Money & small-business tools: PromptPay QR, trip expense splitter, and Thai receipt / invoice /
// quotation documents. Everything is generated on the device; nothing is sent anywhere.

// ---------- PromptPay (Thai QR, EMVCo) ----------
const tlv = (id, v) => id + pad(v.length) + v;
function crc16(s) {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}
// Returns { kind, value } for a phone (10 digits), national/tax ID (13) or e-wallet (15), else null.
function promptpayTarget(raw) {
  const d = String(raw).replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("0")) return { kind: "phone", value: d, tag: "01", data: "0066" + d.slice(1) };
  if (d.length === 13) return { kind: "id", value: d, tag: "02", data: d };
  if (d.length === 15) return { kind: "ewallet", value: d, tag: "03", data: d };
  return null;
}
function promptpayPayload(id, amount) {
  const t = promptpayTarget(id); if (!t) return null;
  const amt = num(amount);
  let s = tlv("00", "01") + tlv("01", amt > 0 ? "12" : "11") + tlv("29", tlv("00", "A000000677010111") + tlv(t.tag, t.data))
    + tlv("58", "TH") + tlv("53", "764") + (amt > 0 ? tlv("54", amt.toFixed(2)) : "") + "6304"; // field order as used by Thai bank apps
  return s + crc16(s);
}
// Thai national ID / tax ID checksum (mod 11)
function thaiIdValid(d) {
  if (!/^\d{13}$/.test(d)) return false;
  const sum = [...d.slice(0, 12)].reduce((s, c, i) => s + +c * (13 - i), 0);
  return (11 - (sum % 11)) % 10 === +d[12];
}
async function qrCanvas(text, px = 640) {
  await loadScript(LIB.qr);
  const q = qrcode(0, "M"); q.addData(text); q.make();
  const n = q.getModuleCount(), quiet = 4, cell = Math.max(2, Math.floor(px / (n + quiet * 2))), size = (n + quiet * 2) * cell;
  const c = document.createElement("canvas"); c.width = c.height = size;
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, size, size); x.fillStyle = "#0b1f3a";
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect((k + quiet) * cell, (r + quiet) * cell, cell, cell);
  return c;
}
const maskId = (t) => t.kind === "phone" ? `${t.value.slice(0, 3)}-xxx-${t.value.slice(6)}` : `${t.value.slice(0, 1)}-xxxx-xxxxx-${t.value.slice(10, 12)}-${t.value.slice(12)}`;

tool({
  id: "promptpay", cat: "money", also: ["daily"], icon: I.qr, name: "สร้าง QR พร้อมเพย์",
  desc: "ใส่เบอร์มือถือหรือเลขบัตรประชาชนที่ผูกพร้อมเพย์ และจำนวนเงิน ได้ QR ให้คนสแกนจ่ายผ่านแอปธนาคารได้ทันที",
  keywords: "promptpay พร้อมเพย์ qr รับเงิน โอนเงิน thai qr payment สแกนจ่าย",
  render(body) {
    const ui = h(`<div class="pp">
      <div class="row" style="margin-top:0;align-items:flex-start">
        <div class="field"><label for="ppid">เบอร์มือถือ หรือ เลขบัตรประชาชน / เลขผู้เสียภาษี</label><input class="input" id="ppid" inputmode="numeric" autocomplete="off" placeholder="เช่น 0812345678" aria-describedby="ppidMsg"><small class="field-msg" id="ppidMsg"></small></div>
        <div class="field"><label for="ppamt">จำนวนเงิน (บาท) — เว้นว่างให้ผู้จ่ายกรอกเอง</label><input class="input" id="ppamt" inputmode="decimal" placeholder="0.00"></div>
      </div>
      <div class="field" style="margin-top:12px"><label for="ppname">ชื่อที่แสดงใต้ QR (ไม่บังคับ)</label><input class="input" id="ppname" placeholder="เช่น ร้านกาแฟของฉัน"></div>
      <div class="pp-card" id="card" hidden><div class="pp-head">QR พร้อมเพย์</div><div class="pp-qr" id="qr"></div><div class="pp-amt" id="amt"></div><div class="pp-meta" id="meta"></div></div>
      <div class="empty-hint" id="empty"><b>ใส่เบอร์หรือเลขบัตรเพื่อสร้าง QR</b><span>QR จะขึ้นทันทีที่กรอกครบ ไม่มีการส่งข้อมูลออกจากเครื่อง</span></div>
      <div class="actions center" id="acts" hidden><button class="btn btn-gold" id="save">บันทึกรูป QR</button><button class="btn btn-ghost" id="share">แชร์</button><button class="btn btn-ghost" id="cp">คัดลอกรหัส QR</button></div>
      <p class="hint">ก่อนใช้จริง ให้ลองสแกนด้วยแอปธนาคารของคุณ และตรวจว่าชื่อบัญชีที่ขึ้นเป็นของคุณ</p></div>`);
    body.append(ui);
    let payload = "", cardCanvas;
    const run = async () => {
      const raw = $("#ppid", ui).value, t = promptpayTarget(raw), msg = $("#ppidMsg", ui), digits = raw.replace(/\D/g, "");
      msg.className = "field-msg"; msg.textContent = "";
      if (!digits) { $("#card", ui).hidden = $("#acts", ui).hidden = true; $("#empty", ui).hidden = false; return; }
      if (!t) { msg.classList.add("err"); msg.textContent = digits.length < 10 ? `ใส่ให้ครบ — ตอนนี้ ${digits.length} หลัก` : "ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลข 13 หลัก"; $("#card", ui).hidden = $("#acts", ui).hidden = true; $("#empty", ui).hidden = false; return; }
      if (t.kind === "id" && !thaiIdValid(t.value)) { msg.classList.add("warn"); msg.textContent = "เลข 13 หลักนี้ไม่ผ่านการตรวจสอบหลักสุดท้าย — ตรวจสอบอีกครั้ง"; }
      else msg.textContent = t.kind === "phone" ? "✓ เบอร์มือถือ" : t.kind === "id" ? "✓ เลขบัตรประชาชน / ผู้เสียภาษี" : "✓ e-Wallet ID";
      payload = promptpayPayload(raw, $("#ppamt", ui).value);
      const c = await qrCanvas(payload, 560); c.setAttribute("role", "img"); c.setAttribute("aria-label", "QR พร้อมเพย์");
      $("#qr", ui).replaceChildren(c);
      const amt = num($("#ppamt", ui).value);
      $("#amt", ui).textContent = amt > 0 ? `฿ ${money(amt)}` : "ผู้จ่ายกรอกจำนวนเงินเอง";
      $("#meta", ui).textContent = [$("#ppname", ui).value.trim(), maskId(t)].filter(Boolean).join(" · ");
      $("#card", ui).hidden = $("#acts", ui).hidden = false; $("#empty", ui).hidden = true;
      cardCanvas = c;
    };
    // Exported image: QR plus amount and name on a white card, so it reads well when forwarded in chat.
    const render = async () => {
      const t = promptpayTarget($("#ppid", ui).value), amt = num($("#ppamt", ui).value), W = 720, H = 980;
      const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.fillStyle = "#0b1f3a"; x.fillRect(0, 0, W, 110);
      x.fillStyle = "#fff"; x.font = '600 40px "IBM Plex Sans Thai", sans-serif'; x.textAlign = "center"; x.fillText("QR พร้อมเพย์", W / 2, 70);
      x.drawImage(cardCanvas, (W - 560) / 2, 150, 560, 560);
      x.fillStyle = "#0b1f3a"; x.font = '700 52px "IBM Plex Sans Thai", sans-serif'; x.fillText(amt > 0 ? `฿ ${money(amt)}` : "ระบุจำนวนเงินในแอป", W / 2, 790);
      x.fillStyle = "#475569"; x.font = '400 30px "IBM Plex Sans Thai", sans-serif'; x.fillText([$("#ppname", ui).value.trim(), maskId(t)].filter(Boolean).join(" · "), W / 2, 850);
      return canvasBlob(c);
    };
    $("#save", ui).onclick = async () => download(await render(), `promptpay-${num($("#ppamt", ui).value) || "open"}.png`);
    $("#share", ui).onclick = async () => {
      const f = new File([await render()], "promptpay.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: "QR พร้อมเพย์" }); } catch {} }
      else download(f, f.name);
    };
    $("#cp", ui).onclick = () => copy(payload);
    $$("input", ui).forEach(i => i.addEventListener("input", run));
    run();
  },
});

// ---------- Trip splitter ----------
// First consonant for the avatar: skip Thai leading vowels (เ แ โ ใ ไ) so "เอ" shows "อ".
const initial = (name) => (name.trim().replace(/^[เแโใไ]+/, "")[0] || "?").toUpperCase();
// Greedy settlement: repeatedly match the largest debtor with the largest creditor (≤ n−1 transfers).
function settle(balances) {
  const cr = [], de = [];
  for (const [name, b] of Object.entries(balances)) { const v = Math.round(b * 100); if (v > 0) cr.push([name, v]); else if (v < 0) de.push([name, -v]); }
  const out = [];
  while (cr.length && de.length) {
    cr.sort((a, b) => b[1] - a[1]); de.sort((a, b) => b[1] - a[1]);
    const m = Math.min(cr[0][1], de[0][1]);
    out.push({ from: de[0][0], to: cr[0][0], amount: m / 100 });
    cr[0][1] -= m; de[0][1] -= m;
    if (!cr[0][1]) cr.shift(); if (!de[0][1]) de.shift();
  }
  return out;
}

tool({
  id: "trip-split", cat: "money", also: ["daily", "calc"], icon: I.team, name: "หารค่าทริป (ใครโอนให้ใคร)",
  desc: "จดว่าใครจ่ายอะไรไปบ้าง แล้วสรุปว่าใครต้องโอนให้ใครเท่าไร ด้วยจำนวนครั้งที่โอนน้อยที่สุด ส่งสรุปเข้า LINE ได้",
  keywords: "trip split หารค่าทริป หารเงิน เที่ยว ใครจ่าย โอนคืน settle up ค่าใช้จ่ายกลุ่ม",
  render(body) {
    let trip = store.get("trip", { name: "ทริปเที่ยว", people: [{ n: "เอ", pp: "" }, { n: "บี", pp: "" }, { n: "ซี", pp: "" }], items: [{ d: "ที่พัก", a: 3000, by: 0, for: [0, 1, 2] }, { d: "อาหารเย็น", a: 1200, by: 1, for: [0, 1, 2] }, { d: "แท็กซี่", a: 300, by: 2, for: [1, 2] }] });
    const ui = h(`<div class="trip">
      <div class="field"><label for="tn">ชื่อทริป</label><input class="input" id="tn"></div>
      <section class="step"><h3><span class="step-n">1</span>คนในทริป</h3><div class="people" id="people"></div>
        <form class="row" id="pf" style="margin-top:10px"><div class="field"><label for="pn" class="sr-only">ชื่อคน</label><input class="input" id="pn" placeholder="เพิ่มชื่อ" required></div><button class="btn btn-ghost">+ เพิ่มคน</button></form></section>
      <section class="step"><h3><span class="step-n">2</span>ค่าใช้จ่าย</h3><div id="items"></div>
        <form id="xf" class="xform"><div class="row" style="margin-top:0;align-items:flex-start"><div class="field" style="flex:2"><label for="xd">รายการ</label><input class="input" id="xd" placeholder="เช่น ค่าน้ำมัน" required></div><div class="field"><label for="xa">จำนวนเงิน</label><input class="input" id="xa" inputmode="decimal" required aria-describedby="xaMsg"><small class="field-msg" id="xaMsg"></small></div><div class="field"><label for="xb">ใครจ่าย</label><select class="input" id="xb"></select></div></div>
          <fieldset class="for"><legend>หารกับใคร</legend><div id="xfor" class="chips"></div></fieldset>
          <div class="actions"><button class="btn btn-gold">+ เพิ่มรายการ</button></div></form></section>
      <section class="step"><h3><span class="step-n">3</span>สรุป</h3><div class="stat-grid" id="sum"></div><div class="table-wrap"><table class="data-table"><thead><tr><th>ชื่อ</th><th>จ่ายไป</th><th>ส่วนที่ต้องจ่าย</th><th>คงเหลือ</th></tr></thead><tbody id="bal"></tbody></table></div>
        <h4 class="sub">ต้องโอน</h4><div class="out" id="tx"></div>
        <div class="actions"><button class="btn btn-gold" id="cp">คัดลอกสรุปไปส่ง LINE</button><button class="btn btn-ghost" id="reset">เริ่มทริปใหม่</button></div></section></div>`);
    body.append(ui);
    const save = () => store.set("trip", trip);
    const names = () => trip.people.map(p => p.n);
    const compute = () => {
      const paid = trip.people.map(() => 0), share = trip.people.map(() => 0);
      for (const it of trip.items) {
        const a = num(it.a), f = it.for.filter(i => i < trip.people.length); if (!f.length) continue;
        paid[it.by] += a; f.forEach(i => share[i] += a / f.length);
      }
      const bal = Object.fromEntries(trip.people.map((p, i) => [i, paid[i] - share[i]]));
      return { paid, share, tx: settle(bal).map(t => ({ ...t, from: +t.from, to: +t.to })) };
    };
    const draw = () => {
      $("#tn", ui).value = trip.name;
      $("#people", ui).innerHTML = trip.people.map((p, i) => `<div class="person"><span class="avatar" aria-hidden="true">${esc(initial(p.n))}</span><input class="input" data-pi="${i}" data-k="n" value="${esc(p.n)}" aria-label="ชื่อคนที่ ${i + 1}"><input class="input" data-pi="${i}" data-k="pp" value="${esc(p.pp || "")}" inputmode="numeric" placeholder="พร้อมเพย์ (ไม่บังคับ)" aria-label="พร้อมเพย์ของ ${esc(p.n)}"><button class="rm" data-rmp="${i}" aria-label="ลบ ${esc(p.n)}">✕</button></div>`).join("");
      $("#xb", ui).innerHTML = trip.people.map((p, i) => `<option value="${i}">${esc(p.n)}</option>`).join("");
      $("#xfor", ui).innerHTML = trip.people.map((p, i) => `<label class="chip-check"><input type="checkbox" value="${i}" checked><span>${esc(p.n)}</span></label>`).join("");
      $("#items", ui).innerHTML = trip.items.length ? trip.items.map((it, k) => `<div class="file-item"><div class="meta"><b>${esc(it.d)} · ${money(num(it.a))} ฿</b><small>${esc(trip.people[it.by]?.n || "?")} จ่าย · หาร ${it.for.length === trip.people.length ? "ทุกคน" : it.for.map(i => trip.people[i]?.n).filter(Boolean).join(", ")}</small></div><button class="rm" data-rmi="${k}" aria-label="ลบรายการ ${esc(it.d)}">✕</button></div>`).join("")
        : `<div class="empty-hint"><b>ยังไม่มีค่าใช้จ่าย</b><span>เพิ่มรายการแรกด้านล่าง เช่น ค่าที่พัก ค่าน้ำมัน</span></div>`;
      const { paid, share, tx } = compute(), total = paid.reduce((a, b) => a + b, 0);
      $("#sum", ui).innerHTML = [["ค่าใช้จ่ายรวม", money(total) + " ฿"], ["จำนวนคน", trip.people.length], ["เฉลี่ยต่อคน", trip.people.length ? money(total / trip.people.length) + " ฿" : "–"], ["ต้องโอน", tx.length + " ครั้ง"]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join("");
      $("#bal", ui).innerHTML = trip.people.map((p, i) => { const b = paid[i] - share[i]; return `<tr><td>${esc(p.n)}</td><td>${money(paid[i])}</td><td>${money(share[i])}</td><td><span class="${b > .004 ? "pos" : b < -.004 ? "neg" : ""}">${b > .004 ? "ได้คืน " + money(b) : b < -.004 ? "ต้องจ่าย " + money(-b) : "พอดี"}</span></td></tr>`; }).join("");
      $("#tx", ui).innerHTML = tx.length ? tx.map((t, k) => `<div class="file-item transfer"><div class="meta"><b>${esc(trip.people[t.from].n)} <span aria-hidden="true">→</span><span class="sr-only">โอนให้</span> ${esc(trip.people[t.to].n)}</b><small>โอน ${money(t.amount)} บาท</small></div>${promptpayTarget(trip.people[t.to].pp || "") ? `<button class="btn btn-ghost btn-sm" data-qr="${k}">QR รับเงิน</button>` : ""}</div><div class="qr-slot" id="qs${k}"></div>`).join("")
        : `<div class="empty-hint"><b>ไม่มีใครต้องโอน</b><span>${trip.items.length ? "ทุกคนจ่ายพอดีกับส่วนของตัวเองแล้ว" : "เพิ่มค่าใช้จ่ายเพื่อดูว่าใครต้องโอนให้ใคร"}</span></div>`;
      save();
    };
    $("#tn", ui).oninput = e => { trip.name = e.target.value; save(); };
    $("#people", ui).oninput = e => { const i = e.target.closest("[data-pi]"); if (!i) return; trip.people[+i.dataset.pi][i.dataset.k] = i.value; save(); };
    $("#people", ui).onchange = draw;
    $("#people", ui).onclick = e => {
      const b = e.target.closest("[data-rmp]"); if (!b) return; const i = +b.dataset.rmp;
      if (trip.items.some(it => it.by === i)) return toast("ลบไม่ได้: คนนี้มีรายการที่จ่ายไว้ ลบรายการก่อน");
      if (!confirm(`ลบ ${trip.people[i].n} ออกจากทริป?`)) return;
      trip.people.splice(i, 1);
      trip.items.forEach(it => { it.for = it.for.filter(x => x !== i).map(x => x > i ? x - 1 : x); if (it.by > i) it.by--; });
      draw();
    };
    $("#pf", ui).onsubmit = e => { e.preventDefault(); trip.people.push({ n: $("#pn", ui).value.trim(), pp: "" }); e.target.reset(); draw(); $("#pn", ui).focus(); };
    $("#xf", ui).onsubmit = e => {
      e.preventDefault();
      const a = num($("#xa", ui).value), msg = $("#xaMsg", ui), forIds = $$("#xfor input:checked", ui).map(c => +c.value);
      msg.className = "field-msg"; msg.textContent = "";
      if (!(a > 0)) { msg.classList.add("err"); msg.textContent = "ใส่จำนวนเงินมากกว่า 0"; $("#xa", ui).focus(); return; }
      if (!forIds.length) return toast("เลือกอย่างน้อย 1 คนที่จะหาร");
      trip.items.push({ d: $("#xd", ui).value.trim(), a, by: +$("#xb", ui).value, for: forIds });
      $("#xd", ui).value = ""; $("#xa", ui).value = ""; draw(); $("#xd", ui).focus(); toast("เพิ่มรายการแล้ว ✓");
    };
    $("#items", ui).onclick = e => { const b = e.target.closest("[data-rmi]"); if (b && confirm("ลบรายการนี้?")) { trip.items.splice(+b.dataset.rmi, 1); draw(); } };
    $("#tx", ui).onclick = async e => {
      const b = e.target.closest("[data-qr]"); if (!b) return;
      const t = compute().tx[+b.dataset.qr], slot = $(`#qs${b.dataset.qr}`, ui);
      if (slot.childElementCount) { slot.replaceChildren(); return; }
      const c = await qrCanvas(promptpayPayload(trip.people[t.to].pp, t.amount), 360); c.className = "qr-inline"; c.setAttribute("role", "img"); c.setAttribute("aria-label", `QR พร้อมเพย์ของ ${trip.people[t.to].n} ${money(t.amount)} บาท`);
      slot.replaceChildren(c);
    };
    $("#cp", ui).onclick = () => {
      const { paid, tx } = compute(), total = paid.reduce((a, b) => a + b, 0);
      copy([`🧾 ${trip.name}`, `รวม ${money(total)} บาท · ${trip.people.length} คน`, "", ...trip.items.map(it => `• ${it.d} ${money(num(it.a))} (${trip.people[it.by]?.n} จ่าย)`), "", "💸 ต้องโอน", ...(tx.length ? tx.map(t => `${trip.people[t.from].n} → ${trip.people[t.to].n}  ${money(t.amount)} บาท`) : ["ไม่มีใครต้องโอน"])].join("\n"));
    };
    $("#reset", ui).onclick = () => { if (!confirm("เริ่มทริปใหม่? รายการของทริปนี้จะหายไป (คนในทริปยังอยู่)")) return; trip = { name: "ทริปใหม่", people: trip.people, items: [] }; draw(); };
    draw();
  },
});

// ---------- Receipt / invoice / quotation ----------
const DOC_TYPES = { receipt: ["ใบเสร็จรับเงิน", "RC"], invoice: ["ใบแจ้งหนี้", "INV"], quote: ["ใบเสนอราคา", "QT"], taxinv: ["ใบเสร็จรับเงิน / ใบกำกับภาษี", "TX"] };

tool({
  id: "invoice", cat: "money", also: ["docs"], icon: I.receipt, name: "ใบเสร็จ / ใบแจ้งหนี้ / ใบเสนอราคา",
  desc: "กรอกรายการแล้วได้เอกสาร PDF ภาษาไทย คิด VAT 7% หัก ณ ที่จ่าย ส่วนลด และคำอ่านเป็นตัวอักษรให้อัตโนมัติ ใส่ QR พร้อมเพย์ได้",
  keywords: "receipt invoice quotation ใบเสร็จ ใบแจ้งหนี้ ใบเสนอราคา ใบกำกับภาษี pdf ฟรีแลนซ์ ร้านค้า vat",
  render(body) {
    const today = new Date().toISOString().slice(0, 10);
    let items = store.get("invoice-items", [{ d: "ออกแบบโลโก้", q: 1, p: 5000 }, { d: "แก้ไขเพิ่มเติม", q: 2, p: 500 }]);
    const ui = h(`<div class="inv">
      <div class="tabs" id="type" role="radiogroup" aria-label="ประเภทเอกสาร">${Object.entries(DOC_TYPES).map(([k, [n]], i) => `<button class="chip${i ? "" : " active"}" role="radio" aria-checked="${!i}" data-t="${k}">${n}</button>`).join("")}</div>
      <details class="note" open><summary>ผู้ออกเอกสาร (จำไว้ใช้ครั้งต่อไป)</summary>
        <div class="row"><div class="field"><label for="sn">ชื่อ / ชื่อร้าน / บริษัท</label><input class="input" id="sn" value="ชื่อของคุณ"></div><div class="field"><label for="stax">เลขผู้เสียภาษี (ถ้ามี)</label><input class="input" id="stax" inputmode="numeric"></div></div>
        <div class="row"><div class="field" style="flex:2"><label for="sa">ที่อยู่</label><input class="input" id="sa"></div><div class="field"><label for="sp">โทร</label><input class="input" id="sp" type="tel" inputmode="tel"></div></div>
        <div class="row"><div class="field"><label for="spp">พร้อมเพย์สำหรับรับเงิน (ไม่บังคับ)</label><input class="input" id="spp" inputmode="numeric" placeholder="ใส่แล้วจะมี QR ในเอกสาร"></div><div class="field"><label for="bank">บัญชีธนาคาร (ไม่บังคับ)</label><input class="input" id="bank" placeholder="เช่น กสิกร 123-4-56789-0 นายตัวอย่าง"></div></div></details>
      <details class="note" open><summary>ลูกค้า & เลขที่เอกสาร</summary>
        <div class="row"><div class="field"><label for="cn">ชื่อลูกค้า</label><input class="input" id="cn" value="ลูกค้าตัวอย่าง"></div><div class="field"><label for="ctax">เลขผู้เสียภาษีลูกค้า</label><input class="input" id="ctax" inputmode="numeric"></div></div>
        <div class="row"><div class="field" style="flex:2"><label for="ca">ที่อยู่ลูกค้า</label><input class="input" id="ca"></div></div>
        <div class="row"><div class="field"><label for="no">เลขที่</label><input class="input" id="no"></div><div class="field"><label for="dt">วันที่</label><input class="input" type="date" id="dt" value="${today}"></div><div class="field"><label for="due">ครบกำหนด / ยืนราคาถึง</label><input class="input" type="date" id="due"></div></div></details>
      <h3 class="sub">รายการ</h3>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>รายการ</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>รวม</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="add">+ เพิ่มรายการ</button></div>
      <div class="row"><div class="field"><label for="disc">ส่วนลด (บาท)</label><input class="input" id="disc" inputmode="decimal" value="0"></div><div class="field"><label for="vat">VAT</label><select class="input" id="vat"><option value="none">ไม่มี VAT</option><option value="ex">บวก VAT 7%</option><option value="in">ราคารวม VAT แล้ว</option></select></div><div class="field"><label for="wht">หัก ณ ที่จ่าย</label><select class="input" id="wht"><option value="0">ไม่หัก</option><option value="1">1%</option><option value="2">2%</option><option value="3">3% (ค่าบริการ)</option><option value="5">5% (ค่าเช่า)</option></select></div></div>
      <div class="field" style="margin-top:12px"><label for="note">หมายเหตุ</label><input class="input" id="note" placeholder="เช่น ชำระภายใน 7 วัน"></div>
      <p class="hint" id="taxHint" hidden>ใบกำกับภาษีออกได้เฉพาะผู้จดทะเบียนภาษีมูลค่าเพิ่ม และต้องมีข้อมูลตามที่กรมสรรพากรกำหนด ตรวจสอบความถูกต้องก่อนใช้จริง</p>
      <h3 class="sub">ตัวอย่างเอกสาร</h3>
      <div class="paper-frame" id="frame"><div class="paper" id="paper"></div></div>
      <div class="actions"><button class="btn btn-gold" id="pdf">บันทึก PDF</button><button class="btn btn-ghost" id="png">บันทึกเป็นรูป</button><button class="btn btn-ghost" id="print">พิมพ์</button><button class="btn btn-ghost" id="next">เลขที่ถัดไป</button></div>
      <div class="status" id="st" role="status"></div></div>`);
    body.append(ui);
    let type = "receipt";
    const nextNo = (t) => { const [, pre] = DOC_TYPES[t], n = store.get("docno:" + t, 0) + 1; return `${pre}-${new Date().getFullYear() + 543}-${String(n).padStart(4, "0")}`; };
    $("#no", ui).value = nextNo(type);
    const tb = $("#tb", ui);
    const drawItems = () => { tb.innerHTML = items.map((r, i) => `<tr data-i="${i}"><td><input class="input sym" style="width:180px;text-transform:none" data-k="d" value="${esc(r.d)}" aria-label="รายการที่ ${i + 1}"></td><td><input class="input" data-k="q" inputmode="decimal" value="${r.q}" style="width:70px" aria-label="จำนวน"></td><td><input class="input" data-k="p" inputmode="decimal" value="${r.p}" style="width:100px" aria-label="ราคาต่อหน่วย"></td><td data-o></td><td><button class="rm" data-rm="${i}" aria-label="ลบรายการที่ ${i + 1}">✕</button></td></tr>`).join(""); calc(); };
    const totals = () => {
      const sub = items.reduce((s, r) => s + num(r.q) * num(r.p), 0), disc = num($("#disc", ui).value), net = Math.max(0, sub - disc), mode = $("#vat", ui).value;
      const base = mode === "in" ? net / 1.07 : net, vat = mode === "none" ? 0 : base * .07, total = base + vat, wht = base * +$("#wht", ui).value / 100;
      return { sub, disc, base, vat, total, wht, pay: total - wht, mode };
    };
    const v = (id) => esc($("#" + id, ui).value.trim());
    const thDate = (s) => s ? new Date(s + "T00:00").toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : "";
    async function paper() {
      const T = totals(), [title] = DOC_TYPES[type], t = promptpayTarget($("#spp", ui).value);
      const rows = items.filter(r => r.d || num(r.p)).map((r, i) => `<tr><td>${i + 1}</td><td class="l">${esc(r.d)}</td><td>${num(r.q).toLocaleString("th-TH")}</td><td>${money(num(r.p))}</td><td>${money(num(r.q) * num(r.p))}</td></tr>`).join("");
      const line = (k, val, cls = "") => `<tr class="${cls}"><td>${k}</td><td>${val}</td></tr>`;
      $("#paper", ui).innerHTML = `<header class="p-head"><div><div class="p-seller">${v("sn")}</div><div class="p-small">${v("sa")}${v("sp") ? `<br>โทร ${v("sp")}` : ""}${v("stax") ? `<br>เลขประจำตัวผู้เสียภาษี ${v("stax")}` : ""}</div></div><div class="p-title"><h1>${title}</h1><div class="p-small">เลขที่ <b>${v("no")}</b><br>วันที่ ${thDate($("#dt", ui).value)}${$("#due", ui).value ? `<br>${type === "quote" ? "ยืนราคาถึง" : "ครบกำหนด"} ${thDate($("#due", ui).value)}` : ""}</div></div></header>
        <section class="p-cust"><div class="p-label">${type === "quote" ? "เสนอราคาให้" : "ลูกค้า"}</div><div><b>${v("cn")}</b><div class="p-small">${v("ca")}${v("ctax") ? `<br>เลขประจำตัวผู้เสียภาษี ${v("ctax")}` : ""}</div></div></section>
        <table class="p-items"><thead><tr><th>#</th><th class="l">รายการ</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>จำนวนเงิน</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="l p-small">ยังไม่มีรายการ</td></tr>`}</tbody></table>
        <div class="p-bottom"><div class="p-words"><div class="p-label">จำนวนเงิน (ตัวอักษร)</div><b>${bahtText(T.pay.toFixed(2)) || ""}</b>${v("note") ? `<div class="p-small" style="margin-top:10px">หมายเหตุ: ${v("note")}</div>` : ""}${v("bank") ? `<div class="p-small" style="margin-top:6px">ชำระเงิน: ${v("bank")}</div>` : ""}<div class="p-qr" id="pqr"></div></div>
          <table class="p-sum">${line("รวมเป็นเงิน", money(T.sub))}${T.disc ? line("ส่วนลด", "−" + money(T.disc)) : ""}${T.mode !== "none" ? line("มูลค่าก่อนภาษี", money(T.base)) + line("ภาษีมูลค่าเพิ่ม 7%", money(T.vat)) : ""}${line("รวมทั้งสิ้น", money(T.total), "grand")}${T.wht ? line(`หัก ณ ที่จ่าย ${$("#wht", ui).value}%`, "−" + money(T.wht)) + line("ยอดชำระสุทธิ", money(T.pay), "grand") : ""}</table></div>
        <footer class="p-sign"><div>ผู้${type === "quote" ? "เสนอราคา" : "รับเงิน"}<span></span>(${v("sn")})</div><div>${type === "quote" ? "ผู้อนุมัติ" : "ผู้จ่ายเงิน"}<span></span>(${v("cn")})</div></footer>`;
      if (t && T.pay > 0 && type !== "quote") { const c = await qrCanvas(promptpayPayload($("#spp", ui).value, T.pay.toFixed(2)), 220); c.setAttribute("aria-label", "QR พร้อมเพย์สำหรับชำระเงิน"); $("#pqr", ui).replaceChildren(c, Object.assign(document.createElement("span"), { textContent: "สแกนจ่ายด้วยพร้อมเพย์" })); }
      fit();
    }
    // Scale the A4 preview (794px wide) to the panel width.
    const fit = () => { const f = $("#frame", ui), p = $("#paper", ui), s = Math.min(1, f.clientWidth / 794); p.style.transform = `scale(${s})`; f.style.height = p.offsetHeight * s + "px"; };
    let timer;
    const calc = () => {
      items.forEach((r, i) => { const o = $("[data-o]", tb.children[i]); if (o) o.textContent = money(num(r.q) * num(r.p)); });
      store.set("invoice-items", items);
      clearTimeout(timer); timer = setTimeout(paper, 120);
    };
    tb.oninput = e => { const inp = e.target.closest("[data-k]"); if (inp) { items[+inp.closest("tr").dataset.i][inp.dataset.k] = inp.value; calc(); } };
    tb.onclick = e => { const b = e.target.closest("[data-rm]"); if (b) { items.splice(+b.dataset.rm, 1); drawItems(); } };
    $("#add", ui).onclick = () => { items.push({ d: "", q: 1, p: 0 }); drawItems(); $$("input.sym", tb).at(-1).focus(); };
    $("#type", ui).onclick = e => {
      const b = e.target.closest("[data-t]"); if (!b) return; type = b.dataset.t;
      $$("#type .chip", ui).forEach(x => { x.classList.toggle("active", x === b); x.setAttribute("aria-checked", x === b); });
      $("#no", ui).value = nextNo(type); $("#taxHint", ui).hidden = type !== "taxinv";
      if (type === "taxinv" && $("#vat", ui).value === "none") $("#vat", ui).value = "ex";
      calc();
    };
    $$("input:not([data-k]), select", ui).forEach(i => i.addEventListener("input", calc));
    async function snapshot() {
      await loadScript(LIB.html2canvas);
      const clone = $("#paper", ui).cloneNode(true); clone.style.transform = "none";
      // html2canvas cannot read canvas pixels from a clone, so copy the QR across as an image.
      const q = $("#pqr canvas", ui); if (q) $("#pqr canvas", clone)?.replaceWith(Object.assign(new Image(), { src: q.toDataURL(), width: 110, height: 110 }));
      const host = document.createElement("div"); host.className = "paper-host"; host.append(clone); document.body.append(host);
      try { return await html2canvas(clone, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false }); } finally { host.remove(); }
    }
    const fname = () => `${$("#no", ui).value || "document"}`;
    const done = (what) => { store.set("docno:" + type, Math.max(store.get("docno:" + type, 0), +($("#no", ui).value.match(/(\d+)$/) || [, 0])[1])); setStatus($("#st", ui), `${what} ✓ กด “เลขที่ถัดไป” เมื่อจะออกเอกสารใบใหม่`); };
    $("#pdf", ui).onclick = async () => {
      setStatus($("#st", ui), "กำลังสร้าง PDF…");
      try {
        const c = await snapshot(); await loadScript(LIB.jspdf);
        const doc = new jspdf.jsPDF({ unit: "mm", format: "a4" }), W = 210, H = 297, pageH = Math.floor(c.width * H / W);
        // Slice the tall canvas into A4 pages; ignore rounding slivers so a one-page sheet stays one page.
        for (let y = 0, first = true; c.height - y > 8; y += pageH, first = false) {
          const part = document.createElement("canvas"); part.width = c.width; part.height = Math.min(pageH, c.height - y);
          const px = part.getContext("2d"); px.fillStyle = "#fff"; px.fillRect(0, 0, part.width, part.height); px.drawImage(c, 0, -y);
          if (!first) doc.addPage();
          doc.addImage(part.toDataURL("image/jpeg", .95), "JPEG", 0, 0, W, part.height * W / part.width);
        }
        download(doc.output("blob"), fname() + ".pdf"); done("บันทึก PDF แล้ว");
      } catch (e) { setStatus($("#st", ui), "สร้าง PDF ไม่สำเร็จ: " + e.message, true); }
    };
    $("#png", ui).onclick = async () => { try { download(await canvasBlob(await snapshot()), fname() + ".png"); done("บันทึกรูปแล้ว"); } catch (e) { setStatus($("#st", ui), e.message, true); } };
    $("#print", ui).onclick = () => {
      const w = open("", "_blank"); if (!w) return toast("เบราว์เซอร์บล็อกหน้าต่างใหม่");
      const css = [...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).filter(t => /\.p-|\.paper/.test(t)).join("\n"); } catch { return ""; } }).join("\n");
      w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(fname())}</title><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600&display=swap" rel="stylesheet"><style>${css}body{margin:0}.paper{transform:none!important;box-shadow:none!important}@page{size:A4;margin:0}</style></head><body>${$("#paper", ui).outerHTML.replace(/<canvas[^>]*><\/canvas>/, $("#pqr canvas", ui) ? `<img src="${$("#pqr canvas", ui).toDataURL()}" width="110" height="110" alt="">` : "")}</body></html>`);
      w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 600); done("ส่งไปพิมพ์แล้ว");
    };
    // Saving records the issued number, so "next" is always last issued + 1.
    $("#next", ui).onclick = () => { $("#no", ui).value = nextNo(type); calc(); };
    addEventListener("resize", fit);
    drawItems();
    return () => removeEventListener("resize", fit);
  },
});
