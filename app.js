const EVENTS = ['标准鱼讯', '疑似鱼讯', '确认中鱼', '疑似中鱼', '挂底', '脱钩', '触底', '断线', '手动刺鱼', '刺鱼中钩', '异常', '其他'];
const EXPORT_DEVICES = ['E00-01', 'E00-02', 'E01-01', 'E03-01'];
const EXPORT_FILES = {
  'E00-01': [
    { id: 'E0001-1', name: '2026-05-08_09-18-32_标准鱼讯.csv', size: '18.6 MB' },
    { id: 'E0001-2', name: '2026-05-08_09-42-15_确认中鱼.csv', size: '24.3 MB' },
    { id: 'E0001-3', name: '2026-05-08_10-06-28_脱钩.csv', size: '12.8 MB' },
    { id: 'E0001-4', name: '2026-05-08_10-27-51_异常.csv', size: '9.7 MB' }
  ],
  'E00-02': [
    { id: 'E0002-1', name: '2026-05-08_08-55-02_疑似鱼讯.csv', size: '16.1 MB' },
    { id: 'E0002-2', name: '2026-05-08_09-31-40_触底.csv', size: '14.4 MB' },
    { id: 'E0002-3', name: '2026-05-08_10-12-09_挂底.csv', size: '21.5 MB' }
  ],
  'E01-01': [
    { id: 'E0101-1', name: '2026-05-07_16-18-21_手动刺鱼.csv', size: '11.2 MB' },
    { id: 'E0101-2', name: '2026-05-07_16-39-44_刺鱼中钩.csv', size: '19.8 MB' },
    { id: 'E0101-3', name: '2026-05-07_17-05-12_其他.csv', size: '8.5 MB' }
  ],
  'E03-01': [
    { id: 'E0301-1', name: '2026-05-06_14-02-35_疑似中鱼.csv', size: '13.6 MB' },
    { id: 'E0301-2', name: '2026-05-06_14-26-18_断线.csv', size: '10.9 MB' },
    { id: 'E0301-3', name: '2026-05-06_15-14-33_确认中鱼.csv', size: '27.1 MB' }
  ]
};

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
  currentFirmwareVersion: 'v1.0.8',
  latestFirmwareVersion: 'v1.1.2',
  firmwareSourceVersion: 'v1.0.8',
  exportProgress: 0,
  exportTimer: null,
  exportRunning: false,
  currentExportDevice: 'E00-01',
  selectedFiles: new Set(),
  lastExportCount: 0,
  eventEnabled: Object.fromEntries(EVENTS.map((name) => [name, true])),
  storageSize: '2.35 GB',
  storagePath: '内部存储 > FE25Test',
  recordBefore: '30',
  recordAfter: '3',
  selectedFirmwareVersion: 'v1.1.2',
  markHistory: []
};

const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const toastEl = document.getElementById('toast');
let toastTimer = null;

function hasBluetoothPermission() {
  return state.permissions.bluetooth;
}

function hasStoragePermission() {
  return state.permissions.storage;
}

function hasAllPermissions() {
  return hasBluetoothPermission() && hasStoragePermission();
}

function grantPermission(permission) {
  state.permissions[permission] = true;
  if (hasAllPermissions()) {
    navigate('home');
    return;
  }
  render();
}

function disabledAttr(condition) {
  return condition ? 'disabled aria-disabled="true"' : '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function compareVersion(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function firmwareActionText() {
  const target = state.selectedFirmwareVersion;
  if (compareVersion(target, state.currentFirmwareVersion) > 0) return `升级为 ${target} 版本`;
  if (compareVersion(target, state.currentFirmwareVersion) < 0) return `回退为 ${target} 版本`;
  return '当前版本，无需操作';
}

function firmwareActionType() {
  return compareVersion(state.selectedFirmwareVersion, state.currentFirmwareVersion) >= 0 ? 'upgrade' : 'rollback';
}


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
    exportHome, exportSingle, exportFiles, exportProgress, exportDone, settings, eventSettings
  };
  app.innerHTML = views[state.view]();
  bindViewEvents();
}

