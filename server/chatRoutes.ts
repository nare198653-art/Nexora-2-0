import { Router, Request, Response } from 'express';
import { db } from './firebaseAdmin.js';
import discussionRoutes from './discussion/discussionRoutes.js';
import { discussionIntelligenceEngine } from './discussion/DiscussionIntelligenceEngine.js';
import { scheduledMessageEngine, parseNaturalLanguageTime } from './scheduledMessageEngine.js';
import { VectorUtils } from './discussion/vectorUtils.js';
import { ai } from './geminiHelper.js';

const router = Router();

// Mount discussion intelligence sub-routes
router.use('/discussion', discussionRoutes);

async function getAuthorizedChatDocs(uid?: string | null) {
  const byId = new Map<string, any>();
  const queries = [
    db.collection('chats').where('isPublicChannel', '==', true).get(),
    db.collection('chats').where('isGroup', '==', true).get()
  ];
  if (uid) {
    queries.push(db.collection('chats').where('isGroup', '==', false).get());
  }
  const results = await Promise.allSettled(queries);
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const d of r.value.docs) {
        const data = d.data();
        if (data.isGroup === false && !data.isPublicChannel && uid) {
          if (!Array.isArray(data.participantIds) || !data.participantIds.includes(uid)) {
            continue;
          }
        }
        if (!byId.has(d.id)) byId.set(d.id, d);
      }
    }
  }
  return Array.from(byId.values());
}

async function getChatMessageDocs(chatId: string) {
  return db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .where('status', 'in', ['sent', 'delivered', 'read', 'failed', 'seen'])
    .get();
}

// Standard initial seed data for DMs & default group chat if database is empty
const INITIAL_CONVERSATIONS = [
  {
    id: 'dm-1',
    sender: 'MindsetMastery',
    avatar: 'https://i.pravatar.cc/150?u=mindset',
    lastMessage: 'The Stoic module is ready for review.',
    time: '2m',
    unread: true,
    isGroup: false,
    isPublicChannel: true,
    messages: [
      { id: 'm1', text: 'Hey Alex, how is the project going?', fromMe: false, senderId: 'u8', senderName: 'MindsetMastery', senderAvatar: 'https://i.pravatar.cc/150?u=mindset', time: '10:00 AM', status: 'seen', seenBy: ['Alex M.'] },
      { id: 'm2', text: 'Going great! Just finished the core engine.', fromMe: true, senderId: 'alex_m.synapse', senderName: 'You', senderAvatar: 'https://i.pravatar.cc/150?u=you', time: '10:05 AM', status: 'seen', intent: 'inform', seenBy: ['MindsetMastery'] },
      { id: 'm3', text: 'Excellent. The Stoic module is ready for review.', fromMe: false, senderId: 'u8', senderName: 'MindsetMastery', senderAvatar: 'https://i.pravatar.cc/150?u=mindset', time: '10:30 AM', status: 'seen', seenBy: ['Alex M.'] },
    ]
  },
  {
    id: 'dm-2',
    sender: 'Sarah J.',
    avatar: 'https://i.pravatar.cc/150?u=sarah',
    lastMessage: 'Check out this new React pattern!',
    time: '1h',
    isGroup: false,
    isPublicChannel: true,
    messages: [
      { id: 'm4', text: 'Have you seen the latest Gemini update?', fromMe: false, senderId: 'u7', senderName: 'Sarah J.', senderAvatar: 'https://i.pravatar.cc/150?u=sarah', time: 'Yesterday', status: 'seen', seenBy: ['Alex M.'] },
      { id: 'm5', text: 'Yes, it is incredible for reasoning.', fromMe: true, senderId: 'alex_m.synapse', senderName: 'You', senderAvatar: 'https://i.pravatar.cc/150?u=you', time: 'Yesterday', status: 'seen', intent: 'casual', seenBy: ['Sarah J.'] },
      { id: 'm6', text: 'Check out this new React pattern!', fromMe: false, senderId: 'u7', senderName: 'Sarah J.', senderAvatar: 'https://i.pravatar.cc/150?u=sarah', time: '9:00 AM', status: 'seen', intent: 'inform', seenBy: ['Alex M.'] },
    ]
  },
  {
    id: 'group-default',
    sender: 'Dev Sync',
    avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
    lastMessage: 'Group Node established.',
    time: 'now',
    unread: false,
    isGroup: true,
    isPublicChannel: true,
    groupDetails: {
      id: 'group-default',
      name: 'Dev Sync',
      description: 'Central engineering sync node for Nexora developers.',
      photo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
      creationDate: new Date().toLocaleDateString(),
      ownerId: 'alex_m.synapse',
      adminIds: ['u7'],
      memberIds: ['u1', 'u2', 'u7'],
      memberCount: 4,
      inviteLink: 'https://nexora.app/join/group-default',
      inviteCode: 'NEX-9999',
      pinnedMessageIds: [],
      historySetting: 'entire',
      isEncrypted: true
    },
    messages: [
      {
        id: 'm-sys-default',
        text: 'System: Group node established by You.',
        fromMe: false,
        senderName: 'System',
        senderId: 'system',
        time: '12:00 PM',
        status: 'seen',
        seenBy: ['Zoya Code', 'Sarah J.', 'Kabir Zen']
      }
    ]
  }
];

