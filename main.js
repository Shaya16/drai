import * as THREE from "three";
import { FontLoader, Font } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { CONFIG } from "./config.js";
import { loadFace, loadIntro, cropHead, loadSquare, colorAt } from "./face.js";
import * as sfx from "./audio.js";
import { initUI } from "./ui.js";
import { HE } from "./lang.js"; // (just HE here: in this file t is the clock)

const FONT_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json";
const HE_FONT_URL = "https://fonts.gstatic.com/s/secularone/v14/8QINdiTajsj_87rMuMdKypDl.ttf"; // Secular One, for the hebrew finale

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const rand = (a, b) => a + Math.random() * (b - a);

function bounce(x) {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
}

// a spring with not quite enough damping, so everything overshoots and wobbles. on purpose. mostly.
class Wobbly {
  constructor(v = 0) {
    this.v = v;
    this.vel = 0;
  }
  update(target, dt) {
    this.vel += (70 * (target - this.v) - 7 * this.vel) * dt;
    this.v += this.vel * dt;
    return this.v;
  }
}

// 5x7 pixel font for the age cubes
const DIGITS = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

// what you see through the eye holes
function insideCanvas(aspect) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = Math.round(256 / aspect);
  const g = c.getContext("2d");
  g.fillStyle = "#1a0000";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#39ff14";
  g.font = "bold 11px monospace";
  for (let y = 12; y < c.height; y += 14) {
    g.fillText(Math.random() < 0.6 ? "404 BRAIN NOT FOUND 404 BRAIN NOT FOUND" : "error error ¯\\_(ツ)_/¯ error error", ((y * 7) % 40) - 30, y);
  }
  return c;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.25);
  s.bezierCurveTo(0, 0.5, -0.5, 0.5, -0.5, 0.15);
  s.bezierCurveTo(-0.5, -0.15, 0, -0.3, 0, -0.5);
  s.bezierCurveTo(0, -0.3, 0.5, -0.15, 0.5, 0.15);
  s.bezierCurveTo(0.5, 0.5, 0, 0.5, 0, 0.25);
  return s;
}

