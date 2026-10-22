// Image tools: convert/compress, resize, crop/rotate, watermark, pick colors from a photo.

tool({
  id: "img-convert", cat: "image", icon: I.image, name: "แปลง & บีบอัดรูปภาพ",
  desc: "แปลง JPG, PNG, WEBP ไปมา ปรับคุณภาพเพื่อลดขนาดไฟล์ และลบข้อมูล EXIF/GPS ออกอัตโนมัติ",
  keywords: "convert jpg png webp heic image compress บีบอัด exif gps",
  render(body) {
    let files = [];
    const fmt = h(`<div class="row">
      <div class="field"><label>แปลงเป็น</label><select class="input" id="fmt"><option value="image/webp">WEBP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></div>
      <div class="field"><label>คุณภาพ: <span id="qv">85</span>%</label><input type="range" id="qq" min="10" max="100" value="85" /></div>
    </div>`);
    const list = h(`<div class="out"></div>`);
    const act = h(`<div class="actions"><button class="btn btn-gold" id="go" disabled>แปลงไฟล์</button><button class="btn btn-ghost" id="all" hidden>ดาวน์โหลดทั้งหมด</button></div>`);
    body.append(dropZone({ accept: "image/*", multiple: true, title: "ลากรูปมาวาง หรือแตะเพื่อเลือก", hint: "JPG · PNG · WEBP · GIF · BMP · SVG · AVIF" }, f => {
      files = f; $("#go", act).disabled = false; $("#all", act).hidden = true;
      list.innerHTML = files.map(x => `<div class="file-item"><div class="meta"><b>${esc(x.name)}</b><small>${fmtSize(x.size)}</small></div></div>`).join("");
    }), fmt, act, list);
    $("#qq", fmt).oninput = e => $("#qv", fmt).textContent = e.target.value;
    let results = [];
    $("#go", act).onclick = async () => {
      const type = $("#fmt", fmt).value, q = $("#qq", fmt).value / 100;
      const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" }[type];
      list.innerHTML = ""; results = [];
      for (const f of files) {
        try {
          const img = await loadImage(f);
          const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext("2d");
          if (type === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0);
          const blob = await canvasBlob(c, type, q);
          const name = baseName(f.name) + "." + ext;
          const diff = Math.round((1 - blob.size / f.size) * 100);
          results.push([blob, name]);
          const row = h(`<div class="file-item"><img src="${img.src}" alt=""><div class="meta"><b>${esc(name)}</b><small>${fmtSize(f.size)} → ${fmtSize(blob.size)} <span class="saving">${diff > 0 ? "(-" + diff + "%)" : ""}</span></small></div><button class="btn btn-ghost btn-sm">บันทึก</button></div>`);
          $("button", row).onclick = () => download(blob, name);
          list.append(row);
        } catch (e) { list.append(h(`<div class="status err">${esc(e.message)}</div>`)); }
      }
      $("#all", act).hidden = results.length < 2;
    };
    $("#all", act).onclick = async () => { for (const [b, n] of results) { download(b, n); await new Promise(r => setTimeout(r, 350)); } };
  },
});

tool({
  id: "img-resize", cat: "image", icon: I.resize, name: "ปรับขนาดรูปภาพ",
  desc: "ย่อหรือขยายรูปตามพิกเซลหรือเปอร์เซ็นต์ คงสัดส่วนเดิมอัตโนมัติ",
  keywords: "resize scale ย่อ ขยาย pixel",
  render(body) {
    let img, file;
    const ctrls = h(`<div><div class="row">
      <div class="field"><label>กว้าง (px)</label><input class="input" type="number" id="w" min="1" /></div>
      <div class="field"><label>สูง (px)</label><input class="input" type="number" id="hh" min="1" /></div>
      <div class="field" style="flex:0 0 auto"><label class="check"><input type="checkbox" id="lock" checked /> ล็อกสัดส่วน</label></div>
    </div>
    <div class="actions"><button class="btn btn-ghost btn-sm" data-p="25">25%</button><button class="btn btn-ghost btn-sm" data-p="50">50%</button><button class="btn btn-ghost btn-sm" data-p="75">75%</button><button class="btn btn-ghost btn-sm" data-p="200">200%</button><button class="btn btn-ghost btn-sm" data-px="1080">กว้าง 1080</button><button class="btn btn-ghost btn-sm" data-px="1920">กว้าง 1920</button></div>
    <div class="actions"><button class="btn btn-gold" id="go" disabled>ปรับขนาดและบันทึก</button></div><div class="status" id="st"></div></div>`);
    const w = $("#w", ctrls), hh = $("#hh", ctrls), lock = $("#lock", ctrls);
    body.append(dropZone({ accept: "image/*", title: "เลือกรูปภาพ", hint: "รองรับไฟล์รูปทุกชนิดที่เบราว์เซอร์เปิดได้" }, async ([f]) => {
      try {
        img = await loadImage(f); file = f;
        w.value = img.naturalWidth; hh.value = img.naturalHeight;
        setStatus($("#st", ctrls), `ขนาดเดิม ${img.naturalWidth} × ${img.naturalHeight} px — ${f.name}`);
        $("#go", ctrls).disabled = false;
      } catch (e) { setStatus($("#st", ctrls), e.message, true); }
    }), ctrls);
    const ratio = () => img.naturalWidth / img.naturalHeight;
    w.oninput = () => { if (img && lock.checked) hh.value = Math.round(w.value / ratio()); };
    hh.oninput = () => { if (img && lock.checked) w.value = Math.round(hh.value * ratio()); };
    $$("[data-p]", ctrls).forEach(b => b.onclick = () => {
      if (!img) return; const p = b.dataset.p / 100;
      w.value = Math.round(img.naturalWidth * p); hh.value = Math.round(img.naturalHeight * p);
    });
    $$("[data-px]", ctrls).forEach(b => b.onclick = () => { if (!img) return; w.value = b.dataset.px; hh.value = Math.round(b.dataset.px / ratio()); });
    $("#go", ctrls).onclick = async () => {
      const c = document.createElement("canvas"); c.width = +w.value; c.height = +hh.value;
      const ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const jpg = file.type === "image/jpeg";
      download(await canvasBlob(c, jpg ? "image/jpeg" : "image/png"), `${baseName(file.name)}_${c.width}x${c.height}.${jpg ? "jpg" : "png"}`);
    };
  },
});

