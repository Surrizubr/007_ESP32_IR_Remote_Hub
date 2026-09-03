import React, { useState, useEffect } from 'react';
import {
  X,
  Code2,
  Volume2,
  VolumeX,
  Vibrate,
  Info,
  Download,
  Upload,
  SlidersHorizontal,
  Sun,
  Moon,
  Palette,
  Languages,
  ChevronRight,
  ArrowLeft,
  Cpu,
  Zap,
  Radio,
  Send,
  Sparkles,
  Sliders,
  Save,
  Check,
  RefreshCcw,
  Layers,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { ScreenTab, ESP32DeviceState, ESP32PinConfig } from '../types';
import { esp32 } from '../services/esp32Service';
import { feedback } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, AppLanguage } from '../context/LanguageContext';
import { DeviceSyncScreen } from './DeviceSyncScreen';

export type SubDrawerType = 'themes' | 'tools' | 'feedback' | 'languages' | 'sync' | null;

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab?: ScreenTab;
  onSelectTab?: (tab: ScreenTab) => void;
  initialSubDrawer?: SubDrawerType;
  espState: ESP32DeviceState;
  onOpenFirmwareModal: () => void;
  onExportData: () => void;
  onImportData: () => void;
  onResetDefaults?: () => void;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  initialSubDrawer,
  espState,
  onOpenFirmwareModal,
  onExportData,
  onImportData,
  onResetDefaults,
}) => {
  const { theme, setTheme } = useTheme();
  const isLight = theme === 'light';
  const { language, setLanguage, strings } = useLanguage();

  const [activeSubDrawer, setActiveSubDrawer] = useState<SubDrawerType>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialSubDrawer) {
        setActiveSubDrawer(initialSubDrawer);
      }
    } else {
      setActiveSubDrawer(null);
    }
  }, [isOpen, initialSubDrawer]);

  const [soundEnabled, setSoundEnabled] = useState(feedback.isSoundEnabled());
  const [hapticEnabled, setHapticEnabled] = useState(feedback.isHapticEnabled());

  // GPIO Pin Configuration state inside Ferramentas do ESP32
  const [pinConfig, setPinConfig] = useState<ESP32PinConfig>({ ...espState.pinConfig });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    setPinConfig({ ...espState.pinConfig });
  }, [espState.pinConfig]);

  const rxAvailablePins = [15, 4, 13, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35];
  const txAvailablePins = [4, 2, 13, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33];
  const ledAvailablePins = [2, 4, 5, 18, 19, 21, 22];

  const handleSavePinConfig = async () => {
    feedback.playCaptureSuccess();
    await esp32.updatePinConfig(pinConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2200);
  };

  const handleSelectLanguage = (lang: AppLanguage) => {
    setLanguage(lang);
    feedback.playClick();
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    feedback.setSoundEnabled(next);
    setSoundEnabled(next);
    feedback.playClick();
  };

  const toggleHaptic = () => {
    const next = !hapticEnabled;
    feedback.setHapticEnabled(next);
    setHapticEnabled(next);
    feedback.playClick();
  };

  const handleOpenSubDrawer = (type: SubDrawerType) => {
    feedback.playClick();
    setActiveSubDrawer(type);
  };

  const handleBackToMain = () => {
    feedback.playClick();
    setActiveSubDrawer(null);
  };

  const handleCloseAll = () => {
    setActiveSubDrawer(null);
    onClose();
  };

  if (!isOpen) return null;

  const getLanguageLabel = (lang: AppLanguage) => {
    switch (lang) {
      case 'pt':
        return 'Português (BR)';
      case 'en':
        return 'English (US)';
      case 'es':
        return 'Español (ES)';
    }
  };

  return (
    <div
      id="drawer-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleCloseAll}
    >
      <div
        id="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm sm:max-w-md h-full flex flex-col shadow-2xl relative overflow-hidden transition-colors ${
          isLight
            ? 'bg-sky-50/95 border-l border-sky-200 text-slate-800'
            : 'bg-slate-900 border-l border-slate-800 text-slate-100'
        }`}
      >
        {/* ========================================================= */}
        {/* MAIN MENU VIEW */}
        {/* ========================================================= */}
        <div className="w-full h-full flex flex-col overflow-y-auto">
          {/* Main Drawer Header */}
          <div
            className={`p-4 border-b flex items-center justify-between transition-colors ${
              isLight ? 'border-sky-200 bg-white/80' : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
                  isLight ? 'bg-sky-600' : 'bg-blue-600'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {strings.drawer.mainMenu}
                </h2>
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {strings.drawer.suiteTitle}
                </p>
              </div>
            </div>
            <button
              id="btn-close-drawer"
              onClick={handleCloseAll}
              aria-label={strings.common.close}
              className={`p-1.5 rounded-xl transition ${
                isLight
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-sky-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick ESP32 Status Pill */}
          <div className="px-3 pt-3">
            <button
              id="drawer-quick-sync-status"
              onClick={() => handleOpenSubDrawer('sync')}
              className={`w-full p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-colors hover:opacity-95 active:scale-[0.99] ${
                isLight ? 'bg-white/80 border-sky-200 hover:bg-white' : 'bg-slate-800/50 border-slate-800 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    espState.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  {strings.drawer.statusLabel}: {espState.connected ? strings.common.connected : strings.common.disconnected}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    isLight ? 'bg-sky-100 text-sky-800' : 'bg-slate-900 text-sky-400'
                  }`}
                >
                  {espState.connectionType.toUpperCase()}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
            </button>
          </div>

          {/* SECTION: CATEGORY CARDS / FIELDS */}
          <div className="p-3 space-y-2.5">
            <div
              className={`px-1 text-[11px] font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {strings.drawer.settingsModules}
            </div>

            {/* 1. TEMAS */}
            <button
              id="menu-item-themes"
              onClick={() => handleOpenSubDrawer('themes')}
              className={`w-full p-3 rounded-2xl border flex items-center justify-between text-left transition-all active:scale-[0.98] ${
                isLight
                  ? 'bg-white/95 border-sky-200 hover:bg-sky-100/60 shadow-sm hover:border-sky-300'
                  : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                    isLight ? 'bg-sky-100 text-sky-700' : 'bg-blue-900/60 text-blue-300'
                  }`}
                >
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {strings.drawer.themes}
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isLight ? `${strings.drawer.themeLight} (${strings.common.active})` : `${strings.drawer.themeDark} (${strings.common.active})`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                    isLight ? 'bg-sky-100 text-sky-800' : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  {isLight ? strings.drawer.themeActiveLight : strings.drawer.themeActiveDark}
                </span>
                <ChevronRight className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
            </button>

            {/* 2. IDIOMAS */}
            <button
              id="menu-item-languages"
              onClick={() => handleOpenSubDrawer('languages')}
              className={`w-full p-3 rounded-2xl border flex items-center justify-between text-left transition-all active:scale-[0.98] ${
                isLight
                  ? 'bg-white/95 border-sky-200 hover:bg-sky-100/60 shadow-sm hover:border-sky-300'
                  : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                    isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-950/70 text-amber-300'
                  }`}
                >
                  <Languages className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {strings.drawer.languages}
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {strings.drawer.languagesSubtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                    isLight ? 'bg-amber-100 text-amber-900' : 'bg-slate-900 text-amber-300'
                  }`}
                >
                  {getLanguageLabel(language)}
                </span>
                <ChevronRight className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
            </button>

            {/* 3. AVISOS SONOROS & FEEDBACK TÁTIL */}
            <button
              id="menu-item-feedback"
              onClick={() => handleOpenSubDrawer('feedback')}
              className={`w-full p-3 rounded-2xl border flex items-center justify-between text-left transition-all active:scale-[0.98] ${
                isLight
                  ? 'bg-white/95 border-sky-200 hover:bg-sky-100/60 shadow-sm hover:border-sky-300'
                  : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                    isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-950/70 text-indigo-300'
                  }`}
                >
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {strings.drawer.feedback}
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {strings.drawer.feedbackSubtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                    soundEnabled
                      ? isLight
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-emerald-950 text-emerald-300'
                      : isLight
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {soundEnabled ? strings.drawer.feedbackStatusActive : strings.drawer.feedbackStatusMute}
                </span>
                <ChevronRight className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
            </button>

            {/* 4. SINCRONIZAÇÃO & WI-FI (SYNC) */}
            <button
              id="menu-item-sync"
              onClick={() => handleOpenSubDrawer('sync')}
              className={`w-full p-3 rounded-2xl border flex items-center justify-between text-left transition-all active:scale-[0.98] ${
                isLight
                  ? 'bg-white/95 border-sky-200 hover:bg-sky-100/60 shadow-sm hover:border-sky-300'
                  : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                    espState.connected
                      ? isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/70 text-emerald-300'
                      : isLight ? 'bg-sky-100 text-sky-700' : 'bg-blue-900/60 text-blue-300'
                  }`}
                >
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {strings.screenTitles.sync}
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Bluetooth BLE • Wi-Fi • Teste IR
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg ${
                    espState.connected
                      ? isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950 text-emerald-300'
                      : isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-950 text-rose-300'
                  }`}
                >
                  {espState.connected ? espState.connectionType.toUpperCase() : strings.common.offline}
                </span>
                <ChevronRight className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
            </button>

            {/* 5. FERRAMENTAS DO ESP32 */}
            <button
              id="menu-item-tools"
              onClick={() => handleOpenSubDrawer('tools')}
              className={`w-full p-3 rounded-2xl border flex items-center justify-between text-left transition-all active:scale-[0.98] ${
                isLight
                  ? 'bg-white/95 border-sky-200 hover:bg-sky-100/60 shadow-sm hover:border-sky-300'
                  : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                    isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-950/70 text-emerald-300'
                  }`}
                >
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {strings.drawer.espTools}
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {strings.drawer.espToolsSubtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg ${
                    isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {strings.drawer.espToolsBadge}
                </span>
                <ChevronRight className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
            </button>
          </div>

          {/* Footer Info */}
          <div
            className={`mt-auto p-4 border-t text-[11px] flex flex-col gap-1 transition-colors ${
              isLight ? 'border-sky-200 text-slate-600 bg-sky-100/30' : 'border-slate-800 text-slate-500'
            }`}
          >
            <div className={`flex items-center gap-1 font-medium ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              <Info className="w-3.5 h-3.5" />
              <span>{strings.drawer.footerSuite}</span>
            </div>
            <p>{strings.drawer.footerDesc}</p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SUB-DRAWER: TEMAS */}
        {/* ========================================================= */}
        {activeSubDrawer === 'themes' && (
          <div
            className={`absolute inset-0 z-20 flex flex-col animate-in slide-in-from-right duration-250 transition-colors ${
              isLight ? 'bg-sky-50/95 text-slate-800' : 'bg-slate-900 text-slate-100'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between transition-colors ${
                isLight ? 'border-sky-200 bg-white/90' : 'border-slate-800 bg-slate-950/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToMain}
                  className={`p-1.5 rounded-xl transition ${
                    isLight ? 'text-slate-600 hover:bg-sky-100' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  title={strings.common.back}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {strings.drawer.themesSectionTitle}
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {strings.drawer.themesSectionSubtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseAll}
                className={`p-1.5 rounded-xl transition ${
                  isLight ? 'text-slate-500 hover:bg-sky-100' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {/* Light Theme Button */}
                <button
                  id="subdrawer-theme-light"
                  onClick={() => {
                    feedback.playClick();
                    setTheme('light');
                  }}
                  className={`p-3.5 rounded-2xl flex flex-col items-center gap-2 border text-left transition-all relative ${
                    isLight
                      ? 'bg-sky-100/90 border-sky-400 text-sky-950 ring-2 ring-sky-400/40 shadow-lg'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-full h-12 rounded-xl bg-gradient-to-br from-sky-200 via-sky-100 to-blue-100 border border-sky-300 flex items-center justify-center gap-1.5 shadow-inner">
                    <Sun className="w-5 h-5 text-amber-500" />
                    <span className="text-[11px] font-mono text-sky-900 font-bold">{strings.drawer.themeActiveLight}</span>
                  </div>
                  <div className="w-full flex items-center justify-between px-1">
                    <span className="text-xs font-bold">{strings.drawer.themeLight}</span>
                    {isLight && (
                      <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                </button>

                {/* Dark Theme Button */}
                <button
                  id="subdrawer-theme-dark"
                  onClick={() => {
                    feedback.playClick();
                    setTheme('dark');
                  }}
                  className={`p-3.5 rounded-2xl flex flex-col items-center gap-2 border text-left transition-all relative ${
                    !isLight
                      ? 'bg-slate-800/90 border-blue-500 text-white ring-2 ring-blue-500/30 shadow-lg'
                      : 'bg-white/80 border-sky-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="w-full h-12 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center gap-1.5 shadow-inner">
                    <Moon className="w-5 h-5 text-amber-400" />
                    <span className="text-[11px] font-mono text-slate-300 font-bold">{strings.drawer.themeActiveDark}</span>
                  </div>
                  <div className="w-full flex items-center justify-between px-1">
                    <span className="text-xs font-bold">{strings.drawer.themeDark}</span>
                    {!isLight && (
                      <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                </button>
              </div>

              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  isLight ? 'bg-white/90 border-sky-200 text-slate-600' : 'bg-slate-800/50 border-slate-800 text-slate-400'
                }`}
              >
                {strings.drawer.themeLightDesc} {strings.drawer.themeDarkDesc}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-DRAWER: FERRAMENTAS DO ESP32 */}
        {/* ========================================================= */}
        {activeSubDrawer === 'tools' && (
          <div
            className={`absolute inset-0 z-20 flex flex-col animate-in slide-in-from-right duration-250 transition-colors ${
              isLight ? 'bg-sky-50/95 text-slate-800' : 'bg-slate-900 text-slate-100'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between transition-colors shrink-0 ${
                isLight ? 'border-sky-200 bg-white/90' : 'border-slate-800 bg-slate-950/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToMain}
                  className={`p-1.5 rounded-xl transition ${
                    isLight ? 'text-slate-600 hover:bg-sky-100' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  title={strings.common.back}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {strings.drawer.toolsSectionTitle}
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {strings.drawer.toolsSectionSubtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseAll}
                className={`p-1.5 rounded-xl transition ${
                  isLight ? 'text-slate-500 hover:bg-sky-100' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto pb-8">
              {/* 1. HARDWARE STATUS CARD */}
              <div
                className={`p-3 rounded-2xl border transition-colors ${
                  isLight ? 'bg-white/90 border-sky-200 shadow-sm' : 'bg-slate-800/60 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Cpu className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
                    <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                      {strings.drawer.hardwareStatusTitle}
                    </span>
                  </div>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${
                      espState.connected
                        ? isLight
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isLight
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {espState.connected ? strings.common.online : strings.common.offline}
                  </span>
                </div>
                <div className={`text-xs font-mono font-semibold flex items-center justify-between ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <span>{espState.connectionType === 'wifi' ? `IP: ${espState.ipAddress}` : `BLE: ${espState.bleDeviceName}`}</span>
                  <span className="text-[10px] text-slate-500 font-sans">{strings.drawer.uptime}: {Math.floor(espState.uptime / 60)}m</span>
                </div>
              </div>

              {/* 2. C++ ARDUINO IDE FIRMWARE GENERATOR BUTTON */}
              <button
                id="subdrawer-btn-firmware"
                onClick={() => {
                  onOpenFirmwareModal();
                  handleCloseAll();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-sm font-medium transition shadow-sm active:scale-[0.99] ${
                  isLight
                    ? 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/70 text-emerald-950'
                    : 'bg-emerald-950/40 border-emerald-800/60 hover:bg-emerald-900/40 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-900/60 text-emerald-300'}`}>
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xs">{strings.drawer.firmwareBtnTitle}</div>
                    <div className={`text-[11px] ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      {strings.drawer.firmwareBtnDesc}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    isLight ? 'bg-emerald-200 text-emerald-900' : 'bg-emerald-900 text-emerald-300'
                  }`}
                >
                  .INO
                </span>
              </button>

              {/* 3. GPIO PIN CONFIGURATION FORM */}
              <div
                className={`rounded-2xl p-3.5 border space-y-3 transition-colors ${
                  isLight ? 'bg-white/90 border-sky-200 shadow-sm' : 'bg-slate-800/60 border-slate-700'
                }`}
              >
                <div className={`flex items-center justify-between pb-2 border-b ${isLight ? 'border-sky-200' : 'border-slate-700'}`}>
                  <h4 className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <Layers className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-blue-400'}`} />
                    <span>{strings.drawer.gpioTitle}</span>
                  </h4>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      isLight ? 'bg-sky-100 text-sky-800 border border-sky-200' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    DevKit 30/38
                  </span>
                </div>

                {/* IR Receiver Pin (RX) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-bold flex items-center gap-1 ${isLight ? 'text-purple-900' : 'text-purple-300'}`}>
                      <Radio className="w-3.5 h-3.5 text-purple-500" />
                      <span>{strings.drawer.rxPinLabel}</span>
                    </label>
                    <span className="text-[10px] font-mono font-bold text-purple-500">VS1838B</span>
                  </div>
                  <select
                    id="drawer-ir-receiver-pin"
                    value={pinConfig.irReceiverPin}
                    onChange={(e) => setPinConfig({ ...pinConfig, irReceiverPin: Number(e.target.value) })}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono border focus:outline-none focus:ring-2 ${
                      isLight
                        ? 'bg-purple-50/50 border-purple-200 text-slate-800 focus:ring-purple-500'
                        : 'bg-slate-900 border-purple-500/40 text-white focus:ring-purple-500'
                    }`}
                  >
                    {rxAvailablePins.map((pin) => (
                      <option key={pin} value={pin}>
                        GPIO {pin} {pin === 15 ? '★ (Padrão / Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* IR Transmitter Pin (TX) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-bold flex items-center gap-1 ${isLight ? 'text-sky-900' : 'text-blue-300'}`}>
                      <Send className="w-3.5 h-3.5 text-sky-500" />
                      <span>{strings.drawer.txPinLabel}</span>
                    </label>
                    <span className="text-[10px] font-mono font-bold text-sky-500">940nm</span>
                  </div>
                  <select
                    id="drawer-ir-transmitter-pin"
                    value={pinConfig.irTransmitterPin}
                    onChange={(e) => setPinConfig({ ...pinConfig, irTransmitterPin: Number(e.target.value) })}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono border focus:outline-none focus:ring-2 ${
                      isLight
                        ? 'bg-sky-50/50 border-sky-200 text-slate-800 focus:ring-sky-500'
                        : 'bg-slate-900 border-blue-500/40 text-white focus:ring-blue-500'
                    }`}
                  >
                    {txAvailablePins.map((pin) => (
                      <option key={pin} value={pin}>
                        GPIO {pin} {pin === 4 ? '★ (Padrão / Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status LED Pin */}
                <div className="space-y-1">
                  <label className={`text-xs font-bold flex items-center gap-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{strings.drawer.ledPinLabel}</span>
                  </label>
                  <select
                    id="drawer-status-led-pin"
                    value={pinConfig.statusLedPin}
                    onChange={(e) => setPinConfig({ ...pinConfig, statusLedPin: Number(e.target.value) })}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  >
                    {ledAvailablePins.map((pin) => (
                      <option key={pin} value={pin}>
                        GPIO {pin} {pin === 2 ? '(LED Built-in)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Carrier PWM Frequency */}
                <div className="space-y-1">
                  <label className={`text-xs font-bold flex items-center gap-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                    <Sliders className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                    <span>PWM Carrier Frequency</span>
                  </label>
                  <select
                    id="drawer-pwm-frequency"
                    value={pinConfig.pwmFrequency}
                    onChange={(e) => setPinConfig({ ...pinConfig, pwmFrequency: Number(e.target.value) })}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  >
                    <option value={38000}>38 kHz (Standard / 95% Devices)</option>
                    <option value={36000}>36 kHz (RC5 / Philips)</option>
                    <option value={40000}>40 kHz (Sony / Japanese Brands)</option>
                    <option value={56000}>56 kHz (B&O / Special)</option>
                  </select>
                </div>

                {/* Save Pin Config Button */}
                <button
                  id="drawer-btn-save-pin-config"
                  onClick={handleSavePinConfig}
                  className={`w-full py-2.5 mt-1 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow active:scale-98 ${
                    savedSuccess
                      ? 'bg-emerald-600 text-white'
                      : isLight
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sky-200'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-950'
                  }`}
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{strings.drawer.pinsSavedNotice}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{strings.drawer.savePinsBtn}</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4. BACKUP & RESTORE / FACTORY RESET */}
              <div
                className={`rounded-2xl p-3.5 border space-y-3 transition-colors ${
                  isLight ? 'bg-white/90 border-sky-200 shadow-sm' : 'bg-slate-800/60 border-slate-700'
                }`}
              >
                <h4 className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {strings.drawer.backupTitle}
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="drawer-btn-export-backup"
                    onClick={() => {
                      onExportData();
                      feedback.playClick();
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition border active:scale-95 shadow-sm ${
                      isLight
                        ? 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                    }`}
                  >
                    <Download className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-blue-400'}`} />
                    <span>{strings.drawer.exportBackupBtn}</span>
                  </button>

                  <button
                    id="drawer-btn-import-backup"
                    onClick={() => {
                      onImportData();
                      feedback.playClick();
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition border active:scale-95 shadow-sm ${
                      isLight
                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                    }`}
                  >
                    <Upload className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                    <span>{strings.drawer.importBackupBtn}</span>
                  </button>
                </div>

                {onResetDefaults && (
                  <button
                    id="drawer-btn-reset-defaults"
                    onClick={() => {
                      feedback.playClick();
                      if (confirm(strings.drawer.factoryResetConfirm)) {
                        onResetDefaults();
                        handleCloseAll();
                      }
                    }}
                    className={`w-full py-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 border ${
                      isLight
                        ? 'text-rose-700 hover:bg-rose-50 border-rose-200'
                        : 'text-rose-400 hover:bg-rose-950/30 border-rose-900/40'
                    }`}
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span>{strings.drawer.factoryResetBtn}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-DRAWER: FEEDBACK TÁTIL E SONORO */}
        {/* ========================================================= */}
        {activeSubDrawer === 'feedback' && (
          <div
            className={`absolute inset-0 z-20 flex flex-col animate-in slide-in-from-right duration-250 transition-colors ${
              isLight ? 'bg-sky-50/95 text-slate-800' : 'bg-slate-900 text-slate-100'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between transition-colors ${
                isLight ? 'border-sky-200 bg-white/90' : 'border-slate-800 bg-slate-950/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToMain}
                  className={`p-1.5 rounded-xl transition ${
                    isLight ? 'text-slate-600 hover:bg-sky-100' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  title={strings.common.back}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {strings.drawer.feedbackSectionTitle}
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {strings.drawer.feedbackSectionSubtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseAll}
                className={`p-1.5 rounded-xl transition ${
                  isLight ? 'text-slate-500 hover:bg-sky-100' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              {/* Sound Toggle */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
                  isLight ? 'bg-white/90 border-sky-200' : 'bg-slate-800/60 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      soundEnabled
                        ? isLight
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-blue-900/60 text-blue-300'
                        : isLight
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {strings.drawer.soundBeepTitle}
                    </div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {strings.drawer.soundBeepDesc}
                    </div>
                  </div>
                </div>
                <button
                  id="btn-toggle-sound"
                  onClick={toggleSound}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    soundEnabled ? (isLight ? 'bg-sky-600' : 'bg-blue-600') : (isLight ? 'bg-slate-300' : 'bg-slate-700')
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Haptic Toggle */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
                  isLight ? 'bg-white/90 border-sky-200' : 'bg-slate-800/60 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      hapticEnabled
                        ? isLight
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-blue-900/60 text-blue-300'
                        : isLight
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Vibrate className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {strings.drawer.hapticTitle}
                    </div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {strings.drawer.hapticDesc}
                    </div>
                  </div>
                </div>
                <button
                  id="btn-toggle-haptic"
                  onClick={toggleHaptic}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    hapticEnabled ? (isLight ? 'bg-sky-600' : 'bg-blue-600') : (isLight ? 'bg-slate-300' : 'bg-slate-700')
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform transform ${
                      hapticEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Test Audio Button */}
              <button
                onClick={() => {
                  feedback.playTransmitBeep();
                }}
                className={`w-full py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 ${
                  isLight
                    ? 'bg-sky-100/70 hover:bg-sky-100 text-sky-900 border-sky-300'
                    : 'bg-slate-800 hover:bg-slate-750 text-sky-300 border-slate-700'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{strings.drawer.testBeepBtn}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-DRAWER: IDIOMAS */}
        {/* ========================================================= */}
        {activeSubDrawer === 'languages' && (
          <div
            className={`absolute inset-0 z-20 flex flex-col animate-in slide-in-from-right duration-250 transition-colors ${
              isLight ? 'bg-sky-50/95 text-slate-800' : 'bg-slate-900 text-slate-100'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between transition-colors ${
                isLight ? 'border-sky-200 bg-white/90' : 'border-slate-800 bg-slate-950/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToMain}
                  className={`p-1.5 rounded-xl transition ${
                    isLight ? 'text-slate-600 hover:bg-sky-100' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  title={strings.common.back}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {strings.drawer.languagesSectionTitle}
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {strings.drawer.languagesSectionSubtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseAll}
                className={`p-1.5 rounded-xl transition ${
                  isLight ? 'text-slate-500 hover:bg-sky-100' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 overflow-y-auto">
              {/* Option: Português */}
              <button
                id="lang-option-pt"
                onClick={() => handleSelectLanguage('pt')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all ${
                  language === 'pt'
                    ? isLight
                      ? 'bg-sky-100/90 border-sky-400 text-sky-950 ring-2 ring-sky-400/30 shadow-md font-bold'
                      : 'bg-slate-800 border-blue-500 text-white ring-2 ring-blue-500/30 shadow-md font-bold'
                    : isLight
                    ? 'bg-white/90 border-sky-200 text-slate-700 hover:bg-sky-50'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇧🇷</span>
                  <div>
                    <div className="text-xs font-bold">{strings.drawer.langPtTitle}</div>
                    <div className={`text-[11px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {strings.drawer.langPtDesc}
                    </div>
                  </div>
                </div>
                {language === 'pt' && (
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                      isLight ? 'bg-sky-600' : 'bg-blue-500'
                    }`}
                  >
                    ✓
                  </span>
                )}
              </button>

              {/* Option: Inglês */}
              <button
                id="lang-option-en"
                onClick={() => handleSelectLanguage('en')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all ${
                  language === 'en'
                    ? isLight
                      ? 'bg-sky-100/90 border-sky-400 text-sky-950 ring-2 ring-sky-400/30 shadow-md font-bold'
                      : 'bg-slate-800 border-blue-500 text-white ring-2 ring-blue-500/30 shadow-md font-bold'
                    : isLight
                    ? 'bg-white/90 border-sky-200 text-slate-700 hover:bg-sky-50'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <div className="text-xs font-bold">{strings.drawer.langEnTitle}</div>
                    <div className={`text-[11px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {strings.drawer.langEnDesc}
                    </div>
                  </div>
                </div>
                {language === 'en' && (
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                      isLight ? 'bg-sky-600' : 'bg-blue-500'
                    }`}
                  >
                    ✓
                  </span>
                )}
              </button>

              {/* Option: Espanhol */}
              <button
                id="lang-option-es"
                onClick={() => handleSelectLanguage('es')}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all ${
                  language === 'es'
                    ? isLight
                      ? 'bg-sky-100/90 border-sky-400 text-sky-950 ring-2 ring-sky-400/30 shadow-md font-bold'
                      : 'bg-slate-800 border-blue-500 text-white ring-2 ring-blue-500/30 shadow-md font-bold'
                    : isLight
                    ? 'bg-white/90 border-sky-200 text-slate-700 hover:bg-sky-50'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇪🇸</span>
                  <div>
                    <div className="text-xs font-bold">{strings.drawer.langEsTitle}</div>
                    <div className={`text-[11px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {strings.drawer.langEsDesc}
                    </div>
                  </div>
                </div>
                {language === 'es' && (
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
                      isLight ? 'bg-sky-600' : 'bg-blue-500'
                    }`}
                  >
                    ✓
                  </span>
                )}
              </button>

              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed mt-4 ${
                  isLight ? 'bg-white/90 border-sky-200 text-slate-600' : 'bg-slate-800/50 border-slate-800 text-slate-400'
                }`}
              >
                {strings.drawer.langFooterNote}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUB-DRAWER: SINCRONIZAÇÃO & WI-FI (SYNC) */}
        {/* ========================================================= */}
        {activeSubDrawer === 'sync' && (
          <div
            id="subdrawer-sync"
            className={`absolute inset-0 z-20 flex flex-col animate-in slide-in-from-right duration-250 transition-colors ${
              isLight ? 'bg-sky-50/95 text-slate-800' : 'bg-slate-900 text-slate-100'
            }`}
          >
            <div
              className={`p-4 border-b flex items-center justify-between transition-colors shrink-0 ${
                isLight ? 'border-sky-200 bg-white/90' : 'border-slate-800 bg-slate-950/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  id="btn-subdrawer-sync-back"
                  onClick={handleBackToMain}
                  className={`p-1.5 rounded-xl transition ${
                    isLight ? 'text-slate-600 hover:bg-sky-100' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  title={strings.common.back}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {strings.screenTitles.sync}
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {strings.sync.subtitle}
                  </p>
                </div>
              </div>
              <button
                id="btn-subdrawer-sync-close"
                onClick={handleCloseAll}
                className={`p-1.5 rounded-xl transition ${
                  isLight ? 'text-slate-500 hover:bg-sky-100' : 'text-slate-400 hover:bg-slate-800'
                }`}
                title={strings.common.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <DeviceSyncScreen espState={espState} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
