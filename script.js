const G = 9.81;
const HISTORY_KEY = 'hardware-calculator-history-v1';
const historyLimit = 12;

const unitConfig = {
  length: {
    label: '长度',
    base: 'm',
    units: { mm: 0.001, cm: 0.01, m: 1, inch: 0.0254 }
  },
  mass: {
    label: '质量',
    base: 'kg',
    units: { g: 0.001, kg: 1, lb: 0.45359237 }
  },
  force: {
    label: '力',
    base: 'N',
    units: { N: 1, kgf: G, lbf: 4.4482216153 }
  },
  torque: {
    label: '扭矩',
    base: 'N·m',
    units: { 'N·m': 1, 'N·cm': 0.01, 'kgf·cm': G * 0.01 }
  },
  speed: {
    label: '转速',
    base: 'rpm',
    units: { rpm: 1, rps: 60, 'rad/s': 60 / (2 * Math.PI) }
  },
  power: {
    label: '功率',
    base: 'W',
    units: { W: 1, kW: 1000, hp: 745.699872 }
  },
  current: {
    label: '电流',
    base: 'A',
    units: { mA: 0.001, A: 1 }
  },
  voltage: {
    label: '电压',
    base: 'V',
    units: { mV: 0.001, V: 1, kV: 1000 }
  }
};

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  bindElements();
  initConverter();
  initSpoolMode();
  bindEvents();
  refreshAll();
  renderHistory();
});

function bindElements() {
  document.querySelectorAll('input, select, button, canvas, div, template').forEach((element) => {
    if (element.id) els[element.id] = element;
  });
}

function bindEvents() {
  document.querySelectorAll('input').forEach((input) => input.addEventListener('input', handleInput));
  document.querySelectorAll('select').forEach((select) => select.addEventListener('change', handleInput));
  document.querySelectorAll('input[name="spool-mode"]').forEach((radio) => radio.addEventListener('change', () => {
    initSpoolMode();
    computeSpool();
  }));

  els['clear-all'].addEventListener('click', clearAllInputs);
  els['copy-summary'].addEventListener('click', copySummary);
  els['clear-history'].addEventListener('click', () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
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
  computeForceTorque();
  computeMassForce();
  computeBackdrive();
  computeRpmConversion();
  computeLinearSpeed();
  computeReverseSpeed();
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

function format(value, digits = 4) {
  if (!Number.isFinite(value)) return '--';
  return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: digits });
}

function validPositive(value) {
  return Number.isFinite(value) && value > 0;
}

