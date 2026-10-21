import { CONFIG } from "./config.js";
import * as sfx from "./audio.js";
import { initBabyMaker } from "./baby.js";
import { buildMemes } from "./memes.js";
import { initFight } from "./fight.js";
import { colorAt } from "./face.js";
import { t, HE } from "./lang.js";

const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pop = (e) => {
  e.classList.remove("pop");
  void e.offsetWidth;
  e.classList.add("pop");
};
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// fills in {name} {gf} {age} {age+1} {age-2} ... in text from config
const fmt = (s) =>
  String(s)
    .replace(/\{name\}/g, CONFIG.name)
    .replace(/\{gf\}/g, CONFIG.gfName)
    .replace(/\{age([+-]\d+)?\}/g, (_, off) => CONFIG.age + (off ? +off : 0));

export function initUI(face, head, hooks) {
  fillIn();
  loader();
  multiverse(head, hooks.boom);
  initBabyMaker(head, fmt, {
    busy: () => hooks.orbs("busy"),
    reveal: (n) => {
      hooks.orbs("break");
      hooks.boom();
      if (n === 0) setTimeout(() => achieve("baby"), 1500);
    },
  });
  love();
  initFight(head, fmt, { boom: hooks.boom, achieve });
  buildMemes($("#meme-grid"), head, fmt);
  gallery(face);
  reviews();
  memories();
  wish(hooks.finale);
  achievements();
  mute();
  hitmarkers();
  glitches();
}

function fillIn() {
  const year = new Date().getFullYear();
  const NAME = CONFIG.name.toUpperCase();
  const set = (sel, v) => document.querySelectorAll(sel).forEach((e) => (e.textContent = v));
  set(".nm", CONFIG.name);
  set(".gf", CONFIG.gfName);
  // <span class="age" data-add="-10"> = his age minus 10
  document.querySelectorAll(".age").forEach((e) => (e.textContent = CONFIG.age + (+e.dataset.add || 0)));
  set(".next", CONFIG.age + 1);
  set(".age20", CONFIG.age + 20);
  set(".days", (CONFIG.age * 365).toLocaleString("en-US"));
  set(".born", year - CONFIG.age);
  set(".year", year);
  document.title = t(`HAPPY BIRTHDAY ${NAME}!!!1!`, `מזל טוב ${NAME}!!!1!`);
  // (the ticker writes his name in capitals)
  $("#ticker").textContent = CONFIG.ticker.map((s) => `★ ${fmt(s.replace(/\{name\}/g, NAME))} `).join("") + "★";
}

function loader() {
  history.scrollRestoration = "manual";
  scrollTo(0, 0);
  const steps = CONFIG.loader;
  const fill = $("#load-fill"), pct = $("#load-pct"), msg = $("#load-msg");
  let i = 0;
  (function tick() {
    const [n, m] = steps[i++];
    fill.style.width = n + "%";
    pct.textContent = n + "%";
    msg.textContent = fmt(m);
    if (i < steps.length) setTimeout(tick, rand(350, 850));
    else $("#enter").hidden = false;
  })();
  $("#loader-x").onclick = () => {
    msg.textContent = t("nice try. you can't close a birthday.", "יפה ניסית. יום הולדת לא סוגרים.");
    const w = $("#loader-win");
    w.classList.remove("shake");
    void w.offsetWidth;
    w.classList.add("shake");
  };
  $("#enter").onclick = () => {
    // the song first: phones only let it start straight from this tap
    sfx.startSong(CONFIG.song);
    sfx.initAudio();
    sfx.tada();
    $("#loader").remove();
    document.body.classList.remove("locked");
    setTimeout(() => achieve("open"), 1500);
  };
}

// ---------- xbox achievements ----------
const unlocked = new Set(), achQueue = [];
let achShowing = false;

function achieve(key) {
  const text = CONFIG.achievements[key];
  if (!text || unlocked.has(key)) return;
  unlocked.add(key);
  achQueue.push(fmt(text));
  nextAchievement();
}

