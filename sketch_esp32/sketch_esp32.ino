/*
 * =========================================================================
 * ESP32 IR Controller & Smart Remote Gateway  â€”  Firmware v5.0.0
 * CompatÃ­vel com o App Web/Mobile (WiFi + BLE)
 *
 * Arquitetura:
 *   - Core 0 (PRO_CPU): WebServer HTTP + WiFi management
 *   - Core 1 (APP_CPU): BLE + IR TX/RX + Loop principal
 *   - Queue FreeRTOS: Desacopla recepÃ§Ã£o HTTP de transmissÃ£o IR
 *
 * Bibliotecas necessárias (instale via Arduino Library Manager):
 *   - IRremoteESP8266 >= 2.8.6   (por crankyoldgit)
 *   - ArduinoJson   >= 7.x        (por bblanchon)
 *   - ESP32 Board Package >= 2.x / 3.x
 *
 * Configuração na Arduino IDE (Tools / Ferramentas):
 *   - Board: "ESP32 Dev Module"
 *   - Partition Scheme: "Huge APP (3MB No OTA/1MB SPIFFS)" 
 *     (ou use o arquivo partitions.csv incluído na pasta do sketch)
 *
 * Pinos padrão (configuráveis via app):
 *   GPIO 15  → Receptor IR  (TSOP38238 / VS1838B)
 *   GPIO 4   → Emissor IR   (LED IR + Transistor)
 *   GPIO 2   → LED de Status
 *   GPIO 18  → Buzzer (0 = desabilitado)
 * =========================================================================
 */

// â”€â”€â”€ Core Includes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebServer.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>

// â”€â”€â”€ IRremoteESP8266 Core â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#include <IRrecv.h>
#include <IRsend.h>
#include <IRutils.h>
#include <IRtext.h>

// â”€â”€â”€ AC Protocols â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Ar-Condicionado: todos os fabricantes principais
#include <ir_Daikin.h>        // DAIKIN, DAIKIN2, DAIKIN160, DAIKIN176, DAIKIN216, DAIKIN128
#include <ir_Mitsubishi.h>    // MITSUBISHI_AC, MITSUBISHI136, MITSUBISHI112
#include <ir_Gree.h>          // GREE
#include <ir_Fujitsu.h>       // FUJITSU_AC
#include <ir_LG.h>            // LG, LG2
#include <ir_Samsung.h>       // SAMSUNG, SAMSUNG_AC, SAMSUNG36
#include <ir_Hitachi.h>       // HITACHI_AC, HITACHI_AC1, HITACHI_AC2, HITACHI_AC3
#include <ir_Haier.h>         // HAIER_AC, HAIER_AC_YRW02
#include <ir_Kelvinator.h>    // KELVINATOR
#include <ir_Toshiba.h>       // TOSHIBA_AC
#include <ir_Whirlpool.h>     // WHIRLPOOL_AC
#include <ir_Midea.h>         // MIDEA, MIDEA24
#include <ir_Panasonic.h>     // PANASONIC, PANASONIC_AC
#include <ir_Sharp.h>         // SHARP, SHARP_AC
#include <ir_TCL.h>           // TCL, TCL112AC
#include <ir_Electra.h>       // ELECTRA_AC
#include <ir_Coolix.h>        // COOLIX
#include <ir_Vestel.h>        // VESTEL_AC
#include <ir_Goodweather.h>   // GOODWEATHER
#include <ir_Argo.h>          // ARGO
// â”€â”€â”€ TV / Decoder / Audio Protocols â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NOTA: SONY, RC5, RC6, DENON, JVC, PIONEER, DISH, CARRIER_AC e BOSCH144 estao integrados nativamente em <IRsend.h> e <IRrecv.h>

// â”€â”€â”€ ConfiguraÃ§Ã£o de Pinos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
uint16_t PIN_IR_RECV = 15;
uint16_t PIN_IR_SEND = 4;
uint16_t PIN_STATUS_LED = 2;
uint16_t PIN_BUZZER = 18;

// â”€â”€â”€ InstÃ¢ncias IR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
IRrecv irrecv(PIN_IR_RECV, 1024, 50, true);
IRsend irsend(PIN_IR_SEND);
decode_results irResults;

// â”€â”€â”€ WebServer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
WebServer server(80);

// â”€â”€â”€ BLE UUIDs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#define SERVICE_UUID      "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_IR_TX_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_IR_RX_UUID   "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_CONFIG_UUID  "beb54840-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_WIFI_UUID    "beb54841-36e1-4688-b7f5-ea07361b26a8"

// â”€â”€â”€ BLE State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
BLEServer*         pServer   = nullptr;
BLECharacteristic* pRxChar   = nullptr;
BLECharacteristic* pWifiChar = nullptr;
bool deviceConnected = false;
bool wasConnected    = false;

