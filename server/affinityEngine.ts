import fs from 'fs';
import path from 'path';
import { trustScoreEngine } from './trustEngine';
import { identityEngine } from './identityEngine';
import { identityDriftEngine } from './identityDriftEngine';

// Behavioral Vector dimensions (0.0 to 1.0)
export interface BehaviourVector {
  curiosity: number;
  technicalInterest: number;
  creativity: number;
  leadership: number;
  communicationStyle: number; // 0.0 (analytical) to 1.0 (casual/supportive)
  knowledgeSharing: number;
  consistency: number;
  discipline: number;
  collaborationTendency: number;
  humourStyle: number;
  emotionalTone: number; // 0.0 (stoic/objective) to 1.0 (empathic/warm)
  problemSolvingApproach: number; // 0.0 (logical/linear) to 1.0 (intuitive/lateral)
}

export interface ConversationQualityMetrics {
  averageDepth: number; // Avg message character count / 100
  questionQuality: number; // Score 0-100 of intellectual curiosity
  mutualEngagement: number; // Ratio of back-and-forth (0.0 to 1.0)
  knowledgeExchange: number; // Count of terms like code, learn, logic, research
  positiveInteractionRatio: number; // Score 0.0 to 1.0
  conversationContinuity: number; // Score 0-100 of follow-ups
  lastMessageTime: number;
}

export interface UserAffinityProfile {
  userId: string;
  name: string;
  interests: string[];
  skills: string[];
  learningAreas: string[];
  communities: string[];
  activeHours: number[]; // Frequency array of active hours (length 24)
  goals: string[];
  behaviorVector: BehaviourVector;
  
  // Dynamic metrics mapped by partner userId
  affinityScores: Record<string, number>; // Calculated score (0-100)
  trustScores: Record<string, number>; // Calculated trust (0-100)
  collaborationScores: Record<string, number>; // Calculated collab potential (0-100)
  stabilityPredictions: Record<string, number>; // Calculated relationship stability % (0-100)
  
  conversationHistory: Record<string, ConversationQualityMetrics>;
  collaborationHistory: Record<string, { sessionsJoined: number; successfulCompletions: number }>;
  interestHistory: { timestamp: number; interests: string[] }[];
  growthDirection: {
    futureInterestsPredicted: string[];
    evolutionTrend: string; // e.g. "tech-focused", "managerial", "creative"
  };
}

export interface EngineWeights {
  interestSimilarity: number;
  communicationCompatibility: number;
  activeTimeOverlap: number;
  learningAlignment: number;
  personalityAlignment: number;
  trustScore: number;
  collaborationPotential: number;
  conversationQuality: number;
  knowledgeComplementarity: number;
  growthDirectionSimilarity: number;
}

const STORAGE_PATH = path.join(process.cwd(), 'affinity_profiles.json');

