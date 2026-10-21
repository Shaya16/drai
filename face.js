import { CONFIG } from "./config.js";

// where the features are on the built-in placeholder drawing
const PLACEHOLDER = {
  leftEye: { x: 215 / 600, y: 340 / 750 },
  rightEye: { x: 385 / 600, y: 340 / 750 },
  mouth: { x: 300 / 600, y: 560 / 750 },
  hairline: { x: 0.5, y: 235 / 750 },
};

// turns the 0..1 points from config into pixel positions + how big the holes should be
export function measure(w, h, leftEye, rightEye, mouth, hairline, eyeSize = CONFIG.eyeSize, mouthSize = CONFIG.mouthSize) {
  let L = { x: leftEye.x * w, y: leftEye.y * h };
  let R = { x: rightEye.x * w, y: rightEye.y * h };
  if (L.x > R.x) [L, R] = [R, L];
  const M = { x: mouth.x * w, y: mouth.y * h };
  const d = Math.hypot(R.x - L.x, R.y - L.y);
  // no hairline given? it's usually about 1.2 eye-widths above the eyes. usually.
  const H = hairline ? { x: hairline.x * w, y: hairline.y * h } : { x: (L.x + R.x) / 2, y: (L.y + R.y) / 2 - 1.2 * d };
  return {
    L,
    R,
    M,
    H,
    d,
    eyeR: 0.3 * d * eyeSize,
    mouthW: 0.95 * d * mouthSize,
    mouthH: 0.42 * d * mouthSize,
  };
}

function loadImg(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = src;
  });
}

export async function loadFace() {
  const img = await loadImg(CONFIG.photo);
  const pts = img ? CONFIG : PLACEHOLDER;
  const canvas = img ? shrink(img) : drawPlaceholder();
  const { width: w, height: h } = canvas;
  return {
    canvas,
    w,
    h,
    placeholder: !img,
    url: img && !/\.png$/i.test(CONFIG.photo) ? canvas.toDataURL("image/jpeg", 0.85) : canvas.toDataURL(),
    feat: measure(w, h, pts.leftEye, pts.rightEye, pts.mouth, pts.hairline),
  };
}

// chapter 1's video: the still it freezes on (cut up like the photo), plus the frames you scroll through to get there.
// only waits for the still and the first frame, the rest keep loading in the background
export async function loadIntro() {
  const cfg = CONFIG.intro;
  const [img, first] = await Promise.all([loadImg(cfg?.still), loadImg(cfg?.frames.replace("{n}", "000"))]);
  if (!img || !first) return null;
  const canvas = shrink(img);
  const { width: w, height: h } = canvas;
  const frames = [first];
  for (let i = 1; i < cfg.frameCount; i++) {
    const f = new Image();
    f.src = cfg.frames.replace("{n}", String(i).padStart(3, "0"));
    frames.push(f);
  }
  return { canvas, w, h, frames, feat: measure(w, h, cfg.leftEye, cfg.rightEye, cfg.mouth, null, cfg.eyeSize, cfg.mouthSize) };
}

// someone else's photo (the nemesis), center-cropped to a square. no photo = a cartoon villain
export async function loadSquare(src, size = 400) {
  const img = await loadImg(src);
  if (!img) return drawNemesis();
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  c.getContext("2d").drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
  return c;
}

// a square crop around just his face, for the memes / the baby / the face cubes
export function cropHead(face, size = 400) {
  const { L, R, M, H, d, eyeR, mouthW, mouthH } = face.feat;
  const half = 1.4 * d;
  const x0 = (L.x + R.x) / 2 - half;
  const y0 = (L.y + R.y) / 2 + 0.25 * d - half;
  const s = size / (2 * half);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d");
  g.fillStyle = "#77ccff";
  g.fillRect(0, 0, size, size);
  g.drawImage(face.canvas, x0, y0, 2 * half, 2 * half, 0, 0, size, size);
  const map = (p) => ({ x: (p.x - x0) * s, y: (p.y - y0) * s });
  return {
    canvas,
    size,
    url: canvas.toDataURL("image/jpeg", 0.9),
    L: map(L),
    R: map(R),
    M: map(M),
    H: map(H),
    eyeR: eyeR * s,
    mouthW: mouthW * s,
    mouthH: mouthH * s,
  };
}

// average color of a small patch, for painting skin over things
export function colorAt(canvas, x, y) {
  const px = canvas
    .getContext("2d")
    .getImageData(Math.max(0, Math.min(canvas.width - 10, x - 5)) | 0, Math.max(0, Math.min(canvas.height - 10, y - 5)) | 0, 10, 10).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < px.length; i += 4) {
    r += px[i];
    g += px[i + 1];
    b += px[i + 2];
  }
  const n = px.length / 4;
  return `rgb(${(r / n) | 0}, ${(g / n) | 0}, ${(b / n) | 0})`;
}

