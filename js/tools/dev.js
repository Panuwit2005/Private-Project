// Developer tools: JSON, Base64, URL encode, hash, UUID, timestamp, regex tester, JWT decoder, color converter.

tool({
  id: "json", cat: "dev", icon: I.code, name: "JSON Formatter",
  desc: "จัดรูปแบบ ตรวจสอบ ย่อ และเรียงคีย์ JSON พร้อมแจ้งตำแหน่งที่ผิดพลาด",
  keywords: "json format beautify minify validate developer",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" placeholder='{"hello":"world"}'></textarea>
      <div class="actions"><button class="btn btn-gold btn-sm" data-a="pretty">จัดรูปแบบ</button><button class="btn btn-ghost btn-sm" data-a="min">ย่อ</button><button class="btn btn-ghost btn-sm" data-a="sort">เรียงคีย์</button><button class="btn btn-ghost btn-sm" data-a="copy">คัดลอก</button></div>
      <div class="status" id="st"></div></div>`);
    body.append(ui);
    const sortKeys = v => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v;
    $$("[data-a]", ui).forEach(b => b.onclick = () => {
      const t = $("#t", ui), st = $("#st", ui), a = b.dataset.a;
      if (a === "copy") return copy(t.value);
      try {
        let v = JSON.parse(t.value); if (a === "sort") v = sortKeys(v);
        t.value = JSON.stringify(v, null, a === "min" ? 0 : 2);
        setStatus(st, "JSON ถูกต้อง ✓");
      } catch (e) { setStatus(st, "JSON ไม่ถูกต้อง: " + e.message, true); }
    });
  },
});

tool({
  id: "base64", cat: "dev", persist: false, icon: I.binary, name: "Base64 เข้ารหัส / ถอดรหัส",
  desc: "แปลงข้อความหรือไฟล์เป็น Base64 และถอดกลับ รองรับภาษาไทยเต็มรูปแบบ",
  keywords: "base64 encode decode เข้ารหัส developer data url",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" placeholder="ข้อความ หรือ Base64"></textarea>
      <div class="actions"><button class="btn btn-gold btn-sm" data-a="enc">เข้ารหัส</button><button class="btn btn-ghost btn-sm" data-a="dec">ถอดรหัส</button><button class="btn btn-ghost btn-sm" data-a="copy">คัดลอก</button>
      <label class="btn btn-ghost btn-sm">ไฟล์ → Base64<input type="file" id="f" hidden></label></div><div class="status" id="st"></div></div>`);
    body.append(ui);
    const t = $("#t", ui), st = $("#st", ui);
    $$("[data-a]", ui).forEach(b => b.onclick = () => {
      setStatus(st, "");
      try {
        if (b.dataset.a === "copy") return copy(t.value);
        if (b.dataset.a === "enc") { const bytes = new TextEncoder().encode(t.value); let s = ""; bytes.forEach(x => s += String.fromCharCode(x)); t.value = btoa(s); }
        else t.value = new TextDecoder().decode(Uint8Array.from(atob(t.value.trim().replace(/^data:[^,]+,/, "")), c => c.charCodeAt(0)));
      } catch { setStatus(st, "ข้อมูล Base64 ไม่ถูกต้อง", true); }
    });
    $("#f", ui).onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => { t.value = r.result; setStatus(st, `${f.name} → ${fmtSize(r.result.length)} (Data URL)`); }; r.readAsDataURL(f);
    };
  },
});

tool({
  id: "url-enc", cat: "dev", icon: I.link, name: "URL Encode / Decode",
  desc: "เข้ารหัส/ถอดรหัส URL และแยกส่วนประกอบลิงก์ (โดเมน, path, query) ให้อ่านง่าย",
  keywords: "url encode decode percent query string ลิงก์ ภาษาไทย",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" style="min-height:100px">https://example.com/ค้นหา?q=สวัสดี&page=2</textarea>
      <div class="actions"><button class="btn btn-gold btn-sm" data-a="enc">Encode</button><button class="btn btn-ghost btn-sm" data-a="dec">Decode</button><button class="btn btn-ghost btn-sm" data-a="copy">คัดลอก</button></div>
      <div class="status" id="st"></div><div class="kv" id="kv"></div></div>`);
    body.append(ui);
    const t = $("#t", ui);
    const parse = () => {
      try {
        const u = new URL(t.value.trim());
        const rows = [["Protocol", u.protocol], ["Host", u.host], ["Path", decodeURIComponent(u.pathname)], ...[...u.searchParams].map(([k, v]) => ["?" + k, v]), ...(u.hash ? [["Hash", u.hash]] : [])];
        $("#kv", ui).innerHTML = rows.map(([k, v]) => `<span>${esc(k)}</span><code>${esc(v)}</code><span></span>`).join("");
      } catch { $("#kv", ui).innerHTML = ""; }
    };
    $$("[data-a]", ui).forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      if (a === "copy") return copy(t.value);
      try { t.value = a === "enc" ? encodeURI(decodeURI(t.value)) : decodeURIComponent(t.value); setStatus($("#st", ui), ""); }
      catch { setStatus($("#st", ui), "ข้อความไม่ใช่ URL ที่ถูกต้อง", true); }
      parse();
    });
    t.oninput = parse; parse();
  },
});

tool({
  id: "hash", cat: "dev", also: ["security"], persist: false, icon: I.hash, name: "สร้าง Hash (SHA)",
  desc: "คำนวณ SHA-1, SHA-256, SHA-512 ของข้อความหรือไฟล์ ใช้ตรวจสอบความถูกต้องของไฟล์ที่ดาวน์โหลด",
  keywords: "hash sha256 sha1 sha512 checksum ตรวจสอบไฟล์",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" style="min-height:90px" placeholder="พิมพ์ข้อความ หรือเลือกไฟล์ด้านล่าง">hello</textarea>
      <div class="actions"><label class="btn btn-ghost btn-sm">เลือกไฟล์<input type="file" id="f" hidden></label></div>
      <div class="status" id="st"></div><div class="kv" id="kv"></div></div>`);
    body.append(ui);
    const hex = buf => [...new Uint8Array(buf)].map(b => pad(b.toString(16))).join("");
    const run = async (data, label) => {
      if (!crypto.subtle) return setStatus($("#st", ui), "ต้องเปิดผ่าน HTTPS เพื่อใช้ฟีเจอร์นี้", true);
      const rows = await Promise.all(["SHA-1", "SHA-256", "SHA-512"].map(async a => [a, hex(await crypto.subtle.digest(a, data))]));
      $("#kv", ui).innerHTML = rows.map(([a, v]) => `<span>${a}</span><code>${v}</code><button class="btn btn-ghost btn-sm" data-c="${v}">คัดลอก</button>`).join("");
      $$("[data-c]", ui).forEach(b => b.onclick = () => copy(b.dataset.c));
      setStatus($("#st", ui), label);
    };
    $("#t", ui).oninput = e => run(new TextEncoder().encode(e.target.value), "จากข้อความ");
    $("#f", ui).onchange = async e => { const f = e.target.files[0]; if (f) run(await f.arrayBuffer(), `ไฟล์: ${f.name} (${fmtSize(f.size)})`); };
    run(new TextEncoder().encode("hello"), "จากข้อความ");
  },
});

