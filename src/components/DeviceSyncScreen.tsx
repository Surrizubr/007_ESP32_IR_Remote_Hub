import React, { useState, useEffect } from 'react';
import {
  Wifi,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Send,
  Radio,
  Activity,
  ArrowLeft,
  WifiOff,
  Zap,
  Info,
} from 'lucide-react';
import { ESP32DeviceState } from '../types';
import { esp32 } from '../services/esp32Service';
import { feedback } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { BluetoothConnectionCard, WiFiScanCard } from './BluetoothPairingPanel';

interface DeviceSyncScreenProps {
  espState: ESP32DeviceState;
  onBack?: () => void;
}

export const DeviceSyncScreen: React.FC<DeviceSyncScreenProps> = ({ espState, onBack }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings } = useLanguage();

  // IP manual
  const [customIp, setCustomIp] = useState<string>(espState.ipAddress || '');
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<number | null>(null);
  const [pingMessage, setPingMessage] = useState<string | null>(null);

  // IR TX test
  const [isTestingIrTx, setIsTestingIrTx] = useState<boolean>(false);
  const [irTxResult, setIrTxResult] = useState<{ durationMs: number } | null>(null);

  // IR RX monitor
  const [isListeningRx, setIsListeningRx] = useState<boolean>(false);
  const [lastRxSignal, setLastRxSignal] = useState<{
    protocol: string; hexCode: string; bits: number; time: string;
  } | null>(null);

  // Auto-refresh connection state every 3 s
  useEffect(() => {
    const interval = setInterval(() => { esp32.refreshConnection(); }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Sync IP field when espState.ipAddress changes
  useEffect(() => {
    if (espState.ipAddress && espState.ipAddress !== customIp) {
      setCustomIp(espState.ipAddress);
    }
  }, [espState.ipAddress]);

  // IR Receive subscription
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

  // Test connection to ESP32 at given IP
  const handleTestPing = async () => {
    if (!customIp.trim()) return;
    setIsPinging(true);
    setPingMessage(null);
    feedback.playClick();
    const res = await esp32.testWiFiConnection(customIp.trim());
    setIsPinging(false);
    setPingResult(res.latencyMs || 0);
    setPingMessage(res.message);
    if (res.success) feedback.playCaptureSuccess();
  };

  // Test IR TX
  const handleTestIrTx = async () => {
    setIsTestingIrTx(true);
    feedback.playTransmitBeep();
    const res = await esp32.transmitIR({
      id: 'test_tx',
      name: 'Teste TX',
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

  const getSignalBadge = (rssi: number) => {
    if (rssi >= -55) return { label: 'Excelente', color: 'text-emerald-500', pct: 95 };
    if (rssi >= -70) return { label: 'Bom', color: 'text-sky-500', pct: 70 };
    if (rssi < 0)    return { label: 'Fraco', color: 'text-rose-500', pct: 25 };
    return { label: '—', color: 'text-slate-400', pct: 0 };
  };
  const signal = getSignalBadge(espState.rssi);

  // ─── Render ───────────────────────────────────────────────

  return (
    <div id="device-sync-screen" className="flex flex-col pb-24 px-4 pt-4 max-w-lg mx-auto space-y-6">

      {/* Back button */}
      {onBack && (
        <div className="flex items-center w-full">
          <button
            onClick={() => { feedback.playClick(); onBack(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold border shadow-sm transition-all active:scale-95 ${
              isLight ? 'bg-white text-slate-700 border-slate-200' : 'bg-slate-900 text-slate-200 border-slate-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{strings.common.back}</span>
          </button>
        </div>
      )}

      {/* ── Quadro 1: Conexão Bluetooth ─────────────────────── */}
      <BluetoothConnectionCard />

      {/* ── Quadro 2: Busca de Rede WiFi ────────────────────── */}
      <WiFiScanCard />

      {/* ── Status Card ──────────────────────────────────────── */}
      <div className={`rounded-[32px] p-6 shadow-2xl border transition-all ${
        isLight
          ? 'bg-gradient-to-b from-sky-50/90 via-white to-sky-50 border-sky-200/90 shadow-sky-100'
          : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-800'
      }`}>
        <div className={`flex items-center justify-between pb-4 border-b ${isLight ? 'border-sky-100' : 'border-slate-800'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
              isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-black text-base tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  ESP32 IR HUB
                </h2>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  espState.connected
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${espState.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {espState.connected ? 'Online' : 'Offline'}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] font-bold opacity-40 font-mono tracking-widest">FIRMWARE v7.0.0 WiFi-Only</p>
                {espState.isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-sky-500 opacity-60" />}
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          {/* Signal */}
          <div className={`p-4 rounded-2xl border shadow-sm ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className={`text-[10px] font-black mb-2 flex items-center gap-1.5 uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              <Wifi className={`w-3.5 h-3.5 ${isLight ? 'text-sky-500' : 'text-sky-400'}`} /> Sinal WiFi
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {espState.rssi || 0}
              </span>
              <span className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>dBm</span>
            </div>
            <span className={`text-[10px] font-black ${signal.color}`}>{signal.label}</span>
          </div>

          {/* IP & MAC */}
          <div className={`p-4 rounded-2xl border shadow-sm ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className={`text-[10px] font-black mb-2 uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Endereço IP</div>
            <div className={`text-sm font-black font-mono truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {espState.ipAddress || 'OFFLINE'}
            </div>
            <div className={`text-[10px] font-black font-mono mt-1 truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {espState.wifiMac || '—'}
            </div>
          </div>
        </div>
      </div>



      {/* ── Instrução WiFi ───────────────────────────────────── */}
      <div className={`rounded-[28px] p-5 border flex items-start gap-4 ${
        isLight
          ? 'bg-sky-50 border-sky-200 text-sky-800'
          : 'bg-sky-900/20 border-sky-800/40 text-sky-200'
      }`}>
        <Info className="w-5 h-5 shrink-0 mt-0.5 opacity-70" />
        <div className="text-[11px] font-bold leading-relaxed">
          <p className="font-black text-sm mb-1">Conexão via WiFi</p>
          <p>
            O ESP32 se conecta automaticamente à rede configurada no firmware. Certifique-se
            de que o celular e o ESP32 estão na <strong>mesma rede WiFi</strong>. Em seguida,
            informe o IP do ESP32 abaixo e clique em <strong>Testar Conexão</strong>.
          </p>
          <p className="mt-2 opacity-70">
            O ESP32 também pode ser acessado via mDNS:{' '}
            <span className="font-mono font-black">esp32-ir-hub.local</span>
          </p>
        </div>
      </div>

      {/* ── Conexão Manual (IP + Ping) ───────────────────────── */}
      <div className={`rounded-[32px] p-6 shadow-xl border transition-all ${
        isLight
          ? 'bg-gradient-to-b from-emerald-50/90 via-white to-emerald-50/30 border-emerald-200/90 shadow-emerald-100'
          : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-800'
      }`}>
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
            isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm tracking-tight">Endereço IP do ESP32</h3>
            <p className="text-[11px] font-medium opacity-50">Informe o IP para testar a conexão</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={customIp}
              onChange={(e) => setCustomIp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestPing()}
              placeholder="Ex: 192.168.1.100"
              className={`flex-1 p-4 rounded-2xl text-sm font-mono font-bold border outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500'
                  : 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
              }`}
            />
            <button
              onClick={handleTestPing}
              disabled={isPinging || !customIp.trim()}
              className={`px-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-md ${
                isPinging || !customIp.trim()
                  ? (isLight ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 text-slate-500')
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isPinging ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Testar'}
            </button>
          </div>

          {/* Ping result */}
          {pingMessage && (
            <div className={`p-3 rounded-xl text-[11px] font-bold border flex items-start gap-2 ${
              pingMessage.includes('Conectado')
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {pingMessage.includes('Conectado')
                ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                : <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{pingMessage}</span>
              {pingResult !== null && pingMessage.includes('Conectado') && (
                <span className="ml-auto font-mono font-black shrink-0">{pingResult}ms</span>
              )}
            </div>
          )}

          {/* Auto-discover button */}
          <button
            onClick={() => { feedback.playClick(); esp32.refreshConnection(); }}
            className={`w-full py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 border flex items-center justify-center gap-2 ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Auto-Descoberta (mDNS / 192.168.4.1)
          </button>
        </div>
      </div>

      {/* ── Ferramentas de Teste IR ──────────────────────────── */}
      <div className={`rounded-[32px] p-6 shadow-xl border transition-all ${
        isLight
          ? 'bg-gradient-to-b from-sky-100/90 via-white to-sky-50 border-sky-200/90 shadow-sky-100'
          : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-800'
      }`}>
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
            isLight ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm tracking-tight">Ferramentas de Teste</h3>
            <p className="text-[11px] font-medium opacity-50">Validação de transmissor e sensor IR</p>
          </div>
        </div>

        {/* IR TX */}
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

        {/* IR RX Monitor */}
        <div className={`mt-4 p-5 rounded-2xl border transition-all ${
          isListeningRx ? 'ring-2 ring-emerald-500/20 shadow-lg' : ''
        } ${isLight ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
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
              {isListeningRx ? 'Parar' : 'Escutar'}
            </button>
          </div>

          {lastRxSignal ? (
            <div className={`rounded-xl p-4 border animate-in fade-in slide-in-from-bottom-2 shadow-md ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest">{lastRxSignal.protocol}</span>
                <span className="text-[9px] font-black font-mono opacity-60">{lastRxSignal.time}</span>
              </div>
              <div className="text-2xl font-black font-mono tracking-tighter">{lastRxSignal.hexCode}</div>
              <div className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">{lastRxSignal.bits} BITS DETECTADOS</div>
            </div>
          ) : (
            <div className={`h-20 flex items-center justify-center border border-dashed rounded-xl ${isLight ? 'border-slate-300' : 'border-slate-700'}`}>
              <p className="text-[11px] font-bold opacity-40 italic uppercase tracking-widest">
                {isListeningRx ? 'Aguardando sinal IR...' : 'Ative o monitoramento acima'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Console de Log ───────────────────────────────────── */}
      <div className={`rounded-[32px] p-6 shadow-xl border transition-all ${
        isLight
          ? 'bg-gradient-to-b from-sky-100/90 via-white to-sky-50 border-sky-200/90 shadow-sky-100'
          : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-800'
      }`}>
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
            isLight ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base tracking-tight">{strings.sync.logConsoleTitle || 'Console de Comandos'}</h3>
            <p className="text-[11px] font-medium opacity-50">{strings.sync.logConsoleSubtitle || 'Log de atividades em tempo real'}</p>
          </div>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide font-mono text-[10px]">
          {espState.logs && espState.logs.length > 0 ? (
            espState.logs.map((log) => (
              <div key={log.id} className={`flex gap-3 border-b pb-2 last:border-0 ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
                <span className="text-slate-400 shrink-0">{log.timestamp}</span>
                <span className={`font-black uppercase shrink-0 ${
                  log.type === 'tx'      ? 'text-amber-500'  :
                  log.type === 'rx'      ? 'text-emerald-500' :
                  log.type === 'error'   ? 'text-rose-500'   :
                  log.type === 'success' ? 'text-sky-400'    :
                  (isLight ? 'text-slate-600' : 'text-slate-400')
                }`}>
                  [{log.type}]
                </span>
                <span className={`break-all ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{log.message}</span>
              </div>
            ))
          ) : (
            <div className="text-slate-400 italic text-center py-4 uppercase tracking-widest font-black opacity-30">
              Aguardando atividades...
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
