// File conversion: one engine that detects a file's kind and converts it to any supported target,
// a universal converter UI on top of it, shortcut tools that preset the converter for common jobs,
// plus GIF maker, ZIP and Thai text-encoding tools. Everything runs in the browser.

// ---------- Detection ----------
const extOf = (name) => (name.match(/\.([^.]+)$/) || [, ""])[1].toLowerCase();
function kindOf(file) {
  const e = extOf(file.name), t = file.type;
  if (["heic", "heif"].includes(e) || /heic|heif/.test(t)) return "heic";
  if (e === "svg" || t === "image/svg+xml") return "svg";
  if (t.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif", "ico", "tif", "tiff"].includes(e)) return "image";
  if (e === "pdf" || t === "application/pdf") return "pdf";
  if (t.startsWith("video/") || ["mp4", "mov", "m4v", "webm", "mkv", "avi"].includes(e)) return "video";
  if (t.startsWith("audio/") || ["mp3", "m4a", "wav", "ogg", "oga", "flac", "aac", "opus", "amr"].includes(e)) return "audio";
  if (["xlsx", "xls", "xlsm", "ods", "numbers", "csv", "tsv"].includes(e)) return "sheet";
  if (e === "docx") return "docx";
  if (e === "json") return "json";
  if (["yaml", "yml"].includes(e)) return "yaml";
  if (["md", "markdown"].includes(e)) return "md";
  if (e === "zip") return "zip";
  if (["txt", "log", "srt", "vtt", "xml", "html", "htm", "ini"].includes(e) || t.startsWith("text/")) return "text";
  return "other";
}
const KIND_NAME = { image: "รูปภาพ", heic: "รูป iPhone (HEIC)", svg: "ภาพเวกเตอร์ (SVG)", pdf: "PDF", video: "วิดีโอ", audio: "เสียง", sheet: "ตาราง (Excel/CSV)", docx: "Word", json: "JSON", yaml: "YAML", md: "Markdown", zip: "ZIP", text: "ข้อความ", other: "ไฟล์อื่น ๆ" };
// Targets per kind, in order of usefulness. Labels double as the select's text.
const TARGETS = {
  image: ["jpg", "png", "webp", "pdf", "ico", "gif", "base64"],
  heic: ["jpg", "png", "webp", "pdf"],
  svg: ["png", "jpg", "webp", "ico"],
  pdf: ["png", "jpg", "txt"],
  video: ["mp3", "wav", "gif"],
  audio: ["mp3", "wav"],
  sheet: ["xlsx", "csv", "json", "html"],
  docx: ["html", "txt"],
  json: ["yaml", "csv", "xlsx"],
  yaml: ["json"],
  md: ["html"],
  zip: ["unzip"],
  text: ["zip"],
  other: ["zip"],
};
const TARGET_NAME = { jpg: "JPG", png: "PNG", webp: "WEBP", pdf: "PDF", ico: "ICO (favicon)", gif: "GIF", base64: "Base64 (.txt)", txt: "ข้อความ (.txt)", mp3: "MP3", wav: "WAV", xlsx: "Excel (.xlsx)", csv: "CSV", json: "JSON", html: "HTML", yaml: "YAML", unzip: "แตกไฟล์ ZIP", zip: "บีบอัดเป็น ZIP" };

// ---------- Decoders ----------
async function decodeImage(file) {
  try { return await loadImage(file); }                    // Safari decodes HEIC natively
  catch (e) {
    if (kindOf(file) !== "heic") throw e;
    await loadScript(LIB.heic);
    const out = await heic2any({ blob: file, toType: "image/png" });
    return loadImage(new File([Array.isArray(out) ? out[0] : out], "x.png", { type: "image/png" }));
  }
}
function imageToCanvas(img, { maxW = 0, svgW = 0, white = false } = {}) {
  let w = img.naturalWidth || svgW || 1024, h = img.naturalHeight || (svgW ? svgW : 1024);
  if (svgW && img.naturalWidth) { h = Math.round(h * svgW / w); w = svgW; }
  if (maxW && w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d"); if (white) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); }
  ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, 0, 0, w, h);
  return c;
}
async function icoFromCanvas(src) {
  const sizes = [16, 32, 48, 256], pngs = [];
  for (const s of sizes) {
    const c = document.createElement("canvas"); c.width = c.height = s;
    const k = Math.min(s / src.width, s / src.height), w = src.width * k, hh = src.height * k;
    c.getContext("2d").drawImage(src, (s - w) / 2, (s - hh) / 2, w, hh);
    pngs.push(new Uint8Array(await (await canvasBlob(c)).arrayBuffer()));
  }
  const head = new DataView(new ArrayBuffer(6 + 16 * sizes.length));
  head.setUint16(2, 1, true); head.setUint16(4, sizes.length, true);
  let off = head.byteLength;
  sizes.forEach((s, i) => {
    const o = 6 + i * 16; head.setUint8(o, s % 256); head.setUint8(o + 1, s % 256);
    head.setUint16(o + 4, 1, true); head.setUint16(o + 6, 32, true);
    head.setUint32(o + 8, pngs[i].length, true); head.setUint32(o + 12, off, true); off += pngs[i].length;
  });
  return new Blob([head, ...pngs], { type: "image/x-icon" });
}
// Animated GIF from canvases (or a single frame). frames: array of canvases of equal size.
async function gifFromFrames(frames, delayMs) {
  await loadScript(LIB.gifenc);
  const { GIFEncoder, quantize, applyPalette } = gifenc, gif = GIFEncoder();
  for (const c of frames) {
    const data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const palette = quantize(data, 256), index = applyPalette(data, palette);
    gif.writeFrame(index, c.width, c.height, { palette, delay: delayMs });
    await tick();
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}
// Grab frames from a video file between start and start+dur seconds.
async function videoFrames(file, { start = 0, dur = 5, fps = 10, width = 480 } = {}, onProgress = () => {}) {
  const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto";
  v.src = URL.createObjectURL(file);
  await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error("เบราว์เซอร์เปิดวิดีโอนี้ไม่ได้")); });
  const end = Math.min(v.duration || dur, start + dur), n = Math.max(1, Math.floor((end - start) * fps));
  const w = Math.min(width, v.videoWidth), hh = Math.round(v.videoHeight * w / v.videoWidth), frames = [];
  for (let i = 0; i < n; i++) {
    v.currentTime = start + i / fps;
    await new Promise(r => { v.onseeked = r; });
    const c = document.createElement("canvas"); c.width = w; c.height = hh; c.getContext("2d", { willReadFrequently: true }).drawImage(v, 0, 0, w, hh);
    frames.push(c); onProgress((i + 1) / n * .5);
  }
  URL.revokeObjectURL(v.src);
  return frames;
}
const textBlob = (s, type = "text/plain") => new Blob([s], { type: type + ";charset=utf-8" });
const sanitizeHtml = (html) => {
  const tpl = document.createElement("template"); tpl.innerHTML = html;
  tpl.content.querySelectorAll("script,style,iframe,object,embed,form,link,meta").forEach(n => n.remove());
  tpl.content.querySelectorAll("*").forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name); }));
  return tpl.innerHTML;
};
const htmlDoc = (title, body) => `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>body{font-family:system-ui,"Noto Sans Thai",sans-serif;max-width:860px;margin:40px auto;padding:0 20px;line-height:1.65;color:#222}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}img{max-width:100%}</style></head><body>${body}</body></html>`;