tool({
  id: "uuid", cat: "dev", icon: I.id, name: "สร้าง UUID",
  desc: "สร้าง UUID v4 แบบสุ่มทีละหลายรายการ คัดลอกได้ทันที",
  keywords: "uuid guid random id generator",
  render(body) {
    const ui = h(`<div><div class="row"><div class="field"><label>จำนวน</label><input class="input" type="number" id="n" value="5" min="1" max="500"></div>
      <div class="field" style="flex:0 0 auto"><label class="check"><input type="checkbox" id="up"> ตัวพิมพ์ใหญ่</label></div><div class="field" style="flex:0 0 auto"><label class="check"><input type="checkbox" id="nd"> ไม่มีขีด</label></div></div>
      <textarea class="input" id="t" style="margin-top:16px" readonly></textarea>
      <div class="actions"><button class="btn btn-gold btn-sm" id="go">สุ่มใหม่</button><button class="btn btn-ghost btn-sm" id="cp">คัดลอกทั้งหมด</button></div></div>`);
    body.append(ui);
    const uuid = () => crypto.randomUUID ? crypto.randomUUID() : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    const gen = () => {
      const n = Math.min(500, Math.max(1, +$("#n", ui).value || 1));
      $("#t", ui).value = [...Array(n)].map(() => { let u = uuid(); if ($("#nd", ui).checked) u = u.replace(/-/g, ""); return $("#up", ui).checked ? u.toUpperCase() : u; }).join("\n");
    };
    $$("input", ui).forEach(i => i.oninput = gen);
    $("#go", ui).onclick = gen; $("#cp", ui).onclick = () => copy($("#t", ui).value); gen();
  },
});

tool({
  id: "timestamp", cat: "dev", persist: false, icon: I.clock, name: "Unix Timestamp",
  desc: "แปลง Unix timestamp ⇄ วันเวลา (ไทย/UTC/ISO) พร้อมเวลาปัจจุบันแบบสด",
  keywords: "unix timestamp epoch date time แปลงเวลา",
  render(body) {
    const ui = h(`<div><div class="result center"><small style="color:var(--color-text-muted)">ตอนนี้ (วินาที)</small><div class="big sm" id="now"></div></div>
      <div class="row"><div class="field"><label>Timestamp (วินาทีหรือมิลลิวินาที)</label><input class="input" id="ts"></div><div class="field"><label>หรือเลือกวันเวลา</label><input class="input" type="datetime-local" id="dt" step="1"></div></div>
      <div class="kv" id="kv"></div></div>`);
    body.append(ui);
    const show = d => {
      if (isNaN(d)) { $("#kv", ui).innerHTML = `<span style="color:var(--color-danger)">ค่าไม่ถูกต้อง</span>`; return; }
      const rows = [["วินาที", Math.floor(d / 1000)], ["มิลลิวินาที", d.getTime()], ["เวลาไทย", d.toLocaleString("th-TH", { dateStyle: "full", timeStyle: "medium" })], ["UTC", d.toUTCString()], ["ISO 8601", d.toISOString()]];
      $("#kv", ui).innerHTML = rows.map(([k, v]) => `<span>${k}</span><code>${esc(v)}</code><button class="btn btn-ghost btn-sm" data-c="${esc(v)}">คัดลอก</button>`).join("");
      $$("[data-c]", ui).forEach(b => b.onclick = () => copy(b.dataset.c));
    };
    $("#ts", ui).oninput = e => { const v = e.target.value.trim(); if (/^-?\d+$/.test(v)) show(new Date(v.length > 11 ? +v : v * 1000)); };
    $("#dt", ui).oninput = e => show(new Date(e.target.value));
    const tickNow = () => $("#now", ui).textContent = Math.floor(Date.now() / 1000);
    tickNow(); const iv = setInterval(tickNow, 1000);
    $("#ts", ui).value = Math.floor(Date.now() / 1000); show(new Date());
    return () => clearInterval(iv);
  },
});

