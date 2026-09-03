import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Radio,
  Send,
  Save,
  Trash2,
  Copy as CopyIcon,
  Check,
  Tv,
  Play,
  Square,
  Tag,
  RotateCcw,
  X,
  Filter,
  Search,
} from 'lucide-react';
import { IRCommand, IRProtocol, DeviceCategory, ESP32DeviceState, ActivityLogItem } from '../types';
import { esp32 } from '../services/esp32Service';
import { feedback } from '../services/soundService';
import { TimingWaveform } from './TimingWaveform';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import confetti from 'canvas-confetti';

interface CopyScreenProps {
  commands: IRCommand[];
  onSaveCommand: (command: IRCommand) => void;
  onDeleteCommand: (id: string) => void;
  onRestoreCommand?: (command: IRCommand, originalIndex?: number) => void;
  espState: ESP32DeviceState;
  onAssignToRemote: (cmd: IRCommand) => void;
  onLogActivity?: (log: Omit<ActivityLogItem, 'id' | 'timestamp'>) => void;
}

export const CopyScreen: React.FC<CopyScreenProps> = ({
  commands,
  onSaveCommand,
  onDeleteCommand,
  onRestoreCommand,
  espState,
  onAssignToRemote,
  onLogActivity,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings, language } = useLanguage();

  // Live sniffer state - starts as false (waiting for user action)
  const [isListening, setIsListening] = useState<boolean>(false);
  const [capturedSignal, setCapturedSignal] = useState<{
    protocol: IRProtocol;
    hexCode: string;
    bits: number;
    rawTimings: number[];
    timestamp: string;
  } | null>(null);

  // Form state for captured signal
  const [commandName, setCommandName] = useState<string>('');
  const [category, setCategory] = useState<DeviceCategory>('tv');
  const [color, setColor] = useState<string>('#3b82f6');
  const [notes, setNotes] = useState<string>('');
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [testingCmdId, setTestingCmdId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Undo deletion state
  const [undoItem, setUndoItem] = useState<{
    command: IRCommand;
    index: number;
  } | null>(null);
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  // Listen to incoming signals from ESP32 service
  useEffect(() => {
    const unsubscribe = esp32.onIRReceived((data) => {
      if (!isListening) return;
      feedback.playCaptureSuccess();

      setCapturedSignal({
        protocol: data.protocol as IRProtocol,
        hexCode: data.hexCode,
        bits: data.bits,
        rawTimings: data.rawTimings,
        timestamp: new Date().toLocaleTimeString(),
      });

      // Default smart suggested name
      setCommandName(`${data.protocol} (${data.hexCode})`);

      // Log signal capture
      if (onLogActivity) {
        onLogActivity({
          type: 'captura',
          title: `${strings.copy.detectedSignalTitle}: ${data.protocol}`,
          subtitle: `GPIO ${espState.pinConfig.irReceiverPin}`,
          details: `${data.bits} bits (${data.hexCode})`,
          protocol: data.protocol as IRProtocol,
          hexCode: data.hexCode,
          bits: data.bits,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isListening, espState.pinConfig.irReceiverPin, onLogActivity, strings]);

  // Save the captured command to ESP32 & App memory
  const handleSave = () => {
    if (!capturedSignal) return;
    if (!commandName.trim()) {
      setFormError(strings.copy.commandNamePlaceholder);
      return;
    }
    setFormError(null);

    const newCommand: IRCommand = {
      id: `cmd-${Date.now()}`,
      name: commandName.trim(),
      category,
      protocol: capturedSignal.protocol,
      hexCode: capturedSignal.hexCode,
      bits: capturedSignal.bits,
      rawTimings: capturedSignal.rawTimings,
      timestamp: new Date().toLocaleDateString() + ' ' + capturedSignal.timestamp,
      syncedToEsp32: true,
      notes: notes.trim() || undefined,
      color,
    };

    onSaveCommand(newCommand);
    feedback.playCaptureSuccess();

    // Log learning event
    if (onLogActivity) {
      onLogActivity({
        type: 'aprendizado',
        title: `${newCommand.name}`,
        subtitle: `[${category.toUpperCase()}] ${newCommand.protocol}`,
        details: `${newCommand.hexCode} (${newCommand.bits}b)`,
        protocol: newCommand.protocol,
        hexCode: newCommand.hexCode,
        bits: newCommand.bits,
      });
    }

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
      setCapturedSignal(null);
      setCommandName('');
      setNotes('');
    }, 1800);
  };

  // Test firing a command via ESP32 IR LED
  const handleTestTransmit = async (cmd: IRCommand) => {
    feedback.playTransmitBeep();
    setTestingCmdId(cmd.id);
    await esp32.transmitIR(cmd);
    setTimeout(() => setTestingCmdId(null), 400);
  };

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    feedback.playClick();
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleDeleteCommand = (cmd: IRCommand) => {
    feedback.playClick();
    const cmdIndex = commands.findIndex((c) => c.id === cmd.id);

    // Cancel existing timeouts
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
      setRestoredNotice(null);
    }

    // Set undo state
    setUndoItem({
      command: cmd,
      index: cmdIndex >= 0 ? cmdIndex : 0,
    });

    // Delete command from library
    onDeleteCommand(cmd.id);

    // Optional activity logging
    if (onLogActivity) {
      onLogActivity({
        type: 'comando',
        title: `${language === 'pt' ? 'Comando Excluído' : language === 'es' ? 'Comando Eliminado' : 'Command Deleted'}: ${cmd.name}`,
        subtitle: `${cmd.protocol} • ${cmd.hexCode}`,
        details: `${language === 'pt' ? 'Comando removido da biblioteca' : language === 'es' ? 'Comando eliminado de la biblioteca' : 'Command removed from library'}`,
        protocol: cmd.protocol,
        hexCode: cmd.hexCode,
        bits: cmd.bits,
      });
    }

    // Auto dismiss after 7 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setUndoItem(null);
    }, 7000);
  };

  const handleUndoDelete = () => {
    if (!undoItem) return;
    feedback.playCaptureSuccess();

    const cmdToRestore = undoItem.command;
    const originalIndex = undoItem.index;

    if (onRestoreCommand) {
      onRestoreCommand(cmdToRestore, originalIndex);
    } else {
      onSaveCommand(cmdToRestore);
    }

    if (onLogActivity) {
      onLogActivity({
        type: 'comando',
        title: `${language === 'pt' ? 'Comando Restaurado' : language === 'es' ? 'Comando Restaurado' : 'Command Restored'}: ${cmdToRestore.name}`,
        subtitle: `${cmdToRestore.protocol} • ${cmdToRestore.hexCode}`,
        details: `${language === 'pt' ? 'Exclusão desfeita pelo usuário' : language === 'es' ? 'Eliminación deshecha por el usuario' : 'Deletion undone by user'}`,
        protocol: cmdToRestore.protocol,
        hexCode: cmdToRestore.hexCode,
        bits: cmdToRestore.bits,
      });
    }

    const restoredMsg = strings.copy.commandRestoredNotice.replace('{name}', cmdToRestore.name);
    setUndoItem(null);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    setRestoredNotice(restoredMsg);
    noticeTimeoutRef.current = setTimeout(() => {
      setRestoredNotice(null);
    }, 3500);
  };

  const handleDismissUndo = () => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    setUndoItem(null);
  };

  // Library filtering state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'tv':
        return strings.copy.quickCategoryTV;
      case 'ac':
        return strings.copy.quickCategoryAC;
      case 'sound':
      case 'audio':
        return strings.copy.quickCategorySound;
      case 'lights':
        return strings.copy.quickCategoryLights;
      case 'smartbox':
        return 'Smart Box';
      case 'projector':
        return language === 'pt' ? 'Projetor' : language === 'es' ? 'Proyector' : 'Projector';
      case 'custom':
        return strings.copy.quickCategoryCustom;
      default:
        return cat.charAt(0).toUpperCase() + cat.slice(1);
    }
  };

  const getColorName = (hex: string) => {
    const h = hex.toLowerCase();
    if (['#ef4444', '#ff0000', '#e11d48', '#e50914'].includes(h)) return language === 'pt' ? 'Vermelho' : language === 'es' ? 'Rojo' : 'Red';
    if (['#3b82f6', '#2563eb', '#00a8e1'].includes(h)) return language === 'pt' ? 'Azul' : language === 'es' ? 'Azul' : 'Blue';
    if (['#10b981', '#22c55e', '#14b8a6'].includes(h)) return language === 'pt' ? 'Verde' : language === 'es' ? 'Verde' : 'Green';
    if (['#f59e0b', '#f97316', '#eab308'].includes(h)) return language === 'pt' ? 'Laranja/Amarelo' : language === 'es' ? 'Naranja/Amarillo' : 'Orange/Yellow';
    if (['#8b5cf6', '#a855f7', '#6366f1'].includes(h)) return language === 'pt' ? 'Roxo' : language === 'es' ? 'Morado' : 'Purple';
    if (['#06b6d4', '#38bdf8'].includes(h)) return language === 'pt' ? 'Ciano' : language === 'es' ? 'Cian' : 'Cyan';
    if (['#ec4899'].includes(h)) return language === 'pt' ? 'Rosa' : language === 'es' ? 'Rosa' : 'Pink';
    if (['#64748b', '#475569'].includes(h)) return language === 'pt' ? 'Cinza' : language === 'es' ? 'Gris' : 'Gray';
    return hex;
  };

  const availableCategories = useMemo(() => {
    const catSet = new Set<string>();
    commands.forEach((c) => {
      catSet.add(c.category || 'custom');
    });
    return Array.from(catSet);
  }, [commands]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    commands.forEach((c) => {
      const cat = c.category || 'custom';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [commands]);

  const availableColors = useMemo(() => {
    const colorMap = new Map<string, number>();
    commands.forEach((c) => {
      const colorHex = (c.color || '#3b82f6').toLowerCase();
      colorMap.set(colorHex, (colorMap.get(colorHex) || 0) + 1);
    });
    return Array.from(colorMap.entries()).map(([hex, count]) => ({
      hex,
      count,
      name: getColorName(hex),
    }));
  }, [commands, language]);

  const isFilterActive = selectedCategory !== 'all' || selectedColor !== 'all' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    feedback.playClick();
    setSelectedCategory('all');
    setSelectedColor('all');
    setSearchQuery('');
  };

  const filteredCommands = useMemo(() => {
    return commands.filter((cmd) => {
      if (selectedCategory !== 'all') {
        const cat = cmd.category || 'custom';
        if (cat !== selectedCategory) return false;
      }
      if (selectedColor !== 'all') {
        const col = (cmd.color || '#3b82f6').toLowerCase();
        if (col !== selectedColor.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = cmd.name.toLowerCase().includes(q);
        const matchHex = cmd.hexCode.toLowerCase().includes(q);
        const matchProto = cmd.protocol.toLowerCase().includes(q);
        const matchNotes = (cmd.notes || '').toLowerCase().includes(q);
        if (!matchName && !matchHex && !matchProto && !matchNotes) return false;
      }
      return true;
    });
  }, [commands, selectedCategory, selectedColor, searchQuery]);

  return (
    <div id="copy-screen" className="flex flex-col pb-24 px-3 pt-2 max-w-md mx-auto space-y-4">
      {/* SECTION 1: LIVE ESP32 IR LEARNING RADAR */}
      <div
        className={`rounded-3xl p-4 shadow-xl relative overflow-hidden border transition-colors ${
          isLight
            ? 'bg-white/95 border-sky-200 shadow-sky-100/70'
            : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-purple-900/50'
        }`}
      >
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-sky-200' : 'border-slate-800'}`}>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                isLight
                  ? 'bg-purple-100 text-purple-700 border-purple-300'
                  : 'bg-purple-600/30 text-purple-400 border-purple-500/40'
              }`}
            >
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {strings.copy.title}
              </h2>
              <p className={`text-[11px] font-medium ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>
                {strings.copy.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Learning Instructions Graphic */}
        <div
          className={`my-4 flex flex-col items-center justify-center text-center p-4 rounded-2xl relative border transition-all ${
            isListening
              ? isLight
                ? 'bg-gradient-to-b from-purple-50/70 via-sky-50 to-white border-purple-300'
                : 'bg-gradient-to-b from-purple-950/30 via-slate-950/80 to-slate-950 border-purple-600/40'
              : isLight
              ? 'bg-gradient-to-b from-slate-50 to-white border-slate-200'
              : 'bg-slate-950/70 border-slate-800/80'
          }`}
        >
          <div className="relative mb-3">
            {/* Listening pulse wave circles */}
            {isListening ? (
              <>
                <span className="animate-ping absolute inset-0 rounded-full bg-purple-500/20 scale-150"></span>
                <span className="animate-pulse absolute inset-0 rounded-full bg-purple-600/30 scale-125"></span>
              </>
            ) : null}
            <div
              className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg border transition-all ${
                isListening
                  ? isLight
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white border-purple-300 shadow-purple-200'
                    : 'bg-gradient-to-tr from-purple-700 to-indigo-600 text-white border-purple-400/40 shadow-purple-950'
                  : isLight
                  ? 'bg-slate-200 text-slate-500 border-slate-300'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Radio className={`w-7 h-7 ${isListening ? 'animate-pulse' : 'opacity-70'}`} />
            </div>
          </div>

          <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            {isListening
              ? strings.copy.receiverStatusWaiting
              : (language === 'pt' ? 'Recepção de Sinal IR' : language === 'es' ? 'Recepción de Señal IR' : 'IR Signal Reception')}
          </h3>
          <p className={`text-xs mt-1 max-w-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {isListening
              ? strings.copy.sniffingInstruction
              : (language === 'pt' ? 'Pressione o botão abaixo para ativar a leitura do receptor.' : language === 'es' ? 'Presione el botón abajo para activar la lectura del receptor.' : 'Click the button below to start receiving IR signals.')}
          </p>

          {/* Action Button: Iniciar / Parar inside the frame */}
          {!isListening ? (
            <button
              id="btn-start-sniffing"
              onClick={() => {
                feedback.playClick();
                setIsListening(true);
              }}
              className="mt-3 px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{strings.copy.startSniffingBtn}</span>
            </button>
          ) : (
            <button
              id="btn-stop-listening"
              onClick={() => {
                feedback.playClick();
                setIsListening(false);
              }}
              className="mt-3 px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-900/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{strings.copy.stopSniffingBtn}</span>
            </button>
          )}
        </div>

        {/* CAPTURED SIGNAL CARD (When signal is received) */}
        {capturedSignal && (
          <div
            id="captured-signal-box"
            className={`p-4 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200 border-2 ${
              isLight
                ? 'bg-purple-50/90 border-purple-400 text-slate-800'
                : 'bg-gradient-to-br from-purple-950/80 via-slate-900 to-slate-950 border-purple-500/70 text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-purple-900' : 'text-purple-300'}`}>
                  {strings.copy.detectedSignalTitle}
                </span>
              </div>
              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {capturedSignal.timestamp}
              </span>
            </div>

            {/* Timing Waveform */}
            <TimingWaveform
              timings={capturedSignal.rawTimings}
              protocol={capturedSignal.protocol}
              hexCode={capturedSignal.hexCode}
              className="mb-3"
            />

            {/* Save Form */}
            <div className="space-y-3">
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-purple-950' : 'text-slate-300'}`}>
                  {strings.copy.commandNameLabel}
                </label>
                <input
                  type="text"
                  value={commandName}
                  onChange={(e) => {
                    setCommandName(e.target.value);
                    setFormError(null);
                  }}
                  placeholder={strings.copy.commandNamePlaceholder}
                  className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 font-medium border ${
                    isLight
                      ? 'bg-white border-purple-300 text-slate-900 focus:ring-purple-500 shadow-sm'
                      : 'bg-slate-950 border-purple-500/50 text-white focus:ring-purple-500'
                  }`}
                />
              </div>

              {formError && (
                <p className="text-xs text-rose-500 font-semibold">{formError}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {/* Category */}
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-purple-950' : 'text-slate-300'}`}>
                    {strings.copy.categoryLabel}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DeviceCategory)}
                    className={`w-full rounded-xl px-2.5 py-2 text-xs focus:outline-none border ${
                      isLight
                        ? 'bg-white border-purple-300 text-slate-800 focus:ring-purple-500'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-purple-500'
                    }`}
                  >
                    <option value="tv">{strings.copy.quickCategoryTV}</option>
                    <option value="ac">{strings.copy.quickCategoryAC}</option>
                    <option value="sound">{strings.copy.quickCategorySound}</option>
                    <option value="lights">{strings.copy.quickCategoryLights}</option>
                    <option value="smartbox">Smart Box</option>
                    <option value="projector">Projector</option>
                    <option value="custom">{strings.copy.quickCategoryCustom}</option>
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-purple-950' : 'text-slate-300'}`}>
                    {strings.copy.colorLabel}
                  </label>
                  <div
                    className={`flex items-center gap-1.5 h-9 rounded-xl px-2 border ${
                      isLight ? 'bg-white border-purple-300' : 'bg-slate-950 border-slate-700'
                    }`}
                  >
                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          color === c ? 'scale-125 ring-2 ring-purple-600 shadow' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={strings.copy.notesPlaceholder}
                  className={`w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none border ${
                    isLight
                      ? 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-800 text-slate-300 placeholder-slate-600 focus:border-purple-500'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  id="btn-discard-capture"
                  onClick={() => {
                    feedback.playClick();
                    setCapturedSignal(null);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-purple-200'
                      : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                  }`}
                >
                  {strings.common.cancel}
                </button>

                <button
                  id="btn-save-captured-ir"
                  onClick={handleSave}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-lg ${
                    justSaved
                      ? 'bg-emerald-600 text-white'
                      : isLight
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-200'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-950'
                  }`}
                >
                  {justSaved ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{strings.copy.commandSavedSuccess}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{strings.copy.saveCommandBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: SAVED COMMANDS CATALOG */}
      <div
        id="section-saved-commands-catalog"
        className={`rounded-3xl p-4 shadow-xl border transition-colors ${
          isLight ? 'bg-white/95 border-sky-200 shadow-sky-100/70' : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* Header with Title and Counters */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-blue-400'}`} />
            <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {strings.copy.savedCommandsTitle}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              id="badge-commands-count"
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                isFilterActive
                  ? isLight
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-blue-900/60 text-blue-200 border border-blue-700/60'
                  : isLight
                  ? 'bg-sky-100 text-sky-800 border border-sky-200'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {isFilterActive
                ? `${filteredCommands.length} / ${commands.length}`
                : `${commands.length} ${language === 'pt' ? 'itens' : language === 'es' ? 'ítems' : 'items'}`}
            </span>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative mb-3">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            id="input-search-commands"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={strings.copy.searchPlaceholder}
            className={`w-full text-xs pl-9 pr-8 py-2 rounded-xl border outline-none transition ${
              isLight
                ? 'bg-sky-50/50 border-sky-200 focus:bg-white focus:border-blue-500 text-slate-900 placeholder:text-slate-400'
                : 'bg-slate-950 border-slate-800 focus:border-blue-500 text-white placeholder:text-slate-500'
            }`}
          />
          {searchQuery && (
            <button
              id="btn-clear-search"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 transition"
              title={strings.common.close}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* FILTER BOX: Category & Identification Color */}
        <div
          id="filter-controls-container"
          className={`p-2.5 rounded-2xl border mb-3 flex flex-col gap-2 transition-colors ${
            isLight ? 'bg-sky-50/60 border-sky-200/80' : 'bg-slate-950/70 border-slate-800/80'
          }`}
        >
          {/* Row 1: Filter by Category */}
          <div className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden py-1 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Option 'Todos' */}
            <button
              id="filter-category-all"
              onClick={() => {
                feedback.playClick();
                setSelectedCategory('all');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer active:scale-95 border ${
                selectedCategory === 'all'
                  ? isLight
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : isLight
                  ? 'bg-white text-slate-700 hover:bg-sky-100/70 border-sky-200'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
              }`}
            >
              <span>{strings.copy.filterAll}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedCategory === 'all'
                    ? 'bg-blue-700/80 text-white'
                    : isLight
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {commands.length}
              </span>
            </button>

            {/* Each detected category */}
            {availableCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = categoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  id={`filter-category-${cat}`}
                  onClick={() => {
                    feedback.playClick();
                    setSelectedCategory(isSelected ? 'all' : cat);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer active:scale-95 border ${
                    isSelected
                      ? isLight
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-blue-600 text-white border-blue-500 shadow-xs'
                      : isLight
                      ? 'bg-white text-slate-700 hover:bg-sky-100/70 border-sky-200'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <span>{getCategoryLabel(cat)}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? 'bg-blue-700/80 text-white'
                        : isLight
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Filter by Identification Color */}
          <div className={`pt-1.5 border-t ${isLight ? 'border-sky-200/70' : 'border-slate-800/80'} flex items-center gap-1.5 overflow-x-auto overflow-y-hidden py-1 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
            {/* Option 'Todas as Cores' */}
            <button
              id="filter-color-all"
              onClick={() => {
                feedback.playClick();
                setSelectedColor('all');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer active:scale-95 border ${
                selectedColor === 'all'
                  ? isLight
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-purple-600 text-white border-purple-500 shadow-xs'
                  : isLight
                  ? 'bg-white text-slate-700 hover:bg-purple-50 border-purple-200'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
              }`}
              title={strings.copy.allColors}
            >
              <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 to-sky-400 shadow-xs" />
              <span>{strings.copy.allColors}</span>
            </button>

            {/* Color swatches */}
            {availableColors.map(({ hex, count, name }) => {
              const isSelected = selectedColor.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  id={`filter-color-${hex.replace('#', '')}`}
                  onClick={() => {
                    feedback.playClick();
                    setSelectedColor(isSelected ? 'all' : hex);
                  }}
                  className={`relative flex items-center justify-center w-7 h-7 rounded-xl transition cursor-pointer active:scale-90 border flex-shrink-0 ${
                    isSelected
                      ? 'ring-2 ring-purple-600 scale-110 shadow-md border-white'
                      : 'hover:scale-105 border-black/10 opacity-90 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={`${name} (${count} ${language === 'pt' ? 'comandos' : language === 'es' ? 'comandos' : 'commands'})`}
                >
                  {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />}
                  <span className="sr-only">{name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Filter Summary Bar & Reset Button */}
          {isFilterActive && (
            <div
              id="bar-active-filters-summary"
              className={`flex items-center justify-between pt-2 border-t text-xs ${
                isLight ? 'border-sky-200/70 text-slate-600' : 'border-slate-800/80 text-slate-400'
              }`}
            >
              <span className="text-[11px] font-medium">
                {language === 'pt'
                  ? `Mostrando ${filteredCommands.length} de ${commands.length} comandos`
                  : language === 'es'
                  ? `Mostrando ${filteredCommands.length} de ${commands.length} comandos`
                  : `Showing ${filteredCommands.length} of ${commands.length} commands`}
              </span>
              <button
                id="btn-clear-all-filters"
                onClick={handleResetFilters}
                className={`flex items-center gap-1 font-bold text-[11px] px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer border ${
                  isLight
                    ? 'bg-blue-100 hover:bg-blue-200 text-blue-900 border-blue-200'
                    : 'bg-blue-900/40 hover:bg-blue-900/70 text-blue-300 border-blue-800/50'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{strings.copy.clearFilters}</span>
              </button>
            </div>
          )}
        </div>

        {/* LIST OF COMMANDS / EMPTY STATE */}
        <div className="space-y-2.5">
          {commands.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              {strings.copy.noSavedCommands}
            </div>
          ) : filteredCommands.length === 0 ? (
            <div
              id="empty-filtered-commands"
              className={`text-center py-8 px-4 rounded-2xl border flex flex-col items-center gap-2.5 ${
                isLight ? 'bg-sky-50/40 border-sky-200/60' : 'bg-slate-950/40 border-slate-800/60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isLight ? 'bg-blue-100 text-blue-700' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Filter className="w-5 h-5" />
              </div>
              <p className={`text-xs font-semibold max-w-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {strings.copy.noFilteredCommands}
              </p>
              <button
                id="btn-show-all-after-empty"
                onClick={handleResetFilters}
                className="mt-1 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {language === 'pt'
                    ? `Ver todos os itens (${commands.length})`
                    : language === 'es'
                    ? `Ver todos los ítems (${commands.length})`
                    : `View all items (${commands.length})`}
                </span>
              </button>
            </div>
          ) : (
            filteredCommands.map((cmd) => {
              const isTesting = testingCmdId === cmd.id;
              return (
                <div
                  key={cmd.id}
                  id={`card-cmd-${cmd.id}`}
                  className={`rounded-2xl p-3 flex flex-col gap-2 transition border ${
                    isLight
                      ? 'bg-sky-50/60 hover:bg-sky-50 border-sky-200 text-slate-800 shadow-xs'
                      : 'bg-slate-950/80 hover:border-slate-700 border-slate-800/80 text-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span
                        className="w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0 border border-black/10 shadow-xs"
                        style={{ backgroundColor: cmd.color || '#3b82f6' }}
                        title={getColorName(cmd.color || '#3b82f6')}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {cmd.name}
                        </div>
                        <div className={`text-[11px] font-mono flex items-center gap-1.5 mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          <span className={`uppercase font-semibold ${isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>
                            {cmd.protocol}
                          </span>
                          <span>•</span>
                          <span className={isLight ? 'text-slate-700 font-semibold' : 'text-slate-300'}>{cmd.hexCode}</span>
                          <span>•</span>
                          <span>{cmd.bits}b</span>
                        </div>
                        {cmd.notes && (
                          <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                            {cmd.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Category Badge */}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 border ${
                        isLight
                          ? 'bg-white text-slate-700 border-sky-200 shadow-xs'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      {getCategoryLabel(cmd.category || 'custom')}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className={`flex items-center justify-between gap-1.5 pt-2 text-xs border-t ${isLight ? 'border-sky-200' : 'border-slate-900'}`}>
                    {/* Test Send IR */}
                    <button
                      id={`btn-test-send-${cmd.id}`}
                      onClick={() => handleTestTransmit(cmd)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition active:scale-95 cursor-pointer ${
                        isTesting
                          ? 'bg-red-600 text-white shadow-[0_0_12px_#ef4444]'
                          : isLight
                          ? 'bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300'
                          : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30'
                      }`}
                      title={strings.copy.transmitBtn}
                    >
                      <Send className="w-3 h-3" />
                      <span>{isTesting ? strings.remote.transmitting : strings.copy.transmitBtn}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Copy HEX */}
                      <button
                        onClick={() => handleCopyHex(cmd.hexCode)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          isLight
                            ? 'bg-white hover:bg-sky-100 text-slate-600 border-sky-200'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                        }`}
                        title="Copy HEX"
                      >
                        {copiedHex === cmd.hexCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <CopyIcon className="w-3.5 h-3.5" />}
                      </button>

                      {/* Quick Assign */}
                      <button
                        onClick={() => onAssignToRemote(cmd)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition border cursor-pointer ${
                          isLight
                            ? 'bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300'
                            : 'bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border-purple-800/40'
                        }`}
                        title={strings.copy.assignToRemoteBtn}
                      >
                        <Tv className="w-3 h-3" />
                        <span>{strings.copy.assignToRemoteBtn}</span>
                      </button>

                      {/* Delete */}
                      <button
                        id={`btn-delete-cmd-${cmd.id}`}
                        onClick={() => handleDeleteCommand(cmd)}
                        className={`p-1.5 rounded-lg border transition active:scale-90 cursor-pointer ${
                          isLight
                            ? 'bg-white hover:bg-rose-100 text-rose-600 border-rose-200 shadow-xs'
                            : 'bg-slate-900 hover:bg-rose-950/70 text-rose-400 hover:text-rose-300 border-slate-800'
                        }`}
                        title={strings.common.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Undo Notification */}
      {undoItem && (
        <div
          id="banner-undo-delete"
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-3 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            isLight
              ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-900/30'
              : 'bg-blue-950/95 text-white border-blue-800/90 shadow-black/80 backdrop-blur-md'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isLight
                  ? 'bg-blue-700/80 text-blue-100'
                  : 'bg-blue-900/80 text-blue-300 border border-blue-800/60'
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate text-white">
                {strings.copy.commandDeletedNotice.replace('{name}', undoItem.command.name)}
              </p>
              <p className={`text-[10px] ${isLight ? 'text-blue-100' : 'text-blue-300/80'}`}>
                {language === 'pt'
                  ? 'Comando excluído da biblioteca'
                  : language === 'es'
                  ? 'Comando eliminado de la biblioteca'
                  : 'Command deleted from library'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              id="btn-undo-delete-command"
              onClick={handleUndoDelete}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer border ${
                isLight
                  ? 'bg-sky-300 hover:bg-sky-200 text-blue-950 border-sky-200'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/40'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{strings.common.undo}</span>
            </button>
            <button
              id="btn-dismiss-undo-banner"
              onClick={handleDismissUndo}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isLight
                  ? 'text-blue-200 hover:text-white hover:bg-blue-700/60'
                  : 'text-blue-300 hover:text-white hover:bg-blue-900/60'
              }`}
              title={strings.common.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Temporary Restored Notice */}
      {restoredNotice && (
        <div
          id="banner-restored-notice"
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-3 rounded-2xl shadow-xl border flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            isLight
              ? 'bg-sky-600 text-white border-sky-500 shadow-sky-950/20'
              : 'bg-sky-950/95 text-sky-200 border-sky-800 shadow-black/50 backdrop-blur-md'
          }`}
        >
          <div className="w-6 h-6 rounded-lg bg-sky-500/30 text-sky-300 flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs font-semibold truncate">{restoredNotice}</p>
        </div>
      )}
    </div>
  );
};
