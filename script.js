const G = 9.81;
const THEME_KEY = 'hardware-tool-theme-v1';
const THEME_COLOR_KEY = 'hardware-tool-theme-color-v1';
const ACCENT_COLOR_KEY = 'hardware-tool-accent-color-v1';
let draggedModuleButton = null;
const autoFillSuppressedFields = new Set();
let branchNodeSeed = 1;
let branchNodes = [];
let branchFontSize = 18;
let branchFontColor = '#1f2937';
let branchHistory = [];
let branchFuture = [];
let watchMenuStack = [];

const themeColorPresets = {
  blue: { primary: '#3b82f6', strong: '#2563eb' },
  indigo: { primary: '#6366f1', strong: '#4f46e5' },
  violet: { primary: '#8b5cf6', strong: '#7c3aed' },
  teal: { primary: '#14b8a6', strong: '#0f766e' },
  orange: { primary: '#f59e0b', strong: '#d97706' },
  rose: { primary: '#f43f5e', strong: '#e11d48' }
};

const accentColorPresets = {
  green: { accent: '#19c37d', strong: '#0fa968' },
  cyan: { accent: '#06b6d4', strong: '#0891b2' },
  purple: { accent: '#a855f7', strong: '#9333ea' },
  orange: { accent: '#f97316', strong: '#ea580c' },
  blue: { accent: '#3b82f6', strong: '#2563eb' },
  red: { accent: '#ef4444', strong: '#dc2626' }
};

const unitConfig = {
  length: { label: '长度', units: { mm: 0.001, cm: 0.01, m: 1, inch: 0.0254 } },
  mass: { label: '质量', units: { g: 0.001, kg: 1, lb: 0.45359237 } },
  force: { label: '力', units: { N: 1, kgf: G, lbf: 4.4482216153 } },
  torque: { label: '扭矩', units: { 'N·m': 1, 'N·cm': 0.01, 'kgf·cm': G * 0.01 } },
  speed: { label: '转速', units: { rpm: 1, rps: 60, 'rad/s': 60 / (2 * Math.PI) } },
  power: { label: '功率', units: { W: 1, kW: 1000, hp: 745.699872 } },
  current: { label: '电流', units: { mA: 0.001, A: 1 } },
  voltage: { label: '电压', units: { mV: 0.001, V: 1, kV: 1000 } }
};
const translateLanguageNames = {
  'zh-CN': '中文',
  en: '英语',
  ja: '日语',
  ko: '韩语',
  ru: '俄文',
  de: '德语'
};
const watchMenuTree = {
  label: '主状态界面',
  children: [
    { label: '进入菜单', children: [
      { label: '上线计数', children: [{ label: 'P1 线长计数' }, { label: 'P2 收线计数' }, { label: 'P3 出线计数' }] },
      { label: '瞬动 (PICK UP)', children: [{ label: '开/关（默认开启）' }, { label: '开启后', children: [{ label: '短按调整' }, { label: '长按调整' }] }] },
      { label: '船舷停止', children: [{ label: '长度可调' }] },
      { label: '智能模式（A1 引入）', children: [{ label: '开/关（默认关闭）' }, { label: '开启后，智能模式调节' }] },
      { label: '定速卷线', children: [{ label: '开/关（默认关闭）' }, { label: '开启后，速度可调' }] },
      { label: '水层记忆', children: [{ label: '开/关（默认关闭）' }, { label: '开启后', children: [{ label: '手动记忆' }, { label: '设定水层' }, { label: '触底停止' }] }] },
      { label: '副计数器', children: [{ label: '开/关（默认关闭）' }, { label: '开启后', children: [{ label: '底部计数器' }, { label: '收线速度' }, { label: '收线用时' }] }] },
      { label: '蓝牙', children: [{ label: '开/关（默认关闭）' }, { label: '开启后', children: [{ label: '配对手机' }, { label: '配对 E03' }] }] },
      { label: '设置', children: [{ label: '实时记录' }, { label: '语言设置' }, { label: '单位设置' }, { label: '屏幕亮度', children: [{ label: '亮度调节' }] }] }
    ] },
    { label: 'PICK UP' },
    { label: 'RESET' },
    { label: 'MODE' },
    { label: '油门开关' }
  ]
};

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  bindElements();
  initTheme();
  initColorScheme();
  initModuleSelector();
  initDynamicInputs();
  initConverter();
  initSpoolMode();
  initBranchMapModule();
  initWatchMenuModule();
  syncTranslateMode();
  bindEvents();
  refreshAll();
});

function bindElements() {
  document.querySelectorAll('[id]').forEach((element) => {
    els[element.id] = element;
  });
}

function bindEvents() {
  document.addEventListener('input', handleInput);
  document.addEventListener('change', handleInput);
  document.addEventListener('focusout', handleInput);
  document.addEventListener('keydown', handleBranchEditorKeydown, true);
  document.addEventListener('click', handleDynamicActions);
  document.querySelectorAll('.module-toggle').forEach((button) => {
    button.addEventListener('click', () => toggleModule(button.dataset.target));
    button.addEventListener('dragstart', handleModuleDragStart);
    button.addEventListener('dragover', handleModuleDragOver);
    button.addEventListener('drop', handleModuleDrop);
    button.addEventListener('dragend', handleModuleDragEnd);
  });

  els['clear-all'].addEventListener('click', clearAllInputs);
  els['theme-select'].addEventListener('change', applyThemeFromSelect);
  els['theme-color-select'].addEventListener('change', applyThemeColorFromSelect);
  els['accent-color-select'].addEventListener('change', applyAccentColorFromSelect);
  els['branch-font-size']?.addEventListener('input', handleBranchStyleChange);
  els['branch-font-color']?.addEventListener('input', handleBranchStyleChange);
  els['branch-map-fullscreen']?.addEventListener('click', toggleBranchMapFullscreen);
  els['watch-menu-back']?.addEventListener('click', navigateWatchMenuBack);
  els['watch-menu-list']?.addEventListener('click', handleWatchMenuClick);
  els['watch-menu-list']?.addEventListener('scroll', updateWatchMenuDepthEffect);
  els['translate-mode']?.addEventListener('change', syncTranslateMode);
  els['translate-run']?.addEventListener('click', runTranslation);
  els['translate-image-run']?.addEventListener('click', runImageTranslation);
  els['extract-image-text-run']?.addEventListener('click', runImageOcrExtraction);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'default';
  els['theme-select'].value = saved;
  applyTheme(saved);
}

function initColorScheme() {
  const savedThemeColor = localStorage.getItem(THEME_COLOR_KEY) || 'blue';
  const savedAccentColor = localStorage.getItem(ACCENT_COLOR_KEY) || 'green';
  els['theme-color-select'].value = themeColorPresets[savedThemeColor] ? savedThemeColor : 'blue';
  els['accent-color-select'].value = accentColorPresets[savedAccentColor] ? savedAccentColor : 'green';
  applyColorScheme();
}

function applyThemeFromSelect() {
  const selected = els['theme-select'].value;
  applyTheme(selected);
  localStorage.setItem(THEME_KEY, selected);
}

function applyTheme(name) {
  document.body.classList.remove('theme-default', 'theme-dark');
  document.body.classList.add(`theme-${name}`);
  els['theme-color-select'].disabled = name === 'dark';
  els['accent-color-select'].disabled = name !== 'dark';
  applyColorScheme();
}

