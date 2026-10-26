/* =====================================================================
   SHELESTVETROVKI · NARRATOR
   A talking winged butt that sits in the corner of every page and
   comments on where you are. Drop-in: one <script> tag, no build step.

     <script type="module" src="/narrator/narrator.js"></script>

   Files next to this one:
     lines.js      what she says (edit freely)
     ass.glb       her 3D model with the lip shapes
     voice/*.mp3   optional voice recordings, named by line id
   ===================================================================== */
import { LINES, SETTINGS } from "./lines.js";

const BASE = new URL("./", import.meta.url).href;
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/+esm";
const LOADER_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js/+esm";

if (!window.__assNarrator) { window.__assNarrator = true; boot(); }

function boot() {
  /* ---------------- DOM ---------------- */
  const css = `
  .ass-n{position:fixed;right:max(14px,env(safe-area-inset-right,0px));bottom:calc(132px + env(safe-area-inset-bottom,0px));z-index:2147483000;
    display:flex;align-items:flex-end;gap:6px;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#111;pointer-events:none;
    --mint:#3dffb8}
  .ass-n *{box-sizing:border-box}
  .ass-n__bubble{pointer-events:auto;position:relative;max-width:min(300px,calc(100vw - 170px));margin-bottom:34px;padding:10px 12px 11px;
    background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(0,0,0,.14);border-radius:10px;
    font-size:13px;line-height:1.38;font-weight:300;letter-spacing:.005em;box-shadow:0 6px 24px rgba(0,0,0,.08);
    transition:opacity .25s ease,transform .25s ease;transform-origin:100% 100%}
  .ass-n__bubble::after{content:"";position:absolute;right:-7px;bottom:16px;width:12px;height:12px;background:inherit;border-right:1px solid rgba(0,0,0,.14);
    border-top:1px solid rgba(0,0,0,.14);transform:rotate(45deg);-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(255,255,255,.86)}
  .ass-n__bubble[data-empty="1"]{opacity:0;transform:scale(.92);pointer-events:none}
  .ass-n__w{opacity:0;transition:opacity .08s}
  .ass-n__w.on{opacity:1}
  .ass-n__w.hl.on{background:var(--mint);box-shadow:.14em 0 0 var(--mint),-.14em 0 0 var(--mint);border-radius:2px}
  .ass-n__close{position:absolute;top:-9px;left:-9px;width:20px;height:20px;border-radius:999px;border:1px solid rgba(0,0,0,.25);background:#fff;
    font:11px/1 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#111;cursor:pointer;display:grid;place-items:center;padding:0}
  .ass-n__body{pointer-events:auto;position:relative;width:150px;height:112px;cursor:pointer}
  .ass-n__body canvas{width:100%!important;height:100%!important;display:block}
  .ass-n__tools{position:absolute;right:2px;bottom:-4px;display:flex;gap:4px}
  .ass-n__btn{border:1px solid #111;background:rgba(255,255,255,.9);color:#111;border-radius:999px;padding:2px 8px;font:300 10px/1.4 "Helvetica Neue",Helvetica,Arial,sans-serif;cursor:pointer}
  .ass-n__btn:hover{background:#111;color:#fff}
  .ass-n__btn:focus-visible,.ass-n__close:focus-visible{outline:2px solid var(--mint);outline-offset:2px}
  .ass-n.min .ass-n__bubble{display:none}
  .ass-n.min .ass-n__body{width:64px;height:48px}
  .ass-n.min .ass-n__tools{display:none}
  .ass-n__fallback{position:absolute;inset:14px 30px;border-radius:50% 50% 46% 46%;background:#e8b3bf}
  @media (max-width:640px){
    .ass-n{bottom:calc(150px + env(safe-area-inset-bottom,0px));flex-direction:column;align-items:flex-end}
    .ass-n__bubble{margin:0 6px 0 0;max-width:min(260px,calc(100vw - 32px));font-size:12.5px}
    .ass-n__bubble::after{right:28px;bottom:-7px;transform:rotate(135deg)}
    .ass-n__body{width:112px;height:84px}
  }
  @media (prefers-reduced-motion:reduce){.ass-n *{transition:none!important}}`;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  const root = document.createElement("div"); root.className = "ass-n"; root.setAttribute("aria-label", "Narrator");
  root.innerHTML = `
    <div class="ass-n__bubble" data-empty="1"><button class="ass-n__close" type="button" aria-label="Hide her">×</button><p class="ass-n__text" aria-live="polite" style="margin:0"></p></div>
    <div class="ass-n__body" title="Tap her">
      <div class="ass-n__tools"><button class="ass-n__btn ass-n__sound" type="button" aria-pressed="true">sound on</button></div>
    </div>`;
  document.body.appendChild(root);
  const bubble = root.querySelector(".ass-n__bubble"), textEl = root.querySelector(".ass-n__text"),
        body = root.querySelector(".ass-n__body"), soundBtn = root.querySelector(".ass-n__sound"),
        closeBtn = root.querySelector(".ass-n__close");

  const store = {
    get(k, d) { try { const v = localStorage.getItem("assN:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("assN:" + k, JSON.stringify(v)); } catch (e) {} },
  };
  const ss = {
    get(k, d) { try { const v = sessionStorage.getItem("assN:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { sessionStorage.setItem("assN:" + k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------------- speech ---------------- */
  let soundOn = store.get("sound", true), unlocked = false, current = null, busy = false, lastTalk = 0;
  let minimized = store.get("min", !SETTINGS.startOpen);
  let ac = null, analyser = null, buf = null; const missing = new Set();
  const mouth = { jaw: 0, target: 0, smile: 0 };
  const lastPick = {};

  const setSound = () => { soundBtn.setAttribute("aria-pressed", String(soundOn)); soundBtn.textContent = soundOn ? "sound on" : "sound off"; };
  setSound();
  soundBtn.addEventListener("click", e => { e.stopPropagation(); soundOn = !soundOn; store.set("sound", soundOn); setSound(); if (!soundOn && current?.audio) current.audio.pause(); });
  const setMin = v => { minimized = v; store.set("min", v); root.classList.toggle("min", v); if (v) stop(); };
  setMin(minimized);
  closeBtn.addEventListener("click", e => { e.stopPropagation(); setMin(true); });
  // in a room: the Young-Girl lines from a shuffled deck (no repeats until all are used); elsewhere: poke lines
  function roomDeckLine() {
    const all = LINES.roomPoke || []; if (!all.length) return null;
    let deck = ss.get("ygDeck", []);
    if (!deck.length || deck.some(i => i >= all.length)) {
      deck = all.map((_, i) => i);
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    }
    const i = deck.shift(); ss.set("ygDeck", deck); return all[i];
  }
  const pokeLine = () => (route && route.kind === "room" && LINES.roomPoke?.length) ? roomDeckLine() : pick(LINES.poke, "poke");
  body.addEventListener("click", () => { if (minimized) setMin(false); say(pokeLine()); });

  addEventListener("pointerdown", () => {
    if (unlocked) return; unlocked = true;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); analyser = ac.createAnalyser(); analyser.fftSize = 512; buf = new Float32Array(analyser.fftSize); analyser.connect(ac.destination); } catch (e) { ac = null; }
  }, { capture: true });

  function pick(list, key) {
    if (!list || !list.length) return null;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastPick[key]) i = (i + 1) % list.length;
    lastPick[key] = i; return list[i];
  }

  function renderWords(text) {
    textEl.innerHTML = ""; const spans = [];
    text.split(/(\*[^*]+\*)/g).filter(Boolean).forEach(part => {
      const hl = part.startsWith("*");
      (hl ? part.slice(1, -1) : part).split(/(\s+)/).forEach(w => {
        if (!w) return; if (/^\s+$/.test(w)) { textEl.appendChild(document.createTextNode(w)); return; }
        const s = document.createElement("span"); s.className = hl ? "ass-n__w hl" : "ass-n__w"; s.textContent = w; textEl.appendChild(s); spans.push(s);
      });
    });
    return spans;
  }

  let hideT;
  function say(line, opt = {}) {
    if (!line || minimized) return false;
    if (opt.optional && (busy || performance.now() - lastTalk < 6000)) return false;
    stop(); clearTimeout(hideT); busy = true; lastTalk = performance.now();
    bubble.dataset.empty = "0";
    const spans = renderWords(line.text), words = spans.map(s => s.textContent);
    const run = { spans, cancel: false }; current = run;
    const src = line.audio || (line.id ? `${BASE}voice/${line.id}.mp3` : null);
    if (soundOn && unlocked && ac && src && !missing.has(src)) {
      const a = new Audio(src); run.audio = a; a.preload = "auto"; let started = false;
      a.addEventListener("error", () => { missing.add(src); if (!started && !run.cancel) { run.audio = null; typeText(run, words); } }, { once: true });
      a.addEventListener("loadedmetadata", () => {
        if (run.cancel) return; started = true;
        try { ac.createMediaElementSource(a).connect(analyser); } catch (e) {}
        ac.resume?.(); a.play().catch(() => { run.audio = null; typeText(run, words); });
        const dur = (isFinite(a.duration) && a.duration > 0 ? a.duration : words.length * .35) * 920;
        spans.forEach((s, i) => setTimeout(() => { if (!run.cancel) s.classList.add("on"); }, dur * i / Math.max(1, spans.length)));
        a.addEventListener("ended", () => finish(run), { once: true });
      }, { once: true });
    } else typeText(run, words);
    return true;
  }

  function typeText(run, words) {
    let i = 0;
    const next = () => {
      if (run.cancel) return;
      if (i >= run.spans.length) { mouth.target = 0; setTimeout(() => finish(run), 300); return; }
      const w = words[i], span = run.spans[i++]; span.classList.add("on");
      const letters = [...w.replace(/[^\p{L}]/gu, "")]; let k = 0;
      const per = Math.max(55, Math.min(95, 320 / Math.max(1, letters.length)));
      const syl = () => {
        if (run.cancel) return;
        if (k >= letters.length) { const end = /[.!?]$/.test(w); mouth.target = end ? 0 : .08; setTimeout(next, end ? 260 : /[,;:]$/.test(w) ? 140 : 40); return; }
        const c = letters[k++].toLowerCase();
        mouth.target = "aeiouyäöüáéíóú".includes(c) ? .65 + Math.random() * .35 : "mbp".includes(c) ? 0 : .18 + Math.random() * .2;
        setTimeout(syl, per);
      };
      syl();
    };
    next();
  }
  function finish(run) {
    if (run !== current) return; busy = false; lastEnd = performance.now(); mouth.target = 0; run.spans.forEach(s => s.classList.add("on")); current = null;
    const n = run.spans.length; hideT = setTimeout(() => { if (!busy) bubble.dataset.empty = "1"; }, 5000 + n * 280);
  }
  function stop() { if (!current) return; current.cancel = true; current.audio?.pause(); current.spans.forEach(s => s.classList.add("on")); current = null; busy = false; mouth.target = 0; }
  function tick() {
    if (current?.audio && analyser && !current.audio.paused) {
      analyser.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      mouth.target = Math.max(0, Math.min(1, (Math.sqrt(s / buf.length) - .012) * SETTINGS.mouthSensitivity));
    }
    mouth.jaw += (mouth.target - mouth.jaw) * (mouth.target > mouth.jaw ? .55 : .35);
    mouth.smile += ((busy ? .25 : .1) - mouth.smile) * .05;
    return mouth;
  }

  /* ---------------- where are we? ---------------- */
  const R = LINES.rooms, G = R.general;
  function routeOf(hash) {
    const h = (hash || "").replace(/^#/, "");
    if (!h || h === "home" || h === "house") return { kind: "home" };
    if (h === "home-editor") return { kind: "silent" };
    if (h === "about") return { kind: "about" };
    let m = h.match(/^room-(\d+)/); if (m) return { kind: "room", n: +m[1] };
    m = h.match(/^folder-([^/]+)/); if (m) return { kind: "folder", id: decodeURIComponent(m[1]) };
    return { kind: "other" };
  }
  const seen = ss.get("seen", {});
  const markSeen = k => { const f = !seen[k]; seen[k] = 1; ss.set("seen", seen); return f; };

  let route = null, hunt = null, idleT, stuckT;
  function onRoute() {
    const r = routeOf(location.hash); const key = JSON.stringify(r);
    if (route && JSON.stringify(route) === key) return;
    route = r; hunt = null; queue = []; clearTimeout(stuckT);
    setTimeout(() => {
      if (route !== r) return;
      if (r.kind === "home") say(pick(markSeen("home") ? LINES.home.first : LINES.home.again, "home"));
      else if (r.kind === "about") say(pick(markSeen("about") ? LINES.about.first : LINES.about.again, "about"));
      else if (r.kind === "folder") { const l = LINES.folders[r.id]; if (l) say(pick(l, "f" + r.id)); }
      else if (r.kind === "room") {
        const firstRoom = markSeen("anyroom"), firstHere = markSeen("room" + r.n), own = R[r.n]?.enter;
        if (firstRoom) { say(pick(G.first, "g1")); queueAfter(() => own && pick(own, "r" + r.n)); }
        else say(firstHere && own ? pick(own, "r" + r.n) : pick(G.enter, "enter"));
      }
    }, r.kind === "room" ? 1400 : 600);
    nudge();
  }
  // lines that wait their turn: said one after another, never on top of each other
  let queue = [], lastEnd = 0;
  function queueAfter(fn) { queue.push({ fn, t: performance.now() }); }
  setInterval(() => {
    if (busy || !queue.length || performance.now() - lastEnd < 900) return;
    const q = queue.shift(); if (performance.now() - q.t > 40000) return;
    const l = q.fn(); if (l) say(l);
  }, 300);

  /* ---------------- the "find these objects" list in rooms ----------------
     The site shows the list top right (desktop) or as "objects · 1 / 6" (phone).
     Found names get crossed out; when everything is found the list disappears.  */
  function findPanel() {
    const el = [...document.querySelectorAll("div,button")].find(d =>
      (d.childElementCount === 0 && d.textContent.trim().toLowerCase() === "find these objects:") ||
      (d.tagName === "BUTTON" && /^objects\s*·/i.test(d.textContent.trim())));
    if (!el) return null;
    let p = el.parentElement;
    while (p && p !== document.body && getComputedStyle(p).position !== "absolute") p = p.parentElement;
    return p && p !== document.body ? p : el.parentElement;
  }
  function readPanel(p) {
    const m = p.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    const leaves = [...p.querySelectorAll("div")].filter(d => d.childElementCount === 0);
    const names = [], crossed = new Set();
    leaves.forEach(d => {
      const t = d.textContent.trim().toLowerCase();
      if (!t || /find these objects|^\d+\s*\/|hint|⏱/.test(t)) return;
      names.push(t); if (getComputedStyle(d).textDecorationLine.includes("line-through")) crossed.add(t);
    });
    const hintBtn = [...p.querySelectorAll("button")].find(b => /hint/i.test(b.textContent));
    return { found: m ? +m[1] : crossed.size, total: m ? +m[2] : names.length, names, crossed, hintBtn };
  }
  function lineFor(name) { const own = name && LINES.objects[name]; return own ? pick(own, "o" + name) : pick(G.found, "found"); }
  setInterval(() => {
    if (!route || route.kind !== "room") return;
    const r = route, p = findPanel();
    if (!p) {
      // list vanished in the same room right after the last find = everything found
      if (hunt && hunt.r === r && !hunt.done && hunt.found >= hunt.total - 1 && hunt.total > 0) {
        hunt.done = true; clearTimeout(stuckT);
        const last = hunt.names.find(n => !hunt.crossed.has(n));
        say(lineFor(last)); queueAfter(() => pick(G.allFound, "done"));
      }
      return;
    }
    const st = readPanel(p);
    if (!hunt || hunt.r !== r) {
      hunt = { r, found: st.found, total: st.total, names: st.names, crossed: st.crossed, done: false };
      if (markSeen("hunt")) setTimeout(() => { if (hunt && hunt.r === r) queueAfter(() => pick(G.hunt, "hunt")); }, 3000);
      armStuck();
    }
    if (st.hintBtn && !st.hintBtn.__assN) { st.hintBtn.__assN = 1; st.hintBtn.addEventListener("click", () => say(pick(G.hint, "hint"))); }
    if (st.found > hunt.found) {
      const newly = [...st.crossed].find(n => !hunt.crossed.has(n));
      hunt.found = st.found; hunt.total = st.total; hunt.crossed = st.crossed; if (st.names.length) hunt.names = st.names;
      armStuck();
      if (Math.random() <= SETTINGS.foundChance) say(lineFor(newly));
    } else if (st.names.length) { hunt.names = st.names; hunt.crossed = st.crossed; }
  }, 500);
  function armStuck() {
    clearTimeout(stuckT);
    stuckT = setTimeout(() => { if (hunt && !hunt.done && route === hunt.r && hunt.found < hunt.total) say(pick(G.stuck, "stuck"), { optional: true }); armStuck(); }, SETTINGS.stuckSeconds * 1000);
  }

  /* ---------------- idle nudges ---------------- */
  function nudge() {
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      const r = route; if (!r || document.hidden) return nudge();
      const list = r.kind === "home" ? LINES.home.idle : r.kind === "about" ? LINES.about.idle : r.kind === "room" ? G.idle : null;
      if (list) say(pick(list, "idle" + r.kind), { optional: true });
      nudge();
    }, SETTINGS.idleSeconds * 1000);
  }
  ["pointerdown", "keydown", "wheel"].forEach(ev => addEventListener(ev, nudge, { passive: true }));

  addEventListener("hashchange", onRoute);
  let lastHash = location.hash; setInterval(() => { if (location.hash !== lastHash) { lastHash = location.hash; onRoute(); } }, 400);
  onRoute();

  /* ---------------- her body (three.js) ---------------- */
  (async () => {
    let THREE, GLTFLoader;
    try { THREE = await import(THREE_URL); ({ GLTFLoader } = await import(LOADER_URL)); }
    catch (e) { body.insertAdjacentHTML("afterbegin", '<div class="ass-n__fallback"></div>'); return; }
    const canvas = document.createElement("canvas"); body.prepend(canvas);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); }
    catch (e) { canvas.remove(); body.insertAdjacentHTML("afterbegin", '<div class="ass-n__fallback"></div>'); return; }
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb08aa0, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1, 2, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff9fe6, 1.2); rim.position.set(-2, 1, -2); scene.add(rim);
    const cam = new THREE.PerspectiveCamera(26, 4 / 3, .01, 100);
    const rig = new THREE.Group(); scene.add(rig);
    let mouths = [], wings = [], size = null;
    new GLTFLoader().load(BASE + "ass.glb", g => {
      const m = g.scene, b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()); size = b.getSize(new THREE.Vector3());
      m.position.sub(c); rig.add(m);
      m.traverse(o => { if (o.isMesh && o.morphTargetDictionary && "jawOpen" in o.morphTargetDictionary) mouths.push(o); if (/wing/.test(o.name)) wings.push({ o, rz: o.rotation.z }); });
      const t = Math.tan(THREE.MathUtils.degToRad(13));
      const d = Math.max(size.x / (2 * t * 4 / 3), size.y / (2 * t)) * .92;
      cam.position.set(0, 0, d); cam.lookAt(0, -size.y * .06, 0);
    }, undefined, () => { canvas.remove(); body.insertAdjacentHTML("afterbegin", '<div class="ass-n__fallback"></div>'); });
    const setM = (o, n, v) => { const i = o.morphTargetDictionary[n]; if (i !== undefined) o.morphTargetInfluences[i] = v; };
    const fit = () => { const w = body.clientWidth, h = body.clientHeight; if (!w || !h) return; renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    new ResizeObserver(fit).observe(body); fit();
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches, t0 = performance.now();
    let lastFrame = 0;
    const loop = now => {
      requestAnimationFrame(loop);
      if (document.hidden) return;
      const m = tick();
      // when she's quiet, 30 fps is plenty: leaves the GPU to the rooms
      if (!busy && now - lastFrame < 33) return; lastFrame = now;
      const t = (now - t0) / 1000;
      mouths.forEach(o => { setM(o, "jawOpen", m.jaw); setM(o, "mouthSmileLeft", m.smile); setM(o, "mouthSmileRight", m.smile); setM(o, "mouthFunnel", Math.max(0, m.jaw - .75) * .8); });
      if (!still && size) {
        rig.position.y = Math.sin(t * 1.6) * size.y * .02; rig.rotation.y = Math.sin(t * .5) * .14; rig.rotation.z = Math.sin(t * .8) * .02;
        wings.forEach((w, i) => { w.o.rotation.z = w.rz + Math.sin(t * 3.2 + (i % 2) * Math.PI) * .03; });
      }
      renderer.render(scene, cam);
    };
    requestAnimationFrame(loop);
  })();

  window.assNarrator = { say: (text, id) => say({ text, id }), lines: LINES };
}
