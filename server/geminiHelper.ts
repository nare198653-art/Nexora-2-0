import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export const DEFAULT_MODEL = 'gemini-3.5-flash';
export const CATEGORIZATION_MODEL = 'gemini-4-hydrogen';
export const serverCooldowns: Record<string, number> = {};
export const unsupportedModels = new Set<string>();

function sanitizeConfigForModel(modelName: string, config: any = {}) {
  if (!config || typeof config !== 'object') return config;
  const cloned: any = { ...config };

  if (modelName.startsWith('gemini-4-')) {
    delete cloned.temperature;
    delete cloned.topP;
    delete cloned.topK;
    delete cloned.candidateCount;
    if (cloned.thinkingConfig && typeof cloned.thinkingConfig === 'object') {
      const { thinkingBudget: _omitBudget, ...restThinking } = cloned.thinkingConfig;
      cloned.thinkingConfig = restThinking;
    }
  } else if (modelName === 'gemini-3.1-flash-lite') {
    if (cloned.thinkingConfig?.thinkingLevel === 'XHIGH') {
      const { thinkingLevel: _omitLevel, ...restThinking } = cloned.thinkingConfig;
      cloned.thinkingConfig = restThinking;
    }
  }

  return cloned;
}

/**
 * Resilient helper that queries primary model, and on rate limit falls back to other high-availability models
 */