function applyThemeColorFromSelect() {
  localStorage.setItem(THEME_COLOR_KEY, els['theme-color-select'].value);
  applyColorScheme();
}

function applyAccentColorFromSelect() {
  localStorage.setItem(ACCENT_COLOR_KEY, els['accent-color-select'].value);
  applyColorScheme();
}

function applyColorScheme() {
  const themeMode = document.body.classList.contains('theme-dark') ? 'dark' : 'default';
  const themeColorKey = els['theme-color-select'].value;
  const accentKey = els['accent-color-select'].value;
  const themePreset = themeColorPresets[themeColorKey] || themeColorPresets.blue;
  const accentPreset = accentColorPresets[accentKey] || accentColorPresets.green;

  if (themeMode === 'default') {
    document.body.style.setProperty('--primary', themePreset.primary);
    document.body.style.setProperty('--primary-strong', themePreset.strong);
    document.body.style.setProperty('--accent', themePreset.strong);
    document.body.style.setProperty('--canvas-line', themePreset.primary);
    document.body.style.setProperty('--canvas-query', themePreset.strong);
  } else {
    document.body.style.setProperty('--primary', accentPreset.accent);
    document.body.style.setProperty('--primary-strong', accentPreset.strong);
    document.body.style.setProperty('--accent', accentPreset.accent);
    document.body.style.setProperty('--canvas-line', accentPreset.accent);
    document.body.style.setProperty('--canvas-query', accentPreset.strong);
  }
}

function initModuleSelector() {
  const defaultButton = document.querySelector('.module-toggle[data-target="motor-drive"]');
  if (defaultButton) {
    defaultButton.classList.add('is-active');
  }
  syncModuleVisibility();
}

function toggleModule(targetId) {
  const button = document.querySelector(`.module-toggle[data-target="${targetId}"]`);
  document.querySelectorAll('.module-toggle').forEach((item) => item.classList.remove('is-active'));
  button.classList.add('is-active');
  syncModuleVisibility(targetId, true);
}

function syncModuleVisibility(activatedId = null, isActivated = false) {
  const container = els['module-sections'];
  document.querySelectorAll('.module-toggle').forEach((button) => {
    const section = document.getElementById(button.dataset.target);
    const active = button.classList.contains('is-active');
    section.classList.toggle('is-hidden', !active);
  });

  if (activatedId && isActivated) {
    const activatedSection = document.getElementById(activatedId);
    if (activatedSection && container.firstElementChild !== activatedSection) {
      container.prepend(activatedSection);
    }
  }
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target instanceof HTMLInputElement && target.classList.contains('branch-editor-input')) {
    handleBranchEditorInput(event);
    return;
  }
  if (target instanceof HTMLInputElement && target.type === 'number') {
    if (target.value === '') {
      autoFillSuppressedFields.add(target.id);
    } else {
      autoFillSuppressedFields.delete(target.id);
    }
  }
  if (event.type !== 'input') {
    sanitizeNumericInput(target, event.type);
  }
  if (target instanceof HTMLInputElement && target.name === 'spool-mode') {
    initSpoolMode();
    computeSpool();
    return;
  }
  if (target.closest('#spooling-core')) {
    initSpoolMode();
  }
  refreshAll();
}

function handleDynamicActions(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains('remove-row')) return;
  const row = target.closest('.dynamic-row');
  if (!row) return;
  row.remove();
  refreshAll();
}

function refreshAll() {
  computeMotorPower();
  computeGearOutput();
  computeTnCurve();
  computeLinearFitCurve();
  computeDisplay();
  computePower();
  computeRuntime();
  computeBattery();
  computeConverter();
  computeGearRatioModule();
  computeSpool();
  detectTranslateLanguage();
}

function parseNum(id) {
  const value = Number.parseFloat(els[id].value);
  return Number.isFinite(value) ? value : null;
}

function setHtml(id, html) {
  els[id].innerHTML = html;
}

