import React from 'react';
import { X, Check, Search, Radio } from 'lucide-react';
import { IRCommand } from '../types';
import { feedback } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface ButtonAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  buttonKey: string;
  buttonLabel: string;
  currentCommandIds?: string[];
  currentCommandId?: string; // backwards compatibility
  commands: IRCommand[];
  onAssignCommands: (buttonKey: string, commandIds: string[]) => void;
  onNavigateToCopy: () => void;
}

export const ButtonAssignModal: React.FC<ButtonAssignModalProps> = ({
  isOpen,
  onClose,
  buttonKey,
  buttonLabel,
  currentCommandIds,
  currentCommandId,
  commands,
  onAssignCommands,
  onNavigateToCopy,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings, language } = useLanguage();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Synchronize initial selections when opened
  React.useEffect(() => {
    if (isOpen) {
      if (currentCommandIds && Array.isArray(currentCommandIds)) {
        setSelectedIds(currentCommandIds);
      } else if (currentCommandId) {
        setSelectedIds([currentCommandId]);
      } else {
        setSelectedIds([]);
      }
      setSearchTerm('');
    }
  }, [isOpen, currentCommandIds, currentCommandId]);

  if (!isOpen) return null;

  const filteredCommands = commands.filter((cmd) => {
    const matchesSearch =
      cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.hexCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.protocol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' ||
      cmd.category === selectedCategory ||
      (selectedCategory === 'sound' && cmd.category === 'audio');
    return matchesSearch && matchesCategory;
  });

  const handleToggleCommand = (commandId: string) => {
    feedback.playClick();
    setSelectedIds((prev) => {
      if (prev.includes(commandId)) {
        return prev.filter((id) => id !== commandId);
      } else {
        return [...prev, commandId];
      }
    });
  };

  const handleClearAll = () => {
    feedback.playClick();
    setSelectedIds([]);
  };

  const handleConfirmAssign = () => {
    feedback.playClick();
    onAssignCommands(buttonKey, selectedIds);
    onClose();
  };

  const isUnassigned = selectedIds.length === 0;

  const categories = [
    { id: 'all', label: strings.common.all },
    { id: 'tv', label: 'TV' },
    { id: 'ac', label: strings.copy.quickCategoryAC },
    { id: 'sound', label: strings.copy.quickCategorySound },
    { id: 'lights', label: strings.copy.quickCategoryLights },
    { id: 'smartbox', label: 'Smart Box' },
    { id: 'projector', label: 'Projector' },
    { id: 'custom', label: strings.copy.quickCategoryCustom },
  ];

  return (
    <div id="button-assign-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[88vh] animate-in zoom-in-95 border transition-colors ${
          isLight
            ? 'bg-sky-50 border-sky-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-sky-200' : 'border-slate-800'}`}>
          <div>
            <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {language === 'pt' ? 'Configurar Botão' : language === 'es' ? 'Configurar Botón' : 'Configure Button'}
            </h3>
            <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-sky-700 font-semibold' : 'text-blue-400'}`}>
              {language === 'pt' ? 'Tecla:' : language === 'es' ? 'Tecla:' : 'Key:'} <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{buttonLabel}</span>
            </p>
          </div>
          <button
            id="btn-close-assign-modal"
            onClick={onClose}
            aria-label={strings.common.close}
            className={`p-1.5 rounded-lg transition ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-sky-200/60'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-selection helper hint */}
        <div className={`mt-2.5 px-3 py-1.5 rounded-xl text-[11px] flex items-center justify-between border ${
          isLight
            ? 'bg-blue-50/90 border-blue-200 text-blue-900'
            : 'bg-blue-950/40 border-blue-800/40 text-blue-200'
        }`}>
          <span>{language === 'pt' ? 'Selecione 1 ou mais comandos IR para este botão.' : language === 'es' ? 'Seleccione 1 o más comandos IR para este botón.' : 'Select 1 or more IR commands for this button.'}</span>
          <span className="font-bold font-mono">
            {selectedIds.length === 0 ? strings.common.none : `${selectedIds.length} ${language === 'pt' ? 'selecionado(s)' : language === 'es' ? 'seleccionado(s)' : 'selected'}`}
          </span>
        </div>

        {/* Search & Categories */}
        <div className="py-2.5 space-y-2">
          <div className="relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder={strings.copy.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-3 py-1.5 text-sm focus:outline-none border ${
                isLight
                  ? 'bg-white border-sky-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                  : 'bg-slate-950 border-slate-700/80 text-white placeholder-slate-500 focus:border-blue-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap border ${
                  selectedCategory === cat.id
                    ? isLight
                      ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                      : 'bg-blue-600 border-blue-600 text-white'
                    : isLight
                    ? 'bg-white border-sky-200 text-slate-700 hover:bg-sky-100'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Available IR Commands with Tick-boxes */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px] max-h-[40vh]">
          {/* Option to clear binding (Sem comando atribuído) */}
          <button
            id="btn-clear-binding"
            onClick={handleClearAll}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
              isUnassigned
                ? isLight
                  ? 'bg-sky-100/90 border-sky-400 text-sky-950 font-medium'
                  : 'bg-blue-950/40 border-blue-600/60 text-blue-200'
                : isLight
                ? 'bg-white border-sky-200 text-slate-600 hover:bg-sky-50'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-400'
            }`}
          >
            <div>
              <div className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                {language === 'pt' ? 'Sem comando atribuído' : language === 'es' ? 'Sin comando asignado' : 'No command assigned'}
              </div>
              <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                {language === 'pt' ? 'O botão não disparará nenhum sinal IR' : language === 'es' ? 'El botón no emitirá ninguna señal IR' : 'Button will not send any IR signal'}
              </div>
            </div>
            
            {/* Tick-box for unassigned */}
            <div
              className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                isUnassigned
                  ? isLight
                    ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                    : 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : isLight
                  ? 'border-slate-300 bg-white'
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              {isUnassigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </button>

          {filteredCommands.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              {strings.copy.noSavedCommands}
            </div>
          ) : (
            filteredCommands.map((cmd) => {
              const isSelected = selectedIds.includes(cmd.id);
              const selectionIndex = selectedIds.indexOf(cmd.id);

              return (
                <button
                  key={cmd.id}
                  id={`btn-select-cmd-${cmd.id}`}
                  onClick={() => handleToggleCommand(cmd.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                    isSelected
                      ? isLight
                        ? 'bg-sky-100 border-sky-400 text-slate-900 shadow-sm'
                        : 'bg-blue-950/60 border-blue-500 text-white shadow-md shadow-blue-950/50'
                      : isLight
                      ? 'bg-white border-sky-200 hover:border-sky-300 hover:bg-sky-50/80 text-slate-800'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cmd.color || '#3b82f6' }}
                    />
                    <div className="truncate">
                      <div className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {cmd.name}
                      </div>
                      <div className={`text-[10px] font-mono flex items-center gap-1 mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        <span className={`uppercase font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                          {cmd.protocol}
                        </span>
                        <span>•</span>
                        <span className={isLight ? 'text-slate-700 font-bold' : ''}>{cmd.hexCode}</span>
                        <span>•</span>
                        <span>{cmd.bits}b</span>
                      </div>
                    </div>
                  </div>

                  {/* Tick-Box Checkbox */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {selectedIds.length > 1 && isSelected && (
                      <span className={`text-[10px] font-bold font-mono px-1 py-0.2 rounded ${
                        isLight ? 'bg-sky-200 text-sky-800' : 'bg-blue-900 text-blue-200'
                      }`}>
                        #{selectionIndex + 1}
                      </span>
                    )}
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? isLight
                            ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                            : 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : isLight
                          ? 'border-slate-300 bg-white hover:border-sky-400'
                          : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer with 3 Buttons: [Gravar Novo (Copy)] [Atribuir] [Fechar] */}
        <div className={`pt-3 mt-2 border-t flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 ${isLight ? 'border-sky-200' : 'border-slate-800'}`}>
          {/* Button 1: Gravar Novo Comando */}
          <button
            id="btn-modal-goto-copy"
            onClick={() => {
              onClose();
              onNavigateToCopy();
            }}
            className={`flex items-center gap-1 text-[11px] font-semibold py-2 px-2.5 rounded-xl transition border active:scale-95 ${
              isLight
                ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300'
                : 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border-purple-800/40'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{language === 'pt' ? 'Gravar novo sinal (copy)' : language === 'es' ? 'Grabar nueva señal' : 'Record new signal'}</span>
          </button>

          {/* Button 2: Atribuir (Middle) */}
          <button
            id="btn-modal-assign-confirm"
            onClick={handleConfirmAssign}
            className={`flex items-center justify-center gap-1 text-xs font-bold py-2 px-4 rounded-xl transition shadow-md active:scale-95 flex-1 sm:flex-initial ${
              isLight
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>
              {strings.common.assign}{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </span>
          </button>

          {/* Button 3: Fechar (Right) */}
          <button
            id="btn-modal-close"
            onClick={onClose}
            className={`text-xs py-2 px-3 rounded-xl font-semibold border transition active:scale-95 ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-sky-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {strings.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
