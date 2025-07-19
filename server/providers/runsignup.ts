/**
 * RunSignup API Integration
 * 
 * This provider handles communication with the RunSignup REST API to fetch
 * race information and results data. RunSignup is one of the major race
 * registration and timing platforms used by race organizers.
 * 
 * API Documentation: https://runsignup.com/API
 * Rate Limits: Not explicitly documented, but implement reasonable delays
 * Authentication: Requires API key and secret from RunSignup account
 * 
 * Known Issues:
 * - Pagination may be limited by API response size (investigating 50-result limit)
 * - Some events may have JavaScript-rendered results that require special handling
 * - Historical data availability varies by race organizer settings
 */

/**
 * Race data structure returned by RunSignup API
 */
export interface RunSignupRace {
  race: {
    race_id: number;
    name: string;
    next_date: string;
    address: {
      city: string;
      state: string;
    };
    events: Array<{
      event_id: number;
      name: string;
      distance: string;
      start_time: string;
    }>;
  };
}

/**
 * Individual event within a race (e.g., Marathon, Half Marathon, 5K)
 * RunSignup allows multiple events per race registration
 */
export interface RunSignupEvent {
  event_id: number;
  name: string;          // e.g., "Half Marathon", "10K"
  distance: string;      // Distance description
  start_time: string;    // Event start time
  isPast: boolean;       // Whether this event has already occurred
}

/**
 * Individual race result from RunSignup API
 * Field availability depends on race organizer configuration
 * Times may be in various formats (HH:MM:SS, MM:SS, etc.)
 */
export interface RunSignupResult {
  result_id?: number;
  place?: number;           // Overall placement
  bib?: number;            // Race bib number
  first_name?: string;
  last_name?: string;
  gender?: string;         // Usually 'M', 'F', or variations
  age?: number;           // Age at time of race
  city?: string;
  state?: string;
  country_code?: string;   // ISO country code
  email?: string;         // May be redacted for privacy
  chip_time?: string;     // Chip/net time (start line to finish)
  clock_time?: string;    // Gun/gross time (official start to finish)
  pace?: string;          // Calculated pace per mile
  gender_place?: number;  // Placement within gender
  age_group_place?: number; // Placement within age group
  // Additional fields like split times, team info, etc.
  [key: string]: any;
}

export class RunSignupProvider {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://runsignup.com/Rest';
  
  // Development logging flag
  private readonly isDevMode = process.env.NODE_ENV === 'development';

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  /**
   * Create authenticated request URL with API key and secret
   */
  private createAuthenticatedUrl(endpoint: string, params: Record<string, string | number> = {}): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('api_secret', this.apiSecret);
    url.searchParams.set('format', 'json');
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
    
