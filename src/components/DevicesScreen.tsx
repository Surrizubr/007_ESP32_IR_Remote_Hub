import React, { useState, useMemo } from 'react';
import {
  Tv,
  AirVent,
  Fan,
  Film,
  Music,
  Disc,
  Maximize2,
  Camera,
  Lightbulb,
  Cpu,
  Search,
  ChevronRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Send,
  Sparkles,
  Layers,
  Star,
  ExternalLink,
  Plus,
  Sliders,
  Shield,
  Zap,
} from 'lucide-react';
import {
  DeviceTypeInfo,
  DeviceTypeId,
  DeviceBrand,
  DeviceModel,
  PresetCommand,
  IRCommand,
  RemoteDevice,
  ESP32DeviceState,
  ActivityLogItem,
  RemoteLayoutType,
} from '../types';
import { DEVICE_LIBRARY } from '../data/deviceLibrary';
import { esp32 } from '../services/esp32Service';
import { feedback } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface DevicesScreenProps {
  espState: ESP32DeviceState;
  existingCommands: IRCommand[];
  existingRemotes: RemoteDevice[];
  onAddRemoteWithCommands: (
    newRemote: RemoteDevice,
    newCommands: IRCommand[],
    newMappings: Record<string, string>
  ) => void;
  onImportCommandsOnly: (newCommands: IRCommand[]) => void;
  onLogActivity?: (log: Omit<ActivityLogItem, 'id' | 'timestamp'>) => void;
}

