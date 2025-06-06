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

export interface RunSignupResult {
  participant_id: number;
  user?: {
    first_name: string;
    last_name: string;
    email?: string;
    gender: string;
    dob?: string;
  };
  registration?: {
    first_name: string;
    last_name: string;
    gender: string;
    age: number;
    city?: string;
    state?: string;
  };
  results?: {
    chip_time?: string;
    gun_time?: string;
    overall_place?: number;
    gender_place?: number;
    division_place?: number;
  };
}

export class RunSignupProvider {
  private apiKey: string;
  private baseUrl = 'https://runsignup.com/Rest';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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
    const searchParams = new URLSearchParams({
      format: 'json',
      api_key: this.apiKey,
      api_secret: process.env.RUNSIGNUP_SECRET || '',
      ...params
    });

    const response = await fetch(`${this.baseUrl}/races?${searchParams}`);
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
    const params = new URLSearchParams({
      format: 'json',
      api_key: this.apiKey,
      api_secret: process.env.RUNSIGNUP_SECRET || ''
    });

    const response = await fetch(`${this.baseUrl}/race/${raceId}?${params}`);
    if (!response.ok) {
      throw new Error(`RunSignup API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformRaceData([data])[0];
  }

  /**
   * Get results for a specific race and event
   */
  async getResults(raceId: string, eventId?: string) {
    const params = new URLSearchParams({
      format: 'json',
      api_key: this.apiKey,
      api_secret: process.env.RUNSIGNUP_SECRET || '',
      race_id: raceId
    });

    if (eventId) {
      params.append('event_id', eventId);
    }

    const response = await fetch(`${this.baseUrl}/race/${raceId}/results?${params}`);
    if (!response.ok) {
      throw new Error(`RunSignup API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformResultsData(data.results || []);
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
    return results.map(result => {
      // RunSignup can have user data or registration data
      const userData = result.user;
      const regData = result.registration;
      
      const firstName = userData?.first_name || regData?.first_name || '';
      const lastName = userData?.last_name || regData?.last_name || '';
      
      return {
        name: `${firstName} ${lastName}`.trim(),
        age: regData?.age,
        gender: this.normalizeGender(userData?.gender || regData?.gender),
        city: regData?.city,
        state: regData?.state,
        email: userData?.email,
        finish_time: result.results?.chip_time || result.results?.gun_time,
        overall_place: result.results?.overall_place,
        gender_place: result.results?.gender_place,
        age_group_place: result.results?.division_place,
        sourceProvider: 'runsignup',
        sourceResultId: result.participant_id.toString()
      };
    });
  }

  private normalizeDistance(distance?: string): string {
    if (!distance) return 'unknown';
    
    const d = distance.toLowerCase();
    if (d.includes('marathon') && !d.includes('half')) return 'marathon';
    if (d.includes('half') || d.includes('13.1')) return 'half-marathon';
    if (d.includes('10k') || d.includes('10.0')) return '10k';
    if (d.includes('5k') || d.includes('5.0')) return '5k';
    
    return distance;
  }

  private getDistanceMiles(distance?: string): string {
    const d = this.normalizeDistance(distance);
    
    switch (d) {
      case 'marathon': return '26.20';
      case 'half-marathon': return '13.10';
      case '10k': return '6.21';
      case '5k': return '3.11';
      default: return '0.00';
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