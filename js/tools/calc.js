// Calculators: general, percent, VAT/discount, loan, savings, Thai income tax, BMI, age/date, split bill, units.

// Safe expression evaluator (no eval): + − × ÷ ^ % ( ) and √.
function evaluate(expr) {
  const s = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,/g, "").replace(/\s+/g, "");
  let i = 0;
  const peek = () => s[i], eat = (c) => s[i] === c && ++i;
  const atom = () => {
    if (eat("(")) { const v = add(); if (!eat(")")) throw 0; return v; }
    if (eat("√")) return Math.sqrt(unary());
    const m = s.slice(i).match(/^\d*\.?\d+(e[+-]?\d+)?/i); if (!m) throw 0;
    i += m[0].length; return parseFloat(m[0]);
  };
  const postfix = () => { let v = atom(); while (peek() === "%") { i++; v /= 100; } return v; };
  const unary = () => eat("-") ? -unary() : eat("+") ? unary() : postfix();
  const pow = () => { const b = unary(); return eat("^") ? b ** pow() : b; };
  const mul = () => { let v = pow(); for (;;) { if (eat("*")) v *= pow(); else if (eat("/")) v /= pow(); else return v; } };
  const add = () => { let v = mul(); for (;;) { if (eat("+")) v += mul(); else if (eat("-")) v -= mul(); else return v; } };
  const v = add(); if (i < s.length) throw 0;
  return v;
}
const nice = (v) => Number.isFinite(v) ? (+v.toPrecision(12)).toLocaleString("en-US", { maximumFractionDigits: 10 }) : "Error";

tool({
  id: "calculator", cat: "คำนวณ", icon: I.calc, name: "เครื่องคิดเลข",
  desc: "เครื่องคิดเลขพร้อมวงเล็บ ยกกำลัง รากที่สอง เปอร์เซ็นต์ และประวัติการคำนวณ ใช้คีย์บอร์ดได้",
  keywords: "calculator คิดเลข คำนวณ บวก ลบ คูณ หาร",
  render(body) {
    const keys = ["C", "(", ")", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "√", "0", ".", "^", "%", "⌫", "Ans", "="];
    const ui = h(`<div><div class="calc-screen"><small id="ex"></small><b id="res">0</b></div>
      <div class="calc-grid">${keys.map(k => `<button class="${"÷×−+^%√".includes(k) ? "op" : ""}${k === "=" ? " eq" : ""}" data-k="${k}">${k}</button>`).join("")}</div>
      <div class="out" id="hist"></div></div>`);
    body.append(ui);
    let expr = "", ans = 0, hist = store.get("calc-hist", []);
    const show = () => { $("#ex", ui).textContent = expr; try { $("#res", ui).textContent = expr ? nice(evaluate(expr.replace(/Ans/g, `(${ans})`))) : nice(ans); } catch { $("#res", ui).textContent = "…"; } };
    const drawHist = () => $("#hist", ui).innerHTML = hist.slice(0, 6).map(([e, r]) => `<div class="file-item" style="cursor:pointer" data-r="${esc(r)}"><div class="meta"><small>${esc(e)}</small><b>= ${esc(r)}</b></div></div>`).join("");
    const press = k => {
      if (k === "C") expr = "";
      else if (k === "⌫") expr = expr.endsWith("Ans") ? expr.slice(0, -3) : expr.slice(0, -1);
      else if (k === "=") {
        try { const v = evaluate(expr.replace(/Ans/g, `(${ans})`)); if (!Number.isFinite(v)) throw 0; hist.unshift([expr, nice(v)]); hist = hist.slice(0, 20); store.set("calc-hist", hist); ans = v; expr = ""; drawHist(); }
        catch { toast("รูปแบบไม่ถูกต้อง"); }
      } else expr += k;
      show();
    };
    $(".calc-grid", ui).onclick = e => { const b = e.target.closest("[data-k]"); if (b) press(b.dataset.k); };
    $("#hist", ui).onclick = e => { const r = e.target.closest("[data-r]"); if (r) { expr += r.dataset.r.replace(/,/g, ""); show(); } };
    const onKey = e => {
      if (e.target.closest("input, textarea")) return;
      const map = { "*": "×", "/": "÷", "-": "−", Enter: "=", "=": "=", Backspace: "⌫", Escape: null, Delete: "C" };
      const k = e.key in map ? map[e.key] : /^[\d.+()^%]$/.test(e.key) ? e.key : null;
      if (k) { e.preventDefault(); press(k); }
    };
    addEventListener("keydown", onKey);
    show(); drawHist();
    return () => removeEventListener("keydown", onKey);
  },
});

