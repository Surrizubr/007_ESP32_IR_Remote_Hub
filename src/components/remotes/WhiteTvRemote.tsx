import React from 'react';
import {
  Power,
  Settings,
  Search,
  LogIn,
  Home,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Info,
  VolumeX,
  Play,
  Pause,
  Square,
  Rewind,
  FastForward,
} from 'lucide-react';
import { IRCommand } from '../../types';

interface WhiteTvRemoteProps {
  isLight: boolean;
  isConfigMode: boolean;
  getMappedCommand: (key: string) => IRCommand | undefined;
  onButtonClick: (key: string, label: string, onInteractiveUpdate?: () => void) => void;
}

export const WhiteTvRemote: React.FC<WhiteTvRemoteProps> = ({
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
        id="white-tv-remote-casing"
        className="w-full max-w-[340px] rounded-[42px] p-4.5 pt-5 pb-6 flex flex-col items-center select-none shadow-[0_22px_45px_-8px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.06)] bg-gradient-to-b from-white via-slate-50 to-slate-100 border-2 border-slate-200/90 relative"
      >
        {/* Emissor IR no topo */}
        <div className="w-14 h-2 bg-gradient-to-r from-zinc-800 via-zinc-950 to-zinc-800 rounded-full mb-4 shadow-inner flex items-center justify-center">
          <div className="w-2.5 h-1 bg-rose-500/80 rounded-full blur-[0.5px]" />
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 1: POWER & TV */}
        {/* ========================================================================= */}
        <div className="w-full flex items-center justify-between px-2 mb-3">
          {/* Botão Power Laranja (Destaque fiel ao controle LG) */}
          <button
            id="btn-tvw-power"
            onClick={() => handlePress('tv_white_power', 'Power Ligar/Desligar')}
            className={getButtonStateClass(
              'tv_white_power',
              'w-11 h-11 rounded-full bg-gradient-to-b from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-orange-500/40 border border-orange-400/80 transition-all cursor-pointer'
            )}
            title="Ligar / Desligar (Power)"
          >
            <Power className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Logo sutil */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              SMART TV
            </span>
          </div>

          {/* Botão TV */}
          <button
            id="btn-tvw-tv"
            onClick={() => handlePress('tv_white_tv', 'Modo TV')}
            className={getButtonStateClass(
              'tv_white_tv',
              'px-3.5 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-100 font-black text-xs flex items-center justify-center shadow-sm border border-zinc-700/80 transition-all cursor-pointer'
            )}
            title="Entrada de Televisão (TV)"
          >
            TV
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 2: CC/SUB, CONFIGURAÇÕES (GEAR), BUSCA, ENTRADA (SOURCE) */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-4 gap-2 mb-3">
          <button
            id="btn-tvw-cc"
            onClick={() => handlePress('tv_white_cc', 'CC / Legendas')}
            className={getButtonStateClass(
              'tv_white_cc',
              'h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold text-[10px] flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="Closed Caption / Subtitle"
          >
            CC/SUB
          </button>

          <button
            id="btn-tvw-settings"
            onClick={() => handlePress('tv_white_settings', 'Configurações (Gear)')}
            className={getButtonStateClass(
              'tv_white_settings',
              'h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="Configurações Rápidas"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            id="btn-tvw-search"
            onClick={() => handlePress('tv_white_search', 'Busca')}
            className={getButtonStateClass(
              'tv_white_search',
              'h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="Pesquisa"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            id="btn-tvw-src"
            onClick={() => handlePress('tv_white_src', 'Entrada / Source')}
            className={getButtonStateClass(
              'tv_white_src',
              'h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="Entrada / Source"
          >
            <LogIn className="w-4 h-4 rotate-90" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRAS 3, 4, 5, 6: TECLADO NUMÉRICO (1 A 9, LIST, 0, Q.VIEW) */}
        {/* ========================================================================= */}
        <div className="w-full bg-slate-200/50 p-2 rounded-2xl border border-slate-300/60 mb-3 shadow-inner">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                id={`btn-tvw-num-${num}`}
                onClick={() => handlePress(`tv_white_num_${num}`, `Dígito ${num}`)}
                className={getButtonStateClass(
                  `tv_white_num_${num}`,
                  'h-11 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-white font-extrabold text-base flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
                )}
              >
                {num}
              </button>
            ))}

            {/* LIST (com traço superior) */}
            <button
              id="btn-tvw-list"
              onClick={() => handlePress('tv_white_list', 'Lista de Canais (List)')}
              className={getButtonStateClass(
                'tv_white_list',
                'h-11 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold text-xs flex flex-col items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
              )}
              title="Lista de Canais"
            >
              <div className="w-5 h-[2px] bg-zinc-400 mb-0.5 rounded-full" />
              <span>LIST</span>
            </button>

            {/* Dígito 0 */}
            <button
              id="btn-tvw-num-0"
              onClick={() => handlePress('tv_white_num_0', 'Dígito 0')}
              className={getButtonStateClass(
                'tv_white_num_0',
                'h-11 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-white font-extrabold text-base flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
              )}
            >
              0
            </button>

            {/* Q.VIEW (Quick View) */}
            <button
              id="btn-tvw-qview"
              onClick={() => handlePress('tv_white_qview', 'Quick View (Q.View)')}
              className={getButtonStateClass(
                'tv_white_qview',
                'h-11 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold text-xs flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
              )}
              title="Visualização Rápida (Canal Anterior)"
            >
              Q.VIEW
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 7: QUICK ACCESS / FAV */}
        {/* ========================================================================= */}
        <div className="w-full flex flex-col items-center mb-3">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">
            QUICK ACCESS
          </span>
          <button
            id="btn-tvw-fav"
            onClick={() => handlePress('tv_white_fav', 'Favoritos (FAV)')}
            className={getButtonStateClass(
              'tv_white_fav',
              'px-6 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold text-xs shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="Acesso Rápido a Favoritos"
          >
            FAV
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 8: ROCKER VOLUME (ESQ), INFO/MUTE (CENTRO), ROCKER CANAL (DIR) */}
        {/* ========================================================================= */}
        <div className="w-full flex items-center justify-between gap-2.5 mb-3.5 px-1">
          {/* Rocker Esquerdo: VOLUME (+ / VOL / -) */}
          <div
            id="rocker-tvw-volume"
            className="flex flex-col items-center w-14 rounded-2xl bg-zinc-800 p-1 border border-zinc-700/90 shadow-md"
          >
            <button
              id="btn-tvw-vol-plus"
              onClick={() => handlePress('tv_white_vol_plus', 'Volume +')}
              className={getButtonStateClass(
                'tv_white_vol_plus',
                'w-full h-11 rounded-t-xl flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/80 active:scale-95 transition-all'
              )}
              title="Aumentar Volume"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="text-[10px] font-black text-zinc-400 tracking-wider my-0.5">
              VOL
            </div>
            <button
              id="btn-tvw-vol-minus"
              onClick={() => handlePress('tv_white_vol_minus', 'Volume -')}
              className={getButtonStateClass(
                'tv_white_vol_minus',
                'w-full h-11 rounded-b-xl flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/80 active:scale-95 transition-all'
              )}
              title="Diminuir Volume"
            >
              <Minus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Coluna Central: INFO & MUTE */}
          <div className="flex flex-col items-center justify-center gap-2.5">
            {/* ⓘ INFO */}
            <button
              id="btn-tvw-info"
              onClick={() => handlePress('tv_white_info', 'Informações (INFO)')}
              className={getButtonStateClass(
                'tv_white_info',
                'w-20 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1 shadow-sm border border-zinc-700/70 transition-all'
              )}
              title="Informações do Programa (INFO)"
            >
              <Info className="w-3.5 h-3.5" />
              <span>INFO</span>
            </button>

            {/* MUTE (🔇) */}
            <button
              id="btn-tvw-mute"
              onClick={() => handlePress('tv_white_mute', 'Mudo')}
              className={getButtonStateClass(
                'tv_white_mute',
                'w-20 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
              )}
              title="Silenciar Áudio (Mudo)"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          </div>

          {/* Rocker Direito: CANAL (∧ / CH PAGE / ∨) */}
          <div
            id="rocker-tvw-ch"
            className="flex flex-col items-center w-14 rounded-2xl bg-zinc-800 p-1 border border-zinc-700/90 shadow-md"
          >
            <button
              id="btn-tvw-ch-plus"
              onClick={() => handlePress('tv_white_ch_plus', 'Canal +')}
              className={getButtonStateClass(
                'tv_white_ch_plus',
                'w-full h-11 rounded-t-xl flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/80 active:scale-95 transition-all'
              )}
              title="Próximo Canal"
            >
              <ChevronUp className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="flex flex-col items-center my-0.5">
              <span className="text-[10px] font-black text-zinc-300 leading-tight">CH</span>
              <span className="text-[7px] font-bold text-zinc-500 tracking-tighter">PAGE</span>
            </div>
            <button
              id="btn-tvw-ch-minus"
              onClick={() => handlePress('tv_white_ch_minus', 'Canal -')}
              className={getButtonStateClass(
                'tv_white_ch_minus',
                'w-full h-11 rounded-b-xl flex items-center justify-center text-zinc-200 hover:text-white hover:bg-zinc-700/80 active:scale-95 transition-all'
              )}
              title="Canal Anterior"
            >
              <ChevronDown className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 9: STREAMING APPS & HOME (NETFLIX, HOME, AMAZON) */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-3 gap-2.5 mb-3.5 px-0.5">
          {/* NETFLIX (Botão branco com escrita vermelha clássica) */}
          <button
            id="btn-tvw-netflix"
            onClick={() => handlePress('tv_white_netflix', 'Netflix')}
            className={getButtonStateClass(
              'tv_white_netflix',
              'h-11 rounded-xl bg-white hover:bg-zinc-50 active:scale-95 text-[#E50914] font-black text-[11px] tracking-wider flex items-center justify-center shadow-md border border-slate-300 transition-all cursor-pointer',
              true
            )}
            title="Abrir Netflix"
          >
            NETFLIX
          </button>

          {/* HOME (🏠 Ícone de casinha) */}
          <button
            id="btn-tvw-home"
            onClick={() => handlePress('tv_white_home', 'Início (Home)')}
            className={getButtonStateClass(
              'tv_white_home',
              'h-11 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-white flex items-center justify-center shadow-md border border-zinc-700 transition-all cursor-pointer'
            )}
            title="Tela Inicial (Home)"
          >
            <Home className="w-5 h-5" />
          </button>

          {/* AMAZON PRIME VIDEO (Botão branco com estilo característico) */}
          <button
            id="btn-tvw-amazon"
            onClick={() => handlePress('tv_white_amazon', 'Amazon Prime')}
            className={getButtonStateClass(
              'tv_white_amazon',
              'h-11 rounded-xl bg-white hover:bg-zinc-50 active:scale-95 text-zinc-900 font-bold text-xs flex flex-col items-center justify-center shadow-md border border-slate-300 transition-all leading-none cursor-pointer',
              true
            )}
            title="Abrir Amazon Prime Video"
          >
            <div className="flex items-center text-[11px] font-black tracking-tight">
              <span>amazon</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 ml-0.5" />
            </div>
            <div className="w-5 h-[2px] bg-amber-500 rounded-full mt-0.5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRAS 10, 11, 12: NAVEGAÇÃO D-PAD & TECLAS DE CONTEXTO */}
        {/* ========================================================================= */}
        <div className="w-full bg-slate-200/50 p-2.5 rounded-3xl border border-slate-300/60 mb-3.5 shadow-inner">
          {/* Linha Superior: GUIDE • ▲ (Cima) • LIVE ZOOM */}
          <div className="grid grid-cols-3 gap-2 mb-2 items-center">
            <button
              id="btn-tvw-guide"
              onClick={() => handlePress('tv_white_guide', 'Guia de Programação (Guide)')}
              className={getButtonStateClass(
                'tv_white_guide',
                'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold text-[10px] flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
              )}
              title="Guia de Canais (EPG)"
            >
              GUIDE
            </button>

            {/* D-Pad UP */}
            <button
              id="btn-tvw-dpad-up"
              onClick={() => handlePress('tv_white_dpad_up', 'Direcional Cima')}
              className={getButtonStateClass(
                'tv_white_dpad_up',
                'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-white flex items-center justify-center shadow-md border border-zinc-700 transition-all'
              )}
              title="Navegar para Cima"
            >
              <div className="w-0 h-0 border-x-[7px] border-x-transparent border-b-[10px] border-b-white" />
            </button>

            <button
              id="btn-tvw-live-zoom"
              onClick={() => handlePress('tv_white_live_zoom', 'Live Zoom')}
              className={getButtonStateClass(
                'tv_white_live_zoom',
                'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold text-[9px] flex flex-col items-center justify-center leading-tight shadow-sm border border-zinc-700/70 transition-all'
              )}
              title="Live Zoom"
            >
              <span>LIVE</span>
              <span>ZOOM</span>
            </button>
          </div>

          {/* Linha Central: ◀ (Esquerda) • ◎ OK • ▶ (Direita) */}
          <div className="grid grid-cols-3 gap-2 mb-2 items-center">
            {/* D-Pad LEFT */}
            <button
              id="btn-tvw-dpad-left"
              onClick={() => handlePress('tv_white_dpad_left', 'Direcional Esquerda')}
              className={getButtonStateClass(
                'tv_white_dpad_left',
                'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-white flex items-center justify-center shadow-md border border-zinc-700 transition-all'
              )}
              title="Navegar para a Esquerda"
            >
              <div className="w-0 h-0 border-y-[7px] border-y-transparent border-r-[10px] border-r-white" />
            </button>

            {/* BOTÃO CENTRAL OK (com círculos concêntricos característicos) */}
            <button
              id="btn-tvw-dpad-ok"
              onClick={() => handlePress('tv_white_dpad_ok', 'Selecionar / OK')}
              className={getButtonStateClass(
                'tv_white_dpad_ok',
                'h-12 rounded-full bg-gradient-to-b from-zinc-750 to-zinc-850 hover:from-zinc-700 hover:to-zinc-800 active:scale-95 text-white font-black text-xs flex flex-col items-center justify-center shadow-lg border-2 border-zinc-600 transition-all'
              )}
              title="Confirmar / OK"
            >
              <div className="w-3 h-3 rounded-full border border-zinc-300 mb-0.5 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-zinc-200" />
              </div>
              <span className="leading-none text-[11px]">OK</span>
            </button>

            {/* D-Pad RIGHT */}
            <button
              id="btn-tvw-dpad-right"
              onClick={() => handlePress('tv_white_dpad_right', 'Direcional Direita')}
              className={getButtonStateClass(
                'tv_white_dpad_right',
                'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-white flex items-center justify-center shadow-md border border-zinc-700 transition-all'
              )}
              title="Navegar para a Direita"
            >
              <div className="w-0 h-0 border-y-[7px] border-y-transparent border-l-[10px] border-l-white" />
            </button>
          </div>

          {/* Linha Inferior: BACK • ▼ (Baixo) • EXIT */}
          <div className="grid grid-cols-3 gap-2 items-center">
            <button
              id="btn-tvw-back"
              onClick={() => handlePress('tv_white_back', 'Voltar (Back)')}
              className={getButtonStateClass(
                'tv_white_back',
                'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold text-[10px] flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
              )}
              title="Voltar"
            >
              BACK
            </button>

            {/* D-Pad DOWN */}
            <button
              id="btn-tvw-dpad-down"
              onClick={() => handlePress('tv_white_dpad_down', 'Direcional Baixo')}
              className={getButtonStateClass(
                'tv_white_dpad_down',
                'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-white flex items-center justify-center shadow-md border border-zinc-700 transition-all'
              )}
              title="Navegar para Baixo"
            >
              <div className="w-0 h-0 border-x-[7px] border-x-transparent border-t-[10px] border-t-white" />
            </button>

            <button
              id="btn-tvw-exit"
              onClick={() => handlePress('tv_white_exit', 'Sair (Exit)')}
              className={getButtonStateClass(
                'tv_white_exit',
                'h-10 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold text-[10px] flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
              )}
              title="Sair"
            >
              EXIT
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 13: TECLAS ESPECIAIS (SAP/*, REC/*, ■ STOP) */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-3 gap-2.5 mb-3 px-0.5">
          <button
            id="btn-tvw-sap"
            onClick={() => handlePress('tv_white_sap', 'Áudio SAP/*')}
            className={getButtonStateClass(
              'tv_white_sap',
              'h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold text-xs flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="SAP / Áudio Secundário"
          >
            SAP/*
          </button>

          <button
            id="btn-tvw-rec"
            onClick={() => handlePress('tv_white_rec', 'Gravar (REC/*)')}
            className={getButtonStateClass(
              'tv_white_rec',
              'h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1 shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="Gravar Conteúdo"
          >
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span>REC/*</span>
          </button>

          <button
            id="btn-tvw-stop"
            onClick={() => handlePress('tv_white_stop', 'Parar (Stop)')}
            className={getButtonStateClass(
              'tv_white_stop',
              'h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="Parar Reprodução (Stop)"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 14: PLAYBACK MULTIMÍDIA (◀◀, ▶, ❚❚, ▶▶) */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-4 gap-2 mb-3.5 px-0.5">
          <button
            id="btn-tvw-rewind"
            onClick={() => handlePress('tv_white_rewind', 'Retroceder (<<)')}
            className={getButtonStateClass(
              'tv_white_rewind',
              'h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="Retroceder"
          >
            <Rewind className="w-4 h-4 fill-current" />
          </button>

          <button
            id="btn-tvw-play"
            onClick={() => handlePress('tv_white_play', 'Reproduzir (Play)')}
            className={getButtonStateClass(
              'tv_white_play',
              'h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="Play"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>

          <button
            id="btn-tvw-pause"
            onClick={() => handlePress('tv_white_pause', 'Pausar (Pause)')}
            className={getButtonStateClass(
              'tv_white_pause',
              'h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="Pausar"
          >
            <Pause className="w-4 h-4 fill-current" />
          </button>

          <button
            id="btn-tvw-fast-forward"
            onClick={() => handlePress('tv_white_fast_forward', 'Avançar (>>)')}
            className={getButtonStateClass(
              'tv_white_fast_forward',
              'h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-700/70 transition-all'
            )}
            title="Avanço Rápido"
          >
            <FastForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FILEIRA 15: 4 BOTÕES COLORIDOS COM PONTOS (RODAPÉ) */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-4 gap-2 px-0.5">
          {/* Vermelho (1 ponto: •) */}
          <button
            id="btn-tvw-color-red"
            onClick={() => handlePress('tv_white_color_red', 'Botão Vermelho (1 Ponto)')}
            className={getButtonStateClass(
              'tv_white_color_red',
              'h-9 rounded-xl bg-[#e78077] hover:bg-[#de7066] active:scale-95 text-white flex items-center justify-center shadow-md border border-[#d6675e] transition-all cursor-pointer'
            )}
            title="Tecla Vermelha (1 Ponto)"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
          </button>

          {/* Verde (2 pontos: ••) */}
          <button
            id="btn-tvw-color-green"
            onClick={() => handlePress('tv_white_color_green', 'Botão Verde (2 Pontos)')}
            className={getButtonStateClass(
              'tv_white_color_green',
              'h-9 rounded-xl bg-[#2dbb94] hover:bg-[#25aa85] active:scale-95 text-white flex items-center justify-center gap-1 shadow-md border border-[#219e7a] transition-all cursor-pointer'
            )}
            title="Tecla Verde (2 Pontos)"
          >
            <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
            <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
          </button>

          {/* Amarelo (3 pontos: ••• em triângulo) */}
          <button
            id="btn-tvw-color-yellow"
            onClick={() => handlePress('tv_white_color_yellow', 'Botão Amarelo (3 Pontos)')}
            className={getButtonStateClass(
              'tv_white_color_yellow',
              'h-9 rounded-xl bg-[#f3c846] hover:bg-[#e4b934] active:scale-95 text-zinc-900 flex flex-col items-center justify-center shadow-md border border-[#d8ad27] transition-all cursor-pointer'
            )}
            title="Tecla Amarela (3 Pontos)"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm mb-0.5" />
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            </div>
          </button>

          {/* Azul (4 pontos: :: em grade 2x2) */}
          <button
            id="btn-tvw-color-blue"
            onClick={() => handlePress('tv_white_color_blue', 'Botão Azul (4 Pontos)')}
            className={getButtonStateClass(
              'tv_white_color_blue',
              'h-9 rounded-xl bg-[#4d97c7] hover:bg-[#3f88b8] active:scale-95 text-white flex items-center justify-center shadow-md border border-[#357ea9] transition-all cursor-pointer'
            )}
            title="Tecla Azul (4 Pontos)"
          >
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
