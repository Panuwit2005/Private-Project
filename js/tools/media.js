// Audio & video tools: extract audio to MP3/WAV, trim audio, voice/screen recorder,
// frame capture, text-to-speech, speech-to-text, YouTube thumbnails.

function encodeWav(buf, from = 0, to = buf.length) {
  const ch = Math.min(buf.numberOfChannels, 2), len = to - from, rate = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); out.setUint32(4, 36 + len * ch * 2, true); str(8, "WAVEfmt ");
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, rate, true); out.setUint32(28, rate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
  str(36, "data"); out.setUint32(40, len * ch * 2, true);
  const chans = [...Array(ch)].map((_, i) => buf.getChannelData(i));
  for (let i = from, o = 44; i < to; i++) for (let c = 0; c < ch; c++, o += 2) {
    const s = Math.max(-1, Math.min(1, chans[c][i])); out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([out], { type: "audio/wav" });
}
async function encodeMp3(buf, kbps, onProgress, from = 0, to = buf.length) {
  await loadScript(LIB.lame);
  const ch = Math.min(buf.numberOfChannels, 2);
  const enc = new lamejs.Mp3Encoder(ch, buf.sampleRate, kbps);
  const toI16 = f => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); o[i] = s < 0 ? s * 0x8000 : s * 0x7fff; } return o; };
  const L = toI16(buf.getChannelData(0).subarray(from, to)), R = ch > 1 ? toI16(buf.getChannelData(1).subarray(from, to)) : null;
  const parts = [], block = 1152, step = block * 200;
  for (let i = 0; i < L.length; i += block) {
    const d = R ? enc.encodeBuffer(L.subarray(i, i + block), R.subarray(i, i + block)) : enc.encodeBuffer(L.subarray(i, i + block));
    if (d.length) parts.push(new Uint8Array(d));
    if (i % step === 0) { onProgress(i / L.length); await tick(); }
  }
  const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
  onProgress(1);
  return new Blob(parts, { type: "audio/mpeg" });
}
async function decodeAudio(file) {
  const AC = window.AudioContext || window.webkitAudioContext, ac = new AC();
  try { return await ac.decodeAudioData(await file.arrayBuffer()); }
  catch { throw new Error("เบราว์เซอร์ถอดรหัสไฟล์นี้ไม่ได้ ลองใช้ Chrome หรือไฟล์รูปแบบอื่น"); }
  finally { ac.close(); }
}
const fmtTime = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
const recExt = (mime) => mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";

tool({
  id: "to-mp3", cat: "เสียง & วิดีโอ", icon: I.music, name: "วิดีโอ → MP3 / WAV",
  desc: "ดึงเสียงจากไฟล์วิดีโอหรือแปลงไฟล์เสียงในเครื่องเป็น MP3 หรือ WAV เลือกบิตเรตได้",
  keywords: "mp3 wav audio extract video mp4 เสียง เพลง convert แปลง",
  render(body) {
    let file;
    const ctrls = h(`<div><div class="row">
      <div class="field"><label>รูปแบบ</label><select class="input" id="fmt"><option value="mp3">MP3</option><option value="wav">WAV (ไม่บีบอัด)</option></select></div>
      <div class="field"><label>บิตเรต (MP3)</label><select class="input" id="br"><option>128</option><option selected>192</option><option>256</option><option>320</option></select></div>
    </div>
    <div class="actions"><button class="btn btn-gold" id="go" disabled>เริ่มแปลง</button></div>
    <div class="progress"><div id="bar"></div></div><div class="status" id="st"></div>
    <div class="note">รองรับ MP4, WEBM, MOV, M4A, OGG, WAV, FLAC (ขึ้นกับเบราว์เซอร์) · ไฟล์ยาวมากอาจใช้หน่วยความจำสูง</div></div>`);
    const st = $("#st", ctrls), bar = $("#bar", ctrls), go = $("#go", ctrls);
    body.append(dropZone({ accept: "video/*,audio/*", title: "เลือกไฟล์วิดีโอหรือเสียง", hint: "ไฟล์จะถูกประมวลผลในเครื่องของคุณเท่านั้น" }, ([f]) => {
      file = f; go.disabled = false; bar.style.width = "0"; setStatus(st, `${f.name} · ${fmtSize(f.size)}`);
    }), ctrls);
    go.onclick = async () => {
      go.disabled = true;
      try {
        setStatus(st, "กำลังถอดรหัสเสียง…"); bar.style.width = "5%";
        const audio = await decodeAudio(file);
        const fmt = $("#fmt", ctrls).value, name = baseName(file.name) + "." + fmt;
        const blob = fmt === "wav" ? encodeWav(audio) : await encodeMp3(audio, +$("#br", ctrls).value, p => {
          bar.style.width = (10 + p * 90) + "%"; st.textContent = `กำลังเข้ารหัส MP3… ${Math.round(p * 100)}%`;
        });
        bar.style.width = "100%";
        setStatus(st, `เสร็จแล้ว ✓ ${name} · ${fmtSize(blob.size)} · ${fmtTime(audio.duration)}`);
        download(blob, name);
      } catch (e) { setStatus(st, e.message, true); bar.style.width = "0"; }
      go.disabled = false;
    };
  },
});

