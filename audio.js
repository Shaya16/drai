// every sound here is synthesized live, and kept soft on purpose
let ctx, master;
let muted = false;
const VOLUME = 0.35;

// call from a tap/click: phones only allow sound that starts from one
export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ctx.destination);
    // phones pause the sound when you switch apps, get a call, lock the screen... the next tap brings it back
    const wake = () => ctx.state !== "running" && ctx.resume().catch(() => {});
    for (const ev of ["pointerdown", "touchend", "keydown"]) addEventListener(ev, wake, { passive: true });
    document.addEventListener("visibilitychange", () => !document.hidden && wake());
  }
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  unlockPhone();
}

// iphones play web sounds like ringtones, so with the silent switch on you'd hear nothing (videos still play though).
// newer safari can just be told this is "playback"; older ones need a silent <audio> going to switch over
let unlocked = false;
function unlockPhone() {
  if (unlocked) return;
  unlocked = true;
  if (navigator.audioSession) navigator.audioSession.type = "playback";
  else if (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))) {
    const keepAlive = new Audio(silentWav());
    keepAlive.loop = true;
    keepAlive.play().catch(() => {});
  }
  // the fight announcer's voice also stays quiet unless the first thing it says comes from a tap
  if (window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  }
}

// half a second of nothing, as a .wav
function silentWav(rate = 8000, n = 4000) {
  const b = new Uint8Array(44 + n), v = new DataView(b.buffer);
  const str = (at, s) => [...s].forEach((c, i) => (b[at + i] = c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // pcm
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true); // 8-bit, where 128 = silence
  str(36, "data");
  v.setUint32(40, n, true);
  b.fill(128, 44);
  return "data:audio/wav;base64," + btoa(String.fromCharCode(...b));
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : VOLUME;
  if (m) window.speechSynthesis?.cancel();
}

export const isMuted = () => muted;

// the fight announcer, courtesy of the browser's text-to-speech. lang picks the voice ("he-IL" for hebrew)
export function announce(text, lang = "en-US") {
  if (muted || !window.speechSynthesis || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  u.pitch = 0.7;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// a plucked note that fades out, like a music box
function note(freq, start, dur, type = "triangle", vol = 0.1) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.05);
  return o;
}

// soft pop (his eyes leaving)
export function pop() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = note(320, t, 0.18, "sine", 0.25);
  o.frequency.setValueAtTime(320, t);
  o.frequency.exponentialRampToValueAtTime(720, t + 0.08);
}

// a low thud for punchlines
export function boom() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = note(120, t, 0.6, "sine", 0.45);
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.4);
}

export function tada() {
  if (!ctx) return;
  const t = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, t + i * 0.09, 0.7, "triangle", 0.08));
}

export function achieve() {
  if (!ctx) return;
  const t = ctx.currentTime;
  note(988, t, 0.3, "sine", 0.08);
  note(1319, t + 0.1, 0.5, "sine", 0.08);
}

export function kiss() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = note(900, t, 0.15, "sine", 0.15);
  o.frequency.setValueAtTime(900, t);
  o.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
}

const FREQ = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 };
const SONG = [
  ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2],
  ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
  ["G4", 0.75], ["G4", 0.25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 2],
  ["F5", 0.75], ["F5", 0.25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 3],
];

// happy birthday on a music box. returns how many seconds until it's over
export function happyBirthday(delay = 0) {
  if (!ctx) return 11 + delay;
  const start = ctx.currentTime + delay;
  let t = start;
  for (const [n, beats] of SONG) {
    const dur = beats * 0.4;
    note(FREQ[n], t, Math.max(0.6, dur * 1.5), "triangle", 0.1);
    note(FREQ[n] * 2, t, 0.5, "sine", 0.025);
    t += dur;
  }
  return t - ctx.currentTime;
}