    return url.toString();
  }

  /**
   * Search for races by location and date range
   */
  async searchRaces(params: {
    city?: string;
    state?: string;
    startDate?: string;
    endDate?: string;
    distance?: string;
  }) {
    const url = this.createAuthenticatedUrl('/races', params);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`RunSignup API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformRaceData(data.races || []);
  }

  /**
   * Get race details by ID
   */
  async getRace(raceId: string) {
    const url = this.createAuthenticatedUrl(`/race/${raceId}`, {
      future_events_only: 'F',
      most_recent_events_only: 'F',
      race_headings: 'F',
      race_links: 'F',
      include_waiver: 'F',
      include_multiple_waivers: 'F',
      include_participant_caps: 'F',
      include_age_based_pricing: 'F',
      include_giveaway_details: 'F',
      include_questions: 'F',
      include_addons: 'F',
      include_membership_settings: 'F',
      include_corral_settings: 'F',
      include_donation_settings: 'F',
      include_extra_date_info: 'F',
      supports_question_application_types: 'F'
    });
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`RunSignup API error: ${response.statusText}`);
    }

    const data = await response.json();
    const races = this.transformRaceData(data.race ? [data] : []);
    return races.length > 0 ? races[0] : null;
  }

  /**
   * Get available events for a race (past events only)
   */
  async getRaceEvents(raceId: string): Promise<RunSignupEvent[]> {
    const url = this.createAuthenticatedUrl(`/race/${raceId}`, {
      future_events_only: 'F',
      most_recent_events_only: 'F'
    });
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`RunSignup API error: ${response.statusText}`);
    }

    const data = await response.json();
    const now = new Date();
    
    if (!data.race?.events) {
      return [];
    }

    return data.race.events.map((event: any) => ({
      event_id: event.event_id,
      name: event.name,
      distance: event.distance || 'Unknown',
      start_time: event.start_time,
      isPast: new Date(event.start_time) < now
    })).filter((event: RunSignupEvent) => event.isPast);
  }

  /**
   * Get results for a specific race and event with pagination support
   * 
   * PAGINATION DEBUGGING NOTES:
   * - Current issue: API seems to limit total results to 50 despite pagination attempts
   * - Tested with races that should have 100+ participants but only get 50 results
   * - This may be a RunSignup API limitation or server-side configuration
   * - Page size set to 100 (max allowed by most APIs)
   * - Termination condition: when returned results < pageSize
   * 
   * Potential causes of 50-result limit:
   * 1. API rate limiting or response size limits
   * 2. Event-specific result visibility settings
   * 3. Archived/old data restrictions
   * 4. Account permission levels (free vs paid API access)
   * 
   * TODO: Contact RunSignup support to clarify pagination limits
   * 
   * @param raceId - RunSignup race ID
   * @param eventId - Specific event ID within the race
   * @returns Array of all race results across all pages
   */
  async getResults(raceId: string, eventId?: string): Promise<any[]> {
    if (!eventId) {
      throw new Error('Event ID is required. Use getRaceEvents() to get available events first.');
    }

    if (this.isDevMode) {
      console.log(`[RunSignup] Starting paginated fetch for race ${raceId}, event ${eventId}`);
    }
    
    let allResults: any[] = [];
    let page = 1;
    const pageSize = 100; // Maximum page size for RunSignup API
    let hasMoreResults = true;
    let consecutiveEmptyPages = 0; // Safety counter for infinite loop protection
    const maxEmptyPages = 3;
    
    while (hasMoreResults && consecutiveEmptyPages < maxEmptyPages) {
      const params: Record<string, string> = {
        event_id: eventId,
        page: page.toString(),
        results_per_page: pageSize.toString(),
        // Additional parameters that might affect result availability
        include_bib: 'T',
        include_team: 'T', 
        include_splits: 'F' // Splits can make responses very large
      };

      if (this.isDevMode) {
        console.log(`[RunSignup] Fetching page ${page} (expecting up to ${pageSize} results)`);
      }

      const url = this.createAuthenticatedUrl(`/race/${raceId}/results/get-results`, params);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`[RunSignup] Failed to fetch page ${page} for event ${eventId}:`, response.statusText);
        throw new Error(`RunSignup API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (this.isDevMode) {
        console.log(`[RunSignup] Page ${page} response structure:`, Object.keys(data));
      }
      
      // Handle different response structures that RunSignup may return
      // RunSignup API can return results in various formats depending on event type
      let pageResults = [];
      if (data.individual_results_sets && data.individual_results_sets.length > 0) {
        // Standard format: results nested in individual_results_sets array
        pageResults = data.individual_results_sets[0].results || [];
      } else if (data.results) {
        // Alternative format: results at top level
        pageResults = data.results;
      } else if (data.result_sets && data.result_sets.length > 0) {
        // Some events use result_sets instead of individual_results_sets
        pageResults = data.result_sets[0].results || [];
      }
      
      if (this.isDevMode) {
        console.log(`[RunSignup] Page ${page}: Found ${pageResults.length} results for event ${eventId}`);
        if (pageResults.length === 0) {
          console.log(`[RunSignup] Empty page detected. Response keys:`, Object.keys(data));
          consecutiveEmptyPages++;
        } else {
          consecutiveEmptyPages = 0; // Reset counter when we find results
          // Debug first result to understand structure
          if (page === 1 && pageResults.length > 0) {
            console.log(`[RunSignup] First result structure:`, Object.keys(pageResults[0]));
            console.log(`[RunSignup] First result sample:`, JSON.stringify(pageResults[0]).substring(0, 200));
          }
        }
      }
      
      allResults.push(...pageResults);
      console.log(`Page ${page}: Found ${pageResults.length} results for event ${eventId}`);
      
      // PAGINATION TERMINATION CONDITIONS
      // 1. Page size condition: If we got fewer results than requested page size
      if (pageResults.length < pageSize) {
        if (this.isDevMode) {
          console.log(`[RunSignup] Pagination complete: received ${pageResults.length} < ${pageSize} (page size)`);
        }
        hasMoreResults = false;
      }
      
      // 2. Empty page condition: Multiple consecutive empty pages suggests end of data
      if (pageResults.length === 0) {
        if (this.isDevMode) {
          console.log(`[RunSignup] Empty page ${page}, consecutive empty pages: ${consecutiveEmptyPages}`);
        }
        if (consecutiveEmptyPages >= maxEmptyPages) {
          if (this.isDevMode) {
            console.log(`[RunSignup] Stopping after ${consecutiveEmptyPages} consecutive empty pages`);
          }
          hasMoreResults = false;
        }
      }
      
      page++;
      
      // Safety check to prevent infinite loops (should never hit this in normal operation)
      if (page > 100) {
        console.log(`[RunSignup] Safety limit reached: stopping pagination at page ${page}`);
        break;
      }
    }
    
    const finalMessage = `Total found via pagination: ${allResults.length} results for event ${eventId} across ${page - 1} pages`;
    console.log(finalMessage);
    
    if (this.isDevMode) {
      console.log(`[RunSignup] ${finalMessage}`);
      console.log(`[RunSignup] Pagination summary: ${consecutiveEmptyPages} consecutive empty pages at end`);
    }
    
    return this.transformResultsData(allResults);
  }

  /**
   * Get race information including event details for importing results
   */
  async getRaceInfo(raceId: string, eventId: string): Promise<any> {
    // First get the race details
    const raceUrl = this.createAuthenticatedUrl(`/race/${raceId}`);
    const raceResponse = await fetch(raceUrl);
    
    if (!raceResponse.ok) {
      throw new Error(`RunSignup API error: ${raceResponse.statusText}`);
    }

    const raceData = await raceResponse.json();
    const race = raceData.race;
    
    // Find the specific event
    const event = race.events?.find((e: any) => e.event_id.toString() === eventId.toString());
    if (!event) {
      throw new Error(`Event ${eventId} not found in race ${raceId}`);
    }

    return {
      name: race.name,
      date: event.start_time,
      distance: this.normalizeDistance(event.distance),
      distanceMiles: this.getDistanceMiles(event.distance),
      city: race.address?.city || '',
      state: race.address?.state || '',
      startTime: event.start_time || '7:00 AM',
      weather: null,
      courseType: null,
      elevation: null,
      totalFinishers: 0,
      averageTime: '0:00:00',
      organizerWebsite: `https://runsignup.com/Race/${race.race_id}`,
      resultsUrl: `https://runsignup.com/Race/${race.race_id}/Results`,
      sourceProvider: 'runsignup',
      sourceRaceId: race.race_id.toString(),
      sourceEventId: eventId
    };
  }

  /**
   * Transform RunSignup race data to our internal format
   */
  private transformRaceData(races: RunSignupRace[]) {
    return races.map(raceData => {
      const race = raceData.race;
      const mainEvent = race.events?.[0];
      
      return {
        name: race.name,
        date: race.next_date,
        distance: this.normalizeDistance(mainEvent?.distance),
        distanceMiles: this.getDistanceMiles(mainEvent?.distance),
        city: race.address?.city || '',
        state: race.address?.state || '',
        startTime: mainEvent?.start_time || '7:00 AM',
        weather: null, // Not provided by RunSignup
        courseType: null,
        elevation: null,
        totalFinishers: 0, // Will be updated when results are imported
        averageTime: '0:00:00',
        organizerWebsite: `https://runsignup.com/Race/${race.race_id}`,
        resultsUrl: `https://runsignup.com/Race/${race.race_id}/Results`,
        sourceProvider: 'runsignup',
        sourceRaceId: race.race_id.toString()
      };
    });
  }

  /**
   * Transform RunSignup results data to our internal format
   */
  private transformResultsData(results: RunSignupResult[]) {
    return results.map((result, index) => {
      try {
        // Debug the actual field structure for the first few results
        if (this.isDevMode && index < 3) {
          console.log(`[RunSignup] Result ${index} available fields:`, Object.keys(result));
          console.log(`[RunSignup] Result ${index} sample data:`, JSON.stringify(result).substring(0, 300));
        }
        
        // Try different possible field names based on RunSignup API variations
        const firstName = result.first_name || result.firstName || result.user?.first_name || '';
        const lastName = result.last_name || result.lastName || result.user?.last_name || '';
        const fullName = result.name || result.user?.name || `${firstName} ${lastName}`.trim();
        
        // Handle different time field variations
        const finishTime = result.finish_time || result.chip_time || result.clock_time || 
                          result.time || result.result_time || '0:00:00';
        
        // Handle different place field variations
        const overallPlace = result.place || result.overall_place || result.position || 0;
        
        return {
          name: fullName || `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          age: result.age || result.user?.age || undefined,
          gender: this.normalizeGender(result.gender || result.user?.gender),
          city: result.city || result.user?.city || undefined,
          state: result.state || result.user?.state || undefined,
          email: result.email || result.user?.email || undefined,
          finish_time: finishTime,
          chip_time: result.chip_time || finishTime,
          gun_time: result.gun_time || result.clock_time || finishTime,
          overall_place: overallPlace,
          place: overallPlace,
          gender_place: result.gender_place || null,
          age_group_place: result.age_group_place || null,
          sourceProvider: 'runsignup',
          sourceResultId: result.result_id?.toString() || `unknown_${index}`
        };
      } catch (error) {
        console.error(`Error transforming result ${index}:`, error, 'Result:', JSON.stringify(result).substring(0, 200));
        throw error;
      }
    });
  }

  private normalizeDistance(distance?: string): string {
    if (!distance) return 'unknown';
    
    const d = distance.toLowerCase();
    if (d.includes('marathon') && !d.includes('half')) return 'marathon';
    if (d.includes('half') || d.includes('13.1')) return 'half-marathon';
    if (d.includes('10 mil') || d.includes('10-mil') || d.includes('10mile')) return '10-mile';
    if (d.includes('10k') || d.includes('10.0')) return '10k';
    if (d.includes('5k') || d.includes('5.0')) return '5k';
    
    // Handle numeric distances
    if (d.includes('26.2') || d.includes('42.2') || d.includes('42k')) return 'marathon';
    if (d.includes('13.1') || d.includes('21.1') || d.includes('21k')) return 'half-marathon';
    if (d.includes('10.0') && d.includes('mil')) return '10-mile';
    if (d.includes('6.2') || d.includes('10.')) return '10k';
    if (d.includes('3.1') || d.includes('5.')) return '5k';
    
    return distance;
  }

  private getDistanceMiles(distance?: string): string {
    const d = this.normalizeDistance(distance);
    
    switch (d) {
      case 'marathon': return '26.20';
      case 'half-marathon': return '13.10';
      case '10-mile': return '10.00';
      case '10k': return '6.21';
      case '5k': return '3.11';
      default: 
        // Try to extract numeric distance if possible
        if (distance) {
          const match = distance.match(/(\d+\.?\d*)/);
          if (match) {
            return parseFloat(match[1]).toFixed(2);
          }
        }
        return '0.00';
    }
  }

  private normalizeGender(gender?: string): string {
    if (!gender) return 'M';
    
    const g = gender.toLowerCase();
    if (g.startsWith('f')) return 'F';
    if (g.startsWith('m')) return 'M';
    return 'NB';
  }
}