tool({
  id: "audio-trim", cat: "เสียง & วิดีโอ", icon: I.scissors, name: "ตัดเสียง / ทำริงโทน",
  desc: "ตัดช่วงที่ต้องการจากไฟล์เพลงหรือวิดีโอ ฟังตัวอย่างก่อน แล้วบันทึกเป็น MP3 หรือ WAV",
  keywords: "trim cut audio ringtone ตัด เพลง ริงโทน mp3",
  render(body) {
    let audio, file, url;
    const ui = h(`<div hidden id="ui"><audio controls class="media" id="pl" style="height:54px"></audio>
      <div class="row"><div class="field"><label>เริ่ม (วินาที)</label><input class="input" type="number" id="a" step="0.1" min="0" value="0"></div>
      <div class="field"><label>สิ้นสุด (วินาที)</label><input class="input" type="number" id="b" step="0.1" min="0"></div>
      <div class="field"><label>รูปแบบ</label><select class="input" id="fmt"><option value="mp3">MP3 192k</option><option value="wav">WAV</option></select></div></div>
      <div class="actions"><button class="btn btn-ghost btn-sm" id="setA">ตั้งจุดเริ่มจากตำแหน่งที่เล่น</button><button class="btn btn-ghost btn-sm" id="setB">ตั้งจุดจบจากตำแหน่งที่เล่น</button><button class="btn btn-ghost btn-sm" id="prev">▶ ฟังช่วงที่เลือก</button></div>
      <div class="actions"><button class="btn btn-gold" id="go">ตัดและบันทึก</button></div>
      <div class="progress"><div id="bar"></div></div><div class="status" id="st"></div></div>`);
    const st = $("#st", ui), pl = $("#pl", ui), a = $("#a", ui), b = $("#b", ui);
    body.append(dropZone({ accept: "audio/*,video/*", title: "เลือกไฟล์เพลงหรือวิดีโอ", hint: "MP3 · M4A · WAV · MP4 …" }, async ([f]) => {
      file = f; setStatus(st, "กำลังโหลด…"); ui.hidden = false;
      try {
        audio = await decodeAudio(f);
        if (url) URL.revokeObjectURL(url);
        pl.src = url = URL.createObjectURL(f);
        a.value = 0; b.value = audio.duration.toFixed(1); a.max = b.max = audio.duration;
        setStatus(st, `${f.name} · ความยาว ${fmtTime(audio.duration)}`);
      } catch (e) { setStatus(st, e.message, true); }
    }), ui);
    $("#setA", ui).onclick = () => a.value = pl.currentTime.toFixed(1);
    $("#setB", ui).onclick = () => b.value = pl.currentTime.toFixed(1);
    let stopAt;
    $("#prev", ui).onclick = () => { pl.currentTime = num(a.value); stopAt = num(b.value); pl.play(); };
    pl.ontimeupdate = () => { if (stopAt && pl.currentTime >= stopAt) { pl.pause(); stopAt = null; } };
    $("#go", ui).onclick = async () => {
      if (!audio) return;
      const s = Math.max(0, num(a.value)), e = Math.min(audio.duration, num(b.value));
      if (e <= s) return setStatus(st, "จุดสิ้นสุดต้องมากกว่าจุดเริ่ม", true);
      const from = Math.floor(s * audio.sampleRate), to = Math.floor(e * audio.sampleRate), fmt = $("#fmt", ui).value;
      const bar = $("#bar", ui);
      const blob = fmt === "wav" ? encodeWav(audio, from, to) : await encodeMp3(audio, 192, p => bar.style.width = p * 100 + "%", from, to);
      bar.style.width = "100%";
      setStatus(st, `เสร็จแล้ว ✓ ความยาว ${(e - s).toFixed(1)} วินาที · ${fmtSize(blob.size)}`);
      download(blob, `${baseName(file.name)}_${s.toFixed(0)}-${e.toFixed(0)}.${fmt}`);
    };
    return () => { pl.pause(); if (url) URL.revokeObjectURL(url); };
  },
});

