import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  writeBatch,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  UserProfile,
  UserPublicProfile,
  UserPreferences,
  Task,
  FocusSessionRecord,
  DailyDebriefRecord,
  CreatorProjectRecord,
  Post,
  DiscussionRecord,
  ChatMessage,
  LegacyEntry,
  AppMode,
  SupportedLanguage,
  AiPendingAction
} from '../types';
import { firebaseStorageService } from './firebaseStorageService';

const VALID_LANGUAGES: SupportedLanguage[] = ['en', 'hi', 'gu', 'bn', 'mr', 'ta', 'te', 'kn', 'ml', 'pa'];
const VALID_MODES: AppMode[] = [AppMode.NORMAL, AppMode.FOCUS, AppMode.GRIND, AppMode.CHILL, AppMode.GHOST, AppMode.VIBE];

export function sanitizeFirestoreId(raw: string, fallbackPrefix = 'id'): string {
  const cleaned = String(raw || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
  return cleaned || `${fallbackPrefix}_${Date.now()}`;
}

function sanitizeLanguage(lang?: any): SupportedLanguage {
  return VALID_LANGUAGES.includes(lang) ? lang : 'en';
}

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      out[k] = v.filter((item) => item !== undefined);
    } else if (v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
      out[k] = stripUndefined(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function clampInt(val: any, min = 0, fallback = min): number {
  const n = Math.round(Number(val));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, n);
}

function sanitizeStringList(list: any, maxItems: number): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.slice(0, 300))
    .slice(0, maxItems);
}

function buildDefaultMilestones() {
  return [
    { id: 'm1', title: 'Achieve your first high-intensity Focus Target', completed: false, category: 'Focus' },
    { id: 'm2', title: 'Maintain a 5-day cognitive routine stream', completed: false, category: 'Streak' },
    { id: 'm3', title: 'Configure AI custom context parameters in Brain', completed: false, category: 'AI Brain' }
  ];
}

export function buildDefaultUserProfile(uid: string): UserProfile {
  const defaultUsername = `user_${uid.slice(0, 8)}`;

  return {
    userId: uid,
    name: '',
    username: defaultUsername,
    email: '',
    bio: '',
    avatar: 'https://i.pravatar.cc/300?u=neural_new',
    profileBanner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    interests: [],
    goals: [],
    interactions: [],
    customMilestones: buildDefaultMilestones(),
    unlockedAchievements: [],
    xp: 0,
    level: 1,
    streak: 0,
    sessionsCompleted: 0,
    onboardingCompleted: false,
    language: 'en',
    lastActiveDate: '',
    activeStreak: null,
    memory: {
      patterns: [],
      effectivenessScore: {}
    }
  };
}

function serializeUserProfileForFirestore(
  uid: string,
  profile: Partial<UserProfile>
): Record<string, any> {
  const safeAvatar =
    typeof profile.avatar === 'string' && !profile.avatar.startsWith('data:')
      ? profile.avatar.slice(0, 2048)
      : 'https://i.pravatar.cc/300?u=neural_new';
  const safeBanner =
    typeof profile.profileBanner === 'string' && !profile.profileBanner.startsWith('data:')
      ? profile.profileBanner.slice(0, 2048)
      : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop';

  return stripUndefined({
    userId: uid,
    name: String(profile.name ?? '').slice(0, 100),
    username: String(profile.username ?? `user_${uid.slice(0, 8)}`).slice(0, 64),
    email: profile.email !== undefined ? String(profile.email).slice(0, 200) : '',
    bio: profile.bio !== undefined ? String(profile.bio).slice(0, 1000) : '',
    avatar: safeAvatar,
    profileBanner: safeBanner,
    interests: sanitizeStringList(profile.interests, 30),
    goals: sanitizeStringList(profile.goals, 20),
    customMilestones: Array.isArray(profile.customMilestones)
      ? profile.customMilestones.slice(0, 50)
      : buildDefaultMilestones(),
    unlockedAchievements: sanitizeStringList(profile.unlockedAchievements, 30),
    xp: clampInt(profile.xp, 0, 0),
    level: clampInt(profile.level, 1, 1),
    streak: clampInt(profile.streak, 0, 0),
    sessionsCompleted: clampInt(profile.sessionsCompleted, 0, 0),
    onboardingCompleted: Boolean(profile.onboardingCompleted),
    language: sanitizeLanguage(profile.language),
    lastActiveDate: profile.lastActiveDate ? String(profile.lastActiveDate).slice(0, 64) : '',
    activeStreak: profile.activeStreak ?? null,
    memory: profile.memory || { patterns: [], effectivenessScore: {} },
    journeyEngine: profile.journeyEngine ?? null,
    momentumRescue: profile.momentumRescue ?? null,
    migrationCompletedAt:
      typeof profile.migrationCompletedAt === 'number'
        ? Math.round(profile.migrationCompletedAt)
        : null
  });
}

function buildPublicProfilePayload(uid: string, profile: Partial<UserProfile>): Record<string, any> {
  const safeAvatar =
    typeof profile.avatar === 'string' && !profile.avatar.startsWith('data:')
      ? profile.avatar.slice(0, 2048)
      : 'https://i.pravatar.cc/300?u=neural_new';
  const safeBanner =
    typeof profile.profileBanner === 'string' && !profile.profileBanner.startsWith('data:')
      ? profile.profileBanner.slice(0, 2048)
      : '';

  return {
    userId: uid,
    name: String(profile.name || 'Nexoran').slice(0, 100),
    username: String(profile.username || `user_${uid.slice(0, 8)}`).slice(0, 64),
    bio: String(profile.bio || '').slice(0, 500),
    avatar: safeAvatar,
    profileBanner: safeBanner,
    interests: sanitizeStringList(profile.interests, 30),
    xp: clampInt(profile.xp, 0, 0),
    level: clampInt(profile.level, 1, 1),
    streak: clampInt(profile.streak, 0, 0),
    sessionsCompleted: clampInt(profile.sessionsCompleted, 0, 0),
    isPublic: true
  };
}

