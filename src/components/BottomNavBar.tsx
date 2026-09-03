import React from 'react';
import { Tv, Radio, Zap, Clock, Boxes, History } from 'lucide-react';
import { ScreenTab } from '../types';
import { feedback } from '../services/soundService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface BottomNavBarProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  badgeCount?: {
    copy?: number;
    automation?: number;
    schedule?: number;
    history?: number;
  };
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
  badgeCount,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { strings } = useLanguage();

  const tabs = [
    { id: 'home' as ScreenTab, label: strings.nav.home, icon: Tv, sub: strings.nav.homeSub },
    { id: 'copy' as ScreenTab, label: strings.nav.copy, icon: Radio, sub: strings.nav.copySub, badge: badgeCount?.copy },
    { id: 'automation' as ScreenTab, label: strings.nav.automation, icon: Zap, sub: strings.nav.autoSub, badge: badgeCount?.automation },
    { id: 'schedule' as ScreenTab, label: strings.nav.schedule, icon: Clock, sub: strings.nav.scheduleSub, badge: badgeCount?.schedule },
    { id: 'devices' as ScreenTab, label: strings.nav.devices, icon: Boxes, sub: strings.nav.devicesSub },
    { id: 'history' as ScreenTab, label: strings.nav.history, icon: History, sub: strings.nav.historySub, badge: badgeCount?.history },
  ];

  const handleTabClick = (tabId: ScreenTab) => {
    feedback.playClick(650, 0.03);
    onSelectTab(tabId);
  };

  return (
    <nav
      id="bottom-nav-bar"
      aria-label="Navegação Principal"
      className={`fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto pb-safe transition-colors duration-200 ${
        isLight
          ? 'bg-white/95 backdrop-blur-lg border-t border-sky-200/90 shadow-lg shadow-sky-100/60'
          : 'bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 shadow-2xl'
      }`}
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-btn-${tab.id}`}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all relative ${
                isActive
                  ? isLight
                    ? 'text-sky-700 font-bold scale-105'
                    : 'text-blue-400 font-bold scale-105'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-800 active:scale-95'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              <div className="relative">
                <div
                  className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? isLight
                        ? 'bg-sky-100 border border-sky-300 text-sky-700 shadow-sm shadow-sky-200'
                        : 'bg-blue-600/25 border border-blue-500/40 text-blue-400 shadow-sm shadow-blue-500/30'
                      : ''
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                </div>

                {tab.badge ? (
                  <span
                    className={`absolute -top-1 -right-1 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center shadow ${
                      isLight ? 'bg-indigo-600' : 'bg-purple-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </div>

              <span
                className={`text-[10px] tracking-tight mt-0.5 whitespace-nowrap ${
                  isActive
                    ? isLight
                      ? 'text-sky-700 font-bold'
                    : 'text-blue-400 font-bold'
                    : isLight
                    ? 'text-slate-500 font-medium'
                    : 'text-slate-400 font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