function format(value, digits = 2) {
  if (!Number.isFinite(value)) return '--';
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function validPositive(value) {
  return Number.isFinite(value) && value > 0;
}

function computeMotorPower() {
  const torque = parseNum('motor-torque');
  const speed = parseNum('motor-speed');
  const power = parseNum('motor-power');
  const known = [torque, speed, power].filter((value) => Number.isFinite(value));

  if (known.length < 2) {
    setHtml('motor-power-output', '<span class="hint">请输入三项中的任意两项，自动反算第三项。</span>');
    return;
  }
  if (known.length > 2) {
    const computed = torque * 2 * Math.PI * speed / 60;
    const diff = Math.abs(computed - power);
    const tolerance = Math.max(0.01, Math.abs(computed) * 0.005);
    if (diff > tolerance) {
      els['motor-power'].value = format(computed);
      setHtml(
        'motor-power-output',
        `已根据输入转速与扭矩重算并回填功率。<br><strong>扭矩：</strong>${format(torque)} N·m，<strong>转速：</strong>${format(speed, 0)} rpm，<strong>功率：</strong>${format(computed)} W`
      );
      return;
    }
    setHtml(
      'motor-power-output',
      `<strong>扭矩：</strong>${format(torque)} N·m，<strong>转速：</strong>${format(speed, 0)} rpm，<strong>功率：</strong>${format(computed)} W`
    );
    return;
  }
  if (!Number.isFinite(power) && validPositive(torque) && validPositive(speed)) {
    const computed = torque * 2 * Math.PI * speed / 60;
    if (autoFillSuppressedFields.has('motor-power')) {
      setHtml('motor-power-output', `<strong>功率：</strong>${format(computed)} W（已计算，当前未自动回填）`);
      return;
    }
    els['motor-power'].value = format(computed);
    setHtml('motor-power-output', `<strong>功率：</strong>${format(computed)} W（已回填输入框）`);
    return;
  }
  if (!Number.isFinite(speed) && validPositive(torque) && validPositive(power)) {
    const computed = power * 60 / (torque * 2 * Math.PI);
    if (autoFillSuppressedFields.has('motor-speed')) {
      setHtml('motor-power-output', `<strong>转速：</strong>${format(computed)} rpm（已计算，当前未自动回填）`);
      return;
    }
    els['motor-speed'].value = format(computed);
    setHtml('motor-power-output', `<strong>转速：</strong>${format(computed)} rpm（已回填输入框）`);
    return;
  }
  if (!Number.isFinite(torque) && validPositive(speed) && validPositive(power)) {
    const computed = power * 60 / (speed * 2 * Math.PI);
    if (autoFillSuppressedFields.has('motor-torque')) {
      setHtml('motor-power-output', `<strong>扭矩：</strong>${format(computed)} N·m（已计算，当前未自动回填）`);
      return;
    }
    els['motor-torque'].value = format(computed);
    setHtml('motor-power-output', `<strong>扭矩：</strong>${format(computed)} N·m（已回填输入框）`);
    return;
  }
  setHtml('motor-power-output', '<span class="error">参数不能为 0，且必须为有效数字。</span>');
}

function computeLinearFitCurve() {
  const queryX = parseNum('fit-query-x');
  const points = readPairInputs('#fit-points-list', '.fit-x', '.fit-y');

  drawFitCurve(points, queryX);

  if (points.length < 2) {
    setHtml('fit-output', '<span class="hint">请至少输入 2 个有效坐标点用于线性拟合。</span>');
    return;
  }

  const n = points.length;
  const sx = points.reduce((sum, [x]) => sum + x, 0);
  const sy = points.reduce((sum, [, y]) => sum + y, 0);
  const sxy = points.reduce((sum, [x, y]) => sum + x * y, 0);
  const sx2 = points.reduce((sum, [x]) => sum + x * x, 0);
  const denominator = n * sx2 - sx * sx;
  if (denominator === 0) {
    setHtml('fit-output', '<span class="error">x 坐标不可全部相同，无法拟合线性方程。</span>');
    return;
  }
  const k = (n * sxy - sx * sy) / denominator;
  const b = (sy - k * sx) / n;

  const pieces = [`拟合方程：y = ${format(k, 4)}x + ${format(b, 4)}`];
  if (Number.isFinite(queryX)) {
    pieces.push(`当 x = ${format(queryX)} 时，y ≈ ${format(k * queryX + b)}`);
  }
  setHtml('fit-output', `<ul class="metric-list">${pieces.map((text) => `<li>${text}</li>`).join('')}</ul>`);
}

function drawFitCurve(points, queryX) {
  const canvas = els['fit-canvas'];
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.body);
  const canvasBg = css.getPropertyValue('--canvas-bg').trim() || '#ffffff';
  const axis = css.getPropertyValue('--canvas-axis').trim() || '#cbd5e1';
  const line = css.getPropertyValue('--canvas-line').trim() || '#10a37f';
  const point = css.getPropertyValue('--canvas-point').trim() || '#f59e0b';
  const query = css.getPropertyValue('--canvas-query').trim() || '#2563eb';
  const muted = css.getPropertyValue('--muted').trim() || '#6b7280';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = canvasBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const pad = 40;
  ctx.strokeStyle = axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, canvas.height - pad);
  ctx.lineTo(canvas.width - pad, canvas.height - pad);
  ctx.moveTo(pad, canvas.height - pad);
  ctx.lineTo(pad, pad);
  ctx.stroke();

  if (points.length < 2) {
    ctx.fillStyle = muted;
    ctx.fillText('输入坐标点后显示拟合曲线', pad + 24, canvas.height / 2);
    return;
  }

  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const marginRatio = 0.12;
  const minXView = minX - spanX * marginRatio;
  const maxXView = maxX + spanX * marginRatio;
  const minYView = minY - spanY * marginRatio;
  const maxYView = maxY + spanY * marginRatio;
  const spanXView = maxXView - minXView || 1;
  const spanYView = maxYView - minYView || 1;
  const mapX = (x) => pad + (x - minXView) / spanXView * (canvas.width - pad * 2);
  const mapY = (y) => canvas.height - pad - (y - minYView) / spanYView * (canvas.height - pad * 2);

  // draw points
  ctx.fillStyle = point;
  points.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(mapX(x), mapY(y), 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // regression line
  const n = points.length;
  const sx = points.reduce((sum, [x]) => sum + x, 0);
  const sy = points.reduce((sum, [, y]) => sum + y, 0);
  const sxy = points.reduce((sum, [x, y]) => sum + x * y, 0);
  const sx2 = points.reduce((sum, [x]) => sum + x * x, 0);
  const denominator = n * sx2 - sx * sx;
  if (denominator !== 0) {
    const k = (n * sxy - sx * sy) / denominator;
    const b = (sy - k * sx) / n;
    const y1 = k * minX + b;
    const y2 = k * maxX + b;
    ctx.strokeStyle = line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(mapX(minX), mapY(y1));
    ctx.lineTo(mapX(maxX), mapY(y2));
    ctx.stroke();
    if (Number.isFinite(queryX)) {
      const qy = k * queryX + b;
      const clampedX = Math.min(maxXView, Math.max(minXView, queryX));
      ctx.fillStyle = query;
      ctx.beginPath();
      ctx.arc(mapX(clampedX), mapY(qy), 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function computeGearOutput() {
  const speed = parseNum('gear-input-speed');
  const ratio = parseNum('gear-ratio');
  if (!validPositive(speed) || !validPositive(ratio)) {
    setHtml('gear-output', '<span class="hint">输入电机转速与减速比后，显示输出轴转速。</span>');
    return;
  }
  setHtml('gear-output', `<strong>输出轴转速：</strong>${format(speed / ratio)} rpm`);
}

function computeTnCurve() {
  const noLoad = parseNum('tn-no-load');
  const stall = parseNum('tn-stall');
  const qSpeed = parseNum('tn-query-speed');
  const qTorque = parseNum('tn-query-torque');
  drawTnCurve(noLoad, stall, qSpeed, qTorque);

  if (!validPositive(noLoad) || !validPositive(stall)) {
    setHtml('tn-output', '<span class="hint">输入空载转速和堵转扭矩，生成理想线性 T-N 曲线。</span>');
    return;
  }

  const items = [`斜率：-${format(stall / noLoad, 2)} N·m / rpm`];
  if (Number.isFinite(qSpeed)) items.push(`在 ${format(qSpeed)} rpm 时，扭矩约 ${format(stall * Math.max(0, 1 - qSpeed / noLoad))} N·m`);
  if (Number.isFinite(qTorque)) items.push(`在 ${format(qTorque)} N·m 时，转速约 ${format(noLoad * Math.max(0, 1 - qTorque / stall))} rpm`);
  setHtml('tn-output', `<ul class="metric-list">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`);
}

function drawTnCurve(noLoad, stall, qSpeed, qTorque) {
  const canvas = els['tn-canvas'];
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.body);
  const canvasBg = css.getPropertyValue('--canvas-bg').trim() || '#ffffff';
  const axis = css.getPropertyValue('--canvas-axis').trim() || '#cbd5e1';
  const line = css.getPropertyValue('--canvas-line').trim() || '#10a37f';
  const query = css.getPropertyValue('--canvas-query').trim() || '#2563eb';
  const muted = css.getPropertyValue('--muted').trim() || '#6b7280';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = canvasBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pad = 40;
  ctx.strokeStyle = axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, canvas.height - pad);
  ctx.lineTo(canvas.width - pad, canvas.height - pad);
  ctx.moveTo(pad, canvas.height - pad);
  ctx.lineTo(pad, pad);
  ctx.stroke();

  ctx.fillStyle = muted;
  ctx.font = '12px sans-serif';
  ctx.fillText('转速 rpm', canvas.width - pad - 46, canvas.height - 12);
  ctx.fillText('扭矩 N·m', 10, pad - 10);

  if (!validPositive(noLoad) || !validPositive(stall)) {
    ctx.fillStyle = muted;
    ctx.fillText('等待输入有效的空载转速与堵转扭矩', pad + 24, canvas.height / 2);
    return;
  }

  const x0 = pad;
  const y0 = canvas.height - pad;
  const x1 = canvas.width - pad;
  const y1 = pad;

  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.lineTo(x1, y0);
  ctx.stroke();

  ctx.fillStyle = line;
  ctx.fillText('0', x0 - 10, y0 + 18);
  ctx.fillText(`${format(noLoad, 0)}`, x1 - 40, y0 + 18);
  ctx.fillText(`${format(stall, 2)}`, 8, y1 + 4);

  ctx.fillStyle = query;
  if (Number.isFinite(qSpeed)) {
    const clampedRatio = Math.max(0, Math.min(1, qSpeed / noLoad));
    const x = x0 + (x1 - x0) * clampedRatio;
    const torque = stall * (1 - clampedRatio);
    const y = y0 - (y0 - y1) * (torque / stall);
    drawPoint(ctx, x, y, `@${format(qSpeed)} rpm`);
  }
  if (Number.isFinite(qTorque)) {
    const torqueRatio = Math.max(0, Math.min(1, qTorque / stall));
    const speed = noLoad * (1 - torqueRatio);
    const x = x0 + (x1 - x0) * (speed / noLoad);
    const y = y0 - (y0 - y1) * torqueRatio;
    drawPoint(ctx, x, y, `@${format(qTorque)} N·m`);
  }
}

function drawPoint(ctx, x, y, label) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '12px sans-serif';
  ctx.fillText(label, x + 8, y - 8);
}

function computeDisplay() {
  const ppiWidth = parseNum('ppi-width');
  const ppiHeight = parseNum('ppi-height');
  const diagonal = parseNum('ppi-diagonal');
  if (validPositive(ppiWidth) && validPositive(ppiHeight) && validPositive(diagonal)) {
    setHtml('ppi-output', `<strong>PPI：</strong>${format(Math.hypot(ppiWidth, ppiHeight) / diagonal)}`);
  } else {
    setHtml('ppi-output', '<span class="hint">输入分辨率与尺寸后，估算 PPI。</span>');
  }

  const rw = parseNum('ratio-width');
  const rh = parseNum('ratio-height');
  if (validPositive(rw) && validPositive(rh)) {
    const divisor = gcd(Math.round(rw), Math.round(rh));
    setHtml('ratio-output', `<strong>长宽比：</strong>${Math.round(rw / divisor)}:${Math.round(rh / divisor)}`);
  } else {
    setHtml('ratio-output', '<span class="hint">输入宽高像素，显示最简长宽比。</span>');
  }

  const pw = parseNum('pixel-width');
  const ph = parseNum('pixel-height');
  if (validPositive(pw) && validPositive(ph)) {
    const total = pw * ph;
    setHtml('pixel-output', `<strong>总像素：</strong>${format(total, 0)} px<br>约 ${(total / 1_000_000).toFixed(2)} MP`);
  } else {
    setHtml('pixel-output', '<span class="hint">输入宽高像素，输出总像素。</span>');
  }
}

function computePower() {
  const voltage = parseNum('power-voltage');
  const current = parseNum('power-current');
  if (!validPositive(voltage) || !validPositive(current)) {
    setHtml('power-output', '<span class="hint">输入电压和电流，输出功耗。</span>');
    return;
  }
  setHtml('power-output', `<strong>功率：</strong>${format(voltage * current)} W`);
}

function computeRuntime() {
  const wh = parseNum('runtime-wh');
  const watt = parseNum('runtime-watt');
  if (!validPositive(wh) || !validPositive(watt)) {
    setHtml('runtime-output', '<span class="hint">输入电池能量与平均功耗，估算续航。</span>');
    return;
  }
  const hours = wh / watt;
  setHtml('runtime-output', `<strong>续航：</strong>${format(hours)} h<br>约 ${format(hours * 60)} min`);
}

function computeBattery() {
  const mah = parseNum('mah-value');
  const voltage = parseNum('mah-voltage');
  const wh = parseNum('wh-value');
  if (validPositive(mah) && validPositive(voltage) && !Number.isFinite(wh)) {
    const computed = mah * voltage / 1000;
    if (autoFillSuppressedFields.has('wh-value')) {
      setHtml('battery-output', `<strong>能量：</strong>${format(computed)} Wh（已计算，当前未自动回填）`);
      return;
    }
    els['wh-value'].value = format(computed);
    setHtml('battery-output', `<strong>能量：</strong>${format(computed)} Wh（已回填输入框）`);
    return;
  }
  if (validPositive(wh) && validPositive(voltage) && !Number.isFinite(mah)) {
    const computed = wh * 1000 / voltage;
    if (autoFillSuppressedFields.has('mah-value')) {
      setHtml('battery-output', `<strong>容量：</strong>${format(computed)} mAh（已计算，当前未自动回填）`);
      return;
    }
    els['mah-value'].value = format(computed);
    setHtml('battery-output', `<strong>容量：</strong>${format(computed)} mAh（已回填输入框）`);
    return;
  }
  if (validPositive(mah) && validPositive(voltage) && validPositive(wh)) {
    setHtml('battery-output', `由 mAh 计算 Wh = ${format(mah * voltage / 1000)}<br>由 Wh 计算 mAh = ${format(wh * 1000 / voltage)}`);
    return;
  }
  setHtml('battery-output', '<span class="hint">输入 mAh + 电压 或 Wh + 电压 进行换算。</span>');
}

function initConverter() {
  els['converter-type'].innerHTML = Object.entries(unitConfig)
    .map(([key, item]) => `<option value="${key}">${item.label}</option>`)
    .join('');
  els['converter-type'].addEventListener('change', populateUnitSelects);
  populateUnitSelects();
}

function populateUnitSelects() {
  const type = els['converter-type'].value;
  const config = unitConfig[type];
  const options = Object.keys(config.units).map((unit) => `<option value="${unit}">${unit}</option>`).join('');
  els['converter-from'].innerHTML = options;
  els['converter-to'].innerHTML = options;
  const units = Object.keys(config.units);
  els['converter-from'].value = units[0];
  els['converter-to'].value = units[Math.min(1, units.length - 1)];
  computeConverter();
}

function computeConverter() {
  const type = els['converter-type'].value;
  const input = parseNum('converter-input');
  if (!Number.isFinite(input)) {
    setHtml('converter-output', '<span class="hint">选择类别后输入数值，自动进行单位换算。</span>');
    return;
  }
  const config = unitConfig[type];
  const from = els['converter-from'].value;
  const to = els['converter-to'].value;
  const base = input * config.units[from];
  const result = base / config.units[to];
  setHtml('converter-output', `<strong>换算结果：</strong>${format(result)} ${to}`);
}

function computeGearRatioModule() {
  computeParallelShaftRatio();
  computePlanetaryRatio();
  computeStackedRatio();
}

function computeParallelShaftRatio() {
  const pairs = readPairInputs('#parallel-stages-list', '.parallel-driver', '.parallel-driven');
  if (!pairs.length) {
    setHtml('parallel-output', '<span class="hint">请输入每级主动/从动齿数。</span>');
    return;
  }
  const stageRatios = [];
  for (let i = 0; i < pairs.length; i += 1) {
    const parts = pairs[i];
    if (parts.some((v) => !Number.isFinite(v) || v <= 0)) {
      setHtml('parallel-output', `<span class="error">第 ${i + 1} 行格式错误，请使用“主动,从动”且均为正数。</span>`);
      return;
    }
    const [driver, driven] = parts;
    stageRatios.push(driven / driver);
  }
  const total = stageRatios.reduce((acc, ratio) => acc * ratio, 1);
  const details = stageRatios.map((ratio, idx) => `第 ${idx + 1} 级：${format(ratio, 4)}`);
  setHtml('parallel-output', `<ul class="metric-list">${details.map((d) => `<li>${d}</li>`).join('')}<li><strong>总减速比：${format(total, 4)}</strong></li></ul>`);
}

function computePlanetaryRatio() {
  const zs = parseNum('planet-sun-teeth');
  const zr = parseNum('planet-ring-teeth');
  const mode = els['planet-mode'].value;
  if (!validPositive(zs) || !validPositive(zr)) {
    setHtml('planet-output', '<span class="hint">请输入 Zs 与 Zr 后自动计算。</span>');
    return;
  }
  if (zr <= zs) {
    setHtml('planet-output', '<span class="error">通常需要 Zr > Zs，当前输入不满足。</span>');
    return;
  }

  let ratio;
  let desc;
  if (mode === 'ring_fixed') {
    ratio = 1 + zr / zs;
    desc = '内齿圈固定，太阳轮输入，行星架输出';
  } else if (mode === 'sun_fixed') {
    ratio = 1 + zs / zr;
    desc = '太阳轮固定，内齿圈输入，行星架输出';
  } else if (mode === 'carrier_fixed') {
    ratio = zr / zs;
    desc = '行星架固定，太阳轮输入，内齿圈输出（按转速比绝对值）';
  } else {
    setHtml('planet-output', '<span class="error">未知行星模式，请重新选择。</span>');
    return;
  }
  setHtml('planet-output', `<strong>${desc}</strong><br>减速比：${format(ratio, 4)}`);
}

function computeStackedRatio() {
  const ratios = [...document.querySelectorAll('#stack-ratios-list .stack-ratio')]
    .map((input) => Number.parseFloat(input.value))
    .filter((value) => Number.isFinite(value));
  if (!ratios.length) {
    setHtml('stack-output', '<span class="hint">请输入各级减速比。</span>');
    return;
  }
  if (!ratios.length || ratios.some((v) => !Number.isFinite(v) || v <= 0)) {
    setHtml('stack-output', '<span class="error">请仅输入正数减速比。</span>');
    return;
  }
  const total = ratios.reduce((acc, ratio) => acc * ratio, 1);
  setHtml('stack-output', `分级：${ratios.map((v) => format(v, 4)).join(' × ')}<br><strong>总减速比：${format(total, 4)}</strong>`);
}

function initSpoolMode() {
  const mode = document.querySelector('input[name="spool-mode"]:checked').value;
  const inputs = {
    speed: els['spool-speed'],
    force: els['spool-force-kg'],
    motorSpeed: els['spool-motor-speed'],
    motorTorque: els['spool-motor-torque']
  };
  Object.entries(inputs).forEach(([key, input]) => {
    input.disabled = key !== mode;
  });
}

function computeSpool() {
  const ratio = parseNum('spool-ratio');
  const diameterMm = parseNum('spool-diameter');
  const efficiency = parseNum('spool-efficiency');
  const mode = document.querySelector('input[name="spool-mode"]:checked').value;

  if (!validPositive(ratio) || !validPositive(diameterMm) || !validPositive(efficiency)) {
    els['spool-output'].innerHTML = '<div class="result-box">请先输入减速比、卷筒直径和效率。</div>';
    return;
  }
  if (efficiency > 1) {
    els['spool-output'].innerHTML = '<div class="result-box error">效率 η 必须在 0~1 之间。</div>';
    return;
  }

  const diameterM = diameterMm / 1000;
  const radiusM = diameterM / 2;
  const inputValues = {
    speed: parseNum('spool-speed'),
    force: parseNum('spool-force-kg'),
    motorSpeed: parseNum('spool-motor-speed'),
    motorTorque: parseNum('spool-motor-torque')
  };

  const derived = {
    lineSpeedMPerMin: null,
    forceN: null,
    outputSpeed: null,
    motorSpeed: null,
    outputTorque: null,
    motorTorque: null
  };

  try {
    switch (mode) {
      case 'speed':
        if (!validPositive(inputValues.speed)) throw new Error('请输入有效的收线速度。');
        derived.lineSpeedMPerMin = inputValues.speed;
        derived.outputSpeed = derived.lineSpeedMPerMin / (Math.PI * diameterM);
        derived.motorSpeed = derived.outputSpeed * ratio;
        break;
      case 'force':
        if (!validPositive(inputValues.force)) throw new Error('请输入有效的拉力。');
        derived.forceN = inputValues.force * G;
        derived.outputTorque = derived.forceN * radiusM;
        derived.motorTorque = derived.outputTorque / (ratio * efficiency);
        break;
      case 'motorSpeed':
        if (!validPositive(inputValues.motorSpeed)) throw new Error('请输入有效的电机转速。');
        derived.motorSpeed = inputValues.motorSpeed;
        derived.outputSpeed = derived.motorSpeed / ratio;
        derived.lineSpeedMPerMin = Math.PI * diameterM * derived.outputSpeed;
        break;
      case 'motorTorque':
        if (!validPositive(inputValues.motorTorque)) throw new Error('请输入有效的电机扭矩。');
        derived.motorTorque = inputValues.motorTorque;
        derived.outputTorque = derived.motorTorque * ratio * efficiency;
        derived.forceN = derived.outputTorque / radiusM;
        break;
      default:
        break;
    }
  } catch (error) {
    els['spool-output'].innerHTML = `<div class="result-box error">${error.message}</div>`;
    return;
  }

  if (validPositive(derived.outputSpeed) && !validPositive(derived.lineSpeedMPerMin)) derived.lineSpeedMPerMin = Math.PI * diameterM * derived.outputSpeed;
  if (validPositive(derived.motorSpeed) && !validPositive(derived.outputSpeed)) derived.outputSpeed = derived.motorSpeed / ratio;
  if (validPositive(derived.motorTorque) && !validPositive(derived.outputTorque)) derived.outputTorque = derived.motorTorque * ratio * efficiency;
  if (validPositive(derived.outputTorque) && !validPositive(derived.forceN)) derived.forceN = derived.outputTorque / radiusM;
  if (validPositive(derived.forceN) && !validPositive(derived.outputTorque)) derived.outputTorque = derived.forceN * radiusM;
  if (validPositive(derived.outputTorque) && !validPositive(derived.motorTorque)) derived.motorTorque = derived.outputTorque / (ratio * efficiency);
  if (validPositive(derived.lineSpeedMPerMin) && !validPositive(derived.outputSpeed)) derived.outputSpeed = derived.lineSpeedMPerMin / (Math.PI * diameterM);
  if (validPositive(derived.outputSpeed) && !validPositive(derived.motorSpeed)) derived.motorSpeed = derived.outputSpeed * ratio;

  const cards = [
    createOutputCard('收线速度', derived.lineSpeedMPerMin, 'm/min'),
    createOutputCard('拉力', derived.forceN ? derived.forceN / G : null, 'kg'),
    createOutputCard('输出轴转速', derived.outputSpeed, 'rpm'),
    createOutputCard('电机转速', derived.motorSpeed, 'rpm'),
    createOutputCard('输出轴扭矩', derived.outputTorque, 'N·m'),
    createOutputCard('电机扭矩', derived.motorTorque, 'N·m')
  ];
  els['spool-output'].innerHTML = cards.join('');
}

function createOutputCard(label, value, unit) {
  return `<div class="output-card"><div class="label">${label}</div><div class="value">${Number.isFinite(value) ? `${format(value)} ${unit}` : '--'}</div></div>`;
}

function initWatchMenuModule() {
  watchMenuStack = [watchMenuTree];
  renderWatchMenu();
}

function getCurrentWatchMenuNode() {
  return watchMenuStack[watchMenuStack.length - 1] || watchMenuTree;
}

function renderWatchMenu() {
  const list = els['watch-menu-list'];
  const path = els['watch-menu-path'];
  const backButton = els['watch-menu-back'];
  if (!list || !path || !backButton) return;
  const current = getCurrentWatchMenuNode();
  const children = current.children || [];
  list.innerHTML = children.map((item, index) => `
    <li class="watch-menu-item" data-item-index="${index}">
      <span>${escapeHtml(item.label)}</span>
      ${item.children ? '<span class="watch-menu-arrow">›</span>' : ''}
    </li>
  `).join('') || '<li class="watch-menu-item is-empty">无下级菜单</li>';
  path.textContent = watchMenuStack.map((node) => node.label).join(' / ');
  backButton.disabled = watchMenuStack.length <= 1;
  list.scrollTop = 0;
  updateWatchMenuDepthEffect();
}

function handleWatchMenuClick(event) {
  const target = event.target instanceof HTMLElement ? event.target.closest('.watch-menu-item') : null;
  if (!(target instanceof HTMLElement) || target.classList.contains('is-empty')) return;
  const index = Number.parseInt(target.dataset.itemIndex || '', 10);
  const current = getCurrentWatchMenuNode();
  const item = current.children?.[index];
  if (!item) return;
  if (item.children?.length) {
    watchMenuStack.push(item);
    renderWatchMenu();
  } else {
    target.classList.add('is-active');
    setTimeout(() => target.classList.remove('is-active'), 240);
  }
}

function navigateWatchMenuBack() {
  if (watchMenuStack.length <= 1) return;
  watchMenuStack.pop();
  renderWatchMenu();
}

function updateWatchMenuDepthEffect() {
  const list = els['watch-menu-list'];
  if (!list) return;
  const centerY = list.scrollTop + list.clientHeight / 2;
  list.querySelectorAll('.watch-menu-item').forEach((item) => {
    const top = item.offsetTop;
    const itemCenter = top + item.clientHeight / 2;
    const distance = Math.min(1, Math.abs(itemCenter - centerY) / (list.clientHeight / 2 || 1));
    const scale = 1 - distance * 0.18;
    const opacity = 1 - distance * 0.45;
    item.style.transform = `scale(${scale.toFixed(3)})`;
    item.style.opacity = `${opacity.toFixed(3)}`;
  });
}

function initBranchMapModule() {
  resetBranchMapModule();
}

function handleBranchStyleChange() {
  branchFontSize = Number.parseInt(els['branch-font-size']?.value || '18', 10) || 18;
  branchFontColor = els['branch-font-color']?.value || '#1f2937';
  refreshBranchMapSvg();
}

function toggleBranchMapFullscreen() {
  const wrap = els['branch-map-canvas-wrap'];
  const button = els['branch-map-fullscreen'];
  if (!wrap || !button) return;
  const isFullscreen = wrap.classList.toggle('is-fullscreen');
  button.textContent = isFullscreen ? '还原' : '全屏';
  refreshBranchMapSvg();
}

function resetBranchMapModule() {
  branchFontSize = Number.parseInt(els['branch-font-size']?.value || '18', 10) || 18;
  branchFontColor = els['branch-font-color']?.value || '#1f2937';
  branchNodeSeed = 1;
  branchNodes = [{
    id: `node-${branchNodeSeed}`,
    parentId: null,
    label: '主状态界面'
  }];
  branchHistory = [createBranchSnapshot()];
  branchFuture = [];
  refreshBranchMapEditorAndSvg(branchNodes[0].id);
}

function createBranchSnapshot() {
  return {
    branchNodeSeed,
    branchNodes: branchNodes.map((node) => ({ ...node }))
  };
}

function restoreBranchSnapshot(snapshot, focusNodeId = '') {
  if (!snapshot) return;
  branchNodeSeed = snapshot.branchNodeSeed;
  branchNodes = snapshot.branchNodes.map((node) => ({ ...node }));
  refreshBranchMapEditorAndSvg(focusNodeId || branchNodes[0]?.id || '');
}

function pushBranchHistory() {
  const snap = createBranchSnapshot();
  const last = branchHistory.at(-1);
  if (last && JSON.stringify(last) === JSON.stringify(snap)) return;
  branchHistory.push(snap);
  if (branchHistory.length > 200) branchHistory.shift();
  branchFuture = [];
}

function refreshBranchMapEditorAndSvg(focusNodeId = '') {
  refreshBranchMapSvg(focusNodeId);
}

function handleBranchEditorInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.dataset.nodeId) return;
  const node = branchNodes.find((item) => item.id === target.dataset.nodeId);
  if (!node) return;
  node.label = target.value || ' ';
  pushBranchHistory();
}

