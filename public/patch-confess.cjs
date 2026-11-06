const fs = require('fs');

// 1) index.html: title cho nut + panel + bump v89
let h = fs.readFileSync('index.html', 'utf8');
if (!h.includes('confessBtn" title')) {
  h = h.replace('id="confessBtn"', 'id="confessBtn" title="Toa xung toi"');
}
if (!h.includes('confessPanel')) {
  const panel = '<div id="confessPanel" class="hidden"><div id="confessHead">Toa Xung Toi <button id="confessClose">X</button></div><div id="confessBody"></div><div id="confessRow"><button id="confessNext">Bat dau xet minh</button></div></div>';
  h = h.replace('<div id="toast"', panel + '<div id="toast"');
}
h = h.split('?v=88').join('?v=89');
fs.writeFileSync('index.html', h);

// 2) style.css
let s = fs.readFileSync('style.css', 'utf8');
if (!s.includes('#confessPanel')) {
  s += '\n#confessBtn{pointer-events:auto;background:rgba(0,0,0,.5);border:1px solid rgba(232,180,255,.6);color:#fff;width:40px;height:40px;border-radius:50%;font-size:18px;cursor:pointer}\n'
    + '#confessPanel{position:absolute;top:calc(104px + env(safe-area-inset-top));left:10px;right:10px;max-width:340px;background:rgba(14,10,28,.94);border:1px solid #e8b4ff;border-radius:16px;padding:12px 14px;z-index:6;backdrop-filter:blur(8px)}\n'
    + '#confessHead{font-weight:800;color:#e8b4ff;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:15px}\n'
    + '#confessHead button{background:none;border:none;color:#fff;font-size:16px;cursor:pointer}\n'
    + '#confessBody{font-size:13px;line-height:1.55;max-height:300px;overflow:auto;margin-bottom:8px;color:#fff}\n'
    + '#confessBody .sin{display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 10px;margin-bottom:6px;cursor:pointer}\n'
    + '#confessBody .sin.on{border-color:#e8b4ff;background:rgba(232,180,255,.15)}\n'
    + '#confessBody .absol{background:rgba(232,180,255,.12);border:1px solid #e8b4ff;border-radius:12px;padding:10px 12px;text-align:center}\n'
    + '#confessRow{display:flex}\n'
    + '#confessNext{flex:1;background:linear-gradient(135deg,#e8b4ff,#9d6bff);border:none;border-radius:10px;padding:11px;font-weight:800;cursor:pointer;color:#2a1040;font-size:14px}\n';
}
fs.writeFileSync('style.css', s);

