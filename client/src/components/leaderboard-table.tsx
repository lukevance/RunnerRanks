import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { LeaderboardEntry } from "@shared/schema";
import { formatTime, formatDate, getRankDisplay, getInitials, getAvatarGradient, calculatePace, getPerformanceLevel, isBostonQualifier, getWeatherIcon, getTemperatureColor } from "@/lib/utils";
import { RunnerProfileModal } from "./runner-profile-modal";
import { RaceDetailModal } from "./race-detail-modal";

interface LeaderboardTableProps {
  filters: {
    distance: string;
    gender: string;
    ageGroup: string;
    search: string;
  };
}

export function LeaderboardTable({ filters }: LeaderboardTableProps) {
  const [selectedRunnerId, setSelectedRunnerId] = useState<number | null>(null);
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);

  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/leaderboard', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "All" && value !== "All Ages" && value !== "All Distances") {
          params.append(key, value);
        }
      });
      
      const response = await fetch(`/api/leaderboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    }
  });

  const getDistanceDisplay = (distance: string) => {
    switch (distance) {
      case "marathon": return "Marathon";
      case "half-marathon": return "Half Marathon";
      case "10-mile": return "10 Mile";
      case "10k": return "10K";
      case "5k": return "5K";
      default: return distance;
    }
  };

  const getResultNote = (result: any, race: any, runner: any) => {
    const isBQ = isBostonQualifier(result.finishTime, race.distance, runner.gender, runner.age);
    
    if (isBQ) return { text: "Boston Qualifier", className: "text-blue-600 font-medium" };
    if (result.isPersonalBest) return { text: "Personal Best", className: "text-achievement-green" };
    if (result.isSeasonBest) return { text: "Season Best", className: "text-achievement-green" };
    if (result.notes) return { text: result.notes, className: "text-slate-500" };
    return { text: "", className: "text-slate-500" };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
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
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-semibold text-slate-900">
            {getDistanceDisplay(filters.distance === "All Distances" ? "Marathon" : filters.distance.split(" (")[0])} Results - All Categories
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Showing top {entries.length} times from the past year
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Runner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Race
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Age/Gender
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {entries.map((entry, index) => {
                const rank = index + 1;
                const rankDisplay = getRankDisplay(rank);
                const note = getResultNote(entry.result, entry.race, entry.runner);
                const initials = getInitials(entry.runner.name);
                const gradient = getAvatarGradient(entry.runner.name);
                const pace = calculatePace(entry.result.finishTime, parseFloat(entry.race.distanceMiles));
                const performance = getPerformanceLevel(entry.result.finishTime, entry.race.distance, entry.runner.gender, entry.runner.age);
                const weatherIcon = getWeatherIcon(entry.race.weather);
                const tempColor = getTemperatureColor(entry.race.weather);

                return (
                  <tr 
                    key={entry.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedRunnerId(entry.runner.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={rankDisplay.className}>
                          <span className={`text-sm font-bold ${rank === 1 ? 'text-amber-800' : 'text-slate-600'}`}>
                            {rankDisplay.text}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <span className="text-white font-semibold text-sm">{initials}</span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-slate-900">
                            {entry.runner.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {entry.runner.gender} • {entry.runner.city}, {entry.runner.state}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-slate-900">
                        {formatTime(entry.result.finishTime)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {pace}/mi pace
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/race/${entry.race.id}/results`}
                        className="text-sm font-medium text-slate-900 hover:text-performance-blue transition-colors block"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        {entry.race.name}
                      </Link>
                      <div className="text-sm text-slate-500 flex items-center space-x-2">
                        <span>{entry.race.distanceMiles} mi</span>
                        {entry.race.weather && (
                          <div className="flex items-center space-x-1">
                            <span>{weatherIcon}</span>
                            <span className={tempColor}>{entry.race.weather}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(entry.race.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {entry.runner.age ? `${entry.runner.age} ${entry.runner.gender || ''}` : entry.runner.gender || 'N/A'}
                      </div>
                      {entry.runner.age && (
                        <div className="text-xs text-slate-500">
                          {entry.runner.age < 20 ? 'U20' : 
                           entry.runner.age < 30 ? '20-29' :
                           entry.runner.age < 40 ? '30-39' :
                           entry.runner.age < 50 ? '40-49' :
                           entry.runner.age < 60 ? '50-59' :
                           entry.runner.age < 70 ? '60-69' : '70+'}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="text-sm text-slate-600">
            Showing {entries.length} of {entries.length} runners
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Previous
            </button>
            <button className="px-3 py-1 text-sm bg-performance-blue text-white rounded-lg hover:bg-blue-700 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedRunnerId && (
        <RunnerProfileModal
          runnerId={selectedRunnerId}
          onClose={() => setSelectedRunnerId(null)}
        />
      )}

      {selectedRaceId && (
        <RaceDetailModal
          raceId={selectedRaceId}
          onClose={() => setSelectedRaceId(null)}
        />
      )}
    </>
  );
}
