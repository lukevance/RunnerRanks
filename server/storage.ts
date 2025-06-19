import { 
  runners, 
  races, 
  results,
  raceSeries,
  raceSeriesRaces,
  type Runner, 
  type Race, 
  type Result,
  type RaceSeries,
  type RaceSeriesRace,
  type InsertRunner, 
  type InsertRace, 
  type InsertResult,
  type InsertRaceSeries,
  type InsertRaceSeriesRace,
  type LeaderboardEntry,
  type RunnerWithStats,
  type RaceSeriesWithRaces,
  type SeriesStanding,
  type SeriesLeaderboard
} from "@shared/schema";

export interface IStorage {
  // Runners
  getRunner(id: number): Promise<Runner | undefined>;
  getRunnerByEmail(email: string): Promise<Runner | undefined>;
  createRunner(runner: InsertRunner): Promise<Runner>;
  getAllRunners(): Promise<Runner[]>;
  
  // Races
  getRace(id: number): Promise<Race | undefined>;
  createRace(race: InsertRace): Promise<Race>;
  getAllRaces(): Promise<Race[]>;
  
  // Results
  getResult(id: number): Promise<Result | undefined>;
  createResult(result: InsertResult): Promise<Result>;
  getResultsByRunner(runnerId: number): Promise<(Result & { race: Race })[]>;
  getResultsByRace(raceId: number): Promise<(Result & { runner: Runner })[]>;
  