tool({
  id: "img-crop", cat: "image", also: ["creator"], icon: I.crop, name: "ครอป หมุน & กลับด้าน",
  desc: "ตัดรูปตามสัดส่วนยอดนิยม (1:1, 4:5, 16:9, 9:16) หมุน 90° และกลับด้านซ้าย-ขวา",
  keywords: "crop rotate flip ครอป ตัด หมุน square instagram story",
  render(body) {
    let img, file, rot = 0, flip = false;
    const ui = h(`<div>
      <div class="tabs" id="ratios"><button class="chip active" data-r="0">อิสระ (ทั้งภาพ)</button><button class="chip" data-r="1">1:1</button><button class="chip" data-r="0.8">4:5</button><button class="chip" data-r="1.7778">16:9</button><button class="chip" data-r="0.5625">9:16</button><button class="chip" data-r="1.3333">4:3</button></div>
      <div class="row"><div class="field"><label>ตำแหน่งแนวนอน</label><input type="range" id="px" min="0" max="100" value="50"></div><div class="field"><label>ตำแหน่งแนวตั้ง</label><input type="range" id="py" min="0" max="100" value="50"></div><div class="field"><label>ซูม</label><input type="range" id="zm" min="100" max="300" value="100"></div></div>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="rl">⟲ หมุนซ้าย</button><button class="btn btn-ghost btn-sm" id="rr">⟳ หมุนขวา</button><button class="btn btn-ghost btn-sm" id="fl">⇋ กลับด้าน</button></div>
      <div class="canvas-wrap"><canvas id="cv"></canvas></div>
      <div class="actions"><button class="btn btn-gold" id="go" disabled>บันทึกรูป</button></div></div>`);
    body.append(dropZone({ accept: "image/*", title: "เลือกรูปภาพ", hint: "ปรับแล้วดูตัวอย่างได้ทันที" }, async ([f]) => {
      img = await loadImage(f); file = f; rot = 0; flip = false; $("#go", ui).disabled = false; draw();
    }), ui);
    let ratio = 0;
    $("#ratios", ui).onclick = e => { const b = e.target.closest("[data-r]"); if (!b) return; ratio = +b.dataset.r; $$(".chip", ui).forEach(x => x.classList.toggle("active", x === b)); draw(); };
    ["px", "py", "zm"].forEach(id => $("#" + id, ui).oninput = draw);
    $("#rl", ui).onclick = () => { rot = (rot + 270) % 360; draw(); };
    $("#rr", ui).onclick = () => { rot = (rot + 90) % 360; draw(); };
    $("#fl", ui).onclick = () => { flip = !flip; draw(); };
    // Render rotated/flipped source first, then crop from it.
    function render() {
      const sw = rot % 180 ? img.naturalHeight : img.naturalWidth, sh = rot % 180 ? img.naturalWidth : img.naturalHeight;
      const src = document.createElement("canvas"); src.width = sw; src.height = sh;
      const s = src.getContext("2d"); s.translate(sw / 2, sh / 2); s.rotate(rot * Math.PI / 180); if (flip) s.scale(-1, 1);
      s.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      const z = $("#zm", ui).value / 100;
      let cw = sw / z, ch = sh / z;
      if (ratio) { if (cw / ch > ratio) cw = ch * ratio; else ch = cw / ratio; }
      const x = (sw - cw) * $("#px", ui).value / 100, y = (sh - ch) * $("#py", ui).value / 100;
      const out = document.createElement("canvas"); out.width = Math.round(cw); out.height = Math.round(ch);
      out.getContext("2d").drawImage(src, x, y, cw, ch, 0, 0, out.width, out.height);
      return out;
    }
    function draw() {
      if (!img) return;
      const out = render(), cv = $("#cv", ui);
      cv.width = out.width; cv.height = out.height; cv.getContext("2d").drawImage(out, 0, 0);
    }
    $("#go", ui).onclick = async () => {
      const jpg = file.type === "image/jpeg";
      download(await canvasBlob(render(), jpg ? "image/jpeg" : "image/png"), baseName(file.name) + "_edit." + (jpg ? "jpg" : "png"));
    };
  },
});

tool({
  id: "img-watermark", cat: "image", also: ["creator"], icon: I.stamp, name: "ใส่ลายน้ำ",
  desc: "ใส่ข้อความลายน้ำบนรูป เลือกตำแหน่ง ขนาด ความโปร่งใส หรือแบบเรียงเต็มภาพ",
  keywords: "watermark ลายน้ำ text copyright",
  render(body) {
    let img, file;
    const ui = h(`<div><div class="row">
      <div class="field"><label>ข้อความ</label><input class="input" id="t" value="© ของฉัน" /></div>
      <div class="field"><label>ตำแหน่ง</label><select class="input" id="pos"><option value="br">ขวาล่าง</option><option value="bl">ซ้ายล่าง</option><option value="c">กึ่งกลาง</option><option value="tile">เรียงเต็มภาพ</option></select></div></div>
      <div class="row"><div class="field"><label>ขนาด</label><input type="range" id="sz" min="2" max="15" value="5"></div><div class="field"><label>ความทึบ</label><input type="range" id="op" min="10" max="100" value="60"></div><div class="field" style="flex:0 0 90px"><label>สี</label><input type="color" id="col" value="#ffffff"></div></div>
      <div class="canvas-wrap"><canvas id="cv"></canvas></div>
      <div class="actions"><button class="btn btn-gold" id="go" disabled>บันทึกรูป</button></div></div>`);
    body.append(dropZone({ accept: "image/*", title: "เลือกรูปภาพ", hint: "ดูตัวอย่างลายน้ำได้ทันที" }, async ([f]) => { img = await loadImage(f); file = f; $("#go", ui).disabled = false; draw(); }), ui);
    $$("input, select", ui).forEach(el => el.oninput = draw);
    function draw() {
      if (!img) return;
      const cv = $("#cv", ui), ctx = cv.getContext("2d");
      cv.width = img.naturalWidth; cv.height = img.naturalHeight; ctx.drawImage(img, 0, 0);
      const fs = Math.max(12, cv.width * $("#sz", ui).value / 100), text = $("#t", ui).value, pos = $("#pos", ui).value;
      ctx.font = `600 ${fs}px "IBM Plex Sans Thai", sans-serif`; ctx.fillStyle = $("#col", ui).value;
      ctx.globalAlpha = $("#op", ui).value / 100; ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = fs / 6;
      const m = fs * .8, tw = ctx.measureText(text).width;
      if (pos === "tile") {
        ctx.save(); ctx.translate(cv.width / 2, cv.height / 2); ctx.rotate(-Math.PI / 6);
        const d = Math.hypot(cv.width, cv.height);
        for (let y = -d / 2; y < d / 2; y += fs * 3) for (let x = -d / 2; x < d / 2; x += tw + fs * 2) ctx.fillText(text, x, y);
        ctx.restore();
      } else {
        ctx.textBaseline = pos === "c" ? "middle" : "bottom";
        const x = pos === "br" ? cv.width - tw - m : pos === "bl" ? m : (cv.width - tw) / 2;
        ctx.fillText(text, x, pos === "c" ? cv.height / 2 : cv.height - m);
      }
      ctx.globalAlpha = 1;
    }
    $("#go", ui).onclick = async () => {
      const jpg = file.type === "image/jpeg";
      download(await canvasBlob($("#cv", ui), jpg ? "image/jpeg" : "image/png"), baseName(file.name) + "_wm." + (jpg ? "jpg" : "png"));
    };
  },
});

