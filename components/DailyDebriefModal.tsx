import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Target, Zap, Clock, Brain, ArrowRight, CheckCircle2 } from 'lucide-react';
import { UserProfile, Task, DailyDebriefRecord } from '../types';

interface DailyDebriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  tasks: Task[];
  onPrepareTomorrow: (plan: string) => void;
  onSaveDebrief?: (debrief: Omit<DailyDebriefRecord, 'id' | 'userId'>) => void;
}

export const DailyDebriefModal: React.FC<DailyDebriefModalProps> = ({ 
  isOpen, 
  onClose, 
  userProfile, 
  tasks,
  onPrepareTomorrow,
  onSaveDebrief
}) => {
  const [step, setStep] = useState<'review' | 'tomorrow'>('review');
  const [tomorrowPlan, setTomorrowPlan] = useState('');

  const completedTasks = tasks.filter(t => t.completed).length;
  const focusScore = Math.min(100, userProfile.sessionsCompleted * 15 + completedTasks * 10);
  const deepWorkTime = userProfile.sessionsCompleted * 25; // mins approx
  const xpEarned = completedTasks * 50 + userProfile.sessionsCompleted * 20;

  const handleComplete = () => {
    if (onSaveDebrief) {
      onSaveDebrief({
        dateKey: new Date().toISOString().split('T')[0],
        completedTasksCount: completedTasks,
        totalTasksCount: tasks.length,
        focusScore,
        deepWorkMinutes: deepWorkTime,
        xpEarned,
        biggestWin: 'Maintained strong focus momentum during the morning session.',
        needsAttention: 'Context switching increased in the afternoon.',
        oneLesson: 'Aligning goals with Ghost Mode yields 2x deep work output.',
        tomorrowMission: tomorrowPlan.trim() || undefined
      });
    }
    if (tomorrowPlan.trim()) {
      onPrepareTomorrow(tomorrowPlan);
    }
    onClose();
    setTimeout(() => setStep('review'), 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            {/* Background Accents */}
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
            >
              <X size={16} />
            </button>

            {step === 'review' ? (
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
                  <Brain size={24} />
                </div>
                
                <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Daily AI Debrief</h2>
                <p className="text-sm text-slate-400 mb-8">Let's review what you accomplished today.</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                    <Target className="text-emerald-400 mb-2" size={18} />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Goals Completed</p>
                    <p className="text-2xl font-bold text-white">{completedTasks}<span className="text-sm text-slate-500">/{tasks.length}</span></p>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                    <Zap className="text-orange-400 mb-2" size={18} />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Focus Score</p>
                    <p className="text-2xl font-bold text-white">{focusScore}</p>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                    <Clock className="text-sky-400 mb-2" size={18} />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Deep Work</p>
                    <p className="text-2xl font-bold text-white">{deepWorkTime}<span className="text-sm text-slate-500">m</span></p>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                    <Trophy className="text-yellow-400 mb-2" size={18} />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">XP Earned</p>
                    <p className="text-2xl font-bold text-white">+{xpEarned}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Biggest Win</p>
                    <p className="text-sm text-slate-300">Maintained strong focus momentum during the morning session.</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Needs Attention</p>
                    <p className="text-sm text-slate-300">Context switching increased in the afternoon.</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">One Lesson</p>
                    <p className="text-sm text-slate-300">Aligning goals with Ghost Mode yields 2x deep work output.</p>
                  </div>
                </div>

                <button 
                  onClick={() => setStep('tomorrow')}
                  className="w-full py-4 bg-white text-slate-950 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  Prepare Tomorrow <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                  <Target size={24} />
                </div>
                
                <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Tomorrow's Mission</h2>
                <p className="text-sm text-slate-400 mb-6">What is the single most important thing to accomplish?</p>

                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 mb-6">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">AI Recommendation</p>
                  <p className="text-sm text-slate-300 mb-4">Complete the outstanding tasks from today while your context is still fresh.</p>
                  
                  <input 
                    type="text"
                    value={tomorrowPlan}
                    onChange={(e) => setTomorrowPlan(e.target.value)}
                    placeholder="E.g., Finish the design proposal"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <p className="text-center text-sm text-slate-400 italic mb-8">
                  "Progress is not about speed, but direction."
                </p>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep('review')}
                    className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleComplete}
                    className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    Confirm <CheckCircle2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
