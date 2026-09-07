/*
 * ============================================================================
 * ESP32 IR HUB - Firmware V6.3.0 PROFESSIONAL
 * ============================================================================
 * BLE + Wi-Fi/HTTP concurrent universal IR hub.
 *
 * Aligned with app:
 *   007_ESP32_IR_Remote_Hub_V4
 *
 * BLE UUIDs:
 *   Service : 4fafc201-1fb5-459e-8fcc-c5c9c331914b
 *   TX      : beb5483e-36e1-4688-b7f5-ea07361b26a8
 *   RX      : beb5483f-36e1-4688-b7f5-ea07361b26a8
 *   CONFIG  : beb54840-36e1-4688-b7f5-ea07361b26a8
 *   WIFI    : beb54841-36e1-4688-b7f5-ea07361b26a8
 *
 * HTTP API expected by the app:
 *   GET  /api/status
 *   POST /api/ir/send
 *   GET  /api/ir/receive
 *   GET  /api/wifi/scan
 *   POST /api/wifi/config
 *   POST /api/pins/config
 *
 * Hardware default:
 *   IR RX  GPIO 15
 *   IR TX  GPIO 4
 *   LED    GPIO 2
 *   Buzzer GPIO 18
 *
 * Libraries:
 *   IRremoteESP8266 (Crankyoldgit)
 *   ArduinoJson 7+
 *   ESP32 BLE Arduino
 *   Preferences
 *   WebServer / ESPmDNS / WiFi (ESP32 core)
 * ============================================================================
 */

// Keep the original project's focused protocol set. RAW works independently.
#define DECODE_NEC     true
#define DECODE_SONY    true
#define DECODE_SAMSUNG true
#define DECODE_LG      true
#define SEND_NEC       true
#define SEND_SONY      true
#define SEND_SAMSUNG   true
#define SEND_LG        true

#include <Arduino.h>
#include <esp_mac.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#include <IRrecv.h>
#include <IRsend.h>
#include <IRutils.h>

// ============================================================================
// 1. CONFIGURATION
// ============================================================================
static constexpr uint8_t  DEFAULT_IR_RECV_PIN = 15;
static constexpr uint8_t  DEFAULT_IR_SEND_PIN = 4;
static constexpr uint8_t  DEFAULT_LED_PIN     = 2;
static constexpr uint8_t  DEFAULT_BUZZER_PIN  = 18;
static constexpr uint16_t IR_CAPTURE_BUFFER   = 1024;
static constexpr uint8_t  IR_TIMEOUT_MS       = 50;
static constexpr uint16_t DEFAULT_FREQUENCY   = 38;
static constexpr uint16_t MAX_RAW_TIMINGS     = 400;
static constexpr size_t   JSON_BUFFER_SIZE     = 4096;
static constexpr uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000;
static constexpr uint32_t AP_IDLE_DELAY_MS = 5000;

#define DEVICE_NAME "ESP32_IR_HUB"

#define SERVICE_UUID          "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_TX    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHARACTERISTIC_RX    "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define CHARACTERISTIC_CONFIG "beb54840-36e1-4688-b7f5-ea07361b26a8"
#define CHARACTERISTIC_WIFI  "beb54841-36e1-4688-b7f5-ea07361b26a8"

// Runtime pins are persisted by the app. Changes to physical IR pins are
// applied after reboot to keep the IR objects/task safe.
uint8_t pinIRRecv = DEFAULT_IR_RECV_PIN;
uint8_t pinIRSend = DEFAULT_IR_SEND_PIN;
uint8_t pinLED     = DEFAULT_LED_PIN;
uint8_t pinBuzzer  = DEFAULT_BUZZER_PIN;
uint32_t pwmFrequency = 38000;

IRrecv *irrecv = nullptr;
IRsend *irsend = nullptr;
decode_results results;
WebServer server(80);
Preferences preferences;

// ============================================================================
// 2. BLE OBJECTS / STATE
// ============================================================================
BLEServer *pServer = nullptr;
BLECharacteristic *pTxChar = nullptr;
BLECharacteristic *pRxChar = nullptr;
BLECharacteristic *pConfigChar = nullptr;
BLECharacteristic *pWifiChar = nullptr;