function computeMotorPower() {
  const torque = parseNum('motor-torque');
  const speed = parseNum('motor-speed');
  const power = parseNum('motor-power');
  const known = [torque, speed, power].filter((v) => Number.isFinite(v));

  if (known.length < 2) {
    setHtml('motor-power-output', '<span class="hint">请输入三项中的任意两项，自动反算第三项。</span>');
    return;
  }

  if (known.length > 2) {
    const expectedPower = torque * 2 * Math.PI * speed / 60;
    setHtml('motor-power-output', `<strong>已输入三项：</strong><br>理论功率 = ${format(expectedPower)} W`);
    return;
  }

  if (!Number.isFinite(power) && validPositive(torque) && validPositive(speed)) {
    const result = torque * 2 * Math.PI * speed / 60;
    setHtml('motor-power-output', `<strong>功率：</strong>${format(result)} W`);
    return;
  }

  if (!Number.isFinite(speed) && validPositive(torque) && validPositive(power)) {
    const result = power * 60 / (torque * 2 * Math.PI);
    setHtml('motor-power-output', `<strong>转速：</strong>${format(result)} rpm`);
    return;
  }

  if (!Number.isFinite(torque) && validPositive(speed) && validPositive(power)) {
    const result = power * 60 / (speed * 2 * Math.PI);
    setHtml('motor-power-output', `<strong>扭矩：</strong>${format(result)} N·m`);
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

  const items = [];
  items.push(`斜率：-${format(stall / noLoad, 6)} N·m / rpm`);
  if (Number.isFinite(qSpeed)) {
    const torqueAtSpeed = stall * Math.max(0, 1 - qSpeed / noLoad);
    items.push(`在 ${format(qSpeed)} rpm 时，扭矩约 ${format(torqueAtSpeed)} N·m`);
  }
  if (Number.isFinite(qTorque)) {
    const speedAtTorque = noLoad * Math.max(0, 1 - qTorque / stall);
    items.push(`在 ${format(qTorque)} N·m 时，转速约 ${format(speedAtTorque)} rpm`);
  }
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

  ctx.fillStyle = '#5f748d';
  ctx.font = '12px sans-serif';
  ctx.fillText('转速 rpm', canvas.width - pad - 44, canvas.height - 12);
  ctx.fillText('扭矩 N·m', 10, pad - 10);

  if (!validPositive(noLoad) || !validPositive(stall)) {
    ctx.fillStyle = '#8a9db5';
    ctx.fillText('等待输入有效的空载转速与堵转扭矩', pad + 30, canvas.height / 2);
    return;
  }

  const x0 = pad;
  const y0 = canvas.height - pad;
  const x1 = canvas.width - pad;
  const y1 = pad;

  ctx.strokeStyle = '#2166d1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.lineTo(x1, y0);
  ctx.stroke();

  ctx.fillStyle = '#2166d1';
  ctx.fillText(`0`, x0 - 10, y0 + 18);
  ctx.fillText(`${format(noLoad, 1)}`, x1 - 35, y0 + 18);
  ctx.fillText(`${format(stall, 2)}`, 8, y1 + 4);

  ctx.fillStyle = '#0d9488';
  if (Number.isFinite(qSpeed)) {
    const ratio = Math.max(0, Math.min(1, qSpeed / noLoad));
    const x = x0 + (x1 - x0) * ratio;
    const torque = stall * (1 - ratio);
    const y = y0 - (y0 - y1) * (torque / stall);
    point(ctx, x, y, `@${format(qSpeed)} rpm`);
  }

  if (Number.isFinite(qTorque)) {
    const torqueRatio = Math.max(0, Math.min(1, qTorque / stall));
    const speed = noLoad * (1 - torqueRatio);
    const x = x0 + (x1 - x0) * (speed / noLoad);
    const y = y0 - (y0 - y1) * torqueRatio;
    point(ctx, x, y, `@${format(qTorque)} N·m`);
  }
}

function point(ctx, x, y, label) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '12px sans-serif';
  ctx.fillText(label, x + 8, y - 8);
}

function computeForceTorque() {
  const force = parseNum('force-value');
  const arm = parseNum('arm-value');
  if (!validPositive(force) || !validPositive(arm)) {
    setHtml('torque-output', '<span class="hint">输入拉力与力臂后，输出扭矩。</span>');
    return;
  }
  const torque = force * arm / 1000;
  setHtml('torque-output', `<strong>扭矩：</strong>${format(torque)} N·m`);
}

function computeMassForce() {
  const kg = parseNum('mass-kg');
  const force = parseNum('force-newton');
  if (Number.isFinite(kg) && !Number.isFinite(force)) {
    setHtml('mass-force-output', `<strong>力：</strong>${format(kg * G)} N`);
    return;
  }
  if (!Number.isFinite(kg) && Number.isFinite(force)) {
    setHtml('mass-force-output', `<strong>质量：</strong>${format(force / G)} kg`);
    return;
  }
  if (Number.isFinite(kg) && Number.isFinite(force)) {
    setHtml('mass-force-output', `kg → N = ${format(kg * G)} N<br>N → kg = ${format(force / G)} kg`);
    return;
  }
  setHtml('mass-force-output', '<span class="hint">输入 kg 或 N 中任一值进行换算。</span>');
}

function computeBackdrive() {
  const mass = parseNum('back-mass');
  const arm = parseNum('back-arm');
  const ratio = parseNum('back-ratio');
  const efficiency = parseNum('back-efficiency');
  if (!validPositive(mass) || !validPositive(arm) || !validPositive(ratio) || !validPositive(efficiency)) {
    setHtml('backdrive-output', '<span class="hint">输入负载、力臂、减速比与效率后，反推电机扭矩。</span>');
    return;
  }
  if (efficiency > 1) {
    setHtml('backdrive-output', '<span class="error">效率 η 必须在 0~1 之间。</span>');
    return;
  }
  const force = mass * G;
  const outputTorque = force * arm / 1000;
  const motorTorque = outputTorque / (ratio * efficiency);
  setHtml('backdrive-output', `输出轴扭矩：${format(outputTorque)} N·m<br>电机扭矩：${format(motorTorque)} N·m`);
}

