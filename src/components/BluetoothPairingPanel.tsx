import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  BluetoothOff,
  RefreshCw,
  Lock,
  Wifi,
  Send,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  Search,
} from 'lucide-react';
import { bluetoothService } from '../services/bluetoothService';
import { scanPhoneWifiNetworks, WiFiScanResult } from '../services/wifiScanService';
import { useTheme } from '../context/ThemeContext';
import { feedback } from '../services/soundService';

// ─── Helper: Barras de sinal WiFi ─────────────────────────────

const WifiSignalBars: React.FC<{ rssi: number; isLight: boolean }> = ({ rssi, isLight }) => {
  const bars = rssi >= -55 ? 4 : rssi >= -65 ? 3 : rssi >= -75 ? 2 : 1;
  const colorClass =
    rssi >= -55 ? 'bg-emerald-500' :
    rssi >= -65 ? 'bg-sky-500'    :
    rssi >= -75 ? 'bg-amber-500'  : 'bg-rose-500';
  const dimClass = isLight ? 'bg-slate-200' : 'bg-slate-700';

  return (
    <div className="flex items-end gap-[2px] h-4">
      {[1, 2, 3, 4].map((b) => (
        <div
          key={b}
          className={`w-1.5 rounded-[2px] transition-all ${b <= bars ? colorClass : dimClass}`}
          style={{ height: `${b * 4 + 2}px` }}
        />
      ))}
    </div>
  );
};

// ─── Helper: Barras de sinal BLE ──────────────────────────────