// ---------- Engine ----------
// Returns [{ blob, name }]. opts: { quality, maxW, svgW, kbps, gif: {start, dur, fps, width} }
async function convertFile(file, target, opts = {}, onProgress = () => {}) {
  const kind = kindOf(file), base = baseName(file.name), q = (opts.quality ?? 90) / 100;
  const one = (blob, ext) => [{ blob, name: `${base}.${ext}` }];
  if (["image", "heic", "svg"].includes(kind)) {
    const img = await decodeImage(file);
    const c = imageToCanvas(img, { maxW: opts.maxW, svgW: kind === "svg" ? opts.svgW || 1024 : 0, white: target === "jpg" || target === "pdf" });
    if (target === "jpg") return one(await canvasBlob(c, "image/jpeg", q), "jpg");
    if (target === "png") return one(await canvasBlob(c, "image/png"), "png");
    if (target === "webp") return one(await canvasBlob(c, "image/webp", q), "webp");
    if (target === "ico") return one(await icoFromCanvas(c), "ico");
    if (target === "gif") return one(await gifFromFrames([c], 0), "gif");
    if (target === "base64") return one(textBlob(c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", q)), "txt");
    if (target === "pdf") {
      await loadScript(LIB.jspdf);
      const mm = .264583, doc = new jspdf.jsPDF({ unit: "mm", format: [c.width * mm, c.height * mm], orientation: c.width > c.height ? "l" : "p" });
      doc.addImage(c.toDataURL("image/jpeg", q), "JPEG", 0, 0, c.width * mm, c.height * mm);
      return one(doc.output("blob"), "pdf");
    }
  }
  if (kind === "pdf") {
    await loadScript(LIB.pdfjs); pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise, out = [];
    if (target === "txt") {
      let text = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const tc = await (await doc.getPage(i)).getTextContent();
        text += `--- หน้า ${i} ---\n` + tc.items.map(it => it.str + (it.hasEOL ? "\n" : "")).join("") + "\n\n"; onProgress(i / doc.numPages);
      }
      return one(textBlob(text), "txt");
    }
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i), vp = page.getViewport({ scale: 2 });
      const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      out.push({ blob: await canvasBlob(c, target === "jpg" ? "image/jpeg" : "image/png", q), name: `${base}_p${i}.${target}` });
      onProgress(i / doc.numPages);
    }
    return out;
  }
  if (kind === "audio" || kind === "video") {
    if (target === "gif") {
      const frames = await videoFrames(file, opts.gif, onProgress);
      return one(await gifFromFrames(frames, Math.round(1000 / (opts.gif?.fps || 10))), "gif");
    }
    const audio = await decodeAudio(file);
    if (target === "wav") return one(encodeWav(audio), "wav");
    return one(await encodeMp3(audio, opts.kbps || 192, onProgress), "mp3");
  }
  if (kind === "sheet") {
    await loadScript(LIB.xlsx);
    const e = extOf(file.name);
    const wb = e === "csv" || e === "tsv" ? XLSX.read(await file.text(), { type: "string", raw: false }) : XLSX.read(await file.arrayBuffer(), { type: "array" });
    if (target === "xlsx") return one(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "xlsx");
    const multi = wb.SheetNames.length > 1;
    if (target === "json") {
      const data = multi ? Object.fromEntries(wb.SheetNames.map(n => [n, XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: "" })])) : XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      return one(textBlob(JSON.stringify(data, null, 2), "application/json"), "json");
    }
    if (target === "html") return one(textBlob(htmlDoc(base, wb.SheetNames.map(n => (multi ? `<h2>${esc(n)}</h2>` : "") + XLSX.utils.sheet_to_html(wb.Sheets[n], { header: "", footer: "" })).join("")), "text/html"), "html");
    // CSV: one file per sheet; BOM so Excel shows Thai correctly
    return wb.SheetNames.map(n => ({ blob: textBlob("﻿" + XLSX.utils.sheet_to_csv(wb.Sheets[n]), "text/csv"), name: multi ? `${base}_${n}.csv` : `${base}.csv` }));
  }
  if (kind === "docx") {
    await loadScript(LIB.mammoth);
    const buf = await file.arrayBuffer();
    if (target === "txt") return one(textBlob((await mammoth.extractRawText({ arrayBuffer: buf })).value), "txt");
    return one(textBlob(htmlDoc(base, sanitizeHtml((await mammoth.convertToHtml({ arrayBuffer: buf })).value)), "text/html"), "html");
  }
  if (kind === "json" || kind === "yaml") {
    const txt = await file.text();
    if (kind === "yaml") { await loadScript(LIB.yaml); return one(textBlob(JSON.stringify(jsyaml.load(txt), null, 2), "application/json"), "json"); }
    const data = JSON.parse(txt);
    if (target === "yaml") { await loadScript(LIB.yaml); return one(textBlob(jsyaml.dump(data)), "yaml"); }
    await loadScript(LIB.xlsx);
    const ws = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
    if (target === "csv") return one(textBlob("﻿" + XLSX.utils.sheet_to_csv(ws), "text/csv"), "csv");
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    return one(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]), "xlsx");
  }
  if (kind === "md") { await loadScript(LIB.marked); return one(textBlob(htmlDoc(base, sanitizeHtml(marked.parse(await file.text()))), "text/html"), "html"); }
  if (target === "unzip") {
    await loadScript(LIB.jszip);
    const z = await JSZip.loadAsync(file), out = [];
    for (const f of Object.values(z.files)) if (!f.dir) out.push({ blob: await f.async("blob"), name: f.name.split("/").pop() || f.name });
    return out;
  }
  if (target === "zip") return [{ blob: await zipBlob([{ blob: file, name: file.name }]), name: base + ".zip" }];
  throw new Error("ยังไม่รองรับการแปลงนี้");
}
async function zipBlob(items) {
  await loadScript(LIB.jszip);
  const z = new JSZip(), used = new Set();
  for (const { blob, name } of items) {
    let n = name, k = 1; const ext = extOf(name);
    while (used.has(n)) n = `${baseName(name)}_${k++}${ext ? "." + ext : ""}`;
    used.add(n); z.file(n, blob);
  }
  return z.generateAsync({ type: "blob", compression: "DEFLATE" });
}

