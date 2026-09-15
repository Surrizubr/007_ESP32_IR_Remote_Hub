/*
 * ESP32 IR HUB - Firmware v7.1.0
 * Modos: WiFi + BLE Provisioning
 * Comunicação: HTTP REST sobre WiFi (mesma rede local)
 * Features: mDNS, IR Transmit, IR Receive (polling), Heartbeat LED,
 *           BLE Provisioning WiFi com timeout de 60s
 *
 * ─────────────────────────────────────────────────────────────
 *  CONFIGURAÇÃO: preencha o SSID e a senha da sua rede WiFi.
 *  Se deixar "SEU_SSID_AQUI", ele tentará usar credenciais salvas na NVS.
 * ─────────────────────────────────────────────────────────────
 */

#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <IRrecv.h>
#include <IRsend.h>
#include <IRutils.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ─── BLE Config ─────────────────────────────────────────────
#define SERVICE_UUID           "12345678-1234-1234-1234-123456789012"
#define CHAR_WIFI_SCAN_UUID    "11111111-1234-1234-1234-123456789012"
#define CHAR_WIFI_CREDS_UUID   "22222222-1234-1234-1234-123456789012"
#define CHAR_STATUS_UUID       "33333333-1234-1234-1234-123456789012"

// ─── BLE Timeout de Pareamento ──────────────────────────────
// Se nenhum dispositivo conectar dentro deste período, o ESP32
// encerra o modo BLE e reinicia no modo WiFi com as credenciais salvas.
const unsigned long BLE_PAIRING_TIMEOUT_MS = 60000UL; // 60 segundos

unsigned long bleStartTime    = 0;
volatile bool shouldDoWifiScan = false; // flag thread-safe para scan on-demand

enum SystemMode { MODE_WIFI, MODE_BLE };
SystemMode currentMode = MODE_WIFI;

BLEServer          *pServer    = NULL;
BLECharacteristic  *pCharScan  = NULL;
BLECharacteristic  *pCharStatus= NULL;
bool deviceConnected     = false;
bool credentialsReceived = false;
String newSsid = "";
String newPass = "";

// ─── Touch Pin (Touch9 = GPIO32) ─────────────────────────────
const int PIN_TOUCH      = 32;
unsigned long touchStartTime = 0;
bool isTouching          = false;
const int TOUCH_THRESHOLD = 40;

// ─── Credenciais WiFi (preencha aqui) ─────────────────────────
const char* WIFI_SSID = "SEU_SSID_AQUI";
const char* WIFI_PASS = "SUA_SENHA_AQUI";
// ──────────────────────────────────────────────────────────────

// --- Configuração de pinos ---
const int PIN_IR_RECV = 15;
const int PIN_IR_SEND = 4;
const int PIN_LED     = 2; // LED onboard (azul)

// --- Instâncias IR ---
IRsend irsend(PIN_IR_SEND);
IRrecv irrecv(PIN_IR_RECV, 1024, 50, true);
decode_results irResults;

// --- WebServer ---
WebServer server(80);

// --- Queue para comandos IR a serem transmitidos ---
struct IRCommand {
  uint32_t id;
  char     protocol[20];
  uint64_t hex;
  uint16_t bits;
  uint16_t* rawData;
  uint16_t  rawLen;
};
QueueHandle_t irTxQueue;

// --- Buffer de IR recebido (para polling do app) ---
struct IRReceived {
  char     protocol[20];
  char     hex[20];
  uint16_t bits;
  bool     hasNew;
};

SemaphoreHandle_t irRxMutex;
IRReceived latestRxSignal = {"", "", 0, false};

// --- Estado do LED ---
unsigned long lastHeartbeat = 0;

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

