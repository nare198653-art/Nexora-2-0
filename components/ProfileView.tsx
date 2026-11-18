import React, { useState } from 'react';
import { 
  Settings, ArrowLeft, Shield, Award, Flame, Calendar, MapPin, Grid, Heart, Bookmark, Edit2, 
  Share2, X, Bell, User as UserIcon, Lock, ChevronRight, ShoppingBag, 
  Info, ShieldAlert, Check, Plus, Sparkles, Camera, Facebook, Mail, 
  MessageCircle as WhatsApp, Cloud as Drive, Link, TrendingUp, PlusCircle, Trash2, ListChecks, HelpCircle,
  Activity, Globe
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, LineChart, Line, BarChart, Bar
} from 'recharts';
import { Post, UserProfile, SupportedLanguage } from '../types';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../localization/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../localization/languages';
import { firebaseStorageService } from '../services/firebaseStorageService';

interface ProfileViewProps {
  savedPostIds: Set<string>;
  purchasedPostIds: Set<string>;
  allPosts: Post[];
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  showToast: (msg: string, type?: 'info' | 'success') => void;
  followingCount?: number;
}

const FOCUS_OPTIONS = [
  'Advanced Coding', 'Stoic Philosophy', 'Biohacking', 'SaaS Entrepreneurship', 
  'Neural Architecture', 'Financial Freedom', 'Public Speaking', 
  'Venture Capital', 'AI Ethics'
];

const AVATAR_PRESETS = [
  "https://i.pravatar.cc/300?u=alex",
  "https://i.pravatar.cc/300?u=neural_1",
  "https://i.pravatar.cc/300?u=cyber_2",
  "https://i.pravatar.cc/300?u=stoic_3",
  "https://i.pravatar.cc/300?u=zen_4",
  "https://i.pravatar.cc/300?u=dev_5"
];