volatile bool deviceConnected = false;
volatile bool advertisingRestartPending = false;
volatile bool wifiConnectedFlag = false;
volatile bool rebootRequested = false;

String bleDeviceName;
String lastReceivedJson = "";

// ============================================================================
// 3. FREE RTOS QUEUES
// ============================================================================
struct BleMessage {
    char data[JSON_BUFFER_SIZE];
};

QueueHandle_t irCommandQueue = nullptr;
QueueHandle_t wifiCommandQueue = nullptr;
QueueHandle_t notifyRXQueue = nullptr;
QueueHandle_t notifyWifiQueue = nullptr;

// ============================================================================
// 4. IR COMMAND / CAPTURE STATE
// ============================================================================
struct IRCommand {
    uint32_t id = 0;
    char protocol[32] = "NEC";
    uint64_t hex = 0;
    uint16_t bits = 32;
    uint16_t frequency = DEFAULT_FREQUENCY;
    uint16_t repeat = 0;
    uint16_t rawLen = 0;
    uint16_t *rawData = nullptr;
};

portMUX_TYPE captureMux = portMUX_INITIALIZER_UNLOCKED;
volatile bool capturedPending = false;
String lastCapturedJson;

// LED activity override. Heartbeat is produced by TaskLED.
volatile uint32_t ledOverrideUntil = 0;

// ============================================================================
// 5. QUEUE HELPERS
// ============================================================================
void enqueueMessage(QueueHandle_t queue, const String &payload) {
    if (!queue) return;
    BleMessage msg{};
    size_t len = payload.length();
    if (len >= JSON_BUFFER_SIZE) len = JSON_BUFFER_SIZE - 1;
    memcpy(msg.data, payload.c_str(), len);
    msg.data[len] = '\0';
    xQueueSend(queue, &msg, pdMS_TO_TICKS(50));
}

void queueRX(const String &s)   { enqueueMessage(notifyRXQueue, s); }
void queueWifi(const String &s) { enqueueMessage(notifyWifiQueue, s); }

// ============================================================================
// 6. LED / BUZZER
// ============================================================================
void pulseLED(uint16_t ms) {
digitalWrite(pinLED, HIGH);
uint32_t until = millis() + ms;
if (until > ledOverrideUntil) ledOverrideUntil = until;
}

void beep(uint16_t ms = 35) {
if (pinBuzzer == 255) return;
digitalWrite(pinBuzzer, HIGH);
delay(ms);
digitalWrite(pinBuzzer, LOW);
}

// ============================================================================
// 7. JSON / SYSTEM HELPERS
// ============================================================================
String uint64ToHex(uint64_t value) {
    char buf[24];
    snprintf(buf, sizeof(buf), "0x%llX", (unsigned long long)value);
    return String(buf);
}

String bleMacString() {
    if (pServer) {
        return BLEDevice::getAddress().toString().c_str();
    }
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    char buf[18];
    snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    return String(buf);
}

void sendWifiStatus() {
    bool connected = WiFi.status() == WL_CONNECTED;
    wifiConnectedFlag = connected;

    JsonDocument doc;
    doc["type"] = "wifi_status";
    doc["connected"] = connected;
    doc["ip"] = connected ? WiFi.localIP().toString() : String("");
    doc["rssi"] = connected ? WiFi.RSSI() : 0;
    doc["mac"] = WiFi.macAddress();
    doc["wifi_mac"] = WiFi.macAddress();
    doc["ble_mac"] = bleMacString();

    String out;
    serializeJson(doc, out);
    queueWifi(out);
    queueRX(out); // The app listens to both BLE notification characteristics.
}

void sendErrorResult(uint32_t id, const char *code) {
JsonDocument doc;
doc["type"] = "ir_tx_result";
doc["id"] = id;
doc["status"] = "error";
doc["code"] = code;
String out;
serializeJson(doc, out);
queueRX(out);
}