function page(content, options = {}) {
  const cls = ['app-page', options.noTab ? 'no-tab' : '', options.center ? 'center' : '', options.progress ? 'progress-page' : '', options.scroll ? 'scroll-page' : ''].filter(Boolean).join(' ');
  return `<div class="${cls}">${content}</div>${options.tab ? tabbar(options.tab) : ''}`;
}

function topBar(title, backView = 'home', onBack = '') {
  const action = onBack || `data-nav="${backView}"`;
  return `<div class="top-bar"><button class="back-btn" ${action}>返回</button><h1>${title}</h1><span></span></div>`;
}

function tabbar(active) {
  return `<nav class="tabbar">
    <button class="${active === 'home' ? 'active' : ''}" data-nav="home">首页</button>
    <button class="${active === 'export' ? 'active' : ''}" data-nav="exportSingle">导出</button>
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
  const bluetoothDisabled = !hasBluetoothPermission();
  const connectedRows = state.connected.map((d) => deviceRow(d, true)).join('');
  const availableRows = state.available.map((d) => deviceRow(d, false)).join('');
  return page(`<section class="home-hero"><div class="home-row"><div><h1>FE25 Test APP</h1><div class="version-line">1.0.0.2</div></div><button class="primary-btn" data-action="scan" ${disabledAttr(bluetoothDisabled)}>${state.scanning ? '扫描中...' : '扫描设备'}</button></div></section>
    ${bluetoothDisabled ? '<div class="permission-tip card">蓝牙权限未开启，扫描、连接、断开和设备操作暂不可用。</div>' : ''}
    <h2 class="list-title">已连接设备（${state.connected.length}）</h2>${connectedRows}
    <h2 class="list-title">可连接设备（${state.available.length}）</h2>${availableRows}`, { tab: 'home' });
}

function deviceRow(device, connected) {
  const bluetoothDisabled = !hasBluetoothPermission();
  const detailAttr = connected && !bluetoothDisabled ? `data-device-row="${device}"` : '';
  const disabledClass = bluetoothDisabled ? 'disabled-card' : '';
  return `<article class="device-row card ${disabledClass}" ${detailAttr}><strong class="device-name">${device}</strong><div class="row-actions">
    ${connected ? `<button class="row-link" data-upgrade="${device}" ${disabledAttr(bluetoothDisabled)}>升级</button><button class="row-link row-danger" data-disconnect="${device}" ${disabledAttr(bluetoothDisabled)}>断开</button>` : `<button class="row-link" data-connect="${device}" ${disabledAttr(bluetoothDisabled)}>连接</button>`}
  </div></article>`;
}

function firmware() {
  const d = state.currentDevice;
  const actionType = firmwareActionType();
  const actionText = firmwareActionText();
  return page(`${topBar('固件管理')}
    <h2 class="big-device">${d}</h2><div class="status">已连接</div>
    <div class="info-grid mt-16"><div class="info-card card"><small>当前固件版本</small><strong>${state.currentFirmwareVersion}</strong>${compareVersion(state.latestFirmwareVersion, state.currentFirmwareVersion) > 0 ? '<span class="badge">可升级</span>' : ''}</div><div class="info-card card"><small>最新版本</small><strong>${state.latestFirmwareVersion}</strong></div></div>
    <section class="panel card"><h2 class="section-title">目标固件版本</h2><p>请选择需要切换的固件版本。高于当前版本时执行升级，低于当前版本时执行回退。</p><label class="select-label" for="firmware-version">选择目标版本</label><select id="firmware-version" class="select-like mt-16"><option value="v1.1.2" ${state.selectedFirmwareVersion === 'v1.1.2' ? 'selected' : ''}>v1.1.2（最新版本）</option><option value="v1.1.0" ${state.selectedFirmwareVersion === 'v1.1.0' ? 'selected' : ''}>v1.1.0</option><option value="v1.0.8" ${state.selectedFirmwareVersion === 'v1.0.8' ? 'selected' : ''}>v1.0.8</option><option value="v1.0.7" ${state.selectedFirmwareVersion === 'v1.0.7' ? 'selected' : ''}>v1.0.7</option><option value="v1.0.6" ${state.selectedFirmwareVersion === 'v1.0.6' ? 'selected' : ''}>v1.0.6</option></select><button class="${actionType === 'rollback' ? 'danger-btn' : 'primary-btn'} full" data-action="confirm-firmware-change" ${disabledAttr(state.selectedFirmwareVersion === state.currentFirmwareVersion)}>${actionText}</button></section>
    <section class="panel card"><h2 class="section-title">升级说明</h2><ul class="note-list"><li>升级或回退过程中会中断设备当前功能，完成后设备将自动重启。</li><li>建议在电量大于50%或连接外部电源时操作。</li></ul></section>`, { noTab: true, scroll: true });
}

function firmwareProgress() {
  return page(`${topBar('固件升级', 'firmware', 'data-action="firmware-back"')}
    <div class="big-device">${state.currentDevice}</div><p><strong>当前版本：</strong>${state.firmwareSourceVersion}</p><p><strong>目标版本：</strong>${state.selectedFirmwareVersion}</p>
    <div class="progress-wrap"><div class="progress-fill" style="width:${state.firmwareProgress}%"></div></div><div class="percent">${state.firmwareProgress}%</div>
    <h2 class="section-title">正在传输固件...</h2><p class="desc">请保持设备靠近手机，升级过程中不要关闭 APP。</p>`, { noTab: true, progress: true });
}

function firmwareDone() {
  return page(`${topBar('操作完成', 'firmware')}<div class="big-device">${state.currentDevice}</div><h2>${state.currentDevice} 已切换到目标版本</h2><p><strong>当前版本：</strong>${state.selectedFirmwareVersion}</p><button class="primary-btn full" data-nav="firmware">完成</button>`, { noTab: true, progress: true });
}

function deviceDetail() {
  const d = state.currentDevice;
  const run = state.collecting;
  const bluetoothDisabled = !hasBluetoothPermission();
  return page(`${topBar(d)}<div class="status status-dot">已连接</div>
    ${bluetoothDisabled ? '<div class="permission-tip card">蓝牙权限未开启，数据采集和事件标记暂不可用。</div>' : ''}
    <section class="action-card card ${bluetoothDisabled ? 'disabled-card' : ''}"><div class="action-head"><span>设备操作（${run ? 1 : 0}）</span>${run ? `<span class="setting-value">采集时间：${formatTime(state.collectSeconds)}</span>` : ''}</div><div class="button-grid"><button class="${run ? 'success-btn' : 'primary-btn'}" data-action="start-collect" ${disabledAttr(run || bluetoothDisabled)}>${run ? '采集中...' : '开始采集'}</button><button class="danger-btn" data-action="stop-collect" ${disabledAttr(!run || bluetoothDisabled)}>停止采集</button></div></section>
    <section class="action-card card ${bluetoothDisabled ? 'disabled-card' : ''}"><h2 class="section-title">事件标记</h2><div class="events-grid">${EVENTS.map((e) => e === '其他' ? `<button class="event-btn delete-mark-btn" data-action="delete-last-mark" ${disabledAttr(bluetoothDisabled || !run || !state.markHistory.length)}>删除上一次标记</button>` : `<button class="event-btn" data-event="${e}" ${disabledAttr(bluetoothDisabled)}>${e}</button>`).join('')}</div></section>
    <section class="action-card card"><h2 class="section-title">实时数据</h2><div class="data-grid">${dataCards(run)}</div></section>`, { noTab: true });
}

function dataCards(run) {
  const rows = [['张力值','2.36','tf'],['卷筒转速','48.6','r/min'],['放绳长度','1280','m'],['放出量','3500','m'],['平均张力','25.6','tf'],['平均放绳速度','138.5','m/min'],['拉力系数','1.35','—'],['温度','6','℃'],['Yaw','72','°'],['运行状态', run ? '运行中' : '待机',''],['工作模式','手动模式','']];
  return rows.map(([k,v,u]) => `<div class="data-card card"><small>${k}</small><strong>${v}<span>${u}</span></strong></div>`).join('');
}

function exportHome() {
  return exportSingle(true);
}

function exportSingle(asRoot = false) {
  const storageDisabled = !hasStoragePermission();
  const header = asRoot ? '<h1 class="page-title">数据导出</h1>' : topBar('按设备导出', 'home');
  return page(`${header}
    ${storageDisabled ? '<div class="permission-tip card">存储权限未开启，无法进入设备文件夹。</div>' : ''}
    <h2 class="list-title">选择导出设备</h2><p class="desc">请选择需要查看存储文件夹的设备</p>
    ${EXPORT_DEVICES.map((d) => `<article class="select-row card clickable-row ${storageDisabled ? 'disabled-card' : ''}" ${storageDisabled ? '' : `data-open-folder="${d}"`}><strong class="device-name">${d}</strong><span class="chevron-only" aria-hidden="true"></span></article>`).join('')}
    <div class="tip-card card"><strong>设备存储文件夹</strong><br>进入设备后可查看全部采集数据文件，并支持多选导出或多选删除。</div>`, { noTab: !asRoot, tab: asRoot ? 'export' : '', scroll: true });
}

function exportFiles() {
  const device = state.currentExportDevice;
  const files = EXPORT_FILES[device] || [];
  const selectedCount = state.selectedFiles.size;
  return page(`${topBar(`${device} 文件夹`, 'exportSingle')}
    <h2 class="list-title">采集数据文件</h2><p class="desc">文件名包含采集时间与标记事件类型，可多选导出或删除。</p>
    <div class="folder-summary card"><strong>${device}</strong><span>${files.length} 个文件</span></div>
    <div class="file-list">${files.map((file) => `<label class="file-row card ${state.selectedFiles.has(file.id) ? 'selected-row' : ''}"><input type="checkbox" data-file-id="${file.id}" ${state.selectedFiles.has(file.id) ? 'checked' : ''}><span class="file-meta"><strong>${file.name}</strong><small>${file.size}</small></span></label>`).join('')}</div>
    <div class="sticky-actions three-actions"><button class="secondary-btn" data-action="select-all-files" ${files.length ? '' : 'disabled'}>${selectedCount === files.length && files.length ? '取消全选' : '全选'}</button><button class="primary-btn" data-action="start-export" ${selectedCount ? '' : 'disabled'}>导出 ${selectedCount || ''}</button><button class="danger-btn" data-action="delete-files" ${selectedCount ? '' : 'disabled'}>删除</button></div>`, { noTab: true, scroll: true });
}

function exportProgress() {
  return page(`<h1 class="page-title">数据导出中</h1><div class="percent">${state.exportProgress}%</div><div class="progress-wrap"><div class="progress-fill" style="width:${state.exportProgress}%"></div></div><h2>正在生成数据包...</h2><p class="desc">导出文件：${state.lastExportCount || state.selectedFiles.size} 个</p><p class="desc">请勿关闭 APP。</p><button class="ghost-btn full" data-action="background-export">后台导出</button>`, { noTab: true, progress: true });
}

function exportDone() {
  return page(`${topBar('导出完成', 'exportFiles')}<div class="big-device">FE25数据包</div><h2>数据已成功导出</h2><p><strong>导出文件：</strong>FE25_${state.currentExportDevice}_Export.zip</p><section class="panel card share-panel"><h2 class="section-title">分享导出文件</h2><div class="share-grid"><button class="secondary-btn" data-share="微信">微信</button><button class="secondary-btn" data-share="飞书">飞书</button><button class="secondary-btn" data-share="钉钉">钉钉</button><button class="secondary-btn" data-share="邮箱">邮箱</button></div></section><button class="primary-btn full" data-nav="exportSingle">完成</button>`, { noTab: true, progress: true });
}

function settings() {
  const storageDisabled = !hasStoragePermission();
  return page(`<h1 class="page-title">设置</h1>
    <section class="settings-group card"><article class="setting-row clickable-row" data-nav="eventSettings"><strong>事件标记设置</strong><span class="chevron-only"></span></article><article class="setting-row clickable-row" data-action="record-modal"><strong>记录区间设置</strong><span class="chevron-only"></span></article></section>
    <section class="settings-group card"><article class="setting-row clickable-row ${storageDisabled ? 'disabled-card' : ''}" ${storageDisabled ? '' : 'data-action="storage-modal"'}><strong>当前存储路径</strong><span class="value-with-chevron"><span class="setting-value">${escapeHtml(state.storagePath)}</span>${storageDisabled ? '' : '<span class="chevron-only" aria-hidden="true"></span>'}</span></article><article class="setting-row clickable-row ${storageDisabled ? 'disabled-card' : ''}" ${storageDisabled ? '' : 'data-action="clear-data"'}><strong>清理缓存</strong><span class="setting-value danger-text">${state.storageSize}</span></article></section>
    <section class="settings-group card"><article class="setting-row static-row"><strong>关于</strong><span></span></article><article class="setting-row"><strong>APP名称</strong><span class="setting-value">FE25 Test APP</span></article><article class="setting-row"><strong>版本号</strong><span class="setting-value">1.0.0.x</span></article></section>`, { tab: 'settings' });
}

function eventSettings() {
  return page(`${topBar('事件标记设置', 'settings')}${EVENTS.map((e) => `<article class="setting-row card"><strong>${e}</strong><button class="switch ${state.eventEnabled[e] ? 'on' : ''}" data-toggle-event="${e}"><span></span></button></article>`).join('')}<div class="sticky-actions"><button class="secondary-btn" data-action="event-default">恢复默认</button><button class="primary-btn" data-action="event-save">保存</button></div>`, { noTab: true });
}

function bindViewEvents() {
  app.querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', (e) => navigate(e.currentTarget.dataset.nav)));
  app.querySelectorAll('[data-permission]').forEach((el) => el.addEventListener('click', () => grantPermission(el.dataset.permission)));
  app.querySelectorAll('[data-device-row]').forEach((el) => el.addEventListener('click', (e) => { if (e.target.tagName !== 'BUTTON') navigate('deviceDetail', { currentDevice: el.dataset.deviceRow }); }));
  app.querySelectorAll('[data-upgrade]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); navigate('firmware', { currentDevice: el.dataset.upgrade }); }));
  app.querySelectorAll('[data-connect]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); moveDevice(el.dataset.connect, 'available', 'connected'); showToast(`${el.dataset.connect} 已连接`); }));
  app.querySelectorAll('[data-disconnect]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); confirmDisconnect(el.dataset.disconnect); }));
  app.querySelectorAll('[data-event]').forEach((el) => el.addEventListener('click', () => markEvent(el.dataset.event)));
  app.querySelectorAll('[data-open-folder]').forEach((el) => el.addEventListener('click', () => openDeviceFolder(el.dataset.openFolder)));
  app.querySelectorAll('[data-file-id]').forEach((el) => el.addEventListener('change', () => toggleFileSelection(el.dataset.fileId)));
  app.querySelectorAll('[data-share]').forEach((el) => el.addEventListener('click', () => shareExport(el.dataset.share)));
  app.querySelectorAll('[data-toggle-event]').forEach((el) => el.addEventListener('click', () => toggleEvent(el.dataset.toggleEvent)));
  const firmwareSelect = app.querySelector('#firmware-version');
  if (firmwareSelect) {
    firmwareSelect.addEventListener('change', (event) => { state.selectedFirmwareVersion = event.target.value; render(); });
  }
  app.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', () => handleAction(el.dataset.action)));
}

function handleAction(action) {
  const actions = {
    'all-permission': () => { state.permissions.bluetooth = true; state.permissions.storage = true; navigate('home'); },
    scan: scanDevices,
    'confirm-firmware-change': confirmFirmwareChange,
    'firmware-back': () => showToast('升级过程中不建议退出。'),
    'start-collect': startCollect,
    'stop-collect': confirmStopCollect,
    'start-export': startExport,
    'select-all-files': toggleSelectAllFiles,
    'delete-files': confirmDeleteFiles,
    'delete-last-mark': deleteLastMark,
    'background-export': () => { navigate('exportSingle'); showToast('导出任务已转入后台'); },
    'record-modal': recordModal,
    'storage-modal': storagePathModal,
    'clear-data': clearDataModal,
    'event-default': () => { EVENTS.forEach((e) => state.eventEnabled[e] = true); render(); },
    'event-save': () => { navigate('settings'); showToast('事件标记设置已保存。'); }
  };
  actions[action]?.();
}

function scanDevices() {
  if (!hasBluetoothPermission()) { showToast('请先开启蓝牙权限。'); return; }
  if (state.scanning) return;
  state.scanning = true; render();
  setTimeout(() => { state.scanning = false; render(); showToast('扫描完成'); }, 1000);
}

function moveDevice(device, from, to) {
  if (!hasBluetoothPermission()) { showToast('请先开启蓝牙权限。'); return; }
  state[from] = state[from].filter((d) => d !== device);
  if (!state[to].includes(device)) state[to].push(device);
  render();
}

function confirmDisconnect(device) {
  if (!hasBluetoothPermission()) { showToast('请先开启蓝牙权限。'); return; }
  showModal('断开设备？', `确认断开 ${device}？断开后可在可连接设备中重新连接。`, [
    ['取消', 'secondary-btn', clearModal],
    ['确认断开', 'danger-btn', () => { clearModal(); moveDevice(device, 'connected', 'available'); showToast(`${device} 已断开`); }]
  ]);
}

function confirmFirmwareChange() {
  if (!hasBluetoothPermission()) { showToast('请先开启蓝牙权限。'); return; }
  const target = state.selectedFirmwareVersion;
  const isRollback = compareVersion(target, state.currentFirmwareVersion) < 0;
  const title = isRollback ? '确认回退固件？' : '确认升级固件？';
  const body = isRollback
    ? `当前版本为 ${state.currentFirmwareVersion}，目标版本为 ${target}。<br>回退可能解决兼容性问题，过程中设备将自动重启。`
    : `当前版本为 ${state.currentFirmwareVersion}，目标版本为 ${target}。<br>升级过程中将自动重启设备，请确保设备电量充足。`;
  showModal(title, body, [
    ['取消', 'secondary-btn', clearModal],
    [firmwareActionText(), isRollback ? 'danger-btn' : 'primary-btn', () => { clearModal(); startFirmwareProgress(); }]
  ]);
}

function startFirmwareProgress() {
  clearInterval(state.firmwareTimer);
  state.firmwareSourceVersion = state.currentFirmwareVersion;
  state.firmwareProgress = 0;
  navigate('firmwareProgress');
  state.firmwareTimer = setInterval(() => {
    state.firmwareProgress = Math.min(100, state.firmwareProgress + 4);
    if (state.view === 'firmwareProgress') render();
    if (state.firmwareProgress >= 100) { clearInterval(state.firmwareTimer); state.currentFirmwareVersion = state.selectedFirmwareVersion; navigate('firmwareDone'); }
  }, 180);
}

function startCollect() {
  if (!hasBluetoothPermission()) { showToast('请先开启蓝牙权限。'); return; }
  state.collecting = true;
  state.collectSeconds = 0;
  state.markHistory = [];
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
  const time = formatTime(state.collectSeconds);
  state.markHistory.push({ name, time });
  if (state.view === 'deviceDetail') render();
  showToast(`已标记：${name}　　时间：${time}`);
}

function deleteLastMark() {
  if (!state.collecting) { showToast('请先开始采集。'); return; }
  if (!state.markHistory.length) { showToast('暂无可删除的标记事件。'); return; }
  const removed = state.markHistory.pop();
  if (state.view === 'deviceDetail') render();
  showToast(`已删除上一次标记：${removed.name}　　时间：${removed.time}`);
}

function openDeviceFolder(device) {
  if (!hasStoragePermission()) { showToast('请先开启存储权限。'); return; }
  state.currentExportDevice = device;
  state.selectedFiles = new Set();
  navigate('exportFiles');
}

function toggleFileSelection(fileId) {
  state.selectedFiles.has(fileId) ? state.selectedFiles.delete(fileId) : state.selectedFiles.add(fileId);
  render();
}

function toggleSelectAllFiles() {
  const files = EXPORT_FILES[state.currentExportDevice] || [];
  if (state.selectedFiles.size === files.length) {
    state.selectedFiles = new Set();
  } else {
    state.selectedFiles = new Set(files.map((file) => file.id));
  }
  render();
}

function confirmDeleteFiles() {
  const count = state.selectedFiles.size;
  if (!count) { showToast('请先选择文件。'); return; }
  showModal('删除选中文件？', `将删除 ${count} 个采集数据文件，此操作仅为 Demo 模拟。`, [
    ['取消', 'secondary-btn', clearModal],
    ['确认删除', 'danger-btn', () => { clearModal(); deleteSelectedFiles(); }]
  ]);
}

function deleteSelectedFiles() {
  const files = EXPORT_FILES[state.currentExportDevice] || [];
  EXPORT_FILES[state.currentExportDevice] = files.filter((file) => !state.selectedFiles.has(file.id));
  const count = state.selectedFiles.size;
  state.selectedFiles = new Set();
  render();
  showToast(`已删除 ${count} 个文件。`);
}

function shareExport(channel) {
  showToast(`已模拟分享到${channel}。`);
}

function startExport() {
  if (!hasStoragePermission()) { showToast('请先开启存储权限。'); return; }
  if (!state.selectedFiles.size) { showToast('请先选择需要导出的文件。'); return; }
  state.lastExportCount = state.selectedFiles.size;
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


function storagePathModal() {
  if (!hasStoragePermission()) { showToast('请先开启存储权限。'); return; }
  const paths = ['内部存储 > FE25Test', '内部存储 > Download > FE25Test', '外部存储 > FE25Test'];
  const current = state.storagePath;
  modalRoot.innerHTML = `<div class="modal-mask"><div class="modal"><h2>调整存储位置</h2>
    <p>请选择或输入采集数据文件的保存位置。</p>
    <div class="path-options">${paths.map((path) => `<label class="path-option"><input type="radio" name="storage-path" value="${escapeHtml(path)}" ${path === current ? 'checked' : ''}><span>${escapeHtml(path)}</span></label>`).join('')}</div>
    <div class="form-row"><label>自定义路径</label><div class="input-unit"><input id="custom-path-input" value="${paths.includes(current) ? '' : escapeHtml(current)}" placeholder="例如：内部存储 > FE25Data"></div><div class="error-text" id="path-error"></div></div>
    <div class="modal-actions"><button class="secondary-btn" id="modal-cancel">取消</button><button class="primary-btn" id="path-save">确定</button></div></div></div>`;
  document.getElementById('modal-cancel').onclick = clearModal;
  document.getElementById('path-save').onclick = () => {
    const custom = document.getElementById('custom-path-input').value.trim();
    const selected = modalRoot.querySelector('input[name="storage-path"]:checked');
    const nextPath = custom || selected?.value || '';
    const error = document.getElementById('path-error');
    if (!nextPath) { error.textContent = '请选择或输入存储路径。'; return; }
    state.storagePath = nextPath;
    clearModal();
    render();
    showToast('存储位置已更新。');
  };
}

function clearDataModal() {
  if (!hasStoragePermission()) { showToast('请先开启存储权限。'); return; }
  if (state.collecting) { showToast('当前存在采集任务，请停止采集后再清理。'); return; }
  showModal('清理缓存？', `当前缓存数据总量 ${state.storageSize}。<br>清理后缓存不可恢复，请确认已完成导出。`, [
    ['取消', 'secondary-btn', clearModal],
    ['确认清理', 'danger-btn', () => { state.storageSize = '0 MB'; clearModal(); render(); showToast('缓存清理完成。'); }]
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