tool({
  id: "regex", cat: "dev", icon: I.regex, name: "Regex Tester",
  desc: "ทดสอบ Regular Expression แบบเรียลไทม์ ไฮไลต์ผลลัพธ์และแสดงกลุ่มที่จับได้",
  keywords: "regex regular expression test pattern",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>Pattern</label><input class="input" id="p" value="\\d{3}-\\d{3}-\\d{4}" style="font-family:ui-monospace,monospace"></div><div class="field" style="flex:0 0 100px"><label>Flags</label><input class="input" id="fl" value="g"></div></div>
      <div class="field" style="margin-top:14px"><label>ข้อความทดสอบ</label><textarea class="input" id="t">โทร 081-234-5678 หรือ 092-111-2222</textarea></div>
      <div class="status" id="st"></div><div class="preview" id="pv" style="white-space:pre-wrap"></div><div class="kv" id="kv"></div></div>`);
    body.append(ui);
    const run = () => {
      const st = $("#st", ui);
      try {
        let fl = $("#fl", ui).value; if (!fl.includes("g")) fl += "g";
        const re = new RegExp($("#p", ui).value, fl), t = $("#t", ui).value, ms = [...t.matchAll(re)].slice(0, 500);
        setStatus(st, `พบ ${ms.length} รายการ`);
        let html = "", last = 0;
        ms.forEach(m => { html += esc(t.slice(last, m.index)) + `<mark style="background:rgba(216,180,106,.35);color:inherit;border-radius:4px">${esc(m[0])}</mark>`; last = m.index + m[0].length; });
        $("#pv", ui).innerHTML = html + esc(t.slice(last));
        $("#kv", ui).innerHTML = ms.slice(0, 50).map((m, i) => `<span>#${i + 1}</span><code>${esc(m[0])}${m.length > 1 ? " → [" + m.slice(1).map(x => esc(x ?? "")).join(", ") + "]" : ""}</code><span>@${m.index}</span>`).join("");
      } catch (e) { setStatus(st, e.message, true); $("#pv", ui).textContent = ""; $("#kv", ui).innerHTML = ""; }
    };
    $$("input, textarea", ui).forEach(el => el.oninput = run); run();
  },
});