tool({
  id: "img-colors", cat: "image", icon: I.drop, name: "ดูดสีจากรูป",
  desc: "แตะบนรูปเพื่อดูดสี และสกัดพาเลตสีหลักของภาพอัตโนมัติ คัดลอก HEX ได้ทันที",
  keywords: "eyedropper color picker palette ดูดสี พาเลต",
  render(body) {
    const ui = h(`<div><div class="canvas-wrap"><canvas id="cv" style="cursor:crosshair"></canvas></div>
      <div class="result" id="pick" hidden></div><div class="swatches" id="sw"></div></div>`);
    body.append(dropZone({ accept: "image/*", title: "เลือกรูปภาพ", hint: "แตะบนรูปเพื่อดูดสี" }, async ([f]) => {
      const img = await loadImage(f), cv = $("#cv", ui), ctx = cv.getContext("2d", { willReadFrequently: true });
      const s = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
      cv.width = img.naturalWidth * s; cv.height = img.naturalHeight * s; ctx.drawImage(img, 0, 0, cv.width, cv.height);
      // Palette: quantize to 4 bits per channel and take the most common buckets.
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data, buckets = {};
      for (let i = 0; i < d.length; i += 16) { if (d[i + 3] < 128) continue; const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4; buckets[k] = (buckets[k] || 0) + 1; }
      const top = Object.entries(buckets).sort((a, b) => b[1] - a[1]).map(([k]) => +k);
      const picked = [];
      for (const k of top) {
        const c = [(k >> 8 & 15) * 17, (k >> 4 & 15) * 17, (k & 15) * 17];
        if (picked.every(p => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 60)) picked.push(c);
        if (picked.length === 5) break;
      }
      const hex = c => "#" + c.map(v => pad(v.toString(16))).join("").toUpperCase();
      $("#sw", ui).innerHTML = picked.map(c => `<button class="swatch" style="background:${hex(c)}" data-c="${hex(c)}"><span>${hex(c)}</span></button>`).join("");
      $$(".swatch", ui).forEach(b => b.onclick = () => copy(b.dataset.c));
      cv.onclick = e => {
        const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
        const p = ctx.getImageData(x, y, 1, 1).data, hx = hex([p[0], p[1], p[2]]);
        const el = $("#pick", ui); el.hidden = false;
        el.innerHTML = `<div style="display:flex;gap:14px;align-items:center"><span style="width:48px;height:48px;border-radius:12px;background:${hx};border:1px solid var(--color-border)"></span><div><b>${hx}</b><br><small>rgb(${p[0]}, ${p[1]}, ${p[2]})</small></div><button class="btn btn-ghost btn-sm" style="margin-left:auto">คัดลอก</button></div>`;
        $("button", el).onclick = () => copy(hx);
      };
    }), ui);
  },
});

tool({
  id: "collage", cat: "image", also: ["creator"], icon: I.grid, name: "รวมรูป (คอลลาจ)",
  desc: "รวมหลายรูปเป็นภาพเดียวแบบตาราง เลือกจำนวนคอลัมน์ ระยะห่าง สีพื้น และสัดส่วนช่อง",
  keywords: "collage grid รวมรูป ต่อรูป คอลลาจ",
  render(body) {
    let imgs = [];
    const ui = h(`<div><div class="row"><div class="field"><label>คอลัมน์</label><input class="input" type="number" id="cols" value="2" min="1" max="6"></div><div class="field"><label>สัดส่วนช่อง</label><select class="input" id="ar"><option value="1">1:1</option><option value="0.8">4:5</option><option value="1.7778">16:9</option><option value="0.5625">9:16</option></select></div>
      <div class="field"><label>ระยะห่าง (px)</label><input class="input" type="number" id="gap" value="16" min="0" max="80"></div><div class="field" style="flex:0 0 80px"><label>สีพื้น</label><input type="color" id="bg" value="#ffffff"></div><div class="field"><label>ความกว้างภาพ</label><select class="input" id="W"><option>1080</option><option selected>2048</option><option>4096</option></select></div></div>
      <div class="canvas-wrap"><canvas id="cv"></canvas></div>
      <div class="actions"><button class="btn btn-gold" data-f="jpeg">บันทึก JPG</button><button class="btn btn-ghost" data-f="png">บันทึก PNG</button></div></div>`);
    body.append(dropZone({ accept: "image/*", multiple: true, title: "เลือกรูปหลายรูป", hint: "เรียงตามลำดับที่เลือก" }, async f => { imgs = await Promise.all(f.map(loadImage)); draw(); }), ui);
    const cv = $("#cv", ui), ctx = cv.getContext("2d");
    const draw = () => {
      if (!imgs.length) return;
      const cols = Math.max(1, Math.min(6, +$("#cols", ui).value || 1)), rows = Math.ceil(imgs.length / cols), gap = +$("#gap", ui).value, W = +$("#W", ui).value, ar = +$("#ar", ui).value;
      const cw = (W - gap * (cols + 1)) / cols, ch = cw / ar;
      cv.width = W; cv.height = Math.round(rows * ch + gap * (rows + 1));
      ctx.fillStyle = $("#bg", ui).value; ctx.fillRect(0, 0, cv.width, cv.height);
      imgs.forEach((im, i) => {
        const x = gap + (i % cols) * (cw + gap), y = gap + Math.floor(i / cols) * (ch + gap);
        const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight), sw = cw / s, sh = ch / s;
        ctx.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, cw, ch);
      });
    };
    $$("input, select", ui).forEach(i => i.oninput = draw);
    $$("[data-f]", ui).forEach(b => b.onclick = async () => { if (!imgs.length) return toast("เลือกรูปก่อน"); download(await canvasBlob(cv, "image/" + b.dataset.f, .92), "collage." + (b.dataset.f === "jpeg" ? "jpg" : "png")); });
  },
});