// ---------- Universal converter UI ----------
function converterUI(body, { accept = "*/*", prefer = [], title = "ลากไฟล์มาวาง หรือแตะเพื่อเลือก", hint = "เลือกได้หลายไฟล์ · ระบบตรวจชนิดไฟล์ให้อัตโนมัติ" } = {}) {
  let files = [], results = [];
  const ui = h(`<div><div class="out" id="list"></div>
    <details class="note" style="margin-top:14px"><summary style="cursor:pointer">ตั้งค่าเพิ่มเติม</summary>
      <div class="row"><div class="field"><label>คุณภาพ JPG/WEBP: <span id="qv">90</span>%</label><input type="range" id="cq" min="40" max="100" value="90"></div>
      <div class="field"><label>ย่อรูปให้กว้างไม่เกิน (px, 0 = ไม่ย่อ)</label><input class="input" type="number" id="cmw" value="0" min="0"></div>
      <div class="field"><label>MP3 บิตเรต</label><select class="input" id="ckb"><option>128</option><option selected>192</option><option>320</option></select></div></div>
      <div class="row"><div class="field"><label>GIF จากวิดีโอ: เริ่มวินาทีที่</label><input class="input" type="number" id="gs" value="0" min="0" step="0.5"></div><div class="field"><label>ความยาว (วินาที, ≤ 15)</label><input class="input" type="number" id="gd" value="4" min="1" max="15"></div><div class="field"><label>เฟรม/วินาที</label><input class="input" type="number" id="gf" value="10" min="2" max="20"></div><div class="field"><label>ความกว้าง GIF</label><input class="input" type="number" id="gw" value="480" min="120" max="1080"></div></div>
    </details>
    <div class="actions"><button class="btn btn-gold" id="go" disabled>แปลงทั้งหมด</button><button class="btn btn-ghost" id="bundle" disabled>รวมทุกไฟล์เป็น ZIP</button><button class="btn btn-ghost" id="clear" hidden>ล้างรายการ</button></div>
    <div class="progress"><div id="bar"></div></div><div class="status" id="st"></div>
    <div class="out" id="res"></div><div class="actions" id="resAct" hidden><button class="btn btn-ghost btn-sm" id="saveAll">บันทึกทั้งหมด</button><button class="btn btn-gold btn-sm" id="saveZip">บันทึกผลลัพธ์เป็น ZIP</button></div></div>`);
  const list = $("#list", ui), st = $("#st", ui), bar = $("#bar", ui);
  const draw = () => {
    list.innerHTML = files.map((f, i) => {
      const k = kindOf(f), own = { jpeg: "jpg", yml: "yaml" }[extOf(f.name)] || extOf(f.name), opts = TARGETS[k].filter(t => t !== own).sort((a, b) => (prefer.includes(b) - prefer.includes(a)) || (prefer.indexOf(a) - prefer.indexOf(b)));
      return `<div class="file-item"><div class="meta"><b>${esc(f.name)}</b><small>${KIND_NAME[k]} · ${fmtSize(f.size)}</small></div>
        <label class="sr-only" for="tg${i}">แปลงเป็น</label><select class="input" id="tg${i}" data-i="${i}" style="width:auto;min-width:130px">${opts.map(t => `<option value="${t}">→ ${TARGET_NAME[t]}</option>`).join("")}</select>
        <button class="rm" data-rm="${i}" aria-label="เอา ${esc(f.name)} ออก">✕</button></div>`;
    }).join("");
    $("#go", ui).disabled = $("#bundle", ui).disabled = !files.length; $("#clear", ui).hidden = !files.length;
  };
  list.onclick = e => { const b = e.target.closest("[data-rm]"); if (b) { files.splice(+b.dataset.rm, 1); draw(); } };
  body.append(dropZone({ accept, multiple: true, title, hint }, f => { files.push(...f); draw(); setStatus(st, ""); }), ui);
  $("#cq", ui).oninput = e => $("#qv", ui).textContent = e.target.value;
  $("#clear", ui).onclick = () => { files = []; results = []; draw(); $("#res", ui).innerHTML = ""; $("#resAct", ui).hidden = true; bar.style.width = "0"; setStatus(st, ""); };
  const opts = () => ({ quality: +$("#cq", ui).value, maxW: +$("#cmw", ui).value, kbps: +$("#ckb", ui).value, gif: { start: num($("#gs", ui).value), dur: Math.min(15, num($("#gd", ui).value) || 4), fps: num($("#gf", ui).value) || 10, width: num($("#gw", ui).value) || 480 } });
  const showResults = () => {
    $("#res", ui).innerHTML = results.map((r, i) => `<div class="file-item">${r.blob.type.startsWith("image/") && r.blob.size < 8e6 ? `<img src="${URL.createObjectURL(r.blob)}" alt="">` : ""}<div class="meta"><b>${esc(r.name)}</b><small>${fmtSize(r.blob.size)}</small></div><button class="btn btn-ghost btn-sm" data-sv="${i}">บันทึก</button></div>`).join("");
    $("#resAct", ui).hidden = results.length < 2;
  };
  $("#res", ui).onclick = e => { const b = e.target.closest("[data-sv]"); if (b) download(results[+b.dataset.sv].blob, results[+b.dataset.sv].name); };
  $("#go", ui).onclick = async () => {
    $("#go", ui).disabled = true; results = []; let fails = 0;
    for (const [i, f] of files.entries()) {
      const target = $(`#tg${i}`, ui).value;
      setStatus(st, `กำลังแปลง ${i + 1}/${files.length}: ${f.name} → ${TARGET_NAME[target]}`);
      try { results.push(...await convertFile(f, target, opts(), p => bar.style.width = ((i + p) / files.length * 100) + "%")); }
      catch (e) { fails++; results.push({ blob: textBlob(`แปลง ${f.name} ไม่สำเร็จ: ${e.message}`), name: `ERROR_${baseName(f.name)}.txt` }); }
      bar.style.width = ((i + 1) / files.length * 100) + "%";
    }
    showResults(); $("#go", ui).disabled = false;
    setStatus(st, fails ? `เสร็จแล้ว แต่ ${fails} ไฟล์แปลงไม่สำเร็จ (ดูไฟล์ ERROR ในรายการ)` : `เสร็จแล้ว ✓ ได้ ${results.length} ไฟล์`, !!fails);
    if (results.length === 1 && !fails) download(results[0].blob, results[0].name);
  };
  $("#bundle", ui).onclick = async () => { setStatus(st, "กำลังบีบอัด…"); download(await zipBlob(files.map(f => ({ blob: f, name: f.name }))), "files.zip"); setStatus(st, `บีบอัด ${files.length} ไฟล์เป็น ZIP แล้ว ✓`); };
  $("#saveAll", ui).onclick = async () => { for (const r of results) { download(r.blob, r.name); await new Promise(r => setTimeout(r, 350)); } };
  $("#saveZip", ui).onclick = async () => download(await zipBlob(results), "converted.zip");
}

