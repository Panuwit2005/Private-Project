// Investing tools: portfolio tracker, average cost, dividends, trading fees, position size,
// rebalancing, return/CAGR and fair value. Prices are entered manually (no live market data).
// Nothing here is investment advice; every tool says so in its footer.

const NOT_ADVICE = `<p class="hint">ผลลัพธ์เป็นการคำนวณจากตัวเลขที่คุณกรอกเท่านั้น ไม่ใช่คำแนะนำการลงทุน</p>`;
const pct = (v, d = 2) => (isFinite(v) ? (v * 100).toFixed(d) : "–") + "%";
const signed = (v, d = 2) => `<span class="${v > 0 ? "pos" : v < 0 ? "neg" : ""}">${v > 0 ? "+" : v < 0 ? "−" : ""}${money(Math.abs(v), d)}</span>`;
const kvRows = (rows) => rows.map(([k, v, u = ""]) => `<span>${k}</span><code style="text-align:right;font-size:1rem">${v}</code><span>${u}</span>`).join("");
// Horizontal bars, single hue, sorted desc, value labelled at the end (identity never by colour alone).
const barList = (rows, fmt = (v) => pct(v, 1)) => {
  const max = Math.max(...rows.map(r => Math.abs(r[1])), 1e-9);
  return rows.sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="bar-row" title="${esc(k)}: ${fmt(v)}"><span>${esc(k)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(1, Math.abs(v) / max * 100)}%"></div></div><b>${fmt(v)}</b></div>`).join("");
};

