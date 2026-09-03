import React, { useState } from 'react';
import {
  X,
  Settings2,
  Tv,
  AirVent,
  Music,
  Lightbulb,
  Film,
  Maximize2,
  Sliders,
  Trash2,
  Edit2,
  Check,
  Shield,
  Sparkles,
  Search,
  Plus,
} from 'lucide-react';
import { RemoteDevice, RemoteLayoutType } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { feedback } from '../services/soundService';

interface ManageRemotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  remotes: RemoteDevice[];
  activeRemoteId: string;
  onSelectRemote: (id: string) => void;
  onUpdateRemote: (updated: RemoteDevice) => void;
  onDeleteRemote: (id: string) => void;
  onOpenAddModal: () => void;
}

export const ManageRemotesModal: React.FC<ManageRemotesModalProps> = ({
  isOpen,
  onClose,
  remotes,
  activeRemoteId,
  onSelectRemote,
  onUpdateRemote,
  onDeleteRemote,
  onOpenAddModal,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'custom' | 'default'>('all');

  // Edit state
  const [editingRemote, setEditingRemote] = useState<RemoteDevice | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editLayout, setEditLayout] = useState<RemoteLayoutType>('tv');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const getLayoutIcon = (type: RemoteLayoutType) => {
    switch (type) {
      case 'tv':
        return Tv;
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
      default:
        return Sliders;
    }
  };

  const getLayoutLabel = (type: RemoteLayoutType) => {
    switch (type) {
      case 'tv':
        return language === 'pt' ? 'Televisão' : language === 'es' ? 'Televisión' : 'Television';
      case 'ac':
        return language === 'pt' ? 'Ar Condicionado' : language === 'es' ? 'Aire Acondicionado' : 'Air Conditioner';
      case 'sound':
        return language === 'pt' ? 'Aparelho de Som' : language === 'es' ? 'Equipo de Sonido' : 'Sound System';
      case 'lights':
        return language === 'pt' ? 'Luminárias' : language === 'es' ? 'Luminarias' : 'Lighting';
      case 'smartbox':
        return 'Smart Box';
      case 'projector':
        return language === 'pt' ? 'Projetor' : language === 'es' ? 'Proyector' : 'Projector';
      case 'custom':
      default:
        return language === 'pt' ? 'Teclas Custom' : language === 'es' ? 'Personalizado' : 'Custom Keys';
    }
  };

  const filteredRemotes = remotes.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getLayoutLabel(r.layoutType).toLowerCase().includes(searchQuery.toLowerCase());

    if (filterTab === 'custom') return matchesSearch && !r.isDefault;
    if (filterTab === 'default') return matchesSearch && r.isDefault;
    return matchesSearch;
  });

  const handleStartEdit = (remote: RemoteDevice) => {
    if (remote.isDefault) return;
    feedback.playClick();
    setEditingRemote(remote);
    setEditName(remote.name);
    setEditLayout(remote.layoutType);
    setDeleteConfirmId(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRemote || editingRemote.isDefault) return;
    if (!editName.trim()) return;

    const updated: RemoteDevice = {
      ...editingRemote,
      name: editName.trim(),
      layoutType: editLayout,
    };

    onUpdateRemote(updated);
    feedback.playCaptureSuccess();
    setEditingRemote(null);
  };

  const handleConfirmDelete = (id: string) => {
    feedback.playClick();
    onDeleteRemote(id);
    setDeleteConfirmId(null);
  };

  const customCount = remotes.filter((r) => !r.isDefault).length;
  const defaultCount = remotes.filter((r) => r.isDefault).length;

  return (
    <div
      id="manage-remotes-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="manage-remotes-modal-content"
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isLight ? 'bg-white border-sky-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isLight
              ? 'bg-gradient-to-r from-sky-50 to-blue-50/50 border-sky-100'
              : 'bg-gradient-to-r from-slate-900 to-slate-950 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                {strings.remote.manageRemotes}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'pt' ? 'Organize, renomeie ou remova seus tipos de controles' : language === 'es' ? 'Organice, renombre o elimine sus tipos de controles' : 'Organize, rename or remove your remotes'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-manage-remotes"
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls Bar (Search + Filter Tabs + Add button) */}
        <div
          className={`p-3 sm:px-5 sm:py-3.5 border-b space-y-2.5 ${
            isLight ? 'bg-sky-50/30 border-sky-100' : 'bg-slate-950/40 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-search-remotes"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'pt' ? 'Buscar controle ou layout...' : language === 'es' ? 'Buscar control o diseño...' : 'Search remote or layout...'}
                className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                  isLight
                    ? 'bg-white border-sky-200 text-slate-800 placeholder:text-slate-400'
                    : 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
                }`}
              />
            </div>

            {/* Quick Add Button */}
            <button
              id="btn-quick-add-from-manage"
              onClick={() => {
                onClose();
                onOpenAddModal();
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm flex items-center gap-1 flex-shrink-0 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{strings.common.add}</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              id="filter-remotes-all"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterTab === 'all'
                  ? isLight
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-600 text-white shadow-sm'
                  : isLight
                  ? 'bg-white text-slate-600 hover:bg-sky-50 border border-sky-200'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {strings.common.all} ({remotes.length})
            </button>

            <button
              id="filter-remotes-custom"
              onClick={() => setFilterTab('custom')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                filterTab === 'custom'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isLight
                  ? 'bg-white text-slate-600 hover:bg-sky-50 border border-sky-200'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{language === 'pt' ? 'Personalizados' : language === 'es' ? 'Personalizados' : 'Custom'} ({customCount})</span>
            </button>

            <button
              id="filter-remotes-default"
              onClick={() => setFilterTab('default')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                filterTab === 'default'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isLight
                  ? 'bg-white text-slate-600 hover:bg-sky-50 border border-sky-200'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>{language === 'pt' ? 'Padrão' : language === 'es' ? 'Predeterminados' : 'Default'} ({defaultCount})</span>
            </button>
          </div>
        </div>

        {/* Modal List Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {/* Informational banner about rules */}
          <div
            className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
              isLight
                ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>{language === 'pt' ? 'Regras de Gestão:' : language === 'es' ? 'Reglas de Gestión:' : 'Management Rules:'}</strong>{' '}
              {language === 'pt'
                ? 'Os controles identificados como Padrão vêm pré-configurados e não podem ser excluídos. Controles Personalizados podem ser renomeados ou excluídos a qualquer instante.'
                : language === 'es'
                ? 'Los controles identificados como Predeterminados vienen preconfigurados. Los controles Personalizados se pueden renombrar o eliminar en cualquier momento.'
                : 'Default controls are preconfigured and protected. Custom controls can be renamed or deleted at any time.'}
            </div>
          </div>

          {/* EDIT FORM DRAWER (IF EDITING) */}
          {editingRemote && (
            <form
              onSubmit={handleSaveEdit}
              className={`p-4 rounded-2xl border-2 border-indigo-500 space-y-3.5 animate-in fade-in zoom-in-95 ${
                isLight ? 'bg-indigo-50/50' : 'bg-slate-950'
              }`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-indigo-200 dark:border-indigo-900">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {language === 'pt' ? 'Editando:' : language === 'es' ? 'Editando:' : 'Editing:'} {editingRemote.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRemote(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  {strings.common.cancel}
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'pt' ? 'Novo Nome do Controle' : language === 'es' ? 'Nuevo Nombre del Control' : 'New Remote Name'}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight
                      ? 'bg-white border-indigo-200 text-slate-900'
                      : 'bg-slate-900 border-slate-700 text-white'
                  }`}
                  placeholder={language === 'pt' ? 'Nome do controle...' : language === 'es' ? 'Nombre del control...' : 'Remote name...'}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  {language === 'pt' ? 'Alterar Layout Base' : language === 'es' ? 'Cambiar Diseño Base' : 'Change Base Layout'}
                </label>
                <select
                  value={editLayout}
                  onChange={(e) => setEditLayout(e.target.value as RemoteLayoutType)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight
                      ? 'bg-white border-indigo-200 text-slate-900'
                      : 'bg-slate-900 border-slate-700 text-white'
                  }`}
                >
                  <option value="tv">{language === 'pt' ? 'Televisão (TV / Smart TV)' : language === 'es' ? 'Televisión (TV / Smart TV)' : 'Television (TV / Smart TV)'}</option>
                  <option value="ac">{language === 'pt' ? 'Ar Condicionado (Climatização)' : language === 'es' ? 'Aire Acondicionado (Clima)' : 'Air Conditioner (Climate)'}</option>
                  <option value="sound">{language === 'pt' ? 'Aparelho de Som (Audio / Receiver)' : language === 'es' ? 'Equipo de Sonido (Audio / Receiver)' : 'Sound System (Audio / Receiver)'}</option>
                  <option value="lights">{language === 'pt' ? 'Luminárias (RGB & LED)' : language === 'es' ? 'Luminarias (RGB & LED)' : 'Lights (RGB & LED)'}</option>
                  <option value="smartbox">Smart Box (Streaming / Android TV)</option>
                  <option value="projector">{language === 'pt' ? 'Projetor (Cinema & Óptica)' : language === 'es' ? 'Proyector (Cine & Óptica)' : 'Projector (Cinema & Optics)'}</option>
                  <option value="custom">{language === 'pt' ? 'Teclas Custom (Atalhos Livres)' : language === 'es' ? 'Teclas Personalizadas' : 'Custom Keys'}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingRemote(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {strings.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{strings.common.save}</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Remotes */}
          {filteredRemotes.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {language === 'pt' ? 'Nenhum controle encontrado para o filtro selecionado.' : language === 'es' ? 'No se encontraron controles para el filtro seleccionado.' : 'No remotes found for the selected filter.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRemotes.map((remote) => {
                const Icon = getLayoutIcon(remote.layoutType);
                const isSelected = activeRemoteId === remote.id;
                const isDeleting = deleteConfirmId === remote.id;

                return (
                  <div
                    key={remote.id}
                    id={`manage-item-${remote.id}`}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? isLight
                          ? 'border-indigo-400 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-300'
                          : 'border-indigo-500/80 bg-indigo-950/20 shadow-md ring-1 ring-indigo-500/40'
                        : isLight
                        ? 'border-slate-200/90 bg-white hover:border-sky-300'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                    }`}
                  >
                    {/* Left: Icon, Name, Layout info, and Classification Tag */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                          remote.isDefault
                            ? isLight
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                            : isLight
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-indigo-950/40 text-indigo-300 border-indigo-800'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {remote.name}
                          </span>

                          {/* CLASSIFICATION BADGE */}
                          {remote.isDefault ? (
                            <span
                              id={`badge-default-${remote.id}`}
                              className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1"
                              title="Default"
                            >
                              <Shield className="w-3 h-3 text-emerald-500" />
                              {language === 'pt' ? 'PADRÃO' : language === 'es' ? 'PREDETERMINADO' : 'DEFAULT'}
                            </span>
                          ) : (
                            <span
                              id={`badge-custom-${remote.id}`}
                              className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1"
                              title="Custom"
                            >
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              {language === 'pt' ? 'PERSONALIZADO' : language === 'es' ? 'PERSONALIZADO' : 'CUSTOM'}
                            </span>
                          )}

                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                              {language === 'pt' ? 'ATIVO NA TELA' : language === 'es' ? 'ACTIVO EN PANTALLA' : 'ACTIVE ON SCREEN'}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>Layout: <strong>{getLayoutLabel(remote.layoutType)}</strong></span>
                          {remote.createdAt && (
                            <span className="text-[10px] text-slate-400">
                              • {new Date(remote.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 justify-end flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Select / Use button */}
                      <button
                        id={`btn-select-remote-${remote.id}`}
                        onClick={() => {
                          feedback.playClick();
                          onSelectRemote(remote.id);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : isLight
                            ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200'
                            : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isSelected ? (language === 'pt' ? 'Em Uso' : language === 'es' ? 'En Uso' : 'In Use') : (language === 'pt' ? 'Usar' : language === 'es' ? 'Usar' : 'Use')}
                      </button>

                      {/* ACTIONS FOR CUSTOM CONTROLS */}
                      {!remote.isDefault ? (
                        <>
                          {/* Edit / Rename button */}
                          <button
                            id={`btn-edit-remote-${remote.id}`}
                            onClick={() => handleStartEdit(remote)}
                            className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              isLight
                                ? 'bg-slate-100 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800'
                                : 'bg-slate-800 hover:bg-slate-700 text-indigo-300'
                            }`}
                            title={strings.common.edit}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{strings.common.edit}</span>
                          </button>

                          {/* Delete button (with confirm) */}
                          {isDeleting ? (
                            <div className="flex items-center gap-1 animate-in fade-in">
                              <button
                                id={`btn-confirm-delete-${remote.id}`}
                                onClick={() => handleConfirmDelete(remote.id)}
                                className="px-2 py-1.5 rounded-xl text-[11px] font-black bg-red-600 hover:bg-red-700 text-white shadow-sm"
                              >
                                {strings.common.confirmDelete}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-1.5 rounded-xl text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              id={`btn-delete-remote-${remote.id}`}
                              onClick={() => {
                                feedback.playClick();
                                setDeleteConfirmId(remote.id);
                              }}
                              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                                isLight
                                  ? 'bg-slate-100 hover:bg-red-50 text-red-600 hover:text-red-700'
                                  : 'bg-slate-800 hover:bg-red-950/60 text-red-400'
                              }`}
                              title={strings.common.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{strings.common.delete}</span>
                            </button>
                          )}
                        </>
                      ) : (
                        /* PROTECTED BADGE / DISABLED ACTIONS FOR DEFAULT CONTROLS */
                        <div
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center gap-1"
                          title="Protected default remote"
                        >
                          <Shield className="w-3 h-3 text-slate-400" />
                          <span>{language === 'pt' ? 'Fixo' : language === 'es' ? 'Fijo' : 'Fixed'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between ${
            isLight ? 'bg-slate-50/80 border-slate-100' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total: <strong>{remotes.length} {language === 'pt' ? 'controles' : language === 'es' ? 'controles' : 'remotes'}</strong> ({defaultCount} {language === 'pt' ? 'padrão' : language === 'es' ? 'predet.' : 'default'}, {customCount}{' '}
            {language === 'pt' ? 'personalizados' : language === 'es' ? 'personalizados' : 'custom'})
          </span>

          <button
            id="btn-close-manage-modal-footer"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition shadow-sm"
          >
            {strings.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
