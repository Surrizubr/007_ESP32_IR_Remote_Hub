import React, { useState } from 'react';
import {
  Power,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  Radio,
  Disc,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Music,
  Bluetooth,
  Flame,
  Zap,
} from 'lucide-react';
import { IRCommand } from '../../types';

interface SoundRemoteProps {
  isLight: boolean;
  isConfigMode: boolean;
  getMappedCommand: (key: string) => IRCommand | undefined;
  onButtonClick: (key: string, label: string, onInteractiveUpdate?: () => void) => void;
}

export const SoundRemote: React.FC<SoundRemoteProps> = ({
  isLight,
  isConfigMode,
  getMappedCommand,
  onButtonClick,
}) => {
  // Sound System State Simulation
  const [power, setPower] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(24);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [inputSource, setInputSource] = useState<'BT' | 'AUX' | 'OPT' | 'FM' | 'USB'>('BT');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [bassLevel, setBassLevel] = useState<number>(3); // 0 to 6
  const [trebleLevel, setTrebleLevel] = useState<number>(2); // 0 to 6
  const [eqPreset, setEqPreset] = useState<'ROCK' | 'POP' | 'JAZZ' | 'FLAT' | 'CINEMA'>('ROCK');
  const [fmFreq, setFmFreq] = useState<number>(98.5);

  const eqPresets: ('ROCK' | 'POP' | 'JAZZ' | 'FLAT' | 'CINEMA')[] = [
    'ROCK',
    'POP',
    'JAZZ',
    'FLAT',
    'CINEMA',
  ];
  const inputSources: ('BT' | 'AUX' | 'OPT' | 'FM' | 'USB')[] = ['BT', 'AUX', 'OPT', 'FM', 'USB'];

  const handlePower = () => {
    onButtonClick('sound_power', 'Som Power', () => {
      setPower((prev) => !prev);
    });
  };

  const handleMute = () => {
    onButtonClick('sound_mute', 'Som Mudo (Mute)', () => {
      setIsMuted((prev) => !prev);
    });
  };

  const handleVolUp = () => {
    onButtonClick('sound_vol_plus', 'Som Volume +', () => {
      setPower(true);
      setIsMuted(false);
      setVolume((prev) => Math.min(50, prev + 2));
    });
  };

  const handleVolDown = () => {
    onButtonClick('sound_vol_minus', 'Som Volume -', () => {
      setPower(true);
      setIsMuted(false);
      setVolume((prev) => Math.max(0, prev - 2));
    });
  };

  const handlePlayPause = () => {
    onButtonClick('sound_play_pause', 'Som Play / Pause', () => {
      setIsPlaying((prev) => !prev);
    });
  };

  const handlePrev = () => {
    onButtonClick('sound_prev', 'Som Faixa Anterior');
  };

  const handleNext = () => {
    onButtonClick('sound_next', 'Som Próxima Faixa');
  };

  const handleSource = () => {
    onButtonClick('sound_source', 'Som Entrada (Source)', () => {
      setPower(true);
      setInputSource((prev) => {
        const idx = inputSources.indexOf(prev);
        return inputSources[(idx + 1) % inputSources.length];
      });
    });
  };

  const handleBluetooth = () => {
    onButtonClick('sound_bt', 'Som Parear Bluetooth', () => {
      setPower(true);
      setInputSource('BT');
    });
  };

  const handleBassUp = () => {
    onButtonClick('sound_bass_up', 'Som Bass +', () => {
      setBassLevel((prev) => (prev >= 6 ? 0 : prev + 1));
    });
  };

  const handleTrebleUp = () => {
    onButtonClick('sound_treble_up', 'Som Treble +', () => {
      setTrebleLevel((prev) => (prev >= 6 ? 0 : prev + 1));
    });
  };

  const handleEq = () => {
    onButtonClick('sound_eq', 'Som Equalizador (EQ)', () => {
      setEqPreset((prev) => {
        const idx = eqPresets.indexOf(prev);
        return eqPresets[(idx + 1) % eqPresets.length];
      });
    });
  };

  return (
    <div id="sound-remote-layout" className="w-full flex flex-col items-center space-y-3.5 animate-in fade-in duration-200">
      {/* PRIMARY CONTROLS: POWER, MUTE, SOURCE, BLUETOOTH */}
      <div className="w-full grid grid-cols-4 gap-2">
        {/* Power */}
        <button
          id="btn-sound-power"
          onClick={handlePower}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-400/40'
                : 'border-amber-400/80 bg-slate-900 text-amber-300 ring-2 ring-amber-400/40'
              : power
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 border-red-500'
              : isLight
              ? 'bg-white hover:bg-red-50 text-red-600 border-red-200 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-red-400'
          }`}
        >
          <Power className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">POWER</span>
        </button>

        {/* Mute */}
        <button
          id="btn-sound-mute"
          onClick={handleMute}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isMuted
              ? 'bg-amber-500 text-white shadow-md border-amber-400'
              : isLight
              ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/80'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="text-[9px] mt-0.5">MUTE</span>
        </button>

        {/* Source */}
        <button
          id="btn-sound-source"
          onClick={handleSource}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/80'
          }`}
        >
          <Disc className="w-4 h-4 text-purple-500" />
          <span className="text-[9px] mt-0.5">SOURCE</span>
        </button>

        {/* Bluetooth Direct */}
        <button
          id="btn-sound-bt"
          onClick={handleBluetooth}
          className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border font-bold ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : inputSource === 'BT'
              ? 'bg-blue-600 text-white shadow-md border-blue-500'
              : isLight
              ? 'bg-white hover:bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
              : 'bg-slate-800/90 hover:bg-slate-700 text-blue-400 border-slate-700/80'
          }`}
        >
          <Bluetooth className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">BT PAIR</span>
        </button>
      </div>

      {/* VOLUME & PLAYBACK DECK */}
      <div className="w-full grid grid-cols-2 gap-3">
        {/* Large Volume Column */}
        <div
          className={`p-3 rounded-2xl border flex flex-col items-center justify-between ${
            isLight ? 'bg-white/80 border-sky-200/90 shadow-sm' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            Master Volume
          </span>
          <div className="flex flex-col gap-2 w-full mt-2">
            <button
              id="btn-sound-vol-plus"
              onClick={handleVolUp}
              className={`w-full py-3 rounded-xl border flex items-center justify-center gap-1 font-bold text-sm transition-all active:scale-95 ${
                isConfigMode
                  ? 'border-amber-400 bg-amber-50 text-amber-800'
                  : isLight
                  ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md border-sky-400'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md border-blue-500'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>VOL +</span>
            </button>

            <button
              id="btn-sound-vol-minus"
              onClick={handleVolDown}
              className={`w-full py-3 rounded-xl border flex items-center justify-center gap-1 font-bold text-sm transition-all active:scale-95 ${
                isConfigMode
                  ? 'border-amber-400 bg-amber-50 text-amber-800'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Volume1 className="w-4 h-4" />
              <span>VOL -</span>
            </button>
          </div>
        </div>

        {/* Media Controls Column */}
        <div
          className={`p-3 rounded-2xl border flex flex-col items-center justify-between ${
            isLight ? 'bg-white/80 border-sky-200/90 shadow-sm' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            Reprodução
          </span>

          <div className="w-full flex items-center justify-center my-1">
            <button
              id="btn-sound-play-pause"
              onClick={handlePlayPause}
              className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all active:scale-90 shadow-lg ${
                isConfigMode
                  ? 'border-amber-400 bg-amber-50 text-amber-800'
                  : isPlaying
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 border-emerald-500'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30 border-cyan-500'
              }`}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full">
            <button
              id="btn-sound-prev"
              onClick={handlePrev}
              className={`flex-1 py-2 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                isLight
                  ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
                  : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              id="btn-sound-next"
              onClick={handleNext}
              className={`flex-1 py-2 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                isLight
                  ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
                  : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* AUDIO ENHANCEMENTS: BASS BOOST, TREBLE, EQUALIZER */}
      <div className="w-full grid grid-cols-3 gap-2">
        {/* Bass Boost */}
        <button
          id="btn-sound-bass"
          onClick={handleBassUp}
          className={`h-14 rounded-2xl flex flex-col items-center justify-center border transition-all active:scale-90 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-amber-400 hover:border-amber-500/40'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] font-bold mt-0.5">BASS BOOST</span>
          <span className="text-[9px] font-mono text-slate-400">+{bassLevel}</span>
        </button>

        {/* Treble */}
        <button
          id="btn-sound-treble"
          onClick={handleTrebleUp}
          className={`h-14 rounded-2xl flex flex-col items-center justify-center border transition-all active:scale-90 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-sky-50 text-sky-700 border-sky-200 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-sky-400 hover:border-sky-500/40'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-sky-500" />
          <span className="text-[10px] font-bold mt-0.5">TREBLE</span>
          <span className="text-[9px] font-mono text-slate-400">+{trebleLevel}</span>
        </button>

        {/* EQ Preset */}
        <button
          id="btn-sound-eq"
          onClick={handleEq}
          className={`h-14 rounded-2xl flex flex-col items-center justify-center border transition-all active:scale-90 ${
            isConfigMode
              ? isLight
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-amber-400/80 bg-slate-900 text-amber-300'
              : isLight
              ? 'bg-white hover:bg-purple-50 text-purple-700 border-purple-200 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-purple-400 hover:border-purple-500/40'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-500" />
          <span className="text-[10px] font-bold mt-0.5">EQ PRESET</span>
          <span className="text-[9px] font-mono text-slate-400">{eqPreset}</span>
        </button>
      </div>
    </div>
  );
};
