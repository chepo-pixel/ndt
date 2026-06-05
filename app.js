const mddInput = document.getElementById("mdd");
const rowsInput = document.getElementById("rows");
const mddError = document.getElementById("mddError");
const rowsError = document.getElementById("rowsError");
const mdd95Display = document.getElementById("mdd95");
const generateBtn = document.getElementById("generateBtn");
const dataBody = document.getElementById("dataBody");

function validateMdd() {
  const value = mddInput.value.trim();

  if (!/^\d{4}$/.test(value)) {
    mddError.textContent = "La MDD debe ser un número entero de 4 dígitos en kg/m³. Ej: 1914.";
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
    rowsError.textContent = "La cantidad de filas debe ser un número entero entre 1 y 500.";
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

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td></td>
      <td>${dd}</td>
      <td></td>
      <td></td>
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
