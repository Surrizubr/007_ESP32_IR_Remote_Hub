import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface TimingWaveformProps {
  timings?: number[];
  protocol?: string;
  hexCode?: string;
  className?: string;
}

export const TimingWaveform: React.FC<TimingWaveformProps> = ({
  timings = [9000, 4500, 560, 1690, 560, 560, 560, 1690, 560, 560, 560, 1690, 560, 560],
  protocol = 'NEC',
  hexCode = '0x20DF10EF',
  className = '',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Render waveform pulses as SVG
  const width = 360;
  const height = 64;
  const padding = 10;
  const usableWidth = width - padding * 2;
  const totalDuration = timings.reduce((acc, t) => acc + Math.min(t, 6000), 0) || 1;

  let currentX = padding;
  let isHigh = true;
  const points: { x: number; y: number }[] = [];

  points.push({ x: currentX, y: height - 12 });

  timings.slice(0, 24).forEach((duration) => {
    const clampedDuration = Math.min(duration, 6000);
    const segWidth = Math.max(3, (clampedDuration / totalDuration) * usableWidth * 1.6);
    const targetX = Math.min(width - padding, currentX + segWidth);
    const yVal = isHigh ? 14 : height - 14;

    // Step up or down
    points.push({ x: currentX, y: yVal });
    points.push({ x: targetX, y: yVal });

    currentX = targetX;
    isHigh = !isHigh;
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  return (
    <div
      id="timing-waveform-card"
      className={`rounded-xl p-3 font-mono text-xs border transition-colors ${
        isLight
          ? 'bg-sky-950/90 border-sky-800 text-slate-200 shadow-md shadow-sky-900/20'
          : 'bg-slate-950 border-slate-800 text-slate-200'
      } ${className}`}
    >
      <div className="flex items-center justify-between text-slate-400 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">{protocol}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-200 text-[11px] font-bold">{hexCode}</span>
        </div>
        <span className="text-[10px] text-sky-400">38 kHz Modulado</span>
      </div>

      <div className="relative w-full h-16 bg-slate-950/90 rounded-lg overflow-hidden border border-sky-900/60 flex items-center">
        {/* Oscilloscope Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf815_1px,transparent_1px),linear-gradient(to_bottom,#38bdf815_1px,transparent_1px)] bg-[size:14px_14px]"></div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full relative z-10">
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={pathD}
            fill="none"
            stroke="url(#waveGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />
        </svg>
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 px-1">
        <span>Lead Pulse ({timings[0] || 9000}µs)</span>
        <span>Space ({timings[1] || 4500}µs)</span>
        <span>Payload Bits</span>
      </div>
    </div>
  );
};