// Shared recorder UI for microphone and screen.
function recorderTool(body, { getStream, mimeHint, label, isVideo }) {
  const ui = h(`<div class="center"><div class="big sm" id="t">0:00</div>
    <div class="actions"><button class="btn btn-gold" id="rec">● ${label}</button><button class="btn btn-ghost" id="stop" disabled>■ หยุด</button></div>
    <div class="status" id="st"></div><div id="out" class="out"></div></div>`);
  body.append(ui);
  let rec, stream, timer, t0;
  const st = $("#st", ui);
  $("#rec", ui).onclick = async () => {
    try { stream = await getStream(); }
    catch (e) { return setStatus(st, "ไม่ได้รับอนุญาตหรืออุปกรณ์ไม่รองรับ: " + e.message, true); }
    const chunks = [];
    const mime = mimeHint.find(m => window.MediaRecorder?.isTypeSupported?.(m)) || "";
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const type = rec.mimeType || (isVideo ? "video/webm" : "audio/webm"), blob = new Blob(chunks, { type });
      const ext = isVideo ? (type.includes("mp4") ? "mp4" : "webm") : recExt(type);
      const name = `${isVideo ? "screen" : "voice"}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`;
      const u = URL.createObjectURL(blob);
      const row = h(`<div class="file-item" style="flex-wrap:wrap">${isVideo ? `<video src="${u}" controls class="media" style="margin:0"></video>` : `<audio src="${u}" controls style="flex:1;min-width:200px"></audio>`}<div class="meta"><b>${name}</b><small>${fmtSize(blob.size)}</small></div><button class="btn btn-ghost btn-sm">บันทึก</button></div>`);
      $("button", row).onclick = () => download(blob, name);
      $("#out", ui).prepend(row);
      stream.getTracks().forEach(t => t.stop());
      $("#rec", ui).disabled = false; $("#stop", ui).disabled = true; clearInterval(timer); st.innerHTML = "";
    };
    stream.getTracks()[0].onended = () => rec.state === "recording" && rec.stop();
    rec.start(1000); t0 = Date.now();
    $("#rec", ui).disabled = true; $("#stop", ui).disabled = false;
    st.className = "status"; st.innerHTML = `<span class="rec-dot"></span>กำลังบันทึก…`;
    timer = setInterval(() => $("#t", ui).textContent = fmtTime((Date.now() - t0) / 1000), 250);
  };
  $("#stop", ui).onclick = () => rec?.state === "recording" && rec.stop();
  return () => { clearInterval(timer); if (rec?.state === "recording") rec.stop(); stream?.getTracks().forEach(t => t.stop()); };
}

tool({
  id: "voice-rec", cat: "เสียง & วิดีโอ", icon: I.mic, name: "บันทึกเสียง",
  desc: "อัดเสียงจากไมโครโฟน ฟังย้อนหลัง และบันทึกเป็นไฟล์ได้ทันที",
  keywords: "voice recorder record microphone อัดเสียง ไมค์",
  render: (body) => recorderTool(body, {
    label: "เริ่มอัดเสียง", isVideo: false, mimeHint: ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"],
    getStream: () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }),
  }),
});

tool({
  id: "screen-rec", cat: "เสียง & วิดีโอ", icon: I.monitor, name: "อัดหน้าจอ",
  desc: "บันทึกวิดีโอหน้าจอ หน้าต่าง หรือแท็บ พร้อมเสียง (ใช้ได้บนคอมพิวเตอร์)",
  keywords: "screen recorder record อัดจอ บันทึกหน้าจอ capture",
  render(body) {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      body.append(h(`<div class="note">อุปกรณ์นี้ไม่รองรับการอัดหน้าจอจากเว็บ (มือถือส่วนใหญ่ไม่รองรับ) ใช้ฟีเจอร์อัดหน้าจอของระบบแทน หรือเปิดบนคอมพิวเตอร์</div>`));
      return;
    }
    return recorderTool(body, {
      label: "เริ่มอัดหน้าจอ", isVideo: true, mimeHint: ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"],
      getStream: () => navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true }),
    });
  },
});

