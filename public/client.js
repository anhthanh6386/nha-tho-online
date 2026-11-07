import * as THREE from "three";
const socket = (window.GAME_SERVER && window.GAME_SERVER.trim())
  ? io(window.GAME_SERVER, { transports: ['websocket', 'polling'] })
  : io();
let myId = null;
const players = new Map();
const meshes = new Map();
let myAo = "xanh";
// ---- i18n glue (VI/EN), dict loaded from /i18n.js ----
const T = (k) => { try { return (window.t ? window.t(k) : k); } catch (e) { return k; } };
const LANG = () => { try { return window.__lang || 'vi'; } catch (e) { return 'vi'; } };
const ZONE_LABEL_VI = { 'street': 'Phố Giáo Xứ', 'church-1': 'Đức Bà Paris', 'church-2': 'Vatican', 'church-3': 'Sagrada Familia' };
const ZONE_LABEL_EN = { 'street': 'Parish Street', 'church-1': 'Notre-Dame Paris', 'church-2': 'Vatican', 'church-3': 'Sagrada Familia' };
function refreshZoneLabels() {
  const en = LANG() === 'en';
  const src = en ? ZONE_LABEL_EN : ZONE_LABEL_VI;
  try { for (const k of Object.keys(src)) ZONE_LABEL[k] = src[k]; } catch (e) {}
}
function updateStaticTexts() {
  try {
    refreshZoneLabels();
    const zp = document.getElementById('zonePill');
    if (zp) { const z = (typeof currentZone !== 'undefined' ? currentZone : 'street'); zp.textContent = ((z === 'street' ? (LANG()==='en'?'\uD83C\uDFD9\uFE0F ':'\uD83C\uDFD9\uFE0F ') : '\u26EA ') + (ZONE_LABEL[z] || z)); }
    document.querySelectorAll('#zoneMenu button').forEach((b) => {
      const z = b.dataset.zone;
      if (!z) return;
      const pre = z === 'street' ? '\uD83C\uDFD9\uFE0F ' : '\u26EA ';
      b.textContent = pre + (ZONE_LABEL[z] || z);
    });
    const pt = document.getElementById('portalTxt');
    if (pt && !document.getElementById('portalTip').classList.contains('hidden')) { try { checkPortals(); } catch (e) {} }
  } catch (e) {}
}
window.__reRenderLang = () => {
  try { ROSARY_SETS = (LANG() === 'en' ? ROSARY_SETS_EN : ROSARY_SETS_VI); } catch (e) {}
  try { CONFESS_SINS = (LANG() === 'en' ? CONFESS_SINS_EN : CONFESS_SINS_VI); } catch (e) {}
  try { refreshZoneLabels(); } catch (e) {}
  try { updateStaticTexts(); } catch (e) {}
  try { if (typeof renderFaith === 'function') renderFaith(); } catch (e) {}
  try { if (typeof renderQuests === 'function') renderQuests(); } catch (e) {}
  try { if (typeof renderBoards === 'function') renderBoards(); } catch (e) {}
  try { if (typeof renderCandles === 'function') renderCandles(); } catch (e) {}
  try { if (typeof renderRosary === 'function') renderRosary(); } catch (e) {}
  try { if (typeof renderMass === 'function') renderMass(); } catch (e) {}
  try { if (typeof renderLit === 'function') renderLit(); } catch (e) {}
  try { if (typeof renderConfess === 'function' && window.__confess) renderConfess(); } catch (e) {}
};
try {
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.onclick = (e) => { try { e.stopPropagation(); } catch (x) {} try { window.setLang(b.dataset.lang); } catch (x) {} };
  });
  const lb = document.getElementById('langBtn');
  if (lb) lb.onclick = (e) => { try { e.stopPropagation(); } catch (x) {} try { window.setLang(LANG() === 'vi' ? 'en' : 'vi'); } catch (x) {} };
  refreshZoneLabels();
  try { window.applyI18nStatic && window.applyI18nStatic(); } catch (e) {}
  try { updateStaticTexts(); } catch (e) {}
} catch (e) {}
const AO_COLORS = { xanh: 0x3b82f6, trang: 0xf8fafc, den: 0x1f2937, do: 0xef4444, tim: 0x8b5cf6 };
// ---------- Ecosystem: street + 3 churches ----------
let currentZone = 'street';
const BOUNDS = {
  'street': { x: [-8, 208], z: [-40, 60] },
  'church-1': { x: [-18, 18], z: [-18, 28] },
  'church-2': { x: [-18, 18], z: [-18, 28] },
  'church-3': { x: [-18, 18], z: [-18, 28] },
};
const CHURCHES = [
  { zone: 'church-1', style: 'notre-dame', name: 'Đức Bà Paris', x: 40, color: 0xcfc4ae, roof: 0x4a4a52, cross: 0xffd76a },
  { zone: 'church-2', style: 'st-peters', name: 'Vatican St. Peter', x: 100, color: 0xe8e0d0, roof: 0x8a8f96, cross: 0xffe9a0 },
  { zone: 'church-3', style: 'sagrada', name: 'Sagrada Familia', x: 160, color: 0xd9b48f, roof: 0x7a5a3a, cross: 0xffb45e },
];
let ZONE_LABEL = { 'street': 'Phố Giáo Xứ', 'church-1': 'Đức Bà Paris', 'church-2': 'Vatican', 'church-3': 'Sagrada Familia' };
document.querySelectorAll("#aoRow .ao").forEach(b => b.onclick = () => {
  document.querySelectorAll("#aoRow .ao").forEach(x => x.classList.remove("sel"));
  b.classList.add("sel"); myAo = b.dataset.ao;
});
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b8e6);
scene.fog = new THREE.Fog(0xa9c6e8, 90, 700);
// ---- Bau troi gradient + mat troi + may + nui xa (realistic sky) ----
(function buildSky() {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
  const c = cv.getContext('2d');
  const gr = c.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#3d7ac8'); gr.addColorStop(0.45, '#7fb6ee');
  gr.addColorStop(0.72, '#c9e4fb'); gr.addColorStop(0.85, '#f6e8c8'); gr.addColorStop(1, '#f6e8c8');
  c.fillStyle = gr; c.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -10; scene.add(sky); scene.userData.sky = sky;
  // Mat troi + halo
  const sunSpr = new THREE.Mesh(new THREE.CircleGeometry(14, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false, depthWrite: false, transparent: true, opacity: 0.98 }));
  sunSpr.position.set(140, 130, -260); sunSpr.lookAt(100, 0, 10); scene.add(sunSpr);
  const halo = new THREE.Mesh(new THREE.CircleGeometry(30, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, fog: false, depthWrite: false, transparent: true, opacity: 0.28 }));
  halo.position.copy(sunSpr.position); halo.lookAt(100, 0, 10); scene.add(halo);
  // May mem (sprite tron ghep)
  function cloudTex() {
    const cc = document.createElement('canvas'); cc.width = 256; cc.height = 128;
    const x = cc.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,0)';
    x.clearRect(0, 0, 256, 128);
    for (let i = 0; i < 14; i++) {
      const px = 40 + Math.random() * 176, py = 45 + Math.random() * 40, r = 18 + Math.random() * 26;
      const g = x.createRadialGradient(px, py, 2, px, py, r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    const t = new THREE.CanvasTexture(cc); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const ct = cloudTex();
  scene.userData.clouds = [];
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, opacity: 0.75 + Math.random() * 0.2, fog: false, depthWrite: false }));
    sp.scale.set(50 + Math.random() * 60, 18 + Math.random() * 16, 1);
    sp.position.set(-120 + Math.random() * 440, 70 + Math.random() * 60, -160 + Math.random() * 120);
    sp.userData.v = 0.3 + Math.random() * 0.7;
    scene.add(sp); scene.userData.clouds.push(sp);
  }
  // Nui that: non da gay ghe + tuyet lem nhem + phan tang xa-gan
  function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y) {
    let t = 0, amp = 0.5, f = 1;
    for (let o = 0; o < 4; o++) { t += amp * vnoise(x * f, y * f); amp *= 0.5; f *= 2.03; }
    return t;
  }
  function realMountain(base, h, snowLine) {
    const geo = new THREE.ConeGeometry(base, h, 44, 9, false);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cRock = new THREE.Color(0x6e6a78), cRock2 = new THREE.Color(0x8f8a94);
    const cDark = new THREE.Color(0x333845), cSnow = new THREE.Color(0xffffff);
    const cSnowBlue = new THREE.Color(0xd9e6f7), cMoss = new THREE.Color(0x39603a);
    const cScree = new THREE.Color(0x9a8f7d);
    const seed = Math.random() * 60;
    const v = new THREE.Vector3();
    const col = new THREE.Color();
    // Dinh lech de khong non nao giong non nao
    const peakX = (hash2(seed, 1) - 0.5) * base * 0.35;
    const peakZ = (hash2(seed, 2) - 0.5) * base * 0.35;
    for (let vi = 0; vi < pos.count; vi++) {
      v.fromBufferAttribute(pos, vi);
      const yn = (v.y + h / 2) / h;
      const ang = Math.atan2(v.z, v.x);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      // Nhieu song nui an nhau: ranh lon + song nho + gay cat
      const r1 = 1 - Math.abs(fbm(ca * 1.8 + seed, sa * 1.8 + yn * 2.2 + seed) * 2 - 1);
      const r2 = 1 - Math.abs(fbm(ca * 4.5 + seed * 2, sa * 4.5 + yn * 5 + seed) * 2 - 1);
      const r3 = fbm(ca * 9 + yn * 10 + seed * 3, sa * 9 + seed) - 0.5;
      let ridge = 1 - (1 - r1) * 0.42 * (1 - yn * 0.45) - (1 - r2) * 0.20 * (1 - yn * 0.5);
      ridge += r3 * 0.22 * (1 - yn * 0.6);
      ridge += (hash2(vi, seed) - 0.5) * 0.09;
      const flare = 1 + (1 - yn) * (1 - yn) * 0.45;
      v.x *= ridge * flare; v.z *= ridge * flare;
      // Keo dinh lech + lam gay song lung
      v.x += peakX * yn * yn;
      v.z += peakZ * yn * yn;
      v.y += (hash2(vi * 0.7, seed * 1.3) - 0.5) * h * 0.04 * (1 - yn * 0.4);
      pos.setXYZ(vi, v.x, v.y, v.z);
      const sunFace = (ca * 0.72 + sa * 0.42) * 0.5 + 0.5;
      col.copy(cRock).lerp(cRock2, sunFace);
      // Ke da toi + dai da vun
      const crev = (1 - r2) * 0.5 + (1 - r1) * 0.3;
      col.lerp(cDark, Math.min(0.55, crev * 0.8 * (1 - yn * 0.4)));
      if (yn > 0.24 && yn < 0.52) col.lerp(cScree, 0.28 * Math.max(0, Math.sin(ang * 9 + seed + yn * 6)));
      if (yn < 0.26) col.lerp(cMoss, (0.26 - yn) / 0.26 * 0.9);
      if (yn < 0.10) col.lerp(cDark, 0.3);
      // Duong tuyet that: ran tuyet phai theo ranh nui (cho lom giu tuyet)
      const snowAt = (snowLine || 0.52) + (r3) * 0.10 + (r2 - 0.5) * 0.12;
      if (yn > snowAt) {
        const s = Math.min(1, (yn - snowAt) / 0.09);
        const snowCol = cSnow.clone().lerp(cSnowBlue, (1 - sunFace) * 0.55);
        col.lerp(snowCol, 0.6 + 0.4 * s);
      } else if (yn > snowAt - 0.13) {
        const hold = Math.pow(Math.max(0, r2 * 0.65 + r1 * 0.35), 1.4);
        col.lerp(sunFace > 0.5 ? cSnow : cSnowBlue, hold * 0.85 * (1 - (snowAt - yn) / 0.13 * 0.45));
      }
      col.multiplyScalar(0.74 + sunFace * 0.5);
      colors[vi * 3] = col.r; colors[vi * 3 + 1] = col.g; colors[vi * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.97, metalness: 0.02 }));
  }
  // Day chinh phia Bac: cao to, sat lai de thay ro ghe da + tuyet
  for (let i = 0; i < 10; i++) {
    const mx = -50 + i * 27 + (Math.random() * 10 - 5);
    const mz = -118 - Math.random() * 26;
    const h = 92 + Math.random() * 44;
    const base = 60 + Math.random() * 26;
    const m = realMountain(base, h, 0.46 + Math.random() * 0.08);
    m.position.set(mx, h / 2 - 3, mz);
    m.rotation.y = Math.random() * Math.PI;
    scene.add(m);
  }
  // Lop sau: dinh cao vuot len tren day truoc
  for (let i = 0; i < 8; i++) {
    const mx = -60 + i * 36 + (Math.random() * 12 - 6);
    const mz = -215 - Math.random() * 50;
    const h = 125 + Math.random() * 60;
    const base = 88 + Math.random() * 35;
    const m = realMountain(base, h, 0.50);
    m.position.set(mx, h / 2 - 6, mz);
    scene.add(m);
  }
  // Vong cac huong con lai
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + (Math.random() * 0.2);
    if (Math.sin(a) < -0.55 && Math.cos(a) > -0.7 && Math.cos(a) < 0.7) continue;
    const h = 62 + Math.random() * 36;
    const base = 60 + Math.random() * 28;
    const mx = 100 + Math.cos(a) * (238 + Math.random() * 25);
    const mz = 10 + Math.sin(a) * (182 + Math.random() * 20);
    const m = realMountain(base, h, 0.48);
    m.position.set(mx, h / 2 - 3, mz);
    m.rotation.y = Math.random() * Math.PI;
    scene.add(m);
  }
  // Lop 2: doi xanh gan hon — dung nui that thap, chan co rung
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.22;
    const h = 16 + Math.random() * 16;
    const base = 44 + Math.random() * 24;
    const mx = 100 + Math.cos(a) * (178 + Math.random() * 22);
    const mz = 10 + Math.sin(a) * (128 + Math.random() * 18);
    const hill = realMountain(base, h, 0.78);
    hill.position.set(mx, h / 2 - 2, mz);
    hill.rotation.y = Math.random() * Math.PI;
    scene.add(hill);
  }
})();
// ---------- Sound engine (WebAudio, no assets) ----------
let __audio = null, __soundOn = true;
function audio() {
  if (!__audio) { try { __audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (__audio && __audio.state === 'suspended') __audio.resume();
  return __audio;
}
function tone(freq, t0, dur, type, vol) {
  if (!__soundOn) return;
  const ac = audio(); if (!ac) return;
  try {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    const t = ac.currentTime + (t0 || 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) {}
}
function bellSound() { tone(660, 0, 1.4, 'sine', 0.25); tone(660 * 2.01, 0, 0.9, 'sine', 0.08); tone(880, 0.35, 1.2, 'sine', 0.18); }
function bellBig() { for (let i = 0; i < 3; i++) { tone(523.25, i * 1.1, 1.6, 'sine', 0.3); tone(523.25 * 2.01, i * 1.1, 1.0, 'sine', 0.1); tone(659.25, i * 1.1 + 0.4, 1.2, 'sine', 0.2); } if (navigator.vibrate) { try { navigator.vibrate([80, 120, 80, 120, 200]); } catch (e2) {} } }
function choirSound(n) { const base = [523.25, 659.25, 783.99, 1046.5]; const c = Math.min(4, Math.max(2, n || 2)); for (let i = 0; i < c; i++) { tone(base[i], i * 0.15, 1.8, 'triangle', 0.22); tone(base[i] / 2, i * 0.15, 1.8, 'sine', 0.12); } tone(1318.5, c * 0.15, 1.2, 'sine', 0.12); }
function hymnAlleluia() { const seq = [523.25, 523.25, 659.25, 783.99, 783.99, 1046.5]; seq.forEach((f, i) => tone(f, i * 0.22, 0.5, 'triangle', 0.2)); }
function chimeSound() { tone(523.25, 0, 0.6, 'triangle', 0.2); tone(659.25, 0.12, 0.6, 'triangle', 0.2); tone(783.99, 0.24, 0.9, 'triangle', 0.2); }
function popSound() { tone(520, 0, 0.12, 'square', 0.06); tone(780, 0.06, 0.14, 'square', 0.05); }
function amenSound() { tone(392, 0, 0.5, 'sine', 0.2); tone(523.25, 0.25, 0.8, 'sine', 0.2); }
const __soundBtn = document.getElementById('soundBtn');
if (__soundBtn) __soundBtn.onclick = (e) => {
  e.stopPropagation();
  __soundOn = !__soundOn;
  __soundBtn.textContent = __soundOn ? '🔊' : '🔕';
  __soundBtn.classList.toggle('off', !__soundOn);
  if (__soundOn) popSound();
};
// Unlock audio on first touch (iOS requirement)
addEventListener('touchstart', () => audio(), { once: true, passive: true });
addEventListener('pointerdown', () => audio(), { once: true });
const camera = new THREE.PerspectiveCamera(58, innerWidth/innerHeight, 0.1, 900);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("c"), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
addEventListener("resize", () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x4a5a4a, 1.35));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.0);
sun.position.set(8, 14, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.camera.left = -130; sun.shadow.camera.right = 130;
sun.shadow.camera.top = 130; sun.shadow.camera.bottom = -130;
sun.shadow.camera.far = 300; scene.add(sun);
const streetSun = new THREE.DirectionalLight(0xfff4de, 2.2);
streetSun.position.set(140, 60, -40);
streetSun.castShadow = true;
streetSun.shadow.mapSize.set(2048, 2048);
streetSun.shadow.bias = -0.0004;
streetSun.shadow.camera.left = -130; streetSun.shadow.camera.right = 130;
streetSun.shadow.camera.top = 130; streetSun.shadow.camera.bottom = -130;
streetSun.shadow.camera.far = 300;
streetSun.target.position.set(100, 0, 10); scene.add(streetSun.target); scene.add(streetSun);
scene.add(new THREE.AmbientLight(0x8899bb, 0.55));
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 50), new THREE.MeshStandardMaterial({ color: 0x4a3f35 }));
floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);
const carpet = new THREE.Mesh(new THREE.PlaneGeometry(4, 34), new THREE.MeshStandardMaterial({ color: 0x7a1f2b }));
carpet.rotation.x = -Math.PI/2; carpet.position.y = 0.01; scene.add(carpet);
function wall(w,h,d,x,y,z,c) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({ color: c }));
  m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