function handleBranchEditorKeydown(event) {
  const active = event.target instanceof HTMLElement ? event.target : document.activeElement;
  const target = active instanceof HTMLInputElement ? active : null;
  if (!target || !target.classList.contains('branch-editor-input') || !target.dataset.nodeId) return;
  const nodeId = target.dataset.nodeId;
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undoBranchChange();
    return;
  }
  if (
    (event.ctrlKey || event.metaKey) &&
    (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))
  ) {
    event.preventDefault();
    redoBranchChange();
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    const createdId = insertSiblingNode(nodeId);
    pushBranchHistory();
    refreshBranchMapEditorAndSvg(createdId);
    return;
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    const createdId = insertChildNode(nodeId);
    pushBranchHistory();
    refreshBranchMapEditorAndSvg(createdId);
    return;
  }
  if (event.key === 'Backspace' && target.value === '') {
    const nextFocus = removeBranchNode(nodeId);
    if (nextFocus) {
      event.preventDefault();
      pushBranchHistory();
      refreshBranchMapEditorAndSvg(nextFocus);
    }
  }
}

function undoBranchChange() {
  if (branchHistory.length <= 1) return;
  const current = branchHistory.pop();
  if (current) branchFuture.push(current);
  const prev = branchHistory.at(-1);
  restoreBranchSnapshot(prev);
}

