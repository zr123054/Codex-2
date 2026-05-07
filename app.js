const EVENTS = ['标准鱼讯', '疑似鱼讯', '确认中鱼', '疑似中鱼', '挂底', '脱钩', '触底', '断线', '手动刺鱼', '刺鱼中钩', '异常', '其他'];
const EXPORT_DEVICES = ['E00-01', 'E00-02', 'E01-01', 'E03-01'];

const state = {
  view: 'splash',
  activeTab: 'home',
  permissions: { bluetooth: false, storage: false },
  connected: ['E00-01', 'E01-01', 'E03-01', 'E00-02'],
  available: ['E01-02', 'E03-02'],
  currentDevice: 'E00-01',
  scanning: false,
  collecting: false,
  collectSeconds: 0,
  collectTimer: null,
  firmwareProgress: 0,
  firmwareTimer: null,
  exportProgress: 0,
  exportTimer: null,
  exportRunning: false,
  exportDevice: 'E00-02',
  singleSelected: new Set(['E00-01']),
  multiSelected: new Set(['E00-01', 'E00-02', 'E01-01']),
  eventEnabled: Object.fromEntries(EVENTS.map((name) => [name, true])),
  storageSize: '2.35 GB',
  recordBefore: '30',
  recordAfter: '3',
  scanTimeout: '10'
};

const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const toastEl = document.getElementById('toast');
let toastTimer = null;

window.addEventListener('DOMContentLoaded', () => {
  render();
  setTimeout(() => navigate('permission'), 1000);
});

function navigate(view, extra = {}) {
  Object.assign(state, extra);
  clearModal();
  state.view = view;
  state.activeTab = view.startsWith('export') ? 'export' : view.startsWith('settings') || view === 'eventSettings' ? 'settings' : 'home';
  render();
}

function render() {
  document.querySelector('.phone-shell').classList.toggle('is-dark', state.view === 'splash' || state.view === 'home');
  const views = {
    splash, permission, home, firmware, firmwareProgress, firmwareDone, deviceDetail,
    exportHome, exportSingle, exportMulti, exportProgress, exportDone, settings, eventSettings
  };
  app.innerHTML = views[state.view]();
  bindViewEvents();
}

function page(content, options = {}) {
  const cls = ['app-page', options.noTab ? 'no-tab' : '', options.center ? 'center' : '', options.progress ? 'progress-page' : ''].filter(Boolean).join(' ');
  return `<div class="${cls}">${content}</div>${options.tab ? tabbar(options.tab) : ''}`;
}

function topBar(title, backView = 'home', onBack = '') {
  const action = onBack || `data-nav="${backView}"`;
  return `<div class="top-bar"><button class="back-btn" ${action}>返回</button><h1>${title}</h1><span></span></div>`;
}

function tabbar(active) {
  return `<nav class="tabbar">
    <button class="${active === 'home' ? 'active' : ''}" data-nav="home">首页</button>
    <button class="${active === 'export' ? 'active' : ''}" data-nav="exportHome">导出</button>
    <button class="${active === 'settings' ? 'active' : ''}" data-nav="settings">设置</button>
  </nav>`;
}

function splash() {
  return page(`<div class="logo-fe">FE25</div><div class="logo-sub">Test APP</div><div class="version">1.0.0.2</div><div class="boot-text">正在启动...</div>`, { noTab: true, center: true });
}

function permission() {
  const item = (key, title, desc) => `<article class="permission-card card">
    <div><h2>${title}</h2><p>${desc}</p></div>
    <button class="link-btn" data-permission="${key}">${state.permissions[key] ? '已开启' : '去开启'}</button>
  </article>`;
  return page(`<h1 class="permission-title">权限申请</h1><p class="desc text-center">为保障功能正常使用，我们需要以下权限</p>
    ${item('bluetooth', '蓝牙权限', '用于扫描、连接和配对设备')}
    ${item('storage', '存储权限', '用于导出数据和存储相关资源')}
    <button class="primary-btn full" data-action="all-permission">全部开启</button>
    <button class="ghost-btn full" data-nav="home">暂不设置</button>`, { noTab: true });
}

