import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, AlertTriangle, CheckCircle, XCircle, User, Clock, ExternalLink, FileText } from "lucide-react";

interface ImportResult {
  imported: number;
  matched: number;
  newRunners: number;
  needsReview: number;
  errors: string[];
}

// Example race data that shows common real-world scenarios
const EXAMPLE_RACE_DATA = {
  name: "Bay Area Marathon 2024",
  date: "2024-03-15",
  distance: "marathon",
  distanceMiles: "26.20",
  city: "San Francisco",
  state: "CA",
  startTime: "7:00 AM",
  weather: "58°F, Clear",
  courseType: "point-to-point",
  elevation: "+1,200 ft",
  totalFinishers: 1247,
  averageTime: "3:42:15",
  organizerWebsite: "https://bayareamarathon.com",
  resultsUrl: "https://bayareamarathon.com/results"
};

const EXAMPLE_RESULTS_DATA = [
  // Exact match scenario - should auto-match
  {
    name: "Marcus Johnson",
    age: 32,
    gender: "M",
    city: "San Francisco",
    state: "CA",
    finish_time: "2:15:32",
    overall_place: 1,
    gender_place: 1,
    age_group_place: 1
  },
  // Name variation scenario - should match with high confidence
  {
    name: "Sarah J. Chen",
    age: 28,
    gender: "F",
    city: "San Francisco", 
    state: "CA",
    finish_time: "2:22:18",
    overall_place: 2,
    gender_place: 1,
    age_group_place: 1
  },
  // Age difference scenario - might need review
  {
    name: "David Rodriguez",
    age: 47, // Current age is 45, this is 2 years different
    gender: "M",
    city: "Oakland",
    state: "CA",
    finish_time: "2:28:45",
    overall_place: 5,
    gender_place: 4,
    age_group_place: 2
  },
  // Name typo scenario - should match but need review
  {
    name: "Lisa Wong", // Existing runner is "Lisa Wang"
    age: 34,
    gender: "F", 
    city: "San Jose",
    state: "CA",
    finish_time: "2:35:12",
    overall_place: 8,
    gender_place: 3,
    age_group_place: 1
  },
  // New runner scenario - should create new
  {
    name: "Alex Thompson",
    age: 29,
    gender: "M",
    city: "Berkeley",
    state: "CA", 
    finish_time: "2:18:55",
    overall_place: 3,
    gender_place: 3,
    age_group_place: 1
  },
  // Location mismatch scenario - might need review
  {
    name: "Jennifer Martinez",
    age: 29,
    gender: "F",
    city: "Los Angeles", // Existing runner is from San Francisco
    state: "CA",
    finish_time: "2:41:33",
    overall_place: 12,
    gender_place: 5,
    age_group_place: 2
  }
];

interface RunSignupEvent {
  event_id: number;
  name: string;
  distance: string;
  start_time: string;
  isPast: boolean;
}

