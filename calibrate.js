import { measure } from "./face.js";

// open the site with ?calibrate to click where his eyes + mouth are, and get the numbers for config.js
export function runCalibrator(face) {
  document.getElementById("loader")?.remove();
  document.body.classList.add("locked");
  const box = document.createElement("div");
  box.id = "calib";
  box.innerHTML = `
    <h2>face calibrator 9000</h2>
    <p id="calib-step"></p>
    <div class="calib-img"><img alt="his face"></div>
    <div><pre id="calib-out" hidden></pre></div>
    <p><button class="btn98" id="calib-reset">↺ start over</button> <button class="btn98" id="calib-copy" hidden>📋 copy</button></p>`;
  document.body.append(box);

  const img = box.querySelector("img");
  const wrap = box.querySelector(".calib-img");
  const stepEl = box.querySelector("#calib-step");
  const out = box.querySelector("#calib-out");
  const copy = box.querySelector("#calib-copy");
  img.src = face.url;

  const asks = [
    "click the middle of the eye on the LEFT side of the photo",
    "now the other eye",
    "now the middle of the mouth",
    "now the top of his forehead (where the hair starts. or used to.)",
  ];
  const r3 = (v) => Math.round(v * 1000) / 1000;
  let pts = [];

  const mark = (cls, styles) => {
    const d = document.createElement("div");
    d.className = cls;
    Object.assign(d.style, styles);
    wrap.append(d);
  };
  const pct = (v, of) => (v / of) * 100 + "%";

  function render() {
    wrap.querySelectorAll(".calib-dot, .calib-hole").forEach((n) => n.remove());
    pts.forEach((p) => mark("calib-dot", { left: p.x * 100 + "%", top: p.y * 100 + "%" }));
    if (pts.length < asks.length) {
      stepEl.textContent = (face.placeholder ? "⚠️ no face.jpg found yet, so this is the placeholder. " : "") + `${pts.length + 1}/${asks.length}: ${asks[pts.length]}`;
      out.hidden = copy.hidden = true;
      return;
    }
    const [L, R, M, H] = pts;
    const f = measure(face.w, face.h, L, R, M, H);
    for (const e of [f.L, f.R]) {
      mark("calib-hole", { left: pct(e.x - f.eyeR, face.w), top: pct(e.y - f.eyeR, face.h), width: pct(f.eyeR * 2, face.w), height: pct(f.eyeR * 2, face.h), borderRadius: "50%" });
    }
    mark("calib-hole", { left: pct(f.M.x - f.mouthW / 2, face.w), top: pct(f.M.y - f.mouthH / 2, face.h), width: pct(f.mouthW, face.w), height: pct(f.mouthH, face.h) });

    mark("calib-hole", { left: "0", width: "100%", top: pct(f.H.y, face.h), height: "0" });

    const snippet = `leftEye: { x: ${r3(L.x)}, y: ${r3(L.y)} },\nrightEye: { x: ${r3(R.x)}, y: ${r3(R.y)} },\nmouth: { x: ${r3(M.x)}, y: ${r3(M.y)} },\nhairline: { x: ${r3(H.x)}, y: ${r3(H.y)} },`;
    out.textContent = snippet;
    out.hidden = copy.hidden = false;
    stepEl.textContent =
      "done! the green dashed shapes get cut out. paste this into config.js over the old lines, save, and open the site without ?calibrate. holes too big/small? change eyeSize / mouthSize in config.js";
    copy.onclick = () => navigator.clipboard?.writeText(snippet).then(() => (copy.textContent = "✅ copied"));
  }

  img.addEventListener("click", (e) => {
    if (pts.length >= asks.length) return;
    const r = img.getBoundingClientRect();
    pts.push({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    render();
  });
  box.querySelector("#calib-reset").onclick = () => {
    pts = [];
    copy.textContent = "📋 copy";
    render();
  };
  render();
}
