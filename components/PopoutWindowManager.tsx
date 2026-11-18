import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Minus, Square, ExternalLink, Move, MessageSquare, Brain, 
  Home, Grid, Zap, Sparkles, User, Layers, RefreshCw
} from 'lucide-react';
import {
  AppTab,
  AppMode,
  SocialSubTab,
  Post,
  UserProfile,
  ActiveSession,
  Task,
  AiActionDispatcher,
  FocusSessionRecord,
  DailyDebriefRecord
} from '../types';
import HomeView from './HomeView';
import ExploreView from './ExploreView';
import AIBrainView from './AIBrainView';
import ModesView from './ModesView';
import { CreatorView } from './CreatorView';
import ProfileView from './ProfileView';

export interface PoppedOutWindowConfig {
  id: string;
  tab: AppTab;
  subTab?: SocialSubTab;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

interface PopoutWindowManagerProps {
  windows: PoppedOutWindowConfig[];
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onFocus: (id: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateSize: (id: string, width: number, height: number) => void;
  onOpenStandalone: (tab: AppTab, subTab?: SocialSubTab) => void;
  
  // Shared view props
  showGlobalToast: (message: string, type?: 'info' | 'success' | 'alert') => void;
  currentMode: AppMode;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  posts: Post[];
  savedPostIds: Set<string>;
  purchasedPostIds: Set<string>;
  toggleSavePost: (id: string) => void;
  buyPost: (postId: string) => void;
  handleToggleLike: (id: string) => void;
  handleToggleFollow: (creatorName: string) => void;
  trackInteraction: (type: string, targetId: string) => void;
  activeSession: ActiveSession | null;
  setActiveSession: React.Dispatch<React.SetStateAction<ActiveSession | null>>;
  completeFocusSession: () => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  joinedGroupIds: string[];
  setJoinedGroupIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeSignalGroupId: string | null;
  setActiveSignalGroupId: React.Dispatch<React.SetStateAction<string | null>>;
  switchMode: (mode: AppMode) => void;
  addPost: (newPost: Post) => void;
  autonomousActivities: any[];
  ghostMessages: any[];
  setGhostMessages: React.Dispatch<React.SetStateAction<any[]>>;
  aiActionDispatcher?: AiActionDispatcher;
  focusSessions?: FocusSessionRecord[];
  dailyDebriefs?: DailyDebriefRecord[];
  externalFocusTrigger?: {
    taskId?: string;
    taskTitle: string;
    durationMinutes: number;
    mode?: 'focus' | 'grind';
    nonce: number;
  } | null;
  onClearExternalFocusTrigger?: () => void;
  onFocusSessionStart?: (session: {
    id: string;
    taskId?: string;
    taskTitle: string;
    mode: 'focus' | 'grind' | 'chill' | 'break';
    durationSeconds: number;
  }) => void;
  onFocusSessionComplete?: (sessionId: string, elapsedSeconds: number) => void;
  onFocusReflectionSave?: (sessionId: string, reflection: string) => void;
  followedUserIds?: string[];
  onToggleFollowUser?: (userId: string, userName: string, shouldFollow: boolean) => void;
  activeLayout?: 'Classic Cards' | 'Neural Wheel';
  onLayoutChange?: (layout: 'Classic Cards' | 'Neural Wheel') => void;
  followingCount?: number;
}

export const PopoutWindowManager: React.FC<PopoutWindowManagerProps> = ({
  windows,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onUpdatePosition,
  onUpdateSize,
  onOpenStandalone,
  showGlobalToast,
  currentMode,
  userProfile,
  setUserProfile,
  posts,
  savedPostIds,
  purchasedPostIds,
  toggleSavePost,
  buyPost,
  handleToggleLike,
  handleToggleFollow,
  trackInteraction,
  activeSession,
  setActiveSession,
  completeFocusSession,
  tasks,
  setTasks,
  joinedGroupIds,
  setJoinedGroupIds,
  activeSignalGroupId,
  setActiveSignalGroupId,
  switchMode,
  addPost,
  autonomousActivities,
  ghostMessages,
  setGhostMessages,
  aiActionDispatcher,
  focusSessions,
  dailyDebriefs,
  externalFocusTrigger,
  onClearExternalFocusTrigger,
  onFocusSessionStart,
  onFocusSessionComplete,
  onFocusReflectionSave,
  followedUserIds,
  onToggleFollowUser,
  activeLayout,
  onLayoutChange,
  followingCount,
}) => {
  const [resizingWindowId, setResizingWindowId] = useState<string | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });

