// Developer tools: JSON, Base64, URL encode, hash, UUID, timestamp, regex tester, JWT decoder, color converter.

tool({
  id: "json", cat: "นักพัฒนา", icon: I.code, name: "JSON Formatter",
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
  id: "base64", cat: "นักพัฒนา", icon: I.binary, name: "Base64 เข้ารหัส / ถอดรหัส",
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
  id: "url-enc", cat: "นักพัฒนา", icon: I.link, name: "URL Encode / Decode",
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
  id: "hash", cat: "นักพัฒนา", icon: I.hash, name: "สร้าง Hash (SHA)",
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
  id: "uuid", cat: "นักพัฒนา", icon: I.id, name: "สร้าง UUID",
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
  id: "timestamp", cat: "นักพัฒนา", icon: I.clock, name: "Unix Timestamp",
  desc: "แปลง Unix timestamp ⇄ วันเวลา (ไทย/UTC/ISO) พร้อมเวลาปัจจุบันแบบสด",
  keywords: "unix timestamp epoch date time แปลงเวลา",
  render(body) {
    const ui = h(`<div><div class="result center"><small style="color:var(--muted)">ตอนนี้ (วินาที)</small><div class="big sm" id="now"></div></div>
      <div class="row"><div class="field"><label>Timestamp (วินาทีหรือมิลลิวินาที)</label><input class="input" id="ts"></div><div class="field"><label>หรือเลือกวันเวลา</label><input class="input" type="datetime-local" id="dt" step="1"></div></div>
      <div class="kv" id="kv"></div></div>`);
    body.append(ui);
    const show = d => {
      if (isNaN(d)) { $("#kv", ui).innerHTML = `<span style="color:var(--danger)">ค่าไม่ถูกต้อง</span>`; return; }
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
  id: "regex", cat: "นักพัฒนา", icon: I.regex, name: "Regex Tester",
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
  id: "jwt", cat: "นักพัฒนา", icon: I.key, name: "JWT Decoder",
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
  id: "color", cat: "นักพัฒนา", icon: I.palette, name: "แปลงสี & พาเลต",
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