function home() {
  const connectedRows = state.connected.map((d) => deviceRow(d, true)).join('');
  const availableRows = state.available.map((d) => deviceRow(d, false)).join('');
  return page(`<section class="home-hero"><div class="home-row"><div><h1>FE25 Test APP</h1><div class="version-line">1.0.0.2</div><div class="status">已连接</div></div><button class="primary-btn" data-action="scan">${state.scanning ? '扫描中...' : '扫描设备'}</button></div></section>
    <h2 class="list-title">已连接设备（${state.connected.length}）</h2>${connectedRows}
    <h2 class="list-title">可连接设备（${state.available.length}）</h2>${availableRows}`, { tab: 'home' });
}

function deviceRow(device, connected) {
  return `<article class="device-row card" data-device-row="${device}"><strong class="device-name">${device}</strong><div class="row-actions">
    ${connected ? `<button class="row-link" data-upgrade="${device}">升级</button><button class="row-link row-danger" data-disconnect="${device}">断开</button>` : `<button class="row-link" data-connect="${device}">连接</button>`}
  </div></article>`;
}

function firmware() {
  const d = state.currentDevice;
  return page(`${topBar('固件管理')}
    <h2 class="big-device">${d}</h2><div class="status">已连接</div>
    <div class="info-grid mt-16"><div class="info-card card"><small>当前固件版本</small><strong>v1.0.8</strong><span class="badge">可升级</span></div><div class="info-card card"><small>最新版本</small><strong>v1.1.2</strong></div></div>
    <section class="panel card"><h2 class="section-title">固件升级</h2><p>升级将更新设备到最新固件版本，性能优化、功能增强和问题修复。</p><button class="primary-btn full" data-action="confirm-upgrade">开始升级</button></section>
    <section class="panel card"><h2 class="section-title">固件回退</h2><p>将设备回退到上一版本，可能解决兼容性问题。</p><strong>选择回退版本</strong><div class="select-like mt-16">v1.0.7</div><button class="primary-btn full" data-action="confirm-rollback">开始回退</button></section>
    <section class="panel card"><h2 class="section-title">升级说明</h2><ul class="note-list"><li>升级过程中断设备的当前功能，升级后设备将自动重启。</li><li>建议在电量大于50%或连接外部电源时升级。</li></ul></section>`, { noTab: true });
}

function firmwareProgress() {
  return page(`${topBar('固件升级', 'firmware', 'data-action="firmware-back"')}
    <div class="big-device">${state.currentDevice}</div><p><strong>当前版本：</strong>v1.0.8</p><p><strong>目标版本：</strong>v1.1.2</p>
    <div class="progress-wrap"><div class="progress-fill" style="width:${state.firmwareProgress}%"></div></div><div class="percent">${state.firmwareProgress}%</div>
    <h2 class="section-title">正在传输固件...</h2><p class="desc">请保持设备靠近手机，升级过程中不要关闭 APP。</p>`, { noTab: true, progress: true });
}

function firmwareDone() {
  return page(`${topBar('升级完成', 'firmware')}<div class="big-device">${state.currentDevice}</div><h2>${state.currentDevice} 已升级到最新版本</h2><p><strong>当前版本：</strong>v1.1.2</p><button class="primary-btn full" data-nav="firmware">完成</button>`, { noTab: true, progress: true });
}