function redoBranchChange() {
  if (!branchFuture.length) return;
  const next = branchFuture.pop();
  if (!next) return;
  branchHistory.push({
    branchNodeSeed: next.branchNodeSeed,
    branchNodes: next.branchNodes.map((node) => ({ ...node }))
  });
  restoreBranchSnapshot(next);
}

function insertSiblingNode(nodeId) {
  const node = branchNodes.find((item) => item.id === nodeId);
  if (!node) return '';
  branchNodeSeed += 1;
  const newNode = {
    id: `node-${branchNodeSeed}`,
    parentId: node.parentId,
    label: ''
  };
  branchNodes.push(newNode);
  return newNode.id;
}

function insertChildNode(nodeId) {
  const node = branchNodes.find((item) => item.id === nodeId);
  if (!node) return '';
  branchNodeSeed += 1;
  const newNode = {
    id: `node-${branchNodeSeed}`,
    parentId: node.id,
    label: ''
  };
  branchNodes.push(newNode);
  return newNode.id;
}

function removeBranchNode(nodeId) {
  const rootId = branchNodes[0]?.id;
  if (!nodeId || nodeId === rootId) return '';
  const order = getBranchNodesInPreorder().map((node) => node.id);
  const fallbackId = order[Math.max(0, order.indexOf(nodeId) - 1)] || rootId;
  const toDelete = new Set([nodeId]);
  let changed = true;
  while (changed) {
    changed = false;
    branchNodes.forEach((node) => {
      if (node.parentId && toDelete.has(node.parentId) && !toDelete.has(node.id)) {
        toDelete.add(node.id);
        changed = true;
      }
    });
  }
  branchNodes = branchNodes.filter((node) => !toDelete.has(node.id));
  return fallbackId;
}

