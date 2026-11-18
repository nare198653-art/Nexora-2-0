import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Command, X, Home, Compass, Layers, PenTool, Zap, Brain, User, ExternalLink, Sparkles, Activity } from 'lucide-react';
import { AppTab, AppMode, SocialSubTab } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: AppTab, subTab?: SocialSubTab) => void;
  onSwitchMode: (mode: AppMode) => void;
  onPopoutModule: (tab: AppTab, subTab?: SocialSubTab) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onSwitchMode,
  onPopoutModule,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const actions = [
    { category: 'Navigation', id: 'nav-home', label: 'Go to Home Feed', icon: Home, shortcut: '⌘1', action: () => onSelectTab(AppTab.HOME) },
    { category: 'Navigation', id: 'nav-explore', label: 'Go to Explore & Direct Messages', icon: Compass, shortcut: '⌘2', action: () => onSelectTab(AppTab.EXPLORE, 'messages') },
    { category: 'Navigation', id: 'nav-creator', label: 'Go to Creator Studio', icon: PenTool, shortcut: '⌘4', action: () => onSelectTab(AppTab.CREATOR) },
    { category: 'Navigation', id: 'nav-modes', label: 'Go to Atmosphere & Modes', icon: Zap, shortcut: '⌘5', action: () => onSelectTab(AppTab.MODES) },
    { category: 'Navigation', id: 'nav-brain', label: 'Go to AI Neural Brain', icon: Brain, shortcut: '⌘6', action: () => onSelectTab(AppTab.BRAIN) },
    { category: 'Navigation', id: 'nav-profile', label: 'Go to Identity Profile & Passport', icon: User, shortcut: '⌘7', action: () => onSelectTab(AppTab.PROFILE) },

    { category: 'Atmosphere', id: 'mode-normal', label: 'Switch to Normal Mode', icon: Activity, action: () => onSwitchMode(AppMode.NORMAL) },
    { category: 'Atmosphere', id: 'mode-focus', label: 'Switch to Focus Mode (Deep Work)', icon: Zap, action: () => onSwitchMode(AppMode.FOCUS) },
    { category: 'Atmosphere', id: 'mode-grind', label: 'Switch to Grind Mode (High Productivity)', icon: Activity, action: () => onSwitchMode(AppMode.GRIND) },
    { category: 'Atmosphere', id: 'mode-chill', label: 'Switch to Chill Mode (Ambient)', icon: Sparkles, action: () => onSwitchMode(AppMode.CHILL) },
    { category: 'Atmosphere', id: 'mode-ghost', label: 'Switch to Ghost Mode (E2E Encrypted)', icon: Zap, action: () => onSwitchMode(AppMode.GHOST) },

    { category: 'Floating Windows', id: 'pop-chat', label: 'Pop Out Messages Window', icon: ExternalLink, action: () => onPopoutModule(AppTab.EXPLORE, 'messages') },
    { category: 'Floating Windows', id: 'pop-brain', label: 'Pop Out AI Brain Window', icon: ExternalLink, action: () => onPopoutModule(AppTab.BRAIN) },
  ];

  const filtered = actions.filter(a => 
    a.label.toLowerCase().includes(query.toLowerCase()) || 
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-16 sm:pt-24 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: -20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 text-white flex flex-col max-h-[75vh]"
      >
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-800/80 flex items-center gap-3 shrink-0">
          <Command size={18} className="text-indigo-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search feature... (e.g. Brain, Focus, Pop Out)"
            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-slate-500 font-medium font-outfit"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-2 custom-scrollbar flex-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-medium">
              No matching commands found for "{query}".
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 bg-slate-950/60 hover:bg-indigo-600/10 border border-slate-800/60 hover:border-indigo-500/40 rounded-2xl transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all">
                    <item.icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-indigo-300 font-outfit transition-colors">{item.label}</p>
                    <p className="text-[9px] text-slate-500 font-mono font-medium">{item.category}</p>
                  </div>
                </div>

                {item.shortcut && (
                  <kbd className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-mono rounded-lg font-bold group-hover:border-indigo-500/30 group-hover:text-indigo-300">
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0">
          <span>Nexora Command Palette</span>
          <div className="flex items-center gap-2">
            <span>Press <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-slate-400">Esc</kbd> to exit</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
