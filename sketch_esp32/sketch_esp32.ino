/*
 * ============================================================================
 * ESP32 IR HUB - Firmware V6.2.0 PROFESSIONAL
 * ============================================================================
 * Dual Mode: BLE + WiFi concurrent
 * Event-Driven Architecture with Command IDs
 * ============================================================================
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

// --- Configuração ---
static constexpr int PIN_IR_RECV = 15;
static constexpr int PIN_IR_SEND = 4;
static constexpr int PIN_LED     = 2;

static constexpr uint16_t IR_QUEUE_LENGTH  = 20;
static constexpr uint16_t EVENT_QUEUE_LENGTH = 20;
static constexpr uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000;
static constexpr uint32_t WIFI_RETRY_INTERVAL_MS  = 10000;
static constexpr uint32_t WIFI_STATUS_INTERVAL_MS = 5000;
static constexpr uint32_t BLE_STATUS_DELAY_MS     = 250;
static constexpr uint16_t RAW_MAX_ENTRIES = 1024;

// UUIDs
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_TX   "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHARACTERISTIC_RX   "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define CHARACTERISTIC_WIFI "beb54841-36e1-4688-b7f5-ea07361b26a8"

// --- Objetos ---
Preferences preferences;
IRsend irsend(PIN_IR_SEND);
IRrecv irrecv(PIN_IR_RECV, 1024, 50, true);
decode_results results;
WebServer server(80);

BLEServer* pServer = nullptr;
BLECharacteristic* pRxChar = nullptr;
BLECharacteristic* pWifiChar = nullptr;
volatile bool deviceConnected = false;
uint32_t bleConnectedAt = 0;

// --- Filas ---
struct IRCommand {
    uint32_t id;
    char protocol[20];
    uint64_t hex;
    uint16_t bits;
    uint16_t repeat;
    uint16_t frequency;
};

enum class EventType : uint8_t { IR_TX_OK, IR_TX_ERROR, IR_RX, WIFI_STATUS, SYSTEM_ERROR };
struct EventMessage {
    EventType type;
    uint32_t id;
    char protocol[20];
    uint64_t hex;
    uint16_t bits;
    int16_t address;
    int16_t command;
    bool success;
    char errorCode[40];
};

struct WiFiCommand {
    char action[16];
    char ssid[65];
    char password[129];
    uint32_t id;
};

QueueHandle_t irQueue = nullptr;
QueueHandle_t eventQueue = nullptr;
QueueHandle_t wifiQueue = nullptr;

// --- Helpers ---
String uint64ToHex(uint64_t value) {
    char buffer[19];
    snprintf(buffer, sizeof(buffer), "0x%llX", (unsigned long long)value);
    return String(buffer);
}

void sendWifiStatusEvent() {
    EventMessage ev{};
    ev.type = EventType::WIFI_STATUS;
    xQueueSend(eventQueue, &ev, 0);
}

// --- LED Management ---
void blinkLed(int ms) {
    digitalWrite(PIN_LED, HIGH);
    delay(ms);
    digitalWrite(PIN_LED, LOW);
}

// --- Event Task ---
void eventTask(void*) {
    EventMessage ev;
    for (;;) {
        if (xQueueReceive(eventQueue, &ev, portMAX_DELAY) == pdTRUE) {
            if (!deviceConnected) continue;
            JsonDocument doc;
            if (ev.type == EventType::IR_TX_OK || ev.type == EventType::IR_TX_ERROR) {
                doc["type"] = "ir_tx_result";
                doc["id"] = ev.id;
                doc["status"] = (ev.type == EventType::IR_TX_OK) ? "ok" : "error";
                if (ev.type == EventType::IR_TX_ERROR) doc["code"] = ev.errorCode;
            } else if (ev.type == EventType::IR_RX) {
                doc["type"] = "ir_rx";
                doc["protocol"] = ev.protocol;
                doc["hex"] = uint64ToHex(ev.hex);
                doc["bits"] = ev.bits;
                if (ev.address != -1) doc["address"] = ev.address;
                if (ev.command != -1) doc["command"] = ev.command;
            } else if (ev.type == EventType::WIFI_STATUS) {
                doc["type"] = "wifi_status";
                doc["connected"] = (WiFi.status() == WL_CONNECTED);
                doc["ip"] = WiFi.localIP().toString();
                doc["rssi"] = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : 0;
                doc["mac"] = WiFi.macAddress();
            }

            String out;
            serializeJson(doc, out);
            if (pRxChar) { pRxChar->setValue(out.c_str()); pRxChar->notify(); }
            if (ev.type == EventType::WIFI_STATUS && pWifiChar) { pWifiChar->setValue(out.c_str()); pWifiChar->notify(); }
        }
    }
}

// --- IR Task ---
void taskIR(void*) {
    irrecv.enableIRIn();
    irsend.begin();
    IRCommand cmd;
    for (;;) {
        if (xQueueReceive(irQueue, &cmd, 10 / portTICK_PERIOD_MS) == pdTRUE) {
            digitalWrite(PIN_LED, HIGH);
            bool ok = false;
            String p = String(cmd.protocol); p.toUpperCase();
            if (p == "NEC") { irsend.sendNEC(cmd.hex, cmd.bits); ok = true; }
            else if (p == "SONY") { irsend.sendSony(cmd.hex, cmd.bits); ok = true; }
            else if (p == "SAMSUNG") { irsend.sendSAMSUNG(cmd.hex, cmd.bits); ok = true; }
            else if (p == "LG") { irsend.sendLG(cmd.hex, cmd.bits); ok = true; }

            EventMessage ev{};
            ev.type = ok ? EventType::IR_TX_OK : EventType::IR_TX_ERROR;
            ev.id = cmd.id;
            if (!ok) strlcpy(ev.errorCode, "UNSUPPORTED_PROTOCOL", sizeof(ev.errorCode));
            xQueueSend(eventQueue, &ev, 0);
            delay(100);
            digitalWrite(PIN_LED, LOW);
        }

        if (irrecv.decode(&results)) {
            digitalWrite(PIN_LED, HIGH);
            EventMessage ev{};
            ev.type = EventType::IR_RX;
            ev.hex = results.value;
            ev.bits = results.bits;
            ev.address = -1; ev.command = -1;
            strlcpy(ev.protocol, typeToString(results.decode_type), sizeof(ev.protocol));
            xQueueSend(eventQueue, &ev, 0);
            delay(50);
            digitalWrite(PIN_LED, LOW);
            irrecv.resume();
        }
        vTaskDelay(2 / portTICK_PERIOD_MS);
    }
}

// --- BLE Callbacks ---
class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* s) { deviceConnected = true; bleConnectedAt = millis(); }
    void onDisconnect(BLEServer* s) { deviceConnected = false; BLEDevice::startAdvertising(); }
};

class IRCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* pChar) {
        JsonDocument doc;
        if (deserializeJson(doc, pChar->getValue().c_str()) == DeserializationError::Ok) {
            IRCommand cmd{};
            cmd.id = doc["id"] | 0;
            strlcpy(cmd.protocol, doc["protocol"] | "NEC", sizeof(cmd.protocol));
            cmd.hex = strtoull(doc["hex"] | "0", nullptr, 0);
            cmd.bits = doc["bits"] | 32;
            xQueueSend(irQueue, &cmd, 0);
        }
    }
};

class WiFiConfigCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* pChar) {
        JsonDocument doc;
        if (deserializeJson(doc, pChar->getValue().c_str()) == DeserializationError::Ok) {
            WiFiCommand cmd{};
            strlcpy(cmd.action, doc["action"] | "", sizeof(cmd.action));
            strlcpy(cmd.ssid, doc["ssid"] | "", sizeof(cmd.ssid));
            strlcpy(cmd.password, doc["password"] | "", sizeof(cmd.password));
            xQueueSend(wifiQueue, &cmd, 0);
        }
    }
};

void wifiCommandTask(void*) {
    WiFiCommand cmd;
    for (;;) {
        if (xQueueReceive(wifiQueue, &cmd, portMAX_DELAY) == pdTRUE) {
            if (String(cmd.action) == "connect") {
                preferences.begin("wifi", false);
                preferences.putString("ssid", cmd.ssid);
                preferences.putString("pass", cmd.password);
                preferences.end();
                WiFi.begin(cmd.ssid, cmd.password);
            } else if (String(cmd.action) == "scan") {
                int n = WiFi.scanNetworks();
                for (int i = 0; i < n; i++) {
                    JsonDocument d;
                    d["type"] = "wifi_net";
                    d["ssid"] = WiFi.SSID(i);
                    d["rssi"] = WiFi.RSSI(i);
                    d["secured"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
                    String out; serializeJson(d, out);
                    if (pWifiChar) { pWifiChar->setValue(out.c_str()); pWifiChar->notify(); }
                    delay(20);
                }
                if (pWifiChar) { pWifiChar->setValue("{\"type\":\"wifi_done\"}"); pWifiChar->notify(); }
            }
        }
    }
}

void setup() {
    Serial.begin(115200);
    pinMode(PIN_LED, OUTPUT);

    irQueue = xQueueCreate(IR_QUEUE_LENGTH, sizeof(IRCommand));
    eventQueue = xQueueCreate(EVENT_QUEUE_LENGTH, sizeof(EventMessage));
    wifiQueue = xQueueCreate(8, sizeof(WiFiCommand));

    preferences.begin("wifi", true);
    String s = preferences.getString("ssid", "");
    String p = preferences.getString("pass", "");
    preferences.end();

    WiFi.mode(WIFI_STA);
    if (s != "") WiFi.begin(s.c_str(), p.c_str());

    BLEDevice::init("ESP32_IR_HUB");
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());
    BLEService* pSvc = pServer->createService(SERVICE_UUID);

    BLECharacteristic* pTx = pSvc->createCharacteristic(CHARACTERISTIC_TX, BLECharacteristic::PROPERTY_WRITE);
    pTx->setCallbacks(new IRCallbacks());
    pRxChar = pSvc->createCharacteristic(CHARACTERISTIC_RX, BLECharacteristic::PROPERTY_NOTIFY);
    pRxChar->addDescriptor(new BLE2902());
    pWifiChar = pSvc->createCharacteristic(CHARACTERISTIC_WIFI, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
    pWifiChar->setCallbacks(new WiFiConfigCallbacks());
    pWifiChar->addDescriptor(new BLE2902());

    pSvc->start();
    BLEDevice::getAdvertising()->addServiceUUID(SERVICE_UUID);
    BLEDevice::startAdvertising();

    xTaskCreatePinnedToCore(eventTask, "EventTask", 4096, NULL, 2, NULL, 1);
    xTaskCreatePinnedToCore(taskIR, "IRTask", 4096, NULL, 3, NULL, 1);
    xTaskCreatePinnedToCore(wifiCommandTask, "WifiCmdTask", 4096, NULL, 1, NULL, 0);

    xTaskCreatePinnedToCore([](void*){ server.on("/api/status", [](){
        JsonDocument d; d["ip"] = WiFi.localIP().toString(); d["rssi"] = WiFi.RSSI();
        String o; serializeJson(d, o); server.send(200, "application/json", o);
    }); server.begin(); for(;;){server.handleClient(); vTaskDelay(10);}}, "HttpTask", 4096, NULL, 1, NULL, 0);
}

void loop() {
    static bool lastW = false;
    bool currW = (WiFi.status() == WL_CONNECTED);
    if (currW != lastW) { sendWifiStatusEvent(); lastW = currW; }

    if (deviceConnected && bleConnectedAt != 0 && (millis() - bleConnectedAt >= BLE_STATUS_DELAY_MS)) {
        static uint32_t sentAt = 0;
        if (sentAt != bleConnectedAt) { sendWifiStatusEvent(); sentAt = bleConnectedAt; }
    }

    // Heartbeat
    static uint32_t lastH = 0;
    if (millis() - lastH >= (currW ? 2000 : 500)) {
        digitalWrite(PIN_LED, HIGH); delay(20); digitalWrite(PIN_LED, LOW);
        lastH = millis();
    }
    vTaskDelay(100 / portTICK_PERIOD_MS);
}