void sendTxResult(uint32_t id, bool ok) {
JsonDocument doc;
doc["type"] = "ir_tx_result";
doc["id"] = id;
doc["status"] = ok ? "ok" : "error";
if (!ok) doc["code"] = "UNSUPPORTED_PROTOCOL";
String out;
serializeJson(doc, out);
queueRX(out);
}

// ============================================================================
// 8. IR RAW CAPTURE
// ============================================================================
String buildIRRxJson(const decode_results &r) {
    JsonDocument doc;
    doc["type"] = "ir_rx";
    doc["protocol"] = typeToString(r.decode_type);
    doc["hex"] = uint64ToHex(r.value);
    doc["bits"] = r.bits;
    doc["repeat"] = r.repeat;

    JsonArray raw = doc["rawTimings"].to<JsonArray>();
    uint16_t count = r.rawlen > 0 ? r.rawlen - 1 : 0;
    if (count > MAX_RAW_TIMINGS) count = MAX_RAW_TIMINGS;
    for (uint16_t i = 1; i <= count; ++i) {
        raw.add((uint32_t)r.rawbuf[i] * kRawTick);
    }

    String out;
    serializeJson(doc, out);
    return out;
}

void handleIRReceived() {
    if (!irrecv || results.overflow) {
        if (irrecv) irrecv->resume();
        return;
    }

    // Always preserve the raw signal. The app's learning/copy mode expects it.
    String out = buildIRRxJson(results);

    portENTER_CRITICAL(&captureMux);
    lastCapturedJson = out;
    capturedPending = true;
    portEXIT_CRITICAL(&captureMux);

    // Unknown protocols are still useful to the app in learning mode.
    pulseLED(70);
    queueRX(out);
}

// ============================================================================
// 9. IR TX
// ============================================================================
bool sendProtocol(const IRCommand &cmd) {
    if (!irsend) return false;

    String p = String(cmd.protocol);
    p.toUpperCase();
    uint16_t repetitions = cmd.repeat > 0 ? cmd.repeat : 1;

    if (p == "RAW") {
        if (!cmd.rawData || cmd.rawLen == 0) return false;
        for (uint16_t i = 0; i < repetitions; ++i) {
            irsend->sendRaw(cmd.rawData, cmd.rawLen,
                            cmd.frequency ? cmd.frequency : DEFAULT_FREQUENCY);
            if (i + 1 < repetitions) delay(30);
        }
        return true;
    }

    for (uint16_t i = 0; i < repetitions; ++i) {
        if (p == "NEC") {
            irsend->sendNEC(cmd.hex, cmd.bits);
        } else if (p == "SONY") {
            irsend->sendSony(cmd.hex, cmd.bits);
        } else if (p == "SAMSUNG") {
            irsend->sendSAMSUNG(cmd.hex, cmd.bits);
        } else if (p == "LG") {
            irsend->sendLG(cmd.hex, cmd.bits);
        } else {
            return false;
        }
        if (i + 1 < repetitions) delay(30);
    }
    return true;
}

bool parseIRCommand(const char *json, IRCommand &cmd) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, json);
    if (err) return false;

    cmd.id = doc["id"] | 0;
    String p = doc["protocol"] | "NEC";
    p.toUpperCase();
    strlcpy(cmd.protocol, p.c_str(), sizeof(cmd.protocol));

    const char *hexString = doc["hex"] | "0x0";
    cmd.hex = strtoull(hexString, nullptr, 0);
    cmd.bits = doc["bits"] | 32;
    cmd.repeat = doc["repeat"] | 0;
    cmd.frequency = doc["frequency"] | DEFAULT_FREQUENCY;

    if (doc["rawData"].is<JsonArray>()) {
        JsonArray arr = doc["rawData"].as<JsonArray>();
        size_t n = arr.size();
        if (n == 0 || n > MAX_RAW_TIMINGS) return false;
        cmd.rawLen = (uint16_t)n;
        cmd.rawData = (uint16_t *)malloc(sizeof(uint16_t) * n);
        if (!cmd.rawData) return false;
        for (size_t i = 0; i < n; ++i) {
            uint32_t v = arr[i].as<uint32_t>();
            cmd.rawData[i] = (uint16_t)min<uint32_t>(v, UINT16_MAX);
        }
    }
    return true;
}

