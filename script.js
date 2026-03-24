const G = 9.81;

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
  initModuleSelector();
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
  document.querySelectorAll('input').forEach((input) => input.addEventListener('input', handleInput));
  document.querySelectorAll('select').forEach((select) => select.addEventListener('change', handleInput));
  document.querySelectorAll('input[name="spool-mode"]').forEach((radio) => radio.addEventListener('change', () => {
    initSpoolMode();
    computeSpool();
  }));

  document.querySelectorAll('.module-toggle').forEach((button) => {
    button.addEventListener('click', () => toggleModule(button.dataset.target));
  });

  els['show-all-modules'].addEventListener('click', showAllModules);
  els['hide-all-modules'].addEventListener('click', hideAllModules);
  els['copy-summary'].addEventListener('click', copySummary);
  els['clear-all'].addEventListener('click', clearAllInputs);
}

function initModuleSelector() {
  syncModuleVisibility();
}

function toggleModule(targetId) {
  const button = document.querySelector(`.module-toggle[data-target="${targetId}"]`);
  button.classList.toggle('is-active');
  syncModuleVisibility();
}

function showAllModules() {
  document.querySelectorAll('.module-toggle').forEach((button) => button.classList.add('is-active'));
  syncModuleVisibility();
}

function hideAllModules() {
  document.querySelectorAll('.module-toggle').forEach((button) => button.classList.remove('is-active'));
  syncModuleVisibility();
}

function syncModuleVisibility() {
  document.querySelectorAll('.module-toggle').forEach((button) => {
    const section = document.getElementById(button.dataset.target);
    section.classList.toggle('is-hidden', !button.classList.contains('is-active'));
  });
}

function handleInput(event) {
  if (event.target.closest('#spooling-core')) {
    initSpoolMode();
  }
  refreshAll();
}

function refreshAll() {
  computeMotorPower();
  computeGearOutput();
  computeTnCurve();
  computeDisplay();
  computePower();
  computeRuntime();
  computeBattery();
  computeConverter();
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
    setHtml('motor-power-output', `<strong>功率：</strong>${format(torque * 2 * Math.PI * speed / 60)} W`);
    return;
  }
  if (!Number.isFinite(speed) && validPositive(torque) && validPositive(power)) {
    setHtml('motor-power-output', `<strong>转速：</strong>${format(power * 60 / (torque * 2 * Math.PI))} rpm`);
    return;
  }
  if (!Number.isFinite(torque) && validPositive(speed) && validPositive(power)) {
    setHtml('motor-power-output', `<strong>扭矩：</strong>${format(power * 60 / (speed * 2 * Math.PI))} N·m`);
    return;
  }
  setHtml('motor-power-output', '<span class="error">参数不能为 0，且必须为有效数字。</span>');
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f8fbff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pad = 40;
  ctx.strokeStyle = '#b9c8db';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, canvas.height - pad);
  ctx.lineTo(canvas.width - pad, canvas.height - pad);
  ctx.moveTo(pad, canvas.height - pad);
  ctx.lineTo(pad, pad);
  ctx.stroke();

  ctx.fillStyle = '#687994';
  ctx.font = '12px sans-serif';
  ctx.fillText('转速 rpm', canvas.width - pad - 46, canvas.height - 12);
  ctx.fillText('扭矩 N·m', 10, pad - 10);

  if (!validPositive(noLoad) || !validPositive(stall)) {
    ctx.fillStyle = '#93a1ba';
    ctx.fillText('等待输入有效的空载转速与堵转扭矩', pad + 24, canvas.height / 2);
    return;
  }

  const x0 = pad;
  const y0 = canvas.height - pad;
  const x1 = canvas.width - pad;
  const y1 = pad;

  ctx.strokeStyle = '#5b67ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.lineTo(x1, y0);
  ctx.stroke();

  ctx.fillStyle = '#5b67ff';
  ctx.fillText('0', x0 - 10, y0 + 18);
  ctx.fillText(`${format(noLoad, 0)}`, x1 - 40, y0 + 18);
  ctx.fillText(`${format(stall, 2)}`, 8, y1 + 4);

  ctx.fillStyle = '#0ea5a1';
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
    setHtml('ppi-output', `<strong>PPI：</strong>${format(Math.hypot(ppiWidth, ppiHeight) / diagonal)} `);
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
    setHtml('battery-output', `<strong>能量：</strong>${format(mah * voltage / 1000)} Wh`);
    return;
  }
  if (validPositive(wh) && validPositive(voltage) && !Number.isFinite(mah)) {
    setHtml('battery-output', `<strong>容量：</strong>${format(wh * 1000 / voltage)} mAh`);
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
    createOutputCard('收线速度', derived.lineSpeedMPerMin, 'm/min', 0),
    createOutputCard('拉力', derived.forceN ? derived.forceN / G : null, 'kg', 0),
    createOutputCard('拉力', derived.forceN, 'N', 0),
    createOutputCard('输出轴转速', derived.outputSpeed, 'rpm', 0),
    createOutputCard('电机转速', derived.motorSpeed, 'rpm', 0),
    createOutputCard('输出轴扭矩', derived.outputTorque, 'N·m', 0),
    createOutputCard('电机扭矩', derived.motorTorque, 'N·m', 0)
  ];
  els['spool-output'].innerHTML = cards.join('');
}

function createOutputCard(label, value, unit, digits = 2) {
  return `<div class="output-card"><div class="label">${label}</div><div class="value">${Number.isFinite(value) ? `${format(value, digits)} ${unit}` : '--'}</div></div>`;
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
