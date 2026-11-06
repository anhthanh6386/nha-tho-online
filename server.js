import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const http = createServer(app);
const io = new Server(http, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));
const ZONES = ['street', 'church-1', 'church-2', 'church-3'];
const SPAWNS = {
  'street': { x: 100, z: 22, ry: Math.PI },
  'church-1': { x: 2, z: 14, ry: Math.PI },
  'church-2': { x: 2, z: 14, ry: Math.PI },
  'church-3': { x: 2, z: 14, ry: Math.PI },
};
const players = new Map();
// --- Giao xu + BXH (khong can dang nhap): uid may + ma giao xu tu nguyen ---
const parishStats = new Map(); // code -> { code, name, total, members:Set }
const uidFaith = new Map(); // uid -> { name, faith, gx, updated }
// --- Tuong Nen Nguyen + persist file (restart khong mat BXH) ---
import fs from 'fs';
const DATA_FILE = path.join(__dirname, 'data.json');
let candles = []; // { name, text, gx, ts }
function saveData() {
  try {
    const obj = {
      users: [...uidFaith.entries()].slice(-500),
      parishes: [...parishStats.entries()].map(([k, v]) => [k, { code: v.code, name: v.name, total: v.total, members: [...v.members].slice(0, 200) }]),
      candles: candles.slice(-60),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj), 'utf8');
  } catch (e) {}
}
function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const obj = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (obj.users) for (const [k, v] of obj.users) uidFaith.set(k, v);
    if (obj.parishes) for (const [k, v] of obj.parishes) parishStats.set(k, { ...v, members: new Set(v.members || []) });
    if (obj.candles) candles = obj.candles.slice(-60);
  } catch (e) {}
}
loadData();
setInterval(saveData, 30000);
// Loc tu tuc + chong spam chat
const BAD = ['dm', 'dm ', 'dcm', 'vcl', 'lol ', 'dmm', 'cc ', 'fuck', 'shit', 'cứt', 'địt', 'lồn', 'cặc'];
function cleanText(s) {
  let t = String(s || '').slice(0, 60);
  const low = t.toLowerCase();
  for (const w of BAD) if (low.includes(w)) t = t.replace(new RegExp(w, 'gi'), '***');
  return t;
}
const lastChat = new Map(); // socket.id -> ts
// --- Gio kinh chung 20h: su kien cong dong moi ngay + mini kinh test ---
let mass = { active: false, endsAt: 0, kind: '', startedAt: 0 };
let lastMiniMass = 0;
function nextMassIn() {
  const d = new Date();
  const t = new Date(d);
  t.setHours(20, 0, 0, 0);
  if (d >= t) t.setDate(t.getDate() + 1);
  // neu dang trong khung 20:00-20:10 thi = 0
  if (d.getHours() === 20 && d.getMinutes() < 10) return 0;
  return t - d;
}
function massSnapshot() {
  const now = Date.now();
  const left = mass.active ? Math.max(0, mass.endsAt - now) : 0;
  let inChurch = 0;
  try { for (const p of players.values()) if (p.zone !== 'street') inChurch++; } catch (e) {}
  return { active: mass.active, kind: mass.kind, left, nextIn: nextMassIn(), inChurch, online: players.size };
}
function startMass(kind, mins) {
  const now = Date.now();
  mass = { active: true, endsAt: now + mins * 60 * 1000, kind, startedAt: now, litStep: -1 };
  try { io.emit('mass', massSnapshot()); } catch (e) {}
  try { broadcastLit(true); } catch (e) {}
}
function stopMass() {
  mass = { active: false, endsAt: 0, kind: '', startedAt: 0, litStep: -1 };
  try { io.emit('mass', massSnapshot()); } catch (e) {}
  try { io.emit('lit-end', {}); } catch (e) {}
}
function broadcastLit(force) {
  if (!mass.active) return;
  const lit = currentLit();
  if (!lit) return;
  if (!force && lit.step === mass.litStep) return;
  mass.litStep = lit.step;
  try { io.emit('lit', { step: lit.step, priest: lit.priest, options: lit.options, priest_en: lit.priest_en, options_en: lit.options_en, left: lit.left }); } catch (e) {}
}
setInterval(() => {
  try {
    const d = new Date();
    const now = Date.now();
    if (mass.active && now >= mass.endsAt) { stopMass(); return; }
    // Su kien lon 20:00-20:10 moi ngay, tu dong mo 10 phut
    if (!mass.active && d.getHours() === 20 && d.getMinutes() < 10) startMass('big', 10);
    if (mass.active) broadcastLit(false);
  } catch (e) {}
}, 2000);
setInterval(() => { try { io.emit('mass', massSnapshot()); } catch (e) {} }, 10000);
// --- Phung vu doi dap: cha xuong cau, cong doan dap lai (VI + EN) ---
const LITURGY = [
  { p: "Chúa ở cùng anh chị em.", a: "Và ở cùng cha.", w: ["Amen.", "Tạ ơn Chúa.", "Vinh danh Chúa."] },
  { p: "Xin Thiên Chúa toàn năng thương xót, tha tội cho chúng ta.", a: "Amen.", w: ["Và ở cùng cha.", "Tạ ơn Chúa.", "Alleluia."] },
  { p: "Lạy Chúa, xin thương xót chúng con.", a: "Xin Chúa thương xót chúng con.", w: ["Amen.", "Vinh danh Chúa.", "Tạ ơn Chúa."] },
  { p: "Vinh danh Thiên Chúa trên các tầng trời.", a: "Và bình an dưới thế cho người thiện tâm.", w: ["Amen.", "Alleluia.", "Xin vâng."] },
  { p: "Đó là Lời Chúa.", a: "Tạ ơn Chúa.", w: ["Amen.", "Vinh danh Chúa.", "Alleluia."] },
  { p: "Hãy nâng tâm hồn lên.", a: "Chúng con đang hướng về Chúa.", w: ["Amen.", "Xin vâng.", "Tạ ơn Chúa."] },
  { p: "Anh chị em hãy cầu nguyện để hy lễ của tôi cũng là của anh chị em.", a: "Xin Chúa nhận hy lễ bởi tay cha.", w: ["Amen.", "Tạ ơn Chúa.", "Alleluia."] },
  { p: "Lễ xong, chúc anh chị em đi bình an.", a: "Tạ ơn Chúa.", w: ["Amen.", "Vinh danh Chúa.", "Xin vâng."] },
];
const LITURGY_EN = [
  { p: "The Lord be with you.", a: "And with your spirit.", w: ["Amen.", "Thanks be to God.", "Glory to God."] },
  { p: "May almighty God have mercy on us and forgive us our sins.", a: "Amen.", w: ["And with your spirit.", "Thanks be to God.", "Alleluia."] },
  { p: "Lord, have mercy.", a: "Lord, have mercy.", w: ["Amen.", "Glory to God.", "Thanks be to God."] },
  { p: "Glory to God in the highest.", a: "And on earth peace to people of good will.", w: ["Amen.", "Alleluia.", "Yes, Lord."] },
  { p: "The Gospel of the Lord.", a: "Praise to you, Lord Jesus Christ.", w: ["Amen.", "Glory to God.", "Alleluia."] },
  { p: "Lift up your hearts.", a: "We lift them up to the Lord.", w: ["Amen.", "Yes, Lord.", "Thanks be to God."] },
  { p: "Pray that my sacrifice and yours may be acceptable to God.", a: "May the Lord accept the sacrifice at your hands.", w: ["Amen.", "Thanks be to God.", "Alleluia."] },
  { p: "The Mass is ended, go in peace.", a: "Thanks be to God.", w: ["Amen.", "Glory to God.", "Yes, Lord."] },
];
const LIT_STEP_MS = 25000;
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = (Number(seed) || 1) >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function currentLit() {
  if (!mass.active) return null;
  const el = Date.now() - mass.startedAt;
  const step = Math.floor(el / LIT_STEP_MS);
  const idx = step % LITURGY.length;
  const base = LITURGY[idx];
  const baseEn = LITURGY_EN[idx % LITURGY_EN.length];
  return { step, idx, priest: base.p, options: seededShuffle([base.a, ...base.w], mass.startedAt + step), priest_en: baseEn.p, a_en: baseEn.a, options_en: seededShuffle([baseEn.a, ...baseEn.w], mass.startedAt + step + 999), left: LIT_STEP_MS - (el % LIT_STEP_MS) };
}
function normGx(s) {
  const v = String(s || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  return v || 'CHUNG';
}
function parishName(code) {
  if (code === 'CHUNG') return 'Giáo xứ Chung';
  return 'GX ' + code;
}
function zonePlayers(zone){ return [...players.values()].filter(p => p.zone === zone); }
function boardSnapshot() {
  const parishes = [...parishStats.values()]
    .map(s => ({ code: s.code, name: s.name, total: s.total, members: s.members.size }))
    .sort((a, b) => b.total - a.total).slice(0, 20);
  const tops = [...uidFaith.values()].sort((a, b) => b.faith - a.faith).slice(0, 20)
    .map(u => ({ name: u.name, faith: u.faith, gx: u.gx }));
  const byParish = {};
  for (const u of uidFaith.values()) {
    if (!byParish[u.gx]) byParish[u.gx] = [];
    byParish[u.gx].push({ name: u.name, faith: u.faith });
  }
  for (const k of Object.keys(byParish)) byParish[k] = byParish[k].sort((a, b) => b.faith - a.faith).slice(0, 10);
  return { parishes, tops, byParish, online: players.size };
}
io.on('connection', (socket) => {
  socket.on('join', ({ name, ao, uid, gx, faith }) => {
    let rawName = String(name || '').trim();
    rawName = rawName.replace(/^undefined/i, '').trim();
    const clean = (rawName || 'Con Chien').slice(0, 20);
    const code = normGx(gx);
    const idm = String(uid || socket.id).slice(0, 48);
    const sp = SPAWNS['street'];
    const p = { id: socket.id, uid: idm, gx: code, faith: Math.max(0, Number(faith) || 0), name: clean, ao: ao || 'xanh', zone: 'street', x: sp.x + Math.random()*4-2, z: sp.z + Math.random()*3, y: 0, vy: 0, ry: sp.ry, action: 'idle' };
    players.set(socket.id, p);
    // Gop duc tin theo may (uid) + theo giao xu — khong can dang nhap
    const prev = uidFaith.get(idm);
    const best = Math.max(p.faith, prev ? prev.faith : 0);
    uidFaith.set(idm, { name: clean, faith: best, gx: code, updated: Date.now() });
    p.faith = best;
    if (!parishStats.has(code)) parishStats.set(code, { code, name: parishName(code), total: 0, members: new Set() });
    // Tinh lai tong giao xu nay (don gian, it nguoi nen duyet het duoc)
    let tot = 0, mem = new Set();
    for (const u of uidFaith.values()) if (u.gx === code) { tot += u.faith; mem.add(u.name); }
    parishStats.set(code, { code, name: parishName(code), total: tot, members: mem });
    socket.join('street');
    socket.emit('init', { id: socket.id, zone: 'street', players: zonePlayers('street'), gx: code, boards: boardSnapshot(), mass: massSnapshot(), candles: candles.slice(-60).reverse() });
    socket.to('street').emit('player-join', p);
    try { io.emit('boards', boardSnapshot()); } catch (e) {}
  });
  // Client bao duc tin moi khi len ✦ — de tinh BXH chung
  socket.on('report-faith', ({ faith }) => {
    const p = players.get(socket.id);
    if (!p || !p.uid) return;
    const f = Math.max(0, Number(faith) || 0);
    const cur = uidFaith.get(p.uid);
    if (cur && f <= cur.faith) return;
    uidFaith.set(p.uid, { name: p.name, faith: f, gx: p.gx, updated: Date.now() });
    p.faith = f;
    let tot = 0, mem = new Set();
    for (const u of uidFaith.values()) if (u.gx === p.gx) { tot += u.faith; mem.add(u.name); }
    parishStats.set(p.gx, { code: p.gx, name: parishName(p.gx), total: tot, members: mem });
    try { io.emit('boards', boardSnapshot()); } catch (e) {}
    try { io.emit('player-faith', { id: socket.id, faith: f }); } catch (e) {}
  });
  socket.on('get-boards', () => {
    try { socket.emit('boards', boardSnapshot()); } catch (e) {}
  });
  socket.on('switch-zone', ({ zone }) => {
    const p = players.get(socket.id);
    if (!p || !ZONES.includes(zone) || p.zone === zone) return;
    const old = p.zone;
    const sp = SPAWNS[zone];
    socket.leave(old);
    socket.to(old).emit('player-leave', socket.id);
    p.zone = zone;
    p.x = sp.x + Math.random()*2-1; p.z = sp.z + Math.random()*2; p.y = 0; p.vy = 0; p.ry = sp.ry; p.action = 'idle';
    socket.join(zone);
    socket.emit('zone-changed', { zone, x: p.x, z: p.z, ry: p.ry, players: zonePlayers(zone) });
    socket.to(zone).emit('player-join', p);
  });
  socket.on('move', ({ x, z, y, ry }) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.x = x; p.z = z; if (typeof y === 'number') p.y = y; p.ry = ry;
    socket.to(p.zone).emit('player-move', { id: socket.id, x, z, y: p.y || 0, ry });
  });
  socket.on('action', ({ action, text }) => {
    const p = players.get(socket.id);
    if (!p) return;
    // Chong spam: chat/action toi da 1 lan / 800ms
    const now = Date.now();
    if (action === 'chat') {
      const last = lastChat.get(socket.id) || 0;
      if (now - last < 800) return;
      lastChat.set(socket.id, now);
    }
    p.action = action;
    const safe = cleanText(text);
    io.to(p.zone).emit('player-action', { id: socket.id, action, text: safe });
    // Cau nguyen giu nguyen (khong tu dung day sau 4s nhu cu) — chi cac hanh dong khac moi tu nha
    // Hat giu 8s de kip hiep ca doan; cac hanh dong khac 4s
    const holdMs = action === 'hat' ? 8000 : 4000;
    if (action !== 'cau-nguyen') setTimeout(() => { if (players.get(socket.id) && players.get(socket.id).action === action) players.get(socket.id).action = 'idle'; }, holdMs);
    // Ca doan: >=2 nguoi cung hat trong 1 zone -> bao ca zone hiep ca
    if (action === 'hat') {
      try {
        const singers = [...players.values()].filter(q => q.zone === p.zone && (q.action === 'hat' || q.id === socket.id)).length;
        if (singers >= 2) io.to(p.zone).emit('choir', { count: singers, by: p.name });
      } catch (e2) {}
    }
  });
  // --- Rung chuong nha tho: ca zone nghe thay, cooldown 8s/nguoi ---
  socket.on('ring-bell', () => {
    try {
      const p = players.get(socket.id);
      if (!p) return;
      const now = Date.now();
      const last = lastChat.get(socket.id + ':bell') || 0;
      if (now - last < 8000) { socket.emit('bell-denied', { wait: 8000 - (now - last) }); return; }
      lastChat.set(socket.id + ':bell', now);
      io.to(p.zone).emit('bell', { by: p.name, id: socket.id, zone: p.zone });
    } catch (e) {}
  });
  // --- Gio kinh chung: lay trang thai + mo kinh thu (mini 3 phut) + diem danh du le ---
  socket.on('get-mass', () => {
    try {
      socket.emit('mass', massSnapshot());
      const lit = currentLit();
      if (lit) socket.emit('lit', { step: lit.step, priest: lit.priest, options: lit.options, priest_en: lit.priest_en, options_en: lit.options_en, left: lit.left });
    } catch (e) {}
  });
  socket.on('start-mini-mass', () => {
    try {
      const now = Date.now();
      if (mass.active) return;
      if (now - lastMiniMass < 5 * 60 * 1000) { socket.emit('mass-denied', { wait: 5 * 60 * 1000 - (now - lastMiniMass) }); return; }
      lastMiniMass = now;
      startMass('mini', 3);
    } catch (e) {}
  });
  socket.on('mass-checkin', () => {
    try {
      const p = players.get(socket.id);
      if (!p || !mass.active) return;
      if (p.zone === 'street') return; // phai vao nha tho moi duoc
      const key = socket.id + ':mass:' + mass.startedAt;
      if (lastChat.get(key)) return;
      lastChat.set(key, 1);
      const cur = uidFaith.get(p.uid);
      const nf = (cur ? cur.faith : 0) + (mass.kind === 'big' ? 30 : 15);
      uidFaith.set(p.uid, { name: p.name, faith: nf, gx: p.gx, updated: Date.now() });
      p.faith = nf;
      let tot = 0, mem = new Set();
      for (const u of uidFaith.values()) if (u.gx === p.gx) { tot += u.faith; mem.add(u.name); }
      parishStats.set(p.gx, { code: p.gx, name: parishName(p.gx), total: tot, members: mem });
      socket.emit('mass-reward', { faith: nf, bonus: mass.kind === 'big' ? 30 : 15 });
      io.emit('boards', boardSnapshot());
      try { io.emit('player-faith', { id: socket.id, faith: nf }); } catch (e) {}
    } catch (e) {}
  });
  socket.on('get-candles', () => {
    try { socket.emit('candles', candles.slice(-60).reverse()); } catch (e) {}
  });
  // --- Dap loi phung vu: dung +6✦ / sai +1✦, chi 1 lan moi cau ---
  socket.on('lit-answer', ({ step, text }) => {
    try {
      const p = players.get(socket.id);
      if (!p || !mass.active) return;
      if (p.zone === 'street') return;
      const lit = currentLit();
      if (!lit || lit.step !== Number(step)) return;
      const key = socket.id + ':lit:' + mass.startedAt + ':' + lit.step;
      if (lastChat.get(key)) return;
      lastChat.set(key, 1);
      const base = LITURGY[lit.idx];
      const baseEn = LITURGY_EN[lit.idx % LITURGY_EN.length];
      const txt = String(text || '').trim();
      const ok = txt === base.a || txt === baseEn.a;
      const gain = ok ? 6 : 1;
      const cur = uidFaith.get(p.uid);
      const nf = (cur ? cur.faith : 0) + gain;
      uidFaith.set(p.uid, { name: p.name, faith: nf, gx: p.gx, updated: Date.now() });
      p.faith = nf;
      let tot = 0, mem = new Set();
      for (const u of uidFaith.values()) if (u.gx === p.gx) { tot += u.faith; mem.add(u.name); }
      parishStats.set(p.gx, { code: p.gx, name: parishName(p.gx), total: tot, members: mem });
      socket.emit('lit-result', { step: lit.step, ok, gain, faith: nf });
      io.emit('boards', boardSnapshot());
      try { io.emit('player-faith', { id: socket.id, faith: nf }); } catch (e2) {}
      try { io.to(p.zone).emit('player-action', { id: socket.id, action: 'amen', text: String(text || '').slice(0, 60) }); } catch (e2) {}
    } catch (e) {}
  });
  socket.on('light-candle', ({ text }) => {
    const p = players.get(socket.id);
    if (!p) return;
    const now = Date.now();
    const last = lastChat.get(socket.id + ':candle') || 0;
    if (now - last < 5000) return; // chong spam nen
    lastChat.set(socket.id + ':candle', now);
    const safe = cleanText(text).slice(0, 50) || 'Xin bình an';
    candles.push({ name: p.name, text: safe, gx: p.gx, ts: now });
    if (candles.length > 60) candles = candles.slice(-60);
    saveData();
    io.emit('candles', candles.slice(-60).reverse());
    // Thuong nguoi thap: cong truc tiep vao faith server de BXH len ngay
    try {
      const cur = uidFaith.get(p.uid);
      const nf = (cur ? cur.faith : 0) + 5;
      uidFaith.set(p.uid, { name: p.name, faith: nf, gx: p.gx, updated: now });
      p.faith = nf;
      let tot = 0, mem = new Set();
      for (const u of uidFaith.values()) if (u.gx === p.gx) { tot += u.faith; mem.add(u.name); }
      parishStats.set(p.gx, { code: p.gx, name: parishName(p.gx), total: tot, members: mem });
      io.emit('boards', boardSnapshot());
      try { io.emit('player-faith', { id: socket.id, faith: nf }); } catch (e) {}
    } catch (e) {}
  });
  socket.on('disconnect', () => {
    const p = players.get(socket.id);
    if (p) socket.to(p.zone).emit('player-leave', socket.id);
    players.delete(socket.id);
    lastChat.delete(socket.id);
  });
});
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Nha Tho Online ECO: http://localhost:${PORT}`));