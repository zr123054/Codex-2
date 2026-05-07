const state = {
  route: 'splash',
  tab: 'home',
  modal: null,
  selectedDevice: 'E00-01',
  connected: ['E00-01', 'E01-01', 'E03-01', 'E00-02'],
  available: ['E01-02', 'E03-02'],
  collecting: false,
  eventCount: 0,
  lastEvent: '',
  exportMode: 'single',
  selectedExport: ['E00-01'],
  progress: 0,
  progressKind: '',
  progressTimer: null,
  scanTimer: null,
  permissions: { bluetooth: false, storage: false },
  eventEnabled: ['标准鱼讯', '疑似鱼讯', '确认中鱼', '疑似中鱼', '挂底', '脱钩', '触底', '断线', '手动刺鱼', '刺鱼中钩', '异常', '其他']
};

const app = document.querySelector('#app');
const statusBar = document.querySelector('.status-bar');
const devices = ['E00-01', 'E00-02', 'E01-01', 'E03-01'];
const metrics = [
  ['张力值', '2.36', 'tf'], ['卷筒转速', '48.6', 'r/min'], ['放绳长度', '1280', 'm'],
  ['放出量', '3500', 'm'], ['平均张力', '25.6', 'tf'], ['平均放绳速度', '138.5', 'm/min'],
  ['拉力系数', '1.35', '—'], ['温度', '6', '℃'], ['Yaw', '72', '°']
];
const eventNames = ['标准鱼讯', '疑似鱼讯', '确认中鱼', '疑似中鱼', '挂底', '脱钩', '触底', '断线', '手动刺鱼', '刺鱼中钩', '异常', '其他'];

window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-shortcut]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.shortcut));
  });
  navigate('splash');
});

function navigate(route, options = {}) {
  stopProgress();
  window.clearTimeout(state.scanTimer);
  state.route = route;
  state.modal = null;
  if (options.tab) state.tab = options.tab;
  render();

  if (route === 'splash') {
    state.scanTimer = window.setTimeout(() => navigate('permissions'), 5000);
  }
}

function render() {
  const dark = state.route === 'splash' || state.route === 'home';
  statusBar.classList.toggle('light', dark);
  const map = {
    splash: renderSplash,
    permissions: renderPermissions,
    home: renderHome,
    firmware: renderFirmware,
    device: renderDevice,
    export: renderExportHome,
    exportSelect: renderExportSelect,
    settings: renderSettings,
    eventSettings: renderEventSettings,
    progress: renderProgress,
    complete: renderComplete
  };
  app.innerHTML = map[state.route]();
  bindScreenEvents();
  if (state.modal) app.insertAdjacentHTML('beforeend', renderModal());
}

function renderSplash() {
  return `<section class="page splash">
    <div class="logo-fe">FE25</div>
    <div class="logo-sub">Test APP</div>
    <div class="version">1.0.0.2</div>
    <div class="boat" aria-hidden="true"></div>
    <div class="loading-text">正在启动...</div>
  </section>`;
}

function renderPermissions() {
  return `<section class="page permission-page">
    <h1>权限申请</h1>
    <p class="subtle">为保障功能正常使用，我们需要以下权限</p>
    <div class="permission-list">
      ${permissionRow('bluetooth', '蓝牙权限', '用于扫描、连接和配对设备')}
      ${permissionRow('storage', '存储权限', '用于导出数据和存储相关资源')}
    </div>
    <div class="permission-actions">
      <button class="primary-btn" data-action="allow-all">全部开启</button>
      <button class="skip-btn" data-nav="home">暂不设置</button>
    </div>
  </section>`;
}

function permissionRow(key, title, desc) {
  return `<div class="permission-row">
    <div><h3>${title}</h3><div class="subtle">${desc}</div></div>
    <button class="link-btn" data-action="permission" data-key="${key}">${state.permissions[key] ? '已开启' : '去开启'}</button>
  </div>`;
}