function getBranchNodesInPreorder() {
  if (!branchNodes.length) return [];
  const byParent = new Map();
  branchNodes.forEach((node) => {
    const key = node.parentId || '__root__';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(node);
  });
  const result = [];
  function walk(node) {
    result.push(node);
    const children = byParent.get(node.id) || [];
    children.forEach((child) => walk(child));
  }
  walk(branchNodes[0]);
  return result;
}

function getBranchDepth(nodeId) {
  let depth = 0;
  let current = branchNodes.find((item) => item.id === nodeId);
  while (current && current.parentId) {
    depth += 1;
    current = branchNodes.find((item) => item.id === current.parentId);
  }
  return depth;
}

function refreshBranchMapSvg(focusNodeId = '') {
  const svg = els['branch-map-svg'];
  if (!svg || !branchNodes.length) return;
  const orderedNodes = getBranchNodesInPreorder();
  const childrenMap = new Map();
  branchNodes.forEach((node) => childrenMap.set(node.id, []));
  branchNodes.forEach((node) => {
    if (node.parentId && childrenMap.has(node.parentId)) {
      childrenMap.get(node.parentId).push(node);
    }
  });
  const root = branchNodes[0];
  const positioned = [];
  let yCursor = 70;
  const depthWidthMap = new Map();
  orderedNodes.forEach((node) => {
    const depth = getBranchDepth(node.id);
    const width = getBranchLabelWidth(node.label);
    depthWidthMap.set(depth, Math.max(depthWidthMap.get(depth) || 0, width));
  });

  function getDepthX(depth) {
    let x = 80;
    for (let d = 0; d < depth; d += 1) {
      x += (depthWidthMap.get(d) || 180) + 120;
    }
    return x;
  }

  function layout(node, depth) {
    const children = childrenMap.get(node.id) || [];
    const x = getDepthX(depth);
    const nodeWidth = getBranchLabelWidth(node.label);
    if (!children.length) {
      const y = yCursor;
      yCursor += 58;
      positioned.push({ ...node, x, y, depth, nodeWidth });
      return y;
    }
    const childYs = children.map((child) => layout(child, depth + 1));
    const y = (Math.min(...childYs) + Math.max(...childYs)) / 2;
    positioned.push({ ...node, x, y, depth, nodeWidth });
    return y;
  }

  layout(root, 0);
  const maxX = Math.max(...positioned.map((n) => n.x + n.nodeWidth), 900) + 220;
  const maxY = Math.max(...positioned.map((n) => n.y), 500) + 80;
  svg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
  const colorPalette = ['#16a34a', '#2563eb', '#ea580c', '#7c3aed', '#dc2626', '#0891b2', '#a3a300', '#d946ef', '#6b7280'];
  const positionedMap = new Map(positioned.map((node) => [node.id, node]));

  const pathMarkup = getBranchNodesInPreorder()
    .filter((node) => node.parentId)
    .map((node, idx) => {
      const parent = positionedMap.get(node.parentId);
      const child = positionedMap.get(node.id);
      if (!parent || !child) return '';
      const ctrlX1 = parent.x + 70;
      const ctrlX2 = child.x - 70;
      const color = colorPalette[idx % colorPalette.length];
      return `<path d="M ${parent.x + 14} ${parent.y} C ${ctrlX1} ${parent.y}, ${ctrlX2} ${child.y}, ${child.x - 14} ${child.y}" stroke="${color}" stroke-width="3" fill="none" />`;
    })
    .join('');

  const tailMarkup = positioned
    .map((node, idx) => {
      const color = colorPalette[idx % colorPalette.length];
      const x1 = node.x + 14;
      const x2 = x1 + node.nodeWidth;
      return `<line x1="${x1}" y1="${node.y}" x2="${x2}" y2="${node.y}" stroke="${color}" stroke-width="3" />`;
    })
    .join('');

  const nodeMarkup = positioned
    .map((node, idx) => {
      const color = colorPalette[idx % colorPalette.length];
      const showLabel = escapeHtml((node.label || '').trim() || '未命名');
      return `
        <circle cx="${node.x}" cy="${node.y}" r="8" fill="white" stroke="${color}" stroke-width="3"></circle>
        <foreignObject x="${node.x + 16}" y="${node.y - 16}" width="${node.nodeWidth + 8}" height="34">
          <input xmlns="http://www.w3.org/1999/xhtml" class="branch-editor-input branch-svg-input" style="font-size:${branchFontSize}px;color:${branchFontColor};" data-node-id="${node.id}" value="${showLabel}" />
        </foreignObject>
      `;
    })
    .join('');
  svg.innerHTML = `<g>${pathMarkup}${tailMarkup}${nodeMarkup}</g>`;
  if (focusNodeId) {
    const focusTarget = svg.querySelector(`.branch-svg-input[data-node-id="${focusNodeId}"]`);
    if (focusTarget instanceof HTMLInputElement) {
      focusTarget.focus();
      focusTarget.setSelectionRange(focusTarget.value.length, focusTarget.value.length);
    }
  }
}

