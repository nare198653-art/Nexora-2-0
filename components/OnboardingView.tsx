
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Target, 
  Sparkles, 
  User, 
  Mail, 
  AtSign, 
  Camera, 
  Zap,
  Briefcase,
  Brain,
  Shield,
  Activity,
  Plus
} from 'lucide-react';
import { UserProfile, SupportedLanguage } from '../types';
import { useLanguage } from '../localization/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface OnboardingViewProps {
  onComplete: (profile: Partial<UserProfile>) => void;
}

const INTEREST_OPTIONS = [
  'Advanced Coding', 'Stoic Philosophy', 'Biohacking', 'SaaS Entrepreneurship', 
  'Neural Architecture', 'Financial Freedom', 'Public Speaking', 
  'Venture Capital', 'AI Ethics', 'Quantum Computing',
  'Web3', 'Growth Marketing', 'Human Longevity'
];

const GOAL_OPTIONS = [
  'Build my first business', 
  'Optimize cognitive performance', 
  'Achieve Financial Independence',
  'Master a new high-leverage skill',
  'Contribute to open-source neural nodes',
  'Build a technical personal brand',
  'Scale current revenue streams',
  'Improve vital bio-metrics'
];

const AVATAR_PRESETS = [
  "https://i.pravatar.cc/300?u=neural_1",
  "https://i.pravatar.cc/300?u=cyber_2",
  "https://i.pravatar.cc/300?u=stoic_3",
  "https://i.pravatar.cc/300?u=zen_4",
  "https://i.pravatar.cc/300?u=dev_5",
  "https://i.pravatar.cc/300?u=hacker_6"
];

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const { t, language, setLanguage } = useLanguage();
  const [step, setStep] = useState(1);
  const [customInterest, setCustomInterest] = useState('');
  const [availableInterests, setAvailableInterests] = useState(INTEREST_OPTIONS);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    bio: '',
    avatar: AVATAR_PRESETS[0],
    interests: [] as string[],
    goals: [] as string[],
    language: language || 'en' as SupportedLanguage
  });

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const toggleSelection = (listName: 'interests' | 'goals', item: string) => {
    setFormData(prev => {
      const list = prev[listName];
      if (list.includes(item)) {
        return { ...prev, [listName]: list.filter(i => i !== item) };
      }
      return { ...prev, [listName]: [...list, item] };
    });
  };

  const addCustomInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInterest.trim()) {
      const interest = customInterest.trim();
      if (!availableInterests.includes(interest)) {
        setAvailableInterests(prev => [interest, ...prev]);
      }
      if (!formData.interests.includes(interest)) {
        toggleSelection('interests', interest);
      }
      setCustomInterest('');
    }
  };

  const isStepValid = () => {
    if (step === 1) return formData.name && formData.username && formData.email;
    if (step === 2) return formData.interests.length >= 3;
    if (step === 3) return formData.goals.length >= 1;
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] -ml-64 -mb-64" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="mb-12 flex justify-between items-center px-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'w-8 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'w-4 bg-slate-800'}`} 
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Neural Syncing: Phase {step}/4</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-white font-outfit uppercase tracking-tighter">About You</h1>
                <p className="text-slate-500 text-sm">Tell us who you are.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 pl-12 text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                        placeholder="Alex Nexora"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
                    <div className="relative">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                      <input 
                        type="text" 
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 pl-12 text-sm text-white focus:border-indigo-500/50 outline-none transition-all font-mono"
                        placeholder="alex_node"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 pl-12 text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                        placeholder="identity@nexora.ai"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2 flex flex-col items-center">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Profile Photo</label>
                    <div className="w-40 h-40 rounded-[40px] border-4 border-indigo-500/10 p-1 relative group">
                      <img src={formData.avatar} className="w-full h-full object-cover rounded-[32px] grayscale hover:grayscale-0 transition-all duration-700" alt="Avatar" />
                      <div className="absolute inset-0 bg-slate-950/40 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    {AVATAR_PRESETS.map((url, i) => (
                      <button 
                        key={i} 
                        onClick={() => setFormData({...formData, avatar: url})}
                        className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${formData.avatar === url ? 'border-indigo-500 shadow-lg shadow-indigo-500/50' : 'border-transparent opacity-50 hover:opacity-100'}`}
                      >
                        <img src={url} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-white font-outfit uppercase tracking-tighter">Interests</h1>
                <p className="text-slate-500 text-sm">Pick at least 3 things you like.</p>
              </div>

              <div className="space-y-4">
                <form onSubmit={addCustomInterest} className="relative group">
                  <div className="absolute inset-0 bg-indigo-600/5 blur-xl group-focus-within:bg-indigo-600/10 transition-all opacity-0 group-focus-within:opacity-100" />
                  <div className="relative flex gap-3">
                    <div className="relative flex-1">
                      <Plus size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input 
                        type="text" 
                        value={customInterest}
                        onChange={(e) => setCustomInterest(e.target.value)}
                        placeholder="Add another interest..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={!customInterest.trim()}
                      className="px-6 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-2xl font-bold uppercase tracking-widest text-[9px] transition-all active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                </form>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableInterests.map(item => (
                    <button 
                      key={item}
                      onClick={() => toggleSelection('interests', item)}
                      className={`p-4 rounded-2xl border text-[9px] font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-3 active:scale-95 ${formData.interests.includes(item) ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                    >
                      {formData.interests.includes(item) ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-700" />}
                      <span className="text-center leading-tight">{item}</span>
                    </button>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-white font-outfit uppercase tracking-tighter">Goals</h1>
                <p className="text-slate-500 text-sm">What do you want to achieve?</p>
              </div>

              <div className="space-y-4">
                {GOAL_OPTIONS.map((item, i) => (
                  <button 
                    key={item}
                    onClick={() => toggleSelection('goals', item)}
                    className={`w-full p-6 p-4 rounded-3xl border text-sm font-bold transition-all flex items-center justify-between group active:scale-[0.98] ${formData.goals.includes(item) ? 'bg-indigo-600/10 border-indigo-500/50 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${formData.goals.includes(item) ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-600 group-hover:bg-slate-700'}`}>
                        {i % 4 === 0 ? <Briefcase size={18} /> : i % 4 === 1 ? <Target size={18} /> : i % 4 === 2 ? <Zap size={18} /> : <Brain size={18} />}
                      </div>
                      <span className="tracking-tight">{item}</span>
                    </div>
                    {formData.goals.includes(item) && (
                      <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="space-y-2 text-center">
                <div className="w-20 h-20 bg-indigo-500 rounded-[32px] mx-auto flex items-center justify-center text-white mb-6 shadow-[0_0_50px_rgba(99,102,241,0.4)] animate-pulse">
                  <Shield size={40} />
                </div>
                <h1 className="text-4xl font-bold text-white font-outfit uppercase tracking-tighter">Sync Complete</h1>
                <p className="text-slate-500 text-sm">Your neural profile is ready for deployment.</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-[40px] p-8 space-y-6">
                <div className="flex items-center gap-6">
                  <img src={formData.avatar} className="w-20 h-20 rounded-[24px] object-cover ring-4 ring-indigo-500/20" />
                  <div>
                    <h3 className="text-xl font-bold text-white">{formData.name}</h3>
                    <p className="text-indigo-400 font-mono text-xs">@{formData.username}</p>
                    <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-widest">{formData.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles size={10} /> Interests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.interests.slice(0, 3).map(i => (
                        <span key={i} className="text-[7px] font-bold text-indigo-300 py-0.5 px-1.5 bg-indigo-500/10 rounded-md whitespace-nowrap">{i}</span>
                      ))}
                      {formData.interests.length > 3 && <span className="text-[7px] font-bold text-slate-500">+{formData.interests.length - 3}</span>}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Activity size={10} /> Active Goals</p>
                    <p className="text-[9px] font-medium text-slate-300 line-clamp-2">{formData.goals[0]}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Preferred Language Selection */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-[28px] p-5">
                  <LanguageSelector 
                    value={formData.language}
                    onChange={(newLang) => {
                      setFormData(prev => ({ ...prev, language: newLang }));
                      setLanguage(newLang);
                    }}
                    variant="dropdown"
                    showTitle={true}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('neural_bio', 'Final Transmission (Bio)')}</label>
                  <textarea 
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="w-full h-24 bg-slate-900 border border-slate-800 rounded-[32px] p-6 text-sm text-white focus:border-indigo-500/50 outline-none transition-all resize-none shadow-inner"
                    placeholder="Tell the nodes who you are..."
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 flex justify-between gap-4">
          {step > 1 && (
            <button 
              onClick={prevStep}
              className="flex items-center gap-3 px-8 py-5 bg-slate-800/30 hover:bg-slate-800 text-slate-400 hover:text-white rounded-[24px] font-bold uppercase tracking-widest text-[10px] transition-all active:scale-95"
            >
              <ChevronLeft size={16} /> {t('back', 'Back')}
            </button>
          )}
          
          <button 
            onClick={() => {
              if (step === 4) {
                if (formData.language) setLanguage(formData.language);
                onComplete(formData);
              } else {
                nextStep();
              }
            }}
            disabled={!isStepValid()}
            className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-[24px] font-bold uppercase tracking-[0.2em] text-[11px] transition-all active:scale-95 shadow-2xl ${
              isStepValid() 
              ? 'bg-white text-slate-950 hover:bg-slate-100 shadow-[0_0_50px_rgba(255,255,255,0.1)]' 
              : 'bg-slate-900 text-slate-700 cursor-not-allowed border border-slate-800'
            }`}
          >
            {step === 4 ? t('deploy_identity', 'Deploy Identity') : t('continue', 'Continue')} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;
