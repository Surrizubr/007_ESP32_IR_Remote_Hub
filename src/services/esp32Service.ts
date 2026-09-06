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

  private consecutiveWifiFailures = 0;

  private startUptimeTicker() {
    setInterval(async () => {
      // Se estiver desconectado, tenta uma atualizaÃ§Ã£o completa de conexÃ£o (Auto-Discovery)
      if (!this.state.wifiConnected && !this.state.bleConnected) {
        await this.refreshConnection();
        return;
      }

      // Se jÃ¡ tem um IP conhecido, faz o check de saÃºde periÃ³dico
      if (this.state.ipAddress) {
        try {
          const res = await fetch(`http://${this.state.ipAddress}/api/status`, {
            signal: AbortSignal.timeout(3000),
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
            this.consecutiveWifiFailures = 0;
            this.isSimulated = false;
          } else {
            this.consecutiveWifiFailures++;
            // Only mark offline after 2 consecutive failures
            if (this.consecutiveWifiFailures >= 2) {
              this.state.wifiConnected = false;
              this.consecutiveWifiFailures = 0;
            }
          }
        } catch (e) {
          this.consecutiveWifiFailures++;
          if (this.consecutiveWifiFailures >= 2) {
            this.state.wifiConnected = false;
            this.consecutiveWifiFailures = 0;
            // Se falhou o IP conhecido, tenta o mDNS na prÃ³xima iteraÃ§Ã£o
          }
        }
      }
      this.notify();
    }, 5000); // Polling a cada 5 segundos (reduzido de 4s para nÃ£o sobrecarregar o ESP32)
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
      this.addLog('error', `Falha na conexÃ£o BLE: ${e.message}`);
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

    // Web Bluetooth nÃ£o permite scan passivo facilmente, retornamos vazio para forÃ§ar requestDevice
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
        message: 'Bluetooth nÃ£o suportado neste navegador.',
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

          // Tenta validar a conexÃ£o HTTP imediatamente
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
    if (this.state.isSyncing) return { success: false, message: 'Processando...' };
    this.state.isSyncing = true;
    this.notify();

    try {
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
          return { success: true, ip: this.state.ipAddress, message: 'Credenciais enviadas ao ESP32 via BLE! Aguarde a associaÃ§Ã£o.' };
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
              message: data.message || `Credenciais gravadas via HTTP (${ip})! ESP32 associado Ã  rede "${ssid}".`,
            };
          }
        } catch (httpErr) {
          // Continue
        }
      }

      this.addLog('error', 'Hub nÃ£o alcanÃ§Ã¡vel para config Wi-Fi');
      return {
        success: false,
        message: 'ESP32 nÃ£o conectado. Conecte ao ESP32 via Bluetooth (BLE) ou conecte-se ao Wi-Fi do ESP32 "ESP32_IR_HUB_AP" (192.168.4.1).',
      };
    } finally {
      this.state.isSyncing = false;
      this.notify();
    }
  }

  // Scan available real residential WiFis
  public async scanWiFiNetworks(targetIp?: string): Promise<WiFiNetwork[]> {
    if (this.state.isSyncing) return [];
    this.state.isSyncing = true;
    this.notify();

    try {
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
    } finally {
      this.state.isSyncing = false;
      this.notify();
    }
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
      message: `NÃ£o foi possÃ­vel alcanÃ§ar o ESP32 em http://${cleanIp}. Verifique se o dispositivo estÃ¡ ligado e na mesma rede.`,
    };
  }

  // Send an IR Command via the ESP32 transmitter
  public async transmitIR(command: IRCommand): Promise<{ success: boolean; durationMs: number }> {
    const startTime = Date.now();
    this.addLog('tx', `Enviando ${command.protocol}: ${command.hexCode}...`);

    const payloadObj: Record<string, any> = {
      protocol: command.protocol,
      hex: command.hexCode,
      bits: command.bits,
    };
    if (command.acState && command.acState.length > 0) {
      payloadObj.state = command.acState;
    }
    if (command.repeat && command.repeat > 0) {
      payloadObj.repeat = command.repeat;
    }
    if (command.rawTimings && command.rawTimings.length > 0 && command.protocol === 'RAW') {
      payloadObj.raw = command.rawTimings;
    }

    const payload = JSON.stringify(payloadObj);
    let success = false;

    // 1. Try BLE TX first if connected
    if (this.state.bleConnected && (this.deviceId || this.webServer)) {
      try {
        await this.writeBle(BLE_SERVICES.IR_SERVICE, BLE_SERVICES.IR_TX_CHAR, payload);
        success = true;
      } catch (e) {
        console.warn('BLE Transmit failed:', e);
      }
    }

    // 2. Try HTTP with retry (up to 3 attempts, 1s apart) if BLE not available or failed
    if (!success && this.state.ipAddress) {
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
            success = true;
            // Confirm WiFi is alive
            if (!this.state.wifiConnected) {
              this.state.wifiConnected = true;
              this.notify();
            }
          } else {
            console.warn(`HTTP Transmit attempt ${attempt} returned status ${res.status}`);
          }
        } catch (httpErr) {
          console.warn(`HTTP Transmit attempt ${attempt} failed:`, httpErr);
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
          }
        }
      }

      // If all HTTP attempts failed, try fallback IPs once
      if (!success) {
        const fallbackIps = ['192.168.4.1', 'esp32-ir-hub.local'].filter(ip => ip !== this.state.ipAddress);
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
          } catch {
            // continue
          }
        }
      }

      // Only mark offline after all retries are exhausted
      if (!success) {
        this.state.wifiConnected = false;
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
      this.addLog('error', 'Falha ao transmitir IR â€” verifique a conexÃ£o com o ESP32');
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
    if (this.state.isSyncing) return { wifi: this.state.wifiConnected, ble: this.state.bleConnected };

    this.state.isSyncing = true;
    this.notify();

    const results = { wifi: false, ble: false };

    try {
      // 1. WiFi Sync - Try known IP first
      if (this.state.ipAddress) {
        const wifiRes = await this.testWiFiConnection(this.state.ipAddress);
        results.wifi = wifiRes.success;
      }

      // 2. Se falhou, tenta IPs candidatos (Fallback e Auto-Discovery)
      if (!results.wifi) {
        const candidates = ['192.168.4.1']; // SoftAP do ESP32

        // Se estivermos em um navegador e o IP atual falhou,
        // tentamos o hostname padrÃ£o caso o mDNS esteja funcionando
        candidates.push('esp32-ir-hub.local');

        for (const ip of candidates) {
          if (ip === this.state.ipAddress) continue;
          const res = await this.testWiFiConnection(ip);
          if (res.success) {
            results.wifi = true;
            this.addLog('success', `ESP32 reencontrado em: ${ip}`);
            break;
          }
        }
      }

      // 3. BLE Check (apenas se nativo)
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
 * =========================================================================
 * ESP32 IR Controller & Smart Remote Gateway  â€”  Firmware v5.0.0
 * CompatÃ­vel com o App Web/Mobile (WiFi + BLE)
 *
 * Arquitetura:
 *   - Core 0 (PRO_CPU): WebServer HTTP + WiFi management
 *   - Core 1 (APP_CPU): BLE + IR TX/RX + Loop principal
 *   - Queue FreeRTOS: Desacopla recepÃ§Ã£o HTTP de transmissÃ£o IR
 *
 * Bibliotecas necessÃ¡rias (instale via Arduino Library Manager):
 *   - IRremoteESP8266 >= 2.8.6   (por crankyoldgit)
 *   - ArduinoJson   >= 7.x        (por bblanchon)
 *   - ESP32 Board Package >= 2.x
 *
 * Pinos padrÃ£o (configurÃ¡veis via app):
 *   GPIO ${pinConfig.irReceiverPin}  â†’ Receptor IR  (TSOP38238 / VS1838B)
 *   GPIO ${pinConfig.irTransmitterPin}  â†’ Emissor IR   (LED IR + Transistor)
 *   GPIO ${pinConfig.statusLedPin}  â†’ LED de Status
 *   GPIO ${pinConfig.buzzerPin ?? 0}  â†’ Buzzer (0 = desabilitado)
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
#include <ir_Sony.h>          // SONY
#include <ir_RC5_RC6.h>       // RC5, RC5X, RC6
#include <ir_Denon.h>         // DENON
#include <ir_JVC.h>           // JVC
#include <ir_Pioneer.h>       // PIONEER
#include <ir_Dish.h>          // DISH
#include <ir_Carrier.h>       // CARRIER_AC, CARRIER_AC40, CARRIER_AC64
#include <ir_Bosch.h>         // BOSCH144

// â”€â”€â”€ ConfiguraÃ§Ã£o de Pinos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
uint16_t PIN_IR_RECV = ${pinConfig.irReceiverPin};
uint16_t PIN_IR_SEND = ${pinConfig.irTransmitterPin};
uint16_t PIN_STATUS_LED = ${pinConfig.statusLedPin};
uint16_t PIN_BUZZER = ${pinConfig.buzzerPin ?? 0};

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

  Serial.printf("[IR TX] Protocol=%s  Hex=0x%llX  Bits=%d  StateLen=%d  RawLen=%d  Repeat=%d\\n",
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
    irsend.sendHitachiAC3(cmd.state, kHitachiAc3StateLength, cmd.repeat);
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
    irsend.sendVestelAc(cmd.state, kVestelAcStateLength, cmd.repeat);
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
    Serial.printf("[IR TX] Protocolo desconhecido '%s', usando NEC genÃ©rico\\n", cmd.protocol);
    irsend.sendNEC(cmd.hex, cmd.bits, cmd.repeat);
  }

  // Feedback visual/sonoro (nÃ£o usa delay â€” roda em task prÃ³pria)
  ledBlink(2, 40);
  beep(2800, 30);

  // Notifica via BLE se conectado
  if (deviceConnected && pRxChar) {
    String ack = "{\\"success\\":true,\\"message\\":\\"IR Transmitido\\",\\"protocol\\":\\"" + String(cmd.protocol) + "\\"}";
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
        String ble = "{\\"success\\":true,\\"type\\":\\"rx\\",\\"protocol\\":\\"" + proto +
                     "\\",\\"hex\\":\\"" + String(hexStr) +
                     "\\",\\"bits\\":" + String(irResults.bits) + "}";
        pRxChar->setValue(ble.c_str());
        pRxChar->notify();
      }

      Serial.printf("[IR RX] %s  %s  %d bits\\n", proto.c_str(), hexStr, irResults.bits);
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
    server.send(400, "application/json", "{\\"success\\":false,\\"message\\":\\"Payload vazio\\"}");
    return;
  }

  // Parseia JSON
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    server.send(400, "application/json", "{\\"success\\":false,\\"message\\":\\"JSON invÃ¡lido\\"}");
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
    server.send(200, "application/json", "{\\"success\\":true,\\"message\\":\\"IR enfileirado\\"}");
  } else {
    server.send(503, "application/json", "{\\"success\\":false,\\"message\\":\\"Queue cheia, tente novamente\\"}");
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
      server.send(200, "application/json", "{\\"success\\":true,\\"hasNew\\":false}");
    }
  } else {
    server.send(200, "application/json", "{\\"success\\":true,\\"hasNew\\":false}");
  }
}

