import React, { useState } from 'react';
import {
  Power,
  Home,
  Search,
  Menu,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Tv,
  Film,
  Sparkles,
  Zap,
} from 'lucide-react';
import { IRCommand } from '../../types';

interface SmartBoxRemoteProps {
  isLight: boolean;
  isConfigMode: boolean;
  getMappedCommand: (key: string) => IRCommand | undefined;
  onButtonClick: (key: string, label: string, onInteractiveUpdate?: () => void) => void;
}

export const SmartBoxRemote: React.FC<SmartBoxRemoteProps> = ({
  isLight,
  isConfigMode,
  getMappedCommand,
  onButtonClick,
}) => {
  const [power, setPower] = useState<boolean>(true);
  const [activeApp, setActiveApp] = useState<string>('Home Screen');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const handlePower = () => {
    onButtonClick('box_power', 'Smart Box Power', () => {
      setPower((prev) => !prev);
    });
  };

  const handleHome = () => {
    onButtonClick('box_home', 'Smart Box Início (Home)', () => {
      setActiveApp('Home Screen');
    });
  };

  const handleBack = () => {
    onButtonClick('box_back', 'Smart Box Voltar (Back)');
  };

  const handleMenu = () => {
    onButtonClick('box_menu', 'Smart Box Menu / Opções');
  };

  const handleSearch = () => {
    onButtonClick('box_search', 'Smart Box Busca / Voz');
  };

  const handleAppLaunch = (appName: string, key: string) => {
    onButtonClick(key, `Smart Box ${appName}`, () => {
      setPower(true);
      setActiveApp(appName);
    });
  };

  return (
    <div id="smartbox-remote-layout" className="w-full flex flex-col items-center space-y-3.5 animate-in fade-in duration-200">
      {/* TOP FUNCTION BAR (POWER, SEARCH/VOICE, MENU, MUTE) */}
      <div className="w-full grid grid-cols-4 gap-2">
        <button
          id="btn-box-power"
          onClick={handlePower}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : power
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30 border-red-500'
              : isLight
              ? 'bg-white hover:bg-red-50 text-red-600 border-red-200 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-red-400'
          }`}
        >
          <Power className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">POWER</span>
        </button>

        <button
          id="btn-box-search"
          onClick={handleSearch}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
              : 'bg-slate-800/90 text-slate-200 border-slate-700'
          }`}
        >
          <Search className="w-4 h-4 text-blue-500" />
          <span className="text-[9px] mt-0.5">BUSCA</span>
        </button>

        <button
          id="btn-box-menu"
          onClick={handleMenu}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
              : 'bg-slate-800/90 text-slate-200 border-slate-700'
          }`}
        >
          <Menu className="w-4 h-4 text-purple-500" />
          <span className="text-[9px] mt-0.5">MENU</span>
        </button>

        <button
          id="btn-box-mute"
          onClick={() => onButtonClick('box_mute', 'Smart Box Mudo')}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
              : 'bg-slate-800/90 text-slate-200 border-slate-700'
          }`}
        >
          <VolumeX className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">MUTE</span>
        </button>
      </div>

      {/* D-PAD CIRCULAR NAVIGATION RING */}
      <div className="relative w-52 h-52 my-1 flex items-center justify-center">
        {/* Outer Circular Base */}
        <div
          className={`absolute inset-0 rounded-full border-2 shadow-xl ${
            isLight
              ? 'bg-gradient-to-b from-sky-100 to-sky-200/90 border-sky-300'
              : 'bg-gradient-to-b from-slate-800 to-slate-950 border-slate-700'
          }`}
        />

        {/* Up */}
        <button
          id="btn-box-up"
          onClick={() => onButtonClick('box_dpad_up', 'Smart Box Cima')}
          className={`absolute top-2 w-14 h-12 flex items-center justify-center transition-all active:scale-90 z-10 ${
            isLight ? 'text-slate-700 hover:text-sky-700' : 'text-slate-200 hover:text-white'
          }`}
        >
          <ChevronUp className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* Down */}
        <button
          id="btn-box-down"
          onClick={() => onButtonClick('box_dpad_down', 'Smart Box Baixo')}
          className={`absolute bottom-2 w-14 h-12 flex items-center justify-center transition-all active:scale-90 z-10 ${
            isLight ? 'text-slate-700 hover:text-sky-700' : 'text-slate-200 hover:text-white'
          }`}
        >
          <ChevronDown className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* Left */}
        <button
          id="btn-box-left"
          onClick={() => onButtonClick('box_dpad_left', 'Smart Box Esquerda')}
          className={`absolute left-2 w-12 h-14 flex items-center justify-center transition-all active:scale-90 z-10 ${
            isLight ? 'text-slate-700 hover:text-sky-700' : 'text-slate-200 hover:text-white'
          }`}
        >
          <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* Right */}
        <button
          id="btn-box-right"
          onClick={() => onButtonClick('box_dpad_right', 'Smart Box Direita')}
          className={`absolute right-2 w-12 h-14 flex items-center justify-center transition-all active:scale-90 z-10 ${
            isLight ? 'text-slate-700 hover:text-sky-700' : 'text-slate-200 hover:text-white'
          }`}
        >
          <ChevronRight className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* Center OK Button */}
        <button
          id="btn-box-ok"
          onClick={() => onButtonClick('box_dpad_ok', 'Smart Box OK')}
          className={`w-20 h-20 rounded-full border-2 shadow-md flex items-center justify-center transition-all active:scale-90 z-20 font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-gradient-to-b from-white to-sky-50 text-sky-900 border-sky-300 hover:from-sky-50'
              : 'bg-gradient-to-b from-slate-700 to-slate-900 text-white border-slate-600 hover:from-slate-600'
          }`}
        >
          <span className="text-sm font-black tracking-wide">OK</span>
        </button>
      </div>

      {/* SECONDARY NAVIGATION: BACK, HOME, PLAY/PAUSE */}
      <div className="w-full grid grid-cols-3 gap-2">
        <button
          id="btn-box-back"
          onClick={handleBack}
          className={`h-12 rounded-2xl border flex items-center justify-center gap-1 text-xs font-bold transition-all active:scale-90 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
              : 'bg-slate-800/90 text-slate-300 border-slate-700'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <button
          id="btn-box-home"
          onClick={handleHome}
          className={`h-12 rounded-2xl border flex items-center justify-center gap-1 text-xs font-bold transition-all active:scale-90 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md border-sky-500'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md border-blue-500'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Início</span>
        </button>

        <button
          id="btn-box-play-pause"
          onClick={() => {
            onButtonClick('box_play_pause', 'Smart Box Play / Pause', () => {
              setIsPlaying((prev) => !prev);
            });
          }}
          className={`h-12 rounded-2xl border flex items-center justify-center gap-1 text-xs font-bold transition-all active:scale-90 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
              : 'bg-slate-800/90 text-slate-300 border-slate-700'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
      </div>

      {/* STREAMING APP QUICK SHORTCUTS */}
      <div
        className={`w-full p-3 rounded-2xl border ${
          isLight ? 'bg-white/80 border-sky-200/90 shadow-sm' : 'bg-slate-950/80 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          <span>Atalhos de Streaming</span>
          <Film className="w-3.5 h-3.5 text-purple-500" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Netflix */}
          <button
            id="btn-box-app-netflix"
            onClick={() => handleAppLaunch('Netflix', 'box_netflix')}
            className="h-11 rounded-xl bg-[#e50914] hover:bg-[#b80710] text-white font-black text-xs tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span className="font-serif font-black text-sm">NETFLIX</span>
          </button>

          {/* YouTube */}
          <button
            id="btn-box-app-youtube"
            onClick={() => handleAppLaunch('YouTube', 'box_youtube')}
            className="h-11 rounded-xl bg-[#ff0000] hover:bg-[#cc0000] text-white font-black text-xs tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span className="font-sans font-black text-sm">YouTube</span>
          </button>

          {/* Prime Video */}
          <button
            id="btn-box-app-prime"
            onClick={() => handleAppLaunch('Prime Video', 'box_prime')}
            className="h-11 rounded-xl bg-[#00a8e1] hover:bg-[#0089b8] text-white font-black text-xs tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span className="font-sans font-bold text-xs">prime video</span>
          </button>

          {/* Disney+ / Max */}
          <button
            id="btn-box-app-disney"
            onClick={() => handleAppLaunch('Disney+', 'box_disney')}
            className="h-11 rounded-xl bg-[#113ccf] hover:bg-[#0d2fa6] text-white font-black text-xs tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span className="font-sans font-bold text-xs">Disney+</span>
          </button>
        </div>
      </div>
    </div>
  );
};