tool({
  id: "jwt", cat: "dev", also: ["security"], persist: false, icon: I.key, name: "JWT Decoder",
  desc: "ถอดรหัส JSON Web Token ดู Header, Payload และวันหมดอายุ (ไม่ส่งโทเคนออกจากเครื่อง)",
  keywords: "jwt token decode json web token auth",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" style="min-height:100px" placeholder="eyJhbGciOi..."></textarea><div class="status" id="st"></div>
      <div class="field" style="margin-top:12px"><label>Header</label><textarea class="input" id="hd" readonly style="min-height:80px"></textarea></div>
      <div class="field" style="margin-top:12px"><label>Payload</label><textarea class="input" id="pl" readonly></textarea></div></div>`);
    body.append(ui);
    const dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), c => c.charCodeAt(0)));
    $("#t", ui).oninput = e => {
      const st = $("#st", ui);
      try {
        const [hd, pl] = e.target.value.trim().split(".");
        const p = JSON.parse(dec(pl));
        $("#hd", ui).value = JSON.stringify(JSON.parse(dec(hd)), null, 2); $("#pl", ui).value = JSON.stringify(p, null, 2);
        if (p.exp) { const d = new Date(p.exp * 1000); setStatus(st, (d < new Date() ? "⚠ หมดอายุแล้วเมื่อ " : "หมดอายุ ") + d.toLocaleString("th-TH"), d < new Date()); }
        else setStatus(st, "ไม่มีวันหมดอายุ (exp)");
      } catch { setStatus(st, "JWT ไม่ถูกต้อง", true); }
    };
  },
});

tool({
  id: "color", cat: "dev", icon: I.palette, name: "แปลงสี & พาเลต",
  desc: "แปลงค่า HEX, RGB, HSL ตรวจสอบความคมชัด (contrast) และสร้างพาเลตโทนสีอัตโนมัติ",
  keywords: "color hex rgb hsl palette สี contrast",
  render(body) {
    const ui = h(`<div><div class="row"><div class="field" style="flex:0 0 90px"><label>เลือกสี</label><input type="color" id="c" value="#d8b46a" /></div>
      <div class="field"><label>HEX</label><input class="input" id="hex" /></div><div class="field"><label>RGB</label><input class="input" id="rgb" readonly /></div><div class="field"><label>HSL</label><input class="input" id="hsl" readonly /></div></div>
      <div class="status" id="ct"></div><div class="swatches" id="sw"></div></div>`);
    body.append(ui);
    const toRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    const toHsl = ([r, g, b]) => {
      r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let hh = 0, s = 0;
      if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
        hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
      return [Math.round(hh), Math.round(s * 100), Math.round(l * 100)];
    };
    const hslHex = (hh, s, l) => { s /= 100; l /= 100; const k = n => (n + hh / 30) % 12, a = s * Math.min(l, 1 - l);
      const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, "0");
      return "#" + f(0) + f(8) + f(4); };
    const lum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
    const set = hex => {
      const rgb = toRgb(hex), [hh, s, l] = toHsl(rgb), L = lum(rgb);
      $("#c", ui).value = hex; $("#hex", ui).value = hex.toUpperCase();
      $("#rgb", ui).value = `rgb(${rgb.join(", ")})`; $("#hsl", ui).value = `hsl(${hh}, ${s}%, ${l}%)`;
      const cw = (1.05 / (L + .05)).toFixed(2), cb = ((L + .05) / .05).toFixed(2);
      setStatus($("#ct", ui), `Contrast กับสีขาว ${cw}:1 · กับสีดำ ${cb}:1 → ตัวอักษรที่อ่านง่ายบนสีนี้คือ${+cw > +cb ? "สีขาว" : "สีดำ"}`);
      $("#sw", ui).innerHTML = [90, 72, 55, 38, 20].map(L => hslHex(hh, s, L)).map(c => `<button class="swatch" style="background:${c}" data-c="${c}"><span>${c.toUpperCase()}</span></button>`).join("");
      $$(".swatch", ui).forEach(b => b.onclick = () => copy(b.dataset.c.toUpperCase()));
    };
    $("#c", ui).oninput = e => set(e.target.value);
    $("#hex", ui).oninput = e => { const v = e.target.value.trim().replace(/^#?/, "#"); if (/^#[0-9a-f]{6}$/i.test(v)) set(v.toLowerCase()); };
    set("#d8b46a");
  },
});

tool({
  id: "base-conv", cat: "dev", icon: I.base, name: "แปลงเลขฐาน",
  desc: "แปลงตัวเลขระหว่างฐาน 2, 8, 10, 16 และฐานอื่นถึง 36 รองรับเลขขนาดใหญ่",
  keywords: "binary hex octal decimal base converter เลขฐาน ฐานสอง ฐานสิบหก",
  render(body) {
    const B = [[2, "ฐาน 2 (Binary)"], [8, "ฐาน 8 (Octal)"], [10, "ฐาน 10 (Decimal)"], [16, "ฐาน 16 (Hex)"]];
    const ui = h(`<div>${B.map(([b, l]) => `<div class="field" style="margin-top:12px"><label>${l}</label><input class="input" data-b="${b}" style="font-family:var(--font-mono)" spellcheck="false"></div>`).join("")}
      <div class="row"><div class="field"><label>ฐานอื่น (2–36)</label><input class="input" type="number" id="cb" value="36" min="2" max="36"></div><div class="field" style="flex:3"><label>ค่า</label><input class="input" data-b="x" style="font-family:var(--font-mono)" spellcheck="false"></div></div>
      <div class="status" id="st"></div></div>`);
    body.append(ui);
    const digits = "0123456789abcdefghijklmnopqrstuvwxyz";
    const parse = (s, b) => { let v = 0n; for (const ch of s.toLowerCase().replace(/[\s_]/g, "")) { const d = digits.indexOf(ch); if (d < 0 || d >= b) throw new Error(`“${ch}” ไม่ใช่ตัวเลขในฐาน ${b}`); v = v * BigInt(b) + BigInt(d); } return v; };
    const fill = (v, src) => $$("[data-b]", ui).forEach(i => { if (i === src) return; const b = i.dataset.b === "x" ? +$("#cb", ui).value : +i.dataset.b; i.value = v.toString(b).toUpperCase(); });
    $$("[data-b]", ui).forEach(i => i.oninput = () => {
      try { const b = i.dataset.b === "x" ? +$("#cb", ui).value : +i.dataset.b; if (!i.value.trim()) return; fill(parse(i.value, b), i); setStatus($("#st", ui), ""); }
      catch (e) { setStatus($("#st", ui), e.message, true); }
    });
    $("#cb", ui).oninput = () => { const d = $('[data-b="10"]', ui); if (d.value) d.oninput(); };
    $('[data-b="10"]', ui).value = "2026"; $('[data-b="10"]', ui).oninput();
  },
});

tool({
  id: "device-info", cat: "dev", also: ["daily"], icon: I.monitor, name: "ข้อมูลอุปกรณ์ & เบราว์เซอร์",
  desc: "ดูขนาดหน้าจอ ความละเอียด เบราว์เซอร์ ภาษา เขตเวลา การรองรับฟีเจอร์ และพื้นที่เก็บข้อมูลของเครื่องนี้",
  keywords: "device info user agent screen resolution browser ข้อมูลเครื่อง ขนาดจอ",
  render(body) {
    const ui = h(`<div><div class="kv" id="kv"></div><div class="actions"><button class="btn btn-ghost btn-sm" id="cp">คัดลอกทั้งหมด</button></div></div>`);
    body.append(ui);
    const rows = [];
    const draw = async () => {
      const n = navigator, s = screen, mm = (q) => matchMedia(q).matches;
      rows.length = 0;
      rows.push(["หน้าจอ", `${s.width} × ${s.height} px (×${devicePixelRatio} = ${Math.round(s.width * devicePixelRatio)} × ${Math.round(s.height * devicePixelRatio)})`],
        ["พื้นที่แสดงผล", `${innerWidth} × ${innerHeight} px`], ["ระบบ/เบราว์เซอร์", n.userAgent], ["ภาษา", (n.languages || [n.language]).join(", ")],
        ["เขตเวลา", Intl.DateTimeFormat().resolvedOptions().timeZone], ["ธีมระบบ", mm("(prefers-color-scheme: dark)") ? "มืด" : "สว่าง"],
        ["ลดการเคลื่อนไหว", mm("(prefers-reduced-motion: reduce)") ? "เปิด" : "ปิด"], ["จอสัมผัส", n.maxTouchPoints > 0 ? `ใช่ (${n.maxTouchPoints} จุด)` : "ไม่ใช่"],
        ["CPU (เธรด)", n.hardwareConcurrency || "ไม่ทราบ"], ["ติดตั้งเป็นแอป", mm("(display-mode: standalone)") || n.standalone ? "ใช่" : "ไม่ใช่"], ["ออนไลน์", n.onLine ? "ใช่" : "ไม่ใช่"]);
      if (n.connection?.effectiveType) rows.push(["เครือข่าย", n.connection.effectiveType]);
      if (n.storage?.estimate) { try { const e = await n.storage.estimate(); rows.push(["พื้นที่ที่เว็บนี้ใช้", `${fmtSize(e.usage || 0)} จาก ${fmtSize(e.quota || 0)}`]); } catch {} }
      $("#kv", ui).innerHTML = rows.map(([k, v]) => `<span>${k}</span><code>${esc(v)}</code><span></span>`).join("");
    };
    $("#cp", ui).onclick = () => copy(rows.map(([k, v]) => `${k}: ${v}`).join("\n"));
    addEventListener("resize", draw); draw();
    return () => removeEventListener("resize", draw);
  },
});

tool({
  id: "html-entity", cat: "dev", icon: I.code, name: "HTML Entity / Escape",
  desc: "แปลงอักขระพิเศษเป็น HTML entity (&lt; &amp; &quot;) และถอดกลับ รวมถึง escape สำหรับ JavaScript/JSON string",
  keywords: "html entity escape unescape encode decode &lt; &amp; string",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t">&lt;a href="x"&gt;ร้านกาแฟ & ขนม&lt;/a&gt;</textarea>
      <div class="actions"><button class="btn btn-gold btn-sm" data-a="enc">HTML encode</button><button class="btn btn-ghost btn-sm" data-a="dec">HTML decode</button><button class="btn btn-ghost btn-sm" data-a="js">JS/JSON escape</button><button class="btn btn-ghost btn-sm" data-a="unjs">JS/JSON unescape</button><button class="btn btn-ghost btn-sm" data-a="cp">คัดลอก</button></div><div class="status" id="st"></div></div>`);
    body.append(ui);
    $$("[data-a]", ui).forEach(b => b.onclick = () => {
      const t = $("#t", ui), a = b.dataset.a; setStatus($("#st", ui), "");
      if (a === "cp") return copy(t.value);
      try {
        if (a === "enc") t.value = esc(t.value);
        if (a === "dec") { const x = document.createElement("textarea"); x.innerHTML = t.value; t.value = x.value; } // RCDATA: decodes entities, never runs markup
        if (a === "js") t.value = JSON.stringify(t.value).slice(1, -1);
        if (a === "unjs") t.value = JSON.parse(`"${t.value.replace(/(^|[^\\])"/g, '$1\\"')}"`);
      } catch (e) { setStatus($("#st", ui), "แปลงไม่ได้: " + e.message, true); }
    });
  },
});