tool({
  id: "app-icon", cat: "image", also: ["dev"], icon: I.grid, name: "สร้างไอคอนแอป & Favicon",
  desc: "จากรูปเดียว สร้างไอคอนครบทุกขนาด (16–1024px) สำหรับเว็บไซต์ แอป iOS/Android พร้อมมุมโค้งและพื้นหลัง",
  keywords: "favicon icon app icon ไอคอน apple touch icon pwa",
  render(body) {
    let img;
    const SIZES = [16, 32, 48, 180, 192, 512, 1024];
    const ui = h(`<div><div class="row"><div class="field"><label>มุมโค้ง (%)</label><input type="range" id="rd" min="0" max="50" value="22"></div><div class="field"><label>ระยะขอบ (%)</label><input type="range" id="pd" min="0" max="30" value="10"></div><div class="field" style="flex:0 0 80px"><label>พื้นหลัง</label><input type="color" id="bg" value="#0c0a09"></div><div class="field" style="flex:0 0 auto"><label class="check"><input type="checkbox" id="tr"> พื้นใส</label></div></div>
      <div class="canvas-wrap" style="padding:20px"><canvas id="pv" width="256" height="256" style="width:160px;height:160px"></canvas></div>
      <div class="actions"><button class="btn btn-gold" id="all">บันทึกทุกขนาด</button></div><div class="out" id="out"></div></div>`);
    body.append(dropZone({ accept: "image/*", title: "เลือกรูปต้นแบบ (สี่เหลี่ยมจัตุรัสดีที่สุด)", hint: "แนะนำ 1024×1024 ขึ้นไป" }, async ([f]) => { img = await loadImage(f); draw(); }), ui);
    const render = (size) => {
      const c = document.createElement("canvas"); c.width = c.height = size; const x = c.getContext("2d");
      const r = size * $("#rd", ui).value / 100, p = size * $("#pd", ui).value / 100;
      if (!$("#tr", ui).checked) { x.fillStyle = $("#bg", ui).value; x.beginPath(); x.roundRect ? x.roundRect(0, 0, size, size, r) : x.rect(0, 0, size, size); x.fill(); }
      if (img) { const s = Math.min((size - 2 * p) / img.naturalWidth, (size - 2 * p) / img.naturalHeight), w = img.naturalWidth * s, hh = img.naturalHeight * s; x.imageSmoothingQuality = "high"; x.drawImage(img, (size - w) / 2, (size - hh) / 2, w, hh); }
      return c;
    };
    const draw = () => { const c = render(256), pv = $("#pv", ui); pv.getContext("2d").clearRect(0, 0, 256, 256); pv.getContext("2d").drawImage(c, 0, 0); };
    $$("input", ui).forEach(i => i.oninput = draw);
    $("#all", ui).onclick = async () => {
      if (!img) return toast("เลือกรูปก่อน");
      $("#out", ui).innerHTML = `<div class="note">วางในโค้ด HTML: <code>&lt;link rel="icon" href="icon-32.png" sizes="32x32"&gt;</code> · <code>&lt;link rel="apple-touch-icon" href="icon-180.png"&gt;</code></div>`;
      for (const s of SIZES) { download(await canvasBlob(render(s)), `icon-${s}.png`); await new Promise(r => setTimeout(r, 300)); }
    };
    draw();
  },
});

