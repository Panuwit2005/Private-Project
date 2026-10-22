// Creator tools: teleprompter, script timing, subtitles, thumbnail maker, platform sizes,
// hashtag sets and a content planner. Scripts, hashtag sets and plans persist in localStorage.

const wordCount = (text) => {
  const seg = window.Intl?.Segmenter ? new Intl.Segmenter("th", { granularity: "word" }) : null;
  return seg ? [...seg.segment(text)].filter(s => s.isWordLike).length : (text.trim().match(/\S+/g) || []).length;
};
const mmss = (s) => `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}`;

tool({
  id: "teleprompter", cat: "creator", icon: I.scroll, name: "เทเลพรอมป์เตอร์",
  desc: "ให้สคริปต์เลื่อนอัตโนมัติขณะอัดคลิป ปรับความเร็ว ขนาดตัวอักษร กลับด้านกระจก และเต็มจอได้",
  keywords: "teleprompter prompter สคริปต์ อ่านบท อัดคลิป พูดหน้ากล้อง",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" style="font-family:var(--font-body);font-size:1rem;min-height:120px" placeholder="วางสคริปต์ที่นี่…"></textarea>
      <div class="row"><div class="field"><label>ความเร็ว: <span id="sv">3</span></label><input type="range" id="sp" min="1" max="10" value="3"></div>
      <div class="field"><label>ขนาดตัวอักษร: <span id="fv">42</span>px</label><input type="range" id="fs" min="24" max="96" value="42"></div></div>
      <div class="actions"><button class="btn btn-gold" id="play">▶ เริ่ม</button><button class="btn btn-ghost" id="rs">⟲ เริ่มใหม่</button><button class="btn btn-ghost" id="fsBtn">⛶ เต็มจอ</button><label class="check"><input type="checkbox" id="mir"> กลับด้านกระจก</label></div>
      <div class="prompter" id="pr"><div class="prompter-line"></div><div class="prompter-text" id="pt"></div></div>
      <p class="hint">แตะที่จอเพื่อหยุด/เล่น · คีย์บอร์ด: Space = หยุด/เล่น, ↑↓ = ปรับความเร็ว · หน้าจอจะไม่ดับระหว่างเลื่อน (ถ้าเครื่องรองรับ)</p></div>`);
    body.append(ui);
    const t = $("#t", ui), pt = $("#pt", ui), pr = $("#pr", ui);
    t.value = store.get("prompter", "สวัสดีครับ วันนี้เราจะมาแนะนำเครื่องมือที่ช่วยให้ทำคลิปได้ง่ายขึ้น\n\nเริ่มจากเขียนสคริปต์ แล้วให้เทเลพรอมป์เตอร์เลื่อนข้อความให้เราอ่านไปพร้อมกับอัดวิดีโอ\n\nปรับความเร็วให้พอดีกับจังหวะการพูดของคุณ");
    let y = 0, raf, last, playing = false, lock;
    const sync = () => { pt.textContent = t.value; store.set("prompter", t.value); };
    const place = () => { pt.style.transform = `translateY(${-y}px)${$("#mir", ui).checked ? " scaleX(-1)" : ""}`; };
    const step = (now) => {
      const dt = last ? (now - last) / 1000 : 0; last = now;
      y += dt * $("#sp", ui).value * 18;
      if (y > pt.offsetHeight + pr.offsetHeight) { stop(); }
      place(); if (playing) raf = requestAnimationFrame(step);
    };
    const start = async () => { playing = true; last = 0; $("#play", ui).textContent = "❚❚ หยุด"; raf = requestAnimationFrame(step); try { lock = await navigator.wakeLock?.request("screen"); } catch {} };
    const stop = () => { playing = false; cancelAnimationFrame(raf); $("#play", ui).textContent = "▶ เล่นต่อ"; lock?.release?.().catch(() => {}); lock = null; };
    $("#play", ui).onclick = () => playing ? stop() : start();
    pr.onclick = () => playing ? stop() : start();
    $("#rs", ui).onclick = () => { stop(); y = 0; place(); $("#play", ui).textContent = "▶ เริ่ม"; };
    $("#sp", ui).oninput = e => $("#sv", ui).textContent = e.target.value;
    $("#fs", ui).oninput = e => { $("#fv", ui).textContent = e.target.value; pr.style.setProperty("--prompter-size", e.target.value + "px"); };
    $("#mir", ui).onchange = place;
    $("#fsBtn", ui).onclick = () => (pr.requestFullscreen || pr.webkitRequestFullscreen)?.call(pr);
    t.oninput = sync;
    const onKey = e => {
      if (e.target.closest("textarea, input")) return;
      if (e.code === "Space") { e.preventDefault(); playing ? stop() : start(); }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); const s = $("#sp", ui); s.value = +s.value + (e.key === "ArrowUp" ? 1 : -1); s.oninput({ target: s }); }
    };
    addEventListener("keydown", onKey);
    sync(); place();
    return () => { stop(); removeEventListener("keydown", onKey); };
  },
});

tool({
  id: "script-timer", cat: "creator", icon: I.timer, name: "คำนวณความยาวสคริปต์",
  desc: "นับคำแล้วประเมินว่าสคริปต์พูดได้กี่วินาที เทียบกับความยาวคลิปสั้น 15 / 30 / 60 / 90 วินาที",
  keywords: "script duration word per minute ความยาวคลิป พูดกี่นาที tiktok reels shorts",
  render(body) {
    const ui = h(`<div><textarea class="input" id="t" style="font-family:var(--font-body);font-size:1rem" placeholder="วางสคริปต์ที่นี่…"></textarea>
      <div class="row"><div class="field"><label>ความเร็วการพูด: <span id="wv">160</span> คำ/นาที</label><input type="range" id="wpm" min="90" max="240" step="5" value="160"></div></div>
      <p class="hint">พูดช้า ๆ ชัด ๆ ≈ 120 · พูดปกติ ≈ 150–170 · พูดเร็วแบบคลิปสั้น ≈ 190+ — จับเวลาตัวเองอ่านจริง 1 นาทีแล้วปรับให้ตรง</p>
      <div class="stat-grid" id="st"></div><div class="bars" id="fit"></div></div>`);
    body.append(ui);
    const t = $("#t", ui); t.value = store.get("prompter", "");
    const run = () => {
      const w = wordCount(t.value), wpm = +$("#wpm", ui).value, sec = w / wpm * 60;
      $("#wv", ui).textContent = wpm;
      $("#st", ui).innerHTML = [["จำนวนคำ", w.toLocaleString()], ["ความยาวโดยประมาณ", mmss(sec)], ["ตัวอักษร", [...t.value.replace(/\s/g, "")].length.toLocaleString()], ["ย่อหน้า", t.value.split(/\n\s*\n/).filter(s => s.trim()).length]]
        .map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join("");
      $("#fit", ui).innerHTML = [15, 30, 60, 90, 180].map(lim => {
        const pct = Math.min(100, sec / lim * 100), over = sec > lim;
        return `<div class="bar-row"><span>${lim < 60 ? lim + " วินาที" : lim / 60 + " นาที"}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;${over ? "background:var(--color-danger)" : ""}"></div></div><b>${over ? "เกิน " + mmss(sec - lim) : "เหลือ " + mmss(lim - sec)}</b></div>`;
      }).join("");
    };
    t.oninput = run; $("#wpm", ui).oninput = run; run();
  },
});

