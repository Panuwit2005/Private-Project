// Everyday tools: notes, to-do, timer/pomodoro, stopwatch, world clock, random, wheel, tally,
// QR generator/scanner, password generator. Notes, to-dos and counters persist in localStorage.

tool({
  id: "notes", cat: "daily", icon: I.note, name: "โน้ตส่วนตัว",
  desc: "จดโน้ตหลายเล่ม บันทึกอัตโนมัติในเครื่องนี้ ค้นหาได้ และส่งออกเป็นไฟล์ .txt",
  keywords: "notes notepad จดโน้ต บันทึก memo",
  render(body) {
    let notes = store.get("notes", [{ id: Date.now(), title: "โน้ตแรก", text: "" }]), cur = notes[0].id;
    const ui = h(`<div><div class="tabs" id="tabs"></div>
      <input class="input" id="title" placeholder="ชื่อโน้ต" style="font-weight:600">
      <textarea class="input" id="t" style="font-family:var(--font-body);font-size:1rem;min-height:260px;margin-top:10px" placeholder="เริ่มพิมพ์…"></textarea>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="cp">คัดลอก</button><button class="btn btn-ghost btn-sm" id="dl">ส่งออก .txt</button><button class="btn btn-ghost btn-sm" id="del">ลบโน้ตนี้</button></div>
      <p class="hint" id="saved">บันทึกอัตโนมัติไว้ในเบราว์เซอร์ของเครื่องนี้</p></div>`);
    body.append(ui);
    const note = () => notes.find(n => n.id === cur);
    const save = () => store.set("notes", notes);
    const draw = () => {
      $("#tabs", ui).innerHTML = notes.map(n => `<button class="chip${n.id === cur ? " active" : ""}" data-n="${n.id}">${esc(n.title || "ไม่มีชื่อ")}</button>`).join("") + `<button class="chip" data-new>+ ใหม่</button>`;
      $("#title", ui).value = note().title; $("#t", ui).value = note().text;
    };
    $("#tabs", ui).onclick = e => {
      if (e.target.closest("[data-new]")) { const n = { id: Date.now(), title: "โน้ตใหม่", text: "" }; notes.push(n); cur = n.id; save(); draw(); $("#t", ui).focus(); return; }
      const b = e.target.closest("[data-n]"); if (b) { cur = +b.dataset.n; draw(); }
    };
    let tm;
    const typed = () => { note().title = $("#title", ui).value; note().text = $("#t", ui).value; clearTimeout(tm); tm = setTimeout(() => { save(); $("#saved", ui).textContent = "บันทึกแล้ว ✓ " + new Date().toLocaleTimeString("th-TH"); }, 400); };
    $("#t", ui).oninput = typed;
    $("#title", ui).oninput = () => { typed(); $(`[data-n="${cur}"]`, ui).textContent = $("#title", ui).value || "ไม่มีชื่อ"; };
    $("#cp", ui).onclick = () => copy(note().text);
    $("#dl", ui).onclick = () => download(new Blob([note().text], { type: "text/plain;charset=utf-8" }), (note().title || "note") + ".txt");
    $("#del", ui).onclick = () => {
      if (!confirm("ลบโน้ตนี้?")) return;
      notes = notes.filter(n => n.id !== cur); if (!notes.length) notes.push({ id: Date.now(), title: "โน้ตใหม่", text: "" });
      cur = notes[0].id; save(); draw();
    };
    draw();
    return () => { clearTimeout(tm); save(); };
  },
});