const BleSignalBars: React.FC<{ rssi: number; isLight: boolean }> = ({ rssi, isLight }) => {
  const bars = rssi >= -50 ? 4 : rssi >= -65 ? 3 : rssi >= -80 ? 2 : rssi < 0 ? 1 : 0;
  const colorClass =
    rssi >= -50 ? 'bg-blue-500'   :
    rssi >= -65 ? 'bg-sky-500'    :
    rssi >= -80 ? 'bg-amber-500'  : 'bg-rose-500';
  const dimClass = isLight ? 'bg-slate-200' : 'bg-slate-700';

  return (
    <div className="flex items-end gap-[2px] h-4">
      {[1, 2, 3, 4].map((b) => (
        <div
          key={b}
          className={`w-1.5 rounded-[2px] transition-all ${b <= bars ? colorClass : dimClass}`}
          style={{ height: `${b * 4 + 2}px` }}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  BluetoothConnectionCard — Quadro 1: Conexão Bluetooth
// ─────────────────────────────────────────────────────────────

type BleState = 'idle' | 'scanning' | 'connecting' | 'connected';

export const BluetoothConnectionCard: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [bleState, setBleState] = useState<BleState>('idle');
  const [deviceId, setDeviceId]   = useState<string>('');
  const [deviceName, setDeviceName] = useState<string>('');
  const [bleRssi, setBleRssi]     = useState<number>(0);
  const [error, setError]         = useState<string | null>(null);

  // Inicializar BT e escutar eventos
  useEffect(() => {
    bluetoothService.initialize();

    const handleConnected = (data: any) => {
      setBleState('connected');
      setDeviceId(data?.deviceId || '');
      setDeviceName(data?.deviceName || 'ESP32-IR-Hub');
      setError(null);
    };
    const handleDisconnected = () => {
      setBleState('idle');
      setDeviceId('');
      setDeviceName('');
      setBleRssi(0);
    };
    const handleRssi = (rssi: number) => setBleRssi(rssi);

    bluetoothService.on('connected',    handleConnected);
    bluetoothService.on('disconnected', handleDisconnected);
    bluetoothService.on('rssi',         handleRssi);

    // Sincronizar estado inicial se já conectado
    if (bluetoothService.isConnected()) {
      setBleState('connected');
      setDeviceId(bluetoothService.getConnectedDeviceId() || '');
      setDeviceName(bluetoothService.getConnectedDeviceName());
      setBleRssi(bluetoothService.getBleRssi());
    }

    return () => {
      bluetoothService.off('connected',    handleConnected);
      bluetoothService.off('disconnected', handleDisconnected);
      bluetoothService.off('rssi',         handleRssi);
    };
  }, []);

  const handleConnect = async () => {
    setError(null);
    setBleState('scanning');
    feedback.playClick();

    const result = await bluetoothService.startScan();
    if (!result) {
      setError('Nenhum dispositivo encontrado. Segure o botão de pareamento do hub por no mínimo 2 segundos. Quando o LED piscar rapidamente, clique em Conectar via Bluetooth.');
      setBleState('idle');
      return;
    }

    setBleState('connecting');
    const ok = await bluetoothService.connect(result.deviceId, result.deviceName);
    if (!ok) {
      setError('Falha ao conectar. Tente novamente.');
      setBleState('idle');
    }
    // Estado 'connected' definido pelo listener de evento
  };

  const handleDisconnect = async () => {
    feedback.playClick();
    await bluetoothService.disconnect();
  };

  const getBleSignalLabel = () => {
    if (bleRssi === 0) return 'Conectado';
    if (bleRssi >= -50) return 'Excelente';
    if (bleRssi >= -65) return 'Bom';
    if (bleRssi >= -80) return 'Regular';
    return 'Fraco';
  };

  const isConnected = bleState === 'connected';
  const isLoading   = bleState === 'scanning' || bleState === 'connecting';

  return (
    <div className={`rounded-[32px] p-6 shadow-xl border transition-all ${
      isLight
        ? 'bg-gradient-to-b from-blue-50/90 via-white to-blue-50/30 border-blue-200/90 shadow-blue-100'
        : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-800'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors ${
          isConnected
            ? isLight ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            : isLight ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-slate-800 text-slate-600 border-slate-700'
        }`}>
          {isConnected
            ? <Bluetooth className="w-5 h-5 animate-pulse" />
            : <BluetoothOff className="w-5 h-5" />
          }
        </div>
        <div className="flex-1">
          <h3 className={`font-black text-sm tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Conexão Bluetooth
          </h3>
          <p className={`text-[11px] font-bold transition-colors ${
            isConnected ? 'text-blue-500' : 'opacity-40'
          }`}>
            {isConnected ? `Conectado · ${getBleSignalLabel()}` : 'Desconectado'}
          </p>
        </div>
        {/* Bolinha de status */}
        <div className={`w-2.5 h-2.5 rounded-full transition-all ${
          isConnected
            ? 'bg-blue-500 animate-pulse shadow-sm shadow-blue-500/50'
            : isLight ? 'bg-slate-300' : 'bg-slate-700'
        }`} />
      </div>

      {/* Info do dispositivo conectado */}
      {isConnected && (
        <div className={`p-4 rounded-2xl border mb-4 ${
          isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/5 border-blue-500/20'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                isLight ? 'text-blue-500' : 'text-blue-400'
              }`}>Dispositivo</p>
              <p className={`text-sm font-black truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {deviceName}
              </p>
              <p className={`text-[10px] font-mono mt-0.5 truncate ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                {deviceId}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <BleSignalBars rssi={bleRssi} isLight={isLight} />
              <span className={`text-[10px] font-black ${
                bleRssi >= -50 ? 'text-blue-500'   :
                bleRssi >= -65 ? 'text-sky-500'    :
                bleRssi >= -80 ? 'text-amber-500'  :
                bleRssi < 0    ? 'text-rose-500'   : 'text-slate-400'
              }`}>
                {bleRssi !== 0 ? `${bleRssi} dBm` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <div className={`flex items-start gap-2 p-3 rounded-xl mb-4 border text-[11px] font-bold ${
          isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Botão principal */}
      {isConnected ? (
        <button
          onClick={handleDisconnect}
          className={`w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 border flex items-center justify-center gap-2 ${
            isLight
              ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <BluetoothOff className="w-4 h-4" />
          Desconectar
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className={`w-full py-3.5 rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all active:scale-95 shadow-lg border-2 flex items-center justify-center gap-3 ${
            isLoading
              ? isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-800 border-slate-700 text-slate-500'
              : 'bg-blue-600 border-blue-500 text-white shadow-blue-500/30'
          }`}
        >
          {isLoading
            ? <RefreshCw className="w-4 h-4 animate-spin" />
            : <Bluetooth className="w-4 h-4" />
          }
          {bleState === 'scanning'
            ? 'Procurando dispositivo...'
            : bleState === 'connecting'
            ? 'Conectando...'
            : 'Conectar via Bluetooth'
          }
        </button>
      )}

      {!isConnected && !isLoading && (
        <p className="text-[10px] text-center mt-3 font-bold opacity-40 uppercase tracking-wider leading-relaxed px-2">
          SEGURE O BOTÃO DE PAREAMENTO DO HUB POR NO MÍNIMO 2 SEGUNDOS. QUANDO O LED PISCAR RAPIDAMENTE, CLIQUE EM CONECTAR VIA BLUETOOTH
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  WiFiScanCard — Quadro 2: Busca de Rede WiFi
// ─────────────────────────────────────────────────────────────

export const WiFiScanCard: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [isConnected, setIsConnected]     = useState(bluetoothService.isConnected());
  const [isScanning, setIsScanning]       = useState(false);
  const [isSending, setIsSending]         = useState(false);
  const [networks, setNetworks]           = useState<WiFiScanResult[]>([]);
  const [ssid, setSsid]                   = useState('');
  const [password, setPassword]           = useState('');
  const [message, setMessage]             = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [done, setDone]                   = useState(false);

  useEffect(() => {
    const handleConnected    = () => setIsConnected(true);
    const handleDisconnected = () => {
      setIsConnected(false);
      setSsid('');
      setPassword('');
      setMessage(null);
      setIsScanning(false);
    };
    const handleStatus = (data: any) => {
      if (data?.status === 'received') {
        feedback.playCaptureSuccess();
        setDone(true);
        setIsSending(false);
        setMessage(null);
      }
    };

    bluetoothService.on('connected',    handleConnected);
    bluetoothService.on('disconnected', handleDisconnected);
    bluetoothService.on('status',       handleStatus);

    return () => {
      bluetoothService.off('connected',    handleConnected);
      bluetoothService.off('disconnected', handleDisconnected);
      bluetoothService.off('status',       handleStatus);
    };
  }, []);

  // Usa o scanner nativo do celular (WifiScannerPlugin Android)
  const handleScan = async () => {
    setIsScanning(true);
    setNetworks([]);
    setMessage(null);
    feedback.playClick();

    const found = await scanPhoneWifiNetworks();
    setIsScanning(false);

    if (found.length === 0) {
      setMessage({ type: 'info', text: 'Nenhuma rede encontrada. Verifique se o Wi-Fi do celular está ligado.' });
    } else {
      setNetworks(found);
    }
  };

  const handleSend = async () => {
    if (!ssid.trim()) {
      setMessage({ type: 'error', text: 'Selecione ou informe o nome da rede.' });
      return;
    }
    setIsSending(true);
    setMessage(null);
    feedback.playClick();

    const ok = await bluetoothService.sendWiFiCredentials(ssid.trim(), password);
    if (!ok) {
      setMessage({ type: 'error', text: 'Erro ao enviar credenciais. Verifique a conexão Bluetooth.' });
      setIsSending(false);
    }
    // Estado de sucesso definido pelo listener 'status'
  };

  const handleReset = () => {
    setDone(false);
    setSsid('');
    setPassword('');
    setNetworks([]);
    setMessage(null);
  };

  return (
    <div className={`rounded-[32px] p-6 shadow-xl border transition-all ${
      isLight
        ? 'bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/20 border-emerald-200/90 shadow-emerald-100'
        : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-800'
    } ${!isConnected ? 'opacity-70' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors ${
          isConnected
            ? isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : isLight ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-slate-800 text-slate-600 border-slate-700'
        }`}>
          <Wifi className="w-5 h-5" />
        </div>
        <div>
          <h3 className={`font-black text-sm tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Busca de Rede WiFi
          </h3>
          <p className="text-[11px] font-medium opacity-50">
            {isConnected ? 'ESP32 detecta as redes disponíveis' : 'Conecte via Bluetooth primeiro'}
          </p>
        </div>
      </div>

      {/* Aviso: não conectado */}
      {!isConnected && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700'
        }`}>
          <WifiOff className={`w-5 h-5 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
          <p className={`text-[11px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            Conecte ao ESP32 via Bluetooth para buscar redes e enviar credenciais WiFi.
          </p>
        </div>
      )}

      {/* Conteúdo principal (só quando BLE conectado) */}
      {isConnected && (
        <>
          {/* Estado de sucesso */}
          {done ? (
            <div className="space-y-4">
              <div className={`p-5 rounded-2xl border flex flex-col items-center gap-3 text-center ${
                isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'
              }`}>
                <CheckCircle2 className={`w-10 h-10 ${isLight ? 'text-emerald-500' : 'text-emerald-400'}`} />
                <div>
                  <p className={`font-black text-sm ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
                    Credenciais Enviadas!
                  </p>
                  <p className={`text-[11px] font-bold mt-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    O ESP32 está reiniciando e conectando à rede{' '}
                    <span className="font-black">"{ssid}"</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className={`w-full py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 border ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                Configurar Novamente
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Botão Buscar */}
              <button
                onClick={handleScan}
                disabled={isScanning}
                className={`w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 border flex items-center justify-center gap-2 ${
                  isScanning
                    ? isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-800 border-slate-700 text-slate-500'
                    : isLight
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-900/30'
                }`}
              >
                {isScanning
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />
                }
                {isScanning ? 'Buscando redes...' : 'Buscar Redes WiFi (Celular)'}
              </button>

              {/* Lista de redes */}
              {networks.length > 0 && (
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {networks.length} rede{networks.length !== 1 ? 's' : ''} encontrada{networks.length !== 1 ? 's' : ''} pelo celular — toque para selecionar
                  </p>
                  <div className={`rounded-2xl overflow-hidden border max-h-52 overflow-y-auto ${
                    isLight ? 'border-slate-200' : 'border-slate-700'
                  }`}>
                    {networks.map((net, i) => (
                      <button
                        key={`${net.ssid}-${i}`}
                        onClick={() => { setSsid(net.ssid); feedback.playClick(); }}
                        className={`w-full px-4 py-3 flex items-center justify-between border-b last:border-0 transition-all ${
                          ssid === net.ssid
                            ? isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'
                            : isLight ? 'bg-white hover:bg-slate-50 border-slate-100' : 'bg-slate-900/50 hover:bg-slate-800/50 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Wifi className={`w-4 h-4 shrink-0 ${
                            ssid === net.ssid ? 'text-emerald-500' : isLight ? 'text-slate-400' : 'text-slate-600'
                          }`} />
                          <p className={`text-sm font-black truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {net.ssid}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          {net.secured && (
                            <Lock className={`w-3 h-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                          )}
                          <WifiSignalBars rssi={net.rssi} isLight={isLight} />
                          {ssid === net.ssid && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Campo SSID + Senha */}
              <div className="space-y-3">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Nome da Rede (SSID)
                  </label>
                  <input
                    type="text"
                    value={ssid}
                    onChange={(e) => setSsid(e.target.value)}
                    placeholder="Nome da rede WiFi"
                    className={`w-full px-4 py-3 rounded-2xl border outline-none text-sm font-bold transition-all focus:ring-2 focus:ring-emerald-500/30 ${
                      isLight
                        ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Senha da Rede
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha do WiFi"
                    className={`w-full px-4 py-3 rounded-2xl border outline-none text-sm font-bold transition-all focus:ring-2 focus:ring-emerald-500/30 ${
                      isLight
                        ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Mensagem de feedback */}
              {message && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-[11px] font-bold border ${
                  message.type === 'success'
                    ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : message.type === 'error'
                    ? isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : isLight ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                }`}>
                  {message.type === 'error'
                    ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  }
                  <span>{message.text}</span>
                </div>
              )}

              {/* Botão Enviar Credenciais */}
              <button
                onClick={handleSend}
                disabled={isSending || !ssid.trim()}
                className={`w-full py-3.5 rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all active:scale-95 shadow-lg border-2 flex items-center justify-center gap-3 ${
                  isSending || !ssid.trim()
                    ? isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-800 border-slate-700 text-slate-500'
                    : 'bg-blue-600 border-blue-500 text-white shadow-blue-500/30'
                }`}
              >
                {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSending ? 'Enviando...' : 'Enviar Credenciais'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Mantido para compatibilidade com importações antigas
export const BluetoothPairingPanel = BluetoothConnectionCard;
