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
    connectionMode: 'ble', // Default to BLE
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

  private lastCommandId = 0;
  private pendingCommands = new Map<number, (res: any) => void>();

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
    } catch (e) { }
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

  public setConnectionMode(mode: 'ble' | 'wifi') {
    this.state.connectionMode = mode;
    this.addLog('info', `Modo de conexão alterado para: ${mode.toUpperCase()}`);
    this.notify();
  }

  private consecutiveWifiFailures = 0;

  private startUptimeTicker() {
    setInterval(async () => {
      // Se estiver desconectado, tenta uma atualização completa de conexão (Auto-Discovery)
      if (!this.state.wifiConnected && !this.state.bleConnected) {
        await this.refreshConnection();
        return;
      }

      // Se já tem um IP conhecido, faz o check de saúde periódico
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
            // Se falhou o IP conhecido, tenta o mDNS na próxima iteração
          }
        }
      }
      this.notify();
    }, 5000); // Polling a cada 5 segundos (reduzido de 4s para não sobrecarregar o ESP32)
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
      const services = await BleClient.getServices(this.deviceId);

      // Tenta obter o nome real do dispositivo se disponível
      this.state.bleConnected = true;
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
        services: [BLE_SERVICES.IR_SERVICE], // Filtro específico para encontrar apenas o HUB
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

        this.state.bleMac = this.deviceId; // Armazena o MAC/ID do dispositivo
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
          } catch (e) { }
        }

        this.state.bleConnected = true;
        this.state.bleDeviceName = device.name || 'ESP32_IR_HUB';
        this.isSimulated = false;

        await new Promise(r => setTimeout(r, 300));
        try {
          await BleClient.startNotifications(
            this.deviceId,
            BLE_SERVICES.IR_SERVICE,
            BLE_SERVICES.IR_RX_CHAR,
            (value) => this.handleNotification(dataViewToText(value))
          );
        } catch (e) { }

        await new Promise(r => setTimeout(r, 300));
        try {
          await BleClient.startNotifications(
            this.deviceId,
            BLE_SERVICES.IR_SERVICE,
            BLE_SERVICES.WIFI_CHAR,
            (value) => this.handleNotification(dataViewToText(value))
          );
        } catch (e) { }

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
              this.handleNotification(raw);
            });
          } catch (e) { console.warn('Web BLE RX characteristic error', e); }

          try {
            this.webWifiChar = await service.getCharacteristic(BLE_SERVICES.WIFI_CHAR);
            await this.webWifiChar.startNotifications();
            this.webWifiChar.addEventListener('characteristicvaluechanged', (event: any) => {
              const raw = dataViewToText(event.target.value);
              this.handleNotification(raw);
            });
          } catch (e) { console.warn('Web BLE WiFi characteristic error', e); }
        } catch (servErr) {
          console.warn('Web BLE getPrimaryService error', servErr);
        }

        this.state.bleConnected = true;
        this.state.bleDeviceName = device.name || 'ESP32_Web';
        this.state.bleMac = device.id; // Web Bluetooth ID
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

  // Unified handler for all incoming JSON events from ESP32 V6.2.0
  private handleNotification(raw: string) {
    try {
      const trimmed = raw.trim();
      if (!trimmed.startsWith('{')) return;

      const data = JSON.parse(trimmed);
      const type = data.type;

      switch (type) {
        case 'ir_rx':
          this.simulateIncomingIR(
            data.protocol || 'NEC',
            data.hex || '0x0',
            data.bits || 32,
            data.rawTimings
          );
          break;

        case 'ir_tx_result':
          if (data.id !== undefined && this.pendingCommands.has(data.id)) {
            const resolver = this.pendingCommands.get(data.id);
            resolver?.(data);
            this.pendingCommands.delete(data.id);
          }
          if (data.status === 'error') {
            this.addLog('error', `Falha no IR (ID ${data.id}): ${data.code || 'Desconhecido'}`);
          }
          break;

        case 'wifi_status':
          this.updateWifiStateFromPacket(data);
          break;

        case 'wifi_net':
          if (data.ssid) {
            const exists = this.streamedNetworks.find(n => n.ssid === data.ssid);
            if (!exists) {
              this.streamedNetworks.push({
                ssid: data.ssid,
                rssi: Number(data.rssi) || -60,
                secured: Boolean(data.secured),
                channel: Number(data.channel) || 1,
              });
            }
          }
          break;

        case 'wifi_done':
          if (this.wifiScanResolver) {
            this.wifiScanResolver([...this.streamedNetworks]);
            this.wifiScanResolver = null;
          }
          break;
      }
    } catch (e) {
      console.warn('Error reading BLE notification:', e);
    }
  }

  private updateWifiStateFromPacket(data: any) {
    if (data.ip) this.state.ipAddress = data.ip;
    if (data.mac) this.state.wifiMac = data.mac;
    if (data.rssi !== undefined) {
      this.state.rssi = data.rssi;
      this.state.wifiRssi = data.rssi;
    }

    const wasConnected = this.state.wifiConnected;
    this.state.wifiConnected = !!data.connected;

    if (this.state.wifiConnected && !wasConnected && data.ip && data.ip !== '0.0.0.0') {
      this.addLog('success', `IP Recebido via BLE: ${data.ip}`);
      this.persistState();
      this.testWiFiConnection(data.ip);
    } else if (!this.state.wifiConnected && wasConnected) {
      this.addLog('info', 'Wi-Fi desconectado (via evento hardware)');
    }

    this.notify();
  }

  // Disconnect BLE
  public async disconnectBLE(): Promise<void> {
    if (Capacitor.isNativePlatform() && this.deviceId) {
      try {
        await BleClient.disconnect(this.deviceId);
      } catch (e) { }
      this.deviceId = null;
    }
    if (this.webServer && this.webServer.connected) {
      try {
        this.webServer.disconnect();
      } catch (e) { }
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
    const cmdId = this.generateId();
    this.addLog('tx', `Enviando ${command.protocol}: ${command.hexCode} (ID: ${cmdId})...`);

    const payloadObj: Record<string, any> = {
      id: cmdId,
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
    if (command.protocol === 'RAW' && command.rawTimings && command.rawTimings.length > 0) {
      payloadObj.rawData = command.rawTimings;
      payloadObj.frequency = 38; // Frequência padrão
    }

    const payload = JSON.stringify(payloadObj);
    let success = false;

    const tryBLE = async () => {
      if (this.state.bleConnected && (this.deviceId || this.webServer)) {
        try {
          await this.writeBle(BLE_SERVICES.IR_SERVICE, BLE_SERVICES.IR_TX_CHAR, payload);
          return true;
        } catch (e) {
          console.warn('BLE Transmit failed:', e);
        }
      }
      return false;
    };

    const tryWiFi = async () => {
      if (this.state.ipAddress) {
        const MAX_RETRIES = this.state.connectionMode === 'wifi' ? 3 : 1;
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
          } catch (httpErr) {
            if (attempt < MAX_RETRIES) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }
      }
      return false;
    };

    // Prioritize based on connectionMode
    if (this.state.connectionMode === 'wifi') {
      success = await tryWiFi();
      if (!success) success = await tryBLE();
    } else {
      success = await tryBLE();
      if (!success) success = await tryWiFi();
    }

    // Fallback to discovery if both failed and WiFi is missing
    if (!success && this.state.connectionMode === 'wifi' && !this.state.wifiConnected) {
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
        } catch { }
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
      this.addLog('error', 'Falha ao transmitir IR — verifique a conexão com o ESP32');
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
        // tentamos o hostname padrão caso o mDNS esteja funcionando
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
        } catch (e) { }
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
 * ============================================================================
 * ESP32 IR HUB - Firmware V6.2.1 PROFESSIONAL
 * ============================================================================
 * Optimized Task-based IR/BLE/WiFi Service Layer
 * ============================================================================
 */

#include <Arduino.h>
#include <esp_mac.h>
#include <WiFi.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <IRrecv.h>
#include <IRsend.h>
#include <IRutils.h>
#include <WebServer.h>

// --- Configuration ---
#define PIN_IR_RECV   ${pinConfig.irReceiverPin}
#define PIN_IR_SEND   ${pinConfig.irTransmitterPin}
#define PIN_LED       ${pinConfig.statusLedPin}

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_TX   "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHARACTERISTIC_RX   "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define CHARACTERISTIC_WIFI "beb54841-36e1-4688-b7f5-ea07361b26a8"

static constexpr uint16_t IR_QUEUE_LENGTH  = 20;
static constexpr uint16_t EVENT_QUEUE_LENGTH = 20;
static constexpr uint32_t BLE_STATUS_DELAY_MS = 250;

// --- Objects ---
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

// --- Queues & Data Structures ---
struct IRCommand {
    uint32_t id;
    char protocol[20];
    uint64_t hex;
    uint16_t bits;
    uint16_t* rawData;
    uint16_t rawLen;
};

enum class EventType : uint8_t { IR_TX_OK, IR_TX_ERROR, IR_RX, WIFI_STATUS };
struct EventMessage {
    EventType type;
    uint32_t id;
    char protocol[20];
    uint64_t hex;
    uint16_t bits;
    char errorCode[40];
};

struct WiFiCommand {
    char action[16];
    char ssid[65];
    char password[129];
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

            if (p == "RAW" && cmd.rawData != nullptr) {
                irsend.sendRaw(cmd.rawData, cmd.rawLen, 38);
                free(cmd.rawData);
                ok = true;
            } else if (p == "NEC") { irsend.sendNEC(cmd.hex, cmd.bits); ok = true; }
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
    void onDisconnect(BLEServer* s) {
        deviceConnected = false;
        // Async restart advertising to prevent stack issues
        xTaskCreate([](void*){ vTaskDelay(100); BLEDevice::startAdvertising(); vTaskDelete(NULL); }, "bleAdv", 2048, NULL, 1, NULL);
    }
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

            if (doc.containsKey("rawData")) {
                JsonArray arr = doc["rawData"];
                cmd.rawLen = arr.size();
                cmd.rawData = (uint16_t*)malloc(cmd.rawLen * sizeof(uint16_t));
                if (cmd.rawData) {
                    for(int i=0; i<cmd.rawLen; i++) cmd.rawData[i] = arr[i];
                }
            }

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
                    JsonDocument d; d["type"] = "wifi_net";
                    d["ssid"] = WiFi.SSID(i); d["rssi"] = WiFi.RSSI(i);
                    d["secured"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
                    String out; serializeJson(d, out);
                    if (pWifiChar) { pWifiChar->setValue(out.c_str()); pWifiChar->notify(); }
                    delay(20);
                }
                if (pWifiChar) { pWifiChar->setValue("{\\"type\\":\\"wifi_done\\"}"); pWifiChar->notify(); }
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
    String s = preferences.getString("ssid", ""), p = preferences.getString("pass", "");
    preferences.end();
    WiFi.mode(WIFI_STA);
    if (s != "") WiFi.begin(s.c_str(), p.c_str());

    // Dynamic BLE Name with MAC suffix
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    char bleName[32];
    snprintf(bleName, sizeof(bleName), "ESP32_IR_HUB_%02X%02X", mac[4], mac[5]);

    BLEDevice::init(bleName);
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());
    BLEService* pSvc = pServer->createService(SERVICE_UUID);

    pSvc->createCharacteristic(CHARACTERISTIC_TX, BLECharacteristic::PROPERTY_WRITE)->setCallbacks(new IRCallbacks());
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

    // Simple HTTP status endpoint
    xTaskCreate([](void*){
        server.on("/api/status", [](){
            JsonDocument d;
            d["uptime"] = millis() / 1000;
            d["wifi_mac"] = WiFi.macAddress();
            d["rssi"] = WiFi.RSSI();
            String o; serializeJson(d, o);
            server.send(200, "application/json", o);
        });
        server.on("/api/ir/send", HTTP_POST, [](){
            if (server.hasArg("plain")) {
                IRCallbacks cb;
                // Reuse existing callback logic if possible, or handle directly
            }
            server.send(200, "application/json", "{\\"status\\":\\"queued\\"}");
        });
        server.begin();
        for(;;){ server.handleClient(); vTaskDelay(10); }
    }, "HttpTask", 4096, NULL, 1, NULL, 0);
}

void loop() {
    static bool lastW = false;
    bool currW = (WiFi.status() == WL_CONNECTED);
    if (currW != lastW) { sendWifiStatusEvent(); lastW = currW; }
    if (deviceConnected && bleConnectedAt != 0 && (millis() - bleConnectedAt >= BLE_STATUS_DELAY_MS)) {
        static uint32_t sentAt = 0;
        if (sentAt != bleConnectedAt) { sendWifiStatusEvent(); sentAt = bleConnectedAt; }
    }
    static uint32_t lastH = 0;
    if (millis() - lastH >= (currW ? 2000 : 500)) {
        digitalWrite(PIN_LED, HIGH); delay(20); digitalWrite(PIN_LED, LOW);
        lastH = millis();
    }
    vTaskDelay(100 / portTICK_PERIOD_MS);
}
`;
}