void handleHeartbeat() {
  unsigned long now = millis();
  if (WiFi.status() == WL_CONNECTED) {
    // Pulso simples a cada 2 s: conectado
    if (now - lastHeartbeat >= 2000) {
      digitalWrite(PIN_LED, HIGH);
      delay(30);
      digitalWrite(PIN_LED, LOW);
      lastHeartbeat = now;
    }
  } else {
    // Piscada rápida: tentando conectar
    if (now - lastHeartbeat >= 500) {
      digitalWrite(PIN_LED, !digitalRead(PIN_LED));
      lastHeartbeat = now;
    }
  }
}

// Realiza scan WiFi e notifica resultado via BLE
void doWifiScanAndNotify() {
  Serial.println("[BLE] Realizando scan de redes WiFi...");

  // Garante que o rádio WiFi está em modo STA para poder escanear
  WiFi.mode(WIFI_STA);
  int n = WiFi.scanNetworks();

  JsonDocument doc;
  JsonArray networks = doc["networks"].to<JsonArray>();
  for (int i = 0; i < n; ++i) {
    JsonObject net = networks.add<JsonObject>();
    net["ssid"]   = WiFi.SSID(i);
    net["rssi"]   = WiFi.RSSI(i);
    net["secure"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
  }

  String out;
  serializeJson(doc, out);
  Serial.printf("[BLE] Scan concluído: %d rede(s) encontrada(s)\n", n);

  if (pCharScan && deviceConnected) {
    pCharScan->setValue(out.c_str());
    pCharScan->notify();
  }
}

// ─────────────────────────────────────────────────────────────
//  Handlers HTTP
// ─────────────────────────────────────────────────────────────

// GET /
void handleRoot() {
  server.send(200, "text/plain", "ESP32 IR HUB v7.1.0 WiFi+BLE Online");
}

// GET /api/status
void handleStatus() {
  JsonDocument doc;
  doc["status"]    = "online";
  doc["firmware"]  = "7.1.0";
  doc["wifi_mac"]  = WiFi.macAddress();
  doc["ip"]        = WiFi.localIP().toString();
  doc["rssi"]      = WiFi.RSSI();
  doc["uptime"]    = millis() / 1000;
  doc["freeHeap"]  = ESP.getFreeHeap();

  String out;
  serializeJson(doc, out);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", out);
}

// POST /api/ir/send   body: plain=<JSON>
void handleIRSend() {
  server.sendHeader("Access-Control-Allow-Origin", "*");

  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"missing body\"}");
    return;
  }

  String body = server.arg("plain");
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"invalid json\"}");
    return;
  }

  IRCommand cmd{};
  cmd.id   = doc["id"] | 0;
  strlcpy(cmd.protocol, doc["protocol"] | "NEC", sizeof(cmd.protocol));
  cmd.hex  = strtoull(doc["hex"] | "0", nullptr, 0);
  cmd.bits = doc["bits"] | 32;

  // Suporte a RAW
  if (doc["rawData"].is<JsonArray>()) {
    JsonArray arr = doc["rawData"];
    cmd.rawLen  = arr.size();
    cmd.rawData = (uint16_t*)malloc(cmd.rawLen * sizeof(uint16_t));
    if (cmd.rawData) {
      for (int i = 0; i < cmd.rawLen; i++) cmd.rawData[i] = arr[i];
    }
  }

  xQueueSend(irTxQueue, &cmd, portMAX_DELAY);
  server.send(200, "application/json", "{\"success\":true,\"status\":\"queued\"}");
}

// GET /api/ir/receive   — polling: app pergunta se chegou algum sinal
void handleIRReceive() {
  server.sendHeader("Access-Control-Allow-Origin", "*");

  xSemaphoreTake(irRxMutex, portMAX_DELAY);
  IRReceived snap = latestRxSignal;
  latestRxSignal.hasNew = false; // consumiu
  xSemaphoreGive(irRxMutex);

  JsonDocument doc;
  doc["hasNew"]   = snap.hasNew;
  if (snap.hasNew) {
    doc["protocol"] = snap.protocol;
    doc["hex"]      = snap.hex;
    doc["bits"]     = snap.bits;
  }

  String out;
  serializeJson(doc, out);
  server.send(200, "application/json", out);
}