// 3) client.js
const C = 'client.js';
let j = fs.readFileSync(C, 'utf8');
if (!j.includes('buildConfessional')) {
  const js = [
    '// ================= TOA XUNG TOI (bi tich Hoa Giai) =================',
    '(function buildConfessional(){',
    '  try {',
    '    const g = new THREE.Group();',
    '    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 });',
    '    const woodD = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.85 });',
    '    const cbox = (w, hh, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };',
    '    cbox(7.2, 0.3, 2.6, woodD, 0, 0.15, 0);',
    '    cbox(7.2, 0.3, 2.6, wood, 0, 3.1, 0);',
    '    for (const px of [-3.5, 0, 3.5]) cbox(0.3, 3.1, 2.6, wood, px, 1.6, 0);',
    '    cbox(7.2, 3.1, 0.25, wood, 0, 1.6, -1.2);',
    '    const curM = new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 0.9 });',
    '    for (const px of [-1.75, 1.75]) { const c = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.2, 0.12), curM); c.position.set(px, 1.8, 1.15); g.add(c); }',
    '    cbox(1.2, 1.0, 0.1, woodD, 0, 1.8, 0);',
    '    const goldM = new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0xffd76a, emissiveIntensity: 0.6 });',
    '    const cvv = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.2, 0.25), goldM); cvv.position.set(0, 3.9, 0); g.add(cvv);',
    '    const chh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.25), goldM); chh.position.set(0, 4.05, 0); g.add(chh);',
    '    const lamp = new THREE.PointLight(0xffc06a, 1.2, 10); lamp.position.set(0, 2.6, 2.4); g.add(lamp);',
    '    g.position.set(-13.5, 0, 8.5); g.rotation.y = Math.PI / 2;',
    '    scene.add(g);',
    '    window.__confessBooth = g;',
    '  } catch (e) {}',
    '})();',
    'const CONFESS_POS = { x: -13.5, z: 8.5 };',
    'const CONFESS_SINS = [',
    '  "Bo le Chua Nhat / le trong",',
    '  "Nong gian, cai va voi nguoi than",',
    '  "Noi xau, phan xet nguoi khac",',
    '  "Luoi cau nguyen, xa Chua",',
    '  "Ich ky, khong giup do ai",',
    '  "Bat hieu / hon voi cha me",',
    '  "Gian doi, noi doi",',
    '  "Me dien thoai, bo be bon phan"',
    '];',
    'window.__confess = window.__confess || { step: 0, sins: [], aves: 0, done: false, first: false };',
    'function renderConfess() {',
    '  const body = document.getElementById("confessBody");',
    '  const next = document.getElementById("confessNext");',
    '  const st = window.__confess;',
    '  if (!body || !next) return;',
    '  if (st.step === 0) {',
    '    body.innerHTML = "<div class=\\"absol\\">Chua luon cho ban quay ve.<br>Hay thinh lang mot chut, xet lai minh roi bat dau.<br>Khong ai thay cau tra loi cua ban dau.</div>";',
    '    next.textContent = "Bat dau xet minh";',
    '  } else if (st.step === 1) {',
    '    let html = "<div style=\\"margin-bottom:6px;opacity:.85\\">Cham vao nhung dieu ban muon xung thu:</div>";',
    '    CONFESS_SINS.forEach((sn, i) => {',
    '      html += "<div class=\\"sin" + (st.sins.includes(i) ? " on" : "") + "\\" data-i=\\"" + i + "\\"><span>" + (st.sins.includes(i) ? "[x]" : "[ ]") + "</span><span>" + sn + "</span></div>";',
    '    });',
    '    body.innerHTML = html;',
    '    body.querySelectorAll(".sin").forEach(el => el.onclick = () => {',
    '      const i = +el.dataset.i;',
    '      const k = st.sins.indexOf(i);',
    '      if (k >= 0) st.sins.splice(k, 1); else st.sins.push(i);',
    '      try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}',
    '      renderConfess();',
    '    });',
    '    next.textContent = "Con that long an nan ->";',
    '  } else if (st.step === 2) {',
    '    body.innerHTML = "<div class=\\"absol\\">Viec den toi: doc <b>3 Kinh Kinh Mung</b><br><i>Kinh mung Maria day on phuc...</i><br><br>Da doc: <b>" + st.aves + "/3</b></div>";',
    '    next.textContent = st.aves < 3 ? "Doc 1 Kinh Kinh Mung (" + st.aves + "/3)" : "Xin Cha ban phep xa giai ->";',
    '  } else {',
    '    body.innerHTML = "<div class=\\"absol\\"><b>Cha thay mat Chua tha toi cho con.</b><br>Hay di binh an va dung pham toi nua.<br><br>+" + (st.first ? 30 : 5) + " duc tin</div>";',
    '    next.textContent = "Amen - Dong lai";',
    '  }',
    '}',
    'try {',
    '  const __cfb = document.getElementById("confessBtn");',
    '  if (__cfb) __cfb.onclick = (e) => {',
    '    try { e.stopPropagation(); } catch (err) {}',
    '    try { document.getElementById("questPanel").classList.add("hidden"); } catch (err) {}',
    '    try { document.getElementById("boardPanel").classList.add("hidden"); } catch (err) {}',
    '    try { document.getElementById("candlePanel").classList.add("hidden"); } catch (err) {}',
    '    try { document.getElementById("rosaryPanel").classList.add("hidden"); } catch (err) {}',
    '    const p = document.getElementById("confessPanel");',
    '    if (p) {',
    '      const opening = p.classList.contains("hidden");',
    '      p.classList.toggle("hidden");',
    '      if (opening) { window.__confess.step = 0; window.__confess.sins = []; window.__confess.aves = 0; window.__confess.done = false; renderConfess(); }',
    '    }',
    '  };',
    '  const __cfc = document.getElementById("confessClose");',
    '  if (__cfc) __cfc.onclick = () => document.getElementById("confessPanel").classList.add("hidden");',
    '  const __cfn = document.getElementById("confessNext");',
    '  if (__cfn) __cfn.onclick = () => {',
    '    const st = window.__confess;',
    '    if (st.step === 0) { st.step = 1; renderConfess(); }',
    '    else if (st.step === 1) {',
    '      if (!st.sins.length) { toast("Hay chon it nhat 1 dieu de xung thu"); return; }',
    '      st.step = 2;',
    '      try { socket.emit("action", { action: "cau-nguyen", text: "An nan" }); } catch (e2) {}',
    '      try { const me = players.get(myId); if (me) me.action = "cau-nguyen"; } catch (e2) {}',
    '      try { showBubble(myId, "Con an nan toi!"); } catch (e2) {}',
    '      renderConfess();',
    '    }',
    '    else if (st.step === 2) {',
    '      if (st.aves < 3) {',
    '        st.aves++;',
    '        try { tone(520 + st.aves * 60, 0, 0.5, "sine", 0.2); tone(780, 0.1, 0.4, "sine", 0.1); } catch (e2) {}',
    '        try { if (navigator.vibrate) navigator.vibrate(20); } catch (e2) {}',
    '        try { showBubble(myId, "Kinh Mung " + st.aves + "/3"); } catch (e2) {}',
    '        if (st.aves >= 3) { try { fanfare(false); } catch (e2) {} toast("Du 3 kinh! Bam tiep de lanh phep xa giai"); }',
    '        renderConfess();',
    '      } else if (!st.done) {',
    '        st.done = true;',
    '        let last = null;',
    '        try { last = localStorage.getItem("ntho_confess"); } catch (e2) {}',
    '        st.first = (last !== __today());',
    '        try { localStorage.setItem("ntho_confess", __today()); } catch (e2) {}',
    '        try { addFaith(st.first ? 30 : 5, st.first ? "lanh bi tich Hoa Giai" : "an nan tro ve"); } catch (e2) {}',
    '        try { trackQuest("pray"); } catch (e2) {}',
    '        try { socket.emit("action", { action: "cau-nguyen", text: "Con da duoc tha!" }); } catch (e2) {}',
    '        try { showBubble(myId, "Con da duoc tha!"); } catch (e2) {}',
    '        try { fanfare(true); } catch (e2) {}',
    '        st.step = 3; renderConfess();',
    '      } else { st.step = 3; renderConfess(); }',
    '    }',
    '    else { document.getElementById("confessPanel").classList.add("hidden"); }',
    '  };',
    '} catch (e) {}',
    'window.__confessHinted = window.__confessHinted || {};',
    'setInterval(() => {',
    '  try {',
    '    if (currentZone === "street") return;',
    '    const p = document.getElementById("confessPanel");',
    '    if (p && !p.classList.contains("hidden")) return;',
    '    const me = players.get(myId);',
    '    if (!me) return;',
    '    const d = Math.hypot(me.x - CONFESS_POS.x, me.z - CONFESS_POS.z);',
    '    if (d < 5 && !window.__confessHinted[currentZone]) {',
    '      window.__confessHinted[currentZone] = 1;',
    '      toast("Lai gan Toa Xung Toi, bam nut tim de xung toi");',
    '    }',
    '  } catch (e) {}',
    '}, 2500);',
    ''
  ].join('\n');
  j = j.replace('window.__game = { players', js + '\nwindow.__game = { players');
}
fs.writeFileSync(C, j);

// 4) sw.js
let w = fs.readFileSync('sw.js', 'utf8');
w = w.split('nhatho-v88').join('nhatho-v89').split('?v=88').join('?v=89');
fs.writeFileSync('sw.js', w);
console.log('confess patch OK');
