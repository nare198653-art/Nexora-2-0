
import React, { useState } from 'react';
import { AppMode } from '../types';
import { Target, Zap, Coffee, Ghost, Palette, ShieldCheck, MoreHorizontal, X, Info } from 'lucide-react';
import { useTranslation } from '../localization/LanguageContext';

interface ModesViewProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  activeLayout?: 'Classic Cards' | 'Neural Wheel';
  onLayoutChange?: (layout: 'Classic Cards' | 'Neural Wheel') => void;
}

const ModesView: React.FC<ModesViewProps> = ({
  currentMode,
  setMode,
  activeLayout: propActiveLayout,
  onLayoutChange
}) => {
  const { t } = useTranslation();
  const [localLayout, setLocalLayout] = useState<string>(propActiveLayout || 'Classic Cards');
  const activeLayout = propActiveLayout || localLayout;
  const [isLayoutSelectionOpen, setIsLayoutSelectionOpen] = useState(false);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(activeLayout);

  const layouts = [
    {
      id: 'Classic Cards',
      name: 'Classic Cards',
      desc: 'Structured high-density interface highlighting feature vectors and active status indicators.',
      previewType: 'grid'
    },
    {
      id: 'Neural Wheel',
      name: 'Neural Wheel',
      desc: 'Immersive radial controller representing consciousness states as dynamic orbital nodes.',
      previewType: 'radial'
    }
  ];

  const modes = [
    { 
      id: AppMode.NORMAL, 
      icon: ShieldCheck, 
      color: 'bg-slate-600', 
      text: 'text-slate-400',
      desc: 'Standard experience with AI guidance.',
      features: ['Full Feed', 'Standard Notifications', 'Balanced AI'] 
    },
    { 
      id: AppMode.FOCUS, 
      icon: Target, 
      color: 'bg-indigo-600', 
      text: 'text-indigo-400',
      desc: 'Minimalistic UI. Blocks all distractions.',
      features: ['No Feed', 'Priority Alerts Only', 'Task-Centric'] 
    },
    { 
      id: AppMode.GRIND, 
      icon: Zap, 
      color: 'bg-orange-600', 
      text: 'text-orange-400',
      desc: 'High-intensity work/study engine.',
      features: ['Pomodoro Integration', 'Deep Work Soundscapes', 'No Social'] 
    },
    { 
      id: AppMode.CHILL, 
      icon: Coffee, 
      color: 'bg-emerald-600', 
      text: 'text-emerald-400',
      desc: 'Relaxation and recovery mode.',
      features: ['Meditative Feed', 'Muted Notifications', 'Low-Light UI'] 
    },
    { 
      id: AppMode.GHOST, 
      icon: Ghost, 
      color: 'bg-slate-900', 
      text: 'text-slate-300',
      desc: 'Total privacy and invisibility.',
      features: ['Hidden Online Status', 'Encrypted Chats', 'Incognito Creation'] 
    },
    { 
      id: AppMode.VIBE, 
      icon: Palette, 
      color: 'bg-fuchsia-600', 
      text: 'text-fuchsia-400',
      desc: 'Inspiration and creativity engine.',
      features: ['Visual Discovery', 'Idea Canvas', 'Free-Flow AI'] 
    },
  ];

  const handleModeSelect = (mode: AppMode) => {
    setMode(mode);
  };

  const currentModeInfo = modes.find(m => m.id === currentMode) || modes[0];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto relative min-h-[calc(100vh-160px)] select-none">
      
      {/* Header Area with 3-dot Layout Selection Button */}
      <div className="mb-10 text-center relative">
        <h2 className="text-3xl md:text-4xl font-bold font-outfit text-slate-100 tracking-tight mb-3 flex items-center justify-center gap-3">
          {t('modes_title', 'Mental Operating Modes')}
          <button 
            onClick={() => {
              setSelectedLayoutId(activeLayout);
              setIsLayoutSelectionOpen(true);
            }}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90 cursor-pointer"
            title="Configure Workspace Layout"
          >
            <MoreHorizontal size={22} className="stroke-[1.75]" />
          </button>
        </h2>
        <p className="text-slate-400 text-sm font-normal max-w-lg mx-auto leading-relaxed">
          Nexora adapts to your focus requirements. Select a mode to instantly align notifications, recommendations, and AI priority.
        </p>
      </div>

      {/* Render selected active layout architecture */}
      {activeLayout === 'Classic Cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {modes.map((mode) => {
            const modeName = 
              mode.id === AppMode.NORMAL ? t('mode_normal') :
              mode.id === AppMode.FOCUS ? t('mode_focus') :
              mode.id === AppMode.GRIND ? t('mode_grind') :
              mode.id === AppMode.CHILL ? t('mode_chill') :
              mode.id === AppMode.GHOST ? t('mode_ghost') :
              mode.id === AppMode.VIBE ? t('mode_vibe') : `${mode.id} Mode`;

            return (
              <button
                key={mode.id}
                onClick={() => handleModeSelect(mode.id)}
                className={`text-left p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                  currentMode === mode.id 
                    ? 'border-indigo-500/50 bg-slate-900/90 shadow-xl shadow-indigo-950/20 ring-1 ring-indigo-500/30' 
                    : 'border-white/[0.08] bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80 shadow-lg'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl ${mode.color} flex items-center justify-center mb-5 shadow-lg`}>
                  <mode.icon className="text-white stroke-[1.75]" size={22} />
                </div>
                
                <h3 className="text-lg font-bold font-outfit text-slate-100 mb-1.5">{modeName}</h3>
                <p className="text-slate-400 text-xs font-normal mb-4 leading-relaxed">{mode.desc}</p>
                
                <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                  {mode.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
                      {f}
                    </div>
                  ))}
                </div>

                {currentMode === mode.id && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                      {t('active', 'Active')}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Neural Wheel Layout */
        <div className="flex flex-col items-center justify-center py-10 relative animate-in fade-in duration-500">
          <div className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px] flex items-center justify-center">
            {/* Center Hub */}
            <div className="absolute z-20 w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-900 border-4 border-indigo-500/50 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.3)] animate-pulse">
               <currentModeInfo.icon size={32} className="text-white mb-1 animate-in zoom-in duration-300" />
               <span className="text-[8px] font-bold text-white uppercase tracking-widest">
                 {currentMode === AppMode.NORMAL ? t('mode_normal') :
                  currentMode === AppMode.FOCUS ? t('mode_focus') :
                  currentMode === AppMode.GRIND ? t('mode_grind') :
                  currentMode === AppMode.CHILL ? t('mode_chill') :
                  currentMode === AppMode.GHOST ? t('mode_ghost') :
                  currentMode === AppMode.VIBE ? t('mode_vibe') : currentMode}
               </span>
            </div>

            {/* Radial Modes */}
            {modes.map((m, i) => {
              const angle = (i * (360 / modes.length)) * (Math.PI / 180);
              const radius = window.innerWidth < 768 ? 120 : 185;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              const isSelected = currentMode === m.id;

              return (
                <button
                  key={m.id}
                  onClick={() => handleModeSelect(m.id)}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                  className={`absolute w-16 h-16 md:w-20 md:h-20 rounded-[24px] flex flex-col items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 group ${
                    isSelected ? 'bg-indigo-600 text-white shadow-[0_0_30px_rgba(99,102,241,0.5)] scale-110' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:border-indigo-500/50 hover:text-white'
                  }`}
                >
                  <m.icon size={24} />
                  <span className="text-[7px] font-bold uppercase tracking-tighter mt-1">
                    {m.id === AppMode.NORMAL ? t('mode_normal') :
                     m.id === AppMode.FOCUS ? t('mode_focus') :
                     m.id === AppMode.GRIND ? t('mode_grind') :
                     m.id === AppMode.CHILL ? t('mode_chill') :
                     m.id === AppMode.GHOST ? t('mode_ghost') :
                     m.id === AppMode.VIBE ? t('mode_vibe') : m.id}
                  </span>
                </button>
              );
            })}

            {/* Orbit Lines */}
            <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none scale-[0.85]" />
            <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none scale-[1.15]" />
          </div>

          <div className="mt-14 text-center max-w-sm animate-in slide-in-from-bottom-4 duration-500">
             <h3 className="text-2xl font-bold font-outfit text-white uppercase tracking-wider mb-2">{currentModeInfo.id} Mode</h3>
             <p className="text-slate-400 text-xs tracking-wide leading-relaxed">{currentModeInfo.desc}</p>
          </div>
        </div>
      )}
      
      {/* Footer Alert */}
      <div className="mt-12 bg-slate-900/50 border border-slate-800 p-8 rounded-3xl text-center flex flex-col items-center">
        <Info size={24} className="text-indigo-400 mb-4" />
        <p className="text-slate-500 text-sm max-w-xl mx-auto italic leading-relaxed">
          "Each mode reconfigures Nexora's notification engine, AI response priorities, and feed algorithm to protect your most valuable asset: your attention."
        </p>
      </div>

      {/* Advanced Layout Selection Screen Modal */}
      {isLayoutSelectionOpen && (
        <div className="fixed inset-0 z-[160] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[32px] w-full max-w-xl shadow-2xl relative flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden">
            <button 
              onClick={() => setIsLayoutSelectionOpen(false)}
              className="absolute top-6 right-6 p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer z-30"
            >
              <X size={18} />
            </button>

            <div className="mb-6 shrink-0 pr-8">
              <h3 className="text-xl font-bold text-white font-outfit uppercase tracking-wider mb-2">Workspace Layout Matrix</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Select physical rendering architecture for neural sub-systems</p>
            </div>

            {/* Layout Options List/Grid wrapper with independent vertical scrolling */}
            <div className="flex-grow overflow-y-auto pr-1 select-none custom-scrollbar min-h-0 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                {layouts.map((layout) => {
                  const isSelected = selectedLayoutId === layout.id;
                  const isActive = activeLayout === layout.id;

                  return (
                    <div
                      key={layout.id}
                      onClick={() => setSelectedLayoutId(layout.id)}
                      className={`p-5 rounded-2.5xl border-2 transition-all cursor-pointer flex flex-col gap-4 relative justify-between h-[280px] ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-705 hover:bg-slate-950/60'
                      }`}
                    >
                      {/* Visual Preview Template */}
                      <div className="h-28 bg-slate-950/90 rounded-2xl border border-slate-850 flex items-center justify-center overflow-hidden relative shrink-0">
                        {layout.previewType === 'grid' ? (
                          /* Grid Layout Preview */
                          <div className="grid grid-cols-3 gap-1.5 p-3 w-full h-full items-center">
                            {Array.from({ length: 6 }).map((_, idx) => (
                              <div 
                                key={idx} 
                                className={`h-7 rounded bg-slate-900 border border-slate-800 flex flex-col gap-1 items-center justify-center ${idx === 0 ? 'bg-indigo-950/40 border-indigo-500/20' : ''}`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                                <div className="w-5 h-[2px] bg-slate-800 rounded-full" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Radial Wheel Layout Preview */
                          <div className="relative w-24 h-24 flex items-center justify-center">
                            {/* Outer Orbit lines */}
                            <div className="absolute inset-2 rounded-full border border-slate-800" />
                            <div className="absolute inset-5 rounded-full border border-slate-850" />
                            {/* Center hub */}
                            <div className="w-5 h-5 rounded-full bg-slate-900 border border-indigo-500/40 flex items-center justify-center z-10 shadow-lg">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            </div>
                            {/* Mode nodes */}
                            {Array.from({ length: 6 }).map((_, idx) => {
                              const angle = (idx * (360 / 6)) * (Math.PI / 180);
                              const rx = Math.cos(angle) * 32;
                              const ry = Math.sin(angle) * 32;
                              return (
                                <div 
                                  key={idx}
                                  style={{ transform: `translate(${rx}px, ${ry}px)` }}
                                  className={`absolute w-3.5 h-3.5 rounded-full bg-slate-900 border flex items-center justify-center ${idx === 0 ? 'border-indigo-500 bg-indigo-950/50' : 'border-slate-800'}`}
                                >
                                  <div className={`w-1 h-1 rounded-full ${idx === 0 ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Meta info */}
                      <div className="min-h-0 flex-1 flex flex-col justify-start">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white font-sans">{layout.name}</span>
                          {isActive && (
                            <span className="text-[7px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1 font-sans">
                          {layout.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Apply / Current Status Area - Pinned to the bottom of the card */}
            <div className="flex flex-col gap-3 shrink-0 pt-3 border-t border-slate-800">
              {activeLayout === selectedLayoutId ? (
                <div className="w-full py-3.5 bg-slate-950 border border-slate-850 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest rounded-2xl">
                  ✓ CURRENT LAYOUT
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const nextLayout = (selectedLayoutId === 'Neural Wheel' ? 'Neural Wheel' : 'Classic Cards') as 'Classic Cards' | 'Neural Wheel';
                    setLocalLayout(nextLayout);
                    if (onLayoutChange) {
                      onLayoutChange(nextLayout);
                    }
                    setIsLayoutSelectionOpen(false);
                  }}
                  className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-950 text-[10px] font-black uppercase tracking-[0.25em] rounded-2xl transition-all shadow-xl hover:shadow-white/5 active:scale-[0.98] cursor-pointer text-center font-sans"
                >
                  [ APPLY LAYOUT ]
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModesView;
