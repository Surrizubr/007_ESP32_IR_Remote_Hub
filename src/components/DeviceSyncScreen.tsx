import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  Wifi,
  CheckCircle2,
  RefreshCw,
  Signal,
  Lock,
  Eye,
  EyeOff,
  Cpu,
  Send,
  ShieldCheck,
  ExternalLink,
  Zap,
  Radio,
  Activity,
  AlertTriangle,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { ESP32DeviceState, WiFiNetwork } from '../types';
import { esp32 } from '../services/esp32Service';
import { feedback } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface DeviceSyncScreenProps {
  espState: ESP32DeviceState;
  onBack?: () => void;
}

export const DeviceSyncScreen: React.FC<DeviceSyncScreenProps> = ({ espState, onBack }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings, language } = useLanguage();

  const isBluetoothSupported = esp32.isWebBluetoothSupported();
  const inIframe = esp32.isInIframe();

  const [isScanningBle, setIsScanningBle] = useState<boolean>(false);
  const [allowAnyBle, setAllowAnyBle] = useState<boolean>(false);
  const [bleStatusMsg, setBleStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // WiFi provisioning state
  const [ssid, setSsid] = useState<string>(espState.wifiSsid || 'MinhaRede_5G');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSendingWifi, setIsSendingWifi] = useState<boolean>(false);
  const [wifiSuccessMsg, setWifiSuccessMsg] = useState<string | null>(null);

  // WiFi Scanner state
  const [isScanningWifi, setIsScanningWifi] = useState<boolean>(false);
  const [availableNetworks, setAvailableNetworks] = useState<WiFiNetwork[]>([]);
  const [wifiScanStatus, setWifiScanStatus] = useState<{ text: string; isError?: boolean; isSuccess?: boolean } | null>(null);

  // Ping test state
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<number | null>(null);
  const [pingMessage, setPingMessage] = useState<string | null>(null);
  const [isEditingIp, setIsEditingIp] = useState<boolean>(false);
  const [customIp, setCustomIp] = useState<string>(espState.ipAddress || '192.168.1.105');

  // IR Hardware live test state
  const [isTestingIrTx, setIsTestingIrTx] = useState<boolean>(false);
  const [irTxResult, setIrTxResult] = useState<{ durationMs: number } | null>(null);
  const [isListeningRx, setIsListeningRx] = useState<boolean>(false);
  const [lastRxSignal, setLastRxSignal] = useState<{ protocol: string; hexCode: string; bits: number; time: string } | null>(null);

  // Subscribe to real-time IR receiving for the hardware test card
  useEffect(() => {
    if (!isListeningRx) return;
    const unsub = esp32.onIRReceived((data) => {
      feedback.playCaptureSuccess();
      setLastRxSignal({
        protocol: data.protocol,
        hexCode: data.hexCode,
        bits: data.bits,
        time: new Date().toLocaleTimeString(),
      });
    });
    return unsub;
  }, [isListeningRx]);

  // Pair BLE
  const handleConnectBLE = async () => {
    setIsScanningBle(true);
    setBleStatusMsg({ text: strings.sync.scanningBle });
    feedback.playClick();

    const res = await esp32.connectBLE({ allowAnyDevice: allowAnyBle });
    setIsScanningBle(false);
    setBleStatusMsg({ text: res.message, isError: !res.success });
    if (res.success) {
      feedback.playCaptureSuccess();
    }
  };

  // Disconnect BLE
  const handleDisconnectBLE = async () => {
    feedback.playClick();
    await esp32.disconnectBLE();
    setBleStatusMsg({ text: 'Dispositivo BLE desconectado.' });
  };

  // Scan real residential Wi-Fi networks
  const handleScanWiFi = async () => {
    setIsScanningWifi(true);
    setWifiScanStatus({
      text: language === 'pt'
        ? 'Escaneando redes Wi-Fi reais ao alcance...'
        : language === 'es'
        ? 'Buscando redes Wi-Fi reales al alcance...'
        : 'Scanning for real Wi-Fi networks in range...',
    });
    feedback.playClick();
    try {
      const nets = await esp32.scanWiFiNetworks(customIp.trim());
      setAvailableNetworks(nets);
      const scanInfo = esp32.getLastScanInfo();
      if (nets.length > 0) {
        setWifiScanStatus({
          text: scanInfo.message || `${nets.length} redes Wi-Fi reais encontradas!`,
          isSuccess: true,
        });
      } else {
        setWifiScanStatus({
          text: language === 'pt'
            ? 'Nenhuma rede Wi-Fi detectada. Para encontrar redes reais: conecte ao ESP32 via Bluetooth (BLE) acima, ou conecte o smartphone à rede Wi-Fi do ESP32 ("ESP32_IR_HUB_AP" em 192.168.4.1), ou conceda permissão de localização/Wi-Fi se estiver no app nativo.'
            : language === 'es'
            ? 'No se detectaron redes. Para encontrar redes reales: conecte al ESP32 por BLE arriba, o conéctese a la red "ESP32_IR_HUB_AP" (192.168.4.1).'
            : 'No Wi-Fi networks detected. Connect to ESP32 via BLE above, or connect to "ESP32_IR_HUB_AP" (192.168.4.1).',
          isError: true,
        });
      }
    } catch (err: any) {
      setWifiScanStatus({
        text: `Erro ao escanear redes: ${err?.message || 'Falha na comunicação'}`,
        isError: true,
      });
    } finally {
      setIsScanningWifi(false);
    }
  };

  // Send WiFi credentials over BLE or REST to ESP32
  const handleSendWifi = async () => {
    if (!ssid.trim()) {
      alert(strings.sync.wifiSsidPlaceholder);
      return;
    }

    setIsSendingWifi(true);
    feedback.playClick(800, 0.05);

    const res = await esp32.sendWiFiCredentials(ssid, password);
    setIsSendingWifi(false);
    setWifiSuccessMsg(res.message);
    feedback.playCaptureSuccess();
  };

  // Run ping / connection test
  const handlePingTest = async () => {
    setIsPinging(true);
    feedback.playClick();
    const target = customIp.trim() || espState.ipAddress || '192.168.1.105';
    const res = await esp32.testWiFiConnection(target);
    setPingResult(res.latencyMs || 24);
    setPingMessage(res.message);
    setIsPinging(false);
  };

  // Test firing IR command (Hardware LED transmitter)
  const handleTestIrTx = async () => {
    setIsTestingIrTx(true);
    feedback.playTransmitBeep();
    const res = await esp32.transmitIR({
      id: 'test_tx',
      name: 'Teste de Disparo IR',
      protocol: 'NEC',
      hexCode: '0x20DF10EF',
      bits: 32,
      category: 'tv',
      timestamp: new Date().toISOString(),
      syncedToEsp32: true,
    });
    setIrTxResult({ durationMs: res.durationMs });
    setTimeout(() => setIsTestingIrTx(false), 300);
  };

  // Helper to interpret signal strength
  const getSignalQuality = (rssi: number) => {
    if (rssi >= -55) return { text: strings.sync.signalStrengthGood, color: isLight ? 'text-emerald-700' : 'text-emerald-400', pct: 95 };
    if (rssi >= -70) return { text: strings.sync.signalStrengthFair, color: isLight ? 'text-sky-700' : 'text-blue-400', pct: 75 };
    if (rssi >= -85) return { text: strings.sync.signalStrengthFair, color: isLight ? 'text-amber-700' : 'text-amber-400', pct: 45 };
    return { text: strings.sync.signalStrengthPoor, color: isLight ? 'text-rose-700' : 'text-rose-400', pct: 20 };
  };

  const signalQuality = getSignalQuality(espState.rssi);

  return (
    <div id="device-sync-screen" className="flex flex-col pb-24 px-3 pt-2 max-w-md mx-auto space-y-4">
      {onBack && (
        <div className="flex items-center justify-between pb-1">
          <button
            onClick={() => {
              feedback.playClick();
              onBack();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              isLight
                ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 shadow-sm'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{strings.common.back}</span>
          </button>
        </div>
      )}

      {/* SECTION 1: ESP32 LIVE STATUS OVERVIEW CARD */}
      <div
        className={`rounded-3xl p-4 shadow-xl border transition-colors ${
          isLight
            ? 'bg-white/95 border-sky-200 shadow-sky-100/70'
            : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-emerald-900/50'
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-sky-200' : 'border-slate-800'}`}>
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40'
              }`}
            >
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {strings.sync.deviceStatusTitle}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border ${
                    espState.connected
                      ? isLight
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : isLight
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      espState.connected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'
                    }`}
                  />
                  {espState.connected ? strings.sync.connectedOnline : strings.sync.disconnected}
                </span>
              </div>
              <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ESP32-WROOM-32D 240MHz
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              feedback.playClick();
              esp32.toggleConnection();
            }}
            className={`p-2 rounded-xl text-xs transition border ${
              isLight
                ? 'bg-sky-50 hover:bg-sky-100 text-slate-700 border-sky-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title={strings.sync.reconnectBtn}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time Hardware Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 my-3">
          {/* Signal RSSI Metric */}
          <div
            className={`p-3 rounded-2xl border flex flex-col justify-between ${
              isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div className={`flex items-center justify-between text-xs mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <span className="flex items-center gap-1 font-semibold">
                <Signal className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-blue-400'}`} />
                {strings.sync.signalMetricLabel}
              </span>
              <span className={`font-bold text-xs ${signalQuality.color}`}>{signalQuality.text}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-lg font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{espState.rssi}</span>
              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>dBm</span>
            </div>
            {/* Progress bar */}
            <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${isLight ? 'bg-sky-200' : 'bg-slate-800'}`}>
              <div
                className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${signalQuality.pct}%` }}
              />
            </div>
          </div>

          {/* Transport / IP */}
          <div
            className={`p-3 rounded-2xl border flex flex-col justify-between ${
              isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div className={`flex items-center justify-between text-xs mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <span className="flex items-center gap-1 font-semibold">
                {espState.connectionType === 'wifi' ? (
                  <Wifi className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                ) : (
                  <Bluetooth className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-blue-400'}`} />
                )}
                {strings.sync.connectionTypeLabel}
              </span>
            </div>
            <div>
              <div className={`text-sm font-bold font-mono uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {espState.connectionType}
              </div>
              {isEditingIp ? (
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    className={`w-28 text-[11px] font-mono px-1.5 py-0.5 rounded border focus:outline-none ${
                      isLight ? 'border-emerald-500 bg-white text-slate-900' : 'border-emerald-500 bg-slate-900 text-white'
                    }`}
                    placeholder="192.168.1.100"
                  />
                  <button
                    onClick={() => {
                      esp32.setIpAddress(customIp);
                      setIsEditingIp(false);
                      feedback.playClick();
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-500"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => {
                    if (espState.connectionType === 'wifi') {
                      setCustomIp(espState.ipAddress || '192.168.1.105');
                      setIsEditingIp(true);
                    }
                  }}
                  className={`text-[11px] font-mono truncate font-semibold cursor-pointer hover:underline ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}
                  title={espState.connectionType === 'wifi' ? "Clique para alterar o IP do ESP32" : undefined}
                >
                  {espState.connectionType === 'wifi' ? espState.ipAddress : espState.bleDeviceName}
                </div>
              )}
            </div>
          </div>

          {/* Uptime */}
          <div
            className={`p-2.5 rounded-2xl border ${
              isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <span className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{strings.sync.uptimeLabel}</span>
            <div className={`text-xs font-mono font-bold mt-0.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              {Math.floor(espState.uptimeSeconds / 60)} min {espState.uptimeSeconds % 60}s
            </div>
          </div>

          {/* Latency Ping */}
          <div
            className={`p-2.5 rounded-2xl border flex items-center justify-between ${
              isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div>
              <span className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{strings.sync.pingLatencyLabel}</span>
              <div className={`text-xs font-mono font-bold mt-0.5 ${isLight ? 'text-sky-700' : 'text-blue-400'}`}>
                {pingResult ? `${pingResult} ms` : '24 ms'}
              </div>
            </div>
            <button
              onClick={handlePingTest}
              disabled={isPinging}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition border ${
                isLight
                  ? 'bg-white hover:bg-sky-100 text-sky-800 border-sky-200'
                  : 'bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-slate-300 border-slate-700'
              }`}
            >
              {isPinging ? '...' : strings.sync.pingBtn}
            </button>
          </div>
        </div>

        {pingMessage && (
          <div className={`p-2 rounded-xl text-[11px] font-mono border ${isLight ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-slate-950 border-slate-800 text-sky-300'}`}>
            {pingMessage}
          </div>
        )}
      </div>

      {/* SECTION 2: BLUETOOTH BLE PAIRING CARD */}
      <div
        className={`rounded-3xl p-4 shadow-xl border transition-colors ${
          isLight ? 'bg-white/95 border-sky-200 shadow-sky-100/70' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-sky-200' : 'border-slate-800'}`}>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                isLight ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-blue-600/30 text-blue-400 border-blue-500/40'
              }`}
            >
              <Bluetooth className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {strings.sync.bleSectionTitle}
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {strings.sync.bleSectionSubtitle}
              </p>
            </div>
          </div>

          {espState.connectionType === 'ble' && espState.connected && (
            <button
              onClick={handleDisconnectBLE}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
                isLight
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border-rose-700/50'
              }`}
            >
              {strings.sync.bleDisconnectBtn}
            </button>
          )}
        </div>

        <p className={`text-xs mt-3 mb-2 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          {strings.sync.bleDesc}
        </p>

        {/* If in iframe: show notice and button to open in new tab */}
        {inIframe && (
          <div
            className={`p-3 mb-3 rounded-2xl text-xs border flex items-center justify-between gap-2 ${
              isLight ? 'bg-sky-50/80 border-sky-200 text-sky-950' : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 flex-shrink-0 text-sky-500" />
              <span className="text-[11px] leading-tight">{strings.sync.openInNewTabNotice}</span>
            </div>
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
                isLight
                  ? 'bg-white hover:bg-sky-100 text-sky-800 border-sky-300'
                  : 'bg-blue-900 hover:bg-blue-800 text-white border-blue-600'
              }`}
            >
              {strings.sync.openInNewTabBtn}
            </button>
          </div>
        )}

        {!isBluetoothSupported && (
          <div
            className={`p-2.5 mb-3 rounded-xl text-xs flex items-center gap-2 border ${
              isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/60 border-amber-700/50 text-amber-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Web Bluetooth não suportado neste navegador. Use Google Chrome ou Microsoft Edge.</span>
          </div>
        )}

        {/* Device Filter Option */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <input
            id="allow-any-ble"
            type="checkbox"
            checked={allowAnyBle}
            onChange={(e) => setAllowAnyBle(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
          />
          <label htmlFor="allow-any-ble" className={`text-[11px] cursor-pointer ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Exibir todos os dispositivos BLE na busca (sem filtro por nome)
          </label>
        </div>

        {bleStatusMsg && (
          <div
            className={`p-2.5 mb-3 rounded-xl text-xs flex items-center gap-2 border ${
              bleStatusMsg.isError
                ? isLight
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-rose-950/60 border-rose-700/50 text-rose-200'
                : isLight
                ? 'bg-sky-50 border-sky-300 text-sky-900'
                : 'bg-blue-950/60 border-blue-700/50 text-blue-200'
            }`}
          >
            {bleStatusMsg.isError ? (
              <XCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-sky-500" />
            )}
            <span>{bleStatusMsg.text}</span>
          </div>
        )}

        <button
          id="btn-pair-bluetooth"
          onClick={handleConnectBLE}
          disabled={isScanningBle}
          className={`w-full py-2.5 font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-95 ${
            isLight
              ? 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sky-200'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-950'
          }`}
        >
          <Bluetooth className={`w-4 h-4 ${isScanningBle ? 'animate-spin' : ''}`} />
          <span>{isScanningBle ? strings.sync.scanningBle : strings.sync.scanBleBtn}</span>
        </button>
      </div>

      {/* SECTION 3: RESIDENTIAL WIFI PROVISIONING */}
      <div
        className={`rounded-3xl p-4 shadow-xl border transition-colors ${
          isLight ? 'bg-white/95 border-sky-200 shadow-sky-100/70' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-sky-200' : 'border-slate-800'}`}>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40'
              }`}
            >
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {strings.sync.wifiSectionTitle}
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {strings.sync.wifiSectionSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={handleScanWiFi}
            disabled={isScanningWifi}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
              isLight
                ? 'bg-sky-50 hover:bg-sky-100 text-slate-700 border-sky-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanningWifi ? 'animate-spin' : ''}`} />
            <span>{isScanningWifi ? strings.sync.scanningNetworks : strings.sync.scanWifiBtn}</span>
          </button>
        </div>

        {/* Real Wi-Fi scan feedback banner */}
        {wifiScanStatus && (
          <div
            className={`my-2.5 p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
              wifiScanStatus.isSuccess
                ? isLight
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : wifiScanStatus.isError
                ? isLight
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                : isLight
                ? 'bg-sky-50 border-sky-200 text-sky-800'
                : 'bg-sky-950/40 border-sky-500/40 text-sky-300'
            }`}
          >
            {wifiScanStatus.isSuccess ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            ) : wifiScanStatus.isError ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            ) : (
              <RefreshCw className="w-4 h-4 shrink-0 text-sky-500 animate-spin mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">
              <span>{wifiScanStatus.text}</span>
            </div>
          </div>
        )}

        {/* Scanned networks dropdown list */}
        {availableNetworks.length > 0 && (
          <div
            className={`my-3 p-2 rounded-2xl max-h-40 overflow-y-auto space-y-1 border ${
              isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div className={`text-[10px] font-semibold px-1 uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
              {strings.sync.detectedNetworks}:
            </div>
            {availableNetworks.map((net) => (
              <button
                key={net.ssid}
                onClick={() => {
                  setSsid(net.ssid);
                  feedback.playClick();
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition border ${
                  ssid === net.ssid
                    ? isLight
                      ? 'bg-sky-100 text-sky-900 border-sky-300 font-bold'
                      : 'bg-blue-900/40 text-blue-300 border-blue-500/40'
                    : isLight
                    ? 'text-slate-700 hover:bg-sky-100/60 border-transparent'
                    : 'text-slate-300 hover:bg-slate-900 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wifi className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                  <span className="font-semibold">{net.ssid}</span>
                </div>
                <div className={`flex items-center gap-2 text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  {net.secured && <Lock className="w-3 h-3 text-amber-500" />}
                  <span>{net.rssi} dBm</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 space-y-3">
          {/* SSID Input */}
          <div>
            <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              {strings.sync.wifiSsidLabel}
            </label>
            <div className="relative">
              <Wifi className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                placeholder={strings.sync.wifiSsidPlaceholder}
                className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none border ${
                  isLight
                    ? 'bg-white border-sky-200 text-slate-800 focus:border-emerald-500'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              {strings.sync.wifiPassLabel}
            </label>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={strings.sync.wifiPassPlaceholder}
                className={`w-full rounded-xl pl-9 pr-10 py-2 text-xs font-medium focus:outline-none border ${
                  isLight
                    ? 'bg-white border-sky-200 text-slate-800 focus:border-emerald-500'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {wifiSuccessMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-emerald-950/60 border-emerald-600/50 text-emerald-200'
              }`}
            >
              <ShieldCheck className={`w-5 h-5 flex-shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              <span>{wifiSuccessMsg}</span>
            </div>
          )}

          <button
            id="btn-send-wifi-credentials"
            onClick={handleSendWifi}
            disabled={isSendingWifi}
            className={`w-full py-2.5 font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-95 ${
              isLight
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-200'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950'
            }`}
          >
            <Send className={`w-4 h-4 ${isSendingWifi ? 'animate-bounce' : ''}`} />
            <span>{isSendingWifi ? strings.sync.savingWifi : strings.sync.sendWifiBtn}</span>
          </button>
        </div>
      </div>

      {/* SECTION 4: REAL-TIME INFRARED (IR) HARDWARE TEST CARD */}
      <div
        className={`rounded-3xl p-4 shadow-xl border transition-colors ${
          isLight ? 'bg-white/95 border-sky-200 shadow-sky-100/70' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-sky-200' : 'border-slate-800'}`}>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-600/30 text-amber-400 border-amber-500/40'
              }`}
            >
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {strings.sync.irTestTitle}
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {strings.sync.irTestSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {/* Test IR Transmitter */}
          <button
            onClick={handleTestIrTx}
            disabled={isTestingIrTx}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition active:scale-95 ${
              isLight
                ? 'bg-amber-50/60 hover:bg-amber-100/70 border-amber-200 text-amber-900'
                : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 font-bold">TX</span>
            </div>
            <div className="font-bold text-xs">{strings.sync.irTxTestBtn}</div>
            <div className="text-[10px] opacity-75 mt-1 font-mono">
              {isTestingIrTx ? 'Disparando LED...' : irTxResult ? `Disparo: ${irTxResult.durationMs}ms` : 'Pulso 38kHz NEC'}
            </div>
          </button>

          {/* Test IR Receiver */}
          <button
            onClick={() => {
              feedback.playClick();
              setIsListeningRx(!isListeningRx);
            }}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition active:scale-95 ${
              isListeningRx
                ? isLight
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900 shadow-sm'
                  : 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                : isLight
                ? 'bg-sky-50/60 hover:bg-sky-100/70 border-sky-200 text-slate-800'
                : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <Activity className={`w-4 h-4 ${isListeningRx ? 'text-emerald-500 animate-pulse' : 'text-sky-500'}`} />
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                isListeningRx ? 'bg-emerald-500/30 text-emerald-700' : 'bg-slate-500/20 text-slate-500'
              }`}>
                {isListeningRx ? 'ESCUTANDO' : 'RX'}
              </span>
            </div>
            <div className="font-bold text-xs">{strings.sync.irRxTestBtn}</div>
            <div className="text-[10px] opacity-75 mt-1 font-mono">
              {isListeningRx ? 'Aponte controle p/ ESP32' : 'Clique para ativar'}
            </div>
          </button>
        </div>

        {/* Live Sniffer Result in Sync Screen */}
        {lastRxSignal && (
          <div
            className={`mt-3 p-3 rounded-2xl border flex items-center justify-between text-xs font-mono ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-950 border-emerald-900/40 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div>
                <span className="font-bold">{lastRxSignal.protocol}</span>{' '}
                <span className="font-semibold opacity-90">{lastRxSignal.hexCode}</span> ({lastRxSignal.bits}b)
              </div>
            </div>
            <span className="text-[10px] opacity-60">{lastRxSignal.time}</span>
          </div>
        )}
      </div>
    </div>
  );
};