function renderHome() {
  return `<section class="page scroll">
    <div class="hero-home">
      <div class="hero-row">
        <div>
          <div class="big-title">FE25 Test APP</div>
          <div class="version">1.0.0.2</div>
          <div class="connected">${state.connected.length ? '已连接' : '未连接'}</div>
        </div>
        <button class="scan-btn" data-action="scan">扫描设备</button>
      </div>
    </div>
    <h3 class="section-title">已连接设备（${state.connected.length}）</h3>
    <div class="list-card">${state.connected.map((d) => deviceRow(d, true)).join('')}</div>
    <h3 class="section-title">可连接设备（${state.available.length}）</h3>
    <div class="list-card">${state.available.map((d) => deviceRow(d, false)).join('')}</div>
    ${renderTabbar('home')}
  </section>`;
}

function deviceRow(name, connected) {
  return `<div class="device-row" data-device-open="${name}">
    <span class="device-name">${name}</span>
    <span class="row-actions">
      ${connected ? `<button class="link-btn" data-nav="firmware" data-device="${name}">升级</button><button class="link-btn" data-action="disconnect" data-device="${name}">断开</button>` : `<button class="link-btn" data-action="connect" data-device="${name}">连接</button>`}
    </span>
  </div>`;
}

function renderFirmware() {
  const d = state.selectedDevice;
  return `<section class="page scroll">
    ${topTitle('固件管理', 'home')}
    <h1 class="big-title">${d}</h1>
    <div class="connected">已连接</div>
    <div class="version-grid ops">
      <div class="card version-card"><span class="subtle">当前固件版本</span><b>v1.0.8 <span class="pill">可升级</span></b></div>
      <div class="card version-card"><span class="subtle">最新版本</span><b>v1.1.2</b></div>
    </div>
    <div class="card">
      <h3>固件升级</h3><p class="subtle">升级将更新设备到最新固件版本，性能优化、功能增强和问题修复。</p>
      <button class="primary-btn" data-action="confirm-upgrade" style="width:100%">开始升级</button>
    </div>
    <div class="card">
      <h3>固件回退</h3><p class="subtle">将设备回退到上一版本，可能解决兼容性问题。</p>
      <label class="subtle">选择回退版本</label>
      <div class="input-box">v1.0.7 <span>⌄</span></div>
      <button class="primary-btn" data-action="confirm-rollback" style="width:100%;margin-top:14px">开始回退</button>
    </div>
    <div class="card"><h3>升级说明</h3><p class="subtle">• 升级过程中断设备的当前功能，升级后设备将自动重启。<br>• 建议电量大于 50% 或连接外部电源时升级。</p></div>
  </section>`;
}

function renderDevice() {
  const disabled = state.collecting ? '' : 'disabled';
  return `<section class="page scroll">
    ${topTitle(state.selectedDevice, 'home')}
    <div class="connected"><span class="dot"></span>已连接</div>
    <div class="card ops">
      <div class="hero-row"><b>设备操作（${state.eventCount}）</b>${state.collecting ? '<span class="subtle">采集时间：00:01:30</span>' : ''}</div>
      <div class="ops-row ops">
        <button class="${state.collecting ? 'green-btn' : 'primary-btn'}" data-action="start-collect">${state.collecting ? '采集中...' : '开始采集'}</button>
        <button class="danger-btn" data-action="stop-collect" ${state.collecting ? '' : 'disabled'}>停止采集</button>
      </div>
    </div>
    <div class="card"><h3>事件标记</h3><div class="event-grid">${eventNames.map((e) => `<button ${disabled} data-action="mark" data-event="${e}">${e}</button>`).join('')}</div></div>
    <div class="card"><h3>实时数据</h3><div class="data-grid">${metrics.map(([a,b,c]) => `<div class="metric"><small>${a}</small><b>${b}</b> <small style="display:inline">${c}</small></div>`).join('')}</div></div>
    <div class="version-grid"><div class="card"><span class="subtle">运行状态</span><h2>${state.collecting ? '运行中' : '待机'}</h2></div><div class="card"><span class="subtle">工作模式</span><h2>手动模式</h2></div></div>
    ${state.lastEvent ? `<div class="toast"><span>已标记：${state.lastEvent}</span><span>时间：00:01:30</span></div>` : ''}
  </section>`;
}