tool({
  id: "img-redact", cat: "image", also: ["security"], icon: I.stamp, name: "ปิดบังข้อมูลในรูป",
  desc: "ลากคลุมส่วนที่ไม่อยากให้เห็น เช่น เลขบัญชี ชื่อ หน้า หรือป้ายทะเบียน แล้วเบลอ ทำโมเสก หรือปิดแถบดำ",
  keywords: "blur pixelate redact censor เบลอ โมเสก ปิดข้อมูล ปิดหน้า สลิป แคปจอ",
  render(body) {
    let img, file, regions = [], drag;
    const ui = h(`<div hidden><div class="tabs" id="mode"><button class="chip active" data-m="pixel">โมเสก</button><button class="chip" data-m="blur">เบลอ</button><button class="chip" data-m="black">แถบดำ</button></div>
      <p class="hint">ลากนิ้วหรือเมาส์บนรูปเพื่อเลือกพื้นที่ (เลือกได้หลายจุด) · ข้อมูลสำคัญอย่างเลขบัญชีหรือเลขบัตร ใช้ “แถบดำ” ปลอดภัยที่สุด เพราะโมเสก/เบลอบางครั้งถอดกลับได้</p>
      <div class="canvas-wrap"><canvas id="cv" style="touch-action:none;cursor:crosshair"></canvas></div>
      <div class="actions"><button class="btn btn-gold" id="save">บันทึกรูป</button><button class="btn btn-ghost" id="undo">ย้อนกลับ</button><button class="btn btn-ghost" id="clr">ล้างทั้งหมด</button></div></div>`);
    body.append(dropZone({ accept: "image/*", title: "เลือกรูปหรือภาพแคปหน้าจอ", hint: "รูปไม่ถูกอัปโหลด" }, async ([f]) => { img = await loadImage(f); file = f; regions = []; ui.hidden = false; draw(); }), ui);
    let mode = "pixel";
    $("#mode", ui).onclick = e => { const b = e.target.closest("[data-m]"); if (!b) return; mode = b.dataset.m; $$("#mode .chip", ui).forEach(x => x.classList.toggle("active", x === b)); };
    const cv = $("#cv", ui), ctx = cv.getContext("2d");
    const apply = (r) => {
      const [x, y, w, hh] = [Math.min(r.x0, r.x1), Math.min(r.y0, r.y1), Math.abs(r.x1 - r.x0), Math.abs(r.y1 - r.y0)];
      if (w < 2 || hh < 2) return;
      if (r.m === "black") { ctx.fillStyle = "#000"; ctx.fillRect(x, y, w, hh); return; }
      const cell = Math.max(6, Math.round(Math.max(cv.width, cv.height) / 80));
      const t = document.createElement("canvas"); const sw = Math.max(1, Math.round(w / (r.m === "pixel" ? cell : cell / 2))), sh = Math.max(1, Math.round(hh / (r.m === "pixel" ? cell : cell / 2)));
      t.width = sw; t.height = sh; const tx = t.getContext("2d"); tx.imageSmoothingEnabled = true; tx.drawImage(cv, x, y, w, hh, 0, 0, sw, sh);
      ctx.save(); ctx.imageSmoothingEnabled = r.m === "blur"; ctx.drawImage(t, 0, 0, sw, sh, x, y, w, hh);
      if (r.m === "blur") { for (let k = 0; k < 2; k++) { tx.drawImage(cv, x, y, w, hh, 0, 0, sw, sh); ctx.drawImage(t, 0, 0, sw, sh, x, y, w, hh); } }
      ctx.restore();
    };
    function draw() {
      cv.width = img.naturalWidth; cv.height = img.naturalHeight; ctx.drawImage(img, 0, 0);
      regions.forEach(apply);
      if (drag) { ctx.strokeStyle = "#d8b46a"; ctx.lineWidth = Math.max(2, cv.width / 400); ctx.setLineDash([10, 6]); ctx.strokeRect(drag.x0, drag.y0, drag.x1 - drag.x0, drag.y1 - drag.y0); ctx.setLineDash([]); }
    }
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); drag = { x0: x, y0: y, x1: x, y1: y, m: mode }; };
    cv.onpointermove = e => { if (!drag) return; [drag.x1, drag.y1] = pt(e); draw(); };
    cv.onpointerup = () => { if (drag) { regions.push(drag); drag = null; draw(); } };
    $("#undo", ui).onclick = () => { regions.pop(); draw(); };
    $("#clr", ui).onclick = () => { regions = []; draw(); };
    $("#save", ui).onclick = async () => { const jpg = file.type === "image/jpeg"; download(await canvasBlob(cv, jpg ? "image/jpeg" : "image/png", .92), baseName(file.name) + "_hidden." + (jpg ? "jpg" : "png")); };
  },
});