// Prepopulated seed profiles for Alex (the operator) and Nexora mock users
const SEED_PROFILES: Record<string, Partial<UserAffinityProfile>> = {
  'alex': {
    userId: 'alex',
    name: 'Alex M.',
    interests: ['Advanced Coding', 'Stoic Philosophy', 'Deep Work', 'AI'],
    skills: ['React', 'TypeScript', 'Node.js', 'System Architecture'],
    learningAreas: ['Machine Learning', 'Quantum Computing', 'Biohacking'],
    communities: ['deep-work', 'startup-builders'],
    activeHours: [0,0,0,0,0,0,0,1,2,5,8,12,15,14,12,15,18,20,24,22,18,10,5,2], // Afternoon & evening peak
    goals: ['Protect productivity streak', 'Secure level 5 node authority', 'Launch decentralized app'],
    behaviorVector: {
      curiosity: 0.85,
      technicalInterest: 0.95,
      creativity: 0.75,
      leadership: 0.60,
      communicationStyle: 0.35, // More analytical
      knowledgeSharing: 0.80,
      consistency: 0.90,
      discipline: 0.92,
      collaborationTendency: 0.70,
      humourStyle: 0.50,
      emotionalTone: 0.40, // Lean towards stoic
      problemSolvingApproach: 0.20 // Very logical/linear
    }
  },
  'sarah': {
    userId: 'sarah',
    name: 'Sarah J.',
    interests: ['Deep Work', 'UI Design', 'Philosophy', 'Productivity'],
    skills: ['UI/UX', 'Product Management', 'Branding', 'Stoic Principles'],
    learningAreas: ['Advanced Coding', 'Venture Capital', 'Growth Marketing'],
    communities: ['deep-work', 'growth-circle'],
    activeHours: [0,0,0,0,0,1,3,8,15,22,25,20,18,15,14,16,19,20,15,10,6,2,1,0], // Early riser & morning peak
    goals: ['Build beautiful interfaces', 'Cultivate relentless focus habits', 'Establish a startup incubator'],
    behaviorVector: {
      curiosity: 0.90,
      technicalInterest: 0.65,
      creativity: 0.85,
      leadership: 0.90, // Strong leader
      communicationStyle: 0.75, // Warm/casual
      knowledgeSharing: 0.85,
      consistency: 0.95,
      discipline: 0.95,
      collaborationTendency: 0.85,
      humourStyle: 0.60,
      emotionalTone: 0.70, // Empathic
      problemSolvingApproach: 0.60 // Balanced
    }
  },
  'kira': {
    userId: 'kira',
    name: 'Kira L.',
    interests: ['Machine Learning', 'Neural Networks', 'Advanced Coding', 'AI Research'],
    skills: ['Python', 'PyTorch', 'Data Engineering', 'Algorithms'],
    learningAreas: ['Creative Coding', 'Leadership', 'Neuroscience'],
    communities: ['deep-work', 'startup-builders'],
    activeHours: [2,5,8,6,3,1,0,0,1,2,4,8,12,15,16,18,20,22,24,25,22,18,12,8], // Late night coder
    goals: ['Train self-correcting neural model', 'Improve communication and public speaking', 'Read 24 research papers'],
    behaviorVector: {
      curiosity: 0.95,
      technicalInterest: 0.98,
      creativity: 0.80,
      leadership: 0.45, // More of a heads-down specialist
      communicationStyle: 0.20, // High-density analytical
      knowledgeSharing: 0.75,
      consistency: 0.80,
      discipline: 0.85,
      collaborationTendency: 0.60,
      humourStyle: 0.40,
      emotionalTone: 0.30, // Extremely stoic/logical
      problemSolvingApproach: 0.10 // Strictly logical/mathematical
    }
  },
  'marcus': {
    userId: 'marcus',
    name: 'Marcus D.',
    interests: ['Stoic Philosophy', 'Human Longevity', 'Writing', 'Digital Nomadism'],
    skills: ['Technical Writing', 'Biohacking', 'Creative Writing', 'Philosophy'],
    learningAreas: ['Advanced Coding', 'Data Visualization', 'Economics'],
    communities: ['growth-circle'],
    activeHours: [0,0,0,0,1,4,10,18,22,24,20,15,12,10,10,12,15,18,20,18,12,6,2,1], // Well-balanced routine
    goals: ['Complete 30-day journaling protocol', 'Optimize sleep architecture', 'Learn basic web development'],
    behaviorVector: {
      curiosity: 0.88,
      technicalInterest: 0.50,
      creativity: 0.75,
      leadership: 0.75,
      communicationStyle: 0.80, // Very balanced, supportive
      knowledgeSharing: 0.90,
      consistency: 0.92,
      discipline: 0.96,
      collaborationTendency: 0.65,
      humourStyle: 0.45,
      emotionalTone: 0.80, // Stoic but extremely compassionate
      problemSolvingApproach: 0.70 // High lateral intuition
    }
  },
  'elena': {
    userId: 'elena',
    name: 'Elena V.',
    interests: ['Quantum Computing', 'Mathematics', 'AI', 'Digital Art'],
    skills: ['Quantum Mechanics', 'Linear Algebra', 'Generative Art', 'Python'],
    learningAreas: ['Rust Programming', 'Decentralized Finance', 'Cognitive Psychology'],
    communities: ['deep-work', 'growth-circle'],
    activeHours: [1,1,0,0,0,1,2,5,10,15,18,20,18,15,16,18,22,25,22,18,14,10,6,3], // Academic hybrid peaks
    goals: ['Publish paper on quantum state optimization', 'Design generative art series', 'Contribute to open source'],
    behaviorVector: {
      curiosity: 0.98,
      technicalInterest: 0.92,
      creativity: 0.92, // Strong hybrid tech + creative
      leadership: 0.65,
      communicationStyle: 0.60, // Clear and structural
      knowledgeSharing: 0.95,
      consistency: 0.80,
      discipline: 0.84,
      collaborationTendency: 0.80,
      humourStyle: 0.70,
      emotionalTone: 0.60,
      problemSolvingApproach: 0.50 // Combines logic and abstract math intuition
    }
  },
  'rayan': {
    userId: 'rayan',
    name: 'Rayan K.',
    interests: ['Advanced Coding', 'Stoic Philosophy', 'Deep Work'],
    skills: ['Software Engineering', 'System Design', 'Algorithms'],
    learningAreas: ['Product Growth', 'Artificial Intelligence', 'Public Speaking'],
    communities: ['deep-work', 'startup-builders'],
    activeHours: [0,0,0,0,0,1,4,12,18,22,24,20,15,12,15,18,20,22,20,15,10,5,2,1],
    goals: ['Accelerate backend builds', 'Develop mental resilience', 'Co-found tech community'],
    behaviorVector: {
      curiosity: 0.84,
      technicalInterest: 0.88,
      creativity: 0.70,
      leadership: 0.70,
      communicationStyle: 0.50,
      knowledgeSharing: 0.80,
      consistency: 0.86,
      discipline: 0.88,
      collaborationTendency: 0.75,
      humourStyle: 0.60,
      emotionalTone: 0.55,
      problemSolvingApproach: 0.30
    }
  },
  'sienna': {
    userId: 'sienna',
    name: 'Sienna M.',
    interests: ['Biohacking', 'Human Longevity', 'Growth Marketing'],
    skills: ['Conversion Rate Optimization', 'Data Analytics', 'Bio-metric Tracking', 'Copywriting'],
    learningAreas: ['Advanced Coding', 'Nutritional Science', 'Behavioral Psychology'],
    communities: ['growth-circle'],
    activeHours: [0,0,0,0,0,2,6,12,20,24,22,18,15,12,12,15,18,22,24,20,15,8,3,1],
    goals: ['Optimize recovery cycles', 'Scale growth campaigns to 1M users', 'Learn python for data analysis'],
    behaviorVector: {
      curiosity: 0.92,
      technicalInterest: 0.60,
      creativity: 0.88,
      leadership: 0.82,
      communicationStyle: 0.88, // Very warm and persuasive
      knowledgeSharing: 0.92,
      consistency: 0.90,
      discipline: 0.88,
      collaborationTendency: 0.90, // Relentless team-player
      humourStyle: 0.75,
      emotionalTone: 0.82,
      problemSolvingApproach: 0.75
    }
  },
  'leo': {
    userId: 'leo',
    name: 'Leo T.',
    interests: ['SaaS Entrepreneurship', 'Venture Capital', 'Digital Nomadism'],
    skills: ['Financial Modeling', 'Venture Pitching', 'SaaS Architecture', 'Sales'],
    learningAreas: ['AI Foundations', 'Remote Team Management', 'UI Design'],
    communities: ['startup-builders'],
    activeHours: [1,0,0,0,0,1,3,10,15,18,20,22,24,22,20,18,18,20,22,24,20,12,6,2],
    goals: ['Raise pre-seed round', 'Automate lead-gen workflows', 'Establish continuous travel routine'],
    behaviorVector: {
      curiosity: 0.85,
      technicalInterest: 0.72,
      creativity: 0.82,
      leadership: 0.92, // Entrepreneurial leader
      communicationStyle: 0.90, // Outgoing and direct
      knowledgeSharing: 0.78,
      consistency: 0.82,
      discipline: 0.84,
      collaborationTendency: 0.82,
      humourStyle: 0.85, // Highly humorous
      emotionalTone: 0.68,
      problemSolvingApproach: 0.80 // Intuitive business approach
    }
  }
};

