import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Clock, Calendar, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Header } from "@/components/header";
import { RacesListModal } from "@/components/races-list-modal";
import { Link } from "wouter";

interface LeaderboardEntry {
  id: number;
  runner: {
    id: number;
    name: string;
    email?: string;
    city?: string;
    state?: string;
    age?: number;
  };
  race: {
    id: number;
    name: string;
    date: string;
    distance: string;
    distanceMiles: string;
    city: string;
    state: string;
  };
  result: {
    finishTime: string;
    overallPlace: number;
    genderPlace?: number;
    ageGroupPlace?: number;
  };
}

const DISTANCES = [
  { key: 'marathon', label: 'Marathon', distance: '26.20' },
  { key: 'half-marathon', label: 'Half Marathon', distance: '13.10' },
  { key: '10-mile', label: '10 Mile', distance: '10.00' },
  { key: '10k', label: '10K', distance: '6.21' },
  { key: '5k', label: '5K', distance: '3.11' }
];

interface DistanceLeaderboardProps {
  distance: string;
  label: string;
  distanceMiles: string;
}

function DistanceLeaderboard({ distance, label, distanceMiles }: DistanceLeaderboardProps) {
  const [showCount, setShowCount] = useState<5 | 25>(5);
  
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['/api/leaderboard', { distance, limit: showCount }],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard?distance=${encodeURIComponent(distance)}&limit=${showCount}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json() as LeaderboardEntry[];
    }
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500 text-sm">No results available for this distance.</p>
      </div>
    );
  }

  const calculatePace = (timeStr: string, distanceMiles: string) => {
    const [hours = 0, minutes = 0, seconds = 0] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + seconds / 60;
    const distance = parseFloat(distanceMiles);
    if (distance <= 0) return 'N/A';
    const paceMinutes = totalMinutes / distance;
    const paceMin = Math.floor(paceMinutes);
    const paceSec = Math.round((paceMinutes - paceMin) * 60);
    return `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link href={`/leaderboard?distance=${encodeURIComponent(distance)}`} className="text-performance-blue hover:text-blue-700 text-sm flex items-center ml-auto">
          View all <ExternalLink className="w-3 h-3 ml-1" />
        </Link>
      </div>
      
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={entry.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-performance-blue/10 rounded-full flex items-center justify-center text-sm font-medium text-performance-blue">
                {index + 1}
              </div>
              <div>
                <Link href={`/runner/${entry.runner.id}`} className="font-medium text-slate-900 hover:text-performance-blue">
                  {entry.runner.name}
                </Link>
                <div className="text-xs text-slate-500">
                  {entry.runner.city && entry.runner.state && `${entry.runner.city}, ${entry.runner.state}`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-slate-900">{entry.result.finishTime}</div>
              <div className="text-xs text-slate-500">{calculatePace(entry.result.finishTime, distanceMiles)} pace</div>
            </div>
          </div>
        ))}
      </div>

      {entries.length > 0 && (
        <div className="mt-4 flex justify-center space-x-2">
          {showCount === 5 && (
            <button
              onClick={() => setShowCount(25)}
              className="px-3 py-1 text-sm text-performance-blue hover:text-blue-700"
            >
              Show more
            </button>
          )}
          {showCount === 25 && (
            <button
              onClick={() => setShowCount(5)}
              className="px-3 py-1 text-sm text-slate-500 hover:text-slate-700"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [selectedDistance, setSelectedDistance] = useState('marathon');
  const [showRacesModal, setShowRacesModal] = useState(false);

  // Get overall stats
  const { data: stats } = useQuery({
    queryKey: ['/api/leaderboard', { limit: 1000 }], 
    queryFn: async () => {
      const response = await fetch('/api/leaderboard?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  const totalRunners = stats?.length || 0;
  const fastestTime = stats?.[0]?.result?.finishTime || "N/A";
  
  // Count unique races
  const uniqueRaces = stats ? new Set(stats.map((entry: any) => entry.race.id)).size : 0;

  const selectedDistanceData = DISTANCES.find(d => d.key === selectedDistance) || DISTANCES[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Local Leaderboards</h2>
            <p className="text-slate-600">Top running times by distance in your area</p>
          </div>
        </div>

        {/* Distance Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6" aria-label="Distance tabs">
              {DISTANCES.map((distance) => (
                <button
                  key={distance.key}
                  onClick={() => setSelectedDistance(distance.key)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    selectedDistance === distance.key
                      ? 'border-performance-blue text-performance-blue'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {distance.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            <DistanceLeaderboard
              distance={selectedDistanceData.key}
              label={selectedDistanceData.label}
              distanceMiles={selectedDistanceData.distance}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-performance-blue/10 rounded-lg flex items-center justify-center">
                <Trophy className="text-performance-blue w-6 h-6" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-slate-900">
                  {totalRunners.toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">Total Runners</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-achievement-green/10 rounded-lg flex items-center justify-center">
                <Clock className="text-achievement-green w-6 h-6" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-slate-900">
                  {fastestTime}
                </div>
                <div className="text-sm text-slate-600">Fastest Time</div>
              </div>
            </div>
          </div>
          
          <div 
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowRacesModal(true)}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="text-amber-500 w-6 h-6" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-slate-900">
                  {uniqueRaces}
                </div>
                <div className="text-sm text-slate-600">Races This Year</div>
                <div className="text-xs text-performance-blue mt-1">Click to view all</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Races List Modal */}
      <RacesListModal
        isOpen={showRacesModal}
        onClose={() => setShowRacesModal(false)}
      />
    </div>
  );
}
