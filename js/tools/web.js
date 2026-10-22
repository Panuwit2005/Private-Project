// Web & SEO tools — all local: meta/OGP builder with previews, robots.txt / sitemap / llms.txt,
// IPv4 CIDR calculator, Thai domain ⇄ punycode, and an HTTP status / MIME / port reference.

const codeOut = (id, rows = 10) => `<textarea class="input" id="${id}" readonly style="min-height:${rows * 1.5}em;margin-top:12px"></textarea>`;

tool({
  id: "meta-gen", cat: "web", also: ["creator"], fresh: true, icon: I.globe, name: "สร้าง Meta Tag & OGP (พร้อมตัวอย่าง)",
  desc: "กรอกชื่อ คำอธิบาย รูป แล้วได้โค้ด meta / Open Graph / Twitter Card พร้อมตัวอย่างหน้าตาบน Google, Facebook และ LINE",
  keywords: "meta tag og open graph twitter card seo title description preview google facebook line",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0;align-items:flex-start"><div class="field"><label for="mt">ชื่อหน้า (title)</label><input class="input" id="mt" value="Lumière — พื้นที่ส่วนตัวของคุณ" aria-describedby="mtN"><small class="field-msg" id="mtN"></small></div>
      <div class="field"><label for="mu">ลิงก์หน้าเว็บ</label><input class="input" id="mu" type="url" inputmode="url" value="https://example.com/"></div></div>
      <div class="field" style="margin-top:12px"><label for="md2">คำอธิบาย (description)</label><textarea class="input" id="md2" style="min-height:70px;font-family:var(--font-body)" aria-describedby="mdN">เครื่องมือช่วยงานกว่าร้อยอย่าง ทำงานในเบราว์เซอร์ ไม่อัปโหลดไฟล์</textarea><small class="field-msg" id="mdN"></small></div>
      <div class="row" style="align-items:flex-start"><div class="field"><label for="mi">ลิงก์รูปภาพแชร์ (1200×630)</label><input class="input" id="mi" type="url" inputmode="url" placeholder="https://…/og.jpg"></div><div class="field"><label for="ms">ชื่อเว็บไซต์</label><input class="input" id="ms" value="Lumière"></div><div class="field"><label for="mtype">ประเภท</label><select class="input" id="mtype"><option>website</option><option>article</option><option>product</option><option>profile</option></select></div></div>
      <h3 class="sub">ตัวอย่าง</h3><div class="previews" id="pv"></div>
      <h3 class="sub">โค้ดสำหรับใส่ใน &lt;head&gt;</h3>${codeOut("out", 12)}<div class="actions"><button class="btn btn-gold btn-sm" id="cp">คัดลอกโค้ด</button></div></div>`);
    body.append(ui);
    const v = (id) => $("#" + id, ui).value.trim(), a = (s) => esc(s);
    const run = () => {
      const t = v("mt"), d = v("md2"), u = v("mu"), img = v("mi"), site = v("ms"), type = $("#mtype", ui).value;
      const tl = [...t].length, dl = [...d].length;
      setStatus($("#mtN", ui), `${tl} ตัวอักษร — แนะนำ 30–60`, tl > 60); $("#mtN", ui).className = "field-msg" + (tl > 60 ? " warn" : "");
      $("#mdN", ui).textContent = `${dl} ตัวอักษร — แนะนำ 70–160`; $("#mdN", ui).className = "field-msg" + (dl > 160 ? " warn" : "");
      let host = ""; try { host = new URL(u).host; } catch {}
      $("#out", ui).value = [`<title>${a(t)}</title>`, `<meta name="description" content="${a(d)}">`, u && `<link rel="canonical" href="${a(u)}">`, "", `<meta property="og:type" content="${type}">`, `<meta property="og:title" content="${a(t)}">`, `<meta property="og:description" content="${a(d)}">`, u && `<meta property="og:url" content="${a(u)}">`, img && `<meta property="og:image" content="${a(img)}">`, site && `<meta property="og:site_name" content="${a(site)}">`, `<meta property="og:locale" content="th_TH">`, "", `<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">`, `<meta name="twitter:title" content="${a(t)}">`, `<meta name="twitter:description" content="${a(d)}">`, img && `<meta name="twitter:image" content="${a(img)}">`].filter(x => x !== undefined && x !== false && x !== "").join("\n").replace(/\n\n\n/g, "\n\n");
      const imgTag = img ? `<div class="pv-img" style="background-image:url('${a(img)}')" role="img" aria-label="รูปแชร์"></div>` : `<div class="pv-img pv-noimg">ไม่มีรูป</div>`;
      $("#pv", ui).innerHTML = `<figure class="pv pv-google"><figcaption>Google</figcaption><small>${a(host || "example.com")}</small><b>${a([...t].slice(0, 60).join("") + (tl > 60 ? "…" : ""))}</b><p>${a([...d].slice(0, 160).join("") + (dl > 160 ? "…" : ""))}</p></figure>
        <figure class="pv pv-social"><figcaption>Facebook / LINE</figcaption>${imgTag}<div class="pv-body"><small>${a(host.toUpperCase())}</small><b>${a(t)}</b><p>${a(d)}</p></div></figure>`;
    };
    $$("input, textarea, select", ui).forEach(i => i.addEventListener("input", run));
    $("#cp", ui).onclick = () => copy($("#out", ui).value);
    run();
  },
});

