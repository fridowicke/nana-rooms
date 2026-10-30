/* =====================================================================
   NANA · small talking avatar for the dollhouse game
   A copy of the hub narrator (public/narrator/), cut down: she flies slowly around the upper-left corner,
   says the first two LINES below after the game has faded in (every visit), tap her to hear them again, × closes.
   The third line is said ~2 s after the room videos start (window event "dollhouse:finale" from index.html), on every finale.
   Poster first (nana/ass-poster.webp), the 3D model (nana/ass.glb + self-hosted three.js in nana/vendor/)
   is loaded only after the game is shown and swaps in when ready; if WebGL or the model fails the poster stays.
   ===================================================================== */
const LINES = [
  "Happy Birthday Nana and Happy Halloween!!",
  "this dollhouse makeover game was developed by shelestvetrovki and designed by dripkastonline as a creative collaboration exploring old web girls games",
  'directed by shelestvetrovki based on the "Playthings of Childhood - The Doll\'s House, 1920. A vintage silent film archive showcasing early 20th-century toy and dollhouse manufacturing.',
];
const FINALE_DELAY = 2000; // line 3: shown 2 s after the videos start
const READ_SHORT = 2500, READ_LONG = 5000; // bubble stays open this long after a line is typed (ms); line 1 is short, 2 and 3 long

const BASE = new URL("./nana/", import.meta.url).href;
const poster = new Image(); poster.fetchPriority = "low"; poster.src = BASE + "ass-poster.webp";

const css = `
.nana{position:fixed;left:0;top:0;z-index:18;pointer-events:none;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#111;opacity:0;transition:opacity .5s ease}
.nana.on{opacity:1}
.nana__body{position:fixed;left:0;top:0;width:200px;height:100px;pointer-events:none;will-change:transform}
.nana__body canvas,.nana__poster{position:absolute;display:block;transition:opacity .35s ease}
.nana__body canvas{inset:0;width:100%!important;height:100%!important;opacity:0}
/* the poster is 900×675 with her in the middle: crop it to the same 2:1 box the 3D camera frames */
.nana__poster{width:118.4%;height:177.6%;left:-9.2%;top:-36%;max-width:none;pointer-events:none;user-select:none;-webkit-user-select:none}
.nana.live canvas{opacity:1}
.nana.live .nana__poster{opacity:0}
.nana__hit{position:absolute;left:8%;right:8%;top:12%;bottom:12%;pointer-events:auto;cursor:pointer;touch-action:manipulation}
.nana__bubble{position:fixed;left:0;top:0;pointer-events:auto;width:max-content;max-width:min(270px,calc(100vw - 24px));padding:10px 12px 11px;
  background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(0,0,0,.14);border-radius:10px;
  font-size:13px;line-height:1.38;font-weight:300;letter-spacing:.005em;box-shadow:0 6px 24px rgba(0,0,0,.08);transition:opacity .25s ease;will-change:transform}
.nana__bubble::after{content:"";position:absolute;left:var(--ax,24px);top:-7px;width:12px;height:12px;border-left:1px solid rgba(0,0,0,.14);
  border-top:1px solid rgba(0,0,0,.14);transform:rotate(45deg);background:rgba(255,255,255,.86)}
.nana__bubble.right::after{left:-7px;top:var(--ay,50%);transform:rotate(-45deg)}
.nana__bubble[data-empty="1"]{opacity:0;pointer-events:none}
.nana__w{opacity:0;transition:opacity .08s}
.nana__w.on{opacity:1}
.nana__close{position:absolute;top:-9px;left:-9px;width:20px;height:20px;border-radius:999px;border:1px solid rgba(0,0,0,.25);background:#fff;
  font:11px/1 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#111;cursor:pointer;display:grid;place-items:center;padding:0}
.nana__close::before{content:"";position:absolute;inset:-10px}
@media (max-width:640px){
  .nana__body{width:140px;height:70px}
  .nana__bubble{max-width:min(240px,calc(100vw - 24px));font-size:12.5px}
}`;
const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

const root = document.createElement("div"); root.className = "nana"; root.setAttribute("aria-label", "Nana");
root.innerHTML = `
  <div class="nana__body"><img class="nana__poster" alt="" draggable="false"><div class="nana__hit" role="button" aria-label="Nana, tap to hear her again" title="Tap me"></div></div>
  <div class="nana__bubble" data-empty="1"><button class="nana__close" type="button" aria-label="Close">×</button><p class="nana__text" aria-live="polite" style="margin:0"></p></div>`;
const body = root.querySelector(".nana__body"), hit = root.querySelector(".nana__hit"), img = root.querySelector(".nana__poster"),
      bubble = root.querySelector(".nana__bubble"), textEl = root.querySelector(".nana__text"), closeBtn = root.querySelector(".nana__close");
