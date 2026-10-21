import { CONFIG } from "./config.js";

// classic meme formats, rebuilt from scratch so they can all star his face

const rand = (a, b) => a + Math.random() * (b - a);
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

const MAKERS = {
  drake(fig, m, head, f) {
    fig.innerHTML = `
      <div class="drow"><div class="dimg"><img class="meh" src="${head.url}" alt=""><span>✋</span></div><p>${esc(f(m.no))}</p></div>
      <div class="drow"><div class="dimg"><img src="${head.url}" alt=""><span>👉</span></div><p>${esc(f(m.yes))}</p></div>`;
  },

  lasers(fig, m, head, f) {
    const pct = (v) => (v / head.size) * 100 + "%";
    const eyes = [head.L, head.R].map((e) => `<i class="laser" style="left:${pct(e.x)};top:${pct(e.y)}"></i>`).join("");
    fig.innerHTML = `<div class="mimg"><img src="${head.url}" alt="">${eyes}<p class="mt">${esc(f(m.top))}</p><p class="mb">${esc(f(m.bottom))}</p></div>`;
  },

  stonks(fig, m, head, f) {
    const c = document.createElement("canvas");
    c.width = 480;
    c.height = 400;
    const g = c.getContext("2d");
    const bg = g.createLinearGradient(0, 0, 0, 400);
    bg.addColorStop(0, "#0a1a4a");
    bg.addColorStop(1, "#1d4bb5");
    g.fillStyle = bg;
    g.fillRect(0, 0, 480, 400);
    g.strokeStyle = "rgba(255, 255, 255, 0.15)";
    g.lineWidth = 1;
    for (let x = 0; x < 480; x += 40) g.strokeRect(x, 0, 40, 400);
    for (let y = 0; y < 400; y += 40) g.strokeRect(0, y, 480, 40);

    const COLOR = { up: "#22ff55", down: "#ff3344", flat: "#bbbbbb" };
    const STEP = { up: -14, down: 14, flat: 0 };
    const ICON = { up: "📈", down: "📉", flat: "➖" };
    m.lines.forEach(([label, dir], i) => {
      g.strokeStyle = COLOR[dir];
      g.lineWidth = 5;
      g.beginPath();
      let y = { up: 320 - i * 10, down: 110 + i * 12, flat: 220 + i * 6 }[dir];
      g.moveTo(20, y);
      for (let x = 50; x <= 460; x += 30) {
        y += STEP[dir] + rand(-15, 15);
        g.lineTo(x, y);
      }
      g.stroke();
      g.font = '26px Impact, Anton, "Secular One", sans-serif';
      g.fillStyle = COLOR[dir];
      g.fillText(`${ICON[dir]} ${f(label).toUpperCase()}`, 18, 36 + i * 32);
    });
    g.save();
    g.beginPath();
    g.arc(390, 300, 72, 0, Math.PI * 2);
    g.clip();
    g.drawImage(head.canvas, 318, 228, 144, 144);
    g.restore();
    g.font = "72px Impact, Anton, sans-serif";
    g.lineWidth = 8;
    g.strokeStyle = "#000";
    g.fillStyle = "#fff";
    g.strokeText("STONKS", 22, 382);
    g.fillText("STONKS", 22, 382);
    fig.append(c);
  },

  brain(fig, m, head, f) {
    const last = m.steps.length - 1;
    fig.innerHTML = m.steps
      .map((s, i) => `<div class="brow b${Math.min(i, 3)}"><p>${esc(f(s))}</p><div class="bimg">${i === last ? `<img src="${head.url}" alt="">` : "🧠"}</div></div>`)
      .join("");
  },

  fine(fig, m, head, f) {
    const fires = Array.from({ length: 14 }, () => `<span class="flame" style="left:${rand(-5, 92)}%;top:${rand(-5, 72)}%;font-size:${rand(7, 15)}cqw">🔥</span>`).join("");
    fig.innerHTML = `<div class="room">${fires}<img src="${head.url}" alt=""><span class="mug">☕</span><span class="bubble">this is fine.</span></div><p class="mcap">${esc(f(m.caption))}</p>`;
  },

  wanted(fig, m, head, f) {
    fig.innerHTML = `<h3>WANTED</h3><p class="dead">DEAD OR ALIVE (preferably on time)</p><img src="${head.url}" alt=""><p class="crime">for: ${esc(f(m.crime))}</p><p class="reward">REWARD: ${esc(f(m.reward))}</p>`;
  },

  // the startup pitch vs what actually happened
  expect(fig, m, head, f) {
    const list = (items) => items.map((s) => `<li>${esc(f(s))}</li>`).join("");
    fig.innerHTML = `
      <div class="ex-panel ex-dream">
        <span class="ex-label">EXPECTATION</span>
        <div class="ex-art"><span class="ex-sparkle">✨</span><img src="${head.url}" alt=""><span class="ex-rocket">🚀</span></div>
        <ul>${list(m.expectation)}</ul>
      </div>
      <div class="ex-panel ex-real">
        <span class="ex-label">REALITY</span>
        <div class="ex-art"><img src="${head.url}" alt=""><span class="ex-bin">🗑️</span><span class="ex-fire">🔥</span></div>
        <ul>${list(m.reality)}</ul>
      </div>`;
  },

  // his complete friends list, all of it
  friends(fig, m, head, f) {
    fig.innerHTML = `
      <div class="fr-head"><b>Friends · ${m.count}</b><span>See all (this is all)</span></div>
      <img class="fr-photo" src="${esc(m.photo)}" alt="" loading="lazy">
      <p class="fr-caption">${esc(f(m.caption))}</p>
      <button class="fr-add">＋ Add friend</button>`;
    const add = fig.querySelector(".fr-add");
    add.onclick = () => {
      add.textContent = f(m.limit);
      add.disabled = true;
    };
  },

  // a deeply professional social media post
  post(fig, m, head, f) {
    const comments = m.comments.map(([who, said]) => `<div class="ps-comment"><b>${esc(f(who))}</b>${esc(f(said))}</div>`).join("");
    fig.innerHTML = `
      <div class="ps-head">
        <img src="${head.url}" alt="">
        <div><b>${esc(CONFIG.memeName)}</b><small>${esc(f(m.headline))}</small><small>1h · 🌐</small></div>
        <span class="ps-follow">+ Follow</span>
      </div>
      <p class="ps-text">${esc(f(m.text))}<br><span class="ps-tags">${esc(f(m.tags))}</span></p>
      <img class="ps-photo" src="${esc(m.photo)}" alt="" loading="lazy">
      <div class="ps-count">👍❤️👏 ${esc(m.reactions)} · ${m.comments.length} comments</div>
      <div class="ps-actions"><span>👍 Like</span><span>💬 Comment</span><span>🔁 Repost</span><span>➤ Send</span></div>
      ${comments}`;
  },

  // a lost-item poster taped to a lamppost, tear-off tabs and all
  missing(fig, m, head, f) {
    const suffix = [11, 12, 13].includes(m.count % 100) ? "th" : { 1: "st", 2: "nd", 3: "rd" }[m.count % 10] || "th";
    const tabs = Array.from({ length: 7 }, (_, i) => `<span${i === 2 || i === 5 ? ' class="torn"' : ""}>${esc(f(m.tab))}</span>`).join("");
    fig.innerHTML = `
      <div class="ms-paper">
        <h3>MISSING</h3>
        <p class="ms-what">${esc(f(m.item))} <small>(the ${m.count}${suffix} one)</small></p>
        <div class="ms-pic">
          ${m.photo ? `<img class="ms-photo" src="${esc(m.photo)}" alt="" loading="lazy">` : `<span class="ms-emoji">${m.emoji}</span>`}
          <span class="ms-count">#${m.count}</span>
          <figure class="ms-owner"><img src="${head.url}" alt=""><figcaption>owner, not coping</figcaption></figure>
        </div>
        <p class="ms-line"><b>last seen:</b> ${esc(f(m.seen))}</p>
        <p class="ms-line">${esc(f(m.plea))}</p>
        <p class="ms-reward">REWARD: ${esc(f(m.reward))}</p>
      </div>
      <div class="ms-tabs">${tabs}</div>`;
  },

  ejected(fig, m, head, f) {
    fig.innerHTML = `<img src="${head.url}" alt=""><p>${esc(f(m.text))}</p><p class="ej-sub">${esc(f(m.sub))}</p>`;
  },
};

export function buildMemes(grid, head, fmt) {
  // the memes are in english on both sites, so his name inside them is the english one
  const f = (s) => fmt(String(s).replace(/\{name\}/g, CONFIG.memeName));
  for (const m of CONFIG.memes) {
    const make = MAKERS[m.type];
    if (!make) continue;
    const fig = document.createElement("figure");
    fig.className = `meme meme-${m.type}`;
    fig.style.setProperty("--r", rand(-3, 3).toFixed(1) + "deg");
    make(fig, m, head, f);
    grid.append(fig);
  }
}
