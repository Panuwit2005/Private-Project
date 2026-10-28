// Account: passwordless login with Supabase Auth (email link or 6-digit code).
// The session lives in localStorage under Supabase's own "sb-*" key, outside the lumiere: namespace,
// so backups never contain login tokens. The library only loads when someone has signed in or opens this tool.

const SB_SESSION_KEY = "sb-" + new URL(SUPABASE_URL).hostname.split(".")[0] + "-auth-token";
let authUser = null;
const authListeners = new Set();
function onAuth(fn) { authListeners.add(fn); fn(authUser); return () => authListeners.delete(fn); }

let authReady;
function initAuth() {
  return authReady ||= cloud().then(sb => {
    sb.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user || null;
      if (u?.id === authUser?.id) return;
      authUser = u; authListeners.forEach(fn => fn(u));
    });
    return sb;
  }).catch(err => { authReady = null; throw err; });
}

const loginRedirect = () => location.origin + location.pathname; // no hash: the router owns it

tool({
  id: "account", cat: "daily", icon: I.user, name: "บัญชีของฉัน",
  desc: "เข้าสู่ระบบด้วยอีเมล ไม่ต้องตั้งรหัสผ่าน ใช้ได้ทุกเครื่องด้วยบัญชีเดียว",
  keywords: "login logout sign in account เข้าสู่ระบบ ออกจากระบบ ล็อกอิน บัญชี สมาชิก อีเมล",
  persist: false,
  render(body) {
    const ui = h(`<div><div id="box"><div class="status">กำลังโหลด…</div></div><div class="status" id="st" role="status"></div></div>`);
    body.append(ui);
    const box = $("#box", ui), st = $("#st", ui);
    let sentTo = "";

    const draw = (u) => {
      if (u) {
        box.innerHTML = `<div class="account-card">
          <span class="avatar-lg" aria-hidden="true">${esc((u.email || "?")[0].toUpperCase())}</span>
          <div><b>${esc(u.email || "")}</b><span>เข้าสู่ระบบตั้งแต่ ${new Date(u.last_sign_in_at || Date.now()).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</span></div>
        </div>
        <div class="actions"><button class="btn btn-ghost" id="out">ออกจากระบบ</button></div>`;
        $("#out", box).onclick = async () => {
          const sb = await initAuth(); const { error } = await sb.auth.signOut();
          setStatus(st, error ? "ออกจากระบบไม่สำเร็จ: " + error.message : "ออกจากระบบแล้ว", !!error);
        };
        return;
      }
      box.innerHTML = `<div class="callout"><span class="ic" aria-hidden="true">${I.key}</span><div><b>ไม่ต้องตั้งรหัสผ่าน</b><span>ใส่อีเมล แล้วกดลิงก์ หรือกรอกรหัส 6 หลักที่ส่งไปทางอีเมล</span></div></div>
        <form class="row" id="fEmail"><div class="field"><label for="em">อีเมล</label><input class="input" id="em" type="email" required autocomplete="email" inputmode="email" placeholder="you@example.com" value="${esc(sentTo)}"></div><button class="btn btn-gold" id="send">ส่งลิงก์เข้าสู่ระบบ</button></form>
        <form class="row" id="fCode"${sentTo ? "" : " hidden"}><div class="field"><label for="code">รหัสจากอีเมล</label><input class="input" id="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" maxlength="10" placeholder="123456"></div><button class="btn btn-ghost">ยืนยันรหัส</button></form>
        <p class="hint" id="codeHint"${sentTo ? "" : " hidden"}>ถ้าใช้แอปที่ติดตั้งไว้ กรอกรหัสจะสะดวกกว่ากดลิงก์ เพราะลิงก์อาจเปิดในเบราว์เซอร์อื่น</p>`;
      $("#fEmail", box).onsubmit = async e => {
        e.preventDefault();
        const email = $("#em", box).value.trim(), btn = $("#send", box);
        btn.disabled = true; setStatus(st, "กำลังส่ง…");
        try {
          const sb = await initAuth();
          const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: loginRedirect() } });
          if (error) throw error;
          sentTo = email; draw(null);
          setStatus(st, `ส่งอีเมลไปที่ ${email} แล้ว ✓ เช็กกล่องจดหมาย (และโฟลเดอร์สแปม)`);
          $("#code", box).focus();
        } catch (err) {
          setStatus(st, /rate|seconds/i.test(err.message) ? "ส่งถี่เกินไป รอสักครู่แล้วลองใหม่" : "ส่งไม่สำเร็จ: " + err.message, true);
          btn.disabled = false;
        }
      };
      $("#fCode", box).onsubmit = async e => {
        e.preventDefault();
        const token = $("#code", box).value.trim();
        if (!token) return;
        setStatus(st, "กำลังตรวจสอบ…");
        try {
          const sb = await initAuth();
          const { error } = await sb.auth.verifyOtp({ email: sentTo, token, type: "email" });
          if (error) throw error;
          setStatus(st, "เข้าสู่ระบบแล้ว ✓");
        } catch (err) { setStatus(st, "รหัสไม่ถูกต้องหรือหมดอายุ: " + err.message, true); }
      };
    };

    const off = onAuth(u => { if (authReady) draw(u); });
    initAuth().then(() => draw(authUser)).catch(err => setStatus(st, "เชื่อมต่อไม่ได้ (ออฟไลน์อยู่หรือเปล่า?) " + err.message, true));
    return off;
  },
});

// Header button: shows "เข้าสู่ระบบ" or the signed-in user's initial.
const accountBtn = $("#accountBtn");
accountBtn.onclick = () => openTool("account");
onAuth(u => {
  accountBtn.classList.toggle("signed-in", !!u);
  accountBtn.innerHTML = u ? `<span class="avatar-sm" aria-hidden="true">${esc((u.email || "?")[0].toUpperCase())}</span>` : "เข้าสู่ระบบ";
  accountBtn.setAttribute("aria-label", u ? "บัญชี: " + (u.email || "") : "เข้าสู่ระบบ");
});

// Restore the session on load, and finish a login when we come back from the email link (?code=...).
// Skip the network entirely for visitors who never signed in.
(() => {
  const params = new URLSearchParams(location.search);
  let hasSession = false; try { hasSession = !!localStorage.getItem(SB_SESSION_KEY); } catch {}
  if (!hasSession && !params.has("code") && !params.has("error_description")) return;
  initAuth().then(async sb => {
    const { data } = await sb.auth.getSession();
    if (!authUser && data.session) { authUser = data.session.user; authListeners.forEach(fn => fn(authUser)); }
    if (params.has("code") || params.has("error_description")) {
      const err = params.get("error_description");
      history.replaceState(null, "", location.pathname + location.hash);
      toast(err ? "ลิงก์เข้าสู่ระบบใช้ไม่ได้: " + err : authUser ? "เข้าสู่ระบบแล้ว ✓" : "เข้าสู่ระบบไม่สำเร็จ ลองขอลิงก์ใหม่");
    }
  }).catch(() => {});
})();
