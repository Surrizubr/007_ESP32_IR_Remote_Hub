import { registerPlugin } from '@capacitor/core';

export interface WiFiScanResult {
  ssid: string;
  rssi: number;
  secured: boolean;
  channel: number;
}

interface WifiScannerPlugin {
  scanNetworks(): Promise<{ networks: WiFiScanResult[]; count: number }>;
}

const WifiScanner = registerPlugin<WifiScannerPlugin>('WifiScanner');

/**
 * Usa o plugin Android nativo (WifiScannerPlugin.java) para
 * obter a lista de redes WiFi detectadas pelo celular.
 * Retorna as redes ordenadas por RSSI decrescente (maior sinal primeiro).
 */
export async function scanPhoneWifiNetworks(): Promise<WiFiScanResult[]> {
  try {
    const result = await WifiScanner.scanNetworks();
    // Ordena por RSSI decrescente (sinal mais forte primeiro)
    return (result.networks || []).sort((a, b) => b.rssi - a.rssi);
  } catch (error) {
    console.error('[WifiScanner] Erro ao escanear redes:', error);
    return [];
  }
}
