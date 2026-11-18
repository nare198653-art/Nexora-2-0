
import React from 'react';
import { Home, Compass, PenTool, Zap, Brain, User, Lock, EyeOff, Layers, Command, Sparkles, Activity, ShieldCheck, ChevronRight } from 'lucide-react';
import { AppTab, AppMode, UserProfile } from '../types';
import { useTranslation } from '../localization/LanguageContext';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  showToast: (msg: string) => void;
  currentMode: AppMode;
  onToggleGhost?: () => void;
  onToggleFocus?: () => void;
  onOpenCommandSearch?: () => void;
  userProfile?: UserProfile;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  showToast, 
  currentMode, 
  onToggleGhost, 
  onToggleFocus,
  onOpenCommandSearch,
  userProfile
}) => {
  const { t } = useTranslation();
  const isFocusMode = currentMode === AppMode.FOCUS;
  const isGhostMode = currentMode === AppMode.GHOST;

  const menuItems = [
    { id: AppTab.HOME, icon: Home, label: t('nav_home', 'Home'), shortLabel: t('nav_home_short', 'Home'), keyHint: '⌘1' },
    { id: AppTab.EXPLORE, icon: Compass, label: t('nav_explore', 'Explore & Chat'), shortLabel: t('nav_explore_short', 'Explore'), ghostLocked: true, focusRestricted: false, keyHint: '⌘2' },
    { id: AppTab.CREATOR, icon: PenTool, label: t('nav_creator', 'Creator Studio'), shortLabel: t('nav_creator_short', 'Create'), ghostLocked: true, focusRestricted: true, keyHint: '⌘4' },
    { id: AppTab.MODES, icon: Zap, label: t('nav_modes', 'Modes & Vibe'), shortLabel: t('nav_modes_short', 'Modes'), keyHint: '⌘5' },
    { id: AppTab.BRAIN, icon: Brain, label: t('nav_brain', 'AI Brain'), shortLabel: t('nav_brain_short', 'Brain'), ghostLocked: true, focusRestricted: true, keyHint: '⌘6' },
  ];

  return (
    <>
      {/* 📱 MOBILE BOTTOM NAVIGATION BAR (Visible on < md screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-around px-2 py-2 z-50 shadow-2xl pb-safe">
        {menuItems.map((item) => {
          const isDisabled = isFocusMode && item.id !== AppTab.HOME && item.id !== AppTab.MODES && item.id !== AppTab.EXPLORE;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={`mobile-${item.id}`}
              disabled={isDisabled}
              onClick={() => setActiveTab(item.id)}
              onDoubleClick={() => {
                if (item.id === AppTab.BRAIN && onToggleGhost) {
                  onToggleGhost();
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-2xl transition-all duration-300 relative group select-none min-h-[44px] ${
                isActive 
                  ? 'text-indigo-400 font-medium' 
                  : isDisabled 
                    ? 'text-slate-800 opacity-30 cursor-not-allowed filter grayscale' 
                    : 'text-slate-500 hover:text-slate-300 active:scale-95'
              }`}
            >
              {isActive && (
                <div className="absolute -top-2 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
              )}
              
              <div className="relative">
                <item.icon 
                  size={19} 
                  className={`stroke-[1.75] transition-transform duration-300 ${isActive ? 'scale-110 text-indigo-400' : isDisabled ? 'scale-90' : 'group-hover:scale-105'}`} 
                />
                
                {isGhostMode && item.ghostLocked && !isActive && (
                  <div className="absolute -top-1 -right-1 text-slate-400 bg-slate-950 rounded-full p-0.5 border border-white/[0.08]">
                    <Lock size={9} className="stroke-[1.75]" />
                  </div>
                )}

                {isFocusMode && item.focusRestricted && (
                  <div className="absolute -top-1 -right-1 text-rose-400/80 bg-slate-950 rounded-full p-0.5 border border-white/[0.08]">
                    <EyeOff size={9} className="stroke-[1.75]" />
                  </div>
                )}
              </div>

              <span className={`text-[10px] font-medium tracking-tight transition-opacity ${isActive ? 'opacity-100 text-indigo-400 font-bold' : 'opacity-70 text-slate-400'}`}>
                {item.shortLabel || item.label}
              </span>
            </button>
          );
        })}
        
        <button 
          disabled={isFocusMode}
          onClick={() => setActiveTab(AppTab.PROFILE)}
          onDoubleClick={() => {
            if (onToggleFocus) onToggleFocus();
          }}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-2xl transition-all group select-none min-h-[44px] ${
            isFocusMode ? 'text-indigo-400' : 
            activeTab === AppTab.PROFILE ? 'text-indigo-400 font-medium' : 'text-slate-500 hover:text-slate-300 active:scale-95'
          }`}
        >
          <div className="relative">
            <User size={19} className={`stroke-[1.75] ${activeTab === AppTab.PROFILE ? 'scale-110 text-indigo-400' : 'group-hover:scale-105 transition-transform'}`} />
            {(activeTab === AppTab.PROFILE || isFocusMode) && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
            )}
          </div>
          <span className={`text-[10px] font-medium tracking-tight ${activeTab === AppTab.PROFILE ? 'opacity-100 text-indigo-400 font-bold' : 'opacity-70 text-slate-400'}`}>
            {t('nav_profile_short', 'Profile')}
          </span>
        </button>
      </nav>

      {/* 💻 DESKTOP WORKSTATION LEFT SIDEBAR (Visible on >= md screens) */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-64 bg-slate-950/95 border-r border-slate-800/80 z-50 backdrop-blur-2xl p-4 justify-between select-none">
        <div className="space-y-6">
          {/* Header Branding */}
          <div className="flex items-center justify-between px-2 pt-2 pb-1 border-b border-slate-800/60">
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setActiveTab(AppTab.HOME)}
            >
              <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-400 text-white font-extrabold rounded-xl flex items-center justify-center text-sm shadow-lg shadow-indigo-500/20 group-hover:scale-105 group-hover:rotate-6 transition-all">
                N
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-white tracking-[0.2em] font-outfit uppercase flex items-center gap-1.5">
                  Nexora <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-md font-mono">OS</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">{t('nav_life_os', 'Life Operating System')}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${currentMode === AppMode.GHOST ? 'bg-indigo-400' : 'bg-emerald-400'} animate-pulse`} />
            </div>
          </div>

          {/* Quick Command Palette Trigger Button */}
          {onOpenCommandSearch && (
            <button
              onClick={onOpenCommandSearch}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all shadow-sm text-xs group cursor-pointer"
            >
              <span className="flex items-center gap-2.5 font-medium">
                <Command size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>{t('nav_search', 'Search / Command')}</span>
              </span>
              <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-slate-500 text-[9px] font-mono rounded-md font-bold">⌘K</kbd>
            </button>
          )}

          {/* Navigation Items */}
          <div className="space-y-1">
            <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
              {t('nav_workstation_views', 'Workstation Views')}
            </p>

            {menuItems.map((item) => {
              const isDisabled = isFocusMode && item.id !== AppTab.HOME && item.id !== AppTab.MODES && item.id !== AppTab.EXPLORE;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={`desktop-${item.id}`}
                  disabled={isDisabled}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all group relative cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 border border-indigo-500/40 text-white shadow-md shadow-indigo-500/10'
                      : isDisabled
                      ? 'text-slate-700 opacity-40 cursor-not-allowed'
                      : 'text-slate-400 hover:bg-slate-900/80 hover:text-white hover:border-slate-800/80'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
                  )}

                  <div className="flex items-center gap-3">
                    <item.icon 
                      size={18} 
                      className={`transition-transform duration-200 ${isActive ? 'text-indigo-400 scale-110' : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'}`} 
                    />
                    <span className="font-outfit tracking-wide">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isGhostMode && item.ghostLocked && !isActive && (
                      <Lock size={12} className="text-slate-500" />
                    )}
                    {isFocusMode && item.focusRestricted && (
                      <EyeOff size={12} className="text-rose-400/80" />
                    )}
                    <kbd className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md border transition-all ${
                      isActive ? 'bg-indigo-950/80 border-indigo-500/30 text-indigo-300 font-bold' : 'bg-slate-950/60 border-slate-800/80 text-slate-600'
                    }`}>
                      {item.keyHint}
                    </kbd>
                  </div>
                </button>
              );
            })}

            {/* Profile Navigation */}
            <button
              disabled={isFocusMode}
              onClick={() => setActiveTab(AppTab.PROFILE)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all group relative cursor-pointer ${
                activeTab === AppTab.PROFILE
                  ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 border border-indigo-500/40 text-white shadow-md shadow-indigo-500/10'
                  : 'text-slate-400 hover:bg-slate-900/80 hover:text-white hover:border-slate-800/80'
              }`}
            >
              {activeTab === AppTab.PROFILE && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
              )}

              <div className="flex items-center gap-3">
                <User 
                  size={18} 
                  className={`transition-transform duration-200 ${activeTab === AppTab.PROFILE ? 'text-indigo-400 scale-110' : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'}`} 
                />
                <span className="font-outfit tracking-wide">{t('nav_profile', 'Profile & Passport')}</span>
              </div>

              <kbd className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md border transition-all ${
                activeTab === AppTab.PROFILE ? 'bg-indigo-950/80 border-indigo-500/30 text-indigo-300 font-bold' : 'bg-slate-950/60 border-slate-800/80 text-slate-600'
              }`}>
                ⌘7
              </kbd>
            </button>
          </div>
        </div>

        {/* Desktop Sidebar Bottom Widget - Mode Status & User Profile Card */}
        <div className="space-y-3 pt-3 border-t border-slate-800/60">
          {/* Current Atmosphere Status Pill */}
          <div 
            onClick={() => setActiveTab(AppTab.MODES)}
            className="p-3 bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl flex items-center justify-between cursor-pointer group transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full ${currentMode === AppMode.GHOST ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'} animate-pulse`} />
              <div>
                <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Atmosphere</p>
                <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">{currentMode} Mode</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
          </div>

          {/* User Profile Card */}
          <div 
            onClick={() => setActiveTab(AppTab.PROFILE)}
            className="p-2.5 bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 hover:border-slate-700 rounded-2xl flex items-center gap-3 cursor-pointer transition-all group"
          >
            <img 
              src={isGhostMode ? "https://i.pravatar.cc/150?u=ghost" : (userProfile?.avatar || "https://i.pravatar.cc/150?u=alex")} 
              className="w-9 h-9 rounded-xl object-cover border border-slate-800 group-hover:scale-105 transition-transform" 
              alt="User Avatar"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                {userProfile?.name || 'Alex Mercer'}
              </p>
              <p className="text-[10px] text-slate-500 truncate font-mono">
                {userProfile?.userId ? `@${userProfile.userId}` : '@alex_m.synapse'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

