export interface RaceRosterResult {
  name: string;
  first_name?: string;
  last_name?: string;
  age: number;
  gender: string;
  city: string;
  state: string;
  finish_time: string;
  time?: string;
  overall_place: number;
  place?: number;
  gender_place?: number;
  age_group_place?: number;
}

export interface RaceRosterEventInfo {
  name: string;
  date: string;
  distance: string;
  city?: string;
  state?: string;
  start_time?: string;
}

export interface RaceRosterApiResponse {
  results: RaceRosterResult[];
  event_info?: RaceRosterEventInfo;
}

export class RaceRosterProvider {
  async getResults(eventId: string, subEventId: string): Promise<RaceRosterApiResponse> {
    const apiUrl = `https://results.raceroster.com/v2/api/result-events/${eventId}/sub-events/${subEventId}/results`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`RaceRoster API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('No results found in RaceRoster response');
    }
    
    return data;
  }

  parseRaceRosterUrl(url: string): { eventId: string; subEventId: string } | null {
    // Example URL: https://results.raceroster.com/en-US/series/16075/results/412345
    // Or: https://results.raceroster.com/results/412345
    
    const patterns = [
      /results\.raceroster\.com\/.*\/results\/(\d+)/,
      /results\.raceroster\.com\/.*\/series\/(\d+)\/results\/(\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        if (match.length === 2) {
          // Single result ID - use as both event and sub-event
          return { eventId: match[1], subEventId: match[1] };
        } else if (match.length === 3) {
          // Series and result ID
          return { eventId: match[1], subEventId: match[2] };
        }
      }
    }
    
    return null;
  }
}