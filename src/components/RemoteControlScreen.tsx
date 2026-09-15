import React, { useState } from 'react';
import {
  Power,
  VolumeX,
  Tv,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Settings2,
  Sparkles,
  Zap,
  Sliders,
  RotateCcw,
  Home,
  Flame,
  Snowflake,
  Wind,
  Fan,
  Clock as ClockIcon,
  Timer,
  Check,
  X,
  Compass,
  AirVent,
  Droplets,
  Layers,
  Music,
  Lightbulb,
  Film,
  Maximize2,
  Shield,
  Trash2,
} from 'lucide-react';
import { IRCommand, ESP32DeviceState, RemoteDevice, RemoteLayoutType, ActivityLogItem } from '../types';
import { esp32 } from '../services/esp32Service';
import { feedback } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SoundRemote } from './remotes/SoundRemote';
import { LightsRemote } from './remotes/LightsRemote';
import { SmartBoxRemote } from './remotes/SmartBoxRemote';
import { ProjectorRemote } from './remotes/ProjectorRemote';
import { AddRemoteModal } from './AddRemoteModal';
import { ManageRemotesModal } from './ManageRemotesModal';

export type RemoteDeviceType =
  | 'tv'
  | 'ac'
  | 'sound'
  | 'lights'
  | 'smartbox'
  | 'projector'
  | 'custom';

interface RemoteControlScreenProps {
  commands: IRCommand[];
  buttonMappings: Record<string, string | string[]>;
  espState: ESP32DeviceState;
  remotes: RemoteDevice[];
  activeRemoteId?: string;
  onSelectRemoteId?: (id: string) => void;
  onAddRemote: (newRemote: RemoteDevice) => void;
  onUpdateRemote: (updated: RemoteDevice) => void;
  onDeleteRemote: (id: string) => void;
  onOpenAssignModal: (buttonKey: string, label: string, currentCommandIds?: string[]) => void;
  onLogActivity?: (log: Omit<ActivityLogItem, 'id' | 'timestamp'>) => void;
}