function computeRpmConversion() {
  const rpm = parseNum('rpm-value');
  const rads = parseNum('rads-value');
  if (Number.isFinite(rpm) && !Number.isFinite(rads)) {
    setHtml('rpm-convert-output', `<strong>角速度：</strong>${format(rpm * 2 * Math.PI / 60)} rad/s`);
    return;
  }
  if (!Number.isFinite(rpm) && Number.isFinite(rads)) {
    setHtml('rpm-convert-output', `<strong>转速：</strong>${format(rads * 60 / (2 * Math.PI))} rpm`);
    return;
  }
  if (Number.isFinite(rpm) && Number.isFinite(rads)) {
    setHtml('rpm-convert-output', `rpm → rad/s = ${format(rpm * 2 * Math.PI / 60)}<br>rad/s → rpm = ${format(rads * 60 / (2 * Math.PI))}`);
    return;
  }
  setHtml('rpm-convert-output', '<span class="hint">输入 rpm 或 rad/s。</span>');
}

function computeLinearSpeed() {
  const diameter = parseNum('linear-diameter');
  const rpm = parseNum('linear-rpm');
  if (!validPositive(diameter) || !validPositive(rpm)) {
    setHtml('linear-speed-output', '<span class="hint">输入直径与转速后，输出线速度。</span>');
    return;
  }
  const speed = Math.PI * (diameter / 1000) * (rpm / 60);
  setHtml('linear-speed-output', `<strong>线速度：</strong>${format(speed)} m/s`);
}

function computeReverseSpeed() {
  const speed = parseNum('reverse-linear-speed');
  const diameter = parseNum('reverse-diameter');
  if (!validPositive(speed) || !validPositive(diameter)) {
    setHtml('reverse-speed-output', '<span class="hint">输入线速度与直径，反算转速。</span>');
    return;
  }
  const rpm = speed / (Math.PI * (diameter / 1000)) * 60;
  setHtml('reverse-speed-output', `<strong>转速：</strong>${format(rpm)} rpm`);
}