function deviceDetail() {
  const d = state.currentDevice;
  const run = state.collecting;
  return page(`${topBar(d)}<div class="status status-dot">已连接</div>
    <section class="action-card card"><div class="action-head"><span>设备操作（${run ? 1 : 0}）</span>${run ? `<span class="setting-value">采集时间：${formatTime(state.collectSeconds)}</span>` : ''}</div><div class="button-grid"><button class="${run ? 'success-btn' : 'primary-btn'}" data-action="start-collect" ${run ? 'disabled' : ''}>${run ? '采集中...' : '开始采集'}</button><button class="danger-btn" data-action="stop-collect" ${run ? '' : 'disabled'}>停止采集</button></div></section>
    <section class="action-card card"><h2 class="section-title">事件标记</h2><div class="events-grid">${EVENTS.map((e) => `<button class="event-btn" data-event="${e}">${e}</button>`).join('')}</div></section>
    <section class="action-card card"><h2 class="section-title">实时数据</h2><div class="data-grid">${dataCards(run)}</div></section>`, { noTab: true });
}

function dataCards(run) {
  const rows = [['张力值','2.36','tf'],['卷筒转速','48.6','r/min'],['放绳长度','1280','m'],['放出量','3500','m'],['平均张力','25.6','tf'],['平均放绳速度','138.5','m/min'],['拉力系数','1.35','—'],['温度','6','℃'],['Yaw','72','°'],['运行状态', run ? '运行中' : '待机',''],['工作模式','手动模式','']];
  return rows.map(([k,v,u]) => `<div class="data-card card"><small>${k}</small><strong>${v}<span>${u}</span></strong></div>`).join('');
}

function exportHome() {
  return page(`<h1 class="page-title">数据导出</h1><h2 class="list-title">选择导出方式</h2><p class="desc">请选择导出的设备数据源</p>
    <article class="export-card card" data-nav="exportSingle"><div class="home-row"><div><h2>按设备导出</h2><p class="desc">导出单个设备的所有记录数据</p></div><span class="chevron-text">进入</span></div></article>
    <article class="export-card card" data-nav="exportMulti"><div class="home-row"><div><h2>多设备导出</h2><p class="desc">导出多个设备的合并记录数据</p></div><span class="chevron-text">进入</span></div></article>`, { tab: 'export' });
}

function exportSelect(mode) {
  const isMulti = mode === 'multi';
  const selected = isMulti ? state.multiSelected : state.singleSelected;
  const title = isMulti ? '多设备导出' : '按设备导出';
  return page(`${topBar(title, 'exportHome')}<div class="segment"><button class="${!isMulti ? 'active' : ''}" data-nav="exportSingle">按设备导出</button><button class="${isMulti ? 'active' : ''}" data-nav="exportMulti">多设备导出</button></div>
    <h2 class="list-title">${isMulti ? '选择要导出的设备' : '选择导出设备'}</h2><p class="desc">${isMulti ? '可同时选择多个设备的数据进行导出' : '请选择需要导出的设备（可多选）'}</p>
    ${EXPORT_DEVICES.map((d) => `<article class="select-row card ${selected.has(d) ? 'selected-row' : ''}" data-export-device="${d}" data-mode="${mode}"><strong class="device-name">${d}</strong><span class="selected-label">${selected.has(d) ? '已选' : ''}</span></article>`).join('')}
    <div class="tip-card card"><strong>${isMulti ? '导出数据将保存到综合数据包' : '导出范围受所选设备限制'}</strong><br>${isMulti ? '导出完成后，应用将生成一个包含所有选中设备数据的 FE25 文件夹数据包。' : '开始导出后，应用将仅导出选中设备。导出期间可在传输状态中查看进度。'}</div>
    <button class="primary-btn full" data-action="start-export" ${selected.size ? '' : 'disabled'}>开始导出</button>`, { noTab: true });
}
const exportSingle = () => exportSelect('single');
const exportMulti = () => exportSelect('multi');

function exportProgress() {
  return page(`<h1 class="page-title">数据导出中</h1><div class="percent">${state.exportProgress}%</div><div class="progress-wrap"><div class="progress-fill" style="width:${state.exportProgress}%"></div></div><h2>正在生成数据包...</h2><p class="desc">当前设备：${state.exportDevice}</p><p class="desc">请勿关闭 APP。</p><button class="ghost-btn full" data-action="background-export">后台导出</button>`, { noTab: true, progress: true });
}

