// PDF & document tools: images → PDF, merge PDFs, extract/rotate pages, Markdown preview, CSV ⇄ JSON.

tool({
  id: "img-pdf", cat: "docs", icon: I.pdf, name: "รูปภาพ → PDF",
  desc: "รวมรูปหลายรูปเป็นไฟล์ PDF เดียว เรียงตามลำดับที่เลือก เหมาะกับสแกนเอกสาร",
  keywords: "pdf image jpg รวม เอกสาร scan สแกน",
  render(body) {
    let files = [];
    const ui = h(`<div><div class="row">
      <div class="field"><label>ขนาดหน้า</label><select class="input" id="ps"><option value="a4">A4</option><option value="letter">Letter</option><option value="fit">พอดีกับรูป</option></select></div>
      <div class="field"><label>ระยะขอบ (มม.)</label><input class="input" type="number" id="mg" value="10" min="0" max="40" /></div></div>
      <div class="out" id="list"></div>
      <div class="actions"><button class="btn btn-gold" id="go" disabled>สร้าง PDF</button></div><div class="status" id="st"></div></div>`);
    const list = $("#list", ui);
    const draw = () => {
      list.innerHTML = files.map((x, i) => `<div class="file-item"><div class="meta"><b>หน้า ${i + 1} — ${esc(x.name)}</b><small>${fmtSize(x.size)}</small></div><button class="btn btn-ghost btn-sm" data-up="${i}" ${i ? "" : "disabled"}>↑</button><button class="btn btn-ghost btn-sm" data-rm="${i}">✕</button></div>`).join("");
      $("#go", ui).disabled = !files.length;
    };
    list.onclick = e => {
      const up = e.target.closest("[data-up]"), rm = e.target.closest("[data-rm]");
      if (up) { const i = +up.dataset.up; [files[i - 1], files[i]] = [files[i], files[i - 1]]; draw(); }
      if (rm) { files.splice(+rm.dataset.rm, 1); draw(); }
    };
    body.append(dropZone({ accept: "image/jpeg,image/png,image/webp", multiple: true, title: "เลือกรูปภาพหลายไฟล์", hint: "JPG · PNG · WEBP — เพิ่มได้เรื่อย ๆ" }, f => { files.push(...f); draw(); }), ui);
    $("#go", ui).onclick = async () => {
      const st = $("#st", ui); setStatus(st, "กำลังสร้าง PDF…");
      try {
        await loadScript(LIB.jspdf);
        const { jsPDF } = window.jspdf, ps = $("#ps", ui).value, mg = +$("#mg", ui).value;
        let doc;
        for (const [i, f] of files.entries()) {
          const img = await loadImage(f);
          const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
          const data = c.toDataURL("image/jpeg", .92);
          const orient = img.naturalWidth > img.naturalHeight ? "l" : "p";
          const pageFmt = ps === "fit" ? [img.naturalWidth * .264583 + mg * 2, img.naturalHeight * .264583 + mg * 2] : ps;
          if (!doc) doc = new jsPDF({ unit: "mm", format: pageFmt, orientation: orient });
          else doc.addPage(pageFmt, orient);
          const pw = doc.internal.pageSize.getWidth() - mg * 2, ph = doc.internal.pageSize.getHeight() - mg * 2;
          const s = Math.min(pw / img.naturalWidth, ph / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s;
          doc.addImage(data, "JPEG", mg + (pw - dw) / 2, mg + (ph - dh) / 2, dw, dh);
          st.textContent = `กำลังสร้าง PDF… ${i + 1}/${files.length}`; await tick();
        }
        download(doc.output("blob"), "images.pdf");
        setStatus(st, `เสร็จแล้ว ✓ ${files.length} หน้า`);
      } catch (e) { setStatus(st, e.message, true); }
    };
  },
});

tool({
  id: "pdf-merge", cat: "docs", icon: I.merge, name: "รวมไฟล์ PDF",
  desc: "รวม PDF หลายไฟล์เป็นไฟล์เดียว จัดลำดับได้ตามต้องการ",
  keywords: "merge pdf combine รวม pdf",
  render(body) {
    let files = [];
    const ui = h(`<div><div class="out" id="list"></div><div class="actions"><button class="btn btn-gold" id="go" disabled>รวม PDF</button></div><div class="status" id="st"></div></div>`);
    const list = $("#list", ui);
    const draw = () => {
      list.innerHTML = files.map((x, i) => `<div class="file-item"><div class="meta"><b>${i + 1}. ${esc(x.name)}</b><small>${fmtSize(x.size)}</small></div><button class="btn btn-ghost btn-sm" data-up="${i}" ${i ? "" : "disabled"}>↑</button><button class="btn btn-ghost btn-sm" data-rm="${i}">✕</button></div>`).join("");
      $("#go", ui).disabled = files.length < 2;
    };
    list.onclick = e => {
      const up = e.target.closest("[data-up]"), rm = e.target.closest("[data-rm]");
      if (up) { const i = +up.dataset.up; [files[i - 1], files[i]] = [files[i], files[i - 1]]; draw(); }
      if (rm) { files.splice(+rm.dataset.rm, 1); draw(); }
    };
    body.append(dropZone({ accept: "application/pdf", multiple: true, title: "เลือกไฟล์ PDF (2 ไฟล์ขึ้นไป)", hint: "เพิ่มได้เรื่อย ๆ และจัดลำดับได้" }, f => { files.push(...f); draw(); }), ui);
    $("#go", ui).onclick = async () => {
      const st = $("#st", ui); setStatus(st, "กำลังรวม…");
      try {
        await loadScript(LIB.pdflib);
        const out = await PDFLib.PDFDocument.create();
        let pages = 0;
        for (const f of files) {
          const src = await PDFLib.PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
          const copied = await out.copyPages(src, src.getPageIndices());
          copied.forEach(p => out.addPage(p)); pages += copied.length;
        }
        download(new Blob([await out.save()], { type: "application/pdf" }), "merged.pdf");
        setStatus(st, `เสร็จแล้ว ✓ ${files.length} ไฟล์ รวม ${pages} หน้า`);
      } catch (e) { setStatus(st, "รวมไม่สำเร็จ: " + e.message, true); }
    };
  },
});

// "1-3, 5, 8-" → zero-based page indexes
function parseRanges(str, total) {
  const out = [];
  for (const part of str.split(",").map(s => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d*)\s*-\s*(\d*)$/);
    if (m) { const a = m[1] ? +m[1] : 1, b = m[2] ? +m[2] : total; for (let i = a; i <= b; i++) if (i >= 1 && i <= total) out.push(i - 1); }
    else if (/^\d+$/.test(part) && +part >= 1 && +part <= total) out.push(+part - 1);
    else throw new Error("รูปแบบหน้าไม่ถูกต้อง: " + part);
  }
  return out;
}

