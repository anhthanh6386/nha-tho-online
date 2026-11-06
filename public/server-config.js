// Cấu hình địa chỉ server multiplayer.
// - Web / iPhone Safari (mở qua http://<ip-may-chu>:3000): để rỗng -> tự dùng cùng origin.
// - APK Capacitor (chạy từ https://localhost, không có server cùng origin): trỏ về IP LAN máy chủ.
(function () {
  var LAN = "http://192.168.1.166:3000";
  var isCap = false;
  try {
    isCap = (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
      location.protocol === "capacitor:";
  } catch (e) {}
  if (!window.GAME_SERVER) window.GAME_SERVER = isCap ? LAN : "";
})();
