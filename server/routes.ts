/**
 * API Routes Definition
 * 
 * This file contains all HTTP endpoints for the running leaderboard platform.
 * It handles data import from race providers, leaderboard queries, runner management,
 * race series operations, and administrative functions.
 * 
 * Key Route Categories:
 * - Leaderboard: GET /api/leaderboard (main data display)
 * - Runners: CRUD operations for athlete profiles  
 * - Races: Race event management and queries
 * - Results: Individual race performance data
 * - Import: Data import from RunSignup, RaceRoster, and CSV
 * - Race Series: Multi-race competition management (admin-only)
 * - Runner Review: Manual verification system for data quality
 * 
 * Data Import Flow:
 * 1. Validate API credentials and parameters
 * 2. Fetch race data from external providers
 * 3. Apply runner matching algorithms to prevent duplicates
 * 4. Create database records with audit trails
 * 5. Return import statistics and error reports
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRunnerSchema, insertRaceSchema, insertResultSchema, insertRaceSeriesSchema } from "@shared/schema";
import { runnerMatcher, type RawRunnerData } from "./runner-matching";
import { RunSignupProvider } from "./providers/runsignup";
import { RaceRosterProvider } from "./providers/raceroster";
import { z } from "zod";

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
      console.error('Leaderboard error:', error);
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
      console.log(`Getting runner with stats for ID: ${id}`);
      
      // Get basic runner info
      const runner = await storage.getRunner(id);
      if (!runner) {
        return res.status(404).json({ error: "Runner not found" });
      }
      
      try {
        // Try to get stats, fallback to basic runner if stats fail
        const runnerWithStats = await storage.getRunnerWithStats(id);
        res.json(runnerWithStats || runner);
      } catch (statsError) {
        console.error(`Stats calculation failed for runner ${id}:`, statsError);
        // Return basic runner info if stats calculation fails
        res.json({
          ...runner,
          marathonPR: undefined,
          halfMarathonPR: undefined,
          racesThisYear: 0,
          ageGroupWins: 0,
          results: []
        });
      }
    } catch (error) {
      console.error(`Runner API error for ID ${req.params.id}:`, error);
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
      // Temporarily get participant counts separately for each race
      const racesWithStats = await Promise.all(races.map(async (race) => {
        try {
          const raceResults = await storage.getResultsByRace(race.id);
          return {
            ...race,
            participants: raceResults.length
          };
        } catch (err) {
          return {
            ...race,
            participants: 0
          };
        }
      }));
      res.json(racesWithStats);
    } catch (error) {
      console.error('Races API error:', error);
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

  app.delete("/api/races/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteRace(id);
      if (success) {
        res.json({ success: true, message: "Race deleted successfully" });
      } else {
        res.status(404).json({ error: "Race not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete race" });
    }
  });

  app.get("/api/races/:id/results", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const results = await storage.getResultsByRace(id);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch race results" });
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

  // CSV Import endpoint
  app.post("/api/import/csv", async (req, res) => {
    try {
      const { csvData, sourceProvider = 'csv' } = req.body;
      
      if (!csvData) {
        return res.status(400).json({ error: "CSV data is required" });
      }

      // Parse CSV data
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
      
      // Create a synthetic race for CSV imports
      const raceData = {
        name: "CSV Import Race",
        date: new Date().toISOString().split('T')[0],
        distance: "marathon",
        distanceMiles: "26.20",
        city: "Unknown",
        state: "Unknown",
        startTime: "7:00 AM",
        weather: null,
        courseType: null,
        elevation: null,
        totalFinishers: lines.length - 1,
        averageTime: "0:00:00",
        organizerWebsite: null,
        resultsUrl: null
      };

      const race = await storage.createRace(raceData);

      const importResults = {
        imported: 0,
        matched: 0,
        newRunners: 0,
        needsReview: 0,
        errors: []
      };

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map((v: string) => v.trim());
          const rowData: any = {};
          
          headers.forEach((header, index) => {
            if (values[index]) {
              rowData[header] = values[index];
            }
          });

          const rawRunnerData: RawRunnerData = {
            name: rowData.name || rowData.runner_name || '',
            age: rowData.age ? parseInt(rowData.age) : undefined,
            gender: rowData.gender || rowData.sex,
            city: rowData.city,
            state: rowData.state,
            location: rowData.location,
            email: rowData.email,
            finishTime: rowData.finish_time || rowData.time || rowData.finishtime || ''
          };

          if (!rawRunnerData.name || !rawRunnerData.finishTime) {
            importResults.errors.push(`Row ${i}: Missing required name or finish_time`);
            continue;
          }

          const matchResult = await runnerMatcher.matchRunner(
            rawRunnerData,
            sourceProvider,
            race.id.toString()
          );

          const resultData = {
            runnerId: matchResult.runner.id,
            raceId: race.id,
            finishTime: rawRunnerData.finishTime,
            overallPlace: rowData.overall_place ? parseInt(rowData.overall_place) : i,
            genderPlace: rowData.gender_place ? parseInt(rowData.gender_place) : null,
            ageGroupPlace: rowData.age_group_place ? parseInt(rowData.age_group_place) : null,
            isPersonalBest: false,
            isSeasonBest: false,
            notes: rowData.notes,
            sourceProvider,
            sourceResultId: `csv_${i}`,
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
          importResults.errors.push(`Row ${i}: ${error}`);
        }
      }

      res.json({
        success: true,
        race: race,
        importResults
      });

    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ error: "Failed to import CSV data" });
    }
  });

  // URL Import endpoints
  app.post("/api/import/runsignup", async (req, res) => {
    try {
      const { url, raceName } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "RunSignup URL is required" });
      }

      // Extract race ID and result set ID from URL
      const raceMatch = url.match(/\/Race\/Results\/(\d+)/);
      const resultSetMatch = url.match(/resultSetId=(\d+)/);
      
      if (!raceMatch) {
        return res.status(400).json({ error: "Invalid RunSignup URL format" });
      }

      const raceId = raceMatch[1];
      const resultSetId = resultSetMatch ? resultSetMatch[1] : null;

      // Fetch the race results page
      const response = await fetch(url);
      const html = await response.text();
      
      // Extract race information from HTML
      const raceNameMatch = html.match(/<title>([^<]+) Results<\/title>/);
      const extractedRaceName = raceNameMatch ? raceNameMatch[1] : (raceName || `Race ${raceId}`);
      
      // Extract event IDs from the page (RunSignup embeds these for different race distances)
      const eventIdMatches = html.match(/Results\.addEventInfo\((\d+),\s*"([^"]+)"\)/g);
      let resultsData = [];
      let eventInfo = { eventId: null as string | null, distance: "Unknown" };
      
      if (eventIdMatches) {
        console.log(`Found ${eventIdMatches.length} events to check for results`);
        // Check multiple events to find the one with the most results
        let bestEvent = { eventId: null as string | null, distance: "Unknown", resultCount: 0 };
        
        for (const match of eventIdMatches) {
          const eventMatch = match.match(/Results\.addEventInfo\((\d+),\s*"([^"]+)"\)/);
          if (eventMatch) {
            const eventId = eventMatch[1];
            const distance = eventMatch[2];
            
            try {
              // Quick check to see how many results this event has
              let apiUrl = `https://runsignup.com/Rest/race/${raceId}/results/get-results?event_id=${eventId}&format=json`;
              let apiResponse = await fetch(apiUrl);
              let apiData = await apiResponse.json();
              
              if (apiData.individual_results_sets && apiData.individual_results_sets.length > 0) {
                const resultCount = apiData.individual_results_sets[0].results?.length || 0;
                console.log(`Event ${eventId} (${distance}): ${resultCount} results`);
                
                if (resultCount > bestEvent.resultCount) {
                  bestEvent = { eventId, distance, resultCount };
                }
              }
            } catch (apiError) {
              console.log(`Failed to check event ${eventId}:`, apiError);
            }
          }
        }
        
        // Now fetch all results from the best event with pagination
        if (bestEvent.eventId) {
          console.log(`Using event ${bestEvent.eventId} (${bestEvent.distance}) with ${bestEvent.resultCount} results`);
          
          try {
            // First try to get all results without pagination
            let apiUrl = `https://runsignup.com/Rest/race/${raceId}/results/get-results?event_id=${bestEvent.eventId}&format=json`;
            let apiResponse = await fetch(apiUrl);
            let apiData = await apiResponse.json();
            let allResults: any[] = [];
            
            if (apiData.individual_results_sets && apiData.individual_results_sets.length > 0) {
              allResults = apiData.individual_results_sets[0].results || [];
              console.log(`Found ${allResults.length} total results for ${bestEvent.distance} (event ${bestEvent.eventId}) without pagination`);
            }
            
            // Always try pagination to ensure we get all results
            // RunSignup often limits initial responses, so we need to paginate through all results
            console.log(`Attempting pagination to ensure we get all results...`);
            allResults = [];
            let page = 1;
            const pageSize = 100;
            let hasMoreResults = true;
            
            while (hasMoreResults) {
              apiUrl = `https://runsignup.com/Rest/race/${raceId}/results/get-results?event_id=${bestEvent.eventId}&format=json&page=${page}&num=${pageSize}`;
              apiResponse = await fetch(apiUrl);
              apiData = await apiResponse.json();
              
              if (apiData.individual_results_sets && apiData.individual_results_sets.length > 0) {
                const pageResults = apiData.individual_results_sets[0].results || [];
                allResults.push(...pageResults);
                
                console.log(`Page ${page}: Found ${pageResults.length} results for ${bestEvent.distance} (event ${bestEvent.eventId})`);
                
                // If we got fewer results than the page size, we've reached the end
                if (pageResults.length < pageSize) {
                  hasMoreResults = false;
                }
                
                page++;
              } else {
                hasMoreResults = false;
              }
              
              // Safety check to prevent infinite loops
              if (page > 100) {
                console.log(`Stopping pagination at page ${page} for safety`);
                break;
              }
            }
            
            console.log(`Total found via pagination: ${allResults.length} results for ${bestEvent.distance} (event ${bestEvent.eventId}) across ${page - 1} pages`);
            
            if (allResults.length > 0) {
              resultsData = allResults;
              eventInfo = { eventId: bestEvent.eventId, distance: bestEvent.distance };
              console.log(`Final count: ${resultsData.length} results for ${bestEvent.distance} (event ${bestEvent.eventId})`);
            }
          } catch (apiError) {
            console.log(`Failed to fetch results for best event ${bestEvent.eventId}:`, apiError);
          }
        }
      }
      
      if (resultsData.length === 0) {
        return res.status(400).json({ 
          error: `No results found for ${extractedRaceName}. Checked ${eventIdMatches?.length || 0} events but none contained race results. This might be a future race or the results may not be published yet.`,
          extractedRaceName,
          raceId,
          resultSetId,
          eventsChecked: eventIdMatches?.length || 0
        });
      }

      // Normalize distance for our schema
      const normalizedDistance = eventInfo.distance.toLowerCase().includes('marathon') && !eventInfo.distance.toLowerCase().includes('half') 
        ? 'marathon' 
        : eventInfo.distance.toLowerCase().includes('half') 
        ? 'half-marathon'
        : eventInfo.distance.toLowerCase().includes('10k')
        ? '10k'
        : eventInfo.distance.toLowerCase().includes('5k')
        ? '5k'
        : 'other';

      const distanceMiles = normalizedDistance === 'marathon' ? '26.2' 
        : normalizedDistance === 'half-marathon' ? '13.1'
        : normalizedDistance === '10k' ? '6.2'
        : normalizedDistance === '5k' ? '3.1'
        : '0';

      // Create race entry with extracted information
      const race = await storage.createRace({
        name: `${extractedRaceName} - ${eventInfo.distance}`,
        date: new Date().toISOString().split('T')[0],
        distance: normalizedDistance,
        distanceMiles: distanceMiles,
        city: "TBD",
        state: "TBD", 
        startTime: "08:00:00",
        totalFinishers: resultsData.length,
        averageTime: "04:00:00"
      });

      // Process results and match runners
      const importResults = {
        totalResults: resultsData.length,
        imported: 0,
        matched: 0,
        newRunners: 0,
        needsReview: 0,
        errors: [] as string[]
      };

      for (let i = 0; i < resultsData.length; i++) {
        const result = resultsData[i];
        try {
          // Normalize runner data from RunSignup API format
          const rawRunnerData: RawRunnerData = {
            name: `${result.first_name || ''} ${result.last_name || ''}`.trim(),
            age: result.age,
            gender: result.gender,
            city: result.city,
            state: result.state,
            finishTime: result.finish_time || result.chip_time || result.gun_time || "0:00:00"
          };

          if (isDevMode && (i % 10 === 0 || i < 5)) {
            console.log(`[RunSignupImport] Processing result ${i + 1}/${resultsData.length}: ${rawRunnerData.name}`);
          }

          // Data validation - skip invalid results
          if (!rawRunnerData.name || rawRunnerData.name.trim().length === 0) {
            importResults.errors.push(`Skipping result ${i + 1}: missing name`);
            continue;
          }

          if (!rawRunnerData.finishTime || rawRunnerData.finishTime === "0:00:00") {
            importResults.errors.push(`Skipping result for ${rawRunnerData.name}: missing or invalid finish time`);
            continue;
          }

          // RUNNER MATCHING PROCESS
          // This is the core logic for preventing duplicate runners while maintaining data integrity
          const { runner, matchScore, needsReview } = await runnerMatcher.matchRunner(
            rawRunnerData, 
            "runsignup", // source provider 
            raceId // external source ID for audit trail
          );
          
          // Performance optimization: skip individual match logging for speed

          // Create result record linking runner to this race
          await storage.createResult({
            runnerId: runner.id,
            raceId: race.id,
            finishTime: rawRunnerData.finishTime,
            overallPlace: result.overall_place || result.place || 0,
            genderPlace: result.gender_place || null,
            ageGroupPlace: result.age_group_place || null,
            sourceProvider: "runsignup",
            rawRunnerName: rawRunnerData.name, // Preserve original name for audit
            matchingScore: matchScore,
            needsReview: needsReview
          });

          // Track import statistics for reporting
          importResults.imported++;
          if (matchScore >= 95) {
            importResults.matched++; // High-confidence automatic match
          } else if (matchScore === 0) {
            importResults.newRunners++; // New runner created
          } else if (needsReview) {
            importResults.needsReview++; // Flagged for manual review
          }

        } catch (error) {
          console.error("Error processing RunSignup result:", error);
          importResults.errors.push(`Failed to process result ${i + 1} for ${result.first_name} ${result.last_name}: ${error.message}`);
          
          if (isDevMode) {
            console.error(`[RunSignupImport] Result processing error:`, {
              resultIndex: i,
              runnerName: `${result.first_name} ${result.last_name}`,
              error: error.message,
              stack: error.stack?.substring(0, 200)
            });
          }
        }
      }

      res.json({
        success: true,
        race: race,
        importResults
      });

    } catch (error) {
      console.error("RunSignup import error:", error);
      res.status(500).json({ error: "Failed to import from RunSignup" });
    }
  });

  /**
   * Official RunSignup API import endpoint
   * 
   * This route handles importing race data directly from the RunSignup API using
   * proper authentication credentials. It includes comprehensive error handling,
   * runner matching, and progress tracking.
   * 
   * Process:
   * 1. Validate API credentials and request parameters
   * 2. Fetch race information and verify event exists
   * 3. Import results using paginated API calls
   * 4. Match runners using fuzzy matching algorithms
   * 5. Create race and result records with proper data integrity
   * 
   * Known Issues:
   * - Pagination may be limited to ~50 results due to API constraints
   * - Some events may not have accessible results (privacy settings)
   * - Rate limiting may affect large imports
   * 
   * @body {string} raceId - RunSignup race ID
   * @body {string} eventId - Specific event ID within the race  
   * @body {string} raceName - Optional race name override
   */
  // In-memory store for import progress
  const importProgress = new Map<string, any>();

  // Progress endpoint for real-time updates
  app.get("/api/import/progress/:importId", (req, res) => {
    const importId = req.params.importId;
    const progress = importProgress.get(importId) || { status: 'not_found' };
    res.json(progress);
  });

  app.post("/api/import/runsignup-api", async (req, res) => {
    const isDevMode = process.env.NODE_ENV === 'development';
    const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize progress tracking
    importProgress.set(importId, {
      status: 'starting',
      current: 0,
      total: 0,
      imported: 0,
      matched: 0,
      newRunners: 0,
      needsReview: 0,
      errors: 0
    });
    
    // Return import ID immediately for progress tracking
    res.json({ success: true, importId, message: 'Import started. Use /api/import/progress/' + importId + ' to track progress.' });
    
    // Continue import in background
    setImmediate(async () => {
    try {
      const { raceId, eventId, raceName } = req.body;
      
      if (isDevMode) {
        console.log(`[RunSignupImport] Starting import request:`, { raceId, eventId, raceName });
      }
      
      // Parameter validation
      if (!raceId) {
        importProgress.set(importId, {
          status: 'failed',
          error: "Race ID is required"
        });
        return;
      }

      if (!eventId) {
        importProgress.set(importId, {
          status: 'failed',
          error: "Event ID is required. Please use /api/runsignup/race/:raceId/events to get available events first."
        });
        return;
      }

      // Credentials validation
      const apiKey = process.env.RUNSIGNUP_API_KEY;
      const apiSecret = process.env.RUNSIGNUP_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        if (isDevMode) {
          console.error(`[RunSignupImport] Missing API credentials`);
        }
        importProgress.set(importId, {
          status: 'failed',
          error: "RunSignup API credentials not configured. Please contact admin to set up API access."
        });
        return;
      }

      console.log(`Starting RunSignup API import for race ${raceId}${eventId ? `, event ${eventId}` : ''}`);
      
      if (isDevMode) {
        console.log(`[RunSignupImport] Initializing RunSignup provider with credentials`);
      }

      const runSignupProvider = new RunSignupProvider(apiKey, apiSecret);
      
      // Step 1: Get race information for the specific event
      if (isDevMode) {
        console.log(`[RunSignupImport] Fetching race info for race ${raceId}, event ${eventId}`);
      }
      
      const raceData = await runSignupProvider.getRaceInfo(raceId, eventId);
      console.log(`Found race: ${raceData.name}`);
      
      if (isDevMode) {
        console.log(`[RunSignupImport] Race data received:`, { 
          name: raceData.name,
          date: raceData.date,
          distance: raceData.distance,
          location: `${raceData.city}, ${raceData.state}`
        });
      }
      
      // Step 2: Get results for the specific event (with pagination)
      if (isDevMode) {
        console.log(`[RunSignupImport] Starting results fetch with pagination...`);
      }
      
      const resultsData = await runSignupProvider.getResults(raceId, eventId);
      console.log(`Found ${resultsData.length} results`);
      
      if (isDevMode) {
        console.log(`[RunSignupImport] Results received:`, {
          totalResults: resultsData.length,
          sampleNames: resultsData.slice(0, 3).map(r => `${r.first_name} ${r.last_name}`),
          hasPagination: resultsData.length >= 50 ? 'Possible' : 'Complete'
        });
      }

      if (resultsData.length === 0) {
        console.log(`No results found for race ${raceId}, event ${eventId}`);
        importProgress.set(importId, {
          status: 'failed',
          error: `No results found for race ${raceId}${eventId ? ` event ${eventId}` : ''}. The race may not have results published yet or may be private.`
        });
        return;
      }

      // Step 3: Create race record in database
      if (isDevMode) {
        console.log(`[RunSignupImport] Creating race record...`);
      }
      
      const race = await storage.createRace({
        name: raceName || raceData.name,
        date: raceData.date,
        distance: raceData.distance,
        distanceMiles: raceData.distanceMiles,
        city: raceData.city,
        state: raceData.state,
        startTime: raceData.startTime,
        totalFinishers: resultsData.length,
        averageTime: "00:00:00" // Will be calculated after all results are imported
      });

      console.log(`Created race record with ID ${race.id}`);
      
      if (isDevMode) {
        console.log(`[RunSignupImport] Race created:`, {
          id: race.id,
          name: race.name,
          distance: race.distance,
          totalResults: resultsData.length
        });
      }

      // Step 4: Import results with comprehensive runner matching
      if (isDevMode) {
        console.log(`[RunSignupImport] Starting runner matching and result import...`);
      }
      
      // Step 4: Import results with comprehensive runner matching and progress tracking
      importProgress.set(importId, {
        status: 'importing',
        current: 0,
        total: resultsData.length,
        imported: 0,
        matched: 0,
        newRunners: 0,
        needsReview: 0,
        errors: 0,
        raceName: race.name
      });
      
      if (isDevMode) {
        console.log(`[RunSignupImport] Starting runner matching and result import for ${resultsData.length} results...`);
      }
      
      const importResults = {
        totalResults: resultsData.length,
        imported: 0,
        matched: 0,
        newRunners: 0,
        needsReview: 0,
        errors: [] as string[]
      };

      for (let i = 0; i < resultsData.length; i++) {
        const result = resultsData[i];
        try {
          // Normalize runner data from RunSignup API format
          const rawRunnerData: RawRunnerData = {
            name: `${result.first_name || ''} ${result.last_name || ''}`.trim(),
            age: result.age,
            gender: result.gender,
            city: result.city,
            state: result.state,
            finishTime: result.finish_time || result.chip_time || result.gun_time || "0:00:00"
          };

          // Data validation - skip invalid results
          if (!rawRunnerData.name || rawRunnerData.name.trim().length === 0) {
            importResults.errors.push(`Skipping result ${i + 1}: missing name`);
            continue;
          }

          if (!rawRunnerData.finishTime || rawRunnerData.finishTime === "0:00:00") {
            importResults.errors.push(`Skipping result for ${rawRunnerData.name}: missing or invalid finish time`);
            continue;
          }

          // RUNNER MATCHING PROCESS (optimized for performance)
          const { runner, matchScore, needsReview } = await runnerMatcher.matchRunner(
            rawRunnerData, 
            "runsignup", 
            raceId 
          );

          // Create result record linking runner to this race
          await storage.createResult({
            runnerId: runner.id,
            raceId: race.id,
            finishTime: rawRunnerData.finishTime,
            overallPlace: result.overall_place || result.place || 0,
            genderPlace: result.gender_place || null,
            ageGroupPlace: result.age_group_place || null,
            sourceProvider: "runsignup",
            rawRunnerName: rawRunnerData.name,
            matchingScore: matchScore,
            needsReview: needsReview
          });

          // Track import statistics for reporting
          importResults.imported++;
          if (matchScore >= 95) {
            importResults.matched++;
          } else if (matchScore === 0) {
            importResults.newRunners++;
          } else if (needsReview) {
            importResults.needsReview++;
          }

          // Update progress every 25 results or on last result
          if (i % 25 === 0 || i === resultsData.length - 1) {
            importProgress.set(importId, {
              status: 'importing',
              current: i + 1,
              total: resultsData.length,
              imported: importResults.imported,
              matched: importResults.matched,
              newRunners: importResults.newRunners,
              needsReview: importResults.needsReview,
              errors: importResults.errors.length,
              raceName: race.name,
              percentage: Math.round(((i + 1) / resultsData.length) * 100)
            });
          }

        } catch (error) {
          console.error("Error processing RunSignup result:", error);
          importResults.errors.push(`Failed to process result ${i + 1} for ${result.first_name} ${result.last_name}: ${error.message}`);
        }
      }

      // Step 5: Final import summary and cleanup
      const finalSummary = `RunSignup API import complete: ${importResults.imported}/${importResults.totalResults} results imported`;
      console.log(finalSummary);
      
      if (isDevMode) {
        console.log(`[RunSignupImport] Final statistics:`, {
          totalResults: importResults.totalResults,
          imported: importResults.imported,
          matched: importResults.matched,
          newRunners: importResults.newRunners,
          needsReview: importResults.needsReview,
          errors: importResults.errors.length,
          successRate: `${((importResults.imported / importResults.totalResults) * 100).toFixed(1)}%`
        });
      }

      // Mark import as completed
      importProgress.set(importId, {
        status: 'completed',
        current: resultsData.length,
        total: resultsData.length,
        imported: importResults.imported,
        matched: importResults.matched,
        newRunners: importResults.newRunners,
        needsReview: importResults.needsReview,
        errors: importResults.errors.length,
        raceName: race.name,
        percentage: 100,
        race: race,
        summary: finalSummary,
        completedAt: new Date().toISOString()
      });

      // Clean up progress after 5 minutes
      setTimeout(() => {
        importProgress.delete(importId);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error("RunSignup API import error:", error);
      
      // Mark import as failed
      importProgress.set(importId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack?.substring(0, 300) : 'Unknown error'
      });
      
      if (isDevMode) {
        console.error(`[RunSignupImport] Critical error:`, {
          message: error.message,
          stack: error.stack?.substring(0, 300),
          type: error.constructor.name
        });
      }
    }
    });
  });

  app.post("/api/import/raceroster", async (req, res) => {
    try {
      const { url, eventId, subEventId, raceName, raceDistance } = req.body;
      
      // Support both URL parsing and direct event IDs
      let finalEventId = eventId;
      let finalSubEventId = subEventId;
      
      if (url && !eventId) {
        const raceRosterProvider = new RaceRosterProvider();
        const parsed = raceRosterProvider.parseRaceRosterUrl(url);
        if (!parsed) {
          return res.status(400).json({ error: "Invalid RaceRoster URL format" });
        }
        
        // Handle HTML parsing case
        if (parsed.eventId === 'HTML_PARSE') {
          console.log(`Parsing HTML page to extract API IDs: ${url}`);
          const htmlParsed = await raceRosterProvider.parseHtmlForApiIds(url);
          if (!htmlParsed) {
            return res.status(400).json({ error: "Could not extract event IDs from RaceRoster HTML page" });
          }
          finalEventId = htmlParsed.eventId;
          finalSubEventId = htmlParsed.subEventId;
        } else {
          finalEventId = parsed.eventId;
          finalSubEventId = parsed.subEventId;
        }
      }
      
      if (!finalEventId || !finalSubEventId) {
        return res.status(400).json({ error: "Event ID and Sub-Event ID are required" });
      }

      console.log(`Starting RaceRoster import for event ${finalEventId}, sub-event ${finalSubEventId}`);

      const raceRosterProvider = new RaceRosterProvider();
      const data = await raceRosterProvider.getResults(finalEventId, finalSubEventId);
      
      console.log(`Found ${data.results.length} results from RaceRoster`);

      if (data.results.length === 0) {
        return res.status(400).json({ error: "No results found for this RaceRoster event" });
      }

      // Extract race information
      const raceInfo = data.event_info || {};
      const defaultRaceName = raceName || raceInfo.name || `RaceRoster Event ${finalEventId}`;
      const raceDate = raceInfo.date || new Date().toISOString().split('T')[0];
      
      // Use manual distance if provided, otherwise attempt auto-detection
      let normalizedDistance = 'other';
      let distanceMiles = '0';
      
      if (raceDistance) {
        // Manual distance selection takes priority
        normalizedDistance = raceDistance;
        switch (raceDistance) {
          case 'marathon':
            distanceMiles = '26.2';
            break;
          case 'half-marathon':
            distanceMiles = '13.1';
            break;
          case '15k':
            distanceMiles = '9.3';
            break;
          case '10k':
            distanceMiles = '6.2';
            break;
          case '10-mile':
            distanceMiles = '10.0';
            break;
          case '5k':
            distanceMiles = '3.1';
            break;
          default:
            normalizedDistance = 'other';
            distanceMiles = '0';
        }
        console.log(`[RaceRoster] Using manual distance selection: ${normalizedDistance} (${distanceMiles} miles)`);
      } else {
        // Auto-detection logic as fallback
        let distance = raceInfo.distance || 'unknown';
        const distanceUnit = raceInfo.distanceUnit || 'miles';
        let distanceInMiles = 0;
        
        if (distance && distance !== 'unknown') {
          const distanceNum = parseFloat(distance);
          if (!isNaN(distanceNum)) {
            // Convert to miles if needed
            if (distanceUnit.toLowerCase().includes('km') || distanceUnit.toLowerCase().includes('kilometer')) {
              distanceInMiles = distanceNum * 0.621371; // km to miles
            } else {
              distanceInMiles = distanceNum; // assume miles
            }
          }
        }
        
        // Normalize distance based on actual distance in miles
        if (distanceInMiles > 0) {
          if (distanceInMiles >= 26 && distanceInMiles <= 26.5) {
            normalizedDistance = 'marathon';
            distanceMiles = '26.2';
          } else if (distanceInMiles >= 13 && distanceInMiles <= 13.5) {
            normalizedDistance = 'half-marathon';
            distanceMiles = '13.1';
          } else if (distanceInMiles >= 9.5 && distanceInMiles <= 10.5) {
            normalizedDistance = '10-mile';
            distanceMiles = '10.0';
          } else if (distanceInMiles >= 6 && distanceInMiles <= 6.5) {
            normalizedDistance = '10k';
            distanceMiles = '6.2';
          } else if (distanceInMiles >= 3 && distanceInMiles <= 3.5) {
            normalizedDistance = '5k';
            distanceMiles = '3.1';
          } else if (distanceInMiles >= 9 && distanceInMiles <= 10) {
            // 15k = 9.32 miles
            normalizedDistance = '15k';
            distanceMiles = distanceInMiles.toFixed(1);
          } else {
            normalizedDistance = 'other';
            distanceMiles = distanceInMiles.toFixed(1);
          }
        }
        
        console.log(`[RaceRoster] Auto-detected distance: ${distance} ${distanceUnit} = ${distanceInMiles} miles (${normalizedDistance})`);
        
        // Fallback to text-based detection if no numeric distance
        if (normalizedDistance === 'other' && distance && distance !== 'unknown') {
          const distanceText = distance.toLowerCase();
          if (distanceText.includes('marathon') && !distanceText.includes('half')) {
            normalizedDistance = 'marathon';
            distanceMiles = '26.2';
          } else if (distanceText.includes('half') || distanceText.includes('21k')) {
            normalizedDistance = 'half-marathon';
            distanceMiles = '13.1';
          } else if (distanceText.includes('10k')) {
            normalizedDistance = '10k';
            distanceMiles = '6.2';
          } else if (distanceText.includes('5k')) {
            normalizedDistance = '5k';
            distanceMiles = '3.1';
          } else if (distanceText.includes('15k')) {
            normalizedDistance = '15k';
            distanceMiles = '9.3';
          } else if (distanceText.includes('10') && distanceText.includes('mile')) {
            normalizedDistance = '10-mile';
            distanceMiles = '10.0';
          }
        }
      }

      // Create race record
      const race = await storage.createRace({
        name: defaultRaceName,
        date: raceDate,
        distance: normalizedDistance,
        distanceMiles: distanceMiles,
        city: raceInfo.city || "TBD",
        state: raceInfo.state || "TBD",
        startTime: raceInfo.start_time || "08:00:00",
        totalFinishers: data.results.length,
        averageTime: "00:00:00"
      });

      console.log(`Created race record with ID ${race.id}`);

      // Import results with runner matching
      const importResults = {
        totalResults: data.results.length,
        imported: 0,
        matched: 0,
        newRunners: 0,
        needsReview: 0,
        errors: [] as string[]
      };

      for (const result of data.results) {
        try {
          // Extract runner information with RaceRoster field mapping
          const runnerName = result.name || `${result.first_name || ''} ${result.last_name || ''}`.trim();
          const finishTime = result.gunTime || result.finish_time || result.time || '';
          
          if (!runnerName || !finishTime) {
            importResults.errors.push(`Skipping result with missing name or time: name="${runnerName}", time="${finishTime}"`);
            continue;
          }

          // Parse location from RaceRoster format
          const city = result.fromCity || result.city || '';
          const state = result.fromProvState || result.state || '';

          const rawRunnerData: RawRunnerData = {
            name: runnerName,
            age: result.age || 0,
            gender: result.gender || 'U',
            city: city,
            state: state,
            finishTime: finishTime
          };

          const { runner, matchScore, needsReview } = await runnerMatcher.matchRunner(rawRunnerData, race.id.toString(), storage);
          
          await storage.createResult({
            runnerId: runner.id,
            raceId: race.id,
            finishTime: finishTime,
            overallPlace: result.overallPlace || result.overall_place || result.place || 0,
            genderPlace: result.divisionPlace || result.gender_place || null,
            ageGroupPlace: result.age_group_place || null,
            sourceProvider: "raceroster",
            rawRunnerName: rawRunnerData.name,
            rawLocation: `${city}, ${state}`.trim().replace(/,$/, ''),
            rawAge: result.age || null,
            matchingScore: matchScore,
            needsReview: needsReview
          });

          importResults.imported++;
          if (matchScore >= 95) {
            importResults.matched++;
          } else if (matchScore === 0) {
            importResults.newRunners++;
          } else if (needsReview) {
            importResults.needsReview++;
          }

        } catch (error) {
          console.error("Error processing RaceRoster result:", error);
          importResults.errors.push(`Failed to process result for ${result.name || 'unknown'}`);
        }
      }

      console.log(`RaceRoster import complete: ${importResults.imported} results imported`);

      res.json({
        success: true,
        race: race,
        importResults
      });

    } catch (error) {
      console.error("RaceRoster import error:", error);
      res.status(500).json({ error: "Failed to import from RaceRoster: " + (error as Error).message });
    }
  });

  // Runner Review endpoints
  app.get("/api/runner-reviews", async (req, res) => {
    try {
      const pendingReviews = await storage.getPendingRunnerReviews();
      res.json(pendingReviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending runner reviews" });
    }
  });

  app.get("/api/runner-matches", async (req, res) => {
    try {
      const { status } = req.query;
      const matches = await storage.getRunnerMatchesByStatus(status as string || 'pending');
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch runner matches" });
    }
  });

  app.patch("/api/runner-matches/:id/approve", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const { reviewedBy } = req.body;
      
      const success = await storage.approveRunnerMatch(matchId, reviewedBy || 'admin');
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Runner match not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to approve runner match" });
    }
  });

  app.patch("/api/runner-matches/:id/reject", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const { reviewedBy } = req.body;
      
      const success = await storage.rejectRunnerMatch(matchId, reviewedBy || 'admin');
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Runner match not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to reject runner match" });
    }
  });

  // Race Series routes
  app.get("/api/race-series", async (req, res) => {
    try {
      const series = await storage.getAllRaceSeries();
      res.json(series);
    } catch (error) {
      console.error("Error fetching race series:", error);
      res.status(500).json({ error: "Failed to fetch race series", details: error.message });
    }
  });

  app.get("/api/race-series/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const series = await storage.getRaceSeries(id);
      if (!series) {
        return res.status(404).json({ error: "Race series not found" });
      }
      res.json(series);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch race series" });
    }
  });

  app.post("/api/race-series", async (req, res) => {
    try {
      const seriesData = insertRaceSeriesSchema.parse(req.body);
      const series = await storage.createRaceSeries({
        ...seriesData,
        createdAt: new Date().toISOString(),
        createdBy: "admin" // TODO: Add proper user auth
      } as any);
      res.json(series);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid series data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create race series" });
    }
  });

  app.patch("/api/race-series/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const series = await storage.updateRaceSeries(id, updates);
      if (!series) {
        return res.status(404).json({ error: "Race series not found" });
      }
      res.json(series);
    } catch (error) {
      res.status(500).json({ error: "Failed to update race series" });
    }
  });

  app.delete("/api/race-series/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteRaceSeries(id);
      if (!deleted) {
        return res.status(404).json({ error: "Race series not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete race series" });
    }
  });

  app.post("/api/race-series/:seriesId/races/:raceId", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.seriesId);
      const raceId = parseInt(req.params.raceId);
      const { seriesRaceNumber, pointsMultiplier } = req.body;
      
      const seriesRace = await storage.addRaceToSeries(seriesId, raceId, {
        seriesRaceNumber,
        pointsMultiplier
      });
      res.json(seriesRace);
    } catch (error) {
      res.status(500).json({ error: "Failed to add race to series" });
    }
  });

  app.delete("/api/race-series/:seriesId/races/:raceId", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.seriesId);
      const raceId = parseInt(req.params.raceId);
      
      const removed = await storage.removeRaceFromSeries(seriesId, raceId);
      if (!removed) {
        return res.status(404).json({ error: "Race not found in series" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove race from series" });
    }
  });

  app.get("/api/race-series/:id/leaderboard", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const leaderboard = await storage.getSeriesLeaderboard(id);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch series leaderboard" });
    }
  });

  app.get("/api/runners/:id/series-history", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const history = await storage.getRunnerSeriesHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch runner series history" });
    }
  });

  // RunSignup Race Events endpoint
  app.get("/api/runsignup/race/:raceId/events", async (req, res) => {
    try {
      const raceId = req.params.raceId;
      
      if (!process.env.RUNSIGNUP_API_KEY || !process.env.RUNSIGNUP_API_SECRET) {
        return res.status(400).json({ 
          error: "RunSignup API credentials not configured" 
        });
      }

      const provider = new (await import('./providers/runsignup')).RunSignupProvider(
        process.env.RUNSIGNUP_API_KEY,
        process.env.RUNSIGNUP_API_SECRET
      );

      const events = await provider.getRaceEvents(raceId);
      res.json(events);
    } catch (error) {
      console.error('Error fetching race events:', error);
      res.status(500).json({ 
        error: "Failed to fetch race events",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Private Series Participants Management
  app.get("/api/race-series/:id/participants", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const participants = await storage.getPrivateSeriesParticipants(seriesId);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch series participants" });
    }
  });

  app.post("/api/race-series/:seriesId/participants/:runnerId", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.seriesId);
      const runnerId = parseInt(req.params.runnerId);
      const { notes } = req.body;
      
      // Check if runner is already in the series
      const isAlreadyParticipant = await storage.isRunnerInPrivateSeries(seriesId, runnerId);
      if (isAlreadyParticipant) {
        return res.status(400).json({ error: "Runner is already a participant in this series" });
      }
      
      const participant = await storage.addRunnerToPrivateSeries(seriesId, runnerId, "admin", notes);
      res.json(participant);
    } catch (error) {
      res.status(500).json({ error: "Failed to add runner to private series" });
    }
  });

  app.delete("/api/race-series/:seriesId/participants/:runnerId", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.seriesId);
      const runnerId = parseInt(req.params.runnerId);
      
      const removed = await storage.removeRunnerFromPrivateSeries(seriesId, runnerId);
      if (!removed) {
        return res.status(404).json({ error: "Runner not found in private series" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove runner from private series" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
