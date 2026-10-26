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
  .ass-n{position:fixed;left:0;top:0;z-index:2147483000;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#111;pointer-events:none;
    --mint:#3dffb8}
  .ass-n *{box-sizing:border-box}
  .ass-n__bubble{pointer-events:auto;position:absolute;left:0;top:0;width:max-content;max-width:min(300px,calc(100vw - 24px));padding:10px 12px 11px;
    background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(0,0,0,.14);border-radius:10px;
    font-size:13px;line-height:1.38;font-weight:300;letter-spacing:.005em;box-shadow:0 6px 24px rgba(0,0,0,.08);
    transition:opacity .25s ease,transform .25s ease;transform-origin:50% 0}
  .ass-n__bubble::after{content:"";position:absolute;left:var(--ax,50%);top:-7px;width:12px;height:12px;border-left:1px solid rgba(0,0,0,.14);
    border-top:1px solid rgba(0,0,0,.14);transform:rotate(45deg);-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(255,255,255,.86)}
  .ass-n__bubble.up{transform-origin:50% 100%}
  .ass-n__bubble.up::after{top:auto;bottom:-7px;transform:rotate(225deg)}
  .ass-n__bubble.left{transform-origin:100% 30%}
  .ass-n__bubble.left::after{left:auto;right:-7px;top:var(--ay,50%);transform:rotate(135deg)}
  .ass-n__bubble.right{transform-origin:0 30%}
  .ass-n__bubble.right::after{left:-7px;top:var(--ay,50%);transform:rotate(-45deg)}
  .ass-n__bubble[data-empty="1"]{opacity:0;transform:scale(.92);pointer-events:none}
  .ass-n__w{opacity:0;transition:opacity .08s}
  .ass-n__w.on{opacity:1}
  .ass-n__w.hl.on{background:var(--mint);box-shadow:.14em 0 0 var(--mint),-.14em 0 0 var(--mint);border-radius:2px}
  .ass-n__close{position:absolute;top:-9px;left:-9px;width:20px;height:20px;border-radius:999px;border:1px solid rgba(0,0,0,.25);background:#fff;
    font:11px/1 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#111;cursor:pointer;display:grid;place-items:center;padding:0}
  .ass-n__close:focus-visible{outline:2px solid var(--mint);outline-offset:2px}
  .ass-n__body{pointer-events:auto;position:relative;width:min(450px,calc(100vw - 24px));aspect-ratio:4/3;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
  .ass-n__body.drag{cursor:grabbing}
  .ass-n__body canvas{width:100%!important;height:100%!important;display:block}
  .ass-n.min .ass-n__bubble{display:none}
  .ass-n.min .ass-n__body{width:64px}
  .ass-n__fallback{position:absolute;inset:12% 20%;border-radius:50% 50% 46% 46%;background:#e8b3bf}
  @media (max-width:640px){
    .ass-n__bubble{max-width:min(260px,calc(100vw - 24px));font-size:12.5px}
    .ass-n__body{width:min(336px,calc(100vw - 24px))}
  }
  @media (prefers-reduced-motion:reduce){.ass-n *{transition:none!important}}`;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  const root = document.createElement("div"); root.className = "ass-n"; root.setAttribute("aria-label", "Narrator");
  root.innerHTML = `
    <div class="ass-n__bubble" data-empty="1"><button class="ass-n__close" type="button" aria-label="Hide her">×</button><p class="ass-n__text" aria-live="polite" style="margin:0"></p></div>
    <div class="ass-n__body" title="Tap her, drag her"></div>`;
  document.body.appendChild(root);
  const bubble = root.querySelector(".ass-n__bubble"), textEl = root.querySelector(".ass-n__text"),
        body = root.querySelector(".ass-n__body"),
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
  let unlocked = false, current = null, busy = false, lastTalk = 0;
  let minimized = store.get("min", !SETTINGS.startOpen);
  let ac = null, analyser = null, buf = null; const missing = new Set();
  const mouth = { jaw: 0, target: 0, smile: 0 };
  const lastPick = {};

  /* ---------------- position: top right by default, draggable, remembered ---------------- */
  const M = 14;
  let pos = store.get("pos", null);
  // her visible silhouette inside the body box (px), measured from the 3D model once it loads
  let fig = null;
  function layout() {
    const vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight;
    const bw = body.offsetWidth, bh = body.offsetHeight;
    let x = pos ? pos.x : vw - bw - M, y = pos ? pos.y : M;
    x = Math.max(M, Math.min(x, vw - bw - M)); y = Math.max(M, Math.min(y, vh - bh - M));
    if (vw - bw - M < M) x = Math.max(0, (vw - bw) / 2);
    root.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
    // bubble a few px from her silhouette, tail pointing at her: beside her (left, then right), else below/above;
    // always kept inside the screen
    const pw = bubble.offsetWidth, ph = bubble.offsetHeight, gap = 4, tail = 7, off = gap + tail;
    const f = fig || { l: bw * .2, t: bh * .12, r: bw * .8, b: bh * .88 };
    const cx = (f.l + f.r) / 2, cy = f.t + (f.b - f.t) * .3;
    const side = x + f.l - off - pw >= M ? "left" : x + f.r + off + pw <= vw - M ? "right"
      : y + f.b + off + ph <= vh - M || y + f.t - off - ph < M ? "down" : "up";
    const clamp = (v, a, b) => Math.max(a, Math.min(v, b));
    let bx, by;
    if (side === "left" || side === "right") {
      bx = side === "left" ? f.l - off - pw : f.r + off;
      by = clamp(cy - ph / 2, M - y, vh - M - y - ph);
      bubble.style.setProperty("--ay", Math.round(clamp(cy - by - 6, 8, ph - 20)) + "px");
    } else {
      by = side === "down" ? f.b + off : f.t - off - ph;
      bx = clamp(cx - pw / 2, M - x, vw - M - x - pw);
      bubble.style.setProperty("--ax", Math.round(clamp(cx - bx - 6, 10, pw - 22)) + "px");
    }
    bubble.classList.toggle("up", side === "up");
    bubble.classList.toggle("left", side === "left");
    bubble.classList.toggle("right", side === "right");
    bubble.style.left = Math.round(bx) + "px"; bubble.style.top = Math.round(by) + "px";
  }
  new ResizeObserver(layout).observe(body); new ResizeObserver(layout).observe(bubble);
  addEventListener("resize", layout);
  let drag = null, dragged = false;
  body.addEventListener("pointerdown", e => {
    if (e.button > 0) return;
    const r = body.getBoundingClientRect();
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false }; dragged = false;
    try { body.setPointerCapture(e.pointerId); } catch (err) {}
  });
  body.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) { drag.moved = true; body.classList.add("drag"); }
    e.preventDefault(); pos = { x: drag.ox + dx, y: drag.oy + dy }; layout();
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) { dragged = true; const r = body.getBoundingClientRect(); pos = { x: r.left, y: r.top }; store.set("pos", pos); }
    body.classList.remove("drag"); drag = null;
  };
  body.addEventListener("pointerup", endDrag); body.addEventListener("pointercancel", endDrag);

  const setMin = v => { minimized = v; store.set("min", v); root.classList.toggle("min", v); if (v) stop(); layout(); };
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
  body.addEventListener("click", () => { if (dragged) { dragged = false; return; } if (minimized) setMin(false); say(pokeLine()); });

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
    const spans = renderWords(line.text), words = spans.map(s => s.textContent); layout();
    const run = { spans, cancel: false }; current = run;
    const src = line.audio || (line.id ? `${BASE}voice/${line.id}.mp3` : null);
    if (unlocked && ac && src && !missing.has(src)) {
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

  let route = null, hunt = null, idleT, stuckT, welcomed = false;
  function onRoute() {
    const r = routeOf(location.hash); const key = JSON.stringify(r);
    if (route && JSON.stringify(route) === key) return;
    route = r; hunt = null; queue = []; clearTimeout(stuckT);
    setTimeout(() => {
      if (route !== r) return;
      if (r.kind === "home") {
        const next = markSeen("home") ? LINES.home.first : LINES.home.again;
        if (!welcomed) { welcomed = true; say(pick(LINES.home.welcome, "welcome")); queueAfter(() => pick(next, "home")); }
        else say(pick(next, "home"));
      }
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
      frame();
    }, undefined, () => { canvas.remove(); body.insertAdjacentHTML("afterbegin", '<div class="ass-n__fallback"></div>'); });
    const setM = (o, n, v) => { const i = o.morphTargetDictionary[n]; if (i !== undefined) o.morphTargetInfluences[i] = v; };
    const fit = () => { const w = body.clientWidth, h = body.clientHeight; if (!w || !h) return; renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); frame(); };
    // every corner of her box at both ends of the idle sway (turn + bob), so wings are never cropped
    function corners() {
      const out = [], e = new THREE.Euler(), q = new THREE.Vector3();
      for (const ry of [-.15, 0, .15]) for (const dy of [-1, 1]) {
        e.set(0, ry, 0);
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
          q.set(sx * size.x / 2, sy * size.y / 2, sz * size.z / 2).applyEuler(e); q.y += dy * size.y * .02; out.push(q.clone());
        }
      }
      return out;
    }
    function bounds() {
      cam.updateMatrixWorld();
      let l = 1, t = -1, r = -1, b = 1;
      for (const c of corners()) { const v = c.project(cam); l = Math.min(l, v.x); r = Math.max(r, v.x); b = Math.min(b, v.y); t = Math.max(t, v.y); }
      return { l, t, r, b };
    }
    // pull the camera back until the whole swaying figure fits with a small margin
    function frame() {
      if (!size) return;
      let d = Math.max(size.x, size.y, size.z) * 3;
      for (let i = 0; i < 8; i++) {
        cam.position.set(0, 0, d); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
        const k = bounds(); d *= Math.max(-k.l, k.r, k.t, -k.b) / .94;
      }
      cam.position.set(0, 0, d); cam.lookAt(0, 0, 0); measure();
    }
    // her visible box in body pixels so the bubble can sit right next to her
    function measure() {
      const w = body.clientWidth, h = body.clientHeight; if (!size || !w || !h) return;
      const k = bounds();
      fig = { l: Math.max(0, (k.l + 1) / 2 * w), t: Math.max(0, (1 - k.t) / 2 * h), r: Math.min(w, (k.r + 1) / 2 * w), b: Math.min(h, (1 - k.b) / 2 * h) };
      layout();
    }
    new ResizeObserver(fit).observe(body); fit();
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches, t0 = performance.now();
    let lastFrame = 0, lastScan = -1e9, px = null;
    // her real silhouette (non-transparent pixels, wings included), read right after a render
    function scan() {
      const gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, w = body.clientWidth;
      if (!W || !H || !w) return;
      if (!px || px.length !== W * H * 4) px = new Uint8Array(W * H * 4);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let l = W, r = -1, t = H, b = -1;
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (px[(y * W + x) * 4 + 3] > 24) {
        if (x < l) l = x; if (x > r) r = x; const yy = H - 1 - y; if (yy < t) t = yy; if (yy > b) b = yy;
      }
      if (r < 0) return;
      const k = w / W, pad = 3, f = { l: l * k - pad, t: t * k - pad, r: r * k + pad, b: b * k + pad };
      if (!fig || Math.abs(f.l - fig.l) + Math.abs(f.r - fig.r) + Math.abs(f.t - fig.t) + Math.abs(f.b - fig.b) > 3) { fig = f; layout(); }
    }
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
      if (size && now - lastScan > 400) { lastScan = now; scan(); }
    };
    requestAnimationFrame(loop);
  })();

  window.assNarrator = { say: (text, id) => say({ text, id }), lines: LINES };
}