// Helper to seed the database
async function seedConversationsIfEmpty() {
  try {
    const chatsSnap = await db.collection('chats').where('isPublicChannel', '==', true).limit(1).get();
    if (chatsSnap.empty) {
      console.log('Seeding chats in Firestore...');
      for (const conv of INITIAL_CONVERSATIONS) {
        const { messages, ...chatMeta } = conv;
        await db.collection('chats').doc(conv.id).set(chatMeta);
        
        for (const msg of messages) {
          await db.collection('chats').doc(conv.id).collection('messages').doc(msg.id).set(msg);
        }
      }
      console.log('Chats successfully seeded in Firestore.');
    }
  } catch (error) {
    console.error('Error seeding chats:', error);
  }
}

// 1. GET all chats/conversations along with their messages
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const uid = typeof req.query.userId === 'string' ? req.query.userId : null;
    await seedConversationsIfEmpty();

    const chatDocs = await getAuthorizedChatDocs(uid);
    const conversations: any[] = [];

    for (const chatDoc of chatDocs) {
      const chatData = chatDoc.data();
      
      // Fetch messages subcollection
      const messagesSnap = await getChatMessageDocs(chatDoc.id);
      const messages = messagesSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      });

      messages.sort((a: any, b: any) => {
        const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
        const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
        return aNum - bNum;
      });

      let discussionTopics: any[] = [];
      if (chatData.isGroup) {
        discussionTopics = discussionIntelligenceEngine.getRankedTopics(chatDoc.id);
      }

      conversations.push({
        id: chatDoc.id,
        ...chatData,
        messages: messages,
        discussionTopics: discussionTopics
      });
    }

    res.json(conversations);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. POST to send a message
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { chatId, message } = req.body;
    const uid = message?.senderId || null;
    if (!chatId || !message) {
      return res.status(400).json({ error: 'Missing chatId or message' });
    }

    // Ensure parent chat exists & passes rules before adding message
    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      await chatRef.set({
        id: chatId,
        sender: message.senderName || 'Direct Channel',
        avatar: message.senderAvatar || 'https://i.pravatar.cc/150?u=chat',
        lastMessage: message.image ? 'Sent a photo' : (message.text || 'Transmission'),
        time: 'now',
        isPublicChannel: true,
        participantIds: uid ? [uid] : [],
        updatedAt: Date.now()
      });
    }

    // Process message through AI Discussion Intelligence Engine
    const discussionIntelligence = await discussionIntelligenceEngine.processIncomingMessage(chatId, message);

    const enrichedMessage: Record<string, any> = {
      id: message.id,
      time: String(message.time || 'now').slice(0, 64),
      status: message.status || 'sent',
      senderId: message.senderId || uid || 'alex_m.synapse',
      topicId: discussionIntelligence.topicNode.id,
      topicTitle: discussionIntelligence.topicNode.title,
      isDuplicate: Boolean(discussionIntelligence.isDuplicate),
      semanticAnalysis: discussionIntelligence.semanticAnalysis
    };
    if (message.text !== undefined) enrichedMessage.text = String(message.text).slice(0, 8000);
    if (message.fromMe !== undefined) enrichedMessage.fromMe = Boolean(message.fromMe);
    if (message.senderName) enrichedMessage.senderName = String(message.senderName).slice(0, 128);
    if (message.senderAvatar) enrichedMessage.senderAvatar = String(message.senderAvatar).slice(0, 2048);
    if (message.intent) enrichedMessage.intent = String(message.intent).slice(0, 32);
    if (message.image) enrichedMessage.image = String(message.image).slice(0, 2048);
    if (message.videoUrl) enrichedMessage.videoUrl = String(message.videoUrl).slice(0, 2048);
    if (message.documentName) enrichedMessage.documentName = String(message.documentName).slice(0, 256);
    if (message.documentSize) enrichedMessage.documentSize = String(message.documentSize).slice(0, 64);
    if (message.audioUrl) enrichedMessage.audioUrl = String(message.audioUrl).slice(0, 2048);
    if (typeof message.voiceNoteDuration === 'number') enrichedMessage.voiceNoteDuration = Math.round(message.voiceNoteDuration);
    if (message.replyToMessageId) enrichedMessage.replyToMessageId = String(message.replyToMessageId).slice(0, 128);
    if (message.replyToMessageText) enrichedMessage.replyToMessageText = String(message.replyToMessageText).slice(0, 1000);
    if (Array.isArray(message.seenBy)) enrichedMessage.seenBy = message.seenBy.slice(0, 200);

    // Save message in subcollection
    await chatRef.collection('messages').doc(message.id).set(enrichedMessage);

    // Update conversation meta with last message
    await chatRef.update({
      lastMessage: message.image ? 'Sent a photo' : (message.text || 'Transmission'),
      time: 'now',
      updatedAt: Date.now()
    });

    res.json({
      success: true,
      message: enrichedMessage,
      discussionIntelligence: {
        topicNode: discussionIntelligence.topicNode,
        isDuplicate: discussionIntelligence.isDuplicate,
        semanticAnalysis: discussionIntelligence.semanticAnalysis
      }
    });
  } catch (error: any) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. POST to toggle reaction