function renderExportHome() {
  return `<section class="page scroll">
    ${topTitle('数据导出')}
    <h2>选择导出方式</h2><p class="subtle">请选择导出的设备数据源</p>
    <div class="ops">
      <div class="export-option selected" data-nav="exportSelect" data-mode="single"><div><h2>按设备导出</h2><p class="subtle">导出单个设备的所有记录数据</p></div><span class="chev">›</span></div>
      <div class="export-option" data-nav="exportSelect" data-mode="multi"><div><h2>多设备导出</h2><p class="subtle">导出多个设备的合并记录数据</p></div><span class="chev">›</span></div>
    </div>
    ${renderTabbar('export')}
  </section>`;
}

function renderExportSelect() {
  const multi = state.exportMode === 'multi';
  return `<section class="page scroll">
    ${topTitle(multi ? '多设备导出' : '按设备导出', 'export')}
    <div class="export-tabs"><button class="${!multi ? 'active' : ''}" data-action="mode" data-mode="single">按设备导出</button><button class="${multi ? 'active' : ''}" data-action="mode" data-mode="multi">多设备导出</button></div>
    <h2>选择${multi ? '要' : ''}导出的设备</h2><p class="subtle">${multi ? '可同时选择多个设备的数据进行导出' : '请选择需要导出的设备（可多选）'}</p>
    <div class="select-list">${devices.map((d) => `<div class="select-row ${state.selectedExport.includes(d) ? 'selected' : ''}" data-action="toggle-export" data-device="${d}"><span>${d}</span><span>${state.selectedExport.includes(d) ? '已选' : ''}</span></div>`).join('')}</div>
    <div class="fixed-bottom"><div class="notice-card"><h3>${multi ? '导出数据将保存到综合数据包' : '导出范围受所选设备限制'}</h3><p>${multi ? '导出完成后，应用将生成一个包含所有选中设备数据的 FE25 文件夹数据包。' : '开始导出后，应用将只导出选中设备。导出期间可在传输状态中查看进度。'}</p></div><button class="primary-btn" data-action="start-export">开始导出</button></div>
  </section>`;
}

function renderSettings() {
  return `<section class="page scroll">
    ${topTitle('设置')}
    <div class="list-card setting-group">
      <div class="setting-row" data-nav="eventSettings"><span>事件标记设置</span><span class="chev">›</span></div>
      <div class="setting-row" data-action="record-dialog"><span>记录区间设置</span><span class="chev">›</span></div>
      <div class="setting-row" data-action="timeout"><span>蓝牙扫描超时时间</span><span><span class="subtle">10 秒</span><span class="chev">›</span></span></div>
    </div>
    <div class="list-card setting-group">
      <div class="setting-row"><span>数据设置</span><span class="chev">›</span></div>
      <div class="setting-row"><span>当前存储路径</span><span class="subtle">内部存储 › FE25Test ›</span></div>
      <div class="setting-row" data-action="clear-dialog"><span>清理本地测试数据</span><span><span class="subtle">2.35 GB</span><span class="chev">›</span></span></div>
    </div>
    <div class="list-card setting-group"><div class="setting-row"><span>关于</span><span class="chev">›</span></div><div class="setting-row"><span>APP名称</span><span class="subtle">FE25 Test APP ›</span></div><div class="setting-row"><span>版本号</span><span class="subtle">1.0.0.x ›</span></div></div>
    ${renderTabbar('settings')}
  </section>`;
}

function renderEventSettings() {
  return `<section class="page scroll">
    ${topTitle('事件标记设置', 'settings')}
    <div class="list-card">${eventNames.map((e) => `<div class="setting-row"><span>${e}</span><button class="switch" data-action="toggle-event" data-event="${e}" aria-label="切换${e}"></button></div>`).join('')}</div>
    <div class="settings-actions"><button class="ghost-btn" data-action="reset-events">恢复默认</button><button class="primary-btn" data-nav="settings">保存</button></div>
  </section>`;
}