tool({
  id: "img-chroma", cat: "image", also: ["creator"], icon: I.drop, name: "ลบพื้นหลังสีเดียว",
  desc: "ลบพื้นหลังสีพื้น (ขาว เขียว ฟ้า) ให้โปร่งใส เหมาะกับโลโก้ ลายเซ็นที่ถ่ายจากกระดาษ หรือกรีนสกรีน",
  keywords: "remove background transparent chroma key green screen ลบพื้นหลัง พื้นใส โลโก้",
  render(body) {
    let img, file, key = [255, 255, 255];
    const ui = h(`<div hidden><div class="row"><div class="field" style="flex:0 0 90px"><label>สีที่จะลบ</label><input type="color" id="kc" value="#ffffff"></div><div class="field"><label>ความไว: <span id="tv">40</span></label><input type="range" id="tol" min="5" max="160" value="40"></div><div class="field"><label>ขอบนุ่ม: <span id="sv">20</span></label><input type="range" id="soft" min="0" max="80" value="20"></div></div>
      <p class="hint">แตะบนรูปเพื่อเลือกสีพื้นหลังที่จะลบ</p>
      <div class="canvas-wrap"><canvas id="cv" style="cursor:crosshair"></canvas></div>
      <div class="actions"><button class="btn btn-gold" id="save">บันทึก PNG พื้นใส</button></div></div>`);
    body.append(dropZone({ accept: "image/*", title: "เลือกรูป", hint: "พื้นหลังควรเป็นสีเดียวเรียบ ๆ" }, async ([f]) => {
      img = await loadImage(f); file = f; ui.hidden = false;
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
      key = [...x.getImageData(2, 2, 1, 1).data.slice(0, 3)]; $("#kc", ui).value = "#" + key.map(v => pad(v.toString(16))).join(""); draw();
    }), ui);
    const cv = $("#cv", ui), ctx = cv.getContext("2d", { willReadFrequently: true });
    function draw() {
      if (!img) return;
      const s = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
      cv.width = img.naturalWidth * s; cv.height = img.naturalHeight * s; ctx.drawImage(img, 0, 0, cv.width, cv.height);
      const d = ctx.getImageData(0, 0, cv.width, cv.height), p = d.data, tol = +$("#tol", ui).value, soft = +$("#soft", ui).value;
      for (let i = 0; i < p.length; i += 4) {
        const dist = Math.hypot(p[i] - key[0], p[i + 1] - key[1], p[i + 2] - key[2]);
        if (dist < tol) p[i + 3] = 0; else if (dist < tol + soft) p[i + 3] = Math.round(255 * (dist - tol) / soft);
      }
      ctx.putImageData(d, 0, 0);
    }
    $("#kc", ui).oninput = e => { key = [1, 3, 5].map(i => parseInt(e.target.value.slice(i, i + 2), 16)); draw(); };
    $("#tol", ui).oninput = e => { $("#tv", ui).textContent = e.target.value; draw(); };
    $("#soft", ui).oninput = e => { $("#sv", ui).textContent = e.target.value; draw(); };
    cv.onclick = e => {
      const r = cv.getBoundingClientRect(), t = document.createElement("canvas"); t.width = cv.width; t.height = cv.height;
      const tx = t.getContext("2d"); tx.drawImage(img, 0, 0, t.width, t.height);
      key = [...tx.getImageData((e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height, 1, 1).data.slice(0, 3)];
      $("#kc", ui).value = "#" + key.map(v => pad(v.toString(16))).join(""); draw();
    };
    $("#save", ui).onclick = async () => download(await canvasBlob(cv), baseName(file.name) + "_transparent.png");
  },
});

tool({
  id: "img-adjust", cat: "image", icon: I.palette, name: "ปรับแสง สี & ฟิลเตอร์",
  desc: "ปรับความสว่าง คอนทราสต์ ความอิ่มสี อุณหภูมิสี และฟิลเตอร์ขาวดำ/ซีเปีย ดูผลทันที",
  keywords: "brightness contrast saturation filter ฟิลเตอร์ ปรับแสง ขาวดำ ซีเปีย แต่งรูป",
  render(body) {
    let img, file, base;
    const S = [["br", "ความสว่าง", -100, 100, 0], ["ct", "คอนทราสต์", -100, 100, 0], ["sa", "ความอิ่มสี", -100, 100, 0], ["wa", "อุณหภูมิสี (อุ่น/เย็น)", -100, 100, 0]];
    const ui = h(`<div hidden>${S.map(([id, l, a, b, v]) => `<div class="field" style="margin-top:10px"><label>${l}: <span id="${id}v">${v}</span></label><input type="range" id="${id}" min="${a}" max="${b}" value="${v}"></div>`).join("")}
      <div class="tabs" style="margin-top:14px" id="fx"><button class="chip active" data-f="none">ปกติ</button><button class="chip" data-f="gray">ขาวดำ</button><button class="chip" data-f="sepia">ซีเปีย</button><button class="chip" data-f="invert">กลับสี</button></div>
      <div class="canvas-wrap"><canvas id="cv"></canvas></div>
      <div class="actions"><button class="btn btn-gold" id="save">บันทึกรูป</button><button class="btn btn-ghost" id="rs">รีเซ็ต</button></div></div>`);
    body.append(dropZone({ accept: "image/*", title: "เลือกรูป", hint: "ปรับแล้วดูผลทันที" }, async ([f]) => {
      img = await loadImage(f); file = f; ui.hidden = false;
      const s = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
      c.width = img.naturalWidth * s; c.height = img.naturalHeight * s; const x = c.getContext("2d"); x.drawImage(img, 0, 0, c.width, c.height);
      base = x.getImageData(0, 0, c.width, c.height); draw();
    }), ui);
    let fx = "none";
    const cv = $("#cv", ui), ctx = cv.getContext("2d");
    function draw() {
      if (!base) return;
      cv.width = base.width; cv.height = base.height;
      const out = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height), p = out.data;
      const br = +$("#br", ui).value * 1.28, c = +$("#ct", ui).value, cf = (259 * (c + 255)) / (255 * (259 - c)), sa = 1 + $("#sa", ui).value / 100, wa = +$("#wa", ui).value * .3;
      for (let i = 0; i < p.length; i += 4) {
        let r = p[i], g = p[i + 1], b = p[i + 2];
        r = cf * (r - 128) + 128 + br + wa; g = cf * (g - 128) + 128 + br; b = cf * (b - 128) + 128 + br - wa;
        const l = .299 * r + .587 * g + .114 * b; r = l + (r - l) * sa; g = l + (g - l) * sa; b = l + (b - l) * sa;
        if (fx === "gray") r = g = b = .299 * r + .587 * g + .114 * b;
        else if (fx === "sepia") [r, g, b] = [r * .393 + g * .769 + b * .189, r * .349 + g * .686 + b * .168, r * .272 + g * .534 + b * .131];
        else if (fx === "invert") [r, g, b] = [255 - r, 255 - g, 255 - b];
        p[i] = r; p[i + 1] = g; p[i + 2] = b;
      }
      ctx.putImageData(out, 0, 0);
    }
    S.forEach(([id]) => $("#" + id, ui).oninput = e => { $(`#${id}v`, ui).textContent = e.target.value; draw(); });
    $("#fx", ui).onclick = e => { const b = e.target.closest("[data-f]"); if (!b) return; fx = b.dataset.f; $$("#fx .chip", ui).forEach(x => x.classList.toggle("active", x === b)); draw(); };
    $("#rs", ui).onclick = () => { S.forEach(([id, , , , v]) => { $("#" + id, ui).value = v; $(`#${id}v`, ui).textContent = v; }); fx = "none"; $$("#fx .chip", ui).forEach((x, i) => x.classList.toggle("active", !i)); draw(); };
    $("#save", ui).onclick = async () => { const jpg = file.type === "image/jpeg"; download(await canvasBlob(cv, jpg ? "image/jpeg" : "image/png", .92), baseName(file.name) + "_edit." + (jpg ? "jpg" : "png")); };
  },
});

