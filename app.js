const mddInput = document.getElementById("mdd");
const rowsInput = document.getElementById("rows");
const mddError = document.getElementById("mddError");
const rowsError = document.getElementById("rowsError");
const mdd95Display = document.getElementById("mdd95");
const generateBtn = document.getElementById("generateBtn");
const dataBody = document.getElementById("dataBody");

// Approximate internal table digitized manually from the green acceptable band.
// DD is stored in kg/m³. Moisture values are stored in percent.
const MOISTURE_BAND = [
  { dd: 2050, minM: 10.0, maxM: 11.0 },
  { dd: 2000, minM: 10.1, maxM: 12.0 },
  { dd: 1950, minM: 10.6, maxM: 13.0 },
  { dd: 1900, minM: 11.2, maxM: 14.0 },
  { dd: 1850, minM: 12.2, maxM: 15.4 },
  { dd: 1800, minM: 13.4, maxM: 16.8 },
  { dd: 1750, minM: 14.8, maxM: 18.4 },
  { dd: 1700, minM: 16.3, maxM: 20.1 },
  { dd: 1650, minM: 18.0, maxM: 22.0 },
  { dd: 1600, minM: 20.0, maxM: 24.0 }
];

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

  return { mdd, mdd95 };
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

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function interpolate(x, x1, y1, x2, y2) {
  if (x1 === x2) return y1;
  return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
}

function getMoistureRange(dd) {
  const band = MOISTURE_BAND.slice().sort((a, b) => b.dd - a.dd);

  if (dd >= band[0].dd) {
    return { minM: band[0].minM, maxM: band[0].maxM };
  }

  if (dd <= band[band.length - 1].dd) {
    return { minM: band[band.length - 1].minM, maxM: band[band.length - 1].maxM };
  }

  for (let i = 0; i < band.length - 1; i++) {
    const upper = band[i];
    const lower = band[i + 1];

    if (dd <= upper.dd && dd >= lower.dd) {
      return {
        minM: interpolate(dd, upper.dd, upper.minM, lower.dd, lower.minM),
        maxM: interpolate(dd, upper.dd, upper.maxM, lower.dd, lower.maxM)
      };
    }
  }

  return { minM: 12, maxM: 12 };
}

function generateMoisturePercent(dd) {
  const { minM, maxM } = getMoistureRange(dd);
  const range = maxM - minM;

  // Bias toward the centre-left of the green band.
  // This generates most values around 35% to 50% of the width of the range.
  const bias = 0.35 + Math.random() * 0.15;
  const randomNoise = (Math.random() - 0.5) * 0.25 * range;
  const value = minM + range * bias + randomNoise;

  const clamped = Math.max(minM, Math.min(maxM, value));
  return Math.round(clamped * 10) / 10;
}

function generateData() {
  const mddData = validateMdd();
  const rows = validateRows();

  if (!mddData || !rows) {
    return;
  }

  const { mdd, mdd95 } = mddData;
  dataBody.innerHTML = "";

  for (let i = 0; i < rows; i++) {
    const dd = randomInteger(mdd95, mdd);
    const mPercent = generateMoisturePercent(dd);
    const m = Math.round(dd * mPercent / 100);
    const wd = dd + m;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${wd}</td>
      <td>${dd}</td>
      <td>${m}</td>
      <td>${mPercent.toFixed(1)}</td>
    `;
    dataBody.appendChild(tr);
  }
}

mddInput.addEventListener("input", validateMdd);
generateBtn.addEventListener("click", generateData);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}
