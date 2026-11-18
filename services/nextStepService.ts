import { UserProfile } from "../types";
import { geminiService } from "./geminiService";

export interface BonusChallenge {
  id: string;
  title: string;
  category: string;
  explanation: string;
  xpReward: number;
  badgeProgress: number;
  rankProgress: number;
  momentumProgress: number;
  isBonus: boolean;
}

const TEMPLATE_CHALLENGES = [
  {
    title: "Help one builder in a Signal Group",
    category: "Social",
    explanation: "Based on your focus on collaboration, check the Signal Group discussions feed and provide a helpful answer to someone's query.",
    triggerCondition: (profile: UserProfile) => profile.goals?.some(g => g.toLowerCase().includes("business") || g.toLowerCase().includes("network") || g.toLowerCase().includes("social")) || profile.interests?.length > 0,
  },
  {
    title: "Complete a 15-minute Deep Work session",
    category: "Productivity",
    explanation: "Your mental fortitude is high today. Use Nexora's Grind or Focus Mode to dedicate 15 distraction-free minutes to your primary objective.",
    triggerCondition: (profile: UserProfile) => true, // default fallback
  },
  {
    title: "Share one valuable insight in Circles",
    category: "Builder",
    explanation: "Deploy a fresh thought or finding from your recent learning stream to your community hub circles to ignite discussion.",
    triggerCondition: (profile: UserProfile) => profile.interests?.some(i => i.toLowerCase().includes("tech") || i.toLowerCase().includes("design") || i.toLowerCase().includes("react") || i.toLowerCase().includes("ai")),
  },
  {
    title: "Continue your current learning topic",
    category: "Study",
    explanation: "Maintain your cognitive growth velocity. Spend 10 minutes reviewing your latest educational material in your current path.",
    triggerCondition: (profile: UserProfile) => profile.interests?.length > 0 || profile.goals?.some(g => g.toLowerCase().includes("learn") || g.toLowerCase().includes("study")),
  },
  {
    title: "Review yesterday's notes & insights",
    category: "Mindset",
    explanation: "Deepen retention of your previous breakthroughs. Re-calibrate your AI Brain with updated context and yesterday's key takeaways.",
    triggerCondition: (profile: UserProfile) => profile.memory?.patterns?.length > 0 || true,
  },
  {
    title: "Reply to an unanswered discussion",
    category: "Social",
    explanation: "Strengthen your resonance index. Navigate to the Signal feed and respond to an open thread that aligns with your expertise.",
    triggerCondition: (profile: UserProfile) => true,
  },
  {
    title: "Complete one pending milestone",
    category: "Milestones",
    explanation: "You have unachieved core objectives. Choose one pending milestone in your profile tab and take a concrete action to unlock it.",
    triggerCondition: (profile: UserProfile) => profile.customMilestones?.some(m => !m.completed) || false,
  }
];

