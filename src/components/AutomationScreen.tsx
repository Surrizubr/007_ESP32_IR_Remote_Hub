import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Play,
  Clock,
  Sparkles,
  Info,
  Radio,
  Send,
  ChevronRight,
  Check,
  X,
  AlarmClock,
  Calendar,
  Layers,
  Filter,
} from 'lucide-react';
import { AutomationRule, AutomationType, IRCommand, ESP32DeviceState, ActivityLogItem } from '../types';
import { esp32 } from '../services/esp32Service';
import { feedback } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface CompactCommandPickerProps {
  value: string;
  onChange: (commandId: string) => void;
  commands: IRCommand[];
  isLight: boolean;
  accentColor?: 'purple' | 'sky';
  id?: string;
  allowDisable?: boolean;
}

const CompactCommandPicker: React.FC<CompactCommandPickerProps> = ({
  value,
  onChange,
  commands,
  isLight,
  accentColor = 'sky',
  id,
  allowDisable = false,
}) => {
  const { strings } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedCommand = useMemo(
    () => commands.find((c) => c.id === value),
    [commands, value]
  );

  const filteredCommands = useMemo(() => {
    if (!searchTerm.trim()) return commands;
    const term = searchTerm.toLowerCase().trim();
    return commands.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.hexCode.toLowerCase().includes(term) ||
        c.protocol.toLowerCase().includes(term)
    );
  }, [commands, searchTerm]);

  return (
    <div className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={() => {
          feedback.playClick();
          setSearchTerm('');
          setIsOpen(true);
        }}
        className={`w-full rounded-xl px-2.5 py-1.5 text-[11px] font-mono flex items-center justify-between border transition text-left active:scale-[0.99] ${
          accentColor === 'purple'
            ? isLight
              ? 'bg-white border-purple-300 hover:border-purple-500 text-slate-800'
              : 'bg-slate-900 border-slate-700 hover:border-purple-500 text-white'
            : isLight
            ? 'bg-white border-sky-300 hover:border-sky-500 text-slate-800'
            : 'bg-slate-950 border-slate-700 hover:border-blue-500 text-white'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate mr-2">
          {selectedCommand ? (
            <>
              <span
                className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                  accentColor === 'purple'
                    ? isLight
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-purple-950 text-purple-300 border border-purple-800'
                    : isLight
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}
              >
                [{selectedCommand.protocol}]
              </span>
              <span className="font-semibold truncate">{selectedCommand.name}</span>
              <span className="text-[10px] opacity-70 truncate font-mono">
                ({selectedCommand.hexCode})
              </span>
            </>
          ) : allowDisable && !value ? (
            <span className="font-bold text-rose-500 flex items-center gap-1">
              <span>🚫</span>
              <span>{strings.automation.disableIROption}</span>
              <span className="text-[10px] opacity-75 font-normal">
                ({strings.automation.disableIRHelp})
              </span>
            </span>
          ) : (
            <span className="text-slate-400 font-sans italic">{strings.automation.commandSelectLabel}</span>
          )}
        </div>
        <span className="text-[10px] opacity-50 shrink-0">▼</span>
      </button>

      {/* Modal / Dropdown Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl p-3 shadow-2xl flex flex-col max-h-[80vh] border animate-in zoom-in-95 duration-150 ${
              isLight
                ? 'bg-white border-sky-200 text-slate-800'
                : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Title & Close */}
            <div className={`flex items-center justify-between pb-2 mb-2 border-b ${isLight ? 'border-sky-100' : 'border-slate-800'}`}>
              <div className="flex items-center gap-1.5 font-bold text-xs">
                {accentColor === 'purple' ? (
                  <Radio className="w-4 h-4 text-purple-500" />
                ) : (
                  <Send className="w-4 h-4 text-sky-500" />
                )}
                <span>
                  {accentColor === 'purple' ? strings.automation.triggerIRLabel : strings.automation.actionsSectionTitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded-xl transition ${
                  isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={strings.copy.searchPlaceholder}
                autoFocus
                className={`w-full rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none border ${
                  isLight
                    ? 'bg-sky-50/60 border-sky-200 text-slate-800 focus:border-sky-500'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                }`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* DESABILITAR Option if allowDisable */}
            {allowDisable && (
              <div className="mb-2 pb-1.5 border-b border-purple-200/50 dark:border-purple-900/30">
                <button
                  type="button"
                  onClick={() => {
                    feedback.playClick();
                    onChange('');
                    setIsOpen(false);
                  }}
                  className={`w-full py-2 px-2.5 rounded-xl text-left transition flex items-center justify-between border ${
                    !value
                      ? isLight
                        ? 'bg-purple-100 border-purple-500 text-purple-950 font-bold'
                        : 'bg-purple-950 border-purple-400 text-white font-bold'
                      : isLight
                      ? 'bg-purple-50/50 hover:bg-purple-100/70 border-purple-200 text-purple-900 font-medium'
                      : 'bg-slate-950/60 hover:bg-purple-950/40 border-purple-900/40 text-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                      !value
                        ? isLight
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-500 text-white'
                        : isLight
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {strings.automation.disableIROption}
                    </span>
                    <span className="text-[11px]">{strings.automation.disableIRHelp}</span>
                  </div>
                  {!value && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                </button>
              </div>
            )}

            {/* Compact Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-1 py-1 pr-0.5 max-h-[55vh]">
              {filteredCommands.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  {strings.copy.noSavedCommands}
                </div>
              ) : (
                filteredCommands.map((cmd) => {
                  const isSelected = cmd.id === value;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => {
                        feedback.playClick();
                        onChange(cmd.id);
                        setIsOpen(false);
                      }}
                      className={`w-full py-1.5 px-2.5 rounded-xl text-left transition flex items-center justify-between border ${
                        isSelected
                          ? isLight
                            ? 'bg-sky-100/90 border-sky-400 text-sky-950 shadow-xs'
                            : 'bg-blue-950/80 border-blue-600 text-white shadow-xs'
                          : isLight
                          ? 'bg-slate-50/70 hover:bg-sky-50 border-transparent hover:border-sky-200 text-slate-700'
                          : 'bg-slate-950/50 hover:bg-slate-800/80 border-transparent hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate mr-1.5 text-[11px] font-mono leading-tight">
                        <span
                          className={`px-1 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                            isLight
                              ? isSelected ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'
                              : isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          [{cmd.protocol}]
                        </span>
                        <span className="font-semibold truncate">{cmd.name}</span>
                        <span className="text-[10px] opacity-70 shrink-0 font-mono">({cmd.hexCode})</span>
                      </div>

                      {isSelected && (
                        <Check className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-sky-700' : 'text-blue-400'}`} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface AutomationScreenProps {
  automations: AutomationRule[];
  commands: IRCommand[];
  onSaveAutomation: (rule: AutomationRule) => void;
  onDeleteAutomation: (id: string) => void;
  onToggleAutomation: (id: string) => void;
  espState: ESP32DeviceState;
  onLogActivity?: (log: Omit<ActivityLogItem, 'id' | 'timestamp'>) => void;
  mode?: 'trigger' | 'schedule';
}

export const AutomationScreen: React.FC<AutomationScreenProps> = ({
  automations,
  commands,
  onSaveAutomation,
  onDeleteAutomation,
  onToggleAutomation,
  espState,
  onLogActivity,
  mode,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings } = useLanguage();

  const isScheduleMode = mode === 'schedule';
  const isTriggerMode = mode === 'trigger';
  const isDedicatedMode = Boolean(mode);

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [ruleType, setRuleType] = useState<AutomationType>(isScheduleMode ? 'schedule' : 'trigger');
  const [filterType, setFilterType] = useState<'all' | 'trigger' | 'schedule'>('all');

  // Keep ruleType synchronized with dedicated mode
  useEffect(() => {
    if (mode === 'schedule') {
      setRuleType('schedule');
    } else if (mode === 'trigger') {
      setRuleType('trigger');
    }
  }, [mode]);

  const [ruleName, setRuleName] = useState<string>('');
  const [triggerCommandId, setTriggerCommandId] = useState<string>(commands[0]?.id || '');
  const [scheduleTimes, setScheduleTimes] = useState<string[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [inputTime, setInputTime] = useState<string>('08:00');
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  const [actionSteps, setActionSteps] = useState<Array<{ commandId: string; delayMs: number }>>([
    { commandId: commands[1]?.id || commands[0]?.id || '', delayMs: 500 },
  ]);
  const [description, setDescription] = useState<string>('');

  // Simulation execution state
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null);
  const [executionStep, setExecutionStep] = useState<number>(0);

  // Helper to determine the concrete rule type (Trigger vs Schedule)
  const getRuleType = (rule: AutomationRule): AutomationType => {
    if (rule.type) return rule.type;
    if (rule.triggerCommandId) return 'trigger';
    if (rule.scheduleTimes && rule.scheduleTimes.length > 0) return 'schedule';
    return 'trigger';
  };

  const filteredAutomations = useMemo(() => {
    if (mode === 'trigger') {
      return automations.filter((r) => getRuleType(r) === 'trigger');
    }
    if (mode === 'schedule') {
      return automations.filter((r) => getRuleType(r) === 'schedule');
    }
    if (filterType === 'all') return automations;
    return automations.filter((r) => getRuleType(r) === filterType);
  }, [automations, mode, filterType]);

  const triggerRulesCount = useMemo(() => {
    return automations.filter((r) => getRuleType(r) === 'trigger').length;
  }, [automations]);

  const scheduleRulesCount = useMemo(() => {
    return automations.filter((r) => getRuleType(r) === 'schedule').length;
  }, [automations]);

  const handleAddActionStep = () => {
    feedback.playClick();
    const fallbackCmd = commands[0]?.id || '';
    setActionSteps((prev) => [...prev, { commandId: fallbackCmd, delayMs: 500 }]);
  };

  const handleRemoveActionStep = (index: number) => {
    feedback.playClick();
    if (actionSteps.length <= 1) return;
    setActionSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateActionCommand = (index: number, commandId: string) => {
    setActionSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], commandId };
      return next;
    });
    setFormError(null);
  };

  const handleUpdateActionDelay = (index: number, delayMs: number) => {
    setActionSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], delayMs: Math.max(0, isNaN(delayMs) ? 0 : delayMs) };
      return next;
    });
  };

  // Add a schedule time to state
  const handleAddScheduleTime = (timeToAdd?: string) => {
    const t = (timeToAdd || inputTime).trim();
    if (!t) return;
    // Validate HH:MM format
    if (!/^\d{1,2}:\d{2}$/.test(t)) {
      setFormError('Formato inválido. Utilize HH:MM (ex: 08:30).');
      return;
    }
    // Normalize to HH:MM (e.g. 8:30 -> 08:30)
    const parts = t.split(':');
    const normalizedTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;

    if (!scheduleTimes.includes(normalizedTime)) {
      feedback.playClick();
      setScheduleTimes((prev) => [...prev, normalizedTime].sort());
      setFormError(null);
    }
  };

  const handleRemoveScheduleTime = (timeToRemove: string) => {
    feedback.playClick();
    setScheduleTimes((prev) => prev.filter((t) => t !== timeToRemove));
  };

  // Create rule enforcing strict exclusivity: EITHER Trigger OR Schedule, never both
  const handleCreateRule = () => {
    setFormError(null);

    const effectiveRuleType: AutomationType = mode || ruleType;

    let resolvedTriggerCommandId: string | undefined = undefined;
    let resolvedScheduleTimes: string[] | undefined = undefined;

    if (effectiveRuleType === 'trigger') {
      if (!triggerCommandId || triggerCommandId.trim().length === 0) {
        setFormError(strings.automation.errorSelectTriggerCmd);
        return;
      }
      resolvedTriggerCommandId = triggerCommandId;
      resolvedScheduleTimes = undefined;
    } else {
      // ruleType === 'schedule'
      if (scheduleTimes.length === 0) {
        setFormError(strings.automation.errorAddScheduleTime);
        return;
      }
      resolvedTriggerCommandId = undefined;
      resolvedScheduleTimes = [...scheduleTimes].sort();
    }

    // Resolve valid action steps
    const validActions = actionSteps
      .map((s) => ({
        commandId: s.commandId || commands[0]?.id || '',
        delayMs: Math.max(0, Number(s.delayMs) || 0),
      }))
      .filter((s) => Boolean(s.commandId));

    if (validActions.length === 0) {
      setFormError(strings.automation.validationActionRequired);
      return;
    }

    // Auto-generate name if user left it blank
    const triggerCmd = commands.find((c) => c.id === resolvedTriggerCommandId);
    const resolvedName =
      ruleName.trim() ||
      (effectiveRuleType === 'trigger' && triggerCmd
        ? `Gatilho: ${triggerCmd.name}`
        : effectiveRuleType === 'schedule' && resolvedScheduleTimes
        ? `Agendamento (${resolvedScheduleTimes.join(', ')})`
        : `Regra #${automations.length + 1}`);

    const newRule: AutomationRule = {
      id: `auto-${Date.now()}`,
      name: resolvedName,
      type: effectiveRuleType,
      enabled: true,
      triggerCommandId: resolvedTriggerCommandId,
      scheduleTimes: resolvedScheduleTimes,
      actions: validActions,
      description: description.trim() || undefined,
      triggerCount: 0,
    };

    onSaveAutomation(newRule);
    feedback.playCaptureSuccess();

    // Show temporary confirmation toast
    setSaveSuccessNotice(strings.automation.ruleSavedSuccess.replace('{name}', resolvedName));
    setTimeout(() => setSaveSuccessNotice(null), 4000);

    // Reset and close form
    setIsCreating(false);
    setRuleName('');
    setDescription('');
    setFormError(null);
    setTriggerCommandId(commands[0]?.id || '');
    setScheduleTimes([]);
    setActionSteps([
      { commandId: commands[1]?.id || commands[0]?.id || '', delayMs: 500 },
    ]);
  };

  // Test executing a rule directly
  const handleTestRule = async (rule: AutomationRule) => {
    const triggerCmd = commands.find((c) => c.id === rule.triggerCommandId);
    const isTrigger = getRuleType(rule) === 'trigger';

    setRunningRuleId(rule.id);
    setExecutionStep(1); // Trigger received
    feedback.playClick(900, 0.05);

    // Simulate ESP32 IR detection if IR trigger exists
    if (triggerCmd) {
      esp32.simulateIncomingIR(triggerCmd.protocol, triggerCmd.hexCode, triggerCmd.bits);
    }

    for (let i = 0; i < rule.actions.length; i++) {
      const act = rule.actions[i];
      const actCmd = commands.find((c) => c.id === act.commandId);
      if (actCmd) {
        await new Promise((r) => setTimeout(r, act.delayMs || 600));
        setExecutionStep(i + 2);
        feedback.playTransmitBeep();
        await esp32.transmitIR(actCmd);
      }
    }

    // Add log to centralized history
    if (onLogActivity) {
      const triggerLabel = isTrigger && triggerCmd
        ? `Gatilho IR: ${triggerCmd.name}`
        : rule.scheduleTimes && rule.scheduleTimes.length > 0
        ? `Horário: ${rule.scheduleTimes.join(', ')}`
        : 'Disparo Simulado';

      onLogActivity({
        type: 'automacao',
        title: `${rule.name}`,
        subtitle: triggerLabel,
        details: `${rule.actions.length} ação(ões) transmitida(s) pelo ESP32`,
        actionsCount: rule.actions.length,
      });
    }

    setTimeout(() => {
      setRunningRuleId(null);
      setExecutionStep(0);
    }, 1200);
  };

  return (
    <div id="automation-screen" className="flex flex-col pb-24 px-3 pt-2 max-w-md mx-auto space-y-4">
      {/* Header card */}
      <div
        className={`rounded-3xl p-4 shadow-xl border transition-colors ${
          isLight
            ? 'bg-white/95 border-sky-200 shadow-sky-100/70'
            : isScheduleMode
            ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-amber-900/50'
            : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-purple-900/50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm ${
                isScheduleMode
                  ? isLight
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-600/30 text-amber-400 border-amber-500/40'
                  : isLight
                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                  : 'bg-purple-600/30 text-purple-400 border-purple-500/40'
              }`}
            >
              {isScheduleMode ? <Clock className="w-4.5 h-4.5" /> : <Radio className="w-4.5 h-4.5" />}
            </div>
            <div>
              <h2 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isScheduleMode ? strings.schedule.title : strings.automation.title}
              </h2>
              <p className={`text-[11px] ${
                isScheduleMode
                  ? isLight ? 'text-amber-800' : 'text-amber-400'
                  : isLight ? 'text-purple-800' : 'text-purple-400'
              }`}>
                {isScheduleMode ? strings.schedule.subtitle : 'Rotinas ativadas por sinais infravermelhos recebidos'}
              </p>
            </div>
          </div>

          <button
            id="btn-open-create-automation"
            onClick={() => {
              feedback.playClick();
              setIsCreating(!isCreating);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 shadow-md ${
              isScheduleMode
                ? isLight
                  ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-amber-200'
                  : 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-950'
                : isLight
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-200'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>
              {isCreating
                ? strings.automation.cancelBtn
                : isScheduleMode
                ? strings.schedule.createRuleBtn
                : 'Nova Regra'}
            </span>
          </button>
        </div>

        <p className={`text-xs mt-3 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          {isScheduleMode
            ? strings.schedule.explanationNotice
            : 'Crie regras acionadas exclusivamente pela leitura de um código infravermelho no receptor do ESP32. Ao receber o comando configurado, o ESP32 transmitirá a sequência de ações com os intervalos definidos.'}
        </p>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessNotice && (
        <div
          id="toast-save-automation-success"
          className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-200 ${
            isLight
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-100'
              : 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessNotice(null)}
            className="p-1 rounded-lg hover:bg-emerald-200/50 transition text-emerald-700 dark:text-emerald-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* CREATE NEW AUTOMATION FORM */}
      {isCreating && (
        <div
          id="create-automation-panel"
          className={`rounded-3xl p-4 shadow-2xl space-y-3.5 animate-in zoom-in-95 border-2 transition-colors ${
            ruleType === 'trigger'
              ? isLight
                ? 'bg-white border-purple-400 text-slate-800 shadow-purple-100/60'
                : 'bg-slate-900 border-purple-600/80 text-white shadow-purple-950/40'
              : isLight
              ? 'bg-white border-amber-400 text-slate-800 shadow-amber-100/60'
              : 'bg-slate-900 border-amber-500/80 text-white shadow-amber-950/40'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between pb-2 border-b ${
            (mode === 'schedule' || ruleType === 'schedule')
              ? isLight ? 'border-amber-200' : 'border-amber-900/50'
              : isLight ? 'border-purple-200' : 'border-purple-900/50'
          }`}>
            <h3 className={`font-bold text-sm flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Sparkles className={`w-4 h-4 ${(mode === 'schedule' || ruleType === 'schedule') ? 'text-amber-500' : 'text-purple-500'}`} />
              <span>
                {isScheduleMode
                  ? strings.schedule.createRuleBtn
                  : 'Nova Regra'}
              </span>
            </h3>
            {(mode === 'schedule' || ruleType === 'schedule') && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isLight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {`⏰ ${strings.automation.scheduleBadge}`}
              </span>
            )}
          </div>

          {/* DEDICATED MODE BANNER vs TYPE SWITCHER */}
          {isDedicatedMode ? (
            <div
              className={`px-3 py-2 rounded-2xl border text-xs flex items-center justify-between font-semibold ${
                isScheduleMode
                  ? isLight
                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                    : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                  : isLight
                  ? 'bg-purple-50/90 border-purple-200 text-purple-900'
                  : 'bg-purple-950/40 border-purple-800/80 text-purple-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {isScheduleMode ? (
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <Radio className="w-4 h-4 text-purple-600 shrink-0" />
                )}
                <span>
                  {isScheduleMode
                    ? 'Programação exclusiva por horário. O ESP32 acionará a rotina nos horários definidos.'
                    : 'Gatilho exclusivo por sinal IR recebido pelo sensor do ESP32.'}
                </span>
              </div>
            </div>
          ) : (
            /* SELECT AUTOMATION TYPE: TRIGGER vs SCHEDULE (STRICTLY MUTUALLY EXCLUSIVE) */
            <div>
              <label className={`block text-[11px] font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {strings.automation.ruleTypeSelectLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* TRIGGER OPTION (PURPLE THEME) */}
                <button
                  type="button"
                  id="btn-select-type-trigger"
                  onClick={() => {
                    feedback.playClick();
                    setRuleType('trigger');
                    setFormError(null);
                  }}
                  className={`p-3 rounded-2xl border-2 transition text-left flex flex-col gap-1 relative active:scale-[0.98] ${
                    ruleType === 'trigger'
                      ? isLight
                        ? 'bg-purple-50 border-purple-500 text-purple-950 shadow-md shadow-purple-100 ring-2 ring-purple-300/50'
                        : 'bg-purple-950/50 border-purple-500 text-purple-100 shadow-md shadow-purple-950 ring-2 ring-purple-500/30'
                      : isLight
                      ? 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-purple-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Radio className={`w-4 h-4 ${ruleType === 'trigger' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                      <span>{strings.automation.ruleTypeTrigger}</span>
                    </div>
                    {ruleType === 'trigger' && (
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                    )}
                  </div>
                  <p className={`text-[10px] leading-tight ${
                    ruleType === 'trigger'
                      ? isLight ? 'text-purple-800' : 'text-purple-300'
                      : 'text-slate-400'
                  }`}>
                    {strings.automation.ruleTypeTriggerSubtitle}
                  </p>
                </button>

                {/* SCHEDULE OPTION (AMBER THEME) */}
                <button
                  type="button"
                  id="btn-select-type-schedule"
                  onClick={() => {
                    feedback.playClick();
                    setRuleType('schedule');
                    setFormError(null);
                  }}
                  className={`p-3 rounded-2xl border-2 transition text-left flex flex-col gap-1 relative active:scale-[0.98] ${
                    ruleType === 'schedule'
                      ? isLight
                        ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-md shadow-amber-100 ring-2 ring-amber-300/50'
                        : 'bg-amber-950/50 border-amber-500 text-amber-100 shadow-md shadow-amber-950 ring-2 ring-amber-500/30'
                      : isLight
                      ? 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-amber-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlarmClock className={`w-4 h-4 ${ruleType === 'schedule' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                      <span>{strings.automation.ruleTypeSchedule}</span>
                    </div>
                    {ruleType === 'schedule' && (
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <p className={`text-[10px] leading-tight ${
                    ruleType === 'schedule'
                      ? isLight ? 'text-amber-800' : 'text-amber-300'
                      : 'text-slate-400'
                  }`}>
                    {strings.automation.ruleTypeScheduleSubtitle}
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Rule Name input */}
          <div>
            <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              {isScheduleMode ? strings.schedule.ruleNameLabel : strings.automation.ruleNameLabel}
            </label>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder={isScheduleMode ? strings.schedule.ruleNamePlaceholder : strings.automation.ruleNamePlaceholder}
              className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 border ${
                (mode === 'schedule' || ruleType === 'schedule')
                  ? isLight
                    ? 'bg-amber-50/40 border-amber-300 text-slate-900 focus:ring-amber-400'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-amber-500'
                  : isLight
                  ? 'bg-purple-50/40 border-purple-300 text-slate-900 focus:ring-purple-400'
                  : 'bg-slate-950 border-slate-700 text-white focus:border-purple-500'
              }`}
            />
          </div>

          {/* CONDITIONAL BOX: STRICTLY TRIGGER OR SCHEDULE - NEVER BOTH */}
          {ruleType === 'trigger' ? (
            /* CONDIÇÃO EXCLUSIVA DE GATILHO IR (PURPLE PALETTE) */
            <div
              id="box-condition-trigger-only"
              className={`p-3.5 rounded-2xl border-2 space-y-2.5 transition animate-in fade-in duration-150 ${
                isLight
                  ? 'bg-purple-50/80 border-purple-300 text-slate-800 shadow-sm shadow-purple-100'
                  : 'bg-slate-950/90 border-purple-800 text-white'
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-1.5 ${isLight ? 'border-purple-200' : 'border-slate-800'}`}>
                <div className={`flex items-center gap-1.5 text-xs font-bold ${isLight ? 'text-purple-900' : 'text-purple-300'}`}>
                  <Radio className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>1. {strings.automation.triggerSectionTitle}: {strings.automation.triggerIRLabel}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isLight ? 'bg-purple-200 text-purple-900' : 'bg-purple-900/70 text-purple-200'
                }`}>
                  ⚡ {strings.automation.triggerBadge}
                </span>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                  isLight ? 'text-purple-900' : 'text-purple-300'
                }`}>
                  {strings.automation.triggerIRLabel}:
                </label>
                <CompactCommandPicker
                  id="select-trigger-cmd"
                  value={triggerCommandId}
                  onChange={(cmdId) => {
                    setTriggerCommandId(cmdId);
                    setFormError(null);
                  }}
                  commands={commands}
                  isLight={isLight}
                  accentColor="purple"
                  allowDisable={false}
                />
              </div>

              <p className={`text-[10px] leading-relaxed pt-1 border-t ${
                isLight ? 'border-purple-200/80 text-purple-800' : 'border-slate-800 text-purple-300/80'
              }`}>
                {strings.automation.irOnlyExplanation}
              </p>
            </div>
          ) : (
            /* CONDIÇÃO EXCLUSIVA DE AGENDAMENTO DE HORÁRIO (AMBER PALETTE) */
            <div
              id="box-condition-schedule-only"
              className={`p-3.5 rounded-2xl border-2 space-y-2.5 transition animate-in fade-in duration-150 ${
                isLight
                  ? 'bg-amber-50/80 border-amber-300 text-slate-800 shadow-sm shadow-amber-100'
                  : 'bg-slate-950/90 border-amber-800 text-white'
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-1.5 ${isLight ? 'border-amber-200' : 'border-slate-800'}`}>
                <div className={`flex items-center gap-1.5 text-xs font-bold ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
                  <AlarmClock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>1. {strings.automation.triggerSectionTitle}: {strings.automation.triggerScheduleLabel}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isLight ? 'bg-amber-200 text-amber-900' : 'bg-amber-900/70 text-amber-200'
                }`}>
                  ⏰ {strings.automation.scheduleBadge}
                </span>
              </div>

              {/* Seletor de Horário Inline */}
              <div className="space-y-2">
                <label className={`block text-[10px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-amber-900' : 'text-amber-300'
                }`}>
                  {strings.automation.selectHourMinuteLabel}:
                </label>

                <div className="flex items-center gap-2">
                  <input
                    id="input-inline-schedule-time"
                    type="time"
                    value={inputTime}
                    onChange={(e) => setInputTime(e.target.value)}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none border text-center ${
                      isLight
                        ? 'bg-white border-amber-300 text-slate-900 focus:ring-2 focus:ring-amber-400'
                        : 'bg-slate-900 border-slate-700 text-white focus:border-amber-500'
                    }`}
                  />
                  <button
                    id="btn-add-inline-schedule-time"
                    type="button"
                    onClick={() => handleAddScheduleTime()}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-md active:scale-95 cursor-pointer ${
                      isLight
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-200'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{strings.common.add}</span>
                  </button>
                </div>

                {/* Sugestões rápidas de horário */}
                <div>
                  <span className={`text-[10px] font-semibold block mb-1 ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
                    {strings.automation.quickSuggestionsLabel}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {['06:30', '08:00', '12:00', '18:00', '22:00', '23:30'].map((presetTime) => (
                      <button
                        key={presetTime}
                        type="button"
                        onClick={() => {
                          setInputTime(presetTime);
                          handleAddScheduleTime(presetTime);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold transition border ${
                          scheduleTimes.includes(presetTime)
                            ? isLight
                              ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                              : 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                            : isLight
                            ? 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                            : 'bg-slate-900 text-amber-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        +{presetTime}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chips com os horários adicionados */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      {strings.automation.triggerScheduleLabel} ({scheduleTimes.length}):
                    </span>
                    {scheduleTimes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          feedback.playClick();
                          setScheduleTimes([]);
                        }}
                        className="text-[10px] text-rose-500 hover:underline font-semibold"
                      >
                        {strings.automation.clearAllTimes}
                      </button>
                    )}
                  </div>

                  {scheduleTimes.length === 0 ? (
                    <p className={`text-[11px] p-2.5 rounded-xl border border-dashed text-center ${
                      isLight ? 'border-amber-300 bg-amber-50/50 text-amber-900' : 'border-amber-900/60 bg-slate-950/40 text-amber-300'
                    }`}>
                      {strings.automation.errorAddScheduleTime}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {scheduleTimes.map((timeStr) => (
                        <span
                          key={timeStr}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border shadow-xs ${
                            isLight
                              ? 'bg-white border-amber-300 text-amber-950'
                              : 'bg-amber-950/80 border-amber-700 text-amber-200'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{timeStr}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveScheduleTime(timeStr)}
                            className="p-0.5 rounded-full hover:bg-rose-100 hover:text-rose-600 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <p className={`text-[10px] leading-relaxed pt-1 border-t ${
                isLight ? 'border-amber-200/80 text-amber-800' : 'border-slate-800 text-amber-300/80'
              }`}>
                {strings.automation.scheduleOnlyExplanation}
              </p>
            </div>
          )}

          {/* ACTION SELECT (Item 2: ... o ESP32 enviará) */}
          <div
            id="box-automation-item-2"
            className={`p-3.5 rounded-2xl border space-y-2.5 ${
              isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-950/80 border-blue-900/40'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-1.5 ${isLight ? 'border-sky-200' : 'border-slate-800'}`}>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${isLight ? 'text-sky-900' : 'text-blue-400'}`}>
                <Send className="w-3.5 h-3.5" />
                <span>{strings.automation.actionsSectionTitle}</span>
              </div>
              {actionSteps.length > 1 && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  isLight ? 'bg-sky-200 text-sky-900' : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}>
                  {actionSteps.length} {strings.automation.stepSequenceSuffix}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {actionSteps.map((step, idx) => (
                <div
                  key={idx}
                  id={`action-step-${idx}`}
                  className={`p-2.5 rounded-xl border relative transition shadow-sm ${
                    isLight
                      ? 'bg-white border-sky-200 text-slate-800'
                      : 'bg-slate-900/90 border-slate-700/80 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[11px] font-bold font-mono flex items-center gap-1 ${isLight ? 'text-sky-850' : 'text-blue-300'}`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        isLight ? 'bg-sky-100 text-sky-900 font-bold' : 'bg-blue-900 text-blue-200'
                      }`}>
                        {idx + 1}
                      </span>
                      <span>{strings.automation.stepNumber} #{idx + 1}:</span>
                    </span>

                    {actionSteps.length > 1 && (
                      <button
                        type="button"
                        id={`btn-remove-step-${idx}`}
                        onClick={() => handleRemoveActionStep(idx)}
                        title={strings.automation.removeStepTooltip}
                        className={`p-1 rounded-lg text-xs transition ${
                          isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Seletor Compacto do comando */}
                  <div className="mb-2">
                    <CompactCommandPicker
                      id={`select-action-cmd-${idx}`}
                      value={step.commandId}
                      onChange={(cmdId) => handleUpdateActionCommand(idx, cmdId)}
                      commands={commands}
                      isLight={isLight}
                      accentColor="sky"
                    />
                  </div>

                  {/* Input de tempo em ms */}
                  <div className={`pt-2 border-t flex flex-col gap-1.5 ${isLight ? 'border-slate-100' : 'border-slate-800'}`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[11px] font-medium flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        <Clock className="w-3 h-3" />
                        <span>{strings.automation.postDelayLabel}</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          id={`input-delay-ms-${idx}`}
                          type="number"
                          min="0"
                          step="50"
                          value={step.delayMs}
                          onChange={(e) => handleUpdateActionDelay(idx, parseInt(e.target.value, 10) || 0)}
                          placeholder="500"
                          className={`w-20 rounded-lg px-2 py-1 text-xs text-right font-mono font-bold focus:outline-none border ${
                            isLight
                              ? 'bg-sky-50/50 border-sky-300 text-slate-800 focus:border-sky-500'
                              : 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                          }`}
                        />
                        <span className={`text-xs font-mono font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          ms
                        </span>
                      </div>
                    </div>

                    {/* Atalhos rápidos de tempo */}
                    <div className="flex items-center gap-1 flex-wrap text-[10px] pt-0.5">
                      {[
                        { val: 100, label: '100ms' },
                        { val: 500, label: '500ms' },
                        { val: 1000, label: '1000ms' },
                        { val: 2000, label: '2000ms' },
                        { val: 3000, label: '3000ms' },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => handleUpdateActionDelay(idx, preset.val)}
                          className={`px-1.5 py-0.5 rounded-md font-mono transition border ${
                            step.delayMs === preset.val
                              ? isLight
                                ? 'bg-sky-600 text-white border-sky-600 font-bold'
                                : 'bg-blue-600 text-white border-blue-600 font-bold'
                              : isLight
                              ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão + Adicionar comando de ação */}
          <button
            id="btn-add-action-command"
            type="button"
            onClick={handleAddActionStep}
            className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold border-2 border-dashed flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
              isLight
                ? 'border-sky-350 bg-sky-50/80 hover:bg-sky-100 text-sky-900 hover:border-sky-500'
                : 'border-blue-700/60 bg-blue-950/30 hover:bg-blue-900/40 text-blue-300 hover:border-blue-500'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{strings.automation.addActionStepBtn}</span>
          </button>

          {/* Descrição opcional */}
          <div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={strings.automation.ruleDescPlaceholder}
              className={`w-full rounded-xl px-3 py-1.5 text-xs placeholder-slate-400 focus:outline-none border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            />
          </div>

          {/* Validation Error Banner */}
          {formError && (
            <div
              id="box-automation-form-error"
              className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in"
            >
              <Info className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              id="btn-cancel-new-automation"
              type="button"
              onClick={() => {
                feedback.playClick();
                setIsCreating(false);
                setFormError(null);
              }}
              className={`flex-1 py-2.5 font-bold rounded-xl text-xs transition border flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              {strings.automation.cancelBtn}
            </button>
            <button
              id="btn-save-new-automation"
              type="button"
              onClick={handleCreateRule}
              className={`flex-[2] py-2.5 font-bold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                (mode === 'schedule' || ruleType === 'schedule')
                  ? isLight
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-200'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-950'
                  : isLight
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-200'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-950'
              }`}
            >
              {(mode === 'schedule' || ruleType === 'schedule') ? <Clock className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
              <span>
                {isScheduleMode
                  ? strings.schedule.saveRuleBtn
                  : isTriggerMode
                  ? 'Salvar Regra de Gatilho IR'
                  : ruleType === 'trigger'
                  ? 'Salvar Regra de Gatilho IR'
                  : 'Salvar Regra de Agendamento'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* FILTER TABS & RULES LIST */}
      <div className="space-y-3">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-1">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            {isScheduleMode
              ? `Agendamentos Ativos (${filteredAutomations.length})`
              : isTriggerMode
              ? `Gatilhos IR Ativos (${filteredAutomations.length})`
              : `${strings.automation.activeRulesTitle} (${automations.length})`}
          </h3>
          <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            {isScheduleMode ? 'Relógio ESP32' : `RX GPIO ${espState.pinConfig.irReceiverPin}`}
          </span>
        </div>

        {/* Filter Tabs (only when not in dedicated mode) */}
        {!isDedicatedMode && (
          <div className={`flex items-center gap-1.5 p-1 rounded-2xl border ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-900/80 border-slate-800'
          }`}>
            <button
              type="button"
              onClick={() => {
                feedback.playClick();
                setFilterType('all');
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition ${
                filterType === 'all'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {strings.automation.filterAllRules} ({automations.length})
            </button>

            <button
              type="button"
              onClick={() => {
                feedback.playClick();
                setFilterType('trigger');
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                filterType === 'trigger'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>{strings.automation.filterTriggerRules} ({triggerRulesCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                feedback.playClick();
                setFilterType('schedule');
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                filterType === 'schedule'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{strings.automation.filterScheduleRules} ({scheduleRulesCount})</span>
            </button>
          </div>
        )}

        {/* Empty state */}
        {filteredAutomations.length === 0 && (
          <div className={`p-8 rounded-3xl text-center border-2 border-dashed ${
            isLight ? 'border-slate-200 bg-white/60 text-slate-500' : 'border-slate-800 bg-slate-900/40 text-slate-400'
          }`}>
            {isScheduleMode ? (
              <Clock className="w-8 h-8 mx-auto mb-2 text-amber-500/60" />
            ) : (
              <Radio className="w-8 h-8 mx-auto mb-2 text-purple-500/60" />
            )}
            <p className="font-bold text-sm mb-1">
              {isScheduleMode
                ? strings.schedule.emptyNotice
                : 'Nenhum gatilho IR cadastrado ainda'}
            </p>
            <p className="text-xs max-w-xs mx-auto opacity-75 mb-3">
              {isScheduleMode
                ? strings.schedule.explanationNotice
                : 'Crie uma regra disparada quando o receptor do ESP32 captar o sinal de um controle remoto.'}
            </p>
            <button
              onClick={() => {
                feedback.playClick();
                setIsCreating(true);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow active:scale-95 inline-flex items-center gap-1.5 ${
                isScheduleMode
                  ? isLight
                    ? 'bg-amber-400 hover:bg-amber-300 text-amber-950'
                    : 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                  : isLight
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{isScheduleMode ? strings.schedule.createRuleBtn : 'Nova Regra'}</span>
            </button>
          </div>
        )}

        {/* LIST OF RULES WITH DISTINCT COLOR THEMES */}
        {filteredAutomations.map((rule) => {
          const ruleType = getRuleType(rule);
          const isTrigger = ruleType === 'trigger';
          const triggerCmd = commands.find((c) => c.id === rule.triggerCommandId);
          const isRunning = runningRuleId === rule.id;
          const hasSchedules = Boolean(rule.scheduleTimes && rule.scheduleTimes.length > 0);

          return (
            <div
              key={rule.id}
              id={`card-auto-${rule.id}`}
              className={`rounded-3xl p-4 shadow-xl transition-all border-2 ${
                isTrigger
                  ? isLight
                    ? rule.enabled
                      ? 'bg-gradient-to-br from-white via-purple-50/20 to-purple-50/40 border-purple-200 hover:border-purple-400 shadow-purple-100/50 text-slate-800'
                      : 'bg-white/70 border-slate-200 opacity-70 text-slate-700'
                    : rule.enabled
                    ? 'bg-gradient-to-b from-slate-900 via-purple-950/20 to-slate-950 border-purple-900/60 hover:border-purple-600/70 text-white shadow-purple-950/30'
                    : 'bg-slate-900 border-slate-800/40 opacity-70 text-slate-400'
                  : isLight
                  ? rule.enabled
                    ? 'bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40 border-amber-200 hover:border-amber-400 shadow-amber-100/50 text-slate-800'
                    : 'bg-white/70 border-slate-200 opacity-70 text-slate-700'
                  : rule.enabled
                  ? 'bg-gradient-to-b from-slate-900 via-amber-950/20 to-slate-950 border-amber-900/60 hover:border-amber-600/70 text-white shadow-amber-950/30'
                  : 'bg-slate-900 border-slate-800/40 opacity-70 text-slate-400'
              }`}
            >
              {/* Top bar with badge & switch */}
              <div className={`flex items-center justify-between pb-2.5 border-b ${
                isTrigger
                  ? isLight ? 'border-purple-100' : 'border-purple-950/80'
                  : isLight ? 'border-amber-100' : 'border-amber-950/80'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      rule.enabled
                        ? isTrigger
                          ? 'bg-purple-500 animate-pulse'
                          : 'bg-amber-500 animate-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                  <h4 className={`font-bold text-sm truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{rule.name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    isTrigger
                      ? isLight ? 'bg-purple-100 text-purple-900 border border-purple-300' : 'bg-purple-950 text-purple-300 border border-purple-800'
                      : isLight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {isTrigger ? `⚡ ${strings.automation.triggerBadge}` : `⏰ ${strings.automation.scheduleBadge}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleAutomation(rule.id)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      rule.enabled
                        ? isTrigger
                          ? 'bg-purple-600'
                          : 'bg-amber-500'
                        : isLight ? 'bg-slate-300' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform transform ${
                        rule.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Visual Condition -> Action flow */}
              <div className="py-3 flex flex-col gap-2">
                {/* Condition Box: Purple for Trigger, Amber for Schedule */}
                {isTrigger ? (
                  <div
                    className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs ${
                      isLight
                        ? 'bg-purple-50/90 border-purple-200 text-slate-800 shadow-xs'
                        : 'bg-slate-950/90 border-purple-900/50 text-white'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                      isLight ? 'bg-purple-200 text-purple-900' : 'bg-purple-900/60 text-purple-300'
                    }`}>
                      {strings.automation.triggerIRLabel.toUpperCase()}
                    </span>
                    <span className={`font-semibold truncate ${isLight ? 'text-purple-950' : 'text-slate-200'}`}>
                      {triggerCmd ? triggerCmd.name : (rule.triggerCommandId || 'Comando IR')}
                    </span>
                    {triggerCmd && (
                      <span className={`font-mono text-[10px] ml-auto ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>
                        {triggerCmd.protocol}: {triggerCmd.hexCode}
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs ${
                      isLight
                        ? 'bg-amber-50/90 border-amber-200 text-slate-800 shadow-xs'
                        : 'bg-slate-950/90 border-amber-900/50 text-white'
                    }`}
                  >
                    <AlarmClock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 ${
                      isLight ? 'bg-amber-200 text-amber-900' : 'bg-amber-900/60 text-amber-300'
                    }`}>
                      <span>{strings.automation.triggerScheduleLabel.toUpperCase()}</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-1 font-mono font-bold text-[11px] ml-auto">
                      {rule.scheduleTimes?.map((timeStr) => (
                        <span
                          key={timeStr}
                          className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                            isLight
                              ? 'bg-white text-amber-950 border-amber-300 shadow-xs'
                              : 'bg-amber-950 text-amber-200 border-amber-800'
                          }`}
                        >
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{timeStr}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Arrow down */}
                <div className={`flex items-center justify-center text-xs font-bold gap-1 ${
                  isTrigger
                    ? isLight ? 'text-purple-600' : 'text-purple-400'
                    : isLight ? 'text-amber-600' : 'text-amber-400'
                }`}>
                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                  <span className={`text-[10px] uppercase font-mono tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    ESP32 Transmite Sequência
                  </span>
                </div>

                {/* Sequence Actions */}
                {rule.actions.map((act, idx) => {
                  const actCmd = commands.find((c) => c.id === act.commandId);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs ${
                        isLight
                          ? 'bg-sky-50/80 border-sky-200 text-slate-800'
                          : 'bg-slate-950/80 border-blue-900/30 text-white'
                      }`}
                    >
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        isLight ? 'bg-sky-200 text-sky-900' : 'bg-blue-900/60 text-blue-300'
                      }`}>
                        {rule.actions.length > 1 ? `${strings.automation.stepNumber.toUpperCase()} ${idx + 1}` : strings.automation.stepNumber.toUpperCase()}
                      </span>
                      <span className={`font-semibold truncate ${isLight ? 'text-sky-950' : 'text-slate-200'}`}>
                        {actCmd ? actCmd.name : 'Comando IR'}
                      </span>
                      <span className={`text-[10px] ml-auto font-mono ${isLight ? 'text-sky-700' : 'text-slate-400'}`}>
                        +{act.delayMs}ms
                      </span>
                    </div>
                  );
                })}
              </div>

              {rule.description && (
                <p className={`text-[11px] p-2 rounded-xl mb-3 border ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}>
                  {rule.description}
                </p>
              )}

              {/* Status and Action bar */}
              <div className={`flex items-center justify-between pt-2 border-t text-xs ${
                isTrigger
                  ? isLight ? 'border-purple-100' : 'border-purple-950/80'
                  : isLight ? 'border-amber-100' : 'border-amber-950/80'
              }`}>
                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  {strings.automation.triggerCountPrefix}: <b>{rule.triggerCount} {strings.automation.triggerCountSuffix}</b>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    id={`btn-test-rule-${rule.id}`}
                    onClick={() => handleTestRule(rule)}
                    disabled={isRunning}
                    className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                      isRunning
                        ? isTrigger
                          ? 'bg-purple-600 text-white animate-pulse'
                          : 'bg-amber-500 text-slate-950 animate-pulse'
                        : isTrigger
                        ? isLight
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300'
                          : 'bg-purple-950/70 hover:bg-purple-900 text-purple-300 border border-purple-800'
                        : isLight
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                        : 'bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-800'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isRunning ? `${strings.automation.stepNumber} ${executionStep}...` : strings.automation.testRuleBtn}</span>
                  </button>

                  <button
                    onClick={() => {
                      feedback.playClick();
                      if (confirm(strings.automation.deleteRuleConfirm.replace('{name}', rule.name))) {
                        onDeleteAutomation(rule.id);
                      }
                    }}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:text-rose-400'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
