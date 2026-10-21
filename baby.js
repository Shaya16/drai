import { CONFIG } from "./config.js";
import { t } from "./lang.js";

// "BabyGen", a very serious AI app. it is not AI. it's his face, given baby proportions,
// smoothed like an AI photo and wrapped in a blanket. it gets worse every time you press the button.

const rand = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function blank(w, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function copy(c) {
  const out = blank(c.width, c.height);
  out.getContext("2d").drawImage(c, 0, 0);
  return out;
}

// moves pixels around inside box: fn(x, y) says where each pixel should be copied from
function warp(c, fn, box) {
  const g = c.getContext("2d");
  const w = c.width, h = c.height;
  const src = g.getImageData(0, 0, w, h);
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  const s = src.data, d = out.data;
  const [x0, y0, x1, y1] = box.map(Math.round);
  for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
      const [sx, sy] = fn(x, y);
      const ix = Math.min(w - 1, Math.max(0, sx | 0)), iy = Math.min(h - 1, Math.max(0, sy | 0));
      const si = (iy * w + ix) * 4, di = (y * w + x) * 4;
      d[di] = s[si];
      d[di + 1] = s[si + 1];
      d[di + 2] = s[si + 2];
      d[di + 3] = s[si + 3];
    }
  }
  g.putImageData(out, 0, 0);
}

// k > 1 blows things up, k < 1 shrinks them
function bulge(c, cx, cy, r, k) {
  warp(c, (x, y) => {
    const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy);
    if (dist >= r || dist === 0) return [x, y];
    const f = Math.pow(dist / r, k) * (r / dist);
    return [cx + dx * f, cy + dy * f];
  }, [cx - r, cy - r, cx + r, cy + r]);
}

// stretches the mouth sideways into a grin
function widen(c, cx, cy, rx, ry, amount) {
  warp(c, (x, y) => {
    const u = (x - cx) / rx, v = (y - cy) / ry, dd = u * u + v * v;
    if (dd >= 1) return [x, y];
    return [cx + (x - cx) / (1 + amount * (1 - dd) ** 2), y];
  }, [cx - rx, cy - ry, cx + rx, cy + ry]);
}

// draws part of src into g as an ellipse whose edges fade out. solid is how much of the middle stays fully opaque
function softPaste(g, src, sx, sy, sw, sh, cx, cy, w, h, solid = 0.5) {
  const t = blank(Math.ceil(w), Math.ceil(h));
  const tg = t.getContext("2d");
  tg.drawImage(src, sx, sy, sw, sh, 0, 0, t.width, t.height);
  tg.globalCompositeOperation = "destination-in";
  tg.setTransform(1, 0, 0, h / w, t.width / 2, t.height / 2);
  const rg = tg.createRadialGradient(0, 0, (w / 2) * solid, 0, 0, w / 2);
  rg.addColorStop(0, "#000");
  rg.addColorStop(1, "rgba(0, 0, 0, 0)");
  tg.fillStyle = rg;
  tg.fillRect(-w * 4, -w * 4, w * 8, w * 8);
  g.drawImage(t, cx - w / 2, cy - h / 2);
}

