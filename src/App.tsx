/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScreenTab,
  IRCommand,
  RemoteDevice,
  AutomationRule,
  ActivityLogItem,
  ESP32DeviceState,
} from './types';
import {
  DEFAULT_IR_COMMANDS,
  DEFAULT_BUTTON_MAPPINGS,
  DEFAULT_AUTOMATIONS,
  DEFAULT_REMOTES,
  DEFAULT_HISTORY_LOGS,
} from './data/defaultCommands';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { esp32 } from './services/esp32Service';
import { nativeService } from './services/nativeService';
import { feedback } from './services/soundService';

import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { RemoteControlScreen } from './components/RemoteControlScreen';
import { CopyScreen } from './components/CopyScreen';
import { AutomationScreen } from './components/AutomationScreen';
import { ScheduleScreen } from './components/ScheduleScreen';
import { DevicesScreen } from './components/DevicesScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { DeviceSyncScreen } from './components/DeviceSyncScreen';
import { DrawerMenu } from './components/DrawerMenu';
import { ButtonAssignModal } from './components/ButtonAssignModal';
import { FirmwareModal } from './components/FirmwareModal';

const STORAGE_KEYS = {
  COMMANDS: 'esp32_ir_commands_v1',
  BUTTON_MAPPINGS: 'esp32_ir_button_mappings_v1',
  AUTOMATIONS: 'esp32_ir_automations_v1',
  REMOTES: 'esp32_ir_remotes_v1',
  HISTORY: 'esp32_ir_history_logs_v1',
};

