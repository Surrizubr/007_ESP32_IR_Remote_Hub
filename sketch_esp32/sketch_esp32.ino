/*
 * ESP32 IR HUB - Firmware v6.1.1
 * Dual-Mode: BLE & WiFi (Concurrent)
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
const int PIN_LED = 2;

Preferences preferences;
IRsend irsend(PIN_IR_SEND);
IRrecv irrecv(PIN_IR_RECV, 1024, 50, true);
decode_results results;
WebServer server(80);

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_TX   "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHARACTERISTIC_RX   "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define CHARACTERISTIC_WIFI "beb54841-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = NULL;
BLECharacteristic* pRxChar = NULL;
BLECharacteristic* pWifiChar = NULL;
bool deviceConnected = false;
unsigned long lastHeartbeat = 0;

struct IRCommand {
  char protocol[20];
  uint64_t hex;
  int bits;
};
QueueHandle_t irQueue;

// --- Auxiliares ---
void blinkLed(int times, int duration) {
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_LED, HIGH);
    delay(duration);
    digitalWrite(PIN_LED, LOW);
    if (i < times - 1) delay(duration);
  }
}

void sendWifiStatusBLE() {
  if (deviceConnected && pWifiChar) {
    JsonDocument doc;
    doc["ip"] = WiFi.localIP().toString();
    doc["wifi_mac"] = WiFi.macAddress();
    doc["ble_mac"] = BLEDevice::getAddress().toString().c_str();
    doc["status"] = (WiFi.status() == WL_CONNECTED) ? "connected" : "disconnected";
    doc["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;

    String out;
    serializeJson(doc, out);
    pWifiChar->setValue(out.c_str());
    pWifiChar->notify();
    Serial.println("Status WiFi enviado via BLE");
  }
}

void processIRCommand(String json) {
  JsonDocument doc;
  if (deserializeJson(doc, json) == DeserializationError::Ok) {
    IRCommand cmd;
    strlcpy(cmd.protocol, doc["protocol"] | "NEC", sizeof(cmd.protocol));
    cmd.hex = doc["hex"] | 0;
    cmd.bits = doc["bits"] | 32;
    xQueueSend(irQueue, &cmd, portMAX_DELAY);
  }
}

// --- Callbacks ---
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* s) {
      deviceConnected = true;
      Serial.println("App Conectado via BLE");
      // Pequeno delay para o App registrar os listeners antes de enviarmos o status
      delay(500);
      sendWifiStatusBLE();
    }
    void onDisconnect(BLEServer* s) {
      deviceConnected = false;
      BLEDevice::startAdvertising();
    }
};

class IRCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pChar) {
      digitalWrite(PIN_LED, HIGH); // Feedback visual instantâneo
      processIRCommand(pChar->getValue().c_str());
      delay(20);
      digitalWrite(PIN_LED, LOW);
    }
};

class WiFiConfigCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pChar) {
      JsonDocument doc;
      if (deserializeJson(doc, pChar->getValue().c_str()) == DeserializationError::Ok) {
        String action = doc["action"] | "";
        if (action == "connect") {
          preferences.begin("wifi", false);
          preferences.putString("ssid", doc["ssid"].as<String>());
          preferences.putString("pass", doc["password"].as<String>());
          preferences.end();
          WiFi.begin(doc["ssid"].as<String>().c_str(), doc["password"].as<String>().c_str());
        } else if (action == "scan") {
          int n = WiFi.scanNetworks();
          for (int i = 0; i < n; i++) {
            JsonDocument resp;
            resp["type"] = "wifi_net";
            resp["ssid"] = WiFi.SSID(i);
            resp["rssi"] = WiFi.RSSI(i);
            resp["secured"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
            String out; serializeJson(resp, out);
            pWifiChar->setValue(out.c_str()); pWifiChar->notify();
            delay(30);
          }
          pWifiChar->setValue("{\"type\":\"wifi_done\"}"); pWifiChar->notify();
        }
      }
    }
};

void taskIR(void* p) {
  irrecv.enableIRIn(); irsend.begin();
  IRCommand cmd;
  for (;;) {
    if (xQueueReceive(irQueue, &cmd, 10) == pdTRUE) {
      digitalWrite(PIN_LED, HIGH);
      String proto = String(cmd.protocol); proto.toUpperCase();
      if (proto == "NEC") irsend.sendNEC(cmd.hex, cmd.bits);
      else if (proto == "SONY") irsend.sendSony(cmd.hex, cmd.bits);
      else irsend.sendNEC(cmd.hex, cmd.bits);
      delay(100); digitalWrite(PIN_LED, LOW);
    }
    if (irrecv.decode(&results)) {
      digitalWrite(PIN_LED, HIGH);
      if (deviceConnected) {
        JsonDocument doc; doc["type"] = "rx"; doc["protocol"] = typeToString(results.decode_type);
        doc["hex"] = results.value; String out; serializeJson(doc, out);
        pRxChar->setValue(out.c_str()); pRxChar->notify();
      }
      delay(80); digitalWrite(PIN_LED, LOW);
      irrecv.resume();
    }
    vTaskDelay(10);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  irQueue = xQueueCreate(10, sizeof(IRCommand));

  preferences.begin("wifi", true);
  String s = preferences.getString("ssid", "");
  String p = preferences.getString("pass", "");
  preferences.end();

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  if (s != "") WiFi.begin(s.c_str(), p.c_str());

  BLEDevice::init("ESP32_IR_HUB");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pSvc = pServer->createService(SERVICE_UUID);

  BLECharacteristic *pTx = pSvc->createCharacteristic(CHARACTERISTIC_TX, BLECharacteristic::PROPERTY_WRITE);
  pTx->setCallbacks(new IRCallbacks());
  pRxChar = pSvc->createCharacteristic(CHARACTERISTIC_RX, BLECharacteristic::PROPERTY_NOTIFY);
  pRxChar->addDescriptor(new BLE2902());
  pWifiChar = pSvc->createCharacteristic(CHARACTERISTIC_WIFI, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
  pWifiChar->setCallbacks(new WiFiConfigCallbacks());
  pWifiChar->addDescriptor(new BLE2902());

  pSvc->start();
  BLEDevice::getAdvertising()->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();

  xTaskCreatePinnedToCore([](void*){ server.on("/api/status", [](){
    JsonDocument d; d["wifi_mac"] = WiFi.macAddress(); d["rssi"] = WiFi.RSSI();
    String o; serializeJson(d, o); server.send(200, "application/json", o);
  }); server.begin(); for(;;){server.handleClient(); vTaskDelay(10);}}, "WiFiTask", 4096, NULL, 1, NULL, 0);

  xTaskCreatePinnedToCore(taskIR, "IRTask", 4096, NULL, 2, NULL, 1);
}

void loop() {
  static bool lastW = false;
  bool currW = (WiFi.status() == WL_CONNECTED);
  if (currW != lastW) { sendWifiStatusBLE(); lastW = currW; }

  // Heartbeat
  if (millis() - lastHeartbeat >= (currW ? 2000 : 500)) {
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
    delay(20);
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
    lastHeartbeat = millis();
  }
  vTaskDelay(100);
}