void processIRJson(const char *json) {
    IRCommand cmd;
    if (!parseIRCommand(json, cmd)) {
        sendErrorResult(0, "INVALID_JSON_OR_COMMAND");
        if (cmd.rawData) free(cmd.rawData);
        return;
    }

    if (xQueueSend(irCommandQueue, &cmd, pdMS_TO_TICKS(100)) != pdTRUE) {
        sendErrorResult(cmd.id, "IR_QUEUE_FULL");
        if (cmd.rawData) free(cmd.rawData);
    }
}

// ============================================================================
// 10. WIFI MANAGEMENT
// ============================================================================
void saveWiFiCredentials(const String &ssid, const String &pass) {
    preferences.begin("wifi_cfg", false);
    preferences.putString("ssid", ssid);
    preferences.putString("pass", pass);
    preferences.end();
}

void clearWiFiCredentials() {
    preferences.begin("wifi_cfg", false);
    preferences.clear();
    preferences.end();
}

void startSoftAP() {
    if (WiFi.getMode() == WIFI_AP || WiFi.getMode() == WIFI_AP_STA) return;
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP("ESP32_IR_HUB_AP", "12345678");
    Serial.printf("[WIFI] SoftAP ativo: ESP32_IR_HUB_AP / %s\n", WiFi.softAPIP().toString().c_str());
}

void stopSoftAP() {
    if (WiFi.getMode() == WIFI_AP_STA || WiFi.getMode() == WIFI_AP) {
        WiFi.softAPdisconnect(true);
        WiFi.mode(WIFI_STA);
    }
}

void connectWiFi(const String &ssid, const String &pass) {
    if (!ssid.length()) return;
    saveWiFiCredentials(ssid, pass);
    WiFi.mode(WIFI_AP_STA);
    WiFi.begin(ssid.c_str(), pass.c_str());
    Serial.printf("[WIFI] Conectando a: %s\n", ssid.c_str());
}

void scanWiFiToBle() {
    int n = WiFi.scanNetworks(false, true);
    if (n < 0) n = 0;
    for (int i = 0; i < n; ++i) {
        JsonDocument doc;
        doc["type"] = "wifi_net";
        doc["ssid"] = WiFi.SSID(i);
        doc["rssi"] = WiFi.RSSI(i);
        doc["secured"] = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
        doc["channel"] = WiFi.channel(i);
        String out;
        serializeJson(doc, out);
        queueWifi(out);
        delay(10);
    }
    WiFi.scanDelete();
    queueWifi("{\"type\":\"wifi_done\"}");
}

void processWiFiJson(const char *json) {
    JsonDocument doc;
    if (deserializeJson(doc, json)) return;
    String action = doc["action"] | "";

    if (action == "scan") {
        scanWiFiToBle();
    } else if (action == "connect") {
        connectWiFi(doc["ssid"] | "", doc["password"] | "");
        JsonDocument status;
        status["type"] = "wifi_status";
        status["connected"] = false;
        status["ip"] = "";
        status["rssi"] = 0;
        status["mac"] = WiFi.macAddress();
        status["wifi_mac"] = WiFi.macAddress();
        status["ble_mac"] = bleMacString();
        String out;
        serializeJson(status, out);
        queueWifi(out);
    } else if (action == "disconnect") {
        WiFi.disconnect(true, true);
        clearWiFiCredentials();
        startSoftAP();
        sendWifiStatus();
    }
}