export class AffinityEngine {
  private profiles: Record<string, UserAffinityProfile> = {};
  private weights: EngineWeights = {
    interestSimilarity: 0.12,
    communicationCompatibility: 0.10,
    activeTimeOverlap: 0.08,
    learningAlignment: 0.11,
    personalityAlignment: 0.10,
    trustScore: 0.15,
    collaborationPotential: 0.12,
    conversationQuality: 0.12,
    knowledgeComplementarity: 0.05,
    growthDirectionSimilarity: 0.05
  };
  private isSaving = false;

  constructor() {
    this.loadProfiles();
  }

  private loadProfiles() {
    try {
      if (fs.existsSync(STORAGE_PATH)) {
        const raw = fs.readFileSync(STORAGE_PATH, 'utf-8');
        this.profiles = JSON.parse(raw);
        console.log(`[AffinityEngine] Successfully loaded ${Object.keys(this.profiles).length} user affinity profiles.`);
      } else {
        console.log('[AffinityEngine] Storage file not found. Seeding initial profile vectors...');
        this.seedInitialData();
      }
    } catch (err) {
      console.error('[AffinityEngine] Failed to load profiles. Using fallback memory cache.', err);
      this.seedInitialData();
    }
  }

  private async saveProfiles() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      await fs.promises.writeFile(STORAGE_PATH, JSON.stringify(this.profiles, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AffinityEngine] Failed to save profiles to disk:', err);
    } finally {
      this.isSaving = false;
    }
  }

  private seedInitialData() {
    this.profiles = {};
    for (const [id, seed] of Object.entries(SEED_PROFILES)) {
      this.profiles[id] = this.createDefaultProfile(id, seed.name || id, seed);
    }
    
    // Perform initial calculations across all seeded pairs
    this.recalculateAllPairs();
    this.saveProfiles();
  }

  private createDefaultProfile(userId: string, name: string, overrides: Partial<UserAffinityProfile> = {}): UserAffinityProfile {
    const defaultHours = Array(24).fill(0).map((_, h) => {
      if (h >= 9 && h <= 18) return 10; // default working hours focus
      if (h >= 19 && h <= 23) return 5;
      return 0;
    });

    return {
      userId,
      name,
      interests: overrides.interests || [],
      skills: overrides.skills || [],
      learningAreas: overrides.learningAreas || [],
      communities: overrides.communities || [],
      activeHours: overrides.activeHours || defaultHours,
      goals: overrides.goals || [],
      behaviorVector: overrides.behaviorVector || {
        curiosity: 0.5,
        technicalInterest: 0.5,
        creativity: 0.5,
        leadership: 0.5,
        communicationStyle: 0.5,
        knowledgeSharing: 0.5,
        consistency: 0.5,
        discipline: 0.5,
        collaborationTendency: 0.5,
        humourStyle: 0.5,
        emotionalTone: 0.5,
        problemSolvingApproach: 0.5
      },
      affinityScores: {},
      trustScores: {},
      collaborationScores: {},
      stabilityPredictions: {},
      conversationHistory: {},
      collaborationHistory: {},
      interestHistory: [{ timestamp: Date.now(), interests: overrides.interests || [] }],
      growthDirection: {
        futureInterestsPredicted: overrides.learningAreas || [],
        evolutionTrend: overrides.interests && overrides.interests.some(i => i.toLowerCase().includes('coding') || i.toLowerCase().includes('tech')) ? 'tech-focused' : 'growth-focused'
      }
    };
  }

  /**
   * Safe profile retrieval, creating one if it doesn't exist
   */
  public getOrCreateProfile(userId: string, name: string): UserAffinityProfile {
    const normalizedId = userId.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!this.profiles[normalizedId]) {
      this.profiles[normalizedId] = this.createDefaultProfile(normalizedId, name);
      this.saveProfiles();
    }
    return this.profiles[normalizedId];
  }

  /**
   * API to record custom user activity, modifying behavior vectors silently
   */
  public recordUserActivity(userId: string, activityType: string, meta: any = {}) {
    const profile = this.profiles[userId.toLowerCase().replace(/[^a-z0-9]/g, '')];
    if (!profile) return;

    const currentHour = new Date().getHours();
    profile.activeHours[currentHour] = (profile.activeHours[currentHour] || 0) + 1;

    const vec = profile.behaviorVector;

    // Silently notify TrustScoreEngine
    trustScoreEngine.recordActivity(userId, activityType, meta);

    // Silently notify IdentityEngine
    identityEngine.recordBehavior(userId, activityType, meta).catch(err => {
      console.warn('[AffinityEngine] Error notifying IdentityEngine:', err);
    });

    // Silently notify IdentityDriftEngine
    identityDriftEngine.observeActivity(userId, activityType, { ...meta, userProfileContext: meta.userProfileContext }).catch(err => {
      console.warn('[AffinityEngine] Error notifying IdentityDriftEngine:', err);
    });

    // Incremental reinforcement of traits based on actions (silently evolve)
    switch (activityType) {
      case 'focus_session_completed':
        vec.discipline = Math.min(1.0, vec.discipline + 0.005);
        vec.consistency = Math.min(1.0, vec.consistency + 0.003);
        break;
      case 'joined_group':
        vec.collaborationTendency = Math.min(1.0, vec.collaborationTendency + 0.008);
        if (meta.groupId) {
          if (!profile.communities.includes(meta.groupId)) {
            profile.communities.push(meta.groupId);
          }
        }
        break;
      case 'viewed_academic_resource':
        vec.curiosity = Math.min(1.0, vec.curiosity + 0.006);
        break;
      case 'created_creative_post':
        vec.creativity = Math.min(1.0, vec.creativity + 0.008);
        break;
      case 'solved_complex_math':
        vec.technicalInterest = Math.min(1.0, vec.technicalInterest + 0.01);
        vec.problemSolvingApproach = Math.max(0.0, vec.problemSolvingApproach - 0.008); // More logical
        break;
      case 'guided_peer':
        vec.leadership = Math.min(1.0, vec.leadership + 0.009);
        vec.knowledgeSharing = Math.min(1.0, vec.knowledgeSharing + 0.008);
        vec.emotionalTone = Math.min(1.0, vec.emotionalTone + 0.005); // More warm/empathic
        break;
    }

    this.recalculateUserAffinities(profile.userId);
    this.saveProfiles();
  }

  /**
   * Record a peer interaction: message, post interaction, feedback
   */
  public recordInteraction(userAId: string, userBId: string, interactionType: string, meta: any = {}) {
    const idA = userAId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idB = userBId.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (idA === idB) return;

    const profA = this.profiles[idA] || this.createDefaultProfile(idA, userAId);
    const profB = this.profiles[idB] || this.createDefaultProfile(idB, userBId);

    this.profiles[idA] = profA;
    this.profiles[idB] = profB;

    // Silently notify TrustScoreEngine about interaction details
    if (interactionType === 'chat_message_sent') {
      trustScoreEngine.recordActivity(userAId, 'chat_message_sent', { ...meta, consecutiveMessageCount: 1 });
    } else if (interactionType === 'collaborated_on_session') {
      trustScoreEngine.recordActivity(userAId, 'collaboration_session_ended', { success: meta.success });
      trustScoreEngine.recordActivity(userBId, 'collaboration_session_ended', { success: meta.success });
    } else if (interactionType === 'report_toxic_behavior') {
      trustScoreEngine.recordActivity(userBId, 'toxic_behavior_flagged', meta);
      trustScoreEngine.recordActivity(userAId, 'community_report_filed', meta);
    }

    // Initialize partner fields if needed
    if (!profA.trustScores[idB]) profA.trustScores[idB] = 50; // Initial neutral trust
    if (!profB.trustScores[idA]) profB.trustScores[idA] = 50;

    switch (interactionType) {
      case 'chat_message_sent': {
        const text = meta.text || '';
        const charCount = text.length;
        
        // Quality evaluation over volume
        let qualityMetrics = profA.conversationHistory[idB] || {
          averageDepth: 0.5,
          questionQuality: 50,
          mutualEngagement: 0.5,
          knowledgeExchange: 0,
          positiveInteractionRatio: 0.6,
          conversationContinuity: 50,
          lastMessageTime: Date.now()
        };

        const depth = Math.min(5.0, charCount / 100);
        qualityMetrics.averageDepth = qualityMetrics.averageDepth * 0.8 + depth * 0.2;

        const isQuestion = text.includes('?') && charCount > 15;
        if (isQuestion) {
          qualityMetrics.questionQuality = Math.min(100, qualityMetrics.questionQuality + 5);
        }

        const keywords = ['how', 'why', 'code', 'build', 'learn', 'logic', 'research', 'solve', 'theory', 'quantum', 'mind', 'philosophy'];
        let matches = 0;
        keywords.forEach(kw => {
          if (text.toLowerCase().includes(kw)) matches++;
        });
        qualityMetrics.knowledgeExchange += matches;

        // Mutual engagement calculation based on response speed and symmetry
        const delay = Date.now() - qualityMetrics.lastMessageTime;
        if (delay < 5 * 60 * 1000) { // Conversational continuity (under 5 minutes)
          qualityMetrics.conversationContinuity = Math.min(100, qualityMetrics.conversationContinuity + 3);
        } else if (delay > 48 * 60 * 60 * 1000) { // Drifting apart
          qualityMetrics.conversationContinuity = Math.max(10, qualityMetrics.conversationContinuity - 10);
        }

        qualityMetrics.lastMessageTime = Date.now();
        profA.conversationHistory[idB] = qualityMetrics;

        // Trust score increases slowly for stable communication
        profA.trustScores[idB] = Math.min(100, profA.trustScores[idB] + 0.5);
        profB.trustScores[idA] = Math.min(100, profB.trustScores[idA] + 0.3); // Reciprocal slight boost

        // Evolve communication styles
        profA.behaviorVector.communicationStyle = Math.min(1.0, profA.behaviorVector.communicationStyle * 0.95 + 0.05 * (isQuestion ? 0.8 : 0.4));
        break;
      }

      case 'collaborated_on_session': {
        const historyA = profA.collaborationHistory[idB] || { sessionsJoined: 0, successfulCompletions: 0 };
        const historyB = profB.collaborationHistory[idA] || { sessionsJoined: 0, successfulCompletions: 0 };

        historyA.sessionsJoined++;
        historyB.sessionsJoined++;

        if (meta.success) {
          historyA.successfulCompletions++;
          historyB.successfulCompletions++;
          
          profA.trustScores[idB] = Math.min(100, profA.trustScores[idB] + 3.0);
          profB.trustScores[idA] = Math.min(100, profB.trustScores[idA] + 3.0);
          
          // Learn: successful interaction reinforces compatibility
          this.retrainWeightsForPair(profA, profB, 1.0);
        } else {
          // Unsuccessful or interrupted collaboration
          profA.trustScores[idB] = Math.max(0, profA.trustScores[idB] - 1.5);
          profB.trustScores[idA] = Math.max(0, profB.trustScores[idA] - 1.5);
          this.retrainWeightsForPair(profA, profB, 0.0);
        }

        profA.collaborationHistory[idB] = historyA;
        profB.collaborationHistory[idA] = historyB;
        break;
      }

      case 'post_interaction': {
        const type = meta.type || 'view'; // view, like, share, purchase
        let boost = 0.2;
        if (type === 'like') boost = 0.8;
        if (type === 'share') boost = 1.5;
        if (type === 'purchase') boost = 3.0;

        profA.trustScores[idB] = Math.min(100, profA.trustScores[idB] + boost);
        break;
      }

      case 'report_toxic_behavior': {
        // Repeated negative actions trigger steep decay of trust
        profA.trustScores[idB] = Math.max(0, profA.trustScores[idB] - 30);
        profB.trustScores[idA] = Math.max(0, profB.trustScores[idA] - 30);
        this.retrainWeightsForPair(profA, profB, -1.0); // Extremely negative reinforcement
        break;
      }
    }

    this.recalculateUserAffinities(idA);
    this.recalculateUserAffinities(idB);
    this.saveProfiles();
  }

  /**
   * Learning Layer: Self-training mechanism using backpropagation concept
   * Adjusts the core parameter weights based on active interaction success or failure.
   */
  private retrainWeightsForPair(userA: UserAffinityProfile, userB: UserAffinityProfile, feedbackStrength: number) {
    // Determine which parameters are highly aligned between User A and User B
    const scores = this.calculateRawScores(userA, userB);
    
    let totalAdjustment = 0;
    const learningRate = 0.005;

    // Adjust weights based on actual properties of successfully/failed interacting users
    for (const key of Object.keys(this.weights) as Array<keyof EngineWeights>) {
      const componentScore = scores[key] / 100; // Normalized 0.0 to 1.0
      
      // If feedback is positive (1.0), increase weight for attributes that score highly (they define successful pairs)
      // If feedback is negative (-1.0), decrease weight or adjust
      const adjustment = learningRate * feedbackStrength * (componentScore - 0.5);
      this.weights[key] = Math.max(0.02, Math.min(0.35, this.weights[key] + adjustment));
      totalAdjustment += adjustment;
    }

    // Normalize weights so they sum to 1.0
    const currentSum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(this.weights) as Array<keyof EngineWeights>) {
      this.weights[key] = Number((this.weights[key] / currentSum).toFixed(4));
    }
  }

  /**
   * Vector Math: Jaccard similarity for string arrays
   */
  private calculateJaccardSimilarity(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;
    const s1 = new Set(arr1.map(s => s.toLowerCase()));
    const s2 = new Set(arr2.map(s => s.toLowerCase()));
    
    let intersection = 0;
    s1.forEach(v => { if (s2.has(v)) intersection++; });
    
    const union = s1.size + s2.size - intersection;
    return union > 0 ? (intersection / union) * 100 : 0;
  }

  /**
   * Vector Math: Cosine similarity for active hours array
   */
  private calculateHourCosineSimilarity(hoursA: number[], hoursB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < 24; i++) {
      const vA = hoursA[i] || 0;
      const vB = hoursB[i] || 0;
      dotProduct += vA * vB;
      normA += vA * vA;
      normB += vB * vB;
    }

    if (normA === 0 || normB === 0) return 50; // default medium alignment
    return (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))) * 100;
  }

  /**
   * Vector Math: Euclidean distance for behavioral vector similarity
   */
  private calculateBehavioralSimilarity(vA: BehaviourVector, vB: BehaviourVector): number {
    let sumSquaredDiff = 0;
    let keys: (keyof BehaviourVector)[] = [
      'curiosity', 'technicalInterest', 'creativity', 'leadership', 
      'communicationStyle', 'knowledgeSharing', 'consistency', 
      'discipline', 'collaborationTendency', 'humourStyle', 
      'emotionalTone', 'problemSolvingApproach'
    ];

    keys.forEach(key => {
      const valA = vA[key] ?? 0.5;
      const valB = vB[key] ?? 0.5;
      sumSquaredDiff += Math.pow(valA - valB, 2);
    });

    const distance = Math.sqrt(sumSquaredDiff);
    const maxDistance = Math.sqrt(keys.length); // Max possible distance with all values 0 vs 1

    // Complementarity calculation: leadership vs collaboration balance is ideal,
    // whereas discipline & consistency should align. Thus simple Euclidean is normalized beautifully.
    return (1 - (distance / maxDistance)) * 100;
  }

  /**
   * Compute all intermediate metrics for a pair of users
   */
  private calculateRawScores(userA: UserAffinityProfile, userB: UserAffinityProfile): Record<keyof EngineWeights, number> {
    const idA = userA.userId;
    const idB = userB.userId;

    // 1. Interest Similarity
    const interestSimilarity = this.calculateJaccardSimilarity(userA.interests, userB.interests);

    // 2. Active Time Overlap
    const activeTimeOverlap = this.calculateHourCosineSimilarity(userA.activeHours, userB.activeHours);

    // 3. Learning Alignment & Skill Complementarity
    // Complementarity = User A has skill that User B is learning, and User B has skill User A is learning
    const commonLearning = this.calculateJaccardSimilarity(userA.learningAreas, userB.learningAreas);
    
    let complementarityScore = 0;
    const aTeachesB = userA.skills.filter(s => userB.learningAreas.some(l => l.toLowerCase() === s.toLowerCase())).length;
    const bTeachesA = userB.skills.filter(s => userA.learningAreas.some(l => l.toLowerCase() === s.toLowerCase())).length;
    
    if (userA.skills.length > 0 || userB.skills.length > 0) {
      complementarityScore = Math.min(100, ((aTeachesB + bTeachesA) / Math.max(1, userA.skills.length + userB.skills.length)) * 150);
    }
    const learningAlignment = (commonLearning * 0.4) + (complementarityScore * 0.6);

    // 4. Personality Alignment
    const personalityAlignment = this.calculateBehavioralSimilarity(userA.behaviorVector, userB.behaviorVector);

    // 5. Trust Score - integrated directly with the global TrustScoreEngine (0-100)
    const trustScore = trustScoreEngine.getTrustScore(idB);

    // 6. Conversation Quality
    const convA = userA.conversationHistory[idB];
    const convB = userB.conversationHistory[idA];
    let conversationQuality = 50; // default baseline

    if (convA || convB) {
      const avgDepth = ((convA?.averageDepth || 0) + (convB?.averageDepth || 0)) / 2;
      const questionQual = ((convA?.questionQuality || 50) + (convB?.questionQuality || 50)) / 2;
      const continuity = ((convA?.conversationContinuity || 50) + (convB?.conversationContinuity || 50)) / 2;
      
      conversationQuality = Math.min(100, (avgDepth * 15) + (questionQual * 0.4) + (continuity * 0.4));
    }

    // 7. Collaboration Potential
    const colA = userA.collaborationHistory[idB];
    const collabSuccessRate = colA && colA.sessionsJoined > 0 ? (colA.successfulCompletions / colA.sessionsJoined) * 100 : 75;
    const skillComplementarity = complementarityScore;
    
    // Complementary behaviors: e.g. Leader matches with collaborator
    const leaderA = userA.behaviorVector.leadership;
    const collabB = userB.behaviorVector.collaborationTendency;
    const leaderB = userB.behaviorVector.leadership;
    const collabA = userA.behaviorVector.collaborationTendency;
    const leadershipSynergy = Math.max(0, 1 - Math.abs(leaderA - collabB)) * 100;
    const reciprocalSynergy = Math.max(0, 1 - Math.abs(leaderB - collabA)) * 100;
    const behavioralSynergy = (leadershipSynergy + reciprocalSynergy) / 2;

    const collaborationPotential = (collabSuccessRate * 0.3) + (skillComplementarity * 0.4) + (behavioralSynergy * 0.3);

    // 8. Communication Compatibility
    // Matches speed of messaging and tone similarity
    const styleDiff = Math.abs(userA.behaviorVector.communicationStyle - userB.behaviorVector.communicationStyle);
    const toneDiff = Math.abs(userA.behaviorVector.emotionalTone - userB.behaviorVector.emotionalTone);
    const communicationCompatibility = (1 - ((styleDiff + toneDiff) / 2)) * 100;

    // 9. Knowledge Complementarity
    const knowledgeComplementarity = skillComplementarity;

    // 10. Growth Direction Similarity
    // Predict Future alignment
    const goalOverlap = this.calculateJaccardSimilarity(userA.goals, userB.goals);
    const futureInterestSimilarity = this.calculateJaccardSimilarity(userA.growthDirection.futureInterestsPredicted, userB.growthDirection.futureInterestsPredicted);
    const growthDirectionSimilarity = (goalOverlap * 0.5) + (futureInterestSimilarity * 0.5);

    return {
      interestSimilarity,
      communicationCompatibility,
      activeTimeOverlap,
      learningAlignment,
      personalityAlignment,
      trustScore,
      collaborationPotential,
      conversationQuality,
      knowledgeComplementarity,
      growthDirectionSimilarity
    };
  }

  /**
   * Evolve interest patterns based on moving windows of activity
   */
  private updateInterestEvolution(userId: string) {
    const prof = this.profiles[userId];
    if (!prof) return;

    // Clean historical drifting
    if (prof.interestHistory.length > 5) {
      prof.interestHistory.shift();
    }
    
    // Simple heuristic: If learning areas are completed or actively researched,
    // they graduately promote to skills/interests, and new learning areas are predicted.
    const uniqueInterests = Array.from(new Set([...prof.interests, ...prof.learningAreas.slice(0, 1)]));
    prof.growthDirection.futureInterestsPredicted = prof.learningAreas.map(l => `Advanced ${l}`);
  }

  /**
   * High performance: Only recalculate affected user pairs
   */
  public recalculateUserAffinities(userId: string) {
    const normId = userId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const userA = this.profiles[normId];
    if (!userA) return;

    this.updateInterestEvolution(normId);

    Object.values(this.profiles).forEach(userB => {
      if (userB.userId === normId) return;
      const partnerId = userB.userId;

      const rawScores = this.calculateRawScores(userA, userB);

      // Weighted dynamic sum
      let finalScore = 0;
      for (const [key, value] of Object.entries(rawScores)) {
        const weight = this.weights[key as keyof EngineWeights] || 0.1;
        finalScore += value * weight;
      }

      // Cap at 0 to 100 with smooth decimals
      finalScore = Math.max(0.0, Math.min(100.0, Number(finalScore.toFixed(1))));

      // Store in memory matrices (silently updated)
      userA.affinityScores[partnerId] = finalScore;
      userB.affinityScores[normId] = finalScore;

      // Collaboration Scores
      const colScore = Math.round(rawScores.collaborationPotential);
      userA.collaborationScores[partnerId] = colScore;
      userB.collaborationScores[normId] = colScore;

      // Relationship Stability Prediction
      const consistencyFactor = ((userA.behaviorVector.consistency + userB.behaviorVector.consistency) / 2) * 100;
      const stability = Math.round((finalScore * 0.5) + (rawScores.trustScore * 0.3) + (consistencyFactor * 0.2));
      userA.stabilityPredictions[partnerId] = stability;
      userB.stabilityPredictions[normId] = stability;
    });
  }

  private recalculateAllPairs() {
    const userIds = Object.keys(this.profiles);
    for (let i = 0; i < userIds.length; i++) {
      this.recalculateUserAffinities(userIds[i]);
    }
  }

  /**
   * Internal diagnostic state report
   */
  public getInternalDiagnosticsJSON(): any {
    return {
      engineWeights: this.weights,
      registeredUsers: Object.keys(this.profiles).map(id => ({
        id,
        name: this.profiles[id].name,
        interests: this.profiles[id].interests,
        skills: this.profiles[id].skills,
        learningAreas: this.profiles[id].learningAreas,
        communities: this.profiles[id].communities,
        behaviorVector: this.profiles[id].behaviorVector
      })),
      affinityMatrix: Object.keys(this.profiles).reduce((acc, id) => {
        acc[id] = this.profiles[id].affinityScores;
        return acc;
      }, {} as Record<string, Record<string, number>>),
      collaborationPotentialMatrix: Object.keys(this.profiles).reduce((acc, id) => {
        acc[id] = this.profiles[id].collaborationScores;
        return acc;
      }, {} as Record<string, Record<string, number>>),
      trustMatrix: Object.keys(this.profiles).reduce((acc, id) => {
        acc[id] = this.profiles[id].trustScores;
        return acc;
      }, {} as Record<string, Record<string, number>>),
      stabilityMatrix: Object.keys(this.profiles).reduce((acc, id) => {
        acc[id] = this.profiles[id].stabilityPredictions;
        return acc;
      }, {} as Record<string, Record<string, number>>)
    };
  }
}

// Export singleton instance
export const affinityEngine = new AffinityEngine();
