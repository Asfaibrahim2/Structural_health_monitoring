/*
 * InfraShield ESP32 Bridge Prototype
 * 
 * NOTE: This is an educational prototype and decision-support demonstration.
 * It is NOT a certified structural safety monitoring device. Do not use for safety-critical evaluations.
 * 
 * Hardware Layout:
 * - ESP32 Development Board
 * - MPU6050 accelerometer (I2C)
 * - HC-SR04 ultrasonic distance sensor (Trigger/Echo)
 * - SSD1306 OLED display (I2C)
 * - 3x LEDs (Green, Yellow, Red)
 * - Active Buzzer
 * - Push Button (Mode cycling)
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// --- Pin Configurations ---
#define BUTTON_PIN      12 // Push button (with internal pullup)
#define LED_GREEN       14 // Green LED (Normal state)
#define LED_YELLOW      27 // Yellow LED (Warning state)
#define LED_RED         26 // Red LED (High Risk state)
#define BUZZER_PIN      25 // Active Buzzer
#define HC_TRIGGER      18 // Trigger pin for HC-SR04
#define HC_ECHO         19 // Echo pin for HC-SR04

// --- OLED Parameters ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- Operation Modes ---
enum OperationMode {
  LIVE_SENSOR_MODE = 0,
  NORMAL_DEMO_MODE,
  WARNING_DEMO_MODE,
  HIGH_RISK_DEMO_MODE
};
OperationMode currentMode = LIVE_SENSOR_MODE;

// --- Baseline Parameters (Local Baseline) ---
float baselineVibration = 0.015; // g
float baselineDisplacement = 50.0; // mm

// --- Sensor Variables & Smoothing ---
float vibrationHistory[10] = {0};
int historyIndex = 0;
bool mpuInitialized = false;

// --- Debounce Variables ---
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 250; // ms

void setup() {
  Serial.begin(115200);
  
  // Pin modes
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(HC_TRIGGER, OUTPUT);
  pinMode(HC_ECHO, INPUT);

  // Initialize status pins
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize I2C and SSD1306 OLED
  Wire.begin();
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("[ERROR] SSD1306 OLED allocation failed"));
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0, 0);
    display.println(F("InfraShield ESP32"));
    display.println(F("Initializing..."));
    display.display();
  }

  // Initialize MPU6050
  Wire.beginTransmission(0x68);
  Wire.write(0x6B); // Power Management 1 register
  Wire.write(0);    // Wake up MPU6050
  byte error = Wire.endTransmission(true);
  
  if (error == 0) {
    mpuInitialized = true;
    Serial.println(F("[INFO] MPU6050 Initialized successfully"));
  } else {
    Serial.println(F("[WARNING] MPU6050 not found. Defaulting to Demo Mode fallback."));
  }
}

// --- Sensor Reading Methods ---
float readVibration() {
  if (!mpuInitialized) return 0.0;
  
  Wire.beginTransmission(0x68);
  Wire.write(0x3B); // Accel X raw register
  Wire.endTransmission(false);
  Wire.requestFrom(0x68, 6, true);
  
  int16_t ax = (Wire.read() << 8) | Wire.read();
  int16_t ay = (Wire.read() << 8) | Wire.read();
  int16_t az = (Wire.read() << 8) | Wire.read();

  // Convert to g-force (assume FS_SEL=0, +/-2g -> LSB factor 16384)
  float x_g = ax / 16384.0;
  float y_g = ay / 16384.0;
  float z_g = az / 16384.0;

  // Calculate vibration magnitude (high-pass filter offset subtracted roughly)
  float magnitude = sqrt(x_g*x_g + y_g*y_g + (z_g-1.0)*(z_g-1.0));
  
  // Apply Moving Average Smoothing
  vibrationHistory[historyIndex] = magnitude;
  historyIndex = (historyIndex + 1) % 10;
  
  float sum = 0;
  for (int i = 0; i < 10; i++) sum += vibrationHistory[i];
  return sum / 10.0;
}

float readDisplacement() {
  // Clear Trigger
  digitalWrite(HC_TRIGGER, LOW);
  delayMicroseconds(2);
  
  // Pulse trigger HIGH for 10us
  digitalWrite(HC_TRIGGER, HIGH);
  delayMicroseconds(10);
  digitalWrite(HC_TRIGGER, LOW);
  
  // Measure echo time in microseconds
  long duration = pulseIn(HC_ECHO, HIGH, 30000); // 30ms timeout
  if (duration == 0) return baselineDisplacement; // Sensor fallback if out of range
  
  // Calculate distance in mm
  // speed of sound = 343 m/s = 0.343 mm/us
  float distance = (duration * 0.343) / 2.0;
  return distance;
}

float readTemperature() {
  if (!mpuInitialized) return 0.0;
  
  Wire.beginTransmission(0x68);
  Wire.write(0x41); // Temperature register
  Wire.endTransmission(false);
  Wire.requestFrom(0x68, 2, true);
  
  int16_t temp_raw = (Wire.read() << 8) | Wire.read();
  // Formula from MPU6050 register map datasheet
  float temp_c = (temp_raw / 340.0) + 36.53;
  return temp_c;
}

void loop() {
  // 1. Debounce and Cycle Button State
  int buttonState = digitalRead(BUTTON_PIN);
  if (buttonState == LOW && (millis() - lastDebounceTime > debounceDelay)) {
    lastDebounceTime = millis();
    int nextMode = (int)currentMode + 1;
    if (nextMode > 3) nextMode = 0;
    currentMode = (OperationMode)nextMode;
    Serial.print(F("[INFO] Mode cycled to: "));
    Serial.println(currentMode);
  }

  // 2. Fetch or Simulate Parameters based on Mode
  float vibration = 0.0;
  float displacement = 0.0;
  float temperature = 0.0;
  float risk = 0.0;
  String status = "Normal";
  String modeLabel = "Live";

  if (currentMode == LIVE_SENSOR_MODE) {
    if (mpuInitialized) {
      vibration = readVibration();
      temperature = readTemperature();
    } else {
      // Automatic sensor fallback if hardware disconnected
      vibration = 0.012;
      temperature = 25.5;
    }
    displacement = readDisplacement();
    
    // Simple local baseline comparison & risk model
    float vib_delta = max(0.0f, vibration - baselineVibration);
    float disp_delta = abs(displacement - baselineDisplacement);
    
    float vib_risk = vib_delta * 400.0; // scale vibration factor
    float disp_risk = disp_delta * 3.0;  // scale displacement deviation factor
    
    risk = min(100.0f, max(0.0f, vib_risk + disp_risk));
    modeLabel = "Live";
  }
  else if (currentMode == NORMAL_DEMO_MODE) {
    vibration = 0.012;
    displacement = 45.2;
    temperature = 24.5;
    risk = 12.0;
    modeLabel = "Demo (Normal)";
  }
  else if (currentMode == WARNING_DEMO_MODE) {
    vibration = 0.042;
    displacement = 52.8;
    temperature = 26.2;
    risk = 48.0;
    modeLabel = "Demo (Warning)";
  }
  else if (currentMode == HIGH_RISK_DEMO_MODE) {
    vibration = 0.088;
    displacement = 62.4;
    temperature = 28.9;
    risk = 86.0;
    modeLabel = "Demo (Critical)";
  }

  // Define Status from Risk Boundaries
  if (risk >= 70.0) {
    status = "Critical";
  } else if (risk >= 35.0) {
    status = "Warning";
  } else {
    status = "Normal";
  }

  // 3. Control Alarm Output (LEDs and Buzzer)
  if (status == "Critical") {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_RED, HIGH);
    
    // Rapid beep for Critical
    int toneHz = (currentMode == LIVE_SENSOR_MODE) ? 3000 : 2500;
    tone(BUZZER_PIN, toneHz, 80);
  } 
  else if (status == "Warning") {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_YELLOW, HIGH);
    digitalWrite(LED_RED, LOW);
    
    // Slow beep alert
    if ((millis() / 1000) % 2 == 0) {
      tone(BUZZER_PIN, 1800, 30);
    } else {
      noTone(BUZZER_PIN);
    }
  } 
  else {
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_RED, LOW);
    noTone(BUZZER_PIN);
  }

  // 4. Update SSD1306 OLED Display
  display.clearDisplay();
  display.setCursor(0, 0);
  
  // Header
  display.setTextSize(1);
  display.print(F("MODE: "));
  display.println(modeLabel);
  display.println(F("---------------------"));
  
  // Metrics
  display.print(F("Vib Magnitude: "));
  display.print(vibration, 4);
  display.println(F(" g"));
  
  display.print(F("Distance:      "));
  display.print(displacement, 1);
  display.println(F(" mm"));

  display.print(F("Temp (MPU):    "));
  display.print(temperature, 1);
  display.println(F(" C"));
  
  display.println(F("---------------------"));
  display.print(F("RISK: "));
  display.print(risk, 1);
  display.print(F(" ("));
  display.print(status);
  display.println(F(")"));
  
  display.display();

  // 5. Output CSV over Serial Link
  // format: timestamp_ms,vibration_g,displacement_mm,risk,status,mode
  Serial.print(millis());
  Serial.print(F(","));
  Serial.print(vibration, 4);
  Serial.print(F(","));
  Serial.print(displacement, 2);
  Serial.print(F(","));
  Serial.print(risk, 1);
  Serial.print(F(","));
  Serial.print(status);
  Serial.print(F(","));
  Serial.println(modeLabel);

  delay(150); // Loop pacing
}
