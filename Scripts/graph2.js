// ==============================
// Graph 2 (Sensor 2) — linear x-axis, integer-aligned ticks
// 300-pt rolling window, °C/°F toggle, session-persist per tab
// Simulated vs Real data: switch inside the live loop.
// ==============================

const MAX_POINTS = 300;
const S_KEY   = "graph2_session_state_linear_v3";
const S_START = "global_session_start_ts_v1";

// ---------- persistence ----------
function saveSession(pointsCelsius, lastT, unit) {
  try { sessionStorage.setItem(S_KEY, JSON.stringify({ pointsCelsius, lastT, unit })); }
  catch (e) { console.warn("graph2 save failed:", e); }
}
function loadSession() {
  try {
    const raw = sessionStorage.getItem(S_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!Array.isArray(obj.pointsCelsius)) return null;
    return obj;
  } catch { return null; }
}
function getSessionStartTs() {
  let ts = sessionStorage.getItem(S_START);
  if (!ts) { ts = Date.now().toString(); sessionStorage.setItem(S_START, ts); }
  return Number(ts);
}

// ---------- REAL sensor (comment if sim only) ----------
/*
async function getMostRecentData() {
  try {
    const r = await fetch('/Scripts/temp2.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const recent = j.readings[j.readings.length - 1];
    return recent.temperature; // °C
  } catch (err) {
    console.error("Sensor2 read failed:", err.message);
    return null;
  }
}
*/

// ---------- SIMULATION (comment if using real) ----------
function simCelsiusAt(t) {
  const base  = 27.5 + 4.6 * Math.sin((t / 28) * 2 * Math.PI);
  const noise = (Math.random() - 0.5) * 1.4;
  let v = base + noise;
  v = Math.max(20, Math.min(35, v));
  return Math.round(v * 100) / 100;
}

// ---------- unit helpers ----------
const cToF = c => (c * 9/5) + 32;
const fToC = f => (f - 32) * 5/9;

function applyYAxisForUnit(chart, unit) {
  const y = chart.options.scales.y;
  y.title.text = `Temperature (°${unit})`;
  if (unit === "C") { y.min = 20; y.max = 35; y.ticks.stepSize = 1; }
  else { y.min = 68; y.max = 95; y.ticks.stepSize = 2; }
}
function setUnit(chart, data, nextUnit) {
  const ds = data.datasets[0];
  if (nextUnit === "F") {
    ds.data = ds.data.map(p => ({ x: p.x, y: cToF(p.y) }));
    ds.label = "Temperature (°F)";
  } else {
    ds.data = ds.data.map(p => ({ x: p.x, y: fToC(p.y) }));
    ds.label = "Temperature (°C)";
  }
  applyYAxisForUnit(chart, nextUnit);
}

// ---------- ticks ----------
function calcTickStep(range) {
  if (range <= 25)  return 1;
  if (range <= 60)  return 2;
  if (range <= 120) return 5;
  return 10;
}

