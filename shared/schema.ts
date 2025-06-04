import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const runners = pgTable("runners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  gender: text("gender").notNull(), // "M", "F", "NB"
  age: integer("age").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
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

export type InsertRunner = z.infer<typeof insertRunnerSchema>;
export type InsertRace = z.infer<typeof insertRaceSchema>;
export type InsertResult = z.infer<typeof insertResultSchema>;

export type Runner = typeof runners.$inferSelect;
export type Race = typeof races.$inferSelect;
export type Result = typeof results.$inferSelect;

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