tool({
  id: "percent", cat: "คำนวณ", icon: I.percent, name: "คำนวณเปอร์เซ็นต์",
  desc: "หา X% ของจำนวน, A เป็นกี่ % ของ B, และเพิ่ม/ลดลงกี่เปอร์เซ็นต์",
  keywords: "percent เปอร์เซ็นต์ ร้อยละ เพิ่มขึ้น ลดลง",
  render(body) {
    const ui = h(`<div>
      <div class="result"><div class="row" style="margin-top:0;align-items:center"><input class="input" id="a1" value="15" style="flex:1"><span>% ของ</span><input class="input" id="b1" value="2500" style="flex:1"><span>=</span><b id="r1" style="flex:1"></b></div></div>
      <div class="result"><div class="row" style="margin-top:0;align-items:center"><input class="input" id="a2" value="375" style="flex:1"><span>เป็นกี่ % ของ</span><input class="input" id="b2" value="2500" style="flex:1"><span>=</span><b id="r2" style="flex:1"></b></div></div>
      <div class="result"><div class="row" style="margin-top:0;align-items:center"><span>จาก</span><input class="input" id="a3" value="2000" style="flex:1"><span>เป็น</span><input class="input" id="b3" value="2500" style="flex:1"><span>=</span><b id="r3" style="flex:1"></b></div></div></div>`);
    body.append(ui);
    const run = () => {
      const v = id => num($("#" + id, ui).value);
      $("#r1", ui).textContent = nice(v("a1") * v("b1") / 100);
      $("#r2", ui).textContent = v("b2") ? nice(v("a2") / v("b2") * 100) + "%" : "—";
      const d = v("a3") ? (v("b3") - v("a3")) / v("a3") * 100 : NaN;
      $("#r3", ui).textContent = isNaN(d) ? "—" : (d >= 0 ? "เพิ่ม " : "ลด ") + nice(Math.abs(d)) + "%";
    };
    $$("input", ui).forEach(i => { i.inputMode = "decimal"; i.oninput = run; }); run();
  },
});

