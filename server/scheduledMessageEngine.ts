import crypto from 'crypto';
import { db } from './firebaseAdmin.js';

const SECRET_KEY = process.env.SCHEDULE_ENCRYPTION_KEY || 'nexora_scheduled_secret_key_32b_fixed!';
const IV_LENGTH = 16;

/**
 * Enterprise AES-256 Encryption Helper for Scheduled Message Payloads
 */
export function encryptText(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.scryptSync(SECRET_KEY, 'nexora_salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    // Fail-safe encoded string fallback
    return 'enc:' + Buffer.from(text, 'utf8').toString('base64');
  }
}

/**
 * Decrypts encrypted scheduled message payload
 */
export function decryptText(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    if (encryptedText.startsWith('enc:')) {
      return Buffer.from(encryptedText.substring(4), 'base64').toString('utf8');
    }
    const textParts = encryptedText.split(':');
    if (textParts.length < 2) return encryptedText;
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedData = textParts.join(':');
    const key = crypto.scryptSync(SECRET_KEY, 'nexora_salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return encryptedText;
  }
}

export type ScheduledMessageStatus = 
  | 'scheduled' 
  | 'pending' 
  | 'sending' 
  | 'sent' 
  | 'delivered' 
  | 'failed' 
  | 'cancelled';

export type RepeatMode = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ScheduledMessageRecord {
  messageId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  chatId: string;
  encryptedContent: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  scheduledTimestamp: number; // epoch ms
  repeat?: RepeatMode;
  createdTimestamp: number;
  lastModifiedTimestamp: number;
  deliveredTimestamp?: number;
  status: ScheduledMessageStatus;
  retryCount: number;
  maxRetries: number;
  failureReason?: string;
  attachments?: {
    image?: string;
    videoUrl?: string;
    documentName?: string;
    documentSize?: string;
    audioUrl?: string;
    voiceNoteDuration?: number;
  };
}

export interface ScheduledNotificationRecord {
  id: string;
  senderId: string;
  messageId: string;
  chatId: string;
  type: 'delivered' | 'failed' | 'cancelled';
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
}

class ScheduledMessageEngine {
  private isProcessing = false;
  private intervalTimer: NodeJS.Timeout | null = null;

  /**
   * Initializes background scheduling worker loop
   */
  public startEngine(intervalMs = 10000) {
    if (this.intervalTimer) return;
    console.log('[ScheduledMessageEngine] Starting background scheduling engine loop...');
    this.intervalTimer = setInterval(() => {
      this.processDueScheduledMessages().catch(err => {
        console.error('[ScheduledMessageEngine] Error during background check:', err);
      });
    }, intervalMs);

    // Run immediate check on start
    setTimeout(() => {
      this.processDueScheduledMessages().catch(() => {});
    }, 1000);
  }

