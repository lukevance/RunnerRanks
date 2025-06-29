import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const runners = pgTable("runners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  gender: text("gender").notNull(), // "M", "F", "NB"
  age: integer("age").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  verified: boolean("verified").default(false),
  dateOfBirth: text("date_of_birth"), // For more accurate age matching
  alternateNames: text("alternate_names").array(), // Common name variations
  matchingConfidence: integer("matching_confidence").default(100), // 0-100 confidence score
});

export const races = pgTable("races", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(), // ISO date string
  distance: text("distance").notNull(), // "marathon", "half-marathon", "10k", "5k"
  distanceMiles: decimal("distance_miles", { precision: 4, scale: 2 }).notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  startTime: text("start_time").notNull(),
  weather: text("weather"),
  courseType: text("course_type"), // "point-to-point", "loop", "out-and-back"
  elevation: text("elevation"),
  totalFinishers: integer("total_finishers").notNull(),
  averageTime: text("average_time").notNull(), // HH:MM:SS format
  organizerWebsite: text("organizer_website"),
  resultsUrl: text("results_url"),
});

export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  runnerId: integer("runner_id").notNull().references(() => runners.id),
  raceId: integer("race_id").notNull().references(() => races.id),
  finishTime: text("finish_time").notNull(), // HH:MM:SS format
  overallPlace: integer("overall_place").notNull(),
  genderPlace: integer("gender_place"),
  ageGroupPlace: integer("age_group_place"),
  isPersonalBest: boolean("is_personal_best").default(false),
  isSeasonBest: boolean("is_season_best").default(false),
  notes: text("notes"), // "Boston Qualifier", "Age Group Win", etc.
  // Data provenance and matching
  sourceProvider: text("source_provider"), // "runsignup", "raceroster", "manual", etc.
  sourceResultId: text("source_result_id"), // External provider's result ID
  rawRunnerName: text("raw_runner_name"), // Original name from source
  rawLocation: text("raw_location"), // Original location from source
  rawAge: integer("raw_age"), // Original age from source
  matchingScore: integer("matching_score").default(100), // Confidence in runner match
  needsReview: boolean("needs_review").default(false), // Flagged for manual review
  importedAt: text("imported_at"), // When this result was imported
});

// New table for tracking potential runner matches during import
export const runnerMatches = pgTable("runner_matches", {
  id: serial("id").primaryKey(),
  candidateRunnerId: integer("candidate_runner_id").references(() => runners.id),
  rawRunnerData: text("raw_runner_data").notNull(), // JSON of original race data
  matchScore: integer("match_score").notNull(), // 0-100 confidence score
  matchReasons: text("match_reasons").array(), // What criteria matched
  status: text("status").notNull(), // "pending", "approved", "rejected", "auto_matched"
  sourceProvider: text("source_provider").notNull(),
  sourceRaceId: text("source_race_id").notNull(),
  reviewedBy: text("reviewed_by"), // User who reviewed the match
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull(),
});

// Race Series for tracking performance across multiple events
export const raceSeries = pgTable("race_series", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  year: integer("year").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  scoringSystem: text("scoring_system").notNull().default("points"), // "points", "time", "placement"
  minimumRaces: integer("minimum_races").notNull().default(2),
  maxRacesForScore: integer("max_races_for_score"), // null = count all races
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by"), // Admin who created the series
});

// Junction table linking races to series
export const raceSeriesRaces = pgTable("race_series_races", {
  id: serial("id").primaryKey(),
  seriesId: integer("series_id").notNull().references(() => raceSeries.id),
  raceId: integer("race_id").notNull().references(() => races.id),
  seriesRaceNumber: integer("series_race_number"), // 1st, 2nd, 3rd race in series
  pointsMultiplier: decimal("points_multiplier", { precision: 3, scale: 2 }).default("1.00"), // For weighted races
  isCountedInSeries: boolean("is_counted_in_series").notNull().default(true),
  addedAt: text("added_at").notNull(),
});

export const insertRunnerSchema = createInsertSchema(runners).omit({
  id: true,
});

export const insertRaceSchema = createInsertSchema(races).omit({
  id: true,
});

export const insertResultSchema = createInsertSchema(results).omit({
  id: true,
});

export const insertRunnerMatchSchema = createInsertSchema(runnerMatches).omit({
  id: true,
});

export const insertRaceSeriesSchema = createInsertSchema(raceSeries).omit({
  id: true,
  createdAt: true,
  createdBy: true,
});

export const insertRaceSeriesRaceSchema = createInsertSchema(raceSeriesRaces).omit({
  id: true,
});

export type InsertRunner = z.infer<typeof insertRunnerSchema>;
export type InsertRace = z.infer<typeof insertRaceSchema>;
export type InsertResult = z.infer<typeof insertResultSchema>;
export type InsertRunnerMatch = z.infer<typeof insertRunnerMatchSchema>;
export type InsertRaceSeries = z.infer<typeof insertRaceSeriesSchema>;
export type InsertRaceSeriesRace = z.infer<typeof insertRaceSeriesRaceSchema>;

export type Runner = typeof runners.$inferSelect;
export type Race = typeof races.$inferSelect;
export type Result = typeof results.$inferSelect;
export type RunnerMatch = typeof runnerMatches.$inferSelect;
export type RaceSeries = typeof raceSeries.$inferSelect;
export type RaceSeriesRace = typeof raceSeriesRaces.$inferSelect;

// Extended types for API responses
export type LeaderboardEntry = {
  id: number;
  runner: Runner;
  race: Race;
  result: Result;
};

export type RunnerWithStats = Runner & {
  marathonPR?: string;
  halfMarathonPR?: string;
  racesThisYear: number;
  ageGroupWins: number;
  results: (Result & { race: Race })[];
};

// Extended types for race series
export type RaceSeriesWithRaces = RaceSeries & {
  races: (RaceSeriesRace & { race: Race })[];
  totalRaces: number;
  participantCount: number;
};

export type SeriesStanding = {
  runner: Runner;
  totalPoints: number;
  averagePoints: number;
  racesCompleted: number;
  bestRacePoints: number;
  results: (Result & { race: Race; points: number })[];
  rank: number;
};

export type SeriesLeaderboard = {
  series: RaceSeries;
  standings: SeriesStanding[];
  totalParticipants: number;
};
