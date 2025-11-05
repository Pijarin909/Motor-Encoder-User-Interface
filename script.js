let port;
let writer;
let reader;
let keepReading = true;

let rpmChart;
let posChart;

// ==================== KONEKSI SERIAL ====================
document.getElementById("connect").addEventListener("click", async () => {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    writer = port.writable.getWriter();
    reader = port.readable.getReader();

    document.getElementById("status").textContent = "Terhubung ke Arduino ✅";
    initCharts();
    readSerialLoop();
  } catch (err) {
    console.error("Gagal konek:", err);
    alert("Tidak dapat terhubung ke Arduino!");
  }
});

// ==================== KIRIM DATA SERIAL ====================
async function sendCommand(cmd) {
  if (writer) {
    await writer.write(new TextEncoder().encode(cmd + "\n"));
    console.log("Kirim:", cmd);
  }
}

// ==================== LOOP PEMBACA SERIAL ====================
async function readSerialLoop() {
  while (port.readable && keepReading) {
    try {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const text = new TextDecoder().decode(value);
        parseSerialData(text);
      }
    } catch (err) {
      console.error("Error membaca serial:", err);
      break;
    }
  }
}

// ==================== PARSING DATA SERIAL ====================
function parseSerialData(data) {
  const lines = data.trim().split("\n");
  lines.forEach(line => {
    if (line.includes("RPM:")) {
      const rpmMatch = line.match(/RPM:([\d.]+)/);
      const posMatch = line.match(/POS:([\d.]+)/);
      const dirMatch = line.match(/DIR:(CW|CCW)/);

      const rpm = rpmMatch ? parseFloat(rpmMatch[1]) : 0;
      const pos = posMatch ? parseFloat(posMatch[1]) : 0;
      const dir = dirMatch ? dirMatch[1] : "CW";

      document.getElementById("rpm").textContent = rpm.toFixed(1);
      document.getElementById("pos").textContent = pos.toFixed(1);

      if (dir === "CW") {
        document.getElementById("cwButton").style.background = "#00b76e";
        document.getElementById("ccwButton").style.background = "#00d084";
      } else {
        document.getElementById("cwButton").style.background = "#00d084";
        document.getElementById("ccwButton").style.background = "#00b76e";
      }

      updateCharts(rpm, pos);
    }
  });
}

// ==================== EVENT TOMBOL ====================
document.getElementById("stopMotor").addEventListener("click", () => sendCommand("STOP"));
document.getElementById("resetSystem").addEventListener("click", () => sendCommand("RESET"));
document.getElementById("cwButton").addEventListener("click", () => sendCommand("DIR:CW"));
document.getElementById("ccwButton").addEventListener("click", () => sendCommand("DIR:CCW"));

document.getElementById("setRPM").addEventListener("click", () => {
  const rpm = document.getElementById("rpmValue").value;
  sendCommand(`RPM:${rpm}`);
});

document.getElementById("setAngle").addEventListener("click", () => {
  const angle = document.getElementById("angleInput").value;
  sendCommand(`POS:${angle}`);
});

document.getElementById("sendPID_RPM").addEventListener("click", () => {
  const kp = document.getElementById("kp_rpm").value;
  const ki = document.getElementById("ki_rpm").value;
  const kd = document.getElementById("kd_rpm").value;
  sendCommand(`PID_RPM:${kp},${ki},${kd}`);
});

document.getElementById("sendPID_POS").addEventListener("click", () => {
  const kp = document.getElementById("kp_pos").value;
  const ki = document.getElementById("ki_pos").value;
  const kd = document.getElementById("kd_pos").value;
  sendCommand(`PID_POS:${kp},${ki},${kd}`);
});

// ==================== INISIALISASI GRAFIK ====================
function initCharts() {
  const ctx = document.getElementById("positionChart").getContext("2d");
  rpmChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "RPM (Kecepatan)",
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.1)",
          data: [],
          borderWidth: 2,
          tension: 0.3
        },
        {
          label: "Posisi (°)",
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.1)",
          data: [],
          borderWidth: 2,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: {
          title: { display: true, text: "Waktu (s)" }
        },
        y: {
          title: { display: true, text: "Nilai" }
        }
      }
    }
  });
}

// ==================== UPDATE GRAFIK ====================
let t = 0;
function updateCharts(rpm, pos) {
  if (!rpmChart) return;

  t += 0.2; // sesuai sample interval 200ms
  const maxPoints = 50;

  rpmChart.data.labels.push(t.toFixed(1));
  rpmChart.data.datasets[0].data.push(rpm);
  rpmChart.data.datasets[1].data.push(pos);

  if (rpmChart.data.labels.length > maxPoints) {
    rpmChart.data.labels.shift();
    rpmChart.data.datasets[0].data.shift();
    rpmChart.data.datasets[1].data.shift();
  }

  rpmChart.update("none");
}
