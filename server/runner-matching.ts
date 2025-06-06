import { storage } from "./storage";
import type { Runner, InsertRunner, InsertRunnerMatch } from "@shared/schema";

export interface RawRunnerData {
  name: string;
  age?: number;
  gender?: string;
  city?: string;
  state?: string;
  location?: string; // Combined city/state from some providers
  email?: string;
  finishTime: string;
  // Provider-specific fields
  [key: string]: any;
}

export interface MatchCandidate {
  runner: Runner;
  score: number;
  reasons: string[];
}

export class RunnerMatchingService {
  private readonly HIGH_CONFIDENCE_THRESHOLD = 85;
  private readonly AUTO_MATCH_THRESHOLD = 95;
  private readonly MIN_MATCH_THRESHOLD = 60;

  /**
   * Main method to find or create a runner from raw race data
   */
  async matchRunner(
    rawData: RawRunnerData, 
    sourceProvider: string, 
    sourceRaceId: string
  ): Promise<{ runner: Runner; matchScore: number; needsReview: boolean }> {
    
    // First, try to find existing matches
    const candidates = await this.findMatchingCandidates(rawData);
    
    if (candidates.length === 0) {
      // No matches found, create new runner
      const newRunner = await this.createRunnerFromRawData(rawData);
      return { runner: newRunner, matchScore: 100, needsReview: false };
    }

    const bestMatch = candidates[0];

    // Auto-match if confidence is very high
    if (bestMatch.score >= this.AUTO_MATCH_THRESHOLD) {
      await this.logMatch(rawData, bestMatch, sourceProvider, sourceRaceId, "auto_matched");
      return { runner: bestMatch.runner, matchScore: bestMatch.score, needsReview: false };
    }

    // High confidence but not auto-match - still proceed but flag for review
    if (bestMatch.score >= this.HIGH_CONFIDENCE_THRESHOLD) {
      await this.logMatch(rawData, bestMatch, sourceProvider, sourceRaceId, "approved");
      return { runner: bestMatch.runner, matchScore: bestMatch.score, needsReview: true };
    }

    // Medium confidence - definitely needs review
    if (bestMatch.score >= this.MIN_MATCH_THRESHOLD) {
      await this.logMatch(rawData, bestMatch, sourceProvider, sourceRaceId, "pending");
      // For now, create a new runner but mark the result as needing review
      const newRunner = await this.createRunnerFromRawData(rawData);
      return { runner: newRunner, matchScore: bestMatch.score, needsReview: true };
    }

    // Low confidence - create new runner
    const newRunner = await this.createRunnerFromRawData(rawData);
    return { runner: newRunner, matchScore: 0, needsReview: false };
  }

