// ==============================
// Graph 1 (Sensor 1) — linear x-axis, integer-aligned ticks
// 300-pt rolling window, °C/°F toggle, session-persist per tab
// Simulated vs Real data: switch inside the live loop.
// ==============================

const MAX_POINTS = 300;
const S_KEY   = "graph1_session_state_linear_v3";
const S_START = "global_session_start_ts_v1";
var sent = false;

// ---------- persistence ----------
function saveSession(pointsCelsius, lastT, unit) {
  try { sessionStorage.setItem(S_KEY, JSON.stringify({ pointsCelsius, lastT, unit })); }
  catch (e) { console.warn("graph1 save failed:", e); }
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

function getLastSavedUnit() {
  const s = loadSession();
  return s?.unit || "C";
}

function isTemperatureValid(temp) {
  return temp !== 'nan' && temp !== 'off' && !isNaN(temp) && isFinite(temp);
}

// ---------- REAL sensor (ACTIVE) ----------

async function getMostRecentData() {
  try {
    const r = await fetch('/Scripts/temp1.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const recent = j.readings[j.readings.length - 1];
    const temp1john = document.getElementById("temp1");
    
    if (temp1john) {
      if (isTemperatureValid(recent.temperature)) {
        if (getLastSavedUnit() === "F") {
          temp1john.textContent = (recent.temperature * 9/5 + 32).toFixed(2) + "°F";
        } else {
          temp1john.textContent = recent.temperature + "°C";
        }
      } else {
        if (recent.temperature === 'off') {
          temp1john.textContent = "Device Unplugged";
        } else if (recent.temperature === 'nan') {
          temp1john.textContent = "No data available";
        } else {
          temp1john.textContent = "No data available";
        }
    }
  }
    
    // nan - no data available
    // 8fc - device unplugged
    //console.log("Recent data from sensor 1:", recent);
    
    // Only send warnings for valid temperature values
    if (isTemperatureValid(recent.temperature)) {
      if (recent.temperature >= 50 && !sent) {
        send_warning("Warning: High temperature detected from Sensor 1: " + recent.temperature + "°C");
        console.log("Warning: High temperature detected from Sensor 1: " + recent.temperature + "°C");
        sent = true;
      } else if (recent.temperature <= 10 && !sent) {
        send_warning("Warning: Low temperature detected from Sensor 1: " + recent.temperature + "°C");
        console.log("Warning: Low temperature detected from Sensor 1: " + recent.temperature + "°C");
        sent = true;
      }
    }

    return recent.temperature; // °C or 'nan'
  } catch (err) {
    console.error("Sensor1 read failed:", err.message);
    return null;
  }
}

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
    ds.data = ds.data.map(p => ({ 
      x: p.x, 
      y: isTemperatureValid(p.y) ? cToF(p.y) : p.y 
    }));
    ds.label = "Temperature (°F)";
  } else {
    ds.data = ds.data.map(p => ({ 
      x: p.x, 
      y: isTemperatureValid(p.y) ? fToC(p.y) : p.y 
    }));
    ds.label = "Temperature (°C)";
  }
  applyYAxisForUnit(chart, nextUnit);
}

async function toggleUnit() {
    try {
        // Always set power to 1, ignore current state
        const powerData = { power: 1 , units1: "celsius", units2: "celsius"};
        
        console.log('Setting power to ON (1)');
        
        // Update the JSON file on the server
        const updateResponse = await fetch('/update-power', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(powerData)
        });
        const userExists = await checkUserExists(email);
        if( userExists){
        if (updateResponse.ok) {
            const result = await updateResponse.json();
            console.log(`Power set to ON - ${result.message}`);
            
            // Update button text
            const powerBtn = document.getElementById("power");

            if (powerBtn) {
                powerBtn.textContent = `Power: ON`;
            }
        } else {
            const errorText = await updateResponse.text();
            console.error('Failed to update power state:', updateResponse.status, errorText);
        }
    }   else{
        alert('Please enter your information and save before setting power.');
    }
    
        
    } catch (error) {
        console.error('Error setting power:', error);
    }
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
      dsData.push({ 
        x, 
        y: (unit === "F" && isTemperatureValid(yC)) ? cToF(yC) : yC 
      });
    }
  }

  const data = {
    datasets: [{
      label: unit === "F" ? "Temperature (°F)" : "Temperature (°C)",
      data: dsData,
      parsing: false,
      borderColor: "rgba(99, 169, 255, 1)",
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
      const y = (unit === "F" && isTemperatureValid(c)) ? cToF(c) : c;
      data.datasets[0].data.push({ x: t, y });
    }
    lastT = nowT;
    updateWindowAndTicks();
    myChart.update("none");
    const storeC = data.datasets[0].data.map(p => 
      (unit === "F" && isTemperatureValid(p.y)) ? fToC(p.y) : p.y
    );
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

      const y = (unit === "F" && isTemperatureValid(c)) ? cToF(c) : c;
      data.datasets[0].data.push({ x: t, y });
    }
    lastT = targetT;

    updateWindowAndTicks();
    myChart.update("none");

    const storeC = data.datasets[0].data.map(p => 
      (unit === "F" && isTemperatureValid(p.y)) ? fToC(p.y) : p.y
    );
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
      const storeC = data.datasets[0].data.map(p => 
        (unit === "F" && isTemperatureValid(p.y)) ? fToC(p.y) : p.y
      );
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

function toggleUnit() {
    // Toggle the unit
    unit = (unit === "C") ? "F" : "C";
    
    // Update the chart display
    setUnit(myChart, data, unit);
    
    // Update the button text
    const btn = document.getElementById("toggleUnit");
    if (btn) {
        btn.innerText = unit === "C" ? "Switch to °F" : "Switch to °C";
    }
    
    // Update chart ticks and refresh
    updateWindowAndTicks();
    myChart.update("none");
    
    // Convert data for storage
    const storeC = data.datasets[0].data.map(p => 
        (unit === "F" && isTemperatureValid(p.y)) ? fToC(p.y) : p.y
    );
    
    // Save to session storage
    saveSession(storeC, lastT, unit);
    
    // Update power.json with the new unit setting
    updatePowerJsonUnit(unit);
}

function updatePowerJsonUnit(newUnit) {
    // Convert to the format used in power.json
    const unitValue = newUnit === "C" ? "celsius" : "fahrenheit";
    const powerData = {
        "unit1": unitValue  // This will update unit1 in your power.json
    };
    
    // Use your existing server endpoint
    fetch('/update-power-json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(powerData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update unit preference');
        }
        return response.json();
    })
    .then(data => {
        console.log('Unit preference saved to power.json:', data);
    })
    .catch(error => {
        console.error('Error saving unit preference:', error);
    });
}

// Initialize the button
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById("toggleUnit");
    if (btn) {
        // Set initial button text
        btn.innerText = unit === "C" ? "Switch to °F" : "Switch to °C";
        
        // Add click event listener
        btn.addEventListener("click", toggleUnit);
    }
});