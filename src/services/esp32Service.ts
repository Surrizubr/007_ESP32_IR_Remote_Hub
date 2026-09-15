import { Capacitor } from '@capacitor/core';
import { ESP32DeviceState, IRCommand, ESP32PinConfig } from '../types';

class ESP32Service {
  private isSimulated: boolean = true;
  private snifferInterval: any = null;
  private consecutiveWifiFailures = 0;

  private state: ESP32DeviceState = {
    connected: false,
    connectionType: 'offline',
    wifiConnected: false,
    wifiSsid: '',
    ipAddress: '',
    wifiMac: '',
    rssi: 0,
    uptimeSeconds: 0,
    freeHeap: 0,
    logs: [],
    pinConfig: {
      irReceiverPin: 15,
      irTransmitterPin: 4,
      statusLedPin: 2,
      buzzerPin: 18,
      pwmFrequency: 38000,
    },
  };

  private listeners: ((state: ESP32DeviceState) => void)[] = [];
  private irSnifferCallbacks: ((data: { protocol: string; hexCode: string; bits: number; rawTimings: number[] }) => void)[] = [];

  private lastCommandId = 0;

  constructor() {
    this.loadPersistedState();
    this.startUptimeTicker();
  }

  private generateId(): number {
    this.lastCommandId = (this.lastCommandId + 1) % 65535;
    return this.lastCommandId;
  }

  private loadPersistedState() {
    try {
      const savedIp = localStorage.getItem('esp32_last_ip');
      if (savedIp && !savedIp.includes('.local')) {
        this.state.ipAddress = savedIp;
      } else {
        localStorage.removeItem('esp32_last_ip');
      }
      const savedSsid = localStorage.getItem('esp32_last_ssid');
      if (savedSsid) this.state.wifiSsid = savedSsid;
    } catch (e) {
      console.warn('Error loading persisted ESP32 state', e);
    }
  }

  private persistState() {
    try {
      if (this.state.ipAddress && !this.state.ipAddress.includes('.local')) {
        localStorage.setItem('esp32_last_ip', this.state.ipAddress);
      }
      if (this.state.wifiSsid) {
        localStorage.setItem('esp32_last_ssid', this.state.wifiSsid);
      }
    } catch (e) { }
  }

  public getState(): ESP32DeviceState {
    return { ...this.state };
  }

