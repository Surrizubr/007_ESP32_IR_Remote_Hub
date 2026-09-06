/*
 * ESP32 IR HUB - Firmware v6.1.0
 * Multi-Mode: BLE & WiFi (Concurrent & Persistent)
 * Optimized with FreeRTOS (Core 0: Web/WiFi, Core 1: IR/BLE)
 * Features: Enhanced BLE visibility, Heartbeat LED diagnostics, Persistent Reconnect.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebServer.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <IRrecv.h>
#include <IRsend.h>
#include <IRutils.h>

// --- Configuration ---
const int PIN_IR_RECV = 15;
const int PIN_IR_SEND = 4;
const int PIN_LED = 2; // Onboard Blue LED
const int PIN_BUZZER = 18;

// --- Persistent Storage ---
Preferences preferences;

// --- IR Instances ---
IRsend irsend(PIN_IR_SEND);
IRrecv irrecv(PIN_IR_RECV, 1024, 50, true);
decode_results results;

// --- WebServer ---
WebServer server(80);

// --- BLE UUIDs ---
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_TX   "beb5483e-36e1-4688-b7f5-ea07361b26a8" // App writes to ESP
#define CHARACTERISTIC_RX   "beb5483f-36e1-4688-b7f5-ea07361b26a8" // ESP notifies App
#define CHARACTERISTIC_WIFI "beb54841-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = NULL;
BLECharacteristic* pRxChar = NULL;
BLECharacteristic* pWifiChar = NULL;
bool deviceConnected = false;

// --- System State ---
String wifi_ssid = "";
String wifi_pass = "";
bool wifiConnected = false;
unsigned long lastHeartbeat = 0;

// --- Queue for IR Commands ---
struct IRCommand {
  char protocol[20];
  uint64_t hex;
  int bits;
};
QueueHandle_t irQueue;

// --- Helpers ---
void blinkLed(int times, int duration) {
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_LED, HIGH);
    delay(duration);
    digitalWrite(PIN_LED, LOW);
    if (i < times - 1) delay(duration);
  }
}

void handleHeartbeat() {
  unsigned long now = millis();
  if (WiFi.status() == WL_CONNECTED) {
    // Single pulse every 2s: Connected
    if (now - lastHeartbeat >= 2000) {
      digitalWrite(PIN_LED, HIGH);
      delay(30);
      digitalWrite(PIN_LED, LOW);
      lastHeartbeat = now;
    }
  } else {
    // Fast blinking: Disconnected/Connecting
    if (now - lastHeartbeat >= 500) {
      digitalWrite(PIN_LED, !digitalRead(PIN_LED));
      lastHeartbeat = now;
    }
  }
}

void processIRCommand(String json) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, json);
  if (error) return;

  IRCommand cmd;
  strlcpy(cmd.protocol, doc["protocol"] | "NEC", sizeof(cmd.protocol));
  cmd.hex = doc["hex"] | 0;
  cmd.bits = doc["bits"] | 32;

  xQueueSend(irQueue, &cmd, portMAX_DELAY);
}

// --- BLE Callbacks ---
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* s) { deviceConnected = true; Serial.println("BLE Connected"); }
    void onDisconnect(BLEServer* s) {
      deviceConnected = false;
      Serial.println("BLE Disconnected");
      BLEDevice::startAdvertising();
    }
};

class IRCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pChar) {
      String value = pChar->getValue().c_str();
      if (value.length() > 0) processIRCommand(value);
    }
};

class WiFiConfigCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pChar) {
      String value = pChar->getValue().c_str();
      JsonDocument doc;
      if (deserializeJson(doc, value) == DeserializationError::Ok) {
        String action = doc["action"] | "";

        if (action == "scan") {
          Serial.println("WiFi Scan Requested via BLE...");
          int n = WiFi.scanNetworks();
          for (int i = 0; i < n; i++) {
            JsonDocument response;
            response["type"] = "wifi_net";
            response["ssid"] = WiFi.SSID(i);
            response["rssi"] = WiFi.RSSI(i);
            response["secured"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
            response["channel"] = WiFi.channel(i);
            String out;
            serializeJson(response, out);
            pWifiChar->setValue(out.c_str());
            pWifiChar->notify();
            delay(20);
          }
          pWifiChar->setValue("{\"type\":\"wifi_done\"}");
          pWifiChar->notify();
          WiFi.scanDelete();
        }
        else if (action == "connect") {
          wifi_ssid = doc["ssid"].as<String>();
          wifi_pass = doc["password"].as<String>();

          preferences.begin("wifi", false);
          preferences.putString("ssid", wifi_ssid);
          preferences.putString("pass", wifi_pass);
          preferences.end();

          Serial.println("WiFi Credentials Saved. Connecting...");

          // Notify app that we are attempting connection
          JsonDocument response;
          response["status"] = "connecting";
          response["message"] = "Saved! Connecting to WiFi...";
          String out;
          serializeJson(response, out);
          pWifiChar->setValue(out.c_str());
          pWifiChar->notify();

          WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());
        }
      }
    }
};

// --- WebServer Handlers ---
void handleRoot() { server.send(200, "text/plain", "ESP32 IR HUB v6.1.0 Online"); }

void handleStatus() {
  JsonDocument doc;
  doc["status"] = "online";
  doc["wifi_mac"] = WiFi.macAddress();
  doc["ble_mac"] = BLEDevice::getAddress().toString().c_str();
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["firmware"] = "6.1.0";
  String out;
  serializeJson(doc, out);
  server.send(200, "application/json", out);
}

void handleIRSend() {
  if (server.hasArg("plain")) {
    processIRCommand(server.arg("plain"));
    server.send(200, "application/json", "{\"success\":true}");
  } else {
    server.send(400, "application/json", "{\"success\":false}");
  }
}

// --- Tasks ---
void taskWiFi(void* pvParameters) {
  server.on("/", handleRoot);
  server.on("/api/status", handleStatus);
  server.on("/api/ir/send", HTTP_POST, handleIRSend);
  server.begin();

  for (;;) {
    server.handleClient();
    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

void taskIR(void* pvParameters) {
  irrecv.enableIRIn();
  irsend.begin();

  IRCommand cmd;
  for (;;) {
    // Check for outgoing commands
    if (xQueueReceive(irQueue, &cmd, 10 / portTICK_PERIOD_MS) == pdTRUE) {
      digitalWrite(PIN_LED, HIGH);
      String proto = String(cmd.protocol);
      proto.toUpperCase();

      if (proto == "NEC") irsend.sendNEC(cmd.hex, cmd.bits);
      else if (proto == "SONY") irsend.sendSony(cmd.hex, cmd.bits);
      else if (proto == "SAMSUNG") irsend.sendSAMSUNG(cmd.hex, cmd.bits);
      else if (proto == "LG") irsend.sendLG(cmd.hex, cmd.bits);
      else irsend.sendNEC(cmd.hex, cmd.bits);

      delay(50);
      digitalWrite(PIN_LED, LOW);
    }

    // Check for incoming signals
    if (irrecv.decode(&results)) {
      digitalWrite(PIN_LED, HIGH);
      String protocol = typeToString(results.decode_type);
      char hex[20];
      sprintf(hex, "0x%llX", results.value);

      JsonDocument doc;
      doc["type"] = "rx";
      doc["protocol"] = protocol;
      doc["hex"] = hex;
      doc["bits"] = results.bits;
      String out;
      serializeJson(doc, out);

      if (deviceConnected) {
        pRxChar->setValue(out.c_str());
        pRxChar->notify();
      }

      Serial.printf("IR RX: %s %s\n", protocol.c_str(), hex);
      delay(100);
      digitalWrite(PIN_LED, LOW);
      irrecv.resume();
    }

    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);

  irQueue = xQueueCreate(10, sizeof(IRCommand));

  // Load Credentials
  preferences.begin("wifi", true);
  wifi_ssid = preferences.getString("ssid", "");
  wifi_pass = preferences.getString("pass", "");
  preferences.end();

  // Start WiFi Attempt
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true); // Ensure persistent reconnect
  if (wifi_ssid != "") {
    WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());
    Serial.println("Connecting to saved WiFi...");
  }

  // BLE Setup (Always on in dual-mode)
  BLEDevice::init("ESP32_IR_HUB");
  BLEDevice::setPower(ESP_PWR_LVL_P9); // Max power for visibility

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pSvc = pServer->createService(SERVICE_UUID);

  BLECharacteristic *pTx = pSvc->createCharacteristic(CHARACTERISTIC_TX, BLECharacteristic::PROPERTY_WRITE);
  pTx->setCallbacks(new IRCallbacks());

  pRxChar = pSvc->createCharacteristic(CHARACTERISTIC_RX, BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
  pRxChar->addDescriptor(new BLE2902());

  pWifiChar = pSvc->createCharacteristic(CHARACTERISTIC_WIFI, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
  pWifiChar->setCallbacks(new WiFiConfigCallbacks());
  pWifiChar->addDescriptor(new BLE2902());

  pSvc->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // iPhone compatibility
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("BLE Advertising started.");

  // Create Tasks
  xTaskCreatePinnedToCore(taskWiFi, "WiFiTask", 4096, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(taskIR, "IRTask", 4096, NULL, 2, NULL, 1);
}

void loop() {
  handleHeartbeat();

  // Check WiFi connection status and notify via BLE if it just connected
  static bool lastWifiConnected = false;
  bool currentWifiConnected = (WiFi.status() == WL_CONNECTED);

  if (currentWifiConnected && !lastWifiConnected) {
    if (deviceConnected && pWifiChar) {
      JsonDocument doc;
      doc["ip"] = WiFi.localIP().toString();
      doc["wifi_mac"] = WiFi.macAddress();
      doc["ble_mac"] = BLEDevice::getAddress().toString().c_str();
      doc["status"] = "connected";
      String out;
      serializeJson(doc, out);
      pWifiChar->setValue(out.c_str());
      pWifiChar->notify();
    }
    lastWifiConnected = true;
    wifiConnected = true;
    Serial.print("WiFi Connected! IP: ");
    Serial.println(WiFi.localIP());
  } else if (!currentWifiConnected && lastWifiConnected) {
    lastWifiConnected = false;
    wifiConnected = false;
    Serial.println("WiFi Disconnected. Reconnecting...");
  }

  vTaskDelay(100 / portTICK_PERIOD_MS);
}

