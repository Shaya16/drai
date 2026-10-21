import { CONFIG } from "./config.js";
import * as sfx from "./audio.js";
import { t } from "./lang.js";

// him vs dad, street fighter style, on top of the real video

const rand = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function initFight(head, fmt, { boom, achieve }) {
  const cfg = CONFIG.fight;
  const $ = (id) => document.getElementById(id);
  const video = $("fight-video"), stage = $("fight-stage"), msg = $("fight-msg"), btn = $("fight-start");
  const hpHim = $("hp-him"), hpDad = $("hp-dad"), timer = $("fight-timer"), novideo = $("fight-novideo");

  $("fc-him").src = head.url;
  if (cfg.opponentPhoto) {
    const img = new Image();
    img.alt = "";
    img.onload = () => $("fc-opp").replaceChildren(img);
    img.src = cfg.opponentPhoto;
  }
  document.querySelectorAll(".opp-nm").forEach((e) => (e.textContent = cfg.opponent));
  $("fc-title").textContent = fmt(cfg.title);

  let hasVideo = false;
  video.addEventListener("loadedmetadata", () => {
    hasVideo = true;
    video.hidden = false;
    novideo.hidden = true;
  });
  video.addEventListener("error", () => {
    hasVideo = false;
    video.hidden = true;
    novideo.hidden = false;
  });
  // the video is the heaviest thing on the site, so it only starts loading when you get close to it
  const loadVideo = () => {
    if (!video.getAttribute("src")) video.src = cfg.video;
  };
  new IntersectionObserver((entries, io) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    loadVideo();
  }, { rootMargin: "1200px 0px" }).observe(stage);
  // a quick tap on ROUND 1 waits for the tape instead of fighting without it
  const videoReady = () =>
    new Promise((resolve) => {
      if (hasVideo || video.error) return resolve();
      loadVideo();
      const done = () => {
        clearTimeout(timeout);
        resolve();
      };
      const timeout = setTimeout(done, 15000);
      video.addEventListener("loadedmetadata", done, { once: true });
      video.addEventListener("error", done, { once: true });
    });

  const say = (text, cls = "") => {
    msg.textContent = text;
    msg.className = `fight-msg ${cls}`;
    msg.style.setProperty("--r", cls === "hit" ? rand(-10, 10).toFixed(1) + "deg" : "0deg");
    void msg.offsetWidth;
    msg.classList.add("pop");
  };
  const shake = () => {
    stage.classList.remove("quake");
    void stage.offsetWidth;
    stage.classList.add("quake");
  };

  let running = false;
  btn.onclick = async () => {
    if (running) return;
    running = true;
    btn.hidden = true;
    // phones only let a video play with sound if it's started right from the tap, so it's started (and paused) now
    sfx.initAudio();
    loadVideo();
    video.muted = sfx.isMuted();
    let rolling = false; // (a slow tape could finish starting after the fight already started it for real)
    video.play().then(() => rolling || video.pause(), () => {});
    if (!hasVideo) {
      say(t("LOADING TAPE…", "טוען קלטת…"));
      await videoReady();
    }
    let him = 100, dad = 100, comeback = false;
    const setHp = () => {
      hpHim.style.width = him + "%";
      hpDad.style.width = dad + "%";
    };
    const pick = (list) => fmt(list[(Math.random() * list.length) | 0]);
    setHp();
    timer.textContent = "99";

    say("ROUND 1", "big");
    sfx.announce("Round one");
    await sleep(1500);
    say("FIGHT!", "big");
    sfx.announce("Fight!");
    boom();
    await sleep(800);
    say("");

    if (hasVideo) {
      rolling = true;
      video.currentTime = 0;
      video.muted = sfx.isMuted();
      // still not allowed with sound? then at least the fight goes on, without it
      await video.play().catch(() => {
        video.muted = true;
        return video.play();
      }).catch(() => {});
    }
    // if the video didn't start after all, the fight just runs on a clock
    const playing = hasVideo && !video.paused;
    const dur = playing && isFinite(video.duration) ? video.duration : 10;
    const t0 = performance.now();
    let nextHit = t0 + rand(800, 1600);
    await new Promise((done) => {
      const iv = setInterval(() => {
        const now = performance.now();
        const prog = Math.min(1, (playing ? video.currentTime : (now - t0) / 1000) / dur);
        timer.textContent = String(Math.max(0, 99 - Math.floor(prog * 99))).padStart(2, "0");
        // the first half belongs to dad's ego. then the comeback
        if (!comeback && prog >= 0.45) {
          comeback = true;
          say(fmt(cfg.comeback), "big");
          boom();
          shake();
          nextHit = now + 1400;
        }
        if (now > nextHit && prog < 0.95) {
          nextHit = now + rand(900, 1800);
          if (comeback ? Math.random() < 0.85 : Math.random() < 0.2) {
            dad = Math.max(8, dad - (comeback ? rand(10, 18) : rand(4, 8)));
            say(pick(cfg.draiHits), "hit");
          } else if (comeback && Math.random() < 0.5) {
            say(t(`${cfg.opponent} attacks... MISS!`, `${cfg.opponent} תוקף... פספס!`), "hit");
          } else {
            him = Math.max(25, him - rand(5, 13));
            say(pick(cfg.dadHits), "hit");
          }
          shake();
          setHp();
        }
        if (prog >= 1 || (playing && video.ended)) {
          clearInterval(iv);
          done();
        }
      }, 100);
    });

    dad = 0;
    setHp();
    say("K.O.", "big");
    sfx.announce("K O");
    boom();
    await sleep(1800);
    say(fmt(cfg.winner), "win");
    sfx.announce(fmt(cfg.winnerSpoken), t("en-US", "he-IL"));
    achieve("fight");
    btn.textContent = t("🔁 REMATCH", "🔁 קרב חוזר");
    btn.hidden = false;
    running = false;
  };
}