  public subscribe(callback: (state: ESP32DeviceState) => void) {
    this.listeners.push(callback);
    callback(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public addLog(type: 'info' | 'error' | 'success' | 'tx' | 'rx', message: string) {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    };
    this.state.logs = [newLog, ...this.state.logs].slice(0, 50);
    this.notify();
  }

  private notify() {
    this.state.connected = this.state.wifiConnected;
    this.state.connectionType = this.state.wifiConnected ? 'wifi' : 'offline';

    const currentState = this.getState();
    this.listeners.forEach(cb => cb(currentState));
  }

  public setIpAddress(ip: string) {
    const clean = ip.trim();
    if (!clean.includes('.local')) {
      this.state.ipAddress = clean;
      this.persistState();
      this.notify();
    }
  }

  // ─── Auto-discovery: poll a cada 5 segundos ────────────────

  private startUptimeTicker() {
    setInterval(async () => {
      if (!this.state.wifiConnected && !this.state.isSyncing) {
        // Tenta redescobrir o ESP32
        await this.refreshConnection();
        return;
      }

      if (this.state.ipAddress) {
        try {
          const res = await fetch(`http://${this.state.ipAddress}/api/status`, {
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.ip && typeof data.ip === 'string' && data.ip.includes('.')) {
              this.state.ipAddress = data.ip;
              this.persistState();
            }
            if (data.uptime)   this.state.uptimeSeconds = data.uptime;
            if (data.freeHeap) this.state.freeHeap = data.freeHeap;
            if (data.rssi)     { this.state.rssi = data.rssi; this.state.wifiRssi = data.rssi; }
            if (data.wifi_mac) this.state.wifiMac = data.wifi_mac;
            this.state.wifiConnected = true;
            this.consecutiveWifiFailures = 0;
            this.isSimulated = false;
          } else {
            this.consecutiveWifiFailures++;
            if (this.consecutiveWifiFailures >= 2) {
              this.state.wifiConnected = false;
              this.consecutiveWifiFailures = 0;
            }
          }
        } catch {
          this.consecutiveWifiFailures++;
          if (this.consecutiveWifiFailures >= 2) {
            this.state.wifiConnected = false;
            this.consecutiveWifiFailures = 0;
          }
        }
      }
      this.notify();
    }, 5000);
  }

  // ─── Teste de conexão WiFi ─────────────────────────────────

  public async testWiFiConnection(ip: string): Promise<{ success: boolean; latencyMs?: number; data?: any; message: string }> {
    const cleanIp = ip.trim();
    const startTime = performance.now();
    try {
      const res = await fetch(`http://${cleanIp}/api/status`, {
        signal: AbortSignal.timeout(3000),
      });
      const latency = Math.round(performance.now() - startTime);
      if (res.ok) {
        const data = await res.json();
        this.state.wifiConnected = true;

        // Se a resposta contiver o IP real retornado pelo ESP32 (ex: "192.168.1.100"), usa sempre o IP numérico!
        const numericIp = (data.ip && typeof data.ip === 'string' && data.ip.includes('.'))
          ? data.ip
          : (!cleanIp.includes('.local') ? cleanIp : '');

        if (numericIp) {
          this.state.ipAddress = numericIp;
        }

        if (data.uptime)   this.state.uptimeSeconds = data.uptime;
        if (data.freeHeap) this.state.freeHeap = data.freeHeap;
        if (data.rssi)     this.state.rssi = data.rssi;
        if (data.wifi_mac) this.state.wifiMac = data.wifi_mac;
        this.isSimulated = false;
        this.persistState();
        this.notify();
        return {
          success: true,
          latencyMs: latency,
          data,
          message: `Conectado ao ESP32 via WiFi (${latency}ms)! IP: ${numericIp || this.state.ipAddress}`,
        };
      }
    } catch { }

    const duration = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs: duration,
      message: `Não foi possível alcançar o ESP32 em http://${cleanIp}. Verifique se está ligado e na mesma rede.`,
    };
  }

  // ─── Refresh: tenta reconectar ao ESP32 ───────────────────

  public async refreshConnection() {
    if (this.state.isSyncing) return { wifi: this.state.wifiConnected };

    this.state.isSyncing = true;
    this.notify();

    const result = { wifi: false };

    try {
      // 1. IP salvo
      if (this.state.ipAddress && !this.state.ipAddress.includes('.local')) {
        const r = await this.testWiFiConnection(this.state.ipAddress);
        result.wifi = r.success;
      }

      // 2. Fallback: mDNS ou SoftAP
      if (!result.wifi) {
        const candidates = ['esp32-ir-hub.local', '192.168.4.1'];
        for (const candidate of candidates) {
          if (candidate === this.state.ipAddress) continue;
          const r = await this.testWiFiConnection(candidate);
          if (r.success) {
            result.wifi = true;
            this.addLog('success', `ESP32 encontrado! IP: ${this.state.ipAddress}`);
            break;
          }
        }
      }
    } catch (err) {
      console.error('refreshConnection error:', err);
    } finally {
      this.state.isSyncing = false;
      this.notify();
    }

    return result;
  }

  // ─── Transmitir IR via HTTP ────────────────────────────────

