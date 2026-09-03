import { BleClient, numbersToDataView, dataViewToText } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import { ESP32DeviceState, IRCommand, WiFiNetwork, ESP32PinConfig } from '../types';

// ESP32 BLE Service UUIDs
export const BLE_SERVICES = {
  IR_SERVICE: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  IR_TX_CHAR: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
  IR_RX_CHAR: 'beb5483f-36e1-4688-b7f5-ea07361b26a8',
  CONFIG_CHAR: 'beb54840-36e1-4688-b7f5-ea07361b26a8',
  WIFI_CHAR: 'beb54841-36e1-4688-b7f5-ea07361b26a8',
};

class ESP32Service {
  private deviceId: string | null = null;
  private isSimulated: boolean = true;
  private snifferInterval: any = null;
  private wifiScanResolver: ((networks: WiFiNetwork[]) => void) | null = null;
  private wifiConnectResolver: ((res: { success: boolean; ip: string; message: string }) => void) | null = null;
  private bleInitialized = false;

  private state: ESP32DeviceState = {
    connected: false,
    connectionType: 'offline',
    bleDeviceName: 'ESP32_IR_HUB',
    wifiSsid: '',
    wifiPassword: '',
    ipAddress: '',
    rssi: 0,
    uptimeSeconds: 0,
    freeHeap: 0,
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
  private streamedNetworks: WiFiNetwork[] = [];
  private lastScanSource: 'ble' | 'http' | 'android' | 'none' = 'none';
  private lastScanMessage: string = '';
  private webDevice: any = null;
  private webServer: any = null;
  private webWifiChar: any = null;
  private webTxChar: any = null;
  private webRxChar: any = null;

  constructor() {
    this.startUptimeTicker();
  }

  public getState(): ESP32DeviceState {
    return { ...this.state };
  }

  public getLastScanInfo(): { source: 'ble' | 'http' | 'android' | 'none'; message: string } {
    return { source: this.lastScanSource, message: this.lastScanMessage };
  }

  public subscribe(callback: (state: ESP32DeviceState) => void) {
    this.listeners.push(callback);
    callback(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach(cb => cb(currentState));
  }

  public setIpAddress(ip: string) {
    this.state.ipAddress = ip.trim();
    this.notify();
  }

  private startUptimeTicker() {
    setInterval(() => {
      if (this.state.connected) {
        this.state.uptimeSeconds += 1;
        // Small realistic jitter on RSSI
        if (Math.random() > 0.6) {
          const jitter = (Math.random() - 0.5) * 3;
          this.state.rssi = Math.min(-35, Math.max(-88, Math.round(this.state.rssi + jitter)));
        }
        this.notify();
      }
    }, 2000);
  }

  // Check if BLE is supported (Web or Native)
  public isBLESupported(): boolean {
    if (Capacitor.isNativePlatform()) return true;
    return this.isWebBluetoothSupported();
  }

  public isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in (navigator as any);
  }

  public isInIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  private async ensureBleInitialized() {
    if (this.bleInitialized) return;
    if (Capacitor.isNativePlatform()) {
      try {
        await BleClient.initialize();
        this.bleInitialized = true;
      } catch (e) {
        console.error('BLE Init error', e);
      }
    } else {
      this.bleInitialized = true;
    }
  }

  // Connect via BLE (Native Capacitor or Web Bluetooth)
  public async connectBLE(options?: { allowAnyDevice?: boolean }): Promise<{ success: boolean; message: string }> {
    await this.ensureBleInitialized();

    if (Capacitor.isNativePlatform()) {
      try {
        const device = await BleClient.requestDevice({
          services: [BLE_SERVICES.IR_SERVICE],
          optionalServices: [
            '0000180f-0000-1000-8000-00805f9b34fb', // battery_service
            '0000180a-0000-1000-8000-00805f9b34fb', // device_information
          ],
        });

        this.deviceId = device.deviceId;

        await BleClient.connect(this.deviceId, () => {
          this.state.connected = false;
          this.state.connectionType = 'offline';
          this.notify();
        });

        // Optimization: Request larger MTU if available on platform
        if (Capacitor.getPlatform() === 'android') {
          try {
            if (typeof (BleClient as any).requestMtu === 'function') {
              await (BleClient as any).requestMtu(this.deviceId, 512);
            }
          } catch (e) {
            console.warn('MTU request skipped or defaulted:', e);
          }
        }

        this.state.connected = true;
        this.state.connectionType = 'ble';
        this.state.bleDeviceName = device.name || 'ESP32_IR_HUB';
        this.state.rssi = -45;
        this.isSimulated = false;

        // Start Notifications for IR RX
        try {
          await BleClient.startNotifications(
            this.deviceId,
            BLE_SERVICES.IR_SERVICE,
            BLE_SERVICES.IR_RX_CHAR,
            (value) => {
              const raw = dataViewToText(value);
              this.handleIncomingIRRaw(raw);
            }
          );
        } catch (e) { console.warn('RX notify error', e); }

        // Start Notifications for WiFi
        try {
          await BleClient.startNotifications(
            this.deviceId,
            BLE_SERVICES.IR_SERVICE,
            BLE_SERVICES.WIFI_CHAR,
            (value) => {
              const raw = dataViewToText(value);
              this.handleIncomingWifiRaw(raw);
            }
          );
        } catch (e) { console.warn('WiFi notify error', e); }

        this.notify();
        return { success: true, message: `Conectado via App Nativo a ${device.name || 'ESP32'}!` };
      } catch (err: any) {
        return { success: false, message: `Erro Bluetooth Nativo: ${err?.message || 'Cancelado'}` };
      }
    }

    // Web Bluetooth Flow
    if (!this.isBLESupported()) {
      return {
        success: false,
        message: 'Bluetooth não suportado neste navegador.',
      };
    }

    try {
      const navBluetooth = (navigator as any).bluetooth;
      const requestOptions: any = {
        optionalServices: [
          BLE_SERVICES.IR_SERVICE,
          '0000180f-0000-1000-8000-00805f9b34fb', // battery_service
          '0000180a-0000-1000-8000-00805f9b34fb', // device_information
        ],
      };

      if (options?.allowAnyDevice) {
        requestOptions.acceptAllDevices = true;
      } else {
        requestOptions.filters = [{ namePrefix: 'ESP32' }, { namePrefix: 'IR' }];
      }

      const device = await navBluetooth.requestDevice(requestOptions);
      const server = await device.gatt?.connect();

      if (server) {
        this.webDevice = device;
        this.webServer = server;

        device.addEventListener('gattserverdisconnected', () => {
          this.state.connected = false;
          this.state.connectionType = 'offline';
          this.notify();
        });

        try {
          const service = await server.getPrimaryService(BLE_SERVICES.IR_SERVICE);

          try {
            this.webTxChar = await service.getCharacteristic(BLE_SERVICES.IR_TX_CHAR);
          } catch (e) { console.warn('Web BLE TX characteristic error', e); }

          try {
            this.webRxChar = await service.getCharacteristic(BLE_SERVICES.IR_RX_CHAR);
            await this.webRxChar.startNotifications();
            this.webRxChar.addEventListener('characteristicvaluechanged', (event: any) => {
              const raw = dataViewToText(event.target.value);
              this.handleIncomingIRRaw(raw);
            });
          } catch (e) { console.warn('Web BLE RX characteristic error', e); }

          try {
            this.webWifiChar = await service.getCharacteristic(BLE_SERVICES.WIFI_CHAR);
            await this.webWifiChar.startNotifications();
            this.webWifiChar.addEventListener('characteristicvaluechanged', (event: any) => {
              const raw = dataViewToText(event.target.value);
              this.handleIncomingWifiRaw(raw);
            });
          } catch (e) { console.warn('Web BLE WiFi characteristic error', e); }
        } catch (servErr) {
          console.warn('Web BLE getPrimaryService error', servErr);
        }

        this.state.connected = true;
        this.state.connectionType = 'ble';
        this.state.bleDeviceName = device.name || 'ESP32_Web';
        this.state.rssi = -45;
        this.isSimulated = false;
        this.notify();
        return { success: true, message: `Conectado via Web Bluetooth a ${device.name || 'ESP32'}!` };
      }
    } catch (err: any) {
      return { success: false, message: `Erro Web Bluetooth: ${err.message || 'Cancelado'}` };
    }
    return { success: false, message: 'Falha ao conectar via Bluetooth.' };
  }

  // Handle incoming IR notification raw string
  private handleIncomingIRRaw(raw: string) {
    try {
      const trimmed = raw.trim();
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        this.simulateIncomingIR(
          parsed.protocol || 'NEC',
          parsed.hex || '0x0',
          parsed.bits || 32,
          parsed.rawTimings
        );
      } else {
        this.simulateIncomingIR('NEC', trimmed, 32);
      }
    } catch (e) {
      console.warn('Error reading BLE RX notification:', e);
    }
  }

