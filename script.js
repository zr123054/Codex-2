/*
 * 兼容旧入口的兜底脚本。
 * 如果浏览器或静态服务还在返回旧版“硬件产品常用计算与单位换算工具”的 index.html，
 * 旧页面会继续引用 script.js。此文件会把旧 DOM 直接替换成 FE25 Demo 入口，
 * 防止用户因为旧 HTML 缓存而一直看到旧工具页。
 */
(function bootFe25FromLegacyEntry() {
  var hasFe25Shell = document.getElementById('app') && document.querySelector('.phone-shell');
  if (hasFe25Shell) return;

  document.open();
  document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <title>FE25 Test APP 离线 Demo</title>
  <link rel="stylesheet" href="style.css?v=fe25-demo-20260507" />
</head>
<body>
  <main class="demo-stage">
    <section class="phone-shell" aria-label="FE25 Test APP 手机端原型">
      <div class="phone-speaker" aria-hidden="true"></div>
      <div class="status-bar" aria-hidden="true">
        <span>9:41</span>
        <span>信号　WiFi　电量</span>
      </div>
      <div id="app" class="app-screen"></div>
      <div id="modal-root"></div>
      <div id="toast" class="toast" role="status" aria-live="polite"></div>
      <div class="home-indicator" aria-hidden="true"></div>
    </section>
  </main>
  <script src="app.js?v=fe25-demo-20260507"><\/script>
</body>
</html>`);
  document.close();
}());