export const DevicesScreen: React.FC<DevicesScreenProps> = ({
  espState,
  existingCommands,
  existingRemotes,
  onAddRemoteWithCommands,
  onImportCommandsOnly,
  onLogActivity,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { language } = useLanguage();

  // Navigation State
  const [selectedTypeId, setSelectedTypeId] = useState<DeviceTypeId | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Interactive Action Feedback
  const [testingCommandKey, setTestingCommandKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Icon Resolver for Device Types
  const getDeviceIcon = (typeId: DeviceTypeId, className?: string) => {
    switch (typeId) {
      case 'tv':
        return <Tv className={className || 'w-5 h-5'} />;
      case 'decoder':
        return <Cpu className={className || 'w-5 h-5'} />;
      case 'ac':
        return <AirVent className={className || 'w-5 h-5'} />;
      case 'fan':
        return <Fan className={className || 'w-5 h-5'} />;
      case 'smartbox':
        return <Film className={className || 'w-5 h-5'} />;
      case 'sound':
        return <Music className={className || 'w-5 h-5'} />;
      case 'dvd':
        return <Disc className={className || 'w-5 h-5'} />;
      case 'projector':
        return <Maximize2 className={className || 'w-5 h-5'} />;
      case 'camera':
        return <Camera className={className || 'w-5 h-5'} />;
      case 'lights':
        return <Lightbulb className={className || 'w-5 h-5'} />;
      default:
        return <Layers className={className || 'w-5 h-5'} />;
    }
  };

  // Resolved Current Selected Objects
  const currentType = useMemo(
    () => DEVICE_LIBRARY.find((t) => t.id === selectedTypeId) || null,
    [selectedTypeId]
  );

  const currentBrand = useMemo(() => {
    if (!currentType || !selectedBrandId) return null;
    return currentType.brands.find((b) => b.id === selectedBrandId) || null;
  }, [currentType, selectedBrandId]);

  const currentModel = useMemo(() => {
    if (!currentBrand || !selectedModelId) return null;
    return currentBrand.models.find((m) => m.id === selectedModelId) || null;
  }, [currentBrand, selectedModelId]);

  // Global Search across all types, brands, and models
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();

    const results: Array<{
      type: DeviceTypeInfo;
      brand: DeviceBrand;
      model: DeviceModel;
    }> = [];

    DEVICE_LIBRARY.forEach((deviceType) => {
      deviceType.brands.forEach((brand) => {
        brand.models.forEach((model) => {
          if (
            model.name.toLowerCase().includes(q) ||
            brand.name.toLowerCase().includes(q) ||
            deviceType.name.toLowerCase().includes(q) ||
            (model.series && model.series.toLowerCase().includes(q))
          ) {
            results.push({ type: deviceType, brand, model });
          }
        });
      });
    });

    return results;
  }, [searchQuery]);

  // Total counts for stats banner
  const totalStats = useMemo(() => {
    let brandsCount = 0;
    let modelsCount = 0;
    let commandsCount = 0;

    DEVICE_LIBRARY.forEach((t) => {
      brandsCount += t.brands.length;
      t.brands.forEach((b) => {
        modelsCount += b.models.length;
        b.models.forEach((m) => {
          commandsCount += m.commands.length;
        });
      });
    });

    return { typesCount: DEVICE_LIBRARY.length, brandsCount, modelsCount, commandsCount };
  }, []);

  // Action: Test single command
  const handleTestCommand = async (cmd: PresetCommand, modelName: string) => {
    feedback.playTx();
    setTestingCommandKey(cmd.buttonKey);

    // Transmit via ESP32 service
    const rawCmd: IRCommand = {
      id: `test_${cmd.buttonKey}_${Date.now()}`,
      name: `${modelName}: ${cmd.name}`,
      category: currentType?.category || 'custom',
      protocol: cmd.protocol,
      hexCode: cmd.hexCode,
      bits: cmd.bits,
      timestamp: new Date().toISOString(),
      syncedToEsp32: true,
      color: '#3b82f6',
    };

    try {
      await esp32.transmitCommand(rawCmd);
    } catch (e) {
      console.warn('Transmission error:', e);
    }

    if (onLogActivity) {
      onLogActivity({
        type: 'acionamento',
        title: `Teste IR: ${cmd.name}`,
        subtitle: `${modelName} (${cmd.protocol})`,
        details: `Disparo de teste: ${cmd.hexCode} (${cmd.bits} bits)`,
        protocol: cmd.protocol,
        hexCode: cmd.hexCode,
        bits: cmd.bits,
        buttonLabel: cmd.name,
      });
    }

    setTimeout(() => {
      setTestingCommandKey(null);
    }, 1200);
  };

  // Action: Copy HEX code
  const handleCopyHex = (hexCode: string, key: string) => {
    navigator.clipboard.writeText(hexCode);
    feedback.playClick(800, 0.03);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Action: Add model to Home Screen (Primary User Request!)
  const handleAddRemoteToHome = (type: DeviceTypeInfo, brand: DeviceBrand, model: DeviceModel) => {
    feedback.playCaptureSuccess();

    // 1. Create a remote device
    const newRemoteId = `remote_${brand.id}_${model.id}_${Date.now()}`;
    const remoteName = `${brand.name} ${model.name.split('(')[0].trim()}`;

    const newRemote: RemoteDevice = {
      id: newRemoteId,
      name: remoteName,
      layoutType: type.layoutType as RemoteLayoutType,
      isDefault: false,
      createdAt: new Date().toISOString(),
      notes: `${model.name} - Protocolo ${model.protocol} (${model.commands.length} comandos)`,
    };

    // 2. Generate IRCommand list
    const generatedCommands: IRCommand[] = model.commands.map((cmd, idx) => ({
      id: `cmd_${model.id}_${cmd.buttonKey}_${idx}`,
      name: `${brand.name} ${cmd.name}`,
      category: type.category,
      protocol: cmd.protocol,
      hexCode: cmd.hexCode,
      bits: cmd.bits,
      timestamp: new Date().toISOString(),
      syncedToEsp32: true,
      color: '#3b82f6',
      notes: cmd.notes,
    }));

    // 3. Generate button mappings for this remote
    // Button key mapping format for custom remotes: `${remoteId}_${buttonKey}`
    // Also provide fallback default keys if user maps to standard layout
    const newMappings: Record<string, string> = {};
    generatedCommands.forEach((cmd, idx) => {
      const originalPreset = model.commands[idx];
      const buttonKey = originalPreset.buttonKey;

      // Map specifically for this new remote
      newMappings[`${newRemoteId}_${buttonKey}`] = cmd.id;

      // Also map default buttonKey if applicable
      if (!newMappings[buttonKey]) {
        newMappings[buttonKey] = cmd.id;
      }
    });

    if (onLogActivity) {
      onLogActivity({
        type: 'aprendizado',
        title: `Novo Controle: ${remoteName}`,
        subtitle: `Biblioteca IR: ${type.name}`,
        details: `${model.commands.length} comandos infravermelho vinculados e configurados na Tela Home.`,
        protocol: model.protocol,
        remoteName: remoteName,
      });
    }

    // Call callback to commit to App state and switch to Home
    onAddRemoteWithCommands(newRemote, generatedCommands, newMappings);

    setSuccessToast(
      language === 'pt'
        ? `Controle "${remoteName}" criado com sucesso na Tela Home!`
        : `Remote "${remoteName}" successfully added to Home Screen!`
    );

    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  // Action: Import Commands Only
  const handleImportCommands = (type: DeviceTypeInfo, brand: DeviceBrand, model: DeviceModel) => {
    feedback.playCaptureSuccess();

    const generatedCommands: IRCommand[] = model.commands.map((cmd, idx) => ({
      id: `cmd_${model.id}_${cmd.buttonKey}_${idx}_${Date.now()}`,
      name: `${brand.name} ${cmd.name}`,
      category: type.category,
      protocol: cmd.protocol,
      hexCode: cmd.hexCode,
      bits: cmd.bits,
      timestamp: new Date().toISOString(),
      syncedToEsp32: true,
      color: '#3b82f6',
      notes: cmd.notes,
    }));

    onImportCommandsOnly(generatedCommands);

    if (onLogActivity) {
      onLogActivity({
        type: 'aprendizado',
        title: `Comandos Importados: ${brand.name} ${model.name}`,
        subtitle: `${generatedCommands.length} comandos adicionados à lista`,
        details: `Protocolo ${model.protocol}. Disponíveis para botões e automações.`,
        protocol: model.protocol,
      });
    }

    setSuccessToast(
      language === 'pt'
        ? `${generatedCommands.length} comandos importados com sucesso para a lista IR!`
        : `${generatedCommands.length} commands imported successfully!`
    );

    setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  return (
    <div
      id="devices-screen-container"
      className="flex flex-col pb-24 px-3.5 sm:px-4 pt-2 max-w-md sm:max-w-lg mx-auto w-full space-y-4 animate-in fade-in duration-200"
    >
      {/* Success Toast */}
      {successToast && (
        <div
          id="devices-success-toast"
          className="p-3.5 rounded-2xl bg-emerald-600 text-white flex items-center justify-between shadow-lg shadow-emerald-600/30 animate-in slide-in-from-top duration-300"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="p-1 hover:bg-emerald-700/60 rounded-lg text-xs"
          >
            OK
          </button>
        </div>
      )}

      {/* Hero Header Banner */}
      <div
        id="devices-hero-banner"
        className={`p-5 rounded-3xl border shadow-sm transition-all relative overflow-hidden ${
          isLight
            ? 'bg-gradient-to-br from-white via-sky-50/50 to-blue-50/40 border-sky-200/80 text-slate-900'
            : 'bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-slate-800 text-white'
        }`}
      >
        <div className="relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-600/15 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                {language === 'pt' ? 'Biblioteca Embutida' : 'Built-in Library'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                10 Tipos • {totalStats.brandsCount} Marcas • {totalStats.modelsCount} Modelos
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {language === 'pt' ? 'Aparelhos & Modelos IR' : 'IR Devices & Models'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
              {language === 'pt'
                ? 'Selecione o tipo de aparelho, marca e modelo para testar os comandos e adicionar o controle remoto pronto diretamente na tela Home.'
                : 'Select device type, brand, and model to test commands and add the remote control directly to the Home screen.'}
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="mt-4 relative z-10">
          <div className="relative">
            <Search
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`}
            />
            <input
              id="devices-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'pt'
                  ? 'Buscar por marca ou modelo (ex: Samsung, LG, Arno, Bravia, Apple TV)...'
                  : 'Search by brand or model (e.g. Samsung, LG, Arno, Bravia)...'
              }
              className={`w-full pl-10 pr-10 py-2.5 rounded-2xl text-sm border outline-none transition-all ${
                isLight
                  ? 'bg-white border-sky-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800'
                  : 'bg-slate-800/80 border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-slate-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation when drilling down with Back Button on the same line */}
      {(selectedTypeId || selectedBrandId || selectedModelId) && !searchQuery && (
        <div className="flex items-center gap-2">
          {/* Botão Voltar (somente a seta para esquerda) na mesma linha */}
          <button
            id="btn-nav-back"
            title={language === 'pt' ? 'Voltar' : 'Back'}
            aria-label={language === 'pt' ? 'Voltar' : 'Back'}
            onClick={() => {
              feedback.playClick();
              if (selectedModelId) {
                setSelectedModelId(null);
              } else if (selectedBrandId) {
                setSelectedBrandId(null);
              } else if (selectedTypeId) {
                setSelectedTypeId(null);
              }
            }}
            className={`flex items-center justify-center w-10 h-10 rounded-2xl border transition-all shadow-xs active:scale-90 shrink-0 group ${
              isLight
                ? 'bg-white hover:bg-sky-50 text-slate-700 hover:text-blue-700 border-sky-200 hover:border-blue-400'
                : 'bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700 hover:border-slate-600'
            }`}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-blue-600 dark:text-blue-400" />
          </button>

          <div
            id="devices-breadcrumb-nav"
            className={`flex-1 flex flex-wrap items-center gap-x-2 gap-y-1 p-2.5 px-3.5 rounded-2xl text-xs font-semibold border min-h-[40px] ${
              isLight ? 'bg-white border-sky-100 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <button
              id="btn-breadcrumb-all-types"
              onClick={() => {
                feedback.playClick();
                setSelectedTypeId(null);
                setSelectedBrandId(null);
                setSelectedModelId(null);
              }}
              className="hover:text-blue-600 transition text-slate-500 hover:underline text-left leading-snug"
            >
              <span className="break-words">{language === 'pt' ? 'Todos os tipos de aparelhos' : 'All device types'}</span>
            </button>

            {currentType && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <button
                  onClick={() => {
                    feedback.playClick();
                    setSelectedBrandId(null);
                    setSelectedModelId(null);
                  }}
                  className={`transition text-left leading-snug ${
                    !selectedBrandId ? 'text-blue-600 font-bold' : 'hover:text-blue-600 text-slate-500 hover:underline'
                  }`}
                >
                  <span className="break-words">{currentType.name}</span>
                </button>
              </>
            )}

            {currentBrand && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <button
                  onClick={() => {
                    feedback.playClick();
                    setSelectedModelId(null);
                  }}
                  className={`transition text-left leading-snug ${
                    !selectedModelId ? 'text-blue-600 font-bold' : 'hover:text-blue-600 text-slate-500 hover:underline'
                  }`}
                >
                  <span className="break-words">{currentBrand.name}</span>
                </button>
              </>
            )}

            {currentModel && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-blue-600 font-bold leading-snug break-words">
                  {currentModel.name}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* SEARCH RESULTS VIEW */}
      {searchResults ? (
        <div id="devices-search-results-section" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {language === 'pt'
                ? `Resultados da Busca (${searchResults.length})`
                : `Search Results (${searchResults.length})`}
            </h2>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              {language === 'pt' ? 'Limpar busca' : 'Clear search'}
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div
              className={`p-8 text-center rounded-3xl border ${
                isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-sm">
                {language === 'pt' ? 'Nenhum aparelho encontrado' : 'No devices found'}
              </p>
              <p className="text-xs mt-1">
                {language === 'pt'
                  ? 'Tente buscar por marcas como Samsung, LG, Sony, Arno, Apple ou Epson.'
                  : 'Try searching for brands like Samsung, LG, Sony, Arno, Apple, or Epson.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchResults.map(({ type, brand, model }) => (
                <div
                  key={`${brand.id}_${model.id}`}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isLight
                      ? 'bg-white border-sky-200/80 hover:border-blue-500 hover:shadow-md'
                      : 'bg-slate-900 border-slate-800 hover:border-blue-500 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {type.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-semibold">
                        {model.protocol} • {model.commands.length} cmds
                      </span>
                    </div>

                    <h3 className="font-bold text-sm leading-tight text-slate-900 dark:text-white">
                      {brand.name} - {model.name}
                    </h3>
                    {model.series && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{model.series}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        feedback.playClick();
                        setSelectedTypeId(type.id);
                        setSelectedBrandId(brand.id);
                        setSelectedModelId(model.id);
                        setSearchQuery('');
                      }}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition ${
                        isLight
                          ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                    >
                      {language === 'pt' ? 'Ver Detalhes' : 'View Details'}
                    </button>

                    <button
                      onClick={() => handleAddRemoteToHome(type, brand, model)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{language === 'pt' ? 'Adicionar na Home' : 'Add to Home'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* STEP-BY-STEP EXPLORER */
        <div id="devices-explorer-section" className="space-y-5">
          {/* STEP 1: DEVICE TYPES CAROUSEL / GRID (The 10 devices requested) */}
          {!selectedTypeId && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-0.5">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black inline-flex items-center justify-center shrink-0 shadow-xs">
                    1
                  </span>
                  <span>{language === 'pt' ? 'Escolha o Tipo de Aparelho' : 'Choose Device Type'}</span>
                </h2>
                <span className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200/70 dark:border-blue-800/50 shrink-0">
                  10 {language === 'pt' ? 'categorias' : 'categories'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {DEVICE_LIBRARY.map((deviceType) => {
                  const brandsCount = deviceType.brands.length;
                  const modelsCount = deviceType.brands.reduce((acc, b) => acc + b.models.length, 0);

                  return (
                    <button
                      key={deviceType.id}
                      id={`btn-device-type-${deviceType.id}`}
                      onClick={() => {
                        feedback.playClick();
                        setSelectedTypeId(deviceType.id);
                        setSelectedBrandId(null);
                        setSelectedModelId(null);
                      }}
                      className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between min-h-[108px] ${
                        isLight
                          ? 'bg-white hover:bg-sky-50/50 border-sky-200/90 hover:border-blue-500 shadow-sm hover:shadow-md'
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-blue-500 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            isLight
                              ? 'bg-sky-100 text-sky-700 group-hover:bg-blue-600 group-hover:text-white'
                              : 'bg-blue-900/30 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'
                          }`}
                        >
                          {getDeviceIcon(deviceType.id, 'w-5 h-5')}
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {brandsCount} {brandsCount === 1 ? 'marca' : 'marcas'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {deviceType.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {modelsCount} {modelsCount === 1 ? 'modelo' : 'modelos'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: BRANDS SELECTION (When a Device Type is selected, but not a Brand) */}
          {currentType && !selectedBrandId && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black inline-flex items-center justify-center shrink-0 shadow-xs">
                      2
                    </span>
                    <span>{language === 'pt' ? 'Escolha a Marca' : 'Choose Brand'}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentType.name} • {currentType.description}
                  </p>
                </div>

                <button
                  onClick={() => {
                    feedback.playClick();
                    setSelectedTypeId(null);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 shrink-0"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>{language === 'pt' ? 'Trocar tipo' : 'Change type'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentType.brands.map((brand) => {
                  return (
                    <div
                      key={brand.id}
                      id={`brand-card-${brand.id}`}
                      onClick={() => {
                        feedback.playClick();
                        setSelectedBrandId(brand.id);
                        setSelectedModelId(null);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between ${
                        isLight
                          ? 'bg-white hover:bg-sky-50/50 border-sky-200/90 hover:border-blue-500 shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-blue-500 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm uppercase ${
                            isLight
                              ? 'bg-gradient-to-br from-sky-100 to-blue-100 text-blue-700'
                              : 'bg-gradient-to-br from-blue-900/40 to-slate-800 text-blue-300'
                          }`}
                        >
                          {brand.name.slice(0, 2)}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                              {brand.name}
                            </h3>
                            {brand.isPopular && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Popular
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {brand.country && `${brand.country} • `}
                            {brand.models.length} {brand.models.length === 1 ? 'modelo' : 'modelos'}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: MODELS SELECTION (When a Brand is selected, but not a specific Model) */}
          {currentType && currentBrand && !selectedModelId && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                <div>
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black inline-flex items-center justify-center shrink-0 shadow-xs">
                      3
                    </span>
                    <span>{language === 'pt' ? 'Escolha o Modelo' : 'Choose Model'}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentType.name} &gt; {currentBrand.name}
                  </p>
                </div>

                <button
                  onClick={() => {
                    feedback.playClick();
                    setSelectedBrandId(null);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 shrink-0"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>{language === 'pt' ? 'Trocar marca' : 'Change brand'}</span>
                </button>
              </div>

              <div className="space-y-3">
                {currentBrand.models.map((model) => (
                  <div
                    key={model.id}
                    id={`model-card-${model.id}`}
                    className={`p-4 rounded-2xl border transition-all ${
                      isLight
                        ? 'bg-white border-sky-200/90 hover:border-blue-500 shadow-sm'
                        : 'bg-slate-900 border-slate-800 hover:border-blue-500 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Protocolo {model.protocol}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {model.commands.length} comandos IR
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                          {model.name}
                        </h3>
                        {model.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-lg">
                            {model.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => {
                            feedback.playClick();
                            setSelectedModelId(model.id);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                            isLight
                              ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          }`}
                        >
                          {language === 'pt' ? 'Ver Comandos' : 'View Commands'}
                        </button>

                        <button
                          onClick={() => handleAddRemoteToHome(currentType, currentBrand, model)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition active:scale-95"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>{language === 'pt' ? 'Adicionar na Home' : 'Add to Home'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: MODEL DETAIL & COMMANDS VIEW (When a Model is selected) */}
          {currentType && currentBrand && currentModel && (
            <div id="model-detail-view" className="space-y-4">
              {/* Model Header Specification Card */}
              <div
                className={`p-5 rounded-3xl border shadow-md relative overflow-hidden ${
                  isLight
                    ? 'bg-gradient-to-br from-white via-sky-50/40 to-blue-50/60 border-sky-200'
                    : 'bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                        {currentType.name}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {currentBrand.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-semibold">
                        {currentModel.protocol} 38kHz
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                      {currentModel.name}
                    </h2>
                    {currentModel.description && (
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {currentModel.description}
                      </p>
                    )}
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <button
                      id="btn-add-model-to-home"
                      onClick={() => handleAddRemoteToHome(currentType, currentBrand, currentModel)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-95"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{language === 'pt' ? 'Adicionar ao Controle na Home' : 'Add Remote to Home'}</span>
                    </button>

                    <button
                      id="btn-import-model-commands"
                      onClick={() => handleImportCommands(currentType, currentBrand, currentModel)}
                      className={`px-3 py-2.5 rounded-2xl font-semibold text-xs border transition ${
                        isLight
                          ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                      title={language === 'pt' ? 'Importar comandos para a lista IR' : 'Import commands'}
                    >
                      {language === 'pt' ? 'Importar Comandos' : 'Import Commands'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Commands List Header */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {language === 'pt' ? 'Comandos Disponíveis' : 'Available Commands'} (
                    {currentModel.commands.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'pt'
                      ? 'Clique em "Testar" para emitir o sinal IR diretamente pelo ESP32'
                      : 'Click "Test" to transmit IR code directly via ESP32'}
                  </p>
                </div>

                <span className="text-xs text-slate-400 font-mono">
                  {currentModel.protocol}
                </span>
              </div>

              {/* Interactive Commands Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentModel.commands.map((cmd) => {
                  const isTesting = testingCommandKey === cmd.buttonKey;
                  const isCopied = copiedKey === cmd.buttonKey;

                  return (
                    <div
                      key={cmd.buttonKey}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isLight
                          ? 'bg-white border-sky-100 hover:border-sky-300 shadow-sm'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {cmd.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {cmd.buttonKey}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {cmd.hexCode}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({cmd.bits}b)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Copy HEX Button */}
                        <button
                          onClick={() => handleCopyHex(cmd.hexCode, cmd.buttonKey)}
                          className={`p-2 rounded-xl transition ${
                            isCopied
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : isLight
                              ? 'hover:bg-slate-100 text-slate-500'
                              : 'hover:bg-slate-800 text-slate-400'
                          }`}
                          title="Copiar código HEX"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* Test IR Transmission Button */}
                        <button
                          onClick={() => handleTestCommand(cmd, currentModel.name)}
                          disabled={isTesting}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                            isTesting
                              ? 'bg-emerald-600 text-white animate-pulse'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          }`}
                        >
                          <Send className="w-3 h-3" />
                          <span>{isTesting ? 'Disparado!' : 'Testar'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