const BANNER_PRESETS = [
  { name: 'Cosmic Silk', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop' },
  { name: 'Neural Grid', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop' },
  { name: 'Stoic Amber', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop' },
  { name: 'Cyber Matrix', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop' },
  { name: 'Zen Zircon', url: 'https://images.unsplash.com/photo-1615796153287-98eacca0ca0a?q=80&w=800&auto=format&fit=crop' }
];

const ProfileView: React.FC<ProfileViewProps> = ({ 
  savedPostIds, purchasedPostIds, allPosts, userProfile, onUpdateProfile, showToast, followingCount
}) => {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'portfolio' | 'saved' | 'purchased'>('portfolio');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
  const [badgesFilter, setBadgesFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [hoveredTooltip, setHoveredTooltip] = useState<number | null>(null);

  // Excised space variables set to false/dummy defaults
  const isSpaceSwitcherOpen = false;
  const isManagingSpacesOpen = false;
  const isCreatingSpaceOpen = false;
  const activeSpace = { id: 'business', name: 'Business Space', icon: '🚀' };
  const spaces = [activeSpace];
  const activeSpaceId = 'business';
  const activeSpaceNotifications: Array<{id: string, text: string, time: string, read: boolean}> = [];
  const onSwitchSpace = (_id?: string) => {};
  const onCreateSpace = (_name?: string, _icon?: string) => {};
  const onDeleteSpace = (_id?: string) => {};
  const onToggleNotificationRead = () => {};
  const setIsSpaceSwitcherOpen = (open: boolean) => {};
  const setIsManagingSpacesOpen = (open: boolean) => {};
  const setIsCreatingSpaceOpen = (open: boolean) => {};
  const newSpaceIcon = '🚀';
  const newSpaceName = '';
  const setNewSpaceIcon = (icon: string) => {};
  const setNewSpaceName = (name: string) => {};

  // Custom milestones creation form state
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneCategory, setNewMilestoneCategory] = useState('Focus');

  // Temp form state
  const { t, language, setLanguage } = useLanguage();
  const [tempLanguage, setTempLanguage] = useState<SupportedLanguage>(userProfile.language || language || 'en');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [tempName, setTempName] = useState(userProfile.name);
  const [tempUsername, setTempUsername] = useState(userProfile.username);
  const [tempEmail, setTempEmail] = useState(userProfile.email);
  const [tempBio, setTempBio] = useState(userProfile.bio);
  const [tempAvatar, setTempAvatar] = useState(userProfile.avatar || AVATAR_PRESETS[0]);
  const [tempBanner, setTempBanner] = useState(userProfile.profileBanner || BANNER_PRESETS[0].url);
  const [tempFocus, setTempFocus] = useState<string[]>(userProfile.interests);

  const savedPosts = allPosts.filter(p => savedPostIds.has(p.id));
  const purchasedPosts = allPosts.filter(p => purchasedPostIds.has(p.id));

  // Access user's active milestones lists safely
  const milestonesList = userProfile.customMilestones || [];

  const completedMilestonesCount = milestonesList.filter(m => m.completed).length;

  const ACHIEVEMENTS = [
    {
      id: 'early_adopter',
      title: 'Early Adopter',
      description: 'Pioneer the Nexora ecosystem. Onboarding process finalized.',
      icon: Award,
      color: 'text-indigo-400',
      bgType: 'indigo',
      xpReward: 100,
      requirementText: 'Onboarding Completed',
      progressMax: 1,
      progressCurrent: userProfile.onboardingCompleted ? 1 : 0,
      isUnlocked: (userProfile.unlockedAchievements || []).includes('early_adopter') || !!userProfile.onboardingCompleted
    },
    {
      id: 'momentum_rescued',
      title: 'Momentum Rescued',
      description: 'Complete an adaptive recovery mission to protect your hard-earned streak.',
      icon: Activity,
      color: 'text-rose-400',
      bgType: 'rose',
      xpReward: 150,
      requirementText: 'Complete 1 Momentum Rescue Mission',
      progressMax: 1,
      progressCurrent: (userProfile.momentumRescue?.history?.missionsCompleted || 0) >= 1 ? 1 : 0,
      isUnlocked: (userProfile.unlockedAchievements || []).includes('momentum_rescued') || (userProfile.momentumRescue?.history?.missionsCompleted || 0) >= 1
    },
    {
      id: 'early_riser',
      title: 'Early Riser',
      description: 'Begin productivity in the first dew. Clear at least one personal milestone.',
      icon: Sparkles,
      color: 'text-amber-400',
      bgType: 'amber',
      xpReward: 150,
      requirementText: 'Complete 1 personal milestone',
      progressMax: 1,
      progressCurrent: completedMilestonesCount >= 1 ? 1 : 0,
      isUnlocked: (userProfile.unlockedAchievements || []).includes('early_riser') || completedMilestonesCount >= 1
    },
    {
      id: 'deep_focus_master',
      title: 'Deep Focus Master',
      description: 'Demonstrate pristine attention control. Power through multiple focus sessions.',
      icon: Flame,
      color: 'text-orange-400',
      bgType: 'orange',
      xpReward: 250,
      requirementText: 'Complete 5 sessions',
      progressMax: 5,
      progressCurrent: userProfile.sessionsCompleted || 0,
      isUnlocked: (userProfile.unlockedAchievements || []).includes('deep_focus_master') || (userProfile.sessionsCompleted || 0) >= 5
    },
    {
      id: 'stoic_pioneer',
      title: 'Stoic Pioneer',
      description: 'Log and clear custom-crafted objectives with steady execution.',
      icon: Shield,
      color: 'text-emerald-400',
      bgType: 'emerald',
      xpReward: 200,
      requirementText: 'Complete 3 custom milestones',
      progressMax: 3,
      progressCurrent: completedMilestonesCount,
      isUnlocked: (userProfile.unlockedAchievements || []).includes('stoic_pioneer') || completedMilestonesCount >= 3
    },
    {
      id: 'grind_master',
      title: 'Grind Master',
      description: 'Stay in the loop. Build a continuous days productivity streak.',
      icon: TrendingUp,
      color: 'text-indigo-400',
      bgType: 'indigo',
      xpReward: 300,
      requirementText: 'Have a 3-day active streak',
      progressMax: 3,
      progressCurrent: userProfile.streak || 0,
      isUnlocked: (userProfile.unlockedAchievements || []).includes('grind_master') || (userProfile.streak || 0) >= 3
    },
    {
      id: 'catalogue_curator',
      title: 'Catalogue Curator',
      description: 'Acquire verified digital assets to curate in your profile Node.',
      icon: ShoppingBag,
      color: 'text-purple-400',
      bgType: 'purple',
      xpReward: 150,
      requirementText: 'Purchase 1 catalog item',
      progressMax: 1,
      progressCurrent: purchasedPostIds.size,
      isUnlocked: (userProfile.unlockedAchievements || []).includes('catalogue_curator') || purchasedPostIds.size >= 1
    },
    {
      id: 'knowledge_archivist',
      title: 'Knowledge Archivist',
      description: 'Build safe references in your Sync Vault by bookmarking quality feeds.',
      icon: Bookmark,
      color: 'text-pink-400',
      bgType: 'pink',
      xpReward: 100,
      requirementText: 'Save 2 community posts',
      progressMax: 2,
      progressCurrent: savedPostIds.size,
      isUnlocked: (userProfile.unlockedAchievements || []).includes('knowledge_archivist') || savedPostIds.size >= 2
    },
    {
      id: 'level_elite',
      title: 'Level Elite',
      description: 'Gain prestige in the Nexora super-node architecture.',
      icon: ShieldAlert,
      color: 'text-rose-400',
      bgType: 'rose',
      xpReward: 500,
      requirementText: 'Attain Level 3 or higher',
      progressMax: 3,
      progressCurrent: userProfile.level || 1,
      isUnlocked: (userProfile.unlockedAchievements || []).includes('level_elite') || (userProfile.level || 1) >= 3
    }
  ];

  const getBadgeStyles = (bgType: string, isUnlocked: boolean) => {
    if (!isUnlocked) {
      switch (bgType) {
        case 'indigo':
          return { bg: 'bg-indigo-950/15 border-indigo-500/20 opacity-80', text: 'text-indigo-400/60', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.05)]', iconBg: 'bg-indigo-505/5 text-indigo-400/40' };
        case 'amber':
          return { bg: 'bg-amber-950/15 border-amber-500/20 opacity-80', text: 'text-amber-400/60', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.05)]', iconBg: 'bg-amber-505/5 text-amber-550/40' };
        case 'orange':
          return { bg: 'bg-orange-950/15 border-orange-500/20 opacity-80', text: 'text-orange-400/60', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.05)]', iconBg: 'bg-orange-505/5 text-orange-400/40' };
        case 'emerald':
          return { bg: 'bg-emerald-950/15 border-emerald-500/20 opacity-80', text: 'text-emerald-400/60', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.05)]', iconBg: 'bg-emerald-505/5 text-emerald-400/40' };
        case 'purple':
          return { bg: 'bg-purple-950/15 border-purple-500/20 opacity-80', text: 'text-purple-400/60', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.05)]', iconBg: 'bg-purple-550/5 text-purple-400/40' };
        case 'pink':
          return { bg: 'bg-pink-950/15 border-pink-500/20 opacity-80', text: 'text-pink-400/60', glow: 'shadow-[0_0_15px_rgba(236,72,153,0.05)]', iconBg: 'bg-pink-550/5 text-pink-400/40' };
        case 'rose':
          return { bg: 'bg-rose-950/15 border-rose-500/20 opacity-80', text: 'text-rose-450/60', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.05)]', iconBg: 'bg-rose-550/5 text-rose-450/40' };
        default:
          return { bg: 'bg-slate-950/45 border-white/5 opacity-55', text: 'text-slate-500', glow: '', iconBg: 'bg-slate-900/60 text-slate-600' };
      }
    }
    switch (bgType) {
      case 'indigo':
        return { bg: 'bg-indigo-500/15 border-indigo-400/40', text: 'text-indigo-300', glow: 'shadow-[0_0_25px_rgba(99,102,241,0.25)]', iconBg: 'bg-indigo-500/20 text-indigo-300' };
      case 'amber':
        return { bg: 'bg-amber-500/15 border-amber-400/40', text: 'text-amber-300', glow: 'shadow-[0_0_25px_rgba(245,158,11,0.25)]', iconBg: 'bg-amber-500/20 text-amber-300' };
      case 'orange':
        return { bg: 'bg-orange-500/15 border-orange-400/40', text: 'text-orange-300', glow: 'shadow-[0_0_25px_rgba(249,115,22,0.25)]', iconBg: 'bg-orange-500/20 text-orange-300' };
      case 'emerald':
        return { bg: 'bg-emerald-500/15 border-emerald-400/40', text: 'text-emerald-300', glow: 'shadow-[0_0_25px_rgba(16,185,129,0.25)]', iconBg: 'bg-emerald-500/20 text-emerald-300' };
      case 'purple':
        return { bg: 'bg-purple-500/15 border-purple-400/40', text: 'text-purple-300', glow: 'shadow-[0_0_25px_rgba(168,85,247,0.25)]', iconBg: 'bg-purple-500/20 text-purple-300' };
      case 'pink':
        return { bg: 'bg-pink-500/15 border-pink-400/40', text: 'text-pink-300', glow: 'shadow-[0_0_25px_rgba(236,72,153,0.25)]', iconBg: 'bg-pink-500/20 text-pink-300' };
      case 'rose':
        return { bg: 'bg-rose-500/15 border-rose-450/40', text: 'text-rose-350', glow: 'shadow-[0_0_25px_rgba(244,63,94,0.25)]', iconBg: 'bg-rose-500/20 text-rose-350' };
      default:
        return { bg: 'bg-slate-900/50 border-slate-800', text: 'text-slate-400', glow: '', iconBg: 'bg-slate-800 text-slate-400' };
    }
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
    setHoveredTooltip(null);
  };

  const openEditProfile = () => {
    setTempName(userProfile.name);
    setTempUsername(userProfile.username);
    setTempEmail(userProfile.email);
    setTempBio(userProfile.bio);
    setTempAvatar(userProfile.avatar || AVATAR_PRESETS[0]);
    setTempBanner(userProfile.profileBanner || BANNER_PRESETS[0].url);
    setTempFocus(userProfile.interests);
    setTempLanguage(userProfile.language || language || 'en');
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = () => {
    onUpdateProfile({
      ...userProfile,
      name: tempName,
      username: tempUsername,
      email: tempEmail,
      bio: tempBio,
      avatar: tempAvatar,
      profileBanner: tempBanner,
      interests: tempFocus,
      language: tempLanguage,
    });
    setLanguage(tempLanguage);
    setIsEditProfileOpen(false);
    showToast(t('toast_profile_saved', 'Neural Identity Customization Applied'), 'success');
  };

  const toggleFocusArea = (area: string) => {
    setTempFocus(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handleAction = (action: string) => {
    showToast(`${action} Initiated`, 'info');
  };

  // Toggles the custom checked status of dynamic milestones & gives XP rewards!
  const handleToggleMilestone = (id: string) => {
    const updated = milestonesList.map(m => {
      if (m.id === id) {
        const nextCompleted = !m.completed;
        if (nextCompleted) {
          // Grant XP Reward on brand new completions!
          showToast(`🎯 Objective Unlocked! +50 XP Acquired`, 'success');
        }
        return { ...m, completed: nextCompleted };
      }
      return m;
    });

    const completingCount = updated.filter(m => m.completed).length;
    const previousCompleting = milestonesList.filter(m => m.completed).length;

    let xpGains = userProfile.xp;
    if (completingCount > previousCompleting) {
      xpGains += 50;
    } else if (completingCount < previousCompleting && xpGains >= 50) {
      xpGains -= 50;
    }

    // Auto level formula bounds check (aligned with cumulative system)
    const levelGains = Math.floor(Math.sqrt(xpGains / 100)) + 1;
    if (levelGains > userProfile.level) {
      showToast(`⚡ SYSTEM UPGRADE: Congratulations, level ${levelGains} attained!`, 'success');
    }

    onUpdateProfile({
      ...userProfile,
      customMilestones: updated,
      xp: xpGains,
      level: levelGains
    });
  };

  // Adds a completely custom user-scoped milestone
  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    const newM = {
      id: `m_${Date.now()}`,
      title: newMilestoneTitle.trim(),
      completed: false,
      category: newMilestoneCategory
    };

    onUpdateProfile({
      ...userProfile,
      customMilestones: [...milestonesList, newM]
    });

    setNewMilestoneTitle('');
    setIsAddingMilestone(false);
    showToast(`🚀 "${newM.title}" logged to active milestones`, 'success');
  };

  // Discards milestone target
  const handleDeleteMilestone = (id: string) => {
    const updated = milestonesList.filter(m => m.id !== id);
    onUpdateProfile({
      ...userProfile,
      customMilestones: updated
    });
    showToast('Milestone discarded from directory', 'info');
  };



  const SETTINGS_OPTIONS = [
    { 
      icon: UserIcon, 
      label: 'Bio-Profile Index', 
      desc: 'Sync identity across nodes',
      tooltip: 'Synchronize your neural signature, preferences, and progress data across all Nexora nodes and secondary devices.'
    },
    { 
      icon: Bell, 
      label: 'Neuro-Notifications', 
      desc: 'Manage attention stream',
      tooltip: 'Advanced haptic and visual filtering system that only permits high-priority cognitive signals during deep work windows.'
    },
    { 
      icon: Lock, 
      label: 'Encryption Protocol', 
      desc: 'Ghost mode & Private keys',
      tooltip: 'Configure end-to-end post-quantum encryption for your Ghost Mode sessions and private neural archives.'
    },
    { 
      icon: ShieldAlert, 
      label: 'Trust & Safety', 
      desc: 'Neural filters and blocked nodes',
      tooltip: "Adjust the strictness of Nexora's toxicity filters and manage your personal blocklist of disruptive network nodes."
    }
  ];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500 pb-24 relative">
      
      {/* Profile Setup / Edit Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-6 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[40px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
             <div className="p-8 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white font-outfit uppercase tracking-tight">Identity Setup</h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">Define your neural node parameters</p>
                  </div>
                </div>
                <button onClick={() => setIsEditProfileOpen(false)} className="p-2.5 bg-slate-800 hover:bg-slate-755 rounded-2xl text-slate-450 hover:text-white transition-all cursor-pointer">
                  <X size={20} />
                </button>
             </div>

             <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 text-left">
                {/* Banner Selection */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12} className="text-indigo-400" /> Choose Profile Aesthetic Banner
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {BANNER_PRESETS.map((bp) => (
                      <button 
                        key={bp.name} 
                        type="button"
                        onClick={() => setTempBanner(bp.url)}
                        className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${tempBanner === bp.url ? 'border-indigo-505 ring-2 ring-indigo-500/20 scale-95' : 'border-transparent hover:border-slate-700'}`}
                      >
                        <img src={bp.url} className="w-full h-full object-cover" alt={bp.name} />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white uppercase tracking-wider">{bp.name}</span>
                        </div>
                        {tempBanner === bp.url && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-indigo-650 rounded-full flex items-center justify-center text-white scale-90">
                            <Check size={8} strokeWidth={4} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Manual URL entry if desired */}
                  <div className="space-y-2 pt-1">
                    <label className="text-[9px] font-black uppercase text-slate-600 tracking-wider">Custom Header Image Link</label>
                    <input 
                      type="text" 
                      value={tempBanner}
                      onChange={(e) => setTempBanner(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-330 focus:border-indigo-500/50 outline-none transition-all font-mono"
                      placeholder="Paste unsplash or web image URL..."
                    />
                  </div>
                </div>

                {/* Avatar Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Camera size={12} className="text-indigo-400" /> Neural Signature Image
                    </p>
                    <label className="cursor-pointer px-3 py-1 bg-slate-800 hover:bg-slate-705 rounded-lg text-[8px] font-bold text-white uppercase tracking-widest transition-all">
                      {isUploadingAvatar ? 'Uploading...' : 'Upload Custom File'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (userProfile.userId) {
                            setIsUploadingAvatar(true);
                            try {
                              const url = await firebaseStorageService.uploadImageFile(userProfile.userId, 'avatars', file);
                              setTempAvatar(url);
                              showToast('Avatar uploaded to cloud storage', 'success');
                              return;
                            } catch (err) {
                              console.warn('Storage avatar upload failed, falling back to local preview:', err);
                            } finally {
                              setIsUploadingAvatar(false);
                            }
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => setTempAvatar(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }} 
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {AVATAR_PRESETS.map((url, i) => (
                      <button 
                        key={i} 
                        onClick={() => setTempAvatar(url)}
                        className={`relative w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group ${tempAvatar === url ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-transparent hover:border-transparent'}`}
                      >
                        <img src={url} className="w-full h-full object-cover" alt="Preset" />
                        {tempAvatar === url && (
                          <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                            <Check size={20} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name & Username */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Display Name</label>
                    <input 
                      type="text" 
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none transition-all font-medium shadow-inner"
                      placeholder="Enter identity alias..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Node Alias (@username)</label>
                    <input 
                      type="text" 
                      value={tempUsername}
                      onChange={(e) => setTempUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none transition-all font-mono shadow-inner"
                      placeholder="node_alias"
                    />
                  </div>
                </div>

                {/* Email & Bio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Contact Protocol (Email)</label>
                    <input 
                      type="email" 
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none transition-all font-medium shadow-inner"
                      placeholder="identity@nexora.ai"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Neural Bio</label>
                    <textarea 
                      value={tempBio}
                      onChange={(e) => setTempBio(e.target.value)}
                      className="w-full h-24 md:h-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none transition-all font-medium shadow-inner resize-none"
                      placeholder="Short transmission about your purpose..."
                    />
                  </div>
                </div>

                {/* Focus Areas */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12} className="text-indigo-400" /> Key Focus Trajectories
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {FOCUS_OPTIONS.map(area => (
                      <button 
                        key={area}
                        type="button"
                        onClick={() => toggleFocusArea(area)}
                        className={`p-3 rounded-xl border text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-between group cursor-pointer ${tempFocus.includes(area) ? 'bg-indigo-650 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                      >
                        <span className="truncate mr-2">{area}</span>
                        {tempFocus.includes(area) ? <Check size={10} strokeWidth={3} /> : <Plus size={10} className="opacity-0 group-hover:opacity-100" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred Language Selection Menu */}
                <div className="pt-2 border-t border-slate-800/80">
                  <LanguageSelector 
                    value={tempLanguage}
                    onChange={(lang) => setTempLanguage(lang)}
                    variant="dropdown"
                    showTitle={true}
                  />
                </div>
             </div>

             <div className="p-8 bg-slate-900/50 shrink-0">
                <button 
                  onClick={handleSaveProfile}
                  className="w-full py-5 bg-white text-slate-950 rounded-[24px] font-bold uppercase tracking-[0.3em] text-[11px] hover:bg-slate-100 transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-3 cursor-pointer"
                >
                  {t('save_profile', 'Save Neural Identity')}
                </button>
             </div>
           </div>
        </div>
      )}

      {/* Settings Modal Overlay */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-800/50 w-full max-w-md rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 relative">
             <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
             <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
             
             <div className="p-8 flex justify-between items-center relative z-10">
                <div className="text-left">
                  <h3 className="text-xl font-bold text-white font-outfit uppercase tracking-tight flex items-center gap-3">
                    <Settings size={22} className="text-indigo-400 animate-[spin_4s_linear_infinite]" /> 
                    {t('settings_title', 'Neural Settings')}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">{t('settings_version', 'v2.5.0-Flash Internal Build')}</p>
                </div>
                <button onClick={toggleSettings} className="p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-90 cursor-pointer">
                  <X size={20} />
                </button>
             </div>

             <div className="p-8 space-y-3 relative z-10 text-left">
                {/* Language & Region Option */}
                <div className="relative group/container">
                  <button 
                    onClick={() => setIsLanguageModalOpen(true)}
                    className="w-full p-4 rounded-[24px] bg-slate-950/40 hover:bg-indigo-600/5 hover:border-indigo-500/30 transition-all flex items-center justify-between group cursor-pointer border border-transparent"
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all duration-500">
                         <Globe size={20} />
                       </div>
                       <div className="text-left">
                         <div className="flex items-center gap-2">
                           <p className="text-[11px] font-bold text-white uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                             {t('language_region', 'Language & Region')}
                           </p>
                           <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                             {SUPPORTED_LANGUAGES.find(l => l.code === (userProfile.language || language))?.nativeName || 'English'}
                           </span>
                         </div>
                         <p className="text-[10px] text-slate-500 mt-0.5">{t('language_region_desc', 'Interface language & script')}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ChevronRight size={16} className="text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                </div>
                {SETTINGS_OPTIONS.map((item, i) => (
                  <div key={i} className="relative group/container">
                    <button 
                      onClick={() => handleAction(item.label)} 
                      onMouseEnter={() => setHoveredTooltip(i)}
                      onMouseLeave={() => setHoveredTooltip(null)}
                      className="w-full p-4 rounded-[24px] bg-slate-950/40 hover:bg-indigo-600/5 hover:border-indigo-500/30 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all duration-500">
                           <item.icon size={20} />
                         </div>
                         <div className="text-left">
                           <p className="text-[11px] font-bold text-white uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{item.label}</p>
                           <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Info 
                          size={14} 
                          className={`transition-colors ${hoveredTooltip === i ? 'text-indigo-400' : 'text-slate-700'}`} 
                        />
                        <ChevronRight size={16} className="text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>

                    {/* Enhanced Tooltip */}
                    {hoveredTooltip === i && (
                      <div className="absolute left-0 right-0 -top-12 z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="mx-4 p-3 bg-indigo-600 text-[10px] font-bold text-white uppercase tracking-wider rounded-xl shadow-2xl border border-indigo-400/30 text-center relative">
                          {item.tooltip}
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-600 rotate-45" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
             </div>
           </div>
         </div>
      )}

      {/* Language Selector Modal */}
      <LanguageSelector 
        variant="modal"
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        value={userProfile.language || language}
        onChange={(lang) => {
          onUpdateProfile({
            ...userProfile,
            language: lang
          });
          setLanguage(lang);
          setIsLanguageModalOpen(false);
          showToast(t('toast_language_changed', 'Preferred language updated successfully'), 'success');
        }}
      />

      {isSpaceSwitcherOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300 font-sans">
          <div className="bg-slate-900 border border-slate-800/80 w-full max-w-md rounded-[40px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 relative flex flex-col text-left">
            {/* Glow effects */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
            
            {/* Top Gradient line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            
            {/* Header */}
            <div className="p-6 flex justify-between items-center relative z-10">
              <div>
                <h3 className="text-lg font-bold text-white font-outfit uppercase tracking-tight flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-400 animate-pulse" />
                  Space Navigator
                </h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">Isolate focus ecosystems</p>
              </div>
              <button 
                onClick={() => setIsSpaceSwitcherOpen(false)} 
                className="p-2 bg-slate-800 hover:bg-slate-750 hover:text-white rounded-xl text-slate-400 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {/* Current Space Section */}
              <div className="space-y-3">
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Current Space</div>
                <div className="p-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{activeSpace.icon}</span>
                    <span className="text-xs font-black text-white uppercase tracking-wider">{activeSpace.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8.5px] font-bold text-indigo-400 uppercase tracking-widest mr-1">Active</span>
                    <div className="w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
                      <Check size={12} className="stroke-[3px]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Spaces Section */}
              <div className="space-y-3">
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Other Available Spaces</div>
                <div className="space-y-2">
                  {spaces.filter(s => s.id !== activeSpaceId).map(space => (
                    <button 
                      key={space.id}
                      onClick={() => {
                        onSwitchSpace(space.id);
                        setIsSpaceSwitcherOpen(false);
                        showToast(`Switched to ${space.name}`, 'success');
                      }}
                      className="w-full p-4 bg-slate-950/40 hover:bg-indigo-600/10 hover:border-indigo-500/20 rounded-2xl flex items-center justify-between transition-all group text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl group-hover:scale-110 transition-transform">{space.icon}</span>
                        <span className="text-xs font-bold text-slate-300 group-hover:text-white uppercase tracking-wider">{space.name}</span>
                      </div>
                      <div className="w-5 h-5 border border-slate-750 group-hover:border-indigo-500/50 rounded-full flex items-center justify-center text-transparent group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
                        <span className="text-[10px] font-bold">○</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Create New Space Container */}
              {isCreatingSpaceOpen ? (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3.5 text-left animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center">
                    <span className="text-[8.5px] font-bold text-indigo-400 uppercase tracking-widest">Create Focus Space</span>
                    <button onClick={() => { setIsCreatingSpaceOpen(false); setNewSpaceName(''); }} className="text-slate-500 hover:text-white text-xs"><X size={12} /></button>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newSpaceIcon}
                      onChange={(e) => setNewSpaceIcon(e.target.value.substring(0, 2))}
                      placeholder="🚀"
                      className="w-12 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2.5 text-center text-sm text-white focus:outline-none focus:border-indigo-500/40"
                    />
                    <input 
                      type="text" 
                      value={newSpaceName}
                      onChange={(e) => setNewSpaceName(e.target.value)}
                      placeholder="e.g. Science Space"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/40 font-medium placeholder:text-slate-600"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (!newSpaceName.trim()) {
                        showToast('Enter a valid space name', 'info');
                        return;
                      }
                      onCreateSpace(newSpaceName.trim(), newSpaceIcon || '🌐');
                      setNewSpaceName('');
                      setIsCreatingSpaceOpen(false);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
                  >
                    Synthesize Space
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsCreatingSpaceOpen(true)}
                  className="w-full py-3.5 px-4 bg-slate-950/20 hover:bg-slate-950/40 border border-dashed border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-white rounded-2xl font-bold uppercase tracking-widest text-[8.5px] flex items-center justify-center gap-2 transition-all cursor-pointer font-sans"
                >
                  <Plus size={12} />
                  + Create New Space
                </button>
              )}
            </div>

            {/* Footer trigger to Manage Spaces */}
            <div className="p-6 bg-slate-900/50 flex justify-between items-center font-sans">
              <button 
                onClick={() => {
                  setIsManagingSpacesOpen(true);
                  setIsSpaceSwitcherOpen(false);
                }}
                className="text-[8.5px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Settings size={12} /> ⚙ Manage Spaces
              </button>
              <span className="text-[7.5px] font-mono text-slate-600 uppercase">Synchronized with identity</span>
            </div>
          </div>
        </div>
      )}

      {/* Manage Spaces modal overlay */}
      {isManagingSpacesOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300 font-sans">
          <div className="bg-slate-900 border border-slate-800/80 w-full max-w-md rounded-[40px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 relative flex flex-col text-left font-sans">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-indigo-500" />
            
            <div className="p-6 flex justify-between items-center font-sans">
              <div>
                <h3 className="text-lg font-bold text-white font-outfit uppercase tracking-tight flex items-center gap-2">
                  <Settings size={16} className="text-indigo-400 animate-[spin_6s_linear_infinite]" />
                  Manage Spaces
                </h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5">Edit or purge focus ecosystems</p>
              </div>
              <button 
                onClick={() => {
                  setIsManagingSpacesOpen(false);
                  setIsSpaceSwitcherOpen(true); // fall back to navigator
                }} 
                className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-xl text-slate-400 transition-all cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {spaces.map(space => {
                const isDefault = ['business', 'study', 'gaming', 'personal'].includes(space.id);
                return (
                  <div 
                    key={space.id}
                    className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 font-sans">
                      <span className="text-xl">{space.icon}</span>
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">{space.name}</span>
                        {isDefault && <p className="text-[7.5px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5 font-sans">Core Default</p>}
                      </div>
                    </div>
                    
                    {!isDefault && onDeleteSpace ? (
                      <button 
                        onClick={() => {
                          if (activeSpaceId === space.id) {
                            onSwitchSpace('business');
                          }
                          onDeleteSpace(space.id);
                          showToast(`Purged ${space.name}`, 'info');
                        }}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all cursor-pointer"
                        title="Purge Space Node"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <span className="text-[7.5px] text-slate-600 font-bold uppercase tracking-widest border border-slate-800 bg-slate-950/40 px-2 py-0.5 rounded-md">Locked</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-6 bg-slate-900/50 flex justify-end font-sans">
              <button 
                onClick={() => {
                  setIsManagingSpacesOpen(false);
                  setIsSpaceSwitcherOpen(true);
                }}
                className="px-5 py-2.5 bg-white text-slate-950 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Profile Board with Dynamic Background Banner selection */}
      <div className="bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl shadow-black/40 backdrop-blur-xl relative">
        {/* Banner Section */}
        <div className="h-28 w-full relative bg-slate-950 overflow-hidden">
          <img 
            src={userProfile.profileBanner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop'} 
            className="w-full h-full object-cover opacity-75 object-center" 
            alt="Profile Header Banner" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/10" />
          
          {/* Settings Trigger Over the Banner */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2.5">
            <button 
              onClick={toggleSettings}
              className="p-2 bg-slate-950/70 hover:bg-slate-900 rounded-xl text-slate-300 hover:text-white backdrop-blur-md border border-white/[0.08] transition-all active:scale-95 group cursor-pointer"
            >
              <Settings className="group-hover:rotate-90 transition-transform duration-300 stroke-[1.75]" size={15} />
            </button>
          </div>
        </div>

        {/* Content Section Offsetted Over Banner */}
        <div className="p-6 pt-0 flex flex-col md:flex-row items-center md:items-start md:text-left gap-6 relative z-10 -mt-10 text-center">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 group-hover:border-indigo-500/50 transition-all duration-300 shadow-2xl bg-slate-900">
              <img src={userProfile.avatar || "https://i.pravatar.cc/300?u=alex"} className="w-full h-full object-cover" alt={userProfile.name} />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-lg p-1.5 border-2 border-slate-950 shadow-lg cursor-help group/shield">
              <Shield size={10} className="text-white stroke-[2]" />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-[8px] font-bold text-white uppercase px-2 py-1 rounded opacity-0 group-hover/shield:opacity-100 transition-opacity whitespace-nowrap">Verified Human</div>
            </div>
          </div>

          <div className="flex-1 space-y-2.5">
            <div>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-1 md:gap-2">
                <h2 className="text-xl font-bold text-slate-100 font-outfit tracking-tight">{userProfile.name || 'Anonymous Node'}</h2>
                {userProfile.username && (
                  <span className="text-indigo-400 font-mono text-xs opacity-70 md:mt-0.5">@{userProfile.username}</span>
                )}
              </div>
              {userProfile.bio && (
                <p className="text-slate-400 text-xs font-normal leading-relaxed max-w-md italic mt-1 bg-slate-950/40 py-1 px-3 rounded-xl inline-block border border-white/[0.05]">
                  "{userProfile.bio}"
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 pt-0.5">
              {userProfile.interests && userProfile.interests.length > 0 ? (
                userProfile.interests.map(area => (
                  <span key={area} className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-medium text-indigo-300 tracking-wide">{area}</span>
                ))
              ) : (
                <span className="text-xs font-normal text-slate-500">No active interests configured.</span>
              )}
            </div>

            <div className="flex items-center justify-center md:justify-start gap-5 pt-1 font-sans">
              <div className="text-center group cursor-pointer" onClick={() => handleAction('Following')}>
                <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">{followingCount !== undefined ? followingCount : 432}</p>
                <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Following</p>
              </div>
              <div className="h-4 w-px bg-slate-800" />
              <div className="text-center group cursor-pointer" onClick={() => handleAction('Followers')}>
                <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">1.2K</p>
                <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Followers</p>
              </div>
              <div className="h-4 w-px bg-slate-800" />
              <div className="text-center group cursor-pointer" onClick={() => handleAction('Level Breakdowns')}>
                <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">{userProfile.level}</p>
                <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Neural Level</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 w-full md:w-auto self-center md:self-start md:pt-6">
            <button onClick={openEditProfile} className="flex items-center justify-center gap-1.5 px-5 py-2 bg-white text-slate-900 rounded-xl font-bold uppercase tracking-widest text-[8.5px] hover:bg-slate-100 transition-all shadow-xl active:scale-95 cursor-pointer">
              <Edit2 size={9} /> {t('edit_profile', 'Edit Identity')}
            </button>
            <button onClick={() => setIsShareMenuOpen(!isShareMenuOpen)} className={`flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl font-bold uppercase tracking-widest text-[8.5px] transition-all active:scale-95 cursor-pointer ${isShareMenuOpen ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Share2 size={9} /> Share Node
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Double-Column Side Panel */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-slate-900/40 border border-slate-900 rounded-[40px] p-8 min-h-[500px] shadow-2xl relative text-left">
            <div className="flex items-center justify-between mb-8 overflow-x-auto no-scrollbar">
              <div className="flex gap-8 pb-2">
                <button 
                  onClick={() => setActiveSubTab('portfolio')}
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2.5 transition-all whitespace-nowrap relative py-2 cursor-pointer ${activeSubTab === 'portfolio' ? 'text-white' : 'text-slate-600 hover:text-slate-300'}`}
                >
                  <Grid size={13} className={activeSubTab === 'portfolio' ? 'text-indigo-400' : ''} /> {t('portfolio', 'Portfolio')}
                  {activeSubTab === 'portfolio' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-550 rounded-full animate-in fade-in duration-500" />}
                </button>
                <button 
                  onClick={() => setActiveSubTab('saved')}
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2.5 transition-all whitespace-nowrap relative py-2 cursor-pointer ${activeSubTab === 'saved' ? 'text-white' : 'text-slate-600 hover:text-slate-300'}`}
                >
                  <Bookmark size={13} className={activeSubTab === 'saved' ? 'text-amber-400' : ''} /> {t('saved', 'Saved')}
                  {activeSubTab === 'saved' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-550 rounded-full animate-in fade-in duration-500" />}
                </button>
                <button 
                  onClick={() => setActiveSubTab('purchased')}
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2.5 transition-all whitespace-nowrap relative py-2 cursor-pointer ${activeSubTab === 'purchased' ? 'text-white' : 'text-slate-600 hover:text-slate-300'}`}
                >
                  <ShoppingBag size={13} className={activeSubTab === 'purchased' ? 'text-emerald-400' : ''} /> {t('assets', 'Assets')}
                  {activeSubTab === 'purchased' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-555 rounded-full animate-in fade-in duration-500" />}
                </button>
              </div>
            </div>

            {/* Sub-tab 1: Portfolio View */}
            {activeSubTab === 'portfolio' && (
              <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="aspect-square bg-slate-950 rounded-[24px] overflow-hidden hover:ring-2 hover:ring-indigo-500/50 cursor-pointer transition-all group relative shadow-xl">
                     <img src={`https://picsum.photos/seed/asset_${i + 5}/400/400`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="Asset Render" />
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-[8px] font-bold text-white uppercase tracking-[0.2em]">Neural Render {i}</span>
                     </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Sub-tab 2: Saved Item Card lists */}
            {activeSubTab === 'saved' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {savedPosts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {savedPosts.map(post => (
                      <div key={post.id} className="bg-slate-950 rounded-[32px] overflow-hidden group hover:border-amber-500/30 transition-all shadow-xl">
                        <div className="relative h-40 overflow-hidden">
                          <img src={post.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                          <div className="absolute top-4 left-4 p-2 bg-slate-950/60 backdrop-blur-md rounded-xl">
                            <Bookmark size={12} className="text-amber-500" />
                          </div>
                        </div>
                        <div className="p-5">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.25em] mb-1.5">{post.creator}</p>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed line-clamp-2">{post.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 opacity-25">
                    <Bookmark size={50} strokeWidth={1.5} className="text-slate-500" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] mt-4 text-slate-500">No Saved Neural Layers</p>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Purchased Assets lists */}
            {activeSubTab === 'purchased' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {purchasedPosts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {purchasedPosts.map(post => (
                      <div key={post.id} className="bg-slate-950 rounded-[32px] overflow-hidden group hover:border-emerald-500/30 transition-all cursor-pointer shadow-xl">
                        <div className="relative h-40 overflow-hidden">
                          <img src={post.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                          <div className="absolute top-4 right-4 bg-emerald-500 text-[9px] text-white font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Owned</div>
                        </div>
                        <div className="p-5 text-left">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.25em] mb-1.5">{post.creator}</p>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed line-clamp-2">{post.content}</p>
                          <button className="mt-4 w-full py-3 bg-slate-900 rounded-[18px] text-[10px] font-bold text-white uppercase tracking-[0.2em] hover:bg-emerald-600/10 hover:border-emerald-505 hover:text-emerald-450 transition-all active:scale-95 cursor-pointer">Enter Course Terminal</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 opacity-25">
                    <ShoppingBag size={50} strokeWidth={1.5} className="text-slate-500" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] mt-4 text-slate-500">No Purchased Assets Available</p>
                  </div>
                )}
              </div>
            )}


          </div>
        </div>

        {/* Right Columns: Stats and Customizable Milestones */}
        <div className="space-y-8 text-left">
            {/* Customizable Milestones List Component! */}
           <div className="bg-slate-900/40 border border-slate-900 rounded-[40px] p-8 shadow-2xl relative">
              <div className="flex items-center justify-between mb-6 pb-2">
                <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.25em] flex items-center gap-2.5">
                  <ListChecks size={15} className="text-indigo-400" /> Local Milestones
                </h3>
                <button 
                  onClick={() => setIsAddingMilestone(!isAddingMilestone)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer"
                  title="Create Milestones Target"
                >
                  <PlusCircle size={16} />
                </button>
              </div>

              {/* Dynamic Add Milestone Input Accordion */}
              {isAddingMilestone && (
                <form onSubmit={handleCreateMilestone} className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl mb-4 space-y-3 animate-in slide-in-from-top duration-300 relative z-20">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold uppercase tracking-widest text-slate-500 block">Milestone Target</label>
                    <input 
                      type="text" 
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                      placeholder="e.g. Complete 3 coding logs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold uppercase tracking-widest text-slate-500 block">Trajectory Category</label>
                      <select 
                        value={newMilestoneCategory}
                        onChange={(e) => setNewMilestoneCategory(e.target.value)}
                        className="w-full bg-slate-905 border border-slate-800 rounded-xl p-2 px-1 text-[10px] text-slate-300 font-black uppercase tracking-wider outline-none cursor-pointer"
                      >
                        <option value="Focus">💼 Focus</option>
                        <option value="Health">🏋️ Health</option>
                        <option value="SaaS">🚀 SaaS</option>
                        <option value="Study">📚 Study</option>
                        <option value="Streak">🔥 Streak</option>
                      </select>
                    </div>

                    <div className="flex items-end justify-end">
                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 border border-indigo-505 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Push Target
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Milestones dynamic lists rendering */}
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {milestonesList.length > 0 ? (
                  milestonesList.map((m) => (
                    <div 
                      key={m.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 group/item transition-all ${m.completed ? 'bg-slate-950/30 border-emerald-500/10 opacity-60' : 'bg-slate-950/60 border-slate-900 hover:border-slate-850'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button 
                          type="button"
                          onClick={() => handleToggleMilestone(m.id)}
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer ${m.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-800 hover:border-indigo-405 bg-slate-950 hover:bg-indigo-600/5'}`}
                        >
                          {m.completed && <Check size={11} strokeWidth={4} />}
                        </button>

                        <div className="text-left min-w-0">
                          <span className={`text-[9.5px] leading-tight block truncate font-bold ${m.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {m.title}
                          </span>
                          <span className="text-[7px] font-black tracking-widest uppercase text-slate-500 mt-0.5 block">{m.category} • +50 XP Reward</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDeleteMilestone(m.id)}
                        className="p-1 hover:bg-rose-500/10 rounded-lg text-slate-600 hover:text-rose-450 transition-colors opacity-0 group-hover/item:opacity-100 cursor-pointer shrink-0"
                        title="Delete Milestone"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 opacity-25">
                    <Award size={36} className="mx-auto text-slate-550" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-2">No milestones set. Select the plus button above.</p>
                  </div>
                )}
              </div>
           </div>

           {/* Global Burn section */}
           <div className="bg-slate-900/40 border border-slate-900 rounded-[40px] p-8 shadow-2xl">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.25em] mb-8 flex items-center gap-3">
                <Flame size={15} className="text-orange-500 animate-pulse" /> Neural Burn Velocity
              </h3>
              <div className="space-y-5">
                <div className="p-5 bg-slate-950/50 rounded-[28px] hover:border-indigo-500/30 transition-all cursor-pointer group shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">Deep Work Engine</p>
                    <span className="text-[10px] font-mono font-bold text-indigo-400">75%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-[2px]">
                    <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full" style={{ width: '75%' }} />
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">4.5h Logged</p>
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  </div>
                </div>
                <div className="p-5 bg-slate-950/50 rounded-[28px] hover:border-emerald-500/30 transition-all cursor-pointer group shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">Asset Mastery</p>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">60%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-[2px]">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: '60%' }} />
                  </div>
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-3">12/20 Modules</p>
                </div>
              </div>
           </div>

           {/* Interactive Neural Awards Block */}
           <div className="bg-slate-900/40 border border-slate-900 rounded-[40px] p-8 shadow-2xl text-left">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.25em] flex items-center gap-3">
                  <Award size={15} className="text-yellow-500" /> Neural Awards
                </h3>
                <span className="text-[8px] font-mono bg-indigo-500/15 text-indigo-400 font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                  {ACHIEVEMENTS.filter(a => a.isUnlocked).length} / {ACHIEVEMENTS.length} Unlocked
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-3 mb-6">
                {ACHIEVEMENTS.slice(0, 3).map((badge) => {
                  const style = getBadgeStyles(badge.bgType, badge.isUnlocked);
                  return (
                    <div 
                      key={badge.id}
                      onClick={() => setIsBadgesModalOpen(true)}
                      className={`aspect-square ${style.bg} border ${style.glow} rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group/badge relative shadow-xl hover:scale-105 active:scale-95`}
                      title={`${badge.title}: ${badge.isUnlocked ? 'Unlocked' : 'Locked'}`}
                    >
                      <badge.icon size={20} className={`${badge.color} ${badge.isUnlocked ? '' : 'opacity-40'}`} />
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-[8px] font-bold text-white uppercase px-2 py-1 rounded shadow-2xl opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
                        {badge.title} ({badge.isUnlocked ? 'Unlocked' : 'Locked'})
                      </div>
                    </div>
                  );
                })}
                <div 
                  onClick={() => setIsBadgesModalOpen(true)}
                  className="aspect-square bg-slate-950/60 hover:bg-slate-950/95 border border-dashed border-slate-800 hover:border-slate-700/60 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer text-slate-500 hover:text-indigo-400 group relative shadow-xl active:scale-95"
                  title="View All"
                >
                  <Plus size={16} />
                  <span className="text-[7px] font-black uppercase mt-1 tracking-wider text-slate-600 group-hover:text-indigo-400">All</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBadgesModalOpen(true)}
                className="w-full py-3.5 bg-slate-950/60 hover:bg-slate-950 hover:text-white border border-slate-800/80 hover:border-slate-700 rounded-2xl text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group/btn cursor-pointer active:scale-95"
              >
                <span>Access Neural Archive to see all awards</span>
                <ChevronRight size={12} className="text-slate-500 group-hover/btn:translate-x-1 transition-transform" />
              </button>
           </div>
        </div>
      </div>

      {/* Global Share Modal */}
      {isShareMenuOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsShareMenuOpen(false)} />
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="p-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white font-outfit uppercase tracking-tight">Broadcast Identity</h3>
              <button onClick={() => setIsShareMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-all cursor-pointer"><X size={20} /></button>
            </div>
            
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`Check out my Nexora Node: ${userProfile.name}`)}`); setIsShareMenuOpen(false); }} className="flex flex-col items-center gap-2.5 p-4 hover:bg-white/5 rounded-2xl transition-all group cursor-pointer">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform"><WhatsApp size={24} /></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp</span>
                </button>
                <button onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`); setIsShareMenuOpen(false); }} className="flex flex-col items-center gap-2.5 p-4 hover:bg-white/5 rounded-2xl transition-all group cursor-pointer">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform"><Facebook size={24} /></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Facebook</span>
                </button>
                <button onClick={() => { window.open(`mailto:?subject=Nexora Node Connection&body=${encodeURIComponent(`Connect with my neural node on Nexora: ${userProfile.name}`)}`); setIsShareMenuOpen(false); }} className="flex flex-col items-center gap-2.5 p-4 hover:bg-white/5 rounded-2xl transition-all group cursor-pointer">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform"><Mail size={24} /></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Email</span>
                </button>
                <button onClick={() => { showToast("Node Archive Uploading...", "info"); setIsShareMenuOpen(false); }} className="flex flex-col items-center gap-2.5 p-4 hover:bg-white/5 rounded-2xl transition-all group cursor-pointer">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform"><Drive size={24} /></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Drive</span>
                </button>
              </div>
              
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); showToast("Node Link Copied", "success"); setIsShareMenuOpen(false); }} className="w-full flex items-center justify-center gap-3 p-4 bg-slate-800/50 hover:bg-white/5 rounded-2xl transition-all group cursor-pointer">
                <Link size={18} className="text-slate-400 group-hover:text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase tracking-widest">Copy Node Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badges & Achievements Modal */}
      {isBadgesModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsBadgesModalOpen(false)} />
          
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[40px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh] z-10 text-left">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-purple-500" />
            
            {/* Modal Header */}
            <div className="p-8 pb-5 flex justify-between items-center shrink-0 relative">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400">
                  <Award size={24} className="text-yellow-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-outfit uppercase tracking-tight flex items-center gap-2">
                    Neural Archival Achievements
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setIsBadgesModalOpen(false)} 
                className="w-10 h-10 hover:bg-white/5 border border-transparent hover:border-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Summary Strip */}
            <div className="px-8 pb-4 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between shrink-0">
              <div className="flex gap-6">
                <div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Unlocked Node Badges</span>
                  <span className="text-lg font-bold text-indigo-400 font-mono">
                    {ACHIEVEMENTS.filter(a => a.isUnlocked).length} <span className="text-xs text-slate-500">/ {ACHIEVEMENTS.length}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Accrued Achievement XP</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {ACHIEVEMENTS.filter(a => a.isUnlocked).reduce((acc, curr) => acc + curr.xpReward, 0)} <span className="text-xs text-slate-500">XP</span>
                  </span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5">
                {(['all', 'unlocked', 'locked'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setBadgesFilter(filter)}
                    className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      badgesFilter === filter 
                        ? 'bg-slate-800 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body / Scrollable badges list */}
            <div className="p-8 overflow-y-auto space-y-4 max-h-[50vh] no-scrollbar">
              {ACHIEVEMENTS.filter(a => {
                if (badgesFilter === 'unlocked') return a.isUnlocked;
                if (badgesFilter === 'locked') return !a.isUnlocked;
                return true;
              }).map((badge) => {
                const style = getBadgeStyles(badge.bgType, badge.isUnlocked);
                const BadgeIcon = badge.icon;
                const progressPercentage = Math.min(100, Math.round((badge.progressCurrent / badge.progressMax) * 100));

                return (
                  <div 
                    key={badge.id}
                    className={`p-5 rounded-[24px] border ${style.bg} ${style.glow} transition-all duration-300 flex flex-col md:flex-row items-start md:items-center gap-5`}
                  >
                    {/* Badge Icon Wrapper */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 ${style.iconBg}`}>
                      <BadgeIcon size={26} className={`${badge.color} ${badge.isUnlocked ? '' : 'opacity-40'}`} />
                    </div>

                    {/* Progress details */}
                    <div className="flex-1 min-w-0 space-y-1.5 w-full">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-bold uppercase font-outfit tracking-tight ${badge.isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                          {badge.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            badge.isUnlocked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-950/80 text-slate-500'
                          }`}>
                            {badge.isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                          </span>
                          <span className="text-[8.5px] font-mono font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">
                            +{badge.xpReward} XP
                          </span>
                        </div>
                      </div>

                      <p className={`text-[10px] leading-relaxed font-sans ${badge.isUnlocked ? 'text-slate-300' : 'text-slate-500'}`}>
                        {badge.description}
                      </p>

                      {/* Progress bar / requirement state */}
                      <div className="pt-1.5 space-y-1">
                        <div className="flex justify-between items-center text-[8.5px] font-mono">
                          <span className={`${badge.isUnlocked ? 'text-slate-400' : 'text-slate-600'} uppercase tracking-widest`}>
                            Requirement: {badge.requirementText}
                          </span>
                          <span className="text-slate-400 font-bold">
                            {badge.progressCurrent} / {badge.progressMax}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden p-[1px]">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              badge.isUnlocked 
                                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500' 
                                : 'bg-slate-800'
                            }`}
                            style={{ width: `${progressPercentage}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {ACHIEVEMENTS.filter(a => {
                if (badgesFilter === 'unlocked') return a.isUnlocked;
                if (badgesFilter === 'locked') return !a.isUnlocked;
                return true;
              }).length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Award size={48} className="mx-auto block text-slate-700 stroke-[1.5] mb-3 animate-pulse" />
                  <p className="text-xs uppercase tracking-wider font-bold">No achievements found in this frequency.</p>
                </div>
              )}
            </div>


          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