  /**
   * Find potential matching runners based on various criteria
   */
  private async findMatchingCandidates(rawData: RawRunnerData): Promise<MatchCandidate[]> {
    const allRunners = await storage.getAllRunners();
    const candidates: MatchCandidate[] = [];

    for (const runner of allRunners) {
      const score = this.calculateMatchScore(rawData, runner);
      if (score >= this.MIN_MATCH_THRESHOLD) {
        candidates.push({
          runner,
          score,
          reasons: this.getMatchReasons(rawData, runner, score)
        });
      }
    }

    // Sort by score descending
    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate match score between raw data and existing runner
   */
  private calculateMatchScore(rawData: RawRunnerData, runner: Runner): number {
    let score = 0;
    let maxScore = 0;

    // Name matching (most important)
    const nameScore = this.calculateNameSimilarity(rawData.name, runner.name);
    score += nameScore * 0.4; // 40% weight
    maxScore += 40;

    // Age matching
    if (rawData.age && runner.age) {
      const ageDiff = Math.abs(rawData.age - runner.age);
      let ageScore = 0;
      if (ageDiff === 0) ageScore = 25;
      else if (ageDiff === 1) ageScore = 20;
      else if (ageDiff === 2) ageScore = 15;
      else if (ageDiff <= 5) ageScore = 10;
      
      score += ageScore;
    }
    maxScore += 25;

    // Gender matching
    if (rawData.gender && runner.gender) {
      if (this.normalizeGender(rawData.gender) === runner.gender) {
        score += 15;
      }
    }
    maxScore += 15;

    // Location matching
    const locationScore = this.calculateLocationSimilarity(rawData, runner);
    score += locationScore;
    maxScore += 20;

    // Convert to percentage
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Calculate name similarity using multiple techniques
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const clean1 = this.cleanName(name1);
    const clean2 = this.cleanName(name2);

    // Exact match
    if (clean1 === clean2) return 100;

    // Check for name variations (first/last name swaps, middle names, etc.)
    const parts1 = clean1.split(' ').filter(p => p.length > 0);
    const parts2 = clean2.split(' ').filter(p => p.length > 0);

    // First and last name match
    if (parts1.length >= 2 && parts2.length >= 2) {
      const firstMatch = parts1[0] === parts2[0];
      const lastMatch = parts1[parts1.length - 1] === parts2[parts2.length - 1];
      
      if (firstMatch && lastMatch) return 90;
      if (firstMatch || lastMatch) return 70;
    }

    // Levenshtein distance for fuzzy matching
    const distance = this.levenshteinDistance(clean1, clean2);
    const maxLength = Math.max(clean1.length, clean2.length);
    const similarity = ((maxLength - distance) / maxLength) * 100;

    return Math.max(0, similarity);
  }

  /**
   * Calculate location similarity
   */
  private calculateLocationSimilarity(rawData: RawRunnerData, runner: Runner): number {
    let score = 0;

    // Parse location from raw data
    const rawCity = rawData.city || this.parseLocationCity(rawData.location);
    const rawState = rawData.state || this.parseLocationState(rawData.location);

    if (rawCity && runner.city) {
      if (this.cleanLocation(rawCity) === this.cleanLocation(runner.city)) {
        score += 15;
      }
    }

    if (rawState && runner.state) {
      if (this.normalizeState(rawState) === this.normalizeState(runner.state)) {
        score += 5;
      }
    }

    return score;
  }

  /**
   * Get human-readable reasons for the match
   */
  private getMatchReasons(rawData: RawRunnerData, runner: Runner, score: number): string[] {
    const reasons: string[] = [];

    const nameScore = this.calculateNameSimilarity(rawData.name, runner.name);
    if (nameScore >= 90) reasons.push("Exact name match");
    else if (nameScore >= 70) reasons.push("Similar name");

    if (rawData.age && runner.age && Math.abs(rawData.age - runner.age) <= 1) {
      reasons.push("Age match");
    }

    if (rawData.gender && runner.gender && this.normalizeGender(rawData.gender) === runner.gender) {
      reasons.push("Gender match");
    }

    const rawCity = rawData.city || this.parseLocationCity(rawData.location);
    if (rawCity && runner.city && this.cleanLocation(rawCity) === this.cleanLocation(runner.city)) {
      reasons.push("City match");
    }

    return reasons;
  }

  /**
   * Create a new runner from raw data
   */
  private async createRunnerFromRawData(rawData: RawRunnerData): Promise<Runner> {
    const city = rawData.city || this.parseLocationCity(rawData.location) || "Unknown";
    const state = rawData.state || this.parseLocationState(rawData.location) || "Unknown";

    const runnerData: InsertRunner = {
      name: this.cleanName(rawData.name),
      email: rawData.email || null,
      gender: this.normalizeGender(rawData.gender) || "M",
      age: rawData.age || 30, // Default age if not provided
      city,
      state: this.normalizeState(state),
      verified: false,
      dateOfBirth: null,
      alternateNames: [rawData.name], // Store original name
      matchingConfidence: 100
    };

    return await storage.createRunner(runnerData);
  }

  /**
   * Log the match decision for audit purposes
   */
  private async logMatch(
    rawData: RawRunnerData,
    match: MatchCandidate,
    sourceProvider: string,
    sourceRaceId: string,
    status: string
  ): Promise<void> {
    const matchData: InsertRunnerMatch = {
      candidateRunnerId: match.runner.id,
      rawRunnerData: JSON.stringify(rawData),
      matchScore: match.score,
      matchReasons: match.reasons,
      status,
      sourceProvider,
      sourceRaceId,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date().toISOString()
    };

    // Note: This would need to be implemented in storage
    // await storage.createRunnerMatch(matchData);
  }

  // Utility methods
  private cleanName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanLocation(location: string): string {
    return location
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .trim();
  }

  private normalizeGender(gender: string | undefined): string {
    if (!gender) return "M";
    const g = gender.toLowerCase();
    if (g.startsWith('f')) return "F";
    if (g.startsWith('m')) return "M";
    return "NB";
  }

  private normalizeState(state: string): string {
    // Convert state abbreviations to full names or vice versa
    const stateMap: { [key: string]: string } = {
      'california': 'CA', 'ca': 'CA',
      'new york': 'NY', 'ny': 'NY',
      'texas': 'TX', 'tx': 'TX',
      // Add more as needed
    };
    
    const normalized = state.toLowerCase();
    return stateMap[normalized] || state.toUpperCase();
  }

  private parseLocationCity(location: string | undefined): string | null {
    if (!location) return null;
    const parts = location.split(',');
    return parts[0]?.trim() || null;
  }

  private parseLocationState(location: string | undefined): string | null {
    if (!location) return null;
    const parts = location.split(',');
    return parts[1]?.trim() || null;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const runnerMatcher = new RunnerMatchingService();