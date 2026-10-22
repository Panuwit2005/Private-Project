// Games & fun: typing speed test (Thai / English) and a reaction-time test. Best scores stay on this device.

const TYPE_TEXTS = {
  th: ["การเดินทางไกลเริ่มต้นจากก้าวแรกเสมอ", "ความพยายามอยู่ที่ไหน ความสำเร็จอยู่ที่นั่น", "น้ำขึ้นให้รีบตัก", "ช้า ๆ ได้พร้าเล่มงาม", "อย่าลืมดื่มน้ำและพักสายตาทุกชั่วโมง",
    "วันนี้อากาศดีเหมาะกับการออกไปเดินเล่นในสวน", "หนังสือเป็นเพื่อนที่ดีที่สุดในยามว่าง", "เก็บเงินวันละนิดก็ช่วยให้มีเงินก้อนในอนาคต", "ทำงานให้เสร็จทีละอย่างดีกว่าทำหลายอย่างพร้อมกัน", "รอยยิ้มเป็นภาษาที่ทุกคนเข้าใจ"],
  en: ["the quick brown fox jumps over the lazy dog", "practice makes progress not perfection", "small steps every day add up to big results", "simple tools done well beat complex tools done badly",
    "take a deep breath and focus on one thing at a time", "good design is as little design as possible", "save early save often and back up everything", "the best time to plant a tree was twenty years ago"],
};

tool({
  id: "typing-test", cat: "fun", persist: false, fresh: true, icon: I.text, name: "ทดสอบความเร็วพิมพ์ (ไทย / อังกฤษ)",
  desc: "จับเวลา 30 หรือ 60 วินาที วัดคำต่อนาที (WPM) และความแม่นยำ พร้อมสถิติดีที่สุดของคุณ",
  keywords: "typing test speed wpm พิมพ์ดีด ความเร็ว ทดสอบ เกม keyboard",
  render(body) {
    const ui = h(`<div><div class="row" style="margin-top:0"><div class="tabs" id="lang"><button class="chip active" data-l="th">ภาษาไทย</button><button class="chip" data-l="en">English</button></div><div class="tabs" id="dur"><button class="chip active" data-d="30">30 วิ</button><button class="chip" data-d="60">60 วิ</button></div></div>
      <div class="type-box" id="box" aria-live="off"></div>
      <input class="input" id="in" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="เริ่มพิมพ์ตรงนี้ — นาฬิกาจะเริ่มเอง" aria-label="พิมพ์ข้อความด้านบน">
      <div class="stats-row" id="st"></div><div class="actions"><button class="btn btn-ghost" id="re">เริ่มใหม่</button></div><div class="status" id="msg" aria-live="polite"></div></div>`);
    body.append(ui);
    let lang = "th", dur = 30, text = "", start = 0, timer = 0, typedAll = 0, correctAll = 0, done = false;
    const best = () => store.get("typing-best", {})[lang] || 0;
    const nextText = () => { const L = TYPE_TEXTS[lang]; let s = ""; while ([...s].length < 220) s += (s ? " " : "") + L[Math.floor(Math.random() * L.length)]; return s; };
    const stats = () => {
      const sec = start ? Math.min(dur, (performance.now() - start) / 1000) : 0;
      // Standard WPM: 5 characters = 1 word. Thai has no spaces, so the same rule applies to both.
      const wpm = sec ? Math.round((correctAll / 5) / (sec / 60)) : 0, acc = typedAll ? Math.round(correctAll / typedAll * 100) : 100;
      return { left: Math.max(0, Math.ceil(dur - sec)), wpm, acc };
    };
    const paint = () => {
      const typed = [...$("#in", ui).value], chars = [...text];
      $("#box", ui).innerHTML = chars.map((c, i) => `<span class="${i < typed.length ? (typed[i] === c ? "ok" : "bad") : i === typed.length ? "cur" : ""}">${esc(c)}</span>`).join("");
      const box = $("#box", ui), cur = $(".cur", box);
      // Keep the line being typed second from the top, so the previous line stays readable.
      if (cur) { const cs = getComputedStyle(box); box.scrollTop = Math.max(0, cur.offsetTop - parseFloat(cs.paddingTop) - parseFloat(cs.lineHeight)); }
      const s = stats();
      $("#st", ui).innerHTML = `<div><b>${s.left}</b><span>วินาทีที่เหลือ</span></div><div><b>${s.wpm}</b><span>WPM</span></div><div><b>${s.acc}%</b><span>แม่นยำ</span></div><div><b>${best()}</b><span>ดีที่สุด</span></div>`;
    };
    const finish = () => {
      done = true; clearInterval(timer); $("#in", ui).disabled = true;
      const s = stats(), all = store.get("typing-best", {});
      const isBest = s.wpm > (all[lang] || 0) && s.acc >= 80;
      if (isBest) { all[lang] = s.wpm; store.set("typing-best", all); }
      paint(); setStatus($("#msg", ui), `หมดเวลา! ${s.wpm} WPM · แม่นยำ ${s.acc}%` + (isBest ? " · สถิติใหม่ 🎉" : s.acc < 80 ? " · ต้องแม่นยำ 80% ขึ้นไปจึงนับสถิติ" : ""));
    };
    const reset = () => {
      clearInterval(timer); start = 0; typedAll = 0; correctAll = 0; done = false; text = nextText();
      const inp = $("#in", ui); inp.value = ""; inp.disabled = false; inp.lang = lang; setStatus($("#msg", ui), ""); paint(); inp.focus();
    };
    let prev = "";
    $("#in", ui).addEventListener("input", (e) => {
      if (done) return;
      if (!start) { start = performance.now(); timer = setInterval(() => { stats().left ? paint() : finish(); }, 250); }
      const v = [...e.target.value], p = [...prev], chars = [...text];
      if (v.length > p.length) for (let i = p.length; i < v.length; i++) { typedAll++; if (v[i] === chars[i]) correctAll++; }
      prev = e.target.value;
      if (v.length >= chars.length) { text += " " + nextText(); }
      paint();
    });
    const pick = (sel, fn) => $$(sel + " .chip", ui).forEach(b => b.onclick = () => { $$(sel + " .chip", ui).forEach(x => x.classList.toggle("active", x === b)); fn(b); prev = ""; reset(); });
    pick("#lang", b => lang = b.dataset.l); pick("#dur", b => dur = +b.dataset.d);
    $("#re", ui).onclick = () => { prev = ""; reset(); };
    reset();
    return () => clearInterval(timer);
  },
});