function getBranchLabelWidth(label) {
  const text = (label || '').trim() || '未命名';
  return Math.max(80, Math.ceil(text.length * (branchFontSize * 0.65) + 26));
}

function clearAllInputs() {
  document.querySelectorAll('input[type="number"]').forEach((input) => {
    input.value = '';
  });
  if (els['translate-source']) els['translate-source'].value = '';
  if (els['translate-output']) setHtml('translate-output', '点击“开始文字翻译”后显示结果。');
  if (els['translate-detected']) setHtml('translate-detected', '等待输入文本后自动检测语言。');
  if (els['translate-image-output']) setHtml('translate-image-output', '图片翻译结果显示在这里。');
  if (els['extract-image-output']) setHtml('extract-image-output', '图片文字提取结果显示在这里。');
  if (els['translate-image-file']) els['translate-image-file'].value = '';
  if (els['branch-font-size']) els['branch-font-size'].value = '18';
  if (els['branch-font-color']) els['branch-font-color'].value = '#1f2937';
  if (els['branch-map-canvas-wrap']) els['branch-map-canvas-wrap'].classList.remove('is-fullscreen');
  if (els['branch-map-fullscreen']) els['branch-map-fullscreen'].textContent = '全屏';
  resetBranchMapModule();
  initWatchMenuModule();
  autoFillSuppressedFields.clear();
  document.querySelector('input[name="spool-mode"][value="speed"]').checked = true;
  initSpoolMode();
  refreshAll();
}

function detectTranslateLanguage() {
  if ((els['translate-mode']?.value || 'text') !== 'text') return;
  const source = (els['translate-source']?.value || '').trim();
  if (!els['translate-detected']) return;
  if (!source) {
    setHtml('translate-detected', '等待输入文本后自动检测语言。');
    return;
  }
  const detected = detectLanguageByPattern(source);
  setHtml('translate-detected', `<strong>检测结果：</strong>${translateLanguageNames[detected] || detected}`);
}

