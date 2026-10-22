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