export async function callGeminiWithRetryAndFallback(
  primaryModel: string = DEFAULT_MODEL,
  contents: any,
  config: any = {},
  maxRetries = 2
) {
  const modelsToTry = [primaryModel];
  
  // Decide pool of fallback models based on task category
  if (primaryModel.includes('image')) {
    if (primaryModel === 'gemini-3-pro-image') {
      modelsToTry.push('gemini-3.1-flash-image');
      modelsToTry.push('gemini-2.5-flash-image');
    } else if (primaryModel === 'gemini-3.1-flash-image') {
      modelsToTry.push('gemini-2.5-flash-image');
    } else if (primaryModel === 'gemini-2.5-flash-image') {
      modelsToTry.push('gemini-3.1-flash-image');
    }
  } else {
    if (primaryModel === 'gemini-4-hydrogen') {
      modelsToTry.push('gemini-3.1-flash-lite');
    } else if (primaryModel === 'gemini-3.5-flash') {
      modelsToTry.push('gemini-4-hydrogen');
      modelsToTry.push('gemini-flash-latest');
      modelsToTry.push('gemini-3.1-flash-lite');
      modelsToTry.push('gemini-3.1-pro-preview');
    } else if (primaryModel === 'gemini-3.1-flash-lite') {
      modelsToTry.push('gemini-4-hydrogen');
      modelsToTry.push('gemini-3.5-flash');
      modelsToTry.push('gemini-flash-latest');
    } else if (primaryModel === 'gemini-3.1-pro-preview') {
      modelsToTry.push('gemini-3.5-flash');
      modelsToTry.push('gemini-flash-latest');
    } else {
      modelsToTry.push('gemini-4-hydrogen');
      modelsToTry.push('gemini-3.5-flash');
      modelsToTry.push('gemini-flash-latest');
    }
  }

  // Filter out unsupported models
  let filteredModels = modelsToTry.filter(m => !unsupportedModels.has(m));
  if (filteredModels.length === 0) {
    const defaultPool = [CATEGORIZATION_MODEL, 'gemini-3.1-flash-lite', DEFAULT_MODEL];
    filteredModels = defaultPool.filter(m => !unsupportedModels.has(m));
    if (filteredModels.length === 0) {
      filteredModels = [primaryModel];
    }
  }

  let lastError: any;

  for (const modelName of filteredModels) {
    const currentCooldown = serverCooldowns[modelName] || 0;
    if (Date.now() < currentCooldown) {
      console.warn(`[GeminiHelper] Local circuit breaker active for model ${modelName}. Trying next in pool...`);
      continue;
    }

    const sanitizedConfig = sanitizeConfigForModel(modelName, config);

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`[GeminiHelper] Querying model ${modelName} (Attempt ${i + 1}/${maxRetries})...`);
        const result = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: sanitizedConfig
        });
        return result;
      } catch (error: any) {
        lastError = error;
        const errStr = String(error?.message || error || "").toLowerCase();
        
        const isNotFound = errStr.includes('404') || errStr.includes('not_found') || errStr.includes('not found') || error.status === 404;
        const isRateLimit = errStr.includes('429') || errStr.includes('quota') || errStr.includes('resource_exhausted') || error.status === 429;
        const isServerError = errStr.includes('503') || errStr.includes('unavailable') || errStr.includes('service unavailable') || error.status === 503;

        if (isNotFound) {
          unsupportedModels.add(modelName);
          console.warn(`[GeminiHelper] Model ${modelName} returned 404/NOT_FOUND. Trying next fallback model.`);
          break;
        }
        
        if (isRateLimit || isServerError) {
          const isHardLimit = (
            errStr.includes('limit: 0') || 
            errStr.includes('limit:0') || 
            errStr.includes('plan') || 
            errStr.includes('billing') || 
            errStr.includes('per day') || 
            errStr.includes('daily') || 
            (errStr.includes('quota') && errStr.includes('day'))
          ) && !errStr.includes('per minute') && !errStr.includes('minute') && !errStr.includes('retry');
          
          if (isHardLimit) {
            unsupportedModels.add(modelName);
            serverCooldowns[modelName] = Date.now() + 24 * 60 * 60 * 1000; // 24 hours cooldown for hard limit
            console.warn(`[GeminiHelper] Hard quota exceeded or model unsupported for ${modelName}. Blacklisting model.`);
            break; // Try next model immediately
          }

          if (i < maxRetries - 1) {
            const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
            console.warn(`[GeminiHelper] Gemini API rate limited/unavailable for ${modelName}. Retrying in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            serverCooldowns[modelName] = Date.now() + 30000; // 30s cooldown for transient failure
            console.warn(`[GeminiHelper] Upstream limit or high demand on model ${modelName} encountered. Activating 30s cooldown.`);
          }
        } else {
          // Non rate-limit error, propagates immediately
          throw error;
        }
      }
    }
  }
  throw lastError || new Error("All fallback models in the resiliency pool exhausted or cooling down.");
}

/**
 * Safely cleans and parses JSON strings returned by Gemini or external LLMs.
 * Handles markdown block wrapping, unescaped control characters, trailing commas,
 * and truncated responses (repairing open quotes/braces/brackets).
 */
export function cleanAndParseJSON<T = any>(rawText: string, fallback?: T): T {
  if (!rawText || typeof rawText !== "string") {
    if (fallback !== undefined) return fallback;
    throw new Error("Invalid or empty string input for JSON parsing.");
  }

  let cleaned = rawText.trim();

  // Strip markdown code fences (e.g. ```json ... ``` or ``` ...)
  if (cleaned.includes("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
  }

  // Find boundaries for JSON object {} or array []
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let startIdx = -1;
  let isArray = false;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    isArray = false;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isArray = true;
  }

  if (startIdx !== -1) {
    const lastChar = isArray ? "]" : "}";
    const endIdx = cleaned.lastIndexOf(lastChar);
    if (endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    } else {
      cleaned = cleaned.substring(startIdx);
    }
  }

  // Attempt 1: Native JSON.parse
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    // Attempt 2: Sanitize literal unescaped control characters & trailing commas
    try {
      const sanitized = cleaned
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => (c === "\n" || c === "\r" || c === "\t" ? " " : ""))
        .replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(sanitized);
    } catch (err2) {
      // Attempt 3: Repair truncated JSON strings and missing closing braces/brackets
      try {
        let repaired = cleaned.trim();
        // Remove trailing incomplete property or trailing comma
        repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*[^,}\]]*$/, "");
        
        // Check if string literal was cut off inside quotes
        const quoteMatches = repaired.match(/"/g);
        if (quoteMatches && quoteMatches.length % 2 !== 0) {
          repaired += '"';
        }

        // Count missing closing braces/brackets
        const openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
        const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;

        for (let i = 0; i < openBrackets; i++) repaired += "]";
        for (let i = 0; i < openBraces; i++) repaired += "}";

        return JSON.parse(repaired);
      } catch (err3) {
        if (fallback !== undefined) {
          console.warn("[cleanAndParseJSON] Safe fallback utilized due to JSON parse failure:", (err3 as Error)?.message);
          return fallback;
        }
        throw err1;
      }
    }
  }
}
