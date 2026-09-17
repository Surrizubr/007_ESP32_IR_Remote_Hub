import React from 'react';
import {
  Power,
  VolumeX,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { IRCommand } from '../../types';

interface AmplifierRemoteProps {
  isLight: boolean;
  isConfigMode: boolean;
  getMappedCommand: (key: string) => IRCommand | undefined;
  onButtonClick: (key: string, label: string, onInteractiveUpdate?: () => void) => void;
}

export const AmplifierRemote: React.FC<AmplifierRemoteProps> = ({
  isConfigMode,
  onButtonClick,
}) => {
  const handlePress = (key: string, label: string) => {
    onButtonClick(key, label);
  };

  const getButtonStateClass = (key: string, baseClass: string) => {
    if (isConfigMode) {
      return `${baseClass} ring-2 ring-amber-500 border-amber-500 bg-amber-50 text-amber-950`;
    }
    return baseClass;
  };

  // Standard tactile white circular button with black text/icons
  const buttonBaseClass =
    'w-14 h-14 rounded-full bg-white hover:bg-slate-100 active:scale-95 text-black flex items-center justify-center shadow-[0_3px_6px_rgba(0,0,0,0.18),inset_0_1px_2px_rgba(255,255,255,0.9),inset_0_-2px_3px_rgba(0,0,0,0.08)] border-2 border-slate-300 transition-all cursor-pointer';

  return (
    <div className="w-full flex flex-col items-center justify-center animate-in fade-in duration-200">
      {/* CORPO DO CONTROLE REMOTO (FUNDO BRANCO ACETINADO) */}
      <div
        id="amplifier-remote-casing"
        className="w-full max-w-[320px] rounded-[38px] p-5 pt-5 pb-6 flex flex-col items-center select-none shadow-[0_22px_45px_-8px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.06)] bg-gradient-to-b from-white via-slate-50 to-slate-100 border-2 border-slate-200/90 relative"
      >
        {/* Emissor IR no topo */}
        <div className="w-12 h-2 bg-gradient-to-r from-zinc-800 via-zinc-950 to-zinc-800 rounded-full mb-3 shadow-inner flex items-center justify-center">
          <div className="w-2.5 h-1 bg-rose-500/80 rounded-full blur-[0.5px]" />
        </div>

        {/* Título com alto contraste em preto */}
        <div className="flex flex-col items-center mb-4">
          <span className="text-xs font-black uppercase tracking-widest text-black">
            AMPLIFICADOR DE SOM
          </span>
          <span className="text-[9px] font-extrabold tracking-wider text-slate-800 block mt-0.5">
            SURROUND 5.1 / 2.1
          </span>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 1: POWER (VERMELHO), MUDO (ALTO-FALANTE), 5.1/2.1 */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-3 gap-3.5 px-1 mb-4">
          {/* Botão Power */}
          <div className="flex justify-center">
            <button
              id="btn-amp-power"
              onClick={() => handlePress('amp_power', 'Power Ligar/Desligar')}
              className={getButtonStateClass(
                'amp_power',
                'w-14 h-14 rounded-full bg-white hover:bg-rose-50 active:scale-95 text-rose-600 flex items-center justify-center shadow-[0_3px_6px_rgba(0,0,0,0.18),inset_0_1px_2px_rgba(255,255,255,0.9),inset_0_-2px_3px_rgba(0,0,0,0.08)] border-2 border-rose-300 transition-all cursor-pointer'
              )}
              title="Ligar / Desligar (Power)"
            >
              <Power className="w-6 h-6 stroke-[3]" />
            </button>
          </div>

          {/* Botão Mudo (Ícone Alto-falante com X em Preto) */}
          <div className="flex justify-center">
            <button
              id="btn-amp-mute"
              onClick={() => handlePress('amp_mute', 'Mudo (Mute)')}
              className={getButtonStateClass('amp_mute', buttonBaseClass)}
              title="Silenciar Áudio (Mudo)"
            >
              <VolumeX className="w-6 h-6 text-black stroke-[2.5]" />
            </button>
          </div>

          {/* Botão 5.1 / 2.1 (Letras Pretas) */}
          <div className="flex justify-center">
            <button
              id="btn-amp-surround"
              onClick={() => handlePress('amp_mode_surround', 'Modo Surround 5.1 / 2.1')}
              className={getButtonStateClass(
                'amp_mode_surround',
                `${buttonBaseClass} flex-col`
              )}
              title="Alternar Canais 5.1 / 2.1"
            >
              <div className="flex flex-col items-center leading-none">
                <span className="font-black text-xs text-black">5.1</span>
                <div className="w-5 h-[2px] bg-black my-0.5" />
                <span className="font-black text-xs text-black">2.1</span>
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 2: - VOL, CHANNEL LEVEL, + VOL */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-3 gap-3.5 px-1 mb-4">
          {/* - VOL (Letras Pretas) */}
          <div className="flex justify-center">
            <button
              id="btn-amp-vol-down"
              onClick={() => handlePress('amp_vol_down', 'Volume -')}
              className={getButtonStateClass(
                'amp_vol_down',
                `${buttonBaseClass} flex-col`
              )}
              title="Diminuir Volume (- VOL)"
            >
              <span className="text-base font-black leading-none mb-0.5 text-black">-</span>
              <span className="text-[11px] font-black tracking-wider leading-none text-black">VOL</span>
            </button>
          </div>

          {/* CHANNEL LEVEL (Letras Pretas) */}
          <div className="flex justify-center">
            <button
              id="btn-amp-channel-level"
              onClick={() => handlePress('amp_channel_level', 'Nível dos Canais (Channel Level)')}
              className={getButtonStateClass('amp_channel_level', `${buttonBaseClass} p-1`)}
              title="Ajuste de Canais (Channel Level)"
            >
              <span className="text-[9px] font-black uppercase tracking-tighter leading-tight text-center text-black">
                CHANNEL<br />LEVEL
              </span>
            </button>
          </div>

          {/* + VOL (Letras Pretas) */}
          <div className="flex justify-center">
            <button
              id="btn-amp-vol-up"
              onClick={() => handlePress('amp_vol_up', 'Volume +')}
              className={getButtonStateClass(
                'amp_vol_up',
                `${buttonBaseClass} flex-col`
              )}
              title="Aumentar Volume (+ VOL)"
            >
              <span className="text-base font-black leading-none mb-0.5 text-black">+</span>
              <span className="text-[11px] font-black tracking-wider leading-none text-black">VOL</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 3: AUX, (ESPAÇO VAZIO), RCA */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-3 gap-3.5 px-1 mb-4">
          {/* AUX (Letras Pretas) */}
          <div className="flex justify-center">
            <button
              id="btn-amp-aux"
              onClick={() => handlePress('amp_aux', 'Entrada Auxiliar (AUX)')}
              className={getButtonStateClass('amp_aux', buttonBaseClass)}
              title="Entrada Auxiliar (AUX)"
            >
              <span className="font-black text-xs tracking-wider text-black">AUX</span>
            </button>
          </div>

          {/* Centro Vazio (fiel à carcaça original) */}
          <div className="w-14 h-14" />

          {/* RCA (Letras Pretas) */}
          <div className="flex justify-center">
            <button
              id="btn-amp-rca"
              onClick={() => handlePress('amp_rca', 'Entrada RCA')}
              className={getButtonStateClass('amp_rca', buttonBaseClass)}
              title="Entrada Linha (RCA)"
            >
              <span className="font-black text-xs tracking-wider text-black">RCA</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 4: FM RADIO, BLUETOOTH, SD/USB */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-3 gap-3.5 px-1 mb-4">
          {/* FM RADIO (Letras Pretas) */}
          <div className="flex justify-center">
            <button
              id="btn-amp-fm"
              onClick={() => handlePress('amp_fm', 'Rádio FM')}
              className={getButtonStateClass('amp_fm', `${buttonBaseClass} p-1`)}
              title="Rádio FM"
            >
              <span className="text-[9px] font-black uppercase tracking-tighter leading-tight text-center text-black">
                FM<br />RADIO
              </span>
            </button>
          </div>

          {/* Bluetooth (Ícone Preto) */}
          <div className="flex justify-center">
            <button
              id="btn-amp-bt"
              onClick={() => handlePress('amp_bt', 'Bluetooth')}
              className={getButtonStateClass('amp_bt', buttonBaseClass)}
              title="Bluetooth"
            >
              <svg
                className="w-6 h-6 text-black fill-none stroke-current"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m7 7 10 10-5 5V2l5 5L7 17" />
              </svg>
            </button>
          </div>

          {/* SD / USB (Letras Pretas) */}
          <div className="flex justify-center">
            <button
              id="btn-amp-sd-usb"
              onClick={() => handlePress('amp_sd_usb', 'Cartão SD / Pendrive USB')}
              className={getButtonStateClass(
                'amp_sd_usb',
                `${buttonBaseClass} flex-col`
              )}
              title="Cartão SD / Pendrive USB"
            >
              <div className="flex flex-col items-center leading-none">
                <span className="font-black text-[10px] text-black">SD</span>
                <div className="w-5 h-[2px] bg-black my-0.5" />
                <span className="font-black text-[10px] text-black">USB</span>
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 5: ANTERIOR / TUNE-, PLAY/PAUSE / SCAN, PRÓXIMO / TUNE+ */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-3 gap-3.5 px-1">
          {/* |<< TUNE- */}
          <div className="flex flex-col items-center">
            <button
              id="btn-amp-prev"
              onClick={() => handlePress('amp_prev', 'Faixa Anterior / TUNE-')}
              className={getButtonStateClass('amp_prev', buttonBaseClass)}
              title="Faixa Anterior / TUNE-"
            >
              <SkipBack className="w-5 h-5 text-black fill-black" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-wider text-black mt-1.5">
              TUNE-
            </span>
          </div>

          {/* ▶|| SCAN */}
          <div className="flex flex-col items-center">
            <button
              id="btn-amp-play-pause"
              onClick={() => handlePress('amp_play_pause', 'Play/Pause / SCAN')}
              className={getButtonStateClass('amp_play_pause', `${buttonBaseClass} gap-0.5`)}
              title="Play / Pause / SCAN"
            >
              <Play className="w-4 h-4 text-black fill-black" />
              <Pause className="w-4 h-4 text-black fill-black" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-wider text-black mt-1.5">
              SCAN
            </span>
          </div>

          {/* >>| TUNE+ */}
          <div className="flex flex-col items-center">
            <button
              id="btn-amp-next"
              onClick={() => handlePress('amp_next', 'Próxima Faixa / TUNE+')}
              className={getButtonStateClass('amp_next', buttonBaseClass)}
              title="Próxima Faixa / TUNE+"
            >
              <SkipForward className="w-5 h-5 text-black fill-black" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-wider text-black mt-1.5">
              TUNE+
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
