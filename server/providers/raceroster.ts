/**
 * RaceRoster API Integration
 * Handles fetching race data and results from RaceRoster
 */

export interface RaceRosterEvent {
  id: string;
  name: string;
  start_date: string;
  city: string;
  state_province: string;
  country: string;
  race_distances: Array<{
    distance_name: string;
    distance_value: number;
    distance_unit: string;
  }>;
}

export interface RaceRosterResult {
  participant_id: string;
  bib_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  city: string;
  state_province: string;
  finish_time: string;
  overall_rank: number;
  gender_rank: number;
  age_group_rank: number;
  age_group: string;
  distance_name: string;
}

export class RaceRosterProvider {
  private apiKey: string;
  private baseUrl = 'https://api.raceroster.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for events by location and date
   */
  async searchEvents(params: {
    city?: string;
    state?: string;
    startDate?: string;
    endDate?: string;
    country?: string;
  }) {
    const searchParams = new URLSearchParams({
      api_key: this.apiKey,
      ...params
    });

    const response = await fetch(`${this.baseUrl}/events?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`RaceRoster API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformEventData(data.events || []);
  }

  /**
   * Get event details by ID
   */
  async getEvent(eventId: string) {
    const response = await fetch(`${this.baseUrl}/events/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`RaceRoster API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformEventData([data.event])[0];
  }

  /**
   * Get results for a specific event
   */
  async getResults(eventId: string, distanceName?: string) {
    const params = new URLSearchParams({
      api_key: this.apiKey
    });

    if (distanceName) {
      params.append('distance_name', distanceName);
    }

    const response = await fetch(`${this.baseUrl}/events/${eventId}/results?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`RaceRoster API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformResultsData(data.results || []);
  }

  /**
   * Transform RaceRoster event data to our internal format
   */
  private transformEventData(events: RaceRosterEvent[]) {
    return events.map(event => {
      const mainDistance = event.race_distances?.[0];
      
      return {
        name: event.name,
        date: event.start_date,
        distance: this.normalizeDistance(mainDistance?.distance_name),
        distanceMiles: this.convertToMiles(mainDistance?.distance_value, mainDistance?.distance_unit),
        city: event.city,
        state: event.state_province,
        startTime: '7:00 AM', // RaceRoster doesn't always provide start time
        weather: null,
        courseType: null,
        elevation: null,
        totalFinishers: 0,
        averageTime: '0:00:00',
        organizerWebsite: `https://raceroster.com/events/${event.id}`,
        resultsUrl: `https://raceroster.com/events/${event.id}/results`,
        sourceProvider: 'raceroster',
        sourceRaceId: event.id
      };
    });
  }

  /**
   * Transform RaceRoster results data to our internal format
   */
  private transformResultsData(results: RaceRosterResult[]) {
    return results.map(result => ({
      name: `${result.first_name} ${result.last_name}`.trim(),
      age: result.age,
      gender: this.normalizeGender(result.gender),
      city: result.city,
      state: result.state_province,
      finish_time: this.normalizeTime(result.finish_time),
      overall_place: result.overall_rank,
      gender_place: result.gender_rank,
      age_group_place: result.age_group_rank,
      bib_number: result.bib_number,
      age_group: result.age_group,
      sourceProvider: 'raceroster',
      sourceResultId: result.participant_id
    }));
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

  private convertToMiles(distance?: number, unit?: string): string {
    if (!distance || !unit) return '0.00';
    
    let miles = distance;
    
    switch (unit.toLowerCase()) {
      case 'km':
      case 'kilometers':
        miles = distance * 0.621371;
        break;
      case 'm':
      case 'meters':
        miles = distance * 0.000621371;
        break;
      case 'mi':
      case 'miles':
        // Already in miles
        break;
    }
    
    return miles.toFixed(2);
  }

  private normalizeGender(gender?: string): string {
    if (!gender) return 'M';
    
    const g = gender.toLowerCase();
    if (g.startsWith('f') || g === 'female') return 'F';
    if (g.startsWith('m') || g === 'male') return 'M';
    return 'NB';
  }

  private normalizeTime(time?: string): string {
    if (!time) return '0:00:00';
    
    // RaceRoster might return times in different formats
    // Convert to HH:MM:SS format
    const parts = time.split(':');
    
    if (parts.length === 2) {
      // MM:SS format, assume 0 hours
      return `0:${time}`;
    }
    
    if (parts.length === 3) {
      // Already HH:MM:SS
      return time;
    }
    
    return time;
  }
}