// â”€â”€â”€ Estrutura do Comando IR (para a Queue) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
struct IRQueueItem {
  char  protocol[24];
  uint64_t hex;
  uint16_t bits;
  uint8_t  state[48];   // Para ACs multi-byte (ex: Daikin = 35 bytes)
  uint16_t stateLen;
  uint16_t raw[300];    // RAW timings
  uint16_t rawLen;
  uint8_t  repeat;
};

// â”€â”€â”€ FreeRTOS Primitivas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
QueueHandle_t irQueue;
SemaphoreHandle_t wifiMutex;

// â”€â”€â”€ Estado WiFi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
String pendingSsid = "";
String pendingPass = "";
volatile bool shouldConnectWifi = false;
volatile bool shouldScanWifi    = false;
volatile bool wifiScanAsync     = false;
int           wifiScanResult    = -2;  // -2 = idle, -1 = running, >= 0 = done
unsigned long lastWifiCheck     = 0;
unsigned long wifiRetryDelay    = 5000;   // ComeÃ§a com 5s
unsigned long lastWifiRetry     = 0;
int           wifiRetryCount    = 0;
wl_status_t   lastWifiStatus   = WL_IDLE_STATUS;

// â”€â”€â”€ Estado IR Capturado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
struct CapturedSignal {
  bool    hasNew = false;
  String  protocol;
  String  hexCode;
  uint16_t bits;
  uint16_t rawData[300];
  uint16_t rawLen = 0;
} lastCaptured;
SemaphoreHandle_t irCaptureMutex;

// â”€â”€â”€ Helpers NÃ£o-Bloqueantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
void ledBlink(int times, int ms) {
  // Pisca o LED sem usar delay() â€” chama direto no contexto onde Ã© seguro
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_STATUS_LED, HIGH);
    vTaskDelay(ms / portTICK_PERIOD_MS);
    digitalWrite(PIN_STATUS_LED, LOW);
    if (i < times - 1) vTaskDelay(ms / portTICK_PERIOD_MS);
  }
}

void beep(int freq = 2800, int ms = 30) {
  if (PIN_BUZZER > 0) {
    tone(PIN_BUZZER, freq, ms);
  }
}

// â”€â”€â”€ JSON Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
void sendCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  server.sendHeader("Connection", "keep-alive");
  ledBlink(1, 15); // Feedback visual para toda comunicacao HTTP com o app
}