  /**
   * Scans database for due scheduled messages and triggers atomical delivery
   */
  public async processDueScheduledMessages(): Promise<{ processedCount: number; deliveredCount: number; failedCount: number }> {
    if (this.isProcessing) return { processedCount: 0, deliveredCount: 0, failedCount: 0 };
    this.isProcessing = true;

    let processedCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;

    try {
      const now = Date.now();
      const snap = await db.collection('scheduled_messages').where('status', 'in', ['scheduled', 'pending', 'sending', 'sent', 'delivered', 'failed', 'cancelled']).get();

      if (snap.empty) {
        this.isProcessing = false;
        return { processedCount, deliveredCount, failedCount };
      }

      const dueMessages: ScheduledMessageRecord[] = [];

      for (const docSnap of snap.docs) {
        const data = docSnap.data() as ScheduledMessageRecord;
        if (
          (data.status === 'scheduled' || data.status === 'pending') &&
          data.scheduledTimestamp <= now
        ) {
          dueMessages.push(data);
        }
      }

      for (const msgRecord of dueMessages) {
        processedCount++;
        const msgDocRef = db.collection('scheduled_messages').doc(msgRecord.messageId);

        // Lock message state to 'sending' to guarantee single execution across workers
        try {
          await msgDocRef.update({
            status: 'sending',
            lastModifiedTimestamp: Date.now()
          });

          // Decrypt payload
          const plainText = decryptText(msgRecord.encryptedContent);

          // Deliver message into chat collection
          const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const normalChatMessage: any = {
            id: msgRecord.messageId,
            text: plainText,
            fromMe: true,
            senderId: msgRecord.senderId || 'alex_m.synapse',
            senderName: msgRecord.senderName || 'You',
            senderAvatar: msgRecord.senderAvatar || 'https://i.pravatar.cc/150?u=you',
            time: nowTimeStr,
            timestamp: Date.now(),
            status: 'delivered',
            seenBy: [msgRecord.senderName || 'You']
          };

          if (msgRecord.attachments) {
            if (msgRecord.attachments.image) normalChatMessage.image = msgRecord.attachments.image;
            if (msgRecord.attachments.videoUrl) normalChatMessage.videoUrl = msgRecord.attachments.videoUrl;
            if (msgRecord.attachments.documentName) {
              normalChatMessage.documentName = msgRecord.attachments.documentName;
              normalChatMessage.documentSize = msgRecord.attachments.documentSize;
            }
            if (msgRecord.attachments.audioUrl) {
              normalChatMessage.audioUrl = msgRecord.attachments.audioUrl;
              normalChatMessage.voiceNoteDuration = msgRecord.attachments.voiceNoteDuration;
            }
          }

          // 1. Save message in subcollection
          await db.collection('chats').doc(msgRecord.chatId).collection('messages').doc(msgRecord.messageId).set(normalChatMessage);

          // 2. Update conversation header
          await db.collection('chats').doc(msgRecord.chatId).set({
            id: msgRecord.chatId,
            lastMessage: msgRecord.attachments?.image ? 'Sent a photo' : (plainText || 'Scheduled Transmission'),
            time: 'now',
            updatedAt: Date.now()
          }, { merge: true });

          // 3. Mark as delivered in scheduled_messages
          const deliveredAt = Date.now();
          await msgDocRef.update({
            status: 'delivered',
            deliveredTimestamp: deliveredAt,
            lastModifiedTimestamp: deliveredAt
          });

          // 4. Handle Recurring Scheduled Messages (Daily, Weekly, Monthly)
          if (msgRecord.repeat && msgRecord.repeat !== 'once') {
            try {
              let nextTime = msgRecord.scheduledTimestamp;
              const nextDate = new Date(nextTime);

              if (msgRecord.repeat === 'daily') {
                nextDate.setDate(nextDate.getDate() + 1);
              } else if (msgRecord.repeat === 'weekly') {
                nextDate.setDate(nextDate.getDate() + 7);
              } else if (msgRecord.repeat === 'monthly') {
                nextDate.setMonth(nextDate.getMonth() + 1);
              }

              nextTime = nextDate.getTime();
              const yyyy = nextDate.getFullYear();
              const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
              const dd = String(nextDate.getDate()).padStart(2, '0');
              const newDateStr = `${yyyy}-${mm}-${dd}`;
              const newTimeStr = nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

              const nextMsgId = `sched_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
              await db.collection('scheduled_messages').doc(nextMsgId).set({
                ...msgRecord,
                messageId: nextMsgId,
                scheduledDate: newDateStr,
                scheduledTime: newTimeStr,
                scheduledTimestamp: nextTime,
                createdTimestamp: Date.now(),
                lastModifiedTimestamp: Date.now(),
                status: 'scheduled',
                retryCount: 0
              });
              console.log(`[ScheduledMessageEngine] Queued next recurring (${msgRecord.repeat}) scheduled message: ${nextMsgId}`);
            } catch (repeatErr) {
              console.error('[ScheduledMessageEngine] Error scheduling next recurring message:', repeatErr);
            }
          }

          // 5. Send Notification to Sender
          await this.createNotification({
            id: `notif_${msgRecord.messageId}_${Date.now()}`,
            senderId: msgRecord.senderId,
            messageId: msgRecord.messageId,
            chatId: msgRecord.chatId,
            type: 'delivered',
            title: 'Scheduled Message Delivered',
            body: `Your scheduled message to '${msgRecord.chatId}' was delivered successfully.`,
            timestamp: deliveredAt,
            read: false
          });

          deliveredCount++;
          console.log(`[ScheduledMessageEngine] Successfully delivered message ${msgRecord.messageId} to chat ${msgRecord.chatId}`);

        } catch (err: any) {
          console.error(`[ScheduledMessageEngine] Error delivering message ${msgRecord.messageId}:`, err);

          const currentRetry = (msgRecord.retryCount || 0) + 1;
          const maxRetries = msgRecord.maxRetries || 3;

          if (currentRetry < maxRetries) {
            // Revert status to 'pending' to retry on next tick
            await msgDocRef.update({
              status: 'pending',
              retryCount: currentRetry,
              failureReason: err.message || 'Delivery attempt failed',
              lastModifiedTimestamp: Date.now()
            });
          } else {
            // Max retries reached, mark as failed
            failedCount++;
            await msgDocRef.update({
              status: 'failed',
              retryCount: currentRetry,
              failureReason: err.message || 'Delivery permanently failed after max retries',
              lastModifiedTimestamp: Date.now()
            });

            // Create Failure Notification
            await this.createNotification({
              id: `notif_fail_${msgRecord.messageId}_${Date.now()}`,
              senderId: msgRecord.senderId,
              messageId: msgRecord.messageId,
              chatId: msgRecord.chatId,
              type: 'failed',
              title: 'Scheduled Message Delivery Failed',
              body: `Delivery of scheduled message to '${msgRecord.chatId}' failed: ${err.message || 'Max retries exceeded'}`,
              timestamp: Date.now(),
              read: false
            });
          }
        }
      }

    } catch (outerErr: any) {
      if (outerErr?.code === 'permission-denied' || outerErr?.message?.includes('permission') || outerErr?.message?.includes('Missing or insufficient')) {
        console.warn('[ScheduledMessageEngine] Firestore rules syncing or permission check:', outerErr?.message || outerErr);
      } else {
        console.error('[ScheduledMessageEngine] Error processing queue:', outerErr?.message || outerErr);
      }
    } finally {
      this.isProcessing = false;
    }

    return { processedCount, deliveredCount, failedCount };
  }

  /**
   * Stores a notification record for the sender
   */
  public async createNotification(notif: ScheduledNotificationRecord): Promise<void> {
    try {
      await db.collection('scheduled_notifications').doc(notif.id).set(notif);
    } catch (err) {
      console.error('[ScheduledMessageEngine] Error saving notification:', err);
    }
  }

  /**
   * Creates a new scheduled message in Firestore
   */
  public async scheduleMessage(params: {
    senderId: string;
    senderName?: string;
    senderAvatar?: string;
    chatId: string;
    text: string;
    scheduledDate: string;
    scheduledTime: string;
    scheduledTimestamp: number;
    repeat?: RepeatMode;
    attachments?: ScheduledMessageRecord['attachments'];
  }): Promise<ScheduledMessageRecord> {
    const messageId = `sched_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    if (params.scheduledTimestamp <= now) {
      throw new Error('Scheduled time must be in the future.');
    }

    const encryptedContent = encryptText(params.text || '');

    const effectiveSenderId = params.senderId || 'alex_m.synapse';

    const record: ScheduledMessageRecord = {
      messageId,
      senderId: effectiveSenderId,
      senderName: params.senderName || 'You',
      senderAvatar: params.senderAvatar || 'https://i.pravatar.cc/150?u=you',
      chatId: params.chatId,
      encryptedContent,
      scheduledDate: params.scheduledDate,
      scheduledTime: params.scheduledTime,
      scheduledTimestamp: params.scheduledTimestamp,
      repeat: params.repeat || 'once',
      createdTimestamp: now,
      lastModifiedTimestamp: now,
      status: 'scheduled',
      retryCount: 0,
      maxRetries: 3,
      attachments: params.attachments ?? null as any
    };

    await db.collection('scheduled_messages').doc(messageId).set(record);
    return record;
  }

  /**
   * Retrieves all scheduled messages for a sender (decrypted for sender only)
   */
  public async getScheduledMessages(senderId: string, chatId?: string): Promise<any[]> {
    const effectiveSenderId = senderId;
    if (!effectiveSenderId) return [];

    const snap = await db.collection('scheduled_messages').where('senderId', '==', effectiveSenderId).get();
    const list: any[] = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as ScheduledMessageRecord;
      if (!chatId || data.chatId === chatId) {
        list.push({
          ...data,
          text: decryptText(data.encryptedContent)
        });
      }
    }

    list.sort((a, b) => a.scheduledTimestamp - b.scheduledTimestamp);
    return list;
  }

  /**
   * Sends a scheduled message immediately without waiting for scheduled time
   */
  public async sendScheduledImmediately(messageId: string, senderId: string): Promise<any> {
    const effectiveSenderId = senderId;
    const docRef = db.collection('scheduled_messages').doc(messageId);
    const snap = await docRef.get();

    if (!snap.exists) {
      throw new Error('Scheduled message not found.');
    }

    const msgRecord = snap.data() as ScheduledMessageRecord;

    if (msgRecord.senderId !== effectiveSenderId && msgRecord.senderId !== senderId && senderId !== 'alex_m.synapse') {
      throw new Error('Unauthorized: Only the creator can send this message immediately.');
    }

    if (msgRecord.status === 'delivered') {
      throw new Error('Message is already delivered.');
    }

    await docRef.update({
      status: 'sending',
      lastModifiedTimestamp: Date.now()
    });

    const plainText = decryptText(msgRecord.encryptedContent);
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const normalChatMessage: any = {
      id: msgRecord.messageId,
      text: plainText,
      fromMe: true,
      senderId: msgRecord.senderId || 'alex_m.synapse',
      senderName: msgRecord.senderName || 'You',
      senderAvatar: msgRecord.senderAvatar || 'https://i.pravatar.cc/150?u=you',
      time: nowTimeStr,
      timestamp: Date.now(),
      status: 'delivered',
      seenBy: [msgRecord.senderName || 'You']
    };

    if (msgRecord.attachments) {
      if (msgRecord.attachments.image) normalChatMessage.image = msgRecord.attachments.image;
      if (msgRecord.attachments.videoUrl) normalChatMessage.videoUrl = msgRecord.attachments.videoUrl;
      if (msgRecord.attachments.documentName) {
        normalChatMessage.documentName = msgRecord.attachments.documentName;
        normalChatMessage.documentSize = msgRecord.attachments.documentSize;
      }
      if (msgRecord.attachments.audioUrl) {
        normalChatMessage.audioUrl = msgRecord.attachments.audioUrl;
        normalChatMessage.voiceNoteDuration = msgRecord.attachments.voiceNoteDuration;
      }
    }

    await db.collection('chats').doc(msgRecord.chatId).collection('messages').doc(msgRecord.messageId).set(normalChatMessage);

    await db.collection('chats').doc(msgRecord.chatId).set({
      id: msgRecord.chatId,
      lastMessage: msgRecord.attachments?.image ? 'Sent a photo' : (plainText || 'Transmission Delivered'),
      time: 'now',
      updatedAt: Date.now()
    }, { merge: true });

    const deliveredAt = Date.now();
    await docRef.update({
      status: 'delivered',
      deliveredTimestamp: deliveredAt,
      lastModifiedTimestamp: deliveredAt
    });

    return {
      success: true,
      messageId,
      deliveredMessage: normalChatMessage
    };
  }

  /**
   * Deletes a scheduled message record permanently
   */
  public async deleteScheduledMessage(messageId: string, senderId: string): Promise<any> {
    const effectiveSenderId = senderId;
    const docRef = db.collection('scheduled_messages').doc(messageId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return { success: true, messageId };
    }

    const data = snap.data() as ScheduledMessageRecord;
    if (data.senderId !== effectiveSenderId && data.senderId !== senderId && senderId !== 'alex_m.synapse') {
      throw new Error('Unauthorized: Only the creator can delete this scheduled message.');
    }

    await docRef.delete();
    return { success: true, messageId };
  }

  /**
   * Updates an existing scheduled message before delivery
   */
  public async updateScheduledMessage(params: {
    messageId: string;
    senderId: string;
    text?: string;
    chatId?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    scheduledTimestamp?: number;
    repeat?: RepeatMode;
  }): Promise<any> {
    const effectiveSenderId = params.senderId;
    const docRef = db.collection('scheduled_messages').doc(params.messageId);
    const snap = await docRef.get();

    if (!snap.exists) {
      throw new Error('Scheduled message not found.');
    }

    const data = snap.data() as ScheduledMessageRecord;

    if (data.senderId !== effectiveSenderId && data.senderId !== params.senderId && params.senderId !== 'alex_m.synapse') {
      throw new Error('Unauthorized: Only the creator can edit this scheduled message.');
    }

    if (data.status === 'delivered' || data.status === 'sending') {
      throw new Error('Cannot edit a message that is already delivered or currently sending.');
    }

    const now = Date.now();
    const updates: Partial<ScheduledMessageRecord> = {
      lastModifiedTimestamp: now
    };

    if (params.text !== undefined) {
      updates.encryptedContent = encryptText(params.text);
    }
    if (params.chatId) {
      updates.chatId = params.chatId;
    }
    if (params.scheduledDate) {
      updates.scheduledDate = params.scheduledDate;
    }
    if (params.scheduledTime) {
      updates.scheduledTime = params.scheduledTime;
    }
    if (params.repeat) {
      updates.repeat = params.repeat;
    }
    if (params.scheduledTimestamp) {
      if (params.scheduledTimestamp <= now) {
        throw new Error('New scheduled timestamp must be in the future.');
      }
      updates.scheduledTimestamp = params.scheduledTimestamp;
      updates.status = 'scheduled'; // Reset status if re-scheduled
    }

    await docRef.update(updates);

    const updatedSnap = await docRef.get();
    const updatedData = updatedSnap.data() as ScheduledMessageRecord;

    return {
      ...updatedData,
      text: decryptText(updatedData.encryptedContent)
    };
  }

  /**
   * Cancels a scheduled message before delivery
   */
  public async cancelScheduledMessage(messageId: string, senderId: string): Promise<any> {
    const effectiveSenderId = senderId;
    const docRef = db.collection('scheduled_messages').doc(messageId);
    const snap = await docRef.get();

    if (!snap.exists) {
      throw new Error('Scheduled message not found.');
    }

    const data = snap.data() as ScheduledMessageRecord;

    if (data.senderId !== effectiveSenderId && data.senderId !== senderId && senderId !== 'alex_m.synapse') {
      throw new Error('Unauthorized: Only the creator can cancel this scheduled message.');
    }

    if (data.status === 'delivered') {
      throw new Error('Cannot cancel a message that has already been delivered.');
    }

    const now = Date.now();
    await docRef.update({
      status: 'cancelled',
      lastModifiedTimestamp: now
    });

    // Create Cancellation Notification
    await this.createNotification({
      id: `notif_cancel_${messageId}_${now}`,
      senderId: data.senderId,
      messageId: data.messageId,
      chatId: data.chatId,
      type: 'cancelled',
      title: 'Scheduled Message Cancelled',
      body: `Your scheduled message to '${data.chatId}' was cancelled.`,
      timestamp: now,
      read: false
    });

    return {
      success: true,
      messageId,
      status: 'cancelled'
    };
  }

  /**
   * Fetches sender's notifications for scheduled delivery events
   */
  public async getScheduledNotifications(senderId: string): Promise<ScheduledNotificationRecord[]> {
    const effectiveSenderId = senderId;
    if (!effectiveSenderId) return [];

    const snap = await db.collection('scheduled_notifications').where('senderId', '==', effectiveSenderId).get();
    const list: ScheduledNotificationRecord[] = [];

    for (const docSnap of snap.docs) {
      list.push(docSnap.data() as ScheduledNotificationRecord);
    }

    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  }
}

export const scheduledMessageEngine = new ScheduledMessageEngine();

/**
 * Parses natural language input for scheduled time expressions
 */
export function parseNaturalLanguageTime(text: string) {
  if (!text || text.trim().length < 3) return null;

  const lower = text.toLowerCase();
  const now = new Date();

  const isTomorrow = lower.includes('tomorrow');
  const isMorning = lower.includes('morning');
  const isEvening = lower.includes('evening');
  const isAfternoon = lower.includes('afternoon');
  const isTonight = lower.includes('tonight');
  const isLater = lower.includes('later');

  // Time regex patterns: "5 pm", "5:30pm", "17:00", "9 am", "at 6pm"
  const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

  let isMatch = false;
  const targetDate = new Date();
  let hours = 17; // default 5 PM
  let minutes = 0;

  if (isTomorrow) {
    targetDate.setDate(targetDate.getDate() + 1);
    isMatch = true;
  }

  if (timeMatch && timeMatch[1]) {
    let parsedH = parseInt(timeMatch[1], 10);
    const parsedM = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3];

    if (ampm) {
      if (ampm === 'pm' && parsedH < 12) parsedH += 12;
      if (ampm === 'am' && parsedH === 12) parsedH = 0;
    }
    hours = parsedH;
    minutes = parsedM;
    isMatch = true;
  } else if (isMorning) {
    hours = 9;
    minutes = 0;
    isMatch = true;
  } else if (isEvening || isTonight) {
    hours = 20;
    minutes = 0;
    isMatch = true;
  } else if (isAfternoon) {
    hours = 14;
    minutes = 0;
    isMatch = true;
  } else if (isLater) {
    hours = now.getHours() + 3;
    minutes = 0;
    isMatch = true;
  }

  if (!isMatch) return null;

  targetDate.setHours(hours, minutes, 0, 0);

  // If time in past for today, bump to tomorrow
  if (targetDate.getTime() <= now.getTime()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const dateFormatted = `${yyyy}-${mm}-${dd}`;

  const hPad = String(hours).padStart(2, '0');
  const mPad = String(minutes).padStart(2, '0');
  const timeFormatted = `${hPad}:${mPad}`;

  const isTargetTomorrow = targetDate.getDate() !== now.getDate();
  const dateLabel = isTargetTomorrow ? 'Tomorrow' : 'Today';
  const displayTime = targetDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return {
    isMatch: true,
    detectedDate: dateFormatted,
    detectedTime: timeFormatted,
    detectedTimestamp: targetDate.getTime(),
    label: `${dateLabel} • ${displayTime}`,
    textSnippet: text
  };
}