tool({
  id: "pdf-pages", cat: "docs", icon: I.split, name: "แยก / หมุนหน้า PDF",
  desc: "ดึงเฉพาะหน้าที่ต้องการ ลบหน้า แยกทุกหน้าเป็นไฟล์ หรือหมุนหน้า PDF",
  keywords: "split pdf extract pages rotate แยก หมุน ลบหน้า",
  render(body) {
    let file, src, total = 0;
    const ui = h(`<div hidden><div class="status" id="info"></div>
      <div class="row"><div class="field"><label>หน้าที่ต้องการ (เช่น 1-3, 5, 8-)</label><input class="input" id="r" placeholder="ทั้งหมด"></div>
      <div class="field"><label>หมุน</label><select class="input" id="rot"><option value="0">ไม่หมุน</option><option value="90">90° ตามเข็ม</option><option value="180">180°</option><option value="270">90° ทวนเข็ม</option></select></div></div>
      <div class="actions"><button class="btn btn-gold" id="keep">บันทึกเฉพาะหน้าที่เลือก</button><button class="btn btn-ghost" id="del">ลบหน้าที่เลือก</button><button class="btn btn-ghost" id="each">แยกทุกหน้าเป็นไฟล์</button></div>
      <div class="status" id="st"></div></div>`);
    const st = $("#st", ui);
    body.append(dropZone({ accept: "application/pdf", title: "เลือกไฟล์ PDF", hint: "ประมวลผลในเครื่องของคุณ" }, async ([f]) => {
      try {
        await loadScript(LIB.pdflib);
        file = f; src = await PDFLib.PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true }); total = src.getPageCount();
        ui.hidden = false; setStatus($("#info", ui), `${f.name} · ${total} หน้า`);
      } catch (e) { setStatus(st, "เปิด PDF ไม่ได้: " + e.message, true); }
    }), ui);
    async function build(indexes) {
      const out = await PDFLib.PDFDocument.create(), deg = +$("#rot", ui).value;
      (await out.copyPages(src, indexes)).forEach(p => { if (deg) p.setRotation(PDFLib.degrees((p.getRotation().angle + deg) % 360)); out.addPage(p); });
      return new Blob([await out.save()], { type: "application/pdf" });
    }
    const selected = () => $("#r", ui).value.trim() ? parseRanges($("#r", ui).value, total) : [...Array(total).keys()];
    $("#keep", ui).onclick = async () => {
      try { const idx = selected(); if (!idx.length) throw new Error("ไม่มีหน้าที่เลือก"); download(await build(idx), baseName(file.name) + "_pages.pdf"); setStatus(st, `เสร็จแล้ว ✓ ${idx.length} หน้า`); }
      catch (e) { setStatus(st, e.message, true); }
    };
    $("#del", ui).onclick = async () => {
      try { const rm = new Set(selected()), idx = [...Array(total).keys()].filter(i => !rm.has(i)); if (!idx.length) throw new Error("ลบทุกหน้าไม่ได้"); download(await build(idx), baseName(file.name) + "_edited.pdf"); setStatus(st, `เสร็จแล้ว ✓ เหลือ ${idx.length} หน้า`); }
      catch (e) { setStatus(st, e.message, true); }
    };
    $("#each", ui).onclick = async () => {
      try { for (const i of selected()) { download(await build([i]), `${baseName(file.name)}_p${i + 1}.pdf`); await new Promise(r => setTimeout(r, 350)); } setStatus(st, "เสร็จแล้ว ✓"); }
      catch (e) { setStatus(st, e.message, true); }
    };
  },
});