function nextAchievement() {
  if (achShowing || !achQueue.length) return;
  achShowing = true;
  const a = el("div", "ach"), txt = el("div", "ach-txt");
  txt.append(el("small", null, t("ACHIEVEMENT UNLOCKED", "הישג נפתח")), el("b", null, achQueue.shift()));
  a.append(el("div", "ach-ico", "🏆"), txt, el("span", "ach-g", `+${[10, 25, 50, 69, 100][(Math.random() * 5) | 0]}G`));
  document.body.append(a);
  sfx.achieve();
  setTimeout(() => {
    a.remove();
    achShowing = false;
    nextAchievement();
  }, 3600);
}

function achievements() {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && achieve(e.target.dataset.ach)), {
    rootMargin: "-45% 0px -45% 0px",
  });
  document.querySelectorAll("[data-ach]").forEach((s) => io.observe(s));
  // the 3D scenes fire these at their punchlines
  addEventListener("achievement", (e) => achieve(e.detail));
}

// ---------- physics vs money ----------
function multiverse(head, boom) {
  const pct = (v) => (v / head.size) * 100 + "%";
  const eyeGap = (head.R.x - head.L.x) / head.size;
  document.querySelectorAll(".vf").forEach((img) => (img.src = head.url));
  if (CONFIG.multiverse.moneyPhoto) {
    // a real photo of him making it rain beats fake sunglasses
    const photo = $("#rich-photo");
    photo.src = CONFIG.multiverse.moneyPhoto;
    photo.hidden = false;
    $("#rich-face").remove();
  } else {
    const shades = $(".v-shades");
    shades.style.left = pct((head.L.x + head.R.x) / 2);
    shades.style.top = pct((head.L.y + head.R.y) / 2);
    shades.style.setProperty("--s", eyeGap);
  }
  const tear = $(".v-tear");
  tear.style.left = pct(head.L.x);
  tear.style.top = pct(head.L.y + (head.R.x - head.L.x) * 0.35);
  const list = (sel, items) => $(sel).replaceChildren(...items.map((s) => el("li", null, fmt(s))));
  list("#verse-money", CONFIG.multiverse.money);
  list("#verse-physics", CONFIG.multiverse.physics);

  const out = $("#calc-out"), btn = $("#calc-btn"), res = $("#calc-result");
  let runs = 0;
  btn.onclick = async () => {
    btn.disabled = true;
    out.textContent = "";
    for (const line of CONFIG.salaryMath) {
      for (const ch of fmt(line)) {
        out.textContent += ch;
        await sleep(rand(15, 45));
      }
      out.textContent += "\n";
      await sleep(350);
    }
    res.textContent = (runs ? t("still ", "עדיין ") : t("SALARY: ", "משכורת: ")) + fmt(CONFIG.salaryResult);
    res.hidden = false;
    pop(res);
    boom();
    if (!runs++) setTimeout(() => achieve("physics"), 1200);
    btn.textContent = t("⚛️ recalculate (it won't change)", "⚛️ לחשב שוב (זה לא ישתנה)");
    btn.disabled = false;
  };
}

// ---------- enemies to lovers ----------
function love() {
  const a = CONFIG.name, b = CONFIG.enemy.name;
  document.querySelectorAll(".enemy-nm").forEach((e) => (e.textContent = b));
  $("#ship").textContent = a.slice(0, Math.ceil(a.length / 2)) + b.slice(Math.floor(b.length / 2));
  const leak = $("#leak");
  if (CONFIG.enemy.hugPhoto) {
    const img = leak.querySelector("img");
    img.onerror = () => leak.remove();
    img.src = CONFIG.enemy.hugPhoto;
  } else leak.remove();
}

// his photo with a shiny MS paint bald cap over the hair
function baldCanvas(face) {
  const { L, R, H, d } = face.feat;
  const cx = (L.x + R.x) / 2, eyeY = (L.y + R.y) / 2;
  const c = document.createElement("canvas");
  c.width = face.w;
  c.height = face.h;
  const g = c.getContext("2d");
  g.drawImage(face.canvas, 0, 0);
  g.fillStyle = colorAt(face.canvas, cx, (H.y + eyeY) / 2);
  g.beginPath();
  g.ellipse(cx, H.y + 0.15 * d, 1.45 * d, 1.25 * d, 0, Math.PI, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255, 255, 255, 0.45)";
  g.beginPath();
  g.ellipse(cx - 0.45 * d, H.y - 0.6 * d, 0.35 * d, 0.16 * d, -0.4, 0, Math.PI * 2);
  g.fill();
  return c;
}

