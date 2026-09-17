import { BleClient } from '@capacitor-community/bluetooth-le';

// UUIDs devem corresponder ao firmware ESP32
const SERVICE_UUID = '12345678-1234-1234-1234-123456789012';
const CHAR_WIFI_SCAN_UUID = '11111111-1234-1234-1234-123456789012';
const CHAR_WIFI_CREDS_UUID = '22222222-1234-1234-1234-123456789012';
const CHAR_STATUS_UUID = '33333333-1234-1234-1234-123456789012';

export interface WiFiNetwork {
  ssid: string;
  rssi: number;
  secure: boolean;
}

export interface BLEStatus {
  connected: boolean;
  deviceId?: string;
  deviceName?: string;
  rssi?: number;
}

export interface BLEScanResult {
  deviceId: string;
  deviceName: string;
}

class BluetoothService {
  private connectedDeviceId: string | null = null;
  private connectedDeviceName: string = '';
  private bleRssi: number = 0;
  private rssiInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<string, Function[]> = new Map();

  async initialize() {
    try {
      await BleClient.initialize();
      console.log('[Bluetooth] Inicializado');
    } catch (error) {
      console.error('[Bluetooth] Erro ao inicializar:', error);
    }
  }

  /** Abre o seletor de dispositivos BLE e retorna { deviceId, deviceName } ou null */
  async startScan(): Promise<BLEScanResult | null> {
    try {
      console.log('[Bluetooth] Iniciando varredura...');

      const device = await BleClient.requestDevice({
        services: [SERVICE_UUID],
      });

      if (device && device.deviceId) {
        const name = device.name || 'ESP32-IR-Hub';
        console.log(`[Bluetooth] Dispositivo encontrado: ${name} (${device.deviceId})`);
        return { deviceId: device.deviceId, deviceName: name };
      }
    } catch (error) {
      console.error('[Bluetooth] Erro na varredura:', error);
    }

    return null;
  }

  async connect(deviceId: string, deviceName?: string): Promise<boolean> {
    try {
      console.log(`[Bluetooth] Conectando a ${deviceId}...`);

      await BleClient.connect(deviceId, (disconnectedId) => {
        console.log(`[Bluetooth] Desconectado: ${disconnectedId}`);
        this.connectedDeviceId = null;
        this.connectedDeviceName = '';
        this.bleRssi = 0;
        this.stopRssiPolling();
        this.emit('disconnected', { deviceId: disconnectedId });
      });

      this.connectedDeviceId = deviceId;
      this.connectedDeviceName = deviceName || 'ESP32-IR-Hub';

      console.log('[Bluetooth] Conectado com sucesso!');

      // Subscrever a notificações
      await this.subscribeToWiFiScan();
      await this.subscribeToStatus();

      // Iniciar polling de RSSI BLE
      this.startRssiPolling();

      this.emit('connected', { deviceId, deviceName: this.connectedDeviceName });
      return true;
    } catch (error) {
      console.error('[Bluetooth] Erro ao conectar:', error);
      return false;
    }
  }

  private startRssiPolling(): void {
    this.stopRssiPolling();
    this.rssiInterval = setInterval(async () => {
      if (!this.connectedDeviceId) return;
      try {
        const rssi = await BleClient.readRssi(this.connectedDeviceId);
        this.bleRssi = rssi;
        this.emit('rssi', rssi);
      } catch {
        // RSSI pode não estar disponível em todos os dispositivos/plataformas
      }
    }, 3000);
  }

  private stopRssiPolling(): void {
    if (this.rssiInterval !== null) {
      clearInterval(this.rssiInterval);
      this.rssiInterval = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectedDeviceId) {
      try {
        this.stopRssiPolling();
        await BleClient.disconnect(this.connectedDeviceId);
        this.connectedDeviceId = null;
        this.connectedDeviceName = '';
        this.bleRssi = 0;
        console.log('[Bluetooth] Desconectado');
        this.emit('disconnected');
      } catch (error) {
        console.error('[Bluetooth] Erro ao desconectar:', error);
      }
    }
  }

  /** Solicita ao ESP32 um novo scan de redes WiFi via BLE */
  async requestWiFiScan(): Promise<void> {
    if (!this.connectedDeviceId) {
      console.error('[Bluetooth] Não conectado — não é possível solicitar scan');
      return;
    }
    try {
      const payload = JSON.stringify({ cmd: 'scan' });
      const encoder = new TextEncoder();
      await BleClient.write(
        this.connectedDeviceId,
        SERVICE_UUID,
        CHAR_WIFI_SCAN_UUID,
        new DataView(encoder.encode(payload).buffer)
      );
      console.log('[Bluetooth] Solicitação de scan WiFi enviada');
    } catch (error) {
      console.error('[Bluetooth] Erro ao solicitar scan WiFi:', error);
    }
  }

  private async subscribeToWiFiScan(): Promise<void> {
    if (!this.connectedDeviceId) return;

    try {
      await BleClient.startNotifications(
        this.connectedDeviceId,
        SERVICE_UUID,
        CHAR_WIFI_SCAN_UUID,
        (value) => {
          try {
            const decoder = new TextDecoder();
            const jsonStr = decoder.decode(value);
            const data = JSON.parse(jsonStr);

            console.log('[Bluetooth] WiFi scan recebido:', data);
            this.emit('wifiScan', data);
          } catch (error) {
            console.error('[Bluetooth] Erro ao processar WiFi scan:', error);
          }
        }
      );
    } catch (error) {
      console.error('[Bluetooth] Erro ao subscrever WiFi scan:', error);
    }
  }

  private async subscribeToStatus(): Promise<void> {
    if (!this.connectedDeviceId) return;

    try {
      await BleClient.startNotifications(
        this.connectedDeviceId,
        SERVICE_UUID,
        CHAR_STATUS_UUID,
        (value) => {
          try {
            const decoder = new TextDecoder();
            const jsonStr = decoder.decode(value);
            const data = JSON.parse(jsonStr);

            console.log('[Bluetooth] Status recebido:', data);
            this.emit('status', data);
          } catch (error) {
            console.error('[Bluetooth] Erro ao processar status:', error);
          }
        }
      );
    } catch (error) {
      console.error('[Bluetooth] Erro ao subscrever status:', error);
    }
  }

  async sendWiFiCredentials(ssid: string, password: string): Promise<boolean> {
    if (!this.connectedDeviceId) {
      console.error('[Bluetooth] Não conectado');
      return false;
    }

    try {
      const payload = JSON.stringify({ ssid, password });
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);

      await BleClient.write(
        this.connectedDeviceId,
        SERVICE_UUID,
        CHAR_WIFI_CREDS_UUID,
        new DataView(data.buffer)
      );

      console.log('[Bluetooth] Credenciais enviadas com sucesso');
      return true;
    } catch (error) {
      console.error('[Bluetooth] Erro ao enviar credenciais:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connectedDeviceId !== null;
  }

  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }

  getConnectedDeviceName(): string {
    return this.connectedDeviceName;
  }

  getBleRssi(): number {
    return this.bleRssi;
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event)!;
      const index = listeners.indexOf(callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => callback(data));
    }
  }
}

export const bluetoothService = new BluetoothService();
