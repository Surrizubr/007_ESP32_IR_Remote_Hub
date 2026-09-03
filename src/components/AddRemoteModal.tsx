import React, { useState } from 'react';
import {
  X,
  Plus,
  Tv,
  AirVent,
  Music,
  Lightbulb,
  Film,
  Maximize2,
  Sliders,
  Check,
  Sparkles,
} from 'lucide-react';
import { RemoteDevice, RemoteLayoutType } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { feedback } from '../services/soundService';

interface AddRemoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRemote: (newRemote: RemoteDevice) => void;
}

interface LayoutOption {
  type: RemoteLayoutType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge: string;
}

export const AddRemoteModal: React.FC<AddRemoteModalProps> = ({
  isOpen,
  onClose,
  onAddRemote,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings, language } = useLanguage();

  const [name, setName] = useState<string>('');
  const [selectedLayout, setSelectedLayout] = useState<RemoteLayoutType>('tv');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const layoutOptions: LayoutOption[] = [
    {
      type: 'tv',
      label: language === 'pt' ? 'Televisão' : language === 'es' ? 'Televisión' : 'Television',
      description: language === 'pt' 
        ? 'Teclado numérico, canais, volume, direcional D-Pad e teclas coloridas' 
        : language === 'es' 
        ? 'Teclado numérico, canales, volumen, cruceta D-Pad y teclas de colores' 
        : 'Numeric keypad, channels, volume, D-Pad directional and color keys',
      icon: Tv,
      color: 'from-blue-500/20 to-sky-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      badge: 'TV / Smart TV',
    },
    {
      type: 'ac',
      label: language === 'pt' ? 'Ar Condicionado' : language === 'es' ? 'Aire Acondicionado' : 'Air Conditioner',
      description: language === 'pt'
        ? 'Display LCD digital, ajuste de temperatura (16-30°C), modos, ventilação e timer'
        : language === 'es'
        ? 'Pantalla LCD digital, ajuste de temperatura (16-30°C), modos, ventilación y temporizador'
        : 'Digital LCD display, temperature adjustment (16-30°C), modes, fan speed, and timer',
      icon: AirVent,
      color: 'from-cyan-500/20 to-teal-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
      badge: language === 'pt' ? 'Climatização' : language === 'es' ? 'Climatización' : 'Climate',
    },
    {
      type: 'sound',
      label: language === 'pt' ? 'Aparelho de Som' : language === 'es' ? 'Equipo de Sonido' : 'Sound System',
      description: language === 'pt'
        ? 'Display VFD, equalizadores (Bass/Treble), fontes Bluetooth, Aux, Rádio FM e USB'
        : language === 'es'
        ? 'Pantalla VFD, ecualizadores (Graves/Agudos), fuentes Bluetooth, Aux, Radio FM y USB'
        : 'VFD display, equalizers (Bass/Treble), Bluetooth, Aux, FM Radio and USB sources',
      icon: Music,
      color: 'from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      badge: 'Audio & Receiver',
    },
    {
      type: 'lights',
      label: language === 'pt' ? 'Luminárias & Fitas LED' : language === 'es' ? 'Luminarias & Tiras LED' : 'Lights & LED Strips',
      description: language === 'pt'
        ? 'Paleta de 12 cores estáticas RGB, temperaturas 2700K/6500K, brilho e efeitos'
        : language === 'es'
        ? 'Paleta de 12 colores estáticos RGB, temperaturas 2700K/6500K, brillo y efectos'
        : 'Palette of 12 static RGB colors, 2700K/6500K temperatures, brightness and effects',
      icon: Lightbulb,
      color: 'from-amber-500/20 to-yellow-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      badge: language === 'pt' ? 'Iluminação RGB' : language === 'es' ? 'Iluminación RGB' : 'RGB Lighting',
    },
    {
      type: 'smartbox',
      label: language === 'pt' ? 'Smart Box & Streaming' : language === 'es' ? 'Smart Box & Streaming' : 'Smart Box & Streaming',
      description: language === 'pt'
        ? 'Anel D-Pad, botões Home, Voltar, Menu e atalhos rápidos de streaming'
        : language === 'es'
        ? 'Anillo D-Pad, botones Inicio, Atrás, Menú y accesos directos de streaming'
        : 'D-Pad ring, Home, Back, Menu buttons and fast streaming shortcuts',
      icon: Film,
      color: 'from-indigo-500/20 to-violet-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      badge: 'Android TV / Box',
    },
    {
      type: 'projector',
      label: language === 'pt' ? 'Projetor Cinema' : language === 'es' ? 'Proyector Cine' : 'Cinema Projector',
      description: language === 'pt'
        ? 'Ajustes ópticos de Keystone, foco motorizado, modos de exibição Freeze e Blank'
        : language === 'es'
        ? 'Ajustes ópticos de Keystone, enfoque motorizado, modos Freeze y Blank'
        : 'Optical Keystone adjustments, motorized focus, Freeze and Blank display modes',
      icon: Maximize2,
      color: 'from-sky-500/20 to-blue-500/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800',
      badge: language === 'pt' ? 'Cinema & Óptica' : language === 'es' ? 'Cine & Óptica' : 'Cinema & Optics',
    },
    {
      type: 'custom',
      label: language === 'pt' ? 'Teclas Customizadas' : language === 'es' ? 'Teclas Personalizadas' : 'Custom Keypad',
      description: language === 'pt'
        ? 'Grade aberta e flexível para atalhos múltiplos e macros personalizadas'
        : language === 'es'
        ? 'Cuadrícula abierta y flexible para múltiples accesos directos y macros personalizadas'
        : 'Open and flexible grid for multiple shortcuts and custom macros',
      icon: Sliders,
      color: 'from-slate-500/20 to-zinc-500/20 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800',
      badge: language === 'pt' ? 'Livre / Macro' : language === 'es' ? 'Libre / Macro' : 'Free / Macro',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(language === 'pt' ? 'Por favor, informe um nome para o controle.' : language === 'es' ? 'Por favor, ingrese un nombre para el control.' : 'Please enter a name for the remote.');
      return;
    }

    const newRemote: RemoteDevice = {
      id: `remote_custom_${Date.now()}`,
      name: name.trim(),
      layoutType: selectedLayout,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    feedback.playCaptureSuccess();
    onAddRemote(newRemote);
    setName('');
    setSelectedLayout('tv');
    setErrorMsg(null);
    onClose();
  };

  return (
    <div
      id="add-remote-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="add-remote-modal-content"
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isLight ? 'bg-white border-sky-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isLight
              ? 'bg-gradient-to-r from-sky-50 to-blue-50/50 border-sky-100'
              : 'bg-gradient-to-r from-slate-900 to-slate-950 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                {language === 'pt' ? 'Adicionar Novo Controle' : language === 'es' ? 'Añadir Nuevo Control' : 'Add New Remote'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'pt' ? 'Personalize um novo controle com o layout de sua escolha' : language === 'es' ? 'Personaliza un nuevo control con el diseño que prefieras' : 'Customize a new remote with your chosen layout'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-add-remote-modal"
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Nome do Controle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              {strings.common.name} <span className="text-red-500">*</span>
            </label>
            <input
              id="input-remote-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={language === 'pt' ? 'Ex: TV do Quarto, Som da Sala...' : language === 'es' ? 'Ej: TV de la Habitación, Sonido...' : 'E.g.: Bedroom TV, Living Room Audio...'}
              autoFocus
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isLight
                  ? 'bg-sky-50/50 border-sky-200 text-slate-900 placeholder:text-slate-400'
                  : 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600'
              }`}
            />
            {errorMsg && (
              <p className="text-xs text-red-500 mt-1 font-medium">{errorMsg}</p>
            )}
          </div>

          {/* Seleção do Tipo de Layout */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {language === 'pt' ? 'Tipo de Layout Base' : language === 'es' ? 'Tipo de Diseño Base' : 'Base Layout Type'} <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                {language === 'pt' ? 'Escolha o formato visual' : language === 'es' ? 'Elija el formato visual' : 'Choose visual format'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {layoutOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedLayout === opt.type;
                return (
                  <div
                    key={opt.type}
                    id={`layout-option-${opt.type}`}
                    onClick={() => {
                      feedback.playClick();
                      setSelectedLayout(opt.type);
                    }}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                      isSelected
                        ? isLight
                          ? 'border-blue-500 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                          : 'border-blue-500 bg-blue-950/40 shadow-md ring-2 ring-blue-500/30'
                        : isLight
                        ? 'border-slate-200/90 bg-white hover:border-sky-300 hover:bg-sky-50/30'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border bg-gradient-to-br ${opt.color}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold leading-tight">{opt.label}</div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {opt.badge}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Suggestions / Dica */}
          <div
            className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
              isLight
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>{language === 'pt' ? 'Dica:' : language === 'es' ? 'Consejo:' : 'Tip:'}</strong>{' '}
              {language === 'pt'
                ? 'Este controle será adicionado à sua barra inicial como Personalizado. Você poderá renomeá-lo ou excluí-lo a qualquer momento no gerenciador.'
                : language === 'es'
                ? 'Este control se añadirá a su barra inicial como Personalizado. Puede renombrarlo o eliminarlo en cualquier momento.'
                : 'This remote will be added to your top bar as Custom. You can rename or delete it anytime in the manager.'}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              id="btn-cancel-add-remote"
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {strings.common.cancel}
            </button>

            <button
              id="btn-submit-add-remote"
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 active:scale-95 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{strings.common.create}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