const mouth = { jaw: 0, target: 0 };
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- flight: a slow loop inside ~35% of the width and ~30% of the height from the top-left corner ---------------- */
const M = 10, t0 = performance.now();
let fx = M, fy = 40, tilt = 0;
function fly(now) {
  const vw = document.documentElement.clientWidth || innerWidth, vh = innerHeight;
  const bw = body.offsetWidth, bh = body.offsetHeight, t = (now - t0) / 1000;
  const top = vw <= 640 ? 36 : 30; // under the header text line
  const rx = Math.max(50, vw * .35 - bw - M), ry = Math.max(30, vh * .3 - bh - top);
  // two slow sines with unrelated periods: a lazy figure-of-eight that never quite repeats
  const ux = .5 - .5 * Math.cos(t * .21 + Math.sin(t * .07) * 1.3), uy = .5 - .5 * Math.cos(t * .33 + 1.1);
  const nx = M + rx * (still ? .2 : ux), ny = top + ry * (still ? .2 : uy) + (still ? 0 : Math.sin(t * 1.7) * 3);
  tilt += ((nx - fx) * 2.2 - tilt) * .05; tilt = Math.max(-8, Math.min(8, tilt));
  fx = nx; fy = ny;
  body.style.transform = `translate(${fx.toFixed(1)}px,${fy.toFixed(1)}px) rotate(${(tilt + (still ? 0 : Math.sin(t * .9) * 2)).toFixed(2)}deg)`;
  placeBubble(vw, vh, bw, bh);
}
// bubble to her right if it fits (tail pointing at her), else under her; always kept inside the screen
function placeBubble(vw, vh, bw, bh) {
  if (bubble.dataset.empty === "1") return;
  const pw = bubble.offsetWidth, ph = bubble.offsetHeight, off = 11;
  const f = { l: fx + bw * .08, r: fx + bw * .92, t: fy + bh * .12, b: fy + bh * .88 };
  const clamp = (v, a, b) => Math.max(a, Math.min(v, Math.max(a, b)));
  let bx, by;
  const right = f.r + off + pw <= vw - M;
  if (right) {
    bx = f.r + off; by = clamp((f.t + f.b) / 2 - ph / 2, M, vh - M - ph);
    bubble.style.setProperty("--ay", Math.round(clamp((f.t + f.b) / 2 - by - 6, 8, ph - 20)) + "px");
  } else {
    by = f.b + off; bx = clamp((f.l + f.r) / 2 - pw / 2, M, vw - M - pw);
    bubble.style.setProperty("--ax", Math.round(clamp((f.l + f.r) / 2 - bx - 6, 10, pw - 22)) + "px");
  }
  bubble.classList.toggle("right", right);
  bubble.style.transform = `translate(${Math.round(bx)}px,${Math.round(by)}px)`;
}

/* ---------------- speech: words appear one by one, the mouth moves per syllable (as on the hub) ---------------- */
let run = null, seqT = null, hideT = null, finale = false, finaleT = null;
function renderWords(text) {
  textEl.innerHTML = ""; const spans = [];
  text.split(/(\s+)/).forEach(w => {
    if (!w) return; if (/^\s+$/.test(w)) { textEl.appendChild(document.createTextNode(w)); return; }
    const s = document.createElement("span"); s.className = "nana__w"; s.textContent = w; textEl.appendChild(s); spans.push(s);
  });
  return spans;
}
function say(text, done) {
  stop(); bubble.dataset.empty = "0";
  const spans = renderWords(text), r = { cancel: false, spans, done }; run = r; let i = 0;
  const next = () => {
    if (r.cancel) return;
    if (i >= spans.length) { mouth.target = 0; run = null; done && done(); return; }
    const span = spans[i++], w = span.textContent; span.classList.add("on");
    const letters = [...w.replace(/[^\p{L}]/gu, "")]; let k = 0;
    const per = 19;
    const syl = () => {
      if (r.cancel) return;
      if (k >= letters.length) { const end = /[.!?]$/.test(w); mouth.target = end ? 0 : .08; setTimeout(next, end ? 120 : /[,;:]$/.test(w) ? 60 : 12); return; }
      const c = letters[k++].toLowerCase();
      mouth.target = "aeiouy".includes(c) ? .65 + Math.random() * .35 : "mbp".includes(c) ? 0 : .18 + Math.random() * .2;
      setTimeout(syl, per);
    };
    syl();
  };
  next();
}
function finishLine() { // tap on the bubble: show the rest of the current line at once
  const r = run; if (!r) return; r.cancel = true; run = null; mouth.target = 0;
  r.spans.forEach(s => s.classList.add("on")); r.done && r.done();
}
function stop() { if (run) { run.cancel = true; run = null; } mouth.target = 0; }
function closeBubble() { stop(); clearTimeout(seqT); clearTimeout(hideT); bubble.dataset.empty = "1"; root.dataset.line = "0"; }
function sayFinale() {
  closeBubble(); root.dataset.line = "3";
  say(LINES[2], () => { hideT = setTimeout(closeBubble, READ_LONG); });
}
function talk() {
  closeBubble(); clearTimeout(finaleT); root.dataset.line = "1";
  say(LINES[0], () => {
    seqT = setTimeout(() => {
      root.dataset.line = "2";
      say(LINES[1], () => {
        if (finale) seqT = setTimeout(sayFinale, READ_LONG);
        else hideT = setTimeout(closeBubble, READ_LONG);
      });
    }, READ_SHORT);
  });
}
hit.addEventListener("click", talk);
addEventListener("dollhouse:finale", () => { finale = true; clearTimeout(finaleT); finaleT = setTimeout(sayFinale, FINALE_DELAY); });
addEventListener("dollhouse:finale-stop", () => {
  if (!finale) return; finale = false; clearTimeout(finaleT);
  if (root.dataset.line === "3") closeBubble(); // a running line 1+2 replay just ends without line 3
});
closeBtn.addEventListener("click", e => { e.stopPropagation(); closeBubble(); });
bubble.addEventListener("click", finishLine);

