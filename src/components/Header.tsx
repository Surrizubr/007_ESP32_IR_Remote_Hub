import React from 'react';
import { Settings, Wifi, Bluetooth, Radio, AlertTriangle, Sun, Moon, RefreshCw } from 'lucide-react';
import { ESP32DeviceState } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { feedback } from '../services/soundService';

interface HeaderProps {
  espState: ESP32DeviceState;
  onOpenMenu: () => void;
  onQuickSyncClick: () => void;
  activeScreenTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  espState,
  onOpenMenu,
  onQuickSyncClick,
  activeScreenTitle,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const { strings } = useLanguage();

  return (
    <header
      id="app-header"
      className={`sticky top-0 z-40 px-4 pt-safe py-3 flex items-center justify-between transition-colors duration-200 ${
        isLight
          ? 'bg-white/90 backdrop-blur-md border-b border-sky-200/80 text-slate-800 shadow-sm shadow-sky-100/50'
          : 'bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 text-white shadow-lg shadow-black/20'
      }`}
    >
      {/* App Branding & Current Context */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition-all shrink-0 ${
            isLight
              ? 'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 shadow-sky-300/40'
              : 'bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 shadow-blue-500/20'
          }`}
        >
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className={`font-extrabold text-sm sm:text-base tracking-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {strings.common.appName}
            </h1>
          </div>
          <p className={`text-[10px] sm:text-[11px] font-medium leading-none mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {activeScreenTitle}
          </p>
        </div>
      </div>

      {/* Action Buttons: Status Pill (Online/Offline), Theme Toggle, Sync & Hamburger Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* ESP32 Status Pill (Online/Offline) placed to the left of Theme Toggle */}
        <button
          id="btn-header-esp-status"
          onClick={onQuickSyncClick}
          aria-label={strings.drawer.hardwareStatusTitle}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
            espState.connected
              ? espState.connectionType === 'ble'
                ? isLight
                  ? 'bg-sky-100 border-sky-300 text-sky-800 shadow-xs'
                  : 'bg-blue-950/80 border-blue-700/60 text-blue-300 shadow-xs shadow-blue-950'
                : isLight
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-xs'
                : 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300 shadow-xs shadow-emerald-950'
              : isLight
              ? 'bg-rose-100 border-rose-300 text-rose-800'
              : 'bg-rose-950/80 border-rose-800/60 text-rose-300'
          }`}
          title={strings.header.quickSyncTooltip}
        >
          <span className="relative flex h-2 w-2">
            {espState.connected && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  espState.connectionType === 'ble' ? 'bg-blue-500' : 'bg-emerald-500'
                }`}
              ></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                espState.connected
                  ? espState.connectionType === 'ble'
                    ? 'bg-blue-500'
                    : 'bg-emerald-500'
                  : 'bg-rose-500'
              }`}
            ></span>
          </span>

          <span className="text-[11px] font-bold">
            {espState.connected ? (
              espState.connectionType === 'both' ? (
                <span className="flex items-center gap-1">
                  <Bluetooth className="w-3 h-3 inline" />
                  <Wifi className="w-3 h-3 inline" />
                  {strings.common.hybridMode || 'Hybrid'}
                </span>
              ) : espState.connectionType === 'ble' ? (
                <span className="flex items-center gap-1">
                  <Bluetooth className="w-3 h-3 inline" /> {strings.common.online}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 inline" /> {strings.common.online}
                </span>
              )
            ) : (
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 inline" /> {strings.common.offline}
              </span>
            )}
          </span>
        </button>

        {/* Synchronization Button */}
        <button
          id="btn-header-sync"
          onClick={() => {
            feedback.playClick();
            onQuickSyncClick();
          }}
          aria-label={strings.screenTitles.sync}
          title={strings.header.quickSyncTooltip || strings.screenTitles.sync}
          className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
            isLight
              ? 'bg-sky-50 hover:bg-sky-100 text-sky-600 border-sky-200 shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border-slate-700 shadow-sm'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Quick Theme Switcher Button */}
        <button
          id="btn-header-theme-toggle"
          onClick={() => {
            feedback.playClick();
            toggleTheme();
          }}
          aria-label={isLight ? strings.header.themeLightTooltip : strings.header.themeDarkTooltip}
          title={isLight ? strings.header.themeLightTooltip : strings.header.themeDarkTooltip}
          className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
            isLight
              ? 'bg-sky-50 hover:bg-sky-100 text-amber-600 border-sky-200 shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700 shadow-sm'
          }`}
        >
          {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Settings / Menu on top right */}
        <button
          id="btn-hamburger-menu"
          onClick={onOpenMenu}
          aria-label={strings.header.menuTooltip}
          title={strings.header.menuTooltip}
          className={`p-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm ${
            isLight
              ? 'bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-700 border-sky-200'
              : 'bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border-slate-700/60'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
