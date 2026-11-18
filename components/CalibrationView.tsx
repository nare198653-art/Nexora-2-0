
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Zap, Target, Brain, Shield, Activity, Database, Radio, Signal } from 'lucide-react';
import { UserProfile } from '../types';

interface CalibrationViewProps {
  profileData: Partial<UserProfile>;
  onFinished: () => void;
}

const CalibrationView: React.FC<CalibrationViewProps> = ({ profileData, onFinished }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const steps = [
    { label: 'Initialize Identity', icon: Shield, color: 'text-indigo-400', progress: 100, log: 'Identity hash: ' + btoa(profileData.name || 'user').slice(0, 12) },
    { label: 'Interest Nodes', icon: Zap, iconType: 'nodes', progress: 100, log: `Mapping ${profileData.interests?.length} interest vectors...` },
    { label: 'Prime Goals', icon: Target, progress: 100, log: `Setting ${profileData.goals?.length} strategic objectives.` },
    { label: 'Sync Complete', icon: Radio, progress: 100, log: 'Neural link established. Latency: 14ms.' }
  ];

  useEffect(() => {
    if (currentStep < steps.length) {
      const logTimer = setTimeout(() => {
        setLogs(prev => [...prev, steps[currentStep].log]);
      }, 400);

      const stepTimer = setTimeout(() => {
        if (currentStep === steps.length - 1) {
          setTimeout(onFinished, 1500);
        } else {
          setCurrentStep(s => s + 1);
        }
      }, 1800);

      return () => {
        clearTimeout(logTimer);
        clearTimeout(stepTimer);
      };
    }
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden font-mono">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
      
      <div className="w-full max-w-sm relative z-10 space-y-12">
        <div className="flex flex-col items-center gap-4 mb-20">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
            <div className="relative w-20 h-20 bg-slate-900 border border-indigo-500/30 rounded-[28px] flex items-center justify-center text-indigo-400 shadow-2xl">
              <Cpu size={40} className="animate-spin-slow" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-slate-950 animate-pulse" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Nexora OS</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1">Calibrating Neural Sync</p>
          </div>
        </div>

        <div className="space-y-6">
          {steps.map((step, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            const Icon = step.icon;

            return (
              <div key={idx} className={`flex items-start gap-4 transition-all duration-500 ${isActive || isCompleted ? 'opacity-100' : 'opacity-20'}`}>
                <div className={`mt-1 p-2 rounded-xl border transition-all ${isCompleted ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : isActive ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-700'}`}>
                   {isCompleted ? <Signal size={16} /> : <Icon size={16} className={isActive ? 'animate-pulse' : ''} />}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>
                      {step.label}
                    </span>
                    {isCompleted && <span className="text-[10px] text-emerald-400 font-bold">READY</span>}
                  </div>
                  
                  {isActive && (
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <motion.div 
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.5 }}
                        className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      />
                    </div>
                  )}

                  { (isActive || isCompleted) && (
                    <motion.p 
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[9px] text-slate-500 italic max-w-[200px]"
                    >
                      {step.log}
                    </motion.p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-12 border-t border-slate-900">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 space-y-1">
            {logs.slice(-3).map((log, i) => (
              <div key={i} className="flex gap-2 text-[9px] font-mono">
                <span className="text-indigo-400">nexora@root:~#</span>
                <span className="text-slate-500">{log}</span>
              </div>
            ))}
            <div className="flex gap-2 text-[9px] font-mono">
              <span className="text-indigo-400">nexora@root:~#</span>
              <span className="text-white w-2 h-4 bg-white/50 animate-pulse ml-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalibrationView;
