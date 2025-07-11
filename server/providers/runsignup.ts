/**
 * RunSignup API Integration
 * Handles fetching race data and results from RunSignup
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

export interface RunSignupEvent {
  event_id: number;
  name: string;
  distance: string;
  start_time: string;
  isPast: boolean;
}

export interface RunSignupResult {
  result_id?: number;
  place?: number;
  bib?: number;
  first_name?: string;
  last_name?: string;
  gender?: string;
  age?: number;
  city?: string;
  state?: string;
  country_code?: string;
  email?: string;
  chip_time?: string;
  clock_time?: string;
  pace?: string;
  gender_place?: number;
  age_group_place?: number;
  // Split times and other fields may be present
  [key: string]: any;
}

export class RunSignupProvider {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://runsignup.com/Rest';

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
   * Get results for a specific race and event
   */
  async getResults(raceId: string, eventId?: string): Promise<any[]> {
    // If no eventId provided, get all events and find the one with most results
    if (!eventId) {
      throw new Error('Event ID is required. Use getRaceEvents() to get available events first.');
    }

    const params: Record<string, string> = {
      event_id: eventId
    };

    const url = this.createAuthenticatedUrl(`/race/${raceId}/results/get-results`, params);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`RunSignup API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`RunSignup API response for event ${eventId}:`, JSON.stringify(data).substring(0, 500));
    
    // Handle different response structures
    let results = [];
    if (data.individual_results_sets && data.individual_results_sets.length > 0) {
      results = data.individual_results_sets[0].results || [];
    } else if (data.results) {
      results = data.results;
    }
    
    console.log(`Found ${results.length} raw results, first result:`, results[0] ? JSON.stringify(results[0]).substring(0, 300) : 'none');
    
    return this.transformResultsData(results);
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
        // RunSignup API returns results with fields directly in the result object
        const firstName = result.first_name || '';
        const lastName = result.last_name || '';
        
        return {
          name: `${firstName} ${lastName}`.trim(),
          age: result.age || undefined,
          gender: this.normalizeGender(result.gender),
          city: result.city || undefined,
          state: result.state || undefined,
          email: result.email || undefined,
          finish_time: result.chip_time || result.clock_time || '0:00:00',
          overall_place: result.place || 0,
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
    if (d.includes('10k') || d.includes('10.0')) return '10k';
    if (d.includes('5k') || d.includes('5.0')) return '5k';
    
    // Handle numeric distances
    if (d.includes('26.2') || d.includes('42.2') || d.includes('42k')) return 'marathon';
    if (d.includes('13.1') || d.includes('21.1') || d.includes('21k')) return 'half-marathon';
    if (d.includes('6.2') || d.includes('10.')) return '10k';
    if (d.includes('3.1') || d.includes('5.')) return '5k';
    
    return distance;
  }

  private getDistanceMiles(distance?: string): string {
    const d = this.normalizeDistance(distance);
    
    switch (d) {
      case 'marathon': return '26.20';
      case 'half-marathon': return '13.10';
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