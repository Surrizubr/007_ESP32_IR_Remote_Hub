import React, { useState } from 'react';
import {
  Power,
  Sun,
  SunMedium,
  Moon,
  Sparkles,
  Zap,
  Clock,
  Flame,
  Droplets,
  Palette,
  Lightbulb,
} from 'lucide-react';
import { IRCommand } from '../../types';

interface LightsRemoteProps {
  isLight: boolean;
  isConfigMode: boolean;
  getMappedCommand: (key: string) => IRCommand | undefined;
  onButtonClick: (key: string, label: string, onInteractiveUpdate?: () => void) => void;
}

export const LightsRemote: React.FC<LightsRemoteProps> = ({
  isLight,
  isConfigMode,
  getMappedCommand,
  onButtonClick,
}) => {
  // Lighting State Simulation
  const [power, setPower] = useState<boolean>(true);
  const [brightness, setBrightness] = useState<number>(80); // 10 to 100
  const [selectedColor, setSelectedColor] = useState<string>('#3b82f6');
  const [colorName, setColorName] = useState<string>('Azul Real');
  const [effectMode, setEffectMode] = useState<'STATIC' | 'FLASH' | 'STROBE' | 'FADE' | 'SMOOTH'>('STATIC');
  const [colorTemp, setColorTemp] = useState<'WARM (2700K)' | 'NEUTRAL (4000K)' | 'COOL (6500K)'>('NEUTRAL (4000K)');
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);

  const colorsList = [
    { name: 'Vermelho', hex: '#ef4444', key: 'light_color_red' },
    { name: 'Verde', hex: '#22c55e', key: 'light_color_green' },
    { name: 'Azul', hex: '#3b82f6', key: 'light_color_blue' },
    { name: 'Branco', hex: '#ffffff', key: 'light_color_white' },
    { name: 'Laranja', hex: '#f97316', key: 'light_color_orange' },
    { name: 'Amarelo', hex: '#eab308', key: 'light_color_yellow' },
    { name: 'Ciano', hex: '#06b6d4', key: 'light_color_cyan' },
    { name: 'Roxo', hex: '#a855f7', key: 'light_color_purple' },
    { name: 'Rosa', hex: '#ec4899', key: 'light_color_pink' },
    { name: 'Âmbar', hex: '#d97706', key: 'light_color_amber' },
    { name: 'Esmeralda', hex: '#10b981', key: 'light_color_emerald' },
    { name: 'Índigo', hex: '#6366f1', key: 'light_color_indigo' },
  ];

  const handlePowerOn = () => {
    onButtonClick('light_on', 'Luminária Ligar (ON)', () => {
      setPower(true);
    });
  };

  const handlePowerOff = () => {
    onButtonClick('light_off', 'Luminária Desligar (OFF)', () => {
      setPower(false);
    });
  };

  const handleBrightUp = () => {
    onButtonClick('light_bright_up', 'Luminária Brilho +', () => {
      setPower(true);
      setBrightness((prev) => Math.min(100, prev + 15));
    });
  };

  const handleBrightDown = () => {
    onButtonClick('light_bright_down', 'Luminária Brilho -', () => {
      setPower(true);
      setBrightness((prev) => Math.max(10, prev - 15));
    });
  };

  const handleColorPick = (col: { name: string; hex: string; key: string }) => {
    onButtonClick(col.key, `Luminária Cor ${col.name}`, () => {
      setPower(true);
      setSelectedColor(col.hex);
      setColorName(col.name);
      setEffectMode('STATIC');
    });
  };

  const handleWarmLight = () => {
    onButtonClick('light_warm', 'Luminária Luz Quente (2700K)', () => {
      setPower(true);
      setSelectedColor('#fb923c');
      setColorName('Luz Quente');
      setColorTemp('WARM (2700K)');
      setEffectMode('STATIC');
    });
  };

  const handleCoolLight = () => {
    onButtonClick('light_cool', 'Luminária Luz Fria (6500K)', () => {
      setPower(true);
      setSelectedColor('#e0f2fe');
      setColorName('Luz Fria');
      setColorTemp('COOL (6500K)');
      setEffectMode('STATIC');
    });
  };

  const handleEffect = (mode: 'FLASH' | 'STROBE' | 'FADE' | 'SMOOTH', key: string) => {
    onButtonClick(key, `Luminária Modo ${mode}`, () => {
      setPower(true);
      setEffectMode(mode);
    });
  };

  const handleTimer = (minutes: number, key: string) => {
    onButtonClick(key, `Luminária Timer ${minutes}min`, () => {
      setTimerMinutes((prev) => (prev === minutes ? null : minutes));
    });
  };

  return (
    <div id="lights-remote-layout" className="w-full flex flex-col items-center space-y-3.5 animate-in fade-in duration-200">
      {/* LUMENS & RGB LIGHTING STATUS PANEL */}
      <div
        id="lights-status-display"
        className={`w-full rounded-2xl p-3.5 border font-mono relative overflow-hidden transition-all shadow-inner ${
          isLight
            ? 'bg-gradient-to-b from-amber-50/70 via-white to-sky-50 border-amber-200/90 text-slate-800 shadow-amber-100/60'
            : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-slate-800 text-white shadow-black'
        }`}
      >
        {/* Glow backdrop when light is on */}
        {power && (
          <div
            className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl opacity-40 transition-all pointer-events-none"
            style={{ backgroundColor: selectedColor }}
          />
        )}

        {/* Display Header */}
        <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 font-bold tracking-wider">
            <Lightbulb
              className={`w-4 h-4 transition-colors ${
                power ? 'text-amber-500 animate-pulse' : 'text-slate-400'
              }`}
            />
            <span className={isLight ? 'text-slate-900' : 'text-slate-200'}>
              SMART RGB & LIGHTING
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px]">
            <span
              className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                power
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
              }`}
            >
              {power ? 'LIGADA' : 'DESLIGADA'}
            </span>
          </div>
        </div>

        {/* Lighting Parameters */}
        {power ? (
          <div className="pt-2.5 pb-1 space-y-2.5">
            <div className="flex items-center justify-between">
              {/* Color swatch & name */}
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-xl border-2 border-white/80 shadow-md transition-all flex items-center justify-center"
                  style={{ backgroundColor: selectedColor }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-black/60 mix-blend-overlay" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-sans uppercase">Cor / Modo</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <span>{colorName}</span>
                    {effectMode !== 'STATIC' && (
                      <span className="text-[9px] bg-purple-500/20 text-purple-600 dark:text-purple-300 px-1 rounded border border-purple-500/30">
                        {effectMode}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Brightness percentage */}
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-sans uppercase">Brilho</div>
                <div className="text-lg font-black text-amber-500 leading-none">
                  {brightness}%
                </div>
              </div>
            </div>

            {/* Brightness Gauge Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 flex items-center">
              <div
                className="h-full rounded-full transition-all duration-300 shadow-sm"
                style={{
                  width: `${brightness}%`,
                  backgroundColor: selectedColor === '#ffffff' ? '#eab308' : selectedColor,
                }}
              />
            </div>

            {/* Color Temp & Timer Tags */}
            <div className="flex items-center justify-between text-[10px] pt-0.5">
              <span className="text-slate-500 font-sans">
                Temp: <strong className="text-slate-800 dark:text-slate-300">{colorTemp}</strong>
              </span>
              {timerMinutes && (
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                  <Clock className="w-3 h-3" /> Desliga em {timerMinutes}min
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-slate-500 text-xs font-mono">
            LUMINÁRIA DESLIGADA
          </div>
        )}
      </div>

      {/* POWER & BRIGHTNESS ROW */}
      <div className="w-full grid grid-cols-4 gap-2">
        {/* ON Button */}
        <button
          id="btn-light-on"
          onClick={handlePowerOn}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : power
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border-emerald-500'
              : isLight
              ? 'bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm'
              : 'bg-slate-800/90 text-emerald-400 border-slate-700'
          }`}
        >
          <Power className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">ON</span>
        </button>

        {/* OFF Button */}
        <button
          id="btn-light-off"
          onClick={handlePowerOff}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : !power
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30 border-red-500'
              : isLight
              ? 'bg-white hover:bg-red-50 text-red-600 border-red-200 shadow-sm'
              : 'bg-slate-800/90 text-red-400 border-slate-700'
          }`}
        >
          <Power className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">OFF</span>
        </button>

        {/* Brightness UP */}
        <button
          id="btn-light-bright-up"
          onClick={handleBrightUp}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
              : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-slate-700'
          }`}
        >
          <Sun className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] mt-0.5">BRILHO +</span>
        </button>

        {/* Brightness DOWN */}
        <button
          id="btn-light-bright-down"
          onClick={handleBrightDown}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          <SunMedium className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] mt-0.5">BRILHO -</span>
        </button>
      </div>

      {/* COLOR TEMPERATURE PRESETS (QUENTE, NEUTRO, FRIO) */}
      <div className="w-full grid grid-cols-3 gap-2">
        <button
          id="btn-light-warm"
          onClick={handleWarmLight}
          className={`h-11 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 shadow-sm'
              : 'bg-amber-950/40 hover:bg-amber-950/60 text-amber-200 border-amber-700/50'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Luz Quente</span>
        </button>

        <button
          id="btn-light-white"
          onClick={() => handleColorPick({ name: 'Branco 100%', hex: '#ffffff', key: 'light_color_white' })}
          className={`h-11 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
          }`}
        >
          <Sun className="w-3.5 h-3.5 text-yellow-400" />
          <span>Branco Puro</span>
        </button>

        <button
          id="btn-light-cool"
          onClick={handleCoolLight}
          className={`h-11 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200 shadow-sm'
              : 'bg-sky-950/40 hover:bg-sky-950/60 text-sky-200 border-sky-700/50'
          }`}
        >
          <Droplets className="w-3.5 h-3.5 text-sky-400" />
          <span>Luz Fria</span>
        </button>
      </div>

      {/* RGB 12-COLOR MATRIX */}
      <div
        className={`w-full p-3 rounded-2xl border ${
          isLight ? 'bg-white/80 border-sky-200/90 shadow-sm' : 'bg-slate-950/80 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          <div className="flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-purple-500" />
            <span>Cores Estáticas (RGB)</span>
          </div>
          <span className="text-[10px] font-normal lowercase">{colorName}</span>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {colorsList.map((col) => {
            const isSelected = selectedColor === col.hex && effectMode === 'STATIC';
            return (
              <button
                key={col.key}
                id={`btn-${col.key}`}
                onClick={() => handleColorPick(col)}
                className={`h-10 rounded-xl border-2 transition-all active:scale-90 flex items-center justify-center shadow-sm relative ${
                  isConfigMode
                    ? 'ring-2 ring-amber-400'
                    : isSelected
                    ? 'scale-105 ring-2 ring-purple-500 border-white shadow-md'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: col.hex }}
                title={col.name}
              >
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-white shadow-sm ring-1 ring-black/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* DYNAMIC EFFECTS (FLASH, STROBE, FADE, SMOOTH) */}
      <div className="w-full grid grid-cols-4 gap-1.5">
        {[
          { name: 'FLASH', key: 'light_flash' },
          { name: 'STROBE', key: 'light_strobe' },
          { name: 'FADE', key: 'light_fade' },
          { name: 'SMOOTH', key: 'light_smooth' },
        ].map((eff) => (
          <button
            key={eff.key}
            id={`btn-${eff.key}`}
            onClick={() => handleEffect(eff.name as any, eff.key)}
            className={`py-2 rounded-xl border text-[11px] font-bold transition-all active:scale-90 ${
              isConfigMode
                ? isLight
                  ? 'border-amber-400 bg-amber-50 text-amber-800'
                  : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : effectMode === eff.name
              ? 'bg-purple-600 text-white shadow-md border-purple-500'
              : isLight
              ? 'bg-white hover:bg-purple-50 text-purple-700 border-purple-200 shadow-sm'
              : 'bg-slate-900 hover:bg-slate-800 text-purple-300 border-slate-800'
            }`}
          >
            {eff.name}
          </button>
        ))}
      </div>

      {/* SLEEP TIMERS */}
      <div className="w-full grid grid-cols-4 gap-1.5">
        {[
          { label: '30 min', min: 30, key: 'light_timer_30' },
          { label: '1 hora', min: 60, key: 'light_timer_60' },
          { label: '2 horas', min: 120, key: 'light_timer_120' },
          { label: '4 horas', min: 240, key: 'light_timer_240' },
        ].map((t) => (
          <button
            key={t.key}
            id={`btn-${t.key}`}
            onClick={() => handleTimer(t.min, t.key)}
            className={`py-1.5 rounded-lg border text-[10px] font-medium transition-all active:scale-90 ${
              timerMinutes === t.min
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm font-bold'
                : isLight
                ? 'bg-sky-50/80 text-slate-600 border-sky-200/80 hover:bg-sky-100'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};
