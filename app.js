const mddInput = document.getElementById("mdd");
const rowsInput = document.getElementById("rows");
const mddError = document.getElementById("mddError");
const rowsError = document.getElementById("rowsError");
const mdd95Display = document.getElementById("mdd95");
const generateBtn = document.getElementById("generateBtn");
const dataBody = document.getElementById("dataBody");

const FIXED_M_PERCENT = 12;

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
    const mPercent = FIXED_M_PERCENT;
    const m = Math.round(dd * mPercent / 100);
    const wd = dd + m;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${wd}</td>
      <td>${dd}</td>
      <td>${m}</td>
      <td>${mPercent}</td>
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