document.addEventListener("DOMContentLoaded", () => {
  const ctx     = document.getElementById("myChart").getContext("2d");
  const startTs = getSessionStartTs();

  const saved = loadSession();
  let unit  = saved?.unit || "C";
  let lastT = (saved && Number.isFinite(saved.lastT)) ? saved.lastT : -1;

  const dsData = [];
  if (saved && saved.pointsCelsius.length) {
    const len = saved.pointsCelsius.length;
    const first = Math.max(0, lastT - (len - 1));
    for (let i = 0; i < len; i++) {
      const x = first + i;
      const yC = saved.pointsCelsius[i];
      dsData.push({ x, y: unit === "F" ? cToF(yC) : yC });
    }
  }

  const data = {
    datasets: [{
      label: unit === "F" ? "Temperature (°F)" : "Temperature (°C)",
      data: dsData,
      parsing: false,
      borderColor: "rgba(255,99,132,1)",
      backgroundColor: "rgba(255,99,132,0.1)",
      pointRadius: 3,
      tension: 0.15,
      fill: false,
    }],
  };

  const myChart = new Chart(ctx, {
    type: "line",
    data,
    options: {
      responsive: true,
      animation: false,
      plugins: { legend: { onClick: () => {} } },
      layout: { padding: { right: 12 } },
      scales: {
        x: {
          type: "linear",
          title: { display: true, text: "Time (s)" },
          ticks: {
            callback: (v) => Number.isInteger(v) ? v.toString() : "",
            precision: 0,
            maxRotation: 0,
            minRotation: 0,
          }
        },
        y: {
          title: { display: true, text: "Temperature (°C)" },
          min: 20, max: 35, ticks: { stepSize: 1 }
        }
      }
    }
  });
  applyYAxisForUnit(myChart, unit);

  // ---- window & ticks (no right gap, tick at current second) ----
  function updateWindowAndTicks() {
    const ds = data.datasets[0];
    if (ds.data.length > MAX_POINTS) ds.data = ds.data.slice(-MAX_POINTS);
    if (!ds.data.length) return;

    const lastX  = ds.data[ds.data.length - 1].x;
    const firstX = Math.max(0, lastX - (ds.data.length - 1));
    const rawRange = lastX - firstX;
    const step  = calcTickStep(rawRange);

    let minByGrid = lastX - Math.ceil(rawRange / step) * step;
    if (minByGrid < firstX) {
      const stepsNeeded = Math.ceil((lastX - firstX) / step);
      minByGrid = lastX - stepsNeeded * step;
      if (minByGrid < 0) minByGrid = 0;
    }

    const xScale = myChart.options.scales.x;
    xScale.min = minByGrid; // small left pad (< step)
    xScale.max = lastX;     // exact right edge at current second
    xScale.ticks.stepSize   = step;
    xScale.ticks.callback   = (v) => Number.isInteger(v) ? v.toString() : "";
    xScale.ticks.precision  = 0;
    xScale.ticks.maxRotation = 0;
    xScale.ticks.minRotation = 0;
  }

  // ---- catch-up (SIM) ----
  const nowT = Math.floor((Date.now() - startTs) / 1000);
  if (nowT > lastT) {
    for (let t = lastT + 1; t <= nowT; t++) {
      const c = simCelsiusAt(t);                  // <-- SIMULATED
      const y = unit === "F" ? cToF(c) : c;
      data.datasets[0].data.push({ x: t, y });
    }
    lastT = nowT;
    updateWindowAndTicks();
    myChart.update("none");
    const storeC = data.datasets[0].data.map(p => unit === "F" ? fToC(p.y) : p.y);
    saveSession(storeC, lastT, unit);
  }

  // ---- live loop ----
  setInterval(async () => {
    const targetT = Math.floor((Date.now() - startTs) / 1000);
    if (targetT <= lastT) return;

    for (let t = lastT + 1; t <= targetT; t++) {
      // --- SIMULATION (active) ---
      const c = simCelsiusAt(t);
      // --- REAL SENSOR (disabled) ---
      // const c = await getMostRecentData(); if (c == null) continue;

      const y = unit === "F" ? cToF(c) : c;
      data.datasets[0].data.push({ x: t, y });
    }
    lastT = targetT;

    updateWindowAndTicks();
    myChart.update("none");

    const storeC = data.datasets[0].data.map(p => unit === "F" ? fToC(p.y) : p.y);
    saveSession(storeC, lastT, unit);
  }, 500);

  // ---- unit toggle ----
  const btn = document.getElementById("toggleUnit");
  if (btn) {
    btn.innerText = unit === "C" ? "Switch to °F" : "Switch to °C";
    btn.addEventListener("click", () => {
      unit = (unit === "C") ? "F" : "C";
      setUnit(myChart, data, unit);
      btn.innerText = unit === "C" ? "Switch to °F" : "Switch to °C";
      updateWindowAndTicks();
      myChart.update("none");
      const storeC = data.datasets[0].data.map(p => unit === "F" ? fToC(p.y) : p.y);
      saveSession(storeC, lastT, unit);
    });
  }
});