function syncTranslateMode() {
  const mode = els['translate-mode']?.value || 'text';
  const textSection = els['translate-text-section'];
  const imageSection = els['translate-image-section'];
  if (!textSection || !imageSection) return;
  textSection.classList.toggle('is-hidden', mode !== 'text');
  imageSection.classList.toggle('is-hidden', mode === 'text');
}

function detectLanguageByPattern(text) {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh-CN';
  if (/[\u3040-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  if (/[äöüßÄÖÜ]/.test(text)) return 'de';
  return 'en';
}

async function runTranslation() {
  const source = (els['translate-source']?.value || '').trim();
  const target = els['translate-target']?.value || 'zh-CN';
  if (!source) {
    setHtml('translate-output', '<span class="error">请先输入要翻译的内容。</span>');
    return;
  }
  setHtml('translate-output', '翻译中，请稍候...');
  try {
    const translated = await translateText(source, target);
    setHtml('translate-output', `<strong>翻译结果：</strong>${escapeHtml(translated)}`);
  } catch (error) {
    setHtml('translate-output', '<span class="error">翻译服务暂不可用，请检查网络后重试。</span>');
  }
}

async function runImageOcrExtraction() {
  const file = els['translate-image-file']?.files?.[0];
  if (!file) {
    setHtml('extract-image-output', '<span class="error">请先上传图片文件。</span>');
    return;
  }
  setHtml('extract-image-output', '文字提取中，请稍候...');
  try {
    const text = await performImageOcr(file);
    setHtml('extract-image-output', `<strong>提取文字：</strong><br>${escapeHtml(text)}`);
  } catch (error) {
    setHtml('extract-image-output', '<span class="error">图片文字提取失败，请检查图片清晰度或网络。</span>');
  }
}

async function runImageTranslation() {
  const file = els['translate-image-file']?.files?.[0];
  const target = els['translate-image-target']?.value || 'zh-CN';
  if (!file) {
    setHtml('translate-image-output', '<span class="error">请先上传图片文件。</span>');
    return;
  }
  setHtml('translate-image-output', '图片识别与翻译中，请稍候...');
  try {
    const text = await performImageOcr(file);
    const translated = await translateText(text, target);
    setHtml('translate-image-output', `<strong>翻译结果：</strong><br>${escapeHtml(translated)}`);
  } catch (error) {
    setHtml('translate-image-output', '<span class="error">图片翻译失败，请检查图片清晰度或网络。</span>');
  }
}

async function performImageOcr(file) {
  const form = new FormData();
  form.append('apikey', 'helloworld');
  form.append('language', 'eng');
  form.append('file', file);
  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: form
  });
  if (!response.ok) throw new Error(`OCR HTTP ${response.status}`);
  const data = await response.json();
  const text = data?.ParsedResults?.[0]?.ParsedText?.trim();
  if (!text) throw new Error('OCR empty');
  return text;
}

async function translateText(source, target) {
  const query = new URLSearchParams({
    q: source,
    langpair: `auto|${target}`
  });
  const response = await fetch(`https://api.mymemory.translated.net/get?${query.toString()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error('empty translation');
  return translated;
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function sanitizeNumericInput(target, eventType = 'input') {
  if (!(target instanceof HTMLInputElement) || target.type !== 'number') return;
  if (eventType === 'input') return;
  let raw = target.value;
  if (!raw) return;
  raw = raw.replace(/[^0-9.]/g, '');
  const firstDot = raw.indexOf('.');
  if (firstDot !== -1) {
    raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');
  }
  if (raw.startsWith('.')) raw = `0${raw}`;
  target.value = raw;

  let value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) {
    target.value = '';
    return;
  }
  value = Math.max(0, value);
  const min = target.min ? Number.parseFloat(target.min) : null;
  const max = target.max ? Number.parseFloat(target.max) : null;
  if (Number.isFinite(min)) value = Math.max(min, value);
  if (Number.isFinite(max)) value = Math.min(max, value);
  const noLoad = parseNum('tn-no-load');
  const speedInputs = new Set(['motor-speed', 'gear-input-speed', 'tn-query-speed', 'spool-motor-speed']);
  if (speedInputs.has(target.id) && validPositive(noLoad)) {
    value = Math.min(value, noLoad);
  }
  target.value = String(value);
}

function initDynamicInputs() {
  els['add-fit-point'].addEventListener('click', () => {
    appendPairRow('fit-points-list', 'fit-x', 'fit-y', 'x 例如 2000', 'y 例如 0.7');
  });
  els['add-parallel-stage'].addEventListener('click', () => {
    appendPairRow('parallel-stages-list', 'parallel-driver', 'parallel-driven', '主动齿数', '从动齿数', 1);
  });
  els['add-stack-ratio'].addEventListener('click', () => {
    appendSingleRow('stack-ratios-list', 'stack-ratio', '例如 3');
  });
}

function appendPairRow(containerId, classA, classB, placeholderA, placeholderB, min = 0) {
  const row = document.createElement('div');
  row.className = 'dynamic-row two-input with-action';
  row.innerHTML = `
    <input class="${classA}" type="number" step="any" min="${min}" placeholder="${placeholderA}" />
    <input class="${classB}" type="number" step="any" min="${min}" placeholder="${placeholderB}" />
    <button type="button" class="secondary-btn remove-row">删除</button>
  `;
  els[containerId].appendChild(row);
}

function appendSingleRow(containerId, inputClass, placeholder, min = 0) {
  const row = document.createElement('div');
  row.className = 'dynamic-row with-action';
  row.innerHTML = `
    <input class="${inputClass}" type="number" step="any" min="${min}" placeholder="${placeholder}" />
    <button type="button" class="secondary-btn remove-row">删除</button>
  `;
  els[containerId].appendChild(row);
}

function readPairInputs(containerSelector, firstSelector, secondSelector) {
  const rows = [...document.querySelectorAll(`${containerSelector} .dynamic-row`)];
  return rows
    .map((row) => {
      const first = row.querySelector(firstSelector);
      const second = row.querySelector(secondSelector);
      return [Number.parseFloat(first?.value), Number.parseFloat(second?.value)];
    })
    .filter(([a, b]) => Number.isFinite(a) || Number.isFinite(b));
}

function handleModuleDragStart(event) {
  draggedModuleButton = event.currentTarget;
  event.currentTarget.classList.add('dragging');
}

function handleModuleDragOver(event) {
  event.preventDefault();
}

function handleModuleDrop(event) {
  event.preventDefault();
  const target = event.currentTarget;
  if (!draggedModuleButton || draggedModuleButton === target) return;
  const grid = target.parentElement;
  const all = [...grid.children];
  const dragIndex = all.indexOf(draggedModuleButton);
  const targetIndex = all.indexOf(target);
  if (dragIndex < targetIndex) {
    target.after(draggedModuleButton);
  } else {
    target.before(draggedModuleButton);
  }
  applyModuleOrderToSections();
}

function handleModuleDragEnd(event) {
  event.currentTarget.classList.remove('dragging');
  draggedModuleButton = null;
}

function applyModuleOrderToSections() {
  const container = els['module-sections'];
  const frag = document.createDocumentFragment();
  document.querySelectorAll('.module-toggle').forEach((button) => {
    const section = document.getElementById(button.dataset.target);
    if (section) frag.appendChild(section);
  });
  container.appendChild(frag);
}
