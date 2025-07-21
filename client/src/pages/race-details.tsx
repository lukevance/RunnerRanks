import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Info, Trophy, Users } from "lucide-react";
import { Link } from "wouter";
import type { Race } from "@shared/schema";
import { Header } from "@/components/header";
import { formatDate, formatTime, getInitials, getAvatarGradient, calculatePace } from "@/lib/utils";

export default function RaceDetails() {
  const { id } = useParams<{ id: string }>();
  const raceId = parseInt(id || "0");

  const { data: race, isLoading, error } = useQuery<Race>({
    queryKey: ['/api/races', raceId],
    queryFn: async () => {
      const response = await fetch(`/api/races/${raceId}`);
      if (!response.ok) throw new Error('Failed to fetch race');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !race) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Race Not Found</h2>
            <p className="text-slate-600 mb-6">The race you're looking for could not be found.</p>
            <Link href="/">
              <a className="bg-performance-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Return to Leaderboard
              </a>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Race Results Component
  function RaceResultsSection({ raceId }: { raceId: number }) {
    const { data: results = [], isLoading: resultsLoading } = useQuery({
      queryKey: ['/api/races', raceId, 'results'],
      queryFn: async () => {
        const response = await fetch(`/api/races/${raceId}/results`);
        if (!response.ok) throw new Error('Failed to fetch results');
        return response.json();
      },
      enabled: !!raceId && !!race
    });

    if (resultsLoading) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">Race Results</h2>
          <p className="text-sm text-slate-600 mt-1">
            All finishers for {race?.name} ({results.length} total)
          </p>
        </div>
        
        {/* Mobile Layout */}
        <div className="block md:hidden space-y-3 p-4">
          {results.slice(0, 20).map((result: any) => {
            const initials = getInitials(result.runner.name);
            const gradient = getAvatarGradient(result.runner.name);
            const pace = calculatePace(result.finishTime, parseFloat(race?.distanceMiles || "0"));

            return (
              <div key={result.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      {result.overallPlace <= 3 ? (
                        <div className="flex items-center">
                          <Trophy className={`w-5 h-5 mr-2 ${
                            result.overallPlace === 1 ? 'text-yellow-500' :
                            result.overallPlace === 2 ? 'text-gray-400' :
                            'text-amber-600'
                          }`} />
                          <span className="font-bold text-lg text-slate-900">#{result.overallPlace}</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-lg text-slate-900">#{result.overallPlace}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">
                      {formatTime(result.finishTime)}
                    </div>
                    <div className="text-sm text-slate-500">
                      {pace}/mi pace
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <span className="text-white font-semibold text-sm">{initials}</span>
                  </div>
                  <div className="ml-3 flex-1">
                    <Link 
                      href={`/runner/${result.runner.id}`}
                      className="font-medium text-slate-900 hover:text-performance-blue"
                    >
                      {result.runner.name}
                    </Link>
                    <div className="text-sm text-slate-500">
                      {result.runner.gender} • Age {result.runner.age}
                    </div>
                    {(result.genderPlace || result.ageGroupPlace) && (
                      <div className="text-xs text-slate-400">
                        {result.genderPlace && `${result.genderPlace} ${result.runner.gender}`}
                        {result.genderPlace && result.ageGroupPlace && ' • '}
                        {result.ageGroupPlace && `${result.ageGroupPlace} Age Group`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Place
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Runner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Gender
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Age Group
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {results.slice(0, 20).map((result: any) => {
                const initials = getInitials(result.runner.name);
                const gradient = getAvatarGradient(result.runner.name);
                const pace = calculatePace(result.finishTime, parseFloat(race?.distanceMiles || "0"));

                return (
                  <tr 
                    key={result.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {result.overallPlace <= 3 ? (
                          <div className="flex items-center">
                            <Trophy className={`w-4 h-4 mr-1 ${
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <span className="text-white font-semibold text-xs">{initials}</span>
                        </div>
                        <div className="ml-2">
                          <Link 
                            href={`/runner/${result.runner.id}`}
                            className="text-sm font-medium text-slate-900 hover:text-performance-blue"
                          >
                            {result.runner.name}
                          </Link>
                          <div className="text-xs text-slate-500">
                            {result.runner.gender} • {result.runner.age}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-base font-bold text-slate-900">
                        {formatTime(result.finishTime)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {pace}/mi
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-900 text-center">
                      {result.genderPlace || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-900 text-center">
                      {result.ageGroupPlace || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {results.length > 20 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-center">
            <Link 
              href={`/race/${raceId}/results`}
              className="text-performance-blue hover:text-blue-700 font-medium"
            >
              View all {results.length} results →
            </Link>
          </div>
        )}

        {results.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No results found</h3>
            <p className="text-slate-500">This race doesn't have any results yet.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link href="/">
          <a className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </a>
        </Link>

        {/* Race Header with Hero Image */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400" 
              alt="Marathon start line" 
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            <div className="absolute inset-0 flex items-center p-8">
              <div className="text-white">
                <h1 className="text-4xl font-bold mb-2">{race.name}</h1>
                <p className="text-white/90 text-xl">
                  {formatDate(race.date)} • {race.city}, {race.state}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Race Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {race.totalFinishers.toLocaleString()}
            </div>
            <div className="text-sm text-slate-600">Total Finishers</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {race.distanceMiles} mi
            </div>
            <div className="text-sm text-slate-600">Distance</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-2">
              {race.averageTime}
            </div>
            <div className="text-sm text-slate-600">Average Time</div>
          </div>
        </div>

        {/* Race Results */}
        <RaceResultsSection raceId={raceId} />

        {/* Race Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Race Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
                <div>
                  <span className="text-slate-600 font-medium">Start Time:</span>
                  <span className="ml-3 text-slate-900">{race.startTime}</span>
                </div>
                {race.weather && (
                  <div>
                    <span className="text-slate-600 font-medium">Weather:</span>
                    <span className="ml-3 text-slate-900">{race.weather}</span>
                  </div>
                )}
                {race.courseType && (
                  <div>
                    <span className="text-slate-600 font-medium">Course Type:</span>
                    <span className="ml-3 text-slate-900 capitalize">
                      {race.courseType.replace('-', ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="space-y-4">
                <div>
                  <span className="text-slate-600 font-medium">Distance:</span>
                  <span className="ml-3 text-slate-900 capitalize">
                    {race.distance.replace('-', ' ')} ({race.distanceMiles} miles)
                  </span>
                </div>
                {race.elevation && (
                  <div>
                    <span className="text-slate-600 font-medium">Elevation Change:</span>
                    <span className="ml-3 text-slate-900">{race.elevation}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-600 font-medium">Location:</span>
                  <span className="ml-3 text-slate-900">{race.city}, {race.state}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {race.resultsUrl && (
            <a 
              href={race.resultsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-performance-blue text-white text-center py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              View Full Results
            </a>
          )}
          {race.organizerWebsite && (
            <a 
              href={race.organizerWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-slate-100 text-slate-700 text-center py-4 px-6 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center"
            >
              <Info className="w-5 h-5 mr-2" />
              Race Website
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