void onWiFiEvent(WiFiEvent_t event) {
    switch (event) {
        case ARDUINO_EVENT_WIFI_STA_GOT_IP:
            wifiConnectedFlag = true;
            Serial.printf("[WIFI] Connected: %s RSSI=%d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
            MDNS.end();
            MDNS.begin("esp32-ir-hub");
            MDNS.addService("http", "tcp", 80);
            stopSoftAP();
            sendWifiStatus();
            break;

        case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
            wifiConnectedFlag = false;
            Serial.println("[WIFI] Disconnected");
            sendWifiStatus();
            break;

        default:
            break;
    }
}

// ============================================================================
// 11. HTTP API
// ============================================================================
void addCors() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleOptions() {
    addCors();
    server.send(204);
}

void handleRoot() {
    addCors();
    server.send(200, "text/plain", "ESP32 IR HUB V6.3.0 Online");
}

void handleStatus() {
    addCors();
    JsonDocument doc;
    bool connected = WiFi.status() == WL_CONNECTED;
    doc["status"] = "online";
    doc["firmware"] = "6.3.0";
    doc["wifi_connected"] = connected;
    doc["ip"] = connected ? WiFi.localIP().toString() : String("");
    doc["rssi"] = connected ? WiFi.RSSI() : 0;
    doc["wifi_mac"] = WiFi.macAddress();
    doc["ble_mac"] = bleMacString();
    doc["uptime"] = millis() / 1000UL;
    doc["freeHeap"] = ESP.getFreeHeap();
    doc["ir_receiver_pin"] = pinIRRecv;
    doc["ir_transmitter_pin"] = pinIRSend;
    doc["status_led_pin"] = pinLED;
    doc["buzzer_pin"] = pinBuzzer;
    doc["pwmFrequency"] = pwmFrequency;
    doc["mdns"] = "esp32-ir-hub.local";

    String out;
    serializeJson(doc, out);
    server.send(200, "application/json", out);
}

bool getPlainJson(JsonDocument &doc) {
    if (!server.hasArg("plain")) return false;
    return deserializeJson(doc, server.arg("plain")) == DeserializationError::Ok;
}

void handleIRSendHTTP() {
    addCors();
    if (!server.hasArg("plain")) {
        server.send(400, "application/json", "{\"success\":false,\"message\":\"Missing plain body\"}");
        return;
    }
    IRCommand cmd;
    if (!parseIRCommand(server.arg("plain").c_str(), cmd)) {
        server.send(400, "application/json", "{\"success\":false,\"message\":\"Invalid IR command\"}");
        if (cmd.rawData) free(cmd.rawData);
        return;
    }
    if (xQueueSend(irCommandQueue, &cmd, pdMS_TO_TICKS(100)) != pdTRUE) {
        if (cmd.rawData) free(cmd.rawData);
        server.send(503, "application/json", "{\"success\":false,\"message\":\"IR queue full\"}");
        return;
    }

    // The HTTP caller only needs acknowledgement. BLE receives the detailed
    // ir_tx_result when BLE is connected.
    JsonDocument response;
    response["success"] = true;
    response["queued"] = true;
    response["id"] = cmd.id;
    String out;
    serializeJson(response, out);
    server.send(200, "application/json", out);
}

void handleIRReceiveHTTP() {
    addCors();
    String payload;
    bool hasNew = false;
    portENTER_CRITICAL(&captureMux);
    hasNew = capturedPending;
    payload = lastCapturedJson;
    capturedPending = false;
    portEXIT_CRITICAL(&captureMux);

    if (hasNew && payload.length()) {
        JsonDocument doc;
        if (!deserializeJson(doc, payload)) {
            doc["hasNew"] = true;
            String out;
            serializeJson(doc, out);
            server.send(200, "application/json", out);
            return;
        }
    }
    server.send(200, "application/json", "{\"hasNew\":false}");
}

void handleWiFiScanHTTP() {
    addCors();
    int n = WiFi.scanNetworks(false, true);
    JsonDocument doc;
    JsonArray arr = doc.to<JsonArray>();
    if (n > 0) {
        for (int i = 0; i < n; ++i) {
            JsonObject net = arr.add<JsonObject>();
            net["ssid"] = WiFi.SSID(i);
            net["rssi"] = WiFi.RSSI(i);
            net["secured"] = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
            net["channel"] = WiFi.channel(i);
        }
    }
    WiFi.scanDelete();
    String out;
    serializeJson(doc, out);
    server.send(200, "application/json", out);
}

void handleWiFiConfigHTTP() {
    addCors();
    JsonDocument doc;
    if (!getPlainJson(doc)) {
        server.send(400, "application/json", "{\"success\":false,\"message\":\"Invalid JSON\"}");
        return;
    }
    String ssid = doc["ssid"] | "";
    String pass = doc["password"] | "";
    if (!ssid.length()) {
        server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID required\"}");
        return;
    }
    connectWiFi(ssid, pass);

    JsonDocument response;
    response["success"] = true;
    response["message"] = "Wi-Fi credentials saved. Connecting...";
    response["ip"] = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : String("");
    String out;
    serializeJson(response, out);
    server.send(200, "application/json", out);
}

