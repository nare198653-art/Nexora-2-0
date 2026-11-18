/**
 * Vector Utilities for Semantic Similarity & Embedding Computations
 * High-performance vector distance and TF-IDF / Embedding utilities
 */

export class VectorUtils {
  private static VOCAB_SIZE = 128;

  /**
   * Calculates cosine similarity between two numeric vectors
   */
  public static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    
    const minLen = Math.min(vecA.length, vecB.length);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < minLen; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Generates a 64-dimensional semantic text feature vector using character N-grams, 
   * word hashing, and TF-IDF positioning. Fast, deterministic, zero-external dependency fallback.
   */
  public static generateFastTextVector(text: string): number[] {
    if (!text) return new Array(64).fill(0);

    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    const words = cleanText.split(/\s+/).filter(w => w.length > 0);
    const vector = new Array(64).fill(0);

    if (words.length === 0) return vector;

    // 1. Hash words into vector bins
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = VectorUtils.simpleHash(word);
      const binIndex = Math.abs(hash) % 64;
      
      // Weight word frequency and position
      const weight = 1 + (1 / (i + 1));
      vector[binIndex] += weight;
    }

    // 2. Hash character bi-grams into vector bins
    for (let i = 0; i < cleanText.length - 1; i++) {
      const bigram = cleanText.substring(i, i + 2);
      const hash = VectorUtils.simpleHash(bigram);
      const binIndex = Math.abs(hash) % 64;
      vector[binIndex] += 0.5;
    }

    // Normalize vector (L2 norm)
    let sumSq = 0;
    for (let i = 0; i < 64; i++) {
      sumSq += vector[i] * vector[i];
    }

    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < 64; i++) {
        vector[i] = Number((vector[i] / norm).toFixed(6));
      }
    }

    return vector;
  }

  /**
   * Blends an AI LLM high-dimensional embedding (e.g. Gemini 768d) with the fast vector 
   * to ensure normalized 64d representation.
   */
  public static compressVectorTo64d(rawVector: number[]): number[] {
    if (!rawVector || rawVector.length === 0) return new Array(64).fill(0);
    if (rawVector.length === 64) return rawVector;

    const res = new Array(64).fill(0);
    const chunkSize = Math.floor(rawVector.length / 64);

    for (let i = 0; i < 64; i++) {
      let sum = 0;
      for (let j = 0; j < chunkSize; j++) {
        const idx = i * chunkSize + j;
        if (idx < rawVector.length) {
          sum += rawVector[idx];
        }
      }
      res[i] = sum / (chunkSize || 1);
    }

    // L2 Normalize
    let sumSq = res.reduce((acc, val) => acc + val * val, 0);
    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < 64; i++) {
        res[i] = Number((res[i] / norm).toFixed(6));
      }
    }

    return res;
  }

  /**
   * Calculates dynamic Jaccard keyword overlap similarity index
   */
  public static keywordSimilarity(keywordsA: string[], keywordsB: string[]): number {
    if (!keywordsA || !keywordsB || keywordsA.length === 0 || keywordsB.length === 0) return 0;

    const setA = new Set(keywordsA.map(k => k.toLowerCase()));
    const setB = new Set(keywordsB.map(k => k.toLowerCase()));

    let intersection = 0;
    setA.forEach(k => {
      if (setB.has(k)) intersection++;
    });

    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  }
}