function renderProgress() {
  const isExport = state.progressKind === 'export';
  return `<section class="page progress-page">
    ${isExport ? topTitle('数据导出中') : topTitle(state.progressKind === 'rollback' ? '固件回退' : '固件升级')}
    <div class="progress-title">${isExport ? '' : state.selectedDevice}</div>
    ${!isExport ? '<p class="subtle">当前版本： v1.0.8<br>目标版本： v1.1.2</p>' : ''}
    <div class="progress-track"><div class="progress-bar" style="width:${state.progress}%"></div></div>
    <div class="progress-percent">${Math.round(state.progress)}%</div>
    <h2>${isExport ? '正在生成数据包...' : '正在传输固件...'}</h2>
    <p class="subtle">${isExport ? `当前设备： ${state.selectedExport.at(-1) || 'E00-01'}<br>请勿关闭 APP。` : '请保持设备靠近手机，升级过程中不要关闭 APP。'}</p>
    ${isExport ? '<button class="skip-btn" data-nav="export">后台导出</button>' : ''}
  </section>`;
}

function renderComplete() {
  const isExport = state.progressKind === 'export';
  return `<section class="page complete-page">
    ${topTitle(isExport ? '导出完成' : '升级完成', isExport ? 'export' : 'firmware')}
    <h1>${isExport ? '数据包已生成' : state.selectedDevice}</h1>
    <h2>${isExport ? '已完成所选设备数据导出' : `${state.selectedDevice} 已升级到最新版本`}</h2>
    <p class="subtle">${isExport ? `设备数量：${state.selectedExport.length}` : '当前版本： v1.1.2'}</p>
    <button class="primary-btn" data-nav="${isExport ? 'export' : 'home'}">完成</button>
  </section>`;
}

function topTitle(title, back) {
  return `<div class="top-title">${back ? `<button class="back-btn" data-nav="${back}">‹ 返回</button>` : ''}<h2>${title}</h2></div>`;
}

function renderTabbar(active) {
  return `<nav class="tabbar"><button class="${active === 'home' ? 'active' : ''}" data-nav="home">首页</button><button class="${active === 'export' ? 'active' : ''}" data-nav="export">导出</button><button class="${active === 'settings' ? 'active' : ''}" data-nav="settings">设置</button></nav>`;
}

function renderModal() {
  const modals = {
    upgrade: ['确认升级固件？', '当前版本为 v1.0.8，目标版本为 v1.1.2。<br>升级过程中将自动重启设备，请确保设备电量充足。', '开始升级', 'upgrade'],
    rollback: ['确认回退固件？', '将设备回退到 v1.0.7，回退过程中请勿关闭 APP。', '开始回退', 'rollback'],
    stop: ['停止采集？', `停止后将保存当前采集数据。<br><br>采集设备：${state.selectedDevice}<br>采集时长：00:12:36`, '停止并保存', 'stop'],
    record: ['记录区间设置', '', '确定', 'record'],
    clear: ['清理本地测试数据？', '当前本地测试数据总量 2.35 GB。<br>清理后数据不可恢复，请确认已完成导出。', '确认清理', 'clear']
  };
  const [title, body, ok, action] = modals[state.modal];
  const content = action === 'record' ? `<div class="form-row"><label>事件前记录区间</label><div class="input-box"><input value="30"><span>秒</span></div><p class="subtle">请输入数字，范围 1–120 秒</p></div><div class="form-row"><label>事件后记录区间</label><div class="input-box"><input value="3"><span>分钟</span></div><p class="subtle">请输入数字，范围 1–30 分钟</p></div>` : `<p class="subtle">${body}</p>`;
  return `<div class="modal-backdrop"><div class="modal"><h2>${title}</h2>${content}<div class="modal-actions"><button class="ghost-btn" data-action="close-modal">取消</button><button class="${action === 'stop' || action === 'clear' ? 'danger-btn' : 'primary-btn'}" data-action="modal-ok" data-kind="${action}">${ok}</button></div></div></div>`;
}