// OPTIONS — CORS preflight
void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

// ─────────────────────────────────────────────────────────────
//  Task: WebServer (Core 0)
// ─────────────────────────────────────────────────────────────

void taskWebServer(void* pvParameters) {
  server.on("/",                HTTP_GET,     handleRoot);
  server.on("/api/status",      HTTP_GET,     handleStatus);
  server.on("/api/ir/send",     HTTP_POST,    handleIRSend);
  server.on("/api/ir/receive",  HTTP_GET,     handleIRReceive);
  server.onNotFound([]() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    if (server.method() == HTTP_OPTIONS) { handleOptions(); return; }
    server.send(404, "application/json", "{\"error\":\"not found\"}");
  });
  server.begin();
  Serial.println("[HTTP] WebServer iniciado na porta 80");

  for (;;) {
    server.handleClient();
    vTaskDelay(5 / portTICK_PERIOD_MS);
  }
}

// ─────────────────────────────────────────────────────────────
//  Task: IR TX + RX (Core 1)
// ─────────────────────────────────────────────────────────────

void taskIR(void* pvParameters) {
  irrecv.enableIRIn();
  irsend.begin();

  IRCommand cmd;
  for (;;) {
    // Transmitir comandos enfileirados
    if (xQueueReceive(irTxQueue, &cmd, 10 / portTICK_PERIOD_MS) == pdTRUE) {
      digitalWrite(PIN_LED, HIGH);
      String proto = String(cmd.protocol);
      proto.toUpperCase();

      if (proto == "RAW" && cmd.rawData != nullptr) {
        irsend.sendRaw(cmd.rawData, cmd.rawLen, 38);
        free(cmd.rawData);
      } else if (proto == "NEC")     irsend.sendNEC(cmd.hex, cmd.bits);
      else if (proto == "SONY")      irsend.sendSony(cmd.hex, cmd.bits);
      else if (proto == "SAMSUNG")   irsend.sendSAMSUNG(cmd.hex, cmd.bits);
      else if (proto == "LG")        irsend.sendLG(cmd.hex, cmd.bits);
      else if (proto == "RC5")       irsend.sendRC5(cmd.hex, cmd.bits);
      else if (proto == "RC6")       irsend.sendRC6(cmd.hex, cmd.bits);
      else if (proto == "PANASONIC") irsend.sendPanasonic(cmd.hex >> 16, cmd.hex & 0xFFFF);
      else if (proto == "JVC")       irsend.sendJVC(cmd.hex, cmd.bits, 0);
      else if (proto == "SHARP")     irsend.sendSharp(cmd.hex >> 8, cmd.hex & 0xFF);
      else                           irsend.sendNEC(cmd.hex, cmd.bits); // fallback NEC

      Serial.printf("[IR TX] %s 0x%llX (%d bits)\n", cmd.protocol, cmd.hex, cmd.bits);
      delay(50);
      digitalWrite(PIN_LED, LOW);
    }

    // Receber sinais IR
    if (irrecv.decode(&irResults)) {
      digitalWrite(PIN_LED, HIGH);

      String protocol = typeToString(irResults.decode_type);
      char hexStr[20];
      sprintf(hexStr, "0x%llX", irResults.value);

      Serial.printf("[IR RX] %s %s (%d bits)\n", protocol.c_str(), hexStr, irResults.bits);

      // Salva no buffer para polling HTTP
      xSemaphoreTake(irRxMutex, portMAX_DELAY);
      strlcpy(latestRxSignal.protocol, protocol.c_str(), sizeof(latestRxSignal.protocol));
      strlcpy(latestRxSignal.hex, hexStr, sizeof(latestRxSignal.hex));
      latestRxSignal.bits   = irResults.bits;
      latestRxSignal.hasNew = true;
      xSemaphoreGive(irRxMutex);

      delay(100);
      digitalWrite(PIN_LED, LOW);
      irrecv.resume();
    }

    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

// ─────────────────────────────────────────────────────────────
//  BLE Callbacks
// ─────────────────────────────────────────────────────────────

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("[BLE] Dispositivo conectado");
      // Scan automático ao conectar — envia lista inicial ao app
      doWifiScanAndNotify();
    }
    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("[BLE] Dispositivo desconectado");
      // Reinicia advertising se ainda não recebeu credenciais
      if (currentMode == MODE_BLE && !credentialsReceived) {
        pServer->startAdvertising();
      }
    }
};