  public async transmitIR(command: IRCommand): Promise<{ success: boolean; durationMs: number }> {
    const startTime = Date.now();
    const cmdId = this.generateId();
    this.addLog('tx', `Enviando ${command.protocol}: ${command.hexCode} (ID: ${cmdId})...`);

    const payloadObj: Record<string, any> = {
      id: cmdId,
      protocol: command.protocol,
      hex: command.hexCode,
      bits: command.bits,
    };
    if (command.acState && command.acState.length > 0) payloadObj.state = command.acState;
    if (command.repeat && command.repeat > 0)          payloadObj.repeat = command.repeat;
    if (command.protocol === 'RAW' && command.rawTimings && command.rawTimings.length > 0) {
      payloadObj.rawData    = command.rawTimings;
      payloadObj.frequency  = 38;
    }

    const payload = JSON.stringify(payloadObj);
    let success = false;

    const tryWiFi = async () => {
      if (!this.state.ipAddress) return false;
      const MAX_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
        try {
          const formData = new URLSearchParams();
          formData.append('plain', payload);
          const res = await fetch(`http://${this.state.ipAddress}/api/ir/send`, {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            if (!this.state.wifiConnected) {
              this.state.wifiConnected = true;
              this.notify();
            }
            return true;
          }
        } catch {
          if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 800));
        }
      }
      return false;
    };

    success = await tryWiFi();

    // Fallback: tenta redescobrir o ESP32
    if (!success) {
      const fallbackIps = ['esp32-ir-hub.local', '192.168.4.1'].filter(ip => ip !== this.state.ipAddress);
      for (const fallbackIp of fallbackIps) {
        try {
          const formData = new URLSearchParams();
          formData.append('plain', payload);
          const res = await fetch(`http://${fallbackIp}/api/ir/send`, {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            success = true;
            this.state.ipAddress = fallbackIp;
            this.state.wifiConnected = true;
            this.persistState();
            this.addLog('info', `ESP32 reencontrado em ${fallbackIp}`);
            this.notify();
            break;
          }
        } catch { }
      }
    }

    // Simulação (modo offline)
    if (!success && this.isSimulated) {
      await new Promise(r => setTimeout(r, 100));
      success = true;
    }

    if (success) {
      this.state.lastTransmittedCommand = {
        name: command.name,
        hexCode: command.hexCode,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      };
      this.addLog('success', `IR Transmitido (${Date.now() - startTime}ms)`);
      this.notify();
    } else {
      this.addLog('error', 'Falha ao transmitir IR — verifique a conexão WiFi com o ESP32');
    }

    return { success, durationMs: Date.now() - startTime };
  }

  // Alias
  public async transmitCommand(command: IRCommand): Promise<{ success: boolean; durationMs: number }> {
    return this.transmitIR(command);
  }

  // ─── Sniffer: polling HTTP por sinais IR recebidos ─────────

  public onIRReceived(callback: (data: { protocol: string; hexCode: string; bits: number; rawTimings: number[] }) => void) {
    this.irSnifferCallbacks.push(callback);
    this.checkSnifferPolling();
    return () => {
      this.irSnifferCallbacks = this.irSnifferCallbacks.filter(cb => cb !== callback);
      this.checkSnifferPolling();
    };
  }

  private checkSnifferPolling() {
    if (this.irSnifferCallbacks.length > 0 && !this.snifferInterval) {
      this.snifferInterval = setInterval(async () => {
        if (this.state.wifiConnected && this.state.ipAddress) {
          try {
            const res = await fetch(`http://${this.state.ipAddress}/api/ir/receive`, {
              signal: AbortSignal.timeout(800),
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.hasNew) {
                const hex = data.hex || '0x0';
                const bits = data.bits || 0;
                const proto = (data.protocol || '').toUpperCase();
                // Ignora pacotes de ruído/glitch espúrio de RF ou ruído na fonte
                if (hex === '0x0' || hex === '0x00' || bits === 0) {
                  return;
                }
                if (proto === 'UNKNOWN' && bits < 12) {
                  return;
                }

                this.simulateIncomingIR(
                  data.protocol || 'NEC',
                  hex,
                  bits || 32,
                  data.rawTimings
                );
              }
            }
          } catch { }
        }
      }, 400);
    } else if (this.irSnifferCallbacks.length === 0 && this.snifferInterval) {
      clearInterval(this.snifferInterval);
      this.snifferInterval = null;
    }
  }

  public simulateIncomingIR(protocol: string, hexCode: string, bits: number, rawTimings?: number[]) {
    this.addLog('rx', `Sinal Capturado: ${protocol} ${hexCode}`);
    const sampleTimings = rawTimings || [9000, 4500, 560, 1690, 560, 560, 560, 1690, 560, 560, 560, 1690, 560, 560];
    const data = { protocol, hexCode, bits, rawTimings: sampleTimings };

    this.state.lastReceivedCommand = {
      protocol: protocol as any,
      hexCode,
      bits,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      rawTimings: sampleTimings,
    };
    this.notify();
    this.irSnifferCallbacks.forEach(cb => cb(data));
  }

  // ─── Pin Config ────────────────────────────────────────────

  public async updatePinConfig(newConfig: Partial<ESP32PinConfig>): Promise<boolean> {
    this.state.pinConfig = { ...this.state.pinConfig, ...newConfig };
    if (this.state.ipAddress) {
      try {
        const formData = new URLSearchParams();
        formData.append('plain', JSON.stringify(this.state.pinConfig));
        await fetch(`http://${this.state.ipAddress}/api/pins/config`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(1500),
        });
      } catch { }
    }
    this.notify();
    return true;
  }

  // ─── Utilitários ───────────────────────────────────────────

  public isInIframe(): boolean {
    try { return window.self !== window.top; } catch { return true; }
  }
}