tool({
  id: "todo", cat: "daily", icon: I.check, name: "รายการสิ่งที่ต้องทำ",
  desc: "To-do list ส่วนตัว ติ๊กเสร็จ ลบ และเก็บไว้ในเครื่องนี้ตลอด",
  keywords: "todo to-do task checklist งาน สิ่งที่ต้องทำ",
  render(body) {
    let items = store.get("todo", []);
    const ui = h(`<div><form class="row" id="f" style="margin-top:0"><div class="field"><input class="input" id="t" placeholder="เพิ่มงานใหม่…" autocomplete="off"></div><button class="btn btn-gold">เพิ่ม</button></form>
      <ul class="todo" id="list"></ul><div class="actions"><button class="btn btn-ghost btn-sm" id="clr">ลบงานที่เสร็จแล้ว</button></div><p class="hint" id="cnt"></p></div>`);
    body.append(ui);
    const save = () => { store.set("todo", items); draw(); };
    const draw = () => {
      $("#list", ui).innerHTML = items.map((x, i) => `<li class="${x.done ? "done" : ""}"><input type="checkbox" data-i="${i}" ${x.done ? "checked" : ""} style="accent-color:var(--color-accent);width:18px;height:18px"><span>${esc(x.t)}</span><button data-rm="${i}" aria-label="ลบ">✕</button></li>`).join("") || `<li style="justify-content:center;color:var(--color-text-subtle)">ยังไม่มีงาน 🎉</li>`;
      const left = items.filter(x => !x.done).length; $("#cnt", ui).textContent = items.length ? `เหลือ ${left} จาก ${items.length} งาน` : "";
    };
    $("#f", ui).onsubmit = e => { e.preventDefault(); const v = $("#t", ui).value.trim(); if (!v) return; items.unshift({ t: v, done: false }); $("#t", ui).value = ""; save(); };
    $("#list", ui).onclick = e => {
      const c = e.target.closest("[data-i]"), r = e.target.closest("[data-rm]");
      if (c) { items[+c.dataset.i].done = c.checked; save(); }
      if (r) { items.splice(+r.dataset.rm, 1); save(); }
    };
    $("#clr", ui).onclick = () => { items = items.filter(x => !x.done); save(); };
    draw();
  },
});

function beep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    [0, .35, .7].forEach(t => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.3, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + t + .3); o.connect(g).connect(ac.destination); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + .3); });
    setTimeout(() => ac.close(), 1500);
  } catch {}
  navigator.vibrate?.([200, 100, 200]);
}