// Callback para scan on-demand: app escreve {"cmd":"scan"} na característica
class MyScanRequestCallback : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pChar) {
      Serial.println("[BLE] Solicitação de scan WiFi recebida pelo app");
      shouldDoWifiScan = true; // executado no loop() para evitar bloqueio do BLE
    }
};

class MyCredsCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String rxValue = pCharacteristic->getValue();
      if (rxValue.length() > 0) {
        Serial.println("[BLE] Credenciais WiFi recebidas");
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, rxValue);
        if (!err) {
          newSsid = doc["ssid"].as<String>();
          newPass = doc["password"].as<String>();
          credentialsReceived = true;

          // Confirma recebimento ao app
          JsonDocument statusDoc;
          statusDoc["status"] = "received";
          String out;
          serializeJson(statusDoc, out);
          pCharStatus->setValue(out.c_str());
          pCharStatus->notify();
        }
      }
    }
};

void startBLEMode() {
  Serial.println("[BLE] Iniciando modo Bluetooth...");
  currentMode      = MODE_BLE;
  bleStartTime     = millis();
  credentialsReceived = false;
  shouldDoWifiScan    = false;

  // Desconecta do WiFi mas mantém o rádio ativo no modo STA para scan posterior
  WiFi.disconnect(true, false);
  delay(100);

  BLEDevice::init("ESP32-IR-Hub");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // CHAR_WIFI_SCAN: NOTIFY (resultado) + WRITE (solicitar novo scan)
  pCharScan = pService->createCharacteristic(
                      CHAR_WIFI_SCAN_UUID,
                      BLECharacteristic::PROPERTY_NOTIFY |
                      BLECharacteristic::PROPERTY_WRITE
                    );
  pCharScan->addDescriptor(new BLE2902());
  pCharScan->setCallbacks(new MyScanRequestCallback());

  BLECharacteristic *pCharCreds = pService->createCharacteristic(
                                         CHAR_WIFI_CREDS_UUID,
                                         BLECharacteristic::PROPERTY_WRITE
                                       );
  pCharCreds->setCallbacks(new MyCredsCallbacks());

  pCharStatus = pService->createCharacteristic(
                      CHAR_STATUS_UUID,
                      BLECharacteristic::PROPERTY_NOTIFY
                    );
  pCharStatus->addDescriptor(new BLE2902());

  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Modo pareamento ativo. Timeout: 60s");
}

void processBLE() {
  // 1) Credenciais recebidas: salvar na NVS e reiniciar em modo WiFi
  if (credentialsReceived) {
    credentialsReceived = false;
    Serial.println("[BLE] Salvando credenciais na NVS e reiniciando...");
    Preferences prefs;
    prefs.begin("wifi_cfg", false);
    prefs.putString("ssid", newSsid);
    prefs.putString("pass", newPass);
    prefs.end();
    delay(1000); // Tempo para o app receber a notificação de confirmação
    ESP.restart();
  }

  // 2) Scan WiFi on-demand solicitado pelo app
  if (shouldDoWifiScan && deviceConnected) {
    shouldDoWifiScan = false;
    doWifiScanAndNotify();
  }

  // 3) Timeout: nenhum dispositivo pareou em 60s → volta ao WiFi
  if (!deviceConnected && (millis() - bleStartTime > BLE_PAIRING_TIMEOUT_MS)) {
    Serial.println("[BLE] Timeout de 60s sem pareamento. Reiniciando no modo WiFi...");
    Serial.println("[BLE] O ESP32 usará as credenciais salvas na NVS (ou as hardcoded).");
    delay(200);
    ESP.restart(); // Reinicia: setup() tentará as credenciais NVS ou hardcoded
  }
}