tool({
  id: "vat", cat: "คำนวณ", icon: I.receipt, name: "VAT 7% & ส่วนลด",
  desc: "คำนวณภาษีมูลค่าเพิ่ม (รวม/แยก VAT), หัก ณ ที่จ่าย และราคาหลังหักส่วนลด",
  keywords: "vat 7% ภาษีมูลค่าเพิ่ม ส่วนลด discount หัก ณ ที่จ่าย withholding",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>จำนวนเงิน (บาท)</label><input class="input" id="a" inputmode="decimal" value="1000"></div>
      <div class="field"><label>ราคานี้</label><select class="input" id="m"><option value="ex">ยังไม่รวม VAT</option><option value="in">รวม VAT แล้ว</option></select></div></div>
      <div class="row"><div class="field"><label>VAT (%)</label><input class="input" id="v" inputmode="decimal" value="7"></div><div class="field"><label>ส่วนลด (%)</label><input class="input" id="d" inputmode="decimal" value="0"></div><div class="field"><label>หัก ณ ที่จ่าย (%)</label><select class="input" id="w"><option value="0">ไม่หัก</option><option value="1">1% ค่าขนส่ง</option><option value="2">2% ค่าโฆษณา</option><option value="3">3% ค่าบริการ</option><option value="5">5% ค่าเช่า</option></select></div></div>
      <div class="kv" id="kv"></div></div>`);
    body.append(ui);
    const run = () => {
      const amt = num($("#a", ui).value), vr = num($("#v", ui).value) / 100, dr = num($("#d", ui).value) / 100, wr = +$("#w", ui).value / 100;
      let base = $("#m", ui).value === "in" ? amt / (1 + vr) : amt;
      const disc = base * dr; base -= disc;
      const vat = base * vr, total = base + vat, wht = base * wr;
      const rows = [["ส่วนลด", -disc], ["ราคาก่อน VAT", base], ["VAT", vat], ["รวมทั้งสิ้น", total], ...(wr ? [["หัก ณ ที่จ่าย", -wht], ["ยอดชำระจริง", total - wht]] : [])];
      $("#kv", ui).innerHTML = rows.filter(r => r[0] !== "ส่วนลด" || dr).map(([k, v]) => `<span>${k}</span><code style="text-align:right;font-size:1rem">${money(v)}</code><span>บาท</span>`).join("");
    };
    $$("input, select", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "loan", cat: "คำนวณ", icon: I.bank, name: "คำนวณค่างวด / ผ่อน",
  desc: "คำนวณค่างวดรถ บ้าน หรือสินเชื่อ ทั้งแบบดอกเบี้ยคงที่ (Flat rate) และลดต้นลดดอก",
  keywords: "loan installment ผ่อน ค่างวด ดอกเบี้ย รถ บ้าน สินเชื่อ flat rate",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>ยอดจัด / เงินกู้ (บาท)</label><input class="input" id="p" inputmode="decimal" value="500000"></div><div class="field"><label>ดอกเบี้ย (% ต่อปี)</label><input class="input" id="r" inputmode="decimal" value="3.5"></div></div>
      <div class="row"><div class="field"><label>ระยะเวลา (เดือน)</label><input class="input" id="n" inputmode="numeric" value="60"></div><div class="field"><label>วิธีคิดดอกเบี้ย</label><select class="input" id="m"><option value="flat">คงที่ (Flat rate) — รถยนต์</option><option value="eff">ลดต้นลดดอก — บ้าน/สินเชื่อ</option></select></div></div>
      <div class="result center"><small style="color:var(--muted)">ค่างวดต่อเดือน</small><div class="big sm" id="pay"></div></div><div class="kv" id="kv"></div></div>`);
    body.append(ui);
    const run = () => {
      const P = num($("#p", ui).value), r = num($("#r", ui).value) / 100, n = Math.max(1, Math.round(num($("#n", ui).value)));
      let pay;
      if ($("#m", ui).value === "flat") pay = (P + P * r * n / 12) / n;
      else { const i = r / 12; pay = i ? P * i / (1 - (1 + i) ** -n) : P / n; }
      $("#pay", ui).textContent = money(pay) + " ฿";
      $("#kv", ui).innerHTML = [["ยอดชำระทั้งหมด", pay * n], ["ดอกเบี้ยทั้งหมด", pay * n - P]].map(([k, v]) => `<span>${k}</span><code style="text-align:right;font-size:1rem">${money(v)}</code><span>บาท</span>`).join("");
    };
    $$("input, select", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "savings", cat: "คำนวณ", icon: I.bank, name: "ดอกเบี้ยทบต้น / ออมเงิน",
  desc: "คำนวณเงินออมรายเดือนพร้อมดอกเบี้ยทบต้น ดูว่าเงินจะงอกเงยเท่าไรในอนาคต",
  keywords: "compound interest savings ออมเงิน ดอกเบี้ยทบต้น ลงทุน dca",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>เงินต้นเริ่มต้น</label><input class="input" id="p" inputmode="decimal" value="10000"></div><div class="field"><label>ออมเพิ่มต่อเดือน</label><input class="input" id="m" inputmode="decimal" value="3000"></div></div>
      <div class="row"><div class="field"><label>ผลตอบแทน (% ต่อปี)</label><input class="input" id="r" inputmode="decimal" value="5"></div><div class="field"><label>ระยะเวลา (ปี)</label><input class="input" id="y" inputmode="numeric" value="10"></div></div>
      <div class="result center"><small style="color:var(--muted)">มูลค่าในอนาคต</small><div class="big sm" id="fv"></div></div><div class="kv" id="kv"></div></div>`);
    body.append(ui);
    const run = () => {
      const P = num($("#p", ui).value), M = num($("#m", ui).value), i = num($("#r", ui).value) / 100 / 12, n = Math.round(num($("#y", ui).value) * 12);
      let v = P; for (let k = 0; k < n; k++) v = v * (1 + i) + M;
      const paid = P + M * n;
      $("#fv", ui).textContent = money(v, 0) + " ฿";
      $("#kv", ui).innerHTML = [["เงินที่ออมทั้งหมด", paid], ["ดอกเบี้ย/กำไร", v - paid]].map(([k, x]) => `<span>${k}</span><code style="text-align:right;font-size:1rem">${money(x, 0)}</code><span>บาท</span>`).join("");
    };
    $$("input", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "income-tax", cat: "คำนวณ", icon: I.receipt, name: "ภาษีเงินได้บุคคลธรรมดา",
  desc: "ประมาณการภาษีเงินได้จากเงินเดือนตามอัตราขั้นบันได หักค่าใช้จ่ายและค่าลดหย่อนพื้นฐาน",
  keywords: "income tax ภาษี เงินได้ ภงด 91 ลดหย่อน เงินเดือน",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>เงินเดือน (บาท/เดือน)</label><input class="input" id="s" inputmode="decimal" value="40000"></div><div class="field"><label>โบนัส/รายได้อื่นต่อปี</label><input class="input" id="b" inputmode="decimal" value="0"></div></div>
      <div class="row"><div class="field"><label>ค่าลดหย่อนเพิ่มเติม (ประกันสังคม, ประกันชีวิต, กองทุน ฯลฯ)</label><input class="input" id="d" inputmode="decimal" value="9000"></div></div>
      <div class="result center"><small style="color:var(--muted)">ภาษีที่ต้องจ่ายต่อปี (ประมาณ)</small><div class="big sm" id="tax"></div></div><div class="kv" id="kv"></div>
      <p class="hint">คำนวณตามอัตราภาษีขั้นบันได หักค่าใช้จ่าย 50% (สูงสุด 100,000) และลดหย่อนส่วนตัว 60,000 บาท ผลลัพธ์เป็นค่าประมาณ ไม่ใช่คำแนะนำทางภาษี</p></div>`);
    body.append(ui);
    const BR = [[150000, 0], [300000, .05], [500000, .10], [750000, .15], [1000000, .20], [2000000, .25], [5000000, .30], [Infinity, .35]];
    const run = () => {
      const income = num($("#s", ui).value) * 12 + num($("#b", ui).value);
      const net = Math.max(0, income - Math.min(income * .5, 100000) - 60000 - num($("#d", ui).value));
      let tax = 0, prev = 0, rate = 0;
      for (const [cap, r] of BR) { if (net > prev) { tax += (Math.min(net, cap) - prev) * r; rate = r; } prev = cap; }
      $("#tax", ui).textContent = money(tax, 0) + " ฿";
      $("#kv", ui).innerHTML = [["รายได้ทั้งปี", income], ["เงินได้สุทธิ", net], ["อัตราภาษีขั้นสูงสุด", null], ["เฉลี่ยต่อเดือน", tax / 12]]
        .map(([k, v]) => `<span>${k}</span><code style="text-align:right;font-size:1rem">${v === null ? rate * 100 + "%" : money(v, 0)}</code><span>${v === null ? "" : "บาท"}</span>`).join("");
    };
    $$("input", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "bmi", cat: "คำนวณ", icon: I.heart, name: "BMI & แคลอรี่",
  desc: "คำนวณดัชนีมวลกาย (BMI เกณฑ์คนเอเชีย) และพลังงานที่ร่างกายต้องการต่อวัน (BMR/TDEE)",
  keywords: "bmi bmr tdee calories น้ำหนัก ส่วนสูง แคลอรี่ ลดน้ำหนัก สุขภาพ",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>น้ำหนัก (กก.)</label><input class="input" id="w" inputmode="decimal" value="65"></div><div class="field"><label>ส่วนสูง (ซม.)</label><input class="input" id="hgt" inputmode="decimal" value="170"></div></div>
      <div class="row"><div class="field"><label>อายุ (ปี)</label><input class="input" id="a" inputmode="numeric" value="30"></div><div class="field"><label>เพศ</label><select class="input" id="g"><option value="m">ชาย</option><option value="f">หญิง</option></select></div>
      <div class="field"><label>กิจกรรม</label><select class="input" id="act"><option value="1.2">นั่งทำงาน ไม่ออกกำลัง</option><option value="1.375">ออกกำลัง 1-3 วัน/สัปดาห์</option><option value="1.55" selected>ออกกำลัง 3-5 วัน/สัปดาห์</option><option value="1.725">ออกกำลัง 6-7 วัน/สัปดาห์</option></select></div></div>
      <div class="result center"><small style="color:var(--muted)">BMI</small><div class="big sm" id="bmi"></div><b id="lvl"></b></div><div class="kv" id="kv"></div></div>`);
    body.append(ui);
    const run = () => {
      const w = num($("#w", ui).value), hm = num($("#hgt", ui).value) / 100, a = num($("#a", ui).value), male = $("#g", ui).value === "m";
      const bmi = hm ? w / hm / hm : 0;
      const lvl = bmi < 18.5 ? "น้ำหนักน้อย" : bmi < 23 ? "ปกติ (สุขภาพดี)" : bmi < 25 ? "ท้วม" : bmi < 30 ? "อ้วนระดับ 1" : "อ้วนระดับ 2";
      const bmr = 10 * w + 6.25 * hm * 100 - 5 * a + (male ? 5 : -161), tdee = bmr * +$("#act", ui).value;
      $("#bmi", ui).textContent = bmi.toFixed(1); $("#lvl", ui).textContent = lvl;
      $("#kv", ui).innerHTML = [["น้ำหนักที่เหมาะสม", `${(18.5 * hm * hm).toFixed(1)} – ${(22.9 * hm * hm).toFixed(1)}`, "กก."], ["BMR (พลังงานพื้นฐาน)", Math.round(bmr).toLocaleString(), "kcal/วัน"], ["TDEE (คงน้ำหนัก)", Math.round(tdee).toLocaleString(), "kcal/วัน"], ["ลดน้ำหนัก (−500)", Math.round(tdee - 500).toLocaleString(), "kcal/วัน"]]
        .map(([k, v, u]) => `<span>${k}</span><code style="text-align:right;font-size:1rem">${v}</code><span>${u}</span>`).join("");
    };
    $$("input, select", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "date-calc", cat: "คำนวณ", icon: I.cake, name: "คำนวณอายุ & วันที่",
  desc: "คำนวณอายุแบบละเอียด นับจำนวนวันระหว่างสองวัน และบวก/ลบวันจากวันที่ที่กำหนด",
  keywords: "age date difference อายุ นับวัน ระยะเวลา วันเกิด countdown",
  render(body) {
    const today = new Date().toISOString().slice(0, 10);
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>วันเริ่มต้น / วันเกิด</label><input class="input" type="date" id="a" value="1995-06-15"></div><div class="field"><label>ถึงวันที่</label><input class="input" type="date" id="b" value="${today}"></div></div>
      <div class="result center"><div class="big sm" id="age"></div></div><div class="kv" id="kv"></div>
      <div class="row"><div class="field"><label>บวก/ลบ จำนวนวันจากวันเริ่มต้น</label><input class="input" type="number" id="add" value="100"></div><div class="field"><label>ผลลัพธ์</label><input class="input" id="addr" readonly></div></div></div>`);
    body.append(ui);
    const run = () => {
      const a = new Date($("#a", ui).value), b = new Date($("#b", ui).value);
      if (isNaN(a) || isNaN(b)) return;
      const [s, e] = a <= b ? [a, b] : [b, a];
      let y = e.getFullYear() - s.getFullYear(), m = e.getMonth() - s.getMonth(), d = e.getDate() - s.getDate();
      if (d < 0) { m--; d += new Date(e.getFullYear(), e.getMonth(), 0).getDate(); }
      if (m < 0) { y--; m += 12; }
      const days = Math.round((e - s) / 864e5);
      $("#age", ui).textContent = `${y} ปี ${m} เดือน ${d} วัน`;
      const nb = new Date(e.getFullYear(), a.getMonth(), a.getDate()); if (nb < e) nb.setFullYear(nb.getFullYear() + 1);
      $("#kv", ui).innerHTML = [["รวมทั้งหมด", days.toLocaleString() + " วัน"], ["", (days / 7).toFixed(1) + " สัปดาห์"], ["", Math.round(days * 24).toLocaleString() + " ชั่วโมง"], ["ครบรอบครั้งถัดไปอีก", Math.round((nb - e) / 864e5) + " วัน"], ["วันเริ่มต้นตรงกับวัน", a.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })]]
        .map(([k, v]) => `<span>${k}</span><code style="font-size:.95rem">${v}</code><span></span>`).join("");
      const r = new Date(a); r.setDate(r.getDate() + Math.round(num($("#add", ui).value)));
      $("#addr", ui).value = r.toLocaleDateString("th-TH", { weekday: "short", year: "numeric", month: "long", day: "numeric" });
    };
    $$("input", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "split-bill", cat: "คำนวณ", icon: I.users, name: "หารค่าอาหาร",
  desc: "หารบิลกับเพื่อน รวมเซอร์วิสชาร์จ 10% VAT 7% และทิป ปัดเศษให้อัตโนมัติ",
  keywords: "split bill หารค่าอาหาร service charge tip ทิป เพื่อน",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>ยอดรวมในบิล (บาท)</label><input class="input" id="t" inputmode="decimal" value="2450"></div><div class="field"><label>จำนวนคน</label><input class="input" id="n" inputmode="numeric" value="4"></div></div>
      <div class="actions"><label class="check"><input type="checkbox" id="sc"> Service charge 10%</label><label class="check"><input type="checkbox" id="vat"> VAT 7%</label></div>
      <div class="row"><div class="field"><label>ทิป (%)</label><input class="input" id="tip" inputmode="decimal" value="0"></div><div class="field"><label>ปัดเศษ</label><select class="input" id="rd"><option value="1">ปัดขึ้นเป็นบาท</option><option value="10">ปัดขึ้นทีละ 10</option><option value="0">ไม่ปัด</option></select></div></div>
      <div class="result center"><small style="color:var(--muted)">จ่ายคนละ</small><div class="big sm" id="each"></div></div><div class="kv" id="kv"></div></div>`);
    body.append(ui);
    const run = () => {
      let t = num($("#t", ui).value); const n = Math.max(1, Math.round(num($("#n", ui).value)));
      if ($("#sc", ui).checked) t *= 1.1; if ($("#vat", ui).checked) t *= 1.07; t *= 1 + num($("#tip", ui).value) / 100;
      const rd = +$("#rd", ui).value, each = rd ? Math.ceil(t / n / rd) * rd : t / n;
      $("#each", ui).textContent = money(each, rd ? 0 : 2) + " ฿";
      $("#kv", ui).innerHTML = [["ยอดรวมสุทธิ", money(t)], ["รวมที่เก็บได้", money(each * n)], ["เงินเกิน (ค่าทิป)", money(each * n - t)]].map(([k, v]) => `<span>${k}</span><code style="text-align:right;font-size:1rem">${v}</code><span>บาท</span>`).join("");
    };
    $$("input, select", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "units", cat: "คำนวณ", icon: I.ruler, name: "แปลงหน่วย",
  desc: "แปลงหน่วยความยาว พื้นที่ (ไร่ งาน ตร.วา) น้ำหนัก อุณหภูมิ ปริมาตร ความเร็ว และขนาดข้อมูล",
  keywords: "unit convert length weight temperature หน่วย กิโล เมตร ไร่ ตารางวา",
  render(body) {
    const U = {
      "ความยาว": { "มิลลิเมตร": .001, "เซนติเมตร": .01, "เมตร": 1, "กิโลเมตร": 1000, "นิ้ว": .0254, "ฟุต": .3048, "หลา": .9144, "ไมล์": 1609.344, "วา": 2, "ศอก": .5 },
      "พื้นที่": { "ตารางเมตร": 1, "ตารางวา": 4, "งาน": 400, "ไร่": 1600, "ตารางกิโลเมตร": 1e6, "ตารางฟุต": .092903, "เอเคอร์": 4046.86, "เฮกตาร์": 10000 },
      "น้ำหนัก": { "กรัม": 1, "กิโลกรัม": 1000, "ตัน": 1e6, "ออนซ์": 28.3495, "ปอนด์": 453.592, "บาท (ทอง)": 15.244, "สลึง": 3.811 },
      "ปริมาตร": { "มิลลิลิตร": .001, "ลิตร": 1, "ลูกบาศก์เมตร": 1000, "แกลลอน (US)": 3.78541, "ออนซ์ (US)": .0295735, "ถ้วยตวง": .24, "ช้อนโต๊ะ": .015 },
      "ความเร็ว": { "กม./ชม.": 1, "เมตร/วินาที": 3.6, "ไมล์/ชม.": 1.609344, "นอต": 1.852 },
      "ขนาดข้อมูล": { "Byte": 1, "KB": 1024, "MB": 1048576, "GB": 1073741824, "TB": 1099511627776 },
      "อุณหภูมิ": { "เซลเซียส": "C", "ฟาเรนไฮต์": "F", "เคลวิน": "K" },
    };
    const ui = h(`<div><div class="tabs" id="k">${Object.keys(U).map((k, i) => `<button class="chip${i ? "" : " active"}">${k}</button>`).join("")}</div>
      <div class="row"><div class="field"><label>จาก</label><input class="input" type="number" id="v" value="1" /><select class="input" id="a"></select></div>
      <div class="field"><label>เป็น</label><input class="input" id="r" readonly style="font-weight:600;color:var(--gold-hi)" /><select class="input" id="b"></select></div></div>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="sw">⇄ สลับ</button></div></div>`);
    body.append(ui);
    let kind = Object.keys(U)[0];
    const fill = () => { const opts = Object.keys(U[kind]).map(o => `<option>${o}</option>`).join("");
      $("#a", ui).innerHTML = opts; $("#b", ui).innerHTML = opts; $("#b", ui).selectedIndex = 1; calc(); };
    const calc = () => {
      const v = parseFloat($("#v", ui).value), a = U[kind][$("#a", ui).value], b = U[kind][$("#b", ui).value];
      if (isNaN(v)) return $("#r", ui).value = "";
      let r;
      if (kind === "อุณหภูมิ") { const c = a === "C" ? v : a === "F" ? (v - 32) * 5 / 9 : v - 273.15; r = b === "C" ? c : b === "F" ? c * 9 / 5 + 32 : c + 273.15; }
      else r = v * a / b;
      $("#r", ui).value = +r.toPrecision(10);
    };
    $("#k", ui).onclick = e => { const b = e.target.closest(".chip"); if (!b) return; kind = b.textContent; $$(".chip", ui).forEach(x => x.classList.toggle("active", x === b)); fill(); };
    ["v", "a", "b"].forEach(id => $("#" + id, ui).oninput = calc);
    $("#sw", ui).onclick = () => { const a = $("#a", ui).selectedIndex; $("#a", ui).selectedIndex = $("#b", ui).selectedIndex; $("#b", ui).selectedIndex = a; calc(); };
    fill();
  },
});