tool({
  id: "img-frame", cat: "image", also: ["creator"], icon: I.crop, name: "เติมขอบ & ทำภาพจัตุรัส",
  desc: "ใส่รูปลงกรอบจัตุรัสหรือสัดส่วนที่ต้องการโดยไม่ต้องครอป เติมขอบสีหรือพื้นหลังเบลอ เหมาะกับโพสต์ IG",
  keywords: "frame border padding square no crop ใส่กรอบ เติมขอบ ภาพจัตุรัส ig ไม่ครอป",
  render(body) {
    let img, file;
    const ui = h(`<div hidden><div class="tabs" id="ar"><button class="chip active" data-r="1">1:1</button><button class="chip" data-r="0.8">4:5</button><button class="chip" data-r="0.5625">9:16</button><button class="chip" data-r="1.7778">16:9</button></div>
      <div class="row"><div class="field"><label>ระยะขอบ: <span id="pv">6</span>%</label><input type="range" id="pd" min="0" max="25" value="6"></div><div class="field"><label>มุมโค้งของรูป</label><input type="range" id="rd" min="0" max="20" value="0"></div>
      <div class="field"><label>พื้นหลัง</label><select class="input" id="bgm"><option value="color">สีพื้น</option><option value="blur">รูปเดิมแบบเบลอ</option></select></div><div class="field" style="flex:0 0 80px"><label>สี</label><input type="color" id="bg" value="#ffffff"></div></div>
      <div class="canvas-wrap"><canvas id="cv"></canvas></div><div class="actions"><button class="btn btn-gold" id="save">บันทึกรูป</button></div></div>`);
    body.append(dropZone({ accept: "image/*", title: "เลือกรูป", hint: "รูปทั้งภาพจะอยู่ในกรอบ ไม่ถูกตัด" }, async ([f]) => { img = await loadImage(f); file = f; ui.hidden = false; draw(); }), ui);
    let ar = 1;
    const cv = $("#cv", ui), ctx = cv.getContext("2d");
    function draw() {
      if (!img) return;
      const W = 2048, H = Math.round(W / ar), pd = $("#pd", ui).value / 100 * Math.min(W, H);
      cv.width = W; cv.height = H;
      if ($("#bgm", ui).value === "blur") {
        const s = Math.max(W / img.naturalWidth, H / img.naturalHeight), t = document.createElement("canvas"); t.width = Math.ceil(W / 24); t.height = Math.ceil(H / 24);
        t.getContext("2d").drawImage(img, (W - img.naturalWidth * s) / 2 / 24, (H - img.naturalHeight * s) / 2 / 24, img.naturalWidth * s / 24, img.naturalHeight * s / 24);
        ctx.imageSmoothingEnabled = true; ctx.drawImage(t, 0, 0, W, H); ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.fillRect(0, 0, W, H);
      } else { ctx.fillStyle = $("#bg", ui).value; ctx.fillRect(0, 0, W, H); }
      const s = Math.min((W - 2 * pd) / img.naturalWidth, (H - 2 * pd) / img.naturalHeight), w = img.naturalWidth * s, hh = img.naturalHeight * s, x = (W - w) / 2, y = (H - hh) / 2;
      ctx.save(); const r = $("#rd", ui).value / 100 * Math.min(w, hh);
      if (r && ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, hh, r); ctx.clip(); }
      ctx.drawImage(img, x, y, w, hh); ctx.restore();
    }
    $("#ar", ui).onclick = e => { const b = e.target.closest("[data-r]"); if (!b) return; ar = +b.dataset.r; $$("#ar .chip", ui).forEach(x => x.classList.toggle("active", x === b)); draw(); };
    $$("input, select", ui).forEach(i => i.oninput = () => { $("#pv", ui).textContent = $("#pd", ui).value; draw(); });
    $("#save", ui).onclick = async () => download(await canvasBlob(cv, "image/jpeg", .92), baseName(file.name) + "_framed.jpg");
  },
});

// ---------- Split image into a grid ----------
tool({
  id: "img-split", cat: "image", also: ["creator"], fresh: true, icon: I.grid, name: "ตัดรูปเป็นตาราง (IG Grid)",
  desc: "แบ่งรูปเป็น 3×1, 3×3 หรือกำหนดเอง สำหรับโพสต์ต่อกันเป็นภาพใหญ่บน Instagram หรือทำสติกเกอร์ ได้ไฟล์ ZIP เรียงลำดับโพสต์ให้แล้ว",
  keywords: "split image grid instagram ig panorama ตัดรูป แบ่งรูป ตาราง 3x3 carousel",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label for="c">คอลัมน์</label><input class="input" type="number" id="c" min="1" max="10" value="3" inputmode="numeric"></div><div class="field"><label for="r">แถว</label><input class="input" type="number" id="r" min="1" max="10" value="3" inputmode="numeric"></div>
      <div class="field"><label for="sq">สัดส่วนแต่ละช่อง</label><select class="input" id="sq"><option value="orig">ตามรูปเดิม</option><option value="1">จัตุรัส 1:1 (ครอปกลาง)</option><option value="0.8">IG 4:5 (ครอปกลาง)</option></select></div></div>
      <div class="actions"><button class="chip" data-p="3,1">3×1 พาโนรามา</button><button class="chip" data-p="3,3">3×3</button><button class="chip" data-p="2,2">2×2</button><button class="chip" data-p="3,2">3×2</button></div>
      <div class="canvas-wrap" hidden id="wrap"><canvas id="cv" style="max-width:100%"></canvas></div>
      <div class="actions" id="acts" hidden><button class="btn btn-gold" id="zip">ดาวน์โหลด ZIP</button></div><div class="status" id="st"></div></div>`);
    let img = null;
    body.append(dropZone({ accept: "image/*", title: "เลือกรูปที่จะตัด", hint: "PNG, JPG, WebP" }, async ([f]) => { img = await loadImage(f); img.fname = baseName(f.name); draw(); }), ui);
    const geom = () => {
      const C = Math.max(1, Math.min(10, +$("#c", ui).value || 1)), R = Math.max(1, Math.min(10, +$("#r", ui).value || 1)), ratio = $("#sq", ui).value;
      let W = img.naturalWidth, H = img.naturalHeight, x = 0, y = 0;
      if (ratio !== "orig") { const want = C / (R * (1 / +ratio)) ; if (W / H > want) { const nw = H * want; x = (W - nw) / 2; W = nw; } else { const nh = W / want; y = (H - nh) / 2; H = nh; } }
      return { C, R, x, y, W, H, cw: Math.floor(W / C), ch: Math.floor(H / R) };
    };
    const draw = () => {
      if (!img) return;
      const g = geom(), cv = $("#cv", ui), ctx = cv.getContext("2d"), s = Math.min(1, 900 / g.W);
      cv.width = g.W * s; cv.height = g.H * s;
      ctx.drawImage(img, g.x, g.y, g.W, g.H, 0, 0, cv.width, cv.height);
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.font = `600 ${Math.max(14, cv.width / g.C / 7)}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let i = 1; i < g.C; i++) { ctx.beginPath(); ctx.moveTo(cv.width * i / g.C, 0); ctx.lineTo(cv.width * i / g.C, cv.height); ctx.stroke(); }
      for (let j = 1; j < g.R; j++) { ctx.beginPath(); ctx.moveTo(0, cv.height * j / g.R); ctx.lineTo(cv.width, cv.height * j / g.R); ctx.stroke(); }
      // Instagram shows the newest post top-left, so the posting order is the reverse of reading order.
      for (let j = 0; j < g.R; j++) for (let i = 0; i < g.C; i++) {
        const n = g.C * g.R - (j * g.C + i), cx = cv.width * (i + .5) / g.C, cy = cv.height * (j + .5) / g.R;
        ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.beginPath(); ctx.arc(cx, cy, Math.max(16, cv.width / g.C / 9), 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillText(n, cx, cy);
      }
      $("#wrap", ui).hidden = false; $("#acts", ui).hidden = false;
      setStatus($("#st", ui), `${g.C * g.R} ชิ้น · ชิ้นละ ${g.cw}×${g.ch}px · ตัวเลข = ลำดับการโพสต์ (โพสต์ 1 ก่อน)`);
    };
    $$("[data-p]", ui).forEach(b => b.onclick = () => { const [c, r] = b.dataset.p.split(","); $("#c", ui).value = c; $("#r", ui).value = r; draw(); });
    $$("input,select", ui).forEach(e => e.oninput = draw);
    $("#zip", ui).onclick = async () => {
      const g = geom(), out = [], c = document.createElement("canvas"); c.width = g.cw; c.height = g.ch;
      setStatus($("#st", ui), "กำลังตัด…");
      for (let j = 0; j < g.R; j++) for (let i = 0; i < g.C; i++) {
        c.getContext("2d").drawImage(img, g.x + i * g.cw, g.y + j * g.ch, g.cw, g.ch, 0, 0, g.cw, g.ch);
        const n = g.C * g.R - (j * g.C + i);
        out.push({ blob: await canvasBlob(c, "image/jpeg", .95), name: `${img.fname}_post${pad(n)}_r${j + 1}c${i + 1}.jpg` });
      }
      download(await zipBlob(out), `${img.fname}_grid.zip`); setStatus($("#st", ui), `ตัดเป็น ${out.length} ชิ้นแล้ว ✓`);
    };
  },
});