tool({
  id: "markdown", cat: "docs", icon: I.md, name: "Markdown Preview",
  desc: "เขียน Markdown แล้วดูผลลัพธ์ทันที คัดลอกเป็น HTML หรือพิมพ์เป็น PDF ได้",
  keywords: "markdown md preview html เขียน",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t"># หัวข้อ\n\nเขียน **ตัวหนา**, *ตัวเอียง* และ [ลิงก์](https://example.com)\n\n- รายการ 1\n- รายการ 2\n\n\`\`\`js\nconsole.log("hello")\n\`\`\`</textarea>
      <div class="preview" id="pv"></div>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="html">คัดลอก HTML</button><button class="btn btn-ghost btn-sm" id="print">พิมพ์ / PDF</button><button class="btn btn-ghost btn-sm" id="save">บันทึก .md</button></div></div>`);
    body.append(ui);
    const t = $("#t", ui), pv = $("#pv", ui);
    t.value = store.get("md", t.value);
    // Strip scripts, embeds and event handlers so pasted Markdown can't run code in the page.
    const sanitize = (html) => {
      const tpl = document.createElement("template"); tpl.innerHTML = html;
      tpl.content.querySelectorAll("script,style,iframe,object,embed,form,link,meta").forEach(n => n.remove());
      tpl.content.querySelectorAll("*").forEach(n => [...n.attributes].forEach(a => {
        if (/^on/i.test(a.name) || (/^(href|src|xlink:href|action)$/i.test(a.name) && /^\s*(javascript|data|vbscript):/i.test(a.value))) n.removeAttribute(a.name);
      }));
      return tpl.innerHTML;
    };
    const render = () => { pv.innerHTML = window.marked ? sanitize(marked.parse(t.value)) : esc(t.value); store.set("md", t.value); };
    loadScript(LIB.marked).then(render).catch(() => render());
    t.oninput = render;
    $("#html", ui).onclick = () => copy(pv.innerHTML);
    $("#save", ui).onclick = () => download(new Blob([t.value], { type: "text/markdown" }), "note.md");
    $("#print", ui).onclick = () => {
      const w = open("", "_blank"); if (!w) return toast("เบราว์เซอร์บล็อกหน้าต่างใหม่");
      w.document.write(`<!doctype html><meta charset="utf-8"><title>Markdown</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.6}pre{background:#f4f4f4;padding:12px;border-radius:8px;overflow:auto}code{background:#f4f4f4;padding:1px 5px;border-radius:4px}</style>${pv.innerHTML}`);
      w.document.close(); w.focus(); w.print();
    };
  },
});