router.post('/reaction', async (req: Request, res: Response) => {
  try {
    const { chatId, messageId, userId, emoji } = req.body;
    if (!chatId || !messageId || !userId || !emoji) {
      return res.status(400).json({ error: 'Missing reaction details' });
    }

    const msgRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
    const msgSnap = await msgRef.get();

    if (!msgSnap.exists) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const msgData = msgSnap.data() || {};
    const reactions = { ...(msgData.reactions || {}) };

    if (reactions[userId] === emoji) {
      delete reactions[userId];
    } else {
      reactions[userId] = emoji;
    }

    await msgRef.update({ reactions });

    res.json({ success: true, reactions });
  } catch (error: any) {
    console.error('Error updating reaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3b. POST to edit a message (only if unsent/unseen/unread by recipient)
router.post('/editMessage', async (req: Request, res: Response) => {
  try {
    const { chatId, messageId, newText, senderId } = req.body;
    if (!chatId || !messageId || newText === undefined) {
      return res.status(400).json({ error: 'Missing chatId, messageId, or newText' });
    }

    const msgRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
    const msgSnap = await msgRef.get();

    if (!msgSnap.exists) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const msgData = msgSnap.data() || {};

    // 1. Check message status: Must NOT be seen or read
    if (msgData.status === 'seen' || msgData.status === 'read') {
      return res.status(403).json({ 
        error: 'Message cannot be edited after it has been seen or read by recipient.',
        code: 'EDIT_LOCKED_SEEN'
      });
    }

    // 2. Check seenBy array: No participant other than sender must have read it
    const seenByList: string[] = msgData.seenBy || [];
    const otherReaders = seenByList.filter(reader => reader !== 'You' && reader !== msgData.senderName && reader !== msgData.senderId);
    if (otherReaders.length > 0) {
      return res.status(403).json({ 
        error: 'Message cannot be edited as it has already been opened by a recipient.',
        code: 'EDIT_LOCKED_READ'
      });
    }

    // Preserve all metadata (id, timestamp, replies, reactions, pins, attachments, AI references)
    const oldText = msgData.text || '';
    const now = Date.now();
    const editHistory = msgData.editHistory || [];
    editHistory.push({
      previousText: oldText,
      editedAt: now,
      editedBy: senderId || 'You'
    });

    const updateFields = {
      text: newText.trim(),
      isEdited: true,
      editHistory,
      updatedAt: now
    };

    await msgRef.update(updateFields);

    const updatedMessage = {
      ...msgData,
      ...updateFields
    };

    // Update conversation's lastMessage if this was the latest message
    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (chatSnap.exists) {
      const chatData = chatSnap.data() || {};
      if (chatData.lastMessage === oldText || chatData.lastMessage === 'Sent a photo') {
        await chatRef.update({
          lastMessage: newText.trim(),
          updatedAt: now
        });
      }
    }

    res.json({
      success: true,
      message: updatedMessage
    });
  } catch (error: any) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: error.message });
  }
});

export interface PinnedMessageRecord {
  messageId: string;
  chatId: string;
  pinnedBy: string;
  pinnedAt: number;
  originalSender: string;
  pinHistory: {
    action: 'pin' | 'unpin';
    userId: string;
    timestamp: number;
  }[];
}

// In-Memory Cache for performance & fast indexing
const pinnedMessagesCache = new Map<string, PinnedMessageRecord[]>();

async function getPinnedRecordsForChat(chatId: string, chatData?: any): Promise<PinnedMessageRecord[]> {
  if (pinnedMessagesCache.has(chatId)) {
    return pinnedMessagesCache.get(chatId)!;
  }
  let records: PinnedMessageRecord[] = chatData?.pinnedMessages || [];
  if ((!records || records.length === 0) && chatData?.isGroup && chatData?.groupDetails?.pinnedMessageIds) {
    const ids: string[] = chatData.groupDetails.pinnedMessageIds;
    records = ids.map(id => ({
      messageId: id,
      chatId,
      pinnedBy: 'System',
      pinnedAt: Date.now(),
      originalSender: chatData.sender || 'Anonymous',
      pinHistory: [{ action: 'pin', userId: 'System', timestamp: Date.now() }]
    }));
  }
  pinnedMessagesCache.set(chatId, records);
  return records;
}

// 4. Message Pinning Endpoints
// 4a. POST /api/chat/pinMessage
router.post('/pinMessage', async (req: Request, res: Response) => {
  try {
    const { chatId, messageId, pinnedBy = 'You', originalSender } = req.body;
    if (!chatId || !messageId) {
      return res.status(400).json({ error: 'Missing chatId or messageId' });
    }

    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();

    if (!chatSnap.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chatData = chatSnap.data() || {};

    // Authorization check
    if (chatData.isGroup && chatData.groupDetails) {
      const { memberIds = [], adminIds = [], ownerId } = chatData.groupDetails;
      const isAuthorized = ownerId === pinnedBy || adminIds.includes(pinnedBy) || memberIds.includes(pinnedBy) || pinnedBy === 'You' || pinnedBy === 'alex_m.synapse';
      if (!isAuthorized) {
        return res.status(403).json({ error: 'Unauthorized: Only chat participants or admins can pin messages' });
      }
    }

    // Determine original sender
    let senderName = originalSender;
    if (!senderName) {
      const msgSnap = await chatRef.collection('messages').doc(messageId).get();
      if (msgSnap.exists) {
        const msgData = msgSnap.data() || {};
        senderName = msgData.senderName || msgData.senderId || 'Anonymous';
      } else {
        senderName = 'Anonymous';
      }
    }

    const existingPins: PinnedMessageRecord[] = await getPinnedRecordsForChat(chatId, chatData);
    const existingIndex = existingPins.findIndex(p => p.messageId === messageId);

    const now = Date.now();
    let updatedPins: PinnedMessageRecord[];

    if (existingIndex !== -1) {
      updatedPins = [...existingPins];
      updatedPins[existingIndex] = {
        ...updatedPins[existingIndex],
        pinnedBy: pinnedBy || updatedPins[existingIndex].pinnedBy,
        pinnedAt: now,
        pinHistory: [
          ...(updatedPins[existingIndex].pinHistory || []),
          { action: 'pin', userId: pinnedBy, timestamp: now }
        ]
      };
    } else {
      const newRecord: PinnedMessageRecord = {
        messageId,
        chatId,
        pinnedBy: pinnedBy || 'You',
        pinnedAt: now,
        originalSender: senderName || 'Anonymous',
        pinHistory: [
          { action: 'pin', userId: pinnedBy, timestamp: now }
        ]
      };
      updatedPins = [...existingPins, newRecord];
    }

    pinnedMessagesCache.set(chatId, updatedPins);

    const updates: any = {
      pinnedMessages: updatedPins,
      updatedAt: now
    };

    if (chatData.isGroup && chatData.groupDetails) {
      updates.groupDetails = {
        ...chatData.groupDetails,
        pinnedMessageIds: updatedPins.map(p => p.messageId)
      };
    }

    await chatRef.update(updates);

    res.json({
      success: true,
      pinnedMessages: updatedPins,
      pinnedMessageIds: updatedPins.map(p => p.messageId),
      activePin: updatedPins[updatedPins.length - 1]
    });
  } catch (error: any) {
    console.error('Error pinning message:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4b. POST /api/chat/unpinMessage
router.post('/unpinMessage', async (req: Request, res: Response) => {
  try {
    const { chatId, messageId, unpinnedBy = 'You' } = req.body;
    if (!chatId || !messageId) {
      return res.status(400).json({ error: 'Missing chatId or messageId' });
    }

    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();

    if (!chatSnap.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chatData = chatSnap.data() || {};
    const existingPins: PinnedMessageRecord[] = await getPinnedRecordsForChat(chatId, chatData);

    const now = Date.now();
    const updatedPins = existingPins.filter(p => p.messageId !== messageId);

    pinnedMessagesCache.set(chatId, updatedPins);

    const updates: any = {
      pinnedMessages: updatedPins,
      updatedAt: now
    };

    if (chatData.isGroup && chatData.groupDetails) {
      updates.groupDetails = {
        ...chatData.groupDetails,
        pinnedMessageIds: updatedPins.map(p => p.messageId)
      };
    }

    await chatRef.update(updates);

    res.json({
      success: true,
      pinnedMessages: updatedPins,
      pinnedMessageIds: updatedPins.map(p => p.messageId)
    });
  } catch (error: any) {
    console.error('Error unpinning message:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4c. GET /api/chat/pinnedMessages
router.get('/pinnedMessages', async (req: Request, res: Response) => {
  try {
    const chatId = req.query.chatId as string;
    if (!chatId) {
      return res.status(400).json({ error: 'Missing chatId parameter' });
    }

    const pinnedMessages = await getPinnedRecordsForChat(chatId);
    res.json({
      chatId,
      pinnedMessages,
      pinnedMessageIds: pinnedMessages.map(p => p.messageId)
    });
  } catch (error: any) {
    console.error('Error getting pinned messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4d. POST /api/chat/syncPinnedMessages
router.post('/syncPinnedMessages', async (req: Request, res: Response) => {
  try {
    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({ error: 'Missing chatId' });
    }

    const pinnedMessages = await getPinnedRecordsForChat(chatId);
    res.json({
      success: true,
      chatId,
      pinnedMessages,
      pinnedMessageIds: pinnedMessages.map(p => p.messageId),
      updatedAt: Date.now()
    });
  } catch (error: any) {
    console.error('Error syncing pinned messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4e. POST /api/chat/pin (Legacy & Toggle Endpoint)
router.post('/pin', async (req: Request, res: Response) => {
  try {
    const { chatId, messageId, pinnedBy = 'You', originalSender } = req.body;
    if (!chatId || !messageId) {
      return res.status(400).json({ error: 'Missing chatId or messageId' });
    }

    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();

    if (!chatSnap.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chatData = chatSnap.data() || {};
    const existingPins: PinnedMessageRecord[] = await getPinnedRecordsForChat(chatId, chatData);
    const isPinned = existingPins.some(p => p.messageId === messageId);

    const now = Date.now();
    let updatedPins: PinnedMessageRecord[];

    if (isPinned) {
      updatedPins = existingPins.filter(p => p.messageId !== messageId);
    } else {
      let senderName = originalSender;
      if (!senderName) {
        const msgSnap = await chatRef.collection('messages').doc(messageId).get();
        if (msgSnap.exists) {
          const msgData = msgSnap.data() || {};
          senderName = msgData.senderName || msgData.senderId || 'Anonymous';
        } else {
          senderName = 'Anonymous';
        }
      }
      const newRecord: PinnedMessageRecord = {
        messageId,
        chatId,
        pinnedBy: pinnedBy || 'You',
        pinnedAt: now,
        originalSender: senderName || 'Anonymous',
        pinHistory: [{ action: 'pin', userId: pinnedBy || 'You', timestamp: now }]
      };
      updatedPins = [...existingPins, newRecord];
    }

    pinnedMessagesCache.set(chatId, updatedPins);

    const updates: any = {
      pinnedMessages: updatedPins,
      updatedAt: now
    };

    if (chatData.isGroup && chatData.groupDetails) {
      updates.groupDetails = {
        ...chatData.groupDetails,
        pinnedMessageIds: updatedPins.map(p => p.messageId)
      };
    }

    await chatRef.update(updates);

    res.json({
      success: true,
      pinnedMessages: updatedPins,
      pinnedMessageIds: updatedPins.map(p => p.messageId),
      isPinned: !isPinned
    });
  } catch (error: any) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. POST to read receipts / seenBy
router.post('/read', async (req: Request, res: Response) => {
  try {
    const { chatId, messageId, readerName } = req.body;
    if (!chatId || !readerName) {
      return res.status(400).json({ error: 'Missing chatId or readerName' });
    }

    if (messageId) {
      // Mark specific message as seen by a specific reader
      const msgRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
      const msgSnap = await msgRef.get();
      if (msgSnap.exists) {
        const msgData = msgSnap.data() || {};
        const seenBy: string[] = msgData.seenBy || [];
        if (!seenBy.includes(readerName)) {
          seenBy.push(readerName);
          const updateData: any = { seenBy };
          // If seen by multiple or direct chat partner, mark as seen
          updateData.status = 'seen';
          await msgRef.update(updateData);
        }
      }
    } else {
      // Mark ALL messages in this chat as seen by this reader
      const messagesSnap = await getChatMessageDocs(chatId);
      for (const doc of messagesSnap.docs) {
        const msgData = doc.data();
        if (msgData.senderName !== readerName) {
          const seenBy: string[] = msgData.seenBy || [];
          if (!seenBy.includes(readerName)) {
            seenBy.push(readerName);
            await doc.ref.update({
              seenBy,
              status: 'seen'
            });
          }
        }
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating read receipts:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. POST to create group
router.post('/group/create', async (req: Request, res: Response) => {
  try {
    const { group } = req.body;
    const uid = group?.groupDetails?.ownerId || null;
    if (!group) {
      return res.status(400).json({ error: 'Missing group payload' });
    }

    const { messages, typingUsers: _omitTyping, ...restMeta } = group;
    const chatMeta = {
      ...restMeta,
      isGroup: restMeta.isGroup ?? true,
      isPublicChannel: restMeta.isPublicChannel ?? true,
      participantIds: Array.isArray(restMeta.participantIds)
        ? restMeta.participantIds
        : uid
          ? [uid]
          : [],
      updatedAt: Date.now()
    };
    
    // Save metadata
    await db.collection('chats').doc(group.id).set(chatMeta);

    // Save initial system message
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        await db.collection('chats').doc(group.id).collection('messages').doc(msg.id).set(msg);
      }
    }

    res.json({ success: true, group });
  } catch (error: any) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. POST to update group details
router.post('/group/update', async (req: Request, res: Response) => {
  try {
    const { chatId, name, description, photo, systemMessage } = req.body;
    if (!chatId) {
      return res.status(400).json({ error: 'Missing chatId' });
    }

    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chatData = chatSnap.data() || {};
    const groupDetails = { ...(chatData.groupDetails || {}) };

    if (name) groupDetails.name = name;
    if (description !== undefined) groupDetails.description = description;
    if (photo) groupDetails.photo = photo;

    const updates: any = {
      sender: name || chatData.sender,
      avatar: photo || chatData.avatar,
      groupDetails
    };

    await chatRef.update(updates);

    if (systemMessage) {
      await chatRef.collection('messages').doc(systemMessage.id).set(systemMessage);
    }

    res.json({ success: true, groupDetails });
  } catch (error: any) {
    console.error('Error updating group details:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. POST to update group members/roles
router.post('/group/members', async (req: Request, res: Response) => {
  try {
    const { chatId, adminIds, memberIds, memberCount, ownerId, systemMessage } = req.body;
    if (!chatId) {
      return res.status(400).json({ error: 'Missing chatId' });
    }

    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const chatData = chatSnap.data() || {};
    const groupDetails = { ...(chatData.groupDetails || {}) };

    if (adminIds) groupDetails.adminIds = adminIds;
    if (memberIds) groupDetails.memberIds = memberIds;
    if (memberCount !== undefined) groupDetails.memberCount = memberCount;
    if (ownerId) groupDetails.ownerId = ownerId;

    await chatRef.update({ groupDetails });

    if (systemMessage) {
      await chatRef.collection('messages').doc(systemMessage.id).set(systemMessage);
    }

    res.json({ success: true, groupDetails });
  } catch (error: any) {
    console.error('Error updating group members:', error);
    res.status(500).json({ error: error.message });
  }
});

// 9. POST to delete chat/group
router.post('/group/delete', async (req: Request, res: Response) => {
  try {
    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({ error: 'Missing chatId' });
    }

    // Delete messages first
    const messagesSnap = await getChatMessageDocs(chatId);
    const batch = db.batch();
    messagesSnap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete chat document
    batch.delete(db.collection('chats').doc(chatId));

    await batch.commit();

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 10. SCHEDULED MESSAGE ENGINE ENDPOINTS
// ---------------------------------------------------------

// 10a. POST /api/chat/scheduleMessage
router.post('/scheduleMessage', async (req: Request, res: Response) => {
  try {
    const {
      senderId = 'alex_m.synapse',
      senderName = 'You',
      senderAvatar = 'https://i.pravatar.cc/150?u=you',
      chatId,
      text,
      scheduledDate,
      scheduledTime,
      scheduledTimestamp,
      repeat = 'once',
      attachments
    } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'Missing recipient or chatId' });
    }
    if (!scheduledTimestamp || isNaN(scheduledTimestamp)) {
      return res.status(400).json({ error: 'Missing or invalid scheduledTimestamp' });
    }
    if (!scheduledDate || !scheduledTime) {
      return res.status(400).json({ error: 'Missing scheduledDate or scheduledTime' });
    }

    const scheduledRecord = await scheduledMessageEngine.scheduleMessage({
      senderId,
      senderName,
      senderAvatar,
      chatId,
      text: text || '',
      scheduledDate,
      scheduledTime,
      scheduledTimestamp: Number(scheduledTimestamp),
      repeat,
      attachments
    });

    res.json({
      success: true,
      message: 'Message scheduled successfully',
      scheduledMessage: {
        ...scheduledRecord,
        text: text || ''
      }
    });
  } catch (error: any) {
    console.error('Error scheduling message:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10b. GET /api/chat/scheduledMessages
router.get('/scheduledMessages', async (req: Request, res: Response) => {
  try {
    const senderId = (req.query.senderId as string) || 'alex_m.synapse';
    const chatId = req.query.chatId as string | undefined;

    const list = await scheduledMessageEngine.getScheduledMessages(senderId, chatId);
    res.json({
      success: true,
      senderId,
      scheduledMessages: list
    });
  } catch (error: any) {
    console.error('Error fetching scheduled messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10c. POST /api/chat/updateScheduledMessage
router.post('/updateScheduledMessage', async (req: Request, res: Response) => {
  try {
    const {
      messageId,
      senderId = 'alex_m.synapse',
      text,
      chatId,
      scheduledDate,
      scheduledTime,
      scheduledTimestamp,
      repeat
    } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'Missing messageId parameter' });
    }

    const updated = await scheduledMessageEngine.updateScheduledMessage({
      messageId,
      senderId,
      text,
      chatId,
      scheduledDate,
      scheduledTime,
      scheduledTimestamp: scheduledTimestamp ? Number(scheduledTimestamp) : undefined,
      repeat
    });

    res.json({
      success: true,
      message: 'Scheduled message updated successfully',
      scheduledMessage: updated
    });
  } catch (error: any) {
    console.error('Error updating scheduled message:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10d. POST /api/chat/cancelScheduledMessage
router.post('/cancelScheduledMessage', async (req: Request, res: Response) => {
  try {
    const { messageId, senderId = 'alex_m.synapse' } = req.body;
    if (!messageId) {
      return res.status(400).json({ error: 'Missing messageId parameter' });
    }

    const result = await scheduledMessageEngine.cancelScheduledMessage(messageId, senderId);
    res.json(result);
  } catch (error: any) {
    console.error('Error cancelling scheduled message:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10e. POST /api/chat/sendScheduledImmediately
router.post('/sendScheduledImmediately', async (req: Request, res: Response) => {
  try {
    const { messageId, senderId = 'alex_m.synapse' } = req.body;
    if (!messageId) {
      return res.status(400).json({ error: 'Missing messageId parameter' });
    }

    const result = await scheduledMessageEngine.sendScheduledImmediately(messageId, senderId);
    res.json(result);
  } catch (error: any) {
    console.error('Error sending scheduled message immediately:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10f. POST /api/chat/deleteScheduledMessage
router.post('/deleteScheduledMessage', async (req: Request, res: Response) => {
  try {
    const { messageId, senderId = 'alex_m.synapse' } = req.body;
    if (!messageId) {
      return res.status(400).json({ error: 'Missing messageId parameter' });
    }

    const result = await scheduledMessageEngine.deleteScheduledMessage(messageId, senderId);
    res.json(result);
  } catch (error: any) {
    console.error('Error deleting scheduled message:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10g. POST /api/chat/parseScheduledTime
router.post('/parseScheduledTime', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const result = parseNaturalLanguageTime(text || '');
    res.json({
      success: true,
      parsed: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10h. GET /api/chat/scheduledNotifications
router.get('/scheduledNotifications', async (req: Request, res: Response) => {
  try {
    const senderId = (req.query.senderId as string) || 'alex_m.synapse';
    const notifications = await scheduledMessageEngine.getScheduledNotifications(senderId);
    res.json({
      success: true,
      senderId,
      notifications
    });
  } catch (error: any) {
    console.error('Error fetching scheduled notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10i. POST /api/chat/triggerScheduledDeliveryCheck
router.post('/triggerScheduledDeliveryCheck', async (req: Request, res: Response) => {
  try {
    const result = await scheduledMessageEngine.processDueScheduledMessages();
    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error('Error triggering scheduled delivery check:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper for semantic vector generation
async function getSemanticVector(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return VectorUtils.generateFastTextVector('');
  }
  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text
      });
      if (response && response.embedding && response.embedding.values) {
        return VectorUtils.compressVectorTo64d(response.embedding.values);
      }
    }
  } catch (err) {
    // Fall back smoothly to fast text vector
  }
  return VectorUtils.generateFastTextVector(text);
}

// ---------------------------------------------------------
// 11. SAVE TO AI BRAIN ENDPOINTS
// ---------------------------------------------------------

// 11a. POST /api/chat/saveToBrain
router.post('/saveToBrain', async (req: Request, res: Response) => {
  try {
    const { messageId, chatId, senderId = 'alex_m.synapse', senderName, text = '', attachments = null, timestamp, sourceConversation = '' } = req.body;
    if (!messageId || !chatId) {
      return res.status(400).json({ error: 'Missing required parameters: messageId, chatId' });
    }

    const ownerUid = senderId;

    // Generate vector embedding
    const embedding = await getSemanticVector(text || (attachments?.documentName || attachments?.image || 'Transmission Attachment'));

    const savedRecord = {
      id: messageId,
      userId: ownerUid,
      messageId,
      chatId,
      senderId,
      senderName: senderName || 'Anonymous',
      text: text || '',
      attachments: attachments || null,
      timestamp: timestamp || new Date().toISOString(),
      sourceConversation: sourceConversation || chatId,
      embedding,
      savedTimestamp: Date.now()
    };

    // Save in saved_brain_messages collection
    await db.collection('saved_brain_messages').doc(messageId).set(savedRecord);

    // Update message doc in chats collection
    try {
      await db.collection('chats').doc(chatId).collection('messages').doc(messageId).update({
        isSavedToBrain: true
      });
    } catch (e) {
      console.warn('Could not update message doc isSavedToBrain:', e);
    }

    res.json({
      success: true,
      message: 'Message saved to AI Brain and vector indexed',
      savedMessage: savedRecord
    });
  } catch (error: any) {
    console.error('Error saving message to AI Brain:', error);
    res.status(500).json({ error: error.message });
  }
});

// 11b. POST /api/chat/unsaveFromBrain
router.post('/unsaveFromBrain', async (req: Request, res: Response) => {
  try {
    const { messageId, chatId } = req.body;
    if (!messageId) {
      return res.status(400).json({ error: 'Missing messageId parameter' });
    }

    await db.collection('saved_brain_messages').doc(messageId).delete();

    if (chatId) {
      try {
        await db.collection('chats').doc(chatId).collection('messages').doc(messageId).update({
          isSavedToBrain: false
        });
      } catch (e) {
        console.warn('Could not update message doc isSavedToBrain:', e);
      }
    }

    res.json({ success: true, message: 'Message removed from AI Brain' });
  } catch (error: any) {
    console.error('Error removing message from AI Brain:', error);
    res.status(500).json({ error: error.message });
  }
});

// 11c. GET /api/chat/savedBrainMessages
router.get('/savedBrainMessages', async (req: Request, res: Response) => {
  try {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : null;
    const snap = userId
      ? await db.collection('saved_brain_messages').where('userId', '==', userId).get()
      : await db.collection('saved_brain_messages').where('savedTimestamp', '>=', 0).get();
    const savedMessages = snap.docs.map(d => d.data());
    savedMessages.sort((a: any, b: any) => (b.savedTimestamp || 0) - (a.savedTimestamp || 0));

    res.json({
      success: true,
      savedMessages
    });
  } catch (error: any) {
    console.error('Error fetching saved brain messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 12. SEMANTIC SEARCH ENDPOINT
// ---------------------------------------------------------

// 12a. POST /api/chat/semanticSearch
router.post('/semanticSearch', async (req: Request, res: Response) => {
  try {
    const uid = req.body?.userId || req.body?.senderId || null;
    const {
      query = '',
      chatId,
      senderId,
      type = 'all',
      dateRange = 'all',
      mediaType = 'all'
    } = req.body;

    if (!query || query.trim().length === 0) {
      return res.json({ success: true, query: '', results: [] });
    }

    const queryVector = await getSemanticVector(query);

    const chatDocs = await getAuthorizedChatDocs(uid);
    const allMatches: any[] = [];

    const now = Date.now();
    let minTimestamp = 0;
    if (dateRange === 'today') minTimestamp = now - 86400000;
    else if (dateRange === '7days') minTimestamp = now - (7 * 86400000);
    else if (dateRange === '30days') minTimestamp = now - (30 * 86400000);

    for (const chatDoc of chatDocs) {
      const chatData = chatDoc.data();

      if (chatId && chatDoc.id !== chatId) continue;
      if (type === 'dm' && chatData.isGroup) continue;
      if (type === 'group' && !chatData.isGroup) continue;

      const messagesSnap = await getChatMessageDocs(chatDoc.id);

      for (const msgDoc of messagesSnap.docs) {
        const msg = msgDoc.data();

        if (senderId && msg.senderId !== senderId) continue;

        if (mediaType === 'image' && !msg.image) continue;
        if (mediaType === 'video' && !msg.videoUrl) continue;
        if (mediaType === 'document' && !msg.documentName) continue;
        if (mediaType === 'audio' && !msg.audioUrl) continue;
        if (mediaType === 'text' && (msg.image || msg.videoUrl || msg.documentName || msg.audioUrl)) continue;

        const msgText = msg.text || msg.documentName || (msg.image ? 'Image attachment' : '');
        if (!msgText) continue;

        const msgVector = msg.semanticAnalysis?.embeddingVector || VectorUtils.generateFastTextVector(msgText);
        const similarity = VectorUtils.cosineSimilarity(queryVector, msgVector);

        const queryLower = query.toLowerCase();
        const textLower = msgText.toLowerCase();
        const keywordExactMatch = textLower.includes(queryLower);
        const finalScore = Math.min(0.99, similarity + (keywordExactMatch ? 0.35 : 0));

        if (finalScore >= 0.15 || keywordExactMatch) {
          allMatches.push({
            message: msg,
            chatId: chatDoc.id,
            conversationName: chatData.sender || chatData.groupDetails?.name || 'Direct Transmission',
            conversationAvatar: chatData.avatar || chatData.groupDetails?.photo || '',
            similarity: Number(finalScore.toFixed(2)),
            matchScore: Math.round(finalScore * 100)
          });
        }
      }
    }

    allMatches.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      query,
      results: allMatches.slice(0, 30)
    });
  } catch (error: any) {
    console.error('Error executing semantic search:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// 13. MULTI-DEVICE SYNC STATE ENDPOINT
// ---------------------------------------------------------

// 13a. POST /api/chat/syncState
router.post('/syncState', async (req: Request, res: Response) => {
  try {
    const uid = req.body?.userId || req.body?.senderId || null;

    await scheduledMessageEngine.processDueScheduledMessages().catch(() => {});

    const chatDocs = await getAuthorizedChatDocs(uid);
    const updatedConversations: any[] = [];

    for (const chatDoc of chatDocs) {
      const chatData = chatDoc.data();
      const messagesSnap = await getChatMessageDocs(chatDoc.id);
      const messages = messagesSnap.docs.map(d => d.data());

      messages.sort((a: any, b: any) => {
        const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
        const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
        return aNum - bNum;
      });

      updatedConversations.push({
        id: chatDoc.id,
        ...chatData,
        messages
      });
    }

    const savedBrainSnap = uid
      ? await db.collection('saved_brain_messages').where('userId', '==', uid).get()
      : await db.collection('saved_brain_messages').where('savedTimestamp', '>=', 0).get();
    const savedBrainMessageIds = savedBrainSnap.docs.map(d => d.id);

    const scheduledList = await scheduledMessageEngine.getScheduledMessages(uid || 'alex_m.synapse');

    res.json({
      success: true,
      serverTimestamp: Date.now(),
      conversations: updatedConversations,
      savedBrainMessageIds,
      scheduledMessages: scheduledList
    });
  } catch (error: any) {
    console.error('Error fetching multi-device sync state:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