const wallBack = wall(40, 9, 1, 0, 4.5, -20, 0xd9c9a8);
const wallL = wall(1, 9, 50, -20, 4.5, 5, 0xcbb894);
const wallR = wall(1, 9, 50, 20, 4.5, 5, 0xcbb894);
scene.add(wallL); scene.add(wallR);
// Interior theme per church (same hall, different soul)
const INTERIOR_THEME = {
  'church-1': { wall: 0xbfb49a, carpet: 0x5a1f2b, win: 0x3b5bff, label: 'DUC BA PARIS' },
  'church-2': { wall: 0xf0e9d8, carpet: 0x274e7a, win: 0xffe9a0, label: 'VATICAN ST. PETER' },
  'church-3': { wall: 0xe8d3c4, carpet: 0x7a3a2e, win: 0xff9d6a, label: 'SAGRADA FAMILIA' },
};
const __inCv = document.createElement('canvas'); __inCv.width = 512; __inCv.height = 80;
const __inTex = new THREE.CanvasTexture(__inCv);
const interiorSign = new THREE.Sprite(new THREE.SpriteMaterial({ map: __inTex, depthTest: false }));
interiorSign.scale.set(14, 2.2, 1); interiorSign.position.set(0, 10.2, -18); scene.add(interiorSign);
// Cum trang tri rieng trong long tung nha tho noi tieng
const interiorExtra = new THREE.Group(); scene.add(interiorExtra);
function clearGroup(gr) { for (let i = gr.children.length - 1; i >= 0; i--) { const o = gr.children[i]; gr.remove(o); } if (gr === interiorExtra) interiorExtra.userData.star = null; }
function applyInteriorTheme(zone) {
  const th = INTERIOR_THEME[zone];
  if (!th) return;
  try {
    wallBack.material.color.setHex(th.wall);
    carpet.material.color.setHex(th.carpet);
    const c = document.createElement('canvas'); // reuse
    const g2 = __inCv.getContext('2d');
    g2.clearRect(0, 0, 512, 80);
    g2.fillStyle = 'rgba(0,0,0,0.55)'; g2.beginPath(); g2.roundRect(6, 8, 500, 64, 12); g2.fill();
    g2.fillStyle = '#ffd76a'; g2.font = 'bold 36px system-ui'; g2.textAlign = 'center';
    g2.fillText(th.label, 256, 54);
    __inTex.needsUpdate = true;
  } catch (e) {}
  try { buildInteriorExtra(zone); } catch (e) {}
  try {
    const nl = scene.userData.naveLights;
    if (nl) {
      if (zone === 'church-2') { nl[0].intensity = 5.2; nl[1].intensity = 4.8; nl[0].position.set(0, 8, 2); nl[1].position.set(0, 8.5, -13); }
      else if (zone === 'church-1') { nl[0].intensity = 5.8; nl[1].intensity = 5.2; nl[0].position.set(0, 8, 6); nl[1].intensity = 5.2; nl[1].position.set(0, 8.5, -14); }
      else { nl[0].intensity = 3.4; nl[1].intensity = 3.0; nl[0].position.set(0, 7, 4); nl[1].position.set(0, 7, -10); }
    }
  } catch (e) {}
}
// Noi that rieng: Duc Ba Paris (Gothic) / Vatican (Baroque + mai vom) / Sagrada (cay + kinh mau ruc ro)
function buildInteriorExtra(zone) {
  clearGroup(interiorExtra);
  const add = (m) => { interiorExtra.add(m); return m; };
  function bx(w, h, d, mat, x, y, z, ry) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); if (ry) m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true; add(m); return m;
  }
  if (zone === 'church-1') {
    // DUC BA PARIS NOI THAT THAT (2026, mo lai 8/12/2024): dai 127m rong 48m, gian giua 13m x 60m vom 33m,
    // 10 nhip + doi hanh lang + doi ambulatory (duy nhat), 75 cot, 113 cua so, vom sexpartite 6 mui,
    // 3 tang: arcade - gallery - cua so cao, choir 38m + apse 5 canh, 29 nha nguyen,
    // dai organ 5 phim 109 stops ~8000 ong + organ choir 30 stops 2000 ong, kho bau phia nam.
    const colMat = new THREE.MeshStandardMaterial({ color: 0xa89c86, roughness: 0.9 });
    const darkM = new THREE.MeshStandardMaterial({ color: 0x6b6256, roughness: 0.9 });
    const goldM = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.6, roughness: 0.35 });
    // San da caro nau-xam
    for (let tI = 0; tI < 8; tI++) for (let tJ = 0; tJ < 10; tJ++) {
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
        new THREE.MeshStandardMaterial({ color: (tI + tJ) % 2 ? 0x8a8172 : 0x5e574a, roughness: 0.95 }));
      tile.rotation.x = -Math.PI / 2; tile.position.set(-14 + tI * 4, 0.02, -16 + tJ * 4); add(tile);
    }
    // 10 nhip that (moi nhip = khoang giua 2 tru): doi hanh lang 2 hang cot moi ben
    for (let i = 0; i < 10; i++) {
      const z = -16 + i * 3.4;
      for (const sx of [-6, 6]) { // hang cot gian chinh (rong 13m)
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 7.2, 10), colMat);
        col.position.set(sx, 3.6, z); col.castShadow = true; add(col);
        for (let k = 0; k < 4; k++) { // cot chum 4 than nho kieu Gothic
          const a = k * Math.PI / 2 + Math.PI / 4;
          const mini = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7.2, 8), colMat);
          mini.position.set(sx + Math.cos(a) * 0.75, 3.6, z + Math.sin(a) * 0.75); add(mini);
        }
        bx(2.0, 0.4, 2.0, darkM, sx, 0.2, z);
        bx(1.9, 0.5, 1.9, colMat, sx, 7.4, z);
      }
      for (const sx of [-11.9, 11.9]) { // hang cot ngoai (hanh lang ngoai rong 5.9m, vom 10.1m)
        const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 5.6, 10), colMat);
        col2.position.set(sx, 2.8, z); col2.castShadow = true; add(col2);
        bx(1.7, 0.4, 1.7, darkM, sx, 0.2, z);
      }
      // Vom sexpartite 6 mui: 2 xuong cheo + 1 xuong ngang giua nhip
      for (const sd of [-1, 1]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 9.5), darkM);
        rib.position.set(sd * 3, 8.6, z); rib.rotation.x = sd * 0.5; add(rib);
        const armA = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.6, 0.3), colMat);
        armA.position.set(sd * 3, 8.2, z); armA.rotation.z = sd * 0.62; add(armA);
      }
      const key = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), darkM);
      key.position.set(0, 8.9, z); add(key);
    }
    // 3 tang that: arcade lon + gallery (rong = hanh lang 5.9m, cua doi vom nhon) + cua so cao mo rong the ky 13
    for (let i = 0; i < 10; i++) {
      const z = -16 + i * 3.4;
      for (const sx of [-9, 9]) {
        bx(0.5, 2.2, 1.6, colMat, sx, 5.6, z); // gallery
        for (const o of [-0.4, 0.4]) {
          const gw = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.6),
            new THREE.MeshStandardMaterial({ color: 0x3b5bff, emissive: 0x2b4bff, emissiveIntensity: 0.5, roughness: 0.3 }));
          gw.position.set(sx + (sx > 0 ? -0.3 : 0.3), 5.6, z + o); gw.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; add(gw);
        }
        const hw = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.6),
          new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0xbfe6ff, emissiveIntensity: 0.45, roughness: 0.3 }));
        hw.position.set(sx + (sx > 0 ? -0.35 : 0.35), 7.6, z); hw.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; add(hw);
      }
    }
    // Hoa hong TAY 9.6m MAT TRONG tren cua vao + hoa hong BAC-NAM 13.1m 2 ben transept
    const rose = new THREE.Mesh(new THREE.CircleGeometry(2.8, 28),
      new THREE.MeshStandardMaterial({ color: 0x2b4bff, emissive: 0x2b4bff, emissiveIntensity: 0.55, roughness: 0.3 }));
    rose.position.set(0, 6.8, 21.5); rose.rotation.y = Math.PI; add(rose);
    for (let pI = 0; pI < 12; pI++) {
      const a = pI / 12 * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.CircleGeometry(0.62, 10),
        new THREE.MeshStandardMaterial({ color: pI % 2 ? 0x1e3aff : 0xc41f3d, emissive: pI % 2 ? 0x1e3aff : 0xff4d2e, emissiveIntensity: 0.55 }));
      petal.position.set(Math.cos(a) * 1.55, 6.8 + Math.sin(a) * 1.55, 21.46); petal.rotation.y = Math.PI; add(petal);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.28, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.6 }));
    ring.position.set(0, 6.8, 21.45); add(ring);
    for (let a = 0; a < 12; a++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.4, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.6 }));
      spoke.position.set(0, 6.8, 21.43); add(spoke);
    }
    for (const sx of [-14.5, 14.5]) { // hoa hong Bac-Nam trong transept
      const tr = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24),
        new THREE.MeshStandardMaterial({ color: 0xc41f3d, emissive: 0x5b2bff, emissiveIntensity: 0.55, roughness: 0.3 }));
      tr.position.set(sx, 6.4, -2); tr.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; add(tr);
      const trR = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.26, 8, 24), colMat);
      trR.position.copy(tr.position); trR.rotation.y = tr.rotation.y; add(trR);
    }
    // Choir: 4 nhip thang + apse 5 canh, stalls go Robert de Cotte 2 day + 22 panel Duc Me + organ choir tren stalls
    bx(7.5, 0.5, 6.0, darkM, 0, 0.25, -17.5); // nen cung thanh nang
    for (const sx of [-3.2, 3.2]) { // 2 day stalls go khac
      bx(1.2, 1.4, 5.2, new THREE.MeshStandardMaterial({ color: 0x4a2f1d, roughness: 0.7 }), sx, 1.2, -17.5);
      for (let pI = 0; pI < 5; pI++) { // panel cuoc doi Duc Me
        const pnl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7),
          new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x6a4a00, emissiveIntensity: 0.3, roughness: 0.6 }));
        pnl.position.set(sx + (sx > 0 ? -0.62 : 0.62), 1.4, -19.3 + pI * 0.95);
        pnl.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; add(pnl);
      }
    }
    const choirOrg = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 1.2), darkM); // organ choir 30 stops 2000 ong tren stalls
    choirOrg.position.set(0, 2.6, -20.2); add(choirOrg);
    for (let pI = 0; pI < 8; pI++) {
      const pp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.0 + (pI % 3) * 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0xd7dee8, metalness: 0.7, roughness: 0.3 }));
      pp.position.set(-1.75 + pI * 0.5, 3.8, -20.2); add(pp);
    }
    // Ban tho chinh + tuong Duc Me & Hai Dong trong cung thanh + noi that phung vu duong dai moi (2024)
    bx(5.2, 1.1, 1.6, new THREE.MeshStandardMaterial({ color: 0xf3e9d2, roughness: 0.6 }), 0, 1.05, -16.5);
    bx(5.6, 0.25, 2.0, darkM, 0, 1.7, -16.5);
    bx(3.4, 1.0, 0.9, goldM, 0, 1.4, -18.9); // ban tho moi dong ma vang
    const madonna = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
    madonna.position.set(0, 2.6, -19.6); add(madonna);
    const child = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff6dd, roughness: 0.5 }));
    child.position.set(0.35, 2.5, -19.3); add(child);
    bx(1.2, 1.0, 1.2, darkM, 0, 0.5, -19.6);
    for (let cI = -2; cI <= 2; cI++) {
      if (!cI) continue;
      const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0xfff6dd }));
      cd.position.set(cI * 1.1, 2.2, -16.5); add(cd);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc94d }));
      fl.position.set(cI * 1.1, 2.65, -16.5); add(fl);
    }
    const apseMural = new THREE.Mesh(new THREE.CircleGeometry(1.8, 20),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x6a4a00, emissiveIntensity: 0.4, roughness: 0.6 }));
    apseMural.position.set(0, 6.2, -19.4); add(apseMural);
    // 29 nha nguyen: 4/ben quanh gian + 5 radiating quanh chevet + mo Simon Matifas + bia Etienne Yvert
    for (let i = 0; i < 4; i++) for (const sx of [-15.5, 15.5]) {
      const z = -12 + i * 5;
      bx(0.6, 5, 3.6, colMat, sx, 2.5, z);
      const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.6 }));
      st.position.set(sx * 0.92, 1.6, z); add(st);
      bx(1.4, 0.9, 1.2, darkM, sx * 0.92, 0.45, z);
      const alt = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xf3e9d2, roughness: 0.6 }));
      alt.position.set(sx * 0.92, 0.9, z - 1.2); add(alt);
      const vot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc94d }));
      vot.position.set(sx * 0.92, 1.05, z + 1.1); add(vot);
    }
    for (let rI = -2; rI <= 2; rI++) { // 5 nha nguyen radiating
      const a = rI * 0.45;
      const cx = Math.sin(a) * 7, cz = -19 - Math.cos(a) * 2.5;
      bx(2.2, 3.4, 1.4, colMat, cx, 1.7, cz, -a);
    }
    bx(2.0, 0.6, 1.2, darkM, -5.5, 0.3, -14); // mo Giam muc Simon Matifas (hoa tiet son the ky 13)
    bx(1.6, 0.15, 0.9, new THREE.MeshStandardMaterial({ color: 0x9a917e, roughness: 0.9 }), 5.5, 0.1, -10); // bia Etienne Yvert 1468
    // Kho bau phia NAM: cua sacristy + phong vom 12m + 3 kinh mau + 4 thien than + Phero/Phao-lo + Vong Gai
    bx(2.4, 3.6, 0.4, new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.7 }), 14.2, 1.8, -14);
    for (let wI = 0; wI < 3; wI++) {
      const tw = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x3b5bff, emissive: 0x2b4bff, emissiveIntensity: 0.5 }));
      tw.position.set(14.6, 6.5, -16 + wI * 2); tw.rotation.y = -Math.PI / 2; add(tw);
    }
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 8, 18), goldM); // Vong Gai
    crown.position.set(13.5, 1.6, -13); crown.rotation.x = Math.PI / 3; add(crown);
    bx(1.0, 0.9, 1.0, darkM, 13.5, 0.45, -13);
    // Tuong mat trong phia cua vao: 2 mang tuong 2 ben, GIUA DE TRONG lam loi ra
    bx(12.5, 9, 0.8, colMat, -8.75, 4.5, 22.2);
    bx(12.5, 9, 0.8, colMat, 8.75, 4.5, 22.2);
    bx(5.4, 3.2, 0.8, colMat, 0, 7.4, 22.2); // dau tuong tren cua (duoi hoa hong)
    // Khung da cua + 2 canh go MO TOANG vao trong
    bx(0.6, 5.6, 1.2, darkM, -2.7, 2.8, 22.0);
    bx(0.6, 5.6, 1.2, darkM, 2.7, 2.8, 22.0);
    bx(6.0, 0.6, 1.2, darkM, 0, 5.8, 22.0);
    const doorMatND = new THREE.MeshStandardMaterial({ color: 0x4a2f1d, roughness: 0.7 });
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.8, 0.25), doorMatND);
      leaf.position.set(s * 1.9, 2.4, 20.6); leaf.rotation.y = s * 1.15;
      leaf.castShadow = true; add(leaf);
      const handle = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.6, roughness: 0.3 }));
      handle.position.set(s * 0.9, 2.4, 20.1); add(handle);
    }
    // LOI RA mo toang
    bx(4.8, 0.25, 1.6, darkM, 0, 0.12, 22.0); // nguong da
    for (const s of [-1, 1]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.4, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffe9a0, emissiveIntensity: 0.7 }));
      jamb.position.set(s * 2.55, 2.7, 22.3); add(jamb);
    }
    // Gac DAI ORGAN phia tay: 5 phim + 109 stops ~8000 ong (mo phong 5 hang ong + vo neo-Gothic)
    bx(12, 0.5, 2.6, darkM, 0, 4.6, 20.4);
    for (let bI = -5; bI <= 5; bI++) bx(0.25, 1.0, 0.25, colMat, bI * 1.0, 5.3, 19.3);
    for (let r = 0; r < 5; r++) for (let pI = 0; pI < 9; pI++) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4 + r * 0.35 + (pI % 3) * 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0xd7dee8, metalness: 0.7, roughness: 0.3 }));
      pipe.position.set(-3.2 + pI * 0.8, 6.0 + r * 0.12, 20.9 + r * 0.18); add(pipe);
    }
    // Den chum vong + xich treo
    for (let i = 0; i < 2; i++) {
      const z = -4 + i * 10;
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), darkM);
      chain.position.set(0, 8.0, z); add(chain);
      const chandelier = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.14, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0x8a6a2f, metalness: 0.6, roughness: 0.4 }));
      chandelier.rotation.x = Math.PI / 2; chandelier.position.set(0, 6.8, z); add(chandelier);
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2;
        const cd = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffd76a }));
        cd.position.set(Math.cos(a) * 1.3, 7.0, z + Math.sin(a) * 1.3); add(cd);
      }
    }
    // Den rieng gian Duc Ba: 4 point light doc gian + 1 spot cung thanh (noi that dai 60m can sang deu)
    for (const lz of [12, 4, -4, -12]) {
      const pl = new THREE.PointLight(0xffe2b0, 60, 30, 1.6);
      pl.position.set(0, 6.5, lz); add(pl);
    }
    const choirSpot = new THREE.SpotLight(0xfff2cf, 120, 30, 0.7, 0.5, 1.4);
    choirSpot.position.set(0, 8.5, -8); choirSpot.target.position.set(0, 1, -18); add(choirSpot.target); add(choirSpot);
  } else if (zone === 'church-2') {
    // VATICAN NOI THAT THAT (2026): gian chinh 26m x 45.5m vom thung coffer ma vang,
    // Baldacchino Bernini 28.74m + Confessio + ban tho Giao Hoang,
    // 4 tuong khong lo chan vom + mai vom 41.5m 16 cua so + Cathedra apse cua so Bo Cau.
    const bronze = new THREE.MeshStandardMaterial({ color: 0x5a3a22, metalness: 0.6, roughness: 0.35 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.65, roughness: 0.3 });
    const marble = new THREE.MeshStandardMaterial({ color: 0xf0e9d8, roughness: 0.35 });
    const darkM = new THREE.MeshStandardMaterial({ color: 0x6b6256, roughness: 0.9 });
    // San cam thach + vach do dai cac nha tho the gioi (dau dong that trong nen)
    for (let tI = 0; tI < 8; tI++) for (let tJ = 0; tJ < 10; tJ++) {
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
        new THREE.MeshStandardMaterial({ color: (tI + tJ) % 2 ? 0xe8e0d0 : 0xb8a888, roughness: 0.4 }));
      tile.rotation.x = -Math.PI / 2; tile.position.set(-14 + tI * 4, 0.02, -16 + tJ * 4); add(tile);
    }
    bx(30, 0.06, 0.5, darkM, 0, 0.05, 2.0);
    // 3 cap pilaster Corinthian + vom thung coffer vang 2 ben gian chinh
    for (let i = 0; i < 3; i++) for (const sx of [-9, 9]) {
      const z = -12 + i * 7;
      bx(1.6, 8.5, 1.6, marble, sx, 4.25, z);
      bx(2.0, 0.6, 2.0, gold, sx, 8.6, z);
      bx(2.0, 0.5, 2.0, darkM, sx, 0.25, z);
    }
    for (let i = 0; i < 6; i++) {
      const cof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 2.4),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.4, roughness: 0.5 }));
      cof.position.set(-5.5, 8.9, -12 + i * 3.4); add(cof);
      const cof2 = cof.clone(); cof2.position.x = 5.5; add(cof2);
    }
    // Baldacchino Bernini: 4 cot xoan Solomonic 20m + ong be Barberini + thien than + cau vang-thap tu
    for (const sx of [-2.2, 2.2]) for (const sz of [-16.5, -13.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 5.5, 10), bronze);
      col.position.set(sx, 2.75, sz); col.castShadow = true; add(col);
      for (let rI = 0; rI < 5; rI++) {
        const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 6, 12), gold);
        wrap.rotation.x = Math.PI / 2; wrap.position.set(sx, 0.9 + rI * 1.0, sz); add(wrap);
      }
      // de cam thach co phu dieu ong Barberini (3 con ong vang)
      bx(1.1, 0.5, 1.1, marble, sx, 0.25, sz);
      for (let bI = 0; bI < 3; bI++) {
        const bee = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), gold);
        bee.position.set(sx - 0.3 + bI * 0.3, 0.55, sz + 0.56); add(bee);
      }
    }
    bx(5.8, 0.6, 4.4, bronze, 0, 5.8, -15);
    bx(5.0, 0.5, 3.6, gold, 0, 6.3, -15);
    for (const [sx, sz] of [[-2.2, -16.5], [2.2, -16.5], [-2.2, -13.5], [2.2, -13.5]]) {
      const angel = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 8), gold);
      angel.position.set(sx, 6.9, sz); add(angel);
    }
    // Bo Cau Chua Thanh Than mat duoi tan + tia vang
    const doveIn = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
    doveIn.position.set(0, 5.9, -15); add(doveIn);
    for (let rI = 0; rI < 8; rI++) {
      const a = rI / 8 * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.0), gold);
      ray.position.set(Math.cos(a) * 0.7, 5.9, -15 + Math.sin(a) * 0.7);
      ray.rotation.y = -a; add(ray);
    }
    const globeV = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), gold);
    globeV.position.set(0, 7.1, -15); add(globeV);
    const papalCross = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.4, 0.22), gold);
    papalCross.position.set(0, 8.0, -15); add(papalCross);
    // Ban tho Giao Hoang + Confessio ha xuong truoc Baldacchino + 95 den votive + lan can
    bx(4.2, 1.0, 1.6, marble, 0, 0.5, -15);
    bx(4.6, 0.15, 2.0, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), 0, 1.05, -15);
    bx(3.0, 0.9, 2.2, darkM, 0, -0.4, -12.2);
    for (let lI = 0; lI < 12; lI++) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xffd75d, emissive: 0xffb52e, emissiveIntensity: 0.9 }));
      lamp.position.set(-1.3 + (lI % 6) * 0.52, 0.35, -11.4 - Math.floor(lI / 6) * 0.5); add(lamp);
    }
    bx(3.6, 0.15, 0.25, marble, 0, 0.55, -11.1);
    bx(0.25, 0.6, 2.4, marble, -1.8, 0.3, -12.2);
    bx(0.25, 0.6, 2.4, marble, 1.8, 0.3, -12.2);
    // 4 tru vom khong lo + 4 tuong: Veronica, Helena, Longinus, Andre
    const pierNames = ['VERONICA', 'HELENA', 'LONGINVS', 'ANDREAS'];
    let pI = 0;
    for (const px of [-5.5, 5.5]) for (const pz of [-5.5, 1.5]) {
      bx(2.2, 9.0, 2.2, marble, px, 4.5, pz);
      const niche = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.0),
        new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.9 }));
      niche.position.set(px * 0.82, 3.2, pz); niche.rotation.y = px > 0 ? -Math.PI / 2 : Math.PI / 2; add(niche);
      const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.4, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }));
      st.position.set(px * 0.78, 2.6, pz); add(st);
    }
    // Mai vom trong: 16 cua so tang trong + chu TV ES PETRVS + 4 Phuc Am pendentive
    const domeIn = new THREE.Mesh(new THREE.SphereGeometry(7.0, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
      new THREE.MeshStandardMaterial({ color: 0xf3e9d2, roughness: 0.7, side: THREE.DoubleSide }));
    domeIn.position.set(0, 5.2, -2); add(domeIn);
    for (let rI = 0; rI < 16; rI++) {
      const a = rI / 16 * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 5.2), gold);
      rib.position.set(Math.cos(a) * 2.9, 8.6, -2 + Math.sin(a) * 2.9);
      rib.rotation.y = -a; rib.rotation.x = 0.5; add(rib);
    }
    const oculus = new THREE.Mesh(new THREE.CircleGeometry(1.3, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
    oculus.position.set(0, 11.4, -2); oculus.rotation.x = Math.PI / 2; add(oculus);
    const drumIn = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 2.2, 20, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xe8dfc8, roughness: 0.7, side: THREE.DoubleSide }));
    drumIn.position.set(0, 6.2, -2); add(drumIn);
    for (let wI = 0; wI < 8; wI++) {
      const a = wI / 8 * Math.PI * 2;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6),
        new THREE.MeshBasicMaterial({ color: 0xcfe8ff }));
      win.position.set(Math.cos(a) * 6.55, 6.2, -2 + Math.sin(a) * 6.55);
      win.rotation.y = -a + Math.PI / 2; add(win);
    }
    // Nguyen Pieta (phai so 1) + Cua Thanh (cuoi phai) + tuong dong Thanh Phero
    bx(2.6, 3.2, 0.4, marble, 14, 1.6, -8);
    const pieta = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.4 }));
    pieta.position.set(14, 1.8, -7.6); pieta.rotation.z = 0.5; add(pieta);
    bx(2.2, 3.4, 0.3, new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.7 }), 14, 1.7, 4);
    const peter = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.2, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a3a22, metalness: 0.6, roughness: 0.4 }));
    peter.position.set(6.5, 1.5, -6); add(peter);
    bx(1.2, 0.8, 1.2, marble, 6.5, 0.4, -6);
    // Pilaster + hoc tuong thanh 2 ben gian (mo phong that)
    for (let i = 0; i < 3; i++) for (const sx of [-14, 14]) {
      const z = -10 + i * 6;
      bx(1.8, 7.5, 0.8, marble, sx, 3.75, z);
      const niche = new THREE.Mesh(new THREE.CircleGeometry(0.9, 14),
        new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.9 }));
      niche.position.set(sx * 0.94, 3.4, z); niche.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; add(niche);
      const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.1, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }));
      st.position.set(sx * 0.9, 2.4, z); add(st);
      bx(1.4, 1.0, 1.4, new THREE.MeshStandardMaterial({ color: 0xd9cfc0, roughness: 0.8 }), sx * 0.9, 0.5, z);
      const haloM = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 6, 14), gold);
      haloM.position.set(sx * 0.9, 3.8, z); haloM.rotation.y = Math.PI / 2; add(haloM);
    }
    // Cathedra Petri apse: ngai dong ma vang + 4 Tien si + cua so thach cao Bo Cau tia vang
    bx(4.6, 3.4, 1.0, gold, 0, 1.7, -18.9);
    bx(3.0, 2.0, 0.6, new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 0.7 }), 0, 1.5, -18.4);
    for (const sx of [-3.2, -1.1, 1.1, 3.2]) {
      const doc = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.0, 4, 8), gold);
      doc.position.set(sx, 2.6, -18.7); add(doc);
    }
    const glory = new THREE.Mesh(new THREE.CircleGeometry(1.6, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.9 }));
    glory.position.set(0, 5.2, -19.2); add(glory);
    const dove = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    dove.position.set(0, 5.2, -19.0); add(dove);
    for (let rI = 0; rI < 12; rI++) {
      const a = rI / 12 * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.6), gold);
      ray.position.set(Math.cos(a) * 1.6, 5.2 + Math.sin(a) * 1.6, -19.1);
      ray.rotation.z = a; add(ray);
    }
    // LOI RA Vatican: cua dong mo toang + anh sang ngoai hanh lang
    bx(12.5, 9, 0.8, marble, -8.75, 4.5, 22.2);
    bx(12.5, 9, 0.8, marble, 8.75, 4.5, 22.2);
    bx(5.4, 2.6, 0.8, marble, 0, 7.7, 22.2);
    bx(0.7, 6.0, 1.3, bronze, -2.7, 3.0, 22.0);
    bx(0.7, 6.0, 1.3, bronze, 2.7, 3.0, 22.0);
    bx(6.1, 0.6, 1.3, bronze, 0, 6.2, 22.0);
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.2, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x4a2f1d, roughness: 0.6, metalness: 0.2 }));
      leaf.position.set(s * 1.9, 2.6, 20.6); leaf.rotation.y = s * 1.15;
      leaf.castShadow = true; add(leaf);
    }
    const exitGlowV = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 5.6),
      new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.12, depthWrite: false }));
    exitGlowV.position.set(0, 2.9, 22.9); exitGlowV.rotation.y = Math.PI; add(exitGlowV);
    bx(4.8, 0.25, 1.6, marble, 0, 0.12, 22.0);
    // Den pha le 2 hang gian chinh
    for (let i = 0; i < 2; i++) {
      const z = -4 + i * 9;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), bronze);
      rod.position.set(0, 7.8, z); add(rod);
      const cry = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xfff6d8, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }));
      cry.position.set(0, 6.4, z); add(cry);
    }
} else {
    // Sagrada NOI THAT that: rung cot hyperboloid + kinh mau dong-tay + canopy
    const trunkM = new THREE.MeshStandardMaterial({ color: 0xd9c4a8, roughness: 0.8 });
    const trunkM2 = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.8 });
    // San da am + tham do giua
    for (let tI = 0; tI < 8; tI++) for (let tJ = 0; tJ < 10; tJ++) {
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
        new THREE.MeshStandardMaterial({ color: (tI + tJ) % 2 ? 0x9a8a72 : 0x6e6252, roughness: 0.9 }));
      tile.rotation.x = -Math.PI / 2; tile.position.set(-14 + tI * 4, 0.02, -16 + tJ * 4); add(tile);
    }
    const leafGlow = [0xff5d5d, 0xffd75d, 0x5da8ff, 0x6fff8f, 0xc07bff];
    for (let i = 0; i < 4; i++) for (const sx of [-8, 8]) {
      const z = -12 + i * 7;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.95, 8.2, 8), (i + (sx > 0 ? 1 : 0)) % 2 ? trunkM : trunkM2);
      trunk.position.set(sx, 4.1, z); trunk.castShadow = true; add(trunk);
      const knot = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.14, 8, 12), trunkM);
      knot.rotation.x = Math.PI / 2; knot.position.set(sx, 3.2 + (i % 3), z); add(knot);
      for (let bI = 0; bI < 4; bI++) { // 4 nhanh hyperbolic
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, 3.8, 6), trunkM);
        const a = bI * Math.PI / 2 + i * 0.4;
        br.position.set(sx + Math.cos(a) * 1.3, 8.6, z + Math.sin(a) * 1.3);
        br.rotation.z = Math.cos(a) * 0.7; br.rotation.x = -Math.sin(a) * 0.7; add(br);
      }
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.8, 8), trunkM);
      cap.position.set(sx, 9.0, z); add(cap);
    }
    // Tran canopy + gieng troi sao
    for (let i = 0; i < 4; i++) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 18),
        new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffd75d, emissiveIntensity: 0.3, roughness: 0.6 }));
      disc.rotation.x = Math.PI / 2; disc.position.set(0, 9.2, -9 + i * 7); add(disc);
    }
    // Kinh mau: tay do-cam (hoang hon) / dong xanh-luc (binh minh)
    for (let i = 0; i < 5; i++) {
      const warm = [0xff5d5d, 0xff9d6a, 0xffd75d][i % 3];
      const cool = [0x5da8ff, 0x6fff8f, 0xc07bff][i % 3];
      const winW = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.6),
        new THREE.MeshStandardMaterial({ color: warm, emissive: warm, emissiveIntensity: 0.8, roughness: 0.25 }));
      winW.position.set(-19.4, 4.6, -12 + i * 6); winW.rotation.y = Math.PI / 2; add(winW);
      const winE = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.6),
        new THREE.MeshStandardMaterial({ color: cool, emissive: cool, emissiveIntensity: 0.8, roughness: 0.25 }));
      winE.position.set(19.4, 4.6, -12 + i * 6); winE.rotation.y = -Math.PI / 2; add(winE);
      for (let dI = 0; dI < 3; dI++) { // khung da giua cac o kinh
        const mull = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.6, 0.15), trunkM);
        mull.position.set(-19.3, 4.6, -12.7 + i * 6 + dI * 0.7); add(mull);
        const mull2 = mull.clone(); mull2.position.x = 19.3; add(mull2);
      }
    }
    // Ban tho + canopy treo + ngoi sao Bethlehem
    bx(4.6, 1.0, 1.8, new THREE.MeshStandardMaterial({ color: 0xf3e9d2, roughness: 0.5 }), 0, 0.5, -16);
    const cano = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8d3b0, roughness: 0.7, side: THREE.DoubleSide }));
    cano.position.set(0, 7.6, -16); add(cano);
    for (let cI = 0; cI < 4; cI++) {
      const a = cI * Math.PI / 2 + Math.PI / 4;
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), trunkM2);
      cable.position.set(Math.cos(a) * 2.1, 8.9, -16 + Math.sin(a) * 2.1); add(cable);
    }
    const cruc = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.0, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.6 }));
    cruc.position.set(0, 2.4, -16.8); add(cruc);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.9),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd75d, emissiveIntensity: 0.9 }));
    star.position.set(0, 6.2, -16); add(star);
    interiorExtra.userData.star = star;
    // LOI RA Sagrada: 2 mang tuong + cua kinh mo toang
    bx(12.5, 9, 0.8, trunkM, -8.75, 4.5, 22.2);
    bx(12.5, 9, 0.8, trunkM, 8.75, 4.5, 22.2);
    bx(5.4, 2.6, 0.8, trunkM, 0, 7.7, 22.2);
    bx(0.7, 6.0, 1.3, trunkM2, -2.7, 3.0, 22.0);
    bx(0.7, 6.0, 1.3, trunkM2, 2.7, 3.0, 22.0);
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.2, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0xbfe6ff, emissiveIntensity: 0.3, roughness: 0.15, metalness: 0.3 }));
      leaf.position.set(s * 1.9, 2.6, 20.6); leaf.rotation.y = s * 1.15;
      leaf.castShadow = true; add(leaf);
    }
    const exitGlowS = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 5.6),
      new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.12, depthWrite: false }));
    exitGlowS.position.set(0, 2.9, 22.9); exitGlowS.rotation.y = Math.PI; add(exitGlowS);
    bx(4.8, 0.25, 1.6, trunkM2, 0, 0.12, 22.0);
  }
}
applyInteriorTheme('church-1');
const winColors = [0xff5d5d, 0x5da8ff, 0x6fff8f, 0xffd75d, 0xc07bff];
for (let i = 0; i < 5; i++) {
  for (const sx of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.4),
      new THREE.MeshStandardMaterial({ color: winColors[i], emissive: winColors[i], emissiveIntensity: 0.55 }));
    win.position.set(sx * 19.4, 5, -12 + i * 6); win.rotation.y = sx > 0 ? -Math.PI/2 : Math.PI/2; scene.add(win);
  }
}
const roof = new THREE.Mesh(new THREE.ConeGeometry(24, 8, 4), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, side: THREE.DoubleSide }));
roof.position.set(0, 13, 5); roof.rotation.y = Math.PI / 4; roof.castShadow = false; roof.receiveShadow = false; scene.add(roof);
// Den tran long nha tho (khong thi trong nha toi om) — tang sang gap doi de khong toi om
const naveLight1 = new THREE.PointLight(0xffe2b0, 2.8, 46, 1.0);
naveLight1.position.set(0, 7, 4); scene.add(naveLight1);
const naveLight2 = new THREE.PointLight(0xffd9a0, 2.5, 44, 1.0);
naveLight2.position.set(0, 7, -10); scene.add(naveLight2);
scene.userData.naveLights = [naveLight1, naveLight2];
// ---- Vista sau cua chinh: nhin tu trong ra van thay pho (luon hien, khong phu thuoc streetGroup) ----
(function buildDoorVista() {
  const g = new THREE.Group(); scene.add(g);
  scene.userData.doorVista = g;
  const grassM = new THREE.MeshStandardMaterial({ color: 0x4a7a44, roughness: 1 });
  const roadM = new THREE.MeshStandardMaterial({ color: 0x4d5259, roughness: 0.95 });
  const walkM = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.9 });
  const meadow = new THREE.Mesh(new THREE.PlaneGeometry(70, 44), grassM);
  meadow.rotation.x = -Math.PI / 2; meadow.position.set(0, -0.02, 44); meadow.receiveShadow = true; g.add(meadow);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 9), roadM);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.0, 40); road.receiveShadow = true; g.add(road);
  for (let i = 0; i < 10; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xf5d76a }));
    dash.rotation.x = -Math.PI / 2; dash.position.set(-22 + i * 5, 0.02, 40); g.add(dash);
  }
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(60, 4), walkM);
  walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.01, 31.5); g.add(walk);
  // loi di tu nguong cua ra via he + vach ke duong
  const path = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 9), new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.85 }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.015, 27); g.add(path);
  for (let s = 0; s < 4; s++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.03, 24.6 + s * 1.1); g.add(stripe);
  }
  // den duong 2 ben + quao sang am
  const glowCv = document.createElement("canvas"); glowCv.width = glowCv.height = 64;
  const gg = glowCv.getContext("2d");
  const grd = gg.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, "rgba(255,233,160,0.9)"); grd.addColorStop(1, "rgba(255,233,160,0)");
  gg.fillStyle = grd; gg.fillRect(0, 0, 64, 64);
  const glowTex = new THREE.CanvasTexture(glowCv); glowTex.colorSpace = THREE.SRGBColorSpace;
  for (const lx of [-6, 6]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6, 10), new THREE.MeshStandardMaterial({ color: 0x2f363d, roughness: 0.6, metalness: 0.4 }));
    pole.position.set(lx, 3, 33); pole.castShadow = true; g.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
    bulb.position.set(lx, 5.9, 33); g.add(bulb);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.7, depthWrite: false }));
    glow.scale.set(3.4, 3.4, 1); glow.position.set(lx, 5.9, 33); g.add(glow);
  }
  // cay xanh 2 ben duong
  for (const [tx, tz] of [[-11, 30], [11, 30], [-14, 38], [14, 38], [-9, 46], [9, 46]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3.2, 10), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 }));
    trunk.position.set(tx, 1.6, tz); trunk.castShadow = true; g.add(trunk);
    const top = new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 10), new THREE.MeshStandardMaterial({ color: 0x2f7a3d, roughness: 0.95 }));
    top.position.set(tx, 4.2, tz); top.castShadow = true; g.add(top);
  }
  // day nha pho doi dien + mai hien + cua kinh sang den
  const houseCols = [0xe8dcc0, 0xd9e6f2, 0xf2d9d9, 0xe2efd9];
  for (let i = 0; i < 4; i++) {
    const hx = -18 + i * 12;
    const hm = new THREE.MeshStandardMaterial({ color: houseCols[i % 4], roughness: 0.85 });
    const house = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 7), hm);
    house.position.set(hx, 3, 52); house.castShadow = true; g.add(house);
    const roofH = new THREE.Mesh(new THREE.ConeGeometry(7.4, 2.6, 4), new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.9 }));
    roofH.position.set(hx, 7.3, 52); roofH.rotation.y = Math.PI / 4; g.add(roofH);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 0.7 }));
    win.position.set(hx, 3.4, 48.4); win.rotation.y = Math.PI; g.add(win);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, 2.4), new THREE.MeshStandardMaterial({ color: [0xc94f4f, 0x4f7dc9, 0x4fae5f, 0xc9a24f][i % 4], roughness: 0.8 }));
    awn.position.set(hx, 2.4, 47.6); awn.rotation.x = 0.15; g.add(awn);
  }
  // dai phun nuoc giua quang truong + bang PHO GIAO XU
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 0.7, 18), new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.7 }));
  basin.position.set(0, 0.35, 44); g.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.3, 18), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x6fbfff, emissiveIntensity: 0.4, transparent: true, opacity: 0.9 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.72, 44); g.add(water);
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 10), new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.75 }));
  jet.position.set(0, 1.9, 44); g.add(jet);
  g.userData.jet = jet;
  const signCv = document.createElement("canvas"); signCv.width = 512; signCv.height = 96;
  const sg = signCv.getContext("2d");
  sg.fillStyle = "rgba(20,28,52,0.85)"; sg.beginPath(); sg.roundRect(6, 8, 500, 80, 14); sg.fill();
  sg.strokeStyle = "#ffd76a"; sg.lineWidth = 4; sg.stroke();
  sg.fillStyle = "#ffd76a"; sg.font = "bold 44px system-ui"; sg.textAlign = "center";
  sg.fillText("PHỐ GIÁO XỨ", 256, 62);
  const signTex = new THREE.CanvasTexture(signCv); signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex, depthTest: false, transparent: true }));
  sign.scale.set(11, 2.1, 1); sign.position.set(0, 8.6, 47); g.add(sign);
})();
for (let r = 0; r < 4; r++) {
  for (const sx of [-1, 1]) {
    const pew = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 1.1), new THREE.MeshStandardMaterial({ color: 0x7c5233 }));
    pew.position.set(sx * 5.6, 0.8, 6 - r * 3.2); pew.castShadow = true; scene.add(pew);
    const back = new THREE.Mesh(new THREE.BoxGeometry(7, 1.4, 0.3), new THREE.MeshStandardMaterial({ color: 0x5e3d25 }));
    back.position.set(sx * 5.6, 1.3, 5.4 - r * 3.2); back.castShadow = true; scene.add(back);
  }
}
const altar = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 2), new THREE.MeshStandardMaterial({ color: 0xf3e9d2 }));
altar.position.set(0, 0.6, -15); altar.castShadow = true; scene.add(altar);
const crossMat = new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0xffd76a, emissiveIntensity: 0.7 });
const cv = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.4, 0.5), crossMat);
cv.position.set(0, 6.5, -19.3); scene.add(cv);
const ch = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.5), crossMat);
ch.position.set(0, 7, -19.3); scene.add(ch);
const candleLight = new THREE.PointLight(0xffb45e, 1.4, 14);
candleLight.position.set(0, 3, -14); scene.add(candleLight);
// Anh nen am theo nguoi khi QUY cau nguyen — ngoai doi that: lung linh, am, trang nghiem
const prayLight = new THREE.PointLight(0xffc06a, 0, 9, 1.6);
prayLight.position.set(0, 1.6, 0); scene.add(prayLight);
scene.userData.prayLight = prayLight;
// --- Gia nen 3D: moi ngon nen tuong ung 1 loi nguyen tren Tuong Nen ---
const candleRack = new THREE.Group(); scene.add(candleRack);
scene.userData.candleRack = candleRack;
scene.userData.candleFlames = [];
(function buildCandleRack() {
  const woodM = new THREE.MeshStandardMaterial({ color: 0x5e3d25, roughness: 0.9 });
  const stand = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, 1.6), woodM);
  stand.position.set(0, 1.05, -13.2); stand.castShadow = true; candleRack.add(stand);
  const legG = new THREE.BoxGeometry(0.25, 1.1, 1.4);
  for (const lx of [-2.6, 2.6]) {
    const leg = new THREE.Mesh(legG, woodM);
    leg.position.set(lx, 0.5, -13.2); candleRack.add(leg);
  }
  const waxM = new THREE.MeshStandardMaterial({ color: 0xfff6dd, roughness: 0.6 });
  const glowCv0 = document.createElement("canvas"); glowCv0.width = glowCv0.height = 64;
  const gg0 = glowCv0.getContext("2d");
  const grd0 = gg0.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd0.addColorStop(0, "rgba(255,210,110,0.95)"); grd0.addColorStop(1, "rgba(255,180,80,0)");
  gg0.fillStyle = grd0; gg0.fillRect(0, 0, 64, 64);
  const glowTex0 = new THREE.CanvasTexture(glowCv0); glowTex0.colorSpace = THREE.SRGBColorSpace;
  for (let i = 0; i < 24; i++) {
    const col = i % 12, row = Math.floor(i / 12);
    const x = -2.5 + col * (5 / 11), z = -13.55 + row * 0.7;
    const h = 0.45 + (i % 4) * 0.12;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, h, 10), waxM);
    c.position.set(x, 1.17 + h / 2, z); candleRack.add(c);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc94d }));
    f.position.set(x, 1.17 + h + 0.08, z); f.visible = false; candleRack.add(f);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex0, transparent: true, opacity: 0.75, depthWrite: false }));
    gl.scale.set(0.9, 0.9, 1); gl.position.copy(f.position); gl.visible = false; candleRack.add(gl);
    scene.userData.candleFlames.push({ flame: f, glow: gl, seed: Math.random() * 10 });
  }
})();
function refreshCandleRack() {
  try {
    const n = Math.min(24, (window.__candles || []).length + (window.__myCandles || 0));
    const arr = scene.userData.candleFlames || [];
    arr.forEach((o, i) => {
      const on = i < Math.max(2, n);
      o.flame.visible = on; o.glow.visible = on;
    });
  } catch (e) {}
}
// Hat hat sang khi cau nguyen sau: bay len tu nguoi dang quy
const prayParts = [];
(function buildPrayParts() {
  const cv0 = document.createElement("canvas"); cv0.width = cv0.height = 64;
  const g0 = cv0.getContext("2d");
  const gr0 = g0.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr0.addColorStop(0, "rgba(255,240,200,1)"); gr0.addColorStop(1, "rgba(255,200,110,0)");
  g0.fillStyle = gr0; g0.fillRect(0, 0, 64, 64);
  const tx0 = new THREE.CanvasTexture(cv0); tx0.colorSpace = THREE.SRGBColorSpace;
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx0, transparent: true, opacity: 0, depthWrite: false }));
    s.userData = { life: 0, max: 2 + Math.random() * 2, seed: Math.random() * 10 };
    s.scale.set(0.35, 0.35, 1); scene.add(s); prayParts.push(s);
  }
})();
scene.userData.prayParts = prayParts;
function tickPrayParts(dt, t, me) {
  try {
    const praying = me && me.action === "cau-nguyen";
    for (const s of prayParts) {
      const u = s.userData;
      if (praying && u.life <= 0 && Math.random() < dt * 6) {
        u.life = u.max; u.seed = Math.random() * 10;
        s.position.set(me.x + (Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.5, me.z + (Math.random() - 0.5) * 1.2);
      }
      if (u.life > 0) {
        u.life -= dt;
        const k = 1 - u.life / u.max;
        s.position.y += dt * 0.7;
        s.position.x += Math.sin(t * 2 + u.seed) * dt * 0.25;
        s.material.opacity = Math.max(0, 0.85 * (1 - k));
        const sc = 0.3 + k * 0.45;
        s.scale.set(sc, sc, 1);
      } else s.material.opacity = 0;
    }
  } catch (e) {}
}
// Not nhac bay len khi CA DOAN hat — moi nguoi dang hat toa ra not nhac
const choirNotes = [];
(function buildChoirNotes() {
  const notes = ["♪", "♫", "♩", "♬"];
  for (let i = 0; i < 30; i++) {
    const cvn = document.createElement("canvas"); cvn.width = cvn.height = 64;
    const gn = cvn.getContext("2d");
    gn.font = "bold 44px system-ui"; gn.textAlign = "center"; gn.textBaseline = "middle";
    gn.fillStyle = "#ffd76a"; gn.shadowColor = "#ff9d4d"; gn.shadowBlur = 8;
    gn.fillText(notes[i % 4], 32, 34);
    const txn = new THREE.CanvasTexture(cvn); txn.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: txn, transparent: true, opacity: 0, depthWrite: false }));
    s.userData = { life: 0, max: 2.5, seed: Math.random() * 10, pid: null };
    s.scale.set(0.7, 0.7, 1); scene.add(s); choirNotes.push(s);
  }
})();
scene.userData.choirNotes = choirNotes;
function tickChoirNotes(dt, t) {
  try {
    const w0 = window.__ntho;
    if (!w0) return;
    for (const s of choirNotes) {
      const u = s.userData;
      if (u.life <= 0) {
        // tim nguoi dang hat de gan not nhac
        if (Math.random() < dt * 4) {
          for (const [id, p] of w0.players) {
            if (p.action === "hat" && Math.random() < 0.3) {
              u.life = u.max; u.seed = Math.random() * 10; u.pid = id;
              s.position.set(p.x + (Math.random() - 0.5) * 1.4, 2.0 + Math.random() * 0.6, p.z + (Math.random() - 0.5) * 1.4);
              break;
            }
          }
        }
      }
      if (u.life > 0) {
        u.life -= dt;
        const k = 1 - u.life / u.max;
        s.position.y += dt * 0.9;
        s.position.x += Math.sin(t * 3 + u.seed) * dt * 0.4;
        s.material.opacity = Math.max(0, 0.95 * (1 - k * k));
        const sc = 0.55 + k * 0.5;
        s.scale.set(sc, sc, 1);
      } else s.material.opacity = 0;
    }
  } catch (e) {}
}
// Song am chuong lan toa khi rung chuong — vong song mo rong tu thap chuong
const bellWaves = [];
(function buildBellWaves() {
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0, depthWrite: false }));
    m.userData = { life: 0, max: 2.2 };
    m.visible = false; scene.add(m); bellWaves.push(m);
  }
})();
function ringBellWave(x, y, z) {
  try {
    const w = bellWaves.find(o => o.userData.life <= 0) || bellWaves[0];
    w.userData.life = w.userData.max;
    w.position.set(x, y, z);
    w.visible = true;
  } catch (e) {}
}
function tickBellWaves(dt) {
  try {
    for (const w of bellWaves) {
      const u = w.userData;
      if (u.life > 0) {
        u.life -= dt;
        const k = 1 - u.life / u.max;
        const r = 1 + k * 9;
        w.scale.set(r, r, r);
        w.material.opacity = Math.max(0, 0.7 * (1 - k));
        w.lookAt(camera.position);
        if (u.life <= 0) w.visible = false;
      }
    }
  } catch (e) {}
}
for (const cx of [-2.4, 2.4]) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 10), new THREE.MeshStandardMaterial({ color: 0xfff6dd }));
  c.position.set(cx, 1.6, -15); scene.add(c);
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc94d }));
  f.position.set(cx, 2.05, -15); scene.add(f);
}
// ---------- STREET zone (ecosystem, far from interior at origin) ----------
const streetGroup = new THREE.Group(); scene.add(streetGroup);
(function buildStreet() {
  function noiseTex(base, fleck, n, size) {
    const cc = document.createElement('canvas'); cc.width = cc.height = size || 256;
    const x = cc.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, cc.width, cc.height);
    for (let i = 0; i < (n || 2600); i++) {
      x.fillStyle = fleck[Math.floor(Math.random() * fleck.length)];
      x.globalAlpha = 0.12 + Math.random() * 0.25;
      const s = 1 + Math.random() * 3;
      x.fillRect(Math.random() * cc.width, Math.random() * cc.height, s, s);
    }
    x.globalAlpha = 1;
    const t = new THREE.CanvasTexture(cc);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(28, 14);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const grassTex = noiseTex('#4a7a44', ['#3d6a38', '#5a8f4f', '#6aa85e', '#355e30'], 4200);
  const roadTex = noiseTex('#4d5259', ['#43484e', '#5a6068', '#33373c'], 3000);
  roadTex.repeat.set(30, 2);
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  gnd.rotation.x = -Math.PI / 2; gnd.position.set(100, -0.05, 10); gnd.receiveShadow = true; streetGroup.add(gnd);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(220, 14), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.94 }));
  road.rotation.x = -Math.PI / 2; road.position.set(100, 0, 22); road.receiveShadow = true; streetGroup.add(road);
  for (let i = 0; i < 22; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), new THREE.MeshBasicMaterial({ color: 0xf5d76a }));
    dash.rotation.x = -Math.PI / 2; dash.position.set(5 + i * 10, 0.02, 22); streetGroup.add(dash);
  }
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(220, 5), new THREE.MeshStandardMaterial({ color: 0x8a8f96 }));
  walk.rotation.x = -Math.PI / 2; walk.position.set(100, 0.01, 12); streetGroup.add(walk);
  for (let i = 0; i < 12; i++) {
    const lx = 5 + i * 18;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6, 10), new THREE.MeshStandardMaterial({ color: 0x2f363d, roughness: 0.6, metalness: 0.4 }));
    pole.position.set(lx, 3, 14); pole.castShadow = true; streetGroup.add(pole);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0x2f363d, roughness: 0.6, metalness: 0.4 }));
    arm.rotation.z = Math.PI / 2; arm.position.set(lx, 5.9, 14.7); streetGroup.add(arm);
    const lampBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.7), new THREE.MeshStandardMaterial({ color: 0x22282e, roughness: 0.5 }));
    lampBox.position.set(lx, 5.75, 15.4); streetGroup.add(lampBox);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
    bulb.position.set(lx, 5.55, 15.4); streetGroup.add(bulb);
    const glowCv = document.createElement('canvas'); glowCv.width = glowCv.height = 64;
    const gg = glowCv.getContext('2d');
    const grd = gg.createRadialGradient(32, 32, 2, 32, 32, 30);
    grd.addColorStop(0, 'rgba(255,233,160,0.85)'); grd.addColorStop(1, 'rgba(255,233,160,0)');
    gg.fillStyle = grd; gg.fillRect(0, 0, 64, 64);
    const glowTex = new THREE.CanvasTexture(glowCv); glowTex.colorSpace = THREE.SRGBColorSpace;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.7, depthWrite: false }));
    glow.scale.set(3.2, 3.2, 1); glow.position.set(lx, 5.55, 15.4); streetGroup.add(glow);
  }
  for (let i = 0; i < 16; i++) {
    const tx = 8 + i * 13, tz = (i % 2 === 0) ? -12 : 48;
    // Tranh cay moc xuyen qua nha tho (chan mat tien + lam toi mat dung)
    let inside = false;
    for (const cf of CHURCHES) { if (Math.abs(tx - cf.x) < 17 && tz < 20) { inside = true; break; } }
    if (inside) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3.4, 10), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 }));
    trunk.position.set(tx, 1.7, tz); trunk.castShadow = true; streetGroup.add(trunk);
    const leafCols = [0x2f7a3d, 0x3d8f47, 0x27632f];
    for (let k = 0; k < 3; k++) {
      const top = new THREE.Mesh(new THREE.SphereGeometry(1.5 - k * 0.25, 12, 10), new THREE.MeshStandardMaterial({ color: leafCols[(i + k) % 3], roughness: 0.95 }));
      top.position.set(tx + (k - 1) * 0.7, 4.0 + k * 0.9, tz + (k % 2 ? 0.5 : -0.4));
      top.castShadow = true; streetGroup.add(top);
    }
  }
  function stone(mat, x, y, z) { const m = new THREE.Mesh(mat.geometry, mat.material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; streetGroup.add(m); return m; }
  function boxAt(w, h, d, mat, x, y, z, ry) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; streetGroup.add(m); return m; }
  CHURCHES.forEach((cf, idx) => {
    const bx = cf.x, bz = -8;
    const wallMat = new THREE.MeshStandardMaterial({ color: cf.color, roughness: 0.92 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.7 });
    const darkStone = new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.95 });
    const cm = new THREE.MeshStandardMaterial({ color: cf.cross, emissive: cf.cross, emissiveIntensity: 0.9 });
    if (cf.style === 'notre-dame') {
      // DUC BA PARIS THAT (so lieu that 2026): dai 127m rong 48m, mat dung 43.5m x 45m (69m ca thap),
      // 2 thap vuong 69m 422 bac, 3 cong Phuong Tay, Gallery Kings 28 tuong o cao 20m,
      // hoa hong tay 9.6m (1225), hoa hong Bac-Nam 13.1m, vom 33m, fleche Viollet-le-Duc 96m 16 tuong dong + ga trong.
      boxAt(22, 11, 15, wallMat, bx, 5.5, bz);
      boxAt(22.6, 0.9, 15.6, trimMat, bx, 11.2, bz);
      boxAt(22.6, 1.1, 15.6, darkStone, bx, 0.55, bz); // de da
      // 4 tru buttress dung mat tien (day doc + chay len dinh thap)
      for (let bI = -2; bI <= 2; bI++) { if (!bI) continue; boxAt(1.0, 13, 1.0, darkStone, bx + bI * 5.2, 6.5, bz + 7.2); boxAt(1.3, 1.2, 1.3, trimMat, bx + bI * 5.2, 13.2, bz + 7.2); }
      for (const sx of [-7.5, 7.5]) {
        boxAt(5.5, 21, 5.5, wallMat, bx + sx, 10.5, bz + 7);
        boxAt(6.3, 0.8, 6.3, trimMat, bx + sx, 13.2, bz + 7); // dai chi ngang tang 2
        boxAt(6.1, 1.0, 6.1, darkStone, bx + sx, 20.2, bz + 7);
        // Lan can dinh thap + 4 pinnacle nho + san chi mo (the that: san bang chi mo co lan can)
        for (const px of [-2.4, 2.4]) for (const pz of [-2.4, 2.4]) {
          const pin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 6), darkStone);
          pin.position.set(bx + sx + px, 21.5, bz + 7 + pz); streetGroup.add(pin);
        }
        // Thap chuong: 2 cua vom doi cao moi mat + cot giua + chuong Emmanuel (nam) / Marie-Gabriel (bac)
        for (let a = 0; a < 2; a++) {
          const arch = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 4.4), new THREE.MeshStandardMaterial({ color: 0x1e1e26, roughness: 0.95 }));
          arch.position.set(bx + sx - 1.35 + a * 2.7, 17.3, bz + 9.81); streetGroup.add(arch);
          const archTop = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.15, 12, 1, false, 0, Math.PI), trimMat);
          archTop.rotation.x = Math.PI / 2; archTop.rotation.z = Math.PI / 2;
          archTop.position.set(bx + sx - 1.35 + a * 2.7, 19.5, bz + 9.81); streetGroup.add(archTop);
          const isSouth = sx > 0;
          const bell = new THREE.Mesh(new THREE.ConeGeometry(isSouth && a === 0 ? 0.65 : 0.4, isSouth && a === 0 ? 1.1 : 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a2f, metalness: 0.7, roughness: 0.35 }));
          bell.position.set(bx + sx - 1.35 + a * 2.7, 17.8, bz + 9.4); streetGroup.add(bell);
        }
        boxAt(0.4, 4.6, 0.2, trimMat, bx + sx, 17.3, bz + 9.82); // cot giua
      }
      // Bourdon Emmanuel (thap Nam): chuong lon 13 tan Fa-thang, duong kinh 2.62m — dat khoi chuong ro
      const emb = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x6a4a1f, metalness: 0.75, roughness: 0.3 }));
      emb.position.set(bx + 7.5, 16.6, bz + 7); streetGroup.add(emb);
      // Gallery of Kings: 28 tuong vua Judah o cao 20m (that) — 14 tuong/mat truoc 2 tang so le
      for (let kI = 0; kI < 14; kI++) {
        const king = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 4, 8), new THREE.MeshStandardMaterial({ color: 0x9a917e, roughness: 0.9 }));
        king.position.set(bx - 9.1 + kI * 1.4, 6.4, bz + 7.65); king.castShadow = true; streetGroup.add(king);
        boxAt(1.1, 1.0, 0.6, darkStone, bx - 9.1 + kI * 1.4, 5.4, bz + 7.5);
      }
      boxAt(22.6, 0.7, 15.6, trimMat, bx, 7.4, bz); // dai chi ngan tang duoi - tren
      // Gallery Duc Me: san + lan can mo + 3 tuong (Duc Me giua + 2 thien than den) + Adam/Eva 2 ben hoa hong
      boxAt(22.6, 0.35, 1.2, trimMat, bx, 7.9, bz + 7.4);
      for (let bI = -10; bI <= 10; bI++) boxAt(0.18, 0.7, 0.18, trimMat, bx + bI * 1.05, 8.3, bz + 7.4);
      for (const s of [-1.4, 0, 1.4]) {
        const angels = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.8, 4, 8), trimMat);
        angels.position.set(bx + s, 8.9, bz + 7.5); streetGroup.add(angels);
      }
      for (const s of [-1, 1]) {
        const ae = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.9, 4, 8), darkStone);
        ae.position.set(bx + s * 4.6, 9.4, bz + 7.55); streetGroup.add(ae);
      }
      // Cua hoa hong tay 9.6m: kinh mau do-xanh xen ke + 12 nan da + tam hoa giua
      const roseGlass = new THREE.Mesh(new THREE.CircleGeometry(3.1, 28), new THREE.MeshStandardMaterial({ color: 0x8a1f3d, emissive: 0x5b2bff, emissiveIntensity: 0.75, roughness: 0.25 }));
      roseGlass.position.set(bx, 9.4, bz + 7.56); streetGroup.add(roseGlass);
      for (let pI = 0; pI < 12; pI++) {
        const a = pI / 12 * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.CircleGeometry(0.85, 10), new THREE.MeshStandardMaterial({ color: pI % 2 ? 0x1e3aff : 0xc41f3d, emissive: pI % 2 ? 0x1e3aff : 0xff4d2e, emissiveIntensity: 0.6 }));
        petal.position.set(bx + Math.cos(a) * 1.9, 9.4 + Math.sin(a) * 1.9, bz + 7.58); streetGroup.add(petal);
      }
      const roseRing = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.4, 8, 28), trimMat);
      roseRing.position.set(bx, 9.4, bz + 7.58); streetGroup.add(roseRing);
      const roseRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.18, 8, 20), trimMat);
      roseRing2.position.set(bx, 9.4, bz + 7.6); streetGroup.add(roseRing2);
      for (let a = 0; a < 12; a++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.0, 0.12), trimMat);
        spoke.position.set(bx, 9.4, bz + 7.6); spoke.rotation.z = a * Math.PI / 12; streetGroup.add(spoke);
      }
      // 3 cong THAT: Giua Phan Xet Cuoi (lon, Chua vinh hien + 2 thien than Kho Nan),
      // Trai Duc Me (Duc Me hien + 2 lanh hon Nhan + truyen tin), Phai Thanh Anna (thoi tho au Duc Me)
      const portalInfo = [
        { d: -1, name: 'VIRGO', col: 0x8a8578, glow: 0x000000 },
        { d: 0, name: 'IVDICIVM', col: 0xd4af37, glow: 0x6a4a00 },
        { d: 1, name: 'S ANNA', col: 0x8a8578, glow: 0x000000 },
      ];
      for (const pi of portalInfo) {
        const dI = pi.d;
        const big = dI === 0 ? 1.25 : 1.0;
        boxAt(3.6 * big, 4.6 * big, 0.5, darkStone, bx + dI * 5.4, 2.3 * big, bz + 7.6);
        boxAt(3.0 * big, 4.0 * big, 0.55, trimMat, bx + dI * 5.4, 2.0 * big, bz + 7.62);
        const archTop = new THREE.Mesh(new THREE.CylinderGeometry(1.5 * big, 1.5 * big, 0.55, 12, 1, false, 0, Math.PI), trimMat);
        archTop.rotation.x = Math.PI / 2; archTop.rotation.z = Math.PI / 2; archTop.position.set(bx + dI * 5.4, 4.0 * big, bz + 7.62); streetGroup.add(archTop);
        const tymp = new THREE.Mesh(new THREE.CircleGeometry(1.15 * big, 14, 0, Math.PI), new THREE.MeshStandardMaterial({ color: pi.col, emissive: pi.glow, emissiveIntensity: dI === 0 ? 0.35 : 0, roughness: 0.6 }));
        tymp.position.set(bx + dI * 5.4, 4.0 * big, bz + 7.92); streetGroup.add(tymp);
        // hinh Chua/Me tren tympan
        const fig = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 * big, 0.7 * big, 4, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
        fig.position.set(bx + dI * 5.4, 4.3 * big, bz + 7.98); streetGroup.add(fig);
        if (dI === 0) { // 2 thien than cam khi cu Kho Nan 2 ben Chua
          for (const s of [-1, 1]) {
            const an = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 8), trimMat);
            an.position.set(bx + dI * 5.4 + s * 0.8, 4.25, bz + 7.98); streetGroup.add(an);
          }
        }
        const door = new THREE.Mesh(new THREE.PlaneGeometry(2.4 * big, 3.4 * big), new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.75 }));
        door.position.set(bx + dI * 5.4, 1.7 * big, bz + 7.9); streetGroup.add(door);
        for (let lI = -1; lI <= 1; lI++) { // nep go + ban le sat
          const ribD = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.05), new THREE.MeshStandardMaterial({ color: 0x141414 }));
          ribD.position.set(bx + dI * 5.4 + lI * 0.7, 1.7, bz + 7.94); streetGroup.add(ribD);
        }
        // tuong cot 4 vi: Etienne/Denis + Hoi Thanh/Giao Uoc cu (that tren tru buttress)
        for (const s of [-1.1, 1.1]) {
          const jamb = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.9, 4, 8), trimMat);
          jamb.position.set(bx + dI * 5.4 + s * 1.6, 2.2, bz + 7.95); streetGroup.add(jamb);
        }
        if (dI === 0) { // tuong Duc Me giua cua chinh
          const mad = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), trimMat);
          mad.position.set(bx, 2.2, bz + 8.1); streetGroup.add(mad);
        }
      }
      // Fleche Viollet-le-Duc 96m: de bat giac + 2 tang tho + 16 tuong dong + ga trong vang
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.7, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6, metalness: 0.2 }));
      spire.position.set(bx, 18, bz - 1); spire.castShadow = true; streetGroup.add(spire);
      boxAt(3.2, 1.2, 3.2, darkStone, bx, 11.8, bz - 1);
      for (let stI = 0; stI < 8; stI++) { // 8/16 tuong dong chung quanh chan fleche (mo phong)
        const a = stI / 8 * Math.PI * 2;
        const ev = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.8, 4, 8), new THREE.MeshStandardMaterial({ color: 0x5a6a3a, metalness: 0.6, roughness: 0.4 }));
        ev.position.set(bx + Math.cos(a) * 2.2, 12.6, (bz - 1) + Math.sin(a) * 2.2); streetGroup.add(ev);
      }
      const rooster = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), cm);
      rooster.position.set(bx, 24.4, bz - 1); streetGroup.add(rooster);
      for (const fSide of [-1, 1]) { // doi cot bay don 2 BEN hong (that the ky 13) + gargouille thoat nuoc
        for (let fI = 0; fI < 4; fI++) {
          const fz = bz - 5 + fI * 3.4;
          const fly = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.5, 0.5), trimMat);
          fly.position.set(bx + fSide * 12.6, 9.8, fz); fly.rotation.z = fSide * 0.55; fly.castShadow = true; streetGroup.add(fly);
          const pier = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.5, 0.9), wallMat);
          pier.position.set(bx + fSide * 14.4, 3.75, fz); pier.castShadow = true; streetGroup.add(pier);
          const pin2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 6), trimMat);
          pin2.position.set(bx + fSide * 14.4, 8.4, fz); streetGroup.add(pin2);
          const garg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 1.2), darkStone); // gargouille mat quy
          garg.position.set(bx + fSide * 11.4, 10.6, fz); streetGroup.add(garg);
        }
        // hanh lang chimera + Stryge nhin xuong pho (that tren thap)
        const chim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), darkStone);
        chim.position.set(bx + fSide * 7.5, 14.2, bz + 7); streetGroup.add(chim);
      }
      const ndCr1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.6, 0.4), cm); ndCr1.position.set(bx, 25.2, bz - 1); streetGroup.add(ndCr1);
      const ndCr2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.4), cm); ndCr2.position.set(bx, 25.6, bz - 1); streetGroup.add(ndCr2);
      // Mat hong: cua so lancet doi + transept + HOA HONG BAC-NAM 13.1m (that)
      for (const side of [-1, 1]) {
        for (let wI = 0; wI < 4; wI++) {
          const lw = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.0),
            new THREE.MeshStandardMaterial({ color: 0x3b5bff, emissive: 0x2b4bff, emissiveIntensity: 0.5, roughness: 0.3 }));
          lw.position.set(bx + side * 11.05, 6.0, bz - 5 + wI * 3.2);
          lw.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; streetGroup.add(lw);
          const lwArch = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.15, 10, 1, false, 0, Math.PI), trimMat);
          lwArch.rotation.z = Math.PI / 2; lwArch.rotation.y = Math.PI / 2;
          lwArch.position.set(bx + side * 11.05, 7.5, bz - 5 + wI * 3.2); streetGroup.add(lwArch);
          boxAt(0.9, 6.5, 0.9, darkStone, bx + side * 11.2, 3.2, bz - 6.4 + wI * 3.2);
        }
        // transept + hoa hong 13.1m moi ben
        boxAt(5, 10, 5, wallMat, bx + side * 13.0, 5.0, bz - 2);
        const trRose = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24),
          new THREE.MeshStandardMaterial({ color: 0xc41f3d, emissive: 0x5b2bff, emissiveIntensity: 0.55, roughness: 0.3 }));
        trRose.position.set(bx + side * 15.55, 7.5, bz - 2);
        trRose.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; streetGroup.add(trRose);
        const trRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.3, 8, 24), trimMat);
        trRing.position.copy(trRose.position); trRing.rotation.y = trRose.rotation.y; streetGroup.add(trRing);
      }
      const apse = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 9, 16), wallMat);
      apse.position.set(bx, 4.5, bz - 13); apse.castShadow = true; streetGroup.add(apse);
      const apseRoof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 3.0, 16), darkStone);
      apseRoof.position.set(bx, 10.5, bz - 13); apseRoof.castShadow = true; streetGroup.add(apseRoof);
      // Chevet: 5 cua so cao quanh abside + nha nguyen vong (radiating chapels)
      for (let cI = -2; cI <= 2; cI++) {
        const a = cI * 0.5;
        const chw = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.4),
          new THREE.MeshStandardMaterial({ color: 0x3b5bff, emissive: 0x2b4bff, emissiveIntensity: 0.55, roughness: 0.3 }));
        chw.position.set(bx + Math.sin(a) * 5.55, 5.0, (bz - 13) - Math.cos(a) * 5.55);
        chw.rotation.y = Math.PI + a; streetGroup.add(chw);
      }
      for (const s of [-1, 0, 1]) { // 3 nha nguyen radiating quanh chevet
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4.5, 10, 1, false, 0, Math.PI), wallMat);
        ch.rotation.y = Math.PI / 2 + s * 0.5; ch.position.set(bx + s * 4, 2.25, bz - 15.5); streetGroup.add(ch);
      }
    } else if (cf.style === 'st-peters') {
      // VATICAN THAT (so lieu that 2026): mat dung Maderno 114.69m x 45.44m, 13 tuong 5.65-6m,
      // quang truong Bernini 284 cot 13m 4 hang + 140 tuong 3.1m, obelisk do 25.5m (40m ca de+thanh gia),
      // mai vom Michelangelo duong kinh trong 41.5m, cao 133.3m toi thanh gia.
      boxAt(26, 12, 17, wallMat, bx, 6, bz);
      boxAt(27, 1.2, 18, trimMat, bx, 12.4, bz);
      boxAt(27.5, 1.0, 18.5, darkStone, bx, 0.5, bz);
      // 8 cot Corinthian mat tien cao 27.48m (ti le game) + pilaster
      for (let cI = 0; cI < 8; cI++) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 11, 12), trimMat);
        col.position.set(bx - 10.5 + cI * 3, 5.5, bz + 9.5); col.castShadow = true; streetGroup.add(col);
        boxAt(1.9, 0.8, 1.9, darkStone, bx - 10.5 + cI * 3, 0.4, bz + 9.5);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.9), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.4, roughness: 0.4 }));
        cap.position.set(bx - 10.5 + cI * 3, 11.3, bz + 9.5); streetGroup.add(cap);
        if (cI < 7) {
          const wn = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.9 }));
          wn.position.set(bx - 9 + cI * 3, 7.5, bz + 8.56); streetGroup.add(wn);
        }
      }
      boxAt(26, 2.2, 1.5, trimMat, bx, 13.2, bz + 9.5);
      // Dong chu that: IN HONOREM PRINCIPIS APOST PAVLVS V + 2 dong ho 2 ben
      const insc = document.createElement('canvas'); insc.width = 512; insc.height = 32;
      const ig = insc.getContext('2d'); ig.fillStyle = '#6a6256'; ig.font = 'bold 20px serif'; ig.textAlign = 'center';
      ig.fillText('IN HONOREM PRINCIPIS APOST PAVLVS V', 256, 23);
      const inscTex = new THREE.CanvasTexture(insc); inscTex.colorSpace = THREE.SRGBColorSpace;
      const inscMesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 1.2), new THREE.MeshStandardMaterial({ map: inscTex, roughness: 0.7 }));
      inscMesh.position.set(bx, 13.2, bz + 10.28); streetGroup.add(inscMesh);
      const clock = new THREE.Mesh(new THREE.CircleGeometry(1.0, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
      clock.position.set(bx + 10.5, 10.5, bz + 8.58); streetGroup.add(clock);
      const clock2 = new THREE.Mesh(new THREE.CircleGeometry(1.0, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
      clock2.position.set(bx - 10.5, 10.5, bz + 8.58); streetGroup.add(clock2);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.05), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      hand.position.set(bx + 10.7, 10.7, bz + 8.62); hand.rotation.z = -0.9; streetGroup.add(hand);
      // 13 tuong: Chua Cuu The 6m giua + 11 tong do + Gioan Tay gia 5.65m
      for (let sI = 0; sI < 13; sI++) {
        const isChrist = sI === 6;
        const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.2, 4, 8), isChrist ? cm : trimMat);
        st.position.set(bx - 12 + sI * 2, 15.4, bz + 9.5); st.castShadow = true; streetGroup.add(st);
        boxAt(1.2, 0.8, 1.2, trimMat, bx - 12 + sI * 2, 14.3, bz + 9.5);
      }
      // Ban cong phep lanh trung tam (Benediction Loggia) + phu dieu trao chia khoa
      boxAt(4.4, 3.0, 0.6, trimMat, bx, 8.2, bz + 9.4);
      const keys = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x6a4a00, emissiveIntensity: 0.35, roughness: 0.6 }));
      keys.position.set(bx, 8.2, bz + 9.75); streetGroup.add(keys);
      // Trong + mai vom: tang trong 16 cua so that + 16 grib doi + den long qua cau vang + thap chu
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.8, 5.5, 20), wallMat);
      drum.position.set(bx, 15.5, bz - 2); drum.castShadow = true; streetGroup.add(drum);
      for (let wI = 0; wI < 16; wI++) {
        const a = wI / 16 * Math.PI * 2;
        const wnd = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0xbfe6ff, emissiveIntensity: 0.5 }));
        wnd.position.set(bx + Math.cos(a) * 6.78, 15.5, (bz - 2) + Math.sin(a) * 6.78);
        wnd.rotation.y = -a + Math.PI / 2; streetGroup.add(wnd);
      }
      const dome = new THREE.Mesh(new THREE.SphereGeometry(6.8, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: cf.roof, roughness: 0.45, metalness: 0.35 }));
      dome.position.set(bx, 18.2, bz - 2); dome.castShadow = true; streetGroup.add(dome);
      for (let rI = 0; rI < 16; rI++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.28, 7.2, 0.28), trimMat);
        const a = rI / 16 * Math.PI * 2;
        rib.position.set(bx + Math.cos(a) * 4.9, 20.8, (bz - 2) + Math.sin(a) * 4.9);
        rib.rotation.z = -Math.cos(a) * 0.55; rib.rotation.x = Math.sin(a) * 0.55; streetGroup.add(rib);
      }
      const lant = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 2.8, 12), trimMat);
      lant.position.set(bx, 25.6, bz - 2); lant.castShadow = true; streetGroup.add(lant);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 }));
      globe.position.set(bx, 27.6, bz - 2); streetGroup.add(globe);
      const lantDome = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: cf.roof, roughness: 0.45, metalness: 0.3 }));
      lantDome.position.set(bx, 27, bz - 2); streetGroup.add(lantDome);
      const cr1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, 0.35), cm); cr1.position.set(bx, 28.6, bz - 2); streetGroup.add(cr1);
      const cr2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.35), cm); cr2.position.set(bx, 29, bz - 2); streetGroup.add(cr2);
      // Than + transept + apse
      for (const side of [-1, 1]) {
        for (let wI = 0; wI < 3; wI++) {
          const vw = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.2),
            new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0xbfe6ff, emissiveIntensity: 0.45, roughness: 0.3 }));
          vw.position.set(bx + side * 13.05, 6.5, bz - 4 + wI * 4.2);
          vw.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; streetGroup.add(vw);
          boxAt(0.6, 8, 0.6, trimMat, bx + side * 13.1, 4, bz - 6 + wI * 4.2);
        }
        boxAt(6, 9, 4, wallMat, bx + side * 13.5, 4.5, bz - 2);
        boxAt(6.6, 1.0, 4.6, trimMat, bx + side * 13.5, 9.4, bz - 2);
      }
      const apseV = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 10, 12, 1, false, 0, Math.PI), wallMat);
      apseV.rotation.y = Math.PI / 2; apseV.position.set(bx, 5, bz - 8.5); apseV.castShadow = true; streetGroup.add(apseV);
      // Quang truong Bernini: 2 vong cung 4 hang cot (12 cot/ben) + 140 tuong -> 14 tuong/ben + mai vong
      for (const side of [-1, 1]) {
        for (let cI = 0; cI < 12; cI++) {
          const row = Math.floor(cI / 6), k = cI % 6;
          const rr = 3.2 + row * 2.2;
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 7, 10), trimMat);
          col.position.set(bx + side * (10 + k * 2.4), 3.5, bz + 16 + Math.abs(k - 2.5) * 1.1 + row * 2.2);
          col.castShadow = true; streetGroup.add(col);
          boxAt(1.3, 0.7, 1.3, darkStone, bx + side * (10 + k * 2.4), 0.35, bz + 16 + Math.abs(k - 2.5) * 1.1 + row * 2.2);
          const stT = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.8, 4, 8), trimMat);
          stT.position.set(bx + side * (10 + k * 2.4), 8.4, bz + 16 + Math.abs(k - 2.5) * 1.1 + row * 2.2); streetGroup.add(stT);
        }
        boxAt(15, 1.0, 2.5, trimMat, bx + side * 16, 7.4, bz + 18, side * 0.18);
        boxAt(15, 1.0, 5.5, trimMat, bx + side * 16, 7.4, bz + 20.5, side * 0.18);
      }
      // Obelisk do Vatican 25.5m + de 4 su tu + chu thap + 2 dai phun nuoc doi xung
      const ob = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, 1.2), new THREE.MeshStandardMaterial({ color: 0xa84242, roughness: 0.6 }));
      ob.position.set(bx, 4.5, bz + 24); ob.castShadow = true; streetGroup.add(ob);
      boxAt(3.2, 1.0, 3.2, darkStone, bx, 0.5, bz + 24);
      for (const lx of [-1.4, 1.4]) for (const lz of [-1.4, 1.4]) {
        const lion = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), darkStone);
        lion.position.set(bx + lx, 1.2, bz + 24 + lz); streetGroup.add(lion);
      }
      const obTop = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 4), trimMat);
      obTop.position.set(bx, 9.7, bz + 24); obTop.rotation.y = Math.PI / 4; streetGroup.add(obTop);
      const obCr = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.2, 0.25), cm); obCr.position.set(bx, 10.8, bz + 24); streetGroup.add(obCr);
      for (const side of [-1, 1]) {
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.7, 14), trimMat);
        basin.position.set(bx + side * 9, 0.35, bz + 24); streetGroup.add(basin);
        const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0xbfe6ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 }));
        jet.position.set(bx + side * 9, 1.8, bz + 24); streetGroup.add(jet);
      }
      // 5 cua that: Cua Chinh, Cua Bi Tich, Cua Thien-Ac, Cua Filarete, Cua Thanh (Porta Santa)
      const doorNames = ['FILARETE', 'SACRAMENTI', 'PRINCIPALE', 'BENE-MALE', 'SANTA'];
      for (let dI = -2; dI <= 2; dI++) {
        const door = new THREE.Mesh(new THREE.PlaneGeometry(dI === 0 ? 3.2 : 2.0, dI === 0 ? 6.5 : 5.2), new THREE.MeshStandardMaterial({ color: dI === 2 ? 0x6a4a2a : 0x4a2f1d, roughness: 0.7, metalness: 0.15 }));
        door.position.set(bx + dI * 4.4, dI === 0 ? 3.25 : 2.6, bz + 8.58); streetGroup.add(door);
        const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 2.2), darkStone);
        step.position.set(bx + dI * 4.4, 0.15, bz + 9.6); step.receiveShadow = true; streetGroup.add(step);
      }
    } else {
      // Sagrada Familia that: 8 thap hyperboloid co nut + dinh mosaic + mat sinh Nativity
      boxAt(18, 9, 14, wallMat, bx, 4.5, bz);
      const tipCols = [0xff5d5d, 0xffd75d, 0x5da8ff, 0x6fff8f, 0xc07bff, 0xff9d6a];
      const tipWords = ['HS', 'JHS', 'AM', 'ECCE', 'SANCT', 'GLOR', 'EXC', 'AVE'];
      const spireH = [22, 20, 19, 18, 17, 16, 15, 14];
      for (let sI = 0; sI < 8; sI++) {
        const px = bx - 10.5 + (sI % 4) * 7, pz = bz - 4 + Math.floor(sI / 4) * 8;
        const h = spireH[sI];
        const twr = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.9, h, 10), new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.85 }));
        twr.position.set(px, h / 2, pz); twr.castShadow = true; streetGroup.add(twr);
        // Van hyperboloid: 3 vong dai noi
        for (let rg = 1; rg <= 3; rg++) {
          const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.35 - rg * 0.12, 0.14, 8, 14), trimMat);
          ringB.rotation.x = Math.PI / 2; ringB.position.set(px, h * rg / 4, pz); streetGroup.add(ringB);
        }
        // O cua parabolec + kinh mau khe
        for (let wI = 0; wI < 4; wI++) {
          const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.0), new THREE.MeshStandardMaterial({ color: tipCols[(sI + wI) % 6], emissive: tipCols[(sI + wI) % 6], emissiveIntensity: 0.55 }));
          slit.position.set(px, h - 4 - wI * 2.6, pz + 1.45); streetGroup.add(slit);
          const slitF = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 6, 12), trimMat);
          slitF.position.set(px, h - 2.9 - wI * 2.6, pz + 1.46); streetGroup.add(slitF);
        }
        // Dinh mosaic + chu + qua cau kinh
        const tip = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.8, 10), new THREE.MeshStandardMaterial({ color: tipCols[sI % 6], emissive: tipCols[sI % 6], emissiveIntensity: 0.45, roughness: 0.35, flatShading: true }));
        tip.position.set(px, h + 1.4, pz); tip.castShadow = true; streetGroup.add(tip);
        for (let mI = 0; mI < 3; mI++) {
          const mos = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: tipCols[(sI + mI + 2) % 6], emissive: tipCols[(sI + mI + 2) % 6], emissiveIntensity: 0.6 }));
          const ma = mI / 3 * Math.PI * 2 + sI;
          mos.position.set(px + Math.cos(ma) * 1.05, h + 0.9 + mI * 0.5, pz + Math.sin(ma) * 1.05); streetGroup.add(mos);
        }
        const wc = document.createElement('canvas'); wc.width = 128; wc.height = 32;
        const wg = wc.getContext('2d'); wg.fillStyle = '#fff'; wg.fillRect(0, 0, 128, 32);
        wg.fillStyle = tipCols[sI % 6]; wg.font = 'bold 20px serif'; wg.textAlign = 'center'; wg.fillText(tipWords[sI], 64, 24);
        const wtex = new THREE.CanvasTexture(wc); wtex.colorSpace = THREE.SRGBColorSpace;
        const wband = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.7, 12, 1, true), new THREE.MeshStandardMaterial({ map: wtex, roughness: 0.5 }));
        wband.position.set(px, h - 0.6, pz); streetGroup.add(wband);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.2 }));
        ball.position.set(px, h + 3.2, pz); streetGroup.add(ball);
        const cross2a = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), cm); cross2a.position.set(px, h + 4.0, pz); streetGroup.add(cross2a);
        const cross2b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.16), cm); cross2b.position.set(px, h + 4.1, pz); streetGroup.add(cross2b);
      }
      // Mat dung Nativity: 3 cong parabole + tuong Holy Family + cay bach
      for (let wI = 0; wI < 5; wI++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 4.2),
          new THREE.MeshStandardMaterial({ color: tipCols[wI % 6], emissive: tipCols[wI % 6], emissiveIntensity: 0.55, roughness: 0.25 }));
        win.position.set(bx - 6 + wI * 3, 6.5, bz + 7.06); streetGroup.add(win);
        const winArch = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.2, 10, 1, false, 0, Math.PI), trimMat);
        winArch.rotation.x = Math.PI / 2; winArch.rotation.z = Math.PI / 2;
        winArch.position.set(bx - 6 + wI * 3, 8.6, bz + 7.06); streetGroup.add(winArch);
      }
      for (let dI = -1; dI <= 1; dI++) {
        const pd = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.8), new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.8 }));
        pd.position.set(bx + dI * 4.2, 1.9, bz + 7.1); streetGroup.add(pd);
        const parch = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.25, 12, 1, false, 0, Math.PI), trimMat);
        parch.rotation.x = Math.PI / 2; parch.rotation.z = Math.PI / 2;
        parch.position.set(bx + dI * 4.2, 3.8, bz + 7.1); streetGroup.add(parch);
      }
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(4.5, 3.6, 6), new THREE.MeshStandardMaterial({ color: 0xe8d3b0, roughness: 0.85, flatShading: true }));
      canopy.position.set(bx, 11.5, bz + 5); canopy.castShadow = true; streetGroup.add(canopy);
      const holy = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.0, 4, 8), trimMat);
      holy.position.set(bx, 9.2, bz + 7.4); streetGroup.add(holy);
      for (const cx of [-2.2, 2.2]) { // cay bach 2 ben cua
        const cyp = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0x2f7a3d, roughness: 0.95 }));
        cyp.position.set(bx + cx * 2.4, 2.2, bz + 8.2); cyp.castShadow = true; streetGroup.add(cyp);
      }
      const door = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.85 }));
      door.position.set(bx, 2.5, bz + 7.12); door.visible = false; streetGroup.add(door);
      const cr = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 0.4), cm); cr.position.set(bx, 14.4, bz + 5); streetGroup.add(cr);
      const crH = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.4), cm); crH.position.set(bx, 14.8, bz + 5); streetGroup.add(crH);
      // Mat hong + mat sau Sagrada: kinh mau + Passion facade + apse
      for (const side of [-1, 1]) {
        for (let wI = 0; wI < 3; wI++) {
          const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.6),
            new THREE.MeshStandardMaterial({ color: tipCols[(wI + (side > 0 ? 3 : 0)) % 6], emissive: tipCols[(wI + (side > 0 ? 3 : 0)) % 6], emissiveIntensity: 0.55, roughness: 0.25 }));
          sw.position.set(bx + side * 9.05, 5.5, bz - 4 + wI * 4.0);
          sw.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; streetGroup.add(sw);
        }
        boxAt(1.2, 7, 1.2, wallMat, bx + side * 9.2, 3.5, bz + 4);
      }
      const apseS = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 8, 10, 1, false, 0, Math.PI), wallMat);
      apseS.rotation.y = Math.PI / 2; apseS.position.set(bx, 4, bz - 7); apseS.castShadow = true; streetGroup.add(apseS);
      for (let pI = -1; pI <= 1; pI++) { // Passion facade: 3 cot xuong + tuong khoc
        boxAt(1.0, 7.5, 1.0, darkStone, bx + pI * 3.4, 3.75, bz - 11.6);
        const mourn = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 4, 8),
          new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.9 }));
        mourn.position.set(bx + pI * 3.4, 8.6, bz - 11.6); streetGroup.add(mourn);
      }
    }
    const cvn = document.createElement('canvas'); cvn.width = 512; cvn.height = 96;
    const cx2 = cvn.getContext('2d');
    cx2.fillStyle = 'rgba(0,0,0,0.6)'; cx2.beginPath(); cx2.roundRect(6, 10, 500, 76, 14); cx2.fill();
    cx2.fillStyle = '#ffd76a'; cx2.font = 'bold 40px system-ui'; cx2.textAlign = 'center';
    cx2.fillText(cf.name.toUpperCase().slice(0, 20), 256, 62);
    const tex = new THREE.CanvasTexture(cvn);
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sign.scale.set(14, 2.6, 1); sign.position.set(bx, 11.5, bz + 9); streetGroup.add(sign);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 14, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: cf.cross, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.set(bx, 7, bz + 12); streetGroup.add(beam);
    cf.portal = { x: bx, z: bz + 12, r: 5 };
    cf.exit = { x: bx, z: bz + 14 };
  });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(8, 24), new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.85 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(100, 0.02, 34); plaza.receiveShadow = true; streetGroup.add(plaza);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0xd7dee8, roughness: 0.35, metalness: 0.15 }));
  fountain.position.set(100, 0.6, 34); fountain.castShadow = true; fountain.receiveShadow = true; streetGroup.add(fountain);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.2, 20), new THREE.MeshStandardMaterial({ color: 0x5fb8ff, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2; water.position.set(100, 1.22, 34); streetGroup.add(water);
  streetGroup.userData.water = water;
  // Benches around plaza
  for (let b = 0; b < 4; b++) {
    const ang = b * Math.PI / 2 + Math.PI / 4;
    const bx2 = 100 + Math.cos(ang) * 10, bz2 = 34 + Math.sin(ang) * 10;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 0.8), new THREE.MeshStandardMaterial({ color: 0x7c5233 }));
    seat.position.set(bx2, 0.6, bz2); seat.rotation.y = -ang + Math.PI / 2; streetGroup.add(seat);
  }
  // Crosswalks linking walkway -> church doors
  CHURCHES.forEach((cf) => {
    for (let s = 0; s < 5; s++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      stripe.rotation.x = -Math.PI / 2; stripe.position.set(cf.x - 4 + s * 2, 0.03, 17); streetGroup.add(stripe);
    }
    // Flag banner pole in front of each church (vai co tao o cuoi ham, co wave animation)
    const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 8), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    fp.position.set(cf.x + 7, 3.5, 6); fp.castShadow = true; streetGroup.add(fp);
  });
  // Shop row on south side (nha dan / quan nuoc) — nha that hon: cua kinh + mai hien + dieu hoa
  for (let i = 0; i < 8; i++) {
    const sx = 20 + i * 22;
    if (Math.abs(sx - 100) < 12) continue;
    const houseMat = new THREE.MeshStandardMaterial({ color: [0xe8dcc0, 0xd9c4b8, 0xcfd8e3][i % 3], roughness: 0.9 });
    const house = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 8), houseMat);
    house.position.set(sx, 3, 48); house.castShadow = true; house.receiveShadow = true; streetGroup.add(house);
    const hroof = new THREE.Mesh(new THREE.ConeGeometry(9, 3.5, 4), new THREE.MeshStandardMaterial({ color: 0x7a4a3a, roughness: 0.85, flatShading: true }));
    hroof.position.set(sx, 7.7, 48); hroof.rotation.y = Math.PI / 4; hroof.castShadow = true; streetGroup.add(hroof);
    const winShop = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0xbfe6ff, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.3 }));
    winShop.position.set(sx, 2.2, 43.96); winShop.rotation.y = Math.PI; streetGroup.add(winShop);
    const doorShop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3, 0.2), new THREE.MeshStandardMaterial({ color: 0x5e3d25, roughness: 0.7 }));
    doorShop.position.set(sx + 3.4, 1.5, 43.9); streetGroup.add(doorShop);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(10, 0.25, 3), new THREE.MeshStandardMaterial({ color: [0xc94f4f, 0x4f7dc9, 0x4fae5f][i % 3], roughness: 0.8 }));
    awn.position.set(sx, 3.6, 42.8); awn.rotation.x = 0.18; awn.castShadow = true; streetGroup.add(awn);
    const ac = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.6), new THREE.MeshStandardMaterial({ color: 0xdfe5ea, roughness: 0.5, metalness: 0.2 }));
    ac.position.set(sx - 3.5, 4.6, 43.8); streetGroup.add(ac);
  }
  // ---- Phong canh xung quanh: vuon hoa, tham co, ho nuoc, tuong, hang rao ----
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3d8f47, roughness: 0.95 });
  const trunkMat2 = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2e6b34, roughness: 0.95 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x5a4230, roughness: 1 });
  const stoneWhite = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.8 });
  const flowerCols = [0xff5f8f, 0xffd76a, 0xff6b4a, 0xc77dff, 0xffffff, 0xff3b3b];
  function bush(x, z, s) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), hedgeMat);
    b.position.set(x, s * 0.7, z); b.castShadow = true; streetGroup.add(b); return b;
  }
  function flowerBed(cx, cz, w, d) {
    const soil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), soilMat);
    soil.position.set(cx, 0.17, cz); soil.receiveShadow = true; streetGroup.add(soil);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.45, d + 0.5), stoneWhite);
    rim.position.set(cx, 0.12, cz); streetGroup.add(rim);
    // hoa nhieu mau theo luoi
    let fi = 0;
    for (let ix = 0; ix < Math.max(2, Math.floor(w / 1.1)); ix++) {
      for (let iz = 0; iz < Math.max(2, Math.floor(d / 1.1)); iz++) {
        const fx = cx - w / 2 + 0.7 + ix * 1.1, fz = cz - d / 2 + 0.7 + iz * 1.1;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6),
          new THREE.MeshStandardMaterial({ color: 0x2f7a3d }));
        stem.position.set(fx, 0.6, fz); streetGroup.add(stem);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
          new THREE.MeshStandardMaterial({ color: flowerCols[(fi++) % flowerCols.length], roughness: 0.6, emissive: flowerCols[(fi) % flowerCols.length], emissiveIntensity: 0.12 }));
        head.position.set(fx, 0.95, fz); streetGroup.add(head);
      }
    }
  }
  function cypress(x, z, h) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.2, 8), trunkMat2);
    t.position.set(x, 0.6, z); streetGroup.add(t);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.85, h || 4.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x27632f, roughness: 0.95 }));
    c.position.set(x, 1.2 + (h || 4.5) / 2, z); c.castShadow = true; streetGroup.add(c);
  }
  function flowerTree(x, z) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.6, 8), trunkMat2);
    t.position.set(x, 1.3, z); t.castShadow = true; streetGroup.add(t);
    const cols = [0xff9ec7, 0xffffff, 0xffb3d9];
    for (let k = 0; k < 4; k++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.2 - k * 0.12, 10, 8),
        new THREE.MeshStandardMaterial({ color: cols[k % 3], roughness: 0.9 }));
      b.position.set(x + (k - 1.5) * 0.7, 3.4 + k * 0.5, z + (k % 2 ? 0.5 : -0.5));
      b.castShadow = true; streetGroup.add(b);
    }
  }
  // Vuon hoa doi xung truoc moi nha tho + hang bach + bui tiа
  for (const cf of CHURCHES) {
    flowerBed(cf.x - 8.5, 2.5, 5.5, 3.2);
    flowerBed(cf.x + 8.5, 2.5, 5.5, 3.2);
    for (const hx of [-13, -11.5, 11.5, 13]) bush(cf.x + hx, 2.5, 0.8);
    for (const cx of [-12, 12]) cypress(cf.x + cx, -2, 5);
    flowerTree(cf.x - 16, -6); flowerTree(cf.x + 16, -6);
    // Hang rao da thap 2 ben loi vao
    for (let rI = 0; rI < 4; rI++) {
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), stoneWhite);
        post.position.set(cf.x + s * (3.5 + rI * 1.8), 0.55, 8.5); post.castShadow = true; streetGroup.add(post);
      }
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(9, 0.25, 0.3), stoneWhite);
    rail.position.set(cf.x - 6.2, 0.95, 8.5); streetGroup.add(rail);
    const rail2 = rail.clone(); rail2.position.x = cf.x + 6.2; streetGroup.add(rail2);
  }
  // Dai hoa doc via he trung tam
  for (let i = 0; i < 10; i++) {
    const fx = 12 + i * 19;
    let skip = false;
    for (const cf of CHURCHES) { if (Math.abs(fx - cf.x) < 15) { skip = true; break; } }
    if (skip) continue;
    flowerBed(fx, 8.6, 4, 2);
    bush(fx - 3.2, 8.6, 0.7); bush(fx + 3.2, 8.6, 0.7);
  }
  // Cong vien Tay: ho nuoc tro + ghe da + cay hoa
  const parkX = 8, parkZ = -26;
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(13, 24),
    new THREE.MeshStandardMaterial({ color: 0x5da85a, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(parkX, 0.0, parkZ); lawn.receiveShadow = true; streetGroup.add(lawn);
  const path = new THREE.Mesh(new THREE.CircleGeometry(8, 24),
    new THREE.MeshStandardMaterial({ color: 0xd9cfae, roughness: 0.9 }));
  path.rotation.x = -Math.PI / 2; path.position.set(parkX, 0.02, parkZ); streetGroup.add(path);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(3.4, 22),
    new THREE.MeshStandardMaterial({ color: 0x6fc4ff, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.95 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(parkX, 0.05, parkZ); streetGroup.add(pond);
  streetGroup.userData.pond = pond;
  const pondRim = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.35, 8, 24), stoneWhite);
  pondRim.rotation.x = Math.PI / 2; pondRim.position.set(parkX, 0.15, parkZ); streetGroup.add(pondRim);
  // Dai phun mini giua ho
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.4, 10), stoneWhite);
  spout.position.set(parkX, 0.7, parkZ); spout.castShadow = true; streetGroup.add(spout);
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 10),
    new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.65, depthWrite: false }));
  jet.position.set(parkX, 2.2, parkZ); streetGroup.add(jet);
  streetGroup.userData.jet = jet;
  for (let b = 0; b < 5; b++) {
    const a = b / 5 * Math.PI * 2;
    const bx = parkX + Math.cos(a) * 10, bz = parkZ + Math.sin(a) * 10;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x7c5233, roughness: 0.8 }));
    seat.position.set(bx, 0.55, bz); seat.rotation.y = -a + Math.PI / 2; seat.castShadow = true; streetGroup.add(seat);
    flowerTree(bx + Math.cos(a) * 3, bz + Math.sin(a) * 3);
  }
  // Tuong Duc Me giua cong vien Tay
  const stBase = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.3, 1, 12), stoneWhite);
  stBase.position.set(parkX - 0, 0.5, parkZ - 0); streetGroup.add(stBase);
  const mary = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.2, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.7 }));
  mary.position.set(parkX, 2.2, parkZ); mary.castShadow = true; streetGroup.add(mary);
  const mHead = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xf2c9a0 }));
  mHead.position.set(parkX, 3.3, parkZ); streetGroup.add(mHead);
  // Cong vien Dong: doi thong + ban co + den da kieu Nhat
  const park2X = 192, park2Z = -24;
  const lawn2 = new THREE.Mesh(new THREE.CircleGeometry(12, 24),
    new THREE.MeshStandardMaterial({ color: 0x55a04e, roughness: 1 }));
  lawn2.rotation.x = -Math.PI / 2; lawn2.position.set(park2X, 0.0, park2Z); streetGroup.add(lawn2);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    cypress(park2X + Math.cos(a) * 8, park2Z + Math.sin(a) * 8, 5.5);
    bush(park2X + Math.cos(a) * 4.5, park2Z + Math.sin(a) * 4.5, 0.9);
  }
  flowerBed(park2X, park2Z + 5, 6, 2.4);
  // Den da trang tri doc duong
  for (let i = 0; i < 8; i++) {
    const dx = 14 + i * 24, dz = 9.5;
    let skip = false;
    for (const cf of CHURCHES) { if (Math.abs(dx - cf.x) < 14) { skip = true; break; } }
    if (skip) continue;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), stoneWhite);
    base.position.set(dx, 0.25, dz); streetGroup.add(base);
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.1, 8), stoneWhite);
    pil.position.set(dx, 1.0, dz); streetGroup.add(pil);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
    lamp.position.set(dx, 1.8, dz); streetGroup.add(lamp);
  }
  // Co phuong bay nhe truoc cong nha tho
  streetGroup.userData.flags = [];
  for (const cf of CHURCHES) {
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4, 8, 1),
      new THREE.MeshStandardMaterial({ color: cf.cross, side: THREE.DoubleSide, roughness: 0.8 }));
    fg.position.set(cf.x + 8.2, 6, 6); fg.userData.ph = Math.random() * 6;
    streetGroup.add(fg); streetGroup.userData.flags.push(fg);
  }
})();
function makeAvatar(p) {
  const g = new THREE.Group();
  g.userData.pid = p.id;
  const col = AO_COLORS[p.ao] || 0x3b82f6;
  const skin = 0xf5c9a0;
  const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, metalness: 0.08 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.45, metalness: 0.0 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2b3550, roughness: 0.8 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.35, metalness: 0.7 });
  // Than: capsule tron + hong + co ao (nhin nhu nguoi that mac ao)
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.72, 6, 16), bodyMat);
  body.castShadow = true;
  body.position.y = 1.2; g.add(body);
  // Vai tron cho do noi tay - than lien mach
  for (const sx of [-1, 1]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), bodyMat);
    pad.position.set(sx * 0.5, 0.42, 0); pad.castShadow = true; body.add(pad);
  }
  // Hang cuc ao + day thich chu + Thanh Gia truoc nguc
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), goldMat);
    btn.position.set(0, 0.15 - i * 0.16, 0.41); body.add(btn);
  }
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.04), goldMat);
  crossV.position.set(0, 0.28, 0.43); body.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.04), goldMat);
  crossH.position.set(0, 0.32, 0.43); body.add(crossH);
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.39, 14, 10), darkMat);
  hips.scale.set(1.02, 0.72, 0.85); hips.position.y = 0.62; hips.castShadow = true; g.add(hips);
  // That lung + dai lung
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 20), goldMat);
  belt.position.y = 0.86; belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.85, 1); g.add(belt);
  g.userData.hips = hips;
  g.userData.belt = belt;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
  collar.position.y = 1.78; collar.rotation.x = Math.PI / 2; g.add(collar);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 10), skinMat);
  neck.position.y = 1.88; g.add(neck);
  // Dau la GROUP de cui dau thi mat/mui/mieng cui theo (ngoai doi that)
  // Truc quay dat o co (y~1.95) de cui dau tu nhien, khong xoay tai cho
  const headG = new THREE.Group();
  headG.position.y = 1.95; g.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), skinMat);
  head.castShadow = true;
  head.position.y = 0.33;
  headG.add(head);
  // Tay chan dang capsule tron nhu nguoi that (co khop vai / hong)
  function limb(r, len, mat) {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat);
    m.castShadow = true;
    m.position.y = -(len / 2 + r * 0.5); pivot.add(m);
    return pivot;
  }
  const armL = limb(0.15, 0.22, bodyMat); armL.position.set(-0.58, 1.66, 0); g.add(armL);
  const armR = limb(0.15, 0.22, bodyMat); armR.position.set(0.58, 1.66, 0); g.add(armR);
  // Tay co khuy + ban tay co ngon (nhin gan khong con la cuc tron)
  function forearm(r, len, mat) {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat);
    m.castShadow = true;
    m.position.y = -(len / 2 + r * 0.5); pivot.add(m);
    // Mang set tay ao trang o co tay
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.035, r + 0.045, 0.09, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
    cuff.position.y = -len - r * 0.4; pivot.add(cuff);
    return pivot;
  }
  const elbL = forearm(0.13, 0.22, bodyMat); elbL.position.y = -0.34; armL.add(elbL);
  const elbR = forearm(0.13, 0.22, bodyMat); elbR.position.y = -0.34; armR.add(elbR);
  function makeHand() {
    const h = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skinMat);
    palm.scale.set(1, 1.25, 0.7); palm.castShadow = true; h.add(palm);
    // 4 ngon + ngon cai (tron, nhin xa van ro la ban tay)
    for (let i = -1.5; i <= 1.5; i++) {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.07, 3, 8), skinMat);
      f.position.set(i * 0.06, -0.19, 0.01); h.add(f);
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.06, 3, 8), skinMat);
    thumb.position.set(0.13, -0.05, 0.04); thumb.rotation.z = -0.7; h.add(thumb);
    h.position.y = -0.4;
    return h;
  }
  const handL = makeHand(); elbL.add(handL);
  const handR = makeHand(); handR.children.forEach(c => { }); elbR.add(handR);
  // Ban tay phai lat nguoc ngon cai
  try { handR.children[handR.children.length - 1].position.x = -0.13; handR.children[handR.children.length - 1].rotation.z = 0.7; } catch (e) {}
  g.userData.elbL = elbL; g.userData.elbR = elbR;
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2b3550, roughness: 0.85 });
  // Dui (hip pivot) + khop goi that + ong chan — tong dai dui+ong = 0.64 de chan cham dat vua
  const legL = limb(0.17, 0.22, legMat); legL.position.set(-0.24, 0.72, 0); g.add(legL);
  const legR = limb(0.17, 0.22, legMat); legR.position.set(0.24, 0.72, 0); g.add(legR);
  const kneeL = new THREE.Group(); kneeL.position.y = -0.32; legL.add(kneeL);
  const kneeR = new THREE.Group(); kneeR.position.y = -0.32; legR.add(kneeR);
  for (const kn2 of [kneeL, kneeR]) {
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.22, 4, 10), legMat);
    shin.castShadow = true;
    shin.position.y = -0.16; kn2.add(shin);
  }
  g.userData.kneeL = kneeL; g.userData.kneeR = kneeR;
  // Banh che dau goi: che khop khi gap goi sau, khong con cam giac chan roi
  for (const lg of [legL, legR]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 8), legMat);
    cap.position.y = -0.32; cap.castShadow = true; lg.add(cap);
  }
  // Giay da that: de + mui tron + got — diem xoay dat o co chan de gap goi tu nhien
  const shoes = [];
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 0.55 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xe6dfcf, roughness: 0.85 });
  for (const kn2 of [kneeL, kneeR]) {
    const shoeG = new THREE.Group();
    shoeG.position.set(0, -0.32, 0); // co chan (cuoi ong chan)
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.42), shoeMat);
    upper.position.set(0, 0.02, 0.06); upper.castShadow = true; shoeG.add(upper);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), shoeMat);
    toe.position.set(0, 0.01, 0.27); toe.scale.set(1, 0.55, 1); shoeG.add(toe);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.52), soleMat);
    sole.position.set(0, -0.065, 0.08); shoeG.add(sole);
    kn2.add(shoeG);
    shoes.push(shoeG);
  }
  g.userData.shoes = shoes;
  // Mat + toc (nhin chinh dien +z) — cho het vao headG de cui dau thi ca mat cui theo
  // Toc: dinh + gau sau gay + mai 2 ben (khong con hoi dau)
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.85 });
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.position.y = 0.44; hair.rotation.x = -0.3; hair.castShadow = true; headG.add(hair);
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), hairMat);
  hairBack.position.set(0, 0.22, -0.18); hairBack.scale.set(1.02, 1.05, 0.9); headG.add(hairBack);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), hairMat);
    side.position.set(sx * 0.38, 0.22, 0.1); headG.add(side);
  }
  g.userData.hair = hair;
  // Mat toon 2 lop: long trang + con nguoi den — nhin xa van thay ro, co hon mat
  g.userData.eyes = []; g.userData.pupils = [];
  for (const sx of [-0.17, 0.17]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    sclera.position.set(sx, 0.38, 0.35); headG.add(sclera);
    g.userData.eyes.push(sclera);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0x1f2937 }));
    pupil.position.set(sx, 0.38, 0.425); headG.add(pupil);
    g.userData.pupils.push(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(sx + 0.018, 0.4, 0.462); headG.add(glint);
    g.userData.pupils.push(glint);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.04), hairMat);
    brow.position.set(sx, 0.55, 0.36); brow.rotation.z = sx > 0 ? -0.12 : 0.12; headG.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), skinMat);
  nose.position.set(0, 0.28, 0.42); nose.scale.set(0.8, 1, 0.8); headG.add(nose);
  // Mieng cuoi hien + ma hong hao
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 8, 14, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: 0xb4543e, roughness: 0.6 }));
  mouth.position.set(0, 0.16, 0.385); mouth.rotation.x = 0.15; mouth.rotation.z = Math.PI * 1.05; headG.add(mouth);
  g.userData.mouth = mouth;
  for (const sx of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf0a080, roughness: 0.9, transparent: true, opacity: 0.55 }));
    cheek.position.set(sx * 0.26, 0.24, 0.33); cheek.scale.set(1, 0.7, 0.4); headG.add(cheek);
  }
  // Bong tron gia duoi chan (luon thay duoc ca khi shadow map yeu / mobile)
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; g.add(blob);
  g.userData.blob = blob;
  // Vong hao quang theo CAP DUC TIN — nhin la biet ai uy tin
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.95 }));
  halo.position.y = 2.3; halo.rotation.x = Math.PI / 2.3; halo.visible = false; g.add(halo);
  g.userData.halo = halo;
  const haloGlowCv = document.createElement("canvas"); haloGlowCv.width = haloGlowCv.height = 64;
  const _hg = haloGlowCv.getContext("2d");
  const _gr = _hg.createRadialGradient(32, 32, 2, 32, 32, 30);
  _gr.addColorStop(0, "rgba(255,225,140,1)"); _gr.addColorStop(0.5, "rgba(255,200,80,.5)"); _gr.addColorStop(1, "rgba(255,200,80,0)");
  _hg.fillStyle = _gr; _hg.fillRect(0, 0, 64, 64);
  const haloGlowTex = new THREE.CanvasTexture(haloGlowCv); haloGlowTex.colorSpace = THREE.SRGBColorSpace;
  const haloGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloGlowTex, transparent: true, opacity: 0.85, depthWrite: false }));
  haloGlow.scale.set(1.4, 1.4, 1); haloGlow.position.y = 2.3; haloGlow.visible = false; g.add(haloGlow);
  g.userData.haloGlow = haloGlow;
  g.userData.armL = armL; g.userData.armR = armR;
  g.userData.legL = legL; g.userData.legR = legR;
  g.userData.head = headG; g.userData.headBall = head; g.userData.body = body;
  g.userData.phase = Math.random() * 6;
  const cv2 = document.createElement("canvas"); cv2.width = 256; cv2.height = 64;
  const ctx = cv2.getContext("2d");
  const tex = new THREE.CanvasTexture(cv2);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  spr.scale.set(2.6, 0.65, 1); spr.position.y = 2.9; g.add(spr);
  g.userData.nameCv = cv2; g.userData.nameCtx = ctx; g.userData.nameTex = tex;
  try { paintName(g, p); } catch (e) {
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.roundRect(28, 6, 200, 44, 12); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 26px system-ui"; ctx.textAlign = "center"; ctx.fillText(String(p.name || "").slice(0, 14), 128, 37);
    tex.needsUpdate = true;
  }
  g.position.set(p.x, p.y || 0, p.z); g.rotation.y = p.ry || 0;
  scene.add(g);
  try { refreshRankMesh(g, p); } catch (e) {}
  return g;
}
// ---- Cap bac Duc Tin → hao quang + bang ten (nhin la biet ai uy tin) ----
function faithLvOf(f) { return 1 + Math.floor((Math.max(0, Number(f) || 0)) / 120); }
function rankTitleOf(lv) {
  const en = LANG() === 'en';
  if (lv >= 7) return en ? "Living Saint" : "Thánh Sống";
  if (lv >= 6) return en ? "Apostle" : "Tông Đồ";
  if (lv >= 5) return en ? "Knight" : "Hiệp Sĩ";
  if (lv >= 4) return en ? "Believer" : "Tín Hữu";
  if (lv >= 3) return en ? "Catechumen+" : "Dự Tòng+";
  if (lv >= 2) return en ? "Catechumen" : "Dự Tòng";
  return en ? "Neophyte" : "Tân Tòng";
}
function faithOf(id, p) {
  try { if (id === myId) return __faith; } catch (e) {}
  return (p && typeof p.faith === "number") ? p.faith : 0;
}
function paintName(g, p) {
  const ctx = g.userData.nameCtx, tex = g.userData.nameTex;
  if (!ctx || !tex) return;
  const id = g.userData.pid;
  const lv = faithLvOf(faithOf(id, p));
  ctx.clearRect(0, 0, 256, 64);
  const gold = lv >= 2;
  ctx.fillStyle = gold ? "rgba(60,40,5,.78)" : "rgba(0,0,0,0.55)";
  ctx.beginPath(); ctx.roundRect(28, 6, 200, 44, 12); ctx.fill();
  if (gold) { ctx.strokeStyle = "#ffd76a"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(28, 6, 200, 44, 12); ctx.stroke(); }
  ctx.textAlign = "center";
  ctx.fillStyle = gold ? "#ffd76a" : "#fff";
  ctx.font = "bold 22px system-ui";
  const nm = String(p.name || "").slice(0, 12);
  ctx.fillText("Lv" + lv + " · " + nm, 128, 36);
}
function refreshRankMesh(g, p) {
  const id = g.userData.pid;
  const lv = faithLvOf(faithOf(id, p));
  const u = g.userData;
  if (u.halo) {
    const show = lv >= 3;
    u.halo.visible = show;
    if (show) {
      const s = 1 + Math.min(4, lv - 3) * 0.18;
      u.halo.scale.set(s, s, 1);
      u.halo.material.color.set(lv >= 5 ? 0xfff6d8 : lv >= 4 ? 0xffe9a0 : 0xffd76a);
      u.halo.rotation.z += 0.02;
    }
  }
  if (u.haloGlow) {
    const show = lv >= 4;
    u.haloGlow.visible = show;
    if (show) {
      const s = 1 + Math.min(4, lv - 4) * 0.25;
      u.haloGlow.scale.set(1.4 * s, 1.4 * s, 1);
      u.haloGlow.material.opacity = lv >= 5 ? 0.95 : 0.7;
    }
  }
  try { paintName(g, p); } catch (e) {}
}
function refreshRank(id) {
  try {
    const m = meshes.get(id), p = players.get(id);
    if (m && p) refreshRankMesh(m, p);
  } catch (e) {}
}
function addPlayer(p) { if (p.y === undefined) p.y = 0; p.__px = p.x; p.__pz = p.z; p.__lastAnim = performance.now(); players.set(p.id, p); meshes.set(p.id, makeAvatar(p)); updateOnline(); }
// ---- Bui buoc chan: puff nhe khi got cham dat (nhin ro nhịp buoc) ----
const __puffs = [];
function puffAtFoot(m, side) {
  try {
    let pf = __puffs.find(o => !o.visible);
    if (!pf) {
      if (__puffs.length >= 14) pf = __puffs[0];
      else {
        const cv = document.createElement("canvas"); cv.width = cv.height = 64;
        const c2 = cv.getContext("2d");
        const gr = c2.createRadialGradient(32, 32, 2, 32, 32, 30);
        gr.addColorStop(0, "rgba(220,210,195,0.85)"); gr.addColorStop(1, "rgba(220,210,195,0)");
        c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
        const tex = new THREE.CanvasTexture(cv);
        pf = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
        pf.scale.set(0.7, 0.45, 1); scene.add(pf); __puffs.push(pf);
      }
    }
    const sh = (m.userData && m.userData.shoes) ? m.userData.shoes[side ? 1 : 0] : null;
    const wp = new THREE.Vector3(); m.getWorldPosition(wp);
    if (sh) { try { const sp = new THREE.Vector3(); sh.getWorldPosition(sp); wp.x = sp.x; wp.z = sp.z; } catch (e) {} }
    pf.position.set(wp.x, 0.12, wp.z);
    pf.material.opacity = 0.55; pf.scale.set(0.55, 0.35, 1);
    pf.userData.life = 0.45;
  } catch (e) {}
}
function tickPuffs(dt) {
  try {
    for (const pf of __puffs) {
      if (!pf.visible && !(pf.material.opacity > 0.02)) continue;
      pf.visible = true;
      pf.userData.life = (pf.userData.life ?? 0.45) - dt;
      const k = Math.max(0, pf.userData.life / 0.45);
      pf.material.opacity = 0.55 * k;
      const s = 0.55 + (1 - k) * 0.7;
      pf.scale.set(s, s * 0.6, 1);
      pf.position.y += dt * 0.5;
      if (pf.userData.life <= 0) { pf.visible = false; pf.material.opacity = 0; }
    }
  } catch (e) {}
}
// ---- He thong animation avatar (di / chay / nhay / cau-nguyen / chao / hat) ----
function tickAvatar(id, p, m, dt, now) {
  const u = m.userData;
  if (!u.armL) return;
  const t = now / 1000;
  const air = (p.y || 0) > 0.05;
  const px = p.__px ?? p.x, pz = p.__pz ?? p.z;
  const dist = Math.hypot(p.x - px, p.z - pz);
  const speed = dt > 0 ? dist / dt : 0;
  p.__px = p.x; p.__pz = p.z;
  const moving = speed > 0.5;
  const sprinting = speed > 8.5;
  // Khoa nhip buoc theo van toc that (stride lock): 1 vong phase = 2 buoc chan
  // Toc do game nhanh hon nguoi that (di bo game ~5m/s) nen khoa buoc chan theo kieu jog nhe cho do truot chan
  const stepLen = sprinting ? 1.25 : 0.85;
  const cycHz = moving ? Math.min(sprinting ? 2.4 : 1.7, Math.max(0.85, speed / (2 * stepLen))) : 0;
  const phaseRate = moving ? Math.PI * 2 * cycHz : 1.6;
  // Noi mem khi bat dau buoc / dung lai de khong giat
  u.__gait = (u.__gait ?? 0) + ((moving ? 1 : 0) - (u.__gait ?? 0)) * Math.min(1, dt * (moving ? 6 : 8));
  const gait = u.__gait || 0;
  u.phase = (u.phase || 0) + dt * (moving ? phaseRate : 1.6);
  const sw = Math.sin(u.phase), sw2 = Math.sin(u.phase + Math.PI);
  if (p.action === "amen" && u.__lastAct !== "amen") u.__amenT = now;
  u.__lastAct = p.action || "idle";
  const swB = Math.sin(u.phase * 0.5); // nhip phu cho hong/vai
  // Chuan bi target pose
  let aLx = 0, aRx = 0, aLz = 0.14, aRz = -0.14, lLx = 0, lRx = 0, headRx = 0, headRy = 0, crouch = 0, kneel = 0, prayBreath = 0;
  let eLx = -0.18, eRx = -0.18, eLz = 0, eRz = 0, eLy = 0, eRy = 0, kLx = 0.1, kRx = 0.1;
  let bodyRy = 0, hipRy = 0, mouthOpen = 0, leanAdd = 0;
  if (air) {
    aLx = -2.2; aRx = -2.0; aLz = 0.55; aRz = -0.55;
    lLx = 0.5; lRx = -0.3; headRx = -0.18; headRy = 0;
    eLx = -0.5; eRx = -0.45; kLx = 1.0; kRx = 0.45; leanAdd = -0.08;
  } else if (p.action === "cau-nguyen") {
    // QUY GOI that: dui chuoi xuong, goi cham dat, tay chap truoc nguc, dau cui, tho nhe
    const br = Math.sin(t * 1.8) * 0.05;
    aLx = -0.62 + br; aRx = -0.62 + br; aLz = 0.24; aRz = -0.24;
    lLx = -0.38; lRx = -0.38; headRx = 0.52; headRy = Math.sin(t * 0.7) * 0.04;
    crouch = 0.24; kneel = 1; prayBreath = br;
    eLx = -1.2 + br; eRx = -1.2 + br; eLy = -0.55; eRy = 0.55;
    kLx = 1.95; kRx = 1.95; mouthOpen = 0;
  } else if (p.action === "chao") {
    const wv = Math.sin(t * 9);
    aRx = -0.35 + wv * 0.12; aRz = -2.25 + wv * 0.4;
    aLx = -0.15 + sw * 0.05; aLz = 0.18; lLx = 0.05; lRx = -0.05;
    headRx = -0.1; headRy = Math.sin(t * 2.2) * 0.12;
    eLx = -0.25; eRx = -0.55 + wv * 0.15; kLx = 0.12; kRx = 0.12; mouthOpen = 1;
  } else if (p.action === "hat") {
    const rh = Math.sin(t * 4.2);
    aLz = 2.45 + rh * 0.15; aRz = -2.45 - rh * 0.15;
    aLx = -0.3 + Math.sin(t * 4.2) * 0.22; aRx = -0.3 + Math.sin(t * 4.2 + 1) * 0.22;
    headRx = -0.22 + Math.sin(t * 4.2) * 0.1; headRy = Math.sin(t * 2.1) * 0.14;
    bodyRy = Math.sin(t * 2.1) * 0.08; hipRy = Math.sin(t * 2.1) * 0.1;
    lLx = 0.06; lRx = -0.06;
    eLx = -0.25; eRx = -0.25; kLx = 0.14; kRx = 0.14; mouthOpen = 1;
  } else if (p.action === "amen") {
    const lift = Math.sin(Math.min(1, ((now - (u.__amenT || now)) / 600)) * Math.PI);
    aLx = -2.75; aRx = -2.75; aLz = 0.32; aRz = -0.32; headRx = -0.34;
    eLx = -0.12; eRx = -0.12; kLx = 0.1; kRx = 0.1; mouthOpen = 1; leanAdd = -0.04;
    void lift;
  } else if (moving) {
    // Gait nguoi that: STANCE (chan chong, goi gan thang) + SWING (nhac dui -> gap goi -> got ve mong -> duoi ra truoc dap got)
    // ph = 90 do: chan sau max (toe-off, dap mui) | ph = 180 do: giua swing (goi gap max) | ph = 270 do: chan truoc max (heel-strike, dap got)
    const amp = (sprinting ? 0.68 : 0.6) * gait;
    const phL = u.phase + Math.PI, phR = u.phase;
    const sL = Math.sin(phL), sR = Math.sin(phR);
    // Goi gap max GIUA swing (chan dang dua tu sau ra truoc): -cos = 1 tai ph = PI
    const swingBumpL0 = Math.pow(Math.max(0, -Math.cos(phL)), 1.2);
    const swingBumpR0 = Math.pow(Math.max(0, -Math.cos(phR)), 1.2);
    // Hong dua truoc/sau; keo dui ve truoc 1 chut giua swing de got roi khoi dat
    lLx = sL * amp - swingBumpL0 * 0.18 * gait;
    lRx = sR * amp - swingBumpR0 * 0.18 * gait;
    aLx = sR * amp * 0.9; aRx = sL * amp * 0.9;
    if (sprinting) { aLx -= 0.35 * gait; aRx -= 0.35 * gait; }
    const bendAmp = (sprinting ? 1.75 : 1.65) * gait;
    // Goi: gan thang khi dap got/dap mui, gap that giua swing (dau goi dua ra truoc, got keo ve mong)
    const swingBumpL = Math.pow(Math.max(0, -Math.cos(phL)), 2.0);
    const swingBumpR = Math.pow(Math.max(0, -Math.cos(phR)), 2.0);
    const stanceL = Math.max(0, sL), stanceR = Math.max(0, sR);
    kLx = 0.1 + stanceL * 0.14 * gait + swingBumpL * bendAmp;
    kRx = 0.1 + stanceR * 0.14 * gait + swingBumpR * bendAmp;
    eLx = -0.35 - Math.abs(sR) * 0.35; eRx = -0.35 - Math.abs(sL) * 0.35;
    // Co chan 3 pha: dap mui (toe-off, mui chuoi xuong +) -> co mui len lay do cao khi bay -> dap got (got cham dat truoc)
    const pushL = Math.pow(Math.max(0, sL), 2);
    const pushR = Math.pow(Math.max(0, sR), 2);
    const heelL = Math.pow(Math.max(0, -sL), 1.5);
    const heelR = Math.pow(Math.max(0, -sR), 1.5);
    u.__ankW_L = (0.8 * pushL - 0.5 * heelL - 0.45 * swingBumpL) * gait;
    u.__ankW_R = (0.8 * pushR - 0.5 * heelR - 0.45 * swingBumpR) * gait;
    // Dap got: chan nao vua cham dat thi hui bui nhe + tieng buoc chan (chi nghe tieng chan minh)
    try {
      const TAU = Math.PI * 2;
      const prevPh = (u.__prevPh ?? u.phase);
      const hitAt = (A) => Math.floor((prevPh - A) / TAU) < Math.floor((u.phase - A) / TAU);
      const hitL = hitAt(Math.PI / 2), hitR = hitAt(Math.PI * 1.5);
      u.__prevPh = u.phase;
      if (gait > 0.5 && (hitL || hitR)) {
        try { puffAtFoot(m, hitL ? 0 : 1); } catch (e) {}
        if (id === myId) {
          const nowMs = performance.now();
          if (nowMs - (u.__stepSnd || 0) > (sprinting ? 250 : 320)) {
            u.__stepSnd = nowMs;
            try { tone(sprinting ? 200 : 165, 0, 0.055, 'triangle', 0.045); } catch (e) {}
          }
        }
      } else { u.__prevPh = u.phase; }
    } catch (e) {}
    bodyRy = sR * (sprinting ? 0.1 : 0.06) * gait; hipRy = sL * 0.09 * gait;
    u.__sway = (sL - sR) * 0.5 * gait;
    headRy = -bodyRy * 0.7; headRx = sprinting ? -0.06 : 0.02;
    leanAdd = sprinting ? 0.13 : 0.05;
  } else {
    // Idle song dong: tho + lac dau nhin xung quanh + tay dua nhe
    const br2 = Math.sin(t * 1.7) * 0.5 + 0.5;
    aLx = -0.06 + Math.sin(t * 1.7) * 0.05;
    aRx = -0.06 + Math.sin(t * 1.7 + 1) * 0.05;
    aLz = 0.14 + Math.sin(t * 1.7) * 0.015; aRz = -0.14 - Math.sin(t * 1.7 + 0.6) * 0.015;
    headRx = Math.sin(t * 0.9) * 0.04 + br2 * 0.015;
    headRy = Math.sin(t * 0.45) * 0.22;
    bodyRy = Math.sin(t * 0.45) * 0.02;
    eLx = -0.22 - br2 * 0.06; eRx = -0.22 - br2 * 0.06;
    kLx = 0.1; kRx = 0.1; mouthOpen = 0; leanAdd = br2 * 0.012;
  }
  // Toc do noi suy theo trang thai: chuyen dong nhanh, idle cham cho mem
  const kFast = Math.min(1, dt * (moving || air ? 16 : 10));
  const kSlow = Math.min(1, dt * 8);
  u.kneel = ((u.kneel ?? 0) + ((kneel ? 1 : 0) - (u.kneel ?? 0)) * Math.min(1, dt * 7));
  const kn = u.kneel || 0;
  u.armL.rotation.x += (aLx - u.armL.rotation.x) * kFast;
  u.armR.rotation.x += (aRx - u.armR.rotation.x) * kFast;
  u.armL.rotation.z += (aLz - u.armL.rotation.z) * kFast;
  u.armR.rotation.z += (aRz - u.armR.rotation.z) * kFast;
  u.legL.rotation.x += (lLx - u.legL.rotation.x) * kFast;
  u.legR.rotation.x += (lRx - u.legR.rotation.x) * kFast;
  if (u.elbL) { u.elbL.rotation.x += (eLx - u.elbL.rotation.x) * kFast; u.elbL.rotation.y += (eLy - u.elbL.rotation.y) * kFast; }
  if (u.elbR) { u.elbR.rotation.x += (eRx - u.elbR.rotation.x) * kFast; u.elbR.rotation.y += (eRy - u.elbR.rotation.y) * kFast; }
  if (u.kneeL) u.kneeL.rotation.x += (kLx - u.kneeL.rotation.x) * kFast;
  if (u.kneeR) u.kneeR.rotation.x += (kRx - u.kneeR.rotation.x) * kFast;
  u.head.rotation.x += (headRx - u.head.rotation.x) * Math.min(1, dt * 10);
  u.head.rotation.y += ((headRy || 0) - (u.head.rotation.y || 0)) * Math.min(1, dt * 8);
  // Chop mat tu nhien 3-5s/lan + lim dim khi cau nguyen
  if (u.__blink === undefined) { u.__blink = 2 + Math.random() * 3; u.__blinkShut = 0; }
  u.__blink -= dt;
  if (u.__blink <= 0) { u.__blinkShut = 0.14; u.__blink = 2.2 + Math.random() * 3.2; }
  if (u.__blinkShut > 0) u.__blinkShut -= dt;
  const shut = Math.max(kn * 0.85, u.__blinkShut > 0 ? 0.92 : 0);
  const es = 1 - Math.min(1, shut);
  if (u.eyes) for (const e of u.eyes) e.scale.set(1, Math.max(0.1, es), 1);
  if (u.pupils) for (const pl of u.pupils) { try { pl.scale.set(1, Math.max(0.1, es), 1); } catch (e) {} }
  // Mieng mo khi hat/chao/amen (ca hat)
  if (u.mouth) {
    const mo = mouthOpen ? 1.35 + Math.sin(t * (p.action === "hat" ? 8 : 5)) * 0.25 : 1;
    u.mouth.scale.set(mouthOpen ? 1.15 : 1, mo, 1);
  }
  // Quy goi: ha mong + tho nhe, di: nhun 2 lan/vong + lac hong sang 2 ben
  const baseY = (p.y || 0);
  const kneelDrop = kn * 0.42;
  m.position.y = air ? baseY : baseY - kneelDrop;
  const stepBob = Math.abs(Math.sin(u.phase));
  const bob = moving ? stepBob * (sprinting ? 0.05 : 0.032) * gait : (kn > 0.5 ? prayBreath * 0.4 : Math.sin(t * 1.7) * 0.008);
  u.body.position.y += ((1.2 - crouch * 0.38 + bob) - u.body.position.y) * kSlow;
  // Lac hong sang ben chan chong (stance) — nguoi that nghieng nhe moi buoc
  const swayT = moving ? (u.__sway || 0) * 0.05 : 0;
  u.body.position.x += ((swayT * 0.6) - (u.body.position.x || 0)) * kSlow;
  if (u.hips) {
    u.hips.position.y += ((0.62 - kn * 0.22 + (moving ? stepBob * 0.016 * gait : 0)) - u.hips.position.y) * kSlow;
    u.hips.position.x += ((swayT) - (u.hips.position.x || 0)) * kSlow;
    u.hips.scale.set(1.02, 0.72 + kn * 0.22, 0.85);
  }
  if (u.belt) { u.belt.position.y += ((0.86 - kn * 0.2) - u.belt.position.y) * kSlow; u.belt.position.x = (u.hips ? (u.hips.position.x || 0) : 0); }
  // Co chan 3 pha: dap got (mui chuoi xuong) -> nhac chan (mui chech len lay do cao) -> dap got
  // target local = worldMuon - (dui + goi)
  if (u.shoes) {
    const ankL = moving ? (u.__ankW_L || 0) : 0;
    const ankR = moving ? (u.__ankW_R || 0) : 0;
    const shL = ankL - (u.legL.rotation.x + (u.kneeL ? u.kneeL.rotation.x : 0));
    const shR = ankR - (u.legR.rotation.x + (u.kneeR ? u.kneeR.rotation.x : 0));
    let si = 0;
    for (const sh of u.shoes) {
      const raw = (si === 0 ? shL : shR);
      const target = Math.max(-1.0, Math.min(1.0, raw));
      sh.rotation.x += (target - sh.rotation.x) * Math.min(1, dt * 18);
      si++;
    }
  }
  // Nghieng + xoay than theo nhip (khong van ca cum)
  const lean = (air ? -0.08 : sprinting ? 0.13 : moving ? 0.05 : kn * 0.09) + leanAdd;
  u.body.rotation.x += (lean - u.body.rotation.x) * kSlow;
  u.body.rotation.y += ((bodyRy || 0) - (u.body.rotation.y || 0)) * kSlow;
  if (u.hips) u.hips.rotation.y += (((hipRy || 0) * 0.7) - (u.hips.rotation.y || 0)) * kSlow;
  // Bong tron gia duoi chan: nho + mo dan khi nhay len
  if (u.blob) {
    const h = (p.y || 0);
    const s = Math.max(0.45, 1 - h * 0.14);
    u.blob.scale.set(s, s, 1);
    u.blob.material.opacity = Math.max(0.07, 0.28 - h * 0.055);
  }
}
function updateOnline() { document.getElementById("online").textContent = "\u26EA " + players.size; }
window.__ntho = { players, meshes, get tickAvatar() { return tickAvatar; }, get myId() { return myId; }, get camera() { return camera; } };
const ACT_TXT = { "cau-nguyen": "\uD83D\uDE4F Amen", "hat": "\uD83C\uDFB5 Alleluia", "chao": (window.__lang === "en" ? "\uD83D\uDC4B Peace!" : "\uD83D\uDC4B Bình an!"), "amen": "\u271D\uFE0F Amen!" };
function showBubble(id, text) {
  const layer = document.getElementById("bubble-layer");
  let el = document.getElementById("bub-" + id);
  if (!el) { el = document.createElement("div"); el.className = "bubble"; el.id = "bub-" + id; layer.appendChild(el); }
  el.textContent = text; el.dataset.until = Date.now() + 4000;
}
function projectBubbles() {
  const layer = document.getElementById("bubble-layer");
  const place = (id, m) => {
    const el = document.getElementById("bub-" + id);
    if (!el) return;
    if (Date.now() > +el.dataset.until) { el.remove(); return; }
    const v = new THREE.Vector3(); m.getWorldPosition(v); v.y += 3.2; v.project(camera);
    el.style.left = ((v.x * 0.5 + 0.5) * innerWidth) + "px";
    el.style.top = ((-v.y * 0.5 + 0.5) * innerHeight) + "px";
  };
  for (const [id, m] of meshes) place(id, m);
  try { if (typeof NPCS !== "undefined") for (const n of NPCS) { try { if (n.m.visible) place(n.p.id, n.m); } catch (e) {} } } catch (e) {}
  if (layer.children.length > 14) { try { layer.firstChild.remove(); } catch (e) {} }
}
socket.on("init", ({ id, zone, players: list, gx, boards, mass, candles }) => {
  myId = id;
  try { if (gx) window.__myGx = gx; } catch (e) {}
  try { if (boards) { window.__boards = boards; renderBoards(); } } catch (e) {}
  try { if (mass) { window.__mass = mass; renderMass(); } } catch (e) {}
  try { if (candles) { window.__candles = candles; renderCandles(); } } catch (e) {}
  if (zone) currentZone = zone;
  list.forEach(addPlayer);
  document.getElementById("login").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
  const zp = document.getElementById("zonePill");
  if (zp) zp.textContent = (currentZone === 'street' ? '🏙️ ' : '⛪ ') + (ZONE_LABEL[currentZone] || currentZone);
  try { applyInteriorTheme(currentZone); } catch (e) {}
  try { streetGroup.visible = (currentZone === 'street'); } catch (e) {}
  try { trackZoneVisit(currentZone); } catch (e) {}
  try { refreshRelics(); } catch (e) {}
  bellSound();
  if (navigator.vibrate) { try { navigator.vibrate([30, 50, 30]); } catch (e) {} }
  setTimeout(() => { try { toast(T("toast_quest")); } catch (e) {} }, 1200);
  try { startTour(); } catch (e) {}
  try { socket.emit("get-candles"); } catch (e) {}
});
socket.on("player-join", addPlayer);
socket.on("player-faith", ({ id, faith }) => {
  try { if (id === myId) syncFaith(faith); } catch (e2) {}
  const p = players.get(id);
  if (!p) return;
  p.faith = Math.max(0, Number(faith) || 0);
  try { refreshRank(id); } catch (e) {}
});
socket.on("player-move", ({ id, x, z, y, ry }) => {
  const p = players.get(id); if (!p) return;
  p.x = x; p.z = z; if (typeof y === 'number') p.y = y; p.ry = ry;
  // Muot remote: de tick() noi suy dan (khong nhay cuc khi mang lag 80ms)
});
socket.on("player-action", ({ id, action, text }) => {
  const p = players.get(id); if (p) p.action = action;
  showBubble(id, text || ACT_TXT[action] || action);
  if (id !== myId) {
    if (action === 'cau-nguyen' || action === 'amen') amenSound();
    else if (action === 'hat') hymnAlleluia();
    else popSound();
  }
});
// Ca doan hiep ca: >=2 nguoi cung hat -> hoa am + thong bao + thuong
socket.on("choir", ({ count, by }) => {
  try {
    choirSound(count);
    toast("🎵 Ca đoàn " + count + " người đang hiệp ca! +" + (count >= 4 ? 8 : 5) + "✦ nếu bạn cùng hát");
    showBubble(myId, "🎵 Hiệp ca " + count + " người!");
    try {
      const me = myId ? players.get(myId) : null;
      if (me && me.action === "hat") addFaith(count >= 4 ? 8 : 5, "hiệp ca cùng ca đoàn 🎵");
    } catch (e2) {}
    if (navigator.vibrate) { try { navigator.vibrate([30, 50, 30]); } catch (e2) {} }
  } catch (e) {}
});
// Chuong nha tho: ca zone nghe thay + song am lan toa
socket.on("bell", ({ by, id }) => {
  try {
    bellBig();
    let bx = 0, byy = 14, bz = 0;
    try {
      const rp = id ? players.get(id) : null;
      if (rp) { bx = rp.x; byy = 8; bz = rp.z; }
    } catch (e2) {}
    try { ringBellWave(bx, byy, bz); } catch (e2) {}
    toast("🔔 " + (by || "Ai đó") + " vừa rung chuông nhà thờ!");
    if (navigator.vibrate) { try { navigator.vibrate([80, 120, 80]); } catch (e2) {} }
  } catch (e) {}
});
socket.on("bell-denied", ({ wait }) => {
  try { toast("🔔 Chuông đang nghỉ — chờ " + Math.ceil((wait || 8000) / 1000) + "s nữa"); } catch (e) {}
});
socket.on("player-leave", (id) => {
  players.delete(id);
  const m = meshes.get(id); if (m) scene.remove(m); meshes.delete(id);
  document.getElementById("bub-" + id)?.remove(); updateOnline();
});
socket.on("zone-changed", ({ zone, x, z, ry, players: list }) => {
  currentZone = zone;
  for (const [id, m] of meshes) { scene.remove(m); }
  players.clear(); meshes.clear();
  document.querySelectorAll("#bubble-layer .bubble").forEach(el => el.remove());
  list.forEach(addPlayer);
  const me = players.get(myId);
  if (me) {
    me.x = x; me.z = z; me.y = 0; me.ry = ry;
    try { __vy = 0; } catch (e) {}
    const mm = meshes.get(myId);
    if (mm) { mm.position.set(x, 0, z); mm.rotation.y = ry; }
    window.__camX = x; window.__camZ = z; window.__camRy = ry;
    try { camYaw = ry; camPitch = 0.42; } catch (e) {}
  }
  const zp = document.getElementById("zonePill");
  if (zp) zp.textContent = (zone === 'street' ? '🏙️ ' : '⛪ ') + (ZONE_LABEL[zone] || zone);
  try { applyInteriorTheme(zone); } catch (e) {}
  try { streetGroup.visible = (zone === 'street'); } catch (e) {}
  try { trackZoneVisit(zone); } catch (e) {}
  try { refreshRelics(); } catch (e) {}
  hidePortalTip();
  chimeSound();
  if (navigator.vibrate) { try { navigator.vibrate(20); } catch (e) {} }
});
function hidePortalTip() {
  const t = document.getElementById("portalTip");
  if (t) t.classList.add("hidden");
}
function portalText(zone) {
  if (zone === 'street') return T('portal_out');
  const cf = (typeof CHURCHES !== 'undefined' ? CHURCHES.find((c) => c.zone === zone) : null);
  const nm = cf ? cf.name : (ZONE_LABEL[zone] || zone);
  return '\u26EA ' + nm + ' ' + T('portal_in');
}
function showPortalTip(txt, zone) {
  const t = document.getElementById("portalTip");
  const s = document.getElementById("portalTxt");
  if (!t || !s) return;
  s.textContent = txt;
  try {
    const btn = document.getElementById("portalBtn");
    if (btn) btn.textContent = (zone === "street") ? T("go_out") : T("go_in");
  } catch (e2) {}
  t.classList.remove("hidden");
  t.dataset.zone = zone;
}
const __portalBtn = document.getElementById("portalBtn");
if (__portalBtn) __portalBtn.onclick = () => {
  const t = document.getElementById("portalTip");
  const zone = t ? t.dataset.zone : null;
  if (zone) {
    try { socket.emit("switch-zone", { zone }); } catch (e2) {}
    try { t.classList.add("hidden"); } catch (e2) {}
    try { chimeSound(); } catch (e2) {}
    try { if (navigator.vibrate) navigator.vibrate(25); } catch (e2) {}
  }
};
// Bam vao ten zone tren topbar cung mo menu chuyen canh — de luon co cach vao/ra du khong thay nut portal
try {
  const __zp = document.getElementById("zonePill");
  if (__zp) __zp.onclick = (e) => {
    try { e.stopPropagation(); } catch (err) {}
    const zm = document.getElementById("zoneMenu");
    if (zm) zm.classList.toggle("hidden");
  };
  __zp.style.cursor = "pointer";
} catch (e) {}
const __mapBtn = document.getElementById("mapBtn");
const __zoneMenu = document.getElementById("zoneMenu");
if (__mapBtn && __zoneMenu) __mapBtn.onclick = (e) => { e.stopPropagation(); __zoneMenu.classList.toggle("hidden"); };
document.querySelectorAll("#zoneMenu button").forEach(b => b.onclick = () => {
  const zone = b.dataset.zone;
  if (zone && zone !== currentZone) socket.emit("switch-zone", { zone });
  if (__zoneMenu) __zoneMenu.classList.add("hidden");
});
function checkPortals() {
  const me = players.get(myId);
  if (!me) { hidePortalTip(); return; }
  if (currentZone === 'street') {
    let best = null, bestD = 1e9;
    for (const cf of CHURCHES) {
      const d = Math.hypot(me.x - cf.portal.x, me.z - cf.portal.z);
      if (d < bestD) { bestD = d; best = cf; }
      if (d < cf.portal.r) {
        showPortalTip(portalText(cf.zone), cf.zone);
        updateGuide(best, bestD);
        drawMinimap();
        return;
      }
    }
    hidePortalTip();
    updateGuide(best, bestD);
  } else {
    const ga = document.getElementById("guideArrow");
    if (ga) ga.classList.add("hidden");
    if (me.z > 20) {
      showPortalTip(portalText('street'), 'street');
    } else {
      hidePortalTip();
    }
  }
  drawMinimap();
}
function updateGuide(cf, d) {
  const ga = document.getElementById("guideArrow");
  const gt = document.getElementById("guideTxt");
  if (!ga || !gt || !cf) { if (ga) ga.classList.add("hidden"); return; }
  if (d < 6) { ga.classList.add("hidden"); return; }
  ga.classList.remove("hidden");
  const me = players.get(myId);
  const ang = Math.atan2(cf.portal.x - me.x, cf.portal.z - me.z);
  const __view = (typeof camYaw === "number" && camYaw !== null) ? camYaw : (me.ry || 0);
  let rel = ang - __view;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  const arrow = rel > 0.5 ? "➡️" : rel < -0.5 ? "⬅️" : "⬆️";
  gt.textContent = arrow + " " + cf.name + " · " + Math.round(d) + "m";
}
function drawMinimap() {
  const cv = document.getElementById("minimap");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(10,18,36,.9)"; ctx.fillRect(0, 0, W, H);
  const me = players.get(myId);
  if (currentZone === 'street') {
    const mx = (x) => (x + 8) / 216 * W, mz = (z) => (z + 40) / 100 * H;
    ctx.fillStyle = "#3b4351"; ctx.fillRect(0, mz(29), W, mz(15) - mz(29));
    CHURCHES.forEach((cf, i) => {
      ctx.fillStyle = ["#ffd76a", "#9fd8ff", "#ffb45e"][i] || "#fff";
      ctx.fillRect(mx(cf.x) - 4, mz(-8) - 4, 8, 8);
      ctx.fillStyle = "#fff"; ctx.font = "8px system-ui"; ctx.textAlign = "center";
      ctx.fillText(String(i + 1), mx(cf.x), mz(-8) + 3);
    });
    for (const [id, p] of players) {
      ctx.fillStyle = id === myId ? "#ffd76a" : "#5da8ff";
      ctx.beginPath(); ctx.arc(mx(p.x), mz(p.z), id === myId ? 3.5 : 2.5, 0, 7); ctx.fill();
    }
    if (me) { ctx.strokeStyle = "#ffd76a"; ctx.beginPath(); ctx.arc(mx(me.x), mz(me.z), 5, 0, 7); ctx.stroke(); }
  } else {
    ctx.fillStyle = "#2a3350"; ctx.fillRect(14, 8, W - 28, H - 16);
    ctx.fillStyle = "#7a1f2b"; ctx.fillRect(W / 2 - 3, 8, 6, H - 16);
    ctx.fillStyle = "#ffd76a"; ctx.fillRect(W / 2 - 6, 10, 12, 5);
    for (const [id, p] of players) {
      const px = 14 + (p.x + 18) / 36 * (W - 28), pz = 8 + (p.z + 18) / 46 * (H - 16);
      ctx.fillStyle = id === myId ? "#ffd76a" : "#5da8ff";
      ctx.beginPath(); ctx.arc(px, pz, 3, 0, 7); ctx.fill();
    }
    ctx.fillStyle = "#fff"; ctx.font = "9px system-ui"; ctx.textAlign = "center";
    ctx.fillText(ZONE_LABEL[currentZone] || currentZone, W / 2, H - 3);
  }
}
document.getElementById("joinBtn").onclick = () => {
  let raw = "";
  try { raw = (document.getElementById("name").value || "").trim(); } catch (e) {}
  if (!raw || raw.toLowerCase() === "undefined" || raw.toLowerCase().startsWith("undefined")) raw = raw.replace(/^undefined/i, "").trim();
  const name = (raw || (LANG()==="en" ? "Lamb" : "Con Chien")).slice(0, 20);
  try { localStorage.setItem("ntho_name", name); } catch (e) {}
  try {
    if (!localStorage.getItem("ntho_uid")) localStorage.setItem("ntho_uid", (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)));
  } catch (e) {}
  let uid = socket.id;
  try { uid = localStorage.getItem("ntho_uid") || uid; } catch (e) {}
  let gx = "";
  try {
    gx = (document.getElementById("gx").value || "").trim().toUpperCase();
    localStorage.setItem("ntho_gx", gx);
  } catch (e) {}
  let faith0 = 0;
  try { faith0 = JSON.parse(localStorage.getItem("ntho_faith") || "0") || 0; } catch (e) {}
  socket.emit("join", { name, ao: myAo, uid, gx, faith: faith0 });
};
const joy = { x: 0, y: 0, tx: 0, ty: 0, active: false, id: null, mouse: false };
const joyEl = document.getElementById("joystick"), stickEl = document.getElementById("stick");
try { joyEl.style.touchAction = "none"; stickEl.style.pointerEvents = "none"; } catch (e) {}
function joySet(dx, dy) {
  let len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; len = 1; }
  if (len < 0.06) { dx = 0; dy = 0; len = 0; }
  // Dap ung tuyen tinh cho nhe tay: giu 1 chut cong nhe de de dieu khien toc do thap
  const mag = Math.pow(len, 1.15);
  const nl = Math.hypot(dx, dy) || 1;
  joy.tx = (dx / nl) * mag; joy.ty = (dy / nl) * mag; joy.active = len > 0;
  const r = joyEl.getBoundingClientRect();
  const travel = Math.max(28, r.width / 2 - 22);
  stickEl.style.transform = `translate(calc(-50% + ${dx * travel}px), calc(-50% + ${dy * travel}px))`;
}
function joyMove(e) {
  if (e.cancelable && e.type.startsWith('touch')) { try { e.preventDefault(); } catch (err) {} }
  const r = joyEl.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const t = e.touches ? (e.touches[0] || e.changedTouches[0]) : e;
  if (!t) return;
  const dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2);
  joySet(dx, dy);
}
function joyEnd(){ joy.x = joy.y = 0; joy.tx = joy.ty = 0; joy.active = false; joy.id = null; joy.mouse = false; stickEl.style.transform = "translate(-50%,-50%)"; }
// Pointer Events: ngon nhat tren iPhone/Android/PC (theo ngon tay ca khi truot ra ngoai nut)
joyEl.addEventListener("pointerdown", (e) => {
  try { e.preventDefault(); } catch (err) {}
  joy.id = e.pointerId; joy.active = true;
  try { joyEl.setPointerCapture(e.pointerId); } catch (err) {}
  joyMove(e);
});
addEventListener("pointermove", (e) => {
  if (joy.id !== null && e.pointerId !== undefined && e.pointerId !== joy.id) return;
  if (joy.id !== null || joy.mouse) joyMove(e);
});
addEventListener("pointerup", (e) => {
  if (joy.id !== null && e.pointerId !== undefined && e.pointerId !== joy.id) return;
  if (joy.id !== null || joy.mouse) joyEnd();
});
addEventListener("pointercancel", (e) => {
  if (joy.id !== null && e.pointerId !== undefined && e.pointerId !== joy.id) return;
  joyEnd();
});
// Fallback cam ung cu (mot so WebView cu khong co PointerEvent chuan)
joyEl.addEventListener("touchstart", (e) => { if (joy.id === null) joyMove(e); }, { passive: false });
joyEl.addEventListener("touchmove", (e) => { if (joy.id === null) joyMove(e); }, { passive: false });
joyEl.addEventListener("touchend", (e) => { if (joy.id === null && (!e.touches || e.touches.length === 0)) joyEnd(); });
joyEl.addEventListener("touchcancel", () => { if (joy.id === null) joyEnd(); });
joyEl.addEventListener("mousedown", (e) => { joy.mouse = true; joyMove(e); });
addEventListener("mousemove", (e) => { if (joy.mouse && joy.id === null) joyMove(e); });
addEventListener("mouseup", () => { if (joy.mouse) { joy.mouse = false; if (joy.id === null) joyEnd(); } });
const keys = {};
addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
// ---- Genshin-style free camera (B1): drag tren canvas de xoay, joystick di theo huong camera ----
let camYaw = null, camPitch = 0.42;
(function enableFreeLook() {
  const cv = document.getElementById("c");
  if (!cv) return;
  let dragging = false, lx = 0, ly = 0;
  cv.style.touchAction = "none";
  cv.addEventListener("pointerdown", (e) => { dragging = true; lx = e.clientX; ly = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
  cv.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    if (camYaw === null) camYaw = window.__camRy || 0;
    camYaw -= dx * 0.0052;
    camPitch += dy * 0.0035;
    if (camPitch < 0.08) camPitch = 0.08;
    if (camPitch > 1.15) camPitch = 1.15;
  });
  const stop = () => { dragging = false; };
  cv.addEventListener("pointerup", stop);
  cv.addEventListener("pointercancel", stop);
  // Phim Q/E xoay cam cho PC khong chuot
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "q") { if (camYaw === null) camYaw = window.__camRy || 0; camYaw += 0.12; }
    if (k === "e") { if (camYaw === null) camYaw = window.__camRy || 0; camYaw -= 0.12; }
  });
})();
// ---- B2: sprint + jump + stamina (Genshin-lite) ----
let __stamina = 100, __sprintHeld = false, __sprintToggle = false, __vy = 0;
function __wantSprint() { return (__sprintHeld || __sprintToggle || keys["shift"]); }
function __doJump() {
  const me = players.get(myId); if (!me) return;
  // Đứng dậy khi nhảy lên (giống ngoài đời: đang quỳ muốn nhảy phải đứng trước)
  if (me.action === "cau-nguyen") {
    me.action = "idle";
    try { socket.emit("action", { action: "idle", text: "" }); } catch (e) {}
    try { document.querySelector('#actions button[data-act="cau-nguyen"]')?.classList.remove("on"); } catch (e) {}
  }
  if ((me.y || 0) <= 0.02) { __vy = 5.2; try { tone(700, 0, 0.15, 'sine', 0.12); } catch (e) {} }
}
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === " " || k === "spacebar") { e.preventDefault(); __doJump(); }
});
(function bindMoveBtns() {
  const sb = document.getElementById("sprintBtn"), jb = document.getElementById("jumpBtn");
  if (sb) {
    const refresh = () => sb.classList.toggle("on", __wantSprint());
    const on = (e) => { e.preventDefault(); __sprintHeld = true; refresh(); };
    const off = () => { __sprintHeld = false; refresh(); };
    sb.addEventListener("pointerdown", on); sb.addEventListener("pointerup", off);
    sb.addEventListener("pointercancel", off); sb.addEventListener("pointerleave", off);
    sb.addEventListener("click", () => { if (!__sprintHeld) { __sprintToggle = !__sprintToggle; refresh(); } });
  }
  if (jb) {
    const jumpPress = (e) => { if (e) e.preventDefault(); __doJump(); jb.classList.add("on"); clearTimeout(jb.__onT); jb.__onT = setTimeout(() => jb.classList.remove("on"), 350); };
    jb.addEventListener("pointerdown", jumpPress);
    jb.addEventListener("click", jumpPress);
  }
})();
document.querySelectorAll("#actions button").forEach(b => b.addEventListener("click", () => {
  const act = b.dataset.act;
  const txt = ACT_TXT[act];
  const me0 = players.get(myId);
  // Bam lai nut dang lam = thoi (toggle) — giong ngoai doi: dung day khi muon
  if (me0 && me0.action === act) {
    try { socket.emit("action", { action: "idle", text: "" }); } catch (e) {}
    me0.action = "idle";
    b.classList.remove("on");
    return;
  }
  try { socket.emit("action", { action: act, text: txt }); } catch (e) {}
  if (myId) {
    const me = players.get(myId);
    if (me) me.action = act;
    showBubble(myId, txt);
    clearTimeout(b.__actT);
    // Cau nguyen GIU NGUYEN cho den khi bam lai / di chuyen / nhay — ngoai doi khong ai quy 4 giay roi dung
    // Hat GIU 8s de kip hiep ca doan; cac nut khac 4s
    if (act !== "cau-nguyen") {
      b.__actT = setTimeout(() => {
        const p2 = players.get(myId);
        if (p2 && p2.action === act) p2.action = "idle";
      }, act === "hat" ? 8000 : 4000);
    }
  }
  // Chi 1 nut sang tai 1 thoi diem — doi sang hanh dong moi thi tat nut cu (nhat la nut cau-nguyen)
  try { document.querySelectorAll("#actions button").forEach(x => { if (x !== b) { clearTimeout(x.__onT); x.classList.remove("on"); } }); } catch (e) {}
  b.classList.add("on");
  clearTimeout(b.__onT);
  // Nut cau nguyen GIU SANG khi dang quy (toggle) — cac nut khac tat sau 0.7s
  if (act !== "cau-nguyen") b.__onT = setTimeout(() => b.classList.remove("on"), 700);
  if (act === 'cau-nguyen' || act === 'amen') amenSound();
  else if (act === 'hat') hymnAlleluia();
  else popSound();
  if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
}));
function sendChat() {
  const inp = document.getElementById("chat");
  const t = inp.value.trim().slice(0, 60); if (!t) return;
  socket.emit("action", { action: "chat", text: t });
  if (myId) showBubble(myId, t); inp.value = "";
}
document.getElementById("send").onclick = sendChat;
document.getElementById("chat").addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });
// ================= GIU CHAN NGUOI CHOI: Duc tin + Nhiem vu ngay + Diem danh + Thanh tich an + Loi Chua =================
const VERSES_EN = [
"Blessed are the poor in spirit — Mt 5:3",
"Ask and it will be given to you — Mt 7:7",
"I am the way, the truth and the life — Jn 14:6",
"Take courage, I have conquered the world — Jn 16:33",
"Everything is possible for one who believes — Mk 9:23",
"The Lord is my shepherd — Ps 23:1",
"Love one another as I have loved you — Jn 15:12",
"My peace I give to you — Jn 14:27",
"Let anyone who thirsts come to me and drink — Jn 7:37",
"My grace is sufficient for you — 2 Cor 12:9",
];
const VERSES_VI = [
  "Phúc cho những ai có tinh thần nghèo khó — Mt 5:3",
  "Hãy xin thì sẽ được — Mt 7:7",
  "Thầy là đường, là sự thật và là sự sống — Ga 14:6",
  "Cứ vững lòng, Thầy đã thắng thế gian — Ga 16:33",
  "Mọi sự đều có thể với người tin — Mc 9:23",
  "Chúa là mục tử chăn dắt tôi — Tv 22:1",
  "Hãy yêu thương nhau như Thầy yêu anh em — Ga 15:12",
  "Bình an của Thầy ban cho anh em — Ga 14:27",
  "Ai khát, hãy đến với Ta mà uống — Ga 7:37",
  "Ơn Ta đủ cho con — 2Cr 12:9",
];
let VERSES = (LANG() === 'en' ? VERSES_EN : VERSES_VI);
const __origSetLang = window.setLang;
window.setLang = (l) => { try { __origSetLang(l); } catch (e) {} try { VERSES = (LANG() === 'en' ? VERSES_EN : VERSES_VI); } catch (e) {} try { refreshZoneLabels(); } catch (e) {} try { window.__reRenderLang && window.__reRenderLang(); } catch (e) {} };
const __today = () => new Date().toISOString().slice(0, 10);
const __store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
let __faith = __store.get("ntho_faith", 0);
let __qd = __store.get("ntho_quests", null);
if (!__qd || __qd.day !== __today()) __qd = { day: __today(), pray: 0, zones: [], chat: 0, run: 0, relic: 0, claimed: {}, verse: false };
let __ck = __store.get("ntho_checkin", { last: "", streak: 0 });
let __collected = __store.get("ntho_relics_" + __today(), []);
function faithLevel(xp) { return 1 + Math.floor(xp / 120); }
function renderFaith() {
  const el = document.getElementById("levelPill");
  if (el) el.textContent = "🕊️ Lv" + faithLevel(__faith) + " " + rankTitleOf(faithLevel(__faith)) + " · " + __faith + "✦";
  try { refreshRank(myId); } catch (e) {}
}
function toast(msg, ms) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(t.__h);
  t.__h = setTimeout(() => t.classList.add("hidden"), ms || 2400);
}
function fanfare(big) {
  try {
    if (big) { tone(523.25, 0, 0.25, "triangle", 0.22); tone(659.25, 0.12, 0.25, "triangle", 0.22); tone(783.99, 0.24, 0.4, "triangle", 0.24); tone(1046.5, 0.38, 0.6, "sine", 0.2); }
    else { tone(880, 0, 0.18, "triangle", 0.16); tone(1174.7, 0.1, 0.3, "sine", 0.14); }
  } catch (e) {}
  if (navigator.vibrate) { try { navigator.vibrate(big ? [40, 60, 40, 60, 80] : 25); } catch (e) {} }
}
window.__grace = window.__grace || { active: false, left: 0 };
window.__combo = window.__combo || { n: 0, last: 0 };
function graceOn() { try { return window.__grace && window.__grace.active; } catch (e) { return false; } }
function comboMult() {
  try {
    const now = Date.now();
    if (now - window.__combo.last > 10000) window.__combo.n = 0;
    const c = window.__combo.n || 0;
    if (c >= 12) return 3;
    if (c >= 7) return 2;
    if (c >= 3) return 1.5;
  } catch (e) {}
  return 1;
}
function addFaith(n, why, fromServer) {
  const now0 = Date.now();
  if (now0 - (window.__combo.last || 0) <= 10000) window.__combo.n = Math.min(20, (window.__combo.n || 0) + 1);
  else window.__combo.n = 1;
  window.__combo.last = now0;
  let mult = comboMult();
  if (graceOn() && !fromServer) n = n * 2;
  n = Math.round(n * mult);
  const before = faithLevel(__faith);
  __faith += n;
  __store.set("ntho_faith", __faith);
  renderFaith();
  try {
    const now = Date.now();
    if (!window.__lastFaithRep || now - window.__lastFaithRep > 1500) {
      window.__lastFaithRep = now;
      try { socket.emit("report-faith", { faith: __faith }); } catch (e) {}
    } else {
      clearTimeout(window.__faithRepT);
      window.__faithRepT = setTimeout(() => { try { socket.emit("report-faith", { faith: __faith }); } catch (e) {} }, 2000);
    }
  } catch (e) {}
  const after = faithLevel(__faith);
  let tag = "";
  try {
    if (graceOn()) tag += " 🌧️x2";
    const cm = comboMult();
    if (cm > 1) tag += " 🔥x" + cm + " (" + (window.__combo.n || 0) + " combo)";
  } catch (e) {}
  if (after > before) {
    toast("🎉 Thăng cấp Đức Tin Lv" + after + "! " + (why || "") + tag);
    fanfare(true);
    try { showBubble(myId, "🎉 Lên Lv" + after + "!"); } catch (e) {}
  } else if (why) {
    toast("+" + n + "✦ " + why + tag);
    fanfare(false);
  }
  renderQuests();
}
function syncFaith(nf) {
  try {
    nf = Math.max(0, Number(nf) || 0);
    if (nf > __faith) {
      __faith = nf;
      __store.set("ntho_faith", __faith);
      renderFaith();
      try { socket.emit("report-faith", { faith: __faith }); } catch (e) {}
    }
  } catch (e) {}
}
const QUESTS = [
  { id: "pray", icon: "🙏", name: "QUEST_PRAY", need: 3, reward: 40, val: () => __qd.pray },
  { id: "zones", icon: "⛪", name: "QUEST_ZONES", need: 3, reward: 60, val: () => new Set(__qd.zones).size },
  { id: "chat", icon: "💬", name: "QUEST_CHAT", need: 1, reward: 20, val: () => __qd.chat },
  { id: "run", icon: "🏃", name: "QUEST_RUN", need: 150, reward: 40, val: () => Math.floor(__qd.run) },
  { id: "relic", icon: "✨", name: "QUEST_RELIC", need: 1, reward: 80, val: () => __qd.relic },
];
function questName(id) {
  const en = LANG() === 'en';
  if (id === 'QUEST_PRAY') return en ? "Pray 3 times" : "Cầu nguyện 3 lần";
  if (id === 'QUEST_ZONES') return en ? "Visit 3 churches" : "Viếng 3 nhà thờ";
  if (id === 'QUEST_CHAT') return en ? "Send 1 prayer" : "Gửi 1 lời nguyện";
  if (id === 'QUEST_RUN') return en ? "Pilgrimage 150m" : "Hành hương 150m";
  if (id === 'QUEST_RELIC') return en ? "Find 1 hidden relic" : "Tìm 1 thánh tích ẩn";
  return id;
}
function renderQuests() {
  const list = document.getElementById("questList");
  if (!list) return;
  list.innerHTML = "";
  const verse = VERSES[new Date().getDate() % VERSES.length];
  const vd = document.createElement("div");
  vd.className = "quest";
  vd.innerHTML = (LANG()==="en" ? "<b>\uD83D\uDCDA Word of God today:</b><br><i>\u201c" + verse + "\u201d</i>" : "<b>\uD83D\uDCDA Lời Chúa hôm nay:</b><br><i>\u201c" + verse + "\u201d</i>");
  if (!__qd.verse) {
    const b = document.createElement("button"); b.textContent = (LANG()==="en" ? "Receive blessing +10" : "Nhận lời chúc +10✦");
    b.onclick = () => { __qd.verse = true; __store.set("ntho_quests", __qd); addFaith(10, (LANG()==="en" ? "received the Word" : "đón nhận Lời Chúa")); renderQuests(); };
    vd.appendChild(document.createElement("br")); vd.appendChild(b);
  } else { vd.innerHTML += (LANG()==="en" ? "<br>\u2705 Blessing received today" : "<br>\u2705 Đã nhận ơn hôm nay"); }
  list.appendChild(vd);
  for (const q of QUESTS) {
    const v = Math.min(q.need, q.val());
    const done = v >= q.need, claimed = !!__qd.claimed[q.id];
    const d = document.createElement("div");
    d.className = "quest" + (done ? " done" : "");
    d.innerHTML = "<b>" + q.icon + " " + questName(q.name) + "</b> <span>" + v + "/" + q.need + "</span><div class='bar'><i style='width:" + Math.round(v / q.need * 100) + "%'></i></div>";
    if (done && !claimed) {
      const b = document.createElement("button"); b.textContent = (LANG()==="en" ? "Claim +" + q.reward : "Nhận +" + q.reward + "✦");
      b.onclick = () => { __qd.claimed[q.id] = 1; __store.set("ntho_quests", __qd); addFaith(q.reward, (LANG()==="en" ? "completed \"" + questName(q.name) + "\"" : "hoàn thành \u201c" + questName(q.name) + "\u201d")); };
      d.appendChild(b);
    } else if (claimed) { d.innerHTML += (LANG()==="en" ? "<div style='color:#6fff8f;font-size:12px;margin-top:4px'>\u2705 Claimed</div>" : "<div style='color:#6fff8f;font-size:12px;margin-top:4px'>\u2705 Đã nhận thưởng</div>"); }
    list.appendChild(d);
  }
  const st = document.getElementById("streakTxt");
  if (st) st.textContent = __ck.streak > 0 ? ("\uD83D\uDD25 " + __ck.streak + (LANG()==="en" ? " day streak" : " ngày liên tiếp")) : "";
  const cb = document.getElementById("checkinBtn");
  if (cb) { const doneToday = (__ck.last === __today()); cb.textContent = doneToday ? (LANG()==="en" ? "\u2705 Checked in today" : "\u2705 Đã điểm danh hôm nay") : (LANG()==="en" ? "\uD83C\uDF81 Daily check-in" : "\uD83C\uDF81 Điểm danh hôm nay"); cb.disabled = doneToday; cb.style.opacity = doneToday ? 0.55 : 1; }
}
function trackQuest(kind, n) {
  if (kind === "pray") __qd.pray = Math.min(99, __qd.pray + 1);
  else if (kind === "chat") __qd.chat = Math.min(99, __qd.chat + 1);
  else if (kind === "run") __qd.run = (__qd.run || 0) + (n || 0);
  else if (kind === "relic") __qd.relic = Math.min(99, __qd.relic + 1);
  __store.set("ntho_quests", __qd);
  renderQuests();
}
function trackZoneVisit(z) {
  if (!z || z === "street") return;
  if (!__qd.zones.includes(z)) { __qd.zones.push(z); __store.set("ntho_quests", __qd); addFaith(15, ((LANG()==="en" ? "visited " : "vi\u1EBFng ") + (ZONE_LABEL[z] || z))); }
  renderQuests();
}
// Thanh tich an: 3 ngoai pho + 1 trong moi nha tho
const RELICS = [];
(function buildRelics() {
  function glowMat() {
    const cv = document.createElement("canvas"); cv.width = cv.height = 64;
    const g = cv.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, "rgba(255,230,150,1)"); gr.addColorStop(0.5, "rgba(255,200,80,.55)"); gr.addColorStop(1, "rgba(255,200,80,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const glowTex = glowMat();
  function mkRelic(id, zone, x, y, z) {
    const g = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0xaa7200, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.6 });
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.1, 0.28), gold); a.position.y = 0.55; g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.24), gold); b.position.y = 0.8; g.add(b);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.9, depthWrite: false }));
    sp.scale.set(2.4, 2.4, 1); sp.position.y = 0.7; g.add(sp);
    g.position.set(x, y, z);
    g.userData = { relicId: id, zone, glow: sp };
    g.visible = false;
    scene.add(g);
    RELICS.push({ id, zone, x, y, z, obj: g });
  }
  mkRelic("park-tay", "street", 2.5, 0, -30.5);
  mkRelic("park-dong", "street", 197.5, 0, -19.5);
  mkRelic("plaza", "street", 108.5, 0, 40.5);
  mkRelic("relic-1", "church-1", -11, 0, -13);
  mkRelic("relic-2", "church-2", 11, 0, -13);
  mkRelic("relic-3", "church-3", 0, 0, 20.5);
  refreshRelics();
})();
// ---- NPC giao dan (cho solo cung thay am, co nguoi doc kinh chung) ----
const NPCS = [];
(function buildNPCs() {
  try {
    const names = ["Maria", "Gioan", "Phêrô", "Anna", "Giuse", "Têrêsa", "Lucia", "Phaolô", "Marta", "Tôma", "Rosa", "Đaminh"];
    const aos = ["xanh", "trang", "den", "do", "tim"];
    const zones = ["street", "church-1", "church-2", "church-3"];
    let ni = 0;
    for (const z of zones) {
      for (let k = 0; k < 4; k++) {
        const b = (typeof BOUNDS !== "undefined" && BOUNDS[z]) ? BOUNDS[z] : { x: [-14, 14], z: [-14, 20] };
        const px = b.x[0] + 2 + Math.random() * Math.max(1, (b.x[1] - b.x[0] - 4));
        const pz = b.z[0] + 2 + Math.random() * Math.max(1, (b.z[1] - b.z[0] - 4));
        const p = { id: "npc-" + (ni), name: names[(ni + k * 3) % names.length], ao: aos[(ni + k) % aos.length], zone: z, x: px, z: pz, y: 0, ry: Math.random() * 6.28, action: "idle", faith: 50 + ((ni * 37) % 300) };
        try {
          const m = makeAvatar(p);
          m.position.set(px, 0, pz);
          m.visible = (typeof currentZone !== "undefined" ? (z === currentZone) : (z === "street"));
          scene.add(m);
          NPCS.push({ p, m, wt: Math.random() * 4, t: Math.random() * 10, tx: px, tz: pz });
        } catch (e) {}
        ni++;
      }
    }
  } catch (e) {}
})();
window.NPCS = NPCS;
window.__npcCount = NPCS.length;
function tickNPCs(dt, t) {
  try {
    for (const n of NPCS) {
      try { n.m.visible = (n.p.zone === currentZone); } catch (e) {}
      if (!n.m.visible) continue;
      n.t -= dt;
      if (n.t <= 0) {
        n.t = 3 + Math.random() * 6;
        const r = Math.random();
        if (r < 0.45) { n.p.action = "cau-nguyen"; }
        else if (r < 0.62) { n.p.action = "hat"; }
        else if (r < 0.70) { n.p.action = "chao"; }
        else { n.p.action = "idle"; }
        // doi cho lang thang quanh cho ngoi
        const b = (typeof BOUNDS !== "undefined" && BOUNDS[n.p.zone]) ? BOUNDS[n.p.zone] : { x: [-14, 14], z: [-14, 20] };
        n.tx = Math.max(b.x[0] + 1, Math.min(b.x[1] - 1, n.p.x + (Math.random() - 0.5) * 10));
        n.tz = Math.max(b.z[0] + 1, Math.min(b.z[1] - 1, n.p.z + (Math.random() - 0.5) * 10));
        if (Math.random() < 0.22) {
          const says = ["Amen 🙏", "Alleluia 🎵", "Bình an 👋", "Tạ ơn Chúa ✝️"];
          try { showBubble(n.p.id, says[Math.floor(Math.random() * says.length)]); } catch (e) {}
        }
        try { n.m.position.y = 0; } catch (e) {}
      }
      // di cham ve diem den
      try {
        const dx = n.tx - n.p.x, dz = n.tz - n.p.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.6 && n.p.action === "idle") {
          const sp = 1.2 * dt;
          n.p.x += dx / d * sp; n.p.z += dz / d * sp;
          n.p.ry = Math.atan2(dx, dz);
          n.m.position.set(n.p.x, 0, n.p.z);
          n.m.rotation.y = n.p.ry;
        } else {
          n.m.position.set(n.p.x, n.p.y || 0, n.p.z);
          n.m.rotation.y = n.p.ry || 0;
        }
        try { tickAvatar(n.p.id, n.p, n.m, dt, performance.now()); } catch (e) {}
      } catch (e) {}
    }
  } catch (e) {}
}
// ---- Anh sang on lanh: orb nhat duoc, 12s moc 1 vien quanh nguoi choi ----
const GRACE_ORBS = [];
(function buildGraceOrbs() {
  try {
    const gold = new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffb400, emissiveIntensity: 1.2, roughness: 0.3 });
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), gold);
      core.position.y = 1.1; g.add(core);
      const cv = document.createElement("canvas"); cv.width = cv.height = 64;
      const c2 = cv.getContext("2d");
      const gr = c2.createRadialGradient(32, 32, 2, 32, 32, 30);
      gr.addColorStop(0, "rgba(255,240,180,1)"); gr.addColorStop(0.5, "rgba(255,200,80,.5)"); gr.addColorStop(1, "rgba(255,200,80,0)");
      c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false }));
      glow.scale.set(2.2, 2.2, 1); glow.position.y = 1.1; g.add(glow);
      g.visible = false; scene.add(g);
      GRACE_ORBS.push({ obj: g, core, x: 0, z: 0, zone: "street", life: 0 });
    }
  } catch (e) {}
})();
window.GRACE_ORBS = GRACE_ORBS;
function spawnGraceOrb() {
  try {
    const me = (typeof players !== "undefined" && typeof myId !== "undefined") ? players.get(myId) : null;
    const free = GRACE_ORBS.find(o => !o.obj.visible);
    if (!free || !me) return;
    const b = (typeof BOUNDS !== "undefined" && BOUNDS[currentZone]) ? BOUNDS[currentZone] : { x: [-14, 14], z: [-14, 20] };
    for (let k = 0; k < 8; k++) {
      const ax = me.x + (Math.random() - 0.5) * 16;
      const az = me.z + (Math.random() - 0.5) * 16;
      if (ax < b.x[0] + 1 || ax > b.x[1] - 1 || az < b.z[0] + 1 || az > b.z[1] - 1) continue;
      free.x = ax; free.z = az; free.zone = currentZone; free.life = 25;
      free.obj.position.set(ax, 0, az);
      free.obj.visible = true;
      try { tone(1200, 0, 0.3, "sine", 0.08); } catch (e) {}
      return;
    }
  } catch (e) {}
}
function checkGraceOrbs(dt, t) {
  try {
    const me = (typeof players !== "undefined" && typeof myId !== "undefined") ? players.get(myId) : null;
    let active = 0;
    for (const o of GRACE_ORBS) {
      if (!o.obj.visible) continue;
      if (o.zone !== currentZone) { o.obj.visible = false; continue; }
      active++;
      o.life -= dt;
      o.obj.position.y = Math.sin(t * 3 + o.x) * 0.15;
      o.core.rotation.y += dt * 2.5;
      if (o.life <= 0) { o.obj.visible = false; continue; }
      if (me) {
        const d = Math.hypot(me.x - o.x, me.z - o.z);
        if (d < 2.0) {
          o.obj.visible = false;
          try { addFaith(10, (LANG() === "en" ? "picked grace light" : "nhặt ánh sáng ơn lành") + " ✨"); } catch (e) {}
          try { showBubble(myId, "✨ +10"); } catch (e) {}
          try { fanfare(false); } catch (e) {}
          try { trackQuest("relic"); } catch (e) {}
          if (navigator.vibrate) { try { navigator.vibrate(20); } catch (e) {} }
        }
      }
    }
    // giu 2-3 vien quanh nguoi choi cho luon co viec nhat
    if (active < 2 && Math.random() < dt * 0.25) spawnGraceOrb();
  } catch (e) {}
}
function refreshRelics() {
  for (const r of RELICS) {
    const got = __collected.includes(r.id);
    r.obj.visible = !got && (r.zone === currentZone);
  }
}
function checkRelics() {
  const me = players.get(myId);
  if (!me) return;
  for (const r of RELICS) {
    if (r.zone !== currentZone || __collected.includes(r.id)) continue;
    const d = Math.hypot(me.x - r.x, me.z - r.z);
    if (d < 2.4) {
      __collected.push(r.id);
      __store.set("ntho_relics_" + __today(), __collected);
      r.obj.visible = false;
      trackQuest("relic");
      addFaith(50, (LANG()==="en" ? "found a relic" : "t\u00ECm th\u1EA5y th\u00E1nh t\u00EDch"));
      try { showBubble(myId, (LANG()==="en" ? "\u2728 Found a relic!" : "\u2728 T\u00ECm th\u1EA5y th\u00E1nh t\u00EDch!")); } catch (e) {}
    }
  }
}
const __oldZoneChanged = null;
try {
  const __qb = document.getElementById("questBtn");
  if (__qb) __qb.onclick = (e) => { e.stopPropagation(); document.getElementById("questPanel").classList.toggle("hidden"); renderQuests(); };
  const __qc = document.getElementById("questClose");
  if (__qc) __qc.onclick = () => document.getElementById("questPanel").classList.add("hidden");
  const __cb = document.getElementById("checkinBtn");
  if (__cb) __cb.onclick = () => {
    if (__ck.last === __today()) return;
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    __ck.streak = (__ck.last === yesterday) ? (__ck.streak + 1) : 1;
    __ck.last = __today();
    __store.set("ntho_checkin", __ck);
    addFaith(20 + Math.min(7, __ck.streak) * 5, ((LANG()==="en" ? ("day " + __ck.streak + " check-in") : ("\u0111i\u1EC3m danh ng\u00E0y " + __ck.streak)) + " \uD83C\uDF81"));
    renderQuests();
  };
} catch (e) {}
renderFaith(); renderQuests();
// ================= BXH GIAO XU (khong can dang nhap, dung uid + ma GX) =================
window.__boards = window.__boards || null;
window.__boardTab = window.__boardTab || "gx";
window.__myGx = window.__myGx || "";
try { window.__myGx = window.__myGx || (localStorage.getItem("ntho_gx") || "CHUNG").toUpperCase() || "CHUNG"; } catch (e) {}
function escHtml(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function renderBoards() {
  const list = document.getElementById("boardList");
  const foot = document.getElementById("boardFoot");
  if (!list) return;
  const b = window.__boards;
  const tab = window.__boardTab || "gx";
  try {
    document.querySelectorAll("#boardTabs button").forEach(x => x.classList.toggle("sel", x.dataset.tab === tab));
  } catch (e) {}
  if (!b) { list.innerHTML = "<div class='quest'>" + (LANG()==="en" ? "Loading ranking..." : "\u0110ang t\u1EA3i BXH\u2026") + "</div>"; return; }
  const medal = i => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1) + ".";
  let html = "";
  if (tab === "gx") {
    const rows = b.parishes || [];
    if (!rows.length) html = "<div class='quest'>" + (LANG()==="en" ? "No parishes yet. Be the first!" : "Ch\u01B0a c\u00F3 gi\u00E1o x\u1EE9 n\u00E0o. H\u00E3y l\u00E0 ng\u01B0\u1EDDi \u0111\u1EA7u ti\u00EAn!") + "</div>";
    else html = rows.map((r, i) => { const __pn = (LANG()==="en" ? (r.code === "CHUNG" ? "General Parish" : "Parish " + escHtml(r.code)) : escHtml(r.name)); return "<div class='brow" + (r.code === window.__myGx ? " me" : "") + "'><span class='brank'>" + medal(i) + "</span><span class='bname'>" + __pn + "<small>" + escHtml(r.code) + " · " + r.members + (LANG()==="en" ? " people" : " ng\u01B0\u1EDDi") + "</small></span><span class='bpts'>" + r.total + "✦</span></div>"; }).join("");
  } else if (tab === "me") {
    const rows = b.tops || [];
    if (!rows.length) html = "<div class='quest'>" + (LANG()==="en" ? "Nobody yet. Pray to climb the top!" : "Ch\u01B0a c\u00F3 ai. C\u1EA7u nguy\u1EC7n \u0111\u1EC3 l\u00EAn top!") + "</div>";
    else html = rows.map((r, i) => "<div class='brow'><span class='brank'>" + medal(i) + "</span><span class='bname'>" + escHtml(r.name) + "<small>" + escHtml(r.gx || "") + "</small></span><span class='bpts'>" + r.faith + "✦</span></div>").join("");
  } else {
    const code = window.__myGx || "CHUNG";
    const rows = (b.byParish && b.byParish[code]) || [];
    if (!rows.length) html = (LANG()==="en" ? ("<div class='quest'>Parish " + escHtml(code) + " has nobody online. Invite friends with code <b>" + escHtml(code) + "</b>!</div>") : ("<div class='quest'>GX " + escHtml(code) + " ch\u01B0a c\u00F3 ai online. M\u1EDDi b\u1EA1n b\u00E8 nh\u1EADp m\u00E3 <b>" + escHtml(code) + "</b> khi v\u00E0o!</div>"));
    else html = "<div class='quest' style='border-color:#ffd76a'>\u26EA " + (LANG()==="en" ? "Parish " : "GX ") + escHtml(code) + " \u2014 Top " + rows.length + (LANG()==="en" ? " people" : " ng\u01B0\u1EDDi") + "</div>" + rows.map((r, i) => "<div class='brow'><span class='brank'>" + medal(i) + "</span><span class='bname'>" + escHtml(r.name) + "</span><span class='bpts'>" + r.faith + "✦</span></div>").join("");
  }
  list.innerHTML = html;
  if (foot) {
    const code = window.__myGx || "CHUNG";
    let link = "";
    try { link = location.origin + "/?gx=" + encodeURIComponent(code); } catch (e) {}
    foot.innerHTML = "";
    const d = document.createElement("div");
    d.className = "binvite";
    d.innerHTML = "<span>" + (LANG()==="en" ? "Your parish code: <b>" : "M\u00E3 GX b\u1EA1n: <b>") + escHtml(code) + "</b> \u00B7 Online: " + ((b && b.online) || 0) + "</span>";
    const cp = document.createElement("button");
    cp.textContent = (LANG()==="en" ? "\uD83D\uDCCB Copy invite link" : "\uD83D\uDCCB Copy link m\u1EDDi");
    cp.onclick = () => {
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => toast((LANG()==="en" ? "Invite link copied: " : "\u0110\u00E3 copy link m\u1EDDi GX ") + code)).catch(() => toast(link));
        else toast(link);
      } catch (e) { toast(link); }
    };
    d.appendChild(cp);
    foot.appendChild(d);
  }
}
try {
  socket.on("boards", (bd) => { window.__boards = bd; renderBoards(); });
} catch (e) {}
try {
  const __bb = document.getElementById("boardBtn");
  if (__bb) __bb.onclick = (e) => {
    try { e.stopPropagation(); } catch (err) {}
    try { document.getElementById("questPanel").classList.add("hidden"); } catch (err) {}
    const p = document.getElementById("boardPanel");
    if (p) p.classList.toggle("hidden");
    try { socket.emit("get-boards"); } catch (err) {}
    renderBoards();
  };
  const __bc = document.getElementById("boardClose");
  if (__bc) __bc.onclick = () => document.getElementById("boardPanel").classList.add("hidden");
  document.querySelectorAll("#boardTabs button").forEach(t => t.onclick = () => { window.__boardTab = t.dataset.tab; renderBoards(); });
} catch (e) {}
try {
  // Nhan link moi ?gx=TANBINH -> tu dien ma giao xu o man hinh vao
  const q = new URLSearchParams(location.search).get("gx");
  const gxi = document.getElementById("gx");
  if (gxi) {
    if (q) { gxi.value = String(q).toUpperCase().slice(0, 24); try { localStorage.setItem("ntho_gx", gxi.value); } catch (e) {} }
    else { try { const old = localStorage.getItem("ntho_gx"); if (old) gxi.value = old; } catch (e) {} }
  }
  if (q) { try { window.__myGx = String(q).toUpperCase().slice(0, 24); } catch (e) {} }
  // Ghi nho ten hien thi -> lan sau vao khong phai go lai, khong bi dinh "undefined"
  try {
    const nmi = document.getElementById("name");
    if (nmi) { const oldName = localStorage.getItem("ntho_name"); if (oldName && !nmi.value) nmi.value = oldName; }
  } catch (e) {}
} catch (e) {}
// ================= TUONG NEN NGUYEN (realtime, luu server) =================
window.__candles = window.__candles || [];
function renderCandles() {
  const list = document.getElementById("boardList2");
  if (!list) return;
  const rows = window.__candles || [];
  if (!rows.length) { list.innerHTML = "<div class='quest'>" + (LANG()==="en" ? "No candles yet. Light the first one!" : "Ch\u01B0a c\u00F3 n\u1EBFn n\u00E0o. H\u00E3y th\u1EAFp n\u1EBFn \u0111\u1EA7u ti\u00EAn!") + " \uD83D\uDD6F\uFE0F</div>"; return; }
  list.innerHTML = rows.map(r => "<div class='candle-row'><span style='font-size:18px'>🕯️</span><span style='flex:1'><b>" + escHtml(r.name) + "</b> <small>· " + escHtml(r.gx || "") + "</small><br>" + escHtml(r.text) + "</span></div>").join("");
}
try {
  socket.on("candles", (rows) => { window.__candles = rows || []; renderCandles(); try { refreshCandleRack(); } catch (e2) {} });
  const __ct = document.getElementById("candleTopBtn");
  if (__ct) __ct.onclick = (e) => {
    try { e.stopPropagation(); } catch (err) {}
    try { document.getElementById("questPanel").classList.add("hidden"); } catch (err) {}
    try { document.getElementById("boardPanel").classList.add("hidden"); } catch (err) {}
    const p = document.getElementById("candlePanel");
    if (p) p.classList.toggle("hidden");
    try { socket.emit("get-candles"); } catch (err) {}
    renderCandles();
  };
  const __cc = document.getElementById("candleClose");
  if (__cc) __cc.onclick = () => document.getElementById("candlePanel").classList.add("hidden");
  const __cb2 = document.getElementById("candleBtn");
  if (__cb2) __cb2.onclick = () => {
    const inp = document.getElementById("candleTxt");
    const t = inp ? inp.value.trim().slice(0, 50) : "";
    try { socket.emit("light-candle", { text: t || (LANG()==="en" ? "Peace" : "Xin b\u00ECnh an") }); } catch (err) {}
    if (inp) inp.value = "";
    window.__myCandles = Math.min(24, (window.__myCandles || 0) + 1);
    try { refreshCandleRack(); } catch (e2) {}
    try { chimeSound(); } catch (e2) {}
    try { if (navigator.vibrate) navigator.vibrate(30); } catch (e2) {}
    addFaith(5, (LANG()==="en" ? "lit a candle" : "th\u1EAFp n\u1EBFn nguy\u1EC7n") + " \uD83D\uDD6F\uFE0F");
    try { showBubble(myId, (LANG()==="en" ? "\uD83D\uDD6F\uFE0F My prayer rises!" : "\uD83D\uDD6F\uFE0F Xin d\u00E2ng l\u1EDDi nguy\u1EC7n!")); } catch (err) {}
    toast((LANG()==="en" ? "\uD83D\uDD6F\uFE0F Your candle is burning!" : "\uD83D\uDD6F\uFE0F N\u1EBFn c\u1EE7a b\u1EA1n \u0111\u00E3 ch\u00E1y s\u00E1ng tr\u00EAn gi\u00E1 n\u1EBFn!"));
  };
} catch (e) {}
// ================= LAN HAT MAN COI (mini-game 1 chuc) =================
const ROSARY_SETS_VI = [
  { name: "🌟 Mầu Nhiệm VUI (Thứ 2 · Thứ 7)", items: ["Thứ nhất: Thiên thần truyền tin cho Đức Bà", "Thứ hai: Đức Bà đi viếng bà thánh Isave", "Thứ ba: Đức Bà sinh Chúa Giêsu", "Thứ bốn: Đức Bà dâng Chúa vào đền thánh", "Thứ năm: Đức Bà tìm thấy Chúa trong đền thánh"] },
  { name: "✝️ Mầu Nhiệm THƯƠNG (Thứ 3 · Thứ 6)", items: ["Thứ nhất: Chúa cầu nguyện trong vườn cây dầu", "Thứ hai: Chúa chịu đánh đòn", "Thứ ba: Chúa chịu đội mão gai", "Thứ bốn: Chúa vác thập giá", "Thứ năm: Chúa chịu chết trên thập giá"] },
  { name: "👑 Mầu Nhiệm MỪNG (Thứ 4 · Chúa Nhật)", items: ["Thứ nhất: Chúa sống lại", "Thứ hai: Chúa lên trời", "Thứ ba: Chúa Thánh Thần hiện xuống", "Thứ bốn: Đức Mẹ lên trời", "Thứ năm: Đức Mẹ được tôn vinh làm Nữ Vương"] },
  { name: "💡 Mầu Nhiệm SÁNG (Thứ 5)", items: ["Thứ nhất: Chúa chịu phép rửa", "Thứ hai: Chúa làm phép lạ tại Cana", "Thứ ba: Chúa rao giảng Nước Trời", "Thứ bốn: Chúa biến hình", "Thứ năm: Chúa lập Bí tích Thánh Thể"] },
];
const ROSARY_SETS_EN = [
  { name: "🌟 JOYFUL Mysteries (Mon · Sat)", items: ["1st: The Annunciation", "2nd: The Visitation", "3rd: The Nativity", "4th: The Presentation", "5th: Finding Jesus in the Temple"] },
  { name: "✝️ SORROWFUL Mysteries (Tue · Fri)", items: ["1st: Agony in the Garden", "2nd: Scourging at the Pillar", "3rd: Crowning with Thorns", "4th: Carrying of the Cross", "5th: The Crucifixion"] },
  { name: "👑 GLORIOUS Mysteries (Wed · Sun)", items: ["1st: The Resurrection", "2nd: The Ascension", "3rd: Descent of the Holy Spirit", "4th: The Assumption", "5th: Crowning of Mary"] },
  { name: "💡 LUMINOUS Mysteries (Thu)", items: ["1st: Baptism of Jesus", "2nd: Wedding at Cana", "3rd: Proclamation of the Kingdom", "4th: The Transfiguration", "5th: Institution of the Eucharist"] },
];
let ROSARY_SETS = (LANG() === 'en' ? ROSARY_SETS_EN : ROSARY_SETS_VI);
window.__rosary = window.__rosary || { idx: 0, decade: 0 };
function rosarySet() {
  const d = new Date().getDay();
  if (d === 1 || d === 6) return ROSARY_SETS[0];
  if (d === 2 || d === 5) return ROSARY_SETS[1];
  if (d === 4) return ROSARY_SETS[3];
  return ROSARY_SETS[2];
}
function rosarySteps() {
  if (LANG() === 'en') {
    const steps = [{ t: "Our Father", x: "Our Father, who art in heaven..." }];
    for (let i = 0; i < 10; i++) steps.push({ t: "Hail Mary " + (i + 1), x: "Hail Mary, full of grace..." });
    steps.push({ t: "Glory Be", x: "Glory be to the Father, and to the Son..." });
    return steps;
  }
  const steps = [{ t: "Lạy Cha", x: "Lạy Cha chúng con ở trên trời..." }];
  for (let i = 0; i < 10; i++) steps.push({ t: "Kính Mừng " + (i + 1), x: "Kính mừng Maria đầy ơn phúc..." });
  steps.push({ t: "Sáng Danh", x: "Sáng danh Đức Chúa Cha, và Đức Chúa Con..." });
  return steps;
}
function renderRosary() {
  const set = rosarySet(), steps = rosarySteps();
  const r = window.__rosary;
  const mystEl = document.getElementById("rosaryMyst"), bEl = document.getElementById("rosaryBeads");
  const txEl = document.getElementById("rosaryText"), prEl = document.getElementById("rosaryProg");
  const nxBtn = document.getElementById("rosaryNext");
  if (!mystEl || !bEl) return;
  const di = Math.min(4, Math.floor(r.decade / 12));
  mystEl.innerHTML = "<b>" + set.name + "</b><br>" + (LANG()==="en" ? "Meditate " : "Ngắm ") + set.items[di % 5] + " <small>(" + (LANG()==="en" ? "decade " : "chục ") + ((di % 5) + 1) + "/5)</small>";
  const cur = r.idx % 12;
  let html = "";
  steps.forEach((s, i) => {
    const cls = i < cur ? "done" : i === cur ? "cur" : "";
    html += "<span class='" + cls + "'>" + (i < cur ? "✦" : (i === 0 ? "✝" : i === 11 ? "✨" : (i))) + "</span>";
  });
  bEl.innerHTML = html;
  if (txEl) txEl.textContent = "“" + steps[cur].x + "”";
  if (prEl) prEl.textContent = cur + "/12 " + (LANG()==="en" ? "beads \u00B7 decade " : "hạt \u00B7 chục ") + ((di % 5) + 1);
  if (nxBtn) nxBtn.textContent = (LANG()==="en" ? (cur === 0 ? "\uD83D\uDE4F Begin Our Father" : cur === 11 ? "\u2728 Conclude Glory Be" : "\uD83D\uDCFF Pray bead " + (cur + 1) + "/12") : (cur === 0 ? "\uD83D\uDE4F Bắt đầu Lạy Cha" : cur === 11 ? "\u2728 Kết Sáng Danh" : "\uD83D\uDCFF Lần hạt " + (cur + 1) + "/12"));
}
try {
  const __rb = document.getElementById("rosaryBtn");
  if (__rb) __rb.onclick = (e) => {
    try { e.stopPropagation(); } catch (err) {}
    try { document.getElementById("questPanel").classList.add("hidden"); } catch (err) {}
    try { document.getElementById("boardPanel").classList.add("hidden"); } catch (err) {}
    try { document.getElementById("candlePanel").classList.add("hidden"); } catch (err) {}
    const p = document.getElementById("rosaryPanel");
    if (p) p.classList.toggle("hidden");
    renderRosary();
  };
  const __rc = document.getElementById("rosaryClose");
  if (__rc) __rc.onclick = () => document.getElementById("rosaryPanel").classList.add("hidden");
  const __rn = document.getElementById("rosaryNext");
  if (__rn) __rn.onclick = () => {
    const r = window.__rosary, steps = rosarySteps();
    const cur = r.idx % 12;
    const st = steps[cur];
    try { tone(520 + cur * 24, 0, 0.5, "sine", 0.2); tone(780 + cur * 12, 0.1, 0.4, "sine", 0.1); } catch (e2) {}
    try { if (navigator.vibrate) navigator.vibrate(20); } catch (e2) {}
    try { showBubble(myId, "📿 " + st.t); } catch (e2) {}
    try { trackQuest("pray"); } catch (e2) {}
    if (cur === 11) {
      const doneDecades = Math.floor(r.decade / 12) + 1;
      addFaith(15, ((LANG()==="en" ? "finished 1 decade " : "xong 1 chục Mân Côi ") + "\uD83D\uDCFF (" + doneDecades + "/5)"));
      try { fanfare(doneDecades % 5 === 0); } catch (e2) {}
      if (doneDecades % 5 === 0) toast((LANG()==="en" ? "\uD83C\uDF39 Full Rosary offered! +75" : "\uD83C\uDF39 D\u00E2ng tr\u1ECDn 1 tr\u00E0ng M\u00E2n C\u00F4i! +75\u2726"));
      else toast("\uD83D\uDCFF " + (LANG()==="en" ? ("Decade " + doneDecades + " done +15!") : ("Xong chục " + doneDecades + " +15\u2726!")));
      r.decade += 12; r.idx += 1;
    } else {
      addFaith(2, st.t + " 📿");
      r.idx += 1;
    }
    renderRosary();
  };
  renderRosary();
} catch (e) {}
// Nut chuong nha tho tren topbar — bam de rung, ca zone nghe thay
try {
  const __bb = document.getElementById("bellBtn");
  if (__bb) __bb.onclick = (e) => {
    try { e.stopPropagation(); } catch (err) {}
    try { socket.emit("ring-bell", {}); } catch (err) {}
    __bb.classList.add("ringing");
    setTimeout(() => __bb.classList.remove("ringing"), 1500);
  };
} catch (e) {}
// ================= GIO KINH CHUNG 20h (su kien cong dong) =================
window.__mass = window.__mass || null;
function fmtLeft(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60), ss = s % 60;
  return (m > 0 ? m + "p " : "") + ss + "s";
}
function fmtIn(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return h + "h " + m + "p";
  if (m > 0) return m + "p";
  return s + "s";
}
window.__massMin = window.__massMin || false;
window.__litMin = window.__litMin || false;
function renderMass() {
  const bar = document.getElementById("massBar");
  const txt = document.getElementById("massTxt");
  const go = document.getElementById("massGo");
  const ck = document.getElementById("massCheckin");
  if (!bar || !txt) return;
  const m = window.__mass;
  if (!m) { bar.classList.add("hidden"); return; }
  if (window.__massMin) { bar.classList.add("hidden"); return; }
  bar.classList.remove("hidden");
  if (m.active) {
    const big = m.kind === "big";
    txt.textContent = "\u26EA " + (big ? T("mass_big") : T("mass_small")) + " \u00B7 " + T("mass_left") + " " + fmtLeft(m.left) + " \u00B7 " + m.inChurch + " " + T("mass_inchurch");
    bar.classList.add("live");
    if (go) go.style.display = currentZone === "street" ? "" : "none";
    if (ck) { ck.style.display = currentZone === "street" ? "none" : ""; ck.disabled = false; ck.style.opacity = 1; ck.textContent = "\uD83D\uDE4F " + T("mass_checkin") + (big ? 30 : 15); }
  } else {
    txt.textContent = "\u26EA " + T("mass_big") + " \u00B7 " + T("mass_left") + " " + fmtIn(m.nextIn) + " \u00B7 " + T("mass_online") + " " + (m.online || 0);
    bar.classList.remove("live");
    if (go) go.style.display = "none";
    if (ck) ck.style.display = "none";
  }
  const mb = document.getElementById("massBtn");
  if (mb) mb.classList.toggle("live", !!(m && m.active));
}
try {
  socket.on("mass", (m) => {
    const was = window.__mass && window.__mass.active;
    window.__mass = m;
    if (m && m.active && !was) { window.__massMin = false; window.__litMin = false; }
    renderMass();
    if (m && m.active && !was) {
      toast(m.kind === "big" ? T("mass_start") : T("mass_start_mini"));
      fanfare(true);
      try { if (navigator.vibrate) navigator.vibrate([50, 80, 50]); } catch (e2) {}
    }
  });
  socket.on("mass-reward", ({ bonus, faith }) => {
    try { if (typeof faith === "number") syncFaith(faith); } catch (e2) {}
    try { toast((LANG()==="en" ? "Joined community prayer +" : "Dự giờ kinh chung +") + (bonus || 0) + "✦ ⛪"); } catch (e2) {}
    try { showBubble(myId, (LANG()==="en" ? "\u26EA Devout Mass!" : "\u26EA D\u1EF1 l\u1EC5 s\u1ED1t s\u1EAFng!")); } catch (e2) {}
    const ck = document.getElementById("massCheckin");
    if (ck) { ck.disabled = true; ck.style.opacity = 0.55; ck.textContent = (LANG()==="en" ? "\u2705 Checked in" : "\u2705 \u0110\u00E3 \u0111i\u1EC3m danh"); }
  });
  socket.on("mass-denied", ({ wait }) => {
    toast("\u23F3 " + (LANG()==="en" ? ("Prayer just ended, retry in " + fmtIn(wait)) : ("V\u1EEBa c\u00F3 gi\u1EDD kinh r\u1ED3i, th\u1EED l\u1EA1i sau " + fmtIn(wait))));
  });
  // --- Phung vu doi dap: hien loi xuong + 4 nut dap ---
  window.__lit = window.__lit || null;
  window.__litAnswered = window.__litAnswered || {};
  const LITURGY_VI = [
  { p: "Chúa ở cùng anh chị em.", a: "Và ở cùng cha." },
  { p: "Xin Thiên Chúa toàn năng thương xót, tha tội cho chúng ta.", a: "Amen." },
  { p: "Lạy Chúa, xin thương xót chúng con.", a: "Xin Chúa thương xót chúng con." },
  { p: "Vinh danh Thiên Chúa trên các tầng trời.", a: "Và bình an dưới thế cho người thiện tâm." },
  { p: "Đó là Lời Chúa.", a: "Tạ ơn Chúa." },
  { p: "Hãy nâng tâm hồn lên.", a: "Chúng con đang hướng về Chúa." },
  { p: "Anh chị em hãy cầu nguyện để hy lễ của tôi cũng là của anh chị em.", a: "Xin Chúa nhận hy lễ bởi tay cha." },
  { p: "Lễ xong, chúc anh chị em đi bình an.", a: "Tạ ơn Chúa." },
];
const LITURGY_EN = [
  { p: "The Lord be with you.", a: "And with your spirit." },
  { p: "May almighty God have mercy on us and forgive us our sins.", a: "Amen." },
  { p: "Lord, have mercy.", a: "Lord, have mercy." },
  { p: "Glory to God in the highest.", a: "And on earth peace to people of good will." },
  { p: "The Gospel of the Lord.", a: "Praise to you, Lord Jesus Christ." },
  { p: "Lift up your hearts.", a: "We lift them up to the Lord." },
  { p: "Pray that my sacrifice and yours may be acceptable to God.", a: "May the Lord accept the sacrifice at your hands." },
  { p: "The Mass is ended, go in peace.", a: "Thanks be to God." },
];
function litLocal(step) {
  try {
    const en = LANG() === 'en';
    const arr = en ? LITURGY_EN : LITURGY_VI;
    const base = arr[((step % arr.length) + arr.length) % arr.length];
    return base;
  } catch (e) { return null; }
}
function renderLit() {
    const panel = document.getElementById("litPanel");
    if (!panel) return;
    const lit = window.__lit;
    const m = window.__mass;
    if (window.__litMin) { panel.classList.add("hidden"); return; }
    if (!lit || !m || !m.active || currentZone === "street") { panel.classList.add("hidden"); return; }
    panel.classList.remove("hidden");
    const pr = document.getElementById("litPriest");
    try { if (LANG()==='en' && lit.priest_en) lit.priest = lit.priest_en; } catch (e) {}
    if (pr) pr.textContent = (LANG()==="en" ? "Priest: \"" : "Cha: \"") + lit.priest + "\"";
    const box = document.getElementById("litOpts");
    if (box && box.dataset.step !== String(lit.step)) {
      box.dataset.step = String(lit.step);
      box.innerHTML = "";
      const __opts = (LANG()==='en' && lit.options_en && lit.options_en.length) ? lit.options_en : (lit.options || []);
      __opts.forEach((op) => {
        const b = document.createElement("button");
        b.textContent = op;
        b.onclick = () => {
          try { socket.emit("lit-answer", { step: lit.step, text: op }); } catch (err) {}
          try { showBubble(myId, op); } catch (err) {}
          box.querySelectorAll("button").forEach((x) => { x.disabled = true; x.style.opacity = 0.55; });
          b.style.opacity = 1; b.style.borderColor = "#ffd76a";
        };
        box.appendChild(b);
      });
    }
    const tm = document.getElementById("litTimer");
    if (tm) tm.textContent = "\u23F3 " + Math.ceil((lit.left || 0) / 1000) + "s \u00B7 " + (LANG()==="en" ? "correct +6" : "\u0111\u00E1p \u0111\u00FAng +6\u2726");
  }
  socket.on("lit", (lit) => {
    window.__lit = lit;
    renderLit();
    try { if (lit && lit.priest) showBubble("priest", "⛪ " + lit.priest); } catch (e2) {}
    try { amenSound(); } catch (e2) {}
  });
  socket.on("lit-end", () => {
    window.__lit = null;
    const panel = document.getElementById("litPanel");
    if (panel) panel.classList.add("hidden");
  });
  socket.on("lit-result", ({ ok, gain, faith }) => {
    try { if (typeof faith === "number") syncFaith(faith); } catch (e2) {}
    if (ok) { try { fanfare(false); } catch (e2) {} toast((LANG()==="en" ? "\u2705 Correct +6!" : "\u2705 \u0110\u00E1p \u0111\u00FAng +6\u2726!")); }
    else toast((LANG()==="en" ? "\uD83D\uDE4F United in prayer +1" : "\uD83D\uDE4F \u0110\u00E3 hi\u1EC7p th\u00F4ng +1\u2726"));
  });
  setInterval(() => { try { renderLit(); } catch (e2) {} }, 1000);
  const __lc = document.getElementById("litClose");
  if (__lc) __lc.onclick = (e) => {
    try { e.stopPropagation(); } catch (err) {}
    window.__litMin = true;
    const panel = document.getElementById("litPanel");
    if (panel) panel.classList.add("hidden");
    toast((LANG()==="en" ? "Responses hidden \u2014 tap the church button to reopen" : "\u0110\u00E3 thu g\u1ECDn \u0111\u00E1p l\u1EC5 \u2014 b\u1EA5m \u26EA \u0111\u1EC3 m\u1EDF l\u1EA1i"));
  };
  const __mx = document.getElementById("massClose");
  if (__mx) __mx.onclick = (e) => {
    try { e.stopPropagation(); } catch (err) {}
    window.__massMin = true;
    const bar = document.getElementById("massBar");
    if (bar) bar.classList.add("hidden");
    toast((LANG()==="en" ? "Prayer bar hidden \u2014 tap the church button to reopen" : "\u0110\u00E3 thu g\u1ECDn gi\u1EDD kinh \u2014 b\u1EA5m \u26EA \u0111\u1EC3 m\u1EDF l\u1EA1i"));
  };
  const __mb = document.getElementById("massBtn");
  if (__mb) __mb.onclick = (e) => {
    try { e.stopPropagation(); } catch (err) {}
    // neu dang thu gon -> mo lai chu khong lam gi khac
    if (window.__massMin || window.__litMin) {
      window.__massMin = false; window.__litMin = false;
      renderMass(); renderLit();
      return;
    }
    const m = window.__mass;
    if (m && m.active) {
      if (currentZone === "street") socket.emit("switch-zone", { zone: "church-1" });
      else socket.emit("mass-checkin");
    } else {
      // mo kinh thu 3 phut de test / choi ngay (5 phut 1 lan)
      if (confirm((LANG()==="en" ? "Open a 3-minute trial prayer (+15 for attendees)?" : "M\u1EDF gi\u1EDD kinh chung th\u1EED (3 ph\u00FAt, +15\u2726 cho ng\u01B0\u1EDDi d\u1EF1)?"))) socket.emit("start-mini-mass");
      else socket.emit("get-mass");
    }
    renderMass();
  };
  const __mg = document.getElementById("massGo");
  if (__mg) __mg.onclick = () => socket.emit("switch-zone", { zone: "church-1" });
  const __mc = document.getElementById("massCheckin");
  if (__mc) __mc.onclick = () => socket.emit("mass-checkin");
  setInterval(() => { try { renderMass(); } catch (e2) {} try { renderGrace(); } catch (e2) {} try { renderCombo(); } catch (e2) {} }, 1000);
  try { socket.emit("get-mass"); } catch (e2) {}
  // ---- Mua on lanh: thanh x2 + dem nguoc ----
  window.__graceEndsAt = window.__graceEndsAt || 0;
  window.__quiz = window.__quiz || null;
  window.__quizEndsAt = window.__quizEndsAt || 0;
  function renderGrace() {
    const bar = document.getElementById("graceBar"), tx = document.getElementById("graceTxt");
    if (!bar || !tx) return;
    let active = false, left = 0;
    try {
      if (window.__grace && window.__grace.active) { active = true; left = Math.max(0, Math.ceil(((window.__graceEndsAt || 0) - Date.now()) / 1000)); if (!window.__graceEndsAt) left = Math.ceil((window.__grace.left || 0) / 1000); }
      else if (window.__mass && window.__mass.grace && window.__mass.grace.active) { active = true; left = Math.max(0, Math.ceil((window.__mass.grace.left || 0) / 1000)); }
    } catch (e) {}
    if (active) {
      bar.classList.remove("hidden");
      tx.textContent = (LANG() === "en" ? "🌧️ Grace Rain · x2 all ✦ · " : "🌧️ Mưa ơn lành · x2 mọi ✦ · còn ") + left + "s";
    } else bar.classList.add("hidden");
  }
  function renderCombo() {
    const pill = document.getElementById("comboPill");
    if (!pill) return;
    let n = 0, ok = false;
    try {
      const dt = Date.now() - (window.__combo.last || 0);
      n = window.__combo.n || 0;
      ok = n >= 2 && dt <= 10000;
    } catch (e) {}
    if (!ok) { pill.classList.add("hidden"); return; }
    pill.classList.remove("hidden");
    const mult = n >= 12 ? 3 : n >= 7 ? 2 : n >= 3 ? 1.5 : 1;
    pill.textContent = "🔥 Combo x" + n + (mult > 1 ? " · ✦ x" + mult : "");
    pill.classList.toggle("hot", n >= 7);
  }
  socket.on("grace", (g) => {
    try {
      window.__grace = g || { active: false };
      window.__graceEndsAt = g && g.active ? Date.now() + (g.left || 0) : 0;
      renderGrace();
      if (g && g.active) {
        toast(LANG() === "en" ? "🌧️ GRACE RAIN! x2 all ✦ for 60s!" : "🌧️ MƯA ƠN LÀNH! x2 mọi ✦ trong 60s!");
        try { fanfare(true); } catch (e2) {}
        try { if (navigator.vibrate) navigator.vibrate([60, 60, 60]); } catch (e2) {}
      }
    } catch (e) {}
  });
  socket.on("mass", (m2) => {
    try {
      if (m2 && m2.grace) { window.__grace = m2.grace; if (m2.grace.active && m2.grace.left) window.__graceEndsAt = Date.now() + m2.grace.left; }
      renderGrace();
    } catch (e) {}
  });
  // ---- Do Kinh Thanh: panel 4 dap an, 25s ----
  function renderQuiz() {
    const panel = document.getElementById("quizPanel");
    if (!panel) return;
    const q = window.__quiz;
    if (!q) { panel.classList.add("hidden"); return; }
    const left = Math.max(0, Math.ceil(((window.__quizEndsAt || 0) - Date.now()) / 1000));
    if (left <= 0) { panel.classList.add("hidden"); return; }
    panel.classList.remove("hidden");
    const en = LANG() === "en";
    const title = document.getElementById("quizTitle"), timer = document.getElementById("quizTimer");
    const qq = document.getElementById("quizQ"), box = document.getElementById("quizOpts");
    if (title) title.textContent = en ? "📖 Bible Quiz" : "📖 Đố Kinh Thánh";
    if (timer) timer.textContent = "⏳ " + left + "s";
    if (qq && box && box.dataset.qid !== String(q.qid)) {
      box.dataset.qid = String(q.qid);
      box.innerHTML = "";
      qq.textContent = "❓ " + (en ? (q.q_en || q.q) : q.q);
      const opts = en ? (q.opts_en || q.opts) : q.opts;
      (opts || []).forEach((op, i) => {
        const b = document.createElement("button");
        b.textContent = op;
        b.onclick = () => {
          try { socket.emit("quiz-answer", { qid: q.qid, idx: i }); } catch (err) {}
          try { showBubble(myId, op); } catch (err) {}
          box.querySelectorAll("button").forEach((x) => { x.disabled = true; x.style.opacity = 0.55; });
          b.style.opacity = 1; b.style.borderColor = "#9dc2ff";
        };
        box.appendChild(b);
      });
    } else if (timer) { timer.textContent = "⏳ " + left + "s"; }
  }
  socket.on("quiz", (q) => {
    try {
      window.__quiz = q;
      window.__quizEndsAt = Date.now() + ((q && q.left) || 25) * 1000;
      renderQuiz();
      toast(LANG() === "en" ? "📖 Bible Quiz! Fast correct = +20✦" : "📖 Đố Kinh Thánh! Nhanh + đúng = +20✦");
      try { fanfare(false); } catch (e2) {}
    } catch (e) {}
  });
  socket.on("quiz-end", ({ correct, winner }) => {
    try {
      const box = document.getElementById("quizOpts");
      if (box) box.querySelectorAll("button").forEach((x, i) => { if (i === correct) x.classList.add("correct"); });
      setTimeout(() => { window.__quiz = null; const p = document.getElementById("quizPanel"); if (p) p.classList.add("hidden"); }, 4000);
      if (winner) toast((LANG() === "en" ? "🏆 " : "🏆 ") + winner + (LANG() === "en" ? " answered first!" : " trả lời đúng đầu tiên!"));
    } catch (e) {}
  });
  socket.on("quiz-result", ({ ok, gain, faith }) => {
    try { if (typeof faith === "number") syncFaith(faith); } catch (e2) {}
    try {
      if (ok) { try { fanfare(false); } catch (e2) {} toast((LANG() === "en" ? "✅ Correct +" : "✅ Đáp đúng +") + gain + "✦!"); }
      else toast("🙏 " + (LANG() === "en" ? "Joined +1✦" : "Hiệp thông +1✦"));
    } catch (e) {}
  });
  socket.on("quiz-first", ({ name }) => {
    try { toast("⚡ " + name + (LANG() === "en" ? " was fastest!" : " nhanh nhất!")); } catch (e) {}
  });
  setInterval(() => { try { renderQuiz(); } catch (e2) {} }, 500);
} catch (e) {}
// ================= TOUR TAN THU DAY DU (co nut Bo qua + Xem lai) =================
let __tourIdx = 0, __tourHl = null;
function __tourSteps() {
  const en = LANG() === 'en';
  return [
    { sel: null, t: en ? "👋 Welcome to Church Online!" : "👋 Chào bạn đến Nhà Thờ Online!", d: en ? "A 3D church game: pray, light candles, join Mass, answer Bible quizzes and climb the faith leaderboard. This 30s tour shows everything." : "Game nhà thờ 3D: cầu nguyện, thắp nến, dự lễ, đố Kinh Thánh, đua BXH đức tin. Tour 30s này chỉ hết mọi nút quan trọng." },
    { sel: "#joystick", t: en ? "🕹️ Move" : "🕹️ Di chuyển", d: en ? "Drag the left joystick to walk (WASD/arrows on PC). Drag on empty screen to rotate camera like Genshin." : "Kéo joystick trái để đi bộ (PC: WASD/mũi tên). Vuốt ra màn hình trống để xoay camera kiểu Genshin." },
    { sel: '#actions button[data-act="cau-nguyen"]', t: en ? "🙏 Pray (kneel)" : "🙏 Cầu nguyện (quỳ)", d: en ? "Tap 🙏 to kneel. Hold 20s for +5✦ and quest progress. Tap again to stand." : "Bấm 🙏 để quỳ gối. Quỳ đủ 20s được +5✦ và tính nhiệm vụ. Bấm lại để đứng dậy." },
    { sel: "#moveBtns", t: en ? "🏃 Run · ⬆ Jump · 🎵 Sing" : "🏃 Chạy · ⬆ Nhảy · 🎵 Hát", d: en ? "Hold 🏃 + move to sprint. ⬆ to jump. 🎵👋✝️ = sing, greet, amen — each gives ✦ and shows a bubble." : "Giữ 🏃 + di chuyển để chạy. ⬆ để nhảy. 🎵👋✝️ = hát, chào, amen — mỗi cái đều +✦ và hiện bong bóng." },
    { sel: "#chatbar", t: en ? "💬 Send a prayer" : "💬 Gửi lời nguyện", d: en ? "Type a prayer and Send — counts for the daily chat quest (+20✦) and everyone sees it." : "Gõ lời nguyện rồi Gửi — tính nhiệm vụ chat ngày (+20✦), mọi người đều thấy." },
    { sel: "#questBtn", t: en ? "📜 Quests + check-in" : "📜 Nhiệm vụ + điểm danh", d: en ? "Open 📜 daily: pray 3x, visit 3 churches, 1 prayer, 150m pilgrimage, 1 relic. Check in every day for streak ✦." : "Mở 📜 mỗi ngày: cầu nguyện 3 lần, viếng 3 nhà thờ, 1 lời nguyện, hành hương 150m, 1 thánh tích. Điểm danh mỗi ngày giữ chuỗi 🔥." },
    { sel: "#candleTopBtn", t: en ? "🕯️ Candles · 📿 Rosary · 💜 Confession" : "🕯️ Nến · 📿 Mân Côi · 💜 Xưng tội", d: en ? "🕯️ light a candle (+5✦), 📿 pray the rosary decade by decade, 💜 examine conscience for up to +30✦." : "🕯️ thắp nến (+5✦), 📿 lần hạt Mân Côi từng chục, 💜 xét mình xưng tội tới +30✦." },
    { sel: "#boardBtn", t: en ? "🏆 Ranks · ⛪ Mass · 📖 Quiz" : "🏆 BXH · ⛪ Lễ · 📖 Quiz", d: en ? "🏆 parish/personal ranks. ⛪ Community prayer 8PM (+30✦ check-in). 📖 Bible quiz every few minutes — fastest correct wins big ✦." : "🏆 BXH giáo xứ/cá nhân. ⛪ Giờ kinh chung 20h (điểm danh +30✦). 📖 Đố Kinh Thánh vài phút 1 lần — ai nhanh tay đúng nhất thắng lớn ✦." },
    { sel: "#mapBtn", t: en ? "🗺️ Map & churches" : "🗺️ Bản đồ & nhà thờ", d: en ? "Tap 🗺️ or walk to the ⛪ gate to switch: Parish Street, Notre-Dame, Vatican, Sagrada Familia." : "Bấm 🗺️ hoặc đi tới cổng ⛪ để chuyển: Phố Giáo Xứ, Đức Bà, Vatican, Sagrada Familia." },
  ];
}
function __tourEnd(save) {
  try { document.querySelectorAll(".tour-hl").forEach(e => e.classList.remove("tour-hl")); } catch (e) {}
  __tourHl = null;
  try { document.getElementById("tourOverlay").classList.add("hidden"); } catch (e) {}
  try { document.getElementById("tourCard").classList.add("hidden"); } catch (e) {}
  if (save) { try { localStorage.setItem("ntho_tour_done", "1"); } catch (e) {} }
}
function __tourRender() {
  const steps = __tourSteps();
  const i = Math.max(0, Math.min(steps.length - 1, __tourIdx));
  __tourIdx = i;
  const st = steps[i];
  const en = LANG() === 'en';
  try { document.querySelectorAll(".tour-hl").forEach(e => e.classList.remove("tour-hl")); } catch (e) {}
  __tourHl = null;
  if (st.sel) { try { const el = document.querySelector(st.sel); if (el) { el.classList.add("tour-hl"); __tourHl = el; el.scrollIntoView({ block: "nearest" }); } } catch (e) {} }
  try { document.getElementById("tourTitle").textContent = st.t; } catch (e) {}
  try { document.getElementById("tourDesc").textContent = ((i + 1) + "/" + steps.length + " · ") + st.d; } catch (e) {}
  try {
    const dots = document.getElementById("tourDots"); dots.innerHTML = "";
    steps.forEach((_, k) => { const d = document.createElement("i"); if (k === i) d.className = "on"; dots.appendChild(d); });
  } catch (e) {}
  try { document.getElementById("tourBack").style.visibility = i === 0 ? "hidden" : "visible"; } catch (e) {}
  try { document.getElementById("tourNext").textContent = i === steps.length - 1 ? (en ? "Done ✝️" : "Xong ✝️") : (en ? "Next →" : "Tiếp →"); } catch (e) {}
  try { document.getElementById("tourSkip").textContent = en ? "Skip" : "Bỏ qua"; } catch (e) {}
}
function startTour(force) {
  let done = false;
  try { done = !!localStorage.getItem("ntho_tour_done"); } catch (e) {}
  if (done && !force) return;
  __tourIdx = 0;
  try { document.getElementById("tourOverlay").classList.remove("hidden"); } catch (e) {}
  try { document.getElementById("tourCard").classList.remove("hidden"); } catch (e) {}
  __tourRender();
}
(function __wireTour() {
  const nxt = document.getElementById("tourNext");
  const back = document.getElementById("tourBack");
  const skip = document.getElementById("tourSkip");
  if (nxt && !nxt.__wired) {
    nxt.__wired = true;
    nxt.onclick = () => {
      const n = __tourSteps().length;
      if (__tourIdx >= n - 1) { __tourEnd(true); try { toast(T("toast_quest")); } catch (e) {} }
      else { __tourIdx++; __tourRender(); }
    };
  }
  if (back && !back.__wired) { back.__wired = true; back.onclick = () => { __tourIdx = Math.max(0, __tourIdx - 1); __tourRender(); }; }
  if (skip && !skip.__wired) { skip.__wired = true; skip.onclick = () => __tourEnd(true); }
  const help = document.getElementById("helpBtn");
  if (help && !help.__wired) { help.__wired = true; help.onclick = (e) => { try { e.stopPropagation(); } catch (e2) {} startTour(true); }; }
})();
// Hook hanh dong de cong duc tin + tien trinh nhiem vu
document.querySelectorAll("#actions button").forEach(b => b.addEventListener("click", () => {
  const act = b.dataset.act;
  if (act === "cau-nguyen") { trackQuest("pray"); addFaith(8, (LANG()==="en" ? "prayed" : "c\u1EA7u nguy\u1EC7n") + " \uD83D\uDE4F"); }
  else addFaith(3, act === "hat" ? ((LANG()==="en" ? "sang praise " : "ca t\u1EE5ng ") + "\uD83C\uDFB5") : act === "chao" ? ((LANG()==="en" ? "greeted in peace " : "ch\u00E0o b\u00ECnh an ") + "\uD83D\uDC4B") : ((LANG()==="en" ? "professed faith " : "tuy\u00EAn x\u01B0ng ") + "\u271D\uFE0F"));
}));
const __origSend = sendChat;
sendChat = function () {
  const inp = document.getElementById("chat");
  const had = inp && inp.value.trim().length > 0;
  __origSend();
  if (had) { trackQuest("chat"); addFaith(4, (LANG()==="en" ? "offered a prayer" : "d\u00E2ng l\u1EDDi nguy\u1EC7n") + " \uD83D\uDCAC"); }
};
document.getElementById("send").onclick = sendChat;
let lastSend = 0;
let __lastT = performance.now();
let __frames = 0;
window.__frames = 0;
window.__NTHO_GEN = (window.__NTHO_GEN || 0) + 1;
const __myGen = window.__NTHO_GEN;
function tick() {
  if (__myGen !== window.__NTHO_GEN) return;
  try {
  __frames++; window.__frames = __frames;
  const __now = performance.now();
  const dt = Math.min(0.05, Math.max(0.005, (__now - __lastT) / 1000));
  __lastT = __now;
  const me = players.get(myId), mm = meshes.get(myId);
  if (me && mm) {
    if (joy.tx === undefined) { joy.tx = 0; joy.ty = 0; }
    // Lam muot theo thoi gian thuc (khong phu thuoc FPS): bam la chay ngay, nha la dung gon
    const kUp = 1 - Math.exp(-dt * 22);
    const kDn = 1 - Math.exp(-dt * 14);
    const txx = joy.tx || 0, tyy = joy.ty || 0;
    joy.x += (txx - (joy.x || 0)) * (Math.abs(txx) > Math.abs(joy.x || 0) ? kUp : kDn);
    joy.y += (tyy - (joy.y || 0)) * (Math.abs(tyy) > Math.abs(joy.y || 0) ? kUp : kDn);
    if (Math.abs(joy.x) < 0.01) joy.x = 0;
    if (Math.abs(joy.y) < 0.01) joy.y = 0;
    let dx = joy.x, dz = joy.y;
    if (keys["w"] || keys["arrowup"]) dz -= 1;
    if (keys["s"] || keys["arrowdown"]) dz += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;
    if (camYaw === null) camYaw = me.ry || 0;
    const __moving = !!(dx || dz);
    let __sprinting = false;
    let sp = 7 * dt;
    if (__moving && __wantSprint()) {
      __sprinting = true;
      sp = 18 * dt;
    }
    __stamina = 100;
    try { const __sf = document.getElementById("staminaFill"); if (__sf) __sf.style.width = "100%"; const __st = document.getElementById("stamina"); if (__st) __st.style.display = "none"; } catch (e) {}
    if (dx || dz) {
      // Đứng dậy khi bắt đầu di chuyển (giống ngoài đời: đang quỳ muốn đi phải đứng trước)
      if (me.action === "cau-nguyen") {
        me.action = "idle";
        try { socket.emit("action", { action: "idle", text: "" }); } catch (e) {}
        try { document.querySelector('#actions button[data-act="cau-nguyen"]')?.classList.remove("on"); } catch (e) {}
      }
      const _len = Math.hypot(dx, dz) || 1;
      const _mag = Math.min(1, _len);
      // Genshin-style: input xoay theo huong camera (forward = -dz)
      const fwd = -dz / _len, rgt = dx / _len;
      const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
      let nx = sy * fwd - cy * rgt;
      let nz = cy * fwd + sy * rgt;
      const nl = Math.hypot(nx, nz) || 1;
      nx /= nl; nz /= nl;
      me.x = Math.max(BOUNDS[currentZone].x[0], Math.min(BOUNDS[currentZone].x[1], me.x + nx * _mag * sp));
      me.z = Math.max(BOUNDS[currentZone].z[0], Math.min(BOUNDS[currentZone].z[1], me.z + nz * _mag * sp));
      try {
        window.__runAcc = (window.__runAcc || 0) + _mag * sp;
        if (window.__runAcc >= 4) { trackQuest("run", window.__runAcc); window.__runAcc = 0; }
      } catch (e) {}
      const _target = Math.atan2(nx, nz);
      let _d = _target - me.ry;
      while (_d > Math.PI) _d -= Math.PI * 2;
      while (_d < -Math.PI) _d += Math.PI * 2;
      const _maxTurn = 10 * dt;
      me.ry += Math.max(-_maxTurn, Math.min(_maxTurn, _d));
      // Nhun + vung tay chan do tickAvatar lo (khoa theo toc do that)
      mm.position.set(me.x, me.y || 0, me.z); mm.rotation.y = me.ry;
      tickAvatar(myId, me, mm, dt, __now);
      if (Date.now() - lastSend > 80) { socket.emit("move", { x: me.x, z: me.z, y: me.y || 0, ry: me.ry }); lastSend = Date.now(); }
    }
    // Vat ly nhay: y + vy, trong luc keo xuong
    if (me.y === undefined) me.y = 0;
    if ((me.y || 0) > 0 || __vy !== 0) {
      __vy -= 14.5 * dt;
      me.y = (me.y || 0) + __vy * dt;
      if (me.y <= 0) { me.y = 0; __vy = 0; try { tone(420, 0, 0.1, 'sine', 0.08); } catch (e) {} }
      mm.position.set(me.x, me.y, me.z);
      if (!(dx || dz)) mm.position.y = me.y;
      if (Date.now() - lastSend > 80) { socket.emit("move", { x: me.x, z: me.z, y: me.y || 0, ry: me.ry }); lastSend = Date.now(); }
    } else if (!(dx || dz)) {
      mm.position.set(me.x, 0, me.z);
      tickAvatar(myId, me, mm, dt, __now);
    }
    // Animation + noi suy muot cho nguoi choi khac (remote) moi khung hinh
    try {
      const kPos = Math.min(1, dt * 10);
      for (const [oid, om] of meshes) {
        if (oid === myId) continue;
        const op = players.get(oid);
        if (!op) continue;
        om.position.x += (op.x - om.position.x) * kPos;
        om.position.z += (op.z - om.position.z) * kPos;
        om.position.y += (((op.y || 0)) - om.position.y) * Math.min(1, dt * 12);
        let dr = (op.ry || 0) - om.rotation.y;
        while (dr > Math.PI) dr -= Math.PI * 2;
        while (dr < -Math.PI) dr += Math.PI * 2;
        om.rotation.y += dr * kPos;
        tickAvatar(oid, op, om, dt, __now);
      }
      // Dam bao local cung duoc anim ca khi dang nhay dung yen
      if (!(dx || dz) && ((me.y || 0) > 0)) tickAvatar(myId, me, mm, dt, __now);
    } catch (e) {}
    if (window.__camX === undefined) { window.__camX = me.x; window.__camZ = me.z; window.__camRy = me.ry; }
    // Camera Genshin: yaw doc lap, chi bam theo vi tri (khong tu be ra sau lung)
    if (camYaw === null) camYaw = me.ry || 0;
    window.__camRy = camYaw;
    const _ck = Math.min(1, dt * 6);
    window.__camX += (me.x - window.__camX) * _ck;
    window.__camZ += (me.z - window.__camZ) * _ck;
    const _dist = 9, _h = 1.5 + Math.sin(camPitch) * _dist, _hd = Math.cos(camPitch) * _dist;
    camera.position.set(window.__camX - Math.sin(camYaw) * _hd, _h, window.__camZ - Math.cos(camYaw) * _hd);
    camera.lookAt(window.__camX, 1.5, window.__camZ);
  } else { camera.position.set(0, 10, 24); camera.lookAt(0, 2, -10); }
  projectBubbles();
  if (__frames % 10 === 0) { try { checkPortals(); } catch (e) {} try { checkRelics(); } catch (e) {} }
  try { tickNPCs(dt, __now / 1000); } catch (e) {}
  try { checkGraceOrbs(dt, __now / 1000); } catch (e) {}
  try { tickPuffs(dt); } catch (e) {}
  try {
    const t = __now / 1000;
    try {
      for (const r of RELICS) {
        if (!r.obj.visible) continue;
        r.obj.rotation.y += dt * 1.6;
        r.obj.position.y = r.y + 0.25 + Math.sin(t * 2.5 + r.x) * 0.18;
        if (r.obj.userData.glow) {
          const s = 2.2 + Math.sin(t * 4 + r.z) * 0.35;
          r.obj.userData.glow.scale.set(s, s, 1);
        }
      }
    } catch (e) {}
    if (streetGroup.userData.water) {
      streetGroup.userData.water.position.y = 1.22 + Math.sin(t * 3) * 0.06;
      const s = 1 + Math.sin(t * 3) * 0.03;
      streetGroup.userData.water.scale.set(s, s, 1);
    }
    if (streetGroup.userData.pond) {
      const ps = 1 + Math.sin(t * 2.2) * 0.02;
      streetGroup.userData.pond.scale.set(ps, ps, 1);
    }
    if (streetGroup.userData.jet) {
      streetGroup.userData.jet.scale.set(1 + Math.sin(t * 6) * 0.08, 1 + Math.sin(t * 6) * 0.15, 1);
      streetGroup.userData.jet.rotation.y += dt * 1.5;
    }
    // May troi nhe + nen lung linh + lua nen chay + co bay
    try {
      if (scene.userData.clouds) {
        for (const cl of scene.userData.clouds) {
          cl.position.x += (cl.userData.v || 0.5) * dt;
          if (cl.position.x > 340) cl.position.x = -140;
        }
      }
      if (candleLight) candleLight.intensity = 1.3 + Math.sin(t * 9) * 0.18 + Math.sin(t * 23) * 0.08;
      // Gia nen 3D: lua chay lung linh theo tung ngon
      try {
        const arr = scene.userData.candleFlames || [];
        for (const o of arr) {
          if (!o.flame.visible) continue;
          const s = 1 + Math.sin(t * 11 + o.seed * 7) * 0.18 + Math.sin(t * 27 + o.seed * 3) * 0.08;
          o.flame.scale.set(1, s, 1);
          o.flame.position.x += Math.sin(t * 13 + o.seed * 9) * 0.0009;
          const gs = 0.85 + Math.sin(t * 11 + o.seed * 7) * 0.12;
          o.glow.scale.set(0.9 * gs, 0.9 * gs, 1);
          o.glow.material.opacity = 0.6 + Math.sin(t * 11 + o.seed * 7) * 0.15;
        }
        // hat sang bay len khi cau nguyen
        try {
          const w0p = window.__ntho, me0p = w0p && myId ? w0p.players.get(myId) : null;
          tickPrayParts(dt, t, me0p);
        } catch (e2) {}
        // not nhac ca doan + song chuong
        try { tickChoirNotes(dt, t); } catch (e2) {}
        try { tickBellWaves(dt); } catch (e2) {}
        // moi vao game goi 1 lan de hien 2 nen mau
        if (!window.__rackInit) { window.__rackInit = true; try { refreshCandleRack(); } catch (e2) {} }
        // dai phun nuoc ngoai cua: xoay + phap phong
        try {
          const jv = scene.userData.doorVista && scene.userData.doorVista.userData.jet;
          if (jv) { jv.rotation.y += dt * 1.2; jv.scale.set(1 + Math.sin(t * 6) * 0.1, 1 + Math.sin(t * 6) * 0.18, 1); }
        } catch (e2) {}
      } catch (e) {}
      // Anh nen am bam theo nguoi dang QUY — cang quy lau cang am, lung linh nhu nen that
      try {
        const w0 = window.__ntho, me0 = w0 && myId ? w0.players.get(myId) : null;
        const pl = scene.userData.prayLight;
        if (pl && me0) {
          const praying = me0.action === "cau-nguyen";
          const want = praying ? 1.6 + Math.sin(t * 7) * 0.25 + Math.sin(t * 17) * 0.1 : 0;
          pl.intensity += (want - pl.intensity) * Math.min(1, dt * 4);
          pl.position.set(me0.x, 1.7, me0.z);
        }
      } catch (e) {}
      // Thuong tinh nguyen theo moc NHANH: 3s +3✦, 8s +5✦, 15s +10✦, 30s +15✦ + thanh tien trinh
      try {
        const w0b = window.__ntho, me0b = w0b && myId ? w0b.players.get(myId) : null;
        const pb = document.getElementById("prayBar"), pf = document.getElementById("prayFill"), pt = document.getElementById("prayTxt");
        if (me0b && me0b.action === "cau-nguyen") {
          window.__prayAcc = (window.__prayAcc || 0) + dt;
          const acc = window.__prayAcc;
          const stage = acc >= 30 ? 3 : acc >= 15 ? 2 : acc >= 8 ? 1 : acc >= 3 ? 0 : -1;
          if (window.__prayStage === undefined) window.__prayStage = -1;
          if (stage > window.__prayStage) {
            window.__prayStage = stage;
            const gains = [3, 5, 10, 15];
            const labels = (LANG()==="en" ? ["silent prayer 10s", "deep prayer 20s", "union 40s", "ecstasy 60s"] : ["tĩnh nguyện 10s 🙏", "tĩnh nguyện sâu 20s 🙏", "kết hiệp 40s 🕯️", "ngây ngất 60s ✨"]);
            try { addFaith(gains[stage], labels[stage]); } catch (e2) {}
            try { showBubble(myId, (LANG()==="en" ? (stage >= 3 ? "Ecstasy in God!" : stage >= 2 ? "Deep union!" : "Amen!") : (stage >= 3 ? "Ngây ngất trong Chúa!" : stage >= 2 ? "Kết hiệp mật thiết!" : "Amen!"))); } catch (e2) {}
            try { fanfare(stage >= 2); } catch (e2) {}
          }
          if (pb) {
            pb.classList.remove("hidden");
            const pct = Math.min(100, acc / 30 * 100);
            if (pf) pf.style.width = pct + "%";
            if (pt) pt.textContent = (LANG()==="en" ? ("Praying " + Math.floor(acc) + "s" + (acc >= 30 ? " · complete" : acc >= 15 ? " · +15 at 30s" : acc >= 8 ? " · +10 at 15s" : acc >= 3 ? " · +5 at 8s" : " · +3 at 3s")) : ("Tĩnh nguyện " + Math.floor(acc) + "s" + (acc >= 30 ? " · viên mãn" : acc >= 15 ? " · +15 ở 30s" : acc >= 8 ? " · +10 ở 15s" : acc >= 3 ? " · +5 ở 8s" : " · +3 ở 3s")));
          }
        } else {
          window.__prayAcc = 0; window.__prayStage = -1;
          if (pb) pb.classList.add("hidden");
        }
      } catch (e) {}
      try { if (interiorExtra.userData.star) { interiorExtra.userData.star.rotation.y += dt * 0.8; interiorExtra.userData.star.position.y = 6.2 + Math.sin(t * 2) * 0.15; } } catch (e) {}
      if (streetGroup.userData.flags) {
        for (const fg of streetGroup.userData.flags) {
          const pos = fg.geometry.attributes.position;
          for (let vi = 0; vi < pos.count; vi++) {
            const px = pos.getX(vi);
            pos.setZ(vi, Math.sin(t * 4 + px * 1.8 + (fg.userData.ph || 0)) * (0.08 + (px + 1.2) * 0.09));
          }
          pos.needsUpdate = true;
          fg.geometry.computeVertexNormals();
        }
      }
    } catch (e) {}
    if (streetGroup.visible) {
      let bi = 0;
      for (const o of streetGroup.children) {
        if (o.geometry && o.geometry.type === 'CylinderGeometry' && o.material && o.material.transparent) {
          o.material.opacity = 0.22 + Math.sin(t * 2 + bi) * 0.08;
          bi++;
        }
      }
    }
  } catch (e) {}
  renderer.render(scene, camera);
  } catch (err) { window.__tickErr = String(err && err.stack || err); }
  requestAnimationFrame(tick);
}
tick();
setInterval(() => { try { if ((window.__frames || 0) === window.__lastFrames) { renderer.render(scene, camera); } window.__lastFrames = window.__frames || 0; } catch (e) {} }, 500);


