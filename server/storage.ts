import { 
  runners, 
  races, 
  results,
  raceSeries,
  raceSeriesRaces,
  raceSeriesParticipants,
  runnerMatches,
  type Runner, 
  type Race, 
  type Result,
  type RaceSeries,
  type RaceSeriesRace,
  type RaceSeriesParticipant,
  type RunnerMatch,
  type InsertRunner, 
  type InsertRace, 
  type InsertResult,
  type InsertRaceSeries,
  type InsertRaceSeriesRace,
  type InsertRaceSeriesParticipant,
  type InsertRunnerMatch,
  type LeaderboardEntry,
  type RunnerWithStats,
  type RaceSeriesWithRaces,
  type SeriesStanding,
  type SeriesLeaderboard
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, ilike, sql, count } from "drizzle-orm";

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
  getAllRacesWithStats(): Promise<(Race & { participants: number })[]>;
  
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
  
  // Runner Matching
  createRunnerMatch(match: InsertRunnerMatch): Promise<RunnerMatch>;
  
  // Private Series Participants
  addRunnerToPrivateSeries(seriesId: number, runnerId: number, addedBy: string, notes?: string): Promise<RaceSeriesParticipant>;
  removeRunnerFromPrivateSeries(seriesId: number, runnerId: number): Promise<boolean>;
  getPrivateSeriesParticipants(seriesId: number): Promise<(RaceSeriesParticipant & { runner: Runner })[]>;
  isRunnerInPrivateSeries(seriesId: number, runnerId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Runners
  async getRunner(id: number): Promise<Runner | undefined> {
    const [runner] = await db.select().from(runners).where(eq(runners.id, id));
    return runner || undefined;
  }

  async getRunnerByEmail(email: string): Promise<Runner | undefined> {
    const [runner] = await db.select().from(runners).where(eq(runners.email, email));
    return runner || undefined;
  }

  async createRunner(insertRunner: InsertRunner): Promise<Runner> {
    const [runner] = await db.insert(runners).values(insertRunner).returning();
    return runner;
  }

  async getAllRunners(): Promise<Runner[]> {
    return await db.select().from(runners).orderBy(asc(runners.name));
  }

  // Races
  async getRace(id: number): Promise<Race | undefined> {
    const [race] = await db.select().from(races).where(eq(races.id, id));
    return race || undefined;
  }

  async createRace(insertRace: InsertRace): Promise<Race> {
    const [race] = await db.insert(races).values(insertRace).returning();
    return race;
  }

  async getAllRaces(): Promise<Race[]> {
    return await db.select().from(races).orderBy(desc(races.date));
  }

  async getAllRacesWithStats(): Promise<(Race & { participants: number })[]> {
    const racesWithCounts = await db
      .select({
        id: races.id,
        name: races.name,
        date: races.date,
        city: races.city,
        state: races.state,
        distance: races.distance,
        distanceMiles: races.distanceMiles,
        courseType: races.courseType,
        elevation: races.elevation,
        weather: races.weather,

        participants: count(results.id).as('participants')
      })
      .from(races)
      .leftJoin(results, eq(races.id, results.raceId))
      .groupBy(races.id)
      .orderBy(desc(races.date));
    
    return racesWithCounts.map(race => ({
      ...race,
      participants: Number(race.participants)
    }));
  }

  // Results
  async getResult(id: number): Promise<Result | undefined> {
    const [result] = await db.select().from(results).where(eq(results.id, id));
    return result || undefined;
  }

  async createResult(insertResult: InsertResult): Promise<Result> {
    const [result] = await db.insert(results).values(insertResult).returning();
    return result;
  }

  async getResultsByRunner(runnerId: number): Promise<(Result & { race: Race })[]> {
    return await db
      .select()
      .from(results)
      .innerJoin(races, eq(results.raceId, races.id))
      .where(eq(results.runnerId, runnerId))
      .orderBy(desc(races.date));
  }

  async getResultsByRace(raceId: number): Promise<(Result & { runner: Runner })[]> {
    const queryResult = await db
      .select()
      .from(results)
      .innerJoin(runners, eq(results.runnerId, runners.id))
      .where(eq(results.raceId, raceId))
      .orderBy(asc(results.overallPlace));
      
    // Transform the nested structure to match the expected format
    return queryResult.map((row: any) => ({
      ...row.results,
      runner: row.runners
    }));
  }

  // Leaderboard queries
  async getLeaderboard(filters?: {
    distance?: string;
    gender?: string;
    ageGroup?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<LeaderboardEntry[]> {
    let query = db
      .select({
        id: results.id,
        runner: runners,
        race: races,
        result: results,
      })
      .from(results)
      .innerJoin(runners, eq(results.runnerId, runners.id))
      .innerJoin(races, eq(results.raceId, races.id));

    // Apply filters
    const conditions = [];
    
    if (filters?.distance) {
      conditions.push(eq(races.distance, filters.distance));
    }
    
    if (filters?.gender) {
      conditions.push(eq(runners.gender, filters.gender));
    }
    
    if (filters?.ageGroup) {
      const [minAge, maxAge] = filters.ageGroup.split('-').map(Number);
      if (!isNaN(minAge) && !isNaN(maxAge)) {
        conditions.push(and(
          sql`${runners.age} >= ${minAge}`,
          sql`${runners.age} <= ${maxAge}`
        ));
      }
    }
    
    if (filters?.search) {
      conditions.push(or(
        ilike(runners.name, `%${filters.search}%`),
        ilike(races.name, `%${filters.search}%`)
      ));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(asc(sql`EXTRACT(EPOCH FROM ${results.finishTime}::interval)`));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async getRunnerWithStats(id: number): Promise<RunnerWithStats | undefined> {
    const runner = await this.getRunner(id);
    if (!runner) return undefined;

    const runnerResults = await this.getResultsByRunner(id);
    
    // Calculate stats
    const marathonTimes = runnerResults
      .filter(r => r.race.distance === 'Marathon')
      .map(r => r.finishTime)
      .sort();
    
    const halfMarathonTimes = runnerResults
      .filter(r => r.race.distance === 'Half Marathon')
      .map(r => r.finishTime)
      .sort();

    const currentYear = new Date().getFullYear();
    const racesThisYear = runnerResults.filter(r => 
      new Date(r.race.date).getFullYear() === currentYear
    ).length;

    const ageGroupWins = runnerResults.filter(r => r.ageGroupPlace === 1).length;

    return {
      ...runner,
      marathonPR: marathonTimes[0],
      halfMarathonPR: halfMarathonTimes[0],
      racesThisYear,
      ageGroupWins,
      results: runnerResults
    };
  }

  // Race Series
  async createRaceSeries(insertSeries: InsertRaceSeries): Promise<RaceSeries> {
    const [series] = await db.insert(raceSeries).values({
      ...insertSeries,
      createdAt: new Date().toISOString(),
      createdBy: 'admin' // TODO: Use actual user when auth is implemented
    }).returning();
    return series;
  }

  async getRaceSeries(id: number): Promise<RaceSeriesWithRaces | undefined> {
    const [series] = await db.select().from(raceSeries).where(eq(raceSeries.id, id));
    if (!series) return undefined;

    const seriesRaces = await this.getSeriesRaces(id);
    const participantCount = await this.getSeriesParticipantCount(id);

    return {
      ...series,
      races: seriesRaces,
      totalRaces: seriesRaces.length,
      participantCount
    };
  }

  async getAllRaceSeries(): Promise<RaceSeriesWithRaces[]> {
    const allSeries = await db.select().from(raceSeries).orderBy(desc(raceSeries.year));
    
    return await Promise.all(allSeries.map(async (series) => {
      const seriesRaces = await this.getSeriesRaces(series.id);
      const participantCount = await this.getSeriesParticipantCount(series.id);
      
      return {
        ...series,
        races: seriesRaces,
        totalRaces: seriesRaces.length,
        participantCount
      };
    }));
  }

  async updateRaceSeries(id: number, updates: Partial<InsertRaceSeries>): Promise<RaceSeries | undefined> {
    const [updated] = await db
      .update(raceSeries)
      .set(updates)
      .where(eq(raceSeries.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRaceSeries(id: number): Promise<boolean> {
    // First delete associated race series races
    await db.delete(raceSeriesRaces).where(eq(raceSeriesRaces.seriesId, id));
    
    // Then delete the series
    const result = await db.delete(raceSeries).where(eq(raceSeries.id, id));
    return result.rowCount > 0;
  }

  // Race Series Races
  async addRaceToSeries(seriesId: number, raceId: number, options?: {
    seriesRaceNumber?: number;
    pointsMultiplier?: string;
  }): Promise<RaceSeriesRace> {
    const [seriesRace] = await db.insert(raceSeriesRaces).values({
      seriesId,
      raceId,
      seriesRaceNumber: options?.seriesRaceNumber || 1,
      pointsMultiplier: options?.pointsMultiplier || '1.0'
    }).returning();
    return seriesRace;
  }

  async removeRaceFromSeries(seriesId: number, raceId: number): Promise<boolean> {
    const result = await db
      .delete(raceSeriesRaces)
      .where(and(
        eq(raceSeriesRaces.seriesId, seriesId),
        eq(raceSeriesRaces.raceId, raceId)
      ));
    return result.rowCount > 0;
  }

  async getSeriesRaces(seriesId: number): Promise<(RaceSeriesRace & { race: Race })[]> {
    return await db
      .select()
      .from(raceSeriesRaces)
      .innerJoin(races, eq(raceSeriesRaces.raceId, races.id))
      .where(eq(raceSeriesRaces.seriesId, seriesId))
      .orderBy(asc(raceSeriesRaces.seriesRaceNumber));
  }

  // Series Leaderboards
  async getSeriesLeaderboard(seriesId: number): Promise<SeriesLeaderboard> {
    const series = await db.select().from(raceSeries).where(eq(raceSeries.id, seriesId));
    if (!series[0]) {
      throw new Error(`Series ${seriesId} not found`);
    }

    const seriesRaces = await this.getSeriesRaces(seriesId);
    const raceIds = seriesRaces.map(sr => sr.race.id);

    if (raceIds.length === 0) {
      return {
        series: series[0],
        standings: [],
        totalParticipants: 0
      };
    }

    // Get all results for races in this series
    const allResults = await db
      .select()
      .from(results)
      .innerJoin(runners, eq(results.runnerId, runners.id))
      .innerJoin(races, eq(results.raceId, races.id))
      .where(sql`${results.raceId} IN (${sql.join(raceIds, sql`, `)})`);

    // For private series, filter by manually added participants
    let eligibleRunnerIds: Set<number> | null = null;
    if (series[0].isPrivate) {
      const privateParticipants = await this.getPrivateSeriesParticipants(seriesId);
      eligibleRunnerIds = new Set(privateParticipants.map(p => p.runner.id));
    }

    // Group by runner and calculate standings
    const runnerResults = new Map();
    
    for (const result of allResults) {
      const runnerId = result.results.runnerId;
      
      // For private series, only include manually added runners
      if (eligibleRunnerIds && !eligibleRunnerIds.has(runnerId)) {
        continue;
      }
      
      if (!runnerResults.has(runnerId)) {
        runnerResults.set(runnerId, []);
      }
      
      const points = this.calculateRacePoints(result.results, result.races);
      runnerResults.get(runnerId).push({
        ...result.results,
        race: result.races,
        points
      });
    }

    // Calculate standings
    const standings: SeriesStanding[] = [];
    
    for (const [runnerId, raceResults] of runnerResults) {
      if (raceResults.length < series[0].minimumRaces) continue;

      const runner = await this.getRunner(runnerId);
      if (!runner) continue;

      const totalPoints = raceResults.reduce((sum: number, r: any) => sum + r.points, 0);
      const averagePoints = totalPoints / raceResults.length;
      const bestRacePoints = Math.max(...raceResults.map((r: any) => r.points));

      standings.push({
        runner,
        totalPoints,
        averagePoints,
        racesCompleted: raceResults.length,
        bestRacePoints,
        results: raceResults,
        rank: 0 // Will be set after sorting
      });
    }

    // Sort by total points and assign ranks
    standings.sort((a, b) => b.totalPoints - a.totalPoints);
    standings.forEach((standing, index) => {
      standing.rank = index + 1;
    });

    return {
      series: series[0],
      standings,
      totalParticipants: standings.length
    };
  }

  async getRunnerSeriesHistory(runnerId: number): Promise<(RaceSeries & { 
    racesCompleted: number; 
    totalPoints: number;
    rank: number;
  })[]> {
    // Get all series the runner has participated in
    const participatedSeries = await db
      .selectDistinct({ series: raceSeries })
      .from(raceSeries)
      .innerJoin(raceSeriesRaces, eq(raceSeries.id, raceSeriesRaces.seriesId))
      .innerJoin(results, eq(raceSeriesRaces.raceId, results.raceId))
      .where(eq(results.runnerId, runnerId));

    const history = [];
    
    for (const { series } of participatedSeries) {
      const leaderboard = await this.getSeriesLeaderboard(series.id);
      const runnerStanding = leaderboard.standings.find(s => s.runner.id === runnerId);
      
      if (runnerStanding) {
        history.push({
          ...series,
          racesCompleted: runnerStanding.racesCompleted,
          totalPoints: runnerStanding.totalPoints,
          rank: runnerStanding.rank
        });
      }
    }

    return history.sort((a, b) => b.year - a.year);
  }

  // Runner Matching
  async createRunnerMatch(insertMatch: InsertRunnerMatch): Promise<RunnerMatch> {
    const [match] = await db.insert(runnerMatches).values(insertMatch).returning();
    return match;
  }

  // Private Series Participants
  async addRunnerToPrivateSeries(seriesId: number, runnerId: number, addedBy: string, notes?: string): Promise<RaceSeriesParticipant> {
    const [participant] = await db.insert(raceSeriesParticipants).values({
      seriesId,
      runnerId,
      addedBy,
      addedAt: new Date().toISOString(),
      notes: notes || null
    }).returning();
    return participant;
  }

  async removeRunnerFromPrivateSeries(seriesId: number, runnerId: number): Promise<boolean> {
    const result = await db
      .delete(raceSeriesParticipants)
      .where(and(
        eq(raceSeriesParticipants.seriesId, seriesId),
        eq(raceSeriesParticipants.runnerId, runnerId)
      ));
    return (result.rowCount || 0) > 0;
  }

  async getPrivateSeriesParticipants(seriesId: number): Promise<(RaceSeriesParticipant & { runner: Runner })[]> {
    const results = await db
      .select({
        // Participant fields
        id: raceSeriesParticipants.id,
        seriesId: raceSeriesParticipants.seriesId,
        runnerId: raceSeriesParticipants.runnerId,
        addedBy: raceSeriesParticipants.addedBy,
        addedAt: raceSeriesParticipants.addedAt,
        notes: raceSeriesParticipants.notes,
        // Runner fields
        runner: runners
      })
      .from(raceSeriesParticipants)
      .innerJoin(runners, eq(raceSeriesParticipants.runnerId, runners.id))
      .where(eq(raceSeriesParticipants.seriesId, seriesId))
      .orderBy(asc(runners.name));
    
    return results.map(r => ({
      id: r.id,
      seriesId: r.seriesId,
      runnerId: r.runnerId,
      addedBy: r.addedBy,
      addedAt: r.addedAt,
      notes: r.notes,
      runner: r.runner
    }));
  }

  async isRunnerInPrivateSeries(seriesId: number, runnerId: number): Promise<boolean> {
    const [participant] = await db
      .select()
      .from(raceSeriesParticipants)
      .where(and(
        eq(raceSeriesParticipants.seriesId, seriesId),
        eq(raceSeriesParticipants.runnerId, runnerId)
      ));
    return !!participant;
  }

  // Private helper methods
  private async getSeriesParticipantCount(seriesId: number): Promise<number> {
    const seriesRaces = await this.getSeriesRaces(seriesId);
    const raceIds = seriesRaces.map(sr => sr.race.id);
    
    if (raceIds.length === 0) return 0;

    const [result] = await db
      .select({ count: count(sql`DISTINCT ${results.runnerId}`) })
      .from(results)
      .where(sql`${results.raceId} IN (${sql.join(raceIds, sql`, `)})`);
    
    return result?.count || 0;
  }

  private calculateRacePoints(result: Result, race: Race): number {
    const basePoints = Math.max(0, 100 - result.overallPlace + 1);
    const sizeBonus = Math.min(50, Math.floor(race.totalFinishers / 100) * 5);
    return basePoints + sizeBonus;
  }
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

    // Sample race series
    const sampleSeries = [
      {
        name: "Bay Area Marathon Series 2024",
        description: "Premier marathon series across the San Francisco Bay Area",
        year: 2024,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        scoringSystem: "points",
        minimumRaces: 2,
        maxRacesForScore: 4,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: "admin"
      },
      {
        name: "Northern California Trail Series",
        description: "Trail running series featuring scenic routes",
        year: 2024,
        startDate: "2024-03-01",
        endDate: "2024-11-30",
        scoringSystem: "points",
        minimumRaces: 3,
        maxRacesForScore: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: "admin"
      }
    ];

    // Create race series
    for (const seriesData of sampleSeries) {
      const series = await this.createRaceSeries(seriesData);
      
      // Add races to first series
      if (series.id === 1) {
        await this.addRaceToSeries(series.id, 1, { seriesRaceNumber: 1 });
        await this.addRaceToSeries(series.id, 2, { seriesRaceNumber: 2 });
        await this.addRaceToSeries(series.id, 3, { seriesRaceNumber: 3 });
      }
      
      // Add races to second series
      if (series.id === 2) {
        await this.addRaceToSeries(series.id, 3, { seriesRaceNumber: 1 });
        await this.addRaceToSeries(series.id, 4, { seriesRaceNumber: 2 });
        await this.addRaceToSeries(series.id, 5, { seriesRaceNumber: 3 });
      }
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

  async createRunnerMatch(insertMatch: InsertRunnerMatch): Promise<RunnerMatch> {
    // For MemStorage, we don't need to persist these, just return a dummy record
    return {
      id: Date.now(),
      ...insertMatch,
      createdAt: new Date().toISOString()
    };
  }

  // Private Series Participants (stub methods for MemStorage)
  async addRunnerToPrivateSeries(seriesId: number, runnerId: number, addedBy: string, notes?: string): Promise<RaceSeriesParticipant> {
    return {
      id: Date.now(),
      seriesId,
      runnerId,
      addedBy,
      addedAt: new Date().toISOString(),
      notes: notes || null
    };
  }

  async removeRunnerFromPrivateSeries(seriesId: number, runnerId: number): Promise<boolean> {
    return true; // Stub implementation
  }

  async getPrivateSeriesParticipants(seriesId: number): Promise<(RaceSeriesParticipant & { runner: Runner })[]> {
    return []; // Stub implementation
  }

  async isRunnerInPrivateSeries(seriesId: number, runnerId: number): Promise<boolean> {
    return false; // Stub implementation - MemStorage doesn't support private series
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

export const storage = new DatabaseStorage();
