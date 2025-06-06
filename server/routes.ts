import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRunnerSchema, insertRaceSchema, insertResultSchema } from "@shared/schema";
import { runnerMatcher, type RawRunnerData } from "./runner-matching";

export async function registerRoutes(app: Express): Promise<Server> {
  // Leaderboard endpoint
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const { distance, gender, ageGroup, search, limit, offset } = req.query;
      
      const filters = {
        distance: distance as string,
        gender: gender as string,
        ageGroup: ageGroup as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      };

      const entries = await storage.getLeaderboard(filters);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Runner endpoints
  app.get("/api/runners", async (req, res) => {
    try {
      const runners = await storage.getAllRunners();
      res.json(runners);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch runners" });
    }
  });

  app.get("/api/runners/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const runner = await storage.getRunnerWithStats(id);
      
      if (!runner) {
        return res.status(404).json({ error: "Runner not found" });
      }
      
      res.json(runner);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch runner" });
    }
  });

  app.post("/api/runners", async (req, res) => {
    try {
      const validatedData = insertRunnerSchema.parse(req.body);
      const runner = await storage.createRunner(validatedData);
      res.status(201).json(runner);
    } catch (error) {
      res.status(400).json({ error: "Invalid runner data" });
    }
  });

  // Race endpoints
  app.get("/api/races", async (req, res) => {
    try {
      const races = await storage.getAllRaces();
      res.json(races);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch races" });
    }
  });

  app.get("/api/races/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const race = await storage.getRace(id);
      
      if (!race) {
        return res.status(404).json({ error: "Race not found" });
      }
      
      res.json(race);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch race" });
    }
  });

  app.post("/api/races", async (req, res) => {
    try {
      const validatedData = insertRaceSchema.parse(req.body);
      const race = await storage.createRace(validatedData);
      res.status(201).json(race);
    } catch (error) {
      res.status(400).json({ error: "Invalid race data" });
    }
  });

  // Result endpoints
  app.get("/api/results/runner/:runnerId", async (req, res) => {
    try {
      const runnerId = parseInt(req.params.runnerId);
      const results = await storage.getResultsByRunner(runnerId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch runner results" });
    }
  });

  app.get("/api/results/race/:raceId", async (req, res) => {
    try {
      const raceId = parseInt(req.params.raceId);
      const results = await storage.getResultsByRace(raceId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch race results" });
    }
  });

  app.post("/api/results", async (req, res) => {
    try {
      const validatedData = insertResultSchema.parse(req.body);
      const result = await storage.createResult(validatedData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: "Invalid result data" });
    }
  });

  // Data import endpoints for race providers
  app.post("/api/import/race-results", async (req, res) => {
    try {
      const { raceData, resultsData, sourceProvider } = req.body;
      
      if (!raceData || !resultsData || !sourceProvider) {
        return res.status(400).json({ error: "Missing required fields: raceData, resultsData, sourceProvider" });
      }

      // Create or find the race
      let race;
      try {
        const validatedRaceData = insertRaceSchema.parse(raceData);
        race = await storage.createRace(validatedRaceData);
      } catch (error) {
        return res.status(400).json({ error: "Invalid race data" });
      }

      const importResults = {
        imported: 0,
        matched: 0,
        newRunners: 0,
        needsReview: 0,
        errors: []
      };

      // Process each result
      for (const rawResult of resultsData) {
        try {
          const rawRunnerData: RawRunnerData = {
            name: rawResult.name || rawResult.runner_name,
            age: rawResult.age,
            gender: rawResult.gender || rawResult.sex,
            city: rawResult.city,
            state: rawResult.state,
            location: rawResult.location,
            email: rawResult.email,
            finishTime: rawResult.finish_time || rawResult.time,
            ...rawResult
          };

          // Use the matching service to find or create runner
          const matchResult = await runnerMatcher.matchRunner(
            rawRunnerData,
            sourceProvider,
            race.id.toString()
          );

          // Create the result record
          const resultData = {
            runnerId: matchResult.runner.id,
            raceId: race.id,
            finishTime: rawRunnerData.finishTime,
            overallPlace: rawResult.overall_place || rawResult.place || 0,
            genderPlace: rawResult.gender_place,
            ageGroupPlace: rawResult.age_group_place,
            isPersonalBest: false,
            isSeasonBest: false,
            notes: rawResult.notes,
            sourceProvider,
            sourceResultId: rawResult.id?.toString(),
            rawRunnerName: rawRunnerData.name,
            rawLocation: rawRunnerData.location,
            rawAge: rawRunnerData.age,
            matchingScore: matchResult.matchScore,
            needsReview: matchResult.needsReview,
            importedAt: new Date().toISOString()
          };

          await storage.createResult(resultData);

          importResults.imported++;
          if (matchResult.matchScore === 100) {
            importResults.newRunners++;
          } else {
            importResults.matched++;
          }
          if (matchResult.needsReview) {
            importResults.needsReview++;
          }

        } catch (error) {
          importResults.errors.push(`Error processing result for ${rawResult.name}: ${error}`);
        }
      }

      res.json({
        success: true,
        race: race,
        importResults
      });

    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Failed to import race results" });
    }
  });

  // Get import status and results that need review
  app.get("/api/import/review", async (req, res) => {
    try {
      // This would get results flagged for review
      const reviewResults = await storage.getResultsNeedingReview();
      res.json(reviewResults);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch review data" });
    }
  });

  // Runner matching endpoints
  app.post("/api/runners/match", async (req, res) => {
    try {
      const { rawRunnerData, sourceProvider, sourceRaceId } = req.body;
      
      const matchResult = await runnerMatcher.matchRunner(
        rawRunnerData,
        sourceProvider,
        sourceRaceId
      );
      
      res.json(matchResult);
    } catch (error) {
      res.status(500).json({ error: "Failed to match runner" });
    }
  });

  // Search for potential duplicate runners
  app.get("/api/runners/duplicates", async (req, res) => {
    try {
      const duplicates = await storage.findPotentialDuplicates();
      res.json(duplicates);
    } catch (error) {
      res.status(500).json({ error: "Failed to find duplicates" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