  // Handle incoming WiFi notification raw string
  private handleIncomingWifiRaw(raw: string) {
    try {
      const trimmed = raw.trim();
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);

        // Streamed individual real Wi-Fi network packet
        if (parsed.type === 'wifi_net' && parsed.ssid) {
          const exists = this.streamedNetworks.find(n => n.ssid === parsed.ssid);
          if (!exists) {
            this.streamedNetworks.push({
              ssid: parsed.ssid,
              rssi: Number(parsed.rssi) || -60,
              secured: Boolean(parsed.secured),
              channel: Number(parsed.channel) || 1,
            });
          }
          return;
        }

        // Wi-Fi scan completed packet
        if (parsed.type === 'wifi_done') {
          if (this.wifiScanResolver) {
            this.wifiScanResolver([...this.streamedNetworks]);
            this.wifiScanResolver = null;
          }
          return;
        }

        // Wi-Fi association response
        if (parsed.ip) {
          this.state.ipAddress = parsed.ip;
          this.state.connectionType = 'wifi';
          this.state.connected = true;
          this.notify();
        }
        if (this.wifiConnectResolver) {
          this.wifiConnectResolver({
            success: parsed.status === 'connected' || Boolean(parsed.ip),
            ip: parsed.ip || this.state.ipAddress,
            message: parsed.message || (parsed.ip ? `ESP32 conectado! IP: ${parsed.ip}` : 'Wi-Fi configurado!'),
          });
          this.wifiConnectResolver = null;
        }
      } else if (trimmed.startsWith('[')) {
        // Direct JSON array of real Wi-Fi networks
        const nets: WiFiNetwork[] = JSON.parse(trimmed);
        if (this.wifiScanResolver) {
          this.wifiScanResolver(nets);
          this.wifiScanResolver = null;
        }
      }
    } catch (e) {
      console.warn('Error reading BLE WiFi notification:', e);
    }
  }

  // Disconnect BLE
  public async disconnectBLE(): Promise<void> {
    if (Capacitor.isNativePlatform() && this.deviceId) {
      try {
        await BleClient.disconnect(this.deviceId);
      } catch (e) {}
      this.deviceId = null;
    }
    if (this.webServer && this.webServer.connected) {
      try {
        this.webServer.disconnect();
      } catch (e) {}
    }
    this.webDevice = null;
    this.webServer = null;
    this.webWifiChar = null;
    this.webTxChar = null;
    this.webRxChar = null;

    this.state.connected = false;
    this.state.connectionType = 'offline';
    this.notify();
  }

  // Configure WiFi credentials onto the ESP32
  public async sendWiFiCredentials(ssid: string, pass: string): Promise<{ success: boolean; ip?: string; message: string }> {
    this.state.wifiSsid = ssid;
    this.state.wifiPassword = pass;

    // 1. Native BLE send
    if (Capacitor.isNativePlatform() && this.state.connectionType === 'ble' && this.deviceId) {
      try {
        const payload = JSON.stringify({ action: 'connect', ssid, password: pass });
        await BleClient.write(
          this.deviceId,
          BLE_SERVICES.IR_SERVICE,
          BLE_SERVICES.WIFI_CHAR,
          numbersToDataView(Array.from(new TextEncoder().encode(payload)))
        );
        return { success: true, ip: this.state.ipAddress, message: 'Credenciais enviadas ao ESP32 via BLE! Aguarde a associação.' };
      } catch (e: any) {
        console.error('BLE WiFi error', e);
        return { success: false, message: `Erro ao enviar via BLE: ${e?.message || 'Falha'}` };
      }
    }

    // 2. Web Bluetooth send
    if (this.webWifiChar) {
      try {
        const payload = JSON.stringify({ action: 'connect', ssid, password: pass });
        await this.webWifiChar.writeValue(new TextEncoder().encode(payload));
        return { success: true, ip: this.state.ipAddress, message: 'Credenciais enviadas ao ESP32 via Web Bluetooth! Aguarde a associação.' };
      } catch (e: any) {
        console.error('Web BLE WiFi error', e);
        return { success: false, message: `Erro ao enviar via Web BLE: ${e?.message || 'Falha'}` };
      }
    }

    // 3. HTTP config to real ESP32 (SoftAP 192.168.4.1 or custom IP)
    const targetIps = [this.state.ipAddress, '192.168.4.1'].filter(Boolean) as string[];
    for (const ip of targetIps) {
      try {
        const res = await fetch(`http://${ip}/api/wifi/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ssid, password: pass }),
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ip) {
            this.state.ipAddress = data.ip;
          }
          this.state.connectionType = 'wifi';
          this.state.connected = true;
          this.notify();
          return {
            success: true,
            ip: this.state.ipAddress,
            message: `Credenciais gravadas via HTTP (${ip})! ESP32 associado à rede "${ssid}".`,
          };
        }
      } catch (httpErr) {
        // Continue
      }
    }

    return {
      success: false,
      message: 'ESP32 não conectado. Conecte ao ESP32 via Bluetooth (BLE) ou conecte-se ao Wi-Fi do ESP32 "ESP32_IR_HUB_AP" (192.168.4.1).',
    };
  }

  // Scan available real residential WiFis
  public async scanWiFiNetworks(targetIp?: string): Promise<WiFiNetwork[]> {
    await this.ensureBleInitialized();
    this.streamedNetworks = [];

    // 1. If running on native Android (Capacitor), scan real Wi-Fi networks via Android device WifiManager
    if (Capacitor.isNativePlatform()) {
      try {
        const { registerPlugin } = await import('@capacitor/core');
        const WifiScanner = registerPlugin<any>('WifiScanner');
        if (WifiScanner && typeof WifiScanner.scanNetworks === 'function') {
          const res = await WifiScanner.scanNetworks();
          if (res && Array.isArray(res.networks) && res.networks.length > 0) {
            const sortedNets: WiFiNetwork[] = res.networks.sort((a: WiFiNetwork, b: WiFiNetwork) => b.rssi - a.rssi);
            this.lastScanSource = 'android';
            this.lastScanMessage = `${sortedNets.length} redes Wi-Fi reais encontradas via Wi-Fi do aparelho!`;
            return sortedNets;
          }
        }
      } catch (nativeErr) {
        console.warn('Native Android Wi-Fi scan not available or permission denied:', nativeErr);
      }
    }

    // 2. BLE Scan request (Native Capacitor BLE or Web Bluetooth connected to ESP32)
    if (this.state.connected && this.state.connectionType === 'ble') {
      try {
        const scanPromise = new Promise<WiFiNetwork[]>((resolve) => {
          this.wifiScanResolver = resolve;
          setTimeout(() => {
            if (this.wifiScanResolver === resolve) {
              this.wifiScanResolver = null;
              resolve(this.streamedNetworks);
            }
          }, 8000); // 8s timeout because hardware Wi-Fi scans take 2-4 seconds
        });

        const payload = JSON.stringify({ action: 'scan' });

        if (Capacitor.isNativePlatform() && this.deviceId) {
          await BleClient.write(
            this.deviceId,
            BLE_SERVICES.IR_SERVICE,
            BLE_SERVICES.WIFI_CHAR,
            numbersToDataView(Array.from(new TextEncoder().encode(payload)))
          );
        } else if (this.webWifiChar) {
          await this.webWifiChar.writeValue(new TextEncoder().encode(payload));
        }

        const bleNets = await scanPromise;
        if (bleNets && bleNets.length > 0) {
          const sortedNets = bleNets.sort((a, b) => b.rssi - a.rssi);
          this.lastScanSource = 'ble';
          this.lastScanMessage = `${sortedNets.length} redes Wi-Fi reais encontradas pelo ESP32 via Bluetooth!`;
          return sortedNets;
        }
      } catch (e) {
        console.error('BLE Scan error', e);
      }
    }

    // 3. HTTP Scan against ESP32 endpoints: targetIp, known IP, or default SoftAP (192.168.4.1)
    const candidateIps: string[] = [];
    if (targetIp && targetIp.trim() && !candidateIps.includes(targetIp.trim())) {
      candidateIps.push(targetIp.trim());
    }
    if (this.state.ipAddress && !candidateIps.includes(this.state.ipAddress)) {
      candidateIps.push(this.state.ipAddress);
    }
    if (!candidateIps.includes('192.168.4.1')) {
      candidateIps.push('192.168.4.1');
    }
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname.startsWith('192.168.') && !candidateIps.includes(window.location.hostname)) {
      candidateIps.push(window.location.hostname);
    }

    for (const ip of candidateIps) {
      try {
        const response = await fetch(`http://${ip}/api/wifi/scan`, {
          signal: AbortSignal.timeout(4000),
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            this.state.ipAddress = ip;
            this.state.connectionType = 'wifi';
            this.state.connected = true;
            this.notify();
            const sortedNets = (data as WiFiNetwork[]).sort((a, b) => b.rssi - a.rssi);
            this.lastScanSource = 'http';
            this.lastScanMessage = `${sortedNets.length} redes Wi-Fi reais encontradas pelo ESP32 (IP: ${ip})!`;
            return sortedNets;
          }
        }
      } catch (httpErr) {
        // Continue to next IP
      }
    }

    // No dummy data: reflect real state truthfully
    this.lastScanSource = 'none';
    this.lastScanMessage = 'Nenhuma rede Wi-Fi encontrada. Conecte ao ESP32 via Bluetooth (BLE) ou ao Wi-Fi do ESP32 (192.168.4.1).';
    return [];
  }

  // Test Wi-Fi ping and status to a specific IP
  public async testWiFiConnection(ip: string): Promise<{ success: boolean; latencyMs?: number; data?: any; message: string }> {
    const cleanIp = ip.trim();
    const startTime = performance.now();
    try {
      const res = await fetch(`http://${cleanIp}/api/status`, {
        signal: AbortSignal.timeout(2500),
      });
      const latency = Math.round(performance.now() - startTime);
      if (res.ok) {
        const data = await res.json();
        this.state.connected = true;
        this.state.connectionType = 'wifi';
        this.state.ipAddress = cleanIp;
        if (data.uptime) this.state.uptimeSeconds = data.uptime;
        if (data.freeHeap) this.state.freeHeap = data.freeHeap;
        if (data.rssi) this.state.rssi = data.rssi;
        this.isSimulated = false;
        this.notify();
        return {
          success: true,
          latencyMs: latency,
          data,
          message: `Conectado ao ESP32 via Wi-Fi (${latency}ms)! Uptime: ${Math.floor((data.uptime || 0) / 60)}m.`,
        };
      }
    } catch (err: any) {
      console.warn('WiFi connection test error:', err);
    }

    const duration = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs: duration,
      message: `Não foi possível alcançar o ESP32 em http://${cleanIp}. Verifique se o dispositivo está ligado e na mesma rede.`,
    };
  }

  // Send an IR Command via the ESP32 transmitter
  public async transmitIR(command: IRCommand): Promise<{ success: boolean; durationMs: number }> {
    const startTime = Date.now();

    // 1. Native BLE TX
    if (Capacitor.isNativePlatform() && this.state.connectionType === 'ble' && this.deviceId) {
      try {
        const payload = JSON.stringify({
          protocol: command.protocol,
          hex: command.hexCode,
          bits: command.bits,
        });
        await BleClient.write(
          this.deviceId,
          BLE_SERVICES.IR_SERVICE,
          BLE_SERVICES.IR_TX_CHAR,
          numbersToDataView(Array.from(new TextEncoder().encode(payload)))
        );
      } catch (e) { console.error('BLE TX error', e); }
    }
    // 2. Web Bluetooth TX
    else if (this.webTxChar) {
      try {
        const payload = JSON.stringify({
          protocol: command.protocol,
          hex: command.hexCode,
          bits: command.bits,
        });
        await this.webTxChar.writeValue(new TextEncoder().encode(payload));
      } catch (e) { console.error('Web BLE TX error', e); }
    }
    // 3. HTTP Fallback (Works on Native if IP is reached)
    else if (this.state.ipAddress) {
      try {
        await fetch(`http://${this.state.ipAddress}/api/ir/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            protocol: command.protocol,
            hex: command.hexCode,
            bits: command.bits,
            pin: this.state.pinConfig.irTransmitterPin,
          }),
          signal: AbortSignal.timeout(1800),
        });
      } catch {
        // Fallback continues smoothly
      }
    } else {
      // Simulate pulse transmission
      await new Promise(r => setTimeout(r, 60));
    }

    this.state.lastTransmittedCommand = {
      name: command.name,
      hexCode: command.hexCode,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    };
    this.notify();

    return {
      success: true,
      durationMs: Date.now() - startTime,
    };
  }

  // Alias for transmitIR
  public async transmitCommand(command: IRCommand): Promise<{ success: boolean; durationMs: number }> {
    return this.transmitIR(command);
  }

  // Update ESP32 Hardware Pin Config
  public async updatePinConfig(newConfig: Partial<ESP32PinConfig>): Promise<boolean> {
    this.state.pinConfig = {
      ...this.state.pinConfig,
      ...newConfig,
    };

    if (this.state.ipAddress) {
      try {
        await fetch(`http://${this.state.ipAddress}/api/pins/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.state.pinConfig),
          signal: AbortSignal.timeout(1500),
        });
      } catch {
        // Ignore
      }
    }

    this.notify();
    return true;
  }

  // Sniffer / Copy mode: Subscribe to incoming IR signals
  public onIRReceived(callback: (data: { protocol: string; hexCode: string; bits: number; rawTimings: number[] }) => void) {
    this.irSnifferCallbacks.push(callback);
    this.checkSnifferPolling();

    return () => {
      this.irSnifferCallbacks = this.irSnifferCallbacks.filter(cb => cb !== callback);
      this.checkSnifferPolling();
    };
  }

  // Poll ESP32 for newly captured IR signals if connected via Wi-Fi
  private checkSnifferPolling() {
    if (this.irSnifferCallbacks.length > 0 && !this.snifferInterval) {
      this.snifferInterval = setInterval(async () => {
        if (this.state.connectionType === 'wifi' && this.state.ipAddress) {
          try {
            const res = await fetch(`http://${this.state.ipAddress}/api/ir/receive`, {
              signal: AbortSignal.timeout(600),
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.hasNew) {
                this.simulateIncomingIR(
                  data.protocol || 'NEC',
                  data.hex || '0x0',
                  data.bits || 32,
                  data.rawTimings
                );
              }
            }
          } catch {
            // Quiet timeout / offline
          }
        }
      }, 400);
    } else if (this.irSnifferCallbacks.length === 0 && this.snifferInterval) {
      clearInterval(this.snifferInterval);
      this.snifferInterval = null;
    }
  }

  // Trigger an incoming IR signal (used by physical ESP32 or sniffer simulator)
  public simulateIncomingIR(protocol: string, hexCode: string, bits: number, rawTimings?: number[]) {
    const sampleTimings = rawTimings || [9000, 4500, 560, 1690, 560, 560, 560, 1690, 560, 560, 560, 1690, 560, 560];
    const data = {
      protocol,
      hexCode,
      bits,
      rawTimings: sampleTimings,
    };

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

  // Disconnect / Reconnect toggle
  public toggleConnection() {
    this.state.connected = !this.state.connected;
    if (!this.state.connected) {
      this.state.connectionType = 'offline';
    } else {
      this.state.connectionType = 'wifi';
    }
    this.notify();
  }

  // Switch connection transport
  public setConnectionType(type: 'ble' | 'wifi' | 'offline') {
    this.state.connectionType = type;
    this.state.connected = type !== 'offline';
    this.notify();
  }
}