export function makeBaby(head, attempt) {
  const S = head.size;
  const v = attempt % 6; // 0 classic, 1 huge eyes, 2 forehead, 3 grin, 4 cyclops, 5 potato
  const c = copy(head.canvas);
  const g = c.getContext("2d");

  // the potato gets squashed first, so every point below has to follow the squash
  let P = (p) => p;
  if (v === 5) {
    const src = copy(c);
    g.filter = "blur(8px)"; // a soft backdrop so the squash leaves no hard edges
    g.drawImage(src, -S * 0.15, 0, S * 1.3, S);
    g.filter = "none";
    g.drawImage(src, -S * 0.15, S * 0.12, S * 1.3, S * 0.8);
    P = (p) => ({ x: -S * 0.15 + p.x * 1.3, y: S * 0.12 + p.y * 0.8 });
  }
  const L = P(head.L), R = P(head.R), M = P(head.M);
  const d = Math.hypot(R.x - L.x, R.y - L.y);
  const eyes = { x: (L.x + R.x) / 2, y: (L.y + R.y) / 2 };
  const nose = { x: (eyes.x + M.x) / 2, y: (eyes.y + M.y) / 2 + 0.1 * d };

  // baby proportions: big eyes, button nose, tiny mouth, chubby cheeks, big forehead
  if (v === 4) {
    // cyclops: paint forehead skin over both eyes, then one big eye in the middle
    for (const e of [L, R]) softPaste(g, copy(c), eyes.x - 0.45 * d, eyes.y - 0.75 * d, 0.9 * d, 0.35 * d, e.x, e.y, 0.95 * d, 0.6 * d);
    const r = 0.38 * d;
    softPaste(g, copy(head.canvas), head.L.x - r, head.L.y - r, 2 * r, 2 * r, eyes.x, eyes.y - 0.05 * d, 3 * r, 3 * r);
  } else {
    const k = { 1: 2.1, 5: 0.65 }[v] ?? 1.4;
    for (const e of [L, R]) bulge(c, e.x, e.y, (v === 1 ? 0.62 : 0.5) * d, k);
  }
  bulge(c, nose.x, nose.y, 0.45 * d, 0.72);
  if (v === 3) widen(c, M.x, M.y, 0.95 * d, 0.38 * d, 1.1);
  else bulge(c, M.x, M.y, 0.5 * d, 0.7);
  for (const side of [-1, 1]) bulge(c, eyes.x + side * 0.75 * d, M.y - 0.3 * d, 0.6 * d, 1.25);
  bulge(c, eyes.x, eyes.y - 0.75 * d, (v === 2 ? 1.15 : 0.85) * d, v === 2 ? 1.9 : 1.3);

  // "AI" skin: smooth everything, then put the eyes back sharp
  const sharp = copy(c);
  g.filter = "blur(3px)";
  g.globalAlpha = 0.8;
  g.drawImage(sharp, 0, 0);
  g.filter = "none";
  g.globalAlpha = 1;
  g.save();
  g.beginPath();
  const eyeSpots = v === 4 ? [[eyes.x, eyes.y - 0.05 * d, 0.5 * d]] : [L, R].map((e) => [e.x, e.y, (v === 1 ? 0.45 : 0.3) * d]);
  for (const [x, y, r] of eyeSpots) {
    g.moveTo(x + r, y);
    g.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2);
  }
  g.clip();
  g.drawImage(sharp, 0, 0);
  g.restore();

  // newborn-photo color: brighter, warmer, pinker
  const toned = copy(c);
  g.filter = "brightness(1.2) saturate(1.15) contrast(0.92)";
  g.drawImage(toned, 0, 0);
  g.filter = "none";
  g.globalCompositeOperation = "soft-light";
  g.fillStyle = "rgba(255, 170, 160, 0.55)";
  g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = "source-over";

  // studio portrait: soft backdrop, the face fading out in an oval, a swaddle blanket
  const out = blank(S);
  const o = out.getContext("2d");
  const bg = o.createRadialGradient(S / 2, S * 0.4, S * 0.1, S / 2, S / 2, S * 0.75);
  bg.addColorStop(0, "#fff4f8");
  bg.addColorStop(1, "#d9c9f2");
  o.fillStyle = bg;
  o.fillRect(0, 0, S, S);
  // the face goes in a bit smaller and higher, so there's room for the blanket underneath
  const z = 0.8, faceY = S * 0.42, ovalY = eyes.y + 0.35 * d;
  softPaste(o, c, eyes.x - 1.4 * d, eyes.y - 1.35 * d, 2.8 * d, 3.4 * d, S / 2, faceY, 2.8 * d * z, 3.4 * d * z, 0.72);

  const chin = faceY + (M.y + 0.55 * d - ovalY) * z;
  o.save();
  o.translate(S / 2, chin + S * 0.2);
  o.scale(1, 0.48);
  const blanket = o.createRadialGradient(0, -S * 0.1, S * 0.05, 0, 0, S * 0.62);
  blanket.addColorStop(0, "#ffffff");
  blanket.addColorStop(0.75, "#efeaf4");
  blanket.addColorStop(1, "rgba(225, 216, 236, 0)");
  o.fillStyle = blanket;
  o.beginPath();
  o.arc(0, 0, S * 0.62, 0, Math.PI * 2);
  o.fill();
  o.restore();

  // a little film grain and a vignette, so it looks like a "photo"
  const px = o.getImageData(0, 0, S, S);
  for (let i = 0; i < px.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    px.data[i] += n;
    px.data[i + 1] += n;
    px.data[i + 2] += n;
  }
  o.putImageData(px, 0, 0);
  const vig = o.createRadialGradient(S / 2, S / 2, S * 0.35, S / 2, S / 2, S * 0.75);
  vig.addColorStop(0, "rgba(60, 40, 80, 0)");
  vig.addColorStop(1, "rgba(60, 40, 80, 0.28)");
  o.fillStyle = vig;
  o.fillRect(0, 0, S, S);

  o.font = "600 13px Inter, system-ui, sans-serif";
  o.textAlign = "right";
  o.fillStyle = "rgba(255, 255, 255, 0.8)";
  o.fillText("◆ BabyGen", S - 12, S - 12);
  return out;
}