// ---------- Case converter ----------
const splitWords = (s) => s.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const CASES = [
  ["camelCase", (w) => w.map((x, i) => i ? x[0].toUpperCase() + x.slice(1).toLowerCase() : x.toLowerCase()).join("")],
  ["PascalCase", (w) => w.map(x => x[0].toUpperCase() + x.slice(1).toLowerCase()).join("")],
  ["snake_case", (w) => w.map(x => x.toLowerCase()).join("_")],
  ["CONSTANT_CASE", (w) => w.map(x => x.toUpperCase()).join("_")],
  ["kebab-case", (w) => w.map(x => x.toLowerCase()).join("-")],
  ["Title Case", (w) => w.map(x => x[0].toUpperCase() + x.slice(1).toLowerCase()).join(" ")],
  ["dot.case", (w) => w.map(x => x.toLowerCase()).join(".")],
  ["path/case", (w) => w.map(x => x.toLowerCase()).join("/")],
];
tool({
  id: "case-convert", cat: "dev", also: ["text"], fresh: true, icon: I.text, name: "แปลงรูปแบบตัวพิมพ์ (camelCase, snake_case…)",
  desc: "แปลงชื่อตัวแปรหรือข้อความเป็น camelCase, PascalCase, snake_case, kebab-case, UPPER, lower ได้ทุกแบบพร้อมกัน แตะเพื่อคัดลอก",
  keywords: "case converter camelcase snake_case kebab pascal upper lower title ตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ชื่อตัวแปร",
  render(body) {
    const ui = h(`<div><div class="field"><label for="src">ข้อความ</label><textarea class="input" id="src" style="min-height:80px">user profile image URL</textarea><small class="field-msg">ใส่หลายบรรทัดได้ แปลงทีละบรรทัด</small></div><div class="data-list" id="out" style="margin-top:14px"></div></div>`);
    body.append(ui);
    const ALL = [...CASES, ["UPPERCASE", null], ["lowercase", null], ["Sentence case", null]];
    const conv = (name, fn, line) => fn ? (splitWords(line).length ? fn(splitWords(line)) : "")
      : name === "UPPERCASE" ? line.toUpperCase() : name === "lowercase" ? line.toLowerCase() : line.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
    const run = () => {
      const lines = $("#src", ui).value.split("\n");
      $("#out", ui).innerHTML = ALL.map(([n, fn]) => { const v = lines.map(l => conv(n, fn, l)).join("\n"); return `<button type="button" class="smart-item" data-v="${esc(v)}" style="width:100%;text-align:left"><span class="smart-text"><small>${n}</small><code style="display:block;white-space:pre-wrap;word-break:break-all;color:var(--color-accent-strong)">${esc(v) || "—"}</code></span></button>`; }).join("");
      $$("[data-v]", ui).forEach(b => b.onclick = () => copy(b.dataset.v));
    };
    $("#src", ui).oninput = run; run();
  },
});