tool({
  id: "reaction", cat: "fun", persist: false, fresh: true, icon: I.bolt, name: "ทดสอบเวลาตอบสนอง",
  desc: "แตะทันทีที่หน้าจอเปลี่ยนเป็นสีทอง วัดเป็นมิลลิวินาที เฉลี่ย 5 ครั้ง",
  keywords: "reaction time test เวลาตอบสนอง ปฏิกิริยา เกม ความไว ms",
  render(body) {
    const ui = h(`<div><button type="button" class="react-pad" id="pad"><b>แตะเพื่อเริ่ม</b><small>รอให้เป็นสีทองแล้วแตะให้เร็วที่สุด</small></button>
      <div class="stats-row" id="st"></div></div>`);
    body.append(ui);
    const pad = $("#pad", ui);
    let state = "idle", t0 = 0, wait = 0, times = [];
    const set = (cls, title, sub) => { pad.className = "react-pad " + cls; pad.innerHTML = `<b>${title}</b><small>${sub}</small>`; };
    const paint = () => {
      const avg = times.length ? Math.round(times.reduce((a, b) => a + b) / times.length) : 0, best = store.get("reaction-best", 0);
      $("#st", ui).innerHTML = `<div><b>${times.length}/5</b><span>ครั้ง</span></div><div><b>${times.length ? Math.min(...times) : "–"}</b><span>เร็วสุด (ms)</span></div><div><b>${avg || "–"}</b><span>เฉลี่ย (ms)</span></div><div><b>${best || "–"}</b><span>สถิติเฉลี่ยดีที่สุด</span></div>`;
    };
    const go = () => {
      if (state === "idle" || state === "result" || state === "early") {
        if (times.length >= 5) times = [];
        state = "wait"; set("wait", "รอ…", "อย่าเพิ่งแตะ");
        wait = setTimeout(() => { state = "now"; t0 = performance.now(); set("now", "แตะ!", ""); }, 1200 + Math.random() * 2800);
      } else if (state === "wait") {
        clearTimeout(wait); state = "early"; set("early", "เร็วเกินไป!", "แตะเพื่อลองใหม่");
      } else if (state === "now") {
        const ms = Math.round(performance.now() - t0); times.push(ms); state = "result";
        if (times.length === 5) {
          const avg = Math.round(times.reduce((a, b) => a + b) / 5), best = store.get("reaction-best", 0);
          if (!best || avg < best) store.set("reaction-best", avg);
          set("result", `เฉลี่ย ${avg} ms`, (avg < 250 ? "ไวมาก! " : avg < 350 ? "ปกติดี " : "") + "แตะเพื่อเล่นรอบใหม่");
        } else set("result", ms + " ms", `ครั้งที่ ${times.length}/5 · แตะเพื่อไปต่อ`);
      }
      paint();
    };
    pad.addEventListener("pointerdown", (e) => { e.preventDefault(); go(); });
    pad.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); go(); } });
    paint();
    return () => clearTimeout(wait);
  },
});
