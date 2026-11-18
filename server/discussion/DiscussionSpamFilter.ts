/**
 * AI Spam Intelligence Filter
 * Detects bot activity, copy-paste spam, emoji flooding, rapid bursts, and meaningless noise.
 * Downweights ranking influence without deleting raw messages.
 */

import { SpamAnalysisResult } from './types.js';

export class DiscussionSpamFilter {
  private static userRecentMessageTimes: Map<string, number[]> = new Map();
  private static userRecentMessageHashes: Map<string, string[]> = new Map();

  /**
   * Analyzes an incoming message for spam signals and calculates a spam score (0.0 to 1.0).
   */
  public static analyzeSpam(senderId: string, text: string, timestamp: number = Date.now()): SpamAnalysisResult {
    const reasons: string[] = [];
    let spamScore = 0;

    if (!text || text.trim().length === 0) {
      return {
        isSpam: true,
        spamScore: 1.0,
        reasons: ['Empty message body'],
        rankingFactor: 0.1
      };
    }

    const cleanText = text.trim();

    // 1. Emoji Flooding Detection
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojiMatches = cleanText.match(emojiRegex) || [];
    const emojiRatio = emojiMatches.length / cleanText.length;

    if (emojiMatches.length > 12 || (cleanText.length > 5 && emojiRatio > 0.6)) {
      spamScore += 0.45;
      reasons.push('Excessive emoji flooding');
    }

    // 2. Meaningless Character / Repeated Letter Spam (e.g. "aaaaaa", "asdfasdfasdf", "!!!!!")
    const repeatedChars = /(.)\1{5,}/i;
    if (repeatedChars.test(cleanText)) {
      spamScore += 0.35;
      reasons.push('Repetitive character spam');
    }

    // 3. All Caps Flooding
    if (cleanText.length > 15 && cleanText === cleanText.toUpperCase() && /[A-Z]/.test(cleanText)) {
      spamScore += 0.25;
      reasons.push('Excessive uppercase noise');
    }

    // 4. Rate Flooding / Burst Bot Detection
    if (senderId) {
      const times = this.userRecentMessageTimes.get(senderId) || [];
      // keep timestamps within the last 30 seconds
      const recentTimes = times.filter(t => timestamp - t < 30000);
      recentTimes.push(timestamp);
      this.userRecentMessageTimes.set(senderId, recentTimes);

      if (recentTimes.length >= 6) { // More than 6 messages in 30s
        spamScore += 0.5;
        reasons.push('Rapid burst velocity / potential bot rate');
      }

      // 5. Copy-Paste / Duplicate Phrase Spam
      const hashes = this.userRecentMessageHashes.get(senderId) || [];
      const msgHash = cleanText.toLowerCase().replace(/\s+/g, '');
      const duplicateCount = hashes.filter(h => h === msgHash).length;
      
      hashes.push(msgHash);
      if (hashes.length > 10) hashes.shift();
      this.userRecentMessageHashes.set(senderId, hashes);

      if (duplicateCount >= 2) {
        spamScore += 0.6;
        reasons.push('Duplicate copy-paste message repetition');
      }
    }

    // 6. Very short gibberish
    if (cleanText.length <= 2 && !['ok', 'hi', 'ye', 'no', 'gg', 'thx', 'ty'].includes(cleanText.toLowerCase())) {
      spamScore += 0.15;
      reasons.push('Low character entropy');
    }

    // Bound score
    const finalScore = Math.min(1.0, Math.max(0.0, Number(spamScore.toFixed(2))));
    const isSpam = finalScore >= 0.5;

    // Multiplier for ranking influence (0.1 if heavily spammed, 1.0 if pristine)
    const rankingFactor = Number((1.0 - (finalScore * 0.9)).toFixed(2));

    return {
      isSpam,
      spamScore: finalScore,
      reasons,
      rankingFactor
    };
  }
}
