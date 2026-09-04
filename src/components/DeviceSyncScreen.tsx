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
  const { strings } = useLanguage();

  const isBluetoothSupported = esp32.isWebBluetoothSupported();
  const inIframe = esp32.isInIframe();

  const [isScanningBle, setIsScanningBle] = useState<boolean>(false);
  const [discoveredBleDevices, setDiscoveredBleDevices] = useState<any[]>([]);
  const [allowAnyBle, setAllowAnyBle] = useState<boolean>(true);
  const [bleStatusMsg, setBleStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // WiFi provisioning state
  const [ssid, setSsid] = useState<string>(espState.wifiSsid || 'MinhaRede_WiFi');
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

  // Subscribe to real-time IR receiving
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
  const handleConnectBLE = async (deviceId?: string) => {
    setIsScanningBle(true);
    setBleStatusMsg({ text: strings.sync.scanningBle });
    feedback.playClick();

    const res = await esp32.connectBLE({ allowAnyDevice: allowAnyBle, deviceId });
    setIsScanningBle(false);
    setBleStatusMsg({ text: res.message, isError: !res.success });
    if (res.success) {
      feedback.playCaptureSuccess();
      setDiscoveredBleDevices([]);
    }
  };

  const handleScanBLE = async () => {
    setIsScanningBle(true);
    setBleStatusMsg({ text: strings.sync.scanningBle });
    feedback.playClick();

    const devices = await esp32.scanBLEDevices();
    setDiscoveredBleDevices(devices);

    // Se não encontrou nada em modo nativo ou se estiver no Web Bluetooth,
    // abrimos o seletor padrão do sistema.
    if (devices.length === 0) {
      await handleConnectBLE();
    } else {
      setIsScanningBle(false);
    }
  };

  // Disconnect BLE
  const handleDisconnectBLE = async () => {
    feedback.playClick();
    await esp32.disconnectBLE();
    setBleStatusMsg({ text: strings.sync.bleDisconnectedNotice });
  };

  // Scan real residential Wi-Fi networks
  const handleScanWiFi = async () => {
    setIsScanningWifi(true);
    setWifiScanStatus({ text: strings.sync.scanningNetworks });
    feedback.playClick();
    try {
      const nets = await esp32.scanWiFiNetworks(customIp.trim());
      setAvailableNetworks(nets);
      if (nets.length > 0) {
        setWifiScanStatus({ text: `${nets.length} ${strings.sync.detectedNetworks}!`, isSuccess: true });
      } else {
        setWifiScanStatus({ text: strings.sync.wifiNoNetworksFound, isError: true });
      }
    } catch (err: any) {
      setWifiScanStatus({ text: `${strings.sync.wifiScanError}${err?.message || strings.common.error}`, isError: true });
    } finally {
      setIsScanningWifi(false);
    }
  };

  const handleSendWifi = async () => {
    if (!ssid.trim()) { alert(strings.sync.wifiSsidPlaceholder); return; }
    setIsSendingWifi(true);
    feedback.playClick(800, 0.05);
    const res = await esp32.sendWiFiCredentials(ssid, password);
    setIsSendingWifi(false);
    setWifiSuccessMsg(res.message);
    feedback.playCaptureSuccess();
  };

  const handlePingTest = async () => {
    setIsPinging(true);
    feedback.playClick();
    const res = await esp32.testWiFiConnection(customIp.trim());
    setPingResult(res.latencyMs || 24);
    setPingMessage(res.message);
    setIsPinging(false);
  };

  const handleTestIrTx = async () => {
    setIsTestingIrTx(true);
    feedback.playTransmitBeep();
    const res = await esp32.transmitIR({
      id: 'test_tx', name: 'Teste TX', protocol: 'NEC', hexCode: '0x20DF10EF',
      bits: 32, category: 'tv', timestamp: new Date().toISOString(), syncedToEsp32: true,
    });
    setIrTxResult({ durationMs: res.durationMs });
    setTimeout(() => setIsTestingIrTx(false), 300);
  };

  const getSignalQuality = (rssi: number) => {
    if (rssi >= -55) return { text: strings.sync.signalStrengthGood, color: isLight ? 'text-emerald-700' : 'text-emerald-400', pct: 95 };
    if (rssi >= -70) return { text: strings.sync.signalStrengthFair, color: isLight ? 'text-sky-700' : 'text-blue-400', pct: 75 };
    return { text: strings.sync.signalStrengthPoor, color: isLight ? 'text-rose-700' : 'text-rose-400', pct: 20 };
  };

  const signalQuality = getSignalQuality(espState.rssi);

  return (
    <div id="device-sync-screen" className="flex flex-col pb-24 px-3 pt-2 max-w-md mx-auto space-y-4">
      {onBack && (
        <button
          onClick={() => { feedback.playClick(); onBack(); }}
          className={`flex items-center w-fit gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
            isLight ? 'bg-white text-slate-700 border-sky-200' : 'bg-slate-800 text-slate-200 border-slate-700'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{strings.common.back}</span>
        </button>
      )}

      {/* STATUS CARD */}
      <div className={`rounded-3xl p-4 shadow-xl border transition-colors ${isLight ? 'bg-white/95 border-sky-200 shadow-sky-100/70' : 'bg-slate-900 border-emerald-900/50'}`}>
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-sky-200' : 'border-slate-800'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40'}`}>
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{strings.sync.deviceStatusTitle}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border ${espState.connected ? (isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40') : (isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/20 text-rose-300 border-rose-500/40')}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${espState.connected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                  {espState.connected ? strings.sync.connectedOnline : strings.sync.disconnected}
                </span>
              </div>
              <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ESP32 IR HUB v4.7</p>
            </div>
          </div>
          <button onClick={() => { feedback.playClick(); esp32.refreshConnection(); }} disabled={espState.isSyncing} className={`p-2 rounded-xl border transition ${isLight ? 'bg-sky-50 text-slate-700 border-sky-200' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
            <RefreshCw className={`w-4 h-4 ${espState.isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 my-3">
          {/* CAIXA 1: SINAL WIFI */}
          <div className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-sky-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="text-[9px] font-bold opacity-50 mb-1 flex items-center gap-1">
              <Wifi className="w-3 h-3 text-emerald-500" /> SINAL WIFI
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black font-mono">{espState.wifiRssi || espState.rssi}</span>
              <span className="text-[9px] opacity-60">dBm</span>
            </div>
          </div>

          {/* CAIXA 2: SINAL BLE */}
          <div className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-sky-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="text-[9px] font-bold opacity-50 mb-1 flex items-center gap-1">
              <Bluetooth className="w-3 h-3 text-sky-500" /> SINAL BLE
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black font-mono">{espState.bleRssi || (espState.bleConnected ? -45 : 0)}</span>
              <span className="text-[9px] opacity-60">dBm</span>
            </div>
          </div>

          {/* CAIXA 3: IP & MAC WIFI */}
          <div className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-sky-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="text-[9px] font-bold opacity-50 mb-1">IP & MAC WIFI</div>
            <div className="text-[10px] font-mono font-bold text-emerald-500 truncate">{espState.ipAddress || 'SEM IP'}</div>
            <div className="text-[9px] font-mono opacity-40 truncate">{espState.wifiMac || 'MAC: --'}</div>
          </div>

          {/* CAIXA 4: MAC BLE */}
          <div className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-sky-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className="text-[9px] font-bold opacity-50 mb-1">MAC BLUETOOTH</div>
            <div className="text-[10px] font-mono font-bold text-sky-500 truncate">{espState.bleMac || (espState.bleConnected ? 'ATIVO' : '---')}</div>
            <div className="text-[9px] font-mono opacity-40 truncate">{espState.bleMac || 'MAC: --'}</div>
          </div>
        </div>
      </div>

      {/* BLUETOOTH CARD */}
      <div className={`rounded-3xl p-4 shadow-xl border transition-colors ${isLight ? 'bg-white/95 border-sky-200 shadow-sky-100/70' : 'bg-slate-900 border-slate-800'}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${isLight ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-blue-600/30 text-blue-400 border-blue-500/40'}`}>
            <Bluetooth className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{strings.sync.bleSectionTitle}</h3>
            <p className="text-[11px] opacity-60">{strings.sync.bleSectionSubtitle}</p>
          </div>
        </div>

        {/* DEVICE LIST CONTAINER */}
        {(discoveredBleDevices.length > 0 || isScanningBle) && (
          <div className={`mb-3 p-3 rounded-2xl border ${isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-950/80 border-slate-800'}`}>
            {/* MENSAGEM NO LOCAL SOLICITADO */}
            <div className={`text-[10px] font-bold text-center mb-2 animate-pulse uppercase tracking-wider ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
              {strings.sync.bleMacHint}
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {discoveredBleDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleConnectBLE(device.deviceId)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition border bg-slate-900/40 border-slate-800 hover:border-sky-500`}
                >
                  <div className="flex items-center gap-2">
                    <Bluetooth className="w-3 h-3 text-sky-500" />
                    <span className="font-bold">{device.name || 'ESP32_IR_HUB'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-sky-400">{device.deviceId}</span>
                </button>
              ))}
              {isScanningBle && discoveredBleDevices.length === 0 && (
                <div className="text-center py-4 text-[10px] opacity-50 italic">Buscando dispositivos...</div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleScanBLE}
          disabled={isScanningBle}
          className={`w-full py-3 font-bold rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 transition bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg`}
        >
          <Bluetooth className={isScanningBle ? 'animate-spin' : ''} />
          <span>{isScanningBle ? strings.sync.bleScanning : strings.sync.scanBleBtn}</span>
        </button>

        {espState.bleConnected && (
          <button onClick={handleDisconnectBLE} className="w-full mt-2 py-2 text-xs font-bold rounded-xl border border-rose-800 text-rose-400 bg-rose-950/20">
            {strings.sync.bleDisconnectBtn}
          </button>
        )}
      </div>

      {/* WIFI CARD */}
      <div className={`rounded-3xl p-4 shadow-xl border transition-colors ${isLight ? 'bg-white/95 border-sky-200 shadow-sky-100/70' : 'bg-slate-900 border-slate-800'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40'}`}>
              <Wifi className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm">Configuração Wi-Fi</h3>
          </div>
          <button onClick={handleScanWiFi} disabled={isScanningWifi} className="p-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
            <RefreshCw className={`w-3.5 h-3.5 ${isScanningWifi ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {availableNetworks.length > 0 && (
          <div className="mb-3 p-2 rounded-2xl border border-slate-800 bg-slate-950/50 max-h-32 overflow-y-auto">
            {availableNetworks.map(net => (
              <button key={net.ssid} onClick={() => setSsid(net.ssid)} className={`w-full text-left p-2 rounded-lg text-[11px] mb-1 transition ${ssid === net.ssid ? 'bg-emerald-900/30 text-emerald-400 font-bold' : 'text-slate-400'}`}>
                {net.ssid} ({net.rssi} dBm)
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <input type="text" value={ssid} onChange={e => setSsid(e.target.value)} placeholder="SSID da Rede" className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha Wi-Fi" className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
          <button onClick={handleSendWifi} disabled={isSendingWifi} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg active:scale-95 transition">
            {isSendingWifi ? 'Enviando...' : 'Salvar Wi-Fi no ESP32'}
          </button>
        </div>
      </div>

      {/* HARDWARE TEST CARD */}
      <div className={`rounded-3xl p-4 shadow-xl border transition-colors ${isLight ? 'bg-white/95 border-sky-200 shadow-sky-100/70' : 'bg-slate-900 border-slate-800'}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${isLight ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-amber-600/30 text-amber-400 border-amber-500/40'}`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Testes de Hardware</h3>
            <p className="text-[11px] opacity-60">Valide o IP e os sensores IR</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePingTest}
            disabled={isPinging || !customIp}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all active:scale-95 ${
              isLight ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <Activity className={`w-5 h-5 ${isPinging ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold">PING TEST</span>
            {pingResult !== null && <span className="text-[9px] font-mono text-emerald-500">{pingResult}ms</span>}
          </button>

          <button
            onClick={handleTestIrTx}
            disabled={isTestingIrTx}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all active:scale-95 ${
              isTestingIrTx ? 'bg-amber-500 text-white' : (isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-950 border-slate-800 text-slate-300')
            }`}
          >
            <Send className={`w-5 h-5 ${isTestingIrTx ? 'animate-bounce' : ''}`} />
            <span className="text-[10px] font-bold">TESTAR TX (IR)</span>
          </button>
        </div>

        {/* IR RECEIVER TEST */}
        <div className={`mt-4 p-4 rounded-2xl border transition-all ${
          isListeningRx ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/40'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio className={`w-4 h-4 ${isListeningRx ? 'text-emerald-500 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-xs font-bold">Receptor IR (RX)</span>
            </div>
            <button
              onClick={() => { feedback.playClick(); setIsListeningRx(!isListeningRx); }}
              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                isListeningRx
                  ? 'bg-rose-500 text-white'
                  : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
              }`}
            >
              {isListeningRx ? 'PARAR' : 'ESCUTAR'}
            </button>
          </div>

          {lastRxSignal ? (
            <div className="bg-slate-900/80 rounded-xl p-3 border border-emerald-500/30 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-emerald-400">{lastRxSignal.protocol}</span>
                <span className="text-[9px] opacity-40 font-mono">{lastRxSignal.time}</span>
              </div>
              <div className="text-lg font-black font-mono text-white tracking-wider">{lastRxSignal.hexCode}</div>
              <div className="text-[9px] opacity-60 mt-1">{lastRxSignal.bits} bits detectados</div>
            </div>
          ) : (
            <div className="h-16 flex items-center justify-center border border-dashed border-slate-700 rounded-xl">
              <p className="text-[10px] opacity-40 italic">
                {isListeningRx ? 'Aguardando sinal IR...' : 'Clique em ESCUTAR para testar'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