function start(face, head, enemy, intro) {
  const canvas = document.getElementById("gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(CONFIG.pixelation);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.z = 10;
  scene.add(new THREE.AmbientLight(0xffffff, 1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(-4, -6, 5); // lit from below like a horror movie
  scene.add(sun);

  let halfW = 1, halfH = 1; // visible area at z = 0
  const nearest = (t) => {
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  const std = (color) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.7 });

  // ---------- 1. the face. the video freezes on him cross-eyed, we "fix" his eyes, they leave, then come back wrong ----------
  function buildFace() {
    // the frozen video frame if there is one, otherwise the photo
    const pic = intro || face;
    const f = pic.feat;
    const H = intro ? 6.4 : 5, k = H / pic.h, W = pic.w * k;
    const toWorld = (p) => new THREE.Vector2((p.x - pic.w / 2) * k, (pic.h / 2 - p.y) * k);

    // the face with the eyes cut out of it
    const holed = document.createElement("canvas");
    holed.width = pic.w;
    holed.height = pic.h;
    const g = holed.getContext("2d");
    g.drawImage(pic.canvas, 0, 0);
    g.globalCompositeOperation = "destination-out";
    for (const e of [f.L, f.R]) {
      g.beginPath();
      g.arc(e.x, e.y, f.eyeR, 0, Math.PI * 2);
      g.fill();
    }

    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: nearest(new THREE.Texture(holed)), alphaTest: 0.5 })));
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.97, H * 0.97), new THREE.MeshBasicMaterial({ map: nearest(new THREE.Texture(insideCanvas(pic.w / pic.h))) }));
    inside.position.z = -0.05;
    root.add(inside);

    // until it freezes, the video plays on top of all of that (scrolling picks the frame)
    const FREEZE = 0.3;
    let film = null, shown = 0;
    if (intro) {
      const tex = new THREE.Texture(intro.frames[0]);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      film = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex }));
      film.position.z = 0.03;
      root.add(film);
    }

    // each eye gets its own little canvas, so its iris can be painted out and put back somewhere else.
    // the pieces are cut a bit bigger than their holes, so no seams show while they're still in place
    const PAD = 1.08;
    const er = f.eyeR * k * PAD, ePx = Math.max(8, Math.round(f.eyeR * 2 * PAD));
    const shapes = (intro && CONFIG.intro.eyeShapes) || [];
    const eyes = [f.L, f.R].map((p, i) => {
      const r = f.eyeR * PAD;
      const src = document.createElement("canvas");
      src.width = src.height = ePx;
      const sg = src.getContext("2d");
      sg.drawImage(pic.canvas, p.x - r, p.y - r, r * 2, r * 2, 0, 0, ePx, ePx);
      const out = document.createElement("canvas");
      out.width = out.height = ePx;
      const tex = nearest(new THREE.Texture(out));
      const m = new THREE.Mesh(new THREE.CircleGeometry(er, 24), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
      const parts = irisParts(sg, shapes[i] || guessShape(p), p, r, i ? 1 : -1);
      m.userData = { rest: toWorld(p), ctx: out.getContext("2d"), outData: new ImageData(ePx, ePx), tex, dx: NaN, ...parts };
      root.add(m);
      return m;
    });

    // no measured eye shape (the photo instead of the video): an eye-shaped guess around the hole
    function guessShape(p) {
      const e = f.eyeR, fx = (x) => x / pic.w, fy = (y) => y / pic.h;
      return {
        corners: [[fx(p.x - 0.95 * e), fy(p.y)], [fx(p.x + 0.95 * e), fy(p.y)]],
        top: [fx(p.x), fy(p.y - 0.4 * e)],
        bottom: [fx(p.x), fy(p.y + 0.4 * e)],
        iris: { x: fx(p.x), y: fy(p.y), r: fx(0.38 * e) },
      };
    }

    // splits an eye into: where it's open (between the lids), the eye with its iris painted over with white,
    // and where the iris is. out = which way is away from the nose (-1 = left)
    function irisParts(sg, shape, p, r, out) {
      const n = ePx, sc = n / (2 * r);
      const at = ([x, y]) => [(x * pic.w - p.x + r) * sc, (y * pic.h - p.y + r) * sc];

      // the opening: two curves (the lids) between the corners, through the top / bottom points
      const [a, b] = shape.corners.map(at), lid = (q) => [2 * q[0] - (a[0] + b[0]) / 2, 2 * q[1] - (a[1] + b[1]) / 2];
      const mc = document.createElement("canvas");
      mc.width = mc.height = n;
      const mg = mc.getContext("2d");
      mg.beginPath();
      mg.moveTo(...a);
      mg.quadraticCurveTo(...lid(at(shape.top)), ...b);
      mg.quadraticCurveTo(...lid(at(shape.bottom)), ...a);
      mg.fill();
      const ma = mg.getImageData(0, 0, n, n).data;
      const open = new Uint8Array(n * n);
      for (let j = 0; j < n * n; j++) open[j] = ma[j * 4 + 3] > 127 ? 1 : 0;

      const [ix, iy] = at([shape.iris.x, shape.iris.y]);
      const ir = shape.iris.r * pic.w * sc, R = ir + 3 * sc;
      const src = sg.getImageData(0, 0, n, n).data, base = new Uint8ClampedArray(src);
      const hole = new Uint8Array(n * n);
      const white = [0, 0, 0], iris = [0, 0, 0];
      let nw = 0, ni = 0;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const j = y * n + x, d = Math.hypot(x - ix, y - iy);
          if (!open[j]) continue;
          hole[j] = d < R ? 1 : 0;
          const acc = d >= R ? white : d < ir * 0.8 ? iris : null;
          if (!acc) continue;
          for (let c = 0; c < 3; c++) acc[c] += src[j * 4 + c];
          if (acc === white) nw++;
          else ni++;
        }
      }
      white.forEach((v, c) => (white[c] = v / Math.max(1, nw)));
      iris.forEach((v, c) => (iris[c] = v / Math.max(1, ni)));

      // paint the iris over: each row of it fades from the white just left of it to the white just right of it
      const avg = (x0, x1, y) => [0, 1, 2].map((c) => {
        let s = 0;
        for (let x = x0; x <= x1; x++) s += src[(y * n + x) * 4 + c];
        return s / (x1 - x0 + 1);
      });
      for (let y = 0; y < n; y++) {
        let h0 = -1, h1 = -1;
        for (let x = 0; x < n; x++) {
          if (!hole[y * n + x]) continue;
          if (h0 < 0) h0 = x;
          h1 = x;
        }
        if (h0 < 0) continue;
        const left = h0 >= 4 && open[y * n + h0 - 3] ? avg(h0 - 4, h0 - 2, y) : null;
        const right = h1 + 4 < n && open[y * n + h1 + 3] ? avg(h1 + 2, h1 + 4, y) : null;
        const c0 = left || right || white, c1 = right || left || white;
        for (let x = h0; x <= h1; x++) {
          const t = (x - h0 + 1) / (h1 - h0 + 2), o = (y * n + x) * 4;
          for (let c = 0; c < 3; c++) base[o + c] = c0[c] * (1 - t) + c1[c] * t;
        }
      }
      // ...then smudged up and down a little, so the rows don't show
      const flat = new Uint8ClampedArray(base);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (!hole[y * n + x]) continue;
          const s = [0, 0, 0];
          let cnt = 0;
          for (let yy = Math.max(0, y - 6); yy <= Math.min(n - 1, y + 6); yy++) {
            for (let xx = Math.max(0, x - 2); xx <= Math.min(n - 1, x + 2); xx++) {
              const o = (yy * n + xx) * 4;
              for (let c = 0; c < 3; c++) s[c] += flat[o + c];
              cnt++;
            }
          }
          for (let c = 0; c < 3; c++) base[(y * n + x) * 4 + c] = s[c] / cnt;
        }
      }

      // all the way = the iris tucked into the outer corner
      let edge = ix;
      const row = Math.round(iy) * n;
      for (let x = 0; x < n; x++) if (open[row + x] && (out < 0 ? x < edge : x > edge)) edge = x;
      return { open, src, base, ix, iy, R, irisColor: iris, full: edge - out * ir * 1.1 - ix };
    }

    // puts the iris back dx pixels to the side of where it was (only where the eye is open)
    function slide(m, dx) {
      const u = m.userData;
      if (Math.abs(u.dx - dx) < 0.5) return;
      u.dx = dx;
      const n = ePx, o = u.outData.data, { src, base, open, ix, iy, R, irisColor } = u;
      o.set(base);
      const cx = ix + dx;
      for (let y = Math.max(0, Math.floor(iy - R - 2)); y < Math.min(n, iy + R + 2); y++) {
        for (let x = Math.max(0, Math.floor(cx - R - 2)); x < Math.min(n, cx + R + 2); x++) {
          const j = y * n + x;
          const a = clamp((R - Math.hypot(x - cx, y - iy)) / 1.5) * open[j];
          if (!a) continue;
          // the part of the iris that was under a lid has nothing to move, so that part is painted iris-colored
          const sx = Math.round(x - dx), has = sx >= 0 && sx < n && open[y * n + sx];
          for (let c = 0; c < 3; c++) o[j * 4 + c] = base[j * 4 + c] * (1 - a) + (has ? src[(y * n + sx) * 4 + c] : irisColor[c]) * a;
        }
      }
      u.ctx.putImageData(u.outData, 0, 0);
      u.tex.needsUpdate = true;
    }

    let popped = false, fitScale = 1;

    return {
      group: root,
      bg: new THREE.Color("#ffde00"),
      fit() {
        // the video gets more of the screen than a photo would (on a phone: almost the whole width)
        fitScale = Math.min(1, (halfW * (intro ? 1.8 : 1.25)) / W, (halfH * (intro ? 1.2 : 1.3)) / H);
      },
      update(p, t) {
        root.scale.setScalar(fitScale);
        const s = fitScale;
        // sits a bit high, so the subtitles don't cover his face
        root.position.y = Math.sin(t * 1.3) * 0.12 + (intro ? halfH * 0.14 : 0.2);
        root.rotation.z = Math.sin(t * 0.7) * 0.04;

        // the video, until it freezes on the cross-eyed frame. frames that haven't loaded yet get skipped
        if (film) {
          film.visible = p < FREEZE;
          // the eye pieces would poke through the video while it wobbles
          eyes[0].visible = eyes[1].visible = !film.visible;
          let i = Math.round(clamp(p / FREEZE) * (intro.frames.length - 1));
          while (i > 0 && !intro.frames[i].naturalWidth) i--;
          if (i !== shown) {
            shown = i;
            film.material.map.image = intro.frames[i];
            film.material.map.needsUpdate = true;
          }
        }

        const out = smooth(0.68, 0.76, p), home = smooth(0.84, 0.93, p);
        // we "fix" the cross-eyes by moving the irises outwards. all the way. now he's cross-eyed the other way
        const fix = smooth(0.41, 0.52, p);
        const fiddle = Math.sin(t * 9) * 0.08 * fix * (1 - fix) * 4; // like someone dragging a slider back and forth
        const panic = smooth(0.57, 0.6, p) * (1 - out) * ePx * 0.015;
        eyes.forEach((m, i) => slide(m, m.userData.full * (fix + fiddle) + Math.sin(t * (29 + i * 2)) * panic));
        if (out > 0.03 && !popped) {
          popped = true;
          sfx.pop();
        }
        if (out < 0.01) popped = false;
        const edge = halfW / s - er * (intro ? 0.6 : 1.5);
        eyes.forEach((m, i) => {
          const sgn = i ? 1 : -1;
          const rest = m.userData.rest, other = eyes[1 - i].userData.rest;
          let x = lerp(rest.x, sgn * edge, out);
          let y = lerp(rest.y, rest.y + 0.4, out) + Math.sin(out * Math.PI) * 1.3 * sgn;
          // on the way back each eye picks the wrong socket
          x = lerp(x, other.x, home);
          y = lerp(y, other.y, home) - Math.sin(home * Math.PI) * 1.8 * sgn;
          const nervous = 1 - out + home * 0.7; // they twitch while they're in the sockets
          x += Math.sin(t * 5.3 + i * 2) * 0.012 * nervous;
          y += Math.cos(t * 4.1 + i) * 0.01 * nervous;
          m.position.set(x, y, 0.02 + Math.sin(out * Math.PI) * 0.6 + Math.sin(home * Math.PI) * (i ? 1.2 : 0.4));
          m.rotation.z = sgn * out * Math.PI * 4 + sgn * t * 1.5 * out * (1 - home) + home * (Math.PI + sgn * Math.PI * 2);
        });
      },
    };
  }

  // ---------- 2. his age, built out of cubes that mostly land where they should ----------
  function buildAge() {
    const group = new THREE.Group();
    const str = String(CONFIG.age);
    const C = 0.55, cols = str.length * 6 - 1;
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const cubes = [];
    [...str].forEach((ch, di) =>
      (DIGITS[ch] || DIGITS[0]).forEach((row, ry) =>
        [...row].forEach((bit, cx) => {
          if (bit !== "1") return;
          const m = new THREE.Mesh(geo, std(new THREE.Color().setHSL(Math.random(), 1, 0.55)));
          const tx = (di * 6 + cx - (cols - 1) / 2) * C, ty = (3 - ry) * C;
          cubes.push({ m, tx, ty, sy: ty + rand(10, 18), delay: rand(0, 0.35), spin: rand(-6, 6), kind: "ok" });
          group.add(m);
        })
      )
    );
    // a few cubes didn't get the memo
    const picks = cubes.map((_, i) => i).sort(() => Math.random() - 0.5);
    ["fall", "crooked", "escape"].forEach((kind, i) => {
      if (picks[i] !== undefined) cubes[picks[i]].kind = kind;
    });
    const fakePct = document.getElementById("fakepct");

    return {
      group,
      bg: new THREE.Color("#00c3ff"),
      fit() {
        group.scale.setScalar(Math.min(1.3, (halfW * 1.7) / (cols * C)));
        group.position.y = 0.2;
      },
      update(p, t) {
        cubes.forEach((c) => {
          const q = clamp((p * 1.7 - c.delay) / 0.55);
          const e = bounce(q);
          let x = c.tx, y = lerp(c.sy, c.ty, e), z = 0, rx = (1 - e) * c.spin, rz = 0;
          if (c.kind === "fall") y = lerp(c.sy, -30, q);
          if (c.kind === "crooked") {
            z = e * 0.3;
            rx += e * 0.5;
            rz = e * 0.4;
          }
          if (c.kind === "escape") {
            const g = smooth(0.6, 0.85, p);
            x += g * 4.5;
            rz = -g * 6;
            y -= Math.max(0, p - 0.85) * 80;
          }
          c.m.position.set(x, y, z);
          c.m.rotation.set(rx, (1 - e) * c.spin * 0.7, rz);
        });
        group.rotation.y = Math.sin(t * 0.8) * 0.3;
        group.rotation.x = -0.12;
        if (fakePct) fakePct.textContent = Math.round(Math.abs(Math.sin(p * 37)) * 99);
      },
    };
  }

  // ---------- the hairline documentary: the forehead grows, the hair leaves, a plane lands on it ----------
  function buildHairline() {
    const f = face.feat, d = f.d;
    const eyeY = (f.L.y + f.R.y) / 2, cx = (f.L.x + f.R.x) / 2;
    const hairY = Math.max(0, f.H.y), browY = Math.max(hairY + 2, eyeY - 0.45 * d);
    const top = Math.max(0, hairY - d), chin = Math.min(face.h, eyeY + 1.8 * d);
    const sx = cx - 1.6 * d, sw = 3.2 * d;
    const MAXF = 7, PX = 128 / d; // output pixels per eye-width
    const W = Math.round(sw * PX);
    const hairH = (hairY - top) * PX, bandH = (browY - hairY) * PX, faceH = (chin - browY) * PX;
    const H = Math.ceil(hairH + bandH * MAXF + faceH);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    const tex = nearest(new THREE.Texture(c));
    const skin = colorAt(face.canvas, cx, (hairY + eyeY) / 2);
    const hairColor = colorAt(face.canvas, cx, Math.max(5, hairY - 0.3 * d));

    // slices: hair on top, the forehead band in the middle (this is the part that grows), face at the bottom
    function draw(F, hairAlpha, runway) {
      g.clearRect(0, 0, W, H);
      const bandNow = bandH * F, yFace = H - faceH, yBand = yFace - bandNow, yHair = yBand - hairH;
      // a skull under the hair, so there's scalp when the hair leaves
      g.fillStyle = skin;
      g.beginPath();
      g.ellipse(W / 2, yBand + 2, W * 0.4, hairH * 0.95 + 2, 0, Math.PI, Math.PI * 2);
      g.fill();
      g.globalAlpha = hairAlpha;
      g.drawImage(face.canvas, sx, top, sw, hairY - top, 0, yHair, W, hairH);
      g.globalAlpha = 1;
      g.drawImage(face.canvas, sx, hairY, sw, browY - hairY, 0, yBand, W, bandNow);
      g.drawImage(face.canvas, sx, browY, sw, chin - browY, 0, yFace, W, faceH);
      if (runway > 0) {
        g.globalAlpha = runway;
        const rw = W * 0.22, rx = W / 2 - rw / 2, ry = yBand + bandNow * 0.05, rh = bandNow * 0.9;
        g.fillStyle = "#3a3a3a";
        g.fillRect(rx, ry, rw, rh);
        g.fillStyle = "#fff";
        g.fillRect(rx + 3, ry, 3, rh);
        g.fillRect(rx + rw - 6, ry, 3, rh);
        for (let y = ry + rw * 0.6; y < ry + rh - 20; y += 34) g.fillRect(W / 2 - 2, y, 4, 18);
        g.font = `bold ${rw * 0.32}px monospace`;
        g.textAlign = "center";
        g.fillText("09", W / 2, ry + rw * 0.4);
        g.globalAlpha = 1;
      }
      tex.needsUpdate = true;
      return { yBand, bandNow };
    }

    const k = 1.25 / 128; // world units per canvas pixel
    const toLocal = (py) => (H / 2 - py) * k;
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.PlaneGeometry(W * k, H * k), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02 })));

    const pc = document.createElement("canvas");
    pc.width = pc.height = 128;
    const pg = pc.getContext("2d");
    pg.font = "100px serif";
    pg.textAlign = "center";
    pg.textBaseline = "middle";
    pg.fillText("✈️", 64, 70);
    const planeTex = new THREE.CanvasTexture(pc);
    planeTex.colorSpace = THREE.SRGBColorSpace;
    const plane = new THREE.Sprite(new THREE.SpriteMaterial({ map: planeTex }));
    group.add(plane);

    // hair falling out
    const HN = 140;
    const strands = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.28, 0.02), new THREE.MeshBasicMaterial({ color: hairColor }), HN);
    strands.frustumCulled = false;
    group.add(strands);
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < HN; i++) strands.setMatrixAt(i, hide);
    const hairs = Array.from({ length: HN }, () => ({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: 0, spin: 0 }));
    const dummy = new THREE.Object3D();
    let lastP = 0, nextHair = 0;

    const yearEl = document.getElementById("hl-year"), cmEl = document.getElementById("hl-cm");
    const thisYear = new Date().getFullYear();

    return {
      group,
      bg: new THREE.Color("#1d1d1d"),
      update(p, t, dt) {
        const F = 1 + (MAXF - 1) * smooth(0.12, 0.7, p);
        const { yBand, bandNow } = draw(F, 1 - 0.9 * smooth(0.35, 0.75, p), smooth(0.72, 0.8, p));
        const contentH = (hairH + bandNow + faceH) * k;
        const s = Math.min(1.3, (halfH * 1.35) / contentH, (halfW * 1.4) / (W * k));
        group.scale.setScalar(s);
        group.position.y = -(-(H * k) / 2 + contentH / 2) * s + 0.15;
        group.rotation.z = Math.sin(t * 0.7) * 0.03;
        yearEl.textContent = Math.round(lerp(thisYear - 7, thisYear + 20, clamp(p)));
        cmEl.textContent = (5.5 * F).toFixed(1) + (HE ? " ס״מ" : " cm");

        // hair only falls while you scroll down. scrolling back up does not bring it back. that's how hair works
        const hairTop = toLocal(yBand);
        if (p > lastP && p > 0.12 && p < 0.8) {
          let n = Math.min(20, Math.ceil((p - lastP) * 600));
          while (n--) {
            const q = hairs[nextHair];
            nextHair = (nextHair + 1) % HN;
            q.alive = true;
            q.pos.set(rand(-0.35, 0.35) * W * k, hairTop + rand(0, hairH * k), 0.05);
            q.vel.set(rand(-0.6, 0.6), rand(0, 1), rand(0, 1.5));
            q.rot = rand(0, 6);
            q.spin = rand(-8, 8);
          }
        }
        lastP = p;
        hairs.forEach((q, i) => {
          if (!q.alive) return;
          q.vel.y -= 6 * dt;
          q.pos.addScaledVector(q.vel, dt);
          q.rot += q.spin * dt;
          if (q.pos.y < (-H * k) / 2 - 3) {
            q.alive = false;
            strands.setMatrixAt(i, hide);
            return;
          }
          dummy.position.copy(q.pos);
          dummy.rotation.set(0, 0, q.rot);
          dummy.updateMatrix();
          strands.setMatrixAt(i, dummy.matrix);
        });
        strands.instanceMatrix.needsUpdate = true;

        // ✈️ comes in, touches down at the top of the runway, rolls down it
        const q = clamp((p - 0.8) / 0.15);
        plane.visible = q > 0;
        if (q > 0) {
          const rwTop = toLocal(yBand + bandNow * 0.12), rwEnd = toLocal(yBand + bandNow * 0.7);
          if (q < 0.6) {
            const a = q / 0.6;
            plane.position.set(lerp(W * k * 1.3, 0, a), lerp(rwTop + 4, rwTop, a * (2 - a)), 0.2);
            plane.material.rotation = Math.PI;
          } else {
            const a = (q - 0.6) / 0.4;
            plane.position.set(0, lerp(rwTop, rwEnd, a * (2 - a)), 0.2);
            plane.material.rotation = -Math.PI * 0.75;
          }
          plane.scale.setScalar(W * k * 0.3 * (1.6 - 0.6 * Math.min(1, q / 0.6)));
          if (q > 0.9) dispatchEvent(new CustomEvent("achievement", { detail: "hairline" }));
        }
      },
    };
  }

  // ---------- physics vs money: the {name} dollar, worth $0, obeying gravity, leaving him ----------
  function buildMoney() {
    const group = new THREE.Group();
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 112;
    const g = c.getContext("2d");
    g.fillStyle = "#85bb65";
    g.fillRect(0, 0, 256, 112);
    g.strokeStyle = g.fillStyle = "#2e5d1f";
    g.lineWidth = 6;
    g.strokeRect(6, 6, 244, 100);
    g.font = "bold 30px Georgia, serif";
    g.fillText("$0", 16, 42);
    g.textAlign = "right";
    g.fillText("$0", 240, 98);
    g.save();
    g.beginPath();
    g.ellipse(128, 56, 34, 42, 0, 0, Math.PI * 2);
    g.clip();
    g.drawImage(head.canvas, 86, 14, 84, 84);
    g.restore();
    g.beginPath();
    g.ellipse(128, 56, 34, 42, 0, 0, Math.PI * 2);
    g.stroke();
    const mat = new THREE.MeshBasicMaterial({ map: nearest(new THREE.Texture(c)), side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(1.6, 0.7);
    const bills = Array.from({ length: 36 }, () => {
      const m = new THREE.Mesh(geo, mat);
      group.add(m);
      return { m, speed: rand(0.8, 2), ph: rand(0, 6), sway: rand(0.5, 1.5) };
    });
    const place = (b, anywhere) => {
      const z = rand(-8, 1), depth = (10 - z) / 10;
      b.m.position.set(rand(-1.1, 1.1) * halfW * depth, anywhere ? rand(-1, 1) * halfH * depth : halfH * depth + rand(1, 4), z);
    };
    return {
      group,
      bg: new THREE.Color("#0b3d0b"),
      fit() {
        bills.forEach((b) => place(b, true));
      },
      update(p, t, dt) {
        bills.forEach((b) => {
          b.m.position.y -= b.speed * dt;
          b.m.position.x += Math.sin(t * b.sway + b.ph) * dt * 0.8;
          b.m.rotation.set(Math.sin(t * 2 + b.ph) * 1.2, t * 0.5 + b.ph, Math.sin(t * 1.3 + b.ph) * 0.6);
          if (b.m.position.y < (-halfH * (10 - b.m.position.z)) / 10 - 2) place(b, false);
        });
      },
    };
  }

  // ---------- enemies to lovers. they shake with rage, then drift together, then 💋 ----------
  function buildLove() {
    const group = new THREE.Group();
    const R = 1.6;
    const disc = (canvas) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(R, 14), new THREE.MeshBasicMaterial({ map: nearest(new THREE.Texture(canvas)), side: THREE.DoubleSide }));
      group.add(m);
      return m;
    };
    const him = disc(head.canvas), them = disc(enemy);
    const heartGeo = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.25, bevelEnabled: false, curveSegments: 3 });
    heartGeo.center();
    const big = new THREE.Mesh(heartGeo, std("#ff2266"));
    big.scale.setScalar(0);
    group.add(big);
    const hearts = Array.from({ length: 22 }, (_, i) => {
      const m = new THREE.Mesh(heartGeo, std(i % 2 ? "#ff5fa2" : "#ff2a4d"));
      group.add(m);
      return { m, x: rand(-1, 1), y: rand(0, 2), sp: rand(0.6, 1.6), ph: rand(0, 6) };
    });
    const angryBg = new THREE.Color("#3a0505"), loveBg = new THREE.Color("#ff9fcf");
    const bg = angryBg.clone();
    const pop = new Wobbly(0);
    let kissed = false;

    return {
      group,
      bg,
      update(p, t, dt) {
        // when the leaked photo + invite show up at the bottom, the two of them shrink out of the way up top
        const aside = smooth(0.66, 0.72, p);
        const s = Math.min(1, (halfW * 0.92) / (R * 2.1)) * (1 - 0.45 * aside);
        group.scale.setScalar(s);
        group.position.y = aside * (halfH - R * s - 0.9);
        const lw = halfW / s, lh = halfH / s;
        const love = smooth(0.3, 0.56, p), angry = 1 - smooth(0.26, 0.34, p), lean = smooth(0.5, 0.58, p);
        const gap = lerp(lw - R * 1.05, R * 0.92, love);
        const shake = () => (Math.random() - 0.5) * 0.18 * angry;
        him.position.set(-gap + shake(), Math.sin(t * 2) * 0.1 + shake(), 0);
        them.position.set(gap + shake(), Math.cos(t * 2) * 0.1 + shake(), 0.01);
        him.rotation.set(0, 0.45 * lean, -0.2 * lean);
        them.rotation.set(0, -0.45 * lean, 0.2 * lean);
        for (const m of [him, them]) m.material.color.setRGB(1, 1 - 0.3 * love, 1 - 0.2 * love);
        bg.copy(angryBg).lerp(loveBg, love);
        if (p > 0.57 && !kissed) {
          kissed = true;
          sfx.kiss();
          boomFx();
          dispatchEvent(new CustomEvent("achievement", { detail: "love" }));
        }
        if (p < 0.5) kissed = false;
        big.scale.setScalar(Math.max(0, pop.update(p > 0.57 ? 1.3 : 0, dt)));
        big.position.set(0, R * 1.25, 0.6);
        big.rotation.y = t * 2.5;
        hearts.forEach((h) => {
          h.m.visible = love > 0.02;
          const y = ((h.y + t * h.sp * 0.25) % 2) - 1;
          h.m.position.set(h.x * lw * 0.95, y * lh * 1.1, -1 - (h.ph % 2));
          h.m.rotation.set(0, t * h.sp + h.ph, Math.sin(t + h.ph) * 0.3);
          h.m.scale.setScalar(love * 0.6);
        });
      },
    };
  }

  // ---------- the boxing ring behind him vs dad ----------
  function buildRing() {
    const group = new THREE.Group();
    const ring = new THREE.Group();
    ring.position.y = -3;
    ring.rotation.x = 0.3;
    group.add(ring);
    ring.add(new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 8), std("#2a4bd7")));
    const corners = [[-4, -4], [4, -4], [4, 4], [-4, 4]];
    const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.4, 6);
    corners.forEach(([x, z], i) => {
      const m = new THREE.Mesh(postGeo, std(i % 2 ? "#e02020" : "#2050e0"));
      m.position.set(x, 1.2, z);
      ring.add(m);
    });
    const ropeMat = new THREE.LineBasicMaterial({ color: "#ffffff" });
    for (const y of [0.9, 1.5, 2.1]) {
      ring.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(corners.map(([x, z]) => new THREE.Vector3(x, y, z))), ropeMat));
    }
    return {
      group,
      bg: new THREE.Color("#1a0505"),
      fit() {
        ring.scale.setScalar(Math.min(1, halfW / 5));
      },
      update(p, t) {
        ring.rotation.y = t * 0.3;
      },
    };
  }

  // ---------- it's raining him (behind the memes, gallery + reviews) ----------
  function buildRain() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ map: nearest(new THREE.Texture(head.canvas)) });
    const geo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
    const drops = Array.from({ length: 34 }, () => {
      const m = new THREE.Mesh(geo, mat);
      group.add(m);
      return { m, speed: rand(1.5, 4), spin: new THREE.Vector3(rand(-2, 2), rand(-2, 2), rand(-2, 2)) };
    });
    const place = (d, anywhere) => {
      const z = rand(-10, 0), depth = (10 - z) / 10;
      d.m.position.set(rand(-1.1, 1.1) * halfW * depth, anywhere ? rand(-1, 1) * halfH * depth : halfH * depth + rand(1, 6), z);
    };
    return {
      group,
      bg: new THREE.Color("#7cfc00"),
      fit() {
        drops.forEach((d) => place(d, true));
      },
      update(p, t, dt) {
        drops.forEach((d) => {
          d.m.position.y -= d.speed * dt;
          d.m.rotation.x += d.spin.x * dt;
          d.m.rotation.y += d.spin.y * dt;
          d.m.rotation.z += d.spin.z * dt;
          if (d.m.position.y < (-halfH * (10 - d.m.position.z)) / 10 - 2) place(d, false);
        });
      },
    };
  }

  // ---------- behind BabyGen: pastel blobs, blurred (see #gl.soft) into one of those AI-landing-page gradients ----------
  function buildOrbs() {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(1, 24, 16);
    const orbs = ["#c4b5fd", "#f9a8d4", "#fbcfe8", "#a5b4fc", "#fde68a", "#ddd6fe"].map((color, i) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
      group.add(m);
      return { m, r: rand(1.8, 3.2), a: (i / 6) * Math.PI * 2, rx: rand(0.5, 0.9), ry: rand(0.4, 0.8), sp: rand(0.6, 1.2) };
    });
    const pulse = new Wobbly(1);
    let busy = false, target = 1, spin = 0;

    return {
      group,
      bg: new THREE.Color("#f5f0ff"),
      // "busy" while the baby generates, "break" when it's revealed
      setMode(mode) {
        busy = mode === "busy";
        if (mode === "break") {
          target = 1.5;
          setTimeout(() => (target = 1), 600);
        }
      },
      update(p, t, dt) {
        spin += dt * (busy ? 1.6 : 0.25);
        const s = pulse.update(target, dt);
        orbs.forEach((o) => {
          const a = o.a + spin * o.sp;
          o.m.position.set(Math.cos(a) * halfW * o.rx, Math.sin(a * 1.3) * halfH * o.ry, -2);
          o.m.scale.setScalar(o.r * s);
        });
      },
    };
  }

  // ---------- 5. balloons, then the big finale ----------
  function buildWish() {
    const group = new THREE.Group();
    const bg = new THREE.Color("#1b0b3a");
    const balloonGeo = new THREE.SphereGeometry(0.7, 7, 5);
    const stringMat = new THREE.LineBasicMaterial({ color: "#ffffff" });
    const balloons = Array.from({ length: 10 }, (_, i) => {
      const b = new THREE.Group();
      const ball = new THREE.Mesh(balloonGeo, std(new THREE.Color().setHSL(i / 10, 0.9, 0.55)));
      ball.scale.set(1, 1.2, 1);
      const string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.84, 0), new THREE.Vector3(0.15, -2.2, 0), new THREE.Vector3(-0.1, -3.4, 0)]), stringMat);
      b.add(ball, string);
      group.add(b);
      return { b, x: rand(-1, 1), y: rand(-0.8, 0.8), z: rand(-6, -1), ph: rand(0, 6) };
    });

    let font = null;
    if (HE) {
      // the hebrew site gets a hebrew font (helvetiker only knows english letters)
      import("three/addons/loaders/TTFLoader.js")
        .then(({ TTFLoader }) => new TTFLoader().load(HE_FONT_URL, (json) => (font = new Font(json)), undefined, () => {}))
        .catch(() => {});
    } else new FontLoader().load(FONT_URL, (f) => (font = f), undefined, () => {});

    function textMesh(str, size) {
      if (font && (HE || /^[\x20-\x7E]+$/.test(str))) {
        // three.js lays letters out left to right, so hebrew goes in back to front
        const geo = new TextGeometry(HE ? [...str].reverse().join("") : str.toUpperCase(), { font, size, height: size * 0.5, curveSegments: 2, bevelEnabled: true, bevelThickness: size * 0.06, bevelSize: size * 0.04, bevelSegments: 1 });
        geo.center();
        return new THREE.Mesh(geo, new THREE.MeshNormalMaterial({ flatShading: true }));
      }
      // font didn't load, or the name uses letters the font doesn't know: flat sticker it is
      const c = document.createElement("canvas");
      const g = c.getContext("2d");
      const fs = 120, fontCss = `${fs}px Impact, Anton, "Secular One", sans-serif`;
      g.font = fontCss;
      c.width = Math.ceil(g.measureText(str).width) + 40;
      c.height = fs * 1.4;
      g.font = fontCss;
      g.direction = HE ? "rtl" : "ltr";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.lineWidth = 10;
      g.strokeStyle = "#000";
      g.fillStyle = "#fff";
      g.strokeText(str, c.width / 2, c.height / 2);
      g.fillText(str, c.width / 2, c.height / 2);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const h = size * 1.4;
      return new THREE.Mesh(new THREE.PlaneGeometry((h * c.width) / c.height, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    }

    const CN = 600;
    const confetti = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.15), new THREE.MeshNormalMaterial(), CN);
    confetti.frustumCulled = false;
    confetti.visible = false;
    group.add(confetti);
    const cp = new Float32Array(CN * 3), cv = new Float32Array(CN * 3), cr = new Float32Array(CN * 3);
    const dummy = new THREE.Object3D();

    let text = null;
    const pop = new Wobbly(0);

    function finale() {
      if (text) return 0;
      text = new THREE.Group();
      const l1 = textMesh(HE ? "יום הולדת שמח" : "HAPPY BIRTHDAY", 1), l2 = textMesh(`${CONFIG.name}!!1!`, 1.25);
      l1.position.y = 1.1;
      l2.position.y = -0.9;
      text.add(l1, l2);
      const box = new THREE.Box3().setFromObject(text);
      text.userData.w = box.max.x - box.min.x;
      text.scale.setScalar(0);
      group.add(text);
      for (let i = 0; i < CN; i++) {
        const th = rand(0, Math.PI * 2), ph = Math.acos(rand(-1, 1)), sp = rand(3, 13);
        cp.set([0, 0, 1], i * 3);
        cv.set([Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp + 4, Math.sin(ph) * Math.sin(th) * sp * 0.5], i * 3);
        cr.set([rand(0, 6), rand(0, 6), rand(0, 6)], i * 3);
      }
      confetti.visible = true;
      sfx.tada();
      return sfx.happyBirthday(1);
    }

    return {
      group,
      bg,
      finale,
      update(p, t, dt) {
        balloons.forEach((b) => {
          const depth = (10 - b.z) / 10;
          b.b.position.set(b.x * halfW * depth * 0.9, b.y * halfH * depth + Math.sin(t + b.ph) * 0.3, b.z);
          b.b.rotation.z = Math.sin(t * 0.8 + b.ph) * 0.15;
        });
        if (!text) return;
        bg.setHSL((t * 0.03) % 1, 0.65, 0.25);
        text.scale.setScalar(Math.max(0, pop.update(1, dt)) * Math.min(1, (halfW * 1.55) / text.userData.w));
        text.rotation.y = Math.sin(t * 1.4) * 0.5;
        text.rotation.x = Math.sin(t * 0.9) * 0.15;
        text.children[1].rotation.z = Math.sin(t * 3) * 0.08;
        for (let i = 0; i < CN; i++) {
          const j = i * 3;
          cv[j + 1] = Math.max(cv[j + 1] - 7 * dt, -5);
          cv[j] *= 0.985;
          cv[j + 2] *= 0.985;
          cp[j] += cv[j] * dt;
          cp[j + 1] += cv[j + 1] * dt;
          cp[j + 2] += cv[j + 2] * dt;
          if (cp[j + 1] < -halfH - 2) {
            // recycle as gentle falling confetti
            cp.set([rand(-1.2, 1.2) * halfW, halfH + rand(0.5, 4), rand(-3, 2)], j);
            cv.set([rand(-0.5, 0.5), rand(-2, 0), 0], j);
          }
          cr[j] += dt * 4;
          cr[j + 1] += dt * 3;
          dummy.position.set(cp[j], cp[j + 1], cp[j + 2]);
          dummy.rotation.set(cr[j], cr[j + 1], cr[j + 2]);
          dummy.updateMatrix();
          confetti.setMatrixAt(i, dummy.matrix);
        }
        confetti.instanceMatrix.needsUpdate = true;
      },
    };
  }

  const scenes = {
    face: buildFace(),
    age: buildAge(),
    hairline: buildHairline(),
    money: buildMoney(),
    orbs: buildOrbs(),
    love: buildLove(),
    fight: buildRing(),
    rain: buildRain(),
    wish: buildWish(),
  };
  for (const s of Object.values(scenes)) {
    s.group.visible = false;
    scene.add(s.group);
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    halfH = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    halfW = halfH * camera.aspect;
    for (const s of Object.values(scenes)) s.fit?.();
  }
  addEventListener("resize", resize);
  resize();

  // each section with data-scene drives one of the scenes above; its [data-a]/[data-b] children are captions
  const sections = [...document.querySelectorAll("[data-scene]")];
  const toggles = sections.map((s) => [...s.querySelectorAll("[data-a]")]);
  const eased = sections.map(() => 0); // each section's progress, eased so the 3D glides instead of jumping
  let active = null, last = 0, t = 0, shakeT = 0, cur = -1, curP = 0;
  let freezeUntil = 0, nextFreeze = performance.now() + rand(8000, 15000);

  // a thud + the 3D shakes. captions with data-boom do this when they show up
  function boomFx() {
    sfx.boom();
    shakeT = 0.3;
  }

  // runs every frame (not at the janky 3D framerate) so the text always keeps up with your scrolling
  function captions() {
    const mid = innerHeight / 2;
    cur = -1;
    sections.forEach((sec, i) => {
      const r = sec.getBoundingClientRect();
      const span = r.height - innerHeight;
      const p = span > 0 ? clamp(-r.top / span) : clamp((mid - r.top) / r.height);
      const onScreen = r.top < innerHeight && r.bottom > 0;
      for (const el of toggles[i]) {
        const on = onScreen && p >= +el.dataset.a && p < +el.dataset.b;
        if (on && !el.classList.contains("on") && "boom" in el.dataset) boomFx();
        el.classList.toggle("on", on);
      }
      if (r.top <= mid && r.bottom > mid) {
        cur = i;
        curP = p;
      }
    });
  }

  function frame(now) {
    requestAnimationFrame(frame);
    captions();
    if (CONFIG.lagSpikes && now > nextFreeze) {
      freezeUntil = now + rand(200, 550);
      nextFreeze = now + rand(8000, 16000);
    }
    if (now < freezeUntil || now - last < 1000 / CONFIG.fps) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    t += dt;

    if (cur >= 0) {
      const s = scenes[sections[cur].dataset.scene];
      if (s !== active) {
        if (active) active.group.visible = false;
        active = s;
        s.group.visible = true;
        scene.background = s.bg;
        canvas.classList.toggle("soft", s === scenes.orbs);
      }
      eased[cur] += (curP - eased[cur]) * Math.min(1, dt * 10);
      s.update(eased[cur], t, dt);
    }
    // the camera was never quite level
    shakeT = Math.max(0, shakeT - dt);
    camera.rotation.z = 0.02 + Math.sin(t * 0.5) * 0.012;
    camera.position.x = (Math.random() - 0.5) * (0.02 + shakeT * 1.5);
    camera.position.y = shakeT ? (Math.random() - 0.5) * shakeT * 1.5 : 0;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return { finale: scenes.wish.finale, orbs: scenes.orbs.setMode, boom: boomFx };
}

const face = await loadFace();
if (new URLSearchParams(location.search).has("calibrate")) {
  const { runCalibrator } = await import("./calibrate.js");
  runCalibrator(face);
} else {
  const head = cropHead(face);
  const [enemy, intro] = await Promise.all([loadSquare(CONFIG.enemy.photo), loadIntro()]);
  initUI(face, head, start(face, head, enemy, intro));
}
