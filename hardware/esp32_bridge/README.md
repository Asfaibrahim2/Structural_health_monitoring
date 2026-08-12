# InfraShield ESP32 Bridge Telemetry Prototype

> [!WARNING]
> **Educational Disclaimer**: This hardware implementation is an educational prototype and decision-support demonstration. It is **NOT** a certified structural safety monitoring device, and must **never** be used to assess the safety, integrity, or load limits of real-world infrastructure.

This folder contains the firmware and documentation for the independent ESP32 structural telemetry bridge. It communicates with local sensors, evaluates baseline deviation, triggers local LED/buzzer alarms, and outputs CSV logs over the USB serial interface.

---

## 1. Hardware Pin Configurations & Wiring Diagram

The prototype is designed for an **ESP32 DevKit V1 (30-pin or 38-pin)**. Connect the modules according to the following safe configuration:

| Component | Pin (Module) | ESP32 Pin | Purpose / Notes |
| :--- | :--- | :--- | :--- |
| **MPU6050 Accelerometer** | VCC | 3.3V | I2C Power (3.3V recommended) |
| | GND | GND | Common Ground |
| | SDA | GPIO 21 | I2C Data (with pullups if necessary) |
| | SCL | GPIO 22 | I2C Clock |
| **HC-SR04 Ultrasonic** | VCC | 5V / VIN | Power (Ultrasonic requires 5V to drive pulse) |
| | GND | GND | Common Ground |
| | Trig | GPIO 18 | Trigger Output Pulse |
| | Echo | GPIO 19 | Echo Input Pulse (Use level shifter or 1k res divider) |
| **SSD1306 OLED (128x64)** | VCC | 3.3V | Power |
| | GND | GND | Common Ground |
| | SDA | GPIO 21 | Share I2C Data line |
| | SCL | GPIO 22 | Share I2C Clock line |
| **Status LEDs** | Green (+) | GPIO 14 | Normal Indicator (via 220Ω resistor) |
| | Yellow (+) | GPIO 27 | Warning Indicator (via 220Ω resistor) |
| | Red (+) | GPIO 26 | Critical Indicator (via 220Ω resistor) |
| **Buzzer** | Active (+) | GPIO 25 | Audio alarm driver (Direct pin drive) |
| **Push Button** | Pin 1 | GPIO 12 | Mode Selector Switch |
| | Pin 2 | GND | Triggers pullup transition on press |

---

## 2. Operation Modes & Stepping

A push button on **GPIO 12** cycles the prototype through 4 distinct operational states. Pressing the button debounces the input and transitions states sequentially:

1. **`LIVE_SENSOR_MODE`**:
   * Reads real-time acceleration data from the MPU6050 and distance telemetry from the HC-SR04.
   * Compares readings against local configurable baseline parameters.
   * Evaluates the risk indicator dynamically.
2. **`NORMAL_DEMO_MODE`**:
   * Bypasses sensor inputs and generates a static Normal simulation pattern.
   * Risk: `12.0/100` (Status: Normal, Green LED = ON).
   * OLED display shows `DEMO (Normal)` label.
3. **`WARNING_DEMO_MODE`**:
   * Bypasses sensor inputs and generates a Warning simulation pattern.
   * Risk: `48.0/100` (Status: Warning, Yellow LED = ON, Buzzer emits intermittent warning tone).
   * OLED display shows `DEMO (Warning)` label.
4. **`HIGH_RISK_DEMO_MODE`**:
   * Bypasses sensor inputs and generates a Critical risk pattern.
   * Risk: `86.0/100` (Status: Critical, Red LED = ON, Buzzer emits rapid alarm tone).
   * OLED display shows `DEMO (Critical)` label.

---

## 3. Telemetry Smoothing & Baseline Calibration

### Smoothing (Moving Average)
* Accelerometer readings suffer from mechanical high-frequency noise. The firmware applies a **10-sample moving average window** to filter raw acceleration fluctuations, outputting smoothed vibration magnitudes.

### Calibration Instructions
1. **Mechanical Mount**: Securely fasten the MPU6050 accelerometer to the target physical model (e.g., bridge deck) to prevent transient sensor wobble.
2. **Determine Zero-State baseline**:
   * Put the model in a static state (no external vibration or traffic loads).
   * Observe the vibration logs output on the USB Serial Monitor.
   * Note the average vibration magnitude (e.g., `0.015g`).
3. **Configure Code parameters**:
   * Set `baselineVibration` in the code to your observed value.
   * Measure the nominal vertical clearance using the ultrasonic sensor. Update `baselineDisplacement` in the code to match this nominal distance (e.g., `50.0mm`).
4. **Deviation Scaling**:
   * Deviations in vibration scale linearly at a factor of `400.0` points per `g`.
   * Deviations in displacement scale at `3.0` points per `mm`.
   * Modify these scales in the main loop of the sketch to adjust model sensitivity.

---

## 4. Guardrails & Fault Tolerance

* **Button Debouncing**: The hardware button is protected from transient mechanical bounce using a software debounce lock. Input status changes are locked for `250ms` following a valid mode change.
* **Sensor-Failure Fallback**: If the MPU6050 accelerometer fails to initialize or is hot-unplugged, the firmware intercepts the `I2C` timeout and falls back to a simulated baseline value (`0.012g`), preventing program lockups and displaying warning notifications over the serial interface.
* **CSV Logging Format**: The serial interface streams formatted CSV metrics at 115200 baud for capture by database gateways:
  ```csv
  timestamp_ms,vibration_g,displacement_mm,risk,status,mode
  45203,0.012,45.2,12.0,Normal,Live
  ```