tool({
  id: "video-frame", cat: "เสียง & วิดีโอ", icon: I.film, name: "จับภาพจากวิดีโอ",
  desc: "เลื่อนหาเฟรมที่ชอบในวิดีโอแล้วบันทึกเป็นรูป PNG/JPG ความละเอียดเต็ม",
  keywords: "video frame screenshot snapshot capture จับภาพ แคป",
  render(body) {
    let file, url;
    const ui = h(`<div hidden><video id="v" class="media" controls playsinline></video>
      <div class="actions"><button class="btn btn-ghost btn-sm" data-s="-1">−1s</button><button class="btn btn-ghost btn-sm" data-s="-0.04">−1 เฟรม</button><button class="btn btn-ghost btn-sm" data-s="0.04">+1 เฟรม</button><button class="btn btn-ghost btn-sm" data-s="1">+1s</button></div>
      <div class="actions"><button class="btn btn-gold" data-f="png">บันทึก PNG</button><button class="btn btn-ghost" data-f="jpeg">บันทึก JPG</button></div></div>`);
    const v = $("#v", ui);
    body.append(dropZone({ accept: "video/*", title: "เลือกไฟล์วิดีโอ", hint: "MP4 · WEBM · MOV" }, ([f]) => {
      file = f; if (url) URL.revokeObjectURL(url); v.src = url = URL.createObjectURL(f); ui.hidden = false;
    }), ui);
    $$("[data-s]", ui).forEach(b => b.onclick = () => { v.pause(); v.currentTime = Math.max(0, v.currentTime + +b.dataset.s); });
    $$("[data-f]", ui).forEach(b => b.onclick = async () => {
      if (!v.videoWidth) return toast("วิดีโอยังโหลดไม่เสร็จ");
      const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0);
      const f = b.dataset.f;
      download(await canvasBlob(c, "image/" + f), `${baseName(file.name)}_${v.currentTime.toFixed(2)}s.${f === "jpeg" ? "jpg" : "png"}`);
    });
    return () => { v.pause(); if (url) URL.revokeObjectURL(url); };
  },
});

tool({
  id: "tts", cat: "เสียง & วิดีโอ", icon: I.speaker, name: "อ่านออกเสียง (TTS)",
  desc: "ให้เครื่องอ่านข้อความภาษาไทยหรืออังกฤษออกเสียง ปรับความเร็วและระดับเสียงได้",
  keywords: "text to speech tts อ่าน ออกเสียง พูด voice",
  render(body) {
    if (!("speechSynthesis" in window)) { body.append(h(`<div class="note">เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียง</div>`)); return; }
    const ui = h(`<div><textarea class="input" id="t" style="font-family:var(--font-body);font-size:1rem">สวัสดีครับ ยินดีต้อนรับสู่ Lumière Tools</textarea>
      <div class="row"><div class="field"><label>เสียง</label><select class="input" id="voice"></select></div>
      <div class="field"><label>ความเร็ว: <span id="rv">1</span>x</label><input type="range" id="rate" min="0.5" max="2" step="0.1" value="1"></div>
      <div class="field"><label>ระดับเสียง: <span id="pv">1</span></label><input type="range" id="pitch" min="0.5" max="2" step="0.1" value="1"></div></div>
      <div class="actions"><button class="btn btn-gold" id="play">▶ อ่าน</button><button class="btn btn-ghost" id="pause">❚❚ พัก</button><button class="btn btn-ghost" id="stop">■ หยุด</button></div></div>`);
    body.append(ui);
    let voices = [];
    const fill = () => {
      voices = speechSynthesis.getVoices();
      const sel = $("#voice", ui);
      sel.innerHTML = voices.map((v, i) => `<option value="${i}">${esc(v.name)} (${v.lang})</option>`).join("") || "<option>ค่าเริ่มต้น</option>";
      const th = voices.findIndex(v => v.lang.startsWith("th")); if (th >= 0) sel.value = th;
    };
    fill(); speechSynthesis.onvoiceschanged = fill;
    $("#rate", ui).oninput = e => $("#rv", ui).textContent = e.target.value;
    $("#pitch", ui).oninput = e => $("#pv", ui).textContent = e.target.value;
    $("#play", ui).onclick = () => {
      if (speechSynthesis.paused) return speechSynthesis.resume();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance($("#t", ui).value);
      const v = voices[$("#voice", ui).value]; if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "th-TH";
      u.rate = +$("#rate", ui).value; u.pitch = +$("#pitch", ui).value;
      speechSynthesis.speak(u);
    };
    $("#pause", ui).onclick = () => speechSynthesis.pause();
    $("#stop", ui).onclick = () => speechSynthesis.cancel();
    return () => { speechSynthesis.cancel(); speechSynthesis.onvoiceschanged = null; };
  },
});

