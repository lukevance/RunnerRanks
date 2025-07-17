import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Header } from "@/components/header";
import { Calendar, MapPin, Users, Clock, Trophy, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { formatDate, formatTime, getInitials, getAvatarGradient } from "@/lib/utils";

interface Runner {
  id: number;
  name: string;
  gender: string;
  age: number;
  city: string;
  state: string;
}

interface Result {
  id: number;
  finishTime: string;
  overallPlace: number;
  genderPlace?: number;
  ageGroupPlace?: number;
  runner: Runner;
}

interface Race {
  id: number;
  name: string;
  date: string;
  city: string;
  state: string;
  distance: string;
  distanceMiles: string;
  totalFinishers: number;
  averageTime: string;
  weather?: string;
  courseType?: string;
  elevation?: string;
}

export default function RaceResults() {
  const [match, params] = useRoute("/race/:id/results");
  const raceId = params?.id ? parseInt(params.id) : null;

  const { data: race, isLoading: raceLoading } = useQuery<Race>({
    queryKey: ['/api/races', raceId],
    queryFn: async () => {
      const response = await fetch(`/api/races/${raceId}`);
      if (!response.ok) throw new Error('Failed to fetch race');
      return response.json();
    },
    enabled: !!raceId
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery<Result[]>({
    queryKey: ['/api/races', raceId, 'results'],
    queryFn: async () => {
      const response = await fetch(`/api/races/${raceId}/results`);
      if (!response.ok) throw new Error('Failed to fetch results');
      return response.json();
    },
    enabled: !!raceId
  });

  const getDistanceDisplay = (distance: string) => {
    switch (distance) {
      case "marathon": return "Marathon (26.2 mi)";
      case "half-marathon": return "Half Marathon (13.1 mi)";
      case "10-mile": return "10 Mile (10.0 mi)";
      case "10k": return "10K (6.2 mi)";
      case "5k": return "5K (3.1 mi)";
      default: return distance;
    }
  };

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

  if (!match || !raceId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Race not found</h1>
            <Link href="/" className="text-performance-blue hover:text-blue-700">
              Return to homepage
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (raceLoading || resultsLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Race not found</h1>
            <Link href="/" className="text-performance-blue hover:text-blue-700">
              Return to homepage
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-performance-blue hover:text-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboards
          </Link>
        </div>

        {/* Race Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-4">{race.name}</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>{formatDate(race.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>{race.city}, {race.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>{getDistanceDisplay(race.distance)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>{results.length} finishers</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">Race Results</h2>
            <p className="text-sm text-slate-600 mt-1">
              All finishers for {race.name}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Place
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Runner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Gender Place
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Age Group Place
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {results.map((result) => {
                  const initials = getInitials(result.runner.name);
                  const gradient = getAvatarGradient(result.runner.name);
                  const pace = calculatePace(result.finishTime, race.distanceMiles);

                  return (
                    <tr 
                      key={result.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {result.overallPlace <= 3 ? (
                            <div className="flex items-center">
                              <Trophy className={`w-5 h-5 mr-2 ${
                                result.overallPlace === 1 ? 'text-yellow-500' :
                                result.overallPlace === 2 ? 'text-gray-400' :
                                'text-amber-600'
                              }`} />
                              <span className="font-bold text-slate-900">{result.overallPlace}</span>
                            </div>
                          ) : (
                            <span className="font-medium text-slate-900">{result.overallPlace}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                            <span className="text-white font-semibold text-sm">{initials}</span>
                          </div>
                          <div className="ml-3">
                            <Link 
                              href={`/runner/${result.runner.id}`}
                              className="text-sm font-medium text-slate-900 hover:text-performance-blue"
                            >
                              {result.runner.name}
                            </Link>
                            <div className="text-sm text-slate-500">
                              {result.runner.gender} • Age {result.runner.age} • {result.runner.city}, {result.runner.state}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-slate-900">
                          {formatTime(result.finishTime)}
                        </div>
                        <div className="text-sm text-slate-500">
                          {pace}/mi pace
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {result.genderPlace || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {result.ageGroupPlace || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {results.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No results found</h3>
              <p className="text-slate-500">This race doesn't have any results yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}