export const RemoteControlScreen: React.FC<RemoteControlScreenProps> = ({
  commands,
  buttonMappings,
  espState,
  remotes,
  activeRemoteId: propActiveRemoteId,
  onSelectRemoteId,
  onAddRemote,
  onUpdateRemote,
  onDeleteRemote,
  onOpenAssignModal,
  onLogActivity,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings, language } = useLanguage();

  const [isConfigMode, setIsConfigMode] = useState<boolean>(false);
  const [internalRemoteId, setInternalRemoteId] = useState<string>(remotes[0]?.id || 'tv');
  const activeRemoteId = propActiveRemoteId !== undefined ? propActiveRemoteId : internalRemoteId;
  const setActiveRemoteId = (id: string) => {
    setInternalRemoteId(id);
    onSelectRemoteId?.(id);
  };
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [isProtectedAlertOpen, setIsProtectedAlertOpen] = useState<boolean>(false);

  const [transmittingButton, setTransmittingButton] = useState<string | null>(null);
  const [lastFiredInfo, setLastFiredInfo] = useState<{ name: string; hex: string } | null>(null);

  // Active remote object
  const currentRemote =
    remotes.find((r) => r.id === activeRemoteId) ||
    remotes[0] || {
      id: 'tv',
      name: 'Televisão',
      layoutType: 'tv' as RemoteLayoutType,
      isDefault: true,
    };

  // Check if current remote is a system default
  const isCurrentDefault = Boolean(
    currentRemote.isDefault ||
    ['tv', 'ac', 'sound', 'lights', 'smartbox', 'projector', 'custom'].includes(currentRemote.id)
  );

  const activeLayout = currentRemote.layoutType;

  // Air Conditioner State Simulation
  const [acPower, setAcPower] = useState<boolean>(true);
  const [acTemp, setAcTemp] = useState<number>(22);
  const [acMode, setAcMode] = useState<'cool' | 'heat' | 'auto' | 'dry' | 'fan'>('cool');
  const [acFanSpeed, setAcFanSpeed] = useState<'auto' | 'low' | 'med' | 'high'>('auto');
  const [acSwing, setAcSwing] = useState<boolean>(true);
  const [acDir, setAcDir] = useState<number>(1);
  const [acTimerOn, setAcTimerOn] = useState<boolean>(false);
  const [acTimerOff, setAcTimerOff] = useState<boolean>(false);
  const [acTimerMinutes, setAcTimerMinutes] = useState<number>(60);
  const [acClockTime, setAcClockTime] = useState<string>('12:30');

  const getLayoutIcon = (type: RemoteLayoutType) => {
    switch (type) {
      case 'ac':
        return AirVent;
      case 'sound':
        return Music;
      case 'lights':
        return Lightbulb;
      case 'smartbox':
        return Film;
      case 'projector':
        return Maximize2;
      case 'custom':
        return Sliders;
      case 'tv':
      default:
        return Tv;
    }
  };

  const getLocalizedRemoteName = (remote: RemoteDevice) => {
    if (!remote.isDefault) return remote.name;
    switch (remote.layoutType) {
      case 'tv':
        return language === 'pt' ? 'Televisão' : language === 'es' ? 'Televisión' : 'Television';
      case 'ac':
        return language === 'pt' ? 'Ar Condicionado' : language === 'es' ? 'Aire Acondicionado' : 'Air Conditioner';
      case 'sound':
        return language === 'pt' ? 'Aparelho de Som' : language === 'es' ? 'Equipo de Sonido' : 'Sound System';
      case 'lights':
        return language === 'pt' ? 'Luminárias' : language === 'es' ? 'Luminarias' : 'Lights & RGB';
      case 'smartbox':
        return 'Smart Box';
      case 'projector':
        return language === 'pt' ? 'Projetor' : language === 'es' ? 'Proyector' : 'Projector';
      case 'custom':
      default:
        return remote.name;
    }
  };

  // Helper to find mapped command IDs array
  const getMappedCommandIds = (buttonKey: string): string[] => {
    if (!currentRemote.isDefault) {
      const specificKey = `${currentRemote.id}_${buttonKey}`;
      const specificVal = buttonMappings[specificKey];
      if (specificVal) {
        return Array.isArray(specificVal) ? specificVal : [specificVal];
      }
    }
    const defaultVal = buttonMappings[buttonKey];
    if (defaultVal) {
      return Array.isArray(defaultVal) ? defaultVal : [defaultVal];
    }
    return [];
  };

  // Helper to find mapped commands list
  const getMappedCommands = (buttonKey: string): IRCommand[] => {
    const ids = getMappedCommandIds(buttonKey);
    return ids.map((id) => commands.find((c) => c.id === id)).filter((c): c is IRCommand => Boolean(c));
  };

  // Helper to find first mapped command object (for backward compatibility / quick badges)
  const getMappedCommand = (buttonKey: string): IRCommand | undefined => {
    const cmds = getMappedCommands(buttonKey);
    return cmds[0];
  };

  // Generic Button Click Handler (supports firing multiple assigned IR commands)
  const handleButtonClick = async (
    buttonKey: string,
    label: string,
    onInteractiveUpdate?: () => void
  ) => {
    const mappedCmds = getMappedCommands(buttonKey);
    const mappedCmdIds = getMappedCommandIds(buttonKey);

    if (isConfigMode) {
      feedback.playClick(900, 0.04);
      const keyToAssign = currentRemote.isDefault ? buttonKey : `${currentRemote.id}_${buttonKey}`;
      const titleLabel = currentRemote.isDefault ? label : `${getLocalizedRemoteName(currentRemote)}: ${label}`;
      onOpenAssignModal(keyToAssign, titleLabel, mappedCmdIds);
      return;
    }

    // Run interactive state update if provided
    if (onInteractiveUpdate) {
      onInteractiveUpdate();
    }

    if (mappedCmds.length === 0) {
      feedback.playClick(600, 0.04);
      return;
    }

    // Transmit IR code(s) via ESP32 API
    setTransmittingButton(buttonKey);
    feedback.playTransmitBeep();

    let allSuccess = true;
    for (let i = 0; i < mappedCmds.length; i++) {
      const cmd = mappedCmds[i];
      if (i > 0) {
        // Natural separation delay between multiple IR pulses
        await new Promise((resolve) => setTimeout(resolve, 140));
      }
      const res = await esp32.transmitIR(cmd);
      if (!res.success) {
        allSuccess = false;
      } else if (onLogActivity) {
        onLogActivity({
          type: 'acionamento',
          title: `${language === 'pt' ? 'Acionamento' : language === 'es' ? 'Accionamiento' : 'Trigger'}: ${cmd.name}${mappedCmds.length > 1 ? ` (${i + 1}/${mappedCmds.length})` : ''}`,
          subtitle: `${language === 'pt' ? 'Controle' : language === 'es' ? 'Control' : 'Remote'}: ${getLocalizedRemoteName(currentRemote)}`,
          details: `${language === 'pt' ? 'Pulso IR transmitido no pino GPIO' : language === 'es' ? 'Pulso IR transmitido en pin GPIO' : 'IR pulse sent on GPIO pin'} ${espState.pinConfig.irTransmitterPin}`,
          protocol: cmd.protocol,
          hexCode: cmd.hexCode,
          bits: cmd.bits,
          remoteName: getLocalizedRemoteName(currentRemote),
          buttonLabel: label,
        });
      }
    }

    if (allSuccess) {
      if (mappedCmds.length === 1) {
        setLastFiredInfo({
          name: mappedCmds[0].name,
          hex: mappedCmds[0].hexCode,
        });
      } else {
        setLastFiredInfo({
          name: `${mappedCmds.length} ${language === 'pt' ? 'Comandos' : language === 'es' ? 'Comandos' : 'Commands'}: ${mappedCmds.map((c) => c.name).join(' + ')}`,
          hex: mappedCmds.map((c) => c.hexCode).join(', '),
        });
      }
      setTimeout(() => {
        setLastFiredInfo(null);
      }, 3000);
    }

    setTimeout(() => {
      setTransmittingButton(null);
    }, 350);
  };

  // Specific AC Handlers
  const handleAcPowerToggle = () => {
    handleButtonClick('ac_power', 'ON/OFF', () => {
      setAcPower((prev) => !prev);
    });
  };

  const handleAcCool = () => {
    handleButtonClick('ac_cool', 'Cool', () => {
      setAcMode('cool');
      if (!acPower) setAcPower(true);
    });
  };

  const handleAcHeat = () => {
    handleButtonClick('ac_heat', 'Heat', () => {
      setAcMode('heat');
      if (!acPower) setAcPower(true);
    });
  };

  const handleAcTempPlus = () => {
    handleButtonClick('ac_temp_plus', 'Temp +', () => {
      setAcTemp((prev) => Math.min(prev + 1, 31));
    });
  };

  const handleAcTempMinus = () => {
    handleButtonClick('ac_temp_minus', 'Temp -', () => {
      setAcTemp((prev) => Math.max(prev - 1, 16));
    });
  };

  const handleAcModeCycle = () => {
    handleButtonClick('ac_mode', 'Mode', () => {
      const modes: Array<'cool' | 'heat' | 'auto' | 'dry' | 'fan'> = ['cool', 'heat', 'auto', 'dry', 'fan'];
      const nextIdx = (modes.indexOf(acMode) + 1) % modes.length;
      setAcMode(modes[nextIdx]);
    });
  };

  const handleAcSwingToggle = () => {
    handleButtonClick('ac_swing', 'Swing', () => {
      setAcSwing((prev) => !prev);
    });
  };

  const handleAcDirCycle = () => {
    handleButtonClick('ac_dir', 'Dir', () => {
      setAcDir((prev) => (prev >= 5 ? 1 : prev + 1));
    });
  };

  const handleAcFanCycle = () => {
    handleButtonClick('ac_fan', 'Fan', () => {
      const speeds: Array<'auto' | 'low' | 'med' | 'high'> = ['auto', 'low', 'med', 'high'];
      const nextIdx = (speeds.indexOf(acFanSpeed) + 1) % speeds.length;
      setAcFanSpeed(speeds[nextIdx]);
    });
  };

  const handleAcTimePlus = () => {
    handleButtonClick('ac_time_plus', 'Time +', () => {
      setAcTimerMinutes((prev) => Math.min(prev + 30, 720));
    });
  };

  const handleAcTimeMinus = () => {
    handleButtonClick('ac_time_minus', 'Time -', () => {
      setAcTimerMinutes((prev) => Math.max(prev - 30, 30));
    });
  };

  const handleAcTimerOnToggle = () => {
    handleButtonClick('ac_timer_on', 'Timer ON', () => {
      setAcTimerOn((prev) => !prev);
    });
  };

  const handleAcTimerOffToggle = () => {
    handleButtonClick('ac_timer_off', 'Timer OFF', () => {
      setAcTimerOff((prev) => !prev);
    });
  };

  const handleAcClock = () => {
    handleButtonClick('ac_clock', 'Clock', () => {
      const now = new Date();
      setAcClockTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );
    });
  };

  const handleAcSelect = () => {
    handleButtonClick('ac_select', 'Select');
  };

  const handleAcExit = () => {
    handleButtonClick('ac_exit', 'Exit (Cancel)', () => {
      setAcTimerOn(false);
      setAcTimerOff(false);
    });
  };

  const handleAcEnter = () => {
    handleButtonClick('ac_enter', 'Enter (OK)');
  };

  // Handle Delete Active Remote
  const handleExecuteDeleteRemote = () => {
    if (isCurrentDefault) {
      setIsDeleteConfirmOpen(false);
      setIsProtectedAlertOpen(true);
      return;
    }
    feedback.playClick(300, 0.08);
    const remoteToDeleteId = currentRemote.id;
    const remoteToDeleteName = getLocalizedRemoteName(currentRemote);

    // Switch active remote to another available remote before deleting
    const nextRemote = remotes.find((r) => r.id !== remoteToDeleteId);
    if (nextRemote) {
      setActiveRemoteId(nextRemote.id);
    }

    onDeleteRemote(remoteToDeleteId);

    if (onLogActivity) {
      onLogActivity({
        type: 'sistema',
        title: language === 'pt' ? 'Controle Excluído' : language === 'es' ? 'Control Eliminado' : 'Remote Deleted',
        subtitle: remoteToDeleteName,
        details: `${language === 'pt' ? 'Controle excluído da tela Home' : language === 'es' ? 'Control eliminado de la pantalla de inicio' : 'Remote deleted from Home screen'}: ${remoteToDeleteName}`,
      });
    }

    setIsDeleteConfirmOpen(false);
  };

  return (
    <div id="remote-control-screen" className="flex flex-col items-center justify-start pb-24 px-3 pt-2 max-w-md mx-auto relative">
      {/* Floating Transmitted IR Feedback Banner */}
      {lastFiredInfo && (
        <div
          id="floating-ir-feedback"
          className="fixed top-18 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <div
            className={`w-full py-2.5 px-3.5 rounded-2xl flex items-center justify-between text-xs shadow-2xl backdrop-blur-md border ${
              isLight
                ? 'bg-white/95 border-sky-300/90 shadow-sky-900/20 text-slate-800 ring-1 ring-sky-200'
                : 'bg-slate-900/95 border-blue-500/40 shadow-black/80 text-white ring-1 ring-blue-500/30'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate mr-2">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="truncate">
                <span className={`font-bold truncate text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {lastFiredInfo.name}
                </span>
              </div>
            </div>
            <span
              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${
                isLight
                  ? 'bg-sky-100 text-sky-800 border border-sky-200'
                  : 'bg-blue-950 text-blue-300 border border-blue-800/60'
              }`}
            >
              {lastFiredInfo.hex}
            </span>
          </div>
        </div>
      )}

      {/* Moldura 1: Caixa de Seleção e Gerenciamento de Controles */}
      <div
        id="controls-selector-frame"
        className={`w-full rounded-3xl p-4 shadow-2xl relative overflow-hidden flex flex-col items-center border transition-colors mb-3 ${
          isLight
            ? 'bg-gradient-to-b from-sky-100/90 via-white to-sky-50 border-sky-200/90 shadow-sky-200/60'
            : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-800'
        }`}
      >
        {/* Header da Seleção de Controle com botões Adicionar e Gerenciar */}
        <div
          className={`w-full flex items-center justify-between px-2 pb-2 mb-2.5 border-b ${
            isLight ? 'border-sky-200/80 text-slate-700' : 'border-slate-800/80 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Tv className={`w-4 h-4 flex-shrink-0 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
            <span className="text-xs font-bold tracking-wide uppercase font-mono">
              {language === 'pt' ? 'SELEÇÃO DE CONTROLE' : language === 'es' ? 'SELECCIÓN DE CONTROL' : 'REMOTE SELECTION'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Button 1: Adicionar Novo Controle (+) */}
            <button
              id="btn-add-new-control"
              onClick={() => {
                feedback.playClick();
                setIsAddModalOpen(true);
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 ${
                isLight
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
              title={strings.remote.addRemote}
              aria-label={strings.remote.addRemote}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Button 2: Gerenciar Controles */}
            <button
              id="btn-manage-controls"
              onClick={() => {
                feedback.playClick();
                setIsManageModalOpen(true);
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border active:scale-95 ${
                isLight
                  ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-700 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
              }`}
              title={strings.remote.manageRemotes}
              aria-label={strings.remote.manageRemotes}
            >
              <Settings2 className="w-3.5 h-3.5 text-indigo-500" />
            </button>
          </div>
        </div>

        {/* Remote Category Preset Tabs */}
        <div
          className={`w-full p-1.5 rounded-2xl border transition-all ${
            isLight ? 'bg-sky-100/70 border-sky-200/90' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div
            id="control-options-wrapper"
            className="w-full flex flex-wrap items-center gap-1.5 max-h-[112px] overflow-y-auto overflow-x-hidden p-0.5 overscroll-contain"
          >
            {remotes.map((remote) => {
              const Icon = getLayoutIcon(remote.layoutType);
              const isActive = currentRemote.id === remote.id;
              const displayName = getLocalizedRemoteName(remote);

              return (
                <button
                  key={remote.id}
                  id={`tab-remote-${remote.id}`}
                  onClick={() => {
                    feedback.playClick();
                    setActiveRemoteId(remote.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative flex-grow sm:flex-grow-0 justify-center sm:justify-start ${
                    isActive
                      ? isLight
                        ? 'bg-white text-sky-900 shadow-sm border border-sky-200 ring-1 ring-sky-300'
                        : 'bg-blue-600 text-white shadow-md'
                      : isLight
                      ? 'bg-white/60 text-slate-700 hover:text-slate-950 hover:bg-white border border-sky-100/80'
                      : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[130px]">{displayName}</span>
                  {!remote.isDefault && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 ml-0.5"
                      title={language === 'pt' ? 'Controle Personalizado' : language === 'es' ? 'Control Personalizado' : 'Custom Remote'}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Moldura 2: Controle Selecionado Propriamente Dito */}
      <div
        id="active-remote-control-frame"
        className={`w-full rounded-3xl p-4 shadow-2xl relative overflow-hidden flex flex-col items-center border transition-colors ${
          isLight
            ? 'bg-gradient-to-b from-sky-100/90 via-white to-sky-50 border-sky-200/90 shadow-sky-200/60'
            : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-800'
        }`}
      >
        {/* ACTIVE SELECTED REMOTE HEADER */}
        <div
          id="selected-remote-header"
          className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border mb-3 transition-all ${
            isLight
              ? 'bg-white/90 border-sky-200/90 shadow-sm text-slate-800'
              : 'bg-slate-900/90 border-slate-800 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {(() => {
              const CurrentIcon = getLayoutIcon(currentRemote.layoutType);
              return (
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isLight ? 'bg-sky-100 text-sky-700' : 'bg-slate-800 text-sky-400'
                  }`}
                >
                  <CurrentIcon className="w-3.5 h-3.5" />
                </div>
              );
            })()}
            <span className="text-sm font-bold truncate">
              {getLocalizedRemoteName(currentRemote)}
            </span>
          </div>

          <div>
            {currentRemote.isDefault ? (
              <span
                id="badge-active-default"
                className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 flex-shrink-0"
                title="Default"
              >
                <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                {language === 'pt' ? 'PADRÃO' : language === 'es' ? 'PREDETERMINADO' : 'DEFAULT'}
              </span>
            ) : (
              <span
                id="badge-active-custom"
                className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 flex items-center gap-1 flex-shrink-0"
                title="Custom"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                {language === 'pt' ? 'PERSONALIZADO' : language === 'es' ? 'PERSONALIZADO' : 'CUSTOM'}
              </span>
            )}
          </div>
        </div>

        {/* BOTÃO EXCLUIR CONTROLE (DO LADO ESQUERDO DO BOTÃO REMAPEAR) E BOTÃO REMAPEAR */}
        <div className={`w-full flex items-center ${isConfigMode ? 'justify-between' : 'justify-end'} gap-2 mb-3 px-0.5`}>
          {isConfigMode && (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 animate-pulse truncate mr-1">
              {language === 'pt' ? 'Modo de Mapeamento IR Ativo' : language === 'es' ? 'Modo de Mapeo IR Activo' : 'IR Mapping Mode Active'}
            </span>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Botão de Excluir Controle */}
            <button
              id="btn-delete-current-remote"
              onClick={() => {
                feedback.playClick();
                if (isCurrentDefault) {
                  setIsProtectedAlertOpen(true);
                  return;
                }
                setIsDeleteConfirmOpen(true);
              }}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 shadow-sm ${
                isCurrentDefault
                  ? isLight
                    ? 'bg-slate-100/90 hover:bg-slate-200/80 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-slate-800/40 hover:bg-slate-800/70 text-slate-500 border-slate-800 cursor-not-allowed'
                  : isLight
                  ? 'bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border-rose-200/90 shadow-sm'
                  : 'bg-slate-800/90 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 border-slate-700 hover:border-rose-800/60'
              }`}
              title={
                isCurrentDefault
                  ? (language === 'pt'
                      ? 'Controle padrão do sistema (não pode ser excluído)'
                      : language === 'es'
                      ? 'Control predeterminado del sistema (no se puede eliminar)'
                      : 'Default system remote (cannot be deleted)')
                  : (language === 'pt' ? 'Excluir este controle' : language === 'es' ? 'Eliminar este control' : 'Delete this remote')
              }
              aria-label={
                isCurrentDefault
                  ? (language === 'pt' ? 'Controle padrão protegido' : language === 'es' ? 'Control predeterminado protegido' : 'Protected default remote')
                  : (language === 'pt' ? 'Excluir controle' : language === 'es' ? 'Eliminar control' : 'Delete remote')
              }
            >
              {isCurrentDefault ? (
                <Shield className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span>{language === 'pt' ? 'Excluir' : language === 'es' ? 'Eliminar' : 'Delete'}</span>
            </button>

            {/* Botão Remapear */}
            <button
              id="btn-toggle-config-mode"
              onClick={() => {
                feedback.playClick();
                setIsConfigMode(!isConfigMode);
              }}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 shadow-sm ${
                isConfigMode
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/50 ring-2 ring-amber-400/30'
                  : isLight
                  ? 'bg-white hover:bg-sky-50 text-slate-700 border-sky-200 shadow-sm'
                  : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="Mapping"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{isConfigMode ? (language === 'pt' ? 'Mapeando' : language === 'es' ? 'Mapeando' : 'Mapping') : (language === 'pt' ? 'Remapear' : language === 'es' ? 'Remapear' : 'Remap')}</span>
            </button>
          </div>
        </div>

        {/* Config Mode Active Banner Notice */}
        {isConfigMode && (
          <div
            className={`w-full mb-3 p-2.5 rounded-xl text-xs flex items-center justify-between border ${
              isLight
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-amber-950/40 border-amber-600/40 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>{strings.remote.quickMapPrompt}</span>
            </div>
            <button
              onClick={() => setIsConfigMode(false)}
              className="text-[11px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-lg shadow-sm"
            >
              {language === 'pt' ? 'Pronto' : language === 'es' ? 'Listo' : 'Done'}
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: AR CONDICIONADO REMOTE */}
        {/* ========================================================================= */}
        {activeLayout === 'ac' && (
          <div id="ac-remote-layout" className="w-full flex flex-col items-center space-y-3.5 animate-in fade-in duration-200">
            {/* ROW 1: POWER, COOL, HEAT */}
            <div className="w-full grid grid-cols-3 gap-2.5">
              <button
                id="btn-ac-cool"
                onClick={handleAcCool}
                className={`h-14 rounded-2xl border flex flex-col items-center justify-center transition-all active:scale-90 shadow-md font-bold ${
                  isConfigMode
                    ? 'border-amber-400 bg-cyan-100 text-cyan-900 ring-2 ring-amber-400/40'
                    : isLight
                    ? 'bg-gradient-to-b from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 border-cyan-300 text-white shadow-cyan-200/80'
                    : 'bg-gradient-to-b from-cyan-600 to-sky-800 border-cyan-500 text-white hover:brightness-110'
                }`}
              >
                <Snowflake className="w-5 h-5 stroke-[2.5]" />
                <span className="text-[11px] mt-0.5 font-black tracking-wide">Cool</span>
              </button>

              <button
                id="btn-ac-power"
                onClick={handleAcPowerToggle}
                className={`h-14 rounded-2xl border flex flex-col items-center justify-center transition-all active:scale-90 shadow-lg font-bold ${
                  isConfigMode
                    ? 'border-amber-400 bg-red-100 text-red-900 ring-2 ring-amber-400/40'
                    : acPower
                    ? isLight
                      ? 'bg-gradient-to-b from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 border-rose-400 text-white shadow-rose-200/80'
                      : 'bg-gradient-to-b from-red-600 to-red-800 border-red-500 text-white shadow-red-950/60'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Power className="w-5 h-5 stroke-[2.5]" />
                <span className="text-[11px] mt-0.5 font-black tracking-wide">ON/OFF</span>
              </button>

              <button
                id="btn-ac-heat"
                onClick={handleAcHeat}
                className={`h-14 rounded-2xl border flex flex-col items-center justify-center transition-all active:scale-90 shadow-md font-bold ${
                  isConfigMode
                    ? 'border-amber-400 bg-orange-100 text-orange-900 ring-2 ring-amber-400/40'
                    : isLight
                    ? 'bg-gradient-to-b from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 border-amber-300 text-white shadow-orange-200/80'
                    : 'bg-gradient-to-b from-amber-600 to-orange-800 border-amber-500 text-white hover:brightness-110'
                }`}
              >
                <Flame className="w-5 h-5 stroke-[2.5]" />
                <span className="text-[11px] mt-0.5 font-black tracking-wide">Heat</span>
              </button>
            </div>

            {/* ROW 2: TEMPERATURE CONTROL & MODE & FAN */}
            <div
              className={`w-full rounded-2xl p-3 border ${
                isLight ? 'bg-sky-100/60 border-sky-200/80' : 'bg-slate-950/60 border-slate-800/80'
              }`}
            >
              <div className={`text-[10px] font-bold mb-2 px-1 uppercase tracking-wider text-center ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {language === 'pt' ? 'Controle de Temperatura & Modos' : language === 'es' ? 'Control de Temperatura & Modos' : 'Temperature Control & Modes'}
              </div>

              <div className="grid grid-cols-4 gap-2.5 items-center">
                <button
                  id="btn-ac-mode"
                  onClick={handleAcModeCycle}
                  className={`h-14 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-90 font-bold ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : isLight
                      ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-800 shadow-sm'
                      : 'bg-slate-800/90 border-slate-700/80 text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  <Layers className={`w-4 h-4 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                  <span className="text-[10px] mt-0.5 font-extrabold">Mode</span>
                </button>

                <button
                  id="btn-ac-temp-plus"
                  onClick={handleAcTempPlus}
                  className={`h-14 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-90 shadow-md font-bold ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : isLight
                      ? 'bg-gradient-to-b from-sky-500 to-blue-600 text-white border-sky-400 shadow-sky-200'
                      : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
                  }`}
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                  <span className="text-[10px] font-black">Temp+</span>
                </button>

                <button
                  id="btn-ac-temp-minus"
                  onClick={handleAcTempMinus}
                  className={`h-14 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-90 shadow-md font-bold ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : isLight
                      ? 'bg-gradient-to-b from-sky-500 to-blue-600 text-white border-sky-400 shadow-sky-200'
                      : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
                  }`}
                >
                  <Minus className="w-5 h-5 stroke-[2.5]" />
                  <span className="text-[10px] font-black">Temp-</span>
                </button>

                <button
                  id="btn-ac-fan"
                  onClick={handleAcFanCycle}
                  className={`h-14 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-90 font-bold ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : isLight
                      ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-800 shadow-sm'
                      : 'bg-slate-800/90 border-slate-700/80 text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  <Fan className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
                  <span className="text-[10px] mt-0.5 font-extrabold">Fan</span>
                </button>
              </div>
            </div>

            {/* ROW 3: AIRFLOW (SWING & DIR) & SELECTION */}
            <div
              className={`w-full rounded-2xl p-3 border ${
                isLight ? 'bg-sky-100/60 border-sky-200/80' : 'bg-slate-950/60 border-slate-800/80'
              }`}
            >
              <div className={`text-[10px] font-bold mb-2 px-1 uppercase tracking-wider text-center ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {language === 'pt' ? 'Fluxo de Ar & Seleção' : language === 'es' ? 'Flujo de Aire & Selección' : 'Airflow & Selection'}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  id="btn-ac-swing"
                  onClick={handleAcSwingToggle}
                  className={`h-12 rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-90 font-bold ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : acSwing
                      ? isLight
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                        : 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                      : isLight
                      ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-700'
                      : 'bg-slate-800/90 border-slate-700 text-slate-300'
                  }`}
                >
                  <Wind className="w-4 h-4" />
                  <span className="text-xs">Swing</span>
                </button>

                <button
                  id="btn-ac-dir"
                  onClick={handleAcDirCycle}
                  className={`h-12 rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-90 font-bold ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : isLight
                      ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-700 shadow-sm'
                      : 'bg-slate-800/90 border-slate-700 text-slate-300'
                  }`}
                >
                  <Compass className={`w-4 h-4 ${isLight ? 'text-teal-600' : 'text-teal-400'}`} />
                  <span className="text-xs">Dir</span>
                </button>

                <button
                  id="btn-ac-select"
                  onClick={handleAcSelect}
                  className={`h-12 rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-90 font-bold ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : isLight
                      ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-700 shadow-sm'
                      : 'bg-slate-800/90 border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-xs">Select</span>
                </button>
              </div>
            </div>

            {/* ROW 4: TEMPORIZADOR E RELÓGIO */}
            <div
              className={`w-full rounded-2xl p-3 border ${
                isLight ? 'bg-sky-100/60 border-sky-200/80' : 'bg-slate-950/60 border-slate-800/80'
              }`}
            >
              <div className={`text-[10px] font-bold mb-2 px-1 uppercase tracking-wider text-center ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {language === 'pt' ? 'Temporizador & Relógio' : language === 'es' ? 'Temporizador & Reloj' : 'Timer & Clock'}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  id="btn-ac-time-plus"
                  onClick={handleAcTimePlus}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-90 font-bold text-xs ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : isLight
                      ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-800 shadow-sm'
                      : 'bg-slate-800/90 border-slate-700 text-slate-200'
                  }`}
                >
                  <Plus className="w-4 h-4 text-sky-600" />
                  <span>Time+</span>
                </button>

                <button
                  id="btn-ac-time-minus"
                  onClick={handleAcTimeMinus}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-90 font-bold text-xs ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : isLight
                      ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-800 shadow-sm'
                      : 'bg-slate-800/90 border-slate-700 text-slate-200'
                  }`}
                >
                  <Minus className="w-4 h-4 text-sky-600" />
                  <span>Time-</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  id="btn-ac-timer-on"
                  onClick={handleAcTimerOnToggle}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-1 transition-all active:scale-90 font-bold text-[11px] ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : acTimerOn
                      ? isLight
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                        : 'bg-emerald-950 border-emerald-600 text-emerald-300'
                      : isLight
                      ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-700 shadow-sm'
                      : 'bg-slate-800/90 border-slate-700 text-slate-300'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Timer ON</span>
                </button>

                <button
                  id="btn-ac-timer-off"
                  onClick={handleAcTimerOffToggle}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-1 transition-all active:scale-90 font-bold text-[11px] ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : acTimerOff
                      ? isLight
                        ? 'bg-rose-100 border-rose-400 text-rose-800'
                        : 'bg-rose-950 border-rose-600 text-rose-300'
                      : isLight
                      ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-700 shadow-sm'
                      : 'bg-slate-800/90 border-slate-700 text-slate-300'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5 text-rose-600" />
                  <span>Timer OFF</span>
                </button>

                <button
                  id="btn-ac-clock"
                  onClick={handleAcClock}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-1 transition-all active:scale-90 font-bold text-[11px] ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : isLight
                      ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-700 shadow-sm'
                      : 'bg-slate-800/90 border-slate-700 text-slate-300'
                  }`}
                >
                  <ClockIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>Clock</span>
                </button>
              </div>
            </div>

            {/* ROW 5: CONFIRMATION & CANCEL CONTROLS */}
            <div className="w-full grid grid-cols-2 gap-2.5">
              <button
                id="btn-ac-exit"
                onClick={handleAcExit}
                className={`h-12 rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-90 font-bold text-xs ${
                  isConfigMode
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : isLight
                    ? 'bg-white hover:bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                    : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <X className="w-4 h-4 text-rose-500" />
                <span>Exit (Cancel)</span>
              </button>

              <button
                id="btn-ac-enter"
                onClick={handleAcEnter}
                className={`h-12 rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-90 font-bold text-xs shadow-md ${
                  isConfigMode
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : isLight
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white border-emerald-400 shadow-emerald-200'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-500 text-white'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Enter (OK)</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: TELEVISÃO REMOTE */}
        {/* ========================================================================= */}
        {activeLayout === 'tv' && (
          <div id="tv-remote-layout" className="w-full flex flex-col items-center animate-in fade-in duration-200">
            {/* SECTION 1: POWER, MUTE, SOURCE, MENU */}
            <div className="w-full grid grid-cols-4 gap-2.5 mb-4">
              <button
                id="btn-remote-pwr"
                onClick={() => handleButtonClick('pwr', 'Liga / Desliga')}
                className={`relative flex flex-col items-center justify-center h-14 rounded-2xl border transition-all active:scale-90 shadow-md ${
                  isConfigMode
                    ? 'border-amber-400 bg-red-100 text-red-700 ring-2 ring-amber-400/40'
                    : isLight
                    ? 'bg-gradient-to-b from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 border-rose-400 text-white shadow-rose-200/80'
                    : 'bg-gradient-to-b from-red-600 to-red-800 border-red-500 text-white shadow-red-950/60 hover:brightness-110'
                }`}
              >
                <Power className="w-6 h-6 stroke-[2.5]" />
                <span className="text-[10px] font-bold mt-0.5">PWR</span>
                {isConfigMode && (
                  <span className="absolute -top-1.5 -right-1 bg-amber-500 text-white text-[9px] font-extrabold px-1 rounded-full shadow">
                    EDIT
                  </span>
                )}
              </button>

              <button
                id="btn-remote-mute"
                onClick={() => handleButtonClick('mute', 'Mudo')}
                className={`relative flex flex-col items-center justify-center h-14 rounded-2xl border transition-all active:scale-90 shadow-md ${
                  isConfigMode
                    ? 'border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-400/40'
                    : isLight
                    ? 'bg-white hover:bg-sky-50 active:bg-sky-100 border-sky-200/90 text-slate-700 shadow-sm'
                    : 'bg-slate-800/90 border-slate-700/80 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <VolumeX className={`w-5 h-5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`} />
                <span className={`text-[10px] font-semibold mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{strings.remote.mute}</span>
              </button>

              <button
                id="btn-remote-src"
                onClick={() => handleButtonClick('src', 'Source / Entrada')}
                className={`relative flex flex-col items-center justify-center h-14 rounded-2xl border transition-all active:scale-90 shadow-md ${
                  isConfigMode
                    ? 'border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-400/40'
                    : isLight
                    ? 'bg-white hover:bg-sky-50 active:bg-sky-100 border-sky-200/90 text-slate-700 shadow-sm'
                    : 'bg-slate-800/90 border-slate-700/80 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <Tv className={`w-5 h-5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                <span className={`text-[10px] font-semibold mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{strings.remote.source}</span>
              </button>

              <button
                id="btn-remote-menu"
                onClick={() => handleButtonClick('menu', 'Menu / Home')}
                className={`relative flex flex-col items-center justify-center h-14 rounded-2xl border transition-all active:scale-90 shadow-md ${
                  isConfigMode
                    ? 'border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-400/40'
                    : isLight
                    ? 'bg-white hover:bg-sky-50 active:bg-sky-100 border-sky-200/90 text-slate-700 shadow-sm'
                    : 'bg-slate-800/90 border-slate-700/80 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <Home className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span className={`text-[10px] font-semibold mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{strings.remote.menu}</span>
              </button>
            </div>

            {/* SECTION 2: COLOR BUTTONS */}
            <div
              className={`w-full mb-4 p-2 rounded-2xl border ${
                isLight ? 'bg-sky-100/60 border-sky-200/80' : 'bg-slate-950/60 border-slate-800/80'
              }`}
            >
              <div className={`text-[10px] font-bold mb-1.5 px-1 uppercase tracking-wider text-center ${
                isLight ? 'text-slate-600' : 'text-slate-500'
              }`}>
                {language === 'pt' ? 'Teclas de Cores' : language === 'es' ? 'Teclas de Colores' : 'Color Keys'}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  id="btn-remote-color-red"
                  onClick={() => handleButtonClick('color_red', 'Botão Vermelho')}
                  className={`h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 shadow-sm font-bold text-xs ${
                    isConfigMode
                      ? 'border-amber-400 bg-red-100 text-red-800'
                      : isLight
                      ? 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-700'
                      : 'bg-red-600 border-red-500 hover:bg-red-500 text-white'
                  }`}
                  title={strings.remote.red}
                >
                  <div className={`w-3 h-3 rounded-full ${isLight ? 'bg-rose-500' : 'bg-white/40'} shadow-sm`} />
                </button>

                <button
                  id="btn-remote-color-green"
                  onClick={() => handleButtonClick('color_green', 'Botão Verde')}
                  className={`h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 shadow-sm font-bold text-xs ${
                    isConfigMode
                      ? 'border-amber-400 bg-emerald-100 text-emerald-800'
                      : isLight
                      ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-700'
                      : 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white'
                  }`}
                  title={strings.remote.green}
                >
                  <div className={`w-3 h-3 rounded-full ${isLight ? 'bg-emerald-500' : 'bg-white/40'} shadow-sm`} />
                </button>

                <button
                  id="btn-remote-color-yellow"
                  onClick={() => handleButtonClick('color_yellow', 'Botão Amarelo')}
                  className={`h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 shadow-sm font-bold text-xs ${
                    isConfigMode
                      ? 'border-amber-400 bg-amber-100 text-amber-800'
                      : isLight
                      ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800'
                      : 'bg-amber-500 border-amber-400 hover:bg-amber-400 text-slate-900'
                  }`}
                  title={strings.remote.yellow}
                >
                  <div className={`w-3 h-3 rounded-full ${isLight ? 'bg-amber-500' : 'bg-black/30'} shadow-sm`} />
                </button>

                <button
                  id="btn-remote-color-blue"
                  onClick={() => handleButtonClick('color_blue', 'Botão Azul')}
                  className={`h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 shadow-sm font-bold text-xs ${
                    isConfigMode
                      ? 'border-amber-400 bg-blue-100 text-blue-800'
                      : isLight
                      ? 'bg-sky-100 hover:bg-sky-200 border-sky-300 text-sky-700'
                      : 'bg-blue-600 border-blue-500 hover:bg-blue-500 text-white'
                  }`}
                  title={strings.remote.blue}
                >
                  <div className={`w-3 h-3 rounded-full ${isLight ? 'bg-sky-500' : 'bg-white/40'} shadow-sm`} />
                </button>
              </div>
            </div>

            {/* SECTION 3: DIRECTIONAL PAD & DUAL-PILL ROCKERS */}
            <div className="w-full flex items-center justify-between gap-3 mb-4">
              {/* LEFT ROCKER: VOLUME + / - */}
              <div
                className={`flex flex-col items-center rounded-2xl p-1 shadow-sm border ${
                  isLight ? 'bg-sky-100/70 border-sky-200/90' : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <button
                  id="btn-remote-vol-plus"
                  onClick={() => handleButtonClick('vol_plus', 'Volume +')}
                  className={`w-12 h-14 rounded-t-xl flex flex-col items-center justify-center transition active:scale-95 ${
                    isLight
                      ? 'bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-700 border-b border-sky-100 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 border-b border-slate-700/60 text-slate-200'
                  }`}
                >
                  <Plus className={`w-5 h-5 ${isLight ? 'text-sky-600' : 'text-blue-400'}`} />
                </button>
                <div className={`text-[9px] font-extrabold my-1 font-mono tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  VOL
                </div>
                <button
                  id="btn-remote-vol-minus"
                  onClick={() => handleButtonClick('vol_minus', 'Volume -')}
                  className={`w-12 h-14 rounded-b-xl flex flex-col items-center justify-center transition active:scale-95 ${
                    isLight
                      ? 'bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-700 border-t border-sky-100 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 active:bg-blue-600 border-t border-slate-700/60 text-slate-200'
                  }`}
                >
                  <Minus className={`w-5 h-5 ${isLight ? 'text-sky-600' : 'text-blue-400'}`} />
                </button>
              </div>

              {/* CENTER: D-PAD */}
              <div
                className={`relative w-44 h-44 rounded-full p-2 flex items-center justify-center border-2 shadow-xl ${
                  isLight
                    ? 'bg-sky-100/90 border-sky-200/90 shadow-sky-200/50'
                    : 'bg-slate-950 border-slate-800/90 shadow-2xl'
                }`}
              >
                <button
                  id="btn-remote-dpad-up"
                  onClick={() => handleButtonClick('dpad_up', strings.remote.navUp)}
                  aria-label={strings.remote.navUp}
                  className={`absolute top-1 left-1/2 -translate-x-1/2 w-12 h-11 rounded-t-2xl flex items-center justify-center transition shadow-sm ${
                    isLight
                      ? 'bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-700 border border-sky-200/80'
                      : 'bg-slate-800/80 hover:bg-slate-700 active:bg-blue-600 text-slate-200'
                  }`}
                >
                  <ChevronUp className="w-6 h-6" />
                </button>

                <button
                  id="btn-remote-dpad-down"
                  onClick={() => handleButtonClick('dpad_down', strings.remote.navDown)}
                  aria-label={strings.remote.navDown}
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-11 rounded-b-2xl flex items-center justify-center transition shadow-sm ${
                    isLight
                      ? 'bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-700 border border-sky-200/80'
                      : 'bg-slate-800/80 hover:bg-slate-700 active:bg-blue-600 text-slate-200'
                  }`}
                >
                  <ChevronDown className="w-6 h-6" />
                </button>

                <button
                  id="btn-remote-dpad-left"
                  onClick={() => handleButtonClick('dpad_left', strings.remote.navLeft)}
                  aria-label={strings.remote.navLeft}
                  className={`absolute left-1 top-1/2 -translate-y-1/2 w-11 h-12 rounded-l-2xl flex items-center justify-center transition shadow-sm ${
                    isLight
                      ? 'bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-700 border border-sky-200/80'
                      : 'bg-slate-800/80 hover:bg-slate-700 active:bg-blue-600 text-slate-200'
                  }`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  id="btn-remote-dpad-right"
                  onClick={() => handleButtonClick('dpad_right', strings.remote.navRight)}
                  aria-label={strings.remote.navRight}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 w-11 h-12 rounded-r-2xl flex items-center justify-center transition shadow-sm ${
                    isLight
                      ? 'bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-700 border border-sky-200/80'
                      : 'bg-slate-800/80 hover:bg-slate-700 active:bg-blue-600 text-slate-200'
                  }`}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                <button
                  id="btn-remote-dpad-ok"
                  onClick={() => handleButtonClick('dpad_ok', strings.remote.navOk)}
                  className={`w-14 h-14 rounded-full font-black text-sm flex items-center justify-center shadow-lg active:scale-90 z-10 transition-all ${
                    isLight
                      ? 'bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-300/60 border border-sky-300'
                      : 'bg-gradient-to-b from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-blue-900/50 border border-blue-400/40'
                  }`}
                >
                  OK
                </button>
              </div>

              {/* RIGHT ROCKER: CANAL + / - */}
              <div
                className={`flex flex-col items-center rounded-2xl p-1 shadow-sm border ${
                  isLight ? 'bg-sky-100/70 border-sky-200/90' : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <button
                  id="btn-remote-ch-plus"
                  onClick={() => handleButtonClick('ch_plus', 'Canal +')}
                  className={`w-12 h-14 rounded-t-xl flex flex-col items-center justify-center transition active:scale-95 ${
                    isLight
                      ? 'bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-700 border-b border-sky-100 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 active:bg-purple-600 border-b border-slate-700/60 text-slate-200'
                  }`}
                >
                  <Plus className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-purple-400'}`} />
                </button>
                <div className={`text-[9px] font-extrabold my-1 font-mono tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  CH
                </div>
                <button
                  id="btn-remote-ch-minus"
                  onClick={() => handleButtonClick('ch_minus', 'Canal -')}
                  className={`w-12 h-14 rounded-b-xl flex flex-col items-center justify-center transition active:scale-95 ${
                    isLight
                      ? 'bg-white hover:bg-sky-50 active:bg-sky-100 text-slate-700 border-t border-sky-100 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 active:bg-purple-600 border-t border-slate-700/60 text-slate-200'
                  }`}
                >
                  <Minus className={`w-5 h-5 ${isLight ? 'text-indigo-600' : 'text-purple-400'}`} />
                </button>
              </div>
            </div>

            {/* SECTION 4: NUMERIC KEYPAD */}
            <div
              className={`w-full rounded-2xl p-3 border ${
                isLight ? 'bg-sky-100/60 border-sky-200/80' : 'bg-slate-950/70 border-slate-800/80'
              }`}
            >
              <div className={`text-[10px] font-bold mb-2 px-1 uppercase tracking-wider text-center ${
                isLight ? 'text-slate-600' : 'text-slate-500'
              }`}>
                {language === 'pt' ? 'Teclado Numérico' : language === 'es' ? 'Teclado Numérico' : 'Numeric Keypad'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                  const key = `num_${num}`;
                  const mapped = getMappedCommand(key);
                  return (
                    <button
                      key={num}
                      id={`btn-remote-num-${num}`}
                      onClick={() => handleButtonClick(key, `${language === 'pt' ? 'Dígito' : language === 'es' ? 'Dígito' : 'Digit'} ${num}`)}
                      className={`h-11 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-90 font-bold ${
                        isConfigMode
                          ? isLight
                            ? 'border-amber-400 bg-amber-50 text-amber-800'
                            : 'border-amber-400/80 bg-slate-900 text-amber-300'
                          : isLight
                          ? 'bg-white hover:bg-sky-50 active:bg-sky-100 border-sky-200 text-slate-800 shadow-sm'
                          : mapped
                          ? 'bg-slate-800/90 border-slate-700/80 text-white hover:bg-slate-700 active:bg-blue-600'
                          : 'bg-slate-900/60 border-slate-800/60 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="text-base leading-none">{num}</span>
                    </button>
                  );
                })}

                {/* Back button */}
                <button
                  id="btn-remote-back"
                  onClick={() => handleButtonClick('back', strings.remote.back)}
                  className={`h-11 rounded-xl border flex items-center justify-center active:scale-90 transition ${
                    isLight
                      ? 'bg-white hover:bg-sky-50 text-slate-600 border-sky-200 shadow-sm'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Zero */}
                <button
                  id="btn-remote-num-0"
                  onClick={() => handleButtonClick('num_0', `${language === 'pt' ? 'Dígito 0' : language === 'es' ? 'Dígito 0' : 'Digit 0'}`)}
                  className={`h-11 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-90 font-bold ${
                    isConfigMode
                      ? isLight
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-amber-400/80 bg-slate-900 text-amber-300'
                      : isLight
                      ? 'bg-white hover:bg-sky-50 active:bg-sky-100 border-sky-200 text-slate-800 shadow-sm'
                      : 'bg-slate-800/90 border-slate-700/80 text-white hover:bg-slate-700 active:bg-blue-600'
                  }`}
                >
                  <span className="text-base leading-none">0</span>
                </button>

                {/* Exit / Info */}
                <button
                  id="btn-remote-exit"
                  onClick={() => handleButtonClick('exit', 'Exit / Info')}
                  className={`h-11 rounded-xl border flex items-center justify-center active:scale-90 text-xs font-bold transition ${
                    isLight
                      ? 'bg-white hover:bg-sky-50 text-slate-600 border-sky-200 shadow-sm'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  EXIT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: APARELHO DE SOM REMOTE */}
        {/* ========================================================================= */}
        {activeLayout === 'sound' && (
          <SoundRemote
            isLight={isLight}
            isConfigMode={isConfigMode}
            getMappedCommand={getMappedCommand}
            onButtonClick={handleButtonClick}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: LUMINÁRIAS REMOTE */}
        {/* ========================================================================= */}
        {activeLayout === 'lights' && (
          <LightsRemote
            isLight={isLight}
            isConfigMode={isConfigMode}
            getMappedCommand={getMappedCommand}
            onButtonClick={handleButtonClick}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: SMART BOX REMOTE */}
        {/* ========================================================================= */}
        {activeLayout === 'smartbox' && (
          <SmartBoxRemote
            isLight={isLight}
            isConfigMode={isConfigMode}
            getMappedCommand={getMappedCommand}
            onButtonClick={handleButtonClick}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 6: PROJETOR REMOTE */}
        {/* ========================================================================= */}
        {activeLayout === 'projector' && (
          <ProjectorRemote
            isLight={isLight}
            isConfigMode={isConfigMode}
            getMappedCommand={getMappedCommand}
            onButtonClick={handleButtonClick}
          />
        )}

        {/* ========================================================================= */}
        {/* VIEW 7: CUSTOM REMOTE */}
        {/* ========================================================================= */}
        {activeLayout === 'custom' && (
          <div id="custom-remote-layout" className="w-full flex flex-col items-center space-y-3 animate-in fade-in duration-200">
            <div
              className={`w-full p-3 rounded-2xl border text-center ${
                isLight ? 'bg-sky-100/60 border-sky-200/80' : 'bg-slate-950/60 border-slate-800/80'
              }`}
            >
              <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {language === 'pt'
                  ? 'Painel de botões personalizados. Toque em Remapear para vincular qualquer sinal IR gravado do ESP32 a estas teclas rápidas.'
                  : language === 'es'
                  ? 'Panel de botones personalizados. Toque en Remapear para vincular señales IR grabadas a estas teclas rápidas.'
                  : 'Custom button pad. Tap Remap to link recorded ESP32 IR signals to these quick keys.'}
              </p>
            </div>

            <div className="w-full grid grid-cols-2 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
                const key = `custom_btn_${idx}`;
                const mapped = getMappedCommand(key);
                return (
                  <button
                    key={key}
                    id={`btn-custom-${idx}`}
                    onClick={() => handleButtonClick(key, `Custom ${idx}`)}
                    className={`h-16 rounded-2xl border p-2 flex flex-col items-center justify-center transition-all active:scale-95 text-left ${
                      isConfigMode
                        ? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-400/40'
                        : isLight
                        ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-800 shadow-sm'
                        : mapped
                        ? 'bg-slate-800/90 border-slate-700 text-white'
                        : 'bg-slate-900/60 border-slate-800/60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 w-full justify-center">
                      <Zap className={`w-4 h-4 ${mapped ? 'text-amber-500' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold truncate">
                        {mapped ? mapped.name : `${language === 'pt' ? 'Botão' : language === 'es' ? 'Botón' : 'Button'} #${idx}`}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-full">
                      {mapped ? mapped.hexCode : strings.remote.noCommandsAssigned}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Adicionar Novo Controle */}
      <AddRemoteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddRemote={(newRemote) => {
          onAddRemote(newRemote);
          setActiveRemoteId(newRemote.id);
        }}
      />

      {/* Modal 2: Gerenciar Controles */}
      <ManageRemotesModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        remotes={remotes}
        activeRemoteId={activeRemoteId}
        onSelectRemote={(id) => setActiveRemoteId(id)}
        onUpdateRemote={onUpdateRemote}
        onDeleteRemote={(id) => {
          onDeleteRemote(id);
          if (activeRemoteId === id) {
            setActiveRemoteId('tv');
          }
        }}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Modal 3: Aviso de Controle Padrão Protegido */}
      {isProtectedAlertOpen && (
        <div
          id="modal-protected-remote-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsProtectedAlertOpen(false);
            }
          }}
        >
          <div
            id="modal-protected-remote-content"
            role="dialog"
            aria-modal="true"
            className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl transition-all animate-in zoom-in-95 duration-200 ${
              isLight
                ? 'bg-white border-amber-200 text-slate-900 shadow-amber-950/10'
                : 'bg-slate-900 border-slate-800 text-white shadow-black/80'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-200 dark:border-amber-900">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">
                  {language === 'pt' ? 'Controle Padrão Protegido' : language === 'es' ? 'Control Predeterminado Protegido' : 'Protected Default Remote'}
                </h3>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {language === 'pt' ? 'PADRÃO DO SISTEMA' : language === 'es' ? 'PREDETERMINADO' : 'SYSTEM DEFAULT'}
                </span>
              </div>
            </div>

            <p className={`text-xs leading-relaxed mb-4 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              {language === 'pt' ? (
                <>
                  O controle <strong>"{getLocalizedRemoteName(currentRemote)}"</strong> é um controle padrão pré-configurado do sistema e <strong>não pode ser excluído</strong>.
                  <span className="block mt-2 text-slate-500 dark:text-slate-400">
                    Apenas controles personalizados adicionados por você podem ser renomeados ou excluídos.
                  </span>
                </>
              ) : language === 'es' ? (
                <>
                  El control <strong>"{getLocalizedRemoteName(currentRemote)}"</strong> es un control predeterminado del sistema y <strong>no se puede eliminar</strong>.
                  <span className="block mt-2 text-slate-500 dark:text-slate-400">
                    Solo los controles personalizados agregados por usted pueden renombrarse o eliminarse.
                  </span>
                </>
              ) : (
                <>
                  The <strong>"{getLocalizedRemoteName(currentRemote)}"</strong> remote is a preconfigured system default and <strong>cannot be deleted</strong>.
                  <span className="block mt-2 text-slate-500 dark:text-slate-400">
                    Only custom remotes added by you can be renamed or deleted.
                  </span>
                </>
              )}
            </p>

            <div className="flex items-center justify-end">
              <button
                id="btn-close-protected-alert"
                type="button"
                onClick={() => {
                  feedback.playClick();
                  setIsProtectedAlertOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition active:scale-95"
              >
                {language === 'pt' ? 'Entendi' : language === 'es' ? 'Entendido' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Confirmação de Exclusão de Controle Personalizado */}
      {isDeleteConfirmOpen && !isCurrentDefault && (
        <div
          id="modal-delete-remote-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDeleteConfirmOpen(false);
            }
          }}
        >
          <div
            id="modal-delete-remote-content"
            role="dialog"
            aria-modal="true"
            className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl transition-all animate-in zoom-in-95 duration-200 ${
              isLight
                ? 'bg-white border-rose-200 text-slate-900 shadow-rose-950/10'
                : 'bg-slate-900 border-slate-800 text-white shadow-black/80'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 border border-rose-200 dark:border-rose-900">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">
                  {language === 'pt' ? 'Excluir Controle?' : language === 'es' ? '¿Eliminar Control?' : 'Delete Remote?'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'pt' ? 'Confirmação necessária' : language === 'es' ? 'Confirmación requerida' : 'Confirmation required'}
                </p>
              </div>
            </div>

            <p className={`text-xs leading-relaxed mb-4 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              {language === 'pt' ? (
                <>
                  Tem certeza de que deseja excluir o controle personalizado <strong>"{getLocalizedRemoteName(currentRemote)}"</strong>?
                  <span className="block mt-1.5 text-slate-500 dark:text-slate-400">
                    Ele será removido da tela Home e da sua lista de aparelhos.
                  </span>
                </>
              ) : language === 'es' ? (
                <>
                  ¿Está seguro de que desea eliminar el control personalizado <strong>"{getLocalizedRemoteName(currentRemote)}"</strong>?
                  <span className="block mt-1.5 text-slate-500 dark:text-slate-400">
                    Se eliminará de la pantalla principal y de su lista de dispositivos.
                  </span>
                </>
              ) : (
                <>
                  Are you sure you want to delete the custom <strong>"{getLocalizedRemoteName(currentRemote)}"</strong> remote?
                  <span className="block mt-1.5 text-slate-500 dark:text-slate-400">
                    It will be removed from the Home screen and your device list.
                  </span>
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                id="btn-cancel-delete-remote"
                type="button"
                onClick={() => {
                  feedback.playClick();
                  setIsDeleteConfirmOpen(false);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                }`}
              >
                {strings.common.cancel}
              </button>
              <button
                id="btn-confirm-delete-remote"
                type="button"
                onClick={handleExecuteDeleteRemote}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'pt' ? 'Sim, Excluir' : language === 'es' ? 'Sí, Eliminar' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
