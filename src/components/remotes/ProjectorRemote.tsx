import React, { useState } from 'react';
import {
  Power,
  Layers,
  Settings2,
  Maximize2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Leaf,
  RotateCcw,
  Sparkles,
  Zap,
  Check,
  Compass,
} from 'lucide-react';
import { IRCommand } from '../../types';

interface ProjectorRemoteProps {
  isLight: boolean;
  isConfigMode: boolean;
  getMappedCommand: (key: string) => IRCommand | undefined;
  onButtonClick: (key: string, label: string, onInteractiveUpdate?: () => void) => void;
}

export const ProjectorRemote: React.FC<ProjectorRemoteProps> = ({
  isLight,
  isConfigMode,
  getMappedCommand,
  onButtonClick,
}) => {
  const [power, setPower] = useState<boolean>(true);
  const [source, setSource] = useState<'HDMI 1' | 'HDMI 2' | 'USB' | 'VGA' | 'CAST'>('HDMI 1');
  const [aspect, setAspect] = useState<'16:9' | '4:3' | 'AUTO'>('16:9');
  const [keystone, setKeystone] = useState<number>(0);
  const [focus, setFocus] = useState<number>(10);
  const [isEco, setIsEco] = useState<boolean>(false);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [isBlank, setIsBlank] = useState<boolean>(false);

  const sources: ('HDMI 1' | 'HDMI 2' | 'USB' | 'VGA' | 'CAST')[] = [
    'HDMI 1',
    'HDMI 2',
    'USB',
    'VGA',
    'CAST',
  ];

  const handlePower = () => {
    onButtonClick('proj_power', 'Projetor Power', () => {
      setPower((prev) => !prev);
    });
  };

  const handleSource = () => {
    onButtonClick('proj_source', 'Projetor Entrada (Source)', () => {
      setPower(true);
      setSource((prev) => {
        const idx = sources.indexOf(prev);
        return sources[(idx + 1) % sources.length];
      });
    });
  };

  const handleMenu = () => {
    onButtonClick('proj_menu', 'Projetor Menu');
  };

  const handleKeystoneUp = () => {
    onButtonClick('proj_keystone_up', 'Projetor Keystone +', () => {
      setKeystone((prev) => Math.min(10, prev + 1));
    });
  };

  const handleKeystoneDown = () => {
    onButtonClick('proj_keystone_down', 'Projetor Keystone -', () => {
      setKeystone((prev) => Math.max(-10, prev - 1));
    });
  };

  const handleFocusPlus = () => {
    onButtonClick('proj_focus_plus', 'Projetor Foco +', () => {
      setFocus((prev) => Math.min(20, prev + 1));
    });
  };

  const handleFocusMinus = () => {
    onButtonClick('proj_focus_minus', 'Projetor Foco -', () => {
      setFocus((prev) => Math.max(1, prev - 1));
    });
  };

  const handleEco = () => {
    onButtonClick('proj_eco', 'Projetor Modo Eco', () => {
      setIsEco((prev) => !prev);
    });
  };

  const handleFreeze = () => {
    onButtonClick('proj_freeze', 'Projetor Freeze', () => {
      setIsFrozen((prev) => !prev);
    });
  };

  const handleBlank = () => {
    onButtonClick('proj_blank', 'Projetor Blank / Hide', () => {
      setIsBlank((prev) => !prev);
    });
  };

  return (
    <div id="projector-remote-layout" className="w-full flex flex-col items-center space-y-3.5 animate-in fade-in duration-200">
      {/* TOP ROW (POWER, SOURCE, MENU, ECO) */}
      <div className="w-full grid grid-cols-4 gap-2">
        <button
          id="btn-proj-power"
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
          id="btn-proj-source"
          onClick={handleSource}
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
          <Layers className="w-4 h-4 text-blue-500" />
          <span className="text-[9px] mt-0.5">SOURCE</span>
        </button>

        <button
          id="btn-proj-menu"
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
          <Settings2 className="w-4 h-4 text-purple-500" />
          <span className="text-[9px] mt-0.5">MENU</span>
        </button>

        <button
          id="btn-proj-eco"
          onClick={handleEco}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isEco
              ? 'bg-emerald-600 text-white shadow-md border-emerald-500'
              : isLight
              ? 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
              : 'bg-slate-800/90 text-emerald-400 border-slate-700'
          }`}
        >
          <Leaf className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">MODO ECO</span>
        </button>
      </div>

      {/* D-PAD NAVIGATION */}
      <div className="relative w-52 h-52 my-1 flex items-center justify-center">
        <div
          className={`absolute inset-0 rounded-full border-2 shadow-xl ${
            isLight
              ? 'bg-gradient-to-b from-sky-100 to-sky-200/90 border-sky-300'
              : 'bg-gradient-to-b from-slate-800 to-slate-950 border-slate-700'
          }`}
        />

        <button
          id="btn-proj-up"
          onClick={() => onButtonClick('proj_dpad_up', 'Projetor Cima')}
          className={`absolute top-2 w-14 h-12 flex items-center justify-center transition-all active:scale-90 z-10 ${
            isLight ? 'text-slate-700 hover:text-sky-700' : 'text-slate-200 hover:text-white'
          }`}
        >
          <ChevronUp className="w-7 h-7 stroke-[2.5]" />
        </button>

        <button
          id="btn-proj-down"
          onClick={() => onButtonClick('proj_dpad_down', 'Projetor Baixo')}
          className={`absolute bottom-2 w-14 h-12 flex items-center justify-center transition-all active:scale-90 z-10 ${
            isLight ? 'text-slate-700 hover:text-sky-700' : 'text-slate-200 hover:text-white'
          }`}
        >
          <ChevronDown className="w-7 h-7 stroke-[2.5]" />
        </button>

        <button
          id="btn-proj-left"
          onClick={() => onButtonClick('proj_dpad_left', 'Projetor Esquerda')}
          className={`absolute left-2 w-12 h-14 flex items-center justify-center transition-all active:scale-90 z-10 ${
            isLight ? 'text-slate-700 hover:text-sky-700' : 'text-slate-200 hover:text-white'
          }`}
        >
          <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
        </button>

        <button
          id="btn-proj-right"
          onClick={() => onButtonClick('proj_dpad_right', 'Projetor Direita')}
          className={`absolute right-2 w-12 h-14 flex items-center justify-center transition-all active:scale-90 z-10 ${
            isLight ? 'text-slate-700 hover:text-sky-700' : 'text-slate-200 hover:text-white'
          }`}
        >
          <ChevronRight className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* Center Enter/OK */}
        <button
          id="btn-proj-ok"
          onClick={() => onButtonClick('proj_dpad_ok', 'Projetor Enter / OK')}
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
          <span className="text-sm font-black tracking-wide">ENTER</span>
        </button>
      </div>

      {/* OPTICAL ADJUSTMENTS: KEYSTONE & MOTORIZED FOCUS */}
      <div className="w-full grid grid-cols-2 gap-3">
        {/* Keystone */}
        <div
          className={`p-3 rounded-2xl border flex flex-col items-center justify-between ${
            isLight ? 'bg-white/80 border-sky-200/90 shadow-sm' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase">
            <Compass className="w-3.5 h-3.5 text-purple-500" />
            <span>Keystone</span>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full mt-2">
            <button
              id="btn-proj-keystone-up"
              onClick={handleKeystoneUp}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 ${
                isLight
                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-purple-300 border-slate-700'
              }`}
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>+ Key</span>
            </button>
            <button
              id="btn-proj-keystone-down"
              onClick={handleKeystoneDown}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 ${
                isLight
                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-purple-300 border-slate-700'
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>- Key</span>
            </button>
          </div>
        </div>

        {/* Motorized Focus */}
        <div
          className={`p-3 rounded-2xl border flex flex-col items-center justify-between ${
            isLight ? 'bg-white/80 border-sky-200/90 shadow-sm' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase">
            <Maximize2 className="w-3.5 h-3.5 text-sky-500" />
            <span>Foco Lente</span>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full mt-2">
            <button
              id="btn-proj-focus-plus"
              onClick={handleFocusPlus}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 ${
                isLight
                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-slate-700'
              }`}
            >
              <span>+ Foco</span>
            </button>
            <button
              id="btn-proj-focus-minus"
              onClick={handleFocusMinus}
              className={`py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 ${
                isLight
                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-slate-700'
              }`}
            >
              <span>- Foco</span>
            </button>
          </div>
        </div>
      </div>

      {/* SCREEN UTILITIES: FREEZE, BLANK / HIDE, AUTO ADJUST */}
      <div className="w-full grid grid-cols-3 gap-2">
        <button
          id="btn-proj-freeze"
          onClick={handleFreeze}
          className={`h-11 rounded-xl border flex items-center justify-center gap-1 text-xs font-bold transition-all active:scale-90 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isFrozen
              ? 'bg-amber-500 text-white shadow-md border-amber-400'
              : isLight
              ? 'bg-white hover:bg-amber-50 text-amber-800 border-amber-200 shadow-sm'
              : 'bg-slate-800/90 text-amber-300 border-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Freeze</span>
        </button>

        <button
          id="btn-proj-blank"
          onClick={handleBlank}
          className={`h-11 rounded-xl border flex items-center justify-center gap-1 text-xs font-bold transition-all active:scale-90 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isBlank
              ? 'bg-red-600 text-white shadow-md border-red-500'
              : isLight
              ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
              : 'bg-slate-800/90 text-slate-300 border-slate-700'
          }`}
        >
          {isBlank ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>Blank</span>
        </button>

        <button
          id="btn-proj-aspect"
          onClick={() => {
            onButtonClick('proj_aspect', 'Projetor Proporção de Tela', () => {
              setAspect((prev) => (prev === '16:9' ? '4:3' : prev === '4:3' ? 'AUTO' : '16:9'));
            });
          }}
          className={`h-11 rounded-xl border flex items-center justify-center gap-1 text-xs font-bold transition-all active:scale-90 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
              : 'bg-slate-800/90 text-slate-300 border-slate-700'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
          <span>{aspect}</span>
        </button>
      </div>
    </div>
  );
};