tool({
  id: "convert-any", cat: "convert", icon: I.convert, name: "แปลงไฟล์อัตโนมัติ (ทุกนามสกุล)",
  desc: "ลากไฟล์อะไรก็ได้มาวาง ระบบตรวจชนิดไฟล์และเสนอนามสกุลที่แปลงได้ทั้งหมด รูป เสียง วิดีโอ PDF Excel Word JSON ทำทีละหลายไฟล์ได้",
  keywords: "convert file แปลงไฟล์ นามสกุล extension jpg png webp heic pdf mp3 wav gif xlsx csv docx json yaml zip ico svg",
  render: (body) => converterUI(body),
});

// Shortcut tools: the same converter, filtered to one file family with the most likely target first.
const shortcut = (def) => tool({ ...def, render: (body) => converterUI(body, def.ui) });
shortcut({ id: "heic-jpg", cat: "convert", also: ["image"], icon: I.image, name: "HEIC → JPG (รูปจาก iPhone)", desc: "แปลงรูป HEIC/HEIF ที่ถ่ายจาก iPhone เป็น JPG หรือ PNG เพื่อส่งต่อหรืออัปโหลดเว็บที่ไม่รองรับ", keywords: "heic heif iphone jpg แปลงรูป iphone", ui: { accept: ".heic,.heif,image/heic,image/heif", prefer: ["jpg"], title: "เลือกรูป HEIC จาก iPhone" } });
shortcut({ id: "excel-convert", cat: "convert", also: ["docs"], icon: I.table, name: "แปลง Excel / CSV / JSON", desc: "แปลงไฟล์ xlsx, xls, ods, csv เป็น Excel, CSV (ภาษาไทยไม่เพี้ยน), JSON หรือ HTML และแปลง JSON กลับเป็น Excel", keywords: "excel xlsx xls ods csv json html แปลง excel ตาราง", ui: { accept: ".xlsx,.xls,.xlsm,.ods,.csv,.tsv,.json", prefer: ["csv", "xlsx"], title: "เลือกไฟล์ Excel / CSV / JSON" } });
shortcut({ id: "word-convert", cat: "convert", also: ["docs"], icon: I.pdf, name: "Word → HTML / ข้อความ", desc: "แปลงไฟล์ .docx เป็นหน้าเว็บ HTML (เปิดแล้วพิมพ์เป็น PDF ได้) หรือดึงเฉพาะข้อความ", keywords: "word docx html txt pdf แปลง word", ui: { accept: ".docx", prefer: ["html"], title: "เลือกไฟล์ Word (.docx)" } });
shortcut({ id: "pdf-text", cat: "convert", also: ["docs"], icon: I.text, name: "ดึงข้อความจาก PDF", desc: "คัดข้อความทั้งหมดใน PDF ออกมาเป็นไฟล์ .txt แยกตามหน้า (ใช้ได้กับ PDF ที่มีข้อความ ไม่ใช่ภาพสแกน)", keywords: "pdf text extract ดึงข้อความ คัดลอก pdf txt", ui: { accept: "application/pdf", prefer: ["txt"], title: "เลือกไฟล์ PDF" } });
shortcut({ id: "svg-png", cat: "convert", also: ["image"], icon: I.image, name: "SVG → PNG / JPG", desc: "แปลงไฟล์เวกเตอร์ SVG เป็นรูปภาพที่ความกว้างตามต้องการ หรือทำเป็นไอคอน .ico", keywords: "svg png jpg vector เวกเตอร์ ico", ui: { accept: ".svg,image/svg+xml", prefer: ["png"], title: "เลือกไฟล์ SVG" } });
shortcut({ id: "img-ico", cat: "convert", also: ["image"], icon: I.grid, name: "รูป → ICO (Favicon)", desc: "สร้างไฟล์ favicon.ico ที่มีครบ 16, 32, 48 และ 256 px จากรูป PNG/JPG/SVG", keywords: "ico favicon icon ไอคอนเว็บ", ui: { accept: "image/*,.svg", prefer: ["ico"], title: "เลือกรูปสำหรับทำ favicon" } });
shortcut({ id: "data-convert", cat: "convert", also: ["dev"], icon: I.code, name: "JSON ⇄ YAML / CSV / Markdown → HTML", desc: "แปลงไฟล์ข้อมูลและเอกสารสำหรับนักพัฒนา: JSON เป็น YAML/CSV/Excel, YAML เป็น JSON, Markdown เป็น HTML", keywords: "json yaml yml csv markdown md html", ui: { accept: ".json,.yaml,.yml,.md,.markdown", prefer: ["yaml", "json", "html"], title: "เลือกไฟล์ JSON / YAML / Markdown" } });

