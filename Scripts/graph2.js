// ==============================
// Graph 2 (Sensor 2) — linear x-axis, integer-aligned ticks
// 300-pt rolling window, °C/°F toggle, session-persist per tab
// Simulated vs Real data: switch inside the live loop.
// ==============================

const MAX_POINTS = 300;
const S_KEY   = "graph2_session_state_linear_v3";
const S_START = "global_session_start_ts_v1";
var sent = false;


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

// ---------- REAL sensor (ACTIVE) ----------

async function getMostRecentData() {
  try {
    const r = await fetch('/Scripts/temp2.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const recent = j.readings[j.readings.length - 1];
    console.log("Recent data from sensor 2:", recent); // Fixed: changed print to console.log
    console.log(sent);
    if (recent.temperature >= 50 && !sent){
        send_warning("Warning: High temperature detected from Sensor 2: " + recent.temperature + "°C");
        console.log("Warning: High temperature detected from Sensor 2: " + recent.temperature + "°C");
        sent = true;
    }
    else if (recent.temperature <= 10 && !sent){
        send_warning("Warning: Low temperature detected from Sensor 2: " + recent.temperature + "°C");
        console.log("Warning: Low temperature detected from Sensor 2: " + recent.temperature + "°C");
        sent = true;
    }
    else{
        if (recent.temperature > 10 && recent.temperature < 50){
            sent = false;
        }
    }
    return recent.temperature; // °C
  } catch (err) {
    console.error("Sensor1 read failed:", err.message);
    return null;
  }
}


// ---------- SIMULATION (COMMENTED OUT) ----------
/*
function simCelsiusAt(t) {
  const base  = 27.5 + 4.6 * Math.sin((t / 28) * 2 * Math.PI);
  const noise = (Math.random() - 0.5) * 1.4;
  let v = base + noise;
  v = Math.max(10, Math.min(50, v)); // Updated range
  return Math.round(v * 100) / 100;
}
*/

// ---------- unit helpers ----------
const cToF = c => (c * 9/5) + 32;
const fToC = f => (f - 32) * 5/9;

function applyYAxisForUnit(chart, unit) {
  const y = chart.options.scales.y;
  y.title.text = `Temperature (°${unit})`;
  if (unit === "C") { 
    y.min = 10; 
    y.max = 50; 
    y.ticks.stepSize = 2; // Adjusted step size for larger range
  } else { 
    y.min = 50; 
    y.max = 122; 
    y.ticks.stepSize = 5; // Adjusted step size for larger range
  }
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

document.addEventListener("DOMContentLoaded", async () => {
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
          min: 10, max: 50, ticks: { stepSize: 2 } // Updated initial range
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

  // ---- catch-up (REAL SENSOR) ----
  const nowT = Math.floor((Date.now() - startTs) / 1000);
  if (nowT > lastT) {
    for (let t = lastT + 1; t <= nowT; t++) {
      const c = await getMostRecentData();
      if (c == null) continue;
      const y = unit === "F" ? cToF(c) : c;
      data.datasets[0].data.push({ x: t, y });
    }
    lastT = nowT;
    updateWindowAndTicks();
    myChart.update("none");
    const storeC = data.datasets[0].data.map(p => unit === "F" ? fToC(p.y) : p.y);
    saveSession(storeC, lastT, unit);
  }

  // ---- live loop (REAL SENSOR) ----
  setInterval(async () => {
    const targetT = Math.floor((Date.now() - startTs) / 1000);
    if (targetT <= lastT) return;

    for (let t = lastT + 1; t <= targetT; t++) {
      // --- REAL SENSOR (ACTIVE) ---
      const c = await getMostRecentData(); 
      if (c == null) continue;

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

async function send_warning(message) {
    try {
        // Initialize EmailJS with your public key
        // Replace 'YOUR_PUBLIC_KEY' with your actual EmailJS public key
        emailjs.init("56zGufdKiLhdovH3I");
        
        const rsp = await fetch('/get-user');
        const userData = await rsp.json();
        if(!userData || !userData.email) {
            console.log("No user email found, cannot send warning.");
            return false;
        }
        const response = await emailjs.send("service_cgie0zm", "template_gvv12ma", {
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            message: message
        });
        console.log('warning email sent successfully!', response);
        return true;
    } catch (error) {
        console.error('Failed to send warning email:', error);
        return false;
    }
}