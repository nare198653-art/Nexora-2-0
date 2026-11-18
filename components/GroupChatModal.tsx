import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Users, Shield, ShieldCheck, ShieldAlert, Trash2, LogOut, Link as LinkIcon, 
  Copy, Check, Plus, Search, Pin, MessageSquare, Image, Video, FileText, 
  Volume2, Eye, UserPlus, UserMinus, Globe, Lock, BellOff, Info
} from 'lucide-react';
import { DirectMessage, Message, GroupChatDetails } from '../types';

const playLocalSynth = (type: 'tap' | 'success' | 'delete' | 'toggle') => {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'toggle') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.setValueAtTime(400, now + 0.05);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {
    console.warn('Audio synthesis failed', e);
  }
};

export interface Contact {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export const GROUP_CONTACTS: Contact[] = [
  { id: 'u1', name: 'Kabir Zen', username: 'kabir.zen', avatar: 'https://i.pravatar.cc/150?u=kabir' },
  { id: 'u2', name: 'Zoya Code', username: 'zoya.code', avatar: 'https://i.pravatar.cc/150?u=zoya' },
  { id: 'u3', name: 'Aryan Builder', username: 'aryan.build', avatar: 'https://i.pravatar.cc/150?u=aryan' },
  { id: 'u4', name: 'Ishaan Growth', username: 'ishaan.growth', avatar: 'https://i.pravatar.cc/150?u=ishaan' },
  { id: 'u5', name: 'Meera Mind', username: 'meera.mind', avatar: 'https://i.pravatar.cc/150?u=meera' },
  { id: 'u6', name: 'Rohan Vibe', username: 'rohan.vibe', avatar: 'https://i.pravatar.cc/150?u=rohan' },
  { id: 'u7', name: 'Sarah J.', username: 'sarah.react', avatar: 'https://i.pravatar.cc/150?u=sarah' },
  { id: 'u8', name: 'MindsetMastery', username: 'mindset.master', avatar: 'https://i.pravatar.cc/150?u=mindset' },
];

interface GroupCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupName: string, selectedMembers: string[], description: string, photo: string) => void;
  showToast?: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const GroupCreationModal: React.FC<GroupCreationModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  showToast
}) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState('https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150');
  const [search, setSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const filteredContacts = GROUP_CONTACTS.filter(contact => 
    contact.name.toLowerCase().includes(search.toLowerCase()) ||
    contact.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      if (showToast) showToast("Group name is required", "error");
      return;
    }
    if (selectedMemberIds.length === 0) {
      if (showToast) showToast("Please select at least one member", "error");
      return;
    }

    onCreateGroup(groupName.trim(), selectedMemberIds, description.trim(), selectedPhoto);
    setGroupName('');
    setDescription('');
    setSelectedMemberIds([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl p-6 flex flex-col max-h-[85vh] z-10"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white font-outfit uppercase tracking-tight">Create Group Node</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {/* Group details form */}
            <div className="flex gap-4 items-center">
              <div className="relative group shrink-0">
                <img src={selectedPhoto} className="w-16 h-16 rounded-2xl object-cover border border-slate-700 shadow-lg" alt="Group" />
                <button 
                  onClick={() => {
                    const idx = Math.floor(Math.random() * 5);
                    const photos = [
                      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
                      'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=150',
                      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150',
                      'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150',
                      'https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?w=150'
                    ];
                    setSelectedPhoto(photos[idx]);
                  }}
                  className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-tighter transition-opacity"
                >
                  Change
                </button>
              </div>
              <div className="flex-1 space-y-2">
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group Name (e.g. Dev Sync)" 
                  className="w-full bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                />
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A concise channel description (optional)" 
                  className="w-full bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                />
              </div>
            </div>

            {/* Select Members Section */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Select Group Members</label>
              <div className="bg-slate-950 border border-slate-850 rounded-xl flex items-center px-3 py-1">
                <Search size={14} className="text-slate-600" />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search network contacts..." 
                  className="bg-transparent border-none outline-none py-2 px-3 text-xs text-white placeholder:text-slate-700 flex-1 font-medium"
                />
              </div>

              <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-1 pr-1 pt-1">
                {filteredContacts.map(contact => {
                  const isChecked = selectedMemberIds.includes(contact.id);
                  return (
                    <div 
                      key={contact.id} 
                      onClick={() => toggleMember(contact.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-850/40 cursor-pointer transition-colors ${isChecked ? 'bg-indigo-600/10 border-indigo-500/20' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <img src={contact.avatar} className="w-9 h-9 rounded-full object-cover border border-slate-800" alt={contact.name} />
                        <div>
                          <p className="text-xs font-bold text-white leading-normal">{contact.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono leading-tight">@{contact.username}</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                        isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-800 bg-slate-950 text-transparent'
                      }`}>
                        <Check size={10} strokeWidth={3} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button 
            onClick={handleCreate}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all shadow-xl mt-6 shrink-0"
          >
            Create Connection Link
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chat?: DirectMessage;
  group?: DirectMessage;
  onUpdateGroupDetails?: (groupId: string, name: string, description: string, photo: string) => void;
  onUpdateDetails?: (groupId: string, name: string, description: string, photo: string) => void;
  onAddMembers: (groupId: string, memberIds: string[]) => void;
  onKickMember: (groupId: string, memberId: string) => void;
  onPromoteAdmin: (groupId: string, memberId: string) => void;
  onDemoteAdmin: (groupId: string, memberId: string) => void;
  onTransferOwnership: (groupId: string, memberId: string) => void;
  onLeaveGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onTogglePinMessage?: (groupId: string, msgId: string) => void;
  onUpdateHistorySetting?: (groupId: string, setting: 'entire' | '30days' | 'joining') => void;
  showToast?: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({
  isOpen,
  onClose,
  chat: propChat,
  group,
  onUpdateGroupDetails: propUpdateGroupDetails,
  onUpdateDetails,
  onAddMembers,
  onKickMember,
  onPromoteAdmin,
  onDemoteAdmin,
  onTransferOwnership,
  onLeaveGroup,
  onDeleteGroup,
  onTogglePinMessage,
  onUpdateHistorySetting,
  showToast
}) => {
  const chat = propChat || group;
  const onUpdateGroupDetails = propUpdateGroupDetails || onUpdateDetails;
  const details = chat?.groupDetails;

  const currentUserId = 'alex_m.synapse'; // Mock user profile ID

  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'media' | 'security'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);

  // Sync state when details change or drawer is opened/closed
  React.useEffect(() => {
    if (details) {
      setEditName(details.name || '');
      setEditDesc(details.description || '');
      setEditPhoto(details.photo || '');
    }
  }, [details, isOpen]);

  // Member additions
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [searchContact, setSearchContact] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);

  if (!details || !chat) return null;

  // User roles check
  const isOwner = details.ownerId === currentUserId;
  const isAdmin = details.adminIds.includes(currentUserId) || isOwner;

  // Dynamic Media Browser Calculation
  const messages = chat.messages || [];
  const sharedMedia = messages.reduce((acc, msg) => {
    if (msg.image) acc.images.push({ id: msg.id, url: msg.image, sender: msg.senderName || 'Unknown', time: msg.time });
    if (msg.videoUrl) acc.videos.push({ id: msg.id, url: msg.videoUrl, sender: msg.senderName || 'Unknown', time: msg.time });
    if (msg.documentName) acc.documents.push({ id: msg.id, name: msg.documentName, size: msg.documentSize || '0 KB', sender: msg.senderName || 'Unknown', time: msg.time });
    if (msg.audioUrl) acc.audio.push({ id: msg.id, url: msg.audioUrl, duration: msg.voiceNoteDuration || 0, sender: msg.senderName || 'Unknown', time: msg.time });
    
    // Simple regex for links
    if (msg.text && /https?:\/\/[^\s]+/g.test(msg.text)) {
      const links = msg.text.match(/https?:\/\/[^\s]+/g);
      if (links) {
        links.forEach(lnk => {
          acc.links.push({ id: msg.id, url: lnk, sender: msg.senderName || 'Unknown', time: msg.time });
        });
      }
    }
    return acc;
  }, {
    images: [] as any[],
    videos: [] as any[],
    documents: [] as any[],
    audio: [] as any[],
    links: [] as any[]
  });

  const handleCopyInvite = () => {
    try {
      navigator.clipboard.writeText(details.inviteLink);
      setInviteCopied(true);
      if (showToast) showToast("Invite Link Copied!", "success");
      setTimeout(() => setInviteCopied(false), 2000);
    } catch (e) {
      // Fallback
    }
  };

  const handleSaveDetails = () => {
    if (!editName.trim()) {
      if (showToast) showToast("Name is required", "error");
      return;
    }
    onUpdateGroupDetails(chat.id, editName.trim(), editDesc.trim(), editPhoto);
    setIsEditing(false);
    if (showToast) showToast("Group configurations synced", "success");
  };

  const handleAddSelected = () => {
    if (selectedToAdd.length === 0) return;
    onAddMembers(chat.id, selectedToAdd);
    setSelectedToAdd([]);
    setIsAddingMembers(false);
    if (showToast) showToast("Neural links added to node", "success");
  };

  const getRoleBadge = (userId: string) => {
    if (details.ownerId === userId) {
      return (
        <span className="flex items-center gap-1 text-[8px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
          <ShieldAlert size={10} /> Owner
        </span>
      );
    }
    if (details.adminIds.includes(userId)) {
      return (
        <span className="flex items-center gap-1 text-[8px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
          <ShieldCheck size={10} /> Admin
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400 bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
        <Users size={10} /> Member
      </span>
    );
  };

  // Filter contacts not already in group
  const addableContacts = GROUP_CONTACTS.filter(contact => 
    !details.memberIds.includes(contact.id) &&
    (contact.name.toLowerCase().includes(searchContact.toLowerCase()) || contact.username.toLowerCase().includes(searchContact.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[105] flex justify-end">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ x: '100%' }} 
          animate={{ x: 0 }} 
          exit={{ x: '100%' }} 
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md bg-slate-950 border-l border-slate-900 h-full flex flex-col z-10 overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-950 sticky top-0 shrink-0">
            <h3 className="text-sm font-bold text-white font-outfit uppercase tracking-widest flex items-center gap-2">
              <Users size={16} className="text-indigo-400" /> Channel Registry
            </h3>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-900 rounded-full text-slate-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Main info scrollable block */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {/* Visual Top Profile */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-900">
              <div className="relative mb-4 group">
                <img src={isEditing ? editPhoto : details.photo} className="w-24 h-24 rounded-[32px] object-cover border-4 border-indigo-500/10 p-1 shadow-xl" alt="Group" />
                {isEditing && (
                  <button 
                    onClick={() => {
                      const idx = Math.floor(Math.random() * 5);
                      const photos = [
                        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
                        'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=150',
                        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150',
                        'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150',
                        'https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?w=150'
                      ];
                      setEditPhoto(photos[idx]);
                    }}
                    className="absolute inset-0 bg-black/60 rounded-[32px] flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-tighter"
                  >
                    Random
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="w-full space-y-2 mb-2 max-w-xs">
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-center bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-sm font-bold text-white focus:outline-none"
                  />
                  <textarea 
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full text-center bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-400 focus:outline-none"
                    rows={2}
                  />
                  <div className="flex justify-center gap-2">
                    <button onClick={handleSaveDetails} className="px-3 py-1 bg-emerald-600 rounded-lg text-[9px] font-bold uppercase tracking-widest text-white">Save</button>
                    <button onClick={() => { setIsEditing(false); setEditName(details.name); setEditDesc(details.description); }} className="px-3 py-1 bg-slate-800 rounded-lg text-[9px] font-bold uppercase tracking-widest text-slate-400">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-white font-outfit mb-1">{details.name}</h2>
                  <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed mb-3">{details.description || 'No description established.'}</p>
                  <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Constructed {details.creationDate}</p>
                  
                  {isAdmin && (
                    <button onClick={() => setIsEditing(true)} className="mt-3 px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-bold text-slate-300 hover:text-white uppercase tracking-widest transition-all">
                      Configure Node
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Navigation tabs */}
            <div className="flex border-b border-slate-900 justify-between shrink-0">
              {([
                { id: 'info', label: 'Info' },
                { id: 'members', label: 'Members' },
                { id: 'media', label: 'Media' },
                { id: 'security', label: 'Security' }
              ] as const).map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => { playLocalSynth('tap'); setActiveTab(tab.id); }}
                  className={`flex-1 text-center py-2.5 text-[9px] font-bold uppercase tracking-wider relative transition-all ${
                    activeTab === tab.id ? 'text-white font-black' : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div layoutId="activeTabGlow" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Content segments */}
            <div className="space-y-4 pt-1">
              
              {/* INFO TAB */}
              {activeTab === 'info' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Share Code / Invite */}
                  <div className="bg-slate-900/40 border border-slate-900 rounded-[24px] p-4 space-y-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Direct Sync Invitation</p>
                    <div className="flex gap-2 bg-slate-950 border border-slate-850 p-2.5 rounded-xl justify-between items-center">
                      <div className="overflow-hidden pr-2">
                        <p className="text-[10px] text-indigo-400 font-mono truncate">{details.inviteLink}</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Code: {details.inviteCode}</p>
                      </div>
                      <button 
                        onClick={handleCopyInvite}
                        className="p-2 bg-slate-900 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0"
                      >
                        {inviteCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* History settings (Only visible/editable for Owner/Admin) */}
                  <div className="bg-slate-900/40 border border-slate-900 rounded-[24px] p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">History Buffer Configuration</p>
                      <span className="text-[8px] font-bold text-indigo-400 uppercase font-mono bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">Config</span>
                    </div>
                    
                    {isAdmin ? (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {([
                          { id: 'entire', label: 'Full Cache', desc: 'All history' },
                          { id: '30days', label: '30 Days', desc: 'Recent sync' },
                          { id: 'joining', label: 'Linear', desc: 'Joining onward' }
                        ] as const).map(setting => (
                          <button 
                            key={setting.id}
                            onClick={() => onUpdateHistorySetting && onUpdateHistorySetting(chat.id, setting.id)}
                            className={`p-2.5 border rounded-xl text-left transition-all ${
                              details.historySetting === setting.id 
                                ? 'bg-indigo-600/10 border-indigo-500 text-white' 
                                : 'bg-slate-950 border-slate-850 hover:bg-slate-900/60 text-slate-500'
                            }`}
                          >
                            <p className="text-[9px] font-bold uppercase tracking-tight leading-normal">{setting.label}</p>
                            <p className="text-[7px] font-medium leading-none opacity-60 mt-0.5">{setting.desc}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl">
                        <p className="text-xs font-bold text-white uppercase tracking-tight">
                          {details.historySetting === 'entire' ? 'Full Archive Buffer' : details.historySetting === '30days' ? '30-Day Storage Ring' : 'Linear Chronology'}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1 font-medium leading-normal">
                          Only Owners and Administrators can modify historical cache parameters.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pinned Messages Section */}
                  <div className="bg-slate-900/40 border border-slate-900 rounded-[24px] p-4 space-y-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Pin size={10} className="text-indigo-400 rotate-45" /> High-Intensity Pins
                    </p>
                    
                    {(!details.pinnedMessageIds || details.pinnedMessageIds.length === 0) ? (
                      <div className="text-center py-4 text-[10px] text-slate-600 uppercase font-mono">
                        No pinned nodes found
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                        {messages
                          .filter(msg => details.pinnedMessageIds?.includes(msg.id))
                          .map(msg => (
                            <div key={msg.id} className="flex justify-between items-start p-2 bg-slate-950 border border-slate-850 rounded-xl gap-3">
                              <div className="overflow-hidden">
                                <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-tight leading-normal">@{msg.senderName}</p>
                                <p className="text-[10px] text-slate-300 font-medium truncate mt-0.5">{msg.text || 'Photo Transmission'}</p>
                              </div>
                              {isAdmin && (
                                <button 
                                  onClick={() => onTogglePinMessage && onTogglePinMessage(chat.id, msg.id)}
                                  className="p-1 text-slate-600 hover:text-rose-400 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MEMBERS TAB */}
              {activeTab === 'members' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Search and Add Actions */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsAddingMembers(!isAddingMembers)}
                      className="flex-1 py-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <UserPlus size={14} className="text-indigo-400" /> Integrate Contacts
                    </button>
                  </div>

                  {/* Add Members Segment */}
                  {isAddingMembers && (
                    <div className="bg-slate-900/60 border border-indigo-500/10 p-4 rounded-[24px] space-y-3 animate-in slide-in-from-top-4 duration-300">
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Select Contacts</p>
                        <button onClick={() => setIsAddingMembers(false)} className="text-[8px] font-bold text-slate-500 hover:text-white uppercase">Close</button>
                      </div>
                      <input 
                        type="text" 
                        value={searchContact}
                        onChange={(e) => setSearchContact(e.target.value)}
                        placeholder="Search system network..." 
                        className="w-full bg-slate-950 border border-slate-850 px-3 py-2 rounded-xl text-xs text-white placeholder:text-slate-700"
                      />
                      <div className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-1">
                        {addableContacts.length === 0 ? (
                          <p className="text-center text-[9px] text-slate-600 uppercase font-mono py-2">No nodes available</p>
                        ) : (
                          addableContacts.map(contact => {
                            const selected = selectedToAdd.includes(contact.id);
                            return (
                              <div 
                                key={contact.id}
                                onClick={() => setSelectedToAdd(prev => prev.includes(contact.id) ? prev.filter(c => c !== contact.id) : [...prev, contact.id])}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-850/50 cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <img src={contact.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                                  <span className="text-xs font-bold text-slate-300">{contact.name}</span>
                                </div>
                                <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center ${selected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-800'}`}>
                                  <Check size={8} strokeWidth={4} />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <button 
                        onClick={handleAddSelected}
                        disabled={selectedToAdd.length === 0}
                        className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest disabled:opacity-35"
                      >
                        Confirm Integration
                      </button>
                    </div>
                  )}

                  {/* Members list */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Subscribers ({details.memberCount})</p>
                    
                    <div className="space-y-2">
                      {/* Current User */}
                      <div className="flex items-center justify-between p-3 bg-slate-900/30 border border-slate-900 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src="https://i.pravatar.cc/150?u=alex" className="w-10 h-10 rounded-xl object-cover border border-slate-800" alt="You" />
                            <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 border border-slate-950 rounded-full" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">alex_m.synapse (You)</p>
                            <p className="text-[9px] text-slate-500 font-mono">Host Channel</p>
                          </div>
                        </div>
                        {getRoleBadge(currentUserId)}
                      </div>

                      {/* Other Members */}
                      {GROUP_CONTACTS
                        .filter(contact => details.memberIds.includes(contact.id))
                        .map(member => {
                          const isMemberAdmin = details.adminIds.includes(member.id) || details.ownerId === member.id;
                          return (
                            <div key={member.id} className="p-3 bg-slate-900/20 border border-slate-900 rounded-2xl space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <img src={member.avatar} className="w-10 h-10 rounded-xl object-cover border border-slate-800" alt={member.name} />
                                  <div>
                                    <p className="text-xs font-bold text-slate-200">{member.name}</p>
                                    <p className="text-[9px] text-slate-500 font-mono">@{member.username}</p>
                                  </div>
                                </div>
                                {getRoleBadge(member.id)}
                              </div>

                              {/* Owner & Admin Actions Panel */}
                              {(isAdmin && member.id !== currentUserId) && (
                                <div className="flex gap-1.5 border-t border-slate-900 pt-2 justify-end">
                                  {isOwner && (
                                    <>
                                      <button 
                                        onClick={() => onTransferOwnership(chat.id, member.id)}
                                        className="px-2 py-1 bg-slate-900 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 border border-slate-800 rounded-lg text-[7.5px] font-bold uppercase tracking-wider transition-colors"
                                      >
                                        Pass Owner
                                      </button>
                                      {isMemberAdmin ? (
                                        <button 
                                          onClick={() => onDemoteAdmin(chat.id, member.id)}
                                          className="px-2 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded-lg text-[7.5px] font-bold uppercase tracking-wider transition-colors"
                                        >
                                          Demote
                                        </button>
                                      ) : (
                                        <button 
                                          onClick={() => onPromoteAdmin(chat.id, member.id)}
                                          className="px-2 py-1 bg-slate-900 hover:bg-amber-950/20 text-amber-400 hover:text-amber-300 border border-slate-800 rounded-lg text-[7.5px] font-bold uppercase tracking-wider transition-colors"
                                        >
                                          Promote Admin
                                        </button>
                                      )}
                                    </>
                                  )}
                                  <button 
                                    onClick={() => onKickMember(chat.id, member.id)}
                                    className="px-2 py-1 bg-slate-900 hover:bg-rose-950/20 text-rose-500 hover:text-rose-400 border border-slate-800 rounded-lg text-[7.5px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                                  >
                                    <UserMinus size={8} /> Kick
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Actions buttons for basic users */}
                  <div className="pt-4 border-t border-slate-900 flex flex-col gap-2">
                    <button 
                      onClick={() => onLeaveGroup(chat.id)}
                      className="w-full py-4 bg-slate-900 hover:bg-rose-950/20 text-rose-500 hover:text-rose-400 rounded-2xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all border border-slate-800/40"
                    >
                      <LogOut size={14} /> Leave Connection Group
                    </button>
                    {isOwner && (
                      <button 
                        onClick={() => onDeleteGroup(chat.id)}
                        className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-rose-600/10"
                      >
                        <Trash2 size={14} /> Demolish Group Channel
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* MEDIA BROWSER TAB */}
              {activeTab === 'media' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Category grids */}
                  <div className="space-y-4">
                    {/* Images & Videos */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Image size={10} className="text-indigo-400" /> Media & Visual Stream ({sharedMedia.images.length + sharedMedia.videos.length})
                      </p>
                      
                      {(sharedMedia.images.length === 0 && sharedMedia.videos.length === 0) ? (
                        <p className="text-[10px] text-slate-600 font-mono uppercase text-center py-4 bg-slate-900/10 border border-slate-900 rounded-xl">No media shared</p>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {sharedMedia.images.map((img, i) => (
                            <div key={img.id || i} className="aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-800 relative group cursor-pointer">
                              <img src={img.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-1 transition-opacity">
                                <span className="text-[6.5px] text-white font-bold truncate">@{img.sender}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Documents */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <FileText size={10} className="text-indigo-400" /> Packets & Documents ({sharedMedia.documents.length})
                      </p>
                      
                      {sharedMedia.documents.length === 0 ? (
                        <p className="text-[10px] text-slate-600 font-mono uppercase text-center py-4 bg-slate-900/10 border border-slate-900 rounded-xl">No documents shared</p>
                      ) : (
                        <div className="space-y-1.5">
                          {sharedMedia.documents.map((doc, i) => (
                            <div key={doc.id || i} className="flex items-center justify-between p-2.5 bg-slate-900/30 border border-slate-900 rounded-xl gap-3">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText size={16} className="text-indigo-400 shrink-0" />
                                <div className="overflow-hidden">
                                  <p className="text-[10px] font-bold text-white truncate leading-normal">{doc.name}</p>
                                  <p className="text-[8px] text-slate-500 font-mono leading-none mt-0.5">{doc.size} • by @{doc.sender}</p>
                                </div>
                              </div>
                              <button className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                                <Eye size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Audio & Voice Notes */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Volume2 size={10} className="text-indigo-400" /> Soundwaves & Voice notes ({sharedMedia.audio.length})
                      </p>
                      
                      {sharedMedia.audio.length === 0 ? (
                        <p className="text-[10px] text-slate-600 font-mono uppercase text-center py-4 bg-slate-900/10 border border-slate-900 rounded-xl">No audio nodes</p>
                      ) : (
                        <div className="space-y-1.5">
                          {sharedMedia.audio.map((aud, i) => (
                            <div key={aud.id || i} className="flex items-center justify-between p-2.5 bg-slate-900/30 border border-slate-900 rounded-xl">
                              <div className="flex items-center gap-2">
                                <Volume2 size={16} className="text-emerald-400" />
                                <div>
                                  <p className="text-[10px] font-bold text-white">Voice Note ({aud.duration}s)</p>
                                  <p className="text-[8px] text-slate-500 font-mono mt-0.5">by @{aud.sender} • {aud.time}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Links */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <LinkIcon size={10} className="text-indigo-400" /> Neural Links ({sharedMedia.links.length})
                      </p>
                      
                      {sharedMedia.links.length === 0 ? (
                        <p className="text-[10px] text-slate-600 font-mono uppercase text-center py-4 bg-slate-900/10 border border-slate-900 rounded-xl">No links indexed</p>
                      ) : (
                        <div className="space-y-1.5">
                          {sharedMedia.links.map((lnk, i) => (
                            <a 
                              key={lnk.id || i} 
                              href={lnk.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="block p-2.5 bg-slate-900/40 hover:bg-slate-900/75 border border-slate-900 hover:border-slate-800 rounded-xl transition-all"
                            >
                              <p className="text-[10px] font-bold text-indigo-400 truncate leading-normal">{lnk.url}</p>
                              <p className="text-[8px] text-slate-500 font-mono mt-0.5 leading-none">Index by @{lnk.sender} • {lnk.time}</p>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === 'security' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-slate-900/40 border border-slate-900 rounded-[24px] p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <Lock size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wide leading-normal">Encryption Protocol Active</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                          Nexora nodes use secure quantum-resistant tunnel encapsulation. Direct group syncs remain isolated between peer credentials. Keys are refreshed dynamically at midnight.
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-slate-900" />

                    <div className="flex items-start gap-3">
                      <Shield size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wide leading-normal">Peer Verification Node</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                          Only verified nodes matching active circles can enter or broadcast. Unrecognized signatures are automatically contained in a sandboxed neural filter.
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-slate-900" />

                    <div className="flex items-start gap-3">
                      <Globe size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wide leading-normal">Rate Limiting & Spam Filter</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                          Intelligent limits protect groups from rapid-fire spam. Maximum of 15 transmissions per 10 seconds per node.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status checklist */}
                  <div className="bg-slate-900/10 border border-slate-900 rounded-[24px] p-4 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>ANTIVIRUS RUNTIME</span>
                      <span className="text-emerald-400 font-mono uppercase font-black">Secure</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>CERTIFICATE ENFORCEMENT</span>
                      <span className="text-emerald-400 font-mono uppercase font-black">Enforced</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>INTELLIGENT SANDBOXING</span>
                      <span className="text-indigo-400 font-mono uppercase font-black">Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