export function initBabyMaker(head, fmt, { busy, reveal }) {
  const $ = (id) => document.getElementById(id);
  $("dad-img").src = head.url;
  $("bg-avatar").src = head.url;

  // her photo, if there is one. she does not get warped. she's innocent.
  const mom = $("mom-slot");
  const protect = () => {
    mom.innerHTML = `<div class="bg-locked">🔒<span>${t("Photo protected", "התמונה מוגנת")}</span><small>${t("she's too pretty for this website", "היא יפה מדי בשביל האתר הזה")}</small></div>`;
  };
  if (CONFIG.gfPhoto) {
    const img = new Image();
    img.alt = CONFIG.gfName;
    img.onload = () => mom.replaceChildren(img);
    img.onerror = protect;
    img.src = CONFIG.gfPhoto;
  } else protect();

  // the first results are real AI babies (from config). after those run out, it makes its own
  const realBabies = (CONFIG.babyPhotos || []).map((item) => (typeof item === "string" ? item : item.src));
  realBabies.forEach((src) => (new Image().src = src));

  const go = $("make-baby"), again = $("baby-again");
  const big = $("baby-big"), noise = $("baby-noise"), progress = $("baby-progress"), fill = $("baby-fill"), msg = $("baby-msg");
  const meta = $("baby-meta"), reply = $("baby-reply"), actions = $("baby-actions"), toast = $("baby-toast");
  const steps = CONFIG.babySteps, verdicts = CONFIG.babyVerdicts;
  const confidence = [98, 61, 33, 12, 4, 0.3];
  let attempt = 0, working = false, toastTimer;

  const say = (text) => {
    toast.textContent = fmt(text);
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 3500);
  };
  const type = async (el, text) => {
    el.textContent = "";
    for (const ch of text) {
      el.textContent += ch;
      await sleep(18);
    }
  };

  async function generate() {
    if (working || attempt >= verdicts.length) return;
    working = true;
    go.disabled = again.disabled = true;
    busy();
    $("baby-empty").hidden = true;
    big.hidden = true;
    meta.hidden = reply.hidden = actions.hidden = toast.hidden = true;
    noise.hidden = progress.hidden = false;

    const lines = attempt ? steps.again : steps.first;
    for (let i = 0; i < lines.length; i++) {
      msg.textContent = fmt(lines[i]);
      fill.style.width = ((i + 1) / lines.length) * 80 + "%";
      await sleep(rand(500, 850));
    }
    const real = realBabies[attempt];
    big.src = real || makeBaby(head, attempt).toDataURL("image/jpeg", 0.92);
    big.style.objectPosition = real ? "50% 35%" : "";
    await big.decode().catch(() => {});
    big.hidden = false;
    big.classList.remove("denoise");
    void big.offsetWidth;
    big.classList.add("denoise");
    for (let s = 1; s <= 50; s += 3) {
      msg.textContent = t(`Denoising… step ${s}/50`, `מנקה רעשים… שלב ${s}/50`);
      fill.style.width = 80 + s * 0.4 + "%";
      await sleep(90);
    }
    msg.textContent = t("Done.", "מוכן.");
    fill.style.width = "100%";
    await sleep(350);
    noise.hidden = progress.hidden = true;

    const [title, text] = verdicts[attempt];
    $("baby-conf").textContent = t(`confidence ${confidence[attempt % confidence.length]}%`, `ביטחון ${confidence[attempt % confidence.length]}%`);
    $("baby-seed").textContent = `seed ${(Math.random() * 9000 + 1000) | 0}`;
    $("baby-top").textContent = fmt(title);
    meta.hidden = reply.hidden = false;
    reveal(attempt);
    await type($("baby-bottom"), fmt(text));

    attempt++;
    actions.hidden = false;
    if (attempt >= verdicts.length) {
      go.textContent = again.textContent = t("🔒 Free limit reached", "🔒 נגמרה המכסה החינמית");
      say(steps.limit);
    } else {
      go.textContent = t("✨ Generate again", "✨ עוד אחד");
      go.disabled = again.disabled = false;
    }
    working = false;
  }

  go.onclick = again.onclick = generate;
  $("baby-download").onclick = () => say(t("Download blocked: this image violates our community guidelines.", "ההורדה נחסמה: התמונה מפרה את כללי הקהילה שלנו."));
  $("baby-share").onclick = () => say(t("Sharing is disabled. For everyone's safety.", "השיתוף מושבת. למען ביטחון הציבור."));
}