function computeDisplay() {
  const ppiWidth = parseNum('ppi-width');
  const ppiHeight = parseNum('ppi-height');
  const diagonal = parseNum('ppi-diagonal');
  if (validPositive(ppiWidth) && validPositive(ppiHeight) && validPositive(diagonal)) {
    const ppi = Math.hypot(ppiWidth, ppiHeight) / diagonal;
    setHtml('ppi-output', `<strong>PPI：</strong>${format(ppi, 2)}`);
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
  setHtml('runtime-output', `<strong>续航：</strong>${format(hours, 2)} h<br>约 ${format(hours * 60, 1)} min`);
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
  const typeSelect = els['converter-type'];
  typeSelect.innerHTML = Object.entries(unitConfig)
    .map(([key, item]) => `<option value="${key}">${item.label}</option>`)
    .join('');
  typeSelect.addEventListener('change', populateUnitSelects);
  populateUnitSelects();
}

function populateUnitSelects() {
  const type = els['converter-type'].value;
  const config = unitConfig[type];
  const options = Object.keys(config.units).map((unit) => `<option value="${unit}">${unit}</option>`).join('');
  els['converter-from'].innerHTML = options;
  els['converter-to'].innerHTML = options;
  const unitKeys = Object.keys(config.units);
  els['converter-from'].value = unitKeys[0];
  els['converter-to'].value = unitKeys[Math.min(1, unitKeys.length - 1)];
  computeConverter();
}

function computeConverter() {
  const type = els['converter-type'].value;
  const input = parseNum('converter-input');
  const from = els['converter-from'].value;
  const to = els['converter-to'].value;
  const config = unitConfig[type];
  if (!Number.isFinite(input)) {
    setHtml('converter-output', '<span class="hint">选择类别后输入数值，自动进行单位换算。</span>');
    return;
  }
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
    if (key !== mode) {
      input.classList.add('disabled');
    } else {
      input.classList.remove('disabled');
    }
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
    speed: null,
    forceN: null,
    outputSpeed: null,
    motorSpeed: null,
    outputTorque: null,
    motorTorque: null
  };

  try {
    switch (mode) {
      case 'speed': {
        if (!validPositive(inputValues.speed)) throw new Error('请输入有效的收线速度。');
        derived.speed = inputValues.speed;
        derived.outputSpeed = derived.speed / (Math.PI * diameterM) * 60;
        derived.motorSpeed = derived.outputSpeed * ratio;
        if (validPositive(inputValues.motorTorque)) {
          derived.motorTorque = inputValues.motorTorque;
          derived.outputTorque = derived.motorTorque * ratio * efficiency;
          derived.forceN = derived.outputTorque / radiusM;
        }
        break;
      }
      case 'force': {
        if (!validPositive(inputValues.force)) throw new Error('请输入有效的拉力。');
        derived.forceN = inputValues.force * G;
        derived.outputTorque = derived.forceN * radiusM;
        derived.motorTorque = derived.outputTorque / (ratio * efficiency);
        if (validPositive(inputValues.motorSpeed)) {
          derived.motorSpeed = inputValues.motorSpeed;
          derived.outputSpeed = derived.motorSpeed / ratio;
          derived.speed = Math.PI * diameterM * derived.outputSpeed / 60;
        }
        break;
      }
      case 'motorSpeed': {
        if (!validPositive(inputValues.motorSpeed)) throw new Error('请输入有效的电机转速。');
        derived.motorSpeed = inputValues.motorSpeed;
        derived.outputSpeed = derived.motorSpeed / ratio;
        derived.speed = Math.PI * diameterM * derived.outputSpeed / 60;
        if (validPositive(inputValues.motorTorque)) {
          derived.motorTorque = inputValues.motorTorque;
          derived.outputTorque = derived.motorTorque * ratio * efficiency;
          derived.forceN = derived.outputTorque / radiusM;
        }
        break;
      }
      case 'motorTorque': {
        if (!validPositive(inputValues.motorTorque)) throw new Error('请输入有效的电机扭矩。');
        derived.motorTorque = inputValues.motorTorque;
        derived.outputTorque = derived.motorTorque * ratio * efficiency;
        derived.forceN = derived.outputTorque / radiusM;
        if (validPositive(inputValues.motorSpeed)) {
          derived.motorSpeed = inputValues.motorSpeed;
          derived.outputSpeed = derived.motorSpeed / ratio;
          derived.speed = Math.PI * diameterM * derived.outputSpeed / 60;
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    els['spool-output'].innerHTML = `<div class="result-box error">${error.message}</div>`;
    return;
  }

  const cards = [
    createOutputCard('收线速度', derived.speed, 'm/s'),
    createOutputCard('拉力', derived.forceN ? derived.forceN / G : null, 'kg'),
    createOutputCard('拉力', derived.forceN, 'N'),
    createOutputCard('输出轴转速', derived.outputSpeed, 'rpm'),
    createOutputCard('电机转速', derived.motorSpeed, 'rpm'),
    createOutputCard('输出轴扭矩', derived.outputTorque, 'N·m'),
    createOutputCard('电机扭矩', derived.motorTorque, 'N·m')
  ];
  els['spool-output'].innerHTML = cards.join('');

  const modeLabels = {
    speed: '收线速度',
    force: '拉力',
    motorSpeed: '电机转速',
    motorTorque: '电机扭矩'
  };
  const primary = inputValues[mode];
  if (validPositive(primary)) {
    saveHistory('收线系统联动计算', `${modeLabels[mode]}输入：${format(primary)}；输出轴转速 ${format(derived.outputSpeed)} rpm；电机扭矩 ${format(derived.motorTorque)} N·m。`);
  }
}

function createOutputCard(label, value, unit) {
  return `<div class="output-card"><div class="label">${label}</div><div class="value">${Number.isFinite(value) ? `${format(value)} ${unit}` : '--'}</div></div>`;
}

function saveHistory(title, body) {
  const now = Date.now();
  const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  const latest = existing[0];
  if (latest && latest.title === title && latest.body === body && now - latest.timestamp < 2000) {
    return;
  }
  const next = [{ title, body, timestamp: now }, ...existing].slice(0, historyLimit);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  renderHistory();
}

function renderHistory() {
  const items = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  if (!items.length) {
    els['history-list'].innerHTML = '<div class="result-box">暂无历史记录，进行计算后会自动写入本地。</div>';
    return;
  }
  const template = els['history-item-template'];
  els['history-list'].innerHTML = '';
  items.forEach((item) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('.history-title').textContent = item.title;
    node.querySelector('.history-time').textContent = new Date(item.timestamp).toLocaleString('zh-CN');
    node.querySelector('.history-body').textContent = item.body;
    els['history-list'].appendChild(node);
  });
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
  const summary = gatherSummary();
  try {
    await navigator.clipboard.writeText(summary);
    alert('结果摘要已复制到剪贴板。');
  } catch (error) {
    alert(`复制失败，请手动复制：\n${summary}`);
  }
}

function gatherSummary() {
  const blocks = [
    `功率模块：${els['motor-power-output'].innerText.trim()}`,
    `减速模块：${els['gear-output'].innerText.trim()}`,
    `收线系统：${els['spool-output'].innerText.replace(/\s+/g, ' ').trim()}`
  ];
  return blocks.join('\n');
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}