tool({
  id: "timer", cat: "daily", icon: I.timer, name: "ตั้งเวลา & Pomodoro",
  desc: "จับเวลาถอยหลังพร้อมเสียงเตือน และโหมด Pomodoro (โฟกัส 25 / พัก 5 นาที)",
  keywords: "timer countdown pomodoro ตั้งเวลา นับถอยหลัง โฟกัส",
  render(body) {
    const ui = h(`<div class="center"><div class="tabs" style="justify-content:center"><button class="chip" data-m="25">🍅 โฟกัส 25</button><button class="chip" data-m="5">☕ พัก 5</button><button class="chip" data-m="15">พักยาว 15</button><button class="chip" data-m="1">1 นาที</button><button class="chip" data-m="10">10 นาที</button></div>
      <div class="big" id="d">25:00</div>
      <div class="row" style="justify-content:center"><div class="field" style="flex:0 0 110px"><label>นาที</label><input class="input" type="number" id="mm" value="25" min="0"></div><div class="field" style="flex:0 0 110px"><label>วินาที</label><input class="input" type="number" id="ss" value="0" min="0" max="59"></div></div>
      <div class="actions"><button class="btn btn-gold" id="go">▶ เริ่ม</button><button class="btn btn-ghost" id="rs">รีเซ็ต</button></div><div class="status" id="st"></div></div>`);
    body.append(ui);
    let left = 1500, end = 0, iv;
    const show = () => { $("#d", ui).textContent = `${pad(Math.floor(left / 60))}:${pad(Math.floor(left % 60))}`; };
    const setFromInputs = () => { left = num($("#mm", ui).value) * 60 + num($("#ss", ui).value); show(); };
    const stop = () => { clearInterval(iv); iv = null; $("#go", ui).textContent = "▶ เริ่ม"; document.title = "Lumière Tools"; };
    $("#go", ui).onclick = () => {
      if (iv) { stop(); return; }
      if (left <= 0) setFromInputs();
      end = Date.now() + left * 1000; $("#go", ui).textContent = "❚❚ พัก"; setStatus($("#st", ui), "");
      iv = setInterval(() => {
        left = Math.max(0, Math.round((end - Date.now()) / 1000)); show(); document.title = $("#d", ui).textContent + " · Lumière";
        if (!left) { stop(); beep(); setStatus($("#st", ui), "⏰ หมดเวลาแล้ว!"); try { new Notification("⏰ หมดเวลาแล้ว!"); } catch {} }
      }, 250);
      if (window.Notification && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    };
    $("#rs", ui).onclick = () => { stop(); setFromInputs(); };
    $$("[data-m]", ui).forEach(b => b.onclick = () => { stop(); $("#mm", ui).value = b.dataset.m; $("#ss", ui).value = 0; setFromInputs(); });
    ["mm", "ss"].forEach(id => $("#" + id, ui).oninput = () => { if (!iv) setFromInputs(); });
    return stop;
  },
});

tool({
  id: "stopwatch", cat: "daily", icon: I.clock, name: "นาฬิกาจับเวลา",
  desc: "จับเวลาละเอียดระดับเศษวินาที พร้อมบันทึกรอบ (Lap)",
  keywords: "stopwatch จับเวลา lap รอบ วิ่ง",
  render(body) {
    const ui = h(`<div class="center"><div class="big" id="d">00:00.00</div>
      <div class="actions"><button class="btn btn-gold" id="go">▶ เริ่ม</button><button class="btn btn-ghost" id="lap" disabled>รอบ</button><button class="btn btn-ghost" id="rs">รีเซ็ต</button></div>
      <div class="clock-list" id="laps"></div></div>`);
    body.append(ui);
    let start = 0, acc = 0, raf, laps = [];
    const f = ms => `${pad(Math.floor(ms / 60000))}:${pad(Math.floor(ms / 1000) % 60)}.${pad(Math.floor(ms / 10) % 100)}`;
    const now = () => acc + (raf ? performance.now() - start : 0);
    const loop = () => { $("#d", ui).textContent = f(now()); raf = requestAnimationFrame(loop); };
    $("#go", ui).onclick = () => {
      if (raf) { acc = now(); cancelAnimationFrame(raf); raf = null; $("#go", ui).textContent = "▶ ต่อ"; $("#lap", ui).disabled = true; }
      else { start = performance.now(); raf = requestAnimationFrame(loop); $("#go", ui).textContent = "❚❚ หยุด"; $("#lap", ui).disabled = false; }
    };
    $("#lap", ui).onclick = () => { const t = now(); laps.unshift([t, t - (laps[0]?.[0] || 0)]); $("#laps", ui).innerHTML = laps.map(([t, d], i) => `<div><span>รอบ ${laps.length - i}</span><span>+${f(d)}</span><b style="font-size:1.3rem">${f(t)}</b></div>`).join(""); };
    $("#rs", ui).onclick = () => { cancelAnimationFrame(raf); raf = null; acc = 0; laps = []; $("#laps", ui).innerHTML = ""; $("#d", ui).textContent = f(0); $("#go", ui).textContent = "▶ เริ่ม"; $("#lap", ui).disabled = true; };
    return () => cancelAnimationFrame(raf);
  },
});

tool({
  id: "world-clock", cat: "daily", icon: I.globe, name: "เวลาทั่วโลก",
  desc: "ดูเวลาปัจจุบันของเมืองสำคัญทั่วโลกเทียบกับเวลาไทย",
  keywords: "world clock timezone เวลา ประเทศ โซนเวลา",
  render(body) {
    const zones = [["กรุงเทพฯ", "Asia/Bangkok"], ["โตเกียว", "Asia/Tokyo"], ["โซล", "Asia/Seoul"], ["สิงคโปร์", "Asia/Singapore"], ["ปักกิ่ง", "Asia/Shanghai"], ["ดูไบ", "Asia/Dubai"], ["ลอนดอน", "Europe/London"], ["ปารีส", "Europe/Paris"], ["นิวยอร์ก", "America/New_York"], ["ลอสแอนเจลิส", "America/Los_Angeles"], ["ซิดนีย์", "Australia/Sydney"]];
    const ui = h(`<div class="clock-list" id="l"></div>`); body.append(ui);
    const bkk = (d) => new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const draw = () => {
      const d = new Date();
      ui.innerHTML = zones.map(([n, z]) => {
        const diff = Math.round((new Date(d.toLocaleString("en-US", { timeZone: z })) - bkk(d)) / 36e5);
        return `<div><span>${n}<br><small>${d.toLocaleDateString("th-TH", { timeZone: z, weekday: "short", day: "numeric", month: "short" })} · ${diff === 0 ? "เวลาไทย" : (diff > 0 ? "+" : "") + diff + " ชม."}</small></span><b>${d.toLocaleTimeString("th-TH", { timeZone: z, hour: "2-digit", minute: "2-digit" })}</b></div>`;
      }).join("");
    };
    draw(); const iv = setInterval(draw, 10000);
    return () => clearInterval(iv);
  },
});

const rnd = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;

tool({
  id: "random", cat: "daily", icon: I.dice, name: "สุ่มตัวเลข / ทอยเต๋า / โยนเหรียญ",
  desc: "สุ่มตัวเลขในช่วงที่กำหนด ทอยลูกเต๋า หรือโยนเหรียญหัว-ก้อย",
  keywords: "random number dice coin สุ่ม ลูกเต๋า เหรียญ หัวก้อย",
  render(body) {
    const ui = h(`<div class="center"><div class="big" id="d">?</div><div class="status" id="st"></div>
      <div class="row"><div class="field"><label>ต่ำสุด</label><input class="input" type="number" id="a" value="1"></div><div class="field"><label>สูงสุด</label><input class="input" type="number" id="b" value="100"></div><div class="field"><label>จำนวน</label><input class="input" type="number" id="n" value="1" min="1" max="100"></div></div>
      <div class="actions"><label class="check"><input type="checkbox" id="uq" checked> ไม่ซ้ำกัน</label></div>
      <div class="actions"><button class="btn btn-gold" id="num">🎲 สุ่มตัวเลข</button><button class="btn btn-ghost" id="dice">⚀ ทอยเต๋า</button><button class="btn btn-ghost" id="coin">🪙 โยนเหรียญ</button></div></div>`);
    body.append(ui);
    const d = $("#d", ui), st = $("#st", ui);
    const anim = (final, label) => { let k = 0; const iv = setInterval(() => { d.textContent = final[1](); if (++k > 10) { clearInterval(iv); d.textContent = final[0]; setStatus(st, label); } }, 50); };
    $("#num", ui).onclick = () => {
      let a = Math.round(num($("#a", ui).value)), b = Math.round(num($("#b", ui).value)); if (a > b) [a, b] = [b, a];
      const range = b - a + 1, n = Math.min(Math.max(1, Math.round(num($("#n", ui).value))), 100);
      if ($("#uq", ui).checked && n > range) return setStatus(st, "ช่วงตัวเลขน้อยกว่าจำนวนที่ต้องการ", true);
      const set = new Set(), out = [];
      while (out.length < n) { const v = a + rnd(range); if ($("#uq", ui).checked) { if (set.has(v)) continue; set.add(v); } out.push(v); }
      d.style.fontSize = n > 1 ? "2rem" : "";
      anim([out.join(", "), () => a + rnd(range)], `สุ่มจาก ${a} ถึง ${b}`);
    };
    $("#dice", ui).onclick = () => { d.style.fontSize = ""; const f = "⚀⚁⚂⚃⚄⚅"; const v = rnd(6); anim([f[v], () => f[rnd(6)]], `ได้ ${v + 1} แต้ม`); };
    $("#coin", ui).onclick = () => { d.style.fontSize = ""; const v = rnd(2); anim([v ? "หัว" : "ก้อย", () => rnd(2) ? "หัว" : "ก้อย"], "🪙"); };
  },
});

tool({
  id: "wheel", cat: "daily", icon: I.wheel, name: "วงล้อสุ่ม",
  desc: "ใส่ตัวเลือกแล้วหมุนวงล้อ ช่วยตัดสินใจ กินอะไรดี ใครจ่าย หรือจับฉลาก",
  keywords: "wheel spin picker วงล้อ สุ่ม กินอะไรดี จับฉลาก",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" style="font-family:var(--font-body);min-height:110px" placeholder="หนึ่งตัวเลือกต่อบรรทัด"></textarea>
      <div class="wheel-wrap"><canvas id="cv" width="680" height="680"></canvas></div>
      <div class="center"><div class="actions"><button class="btn btn-gold" id="go">หมุนวงล้อ</button></div><div class="big sm" id="res"></div></div></div>`);
    body.append(ui);
    const t = $("#t", ui); t.value = store.get("wheel", "ข้าวมันไก่\nกะเพราไก่\nก๋วยเตี๋ยว\nส้มตำ\nสุกี้\nพิซซ่า");
    const cv = $("#cv", ui), ctx = cv.getContext("2d"); let ang = 0, spinning = false;
    const items = () => t.value.split("\n").map(s => s.trim()).filter(Boolean);
    const cols = ["#d8b46a", "#3a2f5c", "#9c7a3c", "#1f4a4a", "#f3d999", "#5a3e2b", "#2b3a5c", "#6b4e1f"];
    const draw = () => {
      const L = items(), n = L.length || 1, r = 330, c = 340; ctx.clearRect(0, 0, 680, 680);
      L.forEach((s, i) => {
        const a0 = ang + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
        ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, r, a0, a1); ctx.fillStyle = cols[i % cols.length]; ctx.fill();
        ctx.save(); ctx.translate(c, c); ctx.rotate((a0 + a1) / 2); ctx.fillStyle = [0, 4].includes(i % 8) ? "#1a1408" : "#f4efe6";
        ctx.font = "600 28px 'IBM Plex Sans Thai', sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(s.slice(0, 16), r - 24, 0); ctx.restore();
      });
      ctx.beginPath(); ctx.arc(c, c, 40, 0, 7); ctx.fillStyle = "#08080b"; ctx.fill(); ctx.strokeStyle = "#d8b46a"; ctx.lineWidth = 4; ctx.stroke();
    };
    t.oninput = () => { store.set("wheel", t.value); draw(); };
    $("#go", ui).onclick = () => {
      const L = items(); if (spinning || L.length < 2) return;
      spinning = true; $("#res", ui).textContent = "";
      const from = ang, to = ang + 8 * Math.PI + Math.random() * 2 * Math.PI, t0 = performance.now(), dur = 4200;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur); ang = from + (to - from) * (1 - (1 - p) ** 4); draw();
        if (p < 1) return requestAnimationFrame(step);
        spinning = false;
        // Pointer sits at the top (−90°).
        const n = L.length, rel = ((-Math.PI / 2 - ang) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        $("#res", ui).textContent = "🎉 " + L[Math.floor(rel / (2 * Math.PI / n))]; navigator.vibrate?.(80);
      };
      requestAnimationFrame(step);
    };
    draw();
  },
});

tool({
  id: "tally", cat: "daily", icon: I.tally, name: "ตัวนับจำนวน",
  desc: "กดนับจำนวน (Tally counter) หลายตัว บันทึกค่าไว้ในเครื่อง เหมาะกับนับคน นับของ นับรอบ",
  keywords: "tally counter นับ จำนวน คลิก count",
  render(body) {
    let cs = store.get("tally", [{ n: "ตัวนับ 1", v: 0 }]);
    const ui = h(`<div><div class="clock-list" id="l"></div><div class="actions"><button class="btn btn-ghost btn-sm" id="add">+ เพิ่มตัวนับ</button></div></div>`);
    body.append(ui);
    const save = () => { store.set("tally", cs); draw(); };
    const draw = () => $("#l", ui).innerHTML = cs.map((c, i) => `<div style="align-items:center;gap:10px"><input class="input" data-name="${i}" value="${esc(c.n)}" style="flex:1;min-width:0"><button class="btn btn-ghost" data-d="${i}" data-x="-1">−</button><b style="min-width:64px;text-align:center">${c.v}</b><button class="btn btn-gold" data-d="${i}" data-x="1">+</button><button class="btn btn-ghost btn-sm" data-z="${i}" title="รีเซ็ต">↺</button></div>`).join("");
    $("#l", ui).onclick = e => {
      const b = e.target.closest("[data-d]"), z = e.target.closest("[data-z]");
      if (b) { cs[+b.dataset.d].v += +b.dataset.x; navigator.vibrate?.(15); save(); }
      if (z) { if (cs[+z.dataset.z].v === 0 && cs.length > 1) cs.splice(+z.dataset.z, 1); else cs[+z.dataset.z].v = 0; save(); }
    };
    $("#l", ui).onchange = e => { const n = e.target.closest("[data-name]"); if (n) { cs[+n.dataset.name].n = n.value; store.set("tally", cs); } };
    $("#add", ui).onclick = () => { cs.push({ n: "ตัวนับ " + (cs.length + 1), v: 0 }); save(); };
    draw();
  },
});

tool({
  id: "qr", cat: "daily", icon: I.qr, name: "สร้าง QR Code",
  desc: "สร้าง QR Code จากลิงก์ ข้อความ หรือ Wi-Fi (สแกนแล้วเชื่อมต่อได้ทันที) ดาวน์โหลดเป็น PNG",
  keywords: "qr code คิวอาร์ link url wifi",
  render(body) {
    const ui = h(`<div><div class="tabs"><button class="chip active" data-m="text">ลิงก์ / ข้อความ</button><button class="chip" data-m="wifi">Wi-Fi</button></div>
      <div id="mText"><div class="field"><label>ลิงก์หรือข้อความ</label><input class="input" id="t" value="https://github.com" /></div></div>
      <div id="mWifi" hidden><div class="row" style="margin-top:0"><div class="field"><label>ชื่อ Wi-Fi (SSID)</label><input class="input" id="ssid"></div><div class="field"><label>รหัสผ่าน</label><input class="input" id="pw"></div><div class="field"><label>ความปลอดภัย</label><select class="input" id="enc"><option>WPA</option><option>WEP</option><option value="nopass">ไม่มีรหัส</option></select></div></div></div>
      <div class="qr-box" id="box"></div>
      <div class="actions" style="justify-content:center"><button class="btn btn-gold" id="dl">ดาวน์โหลด PNG</button></div><div class="status" id="st" style="text-align:center"></div></div>`);
    body.append(ui);
    let canvas, mode = "text";
    const wifiEsc = s => s.replace(/([\\;,:"])/g, "\\$1");
    const payload = () => mode === "wifi" ? `WIFI:T:${$("#enc", ui).value};S:${wifiEsc($("#ssid", ui).value)};P:${wifiEsc($("#pw", ui).value)};;` : $("#t", ui).value || " ";
    const draw = async () => {
      try {
        await loadScript(LIB.qr);
        const q = qrcode(0, "M"); q.addData(unescape(encodeURIComponent(payload()))); q.make();
        const n = q.getModuleCount(), cell = Math.max(4, Math.floor(1024 / (n + 8))), size = (n + 8) * cell;
        canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size); ctx.fillStyle = "#111";
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect((c + 4) * cell, (r + 4) * cell, cell, cell);
        $("#box", ui).innerHTML = `<img src="${canvas.toDataURL()}" alt="QR Code">`;
        setStatus($("#st", ui), "");
      } catch (e) { setStatus($("#st", ui), String(e.message || e).includes("overflow") ? "ข้อความยาวเกินไป" : String(e.message || e), true); }
    };
    $$(".tabs .chip", ui).forEach(b => b.onclick = () => { mode = b.dataset.m; $$(".tabs .chip", ui).forEach(x => x.classList.toggle("active", x === b)); $("#mText", ui).hidden = mode !== "text"; $("#mWifi", ui).hidden = mode !== "wifi"; draw(); });
    let t; $$("input, select", ui).forEach(el => el.oninput = () => { clearTimeout(t); t = setTimeout(draw, 200); });
    $("#dl", ui).onclick = () => canvas && canvas.toBlob(b => download(b, "qrcode.png"));
    draw();
  },
});

tool({
  id: "qr-scan", cat: "daily", icon: I.scan, name: "สแกน QR Code",
  desc: "สแกน QR ด้วยกล้องมือถือหรือจากรูปภาพ แสดงลิงก์/ข้อความ คัดลอกหรือเปิดได้ทันที",
  keywords: "qr scanner scan อ่าน qr กล้อง camera barcode",
  render(body) {
    const ui = h(`<div><div class="actions" style="margin-top:0"><button class="btn btn-gold" id="cam">📷 เปิดกล้อง</button><label class="btn btn-ghost">🖼 จากรูปภาพ<input type="file" accept="image/*" id="f" hidden></label></div>
      <video id="v" class="media" playsinline muted hidden></video><div class="status" id="st"></div><div class="result" id="res" hidden></div></div>`);
    body.append(ui);
    let stream, raf;
    const v = $("#v", ui), st = $("#st", ui), cv = document.createElement("canvas"), ctx = cv.getContext("2d", { willReadFrequently: true });
    const show = (text) => {
      const r = $("#res", ui); r.hidden = false;
      const isUrl = /^https?:\/\//i.test(text);
      r.innerHTML = `<b style="word-break:break-all">${esc(text)}</b><div class="actions"><button class="btn btn-ghost btn-sm" id="c">คัดลอก</button>${isUrl ? `<a class="btn btn-gold btn-sm" href="${esc(text)}" target="_blank" rel="noopener noreferrer">เปิดลิงก์ ↗</a>` : ""}</div>`;
      $("#c", r).onclick = () => copy(text); navigator.vibrate?.(60);
    };
    const decode = (w, hgt) => { const d = ctx.getImageData(0, 0, w, hgt); return jsQR(d.data, w, hgt)?.data; };
    const stopCam = () => { cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); stream = null; v.hidden = true; $("#cam", ui).textContent = "📷 เปิดกล้อง"; };
    const scan = () => {
      if (v.readyState >= 2) {
        cv.width = v.videoWidth; cv.height = v.videoHeight; ctx.drawImage(v, 0, 0);
        const r = decode(cv.width, cv.height);
        if (r) { show(r); stopCam(); setStatus(st, "สแกนสำเร็จ ✓"); return; }
      }
      raf = requestAnimationFrame(scan);
    };
    $("#cam", ui).onclick = async () => {
      if (stream) return stopCam();
      try {
        await loadScript(LIB.jsqr);
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        v.srcObject = stream; v.hidden = false; await v.play(); $("#cam", ui).textContent = "■ ปิดกล้อง"; setStatus(st, "เล็งกล้องไปที่ QR Code…"); scan();
      } catch (e) { setStatus(st, "เปิดกล้องไม่ได้: " + e.message, true); }
    };
    $("#f", ui).onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        await loadScript(LIB.jsqr);
        const img = await loadImage(f), s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        cv.width = img.naturalWidth * s; cv.height = img.naturalHeight * s; ctx.drawImage(img, 0, 0, cv.width, cv.height);
        const r = decode(cv.width, cv.height);
        if (r) { show(r); setStatus(st, "อ่านสำเร็จ ✓"); } else setStatus(st, "ไม่พบ QR Code ในรูปนี้", true);
      } catch (err) { setStatus(st, err.message, true); }
    };
    return stopCam;
  },
});

tool({
  id: "password", cat: "daily", icon: I.key, name: "สร้างรหัสผ่าน",
  desc: "สร้างรหัสผ่านที่แข็งแรงด้วยการสุ่มแบบเข้ารหัส กำหนดความยาวและชนิดอักขระได้",
  keywords: "password generator รหัสผ่าน random security",
  render(body) {
    const ui = h(`<div><div class="pw" id="pw"></div><div class="status center" id="str"></div>
      <div class="row"><div class="field"><label>ความยาว: <span id="lv">20</span></label><input type="range" id="len" min="6" max="64" value="20" /></div></div>
      <div class="actions"><label class="check"><input type="checkbox" data-s="ABCDEFGHJKLMNPQRSTUVWXYZ" checked>A-Z</label><label class="check"><input type="checkbox" data-s="abcdefghijkmnopqrstuvwxyz" checked>a-z</label><label class="check"><input type="checkbox" data-s="23456789" checked>0-9</label><label class="check"><input type="checkbox" data-s="!@#$%^&*-_=+?" checked>สัญลักษณ์</label></div>
      <div class="actions"><button class="btn btn-gold" id="gen">สุ่มใหม่</button><button class="btn btn-ghost" id="cp">คัดลอก</button></div></div>`);
    body.append(ui);
    const gen = () => {
      const pool = $$("[data-s]", ui).filter(c => c.checked).map(c => c.dataset.s).join("");
      const len = +$("#len", ui).value; $("#lv", ui).textContent = len;
      if (!pool) { $("#pw", ui).textContent = "เลือกชนิดอักขระอย่างน้อย 1 อย่าง"; return; }
      const r = crypto.getRandomValues(new Uint32Array(len));
      $("#pw", ui).textContent = [...r].map(n => pool[n % pool.length]).join("");
      const bits = Math.round(len * Math.log2(pool.length));
      setStatus($("#str", ui), `ความแข็งแรง ~${bits} bits · ${bits < 50 ? "อ่อน" : bits < 80 ? "ปานกลาง" : bits < 110 ? "แข็งแรง" : "แข็งแรงมาก"}`);
    };
    $$("input", ui).forEach(i => i.oninput = gen);
    $("#gen", ui).onclick = gen; $("#cp", ui).onclick = () => copy($("#pw", ui).textContent);
    gen();
  },
});

tool({
  id: "teams", cat: "daily", icon: I.team, name: "สุ่มแบ่งทีม / จับคู่",
  desc: "ใส่รายชื่อแล้วสุ่มแบ่งเป็นกลุ่มตามจำนวนทีมหรือจำนวนคนต่อทีม สุ่มลำดับเวร หรือจับคู่",
  keywords: "random team group แบ่งทีม แบ่งกลุ่ม จับคู่ สุ่มชื่อ",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" style="font-family:var(--font-body)" placeholder="หนึ่งชื่อต่อบรรทัด">${store.get("teams", "เอ\nบี\nซี\nดี\nอี\nเอฟ\nจี\nเอช")}</textarea>
      <div class="row"><div class="field"><label>แบ่งโดย</label><select class="input" id="m"><option value="teams">จำนวนทีม</option><option value="size">จำนวนคนต่อทีม</option></select></div><div class="field"><label>จำนวน</label><input class="input" type="number" id="n" value="2" min="1"></div></div>
      <div class="actions"><button class="btn btn-gold" id="go">สุ่มแบ่งทีม</button><button class="btn btn-ghost" id="cp">คัดลอกผล</button></div>
      <div class="team-list" id="out"></div></div>`);
    body.append(ui);
    let text = "";
    $("#go", ui).onclick = () => {
      const names = $("#t", ui).value.split("\n").map(s => s.trim()).filter(Boolean); store.set("teams", $("#t", ui).value);
      for (let i = names.length - 1; i > 0; i--) { const j = rnd(i + 1); [names[i], names[j]] = [names[j], names[i]]; }
      const n = Math.max(1, Math.round(num($("#n", ui).value))), k = $("#m", ui).value === "teams" ? Math.min(n, names.length) : Math.ceil(names.length / n);
      const teams = Array.from({ length: k }, () => []); names.forEach((x, i) => teams[i % k].push(x));
      $("#out", ui).innerHTML = teams.map((t, i) => `<div class="stat"><span>ทีม ${i + 1} · ${t.length} คน</span>${t.map(x => `<div>${esc(x)}</div>`).join("")}</div>`).join("");
      text = teams.map((t, i) => `ทีม ${i + 1}: ${t.join(", ")}`).join("\n");
    };
    $("#cp", ui).onclick = () => text && copy(text);
  },
});