tool({
  id: "robots-gen", cat: "web", fresh: true, icon: I.pages, name: "robots.txt / sitemap.xml / llms.txt",
  desc: "สร้างไฟล์ robots.txt (บล็อกหรือเปิดให้บอท AI), sitemap.xml จากรายการลิงก์ และ llms.txt สำหรับให้ AI เข้าใจเว็บของคุณ",
  keywords: "robots.txt sitemap xml llms.txt seo crawler bot ai gptbot",
  render(body) {
    const ui = h(`<div><div class="tabs" id="tb"><button class="chip active" data-m="robots">robots.txt</button><button class="chip" data-m="sitemap">sitemap.xml</button><button class="chip" data-m="llms">llms.txt</button></div>
      <div data-p="robots"><div class="field"><label for="rs">ลิงก์ sitemap</label><input class="input" id="rs" value="https://example.com/sitemap.xml" inputmode="url"></div>
        <div class="field" style="margin-top:12px"><label for="rd">ไม่ให้บอทเข้า (หนึ่ง path ต่อบรรทัด)</label><textarea class="input" id="rd" style="min-height:70px">/admin/\n/private/</textarea></div>
        <fieldset class="for"><legend>บอท AI</legend><label class="check"><input type="checkbox" id="rai"> บล็อกบอท AI ที่เก็บข้อมูลไปฝึกโมเดล (GPTBot, ClaudeBot, Google-Extended, CCBot ฯลฯ)</label></fieldset></div>
      <div data-p="sitemap" hidden><div class="field"><label for="su">ลิงก์ในเว็บ (หนึ่งลิงก์ต่อบรรทัด)</label><textarea class="input" id="su">https://example.com/\nhttps://example.com/about\nhttps://example.com/blog</textarea></div>
        <div class="row"><div class="field"><label for="sf">ความถี่อัปเดต</label><select class="input" id="sf"><option>weekly</option><option>daily</option><option>monthly</option><option>yearly</option></select></div></div></div>
      <div data-p="llms" hidden><div class="row" style="margin-top:0"><div class="field"><label for="ln">ชื่อเว็บ</label><input class="input" id="ln" value="Lumière"></div></div>
        <div class="field" style="margin-top:12px"><label for="ls">สรุปเว็บ 1–2 ประโยค</label><input class="input" id="ls" value="พื้นที่ส่วนตัวที่รวมเครื่องมือช่วยงาน ทำงานในเบราว์เซอร์"></div>
        <div class="field" style="margin-top:12px"><label for="ll">หน้าสำคัญ (ชื่อ | ลิงก์ | คำอธิบาย หนึ่งรายการต่อบรรทัด)</label><textarea class="input" id="ll">เครื่องมือ | https://example.com/#/tools | รวมเครื่องมือทั้งหมด\nความเป็นส่วนตัว | https://example.com/privacy | นโยบายข้อมูล</textarea></div></div>
      ${codeOut("out", 10)}<div class="actions"><button class="btn btn-gold btn-sm" id="cp">คัดลอก</button><button class="btn btn-ghost btn-sm" id="dl">บันทึกไฟล์</button></div></div>`);
    body.append(ui);
    let mode = "robots";
    const AI = ["GPTBot", "ChatGPT-User", "ClaudeBot", "anthropic-ai", "Google-Extended", "CCBot", "PerplexityBot", "Bytespider", "Applebot-Extended", "meta-externalagent"];
    const run = () => {
      const o = $("#out", ui);
      if (mode === "robots") {
        const dis = $("#rd", ui).value.split("\n").map(s => s.trim()).filter(Boolean);
        o.value = ["User-agent: *", ...(dis.length ? dis.map(d => "Disallow: " + d) : ["Disallow:"]), ...($("#rai", ui).checked ? ["", ...AI.flatMap(b => [`User-agent: ${b}`, "Disallow: /", ""])] : [""]), $("#rs", ui).value.trim() && "Sitemap: " + $("#rs", ui).value.trim()].filter(x => x !== "" || true).join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
      } else if (mode === "sitemap") {
        const today = new Date().toISOString().slice(0, 10), f = $("#sf", ui).value;
        const urls = $("#su", ui).value.split("\n").map(s => s.trim()).filter(Boolean);
        o.value = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url>\n    <loc>${esc(u)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${f}</changefreq>\n  </url>`).join("\n")}\n</urlset>\n`;
      } else {
        const pages = $("#ll", ui).value.split("\n").map(l => l.split("|").map(s => s.trim())).filter(p => p[0] && p[1]);
        o.value = `# ${$("#ln", ui).value.trim()}\n\n> ${$("#ls", ui).value.trim()}\n\n## หน้าหลัก\n\n${pages.map(([n, u, d]) => `- [${n}](${u})${d ? ": " + d : ""}`).join("\n")}\n`;
      }
    };
    $("#tb", ui).onclick = e => { const b = e.target.closest("[data-m]"); if (!b) return; mode = b.dataset.m; $$("#tb .chip", ui).forEach(x => x.classList.toggle("active", x === b)); $$("[data-p]", ui).forEach(p => p.hidden = p.dataset.p !== mode); run(); };
    $$("input, textarea:not([readonly]), select", ui).forEach(i => i.addEventListener("input", run));
    $("#cp", ui).onclick = () => copy($("#out", ui).value);
    $("#dl", ui).onclick = () => download(new Blob([$("#out", ui).value], { type: "text/plain" }), { robots: "robots.txt", sitemap: "sitemap.xml", llms: "llms.txt" }[mode]);
    run();
  },
});

// ---------- IPv4 / CIDR ----------
const ip2n = (ip) => { const p = ip.trim().split("."); if (p.length !== 4 || p.some(x => !/^\d{1,3}$/.test(x) || +x > 255)) return null; return p.reduce((n, x) => n * 256 + +x, 0); };
const n2ip = (n) => [24, 16, 8, 0].map(s => Math.floor(n / 2 ** s) % 256).join(".");
tool({
  id: "cidr", cat: "web", also: ["dev"], fresh: true, icon: I.globe, name: "คำนวณ IP / CIDR / Subnet",
  desc: "ใส่ IP/CIDR เช่น 192.168.1.10/24 แล้วได้ Network, Broadcast, ช่วง IP ที่ใช้ได้ จำนวนเครื่อง และ Subnet mask",
  keywords: "cidr subnet ip address netmask network broadcast ipv4 คำนวณ ip",
  render(body) {
    const ui = h(`<div><div class="field"><label for="ci">IP/CIDR หรือ IP + Subnet mask</label><input class="input" id="ci" value="192.168.1.10/24" inputmode="decimal" autocomplete="off" aria-describedby="ciMsg"><small class="field-msg" id="ciMsg"></small></div>
      <div class="kv" id="kv"></div></div>`);
    body.append(ui);
    const run = () => {
      const raw = $("#ci", ui).value.trim(), msg = $("#ciMsg", ui); let [ip, pre] = raw.split(/[\/\s]+/);
      if (pre && pre.includes(".")) { const m = ip2n(pre); pre = m === null ? NaN : (m >>> 0).toString(2).replace(/0+$/, "").length; }
      const n = ip2n(ip || ""), p = pre === undefined ? 32 : +pre;
      if (n === null || !(p >= 0 && p <= 32)) { msg.className = "field-msg err"; msg.textContent = "รูปแบบไม่ถูกต้อง เช่น 10.0.0.5/16 หรือ 192.168.1.10 255.255.255.0"; $("#kv", ui).innerHTML = ""; return; }
      msg.className = "field-msg"; msg.textContent = "";
      const size = 2 ** (32 - p), net = Math.floor(n / size) * size, bc = net + size - 1, mask = 2 ** 32 - size;
      const first = p >= 31 ? net : net + 1, last = p >= 31 ? bc : bc - 1, hosts = p === 32 ? 1 : p === 31 ? 2 : size - 2;
      const priv = (net >= ip2n("10.0.0.0") && net <= ip2n("10.255.255.255")) || (net >= ip2n("172.16.0.0") && net <= ip2n("172.31.255.255")) || (net >= ip2n("192.168.0.0") && net <= ip2n("192.168.255.255"));
      $("#kv", ui).innerHTML = kvRows([["Network", `${n2ip(net)}/${p}`], ["Broadcast", n2ip(bc)], ["ใช้ได้ตั้งแต่", n2ip(first)], ["ถึง", n2ip(last)], ["จำนวนเครื่อง", hosts.toLocaleString()], ["Subnet mask", n2ip(mask)], ["Wildcard", n2ip(size - 1)], ["ชนิด", priv ? "Private (ใช้ภายในบ้าน/องค์กร)" : "Public"]]);
    };
    $("#ci", ui).oninput = run; run();
  },
});

tool({
  id: "punycode", cat: "web", also: ["text"], fresh: true, icon: I.link, name: "โดเมนภาษาไทย ⇄ Punycode",
  desc: "แปลงโดเมนภาษาไทย เช่น ไทย.ไทย เป็นรูปแบบ xn-- ที่ระบบใช้จริง และแปลงกลับ ใส่ได้ทั้งลิงก์เต็ม",
  keywords: "punycode idn xn-- โดเมนภาษาไทย domain thai",
  render(body) {
    const ui = h(`<div><div class="field"><label for="pd">โดเมนหรือลิงก์</label><input class="input" id="pd" value="ไทยรัฐ.ไทย" autocomplete="off"></div><div class="kv" id="kv"></div></div>`);
    body.append(ui);
    // Decoding xn-- labels: RFC 3492 bootstring
    const decodeLabel = (s) => {
      const base = 36, tmin = 1, tmax = 26, skew = 38, damp = 700; let out = [], i = 0, n = 128, bias = 72;
      const d = s.lastIndexOf("-"); if (d > 0) out = [...s.slice(0, d)];
      const adapt = (delta, num, first) => { delta = first ? Math.floor(delta / damp) : delta >> 1; delta += Math.floor(delta / num); let k = 0; while (delta > 455) { delta = Math.floor(delta / 35); k += base; } return k + Math.floor(36 * delta / (delta + skew)); };
      for (let idx = d > 0 ? d + 1 : 0; idx < s.length;) {
        const oldi = i;
        for (let w = 1, k = base; ; k += base) {
          const c = s.charCodeAt(idx++), dig = c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97 < 26 ? c - 97 : base;
          if (dig >= base) throw 0;
          i += dig * w; const t = k <= bias ? tmin : k >= bias + tmax ? tmax : k - bias;
          if (dig < t) break; w *= base - t;
        }
        bias = adapt(i - oldi, out.length + 1, oldi === 0); n += Math.floor(i / (out.length + 1)); i %= out.length + 1;
        out.splice(i++, 0, String.fromCodePoint(n));
      }
      return out.join("");
    };
    const run = () => {
      const raw = $("#pd", ui).value.trim(); if (!raw) return $("#kv", ui).innerHTML = "";
      const host = raw.replace(/^[a-z]+:\/\//i, "").split(/[/?#:]/)[0];
      try {
        const ascii = new URL("http://" + host).hostname;
        const uni = ascii.split(".").map(l => l.startsWith("xn--") ? decodeLabel(l.slice(4)) : l).join(".");
        $("#kv", ui).innerHTML = kvRows([["Punycode (ASCII)", esc(ascii)], ["Unicode (อ่านได้)", esc(uni)], ["ลิงก์เต็ม", esc(raw.replace(host, ascii))]]);
        $$("#kv code", ui).forEach(c => { c.style.cursor = "pointer"; c.title = "แตะเพื่อคัดลอก"; c.onclick = () => copy(c.textContent); });
      } catch { $("#kv", ui).innerHTML = `<span></span><code style="color:var(--color-danger)">โดเมนไม่ถูกต้อง</code><span></span>`; }
    };
    $("#pd", ui).oninput = run; run();
  },
});

const HTTP = [[100, "Continue", "ส่งต่อได้"], [101, "Switching Protocols", "เปลี่ยนโปรโตคอล (เช่น WebSocket)"], [200, "OK", "สำเร็จ"], [201, "Created", "สร้างข้อมูลใหม่สำเร็จ"], [202, "Accepted", "รับคำขอแล้ว กำลังประมวลผล"], [204, "No Content", "สำเร็จ ไม่มีเนื้อหาตอบกลับ"], [206, "Partial Content", "ส่งข้อมูลบางส่วน (ดาวน์โหลดต่อ/สตรีม)"], [301, "Moved Permanently", "ย้ายถาวร — ใช้ทำ redirect SEO"], [302, "Found", "ย้ายชั่วคราว"], [304, "Not Modified", "ใช้แคชเดิมได้"], [307, "Temporary Redirect", "ย้ายชั่วคราว คงเมธอดเดิม"], [308, "Permanent Redirect", "ย้ายถาวร คงเมธอดเดิม"], [400, "Bad Request", "คำขอผิดรูปแบบ"], [401, "Unauthorized", "ต้องล็อกอิน/ไม่มีสิทธิ์ยืนยันตัวตน"], [403, "Forbidden", "ไม่อนุญาตให้เข้าถึง"], [404, "Not Found", "ไม่พบหน้า"], [405, "Method Not Allowed", "ใช้เมธอดนี้ไม่ได้"], [408, "Request Timeout", "คำขอหมดเวลา"], [409, "Conflict", "ข้อมูลขัดแย้ง"], [410, "Gone", "ลบถาวรแล้ว"], [413, "Content Too Large", "ไฟล์/ข้อมูลใหญ่เกินไป"], [415, "Unsupported Media Type", "ชนิดไฟล์ไม่รองรับ"], [418, "I'm a teapot", "มุกของ HTTP"], [422, "Unprocessable Content", "ข้อมูลไม่ผ่านการตรวจสอบ"], [429, "Too Many Requests", "เรียกถี่เกินไป โดนจำกัด"], [500, "Internal Server Error", "เซิร์ฟเวอร์ผิดพลาด"], [501, "Not Implemented", "ยังไม่รองรับ"], [502, "Bad Gateway", "เกตเวย์/พร็อกซีได้คำตอบผิด"], [503, "Service Unavailable", "บริการไม่พร้อม/ปิดปรับปรุง"], [504, "Gateway Timeout", "เกตเวย์รอนานเกิน"]];
const MIME = [["html", "text/html"], ["css", "text/css"], ["js", "text/javascript"], ["json", "application/json"], ["xml", "application/xml"], ["txt", "text/plain"], ["csv", "text/csv"], ["pdf", "application/pdf"], ["zip", "application/zip"], ["png", "image/png"], ["jpg", "image/jpeg"], ["webp", "image/webp"], ["gif", "image/gif"], ["svg", "image/svg+xml"], ["ico", "image/x-icon"], ["avif", "image/avif"], ["mp3", "audio/mpeg"], ["wav", "audio/wav"], ["m4a", "audio/mp4"], ["mp4", "video/mp4"], ["webm", "video/webm"], ["woff2", "font/woff2"], ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]];
const PORTS = [[20, "FTP data"], [21, "FTP"], [22, "SSH / SFTP"], [23, "Telnet"], [25, "SMTP"], [53, "DNS"], [67, "DHCP"], [80, "HTTP"], [110, "POP3"], [123, "NTP"], [143, "IMAP"], [443, "HTTPS"], [465, "SMTPS"], [587, "SMTP (ส่งเมล)"], [993, "IMAPS"], [995, "POP3S"], [1433, "SQL Server"], [1883, "MQTT"], [3000, "Dev server (Node)"], [3306, "MySQL"], [3389, "Remote Desktop"], [5432, "PostgreSQL"], [5900, "VNC"], [6379, "Redis"], [8080, "HTTP สำรอง"], [8443, "HTTPS สำรอง"], [27017, "MongoDB"]];
tool({
  id: "http-ref", cat: "web", also: ["dev"], fresh: true, icon: I.code, name: "รหัส HTTP / MIME / พอร์ต",
  desc: "ค้นหาความหมายรหัสสถานะ HTTP (404, 503…) ชนิดไฟล์ MIME และพอร์ตยอดนิยม อธิบายเป็นภาษาไทย ใช้ออฟไลน์ได้",
  keywords: "http status code 404 500 mime type content-type port reference",
  render(body) {
    const ui = h(`<div><div class="tabs" id="tb"><button class="chip active" data-m="http">รหัส HTTP</button><button class="chip" data-m="mime">MIME</button><button class="chip" data-m="port">พอร์ต</button></div>
      <div class="field"><label for="f">ค้นหา</label><input class="input" id="f" placeholder="เช่น 404, json, 443" autocomplete="off"></div>
      <div class="table-wrap"><table class="data-table"><thead id="th"></thead><tbody id="tbd"></tbody></table></div></div>`);
    body.append(ui);
    let mode = "http";
    const run = () => {
      const t = $("#f", ui).value.trim().toLowerCase();
      const [head, rows] = mode === "http" ? [["รหัส", "ชื่อ", "ความหมาย"], HTTP] : mode === "mime" ? [["นามสกุล", "MIME type"], MIME] : [["พอร์ต", "บริการ"], PORTS];
      $("#th", ui).innerHTML = `<tr>${head.map(x => `<th>${x}</th>`).join("")}</tr>`;
      const list = rows.filter(r => !t || r.join(" ").toLowerCase().includes(t));
      $("#tbd", ui).innerHTML = list.map(r => `<tr>${r.map((c, i) => `<td style="text-align:left;white-space:normal">${i === 0 && mode === "http" ? `<b class="${c < 300 ? "pos" : c >= 400 ? "neg" : ""}">${c}</b>` : esc(c)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="3" style="text-align:left">ไม่พบ</td></tr>`;
    };
    $("#tb", ui).onclick = e => { const b = e.target.closest("[data-m]"); if (!b) return; mode = b.dataset.m; $$("#tb .chip", ui).forEach(x => x.classList.toggle("active", x === b)); run(); };
    $("#f", ui).oninput = run; run();
  },
});