function gallery(face) {
  const grid = $("#gallery-grid");
  const f = face.feat;
  grid.style.setProperty("--ar", `${face.w} / ${face.h}`);
  const eyes = { x: (f.L.x + f.R.x) / 2 / face.w, y: (f.L.y + f.R.y) / 2 / face.h };
  const nose = { x: (eyes.x + f.M.x / face.w) / 2, y: (eyes.y + f.M.y / face.h) / 2 };

  CONFIG.gallery.forEach((item) => {
    const fig = el("figure", "frame");
    fig.style.setProperty("--r", rand(-7, 7).toFixed(1) + "deg");
    if (item.src) {
      // a real photo keeps its own shape instead of getting squashed into the face's
      const pic = el("div", `pic photo fx-${item.fx}`);
      const img = new Image();
      img.loading = "lazy";
      img.src = item.src;
      img.alt = item.caption;
      img.onerror = () => fig.remove();
      pic.append(img);
      fig.append(pic, el("figcaption", null, fmt(item.caption)));
      grid.append(fig);
      return;
    }
    const pic = el("div", `pic fx-${item.fx}`);
    if (item.fx === "pixel") {
      const c = document.createElement("canvas");
      c.width = 14;
      c.height = Math.round((14 * face.h) / face.w);
      c.getContext("2d").drawImage(face.canvas, 0, 0, c.width, c.height);
      pic.append(c);
    } else if (item.fx === "bald") {
      pic.append(baldCanvas(face));
    } else {
      const img = new Image();
      img.src = face.url;
      img.alt = item.caption;
      pic.append(img);
    }
    if (item.fx === "nose") pic.style.setProperty("--o", `${nose.x * 100}% ${nose.y * 100}%`);
    if (item.fx === "glasses") {
      const g = el("span", "shades", "🕶️");
      g.style.left = eyes.x * 100 + "%";
      g.style.top = eyes.y * 100 + "%";
      g.style.setProperty("--s", (f.R.x - f.L.x) / face.w);
      pic.append(g);
    }
    fig.append(pic, el("figcaption", null, fmt(item.caption)));
    grid.append(fig);
  });
}

// ---------- customer reviews: his store listing ----------
function reviews() {
  const list = $("#review-list"), all = CONFIG.reviews;
  const starsOf = (r) => Math.max(0, Math.min(5, Math.round(r.stars)));
  const starText = (n) => "★".repeat(n) + "☆".repeat(5 - n);
  const avg = all.reduce((a, r) => a + starsOf(r), 0) / Math.max(1, all.length);
  $("#avg").textContent = avg.toFixed(1);
  $("#az-stars").textContent = $("#az-stars-2").textContent = starText(Math.round(avg));
  $("#nrev").textContent = all.length;

  // how many 5 star, 4 star... reviews, as bars
  for (let s = 5; s >= 1; s--) {
    const pct = Math.round((100 * all.filter((r) => starsOf(r) === s).length) / Math.max(1, all.length));
    const row = el("div", "az-bar");
    const track = el("span", "az-track");
    track.append(el("i"));
    track.firstChild.style.width = pct + "%";
    row.append(el("span", "az-link", t(`${s} star`, s === 1 ? "כוכב 1" : `${s} כוכבים`)), track, el("span", "az-link", pct + "%"));
    $("#az-bars").append(row);
  }

  const colors = ["#e47911", "#007185", "#8c4fbf", "#c7254e", "#2e8540", "#b8860b"];
  const day = 24 * 60 * 60 * 1000;
  all.forEach((r, i) => {
    const card = el("article", "az-review");
    const who = el("div", "az-who");
    const avatar = el("span", "az-avatar", (HE ? fmt(r.by) : fmt(r.by).replace(/^(his|her|the|a)\s+/i, "")).charAt(0).toUpperCase());
    avatar.style.background = colors[i % colors.length];
    who.append(avatar, el("span", null, fmt(r.by)));
    const head = el("p", "az-head");
    head.append(el("span", "az-stars", starText(starsOf(r))), el("b", null, " " + fmt(r.title || "")));
    const when = new Date(Date.now() - (i * 37 + 3) * day).toLocaleDateString(t("en-GB", "he-IL"), { day: "numeric", month: "long", year: "numeric" });
    const meta = el("p", "az-meta", t(`Reviewed in Israel on ${when}`, `נכתב בישראל ב-${when}`));
    const badge = el("p", "az-badge", r.badge || t("Verified Purchase", "רכישה מאומתת"));
    const text = el("p", "az-text", fmt(r.text));
    let helpful = r.helpful ?? Math.round(rand(2, 60));
    const count = el("p", "az-meta", "");
    const showCount = () =>
      (count.textContent =
        helpful === 1
          ? t("1 person found this helpful", "אדם אחד מצא את זה מועיל")
          : t(`${helpful.toLocaleString("en-US")} people found this helpful`, `${helpful.toLocaleString("en-US")} אנשים מצאו את זה מועיל`));
    showCount();
    const actions = el("div", "az-actions");
    const yes = el("button", "az-btn small", t("Helpful", "מועיל"));
    yes.onclick = () => {
      helpful++;
      showCount();
      yes.disabled = true;
      yes.textContent = t("✓ Thank you for your feedback", "✓ תודה על המשוב");
    };
    const report = el("button", "az-report", t("Report", "דיווח"));
    report.onclick = () => (report.textContent = t("Reported. (he reported it too)", "דווח. (גם הוא דיווח)"));
    actions.append(yes, report);
    card.append(who, head, meta, badge, text, count, actions);
    list.append(card);
  });

  $("#write-review").onclick = (e) => {
    e.target.disabled = true;
    $("#review-closed").hidden = false;
  };
}