// ---------- Code beautify / minify ----------
function fmtMarkup(src, xml) {
  const VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i, RAW = /^(pre|script|style|textarea)$/i;
  const INLINE = /^(a|abbr|b|bdi|bdo|br|cite|code|data|dfn|em|i|kbd|label|mark|q|s|samp|small|span|strong|sub|sup|time|u|var)$/i;
  // <script>/<style>/<pre>/<textarea> bodies are one token so their content is never re-indented.
  const tokens = (src.replace(/>\s+</g, "><").trim().match(/<(script|style|pre|textarea)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->|<[^>]+>|[^<]+|</gi) || []).filter(t => t.trim());
  const out = [], stack = []; let depth = 0, inl = false;
  const add = (t) => { out[out.length - 1] += t.replace(/\s+/g, " "); };
  for (const t of tokens) {
    const isTag = /^<[!?/\w]/.test(t), close = /^<\//.test(t), open = /^<[^!?/]/.test(t), name = (t.match(/^<\/?([\w:-]+)/) || [])[1] || "";
    const self = /\/>$/.test(t) || (!xml && (VOID.test(name) || RAW.test(name)));
    // Text and inline tags (<b>, <a>…) stay on one line with the text around them.
    if (!isTag || (!xml && INLINE.test(name))) {
      const last = out.length - 1;
      if (inl || (last >= 0 && stack[stack.length - 1] === last && />$/.test(out[last]))) add(t);
      else out.push("  ".repeat(depth) + t.trim());
      inl = true; continue;
    }
    if (close) {
      depth = Math.max(0, depth - 1);
      // An element whose content all fits on its opening line closes on that line too.
      if (stack.pop() === out.length - 1) { add(t); inl = false; continue; }
    }
    inl = false;
    out.push("  ".repeat(depth) + t.trim());
    if (open && !self) { stack.push(out.length - 1); depth++; }
  }
  return out.join("\n");
}
function fmtCss(src) {
  // Comments and (...) groups such as url(data:…;base64,…) are set aside so their ; , : are left alone.
  const keep = [], hold = (m) => `\u0001${keep.push(m) - 1}\u0001`;
  let d = 0;
  const css = src.replace(/\/\*[\s\S]*?\*\//g, m => hold(m + "\n") + "\u0002").replace(/\([^()]*\)/g, hold);
  return css.replace(/\s+/g, " ").replace(/([^;{}\s])\s*}/g, "$1;}").replace(/\s*([{};])\s*/g, "$1").split(/(?<=[{};])/).map(p => {
    p = p.trim(); if (!p) return "";
    if (p === "}") { d = Math.max(0, d - 1); return "  ".repeat(d) + "}"; }
    const line = "  ".repeat(d) + (p.endsWith("{") ? p.replace(/\s*,\s*/g, ",\n" + "  ".repeat(d)).replace(/\s*{$/, " {") : p.replace(/:(?!\s)/, ": "));
    if (p.endsWith("{")) d++;
    return line;
  }).filter(Boolean).join("\n").replace(/}\n(?=[^\s}])/g, "}\n\n").replace(/\u0002 ?/g, "").replace(/\u0001(\d+)\u0001/g, (_, i) => keep[i]).trim();
}
const SQL_KW = "select|from|where|and|or|order by|group by|having|limit|offset|insert into|values|update|set|delete from|left join|right join|inner join|outer join|full join|join|on|union all|union|create table|alter table|drop table|as|in|not|null|is|like|between|distinct|count|sum|avg|min|max|case|when|then|else|end|desc|asc";
function fmtSql(src) {
  let s = src.replace(/\s+/g, " ").trim().replace(new RegExp(`\\b(${SQL_KW})\\b`, "gi"), m => m.toUpperCase());
  s = s.replace(/\s*\b(SELECT|FROM|WHERE|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|UNION ALL|UNION|(?:LEFT |RIGHT |INNER |OUTER |FULL )?JOIN)\b/g, "\n$1");
  s = s.replace(/\s*\b(AND|OR)\b\s*/g, "\n  $1 ").replace(/,\s*(?![^(]*\))/g, ",\n  ");
  return s.replace(/^\n/, "").replace(/;\s*/g, ";\n\n").trim();
}
const minify = {
  html: (s) => s.replace(/<!--(?!\[if)[\s\S]*?-->/g, "").replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim(),
  css: (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,>~+])\s*/g, "$1").replace(/;}/g, "}").trim(),
  sql: (s) => s.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim(),
};
minify.xml = minify.html;
tool({
  id: "code-format", cat: "dev", fresh: true, icon: I.code, name: "จัดรูปแบบโค้ด HTML / CSS / XML / SQL",
  desc: "จัดย่อหน้าโค้ดให้อ่านง่าย (Beautify) หรือบีบให้เล็กที่สุด (Minify) พร้อมบอกขนาดที่ลดลง",
  keywords: "beautify minify format prettify html css xml sql formatter จัดรูปแบบ โค้ด ย่อ",
  render(body) {
    const ui = h(`<div><div class="tabs" id="lg"><button class="chip active" data-l="html">HTML</button><button class="chip" data-l="css">CSS</button><button class="chip" data-l="xml">XML</button><button class="chip" data-l="sql">SQL</button></div>
      <div class="field"><label for="src">โค้ดต้นฉบับ</label><textarea class="input" id="src" style="min-height:150px" placeholder="วางโค้ด…"></textarea></div>
      <div class="actions"><button class="btn btn-gold" id="b">จัดให้สวย</button><button class="btn btn-ghost" id="m">บีบให้เล็ก</button></div>
      <textarea class="input" id="out" readonly style="min-height:180px"></textarea><div class="actions"><button class="btn btn-ghost btn-sm" id="cp">คัดลอก</button></div><div class="status" id="st"></div></div>`);
    body.append(ui);
    let lang = "html";
    $$("[data-l]", ui).forEach(b => b.onclick = () => { lang = b.dataset.l; $$("[data-l]", ui).forEach(x => x.classList.toggle("active", x === b)); });
    const go = (fn) => {
      const src = $("#src", ui).value;
      if (!src.trim()) { setStatus($("#st", ui), "วางโค้ดก่อน", true); return; }
      const out = fn(src); $("#out", ui).value = out;
      const a = new Blob([src]).size, b = new Blob([out]).size;
      setStatus($("#st", ui), `${fmtSize(a)} → ${fmtSize(b)}` + (b < a ? ` (เล็กลง ${Math.round((1 - b / a) * 100)}%)` : ""));
    };
    $("#b", ui).onclick = () => go(s => lang === "css" ? fmtCss(s) : lang === "sql" ? fmtSql(s) : fmtMarkup(s, lang === "xml"));
    $("#m", ui).onclick = () => go(minify[lang]);
    $("#cp", ui).onclick = () => copy($("#out", ui).value);
  },
});

