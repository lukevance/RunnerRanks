import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, AlertTriangle, CheckCircle, XCircle, User, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

export function ImportDemo() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/import/race-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raceData: EXAMPLE_RACE_DATA,
          resultsData: EXAMPLE_RESULTS_DATA,
          sourceProvider: 'demo'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportResult(data.importResults);
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
    onError: (error) => {
      console.error('Import failed:', error);
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
          <h2 className="text-xl font-bold text-slate-900">Runner Matching Demo</h2>
        </div>
        <p className="text-slate-600 mb-4">
          This demonstrates how the system handles real-world challenges when importing race results 
          from providers like RunSignup and RaceRoster.
        </p>
        
        <button
          onClick={handleImport}
          disabled={importing || importMutation.isPending}
          className="bg-performance-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {importing || importMutation.isPending ? (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 animate-spin" />
              <span>Importing & Matching...</span>
            </div>
          ) : (
            "Import Sample Race Results"
          )}
        </button>
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