tool({
  id: "stt", cat: "เสียง & วิดีโอ", icon: I.ear, name: "พูดเป็นข้อความ",
  desc: "พูดใส่ไมโครโฟนแล้วแปลงเป็นข้อความภาษาไทยหรืออังกฤษแบบเรียลไทม์ (Chrome / Safari)",
  keywords: "speech to text dictation พิมพ์ด้วยเสียง ถอดเสียง voice typing",
  render(body) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { body.append(h(`<div class="note">เบราว์เซอร์นี้ไม่รองรับการแปลงเสียงเป็นข้อความ ลองใช้ Chrome หรือ Safari</div>`)); return; }
    const ui = h(`<div><div class="row"><div class="field"><label>ภาษา</label><select class="input" id="lang"><option value="th-TH">ไทย</option><option value="en-US">English</option></select></div></div>
      <textarea class="input" id="t" style="font-family:var(--font-body);font-size:1rem;margin-top:14px" placeholder="ข้อความจะปรากฏที่นี่…"></textarea>
      <div class="actions"><button class="btn btn-gold" id="go">● เริ่มฟัง</button><button class="btn btn-ghost" id="cp">คัดลอก</button><button class="btn btn-ghost" id="clr">ล้าง</button></div>
      <div class="status" id="st"></div><p class="hint">การแปลงเสียงอาจส่งเสียงไปประมวลผลที่บริการของเบราว์เซอร์ (เช่น Google/Apple)</p></div>`);
    body.append(ui);
    let rec, on = false, base = "";
    const t = $("#t", ui), st = $("#st", ui), go = $("#go", ui);
    const stop = () => { on = false; rec?.stop(); go.textContent = "● เริ่มฟัง"; st.textContent = ""; };
    go.onclick = () => {
      if (on) return stop();
      rec = new SR(); rec.lang = $("#lang", ui).value; rec.continuous = true; rec.interimResults = true;
      base = t.value ? t.value.trimEnd() + " " : "";
      rec.onresult = e => {
        let fin = "", interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript) : (interim += e.results[i][0].transcript));
        if (fin) base += fin + " ";
        t.value = base + interim;
      };
      rec.onerror = e => setStatus(st, "ข้อผิดพลาด: " + e.error, true);
      rec.onend = () => { if (on) rec.start(); };
      rec.start(); on = true; go.textContent = "■ หยุดฟัง"; st.className = "status"; st.innerHTML = `<span class="rec-dot"></span>กำลังฟัง…`;
    };
    $("#cp", ui).onclick = () => copy(t.value);
    $("#clr", ui).onclick = () => { t.value = ""; base = ""; };
    return stop;
  },
});

tool({
  id: "yt-thumb", cat: "เสียง & วิดีโอ", icon: I.play, name: "ดูภาพปก YouTube",
  desc: "วางลิงก์ YouTube แล้วดูภาพปก (Thumbnail) ทุกความละเอียด เปิดเต็มขนาดได้ในคลิกเดียว",
  keywords: "youtube thumbnail ภาพปก ยูทูป cover",
  render(body) {
    const ui = h(`<div><div class="row">
      <div class="field"><label>ลิงก์วิดีโอ YouTube</label><input class="input" id="u" placeholder="https://www.youtube.com/watch?v=..." /></div>
      <button class="btn btn-gold" id="go">ดึงภาพปก</button></div>
      <div class="status" id="st"></div><div class="thumbs" id="out"></div>
      <div class="note">แสดงเฉพาะภาพปกสาธารณะ ไม่ได้ดาวน์โหลดวิดีโอหรือเสียง (ขัดกับข้อตกลงการใช้งานของ YouTube)</div></div>`);
    body.append(ui);
    const run = () => {
      const v = $("#u", ui).value.trim();
      const m = v.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/) || v.match(/^([\w-]{11})$/);
      const st = $("#st", ui), out = $("#out", ui);
      if (!m) { setStatus(st, "ลิงก์ไม่ถูกต้อง", true); out.innerHTML = ""; return; }
      setStatus(st, "รหัสวิดีโอ: " + m[1]);
      out.innerHTML = [["maxresdefault", "Max (1280×720)"], ["sddefault", "SD (640×480)"], ["hqdefault", "HQ (480×360)"], ["mqdefault", "MQ (320×180)"]]
        .map(([k, l]) => `<a href="https://i.ytimg.com/vi/${m[1]}/${k}.jpg" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${m[1]}/${k}.jpg" alt="${l}" loading="lazy"><span>${l} ↗</span></a>`).join("");
    };
    $("#go", ui).onclick = run;
    $("#u", ui).onkeydown = e => e.key === "Enter" && run();
  },
});