// ---------- CSS generator: gradient, shadow, radius ----------
tool({
  id: "css-gen", cat: "dev", also: ["creator"], fresh: true, icon: I.palette, name: "สร้าง CSS Gradient / Shadow / มุมโค้ง",
  desc: "ปรับแถบเลื่อนแล้วเห็นผลจริงทันที ได้โค้ด CSS สำหรับไล่สี เงา และมุมโค้ง พร้อมคัดลอก",
  keywords: "css generator gradient box-shadow border-radius ไล่สี เงา มุมโค้ง โค้ด",
  render(body) {
    const sl = (id, label, min, max, val, unit = "") => `<div class="field"><label for="${id}">${label}: <span data-for="${id}">${val}${unit}</span></label><input type="range" id="${id}" min="${min}" max="${max}" value="${val}" data-unit="${unit}"></div>`;
    const ui = h(`<div><div class="tabs" id="mode"><button class="chip active" data-m="g">ไล่สี</button><button class="chip" data-m="s">เงา</button><button class="chip" data-m="r">มุมโค้ง</button></div>
      <div class="css-stage"><div class="css-demo" id="demo"></div></div>
      <div data-p="g"><div class="row"><div class="field"><label for="c1">สีที่ 1</label><input class="input" type="color" id="c1" value="#ecd29a"></div><div class="field"><label for="c2">สีที่ 2</label><input class="input" type="color" id="c2" value="#6b4f9e"></div><div class="field"><label for="gt">แบบ</label><select class="input" id="gt"><option value="linear">Linear</option><option value="radial">Radial</option><option value="conic">Conic</option></select></div></div><div class="row">${sl("ga", "มุม", 0, 360, 135, "°")}</div></div>
      <div data-p="s" hidden><div class="row">${sl("sx", "แกน X", -50, 50, 0, "px")}${sl("sy", "แกน Y", -50, 50, 12, "px")}</div><div class="row">${sl("sb", "เบลอ", 0, 100, 32, "px")}${sl("ss", "ขยาย", -30, 30, -4, "px")}</div><div class="row"><div class="field"><label for="sc">สีเงา</label><input class="input" type="color" id="sc" value="#000000"></div>${sl("so", "ความทึบ", 0, 100, 45, "%")}<label class="check"><input type="checkbox" id="si">ด้านใน (inset)</label></div></div>
      <div data-p="r" hidden><div class="row">${sl("r1", "บนซ้าย", 0, 120, 24, "px")}${sl("r2", "บนขวา", 0, 120, 24, "px")}</div><div class="row">${sl("r3", "ล่างขวา", 0, 120, 24, "px")}${sl("r4", "ล่างซ้าย", 0, 120, 24, "px")}</div><label class="check"><input type="checkbox" id="rl" checked>ปรับทุกมุมพร้อมกัน</label></div>
      ${codeOut("out", 3)}<div class="actions"><button class="btn btn-gold btn-sm" id="cp">คัดลอก CSS</button></div></div>`);
    body.append(ui);
    let mode = "g";
    const v = (id) => $("#" + id, ui).value;
    const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${a})`;
    const run = (e) => {
      if (e && /^r[1-4]$/.test(e.target.id) && $("#rl", ui).checked) ["r1", "r2", "r3", "r4"].forEach(id => $("#" + id, ui).value = e.target.value);
      $$("input[type=range]", ui).forEach(r => $(`[data-for="${r.id}"]`, ui).textContent = r.value + r.dataset.unit);
      const demo = $("#demo", ui); demo.removeAttribute("style");
      let css;
      if (mode === "g") { const t = v("gt"); css = `background: ${t}-gradient(${t === "linear" ? v("ga") + "deg, " : t === "conic" ? `from ${v("ga")}deg, ` : "circle, "}${v("c1")}, ${v("c2")});`; }
      else if (mode === "s") css = `box-shadow: ${$("#si", ui).checked ? "inset " : ""}${v("sx")}px ${v("sy")}px ${v("sb")}px ${v("ss")}px ${rgba(v("sc"), (v("so") / 100).toFixed(2))};`;
      else { const r = ["r1", "r2", "r3", "r4"].map(v); css = `border-radius: ${new Set(r).size === 1 ? r[0] + "px" : r.map(x => x + "px").join(" ")};`; }
      demo.setAttribute("style", css + (mode === "s" ? "background:var(--color-text);" : mode === "r" ? "background:var(--accent-grad);" : ""));
      $("#out", ui).value = css;
    };
    $$("[data-m]", ui).forEach(b => b.onclick = () => { mode = b.dataset.m; $$("[data-m]", ui).forEach(x => x.classList.toggle("active", x === b)); $$("[data-p]", ui).forEach(p => p.hidden = p.dataset.p !== mode); run(); });
    $$("input,select", ui).forEach(i => i.addEventListener("input", run));
    $("#cp", ui).onclick = () => copy($("#out", ui).value);
    run();
  },
});

// ---------- Markdown table generator ----------
tool({
  id: "md-table", cat: "dev", also: ["docs"], fresh: true, icon: I.table, name: "สร้างตาราง Markdown",
  desc: "วางข้อมูลจาก Excel / Google Sheets / CSV แล้วได้ตาราง Markdown ที่จัดคอลัมน์ตรงสวย กำหนดการจัดชิดได้",
  keywords: "markdown table generator excel csv tsv ตาราง github readme",
  render(body) {
    const ui = h(`<div><div class="field"><label for="src">ข้อมูล (คัดลอกจาก Excel หรือ CSV)</label><textarea class="input" id="src" style="min-height:120px">สินค้า	ราคา	คงเหลือ
กาแฟ	55	120
ชาเขียว	45	80</textarea></div>
      <div class="row"><div class="field"><label for="al">จัดชิด</label><select class="input" id="al"><option value="l">ซ้าย</option><option value="c">กลาง</option><option value="r">ขวา</option><option value="auto">อัตโนมัติ (ตัวเลขชิดขวา)</option></select></div><label class="check"><input type="checkbox" id="pad" checked>จัดคอลัมน์ให้ตรง</label></div>
      ${codeOut("out", 8)}<div class="actions"><button class="btn btn-gold btn-sm" id="cp">คัดลอก</button></div><div class="table-wrap" id="pv" style="margin-top:12px"></div></div>`);
    body.append(ui);
    const run = () => {
      const src = $("#src", ui).value.trim();
      if (!src) { $("#out", ui).value = ""; $("#pv", ui).innerHTML = ""; return; }
      const sep = src.includes("\t") ? "\t" : src.includes(";") && !src.includes(",") ? ";" : ",";
      const parseLine = (l) => sep === "\t" ? l.split("\t") : (l.match(new RegExp(`("([^"]|"")*"|[^${sep}]*)(${sep}|$)`, "g")) || []).slice(0, -1).map(c => c.replace(new RegExp(`${sep}$`), "").replace(/^"|"$/g, "").replace(/""/g, '"'));
      const rows = src.split(/\r?\n/).map(parseLine), cols = Math.max(...rows.map(r => r.length));
      rows.forEach(r => { while (r.length < cols) r.push(""); });
      const cell = (s) => s.trim().replace(/\|/g, "\\|");
      const al = $("#al", ui).value;
      const aligns = Array.from({ length: cols }, (_, c) => al !== "auto" ? al : rows.slice(1).every(r => !r[c].trim() || /^-?[\d,.]+%?$/.test(r[c].trim())) ? "r" : "l");
      const w = Array.from({ length: cols }, (_, c) => Math.max(3, ...rows.map(r => [...cell(r[c])].length)));
      const padOn = $("#pad", ui).checked;
      const fit = (s, c) => { if (!padOn) return s; const gap = w[c] - [...s].length; return aligns[c] === "r" ? " ".repeat(gap) + s : aligns[c] === "c" ? " ".repeat(gap >> 1) + s + " ".repeat(gap - (gap >> 1)) : s + " ".repeat(gap); };
      const line = (r) => "| " + r.map((s, c) => fit(cell(s), c)).join(" | ") + " |";
      const dash = (c) => { const n = padOn ? w[c] : 3; return aligns[c] === "c" ? ":" + "-".repeat(n - 2) + ":" : aligns[c] === "r" ? "-".repeat(n - 1) + ":" : "-".repeat(n); };
      $("#out", ui).value = [line(rows[0]), "| " + aligns.map((_, c) => dash(c)).join(" | ") + " |", ...rows.slice(1).map(line)].join("\n");
      const ta = { l: "left", c: "center", r: "right" };
      $("#pv", ui).innerHTML = `<table class="data-table"><thead><tr>${rows[0].map((s, c) => `<th style="text-align:${ta[aligns[c]]}">${esc(s)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map((s, c) => `<td style="text-align:${ta[aligns[c]]}">${esc(s)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    };
    $$("textarea,select,input", ui).forEach(e => e.oninput = run);
    $("#cp", ui).onclick = () => copy($("#out", ui).value);
    run();
  },
});