tool({
  id: "gif-maker", cat: "convert", also: ["creator", "image"], icon: I.film, name: "ทำ GIF จากวิดีโอหรือรูป",
  desc: "ตัดช่วงวิดีโอเป็น GIF หรือเรียงรูปหลายรูปเป็นภาพเคลื่อนไหว ปรับเฟรมเรต ขนาด และความเร็วได้",
  keywords: "gif animated video to gif ภาพเคลื่อนไหว มีม meme",
  render(body) {
    let video, images = [], url;
    const ui = h(`<div><div class="tabs"><button class="chip active" data-m="v">จากวิดีโอ</button><button class="chip" data-m="i">จากรูปหลายรูป</button></div>
      <div id="mv"><label class="btn btn-ghost">🎬 เลือกวิดีโอ<input type="file" accept="video/*" id="fv" hidden></label><video id="pv" class="media" controls playsinline muted hidden></video>
        <div class="row"><div class="field"><label>เริ่มที่ (วินาที)</label><input class="input" type="number" id="s" value="0" min="0" step="0.1"></div><div class="field"><label>ความยาว (≤ 15 วินาที)</label><input class="input" type="number" id="d" value="3" min="0.5" max="15" step="0.5"></div></div>
        <div class="actions"><button class="btn btn-ghost btn-sm" id="setS">ใช้ตำแหน่งที่กำลังเล่นเป็นจุดเริ่ม</button></div></div>
      <div id="mi" hidden><label class="btn btn-ghost">🖼 เลือกรูป<input type="file" accept="image/*" multiple id="fi" hidden></label><div class="status" id="ic"></div>
        <div class="row"><div class="field"><label>แสดงรูปละ (วินาที)</label><input class="input" type="number" id="per" value="0.5" min="0.05" step="0.05"></div></div></div>
      <div class="row"><div class="field"><label>ความกว้าง (px)</label><input class="input" type="number" id="w" value="480" min="120" max="1080"></div><div class="field"><label>เฟรม/วินาที (วิดีโอ)</label><input class="input" type="number" id="fps" value="12" min="2" max="24"></div></div>
      <div class="actions"><button class="btn btn-gold" id="go">สร้าง GIF</button></div><div class="progress"><div id="bar"></div></div><div class="status" id="st"></div>
      <div class="canvas-wrap" id="out" hidden><img id="res" alt="GIF ที่สร้าง"></div><div class="actions" id="act" hidden><button class="btn btn-gold" id="save">บันทึก GIF</button></div></div>`);
    body.append(ui);
    let mode = "v", blob;
    $$(".tabs .chip", ui).forEach(b => b.onclick = () => { mode = b.dataset.m; $$(".tabs .chip", ui).forEach(x => x.classList.toggle("active", x === b)); $("#mv", ui).hidden = mode !== "v"; $("#mi", ui).hidden = mode !== "i"; });
    $("#fv", ui).onchange = e => { video = e.target.files[0]; if (!video) return; if (url) URL.revokeObjectURL(url); const pv = $("#pv", ui); pv.src = url = URL.createObjectURL(video); pv.hidden = false; };
    $("#setS", ui).onclick = () => $("#s", ui).value = $("#pv", ui).currentTime.toFixed(1);
    $("#fi", ui).onchange = async e => { images = await Promise.all([...e.target.files].map(loadImage)); setStatus($("#ic", ui), `${images.length} รูป`); };
    $("#go", ui).onclick = async () => {
      const st = $("#st", ui), bar = $("#bar", ui), w = Math.max(120, Math.min(1080, num($("#w", ui).value) || 480));
      try {
        let frames, delay;
        if (mode === "v") {
          if (!video) return setStatus(st, "เลือกวิดีโอก่อน", true);
          const fps = Math.max(2, Math.min(24, num($("#fps", ui).value) || 12));
          setStatus(st, "กำลังดึงเฟรม…");
          frames = await videoFrames(video, { start: num($("#s", ui).value), dur: Math.min(15, num($("#d", ui).value) || 3), fps, width: w }, p => bar.style.width = p * 100 + "%");
          delay = Math.round(1000 / fps);
        } else {
          if (images.length < 2) return setStatus(st, "เลือกรูปอย่างน้อย 2 รูป", true);
          const hh = Math.round(w * images[0].naturalHeight / images[0].naturalWidth);
          frames = images.map(im => { const c = document.createElement("canvas"); c.width = w; c.height = hh; const x = c.getContext("2d", { willReadFrequently: true }); x.fillStyle = "#fff"; x.fillRect(0, 0, w, hh); const s = Math.min(w / im.naturalWidth, hh / im.naturalHeight); x.drawImage(im, (w - im.naturalWidth * s) / 2, (hh - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s); return c; });
          delay = Math.round(num($("#per", ui).value) * 1000) || 500;
        }
        setStatus(st, `กำลังเข้ารหัส GIF ${frames.length} เฟรม…`); bar.style.width = "60%";
        blob = await gifFromFrames(frames, delay); bar.style.width = "100%";
        $("#res", ui).src = URL.createObjectURL(blob); $("#out", ui).hidden = $("#act", ui).hidden = false;
        setStatus(st, `เสร็จแล้ว ✓ ${frames.length} เฟรม · ${fmtSize(blob.size)}`);
      } catch (e) { setStatus(st, e.message, true); }
    };
    $("#save", ui).onclick = () => blob && download(blob, "animation.gif");
    return () => { if (url) URL.revokeObjectURL(url); };
  },
});

tool({
  id: "zip-tool", cat: "convert", also: ["docs"], icon: I.pages, name: "บีบอัด / แตกไฟล์ ZIP",
  desc: "รวมหลายไฟล์เป็น ZIP ไฟล์เดียวเพื่อส่งต่อง่าย หรือเปิดไฟล์ ZIP แล้วเลือกบันทึกไฟล์ข้างในทีละไฟล์",
  keywords: "zip unzip บีบอัด แตกไฟล์ รวมไฟล์ archive",
  render(body) {
    const ui = h(`<div><div class="tabs"><button class="chip active" data-m="z">บีบอัดเป็น ZIP</button><button class="chip" data-m="u">แตกไฟล์ ZIP</button></div><div id="slot"></div></div>`);
    body.append(ui);
    const show = (m) => {
      const slot = $("#slot", ui); slot.innerHTML = "";
      if (m === "z") {
        let files = [];
        const box = h(`<div><div class="out" id="l"></div><div class="row"><div class="field"><label>ชื่อไฟล์ ZIP</label><input class="input" id="zn" value="files"></div></div><div class="actions"><button class="btn btn-gold" id="go" disabled>สร้าง ZIP</button></div><div class="status" id="st"></div></div>`);
        slot.append(dropZone({ accept: "*/*", multiple: true, title: "เลือกไฟล์ที่จะรวม", hint: "เพิ่มได้เรื่อย ๆ" }, f => { files.push(...f); $("#l", box).innerHTML = files.map(x => `<div class="file-item"><div class="meta"><b>${esc(x.name)}</b><small>${fmtSize(x.size)}</small></div></div>`).join(""); $("#go", box).disabled = false; }), box);
        $("#go", box).onclick = async () => { const b = await zipBlob(files.map(f => ({ blob: f, name: f.name }))); download(b, ($("#zn", box).value || "files") + ".zip"); setStatus($("#st", box), `${files.length} ไฟล์ → ${fmtSize(b.size)} (จาก ${fmtSize(files.reduce((s, f) => s + f.size, 0))})`); };
      } else {
        const box = h(`<div><div class="status" id="st"></div><div class="out" id="l"></div></div>`);
        slot.append(dropZone({ accept: ".zip,application/zip", title: "เลือกไฟล์ ZIP", hint: "ดูรายการไฟล์ข้างในแล้วเลือกบันทึก" }, async ([f]) => {
          try {
            await loadScript(LIB.jszip);
            const z = await JSZip.loadAsync(f), entries = Object.values(z.files).filter(e => !e.dir);
            setStatus($("#st", box), `${entries.length} ไฟล์ใน ${f.name}`);
            $("#l", box).innerHTML = entries.map((e, i) => `<div class="file-item"><div class="meta"><b>${esc(e.name)}</b></div><button class="btn btn-ghost btn-sm" data-i="${i}">บันทึก</button></div>`).join("");
            $("#l", box).onclick = async ev => { const b = ev.target.closest("[data-i]"); if (b) { const e = entries[+b.dataset.i]; download(await e.async("blob"), e.name.split("/").pop()); } };
          } catch (e) { setStatus($("#st", box), "เปิด ZIP ไม่ได้: " + e.message, true); }
        }), box);
      }
    };
    $$(".tabs .chip", ui).forEach(b => b.onclick = () => { $$(".tabs .chip", ui).forEach(x => x.classList.toggle("active", x === b)); show(b.dataset.m); });
    show("z");
  },
});

tool({
  id: "thai-encoding", cat: "convert", also: ["text"], icon: I.text, name: "แก้ภาษาไทยเพี้ยน (TIS-620 → UTF-8)",
  desc: "เปิดไฟล์ข้อความ/CSV จากระบบเก่าที่ภาษาไทยเป็นภาษาต่างดาว แล้วแปลงเป็น UTF-8 ที่ Excel และมือถืออ่านได้",
  keywords: "encoding tis-620 windows-874 utf-8 ภาษาไทยเพี้ยน ภาษาต่างดาว csv อ่านไม่ออก",
  render(body) {
    let buf, file;
    const ui = h(`<div hidden><div class="row"><div class="field"><label>การเข้ารหัสต้นฉบับ</label><select class="input" id="enc"><option value="windows-874">Thai (TIS-620 / Windows-874)</option><option value="utf-8">UTF-8</option><option value="utf-16le">UTF-16</option><option value="iso-8859-11">ISO-8859-11</option></select></div><div class="field" style="flex:0 0 auto"><label class="check"><input type="checkbox" id="bom" checked> ใส่ BOM (ให้ Excel อ่านไทยถูก)</label></div></div>
      <div class="status" id="st"></div><textarea class="input" id="pv" readonly style="margin-top:10px"></textarea>
      <div class="actions"><button class="btn btn-gold" id="save">บันทึกเป็น UTF-8</button><button class="btn btn-ghost" id="cp">คัดลอกข้อความ</button></div></div>`);
    body.append(dropZone({ accept: ".txt,.csv,.tsv,.srt,.html,.xml,text/*", title: "เลือกไฟล์ที่ภาษาไทยเพี้ยน", hint: "TXT · CSV · SRT · HTML" }, async ([f]) => {
      file = f; buf = await f.arrayBuffer(); ui.hidden = false;
      // Guess: valid UTF-8 → keep, otherwise assume Thai Windows-874.
      try { new TextDecoder("utf-8", { fatal: true }).decode(buf); $("#enc", ui).value = "utf-8"; } catch { $("#enc", ui).value = "windows-874"; }
      run();
    }), ui);
    const run = () => {
      const txt = new TextDecoder($("#enc", ui).value).decode(buf);
      $("#pv", ui).value = txt.slice(0, 5000);
      const thai = (txt.match(/[฀-๿]/g) || []).length;
      setStatus($("#st", ui), `${file.name} · พบอักษรไทย ${thai.toLocaleString()} ตัว${thai ? "" : " — ถ้ายังอ่านไม่ออก ลองเปลี่ยนการเข้ารหัส"}`);
    };
    $("#enc", ui).onchange = run;
    $("#save", ui).onclick = () => { const txt = new TextDecoder($("#enc", ui).value).decode(buf); download(new Blob([($("#bom", ui).checked ? "﻿" : "") + txt], { type: "text/plain;charset=utf-8" }), baseName(file.name) + "_utf8." + (extOf(file.name) || "txt")); };
    $("#cp", ui).onclick = () => copy(new TextDecoder($("#enc", ui).value).decode(buf));
  },
});
