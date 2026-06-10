const mddInput = document.getElementById("mdd");
const rowsInput = document.getElementById("rows");
const gsInput = document.getElementById("gs");
const ddMinPercentInput = document.getElementById("ddMinPercent");
const ddMaxPercentInput = document.getElementById("ddMaxPercent");

const mddError = document.getElementById("mddError");
const rowsError = document.getElementById("rowsError");
const gsError = document.getElementById("gsError");
const ddMinError = document.getElementById("ddMinError");
const ddMaxError = document.getElementById("ddMaxError");

const mdd95Display = document.getElementById("mdd95");
const generateBtn = document.getElementById("generateBtn");
const dataBody = document.getElementById("dataBody");
const chartCanvas = document.getElementById("relationshipChart");
const chartContext = chartCanvas.getContext("2d");

const WATER_DENSITY_MG_M3 = 1.0;
const AIR_VOIDS = 0.05;

// Higher values push generated moisture closer to the saturation line.
// Lower values keep generated moisture closer to the 5% air voids curve.
const MOISTURE_BIAS_MIN = 0.15;
const MOISTURE_BIAS_MAX = 0.30;

let generatedPoints = [];

function validateMdd() {
  const value = mddInput.value.trim();

  if (!/^\d{4}$/.test(value)) {
    mddError.textContent = "MDD must be a 4-digit integer in kg/m³. Example: 1914.";
    mdd95Display.textContent = "95% MDD: —";
    return null;
  }

  const mdd = Number(value);
  const mdd95 = Math.round(mdd * 0.95);

  mddError.textContent = "";
  mdd95Display.textContent = `95% MDD: ${mdd95} kg/m³`;

  return mdd;
}

function validateRows() {
  const value = rowsInput.value.trim();
  const rows = Number(value);

  if (!Number.isInteger(rows) || rows < 1 || rows > 500) {
    rowsError.textContent = "Number of rows must be an integer between 1 and 500.";
    return null;
  }

  rowsError.textContent = "";
  return rows;
}

