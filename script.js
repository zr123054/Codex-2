const G = 9.81;
const THEME_KEY = 'hardware-tool-theme-v1';
const THEME_COLOR_KEY = 'hardware-tool-theme-color-v1';
const ACCENT_COLOR_KEY = 'hardware-tool-accent-color-v1';
let draggedModuleButton = null;

const themeColorPresets = {
  blue: { primary: '#3b82f6', strong: '#2563eb' },
  violet: { primary: '#8b5cf6', strong: '#7c3aed' },
  orange: { primary: '#f59e0b', strong: '#d97706' }
};

const accentColorPresets = {
  green: { accent: '#19c37d', strong: '#0fa968' },
  cyan: { accent: '#06b6d4', strong: '#0891b2' },
  purple: { accent: '#a855f7', strong: '#9333ea' },
  orange: { accent: '#f97316', strong: '#ea580c' }
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

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  bindElements();
  initTheme();
  initColorScheme();
  initModuleSelector();
  initDynamicInputs();
  initConverter();
  initSpoolMode();
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
  document.addEventListener('click', handleDynamicActions);
  document.querySelectorAll('.module-toggle').forEach((button) => {
    button.addEventListener('click', () => toggleModule(button.dataset.target));
    button.addEventListener('dragstart', handleModuleDragStart);
    button.addEventListener('dragover', handleModuleDragOver);
    button.addEventListener('drop', handleModuleDrop);
    button.addEventListener('dragend', handleModuleDragEnd);
  });

  els['copy-summary'].addEventListener('click', copySummary);
  els['clear-all'].addEventListener('click', clearAllInputs);
  els['theme-select'].addEventListener('change', applyThemeFromSelect);
  els['theme-color-select'].addEventListener('change', applyThemeColorFromSelect);
  els['accent-color-select'].addEventListener('change', applyAccentColorFromSelect);
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
    document.body.style.setProperty('--accent', accentPreset.accent);
    document.body.style.setProperty('--canvas-line', themePreset.primary);
    document.body.style.setProperty('--canvas-query', accentPreset.accent);
  } else {
    document.body.style.setProperty('--primary', accentPreset.accent);
    document.body.style.setProperty('--primary-strong', accentPreset.strong);
    document.body.style.setProperty('--accent', accentPreset.accent);
    document.body.style.setProperty('--canvas-line', accentPreset.accent);
    document.body.style.setProperty('--canvas-query', accentPreset.strong);
  }
}

function initModuleSelector() {
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
  sanitizeNumericInput(target);
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
    setHtml('motor-power-output', `<strong>理论功率：</strong>${format(torque * 2 * Math.PI * speed / 60)} W`);
    return;
  }
  if (!Number.isFinite(power) && validPositive(torque) && validPositive(speed)) {
    const computed = torque * 2 * Math.PI * speed / 60;
    els['motor-power'].value = format(computed);
    setHtml('motor-power-output', `<strong>功率：</strong>${format(computed)} W（已回填输入框）`);
    return;
  }
  if (!Number.isFinite(speed) && validPositive(torque) && validPositive(power)) {
    const computed = power * 60 / (torque * 2 * Math.PI);
    els['motor-speed'].value = format(computed);
    setHtml('motor-power-output', `<strong>转速：</strong>${format(computed)} rpm（已回填输入框）`);
    return;
  }
  if (!Number.isFinite(torque) && validPositive(speed) && validPositive(power)) {
    const computed = power * 60 / (speed * 2 * Math.PI);
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
    els['wh-value'].value = format(computed);
    setHtml('battery-output', `<strong>能量：</strong>${format(computed)} Wh（已回填输入框）`);
    return;
  }
  if (validPositive(wh) && validPositive(voltage) && !Number.isFinite(mah)) {
    const computed = wh * 1000 / voltage;
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

function clearAllInputs() {
  document.querySelectorAll('input[type="number"]').forEach((input) => {
    input.value = '';
  });
  document.querySelector('input[name="spool-mode"][value="speed"]').checked = true;
  initSpoolMode();
  refreshAll();
}

async function copySummary() {
  const visibleSections = [...document.querySelectorAll('[data-module-section]:not(.is-hidden)')];
  const summary = visibleSections.map((section) => {
    const title = section.querySelector('h2')?.innerText || '模块';
    const content = section.innerText.replace(/\s+/g, ' ').trim();
    return `${title}：${content}`;
  }).join('\n');

  try {
    await navigator.clipboard.writeText(summary || '当前没有显示模块。');
    alert('结果摘要已复制到剪贴板。');
  } catch (error) {
    alert(`复制失败，请手动复制：\n${summary}`);
  }
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function sanitizeNumericInput(target) {
  if (!(target instanceof HTMLInputElement) || target.type !== 'number') return;
  let raw = target.value;
  if (!raw) return;
  raw = raw.replace(/[^0-9.]/g, '');
  const firstDot = raw.indexOf('.');
  if (firstDot !== -1) {
    raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');
  }
  if (raw.startsWith('.')) raw = `0${raw}`;
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