/* ---------------- start once the game is shown (the loading gif has faded out) ---------------- */
function gameShown() { const l = document.getElementById("loader"); return !l || l.classList.contains("out"); }
function start() {
  img.src = poster.src; document.body.appendChild(root);
  const loop = now => { requestAnimationFrame(loop); if (!document.hidden) fly(now); };
  requestAnimationFrame(loop);
  setTimeout(() => { root.classList.add("on"); setTimeout(talk, 700); setTimeout(model, 400); }, 350);
}
(function wait() { gameShown() ? start() : setTimeout(wait, 150); })();

/* ---------------- her body (three.js), only after the game is on screen ---------------- */
async function model() {
  let THREE, GLTFLoader, MeshoptDecoder;
  try { [THREE, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import(BASE + "vendor/three.module.min.js"), import(BASE + "vendor/GLTFLoader.js"), import(BASE + "vendor/meshopt_decoder.module.js")]); }
  catch (e) { return; }
  const canvas = document.createElement("canvas"); body.prepend(canvas);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); }
  catch (e) { canvas.remove(); return; }
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb08aa0, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1, 2, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9fe6, 1.2); rim.position.set(-2, 1, -2); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(26, 2, .01, 100);
  const rig = new THREE.Group(); scene.add(rig);
  let mouths = [], wings = [], size = null;
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(BASE + "ass.glb", g => {
    const m = g.scene, b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()); size = b.getSize(new THREE.Vector3());
    m.position.sub(c); rig.add(m);
    m.traverse(o => { if (o.isMesh && o.morphTargetDictionary && "jawOpen" in o.morphTargetDictionary) mouths.push(o); if (/wing/.test(o.name)) wings.push({ o, rz: o.rotation.z }); });
    frame(); renderer.render(scene, cam);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("live")));
  }, undefined, () => { canvas.remove(); });
  const setM = (o, n, v) => { const i = o.morphTargetDictionary[n]; if (i !== undefined) o.morphTargetInfluences[i] = v; };
  // pull the camera back until her box (at both ends of the sway) fits the 2:1 frame with room for the wing flap
  function frame() {
    if (!size) return;
    const pts = [], e = new THREE.Euler();
    for (const ry of [-.15, .15]) { e.set(0, ry, 0); for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push(new THREE.Vector3(sx * size.x / 2, sy * size.y / 2, sz * size.z / 2).applyEuler(e)); }
    let d = Math.max(size.x, size.y, size.z) * 3;
    for (let i = 0; i < 8; i++) {
      cam.position.set(0, 0, d); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      let k = 0; for (const p of pts) { const v = p.clone().project(cam); k = Math.max(k, Math.abs(v.x), Math.abs(v.y)); }
      d *= k / .9;
    }
    cam.position.set(0, 0, d); cam.lookAt(0, 0, 0);
  }
  const fit = () => { const w = body.clientWidth, h = body.clientHeight; if (!w || !h) return; renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); frame(); };
  new ResizeObserver(fit).observe(body); fit();
  let last = 0;
  const loop = now => {
    requestAnimationFrame(loop);
    if (document.hidden || now - last < 33) return; last = now; // 30 fps is plenty for a small avatar
    mouth.jaw += (mouth.target - mouth.jaw) * (mouth.target > mouth.jaw ? .7 : .45);
    const t = (now - t0) / 1000;
    mouths.forEach(o => { setM(o, "jawOpen", mouth.jaw); setM(o, "mouthSmileLeft", .2); setM(o, "mouthSmileRight", .2); setM(o, "mouthFunnel", Math.max(0, mouth.jaw - .75) * .8); });
    if (!still && size) {
      rig.position.y = Math.sin(t * 1.6) * size.y * .02; rig.rotation.y = Math.sin(t * .5) * .14;
      wings.forEach((w, i) => { w.o.rotation.z = w.rz + Math.sin(t * 5 + (i % 2) * Math.PI) * .09; });
    }
    renderer.render(scene, cam);
  };
  requestAnimationFrame(loop);
}