function parseCSV(text, sep) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

tool({
  id: "csv-json", cat: "docs", icon: I.table, name: "CSV ⇄ JSON",
  desc: "แปลงตาราง CSV (จาก Excel/Sheets) เป็น JSON และแปลง JSON กลับเป็น CSV",
  keywords: "csv json excel sheets table ตาราง convert",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" placeholder="วาง CSV หรือ JSON ที่นี่">name,age,city\nสมชาย,30,กรุงเทพ\nสุดา,25,เชียงใหม่</textarea>
      <div class="row"><div class="field"><label>ตัวคั่น</label><select class="input" id="sep"><option value=",">จุลภาค ( , )</option><option value=";">อัฒภาค ( ; )</option><option value="\t">Tab</option></select></div></div>
      <div class="actions"><button class="btn btn-gold btn-sm" id="toJson">CSV → JSON</button><button class="btn btn-ghost btn-sm" id="toCsv">JSON → CSV</button><button class="btn btn-ghost btn-sm" id="cp">คัดลอก</button><button class="btn btn-ghost btn-sm" id="dl">บันทึกไฟล์</button></div>
      <div class="status" id="st"></div></div>`);
    body.append(ui);
    const t = $("#t", ui), st = $("#st", ui), sep = () => $("#sep", ui).value;
    $("#toJson", ui).onclick = () => {
      const [head, ...rows] = parseCSV(t.value.trim(), sep());
      if (!head) return setStatus(st, "ไม่มีข้อมูล", true);
      t.value = JSON.stringify(rows.map(r => Object.fromEntries(head.map((k, i) => [k, r[i] ?? ""]))), null, 2);
      setStatus(st, `แปลงแล้ว ${rows.length} แถว`);
    };
    $("#toCsv", ui).onclick = () => {
      try {
        let data = JSON.parse(t.value); if (!Array.isArray(data)) data = [data];
        const keys = [...new Set(data.flatMap(o => Object.keys(o)))], s = sep();
        const cell = v => { v = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /["\n\r]|[,;\t]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
        t.value = [keys.map(cell).join(s), ...data.map(o => keys.map(k => cell(o[k])).join(s))].join("\n");
        setStatus(st, `แปลงแล้ว ${data.length} แถว`);
      } catch (e) { setStatus(st, "JSON ไม่ถูกต้อง: " + e.message, true); }
    };
    $("#cp", ui).onclick = () => copy(t.value);
    $("#dl", ui).onclick = () => {
      const isJson = /^\s*[\[{]/.test(t.value);
      // BOM so Excel opens Thai text correctly
      download(new Blob([isJson ? t.value : "﻿" + t.value], { type: isJson ? "application/json" : "text/csv" }), isJson ? "data.json" : "data.csv");
    };
  },
});

tool({
  id: "pdf-image", cat: "docs", icon: I.image, name: "PDF → รูปภาพ",
  desc: "แปลงหน้า PDF เป็นรูป PNG/JPG ความละเอียดสูง เลือกหน้าได้ เหมาะสำหรับโพสต์หรือแนบในแชต",
  keywords: "pdf to image png jpg แปลง pdf เป็นรูป",
  render(body) {
    let doc, file;
    const ui = h(`<div hidden><div class="status" id="info"></div>
      <div class="row"><div class="field"><label>หน้าที่ต้องการ (เช่น 1-3, 5)</label><input class="input" id="r" placeholder="ทั้งหมด"></div>
      <div class="field"><label>ความละเอียด</label><select class="input" id="sc"><option value="1.5">ปกติ (~110 dpi)</option><option value="2" selected>คมชัด (~150 dpi)</option><option value="3">สูง (~220 dpi)</option></select></div>
      <div class="field"><label>รูปแบบ</label><select class="input" id="fm"><option value="png">PNG</option><option value="jpeg">JPG</option></select></div></div>
      <div class="actions"><button class="btn btn-gold" id="go">แปลงเป็นรูป</button></div><div class="progress"><div id="bar"></div></div><div class="status" id="st"></div><div class="out" id="out"></div></div>`);
    body.append(dropZone({ accept: "application/pdf", title: "เลือกไฟล์ PDF", hint: "ประมวลผลในเครื่องของคุณ" }, async ([f]) => {
      try {
        await loadScript(LIB.pdfjs);
        pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
        file = f; doc = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
        ui.hidden = false; setStatus($("#info", ui), `${f.name} · ${doc.numPages} หน้า`);
      } catch (e) { ui.hidden = false; setStatus($("#info", ui), "เปิด PDF ไม่ได้: " + e.message, true); }
    }), ui);
    $("#go", ui).onclick = async () => {
      const st = $("#st", ui), out = $("#out", ui), bar = $("#bar", ui);
      try {
        const pages = $("#r", ui).value.trim() ? parseRanges($("#r", ui).value, doc.numPages) : [...Array(doc.numPages).keys()];
        const sc = +$("#sc", ui).value, fm = $("#fm", ui).value; out.innerHTML = "";
        for (const [k, i] of pages.entries()) {
          const page = await doc.getPage(i + 1), vp = page.getViewport({ scale: sc });
          const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
          const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          const blob = await canvasBlob(c, "image/" + fm, .92), name = `${baseName(file.name)}_p${i + 1}.${fm === "jpeg" ? "jpg" : "png"}`;
          const row = h(`<div class="file-item"><img src="${URL.createObjectURL(blob)}" alt=""><div class="meta"><b>${esc(name)}</b><small>${c.width}×${c.height} · ${fmtSize(blob.size)}</small></div><button class="btn btn-ghost btn-sm">บันทึก</button></div>`);
          $("button", row).onclick = () => download(blob, name); out.append(row);
          bar.style.width = (k + 1) / pages.length * 100 + "%"; setStatus(st, `แปลงแล้ว ${k + 1}/${pages.length} หน้า`);
        }
      } catch (e) { setStatus(st, e.message, true); }
    };
  },
});

tool({
  id: "signature", cat: "docs", icon: I.sign, name: "เซ็นชื่อดิจิทัล",
  desc: "เซ็นชื่อด้วยนิ้วหรือเมาส์ แล้วบันทึกเป็น PNG พื้นใส สำหรับแปะลงเอกสารหรือ PDF",
  keywords: "signature ลายเซ็น เซ็นชื่อ sign png โปร่งใส",
  render(body) {
    const ui = h(`<div><canvas class="sig-pad" id="cv" aria-label="พื้นที่เซ็นชื่อ"></canvas>
      <div class="row"><div class="field" style="flex:0 0 90px"><label>สีหมึก</label><input type="color" id="col" value="#1a237e"></div><div class="field"><label>ความหนา</label><input type="range" id="w" min="1" max="8" value="3"></div></div>
      <div class="actions"><button class="btn btn-gold" id="save">บันทึก PNG (พื้นใส)</button><button class="btn btn-ghost" id="undo">ย้อนกลับ</button><button class="btn btn-ghost" id="clr">ล้าง</button></div></div>`);
    body.append(ui);
    const cv = $("#cv", ui), ctx = cv.getContext("2d"), strokes = [];
    const fit = () => { const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); redraw(); };
    const redraw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.lineCap = ctx.lineJoin = "round";
      for (const s of strokes) { ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.beginPath(); s.p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
    };
    let cur;
    const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); cur = { c: $("#col", ui).value, w: +$("#w", ui).value * (e.pressure && e.pointerType === "pen" ? .5 + e.pressure : 1), p: [pt(e)] }; strokes.push(cur); };
    cv.onpointermove = e => { if (!cur) return; cur.p.push(pt(e)); redraw(); };
    cv.onpointerup = cv.onpointercancel = () => cur = null;
    $("#undo", ui).onclick = () => { strokes.pop(); redraw(); };
    $("#clr", ui).onclick = () => { strokes.length = 0; redraw(); };
    $("#save", ui).onclick = async () => {
      if (!strokes.length) return toast("ยังไม่ได้เซ็น");
      // Crop to the signature's bounding box with a small margin.
      const all = strokes.flatMap(s => s.p), d = devicePixelRatio || 1, m = 12;
      const x0 = Math.max(0, Math.min(...all.map(p => p[0])) - m), y0 = Math.max(0, Math.min(...all.map(p => p[1])) - m);
      const x1 = Math.max(...all.map(p => p[0])) + m, y1 = Math.max(...all.map(p => p[1])) + m;
      const o = document.createElement("canvas"); o.width = (x1 - x0) * d; o.height = (y1 - y0) * d;
      o.getContext("2d").drawImage(cv, x0 * d, y0 * d, o.width, o.height, 0, 0, o.width, o.height);
      download(await canvasBlob(o), "signature.png");
    };
    requestAnimationFrame(fit); addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  },
});

tool({
  id: "pdf-number", cat: "docs", icon: I.pages, name: "ใส่เลขหน้า PDF",
  desc: "เพิ่มเลขหน้าให้ทุกหน้าของ PDF เลือกตำแหน่ง รูปแบบ (1, 1/10, หน้า 1) และเลขเริ่มต้นได้",
  keywords: "pdf page number เลขหน้า ใส่เลขหน้า",
  render(body) {
    let file;
    const ui = h(`<div hidden><div class="status" id="info"></div>
      <div class="row"><div class="field"><label>ตำแหน่ง</label><select class="input" id="pos"><option value="bc">ล่างกลาง</option><option value="br">ล่างขวา</option><option value="tr">บนขวา</option></select></div>
      <div class="field"><label>รูปแบบ</label><select class="input" id="fmt"><option value="n">1</option><option value="nt">1 / 10</option><option value="p">Page 1</option></select></div>
      <div class="field"><label>เริ่มนับจาก</label><input class="input" type="number" id="s" value="1"></div><div class="field"><label>ข้ามหน้าแรก (ปก)</label><select class="input" id="skip"><option value="0">ไม่ข้าม</option><option value="1">ข้าม</option></select></div></div>
      <div class="actions"><button class="btn btn-gold" id="go">ใส่เลขหน้าและบันทึก</button></div><div class="status" id="st"></div></div>`);
    body.append(dropZone({ accept: "application/pdf", title: "เลือกไฟล์ PDF", hint: "ประมวลผลในเครื่องของคุณ" }, ([f]) => { file = f; ui.hidden = false; setStatus($("#info", ui), f.name); }), ui);
    $("#go", ui).onclick = async () => {
      const st = $("#st", ui);
      try {
        await loadScript(LIB.pdflib);
        const doc = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica), pages = doc.getPages();
        const skip = +$("#skip", ui).value, start = num($("#s", ui).value), pos = $("#pos", ui).value, fmt = $("#fmt", ui).value, total = pages.length - skip + start - 1;
        pages.forEach((p, i) => {
          if (i < skip) return;
          const n = i - skip + start, label = fmt === "nt" ? `${n} / ${total}` : fmt === "p" ? `Page ${n}` : String(n);
          const { width, height } = p.getSize(), size = 10, tw = font.widthOfTextAtSize(label, size), m = 28;
          const x = pos === "bc" ? (width - tw) / 2 : width - m - tw, y = pos === "tr" ? height - m : m - 6;
          p.drawText(label, { x, y, size, font, color: PDFLib.rgb(.25, .25, .25) });
        });
        download(new Blob([await doc.save()], { type: "application/pdf" }), baseName(file.name) + "_numbered.pdf");
        setStatus(st, `เสร็จแล้ว ✓ ${pages.length - skip} หน้า`);
      } catch (e) { setStatus(st, "ทำไม่สำเร็จ: " + e.message, true); }
    };
  },
});