export const nextStepService = {
  /**
   * Intelligently selects and personalize ONE meaningful bonus activity based on user stats,
   * goals, interests, memory, and completed counts.
   */
  async generateNextStep(
    profile: UserProfile, 
    completedTodayCount: number,
    recentChallengeTitles: string[] = []
  ): Promise<BonusChallenge> {
    
    // 1. Filter out templates that are in recentChallengeTitles to prevent unnecessary repetition
    let candidates = TEMPLATE_CHALLENGES.filter(
      c => !recentChallengeTitles.includes(c.title) && c.triggerCondition(profile)
    );

    // If all filtered out, reset candidates to avoid empty selection
    if (candidates.length === 0) {
      candidates = TEMPLATE_CHALLENGES.filter(c => c.triggerCondition(profile));
    }
    if (candidates.length === 0) {
      candidates = TEMPLATE_CHALLENGES;
    }

    // 2. Prioritize candidates based on user goals/interests match
    const scoredCandidates = candidates.map(c => {
      let score = 1;
      
      // Goals matching
      profile.goals?.forEach(goal => {
        if (goal.toLowerCase().includes(c.category.toLowerCase()) || 
            c.explanation.toLowerCase().includes(goal.toLowerCase())) {
          score += 3;
        }
      });

      // Interests matching
      profile.interests?.forEach(interest => {
        if (c.explanation.toLowerCase().includes(interest.toLowerCase())) {
          score += 2;
        }
      });

      // Specific conditions
      if (c.title.includes("milestone") && profile.customMilestones?.some(m => !m.completed)) {
        score += 2;
      }

      return { candidate: c, score };
    });

    // Sort by score descending and pick the best one
    scoredCandidates.sort((a, b) => b.score - a.score);
    const selected = scoredCandidates[0].candidate;

    // 3. Define reward scaling to prevent XP farming
    // XP, Rank, Badge, Momentum decrease gradually
    let xpReward = 100;
    let badgeProgress = 25;
    let rankProgress = 10;
    let momentumProgress = 50;

    if (completedTodayCount === 1) {
      xpReward = 50;
      badgeProgress = 12;
      rankProgress = 5;
      momentumProgress = 25;
    } else if (completedTodayCount === 2) {
      xpReward = 25;
      badgeProgress = 6;
      rankProgress = 2;
      momentumProgress = 12;
    } else if (completedTodayCount >= 3) {
      xpReward = 10;
      badgeProgress = 2;
      rankProgress = 1;
      momentumProgress = 5;
    }

    // 4. Try to personalize using Gemini API if configured
    let title = selected.title;
    let explanation = selected.explanation;
    let category = selected.category;

    const userGoalsStr = profile.goals?.join(", ") || "None";
    const userInterestsStr = profile.interests?.join(", ") || "None";
    const currentLevel = profile.level || 1;

    const prompt = `You are Nexora's AI behavioral optimization core.
We are recommending a "Next Meaningful Step" bonus activity to a user who just completed 100% of their daily tasks.
The user's current Profile details:
- Level: ${currentLevel}
- Active Goals: ${userGoalsStr}
- Specific Interests: ${userInterestsStr}
- Current active streak: ${profile.streak} days

Base template selected:
- Category: ${selected.category}
- Action item: ${selected.title}
- System explanation: ${selected.explanation}

Based on this user's profile, intelligently re-write the bonus activity title and brief explanation to make it feel 100% personalized, premium, and motivating.
Keep the title under 6 words. Keep the explanation under 25 words. Keep the tone sharp, inspiring, technical but human, Stoic-focused.
Return EXACTLY a JSON object with this shape:
{
  "title": "personalized short title",
  "explanation": "personalized description linking to their interests/goals",
  "category": "retained or slightly customized single word category"
}
Do not return any other markdown wrapper or backticks. Just the raw JSON.`;

    try {
      const gResult = await geminiService.generateContent(prompt);
      if (gResult && !gResult.includes("Something went wrong") && !gResult.includes("failed")) {
        // Parse the result
        let cleanJson = gResult.replace(/```json/g, "").replace(/```/g, "").trim();
        const firstBrace = cleanJson.indexOf("{");
        const lastBrace = cleanJson.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        }
        const parsed = JSON.parse(cleanJson);
        if (parsed.title && parsed.explanation) {
          title = parsed.title;
          explanation = parsed.explanation;
          if (parsed.category) {
            category = parsed.category;
          }
        }
      }
    } catch (e) {
      console.warn("Using smart fallback template personalization due to:", e);
      // Fallback personalization substitutions
      const mainGoal = profile.goals?.[0] || "personal growth";
      const mainInterest = profile.interests?.[0] || "cognitive science";
      explanation = explanation
        .replace("your current path", `your ${mainInterest} stream`)
        .replace("your primary objective", `your goal of "${mainGoal}"`);
    }

    return {
      id: `bonus-${Date.now()}`,
      title,
      category,
      explanation,
      xpReward,
      badgeProgress,
      rankProgress,
      momentumProgress,
      isBonus: true
    };
  }
};