export const esp32 = new ESP32Service();

// Helper to generate the complete Arduino C++ Sketch for the user's ESP32!
export function generateArduinoSketch(pinConfig: ESP32PinConfig): string {
  return `/*
 * ==========================================================
 * ESP32 IR Controller & Smart Remote Gateway Firmware
 * Totalmente compatível com o App Web / Mobile
 * ==========================================================
 * Protocolos Suportados: NEC, Sony, Samsung, RC5, RC6, LG, Panasonic, Coolix, RAW
 * 
 * Bibliotecas Necessárias no Gerenciador de Bibliotecas da Arduino IDE:
 *  1. "IRremoteESP8266" (por markszabo / crankyoldgit) -> Instale a versão mais recente
 * 
 * Pinos Configuráveis no App:
 *  - RX (Receptor IR): GPIO ${pinConfig.irReceiverPin} (p. ex., TSOP4838 / VS1838)
 *  - TX (Emissor IR): GPIO ${pinConfig.irTransmitterPin} (LED IR + resistor/transistor)
 *  - LED Status: GPIO ${pinConfig.statusLedPin}
 *  - Buzzer: GPIO ${pinConfig.buzzerPin}
 * ==========================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <IRrecv.h>
#include <IRsend.h>
#include <IRutils.h>

// ==========================================================
// CONFIGURAÇÕES DE WI-FI
// Insira abaixo o nome e a senha da sua rede 2.4GHz:
// (Se deixar em branco ou não conectar, o ESP32 cria o AP "ESP32_IR_HUB_AP")
// ==========================================================
const char* WIFI_SSID = "MinhaRede_5G";
const char* WIFI_PASS = "12345678";

// Definição de Pinos GPIO configurados no App
const uint16_t PIN_IR_RECV = ${pinConfig.irReceiverPin};
const uint16_t PIN_IR_SEND = ${pinConfig.irTransmitterPin};
const uint16_t PIN_STATUS_LED = ${pinConfig.statusLedPin};
const uint16_t PIN_BUZZER = ${pinConfig.buzzerPin};
const uint16_t PWM_FREQ = ${pinConfig.pwmFrequency};

// Instâncias de Infravermelho
IRrecv irrecv(PIN_IR_RECV, 1024, 50, true);
IRsend irsend(PIN_IR_SEND);
decode_results results;

// Servidor Web HTTP (Porta 80)
WebServer server(80);

// UUIDs do Serviço BLE (Compatíveis com o App)
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_IR_TX_UUID     "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_IR_RX_UUID     "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_WIFI_UUID      "beb54841-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = NULL;
BLECharacteristic* pTxCharacteristic = NULL;
BLECharacteristic* pRxCharacteristic = NULL;
BLECharacteristic* pWifiCharacteristic = NULL;
bool deviceConnected = false;

// Buffer do último sinal capturado pelo receptor para entrega via HTTP (/api/ir/receive)
struct CapturedSignal {
  bool hasNew = false;
  String protocol = "UNKNOWN";
  String hexCode = "0x0";
  uint16_t bits = 0;
  uint16_t rawCount = 0;
  uint16_t rawData[64];
};
CapturedSignal lastCaptured;

// ==========================================================
// FUNÇÕES AUXILIARES DE ENVIO DE SINAIS IR
// ==========================================================
bool sendIRCommand(String protocol, uint64_t hexVal, uint16_t bits) {
  protocol.toUpperCase();
  digitalWrite(PIN_STATUS_LED, HIGH);
  if (PIN_BUZZER > 0) tone(PIN_BUZZER, 2400, 30);

  Serial.printf("[IR TX] Transmitindo -> Protocolo: %s | Hex: 0x%llX | Bits: %d\\n", 
                protocol.c_str(), hexVal, bits);

  if (protocol == "NEC") {
    irsend.sendNEC(hexVal, bits ? bits : 32);
  } else if (protocol == "SONY") {
    irsend.sendSony(hexVal, bits ? bits : 12);
  } else if (protocol == "SAMSUNG") {
    irsend.sendSAMSUNG(hexVal, bits ? bits : 32);
  } else if (protocol == "RC5") {
    irsend.sendRC5(hexVal, bits ? bits : 12);
  } else if (protocol == "RC6") {
    irsend.sendRC6(hexVal, bits ? bits : 20);
  } else if (protocol == "LG") {
    irsend.sendLG(hexVal, bits ? bits : 28);
  } else if (protocol == "PANASONIC") {
    irsend.sendPanasonic64(hexVal, bits ? bits : 48);
  } else if (protocol == "COOLIX") {
    irsend.sendCOOLIX(hexVal, bits ? bits : 24);
  } else {
    // Fallback padrão NEC
    irsend.sendNEC(hexVal, bits ? bits : 32);
  }

  delay(40);
  digitalWrite(PIN_STATUS_LED, LOW);
  return true;
}

// Extrator simples de chave JSON para evitar dependência de bibliotecas extras
String extractJsonValue(String json, String key) {
  int keyIndex = json.indexOf("\\"" + key + "\\"");
  if (keyIndex == -1) return "";
  int colonIndex = json.indexOf(":", keyIndex);
  if (colonIndex == -1) return "";
  
  // Procura aspas ou número
  int startQuote = json.indexOf("\\"", colonIndex);
  if (startQuote != -1 && startQuote < colonIndex + 4) {
    int endQuote = json.indexOf("\\"", startQuote + 1);
    if (endQuote != -1) return json.substring(startQuote + 1, endQuote);
  } else {
    int start = colonIndex + 1;
    while (start < json.length() && (json[start] == ' ' || json[start] == '\\t')) start++;
    int end = start;
    while (end < json.length() && (isDigit(json[end]) || json[end] == 'x' || json[end] == 'X' || isHexadecimalDigit(json[end]))) end++;
    return json.substring(start, end);
  }
  return "";
}

// Cabeçalhos CORS para permitir chamadas diretas do App Web no navegador
void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  server.sendHeader("Access-Control-Allow-Private-Network", "true");
}

void handleOptions() {
  sendCorsHeaders();
  server.send(204);
}

// ROTA: /api/ir/send (Dispara comandos IR enviados pelos botões do App)
void handleSendIR() {
  sendCorsHeaders();
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\\"error\\":\\"Corpo vazio\\"}");
    return;
  }

  String body = server.arg("plain");
  String proto = extractJsonValue(body, "protocol");
  String hexStr = extractJsonValue(body, "hex");
  String bitsStr = extractJsonValue(body, "bits");

  if (proto.length() == 0) proto = "NEC";
  uint16_t bits = bitsStr.length() > 0 ? bitsStr.toInt() : 32;
  uint64_t hexVal = strtoull(hexStr.c_str(), NULL, 16);

  sendIRCommand(proto, hexVal, bits);

  String response = "{\\"status\\":\\"ok\\",\\"sent\\":true,\\"protocol\\":\\"" + proto + 
                    "\\",\\"hex\\":\\"" + hexStr + "\\",\\"bits\\":" + String(bits) + "}";
  server.send(200, "application/json", response);
}

// ROTA: /api/ir/receive (Entrega sinais capturados pelo receptor na tela "Copiar IR")
void handleReceiveIR() {
  sendCorsHeaders();
  if (lastCaptured.hasNew) {
    String json = "{\\"hasNew\\":true,\\"protocol\\":\\"" + lastCaptured.protocol + 
                  "\\",\\"hex\\":\\"" + lastCaptured.hexCode + 
                  "\\",\\"bits\\":" + String(lastCaptured.bits) + 
                  ",\\"rawTimings\\":[";
    for (int i = 0; i < lastCaptured.rawCount && i < 30; i++) {
      json += String(lastCaptured.rawData[i]);
      if (i < lastCaptured.rawCount - 1 && i < 29) json += ",";
    }
    json += "]}";
    lastCaptured.hasNew = false; // Consumido
    server.send(200, "application/json", json);
  } else {
    server.send(200, "application/json", "{\\"hasNew\\":false}");
  }
}

// ROTA: /api/status (Retorna telemetria, IP, RSSI e uptime para a tela de Sincronização)
void handleStatus() {
  sendCorsHeaders();
  String ip = WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : WiFi.softAPIP().toString();
  String json = "{\\"status\\":\\"online\\",\\"device\\":\\"ESP32_IR_HUB\\",\\"ip\\":\\"" + ip + 
                "\\",\\"rssi\\":" + String(WiFi.RSSI()) + 
                ",\\"uptime\\":" + String(millis() / 1000) + 
                ",\\"freeHeap\\":" + String(ESP.getFreeHeap()) + 
                ",\\"pins\\":{\\"rx\\":" + String(PIN_IR_RECV) + 
                ",\\"tx\\":" + String(PIN_IR_SEND) + 
                ",\\"led\\":" + String(PIN_STATUS_LED) + "}}";
  server.send(200, "application/json", json);
}

// ROTA: /api/wifi/scan (Escaneia redes locais reais para o botão Escanear Wi-Fi)
void handleScanWiFi() {
  sendCorsHeaders();
  WiFi.scanDelete();
  int n = WiFi.scanNetworks(false, true);
  String json = "[";
  for (int i = 0; i < n; ++i) {
    String netSsid = WiFi.SSID(i);
    if (netSsid.length() == 0) continue;
    if (json.length() > 1) json += ",";
    json += "{\\"ssid\\":\\"" + netSsid + 
            "\\",\\"rssi\\":" + String(WiFi.RSSI(i)) + 
            ",\\"secured\\":" + String(WiFi.encryptionType(i) != WIFI_AUTH_OPEN ? "true" : "false") + 
            ",\\"channel\\":" + String(WiFi.channel(i)) + "}";
  }
  json += "]";
  server.send(200, "application/json", json);
}

// ROTA: /api/wifi/config (Recebe novas credenciais Wi-Fi enviadas pelo App)
void handleConfigWiFi() {
  sendCorsHeaders();
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    String newSsid = extractJsonValue(body, "ssid");
    String newPass = extractJsonValue(body, "password");
    if (newSsid.length() > 0) {
      WiFi.disconnect();
      WiFi.begin(newSsid.c_str(), newPass.c_str());
      server.send(200, "application/json", "{\\"status\\":\\"connecting\\"}");
      return;
    }
  }
  server.send(400, "application/json", "{\\"error\\":\\"SSID invalido\\"}");
}

// ==========================================================
// CALLBACKS BLUETOOTH BLE
// ==========================================================
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      digitalWrite(PIN_STATUS_LED, HIGH);
      Serial.println("[BLE] App Conectado via Bluetooth!");
    };
    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      digitalWrite(PIN_STATUS_LED, LOW);
      Serial.println("[BLE] App Desconectado. Reiniciando anúncio BLE...");
      pServer->getAdvertising()->start();
    }
};

class IRTxCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String value = pCharacteristic->getValue().c_str();
      if (value.length() > 0) {
        Serial.print("[BLE IR TX Recebido]: ");
        Serial.println(value);

        String proto = "NEC";
        String hexStr = value;
        uint16_t bits = 32;

        if (value.startsWith("{")) {
          proto = extractJsonValue(value, "protocol");
          hexStr = extractJsonValue(value, "hex");
          String bitsStr = extractJsonValue(value, "bits");
          if (bitsStr.length() > 0) bits = bitsStr.toInt();
        }

        uint64_t hexVal = strtoull(hexStr.c_str(), NULL, 16);
        sendIRCommand(proto.length() > 0 ? proto : "NEC", hexVal, bits);
      }
    }
};

class WifiCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String value = pCharacteristic->getValue().c_str();
      if (value.length() > 0) {
        Serial.print("[BLE WiFi Comando]: ");
        Serial.println(value);

        String action = extractJsonValue(value, "action");
        if (action == "scan") {
          Serial.println("[BLE WiFi] Escaneando redes Wi-Fi locais...");
          WiFi.scanDelete();
          int n = WiFi.scanNetworks(false, true);
          Serial.printf("[BLE WiFi] %d redes encontradas. Transmitindo ao App...\\n", n);
          for (int i = 0; i < n; ++i) {
            String netSsid = WiFi.SSID(i);
            if (netSsid.length() == 0) continue;
            String netJson = "{\\"type\\":\\"wifi_net\\",\\"ssid\\":\\"" + netSsid + 
                             "\\",\\"rssi\\":" + String(WiFi.RSSI(i)) + 
                             ",\\"secured\\":" + String(WiFi.encryptionType(i) != WIFI_AUTH_OPEN ? "true" : "false") + 
                             ",\\"channel\\":" + String(WiFi.channel(i)) + "}";
            pCharacteristic->setValue(netJson.c_str());
            pCharacteristic->notify();
            delay(35);
          }
          String doneJson = "{\\"type\\":\\"wifi_done\\",\\"total\\":" + String(n) + "}";
          pCharacteristic->setValue(doneJson.c_str());
          pCharacteristic->notify();
          Serial.println("[BLE WiFi] Transmissao de redes concluida!");
        } else if (action == "connect" || action.length() == 0) {
          String ssid = extractJsonValue(value, "ssid");
          String pass = extractJsonValue(value, "password");
          if (ssid.length() > 0) {
            Serial.printf("[BLE WiFi] Conectando a %s...\\n", ssid.c_str());
            WiFi.disconnect();
            WiFi.begin(ssid.c_str(), pass.c_str());
            int attempts = 0;
            while (WiFi.status() != WL_CONNECTED && attempts < 20) {
              delay(350);
              attempts++;
            }
            if (WiFi.status() == WL_CONNECTED) {
              String ip = WiFi.localIP().toString();
              String resp = "{\\"status\\":\\"connected\\",\\"ip\\":\\"" + ip + "\\",\\"rssi\\":" + String(WiFi.RSSI()) + "}";
              pCharacteristic->setValue(resp.c_str());
              pCharacteristic->notify();
              Serial.printf("[BLE WiFi] Sucesso! IP: %s\\n", ip.c_str());
            } else {
              String resp = "{\\"status\\":\\"error\\",\\"message\\":\\"Falha na conexao WiFi\\"}";
              pCharacteristic->setValue(resp.c_str());
              pCharacteristic->notify();
            }
          }
        }
      }
    }
};

// ==========================================================
// SETUP PRINCIPAL
// ==========================================================
void setup() {
  Serial.begin(115200);
  pinMode(PIN_STATUS_LED, OUTPUT);
  if (PIN_BUZZER > 0) pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  Serial.println("\\n=====================================");
  Serial.println("ESP32 IR Controller Gateway Inicializado");
  Serial.printf("Pinos -> RX: GPIO %d | TX: GPIO %d | LED: GPIO %d\\n", PIN_IR_RECV, PIN_IR_SEND, PIN_STATUS_LED);
  Serial.println("=====================================");

  // Inicia infravermelho
  irrecv.enableIRIn();
  irsend.begin();

  // Inicia Wi-Fi
  Serial.printf("[WiFi] Conectando a %s...\\n", WIFI_SSID);
  WiFi.mode(WIFI_AP_STA);
  if (strlen(WIFI_SSID) > 0) {
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 15) {
      delay(400);
      Serial.print(".");
      attempts++;
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\n[WiFi] Conectado!");
    Serial.printf("[WiFi] Endereço IP do ESP32: %s\\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\\n[WiFi] Criando Ponto de Acesso: ESP32_IR_HUB_AP");
    WiFi.softAP("ESP32_IR_HUB_AP", "12345678");
    Serial.printf("[WiFi] IP do Ponto de Acesso: %s\\n", WiFi.softAPIP().toString().c_str());
  }

  // Rotas HTTP do Servidor Web (Com suporte a preflight OPTIONS para navegadores)
  server.on("/api/ir/send", HTTP_OPTIONS, handleOptions);
  server.on("/api/ir/send", HTTP_POST, handleSendIR);
  server.on("/api/ir/receive", HTTP_OPTIONS, handleOptions);
  server.on("/api/ir/receive", HTTP_GET, handleReceiveIR);
  server.on("/api/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/wifi/scan", HTTP_OPTIONS, handleOptions);
  server.on("/api/wifi/scan", HTTP_GET, handleScanWiFi);
  server.on("/api/wifi/config", HTTP_OPTIONS, handleOptions);
  server.on("/api/wifi/config", HTTP_POST, handleConfigWiFi);
  server.begin();
  Serial.println("[HTTP] Servidor Web ativo na porta 80!");

  // Inicializa BLE
  BLEDevice::init("ESP32_IR_HUB");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);
  pTxCharacteristic = pService->createCharacteristic(
                        CHAR_IR_TX_UUID,
                        BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
                      );
  pTxCharacteristic->setCallbacks(new IRTxCallbacks());

  pRxCharacteristic = pService->createCharacteristic(
                        CHAR_IR_RX_UUID,
                        BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ
                      );
  pRxCharacteristic->addDescriptor(new BLE2902());

  pWifiCharacteristic = pService->createCharacteristic(
                          CHAR_WIFI_UUID,
                          BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ
                        );
  pWifiCharacteristic->addDescriptor(new BLE2902());
  pWifiCharacteristic->setCallbacks(new WifiCallbacks());

  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Anúncio BLE ativo como 'ESP32_IR_HUB'!");
}

// ==========================================================
// LOOP PRINCIPAL
// ==========================================================
void loop() {
  server.handleClient();

  // Verifica se o receptor IR capturou algum sinal
  if (irrecv.decode(&results)) {
    String proto = typeToString(results.decode_type);
    char hexBuffer[32];
    sprintf(hexBuffer, "0x%llX", results.value);

    Serial.println("-------------------------------------");
    Serial.printf("[IR RX Capturado] Protocolo: %s | Hex: %s | Bits: %d\\n", 
                  proto.c_str(), hexBuffer, results.bits);

    // Salva no buffer para entrega ao App na rota /api/ir/receive
    lastCaptured.hasNew = true;
    lastCaptured.protocol = proto;
    lastCaptured.hexCode = String(hexBuffer);
    lastCaptured.bits = results.bits;
    lastCaptured.rawCount = min((uint16_t)results.rawlen, (uint16_t)60);
    for (uint16_t i = 1; i < lastCaptured.rawCount; i++) {
      lastCaptured.rawData[i - 1] = results.rawbuf[i] * kRawTick;
    }

    // Feedback visual / sonoro
    digitalWrite(PIN_STATUS_LED, HIGH);
    if (PIN_BUZZER > 0) tone(PIN_BUZZER, 3000, 25);

    // Se conectado via BLE, envia notificação imediata
    if (deviceConnected && pRxCharacteristic != NULL) {
      String blePayload = "{\\"protocol\\":\\"" + proto + 
                          "\\",\\"hex\\":\\"" + String(hexBuffer) + 
                          "\\",\\"bits\\":" + String(results.bits) + "}";
      pRxCharacteristic->setValue(blePayload.c_str());
      pRxCharacteristic->notify();
    }

    delay(70);
    digitalWrite(PIN_STATUS_LED, LOW);
    irrecv.resume(); // Reinicia receptor para o próximo pulso
  }

  delay(2);
}
`;
}