// phone photos are huge, and we're going for "bad" anyway
function shrink(img, max = 1024) {
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * s);
  c.height = Math.round(img.naturalHeight * s);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// until there's a real face.jpg, this guy stands in
function drawPlaceholder() {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 750;
  const g = c.getContext("2d");
  const circle = (x, y, r) => {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
  };

  g.fillStyle = "#77ccff";
  g.fillRect(0, 0, 600, 750);
  g.lineWidth = 7;
  g.strokeStyle = "#000";
  g.lineJoin = g.lineCap = "round";

  // neck + shirt
  g.fillStyle = "#e3a96f";
  g.fillRect(240, 600, 120, 150);
  g.strokeRect(240, 600, 120, 150);
  g.fillStyle = "#ff3b3b";
  g.beginPath();
  g.moveTo(60, 750);
  g.quadraticCurveTo(300, 640, 540, 750);
  g.fill();
  g.stroke();

  // ears + head
  g.fillStyle = "#f2c38b";
  for (const x of [92, 508]) {
    g.beginPath();
    g.ellipse(x, 400, 34, 60, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.beginPath();
  g.ellipse(300, 400, 210, 270, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // hair
  g.fillStyle = g.strokeStyle = "#3b2414";
  g.beginPath();
  g.ellipse(300, 235, 218, 135, 0, Math.PI, Math.PI * 2);
  g.fill();
  g.lineWidth = 12;
  for (let i = 0; i < 9; i++) {
    const x = 140 + i * 40;
    g.beginPath();
    g.moveTo(x, 130);
    g.lineTo(x + 25 - Math.random() * 50, 60 + Math.random() * 40);
    g.stroke();
  }

  // eyes, slightly cross-eyed
  g.strokeStyle = "#000";
  g.lineWidth = 6;
  for (const [x, look] of [[215, 8], [385, -6]]) {
    g.fillStyle = "#fff";
    circle(x, 340, 44);
    g.fill();
    g.stroke();
    g.fillStyle = "#2a8";
    circle(x + look, 344, 21);
    g.fill();
    g.fillStyle = "#000";
    circle(x + look, 344, 10);
    g.fill();
    g.fillStyle = "#fff";
    circle(x + look - 6, 337, 5);
    g.fill();
  }

  // one suspicious eyebrow
  g.strokeStyle = "#3b2414";
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(170, 280);
  g.lineTo(260, 268);
  g.moveTo(340, 262);
  g.lineTo(430, 246);
  g.stroke();

  // nose
  g.strokeStyle = "#000";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(300, 380);
  g.quadraticCurveTo(268, 455, 305, 465);
  g.stroke();

  // mouth + 2 teeth
  g.fillStyle = "#a01818";
  g.beginPath();
  g.moveTo(240, 535);
  g.quadraticCurveTo(300, 610, 360, 535);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = "#fff";
  g.fillRect(272, 538, 22, 14);
  g.fillRect(300, 538, 22, 14);

  g.fillStyle = "#000";
  g.textAlign = "center";
  g.font = "bold 40px 'Comic Sans MS', 'Comic Neue', cursive";
  g.fillText("INSERT FACE HERE", 300, 48);
  g.font = "bold 22px 'Comic Sans MS', 'Comic Neue', cursive";
  g.fillText("(put face.jpg next to index.html)", 300, 735);
  return c;
}

// stand-in for the person he "hates", until there's an enemy.jpg
function drawNemesis() {
  const c = document.createElement("canvas");
  c.width = c.height = 400;
  const g = c.getContext("2d");
  g.fillStyle = "#5b1a1a";
  g.fillRect(0, 0, 400, 400);
  g.fillStyle = "#9ad17a";
  g.strokeStyle = "#000";
  g.lineWidth = 6;
  g.lineCap = "round";
  g.beginPath();
  g.ellipse(200, 215, 130, 160, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // angry eyebrows
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(110, 150);
  g.lineTo(180, 180);
  g.moveTo(290, 150);
  g.lineTo(220, 180);
  g.stroke();
  g.lineWidth = 6;
  for (const x of [150, 250]) {
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(x, 205, 22, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = "#000";
    g.beginPath();
    g.arc(x + 4, 209, 9, 0, Math.PI * 2);
    g.fill();
  }
  // evil mustache + frown
  g.fillStyle = "#000";
  g.beginPath();
  g.moveTo(200, 268);
  g.quadraticCurveTo(140, 248, 118, 292);
  g.quadraticCurveTo(160, 276, 200, 286);
  g.quadraticCurveTo(240, 276, 282, 292);
  g.quadraticCurveTo(260, 248, 200, 268);
  g.fill();
  g.lineWidth = 8;
  g.beginPath();
  g.arc(200, 350, 48, Math.PI * 1.2, Math.PI * 1.8);
  g.stroke();
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.font = "bold 32px Impact, Anton, sans-serif";
  g.fillText("INSERT NEMESIS", 200, 44);
  g.font = "bold 18px sans-serif";
  g.fillText("(enemy.jpg)", 200, 388);
  return c;
}