void handleWifiScan() {
  sendCORS();
  // Se scan ainda em andamento, retorna estado
  int n = WiFi.scanComplete();
  if (n == WIFI_SCAN_RUNNING) {
    server.send(202, "application/json", "{\\"success\\":true,\\"scanning\\":true}");
    return;
  }
  if (n == WIFI_SCAN_FAILED || n < 0) {
    // Inicia novo scan assÃ­ncrono (nÃ£o bloqueia)
    WiFi.scanNetworks(true);
    server.send(202, "application/json", "{\\"success\\":true,\\"scanning\\":true}");
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
  if (body.isEmpty()) { server.send(400, "application/json", "{\\"success\\":false,\\"message\\":\\"Sem dados\\"}"); return; }

  JsonDocument doc;
  if (deserializeJson(doc, body)) {
    server.send(400, "application/json", "{\\"success\\":false,\\"message\\":\\"JSON invÃ¡lido\\"}");
    return;
  }

  pendingSsid = doc["ssid"] | "";
  pendingPass = doc["password"] | "";

  if (pendingSsid.isEmpty()) {
    server.send(400, "application/json", "{\\"success\\":false,\\"message\\":\\"SSID vazio\\"}");
    return;
  }

  shouldConnectWifi = true;
  wifiRetryCount   = 0;
  wifiRetryDelay   = 5000;

  server.send(200, "application/json", "{\\"success\\":true,\\"message\\":\\"Conectando ao WiFi...\\"}");
}

void handlePins() {
  sendCORS();
  if (!server.hasArg("plain")) { server.send(400, "application/json", "{\\"success\\":false}"); return; }

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
  server.send(200, "application/json", "{\\"success\\":true,\\"message\\":\\"Hardware atualizado\\"}");
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
    Serial.printf("[WiFi] Conectando a: %s\\n", pendingSsid.c_str());
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
      Serial.printf("[WiFi] Conectado! IP=%s\\n", ip.c_str());

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
        String msg = "{\\"success\\":true,\\"type\\":\\"wifi_status\\",\\"status\\":\\"connected\\",\\"ip\\":\\"" +
                     ip + "\\",\\"wifi_mac\\":\\"" + mac + "\\"}";
        pWifiChar->setValue(msg.c_str());
        pWifiChar->notify();
      }
    } else if (currentStatus == WL_DISCONNECTED || currentStatus == WL_CONNECTION_LOST) {
      Serial.printf("[WiFi] Desconectado (status=%d). Tentativa #%d em %lums\\n",
        currentStatus, wifiRetryCount + 1, wifiRetryDelay);
    }
  }

  // Tenta reconectar se desconectado e passou o delay de backoff
  if (currentStatus != WL_CONNECTED && !pendingSsid.isEmpty()) {
    unsigned long now = millis();
    if (now - lastWifiRetry >= wifiRetryDelay) {
      lastWifiRetry = now;
      wifiRetryCount++;
      Serial.printf("[WiFi] Tentativa de reconexÃ£o #%d\\n", wifiRetryCount);
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
          String net = "{\\"type\\":\\"wifi_net\\",\\"ssid\\":\\"" + WiFi.SSID(i) +
                       "\\",\\"rssi\\":" + String(WiFi.RSSI(i)) +
                       ",\\"secured\\":" + (WiFi.encryptionType(i) != WIFI_AUTH_OPEN ? "true" : "false") +
                       ",\\"channel\\":" + String(WiFi.channel(i)) + "}";
          pWifiChar->setValue(net.c_str());
          pWifiChar->notify();
          vTaskDelay(30 / portTICK_PERIOD_MS);
        }
        pWifiChar->setValue("{\\"type\\":\\"wifi_done\\"}");
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
  Serial.println("\\n[ESP32 IR Hub v5.0.0] Iniciando...");

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
  Serial.printf("[WiFi] SoftAP: ESP32_IR_HUB_AP  IP: %s\\n", WiFi.softAPIP().toString().c_str());

  // Tenta conectar com credenciais salvas na flash
  WiFi.begin();
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 8000) {
    vTaskDelay(200 / portTICK_PERIOD_MS);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\\n[WiFi] Conectado! IP: %s\\n", WiFi.localIP().toString().c_str());
    pendingSsid = WiFi.SSID();
    // Salva para reconexÃ£o manual
    lastWifiStatus = WL_CONNECTED;
    wifiRetryCount = 0;
  } else {
    Serial.println("\\n[WiFi] Sem credenciais salvas. Use o app para configurar.");
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
    else { server.send(404, "application/json", "{\\"error\\":\\"Not found\\"}"); }
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

  Serial.println("[ESP32 IR Hub] Pronto!\\n");
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
`;
}