export function ImportDemo() {
  const [importUrl, setImportUrl] = useState("");
  const [importType, setImportType] = useState<"url" | "csv" | "api">("url");
  const [csvData, setCsvData] = useState("");
  const [raceId, setRaceId] = useState("");
  const [eventId, setEventId] = useState("");
  const [raceName, setRaceName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [availableEvents, setAvailableEvents] = useState<RunSignupEvent[]>([]);
  const [fetchingEvents, setFetchingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Function to fetch available events for a race
  const fetchEvents = async (raceIdValue: string) => {
    if (!raceIdValue.trim()) {
      setAvailableEvents([]);
      return;
    }

    setFetchingEvents(true);
    setEventsError(null);
    setEventId("");

    try {
      const response = await fetch(`/api/runsignup/race/${raceIdValue.trim()}/events`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to fetch events');
      }

      setAvailableEvents(data);
      if (data.length === 0) {
        setEventsError('No past events found for this race');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEventsError(error instanceof Error ? error.message : 'Failed to fetch events');
      setAvailableEvents([]);
    } finally {
      setFetchingEvents(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      let endpoint = '/api/import/race-results';
      let body: any = {};

      if (importType === "url") {
        if (!importUrl.trim()) {
          throw new Error('Please enter a race results URL');
        }
        
        // Determine provider from URL
        const url = importUrl.toLowerCase();
        let provider = 'unknown';
        
        if (url.includes('runsignup.com')) {
          provider = 'runsignup';
          endpoint = '/api/import/runsignup';
        } else if (url.includes('raceroster.com')) {
          provider = 'raceroster';
          endpoint = '/api/import/raceroster';
        }
        
        body = {
          url: importUrl,
          sourceProvider: provider
        };
      } else if (importType === "api") {
        if (!raceId.trim()) {
          throw new Error('Please enter a Race ID');
        }
        
        if (!eventId.trim()) {
          throw new Error('Please select an event to import results from');
        }
        
        endpoint = '/api/import/runsignup-api';
        body = {
          raceId: raceId.trim(),
          eventId: eventId.trim(),
          raceName: raceName.trim() || undefined
        };
      } else {
        if (!csvData.trim()) {
          throw new Error('Please paste CSV data or enter a URL');
        }
        
        body = {
          csvData: csvData,
          sourceProvider: 'csv'
        };
        endpoint = '/api/import/csv';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data.importResults);
      setImporting(false);
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
    onError: (error) => {
      console.error('Import failed:', error);
      setImporting(false);
    },
    onSettled: () => {
      setImporting(false);
    }
  });

  const handleImport = () => {
    setImporting(true);
    setImportResult(null);
    importMutation.mutate();
  };

  const getMatchingScenarios = () => [
    {
      runner: "Marcus Johnson",
      scenario: "Exact Match",
      description: "Name, age, location all match perfectly",
      expectedAction: "Auto-match",
      confidence: "95%+",
      icon: <CheckCircle className="w-5 h-5 text-green-600" />
    },
    {
      runner: "Sarah J. Chen",
      scenario: "Name Variation", 
      description: "Middle initial added, otherwise exact match",
      expectedAction: "High confidence match",
      confidence: "85-94%",
      icon: <CheckCircle className="w-5 h-5 text-blue-600" />
    },
    {
      runner: "David Rodriguez",
      scenario: "Age Difference",
      description: "2 year age difference (might be race age vs current age)",
      expectedAction: "Match with review",
      confidence: "75-84%",
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />
    },
    {
      runner: "Lisa Wong",
      scenario: "Name Typo",
      description: "Similar name 'Lisa Wang' exists, likely data entry error",
      expectedAction: "Match with review",
      confidence: "70-84%",
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />
    },
    {
      runner: "Alex Thompson", 
      scenario: "New Runner",
      description: "No similar runners found in database",
      expectedAction: "Create new runner",
      confidence: "100%",
      icon: <User className="w-5 h-5 text-purple-600" />
    },
    {
      runner: "Jennifer Martinez",
      scenario: "Location Mismatch",
      description: "Name/age match but different city (moved?)",
      expectedAction: "Match with review",
      confidence: "60-74%", 
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Upload className="w-6 h-6 text-performance-blue" />
          <h2 className="text-xl font-bold text-slate-900">Import Race Results</h2>
        </div>
        <p className="text-slate-600 mb-6">
          Import race results from RunSignup, RaceRoster, or CSV data. The system will automatically 
          match runners and handle duplicates.
        </p>

        {/* Import Type Selection */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setImportType("url")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              importType === "url" 
                ? "bg-performance-blue text-white border-performance-blue" 
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>URL Import</span>
          </button>
          <button
            onClick={() => setImportType("api")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              importType === "api" 
                ? "bg-performance-blue text-white border-performance-blue" 
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>API Import</span>
          </button>
          <button
            onClick={() => setImportType("csv")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              importType === "csv" 
                ? "bg-performance-blue text-white border-performance-blue" 
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>CSV Data</span>
          </button>
        </div>

        {/* URL Import */}
        {importType === "url" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Race Results URL
              </label>
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://runsignup.com/Race/Results/12345 or https://raceroster.com/events/12345/results"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-performance-blue focus:border-performance-blue"
              />
            </div>
            <div className="text-sm text-slate-600">
              <p className="mb-1">Supported providers:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>RunSignup.com race results pages</li>
                <li>RaceRoster.com event results</li>
                <li>Direct CSV export URLs</li>
              </ul>
            </div>
          </div>
        )}

        {/* API Import */}
        {importType === "api" && (
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Race ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={raceId}
                    onChange={(e) => {
                      setRaceId(e.target.value);
                      // Clear events when race ID changes
                      if (e.target.value !== raceId) {
                        setAvailableEvents([]);
                        setEventId("");
                        setEventsError(null);
                      }
                    }}
                    placeholder="169856"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-performance-blue focus:border-performance-blue"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => fetchEvents(raceId)}
                    disabled={!raceId.trim() || fetchingEvents}
                    className="px-4 py-2 bg-performance-blue text-white rounded-lg hover:bg-performance-blue/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {fetchingEvents ? "Loading..." : "Fetch Events"}
                  </button>
                </div>
              </div>

              {/* Events Error */}
              {eventsError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{eventsError}</p>
                </div>
              )}

              {/* Event Selection */}
              {availableEvents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Event <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-performance-blue focus:border-performance-blue"
                  >
                    <option value="">Select an event...</option>
                    {availableEvents.map((event) => (
                      <option key={event.event_id} value={event.event_id}>
                        {event.name} - {event.distance} ({new Date(event.start_time).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600 mt-1">
                    Only past events with results are shown
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Race Name (Optional)
              </label>
              <input
                type="text"
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                placeholder="Colorado Marathon 2024"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-performance-blue focus:border-performance-blue"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Official RunSignup API</p>
                  <p>This uses authenticated API access for reliable data import. Leave Event ID blank to automatically select the event with the most participants.</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              <p className="mb-1">How to find Race ID:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Visit the race results page on RunSignup.com</li>
                <li>Look for the URL: runsignup.com/Race/Results/<strong>RACE_ID</strong></li>
                <li>Example: For URL ending in /Results/169856, the Race ID is 169856</li>
              </ul>
            </div>
          </div>
        )}

        {/* CSV Import */}
        {importType === "csv" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">
                CSV Data
              </label>
              <button
                onClick={() => setCsvData(`name,age,gender,city,state,finish_time,overall_place,gender_place
John Smith,29,M,San Francisco,CA,2:18:45,1,1
Sarah Johnson,31,F,Oakland,CA,2:24:12,2,1
Mike Rodriguez,42,M,Berkeley,CA,2:31:55,3,2
Lisa Chen,28,F,San Jose,CA,2:35:18,4,2
David Kim,35,M,Palo Alto,CA,2:42:33,5,3
Jennifer Wang,26,F,San Francisco,CA,2:48:15,6,3`)}
                className="text-sm text-performance-blue hover:text-blue-700"
              >
                Load Sample Data
              </button>
            </div>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="name,age,gender,city,state,finish_time,overall_place,gender_place&#10;John Doe,32,M,San Francisco,CA,2:15:30,1,1&#10;Jane Smith,28,F,Oakland,CA,2:22:15,2,1"
              rows={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-performance-blue focus:border-performance-blue font-mono text-sm"
            />
            <div className="text-sm text-slate-600">
              <p className="mb-1">Required columns: name, finish_time</p>
              <p className="mb-1">Optional columns: age, gender, city, state, overall_place, gender_place, age_group_place</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-4 mt-6">
          <button
            onClick={handleImport}
            disabled={importing || importMutation.isPending || (!importUrl.trim() && !csvData.trim())}
            className="bg-performance-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {importing || importMutation.isPending ? (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Importing & Matching...</span>
              </div>
            ) : (
              "Import Results"
            )}
          </button>
          
          {importMutation.error && (
            <div className="text-red-600 text-sm">
              {importMutation.error.message}
            </div>
          )}
        </div>
      </div>

      {/* Expected Matching Scenarios */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Expected Matching Scenarios</h3>
        <div className="space-y-4">
          {getMatchingScenarios().map((scenario, index) => (
            <div key={index} className="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
              {scenario.icon}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-1">
                  <span className="font-medium text-slate-900">{scenario.runner}</span>
                  <span className="text-sm px-2 py-1 bg-slate-200 rounded text-slate-700">
                    {scenario.scenario}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{scenario.description}</p>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-slate-700">
                    Expected: {scenario.expectedAction}
                  </span>
                  <span className="text-sm text-slate-500">
                    Confidence: {scenario.confidence}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Import Results</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
              <div className="text-sm text-green-700">Total Imported</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{importResult.matched}</div>
              <div className="text-sm text-blue-700">Matched Existing</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{importResult.newRunners}</div>
              <div className="text-sm text-purple-700">New Runners</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{importResult.needsReview}</div>
              <div className="text-sm text-yellow-700">Need Review</div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h4 className="font-medium text-red-800">Import Errors</h4>
              </div>
              <ul className="space-y-1">
                {importResult.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Technical Details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">How Runner Matching Works</h3>
        <div className="prose prose-slate max-w-none">
          <h4 className="text-base font-medium text-slate-900">Matching Algorithm</h4>
          <ul className="text-sm text-slate-600 space-y-1 mb-4">
            <li><strong>Name Similarity (40% weight):</strong> Exact matches, name variations, fuzzy matching</li>
            <li><strong>Age Matching (25% weight):</strong> Exact age, 1-2 year tolerance for race age vs current age</li>
            <li><strong>Gender Matching (15% weight):</strong> Must match for positive identification</li>
            <li><strong>Location Matching (20% weight):</strong> City and state comparison with normalization</li>
          </ul>
          
          <h4 className="text-base font-medium text-slate-900">Confidence Thresholds</h4>
          <ul className="text-sm text-slate-600 space-y-1 mb-4">
            <li><strong>95%+:</strong> Auto-match (high confidence)</li>
            <li><strong>85-94%:</strong> Match but flag for review</li>
            <li><strong>60-84%:</strong> Potential match, requires manual review</li>
            <li><strong>&lt;60%:</strong> Create new runner profile</li>
          </ul>

          <h4 className="text-base font-medium text-slate-900">Data Provenance</h4>
          <p className="text-sm text-slate-600">
            Every imported result maintains a complete audit trail including the original data source, 
            matching confidence score, and any manual review decisions. This enables continuous 
            improvement of the matching algorithm and provides transparency for disputed results.
          </p>
        </div>
      </div>
    </div>
  );
}