// ---------- Placeholder image ----------
tool({
  id: "placeholder", cat: "image", also: ["dev"], fresh: true, icon: I.image, name: "สร้างรูปตัวอย่าง (Placeholder)",
  desc: "สร้างรูปขนาดที่ต้องการพร้อมข้อความและสี สำหรับวางเลย์เอาต์หรือม็อกอัป โหลดเป็น PNG / SVG หรือคัดลอก Data URI",
  keywords: "placeholder image dummy รูปตัวอย่าง mockup svg png ขนาด",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label for="w">กว้าง (px)</label><input class="input" type="number" id="w" value="1200" min="1" max="8000" inputmode="numeric"></div><div class="field"><label for="hh">สูง (px)</label><input class="input" type="number" id="hh" value="630" min="1" max="8000" inputmode="numeric"></div></div>
      <div class="actions"><button class="chip" data-s="1200x630">OG 1200×630</button><button class="chip" data-s="1080x1080">IG 1080²</button><button class="chip" data-s="1080x1920">Story 1080×1920</button><button class="chip" data-s="1280x720">720p</button><button class="chip" data-s="300x250">โฆษณา 300×250</button></div>
      <div class="row"><div class="field"><label for="tx">ข้อความ (เว้นว่าง = ขนาด)</label><input class="input" id="tx"></div><div class="field" style="max-width:110px"><label for="bg">พื้น</label><input class="input" type="color" id="bg" value="#2a2520"></div><div class="field" style="max-width:110px"><label for="fg">ตัวอักษร</label><input class="input" type="color" id="fg" value="#d8b46a"></div></div>
      <div class="canvas-wrap" style="margin-top:14px"><canvas id="cv" style="max-width:100%;border-radius:10px"></canvas></div>
      <div class="actions"><button class="btn btn-gold btn-sm" id="png">PNG</button><button class="btn btn-ghost btn-sm" id="svg">SVG</button><button class="btn btn-ghost btn-sm" id="uri">คัดลอก Data URI (SVG)</button></div></div>`);
    body.append(ui);
    const g = () => { const W = Math.min(8000, Math.max(1, Math.round(num($("#w", ui).value)) || 1)), H = Math.min(8000, Math.max(1, Math.round(num($("#hh", ui).value)) || 1)); return { W, H, t: $("#tx", ui).value.trim() || `${W} × ${H}`, bg: $("#bg", ui).value, fg: $("#fg", ui).value }; };
    const svg = () => { const { W, H, t, bg, fg } = g(), fs = Math.round(Math.min(W / Math.max(4, [...t].length) * 1.4, H / 4)); return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" fill="${fg}" font-family="system-ui,sans-serif" font-size="${fs}" font-weight="600" text-anchor="middle" dominant-baseline="central">${esc(t)}</text></svg>`; };
    const paint = (cv, scale = 1) => { const { W, H, t, bg, fg } = g(), fs = Math.min(W / Math.max(4, [...t].length) * 1.4, H / 4); cv.width = W * scale; cv.height = H * scale; const c = cv.getContext("2d"); c.scale(scale, scale); c.fillStyle = bg; c.fillRect(0, 0, W, H); c.fillStyle = fg; c.font = `600 ${fs}px system-ui, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(t, W / 2, H / 2); };
    const run = () => { const { W } = g(); paint($("#cv", ui), Math.min(1, 800 / W)); };
    $$("[data-s]", ui).forEach(b => b.onclick = () => { const [w, hh] = b.dataset.s.split("x"); $("#w", ui).value = w; $("#hh", ui).value = hh; run(); });
    $$("input", ui).forEach(e => e.oninput = run);
    $("#png", ui).onclick = async () => { const c = document.createElement("canvas"); paint(c); const { W, H } = g(); download(await canvasBlob(c), `placeholder-${W}x${H}.png`); };
    $("#svg", ui).onclick = () => { const { W, H } = g(); download(new Blob([svg()], { type: "image/svg+xml" }), `placeholder-${W}x${H}.svg`); };
    $("#uri", ui).onclick = () => copy("data:image/svg+xml," + encodeURIComponent(svg()));
    run();
  },
});