function validateAdvancedOptions() {
  const gs = Number(gsInput.value);
  const ddMinPercent = Number(ddMinPercentInput.value);
  const ddMaxPercent = Number(ddMaxPercentInput.value);

  let valid = true;

  if (!Number.isFinite(gs) || gs < 2.0 || gs > 3.2) {
    gsError.textContent = "Gs must be between 2.00 and 3.20.";
    valid = false;
  } else {
    gsError.textContent = "";
  }

  if (!Number.isFinite(ddMinPercent) || ddMinPercent < 80 || ddMinPercent > 120) {
    ddMinError.textContent = "DD min must be between 80% and 120%.";
    valid = false;
  } else {
    ddMinError.textContent = "";
  }

  if (!Number.isFinite(ddMaxPercent) || ddMaxPercent < 80 || ddMaxPercent > 120) {
    ddMaxError.textContent = "DD max must be between 80% and 120%.";
    valid = false;
  } else if (Number.isFinite(ddMinPercent) && ddMaxPercent <= ddMinPercent) {
    ddMaxError.textContent = "DD max must be greater than DD min.";
    valid = false;
  } else {
    ddMaxError.textContent = "";
  }

  if (!valid) return null;
  return { gs, ddMinPercent, ddMaxPercent };
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dryDensityMgFromMoisture(moisturePercent, gs, airVoids) {
  return (gs * WATER_DENSITY_MG_M3 * (1 - airVoids)) /
    (1 + (moisturePercent / 100) * gs);
}

function moistureFromDryDensity(ddMgM3, gs, airVoids) {
  return 100 * (((gs * WATER_DENSITY_MG_M3 * (1 - airVoids)) / ddMgM3) - 1) / gs;
}

function getMoistureRange(ddKgM3, gs) {
  const ddMgM3 = ddKgM3 / 1000;

  const moistureAtSaturation = moistureFromDryDensity(ddMgM3, gs, 0);
  const moistureAtFivePercentAirVoids = moistureFromDryDensity(ddMgM3, gs, AIR_VOIDS);

  return {
    minM: Math.min(moistureAtFivePercentAirVoids, moistureAtSaturation),
    maxM: Math.max(moistureAtFivePercentAirVoids, moistureAtSaturation)
  };
}

function generateMoisturePercent(ddKgM3, gs) {
  const { minM, maxM } = getMoistureRange(ddKgM3, gs);
  const range = maxM - minM;

  const bias = MOISTURE_BIAS_MIN + Math.random() * (MOISTURE_BIAS_MAX - MOISTURE_BIAS_MIN);
  const randomNoise = (Math.random() - 0.5) * 0.20 * range;
  const value = minM + range * bias + randomNoise;

  const clamped = Math.max(minM, Math.min(maxM, value));
  return Math.round(clamped * 10) / 10;
}

function generateCurveData(gs) {
  const points = [];

  for (let moisture = 5; moisture <= 35.0001; moisture += 0.25) {
    points.push({
      moisture: Math.round(moisture * 100) / 100,
      saturation: dryDensityMgFromMoisture(moisture, gs, 0),
      fiveAirVoids: dryDensityMgFromMoisture(moisture, gs, AIR_VOIDS)
    });
  }

  return points;
}

function generateData() {
  const mdd = validateMdd();
  const rows = validateRows();
  const advanced = validateAdvancedOptions();

  if (!mdd || !rows || !advanced) return;

  const { gs, ddMinPercent, ddMaxPercent } = advanced;
  const ddMin = Math.round(mdd * ddMinPercent / 100);
  const ddMax = Math.round(mdd * ddMaxPercent / 100);

  dataBody.innerHTML = "";
  generatedPoints = [];

  for (let i = 0; i < rows; i++) {
    const dd = randomInteger(ddMin, ddMax);
    const mPercent = generateMoisturePercent(dd, gs);
    const m = Math.round(dd * mPercent / 100);
    const wd = dd + m;

    generatedPoints.push({ moisture: mPercent, dryDensity: dd / 1000 });

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${wd}</td>
      <td>${dd}</td>
      <td>${m}</td>
      <td>${mPercent.toFixed(1)}</td>
    `;
    dataBody.appendChild(tr);
  }

  drawChart(gs, generatedPoints);
}

function drawChart(gs, points = []) {
  const curveData = generateCurveData(gs);
  const canvas = chartCanvas;
  const ctx = chartContext;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const margin = { top: 36, right: 24, bottom: 70, left: 74 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const allDryDensities = [
    ...curveData.map(point => point.saturation),
    ...curveData.map(point => point.fiveAirVoids),
    ...points.map(point => point.dryDensity)
  ];

  const xMin = 5;
  const xMax = 35;
  const yMin = Math.max(1.20, Math.floor((Math.min(...allDryDensities) - 0.05) * 10) / 10);
  const yMax = Math.min(2.50, Math.ceil((Math.max(...allDryDensities) + 0.05) * 10) / 10);

  function xScale(x) {
    return margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  }

  function yScale(y) {
    return margin.top + ((yMax - y) / (yMax - yMin)) * plotHeight;
  }

  function drawLine(pointsArray, yKey, strokeStyle, lineWidth) {
    ctx.beginPath();
    pointsArray.forEach((point, index) => {
      const x = xScale(point.moisture);
      const y = yScale(point[yKey]);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#374151";
  ctx.font = "14px system-ui, sans-serif";

  for (let x = 5; x <= 35; x += 5) {
    const px = xScale(x);
    ctx.beginPath();
    ctx.moveTo(px, margin.top);
    ctx.lineTo(px, margin.top + plotHeight);
    ctx.stroke();
    ctx.fillText(String(x), px - 8, margin.top + plotHeight + 28);
  }

  for (let y = Math.ceil(yMin * 10) / 10; y <= yMax + 0.0001; y += 0.1) {
    const py = yScale(y);
    ctx.beginPath();
    ctx.moveTo(margin.left, py);
    ctx.lineTo(margin.left + plotWidth, py);
    ctx.stroke();
    ctx.fillText(y.toFixed(1), 24, py + 5);
  }

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  ctx.stroke();

  const bandPath = new Path2D();
  curveData.forEach((point, index) => {
    const x = xScale(point.moisture);
    const y = yScale(point.saturation);
    if (index === 0) bandPath.moveTo(x, y);
    else bandPath.lineTo(x, y);
  });

  [...curveData].reverse().forEach(point => {
    bandPath.lineTo(xScale(point.moisture), yScale(point.fiveAirVoids));
  });

  bandPath.closePath();
  ctx.fillStyle = "rgba(20, 184, 166, 0.18)";
  ctx.fill(bandPath);

  drawLine(curveData, "saturation", "#0f766e", 2.5);
  drawLine(curveData, "fiveAirVoids", "#14b8a6", 2.5);

  points.forEach(point => {
    ctx.beginPath();
    ctx.arc(xScale(point.moisture), yScale(point.dryDensity), 4.2, 0, Math.PI * 2);
    ctx.fillStyle = "#111827";
    ctx.fill();
  });

  ctx.fillStyle = "#111827";
  ctx.font = "700 17px system-ui, sans-serif";
  ctx.fillText("Dry Density / Moisture Content Relationship", margin.left, 24);

  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText("Moisture Content (%)", margin.left + plotWidth / 2 - 62, height - 20);

  ctx.save();
  ctx.translate(18, margin.top + plotHeight / 2 + 68);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Dry Density (Mg/m³)", 0, 0);
  ctx.restore();

  const legendX = margin.left + plotWidth - 235;
  const legendY = margin.top + 12;
  ctx.font = "12px system-ui, sans-serif";

  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(legendX, legendY);
  ctx.lineTo(legendX + 28, legendY);
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.fillText("Saturation line / 0% air voids", legendX + 36, legendY + 4);

  ctx.strokeStyle = "#14b8a6";
  ctx.beginPath();
  ctx.moveTo(legendX, legendY + 22);
  ctx.lineTo(legendX + 28, legendY + 22);
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.fillText("5% air voids", legendX + 36, legendY + 26);

  ctx.beginPath();
  ctx.arc(legendX + 14, legendY + 44, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#111827";
  ctx.fill();
  ctx.fillText("Generated data", legendX + 36, legendY + 48);
}

mddInput.addEventListener("input", () => validateMdd());

[gsInput, ddMinPercentInput, ddMaxPercentInput].forEach(input => {
  input.addEventListener("input", () => {
    const advanced = validateAdvancedOptions();
    if (advanced) drawChart(advanced.gs, generatedPoints);
  });
});

generateBtn.addEventListener("click", generateData);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

drawChart(Number(gsInput.value), []);