// ---------- Subtitles ----------
const toSrtTime = (s, sep = ",") => { const ms = Math.max(0, Math.round(s * 1000)); return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}${sep}${pad(ms % 1000, 3)}`; };
const parseTime = (t) => { const m = t.trim().replace(",", ".").match(/(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)/); return m ? (+(m[1] || 0)) * 3600 + +m[2] * 60 + +m[3] : NaN; };
function parseSubs(text) {
  return text.replace(/\r/g, "").replace(/^WEBVTT.*\n/, "").split(/\n\s*\n/).map(b => {
    const lines = b.trim().split("\n"); const i = lines.findIndex(l => l.includes("-->"));
    if (i < 0) return null;
    const [a, z] = lines[i].split("-->");
    return { start: parseTime(a), end: parseTime(z.split(" ").filter(Boolean)[0]), text: lines.slice(i + 1).join("\n") };
  }).filter(c => c && !isNaN(c.start) && !isNaN(c.end));
}
const buildSrt = (cues) => cues.map((c, i) => `${i + 1}\n${toSrtTime(c.start)} --> ${toSrtTime(c.end)}\n${c.text}`).join("\n\n") + "\n";
const buildVtt = (cues) => "WEBVTT\n\n" + cues.map(c => `${toSrtTime(c.start, ".")} --> ${toSrtTime(c.end, ".")}\n${c.text}`).join("\n\n") + "\n";

tool({
  id: "subtitles", cat: "creator", icon: I.captions, name: "สร้าง & แก้ซับไตเติล",
  desc: "เปลี่ยนสคริปต์เป็นไฟล์ซับ SRT/VTT แบ่งเวลาอัตโนมัติ แปลง SRT ⇄ VTT และเลื่อนเวลาซับทั้งไฟล์",
  keywords: "subtitle srt vtt caption ซับไตเติล คำบรรยาย เลื่อนเวลา",
  render(body) {
    const ui = h(`<div><div class="tabs"><button class="chip active" data-m="make">สคริปต์ → ซับ</button><button class="chip" data-m="edit">แปลง / เลื่อนเวลา</button></div>
      <div id="make"><textarea class="input" id="src" style="font-family:var(--font-body)" placeholder="หนึ่งบรรทัด = ซับหนึ่งท่อน">สวัสดีครับทุกคน\nวันนี้มาลองทำซับไตเติลกัน\nแค่พิมพ์ทีละบรรทัด\nแล้วกดสร้างไฟล์ได้เลย</textarea>
        <div class="row"><div class="field"><label>เริ่มที่ (วินาที)</label><input class="input" type="number" id="st0" value="0" step="0.1"></div><div class="field"><label>ความยาวคลิปทั้งหมด (วินาที)</label><input class="input" type="number" id="dur" value="12" step="0.5"></div></div>
        <p class="hint">แบ่งเวลาตามความยาวของแต่ละบรรทัด (บรรทัดยาวได้เวลามากกว่า)</p></div>
      <div id="edit" hidden><textarea class="input" id="in" placeholder="วางเนื้อหาไฟล์ .srt หรือ .vtt"></textarea>
        <div class="actions"><label class="btn btn-ghost btn-sm">เปิดไฟล์ .srt / .vtt<input type="file" id="f" accept=".srt,.vtt,text/vtt" hidden></label></div>
        <div class="row"><div class="field"><label>เลื่อนเวลา (วินาที, ติดลบ = เร็วขึ้น)</label><input class="input" type="number" id="shift" value="0" step="0.1"></div></div></div>
      <div class="actions"><button class="btn btn-gold" id="go">สร้างผลลัพธ์</button></div><div class="status" id="msg"></div>
      <textarea class="input" id="out" readonly style="margin-top:12px" hidden></textarea>
      <div class="actions" id="dl" hidden><button class="btn btn-ghost btn-sm" data-f="srt">บันทึก .srt</button><button class="btn btn-ghost btn-sm" data-f="vtt">บันทึก .vtt</button><button class="btn btn-ghost btn-sm" id="cp">คัดลอก</button></div></div>`);
    body.append(ui);
    let mode = "make", cues = [];
    $$(".tabs .chip", ui).forEach(b => b.onclick = () => { mode = b.dataset.m; $$(".tabs .chip", ui).forEach(x => x.classList.toggle("active", x === b)); $("#make", ui).hidden = mode !== "make"; $("#edit", ui).hidden = mode !== "edit"; });
    $("#f", ui).onchange = async e => { const f = e.target.files[0]; if (f) $("#in", ui).value = await f.text(); };
    $("#go", ui).onclick = () => {
      const msg = $("#msg", ui);
      if (mode === "make") {
        const lines = $("#src", ui).value.split("\n").map(s => s.trim()).filter(Boolean), t0 = num($("#st0", ui).value), dur = num($("#dur", ui).value);
        if (!lines.length || dur <= 0) return setStatus(msg, "ใส่ข้อความและความยาวคลิป", true);
        const weight = lines.map(l => Math.max(4, [...l].length)), total = weight.reduce((a, b) => a + b, 0);
        let t = t0; cues = lines.map((l, i) => { const d = dur * weight[i] / total; const c = { start: t, end: t + d - 0.05, text: l }; t += d; return c; });
      } else {
        cues = parseSubs($("#in", ui).value);
        if (!cues.length) return setStatus(msg, "อ่านซับไม่ได้ — ตรวจสอบรูปแบบไฟล์", true);
        const sh = num($("#shift", ui).value); cues = cues.map(c => ({ ...c, start: Math.max(0, c.start + sh), end: Math.max(0, c.end + sh) }));
      }
      $("#out", ui).value = buildSrt(cues); $("#out", ui).hidden = false; $("#dl", ui).hidden = false;
      setStatus(msg, `${cues.length} ท่อน · ยาว ${mmss(cues.at(-1).end)}`);
    };
    $$("[data-f]", ui).forEach(b => b.onclick = () => {
      const vtt = b.dataset.f === "vtt";
      download(new Blob([vtt ? buildVtt(cues) : buildSrt(cues)], { type: vtt ? "text/vtt" : "application/x-subrip" }), "subtitles." + b.dataset.f);
    });
    $("#cp", ui).onclick = () => copy($("#out", ui).value);
  },
});

tool({
  id: "thumbnail", cat: "creator", also: ["image"], icon: I.thumb, name: "ทำภาพปกคลิป",
  desc: "ทำภาพปก YouTube / TikTok / Reels ด้วยรูปพื้นหลัง ข้อความตัวใหญ่ขอบหนา และแถบไฮไลต์ บันทึกเป็น PNG/JPG",
  keywords: "thumbnail cover ภาพปก ปกคลิป youtube tiktok reels",
  render(body) {
    let bg;
    const ui = h(`<div><div class="tabs" id="sz"><button class="chip active" data-w="1280" data-h="720">YouTube 16:9</button><button class="chip" data-w="1080" data-h="1920">TikTok / Reels 9:16</button><button class="chip" data-w="1080" data-h="1080">สี่เหลี่ยม 1:1</button><button class="chip" data-w="1080" data-h="1350">IG 4:5</button></div>
      <div class="actions"><label class="btn btn-ghost btn-sm">🖼 รูปพื้นหลัง<input type="file" accept="image/*" id="f" hidden></label></div>
      <div class="row"><div class="field"><label>ข้อความหลัก</label><input class="input" id="t1" value="เครื่องมือฟรี 80 อย่าง!"></div><div class="field"><label>ข้อความรอง (แถบไฮไลต์)</label><input class="input" id="t2" value="ไม่ต้องลงแอป"></div></div>
      <div class="row"><div class="field"><label>ขนาดตัวอักษร</label><input type="range" id="fs" min="6" max="18" value="11"></div><div class="field"><label>ตำแหน่ง</label><select class="input" id="pos"><option value="bl">ซ้ายล่าง</option><option value="c">กึ่งกลาง</option><option value="tl">ซ้ายบน</option></select></div>
      <div class="field" style="flex:0 0 80px"><label>สีตัวอักษร</label><input type="color" id="c1" value="#ffffff"></div><div class="field" style="flex:0 0 80px"><label>สีแถบ</label><input type="color" id="c2" value="#d8b46a"></div><div class="field" style="flex:0 0 120px"><label>มืดลง</label><input type="range" id="dk" min="0" max="80" value="45"></div></div>
      <div class="canvas-wrap"><canvas id="cv"></canvas></div>
      <div class="actions"><button class="btn btn-gold" data-f="png">บันทึก PNG</button><button class="btn btn-ghost" data-f="jpeg">บันทึก JPG</button></div></div>`);
    body.append(ui);
    let W = 1280, H = 720;
    const cv = $("#cv", ui), ctx = cv.getContext("2d");
    // Greedy line wrap: Thai has no spaces, so break on Intl.Segmenter word boundaries.
    const wrap = (text, maxW) => {
      const seg = window.Intl?.Segmenter ? [...new Intl.Segmenter("th", { granularity: "word" }).segment(text)].map(s => s.segment) : text.split(/(\s+)/);
      const lines = []; let cur = "";
      for (const w of seg) { if (ctx.measureText(cur + w).width > maxW && cur.trim()) { lines.push(cur.trim()); cur = w.trimStart(); } else cur += w; }
      if (cur.trim()) lines.push(cur.trim()); return lines;
    };
    const draw = () => {
      cv.width = W; cv.height = H;
      if (bg) { const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight); ctx.drawImage(bg, (W - bg.naturalWidth * s) / 2, (H - bg.naturalHeight * s) / 2, bg.naturalWidth * s, bg.naturalHeight * s); }
      else { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#2a2214"); g.addColorStop(1, "#0c0a09"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      const shade = ctx.createLinearGradient(0, 0, 0, H); const k = $("#dk", ui).value / 100;
      shade.addColorStop(0, `rgba(0,0,0,${k * .4})`); shade.addColorStop(1, `rgba(0,0,0,${k})`); ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
      const fs = Math.min(W, H) * $("#fs", ui).value / 100, pad = Math.min(W, H) * .07, pos = $("#pos", ui).value;
      ctx.font = `700 ${fs}px "IBM Plex Sans Thai", sans-serif`; ctx.textBaseline = "top";
      const lines = wrap($("#t1", ui).value, W - pad * 2), lh = fs * 1.18;
      const t2 = $("#t2", ui).value, f2 = fs * .5;
      const blockH = lines.length * lh + (t2 ? f2 * 1.9 + fs * .25 : 0);
      let y = pos === "tl" ? pad : pos === "c" ? (H - blockH) / 2 : H - pad - blockH;
      const align = pos === "c" ? "center" : "left", x = pos === "c" ? W / 2 : pad;
      ctx.textAlign = align;
      if (t2) {
        ctx.font = `700 ${f2}px "IBM Plex Sans Thai", sans-serif`;
        const tw = ctx.measureText(t2).width + f2 * 1.2, bx = align === "center" ? x - tw / 2 : x;
        ctx.fillStyle = $("#c2", ui).value; ctx.beginPath(); ctx.roundRect?.(bx, y, tw, f2 * 1.6, f2 * .3); if (!ctx.roundRect) ctx.rect(bx, y, tw, f2 * 1.6); ctx.fill();
        ctx.fillStyle = "#111"; ctx.fillText(t2, align === "center" ? x : x + f2 * .6, y + f2 * .25);
        y += f2 * 1.9 + fs * .25;
      }
      ctx.font = `700 ${fs}px "IBM Plex Sans Thai", sans-serif`; ctx.lineJoin = "round"; ctx.lineWidth = fs * .16; ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.fillStyle = $("#c1", ui).value;
      for (const l of lines) { ctx.strokeText(l, x, y); ctx.fillText(l, x, y); y += lh; }
    };
    $("#sz", ui).onclick = e => { const b = e.target.closest("[data-w]"); if (!b) return; W = +b.dataset.w; H = +b.dataset.h; $$("#sz .chip", ui).forEach(x => x.classList.toggle("active", x === b)); draw(); };
    $("#f", ui).onchange = async e => { const f = e.target.files[0]; if (f) { bg = await loadImage(f); draw(); } };
    $$("input:not([type=file]), select", ui).forEach(i => i.oninput = draw);
    $$("[data-f]", ui).forEach(b => b.onclick = async () => download(await canvasBlob(cv, "image/" + b.dataset.f, .92), `thumbnail-${W}x${H}.${b.dataset.f === "jpeg" ? "jpg" : "png"}`));
    document.fonts?.ready.then(draw); draw();
  },
});

tool({
  id: "platform-sizes", cat: "creator", icon: I.ratio, name: "ขนาดวิดีโอ & ภาพแต่ละแพลตฟอร์ม",
  desc: "สรุปสัดส่วนและความละเอียดที่แนะนำ พร้อมคำนวณขนาดครอปจากวิดีโอต้นฉบับให้ตรงสัดส่วน",
  keywords: "aspect ratio resolution 9:16 16:9 youtube tiktok instagram facebook ขนาด สัดส่วน",
  render(body) {
    const P = [["YouTube (วิดีโอยาว)", "16:9", "1920×1080 / 3840×2160"], ["YouTube ภาพปก", "16:9", "1280×720"], ["YouTube Shorts", "9:16", "1080×1920"], ["TikTok", "9:16", "1080×1920"], ["Instagram Reels / Stories", "9:16", "1080×1920"], ["Instagram โพสต์", "4:5 / 1:1", "1080×1350 / 1080×1080"], ["Facebook วิดีโอฟีด", "4:5 / 1:1", "1080×1350 / 1080×1080"], ["X (Twitter) วิดีโอ", "16:9", "1280×720 / 1920×1080"]];
    const ui = h(`<div><div class="table-wrap"><table class="data-table"><thead><tr><th>แพลตฟอร์ม</th><th>สัดส่วน</th><th>ความละเอียดแนะนำ</th></tr></thead><tbody>${P.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div>
      <p class="hint">ความยาวสูงสุดและขนาดไฟล์ที่อัปโหลดได้เปลี่ยนบ่อย ตรวจสอบในแอปของแต่ละแพลตฟอร์มอีกครั้ง · สำหรับ 9:16 เว้นขอบบน-ล่างไว้ราว 15% เพราะปุ่มและคำบรรยายของแอปจะบังพื้นที่</p>
      <h3 style="margin-top:22px;font-size:1.05rem">คำนวณขนาดครอป</h3>
      <div class="row"><div class="field"><label>วิดีโอต้นฉบับ กว้าง</label><input class="input" type="number" id="w" value="1920"></div><div class="field"><label>สูง</label><input class="input" type="number" id="hh" value="1080"></div>
      <div class="field"><label>สัดส่วนเป้าหมาย</label><select class="input" id="r"><option value="9:16">9:16</option><option value="1:1">1:1</option><option value="4:5">4:5</option><option value="16:9">16:9</option><option value="4:3">4:3</option></select></div></div>
      <div class="result" id="out"></div></div>`);
    body.append(ui);
    const run = () => {
      const w = num($("#w", ui).value), hh = num($("#hh", ui).value), [a, b] = $("#r", ui).value.split(":").map(Number);
      if (!w || !hh) return;
      let cw = w, ch = Math.round(w * b / a); if (ch > hh) { ch = hh; cw = Math.round(hh * a / b); }
      cw -= cw % 2; ch -= ch % 2;
      $("#out", ui).innerHTML = `ครอปได้ <b>${cw} × ${ch}</b> px (เก็บภาพไว้ ${Math.round(cw * ch / (w * hh) * 100)}% ของต้นฉบับ)<br><small style="color:var(--color-text-muted)">ตัดซ้าย-ขวาข้างละ ${(w - cw) / 2} px · บน-ล่างข้างละ ${(hh - ch) / 2} px</small>`;
    };
    $$("input, select", ui).forEach(i => i.oninput = run); run();
  },
});

tool({
  id: "hashtags", cat: "creator", icon: I.hashtag, name: "คลังแฮชแท็ก",
  desc: "เก็บชุดแฮชแท็กที่ใช้บ่อยแยกตามหัวข้อ ลบตัวซ้ำ นับจำนวน และคัดลอกไปวางในแคปชันได้ในแตะเดียว",
  keywords: "hashtag แฮชแท็ก caption แคปชัน tiktok instagram",
  render(body) {
    let sets = store.get("hashtags", [{ name: "ทั่วไป", tags: "#fyp #ฟีดดดシ #เทรนด์วันนี้" }]);
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="field"><label>ชื่อชุด</label><input class="input" id="n" placeholder="เช่น รีวิวอาหาร"></div></div>
      <textarea class="input" id="t" style="font-family:var(--font-body);min-height:90px;margin-top:10px" placeholder="พิมพ์แฮชแท็ก คั่นด้วยเว้นวรรคหรือขึ้นบรรทัดใหม่ (ไม่ต้องใส่ # ก็ได้)"></textarea>
      <div class="actions"><button class="btn btn-gold btn-sm" id="save">บันทึกชุด</button><span class="hint" id="cnt" style="margin:0"></span></div>
      <div class="out" id="list"></div></div>`);
    body.append(ui);
    const norm = (s) => [...new Set(s.split(/[\s,]+/).map(x => x.trim()).filter(Boolean).map(x => "#" + x.replace(/^#+/, "")))];
    const draw = () => {
      $("#list", ui).innerHTML = sets.map((s, i) => `<div class="file-item" style="flex-wrap:wrap"><div class="meta"><b>${esc(s.name)} <small>(${norm(s.tags).length})</small></b><small style="white-space:normal">${esc(norm(s.tags).join(" "))}</small></div><button class="btn btn-gold btn-sm" data-cp="${i}">คัดลอก</button><button class="btn btn-ghost btn-sm" data-ed="${i}">แก้</button><button class="btn btn-ghost btn-sm" data-rm="${i}" aria-label="ลบ">✕</button></div>`).join("");
    };
    $("#t", ui).oninput = () => $("#cnt", ui).textContent = `${norm($("#t", ui).value).length} แท็ก (ลบตัวซ้ำแล้ว)`;
    $("#save", ui).onclick = () => {
      const name = $("#n", ui).value.trim() || "ชุดใหม่", tags = norm($("#t", ui).value).join(" ");
      if (!tags) return toast("ใส่แฮชแท็กก่อน");
      const i = sets.findIndex(s => s.name === name); if (i >= 0) sets[i].tags = tags; else sets.push({ name, tags });
      store.set("hashtags", sets); draw(); toast("บันทึกแล้ว");
    };
    $("#list", ui).onclick = e => {
      const cp = e.target.closest("[data-cp]"), ed = e.target.closest("[data-ed]"), rm = e.target.closest("[data-rm]");
      if (cp) copy(norm(sets[+cp.dataset.cp].tags).join(" "));
      if (ed) { const s = sets[+ed.dataset.ed]; $("#n", ui).value = s.name; $("#t", ui).value = norm(s.tags).join(" "); $("#t", ui).oninput(); }
      if (rm && confirm("ลบชุดนี้?")) { sets.splice(+rm.dataset.rm, 1); store.set("hashtags", sets); draw(); }
    };
    draw();
  },
});

tool({
  id: "content-plan", cat: "creator", icon: I.board, name: "แผนคอนเทนต์",
  desc: "บอร์ดวางแผนคลิป: ไอเดีย → เขียนสคริปต์ → ถ่าย/ตัดต่อ → ลงแล้ว พร้อมแพลตฟอร์มและวันลง",
  keywords: "content plan calendar kanban วางแผน คอนเทนต์ ไอเดีย คลิป",
  render(body) {
    const COLS = ["ไอเดีย", "เขียนสคริปต์", "ถ่าย / ตัดต่อ", "ลงแล้ว"];
    let items = store.get("content-plan", [{ id: 1, title: "รีวิวเครื่องมือฟรีบนเว็บ", plat: "TikTok", date: "", col: 0 }]);
    const ui = h(`<div><form class="row" id="f" style="margin-top:0"><div class="field" style="flex:2"><label>หัวข้อคลิป</label><input class="input" id="t" required></div>
      <div class="field"><label>แพลตฟอร์ม</label><select class="input" id="p"><option>TikTok</option><option>YouTube</option><option>Shorts</option><option>Reels</option><option>Facebook</option></select></div>
      <div class="field"><label>วันลง</label><input class="input" type="date" id="d"></div><button class="btn btn-gold">เพิ่ม</button></form>
      <div class="kanban" id="kb"></div>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="exp">ส่งออก CSV</button></div></div>`);
    body.append(ui);
    const save = () => { store.set("content-plan", items); draw(); };
    const draw = () => {
      $("#kb", ui).innerHTML = COLS.map((c, ci) => {
        const list = items.filter(x => x.col === ci).sort((a, b) => (a.date || "9") < (b.date || "9") ? -1 : 1);
        return `<div class="kanban-col"><h4>${c}<span class="chip-n">${list.length}</span></h4>${list.map(x => `<div class="kanban-card"><b>${esc(x.title)}</b><small>${esc(x.plat)}${x.date ? " · " + new Date(x.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : ""}</small>
          <div class="acts">${ci ? `<button data-mv="${x.id}" data-d="-1" aria-label="ย้ายย้อนกลับ">←</button>` : ""}${ci < 3 ? `<button data-mv="${x.id}" data-d="1" aria-label="ย้ายไปขั้นถัดไป">→</button>` : ""}<button data-rm="${x.id}" aria-label="ลบ">✕</button></div></div>`).join("")}</div>`;
      }).join("");
    };
    $("#f", ui).onsubmit = e => { e.preventDefault(); items.push({ id: Date.now(), title: $("#t", ui).value.trim(), plat: $("#p", ui).value, date: $("#d", ui).value, col: 0 }); $("#t", ui).value = ""; save(); };
    $("#kb", ui).onclick = e => {
      const mv = e.target.closest("[data-mv]"), rm = e.target.closest("[data-rm]");
      if (mv) { const x = items.find(i => i.id === +mv.dataset.mv); x.col = Math.max(0, Math.min(3, x.col + +mv.dataset.d)); save(); }
      if (rm && confirm("ลบรายการนี้?")) { items = items.filter(i => i.id !== +rm.dataset.rm); save(); }
    };
    $("#exp", ui).onclick = () => download(new Blob(["﻿หัวข้อ,แพลตฟอร์ม,วันลง,สถานะ\n" + items.map(x => [x.title, x.plat, x.date, COLS[x.col]].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" }), "content-plan.csv");
    draw();
  },
});