tool({
  id: "portfolio", cat: "invest", icon: I.pie, name: "พอร์ตหุ้นของฉัน",
  desc: "บันทึกหุ้นที่ถือ ต้นทุน ราคาปัจจุบัน ดูกำไร/ขาดทุน สัดส่วนพอร์ต และปันผลต่อปี บันทึกไว้ในเครื่อง",
  keywords: "portfolio พอร์ต หุ้น กำไร ขาดทุน สัดส่วน allocation set stock",
  render(body) {
    let rows = store.get("portfolio", [
      { s: "PTT", q: 1000, c: 34.5, p: 33.75, d: 2.0 },
      { s: "ADVANC", q: 100, c: 210, p: 235, d: 9.0 },
      { s: "CPALL", q: 300, c: 58, p: 55.5, d: 1.1 },
    ]);
    const ui = h(`<div><div class="table-wrap"><table class="data-table"><thead><tr><th>หุ้น</th><th>จำนวน</th><th>ต้นทุน/หุ้น</th><th>ราคาล่าสุด</th><th>ปันผล/หุ้น/ปี</th><th>มูลค่า</th><th>กำไร/ขาดทุน</th><th>%</th><th></th></tr></thead><tbody id="tb"></tbody><tfoot id="tf"></tfoot></table></div>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="add">+ เพิ่มหุ้น</button><button class="btn btn-ghost btn-sm" id="exp">ส่งออก CSV</button><label class="btn btn-ghost btn-sm">นำเข้า CSV<input type="file" accept=".csv,text/csv" id="imp" hidden></label></div>
      <div class="stat-grid" id="sum"></div>
      <h3 style="margin-top:22px;font-size:1.05rem">สัดส่วนพอร์ตตามมูลค่า</h3><div class="bars" id="alloc"></div>
      <p class="hint">ราคาไม่อัปเดตอัตโนมัติ — กรอกราคาล่าสุดเอง · ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้ แนะนำให้ “ส่งออก CSV” สำรองไว้</p>${NOT_ADVICE}</div>`);
    body.append(ui);
    const tb = $("#tb", ui);
    const draw = () => {
      tb.innerHTML = rows.map((r, i) => `<tr data-i="${i}"><td><input class="input sym" data-k="s" value="${esc(r.s)}" aria-label="ชื่อหุ้น"></td>${["q", "c", "p", "d"].map(k => `<td><input class="input" data-k="${k}" inputmode="decimal" value="${r[k] ?? ""}" aria-label="${k}"></td>`).join("")}<td data-o="v"></td><td data-o="pl"></td><td data-o="pp"></td><td><button class="rm" data-rm="${i}" aria-label="ลบ ${esc(r.s)}">✕</button></td></tr>`).join("");
      calc();
    };
    const calc = () => {
      let cost = 0, val = 0, div = 0;
      rows.forEach((r, i) => {
        const c = num(r.q) * num(r.c), v = num(r.q) * num(r.p), tr = tb.children[i];
        cost += c; val += v; div += num(r.q) * num(r.d);
        $('[data-o="v"]', tr).textContent = money(v); $('[data-o="pl"]', tr).innerHTML = signed(v - c);
        $('[data-o="pp"]', tr).innerHTML = c ? `<span class="${v >= c ? "pos" : "neg"}">${pct((v - c) / c)}</span>` : "–";
      });
      $("#tf", ui).innerHTML = `<tr><td>รวม</td><td></td><td></td><td></td><td></td><td>${money(val)}</td><td>${signed(val - cost)}</td><td>${cost ? pct((val - cost) / cost) : "–"}</td><td></td></tr>`;
      $("#sum", ui).innerHTML = [["ต้นทุนรวม", money(cost)], ["มูลค่าปัจจุบัน", money(val)], ["กำไร/ขาดทุน", signed(val - cost)], ["ปันผลต่อปี (ก่อนภาษี)", money(div)], ["Yield on cost", cost ? pct(div / cost) : "–"], ["จำนวนหุ้นในพอร์ต", rows.filter(r => r.s).length]]
        .map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join("");
      $("#alloc", ui).innerHTML = val ? barList(rows.filter(r => r.s && num(r.q) * num(r.p) > 0).map(r => [r.s.toUpperCase(), num(r.q) * num(r.p) / val])) : `<p class="hint">ใส่จำนวนหุ้นและราคาเพื่อดูสัดส่วน</p>`;
      store.set("portfolio", rows);
    };
    tb.oninput = e => { const inp = e.target.closest("[data-k]"); if (!inp) return; const i = +inp.closest("tr").dataset.i, k = inp.dataset.k; rows[i][k] = k === "s" ? inp.value.toUpperCase() : inp.value; calc(); };
    tb.onclick = e => { const b = e.target.closest("[data-rm]"); if (b && confirm("ลบหุ้นนี้ออกจากพอร์ต?")) { rows.splice(+b.dataset.rm, 1); draw(); } };
    $("#add", ui).onclick = () => { rows.push({ s: "", q: "", c: "", p: "", d: "" }); draw(); $$("input.sym", tb).at(-1).focus(); };
    $("#exp", ui).onclick = () => download(new Blob(["﻿symbol,shares,cost,price,dividend\n" + rows.map(r => [r.s, r.q, r.c, r.p, r.d].join(",")).join("\n")], { type: "text/csv" }), "portfolio.csv");
    $("#imp", ui).onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      const lines = (await f.text()).replace(/^﻿/, "").trim().split(/\r?\n/).slice(1);
      const parsed = lines.map(l => l.split(",")).filter(c => c[0]).map(([s, q, c, p, d]) => ({ s: s.trim().toUpperCase(), q, c, p, d }));
      if (!parsed.length) return toast("ไม่พบข้อมูลในไฟล์");
      if (confirm(`แทนที่พอร์ตปัจจุบันด้วย ${parsed.length} รายการจากไฟล์?`)) { rows = parsed; draw(); }
    };
    draw();
  },
});

