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
    
    console.log(`[RaceRoster] Fetching: ${apiUrl}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`RaceRoster API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[RaceRoster] Response structure:`, Object.keys(data));
    console.log(`[RaceRoster] Sample data:`, JSON.stringify(data).substring(0, 500));
    
    // Check different possible response structures
    let results = [];
    if (data.results && Array.isArray(data.results)) {
      results = data.results;
    } else if (data.data && Array.isArray(data.data)) {
      results = data.data;
    } else if (Array.isArray(data)) {
      results = data;
    } else if (data.participants && Array.isArray(data.participants)) {
      results = data.participants;
    }
    
    if (results.length === 0) {
      console.log(`[RaceRoster] No results found. Full response:`, JSON.stringify(data, null, 2));
      throw new Error('No results found in RaceRoster response');
    }
    
    console.log(`[RaceRoster] Found ${results.length} results`);
    return {
      results,
      event_info: data.event_info || data.event || data.race_info
    };
  }

  async parseHtmlForApiIds(htmlUrl: string): Promise<{ eventId: string; subEventId: string } | null> {
    try {
      console.log(`Parsing RaceRoster HTML page: ${htmlUrl}`);
      const response = await fetch(htmlUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch HTML page: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Look for API calls in the HTML that contain the event and sub-event IDs
      // RaceRoster typically embeds these in JavaScript API calls
      const apiPatterns = [
        /result-events\/(\d+)\/sub-events\/(\d+)\/results/g,
        /eventId['":\s]*(\d+)['"]*.*?subEventId['":\s]*(\d+)/g,
        /event_id['":\s]*(\d+)['"]*.*?sub_event_id['":\s]*(\d+)/g,
        /"eventId"\s*:\s*(\d+).*?"subEventId"\s*:\s*(\d+)/g,
        /"event_id"\s*:\s*(\d+).*?"sub_event_id"\s*:\s*(\d+)/g,
        /window\.__INITIAL_STATE__.*?eventId.*?(\d+).*?subEventId.*?(\d+)/g
      ];
      
      for (const pattern of apiPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          console.log(`Found API IDs in HTML: eventId=${match[1]}, subEventId=${match[2]}`);
          return { eventId: match[1], subEventId: match[2] };
        }
      }
      
      console.log('Could not find API IDs in HTML page');
      return null;
    } catch (error) {
      console.error('Error parsing RaceRoster HTML:', error);
      return null;
    }
  }

  parseRaceRosterUrl(url: string): { eventId: string; subEventId: string } | null {
    // Example URLs:
    // HTML: https://results.raceroster.com/v2/en-US/results/kcr4axw63nrc9dhn/results
    // API: https://results.raceroster.com/v2/api/result-events/84556/sub-events/222034/results
    // Legacy: https://results.raceroster.com/en-US/series/16075/results/412345
    // Legacy: https://results.raceroster.com/results/412345
    
    const patterns = [
      // New v2 API format
      /results\.raceroster\.com\/v2\/api\/result-events\/(\d+)\/sub-events\/(\d+)\/results/,
      // New v2 HTML format - need to extract from page
      /results\.raceroster\.com\/v2\/.*\/results\/([a-zA-Z0-9]+)\/results/,
      // Legacy formats
      /results\.raceroster\.com\/.*\/results\/(\d+)/,
      /results\.raceroster\.com\/.*\/series\/(\d+)\/results\/(\d+)/
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = url.match(pattern);
      if (match) {
        if (i === 0) {
          // v2 API format: extract event and sub-event IDs directly
          return { eventId: match[1], subEventId: match[2] };
        } else if (i === 1) {
          // v2 HTML format: mark for HTML parsing
          return { eventId: 'HTML_PARSE', subEventId: match[1] };
        } else if (match.length === 2) {
          // Legacy single result ID - use as both event and sub-event
          return { eventId: match[1], subEventId: match[1] };
        } else if (match.length === 3) {
          // Legacy series and result ID
          return { eventId: match[1], subEventId: match[2] };
        }
      }
    }
    
    return null;
  }
}