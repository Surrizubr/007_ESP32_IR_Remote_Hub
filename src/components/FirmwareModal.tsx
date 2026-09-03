import React from 'react';
import { X, Copy, Check, Download, Cpu, Terminal } from 'lucide-react';
import { ESP32PinConfig } from '../types';
import { generateArduinoSketch } from '../services/esp32Service';
import { feedback } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface FirmwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinConfig: ESP32PinConfig;
}

export const FirmwareModal: React.FC<FirmwareModalProps> = ({
  isOpen,
  onClose,
  pinConfig,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings, language } = useLanguage();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const sketchCode = generateArduinoSketch(pinConfig);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sketchCode);
      setCopied(true);
      feedback.playClick(900, 0.05);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    const blob = new Blob([sketchCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ESP32_IR_Hub_Firmware.ino';
    link.click();
    URL.revokeObjectURL(url);
    feedback.playClick();
  };

  return (
    <div id="firmware-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-2xl rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 border transition-colors ${
          isLight
            ? 'bg-sky-50 border-sky-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-sky-200' : 'border-slate-800'}`}>
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                isLight
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                  : 'bg-emerald-600/30 border-emerald-500/40 text-emerald-400'
              }`}
            >
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {language === 'pt' ? 'Firmware Arduino ESP32' : language === 'es' ? 'Firmware Arduino ESP32' : 'ESP32 Arduino Firmware'}
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {language === 'pt' ? 'Pronto para compilar e gravar na Arduino IDE / PlatformIO' : language === 'es' ? 'Listo para compilar y grabar en Arduino IDE / PlatformIO' : 'Ready to compile and upload via Arduino IDE / PlatformIO'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-firmware-modal"
            onClick={onClose}
            aria-label={strings.common.close}
            className={`p-1.5 rounded-lg transition ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-sky-200/60' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pin Summary Callout */}
        <div
          className={`my-3 p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
            isLight ? 'bg-white border-sky-200 text-slate-700' : 'bg-slate-950/80 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Terminal className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            <span>{language === 'pt' ? 'Pinos Atuais:' : language === 'es' ? 'Pines Actuales:' : 'Current Pins:'}</span>
            <span className={`px-2 py-0.5 rounded font-mono font-semibold ${
              isLight ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-800 text-emerald-300'
            }`}>
              RX: GPIO {pinConfig.irReceiverPin}
            </span>
            <span className={`px-2 py-0.5 rounded font-mono font-semibold ${
              isLight ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-slate-800 text-blue-300'
            }`}>
              TX: GPIO {pinConfig.irTransmitterPin}
            </span>
            <span className={`px-2 py-0.5 rounded font-mono font-semibold ${
              isLight ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-800 text-amber-300'
            }`}>
              LED: GPIO {pinConfig.statusLedPin}
            </span>
          </div>
          <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {language === 'pt' ? 'Biblioteca:' : language === 'es' ? 'Librería:' : 'Library:'} <b>IRremoteESP8266</b>
          </span>
        </div>

        {/* Code Box */}
        <div className={`flex-1 overflow-hidden relative rounded-xl border flex flex-col ${
          isLight ? 'bg-slate-900 border-slate-800' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
            <span className="font-mono text-emerald-400">ESP32_IR_Hub_Firmware.ino</span>
            <span>C++ / Arduino Core</span>
          </div>
          <pre className="flex-1 overflow-auto p-3 text-[11px] font-mono text-slate-300 leading-relaxed select-text">
            <code>{sketchCode}</code>
          </pre>
        </div>

        {/* Actions */}
        <div className={`pt-3 mt-3 border-t flex items-center justify-end gap-3 ${isLight ? 'border-sky-200' : 'border-slate-800'}`}>
          <button
            id="btn-copy-firmware"
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition active:scale-95 border ${
              isLight
                ? 'bg-white hover:bg-sky-100 text-slate-700 border-sky-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? (language === 'pt' ? 'Código Copiado!' : language === 'es' ? '¡Código Copiado!' : 'Code Copied!') : (language === 'pt' ? 'Copiar Código' : language === 'es' ? 'Copiar Código' : 'Copy Code')}</span>
          </button>

          <button
            id="btn-download-firmware"
            onClick={handleDownload}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg active:scale-95 ${
              isLight
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{language === 'pt' ? 'Baixar Arquivo .INO' : language === 'es' ? 'Descargar Archivo .INO' : 'Download .INO File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
