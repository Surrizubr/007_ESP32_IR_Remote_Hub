import React, { useState, useMemo } from 'react';
import {
  History,
  Send,
  Radio,
  CheckCircle2,
  Zap,
  Search,
  Trash2,
  Clock,
  Copy,
  Check,
  Calendar,
} from 'lucide-react';
import { ActivityLogItem, ActivityLogType, ESP32DeviceState, IRCommand } from '../types';
import { esp32 } from '../services/esp32Service';
import { feedback } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface HistoryScreenProps {
  logs: ActivityLogItem[];
  onClearHistory: () => void;
  onDeleteLog: (id: string) => void;
  espState: ESP32DeviceState;
  commands: IRCommand[];
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  logs,
  onClearHistory,
  onDeleteLog,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings } = useLanguage();

  const [selectedFilter, setSelectedFilter] = useState<'all' | ActivityLogType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedHexId, setCopiedHexId] = useState<string | null>(null);
  const [retransmittingId, setRetransmittingId] = useState<string | null>(null);

  // Filter logs based on category and search text
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedFilter !== 'all' && log.type !== selectedFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = log.title.toLowerCase().includes(query);
        const matchSub = log.subtitle?.toLowerCase().includes(query) || false;
        const matchDetails = log.details?.toLowerCase().includes(query) || false;
        const matchHex = log.hexCode?.toLowerCase().includes(query) || false;
        const matchProto = log.protocol?.toLowerCase().includes(query) || false;
        const matchRemote = log.remoteName?.toLowerCase().includes(query) || false;
        return matchTitle || matchSub || matchDetails || matchHex || matchProto || matchRemote;
      }
      return true;
    });
  }, [logs, selectedFilter, searchQuery]);

  // Group logs by Day (YYYY-MM-DD)
  const groupedByDay = useMemo(() => {
    const groups: { [dateKey: string]: { label: string; date: Date; items: ActivityLogItem[] } } = {};

    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filteredLogs.forEach((log) => {
      let logDate: Date;
      try {
        logDate = new Date(log.timestamp);
        if (isNaN(logDate.getTime())) {
          logDate = new Date();
        }
      } catch {
        logDate = new Date();
      }

      const dateKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(
        logDate.getDate()
      ).padStart(2, '0')}`;

      let label = '';
      if (logDate.toDateString() === todayStr) {
        label = `${strings.history.today} • ${logDate.toLocaleDateString()}`;
      } else if (logDate.toDateString() === yesterdayStr) {
        label = `${strings.history.yesterday} • ${logDate.toLocaleDateString()}`;
      } else {
        const weekday = logDate.toLocaleDateString(undefined, { weekday: 'long' });
        const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        label = `${capWeekday} • ${logDate.toLocaleDateString()}`;
      }

      if (!groups[dateKey]) {
        groups[dateKey] = {
          label,
          date: logDate,
          items: [],
        };
      }
      groups[dateKey].items.push(log);
    });

    // Sort days descending
    return Object.keys(groups)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((key) => groups[key]);
  }, [filteredLogs, strings]);

  // Copy hex code to clipboard
  const handleCopyHex = (hex: string, id: string) => {
    feedback.playClick();
    navigator.clipboard?.writeText(hex);
    setCopiedHexId(id);
    setTimeout(() => {
      setCopiedHexId(null);
    }, 1500);
  };

  // Retransmit IR command directly from history
  const handleRetransmit = async (log: ActivityLogItem) => {
    if (!log.hexCode) return;
    feedback.playTransmitBeep();
    setRetransmittingId(log.id);

    // Find if command exists or build temporary one
    const cmd: IRCommand = {
      id: `temp-${Date.now()}`,
      name: log.title,
      category: 'custom',
      protocol: log.protocol || 'NEC',
      hexCode: log.hexCode,
      bits: log.bits || 32,
      timestamp: new Date().toISOString(),
      syncedToEsp32: true,
    };

    await esp32.transmitIR(cmd);

    setTimeout(() => {
      setRetransmittingId(null);
    }, 400);
  };

  // Helper to render type badge and icon
  const renderTypeBadge = (type: ActivityLogType) => {
    switch (type) {
      case 'acionamento':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              isLight
                ? 'bg-sky-100/90 text-sky-800 border-sky-300'
                : 'bg-sky-950/80 text-sky-300 border-sky-700/60'
            }`}
          >
            <Send className="w-3 h-3 text-sky-500" />
            <span>{strings.history.filterTrigger}</span>
          </span>
        );
      case 'captura':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              isLight
                ? 'bg-purple-100/90 text-purple-800 border-purple-300'
                : 'bg-purple-950/80 text-purple-300 border-purple-700/60'
            }`}
          >
            <Radio className="w-3 h-3 text-purple-500" />
            <span>{strings.history.filterCapture}</span>
          </span>
        );
      case 'aprendizado':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              isLight
                ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>{strings.history.filterLearn}</span>
          </span>
        );
      case 'automacao':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              isLight
                ? 'bg-amber-100/90 text-amber-900 border-amber-300'
                : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-500" />
            <span>{strings.history.filterAutomation}</span>
          </span>
        );
    }
  };

  // Format timestamp to local HH:MM:SS
  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
      return ts;
    } catch {
      return ts;
    }
  };

  // Stats
  const countByType = useMemo(() => {
    return {
      all: logs.length,
      acionamento: logs.filter((l) => l.type === 'acionamento').length,
      captura: logs.filter((l) => l.type === 'captura').length,
      aprendizado: logs.filter((l) => l.type === 'aprendizado').length,
      automacao: logs.filter((l) => l.type === 'automacao').length,
    };
  }, [logs]);

  return (
    <div id="history-screen" className="flex flex-col pb-24 px-3 pt-2 max-w-md mx-auto space-y-4">
      {/* HEADER CARD */}
      <div
        className={`rounded-3xl p-4 shadow-xl border transition-colors ${
          isLight
            ? 'bg-white/95 border-sky-200 shadow-sky-100/70'
            : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b mb-3 border-inherit">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
                isLight ? 'bg-indigo-600' : 'bg-indigo-600'
              }`}
            >
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {strings.history.title}
              </h2>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {strings.history.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-3">
          <Search
            className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
              isLight ? 'text-slate-400' : 'text-slate-500'
            }`}
          />
          <input
            id="input-search-history"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={strings.history.searchPlaceholder}
            className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border outline-none transition ${
              isLight
                ? 'bg-sky-50/70 border-sky-200 text-slate-900 focus:border-sky-400 focus:bg-white'
                : 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold">
          <button
            id="filter-hist-all"
            onClick={() => {
              feedback.playClick();
              setSelectedFilter('all');
            }}
            className={`px-3 py-1 rounded-xl whitespace-nowrap transition border ${
              selectedFilter === 'all'
                ? isLight
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : isLight
                ? 'bg-sky-50 text-slate-700 border-sky-200 hover:bg-sky-100'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            {strings.history.filterAll} ({countByType.all})
          </button>

          <button
            id="filter-hist-acionamento"
            onClick={() => {
              feedback.playClick();
              setSelectedFilter('acionamento');
            }}
            className={`px-3 py-1 rounded-xl whitespace-nowrap flex items-center gap-1 transition border ${
              selectedFilter === 'acionamento'
                ? isLight
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-sky-600 text-white border-sky-500 shadow-sm'
                : isLight
                ? 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                : 'bg-slate-800 text-sky-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <Send className="w-3 h-3" />
            <span>{strings.history.filterTrigger} ({countByType.acionamento})</span>
          </button>

          <button
            id="filter-hist-captura"
            onClick={() => {
              feedback.playClick();
              setSelectedFilter('captura');
            }}
            className={`px-3 py-1 rounded-xl whitespace-nowrap flex items-center gap-1 transition border ${
              selectedFilter === 'captura'
                ? isLight
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-purple-600 text-white border-purple-500 shadow-sm'
                : isLight
                ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                : 'bg-slate-800 text-purple-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>{strings.history.filterCapture} ({countByType.captura})</span>
          </button>

          <button
            id="filter-hist-aprendizado"
            onClick={() => {
              feedback.playClick();
              setSelectedFilter('aprendizado');
            }}
            className={`px-3 py-1 rounded-xl whitespace-nowrap flex items-center gap-1 transition border ${
              selectedFilter === 'aprendizado'
                ? isLight
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : isLight
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-800 text-emerald-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>{strings.history.filterLearn} ({countByType.aprendizado})</span>
          </button>

          <button
            id="filter-hist-automacao"
            onClick={() => {
              feedback.playClick();
              setSelectedFilter('automacao');
            }}
            className={`px-3 py-1 rounded-xl whitespace-nowrap flex items-center gap-1 transition border ${
              selectedFilter === 'automacao'
                ? isLight
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-amber-600 text-white border-amber-500 shadow-sm'
                : isLight
                ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>{strings.history.filterAutomation} ({countByType.automacao})</span>
          </button>
        </div>
      </div>

      {/* TIMELINE LIST GROUPED BY DAY */}
      {groupedByDay.length === 0 ? (
        <div
          className={`rounded-3xl p-8 text-center border transition-colors flex flex-col items-center justify-center ${
            isLight
              ? 'bg-white/90 border-sky-200 text-slate-600 shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 shadow-sm'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
              isLight ? 'bg-sky-100 text-sky-600' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <History className="w-6 h-6 opacity-80" />
          </div>
          <h3 className={`font-bold text-sm mb-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>
            {strings.history.noLogsFound}
          </h3>
          <p className="text-xs max-w-xs leading-relaxed">
            {searchQuery || selectedFilter !== 'all'
              ? strings.history.noLogsFound
              : strings.history.noLogsHelp}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map((group) => (
            <div key={group.label} className="space-y-2">
              {/* Day Header Divider */}
              <div className="flex items-center gap-2 px-1 pt-1">
                <Calendar className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                <span
                  className={`text-xs font-bold font-mono uppercase tracking-wider ${
                    isLight ? 'text-indigo-950' : 'text-indigo-300'
                  }`}
                >
                  {group.label}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ml-auto ${
                    isLight ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-950/80 text-indigo-300'
                  }`}
                >
                  {group.items.length} {group.items.length === 1 ? strings.history.recordSingle : strings.history.recordPlural}
                </span>
              </div>

              {/* Items in this day */}
              <div className="space-y-2">
                {group.items.map((log) => {
                  const isRetransmitting = retransmittingId === log.id;
                  const isCopied = copiedHexId === log.id;

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-2xl border transition-all duration-150 ${
                        isLight
                          ? 'bg-white/95 border-sky-200/90 shadow-sm hover:border-sky-300'
                          : 'bg-slate-900/90 border-slate-800/90 shadow-sm hover:border-slate-700'
                      }`}
                    >
                      {/* Top row: Label Badge + Time + Delete */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {renderTypeBadge(log.type)}
                          {log.protocol && (
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-md ${
                                isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {log.protocol} {log.bits ? `(${log.bits}b)` : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                          <span
                            className={`text-[11px] font-mono font-medium flex items-center gap-1 ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            <Clock className="w-3 h-3 opacity-70" />
                            {formatTime(log.timestamp)}
                          </span>

                          <button
                            onClick={() => {
                              feedback.playClick();
                              onDeleteLog(log.id);
                            }}
                            className={`p-1 rounded-lg transition ${
                              isLight
                                ? 'text-slate-300 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-600 hover:text-rose-400 hover:bg-slate-800'
                            }`}
                            title={strings.common.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Main Title & Subtitle */}
                      <div className="mb-2">
                        <h4
                          className={`text-xs font-bold leading-snug ${
                            isLight ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {log.title}
                        </h4>
                        {log.subtitle && (
                          <p
                            className={`text-[11px] font-medium mt-0.5 ${
                              isLight ? 'text-slate-600' : 'text-slate-400'
                            }`}
                          >
                            {log.subtitle}
                          </p>
                        )}
                        {log.details && (
                          <p
                            className={`text-[10px] mt-1 italic ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            {log.details}
                          </p>
                        )}
                      </div>

                      {/* Bottom action row: Hex code chip & Retransmit button */}
                      {log.hexCode && (
                        <div
                          className={`flex items-center justify-between pt-2 mt-2 border-t text-xs ${
                            isLight ? 'border-sky-100' : 'border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border font-semibold ${
                                isLight
                                  ? 'bg-slate-50 text-slate-700 border-slate-200'
                                  : 'bg-slate-950 text-sky-400 border-slate-800'
                              }`}
                            >
                              {log.hexCode}
                            </span>
                            <button
                              onClick={() => handleCopyHex(log.hexCode!, log.id)}
                              className={`p-1 rounded-md transition ${
                                isLight
                                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
                              }`}
                              title="Copy HEX"
                            >
                              {isCopied ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          <button
                            id={`btn-retransmit-${log.id}`}
                            onClick={() => handleRetransmit(log)}
                            disabled={isRetransmitting}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition active:scale-95 shadow-sm ${
                              isRetransmitting
                                ? 'bg-red-500 text-white border-red-400 animate-pulse'
                                : isLight
                                ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
                                : 'bg-slate-800 hover:bg-slate-750 text-sky-300 border-slate-700'
                            }`}
                            title={strings.history.retransmitBtn}
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>{isRetransmitting ? strings.remote.transmitting : strings.history.retransmitBtn}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
