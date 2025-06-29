import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRunnerSchema, insertRaceSchema, insertResultSchema, insertRaceSeriesSchema } from "@shared/schema";
import { runnerMatcher, type RawRunnerData } from "./runner-matching";
import { RunSignupProvider } from "./providers/runsignup";
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
            
            // If we got fewer than expected results, try pagination
            if (allResults.length === 50 || allResults.length === 100) {
              console.log(`Trying pagination to get more results...`);
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
                  
                  // Check if we have more results to fetch
                  hasMoreResults = pageResults.length === pageSize;
                  page++;
                  
                  console.log(`Page ${page - 1}: Found ${pageResults.length} results for ${bestEvent.distance} (event ${bestEvent.eventId})`);
                } else {
                  hasMoreResults = false;
                }
                
                // Safety check to prevent infinite loops
                if (page > 50) {
                  console.log(`Stopping pagination at page ${page} for safety`);
                  break;
                }
              }
              
              console.log(`Total found via pagination: ${allResults.length} results for ${bestEvent.distance} (event ${bestEvent.eventId}) across ${page - 1} pages`);
            }
            
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

      for (const result of resultsData) {
        try {
          const rawRunnerData: RawRunnerData = {
            name: `${result.first_name || ''} ${result.last_name || ''}`.trim(),
            age: result.age,
            gender: result.gender,
            city: result.city,
            state: result.state,
            finishTime: result.finish_time || result.chip_time || result.gun_time || "0:00:00"
          };

          const { runner, matchScore, needsReview } = await runnerMatcher.matchRunner(rawRunnerData, race.id.toString(), storage);
          
          // Create result entry with proper schema fields
          await storage.createResult({
            runnerId: runner.id,
            raceId: race.id,
            finishTime: rawRunnerData.finishTime,
            overallPlace: result.overall_place || 0,
            genderPlace: result.gender_place || null,
            ageGroupPlace: result.age_group_place || null,
            sourceProvider: "runsignup",
            rawRunnerName: rawRunnerData.name,
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
          console.error("Error processing result:", error);
          importResults.errors.push(`Failed to process result for ${result.first_name} ${result.last_name}`);
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

  // Official RunSignup API endpoint
  app.post("/api/import/runsignup-api", async (req, res) => {
    try {
      const { raceId, eventId, raceName } = req.body;
      
      if (!raceId) {
        return res.status(400).json({ error: "Race ID is required" });
      }

      // Check if we have API credentials
      const apiKey = process.env.RUNSIGNUP_API_KEY;
      const apiSecret = process.env.RUNSIGNUP_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        return res.status(400).json({ 
          error: "RunSignup API credentials not configured. Please contact admin to set up API access." 
        });
      }

      console.log(`Starting RunSignup API import for race ${raceId}${eventId ? `, event ${eventId}` : ''}`);

      const runSignupProvider = new RunSignupProvider(apiKey, apiSecret);
      
      // Get race details first
      const raceData = await runSignupProvider.getRace(raceId);
      console.log(`Found race: ${raceData.name}`);
      
      // Get results for the specific event or all events
      const resultsData = await runSignupProvider.getResults(raceId, eventId);
      console.log(`Found ${resultsData.length} results`);

      if (resultsData.length === 0) {
        return res.status(400).json({ 
          error: `No results found for race ${raceId}${eventId ? ` event ${eventId}` : ''}. The race may not have results published yet.`
        });
      }

      // Create race record
      const race = await storage.createRace({
        name: raceName || raceData.name,
        date: raceData.date,
        distance: raceData.distance,
        distanceMiles: raceData.distanceMiles,
        city: raceData.city,
        state: raceData.state,
        startTime: raceData.startTime,
        totalFinishers: resultsData.length,
        averageTime: "00:00:00" // Will be calculated
      });

      console.log(`Created race record with ID ${race.id}`);

      // Import results with runner matching
      const importResults = {
        totalResults: resultsData.length,
        imported: 0,
        matched: 0,
        newRunners: 0,
        needsReview: 0,
        errors: [] as string[]
      };

      for (const result of resultsData) {
        try {
          const rawRunnerData: RawRunnerData = {
            name: result.name,
            age: result.age,
            gender: result.gender,
            city: result.city,
            state: result.state,
            finishTime: result.finish_time || "0:00:00"
          };

          const { runner, matchScore, needsReview } = await runnerMatcher.matchRunner(rawRunnerData, race.id.toString(), storage);
          
          await storage.createResult({
            runnerId: runner.id,
            raceId: race.id,
            finishTime: result.finish_time || "0:00:00",
            overallPlace: result.overall_place || 0,
            genderPlace: result.gender_place || null,
            ageGroupPlace: result.age_group_place || null,
            sourceProvider: "runsignup-api",
            rawRunnerName: rawRunnerData.name,
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
          console.error("Error processing result:", error);
          importResults.errors.push(`Failed to process result for ${result.name}`);
        }
      }

      console.log(`Import complete: ${importResults.imported} results imported`);

      res.json({
        success: true,
        race: race,
        importResults
      });

    } catch (error) {
      console.error("RunSignup API import error:", error);
      res.status(500).json({ error: "Failed to import from RunSignup API: " + (error as Error).message });
    }
  });

  app.post("/api/import/raceroster", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "RaceRoster URL is required" });
      }

      // For now, return a helpful error since we need API keys
      res.status(400).json({ 
        error: "RaceRoster integration requires API credentials. Please use CSV import or contact admin to set up RaceRoster API access." 
      });

    } catch (error) {
      res.status(500).json({ error: "Failed to import from RaceRoster" });
    }
  });

  // Race Series routes
  app.get("/api/race-series", async (req, res) => {
    try {
      const series = await storage.getAllRaceSeries();
      res.json(series);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch race series" });
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

  const httpServer = createServer(app);
  return httpServer;
}