// ---------- the good times ----------
function memories() {
  const items = CONFIG.memories || [];
  if (!items.length) return $("#memories").remove();
  const videos = [];
  items.forEach((m) => {
    const fig = el("figure", m.video ? "tape" : "tape wide");
    fig.style.setProperty("--r", rand(-3, 3).toFixed(1) + "deg");
    const screen = el("div", "tape-screen");
    if (m.video) {
      const v = document.createElement("video");
      v.muted = v.loop = v.playsInline = true;
      v.preload = "none";
      v.dataset.src = m.video;
      const off = t("🔇 tap for sound", "🔇 לחץ בשביל סאונד"), on = t("🔊 sound on", "🔊 עם סאונד");
      const sound = el("button", "tape-sound", off);
      // a tape with its sound on turns the background song down
      const setSound = (onNow) => {
        v.muted = !onNow;
        sound.textContent = onNow ? on : off;
        sfx.dipSong(m.video, onNow);
      };
      sound.onclick = () => setSound(v.muted);
      // scrolled away (so it paused): back to silent
      v.addEventListener("pause", () => !v.muted && setSound(false));
      screen.append(v, el("span", "tape-osd", "▶ PLAY"), el("span", "tape-rec", "● REC"), sound);
      videos.push(v);
    } else {
      const img = new Image();
      img.loading = "lazy";
      img.src = m.photo;
      img.alt = m.caption;
      screen.append(img, el("span", "tape-osd", t("📷 MEMORY", "📷 זיכרון")));
    }
    fig.append(screen, el("figcaption", null, fmt(m.caption)));
    $("#tapes").append(fig);
  });
  // the videos only load when you get close, and only play while they're on screen
  const near = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && !e.target.src && (e.target.src = e.target.dataset.src)), {
    rootMargin: "800px 0px",
  });
  const onScreen = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())), {
    threshold: 0.5,
  });
  videos.forEach((v) => {
    near.observe(v);
    onScreen.observe(v);
  });
}