// â”€â”€â”€ IR Transmit Core â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Chamado APENAS dentro da task IR (Core 1) â€” nunca no handler HTTP
void executeIRCommand(const IRQueueItem& cmd) {
  String proto = String(cmd.protocol);
  proto.toUpperCase();

  Serial.printf("[IR TX] Protocol=%s  Hex=0x%llX  Bits=%d  StateLen=%d  RawLen=%d  Repeat=%d\n",
    cmd.protocol, cmd.hex, cmd.bits, cmd.stateLen, cmd.rawLen, cmd.repeat);

  // â”€â”€ RAW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (proto == "RAW" && cmd.rawLen > 0) {
    irsend.sendRaw(cmd.raw, cmd.rawLen, 38);
  }

  // â”€â”€ Protocolos de TV / Decoders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  else if (proto == "NEC" || proto == "NEC2") {
    irsend.sendNEC(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "SONY") {
    irsend.sendSony(cmd.hex, cmd.bits, cmd.repeat > 0 ? cmd.repeat : 2);
  }
  else if (proto == "RC5" || proto == "RC5X") {
    irsend.sendRC5(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "RC6") {
    irsend.sendRC6(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "SAMSUNG" || proto == "SAMSUNG36") {
    irsend.sendSAMSUNG(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "LG" || proto == "LG2") {
    irsend.sendLG(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "PANASONIC") {
    irsend.sendPanasonic64(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "SHARP") {
    irsend.sendSharp(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "DENON") {
    irsend.sendDenon(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "JVC") {
    irsend.sendJVC(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "PIONEER") {
    irsend.sendPioneer(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "DISH") {
    irsend.sendDISH(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "RCMM") {
    irsend.sendRCMM(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "WHYNTER") {
    irsend.sendWhynter(cmd.hex, cmd.bits, cmd.repeat);
  }

  // ── Ar-Condicionado com estado multi-byte ───────────────────────────────────
  else if (proto == "DAIKIN") {
    if (cmd.stateLen == kDaikinStateLength) {
      IRDaikinESP ac(PIN_IR_SEND);
      ac.setRaw(cmd.state);
      ac.send(cmd.repeat);
    } else {
      irsend.sendDaikin(cmd.state, kDaikinStateLength, cmd.repeat);
    }
  }
  else if (proto == "DAIKIN2") {
    if (cmd.stateLen == kDaikin2StateLength) {
      IRDaikin2 ac(PIN_IR_SEND);
      ac.setRaw(cmd.state);
      ac.send(cmd.repeat);
    } else { irsend.sendDaikin2(cmd.state, kDaikin2StateLength, cmd.repeat); }
  }
  else if (proto == "DAIKIN160") {
    irsend.sendDaikin160(cmd.state, kDaikin160StateLength, cmd.repeat);
  }
  else if (proto == "DAIKIN176") {
    irsend.sendDaikin176(cmd.state, kDaikin176StateLength, cmd.repeat);
  }
  else if (proto == "DAIKIN216") {
    irsend.sendDaikin216(cmd.state, kDaikin216StateLength, cmd.repeat);
  }
  else if (proto == "DAIKIN128") {
    irsend.sendDaikin128(cmd.state, kDaikin128StateLength, cmd.repeat);
  }
  else if (proto == "MITSUBISHI_AC") {
    if (cmd.stateLen == kMitsubishiACStateLength) {
      IRMitsubishiAC ac(PIN_IR_SEND);
      ac.setRaw(cmd.state);
      ac.send(cmd.repeat);
    } else { irsend.sendMitsubishiAC(cmd.state, kMitsubishiACStateLength, cmd.repeat); }
  }
  else if (proto == "MITSUBISHI136") {
    irsend.sendMitsubishi136(cmd.state, kMitsubishi136StateLength, cmd.repeat);
  }
  else if (proto == "MITSUBISHI112") {
    irsend.sendMitsubishi112(cmd.state, kMitsubishi112StateLength, cmd.repeat);
  }
  else if (proto == "MITSUBISHI") {
    irsend.sendMitsubishi(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "GREE") {
    if (cmd.stateLen == kGreeStateLength) {
      IRGreeAC ac(PIN_IR_SEND);
      ac.setRaw(cmd.state);
      ac.send(cmd.repeat);
    } else { irsend.sendGree(cmd.hex, cmd.bits, cmd.repeat); }
  }
  else if (proto == "FUJITSU_AC") {
    if (cmd.stateLen > 0) {
      IRFujitsuAC ac(PIN_IR_SEND);
      ac.setRaw(cmd.state, cmd.stateLen);
      ac.send(cmd.repeat);
    }
  }
  else if (proto == "SAMSUNG_AC") {
    if (cmd.stateLen == kSamsungAcStateLength) {
      IRSamsungAc ac(PIN_IR_SEND);
      ac.setRaw(cmd.state);
      ac.send(cmd.repeat);
    } else { irsend.sendSamsungAC(cmd.state, kSamsungAcStateLength, cmd.repeat); }
  }
  else if (proto == "HITACHI_AC") {
    irsend.sendHitachiAC(cmd.state, kHitachiAcStateLength, cmd.repeat);
  }
  else if (proto == "HITACHI_AC1") {
    irsend.sendHitachiAC1(cmd.state, kHitachiAc1StateLength, cmd.repeat);
  }
  else if (proto == "HITACHI_AC2") {
    irsend.sendHitachiAC2(cmd.state, kHitachiAc2StateLength, cmd.repeat);
  }
  else if (proto == "HITACHI_AC3") {
    irsend.sendHitachiAc3(cmd.state, kHitachiAc3StateLength, cmd.repeat);
  }
  else if (proto == "HAIER_AC") {
    irsend.sendHaierAC(cmd.state, kHaierACStateLength, cmd.repeat);
  }
  else if (proto == "HAIER_AC_YRW02") {
    irsend.sendHaierACYRW02(cmd.state, kHaierACYRW02StateLength, cmd.repeat);
  }
  else if (proto == "KELVINATOR") {
    if (cmd.stateLen == kKelvinatorStateLength) {
      IRKelvinatorAC ac(PIN_IR_SEND);
      ac.setRaw(cmd.state);
      ac.send(cmd.repeat);
    } else { irsend.sendKelvinator(cmd.state, kKelvinatorStateLength, cmd.repeat); }
  }
  else if (proto == "TOSHIBA_AC") {
    irsend.sendToshibaAC(cmd.state, kToshibaACStateLength, cmd.repeat);
  }
  else if (proto == "WHIRLPOOL_AC") {
    irsend.sendWhirlpoolAC(cmd.state, kWhirlpoolAcStateLength, cmd.repeat);
  }
  else if (proto == "MIDEA" || proto == "MIDEA24") {
    irsend.sendMidea(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "PANASONIC_AC") {
    if (cmd.stateLen == kPanasonicAcStateLength) {
      IRPanasonicAc ac(PIN_IR_SEND);
      ac.setRaw(cmd.state);
      ac.send(cmd.repeat);
    } else { irsend.sendPanasonicAC(cmd.state, kPanasonicAcStateLength, cmd.repeat); }
  }
  else if (proto == "SHARP_AC") {
    irsend.sendSharpAc(cmd.state, kSharpAcStateLength, cmd.repeat);
  }
  else if (proto == "TCL" || proto == "TCL112AC") {
    irsend.sendTcl112Ac(cmd.state, kTcl112AcStateLength, cmd.repeat);
  }
  else if (proto == "ELECTRA_AC") {
    irsend.sendElectraAC(cmd.state, kElectraAcStateLength, cmd.repeat);
  }
  else if (proto == "COOLIX") {
    irsend.sendCOOLIX(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "VESTEL_AC") {
    if (cmd.stateLen > 0) {
      IRVestelAc ac(PIN_IR_SEND);
      ac.setRaw(cmd.state);
      ac.send(cmd.repeat);
    } else {
      irsend.sendVestelAc(cmd.hex, cmd.bits > 0 ? cmd.bits : kVestelAcBits, cmd.repeat);
    }
  }
  else if (proto == "GOODWEATHER") {
    irsend.sendGoodweather(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "ARGO") {
    irsend.sendArgo(cmd.state, kArgoStateLength, cmd.repeat);
  }
  else if (proto == "CARRIER_AC" || proto == "CARRIER_AC40" || proto == "CARRIER_AC64") {
    irsend.sendCarrierAC(cmd.hex, cmd.bits, cmd.repeat);
  }
  else if (proto == "BOSCH144") {
    irsend.sendBosch144(cmd.state, kBosch144StateLength, cmd.repeat);
  }

  // â”€â”€ Fallback: NEC genÃ©rico â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  else {
    Serial.printf("[IR TX] Protocolo desconhecido '%s', usando NEC genÃ©rico\n", cmd.protocol);
    irsend.sendNEC(cmd.hex, cmd.bits, cmd.repeat);
  }

  // Feedback visual/sonoro (nÃ£o usa delay â€” roda em task prÃ³pria)
  ledBlink(2, 40);
  beep(2800, 30);

  // Notifica via BLE se conectado
  if (deviceConnected && pRxChar) {
    String ack = "{\"success\":true,\"message\":\"IR Transmitido\",\"protocol\":\"" + String(cmd.protocol) + "\"}";
    pRxChar->setValue(ack.c_str());
    pRxChar->notify();
  }
}

// â”€â”€â”€ Task: IR (Core 1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Processa comandos IR da queue + lÃª receptor IR
void taskIR(void* pvParams) {
  irrecv.enableIRIn();
  irsend.begin();

  IRQueueItem item;
  for (;;) {
    // Processa comandos pendentes da queue (sem bloquear mais de 10ms)
    while (xQueueReceive(irQueue, &item, 0) == pdTRUE) {
      irrecv.pause();  // Para receptor durante TX para evitar auto-captaÃ§Ã£o
      executeIRCommand(item);
      vTaskDelay(50 / portTICK_PERIOD_MS); // Aguarda sinal acabar
      irrecv.resume(); // Reativa receptor
    }

    // LÃª sinal IR recebido
    if (irrecv.decode(&irResults)) {
      String proto = typeToString(irResults.decode_type);
      char   hexStr[24];
      snprintf(hexStr, sizeof(hexStr), "0x%llX", irResults.value);

      // Grava na struct compartilhada
      if (xSemaphoreTake(irCaptureMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
        lastCaptured.protocol = proto;
        lastCaptured.hexCode  = String(hexStr);
        lastCaptured.bits     = irResults.bits;
        lastCaptured.rawLen   = min((int)(irResults.rawlen - 1), 299);
        for (int i = 1; i <= lastCaptured.rawLen; i++) {
          lastCaptured.rawData[i - 1] = irResults.rawbuf[i] * kRawTick;
        }
        lastCaptured.hasNew = true;
        xSemaphoreGive(irCaptureMutex);
      }

      // Notifica BLE
      if (deviceConnected && pRxChar) {
        String ble = "{\"success\":true,\"type\":\"rx\",\"protocol\":\"" + proto +
                     "\",\"hex\":\"" + String(hexStr) +
                     "\",\"bits\":" + String(irResults.bits) + "}";
        pRxChar->setValue(ble.c_str());
        pRxChar->notify();
      }

      Serial.printf("[IR RX] %s  %s  %d bits\n", proto.c_str(), hexStr, irResults.bits);
      ledBlink(1, 60);
      irrecv.resume();
    }

    vTaskDelay(5 / portTICK_PERIOD_MS); // Cede CPU
    esp_task_wdt_reset();
  }
}

// â”€â”€â”€ Task: WebServer (Core 0) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
void taskWebServer(void* pvParams) {
  for (;;) {
    server.handleClient();
    vTaskDelay(2 / portTICK_PERIOD_MS);
    esp_task_wdt_reset();
  }
}

// â”€â”€â”€ HTTP Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
void handleStatus() {
  sendCORS();
  String ip   = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : WiFi.softAPIP().toString();
  String macW = WiFi.macAddress();
  String macB = BLEDevice::getAddress().toString().c_str();
  int    rssi = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : 0;

  JsonDocument doc;
  doc["success"]   = true;
  doc["status"]    = "online";
  doc["ip"]        = ip;
  doc["uptime"]    = millis() / 1000;
  doc["freeHeap"]  = ESP.getFreeHeap();
  doc["wifi_mac"]  = macW;
  doc["ble_mac"]   = macB;
  doc["rssi"]      = rssi;
  doc["firmware"]  = "5.0.0";
  doc["core0_free"] = uxTaskGetStackHighWaterMark(nullptr);

  String out;
  serializeJson(doc, out);
  server.send(200, "application/json", out);
}

void handleIRSend() {
  sendCORS();
  if (server.method() == HTTP_OPTIONS) { server.send(204); return; }

  String body = server.hasArg("plain") ? server.arg("plain") : server.arg("body");
  if (body.isEmpty() && server.method() == HTTP_POST) {
    // Tenta ler diretamente do body
    body = server.arg((int)0);
  }

  if (body.isEmpty()) {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"Payload vazio\"}");
    return;
  }

  // Parseia JSON
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"JSON invÃ¡lido\"}");
    return;
  }

  // Monta item para a queue â€” NÃƒO transmite IR aqui! Apenas enfileira.
  IRQueueItem item = {};
  strlcpy(item.protocol, doc["protocol"] | "NEC", sizeof(item.protocol));
  item.bits   = doc["bits"]   | 32;
  item.repeat = doc["repeat"] | 0;

  // Hex code
  const char* hexStr = doc["hex"] | "0x0";
  item.hex = strtoull(hexStr, nullptr, 16);

  // State multi-byte (para ACs)
  if (doc["state"].is<JsonArray>()) {
    JsonArray stateArr = doc["state"];
    item.stateLen = min((size_t)stateArr.size(), sizeof(item.state));
    for (int i = 0; i < item.stateLen; i++) {
      item.state[i] = stateArr[i];
    }
  }

  // RAW timings
  if (doc["raw"].is<JsonArray>()) {
    JsonArray rawArr = doc["raw"];
    item.rawLen = min((size_t)rawArr.size(), sizeof(item.raw) / sizeof(item.raw[0]));
    for (int i = 0; i < item.rawLen; i++) {
      item.raw[i] = rawArr[i];
    }
  }

  // Enfileira â€” responde imediatamente sem bloquear o WebServer!
  if (xQueueSend(irQueue, &item, pdMS_TO_TICKS(200)) == pdTRUE) {
    server.send(200, "application/json", "{\"success\":true,\"message\":\"IR enfileirado\"}");
  } else {
    server.send(503, "application/json", "{\"success\":false,\"message\":\"Queue cheia, tente novamente\"}");
  }
}

void handleReceive() {
  sendCORS();
  if (xSemaphoreTake(irCaptureMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    if (lastCaptured.hasNew) {
      JsonDocument doc;
      doc["success"]  = true;
      doc["hasNew"]   = true;
      doc["protocol"] = lastCaptured.protocol;
      doc["hex"]      = lastCaptured.hexCode;
      doc["bits"]     = lastCaptured.bits;

      JsonArray rawArr = doc["rawTimings"].to<JsonArray>();
      for (int i = 0; i < lastCaptured.rawLen; i++) {
        rawArr.add(lastCaptured.rawData[i]);
      }

      lastCaptured.hasNew = false;
      xSemaphoreGive(irCaptureMutex);

      String out;
      serializeJson(doc, out);
      server.send(200, "application/json", out);
    } else {
      xSemaphoreGive(irCaptureMutex);
      server.send(200, "application/json", "{\"success\":true,\"hasNew\":false}");
    }
  } else {
    server.send(200, "application/json", "{\"success\":true,\"hasNew\":false}");
  }
}

void handleWifiScan() {
  sendCORS();
  // Se scan ainda em andamento, retorna estado
  int n = WiFi.scanComplete();
  if (n == WIFI_SCAN_RUNNING) {
    server.send(202, "application/json", "{\"success\":true,\"scanning\":true}");
    return;
  }
  if (n == WIFI_SCAN_FAILED || n < 0) {
    // Inicia novo scan assÃ­ncrono (nÃ£o bloqueia)
    WiFi.scanNetworks(true);
    server.send(202, "application/json", "{\"success\":true,\"scanning\":true}");
    return;
  }
  // Resultados prontos
  JsonDocument doc;
  JsonArray arr = doc.to<JsonArray>();
  for (int i = 0; i < n; i++) {
    JsonObject net = arr.add<JsonObject>();
    net["ssid"]    = WiFi.SSID(i);
    net["rssi"]    = WiFi.RSSI(i);
    net["secured"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
    net["channel"] = WiFi.channel(i);
  }
  WiFi.scanDelete(); // Libera memÃ³ria do scan
  String out;
  serializeJson(doc, out);
  server.send(200, "application/json", out);
}

void handleWifiConfig() {
  sendCORS();
  if (server.method() == HTTP_OPTIONS) { server.send(204); return; }

  String body = server.hasArg("plain") ? server.arg("plain") : "";
  if (body.isEmpty()) { server.send(400, "application/json", "{\"success\":false,\"message\":\"Sem dados\"}"); return; }

  JsonDocument doc;
  if (deserializeJson(doc, body)) {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"JSON invÃ¡lido\"}");
    return;
  }

  pendingSsid = doc["ssid"] | "";
  pendingPass = doc["password"] | "";

  if (pendingSsid.isEmpty()) {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID vazio\"}");
    return;
  }

  shouldConnectWifi = true;
  wifiRetryCount   = 0;
  wifiRetryDelay   = 5000;

  server.send(200, "application/json", "{\"success\":true,\"message\":\"Conectando ao WiFi...\"}");
}

void handlePins() {
  sendCORS();
  if (!server.hasArg("plain")) { server.send(400, "application/json", "{\"success\":false}"); return; }

  JsonDocument doc;
  deserializeJson(doc, server.arg("plain"));

  if (doc["irReceiverPin"].is<int>())    PIN_IR_RECV    = doc["irReceiverPin"];
  if (doc["irTransmitterPin"].is<int>()) PIN_IR_SEND    = doc["irTransmitterPin"];
  if (doc["statusLedPin"].is<int>())     PIN_STATUS_LED = doc["statusLedPin"];
  if (doc["buzzerPin"].is<int>())        PIN_BUZZER     = doc["buzzerPin"];

  pinMode(PIN_STATUS_LED, OUTPUT);
  // Reinicializa IR nas novas GPIOs
  irrecv.pause();
  irrecv = IRrecv(PIN_IR_RECV, 1024, 50, true);
  irrecv.enableIRIn();
  irsend = IRsend(PIN_IR_SEND);
  irsend.begin();

  ledBlink(3, 100);
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Hardware atualizado\"}");
}

// â”€â”€â”€ BLE Callbacks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class BLEServerCB : public BLEServerCallbacks {
  void onConnect(BLEServer* s) override {
    deviceConnected = true;
    ledBlink(1, 200);
    Serial.println("[BLE] Cliente conectado");
  }
  void onDisconnect(BLEServer* s) override {
    deviceConnected = false;
    Serial.println("[BLE] Cliente desconectado, reiniciando advertising...");
    vTaskDelay(500 / portTICK_PERIOD_MS);
    BLEDevice::startAdvertising();
  }
};

class IRTxCB : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    ledBlink(1, 15);
    String v = c->getValue().c_str();
    if (v.isEmpty()) return;

    JsonDocument doc;
    if (deserializeJson(doc, v)) return;

    IRQueueItem item = {};
    strlcpy(item.protocol, doc["protocol"] | "NEC", sizeof(item.protocol));
    item.bits   = doc["bits"]   | 32;
    item.repeat = doc["repeat"] | 0;
    const char* hexStr = doc["hex"] | "0x0";
    item.hex = strtoull(hexStr, nullptr, 16);

    if (doc["state"].is<JsonArray>()) {
      JsonArray arr = doc["state"];
      item.stateLen = min((size_t)arr.size(), sizeof(item.state));
      for (int i = 0; i < item.stateLen; i++) item.state[i] = arr[i];
    }
    if (doc["raw"].is<JsonArray>()) {
      JsonArray arr = doc["raw"];
      item.rawLen = min((size_t)arr.size(), sizeof(item.raw) / sizeof(item.raw[0]));
      for (int i = 0; i < item.rawLen; i++) item.raw[i] = arr[i];
    }

    xQueueSend(irQueue, &item, 0);
  }
};

class WifiCB : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    ledBlink(1, 15);
    String v = c->getValue().c_str();
    if (v.isEmpty()) return;

    JsonDocument doc;
    if (deserializeJson(doc, v)) return;

    String action = doc["action"] | "";
    if (action == "scan") {
      // Inicia scan assíncrono
      WiFi.scanNetworks(true);
      wifiScanAsync = true;
    } else if (action == "connect") {
      pendingSsid = doc["ssid"] | "";
      pendingPass = doc["password"] | "";
      shouldConnectWifi = true;
      wifiRetryCount = 0;
      wifiRetryDelay = 5000;
    }
  }
};

// â”€â”€â”€ WiFi Management (no loop principal) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
void manageWiFi() {
  // Conectar com credenciais pendentes
  if (shouldConnectWifi && !pendingSsid.isEmpty()) {
    shouldConnectWifi = false;
    Serial.printf("[WiFi] Conectando a: %s\n", pendingSsid.c_str());
    WiFi.disconnect(false);
    vTaskDelay(200 / portTICK_PERIOD_MS);
    WiFi.begin(pendingSsid.c_str(), pendingPass.c_str());
    lastWifiRetry = millis();
    lastWifiStatus = WL_IDLE_STATUS;
  }

  // ReconexÃ£o automÃ¡tica com backoff exponencial
  wl_status_t currentStatus = WiFi.status();

  if (currentStatus != lastWifiStatus) {
    lastWifiStatus = currentStatus;
    if (currentStatus == WL_CONNECTED) {
      String ip  = WiFi.localIP().toString();
      String mac = WiFi.macAddress();
      Serial.printf("[WiFi] Conectado! IP=%s\n", ip.c_str());

      // Reinicia mDNS apÃ³s reconexÃ£o
      MDNS.end();
      if (MDNS.begin("esp32-ir-hub")) {
        MDNS.addService("http", "tcp", 80);
        Serial.println("[mDNS] esp32-ir-hub.local ativo");
      }

      wifiRetryCount = 0;
      wifiRetryDelay = 5000;
      ledBlink(3, 80);

      // Notifica BLE
      if (deviceConnected && pWifiChar) {
        String msg = "{\"success\":true,\"type\":\"wifi_status\",\"status\":\"connected\",\"ip\":\"" +
                     ip + "\",\"wifi_mac\":\"" + mac + "\"}";
        pWifiChar->setValue(msg.c_str());
        pWifiChar->notify();
      }
    } else if (currentStatus == WL_DISCONNECTED || currentStatus == WL_CONNECTION_LOST) {
      Serial.printf("[WiFi] Desconectado (status=%d). Tentativa #%d em %lums\n",
        currentStatus, wifiRetryCount + 1, wifiRetryDelay);
    }
  }

  // Tenta reconectar se desconectado e passou o delay de backoff
  if (currentStatus != WL_CONNECTED && !pendingSsid.isEmpty()) {
    unsigned long now = millis();
    if (now - lastWifiRetry >= wifiRetryDelay) {
      lastWifiRetry = now;
      wifiRetryCount++;
      Serial.printf("[WiFi] Tentativa de reconexÃ£o #%d\n", wifiRetryCount);
      WiFi.disconnect(false);
      vTaskDelay(100 / portTICK_PERIOD_MS);
      WiFi.begin(pendingSsid.c_str(), pendingPass.c_str());

      // Backoff exponencial: 5s â†’ 10s â†’ 20s â†’ 30s (mÃ¡x)
      wifiRetryDelay = min((unsigned long)(wifiRetryDelay * 2), 30000UL);
    }
  }

  // Verifica resultado de scan assÃ­ncrono BLE
  if (wifiScanAsync) {
    int n = WiFi.scanComplete();
    if (n >= 0) {
      wifiScanAsync = false;
      if (deviceConnected && pWifiChar) {
        for (int i = 0; i < n; i++) {
          String net = "{\"type\":\"wifi_net\",\"ssid\":\"" + WiFi.SSID(i) +
                       "\",\"rssi\":" + String(WiFi.RSSI(i)) +
                       ",\"secured\":" + (WiFi.encryptionType(i) != WIFI_AUTH_OPEN ? "true" : "false") +
                       ",\"channel\":" + String(WiFi.channel(i)) + "}";
          pWifiChar->setValue(net.c_str());
          pWifiChar->notify();
          vTaskDelay(30 / portTICK_PERIOD_MS);
        }
        pWifiChar->setValue("{\"type\":\"wifi_done\"}");
        pWifiChar->notify();
      }
      WiFi.scanDelete();
    }
  }
}

// â”€â”€â”€ LED Heartbeat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
unsigned long lastHeartbeat = 0;

void heartbeat() {
  if (millis() - lastHeartbeat < 2000) return;
  lastHeartbeat = millis();
  // Pulso rÃ¡pido para indicar que estÃ¡ ativo
  digitalWrite(PIN_STATUS_LED, HIGH);
  vTaskDelay(20 / portTICK_PERIOD_MS);
  digitalWrite(PIN_STATUS_LED, LOW);
}

// â”€â”€â”€ Setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
void setup() {
  Serial.begin(115200);
  Serial.println("\n[ESP32 IR Hub v5.0.0] Iniciando...");

  // Pinos
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  // Mutex e Queue FreeRTOS
  irQueue       = xQueueCreate(8, sizeof(IRQueueItem)); // Queue de 8 comandos IR
  wifiMutex     = xSemaphoreCreateMutex();
  irCaptureMutex = xSemaphoreCreateMutex();

  // â”€â”€ WiFi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  WiFi.mode(WIFI_AP_STA);         // SoftAP + Station simultÃ¢neos
  WiFi.setAutoReconnect(false);   // Gerenciamos reconexÃ£o manualmente com backoff
  WiFi.persistent(true);          // Salva credenciais na flash

  // SoftAP sempre disponÃ­vel como fallback
  WiFi.softAP("ESP32_IR_HUB_AP", "12345678");
  Serial.printf("[WiFi] SoftAP: ESP32_IR_HUB_AP  IP: %s\n", WiFi.softAPIP().toString().c_str());

  // Tenta conectar com credenciais salvas na flash
  WiFi.begin();
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 8000) {
    vTaskDelay(200 / portTICK_PERIOD_MS);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Conectado! IP: %s\n", WiFi.localIP().toString().c_str());
    pendingSsid = WiFi.SSID();
    // Salva para reconexÃ£o manual
    lastWifiStatus = WL_CONNECTED;
    wifiRetryCount = 0;
  } else {
    Serial.println("\n[WiFi] Sem credenciais salvas. Use o app para configurar.");
  }

  // â”€â”€ mDNS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (MDNS.begin("esp32-ir-hub")) {
    MDNS.addService("http", "tcp", 80);
    Serial.println("[mDNS] esp32-ir-hub.local");
  }

  // â”€â”€ HTTP Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  server.on("/api/status",      HTTP_GET,  handleStatus);
  server.on("/api/ir/send",     HTTP_POST, handleIRSend);
  server.on("/api/ir/receive",  HTTP_GET,  handleReceive);
  server.on("/api/wifi/scan",   HTTP_GET,  handleWifiScan);
  server.on("/api/wifi/config", HTTP_POST, handleWifiConfig);
  server.on("/api/pins/config", HTTP_POST, handlePins);
  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) { sendCORS(); server.send(204); }
    else { server.send(404, "application/json", "{\"error\":\"Not found\"}"); }
  });
  server.begin();
  Serial.println("[HTTP] WebServer iniciado na porta 80");

  // â”€â”€ BLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  BLEDevice::init("ESP32_IR_HUB");
  BLEDevice::setPower(ESP_PWR_LVL_P9); // MÃ¡xima potÃªncia BLE

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new BLEServerCB());

  BLEService* pSvc = pServer->createService(SERVICE_UUID);

  BLECharacteristic* pTx = pSvc->createCharacteristic(CHAR_IR_TX_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  pTx->setCallbacks(new IRTxCB());

  pRxChar = pSvc->createCharacteristic(CHAR_IR_RX_UUID,
    BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
  pRxChar->addDescriptor(new BLE2902());

  pWifiChar = pSvc->createCharacteristic(CHAR_WIFI_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
  pWifiChar->setCallbacks(new WifiCB());
  pWifiChar->addDescriptor(new BLE2902());

  pSvc->start();
  BLEAdvertising* pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Advertising: ESP32_IR_HUB");

  // â”€â”€ Tasks FreeRTOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Task WebServer no Core 0 (PRO_CPU) â€” isola do BLE e IR
  xTaskCreatePinnedToCore(
    taskWebServer,   // funÃ§Ã£o
    "WebServerTask", // nome
    8192,            // stack (bytes)
    nullptr,         // parÃ¢metro
    2,               // prioridade
    nullptr,         // handle
    0                // Core 0
  );

  // Task IR no Core 1 (APP_CPU)
  xTaskCreatePinnedToCore(
    taskIR,
    "IRTask",
    8192,
    nullptr,
    3,       // Prioridade maior para IR ter baixa latÃªncia
    nullptr,
    1        // Core 1
  );

  // Inicia scan WiFi assÃ­ncrono inicial para ter redes disponÃ­veis
  WiFi.scanNetworks(true);

  Serial.println("[ESP32 IR Hub] Pronto!\n");
  ledBlink(5, 60);
}

// â”€â”€â”€ Loop Principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
void loop() {
  // O loop principal apenas gerencia WiFi e heartbeat LED
  // O WebServer roda no Core 0 (taskWebServer)
  // O IR roda no Core 1 (taskIR)

  manageWiFi();
  heartbeat();

  // Cede CPU para outras tasks (NUNCA usar delay() aqui)
  vTaskDelay(50 / portTICK_PERIOD_MS);
}