function serializeTaskForFirestore(uid: string, task: Task): { taskId: string; data: Record<string, any> } {
  const taskId = sanitizeFirestoreId(task.id, 'task');
  const payload: Record<string, any> = {
    id: taskId,
    userId: uid,
    title: String(task.title || 'Untitled Task').trim().slice(0, 300) || 'Untitled Task',
    category: String(task.category || 'Focus').trim().slice(0, 50) || 'Focus',
    completed: Boolean(task.completed),
    timeEstimate: String(task.timeEstimate || '25m').trim().slice(0, 40) || '25m'
  };

  if (task.priority === 'low' || task.priority === 'medium' || task.priority === 'high') {
    payload.priority = task.priority;
  }
  if (typeof task.isAutoGenerated === 'boolean') payload.isAutoGenerated = task.isAutoGenerated;
  if (typeof task.isBonus === 'boolean') payload.isBonus = task.isBonus;
  if (typeof task.xpReward === 'number') payload.xpReward = clampInt(task.xpReward, 0);
  if (typeof task.badgeProgress === 'number') payload.badgeProgress = clampInt(task.badgeProgress, 0);
  if (typeof task.rankProgress === 'number') payload.rankProgress = clampInt(task.rankProgress, 0);
  if (typeof task.momentumProgress === 'number') payload.momentumProgress = clampInt(task.momentumProgress, 0);
  if (typeof task.scheduledFor === 'string' && task.scheduledFor) payload.scheduledFor = task.scheduledFor.slice(0, 64);
  if (typeof task.scheduledTime === 'string' && task.scheduledTime) payload.scheduledTime = task.scheduledTime.slice(0, 32);
  if (typeof task.notes === 'string' && task.notes) payload.notes = task.notes.slice(0, 1000);
  if (typeof task.reminderAt === 'number') payload.reminderAt = Math.round(task.reminderAt);
  if (typeof task.completedAt === 'number') payload.completedAt = Math.round(task.completedAt);

  return { taskId, data: payload };
}

function toEpochMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val?.toMillis === 'function') return val.toMillis();
  if (typeof val?.seconds === 'number') return val.seconds * 1000;
  return 0;
}

const LEGACY_STORAGE_KEYS = [
  'nexora_user_profile',
  'nexora_tasks',
  'nexora_current_mode',
  'nexora_active_session',
  'nexora_joined_groups',
  'nexora_popped_windows',
  'nexora_language',
  'nexora_brain_chat_sessions',
  'nexora_brain_chat_history',
  'nexora_brain_active_session_id',
  'nexora_ai_image_history',
  'nexora_active_layout',
  'nexora_followed_users'
];

const migrationInFlight = new Map<string, Promise<UserProfile>>();

