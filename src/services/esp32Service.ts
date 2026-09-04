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
  private discoveredDevices: any[] = [];

  private state: ESP32DeviceState = {
    connected: false,
    connectionType: 'offline',
    bleConnected: false,
    wifiConnected: false,
    bleDeviceName: 'ESP32_IR_HUB',
    wifiSsid: '',
    wifiPassword: '',
    ipAddress: '',
    bleMac: '',
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
  private streamedNetworks: WiFiNetwork[] = [];
  private lastScanSource: 'ble' | 'http' | 'android' | 'none' = 'none';
  private lastScanMessage: string = '';
  private webDevice: any = null;
  private webServer: any = null;
  private webWifiChar: any = null;
  private webTxChar: any = null;
  private webRxChar: any = null;

  constructor() {
    this.loadPersistedState();
    this.startUptimeTicker();
  }

  private loadPersistedState() {
    try {
      const savedIp = localStorage.getItem('esp32_last_ip');
      if (savedIp) {
        this.state.ipAddress = savedIp;
      }
      const savedSsid = localStorage.getItem('esp32_last_ssid');
      if (savedSsid) {
        this.state.wifiSsid = savedSsid;
      }
      const savedPass = localStorage.getItem('esp32_last_pass');
      if (savedPass) {
        this.state.wifiPassword = savedPass;
      }
    } catch (e) {
      console.warn('Error loading persisted ESP32 state', e);
    }
  }

  private persistState() {
    try {
      if (this.state.ipAddress) {
        localStorage.setItem('esp32_last_ip', this.state.ipAddress);
      }
      if (this.state.wifiSsid) {
        localStorage.setItem('esp32_last_ssid', this.state.wifiSsid);
      }
      if (this.state.wifiPassword) {
        localStorage.setItem('esp32_last_pass', this.state.wifiPassword);
      }
    } catch (e) {}
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
    // Update aggregate connection state
    this.state.connected = this.state.bleConnected || this.state.wifiConnected;

    if (this.state.bleConnected && this.state.wifiConnected) {
      this.state.connectionType = 'both';
    } else if (this.state.bleConnected) {
      this.state.connectionType = 'ble';
    } else if (this.state.wifiConnected) {
      this.state.connectionType = 'wifi';
    } else {
      this.state.connectionType = 'offline';
    }

    const currentState = this.getState();
    this.listeners.forEach(cb => cb(currentState));
  }

  public setIpAddress(ip: string) {
    this.state.ipAddress = ip.trim();
    this.persistState();
    this.notify();
  }

  private startUptimeTicker() {
    setInterval(async () => {
      // Periodic WiFi Health Check
      if (this.state.ipAddress) {
        try {
          const res = await fetch(`http://${this.state.ipAddress}/api/status`, {
            signal: AbortSignal.timeout(1500),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.uptime) this.state.uptimeSeconds = data.uptime;
            if (data.freeHeap) this.state.freeHeap = data.freeHeap;
            if (data.rssi) {
              this.state.rssi = data.rssi;
              this.state.wifiRssi = data.rssi;
            }
            if (data.wifi_mac) this.state.wifiMac = data.wifi_mac;
            if (data.ble_mac) this.state.bleMac = data.ble_mac;
            this.state.wifiConnected = true;
            this.isSimulated = false;
          } else {
            this.state.wifiConnected = false;
          }
        } catch (e) {
          this.state.wifiConnected = false;
        }
      } else {
        this.state.wifiConnected = false;
      }

      if (this.state.connected) {
        if (this.state.connectionType !== 'wifi' && this.state.connectionType !== 'both') {
          // Increment simulated uptime if not getting real data from WiFi
          this.state.uptimeSeconds += 2;
          // Small realistic jitter on RSSI if simulated
          if (this.isSimulated && Math.random() > 0.7) {
            const jitter = (Math.random() - 0.5) * 4;
            this.state.rssi = Math.min(-30, Math.max(-90, Math.round(this.state.rssi + jitter)));
          }
        }
        this.notify();
      } else if (this.state.wifiConnected) {
        // We found a WiFi connection while "disconnected"
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
  public async connectById(id: string): Promise<{ success: boolean; message: string }> {
    await this.ensureBleInitialized();
    try {
      this.addLog('info', `Tentando conectar via BLE: ${id}...`);
      await BleClient.connect(id, () => {
        this.state.bleConnected = false;
        this.addLog('error', 'Bluetooth desconectado!');
        this.notify();
      });
      this.deviceId = id;

      await new Promise(r => setTimeout(r, 800));
      await BleClient.getServices(this.deviceId);

      this.state.bleConnected = true;
      this.state.bleDeviceName = "ESP32_IR_HUB";
      this.isSimulated = false;
      this.addLog('success', 'BLE Conectado com sucesso!');
      this.notify();
      return { success: true, message: "Conectado com sucesso!" };
    } catch (e: any) {
      this.addLog('error', `Falha na conexão BLE: ${e.message}`);
      return { success: false, message: e.message };
    }
  }

  public async scanBLEDevices(): Promise<any[]> {
    await this.ensureBleInitialized();
    this.discoveredDevices = [];

    if (Capacitor.isNativePlatform()) {
      await BleClient.requestLEScan({
        services: [BLE_SERVICES.IR_SERVICE],
      }, (result) => {
        if (!this.discoveredDevices.find(d => d.deviceId === result.device.deviceId)) {
          this.discoveredDevices.push(result.device);
        }
      });

      await new Promise(r => setTimeout(r, 4000));
      await BleClient.stopLEScan();
      return this.discoveredDevices;
    }

    // Web Bluetooth não permite scan passivo facilmente, retornamos vazio para forçar requestDevice
    return [];
  }
  public async connectBLE(options?: { allowAnyDevice?: boolean; deviceId?: string }): Promise<{ success: boolean; message: string }> {
    await this.ensureBleInitialized();

    // 1. Native BLE Flow (Capacitor)
    if (Capacitor.isNativePlatform()) {
      try {
        if (options?.deviceId) {
          this.deviceId = options.deviceId;
        } else {
          const device = await BleClient.requestDevice({
            services: options?.allowAnyDevice ? [] : [BLE_SERVICES.IR_SERVICE],
          });
          this.deviceId = device.deviceId;
        }

        await BleClient.connect(this.deviceId, () => {
          this.state.bleConnected = false;
          this.notify();
        });

        await new Promise(r => setTimeout(r, 1000));
        try {
          await BleClient.getServices(this.deviceId);
        } catch (e) {
          console.warn('Discovery error', e);
        }

        if (Capacitor.getPlatform() === 'android') {
          try {
            await BleClient.requestMtu(this.deviceId, 512);
            await new Promise(r => setTimeout(r, 200));
          } catch (e) {}
        }

        this.state.bleConnected = true;
        this.state.bleDeviceName = 'ESP32_IR_HUB';
        this.isSimulated = false;

        await new Promise(r => setTimeout(r, 300));
        try {
          await BleClient.startNotifications(
            this.deviceId,
            BLE_SERVICES.IR_SERVICE,
            BLE_SERVICES.IR_RX_CHAR,
            (value) => this.handleIncomingIRRaw(dataViewToText(value))
          );
        } catch (e) {}

        await new Promise(r => setTimeout(r, 300));
        try {
          await BleClient.startNotifications(
            this.deviceId,
            BLE_SERVICES.IR_SERVICE,
            BLE_SERVICES.WIFI_CHAR,
            (value) => this.handleIncomingWifiRaw(dataViewToText(value))
          );
        } catch (e) {}

        this.notify();
        return { success: true, message: `Conectado via BLE!` };
      } catch (err: any) {
        return { success: false, message: `Erro BLE: ${err?.message || 'Falha'}` };
      }
    }

    // 2. Web Bluetooth Flow
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
          this.state.bleConnected = false;
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

        this.state.bleConnected = true;
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
          if (parsed.wifi_mac) this.state.wifiMac = parsed.wifi_mac;
          if (parsed.ble_mac) this.state.bleMac = parsed.ble_mac;
          this.state.wifiConnected = true;
          this.addLog('success', `IP Recebido via BLE: ${parsed.ip}`);
          this.persistState();
          this.notify();

          // Tenta validar a conexão HTTP imediatamente
          this.testWiFiConnection(parsed.ip);
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

    this.state.bleConnected = false;
    this.notify();
  }

  // Helper for robust BLE writing with auto-discovery retry
  private async writeBle(service: string, characteristic: string, payload: string): Promise<void> {
    if (!this.deviceId && !this.webServer) throw new Error('Not connected');

    const data = numbersToDataView(Array.from(new TextEncoder().encode(payload)));

    // Web Bluetooth path
    if (this.webServer && this.webServer.connected) {
      if (characteristic === BLE_SERVICES.IR_TX_CHAR && this.webTxChar) {
        await this.webTxChar.writeValue(new TextEncoder().encode(payload));
        return;
      }
      if (characteristic === BLE_SERVICES.WIFI_CHAR && this.webWifiChar) {
        await this.webWifiChar.writeValue(new TextEncoder().encode(payload));
        return;
      }
      // Fallback: search characteristic if not cached
      const serviceObj = await this.webServer.getPrimaryService(service);
      const charObj = await serviceObj.getCharacteristic(characteristic);
      await charObj.writeValue(new TextEncoder().encode(payload));
      return;
    }

    // Native Capacitor path
    if (this.deviceId) {
      try {
        await BleClient.write(this.deviceId, service, characteristic, data);
      } catch (err: any) {
        // If "Characteristic not found", force discovery and retry once
        if (err?.message?.includes('not found') || err?.message?.includes('Discovery')) {
          console.log('BLE Characteristic not found, retrying discovery...');
          await BleClient.getServices(this.deviceId);
          await new Promise(r => setTimeout(r, 500));
          await BleClient.write(this.deviceId, service, characteristic, data);
        } else {
          throw err;
        }
      }
    }
  }

  // Configure WiFi credentials onto the ESP32
  public async sendWiFiCredentials(ssid: string, pass: string): Promise<{ success: boolean; ip?: string; message: string }> {
    this.state.wifiSsid = ssid;
    this.state.wifiPassword = pass;
    this.persistState();
    this.addLog('info', `Enviando Wi-Fi: ${ssid}...`);

    const payload = JSON.stringify({ action: 'connect', ssid, password: pass });

    // 1. BLE send (Native or Web)
    if (this.state.connectionType === 'ble' && (this.deviceId || this.webServer)) {
      try {
        await this.writeBle(BLE_SERVICES.IR_SERVICE, BLE_SERVICES.WIFI_CHAR, payload);
        this.addLog('success', 'Credenciais enviadas via BLE!');
        return { success: true, ip: this.state.ipAddress, message: 'Credenciais enviadas ao ESP32 via BLE! Aguarde a associação.' };
      } catch (e: any) {
        this.addLog('error', `Falha BLE Wi-Fi: ${e.message}`);
        console.error('BLE WiFi error', e);
        return { success: false, message: `Erro ao enviar via BLE: ${e?.message || 'Falha'}` };
      }
    }

    // 2. HTTP config to real ESP32 (SoftAP 192.168.4.1 or custom IP)
    const targetIps = [this.state.ipAddress, '192.168.4.1'].filter(Boolean) as string[];
    for (const ip of targetIps) {
      try {
        const formData = new URLSearchParams();
        formData.append('plain', JSON.stringify({ ssid, password: pass }));

        const res = await fetch(`http://${ip}/api/wifi/config`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ip) {
            this.state.ipAddress = data.ip;
          }
          this.state.connectionType = 'wifi';
          this.state.connected = true;
          this.addLog('success', `Wi-Fi configurado via HTTP (${ip})`);
          this.notify();
          return {
            success: true,
            ip: this.state.ipAddress,
            message: data.message || `Credenciais gravadas via HTTP (${ip})! ESP32 associado à rede "${ssid}".`,
          };
        }
      } catch (httpErr) {
        // Continue
      }
    }

    this.addLog('error', 'Hub não alcançável para config Wi-Fi');
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
        this.state.wifiConnected = true;
        this.state.ipAddress = cleanIp;
        if (data.uptime) this.state.uptimeSeconds = data.uptime;
        if (data.freeHeap) this.state.freeHeap = data.freeHeap;
        if (data.rssi) this.state.rssi = data.rssi;
        if (data.wifi_mac) this.state.wifiMac = data.wifi_mac;
        if (data.ble_mac) this.state.bleMac = data.ble_mac;
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
    this.addLog('tx', `Enviando ${command.protocol}: ${command.hexCode}...`);
    const payload = JSON.stringify({
      protocol: command.protocol,
      hex: command.hexCode,
      bits: command.bits,
    });

    let success = false;

    // 1. Try BLE TX first if connected
    if (this.state.bleConnected && (this.deviceId || this.webServer)) {
      try {
        await this.writeBle(BLE_SERVICES.IR_SERVICE, BLE_SERVICES.IR_TX_CHAR, payload);
        success = true;
      } catch (e) {
        console.warn('BLE Transmit failed:', e);
        // If BLE fails, it will automatically try WiFi below
      }
    }

    // 2. Try HTTP as fallback or primary if BLE not available (or if BLE failed)
    if (!success && this.state.ipAddress) {
      try {
        const formData = new URLSearchParams();
        formData.append('plain', payload);

        const res = await fetch(`http://${this.state.ipAddress}/api/ir/send`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(2500),
        });
        if (res.ok) {
          success = true;
          this.state.wifiConnected = true; // Confirma que está vivo
        }
      } catch (httpErr) {
        console.warn('HTTP Transmit failed:', httpErr);
      }
    }

    // 3. Simulation fallback
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
      this.addLog('error', 'Falha ao transmitir IR');
    }

    return {
      success,
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
        const formData = new URLSearchParams();
        formData.append('plain', JSON.stringify(this.state.pinConfig));

        await fetch(`http://${this.state.ipAddress}/api/pins/config`, {
          method: 'POST',
          body: formData,
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
    this.addLog('rx', `Sinal Capturado: ${protocol} ${hexCode}`);
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

  // Refresh all connections (WiFi and BLE)
  public async refreshConnection() {
    this.state.isSyncing = true;
    this.notify();

    const results = { wifi: false, ble: false };

    try {
      // 1. WiFi Sync - Try known IP
      if (this.state.ipAddress) {
        const wifiRes = await this.testWiFiConnection(this.state.ipAddress);
        results.wifi = wifiRes.success;
      }

      // 2. If WiFi failed and we have no IP, try common ESP32 IPs or current host
      if (!results.wifi) {
        const candidates = ['192.168.4.1'];
        if (typeof window !== 'undefined' && window.location.hostname.startsWith('192.168.')) {
          candidates.push(window.location.hostname);
        }

        for (const ip of candidates) {
          if (ip === this.state.ipAddress) continue;
          const res = await this.testWiFiConnection(ip);
          if (res.success) {
            results.wifi = true;
            break;
          }
        }
      }

      // 3. BLE Check
      if (Capacitor.isNativePlatform()) {
        try {
          const enabled = await BleClient.isEnabled();
          results.ble = this.state.bleConnected && enabled;
        } catch (e) {}
      } else {
        results.ble = this.state.bleConnected;
      }

    } catch (err) {
      console.error('Refresh connection error:', err);
    } finally {
      this.state.isSyncing = false;
      this.notify();
    }

    return results;
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
 * ESP32 IR Controller & Smart Remote Gateway Firmware v4.8.5
 * Totalmente compatível com o App Web / Mobile (WiFi + BLE)
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

// Protocolos específicos para Ar Condicionado e Dispositivos Complexos
#include <ir_Mitsubishi.h>
#include <ir_Daikin.h>
#include <ir_Gree.h>
#include <ir_Samsung.h>
#include <ir_LG.h>

// Definição de Pinos GPIO
uint16_t PIN_IR_RECV = ${pinConfig.irReceiverPin};
uint16_t PIN_IR_SEND = ${pinConfig.irTransmitterPin};
uint16_t PIN_STATUS_LED = ${pinConfig.statusLedPin};
uint16_t PIN_BUZZER = ${pinConfig.buzzerPin};

// Instâncias IR
IRrecv irrecv(PIN_IR_RECV, 1024, 50, true);
IRsend irsend(PIN_IR_SEND);
decode_results results;

WebServer server(80);

// UUIDs BLE
#define SERVICE_UUID           "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_IR_TX_UUID        "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_IR_RX_UUID        "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_CONFIG_UUID       "beb54840-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_WIFI_UUID         "beb54841-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = NULL;
BLECharacteristic* pRxChar = NULL;
BLECharacteristic* pWifiChar = NULL;
bool deviceConnected = false;

// Controle de Estado
unsigned long lastBlink = 0;
unsigned long lastWifiCheck = 0;
wl_status_t lastWifiStatus = WL_IDLE_STATUS;
String pendingSsid = "";
String pendingPass = "";
bool shouldConnectWifi = false;
bool shouldScanWifi = false;

struct CapturedSignal {
  bool hasNew = false;
  String protocol;
  String hexCode;
  uint16_t bits;
  uint16_t rawData[200];
  uint16_t rawLen = 0;
} lastCaptured;

// --- Helpers ---
void ledFeedback(int p, int d) {
  for(int i=0; i<p; i++) {
    digitalWrite(PIN_STATUS_LED, HIGH);
    if(PIN_BUZZER > 0) tone(PIN_BUZZER, 2800, 30);
    delay(d);
    digitalWrite(PIN_STATUS_LED, LOW);
    delay(d);
  }
}

String getJsonVal(String json, String key) {
  int kIdx = json.indexOf("\\"" + key + "\\"");
  if (kIdx == -1) return "";
  int cIdx = json.indexOf(":", kIdx);
  int sQ = json.indexOf("\\"", cIdx);
  if (sQ != -1 && sQ < cIdx + 5) {
    return json.substring(sQ + 1, json.indexOf("\\"", sQ + 1));
  }
  int start = cIdx + 1;
  while (start < json.length() && (json[start] == ' ' || json[start] == '\\t')) start++;
  int end = start;
  while (end < json.length() && (isDigit(json[end]) || json[end] == '-' || json[end] == '.')) end++;
  return json.substring(start, end);
}

// --- IR Logic ---
void broadcastIR(String p, uint64_t h, int b, uint16_t* raw = NULL, uint16_t len = 0) {
  p.toUpperCase();
  Serial.printf("TX: %s | 0x%llX\\n", p.c_str(), h);
  ledFeedback(2, 40);

  if (p == "NEC") irsend.sendNEC(h, b);
  else if (p == "SONY") irsend.sendSony(h, b);
  else if (p == "SAMSUNG") irsend.sendSAMSUNG(h, b);
  else if (p == "LG") irsend.sendLG(h, b);
  else if (p == "RAW" && raw != NULL && len > 0) {
    irsend.sendRaw(raw, len, 38);
  }
  else irsend.sendNEC(h, b);

  if (deviceConnected) {
    pRxChar->setValue("{\\\"success\\\":true,\\\"message\\\":\\\"IR Transmitido\\\"}");
    pRxChar->notify();
  }
}

// --- HTTP Handlers ---
void sendCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleStatus() {
  sendCORS();
  String ip = WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : WiFi.softAPIP().toString();
  String macW = WiFi.macAddress();
  String macB = BLEDevice::getAddress().toString().c_str();
  String json = "{\\\"success\\\":true,\\\"status\\\":\\\"online\\\",\\\"ip\\\":\\\""+ip+"\\\",\\\"uptime\\\":"+String(millis()/1000)+",\\\"freeHeap\\\":"+String(ESP.getFreeHeap())+",\\\"wifi_mac\\\":\\\""+macW+"\\\",\\\"ble_mac\\\":\\\""+macB+"\\\",\\\"rssi\\\":"+String(WiFi.RSSI())+"}";
  server.send(200, "application/json", json);
}

void handlePins() {
  sendCORS();
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    PIN_IR_RECV = getJsonVal(body, "irReceiverPin").toInt();
    PIN_IR_SEND = getJsonVal(body, "irTransmitterPin").toInt();
    PIN_STATUS_LED = getJsonVal(body, "statusLedPin").toInt();
    PIN_BUZZER = getJsonVal(body, "buzzerPin").toInt();

    pinMode(PIN_STATUS_LED, OUTPUT);
    irrecv.pause();
    irrecv = IRrecv(PIN_IR_RECV, 1024, 50, true);
    irrecv.enableIRIn();
    irsend = IRsend(PIN_IR_SEND);
    irsend.begin();

    ledFeedback(3, 100);
    server.send(200, "application/json", "{\\\"success\\\":true,\\\"message\\\":\\\"Hardware atualizado\\\"}");
  }
}

void handleWifiScan() {
  sendCORS();
  int n = WiFi.scanNetworks();
  String json = "[";
  for (int i=0; i<n; i++) {
    json += "{\\\"ssid\\\":\\\""+WiFi.SSID(i)+"\\\",\\\"rssi\\\":"+String(WiFi.RSSI(i))+",\\\"secured\\\":"+String(WiFi.encryptionType(i)!=WIFI_AUTH_OPEN?"true":"false")+"}";
    if(i<n-1) json += ",";
  }
  json += "]";
  server.send(200, "application/json", json);
}

void handleWifiConfig() {
  sendCORS();
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    pendingSsid = getJsonVal(body, "ssid");
    pendingPass = getJsonVal(body, "password");
    shouldConnectWifi = true;
    server.send(200, "application/json", "{\\\"success\\\":true,\\\"message\\\":\\\"Conectando ao WiFi...\\\"}");
  } else {
    server.send(400, "application/json", "{\\\"success\\\":false,\\\"message\\\":\\\"Dados ausentes\\\"}");
  }
}

void handleReceive() {
  sendCORS();
  if (lastCaptured.hasNew) {
    String json = "{\\\"success\\\":true,\\\"hasNew\\\":true,\\\"protocol\\\":\\\""+lastCaptured.protocol+"\\\",\\\"hex\\\":\\\""+lastCaptured.hexCode+"\\\",\\\"bits\\\":"+String(lastCaptured.bits)+",\\\"rawTimings\\\":[";
    for(int i=0; i<lastCaptured.rawLen; i++) {
      json += String(lastCaptured.rawData[i]);
      if(i<lastCaptured.rawLen-1) json += ",";
    }
    json += "]}";
    server.send(200, "application/json", json);
    lastCaptured.hasNew = false;
  } else {
    server.send(200, "application/json", "{\\\"success\\\":true,\\\"hasNew\\\":false}");
  }
}

// --- BLE Callbacks ---
class BLECallback: public BLEServerCallbacks {
  void onConnect(BLEServer* s) { deviceConnected = true; ledFeedback(1, 200); }
  void onDisconnect(BLEServer* s) { deviceConnected = false; BLEDevice::startAdvertising(); }
};

class IRTxCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) {
    String v = c->getValue().c_str();
    broadcastIR(getJsonVal(v, "protocol"), strtoull(getJsonVal(v, "hex").c_str(), NULL, 16), getJsonVal(v, "bits").toInt());
  }
};

class WifiCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) {
    String v = c->getValue().c_str();
    String a = getJsonVal(v, "action");
    if (a == "scan") shouldScanWifi = true;
    else if (a == "connect") {
      pendingSsid = getJsonVal(v, "ssid");
      pendingPass = getJsonVal(v, "password");
      shouldConnectWifi = true;
    }
  }
};

void setup() {
  Serial.begin(115200);
  pinMode(PIN_STATUS_LED, OUTPUT);
  irrecv.enableIRIn();
  irsend.begin();

  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP("ESP32_IR_HUB_AP", "12345678");

  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/pins/config", HTTP_POST, handlePins);
  server.on("/api/wifi/scan", HTTP_GET, handleWifiScan);
  server.on("/api/wifi/config", HTTP_POST, handleWifiConfig);
  server.on("/api/ir/send", HTTP_POST, [](){
    sendCORS();
    String body = server.arg("plain");
    broadcastIR(getJsonVal(body, "protocol"), strtoull(getJsonVal(body, "hex").c_str(), NULL, 16), getJsonVal(body, "bits").toInt());
    server.send(200, "application/json", "{\\\"success\\\":true,\\\"message\\\":\\\"IR Enviado com sucesso\\\"}");
  });
  server.onNotFound([](){ if(server.method()==HTTP_OPTIONS){ sendCORS(); server.send(204); } });
  server.begin();

  BLEDevice::init("ESP32_IR_HUB");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new BLECallback());
  BLEService *pS = pServer->createService(SERVICE_UUID);

  BLECharacteristic *pTx = pS->createCharacteristic(CHAR_IR_TX_UUID, BLECharacteristic::PROPERTY_WRITE);
  pTx->setCallbacks(new IRTxCallback());

  pRxChar = pS->createCharacteristic(CHAR_IR_RX_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  pRxChar->addDescriptor(new BLE2902());

  pWifiChar = pS->createCharacteristic(CHAR_WIFI_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY);
  pWifiChar->setCallbacks(new WifiCallback());
  pWifiChar->addDescriptor(new BLE2902());

  pS->start();
  BLEDevice::startAdvertising();
  Serial.println("ESP32 Ready!");
}

void loop() {
  server.handleClient();

  // Monitorar mudança de status WiFi para notificar o App via BLE
  if (millis() - lastWifiCheck > 3000) {
    lastWifiCheck = millis();
    wl_status_t currentStatus = WiFi.status();
    if (currentStatus != lastWifiStatus) {
      lastWifiStatus = currentStatus;
      if (currentStatus == WL_CONNECTED && deviceConnected) {
        String ip = WiFi.localIP().toString();
        String mac = WiFi.macAddress();
        String msg = "{\\\"success\\\":true,\\\"type\\\":\\\"wifi_status\\\",\\\"status\\\":\\\"connected\\\",\\\"ip\\\":\\\""+ip+"\\\",\\\"wifi_mac\\\":\\\""+mac+"\\\"}";
        pWifiChar->setValue(msg.c_str());
        pWifiChar->notify();
        ledFeedback(2, 100);
      }
    }
  }

  if (shouldScanWifi) {
    shouldScanWifi = false;
    int n = WiFi.scanNetworks();
    for (int i=0; i<n; i++) {
      String net = "{\\\"type\\\":\\\"wifi_net\\\",\\\"ssid\\\":\\\""+WiFi.SSID(i)+"\\\",\\\"rssi\\\":"+String(WiFi.RSSI(i))+"}";
      pWifiChar->setValue(net.c_str());
      pWifiChar->notify();
      delay(50);
    }
    pWifiChar->setValue("{\\\"type\\\":\\\"wifi_done\\\"}");
    pWifiChar->notify();
  }

  if (shouldConnectWifi) {
    shouldConnectWifi = false;
    WiFi.begin(pendingSsid.c_str(), pendingPass.c_str());
  }

  if (irrecv.decode(&results)) {
    String p = typeToString(results.decode_type);
    char h[20]; sprintf(h, "0x%llX", results.value);

    lastCaptured.protocol = p;
    lastCaptured.hexCode = String(h);
    lastCaptured.bits = results.bits;
    lastCaptured.rawLen = results.rawlen - 1;
    if (lastCaptured.rawLen > 200) lastCaptured.rawLen = 200;

    for (int i = 1; i < results.rawlen; i++) {
      lastCaptured.rawData[i-1] = results.rawbuf[i] * kRawTick;
    }
    lastCaptured.hasNew = true;

    if (deviceConnected) {
      String ble = "{\\\"success\\\":true,\\\"type\\\":\\\"rx\\\",\\\"protocol\\\":\\\""+p+"\\\",\\\"hex\\\":\\\""+String(h)+"\\\",\\\"bits\\\":"+String(results.bits)+"}";
      pRxChar->setValue(ble.c_str());
      pRxChar->notify();
    }

    ledFeedback(1, 60);
    irrecv.resume();
  }

  if (deviceConnected && millis() - lastBlink > 2000) {
    lastBlink = millis();
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    delay(20);
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
  }
  yield();
}
`;
}

