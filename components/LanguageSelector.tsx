import React, { useState, useRef, useEffect } from 'react';
import { Check, Globe, ChevronDown, Sparkles, X } from 'lucide-react';
import { SupportedLanguage } from '../types';
import { SUPPORTED_LANGUAGES, getLanguageOption } from '../localization/languages';
import { useLanguage } from '../localization/LanguageContext';

interface LanguageSelectorProps {
  value?: SupportedLanguage;
  onChange?: (code: SupportedLanguage) => void;
  variant?: 'dropdown' | 'grid' | 'modal';
  isOpen?: boolean;
  onClose?: () => void;
  showTitle?: boolean;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  variant = 'dropdown',
  isOpen = false,
  onClose,
  showTitle = true,
  className = ''
}) => {
  const { language: contextLang, setLanguage: setContextLang, t } = useLanguage();
  const activeLangCode = value || contextLang;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (code: SupportedLanguage) => {
    if (onChange) {
      onChange(code);
    } else {
      setContextLang(code);
    }
    setIsDropdownOpen(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const selectedOption = getLanguageOption(activeLangCode);

  // Modal Dialog Variant (used when triggered from Settings)
  if (variant === 'modal') {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[36px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 md:p-8 flex justify-between items-center border-b border-slate-800/60 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                <Globe size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-outfit uppercase tracking-tight flex items-center gap-2">
                  {t('select_language', 'Select Language')}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">
                  {t('select_language_sub', 'Choose your preferred language for Nexora')}
                </p>
              </div>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* List of languages */}
          <div className="p-6 md:p-8 overflow-y-auto space-y-2.5 max-h-[60vh] scrollbar-thin">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === activeLangCode;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer text-left ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-colors ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                        : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white group-hover:border-slate-700'
                    }`}>
                      {lang.code.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold tracking-wide ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                          {lang.nativeName}
                        </span>
                        {lang.name !== lang.nativeName && (
                          <span className="text-xs text-slate-500 font-medium">
                            ({lang.name})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mt-0.5">
                        {lang.script || 'Regional Script'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <div className="w-7 h-7 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/40">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-4 bg-slate-950/40 border-t border-slate-800/60 text-center shrink-0">
            <p className="text-[10px] text-slate-500 font-medium">
              {t('preferred_language_sub', 'Synchronized across all tabs and system notifications')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Grid / Cards Variant (used inside forms or full views)
  if (variant === 'grid') {
    return (
      <div className={`space-y-3 ${className}`}>
        {showTitle && (
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Globe size={12} className="text-indigo-400" /> 
            {t('preferred_language', 'Preferred Language')}
          </label>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === activeLangCode;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between group cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/15 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                    {lang.nativeName}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {lang.name}
                  </p>
                </div>
                {isSelected ? (
                  <div className="w-5 h-5 bg-indigo-500 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-500/30">
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-lg border border-slate-800 group-hover:border-slate-700 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default: Elegant Dropdown Selection Menu (placed directly before the Save button)
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {showTitle && (
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Globe size={12} className="text-indigo-400" />
            {t('preferred_language', 'Preferred Language')}
          </span>
          <span className="text-[9px] font-mono text-indigo-400 lowercase">
            {selectedOption.code} · {selectedOption.nativeName}
          </span>
        </label>
      )}

      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setIsDropdownOpen(prev => !prev)}
        className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 text-sm text-white flex items-center justify-between transition-all font-medium shadow-inner group cursor-pointer focus:border-indigo-500/50 outline-none"
        aria-haspopup="listbox"
        aria-expanded={isDropdownOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
            <Globe size={16} />
          </div>
          <div className="text-left truncate">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm truncate">
                {selectedOption.nativeName}
              </span>
              {selectedOption.name !== selectedOption.nativeName && (
                <span className="text-xs text-slate-400 font-normal">
                  ({selectedOption.name})
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">
              {t('preferred_language_desc', 'Select your interface language')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg">
            {selectedOption.code.toUpperCase()}
          </span>
          <ChevronDown 
            size={16} 
            className={`text-slate-500 group-hover:text-white transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-indigo-400' : ''}`} 
          />
        </div>
      </button>

      {/* Dropdown Menu Popup */}
      {isDropdownOpen && (
        <div 
          className="absolute left-0 right-0 bottom-full mb-2 z-50 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] p-2.5 max-h-72 overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-bottom-2 duration-200"
          role="listbox"
        >
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1 flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={11} className="text-indigo-400" />
              10 Supported Languages
            </span>
            <span className="text-[9px] text-slate-500 font-mono">
              RFC 5646
            </span>
          </div>

          <div className="space-y-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === activeLangCode;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full px-3.5 py-3 rounded-xl transition-all flex items-center justify-between group cursor-pointer text-left ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600/25 to-purple-600/15 border border-indigo-500/40 text-white'
                      : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] ${
                      isSelected 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}>
                      {lang.code.toUpperCase()}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold tracking-wide">
                          {lang.nativeName}
                        </span>
                        {lang.name !== lang.nativeName && (
                          <span className="text-[11px] text-slate-400">
                            ({lang.name})
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono block">
                        {lang.script} script
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 bg-indigo-500 rounded-md flex items-center justify-center text-white shadow-sm shadow-indigo-500/40">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