export const nexoraFirestoreService = {
  // =========================================================================
  // 1. One-Time Per-User Migration
  // =========================================================================
  async migrateLocalDataIfNeeded(uid: string): Promise<UserProfile> {
    const existingPromise = migrationInFlight.get(uid);
    if (existingPromise) return existingPromise;

    const task = (async (): Promise<UserProfile> => {
    const userPath = `users/${uid}`;
    const userRef = doc(db, 'users', uid);
    const localMigFlag = `nexora_migrated_${uid}`;

    try {
      const existingSnap = await getDoc(userRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as any;
        if (existingData.migrationCompletedAt) {
          return {
            ...buildDefaultUserProfile(uid),
            ...existingData,
            interactions: []
          };
        }

        // User doc exists without migrationCompletedAt; stamp migration without overwriting Firestore data
        if (!localStorage.getItem(localMigFlag)) {
          await updateDoc(userRef, {
            migrationCompletedAt: Date.now(),
            updatedAt: serverTimestamp()
          });
          localStorage.setItem(localMigFlag, 'true');
        }
        return {
          ...buildDefaultUserProfile(uid),
          ...existingData,
          interactions: []
        };
      }

      // First run on Firestore: inspect legacy localStorage (only if not migrated)
      const defaults = buildDefaultUserProfile(uid);
      let migratedProfile: UserProfile = { ...defaults };

      try {
        const rawProfileStr = localStorage.getItem('nexora_user_profile');
        if (rawProfileStr) {
          const parsed = JSON.parse(rawProfileStr);
          if (parsed && typeof parsed === 'object' && (!parsed.userId || parsed.userId === uid || parsed.userId === 'user_local' || String(parsed.userId).startsWith('user_'))) {
            migratedProfile = {
              ...defaults,
              ...parsed,
              userId: uid,
              email: parsed.email || '',
              interactions: []
            };
          }
        }
      } catch {}

      const storedLang = localStorage.getItem('nexora_language');
      if (storedLang) {
        migratedProfile.language = sanitizeLanguage(storedLang);
      }

      // Upload data:image avatars or banners to Storage if present
      if (migratedProfile.avatar?.startsWith('data:image/')) {
        try {
          migratedProfile.avatar = await firebaseStorageService.uploadDataUrl(uid, 'avatars', migratedProfile.avatar, 'migrated_avatar');
        } catch {
          migratedProfile.avatar = defaults.avatar;
        }
      }
      if (migratedProfile.profileBanner?.startsWith('data:image/')) {
        try {
          migratedProfile.profileBanner = await firebaseStorageService.uploadDataUrl(uid, 'banners', migratedProfile.profileBanner, 'migrated_banner');
        } catch {
          migratedProfile.profileBanner = defaults.profileBanner;
        }
      }

      migratedProfile.migrationCompletedAt = Date.now();

      const serialized = serializeUserProfileForFirestore(uid, migratedProfile);
      try {
        await setDoc(userRef, {
          ...serialized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (createErr) {
        // Handle cross-tab concurrent creation race gracefully
        const raceSnap = await getDoc(userRef);
        if (raceSnap.exists()) {
          localStorage.setItem(localMigFlag, 'true');
          return {
            ...buildDefaultUserProfile(uid),
            ...(raceSnap.data() as any),
            interactions: []
          };
        }
        throw createErr;
      }

      if (migratedProfile.onboardingCompleted) {
        await this.syncPublicProfile(uid, migratedProfile);
      }

      // Migrate preferences
      let layout: 'Classic Cards' | 'Neural Wheel' = 'Classic Cards';
      try {
        const savedLayout = localStorage.getItem('nexora_active_layout');
        if (savedLayout === 'Neural Wheel') layout = 'Neural Wheel';
      } catch {}

      let mode: AppMode = AppMode.NORMAL;
      try {
        const savedMode = localStorage.getItem('nexora_current_mode') as AppMode;
        if (savedMode && VALID_MODES.includes(savedMode) && savedMode !== AppMode.GHOST) {
          mode = savedMode;
        }
      } catch {}

      let joinedGroupIds: string[] = [];
      try {
        joinedGroupIds = sanitizeStringList(JSON.parse(localStorage.getItem('nexora_joined_groups') || '[]'), 50);
      } catch {}

      await this.saveUserPreferences(uid, {
        userId: uid,
        language: sanitizeLanguage(migratedProfile.language),
        layout,
        currentMode: mode,
        joinedGroupIds,
        poppedWindows: [],
        autonomousActions: [],
        notificationsEnabled: true
      });

      // Migrate tasks
      try {
        const savedTasks = JSON.parse(localStorage.getItem('nexora_tasks') || '[]');
        if (Array.isArray(savedTasks) && savedTasks.length > 0) {
          await this.createTasksBatch(uid, savedTasks.slice(0, 60));
        }
      } catch {}

      // Migrate Brain sessions
      try {
        const rawSessions = JSON.parse(localStorage.getItem('nexora_brain_chat_sessions') || '[]');
        if (Array.isArray(rawSessions) && rawSessions.length > 0) {
          for (const sess of rawSessions.slice(0, 15)) {
            const convId = sanitizeFirestoreId(sess.id || `conv_${Date.now()}`, 'conv');
            const msgs: ChatMessage[] = Array.isArray(sess.messages) ? sess.messages : [];
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            await this.saveBrainConversation(uid, {
              id: convId,
              title: String(sess.title || 'Neural Thread').slice(0, 200),
              spaceId: String(sess.spaceId || 'general').slice(0, 64),
              messageCount: msgs.length,
              lastMessagePreview: lastMsg?.text ? String(lastMsg.text).slice(0, 400) : ''
            });
            for (let i = 0; i < Math.min(msgs.length, 40); i++) {
              const m = msgs[i];
              if (!m || !m.text) continue;
              const msgId = sanitizeFirestoreId(m.id || `msg_${convId}_${i}_${Date.now()}`, 'msg');
              await this.addBrainMessage(uid, convId, {
                id: msgId,
                role: m.role === 'user' ? 'user' : 'model',
                text: String(m.text),
                timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now()
              });
            }
          }
        } else {
          const legacyHistory = JSON.parse(localStorage.getItem('nexora_brain_chat_history') || '[]');
          if (Array.isArray(legacyHistory) && legacyHistory.length > 0) {
            const convId = 'conv_migrated_main';
            await this.saveBrainConversation(uid, {
              id: convId,
              title: 'Migrated Neural History',
              spaceId: 'general',
              messageCount: legacyHistory.length,
              lastMessagePreview: String(legacyHistory[legacyHistory.length - 1]?.text || '').slice(0, 400)
            });
            for (let i = 0; i < Math.min(legacyHistory.length, 40); i++) {
              const m = legacyHistory[i];
              if (!m || !m.text) continue;
              await this.addBrainMessage(uid, convId, {
                id: `msg_mig_${i}_${Date.now()}`,
                role: m.role === 'user' ? 'user' : 'model',
                text: String(m.text),
                timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now()
              });
            }
          }
        }
      } catch {}

      // Migrate AI Creator history (uploading base64 images if needed)
      try {
        const rawImgs = JSON.parse(localStorage.getItem('nexora_ai_image_history') || '[]');
        if (Array.isArray(rawImgs) && rawImgs.length > 0) {
          for (let i = 0; i < Math.min(rawImgs.length, 8); i++) {
            const imgUrl = rawImgs[i];
            if (typeof imgUrl !== 'string' || !imgUrl) continue;
            let finalUrl = imgUrl;
            if (imgUrl.startsWith('data:image/')) {
              try {
                finalUrl = await firebaseStorageService.uploadDataUrl(uid, 'creator', imgUrl, `mig_creator_${i}`);
              } catch {
                continue;
              }
            }
            if (finalUrl.length <= 2048) {
              await this.saveCreatorProject(uid, {
                id: sanitizeFirestoreId(`creator_mig_${i}_${Date.now()}`, 'creator'),
                userId: uid,
                type: 'image',
                imageUrl: finalUrl,
                prompt: 'Migrated Studio Creation'
              });
            }
          }
        }
      } catch {}

      // Clear migrated keys and set local flag
      localStorage.setItem(localMigFlag, 'true');
      for (const k of LEGACY_STORAGE_KEYS) {
        try {
          localStorage.removeItem(k);
        } catch {}
      }

      return migratedProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
    })();

    migrationInFlight.set(uid, task);
    try {
      return await task;
    } finally {
      migrationInFlight.delete(uid);
    }
  },

  // =========================================================================
  // 2. User Profile & Public Profile
  // =========================================================================
  subscribeUserProfile(
    uid: string,
    onData: (profile: UserProfile | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `users/${uid}`;
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) {
          onData(null);
          return;
        }
        const data = snap.data() as any;
        onData({
          ...buildDefaultUserProfile(uid),
          ...data,
          userId: uid,
          interactions: []
        });
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.GET, path);
      }
    );
  },

  async saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
    const path = `users/${uid}`;
    const ref = doc(db, 'users', uid);
    try {
      const payload = serializeUserProfileForFirestore(uid, profile);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Never overwrite userId or createdAt on update
        const { userId: _u, migrationCompletedAt: _m, ...updatable } = payload;
        await updateDoc(ref, {
          ...updatable,
          updatedAt: serverTimestamp()
        });
      }

      if (profile.onboardingCompleted) {
        await this.syncPublicProfile(uid, profile);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async syncPublicProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
    const path = `public_profiles/${uid}`;
    const ref = doc(db, 'public_profiles', uid);
    try {
      const payload = buildPublicProfilePayload(uid, profile);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        const { userId: _u, isPublic: _p, ...updatable } = payload;
        await updateDoc(ref, {
          ...updatable,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  subscribePublicProfiles(
    onData: (profiles: UserPublicProfile[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = 'public_profiles';
    const q = query(collection(db, 'public_profiles'), where('isPublic', '==', true), limit(50));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as UserPublicProfile);
        list.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  // =========================================================================
  // 3. Preferences
  // =========================================================================
  subscribeUserPreferences(
    uid: string,
    onData: (prefs: UserPreferences | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `users/${uid}/preferences/default`;
    return onSnapshot(
      doc(db, 'users', uid, 'preferences', 'default'),
      (snap) => {
        onData(snap.exists() ? (snap.data() as UserPreferences) : null);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.GET, path);
      }
    );
  },

  async saveUserPreferences(uid: string, prefs: Partial<UserPreferences>): Promise<void> {
    const path = `users/${uid}/preferences/default`;
    const ref = doc(db, 'users', uid, 'preferences', 'default');
    try {
      const snap = await getDoc(ref);
      const safeMode: AppMode =
        prefs.currentMode && VALID_MODES.includes(prefs.currentMode) && prefs.currentMode !== AppMode.GHOST
          ? prefs.currentMode
          : AppMode.NORMAL;
      const safeLayout = prefs.layout === 'Neural Wheel' ? 'Neural Wheel' : 'Classic Cards';

      if (!snap.exists()) {
        await setDoc(ref, {
          userId: uid,
          language: sanitizeLanguage(prefs.language),
          layout: safeLayout,
          currentMode: safeMode,
          joinedGroupIds: sanitizeStringList(prefs.joinedGroupIds || [], 50),
          poppedWindows: Array.isArray(prefs.poppedWindows) ? prefs.poppedWindows.slice(0, 10) : [],
          autonomousActions: sanitizeStringList(prefs.autonomousActions || [], 100),
          notificationsEnabled: prefs.notificationsEnabled ?? true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        const updates: Record<string, any> = { updatedAt: serverTimestamp() };
        if (prefs.language !== undefined) updates.language = sanitizeLanguage(prefs.language);
        if (prefs.layout !== undefined) updates.layout = safeLayout;
        if (prefs.currentMode !== undefined) updates.currentMode = safeMode;
        if (prefs.joinedGroupIds !== undefined) updates.joinedGroupIds = sanitizeStringList(prefs.joinedGroupIds, 50);
        if (prefs.poppedWindows !== undefined) updates.poppedWindows = Array.isArray(prefs.poppedWindows) ? prefs.poppedWindows.slice(0, 10) : [];
        if (prefs.autonomousActions !== undefined) updates.autonomousActions = sanitizeStringList(prefs.autonomousActions, 100);
        if (prefs.notificationsEnabled !== undefined) updates.notificationsEnabled = Boolean(prefs.notificationsEnabled);
        await updateDoc(ref, updates);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // =========================================================================
  // 4. Tasks CRUD
  // =========================================================================
  subscribeTasks(
    uid: string,
    onData: (tasks: Task[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `users/${uid}/tasks`;
    const q = query(collection(db, 'users', uid, 'tasks'), where('userId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Task));
        list.sort((a, b) => toEpochMs(a.createdAt) - toEpochMs(b.createdAt));
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async createTask(uid: string, task: Task): Promise<Task> {
    const { taskId, data } = serializeTaskForFirestore(uid, task);
    const path = `users/${uid}/tasks/${taskId}`;
    try {
      await setDoc(doc(db, 'users', uid, 'tasks', taskId), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { ...task, id: taskId, userId: uid };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async createTasksBatch(uid: string, tasksList: Task[]): Promise<Task[]> {
    if (tasksList.length === 0) return [];
    const path = `users/${uid}/tasks`;
    try {
      const results: Task[] = [];
      for (let i = 0; i < tasksList.length; i += 400) {
        const chunk = tasksList.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const t of chunk) {
          const { taskId, data } = serializeTaskForFirestore(uid, t);
          batch.set(doc(db, 'users', uid, 'tasks', taskId), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          results.push({ ...t, id: taskId, userId: uid });
        }
        await batch.commit();
      }
      return results;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateTask(uid: string, taskId: string, updates: Partial<Task>): Promise<void> {
    const safeId = sanitizeFirestoreId(taskId, 'task');
    const path = `users/${uid}/tasks/${safeId}`;
    try {
      const allowed: Record<string, any> = { updatedAt: serverTimestamp() };
      if (updates.title !== undefined) allowed.title = String(updates.title).trim().slice(0, 300) || 'Untitled Task';
      if (updates.category !== undefined) allowed.category = String(updates.category).trim().slice(0, 50) || 'Focus';
      if (updates.completed !== undefined) allowed.completed = Boolean(updates.completed);
      if (updates.timeEstimate !== undefined) allowed.timeEstimate = String(updates.timeEstimate).trim().slice(0, 40) || '25m';
      if (updates.priority !== undefined) allowed.priority = updates.priority;
      if (updates.scheduledFor !== undefined) allowed.scheduledFor = updates.scheduledFor ? String(updates.scheduledFor).slice(0, 64) : null;
      if (updates.scheduledTime !== undefined) allowed.scheduledTime = updates.scheduledTime ? String(updates.scheduledTime).slice(0, 32) : null;
      if (updates.notes !== undefined) allowed.notes = updates.notes ? String(updates.notes).slice(0, 1000) : null;
      if (updates.reminderAt !== undefined) allowed.reminderAt = typeof updates.reminderAt === 'number' ? Math.round(updates.reminderAt) : null;
      if (updates.completedAt !== undefined) allowed.completedAt = typeof updates.completedAt === 'number' ? Math.round(updates.completedAt) : null;

      await updateDoc(doc(db, 'users', uid, 'tasks', safeId), allowed);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteTask(uid: string, taskId: string): Promise<void> {
    const safeId = sanitizeFirestoreId(taskId, 'task');
    const path = `users/${uid}/tasks/${safeId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'tasks', safeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // =========================================================================
  // 5. Focus Sessions
  // =========================================================================
  subscribeFocusSessions(
    uid: string,
    onData: (sessions: FocusSessionRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `users/${uid}/focusSessions`;
    const q = query(collection(db, 'users', uid, 'focusSessions'), where('userId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as FocusSessionRecord));
        list.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async createFocusSession(uid: string, session: FocusSessionRecord): Promise<FocusSessionRecord> {
    const sessionId = sanitizeFirestoreId(session.id || `fs_${Date.now()}`, 'fs');
    const path = `users/${uid}/focusSessions/${sessionId}`;
    try {
      const payload = stripUndefined({
        id: sessionId,
        userId: uid,
        taskId: session.taskId ? String(session.taskId).slice(0, 128) : undefined,
        taskTitle: session.taskTitle ? String(session.taskTitle).slice(0, 300) : undefined,
        mode: ['focus', 'grind', 'chill', 'break'].includes(session.mode) ? session.mode : 'focus',
        durationSeconds: Math.min(86400, clampInt(session.durationSeconds, 0, 1500)),
        elapsedSeconds: Math.min(86400, clampInt(session.elapsedSeconds, 0, 0)),
        status: ['active', 'paused', 'completed', 'abandoned'].includes(session.status) ? session.status : 'active',
        reflection: session.reflection ? String(session.reflection).slice(0, 2000) : undefined,
        xpAwarded: session.xpAwarded !== undefined ? clampInt(session.xpAwarded, 0) : undefined,
        startedAt: clampInt(session.startedAt, 0, Date.now()),
        endedAt: session.endedAt !== undefined ? clampInt(session.endedAt, 0) : undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'users', uid, 'focusSessions', sessionId), payload);
      return { ...session, id: sessionId, userId: uid };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateFocusSession(
    uid: string,
    sessionId: string,
    updates: Partial<FocusSessionRecord>
  ): Promise<void> {
    const safeId = sanitizeFirestoreId(sessionId, 'fs');
    const path = `users/${uid}/focusSessions/${safeId}`;
    const ref = doc(db, 'users', uid, 'focusSessions', safeId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const existing = snap.data() as any;

      if (existing.status === 'completed') {
        // Terminal state lock: only reflection & updatedAt can change
        if (updates.reflection !== undefined) {
          await updateDoc(ref, {
            reflection: String(updates.reflection).slice(0, 2000),
            updatedAt: serverTimestamp()
          });
        }
        return;
      }

      const payload: Record<string, any> = { updatedAt: serverTimestamp() };
      if (updates.status && ['active', 'paused', 'completed', 'abandoned'].includes(updates.status)) {
        payload.status = updates.status;
      }
      if (updates.elapsedSeconds !== undefined) {
        payload.elapsedSeconds = Math.min(86400, clampInt(updates.elapsedSeconds, 0));
      }
      if (updates.endedAt !== undefined) {
        payload.endedAt = clampInt(updates.endedAt, 0);
      }
      if (updates.xpAwarded !== undefined) {
        payload.xpAwarded = clampInt(updates.xpAwarded, 0);
      }
      if (updates.reflection !== undefined) {
        payload.reflection = String(updates.reflection).slice(0, 2000);
      }
      await updateDoc(ref, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // =========================================================================
  // 6. Daily Plans & Debriefs
  // =========================================================================
  async saveDailyPlan(
    uid: string,
    plan: { id?: string; dateKey: string; missionTitle: string; taskIds?: string[]; notes?: string }
  ): Promise<void> {
    const planId = sanitizeFirestoreId(plan.id || `plan_${plan.dateKey}`, 'plan');
    const path = `users/${uid}/dailyPlans/${planId}`;
    const ref = doc(db, 'users', uid, 'dailyPlans', planId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, stripUndefined({
          id: planId,
          userId: uid,
          dateKey: String(plan.dateKey).slice(0, 32),
          missionTitle: String(plan.missionTitle).slice(0, 300) || 'Next Day Mission',
          taskIds: sanitizeStringList(plan.taskIds, 50),
          notes: plan.notes ? String(plan.notes).slice(0, 2000) : undefined,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      } else {
        await updateDoc(ref, stripUndefined({
          missionTitle: String(plan.missionTitle).slice(0, 300) || 'Next Day Mission',
          taskIds: plan.taskIds ? sanitizeStringList(plan.taskIds, 50) : undefined,
          notes: plan.notes !== undefined ? String(plan.notes).slice(0, 2000) : undefined,
          updatedAt: serverTimestamp()
        }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  subscribeDailyDebriefs(
    uid: string,
    onData: (debriefs: DailyDebriefRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `users/${uid}/dailyDebriefs`;
    const q = query(collection(db, 'users', uid, 'dailyDebriefs'), where('userId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as DailyDebriefRecord));
        list.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async saveDailyDebrief(
    uid: string,
    debrief: Omit<DailyDebriefRecord, 'id' | 'userId'> & { id?: string; userId?: string }
  ): Promise<void> {
    const debriefId = sanitizeFirestoreId(debrief.id || `debrief_${debrief.dateKey}`, 'debrief');
    const path = `users/${uid}/dailyDebriefs/${debriefId}`;
    const ref = doc(db, 'users', uid, 'dailyDebriefs', debriefId);
    try {
      const base = stripUndefined({
        completedTasksCount: clampInt(debrief.completedTasksCount, 0),
        totalTasksCount: clampInt(debrief.totalTasksCount, 0),
        focusScore: Math.min(100, clampInt(debrief.focusScore, 0)),
        deepWorkMinutes: clampInt(debrief.deepWorkMinutes, 0),
        xpEarned: clampInt(debrief.xpEarned, 0),
        biggestWin: String(debrief.biggestWin || '').slice(0, 1000),
        needsAttention: String(debrief.needsAttention || '').slice(0, 1000),
        oneLesson: String(debrief.oneLesson || '').slice(0, 1000),
        tomorrowMission: debrief.tomorrowMission ? String(debrief.tomorrowMission).slice(0, 300) : undefined
      });
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: debriefId,
          userId: uid,
          dateKey: String(debrief.dateKey).slice(0, 32),
          ...base,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(ref, {
          ...base,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // =========================================================================
  // 7. AI Brain Conversations, Messages & Action Logs
  // =========================================================================
  subscribeBrainConversations(
    uid: string,
    onData: (convs: Array<{
      id: string;
      userId: string;
      title: string;
      spaceId: string;
      messageCount?: number;
      lastMessagePreview?: string;
      pendingAction?: AiPendingAction | null;
      createdAt?: any;
      updatedAt?: any;
    }>) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `users/${uid}/conversations`;
    const q = query(collection(db, 'users', uid, 'conversations'), where('userId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => toEpochMs(b.updatedAt) - toEpochMs(a.updatedAt));
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async saveBrainConversation(
    uid: string,
    conv: {
      id: string;
      title: string;
      spaceId: string;
      messageCount?: number;
      lastMessagePreview?: string;
      pendingAction?: AiPendingAction | null;
    }
  ): Promise<string> {
    const convId = sanitizeFirestoreId(conv.id, 'conv');
    const path = `users/${uid}/conversations/${convId}`;
    const ref = doc(db, 'users', uid, 'conversations', convId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, stripUndefined({
          id: convId,
          userId: uid,
          title: String(conv.title || 'New Chat').slice(0, 200) || 'New Chat',
          spaceId: String(conv.spaceId || 'general').slice(0, 64) || 'general',
          messageCount: clampInt(conv.messageCount ?? 0, 0),
          lastMessagePreview: String(conv.lastMessagePreview || '').slice(0, 400),
          pendingAction: conv.pendingAction ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      } else {
        const updates: Record<string, any> = { updatedAt: serverTimestamp() };
        if (conv.title !== undefined) updates.title = String(conv.title || 'New Chat').slice(0, 200);
        if (conv.messageCount !== undefined) updates.messageCount = clampInt(conv.messageCount, 0);
        if (conv.lastMessagePreview !== undefined) updates.lastMessagePreview = String(conv.lastMessagePreview).slice(0, 400);
        if (conv.pendingAction !== undefined) updates.pendingAction = conv.pendingAction;
        await updateDoc(ref, updates);
      }
      return convId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteBrainConversation(uid: string, convId: string): Promise<void> {
    const safeId = sanitizeFirestoreId(convId, 'conv');
    const path = `users/${uid}/conversations/${safeId}`;
    try {
      const msgsSnap = await getDocs(
        query(collection(db, 'users', uid, 'conversations', safeId, 'messages'), where('userId', '==', uid))
      );
      const batch = writeBatch(db);
      msgsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'users', uid, 'conversations', safeId));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  subscribeBrainMessages(
    uid: string,
    convId: string,
    onData: (messages: ChatMessage[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const safeId = sanitizeFirestoreId(convId, 'conv');
    const path = `users/${uid}/conversations/${safeId}/messages`;
    const q = query(
      collection(db, 'users', uid, 'conversations', safeId, 'messages'),
      where('userId', '==', uid)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            role: data.role,
            text: data.text,
            timestamp: data.timestamp,
            actionResult: data.actionResult ?? undefined
          } as ChatMessage;
        });
        list.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async addBrainMessage(uid: string, convId: string, message: ChatMessage): Promise<string> {
    const safeConvId = sanitizeFirestoreId(convId, 'conv');
    const msgId = sanitizeFirestoreId(message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, 'msg');
    const path = `users/${uid}/conversations/${safeConvId}/messages/${msgId}`;
    try {
      await setDoc(doc(db, 'users', uid, 'conversations', safeConvId, 'messages', msgId), stripUndefined({
        id: msgId,
        userId: uid,
        convId: safeConvId,
        role: message.role === 'user' ? 'user' : 'model',
        text: String(message.text || '').slice(0, 16000),
        timestamp: typeof message.timestamp === 'number' ? Math.round(message.timestamp) : Date.now(),
        actionResult: message.actionResult ?? null,
        createdAt: serverTimestamp()
      }));
      return msgId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async hasExecutedActionLog(uid: string, idempotencyKey: string): Promise<boolean> {
    const logId = sanitizeFirestoreId(idempotencyKey, 'act');
    const path = `users/${uid}/actionLogs/${logId}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'actionLogs', logId));
      return snap.exists() && snap.data()?.status === 'executed';
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async logAiAction(
    uid: string,
    idempotencyKey: string,
    entry: {
      actionType: string;
      summary: string;
      status: 'executed' | 'cancelled' | 'failed';
      targetIds?: string[];
    }
  ): Promise<void> {
    const logId = sanitizeFirestoreId(idempotencyKey, 'act');
    const path = `users/${uid}/actionLogs/${logId}`;
    try {
      const existing = await getDoc(doc(db, 'users', uid, 'actionLogs', logId));
      if (existing.exists()) return; // Append-only rule compliance
      await setDoc(doc(db, 'users', uid, 'actionLogs', logId), {
        id: logId,
        userId: uid,
        actionType: String(entry.actionType).slice(0, 64),
        summary: String(entry.summary).slice(0, 500),
        status: entry.status,
        targetIds: sanitizeStringList(entry.targetIds || [], 30),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // =========================================================================
  // 8. Creator Studio Projects
  // =========================================================================
  subscribeCreatorProjects(
    uid: string,
    onData: (projects: CreatorProjectRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `users/${uid}/creatorProjects`;
    const q = query(collection(db, 'users', uid, 'creatorProjects'), where('userId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CreatorProjectRecord));
        list.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async saveCreatorProject(uid: string, project: CreatorProjectRecord): Promise<CreatorProjectRecord> {
    const projectId = sanitizeFirestoreId(project.id || `proj_${Date.now()}`, 'proj');
    const path = `users/${uid}/creatorProjects/${projectId}`;
    try {
      let imageUrl = project.imageUrl;
      if (imageUrl && imageUrl.startsWith('data:image/')) {
        imageUrl = await firebaseStorageService.uploadDataUrl(uid, 'creator', imageUrl, projectId);
      }
      const payload = stripUndefined({
        id: projectId,
        userId: uid,
        type: project.type === 'text' ? 'text' : 'image',
        prompt: project.prompt ? String(project.prompt).slice(0, 2000) : undefined,
        stylePreset: project.stylePreset ? String(project.stylePreset).slice(0, 64) : undefined,
        aspectRatio: project.aspectRatio,
        greenScreen: typeof project.greenScreen === 'boolean' ? project.greenScreen : undefined,
        imageUrl: imageUrl ? String(imageUrl).slice(0, 2048) : undefined,
        textContent: project.textContent ? String(project.textContent).slice(0, 8000) : undefined,
        gradientClass: project.gradientClass ? String(project.gradientClass).slice(0, 300) : undefined,
        publishedPostId: project.publishedPostId ? String(project.publishedPostId).slice(0, 128) : undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'users', uid, 'creatorProjects', projectId), payload);
      return { ...project, id: projectId, userId: uid, imageUrl };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateCreatorProject(
    uid: string,
    projectId: string,
    updates: Partial<CreatorProjectRecord>
  ): Promise<void> {
    const safeId = sanitizeFirestoreId(projectId, 'proj');
    const path = `users/${uid}/creatorProjects/${safeId}`;
    try {
      const payload: Record<string, any> = { updatedAt: serverTimestamp() };
      if (updates.publishedPostId !== undefined) payload.publishedPostId = String(updates.publishedPostId).slice(0, 128);
      if (updates.imageUrl !== undefined) payload.imageUrl = String(updates.imageUrl).slice(0, 2048);
      if (updates.textContent !== undefined) payload.textContent = String(updates.textContent).slice(0, 8000);
      await updateDoc(doc(db, 'users', uid, 'creatorProjects', safeId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteCreatorProject(uid: string, projectId: string): Promise<void> {
    const safeId = sanitizeFirestoreId(projectId, 'proj');
    const path = `users/${uid}/creatorProjects/${safeId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'creatorProjects', safeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // =========================================================================
  // 9. Saved / Purchased & Follows & Legacy Entries
  // =========================================================================
  subscribeUserSavedAndPurchased(
    uid: string,
    onData: (savedIds: Set<string>, purchasedIds: Set<string>) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `users/${uid}/savedAndPurchased`;
    const q = query(collection(db, 'users', uid, 'savedAndPurchased'), where('userId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const saved = new Set<string>();
        const purchased = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          if (data.saved) saved.add(data.postId);
          if (data.purchased) purchased.add(data.postId);
        });
        onData(saved, purchased);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async setSavedOrPurchased(
    uid: string,
    postId: string,
    changes: { saved?: boolean; purchased?: boolean }
  ): Promise<void> {
    const itemId = sanitizeFirestoreId(postId, 'item');
    const path = `users/${uid}/savedAndPurchased/${itemId}`;
    const ref = doc(db, 'users', uid, 'savedAndPurchased', itemId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: itemId,
          userId: uid,
          postId: String(postId).slice(0, 128),
          saved: Boolean(changes.saved),
          purchased: Boolean(changes.purchased),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        const updates: Record<string, any> = { updatedAt: serverTimestamp() };
        if (changes.saved !== undefined) updates.saved = Boolean(changes.saved);
        if (changes.purchased !== undefined) updates.purchased = Boolean(changes.purchased);
        await updateDoc(ref, updates);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  subscribeFollows(
    uid: string,
    onData: (follows: Array<{ id: string; creatorName: string }>) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `users/${uid}/follows`;
    const q = query(collection(db, 'users', uid, 'follows'), where('userId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        onData(
          snap.docs.map((d) => ({
            id: d.id,
            creatorName: String(d.data()?.creatorName || d.id)
          }))
        );
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async setFollowState(uid: string, targetKey: string, creatorName: string, shouldFollow: boolean): Promise<void> {
    const targetId = sanitizeFirestoreId(targetKey.toLowerCase(), 'follow');
    const path = `users/${uid}/follows/${targetId}`;
    const ref = doc(db, 'users', uid, 'follows', targetId);
    try {
      if (shouldFollow) {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            id: targetId,
            userId: uid,
            creatorName: String(creatorName || targetKey).slice(0, 128),
            createdAt: serverTimestamp()
          });
        }
      } else {
        await deleteDoc(ref);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  subscribeLegacyEntries(
    uid: string,
    onData: (entries: LegacyEntry[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = `users/${uid}/legacy_entries`;
    const q = query(collection(db, 'users', uid, 'legacy_entries'), where('userId', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as LegacyEntry));
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async saveLegacyEntry(uid: string, entry: LegacyEntry): Promise<void> {
    const entryId = sanitizeFirestoreId(entry.id || `legacy_${Date.now()}`, 'legacy');
    const path = `users/${uid}/legacy_entries/${entryId}`;
    try {
      await setDoc(doc(db, 'users', uid, 'legacy_entries', entryId), {
        id: entryId,
        userId: uid,
        date: String(entry.date || new Date().toLocaleDateString()).slice(0, 64),
        timestamp: clampInt(entry.timestamp, 0, Date.now()),
        title: String(entry.title || 'Milestone').slice(0, 200),
        description: String(entry.description || '').slice(0, 4000),
        whyItMatters: String(entry.whyItMatters || '').slice(0, 2000),
        longTermImpact: String(entry.longTermImpact || '').slice(0, 2000),
        relatedGoals: sanitizeStringList(entry.relatedGoals, 20),
        xpEarned: clampInt(entry.xpEarned ?? 0, 0),
        eventType: String(entry.eventType || 'milestone').slice(0, 64),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // =========================================================================
  // 10. Shared Posts, Likes & Comments
  // =========================================================================
  async seedInitialPostsIfEmpty(initialPosts: Post[]): Promise<void> {
    const path = 'posts';
    try {
      const existing = await getDocs(query(collection(db, 'posts'), where('visibility', 'in', ['public', 'circles']), limit(1)));
      if (!existing.empty) return;

      const batch = writeBatch(db);
      for (const post of initialPosts) {
        const postId = sanitizeFirestoreId(post.id, 'post');
        const payload = stripUndefined({
          id: postId,
          authorId: 'system_seed',
          creator: String(post.creator).slice(0, 100),
          avatar: String(post.avatar || '').slice(0, 2048),
          content: String(post.content).slice(0, 8000),
          image: post.image ? String(post.image).slice(0, 2048) : undefined,
          videoUrl: post.videoUrl ? String(post.videoUrl).slice(0, 2048) : undefined,
          likes: clampInt(post.likes, 0),
          shares: clampInt(post.shares, 0),
          tags: sanitizeStringList(post.tags, 15),
          type: post.type,
          contentType: post.contentType,
          title: post.title ? String(post.title).slice(0, 200) : undefined,
          visibility: post.visibility,
          relevanceReason: post.relevanceReason ? String(post.relevanceReason).slice(0, 500) : undefined,
          price: typeof post.price === 'number' ? post.price : undefined,
          gradientClass: post.gradientClass ? String(post.gradientClass).slice(0, 300) : undefined,
          courseTitle: post.courseTitle ? String(post.courseTitle).slice(0, 200) : undefined,
          courseProviderType: post.courseProviderType,
          courseDuration: post.courseDuration ? String(post.courseDuration).slice(0, 64) : undefined,
          courseTimeRequirement: post.courseTimeRequirement ? String(post.courseTimeRequirement).slice(0, 64) : undefined,
          courseSyllabus: post.courseSyllabus ? sanitizeStringList(post.courseSyllabus, 30) : undefined,
          courseDescription: post.courseDescription ? String(post.courseDescription).slice(0, 2000) : undefined,
          courseRating: typeof post.courseRating === 'number' ? post.courseRating : undefined,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        batch.set(doc(db, 'posts', postId), payload);
      }
      await batch.commit();
    } catch (error) {
      console.warn('Non-fatal seeding initial posts skipped/failed:', error);
    }
  },

  subscribePosts(
    uid: string,
    onData: (posts: Post[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = 'posts';
    let publicDocs: Map<string, any> = new Map();
    let privateDocs: Map<string, any> = new Map();

    const emitMerged = () => {
      const merged = new Map<string, any>([...publicDocs, ...privateDocs]);
      const list = Array.from(merged.values()).map((d) => ({
        ...d,
        hasLiked: false,
        isFollowing: false,
        comments: Array.isArray(d.comments) ? d.comments : []
      } as Post));
      list.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
      onData(list);
    };

    const unsubPublic = onSnapshot(
      query(collection(db, 'posts'), where('visibility', 'in', ['public', 'circles'])),
      (snap) => {
        publicDocs = new Map();
        snap.docs.forEach((d) => publicDocs.set(d.id, { id: d.id, ...d.data() }));
        emitMerged();
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );

    const unsubPrivate = onSnapshot(
      query(collection(db, 'posts'), where('authorId', '==', uid)),
      (snap) => {
        privateDocs = new Map();
        snap.docs.forEach((d) => privateDocs.set(d.id, { id: d.id, ...d.data() }));
        emitMerged();
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );

    return () => {
      unsubPublic();
      unsubPrivate();
    };
  },

  async createPost(uid: string, post: Post): Promise<Post> {
    const postId = sanitizeFirestoreId(post.id || `post_${Date.now()}`, 'post');
    const path = `posts/${postId}`;
    try {
      let image = post.image;
      if (image && image.startsWith('data:image/')) {
        image = await firebaseStorageService.uploadDataUrl(uid, 'creator', image, postId);
      }
      const payload = stripUndefined({
        id: postId,
        authorId: uid,
        creator: String(post.creator || 'Anonymous').slice(0, 100),
        avatar: String(post.avatar || 'https://i.pravatar.cc/150?u=anon').slice(0, 2048),
        content: String(post.content || 'New Creation').slice(0, 8000),
        image: image ? String(image).slice(0, 2048) : undefined,
        videoUrl: post.videoUrl ? String(post.videoUrl).slice(0, 2048) : undefined,
        likes: clampInt(post.likes, 0),
        shares: clampInt(post.shares, 0),
        tags: sanitizeStringList(post.tags, 15),
        type: post.type || 'growth',
        contentType: post.contentType || 'text',
        title: post.title ? String(post.title).slice(0, 200) : undefined,
        visibility: post.visibility || 'public',
        relevanceReason: post.relevanceReason ? String(post.relevanceReason).slice(0, 500) : 'User creation',
        price: typeof post.price === 'number' ? post.price : undefined,
        gradientClass: post.gradientClass ? String(post.gradientClass).slice(0, 300) : undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'posts', postId), payload);
      return { ...post, id: postId, authorId: uid, image };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async togglePostLikeBatch(uid: string, postId: string): Promise<boolean> {
    const safePostId = sanitizeFirestoreId(postId, 'post');
    const path = `posts/${safePostId}/likes/${uid}`;
    const postRef = doc(db, 'posts', safePostId);
    const likeRef = doc(db, 'posts', safePostId, 'likes', uid);
    try {
      const [postSnap, likeSnap] = await Promise.all([getDoc(postRef), getDoc(likeRef)]);
      if (!postSnap.exists()) return false;

      const currentLikes = clampInt(postSnap.data()?.likes, 0);
      const batch = writeBatch(db);
      if (likeSnap.exists()) {
        batch.delete(likeRef);
        batch.update(postRef, {
          likes: Math.max(0, currentLikes - 1),
          updatedAt: serverTimestamp()
        });
        await batch.commit();
        return false;
      } else {
        batch.set(likeRef, {
          userId: uid,
          postId: safePostId,
          createdAt: serverTimestamp()
        });
        batch.update(postRef, {
          likes: currentLikes + 1,
          updatedAt: serverTimestamp()
        });
        await batch.commit();
        return true;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getUserLikedPostIds(uid: string, postIds: string[]): Promise<Set<string>> {
    const liked = new Set<string>();
    try {
      const checks = await Promise.all(
        postIds.slice(0, 50).map(async (pid) => {
          const safeId = sanitizeFirestoreId(pid, 'post');
          const snap = await getDoc(doc(db, 'posts', safeId, 'likes', uid));
          return snap.exists() ? safeId : null;
        })
      );
      checks.forEach((id) => {
        if (id) liked.add(id);
      });
    } catch {}
    return liked;
  },

  // =========================================================================
  // 11. Signal Group Discussions
  // =========================================================================
  subscribeDiscussions(
    onData: (discussions: DiscussionRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const path = 'discussions';
    const q = query(collection(db, 'discussions'), where('isPublic', '==', true));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as DiscussionRecord));
        list.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
        onData(list);
      },
      (err) => {
        if (onError) onError(err);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  },

  async createDiscussion(
    uid: string,
    discussion: Omit<DiscussionRecord, 'id' | 'authorId' | 'isPublic' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<DiscussionRecord> {
    const discussionId = sanitizeFirestoreId(discussion.id || `disc_${Date.now()}`, 'disc');
    const path = `discussions/${discussionId}`;
    try {
      const payload = stripUndefined({
        id: discussionId,
        authorId: uid,
        groupId: String(discussion.groupId || 'deep-work').slice(0, 128),
        authorName: String(discussion.authorName || 'Nexoran').slice(0, 100),
        authorAvatar: discussion.authorAvatar ? String(discussion.authorAvatar).slice(0, 2048) : undefined,
        title: String(discussion.title).slice(0, 240),
        content: String(discussion.content).slice(0, 8000),
        category: discussion.category ? String(discussion.category).slice(0, 64) : undefined,
        tags: sanitizeStringList(discussion.tags || [], 10),
        upvotes: clampInt(discussion.upvotes ?? 0, 0),
        repliesCount: clampInt(discussion.repliesCount ?? 0, 0),
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'discussions', discussionId), payload);
      return {
        ...discussion,
        id: discussionId,
        authorId: uid,
        isPublic: true
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async toggleDiscussionUpvote(discussionId: string, delta: 1 | -1): Promise<void> {
    const safeId = sanitizeFirestoreId(discussionId, 'disc');
    const path = `discussions/${safeId}`;
    const ref = doc(db, 'discussions', safeId);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const current = clampInt(snap.data()?.upvotes, 0);
      const next = Math.max(0, current + delta);
      await updateDoc(ref, {
        upvotes: next,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