function MainApp() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings } = useLanguage();

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<ScreenTab>('home');

  // Core Application State with localStorage persistence
  const [commands, setCommands] = useState<IRCommand[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMMANDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((c: IRCommand) => c.id));
          const missingDefaults = DEFAULT_IR_COMMANDS.filter((dc) => !existingIds.has(dc.id));
          return [...parsed, ...missingDefaults];
        }
      }
    } catch (e) {
      console.warn('Error loading commands from storage:', e);
    }
    return DEFAULT_IR_COMMANDS;
  });

  const [buttonMappings, setButtonMappings] = useState<Record<string, string | string[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BUTTON_MAPPINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_BUTTON_MAPPINGS, ...parsed };
      }
    } catch (e) {
      console.warn('Error loading button mappings from storage:', e);
    }
    return DEFAULT_BUTTON_MAPPINGS;
  });

  const [automations, setAutomations] = useState<AutomationRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTOMATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error loading automations from storage:', e);
    }
    return DEFAULT_AUTOMATIONS;
  });

  const [remotes, setRemotes] = useState<RemoteDevice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REMOTES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const defaultIds = new Set(DEFAULT_REMOTES.map((r) => r.id));
          const existingIds = new Set(parsed.map((r: RemoteDevice) => r.id));
          const missingDefaults = DEFAULT_REMOTES.filter((dr) => !existingIds.has(dr.id));
          return [
            ...parsed.map((r: RemoteDevice) => ({
              ...r,
              isDefault: r.isDefault ?? defaultIds.has(r.id),
            })),
            ...missingDefaults,
          ];
        }
      }
    } catch (e) {
      console.warn('Error loading remotes from storage:', e);
    }
    return DEFAULT_REMOTES;
  });

  const [historyLogs, setHistoryLogs] = useState<ActivityLogItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error loading history from storage:', e);
    }
    return DEFAULT_HISTORY_LOGS;
  });

  // ESP32 Hardware / Connection state
  const [espState, setEspState] = useState<ESP32DeviceState>(() => esp32.getState());

  // Modal and Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isFirmwareModalOpen, setIsFirmwareModalOpen] = useState<boolean>(false);
  const [assignModal, setAssignModal] = useState<{
    isOpen: boolean;
    buttonKey: string;
    buttonLabel: string;
    currentCommandIds?: string[];
  }>({
    isOpen: false,
    buttonKey: '',
    buttonLabel: '',
  });

  // Hidden file input for importing backup JSON
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to ESP32 device state updates
  useEffect(() => {
    const unsubscribe = esp32.subscribe((newState) => {
      setEspState(newState);
    });
    return () => unsubscribe();
  }, []);

  // Initialize Native Android / iOS capabilities (Status bar, splash screen)
  useEffect(() => {
    nativeService.init(isLight);
  }, [isLight]);

  // Hardware Back Button Handler for Android
  useEffect(() => {
    const unregister = nativeService.registerBackButtonHandler(() => {
      if (assignModal.isOpen) {
        setAssignModal((prev) => ({ ...prev, isOpen: false }));
        return true;
      }
      if (isFirmwareModalOpen) {
        setIsFirmwareModalOpen(false);
        return true;
      }
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return true;
      }
      if (currentTab !== 'home') {
        setCurrentTab('home');
        return true;
      }
      return false; // Exit app
    });

    return () => {
      unregister();
    };
  }, [assignModal.isOpen, isFirmwareModalOpen, isDrawerOpen, currentTab]);

  // Save commands to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMMANDS, JSON.stringify(commands));
    } catch (e) {
      console.warn('Error saving commands to storage:', e);
    }
  }, [commands]);

  // Save button mappings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BUTTON_MAPPINGS, JSON.stringify(buttonMappings));
    } catch (e) {
      console.warn('Error saving button mappings to storage:', e);
    }
  }, [buttonMappings]);

  // Save automations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTOMATIONS, JSON.stringify(automations));
    } catch (e) {
      console.warn('Error saving automations to storage:', e);
    }
  }, [automations]);

  // Save remotes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REMOTES, JSON.stringify(remotes));
    } catch (e) {
      console.warn('Error saving remotes to storage:', e);
    }
  }, [remotes]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historyLogs));
    } catch (e) {
      console.warn('Error saving history to storage:', e);
    }
  }, [historyLogs]);

  // Activity logger helper
  const handleLogActivity = useCallback((log: Omit<ActivityLogItem, 'id' | 'timestamp'>) => {
    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    setHistoryLogs((prev) => [newLog, ...prev.slice(0, 199)]); // Keep up to 200 logs
  }, []);

  // Listen for real-time IR Sniffed signals from ESP32 to trigger automations
  useEffect(() => {
    const unsubscribeIR = esp32.onIRReceived((data) => {
      // Find any enabled automation triggered by this incoming IR hex code
      const matchingRule = automations.find((rule) => {
        if (!rule.enabled || !rule.triggerCommandId) return false;
        const triggerCmd = commands.find((c) => c.id === rule.triggerCommandId);
        if (!triggerCmd) return false;
        return triggerCmd.hexCode.toLowerCase() === data.hexCode.toLowerCase();
      });

      if (matchingRule) {
        handleLogActivity({
          type: 'automacao',
          title: `${strings.automation.title}: ${matchingRule.name}`,
          subtitle: `Gatilho IR: ${data.hexCode} (${data.protocol})`,
          details: `Executando ${matchingRule.actions.length} ações configuradas`,
          actionsCount: matchingRule.actions.length,
          hexCode: data.hexCode,
          protocol: data.protocol as any,
        });

        // Run automation actions sequentially
        (async () => {
          for (const step of matchingRule.actions) {
            if (step.delayMs > 0) {
              await new Promise((r) => setTimeout(r, step.delayMs));
            }
            const actionCmd = commands.find((c) => c.id === step.commandId);
            if (actionCmd) {
              await esp32.transmitIR(actionCmd);
            }
          }
        })();
      }
    });

    return () => unsubscribeIR();
  }, [automations, commands, handleLogActivity, strings.automation.title]);

  // Scheduled automations timer (runs every 30 seconds)
  useEffect(() => {
    let lastTriggeredMinute = '';

    const interval = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentHHMM === lastTriggeredMinute) return;

      automations.forEach((rule) => {
        if (rule.enabled && rule.scheduleTimes && rule.scheduleTimes.includes(currentHHMM)) {
          lastTriggeredMinute = currentHHMM;

          handleLogActivity({
            type: 'automacao',
            title: `${strings.automation.title}: ${rule.name}`,
            subtitle: `Horário agendado: ${currentHHMM}`,
            details: `Disparado automaticamente pelo agendador`,
            actionsCount: rule.actions.length,
          });

          (async () => {
            for (const step of rule.actions) {
              if (step.delayMs > 0) {
                await new Promise((r) => setTimeout(r, step.delayMs));
              }
              const actionCmd = commands.find((c) => c.id === step.commandId);
              if (actionCmd) {
                await esp32.transmitIR(actionCmd);
              }
            }
          })();
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [automations, commands, handleLogActivity, strings.automation.title]);

  // Command handlers
  const handleSaveCommand = (cmd: IRCommand) => {
    setCommands((prev) => {
      const idx = prev.findIndex((c) => c.id === cmd.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cmd;
        return next;
      }
      return [cmd, ...prev];
    });
  };

  const handleDeleteCommand = (id: string) => {
    setCommands((prev) => prev.filter((c) => c.id !== id));
  };

  const handleRestoreCommand = (cmd: IRCommand, originalIndex?: number) => {
    setCommands((prev) => {
      if (prev.some((c) => c.id === cmd.id)) return prev;
      if (typeof originalIndex === 'number' && originalIndex >= 0 && originalIndex <= prev.length) {
        const next = [...prev];
        next.splice(originalIndex, 0, cmd);
        return next;
      }
      return [cmd, ...prev];
    });
  };

  // Remote handlers
  const [activeRemoteId, setActiveRemoteId] = useState<string>(() => remotes[0]?.id || 'tv');

  const handleAddRemote = (newRemote: RemoteDevice) => {
    setRemotes((prev) => [...prev, newRemote]);
    setActiveRemoteId(newRemote.id);
  };

  const handleAddRemoteWithCommands = (
    newRemote: RemoteDevice,
    newCommands: IRCommand[],
    newMappings: Record<string, string>
  ) => {
    setRemotes((prev) => [...prev, newRemote]);
    setCommands((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const filtered = newCommands.filter((c) => !existingIds.has(c.id));
      return [...prev, ...filtered];
    });
    setButtonMappings((prev) => ({
      ...prev,
      ...newMappings,
    }));
    setActiveRemoteId(newRemote.id);
    setCurrentTab('home');
  };

  const handleImportCommandsOnly = (newCommands: IRCommand[]) => {
    setCommands((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const filtered = newCommands.filter((c) => !existingIds.has(c.id));
      return [...prev, ...filtered];
    });
  };

  const handleUpdateRemote = (updated: RemoteDevice) => {
    setRemotes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDeleteRemote = (id: string) => {
    setRemotes((prev) => {
      const target = prev.find((r) => r.id === id);
      const isDefault = target?.isDefault || DEFAULT_REMOTES.some((r) => r.id === id);
      if (isDefault) {
        console.warn('Controles padrão do sistema não podem ser excluídos:', id);
        return prev;
      }
      const remaining = prev.filter((r) => r.id !== id);
      if (remaining.length === 0) {
        const fallbackRemote: RemoteDevice = {
          id: 'tv',
          name: 'Televisão',
          layoutType: 'tv',
          isDefault: true,
          createdAt: new Date().toISOString(),
        };
        setActiveRemoteId('tv');
        return [fallbackRemote];
      }
      if (activeRemoteId === id) {
        setActiveRemoteId(remaining[0].id);
      }
      return remaining;
    });
  };

  // Button mapping handlers
  const handleOpenAssignModal = (buttonKey: string, label: string, currentCommandIds?: string[]) => {
    setAssignModal({
      isOpen: true,
      buttonKey,
      buttonLabel: label,
      currentCommandIds,
    });
  };

  const handleAssignCommands = (buttonKey: string, commandIds: string[]) => {
    setButtonMappings((prev) => {
      const next = { ...prev };
      if (commandIds.length === 0) {
        delete next[buttonKey];
      } else if (commandIds.length === 1) {
        next[buttonKey] = commandIds[0];
      } else {
        next[buttonKey] = commandIds;
      }
      return next;
    });
  };

  const handleAssignToRemote = (cmd: IRCommand) => {
    // Navigate to remote tab and open assign modal with first button or switch to home
    setCurrentTab('home');
  };

  // Automation handlers
  const handleSaveAutomation = (rule: AutomationRule) => {
    setAutomations((prev) => {
      const idx = prev.findIndex((r) => r.id === rule.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = rule;
        return next;
      }
      return [rule, ...prev];
    });
  };

  const handleDeleteAutomation = (id: string) => {
    setAutomations((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  // History handlers
  const handleClearHistory = () => {
    setHistoryLogs([]);
  };

  const handleDeleteLog = (id: string) => {
    setHistoryLogs((prev) => prev.filter((l) => l.id !== id));
  };

  // Backup: Export data to JSON file
  const handleExportData = () => {
    try {
      const exportPayload = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        commands,
        buttonMappings,
        automations,
        remotes,
        historyLogs: historyLogs.slice(0, 100),
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `esp32-ir-hub-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      feedback.playCaptureSuccess();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  // Backup: Import data from JSON file
  const handleImportTrigger = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileImported = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (Array.isArray(parsed.commands)) {
          setCommands(parsed.commands);
        }
        if (parsed.buttonMappings && typeof parsed.buttonMappings === 'object') {
          setButtonMappings(parsed.buttonMappings);
        }
        if (Array.isArray(parsed.automations)) {
          setAutomations(parsed.automations);
        }
        if (Array.isArray(parsed.remotes)) {
          setRemotes(parsed.remotes);
        }
        if (Array.isArray(parsed.historyLogs)) {
          setHistoryLogs(parsed.historyLogs);
        }

        feedback.playCaptureSuccess();
        alert('Backup importado com sucesso!');
      } catch (err: any) {
        console.error('Import error:', err);
        alert(`Erro ao importar arquivo: ${err?.message || 'Arquivo JSON inválido'}`);
      }
    };
    reader.readAsText(file);
  };

  // Reset to factory defaults
  const handleResetDefaults = () => {
    if (window.confirm('Deseja realmente restaurar os dados de fábrica? Todos os comandos customizados serão resetados.')) {
      setCommands(DEFAULT_IR_COMMANDS);
      setButtonMappings(DEFAULT_BUTTON_MAPPINGS);
      setAutomations(DEFAULT_AUTOMATIONS);
      setRemotes(DEFAULT_REMOTES);
      setHistoryLogs(DEFAULT_HISTORY_LOGS);
      feedback.playClick();
    }
  };

  // Screen title for Header
  const activeScreenTitle = {
    home: strings.nav.homeSub,
    copy: strings.nav.copySub,
    automation: strings.nav.autoSub,
    schedule: strings.nav.scheduleSub,
    devices: strings.nav.devicesSub,
    history: strings.nav.historySub,
    sync: strings.nav.syncSub,
  }[currentTab];

  return (
    <div
      id="app-root"
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 select-none ${
        isLight
          ? 'bg-slate-50 text-slate-900 selection:bg-sky-200'
          : 'bg-slate-950 text-slate-100 selection:bg-sky-800'
      }`}
    >
      {/* Top Header */}
      <Header
        espState={espState}
        onOpenMenu={() => {
          feedback.playClick();
          setIsDrawerOpen(true);
        }}
        onQuickSyncClick={() => {
          feedback.playClick();
          setCurrentTab('sync');
        }}
        activeScreenTitle={activeScreenTitle}
      />

      {/* Main Screen Content with responsive max width */}
      <main className="flex-1 w-full max-w-lg mx-auto pb-24">
        {currentTab === 'home' && (
          <RemoteControlScreen
            commands={commands}
            buttonMappings={buttonMappings}
            espState={espState}
            remotes={remotes}
            activeRemoteId={activeRemoteId}
            onSelectRemoteId={setActiveRemoteId}
            onAddRemote={handleAddRemote}
            onUpdateRemote={handleUpdateRemote}
            onDeleteRemote={handleDeleteRemote}
            onOpenAssignModal={handleOpenAssignModal}
            onLogActivity={handleLogActivity}
          />
        )}

        {currentTab === 'copy' && (
          <CopyScreen
            commands={commands}
            onSaveCommand={handleSaveCommand}
            onDeleteCommand={handleDeleteCommand}
            onRestoreCommand={handleRestoreCommand}
            espState={espState}
            onAssignToRemote={handleAssignToRemote}
            onLogActivity={handleLogActivity}
          />
        )}

        {currentTab === 'automation' && (
          <AutomationScreen
            mode="trigger"
            automations={automations}
            commands={commands}
            onSaveAutomation={handleSaveAutomation}
            onDeleteAutomation={handleDeleteAutomation}
            onToggleAutomation={handleToggleAutomation}
            espState={espState}
            onLogActivity={handleLogActivity}
          />
        )}

        {currentTab === 'schedule' && (
          <ScheduleScreen
            automations={automations}
            commands={commands}
            onSaveAutomation={handleSaveAutomation}
            onDeleteAutomation={handleDeleteAutomation}
            onToggleAutomation={handleToggleAutomation}
            espState={espState}
            onLogActivity={handleLogActivity}
          />
        )}

        {currentTab === 'devices' && (
          <DevicesScreen
            espState={espState}
            existingCommands={commands}
            existingRemotes={remotes}
            onAddRemoteWithCommands={handleAddRemoteWithCommands}
            onImportCommandsOnly={handleImportCommandsOnly}
            onLogActivity={handleLogActivity}
          />
        )}

        {currentTab === 'history' && (
          <HistoryScreen
            logs={historyLogs}
            onClearHistory={handleClearHistory}
            onDeleteLog={handleDeleteLog}
            espState={espState}
            commands={commands}
          />
        )}

        {currentTab === 'sync' && (
          <DeviceSyncScreen
            espState={espState}
            onBack={() => setCurrentTab('home')}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <BottomNavBar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        badgeCount={{
          automation: automations.filter((a) => a.enabled && (a.type === 'trigger' || Boolean(a.triggerCommandId))).length,
          schedule: automations.filter((a) => a.enabled && (a.type === 'schedule' || (a.scheduleTimes && a.scheduleTimes.length > 0))).length,
        }}
      />

      {/* Side Settings / Diagnostics Drawer */}
      <DrawerMenu
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        espState={espState}
        onOpenFirmwareModal={() => {
          setIsDrawerOpen(false);
          setIsFirmwareModalOpen(true);
        }}
        onExportData={handleExportData}
        onImportData={handleImportTrigger}
        onResetDefaults={handleResetDefaults}
      />

      {/* Button Assignment Modal */}
      <ButtonAssignModal
        isOpen={assignModal.isOpen}
        onClose={() => setAssignModal((prev) => ({ ...prev, isOpen: false }))}
        buttonKey={assignModal.buttonKey}
        buttonLabel={assignModal.buttonLabel}
        currentCommandIds={assignModal.currentCommandIds}
        commands={commands}
        onAssignCommands={handleAssignCommands}
        onNavigateToCopy={() => {
          setAssignModal((prev) => ({ ...prev, isOpen: false }));
          setCurrentTab('copy');
        }}
      />

      {/* Arduino C++ Firmware Modal */}
      <FirmwareModal
        isOpen={isFirmwareModalOpen}
        onClose={() => setIsFirmwareModalOpen(false)}
        pinConfig={espState.pinConfig}
      />

      {/* Hidden File Input for Importing Config */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImported}
        accept=".json"
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
    </ThemeProvider>
  );
}