function bindScreenEvents() {
  app.querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', (event) => {
    event.stopPropagation();
    const route = el.dataset.nav;
    if (el.dataset.device) state.selectedDevice = el.dataset.device;
    if (el.dataset.mode) {
      state.exportMode = el.dataset.mode;
      state.selectedExport = el.dataset.mode === 'single' ? [state.selectedExport[0] || 'E00-01'] : ['E00-01', 'E00-02', 'E01-01'];
    }
    navigate(route);
  }));

  app.querySelectorAll('[data-device-open]').forEach((row) => row.addEventListener('click', () => {
    state.selectedDevice = row.dataset.deviceOpen;
    navigate('device');
  }));

  app.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', (event) => {
    event.stopPropagation();
    handleAction(el.dataset.action, el.dataset);
  }));
}

function handleAction(action, data) {
  if (action === 'allow-all') {
    state.permissions.bluetooth = true; state.permissions.storage = true; navigate('home');
  } else if (action === 'permission') {
    state.permissions[data.key] = true; render();
  } else if (action === 'scan') {
    const next = `E0${Math.floor(Math.random() * 4)}-0${Math.floor(Math.random() * 8) + 3}`;
    if (!state.available.includes(next)) state.available.push(next);
    render();
  } else if (action === 'connect') {
    state.available = state.available.filter((d) => d !== data.device); state.connected.push(data.device); render();
  } else if (action === 'disconnect') {
    state.connected = state.connected.filter((d) => d !== data.device); state.available.push(data.device); render();
  } else if (action === 'confirm-upgrade') showModal('upgrade');
  else if (action === 'confirm-rollback') showModal('rollback');
  else if (action === 'start-collect') { state.collecting = true; state.lastEvent = ''; render(); }
  else if (action === 'stop-collect') showModal('stop');
  else if (action === 'mark') { state.eventCount += 1; state.lastEvent = data.event; render(); }
  else if (action === 'mode') { state.exportMode = data.mode; state.selectedExport = data.mode === 'multi' ? ['E00-01', 'E00-02', 'E01-01'] : [state.selectedExport[0] || 'E00-01']; render(); }
  else if (action === 'toggle-export') toggleExport(data.device);
  else if (action === 'start-export') startProgress('export');
  else if (action === 'record-dialog') showModal('record');
  else if (action === 'clear-dialog') showModal('clear');
  else if (action === 'timeout') alert('蓝牙扫描超时时间已设置为 10 秒，可在原生 APP 中调整。');
  else if (action === 'toggle-event') { toggleEvent(data.event); render(); }
  else if (action === 'reset-events') { state.eventEnabled = [...eventNames]; render(); }
  else if (action === 'close-modal') { state.modal = null; render(); }
  else if (action === 'modal-ok') handleModalOk(data.kind);
}

function showModal(name) { state.modal = name; render(); }

function handleModalOk(kind) {
  state.modal = null;
  if (kind === 'upgrade' || kind === 'rollback') startProgress(kind);
  else if (kind === 'stop') { state.collecting = false; state.lastEvent = ''; render(); }
  else render();
}

function toggleExport(device) {
  if (state.exportMode === 'single') state.selectedExport = [device];
  else if (state.selectedExport.includes(device)) state.selectedExport = state.selectedExport.filter((d) => d !== device);
  else state.selectedExport.push(device);
  if (!state.selectedExport.length) state.selectedExport = [device];
  render();
}

function toggleEvent(eventName) {
  if (state.eventEnabled.includes(eventName)) state.eventEnabled = state.eventEnabled.filter((e) => e !== eventName);
  else state.eventEnabled.push(eventName);
}

function startProgress(kind) {
  stopProgress();
  state.progressKind = kind;
  state.progress = 0;
  state.route = 'progress';
  render();
  const start = performance.now();
  state.progressTimer = window.setInterval(() => {
    state.progress = Math.min(100, ((performance.now() - start) / 5000) * 100);
    render();
    if (state.progress >= 100) {
      stopProgress();
      state.route = 'complete';
      render();
    }
  }, 80);
}

function stopProgress() {
  if (state.progressTimer) window.clearInterval(state.progressTimer);
  state.progressTimer = null;
}