  const getModuleIcon = (tab: AppTab, subTab?: SocialSubTab) => {
    if (tab === AppTab.EXPLORE && subTab === 'messages') return <MessageSquare size={14} className="text-emerald-400" />;
    switch (tab) {
      case AppTab.HOME: return <Home size={14} className="text-indigo-400" />;
      case AppTab.EXPLORE: return <Sparkles size={14} className="text-purple-400" />;
      case AppTab.BRAIN: return <Brain size={14} className="text-cyan-400" />;
      case AppTab.MODES: return <Zap size={14} className="text-yellow-400" />;
      case AppTab.CREATOR: return <Layers size={14} className="text-rose-400" />;
      case AppTab.PROFILE: return <User size={14} className="text-teal-400" />;
      default: return <Sparkles size={14} className="text-indigo-400" />;
    }
  };

  const handleStartResize = (e: React.MouseEvent, win: PoppedOutWindowConfig) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus(win.id);
    setResizingWindowId(win.id);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: win.width,
      height: win.height
    };
  };

  useEffect(() => {
    if (!resizingWindowId) return;

    const handlePointerMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      const newWidth = Math.max(360, resizeStartRef.current.width + dx);
      const newHeight = Math.max(300, resizeStartRef.current.height + dy);
      onUpdateSize(resizingWindowId, newWidth, newHeight);
    };

    const handlePointerUp = () => {
      setResizingWindowId(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [resizingWindowId, onUpdateSize]);

  const renderWindowContent = (win: PoppedOutWindowConfig) => {
    switch (win.tab) {
      case AppTab.HOME:
        return (
          <HomeView
            showToast={showGlobalToast}
            mode={currentMode}
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            onInteraction={trackInteraction}
            tasks={tasks}
            setTasks={setTasks}
            setActiveTab={() => {}}
            setActiveSubTab={() => {}}
            joinedGroupIds={joinedGroupIds}
            setJoinedGroupIds={setJoinedGroupIds}
            activeSignalGroupId={activeSignalGroupId}
            setActiveSignalGroupId={setActiveSignalGroupId}
            onModeChange={switchMode}
            externalFocusTrigger={externalFocusTrigger}
            onClearExternalFocusTrigger={onClearExternalFocusTrigger}
            onFocusSessionStart={onFocusSessionStart}
            onFocusSessionComplete={onFocusSessionComplete}
            onFocusReflectionSave={onFocusReflectionSave}
            followedUserIds={followedUserIds}
            onToggleFollowUser={onToggleFollowUser}
            onActiveSessionChange={(session) => {
              setActiveSession(session);
              if (session && session.type === 'focus' && currentMode === AppMode.NORMAL) {
                switchMode(AppMode.FOCUS);
              }
            }}
          />
        );
      case AppTab.EXPLORE:
        return (
          <ExploreView
            mode={currentMode}
            posts={posts}
            savedPostIds={savedPostIds}
            purchasedPostIds={purchasedPostIds}
            onToggleSave={toggleSavePost}
            onBuy={buyPost}
            onToggleLike={handleToggleLike}
            onToggleFollow={handleToggleFollow}
            onInteraction={trackInteraction}
            activeSession={activeSession}
            onActiveSessionChange={(session) => {
              setActiveSession(session);
              if (session && session.type === 'focus' && currentMode === AppMode.NORMAL) {
                switchMode(AppMode.FOCUS);
              }
            }}
            onCompleteSession={completeFocusSession}
            showToast={showGlobalToast}
            userProfile={userProfile}
            activeSubTab={win.subTab || 'circles'}
            setActiveSubTab={() => {}}
            joinedGroupIds={joinedGroupIds}
            setJoinedGroupIds={setJoinedGroupIds}
            activeSignalGroupId={activeSignalGroupId}
            setActiveSignalGroupId={setActiveSignalGroupId}
          />
        );
      case AppTab.BRAIN:
        return (
          <AIBrainView
            userProfile={userProfile}
            onInteraction={trackInteraction}
            tasks={tasks}
            autonomousActivities={autonomousActivities}
            mode={currentMode}
            ghostMessages={ghostMessages}
            setGhostMessages={setGhostMessages}
            aiActionDispatcher={aiActionDispatcher}
            focusSessions={focusSessions}
            dailyDebriefs={dailyDebriefs}
          />
        );
      case AppTab.MODES:
        return (
          <ModesView
            currentMode={currentMode}
            setMode={switchMode}
            activeLayout={activeLayout}
            onLayoutChange={onLayoutChange}
          />
        );
      case AppTab.CREATOR:
        return (
          <CreatorView
            showToast={showGlobalToast}
            mode={currentMode}
            userProfile={userProfile}
            onAddPost={addPost}
            onPublishSuccess={() => {}}
          />
        );
      case AppTab.PROFILE:
        return (
          <ProfileView
            savedPostIds={savedPostIds}
            purchasedPostIds={purchasedPostIds}
            allPosts={posts}
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            showToast={showGlobalToast}
            followingCount={followingCount}
          />
        );
      default:
        return null;
    }
  };

  const activeFloatingWindows = windows.filter((w) => !w.isMinimized);
  const minimizedWindows = windows.filter((w) => w.isMinimized);

  return (
    <>
      {/* Floating Draggable Windows Container */}
      <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
        <AnimatePresence>
          {activeFloatingWindows.map((win) => {
            const isMax = win.isMaximized;

            return (
              <motion.div
                key={win.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={() => onFocus(win.id)}
                style={{
                  zIndex: win.zIndex,
                  position: 'absolute',
                  left: isMax ? 0 : win.x,
                  top: isMax ? 0 : win.y,
                  width: isMax ? '100vw' : win.width,
                  height: isMax ? '100vh' : win.height,
                }}
                className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl backdrop-blur-2xl transition-shadow hover:border-indigo-500/50"
              >
                {/* Window Header Bar (Drag Handle) */}
                <div
                  onMouseDown={(e) => {
                    onFocus(win.id);
                    if (isMax) return;
                    const startX = e.clientX - win.x;
                    const startY = e.clientY - win.y;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const newX = Math.max(10, Math.min(window.innerWidth - 100, moveEvent.clientX - startX));
                      const newY = Math.max(10, Math.min(window.innerHeight - 60, moveEvent.clientY - startY));
                      onUpdatePosition(win.id, newX, newY);
                    };

                    const handleMouseUp = () => {
                      window.removeEventListener('mousemove', handleMouseMove);
                      window.removeEventListener('mouseup', handleMouseUp);
                    };

                    window.addEventListener('mousemove', handleMouseMove);
                    window.addEventListener('mouseup', handleMouseUp);
                  }}
                  className="flex h-10 shrink-0 cursor-move items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3.5 select-none"
                >
                  {/* Left: Module Title & Icon */}
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700/60">
                      {getModuleIcon(win.tab, win.subTab)}
                    </div>
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider font-outfit truncate">
                      {win.title}
                    </span>
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[8px] font-mono font-bold text-indigo-300">
                      Pop-Out Window
                    </span>
                  </div>

                  {/* Right: Window Controls */}
                  <div className="flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
                    {/* External Browser Window */}
                    <button
                      type="button"
                      onClick={() => onOpenStandalone(win.tab, win.subTab)}
                      className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                      title="Open in separate browser window"
                    >
                      <ExternalLink size={13} />
                    </button>

                    {/* Minimize */}
                    <button
                      type="button"
                      onClick={() => onMinimize(win.id)}
                      className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-400 rounded-lg transition-colors"
                      title="Minimize to Dock"
                    >
                      <Minus size={13} />
                    </button>

                    {/* Maximize / Restore */}
                    <button
                      type="button"
                      onClick={() => onMaximize(win.id)}
                      className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-indigo-400 rounded-lg transition-colors"
                      title={isMax ? 'Restore Window' : 'Maximize Window'}
                    >
                      <Square size={11} />
                    </button>

                    {/* Close */}
                    <button
                      type="button"
                      onClick={() => onClose(win.id)}
                      className="p-1.5 text-slate-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors"
                      title="Close Pop-Out Window"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Window Body Component Container */}
                <div className="relative flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
                  {renderWindowContent(win)}
                </div>

                {/* Resizable Corner Handle */}
                {!isMax && (
                  <div
                    onMouseDown={(e) => handleStartResize(e, win)}
                    className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                    title="Drag to resize window"
                  >
                    <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Minimized Windows Bottom Dock */}
      {minimizedWindows.length > 0 && (
        <div className="fixed bottom-20 right-6 z-[130] flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-2xl backdrop-blur-xl">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 font-mono flex items-center gap-1">
            <Layers size={12} className="text-indigo-400" /> Popped Out:
          </span>
          {minimizedWindows.map((win) => (
            <button
              key={win.id}
              onClick={() => onMinimize(win.id)} // Toggles minimized back to false
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-slate-300 hover:text-white text-[10px] font-bold transition-all shadow-md active:scale-95"
            >
              {getModuleIcon(win.tab, win.subTab)}
              <span>{win.title}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default PopoutWindowManager;
