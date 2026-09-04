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

  const handleTestPing = async () => {
    if (!customIp.trim()) return;
    setIsPinging(true);
    setPingMessage(null);
    feedback.playClick();
    const res = await esp32.testWiFiConnection(customIp.trim());
    setIsPinging(false);
    setPingResult(res.latencyMs || 0);
    setPingMessage(res.message);
    if (res.success) {
      feedback.playCaptureSuccess();
      setIsEditingIp(false);
    }
  };

  const getSignalQuality = (rssi: number) => {
    if (rssi >= -55) return { text: strings.sync.signalStrengthGood, color: isLight ? 'text-emerald-700' : 'text-emerald-400', pct: 95 };
    if (rssi >= -70) return { text: strings.sync.signalStrengthFair, color: isLight ? 'text-sky-700' : 'text-blue-400', pct: 75 };
    return { text: strings.sync.signalStrengthPoor, color: isLight ? 'text-rose-700' : 'text-rose-400', pct: 20 };
  };

  const signalQuality = getSignalQuality(espState.rssi);

  return (
    <div id="device-sync-screen" className="flex flex-col pb-24 px-4 pt-4 max-w-lg mx-auto space-y-6">
      {onBack && (
        <button
          onClick={() => { feedback.playClick(); onBack(); }}
          className={`flex items-center w-fit gap-2 px-4 py-2 rounded-2xl text-sm font-bold border shadow-sm transition-all active:scale-95 ${
            isLight ? 'bg-white text-slate-700 border-slate-200' : 'bg-slate-900 text-slate-200 border-slate-800'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{strings.common.back}</span>
        </button>
      )}

      {/* STATUS CARD - MAIS BONITO E CONTRASTADO */}
      <div className={`rounded-[32px] p-6 shadow-2xl border transition-all ${isLight ? 'bg-white border-slate-100' : 'bg-[#0f172a] border-slate-800'}`}>
        <div className={`flex items-center justify-between pb-4 border-b ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-black text-base tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{strings.sync.deviceStatusTitle}</h2>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${espState.connected ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                  <span className={`w-2 h-2 rounded-full ${espState.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {espState.connected ? strings.sync.connectedOnline : strings.sync.disconnected}
                </div>
              </div>
              <p className={`text-[11px] font-bold mt-0.5 opacity-40 font-mono tracking-widest`}>FIRMWARE V4.8 PRO</p>
            </div>
          </div>
          <button
            onClick={() => { feedback.playClick(); esp32.refreshConnection(); }}
            disabled={espState.isSyncing}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all active:rotate-180 ${isLight ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
          >
            <RefreshCw className={`w-5 h-5 ${espState.isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          {/* Box 1: WiFi Signal */}
          <div className="p-4 rounded-2xl border bg-white border-slate-400 shadow-sm">
            <div className="text-[10px] font-black text-black mb-2 flex items-center gap-1.5 uppercase tracking-widest">
              <Wifi className="w-3.5 h-3.5 text-black" /> Sinal WiFi
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-black font-mono text-black">{espState.wifiRssi || espState.rssi || 0}</span>
              <span className="text-[10px] font-bold text-black/60">dBm</span>
            </div>
          </div>

          {/* Box 2: BLE Signal */}
          <div className="p-4 rounded-2xl border bg-white border-slate-400 shadow-sm">
            <div className="text-[10px] font-black text-black mb-2 flex items-center gap-1.5 uppercase tracking-widest">
              <Bluetooth className="w-3.5 h-3.5 text-black" /> Sinal BLE
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-black font-mono text-black">{espState.bleConnected ? -45 : 0}</span>
              <span className="text-[10px] font-bold text-black/60">dBm</span>
            </div>
          </div>

          {/* Box 3: IP & MAC WiFi */}
          <div className="p-4 rounded-2xl border bg-white border-slate-400 shadow-sm">
            <div className="text-[10px] font-black text-black mb-2 uppercase tracking-widest">IP & MAC WiFi</div>
            <div className="text-2xl font-black font-mono text-black truncate">
              {espState.ipAddress || 'OFFLINE'}
            </div>
            <div className="text-[9px] font-black font-mono text-black/60 mt-1">
              {espState.wifiMac || '00:00:00:00:00:00'}
            </div>
          </div>

          {/* Box 4: MAC BLE */}
          <div className="p-4 rounded-2xl border bg-white border-slate-400 shadow-sm">
            <div className="text-[10px] font-black text-black mb-2 uppercase tracking-widest">MAC BLE</div>
            <div className="text-2xl font-black font-mono text-black truncate">
              {espState.bleMac || '00:00:00:00:00:00'}
            </div>
            <div className="text-[9px] font-black font-mono text-black/60 mt-1">
               {espState.bleDeviceName || 'ESP32_HUB'}
            </div>
          </div>
        </div>
      </div>

      {/* BLUETOOTH SECTION */}
      <div className={`rounded-[32px] p-6 shadow-xl border transition-all ${isLight ? 'bg-white border-slate-100' : 'bg-[#0f172a] border-slate-800'}`}>
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${isLight ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
            <Bluetooth className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm tracking-tight">{strings.sync.bleSectionTitle}</h3>
            <p className="text-[11px] font-medium opacity-50">{strings.sync.bleSectionSubtitle}</p>
          </div>
        </div>

        {(discoveredBleDevices.length > 0 || isScanningBle) && (
          <div className={`mb-4 p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-black border-slate-800'}`}>
            <div className={`text-[10px] font-black text-center mb-3 animate-pulse uppercase tracking-widest ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
              {strings.sync.bleMacHint}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
              {discoveredBleDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleConnectBLE(device.deviceId)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl text-xs font-bold transition-all border ${isLight ? 'bg-white border-slate-200 hover:border-sky-500' : 'bg-slate-900 border-slate-800 hover:border-sky-500'}`}
                >
                  <div className="flex items-center gap-3">
                    <Bluetooth className="w-4 h-4 text-sky-500" />
                    <span>{device.name || 'ESP32_IR_HUB'}</span>
                  </div>
                  <span className="text-[9px] font-mono opacity-40">{device.deviceId}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleScanBLE}
          disabled={isScanningBle}
          className="w-fit mx-auto px-6 py-2 font-black rounded-xl text-[10px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all bg-sky-300 text-black shadow-md uppercase tracking-widest mb-4"
        >
          <Bluetooth className={`w-3.5 h-3.5 ${isScanningBle ? 'animate-spin' : ''}`} />
          <span>{isScanningBle ? strings.sync.bleScanning : strings.sync.scanBleBtn}</span>
        </button>

        {espState.bleConnected && (
          <button onClick={handleDisconnectBLE} className="w-full mt-3 py-3 text-[10px] font-black rounded-xl border border-rose-500/30 text-rose-500 bg-rose-500/5 uppercase tracking-widest">
            {strings.sync.bleDisconnectBtn}
          </button>
        )}
      </div>

      {/* WIFI SECTION - HIGH CONTRAST INPUTS */}
      <div className={`rounded-[32px] p-6 shadow-xl border transition-all bg-white border-slate-100`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
              <Wifi className="w-5 h-5" />
            </div>
            <h3 className="font-black text-sm tracking-tight">Configuração Wi-Fi</h3>
          </div>
          <button onClick={handleScanWiFi} disabled={isScanningWifi} className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-emerald-600' : 'bg-slate-900 border-slate-800 text-emerald-400'}`}>
            <RefreshCw className={`w-4 h-4 ${isScanningWifi ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {availableNetworks.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl border bg-white border-slate-400 max-h-40 overflow-y-auto scrollbar-hide shadow-md">
            {availableNetworks.map(net => (
              <button key={net.ssid} onClick={() => setSsid(net.ssid)} className={`w-full text-left p-3 rounded-xl text-xs mb-1.5 font-black transition-all border ${ssid === net.ssid ? 'bg-emerald-600 text-white border-emerald-700' : 'text-black bg-white border-slate-200 hover:border-slate-400'}`}>
                {net.ssid} <span className="text-[9px] opacity-60 ml-2">{net.rssi} dBm</span>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black opacity-30 uppercase tracking-widest ml-1">SSID da Rede</label>
            <input
              type="text"
              value={ssid}
              onChange={e => setSsid(e.target.value)}
              className={`w-full p-4 rounded-2xl text-sm font-bold border transition-all outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white border-slate-200 text-black focus:border-emerald-500`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black opacity-30 uppercase tracking-widest ml-1">Senha de Segurança</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full p-4 rounded-2xl text-sm font-bold border transition-all outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white border-slate-200 text-black focus:border-emerald-500`}
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={handleSendWifi}
            disabled={isSendingWifi}
            className={`w-full py-4 rounded-2xl font-black text-xs shadow-lg active:scale-[0.98] transition-all bg-gradient-to-r from-emerald-600 to-teal-700 text-white uppercase tracking-widest`}
          >
            {isSendingWifi ? 'Enviando Dados...' : 'Gravar Credenciais no Hub'}
          </button>
        </div>
      </div>

      {/* HARDWARE TOOLS - RESTORED PING, TX & RX */}
      <div className={`rounded-[32px] p-6 shadow-xl border transition-all bg-white border-slate-100`}>
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${isLight ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm tracking-tight">Ferramentas de Teste</h3>
            <p className="text-[11px] font-medium opacity-50">Validação de transmissores e sensores</p>
          </div>
        </div>

        {/* PING / MANUAL IP TOOL */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Conexão Manual (Ping)</span>
            {pingResult !== null && (
              <span className={`text-[10px] font-black ${pingResult < 200 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {pingResult}ms
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customIp}
              onChange={(e) => setCustomIp(e.target.value)}
              placeholder="Ex: 192.168.1.100"
              className="flex-1 p-3 rounded-xl text-xs font-mono font-bold border border-slate-200 bg-slate-50 outline-none focus:border-amber-500"
            />
            <button
              onClick={handleTestPing}
              disabled={isPinging}
              className={`px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                isPinging ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white shadow-md'
              }`}
            >
              {isPinging ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Ping'}
            </button>
          </div>

          {pingMessage && (
            <div className={`p-3 rounded-xl text-[10px] font-bold border ${
              pingMessage.includes('Conectado')
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}>
              {pingMessage}
            </div>
          )}
        </div>

        <button
          onClick={handleTestIrTx}
          disabled={isTestingIrTx}
          className={`w-full flex items-center justify-between p-6 rounded-2xl border transition-all active:scale-[0.98] ${
            isTestingIrTx
              ? 'bg-amber-500 text-white border-amber-500'
              : (isLight ? 'bg-slate-50 border-slate-100 text-slate-900' : 'bg-black border-slate-800 text-white')
          }`}
        >
          <div className="flex items-center gap-4">
            <Send className={`w-6 h-6 ${isTestingIrTx ? 'animate-bounce' : 'text-amber-500'}`} />
            <div className="text-left">
              <span className="block text-xs font-black uppercase tracking-widest">Testar Transmissor (TX)</span>
              <span className="text-[10px] font-bold opacity-40">Envia um sinal NEC de teste agora</span>
            </div>
          </div>
          {irTxResult && <span className="text-[10px] font-black font-mono opacity-50">{irTxResult.durationMs}ms</span>}
        </button>

        {/* IR RECEIVER TEST */}
        <div className={`mt-4 p-5 rounded-2xl border transition-all bg-white border-slate-200 ${
          isListeningRx ? 'ring-2 ring-emerald-500/20 shadow-lg' : ''
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Radio className={`w-5 h-5 ${isListeningRx ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
              <span className="text-xs font-black uppercase tracking-widest">Monitor IR (RX)</span>
            </div>
            <button
              onClick={() => { feedback.playClick(); setIsListeningRx(!isListeningRx); }}
              className={`px-5 py-2 rounded-full text-[10px] font-black transition-all active:scale-95 shadow-md uppercase tracking-widest ${
                isListeningRx
                  ? 'bg-rose-600 text-white shadow-rose-900/20'
                  : 'bg-emerald-600 text-white shadow-emerald-900/20'
              }`}
            >
              {isListeningRx ? 'Desativar' : 'Ativar'}
            </button>
          </div>

          {lastRxSignal ? (
            <div className="rounded-xl p-4 border animate-in fade-in slide-in-from-bottom-2 bg-white border-slate-400 shadow-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-black uppercase tracking-widest">{lastRxSignal.protocol}</span>
                <span className="text-[9px] font-black font-mono opacity-60">{lastRxSignal.time}</span>
              </div>
              <div className="text-2xl font-black font-mono tracking-tighter text-black">{lastRxSignal.hexCode}</div>
              <div className="text-[10px] font-bold text-black/60 mt-1 uppercase tracking-widest">{lastRxSignal.bits} BITS DETECTADOS</div>
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center border border-dashed border-slate-400 rounded-xl">
              <p className="text-[11px] font-bold text-black/40 italic uppercase tracking-widest">
                {isListeningRx ? 'Aguardando capturar sinal...' : 'Inicie o monitoramento'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
