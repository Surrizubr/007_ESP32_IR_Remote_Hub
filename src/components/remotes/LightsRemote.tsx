import React, { useState } from 'react';
import { Lightbulb, Check } from 'lucide-react';
import { IRCommand } from '../../types';

interface LightsRemoteProps {
  isLight: boolean;
  isConfigMode: boolean;
  getMappedCommand: (key: string) => IRCommand | undefined;
  onButtonClick: (key: string, label: string, onInteractiveUpdate?: () => void) => void;
}

export const LightsRemote: React.FC<LightsRemoteProps> = ({
  isConfigMode,
  getMappedCommand,
  onButtonClick,
}) => {
  // Simulated Interactive LED Lamp State
  const [power, setPower] = useState<boolean>(true);
  const [brightness, setBrightness] = useState<number>(100); // 20 to 100
  const [selectedColor, setSelectedColor] = useState<string>('#ffffff');
  const [colorName, setColorName] = useState<string>('Branco Puro');
  const [effectMode, setEffectMode] = useState<'STATIC' | 'FLASH' | 'STROBE' | 'FADE' | 'SMOOTH'>('STATIC');
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);

  // Trigger top IR LED blink on button press
  const triggerIrPulse = () => {
    setIsTransmitting(true);
    setTimeout(() => setIsTransmitting(false), 200);
  };

  // Button Click Handlers with interactive state updating
  const handlePowerOn = () => {
    triggerIrPulse();
    onButtonClick('light_on', 'Lâmpada LED Ligar (ON)', () => {
      setPower(true);
    });
  };

  const handlePowerOff = () => {
    triggerIrPulse();
    onButtonClick('light_off', 'Lâmpada LED Desligar (OFF)', () => {
      setPower(false);
    });
  };

  const handleBrightUp = () => {
    triggerIrPulse();
    onButtonClick('light_bright_up', 'Lâmpada LED Brilho +', () => {
      setPower(true);
      setBrightness((prev) => Math.min(100, prev + 20));
    });
  };

  const handleBrightDown = () => {
    triggerIrPulse();
    onButtonClick('light_bright_down', 'Lâmpada LED Brilho -', () => {
      setPower(true);
      setBrightness((prev) => Math.max(20, prev - 20));
    });
  };

  const handleColorClick = (key: string, label: string, hex: string) => {
    triggerIrPulse();
    onButtonClick(key, `Lâmpada LED ${label}`, () => {
      setPower(true);
      setSelectedColor(hex);
      setColorName(label);
      setEffectMode('STATIC');
    });
  };

  const handleEffectClick = (key: string, effect: 'FLASH' | 'STROBE' | 'FADE' | 'SMOOTH') => {
    triggerIrPulse();
    onButtonClick(key, `Lâmpada LED Modo ${effect}`, () => {
      setPower(true);
      setEffectMode(effect);
    });
  };

  // Helper for button badge/highlight in config mode
  const getButtonConfigRing = (key: string) => {
    if (!isConfigMode) return '';
    const mapped = getMappedCommand(key);
    return mapped
      ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white'
      : 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white';
  };

  return (
    <div className="w-full flex flex-col items-center justify-center animate-in fade-in duration-200">
      {/* SIMULADOR DE LÂMPADA LED NO TOPO */}
      <div className="w-full max-w-[340px] mb-3 bg-white rounded-2xl p-3.5 border-2 border-slate-200 shadow-md flex items-center justify-between text-black">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center border-2 border-slate-300 transition-all duration-300 relative shadow-inner"
            style={{
              backgroundColor: power ? selectedColor : '#334155',
              boxShadow: power
                ? `0 0 ${brightness / 3}px ${brightness / 6}px ${selectedColor}88, inset 0 2px 4px rgba(255,255,255,0.6)`
                : 'inset 0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            <Lightbulb
              className={`w-6 h-6 transition-colors duration-200 ${
                power
                  ? selectedColor === '#ffffff' || selectedColor === '#ffd60a'
                    ? 'text-slate-900'
                    : 'text-white'
                  : 'text-slate-400'
              }`}
            />
            {power && effectMode !== 'STATIC' && (
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-600"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wider text-black uppercase">
                {power ? 'LÂMPADA LIGADA' : 'LÂMPADA DESLIGADA'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  power ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
            </div>
            <div className="text-[11px] font-bold text-slate-800">
              {power ? `${colorName} • ${brightness}%` : 'Standby / Desligada'}
            </div>
          </div>
        </div>

        {/* Efeito ativo */}
        <div className="text-right">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
            MODO
          </span>
          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-black border border-slate-300">
            {power ? effectMode : 'OFF'}
          </span>
        </div>
      </div>

      {/* CORPO DO CONTROLE REMOTO (FUNDO BRANCO ACETINADO COM LETRAS PRETAS) */}
      <div
        id="led-lamp-remote-casing"
        className="w-full max-w-[340px] rounded-[38px] p-5 pt-4 pb-6 flex flex-col items-center select-none shadow-[0_20px_45px_-8px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.08)] bg-white border-2 border-slate-300 relative"
      >
        {/* Emissor IR no topo */}
        <div className="w-14 h-2.5 bg-gradient-to-r from-zinc-800 via-zinc-950 to-zinc-800 rounded-full mb-3 shadow-inner flex items-center justify-center relative">
          <div
            className={`w-3 h-1.5 rounded-full transition-all duration-150 ${
              isTransmitting
                ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e] scale-125'
                : 'bg-rose-900/60'
            }`}
          />
        </div>

        {/* Cabeçalho do Controle com letras pretas em fundo branco */}
        <div className="w-full flex items-center justify-between mb-3.5 px-2">
          <div>
            <span className="text-xs font-black tracking-widest text-black uppercase block leading-none">
              LÂMPADA LED
            </span>
            <span className="text-[9px] font-extrabold tracking-wider text-slate-700 block mt-0.5">
              CONTROLE RGB 24T
            </span>
          </div>
          {isConfigMode && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
              Modo Mapeamento
            </span>
          )}
        </div>

        {/* ========================================================================= */}
        {/* LINHA 1: BRILHO +, BRILHO -, OFF, ON */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-4 gap-3.5 mb-3.5">
          {/* Brilho + */}
          <button
            id="btn-lamp-bright-up"
            type="button"
            onClick={handleBrightUp}
            title="Aumentar Brilho"
            className={`aspect-square rounded-full bg-white border-2 border-slate-300 shadow-[0_3px_5px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.9),inset_0_-2px_3px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center transition-all active:scale-90 active:shadow-inner ${getButtonConfigRing(
              'light_bright_up'
            )}`}
          >
            <svg
              className="w-6 h-6 text-black"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Sun center */}
              <circle cx="12" cy="12" r="4" />
              {/* Sun rays */}
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
              {/* Up arrow indicator */}
              <path d="m9 13 3-3 3 3" />
            </svg>
          </button>

          {/* Brilho - */}
          <button
            id="btn-lamp-bright-down"
            type="button"
            onClick={handleBrightDown}
            title="Diminuir Brilho"
            className={`aspect-square rounded-full bg-white border-2 border-slate-300 shadow-[0_3px_5px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.9),inset_0_-2px_3px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center transition-all active:scale-90 active:shadow-inner ${getButtonConfigRing(
              'light_bright_down'
            )}`}
          >
            <svg
              className="w-6 h-6 text-black"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Sun center */}
              <circle cx="12" cy="12" r="4" />
              {/* Sun rays */}
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
              {/* Down arrow indicator */}
              <path d="m9 11 3 3 3-3" />
            </svg>
          </button>

          {/* OFF Button (Black with high contrast bold white text) */}
          <button
            id="btn-lamp-off"
            type="button"
            onClick={handlePowerOff}
            title="Desligar"
            className={`aspect-square rounded-full bg-black border-2 border-zinc-800 shadow-[0_3px_5px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-2px_3px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all active:scale-90 active:shadow-inner ${getButtonConfigRing(
              'light_off'
            )}`}
          >
            <span className="text-white font-black text-xs tracking-wider">OFF</span>
          </button>

          {/* ON Button (Red with bold white text) */}
          <button
            id="btn-lamp-on"
            type="button"
            onClick={handlePowerOn}
            title="Ligar"
            className={`aspect-square rounded-full bg-red-600 border-2 border-red-700 shadow-[0_3px_5px_rgba(220,38,38,0.4),inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all active:scale-90 active:shadow-inner ${getButtonConfigRing(
              'light_on'
            )}`}
          >
            <span className="text-white font-black text-xs tracking-wider">ON</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* LINHAS 2 A 6: MATRIZ DE CORES RGB (COM PAINEL CINZA ESCURO) & FUNÇÕES */}
        {/* ========================================================================= */}
        <div className="w-full relative">
          {/* Painel cinza escuro de fundo cobrindo as colunas 1 a 3 das linhas 2 a 6 e coluna 4 da linha 2 */}
          <div className="w-full grid grid-cols-4 gap-3.5 relative">
            {/* LINHA 2: R, G, B, W */}
            {/* R */}
            <button
              id="btn-lamp-r"
              type="button"
              onClick={() => handleColorClick('light_color_red', 'Vermelho', '#ef4444')}
              title="Vermelho (R)"
              className={`aspect-square rounded-full bg-[#ef4444] border-2 border-red-600 shadow-[0_3px_5px_rgba(0,0,0,0.3),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.35)] flex items-center justify-center transition-all active:scale-90 active:shadow-inner ${getButtonConfigRing(
                'light_color_red'
              )}`}
            >
              <span className="text-black font-black text-base drop-shadow-sm">R</span>
            </button>

            {/* G */}
            <button
              id="btn-lamp-g"
              type="button"
              onClick={() => handleColorClick('light_color_green', 'Verde', '#22c55e')}
              title="Verde (G)"
              className={`aspect-square rounded-full bg-[#16a34a] border-2 border-green-700 shadow-[0_3px_5px_rgba(0,0,0,0.3),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.35)] flex items-center justify-center transition-all active:scale-90 active:shadow-inner ${getButtonConfigRing(
                'light_color_green'
              )}`}
            >
              <span className="text-black font-black text-base drop-shadow-sm">G</span>
            </button>

            {/* B */}
            <button
              id="btn-lamp-b"
              type="button"
              onClick={() => handleColorClick('light_color_blue', 'Azul', '#2563eb')}
              title="Azul (B)"
              className={`aspect-square rounded-full bg-[#2563eb] border-2 border-blue-700 shadow-[0_3px_5px_rgba(0,0,0,0.3),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-2px_3px_rgba(0,0,0,0.35)] flex items-center justify-center transition-all active:scale-90 active:shadow-inner ${getButtonConfigRing(
                'light_color_blue'
              )}`}
            >
              <span className="text-black font-black text-base drop-shadow-sm">B</span>
            </button>

            {/* W */}
            <button
              id="btn-lamp-w"
              type="button"
              onClick={() => handleColorClick('light_color_white', 'Branco Puro', '#ffffff')}
              title="Branco (W)"
              className={`aspect-square rounded-full bg-white border-2 border-slate-300 shadow-[0_3px_5px_rgba(0,0,0,0.25),inset_0_2px_3px_rgba(255,255,255,0.9),inset_0_-2px_3px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all active:scale-90 active:shadow-inner ${getButtonConfigRing(
                'light_color_white'
              )}`}
            >
              <span className="text-black font-black text-base">W</span>
            </button>
          </div>

          {/* ÁREA INFERIOR COM O PAINEL CINZA EM FORMA ELEGANTE */}
          <div className="w-full mt-3.5 relative">
            {/* Fundo cinza escuro para as colunas 1, 2, 3 (exatamente como no controle físico original) */}
            <div className="absolute top-0 bottom-0 left-0 w-[73.5%] bg-[#6b7280] rounded-[22px] shadow-inner -z-0 border border-[#52525b]" />

            <div className="w-full grid grid-cols-4 gap-3.5 relative z-10 p-1 pl-1">
              {/* LINHA 3 */}
              {/* Coral / Vermelho Claro */}
              <button
                id="btn-lamp-b1"
                type="button"
                onClick={() => handleColorClick('light_color_b1', 'Coral', '#ff453a')}
                title="Coral / Vermelho Claro"
                className={`aspect-square rounded-full bg-[#ff453a] border border-red-500 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b1'
                )}`}
              >
                {selectedColor === '#ff453a' && power && (
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                )}
              </button>

              {/* Verde Claro / Menta */}
              <button
                id="btn-lamp-b2"
                type="button"
                onClick={() => handleColorClick('light_color_b2', 'Verde Claro', '#30d158')}
                title="Verde Claro"
                className={`aspect-square rounded-full bg-[#30d158] border border-emerald-500 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b2'
                )}`}
              >
                {selectedColor === '#30d158' && power && (
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                )}
              </button>

              {/* Azul Claro / Celeste */}
              <button
                id="btn-lamp-b3"
                type="button"
                onClick={() => handleColorClick('light_color_b3', 'Azul Celeste', '#0a84ff')}
                title="Azul Celeste"
                className={`aspect-square rounded-full bg-[#0a84ff] border border-blue-500 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b3'
                )}`}
              >
                {selectedColor === '#0a84ff' && power && (
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                )}
              </button>

              {/* FLASH (Coluna 4 - fora do painel cinza, sobre o fundo branco, letras pretas em botão cinza claro) */}
              <button
                id="btn-lamp-flash"
                type="button"
                onClick={() => handleEffectClick('light_flash', 'FLASH')}
                title="Modo Flash"
                className={`aspect-square rounded-full bg-[#9ca3af] border border-slate-400 shadow-[0_3px_5px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.6)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_flash'
                )}`}
              >
                <span className="text-black font-black text-[10px] tracking-tight">FLASH</span>
              </button>

              {/* LINHA 4 */}
              {/* Laranja */}
              <button
                id="btn-lamp-b4"
                type="button"
                onClick={() => handleColorClick('light_color_b4', 'Laranja', '#ff9500')}
                title="Laranja"
                className={`aspect-square rounded-full bg-[#ff9500] border border-orange-500 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b4'
                )}`}
              >
                {selectedColor === '#ff9500' && power && (
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                )}
              </button>

              {/* Ciano / Turquesa */}
              <button
                id="btn-lamp-b5"
                type="button"
                onClick={() => handleColorClick('light_color_b5', 'Ciano', '#00c7be')}
                title="Ciano"
                className={`aspect-square rounded-full bg-[#00c7be] border border-cyan-500 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b5'
                )}`}
              >
                {selectedColor === '#00c7be' && power && (
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                )}
              </button>

              {/* Roxo Escuro / Violeta */}
              <button
                id="btn-lamp-b6"
                type="button"
                onClick={() => handleColorClick('light_color_b6', 'Violeta', '#5856d6')}
                title="Violeta"
                className={`aspect-square rounded-full bg-[#5856d6] border border-indigo-500 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b6'
                )}`}
              >
                {selectedColor === '#5856d6' && power && (
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                )}
              </button>

              {/* STROBE */}
              <button
                id="btn-lamp-strobe"
                type="button"
                onClick={() => handleEffectClick('light_strobe', 'STROBE')}
                title="Modo Strobe"
                className={`aspect-square rounded-full bg-[#9ca3af] border border-slate-400 shadow-[0_3px_5px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.6)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_strobe'
                )}`}
              >
                <span className="text-black font-black text-[9px] tracking-tight">STROBE</span>
              </button>

              {/* LINHA 5 */}
              {/* Âmbar / Laranja Claro */}
              <button
                id="btn-lamp-b7"
                type="button"
                onClick={() => handleColorClick('light_color_b7', 'Âmbar', '#ffb340')}
                title="Âmbar"
                className={`aspect-square rounded-full bg-[#ffb340] border border-amber-500 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b7'
                )}`}
              >
                {selectedColor === '#ffb340' && power && (
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                )}
              </button>

              {/* Azul Oceano */}
              <button
                id="btn-lamp-b8"
                type="button"
                onClick={() => handleColorClick('light_color_b8', 'Azul Oceano', '#007aff')}
                title="Azul Oceano"
                className={`aspect-square rounded-full bg-[#007aff] border border-blue-600 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b8'
                )}`}
              >
                {selectedColor === '#007aff' && power && (
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                )}
              </button>

              {/* Ameixa / Magenta Escuro */}
              <button
                id="btn-lamp-b9"
                type="button"
                onClick={() => handleColorClick('light_color_b9', 'Ameixa', '#78448a')}
                title="Ameixa"
                className={`aspect-square rounded-full bg-[#78448a] border border-purple-800 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b9'
                )}`}
              >
                {selectedColor === '#78448a' && power && (
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                )}
              </button>

              {/* FADE */}
              <button
                id="btn-lamp-fade"
                type="button"
                onClick={() => handleEffectClick('light_fade', 'FADE')}
                title="Modo Fade"
                className={`aspect-square rounded-full bg-[#9ca3af] border border-slate-400 shadow-[0_3px_5px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.6)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_fade'
                )}`}
              >
                <span className="text-black font-black text-[10px] tracking-tight">FADE</span>
              </button>

              {/* LINHA 6 */}
              {/* Amarelo */}
              <button
                id="btn-lamp-b10"
                type="button"
                onClick={() => handleColorClick('light_color_b10', 'Amarelo', '#ffd60a')}
                title="Amarelo"
                className={`aspect-square rounded-full bg-[#ffd60a] border border-yellow-400 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.6)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b10'
                )}`}
              >
                {selectedColor === '#ffd60a' && power && (
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                )}
              </button>

              {/* Azul Marinho Escuro */}
              <button
                id="btn-lamp-b11"
                type="button"
                onClick={() => handleColorClick('light_color_b11', 'Azul Escuro', '#1a365d')}
                title="Azul Escuro"
                className={`aspect-square rounded-full bg-[#1a365d] border border-slate-800 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.2)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b11'
                )}`}
              >
                {selectedColor === '#1a365d' && power && (
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                )}
              </button>

              {/* Rosa / Pink */}
              <button
                id="btn-lamp-b12"
                type="button"
                onClick={() => handleColorClick('light_color_b12', 'Rosa', '#e64980')}
                title="Rosa"
                className={`aspect-square rounded-full bg-[#e64980] border border-pink-600 shadow-[0_2px_4px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_color_b12'
                )}`}
              >
                {selectedColor === '#e64980' && power && (
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                )}
              </button>

              {/* SMOOTH */}
              <button
                id="btn-lamp-smooth"
                type="button"
                onClick={() => handleEffectClick('light_smooth', 'SMOOTH')}
                title="Modo Smooth"
                className={`aspect-square rounded-full bg-[#9ca3af] border border-slate-400 shadow-[0_3px_5px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.6)] flex items-center justify-center transition-all active:scale-90 ${getButtonConfigRing(
                  'light_smooth'
                )}`}
              >
                <span className="text-black font-black text-[9px] tracking-tight">SMOOTH</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé do Controle Remoto com etiqueta em preto */}
        <div className="mt-4 text-center">
          <span className="text-[10px] font-black tracking-widest text-slate-900 uppercase">
            INFRARED 24-KEY CONTROLLER
          </span>
        </div>
      </div>
    </div>
  );
};
