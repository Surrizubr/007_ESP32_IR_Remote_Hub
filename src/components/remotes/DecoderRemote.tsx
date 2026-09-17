import React from 'react';
import {
  Power,
  Play,
  Pause,
  Square,
  Rewind,
  FastForward,
  RotateCcw,
  Home,
  Search,
  VolumeX,
  Undo2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { IRCommand } from '../../types';

interface DecoderRemoteProps {
  isLight: boolean;
  isConfigMode: boolean;
  getMappedCommand: (key: string) => IRCommand | undefined;
  onButtonClick: (key: string, label: string, onInteractiveUpdate?: () => void) => void;
}

export const DecoderRemote: React.FC<DecoderRemoteProps> = ({
  isConfigMode,
  onButtonClick,
}) => {
  // Button click helper
  const handlePress = (key: string, label: string) => {
    onButtonClick(key, label);
  };

  // Helper to determine button styling in config mode vs normal
  const getButtonStateClass = (key: string, baseClass: string, isLightBackgroundBtn = false) => {
    if (isConfigMode) {
      return `${baseClass} ring-2 ring-amber-400 border-amber-400 ${
        isLightBackgroundBtn ? 'bg-amber-100 text-amber-900' : 'bg-amber-900/80 text-amber-200'
      }`;
    }
    return baseClass;
  };

  return (
    <div className="w-full flex flex-col items-center justify-center animate-in fade-in duration-200">
      {/* CORPO DO CONTROLE REMOTO (FUNDO BRANCO ACETINADO) */}
      <div
        id="decoder-remote-casing"
        className="w-full max-w-[340px] rounded-[42px] p-4.5 pt-5 pb-6 flex flex-col items-center select-none shadow-[0_22px_45px_-8px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.06)] bg-gradient-to-b from-white via-slate-50 to-slate-100 border-2 border-slate-200/90 relative"
      >
        {/* Emissor IR no topo */}
        <div className="w-14 h-2 bg-gradient-to-r from-zinc-800 via-zinc-950 to-zinc-800 rounded-full mb-4 shadow-inner flex items-center justify-center">
          <div className="w-2.5 h-1 bg-rose-500/80 rounded-full blur-[0.5px]" />
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 1: TV (VERMELHO), LED INDICADOR, POWER (VERMELHO COM ÍCONE) */}
        {/* ========================================================================= */}
        <div className="w-full flex items-center justify-between px-2 mb-3.5">
          {/* Botão TV (Vermelho/Laranja circular com texto TV) */}
          <button
            id="btn-dec-tv"
            onClick={() => handlePress('dec_tv', 'TV Liga/Desliga')}
            className={getButtonStateClass(
              'dec_tv',
              'w-11 h-11 rounded-full bg-gradient-to-b from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 active:scale-95 text-white font-black text-xs flex items-center justify-center shadow-md shadow-red-600/30 border border-red-400/70 transition-all cursor-pointer'
            )}
            title="TV Liga/Desliga"
          >
            TV
          </button>

          {/* LED Indicador Central */}
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400/60 shadow-inner" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">
              DECODIFICADOR
            </span>
          </div>

          {/* Botão Power STB (Vermelho/Laranja circular com ícone Power) */}
          <button
            id="btn-dec-power"
            onClick={() => handlePress('dec_power', 'Power Decodificador')}
            className={getButtonStateClass(
              'dec_power',
              'w-11 h-11 rounded-full bg-gradient-to-b from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 active:scale-95 text-white flex items-center justify-center shadow-md shadow-red-600/30 border border-red-400/70 transition-all cursor-pointer'
            )}
            title="Ligar / Desligar Decodificador"
          >
            <Power className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 2: MÍDIA (REWIND <<, PLAY/PAUSE ▶||, FAST FORWARD >>) */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-3 gap-2 px-1 mb-2.5">
          <button
            id="btn-dec-rewind"
            onClick={() => handlePress('dec_rewind', 'Retroceder (<<)')}
            className={getButtonStateClass(
              'dec_rewind',
              'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
            )}
            title="Retroceder (<<)"
          >
            <Rewind className="w-5 h-5 fill-zinc-200" />
          </button>

          <button
            id="btn-dec-play-pause"
            onClick={() => handlePress('dec_play_pause', 'Play / Pause (▶||)')}
            className={getButtonStateClass(
              'dec_play_pause',
              'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all gap-1'
            )}
            title="Play / Pause (▶||)"
          >
            <Play className="w-4 h-4 fill-zinc-200" />
            <Pause className="w-4 h-4 fill-zinc-200" />
          </button>

          <button
            id="btn-dec-fast-forward"
            onClick={() => handlePress('dec_fast_forward', 'Avançar (>>)')}
            className={getButtonStateClass(
              'dec_fast_forward',
              'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
            )}
            title="Avançar (>>)"
          >
            <FastForward className="w-5 h-5 fill-zinc-200" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 3: REPLAY (↺), STOP (⏹), REC (Pílula Vermelha) */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-3 gap-2 px-1 mb-4">
          <button
            id="btn-dec-replay"
            onClick={() => handlePress('dec_replay', 'Replay / Voltar 10s (↺)')}
            className={getButtonStateClass(
              'dec_replay',
              'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
            )}
            title="Replay / Voltar 10s"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            id="btn-dec-stop"
            onClick={() => handlePress('dec_stop', 'Parar (Stop)')}
            className={getButtonStateClass(
              'dec_stop',
              'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
            )}
            title="Parar (Stop)"
          >
            <Square className="w-4 h-4 fill-zinc-200" />
          </button>

          <button
            id="btn-dec-rec"
            onClick={() => handlePress('dec_rec', 'Gravar (REC)')}
            className={getButtonStateClass(
              'dec_rec',
              'h-10 rounded-xl bg-gradient-to-b from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 active:scale-95 text-white font-black text-xs flex items-center justify-center shadow-sm shadow-red-600/30 border border-red-500/80 transition-all'
            )}
            title="Gravar (REC)"
          >
            REC
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO INTERMEDIÁRIA: ROCKER VOLUME, HOME/SEARCH, ROCKER CANAL */}
        {/* ========================================================================= */}
        <div className="w-full flex items-center justify-between gap-3 px-2 mb-3">
          {/* Rocker Esquerdo: VOLUME (+ / Rampa / -) */}
          <div
            id="rocker-dec-volume"
            className="flex flex-col items-center w-14 h-28 rounded-2xl bg-zinc-800 p-1 border border-zinc-700/90 shadow-md justify-between"
          >
            <button
              id="btn-dec-vol-plus"
              onClick={() => handlePress('dec_vol_plus', 'Volume +')}
              className={getButtonStateClass(
                'dec_vol_plus',
                'w-full h-10 rounded-t-xl flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/80 active:scale-95 transition-all'
              )}
              title="Aumentar Volume"
            >
              <ChevronUp className="w-5 h-5 stroke-[3]" />
            </button>

            {/* Ícone de Rampa de Volume (Fiel à foto original) */}
            <div className="flex items-center justify-center pointer-events-none my-0.5">
              <svg className="w-4 h-3 text-zinc-400" viewBox="0 0 16 12" fill="currentColor">
                <polygon points="0,11 16,11 16,1" />
              </svg>
            </div>

            <button
              id="btn-dec-vol-minus"
              onClick={() => handlePress('dec_vol_minus', 'Volume -')}
              className={getButtonStateClass(
                'dec_vol_minus',
                'w-full h-10 rounded-b-xl flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/80 active:scale-95 transition-all'
              )}
              title="Diminuir Volume"
            >
              <ChevronDown className="w-5 h-5 stroke-[3]" />
            </button>
          </div>

          {/* Coluna Central: Botões Circulares HOME e BUSCA */}
          <div className="flex flex-col items-center justify-between h-28 py-0.5">
            <button
              id="btn-dec-home"
              onClick={() => handlePress('dec_home', 'Início (Home)')}
              className={getButtonStateClass(
                'dec_home',
                'w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
              )}
              title="Início (Home)"
            >
              <Home className="w-5 h-5" />
            </button>

            <button
              id="btn-dec-search"
              onClick={() => handlePress('dec_search', 'Pesquisa / Busca')}
              className={getButtonStateClass(
                'dec_search',
                'w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
              )}
              title="Pesquisar Programas"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Rocker Direito: CANAL (CH+ / CH / CH-) */}
          <div
            id="rocker-dec-channel"
            className="flex flex-col items-center w-14 h-28 rounded-2xl bg-zinc-800 p-1 border border-zinc-700/90 shadow-md justify-between"
          >
            <button
              id="btn-dec-ch-plus"
              onClick={() => handlePress('dec_ch_plus', 'Canal +')}
              className={getButtonStateClass(
                'dec_ch_plus',
                'w-full h-10 rounded-t-xl flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/80 active:scale-95 transition-all'
              )}
              title="Próximo Canal"
            >
              <ChevronUp className="w-5 h-5 stroke-[3]" />
            </button>

            <span className="text-[10px] font-black text-zinc-300 tracking-wider my-0.5 pointer-events-none">
              CH
            </span>

            <button
              id="btn-dec-ch-minus"
              onClick={() => handlePress('dec_ch_minus', 'Canal -')}
              className={getButtonStateClass(
                'dec_ch_minus',
                'w-full h-10 rounded-b-xl flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/80 active:scale-95 transition-all'
              )}
              title="Canal Anterior"
            >
              <ChevronDown className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA: MUDO (ESQ) & VOLTAR (DIR) */}
        {/* ========================================================================= */}
        <div className="w-full flex items-center justify-between px-3 mb-2.5">
          <button
            id="btn-dec-mute"
            onClick={() => handlePress('dec_mute', 'Mudo (Mute)')}
            className={getButtonStateClass(
              'dec_mute',
              'w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
            )}
            title="Silenciar Áudio (Mudo)"
          >
            <VolumeX className="w-5 h-5" />
          </button>

          <button
            id="btn-dec-back"
            onClick={() => handlePress('dec_back', 'Voltar (Retornar)')}
            className={getButtonStateClass(
              'dec_back',
              'w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
            )}
            title="Voltar"
          >
            <Undo2 className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* D-PAD CLUSTER CIRCULAR (CIMA, BAIXO, ESQUERDA, DIREITA, OK NO CENTRO) */}
        {/* ========================================================================= */}
        <div className="w-full flex items-center justify-center my-2">
          <div
            id="dpad-dec-cluster"
            className="relative w-48 h-48 rounded-full bg-zinc-800 p-2 border-2 border-zinc-700/80 shadow-lg flex items-center justify-center"
          >
            {/* Cima */}
            <button
              id="btn-dec-dpad-up"
              onClick={() => handlePress('dec_dpad_up', 'Navegação Cima')}
              className={getButtonStateClass(
                'dec_dpad_up',
                'absolute top-1.5 w-18 h-12 rounded-t-full flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/70 active:scale-95 transition-all'
              )}
              title="Para Cima"
            >
              <ChevronUp className="w-6 h-6 stroke-[3]" />
            </button>

            {/* Esquerda */}
            <button
              id="btn-dec-dpad-left"
              onClick={() => handlePress('dec_dpad_left', 'Navegação Esquerda')}
              className={getButtonStateClass(
                'dec_dpad_left',
                'absolute left-1.5 w-12 h-18 rounded-l-full flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/70 active:scale-95 transition-all'
              )}
              title="Para Esquerda"
            >
              <ChevronLeft className="w-6 h-6 stroke-[3]" />
            </button>

            {/* Centro: OK */}
            <button
              id="btn-dec-dpad-ok"
              onClick={() => handlePress('dec_dpad_ok', 'Confirmar (OK)')}
              className={getButtonStateClass(
                'dec_dpad_ok',
                'w-16 h-16 rounded-full bg-zinc-850 hover:bg-zinc-750 active:scale-90 text-white font-extrabold text-sm flex items-center justify-center shadow-md border-2 border-zinc-700/90 transition-all z-10'
              )}
              title="Confirmar (OK)"
            >
              OK
            </button>

            {/* Direita */}
            <button
              id="btn-dec-dpad-right"
              onClick={() => handlePress('dec_dpad_right', 'Navegação Direita')}
              className={getButtonStateClass(
                'dec_dpad_right',
                'absolute right-1.5 w-12 h-18 rounded-r-full flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/70 active:scale-95 transition-all'
              )}
              title="Para Direita"
            >
              <ChevronRight className="w-6 h-6 stroke-[3]" />
            </button>

            {/* Baixo */}
            <button
              id="btn-dec-dpad-down"
              onClick={() => handlePress('dec_dpad_down', 'Navegação Baixo')}
              className={getButtonStateClass(
                'dec_dpad_down',
                'absolute bottom-1.5 w-18 h-12 rounded-b-full flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/70 active:scale-95 transition-all'
              )}
              title="Para Baixo"
            >
              <ChevronDown className="w-6 h-6 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA: SAIR (ESQ) & GUIA (DIR) */}
        {/* ========================================================================= */}
        <div className="w-full flex items-center justify-between px-3 mt-1 mb-3">
          <button
            id="btn-dec-exit"
            onClick={() => handlePress('dec_exit', 'Sair (Exit)')}
            className={getButtonStateClass(
              'dec_exit',
              'w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-extrabold text-[10px] flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
            )}
            title="Sair (Exit)"
          >
            SAIR
          </button>

          <button
            id="btn-dec-guide"
            onClick={() => handlePress('dec_guide', 'Guia de Programação (GUIA)')}
            className={getButtonStateClass(
              'dec_guide',
              'w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-extrabold text-[10px] flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
            )}
            title="Guia de Programação (GUIA)"
          >
            GUIA
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA: MÚSICA, BOTÃO AZUL "NOW", AGORA */}
        {/* ========================================================================= */}
        <div className="w-full flex items-center justify-between px-3 mb-3.5">
          {/* MÚSICA */}
          <div className="flex flex-col items-center">
            <button
              id="btn-dec-music"
              onClick={() => handlePress('dec_music', 'Música')}
              className={getButtonStateClass(
                'dec_music',
                'w-11 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
              )}
              title="Música"
            >
              <div className="w-3 h-3 rounded-full bg-zinc-600" />
            </button>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mt-1">
              MÚSICA
            </span>
          </div>

          {/* Destaque Central: Botão Azul "now" */}
          <button
            id="btn-dec-now"
            onClick={() => handlePress('dec_now', 'Portal Claro NOW')}
            className={getButtonStateClass(
              'dec_now',
              'w-15 h-15 rounded-full bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 hover:from-sky-300 hover:to-blue-500 active:scale-95 text-white font-black text-lg tracking-tight flex items-center justify-center shadow-lg shadow-sky-500/40 border-2 border-sky-300/80 transition-all cursor-pointer'
            )}
            title="NOW On Demand"
          >
            now
          </button>

          {/* AGORA */}
          <div className="flex flex-col items-center">
            <button
              id="btn-dec-agora"
              onClick={() => handlePress('dec_agora', 'Agora (Programação ao Vivo)')}
              className={getButtonStateClass(
                'dec_agora',
                'w-11 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all'
              )}
              title="Programação Agora"
            >
              <div className="w-3 h-3 rounded-full bg-zinc-600" />
            </button>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mt-1">
              AGORA
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA DE TECLAS COLORIDAS (VERMELHO/INFO, VERDE/ÁUDIO, AMARELO/LEGENDA, AZUL/OPÇÕES) */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-4 gap-1.5 px-1 mb-4">
          {/* Vermelho: INFO */}
          <div className="flex flex-col items-center">
            <button
              id="btn-dec-color-red"
              onClick={() => handlePress('dec_color_red', 'Tecla Vermelha (Info)')}
              className={getButtonStateClass(
                'dec_color_red',
                'w-10 h-10 rounded-full bg-zinc-850 hover:bg-zinc-800 active:scale-95 border-3 border-red-500 flex items-center justify-center shadow-sm transition-all'
              )}
              title="Tecla Vermelha / Informações"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            </button>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mt-1">
              INFO
            </span>
          </div>

          {/* Verde: ÁUDIO */}
          <div className="flex flex-col items-center">
            <button
              id="btn-dec-color-green"
              onClick={() => handlePress('dec_color_green', 'Tecla Verde (Áudio)')}
              className={getButtonStateClass(
                'dec_color_green',
                'w-10 h-10 rounded-full bg-zinc-850 hover:bg-zinc-800 active:scale-95 border-3 border-emerald-500 flex items-center justify-center shadow-sm transition-all'
              )}
              title="Tecla Verde / Áudio"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </button>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mt-1">
              ÁUDIO
            </span>
          </div>

          {/* Amarelo: LEGENDA */}
          <div className="flex flex-col items-center">
            <button
              id="btn-dec-color-yellow"
              onClick={() => handlePress('dec_color_yellow', 'Tecla Amarela (Legenda)')}
              className={getButtonStateClass(
                'dec_color_yellow',
                'w-10 h-10 rounded-full bg-zinc-850 hover:bg-zinc-800 active:scale-95 border-3 border-yellow-400 flex items-center justify-center shadow-sm transition-all'
              )}
              title="Tecla Amarela / Legenda"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            </button>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mt-1">
              LEGENDA
            </span>
          </div>

          {/* Azul: OPÇÕES */}
          <div className="flex flex-col items-center">
            <button
              id="btn-dec-color-blue"
              onClick={() => handlePress('dec_color_blue', 'Tecla Azul (Opções)')}
              className={getButtonStateClass(
                'dec_color_blue',
                'w-10 h-10 rounded-full bg-zinc-850 hover:bg-zinc-800 active:scale-95 border-3 border-sky-500 flex items-center justify-center shadow-sm transition-all'
              )}
              title="Tecla Azul / Opções"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            </button>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mt-1">
              OPÇÕES
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TECLADO NUMÉRICO (1 A 9, FAV-, 0, FAV+) */}
        {/* ========================================================================= */}
        <div className="w-full bg-slate-200/50 p-2 rounded-2xl border border-slate-300/60 shadow-inner">
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, sub: '.?@' },
              { num: 2, sub: 'ABC' },
              { num: 3, sub: 'DEF' },
              { num: 4, sub: 'GHI' },
              { num: 5, sub: 'JKL' },
              { num: 6, sub: 'MNO' },
              { num: 7, sub: 'PQRS' },
              { num: 8, sub: 'TUV' },
              { num: 9, sub: 'WXYZ' },
            ].map(({ num, sub }) => (
              <button
                key={num}
                id={`btn-dec-num-${num}`}
                onClick={() => handlePress(`dec_num_${num}`, `Dígito ${num}`)}
                className={getButtonStateClass(
                  `dec_num_${num}`,
                  'h-12 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-white flex flex-col items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
                )}
              >
                <span className="font-extrabold text-base leading-none">{num}</span>
                <span className="text-[8px] font-bold text-zinc-400 mt-0.5 tracking-tighter">
                  {sub}
                </span>
              </button>
            ))}

            {/* FAV- */}
            <button
              id="btn-dec-fav-minus"
              onClick={() => handlePress('dec_fav_minus', 'Favoritos Anterior (FAV-)')}
              className={getButtonStateClass(
                'dec_fav_minus',
                'h-12 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-extrabold text-xs flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
              )}
              title="Favoritos Anterior (FAV-)"
            >
              FAV-
            </button>

            {/* Dígito 0 */}
            <button
              id="btn-dec-num-0"
              onClick={() => handlePress('dec_num_0', 'Dígito 0')}
              className={getButtonStateClass(
                'dec_num_0',
                'h-12 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-white flex flex-col items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
              )}
            >
              <span className="font-extrabold text-base leading-none">0</span>
              <span className="text-[9px] font-bold text-zinc-400 mt-0.5">_</span>
            </button>

            {/* FAV+ */}
            <button
              id="btn-dec-fav-plus"
              onClick={() => handlePress('dec_fav_plus', 'Favoritos Próximo (FAV+)')}
              className={getButtonStateClass(
                'dec_fav_plus',
                'h-12 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-extrabold text-xs flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
              )}
              title="Favoritos Próximo (FAV+)"
            >
              FAV+
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