export const esp32 = new ESP32Service();

// ─────────────────────────────────────────────────────────────
//  Helper: gera o código Arduino do firmware WiFi-Only
// ─────────────────────────────────────────────────────────────

export function generateArduinoSketch(pinConfig: ESP32PinConfig): string {
  return `/*
 * ============================================================================
 * ESP32 IR HUB - Firmware v7.0.0 WiFi-Only
 * ============================================================================
 * Comunicação: HTTP REST sobre WiFi (mesma rede local)
 * Sem BLE — configure o SSID e senha diretamente neste arquivo.
 * ============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <IRrecv.h>
#include <IRsend.h>
#include <IRutils.h>

// ─── CREDENCIAIS WIFI ───────────────────────────────────────
const char* WIFI_SSID = "SEU_SSID_AQUI";
const char* WIFI_PASS = "SUA_SENHA_AQUI";
// ────────────────────────────────────────────────────────────

#define PIN_IR_RECV   ${pinConfig.irReceiverPin}
#define PIN_IR_SEND   ${pinConfig.irTransmitterPin}
#define PIN_LED       ${pinConfig.statusLedPin}

IRsend irsend(PIN_IR_SEND);
IRrecv irrecv(PIN_IR_RECV, 1024, 50, true);
decode_results irResults;
WebServer server(80);

struct IRCommand {
  uint32_t  id;
  char      protocol[20];
  uint64_t  hex;
  uint16_t  bits;
  uint16_t* rawData;
  uint16_t  rawLen;
};
QueueHandle_t irTxQueue;

struct IRReceived {
  char     protocol[20];
  char     hex[20];
  uint16_t bits;
  bool     hasNew;
};
SemaphoreHandle_t irRxMutex;
IRReceived latestRxSignal = {"", "", 0, false};

unsigned long lastHeartbeat = 0;

void handleHeartbeat() {
  unsigned long now = millis();
  if (WiFi.status() == WL_CONNECTED) {
    if (now - lastHeartbeat >= 2000) {
      digitalWrite(PIN_LED, HIGH); delay(30); digitalWrite(PIN_LED, LOW);
      lastHeartbeat = now;
    }
  } else {
    if (now - lastHeartbeat >= 500) {
      digitalWrite(PIN_LED, !digitalRead(PIN_LED));
      lastHeartbeat = now;
    }
  }
}

void handleRoot()   { server.send(200, "text/plain", "ESP32 IR HUB v7.0.0 WiFi-Only"); }

void handleStatus() {
  JsonDocument doc;
  doc["status"]   = "online";
  doc["firmware"] = "7.0.0";
  doc["wifi_mac"] = WiFi.macAddress();
  doc["ip"]       = WiFi.localIP().toString();
  doc["rssi"]     = WiFi.RSSI();
  doc["uptime"]   = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  String out; serializeJson(doc, out);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", out);
}

void handleIRSend() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  if (!server.hasArg("plain")) { server.send(400, "application/json", "{\\"success\\":false}"); return; }
  JsonDocument doc;
  if (deserializeJson(doc, server.arg("plain")) != DeserializationError::Ok) {
    server.send(400, "application/json", "{\\"success\\":false,\\"error\\":\\"invalid json\\"}"); return;
  }
  IRCommand cmd{};
  cmd.id = doc["id"] | 0;
  strlcpy(cmd.protocol, doc["protocol"] | "NEC", sizeof(cmd.protocol));
  cmd.hex  = strtoull(doc["hex"] | "0", nullptr, 0);
  cmd.bits = doc["bits"] | 32;
  if (doc.containsKey("rawData")) {
    JsonArray arr = doc["rawData"]; cmd.rawLen = arr.size();
    cmd.rawData = (uint16_t*)malloc(cmd.rawLen * sizeof(uint16_t));
    if (cmd.rawData) for (int i = 0; i < cmd.rawLen; i++) cmd.rawData[i] = arr[i];
  }
  xQueueSend(irTxQueue, &cmd, portMAX_DELAY);
  server.send(200, "application/json", "{\\"success\\":true,\\"status\\":\\"queued\\"}");
}

void handleIRReceive() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  xSemaphoreTake(irRxMutex, portMAX_DELAY);
  IRReceived snap = latestRxSignal;
  latestRxSignal.hasNew = false;
  xSemaphoreGive(irRxMutex);
  JsonDocument doc;
  doc["hasNew"] = snap.hasNew;
  if (snap.hasNew) { doc["protocol"] = snap.protocol; doc["hex"] = snap.hex; doc["bits"] = snap.bits; }
  String out; serializeJson(doc, out);
  server.send(200, "application/json", out);
}

void taskWebServer(void* p) {
  server.on("/",               HTTP_GET,  handleRoot);
  server.on("/api/status",     HTTP_GET,  handleStatus);
  server.on("/api/ir/send",    HTTP_POST, handleIRSend);
  server.on("/api/ir/receive", HTTP_GET,  handleIRReceive);
  server.onNotFound([](){
    server.sendHeader("Access-Control-Allow-Origin","*");
    server.send(404,"application/json","{\\"error\\":\\"not found\\"}");
  });
  server.begin();
  for(;;){ server.handleClient(); vTaskDelay(5/portTICK_PERIOD_MS); }
}

void taskIR(void* p) {
  irrecv.enableIRIn(); irsend.begin();
  IRCommand cmd;
  for(;;){
    if (xQueueReceive(irTxQueue, &cmd, 10/portTICK_PERIOD_MS) == pdTRUE) {
      digitalWrite(PIN_LED, HIGH);
      String proto = String(cmd.protocol); proto.toUpperCase();
      if (proto=="RAW" && cmd.rawData) { irsend.sendRaw(cmd.rawData, cmd.rawLen, 38); free(cmd.rawData); }
      else if (proto=="NEC")     irsend.sendNEC(cmd.hex, cmd.bits);
      else if (proto=="SONY")    irsend.sendSony(cmd.hex, cmd.bits);
      else if (proto=="SAMSUNG") irsend.sendSAMSUNG(cmd.hex, cmd.bits);
      else if (proto=="LG")      irsend.sendLG(cmd.hex, cmd.bits);
      else if (proto=="RC5")     irsend.sendRC5(cmd.hex, cmd.bits);
      else if (proto=="RC6")     irsend.sendRC6(cmd.hex, cmd.bits);
      else                       irsend.sendNEC(cmd.hex, cmd.bits);
      delay(50); digitalWrite(PIN_LED, LOW);
    }
    if (irrecv.decode(&irResults)) {
      digitalWrite(PIN_LED, HIGH);
      String protocol = typeToString(irResults.decode_type);
      char hexStr[20]; sprintf(hexStr, "0x%llX", irResults.value);
      xSemaphoreTake(irRxMutex, portMAX_DELAY);
      strlcpy(latestRxSignal.protocol, protocol.c_str(), sizeof(latestRxSignal.protocol));
      strlcpy(latestRxSignal.hex, hexStr, sizeof(latestRxSignal.hex));
      latestRxSignal.bits = irResults.bits; latestRxSignal.hasNew = true;
      xSemaphoreGive(irRxMutex);
      delay(100); digitalWrite(PIN_LED, LOW); irrecv.resume();
    }
    vTaskDelay(10/portTICK_PERIOD_MS);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  irTxQueue = xQueueCreate(20, sizeof(IRCommand));
  irRxMutex = xSemaphoreCreateMutex();

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("Conectando a \\"%s\\"", WIFI_SSID);
  for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; i++) { delay(500); Serial.print("."); }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("IP: %s\\n", WiFi.localIP().toString().c_str());
  }

  if (MDNS.begin("esp32-ir-hub")) MDNS.addService("http", "tcp", 80);

  xTaskCreatePinnedToCore(taskWebServer, "WebServer", 8192, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(taskIR,        "IRTask",    4096, NULL, 2, NULL, 1);
}

void loop() {
  handleHeartbeat();
  vTaskDelay(100/portTICK_PERIOD_MS);
}
`;
}
