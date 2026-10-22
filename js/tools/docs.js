// PDF & document tools: images → PDF, merge PDFs, extract/rotate pages, Markdown preview, CSV ⇄ JSON.

tool({
  id: "img-pdf", cat: "PDF & เอกสาร", icon: I.pdf, name: "รูปภาพ → PDF",
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
  id: "pdf-merge", cat: "PDF & เอกสาร", icon: I.merge, name: "รวมไฟล์ PDF",
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
  id: "pdf-pages", cat: "PDF & เอกสาร", icon: I.split, name: "แยก / หมุนหน้า PDF",
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
  id: "markdown", cat: "PDF & เอกสาร", icon: I.md, name: "Markdown Preview",
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
  id: "csv-json", cat: "PDF & เอกสาร", icon: I.table, name: "CSV ⇄ JSON",
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