function wish(finale) {
  const sec = $("#wish"), btn = $("#wish-btn");
  const taunts = CONFIG.wishTaunts;
  const MAX = taunts.length;
  let dodges = 0, lastDodge = 0;

  function dodge() {
    const now = performance.now();
    if (dodges >= MAX || now - lastDodge < 250) return;
    lastDodge = now;
    btn.textContent = `🌠 ${taunts[dodges++]}`;
    // jump somewhere else inside the part of the section that's on screen
    const r = sec.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const top = Math.max(0, -r.top) + 70;
    const bottom = Math.min(r.height, innerHeight - r.top) - b.height - 20;
    btn.style.transform = "none";
    btn.style.left = rand(10, Math.max(10, r.width - b.width - 10)) + "px";
    btn.style.top = rand(top, Math.max(top, bottom)) + "px";
    if (dodges === MAX) {
      setTimeout(() => {
        btn.textContent = t("ok fine 😮‍💨 click me", "טוב נו 😮‍💨 תלחץ");
        btn.classList.add("tired");
      }, 600);
    }
  }

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || dodges >= MAX) return;
    const b = btn.getBoundingClientRect();
    const d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2));
    if (d < Math.max(b.width, b.height) * 0.8) dodge();
  });
  // touch screens can't hover, so the button dodges the tap itself
  btn.addEventListener("pointerdown", (e) => {
    if (dodges >= MAX) return;
    e.preventDefault();
    lastDodge = 0;
    dodge();
  });
  btn.addEventListener("click", () => {
    if (dodges < MAX || sec.classList.contains("finale")) return;
    sec.classList.add("finale");
    sec.scrollIntoView({ block: "start" });
    sfx.pauseSong(); // the music box gets the stage, then the crash is silent
    const dur = finale();
    emojiStorm(dur * 1000);
    setTimeout(() => achieve("wish"), 2500);
    stayNotice(dur + 2.5);
    setTimeout(bsod, (dur + 2.5) * 1000);
  });
}

// 💯😂👌 raining down during the finale
function emojiStorm(ms) {
  const E = ["💯", "😂", "👌", "🔥", "🎉", "😎", "💀", "🥳", "🎂"];
  const end = performance.now() + ms;
  (function spawn() {
    if (performance.now() > end) return;
    const s = el("span", "storm", E[(Math.random() * E.length) | 0]);
    s.style.left = rand(0, 92) + "vw";
    s.style.fontSize = rand(30, 80) + "px";
    s.style.animationDuration = rand(1.4, 3) + "s";
    document.body.append(s);
    setTimeout(() => s.remove(), 3100);
    setTimeout(spawn, rand(80, 220));
  })();
}

// during the song, so nobody thinks that's the end and closes the tab
function stayNotice(seconds) {
  const notice = $("#stay-notice"), fill = $("#stay-fill");
  notice.hidden = false;
  fill.style.transition = `width ${seconds}s linear`;
  void fill.offsetWidth;
  fill.style.width = "100%";
}

function bsod() {
  $("#stay-notice").hidden = true;
  const b = $("#bsod");
  const qr = $("#qr");
  if (!qr.childElementCount) for (let i = 0; i < 441; i++) qr.append(el("i", Math.random() < 0.5 ? "b" : ""));
  b.classList.add("on");
  document.body.classList.add("locked");
  let pct = 0;
  (function step() {
    pct = Math.min(100, pct + Math.floor(rand(0, 17)));
    $("#bsod-pct").textContent = pct;
    if (pct < 100) return setTimeout(step, rand(250, 800));
    $("#bsod-done").hidden = false;
    const reboot = () => {
      removeEventListener("keydown", reboot);
      b.removeEventListener("pointerdown", reboot);
      b.classList.remove("on");
      $("#sincere-msg").textContent = fmt(CONFIG.message);
      $("#sincere-from").textContent = CONFIG.from;
      $("#sincere").classList.add("on");
      sfx.resumeSong(); // the song comes back for the message
    };
    addEventListener("keydown", reboot);
    b.addEventListener("pointerdown", reboot);
  })();
  $("#again").onclick = () => {
    scrollTo(0, 0);
    location.reload();
  };
  $("#stay").onclick = () => {
    $("#sincere").classList.remove("on");
    document.body.classList.remove("locked");
  };
}

function mute() {
  const b = $("#mute");
  let m = false;
  b.onclick = () => {
    m = !m;
    sfx.setMuted(m);
    $("#fight-video").muted = m;
    b.textContent = m ? "🔇" : "🔊";
  };
}

// every click is a headshot
function hitmarkers() {
  addEventListener("pointerdown", (e) => {
    const h = el("span", "hit");
    h.style.left = e.clientX + "px";
    h.style.top = e.clientY + "px";
    document.body.append(h);
    setTimeout(() => h.remove(), 400);
  });
}

// every so often the 3D behind the page hiccups (never the text)
function glitches() {
  const gl = $("#gl");
  const glitch = () => {
    gl.classList.add("glitch");
    setTimeout(() => gl.classList.remove("glitch"), rand(90, 200));
    setTimeout(glitch, rand(8000, 15000));
  };
  setTimeout(glitch, 8000);
}