  // Leaderboard queries
  getLeaderboard(filters?: {
    distance?: string;
    gender?: string;
    ageGroup?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<LeaderboardEntry[]>;
  
  getRunnerWithStats(id: number): Promise<RunnerWithStats | undefined>;
  
  // Race Series
  createRaceSeries(series: InsertRaceSeries): Promise<RaceSeries>;
  getRaceSeries(id: number): Promise<RaceSeriesWithRaces | undefined>;
  getAllRaceSeries(): Promise<RaceSeriesWithRaces[]>;
  updateRaceSeries(id: number, updates: Partial<InsertRaceSeries>): Promise<RaceSeries | undefined>;
  deleteRaceSeries(id: number): Promise<boolean>;
  
  // Race Series Races
  addRaceToSeries(seriesId: number, raceId: number, options?: {
    seriesRaceNumber?: number;
    pointsMultiplier?: string;
  }): Promise<RaceSeriesRace>;
  removeRaceFromSeries(seriesId: number, raceId: number): Promise<boolean>;
  getSeriesRaces(seriesId: number): Promise<(RaceSeriesRace & { race: Race })[]>;
  
  // Series Leaderboards
  getSeriesLeaderboard(seriesId: number): Promise<SeriesLeaderboard>;
  getRunnerSeriesHistory(runnerId: number): Promise<(RaceSeries & { 
    racesCompleted: number; 
    totalPoints: number;
    rank: number;
  })[]>;
}

export class MemStorage implements IStorage {
  private runners: Map<number, Runner>;
  private races: Map<number, Race>;
  private results: Map<number, Result>;
  private raceSeries: Map<number, RaceSeries>;
  private raceSeriesRaces: Map<number, RaceSeriesRace>;
  private currentRunnerId: number;
  private currentRaceId: number;
  private currentResultId: number;
  private currentSeriesId: number;
  private currentSeriesRaceId: number;

  constructor() {
    this.runners = new Map();
    this.races = new Map();
    this.results = new Map();
    this.raceSeries = new Map();
    this.raceSeriesRaces = new Map();
    this.currentRunnerId = 1;
    this.currentRaceId = 1;
    this.currentResultId = 1;
    this.currentSeriesId = 1;
    this.currentSeriesRaceId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    // Sample runners
    const sampleRunners = [
      { name: "Marcus Johnson", email: "marcus@email.com", gender: "M", age: 32, city: "San Francisco", state: "CA" },
      { name: "Sarah Chen", email: "sarah@email.com", gender: "F", age: 28, city: "San Francisco", state: "CA" },
      { name: "David Rodriguez", email: "david@email.com", gender: "M", age: 45, city: "Oakland", state: "CA" },
      { name: "Lisa Wang", email: "lisa@email.com", gender: "F", age: 34, city: "San Jose", state: "CA" },
      { name: "Michael Thompson", email: "michael@email.com", gender: "M", age: 41, city: "Berkeley", state: "CA" },
      { name: "Jennifer Martinez", email: "jennifer@email.com", gender: "F", age: 29, city: "San Francisco", state: "CA" },
      { name: "Robert Kim", email: "robert@email.com", gender: "M", age: 37, city: "Palo Alto", state: "CA" },
      { name: "Amanda Taylor", email: "amanda@email.com", gender: "F", age: 42, city: "San Francisco", state: "CA" },
    ];

    for (const runnerData of sampleRunners) {
      await this.createRunner(runnerData);
    }

    // Sample races
    const sampleRaces = [
      {
        name: "San Francisco Marathon",
        date: "2023-10-15",
        distance: "marathon",
        distanceMiles: "26.20",
        city: "San Francisco",
        state: "CA",
        startTime: "7:00 AM",
        weather: "62°F, Clear",
        courseType: "point-to-point",
        elevation: "+1,240 ft",
        totalFinishers: 2847,
        averageTime: "3:45:12",
        organizerWebsite: "https://sfmarathon.com",
        resultsUrl: "https://sfmarathon.com/results"
      },
      {
        name: "Big Sur Marathon",
        date: "2023-09-22",
        distance: "marathon",
        distanceMiles: "26.20",
        city: "Big Sur",
        state: "CA",
        startTime: "6:45 AM",
        weather: "58°F, Foggy",
        courseType: "point-to-point",
        elevation: "+2,100 ft",
        totalFinishers: 1250,
        averageTime: "4:12:30",
        organizerWebsite: "https://bigsurmarathon.org",
        resultsUrl: "https://bigsurmarathon.org/results"
      },
      {
        name: "California International Marathon",
        date: "2023-12-03",
        distance: "marathon",
        distanceMiles: "26.20",
        city: "Sacramento",
        state: "CA",
        startTime: "7:00 AM",
        weather: "48°F, Clear",
        courseType: "point-to-point",
        elevation: "-335 ft",
        totalFinishers: 8500,
        averageTime: "3:52:45",
        organizerWebsite: "https://cim.org",
        resultsUrl: "https://cim.org/results"
      },
      {
        name: "Marin County Half Marathon",
        date: "2023-09-08",
        distance: "half-marathon",
        distanceMiles: "13.10",
        city: "San Rafael",
        state: "CA",
        startTime: "7:30 AM",
        weather: "65°F, Sunny",
        courseType: "loop",
        elevation: "+450 ft",
        totalFinishers: 1800,
        averageTime: "1:52:30",
        organizerWebsite: "https://marinhalf.com",
        resultsUrl: "https://marinhalf.com/results"
      },
      {
        name: "Silicon Valley Marathon",
        date: "2023-11-12",
        distance: "marathon",
        distanceMiles: "26.20",
        city: "San Jose",
        state: "CA",
        startTime: "6:30 AM",
        weather: "72°F, Clear",
        courseType: "loop",
        elevation: "+120 ft",
        totalFinishers: 3200,
        averageTime: "3:58:20",
        organizerWebsite: "https://svmarathon.com",
        resultsUrl: "https://svmarathon.com/results"
      },
      {
        name: "Napa Valley Marathon",
        date: "2023-08-27",
        distance: "marathon",
        distanceMiles: "26.20",
        city: "Napa",
        state: "CA",
        startTime: "6:00 AM",
        weather: "75°F, Clear",
        courseType: "point-to-point",
        elevation: "-300 ft",
        totalFinishers: 2100,
        averageTime: "3:48:15",
        organizerWebsite: "https://napamarathon.com",
        resultsUrl: "https://napamarathon.com/results"
      }
    ];

    for (const raceData of sampleRaces) {
      await this.createRace(raceData);
    }

    // Sample results
    const sampleResults = [
      { runnerId: 1, raceId: 1, finishTime: "2:18:45", overallPlace: 1, genderPlace: 1, ageGroupPlace: 1, isPersonalBest: true, notes: "Personal Best" },
      { runnerId: 2, raceId: 2, finishTime: "2:24:12", overallPlace: 3, genderPlace: 1, ageGroupPlace: 1, isSeasonBest: true, notes: "Season Best" },
      { runnerId: 3, raceId: 3, finishTime: "2:26:33", overallPlace: 15, genderPlace: 12, ageGroupPlace: 1, notes: "Age Group Win" },
      { runnerId: 4, raceId: 5, finishTime: "2:31:18", overallPlace: 8, genderPlace: 2, ageGroupPlace: 1, notes: "Boston Qualifier" },
      { runnerId: 5, raceId: 6, finishTime: "2:33:45", overallPlace: 22, genderPlace: 18, ageGroupPlace: 3, isPersonalBest: true, notes: "PR" },
      { runnerId: 1, raceId: 4, finishTime: "1:07:22", overallPlace: 2, genderPlace: 2, ageGroupPlace: 1, isPersonalBest: true, notes: "Half Marathon PR" },
      { runnerId: 6, raceId: 1, finishTime: "2:35:42", overallPlace: 28, genderPlace: 5, ageGroupPlace: 2, notes: "Strong finish" },
      { runnerId: 7, raceId: 2, finishTime: "2:41:15", overallPlace: 45, genderPlace: 35, ageGroupPlace: 8, notes: "Good effort" },
      { runnerId: 8, raceId: 3, finishTime: "2:52:30", overallPlace: 125, genderPlace: 22, ageGroupPlace: 4, notes: "Age Group Top 5" },
    ];

    for (const resultData of sampleResults) {
      await this.createResult(resultData);
    }
  }

  // Runner methods
  async getRunner(id: number): Promise<Runner | undefined> {
    return this.runners.get(id);
  }

  async getRunnerByEmail(email: string): Promise<Runner | undefined> {
    return Array.from(this.runners.values()).find(runner => runner.email === email);
  }

  async createRunner(insertRunner: InsertRunner): Promise<Runner> {
    const id = this.currentRunnerId++;
    const runner: Runner = { ...insertRunner, id };
    this.runners.set(id, runner);
    return runner;
  }

  async getAllRunners(): Promise<Runner[]> {
    return Array.from(this.runners.values());
  }

  // Race methods
  async getRace(id: number): Promise<Race | undefined> {
    return this.races.get(id);
  }

  async createRace(insertRace: InsertRace): Promise<Race> {
    const id = this.currentRaceId++;
    const race: Race = { ...insertRace, id };
    this.races.set(id, race);
    return race;
  }

  async getAllRaces(): Promise<Race[]> {
    return Array.from(this.races.values());
  }

  // Result methods
  async getResult(id: number): Promise<Result | undefined> {
    return this.results.get(id);
  }

  async createResult(insertResult: InsertResult): Promise<Result> {
    const id = this.currentResultId++;
    const result: Result = { ...insertResult, id };
    this.results.set(id, result);
    return result;
  }

  async getResultsByRunner(runnerId: number): Promise<(Result & { race: Race })[]> {
    const runnerResults = Array.from(this.results.values())
      .filter(result => result.runnerId === runnerId);
    
    return runnerResults.map(result => {
      const race = this.races.get(result.raceId)!;
      return { ...result, race };
    }).sort((a, b) => new Date(b.race.date).getTime() - new Date(a.race.date).getTime());
  }

  async getResultsByRace(raceId: number): Promise<(Result & { runner: Runner })[]> {
    const raceResults = Array.from(this.results.values())
      .filter(result => result.raceId === raceId);
    
    return raceResults.map(result => {
      const runner = this.runners.get(result.runnerId)!;
      return { ...result, runner };
    }).sort((a, b) => a.overallPlace - b.overallPlace);
  }

  async getLeaderboard(filters?: {
    distance?: string;
    gender?: string;
    ageGroup?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<LeaderboardEntry[]> {
    let entries: LeaderboardEntry[] = [];

    // Create leaderboard entries
    for (const result of this.results.values()) {
      const runner = this.runners.get(result.runnerId);
      const race = this.races.get(result.raceId);
      
      if (runner && race) {
        entries.push({
          id: result.id,
          runner,
          race,
          result
        });
      }
    }

    // Apply filters
    if (filters) {
      if (filters.distance && filters.distance !== "All Distances") {
        const distanceMap: { [key: string]: string } = {
          "Marathon (26.2 mi)": "marathon",
          "Half Marathon (13.1 mi)": "half-marathon"
        };
        const targetDistance = distanceMap[filters.distance] || filters.distance;
        entries = entries.filter(entry => entry.race.distance === targetDistance);
      }

      if (filters.gender && filters.gender !== "All") {
        entries = entries.filter(entry => entry.runner.gender === filters.gender);
      }

      if (filters.ageGroup && filters.ageGroup !== "All Ages") {
        const ageRanges: { [key: string]: [number, number] } = {
          "18-29": [18, 29],
          "30-39": [30, 39],
          "40-49": [40, 49],
          "50-59": [50, 59],
          "60+": [60, 100]
        };
        const range = ageRanges[filters.ageGroup];
        if (range) {
          entries = entries.filter(entry => 
            entry.runner.age >= range[0] && entry.runner.age <= range[1]
          );
        }
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        entries = entries.filter(entry =>
          entry.runner.name.toLowerCase().includes(searchLower)
        );
      }
    }

    // Sort by finish time (fastest first)
    entries.sort((a, b) => {
      const timeA = this.timeToSeconds(a.result.finishTime);
      const timeB = this.timeToSeconds(b.result.finishTime);
      return timeA - timeB;
    });

    // Apply pagination
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    
    return entries.slice(offset, offset + limit);
  }

  async getRunnerWithStats(id: number): Promise<RunnerWithStats | undefined> {
    const runner = this.runners.get(id);
    if (!runner) return undefined;

    const results = await this.getResultsByRunner(id);
    
    // Calculate stats
    const marathonResults = results.filter(r => r.race.distance === "marathon");
    const halfMarathonResults = results.filter(r => r.race.distance === "half-marathon");
    
    const marathonPR = marathonResults.length > 0 
      ? marathonResults.reduce((fastest, current) => 
          this.timeToSeconds(current.finishTime) < this.timeToSeconds(fastest.finishTime) 
            ? current : fastest
        ).finishTime
      : undefined;

    const halfMarathonPR = halfMarathonResults.length > 0
      ? halfMarathonResults.reduce((fastest, current) =>
          this.timeToSeconds(current.finishTime) < this.timeToSeconds(fastest.finishTime)
            ? current : fastest
        ).finishTime
      : undefined;

    const currentYear = new Date().getFullYear();
    const racesThisYear = results.filter(r => 
      new Date(r.race.date).getFullYear() === currentYear
    ).length;

    const ageGroupWins = results.filter(r => r.ageGroupPlace === 1).length;

    return {
      ...runner,
      marathonPR,
      halfMarathonPR,
      racesThisYear,
      ageGroupWins,
      results
    };
  }

  // Race Series methods
  async createRaceSeries(insertSeries: InsertRaceSeries): Promise<RaceSeries> {
    const id = this.currentSeriesId++;
    const series: RaceSeries = { ...insertSeries, id };
    this.raceSeries.set(id, series);
    return series;
  }

  async getRaceSeries(id: number): Promise<RaceSeriesWithRaces | undefined> {
    const series = this.raceSeries.get(id);
    if (!series) return undefined;

    const seriesRaces = Array.from(this.raceSeriesRaces.values())
      .filter(sr => sr.seriesId === id)
      .map(sr => {
        const race = this.races.get(sr.raceId);
        return race ? { ...sr, race } : null;
      })
      .filter((sr): sr is RaceSeriesRace & { race: Race } => sr !== null);

    return {
      ...series,
      races: seriesRaces,
      totalRaces: seriesRaces.length,
      participantCount: await this.getSeriesParticipantCount(id)
    };
  }

  async getAllRaceSeries(): Promise<RaceSeriesWithRaces[]> {
    const allSeries = Array.from(this.raceSeries.values());
    const result = [];
    
    for (const series of allSeries) {
      const fullSeries = await this.getRaceSeries(series.id);
      if (fullSeries) {
        result.push(fullSeries);
      }
    }
    
    return result;
  }

  async updateRaceSeries(id: number, updates: Partial<InsertRaceSeries>): Promise<RaceSeries | undefined> {
    const existing = this.raceSeries.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.raceSeries.set(id, updated);
    return updated;
  }

  async deleteRaceSeries(id: number): Promise<boolean> {
    const deleted = this.raceSeries.delete(id);
    // Remove associated race-series relationships
    const toDelete = Array.from(this.raceSeriesRaces.entries())
      .filter(([_, sr]) => sr.seriesId === id)
      .map(([key]) => key);
    
    toDelete.forEach(key => this.raceSeriesRaces.delete(key));
    return deleted;
  }

  async addRaceToSeries(seriesId: number, raceId: number, options?: {
    seriesRaceNumber?: number;
    pointsMultiplier?: string;
  }): Promise<RaceSeriesRace> {
    const id = this.currentSeriesRaceId++;
    const seriesRace: RaceSeriesRace = {
      id,
      seriesId,
      raceId,
      seriesRaceNumber: options?.seriesRaceNumber || null,
      pointsMultiplier: options?.pointsMultiplier || "1.00",
      isCountedInSeries: true,
      addedAt: new Date().toISOString()
    };
    
    this.raceSeriesRaces.set(id, seriesRace);
    return seriesRace;
  }

  async removeRaceFromSeries(seriesId: number, raceId: number): Promise<boolean> {
    const toDelete = Array.from(this.raceSeriesRaces.entries())
      .find(([_, sr]) => sr.seriesId === seriesId && sr.raceId === raceId);
    
    if (toDelete) {
      this.raceSeriesRaces.delete(toDelete[0]);
      return true;
    }
    return false;
  }

  async getSeriesRaces(seriesId: number): Promise<(RaceSeriesRace & { race: Race })[]> {
    return Array.from(this.raceSeriesRaces.values())
      .filter(sr => sr.seriesId === seriesId)
      .map(sr => {
        const race = this.races.get(sr.raceId);
        return race ? { ...sr, race } : null;
      })
      .filter((sr): sr is RaceSeriesRace & { race: Race } => sr !== null);
  }

  async getSeriesLeaderboard(seriesId: number): Promise<SeriesLeaderboard> {
    const series = this.raceSeries.get(seriesId);
    if (!series) {
      throw new Error(`Series ${seriesId} not found`);
    }

    const seriesRaces = await this.getSeriesRaces(seriesId);
    const raceIds = seriesRaces.map(sr => sr.raceId);
    
    // Get all results for races in this series
    const allResults = Array.from(this.results.values())
      .filter(result => raceIds.includes(result.raceId));

    // Group by runner
    const runnerResults = new Map<number, (Result & { race: Race; points: number })[]>();
    
    for (const result of allResults) {
      const race = this.races.get(result.raceId);
      if (!race) continue;
      
      const points = this.calculateRacePoints(result, race);
      const resultWithPoints = { ...result, race, points };
      
      if (!runnerResults.has(result.runnerId)) {
        runnerResults.set(result.runnerId, []);
      }
      runnerResults.get(result.runnerId)!.push(resultWithPoints);
    }

    // Filter runners with minimum races and calculate standings
    const standings: SeriesStanding[] = [];
    
    for (const [runnerId, results] of runnerResults) {
      if (results.length < series.minimumRaces) continue;
      
      const runner = this.runners.get(runnerId);
      if (!runner) continue;

      // Sort races by points and take top races if maxRacesForScore is set
      const sortedResults = results.sort((a, b) => b.points - a.points);
      const scoringResults = series.maxRacesForScore 
        ? sortedResults.slice(0, series.maxRacesForScore)
        : sortedResults;

      const totalPoints = scoringResults.reduce((sum, r) => sum + r.points, 0);
      const averagePoints = totalPoints / scoringResults.length;
      const bestRacePoints = Math.max(...results.map(r => r.points));

      standings.push({
        runner,
        totalPoints,
        averagePoints,
        racesCompleted: results.length,
        bestRacePoints,
        results: sortedResults,
        rank: 0 // Will be set after sorting
      });
    }

    // Sort by total points and assign ranks
    standings.sort((a, b) => b.totalPoints - a.totalPoints);
    standings.forEach((standing, index) => {
      standing.rank = index + 1;
    });

    return {
      series,
      standings,
      totalParticipants: standings.length
    };
  }

  async getRunnerSeriesHistory(runnerId: number): Promise<(RaceSeries & { 
    racesCompleted: number; 
    totalPoints: number;
    rank: number;
  })[]> {
    const allSeries = Array.from(this.raceSeries.values());
    const history = [];

    for (const series of allSeries) {
      const leaderboard = await this.getSeriesLeaderboard(series.id);
      const standing = leaderboard.standings.find(s => s.runner.id === runnerId);
      
      if (standing) {
        history.push({
          ...series,
          racesCompleted: standing.racesCompleted,
          totalPoints: standing.totalPoints,
          rank: standing.rank
        });
      }
    }

    return history;
  }

  private async getSeriesParticipantCount(seriesId: number): Promise<number> {
    const seriesRaces = await this.getSeriesRaces(seriesId);
    const raceIds = seriesRaces.map(sr => sr.raceId);
    
    const participants = new Set<number>();
    Array.from(this.results.values())
      .filter(result => raceIds.includes(result.raceId))
      .forEach(result => participants.add(result.runnerId));
    
    return participants.size;
  }

  private calculateRacePoints(result: Result, race: Race): number {
    // Points based on placement: 1st = 100, 2nd = 95, 3rd = 90, etc.
    const basePoints = Math.max(0, 101 - result.overallPlace);
    
    // Bonus points for larger races
    const sizeMultiplier = race.totalFinishers > 500 ? 1.2 : 
                          race.totalFinishers > 200 ? 1.1 : 1.0;
    
    return Math.round(basePoints * sizeMultiplier);
  }

  private timeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // MM:SS
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
  }
}

export const storage = new MemStorage();