// ─────────────────────────────────────────────────────────────
//  setup()
// ─────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);

  Serial.println("\n==============================");
  Serial.println("  ESP32 IR HUB v7.1.0 WiFi+BLE");
  Serial.println("==============================");

  // Criar filas e mutex
  irTxQueue = xQueueCreate(20, sizeof(IRCommand));
  irRxMutex = xSemaphoreCreateMutex();

  // Verificar credenciais salvas em NVS (fallback)
  Preferences prefs;
  prefs.begin("wifi_cfg", true);
  String savedSsid = prefs.getString("ssid", "");
  String savedPass = prefs.getString("pass", "");
  prefs.end();

  String ssidToUse = WIFI_SSID;
  String passToUse = WIFI_PASS;

  if (ssidToUse == "SEU_SSID_AQUI" && savedSsid.length() > 0) {
    ssidToUse = savedSsid;
    passToUse = savedPass;
    Serial.printf("[WiFi] Usando rede salva na memoria: \"%s\"\n", ssidToUse.c_str());
  }

  // Conectar ao WiFi
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(ssidToUse.c_str(), passToUse.c_str());

  Serial.printf("[WiFi] Conectando a \"%s\"", ssidToUse.c_str());
  // Aguarda até 15 s na inicialização para dar feedback via Serial
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WiFi] RSSI: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println("[WiFi] Falha na conexão inicial — tentará reconectar em background.");
  }

  // mDNS: acesse como http://esp32-ir-hub.local
  if (MDNS.begin("esp32-ir-hub")) {
    MDNS.addService("http", "tcp", 80);
    Serial.println("[mDNS] Hostname: esp32-ir-hub.local");
  }

  // Criar tasks FreeRTOS
  xTaskCreatePinnedToCore(taskWebServer, "WebServerTask", 8192, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(taskIR,        "IRTask",        4096, NULL, 2, NULL, 1);

  Serial.println("[Setup] Pronto!");
}

// ─────────────────────────────────────────────────────────────
//  loop()
// ─────────────────────────────────────────────────────────────

void loop() {
  // Lida com touch9 (GPIO 32)
  int tVal = touchRead(PIN_TOUCH);
  if (tVal < TOUCH_THRESHOLD) {
    if (!isTouching) {
      isTouching = true;
      touchStartTime = millis();
    } else if (millis() - touchStartTime > 1000) {
      // Segurou por >1s → ativa modo BLE
      if (currentMode == MODE_WIFI) {
        startBLEMode();
      }
      isTouching = false; // reset para não ficar disparando
    }
  } else {
    isTouching = false;
  }

  if (currentMode == MODE_WIFI) {
    handleHeartbeat();

    // Log de reconexão WiFi
    static bool lastConnected = false;
    bool connected = (WiFi.status() == WL_CONNECTED);
    if (connected && !lastConnected) {
      Serial.printf("[WiFi] Reconectado! IP: %s\n", WiFi.localIP().toString().c_str());
    } else if (!connected && lastConnected) {
      Serial.println("[WiFi] Desconectado. Aguardando reconexão automática...");
    }
    lastConnected = connected;

  } else if (currentMode == MODE_BLE) {
    processBLE();

    // LED indica estado BLE:
    //  · Aguardando pareamento → pisca rápido (150ms)
    //  · Dispositivo conectado → pisca devagar (1000ms)
    unsigned long bleLedInterval = deviceConnected ? 1000UL : 150UL;
    unsigned long now = millis();
    if (now - lastHeartbeat >= bleLedInterval) {
      digitalWrite(PIN_LED, !digitalRead(PIN_LED));
      lastHeartbeat = now;
    }
  }

  vTaskDelay(100 / portTICK_PERIOD_MS);
}