void handlePinConfigHTTP() {
    addCors();
    JsonDocument doc;
    if (!getPlainJson(doc)) {
        server.send(400, "application/json", "{\"success\":false}");
        return;
    }

    bool changed = false;
    if (doc["irReceiverPin"].is<int>()) { pinIRRecv = doc["irReceiverPin"].as<uint8_t>(); changed = true; }
    if (doc["irTransmitterPin"].is<int>()) { pinIRSend = doc["irTransmitterPin"].as<uint8_t>(); changed = true; }
    if (doc["statusLedPin"].is<int>()) { pinLED = doc["statusLedPin"].as<uint8_t>(); changed = true; }
    if (doc["buzzerPin"].is<int>()) { pinBuzzer = doc["buzzerPin"].as<uint8_t>(); changed = true; }
    if (doc["pwmFrequency"].is<int>()) { pwmFrequency = doc["pwmFrequency"].as<uint32_t>(); changed = true; }

    preferences.begin("hw_cfg", false);
    preferences.putUChar("ir_rx", pinIRRecv);
    preferences.putUChar("ir_tx", pinIRSend);
    preferences.putUChar("led", pinLED);
    preferences.putUChar("buzzer", pinBuzzer);
    preferences.putUInt("freq", pwmFrequency);
    preferences.end();

    JsonDocument response;
    response["success"] = true;
    response["changed"] = changed;
    response["rebootRequired"] = changed;
    response["message"] = changed ? "Pin configuration saved. Reboot ESP32 to apply hardware pin changes." : "No changes.";
    String out;
    serializeJson(response, out);
    server.send(200, "application/json", out);
}

void setupHTTP() {
    server.on("/", HTTP_GET, handleRoot);
    server.on("/api/status", HTTP_GET, handleStatus);
    server.on("/api/ir/send", HTTP_POST, handleIRSendHTTP);
    server.on("/api/ir/receive", HTTP_GET, handleIRReceiveHTTP);
    server.on("/api/wifi/scan", HTTP_GET, handleWiFiScanHTTP);
    server.on("/api/wifi/config", HTTP_POST, handleWiFiConfigHTTP);
    server.on("/api/pins/config", HTTP_POST, handlePinConfigHTTP);

    server.on("/api/status", HTTP_OPTIONS, handleOptions);
    server.on("/api/ir/send", HTTP_OPTIONS, handleOptions);
    server.on("/api/ir/receive", HTTP_OPTIONS, handleOptions);
    server.on("/api/wifi/scan", HTTP_OPTIONS, handleOptions);
    server.on("/api/wifi/config", HTTP_OPTIONS, handleOptions);
    server.on("/api/pins/config", HTTP_OPTIONS, handleOptions);
    server.begin();
    Serial.println("[HTTP] WebServer iniciado na porta 80");
}

// ============================================================================
// 12. BLE CALLBACKS
// ============================================================================
class ServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer *server) override {
        deviceConnected = true;
        Serial.println("[BLE] Connected");
        sendWifiStatus();
    }

    void onDisconnect(BLEServer *server) override {
        deviceConnected = false;
        advertisingRestartPending = true;
        Serial.println("[BLE] Disconnected; advertising restart deferred to TaskBLE");
    }
};

class IRWriteCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *characteristic) override {
        String payload = characteristic->getValue();
        if (payload.length()) processIRJson(payload.c_str());
    }
};

class WiFiWriteCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *characteristic) override {
        String payload = characteristic->getValue();
        if (payload.length()) enqueueMessage(wifiCommandQueue, payload);
    }
};

// ============================================================================
// 13. TASKS
// ============================================================================
void TaskIR(void *) {
    IRCommand cmd;
    for (;;) {
        if (xQueueReceive(irCommandQueue, &cmd, 0) == pdTRUE) {
            pulseLED(100);
            bool ok = sendProtocol(cmd);
            sendTxResult(cmd.id, ok);
            if (cmd.rawData) free(cmd.rawData);
        }

        if (irrecv && irrecv->decode(&results)) {
            handleIRReceived();
            irrecv->resume();
        }

        vTaskDelay(pdMS_TO_TICKS(2));
    }
}

void TaskBLE(void *) {
    BleMessage msg;
    for (;;) {
        if (advertisingRestartPending) {
            advertisingRestartPending = false;
            vTaskDelay(pdMS_TO_TICKS(300));
            if (!deviceConnected) {
                BLEDevice::getAdvertising()->start();
                Serial.println("[BLE] Advertising restarted");
            }
        }

        if (deviceConnected && xQueueReceive(notifyRXQueue, &msg, 0) == pdTRUE) {
            pRxChar->setValue((uint8_t *)msg.data, strlen(msg.data));
            pRxChar->notify();
            vTaskDelay(pdMS_TO_TICKS(12));
        }

        if (deviceConnected && xQueueReceive(notifyWifiQueue, &msg, 0) == pdTRUE) {
            pWifiChar->setValue((uint8_t *)msg.data, strlen(msg.data));
            pWifiChar->notify();
            vTaskDelay(pdMS_TO_TICKS(12));
        }

        vTaskDelay(pdMS_TO_TICKS(5));
    }
}