function exportDone() {
  return page(`${topBar('导出完成', 'exportHome')}<div class="big-device">FE25数据包</div><h2>数据已成功导出</h2><p><strong>导出文件：</strong>FE25_Export.zip</p><button class="primary-btn full" data-nav="exportHome">完成</button>`, { noTab: true, progress: true });
}

function settings() {
  return page(`<h1 class="page-title">设置</h1>
    <section class="settings-group card"><article class="setting-row" data-nav="eventSettings"><strong>事件标记设置</strong><span class="chevron-text">进入</span></article><article class="setting-row" data-action="record-modal"><strong>记录区间设置</strong><span class="chevron-text">设置</span></article><article class="setting-row" data-action="scan-modal"><strong>蓝牙扫描超时时间</strong><span class="setting-value">${state.scanTimeout} 秒　设置</span></article></section>
    <section class="settings-group card"><article class="setting-row"><strong>数据设置</strong><span class="chevron-text">查看</span></article><article class="setting-row"><strong>当前存储路径</strong><span class="setting-value">内部存储 &gt; FE25Test</span></article><article class="setting-row" data-action="clear-data"><strong>清理本地测试数据</strong><span class="setting-value">${state.storageSize}　清理</span></article></section>
    <section class="settings-group card"><article class="setting-row"><strong>关于</strong><span class="chevron-text">查看</span></article><article class="setting-row"><strong>APP名称</strong><span class="setting-value">FE25 Test APP</span></article><article class="setting-row"><strong>版本号</strong><span class="setting-value">1.0.0.x</span></article></section>`, { tab: 'settings' });
}

function eventSettings() {
  return page(`${topBar('事件标记设置', 'settings')}${EVENTS.map((e) => `<article class="setting-row card"><strong>${e}</strong><button class="switch ${state.eventEnabled[e] ? 'on' : ''}" data-toggle-event="${e}"><span></span></button></article>`).join('')}<div class="sticky-actions"><button class="secondary-btn" data-action="event-default">恢复默认</button><button class="primary-btn" data-action="event-save">保存</button></div>`, { noTab: true });
}

