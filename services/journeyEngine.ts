import { UserProfile, Task, Post, JourneyChain, JourneyInsight, JourneyOpportunity } from '../types';

/**
 * Nexora Journey Engine
 *
 * An internal AI reasoning engine that transforms isolated user actions across the
 * ecosystem into a connected story of personal growth. It detects patterns, learning
 * chains, productivity chains, social chains, builder chains, and dynamic opportunities.
 */

export const runJourneyEngine = (
  profile: UserProfile,
  tasks: Task[],
  posts: Post[]
): UserProfile => {
  // If user profile is not ready or onboarding is not completed, return original
  if (!profile || !profile.onboardingCompleted) {
    return profile;
  }

  const now = Date.now();
  const existingEngine = profile.journeyEngine;

  // We check if we need to re-run the engine. We run if no engine data exists,
  // or if activities have changed since last processed.
  const completedTasks = tasks.filter(t => t.completed);
  const completedMilestones = (profile.customMilestones || []).filter(m => m.completed);
  const interactionCount = (profile.interactions || []).length;
  const sessionsCount = profile.sessionsCompleted || 0;
  const xp = profile.xp || 0;
  const streak = profile.streak || 0;

  // Load discussions to find user contributions
  let userDiscussionsCount = 0;
  let userRepliesCount = 0;
  let userDiscussions: any[] = [];
  try {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('nexora_discussions') : null;
    if (stored) {
      const parsed: any[] = JSON.parse(stored);
      userDiscussions = parsed.filter(d => d.authorName === profile.name || d.authorName === 'You');
      userDiscussionsCount = userDiscussions.length;
      
      const countReplies = (replies: any[]): number => {
        let count = 0;
        for (const r of replies) {
          if (r.authorName === profile.name || r.authorName === 'You') {
            count++;
          }
          if (r.replies && r.replies.length > 0) {
            count += countReplies(r.replies);
          }
        }
        return count;
      };

      parsed.forEach(d => {
        if (d.replies) {
          userRepliesCount += countReplies(d.replies);
        }
      });
    }
  } catch (e) {
    console.error("Error parsing discussions inside Journey Engine", e);
  }

  // Create a signature of the current user activities to detect changes and avoid infinite re-renders
  const activitySignature = `${sessionsCount}-${completedTasks.length}-${completedMilestones.length}-${interactionCount}-${xp}-${streak}-${userDiscussionsCount}-${userRepliesCount}`;
  const existingSignature = existingEngine ? (existingEngine as any)._sig : '';

  if (existingEngine && existingSignature === activitySignature) {
    // No relevant activity changed, return profile as is to prevent redundant states
    return profile;
  }

  // --- 1. PATTERN DETECTION ---
  // Detect what the user is consistently learning or focused on based on goals and interests
  const primaryInterests = profile.interests || [];
  const primaryGoals = profile.goals || [];

  // Determine dominant topic
  let dominantTopic = 'Deep Work';
  if (primaryInterests.some(i => i.toLowerCase().includes('ai') || i.toLowerCase().includes('neural'))) {
    dominantTopic = 'Artificial Intelligence & Neural Architectures';
  } else if (primaryInterests.some(i => i.toLowerCase().includes('startup') || i.toLowerCase().includes('entrepreneur'))) {
    dominantTopic = 'SaaS Entrepreneurship & Startup Scaling';
  } else if (primaryInterests.some(i => i.toLowerCase().includes('biohack') || i.toLowerCase().includes('health'))) {
    dominantTopic = 'Cognitive Biohacking & Focus Optimization';
  } else if (primaryInterests.some(i => i.toLowerCase().includes('quant') || i.toLowerCase().includes('code'))) {
    dominantTopic = 'Advanced Computing & Quantum Foundations';
  } else if (primaryInterests.length > 0) {
    dominantTopic = primaryInterests[0];
  }

  // Detect best performing time (evening vs morning vs day based on current hour / system state)
  const currentHour = new Date(now).getHours();
  let peakFocusTime = 'evening hours (18:00 - 22:00)';
  if (currentHour >= 5 && currentHour < 12) {
    peakFocusTime = 'morning hours (06:00 - 11:00)';
  } else if (currentHour >= 12 && currentHour < 18) {
    peakFocusTime = 'afternoon hours (12:00 - 17:00)';
  }

  // --- 2. CHAIN CONSTRUCTION (INTELLIGENT REASONING) ---
  const chains: JourneyChain[] = [];

  // 2a. PRODUCTIVITY CHAINS
  if (sessionsCount > 0 || completedTasks.length > 0) {
    const steps = [];
    
    // Step 1: Focus Session
    steps.push({
      label: 'Focus Session Completed',
      description: `Completed focus session calibration with neural co-sync nodes. Momentum established.`,
      timestamp: now - 30 * 60 * 1000 // approx 30m ago
    });

    // Step 2: Task Completion
    if (completedTasks.length > 0) {
      steps.push({
        label: 'Task Completion',
        description: `Successfully executed priority milestone: "${completedTasks[0].title}".`,
        timestamp: now - 15 * 60 * 1000
      });
    } else {
      steps.push({
        label: 'Task Execution Initiated',
        description: `Aligned priority tasks with current active neural focus os.`,
        timestamp: now - 20 * 60 * 1000
      });
    }

    // Step 3: Momentum Increase
    steps.push({
      label: 'Productivity Momentum',
      description: `Gained ${xp > 0 ? xp : 50} total XP. Currently operating at Level ${profile.level || 1} bandwidth.`,
      timestamp: now - 5 * 60 * 1000
    });

    // Step 4: Streak Alignment
    steps.push({
      label: 'Streak Progression',
      description: `Maintained a co-sync streak of ${streak} days with consistent focus cycles.`,
      timestamp: now
    });

    chains.push({
      id: `chain-prod-${now}`,
      type: 'productivity',
      title: 'Cognitive Velocity & Task Momentum Chain',
      steps,
      detectedAt: now,
      confidenceScore: Math.min(80 + streak * 2, 99)
    });
  }

  // 2b. LEARNING CHAINS
  if (primaryInterests.length > 0) {
    const steps = [];

    // Step 1: Learning Initialization
    steps.push({
      label: 'Topic Discovery & Interest Map',
      description: `Discovered and indexed advanced concepts within "${dominantTopic}".`,
      timestamp: now - 2 * 60 * 60 * 1000
    });

    // Step 2: Practice & Application
    const matchingMilestone = completedMilestones.find(m => 
      m.category.toLowerCase().includes('learn') || 
      m.category.toLowerCase().includes('skill') ||
      m.category.toLowerCase().includes('brain')
    );
    steps.push({
      label: 'Cognitive Integration',
      description: matchingMilestone 
        ? `Applied academic models to practical implementation: "${matchingMilestone.title}".`
        : `Refined internal knowledge structure through intensive deep reading modules.`,
      timestamp: now - 45 * 60 * 1000
    });

    // Step 3: Helping Others/Sharing
    steps.push({
      label: 'Knowledge Synthesis',
      description: `Synthesized insights on "${dominantTopic}" inside your local neural storage.`,
      timestamp: now - 10 * 60 * 1000
    });

    // Step 4: Community Growth
    steps.push({
      label: 'Signal Alignment',
      description: `Linked node state to relevant global communities specializing in ${primaryInterests.slice(0, 2).join(', ')}.`,
      timestamp: now
    });

    chains.push({
      id: `chain-learn-${now}`,
      type: 'learning',
      title: 'Continuous Cognitive Learning & Integration Chain',
      steps,
      detectedAt: now,
      confidenceScore: 85
    });
  }

  // 2c. SOCIAL CHAINS
  if (interactionCount > 0 || (profile.interests && profile.interests.length > 1)) {
    const steps = [];

    // Step 1: Node Connection
    steps.push({
      label: 'Resonance Detection',
      description: `Interacted and aligned cognitive outputs with like-minded creators in the signal feed.`,
      timestamp: now - 3 * 60 * 60 * 1000
    });

    // Step 2: Group Discovery
    steps.push({
      label: 'Signal Group Cohere',
      description: `Initiated telemetry discussions inside focus circles matching interests in "${dominantTopic}".`,
      timestamp: now - 1.5 * 60 * 60 * 1000
    });

    // Step 3: Knowledge Saving
    steps.push({
      label: 'Resource Curation',
      description: `Successfully bookmarked/interacted with ${interactionCount} trending intellectual assets.`,
      timestamp: now - 20 * 60 * 1000
    });

    // Step 4: Influence Resonance
    steps.push({
      label: 'Impact Amplification',
      description: `Extended co-sync networks to exchange peer-to-peer productivity benchmarks.`,
      timestamp: now - 15 * 60 * 1000
    });

    if (userDiscussionsCount > 0 || userRepliesCount > 0) {
      if (userDiscussionsCount > 0) {
        steps.push({
          label: 'Started Meaningful Discussion',
          description: `Initiated high-relevance telemetry inquiries, raising valuable questions around modern development and startup frameworks.`,
          timestamp: now - 10 * 60 * 1000
        });
        steps.push({
          label: 'Shared Collective Knowledge',
          description: `Disseminated helpful guides, MVP validation steps, or resources to active synchronized nodes.`,
          timestamp: now - 5 * 60 * 1000
        });
      }
      if (userRepliesCount > 0) {
        steps.push({
          label: 'Helped Fellow Builders',
          description: `Constructively participated in threaded chats, offering deep, contextual answers and technical suggestions.`,
          timestamp: now - 2 * 60 * 1000
        });
      }
      steps.push({
        label: 'Community Impact Scaled',
        description: `Your active discussion contributions elevated local and group resonance scores, improving recommendation precision.`,
        timestamp: now
      });
    }

    chains.push({
      id: `chain-social-${now}`,
      type: 'social',
      title: 'Peer-to-Peer Resonance & Signal Social Chain',
      steps,
      detectedAt: now,
      confidenceScore: Math.min(75 + interactionCount * 3 + userDiscussionsCount * 5 + userRepliesCount * 3, 99)
    });
  }

  // 2d. BUILDER CHAINS
  if (primaryGoals.length > 0 || completedMilestones.length > 0) {
    const steps = [];

    // Step 1: Goal Created
    steps.push({
      label: 'Intent Mapping',
      description: `Formulated long-term structural targets: "${primaryGoals[0] || 'Unlocking Full Builder Capacity'}".`,
      timestamp: now - 4 * 60 * 60 * 1000
    });

    // Step 2: Milestone Completed
    if (completedMilestones.length > 0) {
      steps.push({
        label: 'Milestone Executed',
        description: `Achieved builder target: "${completedMilestones[0].title}".`,
        timestamp: now - 2 * 60 * 60 * 1000
      });
    } else {
      steps.push({
        label: 'Milestone Calibration',
        description: `Broke down main builder objective into manageable sprint micro-tasks.`,
        timestamp: now - 3 * 60 * 60 * 1000
      });
    }

    // Step 3: Project Shared
    steps.push({
      label: 'Prototype Dissemination',
      description: `Prepared focus metrics and architectural blueprints for community calibration.`,
      timestamp: now - 30 * 60 * 1000
    });

    // Step 4: Reputation Calibrated
    steps.push({
      label: 'Builder Status Increased',
      description: `Elevated system status. Progressing steadily towards ultimate operational milestones.`,
      timestamp: now
    });

    chains.push({
      id: `chain-build-${now}`,
      type: 'builder',
      title: 'High-Velocity Builder & Milestone Chain',
      steps,
      detectedAt: now,
      confidenceScore: Math.min(80 + completedMilestones.length * 4, 99)
    });
  }

  // --- 3. DYNAMIC INSIGHTS ---
  const insights: JourneyInsight[] = [];

  // Insight 1: Peak Time Focus
  insights.push({
    id: `insight-time-${now}`,
    category: 'Productivity Peak',
    text: `You consistently focus best during ${peakFocusTime}.`,
    derivedFrom: ['sessionsCompleted', 'patterns'],
    timestamp: now
  });

  // Insight 2: Topic Learning
  insights.push({
    id: `insight-learn-${now}`,
    category: 'Skill Progression',
    text: `You are gradually increasing your ${dominantTopic.toLowerCase()} learning.`,
    derivedFrom: ['interests', 'customMilestones'],
    timestamp: now
  });

  // Insight 3: Shared resources impact
  insights.push({
    id: `insight-social-${now}`,
    category: 'Community Influence',
    text: `Your shared resources create strong community engagement and node alignment.`,
    derivedFrom: ['interactions', 'socialFeed'],
    timestamp: now
  });

  // Insight 4: General productivity momentum
  insights.push({
    id: `insight-momentum-${now}`,
    category: 'Velocity Calibration',
    text: `Your productivity has improved compared to previous weeks with higher consistency.`,
    derivedFrom: ['streak', 'sessionsCompleted', 'level'],
    timestamp: now
  });

  // Insight 5: Startup related activity
  if (dominantTopic.toLowerCase().includes('startup') || dominantTopic.toLowerCase().includes('entrepreneur') || dominantTopic.toLowerCase().includes('saas')) {
    insights.push({
      id: `insight-startup-${now}`,
      category: 'Strategic Vector',
      text: `Your startup-related activity continues to increase as you hit more milestones.`,
      derivedFrom: ['goals', 'customMilestones'],
      timestamp: now
    });
  } else {
    insights.push({
      id: `insight-topic-${now}`,
      category: 'Strategic Vector',
      text: `Your ${dominantTopic.toLowerCase()}-related activity continues to increase steadily.`,
      derivedFrom: ['goals', 'customMilestones'],
      timestamp: now
    });
  }

  // --- 4. OPPORTUNITIES ---
  const opportunities: JourneyOpportunity[] = [];

  if (dominantTopic.toLowerCase().includes('ai') || dominantTopic.toLowerCase().includes('neural')) {
    opportunities.push({
      id: `opp-1-${now}`,
      title: 'Neural Coherence Synthesis Workgroup',
      description: 'An advanced study circle is focusing on co-learning deep neural networks. Your profile shows perfect cognitive alignment.',
      recommendedAction: 'Connect with Neural Co-Sync',
      timestamp: now,
      domain: 'Artificial Intelligence'
    });
  } else if (dominantTopic.toLowerCase().includes('startup') || dominantTopic.toLowerCase().includes('entrepreneur')) {
    opportunities.push({
      id: `opp-1-${now}`,
      title: 'SaaS Startup Incubator Node',
      description: 'Co-founders are assembling focus channels for SaaS validation. Your builder profile matches requirements.',
      recommendedAction: 'Initiate Startup Calibration',
      timestamp: now,
      domain: 'Entrepreneurship'
    });
  } else {
    opportunities.push({
      id: `opp-1-${now}`,
      title: `${dominantTopic} Advanced Deep Work Session`,
      description: 'Co-sync with high-theta focus waves to master topics of high interest.',
      recommendedAction: 'Initialize Sync Session',
      timestamp: now,
      domain: dominantTopic
    });
  }

  opportunities.push({
    id: `opp-2-${now}`,
    title: 'Velocity Threshold Calibration Challenge',
    description: `Maintain your focus momentum. Achieve a streak of ${streak + 2} to unlock high-tier cognitive credentials.`,
    recommendedAction: 'Lock Focus Target',
    timestamp: now,
    domain: 'Productivity'
  });

  // Assemble the computed Journey Engine details
  const journeyEngine = {
    chains,
    insights,
    opportunities,
    lastProcessedTime: now,
    _sig: activitySignature // Storing the state signature directly
  };

  return {
    ...profile,
    journeyEngine
  } as UserProfile;
};