// ================= TOA XUNG TOI (bi tich Hoa Giai) =================
(function buildConfessional(){
  try {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 });
    const woodD = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.85 });
    const cbox = (w, hh, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
    cbox(7.2, 0.3, 2.6, woodD, 0, 0.15, 0);
    cbox(7.2, 0.3, 2.6, wood, 0, 3.1, 0);
    for (const px of [-3.5, 0, 3.5]) cbox(0.3, 3.1, 2.6, wood, px, 1.6, 0);
    cbox(7.2, 3.1, 0.25, wood, 0, 1.6, -1.2);
    const curM = new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 0.9 });
    for (const px of [-1.75, 1.75]) { const c = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.2, 0.12), curM); c.position.set(px, 1.8, 1.15); g.add(c); }
    cbox(1.2, 1.0, 0.1, woodD, 0, 1.8, 0);
    const goldM = new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0xffd76a, emissiveIntensity: 0.6 });
    const cvv = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.2, 0.25), goldM); cvv.position.set(0, 3.9, 0); g.add(cvv);
    const chh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.25), goldM); chh.position.set(0, 4.05, 0); g.add(chh);
    const lamp = new THREE.PointLight(0xffc06a, 1.2, 10); lamp.position.set(0, 2.6, 2.4); g.add(lamp);
    g.position.set(-13.5, 0, 8.5); g.rotation.y = Math.PI / 2;
    scene.add(g);
    window.__confessBooth = g;
  } catch (e) {}
})();
const CONFESS_POS = { x: -13.5, z: 8.5 };
const CONFESS_SINS_VI = [
  "Bo le Chua Nhat / le trong",
  "Nong gian, cai va voi nguoi than",
  "Noi xau, phan xet nguoi khac",
  "Luoi cau nguyen, xa Chua",
  "Ich ky, khong giup do ai",
  "Bat hieu / hon voi cha me",
  "Gian doi, noi doi",
  "Me dien thoai, bo be bon phan"
];
const CONFESS_SINS_EN = [
  "Missed Sunday / holy day Mass",
  "Anger, quarrels with family",
  "Gossip, judging others",
  "Lazy prayer, distant from God",
  "Selfishness, not helping others",
  "Disobedience to parents",
  "Lying, dishonesty",
  "Phone addiction, neglecting duties"
];
let CONFESS_SINS = (LANG() === 'en' ? CONFESS_SINS_EN : CONFESS_SINS_VI);
window.__confess = window.__confess || { step: 0, sins: [], aves: 0, done: false, first: false };
function renderConfess() {
  const body = document.getElementById("confessBody");
  const next = document.getElementById("confessNext");
  const st = window.__confess;
  if (!body || !next) return;
  if (st.step === 0) {
    body.innerHTML = (LANG()==="en" ? "<div class=\"absol\">God always welcomes you back.<br>Be still a moment, examine yourself, then begin.<br>Nobody sees your answers.</div>" : "<div class=\"absol\">Ch\u00FAa lu\u00F4n cho b\u1EA1n quay v\u1EC1.<br>H\u00E3y thinh l\u1EB7ng m\u1ED9t ch\u00FAt, x\u00E9t l\u1EA1i m\u00ECnh r\u1ED3i b\u1EAFt \u0111\u1EA7u.<br>Kh\u00F4ng ai th\u1EA5y c\u00E2u tr\u1EA3 l\u1EDDi c\u1EE7a b\u1EA1n \u0111\u00E2u.</div>");
    next.textContent = T("confess_start");
  } else if (st.step === 1) {
    let html = (LANG()==="en" ? "<div style=\"margin-bottom:6px;opacity:.85\">Tap what you want to confess:</div>" : "<div style=\"margin-bottom:6px;opacity:.85\">Ch\u1EA1m v\u00E0o nh\u1EEFng \u0111i\u1EC1u b\u1EA1n mu\u1ED1n x\u01B0ng th\u00FA:</div>");
    CONFESS_SINS.forEach((sn, i) => {
      html += "<div class=\"sin" + (st.sins.includes(i) ? " on" : "") + "\" data-i=\"" + i + "\"><span>" + (st.sins.includes(i) ? "[x]" : "[ ]") + "</span><span>" + sn + "</span></div>";
    });
    body.innerHTML = html;
    body.querySelectorAll(".sin").forEach(el => el.onclick = () => {
      const i = +el.dataset.i;
      const k = st.sins.indexOf(i);
      if (k >= 0) st.sins.splice(k, 1); else st.sins.push(i);
      try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
      renderConfess();
    });
    next.textContent = (LANG()==="en" ? "I am truly sorry ->" : "Con th\u1EADt l\u00F2ng \u0103n n\u0103n ->");
  } else if (st.step === 2) {
    body.innerHTML = (LANG()==="en" ? ("<div class=\"absol\">Penance: pray <b>3 Hail Marys</b><br><i>Hail Mary, full of grace...</i><br><br>Prayed: <b>" + st.aves + "/3</b></div>") : ("<div class=\"absol\">Vi\u1EC7c \u0111\u1EC1n t\u1ED9i: \u0111\u1ECDc <b>3 Kinh K\u00EDnh M\u1EEBng</b><br><i>K\u00EDnh m\u1EEBng Maria \u0111\u1EA7y \u01A1n ph\u00FAc...</i><br><br>\u0110\u00E3 \u0111\u1ECDc: <b>" + st.aves + "/3</b></div>"));
    next.textContent = (LANG()==="en" ? (st.aves < 3 ? ("Pray 1 Hail Mary (" + st.aves + "/3)") : "Ask for absolution ->") : (st.aves < 3 ? ("\u0110\u1ECDc 1 Kinh K\u00EDnh M\u1EEBng (" + st.aves + "/3)") : "Xin Cha ban ph\u00E9p x\u00E1 gi\u1EA3i ->"));
  } else {
    body.innerHTML = (LANG()==="en" ? ("<div class=\"absol\"><b>In Jesus' name, you are forgiven.</b><br>Go in peace and sin no more.<br><br>+" + (st.first ? 30 : 5) + " faith</div>") : ("<div class=\"absol\"><b>Cha thay m\u1EB7t Ch\u00FAa tha t\u1ED9i cho con.</b><br>H\u00E3y \u0111i b\u00ECnh an v\u00E0 \u0111\u1EEBng ph\u1EA1m t\u1ED9i n\u1EEFa.<br><br>+" + (st.first ? 30 : 5) + " \u0111\u1EE9c tin</div>"));
    next.textContent = (LANG()==="en" ? "Amen - Close" : "Amen - \u0110\u00F3ng l\u1EA1i");
  }
}
try {
  const __cfb = document.getElementById("confessBtn");
  if (__cfb) __cfb.onclick = (e) => {
    try { e.stopPropagation(); } catch (err) {}
    try { document.getElementById("questPanel").classList.add("hidden"); } catch (err) {}
    try { document.getElementById("boardPanel").classList.add("hidden"); } catch (err) {}
    try { document.getElementById("candlePanel").classList.add("hidden"); } catch (err) {}
    try { document.getElementById("rosaryPanel").classList.add("hidden"); } catch (err) {}
    const p = document.getElementById("confessPanel");
    if (p) {
      const opening = p.classList.contains("hidden");
      p.classList.toggle("hidden");
      if (opening) { window.__confess.step = 0; window.__confess.sins = []; window.__confess.aves = 0; window.__confess.done = false; renderConfess(); }
    }
  };
  const __cfc = document.getElementById("confessClose");
  if (__cfc) __cfc.onclick = () => document.getElementById("confessPanel").classList.add("hidden");
  const __cfn = document.getElementById("confessNext");
  if (__cfn) __cfn.onclick = () => {
    const st = window.__confess;
    if (st.step === 0) { st.step = 1; renderConfess(); }
    else if (st.step === 1) {
      if (!st.sins.length) { toast((LANG()==="en" ? "Please choose at least 1 to confess" : "H\u00E3y ch\u1ECDn \u00EDt nh\u1EA5t 1 \u0111i\u1EC1u \u0111\u1EC3 x\u01B0ng th\u00FA")); return; }
      st.step = 2;
      try { socket.emit("action", { action: "cau-nguyen", text: (LANG()==="en" ? "Repenting" : "An nan") }); } catch (e2) {}
      try { const me = players.get(myId); if (me) me.action = "cau-nguyen"; } catch (e2) {}
      try { showBubble(myId, (LANG()==="en" ? "I am sorry for my sins!" : "Con an nan toi!")); } catch (e2) {}
      renderConfess();
    }
    else if (st.step === 2) {
      if (st.aves < 3) {
        st.aves++;
        try { tone(520 + st.aves * 60, 0, 0.5, "sine", 0.2); tone(780, 0.1, 0.4, "sine", 0.1); } catch (e2) {}
        try { if (navigator.vibrate) navigator.vibrate(20); } catch (e2) {}
        try { showBubble(myId, (LANG()==="en" ? "Hail Mary " : "Kinh Mung ") + st.aves + "/3"); } catch (e2) {}
        if (st.aves >= 3) { try { fanfare(false); } catch (e2) {} toast((LANG()==="en" ? "3 prayers done! Continue for absolution" : "Du 3 kinh! Bam tiep de lanh phep xa giai")); }
        renderConfess();
      } else if (!st.done) {
        st.done = true;
        let last = null;
        try { last = localStorage.getItem("ntho_confess"); } catch (e2) {}
        st.first = (last !== __today());
        try { localStorage.setItem("ntho_confess", __today()); } catch (e2) {}
        try { addFaith(st.first ? 30 : 5, (LANG()==="en" ? (st.first ? "received Reconciliation" : "repented and returned") : (st.first ? "lanh bi tich Hoa Giai" : "an nan tro ve"))); } catch (e2) {}
        try { trackQuest("pray"); } catch (e2) {}
        try { socket.emit("action", { action: "cau-nguyen", text: (LANG()==="en" ? "I am forgiven!" : "Con da duoc tha!") }); } catch (e2) {}
        try { showBubble(myId, (LANG()==="en" ? "I am forgiven!" : "Con da duoc tha!")); } catch (e2) {}
        try { fanfare(true); } catch (e2) {}
        st.step = 3; renderConfess();
      } else { st.step = 3; renderConfess(); }
    }
    else { document.getElementById("confessPanel").classList.add("hidden"); }
  };
} catch (e) {}
window.__confessHinted = window.__confessHinted || {};
setInterval(() => {
  try {
    if (currentZone === "street") return;
    const p = document.getElementById("confessPanel");
    if (p && !p.classList.contains("hidden")) return;
    const me = players.get(myId);
    if (!me) return;
    const d = Math.hypot(me.x - CONFESS_POS.x, me.z - CONFESS_POS.z);
    if (d < 5 && !window.__confessHinted[currentZone]) {
      window.__confessHinted[currentZone] = 1;
      toast((LANG()==="en" ? "Near the Confessional \u2014 tap the purple button to confess" : "L\u1EA1i g\u1EA7n T\u00F2a X\u01B0ng T\u1ED9i, b\u1EA5m n\u00FAt t\u00EDm \u0111\u1EC3 x\u01B0ng t\u1ED9i"));
    }
  } catch (e) {}
}, 2500);

window.__game = { players, meshes, scene, camera, renderer, THREE, get myId(){ return myId; }, get interiorExtra(){ return interiorExtra; }, applyTheme: applyInteriorTheme };







// ---- Mobile polish v22: smooth joystick + perf (giu bong de nhin that) ----
try { const __mob = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || innerWidth < 700; renderer.setPixelRatio(Math.min(devicePixelRatio||1, __mob ? 1.5 : 2)); if (__mob) { try { sun.shadow.mapSize.set(1024,1024); streetSun.shadow.mapSize.set(1024,1024); } catch(e){} } } catch(e){}