function bindViewEvents() {
  app.querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', (e) => navigate(e.currentTarget.dataset.nav)));
  app.querySelectorAll('[data-permission]').forEach((el) => el.addEventListener('click', () => { state.permissions[el.dataset.permission] = true; render(); }));
  app.querySelectorAll('[data-device-row]').forEach((el) => el.addEventListener('click', (e) => { if (e.target.tagName !== 'BUTTON') navigate('deviceDetail', { currentDevice: el.dataset.deviceRow }); }));
  app.querySelectorAll('[data-upgrade]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); navigate('firmware', { currentDevice: el.dataset.upgrade }); }));
  app.querySelectorAll('[data-connect]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); moveDevice(el.dataset.connect, 'available', 'connected'); showToast(`${el.dataset.connect} 已连接`); }));
  app.querySelectorAll('[data-disconnect]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); confirmDisconnect(el.dataset.disconnect); }));
  app.querySelectorAll('[data-event]').forEach((el) => el.addEventListener('click', () => markEvent(el.dataset.event)));
  app.querySelectorAll('[data-export-device]').forEach((el) => el.addEventListener('click', () => toggleExportDevice(el.dataset.mode, el.dataset.exportDevice)));
  app.querySelectorAll('[data-toggle-event]').forEach((el) => el.addEventListener('click', () => toggleEvent(el.dataset.toggleEvent)));
  app.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', () => handleAction(el.dataset.action)));
}

function handleAction(action) {
  const actions = {
    'all-permission': () => { state.permissions.bluetooth = true; state.permissions.storage = true; navigate('home'); },
    scan: scanDevices,
    'confirm-upgrade': confirmUpgrade,
    'confirm-rollback': confirmRollback,
    'firmware-back': () => showToast('升级过程中不建议退出。'),
    'start-collect': startCollect,
    'stop-collect': confirmStopCollect,
    'start-export': startExport,
    'background-export': () => { navigate('exportHome'); showToast('导出任务已转入后台'); },
    'record-modal': recordModal,
    'scan-modal': scanModal,
    'clear-data': clearDataModal,
    'event-default': () => { EVENTS.forEach((e) => state.eventEnabled[e] = true); render(); },
    'event-save': () => { navigate('settings'); showToast('事件标记设置已保存。'); }
  };
  actions[action]?.();
}

function scanDevices() {
  if (state.scanning) return;
  state.scanning = true; render();
  setTimeout(() => { state.scanning = false; render(); showToast('扫描完成'); }, 1000);
}

function moveDevice(device, from, to) {
  state[from] = state[from].filter((d) => d !== device);
  if (!state[to].includes(device)) state[to].push(device);
  render();
}

function confirmDisconnect(device) {
  showModal('断开设备？', `确认断开 ${device}？断开后可在可连接设备中重新连接。`, [
    ['取消', 'secondary-btn', clearModal],
    ['确认断开', 'danger-btn', () => { clearModal(); moveDevice(device, 'connected', 'available'); showToast(`${device} 已断开`); }]
  ]);
}

function confirmUpgrade() {
  showModal('确认升级固件？', '当前版本为 v1.0.8，目标版本为 v1.1.2。<br>升级过程中将自动重启设备，请确保设备电量充足。', [
    ['取消', 'secondary-btn', clearModal],
    ['开始升级', 'primary-btn', () => { clearModal(); startFirmwareProgress(); }]
  ]);
}

function confirmRollback() {
  showModal('确认回退固件？', '将设备回退到 v1.0.7，可能解决兼容性问题。此处仅做弹窗模拟。', [
    ['取消', 'secondary-btn', clearModal],
    ['开始回退', 'danger-btn', () => { clearModal(); showToast('固件回退已模拟完成'); }]
  ]);
}

function startFirmwareProgress() {
  clearInterval(state.firmwareTimer);
  state.firmwareProgress = 0;
  navigate('firmwareProgress');
  state.firmwareTimer = setInterval(() => {
    state.firmwareProgress = Math.min(100, state.firmwareProgress + 4);
    if (state.view === 'firmwareProgress') render();
    if (state.firmwareProgress >= 100) { clearInterval(state.firmwareTimer); navigate('firmwareDone'); }
  }, 180);
}

function startCollect() {
  state.collecting = true;
  state.collectSeconds = 0;
  clearInterval(state.collectTimer);
  state.collectTimer = setInterval(() => { state.collectSeconds += 1; if (state.view === 'deviceDetail') render(); }, 1000);
  render();
}

function confirmStopCollect() {
  showModal('停止采集？', `停止后将保存当前采集数据。<br>采集设备：${state.currentDevice}<br>采集时长：${formatTime(state.collectSeconds || 756)}`, [
    ['取消', 'secondary-btn', clearModal],
    ['停止并保存', 'danger-btn', () => { clearModal(); stopCollect(); }]
  ]);
}

function stopCollect() {
  state.collecting = false;
  state.collectSeconds = 0;
  clearInterval(state.collectTimer);
  render();
  showToast('采集已停止，数据已保存。');
}

function markEvent(name) {
  if (!state.collecting) { showToast('请先开始采集。'); return; }
  showToast(`已标记：${name}　　时间：${formatTime(state.collectSeconds)}`);
}

function toggleExportDevice(mode, device) {
  const set = mode === 'multi' ? state.multiSelected : state.singleSelected;
  set.has(device) ? set.delete(device) : set.add(device);
  render();
}

function startExport() {
  clearInterval(state.exportTimer);
  state.exportProgress = 0;
  state.exportRunning = true;
  navigate('exportProgress');
  state.exportTimer = setInterval(() => {
    state.exportProgress = Math.min(100, state.exportProgress + 4);
    if (state.view === 'exportProgress') render();
    if (state.exportProgress >= 100) { clearInterval(state.exportTimer); state.exportRunning = false; navigate('exportDone'); }
  }, 160);
}

function toggleEvent(name) {
  const enabledCount = Object.values(state.eventEnabled).filter(Boolean).length;
  if (state.eventEnabled[name] && enabledCount <= 1) { showToast('至少保留一个事件类型开启。'); return; }
  state.eventEnabled[name] = !state.eventEnabled[name];
  render();
}

function recordModal() {
  modalRoot.innerHTML = `<div class="modal-mask"><div class="modal"><h2>记录区间设置</h2>
    <div class="form-row"><label>事件前记录区间</label><div class="input-unit"><input id="before-input" inputmode="numeric" value="${state.recordBefore}"><strong>秒</strong></div><div class="error-text" id="before-error">请输入数字，范围 1–120 秒</div></div>
    <div class="form-row"><label>事件后记录区间</label><div class="input-unit"><input id="after-input" inputmode="numeric" value="${state.recordAfter}"><strong>分钟</strong></div><div class="error-text" id="after-error">请输入数字，范围 1–30 分钟</div></div>
    <div class="modal-actions"><button class="secondary-btn" id="modal-cancel">取消</button><button class="primary-btn" id="record-save">确定</button></div></div></div>`;
  onlyDigits('before-input'); onlyDigits('after-input');
  document.getElementById('modal-cancel').onclick = clearModal;
  document.getElementById('record-save').onclick = () => {
    const before = document.getElementById('before-input').value;
    const after = document.getElementById('after-input').value;
    const ok1 = validateRange(before, 1, 120, 'before-error');
    const ok2 = validateRange(after, 1, 30, 'after-error');
    if (!ok1 || !ok2) return;
    state.recordBefore = before; state.recordAfter = after; clearModal(); showToast('记录区间设置已保存。');
  };
}

function scanModal() {
  showModal('蓝牙扫描超时时间', '当前超时时间为 10 秒。此 Demo 使用固定模拟值，不连接真实蓝牙设备。', [
    ['取消', 'secondary-btn', clearModal],
    ['确定', 'primary-btn', () => { clearModal(); showToast('扫描超时时间已保存。'); }]
  ]);
}

function clearDataModal() {
  if (state.collecting) { showToast('当前存在采集任务，请停止采集后再清理。'); return; }
  showModal('清理本地测试数据？', `当前本地测试数据总量 ${state.storageSize}。<br>清理后数据不可恢复，请确认已完成导出。`, [
    ['取消', 'secondary-btn', clearModal],
    ['确认清理', 'danger-btn', () => { state.storageSize = '0 MB'; clearModal(); render(); showToast('清理完成。'); }]
  ]);
}

function showModal(title, body, actions) {
  modalRoot.innerHTML = `<div class="modal-mask"><div class="modal"><h2>${title}</h2><p>${body}</p><div class="modal-actions">${actions.map(([text, cls], i) => `<button class="${cls}" data-modal-action="${i}">${text}</button>`).join('')}</div></div></div>`;
  modalRoot.querySelectorAll('[data-modal-action]').forEach((btn) => btn.onclick = actions[Number(btn.dataset.modalAction)][2]);
}
function clearModal() { modalRoot.innerHTML = ''; }

function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function onlyDigits(id) {
  const input = document.getElementById(id);
  input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
}

function validateRange(value, min, max, errorId) {
  const el = document.getElementById(errorId);
  const n = Number(value);
  const ok = value !== '' && Number.isInteger(n) && n >= min && n <= max;
  el.textContent = ok ? '' : `输入无效，请填写 ${min}–${max} 范围内的数字。`;
  return ok;
}

function formatTime(total) {
  const h = Math.floor(total / 3600).toString().padStart(2, '0');
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(total % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}
