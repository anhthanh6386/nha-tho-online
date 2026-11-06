/* i18n VI/EN cho Nha Tho Online - dict + toggle */
(function () {
  var DICT = {
    vi: {
      app_name: "Nhà Thờ Online",
      login_sub: "Vào nhà thờ 3D cùng mọi người — mobile",
      name_ph: "Tên của bạn",
      gx_ph: "Mã giáo xứ (vd TANBINH)",
      ao_xanh: "Xanh", ao_trang: "Trắng", ao_den: "Đen", ao_do: "Đỏ", ao_tim: "Tím",
      join: "Vào Nhà Thờ",
      lang_vi: "🇻🇳 Tiếng Việt", lang_en: "🇺🇸 English",
      zone_street: "Phố Giáo Xứ", zone_c1: "Đức Bà Paris", zone_c2: "Vatican", zone_c3: "Sagrada Familia",
      in_church: "người trong nhà thờ",
      toast_quest: "Bấm NV làm nhiệm vụ ngày, điểm danh nhận ✦",
      choir_singing: "người đang hiệp ca",
      bell_rung: "vừa rung chuông nhà thờ!",
      bell_wait: "Chuông đang nghỉ — chờ",
      sec: "s nữa",
      go_in: "Vào →", go_out: "Ra phố →",
      portal_in: "— vào dự lễ?",
      portal_out: "Ra Phố Giáo Xứ?",
      level: "Lv",
      mass_big: "GIỜ KINH CHUNG 20h", mass_small: "Kinh chung",
      mass_left: "còn", mass_inchurch: "người trong nhà thờ", mass_online: "online",
      bell_title: "Rung chuông nhà thờ",
      mass_join: "Vào dự lễ →", mass_checkin: "Điểm danh dự lễ +",
      mass_checked: "Đã điểm danh", mass_start: "GIỜ KINH CHUNG bắt đầu! Vào nhà thờ dự lễ!",
      mass_start_mini: "Giờ kinh chung bắt đầu!",
      quest_title: "Nhiệm vụ", checkin: "Điểm danh hôm nay", checked_today: "Đã điểm danh hôm nay",
      streak_day: "ngày liên tiếp",
      candle_title: "Tường Nến Nguyện", candle_ph: "Viết ý nguyện cho ngọn nến...",
      candle_btn: "Thắp nến +5✦", no_candle: "Chưa có nến nào. Hãy thắp nến đầu tiên! 🕯️",
      board_title: "BXH Giáo xứ", tab_gx: "Giáo xứ", tab_me: "Cá nhân", tab_mygx: "GX của tôi",
      rosary_title: "Lần Hạt Mân Côi", rosary_next: "Lần 1 hạt",
      confess_title: "Tòa Xưng Tội", confess_start: "Bắt đầu xét mình",
      chat_ph: "Lời nguyện...", send: "Gửi",
      act_pray: "Cầu nguyện", act_hat: "Hát", act_chao: "Chào", act_amen: "Amen",
      move_run: "Chạy", move_jump: "Nhảy",
      tour_1: "Bấm nút Cầu nguyện để quỳ gối — quỳ 20s được +5✦",
      tour_2: "Bấm nút NẾN trên đầu để thắp nến nguyện",
      tour_3: "Bấm NV làm nhiệm vụ ngày + điểm danh",
      tour_4: "Bấm MAP hoặc đi tới cổng ⛪ để vào nhà thờ!"
    },
    en: {
      app_name: "Church Online",
      login_sub: "Enter a 3D church with everyone — mobile",
      name_ph: "Your display name",
      gx_ph: "Parish code (e.g. TANBINH)",
      ao_xanh: "Blue", ao_trang: "White", ao_den: "Black", ao_do: "Red", ao_tim: "Purple",
      join: "Enter the Church",
      lang_vi: "🇻🇳 Tiếng Việt", lang_en: "🇺🇸 English",
      zone_street: "Parish Street", zone_c1: "Notre-Dame Paris", zone_c2: "Vatican", zone_c3: "Sagrada Familia",
      in_church: "people in church",
      toast_quest: "Tap QUESTS for daily tasks, check-in for ✦",
      choir_singing: "people singing in choir",
      bell_rung: "just rang the church bell!",
      bell_wait: "Bell resting — wait",
      sec: "more secs",
      go_in: "Enter →", go_out: "To street →",
      portal_in: "— join Mass?",
      portal_out: "Back to Parish Street?",
      level: "Lv",
      mass_big: "COMMUNITY PRAYER 8PM", mass_small: "Prayer",
      mass_left: "left", mass_inchurch: "people in church", mass_online: "online",
      bell_title: "Ring the church bell",
      mass_join: "Join Mass →", mass_checkin: "Check-in +",
      mass_checked: "Checked in", mass_start: "COMMUNITY PRAYER starts! Enter the church!",
      mass_start_mini: "Community prayer starts!",
      quest_title: "Quests", checkin: "Daily check-in", checked_today: "Checked in today",
      streak_day: "day streak",
      candle_title: "Prayer Candles", candle_ph: "Write your intention...",
      candle_btn: "Light candle +5✦", no_candle: "No candles yet. Light the first one! 🕯️",
      board_title: "Parish Ranking", tab_gx: "Parishes", tab_me: "Individual", tab_mygx: "My parish",
      rosary_title: "Holy Rosary", rosary_next: "Pray 1 bead",
      confess_title: "Confession", confess_start: "Begin examination",
      chat_ph: "Prayer intention...", send: "Send",
      act_pray: "Pray", act_hat: "Sing", act_chao: "Greet", act_amen: "Amen",
      move_run: "Run", move_jump: "Jump",
      tour_1: "Tap Pray to kneel — kneel 20s for +5✦",
      tour_2: "Tap CANDLE button to light a prayer candle",
      tour_3: "Tap QUESTS for daily tasks + check-in",
      tour_4: "Tap MAP or walk to the ⛪ gate to enter!"
    }
  };
  var lang = "vi";
  try { lang = localStorage.getItem("ntho_lang") || "vi"; } catch (e) {}
  if (lang !== "vi" && lang !== "en") lang = "vi";
  function t(k) {
    var d = DICT[lang] || DICT.vi;
    if (d[k] !== undefined) return d[k];
    if ((DICT.vi[k] !== undefined)) return DICT.vi[k];
    return k;
  }
  function setLang(l) {
    if (l !== "vi" && l !== "en") return;
    lang = l;
    try { localStorage.setItem("ntho_lang", l); } catch (e) {}
    try { window.__lang = l; } catch (e) {}
    try { document.documentElement.lang = (l === "vi" ? "vi" : "en"); } catch (e) {}
    applyStatic();
    try { if (window.__reRenderLang) window.__reRenderLang(); } catch (e) {}
  }
  function applyStatic() {
    try {
      document.querySelectorAll("[data-i18n]").forEach(function (el) {
        var k = el.getAttribute("data-i18n");
        el.textContent = t(k);
      });
      document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
        var k = el.getAttribute("data-i18n-ph");
        el.placeholder = t(k);
      });
      document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
        var k = el.getAttribute("data-i18n-title");
        el.title = t(k);
      });
      document.querySelectorAll(".lang-btn").forEach(function (b) {
        b.classList.toggle("sel", b.dataset.lang === lang);
      });
    } catch (e) {}
  }
  window.I18N = DICT;
  window.__lang = lang; // init
  window.t = t;
  window.setLang = setLang;
  window.applyI18nStatic = applyStatic;
  document.addEventListener("DOMContentLoaded", applyStatic);
})();