void TaskWiFi(void *) {
    BleMessage msg;
    uint32_t lastStatus = 0;
    uint32_t connectStarted = 0;
    bool connecting = false;

    for (;;) {
        server.handleClient();

        if (xQueueReceive(wifiCommandQueue, &msg, 0) == pdTRUE) {
            processWiFiJson(msg.data);
            if (strstr(msg.data, "\"action\":\"connect\"")) {
                connecting = true;
                connectStarted = millis();
            }
        }

        if (WiFi.status() == WL_CONNECTED) {
            if (connecting) {
                connecting = false;
                stopSoftAP();
            }
        } else if (connecting && millis() - connectStarted > WIFI_CONNECT_TIMEOUT_MS) {
            connecting = false;
            startSoftAP();
            sendWifiStatus();
        }

        if (millis() - lastStatus >= 10000) {
            sendWifiStatus();
            lastStatus = millis();
        }

        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void TaskLED(void *) {
    uint32_t lastHeartbeat = 0;
    bool blinkState = false;

    for (;;) {
        uint32_t now = millis();
        if (now < ledOverrideUntil) {
            digitalWrite(pinLED, HIGH);
        } else if (wifiConnectedFlag) {
            uint32_t phase = now % 2000UL;
            digitalWrite(pinLED, phase < 25 ? HIGH : LOW);
        } else {
            if (now - lastHeartbeat >= 500) {
                blinkState = !blinkState;
                digitalWrite(pinLED, blinkState ? HIGH : LOW);
                lastHeartbeat = now;
            }
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

// ============================================================================
// 14. SETUP
// ============================================================================
void loadHardwareConfig() {
    preferences.begin("hw_cfg", true);
    pinIRRecv = preferences.getUChar("ir_rx", DEFAULT_IR_RECV_PIN);
    pinIRSend = preferences.getUChar("ir_tx", DEFAULT_IR_SEND_PIN);
    pinLED = preferences.getUChar("led", DEFAULT_LED_PIN);
    pinBuzzer = preferences.getUChar("buzzer", DEFAULT_BUZZER_PIN);
    pwmFrequency = preferences.getUInt("freq", 38000);
    preferences.end();
}

void setupBLE() {
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    char name[32];
    snprintf(name, sizeof(name), "%s_%02X%02X", DEVICE_NAME, mac[4], mac[5]);
    bleDeviceName = name;

    BLEDevice::init(name);
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    BLEService *service = pServer->createService(SERVICE_UUID);

    pTxChar = service->createCharacteristic(
            CHARACTERISTIC_TX, BLECharacteristic::PROPERTY_WRITE);
    pTxChar->setCallbacks(new IRWriteCallbacks());

    pRxChar = service->createCharacteristic(
            CHARACTERISTIC_RX, BLECharacteristic::PROPERTY_NOTIFY);
    pRxChar->addDescriptor(new BLE2902());

    pConfigChar = service->createCharacteristic(
            CHARACTERISTIC_CONFIG,
            BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
    pConfigChar->addDescriptor(new BLE2902());
    pConfigChar->setCallbacks(new WiFiWriteCallbacks());

    pWifiChar = service->createCharacteristic(
            CHARACTERISTIC_WIFI,
            BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
    pWifiChar->addDescriptor(new BLE2902());
    pWifiChar->setCallbacks(new WiFiWriteCallbacks());

    service->start();

    BLEAdvertising *adv = BLEDevice::getAdvertising();
    adv->addServiceUUID(SERVICE_UUID);
    adv->setScanResponse(true);
    adv->setMinPreferred(0x06);
    adv->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.printf("[BLE] Advertising: %s\n", bleDeviceName.c_str());
}

void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println("\n================================================");
    Serial.println(" ESP32 IR HUB V6.3.0 PROFESSIONAL");
    Serial.println("================================================");

    loadHardwareConfig();

    pinMode(pinLED, OUTPUT);
    digitalWrite(pinLED, LOW);
    if (pinBuzzer != 255) {
        pinMode(pinBuzzer, OUTPUT);
        digitalWrite(pinBuzzer, LOW);
    }

    // IR objects use the persisted hardware pins.
    irrecv = new IRrecv(pinIRRecv, IR_CAPTURE_BUFFER, IR_TIMEOUT_MS, true);
    irsend = new IRsend(pinIRSend);
    irrecv->enableIRIn();
    irsend->begin();

    // Queues
    irCommandQueue = xQueueCreate(8, sizeof(IRCommand));
    wifiCommandQueue = xQueueCreate(8, sizeof(BleMessage));
    notifyRXQueue = xQueueCreate(20, sizeof(BleMessage));
    notifyWifiQueue = xQueueCreate(20, sizeof(BleMessage));

    // Wi-Fi
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    WiFi.onEvent(onWiFiEvent);

    preferences.begin("wifi_cfg", true);
    String ssid = preferences.getString("ssid", "");
    String pass = preferences.getString("pass", "");
    preferences.end();

    if (ssid.length()) {
        WiFi.mode(WIFI_AP_STA);
        WiFi.begin(ssid.c_str(), pass.c_str());
        Serial.printf("[WIFI] Connecting saved SSID: %s\n", ssid.c_str());
    } else {
        startSoftAP();
    }

    // HTTP must be ready regardless of STA connection state.
    setupHTTP();

    // mDNS can only be announced after STA gets an IP. The event handler does it.

    // BLE
    setupBLE();

    // Tasks
    xTaskCreatePinnedToCore(TaskIR,   "TaskIR",   6144, nullptr, 3, nullptr, 1);
    xTaskCreatePinnedToCore(TaskBLE,  "TaskBLE",  6144, nullptr, 2, nullptr, 0);
    xTaskCreatePinnedToCore(TaskWiFi, "TaskWiFi", 6144, nullptr, 2, nullptr, 0);
    xTaskCreatePinnedToCore(TaskLED,  "TaskLED",  2048, nullptr, 1, nullptr, 1);

    Serial.printf("[BOOT] IR RX=%u TX=%u LED=%u Buzzer=%u\n", pinIRRecv, pinIRSend, pinLED, pinBuzzer);
    Serial.println("[BOOT] V6.3.0 ready");
}

void loop() {
    // All work is handled by FreeRTOS tasks.
    vTaskDelay(pdMS_TO_TICKS(1000));
}
