import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRunnerSchema, insertRaceSchema, insertResultSchema } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}