tool({
  id: "avg-cost", cat: "invest", icon: I.avg, name: "คำนวณถัวเฉลี่ยต้นทุน",
  desc: "รวมการซื้อหลายไม้เป็นต้นทุนเฉลี่ย และหาว่าต้องซื้อเพิ่มกี่หุ้นที่ราคาเท่าไรจึงจะได้ต้นทุนตามเป้า",
  keywords: "average cost ถัวเฉลี่ย ต้นทุนเฉลี่ย dca ซื้อเพิ่ม average down",
  render(body) {
    let buys = [{ p: 50, q: 200 }, { p: 42, q: 300 }];
    const ui = h(`<div><div class="table-wrap"><table class="data-table"><thead><tr><th>ไม้ที่</th><th>ราคา</th><th>จำนวนหุ้น</th><th>เงินที่ใช้</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="add">+ เพิ่มไม้</button></div>
      <div class="stat-grid" id="sum"></div>
      <h3 style="margin-top:22px;font-size:1.05rem">ต้องซื้อเพิ่มเท่าไรเพื่อให้ต้นทุนลดลงถึงเป้า</h3>
      <div class="row"><div class="field"><label>ราคาที่จะซื้อเพิ่ม</label><input class="input" id="np" inputmode="decimal" value="38"></div><div class="field"><label>ต้นทุนเฉลี่ยเป้าหมาย</label><input class="input" id="tg" inputmode="decimal" value="42"></div></div>
      <div class="result" id="need"></div>${NOT_ADVICE}</div>`);
    body.append(ui);
    const tb = $("#tb", ui);
    const draw = () => { tb.innerHTML = buys.map((b, i) => `<tr data-i="${i}"><td>${i + 1}</td><td><input class="input" data-k="p" inputmode="decimal" value="${b.p}"></td><td><input class="input" data-k="q" inputmode="decimal" value="${b.q}"></td><td data-o></td><td><button class="rm" data-rm="${i}" aria-label="ลบไม้ที่ ${i + 1}">✕</button></td></tr>`).join(""); calc(); };
    const calc = () => {
      let Q = 0, C = 0;
      buys.forEach((b, i) => { const c = num(b.p) * num(b.q); Q += num(b.q); C += c; $("[data-o]", tb.children[i]).textContent = money(c); });
      const avg = Q ? C / Q : 0;
      $("#sum", ui).innerHTML = [["จำนวนหุ้นรวม", Q.toLocaleString()], ["เงินลงทุนรวม", money(C)], ["ต้นทุนเฉลี่ย", money(avg, 4)]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join("");
      const P = num($("#np", ui).value), T = num($("#tg", ui).value);
      let msg;
      if (!Q) msg = "ใส่ไม้ที่ซื้อก่อน";
      else if (T >= avg) msg = "เป้าหมายต้องต่ำกว่าต้นทุนเฉลี่ยปัจจุบัน";
      else if (P >= T) msg = "ราคาที่จะซื้อต้องต่ำกว่าต้นทุนเป้าหมาย จึงจะเฉลี่ยลงถึงเป้าได้";
      else { const n = Math.ceil((C - T * Q) / (T - P)); const lot = Math.ceil(n / 100) * 100; msg = `ต้องซื้อเพิ่ม <b>${n.toLocaleString()}</b> หุ้น (≈ ${money(n * P)} บาท)<br><small style="color:var(--color-text-muted)">ถ้าซื้อเป็นหลักร้อย (board lot) = ${lot.toLocaleString()} หุ้น → ต้นทุนเฉลี่ยใหม่ ${money((C + lot * P) / (Q + lot), 4)}</small>`; }
      $("#need", ui).innerHTML = msg;
    };
    tb.oninput = e => { const inp = e.target.closest("[data-k]"); if (inp) { buys[+inp.closest("tr").dataset.i][inp.dataset.k] = inp.value; calc(); } };
    tb.onclick = e => { const b = e.target.closest("[data-rm]"); if (b) { buys.splice(+b.dataset.rm, 1); draw(); } };
    $("#add", ui).onclick = () => { buys.push({ p: "", q: "" }); draw(); };
    ["np", "tg"].forEach(id => $("#" + id, ui).oninput = calc);
    draw();
  },
});

tool({
  id: "dividend", cat: "invest", icon: I.coins, name: "คำนวณปันผล",
  desc: "หา Dividend Yield เงินปันผลต่อปี/ต่อเดือนหลังหักภาษี 10% และเงินลงทุนที่ต้องใช้เพื่อให้ได้ปันผลตามเป้า",
  keywords: "dividend yield ปันผล เงินปันผล passive income ภาษีปันผล 10%",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>ราคาหุ้น</label><input class="input" id="p" inputmode="decimal" value="33.75"></div><div class="field"><label>ปันผลต่อหุ้นต่อปี</label><input class="input" id="d" inputmode="decimal" value="2"></div><div class="field"><label>จำนวนหุ้นที่มี</label><input class="input" id="q" inputmode="decimal" value="1000"></div></div>
      <div class="row"><div class="field"><label>ภาษีหัก ณ ที่จ่าย (%)</label><input class="input" id="tx" inputmode="decimal" value="10"></div><div class="field"><label>ต้องการปันผลสุทธิเดือนละ (บาท)</label><input class="input" id="goal" inputmode="decimal" value="10000"></div></div>
      <div class="stat-grid" id="out"></div><div class="result" id="need"></div>
      <p class="hint">ภาษีปันผลหัก ณ ที่จ่ายของบุคคลธรรมดาในไทยปกติ 10% · บางกรณีขอเครดิตภาษีเงินปันผลคืนได้ ขึ้นกับฐานภาษีของคุณ</p>${NOT_ADVICE}</div>`);
    body.append(ui);
    const run = () => {
      const p = num($("#p", ui).value), d = num($("#d", ui).value), q = num($("#q", ui).value), tx = num($("#tx", ui).value) / 100, g = num($("#goal", ui).value);
      const y = p ? d / p : 0, gross = d * q, net = gross * (1 - tx);
      $("#out", ui).innerHTML = [["Dividend Yield", pct(y)], ["ปันผลต่อปี (ก่อนภาษี)", money(gross)], ["ปันผลต่อปี (สุทธิ)", money(net)], ["เฉลี่ยต่อเดือน (สุทธิ)", money(net / 12)]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join("");
      const shares = d ? Math.ceil(g * 12 / (d * (1 - tx))) : 0;
      $("#need", ui).innerHTML = d && p ? `อยากได้ปันผลสุทธิเดือนละ ${money(g, 0)} บาท ต้องถือ <b>${shares.toLocaleString()}</b> หุ้น ≈ เงินลงทุน <b>${money(shares * p, 0)}</b> บาท (ถ้าปันผลและราคาคงที่)` : "ใส่ราคาและปันผลต่อหุ้น";
    };
    $$("input", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "trade-fee", cat: "invest", icon: I.receipt, name: "ค่าธรรมเนียมซื้อขายหุ้น",
  desc: "คำนวณค่าคอมมิชชัน ค่าธรรมเนียมตลาด และ VAT ทั้งฝั่งซื้อ-ขาย ได้กำไรสุทธิและราคาขายคุ้มทุน",
  keywords: "commission ค่าคอม ค่าธรรมเนียม หุ้น vat กำไรสุทธิ คุ้มทุน break even",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>ราคาซื้อ</label><input class="input" id="bp" inputmode="decimal" value="25"></div><div class="field"><label>ราคาขาย</label><input class="input" id="sp" inputmode="decimal" value="27.5"></div><div class="field"><label>จำนวนหุ้น</label><input class="input" id="q" inputmode="decimal" value="1000"></div></div>
      <div class="row"><div class="field"><label>ค่าคอมมิชชัน (%)</label><input class="input" id="cm" inputmode="decimal" value="0.157"></div><div class="field"><label>ค่าคอมขั้นต่ำต่อครั้ง (บาท)</label><input class="input" id="mn" inputmode="decimal" value="0"></div><div class="field"><label>ค่าธรรมเนียมตลาดฯ รวม (%)</label><input class="input" id="mk" inputmode="decimal" value="0.007"></div><div class="field"><label>VAT (%)</label><input class="input" id="vat" inputmode="decimal" value="7"></div></div>
      <div class="kv" id="kv"></div>
      <p class="hint">ค่าเริ่มต้นเป็นตัวอย่างของบัญชีซื้อขายออนไลน์ทั่วไป อัตราจริงต่างกันตามโบรกเกอร์และประเภทบัญชี — ตรวจสอบกับโบรกเกอร์ของคุณ · ค่าธรรมเนียมตลาดฯ คือค่า trading, clearing และค่าธรรมเนียมอื่นของตลาด ใส่ตามที่โบรกเกอร์แจ้ง</p>${NOT_ADVICE}</div>`);
    body.append(ui);
    const run = () => {
      const bp = num($("#bp", ui).value), sp = num($("#sp", ui).value), q = num($("#q", ui).value);
      const cm = num($("#cm", ui).value) / 100, mn = num($("#mn", ui).value), mk = num($("#mk", ui).value) / 100, vat = num($("#vat", ui).value) / 100;
      const fee = (amt) => { const c = Math.max(amt * cm, amt ? mn : 0), m = amt * mk; return (c + m) * (1 + vat); };
      const buy = bp * q, sell = sp * q, fb = fee(buy), fs = fee(sell), net = sell - fs - buy - fb;
      const rate = (cm + mk) * (1 + vat), be = q ? (buy + fb) / (q * (1 - rate)) : 0;
      $("#kv", ui).innerHTML = kvRows([["มูลค่าซื้อ", money(buy), "บาท"], ["ค่าธรรมเนียมฝั่งซื้อ", money(fb), "บาท"], ["เงินที่ต้องจ่ายจริง", money(buy + fb), "บาท"], ["มูลค่าขาย", money(sell), "บาท"], ["ค่าธรรมเนียมฝั่งขาย", money(fs), "บาท"], ["กำไร/ขาดทุนสุทธิ", signed(net), "บาท"], ["ผลตอบแทนสุทธิ", buy ? pct(net / (buy + fb)) : "–", ""], ["ราคาขายคุ้มทุน", money(be, 4), "บาท/หุ้น"]]);
    };
    $$("input", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "position-size", cat: "invest", icon: I.target, name: "ขนาดสถานะ & ความเสี่ยง",
  desc: "คำนวณจำนวนหุ้นที่ควรซื้อจากเงินทุน % ความเสี่ยงที่รับได้ และจุดตัดขาดทุน พร้อมอัตราส่วน Risk:Reward",
  keywords: "position size risk reward stop loss จุดตัดขาดทุน ความเสี่ยง money management",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>เงินทุนทั้งหมด</label><input class="input" id="cap" inputmode="decimal" value="200000"></div><div class="field"><label>ยอมเสี่ยงต่อไม้ (%)</label><input class="input" id="rk" inputmode="decimal" value="1"></div></div>
      <div class="row"><div class="field"><label>ราคาเข้า</label><input class="input" id="en" inputmode="decimal" value="25"></div><div class="field"><label>จุดตัดขาดทุน</label><input class="input" id="sl" inputmode="decimal" value="23.5"></div><div class="field"><label>เป้าหมายราคา</label><input class="input" id="tp" inputmode="decimal" value="29"></div><div class="field"><label>ปัดเป็นหลัก (หุ้น)</label><input class="input" id="lot" inputmode="numeric" value="100"></div></div>
      <div class="result center"><small style="color:var(--color-text-muted)">ซื้อได้</small><div class="big sm" id="qty"></div></div><div class="kv" id="kv"></div>${NOT_ADVICE}</div>`);
    body.append(ui);
    const run = () => {
      const cap = num($("#cap", ui).value), rk = num($("#rk", ui).value) / 100, en = num($("#en", ui).value), sl = num($("#sl", ui).value), tp = num($("#tp", ui).value), lot = Math.max(1, Math.round(num($("#lot", ui).value)));
      const per = Math.abs(en - sl), risk = cap * rk;
      if (!per || !en) { $("#qty", ui).textContent = "–"; $("#kv", ui).innerHTML = ""; return; }
      let q = Math.floor(risk / per / lot) * lot;
      const capped = q * en > cap; if (capped) q = Math.floor(cap / en / lot) * lot;
      const rr = Math.abs(tp - en) / per;
      $("#qty", ui).textContent = q.toLocaleString() + " หุ้น";
      $("#kv", ui).innerHTML = kvRows([["เงินที่ใช้ซื้อ", money(q * en), "บาท"], ["สัดส่วนของพอร์ต", cap ? pct(q * en / cap, 1) : "–", ""], ["ขาดทุนสูงสุดถ้าโดนตัด", money(q * per), "บาท"], ["กำไรถ้าถึงเป้า", money(q * Math.abs(tp - en)), "บาท"], ["Risk : Reward", "1 : " + rr.toFixed(2), ""]]) + (capped ? `<span></span><span style="color:var(--color-danger)">ถูกจำกัดด้วยเงินทุน — ความเสี่ยงจริงต่ำกว่าที่ตั้งไว้</span><span></span>` : "");
    };
    $$("input", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "rebalance", cat: "invest", icon: I.scale, name: "ปรับสมดุลพอร์ต (Rebalance)",
  desc: "ใส่มูลค่าปัจจุบันและสัดส่วนเป้าหมายของแต่ละสินทรัพย์ แล้วดูว่าต้องซื้อหรือขายเท่าไร รวมเงินลงทุนเพิ่มได้",
  keywords: "rebalance ปรับพอร์ต asset allocation สัดส่วน หุ้น ตราสารหนี้ ทองคำ",
  render(body) {
    let rows = store.get("rebalance", [{ n: "หุ้นไทย", v: 120000, t: 40 }, { n: "หุ้นต่างประเทศ", v: 60000, t: 30 }, { n: "ตราสารหนี้", v: 50000, t: 20 }, { n: "ทองคำ", v: 20000, t: 10 }]);
    const ui = h(`<div><div class="table-wrap"><table class="data-table"><thead><tr><th>สินทรัพย์</th><th>มูลค่าปัจจุบัน</th><th>เป้าหมาย %</th><th>ปัจจุบัน %</th><th>ซื้อ / ขาย</th><th></th></tr></thead><tbody id="tb"></tbody><tfoot id="tf"></tfoot></table></div>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="add">+ เพิ่มสินทรัพย์</button></div>
      <div class="row"><div class="field"><label>เงินลงทุนเพิ่ม / ถอน (ติดลบ = ถอน)</label><input class="input" id="cash" inputmode="decimal" value="0"></div></div>
      <div class="status" id="st"></div>${NOT_ADVICE}</div>`);
    body.append(ui);
    const tb = $("#tb", ui);
    const draw = () => { tb.innerHTML = rows.map((r, i) => `<tr data-i="${i}"><td><input class="input sym" style="width:130px;text-transform:none" data-k="n" value="${esc(r.n)}"></td><td><input class="input" data-k="v" inputmode="decimal" value="${r.v}"></td><td><input class="input" data-k="t" inputmode="decimal" value="${r.t}" style="width:70px"></td><td data-o="c"></td><td data-o="a"></td><td><button class="rm" data-rm="${i}" aria-label="ลบ">✕</button></td></tr>`).join(""); calc(); };
    const calc = () => {
      const total = rows.reduce((s, r) => s + num(r.v), 0), tsum = rows.reduce((s, r) => s + num(r.t), 0), after = total + num($("#cash", ui).value);
      rows.forEach((r, i) => {
        const tr = tb.children[i], diff = after * num(r.t) / 100 - num(r.v);
        $('[data-o="c"]', tr).textContent = total ? pct(num(r.v) / total, 1) : "–";
        $('[data-o="a"]', tr).innerHTML = Math.abs(diff) < .5 ? "คงเดิม" : `<span class="${diff > 0 ? "pos" : "neg"}">${diff > 0 ? "ซื้อ" : "ขาย"} ${money(Math.abs(diff), 0)}</span>`;
      });
      $("#tf", ui).innerHTML = `<tr><td>รวม</td><td>${money(total, 0)}</td><td>${tsum}%</td><td>100%</td><td>หลังปรับ ${money(after, 0)}</td><td></td></tr>`;
      setStatus($("#st", ui), Math.abs(tsum - 100) > .01 ? `สัดส่วนเป้าหมายรวมกันได้ ${tsum}% — ควรรวมเป็น 100%` : "", Math.abs(tsum - 100) > .01);
      store.set("rebalance", rows);
    };
    tb.oninput = e => { const inp = e.target.closest("[data-k]"); if (inp) { rows[+inp.closest("tr").dataset.i][inp.dataset.k] = inp.value; calc(); } };
    tb.onclick = e => { const b = e.target.closest("[data-rm]"); if (b) { rows.splice(+b.dataset.rm, 1); draw(); } };
    $("#add", ui).onclick = () => { rows.push({ n: "สินทรัพย์ใหม่", v: 0, t: 0 }); draw(); };
    $("#cash", ui).oninput = calc;
    draw();
  },
});

tool({
  id: "cagr", cat: "invest", icon: I.growth, name: "ผลตอบแทน & CAGR",
  desc: "คำนวณผลตอบแทนรวมและผลตอบแทนเฉลี่ยต่อปี (CAGR) รวมปันผล และหา CAGR ที่ต้องได้เพื่อไปถึงเป้าหมาย",
  keywords: "cagr return ผลตอบแทน ทบต้น ต่อปี annualized เป้าหมาย",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>มูลค่าเริ่มต้น</label><input class="input" id="a" inputmode="decimal" value="100000"></div><div class="field"><label>มูลค่าปัจจุบัน</label><input class="input" id="b" inputmode="decimal" value="165000"></div><div class="field"><label>ปันผล/เงินที่ได้รับระหว่างทาง</label><input class="input" id="dv" inputmode="decimal" value="12000"></div><div class="field"><label>ระยะเวลา (ปี)</label><input class="input" id="y" inputmode="decimal" value="5"></div></div>
      <div class="stat-grid" id="out"></div>
      <h3 style="margin-top:22px;font-size:1.05rem">ต้องได้ผลตอบแทนเท่าไรถึงจะถึงเป้า</h3>
      <div class="row"><div class="field"><label>เงินตอนนี้</label><input class="input" id="g0" inputmode="decimal" value="500000"></div><div class="field"><label>เป้าหมาย</label><input class="input" id="g1" inputmode="decimal" value="1000000"></div><div class="field"><label>ภายใน (ปี)</label><input class="input" id="gy" inputmode="decimal" value="8"></div></div>
      <div class="result" id="need"></div>${NOT_ADVICE}</div>`);
    body.append(ui);
    const run = () => {
      const a = num($("#a", ui).value), b = num($("#b", ui).value) + num($("#dv", ui).value), y = num($("#y", ui).value);
      const tot = a ? b / a - 1 : NaN, cagr = a && y > 0 && b > 0 ? (b / a) ** (1 / y) - 1 : NaN;
      $("#out", ui).innerHTML = [["กำไรรวม", signed(b - a)], ["ผลตอบแทนรวม", pct(tot)], ["CAGR ต่อปี", pct(cagr)], ["เงินเพิ่มเป็น", isFinite(tot) ? (1 + tot).toFixed(2) + " เท่า" : "–"]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join("");
      const g0 = num($("#g0", ui).value), g1 = num($("#g1", ui).value), gy = num($("#gy", ui).value);
      const need = g0 > 0 && g1 > 0 && gy > 0 ? (g1 / g0) ** (1 / gy) - 1 : NaN;
      $("#need", ui).innerHTML = isFinite(need) ? `ต้องได้ผลตอบแทนเฉลี่ย <b>${pct(need)}</b> ต่อปี (ทบต้น) ต่อเนื่อง ${gy} ปี` : "ใส่ตัวเลขให้ครบ";
    };
    $$("input", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "fair-value", cat: "invest", icon: I.gem, name: "ประเมินมูลค่าหุ้น",
  desc: "ประเมินราคาเหมาะสมแบบ P/E และแบบปันผลคิดลด (DDM) พร้อมส่วนเผื่อความปลอดภัย (Margin of Safety)",
  keywords: "fair value valuation pe ddm margin of safety มูลค่าที่เหมาะสม ราคาเป้าหมาย vi",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>ราคาปัจจุบัน</label><input class="input" id="px" inputmode="decimal" value="30"></div><div class="field"><label>Margin of Safety (%)</label><input class="input" id="ms" inputmode="decimal" value="25"></div></div>
      <h3 style="margin-top:20px;font-size:1.05rem">แบบ P/E</h3>
      <div class="row" style="margin-top:6px"><div class="field"><label>กำไรต่อหุ้น (EPS) คาดการณ์</label><input class="input" id="eps" inputmode="decimal" value="2.4"></div><div class="field"><label>P/E ที่เหมาะสม</label><input class="input" id="pe" inputmode="decimal" value="14"></div></div>
      <h3 style="margin-top:20px;font-size:1.05rem">แบบปันผลคิดลด (Gordon Growth)</h3>
      <div class="row" style="margin-top:6px"><div class="field"><label>ปันผลต่อหุ้นปีหน้า (D1)</label><input class="input" id="d1" inputmode="decimal" value="1.5"></div><div class="field"><label>ผลตอบแทนที่ต้องการ (%)</label><input class="input" id="r" inputmode="decimal" value="9"></div><div class="field"><label>อัตราเติบโตปันผลระยะยาว (%)</label><input class="input" id="g" inputmode="decimal" value="3"></div></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>วิธี</th><th>มูลค่าเหมาะสม</th><th>ซื้อได้ไม่เกิน (หลังเผื่อ)</th><th>เทียบราคาปัจจุบัน</th></tr></thead><tbody id="tb"></tbody></table></div>
      <p class="hint">DDM ใช้ได้เมื่อผลตอบแทนที่ต้องการ &gt; อัตราเติบโต และเหมาะกับหุ้นที่จ่ายปันผลสม่ำเสมอ · ผลลัพธ์ไวต่อสมมติฐานมาก ลองเปลี่ยนตัวเลขเพื่อดูช่วงของมูลค่า</p>${NOT_ADVICE}</div>`);
    body.append(ui);
    const run = () => {
      const px = num($("#px", ui).value), ms = num($("#ms", ui).value) / 100;
      const pe = num($("#eps", ui).value) * num($("#pe", ui).value);
      const r = num($("#r", ui).value) / 100, g = num($("#g", ui).value) / 100, ddm = r > g ? num($("#d1", ui).value) / (r - g) : NaN;
      const row = (n, v) => `<tr><td>${n}</td><td>${isFinite(v) ? money(v) : "–"}</td><td>${isFinite(v) ? money(v * (1 - ms)) : "–"}</td><td>${isFinite(v) && px ? `<span class="${v > px ? "pos" : "neg"}">${v > px ? "ต่ำกว่ามูลค่า " : "สูงกว่ามูลค่า "}${pct(Math.abs(v / px - 1), 1)}</span>` : "–"}</td></tr>`;
      $("#tb", ui).innerHTML = row("P/E", pe) + row("DDM", ddm) + (isFinite(ddm) ? row("เฉลี่ย 2 วิธี", (pe + ddm) / 2) : "");
    };
    $$("input", ui).forEach(i => i.oninput = run); run();
  },
});
